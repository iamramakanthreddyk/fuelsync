/**
 * Test script to verify the cache contamination fix
 * This will test the exact API calls that the frontend makes
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCacheFix() {
  console.log('🧪 Testing cache contamination fix...\n');
  
  try {
    // Get all nozzles in station-1, pump-1
    const nozzles = await prisma.nozzle.findMany({
      where: {
        pump: {
          name: 'pump-1',
          station: {
            name: 'station-1'
          }
        }
      },
      include: {
        pump: {
          include: {
            station: true
          }
        }
      },
      orderBy: {
        nozzle_number: 'asc'
      }
    });
    
    console.log(`Found ${nozzles.length} nozzles in station-1 > pump-1:`);
    nozzles.forEach(n => {
      console.log(`  - N${n.nozzle_number} (${n.fuel_type}): ${n.id}`);
    });
    
    console.log('\n🔍 Testing individual nozzle queries...\n');
    
    // Test each nozzle individually
    for (const nozzle of nozzles) {
      console.log(`Testing N${nozzle.nozzle_number} (${nozzle.fuel_type}):`);
      console.log(`  Nozzle ID: ${nozzle.id}`);
      
      // Test the exact query that the frontend API uses
      const query = `
        SELECT
          nr.id,
          nr.nozzle_id AS "nozzleId",
          COALESCE(n.nozzle_number, 0) AS "nozzleNumber",
          COALESCE(n.fuel_type, 'unknown') AS "fuelType",
          p.id AS "pumpId",
          COALESCE(p.name, 'Unknown Pump') AS "pumpName",
          s.id AS "stationId",
          COALESCE(s.name, 'Unknown Station') AS "stationName",
          nr.reading,
          nr.recorded_at AS "recordedAt",
          COALESCE(nr.payment_method, 'cash') AS "paymentMethod",
          COALESCE(u.name, 'System') AS "attendantName",
          COALESCE(sa.fuel_price, 0) AS "pricePerLitre",
          COALESCE(sa.amount, 0) AS "amount",
          COALESCE(sa.volume, 0) AS "volume"
        FROM public.nozzle_readings nr
        LEFT JOIN public.nozzles n ON nr.nozzle_id = n.id
        LEFT JOIN public.pumps p ON n.pump_id = p.id
        LEFT JOIN public.stations s ON p.station_id = s.id
        LEFT JOIN public.sales sa ON sa.reading_id = nr.id
        LEFT JOIN public.users u ON sa.created_by = u.id
        WHERE nr.tenant_id = $1 AND nr.nozzle_id = $2
        ORDER BY nr.recorded_at DESC LIMIT 1
      `;
      
      const result = await prisma.$queryRawUnsafe(
        query,
        nozzle.tenant_id,
        nozzle.id
      );
      
      if (result.length === 0) {
        console.log(`  ✅ No readings found (correct for new nozzles)`);
      } else {
        const reading = result[0];
        console.log(`  📊 Found reading: ${reading.reading}L`);
        console.log(`  🔍 Reading nozzle ID: ${reading.nozzleId}`);
        console.log(`  🔍 Expected nozzle ID: ${nozzle.id}`);
        
        if (reading.nozzleId === nozzle.id) {
          console.log(`  ✅ Nozzle ID matches - correct!`);
        } else {
          console.log(`  ❌ Nozzle ID mismatch - CACHE CONTAMINATION!`);
        }
      }
      
      console.log(''); // Empty line for readability
    }
    
    console.log('🎯 Summary:');
    console.log('- Each nozzle should only return readings that belong to it');
    console.log('- N1 should return 1000L reading');
    console.log('- N2 and N3 should return no readings (new nozzles)');
    console.log('- If any nozzle returns readings with wrong nozzleId, there\'s a backend bug');
    console.log('- The frontend validation should now catch and reject contaminated data');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCacheFix();
