import React, { useState } from 'react';
import { useUserStore, User, ExchangeAccount } from '@/store/userStore';
import { useExchangesList } from '@/hooks/useExchangesList';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetFooter,
  SheetDescription,
} from './ui/sheet';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Trash2, Check, Loader2 } from 'lucide-react';

interface UserDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UserDrawer: React.FC<UserDrawerProps> = ({ open, onOpenChange }) => {
  const users = useUserStore((s) => s.users);
  const activeUserId = useUserStore((s) => s.activeUserId);
  const addUser = useUserStore((s) => s.addUser);
  const removeUser = useUserStore((s) => s.removeUser);
  const setActiveUser = useUserStore((s) => s.setActiveUser);

  // For adding user
  const [showAddUser, setShowAddUser] = useState(false);
  // For editing user
  const [editUserId, setEditUserId] = useState<string | null>(null);
  // For editing account
  const [editAccount, setEditAccount] = useState<{ userId: string; account: ExchangeAccount } | null>(null);
  // For adding account
  const [addAccountUserId, setAddAccountUserId] = useState<string | null>(null);

  // Empty state
  if (users.length === 0) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[400px] bg-terminal-widget border-l border-terminal-border flex flex-col">
          <SheetHeader>
            <SheetTitle>Users</SheetTitle>
            <SheetDescription>Manage users and accounts</SheetDescription>
          </SheetHeader>
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="rounded-full bg-terminal-accent/40 w-20 h-20 flex items-center justify-center">
              <svg width="48" height="48" fill="none" stroke="#A0AEC0" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div className="text-lg font-semibold">No users</div>
            <div className="text-terminal-muted text-center">Start by adding users to manage their exchange accounts</div>
            <Button onClick={() => setShowAddUser(true)} className="w-full max-w-xs" variant="outline">
              <Plus className="mr-2" size={16} /> Add first user
            </Button>
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
        {showAddUser && (
          <EditUserSheet
            onClose={() => setShowAddUser(false)}
          />
        )}
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] bg-terminal-widget border-l border-terminal-border flex flex-col">
        <SheetHeader>
          <SheetTitle>Users</SheetTitle>
          <SheetDescription>Manage users and accounts</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 py-2 flex-1 overflow-auto">
          <div className="flex flex-col gap-2">
            {users.map(user => (
              <div
                key={user.id}
                className={`flex items-center gap-3 p-2 rounded-lg border border-terminal-border/50 ${user.id === activeUserId ? 'bg-terminal-accent/30' : ''}`}
              >
                <Avatar className="w-10 h-10">
                  {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={user.email} />
                  ) : (
                    <AvatarFallback>{user.email.slice(0, 2).toUpperCase()}</AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{user.email}</div>
                  <div className="text-xs text-terminal-muted truncate">{user.accounts.length} account(s)</div>
                </div>
                <Button
                  size="icon"
                  variant={user.id === activeUserId ? 'default' : 'outline'}
                  onClick={() => setActiveUser(user.id)}
                  title="Make active"
                >
                  {user.id === activeUserId ? <Check size={16} /> : <span className="w-4 h-4 rounded-full border border-terminal-border" />}
                </Button>
                <Button size="icon" variant="outline" onClick={() => setEditUserId(user.id)} title="Edit">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 11l6 6M3 21h6l11.293-11.293a1 1 0 0 0 0-1.414l-3.586-3.586a1 1 0 0 0-1.414 0L3 15v6z" /></svg>
                </Button>
              </div>
            ))}
          </div>
          <Button onClick={() => setShowAddUser(true)} className="w-full" variant="outline">
            <Plus className="mr-2" size={16} /> Add user
          </Button>
          {/* Active user accounts */}
          {activeUserId && (
            <UserAccountsBlock
              user={users.find(u => u.id === activeUserId)!}
              onEditAccount={acc => setEditAccount({ userId: activeUserId, account: acc })}
              onAddAccount={() => setAddAccountUserId(activeUserId)}
            />
          )}
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
      {/* Sheet for adding user */}
      {showAddUser && (
        <EditUserSheet
          onClose={() => setShowAddUser(false)}
        />
      )}
      {/* Sheet for editing user */}
      {editUserId && (
        <EditUserSheet
          user={users.find(u => u.id === editUserId)!}
          onClose={() => setEditUserId(null)}
        />
      )}
      {/* Sheet for editing account */}
      {editAccount && (
        <EditAccountSheet
          userId={editAccount.userId}
          account={editAccount.account}
          onClose={() => setEditAccount(null)}
        />
      )}
      {/* Sheet for adding account */}
      {addAccountUserId && (
        <EditAccountSheet
          userId={addAccountUserId}
          onClose={() => setAddAccountUserId(null)}
        />
      )}
    </Sheet>
  );
};

// User accounts block
const UserAccountsBlock: React.FC<{
  user: User;
  onEditAccount: (acc: ExchangeAccount) => void;
  onAddAccount: () => void;
}> = ({ user, onEditAccount, onAddAccount }) => {
  return (
    <div className="mt-4">
      <div className="font-semibold mb-2">Accounts</div>
      {user.accounts.length === 0 && <div className="text-sm text-terminal-muted mb-2">No accounts</div>}
      {user.accounts.map(acc => (
        <div key={acc.id} className="flex items-center gap-2 p-1 rounded border border-terminal-border/30 bg-terminal-accent/10 mb-1">
          <span className="text-xs font-mono px-1 py-0.5 rounded bg-terminal-widget/80 border border-terminal-border/30">{acc.exchange}</span>
          <span className="truncate text-xs">{acc.email}</span>
          <Button size="icon" variant="outline" onClick={() => onEditAccount(acc)} title="Edit account">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 11l6 6M3 21h6l11.293-11.293a1 1 0 0 0 0-1.414l-3.586-3.586a1 1 0 0 0-1.414 0L3 15v6z" /></svg>
          </Button>
        </div>
      ))}
      <Button onClick={onAddAccount} className="w-full mt-2" variant="outline">
        <Plus className="mr-2" size={16} /> Add account
      </Button>
    </div>
  );
};

// Sheet for editing user
const EditUserSheet: React.FC<{ user?: User; onClose: () => void; }> = ({ user, onClose }) => {
  const addUser = useUserStore(s => s.addUser);
  const updateUser = useUserStore(s => s.updateUser);
  const removeUser = useUserStore(s => s.removeUser);
  const users = useUserStore(s => s.users);
  const [email, setEmail] = useState(user?.email || '');
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatarUrl || '');
  const [notes, setNotes] = useState(user?.notes || '');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  function validateEmail(email: string) {
    return /^\S+@\S+\.\S+$/.test(email);
  }

  const handleSave = () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!validateEmail(email.trim())) {
      setError('Enter a valid email');
      return;
    }
    if (!user && users.some(u => u.email === email.trim())) {
      setError('A user with this email already exists');
      return;
    }
    if (user) {
      updateUser(user.id, { email: email.trim(), name: name.trim(), avatarUrl: avatar.trim() || undefined, notes: notes.trim() });
    } else {
      addUser({ email: email.trim(), name: name.trim(), avatarUrl: avatar.trim() || undefined, notes: notes.trim() });
    }
    onClose();
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (user) {
      removeUser(user.id);
    }
    onClose();
  };

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] bg-terminal-widget border-l border-terminal-border flex flex-col">
        <SheetHeader>
          <SheetTitle>{user ? 'Edit user' : 'Add user'}</SheetTitle>
        </SheetHeader>
        <form className="flex flex-col gap-3 mt-3 flex-1" onSubmit={e => { e.preventDefault(); handleSave(); }}>
          <Input type="email" placeholder="Email *" value={email} onChange={e => setEmail(e.target.value)} className="w-full" />
          <Input placeholder="Name (optional)" value={name} onChange={e => setName(e.target.value)} className="w-full" />
          <Input placeholder="Avatar URL (optional)" value={avatar} onChange={e => setAvatar(e.target.value)} className="w-full" />
          <textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="w-full min-h-[60px] border rounded px-2 py-1" />
          {error && <div className="text-red-500 text-xs">{error}</div>}
          <div className="flex gap-2 mt-2">
            <Button type="submit" className="flex-1">{user ? 'Save' : 'Add'}</Button>
            <Button type="button" className="flex-1" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
          {user && (
            <div className="mt-8 border-t pt-4">
              <Button type="button" variant="destructive" className="w-full" onClick={handleDelete}>
                {confirmDelete ? 'Are you sure you want to delete?' : 'Delete user'}
              </Button>
            </div>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
};

// Sheet for editing/adding account
const EditAccountSheet: React.FC<{
  userId: string;
  account?: ExchangeAccount;
  onClose: () => void;
}> = ({ userId, account, onClose }) => {
  const addAccount = useUserStore(s => s.addAccount);
  const updateAccount = useUserStore(s => s.updateAccount);
  const removeAccount = useUserStore(s => s.removeAccount);
  const { exchanges, loading: loadingExchanges } = useExchangesList();
  const [exchange, setExchange] = useState(account?.exchange || '');
  const [email, setEmail] = useState(account?.email || '');
  const [key, setKey] = useState(account?.key || '');
  const [secret, setSecret] = useState(account?.privateKey || '');
  const [avatar, setAvatar] = useState(account?.avatarUrl || '');
  const [notes, setNotes] = useState(account?.notes || '');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  function validateEmail(email: string) {
    return /^\S+@\S+\.\S+$/.test(email);
  }

  const handleSave = () => {
    if (!exchange || !email) {
      setError('Exchange and email are required');
      return;
    }
    if (!validateEmail(email)) {
      setError('Enter a valid email');
      return;
    }
    if (account) {
      updateAccount(userId, { 
        ...account, 
        exchange, 
        email, 
        key: key.trim() || undefined, 
        privateKey: secret.trim() || undefined, 
        avatarUrl: avatar || undefined, 
        notes 
      });
    } else {
      addAccount(userId, { 
        exchange, 
        email, 
        key: key.trim() || undefined, 
        privateKey: secret.trim() || undefined, 
        avatarUrl: avatar || undefined, 
        notes 
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (!account) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    removeAccount(userId, account.id);
    onClose();
  };

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] bg-terminal-widget border-l border-terminal-border flex flex-col">
        <SheetHeader>
          <SheetTitle>{account ? 'Edit account' : 'Add account'}</SheetTitle>
        </SheetHeader>
        <form className="flex flex-col gap-3 mt-3 flex-1" onSubmit={e => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-2">
            <label className="text-xs font-medium">Exchange *</label>
            <Select 
              value={exchange} 
              onValueChange={setExchange}
              disabled={loadingExchanges}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingExchanges ? 'Loading exchanges...' : 'Select exchange'} />
              </SelectTrigger>
              <SelectContent>
                {exchanges.map(ex => (
                  <SelectItem key={ex.id} value={ex.id}>
                    {ex.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loadingExchanges && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading exchanges from CCXT...
              </div>
            )}
          </div>
          <Input type="email" placeholder="Email *" value={email} onChange={e => setEmail(e.target.value)} className="w-full" />
          <Input placeholder="API Key (optional)" value={key} onChange={e => setKey(e.target.value)} className="w-full" />
          <Input placeholder="Secret (optional)" value={secret} onChange={e => setSecret(e.target.value)} className="w-full" />
          <Input placeholder="Avatar URL (optional)" value={avatar} onChange={e => setAvatar(e.target.value)} className="w-full" />
          <textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="w-full min-h-[60px] border rounded px-2 py-1" />
          {error && <div className="text-red-500 text-xs">{error}</div>}
          <div className="flex gap-2 mt-2">
            <Button type="submit" className="flex-1">{account ? 'Save' : 'Add'}</Button>
            <Button type="button" className="flex-1" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
          {account && (
            <div className="mt-8 border-t pt-4">
              <Button type="button" variant="destructive" className="w-full" onClick={handleDelete}>
                {confirmDelete ? 'Are you sure you want to delete?' : 'Delete account'}
              </Button>
            </div>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default UserDrawer; 