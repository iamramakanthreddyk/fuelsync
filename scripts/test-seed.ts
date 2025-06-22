import { seedTestDb } from './seed-test-db';

seedTestDb().then(() => {
  console.log('Test data seeded');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
