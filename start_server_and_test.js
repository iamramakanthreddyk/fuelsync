/**
 * @file start_server_and_test.js
 * @description Start the server and run comprehensive tests
 */

const { spawn } = require('child_process');
const { runComprehensiveAPITests } = require('./test_comprehensive_apis');

async function startServerAndTest() {
  console.log('🚀 STARTING SERVER AND RUNNING COMPREHENSIVE TESTS');
  console.log('==================================================\n');

  // Start the server
  console.log('📡 Starting FuelSync server...');
  
  const serverProcess = spawn('node', ['dist/app.js'], {
    cwd: __dirname,
    stdio: 'pipe'
  });

  let serverReady = false;
  let serverOutput = '';

  // Listen for server output
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;
    console.log('SERVER:', output.trim());
    
    // Check if server is ready
    if (output.includes('Server running on port') || output.includes('listening on port')) {
      serverReady = true;
    }
  });

  serverProcess.stderr.on('data', (data) => {
    const output = data.toString();
    console.error('SERVER ERROR:', output.trim());
  });

  // Wait for server to start
  console.log('⏳ Waiting for server to start...');
  
  let attempts = 0;
  const maxAttempts = 30;
  
  while (!serverReady && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
    
    if (attempts % 5 === 0) {
      console.log(`⏳ Still waiting for server... (${attempts}/${maxAttempts})`);
    }
  }

  if (!serverReady) {
    console.error('❌ Server failed to start within timeout period');
    console.log('Server output:', serverOutput);
    serverProcess.kill();
    process.exit(1);
  }

  console.log('✅ Server is ready! Starting tests...\n');

  try {
    // Run comprehensive API tests
    await runComprehensiveAPITests();
    
    console.log('\n🎉 All tests completed successfully!');
  } catch (error) {
    console.error('❌ Tests failed:', error);
  } finally {
    // Clean up server process
    console.log('\n🛑 Shutting down server...');
    serverProcess.kill();
    
    // Wait a moment for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Server shutdown complete');
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  startServerAndTest().catch(error => {
    console.error('❌ Failed to start server and run tests:', error);
    process.exit(1);
  });
}

module.exports = { startServerAndTest };
