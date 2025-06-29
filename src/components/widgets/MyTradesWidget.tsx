import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ArrowLeft, Plus, Search, User, TrendingUp, TrendingDown, Clock, Check } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';

interface MyTrade {
  id: string;
  datetime: string;
  stock: string;
  symbol: string;
  type: string;
  side: 'buy' | 'sell';
  price: number;
  amount: number;
  fee: number;
  value: number;
  pnl?: number;
  orderType: string;
}

interface MyTradesWidgetProps {
  selectionMode?: boolean;
  onBack?: () => void;
  onTradesSelected?: (trades: MyTrade[]) => void;
}

const MyTradesWidget: React.FC<MyTradesWidgetProps> = ({
  selectionMode = false,
  onBack,
  onTradesSelected
}) => {
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for trades
  const myTrades: MyTrade[] = [
    {
      id: 'TXN123456',
      datetime: '2024-06-01 14:23:45',
      stock: 'BTC',
      symbol: 'BTC/USDT',
      side: 'buy',
      type: 'limit',
      orderType: 'market',
      price: 43250.50,
      amount: 0.1234,
      value: 5337.02,
      fee: 5.34,
      pnl: null
    },
    {
      id: 'TXN123455',
      datetime: '2024-06-01 14:20:32',
      stock: 'ETH',
      symbol: 'ETH/USDT',
      side: 'sell',
      type: 'market',
      orderType: 'limit',
      price: 2845.30,
      amount: 2.5670,
      value: 7305.51,
      fee: 0.0026,
      pnl: 245.67
    },
    {
      id: 'TXN123454',
      datetime: '2024-06-01 14:18:21',
      stock: 'SOL',
      symbol: 'SOL/USDT',
      side: 'buy',
      type: 'limit',
      orderType: 'market',
      price: 98.45,
      amount: 15.67,
      value: 1543.32,
      fee: 1.54,
      pnl: null
    },
    {
      id: 'TXN123453',
      datetime: '2024-06-01 14:15:18',
      stock: 'BNB',
      symbol: 'BNB/USDT',
      side: 'sell',
      type: 'stop-limit',
      orderType: 'stop-limit',
      price: 315.67,
      amount: 12.34,
      value: 3897.37,
      fee: 3.90,
      pnl: -89.45
    },
    {
      id: 'TXN123452',
      datetime: '2024-06-01 14:12:05',
      stock: 'BTC',
      symbol: 'BTC/USDT',
      side: 'buy',
      type: 'market',
      orderType: 'market',
      price: 43100.00,
      amount: 0.0567,
      value: 2443.77,
      fee: 2.44,
      pnl: null
    }
  ];

  const stats = {
    totalTrades: 247,
    totalVolume: 125678.90,
    totalFees: 234.56,
    totalPnl: 567.89,
    winRate: 68.5
  };

  const filteredTrades = myTrades.filter(trade =>
    trade.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trade.stock.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trade.side.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTradeSelection = (tradeId: string) => {
    if (!selectionMode) return;

    const newSelected = new Set(selectedTrades);
    if (newSelected.has(tradeId)) {
      newSelected.delete(tradeId);
    } else {
      newSelected.add(tradeId);
    }
    setSelectedTrades(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTrades.size === filteredTrades.length) {
      setSelectedTrades(new Set());
    } else {
      setSelectedTrades(new Set(filteredTrades.map(trade => trade.id)));
    }
  };

  const handleConfirmSelection = () => {
    const selected = myTrades.filter(trade => selectedTrades.has(trade.id));
    onTradesSelected?.(selected);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="outline"
              size="icon"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <User className="h-5 w-5 text-primary" />
          <span className="font-medium">{selectionMode ? 'Select Trades' : 'My Trades'}</span>
        </div>
        {selectionMode && selectedTrades.size > 0 && (
          <Button onClick={handleConfirmSelection} className="gap-2">
            <Check className="h-4 w-4" />
            Add Selected ({selectedTrades.size})
          </Button>
        )}
      </div>
      <div className="flex-1 p-3 overflow-auto">
        <div className="space-y-4">
          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 text-green-500 text-sm">
                <TrendingUp className="h-4 w-4" />
                Total P&L
              </div>
              <div className="text-xl font-bold text-green-500">
                +{formatCurrency(stats.totalPnl)}
              </div>
              <div className="text-xs text-muted-foreground">
                Win Rate: {stats.winRate}%
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 text-blue-500 text-sm">
                <User className="h-4 w-4" />
                Total Volume
              </div>
              <div className="text-xl font-bold">
                {formatCurrency(stats.totalVolume)}
              </div>
              <div className="text-xs text-muted-foreground">
                {stats.totalTrades} trades
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search trades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Trades Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {selectionMode && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedTrades.size === filteredTrades.length && filteredTrades.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Date</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Fee</TableHead>
                  {!selectionMode && <TableHead>P&L</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrades.map((trade) => (
                  <TableRow 
                    key={trade.id}
                    className={`${trade.side === 'buy' ? 'bg-green-500/5' : 'bg-red-500/5'} ${
                      selectionMode ? 'cursor-pointer hover:bg-muted/50' : ''
                    }`}
                    onClick={() => selectionMode && handleTradeSelection(trade.id)}
                  >
                    {selectionMode && (
                      <TableCell>
                        <Checkbox
                          checked={selectedTrades.has(trade.id)}
                          onCheckedChange={() => handleTradeSelection(trade.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="text-xs">{trade.datetime}</TableCell>
                    <TableCell className="font-medium">{trade.stock}</TableCell>
                    <TableCell>{trade.symbol}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        trade.side === 'buy' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.side.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{trade.orderType}</TableCell>
                    <TableCell>{formatCurrency(trade.price)}</TableCell>
                    <TableCell>{formatNumber(trade.amount)}</TableCell>
                    <TableCell>{formatCurrency(trade.value)}</TableCell>
                    <TableCell>{formatCurrency(trade.fee)}</TableCell>
                    {!selectionMode && (
                      <TableCell>
                        {trade.pnl !== null && (
                          <span className={`text-sm font-medium ${
                            trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                          </span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!selectionMode && (
            <div className="grid grid-cols-3 gap-4 text-center text-xs">
              <div>
                <div className="text-muted-foreground">Total Trades</div>
                <div className="font-bold">{stats.totalTrades}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Total Fees</div>
                <div className="font-bold">{formatCurrency(stats.totalFees)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Avg Trade</div>
                <div className="font-bold">{formatCurrency(stats.totalVolume / stats.totalTrades)}</div>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center">
            Real-time trade tracking • Last update: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyTradesWidget; 