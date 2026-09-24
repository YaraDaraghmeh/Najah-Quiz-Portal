import { Request } from 'express';
import { SessionUser } from '../lib/auth';

export interface AuthRequest extends Request {
  user?: SessionUser;
}

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';
