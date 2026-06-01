# MatchMind Arena Handoff

Purpose: this gives a new agent the minimum context needed to continue without reading the whole thread.

## Boundary

This is a new independent Mantle project.

Local repository:

```text
D:\CodexWS\Mantle\matchmind-arena
```

Do not mix this repository with:

- The original World Cup Chrome extension.
- Any earlier hackathon variant.
- Any unrelated local experiment.

Useful ideas may be ported later, but code should be copied intentionally and cleaned for this project.

## Current Decision

Build an AI sports signal benchmark for the Mantle Turing Test Hackathon 2026.

Core idea:

- AI agents and users submit structured football match signals.
- Signals are committed on Mantle.
- Signals are scored after match resolution.
- The product becomes a public arena for measuring sports AI judgment.

Current public name:

- `MatchMind Arena`

Current public repository:

- https://github.com/MaxxxDong/matchmind-arena

Current live demo:

- https://matchmind-arena.vercel.app

## Award Targets

Primary:

- 20 Project Deployment Award.
- Best UI/UX Award.
- Grand Champion / First Prize narrative.

Track:

- Primary: Consumer & Viral DApps.
- Secondary: AI Alpha & Data.

## Files To Read First

1. `README.md`
2. `docs/implementation-plan.md`
3. `docs/project-progress.md`
4. `docs/agent-protocol.md`
5. `docs/submission-package.md`
6. `docs/product-plan.md`
7. `docs/hackathon-research.md`

## Current Implementation State

- Contract: `contracts/SignalArena.sol`.
- Network: Mantle Sepolia.
- Contract address: `0x1c2B387c365Ccb7E17B8d8b38989A29ef6394de0`.
- Explorer: https://sepolia.mantlescan.xyz/address/0x1c2B387c365Ccb7E17B8d8b38989A29ef6394de0
- Verification: Sourcify `full_match`.
- Frontend: Vite React app in `src/`, deployed on Vercel.
- Agent-readable resources: `public/agent-skill.md`, `public/agent-context.json`, `public/agent-action.json`, `public/agent-signal.schema.json`, `public/llms.txt`.
- Local Agent API: `scripts/agent-api-server.mjs`.
- Minimal agent example: `agent-examples/minimal-node-agent.mjs`.
- Resolver and leaderboard snapshots: `scripts/resolve-results.mjs`, `scripts/export-leaderboard-snapshot.mjs`, `snapshots/`.

Implemented product behavior:

- Stable agent IDs become on-chain `agentIdHash` values.
- Agents can choose from demo replay cards and the 72 listed 2026 group-stage cards.
- Agents must provide a strict 1X2 vector plus `marketPredictions` for every selected-match market dimension.
- The page performs a no-wallet dry run and pre-submit preview before wallet confirmation.
- The default UI blocks accidental duplicate primary submissions for the same `agentIdHash + match + window`.
- The upper-right rail contains a scored `Leaderboard`; clicking a row selects that agent's latest scored signal and shows its detail card.
- The central `Agent predictions` board shows market-dimension outcome distribution, vote counts, average probability, support score, probability buckets, and the agent rows behind each bucket.

## Current Open Items

- Add durable off-chain metadata retrieval/storage for rich `marketPredictions`; Mantle events currently preserve compact 1X2 accountability, while full dimension details are strongest for imported/local signals.
- Add more real submitted agent signals so the leaderboard has meaningful density beyond the seed/demo state.
- Finish or update final demo/submission URLs if the public submission package changes.
- Keep Chrome companion integration as a later track. It is not part of the current Mantle web Arena review path.
- Do not add Byreal-specific functionality unless the hackathon strategy changes; it remains optional research context only.

## Next Engineering Move

Continue from the current `docs/implementation-plan.md` priorities:

1. Improve rich signal metadata persistence/retrieval so all selected market dimensions can be reconstructed after wallet submission.
2. Add more agent examples or seeded real submissions to exercise the leaderboard and prediction distribution views.
3. Keep `docs/submission-package.md` as the only reviewer-facing copy source; update it only when public links or demo evidence change.
4. Re-run the normal verification sequence after code changes:
   - `npm test`
   - `npm run build`
   - `npm run resolve:results`
   - `npm run snapshot:leaderboard`
