/**
 * lib/ai-router.js
 * Shared AI Router — Claude (ưu tiên) → Gemini → OpenAI
 * 
 * Dùng chung cho ai-analyzer.js, transcript-parser.js, telegram-bot.js
 * Không cần duplicate router code ở mỗi file nữa.
 * 
 * Usage:
 *   const { aiCall, MODEL, PROVIDER } = require('./lib/ai-router');
 *   const response = await aiCall(messages, { temperature: 0.3, max_tokens: 1000 });
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// ===== PROVIDER DETECTION =====
let client;
let MODEL;
let PROVIDER;

if (process.env.ANTHROPIC_API_KEY) {
  // ===== PRIORITY 1: Claude (Anthropic) =====
  const Anthropic = require('@anthropic-ai/sdk');
  const clientOpts = { apiKey: process.env.ANTHROPIC_API_KEY };

  // Cost gateway: chỉ dùng nếu gateway đang chạy (check đồng bộ)
  const gatewayUrl = process.env.CLAUDE_GATEWAY_URL || 'http://localhost:18800';
  let gatewayAlive = false;
  try {
    require('child_process').execSync(
      `node -e "const h=require('http');h.get('${gatewayUrl}/health',{timeout:800},r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"`,
      { timeout: 2000, stdio: 'ignore' }
    );
    gatewayAlive = true;
  } catch (e) { /* gateway offline, sử dụng direct */ }

  if (gatewayAlive) {
    clientOpts.baseURL = gatewayUrl;
    clientOpts.defaultHeaders = { 'X-Project-Name': process.env.X_PROJECT_NAME || 'CEO_DIRECTIVES' };
    console.log(`[AI] ☑ Cost gateway: ${gatewayUrl}`);
  } else {
    console.log('[AI] ℹ Cost gateway offline — gọi Claude trực tiếp');
  }

  client = new Anthropic(clientOpts);
  MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
  PROVIDER = 'Claude';
  console.log(`[AI] ☑ Router: Claude (${MODEL})`);

} else if (process.env.GEMINI_API_KEY) {
  // ===== PRIORITY 2: Gemini (qua OpenAI-compat API) =====
  const OpenAI = require('openai');
  client = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  });
  MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
  PROVIDER = 'Gemini';
  console.log(`[AI] ☑ Router: Gemini (${MODEL})`);

} else if (process.env.OPENAI_API_KEY) {
  // ===== PRIORITY 3: OpenAI =====
  const OpenAI = require('openai');
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  MODEL = 'gpt-4o-mini';
  PROVIDER = 'OpenAI';
  console.log(`[AI] ☑ Router: OpenAI (${MODEL})`);

} else {
  console.warn('[AI] ⚠ Không có AI key nào — AI commands sẽ không hoạt động');
  console.warn('[AI]   Cần 1 trong: ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY');
  PROVIDER = null;
  MODEL = null;
}

// ===== RETRY CONFIG =====
const MAX_RETRIES = 3;
const RETRY_DELAYS = [5000, 15000, 30000];

// ===== UNIFIED AI CALL =====

/**
 * Gọi AI với retry + rate limit handling
 * Interface thống nhất cho cả 3 providers
 * 
 * @param {Array} messages - Format OpenAI: [{ role: 'system'|'user'|'assistant', content: '...' }]
 * @param {Object} options - { temperature, max_tokens }
 * @returns {Object} Response format: { choices: [{ message: { content: '...' } }], usage: {...} }
 */
async function aiCall(messages, options = {}) {
  if (!client) {
    throw new Error('AI chưa cấu hình — cần ANTHROPIC_API_KEY, GEMINI_API_KEY, hoặc OPENAI_API_KEY trong .env');
  }

  const { temperature = 0.3, max_tokens = 1000 } = options;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (PROVIDER === 'Claude') {
        return await callClaude(messages, { temperature, max_tokens });
      } else {
        return await callOpenAICompat(messages, { temperature, max_tokens });
      }
    } catch (err) {
      const isRateLimit = err.status === 429 || (err.message && err.message.includes('rate'));
      const isOverloaded = err.status === 529 || (err.message && err.message.includes('overloaded'));
      const isLast = attempt >= MAX_RETRIES;

      if ((isRateLimit || isOverloaded) && !isLast) {
        const delay = RETRY_DELAYS[attempt] || 30000;
        console.log(`[AI] ⏳ ${isRateLimit ? 'Rate limit' : 'Overloaded'} — retry ${attempt + 1}/${MAX_RETRIES} sau ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      throw err;
    }
  }
}

// ===== CLAUDE NATIVE CALL =====

async function callClaude(messages, { temperature, max_tokens }) {
  // Tách system message ra (Claude API yêu cầu riêng)
  const systemMsg = messages.find(m => m.role === 'system');
  const otherMsgs = messages.filter(m => m.role !== 'system');

  const params = {
    model: MODEL,
    max_tokens,
    temperature,
    messages: otherMsgs.map(m => ({ role: m.role, content: m.content })),
  };

  if (systemMsg) {
    params.system = systemMsg.content;
  }

  const response = await client.messages.create(params);

  // Convert Claude response → OpenAI-compatible format
  // Để caller code không cần thay đổi gì
  return {
    choices: [{
      message: {
        content: response.content[0]?.text || '',
        role: 'assistant',
      },
      finish_reason: response.stop_reason === 'end_turn' ? 'stop' : response.stop_reason,
    }],
    usage: {
      prompt_tokens: response.usage?.input_tokens || 0,
      completion_tokens: response.usage?.output_tokens || 0,
      total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
    },
    model: response.model,
    provider: 'Claude',
  };
}

// ===== OPENAI-COMPATIBLE CALL (Gemini / OpenAI) =====

async function callOpenAICompat(messages, { temperature, max_tokens }) {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature,
    max_tokens,
  });

  response.provider = PROVIDER;
  return response;
}

// ===== EXPORTS =====
module.exports = {
  aiCall,
  MODEL,
  PROVIDER,
  client,
  MAX_RETRIES,
};
