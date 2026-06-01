import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ethers } from "ethers";
import {
  Activity,
  BadgeCheck,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Gauge,
  Layers3,
  Loader2,
  Network,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import "./styles.css";
import { MATCHES } from "./data/matches.mjs";
import { DEMO_RESOLUTIONS } from "./data/resolutions.mjs";
import { RESULT_LABELS, buildLeaderboard } from "./scoring.mjs";
import { attachResultSource } from "./resultSources.mjs";
import { buildSignalCommitment } from "./signals.mjs";
import LEADERBOARD_SNAPSHOT from "../snapshots/leaderboard.mantle-sepolia.json";

const CONTRACT_ADDRESS = "0x5929c4cC5DfEdaA8Cb8Df6e9d3aa27EF44CBceD4";
const DEPLOY_BLOCK = 39344371;
const EXPLORER = "https://sepolia.mantlescan.xyz";
const MANTLE_SEPOLIA = {
  chainId: "0x138b",
  chainName: "Mantle Sepolia Testnet",
  nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
  rpcUrls: ["https://rpc.sepolia.mantle.xyz"],
  blockExplorerUrls: [EXPLORER],
};

const ARENA_ABI = [
  "function owner() view returns (address)",
  "function nextSignalId() view returns (uint256)",
  "function getAgent(address agentAddress) view returns (tuple(bool registered, bytes32 metadataHash, string metadataUri, uint256 registeredAt))",
  "function primarySignalSubmitted(address agentAddress, bytes32 matchId, uint8 matchWindow) view returns (bool)",
  "function registerAgent(bytes32 metadataHash, string metadataUri)",
  "function submitSignal((bytes32 matchId, bytes32 contextHash, uint8 matchWindow, uint16 homeBps, uint16 drawBps, uint16 awayBps, uint16 confidenceBps, bytes32 evidenceHash, bytes32 metadataHash, string metadataUri) input) returns (uint256 signalId)",
  "event AgentRegistered(address indexed agent, bytes32 metadataHash, string metadataUri, uint256 registeredAt)",
  "event SignalSubmitted(uint256 indexed signalId, address indexed agent, bytes32 indexed matchId, uint8 matchWindow, uint16 homeBps, uint16 drawBps, uint16 awayBps, uint16 confidenceBps, bytes32 contextHash, bytes32 evidenceHash, bytes32 metadataHash, string metadataUri, bool isRevision)",
];

const SIGNAL_METADATA_KEY = "matchmind:signal-metadata";
const LOG_LOOKBACK_BLOCKS = 8000;
const AGENT_SKILL_URL = "/agent-skill.md";
const AGENT_CONTEXT_URL = "/agent-context.json";
const AGENT_ACTION_URL = "/agent-action.json";
const LLMS_URL = "/llms.txt";
const PREDICTION_DIMENSIONS = [
  ["1X2 winner", "home / draw / away"],
  ["Exact score", "1-1, 1-0, 2-1"],
  ["First goal", "home / no goal / away"],
  ["Both score", "yes / no"],
  ["Total goals", "under / over bands"],
  ["Team goals", "per-team distribution"],
  ["Halftime", "home / draw / away"],
  ["Tournament", "group / champion context"],
];
const DEFAULT_AGENT_PROFILE = {
  agentId: "agent_site_reader_demo",
  name: "Site Reading Agent",
  operator: "user-controlled",
  model: "agent-provided",
};
const SIMPLE_AGENT_EXAMPLE = `{
  "matchId": "demo-replay:argentina-france-2022",
  "agentId": "agent_site_reader_demo",
  "agentName": "Site Reading Agent",
  "homeBps": 4800,
  "drawBps": 2700,
  "awayBps": 2500,
  "confidenceBps": 6800,
  "reasoningSummary": "Argentina have the stronger late-game chance quality, but France's transition threat keeps draw risk high.",
  "exactScore": [
    { "score": "1-1", "bps": 1150 },
    { "score": "2-1", "bps": 920 }
  ],
  "firstGoal": {
    "homeBps": 5100,
    "noGoalBps": 700,
    "awayBps": 4200
  },
  "sourceMix": ["match-context", "agent-reasoning", "user-context"]
}`;

const publicProvider = new ethers.JsonRpcProvider(MANTLE_SEPOLIA.rpcUrls[0]);
const readArena = new ethers.Contract(CONTRACT_ADDRESS, ARENA_ABI, publicProvider);

function shortHash(value) {
  if (!value) return "-";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatPct(bps) {
  return `${(Number(bps) / 100).toFixed(1)}%`;
}

function sanitizeAgentId(value) {
  return String(value || DEFAULT_AGENT_PROFILE.agentId)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || DEFAULT_AGENT_PROFILE.agentId;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function decodeBase64UrlJson(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function getLaunchParams() {
  const hash = globalThis.location?.hash?.startsWith("#")
    ? globalThis.location.hash.slice(1)
    : "";
  const hashParams = new URLSearchParams(hash);
  const searchParams = new URLSearchParams(globalThis.location?.search || "");
  return {
    agentSignal: searchParams.get("agentSignal") || hashParams.get("agentSignal"),
    agentProfile: searchParams.get("agentProfile") || hashParams.get("agentProfile"),
  };
}

function normalizeAgentProfile(candidate = {}) {
  const agentId = sanitizeAgentId(candidate.agentId || candidate.id);
  return {
    agentId,
    name: String(candidate.agentName || candidate.name || agentId),
    operator: String(candidate.operator || "user-controlled"),
    model: String(candidate.model || "agent-provided"),
    homepage: candidate.homepage ? String(candidate.homepage) : "",
  };
}

function buildAgentRegistration(profile, walletAddress) {
  const record = {
    app: "MatchMind Arena",
    type: "agent-registration",
    agentId: profile.agentId,
    name: profile.name,
    operator: profile.operator,
    model: profile.model,
    homepage: profile.homepage || null,
    walletAddress: walletAddress?.toLowerCase?.() || null,
  };
  return {
    metadataHash: ethers.id(stableStringify(record)),
    metadataUri: `https://matchmind-arena.vercel.app/agents/${encodeURIComponent(profile.agentId)}`,
    record,
  };
}

function snapshotSignalEvents() {
  return (LEADERBOARD_SNAPSHOT.events || []).map((event) => ({
    ...event,
    fromSnapshot: true,
  }));
}

function mergeEvents(current, incoming) {
  const byKey = new Map();
  for (const event of [...current, ...incoming]) {
    const key = `${event.txHash || "no-tx"}:${event.signalId}`;
    byKey.set(key, event);
  }
  return [...byKey.values()].sort((a, b) => Number(b.blockNumber || 0) - Number(a.blockNumber || 0));
}

function eventFromParsedLog(parsed, receiptLog, blockTimestamp = null) {
  return {
    signalId: Number(parsed.args.signalId),
    agent: parsed.args.agent,
    matchId: parsed.args.matchId,
    matchWindow: Number(parsed.args.matchWindow),
    homeBps: Number(parsed.args.homeBps),
    drawBps: Number(parsed.args.drawBps),
    awayBps: Number(parsed.args.awayBps),
    confidenceBps: Number(parsed.args.confidenceBps),
    contextHash: parsed.args.contextHash,
    evidenceHash: parsed.args.evidenceHash,
    metadataHash: parsed.args.metadataHash,
    metadataUri: parsed.args.metadataUri,
    isRevision: parsed.args.isRevision,
    txHash: receiptLog.transactionHash,
    blockNumber: receiptLog.blockNumber,
    blockTimestamp,
    submittedAt: blockTimestamp ? new Date(blockTimestamp * 1000).toISOString() : new Date().toISOString(),
  };
}

function signalEventsFromReceipt(receipt) {
  return receipt.logs.flatMap((log) => {
    try {
      const parsed = readArena.interface.parseLog(log);
      return parsed?.name === "SignalSubmitted" ? [eventFromParsedLog(parsed, log)] : [];
    } catch {
      return [];
    }
  });
}

async function querySignalEvents() {
  const latest = await publicProvider.getBlockNumber();
  const filter = readArena.filters.SignalSubmitted();
  const fromBlock = Math.max(DEPLOY_BLOCK, latest - LOG_LOOKBACK_BLOCKS);
  const logs = await readArena.queryFilter(filter, fromBlock, latest);
  const blockNumbers = [...new Set(logs.map((log) => log.blockNumber))];
  const blocks = await Promise.all(blockNumbers.map(async (blockNumber) => publicProvider.getBlock(blockNumber)));
  const timestamps = new Map(blocks.filter(Boolean).map((block) => [block.number, Number(block.timestamp)]));
  return logs.map((log) => eventFromParsedLog(
    readArena.interface.parseLog(log),
    log,
    timestamps.get(log.blockNumber) ?? null,
  ));
}

async function queryAgentEvents() {
  const latest = await publicProvider.getBlockNumber();
  const filter = readArena.filters.AgentRegistered();
  const fromBlock = Math.max(DEPLOY_BLOCK, latest - LOG_LOOKBACK_BLOCKS);
  const logs = await readArena.queryFilter(filter, fromBlock, latest);
  const registry = new Map();
  for (const log of logs) {
    const address = String(log.args.agent).toLowerCase();
    const metadataUri = String(log.args.metadataUri || "");
    const match = metadataUri.match(/\/agents\/([^/?#]+)/);
    registry.set(address, {
      metadataHash: log.args.metadataHash,
      metadataUri,
      agentId: match ? decodeURIComponent(match[1]) : shortHash(log.args.agent),
    });
  }
  return registry;
}

function buildSignal(match, aiSignal) {
  return buildSignalCommitment(match, {
    homeBps: aiSignal?.homeBps ?? match.homeBps,
    drawBps: aiSignal?.drawBps ?? match.drawBps,
    awayBps: aiSignal?.awayBps ?? match.awayBps,
    confidenceBps: aiSignal?.confidenceBps ?? match.confidenceBps,
    model: aiSignal?.model ?? "demo-sports-signal-agent",
    explanation: aiSignal?.explanation ??
      "Demo signal generated from match context, replay evidence labels, and tactical momentum notes.",
    generatedBy: aiSignal ? "user-configured-model" : "deterministic-demo",
    generatedAt: aiSignal?.generatedAt ?? "demo",
    rawEvidence: aiSignal?.rawEvidence,
  });
}

function readLocalSignalMetadata() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(SIGNAL_METADATA_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonOrEmpty(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

function upsertLocalSignalRecord(record) {
  const existing = readLocalSignalMetadata();
  const keyOf = (item) => `${item.agentId}:${item.matchId}:${item.generatedAt || ""}:${item.txHash || ""}`;
  const next = [record, ...existing.filter((item) => keyOf(item) !== keyOf(record))].slice(0, 30);
  globalThis.localStorage?.setItem(SIGNAL_METADATA_KEY, JSON.stringify(next));
  return next;
}

function localSignalRecord(signalPayload, match, profile, extra = {}) {
  const raw = signalPayload.parsed || {};
  return {
    matchId: match.id,
    title: match.title,
    generatedAt: raw.clientTimestamp || new Date().toISOString(),
    model: profile.model,
    agentId: profile.agentId,
    agentName: profile.name,
    status: extra.status || "loaded",
    txHash: extra.txHash || "",
    signal: {
      homeBps: signalPayload.commitment.homeBps,
      drawBps: signalPayload.commitment.drawBps,
      awayBps: signalPayload.commitment.awayBps,
      confidenceBps: signalPayload.commitment.confidenceBps,
    },
    explanation: signalPayload.summary,
    rawEvidence: raw,
  };
}

function friendlyError(error) {
  const message = String(error?.shortMessage || error?.message || error);
  if (message.toLowerCase().includes("rate limit")) {
    return "Mantle RPC is rate-limiting live event reads. Showing cached snapshot and any just-submitted wallet receipts; try Refresh later.";
  }
  if (message.includes("could not coalesce error")) {
    return "Mantle RPC returned a low-level provider error. The app will keep cached data visible and retry on refresh.";
  }
  return message;
}

function vectorWinner(signal, match) {
  const options = [
    [match.home, signal.homeBps],
    ["Draw", signal.drawBps],
    [match.away, signal.awayBps],
  ];
  return options.sort((a, b) => b[1] - a[1])[0];
}

function exactScoreText(rawEvidence) {
  const scores = rawEvidence?.exactScore || rawEvidence?.signals?.exactScore || [];
  if (!Array.isArray(scores) || scores.length === 0) return "Score: not published";
  return `Score: ${scores.slice(0, 2).map((item) => `${item.score}${item.bps ? ` (${formatPct(item.bps)})` : ""}`).join(", ")}`;
}

function firstGoalText(rawEvidence, match) {
  const firstGoal = rawEvidence?.firstGoal || rawEvidence?.signals?.firstGoal;
  if (!firstGoal) return "First goal: not published";
  const [label, bps] = vectorWinner({
    homeBps: Number(firstGoal.homeBps || 0),
    drawBps: Number(firstGoal.noGoalBps || 0),
    awayBps: Number(firstGoal.awayBps || 0),
  }, { home: match.home, away: match.away });
  return `First goal: ${label === "Draw" ? "No goal" : label} ${formatPct(bps)}`;
}

function normalizeCommitment(candidate) {
  const source = candidate?.commitment ?? candidate;
  const required = [
    "matchId",
    "contextHash",
    "matchWindow",
    "homeBps",
    "drawBps",
    "awayBps",
    "confidenceBps",
    "evidenceHash",
    "metadataHash",
    "metadataUri",
  ];
  const missing = required.filter((key) => source?.[key] === undefined || source?.[key] === null);
  if (missing.length) {
    throw new Error(`Commit-ready payload is missing: ${missing.join(", ")}.`);
  }
  const next = {
    matchId: String(source.matchId),
    contextHash: String(source.contextHash),
    matchWindow: Number(source.matchWindow),
    homeBps: Number(source.homeBps),
    drawBps: Number(source.drawBps),
    awayBps: Number(source.awayBps),
    confidenceBps: Number(source.confidenceBps),
    evidenceHash: String(source.evidenceHash),
    metadataHash: String(source.metadataHash),
    metadataUri: String(source.metadataUri),
  };
  if (![next.matchId, next.contextHash, next.evidenceHash, next.metadataHash].every((value) => /^0x[0-9a-fA-F]{64}$/.test(value))) {
    throw new Error("Commit-ready payload hashes must be bytes32 hex values.");
  }
  if (next.homeBps + next.drawBps + next.awayBps !== 10000) {
    throw new Error("Commit-ready payload must sum to 10,000 bps.");
  }
  if ([next.matchWindow, next.homeBps, next.drawBps, next.awayBps, next.confidenceBps].some((value) => !Number.isInteger(value) || value < 0 || value > 10000)) {
    throw new Error("Commit-ready payload numeric fields must be integers from 0 to 10,000.");
  }
  return next;
}

function normalizeSimpleAgentSignal(candidate, match) {
  const source = candidate?.signals?.matchWinner1x2 ?? candidate?.matchWinner1x2 ?? candidate;
  const homeBps = Number(source.homeBps);
  const drawBps = Number(source.drawBps);
  const awayBps = Number(source.awayBps);
  const confidenceBps = Number(candidate.confidenceBps ?? source.confidenceBps ?? 5000);
  if ([homeBps, drawBps, awayBps, confidenceBps].some((value) => !Number.isInteger(value) || value < 0 || value > 10000)) {
    throw new Error("Agent signal must include integer homeBps, drawBps, awayBps, and confidenceBps from 0 to 10,000.");
  }
  if (homeBps + drawBps + awayBps !== 10000) {
    throw new Error("Agent signal must sum to 10,000 bps.");
  }
  return buildSignalCommitment(match, {
    homeBps,
    drawBps,
    awayBps,
    confidenceBps,
    model: candidate.model ?? "site-reading-agent",
    explanation: candidate.reasoningSummary ?? candidate.summary ?? candidate.explanation ?? "Agent submitted a structured MatchMind signal.",
    generatedBy: candidate.agentId ?? "site-reading-agent",
    generatedAt: candidate.clientTimestamp ?? new Date().toISOString(),
    rawEvidence: {
      matchId: match.id,
      summary: candidate.summary ?? null,
      reasoningSummary: candidate.reasoningSummary ?? candidate.explanation ?? "",
      exactScore: candidate.exactScore ?? candidate.signals?.exactScore ?? [],
      firstGoal: candidate.firstGoal ?? candidate.signals?.firstGoal ?? null,
      sourceMix: candidate.sourceMix ?? candidate.evidence ?? ["matchmind-site-context"],
      caveats: candidate.caveats ?? [],
    },
    metadataUri: candidate.metadataUri,
    contextSource: "MatchMind public site and agent-readable context",
  });
}

function matchFromSignal(candidate, fallbackMatch) {
  const matchId = candidate?.matchId || candidate?.selectedMatch || candidate?.match?.id;
  if (!matchId) return fallbackMatch;
  return MATCHES.find((match) => match.id === matchId) || fallbackMatch;
}

function parseAgentSignalPayload(text, match) {
  if (!text.trim()) {
    throw new Error("Paste a simple agent signal JSON or a commit-ready payload.");
  }
  const parsed = JSON.parse(text);
  if (parsed?.commitment || parsed?.contextHash || parsed?.metadataHash) {
    return {
      mode: "commitment",
      parsed,
      commitment: normalizeCommitment(parsed),
      match,
      profile: normalizeAgentProfile(parsed.agentProfile || parsed),
      summary: "Loaded commit-ready payload.",
    };
  }
  const signalMatch = matchFromSignal(parsed, match);
  return {
    mode: "simple-signal",
    parsed,
    commitment: normalizeSimpleAgentSignal(parsed, signalMatch),
    match: signalMatch,
    profile: normalizeAgentProfile(parsed.agentProfile || parsed),
    summary: parsed.reasoningSummary ?? parsed.summary ?? "Loaded simple agent signal.",
  };
}

function App() {
  const [selectedId, setSelectedId] = useState(MATCHES[0].id);
  const launchLoadedRef = useRef(false);
  const [wallet, setWallet] = useState("");
  const [agent, setAgent] = useState(null);
  const [nextSignalId, setNextSignalId] = useState(null);
  const [events, setEvents] = useState(() => snapshotSignalEvents());
  const [agentRegistry, setAgentRegistry] = useState(new Map());
  const [localSignals, setLocalSignals] = useState(() => readLocalSignalMetadata());
  const [readWarning, setReadWarning] = useState("");
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [agentSignalText, setAgentSignalText] = useState(SIMPLE_AGENT_EXAMPLE);
  const [agentCommitment, setAgentCommitment] = useState(null);
  const [agentSignalError, setAgentSignalError] = useState("");
  const [agentSignalMode, setAgentSignalMode] = useState("");
  const [agentProfile, setAgentProfile] = useState(DEFAULT_AGENT_PROFILE);

  const selectedMatch = useMemo(
    () => MATCHES.find((match) => match.id === selectedId) || MATCHES[0],
    [selectedId],
  );
  const signal = useMemo(() => agentCommitment ?? buildSignal(selectedMatch), [selectedMatch, agentCommitment]);

  const selectMatch = useCallback((matchId) => {
    setSelectedId(matchId);
    setAgentCommitment(null);
    setAgentSignalError("");
    setAgentSignalMode("");
  }, []);

  useEffect(() => {
    if (launchLoadedRef.current) return;
    launchLoadedRef.current = true;
    try {
      const launch = getLaunchParams();
      if (!launch.agentSignal) return;
      const signalPayload = decodeBase64UrlJson(launch.agentSignal);
      const profilePayload = launch.agentProfile ? decodeBase64UrlJson(launch.agentProfile) : signalPayload.agentProfile;
      const profile = normalizeAgentProfile(profilePayload || signalPayload);
      const text = JSON.stringify({ ...signalPayload, agentProfile: profile }, null, 2);
      const parsedSignal = parseAgentSignalPayload(text, MATCHES[0]);
      setAgentSignalText(text);
      setSelectedId(parsedSignal.match.id);
      setAgentCommitment(parsedSignal.commitment);
      setAgentSignalMode("agent deeplink");
      setAgentProfile(profile);
      setLocalSignals(upsertLocalSignalRecord(localSignalRecord(parsedSignal, parsedSignal.match, profile, { status: "loaded" })));
      setStatus(`Loaded ${profile.name} (${profile.agentId}) from agent deeplink. Next: click the green confirmation button, then approve wallet prompts.`);
    } catch (error) {
      setAgentSignalError(`Agent deeplink could not be loaded: ${error.message}`);
    }
  }, []);

  const refreshArena = useCallback(async (address = wallet) => {
    const [nextResult, logsResult, registryResult] = await Promise.allSettled([
      readArena.nextSignalId(),
      querySignalEvents(),
      queryAgentEvents(),
    ]);
    const warnings = [];
    if (nextResult.status === "fulfilled") {
      setNextSignalId(Number(nextResult.value));
    } else {
      warnings.push(friendlyError(nextResult.reason));
    }
    if (logsResult.status === "fulfilled") {
      setEvents((current) => mergeEvents(current, logsResult.value));
    } else {
      warnings.push(friendlyError(logsResult.reason));
    }
    if (registryResult.status === "fulfilled") {
      setAgentRegistry(registryResult.value);
    } else {
      warnings.push(friendlyError(registryResult.reason));
    }
    setReadWarning([...new Set(warnings)].join(" "));

    if (address) {
      try {
        const record = await readArena.getAgent(address);
        setAgent(record);
      } catch (error) {
        setReadWarning((current) => [current, friendlyError(error)].filter(Boolean).join(" "));
      }
    }
  }, [wallet]);

  useEffect(() => {
    refreshArena().catch((error) => {
      setReadWarning(friendlyError(error));
    });
  }, [refreshArena]);

  async function getSignerContract() {
    if (!window.ethereum) {
      throw new Error("No EVM wallet found. Install MetaMask or another EIP-1193 wallet.");
    }
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: MANTLE_SEPOLIA.chainId }],
    }).catch(async (error) => {
      if (error.code !== 4902) throw error;
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [MANTLE_SEPOLIA],
      });
    });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return {
      address: await signer.getAddress(),
      arena: new ethers.Contract(CONTRACT_ADDRESS, ARENA_ABI, signer),
    };
  }

  async function connectWallet() {
    setBusy("wallet");
    setStatus("");
    try {
      const { address } = await getSignerContract();
      setWallet(address);
      await refreshArena(address);
      setStatus(`Connected ${shortHash(address)} on Mantle Sepolia.`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy("");
    }
  }

  async function registerAgent() {
    setBusy("register");
    setStatus("Submitting agent registration...");
    try {
      const { address, arena } = await getSignerContract();
      setWallet(address);
      const registration = buildAgentRegistration(agentProfile, address);
      const tx = await arena.registerAgent(
        registration.metadataHash,
        registration.metadataUri,
      );
      setTxHash(tx.hash);
      setStatus("Waiting for Mantle confirmation...");
      await tx.wait();
      await refreshArena(address);
      setStatus(`${agentProfile.name} registered. You can commit a signal now.`);
    } catch (error) {
      setStatus(error.shortMessage || error.message);
    } finally {
      setBusy("");
    }
  }

  async function submitSignal() {
    setBusy("signal");
    setStatus("Approve the signal transaction in your wallet to commit this prediction on Mantle.");
    try {
      const { address, arena } = await getSignerContract();
      setWallet(address);
      const record = await readArena.getAgent(address);
      if (!record.registered) {
        throw new Error("Register this wallet as an agent before submitting a signal.");
      }
      const tx = await arena.submitSignal(signal);
      setTxHash(tx.hash);
      setStatus("Signal transaction sent. Waiting for Mantle confirmation...");
      const receipt = await tx.wait();
      const receiptEvents = signalEventsFromReceipt(receipt);
      setEvents((current) => mergeEvents(current, receiptEvents));
      await refreshArena(address);
      setStatus("Signal committed on Mantle Sepolia.");
    } catch (error) {
      setStatus(friendlyError(error));
    } finally {
      setBusy("");
    }
  }

  async function confirmAgentSignal() {
    setBusy("confirm");
    setStatus("Preparing wallet flow. You may need to approve two prompts: agent registration first, then signal commit.");
    try {
      const { address, arena } = await getSignerContract();
      setWallet(address);
      const record = await readArena.getAgent(address);
      if (!record.registered) {
        const registration = buildAgentRegistration(agentProfile, address);
        setStatus(`Step 1/2: approve agent registration for ${agentProfile.name} (${agentProfile.agentId}) in your wallet.`);
        const registerTx = await arena.registerAgent(registration.metadataHash, registration.metadataUri);
        setTxHash(registerTx.hash);
        await registerTx.wait();
        setAgentRegistry((current) => new Map(current).set(address.toLowerCase(), {
          metadataHash: registration.metadataHash,
          metadataUri: registration.metadataUri,
          agentId: agentProfile.agentId,
        }));
        setAgent({
          registered: true,
          metadataHash: registration.metadataHash,
          metadataUri: registration.metadataUri,
          registeredAt: 0,
        });
      }
      setStatus(record.registered
        ? "Approve the signal transaction in your wallet to commit this prediction on Mantle."
        : "Step 2/2: registration confirmed. Now approve the signal transaction in your wallet.");
      const signalTx = await arena.submitSignal(signal);
      setTxHash(signalTx.hash);
      const receipt = await signalTx.wait();
      const receiptEvents = signalEventsFromReceipt(receipt);
      setEvents((current) => mergeEvents(current, receiptEvents));
      setLocalSignals(upsertLocalSignalRecord(localSignalRecord({
        parsed: parseJsonOrEmpty(agentSignalText),
        commitment: signal,
        summary: agentCommitment ? "Committed agent-loaded signal." : "Committed baseline signal.",
      }, selectedMatch, agentProfile, { status: "submitted", txHash: signalTx.hash })));
      await refreshArena(address);
      setStatus(`${agentProfile.name} signal committed on Mantle.`);
    } catch (error) {
      setStatus(friendlyError(error));
    } finally {
      setBusy("");
    }
  }

  function loadAgentSignal() {
    setAgentSignalError("");
    setStatus("");
    try {
      const signalPayload = parseAgentSignalPayload(agentSignalText, selectedMatch);
      const { parsed, commitment } = signalPayload;
      const matched = MATCHES.find((match) => ethers.id(match.id).toLowerCase() === commitment.matchId.toLowerCase());
      if (matched && matched.id !== selectedId) setSelectedId(matched.id);
      setAgentCommitment(commitment);
      setAgentSignalMode(signalPayload.mode);
      setAgentProfile(signalPayload.profile);
      setLocalSignals(upsertLocalSignalRecord(localSignalRecord(
        signalPayload,
        matched ?? selectedMatch,
        signalPayload.profile,
        { status: "loaded" },
      )));
      setStatus("Agent signal loaded. Next: click the green confirmation button, then approve wallet prompts.");
    } catch (error) {
      setAgentSignalError(error.message);
      setStatus("");
    }
  }

  const agentLabel = useCallback((address) => {
    const profile = agentRegistry.get(String(address).toLowerCase());
    return profile?.agentId || shortHash(address);
  }, [agentRegistry]);
  const selectedMatchHash = ethers.id(selectedMatch.id).toLowerCase();
  const selectedEvents = events.filter((event) => String(event.matchId).toLowerCase() === selectedMatchHash);
  const latestSelectedEvent = selectedEvents[0] || null;
  const activeSignal = agentCommitment || latestSelectedEvent || selectedMatch;
  const activeSignalLabel = agentCommitment
    ? `${agentProfile.agentId} loaded signal`
    : latestSelectedEvent
      ? `${agentLabel(latestSelectedEvent.agent)} latest on-chain signal`
      : "Baseline market reference";
  const selectedLocalSignals = localSignals.filter((record) => record.matchId === selectedMatch.id);
  const predictionRows = [
    ...selectedLocalSignals.map((record) => ({
      key: `local:${record.agentId}:${record.generatedAt}:${record.txHash || "draft"}`,
      source: record.status === "submitted" ? "Submitted from this browser" : "Loaded in this browser",
      agent: record.agentId,
      signal: record.signal,
      rawEvidence: record.rawEvidence,
      txHash: record.txHash,
    })),
    ...selectedEvents.map((event) => ({
      key: `chain:${event.txHash}:${event.signalId}`,
      source: event.fromSnapshot ? "On-chain snapshot" : "On-chain event",
      agent: agentLabel(event.agent),
      signal: event,
      rawEvidence: null,
      txHash: event.txHash,
    })),
  ].filter((row, index, list) => (
    index === list.findIndex((candidate) => (
      candidate.agent === row.agent
      && Number(candidate.signal.homeBps) === Number(row.signal.homeBps)
      && Number(candidate.signal.drawBps) === Number(row.signal.drawBps)
      && Number(candidate.signal.awayBps) === Number(row.signal.awayBps)
      && (candidate.txHash || "") === (row.txHash || "")
    ))
  ));
  const agentReady = Boolean(agent?.registered);
  const selectedResolution = attachResultSource(DEMO_RESOLUTIONS[selectedMatch.id]);
  const leaderboard = buildLeaderboard(events);

  return (
    <main className="app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="MatchMind Arena">
          <span className="brand-mark"><BrainCircuit size={22} /></span>
          <span>
            <strong>MatchMind Arena</strong>
            <small>AI signal desk for live football</small>
          </span>
        </a>
        <nav className="top-actions" aria-label="Arena actions">
          <a href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer" className="link-button">
            <ShieldCheck size={17} /> Contract
          </a>
          <button onClick={connectWallet} disabled={busy === "wallet"} className="primary compact">
            {busy === "wallet" ? <Loader2 className="spin" size={17} /> : <Wallet size={17} />}
            {wallet ? shortHash(wallet) : "Connect wallet"}
          </button>
        </nav>
      </header>

      <section className="command-strip" aria-label="Mantle contract status">
        <Metric icon={<RadioTower size={18} />} label="Network" value="Mantle Sepolia" />
        <Metric icon={<BadgeCheck size={18} />} label="Verified contract" value={shortHash(CONTRACT_ADDRESS)} />
        <Metric icon={<Activity size={18} />} label="Loaded signals" value={events.length} />
        <Metric icon={<Network size={18} />} label="Next signal" value={nextSignalId ?? "-"} />
        <Metric icon={<Gauge size={18} />} label="Resolved scored" value={leaderboard.reduce((total, entry) => total + entry.resolved, 0)} />
      </section>

      <section className="review-flow" aria-label="MatchMind Arena overview">
        <div className="review-copy">
          <span className="kicker">Reviewer path</span>
          <h2>AI reads the match, Mantle keeps the receipt, the leaderboard grades the call.</h2>
          <p>
            MatchMind Arena is a public benchmark for football signals. A model or agent submits a
            1X2 probability, the evidence hash is committed on Mantle, and the result is scored after
            public resolution.
          </p>
        </div>
        <div className="review-steps" aria-label="Verification flow">
          <Step icon={<Sparkles size={17} />} label="Generate" value="AI signal" />
          <Step icon={<ShieldCheck size={17} />} label="Commit" value="Mantle proof" />
          <Step icon={<Gauge size={17} />} label="Score" value="Brier + log loss" />
        </div>
        <dl className="term-strip" aria-label="Key terms">
          <div><dt>1X2</dt><dd>home / draw / away</dd></div>
          <div><dt>bps</dt><dd>basis points, 10,000 = 100%</dd></div>
          <div><dt>quality</dt><dd>normalized score after resolution</dd></div>
          <div><dt>demo replay</dt><dd>historical match used for a verifiable demo</dd></div>
        </dl>
      </section>

      <section className="agent-entry" aria-label="Agent-readable entry">
        <div>
          <span className="kicker">Agent entry</span>
          <h2>Agents can read this site directly.</h2>
          <p>
            The page exposes a skill document, machine-readable context, and market-like
            prediction dimensions. An agent should use these shared facts plus its own
            search, video, memory, and user preferences to form a judgment.
          </p>
        </div>
        <div className="agent-links">
          <a href={AGENT_SKILL_URL} target="_blank" rel="noreferrer" className="link-button">
            <Bot size={17} /> Agent skill
          </a>
          <a href={AGENT_CONTEXT_URL} target="_blank" rel="noreferrer" className="link-button">
            <Layers3 size={17} /> Context JSON
          </a>
          <a href={AGENT_ACTION_URL} target="_blank" rel="noreferrer" className="link-button">
            <Zap size={17} /> Action JSON
          </a>
          <a href={LLMS_URL} target="_blank" rel="noreferrer" className="link-button">
            <BrainCircuit size={17} /> llms.txt
          </a>
        </div>
        <div className="dimension-grid" aria-label="Prediction dimensions">
          {PREDICTION_DIMENSIONS.map(([label, description]) => (
            <Dimension key={label} label={label} description={description} />
          ))}
        </div>
      </section>

      <section className="arena-grid">
        <aside className="match-rail" aria-label="Match list">
          <div className="section-title">
            <span><Trophy size={18} /> Match board</span>
            <small>{MATCHES.length} cards</small>
          </div>
          {MATCHES.map((match) => (
            <button
              key={match.id}
              className={`match-card ${match.id === selectedId ? "active" : ""}`}
              onClick={() => selectMatch(match.id)}
            >
              <span>{match.stage}</span>
              <strong>{match.title}</strong>
              <small>{match.subtitle}</small>
            </button>
          ))}
        </aside>

        <section className="match-stage">
          <div className="stage-header">
            <div>
              <span className="kicker">{selectedMatch.stage}</span>
              <h1>{selectedMatch.title}</h1>
              <p><Clock3 size={16} /> {selectedMatch.kickoff} <span /> {selectedMatch.venue}</p>
            </div>
            <div className="status-pill"><Zap size={15} /> {selectedMatch.status}</div>
          </div>

          <div className="field-view" aria-label="Match signal field visual">
            <div className="field-lines" />
            <div className="signal-source-pill">{activeSignalLabel}</div>
            <div className="team-node home">
              <span>{selectedMatch.home}</span>
              <strong>{formatPct(activeSignal.homeBps)}</strong>
            </div>
            <div className="team-node draw">
              <span>Draw pressure</span>
              <strong>{formatPct(activeSignal.drawBps)}</strong>
            </div>
            <div className="team-node away">
              <span>{selectedMatch.away}</span>
              <strong>{formatPct(activeSignal.awayBps)}</strong>
            </div>
          </div>

          <div className="prob-grid">
            <Probability label={selectedMatch.home} value={activeSignal.homeBps} tone="home" />
            <Probability label="Draw" value={activeSignal.drawBps} tone="draw" />
            <Probability label={selectedMatch.away} value={activeSignal.awayBps} tone="away" />
          </div>

          <section className="prediction-panel" aria-label="Agent predictions for selected match">
            <div className="section-title">
              <span><Bot size={18} /> Agent predictions</span>
              <small>{predictionRows.length} visible</small>
            </div>
            {predictionRows.length === 0 ? (
              <p className="empty">No agent prediction is loaded for this match yet. Ask an agent to open the action deeplink, then confirm the wallet transaction.</p>
            ) : (
              predictionRows.map((row) => {
                const [winner, winnerBps] = vectorWinner(row.signal, selectedMatch);
                return (
                  <div className="prediction-card" key={row.key}>
                    <div>
                      <strong>{row.agent}</strong>
                      <span>{row.source}</span>
                    </div>
                    <b>{winner} {formatPct(winnerBps)}</b>
                    <p>
                      1X2: {selectedMatch.home} {formatPct(row.signal.homeBps)} · Draw {formatPct(row.signal.drawBps)} · {selectedMatch.away} {formatPct(row.signal.awayBps)}
                    </p>
                    <small>{exactScoreText(row.rawEvidence)} · {firstGoalText(row.rawEvidence, selectedMatch)}</small>
                    {row.txHash ? (
                      <a href={`${EXPLORER}/tx/${row.txHash}`} target="_blank" rel="noreferrer">
                        Open tx <ExternalLink size={12} />
                      </a>
                    ) : null}
                  </div>
                );
              })
            )}
          </section>
        </section>

        <aside className="proof-desk">
          <section className="signal-composer">
            <div className="section-title">
              <span><Sparkles size={18} /> Signal composer</span>
              <small>{agentCommitment ? agentSignalMode : "demo baseline"}</small>
            </div>
            <p>{selectedMatch.bias}</p>
            <div className="agent-box">
              <p className="model-note">
                Simple path: an agent reads the page or action manifest, prepares a signal, and opens
                MatchMind with a deeplink. You only confirm the wallet action.
              </p>
              <div className="agent-id-card">
                <span>Agent ID</span>
                <strong>{agentProfile.agentId}</strong>
                <small>{agentProfile.name} · {agentProfile.model}</small>
              </div>
              <div className="command-card">
                <span>Agent action</span>
                <code>Read /agent-action.json</code>
                <code>Open #agentSignal=&lt;base64url-json&gt;</code>
                <span>Then use the green button below; approve wallet prompts to write on Mantle.</span>
              </div>
              <details className="debug-box">
                <summary>Advanced: paste or inspect signal JSON</summary>
                <label>
                  <span>Agent signal JSON</span>
                  <textarea
                    value={agentSignalText}
                    onChange={(event) => setAgentSignalText(event.target.value)}
                    placeholder={SIMPLE_AGENT_EXAMPLE}
                    rows={10}
                  />
                </label>
                <button onClick={loadAgentSignal} className="link-button model-action">
                  <Bot size={17} />
                  Load signal for Mantle commit
                </button>
              </details>
            </div>
            {agentSignalError ? <p className="error-text">{agentSignalError}</p> : null}
            <dl className="hash-list">
              <div><dt>Context</dt><dd>{shortHash(signal.contextHash)}</dd></div>
              <div><dt>Evidence</dt><dd>{shortHash(signal.evidenceHash)}</dd></div>
              <div><dt>Confidence</dt><dd>{formatPct(signal.confidenceBps)}</dd></div>
            </dl>
            {agentCommitment ? (
              <p className="ai-explanation">
                Agent signal loaded. MatchMind will commit the strict 1X2 vector on Mantle; exact score,
                first goal, and other dimensions stay as analysis evidence for the agent's reasoning.
              </p>
            ) : (
              <p className="ai-explanation">
                The website exposes the match context and supported dimensions for agents. The example
                JSON is intentionally simple so any AI agent can produce it quickly.
              </p>
            )}
            <div className="button-row">
              <button onClick={confirmAgentSignal} disabled={busy === "confirm"} className="primary">
                {busy === "confirm" ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
                Confirm in wallet and submit to Mantle
              </button>
              <button onClick={registerAgent} disabled={busy === "register" || agentReady} className="secondary">
                {busy === "register" ? <Loader2 className="spin" size={18} /> : <Bot size={18} />}
                {agentReady ? "Agent ready" : "Register agent"}
              </button>
              <button onClick={submitSignal} disabled={busy === "signal"} className="secondary">
                {busy === "signal" ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
                Commit signal
              </button>
            </div>
          </section>

          {(status || txHash) && (
            <div className="notice">
              <span>{status}</span>
              {txHash && (
                <a href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer">
                  Open tx <ExternalLink size={14} />
                </a>
              )}
            </div>
          )}

          {readWarning ? (
            <div className="notice muted-notice">
              <span>{readWarning}</span>
              <button onClick={() => refreshArena(wallet)} className="link-button">Refresh events</button>
            </div>
          ) : null}

          <section className="mini-panel timeline-panel">
            <div className="section-title">
              <span><Layers3 size={18} /> Signal timeline</span>
              <small>{selectedEvents.length} match</small>
            </div>
            {selectedEvents.length === 0 ? (
              <p className="empty">No on-chain signal for this selected card yet.</p>
            ) : (
              selectedEvents.map((event) => (
                <a className="timeline-item" href={`${EXPLORER}/tx/${event.txHash}`} target="_blank" rel="noreferrer" key={`${event.txHash}-${event.signalId}`}>
                  <span>#{event.signalId} · block {event.blockNumber}</span>
                  <strong>{formatPct(event.homeBps)} / {formatPct(event.drawBps)} / {formatPct(event.awayBps)}</strong>
                  <small>{event.isRevision ? "Revision signal" : "Primary signal"} · {agentLabel(event.agent)} · {event.submittedAt ?? "time pending"}</small>
                </a>
              ))
            )}
          </section>

          <section className="mini-panel">
            <div className="section-title">
              <span><Gauge size={18} /> Agent leaderboard</span>
              <small>{leaderboard.length} scored</small>
            </div>
            {selectedResolution ? (
              <p className="resolution-note">
                Demo result: {RESULT_LABELS[selectedResolution.result]} · {selectedResolution.source}
                {" "}
                <a href={selectedResolution.sourceUri} target="_blank" rel="noreferrer">
                  FIFA source <ExternalLink size={12} />
                </a>
              </p>
            ) : null}
            {leaderboard.length === 0 ? (
              <p className="empty">No resolved signal can be scored yet.</p>
            ) : (
              leaderboard.map((entry, index) => (
                <div className="leader-card" key={entry.agent}>
                  <div className="leader-rank">#{index + 1}</div>
                  <div>
                    <strong>{agentLabel(entry.agent)}</strong>
                    <span>{entry.resolved} resolved signal{entry.resolved === 1 ? "" : "s"}</span>
                  </div>
                  <b>{entry.quality}</b>
                  <small>Brier {entry.brier.toFixed(3)} · Log loss {entry.logLoss.toFixed(3)}</small>
                </div>
              ))
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Step({ icon, label, value }) {
  return (
    <div className="step">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Dimension({ label, description }) {
  return (
    <div className="dimension">
      <strong>{label}</strong>
      <span>{description}</span>
    </div>
  );
}

function Probability({ label, value, tone }) {
  return (
    <div className={`prob-card ${tone}`}>
      <span>{label}</span>
      <strong>{formatPct(value)}</strong>
      <div className="meter"><i style={{ width: `${Number(value) / 100}%` }} /></div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
