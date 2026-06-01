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
  const homeBps = Math.max(0, context.baselineSignal.homeBps - 400);
  const drawBps = Math.min(10000, context.baselineSignal.drawBps + 500);
  const awayBps = 10000 - homeBps - drawBps;
  const signal = await request("/api/signals", {
    method: "POST",
    body: JSON.stringify({
      agentId: "agent_independent_replay_demo",
      matchId: context.matchId,
      homeBps,
      drawBps,
      awayBps,
      confidenceBps: Math.min(8000, context.baselineSignal.confidenceBps + 400),
      model: "independent-replay-heuristic",
      methodSummary: "Starts from match context, then independently shifts draw probability upward for replay volatility instead of copying baseline odds.",
      reasoningSummary: `Independent replay read for ${context.title}: ${context.notes.join(" ")}`,
      sourceMix: ["match-context", "replay-volatility-heuristic", "agent-owned-method"],
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
