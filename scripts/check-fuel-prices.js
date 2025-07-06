const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Set DATABASE_URL from environment variables
process.env.DATABASE_URL = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=require`;

const prisma = new PrismaClient();

async function checkFuelPrices() {
  try {
    console.log('Checking fuel prices...');
    
    // Check all fuel prices
    const fuelPrices = await prisma.fuelPrice.findMany({
      include: {
        station: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        valid_from: 'desc'
      }
    });
    
    console.log(`Found ${fuelPrices.length} fuel price records:`);
    
    fuelPrices.forEach(price => {
      console.log(`- Station: ${price.station.name}, Fuel: ${price.fuel_type}, Price: ${price.price}, Valid from: ${price.valid_from}, Effective to: ${price.effective_to}`);
    });
    
    // Check for mahi's tenant specifically
    const mahiTenantId = '2797c96d-9136-4f12-95c4-9478eae6bbe0';
    const mahiPrices = await prisma.fuelPrice.findMany({
      where: {
        tenant_id: mahiTenantId
      },
      include: {
        station: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`\nFuel prices for mahi's tenant (${mahiTenantId}):`);
    if (mahiPrices.length === 0) {
      console.log('No fuel prices found for this tenant');
      
      // Check stations for this tenant
      const stations = await prisma.station.findMany({
        where: {
          tenant_id: mahiTenantId
        }
      });
      
      console.log(`Stations for this tenant: ${stations.length}`);
      stations.forEach(station => {
        console.log(`- ${station.name} (${station.id})`);
      });
      
    } else {
      mahiPrices.forEach(price => {
        console.log(`- Station: ${price.station.name}, Fuel: ${price.fuel_type}, Price: ${price.price}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking fuel prices:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFuelPrices();