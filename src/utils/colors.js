/**
 * Helper to get color codes
 */
export function getColorCode(colorName) {
  const colors = {
    blue: '#3b82f6',
    green: '#22c55e',
    purple: '#a855f7',
    orange: '#f97316',
    red: '#ef4444',
    teal: '#14b8a6',
    gray: '#6b7280'
  };
  return colors[colorName] || colors.blue;
}






