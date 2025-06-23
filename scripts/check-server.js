const http = require('http');

// Check if server is running
function checkServer(host, port) {
  return new Promise((resolve) => {
    console.log(`Checking if server is running at ${host}:${port}...`);
    
    const req = http.request({
      host,
      port,
      path: '/',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      console.log(`Server responded with status: ${res.statusCode}`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.error(`Server check failed: ${err.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.error('Server check timed out');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Check multiple ports
async function checkPorts() {
  const ports = [3000, 8080, 5000];
  let anyServerRunning = false;
  
  for (const port of ports) {
    const isRunning = await checkServer('localhost', port);
    if (isRunning) {
      console.log(`Server is running on port ${port}`);
      anyServerRunning = true;
    } else {
      console.log(`No server detected on port ${port}`);
    }
  }
  
  if (!anyServerRunning) {
    console.log('\n⚠️ No server appears to be running!');
    console.log('Please start the server with:');
    console.log('npm start');
  }
  
  return anyServerRunning;
}

// Run the check
checkPorts().then((running) => {
  if (!running) {
    process.exit(1);
  }
});