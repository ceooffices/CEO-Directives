/**
 * auto-escalation — Supabase Edge Function
 *
 * Chạy hàng ngày 1h UTC (= 8h sáng VN) via Supabase Cron.
 * Logic: kiểm tra t4_thoi_han, tự động phát hiện tín hiệu & hỗ trợ đầu mối.
 *
 * Cron setup trong Supabase Dashboard:
 *   Schedule: 0 1 * * *
 *   HTTP: POST /functions/v1/auto-escalation
 *   Header: Authorization: Bearer <SUPABASE_ANON_KEY>
 *
 * Manual test:
 *   curl -X POST https://fgiszdvchpknmyfscxnp.supabase.co/functions/v1/auto-escalation \
 *     -H "Authorization: Bearer <ANON_KEY>"
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// Ngưỡng tín hiệu (ngày — số ngày chưa có cập nhật sau thời hạn dự kiến)
const THRESHOLD_REMIND = 1;
const THRESHOLD_ESCALATE = 3;
const THRESHOLD_CRITICAL = 7;
const THRESHOLD_LOST = 14;

Deno.serve(async (_req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const db = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const summary = {
    timestamp: now.toISOString(),
    checked: 0,
    skipped_no_deadline: 0,
    auto_remind: 0,
    auto_escalate: 0,
    lost_control: 0,
    email_sent: 0,
    email_skipped_no_address: 0,
    skipped_dedup: 0,
    errors: [] as string[],
  };

  // 1. Query chỉ đạo chưa hoàn thành
  const { data: directives, error } = await db
    .from("directives")
    .select(
      "id, directive_code, t1_dau_moi, t1_email, t2_nhiem_vu, t4_thoi_han, tinh_trang, confirmed_at, bod_hosting_email"
    )
    .not("tinh_trang", "in", "(hoan_thanh,tu_choi)");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!directives || directives.length === 0) {
    return jsonResponse({ ...summary, message: "Không có chỉ đạo nào cần kiểm tra" });
  }

  // Phân loại: có deadline vs không có
  const withDeadline = directives.filter((d) => d.t4_thoi_han);
  summary.skipped_no_deadline = directives.length - withDeadline.length;
  summary.checked = withDeadline.length;

  if (withDeadline.length === 0) {
    return jsonResponse({ ...summary, message: "Không có chỉ đạo nào có deadline" });
  }

  // 2. Lấy events gần nhất (24h) để dedup
  const directiveIds = withDeadline.map((d) => d.id);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recentEvents } = await db
    .from("engagement_events")
    .select("directive_id, event_type")
    .in("directive_id", directiveIds)
    .in("event_type", ["auto_remind", "auto_escalate"])
    .gte("created_at", twentyFourHoursAgo);

  // Map: directive_id → Set of event_types trong 24h
  const recentMap = new Map<string, Set<string>>();
  for (const ev of recentEvents || []) {
    if (!recentMap.has(ev.directive_id)) recentMap.set(ev.directive_id, new Set());
    recentMap.get(ev.directive_id)!.add(ev.event_type);
  }

  // 3. Xử lý từng directive
  for (const d of withDeadline) {
    const deadline = new Date(d.t4_thoi_han);
    deadline.setHours(0, 0, 0, 0);
    const daysOverdue = Math.floor(
      (today.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Chưa quá hạn → skip
    if (daysOverdue < THRESHOLD_REMIND) continue;

    const recentEvTypes = recentMap.get(d.id) || new Set();

    try {
      // ≥14 ngày → Cần hỗ trợ đặc biệt
      if (daysOverdue >= THRESHOLD_LOST) {
        if (recentEvTypes.has("auto_escalate")) {
          summary.skipped_dedup++;
          continue;
        }
        await insertEvent(db, d.id, "auto_escalate", d.bod_hosting_email, {
          severity: "lost_control",
          days_overdue: daysOverdue,
          deadline: d.t4_thoi_han,
          dau_moi: d.t1_dau_moi,
        });
        summary.lost_control++;
        await updateTinhTrang(db, d);
      }
      // ≥7 ngày → Tín hiệu rủi ro nghiêm trọng
      else if (daysOverdue >= THRESHOLD_CRITICAL) {
        if (recentEvTypes.has("auto_escalate")) {
          summary.skipped_dedup++;
          continue;
        }
        await insertEvent(db, d.id, "auto_escalate", d.bod_hosting_email, {
          severity: "critical",
          days_overdue: daysOverdue,
          deadline: d.t4_thoi_han,
          dau_moi: d.t1_dau_moi,
        });
        summary.auto_escalate++;
        await updateTinhTrang(db, d);

        // Gửi email cho BOD Hosting
        if (d.bod_hosting_email) {
          summary.email_sent++;
        } else {
          summary.email_skipped_no_address++;
        }
      }
      // ≥3 ngày → Tín hiệu rủi ro
      else if (daysOverdue >= THRESHOLD_ESCALATE) {
        if (recentEvTypes.has("auto_escalate")) {
          summary.skipped_dedup++;
          continue;
        }
        await insertEvent(db, d.id, "auto_escalate", d.t1_email, {
          severity: "warning",
          days_overdue: daysOverdue,
          deadline: d.t4_thoi_han,
          dau_moi: d.t1_dau_moi,
        });
        summary.auto_escalate++;
        await updateTinhTrang(db, d);
      }
      // ≥1 ngày + chưa xác nhận → Đồng hành nhắc nhẹ
      else if (daysOverdue >= THRESHOLD_REMIND) {
        if (d.confirmed_at) continue; // Đã xác nhận, không cần nhắc
        if (recentEvTypes.has("auto_remind")) {
          summary.skipped_dedup++;
          continue;
        }
        await insertEvent(db, d.id, "auto_remind", d.t1_email, {
          days_overdue: daysOverdue,
          deadline: d.t4_thoi_han,
          dau_moi: d.t1_dau_moi,
          has_email: !!d.t1_email,
        });
        summary.auto_remind++;

        if (d.t1_email) {
          summary.email_sent++;
        } else {
          summary.email_skipped_no_address++;
        }
      }
    } catch (err) {
      summary.errors.push(`${d.directive_code}: ${(err as Error).message}`);
    }
  }

  return jsonResponse(summary);
});

// ===== HELPERS =====

async function insertEvent(
  db: ReturnType<typeof createClient>,
  directiveId: string,
  eventType: string,
  recipientEmail: string | null,
  metadata: Record<string, unknown>
) {
  const { error } = await db.from("engagement_events").insert({
    directive_id: directiveId,
    event_type: eventType,
    recipient_email: recipientEmail || null,
    metadata: { ...metadata, triggered_at: new Date().toISOString() },
  });
  if (error) throw new Error(`Insert event failed: ${error.message}`);
}

async function updateTinhTrang(
  db: ReturnType<typeof createClient>,
  directive: { id: string; tinh_trang: string }
) {
  if (directive.tinh_trang !== "leo_thang_ceo") {
    await db
      .from("directives")
      .update({ tinh_trang: "leo_thang_ceo" })
      .eq("id", directive.id);
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
    },
  });
}
