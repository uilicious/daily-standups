export const WEEKDAYS = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
  { id: 7, name: 'Sunday', short: 'Sun' }
];

export function getLocalDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatFullDate(dateStr) {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-');
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

export function formatShortDate(dateStr) {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-');
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

export function getEntryDaysCount(item) {
  if (!item) return 1;
  const start = item.start_date || item.date;
  const end = item.end_date || item.start_date || item.date;
  if (!start || !end) return 1;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 1;
  return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
}

export function isPastEntry(item, todayStr = getLocalDateString()) {
  if (!item) return false;
  const end = item.end_date || item.start_date || item.date;
  return !!(end && end < todayStr);
}

export function isEntryToday(item, todayStr = getLocalDateString()) {
  if (!item) return false;
  const start = item.start_date || item.date;
  const end = item.end_date || item.start_date || item.date;
  return !!(start && end && start <= todayStr && end >= todayStr);
}

export function isWorkingDay(dateStr, workDays = [1, 2, 3, 4, 5]) {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const jsDay = dt.getDay();
  const isoDay = jsDay === 0 ? 7 : jsDay;
  return workDays.includes(isoDay);
}

export function calculateNextWorkingDay(dateStr, workDays = [1, 2, 3, 4, 5]) {
  if (!workDays || workDays.length === 0) workDays = [1, 2, 3, 4, 5];
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);

  for (let i = 1; i <= 7; i++) {
    dt.setDate(dt.getDate() + 1);
    const jsDay = dt.getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    if (workDays.includes(isoDay)) {
      return getLocalDateString(dt);
    }
  }
  dt.setDate(dt.getDate() + 1);
  return getLocalDateString(dt);
}

export function calculatePreviousWorkingDay(dateStr, workDays = [1, 2, 3, 4, 5]) {
  if (!workDays || workDays.length === 0) workDays = [1, 2, 3, 4, 5];
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);

  for (let i = 1; i <= 7; i++) {
    dt.setDate(dt.getDate() - 1);
    const jsDay = dt.getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    if (workDays.includes(isoDay)) {
      return getLocalDateString(dt);
    }
  }
  dt.setDate(dt.getDate() - 1);
  return getLocalDateString(dt);
}
