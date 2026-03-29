import { hash, verify } from '@node-rs/bcrypt';
import { eq, lt } from 'drizzle-orm';
import type { Database } from '../db';
import { users, sessions } from '../db/schema/index';

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return verify(password, passwordHash);
}

export function generateToken(): string {
  return crypto.randomUUID();
}

export async function createSession(
  db: Database,
  userId: string,
  expiresInDays = 30,
): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

export async function validateSession(
  db: Database,
  token: string,
): Promise<{ id: string; email: string; name: string | null } | null> {
  const result = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      email: users.email,
      name: users.name,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token))
    .limit(1);

  if (result.length === 0) return null;

  const session = result[0];
  if (session.expiresAt < new Date()) {
    await deleteSession(db, token);
    return null;
  }

  return {
    id: session.userId,
    email: session.email,
    name: session.name,
  };
}

export async function deleteSession(
  db: Database,
  token: string,
): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function deleteExpiredSessions(
  db: Database,
): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
