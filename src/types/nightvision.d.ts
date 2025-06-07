declare module 'night-vision' {
  export interface NightVisionColors {
    back?: string;
    grid?: string;
  }

  export interface NightVisionOverlaySettings {
    precision?: number;
    colorCandleUp?: string;
    colorCandleDw?: string;
    colorWickUp?: string;
    colorWickDw?: string;
    colorVolUp?: string;
    colorVolDw?: string;
    lineWidth?: number;
    color?: string;
    colors?: string[];
    barsHeight?: number;
    currencySymbol?: string;
  }

  export interface NightVisionOverlayProps {
    showVolume?: boolean;
    colorCandleUp?: string;
    colorCandleDw?: string;
    colorWickUp?: string;
    colorWickDw?: string;
    colorVolUp?: string;
    colorVolDw?: string;
  }

  export interface NightVisionOverlay {
    name: string;
    type: string;
    data: number[][];
    main?: boolean;
    props?: NightVisionOverlayProps;
    settings?: NightVisionOverlaySettings;
  }

  export interface NightVisionPane {
    overlays: NightVisionOverlay[];
    settings?: {
      height?: number;
    };
  }

  export interface NightVisionData {
    panes: NightVisionPane[];
  }

  export interface NightVisionProps {
    width?: number;
    height?: number;
    colors?: NightVisionColors;
    autoResize?: boolean;
    scripts?: string[];
    data?: NightVisionData;
  }

  export interface Script {
    id: string;
    name: string;
    code: string;
  }

  export interface Scripts {
    findByName?(name: string): Script | undefined;
    add(code: string): Script;
    remove(script: Script): void;
    list(): Script[];
  }

  export class NightVision {
    constructor(elementId: string, props: NightVisionProps);
    data: NightVisionData;
    props?: NightVisionProps;
    scripts?: Scripts;
    update(type?: 'data' | 'range' | 'legend'): void;
    destroy(): void;
  }
} 