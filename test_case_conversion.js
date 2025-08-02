/**
 * @file test_case_conversion.js
 * @description Test snake_case to camelCase conversion in API responses
 */

const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000/api/v1';

class CaseConversionTester {
  constructor() {
    this.testResults = { passed: 0, failed: 0, tests: [] };
    this.db = null;
  }

  async setup() {
    console.log('🔧 SETTING UP CASE CONVERSION TESTS');
    console.log('===================================\n');

    this.db = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });

    console.log('✅ Database connection established');
  }

  recordTest(name, passed, details = '') {
    this.testResults.tests.push({ name, passed, details });
    if (passed) {
      this.testResults.passed++;
      console.log(`✅ ${name}`);
    } else {
      this.testResults.failed++;
      console.log(`❌ ${name} ${details ? `(${details})` : ''}`);
    }
  }

  /**
   * Check if an object has snake_case keys
   */
  hasSnakeCaseKeys(obj) {
    if (!obj || typeof obj !== 'object') return false;
    
    if (Array.isArray(obj)) {
      return obj.some(item => this.hasSnakeCaseKeys(item));
    }
    
    for (const [key, value] of Object.entries(obj)) {
      if (key.includes('_')) {
        return true;
      }
      if (typeof value === 'object' && value !== null) {
        if (this.hasSnakeCaseKeys(value)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Check if an object has camelCase keys
   */
  hasCamelCaseKeys(obj) {
    if (!obj || typeof obj !== 'object') return false;
    
    if (Array.isArray(obj)) {
      return obj.some(item => this.hasCamelCaseKeys(item));
    }
    
    for (const [key, value] of Object.entries(obj)) {
      if (/[a-z][A-Z]/.test(key)) {
        return true;
      }
      if (typeof value === 'object' && value !== null) {
        if (this.hasCamelCaseKeys(value)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Get snake_case keys from an object
   */
  getSnakeCaseKeys(obj, path = '') {
    const snakeKeys = [];
    
    if (!obj || typeof obj !== 'object') return snakeKeys;
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        snakeKeys.push(...this.getSnakeCaseKeys(item, `${path}[${index}]`));
      });
      return snakeKeys;
    }
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (key.includes('_')) {
        snakeKeys.push(currentPath);
      }
      
      if (typeof value === 'object' && value !== null) {
        snakeKeys.push(...this.getSnakeCaseKeys(value, currentPath));
      }
    }
    
    return snakeKeys;
  }

  async testDatabaseDirectQuery() {
    console.log('\n🔍 TESTING DIRECT DATABASE QUERIES');
    console.log('===================================');

    try {
      // Test a direct database query to see raw results
      const result = await this.db.query(`
        SELECT id, name, created_at, updated_at 
        FROM public.tenants 
        LIMIT 1
      `);

      if (result.rows.length > 0) {
        const rawRow = result.rows[0];
        console.log('📊 Raw database result:', rawRow);
        
        const hasSnakeCase = this.hasSnakeCaseKeys(rawRow);
        this.recordTest('Database returns snake_case (expected)', hasSnakeCase, 
          hasSnakeCase ? 'Good - database uses snake_case' : 'Database should use snake_case');
        
        // Show the snake_case keys
        const snakeKeys = this.getSnakeCaseKeys(rawRow);
        if (snakeKeys.length > 0) {
          console.log(`   Snake case keys found: ${snakeKeys.join(', ')}`);
        }
      } else {
        this.recordTest('Database query test', false, 'No data found');
      }
    } catch (error) {
      this.recordTest('Database query test', false, error.message);
    }
  }

  async testApiEndpoint(endpoint, description) {
    try {
      console.log(`\n🌐 Testing API endpoint: ${endpoint}`);
      
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        timeout: 10000,
        validateStatus: () => true // Accept any status code
      });

      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200 && response.data) {
        const hasSnakeCase = this.hasSnakeCaseKeys(response.data);
        const hasCamelCase = this.hasCamelCaseKeys(response.data);
        
        console.log('   Response structure:', {
          hasSnakeCase,
          hasCamelCase,
          dataType: typeof response.data,
          isArray: Array.isArray(response.data),
          keys: Object.keys(response.data || {}).slice(0, 10) // Show first 10 keys
        });

        // Test that response is properly converted to camelCase
        this.recordTest(`${description} - No snake_case in response`, !hasSnakeCase,
          hasSnakeCase ? `Snake case keys: ${this.getSnakeCaseKeys(response.data).slice(0, 5).join(', ')}` : '');
        
        this.recordTest(`${description} - Has camelCase keys`, hasCamelCase,
          !hasCamelCase ? 'No camelCase keys found' : '');

        // Log sample data structure
        if (response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
          console.log('   Sample data item keys:', Object.keys(response.data.data[0]));
        } else if (response.data.data && typeof response.data.data === 'object') {
          console.log('   Data object keys:', Object.keys(response.data.data));
        }

      } else {
        this.recordTest(`${description} - API Response`, false, 
          `Status: ${response.status}, Data: ${response.data ? 'present' : 'missing'}`);
      }
    } catch (error) {
      this.recordTest(`${description} - API Request`, false, error.message);
    }
  }

  async testPublicEndpoints() {
    console.log('\n🌍 TESTING PUBLIC ENDPOINTS');
    console.log('============================');

    const publicEndpoints = [
      { path: '/health', description: 'Health Check' },
      { path: '/test', description: 'Test Endpoint' }
    ];

    for (const endpoint of publicEndpoints) {
      await this.testApiEndpoint(endpoint.path, endpoint.description);
    }
  }

  async testAuthenticatedEndpoints() {
    console.log('\n🔐 TESTING AUTHENTICATED ENDPOINTS (without auth - expect 401)');
    console.log('==============================================================');

    const authEndpoints = [
      { path: '/users', description: 'Users List' },
      { path: '/stations', description: 'Stations List' },
      { path: '/dashboard', description: 'Dashboard' }
    ];

    for (const endpoint of authEndpoints) {
      await this.testApiEndpoint(endpoint.path, endpoint.description);
    }
  }

  async testCaseConversionUtilities() {
    console.log('\n🔧 TESTING CASE CONVERSION UTILITIES');
    console.log('====================================');

    // Implement basic conversion functions for testing
    function snakeToCamel(str) {
      return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    function convertKeysToCamelCase(obj) {
      if (obj === null || obj === undefined || typeof obj !== 'object') {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(item => convertKeysToCamelCase(item));
      }

      const camelCaseObj = {};
      Object.keys(obj).forEach(key => {
        const camelKey = snakeToCamel(key);
        const value = obj[key];

        if (value !== null && typeof value === 'object') {
          camelCaseObj[camelKey] = convertKeysToCamelCase(value);
        } else {
          camelCaseObj[camelKey] = value;
        }
      });

      return camelCaseObj;
    }

    // Test snake_case to camelCase
    const snakeObject = {
      user_id: '123',
      created_at: '2024-01-01',
      station_name: 'Test Station',
      fuel_type: 'petrol',
      nested_object: {
        pump_id: '456',
        nozzle_number: 1
      },
      array_data: [
        { reading_id: '789', reading_value: 100.5 }
      ]
    };

    const camelObject = convertKeysToCamelCase(snakeObject);

    console.log('📊 Conversion test:');
    console.log('   Input (snake_case):', Object.keys(snakeObject));
    console.log('   Output (camelCase):', Object.keys(camelObject));

    const hasSnakeAfterConversion = this.hasSnakeCaseKeys(camelObject);
    const hasCamelAfterConversion = this.hasCamelCaseKeys(camelObject);

    this.recordTest('Utility converts snake_case to camelCase', !hasSnakeAfterConversion && hasCamelAfterConversion);
    this.recordTest('Utility handles nested objects',
      camelObject.nestedObject && camelObject.nestedObject.pumpId === '456');
    this.recordTest('Utility handles arrays',
      camelObject.arrayData && camelObject.arrayData[0].readingId === '789');
  }

  async runAllTests() {
    await this.setup();
    
    await this.testDatabaseDirectQuery();
    await this.testCaseConversionUtilities();
    await this.testPublicEndpoints();
    await this.testAuthenticatedEndpoints();
    
    this.printResults();
  }

  printResults() {
    console.log('\n📊 CASE CONVERSION TEST RESULTS');
    console.log('================================');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Total: ${this.testResults.passed + this.testResults.failed}`);
    
    const successRate = ((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1);
    console.log(`📊 Success Rate: ${successRate}%`);

    if (this.testResults.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.tests
        .filter(test => !test.passed)
        .forEach(test => {
          const detailsText = test.details ? ` (${test.details})` : '';
          console.log(`   - ${test.name}${detailsText}`);
        });
    }

    console.log('\n🎉 CASE CONVERSION TESTING COMPLETE!');
    
    if (this.testResults.failed === 0) {
      console.log('✅ All API responses are properly converted to camelCase!');
    } else {
      console.log('⚠️  Some endpoints still return snake_case - check the middleware setup.');
    }
  }

  async cleanup() {
    if (this.db) {
      await this.db.end();
    }
  }
}

// Run the tests
async function runCaseConversionTests() {
  const tester = new CaseConversionTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    await tester.cleanup();
  }
}

// Export for use in other test files
module.exports = { CaseConversionTester, runCaseConversionTests };

// Run if called directly
if (require.main === module) {
  runCaseConversionTests();
}
