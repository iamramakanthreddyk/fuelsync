import { seedDatabase, DEMO_TENANT_CONFIG } from '../src/utils/seedUtils';

async function seed() {
  const schema = process.argv[2] || 'demo_tenant_001';
  
  // Customize config for the specified schema
  const config = {
    ...DEMO_TENANT_CONFIG,
    tenantSchemas: DEMO_TENANT_CONFIG.tenantSchemas?.map(tenant => ({
      ...tenant,
      schemaName: schema,
      users: tenant.users?.map(user => ({
        ...user,
        email: user.email.replace('@demo.com', `@${schema.replace(/_/g, '-')}.com`)
      }))
    }))
  };

  try {
    await seedDatabase(config);
    console.log(`Seeded tenant '${schema}' successfully`);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
