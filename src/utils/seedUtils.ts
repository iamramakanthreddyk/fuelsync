import pool from './db';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

interface SeedConfig {
  publicSchema?: {
    plans?: Array<{ name: string; config: any }>;
    adminUsers?: Array<{ email: string; password: string; role: string }>;
    tenants?: Array<{ name: string; schemaName: string; planName: string }>;
  };
  tenantSchemas?: Array<{
    schemaName: string;
    tenantName: string;
    planName: string;
    users?: Array<{ email: string; password: string; role: string }>;
    stations?: Array<{
      name: string;
      pumps?: Array<{
        name: string;
        nozzles?: Array<{ number: number; fuelType: string }>;
      }>;
      fuelPrices?: Array<{ fuelType: string; price: number }>;
    }>;
    creditors?: Array<{ partyName: string; creditLimit?: number }>;
  }>;
}

export async function seedDatabase(config: SeedConfig): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Seed public schema
    if (config.publicSchema) {
      await seedPublicSchema(client, config.publicSchema);
    }

    // Seed tenant schemas
    if (config.tenantSchemas) {
      for (const tenantConfig of config.tenantSchemas) {
        await seedTenantSchema(client, tenantConfig);
      }
    }

    await client.query('COMMIT');
    console.log('Database seeding completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function seedPublicSchema(client: any, config: any): Promise<void> {
  // Seed plans
  if (config.plans) {
    for (const plan of config.plans) {
      const { rows } = await client.query(
        `SELECT id FROM public.plans WHERE name = $1`,
        [plan.name]
      );
      if (rows.length === 0) {
        await client.query(
          `INSERT INTO public.plans (id, name, config_json) VALUES ($1, $2, $3)`,
          [randomUUID(), plan.name, JSON.stringify(plan.config)]
        );
      }
    }
  }

  // Seed admin users
  if (config.adminUsers) {
    for (const user of config.adminUsers) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await client.query(
        `INSERT INTO public.admin_users (id, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        [randomUUID(), user.email, passwordHash, user.role]
      );
    }
  }

  // Seed tenants
  if (config.tenants) {
    for (const tenant of config.tenants) {
      const { rows: planRows } = await client.query(
        `SELECT id FROM public.plans WHERE name = $1 LIMIT 1`,
        [tenant.planName]
      );
      const planId = planRows[0]?.id;
      
      if (planId) {
        const { rows } = await client.query(
          `SELECT id FROM public.tenants WHERE schema_name = $1`,
          [tenant.schemaName]
        );
        if (rows.length === 0) {
          await client.query(
            `INSERT INTO public.tenants (id, name, schema_name, plan_id) VALUES ($1, $2, $3, $4)`,
            [randomUUID(), tenant.name, tenant.schemaName, planId]
          );
        }
      }
    }
  }
}

async function seedTenantSchema(client: any, config: any): Promise<void> {
  const { schemaName, tenantName, planName } = config;

  // Get plan and tenant IDs
  const { rows: planRows } = await client.query(
    `SELECT id FROM public.plans WHERE name = $1 LIMIT 1`,
    [planName]
  );
  const planId = planRows[0]?.id;

  if (!planId) {
    throw new Error(`Plan '${planName}' not found`);
  }

  // Create tenant if not exists
  let { rows: tenantRows } = await client.query(
    `SELECT id FROM public.tenants WHERE schema_name = $1`,
    [schemaName]
  );
  if (tenantRows.length === 0) {
    tenantRows = (await client.query(
      `INSERT INTO public.tenants (id, name, schema_name, plan_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [randomUUID(), tenantName, schemaName, planId]
    )).rows;
  }
  const tenantId = tenantRows[0].id;

  // Apply tenant schema template
  const templatePath = path.join(process.cwd(), 'migrations/tenant_schema_template.sql');
  const templateSql = fs.readFileSync(templatePath, 'utf8').replace(/{{schema_name}}/g, schemaName);
  await client.query(templateSql);

  // Seed users
  if (config.users) {
    for (const user of config.users) {
      const { rows } = await client.query(
        `SELECT id FROM ${schemaName}.users WHERE email = $1`,
        [user.email]
      );
      if (rows.length === 0) {
        const passwordHash = await bcrypt.hash(user.password, 10);
        await client.query(
          `INSERT INTO ${schemaName}.users (id, tenant_id, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)`,
          [randomUUID(), tenantId, user.email, passwordHash, user.role]
        );
      }
    }
  }

  // Seed stations and related entities
  if (config.stations) {
    for (const station of config.stations) {
      const stationId = await createStation(client, schemaName, tenantId, station.name);
      
      // Seed fuel prices
      if (station.fuelPrices) {
        for (const price of station.fuelPrices) {
          const { rows } = await client.query(
            `SELECT id FROM ${schemaName}.fuel_prices WHERE station_id = $1 AND fuel_type = $2`,
            [stationId, price.fuelType]
          );
          if (rows.length === 0) {
            await client.query(
              `INSERT INTO ${schemaName}.fuel_prices (id, tenant_id, station_id, fuel_type, price, effective_from) VALUES ($1, $2, $3, $4, $5, NOW())`,
              [randomUUID(), tenantId, stationId, price.fuelType, price.price]
            );
          }
        }
      }

      // Seed pumps and nozzles
      if (station.pumps) {
        for (const pump of station.pumps) {
          const pumpId = await createPump(client, schemaName, tenantId, stationId, pump.name);
          
          if (pump.nozzles) {
            for (const nozzle of pump.nozzles) {
              const { rows } = await client.query(
                `SELECT id FROM ${schemaName}.nozzles WHERE pump_id = $1 AND nozzle_number = $2`,
                [pumpId, nozzle.number]
              );
              if (rows.length === 0) {
                await client.query(
                  `INSERT INTO ${schemaName}.nozzles (id, tenant_id, pump_id, nozzle_number, fuel_type) VALUES ($1, $2, $3, $4, $5)`,
                  [randomUUID(), tenantId, pumpId, nozzle.number, nozzle.fuelType]
                );
              }
            }
          }
        }
      }
    }
  }

  // Seed creditors
  if (config.creditors) {
    for (const creditor of config.creditors) {
      const { rows } = await client.query(
        `SELECT id FROM ${schemaName}.creditors WHERE party_name = $1`,
        [creditor.partyName]
      );
      if (rows.length === 0) {
        await client.query(
          `INSERT INTO ${schemaName}.creditors (id, tenant_id, party_name, credit_limit) VALUES ($1, $2, $3, $4)`,
          [randomUUID(), tenantId, creditor.partyName, creditor.creditLimit || 0]
        );
      }
    }
  }
}

async function createStation(client: any, schema: string, tenantId: string, name: string): Promise<string> {
  const { rows } = await client.query(
    `SELECT id FROM ${schema}.stations WHERE tenant_id = $1 AND name = $2`,
    [tenantId, name]
  );
  if (rows.length > 0) {
    return rows[0].id;
  }
  const { rows: newRows } = await client.query(
    `INSERT INTO ${schema}.stations (id, tenant_id, name) VALUES ($1, $2, $3) RETURNING id`,
    [randomUUID(), tenantId, name]
  );
  return newRows[0].id;
}

async function createPump(client: any, schema: string, tenantId: string, stationId: string, name: string): Promise<string> {
  const { rows } = await client.query(
    `SELECT id FROM ${schema}.pumps WHERE station_id = $1 AND name = $2`,
    [stationId, name]
  );
  if (rows.length > 0) {
    return rows[0].id;
  }
  const { rows: newRows } = await client.query(
    `INSERT INTO ${schema}.pumps (id, tenant_id, station_id, name) VALUES ($1, $2, $3, $4) RETURNING id`,
    [randomUUID(), tenantId, stationId, name]
  );
  return newRows[0].id;
}

// Predefined configurations
export const DEFAULT_SEED_CONFIG: SeedConfig = {
  publicSchema: {
    plans: [
      { name: 'basic', config: {} },
      { name: 'pro', config: {} }
    ],
    adminUsers: [
      { email: 'admin@fuelsync.dev', password: 'password', role: 'superadmin' }
    ]
  }
};

export const DEMO_TENANT_CONFIG: SeedConfig = {
  tenantSchemas: [{
    schemaName: 'demo_tenant_001',
    tenantName: 'Demo Fuel Company',
    planName: 'basic',
    users: [
      { email: 'owner@demo.com', password: 'password', role: 'owner' },
      { email: 'manager@demo.com', password: 'password', role: 'manager' },
      { email: 'attendant@demo.com', password: 'password', role: 'attendant' }
    ],
    stations: [{
      name: 'Main Station',
      fuelPrices: [
        { fuelType: 'petrol', price: 100 },
        { fuelType: 'diesel', price: 95 }
      ],
      pumps: [{
        name: 'Pump 1',
        nozzles: [
          { number: 1, fuelType: 'petrol' },
          { number: 2, fuelType: 'diesel' }
        ]
      }]
    }],
    creditors: [
      { partyName: 'Demo Creditor', creditLimit: 10000 }
    ]
  }]
};