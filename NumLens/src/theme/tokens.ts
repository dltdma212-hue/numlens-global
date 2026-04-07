/**
 * Jony Ive Design Tokens
 * Focuses on 'Natural Minimalism' and 'Glassmorphism'.
 * High-tech but invisible.
 */
export const tokens = {
  colors: {
    accent: '#007AFF', // Pure iOS Blue
    white: '#FFFFFF',
    black: '#000000',
    glass: 'rgba(255, 255, 255, 0.15)', // Glassmorphism base
    glassBorder: 'rgba(255, 255, 255, 0.3)',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.6)',
  },
  typography: {
    fontFamily: 'Inter-Light', // If available, fallback to sans-serif
    titleSize: 48,
    labelSize: 14,
    weightLight: '300',
    weightBold: '700',
  },
  blur: {
    intensity: 10,
  },
  spacing: {
    padding: 24,
    margin: 16,
    borderRadius: 20,
  }
};
