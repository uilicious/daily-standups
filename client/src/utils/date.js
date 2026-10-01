/**
 * Date and time parsing and formatting utilities
 * Provides consistent date handling across databases (PostgreSQL ISO strings and SQLite strings)
 */

/**
 * Safely parses any date format (ISO strings from PostgreSQL, space-separated
 * strings from SQLite, Unix timestamps, or Date objects) into a valid Date, or null.
 *
 * @param {string|number|Date} val
 * @returns {Date|null}
 */
export function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    let s = val.trim();
    // Normalize SQLite "YYYY-MM-DD HH:MM:SS" by converting space to 'T' and adding UTC 'Z'
    // (Only if it doesn't already have 'T' or timezone offsets)
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
      s = s.replace(' ', 'T') + 'Z';
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    const fallback = new Date(val);
    return isNaN(fallback.getTime()) ? null : fallback;
  }
  return null;
}

/**
 * Formats a timestamp into a 2-digit time string (e.g. "09:45 AM" or "14:30").
 * Returns an empty string if date is missing or invalid.
 *
 * @param {string|number|Date} val
 * @param {Intl.DateTimeFormatOptions} options
 * @returns {string}
 */
export function formatTime(val, options = { hour: '2-digit', minute: '2-digit' }) {
  const d = parseDate(val);
  if (!d) return '';
  return d.toLocaleTimeString([], options);
}

/**
 * Checks whether an updated timestamp is a genuine edit (> 1 minute difference from created_at).
 * Prevents false "(edited)" flags caused by database microsecond differences during inserts.
 *
 * @param {string|number|Date} createdVal
 * @param {string|number|Date} updatedVal
 * @param {number} thresholdMs Default is 60000 (1 minute)
 * @returns {boolean}
 */
export function isEdited(createdVal, updatedVal, thresholdMs = 60000) {
  if (!createdVal || !updatedVal) return false;
  const created = parseDate(createdVal)?.getTime();
  const updated = parseDate(updatedVal)?.getTime();
  if (!created || !updated) return false;
  return updated - created > thresholdMs;
}
