import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-elev': 'var(--bg-elev)',
        fg: 'var(--fg)',
        'fg-strong': 'var(--fg-strong)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-soft': 'var(--accent-soft)',
        'accent-soft-hover': 'var(--accent-soft-hover)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        panel: 'var(--panel)',
        hover: 'var(--hover)',
        coral: {
          DEFAULT: '#c46b4d',
          light: '#e08a6c',
          soft: '#e8b5a0',
        },
        warm: '#faf6ec',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(31,26,20,0.04)',
        panel: '0 1px 2px rgba(31,26,20,0.04), 0 4px 16px rgba(31,26,20,0.06)',
        float: '0 1px 3px rgba(31,26,20,0.05), 0 8px 24px rgba(31,26,20,0.06)',
        lift: '0 2px 6px rgba(31,26,20,0.06), 0 12px 32px rgba(31,26,20,0.08)',
      },
      transitionDuration: {
        DEFAULT: '180ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
