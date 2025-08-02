/**
 * Debug script to check reading calculation issues
 * This script will help identify why amounts show ₹0.00
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugReadingCalculation() {
  console.log('🔍 Debugging reading calculation issues...\n');
  
  try {
    // Get the most recent reading that shows ₹0.00
    console.log('1. Fetching recent readings...');
    const recentReadings = await prisma.nozzleReading.findMany({
      take: 5,
      orderBy: { recorded_at: 'desc' },
      include: {
        nozzle: {
          include: {
            pump: {
              include: {
                station: true
              }
            }
          }
        },
        sales: true // Include related sales records
      }
    });
    
    if (recentReadings.length === 0) {
      console.log('❌ No readings found');
      return;
    }
    
    console.log(`Found ${recentReadings.length} recent readings:\n`);
    
    for (const reading of recentReadings) {
      console.log(`📊 Reading ID: ${reading.id}`);
      console.log(`   Station: ${reading.nozzle.pump.station.name}`);
      console.log(`   Pump: ${reading.nozzle.pump.name}`);
      console.log(`   Nozzle: #${reading.nozzle.nozzle_number} (${reading.nozzle.fuel_type})`);
      console.log(`   Reading: ${reading.reading}L`);
      console.log(`   Recorded: ${reading.recorded_at.toISOString()}`);
      console.log(`   Sales records: ${reading.sales.length}`);
      
      if (reading.sales.length === 0) {
        console.log('   ❌ NO SALES RECORD FOUND - This is the problem!');
        
        // Check if there's a fuel price for this reading
        const fuelPrice = await prisma.fuelPrice.findFirst({
          where: {
            tenant_id: reading.tenant_id,
            station_id: reading.nozzle.pump.station_id,
            fuel_type: reading.nozzle.fuel_type,
            valid_from: { lte: reading.recorded_at },
            OR: [
              { effective_to: null },
              { effective_to: { gt: reading.recorded_at } }
            ]
          },
          orderBy: { valid_from: 'desc' }
        });
        
        if (fuelPrice) {
          console.log(`   💰 Fuel price available: ₹${fuelPrice.price}/L (valid from ${fuelPrice.valid_from.toISOString().split('T')[0]})`);
          
          // Calculate what the amount should be
          const previousReading = await prisma.nozzleReading.findFirst({
            where: {
              nozzle_id: reading.nozzle_id,
              recorded_at: { lt: reading.recorded_at }
            },
            orderBy: { recorded_at: 'desc' }
          });
          
          const previousValue = previousReading ? previousReading.reading : 0;
          const volumeSold = reading.reading - previousValue;
          const expectedAmount = volumeSold * fuelPrice.price;
          
          console.log(`   📈 Previous reading: ${previousValue}L`);
          console.log(`   📊 Volume sold: ${volumeSold}L`);
          console.log(`   💵 Expected amount: ₹${expectedAmount.toFixed(2)}`);
          console.log('   🔧 Sales record should have been created but is missing!');
        } else {
          console.log('   ❌ No fuel price found for this reading');
        }
      } else {
        const sale = reading.sales[0];
        console.log(`   💰 Sales record found:`);
        console.log(`      Volume: ${sale.volume}L`);
        console.log(`      Price: ₹${sale.fuel_price}/L`);
        console.log(`      Amount: ₹${sale.amount}`);
        console.log(`      Status: ${sale.status}`);
        
        if (sale.amount === 0) {
          console.log('   ❌ Amount is ₹0.00 - calculation issue!');
        } else {
          console.log('   ✅ Amount calculated correctly');
        }
      }
      
      console.log(''); // Empty line for readability
    }
    
    // Check the readings query that the frontend uses
    console.log('2. Testing frontend readings query...');
    const sql = `
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
      ORDER BY nr.recorded_at DESC
      LIMIT 5
    `;
    
    const tenant = await prisma.tenant.findFirst();
    if (tenant) {
      const queryResults = await prisma.$queryRawUnsafe(sql, tenant.id);
      
      console.log('Frontend query results:');
      queryResults.forEach((row, index) => {
        console.log(`${index + 1}. Reading ${row.reading}L - Amount: ₹${row.amount} - Price: ₹${row.pricePerLitre}/L`);
      });
    }
    
    console.log('\n🎯 Summary:');
    console.log('- If sales records are missing, the reading creation process failed');
    console.log('- If sales records exist but amount is ₹0.00, there\'s a calculation issue');
    console.log('- If fuel prices are missing, readings should not be allowed');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugReadingCalculation();
