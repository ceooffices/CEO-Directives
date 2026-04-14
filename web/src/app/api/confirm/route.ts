/**
 * POST /api/confirm — Cho P3 (Đầu mối) bấm
 * Xác nhận 5T hoặc yêu cầu làm rõ → update lls_step + ghi step_history
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient, LLS_STEP_NAMES } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { directive_id, action, updates, plan_text } = body as {
      directive_id: string;
      action: "confirm" | "clarify";
      updates?: {
        t1_dau_moi?: string;
        t2_nhiem_vu?: string;
        t3_chi_tieu?: string;
        t4_thoi_han?: string;
        t5_thanh_vien?: string[];
      };
      plan_text?: string;
    };

    if (!directive_id || !action) {
      return NextResponse.json(
        { error: "Cần directive_id và action (confirm/clarify)" },
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

    // Build object cập nhật
    const updateData: Record<string, unknown> = {};

    if (action === "confirm") {
      updateData.lls_step = 5;
      updateData.tinh_trang = "da_xac_nhan";
      updateData.confirmed_by = body.actor || directive.t1_dau_moi;
      updateData.confirmed_at = new Date().toISOString();
    }
    // clarify: giữ nguyên lls_step = 4, chỉ ghi history

    // Update 5T fields nếu có
    if (updates) {
      if (updates.t1_dau_moi) updateData.t1_dau_moi = updates.t1_dau_moi;
      if (updates.t2_nhiem_vu) updateData.t2_nhiem_vu = updates.t2_nhiem_vu;
      if (updates.t3_chi_tieu) updateData.t3_chi_tieu = updates.t3_chi_tieu;
      if (updates.t4_thoi_han) updateData.t4_thoi_han = updates.t4_thoi_han;
      if (updates.t5_thanh_vien) updateData.t5_thanh_vien = updates.t5_thanh_vien;
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateErr } = await db
        .from("directives")
        .update(updateData)
        .eq("id", directive_id);

      if (updateErr) {
        return NextResponse.json(
          { error: "Lỗi update directive", detail: updateErr.message },
          { status: 500 }
        );
      }
    }

    // Diff logic
    const differences: string[] = [];
    if (updates) {
      if (updates.t1_dau_moi && updates.t1_dau_moi !== directive.t1_dau_moi) {
        differences.push(`- Đầu mối: [${directive.t1_dau_moi || '(trống)'}] → [${updates.t1_dau_moi}]`);
      }
      if (updates.t2_nhiem_vu && updates.t2_nhiem_vu !== directive.t2_nhiem_vu) {
        differences.push(`- Nhiệm vụ: [${directive.t2_nhiem_vu || '(trống)'}] → [${updates.t2_nhiem_vu}]`);
      }
      if (updates.t3_chi_tieu !== undefined && updates.t3_chi_tieu !== directive.t3_chi_tieu) {
        differences.push(`- Chỉ tiêu: [${directive.t3_chi_tieu || '(trống)'}] → [${updates.t3_chi_tieu}]`);
      }
      if (updates.t4_thoi_han !== undefined && updates.t4_thoi_han !== directive.t4_thoi_han) {
        differences.push(`- Thời hạn: [${directive.t4_thoi_han || '(trống)'}] → [${updates.t4_thoi_han}]`);
      }
    }

    let historyDetail = plan_text ? `Nội dung: ${plan_text}` : "";
    if (differences.length > 0) {
      historyDetail += (historyDetail ? "\n\n" : "") + "Thay đổi 5T:\n" + differences.join("\n");
    }

    // Ghi step_history
    const stepNum = action === "confirm" ? 5 : directive.lls_step;
    await db.from("lls_step_history").insert({
      directive_id,
      step_number: stepNum,
      step_name: LLS_STEP_NAMES[stepNum] || `Step ${stepNum}`,
      action,
      actor: body.actor || directive.t1_dau_moi,
      detail: historyDetail || null,
    });

    return NextResponse.json({
      success: true,
      action,
      directive_id,
      new_step: action === "confirm" ? 5 : directive.lls_step,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Server error", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
