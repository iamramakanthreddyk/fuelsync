/**
 * Debug script to test the frontend API call for nozzle N2
 * This simulates what the frontend does when calling getLatestReading
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugFrontendAPI() {
  console.log('🔍 Debugging frontend API call for nozzle N2...\n');
  
  try {
    // Get nozzle N2 ID
    const nozzle = await prisma.nozzle.findFirst({
      where: {
        nozzle_number: 2,
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
      }
    });
    
    if (!nozzle) {
      console.log('❌ Nozzle N2 not found');
      return;
    }
    
    console.log(`📍 Nozzle N2 ID: ${nozzle.id}`);
    console.log(`📍 Tenant ID: ${nozzle.tenant_id}`);
    
    // Test the exact query that the backend uses for the frontend API
    console.log('\n1. Testing the exact backend query for nozzle N2...');
    
    const backendQuery = `
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
      backendQuery,
      nozzle.tenant_id,
      nozzle.id
    );
    
    console.log(`Query result count: ${result.length}`);
    if (result.length > 0) {
      console.log('❌ UNEXPECTED: Found reading for nozzle N2!');
      console.log('Result:', result[0]);
    } else {
      console.log('✅ CORRECT: No reading found for nozzle N2');
    }
    
    // Test what happens if we query without nozzleId filter (this might show the bug)
    console.log('\n2. Testing query WITHOUT nozzleId filter (this might show cache contamination)...');
    
    const allReadingsQuery = `
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
      WHERE nr.tenant_id = $1
      ORDER BY nr.recorded_at DESC LIMIT 5
    `;
    
    const allResults = await prisma.$queryRawUnsafe(
      allReadingsQuery,
      nozzle.tenant_id
    );
    
    console.log(`All recent readings (${allResults.length}):`);
    allResults.forEach((reading, index) => {
      console.log(`  ${index + 1}. Nozzle #${reading.nozzleNumber} (${reading.fuelType}): ${reading.reading}L - ID: ${reading.nozzleId}`);
    });
    
    // Check if any of these readings have the same ID as nozzle N2
    const n2Readings = allResults.filter(r => r.nozzleId === nozzle.id);
    if (n2Readings.length > 0) {
      console.log('❌ FOUND READINGS FOR N2 IN ALL RESULTS - This should not happen!');
    } else {
      console.log('✅ No readings for N2 in all results - This is correct');
    }
    
    // Check if there's a reading with 1000L that might be getting mixed up
    const thousandLReading = allResults.find(r => r.reading === 1000);
    if (thousandLReading) {
      console.log(`\n🔍 Found 1000L reading:`);
      console.log(`   Nozzle: #${thousandLReading.nozzleNumber} (${thousandLReading.fuelType})`);
      console.log(`   Nozzle ID: ${thousandLReading.nozzleId}`);
      console.log(`   Station: ${thousandLReading.stationName}`);
      console.log(`   Pump: ${thousandLReading.pumpName}`);
      
      if (thousandLReading.nozzleId !== nozzle.id) {
        console.log('✅ This 1000L reading belongs to a different nozzle - cache contamination likely');
      } else {
        console.log('❌ This 1000L reading claims to belong to N2 - data corruption!');
      }
    }
    
    console.log('\n🎯 Summary:');
    console.log(`- Nozzle N2 ID: ${nozzle.id}`);
    console.log(`- Should have 0 readings`);
    console.log(`- If frontend shows 1000L, it's getting data from wrong nozzle`);
    console.log(`- Likely cache contamination or state management issue`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugFrontendAPI();
