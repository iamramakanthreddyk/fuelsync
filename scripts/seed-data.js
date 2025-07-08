const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Construct DATABASE_URL from DB_* vars if not provided
if (!process.env.DATABASE_URL && process.env.DB_HOST) {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || '5432';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || '';
  const name = process.env.DB_NAME || 'postgres';
  process.env.DATABASE_URL = `postgresql://${user}:${password}@${host}:${port}/${name}`;
}

const prisma = new PrismaClient();

async function seedData() {
  try {
  console.log('Starting seed data creation...');

    // Create first superadmin
    const superPassword1 = await bcrypt.hash('Admin@123', 10);
    await prisma.adminUser.upsert({
      where: { email: 'admin@fuelsync.com' },
      update: {},
      create: {
        email: 'admin@fuelsync.com',
        password_hash: superPassword1,
        name: 'Super Admin',
        role: 'superadmin'
      }
    });

    // Create second superadmin
    const superPassword2 = await bcrypt.hash('Admin2@123', 10);
    await prisma.adminUser.upsert({
      where: { email: 'admin2@fuelsync.com' },
      update: {},
      create: {
        email: 'admin2@fuelsync.com',
        password_hash: superPassword2,
        name: 'Super Admin 2',
        role: 'superadmin'
      }
    });

    console.log('✅ Created superadmin users');

    console.log('Seed data creation completed successfully!');

    console.log('\n=== SEED CREDENTIALS ===');
    console.log('SuperAdmin 1: admin@fuelsync.com / Admin@123');
    console.log('SuperAdmin 2: admin2@fuelsync.com / Admin2@123');
    console.log('========================\n');
    
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedData();
