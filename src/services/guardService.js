const env = {
  lowConfidenceThreshold: Number(process.env.LOW_CONFIDENCE_THRESHOLD || 0.65),
  minSimilarityThreshold: Number(process.env.MIN_SIMILARITY_THRESHOLD || 0.55),
  minMatchScore: Number(process.env.MIN_MATCH_SCORE || 0.62)
};
const { cosineSimilarity } = require('../lib/similarity');
function normalize(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
function evaluateCandidate({ post, metadata, similarity }) {
  const reasons = [];
  if (metadata.confidence < env.lowConfidenceThreshold) reasons.push(`Image confidence ${metadata.confidence.toFixed(2)} is below ${env.lowConfidenceThreshold.toFixed(2)}`);
  if (similarity < env.minSimilarityThreshold) reasons.push(`Semantic similarity ${similarity.toFixed(3)} is below ${env.minSimilarityThreshold.toFixed(2)}`);
  const expectedCategory = normalize(post.expected_category);
  const actualCategory = normalize(metadata.category);
  if (expectedCategory && expectedCategory !== actualCategory) reasons.push(`Category mismatch: expected ${post.expected_category}, detected ${metadata.category}`);
  const expectedSubject = normalize(post.expected_subject);
  const actualSubject = normalize(metadata.subject);
  // Exact canonical subject check is intentionally used only when the post declares one.
  if (expectedSubject && actualSubject !== expectedSubject) reasons.push(`Subject mismatch: expected ${post.expected_subject}, detected ${metadata.subject}`);
  const confidenceAdjustedScore = similarity * metadata.confidence;
  if (confidenceAdjustedScore < env.minMatchScore) reasons.push(`Confidence-adjusted score ${confidenceAdjustedScore.toFixed(3)} is below ${env.minMatchScore.toFixed(2)}`);
  return { accepted: reasons.length === 0, score: confidenceAdjustedScore, reason: reasons.length ? reasons.join('; ') : 'Passed category, subject, confidence and semantic-similarity checks.' };
}
module.exports = { evaluateCandidate };
