# MonadIRC Setup Guide

Complete guide to set up and run the MonadIRC decentralized chat application.

## Prerequisites

### Required Software

1. **Node.js v20**
   ```bash
   node --version  # Should show v20.x.x
   ```

2. **pnpm** (package manager)
   ```bash
   npm install -g pnpm
   pnpm --version
   ```

3. **Docker** (for Envio/HyperIndex)
   ```bash
   docker --version
   docker-compose --version
   ```

4. **MetaMask** browser extension
   - Install from [metamask.io](https://metamask.io)
   - Create or import wallet
   - **Important**: Must use MetaMask (not other wallets)

### Required Accounts

1. **Pimlico Account** (for bundler)
   - Sign up at [dashboard.pimlico.io](https://dashboard.pimlico.io)
   - Create API key
   - Free tier available

2. **Convex Account** (for database)
   - Sign up at [dashboard.convex.dev](https://dashboard.convex.dev)
   - Create new project
   - Free tier available

3. **Monad Testnet Tokens**
   - Get test MON from [Monad faucet](https://monad.xyz/faucet)
   - Need for gas fees

## Installation

### 1. Clone and Install Dependencies

```bash
# Clone repository
git clone <your-repo-url>
cd monad-irc

# Install root dependencies
pnpm install

# Install Envio dependencies
cd envio
pnpm install
cd ..
```

### 2. Configure Environment Variables

Create `.env.local` in project root:

```bash
cp ENV_TEMPLATE.md .env.local.template
# Then edit .env.local with your values
```

**Critical Configuration**:

```bash
# Monad Network
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz

# Pimlico Bundler (REQUIRED for Account Abstraction)
NEXT_PUBLIC_BUNDLER_URL=https://api.pimlico.io/v2/monad-testnet/YOUR_PIMLICO_KEY

# Smart Contract (already deployed)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x99ff09C8163822c34A4d91D842B03af42A610aAC

# Convex (get from `pnpm convex:dev`)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# HyperIndex
NEXT_PUBLIC_HYPERINDEX_URL=http://localhost:8080/graphql

# For Envio webhooks to Convex
CONVEX_URL=https://your-deployment.convex.cloud
```

### 3. Set Up Convex

```bash
# Start Convex development server
pnpm convex:dev

# Follow prompts to:
# 1. Login to Convex
# 2. Create or select project
# 3. Copy deployment URL to NEXT_PUBLIC_CONVEX_URL
```

Keep this terminal open (Convex must run continuously).

### 4. Set Up HyperIndex/Envio

In a new terminal:

```bash
cd envio

# Generate types
pnpm codegen

# Start indexer
pnpm dev
```

Keep this terminal open (indexer must run continuously).

**Verify Indexer**:
- Check logs for "Listening for events"
- GraphQL endpoint: http://localhost:8080/graphql
- Admin UI: http://localhost:8080

### 5. Start All Services

**Option A: Start everything at once (easiest)**

```bash
# From project root
npm run dev:all
```

This starts all 3 services:
- ✅ Convex backend
- ✅ HyperIndex indexer
- ✅ Next.js frontend

**Option B: Start separately (better for debugging)**

Use 3 terminals:

```bash
# Terminal 1: Convex
pnpm convex:dev

# Terminal 2: HyperIndex
cd envio && pnpm dev

# Terminal 3: Frontend
pnpm dev
```

Frontend will be available at http://localhost:3000
HyperIndex at http://localhost:8080

## Verification

### Run Setup Verification Script

```bash
npx tsx scripts/verify-setup.ts
```

This checks:
- ✅ Environment variables configured
- ✅ Monad RPC accessible
- ✅ Contract deployed
- ✅ Convex backend running
- ✅ HyperIndex endpoint accessible

### Manual Verification Steps

#### 1. Check Monad Connection

```bash
curl https://testnet-rpc.monad.xyz \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Should return current block number.

#### 2. Check Contract Deployment

Go to http://localhost:3000 and open browser console. Check for contract at address `0x99ff09C8163822c34A4d91D842B03af42A610aAC`.

#### 3. Check HyperIndex

```bash
curl http://localhost:8080/graphql \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name } } }"}'
```

Should return schema types including `Channel` and `Message`.

#### 4. Check Convex

Visit your Convex dashboard. You should see:
- `users` table
- `channels` table
- `messages` table

## Usage

### Connect Wallet

1. Open http://localhost:3000
2. Click "Connect Wallet" or type `/connect`
3. Approve MetaMask connection
4. Sign verification message
5. Wait for Smart Account creation

**Your addresses**:
- **EOA Address**: Your MetaMask wallet
- **Smart Account**: Deterministically generated from EOA

### Fund Smart Account

Smart Account needs MON tokens to pay for gas:

```bash
# In the IRC terminal
/fund 0.1
```

Or manually:
1. Copy your Smart Account address (shown after connecting)
2. Send MON from MetaMask to Smart Account address

### Create a Channel

```bash
/create #general
```

Expected flow:
1. Transaction submitted to bundler (no MetaMask popup!)
2. UserOp hash displayed
3. Confirmation message
4. Event indexed by HyperIndex
5. Channel appears in channel list

### Send a Message

```bash
/join #general
/msg #general Hello Monad!
```

Expected flow:
1. Message shows as "pending"
2. Transaction submitted
3. On-chain confirmation
4. Event indexed
5. Message marked "confirmed" with ✓

## Troubleshooting

### MetaMask Popup Appears

**Problem**: MetaMask is asking to confirm transaction

**Solution**:
- Bundler not configured correctly
- Check `NEXT_PUBLIC_BUNDLER_URL` is set
- Verify Pimlico API key is valid
- Ensure you're using Monad network in bundler URL

### "Insufficient Funds" Error

**Problem**: AA21 didn't pay prefund

**Solution**:
```bash
# Fund Smart Account
/fund 0.1

# Or check balance
/balance
```

Your Smart Account needs separate MON balance from your EOA.

### Events Not Indexing

**Problem**: Channel created but not appearing in UI

**Checklist**:
- [ ] HyperIndex running (`cd envio && pnpm dev`)
- [ ] Contract address matches in `envio/config.yaml`
- [ ] Network ID is 10143
- [ ] Logs show "Event processed"

**Debug**:
```bash
# Check HyperIndex logs
cd envio
pnpm dev

# Should see:
# "ChannelCreated event received"
# "Webhook called: /api/webhook/channel-created"
```

### Convex Not Updating

**Problem**: Data indexed but UI not updating

**Checklist**:
- [ ] Convex running (`pnpm convex:dev`)
- [ ] `CONVEX_URL` set for webhooks
- [ ] Webhook endpoint accessible
- [ ] No errors in Convex logs

**Debug**:
1. Open Convex dashboard
2. Go to Logs
3. Look for webhook calls
4. Check for errors

### Network Issues

**Problem**: Cannot connect to Monad RPC

**Solution**:
```bash
# Test RPC
curl https://testnet-rpc.monad.xyz \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

If this fails:
- Check internet connection
- Try alternative RPC (if available)
- Wait and retry (network may be congested)

### Bundler Errors

**Problem**: UserOperation rejected

**Common errors**:

1. **"Simulation failed"**
   - Smart Account may not have enough balance
   - Contract function may be reverting
   - Check gas settings

2. **"Entrypoint verification failed"**
   - Smart Account not deployed yet
   - First transaction will auto-deploy

3. **"Invalid signature"**
   - MetaMask locked
   - Wrong account selected
   - Reconnect wallet

## Development

### Run All Services

Use `tmux` or multiple terminals:

```bash
# Terminal 1: Convex
pnpm convex:dev

# Terminal 2: HyperIndex
cd envio && pnpm dev

# Terminal 3: Frontend
pnpm dev
```

Or use the dev script:
```bash
# (If you create one)
./scripts/start-dev.sh
```

### Test Suite

```bash
# Run verification
npx tsx scripts/verify-setup.ts

# Run E2E tests (requires setup)
pnpm test:e2e
```

### Code Generation

After changing smart contract:

```bash
# Rebuild contract
cd contracts
forge build

# Copy new ABI
cp out/MonadIRC.sol/MonadIRC.json ../envio/abis/
cp out/MonadIRC.sol/MonadIRC.json ../lib/contract/MonadIRC.abi.json

# Update TypeScript ABI
# (Manually update lib/contract/abi.ts)

# Regenerate Envio types
cd envio
pnpm codegen
```

After changing Envio schema:

```bash
cd envio
pnpm codegen
```

After changing Convex schema:

```bash
pnpm convex:dev
# Schema pushes automatically
```

## Production Deployment

### 1. Deploy Contract

```bash
cd contracts
forge script script/Deploy.s.sol:Deploy --broadcast --rpc-url $MONAD_RPC_URL
```

Update `NEXT_PUBLIC_CONTRACT_ADDRESS` with new address.

### 2. Deploy Convex

```bash
pnpm convex:deploy
```

Update `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_URL`.

### 3. Deploy HyperIndex

Envio can be hosted or self-hosted:
- Update `envio/config.yaml` with production contract address
- Deploy to cloud (AWS, GCP, etc.)
- Update `NEXT_PUBLIC_HYPERINDEX_URL`

### 4. Deploy Frontend

```bash
# Build
pnpm build

# Deploy to Vercel, Netlify, etc.
# Set environment variables in hosting dashboard
```

**Important**: In production, `CONVEX_URL` must be publicly accessible for HyperIndex webhooks to work.

## Security Checklist

- [ ] Never commit `.env.local`
- [ ] Use separate wallets for dev/prod
- [ ] Rotate API keys regularly
- [ ] Set up monitoring for contract events
- [ ] Implement rate limiting on webhooks
- [ ] Use HTTPS for all endpoints
- [ ] Validate all webhook payloads

## Performance Tuning

### HyperIndex

- Enable `preload_handlers: true` (already set)
- Use Effect API for external calls
- Monitor indexer lag time

### Convex

- Use indexes for all queries
- Minimize webhook payload size
- Consider batching updates

### Frontend

- Lazy load components
- Virtualize long message lists
- Cache channel data

## Support

- **Documentation**: See `ARCHITECTURE.md`
- **Issues**: GitHub Issues
- **Discord**: [Link to community]
- **Monad Docs**: https://docs.monad.xyz

## Next Steps

After setup:

1. **Test basic flow**: Create channel → Send message
2. **Monitor logs**: Watch data flow through system
3. **Customize**: Modify UI, add features
4. **Deploy**: Follow production deployment guide

Happy chatting on Monad! 🚀

