# MonadIRC Smart Contracts

Foundry-based smart contract implementation for Monad IRC - a decentralized IRC chat system with session key authorization.

## 📋 Overview

The MonadIRC contract implements:
- **Session-based authentication** for gasless message sending
- **On-chain channel creation** with creator tracking
- **Message verification** using ECDSA signatures
- **Replay protection** with nonces and message hash tracking
- **Time-bound sessions** with expiry management

## 🛠️ Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- Node.js 18+ (optional, for additional tooling)

### Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
forge install OpenZeppelin/openzeppelin-contracts
forge install foundry-rs/forge-std
```

### 2. Build Contracts

```bash
forge build
```

### 3. Run Tests

```bash
# Run all tests
forge test

# Run tests with verbosity
forge test -vvv

# Run specific test
forge test --match-test test_AuthorizeSession

# Run tests with gas report
forge test --gas-report

# Run tests with coverage
forge coverage
```

### 4. Deploy Contract

```bash
# Create .env file with your private key
cp .env.example .env
# Edit .env and add your PRIVATE_KEY

# Deploy to Monad Testnet
make deploy
```

## 📁 Project Structure

```
contracts/
├── src/
│   └── MonadIRC.sol          # Main contract
├── test/
│   └── MonadIRC.t.sol        # Comprehensive test suite
├── script/
│   └── Deploy.s.sol          # Deployment script for Monad testnet
├── foundry.toml              # Foundry configuration
├── remappings.txt            # Import remappings
└── README.md                 # This file
```

## 🧪 Test Coverage

The test suite includes:

### Session Authorization Tests
- ✅ Authorize session with valid parameters
- ✅ Reject zero address session keys
- ✅ Reject past expiry timestamps
- ✅ Overwrite existing sessions
- ✅ Fuzz testing for session authorization

### Session Revocation Tests
- ✅ Revoke active sessions
- ✅ Reject revoking non-existent sessions
- ✅ Prevent double revocation

### Session Validation Tests
- ✅ Check expired sessions
- ✅ Handle non-existent sessions

### Channel Creation Tests
- ✅ Create channels with valid names
- ✅ Reject short/empty channel names
- ✅ Prevent duplicate channels
- ✅ Support multiple channels
- ✅ Fuzz testing for channel names

### Message Sending Tests
- ✅ Send signed messages with valid signatures
- ✅ Reject messages to non-existent channels
- ✅ Prevent duplicate messages
- ✅ Validate session authorization
- ✅ Enforce nonce ordering
- ✅ Check timestamp bounds
- ✅ Verify ECDSA signatures
- ✅ Support multiple messages

### Integration Tests
- ✅ Full workflow (authorize → create → send)
- ✅ Multi-user scenarios

Run tests with coverage:
```bash
forge coverage
```

## 📝 Contract Interface

### Key Functions

```solidity
// Session Management
function authorizeSession(address sessionKey, uint256 expiry) external
function revokeSession() external
function isSessionValid(address smartAccount) public view returns (bool)
function getSession(address smartAccount) external view returns (address, uint256, bool)

// Channel Management
function createChannel(string memory channelName) external

// Message Sending
function sendMessageSigned(
    bytes32 msgHash,
    string memory channel,
    uint256 nonce,
    uint256 timestamp,
    address smartAccount,
    bytes memory signature
) external

// Utilities
function getNonce(address smartAccount) external view returns (uint256)
```

### Events

```solidity
event SessionAuthorized(address indexed smartAccount, address indexed sessionKey, uint256 expiry, uint256 timestamp)
event SessionRevoked(address indexed smartAccount, address indexed sessionKey, uint256 timestamp)
event ChannelCreated(string channelName, address indexed creator, uint256 timestamp)
event MessageSent(bytes32 indexed msgHash, address indexed sessionKey, string channel, uint256 timestamp)
```

## 🔒 Security Features

- **Custom errors** for gas-efficient reverts
- **ECDSA signature verification** using OpenZeppelin
- **Replay protection** with nonces
- **Message hash tracking** to prevent duplicates
- **Timestamp validation** with 5-minute drift tolerance
- **Session expiry** enforcement
- **Comprehensive test coverage**

## 🧰 Development Commands

```bash
# Compile contracts
forge build

# Run tests
forge test

# Format code
forge fmt

# Generate documentation
forge doc

# Analyze gas usage
forge test --gas-report

# Check code coverage
forge coverage

# Run slither (requires slither)
slither .

# Clean build artifacts
forge clean
```

## 🔧 Configuration

Edit `foundry.toml` to customize:
- Solidity version
- Optimizer settings
- Test configurations
- RPC endpoints
- Etherscan API settings

## 📦 Dependencies

- [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) - Secure smart contract library
- [Forge Std](https://github.com/foundry-rs/forge-std) - Testing utilities

## 🌐 Network Configuration

### Monad Testnet
- RPC URL: `https://testnet-rpc.monad.xyz`
- Chain ID: `10143`
- Explorer: https://testnet.monadexplorer.com

## 📚 Additional Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Monad Documentation](https://docs.monad.xyz/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass: `forge test`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

