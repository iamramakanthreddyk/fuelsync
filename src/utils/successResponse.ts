import { Response } from 'express';
import { convertKeysToCamelCase, logCaseInconsistencies } from './caseConverter';

export function successResponse(
  res: Response,
  data: any,
  message?: string,
  status = 200
) {
  // Convert data to camelCase for consistent API responses
  const convertedData = convertKeysToCamelCase(data);

  // Log inconsistencies in development
  if (process.env.NODE_ENV === 'development') {
    logCaseInconsistencies(convertedData, res.req?.originalUrl || 'unknown');
  }

  const payload: any = { success: true, data: convertedData };
  if (message) payload.message = message;
  return res.status(status).json(payload);
}
