const pool=require('../src/db/pool');
const {enqueue}=require('../src/services/jobService');
(async()=>{try{const {rows}=await pool.query('SELECT id,title FROM posts ORDER BY created_at');for(const post of rows){const job=await enqueue('match_post',{postId:post.id});console.log(`Queued ${post.title}: ${job.id}`);}console.log(`Queued ${rows.length} post-matching jobs.`);}catch(error){console.error(error);process.exitCode=1;}finally{await pool.end();}})();
