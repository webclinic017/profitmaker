import { Elysia, t } from 'elysia';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { exchangeAccounts } from '../db/schema/exchange_accounts';
import { getUserFromRequest } from '../middleware/requireUser';

export const accountRoutes = new Elysia({ prefix: '/api/accounts' })

  // List all exchange accounts for current user
  .get('/', async ({ request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const rows = await db.select({
      id: exchangeAccounts.id,
      exchange: exchangeAccounts.exchange,
      label: exchangeAccounts.label,
      uid: exchangeAccounts.uid,
      isEncrypted: exchangeAccounts.isEncrypted,
      createdAt: exchangeAccounts.createdAt,
      updatedAt: exchangeAccounts.updatedAt,
    }).from(exchangeAccounts).where(eq(exchangeAccounts.userId, user.id));
    return { success: true, data: rows };
  })

  // Create exchange account
  .post('/', async ({ body, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const [account] = await db.insert(exchangeAccounts).values({
      userId: user.id,
      exchange: body.exchange,
      keyEncrypted: body.apiKey,
      secretEncrypted: body.secret,
      passwordEncrypted: body.password,
      uid: body.uid,
      label: body.label,
      isEncrypted: body.isEncrypted ?? true,
    }).returning();
    return {
      success: true,
      data: {
        id: account.id,
        exchange: account.exchange,
        label: account.label,
        uid: account.uid,
        isEncrypted: account.isEncrypted,
      },
    };
  }, {
    body: t.Object({
      exchange: t.String(),
      apiKey: t.Optional(t.String()),
      secret: t.Optional(t.String()),
      password: t.Optional(t.String()),
      uid: t.Optional(t.String()),
      label: t.Optional(t.String()),
      isEncrypted: t.Optional(t.Boolean()),
    }),
  })

  // Update exchange account
  .put('/:id', async ({ params, body, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const updates: any = { updatedAt: new Date() };
    if (body.exchange) updates.exchange = body.exchange;
    if (body.apiKey) updates.keyEncrypted = body.apiKey;
    if (body.secret) updates.secretEncrypted = body.secret;
    if (body.password) updates.passwordEncrypted = body.password;
    if (body.uid !== undefined) updates.uid = body.uid;
    if (body.label !== undefined) updates.label = body.label;
    if (body.isEncrypted !== undefined) updates.isEncrypted = body.isEncrypted;

    const [account] = await db.update(exchangeAccounts)
      .set(updates)
      .where(and(eq(exchangeAccounts.id, params.id), eq(exchangeAccounts.userId, user.id)))
      .returning();
    if (!account) { set.status = 404; return { error: 'Account not found' }; }
    return {
      success: true,
      data: { id: account.id, exchange: account.exchange, label: account.label, uid: account.uid },
    };
  }, {
    body: t.Object({
      exchange: t.Optional(t.String()),
      apiKey: t.Optional(t.String()),
      secret: t.Optional(t.String()),
      password: t.Optional(t.String()),
      uid: t.Optional(t.String()),
      label: t.Optional(t.String()),
      isEncrypted: t.Optional(t.Boolean()),
    }),
  })

  // Delete exchange account
  .delete('/:id', async ({ params, request, set }) => {
    const user = await getUserFromRequest(request);
    if (!user) { set.status = 401; return { error: 'Authentication required' }; }
    const [account] = await db.delete(exchangeAccounts)
      .where(and(eq(exchangeAccounts.id, params.id), eq(exchangeAccounts.userId, user.id)))
      .returning();
    if (!account) { set.status = 404; return { error: 'Account not found' }; }
    return { success: true };
  });
