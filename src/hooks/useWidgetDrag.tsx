
import { useState, useEffect, useRef, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface SnapResult {
  x: number | null;
  y: number | null;
}

interface UseDraggableOptions {
  initialPosition: Position;
  initialSize: Size;
  onPositionChange?: (position: Position) => void;
  onSizeChange?: (size: Size) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  onWidgetMove?: (id: string, rect: DOMRect) => SnapResult;
  onWidgetResize?: (id: string, rect: DOMRect) => SnapResult;
  widgetId: string;
  minWidth?: number;
  minHeight?: number;
  bounds?: { left: number; top: number; right: number; bottom: number };
  disableSnapping?: boolean;
}

export const useWidgetDrag = ({
  initialPosition,
  initialSize,
  onPositionChange,
  onSizeChange,
  onDragStart,
  onDragEnd,
  onResizeStart,
  onResizeEnd,
  onWidgetMove,
  onWidgetResize,
  widgetId,
  minWidth = 200,
  minHeight = 150,
  bounds,
  disableSnapping = false,
}: UseDraggableOptions) => {
  const [position, setPosition] = useState<Position>(initialPosition);
  const [size, setSize] = useState<Size>(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const elementStartPos = useRef<{ x: number; y: number } | null>(null);
  const resizeStartSize = useRef<{ width: number; height: number } | null>(null);
  const resizeStartPos = useRef<{ x: number; y: number } | null>(null);
  const widgetElement = useRef<HTMLElement | null>(null);

  // Set up refs to track mouse position for dragging and resizing
  useEffect(() => {
    // Function to get the widget element reference
    const getWidgetElement = () => {
      if (!widgetElement.current) {
        widgetElement.current = document.getElementById(`widget-${widgetId}`);
      }
      return widgetElement.current;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && dragStartPos.current && elementStartPos.current) {
        const deltaX = e.clientX - dragStartPos.current.x;
        const deltaY = e.clientY - dragStartPos.current.y;
        
        let newX = elementStartPos.current.x + deltaX;
        let newY = elementStartPos.current.y + deltaY;
        
        // Get current widget element
        const element = getWidgetElement();
        
        // If we have the element and the onWidgetMove callback for snapping
        if (element && onWidgetMove && !disableSnapping && !e.altKey) {
          // Create a hypothetical DOMRect for the widget in its new position
          const hypotheticalRect = new DOMRect(
            newX, 
            newY, 
            size.width, 
            size.height
          );
          
          // Get snap points, if any
          const snapResult = onWidgetMove(widgetId, hypotheticalRect);
          
          // Apply snapping
          if (snapResult.x !== null) {
            newX = snapResult.x;
          }
          
          if (snapResult.y !== null) {
            newY = snapResult.y;
          }
        }
        
        // Apply bounds if specified
        if (bounds) {
          newX = Math.max(bounds.left, Math.min(newX, bounds.right - size.width));
          newY = Math.max(bounds.top, Math.min(newY, bounds.bottom - size.height));
        }
        
        setPosition({ x: newX, y: newY });
        onPositionChange?.({ x: newX, y: newY });
      }
      
      if (isResizing && resizeStartSize.current && resizeStartPos.current) {
        const deltaX = e.clientX - resizeStartPos.current.x;
        const deltaY = e.clientY - resizeStartPos.current.y;
        
        let newWidth = Math.max(minWidth, resizeStartSize.current.width + deltaX);
        let newHeight = Math.max(minHeight, resizeStartSize.current.height + deltaY);
        
        // Get current widget element
        const element = getWidgetElement();
        
        // If we have the element and the onWidgetResize callback for snapping during resize
        if (element && onWidgetResize && !disableSnapping && !e.altKey) {
          // Create a hypothetical DOMRect for the widget with its new size
          const hypotheticalRect = new DOMRect(
            position.x, 
            position.y, 
            newWidth, 
            newHeight
          );
          
          // Get snap points, if any
          const snapResult = onWidgetResize(widgetId, hypotheticalRect);
          
          // Apply snapping for right edge (width)
          if (snapResult.x !== null) {
            newWidth = snapResult.x - position.x;
          }
          
          // Apply snapping for bottom edge (height)
          if (snapResult.y !== null) {
            newHeight = snapResult.y - position.y;
          }
        }
        
        // Check if the new size would exceed bounds
        if (bounds) {
          const rightBoundary = bounds.right - position.x;
          const bottomBoundary = bounds.bottom - position.y;
          
          const boundedWidth = Math.min(newWidth, rightBoundary);
          const boundedHeight = Math.min(newHeight, bottomBoundary);
          
          setSize({ width: boundedWidth, height: boundedHeight });
          onSizeChange?.({ width: boundedWidth, height: boundedHeight });
        } else {
          setSize({ width: newWidth, height: newHeight });
          onSizeChange?.({ width: newWidth, height: newHeight });
        }
      }
    };
    
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        onDragEnd?.();
      }
      
      if (isResizing) {
        setIsResizing(false);
        onResizeEnd?.();
      }
      
      dragStartPos.current = null;
      elementStartPos.current = null;
      resizeStartSize.current = null;
      resizeStartPos.current = null;
    };
    
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isDragging, 
    isResizing, 
    onDragEnd, 
    onPositionChange, 
    onResizeEnd, 
    onSizeChange, 
    bounds, 
    minHeight, 
    minWidth, 
    position.x, 
    position.y, 
    size.width, 
    size.height,
    onWidgetMove,
    onWidgetResize,
    widgetId,
    disableSnapping
  ]);
  
  const handleDragStart = (e: React.MouseEvent) => {
    // Alt key to temporarily disable snapping
    if (e.altKey) {
      console.log("Snapping temporarily disabled with Alt key");
    }
    
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    elementStartPos.current = { ...position };
    onDragStart?.();
    
    // Get widget element reference
    if (!widgetElement.current) {
      widgetElement.current = document.getElementById(`widget-${widgetId}`);
    }
  };
  
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Alt key to temporarily disable snapping
    if (e.altKey) {
      console.log("Snapping temporarily disabled with Alt key");
    }
    
    setIsResizing(true);
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    resizeStartSize.current = { ...size };
    onResizeStart?.();
    
    // Get widget element reference
    if (!widgetElement.current) {
      widgetElement.current = document.getElementById(`widget-${widgetId}`);
    }
  };
  
  return {
    position,
    size,
    isDragging,
    isResizing,
    handleDragStart,
    handleResizeStart,
    setPosition,
    setSize,
  };
};
