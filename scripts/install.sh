#!/bin/bash

# Monad IRC Installation Script
# This script automates the setup process with Convex backend

set -e  # Exit on error

echo "🧠 Welcome to Monad IRC Setup!"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check for Node.js
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher. Current: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"
echo ""

# Install main dependencies
echo "📦 Installing dependencies..."
npm install
echo -e "${GREEN}✓ Dependencies installed (includes Convex)${NC}"
echo ""

# Install contract dependencies
echo "📦 Installing contract dependencies..."
cd contracts
npm install
cd ..
echo -e "${GREEN}✓ Contract dependencies installed${NC}"
echo ""

# Check if Convex CLI is installed globally
echo "🔍 Checking for Convex CLI..."
if ! command -v convex &> /dev/null; then
    echo -e "${YELLOW}Installing Convex CLI globally...${NC}"
    npm install -g convex
    echo -e "${GREEN}✓ Convex CLI installed${NC}"
else
    echo -e "${GREEN}✓ Convex CLI already installed${NC}"
fi
echo ""

# Setup environment files
echo "⚙️  Setting up environment files..."

# Frontend .env
if [ ! -f ".env.local" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo -e "${GREEN}✓ Created .env.local from .env.example${NC}"
    else
        echo -e "${YELLOW}Creating .env.local with default values...${NC}"
        cat > .env.local << 'EOF'
# Monad IRC Environment Variables

# ======================
# Convex Configuration
# ======================
# Run 'npx convex dev' to get your deployment URL
NEXT_PUBLIC_CONVEX_URL=

# For HyperIndex webhook integration
CONVEX_WEBHOOK_URL=

# ======================
# Monad Blockchain
# ======================
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_MONAD_CHAIN_ID=10143

# Contract address (deployed MonadIRC contract)
NEXT_PUBLIC_CONTRACT_ADDRESS=

# ======================
# Envio HyperIndex
# ======================
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
START_BLOCK=0

# ======================
# Development
# ======================
NODE_ENV=development
EOF
        echo -e "${GREEN}✓ Created .env.local with default values${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .env.local already exists, skipping...${NC}"
fi

# Contracts .env
if [ ! -f "contracts/.env" ]; then
    echo -e "${YELLOW}Creating contracts/.env...${NC}"
    cat > contracts/.env << 'EOF'
# Private key for contract deployment (DO NOT COMMIT!)
PRIVATE_KEY=

# Monad testnet RPC
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
EOF
    echo -e "${GREEN}✓ Created contracts/.env${NC}"
    echo -e "${YELLOW}⚠️  Remember to add your PRIVATE_KEY to contracts/.env before deploying!${NC}"
else
    echo -e "${YELLOW}⚠️  contracts/.env already exists, skipping...${NC}"
fi

echo ""

# Convex setup prompt
echo "☁️  Convex Setup"
echo "================"
echo -e "${BLUE}Convex is your serverless backend - no database setup required!${NC}"
read -p "Do you want to initialize Convex now? (y/n) " -n 1 -r
echo ""
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Initializing Convex...${NC}"
    echo "This will:"
    echo "  1. Open a browser for Convex login/signup"
    echo "  2. Create a new Convex project"
    echo "  3. Generate types in convex/_generated/"
    echo "  4. Show your deployment URL"
    echo ""
    echo -e "${YELLOW}After initialization, copy the deployment URL to your .env.local${NC}"
    echo ""
    read -p "Press Enter to continue..." -r
    
    # Initialize Convex
    npx convex dev --once || {
        echo -e "${RED}❌ Convex initialization failed${NC}"
        echo -e "${YELLOW}You can run this manually later: npx convex dev${NC}"
    }
    
    echo ""
    echo -e "${GREEN}✓ Convex initialization complete${NC}"
    echo -e "${YELLOW}📝 Remember to add your NEXT_PUBLIC_CONVEX_URL to .env.local${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping Convex setup.${NC}"
    echo -e "${YELLOW}   Run manually: npx convex dev${NC}"
fi

echo ""
echo "🎉 Installation Complete!"
echo "========================="
echo ""
echo -e "${GREEN}Environment files have been created!${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
echo ""
echo "1. ☁️  Initialize Convex (if you haven't already):"
echo "   ${YELLOW}npx convex dev${NC}"
echo "   Copy the deployment URL to .env.local:"
echo "   ${YELLOW}NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud${NC}"
echo "   ${YELLOW}CONVEX_WEBHOOK_URL=https://your-deployment.convex.cloud${NC}"
echo ""
echo "2. 📝 Add your private key to contracts/.env:"
echo "   ${YELLOW}PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE${NC}"
echo "   (Get from MetaMask → Account Details → Export Private Key)"
echo ""
echo "3. 💰 Get Monad testnet ETH:"
echo "   Visit: https://faucet.monad.xyz"
echo ""
echo "4. 🚀 Deploy the smart contract:"
echo "   ${YELLOW}cd contracts && make deploy${NC}"
echo ""
echo "5. 📋 Update contract address in .env.local:"
echo "   ${YELLOW}NEXT_PUBLIC_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS${NC}"
echo ""
echo "6. ▶️  Start the application:"
echo "   ${YELLOW}npm run dev:all${NC}"
echo "   Or separately:"
echo "   Terminal 1: ${YELLOW}npm run convex:dev${NC}"
echo "   Terminal 2: ${YELLOW}npm run dev${NC}"
echo ""
echo "📚 Documentation:"
echo "   - Quick Start: ${YELLOW}QUICK_START.md${NC}"
echo "   - Convex Setup: ${YELLOW}CONVEX_SETUP.md${NC}"
echo "   - Migration Guide: ${YELLOW}CONVEX_MIGRATION.md${NC}"
echo ""
echo -e "${BLUE}📖 New to Convex?${NC}"
echo "   Convex is your serverless backend - no database setup needed!"
echo "   Visit: ${BLUE}https://docs.convex.dev${NC}"
echo ""
echo -e "${GREEN}Happy chatting on Monad IRC! 🚀${NC}"

