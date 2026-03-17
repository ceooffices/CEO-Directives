/**
 * POST /api/remind — Cho P1 (Anh Kha) bấm "Nhắc ngay"
 * Ghi engagement event + gửi email nhắc đầu mối
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

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
      event_type: "email_sent",
      recipient_email: directive.t1_email || null,
      metadata: {
        action: "remind",
        dau_moi: directive.t1_dau_moi,
        lls_step: directive.lls_step,
        triggered_at: new Date().toISOString(),
      },
    });

    // TODO: Gọi email sender module khi integrate với automation/
    // Hiện tại chỉ ghi event, chưa gửi email thật
    const emailTarget = directive.t1_email || directive.t1_dau_moi;

    return NextResponse.json({
      success: true,
      directive_id,
      email_sent_to: emailTarget,
      note: "Event ghi thành công. Email sender chưa integrate (Phase 3+).",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
