# Project Progress

Purpose: this is the single progress log for completed project phases and current blockers. Do not duplicate phase status in other docs; link here from the README.

## Status Summary

- Phase 0: research, repo setup, public repo name, project name, and license decisions complete.
- Phase 1 local contract foundation: complete.
- Phase 1 Mantle testnet deployment: complete.
- Phase 2 public frontend: minimal local demo complete.
- Phase 2 public Vercel deployment: complete.
- Phase 3 browser AI signal flow: minimal local demo complete.
- Phase 6A local demo scoring: complete.
- Phase 6B reproducible scoring snapshot: complete.
- Phase 6C public result-source evidence: complete for the demo replay.
- Phase 6D closed-window scoring audit: complete for local and snapshot scoring.
- Phase 6E public-source resolver job: complete for the demo replay.
- Phase 6F calibration summary: complete for leaderboard snapshots.
- Phase 4A local Agent API skeleton: complete.
- Phase 7A submission copy package: complete.
- Phase 7B publication hygiene and license: complete locally.
- Phase 7C public GitHub repository: complete.
- Phase 7D demo video script: complete.
- Phase 8A agent onboarding example: complete.
- Phase 8B first-class on-chain agent ID hash: complete.
- Phase 8C market-dimension prediction schema: complete.

## Phase 0 - Research And Repo Setup

Completed in commit `adf0dbb`.

What was done:

- Created independent local Git repository.
- Added README and planning documents.
- Captured hackathon track and award criteria.
- Defined the product direction as an AI sports signal benchmark on Mantle.

## Pre-Phase-One Review

Completed in commit `d2aeb69`.

What was decided:

- Main benchmark signals must use a full 1X2 probability vector.
- Signals need explicit time windows.
- Every signal needs `contextHash`, `evidenceHash`, and `metadataHash`.
- Demo replay mode is acceptable if clearly labeled.
- Scoring fairness is a product requirement, not a later polish task.

## Phase 1 - Contract Foundation

Completed locally and on Mantle Sepolia.

What was done:

- Added Hardhat project skeleton.
- Added `SignalArena` Solidity contract.
- Added strict 1X2 probability validation.
- Added agent registration.
- Upgraded agent registration to include a first-class `agentIdHash`.
- Added signal submission with revision detection.
- Added match resolution with source hash and URI.
- Added Mantle Sepolia and Mantle mainnet network configuration.
- Added deployment and demo signal scripts.
- Added `.env.example`.
- Added contract tests.
- Deployed to Mantle Sepolia.
- Registered demo agent on Mantle Sepolia.
- Submitted demo signal on Mantle Sepolia.

Verification:

- `npm test`: 9 passing.
- `npm run compile`: passing.
- `npx hardhat run scripts/deploy-signal-arena.js`: passing on local Hardhat network.
- `npm audit --omit=dev`: 0 vulnerabilities.
- `npm run deploy:mantle-sepolia`: passing.
- `npm run submit-demo:mantle-sepolia`: passing.
- Deployment creation bytecode matches local Hardhat compile output.

Mantle Sepolia proof:

- Deployer / demo agent: `0xA4a5B46c6109b61337C22428556B5259185cBE5B`
- SignalArena contract: `0x1c2B387c365Ccb7E17B8d8b38989A29ef6394de0`
- Deploy tx: `0xbb1d98ba48f8d41cc8177e6725a282df634fc4ac6a694805ac34729d5f1b33a6`
- Agent registration tx: `0x3de74f1fbb1ee4096de3dae50fa2551737cfaf998c1889b775f594d5b9a7a40a`
- Demo signal tx: `0x13777acb9536a6c6e0de6453d916360e7682c99b7c2f1a36e61cfc828a3a204e`

Explorer verification status:

- Sourcify `full_match` verification succeeded.
- Sourcify source: https://repo.sourcify.dev/contracts/full_match/5003/0x1c2B387c365Ccb7E17B8d8b38989A29ef6394de0/
- Standard JSON upload file: `verification/SignalArena.standard-input.json`.
- ABI export: `verification/SignalArena.abi.json`.
- Compiler: `v0.8.24+commit.e11b9ed9`.
- EVM version: `paris`.
- Optimizer: enabled, 200 runs.
- `viaIR`: enabled to avoid Solidity stack-depth limits after adding `agentIdHash` to events.
- Constructor arguments: none.
- Etherscan-compatible explorer verification remains optional and requires a valid Etherscan V2 API key.

Blocked items:

- Public frontend hosting is not deployed yet.

Reflection:

- The first implementation used `@nomicfoundation/hardhat-toolbox`, which brought unnecessary dev dependency surface. It was replaced with the smaller `@nomicfoundation/hardhat-ethers` setup.
- Plain `npm audit` still reports dev-only Hardhat ecosystem vulnerabilities. A forced fix would move the project to Hardhat 3 and is intentionally deferred until we decide to migrate the toolchain.
- The contract intentionally avoids on-chain leaderboard calculation. This keeps Phase 1 small and verifiable; scoring should remain off-chain until the model is stable.
- The contract currently blocks all submissions after match resolution. This is correct for the main benchmark, but later demo tooling may need a separate historical demo flow instead of reusing resolved live matches.

## Phase 2 - Minimal Arena Web App

Completed locally.

What was done:

- Added a Vite / React web app.
- Added a live sports dashboard UI for match selection, match detail, probability cards, timeline, and leaderboard seed.
- Reads `SignalArena.nextSignalId`, connected agent status, and `SignalSubmitted` events from Mantle Sepolia.
- Uses deployment block `39386150` as the event scan start to avoid slow full-chain log reads.
- Connects an EVM wallet and switches/adds Mantle Sepolia.
- Allows the connected wallet to call `registerAgent`.
- Allows a registered wallet to commit a structured demo AI 1X2 signal through `submitSignal`.
- Renders MantleScan links for contract and transaction proof.

Verification:

- `npm run compile`: passing.
- `npm test`: 9 passing.
- `npm run build`: passing.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Local dev server: `http://127.0.0.1:5173` returns HTTP 200.
- Headless Chrome screenshot confirmed the page renders, reads `nextSignalId = 2`, loads 1 on-chain signal event, and shows the MantleScan transaction link path.

Reflection:

- The current signal generator is deterministic demo logic. This is correct for the first public surface because it proves the user flow and chain path without blocking on model providers.
- The next iteration should move AI generation behind a user-configured model endpoint and persist full signal metadata outside the contract, while keeping only hashes and event proofs on-chain.
- The first UI pass felt too generic and card-heavy. It was redesigned into a denser sports signal desk with a match field visual, compact Mantle status strip, signal composer, and proof timeline.

## Phase 2B - Public Vercel Deployment

Completed.

What was done:

- Deployed the static Vite frontend to Vercel.
- Vercel linked the project as `maxxxdong/matchmind-arena`.
- Public demo URL: `https://matchmind-arena.vercel.app`.
- Vercel added `.vercel` to `.gitignore`; the local project metadata remains untracked.

Verification:

- `npm run build`: passing before deployment.
- `npx vercel --prod --yes`: deployment completed with `readyState: READY`.
- `https://matchmind-arena.vercel.app`: returned HTTP 200 and served the Vite `index.html`.

Reflection:

- Static deployment is the right shape for the current product because wallet signing and Mantle reads happen in the browser.
- The local Agent API remains intentionally local. It should not be exposed publicly until we decide whether to add persistent storage, rate limits, and an explicit relay boundary.

## Phase 3 - Browser AI Signal Flow

Completed locally.

Superseded by Phase 3B and Phase 3D/3F. The public web app no longer asks users to configure browser-side model endpoints or provide model API keys; agents run locally or in user-owned infrastructure and pass structured signals through the action/deeplink flow.

What was done:

- Added user-provided OpenAI-compatible model settings in the signal composer.
- Stores `baseUrl`, `model`, and user-provided API key in the user's browser local storage only.
- Sends selected match context to `/chat/completions` and asks the model to return a strict JSON 1X2 probability vector.
- Parses model output, validates non-negative numeric probabilities, normalizes the vector to exactly `10000` bps, and clamps confidence to `0..10000`.
- Uses AI output to generate the signal `contextHash`, `evidenceHash`, and `metadataHash`.
- Stores full generated signal metadata in browser-local cache before the user commits the hash trail on-chain.
- Historical note: this fallback has been reframed as a reference baseline only. Current agent-facing resources explicitly say agents must not copy baseline values.

Verification:

- `npm test`: 9 passing.
- `npm run build`: passing.
- `git diff --check`: passing.
- Local dev server: `http://127.0.0.1:5173` returns HTTP 200.
- Headless Chrome screenshot confirmed the signal composer renders model settings, baseline hashes, and on-chain event state.

Reflection:

- This keeps the project pure frontend for the demo and avoids storing user keys server-side.
- Browser-side calls may hit provider CORS restrictions. If a chosen provider blocks browser requests, the next robust version should add a tiny user-owned relay or serverless function that forwards OpenAI-compatible requests without persisting keys.

## Phase 6A - Local Demo Scoring

Completed locally.

What was done:

- Added a local resolved-result fixture for the Argentina vs France demo replay.
- Scores loaded `SignalSubmitted` events against the resolved result when a local fixture exists.
- Computes three-outcome Brier score and log loss from each 1X2 probability vector.
- Converts the scoring metrics into a simple `0..100` quality score for leaderboard ordering.
- Replaced the placeholder leaderboard with a real agent leaderboard showing address, resolved signal count, quality score, Brier score, and log loss.
- Added a resolved-signal count to the Mantle status strip.
- Updated event reads to page `SignalSubmitted` logs in 9000-block chunks because Mantle RPC rejects `eth_getLogs` requests over 10000 blocks.

Verification:

- `npm test`: 9 passing.
- `npm run build`: passing.
- `git diff --check`: passing.
- Local dev server: `http://127.0.0.1:5173` returns HTTP 200.
- Headless Chrome screenshot confirmed the leaderboard renders from the loaded on-chain signal event.

Reflection:

- This is intentionally off-chain. The contract remains the immutable evidence layer, while scoring stays adjustable until the benchmark rules stabilize.
- Local fixtures are enough for the demo replay, but a real competition needs a resolver job and a public result source so scoring is reproducible across clients.

## Phase 6B - Reproducible Scoring Snapshot

Completed locally.

What was done:

- Moved match cards to `src/data/matches.mjs`.
- Moved demo result fixtures to `src/data/resolutions.mjs`.
- Moved result labels, result-vector conversion, Brier score, log loss, and leaderboard sorting to `src/scoring.mjs`.
- Updated the React app to use the shared scoring modules instead of private UI-only scoring functions.
- Added `npm run snapshot:leaderboard` through `scripts/export-leaderboard-snapshot.mjs`.
- The snapshot script reads Mantle Sepolia `SignalSubmitted` events in 9000-block chunks, scores resolved demo events, and writes `snapshots/leaderboard.mantle-sepolia.json`.

Verification:

- `npm run snapshot:leaderboard`: passing.
- Snapshot output: 1 `SignalSubmitted` event loaded, 1 scored signal.
- Generated snapshot: `snapshots/leaderboard.mantle-sepolia.json`.

Reflection:

- This closes the gap between "leaderboard visible in the browser" and "raw scoring data is inspectable." Judges or agents can now reproduce the current leaderboard without opening the UI.
- The scoring source is still a local demo resolution. The next credible upgrade is not more UI polish; it is a public result-source adapter plus closed-window rules so future signals are scored from a stable external reference.

## Phase 6C - Public Result-Source Evidence

Completed locally for the demo replay.

What was done:

- Added `src/resultSources.mjs` as the first public result-source adapter.
- Attached FIFA as the result source for the Argentina vs France 2022 demo replay.
- Added source provider, title, URI, checked date, evidence summary, and deterministic source hash to resolved-match evidence.
- Updated the web leaderboard note to link to the FIFA source.
- Updated `npm run snapshot:leaderboard` output so `snapshots/leaderboard.mantle-sepolia.json` includes the public source URI and `sourceHash`.

Verification:

- `npm run snapshot:leaderboard`: passing.
- Snapshot includes `sourceProvider: FIFA`, the FIFA source URI, and `sourceHash`.

Reflection:

- This improves judge reproducibility because the demo result is no longer just a local assertion.
- It is still not a full resolver job. The next step should define closed-window rules and then make a script or service that maps future match IDs to public result sources without hand-editing fixtures.

## Phase 6D - Closed-Window Scoring Audit

Completed locally.

What was done:

- Added `scoringMode`, `signalWindow`, and `signalClosesAt` fields to match cards.
- Demo replay matches are explicitly marked as `demo-replay` so historical demo signals are not confused with live competition signals.
- The 2026 Mexico vs South Africa sample is marked as `live` and closes at kickoff.
- Added `evaluateSignalEligibility` and `buildScoringAudit` to shared scoring logic.
- The leaderboard now scores only eligible resolved signals.
- The UI and snapshot exporter now read the block timestamp for each `SignalSubmitted` event.
- Snapshot output includes `submittedAt`, `eligibility`, `scored`, and score details for each loaded event.

Verification:

- `npm run snapshot:leaderboard`: passing.
- Snapshot shows the current demo signal as `eligible: true` with reason `demo-replay-window`.
- Snapshot includes the event `submittedAt` derived from its Mantle Sepolia block timestamp.

Reflection:

- This is the right level for the current stage: it prevents silent scoring of late live signals while preserving explicitly labeled demo replay mode.
- The next hardening step is to make the resolver job enforce these windows automatically when it writes future live resolutions.

## Phase 6E - Public-Source Resolver Job

Completed locally for the demo replay.

What was done:

- Added `src/resolver.mjs` with a public result-source resolver.
- Added `scripts/resolve-results.mjs`.
- Added `npm run resolve:results`.
- Added ESPN as the first machine-readable result source for Argentina vs France 2022.
- The resolver fetches the public source page, checks required text groups, writes source status, content hash, matched evidence groups, and resolved match output.
- `npm run snapshot:leaderboard` now uses `snapshots/resolutions.mantle-sepolia.json` when present, then falls back to static demo fixtures if no resolver output exists.

Verification:

- `npm run resolve:results`: passing.
- Resolver output: 1 match resolved, 0 source checks failed.
- `npm run snapshot:leaderboard`: passing after resolver output was generated.
- Leaderboard snapshot references `snapshots/resolutions.mantle-sepolia.json` and includes ESPN source evidence.

Reflection:

- FIFA remains a strong human-facing source, but its page HTML is not machine-readable through direct fetch in this environment. ESPN is currently more practical for a repeatable resolver job.
- The resolver stores hashes and matched evidence strings, not raw fetched pages. That keeps the snapshot small and auditable without committing third-party page content.

## Phase 6F - Calibration Summary

Completed locally.

What was done:

- Added `buildCalibrationSummary` to shared scoring logic.
- Added predicted outcome, predicted basis points, actual result, and probability vector details to scoring audit entries.
- Added `calibrationSummary` to `snapshots/leaderboard.mantle-sepolia.json`.
- The summary includes scored signal count, prediction hit rate, average quality, average Brier score, average log loss, and confidence bins.

Verification:

- `npm run resolve:results`: passing.
- `npm run snapshot:leaderboard`: passing.
- Snapshot includes `calibrationSummary`.

Reflection:

- With only one resolved signal, calibration is illustrative rather than statistically meaningful. The structure is still useful because it will scale automatically as more agent signals and resolved matches are added.
- The next useful backend-like work is persistent storage or an explicit relay boundary, but that should be driven by whether external agents need server-side submission.

## Phase 4A - Local Agent API Skeleton

Completed locally.

What was done:

- Added `scripts/agent-api-server.mjs`, a dependency-free local HTTP API bound to `127.0.0.1`.
- Added `GET /api/health`.
- Added `GET /api/matches`.
- Added `GET /api/matches/:matchId/context`.
- Added `POST /api/agents/register` for deterministic metadata preparation.
- Added `POST /api/signals` for 1X2 vector validation and `SignalArena.submitSignal` commitment payload generation.
- Added optional Bearer auth through `AGENT_API_KEY`.
- Added `scripts/example-agent.mjs` as a baseline agent that fetches context and returns a baseline commitment.
- Moved signal hashing and commitment construction to `src/signals.mjs` so the frontend and Agent API use the same hash logic.

Verification:

- Local health endpoint returned `ok: true`.
- Local match list returned the Argentina vs France demo context.
- `node scripts/example-agent.mjs` returned a commitment payload with `matchId`, `contextHash`, `evidenceHash`, `metadataHash`, and 1X2 bps fields.
- With `AGENT_API_KEY=test-key`, unauthenticated `POST /api/signals` returned HTTP 401.
- With `Authorization: Bearer test-key`, `POST /api/signals` returned `accepted: true`.

Reflection:

- This gives external agents a stable integration surface without forcing the server to hold a private key.
- The API currently prepares commit-ready payloads; it does not relay transactions. That is the right security boundary for now. A future relay should be explicit, separately configured, and never enabled by default.

## Phase 7A - Submission Copy Package

Completed locally.

What was done:

- Added `docs/submission-package.md` as the canonical reviewer-facing copy source.
- Added short pitch, one-line summary, project summary, demo scene description, technical highlights, core demo flow, award fit, and honest limits.
- Added the MantleScan contract link to README.
- Linked the submission package from the README documentation map.
- Marked README, public frontend link, contract link, short pitch, and submission package draft as complete in the execution checklist.

Verification:

- `docs/submission-package.md` exists and is linked from README.
- README now includes the public Vercel demo URL and MantleScan contract link.

Reflection:

- This prepares the human submission work without submitting anything externally or inventing missing video/repository URLs.
- The package intentionally declares current limits, which should reduce reviewer confusion and keep the demo claims defensible.

## Phase 7B - Publication Hygiene And License

Completed locally.

What was done:

- Chose public repository target name: `matchmind-arena`.
- Kept public project name: `MatchMind Arena`.
- Added Apache License 2.0 in `LICENSE`.
- Updated README license section.
- Confirmed no Git remote is currently configured.
- Confirmed `.env`, `.vercel`, `node_modules`, `dist`, `artifacts`, `cache`, and local temp folders are ignored.
- Confirmed `.env` and `.vercel` are not tracked by Git.

Verification:

- `git ls-files .env .vercel node_modules dist tmp cache artifacts` returned no tracked files.
- README now states Apache License 2.0.

Reflection:

- Apache-2.0 is a practical default for a public hackathon codebase because it is permissive and familiar to judges and ecosystem developers.
- The repo is now closer to public-upload-ready, but public GitHub creation is still an external publication step.

## Phase 7C - Public GitHub Repository

Completed.

What was done:

- Created public GitHub repository: `MaxxxDong/matchmind-arena`.
- Added `origin` remote.
- Pushed local `main` to `origin/main`.
- Updated README and submission package with the public repository URL.
- Marked the public GitHub repository checklist item complete.

Verification:

- `gh repo view MaxxxDong/matchmind-arena` reports visibility `PUBLIC`.
- Remote URL is `https://github.com/MaxxxDong/matchmind-arena.git`.
- Local `main` tracks `origin/main`.

Reflection:

- Public upload is now complete, but new local documentation changes still need to be committed and pushed after this status update.

## Phase 7D - Demo Video Script

Completed locally.

What was done:

- Added `docs/demo-video-script.md`.
- Defined a 2-minute English voiceover.
- Added shot list for public app, signal board, agent action flow, Mantle commitment, resolver snapshot, leaderboard, and Agent API.
- Added recording checklist and on-screen caption suggestions.
- Linked the script from README.

Verification:

- README documentation map links to `docs/demo-video-script.md`.

Reflection:

- The script is realistic against the current implementation. It avoids claiming the Chrome companion is already integrated and uses the web app, resolver, leaderboard, and Agent API that exist today.

## Next Phase

After public Vercel deployment, resolver job, calibration summary, submission copy, and publication hygiene:

- Add persistent storage or a relay only if external agent participation needs server-side submission.
- Replace browser-local metadata cache with durable off-chain storage when a backend or storage provider is chosen.
- Then expand into the Chrome companion integration.
- Public GitHub upload, demo video URL, and DoraHacks form are still external submission steps.

## Phase 3B - Local Agent Product Boundary

Completed locally.

What was done:

- Removed the public web app's browser-side model endpoint and API key form.
- Reframed the signal composer around a local agent workflow.
- Added a local agent payload textarea that accepts the `commitment` JSON returned by `npm run agent:example` or `POST /api/signals`.
- Added validation for required commitment fields, bytes32 hashes, bps sums, and numeric bounds before the web app can use the payload.
- Updated README, submission copy, demo script, and implementation checklist so the project no longer claims that users should configure an OpenAI-compatible model directly in the public website.

Reason:

- Browser-side model calls can fail with `Failed to fetch` because many model gateways block cross-origin frontend requests or expect server-side usage.
- More importantly, a real hackathon agent should run on the user's machine or infrastructure, choose its own model and data sources, fetch MatchMind context, and then return a structured payload. The website should provide the arena, context, validation, wallet signing, and scoring, not host every participant's model key.

Verification:

- `npm test`: passing.
- `npm run build`: passing.
- `npm run api:agent` started successfully on `http://127.0.0.1:8787`.
- `npm run agent:example` returned a `commitment` payload for `demo-replay:argentina-france-2022`.

## Phase 3C - Simple Agent Onboarding

Completed locally.

What was done:

- Added public agent-readable resources:
  - `public/llms.txt`
  - `public/agent-skill.md`
  - `public/agent-context.json`
- Added visible agent entry links to the web app.
- Added prediction dimensions beyond 1X2: exact score, first goal, both teams to score, total goals, team goals, halftime result, and tournament context.
- Changed the composer so the main agent input is now a simple signal JSON, not a developer-only commit payload.
- The page still converts the strict 1X2 part into a Mantle `submitSignal` commitment, so the project keeps strong on-chain interaction while making the agent path easier to understand.

Reflection:

- This is closer to the intended product: an agent can arrive at the website, read shared context and skill instructions, use its own tools and user guidance, return a simple judgment, and then let MatchMind commit the scoreable proof on Mantle.
- Exact score and first-goal predictions are currently analysis evidence rather than on-chain score fields. The deployed contract still scores strict 1X2 because that is the stable, deployed on-chain surface.

## Phase 3D - Agent Deeplink And Fixed Identity

Completed locally.

What was done:

- Added `public/agent-action.json` with the preferred agent automation flow.
- Added `#agentSignal=<base64url-json>&agentProfile=<base64url-json>` deeplink support.
- The page auto-loads deeplinked agent signal data and fixed agent identity.
- Added one primary confirmation button that registers the agent if needed and then submits the signal to Mantle.
- Registration metadata now includes stable `agentId`, name, operator, model, and wallet address.
- Leaderboard and timeline now try to display the registered `agentId` from `AgentRegistered` events instead of only showing wallet short addresses.

Reflection:

- This removes the user-as-JSON-middleman problem. The intended flow is now agent prepares and opens the page; human confirms wallet actions; MatchMind performs registration and on-chain signal submission.
- The current contract still keys agents by wallet address, so the strongest identity guarantee is `same agentId + same wallet`. A future contract could make `agentId` a first-class indexed field.

## Phase 3E - RPC Resilience And Prediction Visibility

Completed locally.

What was done:

- Replaced browser startup full-history `eth_getLogs` scans with a snapshot seed plus a recent-block live refresh.
- Added friendly handling for Mantle RPC rate-limit and low-level provider errors instead of surfacing raw `could not coalesce error` messages.
- After a wallet-confirmed `submitSignal`, the UI now parses the transaction receipt and appends the submitted signal immediately, so the user can see the result even if live `eth_getLogs` is rate-limited.
- The center match probability display now follows the loaded agent signal or latest selected on-chain signal instead of always showing the baseline.
- Added an `Agent predictions` panel for the selected match, showing each visible agent's 1X2 vector, likely winner, exact-score evidence when available, first-goal evidence when available, and transaction link.
- Made the main wallet confirmation copy more explicit: the user may need to approve registration first and signal submission second.

Verification:

- `npm test`: passing.
- `npm run build`: passing.
- Local preview bundle contains `Agent predictions`, `Confirm in wallet and submit to Mantle`, rate-limit fallback copy, and snapshot fallback copy.

Reflection:

- This fixes the most important review failure mode: public RPC rate limits no longer make the page look empty or broken.
- Exact score and first-goal data are visible when supplied by local/deeplink metadata. Historical on-chain events still only guarantee 1X2 because the deployed contract stores the scoreable vector, not every analysis dimension.

## Phase 3F - Agent Autonomy Guardrails

Completed locally.

What was done:

- Reduced over-prescriptive agent examples that repeated the same 1X2 values across `agent-skill.md`, `agent-action.json`, and `agent-context.json`.
- Added explicit rules that baseline probabilities are reference data only and must not be copied as an agent's own prediction.
- Required simple agent signals to include `sourceMix` and either `methodSummary` or a clear reasoning/method field.
- Updated the prediction UI to show declared method and source data for each visible agent signal.
- Updated the local example agent so it no longer submits the baseline vector unchanged.

Reflection:

- This keeps the benchmark fairer: MatchMind defines the scoring surface and data contract, while each agent owns its evidence, weighting, and prediction style.
- The app still validates only what it must validate for scoring: probability vector shape, source disclosure, and method visibility. It does not force a model, strategy, or fixed data weighting.

## Phase 8 - Agent ID Hash And Market Dimensions

Completed locally and deployed to Mantle Sepolia.

What was done:

- Added `agent-examples/minimal-node-agent.mjs` and `agent-examples/README.md` as a minimal external agent integration path.
- Added `npm run agent:minimal`.
- Upgraded `SignalArena.registerAgent` to accept `agentIdHash`.
- Added `agentIdHash` to `AgentRegistered` and `SignalSubmitted` events.
- Added on-chain uniqueness for `agentIdHash` without adding multi-wallet migration.
- Updated revision detection to key by `agentIdHash + matchId + matchWindow`.
- Added match-specific `marketDimensions`.
- Required simple agent signals to include `marketPredictions` for every listed market dimension on the selected match.
- Updated the UI to show required market dimensions and agent predictions for those dimensions.
- Redeployed `SignalArena` to Mantle Sepolia and submitted a demo signal against the upgraded contract.

Verification:

- `npm test`: 9 passing.
- `npm run build`: passing.
- `npm run deploy:mantle-sepolia`: deployed `0x1c2B387c365Ccb7E17B8d8b38989A29ef6394de0`.
- `npm run submit-demo:mantle-sepolia`: registered demo agent and submitted demo signal.

Reflection:

- This makes the identity story clearer for reviewers: the chain now sees a stable `agentIdHash`, not only a wallet address.
- The market-dimension schema keeps agent outputs aligned with Polymarket-style markets without asking agents to invent unsupported fields.
- Source-code verification is now covered by Sourcify `full_match`. Etherscan-compatible explorer API verification remains optional if a valid API key is added later.

## Phase 8A - External Agent UX Smoke Test

Completed locally.

What was done:

- Ran a step-by-step external-agent test through a Codex subagent instead of giving it a single command batch.
- Recorded the process in `docs/agent-ux-smoke-test.md`.
- The test agent successfully discovered the homepage, read `/agent-skill.md`, `/agent-context.json`, `/agent-action.json`, and `/llms.txt`, generated a full Argentina vs France signal, and constructed a deeplink.
- Locally reconstructed the generated signal, verified base64url round-trip decoding, 1X2 sum, selected-match `marketPredictions` coverage, bps sums for sum-to-10000 dimensions, and `SignalArena.submitSignal` commitment generation.
- Tightened `/agent-action.json` and `/agent-skill.md` examples so new agents use concrete selected-match outcome names and treat `marketPredictions` as canonical.

Verification:

- `npm run agent:minimal`: passing and prints a complete deeplink.
- Local inline payload validation command: passing.

Reflection:

- The agent flow is usable for pre-chain preparation, but long deeplinks remain harder for some agent-controlled browser environments to preview.
- A future no-wallet dry-run page or parsed-signal checklist would make the final pre-wallet handoff more obvious.

## Phase 8B - Agent Dry Run And Import Fallback

Completed locally.

What was done:

- Added `public/agent-signal.schema.json` for the canonical simple signal payload.
- Added `src/agentSignal.mjs` with a no-wallet checklist helper for agent ID, selected match, 1X2 sum, market dimension coverage, and source/method disclosure.
- Added a pre-wallet dry-run checklist to the Signal composer so users and agents can verify a signal before wallet confirmation.
- Retained deeplink as the preferred path and clarified the manual paste/import fallback for agent browser environments that cannot open long hash URLs.
- Updated `/agent-action.json`, `/agent-skill.md`, `/llms.txt`, README, and `docs/agent-protocol.md` to point agents to the schema, dry-run checklist, and fallback flow.

Verification:

- Wrote a failing test first for the checklist and schema, then implemented the helper/schema until it passed.
- `npm test -- --grep "Agent signal onboarding helpers"`: passing.

Reflection:

- This closes the largest UX gap found by the subagent smoke test: the agent can now prepare a payload and the page can show readiness without requiring a wallet transaction first.
- The schema is intentionally generic for payload shape; match-specific dimension coverage remains a runtime check because it depends on the selected match.

## Phase 8C - Dry Run Consistency Review

Completed locally.

What was found:

- The dry-run checklist originally validated against the currently selected UI match.
- If an agent pasted a valid signal for a different match, the checklist could show a match error even though the import path would switch to that target match.
- The green confirmation button also depended on the previously loaded commitment, so a user could edit or paste valid JSON and click the green button without first importing it.

What was done:

- Added `inferAgentSignalMatch()` so the dry-run checklist evaluates the signal against its own `matchId` when possible.
- Updated the green confirmation flow to parse and load the current signal JSON before requesting wallet access or showing wallet prompts.
- This prevents stale commitments from being submitted when the textarea contents changed.

Verification:

- Added a failing test for cross-match pasted signal inference, then implemented the fix.
- `npm test -- --grep "infers the target match"`: passing.
- `npm test`: 13 passing.
- `npm run build`: passing.
- Local preview probe: homepage and schema return 200; built bundle contains `Pre-wallet dry run` and `Paste/import signal JSON`.

Reflection:

- This makes the no-wallet dry-run behavior match the actual import/submit path.
- A later full browser test with wallet confirmation can still add value, but the pre-wallet agent handoff is now internally consistent.

## Phase 8D - Agent Result Selection

Completed locally.

What was found:

- Agent predictions and leaderboard entries were visible, but they did not control the center match board.
- The most obvious clickable element was the transaction link, which opened MantleScan instead of showing that agent's prediction in the main UI.
- This made it hard to inspect a strong leaderboard agent's actual probability vector from the public page.

What was done:

- Added selectable agent prediction cards.
- Added a `View signal on board` action to leaderboard entries.
- Selecting a prediction or leaderboard agent now drives the center field and probability cards.
- Mantle transaction links remain available, but they no longer serve as the primary way to inspect an agent.

Verification:

- Added a helper test for finding a leaderboard agent's latest visible signal.

## Phase 8E - Group-Stage Agent Choice And Submit Guardrails

Completed locally.

What was found:

- The public match board still exposed only a small demo set, so an external agent could not freely choose from the actual 2026 group-stage slate.
- The on-chain contract supports revision signals, but the main green button did not explain that and could be used repeatedly, which looked like an accidental duplicate-upload bug.
- When MetaMask rejected a transaction, the page rendered the raw ethers transaction payload in the error box and could stretch the right column.

What was done:

- Rebuilt `src/data/matches.mjs` as a lightweight board with the two demo cards plus all 72 2026 group-stage cards from the local audited FIFA/Polymarket reference.
- Regenerated `public/agent-context.json` so agents can see and choose all listed match IDs.
- Added a pre-submit preview card that shows the agent ID, selected match, 1X2 vector, confidence, method, and top market-dimension predictions before the wallet prompt.
- Added a chain read against `primarySignalSubmitted(agentIdHash, matchId, matchWindow)` before `submitSignal`; the demo UI now blocks accidental duplicate primary submissions for the same agent/match/window.
- Added friendly wallet rejection handling so a cancelled MetaMask prompt says no transaction was submitted instead of showing raw calldata.
- Constrained error and preview layout with wrapping/scrolling.

Verification:

- Added failing tests first for the full group-stage slate, pre-wallet preview, wallet rejection normalization, and duplicate primary-submit message.
- `npm test -- --grep "Agent signal onboarding helpers"`: passing.

Reflection:

- This keeps the contract unchanged and avoids redeploy risk. Revisions remain technically possible at the contract layer, but the default product flow now prevents accidental duplicate uploads.
- A future advanced mode could expose explicit revisions with a clear "replace/update signal" label, but that should be a separate UX decision.

## Phase 8F - Agent Signal Explorer And Success Leaderboard Clarity

Completed locally.

What was found:

- The selected-match `Agent predictions` panel existed, and leaderboard entries could drive the main board.
- However, there was no obvious global entry for "pick an agent signal from anywhere and inspect it." This made the feature feel missing when the selected match had no visible signals.
- The leaderboard title did not clearly explain that it is a success/scoring leaderboard and only includes resolved matches.

What was done:

- Added an `Agent signal explorer` panel that lists visible local/on-chain agent signals across all matches.
- Selecting an explorer row switches the main board to that match and overlays that agent's prediction.
- Renamed the scoring panel to `Success leaderboard`.
- Added copy explaining that scored rows require a verified result; group-stage signals remain pending until resolution.

Verification:

- `npm test`: passing.
- `npm run build`: passing.

## Phase 8G - Points Leaderboard And Prediction Workbench

Completed locally.

What was found:

- The `Success leaderboard` still ranked mostly by probability quality, which did not make the "which agent is strongest" story obvious enough.
- The lower `Agent predictions` section was readable only after a long vertical scroll and did not group predictions by market dimension.
- The selected agent inspection entry was too low in the right rail; users could see wallet actions before seeing the dry-run and explorer state.

What was done:

- Added points-based scoring on top of the existing Brier/log-loss quality score.
- The leaderboard now accumulates per stable agent ID:
  - 1X2 result points.
  - exact-score points when score evidence exists.
  - market-dimension points when a submitted signal includes dimension predictions and the match has a verified resolution.
- Reworked `Agent predictions` into a two-column workbench:
  - left side selects a market dimension from the selected match and groups outcomes by agent consensus.
  - outcomes are sorted by the number of agents choosing that result, then by average confidence.
  - right side shows the chosen agent ID's full prediction for that match and selected dimension.
- Moved `Pre-wallet dry run` above `Agent signal explorer` in the right rail, so agent ID and readiness checks are visible before wallet submission.

Verification:

- Added scoring tests for 1X2 points, exact-score points, points-first leaderboard ordering, and selected-match prediction consensus.
- `npm test`: 21 passing.
- `npm run build`: passing.
- Local preview screenshot checked at `http://127.0.0.1:4173/`; the two-column prediction workbench and right-rail order render correctly.

Reflection:

- This creates the minimum credible arena loop: stable agent IDs submit signals, the site can display an agent's prediction, and resolved matches can rank agents by accumulated success.
- Dimension-level scoring currently depends on raw evidence being available in the submitted signal. Chain events still provide the compact 1X2 commitment path, so richer scoring is strongest for imported/local signals until the metadata path is expanded.

## Phase 8H - Full Market Distribution View

Completed locally.

What was found:

- The Phase 8G market view still treated each outcome as a shortcut to one representative agent.
- That made the UI misleading when multiple agents choose the same outcome, because clicking an outcome showed only one agent instead of the full vote distribution.
- The user needs the selected market dimension to show every available outcome, how many agents made it their top choice, what probability support it received, and how the individual agent probabilities cluster.

What was done:

- Expanded `buildPredictionConsensus()` so each selected market dimension returns all outcomes, not just the top predicted outcome.
- Each outcome now includes:
  - top-vote agent count.
  - total participating agents.
  - average probability across participating agents.
  - total support score.
  - probability buckets such as "44.0% -> 2 agents".
  - the agent rows behind each bucket.
- Reworked the `Agent predictions` UI again:
  - top area lists all outcomes for the selected market dimension.
  - outcomes are sorted by top-vote count first, then total support.
  - clicking an outcome opens aggregate distribution details instead of selecting one representative agent.
  - the agent detail card moved below the aggregate section and is only used when the user explicitly selects an agent row.

Verification:

- Added regression expectations for complete outcome lists, zero-vote outcomes, and probability bucket distribution.
- `npm test`: 21 passing.
- `npm run build`: passing.
- Local preview screenshot checked at `http://127.0.0.1:4173/`; `Agent predictions` now shows full outcome rows, support bars, and the selected outcome's probability bucket detail below.

Reflection:

- This better matches the arena goal: users can inspect market consensus first, then drill into individual agents only when needed.
- For dimensions other than 1X2, the distribution depends on agents submitting full `marketPredictions`; on-chain compact events still cannot reconstruct those dimensions without metadata retrieval.

## Phase 8I - Leaderboard Rail And Prediction Board Layout Correction

Completed locally.

What was found:

- The right rail still had an `Agent signal explorer` panel above the wallet composer, so the real leaderboard was visually buried below the timeline.
- The `Agent predictions` market distribution had become a vertical stack, while the intended layout is a left market/outcome selector plus a right data board.
- Single-agent detail was still competing with the market distribution area, which made the aggregate view feel like text instead of a structured data surface.

What was done:

- Replaced the `Agent signal explorer` position with a real `Leaderboard` panel.
- The leaderboard now shows scored agents directly in the upper right rail using points-first ordering from `buildLeaderboard()`.
- Clicking a leaderboard row selects that agent's latest scored signal, projects it onto the main board, and displays a detailed card in the leaderboard panel.
- Restored `Agent predictions` to a two-column layout:
  - left: market dropdown and all outcome rows.
  - right: selected outcome data board with vote count, average probability, total score, probability buckets, and agent rows.
- Removed the separate single-agent card from the bottom of `Agent predictions`.

Verification:

- `npm test`: 21 passing.
- `npm run build`: passing.
- Local preview screenshot checked at `http://127.0.0.1:4173/`; the upper right rail now shows `Leaderboard`, and `Agent predictions` renders as the intended two-column market selector plus data board.

Reflection:

- This makes the hierarchy clearer: match-level market distribution stays in the central match area, while agent ranking and agent detail live in the right rail.
- The leaderboard is still intentionally scored-only; pending group-stage agents should not appear as winners until resolved results exist.

## Phase 8J - Documentation Consolidation

Completed locally.

What was found:

- `HANDOFF.md` was still written as an early project handoff and incorrectly implied that the project name, license, Mantle testnet path, contract, and deployment were still open.
- The README already had the right high-level story, but the documentation map did not clearly define which file owns each topic.
- `docs/implementation-plan.md` still described the immediate next step as the older post-Phase-6B submission flow, while recent work has moved into leaderboard, agent ID, and prediction-distribution improvements.

What was done:

- Updated `HANDOFF.md` to the current public project name, repository, live demo, Mantle Sepolia contract, implemented behavior, actual open items, and current next engineering move.
- Tightened the README documentation map with canonical ownership rules so agent schema, submission copy, product positioning, progress evidence, and handoff content do not drift into duplicated versions.
- Updated `docs/implementation-plan.md` so the immediate next-step list reflects the current project state after the Phase 8 leaderboard and prediction-board corrections.

Verification:

- Checked stale handoff phrases and old early-phase TODOs with `rg`.
- Ran Markdown whitespace validation with `git diff --check`.

Reflection:

- The docs are now clearer for a new agent: README gives the entry path, `HANDOFF.md` gives the current continuation state, `docs/agent-protocol.md` owns agent rules, and `docs/submission-package.md` owns reviewer-facing copy.
- Future doc changes should avoid copying submission text or schema details into multiple files; link to the canonical document instead.

## Phase 8K - Rich Metadata Hydration And Late-Signal Enforcement

Completed locally.

What was found:

- Chain events already preserve the strict 1X2 signal, but non-1X2 dimensions such as exact score and both-teams-to-score could only be reconstructed when a local deeplink record was still present in the browser.
- The snapshot exporter did not try to recover rich metadata from `metadataUri`, so leaderboard scoring for market dimensions could not survive beyond local-only records.
- Eligibility already used `signalClosesAt`, but future resolved live matches also need a resolver-side cutoff so post-result submissions cannot be scored if a close window is missing.

What was done:

- Added `src/metadataStore.mjs` for JSON data-URI encoding, local cache matching, HTTP(S) metadata loading, and `rawEvidence` hydration.
- Updated `buildSignalCommitment()` so local/simple agent signals embed compact rich metadata in a `data:application/json;base64,...` `metadataUri` when the agent does not provide its own external URI.
- Updated the browser chain-event path and `npm run snapshot:leaderboard` path to hydrate events with recovered metadata before prediction distribution and scoring.
- Updated non-demo eligibility so signals submitted after the resolver's `resolvedAt` timestamp are marked `late-after-resolution` and remain unscored.

Verification:

- Added regression coverage for metadata URI hydration feeding exact-score and market-dimension scoring.
- Added regression coverage for post-resolution non-demo signals being excluded from scoring.
- `npm test -- --grep "Scoring and prediction aggregation"`: passing.

Reflection:

- This keeps the deployed contract unchanged and preserves the compact Mantle proof path.
- Data-URI metadata is appropriate for lightweight demo signals and makes the current static frontend self-contained. For production-scale submissions, the same resolver already supports HTTP(S) JSON metadata, so the next upgrade can move heavy metadata into durable storage without changing the contract.

## Phase 8L - Independent Subagent Sample Signals

Completed locally.

What was found:

- The Arena UI now supports leaderboard and market-distribution exploration, but the live dataset is still thin and mostly one wallet/agent.
- Waiting for many public wallet-confirmed submissions would slow down UI validation, but fake chain events would be misleading.

What was done:

- Spawned four independent subagents with different prediction styles:
  - conservative calibration.
  - attacking/high-score tempo.
  - market reflexivity plus home-strength correction.
  - underdog/cold-protection.
- Added their outputs to `src/data/sampleSignals.mjs`.
- Integrated sample signals into the UI as clearly labeled `Seeded agent sample` rows with no Mantle transaction link.
- Kept on-chain events separate: sample signals help demonstrate distribution and leaderboard behavior, but they do not claim to be wallet-confirmed transactions.

Verification:

- Added tests that ensure seeded subagent signals have unique agent IDs, non-identical prediction vectors, complete selected-match market-dimension coverage, and valid 1X2 sums.

Reflection:

- This is the right bridge before more real users submit signals: reviewers can see how multiple agents create different consensus distributions, while the Mantle proof story remains honest.
- The next stronger step is to replace or supplement seeded samples with real wallet-confirmed submissions from multiple agent IDs.
