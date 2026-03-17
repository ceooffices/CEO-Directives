/**
 * GET /api/status — Trạng thái hệ thống đầy đủ
 * Dùng cho: external tools, Signal bot, monitoring, dashboard
 * Source of truth: Supabase (KHÔNG dùng Notion)
 */

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getServiceClient();
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // 1. Query tất cả directives
    const { data: directives, error } = await db
      .from("directives")
      .select(
        "id, directive_code, t1_dau_moi, t2_nhiem_vu, t4_thoi_han, tinh_trang, confirmed_at, lls_step"
      )
      .order("directive_code");

    if (error) {
      return NextResponse.json(
        { status: "error", message: error.message },
        { status: 500 }
      );
    }

    const all = directives || [];

    // 2. Tổng hợp by_status
    const byStatus: Record<string, number> = {};
    for (const d of all) {
      byStatus[d.tinh_trang] = (byStatus[d.tinh_trang] || 0) + 1;
    }

    // 3. Tính overdue + alerts
    const alerts: {
      directive_code: string;
      t1_dau_moi: string;
      days_overdue: number;
      level: "warning" | "critical" | "lost_control";
    }[] = [];

    let overdueCount = 0;
    let criticalCount = 0;

    for (const d of all) {
      if (d.tinh_trang === "hoan_thanh" || d.tinh_trang === "tu_choi")
        continue;
      if (!d.t4_thoi_han) continue;

      const deadline = new Date(d.t4_thoi_han);
      deadline.setHours(0, 0, 0, 0);
      const daysOverdue = Math.floor(
        (today.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysOverdue >= 1) {
        overdueCount++;

        const level =
          daysOverdue >= 14
            ? ("lost_control" as const)
            : daysOverdue >= 3
              ? ("critical" as const)
              : ("warning" as const);

        if (daysOverdue >= 3) criticalCount++;

        alerts.push({
          directive_code: d.directive_code,
          t1_dau_moi: d.t1_dau_moi,
          days_overdue: daysOverdue,
          level,
        });
      }
    }

    // Sắp xếp alerts theo mức nghiêm trọng giảm dần
    alerts.sort((a, b) => b.days_overdue - a.days_overdue);

    // 4. Recent engagement events (10 gần nhất)
    const { data: events } = await db
      .from("engagement_events")
      .select(
        "event_type, recipient_email, metadata, created_at, directives!inner(directive_code)"
      )
      .order("created_at", { ascending: false })
      .limit(10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentEvents = (events || []).map((e: any) => ({
      event_type: e.event_type,
      directive_code: e.directives?.directive_code || "",
      recipient_email: e.recipient_email,
      created_at: e.created_at,
    }));

    // 5. Health score (0-100)
    // Công thức: 100 - (overdue_pct * 50) - (critical_pct * 30) - (no_confirm_pct * 20)
    const totalActive = all.filter(
      (d) => d.tinh_trang !== "hoan_thanh" && d.tinh_trang !== "tu_choi"
    ).length;
    const withDeadline = all.filter(
      (d) =>
        d.t4_thoi_han &&
        d.tinh_trang !== "hoan_thanh" &&
        d.tinh_trang !== "tu_choi"
    ).length;

    let healthScore = 100;
    if (withDeadline > 0) {
      healthScore -= Math.round((overdueCount / withDeadline) * 50);
      healthScore -= Math.round((criticalCount / withDeadline) * 30);
    }
    if (totalActive > 0) {
      const noConfirm = all.filter(
        (d) =>
          !d.confirmed_at &&
          d.tinh_trang !== "hoan_thanh" &&
          d.tinh_trang !== "tu_choi"
      ).length;
      healthScore -= Math.round((noConfirm / totalActive) * 20);
    }
    healthScore = Math.max(0, Math.min(100, healthScore));

    // 6. Response
    const timestamp = now.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    return NextResponse.json({
      status: "ok",
      timestamp,
      summary: {
        total_directives: all.length,
        by_status: byStatus,
        overdue_count: overdueCount,
        critical_count: criticalCount,
      },
      alerts,
      recent_events: recentEvents,
      health_score: healthScore,
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
