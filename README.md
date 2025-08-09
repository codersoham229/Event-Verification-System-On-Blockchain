# Smart Contract Deployment Guide

## Prerequisites

1. **MetaMask Wallet** with Sepolia testnet configured
2. **Test ETH** from Sepolia faucet (https://faucets.chain.link/sepolia)
3. **Remix IDE** (https://remix.ethereum.org)

## Step 1: Deploy the Smart Contract

1. Open [Remix IDE](https://remix.ethereum.org)
2. Create a new file called `EventTicketing.sol`
3. Copy the contract code from `contracts/EventTicketing.sol`
4. Compile the contract (Solidity version 0.8.19+)
5. Deploy to Sepolia testnet using MetaMask
6. **Copy the deployed contract address**

## Step 2: Configure the Application

1. Create a `.env` file in the project root:
```bash
VITE_CONTRACT_ADDRESS=0xYourContractAddressHere
```

2. Restart the application:
```bash
npm run dev
```

## Step 3: Get Test ETH

Visit these Sepolia faucets to get test ETH:
- https://faucets.chain.link/sepolia
- https://sepoliafaucet.com/
- https://www.infura.io/faucet/sepolia

## Alternative: Use Test Contract

For testing purposes, you can use this deployed test contract on Sepolia:
```
VITE_CONTRACT_ADDRESS=0x742d35Cc60C73F58D5ABfa5B6b8D66Ea8F8C0E8B
```

## Troubleshooting

- Ensure MetaMask is connected to Sepolia testnet
- Check that you have sufficient test ETH for gas fees
- Verify the contract address is correctly set in `.env`
- Restart the development server after changing environment variables
