/**
 * supabase-client.js
 * Supabase REST client cho automation scripts
 * Dùng chung project với Track_URL + web dashboard
 */

require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY chưa có trong .env — bỏ qua Supabase sync');
}

const headers = {
  apikey: SUPABASE_SERVICE_ROLE_KEY || '',
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY || ''}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates,return=representation',
};

/**
 * Upsert directives vào Supabase
 * Dùng notion_page_id làm conflict key
 */
async function upsertDirectives(directives) {
  if (!SUPABASE_URL) return { synced: 0, error: 'SUPABASE_URL not configured' };

  const rows = directives.map(d => ({
    notion_page_id: d.id,
    title: d.title || '(Không có tiêu đề)',
    status: mapStatus(d.status),
    dau_moi: d.assignee || d.leader || '',
    nhiem_vu: d.task || '',
    deadline: d.deadline || null,
    hm50_ref: d.hm50_ref || null,
    section: extractSection(d.hm50_ref),
    updated_at: new Date().toISOString(),
  }));

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/directives`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(rows),
    });

    if (!res.ok) {
      const err = await res.text();
      return { synced: 0, error: `HTTP ${res.status}: ${err}` };
    }

    const result = await res.json();
    return { synced: result.length, error: null };
  } catch (err) {
    return { synced: 0, error: err.message };
  }
}

/**
 * Map status từ Notion sang format chuẩn Dashboard
 */
function mapStatus(notionStatus) {
  if (!notionStatus) return 'Chờ làm rõ';
  
  const statusMap = {
    'Chờ xử lý': 'Chờ làm rõ',
    'Chờ làm rõ': 'Chờ làm rõ',
    'Chưa rõ': 'Chờ làm rõ',
    'Đã xác nhận': 'Đã xác nhận 5T',
    'Đã xác nhận 5T': 'Đã xác nhận 5T',
    'Đang xử lý': 'Đang thực hiện',
    'Đang thực hiện': 'Đang thực hiện',
    'Hoàn thành': 'Hoàn thành',
    'Đã hoàn thành': 'Hoàn thành',
    'Chờ xác nhận': 'Chờ xác nhận',
  };

  return statusMap[notionStatus] || notionStatus;
}

/**
 * Extract section code từ HM50 ref (VD: "SEC-III/2.1" → "SEC-III")
 */
function extractSection(hm50Ref) {
  if (!hm50Ref) return null;
  const match = hm50Ref.match(/SEC-[IVX]+/i);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Quick check: Supabase có sẵn sàng chưa
 */
function isSupabaseConfigured() {
  return !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

module.exports = { upsertDirectives, isSupabaseConfigured, mapStatus, extractSection };
