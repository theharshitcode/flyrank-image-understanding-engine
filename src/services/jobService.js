const pool = require('../db/pool');
async function enqueue(type, payload, client = pool) {
  const { rows } = await client.query(`INSERT INTO jobs(type,payload) VALUES($1,$2) RETURNING *`, [type, payload]);
  return rows[0];
}
async function claimJob() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`SELECT * FROM jobs WHERE status='queued' AND run_after <= NOW() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`);
    if (!rows.length) { await client.query('COMMIT'); return null; }
    const job = rows[0];
    await client.query(`UPDATE jobs SET status='running', attempts=attempts+1, locked_at=NOW(), updated_at=NOW() WHERE id=$1`, [job.id]);
    await client.query('COMMIT');
    return { ...job, attempts: job.attempts + 1 };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
async function completeJob(id) { await pool.query(`UPDATE jobs SET status='completed', locked_at=NULL, updated_at=NOW() WHERE id=$1`, [id]); }
async function failJob(job, error) {
  const terminal = job.attempts >= job.max_attempts;
  const delaySeconds = Math.min(300, 2 ** job.attempts * 5);
  await pool.query(`UPDATE jobs SET status=$2, last_error=$3, locked_at=NULL, run_after=NOW()+($4::text || ' seconds')::interval, updated_at=NOW() WHERE id=$1`, [job.id, terminal ? 'failed' : 'queued', String(error.message || error).slice(0,1000), delaySeconds]);
}
module.exports = { enqueue, claimJob, completeJob, failJob };
