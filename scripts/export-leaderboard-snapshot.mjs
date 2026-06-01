import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ethers } from "ethers";
import { MATCHES } from "../src/data/matches.mjs";
import { DEMO_RESOLUTIONS } from "../src/data/resolutions.mjs";
import { buildLeaderboard, buildResolutionEvidence, buildScoringAudit } from "../src/scoring.mjs";

const CONTRACT_ADDRESS = "0x5929c4cC5DfEdaA8Cb8Df6e9d3aa27EF44CBceD4";
const DEPLOY_BLOCK = 39344371;
const LOG_CHUNK_SIZE = 9000;
const RPC_URL = process.env.MANTLE_SEPOLIA_RPC_URL || "https://rpc.sepolia.mantle.xyz";
const OUT_PATH = process.env.LEADERBOARD_SNAPSHOT_PATH ||
  path.resolve("snapshots", "leaderboard.mantle-sepolia.json");
const RESULT_SNAPSHOT_PATH = process.env.RESULT_SNAPSHOT_PATH ||
  path.resolve("snapshots", "resolutions.mantle-sepolia.json");

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

async function hydrateBlockTimestamps(provider, logs) {
  const blockNumbers = [...new Set(logs.map((log) => log.blockNumber))];
  const blocks = await Promise.all(blockNumbers.map(async (blockNumber) => provider.getBlock(blockNumber)));
  const timestamps = new Map(blocks.filter(Boolean).map((block) => [block.number, Number(block.timestamp)]));
  return logs.map((log) => toSignalEvent(log, timestamps.get(log.blockNumber)));
}

async function loadResolutions() {
  try {
    const raw = await readFile(RESULT_SNAPSHOT_PATH, "utf8");
    const snapshot = JSON.parse(raw);
    if (snapshot?.resolutions && typeof snapshot.resolutions === "object") {
      return {
        resolutions: snapshot.resolutions,
        source: {
          path: path.relative(process.cwd(), RESULT_SNAPSHOT_PATH).replaceAll("\\", "/"),
          generatedAt: snapshot.generatedAt,
          resolver: snapshot.resolver,
        },
      };
    }
  } catch {
    // Fall through to static demo fixtures when no resolver output exists.
  }
  return {
    resolutions: DEMO_RESOLUTIONS,
    source: {
      path: null,
      generatedAt: null,
      resolver: "static-demo-fixtures",
    },
  };
}

function toSignalEvent(log, blockTimestamp) {
  const submittedAt = blockTimestamp ? new Date(blockTimestamp * 1000).toISOString() : null;
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
    blockTimestamp: blockTimestamp ?? null,
    submittedAt,
  };
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const arena = new ethers.Contract(CONTRACT_ADDRESS, ARENA_ABI, provider);
  const { latest, logs } = await querySignalEvents(provider, arena);
  const events = await hydrateBlockTimestamps(provider, logs);
  const { resolutions, source: resolutionSource } = await loadResolutions();
  const leaderboard = buildLeaderboard(events, MATCHES, resolutions);
  const resolvedSignalCount = leaderboard.reduce((total, entry) => total + entry.resolved, 0);
  const scoringAudit = buildScoringAudit(events, MATCHES, resolutions);
  const snapshot = {
    generatedAt: new Date().toISOString(),
    network: "mantle-sepolia",
    contractAddress: CONTRACT_ADDRESS,
    deployBlock: DEPLOY_BLOCK,
    latestBlock: latest,
    eventCount: events.length,
    resolvedSignalCount,
    resolutionSource,
    matches: buildResolutionEvidence(MATCHES, resolutions),
    scoringAudit,
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
