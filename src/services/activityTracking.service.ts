/**
 * @file services/activityTracking.service.ts
 * @description Comprehensive user activity tracking for SuperAdmin monitoring
 */
import { Pool } from 'pg';

export interface ActivityLog {
  id: string;
  tenantId: string;
  tenantName: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  resource: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface ActivitySummary {
  tenantId: string;
  tenantName: string;
  totalActivities: number;
  todayActivities: number;
  weekActivities: number;
  monthActivities: number;
  topActions: Array<{ action: string; count: number }>;
  activeUsers: number;
  lastActivity: Date;
}

/**
 * Log user activity
 */
export async function logActivity(
  db: Pool,
  tenantId: string,
  userId: string,
  action: string,
  resource: string,
  details: any = {},
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await db.query(`
      INSERT INTO public.user_activity_logs (
        tenant_id, user_id, action, resource, details, 
        ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [tenantId, userId, action, resource, JSON.stringify(details), ipAddress, userAgent]);
  } catch (error) {
    console.error('[ACTIVITY] Error logging activity:', error);
  }
}

/**
 * Get recent activities across all tenants (SuperAdmin view)
 */
export async function getRecentActivities(
  db: Pool,
  limit: number = 100,
  tenantId?: string
): Promise<ActivityLog[]> {
  try {
    const whereClause = tenantId ? 'WHERE a.tenant_id = $2' : '';
    const params = tenantId ? [limit, tenantId] : [limit];
    
    const query = `
      SELECT 
        a.id,
        a.tenant_id,
        t.name as tenant_name,
        a.user_id,
        u.name as user_name,
        u.role as user_role,
        a.action,
        a.resource,
        a.details,
        a.ip_address,
        a.user_agent,
        a.created_at
      FROM public.user_activity_logs a
      LEFT JOIN public.tenants t ON a.tenant_id = t.id
      LEFT JOIN public.users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $1
    `;
    
    const result = await db.query(query, params);
    
    return result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      userId: row.user_id,
      userName: row.user_name,
      userRole: row.user_role,
      action: row.action,
      resource: row.resource,
      details: row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at
    }));
  } catch (error) {
    console.error('[ACTIVITY] Error getting recent activities:', error);
    return [];
  }
}

/**
 * Get activity summary for all tenants
 */
export async function getActivitySummary(db: Pool): Promise<ActivitySummary[]> {
  try {
    const query = `
      SELECT 
        t.id as tenant_id,
        t.name as tenant_name,
        COUNT(a.id) as total_activities,
        COUNT(a.id) FILTER (WHERE DATE(a.created_at) = CURRENT_DATE) as today_activities,
        COUNT(a.id) FILTER (WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days') as week_activities,
        COUNT(a.id) FILTER (WHERE a.created_at >= CURRENT_DATE - INTERVAL '30 days') as month_activities,
        COUNT(DISTINCT a.user_id) FILTER (WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days') as active_users,
        MAX(a.created_at) as last_activity
      FROM public.tenants t
      LEFT JOIN public.user_activity_logs a ON t.id = a.tenant_id
      WHERE t.status = 'active'
      GROUP BY t.id, t.name
      ORDER BY total_activities DESC
    `;
    
    const result = await db.query(query);
    
    // Get top actions for each tenant
    const summaries: ActivitySummary[] = [];
    
    for (const row of result.rows) {
      const topActionsQuery = `
        SELECT action, COUNT(*) as count
        FROM public.user_activity_logs
        WHERE tenant_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY action
        ORDER BY count DESC
        LIMIT 5
      `;
      
      const topActionsResult = await db.query(topActionsQuery, [row.tenant_id]);
      
      summaries.push({
        tenantId: row.tenant_id,
        tenantName: row.tenant_name,
        totalActivities: parseInt(row.total_activities),
        todayActivities: parseInt(row.today_activities),
        weekActivities: parseInt(row.week_activities),
        monthActivities: parseInt(row.month_activities),
        topActions: topActionsResult.rows.map(action => ({
          action: action.action,
          count: parseInt(action.count)
        })),
        activeUsers: parseInt(row.active_users),
        lastActivity: row.last_activity
      });
    }
    
    return summaries;
  } catch (error) {
    console.error('[ACTIVITY] Error getting activity summary:', error);
    return [];
  }
}

/**
 * Get user activity for a specific user
 */
export async function getUserActivity(
  db: Pool,
  userId: string,
  limit: number = 50
): Promise<ActivityLog[]> {
  try {
    const query = `
      SELECT 
        a.id,
        a.tenant_id,
        t.name as tenant_name,
        a.user_id,
        u.name as user_name,
        u.role as user_role,
        a.action,
        a.resource,
        a.details,
        a.ip_address,
        a.user_agent,
        a.created_at
      FROM public.user_activity_logs a
      LEFT JOIN public.tenants t ON a.tenant_id = t.id
      LEFT JOIN public.users u ON a.user_id = u.id
      WHERE a.user_id = $1
      ORDER BY a.created_at DESC
      LIMIT $2
    `;
    
    const result = await db.query(query, [userId, limit]);
    
    return result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      userId: row.user_id,
      userName: row.user_name,
      userRole: row.user_role,
      action: row.action,
      resource: row.resource,
      details: row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at
    }));
  } catch (error) {
    console.error('[ACTIVITY] Error getting user activity:', error);
    return [];
  }
}

/**
 * Get suspicious activities (for security monitoring)
 */
export async function getSuspiciousActivities(db: Pool): Promise<ActivityLog[]> {
  try {
    const query = `
      SELECT 
        a.id,
        a.tenant_id,
        t.name as tenant_name,
        a.user_id,
        u.name as user_name,
        u.role as user_role,
        a.action,
        a.resource,
        a.details,
        a.ip_address,
        a.user_agent,
        a.created_at
      FROM public.user_activity_logs a
      LEFT JOIN public.tenants t ON a.tenant_id = t.id
      LEFT JOIN public.users u ON a.user_id = u.id
      WHERE 
        a.action IN ('LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'PLAN_LIMIT_EXCEEDED', 'SUSPICIOUS_ACTIVITY')
        OR a.created_at >= CURRENT_DATE - INTERVAL '24 hours'
        AND (
          -- Multiple failed logins
          (SELECT COUNT(*) FROM public.user_activity_logs 
           WHERE user_id = a.user_id AND action = 'LOGIN_FAILED' 
           AND created_at >= CURRENT_DATE - INTERVAL '1 hour') > 5
          -- Unusual activity patterns
          OR a.action LIKE '%DELETE%'
          OR a.action LIKE '%ADMIN%'
        )
      ORDER BY a.created_at DESC
      LIMIT 100
    `;
    
    const result = await db.query(query);
    
    return result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      userId: row.user_id,
      userName: row.user_name,
      userRole: row.user_role,
      action: row.action,
      resource: row.resource,
      details: row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at
    }));
  } catch (error) {
    console.error('[ACTIVITY] Error getting suspicious activities:', error);
    return [];
  }
}

/**
 * Clean up old activity logs (keep last 90 days)
 */
export async function cleanupOldActivities(db: Pool): Promise<number> {
  try {
    const result = await db.query(`
      DELETE FROM public.user_activity_logs 
      WHERE created_at < CURRENT_DATE - INTERVAL '90 days'
    `);
    
    return result.rowCount || 0;
  } catch (error) {
    console.error('[ACTIVITY] Error cleaning up old activities:', error);
    return 0;
  }
}
