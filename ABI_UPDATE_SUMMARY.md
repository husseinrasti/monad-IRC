# ABI Update Summary

## Overview
Updated `lib/contract/abi.ts` with the ABI extracted from the compiled Foundry contract.

## Changes

### File Size
- **Old ABI**: 259 lines
- **New ABI**: 462 lines
- **Increase**: 203 lines (78% larger)

### Key Additions

#### New Functions
1. **`MAX_TIMESTAMP_DRIFT()`** - View function that returns the maximum timestamp drift constant (300 seconds)
2. **`channelCreators(string)`** - View function to get channel creators
3. **`channelExists(string)`** - View function to check if a channel exists
4. **`nonces(address)`** - View function to get nonces mapping
5. **`processedMessages(bytes32)`** - View function to check processed messages
6. **`sessions(address)`** - View function to get sessions mapping

#### Updated Functions
- `sendMessageSigned` - Now includes proper parameter types and names
- `getSession` - Returns structured session data with all fields
- `getNonce` - Properly typed with smart account parameter

#### Error Types Added
The new ABI includes all custom error types from the contract:
- `ChannelAlreadyExists`
- `ChannelDoesNotExist`
- `ChannelNameTooShort`
- `ECDSAInvalidSignature`
- `ECDSAInvalidSignatureLength`
- `ECDSAInvalidSignatureS`
- `ExpiryMustBeInFuture`
- `InvalidNonce`
- `InvalidSessionKey`
- `InvalidSignature`
- `MessageAlreadyProcessed`
- `NoActiveSession`
- `SessionInvalidOrExpired`
- `TimestampTooFarInFuture`
- `TimestampTooOld`

#### Event Definitions
All events remain with proper indexing:
- `SessionAuthorized`
- `SessionRevoked`
- `ChannelCreated`
- `MessageSent`

### Structure Improvements
1. **Type-first format**: Each ABI item now starts with `"type"` field
2. **Consistent ordering**: Functions, events, then errors
3. **Complete metadata**: All parameters include `internalType` for better type safety
4. **Public state variables**: Automatically generated getter functions for public state variables

### Source
Generated from: `contracts/out/MonadIRC.sol/MonadIRC.json`
Compiled with: Foundry (Solidity 0.8.20)

### Status
✅ No linter errors
✅ TypeScript type safety maintained with `as const`
✅ Fully compatible with ethers.js and viem

## Impact on Frontend
The updated ABI now provides:
- Access to all public state variables
- Better error handling with custom error types
- Complete type information for all functions
- Access to view functions for reading contract state
