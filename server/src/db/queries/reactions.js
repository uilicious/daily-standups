import db from '../index.js';

/**
 * Get reactions for multiple target IDs grouped by target ID and emoji
 */
export async function getReactionsForTargets(targetType, targetIds, currentUserId = null) {
  if (!targetIds || targetIds.length === 0) {
    return {};
  }

  const rows = await db('reactions as r')
    .join('users as u', 'u.id', 'r.user_id')
    .where('r.target_type', targetType)
    .whereIn('r.target_id', targetIds)
    .select(
      'r.id',
      'r.target_id',
      'r.emoji',
      'r.user_id',
      'r.created_at',
      'u.name as user_name',
      'u.username as user_username'
    )
    .orderBy('r.created_at', 'asc');

  const groupedByTarget = {};
  for (const id of targetIds) {
    groupedByTarget[id] = [];
  }

  const emojiMapByTarget = {};

  for (const row of rows) {
    const tid = row.target_id;
    if (!emojiMapByTarget[tid]) {
      emojiMapByTarget[tid] = {};
    }

    if (!emojiMapByTarget[tid][row.emoji]) {
      emojiMapByTarget[tid][row.emoji] = {
        emoji: row.emoji,
        count: 0,
        users: [],
        has_reacted: false,
        first_created_at: row.created_at
      };
    }

    const item = emojiMapByTarget[tid][row.emoji];
    item.count += 1;
    item.users.push({
      id: row.user_id,
      name: row.user_name,
      username: row.user_username
    });
    if (currentUserId && row.user_id === currentUserId) {
      item.has_reacted = true;
    }
  }

  for (const tid of targetIds) {
    if (emojiMapByTarget[tid]) {
      groupedByTarget[tid] = Object.values(emojiMapByTarget[tid]).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return new Date(a.first_created_at) - new Date(b.first_created_at);
      });
    }
  }

  return groupedByTarget;
}

/**
 * Helper to attach a `reactions` array to each item in `items`
 */
export async function attachReactionsToItems(items, targetType, currentUserId = null) {
  if (!items || items.length === 0) return items;
  const ids = items.map(item => item && item.id).filter(Boolean);
  if (ids.length === 0) return items;

  const reactionsMap = await getReactionsForTargets(targetType, ids, currentUserId);
  for (const item of items) {
    if (item && item.id) {
      item.reactions = reactionsMap[item.id] || [];
    }
  }
  return items;
}

/**
 * Get reactions for a single target
 */
export async function getReactionsForTarget(targetType, targetId, currentUserId = null) {
  const map = await getReactionsForTargets(targetType, [targetId], currentUserId);
  return map[targetId] || [];
}

/**
 * Toggle a user's emoji reaction on a post or standup
 */
export async function toggleReaction({ userId, targetType, targetId, emoji }) {
  if (!userId || !targetType || !targetId || !emoji) {
    throw new Error('userId, targetType, targetId, and emoji are required');
  }

  const cleanEmoji = emoji.trim();
  if (!cleanEmoji || cleanEmoji.length > 32) {
    throw new Error('Invalid emoji');
  }

  // Enforce max 1 reaction per target per user
  const userReactions = await db('reactions')
    .where({
      user_id: userId,
      target_type: targetType,
      target_id: targetId
    });

  const existingSame = userReactions.find(r => r.emoji === cleanEmoji);
  let action = '';

  if (existingSame) {
    // Toggled off same emoji
    await db('reactions')
      .where({
        user_id: userId,
        target_type: targetType,
        target_id: targetId
      })
      .del();
    action = 'removed';
  } else {
    // Remove any previous reaction by this user on this target
    if (userReactions.length > 0) {
      await db('reactions')
        .where({
          user_id: userId,
          target_type: targetType,
          target_id: targetId
        })
        .del();
    }

    try {
      await db('reactions').insert({
        user_id: userId,
        target_type: targetType,
        target_id: targetId,
        emoji: cleanEmoji,
        created_at: db.fn.now()
      });
      action = userReactions.length > 0 ? 'replaced' : 'added';
    } catch (err) {
      action = 'added';
    }
  }

  const updatedReactions = await getReactionsForTarget(targetType, targetId, userId);
  return {
    success: true,
    action,
    reactions: updatedReactions
  };
}

/**
 * Delete all reactions for a target (cleanup when item is deleted)
 */
export async function deleteReactionsForTarget(targetType, targetId) {
  return db('reactions')
    .where({
      target_type: targetType,
      target_id: targetId
    })
    .del();
}
