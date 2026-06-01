const { expect } = require("chai");

describe("Scoring and prediction aggregation", function () {
  it("adds points for 1X2 accuracy and exact-score evidence", async function () {
    const { scoreSignal } = await import("../src/scoring.mjs");
    const event = {
      homeBps: 2500,
      drawBps: 5200,
      awayBps: 2300,
      rawEvidence: {
        marketPredictions: {
          exact_score: [
            { outcome: "2-2", bps: 2600 },
            { outcome: "1-1", bps: 1800 },
          ],
          both_teams_to_score: { Yes: 7200, No: 2800 },
          total_goals_2_5: { Over: 6900, Under: 3100 },
        },
      },
    };

    const score = scoreSignal(event, {
      result: "draw",
      exactScore: "2-2",
      marketOutcomes: {
        both_teams_to_score: "Yes",
        total_goals_2_5: "Over",
      },
    });

    expect(score.hit).to.equal(true);
    expect(score.exactScoreHit).to.equal(true);
    expect(score.points).to.be.greaterThan(0);
    expect(score.pointsBreakdown.exactScore).to.be.greaterThan(0);
    expect(score.pointsBreakdown.marketDimensions).to.be.greaterThan(0);
  });

  it("builds a points-first leaderboard", async function () {
    const { buildLeaderboard } = await import("../src/scoring.mjs");
    const { MATCHES } = await import("../src/data/matches.mjs");
    const match = MATCHES[0];
    const { ethers } = await import("ethers");
    const matchId = ethers.id("test-match");
    const matches = [{ ...match, id: "test-match" }];
    const events = [
      {
        signalId: 1,
        agent: "0x1111111111111111111111111111111111111111",
        agentIdHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        matchId,
        blockNumber: 1,
        homeBps: 2500,
        drawBps: 5200,
        awayBps: 2300,
        confidenceBps: 7000,
      },
      {
        signalId: 2,
        agent: "0x2222222222222222222222222222222222222222",
        agentIdHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        matchId,
        blockNumber: 2,
        homeBps: 7000,
        drawBps: 1800,
        awayBps: 1200,
        confidenceBps: 7000,
      },
    ];
    const leaderboard = buildLeaderboard(events, [{ ...matches[0], id: "test-match" }], {
      "test-match": { result: "draw" },
    });

    expect(leaderboard[0].agent).to.equal("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(leaderboard[0].points).to.be.greaterThan(leaderboard[1].points);
    expect(leaderboard[0].hitRate).to.equal(1);
  });

  it("aggregates selected-match predictions by most agents first", async function () {
    const { buildPredictionConsensus } = await import("../src/scoring.mjs");
    const match = {
      home: "Argentina",
      away: "France",
      marketDimensions: [
        { id: "match_winner_1x2", label: "90-minute winner" },
        { id: "exact_score", label: "Exact score" },
      ],
    };
    const rows = [
      { agent: "a", signal: { homeBps: 4400, drawBps: 3200, awayBps: 2400 }, rawEvidence: { marketPredictions: { exact_score: [{ outcome: "1-1", bps: 3000 }] } } },
      { agent: "b", signal: { homeBps: 4300, drawBps: 3300, awayBps: 2400 }, rawEvidence: { marketPredictions: { exact_score: [{ outcome: "1-1", bps: 2800 }] } } },
      { agent: "c", signal: { homeBps: 2100, drawBps: 3100, awayBps: 4800 }, rawEvidence: { marketPredictions: { exact_score: [{ outcome: "2-1", bps: 2600 }] } } },
    ];

    const winnerConsensus = buildPredictionConsensus(rows, match, "match_winner_1x2");
    const scoreConsensus = buildPredictionConsensus(rows, match, "exact_score");

    expect(winnerConsensus.totalAgents).to.equal(3);
    expect(winnerConsensus.groups[0]).to.include({ outcome: "Argentina", topAgentCount: 2 });
    expect(winnerConsensus.groups.map((group) => group.outcome)).to.deep.equal(["Argentina", "France", "Draw"]);
    expect(winnerConsensus.groups.find((group) => group.outcome === "Draw")).to.include({ topAgentCount: 0 });
    expect(scoreConsensus.groups[0]).to.include({ outcome: "1-1", topAgentCount: 2 });
    expect(scoreConsensus.groups[0].probabilityBuckets[0]).to.include({ bps: 3000, agentCount: 1 });
    expect(scoreConsensus.groups[0].probabilityBuckets[1]).to.include({ bps: 2800, agentCount: 1 });
  });
});
