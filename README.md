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
- **Backend**: Node.js, Express, PostgreSQL
- **Real-time**: GraphQL Subscriptions

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
│   ├── api/              # API client
│   └── contract/         # Contract ABI and interactions
├── contracts/             # Solidity smart contracts
│   ├── MonadIRC.sol      # Main IRC contract
│   └── scripts/          # Deployment scripts
├── server/                # Express backend
│   ├── src/
│   │   ├── routes/       # API routes
│   │   └── db/           # Database setup
│   └── package.json
├── envio/                 # Envio HyperIndex configuration
└── PRD.md                # Product Requirements Document
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL
- MetaMask wallet
- Monad testnet ETH

### 1. Install Dependencies

```bash
# Root (frontend)
npm install

# Backend
cd server
npm install

# Contracts
cd ../contracts
npm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb monad_irc

# Run migrations
cd server
npm run db:migrate
```

### 3. Environment Configuration

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Update the following variables:
- `NEXT_PUBLIC_CONTRACT_ADDRESS` - After deploying the contract
- `MONAD_RPC_URL` - Monad testnet RPC endpoint
- `PRIVATE_KEY` - For contract deployment
- Database credentials

### 4. Deploy Smart Contract

```bash
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy.ts --network monadTestnet
```

Copy the deployed contract address to your `.env` file.

### 5. Start the Application

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd server
npm run dev

# Terminal 3: Envio Indexer (optional)
cd envio
npm run dev
```

## Usage Guide

### Available Commands

| Command | Description |
|---------|-------------|
| `help` | Show all available commands |
| `connect wallet` | Connect MetaMask wallet |
| `authorize session` | Authorize session key for gasless transactions |
| `create #channelName` | Create a new channel |
| `join #channelName` | Join an existing channel |
| `leave` | Leave current channel |
| `list channels` | List all available channels |
| `clear` | Clear terminal screen |
| `logout` | Disconnect wallet and end session |

### Getting Started

1. Open http://localhost:3000
2. Run `connect wallet` to connect MetaMask
3. Run `authorize session` to enable gasless messaging (one-time setup)
4. Run `create #general` to create your first channel
5. Run `join #general` to enter the channel
6. Start chatting!

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

### Database Schema

- **users**: User accounts linked to wallet addresses
- **sessions**: Session key authorization records
- **channels**: Chat channel registry
- **messages**: Message history with on-chain verification

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

## Support

For issues and questions:
- Open a GitHub issue
- Check the PRD.md for detailed specifications

---

Built with ❤️ on Monad

