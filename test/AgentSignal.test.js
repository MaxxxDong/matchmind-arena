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

  it("infers the target match from pasted signal JSON before import", async function () {
    const { inferAgentSignalMatch, buildAgentSignalChecklist } = await import("../src/agentSignal.mjs");
    const { MATCHES } = await import("../src/data/matches.mjs");
    const currentMatch = MATCHES[0];
    const targetMatch = MATCHES[2];
    const signal = {
      matchId: targetMatch.id,
      agentId: "agent_mexico_probe",
      homeBps: 6100,
      drawBps: 2500,
      awayBps: 1400,
      confidenceBps: 5400,
      methodSummary: "Independent pre-match estimate.",
      reasoningSummary: "Mexico has home edge but draw risk remains meaningful.",
      sourceMix: ["agent-context-json"],
      marketPredictions: {
        match_winner_1x2: { Mexico: 6100, Draw: 2500, "South Africa": 1400 },
        exact_score: [
          { outcome: "1-0", bps: 1600 },
          { outcome: "2-0", bps: 1300 },
          { outcome: "other", bps: 7100 },
        ],
        first_goal: { Mexico: 6200, "No goal": 700, "South Africa": 3100 },
        both_teams_to_score: { Yes: 4700, No: 5300 },
        total_goals_2_5: { Over: 5100, Under: 4900 },
        group_winner: [
          { outcome: "Mexico", bps: 4300 },
          { outcome: "Other Group A team", bps: 5200 },
          { outcome: "South Africa", bps: 500 },
        ],
        world_cup_champion: [
          { outcome: "Mexico", bps: 900 },
          { outcome: "South Africa", bps: 100 },
          { outcome: "Other country", bps: 9000 },
        ],
      },
    };

    const inferred = inferAgentSignalMatch(signal, MATCHES, currentMatch);
    const checklist = buildAgentSignalChecklist(signal, inferred);

    expect(inferred.id).to.equal(targetMatch.id);
    expect(checklist.ok).to.equal(true);
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
