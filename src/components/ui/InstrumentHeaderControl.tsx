import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { useGroupStore } from '../../store/groupStore';
import InstrumentSearch, { Instrument } from './InstrumentSearch';

interface InstrumentHeaderControlProps {
  selectedGroupId?: string;
  className?: string;
}

const InstrumentHeaderControl: React.FC<InstrumentHeaderControlProps> = ({
  selectedGroupId,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [buttonPosition, setButtonPosition] = useState<{ x: number; y: number } | null>(null);
  
  const { 
    getGroupById,
    setTradingPair,
    setAccount,
    setExchange,
    setMarket
  } = useGroupStore();

  const selectedGroup = selectedGroupId ? getGroupById(selectedGroupId) : undefined;

  // Initialize selected instrument based on group data
  React.useEffect(() => {
    if (selectedGroup && selectedGroup.account && selectedGroup.exchange && selectedGroup.market && selectedGroup.tradingPair) {
      const currentInstrument = {
        account: selectedGroup.account,
        exchange: selectedGroup.exchange,
        market: selectedGroup.market,
        pair: selectedGroup.tradingPair
      };
      
      setSelectedInstrument(prev => {
        // Only update if the data is actually different
        if (!prev || 
            prev.account !== currentInstrument.account ||
            prev.exchange !== currentInstrument.exchange ||
            prev.market !== currentInstrument.market ||
            prev.pair !== currentInstrument.pair) {
          return currentInstrument;
        }
        return prev;
      });
    } else {
      // Clear if group doesn't have complete instrument data
      setSelectedInstrument(null);
    }
  }, [selectedGroup]);

  const handleInstrumentChange = (instrument: Instrument | null) => {
    setSelectedInstrument(instrument);
    // Update group data if group is selected and instrument changed
    if (selectedGroup && instrument) {
      const hasChanges = 
        selectedGroup.account !== instrument.account ||
        selectedGroup.exchange !== instrument.exchange ||
        selectedGroup.market !== instrument.market ||
        selectedGroup.tradingPair !== instrument.pair;
      
      if (hasChanges) {
        setAccount(selectedGroup.id, instrument.account);
        setExchange(selectedGroup.id, instrument.exchange);
        setMarket(selectedGroup.id, instrument.market);
        setTradingPair(selectedGroup.id, instrument.pair);
      }
    }
  };

  const handleSearchClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setButtonPosition({
      x: rect.left,
      y: rect.bottom + window.scrollY
    });
    setIsOpen(!isOpen);
  };

  return (
    <>
      <div className={`flex items-center ${className}`}>
        {/* Unified search button with icon and pair */}
        <button
          onClick={handleSearchClick}
          className="flex items-center space-x-2 px-1 py-1 rounded-sm hover:bg-terminal-widget/50 transition-colors flex-shrink-0"
          title="Search trading instrument"
        >
          <Search size={14} className="text-terminal-muted hover:text-terminal-text transition-colors flex-shrink-0" />
          
          {/* Display pair if instrument is selected */}
          {selectedInstrument && (
            <span className="text-xs font-medium text-terminal-text truncate">
              {selectedInstrument.pair}
            </span>
          )}
        </button>
      </div>

      {/* Portal for instrument search popover */}
      {isOpen && buttonPosition && createPortal(
        <>
          {/* Overlay for closing */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Instrument search popover */}
          <div 
            className="fixed w-[500px] bg-terminal-widget border border-terminal-border rounded-md shadow-lg z-[9999]"
            style={{
              left: buttonPosition.x,
              top: buttonPosition.y + 4,
            }}
          >
            <div className="p-3">
              <div className="text-sm text-terminal-muted mb-3">Select trading instrument:</div>
              
              {/* Instrument search */}
              <InstrumentSearch
                value={selectedInstrument}
                onChange={(instrument) => {
                  handleInstrumentChange(instrument);
                  setIsOpen(false);
                }}
                placeholder="Search account | exchange | market | pair..."
                className="w-full"
              />

              {/* Current selection display */}
              {selectedInstrument && (
                <div className="mt-3 pt-3 border-t border-terminal-border">
                  <div className="text-xs text-terminal-muted mb-1">Current selection:</div>
                  <div className="text-sm text-terminal-text">
                    {`${selectedInstrument.account} | ${selectedInstrument.exchange} | ${selectedInstrument.market} | ${selectedInstrument.pair}`}
                  </div>
                  <button
                    onClick={() => {
                      handleInstrumentChange(null);
                      if (selectedGroup) {
                        setAccount(selectedGroup.id, '');
                        setExchange(selectedGroup.id, '');
                        setMarket(selectedGroup.id, '');
                        setTradingPair(selectedGroup.id, '');
                      }
                    }}
                    className="mt-2 text-xs text-terminal-muted hover:text-terminal-text"
                  >
                    Clear selection
                  </button>
                </div>
              )}

              {/* Help text */}
              {!selectedGroup && (
                <div className="mt-3 pt-3 border-t border-terminal-border text-xs text-terminal-muted">
                  💡 Select a group color first to save instrument settings
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default InstrumentHeaderControl; 