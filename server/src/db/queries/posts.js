import db from '../index.js';
import { attachReactionsToItems, deleteReactionsForTarget } from './reactions.js';

/**
 * Get organization working days from org_settings (defaults to [1, 2, 3, 4, 5])
 */
export async function getOrgWorkDays() {
  const row = await db('org_settings').where('key', 'org_work_days').first();
  if (!row || !row.value) {
    return [1, 2, 3, 4, 5];
  }
  try {
    const parsed = JSON.parse(row.value);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(Number).sort((a, b) => a - b);
    }
  } catch (err) {
    console.error('Failed to parse org_work_days from org_settings:', err);
  }
  return [1, 2, 3, 4, 5];
}

/**
 * Set organization working days in org_settings
 */
export async function setOrgWorkDays(days) {
  if (!Array.isArray(days)) {
    throw new Error('Working days must be an array of numbers');
  }
  const cleanDays = Array.from(new Set(days.map(Number).filter(d => d >= 1 && d <= 7))).sort((a, b) => a - b);
  const jsonVal = JSON.stringify(cleanDays);

  const existing = await db('org_settings').where('key', 'org_work_days').first();
  if (existing) {
    await db('org_settings')
      .where('key', 'org_work_days')
      .update({
        value: jsonVal,
        updated_at: db.fn.now()
      });
  } else {
    await db('org_settings').insert({
      key: 'org_work_days',
      value: jsonVal,
      updated_at: db.fn.now()
    });
  }

  return cleanDays;
}

/**
 * Helper to compute the next working day from a given date using org working days
 * Days: 1 = Monday, ..., 7 = Sunday
 */
export function calculateNextWorkingDay(dateStr, workDays = [1, 2, 3, 4, 5]) {
  if (!workDays || workDays.length === 0) workDays = [1, 2, 3, 4, 5];
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));

  for (let i = 1; i <= 7; i++) {
    dt.setUTCDate(dt.getUTCDate() + 1);
    const jsDay = dt.getUTCDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    if (workDays.includes(isoDay)) {
      const nextY = dt.getUTCFullYear();
      const nextM = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const nextD = String(dt.getUTCDate()).padStart(2, '0');
      return `${nextY}-${nextM}-${nextD}`;
    }
  }

  // Fallback: +1 day
  const fallback = new Date(Date.UTC(y, m - 1, d + 1));
  return fallback.toISOString().split('T')[0];
}

/**
 * Helper to compute the previous working day from a given date using org working days
 */
export function calculatePreviousWorkingDay(dateStr, workDays = [1, 2, 3, 4, 5]) {
  if (!workDays || workDays.length === 0) workDays = [1, 2, 3, 4, 5];
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));

  for (let i = 1; i <= 7; i++) {
    dt.setUTCDate(dt.getUTCDate() - 1);
    const jsDay = dt.getUTCDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    if (workDays.includes(isoDay)) {
      const prevY = dt.getUTCFullYear();
      const prevM = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const prevD = String(dt.getUTCDate()).padStart(2, '0');
      return `${prevY}-${prevM}-${prevD}`;
    }
  }

  // Fallback: -1 day
  const fallback = new Date(Date.UTC(y, m - 1, d - 1));
  return fallback.toISOString().split('T')[0];
}

/**
 * Create a new post (standard or handoff) for a team
 */
export async function createTeamPost({
  teamId,
  userId,
  postType = 'standard',
  title = null,
  content,
  date,
  targetDate = null
}) {
  if (!teamId || !userId || !content) {
    throw new Error('teamId, userId, and content are required');
  }

  const postDate = date || new Date().toISOString().split('T')[0];
  let calculatedTargetDate = targetDate;

  if (postType === 'handoff' && !calculatedTargetDate) {
    const orgWorkDays = await getOrgWorkDays();
    calculatedTargetDate = calculateNextWorkingDay(postDate, orgWorkDays);
  }

  const isPg = db.client.dialect === 'postgresql' || db.client.config?.client === 'pg';
  const query = db('team_posts').insert({
    team_id: teamId,
    user_id: userId,
    post_type: postType,
    title: title ? title.trim() : null,
    content: content.trim(),
    date: postDate,
    target_date: calculatedTargetDate || null,
    created_at: db.fn.now(),
    updated_at: db.fn.now()
  });
  const result = isPg ? await query.returning('id') : await query;

  let postId = Array.isArray(result) ? result[0] : result;
  if (typeof postId === 'object' && postId !== null) {
    postId = postId.id || Object.values(postId)[0];
  }

  return getTeamPostById(postId);
}

/**
 * Get a single post by ID with author details
 */
export async function getTeamPostById(id, currentUserId = null) {
  const post = await db('team_posts')
    .join('users', 'team_posts.user_id', 'users.id')
    .where('team_posts.id', id)
    .select(
      'team_posts.*',
      'users.name as user_name',
      'users.username as user_username',
      'users.email as user_email',
      'users.avatar_url as user_avatar',
      'users.role as user_role'
    )
    .first();

  if (!post) return null;
  await attachReactionsToItems([post], 'post', currentUserId);
  return post;
}

/**
 * Update an existing post
 */
export async function updateTeamPost(id, { postType, title, content, targetDate }) {
  const updateData = {
    updated_at: db.fn.now()
  };

  if (postType !== undefined) updateData.post_type = postType;
  if (title !== undefined) updateData.title = title ? title.trim() : null;
  if (content !== undefined) updateData.content = content.trim();
  if (targetDate !== undefined) updateData.target_date = targetDate || null;

  await db('team_posts').where('id', id).update(updateData);
  return getTeamPostById(id);
}

/**
 * Delete a post by ID
 */
export async function deleteTeamPost(id) {
  await deleteReactionsForTarget('post', id);
  return db('team_posts').where('id', id).del();
}

/**
 * Get posts for a team's feed on a given date:
 * - Posts created on this date (`date = queryDate`)
 * - Hand-off posts whose target date is this date (`post_type = 'handoff' AND target_date = queryDate AND date != queryDate`)
 */
export async function getPostsForTeamFeed(teamId, queryDate, currentUserId = null) {
  const posts = await db('team_posts')
    .join('users', 'team_posts.user_id', 'users.id')
    .where('team_posts.team_id', teamId)
    .andWhere(function () {
      this.where('team_posts.date', queryDate).orWhere(function () {
        this.where('team_posts.post_type', 'handoff')
          .andWhere('team_posts.target_date', queryDate)
          .andWhereNot('team_posts.date', queryDate);
      });
    })
    .select(
      'team_posts.*',
      'users.name as user_name',
      'users.username as user_username',
      'users.email as user_email',
      'users.avatar_url as user_avatar',
      'users.role as user_role'
    )
    .orderBy('team_posts.created_at', 'desc');

  const mapped = posts.map(p => ({
    ...p,
    is_incoming_handoff: p.post_type === 'handoff' && p.target_date === queryDate && p.date !== queryDate
  }));

  return attachReactionsToItems(mapped, 'post', currentUserId);
}
