/**
 * transcript-parser.js
 * BOD transcript → danh sách chỉ đạo 5T → Insert Supabase
 *
 * Input: file .md từ ban_chep_loi/ (bilingual vi/ja)
 * Output: tạo records trong Supabase `directives` table
 *
 * Usage:
 *   node transcript-parser.js --file ban_chep_loi/transcipts_BOD_09032026.md --meeting-date 2026-03-09
 *   node transcript-parser.js --file ban_chep_loi/transcipts_BOD_09032026.md --meeting-date 2026-03-09 --dry-run
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { logExecution } = require('./lib/logger');

// ===== CONFIG =====
const DRY_RUN = process.argv.includes('--dry-run');
const MAX_CHUNK_CHARS = 12000; // Chars per AI chunk — nhỏ hơn để AI có đủ output tokens

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

// Meeting context — inject vào prompt nếu có
let MEETING_CONTEXT = '';

const EXTRACTION_PROMPT = `Bạn là chuyên gia phân tích biên bản họp BOD (Ban Giám Đốc) cho EsuhaiGroup — công ty Giáo dục & Nhân lực Việt-Nhật.

NHIỆM VỤ: Trích xuất TẤT CẢ chỉ đạo từ đoạn biên bản họp bên dưới.
%%MEETING_CONTEXT%%

MỖI CHỈ ĐẠO cần có:
1. "title": Tên chỉ đạo ngắn gọn (≤80 ký tự)
2. "t1_dau_moi": Ai được giao? Dùng TÊN ĐẦY ĐỦ nếu biết (ví dụ "Đặng Tiến Dũng" thay vì "anh Dũng")
3. "t2_nhiem_vu": Nhiệm vụ cụ thể
4. "t3_target": Mục tiêu/chỉ tiêu cần đạt
5. "t4_deadline": Thời hạn (format YYYY-MM-DD, null nếu không rõ). Suy luận deadline từ ngữ cảnh (ví dụ "tuần này" = +7 ngày, "tháng 4" = cuối tháng 4)
6. "t5_tieu_chuan": Tiêu chuẩn hoàn thành
7. "why_context": Đoạn transcript gốc giải thích TẠI SAO chỉ đạo này ra đời (2-3 câu trích dẫn nguyên văn)
8. "directive_type": "Mới phát sinh" hoặc "Leo thang từ HM" hoặc "Bổ sung/điều chỉnh"

QUY TẮC:
- CHỈ trích xuất khi có YÊU CẦU HÀNH ĐỘNG rõ ràng từ CEO/Ban Giám Đốc (không phải nhận xét, tâm sự, ví dụ minh họa)
- KHÔNG trích xuất: lời chào, báo cáo số liệu thuần túy, sự cố kỹ thuật (mất mạng, mất âm thanh), lời động viên/triết lý chung
- WHY context phải trích dẫn nguyên văn từ transcript
- Không bịa thêm thông tin
- Gộp các chỉ đạo liên quan thành 1 nếu cùng đầu mối + cùng chủ đề

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

  const systemPrompt = EXTRACTION_PROMPT.replace('%%MEETING_CONTEXT%%', MEETING_CONTEXT || '');

  const response = await aiCall([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `ĐOẠN BIÊN BẢN HỌP (phần ${chunkIndex + 1}/${totalChunks}):\n\n${chunk}` },
  ], { temperature: 0.1, max_tokens: 8000 });

  const content = response?.choices?.[0]?.message?.content;
  if (!content) {
    // Gemini có thể trả về finish_reason khác (safety, length, etc.)
    const finishReason = response?.choices?.[0]?.finish_reason;
    console.warn(`    ⚠️ Chunk ${chunkIndex + 1}: AI không trả content (finish_reason: ${finishReason || 'unknown'})`);
    return [];
  }

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
    // Log đoạn đầu response để debug
    console.error(`    Raw (first 300): ${content.substring(0, 300)}`);
    return [];
  }
}

// ===== SUPABASE CLIENT =====

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function supabaseHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

async function supabaseQuery(table, query = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: supabaseHeaders(),
  });
  if (!res.ok) throw new Error(`Supabase GET ${table}: ${res.status}`);
  return res.json();
}

async function supabaseInsert(table, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase INSERT ${table}: ${res.status} — ${err}`);
  }
  return res.json();
}

async function supabaseUpdate(table, id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...supabaseHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${table}: ${res.status}`);
  return res.json();
}

// ===== SUPABASE WRITER =====

// Map directive_type → loai field
const TYPE_TO_LOAI = {
  'Leo thang từ HM': 'leo_thang',
  'Bổ sung/điều chỉnh': 'bo_sung',
  'Mới phát sinh': 'moi',
};

function generateDirectiveCode(meetingDate, index) {
  const d = meetingDate.replace(/-/g, '').slice(2); // 2026-03-09 → 260309
  return `CD-2026-${d.slice(2, 6)}-${String(index).padStart(2, '0')}`;
}

// ===== DEDUP =====

// ===== NOISE FILTER =====

const NOISE_KEYWORDS = [
  'sự cố kỹ thuật', 'mất âm thanh', 'không nghe', 'alo 123',
  'gửi file bài', 'đọc offline', 'xử lý kỹ thuật',
  'mất mạng', 'kết nối lại', 'mic', 'camera',
];

/**
 * Lọc bỏ các chỉ đạo noise (sự cố kỹ thuật, chào hỏi, etc.)
 */
function filterNoise(directives) {
  return directives.filter(d => {
    const text = [d.title, d.t2_nhiem_vu].join(' ').toLowerCase();
    for (const kw of NOISE_KEYWORDS) {
      if (text.includes(kw)) {
        console.log(`  🗑️ Filtered noise: "${d.title.substring(0, 60)}"`);
        return false;
      }
    }
    return true;
  });
}

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
  const dateIdx = process.argv.indexOf('--meeting-date');

  if (fileIdx === -1 || !process.argv[fileIdx + 1]) {
    console.error('Usage: node transcript-parser.js --file <path> --meeting-date YYYY-MM-DD [--dry-run]');
    process.exit(1);
  }

  const filePath = path.resolve(process.argv[fileIdx + 1]);
  const meetingDate = dateIdx > -1 ? process.argv[dateIdx + 1] : null;

  if (!meetingDate || !/^\d{4}-\d{2}-\d{2}$/.test(meetingDate)) {
    console.error('❌ --meeting-date bắt buộc (format YYYY-MM-DD)');
    process.exit(1);
  }

  // Load meeting context nếu có file .context.md cùng tên
  const contextPath = filePath.replace(/\.md$/, '.context.md');
  if (fs.existsSync(contextPath)) {
    MEETING_CONTEXT = '\nBỐI CẢNH CUỘC HỌP:\n' + fs.readFileSync(contextPath, 'utf-8').trim();
  }

  console.log('==========================================');
  console.log('[TRANSCRIPT] BOD Transcript → Chỉ đạo 5T → Supabase');
  console.log(`[TRANSCRIPT] Mode: ${DRY_RUN ? 'DRY-RUN (preview)' : 'LIVE (insert Supabase)'}`);
  console.log(`[TRANSCRIPT] AI: ${MODEL || 'NOT CONFIGURED'}`);
  console.log(`[TRANSCRIPT] File: ${filePath}`);
  console.log(`[TRANSCRIPT] Meeting date: ${meetingDate}`);
  if (MEETING_CONTEXT) console.log(`[TRANSCRIPT] Context: ${contextPath}`);
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

  // Filter noise + Dedup
  const beforeFilter = allDirectives.length;
  allDirectives = filterNoise(allDirectives);
  console.log(`  After noise filter: ${beforeFilter} → ${allDirectives.length}`);

  const beforeDedup = allDirectives.length;
  allDirectives = deduplicateDirectives(allDirectives);
  console.log(`  After dedup: ${beforeDedup} → ${allDirectives.length}`);

  if (allDirectives.length === 0) {
    console.log('\n  ⚠️ Không tìm thấy chỉ đạo nào. Kết thúc.');
    return { total: 0, created: 0 };
  }

  // 4. Auto-match HM50 (từ Supabase)
  console.log('\n[4/5] Auto-matching → HM50...');
  let hm50Items = [];
  try {
    hm50Items = await supabaseQuery('hm50', 'order=hm_number');
    console.log(`  Loaded ${hm50Items.length} HM từ Supabase`);
  } catch (err) {
    console.warn(`  ⚠️ Không load được HM50: ${err.message}. Bỏ qua auto-match.`);
  }

  // Simple keyword matching (không cần hm50-linker dependency)
  function simpleMatch(title, nhiem_vu, hm50List) {
    const text = (title + ' ' + nhiem_vu).toLowerCase();
    let best = null;
    let bestScore = 0;

    for (const hm of hm50List) {
      const keywords = (hm.ten || '').toLowerCase().split(/\s+/).filter(w => w.length > 2);
      let score = 0;
      for (const kw of keywords) {
        if (text.includes(kw)) score++;
      }
      const pct = keywords.length > 0 ? Math.round((score / keywords.length) * 100) : 0;
      if (pct > bestScore && pct >= 30) {
        bestScore = pct;
        best = { id: hm.id, tt: hm.hm_number, title: hm.ten, score: pct };
      }
    }
    return best;
  }

  // Match từng directive
  for (const d of allDirectives) {
    if (hm50Items.length > 0) {
      const match = simpleMatch(d.title, d.t2_nhiem_vu || '', hm50Items);
      d._hmMatch = match;
      if (match) {
        console.log(`  ► "${d.title.substring(0, 50)}" → HM${match.tt} (${match.score}%)`);
      } else {
        console.log(`  ❓ "${d.title.substring(0, 50)}" → Không match`);
      }
    }
  }

  // 5. Write to Supabase
  console.log('\n[5/5] Writing to Supabase...');
  let created = 0, errors = 0;

  if (!DRY_RUN) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('  ❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY chưa có trong .env');
      process.exit(1);
    }

    for (let i = 0; i < allDirectives.length; i++) {
      const d = allDirectives[i];
      const code = generateDirectiveCode(meetingDate, i + 1);

      try {
        const row = {
          directive_code: code,
          t1_dau_moi: d.t1_dau_moi || 'Chưa rõ',
          t2_nhiem_vu: d.t2_nhiem_vu || d.title,
          t3_chi_tieu: d.t3_target || null,
          t4_thoi_han: d.t4_deadline || null,
          t5_thanh_vien: null,
          loai: TYPE_TO_LOAI[d.directive_type] || 'moi',
          hm50_id: d._hmMatch ? d._hmMatch.id : null,
          meeting_source: `BOD ${meetingDate}`,
          lls_step: 1,
          tinh_trang: 'cho_xu_ly',
        };

        await supabaseInsert('directives', row);
        created++;
        console.log(`  ☑ [${code}] ${d.title.substring(0, 60)}`);

        // Update hm50.directive_count
        if (d._hmMatch) {
          const hm = hm50Items.find(h => h.id === d._hmMatch.id);
          if (hm) {
            await supabaseUpdate('hm50', hm.id, { directive_count: (hm.directive_count || 0) + 1 });
          }
        }
      } catch (err) {
        errors++;
        console.error(`  ✖ Failed: "${d.title.substring(0, 40)}": ${err.message}`);
      }
    }
  } else {
    console.log('  DRY-RUN: Preview chỉ đạo sẽ tạo:');
    for (let i = 0; i < allDirectives.length; i++) {
      const d = allDirectives[i];
      const code = generateDirectiveCode(meetingDate, i + 1);
      const matchInfo = d._hmMatch ? `→ HM${d._hmMatch.tt} (${d._hmMatch.score}%)` : '→ Mới';
      console.log(`  ► [${code}] ${d.title} ${matchInfo}`);
      console.log(`    T1: ${d.t1_dau_moi || '?'} | T4: ${d.t4_deadline || '?'} | Loại: ${d.directive_type || '?'}`);
    }
    created = allDirectives.length;

    // Xuất file review để anh QC
    const reviewPath = filePath.replace(/\.md$/, '.review.md');
    const reviewLines = [
      `# Review chỉ đạo trích xuất từ BOD ${meetingDate}`,
      `> Generated: ${new Date().toISOString()}`,
      `> Total: ${allDirectives.length} chỉ đạo | AI: ${MODEL}`,
      '',
    ];
    allDirectives.forEach((d, i) => {
      const code = generateDirectiveCode(meetingDate, i + 1);
      const matchInfo = d._hmMatch ? `HM${d._hmMatch.tt} "${d._hmMatch.title?.substring(0, 40)}" (${d._hmMatch.score}%)` : 'Mới phát sinh';
      reviewLines.push(`## ${i + 1}. ${d.title}`);
      reviewLines.push(`| Field | Value |`);
      reviewLines.push(`|---|---|`);
      reviewLines.push(`| **Code** | ${code} |`);
      reviewLines.push(`| **T1 - Đầu mối** | ${d.t1_dau_moi || '?'} |`);
      reviewLines.push(`| **T2 - Nhiệm vụ** | ${d.t2_nhiem_vu || '?'} |`);
      reviewLines.push(`| **T3 - Mục tiêu** | ${d.t3_target || '?'} |`);
      reviewLines.push(`| **T4 - Thời hạn** | ${d.t4_deadline || 'Chưa rõ'} |`);
      reviewLines.push(`| **T5 - Tiêu chuẩn** | ${d.t5_tieu_chuan || '?'} |`);
      reviewLines.push(`| **Loại** | ${d.directive_type || '?'} |`);
      reviewLines.push(`| **HM50 Match** | ${matchInfo} |`);
      reviewLines.push(`| **WHY** | ${(d.why_context || '?').substring(0, 200)} |`);
      reviewLines.push('');
    });
    fs.writeFileSync(reviewPath, reviewLines.join('\n'), 'utf-8');
    console.log(`\n  Review file: ${reviewPath}`);
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
  console.log(`  File: ${path.basename(filePath)}`);
  console.log(`  Meeting: ${meetingDate}`);
  console.log(`  Transcript: ${viText.length} chars → ${chunks.length} chunks`);
  console.log(`  Chỉ đạo extracted: ${allDirectives.length}`);
  console.log(`  Created in Supabase: ${created}`);
  if (errors > 0) console.log(`  Errors: ${errors}`);
  console.log(`  Time: ${elapsed}s`);
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
