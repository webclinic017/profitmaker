import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeColors {
  bg: string;
  widget: string;
  accent: string;
  text: string;
  muted: string;
  positive: string;
  negative: string;
  border: string;
}

interface ThemeContextType {
  theme: Theme;
  themeVariant: string;
  toggleTheme: () => void;
  setThemeVariant: (variant: string, colors: ThemeColors) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Updated colors for modern themes (HSL for Tailwind)
const modernDarkColors: ThemeColors = {
  bg: '220 13% 11%',              // #181B20 deep graphite
  widget: '222 16% 16%',          // #23272F dark gray for panels
  accent: '217 29% 16%',          // #242D39 for hover/selection
  text: '210 40% 98%',            // #F7FAFC almost white text
  muted: '210 13% 69%',           // #A0AEC0 light gray for secondary text
  positive: '152 77% 43%',        // #16C784 bright green (buy)
  negative: '356 77% 57%',        // #EA3943 bright red (sell)
  border: '220 21% 23%'           // #2D3748 dark gray for borders
};

const modernLightColors: ThemeColors = {
  bg: '210 28% 98%',              // #F7F9FB light background
  widget: '0 0% 100%',            // #FFFFFF white for panels
  accent: '210 28% 96%',          // #F1F5F9 light gray for selection
  text: '222 44% 14%',            // #1A202C dark gray text
  muted: '220 15% 35%',           // #4A5568 gray for secondary text
  positive: '152 77% 43%',        // #16C784 bright green (buy)
  negative: '356 77% 57%',        // #EA3943 bright red (sell)
  border: '210 28% 90%'           // #E2E8F0 light gray for borders
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme;
    console.log('🎨 Theme Provider: Loading saved theme:', saved);
    return saved || 'dark';
  });

  const [themeVariant, setThemeVariantState] = useState<string>(() => {
    const saved = localStorage.getItem('themeVariant');
    console.log('🎨 Theme Provider: Loading saved variant:', saved);
    return saved || (theme === 'dark' ? 'dark' : 'light');
  });

  const applyThemeColors = (colors: ThemeColors) => {
    console.log('🎨 Applying theme colors:', colors);
    const root = document.documentElement;
    
    // Apply colors directly
    Object.entries(colors).forEach(([key, value]) => {
      const cssVar = `--terminal-${key}`;
      console.log(`🎨 Setting ${cssVar}: ${value}`);
      root.style.setProperty(cssVar, value);
    });
    
    // Force update styles
    root.style.setProperty('--terminal-bg', colors.bg);
    root.style.setProperty('--terminal-widget', colors.widget);
    root.style.setProperty('--terminal-accent', colors.accent);
    root.style.setProperty('--terminal-text', colors.text);
    root.style.setProperty('--terminal-muted', colors.muted);
    root.style.setProperty('--terminal-positive', colors.positive);
    root.style.setProperty('--terminal-negative', colors.negative);
    root.style.setProperty('--terminal-border', colors.border);
    
    // Verify application
    setTimeout(() => {
      const computedStyle = getComputedStyle(root);
      console.log('🎨 Verification - Applied CSS variables:');
      Object.keys(colors).forEach(key => {
        const cssVar = `--terminal-${key}`;
        const appliedValue = computedStyle.getPropertyValue(cssVar).trim();
        console.log(`🎨 ${cssVar}: ${appliedValue}`);
      });
    }, 100);
  };

  useEffect(() => {
    console.log('🎨 Theme effect triggered - theme:', theme);
    
    // Apply theme class
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
    
    // Apply modern colors immediately
    const modernColors = theme === 'dark' ? modernDarkColors : modernLightColors;
    applyThemeColors(modernColors);
    
    // Update theme variant
    const newVariant = theme === 'dark' ? 'dark' : 'light';
    setThemeVariantState(newVariant);
    localStorage.setItem('themeVariant', newVariant);
    
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    console.log('🎨 Toggling theme from', theme, 'to', newTheme);
    setTheme(newTheme);
  };

  const setThemeVariant = (variant: string, colors: ThemeColors) => {
    console.log('🎨 Setting theme variant:', variant, 'with colors:', colors);
    setThemeVariantState(variant);
    applyThemeColors(colors);
    localStorage.setItem('themeVariant', variant);
    localStorage.setItem(`themeColors_${variant}`, JSON.stringify(colors));
    console.log('🎨 Saved variant and colors to localStorage');
  };

  return (
    <ThemeContext.Provider value={{ theme, themeVariant, toggleTheme, setThemeVariant }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
