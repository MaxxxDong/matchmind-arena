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
  const [topOutcome] = predictedOutcome(event);
  const hit = topOutcome === resolution.result;
  const oneX2Points = Math.round((hit ? 10 : 0) + predicted[correctIndex] * 20 + quality * 0.35);
  const exactScore = scoreExactScore(event, resolution);
  const marketDimensions = scoreMarketDimensions(event, resolution);
  const points = oneX2Points + exactScore.points + marketDimensions.points;
  return {
    brier,
    logLoss,
    quality,
    hit,
    exactScoreHit: exactScore.hit,
    points,
    pointsBreakdown: {
      oneX2: oneX2Points,
      exactScore: exactScore.points,
      marketDimensions: marketDimensions.points,
    },
  };
}

function predictedOutcome(event) {
  const entries = [
    ["home", event.homeBps],
    ["draw", event.drawBps],
    ["away", event.awayBps],
  ];
  return entries.sort((a, b) => b[1] - a[1])[0];
}

function normalizeOutcomeEntries(value) {
  if (Array.isArray(value)) {
    return value.map((item) => ({
      outcome: String(item.outcome ?? item.score ?? item.label ?? ""),
      bps: Number(item.bps ?? item.probabilityBps ?? item.value ?? 0),
    })).filter((item) => item.outcome && Number.isFinite(item.bps));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).map(([outcome, bps]) => ({
      outcome,
      bps: Number(bps),
    })).filter((item) => Number.isFinite(item.bps));
  }
  return [];
}

function marketPredictionsFrom(event) {
  return event?.rawEvidence?.marketPredictions || event?.rawEvidence?.signals?.marketPredictions || {};
}

function entriesForDimension(row, match, dimension) {
  if (dimension.id === "match_winner_1x2") {
    const signal = row.signal || row;
    return [
      { outcome: match.home, bps: Number(signal.homeBps || 0) },
      { outcome: "Draw", bps: Number(signal.drawBps || 0) },
      { outcome: match.away, bps: Number(signal.awayBps || 0) },
    ];
  }
  return normalizeOutcomeEntries(marketPredictionsFrom(row)[dimension.id]);
}

function scoreExactScore(event, resolution) {
  if (!resolution?.exactScore) return { hit: false, points: 0 };
  const entries = normalizeOutcomeEntries(marketPredictionsFrom(event).exact_score)
    .sort((a, b) => b.bps - a.bps);
  const match = entries.find((entry) => entry.outcome === resolution.exactScore);
  if (!match) return { hit: false, points: 0 };
  const topHit = entries[0]?.outcome === resolution.exactScore;
  return {
    hit: topHit,
    points: Math.round((topHit ? 20 : 8) + match.bps / 500),
  };
}

function scoreMarketDimensions(event, resolution) {
  const outcomes = resolution?.marketOutcomes || {};
  let points = 0;
  let hits = 0;
  for (const [dimensionId, actualOutcome] of Object.entries(outcomes)) {
    const entries = normalizeOutcomeEntries(marketPredictionsFrom(event)[dimensionId])
      .sort((a, b) => b.bps - a.bps);
    const match = entries.find((entry) => entry.outcome === actualOutcome);
    if (!match) continue;
    const topHit = entries[0]?.outcome === actualOutcome;
    if (topHit) hits += 1;
    points += Math.round((topHit ? 8 : 3) + match.bps / 1000);
  }
  return { hits, points };
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
    const [predictedResult, predictedBps] = predictedOutcome(event);
    return {
      signalId: event.signalId,
      agent: event.agent,
      agentIdHash: event.agentIdHash ?? null,
      matchId: event.matchId,
      matchKey: match?.id ?? null,
      submittedAt: event.submittedAt ?? null,
      eligibility,
      actualResult: resolution?.result ?? null,
      predictedResult,
      predictedBps,
      probabilities: {
        homeBps: event.homeBps,
        drawBps: event.drawBps,
        awayBps: event.awayBps,
        confidenceBps: event.confidenceBps,
      },
      scored: Boolean(score),
      score,
    };
  });
}

export function buildCalibrationSummary(scoringAudit) {
  const scored = scoringAudit.filter((entry) => entry.scored && entry.score);
  const empty = {
    scoredSignals: 0,
    predictionHitRate: null,
    averageQuality: null,
    averageBrier: null,
    averageLogLoss: null,
    confidenceBins: [],
  };
  if (scored.length === 0) return empty;

  const totals = scored.reduce((current, entry) => ({
    hits: current.hits + (entry.predictedResult === entry.actualResult ? 1 : 0),
    quality: current.quality + entry.score.quality,
    brier: current.brier + entry.score.brier,
    logLoss: current.logLoss + entry.score.logLoss,
  }), { hits: 0, quality: 0, brier: 0, logLoss: 0 });

  const bins = [
    { label: "0-50%", min: 0, max: 5000 },
    { label: "50-70%", min: 5000, max: 7000 },
    { label: "70-85%", min: 7000, max: 8500 },
    { label: "85-100%", min: 8500, max: 10001 },
  ].map((bin) => {
    const entries = scored.filter((entry) => entry.predictedBps >= bin.min && entry.predictedBps < bin.max);
    const hits = entries.filter((entry) => entry.predictedResult === entry.actualResult).length;
    const averagePredictedBps = entries.length
      ? Math.round(entries.reduce((total, entry) => total + entry.predictedBps, 0) / entries.length)
      : null;
    return {
      label: bin.label,
      count: entries.length,
      averagePredictedBps,
      hitRate: entries.length ? hits / entries.length : null,
    };
  });

  return {
    scoredSignals: scored.length,
    predictionHitRate: totals.hits / scored.length,
    averageQuality: Math.round(totals.quality / scored.length),
    averageBrier: totals.brier / scored.length,
    averageLogLoss: totals.logLoss / scored.length,
    confidenceBins: bins,
  };
}

export function buildLeaderboard(events, matches = MATCHES, resolutions = DEMO_RESOLUTIONS) {
  const byAgent = new Map();
  for (const audit of buildScoringAudit(events, matches, resolutions)) {
    if (!audit.score) continue;
    const event = events.find((candidate) => candidate.signalId === audit.signalId && candidate.agent === audit.agent);
    const score = audit.score;
    const agentKey = event.agentIdHash || event.agent;
    const current = byAgent.get(agentKey) ?? {
      agent: agentKey,
      wallet: event.agent,
      agentIdHash: event.agentIdHash ?? null,
      signals: 0,
      resolved: 0,
      totalQuality: 0,
      totalBrier: 0,
      totalLogLoss: 0,
      totalPoints: 0,
      hits: 0,
      exactScoreHits: 0,
      oneX2Points: 0,
      exactScorePoints: 0,
      marketDimensionPoints: 0,
      latestBlock: 0,
    };
    current.signals += 1;
    current.resolved += 1;
    current.totalQuality += score.quality;
    current.totalBrier += score.brier;
    current.totalLogLoss += score.logLoss;
    current.totalPoints += score.points;
    current.hits += score.hit ? 1 : 0;
    current.exactScoreHits += score.exactScoreHit ? 1 : 0;
    current.oneX2Points += score.pointsBreakdown.oneX2;
    current.exactScorePoints += score.pointsBreakdown.exactScore;
    current.marketDimensionPoints += score.pointsBreakdown.marketDimensions;
    current.latestBlock = Math.max(current.latestBlock, event.blockNumber);
    byAgent.set(agentKey, current);
  }
  return [...byAgent.values()]
    .map((entry) => ({
      ...entry,
      quality: Math.round(entry.totalQuality / entry.resolved),
      points: entry.totalPoints,
      hitRate: entry.hits / entry.resolved,
      brier: entry.totalBrier / entry.resolved,
      logLoss: entry.totalLogLoss / entry.resolved,
    }))
    .sort((a, b) => b.points - a.points || b.quality - a.quality || a.brier - b.brier || b.latestBlock - a.latestBlock);
}

export function buildPredictionConsensus(rows = [], match = {}, dimensionId = "match_winner_1x2") {
  const dimension = (match.marketDimensions || []).find((item) => item.id === dimensionId)
    || { id: dimensionId, label: dimensionId };
  const byOutcome = new Map((dimension.outcomes || []).map((outcome, index) => [outcome, {
    outcome,
    outcomeIndex: index,
    topAgentCount: 0,
    agentCount: 0,
    assignmentCount: 0,
    totalBps: 0,
    topAgents: [],
    agents: [],
    assignments: [],
  }]));
  let totalAgents = 0;
  for (const row of rows) {
    const entries = entriesForDimension(row, match, dimension);
    if (entries.length === 0) continue;
    totalAgents += 1;
    const sortedEntries = [...entries].sort((a, b) => b.bps - a.bps);
    const top = sortedEntries[0];
    for (const entry of entries) {
      if (!byOutcome.has(entry.outcome)) {
        byOutcome.set(entry.outcome, {
          outcome: entry.outcome,
          outcomeIndex: byOutcome.size,
          topAgentCount: 0,
          agentCount: 0,
          assignmentCount: 0,
          totalBps: 0,
          topAgents: [],
          agents: [],
          assignments: [],
        });
      }
      const current = byOutcome.get(entry.outcome);
      current.assignmentCount += 1;
      current.totalBps += entry.bps;
      current.assignments.push({ row, bps: entry.bps });
      if (entry.outcome === top.outcome) {
        current.topAgentCount += 1;
        current.agentCount += 1;
        current.topAgents.push(row);
        current.agents.push(row);
      }
    }
  }
  const groups = [...byOutcome.values()]
    .map((group) => ({
      ...group,
      averageBps: totalAgents ? Math.round(group.totalBps / totalAgents) : 0,
      supportScore: group.totalBps,
      probabilityBuckets: [...(group.topAgents.length ? group.assignments.filter((assignment) => (
        group.topAgents.some((agent) => agent.key === assignment.row.key)
      )) : group.assignments).reduce((buckets, assignment) => {
        const current = buckets.get(assignment.bps) || { bps: assignment.bps, agentCount: 0, agents: [] };
        current.agentCount += 1;
        current.agents.push(assignment.row);
        buckets.set(assignment.bps, current);
        return buckets;
      }, new Map()).values()].sort((a, b) => b.agentCount - a.agentCount || b.bps - a.bps),
    }))
    .sort((a, b) => b.topAgentCount - a.topAgentCount || b.supportScore - a.supportScore || a.outcomeIndex - b.outcomeIndex);
  return { dimension, totalAgents, groups };
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
