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

export function buildAgentSignalChecklist(candidate = {}, selectedMatch = {}) {
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

  items.push(matchId === selectedMatch.id
    ? checklistItem("match", "Selected match", "ok", `${selectedMatch.title || selectedMatch.id} selected.`)
    : checklistItem("match", "Selected match", "error", `Signal matchId is ${matchId || "missing"}, expected ${selectedMatch.id}.`));

  const vectorValues = [candidate.homeBps, candidate.drawBps, candidate.awayBps, candidate.confidenceBps];
  const vectorNumbers = vectorValues.map(Number);
  const vectorValid = vectorValues.every(isIntegerBps);
  const vectorSum = vectorNumbers[0] + vectorNumbers[1] + vectorNumbers[2];
  items.push(vectorValid && vectorSum === 10000
    ? checklistItem("vector-sum", "1X2 vector", "ok", `${selectedMatch.home} ${vectorNumbers[0]} + draw ${vectorNumbers[1]} + ${selectedMatch.away} ${vectorNumbers[2]} = 10000.`)
    : checklistItem("vector-sum", "1X2 vector", "error", "homeBps, drawBps, awayBps, and confidenceBps must be integers from 0 to 10000; 1X2 must sum to 10000."));

  const missing = [];
  const invalid = [];
  if (!predictions || typeof predictions !== "object" || Array.isArray(predictions)) {
    missing.push(...(selectedMatch.marketDimensions || []).map((dimension) => dimension.id));
  } else {
    for (const dimension of selectedMatch.marketDimensions || []) {
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
    ? checklistItem("market-dimensions", "Market dimensions", "ok", `Covers ${(selectedMatch.marketDimensions || []).length} selected-match dimensions.`)
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
