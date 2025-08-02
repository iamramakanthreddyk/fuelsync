const { Pool } = require('pg');

async function checkTableTypes() {
  const pool = new Pool({
    host: 'fuelsync-server.postgres.database.azure.com',
    user: 'fueladmin',
    password: 'Th1nkpad!2304',
    database: 'fuelsync_db',
    port: 5432,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Checking column types in day_reconciliations table...');
    
    // Check if day_reconciliations table exists and get column types
    const tableResult = await pool.query(`
      SELECT 
        column_name,
        data_type,
        udt_name,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'day_reconciliations'
        AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    if (tableResult.rowCount === 0) {
      console.log('❌ day_reconciliations table does not exist!');
      console.log('🔧 Creating day_reconciliations table...');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.day_reconciliations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          station_id UUID NOT NULL,
          date DATE NOT NULL,
          finalized BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(tenant_id, station_id, date)
        );
      `);
      
      console.log('✅ Created day_reconciliations table with proper UUID types');
    } else {
      console.log(`✅ day_reconciliations table exists with ${tableResult.rowCount} columns:`);
      tableResult.rows.forEach(row => {
        console.log(`- ${row.column_name}: ${row.data_type} (${row.udt_name}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    }
    
    console.log('\n🔍 Checking column types in nozzle_readings table...');
    const nozzleReadingsResult = await pool.query(`
      SELECT 
        column_name,
        data_type,
        udt_name,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'nozzle_readings'
        AND table_schema = 'public'
        AND column_name IN ('tenant_id', 'nozzle_id', 'id')
      ORDER BY ordinal_position;
    `);
    
    console.log(`✅ nozzle_readings relevant columns:`);
    nozzleReadingsResult.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (${row.udt_name}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\n🔧 Creating a type-safe trigger...');
    
    // Create a completely type-safe trigger
    await pool.query(`
      DROP TRIGGER IF EXISTS trg_prevent_finalized_nozzle_reading ON public.nozzle_readings;
      DROP FUNCTION IF EXISTS public.prevent_finalized_nozzle_reading();
      
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
        
        -- Check if day_reconciliations table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'day_reconciliations' AND table_schema = 'public') THEN
          -- Use explicit casting to ensure type compatibility
          SELECT COALESCE(finalized, false) INTO is_finalized
          FROM public.day_reconciliations
          WHERE tenant_id::text = NEW.tenant_id::text
            AND station_id::text = station_uuid::text
            AND date = rec_date
          LIMIT 1;
          
          IF is_finalized THEN
            RAISE EXCEPTION 'Day already finalized for this station';
          END IF;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      CREATE TRIGGER trg_prevent_finalized_nozzle_reading
      BEFORE INSERT ON public.nozzle_readings
      FOR EACH ROW EXECUTE FUNCTION public.prevent_finalized_nozzle_reading();
    `);
    
    console.log('✅ Created type-safe trigger with text casting');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Full error:', err);
  } finally {
    await pool.end();
  }
}

checkTableTypes();
