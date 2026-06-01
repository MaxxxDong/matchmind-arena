import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ethers } from "ethers";
import { MATCHES } from "../src/data/matches.mjs";
import { DEMO_RESOLUTIONS } from "../src/data/resolutions.mjs";
import { buildLeaderboard } from "../src/scoring.mjs";

const CONTRACT_ADDRESS = "0x5929c4cC5DfEdaA8Cb8Df6e9d3aa27EF44CBceD4";
const DEPLOY_BLOCK = 39344371;
const LOG_CHUNK_SIZE = 9000;
const RPC_URL = process.env.MANTLE_SEPOLIA_RPC_URL || "https://rpc.sepolia.mantle.xyz";
const OUT_PATH = process.env.LEADERBOARD_SNAPSHOT_PATH ||
  path.resolve("snapshots", "leaderboard.mantle-sepolia.json");

const ARENA_ABI = [
  "event SignalSubmitted(uint256 indexed signalId, address indexed agent, bytes32 indexed matchId, uint8 matchWindow, uint16 homeBps, uint16 drawBps, uint16 awayBps, uint16 confidenceBps, bytes32 contextHash, bytes32 evidenceHash, bytes32 metadataHash, string metadataUri, bool isRevision)",
];

async function querySignalEvents(provider, arena) {
  const latest = await provider.getBlockNumber();
  const filter = arena.filters.SignalSubmitted();
  const logs = [];
  for (let fromBlock = DEPLOY_BLOCK; fromBlock <= latest; fromBlock += LOG_CHUNK_SIZE + 1) {
    const toBlock = Math.min(fromBlock + LOG_CHUNK_SIZE, latest);
    logs.push(...await arena.queryFilter(filter, fromBlock, toBlock));
  }
  return { latest, logs };
}

function toSignalEvent(log) {
  return {
    signalId: Number(log.args.signalId),
    agent: log.args.agent,
    matchId: log.args.matchId,
    matchWindow: Number(log.args.matchWindow),
    homeBps: Number(log.args.homeBps),
    drawBps: Number(log.args.drawBps),
    awayBps: Number(log.args.awayBps),
    confidenceBps: Number(log.args.confidenceBps),
    contextHash: log.args.contextHash,
    evidenceHash: log.args.evidenceHash,
    metadataHash: log.args.metadataHash,
    metadataUri: log.args.metadataUri,
    isRevision: log.args.isRevision,
    txHash: log.transactionHash,
    blockNumber: log.blockNumber,
  };
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const arena = new ethers.Contract(CONTRACT_ADDRESS, ARENA_ABI, provider);
  const { latest, logs } = await querySignalEvents(provider, arena);
  const events = logs.map(toSignalEvent);
  const leaderboard = buildLeaderboard(events, MATCHES, DEMO_RESOLUTIONS);
  const resolvedSignalCount = leaderboard.reduce((total, entry) => total + entry.resolved, 0);
  const snapshot = {
    generatedAt: new Date().toISOString(),
    network: "mantle-sepolia",
    contractAddress: CONTRACT_ADDRESS,
    deployBlock: DEPLOY_BLOCK,
    latestBlock: latest,
    eventCount: events.length,
    resolvedSignalCount,
    matches: MATCHES.map((match) => ({
      id: match.id,
      title: match.title,
      resolved: Boolean(DEMO_RESOLUTIONS[match.id]),
      resolution: DEMO_RESOLUTIONS[match.id] || null,
    })),
    leaderboard,
    events,
  };

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`Loaded ${events.length} signal event(s), ${resolvedSignalCount} scored signal(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
