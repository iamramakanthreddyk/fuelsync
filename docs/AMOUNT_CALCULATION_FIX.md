# Amount Calculation Fix

## Issue
When retrieving readings from the database, the amount is calculated using the SQL query in `listNozzleReadings` function:

```sql
(nr.reading - LAG(nr.reading) OVER (PARTITION BY nr.nozzle_id ORDER BY nr.recorded_at)) * COALESCE(sa.fuel_price, 0) AS "amount"
```

For the first reading of a nozzle, the `LAG` function returns `NULL` because there's no previous reading. This results in:
- `(reading - NULL)` = `NULL`
- `NULL * price` = `NULL`

Therefore, the amount is `NULL` for the first reading of each nozzle.

## Solution

### Backend Fix
Update the SQL query in `nozzleReading.service.ts` to handle the case when there's no previous reading:

```sql
(nr.reading - COALESCE(LAG(nr.reading) OVER (PARTITION BY nr.nozzle_id ORDER BY nr.recorded_at), 0)) * COALESCE(sa.fuel_price, 0) AS "amount"
```

This will use 0 as the previous reading when there's no previous reading, ensuring that the amount is calculated correctly.

### Frontend Workaround
Until the backend is fixed, the frontend should calculate the amount when it's missing:

```typescript
const amount = reading.amount !== undefined && reading.amount !== null 
  ? reading.amount 
  : ((Number(reading.reading || 0) - Number(reading.previousReading || 0)) * Number(reading.pricePerLitre || 0));
```

This ensures that the total sales amount is calculated correctly even when the backend returns `null` for the amount.

## Impact
This issue affects the total sales calculation and reporting. By fixing it, we ensure that all sales are properly accounted for, including the first reading for each nozzle.