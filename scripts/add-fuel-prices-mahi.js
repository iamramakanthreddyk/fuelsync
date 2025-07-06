const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Set DATABASE_URL from environment variables
process.env.DATABASE_URL = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=require`;

const prisma = new PrismaClient();

async function addFuelPricesForMahi() {
  try {
    const mahiTenantId = '2797c96d-9136-4f12-95c4-9478eae6bbe0';
    
    // Get all stations for mahi's tenant
    const stations = await prisma.station.findMany({
      where: {
        tenant_id: mahiTenantId
      }
    });
    
    console.log(`Found ${stations.length} stations for mahi's tenant:`);
    
    for (const station of stations) {
      console.log(`\nProcessing station: ${station.name} (${station.id})`);
      
      // Check existing fuel prices
      const existingPrices = await prisma.fuelPrice.findMany({
        where: {
          tenant_id: mahiTenantId,
          station_id: station.id
        }
      });
      
      console.log(`Existing prices: ${existingPrices.length}`);
      existingPrices.forEach(price => {
        console.log(`- ${price.fuel_type}: ${price.price}`);
      });
      
      // Add missing fuel types
      const fuelTypes = ['petrol', 'diesel', 'premium'];
      const existingFuelTypes = existingPrices.map(p => p.fuel_type);
      
      for (const fuelType of fuelTypes) {
        if (!existingFuelTypes.includes(fuelType)) {
          console.log(`Adding ${fuelType} price for ${station.name}`);
          
          let price = 100; // Default price
          if (fuelType === 'petrol') price = 108;
          if (fuelType === 'diesel') price = 96;
          if (fuelType === 'premium') price = 120;
          
          await prisma.fuelPrice.create({
            data: {
              tenant_id: mahiTenantId,
              station_id: station.id,
              fuel_type: fuelType,
              price: price,
              cost_price: price * 0.85, // 85% of selling price as cost
              valid_from: new Date()
            }
          });
          
          console.log(`✅ Added ${fuelType} price: ${price}`);
        }
      }
    }
    
    console.log('\n✅ Fuel prices setup completed!');
    
  } catch (error) {
    console.error('Error adding fuel prices:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addFuelPricesForMahi();