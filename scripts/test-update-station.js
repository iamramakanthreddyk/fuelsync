const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Set DATABASE_URL from environment variables
process.env.DATABASE_URL = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=require`;

const prisma = new PrismaClient();

async function testUpdateStation() {
  try {
    console.log('Testing station update...');
    
    // Get mahi's tenant ID
    const mahiTenantId = '2797c96d-9136-4f12-95c4-9478eae6bbe0';
    
    // Find a station to update
    const stations = await prisma.station.findMany({
      where: {
        tenant_id: mahiTenantId
      }
    });
    
    if (stations.length === 0) {
      console.log('No stations found for this tenant');
      return;
    }
    
    const station = stations[0];
    console.log(`Found station: ${station.name} (${station.id})`);
    console.log(`Current address: ${station.address || 'None'}`);
    
    // Update the station
    const updatedStation = await prisma.station.update({
      where: {
        id: station.id
      },
      data: {
        name: `${station.name} (Updated)`,
        address: station.address ? `${station.address} (Updated)` : 'New Address'
      }
    });
    
    console.log('\nStation updated successfully:');
    console.log(`- Name: ${updatedStation.name}`);
    console.log(`- Address: ${updatedStation.address}`);
    
  } catch (error) {
    console.error('Error updating station:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUpdateStation();