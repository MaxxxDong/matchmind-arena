const BASE_URL = process.env.AGENT_API_BASE_URL || "http://127.0.0.1:8787";
const API_KEY = process.env.AGENT_API_KEY || "";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${response.status} ${payload.error || response.statusText}`);
  }
  return payload;
}

async function main() {
  const { matches } = await request("/api/matches");
  const match = matches[0];
  const { context } = await request(`/api/matches/${encodeURIComponent(match.matchId)}/context`);
  const signal = await request("/api/signals", {
    method: "POST",
    body: JSON.stringify({
      agentId: "agent_baseline_demo",
      matchId: context.matchId,
      homeBps: context.baselineSignal.homeBps,
      drawBps: context.baselineSignal.drawBps,
      awayBps: context.baselineSignal.awayBps,
      confidenceBps: context.baselineSignal.confidenceBps,
      model: "baseline-context-agent",
      reasoningSummary: `Baseline signal from ${context.title}: ${context.notes.join(" ")}`,
      sourceMix: ["match-context", "baseline-probability"],
      clientTimestamp: new Date().toISOString(),
    }),
  });
  console.log(JSON.stringify({
    selectedMatch: context.matchId,
    commitment: signal.commitment,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
