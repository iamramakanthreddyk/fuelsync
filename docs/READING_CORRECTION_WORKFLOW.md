# Reading Correction Workflow

## Overview

This document outlines the workflow for handling incorrect meter readings in FuelSync. Instead of allowing direct editing of readings, which can compromise data integrity, we've implemented a proper correction workflow.

## Why Not Edit Readings?

Fuel meter readings should be sequential and represent the actual state of the meter at a point in time. Editing a reading breaks this integrity and can cause several issues:

1. **Data Integrity**: Meter readings should be sequential and represent the actual state of the meter.
2. **Sales Impact**: Readings automatically generate sales records based on volume calculations.
3. **Accounting Issues**: Changing readings after the fact can create accounting discrepancies.

## Correction Workflow

### Step 1: Void the Incorrect Reading

When an incorrect reading is identified:

1. Navigate to the reading details page
2. Click "Void Reading"
3. Provide a detailed reason for voiding
4. Submit the void request

**Note**: Only managers and owners can void readings.

### Step 2: Enter the Correct Reading

After voiding the incorrect reading:

1. Navigate to the nozzle page
2. Click "Record Reading"
3. Enter the correct meter reading
4. Submit the new reading

### Step 3: Audit Trail

All voided readings are tracked in the audit log with:
- Who voided the reading
- When it was voided
- The reason provided
- The original reading value

## Technical Implementation

- Voided readings are marked with `status = 'voided'`
- Associated sales records are also marked as voided
- An entry is created in the `reading_audit_log` table
- The UI prevents editing readings directly

## Benefits

This workflow provides several benefits:

1. **Data Integrity**: Maintains a complete history of all readings
2. **Accountability**: Tracks who made changes and why
3. **Audit Trail**: Provides a clear record for accounting and reconciliation
4. **Transparency**: Makes it clear when data has been corrected

## Access Control

- **Attendants**: Can view readings and record new ones
- **Managers/Owners**: Can void readings and view the audit trail