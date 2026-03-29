import { create } from 'zustand';
import { api, setAuthToken, getAuthToken } from '../services/api';

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthActions {
  register: (email: string, password: string, name?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  token: getAuthToken(),
  isLoading: !!getAuthToken(), // loading if we have a saved token to verify
  isAuthenticated: false,
  error: null,

  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await api.post('/api/auth/register', { email, password, name });
      setAuthToken(token);
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await api.post('/api/auth/login', { email, password });
      setAuthToken(token);
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch { /* ignore */ }
    setAuthToken(null);
    set({ user: null, token: null, isAuthenticated: false });
  },

  checkSession: async () => {
    const token = getAuthToken();
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    try {
      const { user } = await api.get('/api/auth/me');
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch {
      setAuthToken(null);
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

// Listen for 401 events from API client
window.addEventListener('auth:unauthorized', () => {
  useAuthStore.getState().logout();
});
