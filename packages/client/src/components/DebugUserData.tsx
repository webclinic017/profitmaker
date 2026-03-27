import React from 'react';
import { useUserStore } from '../store/userStore';

export const DebugUserData: React.FC = () => {
  const { users, activeUserId } = useUserStore();
  const activeUser = users.find(u => u.id === activeUserId);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold text-blue-600 dark:text-blue-400">Active User ID:</h4>
        <p className="text-gray-800 dark:text-gray-200">{activeUserId || 'None'}</p>
      </div>
      
      <div>
        <h4 className="font-semibold text-blue-600 dark:text-blue-400">Total Users:</h4>
        <p className="text-gray-800 dark:text-gray-200">{users.length}</p>
      </div>
      
      {activeUser && (
        <div>
          <h4 className="font-semibold text-blue-600 dark:text-blue-400">Active User:</h4>
          <div className="ml-4 space-y-2">
            <p className="text-gray-800 dark:text-gray-200">Email: {activeUser.email}</p>
            <p className="text-gray-800 dark:text-gray-200">Name: {activeUser.name || 'Not set'}</p>
            <p className="text-gray-800 dark:text-gray-200">Accounts: {activeUser.accounts.length}</p>
            
                          {activeUser.accounts.length > 0 && (
                <div>
                  <h5 className="font-semibold text-blue-600 dark:text-blue-400 mt-2 mb-3">Accounts:</h5>
                  <div className="space-y-3">
                    {activeUser.accounts.map((account, index) => (
                      <div key={account.id} className="ml-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-gray-700 dark:text-gray-300 font-medium">#{index + 1}</p>
                        <p className="text-gray-800 dark:text-gray-200">Exchange: {account.exchange}</p>
                        <p className="text-gray-800 dark:text-gray-200">Email: {account.email}</p>
                        <p className="text-gray-800 dark:text-gray-200">Has API Key: {account.key ? 'Yes' : 'No'}</p>
                        <p className="text-gray-800 dark:text-gray-200">Has Secret: {account.privateKey ? 'Yes' : 'No'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
      
      {!activeUser && (
        <div>
          <p className="text-gray-500 dark:text-gray-400">No active user selected</p>
        </div>
      )}
    </div>
  );
}; 