import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { stats } = await getDashboardStats();
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
      directives: stats,
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
