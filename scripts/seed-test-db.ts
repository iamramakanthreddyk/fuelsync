import { seedDatabase } from '../src/utils/seedUtils';
import { createTestDb } from './create-test-db';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export async function seedTestDb(): Promise<void> {
  await createTestDb();

  const schema = process.env.TEST_SCHEMA || 'test_schema';

  const config = {
    publicSchema: {
      plans: [{ name: 'basic', config: {} }]
    },
    tenantSchemas: [{
      schemaName: schema,
      tenantName: 'Test Tenant',
      planName: 'basic',
      users: [
        { email: `owner@${schema}.com`, password: 'password', role: 'owner' }
      ],
      stations: [{
        name: 'Station 1',
        fuelPrices: [{ fuelType: 'petrol', price: 100 }],
        pumps: [{
          name: 'Pump 1',
          nozzles: [{ number: 1, fuelType: 'petrol' }]
        }]
      }],
      creditors: [{ partyName: 'Test Creditor' }]
    }]
  };

  try {
    await seedDatabase(config);
    console.log(`Test database seeded successfully with schema '${schema}'`);
  } catch (error) {
    console.error('Test seeding failed:', error);
    throw error;
  }
}

if (require.main === module) {
  seedTestDb().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
