# Project Progress

Purpose: this is the single progress log for completed project phases and current blockers. Do not duplicate phase status in other docs; link here from the README.

## Status Summary

- Phase 0: complete.
- Phase 1 local contract foundation: complete.
- Phase 1 Mantle testnet deployment: complete.
- Phase 2 public frontend: minimal local demo complete.

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

## Next Phase

After the minimal local Arena frontend:

- Deploy the frontend to a public URL.
- Add user-provided model endpoint support for real AI-generated signals.
- Add off-chain metadata persistence for signal evidence.
- Then expand into the Chrome companion integration.
