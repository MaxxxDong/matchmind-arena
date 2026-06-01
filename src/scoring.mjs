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

export function evaluateSignalEligibility(event, match) {
  if (!match) {
    return { eligible: false, reason: "unknown-match" };
  }
  if (match.scoringMode === "demo-replay") {
    return { eligible: true, reason: "demo-replay-window" };
  }
  if (!match.signalClosesAt) {
    return { eligible: true, reason: "no-close-window-configured" };
  }
  if (!event.submittedAt) {
    return { eligible: false, reason: "missing-submission-timestamp" };
  }
  const submittedAt = Date.parse(event.submittedAt);
  const closesAt = Date.parse(match.signalClosesAt);
  if (!Number.isFinite(submittedAt) || !Number.isFinite(closesAt)) {
    return { eligible: false, reason: "invalid-window-timestamp" };
  }
  if (submittedAt > closesAt) {
    return { eligible: false, reason: "late-signal", closesAt: match.signalClosesAt };
  }
  return { eligible: true, reason: "inside-signal-window", closesAt: match.signalClosesAt };
}

export function buildScoringAudit(events, matches = MATCHES, resolutions = DEMO_RESOLUTIONS) {
  return events.map((event) => {
    const match = matchByHash(event.matchId, matches);
    const resolution = match ? resolutions[match.id] : null;
    const eligibility = evaluateSignalEligibility(event, match);
    const score = eligibility.eligible ? scoreSignal(event, resolution) : null;
    return {
      signalId: event.signalId,
      agent: event.agent,
      matchId: event.matchId,
      matchKey: match?.id ?? null,
      submittedAt: event.submittedAt ?? null,
      eligibility,
      scored: Boolean(score),
      score,
    };
  });
}

export function buildLeaderboard(events, matches = MATCHES, resolutions = DEMO_RESOLUTIONS) {
  const byAgent = new Map();
  for (const audit of buildScoringAudit(events, matches, resolutions)) {
    if (!audit.score) continue;
    const event = events.find((candidate) => candidate.signalId === audit.signalId && candidate.agent === audit.agent);
    const score = audit.score;
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
    scoringMode: match.scoringMode,
    signalClosesAt: match.signalClosesAt ?? null,
    signalWindow: match.signalWindow,
    resolved: Boolean(resolutions[match.id]),
    resolution: resolutions[match.id] ? attachResultSource(resolutions[match.id]) : null,
  }));
}
