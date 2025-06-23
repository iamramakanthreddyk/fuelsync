import pool from '../src/utils/db';

async function checkDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Checking database for authentication data...');
    
    // Check admin users in public schema
    console.log('\n--- Admin Users ---');
    const adminUsers = await client.query(
      'SELECT id, email, role FROM public.admin_users'
    );
    console.log(`Found ${adminUsers.rows.length} admin users:`);
    adminUsers.rows.forEach(user => {
      console.log(`- ${user.email} (${user.role})`);
    });
    
    // Check tenants
    console.log('\n--- Tenants ---');
    const tenants = await client.query(
      'SELECT id, name, schema_name FROM public.tenants'
    );
    console.log(`Found ${tenants.rows.length} tenants:`);
    
    // Check users in each tenant schema
    for (const tenant of tenants.rows) {
      console.log(`\n--- Users in tenant: ${tenant.name} (${tenant.schema_name}) ---`);
      try {
        const tenantUsers = await client.query(
          `SELECT id, email, role FROM ${tenant.schema_name}.users`
        );
        console.log(`Found ${tenantUsers.rows.length} users:`);
        tenantUsers.rows.forEach(user => {
          console.log(`- ${user.email} (${user.role})`);
        });
      } catch (error: any) {
        console.error(`Error querying users in schema ${tenant.schema_name}:`, error.message || 'Unknown error');
      }
    }
    
  } catch (error: any) {
    console.error('Database check failed:', error?.message || error);
  } finally {
    client.release();
  }
}

checkDatabase().then(() => {
  console.log('\nDatabase check completed');
  process.exit(0);
}).catch((error: any) => {
  console.error('Script failed:', error?.message || error);
  process.exit(1);
});