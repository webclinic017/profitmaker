import React from 'react';
import { useUserStore } from '../store/userStore';

export const DebugUserData: React.FC = () => {
  const { users, activeUserId } = useUserStore();
  const activeUser = users.find(u => u.id === activeUserId);

  return (
    <div className="p-4 bg-terminal-widget border border-terminal-border rounded">
      <h3 className="text-lg font-bold mb-4 text-terminal-text">Debug User Data</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-terminal-accent">Active User ID:</h4>
          <p className="text-terminal-text">{activeUserId || 'None'}</p>
        </div>
        
        <div>
          <h4 className="font-semibold text-terminal-accent">Total Users:</h4>
          <p className="text-terminal-text">{users.length}</p>
        </div>
        
        {activeUser && (
          <div>
            <h4 className="font-semibold text-terminal-accent">Active User:</h4>
            <div className="ml-4 space-y-2">
              <p className="text-terminal-text">Email: {activeUser.email}</p>
              <p className="text-terminal-text">Name: {activeUser.name || 'Not set'}</p>
              <p className="text-terminal-text">Accounts: {activeUser.accounts.length}</p>
              
              {activeUser.accounts.length > 0 && (
                <div>
                  <h5 className="font-semibold text-terminal-accent mt-2">Accounts:</h5>
                  {activeUser.accounts.map((account, index) => (
                    <div key={account.id} className="ml-4 p-2 bg-terminal-bg rounded border border-terminal-border">
                      <p className="text-terminal-text">#{index + 1}</p>
                      <p className="text-terminal-text">Exchange: {account.exchange}</p>
                      <p className="text-terminal-text">Email: {account.email}</p>
                      <p className="text-terminal-text">Has API Key: {account.key ? 'Yes' : 'No'}</p>
                      <p className="text-terminal-text">Has Secret: {account.privateKey ? 'Yes' : 'No'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {!activeUser && (
          <div>
            <p className="text-terminal-muted">No active user selected</p>
          </div>
        )}
      </div>
    </div>
  );
}; 