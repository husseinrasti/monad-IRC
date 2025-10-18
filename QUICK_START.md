# 🚀 Quick Start - Monad IRC with Convex

Get your Monad IRC application up and running in minutes!

## Prerequisites

- Node.js 18+ installed
- npm package manager
- MetaMask wallet (for testing)

---

## Step 1: Install Dependencies

```bash
npm install
```

---

## Step 2: Initialize Convex

```bash
npx convex dev
```

**What this does:**
1. Opens browser for Convex login/signup
2. Creates a new Convex project
3. Generates types in `convex/_generated/`
4. Starts Convex dev server
5. Shows your deployment URL

**Keep this terminal running!**

---

## Step 3: Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```bash
# Convex URL (from step 2)
NEXT_PUBLIC_CONVEX_URL=https://happy-animal-123.convex.cloud

# Same URL for webhooks
CONVEX_WEBHOOK_URL=https://happy-animal-123.convex.cloud

# Your deployed contract address
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedContractAddress

# Monad testnet (default values work)
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_MONAD_CHAIN_ID=10143
```

---

## Step 4: Start the Frontend

Open a new terminal:

```bash
npm run dev
```

Your app will be available at: http://localhost:3000

---

## Step 5: Test the Application

### Option A: Quick Test (Recommended)

1. Open http://localhost:3000
2. Type: `connect wallet`
3. Connect your MetaMask wallet
4. Create a user account
5. Type: `create #test`
6. Type: `join #test`
7. Start chatting!

### Option B: Manual API Test

Test Convex health endpoint:

```bash
curl https://your-deployment.convex.cloud/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-16T...",
  "service": "monad-irc-convex"
}
```

---

## 📂 Project Structure

```
monad-irc/
├── convex/                    # Backend (Convex functions)
│   ├── schema.ts             # Database schema
│   ├── users.ts              # User functions
│   ├── channels.ts           # Channel functions
│   ├── messages.ts           # Message functions
│   ├── sessions.ts           # Session functions
│   └── http.ts               # Webhook endpoints
│
├── app/                       # Frontend (Next.js)
│   ├── page.tsx              # Main page
│   └── globals.css           # Global styles
│
├── components/                # React components
│   ├── terminal/             # Terminal UI
│   └── ui/                   # UI components
│
├── lib/                       # Utilities
│   ├── api/client.ts         # Convex API client
│   ├── hooks/                # React hooks
│   └── types.ts              # TypeScript types
│
├── contracts/                 # Smart contracts (Foundry)
│   └── src/MonadIRC.sol      # Main contract
│
└── envio/                     # Event indexer
    └── src/eventHandlers.ts  # Event handlers
```

---

## 🎮 Available Commands

### Development

```bash
# Start both Next.js and Convex
npm run dev:all

# Or run separately:
npm run dev          # Next.js only
npm run convex:dev   # Convex only
```

### Production

```bash
# Deploy Convex functions
npm run convex:deploy

# Build Next.js
npm run build
npm run start
```

### Utilities

```bash
# Lint code
npm run lint

# Smart contract commands (in contracts/ dir)
cd contracts
make test            # Test contracts
make deploy          # Deploy to Monad
```

---

## 🔧 Common Commands

### In the IRC Terminal

| Command | Description |
|---------|-------------|
| `help` | Show all available commands |
| `connect wallet` | Connect MetaMask wallet |
| `create #channelName` | Create a new channel |
| `join #channelName` | Join an existing channel |
| `leave` | Leave current channel |
| `list channels` | List all available channels |
| `clear` | Clear terminal screen |
| `logout` | End session |

---

## 📊 Monitoring

### Convex Dashboard

Visit: https://dashboard.convex.dev

- **Functions**: View all deployed functions
- **Data**: Browse database tables
- **Logs**: Real-time function logs
- **Settings**: Environment variables, team settings

### Check Database

In the Convex dashboard:
1. Click "Data"
2. Browse tables: `users`, `channels`, `messages`, `sessions`
3. View real-time updates as you interact with the app

---

## 🐛 Troubleshooting

### "Cannot find module 'convex/_generated/api'"

**Solution:**
```bash
# Run Convex dev server
npm run convex:dev
```

### "Convex client not initialized"

**Solution:**
Check that `NEXT_PUBLIC_CONVEX_URL` is set in `.env.local`

### Webpack errors about TypeScript

**Solution:**
```bash
# Delete generated files and restart
rm -rf convex/_generated
npm run convex:dev
```

### Webhook errors

**Solution:**
1. Check Convex function logs in dashboard
2. Verify `CONVEX_WEBHOOK_URL` is set
3. Ensure Convex deployment is running

### MetaMask not connecting

**Solution:**
1. Ensure you're on Monad testnet
2. Add Monad testnet to MetaMask:
   - Network Name: Monad Testnet
   - RPC URL: https://testnet-rpc.monad.xyz
   - Chain ID: 10143
   - Currency Symbol: MON

---

## 📚 Learn More

- [Complete Setup Guide](./CONVEX_SETUP.md)
- [Migration Guide](./CONVEX_MIGRATION.md)
- [Convex Documentation](https://docs.convex.dev)
- [Next.js Documentation](https://nextjs.org/docs)

---

## 🎯 What's Working

✅ Convex backend with real-time queries  
✅ User management  
✅ Channel creation and listing  
✅ Real-time messaging  
✅ Session key management  
✅ HyperIndex webhook integration  
✅ Smart contract events → Convex sync  
✅ Terminal-style UI  

---

## 🚀 Production Deployment

### 1. Deploy Convex

```bash
npm run convex:deploy
```

### 2. Update Environment Variables

Update production `.env` with production Convex URL

### 3. Deploy Frontend

Deploy to Vercel, Netlify, or your preferred platform:

```bash
npm run build
```

### 4. Configure HyperIndex

Update Envio config with production Convex URL:

```yaml
webhooks:
  convex_url: https://your-production-deployment.convex.cloud
```

---

## 💡 Tips

1. **Keep Convex dev server running** while developing
2. **Check Convex dashboard logs** for debugging
3. **Use TypeScript** for better type safety
4. **Test webhooks manually** before connecting HyperIndex
5. **Monitor function performance** in Convex dashboard

---

## 🎉 You're Ready!

Everything is set up and ready to go. Start by running:

```bash
# Terminal 1
npm run convex:dev

# Terminal 2
npm run dev
```

Then open http://localhost:3000 and start chatting! 🚀

---

**Need help?** Check the [CONVEX_SETUP.md](./CONVEX_SETUP.md) or [BACKEND_MIGRATION_COMPLETE.md](./BACKEND_MIGRATION_COMPLETE.md) for more details.

