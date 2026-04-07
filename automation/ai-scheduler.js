/**
 * ai-scheduler.js
 * CEO Directive Automation — AI-Powered Intelligent Scheduler
 * 
 * Thay thế scheduler.js (15 cron fix cứng) bằng AI decision-making.
 * Claude API đánh giá dữ liệu thực tế → quyết định chạy WF nào.
 * 
 * Usage:
 *   node ai-scheduler.js                  # Chạy daemon (checkpoint loop)
 *   node ai-scheduler.js --check-now      # Chạy 1 checkpoint rồi exit
 *   node ai-scheduler.js --dry-run        # Check nhưng không chạy WF
 *   node ai-scheduler.js --interval 15    # Đổi interval (phút)
 */

require('dotenv').config();
const { aiCall, PROVIDER, MODEL } = require('./lib/ai-router');
const {
  loadState, saveState, buildSnapshot,
  diffSnapshots, recordWfRun, getLastRunSummary,
} = require('./lib/scheduler-state');
const { db, logEvent } = require('./lib/supabase-client');

// ===== CONFIG =====
const DRY_RUN = process.argv.includes('--dry-run');
const CHECK_NOW = process.argv.includes('--check-now');
const intervalArg = process.argv.indexOf('--interval');
const DEFAULT_INTERVAL = intervalArg > -1
  ? parseInt(process.argv[intervalArg + 1]) || 30
  : 30;

// Giờ hoạt động (không check ngoài giờ làm việc)
const WORK_HOURS = { start: 7, end: 19 };
const WORK_DAYS = [1, 2, 3, 4, 5]; // Thứ 2-6

// ===== WORKFLOW LOADERS =====
const workflows = {
  wf1: { loader: () => require('./wf1-approval').run, desc: 'Gửi email duyệt chỉ đạo mới' },
  // WF2: DEPRECATED (xác nhận đã nhúng trong form WF1 Step2)
  wf3: { loader: () => require('./wf3-directive-status').run, desc: 'Detect thay đổi trạng thái' },
  wf3c: { loader: () => require('./wf3-chatlong-analysis').run, desc: 'AI phân tích sâu (ChatLong)' },
  wf4: { loader: () => require('./wf4-directive-escalation').run, desc: 'Đồng hành Engine: nhắc nhở + leo thang (hợp nhất WF4+WF8)' },
  wf6: { loader: () => require('./wf6-upgrade-loop').run, desc: 'Upgrade loop nâng cấp chỉ đạo' },
  wf7: { loader: () => require('./wf7-preflight-check').run, desc: 'Pre-flight check trước họp BQT' },
};

// ===== AI DECISION PROMPT =====

function buildAIPrompt(snapshot, prevState, diff, now) {
  const hour = now.getHours();
  const dayOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][now.getDay()];
  const lastRunSummary = getLastRunSummary(prevState);

  return {
    system: `Bạn là AI Scheduler cho hệ thống giám sát chỉ đạo CEO EsuhaiGroup.
Nhiệm vụ: Quyết định workflow nào cần chạy DỰA TRÊN DỮ LIỆU THỰC TẾ, không chạy thừa.

QUY TẮC:
- Chỉ chạy WF khi CÓ LÝ DO cụ thể (dữ liệu thay đổi, deadline gần, v.v.)
- WF4 (đồng hành): chỉ chạy 1 lần/ngày buổi sáng (8-9h), nếu hôm nay chưa chạy
- WF3C (AI analysis): chỉ chạy khi có thay đổi đáng kể hoặc overdue tăng
- Nếu không có thay đổi gì → trả về should_run = []
- next_check_minutes: đề xuất 15-60 phút (ngắn hơn nếu nhiều thay đổi)

Trả lời CHÍNH XÁC JSON format, không giải thích thêm.`,

    user: `THỜI ĐIỂM: ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (${dayOfWeek})
GIỜ: ${hour}h

SNAPSHOT HIỆN TẠI:
- Chờ duyệt: ${snapshot.counts.pending}${prevState.counts ? ` (trước: ${prevState.counts.pending || 0})` : ''}
- Confirmed 5T: ${snapshot.counts.confirmed}${prevState.counts ? ` (trước: ${prevState.counts.confirmed || 0})` : ''}
- Quá hạn: ${snapshot.counts.overdue}${prevState.counts ? ` (trước: ${prevState.counts.overdue || 0})` : ''}
- Active: ${snapshot.counts.active}${prevState.counts ? ` (trước: ${prevState.counts.active || 0})` : ''}

THAY ĐỔI TỪ LẦN CHECK TRƯỚC${diff.timeDiffMinutes ? ` (${diff.timeDiffMinutes} phút trước)` : ''}:
${diff.summary}

TOP QUÁ HẠN:
${(snapshot.overdueDetails || []).slice(0, 5).map(d => `  - "${d.title}" (${d.dauMoi}) — ${d.daysOverdue} ngày`).join('\n') || '  (không có)'}

CHỈ ĐẠO MỚI CHỜ DUYỆT:
${(snapshot.pendingDetails || []).slice(0, 3).map(d => `  - "${d.title}" (${d.dauMoi}) — tạo ${d.createdAt}`).join('\n') || '  (không có)'}

WF ĐÃ CHẠY GẦN NHẤT: ${lastRunSummary}

WORKFLOWS KHẢ DỤNG:
${Object.entries(workflows).map(([k, v]) => `- ${k}: ${v.desc}`).join('\n')}

Trả lời JSON:
{
  "should_run": [],
  "reasoning": "...",
  "priority": "low",
  "next_check_minutes": 30
}`,
  };
}

// ===== CORE: AI CHECKPOINT =====

async function runCheckpoint() {
  const now = new Date();
  const ts = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  console.log(`\n${'═'.repeat(55)}`);
  console.log(`🧠 AI SCHEDULER — Checkpoint ${ts}`);
  console.log(`${'═'.repeat(55)}`);

  // 1. Kiểm tra giờ làm việc
  const hour = now.getHours();
  const dayOfWeek = now.getDay();

  if (!WORK_DAYS.includes(dayOfWeek) || hour < WORK_HOURS.start || hour >= WORK_HOURS.end) {
    console.log(`⏸ Ngoài giờ làm việc (${WORK_HOURS.start}h-${WORK_HOURS.end}h, T2-T6). Skip.`);
    return { skipped: true, reason: 'outside_work_hours', nextCheckMinutes: 30 };
  }

  // 2. Load state trước + snapshot hiện tại
  const prevState = loadState();
  console.log('📊 Đang query Supabase...');
  const snapshot = await buildSnapshot();

  // 3. Diff
  const diff = diffSnapshots(prevState, snapshot);

  if (diff.hasChanges) {
    console.log('📋 Thay đổi detected:');
    diff.changes.forEach(c => console.log(`   ${c}`));
  } else {
    console.log('📋 Không có thay đổi dữ liệu.');
  }

  // 4. Hỏi Claude
  console.log(`🤖 Đang hỏi ${PROVIDER} (${MODEL})...`);
  const prompt = buildAIPrompt(snapshot, prevState, diff, now);

  let decision;
  let tokensUsed = 0;

  try {
    const response = await aiCall([
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ], { temperature: 0.1, max_tokens: 300 });

    tokensUsed = response.usage?.total_tokens || 0;
    const raw = response.choices[0].message.content;

    // Parse JSON từ response (Claude có thể wrap trong ```json)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI response không chứa JSON hợp lệ');
    decision = JSON.parse(jsonMatch[0]);

    console.log(`\n🎯 AI QUYẾT ĐỊNH:`);
    console.log(`   Chạy: ${decision.should_run.length > 0 ? decision.should_run.join(', ') : '(không có)'}`);
    console.log(`   Lý do: ${decision.reasoning}`);
    console.log(`   Priority: ${decision.priority}`);
    console.log(`   Check lại sau: ${decision.next_check_minutes} phút`);
    console.log(`   Tokens: ${tokensUsed}`);

  } catch (err) {
    console.error(`❌ AI error: ${err.message}`);
    // Fallback: nếu AI lỗi, chạy logic đơn giản
    decision = fallbackDecision(snapshot, prevState, diff, now);
    console.log(`⚡ Sử dụng fallback logic: ${decision.should_run.join(', ') || '(không có)'}`);
  }

  // 5. Thực thi workflows
  const executionResults = {};

  if (decision.should_run && decision.should_run.length > 0) {
    for (const wfName of decision.should_run) {
      if (!workflows[wfName]) {
        console.log(`   ⚠ WF "${wfName}" không tồn tại, skip.`);
        executionResults[wfName] = { error: 'unknown workflow' };
        continue;
      }

      if (DRY_RUN) {
        console.log(`   🏜️ DRY-RUN: ${wfName} (${workflows[wfName].desc})`);
        executionResults[wfName] = { dryRun: true };
      } else {
        try {
          console.log(`   🚀 Chạy ${wfName}...`);
          const result = await workflows[wfName].loader()();
          console.log(`   ✅ ${wfName} hoàn tất:`, JSON.stringify(result).slice(0, 100));
          executionResults[wfName] = result;
          recordWfRun(snapshot, wfName);
        } catch (err) {
          console.error(`   ❌ ${wfName} lỗi: ${err.message}`);
          executionResults[wfName] = { error: err.message };
        }
      }
    }
  }

  // 6. Lưu state + log
  const newState = {
    ...snapshot,
    lastWfRuns: {
      ...(prevState.lastWfRuns || {}),
      ...(snapshot.lastWfRuns || {}),
    },
    nextCheckMinutes: decision.next_check_minutes || DEFAULT_INTERVAL,
  };
  // Xóa chi tiết không cần lưu lâu
  delete newState.overdueDetails;
  delete newState.pendingDetails;
  saveState(newState);

  // Log vào Supabase
  await logSchedulerDecision({
    snapshot: { counts: snapshot.counts },
    diff: { hasChanges: diff.hasChanges, summary: diff.summary },
    decision,
    tokensUsed,
    executionResults,
    dryRun: DRY_RUN,
  });

  console.log(`\n✅ Checkpoint hoàn tất. Check lại sau ${decision.next_check_minutes || DEFAULT_INTERVAL} phút.`);

  return {
    decision,
    executionResults,
    tokensUsed,
    nextCheckMinutes: decision.next_check_minutes || DEFAULT_INTERVAL,
  };
}

// ===== FALLBACK LOGIC (khi AI lỗi) =====

function fallbackDecision(snapshot, prevState, diff, now) {
  const shouldRun = [];
  const reasons = [];
  const hour = now.getHours();

  // WF1: Có pending mới
  if (diff.newPendingCount > 0) {
    shouldRun.push('wf1');
    reasons.push(`${diff.newPendingCount} chỉ đạo mới chờ duyệt`);
  }

  // WF2: DEPRECATED (xác nhận đã nhúng trong form WF1 Step2)

  // WF4: Overdue tăng
  if (diff.newOverdueCount > 0) {
    shouldRun.push('wf4');
    reasons.push(`${diff.newOverdueCount} chỉ đạo mới quá hạn`);
  }

  // WF4: 1x/sáng (thay thế WF5)
  const lastWf4 = prevState.lastWfRuns?.wf4;
  const wf4Today = lastWf4 && new Date(lastWf4).toDateString() === now.toDateString();
  if (hour >= 8 && hour < 10 && !wf4Today) {
    shouldRun.push('wf4');
    reasons.push('Đồng hành morning check (chưa chạy hôm nay)');
  }

  return {
    should_run: shouldRun,
    reasoning: reasons.length > 0 ? `Fallback: ${reasons.join('; ')}` : 'Fallback: không có thay đổi',
    priority: shouldRun.length > 2 ? 'high' : shouldRun.length > 0 ? 'medium' : 'low',
    next_check_minutes: shouldRun.length > 0 ? 15 : 30,
  };
}

// ===== LOG TO SUPABASE =====

async function logSchedulerDecision(data) {
  try {
    const { error } = await db
      .from('ai_scheduler_log')
      .insert({
        checked_at: new Date().toISOString(),
        snapshot: data.snapshot,
        changes_detected: data.diff?.summary || 'N/A',
        ai_decision: data.decision,
        workflows_executed: data.decision?.should_run || [],
        tokens_used: data.tokensUsed || 0,
        execution_result: data.executionResults || {},
        dry_run: data.dryRun || false,
      });

    if (error) {
      // Table chưa tạo → chỉ log console, không crash
      if (error.message.includes('relation') || error.code === '42P01') {
        console.log('   ℹ Table ai_scheduler_log chưa tạo. Log console only.');
      } else {
        console.warn(`   ⚠ Log lỗi: ${error.message}`);
      }
    }
  } catch (err) {
    console.warn(`   ⚠ Log exception: ${err.message}`);
  }
}

// ===== DAEMON LOOP =====

async function startDaemon() {
  console.log('══════════════════════════════════════════════');
  console.log('🧠 CEO Directive AI Scheduler v1.0');
  console.log(`   Provider: ${PROVIDER} (${MODEL})`);
  console.log(`   Mode: ${DRY_RUN ? '🏜️ DRY-RUN' : '⚡ LIVE'}`);
  console.log(`   Default interval: ${DEFAULT_INTERVAL} phút`);
  console.log(`   Work hours: ${WORK_HOURS.start}h-${WORK_HOURS.end}h, T2-T6`);
  console.log(`   Started: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log('══════════════════════════════════════════════');
  console.log('');
  console.log('⏳ Đang chờ checkpoint... (Ctrl+C to stop)');

  let nextInterval = DEFAULT_INTERVAL;

  async function tick() {
    try {
      const result = await runCheckpoint();
      nextInterval = result.nextCheckMinutes || DEFAULT_INTERVAL;
    } catch (err) {
      console.error(`\n💥 Checkpoint crashed: ${err.message}`);
      nextInterval = DEFAULT_INTERVAL; // Retry với interval mặc định
    }

    // Schedule next
    const nextMs = nextInterval * 60 * 1000;
    console.log(`\n⏰ Next checkpoint: ${nextInterval} phút (${new Date(Date.now() + nextMs).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })})`);
    setTimeout(tick, nextMs);
  }

  // Chạy checkpoint đầu tiên ngay
  await tick();
}

// ===== ENTRY POINT =====

if (CHECK_NOW) {
  // Chạy 1 lần rồi exit
  runCheckpoint()
    .then(result => {
      console.log('\n📋 Kết quả:', JSON.stringify(result.decision, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Error:', err.message);
      process.exit(1);
    });
} else {
  // Daemon mode
  startDaemon().catch(err => {
    console.error('💥 Startup error:', err.message);
    process.exit(1);
  });
}

// Export cho bridge/telegram-bot sử dụng
module.exports = { runCheckpoint, loadState: () => loadState() };
