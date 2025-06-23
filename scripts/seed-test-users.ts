import pool from '../src/utils/db';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

async function seedTestUsers() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create test admin user if not exists
    const adminEmail = 'admin@fuelsync.dev';
    const adminPassword = 'password';
    
    const { rows: adminRows } = await client.query(
      'SELECT id FROM public.admin_users WHERE email = $1',
      [adminEmail]
    );
    
    if (adminRows.length === 0) {
      console.log(`Creating test admin user: ${adminEmail}`);
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await client.query(
        `INSERT INTO public.admin_users (id, email, password_hash, role) 
         VALUES ($1, $2, $3, $4)`,
        [randomUUID(), adminEmail, passwordHash, 'superadmin']
      );
    } else {
      console.log(`Admin user ${adminEmail} already exists, updating password`);
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await client.query(
        `UPDATE public.admin_users SET password_hash = $1 WHERE email = $2`,
        [passwordHash, adminEmail]
      );
    }
    
    // Create test tenant if not exists
    const tenantName = 'Demo Tenant';
    const schemaName = 'demo_tenant_001';
    
    const { rows: tenantRows } = await client.query(
      'SELECT id FROM public.tenants WHERE schema_name = $1',
      [schemaName]
    );
    
    let tenantId;
    if (tenantRows.length === 0) {
      console.log(`Creating test tenant: ${tenantName} (${schemaName})`);
      
      // Create plan if not exists
      const { rows: planRows } = await client.query(
        'SELECT id FROM public.plans WHERE name = $1',
        ['basic']
      );
      
      let planId;
      if (planRows.length === 0) {
        const { rows } = await client.query(
          `INSERT INTO public.plans (id, name, config_json) VALUES ($1, $2, $3) RETURNING id`,
          [randomUUID(), 'basic', JSON.stringify({})]
        );
        planId = rows[0].id;
      } else {
        planId = planRows[0].id;
      }
      
      // Create tenant
      const { rows } = await client.query(
        `INSERT INTO public.tenants (id, name, schema_name, plan_id) VALUES ($1, $2, $3, $4) RETURNING id`,
        [randomUUID(), tenantName, schemaName, planId]
      );
      tenantId = rows[0].id;
      
      // Create schema
      try {
        await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
        
        // Apply tenant schema template
        try {
          const templatePath = path.join(process.cwd(), 'migrations/tenant_schema_template.sql');
          if (fs.existsSync(templatePath)) {
            console.log(`Applying schema template from ${templatePath}`);
            const templateSql = fs.readFileSync(templatePath, 'utf8')
              .replace(/{{schema_name}}/g, schemaName);
            await client.query(templateSql);
          } else {
            console.log('Schema template not found, creating minimal tables');
            // Create minimal users table in tenant schema
            await client.query(`
              CREATE TABLE IF NOT EXISTS ${schemaName}.users (
                id UUID PRIMARY KEY,
                tenant_id UUID NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              )
            `);
          }
        } catch (error: any) {
          console.error(`Error applying schema template: ${error?.message || 'Unknown error'}`);
          console.log('Creating minimal users table as fallback');
          
          // Create minimal users table as fallback
          await client.query(`
            CREATE TABLE IF NOT EXISTS ${schemaName}.users (
              id UUID PRIMARY KEY,
              tenant_id UUID NOT NULL,
              email VARCHAR(255) UNIQUE NOT NULL,
              password_hash VARCHAR(255) NOT NULL,
              role VARCHAR(50) NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
          `);
        }
      } catch (error: any) {
        console.error(`Error creating schema or tables: ${error?.message || 'Unknown error'}`);
      }
    } else {
      tenantId = tenantRows[0].id;
    }
    
    // Create test tenant users if not exists
    const testUsers = [
      { email: 'owner@demo_tenant_001.com', password: 'password', role: 'owner' },
      { email: 'manager@demo_tenant_001.com', password: 'password', role: 'manager' },
      { email: 'attendant@demo_tenant_001.com', password: 'password', role: 'attendant' }
    ];
    
    for (const user of testUsers) {
      const { rows } = await client.query(
        `SELECT id FROM ${schemaName}.users WHERE email = $1`,
        [user.email]
      );
      
      if (rows.length === 0) {
        console.log(`Creating test user: ${user.email} (${user.role})`);
        const passwordHash = await bcrypt.hash(user.password, 10);
        await client.query(
          `INSERT INTO ${schemaName}.users (id, tenant_id, email, password_hash, role) 
           VALUES ($1, $2, $3, $4, $5)`,
          [randomUUID(), tenantId, user.email, passwordHash, user.role]
        );
      } else {
        console.log(`User ${user.email} already exists, updating password`);
        const passwordHash = await bcrypt.hash(user.password, 10);
        await client.query(
          `UPDATE ${schemaName}.users SET password_hash = $1 WHERE email = $2`,
          [passwordHash, user.email]
        );
      }
    }
    
    await client.query('COMMIT');
    console.log('Test users created successfully');
    
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Failed to seed test users:', error?.message || error);
  } finally {
    client.release();
  }
}

seedTestUsers().then(() => {
  console.log('Done');
  process.exit(0);
}).catch((error: any) => {
  console.error('Script failed:', error?.message || error);
  process.exit(1);
});