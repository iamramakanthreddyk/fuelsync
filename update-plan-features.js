/**
 * @file update-plan-features.js
 * @description Update existing plans with proper features
 */

const { Pool } = require('pg');

// Load environment variables
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'fueladmin',
  host: process.env.DB_HOST || 'fuelsync-server.postgres.database.azure.com',
  database: process.env.DB_NAME || 'fuelsync_db',
  password: process.env.DB_PASSWORD || 'Th1nkpad!2304',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function updatePlanFeatures() {
  console.log('🔄 Updating plan features...\n');

  try {
    // Define features for each plan type
    const regularFeatures = [
      'Basic Dashboard',
      'Station Management',
      'User Management',
      'Basic Reports',
      'Email Support'
    ];

    const premiumFeatures = [
      'Advanced Dashboard',
      'Multi-Station Support',
      'Advanced User Roles',
      'Comprehensive Reports',
      'Real-time Analytics',
      'API Access',
      'Priority Support',
      'Custom Branding',
      'Data Export',
      'Mobile App Access'
    ];

    // Update Regular plan
    console.log('1. Updating Regular plan features...');
    const regularResult = await pool.query(
      `UPDATE public.plans 
       SET features = $1, updated_at = NOW() 
       WHERE name = 'Regular'
       RETURNING id, name, features`,
      [JSON.stringify(regularFeatures)]
    );

    if (regularResult.rows.length > 0) {
      console.log('✅ Regular plan updated');
      console.log('   Features:', regularResult.rows[0].features);
    } else {
      console.log('❌ Regular plan not found');
    }

    // Update Premium plan
    console.log('\n2. Updating Premium plan features...');
    const premiumResult = await pool.query(
      `UPDATE public.plans 
       SET features = $1, updated_at = NOW() 
       WHERE name = 'Premium'
       RETURNING id, name, features`,
      [JSON.stringify(premiumFeatures)]
    );

    if (premiumResult.rows.length > 0) {
      console.log('✅ Premium plan updated');
      console.log('   Features:', premiumResult.rows[0].features);
    } else {
      console.log('❌ Premium plan not found');
    }

    // Verify updates
    console.log('\n3. Verifying all plans...');
    const allPlans = await pool.query(
      'SELECT id, name, price_monthly, features FROM public.plans ORDER BY price_monthly ASC'
    );

    allPlans.rows.forEach((plan, index) => {
      console.log(`   Plan ${index + 1}: ${plan.name}`);
      console.log(`     Price: ₹${plan.price_monthly}/month`);
      console.log(`     Features: ${plan.features.length} features`);
      const features = JSON.parse(plan.features);
      features.forEach(feature => console.log(`       - ${feature}`));
      console.log('');
    });

    console.log('✅ Plan features updated successfully!');

  } catch (error) {
    console.error('❌ Error updating plan features:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the update
updatePlanFeatures();
