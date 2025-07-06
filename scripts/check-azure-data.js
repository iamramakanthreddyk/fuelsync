const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Set DATABASE_URL from environment variables
process.env.DATABASE_URL = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=require`;

const prisma = new PrismaClient();

async function checkAzureData() {
  try {
    console.log('Connecting to Azure database...');
    
    // Check tenants
    console.log('\n=== TENANTS ===');
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        created_at: true
      }
    });
    
    if (tenants.length === 0) {
      console.log('No tenants found');
    } else {
      tenants.forEach(tenant => {
        console.log(`ID: ${tenant.id}`);
        console.log(`Name: ${tenant.name}`);
        console.log(`Status: ${tenant.status}`);
        console.log(`Created: ${tenant.created_at}`);
        console.log('---');
      });
    }
    
    // Check users for the specific tenant from logs
    const targetTenantId = 'df9347c2-9f6c-4d32-942f-1208b91fbb2b';
    console.log(`\n=== USERS FOR TENANT ${targetTenantId} ===`);
    
    const users = await prisma.user.findMany({
      where: {
        tenant_id: targetTenantId
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        created_at: true
      }
    });
    
    if (users.length === 0) {
      console.log('No users found for this tenant');
    } else {
      users.forEach(user => {
        console.log(`ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Name: ${user.name}`);
        console.log(`Role: ${user.role}`);
        console.log(`Created: ${user.created_at}`);
        console.log('---');
      });
    }
    
    // Check if the specific tenant exists
    console.log(`\n=== CHECKING SPECIFIC TENANT ===`);
    const specificTenant = await prisma.tenant.findUnique({
      where: {
        id: targetTenantId
      }
    });
    
    if (specificTenant) {
      console.log('Tenant found:', specificTenant);
    } else {
      console.log('Tenant NOT found with ID:', targetTenantId);
    }
    
    // Check all users to see if mahi@fuelsync.com exists anywhere
    console.log(`\n=== SEARCHING FOR mahi@fuelsync.com ===`);
    const mahiUser = await prisma.user.findMany({
      where: {
        email: 'mahi@fuelsync.com'
      },
      select: {
        id: true,
        tenant_id: true,
        email: true,
        name: true,
        role: true,
        created_at: true
      }
    });
    
    if (mahiUser.length === 0) {
      console.log('User mahi@fuelsync.com NOT found in any tenant');
    } else {
      console.log('User mahi@fuelsync.com found:');
      mahiUser.forEach(user => {
        console.log(`Tenant ID: ${user.tenant_id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Name: ${user.name}`);
        console.log(`Role: ${user.role}`);
        console.log('---');
      });
    }
    
  } catch (error) {
    console.error('Error checking Azure data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAzureData();