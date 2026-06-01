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
import { buildSignalCommitment } from "./signals.mjs";

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
const AGENT_API_BASE = "http://127.0.0.1:8787";

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
  const blockNumbers = [...new Set(logs.map((log) => log.blockNumber))];
  const blocks = await Promise.all(blockNumbers.map(async (blockNumber) => publicProvider.getBlock(blockNumber)));
  const timestamps = new Map(blocks.filter(Boolean).map((block) => [block.number, Number(block.timestamp)]));
  return logs.map((log) => ({
    log,
    blockTimestamp: timestamps.get(log.blockNumber) ?? null,
    submittedAt: timestamps.has(log.blockNumber)
      ? new Date(timestamps.get(log.blockNumber) * 1000).toISOString()
      : null,
  }));
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

function storeLocalSignalMetadata(record) {
  try {
    const existing = JSON.parse(globalThis.localStorage?.getItem(SIGNAL_METADATA_KEY) || "[]");
    const next = [record, ...(Array.isArray(existing) ? existing : [])].slice(0, 20);
    globalThis.localStorage?.setItem(SIGNAL_METADATA_KEY, JSON.stringify(next));
  } catch {
    globalThis.localStorage?.setItem(SIGNAL_METADATA_KEY, JSON.stringify([record]));
  }
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
    throw new Error(`Local agent payload is missing: ${missing.join(", ")}.`);
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
    throw new Error("Local agent payload hashes must be bytes32 hex values.");
  }
  if (next.homeBps + next.drawBps + next.awayBps !== 10000) {
    throw new Error("Local agent payload must sum to 10,000 bps.");
  }
  if ([next.matchWindow, next.homeBps, next.drawBps, next.awayBps, next.confidenceBps].some((value) => !Number.isInteger(value) || value < 0 || value > 10000)) {
    throw new Error("Local agent payload numeric fields must be integers from 0 to 10,000.");
  }
  return next;
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
  const [agentPayloadText, setAgentPayloadText] = useState("");
  const [agentCommitment, setAgentCommitment] = useState(null);
  const [agentPayloadError, setAgentPayloadError] = useState("");

  const selectedMatch = useMemo(
    () => MATCHES.find((match) => match.id === selectedId) || MATCHES[0],
    [selectedId],
  );
  const signal = useMemo(() => agentCommitment ?? buildSignal(selectedMatch), [selectedMatch, agentCommitment]);

  useEffect(() => {
    setAgentCommitment(null);
    setAgentPayloadError("");
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
        .map(({ log, blockTimestamp, submittedAt }) => ({
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
          blockTimestamp,
          submittedAt,
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

  function loadLocalAgentPayload() {
    setAgentPayloadError("");
    setStatus("");
    try {
      if (!agentPayloadText.trim()) {
        throw new Error("Paste the JSON returned by npm run agent:example or POST /api/signals.");
      }
      const parsed = JSON.parse(agentPayloadText);
      const commitment = normalizeCommitment(parsed);
      const matched = MATCHES.find((match) => ethers.id(match.id).toLowerCase() === commitment.matchId.toLowerCase());
      if (matched && matched.id !== selectedId) {
        throw new Error(`This payload belongs to ${matched.title}. Select that match card first, then load it again.`);
      }
      setAgentCommitment(commitment);
      storeLocalSignalMetadata({
        matchId: matched?.id ?? selectedMatch.id,
        title: matched?.title ?? selectedMatch.title,
        generatedAt: new Date().toISOString(),
        model: "local-agent",
        signal: {
          homeBps: commitment.homeBps,
          drawBps: commitment.drawBps,
          awayBps: commitment.awayBps,
          confidenceBps: commitment.confidenceBps,
        },
        explanation: "Loaded from local MatchMind Agent API.",
        rawEvidence: parsed,
      });
      setStatus("Local agent signal loaded. Review it, then commit on-chain with your wallet.");
    } catch (error) {
      setAgentPayloadError(error.message);
      setStatus("");
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
              <small>{agentCommitment ? "local agent" : "demo baseline"}</small>
            </div>
            <p>{selectedMatch.bias}</p>
            <div className="agent-box">
              <p className="model-note">
                MatchMind does not collect model keys in the public web app. Run your agent locally,
                let it read the context API, then paste its commit-ready payload here.
              </p>
              <div className="command-card">
                <code>npm run api:agent</code>
                <code>npm run agent:example</code>
                <span>{AGENT_API_BASE}/api/matches</span>
              </div>
              <label>
                <span>Local agent payload</span>
                <textarea
                  value={agentPayloadText}
                  onChange={(event) => setAgentPayloadText(event.target.value)}
                  placeholder="{ &quot;commitment&quot;: { &quot;matchId&quot;: &quot;0x...&quot;, &quot;homeBps&quot;: 4800, ... } }"
                  rows={6}
                />
              </label>
              <button onClick={loadLocalAgentPayload} className="link-button model-action">
                <Bot size={17} />
                Load local agent signal
              </button>
            </div>
            {agentPayloadError ? <p className="error-text">{agentPayloadError}</p> : null}
            <dl className="hash-list">
              <div><dt>Context</dt><dd>{shortHash(signal.contextHash)}</dd></div>
              <div><dt>Evidence</dt><dd>{shortHash(signal.evidenceHash)}</dd></div>
              <div><dt>Confidence</dt><dd>{formatPct(signal.confidenceBps)}</dd></div>
            </dl>
            {agentCommitment ? (
              <p className="ai-explanation">
                Local agent payload loaded. The agent ran outside this website; this page only validates
                the structured commitment and asks your wallet to submit it to Mantle.
              </p>
            ) : (
              <p className="ai-explanation">
                Demo baseline is available for review. For a differentiated agent, run the local API and
                paste a payload generated on your own machine.
              </p>
            )}
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
                  <small>{event.isRevision ? "Revision signal" : "Primary signal"} · {shortHash(event.agent)} · {event.submittedAt ?? "time pending"}</small>
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

function Step({ icon, label, value }) {
  return (
    <div className="step">
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
