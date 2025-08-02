/**
 * Debug script to check nozzle N2 and its latest reading
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugNozzleN2() {
  console.log('🔍 Debugging nozzle N2 latest reading fetch...\n');
  
  try {
    // Find nozzle N2 in station-1, pump-1
    console.log('1. Finding nozzle N2...');
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
      console.log('❌ Nozzle N2 not found in station-1 > pump-1');
      
      // Let's see what nozzles exist
      const allNozzles = await prisma.nozzle.findMany({
        include: {
          pump: {
            include: {
              station: true
            }
          }
        },
        orderBy: [
          { pump: { station: { name: 'asc' } } },
          { pump: { name: 'asc' } },
          { nozzle_number: 'asc' }
        ]
      });
      
      console.log('\n📋 All nozzles in the system:');
      allNozzles.forEach(n => {
        console.log(`  - ${n.pump.station.name} > ${n.pump.name} > #${n.nozzle_number} (${n.fuel_type}) - ID: ${n.id}`);
      });
      
      return;
    }
    
    console.log(`✅ Found nozzle: ${nozzle.pump.station.name} > ${nozzle.pump.name} > #${nozzle.nozzle_number} (${nozzle.fuel_type})`);
    console.log(`   Nozzle ID: ${nozzle.id}`);
    console.log(`   Tenant ID: ${nozzle.tenant_id}`);
    
    // Get all readings for this nozzle
    console.log('\n2. Getting all readings for this nozzle...');
    const allReadings = await prisma.nozzleReading.findMany({
      where: {
        nozzle_id: nozzle.id
      },
      orderBy: {
        recorded_at: 'desc'
      },
      take: 5
    });
    
    console.log(`Found ${allReadings.length} readings:`);
    allReadings.forEach((reading, index) => {
      console.log(`  ${index + 1}. ${reading.reading}L at ${reading.recorded_at.toISOString()} (ID: ${reading.id})`);
    });
    
    // Test the backend query that should be used for latest reading
    console.log('\n3. Testing backend latest reading query...');
    const latestReadingQuery = `
      SELECT reading, recorded_at 
      FROM public.nozzle_readings 
      WHERE nozzle_id = $1 AND tenant_id = $2 AND status != $3 
      ORDER BY recorded_at DESC LIMIT 1
    `;
    
    const latestReading = await prisma.$queryRawUnsafe(
      latestReadingQuery,
      nozzle.id,
      nozzle.tenant_id,
      'voided'
    );
    
    if (latestReading.length > 0) {
      console.log(`✅ Latest reading from backend query: ${latestReading[0].reading}L at ${latestReading[0].recorded_at.toISOString()}`);
    } else {
      console.log('❌ No latest reading found from backend query');
    }
    
    // Test the frontend API query
    console.log('\n4. Testing frontend API query...');
    const frontendQuery = `
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
    
    const frontendResult = await prisma.$queryRawUnsafe(
      frontendQuery,
      nozzle.tenant_id,
      nozzle.id
    );
    
    if (frontendResult.length > 0) {
      const result = frontendResult[0];
      console.log(`✅ Frontend API query result:`);
      console.log(`   Reading: ${result.reading}L`);
      console.log(`   Recorded: ${result.recordedAt.toISOString()}`);
      console.log(`   Amount: ₹${result.amount}`);
      console.log(`   Price: ₹${result.pricePerLitre}/L`);
    } else {
      console.log('❌ No result from frontend API query');
    }
    
    console.log('\n🎯 Summary:');
    console.log(`- Nozzle ID: ${nozzle.id}`);
    console.log(`- Total readings: ${allReadings.length}`);
    console.log(`- Latest reading should be: ${allReadings.length > 0 ? allReadings[0].reading + 'L' : 'None'}`);
    console.log('- Both backend and frontend queries should return the same result');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugNozzleN2();
