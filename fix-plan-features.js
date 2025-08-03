/**
 * @file fix-plan-features.js
 * @description Add standardized features to existing plans
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixPlanFeatures() {
  console.log('🔧 FIXING PLAN FEATURES');
  console.log('=======================\n');

  try {
    // Define standardized features for each plan tier
    const STANDARD_FEATURES = {
      regular: [
        'Basic Dashboard',
        'Single Station Support',
        'User Management (up to 5 users)',
        'Basic Reports',
        'Email Support',
        'Mobile App Access'
      ],
      premium: [
        'Advanced Dashboard',
        'Multi-Station Support',
        'Unlimited Users',
        'Advanced Analytics',
        'Comprehensive Reports',
        'Real-time Monitoring',
        'API Access',
        'Priority Support',
        'Custom Branding',
        'Data Export (CSV/PDF)',
        'Mobile App Access',
        'Automated Alerts'
      ]
    };

    // Update Regular plan
    console.log('1. Updating Regular plan features...');
    const regularResult = await pool.query(
      `UPDATE public.plans 
       SET features = $1, updated_at = NOW() 
       WHERE name = 'Regular'
       RETURNING id, name, features`,
      [JSON.stringify(STANDARD_FEATURES.regular)]
    );

    if (regularResult.rows.length > 0) {
      console.log('✅ Regular plan updated');
      console.log(`   Features: ${STANDARD_FEATURES.regular.length} features added`);
      STANDARD_FEATURES.regular.forEach(feature => console.log(`     - ${feature}`));
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
      [JSON.stringify(STANDARD_FEATURES.premium)]
    );

    if (premiumResult.rows.length > 0) {
      console.log('✅ Premium plan updated');
      console.log(`   Features: ${STANDARD_FEATURES.premium.length} features added`);
      STANDARD_FEATURES.premium.forEach(feature => console.log(`     - ${feature}`));
    } else {
      console.log('❌ Premium plan not found');
    }

    // Verify the updates
    console.log('\n3. Verifying plan updates...');
    const verifyResult = await pool.query(`
      SELECT id, name, price_monthly, features,
             (SELECT COUNT(*) FROM public.tenants WHERE plan_id = p.id) as tenant_count
      FROM public.plans p 
      ORDER BY price_monthly ASC
    `);

    verifyResult.rows.forEach((plan, index) => {
      console.log(`   Plan ${index + 1}: ${plan.name}`);
      console.log(`     Price: ₹${plan.price_monthly}/month`);
      console.log(`     Tenants: ${plan.tenant_count}`);
      const features = JSON.parse(plan.features);
      console.log(`     Features: ${features.length} total`);
      console.log('');
    });

    console.log('✅ Plan features standardization complete!');

  } catch (error) {
    console.error('❌ Error fixing plan features:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixPlanFeatures();
