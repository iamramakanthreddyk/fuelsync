const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function checkAndCreatePlans() {
  try {
    console.log('🔍 Checking existing plans...');
    
    // Check what plans exist
    const existingPlans = await pool.query('SELECT id, name, max_stations FROM public.plans ORDER BY name');
    console.log('Existing plans:', existingPlans.rows);
    
    const proPlanId = '00000000-0000-0000-0000-000000000002';
    
    // Check if pro plan exists
    const proPlanExists = existingPlans.rows.find(p => p.id === proPlanId);
    
    if (!proPlanExists) {
      console.log('❌ Pro plan not found, creating it...');
      
      // Create pro plan
      await pool.query(
        `INSERT INTO public.plans (id, name, max_stations, max_pumps_per_station, max_nozzles_per_pump, price_monthly, price_yearly, features, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          proPlanId,
          'pro',
          3,
          4,
          4,
          29.99,
          299.99,
          JSON.stringify(['creditors', 'reports', 'analytics'])
        ]
      );
      console.log('✅ Pro plan created');
    } else {
      console.log('✅ Pro plan already exists:', proPlanExists);
    }
    
    // Verify the plan exists now
    const verifyResult = await pool.query('SELECT id, name, max_stations FROM public.plans WHERE id = $1', [proPlanId]);
    console.log('Pro plan verification:', verifyResult.rows);
    
    console.log('🎉 Plans are ready!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkAndCreatePlans();