import fs from 'fs';
import path from 'path';
import pool from '../src/utils/db';

async function runAllMigrations() {
  console.log('Running all database migrations...');
  const client = await pool.connect();
  
  try {
    // Get all migration files
    const migrationsDir = path.join(process.cwd(), 'migrations');
    console.log(`Reading migrations from: ${migrationsDir}`);
    
    if (!fs.existsSync(migrationsDir)) {
      console.error(`Migrations directory not found: ${migrationsDir}`);
      process.exit(1);
    }
    
    // Get all SQL files and sort them
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`Found ${migrationFiles.length} migration files`);
    
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Get already applied migrations
    const { rows: appliedMigrations } = await client.query(
      'SELECT name FROM public.migrations'
    );
    const appliedMigrationNames = appliedMigrations.map(row => row.name);
    
    // Execute each migration in a separate transaction
    for (const file of migrationFiles) {
      // Skip if already applied
      if (appliedMigrationNames.includes(file)) {
        console.log(`Migration ${file} already applied, skipping`);
        continue;
      }
      
      console.log(`Applying migration: ${file}`);
      const migrationPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      await client.query('BEGIN');
      
      try {
        // Special handling for migrations that might fail
        if (file.includes('add_indexes')) {
          // Split the SQL into individual statements
          const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
          
          for (const statement of statements) {
            try {
              await client.query(statement);
            } catch (err: any) {
              console.warn(`Warning: Statement failed but continuing: ${err.message}`);
              // Continue with next statement instead of failing the whole migration
            }
          }
        } else {
          await client.query(sql);
        }
        
        // Record the migration
        await client.query(
          'INSERT INTO public.migrations (name) VALUES ($1)',
          [file]
        );
        
        await client.query('COMMIT');
        console.log(`Migration ${file} applied successfully`);
      } catch (error: any) {
        await client.query('ROLLBACK');
        console.error(`Migration ${file} failed:`, error?.message || error);
        
        // Don't exit for index migrations, they might fail but we can continue
        if (!file.includes('add_indexes')) {
          process.exit(1);
        }
      }
    }
    
    console.log('All migrations completed successfully');
  } finally {
    client.release();
  }
}

runAllMigrations().catch((error: any) => {
  console.error('Migration script failed:', error?.message || error);
  process.exit(1);
});