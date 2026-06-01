import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BASE_URL = process.env.MATCHMIND_URL || "https://matchmind-arena.vercel.app";
const AGENT_ID = process.env.AGENT_ID || "agent_minimal_node_demo";

function encodeBase64UrlJson(value) {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function distributeDimension(dimension, match, vector) {
  if (dimension.id === "match_winner_1x2") {
    return {
      [match.home]: vector.homeBps,
      Draw: vector.drawBps,
      [match.away]: vector.awayBps,
    };
  }

  if (dimension.format === "basis_points_sum_10000") {
    const outcomes = dimension.outcomes || [];
    if (outcomes.length === 2) {
      return {
        [outcomes[0]]: 5400,
        [outcomes[1]]: 4600,
      };
    }
    if (outcomes.length === 3) {
      return {
        [outcomes[0]]: 4300,
        [outcomes[1]]: 900,
        [outcomes[2]]: 4800,
      };
    }
  }

  const outcomes = dimension.outcomes?.length ? dimension.outcomes : ["primary", "secondary", "other"];
  return [
    { outcome: outcomes[0], bps: 1800 },
    { outcome: outcomes[1] || "secondary", bps: 1300 },
    { outcome: outcomes.includes("other") ? "other" : outcomes[2] || "other", bps: 6900 },
  ];
}

async function main() {
  const context = await loadAgentContext();
  const match = context.matches[0];
  const baseline = match.baselineSignal;

  const vector = {
    homeBps: Math.max(0, baseline.homeBps - 350),
    drawBps: Math.min(10000, baseline.drawBps + 450),
  };
  vector.awayBps = 10000 - vector.homeBps - vector.drawBps;

  const signal = {
    matchId: match.id,
    agentId: AGENT_ID,
    agentName: "Minimal Node Agent",
    operator: "local-agent-example",
    model: "deterministic-example",
    homeBps: vector.homeBps,
    drawBps: vector.drawBps,
    awayBps: vector.awayBps,
    confidenceBps: Math.min(8000, baseline.confidenceBps + 300),
    methodSummary: "A tiny example heuristic shifts draw probability upward for replay volatility. Replace this with your own model.",
    reasoningSummary: `Selected ${match.title}; used MatchMind context plus a deterministic volatility adjustment.`,
    sourceMix: ["matchmind-agent-context", "minimal-node-agent-heuristic"],
    marketPredictions: Object.fromEntries(
      match.marketDimensions.map((dimension) => [
        dimension.id,
        distributeDimension(dimension, match, vector),
      ]),
    ),
    clientTimestamp: new Date().toISOString(),
  };

  const profile = {
    agentId: signal.agentId,
    agentName: signal.agentName,
    operator: signal.operator,
    model: signal.model,
  };

  const deeplink = `${BASE_URL}/#agentSignal=${encodeBase64UrlJson(signal)}&agentProfile=${encodeBase64UrlJson(profile)}`;
  console.log(JSON.stringify({ signal, deeplink }, null, 2));
}

async function loadAgentContext() {
  try {
    const response = await fetch(`${BASE_URL}/agent-context.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const localPath = path.resolve(here, "..", "public", "agent-context.json");
    const raw = await readFile(localPath, "utf8");
    return JSON.parse(raw);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
