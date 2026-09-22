import db, { DEFAULT_STANDUP_QUESTIONS } from '../index.js';

export async function getQuestionsByTeamId(teamId) {
  const questions = await db('questions')
    .where('team_id', teamId)
    .orderBy('order_index', 'asc')
    .orderBy('id', 'asc');

  return questions.map(q => ({
    ...q,
    is_required: Boolean(q.is_required)
  }));
}

export async function getQuestionById(id) {
  const question = await db('questions').where('id', id).first();
  if (!question) return null;
  return {
    ...question,
    is_required: Boolean(question.is_required)
  };
}

export async function createQuestion(teamId, { text, is_required = true, order_index }) {
  let index = order_index;
  if (index === undefined || index === null) {
    const maxOrder = await db('questions').where('team_id', teamId).max('order_index as max_index').first();
    index = (maxOrder?.max_index ?? -1) + 1;
  }

  const result = await db('questions').insert({
    team_id: teamId,
    text: text.trim(),
    is_required: Boolean(is_required),
    order_index: index,
    updated_at: db.fn.now()
  });

  let qId = Array.isArray(result) ? result[0] : result;
  if (typeof qId === 'object' && qId !== null) qId = qId.id || qId;

  return getQuestionById(qId);
}

export async function updateQuestion(id, { text, is_required, order_index }) {
  const updates = { updated_at: db.fn.now() };
  if (text !== undefined) updates.text = text.trim();
  if (is_required !== undefined) updates.is_required = Boolean(is_required);
  if (order_index !== undefined) updates.order_index = Number(order_index);

  await db('questions').where('id', id).update(updates);
  return getQuestionById(id);
}

export async function deleteQuestion(id) {
  return db('questions').where('id', id).del();
}

export async function setTeamQuestions(teamId, questionsList) {
  const currentQuestions = await db('questions').where('team_id', teamId);
  const currentIds = new Set(currentQuestions.map(q => q.id));
  const keepIds = new Set();

  for (let i = 0; i < questionsList.length; i++) {
    const item = questionsList[i];
    if (item.id && currentIds.has(item.id)) {
      keepIds.add(item.id);
      await db('questions').where('id', item.id).update({
        text: item.text.trim(),
        is_required: item.is_required !== undefined ? Boolean(item.is_required) : true,
        order_index: i,
        updated_at: db.fn.now()
      });
    } else {
      const inserted = await db('questions').insert({
        team_id: teamId,
        text: item.text.trim(),
        is_required: item.is_required !== undefined ? Boolean(item.is_required) : true,
        order_index: i,
        updated_at: db.fn.now()
      });
      let newId = Array.isArray(inserted) ? inserted[0] : inserted;
      if (typeof newId === 'object' && newId !== null) newId = newId.id || newId;
      keepIds.add(newId);
    }
  }

  // Delete questions that were removed
  for (const q of currentQuestions) {
    if (!keepIds.has(q.id)) {
      await db('questions').where('id', q.id).del();
    }
  }

  return getQuestionsByTeamId(teamId);
}

export async function resetTeamQuestionsToDefaults(teamId) {
  await db('questions').where('team_id', teamId).del();
  for (let i = 0; i < DEFAULT_STANDUP_QUESTIONS.length; i++) {
    const q = DEFAULT_STANDUP_QUESTIONS[i];
    await db('questions').insert({
      team_id: teamId,
      text: q.text,
      order_index: i,
      is_required: q.is_required,
      updated_at: db.fn.now()
    });
  }
  return getQuestionsByTeamId(teamId);
}
