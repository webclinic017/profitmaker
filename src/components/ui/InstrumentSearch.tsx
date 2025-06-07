import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { useDataProviderStore } from '../../store/dataProviderStore';

export interface Instrument {
  account: string;
  exchange: string;
  market: string;
  pair: string;
  searchText: string; // for filtering
}

interface InstrumentSearchProps {
  value?: Instrument | null;
  onChange: (instrument: Instrument | null) => void;
  placeholder?: string;
  className?: string;
}

const InstrumentSearch: React.FC<InstrumentSearchProps> = ({
  value,
  onChange,
  placeholder = "Search instrument...",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [exchangeData, setExchangeData] = useState<Record<string, { symbols: string[]; markets: string[] }>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  const { users, activeUserId } = useUserStore();
  const { getSymbolsForExchange, getMarketsForExchange } = useDataProviderStore();
  const activeUser = users.find(u => u.id === activeUserId);

  // Load exchange data when activeUser changes
  useEffect(() => {
    if (!activeUser) return;

    console.log(`🔍 [InstrumentSearch] Loading data for user:`, {
      email: activeUser.email,
      accountsCount: activeUser.accounts.length,
      accounts: activeUser.accounts.map(acc => ({ exchange: acc.exchange, email: acc.email }))
    });

    const loadExchangeData = async () => {
      const newExchangeData: Record<string, { symbols: string[]; markets: string[] }> = {};
      
      for (const account of activeUser.accounts) {
        console.log(`🏦 [InstrumentSearch] Loading data for exchange: ${account.exchange}`);
        if (!newExchangeData[account.exchange]) {
          try {
            const [symbols, markets] = await Promise.all([
              getSymbolsForExchange(account.exchange),
              getMarketsForExchange(account.exchange)
            ]);
            
            newExchangeData[account.exchange] = { symbols, markets };
            console.log(`✅ [InstrumentSearch] Loaded for ${account.exchange}:`, {
              symbolsCount: symbols.length,
              marketsCount: markets.length,
              symbolsSample: symbols.slice(0, 3),
              markets
            });
          } catch (error) {
            console.error(`Failed to load data for ${account.exchange}:`, error);
            // Fallback to basic data
            newExchangeData[account.exchange] = {
              symbols: ['BTC/USDT', 'ETH/USDT'],
              markets: ['spot']
            };
          }
        }
      }
      
      setExchangeData(newExchangeData);
      console.log(`📊 [InstrumentSearch] Final exchange data:`, newExchangeData);
    };

    loadExchangeData();
  }, [activeUser, getSymbolsForExchange, getMarketsForExchange]);

  // Generate all possible instruments from user accounts
  const allInstruments = useMemo((): Instrument[] => {
    if (!activeUser) return [];
    
    const instruments: Instrument[] = [];

    activeUser.accounts.forEach(account => {
      const exchangeInfo = exchangeData[account.exchange];
      if (!exchangeInfo) return; // Skip if data not loaded yet
      
      const { symbols, markets } = exchangeInfo;
      
      markets.forEach(market => {
        symbols.forEach(pair => {
          const instrument: Instrument = {
            account: account.email,
            exchange: account.exchange,
            market,
            pair,
            searchText: `${account.email} ${account.exchange} ${market} ${pair}`.toLowerCase()
          };
          instruments.push(instrument);
        });
      });
    });

    return instruments;
  }, [activeUser, exchangeData]);

  // Filter instruments based on search query
  const filteredInstruments = useMemo(() => {
    if (!searchQuery.trim()) return allInstruments.slice(0, 20); // Show first 20 if no search
    
    const query = searchQuery.toLowerCase().trim();
    return allInstruments
      .filter(instrument => instrument.searchText.includes(query))
      .slice(0, 20); // Limit to 20 results
  }, [allInstruments, searchQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev < filteredInstruments.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : filteredInstruments.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredInstruments[highlightedIndex]) {
            handleSelect(filteredInstruments[highlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, filteredInstruments, highlightedIndex]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (instrument: Instrument) => {
    onChange(instrument);
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(0);
  };

  const handleClear = () => {
    onChange(null);
    setSearchQuery('');
    setHighlightedIndex(0);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setHighlightedIndex(0);
    if (!isOpen) setIsOpen(true);
  };

  const displayValue = value 
    ? `${value.account} | ${value.exchange} | ${value.market} | ${value.pair}`
    : '';

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-terminal-muted" />
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : displayValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={(e) => {
            // Delay closing to allow clicks on options
            setTimeout(() => {
              if (!e.currentTarget.contains(document.activeElement)) {
                setIsOpen(false);
                setSearchQuery('');
              }
            }, 200);
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 bg-terminal-bg border border-terminal-border rounded text-sm focus:outline-none focus:border-terminal-accent"
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-terminal-accent/20 transition-colors"
            title="Clear selection"
          >
            <X size={12} className="text-terminal-muted hover:text-terminal-text" />
          </button>
        )}
      </div>

      {/* Dropdown with results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-terminal-widget border border-terminal-border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
          <div ref={listRef}>
            {filteredInstruments.length === 0 ? (
              <div className="px-3 py-4 text-sm text-terminal-muted text-center">
                No instruments found
              </div>
            ) : (
              filteredInstruments.map((instrument, index) => (
                <div
                  key={`${instrument.account}-${instrument.exchange}-${instrument.market}-${instrument.pair}`}
                  onClick={() => handleSelect(instrument)}
                  className={`px-3 py-3 cursor-pointer border-b border-terminal-border/50 last:border-b-0 ${
                    index === highlightedIndex 
                      ? 'bg-terminal-accent/20' 
                      : 'hover:bg-terminal-accent/10'
                  }`}
                >
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <div className="text-terminal-text font-medium">
                      <span className="text-terminal-muted">Account:</span> {instrument.account}
                    </div>
                    <div className="text-terminal-text">
                      <span className="text-terminal-muted">Exchange:</span> {instrument.exchange}
                    </div>
                    <div className="text-terminal-text">
                      <span className="text-terminal-muted">Market:</span> {instrument.market}
                    </div>
                    <div className="text-terminal-text">
                      <span className="text-terminal-muted">Pair:</span> {instrument.pair}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InstrumentSearch; 