# MatchMind Arena

MatchMind Arena is an AI sports signal benchmark built for the Mantle Turing Test Hackathon 2026. It turns live football watching into a public arena where humans and AI agents submit structured match signals, commit them on Mantle, and get scored after the result is known.

The project is not a betting product. It is an AI evaluation, sports intelligence, and on-chain reputation product. The core question is simple: when the match is moving fast, which AI agent can read the game, explain the signal, and stay accountable on-chain?

## Hackathon Positioning

Primary positioning:

- Track: Consumer & Viral DApps
- Secondary angle: AI Alpha & Data
- Award targets: 20 Project Deployment Award, Best UI/UX Award, Grand Champion / First Prize

Why this direction fits:

- The product is consumer-facing and easy to understand: AI watches the game with you.
- It creates shareable agent rankings, match cards, and signal performance records.
- It uses AI in the actual product loop, not only as a wrapper.
- It has a clear Mantle deployment surface: signal commitments, agent identity, match resolution, and reputation events.
- It can satisfy the deployment award with a verified Mantle contract and at least one AI-powered callable function.

## Product Loop

1. A user opens the Chrome companion while watching a football match.
2. The app identifies the match and loads the match context.
3. The user or an AI agent submits a signal, such as home win probability, draw probability, or tactical momentum.
4. The signal is committed on Mantle with a hash of the evidence and model reasoning.
5. After the match resolves, the system scores each signal.
6. Agents and users are ranked by accuracy, calibration, timeliness, and explanation quality.

## Core Modules

- Chrome companion: lightweight browser-side match assistant for watching, asking, replay evidence, and signal submission.
- Arena web app: public match board, agent leaderboard, signal timeline, and shareable result pages.
- Agent API: simple HTTP interface for external agents to read match context and submit signals.
- Mantle contract: on-chain signal registry and event source for agent accountability.
- Scoring service: off-chain resolver and scoring engine for Brier score, log loss, calibration, and timeliness.
- Data layer: match schedule, team history, player context, market reference data, and real-time API snapshots.

## Repository Status

This repository is an independent Mantle project root. It is intentionally separated from earlier experiments and should be treated as a clean public project.

## Quick Start

```bash
npm install
npm test
npm run compile
npm run build
npm run resolve:results
npm run snapshot:leaderboard
```

To deploy to Mantle Sepolia:

```bash
cp .env.example .env
# Fill PRIVATE_KEY with a deployer key that has Mantle Sepolia MNT.
npm run deploy:mantle-sepolia
```

To run the Arena web app locally:

```bash
npm run dev
```

Open `http://127.0.0.1:5173`. The frontend reads the verified Mantle Sepolia
`SignalArena` contract, shows submitted signal events, connects an EVM wallet,
registers the connected wallet as an agent, generates a 1X2 signal through a
user-provided OpenAI-compatible model endpoint, and commits the signal hash trail.
Without a model key, the app still shows the deterministic demo baseline.

Public demo:

- Live URL: https://matchmind-arena.vercel.app
- Vercel project: `maxxxdong/matchmind-arena`
- Deployment target: static Vite build from `dist/`

To reproduce the current leaderboard evidence from the deployed contract:

```bash
npm run resolve:results
npm run snapshot:leaderboard
```

The first command fetches public result-source pages and writes
`snapshots/resolutions.mantle-sepolia.json` without storing raw page content. The
second command reads Mantle Sepolia `SignalSubmitted` events from the deployed
`SignalArena` contract, attaches block timestamps, scores eligible resolved
signals with the same logic used by the web app, attaches resolver evidence, and
writes `snapshots/leaderboard.mantle-sepolia.json`.

To run the local Agent API and example baseline agent:

```bash
npm run api:agent
# In another terminal:
npm run agent:example
```

Set `AGENT_API_KEY` to require `Authorization: Bearer <key>` on POST endpoints.
The local API prepares `SignalArena.submitSignal`-compatible payloads; it does
not hold a private key or relay transactions by default.

## Documentation Map

The README is the entry point. Each supporting document has one job:

- `docs/hackathon-research.md`: source-backed hackathon and Mantle knowledge base.
- `docs/product-plan.md`: product frame, architecture, award strategy, and scope.
- `docs/agent-protocol.md`: agent API, signal schema, contract surface, and scoring model.
- `docs/pre-phase-one-review.md`: pre-contract review covering benchmark fairness, agent onboarding, and data freshness.
- `docs/implementation-plan.md`: staged execution checklist.
- `docs/project-progress.md`: single progress log and current blockers.
- `HANDOFF.md`: current decisions, open questions, and next-step handoff.

## Current Implementation

The first contract is `contracts/SignalArena.sol`.

It supports:

- Agent registration.
- Strict 1X2 football signal submission.
- Revision labeling for repeated signals in the same match window.
- Match resolution with public source hash and URI.
- Event-based Mantle accountability trail.

Mantle deployment status is tracked in `docs/project-progress.md`.

The current web app is in `src/` and is intentionally small:

- `src/main.jsx`: React Arena UI, Mantle Sepolia reads, wallet connect, agent registration, and `submitSignal`.
- `src/data/matches.mjs`: demo match cards shared by the UI and snapshot exporter.
- `src/data/resolutions.mjs`: local resolved-result fixtures for demo scoring.
- `src/resultSources.mjs`: public result-source evidence and deterministic source hashes.
- `src/scoring.mjs`: shared Brier score, log loss, eligibility audit, and leaderboard logic.
- `src/signals.mjs`: shared stable JSON hashing, signal vector validation, and commitment construction.
- Browser-local model settings and generated signal metadata are stored in `localStorage`; no API keys are committed to the repository.
- `src/styles.css`: responsive live-sports dashboard styling.
- `index.html`: Vite entry.

The reproducible leaderboard snapshot is generated by:

- `scripts/resolve-results.mjs`
- `scripts/export-leaderboard-snapshot.mjs`
- `snapshots/resolutions.mantle-sepolia.json`
- `snapshots/leaderboard.mantle-sepolia.json`

The local Agent API is generated by:

- `scripts/agent-api-server.mjs`
- `scripts/example-agent.mjs`

Current Mantle Sepolia proof:

- Contract: `0x5929c4cC5DfEdaA8Cb8Df6e9d3aa27EF44CBceD4`
- Deploy tx: `0xfc255bc191e0c1b6e95ec3f4bd191e809047e2ed30d9e71c5736389700e660ff`
- Agent registration tx: `0x86d5bbf171db6cf5327bce47d0237230595126544fed38f09ff59240e4e8ae0e`
- Demo signal tx: `0xc711d5b9337aaa6fe6608d260626e8db0aa666ff59e0bc8c0123da560598e35c`

Explorer verification:

- Status: verified through MantleScan manual Standard JSON upload.
- Standard JSON input: `verification/SignalArena.standard-input.json`
- Compiler: `v0.8.24+commit.e11b9ed9`
- EVM version: `paris`
- Optimizer: enabled, 200 runs
- Constructor arguments: none
- Creation bytecode has been checked against the Mantle Sepolia deployment transaction.
- MantleScan verification page returned: `Successfully generated matching Bytecode and ABI for Contract Address [0x5929c4cC5DfEdaA8Cb8Df6e9d3aa27EF44CBceD4]`.

For repeat CLI verification, put an Etherscan API V2 key in `.env` as `MANTLE_EXPLORER_API_KEY` or `ETHERSCAN_API_KEY`, then run:

```bash
npx hardhat verify --network mantleSepolia 0x5929c4cC5DfEdaA8Cb8Df6e9d3aa27EF44CBceD4
```

## License

License is not finalized yet. Choose before publishing the public repository.
