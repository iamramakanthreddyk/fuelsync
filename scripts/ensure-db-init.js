const { Pool } = require('pg');
const { execSync } = require('child_process');

// Load env vars if local
try {
  require('dotenv').config();
} catch (e) {
  console.log('dotenv not available, using existing env vars');
}

async function ensureDbInit() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Check if a core table exists
    const result = await pool.query(
      "SELECT to_regclass('public.users') as exists"
    );
    const hasSchema = result.rows[0].exists !== null;

    if (!hasSchema) {
      console.log('[DB] No tables found. Running initial setup...');
      execSync('node scripts/setup-unified-db.js', { stdio: 'inherit' });
    } else {
      console.log('[DB] Schema detected. Running pending migrations...');
      execSync('node scripts/migrate.js up', { stdio: 'inherit' });
    }
  } catch (err) {
    console.error('ensure-db-init failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

ensureDbInit();

