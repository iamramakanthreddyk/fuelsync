# USER_API_FLOW.md — Station Setup & Daily Operations

This document visualizes the typical user journey and associated API calls when configuring a new station and recording daily nozzle readings.

## Owner / Manager Station Setup
```mermaid
flowchart TD
    login[Login] --> createStation[POST /api/v1/stations]
    createStation --> createPump[POST /api/v1/pumps]
    createPump --> createNozzle[POST /api/v1/nozzles]
    createNozzle --> setPrice[POST /api/v1/fuel-prices]
    setPrice --> ready[Station ready for readings]
```

## Attendant Daily Reading Entry
```mermaid
flowchart TD
    alogin[Login] --> checkPrice[GET /api/v1/fuel-prices]
    checkPrice --> canCreate[GET /api/v1/nozzle-readings/can-create/{nozzleId}]
    canCreate -- Allowed --> record[POST /api/v1/nozzle-readings]
    canCreate -- Not Allowed --> halt[Stop: finalize previous day]
```

These flows show the sequential API calls from initial station setup to daily nozzle reading entry. Reading creation generates sales automatically once the station hierarchy and fuel prices are in place.

## Sale Calculation & Fuel Price Use
```mermaid
sequenceDiagram
    participant Attendant
    participant API
    participant DB
    Attendant->>API: POST /api/v1/nozzle-readings {reading: 10500}
    API->>DB: lookup last reading
    API->>DB: fetch current price
    API->>API: delta = current - last
    API->>API: amount = delta * price
    API->>DB: insert sale record
    API->>DB: update fuel_inventory
    API-->>Attendant: 201 Created with sale summary
```

Example: if last reading was **10,000 L** and current reading is **10,500 L** at **₹102/L**, the generated sale has volume **500 L** and amount **₹51,000**.

## Validation & Edge Cases
```mermaid
flowchart LR
    start([POST /api/v1/nozzle-readings]) --> priceCheck{Fuel price exists?}
    priceCheck -- No --> errorPrice[400 Missing price]
    priceCheck -- Yes --> dayCheck{Previous day finalized?}
    dayCheck -- No --> errorDay[409 Finalize previous day]
    dayCheck -- Yes --> good[Create reading & sale]
```

## Analytics & Reconciliation Flow
```mermaid
flowchart TD
    salesTbl[(sales)] --> reconAPI[POST /api/v1/reconciliations]
    reconAPI --> reconTbl[(day_reconciliations)]
    salesTbl --> analyticsAPI[GET /api/v1/analytics/station/{id}]
    analyticsAPI --> dashboard[Dashboard metrics]
```

## Database Relations Overview
```mermaid
erDiagram
    stations ||--o{ pumps : has
    pumps ||--o{ nozzles : has
    nozzles ||--o{ nozzle_readings : logs
    nozzle_readings ||--o{ sales : generates
    stations ||--o{ fuel_prices : pricing
    sales ||--|{ day_reconciliations : aggregated_by
```
