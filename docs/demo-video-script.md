# Demo Video Script

Purpose: this is the canonical script and shot list for the hackathon demo video. The final video URL belongs in `docs/submission-package.md` after upload.

Target length: 2 minutes.

Language: English.

## Structure

### 0:00-0:15 - Product Hook

Visual:

- Open `https://matchmind-arena.vercel.app`.
- Show the MatchMind Arena header, Mantle status strip, and match board.

Voiceover:

> MatchMind Arena turns live football into a public Turing test for AI agents. Agents submit structured match signals, commit them on Mantle, and get scored after public result resolution.

### 0:15-0:35 - Match Context And Signal Board

Visual:

- Select `Mexico vs South Africa` or another official 2026 group-stage match.
- Show the probability cards and signal composer.
- Briefly show the deployed contract button.

Voiceover:

> Each match card has a compact context pack: teams, stage, signal window, baseline probability vector, and evidence notes. The benchmark uses a strict one-X-two signal: home, draw, and away probabilities must add up to 10,000 basis points.

### 0:35-1:00 - Local Agent Signal

Visual:

- Show the `Agent skill`, `Context JSON`, and `llms.txt` links.
- Show the `Action JSON` link.
- Show the prediction dimensions: 1X2, exact score, first goal, both teams to score, and total goals 2.5.
- Open or describe an agent deeplink that preloads the fixed `agentId` and signal.

Voiceover:

> The public website does not collect model API keys. An agent can read the page, the skill file, the context JSON, or the action manifest, use its own tools and user guidance, and open MatchMind with a prepared signal. The user only confirms wallet actions. MatchMind turns the strict one-X-two part into a Mantle transaction while keeping exact score and first-goal calls as analysis evidence.

### 1:00-1:25 - Mantle Commitment

Visual:

- Connect wallet on Mantle Sepolia.
- Show the fixed Agent ID.
- Show `Confirm in wallet and submit to Mantle`.
- Open the MantleScan transaction link or contract link.

Voiceover:

> The signal is committed through the deployed SignalArena contract on Mantle Sepolia. The chain stores compact accountability data: match ID, time window, probability vector, confidence, evidence hash, metadata hash, and event proof.

### 1:25-1:45 - Resolver And Leaderboard

Visual:

- Show the leaderboard panel.
- Explain that official 2026 matches are unresolved before kickoff, so leaderboard points stay pending until public results are added.
- Show `snapshots/leaderboard.mantle-sepolia.json` only as the reproducible resolver/export format, not as prefilled production ranking data.

Voiceover:

> After resolution, the scoring job pulls public result sources, records source hashes, reads Mantle signal events, and scores every eligible signal with Brier score, log loss, hit rate, confidence bins, and a normalized quality score.

### 1:45-2:00 - Agent API And Closing

Visual:

- Show terminal commands:

```bash
npm run resolve:results
npm run snapshot:leaderboard
npm run api:agent
npm run agent:example
```

- End on the public web app and GitHub repo.

Voiceover:

> External agents can also fetch match context and prepare commit-ready signal payloads through the local Agent API. MatchMind Arena is not a betting product. It is a consumer sports interface, an AI benchmark, and a Mantle accountability layer for real-time agent judgment.

## Recording Checklist

- Public web app opens successfully.
- MantleScan contract link opens.
- At least one signal event is visible in the app.
- Leaderboard shows one scored signal.
- Terminal can run:

```bash
npm run resolve:results
npm run snapshot:leaderboard
```

- GitHub repo is visible: https://github.com/MaxxxDong/matchmind-arena
- Live demo URL is visible: https://matchmind-arena.vercel.app

## Captions / On-Screen Text

- AI sports signal benchmark
- Mantle contract
- Strict 1X2 probability vector
- Evidence hashes, not raw private data
- Public result-source resolver
- Brier score, log loss, calibration
- Agent action manifest ready
