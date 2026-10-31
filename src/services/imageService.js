const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const pool = require('../db/pool');
const env = require('../config/env');
const { enqueue } = require('./jobService');
const { AppError } = require('../lib/errors');

async function ingestImageUrl(url, filename, idempotencyKey = null) {
  if (idempotencyKey) {
    const prior = await pool.query('SELECT response FROM idempotency_keys WHERE key=$1', [idempotencyKey]);
    if (prior.rows.length) return { replayed: true, response: prior.rows[0].response };
  }
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new AppError(`Could not download image (${response.status})`, 400, 'IMAGE_DOWNLOAD_FAILED');
  const mimeType = response.headers.get('content-type')?.split(';')[0] || 'application/octet-stream';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) throw new AppError('Only JPEG, PNG and WebP images are accepted.', 415, 'UNSUPPORTED_IMAGE_TYPE');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > env.maxImageBytes) throw new AppError('Image is empty or exceeds MAX_IMAGE_BYTES.', 413, 'IMAGE_TOO_LARGE');
  await fs.mkdir(env.imageStorageDir, { recursive: true });
  const ext = mimeType === 'image/png' ? '.png' : mimeType === 'image/webp' ? '.webp' : '.jpg';
  const safeName = `${crypto.randomUUID()}${ext}`;
  const storagePath = path.join(env.imageStorageDir, safeName);
  await fs.writeFile(storagePath, buffer, { flag: 'wx' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (idempotencyKey) {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [idempotencyKey]);
      const prior = await client.query('SELECT response FROM idempotency_keys WHERE key=$1', [idempotencyKey]);
      if (prior.rows.length) {
        await client.query('ROLLBACK');
        await fs.unlink(storagePath).catch(() => { });
        return { replayed: true, response: prior.rows[0].response };
      }
    }
    const { rows } = await client.query(`INSERT INTO images(filename,original_url,storage_path,mime_type,byte_size) VALUES($1,$2,$3,$4,$5) RETURNING *`, [filename || safeName, url, storagePath, mimeType, buffer.length]);
    await enqueue('process_image', { imageId: rows[0].id }, client);
    const body = { message: 'Image accepted for background processing.', image: { id: rows[0].id, filename: rows[0].filename, status: rows[0].status }, job_status: 'queued' };
    if (idempotencyKey) await client.query('INSERT INTO idempotency_keys(key,response) VALUES($1,$2)', [idempotencyKey, JSON.stringify({ status: 202, body })]);
    await client.query('COMMIT');
    return { replayed: false, response: { status: 202, body }, image: rows[0] };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => { });
    await fs.unlink(storagePath).catch(() => { });
    throw error;
  } finally { client.release(); }
}
module.exports = { ingestImageUrl };
