import { db } from '../db';
import { validateSession } from '../services/auth';

export type AuthUser = { id: string; email: string; name: string | null };

/** Extract and validate user from Bearer token. Returns null if invalid. */
export const getUserFromRequest = async (request: Request): Promise<AuthUser | null> => {
  const header = request.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  return await validateSession(db, token);
};
