# Theming

## Overview

Profitmaker uses Tailwind CSS with CSS custom properties (HSL values) for theming. Dark mode is the default. Light mode is supported via the `class` strategy.

## Dark/Light Mode

Controlled by the `dark` class on the `<html>` element (Tailwind `darkMode: ["class"]`). The `next-themes` library handles toggling and persistence.

## CSS Variables

All theme colors are defined in `src/index.css` as HSL values (without the `hsl()` wrapper). They're consumed via Tailwind utilities.

### shadcn/ui Variables (Standard)

These are the standard shadcn/ui color tokens:

| Variable | Light | Dark | Usage |
|----------|-------|------|-------|
| `--background` | White | Dark gray | Page background |
| `--foreground` | Dark text | Light text | Default text color |
| `--card` | White | Dark surface | Card backgrounds |
| `--primary` | Brand color | Brand color | Primary buttons, links |
| `--secondary` | Light gray | Medium gray | Secondary elements |
| `--muted` | Light gray | Dark gray | Muted backgrounds |
| `--destructive` | Red | Red | Destructive actions |
| `--accent` | Light accent | Dark accent | Accent elements |
| `--border` | Light border | Dark border | Borders |
| `--input` | Input border | Input border | Form input borders |
| `--ring` | Focus ring | Focus ring | Focus indicators |
| `--popover` | White | Dark | Popover/dropdown backgrounds |

### Terminal Palette (Custom)

These are custom variables specific to the trading terminal:

| Variable | Light Value | Dark Value | Usage |
|----------|-------------|------------|-------|
| `--terminal-bg` | `#F7F9FB` | `#181B20` | Terminal canvas background |
| `--terminal-widget` | `#FFFFFF` | `#23272F` | Widget background |
| `--terminal-accent` | `#F1F5F9` | `#242D39` | Widget accent/hover |
| `--terminal-text` | `#0F1419` | `#F7FAFC` | Primary text |
| `--terminal-muted` | `#2D3748` | `#B8C4D0` | Secondary/muted text |
| `--terminal-positive` | `#16C784` | `#16C784` | Positive values (green) |
| `--terminal-negative` | `#EA3943` | `#EA3943` | Negative values (red) |
| `--terminal-border` | `#E2E8F0` | `#343A46` | Widget borders |

### Using Terminal Colors in Components

In Tailwind classes:

```html
<div className="bg-terminal-widget text-terminal-text border-terminal-border">
  <span className="text-terminal-positive">+2.5%</span>
  <span className="text-terminal-negative">-1.3%</span>
  <span className="text-terminal-muted">Volume: 1.2M</span>
</div>
```

In raw CSS:

```css
.my-element {
  background-color: hsl(var(--terminal-widget));
  color: hsl(var(--terminal-text));
}
```

With alpha:

```css
.overlay {
  background: hsla(var(--terminal-widget), 0.8);
  border: 1px solid hsla(var(--terminal-border), 0.5);
}
```

## Tailwind Configuration

The terminal color tokens are registered in `tailwind.config.ts`:

```typescript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      terminal: {
        bg: 'hsl(var(--terminal-bg))',
        widget: 'hsl(var(--terminal-widget))',
        accent: 'hsl(var(--terminal-accent))',
        text: 'hsl(var(--terminal-text))',
        muted: 'hsl(var(--terminal-muted))',
        positive: 'hsl(var(--terminal-positive))',
        negative: 'hsl(var(--terminal-negative))',
        border: 'hsl(var(--terminal-border))',
      }
    }
  }
}
```

## Animations

Custom animations defined in `tailwind.config.ts`:

| Animation | CSS Class | Description |
|-----------|-----------|-------------|
| `accordion-down` | `animate-accordion-down` | Accordion open |
| `accordion-up` | `animate-accordion-up` | Accordion close |
| `fade-in` | `animate-fade-in` | Fade in + slide up |
| `fade-out` | `animate-fade-out` | Fade out + slide down |
| `scale-in` | `animate-scale-in` | Scale from 0.95 to 1 |
| `float` | `animate-float` | Gentle floating (infinite) |
| `pulse-gentle` | `animate-pulse-gentle` | Subtle opacity pulse |
| `enter` | `animate-enter` | Combined fade-in + scale-in |
| `exit` | `animate-exit` | Combined fade-out + scale-out |

## shadcn/ui Components

The project uses shadcn/ui components located in `src/components/ui/`. These are unstyled by default and pick up the CSS variable theme.

Component configuration is in `components.json` at the project root.

Key utility: `cn()` from `src/lib/utils.ts` -- merges Tailwind classes with proper conflict resolution (clsx + tailwind-merge).

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  "p-4 rounded-md",
  isActive && "bg-terminal-accent",
  className
)} />
```

## Customizing the Theme

### Change existing colors

Edit the CSS variables in `src/index.css`:

```css
:root {
  --terminal-positive: 120 80% 45%;  /* different green */
}

.dark {
  --terminal-positive: 120 80% 45%;
}
```

### Add new terminal colors

1. Add the CSS variable in `src/index.css` (both `:root` and `.dark`)
2. Register in `tailwind.config.ts` under `theme.extend.colors.terminal`
3. Use via `text-terminal-yourcolor` or `bg-terminal-yourcolor`

### Widget styling conventions

- Widget background: `bg-terminal-widget`
- Widget border: `border-terminal-border`
- Primary text: `text-terminal-text`
- Secondary text: `text-terminal-muted`
- Positive numbers: `text-terminal-positive`
- Negative numbers: `text-terminal-negative`
- Hover states: `bg-terminal-accent`
- Scrollbars: Custom-styled via CSS in `index.css` using terminal variables
