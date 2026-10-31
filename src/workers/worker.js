const env = require('../config/env');
const pool = require('../db/pool');
const { claimJob, completeJob, failJob } = require('../services/jobService');
const { handleJob } = require('./handlers');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let stopping = false;
process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });
(async () => {
  console.log('FlyRank worker started.');
  while (!stopping) {
    try {
      const job = await claimJob();
      if (!job) { await sleep(env.workerPollMs); continue; }
      console.log(`Processing job ${job.id} (${job.type}), attempt ${job.attempts}/${job.max_attempts}`);
      try { await handleJob(job); await completeJob(job.id); }
      catch (error) { console.error(`Job ${job.id} failed:`, error.message); await failJob(job,error); }
    } catch (error) { console.error('Worker loop error:',error.message); await sleep(env.workerPollMs); }
  }
  await pool.end();
  console.log('Worker stopped.');
})();
