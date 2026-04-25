/** @type {import('tailwindcss').Config} */
// Tokens mirror design-handoff/tailwind.tokens.js — keep in sync.
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:        '#1E2230',
        'ink-2':    '#2D3242',
        body:       '#4B5267',
        muted:      '#7A8095',
        faint:      '#A8AEC0',

        surface:    '#FFFFFF',
        canvas:     '#F2F3F7',
        'canvas-2': '#F8F9FC',
        hairline:   '#E2E4EC',
        divider:    '#ECEEF4',

        sidebar: {
          DEFAULT: '#2A2F3D',
          ink:     '#E4E6EE',
          muted:   '#8E94A6',
          hover:   '#3A4054'
        },

        primary: {
          DEFAULT: '#7A89B8',
          dark:    '#5E6E9D',
          soft:    '#E5E9F4'
        },
        accent:  '#8C7AA8',

        danger:  { DEFAULT: '#B5524F', soft: '#F5E2E0' },
        warn:    { DEFAULT: '#A88044', soft: '#F2E8D5' },
        success: { DEFAULT: '#6B8E7E', soft: '#E2EDE7' }
      },

      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif'],
        head: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif']
      },

      fontSize: {
        xs:   ['11px', { lineHeight: '15px' }],
        sm:   ['12px', { lineHeight: '17px' }],
        base: ['13px', { lineHeight: '19px' }],
        md:   ['14px', { lineHeight: '20px' }],
        lg:   ['15px', { lineHeight: '22px' }],
        xl:   ['18px', { lineHeight: '24px' }],
        '2xl': ['22px', { lineHeight: '28px' }],
        '3xl': ['28px', { lineHeight: '34px' }]
      },

      borderRadius: {
        sm: '5px',
        md: '7px',
        lg: '10px',
        xl: '14px'
      },

      boxShadow: {
        card: '0 1px 0 rgba(30,34,48,0.04), 0 0 0 0.5px #E2E4EC',
        pop:  '0 8px 24px rgba(30,34,48,0.10), 0 0 0 0.5px #E2E4EC'
      },

      spacing: {
        'row-compact': '40px',
        'row-comfy':   '48px',
        'row-cozy':    '56px'
      }
    }
  },
  plugins: []
}
