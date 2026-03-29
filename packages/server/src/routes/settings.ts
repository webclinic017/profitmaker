import { Elysia, t } from 'elysia';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { userSettings } from '../db/schema/user_settings';
import { widgetSettings } from '../db/schema/widget_settings';
import { getUserFromRequest } from '../middleware/requireUser';

export const settingsRoutes = new Elysia({ prefix: '/api/settings' })

  // Get all user settings
  .get('/', async ({ request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const rows = await db.select().from(userSettings).where(eq(userSettings.userId, user.id));
    const result: Record<string, any> = {};
    for (const row of rows) result[row.key] = row.value;
    return { success: true, data: result };
  })

  // Get specific setting
  .get('/:key', async ({ params, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const [row] = await db.select().from(userSettings)
      .where(and(eq(userSettings.userId, user.id), eq(userSettings.key, params.key)));
    if (!row) { set.status = 404; return { error: 'Setting not found' }; }
    return { success: true, data: { key: row.key, value: row.value } };
  })

  // Set a user setting (upsert)
  .put('/:key', async ({ params, body, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const existing = await db.select().from(userSettings)
      .where(and(eq(userSettings.userId, user.id), eq(userSettings.key, params.key)));
    if (existing.length > 0) {
      const [row] = await db.update(userSettings)
        .set({ value: body.value, updatedAt: new Date() })
        .where(and(eq(userSettings.userId, user.id), eq(userSettings.key, params.key)))
        .returning();
      return { success: true, data: { key: row.key, value: row.value } };
    }
    const [row] = await db.insert(userSettings).values({
      userId: user.id,
      key: params.key,
      value: body.value,
    }).returning();
    return { success: true, data: { key: row.key, value: row.value } };
  }, {
    body: t.Object({ value: t.Any() }),
  })

  // Bulk set settings
  .put('/', async ({ body, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const results: Record<string, any> = {};
    for (const [key, value] of Object.entries(body.settings)) {
      const existing = await db.select().from(userSettings)
        .where(and(eq(userSettings.userId, user.id), eq(userSettings.key, key)));
      if (existing.length > 0) {
        await db.update(userSettings)
          .set({ value, updatedAt: new Date() })
          .where(and(eq(userSettings.userId, user.id), eq(userSettings.key, key)));
      } else {
        await db.insert(userSettings).values({ userId: user.id, key, value });
      }
      results[key] = value;
    }
    return { success: true, data: results };
  }, {
    body: t.Object({ settings: t.Record(t.String(), t.Any()) }),
  })

  // Delete a setting
  .delete('/:key', async ({ params, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    await db.delete(userSettings)
      .where(and(eq(userSettings.userId, user.id), eq(userSettings.key, params.key)));
    return { success: true };
  })

  // Widget settings: get
  .get('/widget/:widgetId', async ({ params, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const [row] = await db.select().from(widgetSettings)
      .where(and(eq(widgetSettings.widgetId, params.widgetId), eq(widgetSettings.userId, user.id)));
    if (!row) { set.status = 404; return { error: 'Widget settings not found' }; }
    return { success: true, data: row.settings };
  })

  // Widget settings: set (upsert)
  .put('/widget/:widgetId', async ({ params, body, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const existing = await db.select().from(widgetSettings)
      .where(and(eq(widgetSettings.widgetId, params.widgetId), eq(widgetSettings.userId, user.id)));
    if (existing.length > 0) {
      const [row] = await db.update(widgetSettings)
        .set({ settings: body.settings, updatedAt: new Date() })
        .where(and(eq(widgetSettings.widgetId, params.widgetId), eq(widgetSettings.userId, user.id)))
        .returning();
      return { success: true, data: row.settings };
    }
    const [row] = await db.insert(widgetSettings).values({
      widgetId: params.widgetId,
      userId: user.id,
      settings: body.settings,
    }).returning();
    return { success: true, data: row.settings };
  }, {
    body: t.Object({ settings: t.Any() }),
  });
