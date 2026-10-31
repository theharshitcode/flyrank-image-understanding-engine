const pool = require('../db/pool');
const { cosineSimilarity } = require('../lib/similarity');
const { evaluateCandidate } = require('./guardService');
const { embedText, expandPostForSearch } = require('../providers/groq');
const env = require('../config/env');
const { enforceDailyBudget, recordCost } = require('./costService');
async function matchPost(postId) {
  const { rows: postRows } = await pool.query('SELECT * FROM posts WHERE id=$1', [postId]);
  if (!postRows.length) throw new Error(`Post ${postId} not found`);
  const post = postRows[0];
  let { rows: pv } = await pool.query('SELECT embedding FROM post_vectors WHERE post_id=$1', [postId]);
  if (!pv.length) {
    await enforceDailyBudget();
    const started = Date.now();
    const expanded = await expandPostForSearch(post.title, post.content);
    await recordCost({ model: env.textModel, operation: 'expand_post_query', entityType: 'post', entityId: postId, inputUnits: expanded.usage.input_tokens || 0, outputUnits: expanded.usage.output_tokens || 0, durationMs: expanded.durationMs });
    const result = await embedText(expanded.text);
    await pool.query(`INSERT INTO post_vectors(post_id,embedding,model) VALUES($1,$2,$3) ON CONFLICT(post_id) DO UPDATE SET embedding=EXCLUDED.embedding, model=EXCLUDED.model`, [postId, JSON.stringify(result.embedding), env.embeddingModel]);
    await recordCost({ model: env.embeddingModel, operation: 'embed_post', entityType: 'post', entityId: postId, inputUnits: result.usage.prompt_eval_count || 0, durationMs: result.durationMs });
    pv = [{ embedding: result.embedding }];
  }
  const postVector = Array.isArray(pv[0].embedding) ? pv[0].embedding : pv[0].embedding;
  const { rows: candidates } = await pool.query(`SELECT i.id AS image_id, m.subject,m.category,m.attributes,m.caption,m.confidence,v.embedding
    FROM images i JOIN image_metadata m ON m.image_id=i.id JOIN image_vectors v ON v.image_id=i.id
    WHERE i.status='processed' ORDER BY i.created_at DESC`);
  const ranked = candidates.map(c => {
    const vector = Array.isArray(c.embedding) ? c.embedding : c.embedding;
    const similarity = cosineSimilarity(postVector, vector);
    const guard = evaluateCandidate({ post, metadata: c, similarity });
    return { ...c, similarity, ...guard };
  }).sort((a, b) => b.score - a.score);
  await pool.query('DELETE FROM suggestions WHERE post_id=$1', [postId]);
  const suggestions = [];
  for (let i = 0; i < ranked.length; i++) {
    const c = ranked[i];
    const decision = c.accepted && i === 0 ? 'suggested' : 'rejected';
    const { rows } = await pool.query(`INSERT INTO suggestions(post_id,image_id,similarity,final_score,decision,reason,rank_position)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [postId, c.image_id, c.similarity, c.score, decision, c.reason, i + 1]);
    suggestions.push({ ...rows[0], subject: c.subject, category: c.category, confidence: c.confidence });
  }
  if (!suggestions.some(s => s.decision === 'suggested')) {
    return { postId, status: 'no_confident_match', message: 'No confident match. Every candidate failed at least one guard check.', suggestions };
  }
  return { postId, status: 'matched', suggestions };
}
module.exports = { matchPost };
