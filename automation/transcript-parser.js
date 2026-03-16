/**
 * transcript-parser.js
 * Sprint 4 Phase 4: BOD transcript → danh sách chỉ đạo 5T
 *
 * Input: file .md từ ban_chep_loi/ (bilingual vi/ja)
 * Output: tạo records trong Clarification DB (Notion)
 *
 * Usage:
 *   node transcript-parser.js --file ban_chep_loi/BOD_16032026.md
 *   node transcript-parser.js --file ban_chep_loi/BOD_16032026.md --meeting-id <notion_page_id>
 *   node transcript-parser.js --file ban_chep_loi/BOD_16032026.md --dry-run
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { createPage, queryAllHM50, safeText, DB } = require('./lib/notion-client');
const { buildKeywordIndex, findBestMatch } = require('./hm50-linker');
const { logExecution } = require('./lib/logger');

// ===== CONFIG =====
const DRY_RUN = process.argv.includes('--dry-run');
const MAX_CHUNK_CHARS = 30000; // Chars per AI chunk — giữ dưới context limit

// ===== AI ROUTER (giống ai-analyzer.js) =====
let openai, MODEL;
if (process.env.GEMINI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  });
  MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
} else if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  MODEL = 'gpt-4o-mini';
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [5000, 15000, 30000];

async function aiCall(messages, options = {}) {
  if (!openai) throw new Error('AI chưa cấu hình — cần GEMINI_API_KEY hoặc OPENAI_API_KEY');
  const { temperature = 0.2, max_tokens = 4000 } = options;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages,
        temperature,
        max_tokens,
      });
      return response;
    } catch (err) {
      const isRateLimit = err.status === 429 || (err.message && err.message.includes('rate'));
      if (isRateLimit && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt] || 30000;
        console.log(`[TRANSCRIPT] ⏳ Rate limit — retry ${attempt + 1}/${MAX_RETRIES} sau ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

// ===== TRANSCRIPT PARSER =====

/**
 * Đọc file transcript, chỉ lấy dòng tiếng Việt (bỏ ja:)
 */
function loadVietnameseText(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n');
  const viLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('vi:')) {
      viLines.push(trimmed.slice(3).trim());
    }
  }

  return viLines.join('\n');
}

/**
 * Chia text thành chunks để gửi AI
 * Chia theo dòng, ưu tiên cắt tại ranh giới câu
 */
function chunkText(text, maxChars = MAX_CHUNK_CHARS) {
  if (text.length <= maxChars) return [text];

  const chunks = [];
  const lines = text.split('\n');
  let current = '';

  for (const line of lines) {
    if ((current + '\n' + line).length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ===== AI EXTRACTION =====

const EXTRACTION_PROMPT = `Bạn là chuyên gia phân tích biên bản họp BOD (Ban Giám Đốc) cho EsuhaiGroup.

NHIỆM VỤ: Trích xuất TẤT CẢ chỉ đạo từ đoạn biên bản họp bên dưới.

MỖI CHỈ ĐẠO cần có:
1. "title": Tên chỉ đạo ngắn gọn (≤80 ký tự)
2. "t1_dau_moi": Ai được giao? (tên người/bộ phận)
3. "t2_nhiem_vu": Nhiệm vụ cụ thể
4. "t3_target": Mục tiêu/chỉ tiêu cần đạt
5. "t4_deadline": Thời hạn (nếu có, format YYYY-MM-DD, null nếu không rõ)
6. "t5_tieu_chuan": Tiêu chuẩn hoàn thành
7. "why_context": Đoạn transcript gốc giải thích TẠI SAO chỉ đạo này ra đời (2-3 câu trích dẫn)
8. "directive_type": "Mới phát sinh" hoặc "Leo thang từ HM" hoặc "Bổ sung/điều chỉnh"

QUY TẮC:
- Chỉ trích xuất khi có YÊU CẦU HÀNH ĐỘNG rõ ràng (không phải nhận xét chung)
- Nếu không rõ deadline, để null
- WHY context phải là trích dẫn nguyên văn từ transcript
- Không bịa thêm thông tin
- Phân biệt rõ: báo cáo số liệu ≠ chỉ đạo

Trả lời CHÍNH XÁC format JSON array:
[
  {
    "title": "...",
    "t1_dau_moi": "...",
    "t2_nhiem_vu": "...",
    "t3_target": "...",
    "t4_deadline": "YYYY-MM-DD" or null,
    "t5_tieu_chuan": "...",
    "why_context": "...",
    "directive_type": "..."
  }
]

Nếu đoạn này KHÔNG có chỉ đạo nào, trả lời: []`;

/**
 * Gửi 1 chunk transcript cho AI, nhận về danh sách chỉ đạo
 */
async function extractDirectivesFromChunk(chunk, chunkIndex, totalChunks) {
  console.log(`  [${chunkIndex + 1}/${totalChunks}] Analyzing chunk (${chunk.length} chars)...`);

  const response = await aiCall([
    { role: 'system', content: EXTRACTION_PROMPT },
    { role: 'user', content: `ĐOẠN BIÊN BẢN HỌP (phần ${chunkIndex + 1}/${totalChunks}):\n\n${chunk}` },
  ], { temperature: 0.1, max_tokens: 4000 });

  const content = response.choices[0].message.content;

  // Parse JSON từ response (có thể wrapped trong ```json ... ```)
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1];

  // Thử tìm array trong text
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (!arrayMatch) {
    console.log(`    ► Không tìm thấy chỉ đạo trong chunk ${chunkIndex + 1}`);
    return [];
  }

  try {
    const directives = JSON.parse(arrayMatch[0]);
    console.log(`    ► Tìm thấy ${directives.length} chỉ đạo`);
    return directives;
  } catch (e) {
    console.error(`    ✖ JSON parse error chunk ${chunkIndex + 1}:`, e.message);
    return [];
  }
}

// ===== NOTION WRITER =====

/**
 * Tạo 1 record Clarification trong Notion
 */
async function createClarificationRecord(directive, meetingId, hmMatch) {
  const properties = {
    'Tiêu đề': {
      title: [{ text: { content: directive.title.substring(0, 200) } }],
    },
    'TINH_TRANG': {
      select: { name: 'Chờ làm rõ' },
    },
  };

  // T1 - Đầu mối (nếu property tồn tại)
  if (directive.t1_dau_moi) {
    properties['T1 - Đầu mối'] = {
      rich_text: [{ text: { content: directive.t1_dau_moi.substring(0, 200) } }],
    };
  }

  // T2 - Nhiệm vụ
  if (directive.t2_nhiem_vu) {
    properties['T2 - Nhiệm vụ'] = {
      rich_text: [{ text: { content: directive.t2_nhiem_vu.substring(0, 2000) } }],
    };
  }

  // T3 - Target
  if (directive.t3_target) {
    properties['T3 - Mục tiêu'] = {
      rich_text: [{ text: { content: directive.t3_target.substring(0, 2000) } }],
    };
  }

  // T4 - Thời hạn
  if (directive.t4_deadline) {
    properties['T4 - Thời hạn'] = {
      date: { start: directive.t4_deadline },
    };
  }

  // T5 - Tiêu chuẩn
  if (directive.t5_tieu_chuan) {
    properties['T5 - Tiêu chuẩn'] = {
      rich_text: [{ text: { content: directive.t5_tieu_chuan.substring(0, 2000) } }],
    };
  }

  // WHY_Context (Phase 1 schema)
  if (directive.why_context) {
    properties['WHY_Context'] = {
      rich_text: [{ text: { content: directive.why_context.substring(0, 2000) } }],
    };
  }

  // Directive_Type (Phase 1 schema)
  if (directive.directive_type) {
    properties['Directive_Type'] = {
      select: { name: directive.directive_type },
    };
  }

  // Meeting_Source relation (Phase 1 schema)
  if (meetingId) {
    properties['Meeting_Source'] = {
      relation: [{ id: meetingId }],
    };
  }

  // HM50_Link relation (từ auto-match)
  if (hmMatch) {
    properties['HM50_Link'] = {
      relation: [{ id: hmMatch.id }],
    };
    // Override type nếu matched
    properties['Directive_Type'] = {
      select: { name: 'Leo thang từ HM' },
    };
  }

  return createPage(DB.CLARIFICATION, properties);
}

// ===== DEDUP =====

/**
 * Loại bỏ chỉ đạo trùng lặp (cùng title hoặc quá giống nhau)
 */
function deduplicateDirectives(directives) {
  const seen = new Set();
  return directives.filter(d => {
    const key = d.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    // Kiểm tra title gần giống (>80% overlap)
    for (const existing of seen) {
      if (similarityScore(key, existing) > 0.8) return false;
    }
    seen.add(key);
    return true;
  });
}

function similarityScore(a, b) {
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

// ===== MAIN =====

async function run() {
  const startTime = Date.now();

  // Parse CLI args
  const fileIdx = process.argv.indexOf('--file');
  const meetingIdx = process.argv.indexOf('--meeting-id');

  if (fileIdx === -1 || !process.argv[fileIdx + 1]) {
    console.error('Usage: node transcript-parser.js --file <path> [--meeting-id <id>] [--dry-run]');
    process.exit(1);
  }

  const filePath = path.resolve(process.argv[fileIdx + 1]);
  const meetingId = meetingIdx > -1 ? process.argv[meetingIdx + 1] : null;

  console.log('==========================================');
  console.log('[TRANSCRIPT] BOD Transcript → Chỉ đạo 5T');
  console.log(`[TRANSCRIPT] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log(`[TRANSCRIPT] AI: ${MODEL || 'NOT CONFIGURED'}`);
  console.log(`[TRANSCRIPT] File: ${filePath}`);
  if (meetingId) console.log(`[TRANSCRIPT] Meeting ID: ${meetingId}`);
  console.log('==========================================');

  if (!openai) {
    console.error('❌ AI chưa cấu hình — cần GEMINI_API_KEY hoặc OPENAI_API_KEY trong .env');
    process.exit(1);
  }

  // 1. Load transcript
  console.log('\n[1/5] Loading transcript...');
  if (!fs.existsSync(filePath)) {
    console.error(`  ❌ File không tồn tại: ${filePath}`);
    process.exit(1);
  }
  const viText = loadVietnameseText(filePath);
  console.log(`  Loaded: ${viText.length} chars (Vietnamese only)`);

  // 2. Chunk
  console.log('\n[2/5] Chunking transcript...');
  const chunks = chunkText(viText);
  console.log(`  Split into ${chunks.length} chunks`);

  // 3. AI extraction
  console.log('\n[3/5] AI extracting directives...');
  let allDirectives = [];

  for (let i = 0; i < chunks.length; i++) {
    try {
      const directives = await extractDirectivesFromChunk(chunks[i], i, chunks.length);
      allDirectives.push(...directives);
    } catch (err) {
      console.error(`  ✖ Chunk ${i + 1} failed:`, err.message);
    }
  }

  // Dedup
  const beforeDedup = allDirectives.length;
  allDirectives = deduplicateDirectives(allDirectives);
  console.log(`  Total: ${allDirectives.length} chỉ đạo (dedup: ${beforeDedup} → ${allDirectives.length})`);

  if (allDirectives.length === 0) {
    console.log('\n  ⚠️ Không tìm thấy chỉ đạo nào. Kết thúc.');
    return { total: 0, created: 0 };
  }

  // 4. Auto-match HM50
  console.log('\n[4/5] Auto-matching → HM50...');
  let keywordIndex = [];
  try {
    const hm50Pages = await queryAllHM50();
    // Parse HM50 pages (inline, tránh circular dep)
    const hm50Items = hm50Pages.map(p => {
      const props = p.properties || {};
      return {
        id: p.id,
        tt: props['TT']?.number || 0,
        hang_muc: safeText(props['Hạng mục']?.title),
        phan_cl: props['Phần CL']?.select?.name || '',
        t2_task: safeText(props['T2: Task']?.rich_text),
        t3_target: safeText(props['T3: Target']?.rich_text),
        kpi_daily: safeText(props['KPI_Daily']?.rich_text),
      };
    });
    keywordIndex = buildKeywordIndex(hm50Items);
    console.log(`  Loaded ${keywordIndex.length} HM for matching`);
  } catch (err) {
    console.warn(`  ⚠️ Không load được HM50: ${err.message}. Bỏ qua auto-match.`);
  }

  // Match từng directive
  for (const d of allDirectives) {
    if (keywordIndex.length > 0) {
      const match = findBestMatch(d.title, d.t2_nhiem_vu || '', keywordIndex);
      d._hmMatch = match;
      if (match) {
        console.log(`  ✅ "${d.title.substring(0, 50)}" → HM${match.tt} (${match.score}%)`);
      } else {
        console.log(`  ❓ "${d.title.substring(0, 50)}" → Không match`);
      }
    }
  }

  // 5. Write to Notion
  console.log('\n[5/5] Writing to Notion...');
  let created = 0, errors = 0;

  if (!DRY_RUN) {
    for (const d of allDirectives) {
      try {
        await createClarificationRecord(d, meetingId, d._hmMatch);
        created++;
        console.log(`  ☑ Created: "${d.title.substring(0, 60)}"`);
      } catch (err) {
        errors++;
        console.error(`  ✖ Failed: "${d.title.substring(0, 40)}": ${err.message}`);
      }
    }
  } else {
    console.log('  🏜️ DRY-RUN: Preview chỉ đạo sẽ tạo:');
    for (const d of allDirectives) {
      const matchInfo = d._hmMatch ? `→ HM${d._hmMatch.tt}` : '→ Mới';
      console.log(`  ► ${d.title} ${matchInfo}`);
      console.log(`    T1: ${d.t1_dau_moi || '?'} | T4: ${d.t4_deadline || '?'}`);
      console.log(`    WHY: ${(d.why_context || '').substring(0, 100)}...`);
    }
    created = allDirectives.length; // Giả lập cho summary
  }

  await logExecution({
    workflow: 'Transcript Parser',
    step: 'BOD → 5T',
    status: errors > 0 ? '⚠️ Partial' : '✅ Success',
    details: `File: ${path.basename(filePath)} | Extracted: ${allDirectives.length} | Created: ${created} | Errors: ${errors}`,
    dryRun: DRY_RUN,
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n==========================================');
  console.log('[TRANSCRIPT] SUMMARY:');
  console.log(`  📄 File: ${path.basename(filePath)}`);
  console.log(`  📊 Transcript: ${viText.length} chars → ${chunks.length} chunks`);
  console.log(`  📋 Chỉ đạo extracted: ${allDirectives.length}`);
  console.log(`  ☑ Created in Notion: ${created}`);
  if (errors > 0) console.log(`  ✖ Errors: ${errors}`);
  console.log(`  ⏱️ Time: ${elapsed}s`);
  console.log('==========================================');

  return { total: allDirectives.length, created, errors };
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ FATAL:', err.message || err);
    process.exit(1);
  });
}

module.exports = { run, loadVietnameseText, chunkText, extractDirectivesFromChunk };
