/**
 * @file utils/response.ts
 * @description Unified response utilities with automatic camelCase conversion
 */

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

export function errorResponse(
  res: Response,
  status: number,
  message: string,
  details?: any
) {
  // Convert error details to camelCase as well
  const convertedDetails = details ? convertKeysToCamelCase(details) : undefined;
  
  const payload: any = { 
    success: false, 
    message,
    ...(convertedDetails && { error: convertedDetails })
  };
  
  return res.status(status).json(payload);
}
