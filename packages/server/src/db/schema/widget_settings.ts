import { pgTable, uuid, jsonb, timestamp, unique } from 'drizzle-orm/pg-core';
import { widgets } from './dashboards';
import { users } from './users';

export const widgetSettings = pgTable('widget_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  widgetId: uuid('widget_id').notNull().references(() => widgets.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  settings: jsonb('settings').notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('widget_settings_widget_id_user_id_unique').on(table.widgetId, table.userId),
]);
