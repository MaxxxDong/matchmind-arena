# Implementation Plan

Purpose: this is the canonical execution checklist. Completed phase status belongs in `docs/project-progress.md`.

This is the execution checklist for the new independent Mantle project.

## Phase 0 - Research And Repo Setup

- [x] Create independent local Git repository.
- [x] Capture hackathon rules, track requirements, and award criteria.
- [x] Create README and planning docs.
- [ ] Choose final public repository name before public upload.
- [ ] Choose license before public upload.
- [ ] Decide whether the public project name stays `MatchMind Arena` before public upload.

## Phase 1 - Deployment Award Foundation

Goal: satisfy the 20 Project Deployment Award as early as possible.

- [x] Create Solidity contract `SignalArena`.
- [x] Use the stricter signal model from `docs/pre-phase-one-review.md`.
- [x] Add functions:
  - [x] `registerAgent`
  - [x] `submitSignal`
  - [x] `resolveMatch`
- [x] Validate that the main scored signal is a full 1X2 probability vector:
  - [x] `homeBps`
  - [x] `drawBps`
  - [x] `awayBps`
  - [x] Sum equals 10000.
- [x] Include `contextHash`, `evidenceHash`, and `metadataHash` in each submitted signal.
- [x] Add events for signal submission and match resolution.
- [x] Emit public resolution source hash and URI.
- [x] Add unit tests.
- [x] Configure Mantle testnet deployment.
- [x] Deploy to Mantle Testnet.
- [x] Verify contract on Mantle Explorer.
  - [x] Prepare Standard JSON input for manual upload.
  - [x] Configure Hardhat verification against Etherscan API V2.
  - [x] Complete manual MantleScan Standard JSON upload.
- [x] Save deployed address and transaction proof in README.
- [x] Build a minimal frontend button that calls the AI-powered `submitSignal` path. This starts after deployment because the frontend needs the deployed address.

Verification gate:

- Contract address exists.
- Explorer verification link works.
- At least one AI-generated signal transaction is visible.

## Phase 2 - Arena Web App

Goal: build the public demo surface.

- [x] Create web frontend.
- [x] Build match list and match detail page.
- [x] Build signal submission panel.
- [x] Build signal timeline.
- [x] Build leaderboard seed.
- [x] Render transaction links.
- [ ] Add public demo deployment.

UI targets:

- Fast, clear, live-sports feel.
- Strong signal cards.
- Easy to understand for non-crypto judges.
- Good enough for Best UI/UX Award consideration.

## Phase 3 - AI Signal Flow

Goal: make AI central to the product.

- [x] Define prompt contract for generating structured signals.
- [x] Support user-provided model endpoint initially.
- [x] Validate model output against signal schema.
- [x] Generate `evidenceHash`.
- [x] Commit the generated signal on-chain.
- [x] Store full signal metadata off-chain in browser-local cache.

Verification gate:

- A user asks an AI question.
- AI returns structured signal.
- App commits the signal to Mantle.
- UI shows the transaction and signal card.

## Phase 4 - Agent API

Goal: let external agents participate.

- [x] Add local `POST /api/agents/register` metadata preparation endpoint.
- [x] Add local `GET /api/matches`.
- [x] Add local `GET /api/matches/:matchId/context`.
- [x] Add local `POST /api/signals` validation and commitment-preparation endpoint.
- [x] Add optional API-key auth through `AGENT_API_KEY`.
- [x] Add example agent script.
- [x] Add one sample baseline agent.
- [ ] Add persistent agent registry storage.
- [ ] Add wallet or relay path for committing API-submitted signals on Mantle.

Verification gate:

- Example agent can fetch match context.
- Example agent can submit signal.
- API returns a `SignalArena.submitSignal`-compatible commitment payload.
- Signal appears on Arena UI after a wallet or relay submits the returned commitment.
- Signal can be committed on Mantle.

## Phase 5 - Chrome Companion Integration

Goal: bring in the useful sports assistant surface without copying unrelated history.

- [ ] Decide whether to copy a clean subset or rebuild the companion shell.
- [ ] Keep only match identification, AI chat, replay evidence, and signal submission.
- [ ] Remove old prediction-market-specific concepts.
- [ ] Connect companion to Arena API.
- [ ] Add "Commit Signal" flow from the companion.

Verification gate:

- User opens a football page.
- Companion identifies match.
- User asks AI.
- AI signal can be sent to Arena.

## Phase 6 - Scoring And Resolution

Goal: make the benchmark credible.

- [x] Define initial public match result source for the demo replay.
- [ ] Implement resolver job.
- [ ] Add Brier score.
- [ ] Add log loss.
- [ ] Add calibration summary.
- [ ] Add leaderboard update.
- [x] Add first-pass late-signal handling for scored leaderboard entries.

Phase 6A local demo scoring:

- [x] Add local resolved-result fixtures for demo matches.
- [x] Compute Brier score and log loss from loaded `SignalSubmitted` events.
- [x] Show a real leaderboard seed in the Arena UI before the resolver backend exists.

Phase 6B reproducible scoring snapshot:

- [x] Move match cards, demo resolutions, and scoring math into shared modules.
- [x] Make the frontend leaderboard reuse the shared scoring modules.
- [x] Add a CLI snapshot export that reads Mantle Sepolia `SignalSubmitted` events.
- [x] Write an inspectable JSON leaderboard snapshot for the current deployed contract.
- [x] Attach a public result-source adapter and source hash to demo resolutions.
- [ ] Replace static demo resolutions with a resolver job that pulls from public sources.
- [x] Add closed-window scoring rules for live matches and explicit replay mode for demo matches.
- [x] Include block timestamp and scoring eligibility audit in leaderboard snapshots.
- [ ] Add resolver-driven late-signal enforcement for future resolved live matches.

Verification gate:

- Resolved sample match updates signal scores.
- Leaderboard changes after resolution.
- Raw scoring data is inspectable.

## Phase 7 - Submission Package

Goal: make the hackathon submission easy to verify.

- [ ] Public GitHub repository.
- [ ] README with setup, architecture, contract address, and demo.
- [ ] Demo video of at least 2 minutes.
- [ ] DoraHacks BUIDL page filled.
- [ ] Deployed public frontend link.
- [ ] Verified contract link.
- [ ] Short pitch for track and awards.

## Immediate Next Step

Current priority after Phase 6B:

1. Deploy the frontend to a public URL.
2. Replace static demo resolutions with a resolver job that pulls from public sources.
3. Add durable metadata storage or a minimal relay only if browser-side model calls hit provider CORS limits.
4. Then continue toward external Agent API and Chrome companion integration.
