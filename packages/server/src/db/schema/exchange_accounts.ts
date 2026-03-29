import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const exchangeAccounts = pgTable('exchange_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  exchange: text('exchange').notNull(),
  keyEncrypted: text('key_encrypted'),
  secretEncrypted: text('secret_encrypted'),
  passwordEncrypted: text('password_encrypted'),
  uid: text('uid'),
  label: text('label'),
  isEncrypted: boolean('is_encrypted').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
