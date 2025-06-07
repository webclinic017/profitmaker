import React from 'react';

const BottomLeftInfo: React.FC = () => {
  return (
    <div className="fixed left-2 bottom-2 z-[5000] bg-terminal-accent/30 text-terminal-muted px-3 py-1 rounded-md flex items-center text-xs">
      <span>2 059,62 USD</span>
      <span className="mx-2">|</span>
      <span>
        Today <span className="text-terminal-negative">-1,24 USD</span> <span className="text-xs text-terminal-muted">(0,06%)</span>
      </span>
    </div>
  );
};

export default BottomLeftInfo; 