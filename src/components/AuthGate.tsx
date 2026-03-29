import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { loadStateFromAPI, startStoreSync, stopStoreSync } from '../services/storeSync';
import AuthPage from './AuthPage';

interface AuthGateProps {
  children: React.ReactNode;
}

const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { isAuthenticated, isLoading, checkSession } = useAuthStore();

  // Check saved session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Load state from API and start sync when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadStateFromAPI().then(() => startStoreSync());
    } else {
      stopStoreSync();
    }
    return () => stopStoreSync();
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return <>{children}</>;
};

export default AuthGate;
