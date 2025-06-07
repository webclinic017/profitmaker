
import { GuideLineType, CalculateGuidesOptions, EdgePositions, HorizontalPositions } from '@/types/alignmentGuides';

// Calculate container boundary guides
export const calculateContainerGuides = (
  options: CalculateGuidesOptions
): GuideLineType[] => {
  const { containerRect, currentRect, snapThreshold } = options;
  const guides: GuideLineType[] = [];
  
  // Container boundaries
  const containerLeft = 0;
  const containerTop = 0;
  const containerRight = containerRect.width;
  const containerBottom = containerRect.height;
  
  // The current widget's edges
  const currentLeft = currentRect.left - containerRect.left;
  const currentRight = currentLeft + currentRect.width;
  const currentTop = currentRect.top - containerRect.top;
  const currentBottom = currentTop + currentRect.height;
  
  // Left edge
  if (Math.abs(currentLeft - containerLeft) <= snapThreshold) {
    guides.push({
      position: containerLeft,
      orientation: 'vertical',
      length: containerBottom,
      start: 0
    });
  }
  
  // Right edge
  if (Math.abs(currentRight - containerRight) <= snapThreshold) {
    guides.push({
      position: containerRight,
      orientation: 'vertical',
      length: containerBottom,
      start: 0
    });
  }
  
  // Top edge
  if (Math.abs(currentTop - containerTop) <= snapThreshold) {
    guides.push({
      position: containerTop,
      orientation: 'horizontal',
      length: containerRight,
      start: 0
    });
  }
  
  // Bottom edge
  if (Math.abs(currentBottom - containerBottom) <= snapThreshold) {
    guides.push({
      position: containerBottom,
      orientation: 'horizontal',
      length: containerRight,
      start: 0
    });
  }
  
  return guides;
};

// Calculate alignment guides with other widgets
export const calculateWidgetAlignmentGuides = (
  options: CalculateGuidesOptions
): GuideLineType[] => {
  const { widgets, containerRect, currentWidgetId, currentRect, snapThreshold } = options;
  const guides: GuideLineType[] = [];
  
  // The current widget's edges
  const currentLeft = currentRect.left - containerRect.left;
  const currentRight = currentLeft + currentRect.width;
  const currentTop = currentRect.top - containerRect.top;
  const currentBottom = currentTop + currentRect.height;
  const currentCenterX = currentLeft + currentRect.width / 2;
  const currentCenterY = currentTop + currentRect.height / 2;
  
  // For each other widget, check if any edges align
  widgets.forEach(widget => {
    if (widget.id === currentWidgetId) return;
    
    // Get the DOM element for this widget
    const widgetElement = document.getElementById(`widget-${widget.id}`);
    if (!widgetElement) return;
    
    // Convert to container coordinates
    const widgetLeft = widget.position.x;
    const widgetRight = widget.position.x + widget.size.width;
    const widgetTop = widget.position.y;
    const widgetBottom = widget.position.y + widget.size.height;
    const widgetCenterX = widgetLeft + widget.size.width / 2;
    const widgetCenterY = widgetTop + widget.size.height / 2;
    
    // Vertical alignments
    addVerticalGuides(
      guides, 
      { 
        currentLeft, 
        currentRight, 
        currentCenterX, 
        currentTop, 
        currentBottom,
        widgetLeft,
        widgetRight,
        widgetCenterX,
        widgetTop,
        widgetBottom
      },
      { 
        widgetLeft, 
        widgetRight, 
        widgetCenterX, 
        widgetTop, 
        widgetBottom,
        currentLeft,
        currentRight,
        currentCenterX,
        currentTop,
        currentBottom
      },
      snapThreshold
    );
    
    // Horizontal alignments
    addHorizontalGuides(
      guides,
      { 
        currentTop, 
        currentBottom, 
        currentCenterY, 
        currentLeft, 
        currentRight,
        widgetTop,
        widgetBottom,
        widgetCenterY,
        widgetLeft,
        widgetRight
      },
      { 
        widgetTop, 
        widgetBottom, 
        widgetCenterY, 
        widgetLeft, 
        widgetRight,
        currentTop,
        currentBottom,
        currentCenterY,
        currentLeft,
        currentRight
      },
      snapThreshold
    );
  });
  
  return guides;
};

// Helper function to add vertical alignment guides
const addVerticalGuides = (
  guides: GuideLineType[],
  current: EdgePositions,
  widget: EdgePositions,
  snapThreshold: number
) => {
  const { currentLeft, currentRight, currentCenterX, currentTop, currentBottom } = current;
  const { widgetLeft, widgetRight, widgetCenterX, widgetTop, widgetBottom } = widget;
  
  // Left edge to left edge
  if (Math.abs(currentLeft - widgetLeft) <= snapThreshold) {
    guides.push({
      position: widgetLeft,
      orientation: 'vertical',
      length: Math.max(widgetBottom, currentBottom) - Math.min(widgetTop, currentTop),
      start: Math.min(widgetTop, currentTop)
    });
  }
  
  // Right edge to right edge
  if (Math.abs(currentRight - widgetRight) <= snapThreshold) {
    guides.push({
      position: widgetRight,
      orientation: 'vertical',
      length: Math.max(widgetBottom, currentBottom) - Math.min(widgetTop, currentTop),
      start: Math.min(widgetTop, currentTop)
    });
  }
  
  // Left edge to right edge
  if (Math.abs(currentLeft - widgetRight) <= snapThreshold) {
    guides.push({
      position: widgetRight,
      orientation: 'vertical',
      length: Math.max(widgetBottom, currentBottom) - Math.min(widgetTop, currentTop),
      start: Math.min(widgetTop, currentTop)
    });
  }
  
  // Right edge to left edge
  if (Math.abs(currentRight - widgetLeft) <= snapThreshold) {
    guides.push({
      position: widgetLeft,
      orientation: 'vertical',
      length: Math.max(widgetBottom, currentBottom) - Math.min(widgetTop, currentTop),
      start: Math.min(widgetTop, currentTop)
    });
  }
  
  // Center alignment
  if (Math.abs(currentCenterX - widgetCenterX) <= snapThreshold) {
    const centerPosition = widgetCenterX;
    guides.push({
      position: centerPosition,
      orientation: 'vertical',
      length: Math.max(widgetBottom, currentBottom) - Math.min(widgetTop, currentTop),
      start: Math.min(widgetTop, currentTop)
    });
  }
};

// Helper function to add horizontal alignment guides
const addHorizontalGuides = (
  guides: GuideLineType[],
  current: HorizontalPositions,
  widget: HorizontalPositions,
  snapThreshold: number
) => {
  const { currentTop, currentBottom, currentCenterY, currentLeft, currentRight } = current;
  const { widgetTop, widgetBottom, widgetCenterY, widgetLeft, widgetRight } = widget;
  
  // Top edge to top edge
  if (Math.abs(currentTop - widgetTop) <= snapThreshold) {
    guides.push({
      position: widgetTop,
      orientation: 'horizontal',
      length: Math.max(widgetRight, currentRight) - Math.min(widgetLeft, currentLeft),
      start: Math.min(widgetLeft, currentLeft)
    });
  }
  
  // Bottom edge to bottom edge
  if (Math.abs(currentBottom - widgetBottom) <= snapThreshold) {
    guides.push({
      position: widgetBottom,
      orientation: 'horizontal',
      length: Math.max(widgetRight, currentRight) - Math.min(widgetLeft, currentLeft),
      start: Math.min(widgetLeft, currentLeft)
    });
  }
  
  // Top edge to bottom edge
  if (Math.abs(currentTop - widgetBottom) <= snapThreshold) {
    guides.push({
      position: widgetBottom,
      orientation: 'horizontal',
      length: Math.max(widgetRight, currentRight) - Math.min(widgetLeft, currentLeft),
      start: Math.min(widgetLeft, currentLeft)
    });
  }
  
  // Bottom edge to top edge
  if (Math.abs(currentBottom - widgetTop) <= snapThreshold) {
    guides.push({
      position: widgetTop,
      orientation: 'horizontal',
      length: Math.max(widgetRight, currentRight) - Math.min(widgetLeft, currentLeft),
      start: Math.min(widgetLeft, currentLeft)
    });
  }
  
  // Center alignment
  if (Math.abs(currentCenterY - widgetCenterY) <= snapThreshold) {
    const centerPosition = widgetCenterY;
    guides.push({
      position: centerPosition,
      orientation: 'horizontal',
      length: Math.max(widgetRight, currentRight) - Math.min(widgetLeft, currentLeft),
      start: Math.min(widgetLeft, currentLeft)
    });
  }
};
