# Agent UX Smoke Test

Purpose: record a step-by-step external-agent trial of the public MatchMind Arena flow. This is not canonical protocol documentation; protocol details belong in `docs/agent-protocol.md`.

## Test Setup

- Date: 2026-06-01
- Public app: https://matchmind-arena.vercel.app
- Test role: external AI agent arriving without prior project history
- Constraint: interact step by step, do not batch all commands, do not submit wallet transactions during exploratory steps

## Step Log

### Step 1 - First public page visit

Instruction given to the test agent:

> Open or read the public entry that an external agent would naturally inspect first. Stop after the first step and report what you see, what you plan to do next, and whether anything is confusing.

Agent result:

- The homepage clearly presents MatchMind Arena as a football prediction benchmark for agents and reviewers.
- The agent noticed Mantle Sepolia contract status, loaded signal count, next signal id, scored count, and agent-readable links.
- The default match was understood as `Argentina vs France` demo replay.
- Visible required dimensions were understood: 90-minute 1X2, exact score, first goal, both teams to score, total goals 2.5.
- The agent knew the next step should be reading `agent-skill.md`, `agent-context.json`, and `agent-action.json`.

Observed issue:

- The homepage alone does not fully explain payload shape or deeplink mechanics. This is acceptable if the agent resources make that clear.

### Step 2 - Read agent resources

Instruction given to the test agent:

> Read `/agent-skill.md`, `/agent-context.json`, `/agent-action.json`, and `/llms.txt`. Stop after reading and report whether the payload and deeplink flow are clear.

Agent result:

- The agent understood that the preferred flow is:
  - choose a `matchId`
  - create `agentSignal`
  - create `agentProfile`
  - encode both as UTF-8 JSON using base64url without padding
  - open `https://matchmind-arena.vercel.app/#agentSignal=<...>&agentProfile=<...>`
- Required signal fields were understood:
  - `matchId`
  - `agentId`
  - `homeBps`
  - `drawBps`
  - `awayBps`
  - `confidenceBps`
  - `methodSummary`
  - `reasoningSummary`
  - `sourceMix`
  - `marketPredictions`
- The agent understood that `homeBps + drawBps + awayBps = 10000`.
- The agent understood that `marketPredictions` must cover every selected match `marketDimensions[].id`.
- The agent understood that `agentId` is hashed into the on-chain identity and that this version does not support multi-wallet migration.

Observed issues / risks:

- `marketPredictions` keys must exactly match selected-match IDs. Example: `total_goals_2_5`, not a generic `total_goals`.
- Outcome names should align with the selected match outcomes, e.g. `Argentina / Draw / France`, not generic `Home team / Away team`.
- `exact_score` is analysis evidence, but the agent interpreted it as safer to make ranked probabilities sum to 10000. The docs should keep this expectation explicit if we want uniform output.
- The agent understood that opening a deeplink is non-chain, but clicking wallet confirmation is chain action.

### Step 3 - Generate a real agent signal and deeplink

Instruction given to the test agent:

> Select the default Argentina vs France demo replay, generate a real `agentSignal` and `agentProfile`, then construct the deeplink. Do not connect a wallet and do not submit an on-chain transaction.

Agent result:

- The agent generated a complete signal for `demo-replay:argentina-france-2022`.
- Main 1X2 vector:
  - Argentina: 4300 bps
  - Draw: 3000 bps
  - France: 2700 bps
  - Confidence: 5200 bps
- The agent generated `marketPredictions` for:
  - `match_winner_1x2`
  - `exact_score`
  - `first_goal`
  - `both_teams_to_score`
  - `total_goals_2_5`
- The agent constructed a deeplink of roughly 2803 characters.

Agent self-noted uncertainty:

- It only used MatchMind public context, so it set confidence conservatively.
- It kept legacy `exactScore` and `firstGoal` fields as compatibility duplicates alongside `marketPredictions`.
- It made first-goal probabilities independent from the 1X2 winner vector instead of mechanically mirroring it.

Observed issue:

- The agent attempted to preview the long hash deeplink in an in-app browser but the browser timed out and stayed at `about:blank`.
- This did not prove a product parsing failure, but it exposed a real UX risk: long deeplinks may be hard for some agent/browser environments to preview reliably.

Follow-up required:

- Verify the generated deeplink payload with the app parser or a browser automation path.
- Consider documenting a shorter fallback path for agents if long hash deeplinks fail in their environment.

### Step 4 - Independent agent retrospective

Instruction given to the test agent:

> Based on the homepage, agent resources, and deeplink generation process, report what was clear, where an agent or human may get stuck, and the smallest changes that would make pre-chain preparation easier.

Agent result:

- Clear:
  - The public entry points are easy to find.
  - The agent understood that MatchMind provides context, baseline reference, `marketDimensions`, Mantle contract details, and wallet-confirmation flow.
  - The agent understood that the scoreable on-chain vector is strict 1X2 plus confidence, while the agent remains free to choose its own model and data sources.
- Potentially confusing:
  - Some examples used generic `Home team` / `Away team` outcome keys, while the match context uses concrete outcomes like `Argentina` / `Draw` / `France`.
  - The global dimension list includes `total_goals`, but the selected Argentina vs France match requires `total_goals_2_5`.
  - `marketPredictions` is required, but legacy fields such as `exactScore` and `firstGoal` made canonical field priority less obvious.
  - A roughly 2803-character deeplink could not be previewed by the agent's in-app browser, so the agent could not independently prove UI parsing.
  - Stable `agentId` is a long-term identity decision, but a first-time agent may treat it as a temporary field.

Changes made after this test:

- Updated `/agent-action.json` to include a match-specific `canonicalExample` using concrete Argentina vs France outcome names.
- Clarified that `marketPredictions` is canonical and legacy `exactScore` / `firstGoal` mirrors are optional only.
- Updated `/agent-skill.md` to avoid generic outcome labels and to tell agents to use exact selected-match outcome names.

### Step 5 - Local payload validation

Local verification:

- Reconstructed the subagent's core signal for `demo-replay:argentina-france-2022` after removing legacy mirror fields.
- Encoded `agentSignal` and `agentProfile` as base64url JSON.
- Decoded both payloads again.
- Checked that the 1X2 vector sums to `10000`.
- Checked that all selected-match dimensions are present:
  - `match_winner_1x2`
  - `exact_score`
  - `first_goal`
  - `both_teams_to_score`
  - `total_goals_2_5`
- Checked that all `basis_points_sum_10000` dimensions sum to `10000`.
- Built the same `SignalArena.submitSignal` commitment object via `src/signals.mjs`.

Result:

- Payload validation passed.
- The reconstructed canonical deeplink length was `1794` characters, shorter than the agent's original roughly `2803` character deeplink because legacy mirrors were removed.
- The commitment object contained all expected fields:
  - `matchId`
  - `contextHash`
  - `matchWindow`
  - `homeBps`
  - `drawBps`
  - `awayBps`
  - `confidenceBps`
  - `evidenceHash`
  - `metadataHash`
  - `metadataUri`

Verification limitation:

- This proves the payload shape, encoding, selected-match dimension coverage, and commitment generation path.
- It does not prove a live browser render of the long deeplink because the subagent browser preview failed and this run did not use wallet submission.

## Retrospective

Overall, the agent onboarding route is usable: an external agent can discover the resources, understand the task, generate a full signal, and prepare a deeplink without private project context.

The main issue was not the chain or payload validator. The issue was example clarity. Generic outcome names and legacy mirror fields made the schema look more ambiguous than it actually is. Those examples have now been tightened.

The remaining UX gap is pre-wallet visual confirmation. The app already validates a deeplink on load and shows status text, but a dedicated no-wallet dry-run view or explicit parsed-signal checklist would make agent automation easier to verify.
