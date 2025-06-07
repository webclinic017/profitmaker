import React, { useEffect } from 'react';
import { useRightClickInfo } from '@/hooks/useRightClickInfo';

const RightClickInfo: React.FC = () => {
  const { showMessage, dismissMessage } = useRightClickInfo();

  useEffect(() => {
    if (!showMessage) return;

    const handleContextMenu = () => {
      dismissMessage();
    };

    // Add event listener for right-click
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [showMessage, dismissMessage]);

  if (!showMessage) return null;

  return (
          <div className="fixed bottom-2 left-1/2 transform -translate-x-1/2 z-[5000] bg-terminal-accent/30 text-terminal-muted px-3 py-1 rounded-md text-xs">
      <span>Right-click to add widgets</span>
    </div>
  );
};

export default RightClickInfo; 