# 🧠 Monad IRC

A decentralized, retro-style IRC (Internet Relay Chat) client built entirely on **Monad testnet**.

## Features

- 🎨 **Retro Terminal UI** - Old-school CRT-style interface with scanline effects
- 🔐 **Smart Account Integration** - MetaMask Delegation Toolkit for session-based auth
- ⚡ **Gasless Transactions** - Session keys enable signing without constant MetaMask popups
- 💬 **Real-time Chat** - On-chain messages indexed by Envio HyperIndex
- 🌐 **Multi-channel Support** - Create and join multiple chat channels

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Wallet**: MetaMask Delegation Toolkit
- **Blockchain**: Monad Testnet (Solidity smart contracts)
- **Indexer**: Envio HyperIndex
- **Backend**: Convex (Serverless)
- **Real-time**: Convex Reactive Queries

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
│   ├── sessions.ts       # Session functions
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

# ERC-4337 Bundler URL (REQUIRED for account abstraction)
# See BUNDLER_SETUP.md for configuration options
NEXT_PUBLIC_BUNDLER_URL=https://your-bundler-url
```

**⚠️  Important**: Account abstraction features require a bundler service.

#### 4. Deploy Smart Contract

```bash
cd contracts
make deploy
```

Copy the deployed contract address to your `.env.local` file.

#### 5. Start the Application

```bash
# Option A: Start both together
npm run dev:all

# Option B: Start separately
# Terminal 1: Convex
npm run convex:dev

# Terminal 2: Next.js
npm run dev
```

Open http://localhost:3000 🎉

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
| `connect wallet` | Connect MetaMask wallet |
| `authorize session` | Authorize session key for gasless transactions |
| `balance` | Check Smart Account balance |
| `fund <amount>` | Fund Smart Account with MON tokens |
| `create #channelName` | Create a new channel |
| `join #channelName` | Join an existing channel |
| `leave` | Leave current channel |
| `list channels` | List all available channels |
| `clear` | Clear terminal screen |
| `logout` | Disconnect wallet and end session |

### Getting Started

1. Open http://localhost:3000
2. Run `connect wallet` to connect MetaMask
3. Run `balance` to check your Smart Account balance
4. Run `fund 0.1` to add MON tokens to your Smart Account (required for gas)
5. Run `authorize session` to enable gasless messaging (one-time setup)
6. Run `create #general` to create your first channel
7. Run `join #general` to enter the channel
8. Start chatting!

## Smart Contract Architecture

The `MonadIRC.sol` contract implements:

- **Session Authorization**: Smart accounts can authorize session keys with expiry
- **Channel Management**: Create channels on-chain
- **Signed Messages**: Send messages using session key signatures
- **Replay Protection**: Nonce-based replay attack prevention
- **Event Emission**: All actions emit events for off-chain indexing

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

- **users**: User accounts linked to wallet addresses
- **sessions**: Session key authorization records  
- **channels**: Chat channel registry
- **messages**: Message history with on-chain verification

All data is automatically synced in real-time with Convex's reactive queries.

## Security Considerations

- Session keys are stored in browser memory (not persisted)
- All messages are signed and verified on-chain
- Session keys have expiry timestamps
- Nonce-based replay protection

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

- **[QUICK_START.md](./QUICK_START.md)** - Get started in 5 minutes

## Support

For issues and questions:
- Open a GitHub issue
- Check the documentation above
- Visit [Convex Discord](https://convex.dev/community) for backend questions

---

Built with ❤️ on Monad + Convex

