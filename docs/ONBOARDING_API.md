# Onboarding & User Guidance API

This document describes the onboarding and user guidance API endpoints that help users get started with FuelSync and provide daily operational reminders.

## Overview

The onboarding system provides:
- **Progressive Setup Guidance**: Step-by-step setup flow with prerequisites
- **Daily Reminders**: Automatic alerts for important tasks
- **Progress Tracking**: Visual feedback on setup completion
- **Smart Notifications**: Priority-based task management
- **User Analytics**: Interaction tracking for system improvement

## Base URL

All onboarding endpoints are prefixed with `/api/v1/onboarding/`

## Authentication

All endpoints require Bearer token authentication.

## Endpoints

### GET /onboarding/status

Get comprehensive onboarding status with progress tracking.

**Response:**
```json
{
  "success": true,
  "data": {
    "hasStation": true,
    "hasPump": true,
    "hasNozzle": false,
    "hasFuelPrice": false,
    "hasReading": false,
    "completed": false,
    "completionPercentage": 50,
    "nextStep": "Configure nozzles for your pumps",
    "nextStepRoute": "/dashboard/nozzles/new"
  }
}
```

**Fields:**
- `hasStation`: Whether tenant has created at least one station
- `hasPump`: Whether tenant has created at least one pump
- `hasNozzle`: Whether tenant has created at least one nozzle
- `hasFuelPrice`: Whether tenant has set fuel prices
- `hasReading`: Whether tenant has recorded readings
- `completed`: Whether basic setup is complete
- `completionPercentage`: Setup completion percentage (0-100)
- `nextStep`: Description of the next recommended action
- `nextStepRoute`: Frontend route for the next step

### GET /onboarding/reminders

Get daily reminders and alerts for the tenant.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "daily-reading",
      "type": "reading_entry",
      "title": "Enter Today's Readings",
      "message": "Don't forget to record today's nozzle readings to track your sales accurately.",
      "priority": "high",
      "dueDate": "2024-01-15",
      "completed": false,
      "route": "/dashboard/readings/new"
    },
    {
      "id": "weekly-reconciliation",
      "type": "reconciliation",
      "title": "Weekly Reconciliation Due",
      "message": "It's been over a week since your last reconciliation. Review your cash and sales data.",
      "priority": "medium",
      "dueDate": "2024-01-15",
      "completed": false,
      "route": "/dashboard/reconciliation"
    }
  ]
}
```

**Reminder Types:**
- `reading_entry`: Daily nozzle reading reminders
- `reconciliation`: Weekly/monthly reconciliation reminders
- `fuel_delivery`: Fuel inventory and delivery reminders
- `maintenance`: Equipment maintenance reminders

**Priority Levels:**
- `urgent`: Critical tasks requiring immediate attention
- `high`: Important tasks that should be completed today
- `medium`: Tasks that should be completed soon
- `low`: Optional or informational tasks

### POST /onboarding/reminders/{reminderId}/complete

Mark a specific reminder as completed.

**Parameters:**
- `reminderId` (path): ID of the reminder to complete

**Response:**
```json
{
  "success": true,
  "message": "Reminder completed"
}
```

### GET /onboarding/setup-guide

Get step-by-step setup guide with completion status.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "step": 1,
      "title": "Create Your First Station",
      "description": "Set up your fuel station with basic information like name and address.",
      "route": "/dashboard/stations/new",
      "completed": true,
      "required": true,
      "estimatedTime": "2 minutes",
      "prerequisites": []
    },
    {
      "step": 2,
      "title": "Add Fuel Pumps",
      "description": "Configure the fuel pumps at your station.",
      "route": "/dashboard/pumps/new",
      "completed": false,
      "required": true,
      "estimatedTime": "3 minutes",
      "prerequisites": ["station"]
    }
  ]
}
```

**Fields:**
- `step`: Step number in the setup process
- `title`: Step title
- `description`: Detailed step description
- `route`: Frontend route for this step
- `completed`: Whether this step is completed
- `required`: Whether this step is required for basic functionality
- `estimatedTime`: Estimated time to complete this step
- `prerequisites`: List of prerequisite steps that must be completed first

### POST /onboarding/skip

Skip the onboarding process for experienced users.

**Response:**
```json
{
  "success": true,
  "message": "Onboarding skipped"
}
```

### POST /onboarding/track

Track user interactions for analytics and system improvement.

**Request Body:**
```json
{
  "action": "onboarding_next_step_clicked",
  "context": {
    "route": "/dashboard/stations/new",
    "step": 1
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Interaction tracked"
}
```

**Common Actions:**
- `onboarding_next_step_clicked`: User clicked next step button
- `onboarding_skipped`: User skipped onboarding
- `reminder_completed`: User completed a reminder
- `setup_step_started`: User started a setup step
- `help_viewed`: User viewed contextual help

## Integration with Existing APIs

The onboarding system integrates with existing APIs:

### Setup Status Integration
- Uses existing `/api/v1/setup-status` endpoint for basic setup checking
- Enhances with progress calculation and next step recommendations

### Daily Operations Integration
- Checks nozzle readings for daily reminder generation
- Monitors reconciliation status for weekly reminders
- Integrates with fuel inventory for low stock alerts

## Frontend Integration

### React Hooks
```typescript
import { useOnboardingExperience } from '@/hooks/useOnboarding';

function Dashboard() {
  const {
    status,
    reminders,
    urgentReminders,
    setupSteps,
    overallProgress,
    nextAction,
    needsGuidance
  } = useOnboardingExperience();

  // Component logic
}
```

### Components
- `OnboardingDashboard`: Main onboarding interface
- `DailyReminderToast`: Automatic daily notifications
- Smart visibility: Only shows when setup is incomplete or urgent tasks exist

## User Experience Flow

### New User Journey
1. **Login** → See onboarding dashboard with 0% progress
2. **Setup Guidance** → Follow step-by-step instructions
3. **Progress Tracking** → Visual feedback on completion
4. **Success Celebration** → Completion acknowledgment
5. **Daily Operations** → Transition to reminder-based guidance

### Existing User Experience
1. **Login** → Compact reminder widget (if tasks pending)
2. **Daily Reminders** → Automatic notifications for important tasks
3. **Clean Interface** → No onboarding clutter when setup is complete

## Analytics & Insights

The system tracks:
- Setup completion rates
- Time to complete each step
- User interaction patterns
- Help usage statistics
- Reminder completion rates

This data helps improve the onboarding experience and identify common user pain points.

## Error Handling

All endpoints return standard error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `UNAUTHORIZED`: Invalid or missing authentication token
- `FORBIDDEN`: User doesn't have permission for this action
- `NOT_FOUND`: Requested resource not found
- `INTERNAL_ERROR`: Server error occurred

## Security Considerations

- All endpoints require authentication
- User can only access their own tenant's data
- Tracking data is anonymized for analytics
- No sensitive information is stored in tracking logs
