/**
 * lib/supabase-client.js
 * Supabase client wrapper cho CEO Directive Automation
 * Thay thế notion-client.js — cùng API surface, nhanh 10-50x
 * 
 * Dùng chung cho WF1-WF5 (WF6 deprecated)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[SUPABASE] ❌ Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// ===== CONFIG =====

const BOD_HOSTING_EMAIL = process.env.BOD_HOSTING_EMAIL || 'letuan@esuhai.com';
const ALWAYS_CC = (process.env.ALWAYS_CC || 'hoangkha@esuhai.com,vynnl@esuhai.com')
  .split(',').map(e => e.trim()).filter(Boolean);
const CEO_EMAIL = process.env.CEO_EMAIL || 'hoangkha@esuhai.com';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://ceo-directives.vercel.app';

// ===== DIRECTIVE QUERIES =====

/**
 * WF1 STEP1: Chỉ đạo mới, chưa được duyệt
 * Notion equiv: queryClarificationsStep1()
 */
async function queryPendingApproval() {
  const { data, error } = await db
    .from('directives')
    .select(`
      *, 
      hm50:hm50_id ( hm_number, ten )
    `)
    .eq('tinh_trang', 'cho_xu_ly')
    .is('approved_by', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`queryPendingApproval: ${error.message}`);
  return data || [];
}

/**
 * WF1 STEP2: Đã duyệt, chờ đầu mối xác nhận 4T
 * Notion equiv: queryClarificationsStep2()
 */
async function queryApprovedPendingConfirm() {
  const { data, error } = await db
    .from('directives')
    .select(`
      *, 
      hm50:hm50_id ( hm_number, ten )
    `)
    .not('tinh_trang', 'eq', 'hoan_thanh')
    .not('approved_by', 'is', null)
    .or('reminder_status.is.null,reminder_status.eq.gui_loi_nhac')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`queryApprovedPendingConfirm: ${error.message}`);
  return data || [];
}

/**
 * WF2: Chỉ đạo đã xác nhận 5T, chưa hoàn thành
 * Notion equiv: queryConfirmed5T()
 */
async function queryConfirmed5T() {
  const { data, error } = await db
    .from('directives')
    .select('*')
    .eq('tinh_trang', 'da_xac_nhan')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`queryConfirmed5T: ${error.message}`);
  return data || [];
}

/**
 * WF3: Tất cả chỉ đạo (cho status snapshot)
 * Notion equiv: queryClarificationsForSnapshot()
 */
async function queryAllDirectives() {
  const { data, error } = await db
    .from('directives')
    .select(`
      id, directive_code, t1_dau_moi, t1_email, t2_nhiem_vu,
      t4_thoi_han, tinh_trang, approved_by, confirmed_by,
      meeting_source, lls_step, updated_at
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`queryAllDirectives: ${error.message}`);
  return data || [];
}

/**
 * WF4: Chỉ đạo chưa hoàn thành + có deadline (cho escalation)
 * Notion equiv: queryOverdueClarifications()
 * Tối ưu: chỉ lấy directives thực sự quá hạn >= 3 ngày
 */
async function queryOverdueDirectives() {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  const { data, error } = await db
    .from('directives')
    .select(`
      *, 
      hm50:hm50_id ( hm_number, ten )
    `)
    .not('tinh_trang', 'eq', 'hoan_thanh')
    .not('t4_thoi_han', 'is', null)
    .lt('t4_thoi_han', threeDaysAgo)
    .order('t4_thoi_han', { ascending: true });

  if (error) throw new Error(`queryOverdueDirectives: ${error.message}`);
  return data || [];
}

/**
 * WF5: Chỉ đạo đang hoạt động (chưa hoàn thành)
 * Notion equiv: queryActiveClarifications()
 */
async function queryActiveDirectives() {
  const { data, error } = await db
    .from('directives')
    .select(`
      id, directive_code, t1_dau_moi, t1_email, t2_nhiem_vu,
      t3_chi_tieu, t4_thoi_han, t5_thanh_vien, tinh_trang,
      meeting_source, bod_hosting_email, confirmed_at, lls_step
    `)
    .not('tinh_trang', 'eq', 'hoan_thanh')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`queryActiveDirectives: ${error.message}`);
  return data || [];
}

// ===== STAFF QUERIES =====

/**
 * Resolve email từ tên đầu mối
 * Notion equiv: resolveEmailFromRelation() — nhanh hơn 50x
 */
async function getStaffEmail(name) {
  if (!name) return '';
  
  const { data, error } = await db
    .from('staff')
    .select('email, name')
    .ilike('name', `%${name}%`)
    .limit(1)
    .single();

  if (error || !data) return '';
  return data.email || '';
}

/**
 * Lấy danh sách email từ nhiều tên cùng lúc (batch)
 */
async function getStaffEmails(names) {
  if (!names || names.length === 0) return {};

  const { data, error } = await db
    .from('staff')
    .select('name, email')
    .not('email', 'is', null);

  if (error || !data) return {};

  const result = {};
  for (const name of names) {
    const match = data.find(s => 
      s.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(s.name.toLowerCase())
    );
    result[name] = match?.email || '';
  }
  return result;
}

// ===== UPDATE =====

/**
 * Cập nhật directive
 * Notion equiv: updatePage(pageId, properties) — trực tiếp, nhanh hơn
 */
async function updateDirective(id, fields) {
  const safeFields = { ...fields, updated_at: new Date().toISOString() };
  
  // Prevent overwriting protected fields
  delete safeFields.id;
  delete safeFields.directive_code;
  delete safeFields.created_at;

  const { data, error } = await db
    .from('directives')
    .update(safeFields)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`updateDirective ${id}: ${error.message}`);
  return data;
}

/**
 * Cập nhật directive theo directive_code (cho WF2 form matching)
 */
async function updateDirectiveByCode(directiveCode, fields) {
  const safeFields = { ...fields, updated_at: new Date().toISOString() };
  delete safeFields.id;
  delete safeFields.directive_code;
  delete safeFields.created_at;

  const { data, error } = await db
    .from('directives')
    .update(safeFields)
    .eq('directive_code', directiveCode)
    .select()
    .single();

  if (error) throw new Error(`updateDirectiveByCode ${directiveCode}: ${error.message}`);
  return data;
}

// ===== LOGGING =====

/**
 * Ghi event vào engagement_events
 * Thay thế logger.js → Notion WF_LOGS
 * 
 * @param {string|null} directiveId - UUID directive (null nếu log chung)
 * @param {string} eventType - Loại event (wf1_step1_sent, wf4_escalation, etc.)
 * @param {Object} metadata - Chi tiết bổ sung
 * @param {boolean} [dryRun=false] - Nếu true, chỉ log console
 */
async function logEvent(directiveId, eventType, metadata = {}, dryRun = false) {
  const logTitle = `${eventType}: ${metadata.title || metadata.details || ''}`.substring(0, 100);

  if (dryRun) {
    console.log(`[log] 🏜️ DRY-RUN: ${logTitle}`);
    return;
  }

  try {
    const { error } = await db
      .from('engagement_events')
      .insert({
        directive_id: directiveId,
        event_type: eventType,
        recipient_email: metadata.emailTo || metadata.recipient || null,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      });

    if (error) {
      console.error(`[log] ❌ Log event failed: ${error.message}`);
    } else {
      console.log(`[log] ✅ ${logTitle}`);
    }
  } catch (err) {
    console.error(`[log] ❌ Exception: ${err.message}`);
    // Không throw — log failure không nên crash workflow
  }
}

// ===== STATUS CHANGE DETECTION (WF3) =====

/**
 * Lấy status changes gần đây từ lls_step_history
 * Thay thế file snapshot mechanism của WF3 cũ
 */
async function getRecentStatusChanges(sinceTimestamp) {
  const since = sinceTimestamp || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data, error } = await db
    .from('lls_step_history')
    .select(`
      id, directive_id, step_number, step_name, action, actor, detail, created_at,
      directives:directive_id ( directive_code, t1_dau_moi, t1_email, t2_nhiem_vu, tinh_trang )
    `)
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getRecentStatusChanges: ${error.message}`);
  return data || [];
}

/**
 * Lấy snapshot trạng thái hiện tại (fallback cho WF3 nếu lls_step_history chưa đủ)
 */
async function getDirectiveStatusSnapshot() {
  const { data, error } = await db
    .from('directives')
    .select('id, directive_code, tinh_trang, approved_by, t1_dau_moi, t1_email, t4_thoi_han, updated_at');

  if (error) throw new Error(`getDirectiveStatusSnapshot: ${error.message}`);
  return data || [];
}

// ===== STEP 3 — CHATLONG ANALYSIS =====

/**
 * Query directives đã duyệt (step 2) chưa phân tích
 * Cho wf3-chatlong-analysis.js
 */
async function queryDirectivesForAnalysis() {
  const { data, error } = await db
    .from('directives')
    .select(`
      *,
      hm50:hm50_id ( hm_number, ten )
    `)
    .eq('lls_step', 2)
    .not('approved_by', 'is', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`queryDirectivesForAnalysis: ${error.message}`);
  return data || [];
}

// ===== DIRECTIVE VERSIONS =====

/**
 * Lưu phiên bản mới cho directive (AI analysis hoặc upgrade)
 */
async function saveDirectiveVersion(directiveId, versionData) {
  // Get next version number
  const { data: existing } = await db
    .from('directive_versions')
    .select('version_number')
    .eq('directive_id', directiveId)
    .order('version_number', { ascending: false })
    .limit(1);

  const nextVersion = (existing && existing.length > 0)
    ? existing[0].version_number + 1
    : 1;

  const { data, error } = await db
    .from('directive_versions')
    .insert({
      directive_id: directiveId,
      version_number: nextVersion,
      ...versionData,
    })
    .select()
    .single();

  if (error) throw new Error(`saveDirectiveVersion: ${error.message}`);

  // Update current_version on directive
  await db
    .from('directives')
    .update({ current_version: nextVersion })
    .eq('id', directiveId);

  return data;
}

/**
 * Lấy toàn bộ version history cho 1 directive
 */
async function getDirectiveVersions(directiveId) {
  const { data, error } = await db
    .from('directive_versions')
    .select('*')
    .eq('directive_id', directiveId)
    .order('version_number', { ascending: true });

  if (error) throw new Error(`getDirectiveVersions: ${error.message}`);
  return data || [];
}

/**
 * Lấy version mới nhất
 */
async function getLatestVersion(directiveId) {
  const { data, error } = await db
    .from('directive_versions')
    .select('*')
    .eq('directive_id', directiveId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`getLatestVersion: ${error.message}`);
  }
  return data || null;
}

/**
 * Update version status (for upgrade review)
 */
async function updateVersionStatus(versionId, fields) {
  const { data, error } = await db
    .from('directive_versions')
    .update(fields)
    .eq('id', versionId)
    .select()
    .single();

  if (error) throw new Error(`updateVersionStatus: ${error.message}`);
  return data;
}

// ===== STEP TRANSITION =====

/**
 * Cập nhật lls_step + ghi lls_step_history
 * Dùng cho mọi step transition (Step 2→3, 3→4, 5→6, etc.)
 */
async function updateDirectiveStep(directiveId, stepNumber, stepName, action, actor, detail) {
  // Update directive
  await db
    .from('directives')
    .update({ lls_step: stepNumber, updated_at: new Date().toISOString() })
    .eq('id', directiveId);

  // Insert history
  const { data, error } = await db
    .from('lls_step_history')
    .insert({
      directive_id: directiveId,
      step_number: stepNumber,
      step_name: stepName,
      action,
      actor: actor || 'system',
      detail: detail || null,
    })
    .select()
    .single();

  if (error) throw new Error(`updateDirectiveStep: ${error.message}`);
  return data;
}

// ===== HM50 QUERIES (cho BSC nếu cần) =====

async function queryAllHM50() {
  const { data, error } = await db
    .from('hm50')
    .select('*')
    .order('hm_number', { ascending: true });

  if (error) throw new Error(`queryAllHM50: ${error.message}`);
  return data || [];
}

// ===== UTILITY =====

/**
 * Build dashboard URL cho directive (thay thế Notion URL)
 */
function directiveUrl(id) {
  return `${DASHBOARD_URL}/directive/${id}`;
}

module.exports = {
  db,
  // Config
  BOD_HOSTING_EMAIL,
  ALWAYS_CC,
  CEO_EMAIL,
  DASHBOARD_URL,
  // WF1
  queryPendingApproval,
  queryApprovedPendingConfirm,
  // WF2
  queryConfirmed5T,
  updateDirective,
  updateDirectiveByCode,
  // WF3 — Status
  queryAllDirectives,
  getRecentStatusChanges,
  getDirectiveStatusSnapshot,
  // WF3 — ChatLong Analysis (Step 3)
  queryDirectivesForAnalysis,
  // WF4
  queryOverdueDirectives,
  // WF5
  queryActiveDirectives,
  // Staff
  getStaffEmail,
  getStaffEmails,
  // HM50
  queryAllHM50,
  // Directive Versions (Step 3 + Step 5-6)
  saveDirectiveVersion,
  getDirectiveVersions,
  getLatestVersion,
  updateVersionStatus,
  // Step Transition
  updateDirectiveStep,
  // Logging
  logEvent,
  // Utilities
  directiveUrl,
};
