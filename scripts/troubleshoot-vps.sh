#!/bin/bash

# VPS Troubleshooting Script
# Run this script to diagnose common deployment issues

echo "🔍 Monad IRC VPS Troubleshooting"
echo "================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SUCCESS=0
WARNINGS=0
ERRORS=0

# Helper functions
check_pass() {
    echo -e "${GREEN}✓ $1${NC}"
    ((SUCCESS++))
}

check_warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
    ((WARNINGS++))
}

check_fail() {
    echo -e "${RED}✗ $1${NC}"
    ((ERRORS++))
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Checking System Requirements"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    if [[ "$NODE_VERSION" == v20* ]]; then
        check_pass "Node.js $NODE_VERSION (correct version)"
    else
        check_warn "Node.js $NODE_VERSION (v20 recommended)"
    fi
else
    check_fail "Node.js not installed"
fi

# Check pnpm
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm -v)
    check_pass "pnpm $PNPM_VERSION installed"
else
    check_fail "pnpm not installed"
fi

# Check pm2
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 -v)
    check_pass "PM2 $PM2_VERSION installed"
else
    check_warn "PM2 not installed (recommended for production)"
fi

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    check_pass "$DOCKER_VERSION installed"
    
    # Check if Docker is running
    if docker ps &> /dev/null; then
        check_pass "Docker daemon is running"
    else
        check_fail "Docker daemon is not running"
        echo "  Fix: sudo systemctl start docker"
    fi
else
    check_fail "Docker not installed (required for Envio)"
    echo "  Fix: curl -fsSL https://get.docker.com | sh"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Checking Port Availability"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check port 4000 (Frontend)
if lsof -i:4000 &> /dev/null; then
    PID=$(lsof -ti:4000)
    PROCESS=$(ps -p $PID -o comm=)
    check_warn "Port 4000 in use by process $PROCESS (PID: $PID)"
    echo "  Fix: kill -9 $PID"
else
    check_pass "Port 4000 available"
fi

# Check port 8080 (HyperIndex)
if lsof -i:8080 &> /dev/null; then
    PID=$(lsof -ti:8080)
    PROCESS=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
    check_pass "Port 8080 in use (HyperIndex running)"
else
    check_warn "Port 8080 not in use (HyperIndex may not be running)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Checking Project Structure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if we're in the project directory
if [ -f "package.json" ]; then
    check_pass "package.json found"
else
    check_fail "package.json not found (run from project root)"
fi

# Check node_modules
if [ -d "node_modules" ]; then
    check_pass "Root node_modules exists"
else
    check_fail "Root node_modules missing"
    echo "  Fix: pnpm install"
fi

# Check envio directory
if [ -d "envio" ]; then
    check_pass "envio directory exists"
    
    if [ -d "envio/node_modules" ]; then
        check_pass "envio node_modules exists"
    else
        check_fail "envio node_modules missing"
        echo "  Fix: cd envio && pnpm install"
    fi
else
    check_fail "envio directory not found"
fi

# Check convex directory
if [ -d "convex/_generated" ]; then
    check_pass "Convex initialized"
else
    check_warn "Convex not initialized"
    echo "  Fix: pnpm convex:dev"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Checking Environment Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check .env.local
if [ -f ".env.local" ]; then
    check_pass ".env.local exists"
    
    # Check required variables
    if grep -q "NEXT_PUBLIC_CONVEX_URL" .env.local; then
        check_pass "NEXT_PUBLIC_CONVEX_URL configured"
    else
        check_fail "NEXT_PUBLIC_CONVEX_URL missing"
    fi
    
    if grep -q "NEXT_PUBLIC_CONTRACT_ADDRESS" .env.local; then
        check_pass "NEXT_PUBLIC_CONTRACT_ADDRESS configured"
    else
        check_fail "NEXT_PUBLIC_CONTRACT_ADDRESS missing"
    fi
    
    if grep -q "NEXT_PUBLIC_ALCHEMY_API_KEY" .env.local; then
        check_pass "NEXT_PUBLIC_ALCHEMY_API_KEY configured"
    else
        check_warn "NEXT_PUBLIC_ALCHEMY_API_KEY missing"
    fi
else
    check_fail ".env.local not found"
    echo "  Fix: Create .env.local (see ENV_SETUP.md)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Checking PM2 Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v pm2 &> /dev/null; then
    PM2_LIST=$(pm2 list | grep -E "(monad|irc)" || echo "")
    
    if [ -n "$PM2_LIST" ]; then
        check_pass "PM2 processes found"
        echo ""
        pm2 list
    else
        check_warn "No PM2 processes running"
        echo "  Fix: pnpm deploy:vps"
    fi
else
    check_warn "PM2 not installed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Checking Service Connectivity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Frontend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:4000 2>/dev/null | grep -q "200\|301\|302"; then
    check_pass "Frontend responding on port 4000"
else
    check_warn "Frontend not responding on port 4000"
fi

# Check HyperIndex
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null | grep -q "200\|301\|302\|400"; then
    check_pass "HyperIndex responding on port 8080"
else
    check_warn "HyperIndex not responding on port 8080"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. Checking Docker Containers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v docker &> /dev/null && docker ps &> /dev/null; then
    ENVIO_CONTAINERS=$(docker ps | grep -E "(postgres|hasura|envio)" || echo "")
    
    if [ -n "$ENVIO_CONTAINERS" ]; then
        check_pass "Envio Docker containers running"
        echo ""
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(postgres|hasura|envio|NAMES)"
    else
        check_warn "No Envio containers running"
        echo "  Fix: cd envio && pnpm dev"
    fi
else
    check_warn "Cannot check Docker containers (Docker not running)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Passed:  $SUCCESS${NC}"
echo -e "${YELLOW}⚠ Warnings: $WARNINGS${NC}"
echo -e "${RED}✗ Failed:  $ERRORS${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Critical issues found. Please fix the errors above.${NC}"
    echo ""
    echo "Common fixes:"
    echo "  1. Install dependencies: pnpm install && cd envio && pnpm install"
    echo "  2. Start Docker: sudo systemctl start docker"
    echo "  3. Kill port 4000: lsof -ti:4000 | xargs kill -9"
    echo "  4. Deploy: pnpm deploy:vps"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some warnings found. Review above for details.${NC}"
    exit 0
else
    echo -e "${GREEN}✅ All checks passed! System is healthy.${NC}"
    exit 0
fi

