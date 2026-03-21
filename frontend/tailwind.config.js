/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cyberpunk/Sci-fi color palette
        cyber: {
          dark: '#0a0a0f',
          darker: '#050508',
          card: '#0d0d14',
          border: '#1a1a2e',
          muted: '#2a2a3e',
        },
        neon: {
          cyan: '#00f0ff',
          purple: '#bf00ff',
          pink: '#ff00aa',
          blue: '#0066ff',
          green: '#00ff88',
        },
        glow: {
          cyan: 'rgba(0, 240, 255, 0.5)',
          purple: 'rgba(191, 0, 255, 0.5)',
          pink: 'rgba(255, 0, 170, 0.5)',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
        display: ['Orbitron', 'Rajdhani', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 5px #00f0ff, 0 0 10px #00f0ff, 0 0 20px rgba(0, 240, 255, 0.5)',
        'neon-purple': '0 0 5px #bf00ff, 0 0 10px #bf00ff, 0 0 20px rgba(191, 0, 255, 0.5)',
        'neon-pink': '0 0 5px #ff00aa, 0 0 10px #ff00aa, 0 0 20px rgba(255, 0, 170, 0.5)',
        'glow': '0 0 30px rgba(0, 240, 255, 0.15)',
        'glow-lg': '0 0 60px rgba(0, 240, 255, 0.2)',
        'inner-glow': 'inset 0 0 30px rgba(0, 240, 255, 0.1)',
      },
      animation: {
        'pulse-neon': 'pulseNeon 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'scan': 'scan 4s linear infinite',
        'typing': 'typing 1s steps(3) infinite',
        'gradient': 'gradient 8s ease infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'border-flow': 'borderFlow 3s linear infinite',
      },
      keyframes: {
        pulseNeon: {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%': { opacity: '0.8', filter: 'brightness(1.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        typing: {
          '0%': { opacity: '0.2' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.2' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #00f0ff, 0 0 10px #00f0ff' },
          '100%': { boxShadow: '0 0 10px #00f0ff, 0 0 20px #00f0ff, 0 0 30px rgba(0, 240, 255, 0.5)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        borderFlow: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '200% 0%' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'cyber-grid': 'linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px)',
        'cyber-gradient': 'linear-gradient(135deg, #0a0a0f 0%, #1a0a2e 50%, #0a0a0f 100%)',
        'neon-gradient': 'linear-gradient(90deg, #00f0ff, #bf00ff, #ff00aa)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}