/**
 * Setup default fuel prices for all stations
 * This script ensures every station has fuel prices set
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupFuelPrices() {
  console.log('🔧 Setting up fuel prices for all stations...\n');
  
  try {
    // Get all tenants and their stations
    const tenants = await prisma.tenant.findMany({
      include: {
        stations: true
      }
    });
    
    if (tenants.length === 0) {
      console.log('❌ No tenants found. Please create a tenant first.');
      return;
    }
    
    // Default fuel prices (you can adjust these)
    const defaultPrices = {
      petrol: 102.50,
      diesel: 89.75,
      premium: 108.25
    };
    
    let totalPricesAdded = 0;
    
    for (const tenant of tenants) {
      console.log(`\n📋 Processing tenant: ${tenant.name} (${tenant.id})`);
      
      if (tenant.stations.length === 0) {
        console.log('  ⚠️  No stations found for this tenant');
        continue;
      }
      
      for (const station of tenant.stations) {
        console.log(`\n  🏪 Processing station: ${station.name} (${station.id})`);
        
        // Check existing fuel prices for this station
        const existingPrices = await prisma.fuelPrice.findMany({
          where: {
            tenant_id: tenant.id,
            station_id: station.id,
            effective_to: null // Only active prices
          }
        });
        
        console.log(`    Found ${existingPrices.length} existing active prices`);
        
        // Get fuel types that need prices
        const existingFuelTypes = existingPrices.map(p => p.fuel_type);
        const missingFuelTypes = Object.keys(defaultPrices).filter(
          fuelType => !existingFuelTypes.includes(fuelType)
        );
        
        if (missingFuelTypes.length === 0) {
          console.log('    ✅ All fuel types already have prices');
          continue;
        }
        
        console.log(`    🔧 Adding prices for: ${missingFuelTypes.join(', ')}`);
        
        // Add missing fuel prices
        for (const fuelType of missingFuelTypes) {
          const price = defaultPrices[fuelType];
          
          try {
            await prisma.fuelPrice.create({
              data: {
                tenant_id: tenant.id,
                station_id: station.id,
                fuel_type: fuelType,
                price: price,
                cost_price: price * 0.85, // 15% margin
                valid_from: new Date(),
                effective_to: null
              }
            });
            
            console.log(`      ✅ Added ${fuelType}: ₹${price}/L`);
            totalPricesAdded++;
          } catch (error) {
            console.log(`      ❌ Failed to add ${fuelType}: ${error.message}`);
          }
        }
      }
    }
    
    console.log(`\n🎉 Setup complete! Added ${totalPricesAdded} fuel prices.`);
    
    // Show summary of all current prices
    console.log('\n📊 Current fuel prices summary:');
    const allPrices = await prisma.fuelPrice.findMany({
      where: { effective_to: null },
      include: {
        station: { select: { name: true } }
      },
      orderBy: [
        { station: { name: 'asc' } },
        { fuel_type: 'asc' }
      ]
    });
    
    if (allPrices.length === 0) {
      console.log('❌ No active fuel prices found!');
    } else {
      allPrices.forEach(price => {
        console.log(`  - ${price.station.name}: ${price.fuel_type} = ₹${price.price}/L`);
      });
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupFuelPrices();
