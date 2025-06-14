import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, Search, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  loading?: boolean;
  className?: string;
  disabled?: boolean;
  optionLabels?: Record<string, string>; // Для отображения человекочитаемых названий
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = "Select option...",
  searchPlaceholder = "Search options...",
  loading = false,
  className,
  disabled = false,
  optionLabels = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Фильтрация опций по поисковому запросу
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    
    const query = searchQuery.toLowerCase();
    return options.filter(option => {
      const label = optionLabels[option] || option;
      return option.toLowerCase().includes(query) || 
             label.toLowerCase().includes(query);
    });
  }, [options, searchQuery, optionLabels]);

  // Виртуализация для больших списков (>100 элементов)
  const shouldUseVirtualization = filteredOptions.length > 100;
  
  const virtualizer = useVirtualizer({
    count: filteredOptions.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 32, // Высота элемента 32px
    enabled: shouldUseVirtualization
  });

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Фокус на поиск при открытии
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (option: string) => {
    onValueChange(option);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleToggle = () => {
    if (disabled || loading) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchQuery('');
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || loading}
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isOpen && "ring-2 ring-ring ring-offset-2"
        )}
      >
        <span className={cn(
          "truncate",
          !value && "text-muted-foreground"
        )}>
          {value ? (optionLabels[value] || value) : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            isOpen && "rotate-180"
          )} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg">
          {/* Search Input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Options List */}
          <div 
            ref={listRef}
            className="max-h-60 overflow-auto"
            style={{ 
              height: shouldUseVirtualization ? '240px' : 'auto',
              maxHeight: shouldUseVirtualization ? '240px' : '240px'
            }}
          >
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                {searchQuery ? 'Nothing found' : 'No options available'}
              </div>
            ) : shouldUseVirtualization ? (
              // Виртуализированный список для больших данных
              <div
                style={{
                  height: virtualizer.getTotalSize(),
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const option = filteredOptions[virtualItem.index];
                  const isSelected = option === value;
                  
                  return (
                    <div
                      key={virtualItem.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: virtualItem.size,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelect(option)}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                          "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                          isSelected && "bg-accent text-accent-foreground font-medium"
                        )}
                      >
                        {optionLabels[option] || option}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Обычный список для небольших данных
              filteredOptions.map((option) => {
                const isSelected = option === value;
                
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                      "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                      isSelected && "bg-accent text-accent-foreground font-medium"
                    )}
                  >
                    {optionLabels[option] || option}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer с информацией */}
          {filteredOptions.length > 0 && (
            <div className="px-3 py-1.5 border-t border-border text-xs text-muted-foreground">
                             {searchQuery ? (
                 `Found: ${filteredOptions.length} of ${options.length}`
               ) : (
                 `Total: ${options.length} options`
               )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 