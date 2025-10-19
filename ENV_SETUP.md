# Environment Setup Guide

This document describes all environment variables required for Monad IRC to function properly.

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### 1. Monad Network Configuration

```bash
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
```

- **Description**: RPC endpoint for Monad Testnet
- **Required**: Yes
- **Default**: `https://testnet-rpc.monad.xyz`

### 2. Contract Configuration

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
```

- **Description**: Deployed MonadIRC contract address
- **Required**: Yes
- **Where to get**: After deploying the contract using `cd contracts && make deploy`

### 3. Alchemy Bundler Configuration

```bash
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here
```

- **Description**: Alchemy API key for bundler service (ERC-4337)
- **Required**: Yes (for Smart Account transactions)
- **Where to get**: [https://www.alchemy.com/](https://www.alchemy.com/)
  1. Sign up for Alchemy account
  2. Create a new app
  3. Select "Monad Testnet" as the network
  4. Copy the API key

### 4. Alchemy Paymaster Configuration (Optional)

```bash
NEXT_PUBLIC_ALCHEMY_POLICY_ID=your_alchemy_policy_id_here
```

- **Description**: Alchemy Gas Manager policy ID for gasless transactions
- **Required**: No (optional for gasless transactions)
- **Where to get**: 
  1. Go to Alchemy Dashboard
  2. Navigate to Gas Manager
  3. Create a new policy
  4. Copy the Policy ID
- **Note**: If not set, users will pay gas from their Smart Account balance

### 5. Convex Configuration

```bash
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=your_deployment_name
```

- **Description**: Convex backend configuration
- **Required**: Yes
- **Where to get**: After running `npm run convex:dev` or `npm run convex:deploy`

## Complete .env.local Example

```bash
# Monad Network
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz

# Contract
NEXT_PUBLIC_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890

# Alchemy Bundler (Required)
NEXT_PUBLIC_ALCHEMY_API_KEY=alch_1234567890abcdef

# Alchemy Paymaster (Optional - for gasless transactions)
NEXT_PUBLIC_ALCHEMY_POLICY_ID=550e8400-e29b-41d4-a716-446655440000

# Convex
NEXT_PUBLIC_CONVEX_URL=https://happy-animal-123.convex.cloud
CONVEX_DEPLOYMENT=prod:happy-animal-123

# Environment
NODE_ENV=development
```

## Configuration Modes

### Mode 1: Full Gasless (Recommended for Testing)

All transactions are sponsored by Alchemy's gas policy:

```bash
NEXT_PUBLIC_ALCHEMY_API_KEY=alch_...
NEXT_PUBLIC_ALCHEMY_POLICY_ID=550e8400-...
```

**User Experience:**
- No need to fund Smart Account
- All transactions are free
- Instant onboarding

### Mode 2: User-Paid Gas (Production)

Users pay gas from their Smart Account balance:

```bash
NEXT_PUBLIC_ALCHEMY_API_KEY=alch_...
# NEXT_PUBLIC_ALCHEMY_POLICY_ID is not set
```

**User Experience:**
- Users must fund Smart Account with MON tokens
- Use `fund <amount>` command to transfer MON from MetaMask to Smart Account
- Check balance with `balance` command

## Setup Steps

1. **Copy environment template**
   ```bash
   cp .env.example .env.local
   ```

2. **Get Alchemy API Key**
   - Visit [https://www.alchemy.com/](https://www.alchemy.com/)
   - Create account and new app
   - Select "Monad Testnet"
   - Copy API key

3. **Deploy Contract** (if not already deployed)
   ```bash
   cd contracts
   make deploy
   ```
   - Copy the deployed contract address

4. **Setup Convex**
   ```bash
   npm run convex:dev
   ```
   - Copy the deployment URL from terminal

5. **Configure Paymaster** (optional)
   - Go to Alchemy Gas Manager
   - Create policy with spending limits
   - Copy policy ID

6. **Update .env.local**
   - Add all values from steps above

7. **Restart Development Server**
   ```bash
   npm run dev
   ```

## Troubleshooting

### Error: "Alchemy bundler client not available"

**Solution**: Set `NEXT_PUBLIC_ALCHEMY_API_KEY` in `.env.local`

### Error: "Insufficient funds (AA21)"

**Solution**: 
- If using paymaster: Check policy balance and limits
- If not using paymaster: Fund Smart Account with `fund 0.1` command

### Error: "User operation failed"

**Solution**: 
1. Check contract address is correct
2. Verify Alchemy API key is valid
3. Check network is Monad Testnet
4. Ensure MetaMask is connected to correct network

## Security Notes

1. **Never commit `.env.local`** - It contains sensitive API keys
2. **Use separate API keys** for development and production
3. **Set spending limits** on gas policies
4. **Rotate API keys** periodically
5. **Monitor usage** in Alchemy dashboard

## Advanced Configuration

### Custom RPC Endpoint

If you have a custom Monad RPC endpoint:

```bash
NEXT_PUBLIC_MONAD_RPC_URL=https://your-custom-rpc.example.com
```

### Custom Bundler URL

If using a different bundler service:

```bash
NEXT_PUBLIC_BUNDLER_URL=https://your-bundler-service.example.com
```

Note: This overrides the Alchemy bundler URL constructed from `NEXT_PUBLIC_ALCHEMY_API_KEY`

## Verification

After setup, verify configuration:

1. **Connect Wallet**: Run `connect wallet` in terminal
2. **Check Balance**: Run `balance` to verify Smart Account
3. **Create Channel**: Run `create #test` to test transactions
4. **Send Message**: Join channel and send a message

All steps should complete without errors if configuration is correct.

