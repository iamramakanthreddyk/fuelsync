import axios from 'axios';
import pool from '../src/utils/db';
import { seedDatabase, DEMO_TENANT_CONFIG } from '../src/utils/seedUtils';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

// Test credentials
const testUsers = [
  { role: 'superadmin', email: 'admin@fuelsync.dev', password: 'password' },
  { role: 'owner', email: 'owner@demo.com', password: 'password' },
  { role: 'manager', email: 'manager@demo.com', password: 'password' },
  { role: 'attendant', email: 'attendant@demo.com', password: 'password' }
];

async function resetDatabase() {
  console.log('Resetting database...');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create admin user
    console.log('Creating admin user...');
    const adminPasswordHash = await bcrypt.hash('password', 10);
    await client.query(`
      INSERT INTO public.admin_users (id, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    `, [randomUUID(), 'admin@fuelsync.dev', adminPasswordHash, 'superadmin']);
    
    // Seed demo tenant
    console.log('Seeding demo tenant...');
    await seedDatabase(DEMO_TENANT_CONFIG);
    
    // Reset passwords for all users
    console.log('Resetting passwords...');
    const passwordHash = await bcrypt.hash('password', 10);
    
    // Reset tenant users
    const { rows: tenants } = await client.query('SELECT schema_name FROM public.tenants');
    for (const tenant of tenants) {
      const schema = tenant.schema_name;
      console.log(`Resetting passwords in schema: ${schema}`);
      
      try {
        await client.query(`
          UPDATE ${schema}.users SET password_hash = $1
        `, [passwordHash]);
      } catch (err) {
        console.error(`Error resetting passwords in ${schema}:`, err);
      }
    }
    
    await client.query('COMMIT');
    console.log('Database reset complete');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database reset failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function testLogin(email: string, password: string) {
  console.log(`\nTesting login for ${email}...`);
  try {
    const response = await axios.post('http://localhost:3000/v1/auth/login', {
      email,
      password
    });
    
    console.log('Login successful!');
    console.log('Token:', response.data.token ? '✓ Present' : '✗ Missing');
    console.log('User:', response.data.user ? '✓ Present' : '✗ Missing');
    if (response.data.user) {
      console.log('User ID:', response.data.user.id);
      console.log('User Role:', response.data.user.role);
      console.log('Tenant ID:', response.data.user.tenantId || 'N/A');
    }
    return true;
  } catch (error: any) {
    console.error('Login failed:', error.response?.data || error.message || 'Unknown error');
    return false;
  }
}

async function runTests() {
  try {
    // Reset database
    await resetDatabase();
    
    // Test logins
    let successCount = 0;
    for (const user of testUsers) {
      const success = await testLogin(user.email, user.password);
      if (success) successCount++;
    }
    
    // Summary
    console.log('\n--- Test Summary ---');
    console.log(`Successful logins: ${successCount}/${testUsers.length}`);
    console.log(`Failed logins: ${testUsers.length - successCount}`);
    
    if (successCount === testUsers.length) {
      console.log('\n✅ All login tests passed!');
    } else {
      console.log('\n❌ Some login tests failed.');
    }
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the tests
runTests();