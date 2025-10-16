# MonadIRC Foundry Makefile
# Common commands for smart contract development

.PHONY: help install build test test-v test-vv test-vvv clean deploy snapshot coverage fmt lint

# Default target
help:
	@echo "MonadIRC Smart Contracts - Available Commands:"
	@echo ""
	@echo "Setup & Build:"
	@echo "  make install       - Install dependencies"
	@echo "  make build         - Compile contracts"
	@echo "  make clean         - Clean build artifacts"
	@echo ""
	@echo "Testing:"
	@echo "  make test          - Run all tests"
	@echo "  make test-v        - Run tests (verbose)"
	@echo "  make test-vv       - Run tests (very verbose)"
	@echo "  make test-vvv      - Run tests (maximum verbosity)"
	@echo "  make gas           - Generate gas report"
	@echo "  make coverage      - Generate coverage report"
	@echo "  make snapshot      - Create gas snapshot"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy        - Deploy to Monad testnet"
	@echo ""
	@echo "Code Quality:"
	@echo "  make fmt           - Format code"
	@echo "  make lint          - Run linter"
	@echo ""

# Installation
install:
	@echo "Installing dependencies..."
	forge install OpenZeppelin/openzeppelin-contracts --no-commit
	forge install foundry-rs/forge-std --no-commit
	@echo "✅ Dependencies installed"

# Build
build:
	@echo "Building contracts..."
	forge build
	@echo "✅ Build complete"

# Testing
test:
	forge test

test-v:
	forge test -v

test-vv:
	forge test -vv

test-vvv:
	forge test -vvv

gas:
	@echo "Generating gas report..."
	forge test --gas-report

coverage:
	@echo "Generating coverage report..."
	forge coverage

snapshot:
	@echo "Creating gas snapshot..."
	forge snapshot

# Deployment
deploy:
	@echo "Deploying to Monad testnet..."
	forge script script/Deploy.s.sol:Deploy --rpc-url https://testnet-rpc.monad.xyz --broadcast --verify

# Code quality
fmt:
	@echo "Formatting code..."
	forge fmt

lint:
	@echo "Running linter..."
	forge fmt --check

# Cleanup
clean:
	@echo "Cleaning build artifacts..."
	forge clean
	@echo "✅ Clean complete"

# Update Foundry
update:
	@echo "Updating Foundry..."
	foundryup
	@echo "✅ Foundry updated"

