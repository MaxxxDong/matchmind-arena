require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const EXPLORER_API_KEY =
  process.env.MANTLE_EXPLORER_API_KEY || process.env.ETHERSCAN_API_KEY || "empty";

const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    mantleSepolia: {
      url: process.env.MANTLE_SEPOLIA_RPC_URL || "https://rpc.sepolia.mantle.xyz",
      chainId: 5003,
      accounts,
    },
    mantleMainnet: {
      url: process.env.MANTLE_MAINNET_RPC_URL || "https://rpc.mantle.xyz",
      chainId: 5000,
      accounts,
    },
  },
  etherscan: {
    apiKey: EXPLORER_API_KEY,
    customChains: [
      {
        network: "mantleSepolia",
        chainId: 5003,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api",
          browserURL: "https://sepolia.mantlescan.xyz",
        },
      },
      {
        network: "mantleMainnet",
        chainId: 5000,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api",
          browserURL: "https://mantlescan.xyz",
        },
      },
    ],
  },
};
