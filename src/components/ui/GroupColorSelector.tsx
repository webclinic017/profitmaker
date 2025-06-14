import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import { useGroupStore } from '../../store/groupStore';
import { GroupColors } from '../../types/groups';

interface GroupColorSelectorProps {
  selectedGroupId?: string;
  onGroupSelect: (groupId: string | undefined) => void;
  className?: string;
}

const GroupColorSelector: React.FC<GroupColorSelectorProps> = ({
  selectedGroupId,
  onGroupSelect,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const [buttonPosition, setButtonPosition] = useState<{ x: number; y: number } | null>(null);
  const { 
    groups, 
    getGroupById, 
    getTransparentGroup,
    initializeDefaultGroups
  } = useGroupStore();

  // Initialize groups on first render
  React.useEffect(() => {
    initializeDefaultGroups();
  }, [initializeDefaultGroups]);

  const selectedGroup = selectedGroupId ? getGroupById(selectedGroupId) : undefined;

  const handleGroupSelect = (groupId: string | undefined) => {
    onGroupSelect(groupId);
    setIsOpen(false);
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Always open group selector popover
    const rect = e.currentTarget.getBoundingClientRect();
    setButtonPosition({
      x: rect.left,
      y: rect.bottom + window.scrollY
    });
    setIsOpen(!isOpen);
  };

  const isGroupSelected = selectedGroup && selectedGroup.color !== 'transparent';

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

  const isTransparent = !selectedGroup || selectedGroup?.color === 'transparent';

  return (
    <>
      <div className={`relative ${className}`}>
        {/* Color selector button */}
        <button
          onClick={handleButtonClick}
          className={`w-3 h-3 rounded-full transition-colors flex items-center justify-center relative ${
            isTransparent 
              ? 'border border-terminal-muted hover:border-terminal-text' 
              : 'border hover:border-terminal-accent'
          }`}
          style={{
            backgroundColor: selectedGroup?.color === 'transparent' ? 'transparent' : (selectedGroup ? selectedGroup.color : 'transparent'),
            borderColor: isTransparent ? undefined : (selectedGroup ? selectedGroup.color : 'hsl(var(--terminal-border))'),
          }}
          title={
            isGroupSelected 
              ? `Group: ${selectedGroup.name} (click to change)`
              : 'Select group color'
          }
        >
          {/* Show Plus icon for empty/transparent groups */}
          {isTransparent && (
            <Plus size={6} className="text-terminal-muted" />
          )}
        </button>
      </div>

      {/* Portal for color palette popover */}
      {isOpen && buttonPosition && createPortal(
        <>
          {/* Overlay for closing */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          
                    {/* Group list popover */}
          <div 
            className="fixed w-[500px] bg-terminal-widget border border-terminal-border rounded-md shadow-lg z-[9999]"
            style={{
              left: buttonPosition.x,
              top: buttonPosition.y + 4,
            }}
          >
            <div className="p-3">
              {/* Group list */}
              <div className="max-h-72 overflow-y-auto">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className={`group w-full flex items-start px-3 py-3 text-sm rounded hover:bg-terminal-accent/20 cursor-pointer relative ${
                      selectedGroupId === group.id ? 'bg-terminal-accent/30' : ''
                    }`}
                    onClick={() => handleGroupSelect(group.id)}
                  >
                    <div
                      className="w-3 h-3 rounded-full mr-3 flex-shrink-0 border mt-0.5"
                      style={{ 
                        backgroundColor: group.color === 'transparent' ? 'transparent' : group.color,
                        borderColor: group.color === 'transparent' ? 'hsl(var(--terminal-border))' : group.color
                      }}
                    />
                    <div className="text-left flex-1">
                      {group.account || group.exchange || group.market || group.tradingPair ? (
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2 flex-shrink-0" title="Configured" />
                            <span className="text-terminal-text font-medium">
                              {getColorName(group.color)} - Configured
                            </span>
                          </div>
                          <div className="text-xs text-terminal-muted pl-3.5">
                            {group.account && <span className="mr-2">{group.account}</span>}
                            {group.exchange && <span className="mr-2">• {group.exchange}</span>}
                            {group.market && <span className="mr-2">• {group.market}</span>}
                            {group.tradingPair && <span>• {group.tradingPair}</span>}
                          </div>
                        </div>
                      ) : (
                        <span className="text-terminal-muted">
                          {getColorName(group.color)}
                        </span>
                      )}
                    </div>
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

export default GroupColorSelector; 