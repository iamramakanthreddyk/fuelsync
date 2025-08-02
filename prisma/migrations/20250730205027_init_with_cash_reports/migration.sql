-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "max_stations" INTEGER NOT NULL DEFAULT 5,
    "max_pumps_per_station" INTEGER NOT NULL DEFAULT 10,
    "max_nozzles_per_pump" INTEGER NOT NULL DEFAULT 4,
    "price_monthly" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "price_yearly" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "features" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'superadmin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_activity_logs" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pumps" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "station_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serial_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pumps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nozzles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "pump_id" TEXT NOT NULL,
    "nozzle_number" INTEGER NOT NULL,
    "fuel_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nozzles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_prices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "station_id" TEXT NOT NULL,
    "fuel_type" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "cost_price" DECIMAL(65,30) DEFAULT 0,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creditors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "station_id" TEXT,
    "party_name" TEXT NOT NULL,
    "contact_number" TEXT,
    "address" TEXT,
    "credit_limit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creditors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nozzle_id" TEXT NOT NULL,
    "reading_id" TEXT,
    "station_id" TEXT NOT NULL,
    "volume" DECIMAL(65,30) NOT NULL,
    "fuel_type" TEXT NOT NULL,
    "fuel_price" DECIMAL(65,30) NOT NULL,
    "cost_price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "amount" DECIMAL(65,30) NOT NULL,
    "profit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "payment_method" TEXT NOT NULL,
    "creditor_id" TEXT,
    "created_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'posted',
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stations" (
    "user_id" TEXT NOT NULL,
    "station_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_stations_pkey" PRIMARY KEY ("user_id","station_id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "tenant_id" TEXT NOT NULL,
    "receipt_template" TEXT,
    "fuel_rounding" TEXT,
    "branding_logo_url" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "tenant_settings_kv" (
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_settings_kv_pkey" PRIMARY KEY ("tenant_id","key")
);

-- CreateTable
CREATE TABLE "fuel_inventory" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "station_id" TEXT NOT NULL,
    "fuel_type" TEXT NOT NULL,
    "current_stock" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "minimum_level" DECIMAL(65,30) NOT NULL DEFAULT 1000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "station_id" TEXT,
    "alert_type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_deliveries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "station_id" TEXT NOT NULL,
    "fuel_type" TEXT NOT NULL,
    "volume" DECIMAL(65,30) NOT NULL,
    "delivered_by" TEXT,
    "delivery_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nozzle_readings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nozzle_id" TEXT NOT NULL,
    "reading" DECIMAL(65,30) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "payment_method" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nozzle_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "creditor_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "payment_method" TEXT,
    "reference_number" TEXT,
    "notes" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "day_reconciliations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "station_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_sales" DECIMAL(65,30) DEFAULT 0,
    "cash_total" DECIMAL(65,30) DEFAULT 0,
    "card_total" DECIMAL(65,30) DEFAULT 0,
    "upi_total" DECIMAL(65,30) DEFAULT 0,
    "credit_total" DECIMAL(65,30) DEFAULT 0,
    "opening_reading" DECIMAL(65,30) DEFAULT 0,
    "closing_reading" DECIMAL(65,30) DEFAULT 0,
    "variance" DECIMAL(65,30) DEFAULT 0,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "day_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_reports" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "station_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "shift" TEXT NOT NULL DEFAULT 'day',
    "cash_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "card_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "upi_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "credit_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_schedules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "station_id" TEXT,
    "type" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "next_run" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activity_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "user_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "event" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_issues" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "stations_tenant_id_idx" ON "stations"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "stations_tenant_id_name_key" ON "stations"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "pumps_tenant_id_idx" ON "pumps"("tenant_id");

-- CreateIndex
CREATE INDEX "pumps_station_id_idx" ON "pumps"("station_id");

-- CreateIndex
CREATE UNIQUE INDEX "pumps_tenant_id_station_id_name_key" ON "pumps"("tenant_id", "station_id", "name");

-- CreateIndex
CREATE INDEX "nozzles_tenant_id_idx" ON "nozzles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "nozzles_tenant_id_pump_id_nozzle_number_key" ON "nozzles"("tenant_id", "pump_id", "nozzle_number");

-- CreateIndex
CREATE INDEX "fuel_prices_tenant_id_idx" ON "fuel_prices"("tenant_id");

-- CreateIndex
CREATE INDEX "fuel_prices_station_id_idx" ON "fuel_prices"("station_id");

-- CreateIndex
CREATE INDEX "creditors_tenant_id_idx" ON "creditors"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_tenant_id_idx" ON "sales"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_nozzle_id_idx" ON "sales"("nozzle_id");

-- CreateIndex
CREATE INDEX "sales_created_at_idx" ON "sales"("created_at");

-- CreateIndex
CREATE INDEX "user_stations_user_id_idx" ON "user_stations"("user_id");

-- CreateIndex
CREATE INDEX "tenant_settings_kv_tenant_id_idx" ON "tenant_settings_kv"("tenant_id");

-- CreateIndex
CREATE INDEX "fuel_inventory_tenant_id_idx" ON "fuel_inventory"("tenant_id");

-- CreateIndex
CREATE INDEX "alerts_tenant_id_idx" ON "alerts"("tenant_id");

-- CreateIndex
CREATE INDEX "fuel_deliveries_tenant_id_idx" ON "fuel_deliveries"("tenant_id");

-- CreateIndex
CREATE INDEX "nozzle_readings_tenant_id_idx" ON "nozzle_readings"("tenant_id");

-- CreateIndex
CREATE INDEX "credit_payments_tenant_id_idx" ON "credit_payments"("tenant_id");

-- CreateIndex
CREATE INDEX "credit_payments_creditor_id_idx" ON "credit_payments"("creditor_id");

-- CreateIndex
CREATE INDEX "day_reconciliations_tenant_id_idx" ON "day_reconciliations"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "day_reconciliations_tenant_id_station_id_date_key" ON "day_reconciliations"("tenant_id", "station_id", "date");

-- CreateIndex
CREATE INDEX "cash_reports_tenant_id_idx" ON "cash_reports"("tenant_id");

-- CreateIndex
CREATE INDEX "cash_reports_station_id_idx" ON "cash_reports"("station_id");

-- CreateIndex
CREATE INDEX "cash_reports_date_idx" ON "cash_reports"("date");

-- CreateIndex
CREATE UNIQUE INDEX "cash_reports_tenant_id_station_id_user_id_date_shift_key" ON "cash_reports"("tenant_id", "station_id", "user_id", "date", "shift");

-- CreateIndex
CREATE INDEX "report_schedules_tenant_id_idx" ON "report_schedules"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "user_activity_logs_tenant_id_idx" ON "user_activity_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "validation_issues_tenant_id_idx" ON "validation_issues"("tenant_id");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stations" ADD CONSTRAINT "stations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pumps" ADD CONSTRAINT "pumps_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nozzles" ADD CONSTRAINT "nozzles_pump_id_fkey" FOREIGN KEY ("pump_id") REFERENCES "pumps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_prices" ADD CONSTRAINT "fuel_prices_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creditors" ADD CONSTRAINT "creditors_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_nozzle_id_fkey" FOREIGN KEY ("nozzle_id") REFERENCES "nozzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_creditor_id_fkey" FOREIGN KEY ("creditor_id") REFERENCES "creditors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_reading_id_fkey" FOREIGN KEY ("reading_id") REFERENCES "nozzle_readings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stations" ADD CONSTRAINT "user_stations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stations" ADD CONSTRAINT "user_stations_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_settings_kv" ADD CONSTRAINT "tenant_settings_kv_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_inventory" ADD CONSTRAINT "fuel_inventory_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_inventory" ADD CONSTRAINT "fuel_inventory_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_deliveries" ADD CONSTRAINT "fuel_deliveries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_deliveries" ADD CONSTRAINT "fuel_deliveries_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nozzle_readings" ADD CONSTRAINT "nozzle_readings_nozzle_id_fkey" FOREIGN KEY ("nozzle_id") REFERENCES "nozzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_payments" ADD CONSTRAINT "credit_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_payments" ADD CONSTRAINT "credit_payments_creditor_id_fkey" FOREIGN KEY ("creditor_id") REFERENCES "creditors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_reconciliations" ADD CONSTRAINT "day_reconciliations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_reconciliations" ADD CONSTRAINT "day_reconciliations_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_reports" ADD CONSTRAINT "cash_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_reports" ADD CONSTRAINT "cash_reports_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_reports" ADD CONSTRAINT "cash_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activity_logs" ADD CONSTRAINT "user_activity_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activity_logs" ADD CONSTRAINT "user_activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_issues" ADD CONSTRAINT "validation_issues_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
