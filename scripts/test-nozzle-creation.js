const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Set DATABASE_URL from environment variables
process.env.DATABASE_URL = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=require`;

const prisma = new PrismaClient();

async function testNozzleCreation() {
  try {
    console.log('Testing nozzle creation...');
    
    // Find a tenant and pump to test with
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: '2797c96d-9136-4f12-95c4-9478eae6bbe0' // mahi's tenant
      }
    });
    
    if (!tenant) {
      console.log('Tenant not found');
      return;
    }
    
    console.log('Found tenant:', tenant.name);
    
    // Find a pump in this tenant
    const pump = await prisma.pump.findFirst({
      where: {
        tenant_id: tenant.id
      }
    });
    
    if (!pump) {
      console.log('No pump found for this tenant');
      return;
    }
    
    console.log('Found pump:', pump.name);
    
    // Check existing nozzles for this pump
    const existingNozzles = await prisma.nozzle.findMany({
      where: {
        tenant_id: tenant.id,
        pump_id: pump.id
      }
    });
    
    console.log(`Existing nozzles for pump: ${existingNozzles.length}`);
    existingNozzles.forEach(nozzle => {
      console.log(`- Nozzle ${nozzle.nozzle_number}: ${nozzle.fuel_type}`);
    });
    
    // Try to create a new nozzle
    const nextNozzleNumber = existingNozzles.length + 1;
    
    console.log(`Attempting to create nozzle ${nextNozzleNumber}...`);
    
    const newNozzle = await prisma.nozzle.create({
      data: {
        tenant_id: tenant.id,
        pump_id: pump.id,
        nozzle_number: nextNozzleNumber,
        fuel_type: 'petrol',
        status: 'active'
      }
    });
    
    console.log('Nozzle created successfully:', newNozzle);
    
  } catch (error) {
    console.error('Error testing nozzle creation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNozzleCreation();