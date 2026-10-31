const pool = require('../db/pool');
const env = require('../config/env');
const { AppError } = require('../lib/errors');
async function enforceDailyBudget() {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS calls FROM ai_costs WHERE created_at >= date_trunc('day', NOW())");
  if (rows[0].calls >= env.maxAiCallsPerDay) throw new AppError('Daily AI call budget reached. Try again tomorrow or increase MAX_AI_CALLS_PER_DAY.', 429, 'AI_BUDGET_EXCEEDED');
}
async function recordCost({ model, operation, entityType, entityId, inputUnits = 0, outputUnits = 0, durationMs = 0, status = 'success' }) {
  const provider = model === env.visionModel || model === env.textModel ? 'groq' : 'ollama';
  // Estimates use the published Groq list rates; verify current rates before submission.
  const rates = model === env.visionModel
    ? { input: 0.80, output: 4.00 }
    : model === env.textModel
      ? { input: 0.075, output: 0.30 }
      : { input: 0, output: 0 };
  const estimatedCost = provider === 'groq' && status === 'success'
    ? (inputUnits * rates.input + outputUnits * rates.output) / 1_000_000
    : 0;
  await pool.query(`INSERT INTO ai_costs(provider,model,operation,entity_type,entity_id,input_units,output_units,estimated_cost_usd,status,duration_ms)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [provider, model, operation, entityType, entityId || null, inputUnits, outputUnits, estimatedCost, status, durationMs]);
}
module.exports = { enforceDailyBudget, recordCost };
