-- Database Performance Optimizations for FuelSync Backend
-- This file contains SQL optimizations to improve query performance

-- 1. Add missing indexes for frequently queried columns
-- Sales table optimizations (most critical for dashboard and reports performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_tenant_recorded_at
ON sales (tenant_id, recorded_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_station_recorded_at
ON sales (station_id, recorded_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_payment_method_tenant
ON sales (payment_method, tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_fuel_type_tenant
ON sales (fuel_type, tenant_id);

-- Report-specific optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_reports_composite
ON sales (tenant_id, recorded_at DESC, station_id, fuel_type)
INCLUDE (amount, volume, profit);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_date_range_reports
ON sales (tenant_id, recorded_at)
WHERE recorded_at >= CURRENT_DATE - INTERVAL '1 year';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_creditor_tenant 
ON sales (creditor_id, tenant_id) WHERE creditor_id IS NOT NULL;

-- Composite index for dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_dashboard_composite 
ON sales (tenant_id, recorded_at DESC, station_id, payment_method, fuel_type);

-- Station table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stations_tenant_status 
ON stations (tenant_id, status);

-- Pump table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pumps_station_status 
ON pumps (station_id, status);

-- Nozzle table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nozzles_pump_status 
ON nozzles (pump_id, status);

-- Reading table optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nozzle_readings_nozzle_recorded 
ON nozzle_readings (nozzle_id, recorded_at DESC);

-- User activity optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_tenant_created 
ON user_activity_logs (tenant_id, created_at DESC);

-- Alert optimizations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_tenant_read_created 
ON alerts (tenant_id, is_read, created_at DESC);

-- 2. Partitioning for large tables (sales table)
-- Create partitioned sales table for better performance with large datasets
CREATE TABLE IF NOT EXISTS sales_partitioned (
    LIKE sales INCLUDING ALL
) PARTITION BY RANGE (recorded_at);

-- Create monthly partitions for the current year
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..11 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE) + (i || ' months')::INTERVAL;
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'sales_y' || EXTRACT(YEAR FROM start_date) || 'm' || LPAD(EXTRACT(MONTH FROM start_date)::TEXT, 2, '0');
        
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF sales_partitioned 
                       FOR VALUES FROM (%L) TO (%L)', 
                       partition_name, start_date, end_date);
    END LOOP;
END $$;

-- 3. Materialized views for dashboard aggregations
-- Daily sales summary materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_sales_summary AS
SELECT 
    tenant_id,
    station_id,
    DATE(recorded_at) as sale_date,
    fuel_type,
    payment_method,
    SUM(amount) as total_amount,
    SUM(volume) as total_volume,
    COUNT(*) as transaction_count,
    AVG(amount) as avg_transaction_amount
FROM sales 
WHERE recorded_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY tenant_id, station_id, DATE(recorded_at), fuel_type, payment_method;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_sales_summary_unique 
ON mv_daily_sales_summary (tenant_id, station_id, sale_date, fuel_type, payment_method);

-- Monthly sales summary materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_sales_summary AS
SELECT 
    tenant_id,
    station_id,
    DATE_TRUNC('month', recorded_at) as sale_month,
    fuel_type,
    payment_method,
    SUM(amount) as total_amount,
    SUM(volume) as total_volume,
    COUNT(*) as transaction_count
FROM sales 
WHERE recorded_at >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY tenant_id, station_id, DATE_TRUNC('month', recorded_at), fuel_type, payment_method;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_sales_summary_unique 
ON mv_monthly_sales_summary (tenant_id, station_id, sale_month, fuel_type, payment_method);

-- Station metrics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_station_metrics AS
SELECT 
    s.tenant_id,
    s.id as station_id,
    s.name as station_name,
    COUNT(DISTINCT p.id) as total_pumps,
    COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_pumps,
    COUNT(DISTINCT n.id) as total_nozzles,
    COUNT(DISTINCT CASE WHEN n.status = 'active' THEN n.id END) as active_nozzles,
    COALESCE(sales_today.total_amount, 0) as today_sales,
    COALESCE(sales_today.transaction_count, 0) as today_transactions
FROM stations s
LEFT JOIN pumps p ON s.id = p.station_id
LEFT JOIN nozzles n ON p.id = n.pump_id
LEFT JOIN (
    SELECT 
        station_id,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
    FROM sales 
    WHERE DATE(recorded_at) = CURRENT_DATE
    GROUP BY station_id
) sales_today ON s.id = sales_today.station_id
GROUP BY s.tenant_id, s.id, s.name, sales_today.total_amount, sales_today.transaction_count;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_station_metrics_unique 
ON mv_station_metrics (tenant_id, station_id);

-- 4. Functions for refreshing materialized views
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_sales_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_station_metrics;
END;
$$ LANGUAGE plpgsql;

-- 5. Stored procedures for common dashboard queries
CREATE OR REPLACE FUNCTION get_sales_summary(
    p_tenant_id UUID,
    p_station_id UUID DEFAULT NULL,
    p_range TEXT DEFAULT 'monthly'
)
RETURNS TABLE(
    total_revenue DECIMAL,
    total_volume DECIMAL,
    sales_count BIGINT,
    period TEXT
) AS $$
DECLARE
    date_filter TEXT;
BEGIN
    CASE p_range
        WHEN 'daily' THEN
            date_filter := 'AND recorded_at >= CURRENT_DATE';
        WHEN 'weekly' THEN
            date_filter := 'AND recorded_at >= CURRENT_DATE - INTERVAL ''7 days''';
        WHEN 'monthly' THEN
            date_filter := 'AND recorded_at >= CURRENT_DATE - INTERVAL ''30 days''';
        WHEN 'yearly' THEN
            date_filter := 'AND recorded_at >= CURRENT_DATE - INTERVAL ''1 year''';
        ELSE
            date_filter := 'AND recorded_at >= CURRENT_DATE - INTERVAL ''30 days''';
    END CASE;

    RETURN QUERY EXECUTE format('
        SELECT
            COALESCE(SUM(s.amount), 0) as total_revenue,
            COALESCE(SUM(s.volume), 0) as total_volume,
            COUNT(s.id) as sales_count,
            %L as period
        FROM sales s
        WHERE s.tenant_id = %L %s %s',
        p_range,
        p_tenant_id,
        date_filter,
        CASE WHEN p_station_id IS NOT NULL THEN format('AND s.station_id = %L', p_station_id) ELSE '' END
    );
END;
$$ LANGUAGE plpgsql;

-- 6. Query optimization hints and statistics
-- Update table statistics for better query planning
ANALYZE sales;
ANALYZE stations;
ANALYZE pumps;
ANALYZE nozzles;
ANALYZE nozzle_readings;

-- 7. Connection pooling and caching recommendations
-- These should be implemented in the application layer:
/*
Recommended optimizations for application layer:

1. Connection Pooling:
   - Use pgbouncer or similar connection pooler
   - Set max connections based on server capacity
   - Use transaction-level pooling for better performance

2. Query Caching:
   - Implement Redis for caching frequent dashboard queries
   - Cache results for 5-15 minutes depending on data freshness requirements
   - Use cache invalidation on data updates

3. Read Replicas:
   - Set up read replicas for dashboard and reporting queries
   - Route write operations to master, reads to replicas
   - Implement proper failover mechanisms

4. Background Jobs:
   - Refresh materialized views every 15-30 minutes
   - Run analytics calculations in background
   - Use job queues for heavy operations
*/

-- 8. Monitoring and maintenance
-- Create function to monitor slow queries
CREATE OR REPLACE FUNCTION get_slow_queries()
RETURNS TABLE(
    query TEXT,
    calls BIGINT,
    total_time DOUBLE PRECISION,
    mean_time DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pg_stat_statements.query,
        pg_stat_statements.calls,
        pg_stat_statements.total_exec_time,
        pg_stat_statements.mean_exec_time
    FROM pg_stat_statements
    WHERE pg_stat_statements.mean_exec_time > 100 -- queries taking more than 100ms
    ORDER BY pg_stat_statements.mean_exec_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Create maintenance function
CREATE OR REPLACE FUNCTION maintenance_tasks()
RETURNS void AS $$
BEGIN
    -- Update statistics
    ANALYZE;
    
    -- Refresh materialized views
    PERFORM refresh_dashboard_views();
    
    -- Clean up old data (optional - adjust retention as needed)
    DELETE FROM user_activity_logs WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
    DELETE FROM audit_logs WHERE created_at < CURRENT_DATE - INTERVAL '1 year';
    
    -- Vacuum and reindex if needed
    VACUUM ANALYZE sales;
    VACUUM ANALYZE nozzle_readings;
END;
$$ LANGUAGE plpgsql;

-- Schedule maintenance (requires pg_cron extension)
-- SELECT cron.schedule('maintenance-job', '0 2 * * *', 'SELECT maintenance_tasks();');

-- 9. Performance monitoring views
CREATE OR REPLACE VIEW v_table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

CREATE OR REPLACE VIEW v_index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 10. Cleanup old partitions (for future use)
CREATE OR REPLACE FUNCTION cleanup_old_partitions()
RETURNS void AS $$
DECLARE
    partition_name TEXT;
    cutoff_date DATE;
BEGIN
    cutoff_date := CURRENT_DATE - INTERVAL '2 years';
    
    FOR partition_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'sales_y%m%' 
        AND schemaname = 'public'
    LOOP
        -- Extract date from partition name and check if it's old enough to drop
        -- This is a simplified version - implement proper date parsing
        IF partition_name < 'sales_y' || EXTRACT(YEAR FROM cutoff_date) || 'm' || LPAD(EXTRACT(MONTH FROM cutoff_date)::TEXT, 2, '0') THEN
            EXECUTE format('DROP TABLE IF EXISTS %I', partition_name);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
