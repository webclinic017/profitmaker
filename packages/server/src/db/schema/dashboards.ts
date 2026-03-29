import { pgTable, uuid, text, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const dashboards = pgTable('dashboards', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  layout: jsonb('layout').default({}).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const widgets = pgTable('widgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  dashboardId: uuid('dashboard_id').notNull().references(() => dashboards.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  defaultTitle: text('default_title').notNull(),
  userTitle: text('user_title'),
  position: jsonb('position').notNull(),
  preCollapsePosition: jsonb('pre_collapse_position'),
  config: jsonb('config').default({}).notNull(),
  groupId: text('group_id'),
  showGroupSelector: boolean('show_group_selector').default(true).notNull(),
  isVisible: boolean('is_visible').default(true).notNull(),
  isMinimized: boolean('is_minimized').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
