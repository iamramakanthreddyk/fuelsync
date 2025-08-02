import { UserRole } from '../constants/auth';

export interface AuthPayload {
  userId: string;
  tenantId?: string | null;
  role: UserRole;
}

// Extended user type for Express requests
export interface ExtendedUser extends AuthPayload {
  id: string; // Compatibility alias for userId
  email: string;
  name?: string;
  planName?: string;
}

// Express Request interface is defined in types/express.d.ts

export {};
