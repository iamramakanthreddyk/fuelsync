const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixTable() {
  try {
    console.log('Fixing reading_audit_log table...');
    
    // Add missing columns
    await pool.query('ALTER TABLE public.reading_audit_log ADD COLUMN IF NOT EXISTS user_id UUID');
    await pool.query('ALTER TABLE public.reading_audit_log ADD COLUMN IF NOT EXISTS old_values JSONB');
    await pool.query('ALTER TABLE public.reading_audit_log ADD COLUMN IF NOT EXISTS new_values JSONB');
    await pool.query('ALTER TABLE public.reading_audit_log ADD COLUMN IF NOT EXISTS ip_address INET');
    await pool.query('ALTER TABLE public.reading_audit_log ADD COLUMN IF NOT EXISTS user_agent TEXT');
    
    // Check if performed_by exists and migrate to user_id
    const result = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'reading_audit_log' AND column_name = 'performed_by'
    `);
    
    if (result.rows.length > 0) {
      console.log('Migrating performed_by to user_id...');
      await pool.query('UPDATE public.reading_audit_log SET user_id = performed_by WHERE user_id IS NULL');
      await pool.query('ALTER TABLE public.reading_audit_log DROP COLUMN performed_by');
    }
    
    // Create other audit tables
    console.log('Creating other audit tables...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.role_access_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        user_id UUID NOT NULL,
        user_role TEXT NOT NULL,
        plan_tier TEXT NOT NULL,
        feature_requested TEXT NOT NULL,
        action_requested TEXT NOT NULL,
        access_granted BOOLEAN NOT NULL DEFAULT FALSE,
        denial_reason TEXT,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    
    console.log('All tables fixed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixTable();
