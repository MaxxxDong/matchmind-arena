import http from "node:http";
import { ethers } from "ethers";
import { MATCHES } from "../src/data/matches.mjs";
import { buildResolutionEvidence } from "../src/scoring.mjs";
import { buildSignalCommitment, stableJson, validateSignalVector } from "../src/signals.mjs";

const PORT = Number(process.env.AGENT_API_PORT || 8787);
const API_KEY = process.env.AGENT_API_KEY || "";

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function requireApiKey(request) {
  if (!API_KEY) return { ok: true, mode: "dev-open" };
  const value = request.headers.authorization || "";
  if (value !== `Bearer ${API_KEY}`) {
    return { ok: false, mode: "bearer", error: "Missing or invalid bearer token." };
  }
  return { ok: true, mode: "bearer" };
}

function matchContext(match) {
  return {
    matchId: match.id,
    title: match.title,
    stage: match.stage,
    kickoff: match.kickoff,
    venue: match.venue,
    scoringMode: match.scoringMode,
    signalClosesAt: match.signalClosesAt ?? null,
    signalWindow: match.signalWindow,
    teams: {
      home: match.home,
      away: match.away,
    },
    baselineSignal: {
      homeBps: match.homeBps,
      drawBps: match.drawBps,
      awayBps: match.awayBps,
      confidenceBps: match.confidenceBps,
    },
    marketDimensions: match.marketDimensions || [],
    notes: [match.bias, match.status],
  };
}

function agentIdFromName(name) {
  return `agent_${String(name || "anonymous")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "anonymous"}`;
}

async function handle(request, response) {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      service: "matchmind-agent-api",
      authMode: API_KEY ? "bearer" : "dev-open",
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/matches") {
    sendJson(response, 200, {
      matches: MATCHES.map(matchContext),
      resolutionEvidence: buildResolutionEvidence(),
    });
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/matches/") && url.pathname.endsWith("/context")) {
    const matchId = decodeURIComponent(url.pathname.slice("/api/matches/".length, -"/context".length));
    const match = MATCHES.find((candidate) => candidate.id === matchId);
    if (!match) {
      sendJson(response, 404, { error: "Unknown matchId." });
      return;
    }
    sendJson(response, 200, { context: matchContext(match) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/agents/register") {
    const auth = requireApiKey(request);
    if (!auth.ok) {
      sendJson(response, 401, { error: auth.error });
      return;
    }
    const body = await readJson(request);
    if (body.walletAddress && !ethers.isAddress(body.walletAddress)) {
      sendJson(response, 400, { error: "walletAddress must be a valid EVM address when provided." });
      return;
    }
    const agent = {
      agentId: agentIdFromName(body.name),
      name: body.name || "Anonymous Agent",
      operator: body.operator || "unknown",
      walletAddress: body.walletAddress || null,
      model: body.model || null,
      homepage: body.homepage || null,
    };
    sendJson(response, 200, {
      ...agent,
      authMode: auth.mode,
      metadataHash: ethers.id(stableJson(agent)),
      note: "This local API prepares agent metadata. On-chain registration still requires a wallet transaction.",
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/signals") {
    const auth = requireApiKey(request);
    if (!auth.ok) {
      sendJson(response, 401, { error: auth.error });
      return;
    }
    const body = await readJson(request);
    const match = MATCHES.find((candidate) => candidate.id === body.matchId);
    if (!match) {
      sendJson(response, 404, { error: "Unknown matchId." });
      return;
    }
    const vector = validateSignalVector(body);
    if (!Array.isArray(body.sourceMix) || body.sourceMix.length === 0) {
      sendJson(response, 400, { error: "sourceMix must list at least one data source used by the agent." });
      return;
    }
    if (!String(body.methodSummary || body.method || body.reasoningSummary || body.explanation || "").trim()) {
      sendJson(response, 400, { error: "methodSummary or reasoningSummary is required so the agent's prediction method is visible." });
      return;
    }
    const marketPredictions = body.marketPredictions || body.signals?.marketPredictions;
    const missingDimensions = (match.marketDimensions || [])
      .filter((dimension) => !marketPredictions?.[dimension.id])
      .map((dimension) => dimension.id);
    if (!marketPredictions || missingDimensions.length > 0) {
      sendJson(response, 400, { error: `marketPredictions must include every selected match dimension. Missing: ${missingDimensions.join(", ") || "all"}.` });
      return;
    }
    const commitment = buildSignalCommitment(match, {
      ...vector,
      model: body.model || "external-agent",
      explanation: body.reasoningSummary || body.explanation,
      generatedBy: body.agentId || "external-agent",
      generatedAt: body.clientTimestamp || new Date().toISOString(),
      rawEvidence: {
        matchId: match.id,
        agentId: body.agentId || null,
        sourceMix: body.sourceMix || [],
        methodSummary: body.methodSummary || body.method || "",
        reasoningSummary: body.reasoningSummary || body.explanation || "",
        marketPredictions,
        clientTimestamp: body.clientTimestamp || null,
      },
      metadataUri: body.metadataUri,
      contextSource: "MatchMind Agent API context pack",
    });
    sendJson(response, 200, {
      accepted: true,
      authMode: auth.mode,
      match: matchContext(match),
      commitment,
      note: "Commit this payload with SignalArena.submitSignal from a wallet or future relay.",
    });
    return;
  }

  sendJson(response, 404, { error: "Not found." });
}

const server = http.createServer((request, response) => {
  handle(request, response).catch((error) => {
    sendJson(response, 500, { error: error.message });
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`MatchMind Agent API listening on http://127.0.0.1:${PORT}`);
});
