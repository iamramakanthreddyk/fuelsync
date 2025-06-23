import { createClient } from '@vercel/postgres';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  try {
    console.log('🔄 Running Vercel migrations...');
    
    if (!process.env.POSTGRES_URL) {
      console.log('⚠️ No POSTGRES_URL found, skipping migrations');
      return;
    }
    
    const client = createClient();
    await client.connect();
    
    // Read and run public schema migration
    const publicMigration = fs.readFileSync(
      path.join(process.cwd(), 'migrations/001_create_public_schema.sql'), 
      'utf8'
    );
    
    const statements = publicMigration.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await client.query(statement);
      }
    }
    console.log('✅ Public schema created');
    
    // Create demo tenant schema
    const tenantTemplate = fs.readFileSync(
      path.join(process.cwd(), 'migrations/tenant_schema_template.sql'),
      'utf8'
    ).replace(/{{schema_name}}/g, 'demo_tenant_001');
    
    const tenantStatements = tenantTemplate.split(';').filter(s => s.trim());
    for (const statement of tenantStatements) {
      if (statement.trim()) {
        await client.query(statement);
      }
    }
    console.log('✅ Demo tenant schema created');
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('⚠️ Continuing build without migrations');
  }
}

runMigrations();