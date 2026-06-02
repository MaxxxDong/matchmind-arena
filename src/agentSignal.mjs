function isIntegerBps(value) {
  return Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 10000;
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

function checklistItem(id, label, status, detail) {
  return { id, label, status, detail };
}

function formatBps(value) {
  return `${(Number(value || 0) / 100).toFixed(1)}%`;
}

export function inferAgentSignalMatch(candidate = {}, matches = [], fallbackMatch = {}) {
  const matchId = candidate.matchId || candidate.selectedMatch || candidate.match?.id;
  return matches.find((match) => match.id === matchId) || fallbackMatch;
}

export function buildAgentSignalChecklist(candidate = {}, targetMatch = {}) {
  const items = [];
  const profile = candidate.agentProfile || candidate.profile || {};
  const agentId = candidate.agentId || profile.agentId;
  const matchId = candidate.matchId || candidate.selectedMatch || candidate.match?.id;
  const method = String(candidate.methodSummary || candidate.method || candidate.strategy || "").trim();
  const reason = String(candidate.reasoningSummary || candidate.summary || candidate.explanation || "").trim();
  const sourceMix = candidate.sourceMix || candidate.evidence || [];
  const predictions = candidate.marketPredictions || candidate.signals?.marketPredictions;

  items.push(agentId
    ? checklistItem("agent-id", "Agent ID", "ok", `${agentId} will be hashed into the on-chain identity.`)
    : checklistItem("agent-id", "Agent ID", "error", "Missing a stable agentId."));

  items.push(matchId === targetMatch.id
    ? checklistItem("match", "Signal match", "ok", `${targetMatch.title || targetMatch.id} targeted.`)
    : checklistItem("match", "Signal match", "error", `Signal matchId is ${matchId || "missing"}, expected ${targetMatch.id}.`));

  const vectorValues = [candidate.homeBps, candidate.drawBps, candidate.awayBps, candidate.confidenceBps];
  const vectorNumbers = vectorValues.map(Number);
  const vectorValid = vectorValues.every(isIntegerBps);
  const vectorSum = vectorNumbers[0] + vectorNumbers[1] + vectorNumbers[2];
  items.push(vectorValid && vectorSum === 10000
    ? checklistItem("vector-sum", "1X2 vector", "ok", `${targetMatch.home} ${vectorNumbers[0]} + draw ${vectorNumbers[1]} + ${targetMatch.away} ${vectorNumbers[2]} = 10000.`)
    : checklistItem("vector-sum", "1X2 vector", "error", "homeBps, drawBps, awayBps, and confidenceBps must be integers from 0 to 10000; 1X2 must sum to 10000."));

  const missing = [];
  const invalid = [];
  if (!predictions || typeof predictions !== "object" || Array.isArray(predictions)) {
    missing.push(...(targetMatch.marketDimensions || []).map((dimension) => dimension.id));
  } else {
    for (const dimension of targetMatch.marketDimensions || []) {
      const value = predictions[dimension.id];
      if (value === undefined || value === null) {
        missing.push(dimension.id);
        continue;
      }
      const entries = normalizeOutcomeEntries(value);
      if (entries.length === 0) {
        invalid.push(`${dimension.id}: no outcomes`);
        continue;
      }
      if (dimension.format === "basis_points_sum_10000") {
        const total = entries.reduce((sum, item) => sum + item.bps, 0);
        if (total !== 10000) invalid.push(`${dimension.id}: sums to ${total}`);
      }
    }
  }
  const dimensionProblems = [...missing.map((id) => `${id}: missing`), ...invalid];
  items.push(dimensionProblems.length === 0
    ? checklistItem("market-dimensions", "Market dimensions", "ok", `Covers ${(targetMatch.marketDimensions || []).length} selected-match dimensions.`)
    : checklistItem("market-dimensions", "Market dimensions", "error", dimensionProblems.join("; ")));

  const sourceMethodOk = Array.isArray(sourceMix) && sourceMix.length > 0 && Boolean(method || reason);
  items.push(sourceMethodOk
    ? checklistItem("source-method", "Sources and method", "ok", `${sourceMix.length} source(s) declared; method/reason provided.`)
    : checklistItem("source-method", "Sources and method", "error", "sourceMix must be non-empty and methodSummary or reasoningSummary must be present."));

  const ok = items.every((item) => item.status === "ok");
  return {
    ok,
    summary: ok ? "Ready for wallet confirmation." : "Fix the highlighted items before wallet confirmation.",
    items,
  };
}

export function findAgentSignalRow(leaderboardEntry = {}, events = []) {
  const candidates = new Set([
    leaderboardEntry.agent,
    leaderboardEntry.agentIdHash,
    leaderboardEntry.wallet,
  ].filter(Boolean).map((value) => String(value).toLowerCase()));

  return events
    .filter((event) => (
      candidates.has(String(event.agent).toLowerCase())
      || candidates.has(String(event.agentIdHash || "").toLowerCase())
    ))
    .sort((a, b) => Number(b.blockNumber || 0) - Number(a.blockNumber || 0))[0] || null;
}

export function buildAgentSignalPreview(candidate = {}, targetMatch = {}) {
  const profile = candidate.agentProfile || candidate.profile || {};
  const agentId = candidate.agentId || profile.agentId || "unidentified-agent";
  const agentName = candidate.agentName || profile.name || agentId;
  const predictions = candidate.marketPredictions || candidate.signals?.marketPredictions || {};
  const dimensions = targetMatch.marketDimensions || [];
  const marketLines = dimensions
    .filter((dimension) => predictions[dimension.id] !== undefined)
    .slice(0, 5)
    .map((dimension) => {
      const entries = normalizeOutcomeEntries(predictions[dimension.id])
        .sort((a, b) => b.bps - a.bps)
        .slice(0, 3);
      const text = entries.map((entry) => `${entry.outcome} ${formatBps(entry.bps)}`).join(" · ");
      return `${dimension.label}: ${text || "not published"}`;
    });

  return {
    agentId,
    agentName,
    matchTitle: targetMatch.title || targetMatch.id || "Unknown match",
    vectorText: `${targetMatch.home} ${formatBps(candidate.homeBps)} / Draw ${formatBps(candidate.drawBps)} / ${targetMatch.away} ${formatBps(candidate.awayBps)}`,
    confidenceText: formatBps(candidate.confidenceBps),
    marketLines,
    method: candidate.methodSummary || candidate.method || candidate.strategy || "",
  };
}

export function friendlyAgentError(error) {
  const message = String(error?.shortMessage || error?.message || error || "");
  const lowered = message.toLowerCase();
  if (
    error?.code === 4001
    || lowered.includes("user rejected")
    || lowered.includes("user denied")
    || lowered.includes("ethers-user-denied")
    || lowered.includes("action_rejected")
  ) {
    return "Wallet request cancelled. No transaction was submitted.";
  }
  if (lowered.includes("rate limit")) {
    return "Mantle RPC is rate-limiting live event reads. Showing cached snapshot and any just-submitted wallet receipts; try Refresh later.";
  }
  if (message.includes("could not coalesce error")) {
    return "Mantle RPC returned a low-level provider error. The app will keep cached data visible and retry on refresh.";
  }
  return message;
}

export function duplicateSignalMessage(isDuplicate) {
  return isDuplicate
    ? "This agent already submitted a primary signal for this match window. Select another match or use a different agent ID; revisions are disabled in this Arena flow to prevent accidental duplicate uploads."
    : "";
}
