import React, { useState, useEffect } from 'react';
import { useDataProviderStore } from '../store/dataProviderStore';
import { useUserStore } from '../store/userStore';
import { ChevronDown, User, ArrowUpDown, TrendingUp, Search } from 'lucide-react';

export const PairsWidget: React.FC = () => {
  const { getSymbolsForExchange, getMarketsForExchange, getAllSupportedExchanges } = useDataProviderStore();
  const { users, activeUserId } = useUserStore();
  
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [hasUserMadeChoice, setHasUserMadeChoice] = useState(false); // Track explicit user choice
  const [selectedExchange, setSelectedExchange] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [availableMarkets, setAvailableMarkets] = useState<string[]>([]);
  const [availablePairs, setAvailablePairs] = useState<string[]>([]);
  const [filteredPairs, setFilteredPairs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isExchangeDropdownOpen, setIsExchangeDropdownOpen] = useState(false);
  const [isMarketDropdownOpen, setIsMarketDropdownOpen] = useState(false);

  const activeUser = users.find(u => u.id === activeUserId);
  const availableAccounts = activeUser?.accounts || [];
  
  // Get unique exchanges from user accounts OR all supported exchanges from providers if no account selected
  const availableExchanges = selectedAccountId 
    ? Array.from(new Set(availableAccounts.map(acc => acc.exchange))).sort()
    : getAllSupportedExchanges();

  // Auto-select first account if none selected (only if user hasn't made explicit choice)
  useEffect(() => {
    if (!hasUserMadeChoice && !selectedAccountId && availableAccounts.length > 0) {
      setSelectedAccountId(availableAccounts[0].id);
    }
  }, [selectedAccountId, availableAccounts, hasUserMadeChoice]);

  // Auto-select exchange from selected account
  useEffect(() => {
    if (selectedAccountId && !selectedExchange) {
      const account = availableAccounts.find(acc => acc.id === selectedAccountId);
      if (account) {
        setSelectedExchange(account.exchange);
      }
    }
  }, [selectedAccountId, selectedExchange, availableAccounts]);

  // Load markets when exchange changes
  useEffect(() => {
    if (!selectedExchange) return;

    const loadMarkets = async () => {
      try {
        const markets = await getMarketsForExchange(selectedExchange);
        setAvailableMarkets(markets);
        if (markets.length > 0 && !selectedMarket) {
          setSelectedMarket(markets[0]);
        }
      } catch (error) {
        console.error('Failed to load markets:', error);
        setAvailableMarkets([]);
      }
    };

    loadMarkets();
  }, [selectedExchange, getMarketsForExchange, selectedMarket]);

  // Load pairs when exchange + market changes
  useEffect(() => {
    if (!selectedExchange || !selectedMarket) return;

    const loadPairs = async () => {
      setLoading(true);
      try {
        const pairs = await getSymbolsForExchange(selectedExchange);
        setAvailablePairs(pairs);
      } catch (error) {
        console.error('Failed to load pairs:', error);
        setAvailablePairs([]);
      } finally {
        setLoading(false);
      }
    };

    loadPairs();
  }, [selectedExchange, selectedMarket, getSymbolsForExchange]);

  // Filter pairs based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPairs(availablePairs);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = availablePairs.filter(pair => 
        pair.toLowerCase().includes(query)
      );
      setFilteredPairs(filtered);
    }
  }, [availablePairs, searchQuery]);

  const selectedAccount = selectedAccountId 
    ? availableAccounts.find(acc => acc.id === selectedAccountId) 
    : null;

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Account Selection (Optional) */}
      <div>
        <label className="block text-sm font-medium text-terminal-text mb-2">
          Select Account (Optional)
        </label>
        <div className="relative">
          <button
            onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-terminal-bg border border-terminal-border rounded text-sm focus:outline-none focus:border-terminal-accent"
          >
            <div className="flex items-center space-x-2">
              <User size={16} className="text-terminal-text/80" />
              <span>
                {selectedAccount?.email || 
                 (selectedAccountId === null ? 'No account (all exchanges)' : 'Select account...')}
              </span>
            </div>
            <ChevronDown size={16} className="text-terminal-text/70" />
          </button>

          {isAccountDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-terminal-widget border border-terminal-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
              <button
                onClick={() => {
                  setSelectedAccountId(null);
                  setHasUserMadeChoice(true); // Mark that user made explicit choice
                  // Don't reset exchange when switching to "No account"
                  setIsAccountDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-terminal-accent/20 text-left text-sm text-terminal-muted"
              >
                <User size={16} className="text-terminal-text/60" />
                <span>No account (all exchanges)</span>
              </button>
              {availableAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => {
                    setSelectedAccountId(account.id);
                    setHasUserMadeChoice(true); // Mark that user made explicit choice
                    setSelectedExchange(account.exchange);
                    setIsAccountDropdownOpen(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-terminal-accent/20 text-left text-sm"
                >
                  <User size={16} className="text-terminal-text/70" />
                  <div>
                    <div className="font-medium">{account.email}</div>
                    <div className="text-xs text-terminal-muted">{account.exchange}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Exchange Selection */}
      <div>
        <label className="block text-sm font-medium text-terminal-text mb-2">
          Select Exchange
        </label>
        <div className="relative">
          <button
            onClick={() => setIsExchangeDropdownOpen(!isExchangeDropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-terminal-bg border border-terminal-border rounded text-sm focus:outline-none focus:border-terminal-accent"
          >
            <div className="flex items-center space-x-2">
              <ArrowUpDown size={16} className="text-terminal-text/80" />
              <span>{selectedExchange || 'Select exchange...'}</span>
            </div>
            <ChevronDown size={16} className="text-terminal-text/70" />
          </button>

          {isExchangeDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-terminal-widget border border-terminal-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
              {availableExchanges.map((exchange) => (
                <button
                  key={exchange}
                  onClick={() => {
                    setSelectedExchange(exchange);
                    setSelectedMarket(null);
                    setIsExchangeDropdownOpen(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-terminal-accent/20 text-left text-sm"
                >
                  <ArrowUpDown size={16} className="text-terminal-text/70" />
                  <span>{exchange}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Market Selection */}
      <div>
        <label className="block text-sm font-medium text-terminal-text mb-2">
          Select Market
        </label>
        <div className="relative">
          <button
            onClick={() => setIsMarketDropdownOpen(!isMarketDropdownOpen)}
            disabled={!selectedExchange}
            className="w-full flex items-center justify-between px-3 py-2 bg-terminal-bg border border-terminal-border rounded text-sm focus:outline-none focus:border-terminal-accent disabled:opacity-50"
          >
            <div className="flex items-center space-x-2">
              <TrendingUp size={16} className="text-terminal-text/80" />
              <span>{selectedMarket || 'Select market...'}</span>
            </div>
            <ChevronDown size={16} className="text-terminal-text/70" />
          </button>

          {isMarketDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-terminal-widget border border-terminal-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
              {availableMarkets.map((market) => (
                <button
                  key={market}
                  onClick={() => {
                    setSelectedMarket(market);
                    setIsMarketDropdownOpen(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-terminal-accent/20 text-left text-sm"
                >
                  <TrendingUp size={16} className="text-terminal-text/70" />
                  <span>{market}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search Filter */}
      <div>
        <label className="block text-sm font-medium text-terminal-text mb-2">
          Search Pairs
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-terminal-muted" />
          <input
            type="text"
            placeholder="Filter pairs (e.g., BTC, ETH, USDT)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-terminal-bg border border-terminal-border rounded text-sm focus:outline-none focus:border-terminal-accent"
          />
        </div>
      </div>

      {/* Pairs List */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-terminal-text">
            Trading Pairs
          </h3>
          <span className="text-xs text-terminal-muted">
            {filteredPairs.length} of {availablePairs.length} pairs
          </span>
        </div>

        {!selectedExchange || !selectedMarket ? (
          <div className="bg-terminal-bg border border-terminal-border rounded p-4 text-center text-terminal-muted text-sm">
            Please select exchange and market to view pairs
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8 text-terminal-muted">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-terminal-accent"></div>
            <span className="ml-2 text-sm">Loading pairs...</span>
          </div>
        ) : (
          <div className="bg-terminal-bg border border-terminal-border rounded max-h-80 overflow-y-auto">
            {filteredPairs.length === 0 ? (
              <div className="p-4 text-center text-terminal-muted text-sm">
                {searchQuery ? `No pairs found for "${searchQuery}"` : `No pairs available for ${selectedExchange}/${selectedMarket}`}
              </div>
            ) : (
              <div className="divide-y divide-terminal-border/50">
                {filteredPairs.map((pair, index) => {
                  // Parse pair to extract base and quote
                  const parts = pair.split('/');
                  const base = parts[0] || '';
                  const quote = parts[1] || '';
                  
                  return (
                    <div
                      key={pair}
                      className="px-3 py-2 hover:bg-terminal-accent/10 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-terminal-text font-medium">{pair}</span>
                          <div className="text-xs text-terminal-muted">
                            {base && quote ? `${base} to ${quote}` : 'Trading pair'}
                          </div>
                        </div>
                        <span className="text-xs text-terminal-muted">#{index + 1}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selection Info */}
      <div className="bg-terminal-widget/50 border border-terminal-border/50 rounded p-3">
        <div className="text-xs text-terminal-muted space-y-1">
          <div><strong>Account:</strong> {selectedAccount?.email || 'None selected'}</div>
          <div><strong>Exchange:</strong> {selectedExchange || 'None selected'}</div>
          <div><strong>Market:</strong> {selectedMarket || 'None selected'}</div>
          <div><strong>Total Pairs:</strong> {availablePairs.length}</div>
          <div><strong>Filtered Pairs:</strong> {filteredPairs.length}</div>
          {searchQuery && (
            <div><strong>Search:</strong> "{searchQuery}"</div>
          )}
        </div>
      </div>
    </div>
  );
}; 