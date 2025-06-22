import { seedDatabase, DEFAULT_SEED_CONFIG, DEMO_TENANT_CONFIG } from '../src/utils/seedUtils';

async function seedAll() {
  try {
    console.log('🌱 Starting complete database seeding...');
    
    // Seed public schema and demo tenant in one go
    const fullConfig = {
      publicSchema: DEFAULT_SEED_CONFIG.publicSchema,
      tenantSchemas: DEMO_TENANT_CONFIG.tenantSchemas
    };

    await seedDatabase(fullConfig);
    console.log('✅ Database seeding completed successfully');
    console.log('📋 Default credentials:');
    console.log('   SuperAdmin: admin@fuelsync.dev / password');
    console.log('   Owner: owner@demo.com / password');
    console.log('   Manager: manager@demo.com / password');
    console.log('   Attendant: attendant@demo.com / password');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedAll();