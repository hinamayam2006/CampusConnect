/**
 * Shared frontend utility functions.
 *
 * L-1: initials()   — was duplicated in tutors/[id]/page.js and tutors/[id]/book/page.js
 * L-2: getGreeting() — was duplicated across dashboard pages
 * L-3: formatDate() / formatSchedule() — were duplicated in tutor/page.js, student/page.js, and others
 *
 * Import from here instead of defining inline.
 */

// ── String helpers ──────────────────────────────────────────────────────────

/**
 * L-1: Returns up to 2 uppercase initials from a full name.
 * @param {string} name
 * @returns {string}  e.g. "Hina Fatima" → "HF"
 */
export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// ── Date helpers ─────────────────────────────────────────────────────────────

/**
 * L-3: Format a date value as a human-readable local date+time string.
 * Falls back to the raw string if the value is not a valid date.
 *
 * @param {string | Date | null | undefined} value
 * @returns {string}
 */
export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Alias kept for backwards compatibility with dashboard pages that imported formatSchedule */
export const formatSchedule = formatDate;

/**
 * Format only the date portion (no time).
 * @param {string | Date | null | undefined} value
 * @returns {string}
 */
export function formatDateOnly(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ── UX helpers ────────────────────────────────────────────────────────────────

/**
 * L-2: Returns a time-appropriate greeting for the dashboard header.
 * @returns {"Good Morning" | "Good Afternoon" | "Good Evening"}
 */
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/**
 * Clamp a number between min and max (inclusive).
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Truncate a string to maxLength characters, appending '…' if truncated.
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(str, maxLength = 80) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}
