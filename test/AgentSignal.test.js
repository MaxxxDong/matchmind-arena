const { expect } = require("chai");
const fs = require("node:fs");

describe("Agent signal onboarding helpers", function () {
  it("exposes a complete agent-selectable group-stage slate", async function () {
    const { MATCHES } = await import("../src/data/matches.mjs");

    const groupStageMatches = MATCHES.filter((match) => match.scoringMode === "world-cup-2026-group-stage");

    expect(groupStageMatches).to.have.length(72);
    expect(groupStageMatches.map((match) => match.id)).to.include("wc-2026-001-mexico-south-africa");
    expect(new Set(groupStageMatches.map((match) => match.group))).to.have.length(12);
    expect(groupStageMatches.every((match) => match.marketDimensions?.length >= 5)).to.equal(true);
  });

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
    const targetMatch = MATCHES.find((match) => match.id === "wc-2026-001-mexico-south-africa");
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

  it("finds a leaderboard agent's latest visible signal", async function () {
    const { findAgentSignalRow } = await import("../src/agentSignal.mjs");
    const events = [
      {
        signalId: 1,
        agent: "0x1111111111111111111111111111111111111111",
        agentIdHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        matchId: "0xmatch1",
        blockNumber: 10,
        txHash: "0xold",
        homeBps: 4800,
        drawBps: 2700,
        awayBps: 2500,
      },
      {
        signalId: 2,
        agent: "0x1111111111111111111111111111111111111111",
        agentIdHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        matchId: "0xmatch2",
        blockNumber: 12,
        txHash: "0xnew",
        homeBps: 5200,
        drawBps: 3000,
        awayBps: 1800,
      },
    ];

    const selected = findAgentSignalRow({
      agent: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      agentIdHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      wallet: "0x1111111111111111111111111111111111111111",
    }, events);

    expect(selected.txHash).to.equal("0xnew");
    expect(selected.signalId).to.equal(2);
  });

  it("builds a concise pre-wallet preview for the selected agent signal", async function () {
    const { buildAgentSignalPreview } = await import("../src/agentSignal.mjs");
    const { MATCHES } = await import("../src/data/matches.mjs");
    const match = MATCHES.find((candidate) => candidate.id === "wc-2026-001-mexico-south-africa");
    const preview = buildAgentSignalPreview({
      matchId: match.id,
      agentId: "agent_preview_probe",
      agentName: "Preview Probe",
      homeBps: 6100,
      drawBps: 2500,
      awayBps: 1400,
      confidenceBps: 5400,
      methodSummary: "Independent estimate.",
      sourceMix: ["agent-context-json"],
      marketPredictions: {
        match_winner_1x2: { Mexico: 6100, Draw: 2500, "South Africa": 1400 },
        exact_score: [{ outcome: "1-0", bps: 1600 }, { outcome: "other", bps: 8400 }],
      },
    }, match);

    expect(preview.agentId).to.equal("agent_preview_probe");
    expect(preview.matchTitle).to.equal("Mexico vs South Africa");
    expect(preview.vectorText).to.equal("Mexico 61.0% / Draw 25.0% / South Africa 14.0%");
    expect(preview.marketLines[0]).to.include("90-minute winner");
    expect(preview.marketLines[1]).to.include("Exact score");
  });

  it("normalizes wallet rejection errors without leaking raw transaction payloads", async function () {
    const { friendlyAgentError } = await import("../src/agentSignal.mjs");
    const error = new Error('user rejected action (action="sendTransaction", reason="rejected", payload={"data":"0xdeadbeef"})');
    error.code = 4001;

    const message = friendlyAgentError(error);

    expect(message).to.equal("Wallet request cancelled. No transaction was submitted.");
    expect(message).not.to.include("0xdeadbeef");
  });

  it("blocks accidental duplicate primary submissions for the same agent match window", async function () {
    const { duplicateSignalMessage } = await import("../src/agentSignal.mjs");

    expect(duplicateSignalMessage(true)).to.equal("This agent already submitted a primary signal for this match window. Select another match or use a different agent ID; revisions are disabled in this demo to prevent accidental duplicate uploads.");
    expect(duplicateSignalMessage(false)).to.equal("");
  });

  it("keeps seeded subagent signals complete and independently varied", async function () {
    const { SAMPLE_AGENT_SIGNALS } = await import("../src/data/sampleSignals.mjs");
    const { MATCHES } = await import("../src/data/matches.mjs");
    const { buildAgentSignalChecklist } = await import("../src/agentSignal.mjs");

    expect(SAMPLE_AGENT_SIGNALS).to.have.length.at.least(4);
    expect(new Set(SAMPLE_AGENT_SIGNALS.map((signal) => signal.agentId)).size)
      .to.equal(SAMPLE_AGENT_SIGNALS.length);
    expect(new Set(SAMPLE_AGENT_SIGNALS.map((signal) => `${signal.homeBps}-${signal.drawBps}-${signal.awayBps}`)).size)
      .to.be.greaterThan(1);

    for (const signal of SAMPLE_AGENT_SIGNALS) {
      const match = MATCHES.find((candidate) => candidate.id === signal.matchId);
      expect(match, signal.matchId).to.exist;
      expect(signal.homeBps + signal.drawBps + signal.awayBps, signal.agentId).to.equal(10000);
      const checklist = buildAgentSignalChecklist(signal, match);
      expect(checklist.ok, signal.agentId).to.equal(true);
    }
  });
});
