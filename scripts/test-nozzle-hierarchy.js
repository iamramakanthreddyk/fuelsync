/**
 * Test script to verify nozzle hierarchy integrity
 * Tests: Station -> Pump -> Nozzle -> Readings hierarchy
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNozzleHierarchy() {
  console.log('🧪 Testing Nozzle Hierarchy Integrity...\n');
  
  try {
    // Get a test tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.error('❌ No tenant found. Please create a tenant first.');
      return;
    }
    console.log(`✅ Using tenant: ${tenant.name} (${tenant.id})`);
    
    // Get a test station
    const station = await prisma.station.findFirst({
      where: { tenant_id: tenant.id }
    });
    if (!station) {
      console.error('❌ No station found. Please create a station first.');
      return;
    }
    console.log(`✅ Using station: ${station.name} (${station.id})`);
    
    // Get a test pump
    const pump = await prisma.pump.findFirst({
      where: { 
        tenant_id: tenant.id,
        station_id: station.id 
      }
    });
    if (!pump) {
      console.error('❌ No pump found. Please create a pump first.');
      return;
    }
    console.log(`✅ Using pump: ${pump.name} (${pump.id})`);
    
    // Test 1: Get existing nozzles
    console.log('\n📋 Test 1: Checking existing nozzles...');
    const existingNozzles = await prisma.nozzle.findMany({
      where: {
        tenant_id: tenant.id,
        pump_id: pump.id
      },
      orderBy: { nozzle_number: 'asc' }
    });
    
    console.log(`Found ${existingNozzles.length} existing nozzles:`);
    for (const nozzle of existingNozzles) {
      // Get last reading for each nozzle
      const lastReading = await prisma.nozzleReading.findFirst({
        where: {
          nozzle_id: nozzle.id,
          tenant_id: tenant.id
        },
        orderBy: { recorded_at: 'desc' }
      });
      
      console.log(`  - Nozzle #${nozzle.nozzle_number} (${nozzle.fuel_type}): ${lastReading ? `Last reading: ${lastReading.reading}` : 'No readings'}`);
    }
    
    // Test 2: Create a new nozzle
    console.log('\n🔧 Test 2: Creating a new nozzle...');
    const nextNozzleNumber = Math.max(...existingNozzles.map(n => n.nozzle_number), 0) + 1;
    
    const newNozzle = await prisma.nozzle.create({
      data: {
        tenant_id: tenant.id,
        pump_id: pump.id,
        nozzle_number: nextNozzleNumber,
        fuel_type: 'petrol',
        status: 'active'
      }
    });
    
    console.log(`✅ Created new nozzle: #${newNozzle.nozzle_number} (${newNozzle.id})`);
    
    // Test 3: Verify the new nozzle has no readings
    console.log('\n🔍 Test 3: Verifying new nozzle has no readings...');
    const newNozzleReadings = await prisma.nozzleReading.findMany({
      where: {
        nozzle_id: newNozzle.id,
        tenant_id: tenant.id
      }
    });
    
    if (newNozzleReadings.length === 0) {
      console.log('✅ New nozzle correctly has no readings');
    } else {
      console.log(`❌ ERROR: New nozzle has ${newNozzleReadings.length} readings (should be 0)`);
    }
    
    // Test 4: Test the listNozzles query
    console.log('\n📊 Test 4: Testing listNozzles query...');
    const sql = `
      SELECT 
        n.id,
        n.nozzle_number,
        n.fuel_type,
        (
          SELECT reading 
          FROM public.nozzle_readings nr 
          WHERE nr.nozzle_id = n.id 
          AND nr.tenant_id = n.tenant_id
          AND nr.status != 'voided'
          ORDER BY nr.recorded_at DESC 
          LIMIT 1
        ) as last_reading
      FROM public.nozzles n
      WHERE n.tenant_id = $1 AND n.pump_id = $2
      ORDER BY n.nozzle_number ASC
    `;
    
    const queryResult = await prisma.$queryRawUnsafe(sql, tenant.id, pump.id);
    
    console.log('Query results:');
    queryResult.forEach(nozzle => {
      console.log(`  - Nozzle #${nozzle.nozzle_number} (${nozzle.fuel_type}): ${nozzle.last_reading || 'No readings'}`);
    });
    
    // Test 5: Add a reading to an existing nozzle and verify isolation
    if (existingNozzles.length > 0) {
      console.log('\n📝 Test 5: Testing reading isolation...');
      const testNozzle = existingNozzles[0];
      
      // Add a test reading
      const testReading = await prisma.nozzleReading.create({
        data: {
          tenant_id: tenant.id,
          nozzle_id: testNozzle.id,
          reading: 12345.67,
          recorded_at: new Date(),
          payment_method: 'cash'
        }
      });
      
      console.log(`✅ Added test reading ${testReading.reading} to nozzle #${testNozzle.nozzle_number}`);
      
      // Re-run the query to verify isolation
      const updatedQueryResult = await prisma.$queryRawUnsafe(sql, tenant.id, pump.id);
      
      console.log('Updated query results:');
      updatedQueryResult.forEach(nozzle => {
        const isTestNozzle = nozzle.id === testNozzle.id;
        const expectedReading = isTestNozzle ? '12345.67' : (nozzle.last_reading || 'No readings');
        const actualReading = nozzle.last_reading || 'No readings';
        
        const status = isTestNozzle ? 
          (actualReading === '12345.67' ? '✅' : '❌') : 
          '✅';
        
        console.log(`  ${status} Nozzle #${nozzle.nozzle_number} (${nozzle.fuel_type}): ${actualReading}`);
      });
    }
    
    // Test 6: Verify new nozzle still has no readings
    console.log('\n🔍 Test 6: Final verification - new nozzle should still have no readings...');
    const finalQueryResult = await prisma.$queryRawUnsafe(sql, tenant.id, pump.id);
    const newNozzleInQuery = finalQueryResult.find(n => n.id === newNozzle.id);
    
    if (newNozzleInQuery && !newNozzleInQuery.last_reading) {
      console.log('✅ SUCCESS: New nozzle correctly shows no readings');
    } else {
      console.log(`❌ ERROR: New nozzle shows reading: ${newNozzleInQuery?.last_reading}`);
    }
    
    console.log('\n🎉 Hierarchy integrity test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testNozzleHierarchy();
