import { ethers } from "ethers";
import { MATCHES } from "./data/matches.mjs";
import { DEMO_RESOLUTIONS } from "./data/resolutions.mjs";
import { attachResultSource } from "./resultSources.mjs";

export const RESULT_LABELS = {
  home: "Home",
  draw: "Draw",
  away: "Away",
};

export function matchByHash(matchId, matches = MATCHES) {
  return matches.find((match) => ethers.id(match.id) === matchId);
}

export function outcomeVector(result) {
  if (result === "home") return [1, 0, 0];
  if (result === "draw") return [0, 1, 0];
  if (result === "away") return [0, 0, 1];
  return null;
}

export function scoreSignal(event, resolution) {
  const actual = outcomeVector(resolution?.result);
  if (!actual) return null;
  const predicted = [event.homeBps, event.drawBps, event.awayBps].map((value) => value / 10000);
  const brier = predicted.reduce((total, value, index) => total + (value - actual[index]) ** 2, 0);
  const correctIndex = actual.findIndex(Boolean);
  const logLoss = -Math.log(Math.max(predicted[correctIndex], 0.0001));
  const quality = Math.max(0, Math.round(100 - brier * 55 - logLoss * 12));
  return { brier, logLoss, quality };
}

export function buildLeaderboard(events, matches = MATCHES, resolutions = DEMO_RESOLUTIONS) {
  const byAgent = new Map();
  for (const event of events) {
    const match = matchByHash(event.matchId, matches);
    const resolution = match ? resolutions[match.id] : null;
    const score = scoreSignal(event, resolution);
    if (!score) continue;
    const current = byAgent.get(event.agent) ?? {
      agent: event.agent,
      signals: 0,
      resolved: 0,
      totalQuality: 0,
      totalBrier: 0,
      totalLogLoss: 0,
      latestBlock: 0,
    };
    current.signals += 1;
    current.resolved += 1;
    current.totalQuality += score.quality;
    current.totalBrier += score.brier;
    current.totalLogLoss += score.logLoss;
    current.latestBlock = Math.max(current.latestBlock, event.blockNumber);
    byAgent.set(event.agent, current);
  }
  return [...byAgent.values()]
    .map((entry) => ({
      ...entry,
      quality: Math.round(entry.totalQuality / entry.resolved),
      brier: entry.totalBrier / entry.resolved,
      logLoss: entry.totalLogLoss / entry.resolved,
    }))
    .sort((a, b) => b.quality - a.quality || a.brier - b.brier || b.latestBlock - a.latestBlock);
}

export function buildResolutionEvidence(matches = MATCHES, resolutions = DEMO_RESOLUTIONS) {
  return matches.map((match) => ({
    id: match.id,
    title: match.title,
    resolved: Boolean(resolutions[match.id]),
    resolution: resolutions[match.id] ? attachResultSource(resolutions[match.id]) : null,
  }));
}
