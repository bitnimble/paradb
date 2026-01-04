// Keep this file in sync with design_system.css
// This provides TypeScript access to design system values defined in CSS custom properties

export const colors = {
  black: '#000',
  white: '#fff',
  darkGrey: '#292929',
  grey: '#666',
  greyA30: 'rgba(102, 102, 102, 0.3)',
  greyA15: 'rgba(102, 102, 102, 0.15)',
  greyA5: 'rgba(102, 102, 102, 0.05)',
  green: '#4c4',
  red: '#f00',
  purple: '#9b15f1',
} as const;

export const metrics = {
  gridBaseline: 8, // in px
} as const;
