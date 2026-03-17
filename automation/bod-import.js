/**
 * bod-import.js
 * Parse BOD review.md → JSON cấu trúc + (tuỳ chọn) import vào Notion
 *
 * Input: file .review.md từ ban_chep_loi/ (đã qua human review)
 * Output:
 *   - data/bod/BOD_DDMMYYYY.json (structured directives + analysis)
 *   - data/hm50_snapshots.jsonl  (append snapshot cho mỗi HM được nhắc)
 *   - (tuỳ chọn) Notion Clarification records
 *
 * Usage:
 *   node bod-import.js --file ban_chep_loi/BOD_16032026.review.md              # Parse → JSON only
 *   node bod-import.js --file ban_chep_loi/BOD_16032026.review.md --notion     # Also import to Notion
 *   node bod-import.js --file ban_chep_loi/BOD_16032026.review.md --dry-run    # Preview only
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const { createPage, queryDatabase, queryAllHM50, safeText, DB } = require('./lib/notion-client');
const { buildKeywordIndex, findBestMatch } = require('./hm50-linker');
const { logExecution } = require('./lib/logger');

// ===== CONFIG =====
const DRY_RUN = process.argv.includes('--dry-run');
const IMPORT_NOTION = process.argv.includes('--notion');
const IMPORT_SUPABASE = process.argv.includes('--supabase');
const DATA_DIR = path.join(__dirname, '..', 'data');
const BOD_DIR = path.join(DATA_DIR, 'bod');

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

/**
 * Tạo directive_code từ ngày họp + index
 * "2026-03-02", 1 → "CD-2026-0302-01"
 */
function generateDirectiveCode(meetingDate, index) {
  const d = meetingDate.replace(/-/g, '').slice(2); // 2026-03-02 → 260302
  return `CD-2026-${d.slice(2, 6)}-${String(index).padStart(2, '0')}`;
}

/**
 * Simple keyword matching cho HM50 (dùng khi review.md không có HM50 Match)
 */
function simpleHM50Match(title, nhiemVu, hm50List) {
  const text = (title + ' ' + nhiemVu).toLowerCase();
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

// ===== PARSER: Trích xuất metadata từ filename =====

/**
 * Trích ngày họp từ filename: BOD_DDMMYYYY → { date: "20YY-MM-DD", meeting_id: "BOD_DDMMYYYY" }
 */
function parseMeetingMeta(filename) {
  const base = path.basename(filename, '.review.md');
  // Hỗ trợ: BOD_DDMMYYYY hoặc transcipts_BOD_DDMMYYYY
  const match = base.match(/(?:transcipts_)?BOD_(\d{2})(\d{2})(\d{4})$/);
  if (!match) {
    throw new Error(`Filename không đúng format BOD_DDMMYYYY: ${filename}`);
  }
  const [, dd, mm, yyyy] = match;
  return {
    meeting_id: `BOD_${dd}${mm}${yyyy}`,
    date: `${yyyy}-${mm}-${dd}`,
  };
}

// ===== PARSER: Trích xuất danh sách participants từ header =====

/**
 * Tìm participants nếu có dòng metadata trong file
 * Trả về array hoặc mảng rỗng
 */
function parseParticipants(content) {
  // Tìm pattern kiểu: > Participants: Name1, Name2, ...
  const match = content.match(/>\s*(?:Participants|Thành phần)[:\s]*(.+)/i);
  if (match) {
    return match[1].split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// ===== PARSER: Trích xuất NHÓM headers =====

/**
 * Parse nhóm/phần headers:
 * "## NHÓM A — MSA & Nguồn tuyển (14 chỉ đạo)" → { letter: "A", label: "MSA & Nguồn tuyển", count: 14 }
 * "## PHẦN 1 — MSA (Đặng Tiến Dũng, 08:30)" → { letter: "1", label: "MSA", count: 0 }
 * "## CHỈ ĐẠO TỪ CEO (Lê Long Sơn)" → { letter: "CEO", label: "CHỈ ĐẠO TỪ CEO", count: 0 }
 */
function parseNhomHeader(line) {
  // Format 1: ## NHÓM A — Label (N chỉ đạo)
  const nhomMatch = line.match(/^##\s+NHÓM\s+([A-Z])\s*[—–-]\s*(.+?)(?:\s*\(\s*(\d+)\s*chỉ đạo\s*\))?$/);
  if (nhomMatch) {
    return {
      letter: nhomMatch[1],
      label: nhomMatch[2].trim(),
      count: nhomMatch[3] ? parseInt(nhomMatch[3], 10) : 0,
    };
  }

  // Format 2: ## PHẦN N — Label (người, giờ)
  const phanMatch = line.match(/^##\s+PHẦN\s+(\d+)\s*[—–-]\s*(.+?)(?:\s*\(.+?\))?\s*$/);
  if (phanMatch) {
    return {
      letter: phanMatch[1],
      label: phanMatch[2].trim(),
      count: 0,
    };
  }

  // Format 3: ## CHỈ ĐẠO TỪ CEO (...)
  const ceoMatch = line.match(/^##\s+CHỈ ĐẠO TỪ CEO/i);
  if (ceoMatch) {
    return {
      letter: 'CEO',
      label: 'CHỈ ĐẠO TỪ CEO',
      count: 0,
    };
  }

  return null;
}

// ===== PARSER: Trích xuất directive từ table =====

/**
 * Parse 1 section ### N. Title + table → directive object
 */
function parseDirectiveSection(section, currentNhom) {
  // Tìm title: ### 1. Title here
  const titleMatch = section.match(/^###\s+(\d+)\.\s+(.+)$/m);
  if (!titleMatch) return null;

  const localId = parseInt(titleMatch[1], 10);
  const title = titleMatch[2].trim();

  // Parse table rows: | **Field** | Value |
  const rows = {};
  const tableRegex = /\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|/g;
  let rowMatch;
  while ((rowMatch = tableRegex.exec(section)) !== null) {
    const key = rowMatch[1].trim();
    const value = rowMatch[2].trim();
    rows[key] = value;
  }

  // T1 - Đầu mối → array
  const t1Raw = rows['T1 - Đầu mối'] || '';
  const t1DauMoi = t1Raw
    .split(/[,，]/)
    .map(s => s.replace(/\(.*?\)/g, '').trim()) // bỏ phần trong ngoặc
    .filter(Boolean);

  // T2 - Nhiệm vụ
  const t2NhiemVu = rows['T2 - Nhiệm vụ'] || '';

  // T3 - Mục tiêu
  const t3MucTieu = rows['T3 - Mục tiêu'] || '';

  // T4 - Thời hạn: "Chưa rõ" → null, "2026-03-22 (tuần này)" → "2026-03-22"
  const t4Deadline = parseDeadline(rows['T4 - Thời hạn'] || '');

  // T5 - Tiêu chuẩn
  const t5TieuChuan = rows['T5 - Tiêu chuẩn'] || '';

  // Loại: "Leo thang từ HM40" → "leo_thang", "Mới phát sinh" → "moi", "Bổ sung cho HM22" → "bo_sung"
  const loai = parseLoai(rows['Loại'] || '');

  // HM50 Match: "**HM40 — 4 kênh tạo nguồn (85%)** — explanation"
  const hm50Match = parseHM50Match(rows['HM50 Match'] || '');

  // HM Status: "✅ Có chủ — Person name" hoặc "⚠️ Chưa có chủ — ..." hoặc "❌ Blind spot — ..."
  const hmStatusRaw = findHMStatusRow(rows);
  if (hmStatusRaw && hm50Match) {
    hm50Match.hm_status = parseHMStatus(hmStatusRaw);
  }

  // WHY: "quote here" (dòng ~409-410)
  const whyParsed = parseWhy(rows['WHY'] || '');

  return {
    local_id: localId,
    title,
    t1_dau_moi: t1DauMoi,
    t2_nhiem_vu: t2NhiemVu,
    t3_muc_tieu: t3MucTieu,
    t4_deadline: t4Deadline,
    t5_tieu_chuan: t5TieuChuan,
    loai,
    nhom: currentNhom,
    hm50_match: hm50Match,
    why_quote: whyParsed.quote,
    why_line: whyParsed.line,
    notion_id: null,
    status: 'pending_review',
  };
}

// ===== FIELD PARSERS =====

/**
 * Parse deadline text → ISO date hoặc null
 * "Chưa rõ" → null
 * "2026-03-22 (tuần này)" → "2026-03-22"
 * "2026-04-30" → "2026-04-30"
 * "Liên tục (hàng tuần, hàng tháng)" → null
 * "2026-03-16 (ngay hôm nay)" → "2026-03-16"
 */
function parseDeadline(raw) {
  if (!raw || raw === 'Chưa rõ' || raw.startsWith('Liên tục')) return null;
  const dateMatch = raw.match(/(\d{4}-\d{2}-\d{2})/);
  return dateMatch ? dateMatch[1] : null;
}

/**
 * Parse loại chỉ đạo
 * "Leo thang từ HM40" → "leo_thang"
 * "Mới phát sinh" → "moi"
 * "Mới phát sinh — hành động chuẩn bị cho #4" → "moi"
 * "Mới phát sinh — phản ứng khẩn cấp" → "moi"
 * "Bổ sung cho HM22" → "bo_sung"
 * "Bổ sung cho HM44" → "bo_sung"
 */
function parseLoai(raw) {
  if (!raw) return 'moi';
  const lower = raw.toLowerCase().trim();
  // Dùng includes thay startsWith để bắt cả trường hợp prefix khác (e.g. "Loại: Leo thang...")
  if (lower.includes('leo thang')) return 'leo_thang';
  if (lower.includes('bổ sung')) return 'bo_sung';
  return 'moi'; // "Mới phát sinh" hoặc fallback
}

/**
 * Parse HM50 Match field
 * "**HM40 — 4 kênh tạo nguồn (85%)** — explanation"
 * → { hm_tt: 40, hm_title: "4 kênh tạo nguồn", confidence: 85 }
 */
function parseHM50Match(raw) {
  if (!raw || raw === 'Không match') return null;

  // Pattern: **HM{number} — {title} ({confidence}%)**
  const match = raw.match(/\*\*HM(\d+)\s*[—–-]\s*(.+?)\s*\((\d+)%\)\*\*/);
  if (!match) {
    // Thử pattern đơn giản hơn
    const simpleMatch = raw.match(/HM(\d+)\s*[—–-]\s*(.+?)\s*\((\d+)%\)/);
    if (!simpleMatch) return null;
    return {
      hm_tt: parseInt(simpleMatch[1], 10),
      hm_title: simpleMatch[2].trim(),
      confidence: parseInt(simpleMatch[3], 10),
    };
  }

  return {
    hm_tt: parseInt(match[1], 10),
    hm_title: match[2].trim(),
    confidence: parseInt(match[3], 10),
  };
}

/**
 * Tìm row chứa HM status (key dạng "HM40 Status", "HM22 Status", etc.)
 */
function findHMStatusRow(rows) {
  for (const key of Object.keys(rows)) {
    if (/^HM\d+\s+Status$/i.test(key)) {
      return rows[key];
    }
  }
  return null;
}

/**
 * Parse HM status: "✅ Có chủ — Person" → "✅ Có chủ"
 * "⚠️ Chưa có chủ — ..." → "⚠️ Chưa có chủ"
 * "❌ Blind spot — ..." → "❌ Blind spot"
 */
function parseHMStatus(raw) {
  if (!raw) return '';
  // Lấy phần trước dấu " — " (em-dash hoặc en-dash)
  const parts = raw.split(/\s*[—–]\s*/);
  return parts[0].trim();
}

/**
 * Parse WHY field
 * "quote here" (dòng ~409-410)
 * → { quote: "quote here", line: 409 }
 */
function parseWhy(raw) {
  if (!raw) return { quote: '', line: null };

  // Tìm line number: (dòng ~409-410) hoặc (dòng ~409)
  let line = null;
  const lineMatch = raw.match(/\(dòng\s*~?(\d+)/);
  if (lineMatch) {
    line = parseInt(lineMatch[1], 10);
  }

  // Trích quote: bỏ phần "(dòng ...)" ở cuối, bỏ dấu ngoặc kép bao ngoài
  let quote = raw
    .replace(/\s*\(dòng.*?\)\s*$/, '') // bỏ "(dòng ~409-410)" cuối
    .trim();

  // Bỏ prefix "CEO chỉ đạo nhân rộng mô hình:" etc.
  const prefixMatch = quote.match(/^[^"]*?"(.+)"$/s);
  if (prefixMatch) {
    quote = prefixMatch[1];
  } else {
    // Bỏ dấu ngoặc kép bao ngoài nếu có
    quote = quote.replace(/^[""]/, '').replace(/[""]$/, '');
  }

  return { quote, line };
}

// ===== MAIN PARSER =====

/**
 * Parse toàn bộ file review.md → object { directives, analysis, ... }
 */
function parseReviewFile(content, meetingMeta) {
  const lines = content.split('\n');
  const directives = [];
  let currentNhom = '';
  const nhomMap = {}; // letter → { label, count }

  // Chia file thành sections dựa trên ### headers
  let currentSection = '';
  let sectionStarted = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Kiểm tra NHÓM header — flush section trước khi đổi nhóm
    const nhom = parseNhomHeader(line);
    if (nhom) {
      // Flush directive đang tích luỹ (thuộc nhóm cũ) trước khi chuyển nhóm
      if (sectionStarted && currentSection.trim()) {
        const directive = parseDirectiveSection(currentSection, currentNhom);
        if (directive) directives.push(directive);
        currentSection = '';
        sectionStarted = false;
      }
      currentNhom = nhom.letter;
      nhomMap[nhom.letter] = { count: nhom.count, label: nhom.label };
      continue;
    }

    // Kiểm tra directive header
    if (line.match(/^###\s+\d+\.\s+/)) {
      // Parse section trước đó (nếu có)
      if (sectionStarted && currentSection.trim()) {
        const directive = parseDirectiveSection(currentSection, currentNhom);
        if (directive) directives.push(directive);
      }
      currentSection = line + '\n';
      sectionStarted = true;
      continue;
    }

    if (sectionStarted) {
      currentSection += line + '\n';
    }
  }

  // Parse section cuối
  if (sectionStarted && currentSection.trim()) {
    const directive = parseDirectiveSection(currentSection, currentNhom);
    if (directive) directives.push(directive);
  }

  // Trích xuất participants
  const participants = parseParticipants(content);

  // Build analysis
  const analysis = buildAnalysis(directives, nhomMap, meetingMeta.date);

  return {
    meeting_id: meetingMeta.meeting_id,
    date: meetingMeta.date,
    duration_min: null, // Không có trong review.md, user có thể bổ sung
    participants,
    extracted_by: 'claude-opus-4.6',
    reviewed_by: 'antigravity',
    total_directives: directives.length,
    directives,
    analysis,
    created_at: new Date().toISOString(),
  };
}

// ===== ANALYSIS BUILDER =====

/**
 * Xây dựng phần analysis từ directives đã parse
 */
function buildAnalysis(directives, nhomMap, meetingDate) {
  // by_nhom
  const byNhom = {};
  for (const d of directives) {
    if (!byNhom[d.nhom]) {
      const info = nhomMap[d.nhom] || {};
      byNhom[d.nhom] = { count: 0, label: info.label || '' };
    }
    byNhom[d.nhom].count++;
  }

  // by_loai
  const byLoai = { leo_thang: 0, moi: 0, bo_sung: 0 };
  for (const d of directives) {
    if (byLoai[d.loai] !== undefined) byLoai[d.loai]++;
  }

  // hm_escalation_count — đếm số lần mỗi HM bị leo thang
  const hmEscalation = {};
  for (const d of directives) {
    if (d.loai === 'leo_thang' && d.hm50_match) {
      const tt = d.hm50_match.hm_tt;
      hmEscalation[tt] = (hmEscalation[tt] || 0) + 1;
    }
  }

  // risk_signals — HM bị leo thang + status xấu
  const riskSignals = [];
  const hmSeenForRisk = {};
  for (const d of directives) {
    if (!d.hm50_match) continue;
    const tt = d.hm50_match.hm_tt;
    const status = d.hm50_match.hm_status || '';
    if (hmSeenForRisk[tt]) continue;

    if (status.includes('Chưa có chủ') || status.includes('Blind spot')) {
      const escCount = hmEscalation[tt] || 0;
      const mentionCount = directives.filter(x => x.hm50_match && x.hm50_match.hm_tt === tt).length;
      const loaiLabel = escCount > 0 ? `Leo thang ${escCount} lần` : `Bổ sung ${mentionCount} lần`;
      riskSignals.push({
        hm_tt: tt,
        reason: `${loaiLabel}, status ${status}`,
      });
      hmSeenForRisk[tt] = true;
    }
  }

  // deadline_this_week — tính từ meetingDate, tuần = +7 ngày
  const meetingDateObj = new Date(meetingDate + 'T00:00:00Z');
  const weekEnd = new Date(meetingDateObj);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6); // Chủ nhật tuần đó
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const deadlineThisWeek = [];
  const deadlineToday = [];
  for (const d of directives) {
    if (!d.t4_deadline) continue;
    if (d.t4_deadline === meetingDate) {
      deadlineToday.push(d.local_id);
    } else if (d.t4_deadline >= meetingDate && d.t4_deadline <= weekEndStr) {
      deadlineThisWeek.push(d.local_id);
    }
  }

  // high_confidence_matches — confidence >= 85
  const highConfidence = directives
    .filter(d => d.hm50_match && d.hm50_match.confidence >= 85)
    .map(d => ({
      local_id: d.local_id,
      hm_tt: d.hm50_match.hm_tt,
      confidence: d.hm50_match.confidence,
    }));

  return {
    by_nhom: byNhom,
    by_loai: byLoai,
    hm_escalation_count: hmEscalation,
    risk_signals: riskSignals,
    deadline_this_week: deadlineThisWeek,
    deadline_today: deadlineToday,
    high_confidence_matches: highConfidence,
  };
}

// ===== SNAPSHOT WRITER =====

/**
 * Append entries vào hm50_snapshots.jsonl cho mỗi HM được nhắc trong BOD
 */
function appendHM50Snapshots(directives, meetingId) {
  const snapshotPath = path.join(DATA_DIR, 'hm50_snapshots.jsonl');

  // Kiểm tra xem meeting này đã có snapshot chưa (dedup)
  if (fs.existsSync(snapshotPath)) {
    const existing = fs.readFileSync(snapshotPath, 'utf-8');
    if (existing.includes(`"source":"${meetingId}"`)) {
      console.log(`[BOD-IMPORT] ► Snapshots cho ${meetingId} đã tồn tại, bỏ qua.`);
      return 0;
    }
  }

  // Gom theo hm_tt
  const hmGroups = {};
  for (const d of directives) {
    if (!d.hm50_match) continue;
    const tt = d.hm50_match.hm_tt;
    if (!hmGroups[tt]) {
      hmGroups[tt] = {
        hm_tt: tt,
        hm_title: d.hm50_match.hm_title,
        hm_status: d.hm50_match.hm_status || '',
        count: 0,
        new_count: 0,
      };
    }
    hmGroups[tt].count++;
    if (d.loai === 'moi') hmGroups[tt].new_count++;
  }

  const ts = new Date().toISOString();
  const lines = [];

  for (const [, group] of Object.entries(hmGroups)) {
    const entry = {
      ts,
      hm_tt: group.hm_tt,
      hm_title: group.hm_title,
      status: group.hm_status,
      directive_count: group.count,
      completion_rate: 0,
      source: meetingId,
    };
    if (group.new_count > 0) {
      entry.new_directives = group.new_count;
    }
    lines.push(JSON.stringify(entry));
  }

  if (lines.length > 0) {
    fs.appendFileSync(snapshotPath, lines.join('\n') + '\n', 'utf-8');
    console.log(`[BOD-IMPORT] ☑ Appended ${lines.length} snapshot entries → hm50_snapshots.jsonl`);
  }

  return lines.length;
}

// ===== NOTION WRITER =====

/**
 * Tạo 1 record Clarification trong Notion
 * (Pattern tương tự transcript-parser.js createClarificationRecord)
 */
async function createClarificationRecord(directive, meetingId) {
  const properties = {
    'Tiêu đề': {
      title: [{ text: { content: directive.title.substring(0, 200) } }],
    },
    'TINH_TRANG': {
      select: { name: 'Chờ làm rõ' },
    },
  };

  // T1 - Đầu mối
  if (directive.t1_dau_moi && directive.t1_dau_moi.length > 0) {
    properties['T1 - Đầu mối'] = {
      rich_text: [{ text: { content: directive.t1_dau_moi.join(', ').substring(0, 200) } }],
    };
  }

  // T2 - Nhiệm vụ
  if (directive.t2_nhiem_vu) {
    properties['T2 - Nhiệm vụ'] = {
      rich_text: [{ text: { content: directive.t2_nhiem_vu.substring(0, 2000) } }],
    };
  }

  // T3 - Mục tiêu
  if (directive.t3_muc_tieu) {
    properties['T3 - Mục tiêu'] = {
      rich_text: [{ text: { content: directive.t3_muc_tieu.substring(0, 2000) } }],
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

  // WHY_Context
  if (directive.why_quote) {
    properties['WHY_Context'] = {
      rich_text: [{ text: { content: directive.why_quote.substring(0, 2000) } }],
    };
  }

  // Directive_Type
  const typeMap = {
    leo_thang: 'Leo thang từ HM',
    moi: 'Mới phát sinh',
    bo_sung: 'Bổ sung/điều chỉnh',
  };
  properties['Directive_Type'] = {
    select: { name: typeMap[directive.loai] || 'Mới phát sinh' },
  };

  // Meeting_Source relation (nếu có meeting page ID)
  if (meetingId) {
    properties['Meeting_Source'] = {
      relation: [{ id: meetingId }],
    };
  }

  // HM50_Link relation (từ match)
  if (directive._hmNotionId) {
    properties['HM50_Link'] = {
      relation: [{ id: directive._hmNotionId }],
    };
    // Override type nếu có match
    if (directive.loai === 'leo_thang') {
      properties['Directive_Type'] = {
        select: { name: 'Leo thang từ HM' },
      };
    }
  }

  return createPage(DB.CLARIFICATION, properties);
}

// ===== MAIN =====

async function run() {
  const startTime = Date.now();

  // Parse CLI args
  const fileIdx = process.argv.indexOf('--file');
  const meetingIdx = process.argv.indexOf('--meeting-id');

  if (fileIdx === -1 || !process.argv[fileIdx + 1]) {
    console.error('Usage: node bod-import.js --file <path.review.md> [--supabase] [--notion] [--meeting-id <id>] [--dry-run]');
    process.exit(1);
  }

  const filePath = path.resolve(process.argv[fileIdx + 1]);
  const meetingNotionId = meetingIdx > -1 ? process.argv[meetingIdx + 1] : null;

  const modeLabel = DRY_RUN ? '▫️ DRY-RUN' : IMPORT_SUPABASE ? '► LIVE + SUPABASE' : IMPORT_NOTION ? '► LIVE + NOTION' : '► JSON only';
  console.log('==========================================');
  console.log('[BOD-IMPORT] BOD Review.md → JSON + Supabase/Notion');
  console.log(`[BOD-IMPORT] Mode: ${modeLabel}`);
  console.log(`[BOD-IMPORT] File: ${filePath}`);
  if (meetingNotionId) console.log(`[BOD-IMPORT] Meeting ID: ${meetingNotionId}`);
  console.log('==========================================');

  // 1. Đọc file
  console.log('\n[1/5] Loading review file...');
  if (!fs.existsSync(filePath)) {
    console.error(`[BOD-IMPORT] ✖ File không tồn tại: ${filePath}`);
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  console.log(`[BOD-IMPORT] ☑ Loaded: ${content.length} chars`);

  // 2. Parse metadata từ filename
  console.log('\n[2/5] Parsing meeting metadata...');
  let meetingMeta;
  try {
    meetingMeta = parseMeetingMeta(filePath);
    console.log(`[BOD-IMPORT] ☑ Meeting: ${meetingMeta.meeting_id} | Date: ${meetingMeta.date}`);
  } catch (err) {
    console.error(`[BOD-IMPORT] ✖ ${err.message}`);
    process.exit(1);
  }

  // 3. Parse nội dung → directives
  console.log('\n[3/5] Parsing directives...');
  const result = parseReviewFile(content, meetingMeta);
  console.log(`[BOD-IMPORT] ☑ Trích xuất: ${result.total_directives} chỉ đạo`);

  // Log tóm tắt theo nhóm
  for (const [nhom, info] of Object.entries(result.analysis.by_nhom)) {
    console.log(`  NHÓM ${nhom}: ${info.count} chỉ đạo (${info.label})`);
  }
  console.log(`  Phân loại: leo_thang=${result.analysis.by_loai.leo_thang}, moi=${result.analysis.by_loai.moi}, bo_sung=${result.analysis.by_loai.bo_sung}`);

  // 4. Ghi JSON + snapshots
  console.log('\n[4/5] Writing output files...');
  if (!DRY_RUN) {
    // Đảm bảo thư mục tồn tại
    if (!fs.existsSync(BOD_DIR)) fs.mkdirSync(BOD_DIR, { recursive: true });

    // Ghi BOD JSON
    const jsonPath = path.join(BOD_DIR, `${meetingMeta.meeting_id}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`[BOD-IMPORT] ☑ JSON saved: ${jsonPath}`);

    // Append HM50 snapshots
    appendHM50Snapshots(result.directives, meetingMeta.meeting_id);
  } else {
    console.log('[BOD-IMPORT] ▫️ DRY-RUN: Bỏ qua ghi file');
    // Hiển thị preview
    console.log('\n  Preview chỉ đạo:');
    for (const d of result.directives) {
      const hmInfo = d.hm50_match ? `HM${d.hm50_match.hm_tt} (${d.hm50_match.confidence}%)` : 'Không match';
      console.log(`  ► [${d.local_id}] ${d.title}`);
      console.log(`    T1: ${d.t1_dau_moi.join(', ')} | T4: ${d.t4_deadline || 'Chưa rõ'} | ${hmInfo}`);
    }
  }

  // 5. Import vào Supabase (tuỳ chọn)
  let supaCreated = 0, supaErrors = 0, supaSkipped = 0;

  if (IMPORT_SUPABASE && !DRY_RUN) {
    console.log('\n[5/6] Supabase import...');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[BOD-IMPORT] ✖ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY chưa có trong .env');
      process.exit(1);
    }

    // Load HM50 từ Supabase để match
    let hm50Items = [];
    try {
      hm50Items = await supabaseQuery('hm50', 'order=hm_number');
      console.log(`[BOD-IMPORT] ☑ Loaded ${hm50Items.length} HM50 từ Supabase`);
    } catch (err) {
      console.warn(`[BOD-IMPORT] ⏳ Không load được HM50: ${err.message}`);
    }

    // Kiểm tra directive đã tồn tại cho meeting này (dedup theo meeting_source)
    const meetingSourceLabel = `BOD ${meetingMeta.date.split('-').reverse().join('/')}`;
    let existingCodes = new Set();
    try {
      const existing = await supabaseQuery('directives', `meeting_source=eq.${encodeURIComponent(meetingSourceLabel)}&select=directive_code`);
      existingCodes = new Set(existing.map(d => d.directive_code));
      if (existingCodes.size > 0) {
        console.log(`[BOD-IMPORT] ► Đã tồn tại ${existingCodes.size} chỉ đạo cho ${meetingSourceLabel}`);
      }
    } catch (err) {
      console.warn(`[BOD-IMPORT] ⏳ Không kiểm tra được dedup: ${err.message}`);
    }

    // Insert từng directive
    for (let i = 0; i < result.directives.length; i++) {
      const d = result.directives[i];
      const code = generateDirectiveCode(meetingMeta.date, d.local_id);

      if (existingCodes.has(code)) {
        supaSkipped++;
        console.log(`[BOD-IMPORT] ► Skip: [${code}] đã tồn tại`);
        continue;
      }

      // Resolve HM50 ID
      let hm50Id = null;
      if (d.hm50_match && d.hm50_match.hm_tt && hm50Items.length > 0) {
        // Có match từ review.md → tìm UUID trong Supabase
        const hm = hm50Items.find(h => h.hm_number === d.hm50_match.hm_tt);
        if (hm) hm50Id = hm.id;
      } else if (hm50Items.length > 0) {
        // Không có match từ review → auto-match bằng keyword
        const match = simpleHM50Match(d.title, d.t2_nhiem_vu, hm50Items);
        if (match) {
          hm50Id = match.id;
          console.log(`[BOD-IMPORT]   Auto-match: [${d.local_id}] → HM${match.tt} (${match.score}%)`);
        }
      }

      try {
        const row = {
          directive_code: code,
          t1_dau_moi: d.t1_dau_moi.join(', ') || 'Chưa rõ',
          t2_nhiem_vu: d.t2_nhiem_vu || d.title,
          t3_chi_tieu: d.t3_muc_tieu || null,
          t4_thoi_han: d.t4_deadline || null,
          t5_thanh_vien: d.t1_dau_moi.length > 0 ? d.t1_dau_moi : null,
          loai: d.loai || 'moi',
          hm50_id: hm50Id,
          meeting_source: meetingSourceLabel,
          lls_step: 1,
          tinh_trang: 'cho_xu_ly',
        };

        const inserted = await supabaseInsert('directives', row);
        supaCreated++;
        console.log(`[BOD-IMPORT] ☑ [${code}] ${d.title.substring(0, 60)}`);

        // Update hm50.directive_count
        if (hm50Id) {
          const hm = hm50Items.find(h => h.id === hm50Id);
          if (hm) {
            await supabaseUpdate('hm50', hm.id, { directive_count: (hm.directive_count || 0) + 1 });
          }
        }
      } catch (err) {
        supaErrors++;
        console.error(`[BOD-IMPORT] ✖ [${code}] ${d.title.substring(0, 40)}: ${err.message}`);
      }
    }

    console.log(`[BOD-IMPORT] Supabase: ${supaCreated} created, ${supaSkipped} skipped, ${supaErrors} errors`);
  } else if (IMPORT_SUPABASE && DRY_RUN) {
    console.log('\n[5/6] Supabase DRY-RUN preview...');

    // Load HM50 cho auto-match preview
    let hm50Items = [];
    try {
      hm50Items = await supabaseQuery('hm50', 'order=hm_number');
    } catch (err) { /* bỏ qua */ }

    for (let i = 0; i < result.directives.length; i++) {
      const d = result.directives[i];
      const code = generateDirectiveCode(meetingMeta.date, d.local_id);

      let hmInfo = 'Không match';
      if (d.hm50_match) {
        hmInfo = `HM${d.hm50_match.hm_tt} (${d.hm50_match.confidence}%)`;
      } else if (hm50Items.length > 0) {
        const match = simpleHM50Match(d.title, d.t2_nhiem_vu, hm50Items);
        if (match) hmInfo = `Auto: HM${match.tt} (${match.score}%)`;
      }

      console.log(`  ► [${code}] ${d.title}`);
      console.log(`    T1: ${d.t1_dau_moi.join(', ')} | T4: ${d.t4_deadline || 'Chưa rõ'} | Loại: ${d.loai} | ${hmInfo}`);
    }
  }

  // 6. Import vào Notion (tuỳ chọn, legacy)
  console.log('\n[6/6] Notion import...');
  let notionCreated = 0, notionErrors = 0;

  if (IMPORT_NOTION && !DRY_RUN) {
    // Resolve HM50 Notion IDs bằng cách query HM50 DB
    console.log('[BOD-IMPORT] ► Loading HM50 từ Notion để match IDs...');
    try {
      const hm50Pages = await queryAllHM50();
      const hmIdMap = {}; // hm_tt → notion page id
      for (const page of hm50Pages) {
        const tt = page.properties['TT']?.number;
        if (tt) hmIdMap[tt] = page.id;
      }
      console.log(`[BOD-IMPORT] ☑ Loaded ${Object.keys(hmIdMap).length} HM IDs`);

      // Gắn Notion ID cho mỗi directive có HM match
      for (const d of result.directives) {
        if (d.hm50_match && hmIdMap[d.hm50_match.hm_tt]) {
          d._hmNotionId = hmIdMap[d.hm50_match.hm_tt];
        }
      }
    } catch (err) {
      console.warn(`[BOD-IMPORT] ⏳ Không load được HM50 IDs: ${err.message}. Import không có HM link.`);
    }

    // Tạo records — có idempotency guard để tránh duplicate
    for (const d of result.directives) {
      try {
        // Kiểm tra duplicate: tìm directive cùng title trong Notion
        const existingFilter = {
          and: [
            { property: 'Tiêu đề', title: { equals: d.title.substring(0, 200) } },
          ],
        };
        // Nếu có meeting ID, thêm điều kiện Meeting_Source
        if (meetingNotionId) {
          existingFilter.and.push({
            property: 'Meeting_Source',
            relation: { contains: meetingNotionId },
          });
        }
        const existing = await queryDatabase(DB.CLARIFICATION, existingFilter);
        if (existing.length > 0) {
          d.notion_id = existing[0].id;
          console.log(`[BOD-IMPORT] ► Skip duplicate: [${d.local_id}] "${d.title.substring(0, 50)}"`);
          continue;
        }

        const page = await createClarificationRecord(d, meetingNotionId);
        d.notion_id = page.id;
        notionCreated++;
        console.log(`[BOD-IMPORT] ☑ Created: [${d.local_id}] "${d.title.substring(0, 50)}"`);
      } catch (err) {
        notionErrors++;
        console.error(`[BOD-IMPORT] ✖ Failed: [${d.local_id}] "${d.title.substring(0, 40)}": ${err.message}`);
      }
    }

    // Cập nhật JSON với notion_ids
    if (notionCreated > 0) {
      const jsonPath = path.join(BOD_DIR, `${meetingMeta.meeting_id}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');
      console.log(`[BOD-IMPORT] ☑ JSON updated với ${notionCreated} notion_ids`);
    }
  } else if (IMPORT_NOTION && DRY_RUN) {
    console.log('[BOD-IMPORT] ▫️ DRY-RUN: Bỏ qua Notion import');
  } else {
    console.log('[BOD-IMPORT] ▫️ Notion import: OFF (dùng --notion để bật)');
  }

  // Log execution
  try {
    await logExecution({
      workflow: 'BOD Import',
      step: 'Review.md → JSON',
      status: (notionErrors > 0 || supaErrors > 0) ? '⚠️ Warning' : '✅ Success',
      details: `File: ${path.basename(filePath)} | Directives: ${result.total_directives} | Supabase: ${supaCreated}/${supaErrors} | Notion: ${notionCreated}/${notionErrors}`,
      dryRun: DRY_RUN,
    });
  } catch (err) {
    // Log failure không nên crash toàn bộ
    console.warn(`[BOD-IMPORT] ⏳ Log failed: ${err.message}`);
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n==========================================');
  console.log('[BOD-IMPORT] SUMMARY:');
  console.log(`  📄 File: ${path.basename(filePath)}`);
  console.log(`  📋 Chỉ đạo parsed: ${result.total_directives}`);
  console.log(`  ► Leo thang: ${result.analysis.by_loai.leo_thang} | Mới: ${result.analysis.by_loai.moi} | Bổ sung: ${result.analysis.by_loai.bo_sung}`);
  if (result.analysis.deadline_this_week.length > 0) {
    console.log(`  ⏳ Deadline tuần này: ${result.analysis.deadline_this_week.join(', ')}`);
  }
  if (result.analysis.deadline_today.length > 0) {
    console.log(`  📌 Deadline hôm nay: ${result.analysis.deadline_today.join(', ')}`);
  }
  if (result.analysis.risk_signals.length > 0) {
    console.log(`  ⏳ Risk signals: ${result.analysis.risk_signals.length}`);
    for (const r of result.analysis.risk_signals) {
      console.log(`    HM${r.hm_tt}: ${r.reason}`);
    }
  }
  if (IMPORT_SUPABASE) {
    console.log(`  ☑ Supabase: ${supaCreated} created, ${supaSkipped} skipped, ${supaErrors} errors`);
  }
  if (IMPORT_NOTION) {
    console.log(`  ☑ Notion created: ${notionCreated} | ✖ Errors: ${notionErrors}`);
  }
  console.log(`  ► Time: ${elapsed}s`);
  console.log('==========================================');

  return result;
}

if (require.main === module) {
  run().catch(err => {
    console.error('[BOD-IMPORT] ✖ FATAL:', err.message || err);
    process.exit(1);
  });
}

module.exports = {
  run,
  parseMeetingMeta,
  parseReviewFile,
  parseDirectiveSection,
  parseDeadline,
  parseLoai,
  parseHM50Match,
  parseWhy,
  buildAnalysis,
};
