const hre = require("hardhat");

async function main() {
  console.log("Deploying EventTicketing contract to Sepolia...");

  const EventTicketing = await hre.ethers.getContractFactory("EventTicketing");
  const eventTicketing = await EventTicketing.deploy();

  await eventTicketing.waitForDeployment();

  const address = await eventTicketing.getAddress();
  
  console.log("\n✅ EventTicketing deployed to:", address);
  console.log("\n📋 Next steps:");
  console.log("1. Copy the contract address above");
  console.log("2. Update your .env file:");
  console.log(`   VITE_CONTRACT_ADDRESS=${address}`);
  console.log("3. Restart your dev server");
  console.log("\n🔍 Verify on Etherscan:");
  console.log(`   https://sepolia.etherscan.io/address/${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
