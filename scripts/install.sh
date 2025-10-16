#!/bin/bash

# Monad IRC Installation Script
# This script automates the setup process

set -e  # Exit on error

echo "🧠 Welcome to Monad IRC Setup!"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Check for PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL is not installed. Please install PostgreSQL 14+.${NC}"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt-get install postgresql"
    exit 1
fi

echo -e "${GREEN}✓ PostgreSQL detected${NC}"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd server
npm install
cd ..
echo -e "${GREEN}✓ Backend dependencies installed${NC}"
echo ""

# Install contract dependencies
echo "📦 Installing contract dependencies..."
cd contracts
npm install
cd ..
echo -e "${GREEN}✓ Contract dependencies installed${NC}"
echo ""

# Setup environment files
echo "⚙️  Setting up environment files..."

# Frontend .env
if [ ! -f ".env.local" ]; then
    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        echo -e "${GREEN}✓ Created .env.local${NC}"
    else
        echo -e "${RED}❌ .env.local.example not found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .env.local already exists, skipping...${NC}"
fi

# Backend .env
if [ ! -f "server/.env" ]; then
    if [ -f "server/.env.example" ]; then
        cp server/.env.example server/.env
        # Auto-set DB_USER to current system user
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/DB_USER=postgre/DB_USER=$USER/" server/.env
        else
            sed -i "s/DB_USER=postgre/DB_USER=$USER/" server/.env
        fi
        echo -e "${GREEN}✓ Created server/.env (DB_USER set to $USER)${NC}"
    else
        echo -e "${RED}❌ server/.env.example not found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  server/.env already exists, skipping...${NC}"
fi

# Contracts .env
if [ ! -f "contracts/.env" ]; then
    if [ -f "contracts/.env.example" ]; then
        cp contracts/.env.example contracts/.env
        echo -e "${GREEN}✓ Created contracts/.env${NC}"
        echo -e "${YELLOW}⚠️  Remember to add your PRIVATE_KEY to contracts/.env before deploying!${NC}"
    else
        echo -e "${RED}❌ contracts/.env.example not found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  contracts/.env already exists, skipping...${NC}"
fi

# Envio .env
if [ ! -f "envio/.env" ]; then
    if [ -f "envio/.env.example" ]; then
        cp envio/.env.example envio/.env
        # Auto-set DB_USER to current system user
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/DB_USER=postgre/DB_USER=$USER/" envio/.env
        else
            sed -i "s/DB_USER=postgre/DB_USER=$USER/" envio/.env
        fi
        echo -e "${GREEN}✓ Created envio/.env (DB_USER set to $USER)${NC}"
    else
        echo -e "${RED}❌ envio/.env.example not found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  envio/.env already exists, skipping...${NC}"
fi

echo ""

# Database setup prompt
echo "🗄️  Database Setup"
echo "==================="
read -p "Do you want to set up the database now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter database name (default: monad_irc): " DB_NAME
    DB_NAME=${DB_NAME:-monad_irc}
    
    read -p "Enter PostgreSQL username (default: $USER): " DB_USER
    DB_USER=${DB_USER:-$USER}
    
    echo "Creating database..."
    psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database might already exist, continuing..."
    
    echo "Running migrations..."
    cd server
    npm run db:migrate
    cd ..
    
    echo -e "${GREEN}✓ Database setup complete${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping database setup. Run manually: cd server && npm run db:migrate${NC}"
fi

echo ""
echo "🎉 Installation Complete!"
echo "========================="
echo ""
echo -e "${GREEN}Environment files have been created!${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
echo ""
echo "1. 📝 Add your private key to contracts/.env:"
echo "   ${YELLOW}PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE${NC}"
echo "   (Get from MetaMask → Account Details → Export Private Key)"
echo ""
echo "2. 💰 Get Monad testnet ETH:"
echo "   Visit: https://faucet.monad.xyz"
echo ""
echo "3. 🚀 Deploy the smart contract:"
echo "   ${YELLOW}cd contracts && npx hardhat run scripts/deploy.ts --network monadTestnet${NC}"
echo ""
echo "4. 📋 Update contract address in .env.local:"
echo "   ${YELLOW}NEXT_PUBLIC_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS${NC}"
echo ""
echo "5. ▶️  Start the application:"
echo "   Terminal 1: ${YELLOW}npm run dev${NC}"
echo "   Terminal 2: ${YELLOW}cd server && npm run dev${NC}"
echo ""
echo "📚 Documentation:"
echo "   - Quick Reference: ${YELLOW}ENV_QUICK_REFERENCE.md${NC}"
echo "   - Detailed Guide: ${YELLOW}ENV_SETUP.md${NC}"
echo "   - Setup Instructions: ${YELLOW}SETUP.md${NC}"
echo ""
echo -e "${GREEN}Happy chatting on Monad IRC! 🚀${NC}"

