import { ethers } from "hardhat";

async function main() {
  console.log("Deploying MonadIRC contract...");

  const MonadIRC = await ethers.getContractFactory("MonadIRC");
  const monadIRC = await MonadIRC.deploy();

  await monadIRC.waitForDeployment();

  const address = await monadIRC.getAddress();
  console.log(`MonadIRC deployed to: ${address}`);

  // Save deployment info
  console.log("\nDeployment complete!");
  console.log("Add this address to your .env file:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

