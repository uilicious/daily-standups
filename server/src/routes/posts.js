import {
  getUserById,
  getTeamPostById,
  updateTeamPost,
  deleteTeamPost,
  canUserManageTeam,
  toggleReaction
} from '../db/queries.js';

export default async function postRoutes(fastify, options) {
  // Authentication check helper
  async function checkAuth(request, reply) {
    if (!request.session || !request.session.userId) {
      reply.code(401).send({ error: 'Authentication required' });
      return null;
    }
    const user = await getUserById(request.session.userId);
    if (!user) {
      reply.code(401).send({ error: 'User not found' });
      return null;
    }
    return user;
  }

  // Update a post
  fastify.put('/:id', async (request, reply) => {
    const user = await checkAuth(request, reply);
    if (!user) return;

    const { id } = request.params;
    const post = await getTeamPostById(Number(id));
    if (!post) {
      return reply.code(404).send({ error: 'Post not found' });
    }

    const canEdit = post.user_id === user.id || (await canUserManageTeam(user.id, post.team_id));
    if (!canEdit) {
      return reply.code(403).send({ error: 'You do not have permission to edit this post' });
    }

    const { title, content, post_type, target_date } = request.body || {};
    if (content !== undefined && !content.trim()) {
      return reply.code(400).send({ error: 'Content cannot be empty' });
    }

    const updated = await updateTeamPost(post.id, {
      title,
      content,
      postType: post_type,
      targetDate: target_date
    });

    return { post: updated };
  });

  // Delete a post
  fastify.delete('/:id', async (request, reply) => {
    const user = await checkAuth(request, reply);
    if (!user) return;

    const { id } = request.params;
    const post = await getTeamPostById(Number(id));
    if (!post) {
      return reply.code(404).send({ error: 'Post not found' });
    }

    const canDelete = post.user_id === user.id || (await canUserManageTeam(user.id, post.team_id));
    if (!canDelete) {
      return reply.code(403).send({ error: 'You do not have permission to delete this post' });
    }

    await deleteTeamPost(post.id);
    return { success: true };
  });

  // Toggle emoji reaction on a post
  fastify.post('/:id/reactions', async (request, reply) => {
    const user = await checkAuth(request, reply);
    if (!user) return;

    const { id } = request.params;
    const post = await getTeamPostById(Number(id));
    if (!post) {
      return reply.code(404).send({ error: 'Post not found' });
    }

    const isMember = (user.teams || []).some(t => t.id === post.team_id);
    if (!isMember && user.role !== 'admin') {
      return reply.code(403).send({ error: 'You do not have permission to react to this post' });
    }

    const { emoji } = request.body || {};
    if (!emoji || typeof emoji !== 'string' || !emoji.trim()) {
      return reply.code(400).send({ error: 'Emoji is required' });
    }

    const result = await toggleReaction({
      userId: user.id,
      targetType: 'post',
      targetId: post.id,
      emoji: emoji.trim()
    });

    return result;
  });
}
