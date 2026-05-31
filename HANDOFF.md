# MatchMind Arena Handoff

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
2. `docs/hackathon-research.md`
3. `docs/product-plan.md`
4. `docs/agent-protocol.md`
5. `docs/implementation-plan.md`

## Open Questions

- Final project name.
- License.
- Mantle Testnet RPC and faucet path to use.
- Whether to deploy first to testnet only or also mainnet.
- Whether to include Byreal Agent Skills as a stretch demo.
- How much of the existing Chrome companion should be copied versus rebuilt.

## Next Engineering Move

Implement Phase 1 from `docs/implementation-plan.md`:

- Solidity `SignalArena` contract.
- Tests.
- Mantle deployment configuration.
- Explorer verification flow.
- Minimal frontend call path for AI-generated `submitSignal`.
