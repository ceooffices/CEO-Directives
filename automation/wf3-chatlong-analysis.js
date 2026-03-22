/**
 * wf3-chatlong-analysis.js
 * CEO Directive — Step 3: ChatLong AI Analysis Engine
 *
 * Trái tim của LeLongSon Master 2.0
 * Flow:
 *   Directive ở step 2 (đã duyệt) → ChatLong phân tích → Lưu kết quả
 *   → Chuyển step 3 → Gửi email kết quả
 *
 * Chức năng ChatLong:
 *   1. Đánh giá logic mọi giả định
 *   2. Bổ sung góc nhìn 360 độ
 *   3. Cảnh báo rủi ro (risk score 0-100)
 *   4. Gợi ý cải tiến nhiều phương án
 *   5. Đề xuất thêm lựa chọn
 *
 * Usage:
 *   node wf3-chatlong-analysis.js              # Chạy thật
 *   node wf3-chatlong-analysis.js --dry-run    # Chỉ log
 */

require('dotenv').config();
const { aiCall, MODEL, PROVIDER } = require('./lib/ai-router');
const { queryDirectivesForAnalysis, saveDirectiveVersion, updateDirectiveStep,
        logEvent, getStaffEmail, directiveUrl,
        BOD_HOSTING_EMAIL, ALWAYS_CC, CEO_EMAIL } = require('./lib/supabase-client');
const { sendEmail } = require('./lib/email-sender');
const { buildChatLongAnalysisEmail } = require('./lib/email-templates');

const DRY_RUN = process.argv.includes('--dry-run');

// ===== CHATLONG SYSTEM PROMPT =====

const CHATLONG_SYSTEM = `Bạn là ChatLong — Trợ lý AI phân tích chiến lược cho CEO EsuhaiGroup (Giáo dục & Nhân lực Việt-Nhật).

VAI TRÒ: Bạn là "bộ lọc thông minh" giữa CEO và đầu mối. Trước khi chỉ đạo được giao cho đầu mối thực hiện, bạn phân tích và bổ sung góc nhìn đa chiều.

NGUYÊN TẮC:
- Luôn dựa trên dữ liệu thực, không nói chung chung
- Thẳng thắn chỉ ra điểm yếu, không né tránh
- Đề xuất hành động cụ thể, measurable
- Cân nhắc bối cảnh EsuhaiGroup: giáo dục + nhân lực + Việt-Nhật

BẮT BUỘC trả lời bằng JSON thuần (không markdown, không code block), theo cấu trúc:
{
  "assumptions_review": [
    { "assumption": "...", "evaluation": "valid|questionable|invalid", "reasoning": "..." }
  ],
  "perspectives_360": [
    { "perspective": "...", "insight": "..." }
  ],
  "risk_warnings": [
    { "risk": "...", "severity": "high|medium|low", "mitigation": "..." }
  ],
  "risk_score": 0-100,
  "improvement_suggestions": [
    { "suggestion": "...", "expected_impact": "...", "effort": "high|medium|low" }
  ],
  "alternative_options": [
    { "option": "...", "pros": "...", "cons": "..." }
  ],
  "executive_summary": "Tóm tắt 2-3 dòng cho CEO"
}`;

// ===== ANALYZE SINGLE DIRECTIVE =====

/**
 * Phân tích 1 chỉ đạo bằng AI
 * @param {Object} directive - Row từ Supabase directives table
 * @returns {Object} { analysis, riskScore, recommendations, tokens }
 */
async function analyzeSingleDirective(directive) {
  const hm50Info = directive.hm50
    ? `Thuộc HM${directive.hm50.hm_number}: ${directive.hm50.ten}`
    : 'Không thuộc 50 Hạng Mục';

  const prompt = `PHÂN TÍCH CHỈ ĐẠO CEO:

MÃ: ${directive.directive_code || 'N/A'}
NGUỒN: ${directive.meeting_source || 'BOD Meeting'}
LOẠI: ${directive.loai || 'moi'}
${hm50Info}

NỘI DUNG CHỈ ĐẠO:
  T1 — Đầu mối: ${directive.t1_dau_moi || 'Chưa xác định'}
  T2 — Nhiệm vụ: ${directive.t2_nhiem_vu || 'N/A'}
  T3 — Chỉ tiêu: ${directive.t3_chi_tieu || 'Chưa xác định'}
  T4 — Thời hạn: ${directive.t4_thoi_han || 'Chưa xác định'}
  T5 — Thành viên: ${Array.isArray(directive.t5_thanh_vien) ? directive.t5_thanh_vien.join(', ') : 'Chưa xác định'}

NGƯỜI DUYỆT: ${directive.approved_by || 'N/A'}

Phân tích chỉ đạo trên. Chú ý:
- T3 (Chỉ tiêu) có đủ cụ thể, đo lường được không?
- T4 (Thời hạn) có hợp lý với quy mô nhiệm vụ không?
- Đầu mối có đủ năng lực/quyền hạn cho nhiệm vụ này không?
- Có rủi ro nào CEO cần biết trước?
- Có phương án nào tốt hơn không?`;

  const response = await aiCall([
    { role: 'system', content: CHATLONG_SYSTEM },
    { role: 'user', content: prompt },
  ], { temperature: 0.3, max_tokens: 2000 });

  const rawContent = response.choices[0].message.content;

  // Parse JSON response
  let analysis;
  try {
    // Handle potential markdown code blocks in response
    const jsonStr = rawContent.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
    analysis = JSON.parse(jsonStr);
  } catch (parseErr) {
    console.warn(`  ⚠️ AI trả về không phải JSON, lưu dạng text`);
    analysis = {
      executive_summary: rawContent.substring(0, 500),
      assumptions_review: [],
      perspectives_360: [],
      risk_warnings: [],
      risk_score: 50,
      improvement_suggestions: [],
      alternative_options: [],
      _raw: rawContent,
    };
  }

  const riskScore = typeof analysis.risk_score === 'number'
    ? Math.min(100, Math.max(0, analysis.risk_score))
    : 50;

  const recommendations = (analysis.improvement_suggestions || [])
    .map(s => s.suggestion || s)
    .filter(Boolean);

  return {
    analysis,
    riskScore,
    recommendations,
    tokens: response.usage,
  };
}

// ===== MAIN =====

async function run() {
  const startTime = Date.now();
  console.log('==========================================');
  console.log(`[WF3-CHATLONG] ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`[WF3-CHATLONG] Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log(`[WF3-CHATLONG] AI: ${PROVIDER || 'N/A'} (${MODEL || 'N/A'})`);
  console.log('[WF3-CHATLONG] Step 3 — ChatLong AI Analysis');
  console.log('==========================================');

  // 1. Query directives ready for analysis
  console.log('\n[1/3] Querying directives at Step 2 (approved, awaiting analysis)...');
  const directives = await queryDirectivesForAnalysis();
  console.log(`  Found: ${directives.length} directives ready for ChatLong analysis`);

  if (directives.length === 0) {
    console.log('  → Không có chỉ đạo nào cần phân tích.');
    return { analyzed: 0, failed: 0 };
  }

  // 2. Analyze each directive
  console.log('\n[2/3] Running ChatLong analysis...');
  let analyzedCount = 0, failCount = 0;

  for (const directive of directives) {
    const title = directive.directive_code || directive.t2_nhiem_vu;
    console.log(`\n  🧠 Analyzing: ${title}`);

    try {
      // Run AI analysis
      const result = await analyzeSingleDirective(directive);
      console.log(`     Risk Score: ${result.riskScore}/100`);
      console.log(`     Recommendations: ${result.recommendations.length}`);
      console.log(`     Tokens: ${result.tokens?.total_tokens || '?'}`);

      if (!DRY_RUN) {
        // Save version with AI analysis
        await saveDirectiveVersion(directive.id, {
          t2_nhiem_vu: directive.t2_nhiem_vu,
          t3_chi_tieu: directive.t3_chi_tieu,
          t4_thoi_han: directive.t4_thoi_han,
          t5_thanh_vien: directive.t5_thanh_vien,
          ai_analysis: result.analysis,
          ai_risk_score: result.riskScore,
          ai_recommendations: result.recommendations,
          status: 'analyzed',
          created_by: 'ChatLong AI',
        });

        // Transition to Step 3
        await updateDirectiveStep(
          directive.id,
          3,
          'ChatLong phân tích',
          'chatlong_analysis',
          'ChatLong AI',
          `Risk Score: ${result.riskScore}/100 | ${result.recommendations.length} gợi ý cải tiến`
        );

        // Log event
        await logEvent(directive.id, 'chatlong_analysis', {
          title,
          riskScore: result.riskScore,
          recommendationCount: result.recommendations.length,
          tokens: result.tokens?.total_tokens,
        });
      } else {
        console.log(`     [DRY-RUN] Would save analysis & transition to Step 3`);
      }

      // 3. Send email with analysis results
      const emailDauMoi = directive.t1_email || await getStaffEmail(directive.t1_dau_moi);
      const sendTo = emailDauMoi || BOD_HOSTING_EMAIL;

      if (sendTo) {
        const ccSet = new Set(ALWAYS_CC);
        if (CEO_EMAIL) ccSet.add(CEO_EMAIL);
        if (emailDauMoi && emailDauMoi !== sendTo) ccSet.add(emailDauMoi);
        ccSet.delete(sendTo);

        try {
          if (typeof buildChatLongAnalysisEmail === 'function') {
            await sendEmail({
              to: sendTo,
              subject: `🧠 [ChatLong] Phân tích "${title}" — Risk ${result.riskScore}/100`,
              html: buildChatLongAnalysisEmail({
                tieuDe: title,
                tenDauMoi: directive.t1_dau_moi,
                analysis: result.analysis,
                riskScore: result.riskScore,
                recommendations: result.recommendations,
                url: directiveUrl(directive.id),
                id: directive.id,
                emailDauMoi: sendTo,
              }),
              cc: Array.from(ccSet).join(', '),
              dryRun: DRY_RUN,
            });
          } else {
            console.log(`     📧 Email template chưa sẵn sàng, skip`);
          }
        } catch (emailErr) {
          console.warn(`     ⚠️ Email failed: ${emailErr.message}`);
        }
      }

      analyzedCount++;
    } catch (err) {
      failCount++;
      console.error(`     ❌ FAILED: ${err.message}`);
      await logEvent(directive.id, 'chatlong_error', {
        title,
        error: err.message,
      }, DRY_RUN);
    }
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n==========================================');
  console.log('[WF3-CHATLONG] SUMMARY:');
  console.log(`  🧠 Analyzed: ${analyzedCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  ⏱️ Time: ${elapsed}s`);
  console.log('==========================================');

  return { analyzed: analyzedCount, failed: failCount };
}

// ===== CLI =====
if (require.main === module) {
  run().catch(err => {
    console.error('❌ FATAL:', err);
    process.exit(1);
  });
}

module.exports = { run, analyzeSingleDirective };
