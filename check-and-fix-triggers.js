const { Pool } = require('pg');

async function checkAndFixTriggers() {
  const pool = new Pool({
    host: 'fuelsync-server.postgres.database.azure.com',
    user: 'fueladmin',
    password: process.env.DB_PASSWORD || 'Th1nkpad!2304',
    database: 'fuelsync_db',
    port: 5432,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Checking current triggers on nozzle_readings table...');
    
    // Check all triggers on nozzle_readings table
    const triggersResult = await pool.query(`
      SELECT 
        t.trigger_name,
        t.event_manipulation,
        t.action_timing,
        p.proname as function_name,
        pg_get_functiondef(p.oid) as function_definition
      FROM information_schema.triggers t
      JOIN pg_proc p ON p.proname = t.action_statement
      WHERE t.event_object_table = 'nozzle_readings'
        AND t.event_object_schema = 'public'
      ORDER BY t.trigger_name;
    `);
    
    console.log(`Found ${triggersResult.rowCount} triggers:`);
    triggersResult.rows.forEach(row => {
      console.log(`- ${row.trigger_name} (${row.action_timing} ${row.event_manipulation}) -> ${row.function_name}`);
    });
    
    // Check the specific function definition
    console.log('\n🔍 Checking prevent_finalized_nozzle_reading function...');
    const functionResult = await pool.query(`
      SELECT pg_get_functiondef(oid) as definition
      FROM pg_proc 
      WHERE proname = 'prevent_finalized_nozzle_reading'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    `);
    
    if (functionResult.rowCount > 0) {
      console.log('Current function definition:');
      console.log(functionResult.rows[0].definition);
    } else {
      console.log('❌ Function prevent_finalized_nozzle_reading not found!');
    }
    
    console.log('\n🔧 Dropping ALL triggers on nozzle_readings and recreating...');
    
    // Drop all triggers on nozzle_readings table
    await pool.query(`
      DROP TRIGGER IF EXISTS trg_prevent_finalized_nozzle_reading ON public.nozzle_readings;
      DROP TRIGGER IF EXISTS prevent_nozzle_reading_after_closure ON public.nozzle_readings;
      DROP FUNCTION IF EXISTS public.prevent_finalized_nozzle_reading();
      DROP FUNCTION IF EXISTS public.prevent_closed_day_entries();
    `);
    
    console.log('✅ Dropped all existing triggers and functions');
    
    // Create a simple, working trigger
    console.log('🔧 Creating new simplified trigger...');
    await pool.query(`
      -- Create a simplified function that works
      CREATE OR REPLACE FUNCTION public.prevent_finalized_nozzle_reading()
      RETURNS TRIGGER AS $$
      DECLARE
        station_uuid uuid;
        rec_date date;
        is_finalized boolean := false;
      BEGIN
        -- Get station_id from nozzle
        SELECT p.station_id INTO station_uuid
        FROM public.nozzles n
        JOIN public.pumps p ON n.pump_id = p.id
        WHERE n.id = NEW.nozzle_id;
        
        -- Get the date
        rec_date := DATE(NEW.recorded_at);
        
        -- Check if day_reconciliations table exists first
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'day_reconciliations' AND table_schema = 'public') THEN
          -- Check if day is finalized
          SELECT COALESCE(finalized, false) INTO is_finalized
          FROM public.day_reconciliations
          WHERE tenant_id = NEW.tenant_id
            AND station_id = station_uuid
            AND date = rec_date
          LIMIT 1;
          
          IF is_finalized THEN
            RAISE EXCEPTION 'Day already finalized for this station';
          END IF;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Create the trigger
      CREATE TRIGGER trg_prevent_finalized_nozzle_reading
      BEFORE INSERT ON public.nozzle_readings
      FOR EACH ROW EXECUTE FUNCTION public.prevent_finalized_nozzle_reading();
    `);
    
    console.log('✅ Created new simplified trigger successfully!');
    
    // Verify the new trigger
    console.log('\n🔍 Verifying new trigger...');
    const newTriggersResult = await pool.query(`
      SELECT trigger_name, event_manipulation, action_timing
      FROM information_schema.triggers
      WHERE event_object_table = 'nozzle_readings'
        AND event_object_schema = 'public'
      ORDER BY trigger_name;
    `);
    
    console.log(`✅ Verified: ${newTriggersResult.rowCount} triggers now active:`);
    newTriggersResult.rows.forEach(row => {
      console.log(`- ${row.trigger_name} (${row.action_timing} ${row.event_manipulation})`);
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Full error:', err);
  } finally {
    await pool.end();
  }
}

checkAndFixTriggers();
