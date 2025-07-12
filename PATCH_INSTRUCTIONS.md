# FuelSync Backend Patch Instructions

This patch adds the `lastReading` field to the nozzle response to match the frontend API contract.

## Changes Made

1. Modified the `listNozzles` function in `src/services/nozzle.service.ts` to include the latest reading for each nozzle.

## How to Apply the Patch

1. Replace the content of `src/services/nozzle.service.ts` with the content from `src/services/nozzle.service.patch.ts`:

```bash
cp src/services/nozzle.service.patch.ts src/services/nozzle.service.ts
```

2. Restart the backend server:

```bash
npm run dev
```

## Verification

After applying the patch, the nozzle response will include the `lastReading` field, which will be used by the frontend to display the last reading value in the nozzle card.

## Why This Change Was Made

The frontend API contract expects a `lastReading` field in the nozzle response, but the backend was not providing this field. This patch adds the field to ensure compatibility between the frontend and backend.