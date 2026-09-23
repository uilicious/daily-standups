import db from '../index.js';
import { getTeamMembers } from './teams.js';

export const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5]; // Mon = 1, Fri = 5

export async function getUserWorkSchedule(userId) {
  const row = await db('user_work_schedules')
    .where('user_id', Number(userId))
    .first();

  if (!row) {
    return {
      user_id: Number(userId),
      work_days: [...DEFAULT_WORK_DAYS]
    };
  }

  let workDays;
  try {
    workDays = JSON.parse(row.work_days);
    if (!Array.isArray(workDays)) {
      workDays = [...DEFAULT_WORK_DAYS];
    }
  } catch (err) {
    workDays = [...DEFAULT_WORK_DAYS];
  }

  return {
    user_id: Number(userId),
    work_days: workDays
  };
}

export async function setUserWorkSchedule(userId, workDays) {
  const validDays = Array.isArray(workDays)
    ? [...new Set(workDays.map(Number).filter(d => Number.isInteger(d) && d >= 1 && d <= 7))].sort((a, b) => a - b)
    : [...DEFAULT_WORK_DAYS];

  const jsonStr = JSON.stringify(validDays);

  await db('user_work_schedules')
    .insert({
      user_id: Number(userId),
      work_days: jsonStr,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    })
    .onConflict('user_id')
    .merge({
      work_days: jsonStr,
      updated_at: db.fn.now()
    });

  return {
    user_id: Number(userId),
    work_days: validDays
  };
}

export async function getUserOooEntries(userId) {
  return db('user_ooo_entries')
    .where('user_id', Number(userId))
    .orderBy('start_date', 'desc');
}

export async function saveOooEntry(userId, { id, startDate, endDate, period = 'all_day', reason = '' }) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const cleanStart = typeof startDate === 'string' && dateRegex.test(startDate) ? startDate : null;
  if (!cleanStart) {
    throw new Error('Valid start date is required');
  }
  let cleanEnd = typeof endDate === 'string' && dateRegex.test(endDate) ? endDate : cleanStart;
  if (cleanEnd < cleanStart) {
    cleanEnd = cleanStart;
  }

  const validPeriod = ['morning', 'afternoon'].includes(period) ? period : 'all_day';
  const cleanReason = reason && typeof reason === 'string' && reason.trim() ? reason.trim() : null;

  if (id) {
    await db('user_ooo_entries')
      .where({ id: Number(id), user_id: Number(userId) })
      .update({
        start_date: cleanStart,
        end_date: cleanEnd,
        period: validPeriod,
        reason: cleanReason,
        updated_at: db.fn.now()
      });
  } else {
    await db('user_ooo_entries').insert({
      user_id: Number(userId),
      start_date: cleanStart,
      end_date: cleanEnd,
      period: validPeriod,
      reason: cleanReason,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
  }

  return getUserOooEntries(userId);
}

export async function deleteOooEntry(userId, id) {
  await db('user_ooo_entries')
    .where({ id: Number(id), user_id: Number(userId) })
    .del();

  return getUserOooEntries(userId);
}

export async function deleteOooEntryByDate(userId, dateStr) {
  await db('user_ooo_entries')
    .where('user_id', Number(userId))
    .where('start_date', '<=', dateStr)
    .where('end_date', '>=', dateStr)
    .del();

  return getUserOooEntries(userId);
}

// Aliases for compatibility
export async function getUserOooDays(userId) {
  return getUserOooEntries(userId);
}

export async function addOooDays(userId, dates, reason = '', period = 'all_day') {
  if (Array.isArray(dates) && dates.length > 0) {
    const sorted = [...dates].sort();
    await saveOooEntry(userId, {
      startDate: sorted[0],
      endDate: sorted[sorted.length - 1],
      reason,
      period
    });
  }
  return getUserOooEntries(userId);
}

export async function deleteOooDay(userId, oooId) {
  return deleteOooEntry(userId, oooId);
}

export async function deleteOooDayByDate(userId, date) {
  return deleteOooEntryByDate(userId, date);
}

export async function getTeamMembersWithAvailability(teamId, dateStr) {
  const members = await getTeamMembers(teamId);
  if (!members || members.length === 0) {
    return [];
  }

  const queryDate = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? dateStr
    : new Date().toISOString().split('T')[0];

  // Calculate ISO day of week: 1 = Mon ... 7 = Sun
  const [y, m, d] = queryDate.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const jsDay = dateObj.getUTCDay(); // 0 is Sun, 1 is Mon...
  const isoDay = jsDay === 0 ? 7 : jsDay;

  const memberIds = members.map(m => m.id);

  // 1. Fetch work schedules for all members
  const scheduleRows = await db('user_work_schedules').whereIn('user_id', memberIds);
  const scheduleMap = new Map();
  for (const row of scheduleRows) {
    try {
      const parsed = JSON.parse(row.work_days);
      if (Array.isArray(parsed)) {
        scheduleMap.set(row.user_id, parsed);
      }
    } catch (e) {
      // fallback
    }
  }

  // 2. Fetch OOO entries for all members covering this date
  const oooRows = await db('user_ooo_entries')
    .whereIn('user_id', memberIds)
    .where('start_date', '<=', queryDate)
    .where('end_date', '>=', queryDate);
  const oooMap = new Map();
  for (const row of oooRows) {
    oooMap.set(row.user_id, row);
  }

  // 3. Fetch standups for this team and date to know who submitted
  const standupRows = await db('standups')
    .where('team_id', Number(teamId))
    .where('date', queryDate)
    .select('user_id');
  const standupUserIds = new Set(standupRows.map(s => s.user_id));

  return members.map(member => {
    const workDays = scheduleMap.get(member.id) || DEFAULT_WORK_DAYS;
    const isScheduled = workDays.includes(isoDay);
    const oooEntry = oooMap.get(member.id);
    const isOoo = !!oooEntry;
    const oooPeriod = oooEntry ? (oooEntry.period || 'all_day') : null;
    const oooReason = oooEntry?.reason || null;

    let isWorking = false;
    if (isScheduled) {
      if (!isOoo) {
        isWorking = true;
      } else if (oooPeriod === 'morning' || oooPeriod === 'afternoon') {
        isWorking = true; // working half the day
      } else {
        isWorking = false; // full day out of office
      }
    }

    const hasStandup = standupUserIds.has(member.id);

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      avatar_url: member.avatar_url,
      user_role: member.user_role,
      team_role: member.team_role,
      is_working: isWorking,
      is_ooo: isOoo,
      ooo_period: oooPeriod,
      ooo_reason: oooReason,
      is_scheduled: isScheduled,
      has_standup: hasStandup
    };
  });
}
