const { ethers, network } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`Deploying SignalArena to ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);

  const SignalArena = await ethers.getContractFactory("SignalArena");
  const arena = await SignalArena.deploy();
  await arena.waitForDeployment();

  const address = await arena.getAddress();
  const deployment = await arena.deploymentTransaction();

  console.log(`SignalArena deployed: ${address}`);
  console.log(`Deployment tx: ${deployment ? deployment.hash : "unknown"}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

