# Hackathon Submission Package

Purpose: this is the canonical copy source for DoraHacks, demo narration, short pitch, and reviewer-facing submission fields. Do not duplicate these fields in other docs; link here instead.

## Basic Info

- Project name: MatchMind Arena
- Track: Consumer & Viral DApps
- Secondary angle: AI Alpha & Data
- Live demo: https://matchmind-arena.vercel.app
- Verified contract: https://sepolia.mantlescan.xyz/address/0x5929c4cC5DfEdaA8Cb8Df6e9d3aa27EF44CBceD4
- Contract address: `0x5929c4cC5DfEdaA8Cb8Df6e9d3aa27EF44CBceD4`
- Network: Mantle Sepolia
- Repository URL: https://github.com/MaxxxDong/matchmind-arena
- Demo video URL: TBD after recording/upload

## Short Pitch

MatchMind Arena turns live football into a public Turing test for AI agents. Fans and agents submit structured 1X2 match signals, commit the evidence hash on Mantle, and get scored after public result resolution. The product is a consumer sports cockpit, an AI benchmark, and an on-chain accountability layer in one lightweight demo.

## One-Line Summary

An AI sports signal arena where football predictions are committed on Mantle, resolved from public sources, and ranked by accuracy, calibration, and timing.

## Project Summary

MatchMind Arena is an AI sports signal benchmark for live football. A user or external agent selects a match, generates a structured 1X2 probability signal, and commits that signal to Mantle through the verified `SignalArena` contract. The contract stores compact accountability data: match ID, time window, probability vector, confidence, evidence hash, metadata hash, and transaction proof.

After a match is resolved, the off-chain resolver pulls public result sources, writes an auditable resolution snapshot, and scores agent signals with Brier score, log loss, prediction hit rate, calibration bins, and a normalized quality score. The web app shows the match board, signal timeline, leaderboard, source evidence, and Mantle transaction links.

The product is not a betting product. It is a public evaluation arena for AI judgment under uncertainty, using sports as an understandable consumer interface and Mantle as the accountability layer.

## Demo Scene Description

Open the public Arena web app and select the Argentina vs France replay card. The page shows match context, baseline probabilities, agent-readable resources, prediction dimensions, the verified Mantle contract link, loaded on-chain signal count, and a leaderboard seeded from a real `SignalSubmitted` event. An AI agent can read the visible page, `/agent-skill.md`, `/agent-context.json`, `/agent-action.json`, or `/llms.txt`, then prepare a deeplinked signal with a stable `agentId` across 1X2, exact score, first goal, goals, or tournament dimensions. The user confirms once in the wallet; MatchMind registers the agent if needed and commits the strict 1X2 part through Mantle. The demo then shows the Mantle transaction link, public result-source evidence, scoring audit, and leaderboard snapshot generated from chain events and the resolver.

## Technical Highlights

- Verified Solidity contract on Mantle Sepolia: `SignalArena`.
- On-chain signal function: `submitSignal`, accepting a strict 1X2 probability vector whose basis points must sum to 10,000.
- Agent registration and revision detection are implemented on-chain.
- Each signal commits `contextHash`, `evidenceHash`, and `metadataHash`, keeping raw model prompts and private evidence off-chain.
- Public frontend is deployed on Vercel and reads Mantle Sepolia directly from the browser.
- Agent-readable resources are exposed at `/agent-skill.md`, `/agent-context.json`, and `/llms.txt`.
- Agent action automation is exposed at `/agent-action.json`, including the deeplink format and fixed-agent identity rules.
- Prediction dimensions include 1X2 winner, exact score, first goal, both teams to score, total goals, team goals, halftime result, and tournament context.
- The public frontend does not collect model API keys; agents run locally or in user-owned infrastructure.
- Optional Local Agent API exposes match context and returns `SignalArena.submitSignal`-compatible payloads without holding private keys.
- Resolver job fetches public result sources, stores source checks and content hashes, and feeds reproducible leaderboard snapshots.
- Scoring includes Brier score, log loss, eligibility windows, prediction hit rate, confidence bins, and normalized quality score.

## Core Demo Flow

1. Open https://matchmind-arena.vercel.app.
2. Select a match card.
3. Review the match context, baseline probabilities, agent resources, and prediction dimensions.
4. Open `/agent-skill.md` and `/agent-context.json` to show how an agent can read the site directly.
5. Ask or run an agent to produce a reasoned signal JSON across one or more dimensions.
6. Preferred path: the agent opens a MatchMind deeplink with the signal and fixed `agentId` preloaded.
7. The user confirms once; the page registers the agent if needed and commits a strict 1X2 signal.
8. Open the MantleScan transaction link.
9. Reproduce scoring locally with:

```bash
npm run resolve:results
npm run snapshot:leaderboard
```

10. Inspect `snapshots/leaderboard.mantle-sepolia.json` for resolver evidence, scoring audit, calibration summary, and leaderboard output.

## Award Fit

### 20 Project Deployment Award

- Contract deployed on Mantle Sepolia.
- Contract verified on MantleScan.
- Public frontend deployed on Vercel.
- At least one AI-powered on-chain callable path exists through `submitSignal`.
- README includes setup, architecture, contract address, proof transactions, and demo URL.

### Best UI/UX Award

- Consumer-facing sports cockpit.
- Match cards, signal composer, probability bars, transaction timeline, and leaderboard are designed for non-technical review.
- Agent participation is local-first, keeping model choice, private keys, and data-search strategy outside the public website.

### Grand Champion / First Prize

- Converts a familiar real-time domain into an AI x on-chain benchmark.
- Creates reusable agent reputation from public, time-stamped, scored signals.
- Uses Mantle for accountability, not as a decorative wallet button.

## Current Limits To Declare Honestly

- The Chrome companion is planned but not yet integrated into this independent Mantle repo.
- The Agent API is local-first and does not relay transactions by default.
- The resolver currently has one machine-readable public result source for the demo replay.
- Calibration is structurally implemented, but the current snapshot has only one resolved signal.
