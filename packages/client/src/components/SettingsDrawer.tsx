import React, { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  title,
  children
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex">
      {/* Backdrop */}
      <div 
        className="flex-1 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={cn(
        "w-80 bg-terminal-bg border-l border-terminal-border",
        "transform transition-transform duration-300 ease-in-out",
        "translate-x-0"
      )}>
        {/* Header */}
        <div className="h-12 px-4 py-3 bg-terminal-accent/60 flex items-center justify-between border-b border-terminal-border">
          <h2 className="text-sm font-medium text-terminal-text">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-sm hover:bg-terminal-widget/50 text-terminal-muted hover:text-terminal-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Content */}
        <div className="h-[calc(100vh-48px)] overflow-auto p-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SettingsDrawer; 