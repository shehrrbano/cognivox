const scale = 1.25;

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      spacing: {
        '0': '0px',
        '0.5': `${2 * scale}px`,
        '1': `${4 * scale}px`,
        '1.5': `${6 * scale}px`,
        '2': `${8 * scale}px`,
        '2.5': `${10 * scale}px`,
        '3': `${12 * scale}px`,
        '4': `${16 * scale}px`,
        '5': `${20 * scale}px`,
        '6': `${24 * scale}px`,
        '8': `${32 * scale}px`,
        '10': `${40 * scale}px`,
        '12': `${48 * scale}px`,
        '16': `${64 * scale}px`,
        '20': `${80 * scale}px`,
        '24': `${96 * scale}px`,
        '32': `${128 * scale}px`,
      },
      fontSize: {
        'xxs': [`${10 * scale}px`, `${14 * scale}px`],
        'xs': [`${12 * scale}px`, `${16 * scale}px`],
        'sm': [`${14 * scale}px`, `${20 * scale}px`],
        'base': [`${16 * scale}px`, `${24 * scale}px`],
        'lg': [`${18 * scale}px`, `${28 * scale}px`],
        'xl': [`${20 * scale}px`, `${28 * scale}px`],
        '2xl': [`${24 * scale}px`, `${32 * scale}px`],
        '3xl': [`${30 * scale}px`, `${36 * scale}px`],
        '4xl': [`${36 * scale}px`, `${40 * scale}px`],
      },
      borderRadius: {
        'sm': `${2 * scale}px`,
        'md': `${6 * scale}px`,
        'lg': `${8 * scale}px`,
        'xl': `${12 * scale}px`,
        '2xl': `${16 * scale}px`,
        '3xl': `${24 * scale}px`,
      },
      colors: {
        'cognivox': {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          950: '#172554',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 12px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}
