CREATE INDEX IF NOT EXISTS idx_sales_nozzle_id ON sales(nozzle_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_user_stations_user_id ON user_stations(user_id);
CREATE INDEX IF NOT EXISTS idx_pumps_station_id ON pumps(station_id);
