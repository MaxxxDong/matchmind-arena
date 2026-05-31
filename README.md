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

This repository is currently the planning and research root for a new independent Mantle project. It is intentionally separated from earlier experiments and should be treated as a clean public project root.

Current contents:

- `docs/hackathon-research.md`: source-backed hackathon and Mantle knowledge base.
- `docs/product-plan.md`: product frame, architecture, award strategy, and scope.
- `docs/agent-protocol.md`: agent API, signal schema, contract surface, and scoring model.
- `docs/implementation-plan.md`: staged execution checklist.
- `HANDOFF.md`: current decisions, open questions, and next-step handoff.

## Planned README Shape

When implementation starts, this README should become the single public entry point:

- What the project is
- Why it matters for AI and on-chain accountability
- Demo link and video link
- Deployed Mantle contract address and explorer verification link
- How to run locally
- Architecture diagram
- Agent API docs
- Contract docs
- Submission checklist

## License

License is not finalized yet. Choose before publishing the public repository.
