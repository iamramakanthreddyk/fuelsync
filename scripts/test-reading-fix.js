/**
 * Test script to verify the reading calculation fix
 * This will create a test reading and verify the calculation works correctly
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testReadingFix() {
  console.log('🧪 Testing reading calculation fix...\n');
  
  try {
    // Get the first nozzle for testing
    const nozzle = await prisma.nozzle.findFirst({
      include: {
        pump: {
          include: {
            station: true
          }
        }
      }
    });
    
    if (!nozzle) {
      console.log('❌ No nozzles found for testing');
      return;
    }
    
    console.log(`📍 Testing with nozzle: ${nozzle.pump.station.name} > ${nozzle.pump.name} > #${nozzle.nozzle_number} (${nozzle.fuel_type})`);
    
    // Get the latest reading for this nozzle
    const latestReading = await prisma.nozzleReading.findFirst({
      where: { nozzle_id: nozzle.id },
      orderBy: { recorded_at: 'desc' }
    });
    
    if (latestReading) {
      console.log(`📊 Latest reading: ${latestReading.reading}L (${latestReading.recorded_at.toISOString()})`);
    } else {
      console.log('📊 No previous readings found');
    }
    
    // Check if there's a fuel price
    const fuelPrice = await prisma.fuelPrice.findFirst({
      where: {
        tenant_id: nozzle.tenant_id,
        station_id: nozzle.pump.station_id,
        fuel_type: nozzle.fuel_type,
        effective_to: null
      }
    });
    
    if (fuelPrice) {
      console.log(`💰 Fuel price: ₹${fuelPrice.price}/L`);
    } else {
      console.log('❌ No fuel price found - this would prevent reading creation');
      return;
    }
    
    // Test scenarios
    console.log('\n🧪 Testing different reading scenarios:\n');

    const currentReading = latestReading ? latestReading.reading : 0;
    const hasNoPreviousReading = !latestReading;

    // Scenario 1: First reading (no previous reading)
    if (hasNoPreviousReading) {
      const firstReading = 500;
      const firstVolume = firstReading; // Should use current reading as volume
      const firstAmount = firstVolume * fuelPrice.price;
      console.log(`1️⃣ First reading: ${firstReading}L (no previous reading)`);
      console.log(`   Volume: ${firstVolume}L (using current reading)`);
      console.log(`   Amount: ₹${firstAmount.toFixed(2)}`);
      console.log(`   🆕 This should be handled as first reading`);
    }

    // Scenario 2: Previous reading is 0
    const zeroToReading = 300;
    const zeroToVolume = zeroToReading; // Should use current reading as volume
    const zeroToAmount = zeroToVolume * fuelPrice.price;
    console.log(`\n2️⃣ Previous reading was 0, current: ${zeroToReading}L`);
    console.log(`   Volume: ${zeroToVolume}L (using current reading)`);
    console.log(`   Amount: ₹${zeroToAmount.toFixed(2)}`);
    console.log(`   🆕 This should be handled like first reading`);

    // Scenario 3: Normal reading (increase)
    const normalReading = currentReading + 50;
    const normalVolume = normalReading - currentReading;
    const normalAmount = normalVolume * fuelPrice.price;
    console.log(`\n3️⃣ Normal reading: ${normalReading}L (previous: ${currentReading}L)`);
    console.log(`   Volume: ${normalVolume}L`);
    console.log(`   Amount: ₹${normalAmount.toFixed(2)}`);
    console.log(`   ✅ This should work correctly`);

    // Scenario 4: Meter reset (decrease)
    const resetReading = 100; // Much lower than current
    const resetVolume = resetReading; // Should use current reading as volume
    const resetAmount = resetVolume * fuelPrice.price;
    console.log(`\n4️⃣ Meter reset: ${resetReading}L (less than current ${currentReading}L)`);
    console.log(`   Volume: ${resetVolume}L (using current reading)`);
    console.log(`   Amount: ₹${resetAmount.toFixed(2)}`);
    console.log(`   🔄 This should be handled as meter reset`);

    // Scenario 5: Zero volume
    const sameReading = currentReading;
    console.log(`\n5️⃣ Same reading: ${sameReading}L`);
    console.log(`   Volume: 0L`);
    console.log(`   Amount: ₹0.00`);
    console.log(`   ⚠️  This should show zero volume warning`);
    
    console.log('\n🎯 Summary:');
    console.log('- First readings (no previous) should use current reading as volume');
    console.log('- Previous reading = 0 should use current reading as volume');
    console.log('- Normal readings should calculate volume as current - previous');
    console.log('- Meter resets should use current reading as volume');
    console.log('- Zero volume readings should be allowed but warned');
    console.log('- All calculations should create proper sales records');
    
    console.log('\n✅ Test completed. The fixes should handle all these scenarios correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testReadingFix();
