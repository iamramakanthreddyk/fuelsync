import { Request, Response } from 'express';
import { Pool } from 'pg';
import { getAttendanceRecords, getShiftSchedules } from '../services/attendance.service';
import { successResponse } from '../utils/successResponse';
import { errorResponse } from '../utils/errorResponse';

export function createAttendanceHandlers(db: Pool) {
  return {
    getAttendance: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const date = req.query.date as string;
        
        if (!user?.tenantId || !date) {
          return errorResponse(res, 400, 'Missing tenant context or date parameter');
        }
        
        const attendance = await getAttendanceRecords(db, user.tenantId, date);
        successResponse(res, { attendance });
      } catch (err: any) {
        console.error('[ATTENDANCE-CONTROLLER] Error:', err);
        return errorResponse(res, 500, 'Unable to fetch attendance records');
      }
    },
    
    getShifts: async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const date = req.query.date as string;
        
        if (!user?.tenantId || !date) {
          return errorResponse(res, 400, 'Missing tenant context or date parameter');
        }
        
        const shifts = await getShiftSchedules(db, user.tenantId, date);
        successResponse(res, { shifts });
      } catch (err: any) {
        console.error('[SHIFTS-CONTROLLER] Error:', err);
        return errorResponse(res, 500, 'Unable to fetch shift schedules');
      }
    }
  };
}