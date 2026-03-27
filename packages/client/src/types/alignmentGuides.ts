
import { Widget } from '@/context/WidgetContext';

export interface GuideLineType {
  position: number;
  orientation: 'horizontal' | 'vertical';
  length: number;
  start: number;
}

export interface CalculateGuidesOptions {
  widgets: Widget[];
  containerRef: React.RefObject<HTMLElement>;
  snapThreshold: number;
  containerRect: DOMRect;
  currentWidgetId: string;
  currentRect: DOMRect;
}

export interface EdgePositions {
  currentLeft: number;
  currentRight: number;
  currentCenterX: number;
  currentTop: number;
  currentBottom: number;
  widgetLeft: number;
  widgetRight: number;
  widgetCenterX: number;
  widgetTop: number;
  widgetBottom: number;
}

export interface HorizontalPositions {
  currentTop: number;
  currentBottom: number;
  currentCenterY: number;
  currentLeft: number;
  currentRight: number;
  widgetTop: number;
  widgetBottom: number;
  widgetCenterY: number;
  widgetLeft: number;
  widgetRight: number;
}
