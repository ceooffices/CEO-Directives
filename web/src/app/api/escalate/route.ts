/**
 * POST /api/escalate — Cho P1 (Anh Kha) bấm "Leo thang CEO"
 * Ghi engagement event + step_history + gửi Signal cho Sếp Sơn
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient, LLS_STEP_NAMES } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { directive_id } = body as { directive_id: string };

    if (!directive_id) {
      return NextResponse.json(
        { error: "Cần directive_id" },
        { status: 400 }
      );
    }

    const db = getServiceClient();

    // Lấy directive
    const { data: directive, error: fetchErr } = await db
      .from("directives")
      .select("*")
      .eq("id", directive_id)
      .single();

    if (fetchErr || !directive) {
      return NextResponse.json(
        { error: "Không tìm thấy chỉ đạo", detail: fetchErr?.message },
        { status: 404 }
      );
    }

    // Ghi engagement event
    await db.from("engagement_events").insert({
      directive_id,
      event_type: "escalated",
      recipient_email: null,
      metadata: {
        action: "escalate_ceo",
        dau_moi: directive.t1_dau_moi,
        lls_step: directive.lls_step,
        directive_code: directive.directive_code,
        triggered_at: new Date().toISOString(),
      },
    });

    // Ghi step_history
    await db.from("lls_step_history").insert({
      directive_id,
      step_number: directive.lls_step,
      step_name: LLS_STEP_NAMES[directive.lls_step] || `Step ${directive.lls_step}`,
      action: "escalate",
      actor: body.actor || "P1",
      detail: `Leo thang CEO: ${directive.directive_code} - ${directive.t2_nhiem_vu?.substring(0, 100)}`,
    });

    // Update trạng thái
    await db
      .from("directives")
      .update({ tinh_trang: "leo_thang_ceo" })
      .eq("id", directive_id);

    // TODO: Gửi Signal message cho Sếp Sơn qua CEO Office Hubs Signal bot API
    // const signalResponse = await fetch(SIGNAL_API_URL, { ... })

    return NextResponse.json({
      success: true,
      directive_id,
      directive_code: directive.directive_code,
      note: "Đã ghi leo thang. Signal sender chưa integrate (Phase 3+).",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
