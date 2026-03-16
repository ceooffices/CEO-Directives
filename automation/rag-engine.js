/**
 * rag-engine.js
 * CEO Directive Automation — Lightweight RAG Pipeline (S2.2)
 *
 * Zero-dependency TF-IDF retrieval thay full context injection.
 * Load context files → chunk theo section → keyword search → trả top-K chunks.
 *
 * Usage:
 *   const rag = require('./rag-engine');
 *   await rag.init();                         // Load + index lần đầu
 *   const chunks = rag.retrieve('quá hạn', 5); // Top 5 chunks liên quan
 *   const context = rag.buildContext('quá hạn'); // Context string cho AI prompt
 */

const fs = require('fs');
const path = require('path');

// ===== CONFIG =====
const PROJECT_ROOT = path.join(__dirname, '..');
const CHUNK_MAX_CHARS = 800;    // Tối đa ~800 ký tự/chunk
const CHUNK_OVERLAP = 100;       // Overlap giữa các chunk
const DEFAULT_TOP_K = 5;

// Danh sách context files (ưu tiên cao → thấp)
const CONTEXT_FILES = [
  // ===== BIÊN BẢN HỌP BOD — "Vàng ròng" Pipeline (B) =====
  // Mô hình tư duy + quyết định của CEO, ưu tiên cao nhất
  { file: 'ban_chep_loi/transcipts_BOD_09032026.md', weight: 1.8, label: 'BOD 09/03/2026 — Biên bản mới nhất' },
  { file: 'ban_chep_loi/20260112 LD BQT P1.txt', weight: 1.7, label: 'Lãnh đạo BQT P1 — 12/01/2026' },
  { file: 'ban_chep_loi/20260112 LD BQT P2.txt', weight: 1.7, label: 'Lãnh đạo BQT P2 — 12/01/2026' },
  { file: 'ban_chep_loi/BOD_05012026.txt', weight: 1.6, label: 'BOD 05/01/2026 — Đầu năm' },
  // ===== Tài liệu nghiệp vụ =====
  { file: 'CONTENT_BIBLE_AIGENT.md', weight: 1.5, label: 'Content Bible' },
  { file: 'CAU-HOI-NGHIEP-VU-CAN-TRA-LOI_03022026.md', weight: 1.4, label: 'FAQ nghiệp vụ' },
  { file: 'TỔNG_HỢP_50_HẠNG_MỤC_CHỈ_ĐẠO_CAM_KẾT_BẢNG_5T_14_02_2026.md', weight: 1.3, label: '50 HM chỉ đạo' },
  { file: 'VĂN HÓA CHÀO HỎI ESUHAI GROUP.md', weight: 1.1, label: 'Văn hóa Esuhai' },
  // ===== Tài liệu kỹ thuật =====
  { file: 'CLAUDE.md', weight: 1.0, label: 'Kiến trúc hệ thống' },
  { file: 'SYSTEM_AUDIT.md', weight: 0.9, label: 'System Audit' },
  { file: 'README.md', weight: 0.8, label: 'Tổng quan dự án' },
  { file: 'notion_properties_lock.md', weight: 0.7, label: 'Notion schema' },
  { file: 'changelog.md', weight: 0.6, label: 'Changelog' },
  // ===== Data files (JSON → đọc và chunk) =====
  { file: 'data/hm50_master.json', weight: 1.2, label: 'HM50 Master', isJSON: true },
  { file: 'data/directives.json', weight: 1.0, label: 'Chỉ đạo hiện tại', isJSON: true },
  { file: 'data/people.json', weight: 0.8, label: 'Nhân sự', isJSON: true },
];

// ===== INTERNAL STATE =====
let _chunks = [];        // Array of { text, source, label, weight, tokens }
let _idf = {};           // token → IDF score
let _initialized = false;

// ===== TOKENIZER (tiếng Việt) =====

/** Chuẩn hóa và tách từ cho tiếng Việt */
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[.,;:!?(){}[\]"'`~@#$%^&*+=|\\/<>—–_]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2); // Bỏ từ quá ngắn
}

// ===== STOP WORDS (tiếng Việt phổ biến) =====
const STOP_WORDS = new Set([
  'và', 'của', 'cho', 'các', 'với', 'trong', 'này', 'đó', 'được', 'có',
  'không', 'là', 'một', 'những', 'để', 'theo', 'từ', 'khi', 'về', 'đã',
  'sẽ', 'đang', 'như', 'tại', 'trên', 'dưới', 'nếu', 'thì', 'cũng',
  'rất', 'bị', 'mà', 'nên', 'vì', 'đến', 'cần', 'phải', 'còn', 'hoặc',
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'with', 'that', 'this', 'from',
]);

function filterStopWords(tokens) {
  return tokens.filter(t => !STOP_WORDS.has(t));
}

// ===== CHUNKING =====

/** Chunk markdown theo heading sections */
function chunkMarkdown(text, source, label, weight) {
  const chunks = [];
  // Tách theo heading (## hoặc ###)
  const sections = text.split(/(?=^#{1,3}\s)/m);

  for (const section of sections) {
    if (!section.trim()) continue;

    if (section.length <= CHUNK_MAX_CHARS) {
      chunks.push(makeChunk(section.trim(), source, label, weight));
    } else {
      // Section quá dài → tách theo đoạn
      const paragraphs = section.split(/\n\n+/);
      let buffer = '';

      for (const para of paragraphs) {
        if (buffer.length + para.length > CHUNK_MAX_CHARS && buffer.length > 0) {
          chunks.push(makeChunk(buffer.trim(), source, label, weight));
          // Overlap: giữ lại phần cuối
          const words = buffer.split(/\s+/);
          const overlapWords = words.slice(-Math.floor(CHUNK_OVERLAP / 5));
          buffer = overlapWords.join(' ') + '\n\n' + para;
        } else {
          buffer += (buffer ? '\n\n' : '') + para;
        }
      }
      if (buffer.trim()) {
        chunks.push(makeChunk(buffer.trim(), source, label, weight));
      }
    }
  }

  return chunks;
}

/** Chunk JSON data — trích summary + items */
function chunkJSON(text, source, label, weight) {
  const chunks = [];
  try {
    const data = JSON.parse(text);

    // Nếu có items array → chunk từng batch
    const items = data.items || data;
    if (Array.isArray(items)) {
      const BATCH_SIZE = 10;
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        const summary = batch.map(item => {
          if (typeof item === 'string') return item;
          // Lấy các field quan trọng
          const parts = [];
          if (item.title) parts.push(item.title);
          if (item.name) parts.push(item.name);
          if (item.status) parts.push(`[${item.status}]`);
          if (item.assignee) parts.push(`→ ${item.assignee}`);
          if (item.leader) parts.push(`(${item.leader})`);
          if (item.department) parts.push(`Phòng: ${item.department}`);
          if (item.email) parts.push(item.email);
          return parts.join(' | ') || JSON.stringify(item).slice(0, 150);
        }).join('\n');

        chunks.push(makeChunk(summary, source, label + ` (${i + 1}-${i + batch.length})`, weight));
      }
    }

    // Summary nếu có stats
    if (data.total !== undefined || data.by_status) {
      const summaryParts = [];
      if (data.total) summaryParts.push(`Tổng: ${data.total}`);
      if (data.by_status) {
        summaryParts.push('Theo trạng thái: ' +
          Object.entries(data.by_status).map(([k, v]) => `${k}: ${v}`).join(', '));
      }
      if (summaryParts.length > 0) {
        chunks.push(makeChunk(summaryParts.join('\n'), source, label + ' (thống kê)', weight * 1.2));
      }
    }
  } catch (err) {
    // JSON parse thất bại → chunk như text
    return chunkMarkdown(text, source, label, weight);
  }

  return chunks;
}

function makeChunk(text, source, label, weight) {
  const tokens = filterStopWords(tokenize(text));
  return { text, source, label, weight, tokens };
}

// ===== TF-IDF ENGINE =====

/** Tính IDF (Inverse Document Frequency) cho toàn bộ corpus */
function computeIDF(chunks) {
  const df = {}; // document frequency per token
  const N = chunks.length;

  for (const chunk of chunks) {
    const uniqueTokens = new Set(chunk.tokens);
    for (const token of uniqueTokens) {
      df[token] = (df[token] || 0) + 1;
    }
  }

  const idf = {};
  for (const [token, count] of Object.entries(df)) {
    idf[token] = Math.log((N + 1) / (count + 1)) + 1; // Smoothed IDF
  }

  return idf;
}

/** Tính TF-IDF vector cho một chunk hoặc query */
function tfIdfVector(tokens, idf) {
  const tf = {};
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }

  const vector = {};
  for (const [token, count] of Object.entries(tf)) {
    vector[token] = (count / tokens.length) * (idf[token] || 1);
  }

  return vector;
}

/** Cosine similarity giữa 2 TF-IDF vectors */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [token, valueA] of Object.entries(vecA)) {
    if (vecB[token]) {
      dotProduct += valueA * vecB[token];
    }
    normA += valueA * valueA;
  }

  for (const valueB of Object.values(vecB)) {
    normB += valueB * valueB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ===== PUBLIC API =====

/**
 * Khởi tạo RAG engine — load files, chunk, compute IDF
 * @returns {Promise<{ chunks: number, files: number }>}
 */
async function init() {
  if (_initialized) return { chunks: _chunks.length, files: CONTEXT_FILES.length };

  console.log('[RAG] Đang index context files...');
  _chunks = [];
  let loadedFiles = 0;

  for (const cfg of CONTEXT_FILES) {
    const filePath = path.join(PROJECT_ROOT, cfg.file);
    try {
      if (!fs.existsSync(filePath)) {
        continue;
      }

      const raw = fs.readFileSync(filePath, 'utf-8');
      if (!raw.trim()) continue;

      const newChunks = cfg.isJSON
        ? chunkJSON(raw, cfg.file, cfg.label, cfg.weight)
        : chunkMarkdown(raw, cfg.file, cfg.label, cfg.weight);

      _chunks.push(...newChunks);
      loadedFiles++;
    } catch (err) {
      console.warn(`[RAG] ⚠ Không đọc được ${cfg.file}: ${err.message}`);
    }
  }

  // Compute IDF
  _idf = computeIDF(_chunks);
  _initialized = true;

  console.log(`[RAG] ☑ Indexed ${_chunks.length} chunks từ ${loadedFiles} files`);
  return { chunks: _chunks.length, files: loadedFiles };
}

/**
 * Tìm kiếm chunks liên quan nhất cho query.
 * @param {string} query — Câu hỏi hoặc từ khóa
 * @param {number} topK — Số chunks trả về (default 5)
 * @returns {Array<{ text, source, label, score }>}
 */
function retrieve(query, topK = DEFAULT_TOP_K) {
  if (!_initialized) {
    console.warn('[RAG] ⚠ Chưa init — gọi rag.init() trước');
    return [];
  }

  const queryTokens = filterStopWords(tokenize(query));
  if (queryTokens.length === 0) return [];

  const queryVec = tfIdfVector(queryTokens, _idf);

  // Score từng chunk
  const scored = _chunks.map(chunk => {
    const chunkVec = tfIdfVector(chunk.tokens, _idf);
    const similarity = cosineSimilarity(queryVec, chunkVec);
    // Nhân với weight của file
    const score = similarity * chunk.weight;
    return { text: chunk.text, source: chunk.source, label: chunk.label, score };
  });

  // Sort theo score giảm dần
  scored.sort((a, b) => b.score - a.score);

  // Trả top-K có score > 0
  return scored.filter(s => s.score > 0).slice(0, topK);
}

/**
 * Build context string sẵn sàng inject vào AI prompt.
 * @param {string} query
 * @param {number} topK
 * @param {number} maxChars — Giới hạn tổng ký tự context
 * @returns {string}
 */
function buildContext(query, topK = DEFAULT_TOP_K, maxChars = 3000) {
  const results = retrieve(query, topK);
  if (results.length === 0) return '';

  let context = '';
  for (const r of results) {
    const entry = `[${r.label}] (relevance: ${(r.score * 100).toFixed(0)}%)\n${r.text}\n\n`;
    if (context.length + entry.length > maxChars) break;
    context += entry;
  }

  return context.trim();
}

/**
 * Force reload — dùng khi data thay đổi
 */
function reload() {
  _initialized = false;
  _chunks = [];
  _idf = {};
  return init();
}

/**
 * Thống kê engine
 */
function stats() {
  return {
    initialized: _initialized,
    totalChunks: _chunks.length,
    vocabularySize: Object.keys(_idf).length,
    fileCount: CONTEXT_FILES.length,
  };
}

// ===== EXPORTS =====
module.exports = { init, retrieve, buildContext, reload, stats };

// ===== CLI =====
if (require.main === module) {
  const query = process.argv[2] || 'chỉ đạo quá hạn';

  (async () => {
    const info = await init();
    console.log(`\n📚 Indexed: ${info.chunks} chunks, ${info.files} files`);
    console.log(`📊 Vocabulary: ${Object.keys(_idf).length} tokens`);

    console.log(`\n🔍 Query: "${query}"\n`);
    const results = retrieve(query, 5);

    if (results.length === 0) {
      console.log('Không tìm thấy kết quả.');
    } else {
      results.forEach((r, i) => {
        console.log(`${i + 1}. [${r.label}] score=${(r.score * 100).toFixed(1)}%`);
        console.log(`   ${r.text.slice(0, 120)}...`);
        console.log();
      });
    }

    console.log('\n📄 Built context:');
    console.log(buildContext(query, 3, 1000));
  })();
}
