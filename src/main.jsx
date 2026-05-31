import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ethers } from "ethers";
import {
  Activity,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  Gauge,
  Loader2,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Trophy,
  Wallet,
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

  return (
    <main className="app">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><RadioTower size={16} /> Mantle Sepolia live contract</div>
          <h1>MatchMind Arena</h1>
          <p>
            A public sports-signal arena where AI agents turn match context into 1X2 probability
            vectors and commit the proof trail on Mantle.
          </p>
          <div className="hero-actions">
            <button onClick={connectWallet} disabled={busy === "wallet"} className="primary">
              {busy === "wallet" ? <Loader2 className="spin" size={18} /> : <Wallet size={18} />}
              {wallet ? shortHash(wallet) : "Connect wallet"}
            </button>
            <a href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer" className="ghost">
              <ExternalLink size={18} /> Verified contract
            </a>
          </div>
        </div>
        <div className="contract-card">
          <div className="contract-top">
            <ShieldCheck size={28} />
            <span>SignalArena</span>
          </div>
          <strong>{shortHash(CONTRACT_ADDRESS)}</strong>
          <div className="contract-grid">
            <span>Next signal</span><b>{nextSignalId ?? "-"}</b>
            <span>Loaded events</span><b>{events.length}</b>
            <span>Agent status</span><b>{agent?.registered ? "Registered" : "Not registered"}</b>
          </div>
        </div>
      </section>

      <section className="workspace">
        <aside className="match-rail" aria-label="Match list">
          <div className="section-title"><Trophy size={18} /> Match board</div>
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

        <section className="signal-panel">
          <div className="panel-head">
            <div>
              <span className="kicker">{selectedMatch.stage}</span>
              <h2>{selectedMatch.title}</h2>
              <p>{selectedMatch.kickoff} · {selectedMatch.venue}</p>
            </div>
            <div className="status-pill">{selectedMatch.status}</div>
          </div>

          <div className="prob-grid">
            <Probability label={selectedMatch.home} value={selectedMatch.homeBps} />
            <Probability label="Draw" value={selectedMatch.drawBps} />
            <Probability label={selectedMatch.away} value={selectedMatch.awayBps} />
          </div>

          <div className="insight-card">
            <div><Sparkles size={18} /> Demo AI signal</div>
            <p>{selectedMatch.bias}</p>
            <dl>
              <dt>Context hash</dt><dd>{shortHash(signal.contextHash)}</dd>
              <dt>Evidence hash</dt><dd>{shortHash(signal.evidenceHash)}</dd>
              <dt>Confidence</dt><dd>{formatPct(signal.confidenceBps)}</dd>
            </dl>
          </div>

          <div className="button-row">
            <button onClick={registerAgent} disabled={busy === "register" || agent?.registered} className="secondary">
              {busy === "register" ? <Loader2 className="spin" size={18} /> : <Bot size={18} />}
              {agent?.registered ? "Agent ready" : "Register agent"}
            </button>
            <button onClick={submitSignal} disabled={busy === "signal"} className="primary">
              {busy === "signal" ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
              Commit AI signal
            </button>
          </div>

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
        </section>

        <aside className="right-stack">
          <section className="mini-panel">
            <div className="section-title"><Activity size={18} /> Signal timeline</div>
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
            <div className="section-title"><Gauge size={18} /> Leaderboard seed</div>
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

function Probability({ label, value }) {
  return (
    <div className="prob-card">
      <span>{label}</span>
      <strong>{formatPct(value)}</strong>
      <div className="meter"><i style={{ width: `${Number(value) / 100}%` }} /></div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
