# 🚀 Quick Contract Deployment Guide

## The Issue
The test contract address `0x742d35cC60C73F58d5Abfa5b6b8D66eA8f8C0E8B` may not have the EventTicketing contract deployed, or it may be a different contract.

## ✅ Solution: Deploy Your Own Contract

### Option 1: Deploy Using Remix IDE (Recommended - 5 minutes)

1. **Go to Remix**: https://remix.ethereum.org

2. **Create New File**: 
   - Name it `EventTicketing.sol`
   - Copy the entire content from `contracts/EventTicketing.sol` in your project

3. **Install OpenZeppelin** (if not auto-installed):
   - Remix should auto-install OpenZeppelin contracts
   - Or manually add them via the plugin manager

4. **Compile**:
   - Click on "Solidity Compiler" tab (left sidebar)
   - Select compiler version: `0.8.19` or higher
   - Click "Compile EventTicketing.sol"

5. **Deploy to Sepolia**:
   - Click "Deploy & Run Transactions" tab
   - Change Environment to "Injected Provider - MetaMask"
   - Make sure MetaMask is connected to **Sepolia Testnet**
   - Make sure you have Sepolia ETH (get from faucet if needed)
   - Click "Deploy"
   - Confirm transaction in MetaMask
   - Wait for confirmation (~30 seconds)

6. **Copy Contract Address**:
   - After deployment, you'll see the contract under "Deployed Contracts"
   - Click the copy icon next to the contract address
   - It will look like: `0xYourNewContractAddress`

7. **Update Your .env File**:
   ```
   VITE_CONTRACT_ADDRESS=0xYourNewContractAddress
   ```

8. **Restart the app** and try creating an event!

### Option 2: Use Hardhat/Foundry (Advanced)

If you're familiar with Hardhat or Foundry, you can deploy using those tools.

## 🔑 Get Sepolia Test ETH

You need Sepolia ETH to deploy and interact with contracts:

1. **Alchemy Faucet**: https://sepoliafaucet.com/
2. **Chainlink Faucet**: https://faucets.chain.link/sepolia
3. **Infura Faucet**: https://www.infura.io/faucet/sepolia

## 📋 After Deployment Checklist

✅ Contract address copied
✅ Contract address updated in `.env` file
✅ Development server restarted (`npm run dev`)
✅ MetaMask connected to Sepolia
✅ Have test ETH in wallet

## 🐛 Troubleshooting

**Error: "Contract not deployed"**
- Check that you're on Sepolia testnet
- Verify the contract address is correct
- Make sure the contract was successfully deployed

**Error: "Insufficient funds"**
- Get more Sepolia ETH from faucets above

**Error: "Transaction rejected"**
- Make sure you clicked "Confirm" in MetaMask
- Check that you have enough ETH for gas

## 📝 Notes

- Contract deployment costs ~0.01 - 0.02 Sepolia ETH (free testnet ETH)
- The contract is yours and will persist on the Sepolia testnet
- You can reuse the same contract address across restarts
- No need to redeploy unless you change the contract code
