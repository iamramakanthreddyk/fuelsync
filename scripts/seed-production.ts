import { seedDatabase } from '../src/utils/seedUtils';

const PRODUCTION_SEED_CONFIG = {
  publicSchema: {
    plans: [
      { name: 'basic', config: { maxStations: 5, maxUsers: 10 } },
      { name: 'pro', config: { maxStations: 20, maxUsers: 50 } },
      { name: 'enterprise', config: { maxStations: -1, maxUsers: -1 } }
    ],
    adminUsers: [
      { email: 'admin@fuelsync.dev', password: 'Admin@123!', role: 'superadmin' }
    ],
    tenants: [
      { name: 'Demo Company', schemaName: 'demo_tenant_001', planName: 'basic' }
    ]
  },
  tenantSchemas: [{
    schemaName: 'demo_tenant_001',
    tenantName: 'Demo Company',
    planName: 'basic',
    users: [
      { email: 'owner@demo.com', password: 'Owner@123!', role: 'owner' },
      { email: 'manager@demo.com', password: 'Manager@123!', role: 'manager' },
      { email: 'attendant@demo.com', password: 'Attendant@123!', role: 'attendant' }
    ],
    stations: [{
      name: 'Main Station',
      fuelPrices: [
        { fuelType: 'petrol', price: 102.50 },
        { fuelType: 'diesel', price: 98.75 }
      ],
      pumps: [{
        name: 'Pump 1',
        nozzles: [
          { number: 1, fuelType: 'petrol' },
          { number: 2, fuelType: 'diesel' }
        ]
      }, {
        name: 'Pump 2', 
        nozzles: [
          { number: 3, fuelType: 'petrol' },
          { number: 4, fuelType: 'diesel' }
        ]
      }]
    }],
    creditors: [
      { partyName: 'ABC Transport', creditLimit: 50000 },
      { partyName: 'XYZ Logistics', creditLimit: 25000 }
    ]
  }]
};

async function seedProduction() {
  try {
    console.log('🌱 Seeding production database...');
    await seedDatabase(PRODUCTION_SEED_CONFIG);
    console.log('✅ Production seeding completed!');
    console.log('\n📋 Production Credentials:');
    console.log('🔑 SuperAdmin: admin@fuelsync.dev / Admin@123!');
    console.log('🏢 Owner: owner@demo.com / Owner@123!');
    console.log('👨‍💼 Manager: manager@demo.com / Manager@123!');
    console.log('👷 Attendant: attendant@demo.com / Attendant@123!');
    console.log('\n🏪 Demo tenant: demo_tenant_001');
  } catch (error) {
    console.error('❌ Production seeding failed:', error);
    process.exit(1);
  }
}

seedProduction();