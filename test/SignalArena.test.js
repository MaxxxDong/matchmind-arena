const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SignalArena", function () {
  async function deployFixture() {
    const [owner, agent, otherAgent] = await ethers.getSigners();
    const SignalArena = await ethers.getContractFactory("SignalArena");
    const arena = await SignalArena.deploy();

    const matchId = ethers.id("wc2026:group-a:mexico-south-africa");
    const contextHash = ethers.id("context:v1");
    const evidenceHash = ethers.id("evidence:v1");
    const metadataHash = ethers.id("metadata:v1");
    const agentIdHash = ethers.id("agent:tactical-demo");
    const otherAgentIdHash = ethers.id("agent:other-demo");
    const sourceHash = ethers.id("resolution:fifa:demo");

    const signal = {
      matchId,
      contextHash,
      matchWindow: 0,
      homeBps: 5600,
      drawBps: 2600,
      awayBps: 1800,
      confidenceBps: 7000,
      evidenceHash,
      metadataHash,
      metadataUri: "ipfs://signal-metadata",
    };

    return {
      arena,
      owner,
      agent,
      otherAgent,
      matchId,
      sourceHash,
      signal,
      metadataHash,
      agentIdHash,
      otherAgentIdHash,
    };
  }

  it("registers an agent with a first-class agent id hash", async function () {
    const { arena, agent, metadataHash, agentIdHash } = await deployFixture();

    const event = await getEvent(
      arena,
      await arena.connect(agent).registerAgent(agentIdHash, metadataHash, "ipfs://agent"),
      "AgentRegistered"
    );

    expect(event.args.agent).to.equal(agent.address);
    expect(event.args.agentIdHash).to.equal(agentIdHash);
    expect(event.args.metadataHash).to.equal(metadataHash);
    expect(event.args.metadataUri).to.equal("ipfs://agent");

    const registered = await arena.getAgent(agent.address);
    expect(registered.registered).to.equal(true);
    expect(registered.agentIdHash).to.equal(agentIdHash);
    expect(registered.metadataHash).to.equal(metadataHash);
    expect(registered.metadataUri).to.equal("ipfs://agent");
    expect(await arena.getAgentOwner(agentIdHash)).to.equal(agent.address);
  });

  it("rejects duplicate registration", async function () {
    const { arena, agent, metadataHash, agentIdHash } = await deployFixture();

    await arena.connect(agent).registerAgent(agentIdHash, metadataHash, "ipfs://agent");

    await expectCustomError(
      arena.connect(agent).registerAgent(agentIdHash, metadataHash, "ipfs://agent-2"),
      "AgentAlreadyRegistered"
    );
  });

  it("rejects reusing an agent id hash from another wallet", async function () {
    const { arena, agent, otherAgent, metadataHash, agentIdHash } = await deployFixture();

    await arena.connect(agent).registerAgent(agentIdHash, metadataHash, "ipfs://agent");

    await expectCustomError(
      arena.connect(otherAgent).registerAgent(agentIdHash, ethers.id("metadata:other"), "ipfs://agent-2"),
      "AgentIdAlreadyRegistered"
    );
  });

  it("rejects signal submission from unregistered agents", async function () {
    const { arena, agent, signal } = await deployFixture();

    await expectCustomError(arena.connect(agent).submitSignal(signal), "AgentNotRegistered");
  });

  it("submits a strict 1X2 probability signal", async function () {
    const { arena, agent, signal, metadataHash, agentIdHash } = await deployFixture();

    await arena.connect(agent).registerAgent(agentIdHash, metadataHash, "ipfs://agent");

    const event = await getEvent(
      arena,
      await arena.connect(agent).submitSignal(signal),
      "SignalSubmitted"
    );

    expect(event.args.signalId).to.equal(1n);
    expect(event.args.agent).to.equal(agent.address);
    expect(event.args.agentIdHash).to.equal(agentIdHash);
    expect(event.args.matchId).to.equal(signal.matchId);
    expect(event.args.matchWindow).to.equal(BigInt(signal.matchWindow));
    expect(event.args.homeBps).to.equal(BigInt(signal.homeBps));
    expect(event.args.drawBps).to.equal(BigInt(signal.drawBps));
    expect(event.args.awayBps).to.equal(BigInt(signal.awayBps));
    expect(event.args.confidenceBps).to.equal(BigInt(signal.confidenceBps));
    expect(event.args.contextHash).to.equal(signal.contextHash);
    expect(event.args.evidenceHash).to.equal(signal.evidenceHash);
    expect(event.args.metadataHash).to.equal(signal.metadataHash);
    expect(event.args.metadataUri).to.equal(signal.metadataUri);
    expect(event.args.isRevision).to.equal(false);

    expect(
      await arena.primarySignalSubmitted(agentIdHash, signal.matchId, signal.matchWindow)
    ).to.equal(true);
    expect(await arena.nextSignalId()).to.equal(2n);
  });

  it("marks a second signal in the same match window as a revision", async function () {
    const { arena, agent, signal, metadataHash, agentIdHash } = await deployFixture();

    await arena.connect(agent).registerAgent(agentIdHash, metadataHash, "ipfs://agent");
    await arena.connect(agent).submitSignal(signal);

    const revisedSignal = {
      ...signal,
      homeBps: 5200,
      drawBps: 3000,
      awayBps: 1800,
      metadataHash: ethers.id("metadata:v2"),
      metadataUri: "ipfs://signal-metadata-v2",
    };

    const event = await getEvent(
      arena,
      await arena.connect(agent).submitSignal(revisedSignal),
      "SignalSubmitted"
    );

    expect(event.args.signalId).to.equal(2n);
    expect(event.args.isRevision).to.equal(true);
    expect(event.args.metadataHash).to.equal(revisedSignal.metadataHash);
  });

  it("rejects probability vectors that do not sum to 10000 bps", async function () {
    const { arena, agent, signal, metadataHash, agentIdHash } = await deployFixture();

    await arena.connect(agent).registerAgent(agentIdHash, metadataHash, "ipfs://agent");

    await expectCustomError(
      arena.connect(agent).submitSignal({
        ...signal,
        awayBps: 1700,
      }),
      "InvalidProbabilityVector"
    );
  });

  it("rejects zero hashes and invalid confidence", async function () {
    const { arena, agent, signal, metadataHash, agentIdHash } = await deployFixture();

    await arena.connect(agent).registerAgent(agentIdHash, metadataHash, "ipfs://agent");

    await expectCustomError(
      arena.connect(agent).submitSignal({
        ...signal,
        contextHash: ethers.ZeroHash,
      }),
      "InvalidHash"
    );

    await expectCustomError(
      arena.connect(agent).submitSignal({
        ...signal,
        confidenceBps: 10001,
      }),
      "InvalidConfidence"
    );
  });

  it("lets only the owner resolve a match and blocks later signals", async function () {
    const { arena, agent, otherAgent, signal, metadataHash, agentIdHash, matchId, sourceHash } =
      await deployFixture();

    await arena.connect(agent).registerAgent(agentIdHash, metadataHash, "ipfs://agent");

    let rejected = false;
    try {
      await arena.connect(otherAgent).resolveMatch(matchId, 1, sourceHash, "https://example.com/result");
    } catch {
      rejected = true;
    }
    expect(rejected).to.equal(true);

    const event = await getEvent(
      arena,
      await arena.resolveMatch(matchId, 1, sourceHash, "https://example.com/result"),
      "MatchResolved"
    );

    expect(event.args.matchId).to.equal(matchId);
    expect(event.args.result).to.equal(1n);
    expect(event.args.sourceHash).to.equal(sourceHash);
    expect(event.args.sourceUri).to.equal("https://example.com/result");

    await expectCustomError(
      arena.connect(agent).submitSignal(signal),
      "MatchAlreadyResolved"
    );
  });
});

async function getEvent(contract, tx, eventName) {
  const receipt = await tx.wait();
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed && parsed.name === eventName) {
        return parsed;
      }
    } catch (_) {
      // Ignore logs emitted by other contracts.
    }
  }
  throw new Error(`Event ${eventName} not found`);
}

async function expectCustomError(promise, errorName, contract = null) {
  try {
    await promise;
  } catch (error) {
    if (error.message.includes(errorName)) return;
    const selector = contract?.interface?.getError(errorName)?.selector;
    const dataCandidates = [
      error.data,
      error.error?.data,
      error.info?.error?.data,
    ].filter(Boolean).map(String);
    if (selector && dataCandidates.some((data) => data.startsWith(selector))) return;
    expect(error.message).to.include(errorName);
  }
  throw new Error(`Expected custom error ${errorName}`);
}
