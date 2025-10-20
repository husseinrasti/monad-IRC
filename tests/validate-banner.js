#!/usr/bin/env node

/**
 * Simple validation script to verify ASCII banner is correctly implemented
 * Run with: node tests/validate-banner.js
 */

const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log('\n🎨 Validating ASCII Banner Implementation...\n');

let passCount = 0;
let failCount = 0;

function pass(message) {
  console.log(`${GREEN}✓${RESET} ${message}`);
  passCount++;
}

function fail(message) {
  console.log(`${RED}✗${RESET} ${message}`);
  failCount++;
}

function info(message) {
  console.log(`${YELLOW}ℹ${RESET} ${message}`);
}

// Check IRCContext.tsx
const ircContextPath = path.join(__dirname, '../lib/context/IRCContext.tsx');

try {
  const ircContextContent = fs.readFileSync(ircContextPath, 'utf8');

  // Test 1: Check if banner lines exist
  if (ircContextContent.includes('banner-1') && ircContextContent.includes('banner-20')) {
    pass('Banner lines (1-20) are defined in IRCContext.tsx');
  } else {
    fail('Banner lines not found in IRCContext.tsx');
  }

  // Test 2: Check if MONAD ASCII art is present
  if (ircContextContent.includes('MMMMMMMM') && ircContextContent.includes('NNNNNNNN')) {
    pass('MONAD ASCII art characters found');
  } else {
    fail('MONAD ASCII art not found');
  }

  // Test 3: Check for IRC text
  if (ircContextContent.includes('IIIIIIIII') && ircContextContent.includes('RRRRRRRR') && ircContextContent.includes('CCCCCCCCCCCCC')) {
    pass('IRC ASCII art characters found');
  } else {
    fail('IRC ASCII art incomplete');
  }

  // Test 4: Count banner lines
  const bannerLineMatches = ircContextContent.match(/id: "banner-\d+"/g);
  if (bannerLineMatches && bannerLineMatches.length === 20) {
    pass(`Correct number of banner lines: ${bannerLineMatches.length}`);
  } else {
    fail(`Incorrect banner line count: ${bannerLineMatches ? bannerLineMatches.length : 0} (expected 20)`);
  }

} catch (error) {
  fail(`Could not read IRCContext.tsx: ${error.message}`);
}

// Check MainTerminal.tsx
const mainTerminalPath = path.join(__dirname, '../components/terminal/MainTerminal.tsx');

try {
  const mainTerminalContent = fs.readFileSync(mainTerminalPath, 'utf8');

  // Test 5: Check for accessibility attributes
  if (mainTerminalContent.includes('role="img"') && mainTerminalContent.includes('aria-label')) {
    pass('Accessibility attributes (role, aria-label) implemented');
  } else {
    fail('Missing accessibility attributes');
  }

  // Test 6: Check for overflow handling
  if (mainTerminalContent.includes('overflow-x-auto')) {
    pass('Horizontal overflow handling implemented');
  } else {
    fail('Missing overflow-x-auto for responsive scrolling');
  }

  // Test 7: Check for whitespace preservation
  if (mainTerminalContent.includes('whitespace-pre')) {
    pass('Whitespace preservation (whitespace-pre) implemented');
  } else {
    fail('Missing whitespace-pre for ASCII alignment');
  }

  // Test 8: Check for monospace font
  if (mainTerminalContent.includes('font-mono') || mainTerminalContent.includes('monospace')) {
    pass('Monospace font styling present');
  } else {
    fail('Missing monospace font styling');
  }

  // Test 9: Check for responsive text sizing
  if (mainTerminalContent.includes('text-xs') && mainTerminalContent.includes('sm:text-sm')) {
    pass('Responsive text sizing implemented');
  } else {
    fail('Missing responsive text sizing classes');
  }

} catch (error) {
  fail(`Could not read MainTerminal.tsx: ${error.message}`);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log(`${GREEN}Passed:${RESET} ${passCount}`);
console.log(`${RED}Failed:${RESET} ${failCount}`);
console.log('='.repeat(50) + '\n');

if (failCount === 0) {
  console.log(`${GREEN}🎉 All validations passed! Banner is correctly implemented.${RESET}\n`);
  process.exit(0);
} else {
  console.log(`${RED}⚠️  Some validations failed. Please review the implementation.${RESET}\n`);
  info('See tests/BANNER_TEST_SETUP.md for detailed implementation guide.');
  process.exit(1);
}

