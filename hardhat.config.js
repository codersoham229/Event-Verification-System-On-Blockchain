require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY", // or use Alchemy
      accounts: ["YOUR_PRIVATE_KEY_HERE"] // Your wallet private key
    }
  }
};
