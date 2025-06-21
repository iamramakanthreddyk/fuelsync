import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { UserRole } from '../constants/auth';
import { beforeCreateUser } from '../middleware/planEnforcement';

export async function createUser(
  db: Pool,
  tenantId: string,
  email: string,
  password: string,
  role: UserRole,
  stationIds: string[] = []
): Promise<string> {
  const client = await db.connect();
  try {
    await beforeCreateUser(client, tenantId);
    const hash = await bcrypt.hash(password, 10);
    const res = await client.query(
      `INSERT INTO ${tenantId}.users (tenant_id, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id`,
      [tenantId, email, hash, role]
    );
    const userId = res.rows[0].id;
    for (const stationId of stationIds) {
      await client.query(
        `INSERT INTO ${tenantId}.user_stations (user_id, station_id) VALUES ($1,$2)`,
        [userId, stationId]
      );
    }
    return userId;
  } finally {
    client.release();
  }
}

export async function listUsers(db: Pool, tenantId: string) {
  const res = await db.query(
    `SELECT id, email, role, created_at FROM ${tenantId}.users ORDER BY email`
  );
  return res.rows;
}
