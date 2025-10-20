# ASCII Banner Testing Setup

## Overview
The ASCII banner has been updated with a new "MONAD IRC" design and includes proper accessibility, responsive handling, and testing.

## Testing Setup

To run the banner component tests, you need to install testing dependencies:

```bash
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom @types/jest
```

Then add to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

Create `jest.config.js`:

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

module.exports = createJestConfig(customJestConfig)
```

Create `jest.setup.js`:

```javascript
import '@testing-library/jest-dom'
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run banner tests specifically
pnpm test banner.test

# Watch mode
pnpm test:watch
```

## Quick Validation (No Test Dependencies Required)

Run the validation script to check banner content:

```bash
node tests/validate-banner.js
```

This script verifies:
- ✅ Banner contains "MONAD" ASCII art
- ✅ All 20 banner lines are present in IRCContext
- ✅ Content matches expected ASCII characters

## What Was Implemented

### 1. Banner Content (IRCContext.tsx)
- ✅ Replaced old ASCII with new "MONAD IRC" banner
- ✅ 20 lines total (2 empty + 16 ASCII art + 2 empty)
- ✅ Preserved all whitespace exactly as provided

### 2. Rendering (MainTerminal.tsx)
- ✅ Monospace font with explicit font-family
- ✅ `whitespace-pre` to preserve all spaces
- ✅ `overflow-x-auto` for horizontal scrolling on narrow screens
- ✅ Responsive text sizing: `text-xs sm:text-sm md:text-base`
- ✅ Accessibility: `role="img"` and `aria-label="Monad IRC ASCII banner"`

### 3. Tests
- ✅ Component tests (tests/components/banner.test.tsx)
- ✅ Unit tests (tests/banner.test.ts)
- ✅ Validation script (tests/validate-banner.js)

## Verification Checklist

Run the app and verify:
- [ ] Banner displays on app load
- [ ] Text is monospace and aligned correctly
- [ ] Banner is horizontally scrollable on narrow screens
- [ ] Banner scales down responsively (text-xs on mobile)
- [ ] No console errors
- [ ] Accessibility attributes present (check DevTools)
- [ ] Banner contains "MONAD IRC" text

## Troubleshooting

**Banner not visible?**
- Check that IRCContext is properly wrapped around your app
- Verify terminalLines state initialization in IRCContext.tsx

**Misaligned text?**
- Ensure `whitespace-pre` is applied (not `whitespace-pre-wrap`)
- Check that monospace font is loading correctly

**Responsive issues?**
- Verify Tailwind responsive classes are working
- Check that `overflow-x-auto` allows horizontal scrolling

