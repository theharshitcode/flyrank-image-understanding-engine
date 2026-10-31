const router = require('express').Router();
const asyncHandler = require('../lib/asyncHandler');
const pool = require('../db/pool');
const { imageUrlSchema } = require('../lib/schemas');
const { AppError } = require('../lib/errors');
const { ingestImageUrl } = require('../services/imageService');
router.post('/', asyncHandler(async (req,res) => {
  const parsed = imageUrlSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(parsed.error.issues.map(i=>i.message).join('; '),400,'VALIDATION_ERROR');
  const rawKey=req.get('Idempotency-Key');
  const idempotencyKey=rawKey?rawKey.trim():null;
  if(idempotencyKey && (idempotencyKey.length<8 || idempotencyKey.length>255)) throw new AppError('Idempotency-Key must be between 8 and 255 characters.',400,'VALIDATION_ERROR');
  const result = await ingestImageUrl(parsed.data.image_url,parsed.data.filename,idempotencyKey);
  res.status(result.response.status).json(result.response.body);
}));
router.get('/', asyncHandler(async (_req,res) => {
  const { rows } = await pool.query(`SELECT i.id,i.filename,i.status,i.created_at,m.subject,m.category,m.caption,m.confidence,m.attributes
    FROM images i LEFT JOIN image_metadata m ON m.image_id=i.id ORDER BY i.created_at DESC LIMIT 200`);
  res.json({ count:rows.length, images:rows });
}));
router.get('/:id', asyncHandler(async (req,res) => {
  const { rows } = await pool.query(`SELECT i.*,m.subject,m.category,m.attributes,m.caption,m.confidence,m.reviewed FROM images i LEFT JOIN image_metadata m ON m.image_id=i.id WHERE i.id=$1`,[req.params.id]);
  if (!rows.length) throw new AppError('Image not found.',404,'NOT_FOUND');
  res.json({ image:rows[0] });
}));
router.post('/:id/reprocess', asyncHandler(async (req,res) => {
  const { rows } = await pool.query('SELECT id FROM images WHERE id=$1',[req.params.id]);
  if (!rows.length) throw new AppError('Image not found.',404,'NOT_FOUND');
  const { enqueue } = require('../services/jobService');
  const job = await enqueue('process_image',{imageId:req.params.id});
  res.status(202).json({ job_id:job.id,status:job.status });
}));
module.exports = router;
