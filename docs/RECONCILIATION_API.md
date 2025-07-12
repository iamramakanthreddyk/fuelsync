# Reconciliation API Guide

This document clarifies how daily reconciliation works in FuelSync Hub and lists the available endpoints.

## Overview
Each station can finalize **one** reconciliation per day. Once saved, that day is locked and new sales or payments cannot be added.

## Aggregating Nozzle Readings
The service totals opening and closing readings for all nozzles at a station using the following query:

```sql
SELECT
  SUM(opening_reading) AS opening_reading,
  SUM(closing_reading) AS closing_reading
FROM (
  SELECT MIN(nr.reading) AS opening_reading, MAX(nr.reading) AS closing_reading
    FROM public.nozzle_readings nr
    JOIN public.nozzles n ON nr.nozzle_id = n.id
    JOIN public.pumps p ON n.pump_id = p.id
   WHERE p.station_id = $1
     AND DATE(nr.recorded_at) = $2
     AND nr.tenant_id = $3
   GROUP BY nr.nozzle_id
) r;
```

This query assumes nozzle readings are monotonic and may have multiple entries per day. It selects the first and last reading per nozzle, then sums them for the station.

## Variance Calculation
After obtaining `openingReading`, `closingReading` and the day's total sales volume, the service computes:

```ts
const variance = closingReading - openingReading - totalVolume;
```

The variance represents the difference between what the nozzle readings imply was dispensed and the recorded sales. A non‑zero variance can indicate manual entry errors or missed transactions.

## Cash Difference Logic
When a cash report exists for the same day, the reported cash is compared with calculated sales totals:

```ts
const difference = reportedCash - actualCash;
const status = difference === 0 ? 'match' : difference > 0 ? 'over' : 'short';
```

A positive difference means more cash was reported than expected (`over`), while a negative value indicates a shortage (`short`).

## Key Reconciliation API Endpoints
- `GET /reconciliation` – list reconciliations
- `POST /reconciliation` – run reconciliation
- `GET /reconciliation/{stationId}/{date}` – get daily summary
- `GET /reconciliation/{id}` – get reconciliation by ID
- `POST /reconciliation/{id}/approve` – approve and lock reconciliation
- `GET /reconciliation/daily-summary` – per-nozzle summary
- `GET /reconciliation/differences` – list discrepancies
- `GET /reconciliation/differences/summary` – summary of discrepancies
- `GET /reconciliation/differences/{id}` – get discrepancy by ID

