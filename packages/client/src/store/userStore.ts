import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import {
  encryptSensitiveData,
  decryptSensitiveData,
  isEncryptionInitialized,
  isMasterPasswordSet,
  initializeEncryption,
  lockEncryption,
  isEncrypted,
} from '../utils/encryption';

// Types via zod
export const ExchangeAccountSchema = z.object({
  id: z.string(), // uuid
  exchange: z.string(), // e.g., 'binance', 'bybit' (required)
  key: z.string().optional(), // API key (optional) - stored encrypted
  privateKey: z.string().optional(), // Secret key (optional) - stored encrypted
  password: z.string().optional(), // Password/passphrase (optional) - stored encrypted
  uid: z.string().optional(), // UID (optional)
  email: z.string(), // required
  avatarUrl: z.string().url().optional(),
  notes: z.string().optional(), // optional
  isEncrypted: z.boolean().optional(), // flag to indicate if sensitive fields are encrypted
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

// Encrypt sensitive fields of an account
async function encryptAccount(account: ExchangeAccount): Promise<ExchangeAccount> {
  if (!isEncryptionInitialized()) {
    return account;
  }

  const encrypted: ExchangeAccount = { ...account };

  if (account.key && !account.isEncrypted) {
    encrypted.key = await encryptSensitiveData(account.key);
  }
  if (account.privateKey && !account.isEncrypted) {
    encrypted.privateKey = await encryptSensitiveData(account.privateKey);
  }
  if (account.password && !account.isEncrypted) {
    encrypted.password = await encryptSensitiveData(account.password);
  }

  encrypted.isEncrypted = true;
  return encrypted;
}

// Decrypt sensitive fields of an account
async function decryptAccount(account: ExchangeAccount): Promise<ExchangeAccount> {
  if (!isEncryptionInitialized() || !account.isEncrypted) {
    return account;
  }

  const decrypted: ExchangeAccount = { ...account };

  try {
    if (account.key && isEncrypted(account.key)) {
      decrypted.key = await decryptSensitiveData(account.key);
    }
    if (account.privateKey && isEncrypted(account.privateKey)) {
      decrypted.privateKey = await decryptSensitiveData(account.privateKey);
    }
    if (account.password && isEncrypted(account.password)) {
      decrypted.password = await decryptSensitiveData(account.password);
    }
    decrypted.isEncrypted = false;
  } catch (error) {
    console.error('Failed to decrypt account:', error);
    // Return account with encrypted data if decryption fails
    return account;
  }

  return decrypted;
}

interface UserStore extends UserStoreState {
  // User management
  addUser: (data: { email: string; avatarUrl?: string; notes?: string; name?: string }) => void;
  removeUser: (userId: string) => void;
  setActiveUser: (userId: string) => void;
  updateUser: (userId: string, data: Partial<Omit<User, 'id' | 'accounts'>>) => void;

  // Account management
  addAccount: (userId: string, account: Omit<ExchangeAccount, 'id'>) => void;
  removeAccount: (userId: string, accountId: string) => void;
  updateAccount: (userId: string, account: ExchangeAccount) => void;

  // Encryption management
  isLocked: boolean;
  needsMasterPassword: boolean;
  unlockStore: (password: string) => Promise<boolean>;
  lockStore: () => void;
  setupMasterPassword: (password: string) => Promise<boolean>;
  getDecryptedAccount: (userId: string, accountId: string) => Promise<ExchangeAccount | null>;
  encryptAllAccounts: () => Promise<void>;
  migrateUnencryptedData: () => Promise<void>;
}

export const useUserStore = create<UserStore>()(
  persist(
    immer((set, get) => ({
      users: [],
      activeUserId: undefined,
      isLocked: true,
      needsMasterPassword: !isMasterPasswordSet(),

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
        const newAccount: ExchangeAccount = { ...account, id: uuidv4() };

        // Encrypt the account before storing
        if (isEncryptionInitialized()) {
          encryptAccount(newAccount).then((encryptedAccount) => {
            set((state) => {
              const user = state.users.find(u => u.id === userId);
              if (user) {
                user.accounts.push(encryptedAccount);
              }
            });
          });
        } else {
          set((state) => {
            const user = state.users.find(u => u.id === userId);
            if (user) {
              user.accounts.push(newAccount);
            }
          });
        }
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
        // Encrypt the account before storing
        if (isEncryptionInitialized()) {
          encryptAccount(account).then((encryptedAccount) => {
            set((state) => {
              const user = state.users.find(u => u.id === userId);
              if (user) {
                const idx = user.accounts.findIndex(a => a.id === account.id);
                if (idx !== -1) user.accounts[idx] = encryptedAccount;
              }
            });
          });
        } else {
          set((state) => {
            const user = state.users.find(u => u.id === userId);
            if (user) {
              const idx = user.accounts.findIndex(a => a.id === account.id);
              if (idx !== -1) user.accounts[idx] = account;
            }
          });
        }
      },

      // Encryption methods
      unlockStore: async (password: string) => {
        const success = await initializeEncryption(password);
        if (success) {
          set((state) => {
            state.isLocked = false;
            state.needsMasterPassword = false;
          });
        }
        return success;
      },

      lockStore: () => {
        lockEncryption();
        set((state) => {
          state.isLocked = true;
        });
      },

      setupMasterPassword: async (password: string) => {
        const success = await initializeEncryption(password);
        if (success) {
          set((state) => {
            state.isLocked = false;
            state.needsMasterPassword = false;
          });
          // Encrypt all existing accounts
          await get().encryptAllAccounts();
        }
        return success;
      },

      getDecryptedAccount: async (userId: string, accountId: string) => {
        const state = get();
        const user = state.users.find(u => u.id === userId);
        if (!user) return null;

        const account = user.accounts.find(a => a.id === accountId);
        if (!account) return null;

        if (account.isEncrypted && isEncryptionInitialized()) {
          return decryptAccount(account);
        }

        return account;
      },

      encryptAllAccounts: async () => {
        if (!isEncryptionInitialized()) return;

        const state = get();
        const updatedUsers = await Promise.all(
          state.users.map(async (user) => ({
            ...user,
            accounts: await Promise.all(
              user.accounts.map((account) => encryptAccount(account))
            ),
          }))
        );

        set((state) => {
          state.users = updatedUsers;
        });
      },

      migrateUnencryptedData: async () => {
        if (!isEncryptionInitialized()) return;

        const state = get();
        let hasUnencrypted = false;

        for (const user of state.users) {
          for (const account of user.accounts) {
            if (!account.isEncrypted && (account.key || account.privateKey || account.password)) {
              hasUnencrypted = true;
              break;
            }
          }
          if (hasUnencrypted) break;
        }

        if (hasUnencrypted) {
          await get().encryptAllAccounts();
        }
      },
    })),
    {
      name: 'user-store',
      partialize: (state) => ({
        users: state.users,
        activeUserId: state.activeUserId
      }),
      // Validation via zod on load
      merge: (persisted, current) => {
        try {
          const parsed = UserStoreStateSchema.parse(persisted);
          return {
            ...current,
            ...parsed,
            isLocked: true,
            needsMasterPassword: !isMasterPasswordSet(),
          };
        } catch {
          return current;
        }
      },
    }
  )
);
