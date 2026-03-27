import React, { useState, useEffect } from 'react';
import { Deal, DealsViewMode, DealTrade } from '../../types/deals';
import DealsList from './DealsList';
import DealDetails from './DealDetails';

interface DealsWidgetProps {
  dashboardId?: string;
  widgetId?: string;
  initialMode?: DealsViewMode;
  initialDealId?: string;
}

const DealsWidget: React.FC<DealsWidgetProps> = ({
  dashboardId = 'default',
  widgetId = 'deals-widget',
  initialMode = 'list',
  initialDealId
}) => {
  const [viewMode, setViewMode] = useState<DealsViewMode>(initialMode);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(initialDealId || null);
  const [deals, setDeals] = useState<Deal[]>([]);

  // Initialize with mock data
  useEffect(() => {
    const mockDeals: Deal[] = [
      {
        id: '1',
        name: 'BTC Long Position',
        note: 'Successful BTC growth trading with good entry based on technical analysis',
        stocks: 2,
        coins: 0.5,
        pairs: 1,
        credited: 45250.50,
        debited: 42670.75,
        total: 2579.75,
        credited_trades: 3,
        debited_trades: 2,
        total_trades: 5,
        timestamp_open: '2024-06-01 09:30:00',
        timestamp_closed: '2024-06-01 15:45:00',
        duration: '6h 15m',
        trades: [
          {
            uuid: '1',
            order: 'ORD001',
            datetime: '2024-06-01 09:30:15',
            stock: 'BTC',
            symbol: 'BTC/USDT',
            type: 'limit',
            side: 'buy',
            price: 42200.50,
            amount: 0.25,
            fee: 2.26
          },
          {
            uuid: '2',
            order: 'ORD002',
            datetime: '2024-06-01 11:45:20',
            stock: 'BTC',
            symbol: 'BTC/USDT',
            type: 'market',
            side: 'buy',
            price: 42470.25,
            amount: 0.25,
            fee: 2.27
          },
          {
            uuid: '3',
            order: 'ORD003',
            datetime: '2024-06-01 15:30:45',
            stock: 'BTC',
            symbol: 'BTC/USDT',
            type: 'limit',
            side: 'sell',
            price: 45100.75,
            amount: 0.3,
            fee: 2.39
          },
          {
            uuid: '4',
            order: 'ORD004',
            datetime: '2024-06-01 15:45:12',
            stock: 'BTC',
            symbol: 'BTC/USDT',
            type: 'market',
            side: 'sell',
            price: 45400.25,
            amount: 0.2,
            fee: 2.40
          }
        ]
      },
      {
        id: '2',
        name: 'ETH Swing Trade',
        note: 'Average profitability with decent risk management',
        stocks: 5,
        coins: 2.3,
        pairs: 2,
        credited: 7420.80,
        debited: 6990.70,
        total: 430.10,
        credited_trades: 4,
        debited_trades: 3,
        total_trades: 7,
        timestamp_open: '2024-06-02 14:20:00',
        timestamp_closed: '2024-06-03 11:10:00',
        duration: '20h 50m',
        trades: [
          {
            uuid: '5',
            order: 'ORD005',
            datetime: '2024-06-02 14:20:15',
            stock: 'ETH',
            symbol: 'ETH/USDT',
            type: 'limit',
            side: 'buy',
            price: 3050.30,
            amount: 1.15,
            fee: 1.75
          },
          {
            uuid: '6',
            order: 'ORD006',
            datetime: '2024-06-02 16:45:20',
            stock: 'ETH',
            symbol: 'ETH/USDT',
            type: 'market',
            side: 'buy',
            price: 3025.40,
            amount: 1.15,
            fee: 1.74
          },
          {
            uuid: '7',
            order: 'ORD007',
            datetime: '2024-06-03 10:30:45',
            stock: 'ETH',
            symbol: 'ETH/USDT',
            type: 'limit',
            side: 'sell',
            price: 3245.75,
            amount: 1.2,
            fee: 1.95
          },
          {
            uuid: '8',
            order: 'ORD008',
            datetime: '2024-06-03 11:10:12',
            stock: 'ETH',
            symbol: 'ETH/USDT',
            type: 'market',
            side: 'sell',
            price: 3180.25,
            amount: 1.1,
            fee: 1.75
          }
        ]
      },
      {
        id: '3',
        name: 'AAPL Day Trade',
        note: 'Loss trade, bad entry timing and market conditions',
        stocks: 10,
        coins: 0,
        pairs: 1,
        credited: 1520.30,
        debited: 1555.00,
        total: -34.70,
        credited_trades: 2,
        debited_trades: 2,
        total_trades: 4,
        timestamp_open: '2024-06-03 09:45:00',
        timestamp_closed: '2024-06-03 16:00:00',
        duration: '6h 15m',
        trades: [
          {
            uuid: '9',
            order: 'ORD009',
            datetime: '2024-06-03 09:45:15',
            stock: 'AAPL',
            symbol: 'AAPL/USD',
            type: 'market',
            side: 'buy',
            price: 155.50,
            amount: 5,
            fee: 0.78
          },
          {
            uuid: '10',
            order: 'ORD010',
            datetime: '2024-06-03 11:20:20',
            stock: 'AAPL',
            symbol: 'AAPL/USD',
            type: 'limit',
            side: 'buy',
            price: 155.00,
            amount: 5,
            fee: 0.77
          },
          {
            uuid: '11',
            order: 'ORD011',
            datetime: '2024-06-03 15:30:45',
            stock: 'AAPL',
            symbol: 'AAPL/USD',
            type: 'market',
            side: 'sell',
            price: 152.15,
            amount: 5,
            fee: 0.76
          },
          {
            uuid: '12',
            order: 'ORD012',
            datetime: '2024-06-03 16:00:12',
            stock: 'AAPL',
            symbol: 'AAPL/USD',
            type: 'limit',
            side: 'sell',
            price: 152.40,
            amount: 5,
            fee: 0.76
          }
        ]
      }
    ];

    setDeals(mockDeals);
  }, []);

  const handleSelectDeal = (dealId: string) => {
    setSelectedDealId(dealId);
    setViewMode('details');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedDealId(null);
  };

  const handleAddDeal = () => {
    const newDeal: Deal = {
      id: Date.now().toString(),
      name: 'New Deal',
      note: '',
      stocks: 0,
      coins: 0,
      pairs: 0,
      credited: 0,
      debited: 0,
      total: 0,
      credited_trades: 0,
      debited_trades: 0,
      total_trades: 0,
      timestamp_open: new Date().toISOString().slice(0, 19).replace('T', ' '),
      timestamp_closed: '',
      duration: '0m',
      trades: []
    };

    setDeals(prev => [...prev, newDeal]);
    setSelectedDealId(newDeal.id);
    setViewMode('details');
  };

  const handleEditDeal = (dealId: string) => {
    setSelectedDealId(dealId);
    setViewMode('details');
  };

  const handleDeleteDeal = (dealId: string) => {
    setDeals(prev => prev.filter(deal => deal.id !== dealId));
    if (selectedDealId === dealId) {
      handleBackToList();
    }
  };

  const handleUpdateDeal = (updatedDeal: Deal) => {
    setDeals(prev => prev.map(deal => 
      deal.id === updatedDeal.id ? updatedDeal : deal
    ));
  };

  const handleDeleteTrade = (trade: DealTrade) => {
    console.log('Trade removed from deal:', trade.uuid);
  };

  const handleAddTrades = (trades: any[]) => {
    console.log('Trades added to deal:', trades.length);
  };

  const selectedDeal = deals.find(deal => deal.id === selectedDealId);

  if (viewMode === 'details' && selectedDeal) {
    return (
      <DealDetails
        deal={selectedDeal}
        onBack={handleBackToList}
        onUpdateDeal={handleUpdateDeal}
        onDeleteTrade={handleDeleteTrade}
        onAddTrades={handleAddTrades}
      />
    );
  }

  return (
    <DealsList
      deals={deals}
      onSelectDeal={handleSelectDeal}
      onAddDeal={handleAddDeal}
      onEditDeal={handleEditDeal}
      onDeleteDeal={handleDeleteDeal}
    />
  );
};

export default DealsWidget; 