const { expect } = require("chai");
const fs = require("node:fs");

describe("Agent signal onboarding helpers", function () {
  it("builds a no-wallet checklist for a complete agent signal", async function () {
    const { buildAgentSignalChecklist } = await import("../src/agentSignal.mjs");
    const { MATCHES } = await import("../src/data/matches.mjs");
    const match = MATCHES[0];
    const signal = {
      matchId: match.id,
      agentId: "agent_schema_probe",
      homeBps: 4300,
      drawBps: 3000,
      awayBps: 2700,
      confidenceBps: 5200,
      methodSummary: "Independent replay model using public context only.",
      reasoningSummary: "Argentina leads narrowly, but France keeps first-goal pressure high.",
      sourceMix: ["agent-context-json"],
      marketPredictions: {
        match_winner_1x2: { Argentina: 4300, Draw: 3000, France: 2700 },
        exact_score: [
          { outcome: "1-1", bps: 1800 },
          { outcome: "2-1", bps: 1600 },
          { outcome: "other", bps: 6600 },
        ],
        first_goal: { Argentina: 4500, "No goal": 600, France: 4900 },
        both_teams_to_score: { Yes: 6400, No: 3600 },
        total_goals_2_5: { Over: 5600, Under: 4400 },
      },
    };

    const checklist = buildAgentSignalChecklist(signal, match);

    expect(checklist.ok).to.equal(true);
    expect(checklist.summary).to.equal("Ready for wallet confirmation.");
    expect(checklist.items.map((item) => item.id)).to.include.members([
      "agent-id",
      "match",
      "vector-sum",
      "market-dimensions",
      "source-method",
    ]);
    expect(checklist.items.every((item) => item.status === "ok")).to.equal(true);
  });

  it("reports missing selected-match market dimensions before wallet confirmation", async function () {
    const { buildAgentSignalChecklist } = await import("../src/agentSignal.mjs");
    const { MATCHES } = await import("../src/data/matches.mjs");
    const match = MATCHES[0];

    const checklist = buildAgentSignalChecklist({
      matchId: match.id,
      agentId: "agent_schema_probe",
      homeBps: 4300,
      drawBps: 3000,
      awayBps: 2700,
      confidenceBps: 5200,
      methodSummary: "Independent replay model.",
      reasoningSummary: "Short reason.",
      sourceMix: ["agent-context-json"],
      marketPredictions: {
        match_winner_1x2: { Argentina: 4300, Draw: 3000, France: 2700 },
      },
    }, match);

    expect(checklist.ok).to.equal(false);
    expect(checklist.items.find((item) => item.id === "market-dimensions")).to.deep.include({
      status: "error",
    });
    expect(checklist.items.find((item) => item.id === "market-dimensions").detail)
      .to.include("exact_score");
  });

  it("publishes an agent signal JSON schema with canonical marketPredictions", function () {
    const schema = JSON.parse(fs.readFileSync("public/agent-signal.schema.json", "utf8"));

    expect(schema.$id).to.equal("https://matchmind-arena.vercel.app/agent-signal.schema.json");
    expect(schema.required).to.include.members([
      "matchId",
      "agentId",
      "homeBps",
      "drawBps",
      "awayBps",
      "confidenceBps",
      "methodSummary",
      "reasoningSummary",
      "sourceMix",
      "marketPredictions",
    ]);
    expect(schema.properties.marketPredictions.description).to.include("canonical");
  });
});
