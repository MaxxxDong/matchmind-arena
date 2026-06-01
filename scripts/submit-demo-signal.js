const { ethers, network } = require("hardhat");

const SIGNAL_ARENA_ADDRESS = process.env.SIGNAL_ARENA_ADDRESS;

async function main() {
  if (!SIGNAL_ARENA_ADDRESS) {
    throw new Error("SIGNAL_ARENA_ADDRESS is required");
  }

  const [agent] = await ethers.getSigners();
  const arena = await ethers.getContractAt("SignalArena", SIGNAL_ARENA_ADDRESS);

  console.log(`Submitting demo signal to ${network.name}`);
  console.log(`Agent: ${agent.address}`);
  console.log(`SignalArena: ${SIGNAL_ARENA_ADDRESS}`);

  const agentIdHash = ethers.id("agent:demo-ai-sports-signal");
  const agentMetadataHash = ethers.id("agent-metadata:demo-ai-sports-signal");
  const agentRecord = await arena.getAgent(agent.address);

  if (!agentRecord.registered) {
    const registerTx = await arena.registerAgent(agentIdHash, agentMetadataHash, "https://example.com/agents/demo");
    console.log(`Register tx: ${registerTx.hash}`);
    await registerTx.wait();
  }

  const signal = {
    matchId: ethers.id("demo-replay:argentina-france-2022"),
    contextHash: ethers.id("context:demo-replay:v1"),
    matchWindow: 4,
    homeBps: 4800,
    drawBps: 2700,
    awayBps: 2500,
    confidenceBps: 6800,
    evidenceHash: ethers.id("evidence:demo-replay:ai-generated-signal"),
    metadataHash: ethers.id("metadata:demo-replay:signal:v1"),
    metadataUri: "https://example.com/signals/demo-replay-1",
  };

  const tx = await arena.submitSignal(signal);
  console.log(`Signal tx: ${tx.hash}`);
  await tx.wait();
  console.log("Demo signal committed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
