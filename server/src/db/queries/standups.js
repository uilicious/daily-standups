import db, { DEFAULT_STANDUP_QUESTIONS } from '../index.js';
import { getQuestionsByTeamId } from './questions.js';
import { attachReactionsToItems, deleteReactionsForTarget } from './reactions.js';

async function attachAnswersToStandups(standups) {
  if (!standups || standups.length === 0) return standups;

  const standupIds = standups.map(s => s.id);
  const allAnswers = await db('standup_answers')
    .whereIn('standup_id', standupIds)
    .orderBy('id', 'asc');

  const answersByStandup = {};
  for (const ans of allAnswers) {
    if (!answersByStandup[ans.standup_id]) {
      answersByStandup[ans.standup_id] = [];
    }
    answersByStandup[ans.standup_id].push({
      id: ans.id,
      question_id: ans.question_id,
      question_text: ans.question_text,
      answer: ans.answer
    });
  }

  for (const s of standups) {
    s.answers = answersByStandup[s.id] || [];
  }

  return standups;
}

export async function getStandupsByTeamAndDate(teamId, date, currentUserId = null) {
  const standups = await db('standups as s')
    .join('users as u', 'u.id', 's.user_id')
    .where('s.team_id', teamId)
    .where('s.date', date)
    .select(
      's.id',
      's.user_id',
      's.team_id',
      's.date',
      's.created_at',
      's.updated_at',
      'u.name as user_name',
      'u.username as user_username',
      'u.email as user_email',
      'u.avatar_url as user_avatar',
      'u.role as user_role'
    )
    .orderBy('s.updated_at', 'desc');

  const withAnswers = await attachAnswersToStandups(standups);
  return attachReactionsToItems(withAnswers, 'standup', currentUserId);
}

export async function getStandupById(id, currentUserId = null) {
  const standup = await db('standups as s')
    .join('users as u', 'u.id', 's.user_id')
    .where('s.id', id)
    .select(
      's.id',
      's.user_id',
      's.team_id',
      's.date',
      's.created_at',
      's.updated_at',
      'u.name as user_name',
      'u.username as user_username',
      'u.email as user_email',
      'u.avatar_url as user_avatar',
      'u.role as user_role'
    )
    .first();

  if (!standup) return null;
  const withAnswers = await attachAnswersToStandups([standup]);
  await attachReactionsToItems(withAnswers, 'standup', currentUserId);
  return withAnswers[0];
}

export async function getTodayStandupsForUser(userId, date, currentUserId = null) {
  const standups = await db('standups as s')
    .join('teams as t', 't.id', 's.team_id')
    .where('s.user_id', userId)
    .where('s.date', date)
    .select(
      's.id',
      's.team_id',
      's.date',
      's.created_at',
      's.updated_at',
      't.name as team_name',
      't.slug as team_slug'
    );

  const withAnswers = await attachAnswersToStandups(standups);
  return attachReactionsToItems(withAnswers, 'standup', currentUserId || userId);
}

export async function saveStandup({ user_id, team_id, date, answers, yesterday, today, blockers }) {
  // Upsert the standup parent row
  await db('standups')
    .insert({
      user_id,
      team_id,
      date,
      updated_at: db.fn.now()
    })
    .onConflict(['user_id', 'team_id', 'date'])
    .merge({
      updated_at: db.fn.now()
    });

  const standup = await db('standups')
    .where({ user_id, team_id, date })
    .first();

  // Clear previous answers for this standup submission
  await db('standup_answers').where('standup_id', standup.id).del();

  const teamQuestions = await getQuestionsByTeamId(team_id);
  const questionMap = new Map(teamQuestions.map(q => [q.id, q]));

  // Handle dynamic answers array
  if (Array.isArray(answers) && answers.length > 0) {
    for (const item of answers) {
      const q = item.question_id ? questionMap.get(Number(item.question_id)) : null;
      const questionText = item.question_text || q?.text || 'Question';
      await db('standup_answers').insert({
        standup_id: standup.id,
        question_id: item.question_id ? Number(item.question_id) : null,
        question_text: questionText,
        answer: (item.answer || '').trim()
      });
    }
  } else {
    // Legacy support for { yesterday, today, blockers }
    const q1 = teamQuestions[0];
    const q2 = teamQuestions[1];
    const q3 = teamQuestions[2];

    if (yesterday !== undefined) {
      await db('standup_answers').insert({
        standup_id: standup.id,
        question_id: q1?.id || null,
        question_text: q1?.text || DEFAULT_STANDUP_QUESTIONS[0].text,
        answer: yesterday.trim()
      });
    }
    if (today !== undefined) {
      await db('standup_answers').insert({
        standup_id: standup.id,
        question_id: q2?.id || null,
        question_text: q2?.text || DEFAULT_STANDUP_QUESTIONS[1].text,
        answer: today.trim()
      });
    }
    if (blockers !== undefined) {
      await db('standup_answers').insert({
        standup_id: standup.id,
        question_id: q3?.id || null,
        question_text: q3?.text || DEFAULT_STANDUP_QUESTIONS[2].text,
        answer: blockers.trim()
      });
    }
  }

  // Fetch complete response with metadata & answers
  const result = await db('standups as s')
    .join('users as u', 'u.id', 's.user_id')
    .join('teams as t', 't.id', 's.team_id')
    .where('s.id', standup.id)
    .select('s.*', 'u.name as user_name', 'u.avatar_url as user_avatar', 't.name as team_name')
    .first();

  const enriched = await attachAnswersToStandups([result]);
  return enriched[0];
}
