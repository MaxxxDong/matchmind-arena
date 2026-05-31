# Hackathon Research Knowledge Base

Purpose: this is the source-backed knowledge base for hackathon rules, award criteria, Mantle technical context, and ecosystem references.

This file collects the public facts that should guide MatchMind Arena. It is written as a working knowledge base, not marketing copy.

Research date: 2026-05-31.

## Primary Sources

- DoraHacks hackathon detail page: https://dorahacks.io/hackathon/mantleturingtesthackathon2026/detail
- DoraHacks tracks page: https://dorahacks.io/hackathon/mantleturingtesthackathon2026/tracks
- DoraHacks requirements and criteria page: https://dorahacks.io/hackathon/mantleturingtesthackathon2026/requirements-&-criteria
- DoraHacks BUIDL page: https://dorahacks.io/hackathon/mantleturingtesthackathon2026/buidl
- Mantle contract deployment guide: https://www.mantle.xyz/blog/developers/deploy-your-smart-contract-to-mantle-network
- Mantle contract verification guide: https://www.mantle.xyz/blog/developers/how-to-verify-contracts-via-mantles-mainnet-explorer
- Byreal Agent Skills repository: https://github.com/byreal-git/byreal-agent-skills
- RealClaw / Byreal agentic finance announcement: https://www.prnewswire.com/apac/news-releases/bringing-agentic-finance-to-telegram-byreal-debuts-realclaw-transitioning-onchain-finance-to-an-agent-first-economy-302740580.html

## Event Snapshot

- Event: Mantle Turing Test Hackathon 2026.
- DoraHacks prize display: 100,000 USD.
- Detail page body describes a two-phase program with a total pool of 120,000 USD, including Phase 1 ClawHack 20,000 USD and Phase 2 AI Awakening 100,000 USD.
- Submission deadline shown on DoraHacks: 2026-06-15 11:59.
- Tags include Blockchain, AI, Trading, Claw, and Web3 ecosystem.
- Partner / ecosystem names shown include Mantle Network, Animoca Brands, Z.AI, Nansen, Tencent Cloud, Bybit, Byreal, BGA, Mirana, Orbit AI, and others.

## Event Theme

The hackathon is centered on agentic AI and on-chain infrastructure. The strongest positioning is not "an AI app with a wallet", but "AI agents that make decisions, produce measurable outcomes, and leave verifiable traces on-chain".

The detail page highlights three ideas that matter for our project:

- On-chain benchmarking of AI: agent decisions and outcomes are recorded on Mantle.
- Agent identity: participating agents can have persistent identity, referenced by ERC-8004-style identity concepts.
- Radical transparency: agent behavior should be observable and auditable.

For MatchMind Arena, this maps naturally to:

- AI match signals are submitted as structured predictions and tactical assessments.
- Signals are committed on Mantle.
- Agents build public track records across matches.
- Users and judges can replay what was predicted, when it was predicted, and how it performed.

## Tracks

The public tracks page lists six tracks:

1. AI Trading & Strategy
   - AI quant bots and macro-driven smart contracts.
   - Python / Solidity templates and Bybit API support.
   - Sponsored by BGA.

2. AI Alpha & Data
   - Smart money tracking and on-chain anomaly detection bots.
   - Telegram and Discord delivery are explicitly mentioned.

3. AI x RWA
   - Dynamic yield strategies and automated risk management for assets including USDY and mETH.
   - Built on Mantle's RWA infrastructure.

4. Consumer & Viral DApps
   - Gamified trading interfaces and shareable consumer applications.

5. AI DevTools
   - Smart gas optimisation tools and Mantle-specific audit assistants.

6. Agentic Wallets & Economy
   - Agentic wallet economies using Byreal Skills CLI.
   - Sponsored by Byreal.

## Recommended Track Fit

Primary: Consumer & Viral DApps.

Reason:

- MatchMind Arena is easy for non-technical users to understand.
- The core interaction happens while watching live sports.
- Leaderboards, signal cards, and agent-versus-human comparisons are shareable.
- The Chrome companion gives the product a lightweight consumer distribution angle.

Secondary: AI Alpha & Data.

Reason:

- The product uses structured signals, historical sports data, market reference data, and agent scoring.
- However, this track expects Mantle on-chain data to be a core data source. Our current sports data is mostly off-chain, so this is a secondary narrative unless we add a Mantle-native data angle.

Optional extension: Agentic Economy.

Reason:

- Byreal Agent Skills and RealClaw are explicitly encouraged for agentic economies.
- This can be a stretch path if we build a separate agent that uses Byreal tools, but it should not block the core sports arena.

## Award Criteria

### Grand Champion / First Prize

Requirements:

- Must be deployed on Mantle Network.
- Must provide open-source repository, runnable demo, and project pitch.
- Must be nominated from at least one track.

Scoring:

- Technical Depth: 30%
  - AI x on-chain integration.
  - Architecture completeness.
  - Code quality.
- Innovation: 25%
  - Originality.
  - New AI x Web3 paradigm.
- Mantle Ecosystem Contribution: 25%
  - Substantive Mantle use.
  - Long-term ecosystem value.
- Product Completeness: 20%
  - Runnable demo.
  - UX.
  - Scalability.

Implication for us:

- We need a real Mantle deployment, not only a frontend.
- The AI benchmark concept must be explicit.
- The demo must show a full loop: identify match -> AI signal -> on-chain commit -> leaderboard / result.

### Best UI/UX Award

Requirements:

- Runnable frontend.
- Demo video or public link.

Scoring:

- Visual Design: 30%
- Interaction & Flow: 30%
- AI Interaction Design: 25%
- Accessibility: 15%

Implication for us:

- The UI should feel like a polished live sports cockpit, not a generic dashboard.
- The AI conversation, replay evidence, signal cards, and leaderboard need to be clear and fast.
- The best UI/UX path is realistic because we already have Chrome plugin product experience.

### 20 Project Deployment Award

This is a hard-check award, not a judge-scored award.

Requirements:

- Smart contract deployed on Mantle Mainnet or Testnet.
- Contract verified on Mantle Explorer.
- At least one AI-powered function callable on-chain.
- Public frontend.
- Deployment address included in DoraHacks submission.
- Demo video of at least 2 minutes showing the core use case.
- Open-source repository with README covering setup, architecture, and deployed contract address.

Implication for us:

- This should be the first engineering milestone.
- Minimal contract is acceptable if it is real, verified, and used by the app.
- The AI-powered callable function can be `submitSignal` from an AI-generated signal, with `evidenceHash` and structured probability fields committed on-chain.

## Mantle Technical Notes

Mantle is EVM-compatible from a developer workflow perspective. The official deployment guide demonstrates:

- Connect wallet / MetaMask to Mantle Testnet.
- Deploy Solidity contracts through Remix.
- Interact with deployed contract functions.
- Inspect the deployment on Mantle explorer.

The official verification guide demonstrates:

- Verify source code against deployed bytecode on Mantle explorer.
- Verification paths include Sourcify / explorer tooling and compiler input approaches.

For the first implementation, use a standard Solidity + Hardhat or Foundry workflow:

- Solidity contract for signal registry.
- Mantle testnet deployment script.
- Explorer verification.
- Frontend environment variable for deployed contract address.
- Transaction link rendered in the UI.

## Byreal / RealClaw Notes

Byreal Agent Skills are public at `byreal-git/byreal-agent-skills`.

Observed capabilities:

- Structured JSON output for agent integration.
- CLI install through npm.
- Agent skill install via `npx skills add byreal-git/byreal-agent-skills`.
- Pool discovery, risk analysis, K-lines, APR, token prices, swaps, and liquidity position management.
- Auto Swap / Zap flows that can preview and execute one-token open / close / rebalance flows.

RealClaw is described as a chat and voice agentic finance product built on Byreal Agent Skills. Users keep control through confirmation flows and non-custodial wallet design.

For MatchMind Arena:

- Byreal integration is optional.
- A light integration could let a demo agent read Byreal market context or generate an agentic action proposal.
- Do not force this into MVP unless it directly improves hackathon scoring.

## Current Strategic Decision

Build MatchMind Arena as a Mantle-native AI sports signal benchmark:

- Sports viewing gives a familiar real-time environment.
- AI agents submit measurable signals before and during a match.
- Mantle stores the accountability trail.
- The UI makes agent intelligence visible to users.

This gives us a credible path across:

- Grand Champion / First Prize narrative.
- Best UI/UX execution.
- 20 Project Deployment Award checklist.
