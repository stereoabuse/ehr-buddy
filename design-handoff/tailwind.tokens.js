// design-handoff/tailwind.tokens.js
//
// Spread this into the `theme.extend` block of your tailwind.config.js:
//
//   const tokens = require('./design-handoff/tailwind.tokens.js');
//   module.exports = {
//     content: [...],
//     theme: { extend: tokens },
//     plugins: [],
//   };
//
// Then use utilities: bg-canvas, text-ink, border-hairline, bg-primary, etc.

module.exports = {
  colors: {
    // Ink scale
    ink:        '#1E2230',
    'ink-2':    '#2D3242',
    body:       '#4B5267',
    muted:      '#7A8095',
    faint:      '#A8AEC0',

    // Surfaces
    surface:    '#FFFFFF',
    canvas:     '#F2F3F7',
    'canvas-2': '#F8F9FC',
    hairline:   '#E2E4EC',
    divider:    '#ECEEF4',

    // Sidebar
    sidebar: {
      DEFAULT: '#2A2F3D',
      ink:     '#E4E6EE',
      muted:   '#8E94A6',
      hover:   '#3A4054',
    },

    // Brand / accent
    primary: {
      DEFAULT: '#7A89B8',
      dark:    '#5E6E9D',
      soft:    '#E5E9F4',
    },
    accent:  '#8C7AA8',

    // Semantic
    danger:  { DEFAULT: '#B5524F', soft: '#F5E2E0' },
    warn:    { DEFAULT: '#A88044', soft: '#F2E8D5' },
    success: { DEFAULT: '#6B8E7E', soft: '#E2EDE7' },
  },

  fontFamily: {
    sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif'],
    head: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif'],
  },

  fontSize: {
    // Slightly tighter than Tailwind defaults — closer to Mac-native UI
    'xs':    ['11px', { lineHeight: '15px' }],
    'sm':    ['12px', { lineHeight: '17px' }],
    'base':  ['13px', { lineHeight: '19px' }],
    'md':    ['14px', { lineHeight: '20px' }],
    'lg':    ['15px', { lineHeight: '22px' }],
    'xl':    ['18px', { lineHeight: '24px' }],
    '2xl':   ['22px', { lineHeight: '28px' }],
    '3xl':   ['28px', { lineHeight: '34px' }],
  },

  borderRadius: {
    sm: '5px',
    md: '7px',
    lg: '10px',
    xl: '14px',
  },

  boxShadow: {
    card: '0 1px 0 rgba(30,34,48,0.04), 0 0 0 0.5px #E2E4EC',
    pop:  '0 8px 24px rgba(30,34,48,0.10), 0 0 0 0.5px #E2E4EC',
  },

  // Density-aware spacing helpers (use as h-row, py-row-cell, etc. via plugin or inline)
  spacing: {
    'row-compact': '40px',
    'row-comfy':   '48px',
    'row-cozy':    '56px',
  },
};
