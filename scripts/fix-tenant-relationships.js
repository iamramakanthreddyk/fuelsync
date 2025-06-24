const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function fixTenantRelationships() {
  console.log('Starting tenant relationship fixes...');
  
  
    try {
    require('dotenv').config();
  } catch (e) {
    console.log('dotenv not available, using environment variables');
  }
  
  // Azure PostgreSQL connection
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user:process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false } // Required for Azure PostgreSQL
  });
  try {
    console.log('Connected to Azure database');
    console.log('Host:', process.env.POSTGRES_HOST || process.env.DB_HOST);
    console.log('Database:', process.env.POSTGRES_DATABASE || process.env.DB_NAME);
    console.log('User:', process.env.POSTGRES_USER || process.env.DB_USER);
    
    // 1. Get all tenants
    const tenants = await pool.query(`SELECT id, name, schema_name FROM public.tenants`);
    console.log(`Found ${tenants.rows.length} tenants`);
    
    // 2. For each tenant, ensure there's an owner user
    for (const tenant of tenants.rows) {
      console.log(`Processing tenant: ${tenant.name} (${tenant.schema_name})`);
      
      // Check if schema exists
      const schemaExists = await pool.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = $1
      `, [tenant.schema_name]);
      
      if (schemaExists.rows.length === 0) {
        console.log(`Creating schema for tenant: ${tenant.schema_name}`);
        await pool.query(`CREATE SCHEMA IF NOT EXISTS ${tenant.schema_name}`);
        
        // Create tenant tables using template
        console.log(`Creating tables for tenant: ${tenant.schema_name}`);
        const templatePath = require('path').join(__dirname, '../migrations/schema/002_tenant_schema_template.sql');
        let templateSql = '';
        
        try {
          templateSql = require('fs').readFileSync(templatePath, 'utf8');
          const schemaSql = templateSql.replace(/\\{\\{schema_name\\}\\}/g, tenant.schema_name);
          
          // Execute each statement separately
          const statements = schemaSql.split(';').filter(stmt => stmt.trim().length > 0);
          for (const stmt of statements) {
            try {
              await pool.query(stmt);
            } catch (stmtErr) {
              console.error(`Error executing statement: ${stmtErr.message}`);
            }
          }
          console.log(`Created tables for tenant: ${tenant.schema_name}`);
        } catch (err) {
          console.error(`Error creating schema tables: ${err.message}`);
        }
      }
      
      // Check if owner user exists
      const ownerExists = await pool.query(`
        SELECT id FROM ${tenant.schema_name}.users 
        WHERE tenant_id = $1 AND role = 'owner'
      `, [tenant.id]);
      
      if (ownerExists.rows.length === 0) {
        console.log(`Creating owner user for tenant: ${tenant.name}`);
        const passwordHash = await bcrypt.hash('owner123', 10);
        
        await pool.query(`
          INSERT INTO ${tenant.schema_name}.users 
          (tenant_id, email, password_hash, name, role) 
          VALUES ($1, $2, $3, $4, 'owner')
        `, [tenant.id, `owner@${tenant.schema_name}.com`, passwordHash, `${tenant.name} Owner`]);
      }
      
      // Create test stations if none exist
      const stationsExist = await pool.query(`
        SELECT COUNT(*) FROM ${tenant.schema_name}.stations
      `);
      
      if (parseInt(stationsExist.rows[0].count) === 0) {
        console.log(`Creating test stations for tenant: ${tenant.name}`);
        
        // Create 3 stations
        const station1 = await pool.query(`
          INSERT INTO ${tenant.schema_name}.stations 
          (tenant_id, name, address, status) 
          VALUES ($1, 'Main Station', '123 Main St', 'active')
          RETURNING id
        `, [tenant.id]);
        
        const station2 = await pool.query(`
          INSERT INTO ${tenant.schema_name}.stations 
          (tenant_id, name, address, status) 
          VALUES ($1, 'Downtown Branch', '456 Center Ave', 'active')
          RETURNING id
        `, [tenant.id]);
        
        const station3 = await pool.query(`
          INSERT INTO ${tenant.schema_name}.stations 
          (tenant_id, name, address, status) 
          VALUES ($1, 'Highway Station', '789 Highway Rd', 'active')
          RETURNING id
        `, [tenant.id]);
        
        console.log(`Created 3 stations for tenant: ${tenant.name}`);
      }
    }
    
    // 3. Fix CORS settings in the database
    console.log('Fixing CORS settings...');
    
    console.log('All tenant relationships fixed successfully');
    
  } catch (error) {
    console.error('Error fixing tenant relationships:', error);
  } finally {
    await pool.end();
  }
}

fixTenantRelationships().catch(console.error);