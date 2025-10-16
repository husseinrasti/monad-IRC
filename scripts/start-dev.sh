#!/bin/bash

# Development startup script
# Runs frontend and backend concurrently

echo "🚀 Starting Monad IRC Development Environment"
echo "=============================================="
echo ""

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install Node.js"
    exit 1
fi

# Check if concurrently is installed
if ! npm list -g concurrently &> /dev/null; then
    echo "📦 Installing concurrently globally..."
    npm install -g concurrently
fi

# Start services
echo "Starting services..."
echo "- Frontend: http://localhost:3000"
echo "- Backend: http://localhost:3001"
echo ""

concurrently \
  --names "FRONTEND,BACKEND" \
  --prefix-colors "cyan,magenta" \
  "npm run dev" \
  "cd server && npm run dev"

