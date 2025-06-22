import { seedDatabase } from '../src/utils/seedUtils';

async function seed() {
  const tenantId = process.env.TENANT_ID || process.argv[2];
  const schemaName = process.env.SCHEMA_NAME || process.argv[3];

  if (!tenantId || !schemaName) {
    console.error('Usage: ts-node seed-tenant-schema.ts <tenantId> <schemaName>');
    process.exit(1);
  }

  const config = {
    tenantSchemas: [{
      schemaName,
      tenantName: `Tenant ${schemaName}`,
      planName: 'basic',
      users: [
        { email: `owner@${schemaName}.com`, password: 'password', role: 'owner' }
      ],
      stations: [{
        name: 'Main Station',
        pumps: [{
          name: 'Pump 1',
          nozzles: [{ number: 1, fuelType: 'petrol' }]
        }]
      }]
    }]
  };

  try {
    await seedDatabase(config);
    console.log(`Seeded tenant schema '${schemaName}' successfully`);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();

