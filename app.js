const express = require('express');
const cors = require('cors');

const app = express();

// Handle OPTIONS requests FIRST
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-tenant-id');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

app.use(cors({
  origin: ['http://localhost:8080', /\.azurewebsites\.net$/],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
}));

app.use(express.json());

// Simple test endpoints
app.get('/', (req, res) => {
  res.json({ message: 'FuelSync API is running', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    env: process.env.NODE_ENV,
    port: process.env.PORT || 3001,
    timestamp: new Date().toISOString() 
  });
});

// Simple login endpoint
app.post('/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple hardcoded auth for testing
  if (email === 'admin@fuelsync.dev' && password === 'password') {
    return res.json({
      success: true,
      user: { id: '1', email, role: 'superadmin' },
      token: 'test-token-123'
    });
  }
  
  if (email === 'owner@demo.com' && password === 'password') {
    return res.json({
      success: true,
      user: { id: '2', email, role: 'owner' },
      token: 'test-token-456'
    });
  }
  
  res.status(401).json({ error: 'Invalid credentials' });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`FuelSync API running on port ${port}`);
});

module.exports = app;