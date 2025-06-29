
import { useState, useCallback } from 'react';
import { Widget } from '@/context/WidgetContext';
import { GuideLineType } from '@/types/alignmentGuides';
import { 
  calculateContainerGuides, 
  calculateWidgetAlignmentGuides 
} from '@/utils/alignmentGuideUtils';

export const useAlignmentGuides = (
  widgets: Widget[],
  containerRef: React.RefObject<HTMLElement>,
  snapThreshold = 14
) => {
  const [guideLines, setGuideLines] = useState<GuideLineType[]>([]);
  
  // Calculate guide lines for a widget being dragged
  const calculateGuides = useCallback((
    currentWidgetId: string,
    currentRect: DOMRect,
    isResizing = false
  ) => {
    if (!containerRef.current) return [];
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const options = {
      widgets,
      containerRef,
      snapThreshold,
      containerRect,
      currentWidgetId,
      currentRect
    };
    
    // Calculate container boundary guides
    const containerGuides = calculateContainerGuides(options);
    
    // Calculate widget alignment guides
    const widgetGuides = calculateWidgetAlignmentGuides(options);
    
    // Combine all guides
    const allGuides = [...containerGuides, ...widgetGuides];
    
    setGuideLines(allGuides);
    return allGuides;
  }, [widgets, containerRef, snapThreshold]);
  
  // Find the nearest guide for snapping
  const findNearestGuide = useCallback((
    position: number,
    guides: GuideLineType[],
    orientation: 'horizontal' | 'vertical'
  ) => {
    const relevantGuides = guides.filter(g => g.orientation === orientation);
    if (relevantGuides.length === 0) return null;
    
    let nearestGuide = null;
    let minDistance = snapThreshold + 1;
    
    relevantGuides.forEach(guide => {
      const distance = Math.abs(position - guide.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearestGuide = guide;
      }
    });
    
    return nearestGuide;
  }, [snapThreshold]);
  
  // Clear guides
  const clearGuides = useCallback(() => {
    setGuideLines([]);
  }, []);
  
  return {
    guideLines,
    calculateGuides,
    findNearestGuide,
    clearGuides
  };
};
