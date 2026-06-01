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

- `npm test`: 8 passing.
- `npm run compile`: passing.
- `npx hardhat run scripts/deploy-signal-arena.js`: passing on local Hardhat network.
- `npm audit --omit=dev`: 0 vulnerabilities.
- `npm run deploy:mantle-sepolia`: passing.
- `npm run submit-demo:mantle-sepolia`: passing.
- Deployment creation bytecode matches local Hardhat compile output.

Mantle Sepolia proof:

- Deployer / demo agent: `0xA4a5B46c6109b61337C22428556B5259185cBE5B`
- SignalArena contract: `0x5929c4cC5DfEdaA8Cb8Df6e9d3aa27EF44CBceD4`
- Deploy tx: `0xfc255bc191e0c1b6e95ec3f4bd191e809047e2ed30d9e71c5736389700e660ff`
- Agent registration tx: `0x86d5bbf171db6cf5327bce47d0237230595126544fed38f09ff59240e4e8ae0e`
- Demo signal tx: `0xc711d5b9337aaa6fe6608d260626e8db0aa666ff59e0bc8c0123da560598e35c`

Explorer verification status:

- MantleScan manual Standard JSON verification succeeded.
- Standard JSON upload file: `verification/SignalArena.standard-input.json`.
- Compiler: `v0.8.24+commit.e11b9ed9`.
- EVM version: `paris`.
- Optimizer: enabled, 200 runs.
- Constructor arguments: none.
- MantleScan returned: `Successfully generated matching Bytecode and ABI for Contract Address [0x5929c4cC5DfEdaA8Cb8Df6e9d3aa27EF44CBceD4]`.
- Hardhat verification now targets Etherscan API V2; it requires `MANTLE_EXPLORER_API_KEY` or `ETHERSCAN_API_KEY`.
- Current CLI probe reaches Etherscan V2 and fails only with `Invalid API Key`, which confirms the old HTML/V1 endpoint issue is fixed.

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
- Uses deployment block `39344371` as the event scan start to avoid slow full-chain log reads.
- Connects an EVM wallet and switches/adds Mantle Sepolia.
- Allows the connected wallet to call `registerAgent`.
- Allows a registered wallet to commit a structured demo AI 1X2 signal through `submitSignal`.
- Renders MantleScan links for contract and transaction proof.

Verification:

- `npm run compile`: passing.
- `npm test`: 8 passing.
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

What was done:

- Added user-provided OpenAI-compatible model settings in the signal composer.
- Stores `baseUrl`, `model`, and user-provided API key in the user's browser local storage only.
- Sends selected match context to `/chat/completions` and asks the model to return a strict JSON 1X2 probability vector.
- Parses model output, validates non-negative numeric probabilities, normalizes the vector to exactly `10000` bps, and clamps confidence to `0..10000`.
- Uses AI output to generate the signal `contextHash`, `evidenceHash`, and `metadataHash`.
- Stores full generated signal metadata in browser-local cache before the user commits the hash trail on-chain.
- Keeps the deterministic demo baseline as fallback when no model is configured.

Verification:

- `npm test`: 8 passing.
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

- `npm test`: 8 passing.
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
- Added the MantleScan verified contract link to README.
- Linked the submission package from the README documentation map.
- Marked README, public frontend link, verified contract link, short pitch, and submission package draft as complete in the execution checklist.

Verification:

- `docs/submission-package.md` exists and is linked from README.
- README now includes the public Vercel demo URL and verified MantleScan contract link.

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
- Added shot list for public app, signal board, model configuration, Mantle commitment, resolver snapshot, leaderboard, and Agent API.
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
- Exact score and first-goal predictions are currently analysis evidence rather than on-chain score fields. The deployed contract still scores strict 1X2 because that is the stable, already verified on-chain surface.

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
