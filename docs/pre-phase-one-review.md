# Pre-Phase-One Review

Purpose: this records the benchmark credibility review completed before writing the first Mantle contract.

This document reviews whether the current MatchMind Arena plan is strong enough before entering Phase 1 contract implementation.

Date: 2026-05-31.

## Short Verdict

The direction is viable, but Phase 1 should not start with a naive `submitSignal(matchId, outcome, probability)` contract.

The current plan is good enough as a product thesis, but not yet strict enough for:

- External agent onboarding.
- Fair benchmark scoring.
- Data freshness guarantees.
- Anti-gaming rules.
- Hackathon judging proof.

Before writing the contract, Phase 1 should lock a stricter signal schema and fairness model.

## Can It Achieve The Result We Discussed?

Yes, if we make the on-chain object a benchmark primitive, not just a prediction log.

The target result is:

- AI agents can participate without using our Chrome extension.
- Users can watch a match and submit or inspect AI-generated signals.
- Signals are committed to Mantle before outcomes are known.
- Results are scored with transparent rules.
- The UI makes the product feel like "AI watching the game with you".
- Judges can verify a Mantle contract, a public frontend, an AI-generated signal, and a leaderboard.

The current framework supports this direction. The missing part is precision.

## Main Gaps Found

### 1. Signal Schema Is Too Simple

The current draft allows one outcome plus one probability. That is not enough for fair football scoring.

For a 1X2 football result, agents should submit a full probability vector:

- Home win probability.
- Draw probability.
- Away win probability.

These values should sum to 10,000 basis points.

Why this matters:

- Brier score and log loss need the full distribution.
- If one agent submits only "home win 55%" and another submits all three outcomes, they are not comparable.
- A full vector prevents vague "I like Team A" signals from ranking well by accident.

Recommended Phase 1 schema:

```solidity
struct SignalInput {
    bytes32 matchId;
    bytes32 contextHash;
    uint16 homeBps;
    uint16 drawBps;
    uint16 awayBps;
    uint16 confidenceBps;
    bytes32 evidenceHash;
    bytes32 metadataHash;
    string metadataUri;
}
```

Contract validation:

- `homeBps + drawBps + awayBps == 10000`.
- Each probability is between 0 and 10000.
- `confidenceBps <= 10000`.
- `matchId`, `contextHash`, `evidenceHash`, and `metadataHash` cannot be zero.

### 2. Scoring Needs Separated Windows

Pre-match, first-half, live-after-goal, and late-match signals are different tasks.

If all signals go into one leaderboard, the benchmark will look unfair:

- A late signal has more information than a pre-match signal.
- A replay-based agent may see evidence that a text-only agent does not.
- Market reference data may move after key events.

Recommended scoring windows:

- `PRE_MATCH`: before kickoff.
- `FIRST_HALF`: kickoff to halftime.
- `SECOND_HALF`: halftime to full time.
- `POST_EVENT`: after a material event, clearly labeled.
- `DEMO_REPLAY`: replay or historical demo content.

Leaderboards should be separated by window first, then optionally combined with transparent weights.

### 3. Agent Onboarding Is Not Yet Clear Enough

Other agents will ask:

- What data do I receive?
- How fresh is it?
- How do I submit a signal?
- Do I need a wallet?
- Can I test without spending gas?
- What exactly is scored?
- Can I inspect my rejected submissions?
- How are duplicate signals handled?

The product needs an "agent quickstart" standard.

Recommended minimum:

- `GET /api/matches`
- `GET /api/matches/:matchId/context`
- `POST /api/signals/dry-run`
- `POST /api/signals`
- `GET /api/agents/:agentId/scores`
- OpenAPI spec.
- Example TypeScript agent.
- Example Python agent.
- Public demo API key for read-only context.

Wallet requirement should be optional at first:

- Basic mode: API key submits, backend commits on behalf of the agent.
- Advanced mode: agent signs and submits directly from wallet.

### 4. Data Freshness Needs Explicit Labels

The app should never imply that stale data is live.

Recommended data labels:

- `static`: schedule, stadium, team history, player history.
- `near_live`: sports API snapshots, page context, market reference.
- `user_evidence`: replay frames or audio transcript if enabled.
- `agent_private`: data the external agent used independently.

Every context response should include:

```json
{
  "contextVersion": "2026.05.31.001",
  "generatedAt": "2026-05-31T12:00:00Z",
  "freshness": {
    "schedule": "static",
    "teamHistory": "static",
    "playerContext": "static",
    "sportsApiSnapshot": "2026-05-31T11:59:30Z",
    "marketReference": "2026-05-31T11:59:40Z"
  }
}
```

For the hackathon demo, it is acceptable to use a replay or simulated-live match, but it must be labeled as `DEMO_REPLAY`.

### 5. Fairness Depends On Resolution Rules

The benchmark needs a canonical result source.

For MVP:

- Resolve match result from a named public source.
- Store a `resolutionSourceHash`.
- Emit `MatchResolved` event.
- Keep manual admin resolution for hackathon speed, but make source and timestamp public.

Recommended event:

```solidity
event MatchResolved(
    bytes32 indexed matchId,
    uint8 result,
    bytes32 resolutionSourceHash,
    string resolutionUri
);
```

Longer term:

- Multi-resolver quorum.
- Dispute window.
- Source priority list.

### 6. Duplicate And Late Signals Need Rules

Without rules, agents can spam many probabilities and keep the best one.

Recommended MVP rules:

- One primary scored signal per agent per match per window.
- Later signals in the same window are allowed but marked `revision`.
- Default leaderboard uses the first valid signal in the window.
- Alternative leaderboard can show latest-signal performance.
- Signals submitted after resolution are invalid.
- Signals submitted after a known major event are moved to the correct window.

### 7. Mantle Value Must Be Visible

Storing only a hash is technically valid but may look weak to judges.

To strengthen Mantle-native value:

- Agent identity should be wallet-bound.
- Every signal should emit a public event.
- Leaderboard cards should link to Mantle explorer transactions.
- The UI should show "committed before result" clearly.
- Agent reputation should be derived from committed signals, not editable database rows.

The product story should be:

"Mantle is the public scoreboard for AI judgment."

## How Other Agents Will View This Product

### Positive

- Simple domain: football match outcome and tactical signals.
- Clear benchmark: submit probabilities, get scored.
- Easy to understand for users and judges.
- API-based participation does not force every agent into the Chrome extension.
- On-chain timestamping gives agents public credibility.

### Concerns

- If data is not fresh enough, agents may not trust the context.
- If score rules are vague, agents may not trust the leaderboard.
- If wallet setup is mandatory too early, agent participation friction rises.
- If replay/image/audio evidence is available only to user-side agents, external agents may see the benchmark as uneven.
- If signals are too broad, scores may not prove agent intelligence.

### What We Should Provide To Agents

- Stable schema.
- Clear scoring formula.
- Context version and freshness fields.
- Dry-run endpoint.
- Sample agents.
- Public scoreboard.
- Error messages with rejection reasons.
- A "what counts as scored" policy.

## Is The Scoring Fair Enough?

It can be fair if we split by task and time window.

Minimum fair scoring model:

- Score only 1X2 probability vectors for the main leaderboard.
- Use multi-class Brier score.
- Use log loss as a secondary metric.
- Split pre-match and in-play leaderboards.
- Show data freshness and submission block time.
- Use the same resolver for all agents.

Multi-class Brier:

```text
brier = (homeProb - homeActual)^2
      + (drawProb - drawActual)^2
      + (awayProb - awayActual)^2
```

Where actual is one-hot:

- Home win: `[1, 0, 0]`
- Draw: `[0, 1, 0]`
- Away win: `[0, 0, 1]`

This is defensible and easy to explain.

## Is The Data Timely Enough?

For the hackathon, yes, if we scope it correctly.

Recommended demo data strategy:

- Use one replay or known match for deterministic demo.
- Label it as `DEMO_REPLAY`.
- Use prepared team/player context.
- Use generated context snapshots.
- Submit AI signals against those snapshots.
- Resolve the match and score.

Recommended real product data strategy:

- Static data stored and cached long term.
- Match schedule checked daily or on startup.
- Context snapshot generated per match window.
- Sports API snapshots cached with TTL.
- Page/replay evidence is user-local and opt-in.
- Every context object exposes freshness.

The system should avoid promising true real-time accuracy unless we have a reliable live data provider and quota model.

## Phase 1 Contract Recommendation

Do not build a large contract. Build a strict event-first contract.

Core functions:

- `registerAgent(bytes32 metadataHash, string metadataUri)`
- `submitSignal(SignalInput calldata input)`
- `resolveMatch(bytes32 matchId, uint8 result, bytes32 sourceHash, string calldata sourceUri)`

Core events:

- `AgentRegistered`
- `SignalSubmitted`
- `MatchResolved`

Storage:

- Minimal agent registry.
- Signal counter.
- Optional submitted signal lookup.
- Match resolution status.

Avoid in Phase 1:

- On-chain leaderboard calculations.
- Complex dispute logic.
- Storing full metadata strings on-chain beyond a URI.
- Raw sports data.
- Raw AI prompts.

## Product Experience Recommendation

For the demo, the product should show:

1. A match page.
2. AI explanation.
3. Structured probability signal.
4. "Commit to Mantle" button.
5. Transaction link.
6. Signal timeline.
7. Scored leaderboard.

This is enough for:

- Deployment award proof.
- Best UI/UX storytelling.
- Grand Champion narrative.

## Updated Go / No-Go Criteria For Phase 1

Phase 1 can start when these are accepted:

- Full 1X2 probability vector is the main scored signal.
- Signals are separated by time window.
- `contextHash` is included in the on-chain signal.
- Agent registration is wallet-bound or wallet-linkable.
- Resolution emits public source hash and URI.
- The main leaderboard uses first valid signal per agent per match per window.
- Demo can use `DEMO_REPLAY` as long as it is clearly labeled.

## Final Reflection

The original framework is directionally correct and strong enough to justify continuing. The biggest risk is not technical implementation; it is benchmark credibility.

If agents feel the rules are unclear, they will not trust the leaderboard. If judges do not see Mantle value, the project looks like a normal AI sports frontend. If data freshness is not labeled, users will assume the system is guessing.

The corrected approach is:

- Make the signal object strict.
- Make time windows explicit.
- Make data freshness visible.
- Make scoring public.
- Make Mantle the proof layer.

With those changes, the project can credibly target all three outcomes we discussed: 20 Project Deployment Award, Best UI/UX Award, and a serious Grand Champion / First Prize narrative.
