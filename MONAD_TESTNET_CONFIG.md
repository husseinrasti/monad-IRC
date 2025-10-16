# Monad Testnet Configuration

## ✅ Updated Network Configuration

All environment files and configurations have been updated with the correct Monad testnet values.

---

## 🌐 Network Details

### RPC URL
```
https://testnet-rpc.monad.xyz
```

### Chain ID
```
10143
```

---

## 📁 Updated Files

### Environment Example Files
1. **`.env.local.example`**
   - `NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz`
   - `NEXT_PUBLIC_CHAIN_ID=10143`

2. **`contracts/.env.example`**
   - `MONAD_RPC_URL=https://testnet-rpc.monad.xyz`
   - `CHAIN_ID=10143`

3. **`envio/.env.example`**
   - `MONAD_RPC_URL=https://testnet-rpc.monad.xyz`

### Configuration Files
4. **`contracts/hardhat.config.ts`**
   - Updated default RPC URL to `https://testnet-rpc.monad.xyz`
   - Updated chainId to `10143`

### Documentation Files
5. **`ENV_SETUP.md`** - Updated all RPC URLs and chain IDs
6. **`ENV_QUICK_REFERENCE.md`** - Updated all RPC URLs and chain IDs
7. **`ENV_FILES_CREATED.md`** - Updated network information

---

## 🚀 Adding Monad Testnet to MetaMask

To connect your MetaMask wallet to Monad testnet:

### Manual Setup
1. Open MetaMask
2. Click on the network dropdown (top of the extension)
3. Click "Add Network" or "Add a network manually"
4. Enter the following details:

   ```
   Network Name: Monad Testnet
   RPC URL: https://testnet-rpc.monad.xyz
   Chain ID: 10143
   Currency Symbol: MON (or ETH)
   Block Explorer URL: (TBD - check Monad docs)
   ```

5. Click "Save"

### Via Chainlist (Alternative)
1. Visit: https://chainlist.org
2. Search for "Monad Testnet"
3. Click "Connect Wallet"
4. Click "Add to MetaMask"

---

## 💰 Getting Testnet Tokens

### Faucet
Visit the official Monad faucet to get testnet tokens:

**Faucet URL**: https://faucet.monad.xyz (or check official Monad documentation)

### Steps:
1. Connect your MetaMask wallet
2. Make sure you're on Monad Testnet network
3. Request testnet tokens
4. Wait for confirmation (usually takes a few seconds)

---

## 🔧 Smart Contract Deployment

With the updated configuration, you can now deploy contracts to Monad testnet:

```bash
cd contracts

# Compile contracts
npx hardhat compile

# Deploy to Monad testnet
npx hardhat run scripts/deploy.ts --network monadTestnet
```

Make sure you have:
- ✅ Added your `PRIVATE_KEY` to `contracts/.env`
- ✅ Testnet tokens in your wallet
- ✅ MetaMask connected to Monad Testnet

---

## 🧪 Testing the Connection

### Test RPC Connection
```bash
curl -X POST https://testnet-rpc.monad.xyz \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

Expected response:
```json
{"jsonrpc":"2.0","id":1,"result":"0x279f"}
```

*Note: `0x279f` is hex for `10143`*

### Test with Hardhat
```bash
cd contracts
npx hardhat console --network monadTestnet
```

In the console:
```javascript
await ethers.provider.getNetwork()
// Should show chainId: 10143
```

---

## 📝 Environment Variable Summary

### Frontend (`.env.local`)
```bash
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_CHAIN_ID=10143
NEXT_PUBLIC_CONTRACT_ADDRESS=<your_deployed_contract_address>
```

### Contracts (`contracts/.env`)
```bash
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
CHAIN_ID=10143
PRIVATE_KEY=<your_private_key>
```

### Envio (`envio/.env`)
```bash
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
CONTRACT_ADDRESS=<your_deployed_contract_address>
```

---

## 🔍 Verifying Network Configuration

After updating your environment files, verify the configuration:

```bash
# Check frontend env
cat .env.local | grep MONAD
# Should show: https://testnet-rpc.monad.xyz

cat .env.local | grep CHAIN_ID
# Should show: 10143

# Check contracts env
cat contracts/.env | grep MONAD_RPC_URL
# Should show: https://testnet-rpc.monad.xyz

# Check hardhat config
cat contracts/hardhat.config.ts | grep "chainId"
# Should show: chainId: 10143
```

---

## 🆘 Troubleshooting

### "Network Error" or "Cannot connect to RPC"
**Solutions:**
1. Verify RPC URL is exactly: `https://testnet-rpc.monad.xyz`
2. Check if Monad testnet is operational (check their status page/Discord)
3. Try a different internet connection

### "Invalid Chain ID"
**Solution:**
- Ensure `NEXT_PUBLIC_CHAIN_ID=10143` (not 10200 or other values)
- Clear MetaMask cache and re-add the network

### "Insufficient funds for gas"
**Solution:**
- Get testnet tokens from the faucet
- Verify you're on the correct network in MetaMask

### Contract deployment fails with "unknown account"
**Solution:**
- Make sure `PRIVATE_KEY` is set correctly in `contracts/.env`
- Verify the account has testnet tokens

---

## 📚 Additional Resources

- **Monad Documentation**: https://docs.monad.xyz (check for official docs)
- **Monad Discord**: Join for support and announcements
- **Monad Twitter**: Follow for updates
- **Block Explorer**: Check official Monad docs for testnet explorer

---

## ✅ Next Steps

1. **Run the install script** to create `.env` files with updated values:
   ```bash
   ./scripts/install.sh
   ```

2. **Add Monad Testnet to MetaMask** using the network details above

3. **Get testnet tokens** from the faucet

4. **Add your private key** to `contracts/.env`:
   ```bash
   echo "PRIVATE_KEY=0xYOUR_PRIVATE_KEY" >> contracts/.env
   ```

5. **Deploy the smart contract**:
   ```bash
   cd contracts
   npx hardhat run scripts/deploy.ts --network monadTestnet
   ```

6. **Update contract address** in `.env.local`

7. **Start the application**:
   ```bash
   # Terminal 1
   npm run dev
   
   # Terminal 2
   cd server && npm run dev
   ```

---

**All set! Your Monad IRC is now configured for Monad testnet! 🎉**

*Last updated: October 16, 2025*
*Network: Monad Testnet*
*RPC: https://testnet-rpc.monad.xyz*
*Chain ID: 10143*
