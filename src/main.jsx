import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ethers } from "ethers";
import {
  Activity,
  BadgeCheck,
  Bot,
  BrainCircuit,
  CheckCircle2,
  CircleDollarSign,
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

const MATCHES = [
  {
    id: "demo-replay:argentina-france-2022",
    title: "Argentina vs France",
    subtitle: "World Cup final replay",
    stage: "Demo replay",
    kickoff: "Replay window",
    venue: "Lusail signal pack",
    status: "AI benchmark ready",
    bias: "Volatile late-game momentum",
    window: 4,
    home: "Argentina",
    away: "France",
    homeBps: 4800,
    drawBps: 2700,
    awayBps: 2500,
    confidenceBps: 6800,
  },
  {
    id: "qualifier:spain-turkey-highlights",
    title: "Spain vs Turkey",
    subtitle: "Qualifier highlight packet",
    stage: "Signal rehearsal",
    kickoff: "Sample clip",
    venue: "Video evidence pack",
    status: "Replay context only",
    bias: "Possession and transition pressure",
    window: 1,
    home: "Spain",
    away: "Turkey",
    homeBps: 6200,
    drawBps: 2100,
    awayBps: 1700,
    confidenceBps: 6400,
  },
  {
    id: "worldcup-2026:mexico-south-africa",
    title: "Mexico vs South Africa",
    subtitle: "2026 group-stage watch card",
    stage: "Pre-match sample",
    kickoff: "2026-06-11 19:00 UTC",
    venue: "Mexico City",
    status: "Schedule context",
    bias: "Home edge plus market signal",
    window: 0,
    home: "Mexico",
    away: "South Africa",
    homeBps: 6650,
    drawBps: 2250,
    awayBps: 1100,
    confidenceBps: 6100,
  },
];

const publicProvider = new ethers.JsonRpcProvider(MANTLE_SEPOLIA.rpcUrls[0]);
const readArena = new ethers.Contract(CONTRACT_ADDRESS, ARENA_ABI, publicProvider);

function shortHash(value) {
  if (!value) return "-";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatPct(bps) {
  return `${(Number(bps) / 100).toFixed(1)}%`;
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

function buildSignal(match) {
  const context = {
    matchId: match.id,
    title: match.title,
    source: "MatchMind demo context pack",
    notes: [match.bias, match.status, match.venue],
  };
  const metadata = {
    app: "MatchMind Arena",
    model: "demo-sports-signal-agent",
    explanation:
      "Demo signal generated from match context, replay evidence labels, and tactical momentum notes.",
    probabilities: {
      home: match.homeBps,
      draw: match.drawBps,
      away: match.awayBps,
    },
    confidenceBps: match.confidenceBps,
  };
  return {
    matchId: ethers.id(match.id),
    contextHash: ethers.id(stableJson(context)),
    matchWindow: match.window,
    homeBps: match.homeBps,
    drawBps: match.drawBps,
    awayBps: match.awayBps,
    confidenceBps: match.confidenceBps,
    evidenceHash: ethers.id(`evidence:${match.id}:browser-demo`),
    metadataHash: ethers.id(stableJson(metadata)),
    metadataUri: `https://matchmind-arena.local/signals/${encodeURIComponent(match.id)}`,
  };
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

  const selectedMatch = useMemo(
    () => MATCHES.find((match) => match.id === selectedId) || MATCHES[0],
    [selectedId],
  );
  const signal = useMemo(() => buildSignal(selectedMatch), [selectedMatch]);

  const refreshArena = useCallback(async (address = wallet) => {
    const [next, logs] = await Promise.all([
      readArena.nextSignalId(),
      readArena.queryFilter(readArena.filters.SignalSubmitted(), DEPLOY_BLOCK, "latest"),
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

  const selectedEvents = events.filter((event) => event.matchId === signal.matchId);
  const agentReady = Boolean(agent?.registered);

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
              <small>{agentReady ? "agent ready" : "registration required"}</small>
            </div>
            <p>{selectedMatch.bias}</p>
            <dl className="hash-list">
              <div><dt>Context</dt><dd>{shortHash(signal.contextHash)}</dd></div>
              <div><dt>Evidence</dt><dd>{shortHash(signal.evidenceHash)}</dd></div>
              <div><dt>Confidence</dt><dd>{formatPct(signal.confidenceBps)}</dd></div>
            </dl>
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
              <span><Gauge size={18} /> Leaderboard seed</span>
              <small>live proof</small>
            </div>
            <div className="leader-row">
              <span><Bot size={16} /> Browser demo agent</span>
              <b>{events.length} signal{events.length === 1 ? "" : "s"}</b>
            </div>
            <div className="leader-row">
              <span><CircleDollarSign size={16} /> Mantle proof</span>
              <b>Verified</b>
            </div>
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
