const { Pool } = require('pg');
require('dotenv').config();

async function createCashReportsTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Creating cash_reports table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.cash_reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          station_id UUID NOT NULL,
          user_id UUID NOT NULL,
          date DATE NOT NULL,
          shift VARCHAR(20) CHECK (shift IN ('morning', 'afternoon', 'night')) DEFAULT 'morning',
          cash_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
          card_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
          upi_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
          credit_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
          total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
          notes TEXT,
          status VARCHAR(20) CHECK (status IN ('submitted', 'approved', 'rejected')) DEFAULT 'submitted',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (tenant_id, station_id, user_id, date, shift)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_cash_reports_tenant ON public.cash_reports(tenant_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_cash_reports_station_date ON public.cash_reports(station_id, date);
    `);

    console.log('✅ cash_reports table created successfully');

    // Fix sales status constraint
    console.log('Fixing sales status constraint...');
    
    await pool.query(`
      ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS chk_sales_status;
    `);

    await pool.query(`
      ALTER TABLE public.sales 
      ADD CONSTRAINT chk_sales_status 
      CHECK (status IN ('pending', 'posted', 'finalized', 'voided'));
    `);

    console.log('✅ Sales status constraint fixed');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createCashReportsTable();