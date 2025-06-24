const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class MigrationRunner {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'fuelsync',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    });
  }

  async ensureMigrationTable() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) NOT NULL UNIQUE,
        description TEXT NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        rollback_sql TEXT
      )
    `);
  }

  async getAppliedMigrations() {
    const result = await this.pool.query(
      'SELECT version FROM public.schema_migrations ORDER BY version'
    );
    return result.rows.map(row => row.version);
  }

  async runMigration(version, description, sql, rollbackSql = null) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Execute migration SQL
      await client.query(sql);
      
      // Record migration
      await client.query(
        'INSERT INTO public.schema_migrations (version, description, rollback_sql) VALUES ($1, $2, $3)',
        [version, description, rollbackSql]
      );
      
      await client.query('COMMIT');
      console.log(`✅ Migration ${version}: ${description}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Migration ${version} failed:`, error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async createTenantSchema(schemaName) {
    const templatePath = path.join(__dirname, '../migrations/schema/002_tenant_schema_template.sql');
    const template = fs.readFileSync(templatePath, 'utf8');
    const sql = template.replace(/\{\{schema_name\}\}/g, schemaName);
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`✅ Created tenant schema: ${schemaName}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Failed to create tenant schema ${schemaName}:`, error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async runAllMigrations() {
    await this.ensureMigrationTable();
    const applied = await this.getAppliedMigrations();
    
    const migrationFiles = fs.readdirSync(path.join(__dirname, '../migrations/schema'))
      .filter(file => file.endsWith('.sql') && !file.includes('template'))
      .sort();

    for (const file of migrationFiles) {
      const version = file.split('_')[0];
      if (applied.includes(version)) {
        console.log(`⏭️  Skipping ${version} (already applied)`);
        continue;
      }

      const filePath = path.join(__dirname, '../migrations/schema', file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract description from file
      const descMatch = content.match(/-- Description: (.+)/);
      const description = descMatch ? descMatch[1] : file;
      
      await this.runMigration(version, description, content);
    }
  }

  async rollback(version) {
    const result = await this.pool.query(
      'SELECT rollback_sql FROM public.schema_migrations WHERE version = $1',
      [version]
    );
    
    if (result.rows.length === 0) {
      throw new Error(`Migration ${version} not found`);
    }
    
    const rollbackSql = result.rows[0].rollback_sql;
    if (!rollbackSql) {
      throw new Error(`No rollback SQL for migration ${version}`);
    }
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(rollbackSql);
      await client.query('DELETE FROM public.schema_migrations WHERE version = $1', [version]);
      await client.query('COMMIT');
      console.log(`✅ Rolled back migration ${version}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Rollback ${version} failed:`, error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async status() {
    await this.ensureMigrationTable();
    const applied = await this.getAppliedMigrations();
    console.log('Applied migrations:');
    applied.forEach(version => console.log(`  ✅ ${version}`));
  }

  async close() {
    await this.pool.end();
  }
}

// CLI interface
async function main() {
  const runner = new MigrationRunner();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'up':
        await runner.runAllMigrations();
        break;
      case 'down':
        const version = process.argv[3];
        if (!version) throw new Error('Version required for rollback');
        await runner.rollback(version);
        break;
      case 'status':
        await runner.status();
        break;
      case 'create-tenant':
        const schemaName = process.argv[3];
        if (!schemaName) throw new Error('Schema name required');
        await runner.createTenantSchema(schemaName);
        break;
      default:
        console.log('Usage: node migrate.js [up|down|status|create-tenant] [args]');
    }
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await runner.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = MigrationRunner;