const pool=require('../src/db/pool');
(async()=>{try{
  const {rows}=await pool.query(`SELECT p.id,p.title,p.expected_subject,s.image_id,m.subject AS predicted_subject,s.similarity,s.decision,s.rank_position
    FROM posts p LEFT JOIN suggestions s ON s.post_id=p.id AND s.rank_position=1
    LEFT JOIN image_metadata m ON m.image_id=s.image_id
    WHERE p.expected_subject IS NOT NULL ORDER BY p.title`);
  const evaluated=rows.filter(r=>r.image_id);
  const correct=evaluated.filter(r=>String(r.expected_subject).toLowerCase()===String(r.predicted_subject||'').toLowerCase());
  const precision=evaluated.length?correct.length/evaluated.length:0;
  console.log(JSON.stringify({metric:'top_1_precision',correct:correct.length,evaluated_posts:evaluated.length,posts_with_no_candidate:rows.length-evaluated.length,precision:evaluated.length?Number(precision.toFixed(4)):null,results:rows},null,2));
  if(!evaluated.length) console.log('No evaluated suggestions yet. Process images, run match for each labeled post, then rerun this script.');
}catch(e){console.error(e);process.exitCode=1;}finally{await pool.end();}})();
