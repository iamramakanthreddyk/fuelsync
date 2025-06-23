#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

console.log(`${colors.cyan}Starting FuelSync API server...${colors.reset}`);

try {
  // Check for TypeScript errors
  console.log(`${colors.yellow}Checking for TypeScript errors...${colors.reset}`);
  execSync('tsc --noEmit', { stdio: 'inherit' });
  
  console.log(`${colors.green}TypeScript check passed!${colors.reset}`);
  
  // Start the server
  console.log(`${colors.cyan}Starting server...${colors.reset}`);
  execSync('ts-node src/app.ts', { stdio: 'inherit' });
} catch (error) {
  console.error(`${colors.red}Failed to start server:${colors.reset}`, error.message);
  process.exit(1);
}
