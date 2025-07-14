/**
 * Standardized date utilities to ensure consistent timestamp handling
 */

/**
 * Converts any date input to a standard date format (YYYY-MM-DD)
 * @param date Date object or string
 * @returns Standardized date string in YYYY-MM-DD format
 */
export function toStandardDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString().split('T')[0];
}

/**
 * Converts any date input to a standard datetime format (YYYY-MM-DD 00:00:00)
 * @param date Date object or string
 * @param startOfDay If true, returns start of day (00:00:00), otherwise end of day (23:59:59)
 * @returns Date object set to start or end of the specified day
 */
export function toStandardDateTime(date: Date | string, startOfDay = true): Date {
  const dateStr = toStandardDate(date);
  return new Date(`${dateStr}T${startOfDay ? '00:00:00' : '23:59:59'}.000Z`);
}

/**
 * Checks if two dates are the same day, ignoring time
 * @param date1 First date
 * @param date2 Second date
 * @returns True if dates are the same day
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  return toStandardDate(date1) === toStandardDate(date2);
}