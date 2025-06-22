import { Response } from 'express';

export function errorResponse(res: Response, status = 400, message = 'Bad Request') {
  return res.status(status).json({ success: false, message });
}
