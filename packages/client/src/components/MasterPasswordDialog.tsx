import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserStore } from '@/store/userStore';
import { Lock, Unlock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface MasterPasswordDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MasterPasswordDialog({ open, onOpenChange }: MasterPasswordDialogProps) {
  const { isLocked, needsMasterPassword, unlockStore, setupMasterPassword, users } = useUserStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if we have any accounts with sensitive data
  const hasAccounts = users.some(user => user.accounts.length > 0);

  // Determine if dialog should be shown
  const shouldShow = open !== undefined ? open : (isLocked && hasAccounts);

  const isSetupMode = needsMasterPassword;

  useEffect(() => {
    // Reset form when dialog opens
    if (shouldShow) {
      setPassword('');
      setConfirmPassword('');
      setError('');
    }
  }, [shouldShow]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSetupMode) {
        // Setting up new master password
        if (password.length < 8) {
          setError('Password must be at least 8 characters long');
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        const success = await setupMasterPassword(password);
        if (!success) {
          setError('Failed to set up master password');
        } else {
          onOpenChange?.(false);
        }
      } else {
        // Unlocking with existing password
        const success = await unlockStore(password);
        if (!success) {
          setError('Incorrect password');
        } else {
          onOpenChange?.(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={shouldShow} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSetupMode ? (
              <>
                <ShieldCheck className="h-5 w-5 text-green-500" />
                Set Up Master Password
              </>
            ) : (
              <>
                <Lock className="h-5 w-5 text-yellow-500" />
                Unlock Vault
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isSetupMode ? (
              'Create a master password to encrypt your API keys. This password will be required to access your trading accounts.'
            ) : (
              'Enter your master password to unlock and access your encrypted API keys.'
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="password">
              {isSetupMode ? 'Master Password' : 'Password'}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSetupMode ? 'Enter a strong password' : 'Enter your password'}
                className="pr-10"
                autoFocus
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isSetupMode && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                disabled={isLoading}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {isSetupMode && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Password requirements:</p>
              <ul className="list-disc list-inside">
                <li className={password.length >= 8 ? 'text-green-500' : ''}>
                  At least 8 characters
                </li>
              </ul>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              'Processing...'
            ) : isSetupMode ? (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Create Master Password
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4 mr-2" />
                Unlock
              </>
            )}
          </Button>
        </form>

        {!isSetupMode && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Your API keys are encrypted and can only be accessed with your master password.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
