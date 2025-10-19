#!/bin/bash

# Development startup script
# Runs frontend and Convex backend concurrently

echo "🚀 Starting Monad IRC Development Environment"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Please install Node.js${NC}"
    exit 1
fi

# Check if Convex is initialized
if [ ! -d "convex/_generated" ]; then
    echo -e "${YELLOW}⚠️  Convex not initialized yet.${NC}"
    echo ""
    read -p "Do you want to initialize Convex now? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Initializing Convex...${NC}"
        npx convex dev --once
        echo ""
        echo -e "${GREEN}✓ Convex initialized${NC}"
        echo -e "${YELLOW}📝 Remember to update NEXT_PUBLIC_CONVEX_URL in .env.local${NC}"
        echo ""
    else
        echo -e "${RED}❌ Convex must be initialized before starting dev environment${NC}"
        echo "Run: ${YELLOW}npx convex dev${NC}"
        exit 1
    fi
fi

# Check for .env.local
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  .env.local not found${NC}"
    echo "Creating from .env.example..."
    
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo -e "${GREEN}✓ Created .env.local${NC}"
        echo -e "${YELLOW}⚠️  Please update NEXT_PUBLIC_CONVEX_URL in .env.local${NC}"
    else
        echo -e "${RED}❌ .env.example not found. Please create .env.local manually${NC}"
        exit 1
    fi
fi

# Check if concurrently is installed locally
if ! npm list concurrently &> /dev/null; then
    echo -e "${YELLOW}📦 Installing concurrently...${NC}"
    npm install --save-dev concurrently
    echo -e "${GREEN}✓ concurrently installed${NC}"
    echo ""
fi

# Check if envio directory exists
if [ ! -d "envio" ]; then
    echo -e "${RED}❌ envio directory not found${NC}"
    exit 1
fi

# Check if envio node_modules exists
if [ ! -d "envio/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing envio dependencies...${NC}"
    cd envio && pnpm install && cd ..
    echo -e "${GREEN}✓ envio dependencies installed${NC}"
    echo ""
fi

# Start services
echo -e "${GREEN}Starting all services...${NC}"
echo "- Frontend: ${BLUE}http://localhost:3000${NC}"
echo "- HyperIndex GraphQL: ${BLUE}http://localhost:8080/graphql${NC}"
echo "- HyperIndex UI: ${BLUE}http://localhost:8080${NC}"
echo "- Convex Dashboard: ${BLUE}https://dashboard.convex.dev${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Use npm run dev:all which uses concurrently to run all 3 services
npm run dev:all
