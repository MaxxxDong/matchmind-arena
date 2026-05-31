# Implementation Plan

This is the execution checklist for the new independent Mantle project.

## Phase 0 - Research And Repo Setup

- [x] Create independent local Git repository.
- [x] Capture hackathon rules, track requirements, and award criteria.
- [x] Create README and planning docs.
- [ ] Choose final public repository name.
- [ ] Choose license.
- [ ] Decide whether the public project name stays `MatchMind Arena`.

## Phase 1 - Deployment Award Foundation

Goal: satisfy the 20 Project Deployment Award as early as possible.

- [ ] Create Solidity contract `SignalArena`.
- [ ] Add functions:
  - [ ] `registerAgent`
  - [ ] `submitSignal`
  - [ ] `resolveMatch` or event-only resolution placeholder
- [ ] Add events for signal submission and match resolution.
- [ ] Add unit tests.
- [ ] Configure Mantle testnet deployment.
- [ ] Deploy to Mantle Testnet.
- [ ] Verify contract on Mantle Explorer.
- [ ] Save deployed address and explorer link in README.
- [ ] Build a minimal frontend button that calls the AI-powered `submitSignal` path.

Verification gate:

- Contract address exists.
- Explorer verification link works.
- At least one AI-generated signal transaction is visible.

## Phase 2 - Arena Web App

Goal: build the public demo surface.

- [ ] Create web frontend.
- [ ] Build match list and match detail page.
- [ ] Build signal submission panel.
- [ ] Build signal timeline.
- [ ] Build leaderboard.
- [ ] Render transaction links.
- [ ] Add public demo deployment.

UI targets:

- Fast, clear, live-sports feel.
- Strong signal cards.
- Easy to understand for non-crypto judges.
- Good enough for Best UI/UX Award consideration.

## Phase 3 - AI Signal Flow

Goal: make AI central to the product.

- [ ] Define prompt contract for generating structured signals.
- [ ] Support user-provided model endpoint initially.
- [ ] Validate model output against signal schema.
- [ ] Generate `evidenceHash`.
- [ ] Commit the generated signal on-chain.
- [ ] Store full signal metadata off-chain.

Verification gate:

- A user asks an AI question.
- AI returns structured signal.
- App commits the signal to Mantle.
- UI shows the transaction and signal card.

## Phase 4 - Agent API

Goal: let external agents participate.

- [ ] Add `POST /api/agents/register`.
- [ ] Add `GET /api/matches`.
- [ ] Add `GET /api/matches/:matchId/context`.
- [ ] Add `POST /api/signals`.
- [ ] Add API-key auth.
- [ ] Add example agent script.
- [ ] Add one sample baseline agent.

Verification gate:

- Example agent can fetch match context.
- Example agent can submit signal.
- Signal appears on Arena UI.
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

- [ ] Define match result source.
- [ ] Implement resolver job.
- [ ] Add Brier score.
- [ ] Add log loss.
- [ ] Add calibration summary.
- [ ] Add leaderboard update.
- [ ] Add late-signal handling.

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

Start with Phase 1:

1. Create the Solidity contract and tests.
2. Configure deployment to Mantle Testnet.
3. Deploy and verify.
4. Only then build the richer UI around the live contract.

This order reduces risk because the deployment award has strict hard requirements.

