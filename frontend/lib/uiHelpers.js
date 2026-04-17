export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function dayLabel(dayIndex) {
  return DAY_NAMES[Number(dayIndex)] || `Day ${dayIndex}`;
}

export function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (!size) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  let current = size;
  let unitIdx = 0;
  while (current >= 1024 && unitIdx < units.length - 1) {
    current /= 1024;
    unitIdx += 1;
  }
  return `${current.toFixed(unitIdx === 0 ? 0 : 1)} ${units[unitIdx]}`;
}
