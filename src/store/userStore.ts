import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { z } from 'zod';

// Types via zod
export const ExchangeAccountSchema = z.object({
  id: z.string(), // uuid
  exchange: z.string(), // e.g., 'binance', 'bybit' (required)
  key: z.string().optional(), // API key (optional)
  privateKey: z.string().optional(), // Secret key (optional)
  password: z.string().optional(), // Password/passphrase (optional)
  uid: z.string().optional(), // UID (optional)
  email: z.string(), // required
  avatarUrl: z.string().url().optional(),
  notes: z.string().optional(), // optional
});
export type ExchangeAccount = z.infer<typeof ExchangeAccountSchema>;

export const UserSchema = z.object({
  id: z.string(), // uuid
  email: z.string(), // required, unique
  avatarUrl: z.string().url().optional(),
  notes: z.string().optional(), // optional
  name: z.string().optional(), // optional
  accounts: z.array(ExchangeAccountSchema),
});
export type User = z.infer<typeof UserSchema>;

export const UserStoreStateSchema = z.object({
  users: z.array(UserSchema),
  activeUserId: z.string().optional(),
});
export type UserStoreState = z.infer<typeof UserStoreStateSchema>;

// Helper function for generating uuid (v4, simple)
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface UserStore extends UserStoreState {
  addUser: (data: { email: string; avatarUrl?: string; notes?: string; name?: string }) => void;
  removeUser: (userId: string) => void;
  setActiveUser: (userId: string) => void;
  updateUser: (userId: string, data: Partial<Omit<User, 'id' | 'accounts'>>) => void;
  addAccount: (userId: string, account: Omit<ExchangeAccount, 'id'>) => void;
  removeAccount: (userId: string, accountId: string) => void;
  updateAccount: (userId: string, account: ExchangeAccount) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    immer((set, get) => ({
      users: [],
      activeUserId: undefined,

      addUser: ({ email, avatarUrl, notes, name }) => {
        set((state) => {
          // Check email uniqueness
          if (state.users.some(u => u.email === email)) return;
          const id = uuidv4();
          const user: User = { id, email, avatarUrl, notes, name, accounts: [] };
          state.users.push(user);
          state.activeUserId = id;
        });
      },

      removeUser: (userId) => {
        set((state) => {
          state.users = state.users.filter(u => u.id !== userId);
          if (state.activeUserId === userId) {
            state.activeUserId = state.users[0]?.id;
          }
        });
      },

      setActiveUser: (userId) => {
        set((state) => {
          if (state.users.some(u => u.id === userId)) {
            state.activeUserId = userId;
          }
        });
      },

      updateUser: (userId, data) => {
        set((state) => {
          const user = state.users.find(u => u.id === userId);
          if (user) {
            if (data.email && data.email !== user.email && state.users.some(u => u.email === data.email)) return;
            if (data.email) user.email = data.email;
            if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;
            if (data.notes !== undefined) user.notes = data.notes;
            if (data.name !== undefined) user.name = data.name;
          }
        });
      },

      addAccount: (userId, account) => {
        set((state) => {
          const user = state.users.find(u => u.id === userId);
          if (user) {
            user.accounts.push({ ...account, id: uuidv4() });
          }
        });
      },

      removeAccount: (userId, accountId) => {
        set((state) => {
          const user = state.users.find(u => u.id === userId);
          if (user) {
            user.accounts = user.accounts.filter(a => a.id !== accountId);
          }
        });
      },

      updateAccount: (userId, account) => {
        set((state) => {
          const user = state.users.find(u => u.id === userId);
          if (user) {
            const idx = user.accounts.findIndex(a => a.id === account.id);
            if (idx !== -1) user.accounts[idx] = account;
          }
        });
      },
    })),
    {
      name: 'user-store',
      partialize: (state) => ({ users: state.users, activeUserId: state.activeUserId }),
      // Validation via zod on load
      merge: (persisted, current) => {
        try {
          const parsed = UserStoreStateSchema.parse(persisted);
          return { ...current, ...parsed };
        } catch {
          return current;
        }
      },
    }
  )
); 