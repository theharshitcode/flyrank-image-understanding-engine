const router=require('express').Router();const asyncHandler=require('../lib/asyncHandler');const pool=require('../db/pool');const {AppError}=require('../lib/errors');
router.post('/:suggestionId',asyncHandler(async(req,res)=>{
  const action=req.body.action; if(!['approved','rejected'].includes(action))throw new AppError('action must be approved or rejected.',400,'VALIDATION_ERROR');
  const client=await pool.connect();try{await client.query('BEGIN');const {rows}=await client.query('SELECT id FROM suggestions WHERE id=$1 FOR UPDATE',[req.params.suggestionId]);if(!rows.length)throw new AppError('Suggestion not found.',404,'NOT_FOUND');
    const {rows:review}=await client.query('INSERT INTO reviews(suggestion_id,action,note) VALUES($1,$2,$3) RETURNING *',[req.params.suggestionId,action,typeof req.body.note==='string'?req.body.note.slice(0,500):null]);await client.query('COMMIT');res.status(201).json({review:review[0]});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}));
router.get('/',asyncHandler(async(_req,res)=>{const {rows}=await pool.query(`SELECT r.*,s.post_id,s.image_id FROM reviews r JOIN suggestions s ON s.id=r.suggestion_id ORDER BY r.created_at DESC LIMIT 200`);res.json({reviews:rows});}));
module.exports=router;
