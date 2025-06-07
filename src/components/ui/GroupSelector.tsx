import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
import { useGroupStore } from '../../store/groupStore';
import { useUserStore } from '../../store/userStore';
import { Group } from '../../types/groups';
import InstrumentSearch, { Instrument } from './InstrumentSearch';

interface GroupSelectorProps {
  selectedGroupId?: string;
  onGroupSelect: (groupId: string | undefined) => void;
  className?: string;
}

const GroupSelector: React.FC<GroupSelectorProps> = ({
  selectedGroupId,
  onGroupSelect,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [buttonPosition, setButtonPosition] = useState<{ x: number; y: number } | null>(null);
  const { 
    groups, 
    getGroupById, 
    initializeDefaultGroups,
    setTradingPair,
    setAccount,
    setExchange,
    setMarket,
    resetGroup
  } = useGroupStore();

  // User store for getting account data
  const { users, activeUserId } = useUserStore();
  const activeUser = users.find(u => u.id === activeUserId);
  const firstAccount = activeUser?.accounts[0];

  // Initialize groups and user on first render
  React.useEffect(() => {
    initializeDefaultGroups();
    
    // Initialize test user if no active user
    if (!activeUser && users.length === 0) {
      // Use hook inside component - add user through store
      const { addUser, addAccount } = useUserStore.getState();
      addUser({ 
        email: 'suenot@gmail.com',
        name: 'Test User'
      });
      
      // Find created user
      const newUser = useUserStore.getState().users.find(u => u.email === 'suenot@gmail.com');
      if (newUser) {
        addAccount(newUser.id, {
          exchange: 'binance',
          email: 'suenot@gmail.com',
          // API keys are optional - not providing them for test user
        });
      }
    }
  }, [initializeDefaultGroups, activeUser, users.length]);

  const selectedGroup = selectedGroupId ? getGroupById(selectedGroupId) : undefined;

  // Initialize selected instrument based on user and group data
  React.useEffect(() => {
    if (selectedGroup && selectedGroup.account && selectedGroup.exchange && selectedGroup.market && selectedGroup.tradingPair) {
      // If group has all instrument data, set it
      setSelectedInstrument({
        account: selectedGroup.account,
        exchange: selectedGroup.exchange,
        market: selectedGroup.market,
        pair: selectedGroup.tradingPair,
        searchText: `${selectedGroup.account} ${selectedGroup.exchange} ${selectedGroup.market} ${selectedGroup.tradingPair}`.toLowerCase()
      });
    } else if (!selectedGroup && firstAccount) {
      // If no group selected, set default from first account
      setSelectedInstrument({
        account: firstAccount.email,
        exchange: firstAccount.exchange,
        market: 'spot',
        pair: 'BTC/USDT',
        searchText: `${firstAccount.email} ${firstAccount.exchange} spot BTC/USDT`.toLowerCase()
      });
    } else {
      setSelectedInstrument(null);
    }
  }, [firstAccount, activeUser, selectedGroup]);

  // Instrument change handler with store synchronization
  const handleInstrumentChange = (instrument: Instrument | null) => {
    setSelectedInstrument(instrument);
    if (selectedGroup && instrument) {
      setAccount(selectedGroup.id, instrument.account);
      setExchange(selectedGroup.id, instrument.exchange);
      setMarket(selectedGroup.id, instrument.market);
      setTradingPair(selectedGroup.id, instrument.pair);
    }
  };

  const handleGroupSelect = (group: Group | null) => {
    onGroupSelect(group?.id);
    setIsOpen(false);
  };

  // Function to get color name in English
  const getColorName = (color: string) => {
    const colorMap: Record<string, string> = {
      'transparent': 'Transparent',
      '#00BCD4': 'Cyan',
      '#F44336': 'Red',
      '#9C27B0': 'Purple',
      '#2196F3': 'Blue',
      '#4CAF50': 'Green',
      '#FF9800': 'Orange',
      '#E91E63': 'Pink',
    };
    return colorMap[color] || 'Unknown';
  };

  // Function to reset group
  const handleResetGroup = (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation(); // prevent group selection when clicking on cross
    resetGroup(groupId);
  };

  return (
    <>
      <div className={`relative ${className}`}>
        {/* Selector button */}
        <button
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setButtonPosition({
              x: rect.left,
              y: rect.bottom + window.scrollY
            });
            setIsOpen(!isOpen);
          }}
          className="w-4 h-4 rounded-full border border-terminal-border hover:border-terminal-accent transition-colors flex items-center justify-center"
          style={{
            backgroundColor: selectedGroup ? selectedGroup.color : 'transparent',
            borderColor: selectedGroup ? selectedGroup.color : undefined,
          }}
          title={selectedGroup ? `Group: ${selectedGroup.name}` : 'Select group'}
        >
          {!selectedGroup && (
            <Plus size={8} className="text-terminal-muted" />
          )}
        </button>
      </div>

      {/* Portal for popover */}
      {isOpen && buttonPosition && createPortal(
        <>
          {/* Overlay for closing */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Popover */}
          <div 
            className="fixed w-[500px] bg-terminal-widget border border-terminal-border rounded-md shadow-lg z-[9999]"
            style={{
              left: buttonPosition.x,
              top: buttonPosition.y + 4,
            }}
          >
            <div className="p-3">
              {/* Super instrument search input */}
              <div className="space-y-2 mb-3">
                <div className="relative">
                  <InstrumentSearch
                    value={selectedInstrument}
                    onChange={handleInstrumentChange}
                    placeholder="Search account | exchange | market | pair..."
                    className="w-full"
                  />
                  {/* Cross for group reset - only if group is selected */}
                  {selectedGroup && (
                    <button
                      onClick={() => handleGroupSelect(null)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-terminal-accent/20 transition-colors z-10"
                      title="Remove group binding"
                    >
                      <X size={12} className="text-terminal-muted hover:text-terminal-text" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Group list */}
              <div className="max-h-72 overflow-y-auto">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className={`group w-full flex items-center px-3 py-2 text-sm rounded hover:bg-terminal-accent/20 cursor-pointer relative ${
                      selectedGroupId === group.id ? 'bg-terminal-accent/30' : ''
                    }`}
                    onClick={() => handleGroupSelect(group)}
                  >
                    <div
                      className="w-4 h-4 rounded-full mr-3 flex-shrink-0 border"
                      style={{ 
                        backgroundColor: group.color === 'transparent' ? 'transparent' : group.color,
                        borderColor: group.color === 'transparent' ? 'hsl(var(--terminal-border))' : group.color
                      }}
                    />
                    <span className="text-left flex-1">
                      {group.account || group.exchange || group.market || group.tradingPair 
                        ? `${group.account || 'account'} | ${group.exchange || 'exchange'} | ${group.market || 'market'} | ${group.tradingPair || 'pair'}`
                        : getColorName(group.color)
                      }
                    </span>
                    {/* Cross for group reset - shown on hover, hidden for transparent group */}
                    {group.color !== 'transparent' && (
                      <button
                        onClick={(e) => handleResetGroup(e, group.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-terminal-accent/30 transition-opacity"
                        title="Reset group settings"
                      >
                        <X size={12} className="text-terminal-muted hover:text-terminal-text" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default GroupSelector; 