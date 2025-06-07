import React, { useState } from 'react';
import { Info, ChevronDown, Search } from 'lucide-react';

type OrderType = 'market' | 'limit' | 'deferred';
type TradeAction = 'buy' | 'sell';

const OrderFormWidget: React.FC = () => {
  const [symbol, setSymbol] = useState('USDRUB');
  const [price, setPrice] = useState(86.5675);
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [action, setAction] = useState<TradeAction>('buy');
  const [quantity, setQuantity] = useState(1);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Order submitted', { symbol, orderType, action, quantity });
    // In a real app, you would submit this to your trading API
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={16} className="text-terminal-muted" />
          </div>
          <input
            type="text"
            className="bg-terminal-accent/30 border border-terminal-border rounded-md py-2 pl-10 pr-3 text-sm w-48"
            placeholder="Order USDRUB"
            value={`Order ${symbol}`}
            readOnly
          />
        </div>
        <div className="flex items-center">
          <button className="p-1 rounded hover:bg-terminal-accent/50">
            <Info size={16} className="text-terminal-muted" />
          </button>
        </div>
      </div>
      
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center px-4 py-2 bg-terminal-accent/30 rounded-md">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-sm mr-2 text-white">
            $
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">US Dollar</span>
            <span className="text-xs flex items-center">
              0.001 lot · 57.8625 ₽
            </span>
          </div>
        </div>
        <div className="text-sm text-terminal-negative">
          -2,05%
        </div>
      </div>
      
      <div className="bg-terminal-accent/30 p-3 rounded-md mb-4">
        <div className="text-sm text-terminal-muted">Trading unavailable</div>
      </div>
      
      <div className="mb-4">
        <div className="flex border-b border-terminal-border">
          <button 
            className={`flex-1 py-2 text-sm font-medium ${
              orderType === 'market' ? 'border-b-2 border-blue-500' : 'text-terminal-muted'
            }`}
            onClick={() => setOrderType('market')}
          >
            Market
          </button>
          <button 
            className={`flex-1 py-2 text-sm font-medium ${
              orderType === 'limit' ? 'border-b-2 border-blue-500' : 'text-terminal-muted'
            }`}
            onClick={() => setOrderType('limit')}
          >
            Limit
          </button>
          <button 
            className={`flex-1 py-2 text-sm font-medium ${
              orderType === 'deferred' ? 'border-b-2 border-blue-500' : 'text-terminal-muted'
            }`}
            onClick={() => setOrderType('deferred')}
          >
            Stop
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4 flex-grow">
        <div>
          <label className="block text-sm text-terminal-muted mb-1">Execution Price</label>
          <div className="relative">
            <input 
              type="text" 
              className="w-full bg-terminal-accent/30 border border-terminal-border rounded-md py-2 px-3 text-sm"
              value={orderType === 'market' ? 'Market' : `${price.toFixed(4)} ₽`}
              readOnly={orderType === 'market'}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm text-terminal-muted">Quantity</label>
            <div className="flex items-center">
              <span className="text-xs mr-1">×1</span>
              <ChevronDown size={14} className="text-terminal-muted" />
            </div>
          </div>
          <div className="relative flex items-center">
            <input 
              type="number" 
              className="w-full bg-terminal-accent/30 border border-terminal-border rounded-md py-2 px-3 text-sm"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min="1"
            />
            <div className="absolute right-0 h-full flex">
              <button 
                type="button"
                className="px-3 py-2 text-terminal-muted border-l border-terminal-border"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                –
              </button>
              <button 
                type="button"
                className="px-3 py-2 text-terminal-muted border-l border-terminal-border"
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </button>
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm text-terminal-muted mb-1">Estimated Cost</label>
          <div className="w-full bg-terminal-accent/20 border border-terminal-border rounded-md py-2 px-3 text-sm flex justify-between">
            <span>—</span>
            <Info size={14} className="text-terminal-muted" />
          </div>
        </div>
        
        <div>
          <label className="block text-sm text-terminal-muted mb-1">Commission</label>
          <div className="w-full bg-terminal-accent/20 border border-terminal-border rounded-md py-2 px-3 text-sm">
            upon transaction
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div>
            <div className="text-sm text-terminal-muted mb-1">Available</div>
            <div className="flex justify-between">
              <span>0</span>
              <span>Available</span>
              <span>0</span>
            </div>
          </div>
          <div>
            <div className="text-sm text-terminal-muted mb-1">With Leverage</div>
            <div className="flex justify-between">
              <span>0</span>
              <span>With Leverage</span>
              <span>0</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mt-auto">
          <button 
            type="button" 
            className="w-full py-2.5 rounded-md font-medium bg-terminal-positive hover:bg-terminal-positive/90 transition-colors text-white"
            onClick={() => {
              setAction('buy');
              handleSubmit(new Event('submit') as unknown as React.FormEvent);
            }}
          >
            Buy
          </button>
          <button 
            type="button" 
            className="w-full py-2.5 rounded-md font-medium bg-terminal-negative hover:bg-terminal-negative/90 transition-colors text-white"
            onClick={() => {
              setAction('sell');
              handleSubmit(new Event('submit') as unknown as React.FormEvent);
            }}
          >
            Sell
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderFormWidget;
