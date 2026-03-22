/**
 * wf6-upgrade-loop.js
 * CEO Directive — Steps 5-6: Iterative Upgrade Loop
 *
 * Flow:
 *   Step 5: Đầu mối gửi bản nâng cấp (v2, v3...)
 *     → ChatLong auto-review
 *     → CEO/Người chỉ đạo nhận thông báo
 *   Step 6: CEO review
 *     → approve → chuyển step 7 (hoàn thành)
 *     → request_changes → quay lại step 5 + feedback
 *
 * Usage:
 *   node wf6-upgrade-loop.js                     # Check pending upgrades
 *   node wf6-upgrade-loop.js --dry-run           # Dry run
 *   node wf6-upgrade-loop.js submit <id> "note"  # Submit upgrade
 *   node wf6-upgrade-loop.js review <vid> approve|reject "feedback"
 */

require('dotenv').config();
const { aiCall, MODEL, PROVIDER } = require('./lib/ai-router');
const { updateDirective, saveDirectiveVersion, getDirectiveVersions,
        getLatestVersion, updateVersionStatus, updateDirectiveStep,
        logEvent, getStaffEmail, directiveUrl, db,
        BOD_HOSTING_EMAIL, ALWAYS_CC, CEO_EMAIL } = require('./lib/supabase-client');
const { sendEmail } = require('./lib/email-sender');
const { buildUpgradeSubmittedEmail, buildUpgradeFeedbackEmail,
        buildUpgradeApprovedEmail } = require('./lib/email-templates');

const DRY_RUN = process.argv.includes('--dry-run');

// ===== 1. SUBMIT UPGRADE =====

/**
 * Đầu mối gửi bản nâng cấp cho directive
 *
 * @param {string} directiveId - UUID
 * @param {Object} upgradeData - { t2_nhiem_vu, t3_chi_tieu, t4_thoi_han, t5_thanh_vien, upgrade_note }
 * @param {string} submittedBy - Tên người gửi
 * @returns {Object} { version, aiReview }
 */
async function submitUpgrade(directiveId, upgradeData, submittedBy) {
  console.log(`\n  📤 Submitting upgrade for ${directiveId}...`);

  // 1. Save new version
  const version = await saveDirectiveVersion(directiveId, {
    t2_nhiem_vu: upgradeData.t2_nhiem_vu,
    t3_chi_tieu: upgradeData.t3_chi_tieu,
    t4_thoi_han: upgradeData.t4_thoi_han,
    t5_thanh_vien: upgradeData.t5_thanh_vien,
    upgrade_note: upgradeData.upgrade_note || '',
    status: 'submitted',
    created_by: submittedBy,
  });

  console.log(`     Version: v${version.version_number}`);

  // 2. Run ChatLong auto-review on new version
  let aiReview = null;
  try {
    aiReview = await autoReviewUpgrade(directiveId, version);
    console.log(`     AI Review: Risk ${aiReview.riskScore}/100`);

    // Update version with AI review
    await updateVersionStatus(version.id, {
      ai_analysis: aiReview.analysis,
      ai_risk_score: aiReview.riskScore,
      ai_recommendations: aiReview.recommendations,
      status: 'reviewed',
    });
  } catch (err) {
    console.warn(`     ⚠️ AI review failed: ${err.message}`);
  }

  // 3. Transition to Step 5 (or stay at step 5 if already there)
  await updateDirectiveStep(
    directiveId,
    5,
    'Đầu mối nâng cấp',
    'upgrade_submitted',
    submittedBy,
    `v${version.version_number}: ${upgradeData.upgrade_note || 'Bản nâng cấp mới'}`
  );

  // 4. Log event
  await logEvent(directiveId, 'upgrade_submitted', {
    version: version.version_number,
    submittedBy,
    note: upgradeData.upgrade_note,
  });

  // 5. Get directive info for email
  const { data: directive } = await db
    .from('directives')
    .select('*, hm50:hm50_id ( hm_number, ten )')
    .eq('id', directiveId)
    .single();

  // 6. Send notification email to CEO/approver
  if (directive) {
    const sendTo = CEO_EMAIL || BOD_HOSTING_EMAIL;
    const ccSet = new Set(ALWAYS_CC);

    try {
      if (typeof buildUpgradeSubmittedEmail === 'function') {
        await sendEmail({
          to: sendTo,
          subject: `📤 [Nâng cấp v${version.version_number}] ${directive.directive_code || directive.t2_nhiem_vu}`,
          html: buildUpgradeSubmittedEmail({
            tieuDe: directive.directive_code,
            tenDauMoi: directive.t1_dau_moi,
            versionNumber: version.version_number,
            upgradeNote: upgradeData.upgrade_note,
            aiReview,
            url: directiveUrl(directiveId),
            id: directiveId,
          }),
          cc: Array.from(ccSet).filter(e => e !== sendTo).join(', '),
          dryRun: DRY_RUN,
        });
      }
    } catch (emailErr) {
      console.warn(`     ⚠️ Email failed: ${emailErr.message}`);
    }
  }

  return { version, aiReview };
}

// ===== 2. AI AUTO-REVIEW =====

async function autoReviewUpgrade(directiveId, version) {
  const previousVersions = await getDirectiveVersions(directiveId);
  const prevVersion = previousVersions.find(v => v.version_number === version.version_number - 1);

  const prompt = `REVIEW BẢN NÂNG CẤP v${version.version_number}:

BẢN MỚI (v${version.version_number}):
  T2 — Nhiệm vụ: ${version.t2_nhiem_vu || 'không đổi'}
  T3 — Chỉ tiêu: ${version.t3_chi_tieu || 'không đổi'}
  T4 — Thời hạn: ${version.t4_thoi_han || 'không đổi'}
  Ghi chú nâng cấp: ${version.upgrade_note || 'không có'}

${prevVersion ? `BẢN CŨ (v${prevVersion.version_number}):
  T2 — Nhiệm vụ: ${prevVersion.t2_nhiem_vu || 'N/A'}
  T3 — Chỉ tiêu: ${prevVersion.t3_chi_tieu || 'N/A'}
  T4 — Thời hạn: ${prevVersion.t4_thoi_han || 'N/A'}
${prevVersion.feedback_note ? `  Feedback trước: ${prevVersion.feedback_note}` : ''}` : '(Không có bản cũ)'}

Đánh giá bản nâng cấp:
1. Bản mới có khắc phục được feedback trước không?
2. Những điểm cải thiện so với bản cũ?
3. Còn rủi ro gì?
4. Nên approve hay request_changes?`;

  const response = await aiCall([
    { role: 'system', content: `Bạn là ChatLong — AI reviewer cho chỉ đạo CEO. Trả lời bằng JSON thuần:
{
  "comparison": "...",
  "improvements": ["..."],
  "remaining_risks": ["..."],
  "risk_score": 0-100,
  "recommendation": "approve|request_changes",
  "recommendation_reason": "...",
  "suggestions": ["..."]
}` },
    { role: 'user', content: prompt },
  ], { temperature: 0.2, max_tokens: 1500 });

  const rawContent = response.choices[0].message.content;
  let analysis;
  try {
    const jsonStr = rawContent.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
    analysis = JSON.parse(jsonStr);
  } catch {
    analysis = {
      comparison: rawContent.substring(0, 500),
      improvements: [],
      remaining_risks: [],
      risk_score: 50,
      recommendation: 'request_changes',
      recommendation_reason: 'Không thể parse AI response',
      suggestions: [],
    };
  }

  return {
    analysis,
    riskScore: Math.min(100, Math.max(0, analysis.risk_score || 50)),
    recommendations: analysis.suggestions || [],
    tokens: response.usage,
  };
}

// ===== 3. REVIEW UPGRADE (CEO/Người chỉ đạo) =====

/**
 * CEO review bản nâng cấp
 *
 * @param {string} versionId - UUID của directive_version
 * @param {string} action - 'approve' | 'request_changes'
 * @param {string} feedbackNote - Ghi chú feedback
 * @param {string} reviewedBy - Tên người review
 */
async function reviewUpgrade(versionId, action, feedbackNote, reviewedBy) {
  console.log(`\n  📋 Reviewing version ${versionId}: ${action}`);

  // 1. Get version info
  const { data: version, error: vErr } = await db
    .from('directive_versions')
    .select('*')
    .eq('id', versionId)
    .single();

  if (vErr || !version) throw new Error(`Version không tồn tại: ${versionId}`);

  const directiveId = version.directive_id;

  // 2. Get directive for context
  const { data: directive } = await db
    .from('directives')
    .select('*')
    .eq('id', directiveId)
    .single();

  if (action === 'approve') {
    // ===== APPROVE: Cập nhật directive chính, chuyển step 7 =====

    // Update version status
    await updateVersionStatus(versionId, {
      status: 'approved',
      feedback_from: reviewedBy,
      feedback_note: feedbackNote || 'Approved',
    });

    // Update main directive with latest version data
    const updateFields = {};
    if (version.t2_nhiem_vu) updateFields.t2_nhiem_vu = version.t2_nhiem_vu;
    if (version.t3_chi_tieu) updateFields.t3_chi_tieu = version.t3_chi_tieu;
    if (version.t4_thoi_han) updateFields.t4_thoi_han = version.t4_thoi_han;
    if (version.t5_thanh_vien) updateFields.t5_thanh_vien = version.t5_thanh_vien;

    if (Object.keys(updateFields).length > 0) {
      await updateDirective(directiveId, updateFields);
    }

    // Transition to Step 7 (Hoàn thành)
    await updateDirectiveStep(
      directiveId,
      7,
      'Hoàn thành đánh giá',
      'upgrade_approved',
      reviewedBy,
      `v${version.version_number} approved: ${feedbackNote || ''}`
    );

    await logEvent(directiveId, 'upgrade_approved', {
      version: version.version_number,
      reviewedBy,
      note: feedbackNote,
    });

    // Send approval email to đầu mối
    if (directive) {
      const emailDauMoi = directive.t1_email || await getStaffEmail(directive.t1_dau_moi);
      if (emailDauMoi && typeof buildUpgradeApprovedEmail === 'function') {
        try {
          await sendEmail({
            to: emailDauMoi,
            subject: `✅ [Duyệt v${version.version_number}] ${directive.directive_code || 'Chỉ đạo'}`,
            html: buildUpgradeApprovedEmail({
              tieuDe: directive.directive_code,
              tenDauMoi: directive.t1_dau_moi,
              versionNumber: version.version_number,
              feedbackNote,
              reviewedBy,
              url: directiveUrl(directiveId),
              id: directiveId,
              emailDauMoi,
            }),
            cc: ALWAYS_CC.filter(e => e !== emailDauMoi).join(', '),
            dryRun: DRY_RUN,
          });
        } catch (emailErr) {
          console.warn(`     ⚠️ Email failed: ${emailErr.message}`);
        }
      }
    }

    console.log(`     ✅ Approved v${version.version_number} → Step 7`);

  } else {
    // ===== REQUEST CHANGES: Ghi feedback, giữ step 5 =====

    await updateVersionStatus(versionId, {
      status: 'rejected',
      feedback_from: reviewedBy,
      feedback_note: feedbackNote || 'Cần chỉnh sửa',
    });

    // Keep at Step 5 (or set back to 5)
    await updateDirectiveStep(
      directiveId,
      5,
      'Cần nâng cấp thêm',
      'upgrade_request_changes',
      reviewedBy,
      `v${version.version_number} rejected: ${feedbackNote || 'Cần chỉnh sửa'}`
    );

    await logEvent(directiveId, 'upgrade_feedback', {
      version: version.version_number,
      reviewedBy,
      action: 'request_changes',
      note: feedbackNote,
    });

    // Send feedback email to đầu mối
    if (directive) {
      const emailDauMoi = directive.t1_email || await getStaffEmail(directive.t1_dau_moi);
      if (emailDauMoi && typeof buildUpgradeFeedbackEmail === 'function') {
        try {
          await sendEmail({
            to: emailDauMoi,
            subject: `🔄 [Cần nâng cấp v${version.version_number + 1}] ${directive.directive_code || 'Chỉ đạo'}`,
            html: buildUpgradeFeedbackEmail({
              tieuDe: directive.directive_code,
              tenDauMoi: directive.t1_dau_moi,
              versionNumber: version.version_number,
              feedbackNote,
              reviewedBy,
              url: directiveUrl(directiveId),
              id: directiveId,
              emailDauMoi,
            }),
            cc: ALWAYS_CC.filter(e => e !== emailDauMoi).join(', '),
            dryRun: DRY_RUN,
          });
        } catch (emailErr) {
          console.warn(`     ⚠️ Email failed: ${emailErr.message}`);
        }
      }
    }

    console.log(`     🔄 Requested changes for v${version.version_number} → stay Step 5`);
  }

  return { action, version: version.version_number, directiveId };
}

// ===== 4. GET UPGRADE HISTORY =====

/**
 * Lấy lịch sử nâng cấp cho 1 directive
 */
async function getUpgradeHistory(directiveId) {
  const versions = await getDirectiveVersions(directiveId);
  return versions.map(v => ({
    version: `v${v.version_number}`,
    status: v.status,
    createdBy: v.created_by,
    createdAt: v.created_at,
    riskScore: v.ai_risk_score,
    upgradeNote: v.upgrade_note,
    feedbackFrom: v.feedback_from,
    feedbackNote: v.feedback_note,
    hasAiAnalysis: !!v.ai_analysis,
  }));
}

// ===== 5. POLL PENDING REVIEWS =====

/**
 * Check for pending upgrade submissions that need CEO review
 * (Dùng trong scheduler)
 */
async function checkPendingReviews() {
  const { data, error } = await db
    .from('directive_versions')
    .select(`
      *,
      directives:directive_id ( directive_code, t1_dau_moi, t1_email, t2_nhiem_vu )
    `)
    .in('status', ['submitted', 'reviewed'])
    .order('created_at', { ascending: false });

  if (error) throw new Error(`checkPendingReviews: ${error.message}`);
  return data || [];
}

// ===== MAIN (CLI) =====

async function run() {
  const startTime = Date.now();
  const args = process.argv.slice(2).filter(a => a !== '--dry-run');
  const cmd = args[0] || 'check';

  console.log('==========================================');
  console.log(`[WF6-UPGRADE] ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[WF6-UPGRADE] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log(`[WF6-UPGRADE] Command: ${cmd}`);
  console.log('[WF6-UPGRADE] Steps 5-6 — Iterative Upgrade Loop');
  console.log('==========================================');

  if (cmd === 'submit') {
    // Submit upgrade: node wf6-upgrade-loop.js submit <directiveId> "note"
    const directiveId = args[1];
    const note = args[2] || '';
    if (!directiveId) {
      console.error('❌ Usage: node wf6-upgrade-loop.js submit <directive_id> "upgrade note"');
      return;
    }

    // Get current directive data for upgrade
    const { data: directive } = await db
      .from('directives')
      .select('*')
      .eq('id', directiveId)
      .single();

    if (!directive) {
      console.error(`❌ Directive not found: ${directiveId}`);
      return;
    }

    const result = await submitUpgrade(directiveId, {
      t2_nhiem_vu: directive.t2_nhiem_vu,
      t3_chi_tieu: directive.t3_chi_tieu,
      t4_thoi_han: directive.t4_thoi_han,
      t5_thanh_vien: directive.t5_thanh_vien,
      upgrade_note: note,
    }, 'CLI');

    console.log('\n  Result:', JSON.stringify(result.version, null, 2));

  } else if (cmd === 'review') {
    // Review: node wf6-upgrade-loop.js review <versionId> approve|reject "feedback"
    const versionId = args[1];
    const action = args[2] === 'approve' ? 'approve' : 'request_changes';
    const feedback = args[3] || '';
    if (!versionId) {
      console.error('❌ Usage: node wf6-upgrade-loop.js review <version_id> approve|reject "feedback"');
      return;
    }
    const result = await reviewUpgrade(versionId, action, feedback, 'CEO');
    console.log('\n  Result:', JSON.stringify(result, null, 2));

  } else if (cmd === 'history') {
    // History: node wf6-upgrade-loop.js history <directiveId>
    const directiveId = args[1];
    if (!directiveId) {
      console.error('❌ Usage: node wf6-upgrade-loop.js history <directive_id>');
      return;
    }
    const history = await getUpgradeHistory(directiveId);
    console.log('\n  Upgrade History:');
    for (const h of history) {
      console.log(`    ${h.version} [${h.status}] by ${h.createdBy} — Risk: ${h.riskScore || '?'}/100`);
      if (h.feedbackNote) console.log(`      Feedback: ${h.feedbackNote}`);
    }

  } else {
    // Default: check pending reviews
    console.log('\n[1/1] Checking pending upgrade reviews...');
    const pending = await checkPendingReviews();
    console.log(`  Found: ${pending.length} pending reviews`);

    for (const p of pending) {
      const dir = p.directives;
      console.log(`\n  📋 v${p.version_number} [${p.status}] — ${dir?.directive_code || 'N/A'}`);
      console.log(`     Đầu mối: ${dir?.t1_dau_moi || 'N/A'}`);
      console.log(`     Risk: ${p.ai_risk_score || '?'}/100`);
      console.log(`     Note: ${p.upgrade_note || 'N/A'}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n⏱️ Time: ${elapsed}s`);

  return { command: cmd };
}

if (require.main === module) {
  run().catch(err => {
    console.error('❌ FATAL:', err);
    process.exit(1);
  });
}

module.exports = { submitUpgrade, reviewUpgrade, getUpgradeHistory, checkPendingReviews, run };
