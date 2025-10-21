#!/bin/bash

# VPS Production Deployment Script
# This script properly deploys Monad IRC on a VPS with PM2

set -e  # Exit on error

echo "🚀 Deploying Monad IRC on VPS"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

echo "Project root: $PROJECT_ROOT"
echo ""

# Check for required commands
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm not found. Installing...${NC}"
    npm install -g pnpm@10.18.3
fi
echo -e "${GREEN}✓ pnpm detected${NC}"

if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 not found. Installing...${NC}"
    npm install -g pm2
    echo -e "${GREEN}✓ PM2 installed${NC}"
else
    echo -e "${GREEN}✓ PM2 detected${NC}"
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo -e "${YELLOW}Envio requires Docker. Install it with:${NC}"
    echo "  curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "  sudo sh get-docker.sh"
    exit 1
fi
echo -e "${GREEN}✓ Docker detected${NC}"

# Check if Docker is running
if ! docker ps &> /dev/null; then
    echo -e "${RED}❌ Docker is not running${NC}"
    echo -e "${YELLOW}Starting Docker...${NC}"
    sudo systemctl start docker
    sleep 5
    
    if ! docker ps &> /dev/null; then
        echo -e "${RED}Failed to start Docker${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ Docker is running${NC}"
echo ""

# Check for .env.local
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local file not found${NC}"
    echo -e "${YELLOW}Please create .env.local with required environment variables${NC}"
    echo "See ENV_SETUP.md for details"
    exit 1
fi
echo -e "${GREEN}✓ .env.local found${NC}"

# Stop existing PM2 processes
echo ""
echo "Stopping existing PM2 processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Kill any process on port 4000
echo "Freeing port 4000..."
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
sleep 2

# Install dependencies
echo ""
echo "Installing dependencies..."
pnpm install

echo "Installing Envio dependencies..."
cd envio && pnpm install && cd ..

echo -e "${GREEN}✓ Dependencies installed${NC}"

# Create PM2 ecosystem file
echo ""
echo "Creating PM2 configuration..."

cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'monad-frontend',
      script: 'pnpm',
      args: 'dev',
      env: {
        NODE_ENV: 'development',
        PORT: 4000
      },
      watch: false,
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'monad-convex',
      script: 'pnpm',
      args: 'convex:dev',
      env: {
        NODE_ENV: 'development'
      },
      watch: false,
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      error_file: './logs/convex-error.log',
      out_file: './logs/convex-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'monad-envio',
      script: 'pnpm',
      args: 'dev',
      cwd: './envio',
      env: {
        NODE_ENV: 'development',
        TUI_OFF: 'true'
      },
      watch: false,
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      error_file: '../logs/envio-error.log',
      out_file: '../logs/envio-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
EOF

echo -e "${GREEN}✓ PM2 configuration created${NC}"

# Create logs directory
mkdir -p logs

# Start services with PM2
echo ""
echo "Starting services with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
echo ""
echo "Configuring PM2 to start on system boot..."
pm2 startup || echo -e "${YELLOW}⚠️  Run the command above to enable PM2 on startup${NC}"

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Services Running:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📱 Frontend:       http://localhost:4000"
echo "  🗄️  HyperIndex:     http://localhost:8080"
echo "  📊 GraphQL:        http://localhost:8080/graphql"
echo "  🔧 Convex:         https://dashboard.convex.dev"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Useful Commands:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  View status:       pm2 status"
echo "  View logs:         pm2 logs"
echo "  View frontend:     pm2 logs monad-frontend"
echo "  View envio:        pm2 logs monad-envio"
echo "  View convex:       pm2 logs monad-convex"
echo "  Restart all:       pm2 restart all"
echo "  Stop all:          pm2 stop all"
echo "  Monitor:           pm2 monit"
echo ""
echo -e "${YELLOW}Note: It may take 30-60 seconds for all services to fully start${NC}"
echo ""

