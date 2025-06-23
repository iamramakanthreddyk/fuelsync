import { sql } from '@vercel/postgres';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  try {
    console.log('🔄 Running Vercel migrations...');
    
    // Read and run public schema migration
    const publicMigration = fs.readFileSync(
      path.join(process.cwd(), 'migrations/001_create_public_schema.sql'), 
      'utf8'
    );
    
    await sql.query(publicMigration);
    console.log('✅ Public schema created');
    
    // Create demo tenant schema
    const tenantTemplate = fs.readFileSync(
      path.join(process.cwd(), 'migrations/tenant_schema_template.sql'),
      'utf8'
    ).replace(/{{schema_name}}/g, 'demo_tenant_001');
    
    await sql.query(tenantTemplate);
    console.log('✅ Demo tenant schema created');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();