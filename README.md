# 🧠 Monad IRC

A decentralized, retro-style IRC (Internet Relay Chat) client built entirely on **Monad testnet**.

## Features

- 🎨 **Retro Terminal UI** - Old-school CRT-style interface with scanline effects
- 🔐 **Smart Account Integration** - MetaMask Delegation Toolkit for ERC-4337 Account Abstraction
- 🚀 **Alchemy Bundler** - ERC-4337 bundler for automatic gas estimation and transaction batching
- ⚡ **Simple UX** - Direct signing via MetaMask SDK
- 💬 **Real-time Chat** - On-chain messages indexed by Envio HyperIndex
- 🌐 **Multi-channel Support** - Create and join multiple chat channels
- 📊 **Live Updates** - Real-time UI updates via Convex subscriptions
- 💰 **Optional Gasless Transactions** - Paymaster support for sponsored gas fees

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Account Abstraction**: MetaMask Delegation Toolkit (ERC-4337)
- **Bundler**: Alchemy Account Abstraction Bundler
- **Blockchain**: Monad Testnet (Solidity smart contracts)
- **Indexer**: Envio HyperIndex (Event indexing)
- **Backend**: Convex (Real-time database)
- **Real-time**: Convex Reactive Queries + WebSockets

## Project Structure

```
monad-irc/
├── app/                    # Next.js app directory
├── components/             # React components
│   └── terminal/          # Terminal UI components
├── lib/                   # Utilities and core logic
│   ├── context/          # React context
│   ├── hooks/            # Custom hooks
│   ├── commands/         # Command system
│   ├── api/              # Convex API client
│   └── contract/         # Contract ABI and interactions
├── convex/                # Convex backend (serverless)
│   ├── schema.ts         # Database schema
│   ├── users.ts          # User functions
│   ├── channels.ts       # Channel functions
│   ├── messages.ts       # Message functions
│   └── http.ts           # Webhook endpoints
├── contracts/             # Solidity smart contracts
│   ├── src/
│   │   └── MonadIRC.sol  # Main IRC contract
│   └── script/           # Deployment scripts
├── envio/                 # Envio HyperIndex configuration
├── scripts/               # Installation and dev scripts
└── PRD.md                # Product Requirements Document
```

## 🚀 Quick Setup

### Prerequisites

- Node.js 18+
- MetaMask wallet
- Monad testnet ETH

### Option 1: Automated Installation (Recommended)

```bash
# Run the installation script
./scripts/install.sh

# Start development
./scripts/start-dev.sh
```

### Option 2: Manual Installation

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Initialize Convex

```bash
# Install Convex CLI globally
npm install -g convex

# Initialize Convex project
npx convex dev
```

This will:
- Open a browser for Convex login
- Create a Convex deployment
- Generate types in `convex/_generated/`
- Show your deployment URL

#### 3. Environment Configuration

Create `.env.local`:

```bash
cp .env.example .env.local
```

Update the following variables:

```bash
# Convex deployment URL (from step 2)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_WEBHOOK_URL=https://your-deployment.convex.cloud

# Contract address (after deployment)
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress

# Monad testnet (defaults work)
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_MONAD_CHAIN_ID=10143

# Alchemy Account Abstraction Bundler (REQUIRED)
# Get your API key from: https://dashboard.alchemy.com
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here
NEXT_PUBLIC_BUNDLER_URL=https://monad-testnet.g.alchemy.com/v2/your_alchemy_api_key_here

# Optional: Paymaster for gasless transactions
# NEXT_PUBLIC_PAYMASTER_URL=https://your-paymaster-url
# NEXT_PUBLIC_PAYMASTER_POLICY_ID=your_policy_id
```

**Important**: You need an Alchemy API key for bundler functionality. See [ALCHEMY_BUNDLER_SETUP.md](./ALCHEMY_BUNDLER_SETUP.md) for details.

#### 4. Deploy Smart Contract

```bash
cd contracts
make deploy
```

Copy the deployed contract address to your `.env.local` file.

#### 5. Start the Application

```bash
# Option A: Start all services together (Convex + HyperIndex + Frontend)
npm run dev:all

# Option B: Start separately (recommended for debugging)
# Terminal 1: Convex
npm run convex:dev

# Terminal 2: HyperIndex
cd envio && pnpm dev

# Terminal 3: Next.js
npm run dev
```

Open http://localhost:3000 🎉

Services available:
- Frontend: http://localhost:3000
- HyperIndex GraphQL: http://localhost:8080/graphql
- HyperIndex UI: http://localhost:8080

## ⚠️ Important: Smart Account Funding

**Your Smart Account needs MON tokens to pay for gas!**

After connecting your wallet, you must fund your Smart Account:

```bash
# Check balance
> balance

# Fund with 0.1 MON (recommended for testing)
> fund 0.1
```

Without funding, you'll get an error: `AA21 didn't pay prefund`

## Usage Guide

### Available Commands

| Command | Description |
|---------|-------------|
| `help` | Show all available commands |
| `connect wallet` | Connect MetaMask Smart Account |
| `balance` | Check Smart Account balance |
| `fund <amount>` | Fund Smart Account with MON tokens |
| `create #channelName` | Create a new channel |
| `join #channelName` | Join an existing channel |
| `leave` | Leave current channel |
| `list channels` | List all available channels |
| `clear` | Clear terminal screen |
| `logout` | Disconnect wallet |

### Getting Started

1. Open http://localhost:3000
2. Run `connect wallet` to connect MetaMask Smart Account
3. Run `balance` to check your Smart Account balance
4. Run `fund 0.1` to add MON tokens to your Smart Account (required for gas)
5. Run `create #general` to create your first channel
6. Run `join #general` to enter the channel
7. Start chatting!

## Smart Contract Architecture

The `MonadIRC.sol` contract implements:

- **Channel Management**: Create channels on-chain with duplicate prevention
- **Message Sending**: Send messages with content hash for verification
- **Event Emission**: All actions emit events for off-chain indexing
- **Simple Access Control**: Anyone can create channels and send messages
- **Gas Optimization**: Message content stored off-chain (only hash on-chain)

**Note**: All transactions signed directly via MetaMask Delegation Toolkit SDK.

## Development

### Running Tests

```bash
# Smart contract tests
cd contracts
npx hardhat test

# Frontend (add tests as needed)
npm test
```

### Convex Database Schema

- **users**: User accounts with wallet and Smart Account addresses
- **channels**: Chat channel registry
- **messages**: Message history with on-chain verification and status tracking

All data is automatically synced in real-time with Convex's reactive queries.

**Data Flow**:
1. User action → MetaMask Smart Account → Alchemy Bundler (ERC-4337) → Contract
2. Contract emits event → HyperIndex indexes
3. HyperIndex calls Convex webhook
4. Convex stores data → Frontend updates automatically

**Alchemy Bundler Flow**:
1. Smart Account prepares user operation
2. Alchemy bundler estimates gas via `eth_estimateUserOperationGas`
3. User operation submitted via `eth_sendUserOperation`
4. Bundler executes and returns transaction hash
5. Receipt fetched via `eth_getUserOperationReceipt`

## Security Considerations

- Smart Accounts controlled by EOA owner via MetaMask
- All transactions signed directly through MetaMask Delegation Toolkit
- Message content hashed for integrity verification
- Webhook payloads validated before processing
- Environment variables for sensitive data (API keys, etc.)

## Future Enhancements

- [ ] Multi-channel concurrent sessions
- [ ] Private DMs / encrypted chat
- [ ] On-chain reputation system
- [ ] Custom themes and color palettes
- [ ] WebSocket bridge for faster UX
- [ ] Mobile responsive design
- [ ] User profiles and avatars
- [ ] Channel moderation features

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

MIT License - see LICENSE file for details

## 📚 Documentation

**Complete documentation for MonadIRC:**

### Essential Guides
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete setup instructions

### Configuration & Reference
- **[QUICK_START.md](./QUICK_START.md)** - Get started in 5 minutes

### For Contributors
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines

## Support

For issues and questions:
- Open a GitHub issue
- Check the documentation above
- Visit [Convex Discord](https://convex.dev/community) for backend questions

---

Built with ❤️ on Monad + Convex

