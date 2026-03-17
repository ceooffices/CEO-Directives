/**
 * POST /api/approve — Cho P2 (BOD Hosting) bấm
 * Duyệt hoặc từ chối chỉ đạo → update lls_step + ghi step_history
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient, LLS_STEP_NAMES } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { directive_id, action, note } = body as {
      directive_id: string;
      action: "approve" | "reject";
      note?: string;
    };

    if (!directive_id || !action) {
      return NextResponse.json(
        { error: "Cần directive_id và action (approve/reject)" },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "action phải là 'approve' hoặc 'reject'" },
        { status: 400 }
      );
    }

    const db = getServiceClient();

    // Lấy directive hiện tại
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

    const newStep = action === "approve" ? 4 : 1;
    const newStatus = action === "approve" ? "da_duyet" : "tu_choi";

    // Update directive
    const { error: updateErr } = await db
      .from("directives")
      .update({
        lls_step: newStep,
        tinh_trang: newStatus,
        approved_by: body.actor || "BOD Hosting",
        approved_at: new Date().toISOString(),
      })
      .eq("id", directive_id);

    if (updateErr) {
      return NextResponse.json(
        { error: "Lỗi update directive", detail: updateErr.message },
        { status: 500 }
      );
    }

    // Ghi step_history
    await db.from("lls_step_history").insert({
      directive_id,
      step_number: newStep,
      step_name: LLS_STEP_NAMES[newStep] || `Step ${newStep}`,
      action: action === "approve" ? "approve" : "reject",
      actor: body.actor || "BOD Hosting",
      detail: note || null,
    });

    return NextResponse.json({
      success: true,
      action,
      directive_id,
      new_step: newStep,
      new_status: newStatus,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
