import { Pool } from 'pg';
import { randomUUID } from 'crypto';

export async function getInventory(db: Pool, tenantId: string, stationId?: string) {
  const stationFilter = stationId ? 'WHERE fi.station_id = $1' : '';
  const params = stationId ? [stationId] : [];
  
  const query = `
    SELECT 
      fi.id,
      fi.station_id,
      st.name as station_name,
      fi.fuel_type,
      fi.current_stock,
      fi.minimum_level,
      fi.last_updated,
      CASE 
        WHEN fi.current_stock <= fi.minimum_level THEN 'low'
        WHEN fi.current_stock <= fi.minimum_level * 1.5 THEN 'medium'
        ELSE 'good'
      END as stock_status
    FROM ${tenantId}.fuel_inventory fi
    JOIN ${tenantId}.stations st ON fi.station_id = st.id
    ${stationFilter}
    ORDER BY st.name, fi.fuel_type
  `;
  
  const result = await db.query(query, params);
  return result.rows.map(row => ({
    id: row.id,
    stationId: row.station_id,
    stationName: row.station_name,
    fuelType: row.fuel_type,
    currentStock: parseFloat(row.current_stock),
    minimumLevel: parseFloat(row.minimum_level),
    lastUpdated: row.last_updated,
    stockStatus: row.stock_status
  }));
}

export async function updateInventory(db: Pool, tenantId: string, stationId: string, fuelType: string, newStock: number) {
  const query = `
    UPDATE ${tenantId}.fuel_inventory 
    SET current_stock = $3, last_updated = NOW()
    WHERE station_id = $1 AND fuel_type = $2
  `;
  await db.query(query, [stationId, fuelType, newStock]);
  
  // Check if stock is low and create alert
  const checkQuery = `
    SELECT current_stock, minimum_level 
    FROM ${tenantId}.fuel_inventory 
    WHERE station_id = $1 AND fuel_type = $2
  `;
  const result = await db.query(checkQuery, [stationId, fuelType]);
  const { current_stock, minimum_level } = result.rows[0];
  
  if (current_stock <= minimum_level) {
    await createAlert(db, tenantId, stationId, 'low_inventory', 
      `Low ${fuelType} inventory at station. Current: ${current_stock}L, Minimum: ${minimum_level}L`, 'warning');
  }
}

export async function createAlert(db: Pool, tenantId: string, stationId: string, alertType: string, message: string, severity: string = 'info') {
  const query = `
    INSERT INTO ${tenantId}.alerts (id, tenant_id, station_id, alert_type, message, severity)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  await db.query(query, [randomUUID(), tenantId, stationId, alertType, message, severity]);
}

export async function getAlerts(db: Pool, tenantId: string, stationId?: string, unreadOnly: boolean = false) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  
  if (stationId) {
    conditions.push(`a.station_id = $${paramIndex++}`);
    params.push(stationId);
  }
  
  if (unreadOnly) {
    conditions.push(`a.is_read = false`);
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  const query = `
    SELECT 
      a.id,
      a.station_id,
      st.name as station_name,
      a.alert_type,
      a.message,
      a.severity,
      a.is_read,
      a.created_at
    FROM ${tenantId}.alerts a
    LEFT JOIN ${tenantId}.stations st ON a.station_id = st.id
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT 50
  `;
  
  const result = await db.query(query, params);
  return result.rows.map(row => ({
    id: row.id,
    stationId: row.station_id,
    stationName: row.station_name,
    alertType: row.alert_type,
    message: row.message,
    severity: row.severity,
    isRead: row.is_read,
    createdAt: row.created_at
  }));
}

export async function markAlertRead(db: Pool, tenantId: string, alertId: string): Promise<boolean> {
  const result = await db.query(
    `UPDATE ${tenantId}.alerts SET is_read = TRUE WHERE id = $1 RETURNING id`,
    [alertId]
  );
  return (result.rowCount ?? 0) > 0;
}