import { Pool } from 'pg';
import { parseRows } from '../utils/parseDb';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  status: 'present' | 'absent' | 'late';
  checkIn?: string;
  checkOut?: string;
  date: string;
}

interface Shift {
  id: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  assignedCount?: number;
  date: string;
}

export async function getAttendanceRecords(db: Pool, tenantId: string, date: string): Promise<AttendanceRecord[]> {
  try {
    // Check if attendance table exists
    const tableCheck = await db.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name = 'attendance'
       )`
    );
    
    if (!tableCheck.rows[0]?.exists) {
      console.log('[ATTENDANCE-SERVICE] attendance table does not exist');
      return getMockAttendanceData(date);
    }
    
    const res = await db.query(
      `SELECT a.id, a.employee_id as "employeeId", u.name as "employeeName", 
              u.role as "position", a.status, a.check_in as "checkIn", 
              a.check_out as "checkOut", a.date
         FROM public.attendance a
         JOIN public.users u ON a.employee_id = u.id
        WHERE a.tenant_id = $1 AND a.date = $2::date
        ORDER BY u.name`,
      [tenantId, date]
    );
    
    return parseRows(res.rows);
  } catch (err) {
    console.error('[ATTENDANCE-SERVICE] Error fetching attendance:', err);
    // Return mock data if there's an error
    return getMockAttendanceData(date);
  }
}

export async function getShiftSchedules(db: Pool, tenantId: string, date: string): Promise<Shift[]> {
  try {
    // Check if shifts table exists
    const tableCheck = await db.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name = 'shifts'
       )`
    );
    
    if (!tableCheck.rows[0]?.exists) {
      console.log('[SHIFTS-SERVICE] shifts table does not exist');
      return getMockShiftData(date);
    }
    
    const res = await db.query(
      `SELECT s.id, s.name as "shiftName", s.start_time as "startTime", 
              s.end_time as "endTime", 
              (SELECT COUNT(*) FROM public.shift_assignments sa 
               WHERE sa.shift_id = s.id AND sa.date = $2::date) as "assignedCount",
              $2 as date
         FROM public.shifts s
        WHERE s.tenant_id = $1
        ORDER BY s.start_time`,
      [tenantId, date]
    );
    
    return parseRows(res.rows);
  } catch (err) {
    console.error('[SHIFTS-SERVICE] Error fetching shifts:', err);
    // Return mock data if there's an error
    return getMockShiftData(date);
  }
}

// Mock data functions for development/testing
function getMockAttendanceData(date: string): AttendanceRecord[] {
  return [
    {
      id: '1',
      employeeId: '101',
      employeeName: 'John Doe',
      position: 'Attendant',
      status: 'present',
      checkIn: `${date}T08:00:00Z`,
      checkOut: `${date}T16:00:00Z`,
      date
    },
    {
      id: '2',
      employeeId: '102',
      employeeName: 'Jane Smith',
      position: 'Attendant',
      status: 'present',
      checkIn: `${date}T08:15:00Z`,
      checkOut: `${date}T16:30:00Z`,
      date
    },
    {
      id: '3',
      employeeId: '103',
      employeeName: 'Mike Johnson',
      position: 'Manager',
      status: 'present',
      checkIn: `${date}T07:45:00Z`,
      checkOut: `${date}T17:00:00Z`,
      date
    }
  ];
}

function getMockShiftData(date: string): Shift[] {
  return [
    {
      id: '1',
      shiftName: 'Morning',
      startTime: `${date}T06:00:00Z`,
      endTime: `${date}T14:00:00Z`,
      assignedCount: 2,
      date
    },
    {
      id: '2',
      shiftName: 'Afternoon',
      startTime: `${date}T14:00:00Z`,
      endTime: `${date}T22:00:00Z`,
      assignedCount: 2,
      date
    },
    {
      id: '3',
      shiftName: 'Night',
      startTime: `${date}T22:00:00Z`,
      endTime: `${date}T06:00:00Z`,
      assignedCount: 1,
      date
    }
  ];
}