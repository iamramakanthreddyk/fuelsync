const { Pool } = require('pg');
const { execSync } = require('child_process');
require('dotenv').config();

async function ensureDbInit() {
  console.log('=== [INIT] Starting Database Initialization ===');

  const connectionParams = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || '5432',
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL
  };

  console.log('[INIT] DB connection parameters:');
  Object.entries(connectionParams).forEach(([key, value]) => {
    console.log(`- ${key}: ${value ? (key === 'password' ? '******' : value) : 'NOT SET'}`);
  });

  let pool;
  if (connectionParams.connectionString) {
    console.log('[INIT] Using connection string...');
    pool = new Pool({
      connectionString: connectionParams.connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    });
  } else if (connectionParams.host && connectionParams.user && connectionParams.database) {
    console.log('[INIT] Using individual DB parameters...');
    pool = new Pool({
      host: connectionParams.host,
      port: Number(connectionParams.port),
      user: connectionParams.user,
      password: process.env.DB_PASSWORD,
      database: connectionParams.database,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    });
  } else {
    console.error('❌ Missing required DB environment variables. Aborting.');
    process.exit(1);
  }

  try {
    console.log('[INIT] Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected to database');
    client.release();

    // Check if core table exists
    const result = await pool.query("SELECT to_regclass('public.users') AS exists");
    const hasSchema = result.rows[0].exists !== null;

    if (!hasSchema) {
      console.log('[INIT] No schema found — running initial setup...');
      execSync('node scripts/setup-unified-db.js', { stdio: 'inherit' });
    } else {
      console.log('[INIT] Schema found — running pending migrations...');
      execSync('node scripts/migrate.js up', { stdio: 'inherit' });
    }

    console.log('✅ [INIT] Database initialization complete');
  } catch (err) {
    console.error('❌ [INIT] Failed to initialize database:');
    console.error(`- Message: ${err.message}`);
    console.error(`- Code: ${err.code}`);

    if (err.code === 'ENOTFOUND') {
      console.error('🔍 Check if DB_HOST is correct and DNS is reachable.');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('🔍 Connection refused. Check firewall rules and port.');
    } else if (err.code === '28P01') {
      console.error('🔍 Invalid credentials. Check DB_USER and DB_PASSWORD.');
    } else if (err.code === '3D000') {
      console.error('🔍 Database does not exist. Check DB_NAME or create it.');
    }

    console.error('💥 Full error:', err);
    process.exit(1);
  } finally {
    if (pool) await pool.end();
  }
}

ensureDbInit().catch(console.error);
