import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

const VALID_STATUSES = ["cho_xu_ly", "da_xac_nhan", "dang_thuc_hien", "hoan_thanh"];
const VALID_TRANSITIONS: Record<string, string[]> = {
  cho_xu_ly: ["da_xac_nhan"],
  da_xac_nhan: ["dang_thuc_hien"],
  dang_thuc_hien: ["hoan_thanh"],
  hoan_thanh: [], // final state
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { directive_id, new_status } = body;

    if (!directive_id || !new_status) {
      return NextResponse.json(
        { error: "Thiếu directive_id hoặc new_status" },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(new_status)) {
      return NextResponse.json(
        { error: `Trạng thái không hợp lệ: ${new_status}. Cho phép: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Get current status
    const { data: current, error: fetchError } = await supabase
      .from("directives")
      .select("id, tinh_trang, directive_code")
      .eq("id", directive_id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json(
        { error: `Không tìm thấy chỉ đạo: ${directive_id}` },
        { status: 404 }
      );
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[current.tinh_trang || "cho_xu_ly"] || [];
    if (!allowed.includes(new_status)) {
      return NextResponse.json(
        { error: `Không thể chuyển từ "${current.tinh_trang}" sang "${new_status}". Cho phép: ${allowed.join(", ") || "không có (trạng thái cuối)"}` },
        { status: 400 }
      );
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      tinh_trang: new_status,
      updated_at: new Date().toISOString(),
    };

    // Set approval metadata based on transition
    if (new_status === "da_xac_nhan") {
      updatePayload.approved_by = "CEO";
      updatePayload.approved_at = new Date().toISOString();
    } else if (new_status === "dang_thuc_hien") {
      updatePayload.confirmed_by = "CEO";
      updatePayload.confirmed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("directives")
      .update(updatePayload)
      .eq("id", directive_id);

    if (updateError) {
      console.error("[APPROVE] Update failed:", updateError);
      return NextResponse.json(
        { error: `Lỗi cập nhật: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Log engagement event
    await supabase.from("engagement_events").insert({
      directive_id,
      event_type: "approve",
      metadata: {
        from_status: current.tinh_trang,
        to_status: new_status,
        approved_by: "CEO",
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      status: "ok",
      directive_code: current.directive_code,
      from: current.tinh_trang,
      to: new_status,
      message: `Đã chuyển ${current.directive_code} → ${new_status}`,
    });
  } catch (err) {
    console.error("[APPROVE] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
