const router = require('express').Router();
const asyncHandler = require('../lib/asyncHandler');
const pool = require('../db/pool');
router.get('/', asyncHandler(async (_req,res) => { await pool.query('SELECT 1'); res.json({ status:'ok', service:'flyrank-image-matching-engine', database:'connected', timestamp:new Date().toISOString() }); }));
module.exports = router;
