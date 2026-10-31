const app = require('./app');
const env = require('./config/env');
const pool = require('./db/pool');
const server = app.listen(env.port, () => console.log(`FlyRank API listening on http://localhost:${env.port}`));

async function shutdown(signal) {
    console.log(`${signal} received; shutting down.`);
    server.close(async () => { await pool.end(); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
