#!/usr/bin/env node

const { execSync } = require('child_process');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');

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

// Create a logs directory if it doesn't exist
const logsDir = join(process.cwd(), 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir);
}

// Function to run a command and log output
function runCommand(command, name) {
  const logFile = join(logsDir, `${name}.log`);
  console.log(`${colors.cyan}Running ${name}...${colors.reset}`);
  
  try {
    execSync(command, { 
      stdio: 'inherit',
      env: { ...process.env, LOG_FILE: logFile }
    });
    console.log(`${colors.green}✓ ${name} completed successfully${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ ${name} failed${colors.reset}`);
    console.error(error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log(`${colors.magenta}=== FuelSync Complete Test Suite ===${colors.reset}`);
  console.log(`${colors.blue}This will reset the database, seed test data, and test login functionality${colors.reset}`);
  console.log(`${colors.yellow}Logs will be saved to the logs directory${colors.reset}\n`);
  
  // Step 1: Check database connection
  if (!runCommand('npm run check:db-connection', 'check-db-connection')) {
    console.error(`${colors.red}Database connection failed. Please check your database configuration.${colors.reset}`);
    process.exit(1);
  }
  
  // Step 2: Reset and seed the database
  console.log(`\n${colors.cyan}=== Database Setup ===${colors.reset}`);
  runCommand('npm run setup-db', 'setup-db');
  
  // Step 3: Check database users
  runCommand('npm run check:db', 'check-db');
  
  // Step 4: Test login functionality
  console.log(`\n${colors.cyan}=== Login Tests ===${colors.reset}`);
  runCommand('npm run test:simple-login', 'test-simple-login');
  
  // Step 5: Test API login and generate frontend login code
  console.log(`\n${colors.cyan}=== API Login Tests ===${colors.reset}`);
  runCommand('npm run test:api-login', 'test-api-login');
  
  // Step 6: Generate frontend login code
  console.log(`\n${colors.cyan}=== Frontend Login Code ===${colors.reset}`);
  runCommand('npm run generate:frontend-login', 'generate-frontend-login');
  
  console.log(`\n${colors.green}=== All tests completed ===${colors.reset}`);
  console.log(`${colors.blue}You can now start the server with 'npm start' and test the frontend login${colors.reset}`);
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Test suite failed:${colors.reset}`, error);
  process.exit(1);
});