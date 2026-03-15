/**
 * API Health Check Endpoint
 * Trả về trạng thái dashboard + stats từ Notion
 */

import { NextResponse } from "next/server";
import { getDirectives } from "@/lib/notion";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const directives = await getDirectives();
    const total = directives.length;
    const completed = directives.filter(
      (d) => d.status === "Hoàn thành" || d.status === "Đã hoàn thành"
    ).length;
    const overdue = directives.filter((d) => {
      if (!d.deadline) return false;
      return new Date(d.deadline) < new Date() && d.status !== "Hoàn thành";
    }).length;

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
      directives: { total, completed, overdue },
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
