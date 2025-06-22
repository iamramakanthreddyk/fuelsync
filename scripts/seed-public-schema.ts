import { seedDatabase, DEFAULT_SEED_CONFIG } from '../src/utils/seedUtils';

async function seed() {
  try {
    await seedDatabase(DEFAULT_SEED_CONFIG);
    console.log('Public schema seeded successfully');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
