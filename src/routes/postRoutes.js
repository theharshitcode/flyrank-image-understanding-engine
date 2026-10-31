const router = require('express').Router();
const asyncHandler = require('../lib/asyncHandler');
const pool = require('../db/pool');
const { createPostSchema } = require('../lib/schemas');
const { AppError } = require('../lib/errors');
const { enqueue } = require('../services/jobService');
router.post('/', asyncHandler(async (req,res) => {
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '),400,'VALIDATION_ERROR');
  const p=parsed.data;
  const { rows }=await pool.query(`INSERT INTO posts(title,content,expected_category,expected_subject) VALUES($1,$2,$3,$4) RETURNING *`,[p.title,p.content,p.expected_category||null,p.expected_subject||null]);
  res.status(201).json({post:rows[0]});
}));
router.get('/', asyncHandler(async (_req,res)=>{const {rows}=await pool.query('SELECT * FROM posts ORDER BY created_at DESC');res.json({count:rows.length,posts:rows});}));
router.get('/:id', asyncHandler(async (req,res)=>{const {rows}=await pool.query('SELECT * FROM posts WHERE id=$1',[req.params.id]);if(!rows.length)throw new AppError('Post not found.',404,'NOT_FOUND');res.json({post:rows[0]});}));
router.post('/:id/match', asyncHandler(async (req,res)=>{
  const {rows}=await pool.query('SELECT id FROM posts WHERE id=$1',[req.params.id]);if(!rows.length)throw new AppError('Post not found.',404,'NOT_FOUND');
  const job=await enqueue('match_post',{postId:req.params.id});res.status(202).json({message:'Matching queued.',job_id:job.id,status:job.status});
}));
router.get('/:id/images', asyncHandler(async (req,res)=>{
  const {rows}=await pool.query(`SELECT s.*,i.filename,m.subject,m.category,m.caption,m.confidence FROM suggestions s JOIN images i ON i.id=s.image_id JOIN image_metadata m ON m.image_id=i.id WHERE s.post_id=$1 ORDER BY s.rank_position`,[req.params.id]);
  const hasMatch=rows.some(r=>r.decision==='suggested');res.json({status:hasMatch?'matched':'no_confident_match',message:hasMatch?'Ranked suggestions available.':'No confident match. Review rejection reasons.',suggestions:rows});
}));
module.exports=router;
