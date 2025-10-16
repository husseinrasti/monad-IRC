#!/bin/bash

# MonadIRC Contracts Setup Script
# This script sets up the Foundry development environment

set -e

echo "🚀 Setting up MonadIRC Contracts..."
echo ""

# Check if Foundry is installed
if ! command -v forge &> /dev/null; then
    echo "❌ Foundry is not installed."
    echo "📦 Installing Foundry..."
    curl -L https://foundry.paradigm.xyz | bash
    source ~/.bashrc || source ~/.zshrc
    foundryup
else
    echo "✅ Foundry is already installed"
fi

# Update Foundry
echo "🔄 Updating Foundry..."
foundryup

# Install dependencies
echo "📦 Installing dependencies..."
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit

# Build contracts
echo "🔨 Building contracts..."
forge build

# Run tests
echo "🧪 Running tests..."
forge test

# Generate gas report
echo "⛽ Generating gas report..."
forge test --gas-report

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "  1. Copy .env.example to .env and add your private key"
echo "  2. Run 'make test' to run tests"
echo "  3. Run 'make deploy' to deploy to Monad testnet"
echo ""
echo "📖 Read README.md for more information"

