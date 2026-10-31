const pool = require('../db/pool');
const env = require('../config/env');
const { understandImage, embedText } = require('../providers/groq');
const { enforceDailyBudget, recordCost } = require('../services/costService');
const { matchPost } = require('../services/matchingService');
async function processImage({ imageId }) {
  const { rows } = await pool.query('SELECT * FROM images WHERE id=$1', [imageId]);
  if (!rows.length) throw new Error(`Image ${imageId} not found`);
  const image = rows[0];
  await pool.query("UPDATE images SET status='processing',updated_at=NOW() WHERE id=$1", [imageId]);
  try {
    await enforceDailyBudget();
    const vision = await understandImage(image.storage_path);
    await recordCost({ model:env.visionModel,operation:'vision_classification',entityType:'image',entityId:imageId,inputUnits:vision.usage.prompt_tokens || 0,outputUnits:vision.usage.completion_tokens || 0,durationMs:vision.durationMs });
    const metadata = vision.data;
    await pool.query(`INSERT INTO image_metadata(image_id,subject,category,attributes,caption,confidence,raw_response)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(image_id) DO UPDATE SET subject=EXCLUDED.subject,category=EXCLUDED.category,attributes=EXCLUDED.attributes,caption=EXCLUDED.caption,confidence=EXCLUDED.confidence,raw_response=EXCLUDED.raw_response`,
      [imageId,metadata.subject,metadata.category,JSON.stringify(metadata.attributes),metadata.caption,metadata.confidence,JSON.stringify(metadata)]);
    if (metadata.confidence < env.lowConfidenceThreshold) {
      await pool.query("UPDATE images SET status='flagged',updated_at=NOW() WHERE id=$1", [imageId]);
      return;
    }
    await enforceDailyBudget();
    const embedded = await embedText(`${metadata.subject}. ${metadata.caption}. ${metadata.attributes.join(', ')}`);
    await recordCost({ model:env.embeddingModel,operation:'embed_image',entityType:'image',entityId:imageId,inputUnits:embedded.usage.prompt_eval_count || 0,durationMs:embedded.durationMs });
    await pool.query(`INSERT INTO image_vectors(image_id,embedding,model) VALUES($1,$2,$3) ON CONFLICT(image_id) DO UPDATE SET embedding=EXCLUDED.embedding,model=EXCLUDED.model`, [imageId,JSON.stringify(embedded.embedding),env.embeddingModel]);
    await pool.query("UPDATE images SET status='processed',updated_at=NOW() WHERE id=$1", [imageId]);
  } catch (error) {
    await pool.query("UPDATE images SET status='failed',updated_at=NOW() WHERE id=$1", [imageId]);
    await recordCost({ model:env.visionModel,operation:'image_processing',entityType:'image',entityId:imageId,status:'failure' }).catch(()=>{});
    throw error;
  }
}
async function handleJob(job) {
  if (job.type === 'process_image') return processImage(job.payload);
  if (job.type === 'match_post') return matchPost(job.payload.postId);
  if (job.type === 'embed_post') return matchPost(job.payload.postId);
  throw new Error(`Unknown job type: ${job.type}`);
}
module.exports = { handleJob };
