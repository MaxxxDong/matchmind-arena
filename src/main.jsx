import React, { useCallback, useEffect, useMemo, useState } from "react";
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

const MODEL_CONFIG_KEY = "matchmind:model-config";
const SIGNAL_METADATA_KEY = "matchmind:signal-metadata";
const DEFAULT_MODEL_CONFIG = {
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
};

const publicProvider = new ethers.JsonRpcProvider(MANTLE_SEPOLIA.rpcUrls[0]);
const readArena = new ethers.Contract(CONTRACT_ADDRESS, ARENA_ABI, publicProvider);
const LOG_CHUNK_SIZE = 9000;

function shortHash(value) {
  if (!value) return "-";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatPct(bps) {
  return `${(Number(bps) / 100).toFixed(1)}%`;
}

async function querySignalEvents() {
  const latest = await publicProvider.getBlockNumber();
  const filter = readArena.filters.SignalSubmitted();
  const logs = [];
  for (let fromBlock = DEPLOY_BLOCK; fromBlock <= latest; fromBlock += LOG_CHUNK_SIZE + 1) {
    const toBlock = Math.min(fromBlock + LOG_CHUNK_SIZE, latest);
    logs.push(...await readArena.queryFilter(filter, fromBlock, toBlock));
  }
  return logs;
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function buildSignal(match, aiSignal) {
  const homeBps = aiSignal?.homeBps ?? match.homeBps;
  const drawBps = aiSignal?.drawBps ?? match.drawBps;
  const awayBps = aiSignal?.awayBps ?? match.awayBps;
  const confidenceBps = aiSignal?.confidenceBps ?? match.confidenceBps;
  const context = {
    matchId: match.id,
    title: match.title,
    source: "MatchMind browser context pack",
    notes: [match.bias, match.status, match.venue],
  };
  const metadata = {
    app: "MatchMind Arena",
    model: aiSignal?.model ?? "demo-sports-signal-agent",
    explanation: aiSignal?.explanation ??
      "Demo signal generated from match context, replay evidence labels, and tactical momentum notes.",
    probabilities: {
      home: homeBps,
      draw: drawBps,
      away: awayBps,
    },
    confidenceBps,
    generatedBy: aiSignal ? "user-configured-model" : "deterministic-demo",
    generatedAt: aiSignal?.generatedAt ?? "demo",
  };
  return {
    matchId: ethers.id(match.id),
    contextHash: ethers.id(stableJson(context)),
    matchWindow: match.window,
    homeBps,
    drawBps,
    awayBps,
    confidenceBps,
    evidenceHash: ethers.id(aiSignal ? stableJson(aiSignal.rawEvidence) : `evidence:${match.id}:browser-demo`),
    metadataHash: ethers.id(stableJson(metadata)),
    metadataUri: `https://matchmind-arena.local/signals/${encodeURIComponent(match.id)}`,
  };
}

function readModelConfig() {
  try {
    const raw = globalThis.localStorage?.getItem(MODEL_CONFIG_KEY);
    return raw ? { ...DEFAULT_MODEL_CONFIG, ...JSON.parse(raw) } : DEFAULT_MODEL_CONFIG;
  } catch {
    return DEFAULT_MODEL_CONFIG;
  }
}

function normalizeBaseUrl(url) {
  return url.trim().replace(/\/+$/, "");
}

function chatCompletionsUrl(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
}

function extractJson(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return JSON.parse(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Model response did not include a JSON object.");
  return JSON.parse(match[0]);
}

function normalizeSignalVector(candidate) {
  const values = ["homeBps", "drawBps", "awayBps"].map((key) => Number(candidate[key]));
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("Model probabilities must be non-negative numbers.");
  }
  const sum = values.reduce((total, value) => total + value, 0);
  if (sum <= 0) throw new Error("Model probability vector cannot sum to zero.");
  const scaled = values.map((value) => Math.round((value / sum) * 10000));
  const delta = 10000 - scaled.reduce((total, value) => total + value, 0);
  const maxIndex = scaled.indexOf(Math.max(...scaled));
  scaled[maxIndex] += delta;
  const confidenceBps = Math.max(0, Math.min(10000, Math.round(Number(candidate.confidenceBps ?? 5000))));
  return {
    homeBps: scaled[0],
    drawBps: scaled[1],
    awayBps: scaled[2],
    confidenceBps,
    explanation: String(candidate.explanation || "Model returned a structured sports signal."),
  };
}

function buildSignalPrompt(match) {
  return [
    "You are an AI football signal agent in MatchMind Arena.",
    "Return only one JSON object. No markdown.",
    "Schema: {\"homeBps\": number, \"drawBps\": number, \"awayBps\": number, \"confidenceBps\": number, \"explanation\": string}.",
    "homeBps + drawBps + awayBps should represent a 1X2 football probability vector in basis points and should sum to 10000.",
    "confidenceBps is 0 to 10000.",
    "Use the provided context; do not claim unavailable live facts.",
    "",
    `Match: ${match.title}`,
    `Stage: ${match.stage}`,
    `Kickoff: ${match.kickoff}`,
    `Venue: ${match.venue}`,
    `Context note: ${match.bias}`,
    `Baseline: home ${match.homeBps}, draw ${match.drawBps}, away ${match.awayBps}, confidence ${match.confidenceBps}.`,
  ].join("\n");
}

function storeLocalSignalMetadata(record) {
  try {
    const existing = JSON.parse(globalThis.localStorage?.getItem(SIGNAL_METADATA_KEY) || "[]");
    const next = [record, ...(Array.isArray(existing) ? existing : [])].slice(0, 20);
    globalThis.localStorage?.setItem(SIGNAL_METADATA_KEY, JSON.stringify(next));
  } catch {
    globalThis.localStorage?.setItem(SIGNAL_METADATA_KEY, JSON.stringify([record]));
  }
}

function App() {
  const [selectedId, setSelectedId] = useState(MATCHES[0].id);
  const [wallet, setWallet] = useState("");
  const [agent, setAgent] = useState(null);
  const [nextSignalId, setNextSignalId] = useState(null);
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [modelConfig, setModelConfig] = useState(readModelConfig);
  const [aiSignal, setAiSignal] = useState(null);
  const [aiError, setAiError] = useState("");

  const selectedMatch = useMemo(
    () => MATCHES.find((match) => match.id === selectedId) || MATCHES[0],
    [selectedId],
  );
  const signal = useMemo(() => buildSignal(selectedMatch, aiSignal), [selectedMatch, aiSignal]);

  useEffect(() => {
    globalThis.localStorage?.setItem(MODEL_CONFIG_KEY, JSON.stringify(modelConfig));
  }, [modelConfig]);

  useEffect(() => {
    setAiSignal(null);
    setAiError("");
  }, [selectedId]);

  const refreshArena = useCallback(async (address = wallet) => {
    const [next, logs] = await Promise.all([
      readArena.nextSignalId(),
      querySignalEvents(),
    ]);
    setNextSignalId(Number(next));
    setEvents(
      logs
        .slice()
        .reverse()
        .map((log) => ({
          signalId: Number(log.args.signalId),
          agent: log.args.agent,
          matchId: log.args.matchId,
          homeBps: Number(log.args.homeBps),
          drawBps: Number(log.args.drawBps),
          awayBps: Number(log.args.awayBps),
          confidenceBps: Number(log.args.confidenceBps),
          isRevision: log.args.isRevision,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
        })),
    );

    if (address) {
      const record = await readArena.getAgent(address);
      setAgent(record);
    }
  }, [wallet]);

  useEffect(() => {
    refreshArena().catch((error) => {
      setStatus(`Arena read failed: ${error.message}`);
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
      const metadataHash = ethers.id(`agent:${address.toLowerCase()}:matchmind-demo`);
      const tx = await arena.registerAgent(
        metadataHash,
        "https://matchmind-arena.local/agents/browser-demo",
      );
      setTxHash(tx.hash);
      setStatus("Waiting for Mantle confirmation...");
      await tx.wait();
      await refreshArena(address);
      setStatus("Agent registered. You can commit a signal now.");
    } catch (error) {
      setStatus(error.shortMessage || error.message);
    } finally {
      setBusy("");
    }
  }

  async function submitSignal() {
    setBusy("signal");
    setStatus("Sending structured AI signal to Mantle...");
    try {
      const { address, arena } = await getSignerContract();
      setWallet(address);
      const record = await readArena.getAgent(address);
      if (!record.registered) {
        throw new Error("Register this wallet as an agent before submitting a signal.");
      }
      const tx = await arena.submitSignal(signal);
      setTxHash(tx.hash);
      setStatus("Signal submitted. Waiting for block confirmation...");
      await tx.wait();
      await refreshArena(address);
      setStatus("Signal committed on Mantle Sepolia.");
    } catch (error) {
      setStatus(error.shortMessage || error.message);
    } finally {
      setBusy("");
    }
  }

  async function generateAiSignal() {
    setBusy("ai");
    setAiError("");
    setStatus("");
    try {
      const baseUrl = normalizeBaseUrl(modelConfig.baseUrl);
      if (!baseUrl) throw new Error("Base URL is required.");
      const endpoint = chatCompletionsUrl(baseUrl);
      if (!modelConfig.apiKey.trim()) throw new Error("API Key is required.");
      if (!modelConfig.model.trim()) throw new Error("Model is required.");

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${modelConfig.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: modelConfig.model.trim(),
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You produce calibrated football 1X2 probability signals for an on-chain benchmark. Return valid JSON only.",
            },
            { role: "user", content: buildSignalPrompt(selectedMatch) },
          ],
        }),
      });

      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(`Model request failed with HTTP ${response.status}: ${responseText.slice(0, 240)}`);
      }
      const payload = JSON.parse(responseText);
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error("Model endpoint returned no assistant message.");
      }
      const parsed = extractJson(content);
      const normalized = normalizeSignalVector(parsed);
      const nextAiSignal = {
        ...normalized,
        model: modelConfig.model.trim(),
        generatedAt: new Date().toISOString(),
        rawEvidence: {
          matchId: selectedMatch.id,
          model: modelConfig.model.trim(),
          prompt: buildSignalPrompt(selectedMatch),
          response: parsed,
          normalized,
        },
      };
      setAiSignal(nextAiSignal);
      storeLocalSignalMetadata({
        matchId: selectedMatch.id,
        title: selectedMatch.title,
        generatedAt: nextAiSignal.generatedAt,
        model: nextAiSignal.model,
        signal: {
          homeBps: nextAiSignal.homeBps,
          drawBps: nextAiSignal.drawBps,
          awayBps: nextAiSignal.awayBps,
          confidenceBps: nextAiSignal.confidenceBps,
        },
        explanation: nextAiSignal.explanation,
        rawEvidence: nextAiSignal.rawEvidence,
      });
      setStatus("AI signal generated and validated. Review it, then commit on-chain.");
    } catch (error) {
      setAiError(error.message);
      setStatus("");
    } finally {
      setBusy("");
    }
  }

  const selectedEvents = events.filter((event) => event.matchId === signal.matchId);
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
              onClick={() => setSelectedId(match.id)}
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
            <div className="team-node home">
              <span>{selectedMatch.home}</span>
              <strong>{formatPct(selectedMatch.homeBps)}</strong>
            </div>
            <div className="team-node draw">
              <span>Draw pressure</span>
              <strong>{formatPct(selectedMatch.drawBps)}</strong>
            </div>
            <div className="team-node away">
              <span>{selectedMatch.away}</span>
              <strong>{formatPct(selectedMatch.awayBps)}</strong>
            </div>
          </div>

          <div className="prob-grid">
            <Probability label={selectedMatch.home} value={selectedMatch.homeBps} tone="home" />
            <Probability label="Draw" value={selectedMatch.drawBps} tone="draw" />
            <Probability label={selectedMatch.away} value={selectedMatch.awayBps} tone="away" />
          </div>
        </section>

        <aside className="proof-desk">
          <section className="signal-composer">
            <div className="section-title">
              <span><Sparkles size={18} /> Signal composer</span>
              <small>{aiSignal ? "model signal" : "demo baseline"}</small>
            </div>
            <p>{selectedMatch.bias}</p>
            <div className="model-box">
              <p className="model-note">Keys stay in this browser. Generated metadata is cached locally before the on-chain commit.</p>
              <label>
                <span>Base URL</span>
                <input
                  value={modelConfig.baseUrl}
                  onChange={(event) => setModelConfig((current) => ({ ...current, baseUrl: event.target.value }))}
                  placeholder="https://api.openai.com/v1"
                />
              </label>
              <label>
                <span>API Key</span>
                <input
                  value={modelConfig.apiKey}
                  onChange={(event) => setModelConfig((current) => ({ ...current, apiKey: event.target.value }))}
                  placeholder="User-provided key"
                  type="password"
                />
              </label>
              <label>
                <span>Model</span>
                <input
                  value={modelConfig.model}
                  onChange={(event) => setModelConfig((current) => ({ ...current, model: event.target.value }))}
                  placeholder="gpt-4o-mini"
                />
              </label>
              <button onClick={generateAiSignal} disabled={busy === "ai"} className="link-button model-action">
                {busy === "ai" ? <Loader2 className="spin" size={17} /> : <Bot size={17} />}
                Generate AI signal
              </button>
            </div>
            {aiError ? <p className="error-text">{aiError}</p> : null}
            <dl className="hash-list">
              <div><dt>Context</dt><dd>{shortHash(signal.contextHash)}</dd></div>
              <div><dt>Evidence</dt><dd>{shortHash(signal.evidenceHash)}</dd></div>
              <div><dt>Confidence</dt><dd>{formatPct(signal.confidenceBps)}</dd></div>
            </dl>
            {aiSignal ? <p className="ai-explanation">{aiSignal.explanation}</p> : null}
            <div className="button-row">
              <button onClick={registerAgent} disabled={busy === "register" || agentReady} className="secondary">
                {busy === "register" ? <Loader2 className="spin" size={18} /> : <Bot size={18} />}
                {agentReady ? "Agent ready" : "Register agent"}
              </button>
              <button onClick={submitSignal} disabled={busy === "signal"} className="primary">
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
                  <small>{event.isRevision ? "Revision signal" : "Primary signal"} · {shortHash(event.agent)}</small>
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
                    <strong>{shortHash(entry.agent)}</strong>
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
