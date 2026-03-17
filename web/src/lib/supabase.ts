/**
 * Supabase client cho CEO Dashboard (Next.js)
 * 2 clients: browser (anon) + server (service_role)
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./supabase-types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client cho dashboard read (anon key, RLS enforced)
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

// Untyped client for tables not yet in Database types (directives, etc.)
// TODO: Regenerate types after schema stabilizes
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Client cho API routes (service_role, bypasses RLS)
export function getServiceClient() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY chua co trong env");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// ===== STEP NAME MAPPING =====

export const LLS_STEP_NAMES: Record<number, string> = {
  1: "B1 Chuẩn bị",
  2: "B2 Gửi CEO",
  3: "B3 ChatLong phân tích",
  4: "B4 Nghiên cứu sâu",
  5: "B5 Nâng cấp đề xuất",
  6: "B6 Gửi lại v2.0",
  7: "B7 TGĐ duyệt",
};

// ===== DASHBOARD DATA — Real Supabase queries =====

export interface SupabaseHM50 {
  id: string;
  hm_number: number;
  ten: string;
  dau_moi: string | null;
  tinh_trang: string;
  muc_tieu: string | null;
  thoi_han: string | null;
  bsc_perspective: string | null;
  phan_cl: string | null;
  directive_count: number;
}

// Lấy 50 HM từ Supabase (thay vì JSON file)
export async function getHM50FromSupabase(): Promise<SupabaseHM50[]> {
  const { data, error } = await supabase
    .from("hm50")
    .select("*")
    .order("hm_number");

  if (error) {
    console.error("[SUPABASE] Lỗi đọc hm50:", error.message);
    return [];
  }
  return (data || []) as unknown as SupabaseHM50[];
}

// BSC aggregation từ Supabase HM50 (thay getBSCDashboardData đọc JSON)
const BSC_LABELS: Record<string, string> = {
  tai_chinh: "Tài chính",
  khach_hang: "Khách hàng",
  quy_trinh: "Quy trình nội bộ",
  hoc_hoi: "Học tập & Phát triển",
};

const BSC_COLORS: Record<string, string> = {
  tai_chinh: "financial",
  khach_hang: "customer",
  quy_trinh: "process",
  hoc_hoi: "learning",
};

export async function getBSCFromSupabase() {
  const hm50 = await getHM50FromSupabase();

  // Đếm completed directives cho mỗi HM
  const { data: completedCounts } = await db
    .from("directives")
    .select("hm50_id, tinh_trang")
    .not("hm50_id", "is", null);

  const completedByHM: Record<string, number> = {};
  for (const d of completedCounts || []) {
    if (d.tinh_trang === "hoan_thanh" && d.hm50_id) {
      completedByHM[d.hm50_id] = (completedByHM[d.hm50_id] || 0) + 1;
    }
  }

  const perspectives = Object.entries(BSC_LABELS).map(([key, label]) => {
    const items = hm50.filter((h) => h.bsc_perspective === key);
    const directiveCount = items.reduce((sum, h) => sum + (h.directive_count || 0), 0);
    const completed = items.reduce((sum, h) => sum + (completedByHM[h.id] || 0), 0);

    return {
      key: BSC_COLORS[key] || key,
      label,
      hm_count: items.length,
      directive_count: directiveCount,
      completed,
      completion_pct: directiveCount > 0 ? Math.round((completed / directiveCount) * 100) : 0,
      sections: [] as string[],
      hm_items: items.map((h) => ({
        tt: h.hm_number,
        title: h.ten,
        status: h.tinh_trang || "chua_bat_dau",
        dau_moi: h.dau_moi || "",
        directive_count: h.directive_count || 0,
        progress_pct: h.directive_count > 0
          ? Math.round(((completedByHM[h.id] || 0) / h.directive_count) * 100)
          : 0,
      })),
    };
  });

  // Match summary: directives linked to HM50
  const { count: totalDirectives } = await db
    .from("directives")
    .select("*", { count: "exact", head: true });
  const { count: matchedDirectives } = await db
    .from("directives")
    .select("*", { count: "exact", head: true })
    .not("hm50_id", "is", null);

  return {
    bscPerspectives: perspectives,
    matchSummary: { matched: matchedDirectives || 0, total: totalDirectives || 0 },
  };
}

// ===== DASHBOARD STATS from Supabase (thay Notion rác) =====

export interface SupabaseDirective {
  id: string;
  directive_code: string;
  t1_dau_moi: string;
  t1_email: string | null;
  t2_nhiem_vu: string;
  t3_chi_tieu: string | null;
  t4_thoi_han: string | null;
  t5_thanh_vien: string[] | null;
  loai: string | null;
  hm50_id: string | null;
  meeting_source: string | null;
  lls_step: number;
  tinh_trang: string;
  approved_at: string | null;
  confirmed_at: string | null;
  created_at: string;
}

type LELONGSONStage = "B1" | "B2" | "B3_B5" | "B7" | "done";

function deriveLELONGSONStage(tinh_trang: string, lls_step: number): LELONGSONStage {
  if (tinh_trang === "hoan_thanh") return "done";
  if (tinh_trang === "dang_thuc_hien" || lls_step >= 7) return "B7";
  if (tinh_trang === "da_xac_nhan" || lls_step >= 3) return "B3_B5";
  if (tinh_trang === "cho_duyet" || lls_step >= 2) return "B2";
  return "B1";
}

export async function getDashboardStatsFromSupabase() {
  const { data, error } = await db
    .from("directives")
    .select("*")
    .order("directive_code");

  if (error) {
    console.error("[SUPABASE] Lỗi đọc directives:", error.message);
    return {
      stats: { total: 0, pending: 0, confirmed: 0, active: 0, completed: 0, overdue: 0 },
      byDauMoi: {},
      directives: [],
      lelongsonPipeline: { stages: [], total: 0 },
    };
  }

  const directives = (data || []) as unknown as SupabaseDirective[];
  const now = new Date();

  const stats = { total: directives.length, pending: 0, confirmed: 0, active: 0, completed: 0, overdue: 0 };
  const byDauMoi: Record<string, { total: number; overdue: number; completed: number }> = {};

  for (const d of directives) {
    // Count by tinh_trang
    if (d.tinh_trang === "cho_xu_ly" || d.tinh_trang === "cho_duyet") stats.pending++;
    else if (d.tinh_trang === "da_xac_nhan") stats.confirmed++;
    else if (d.tinh_trang === "dang_thuc_hien") stats.active++;
    else if (d.tinh_trang === "hoan_thanh") stats.completed++;

    // Check overdue
    const isOverdue = d.t4_thoi_han && new Date(d.t4_thoi_han) < now && d.tinh_trang !== "hoan_thanh";
    if (isOverdue) stats.overdue++;

    // Group by đầu mối (split comma-separated)
    const dms = d.t1_dau_moi.split(",").map((s) => s.trim()).filter(Boolean);
    for (const dm of dms) {
      if (!byDauMoi[dm]) byDauMoi[dm] = { total: 0, overdue: 0, completed: 0 };
      byDauMoi[dm].total++;
      if (isOverdue) byDauMoi[dm].overdue++;
      if (d.tinh_trang === "hoan_thanh") byDauMoi[dm].completed++;
    }
  }

  // LELONGSON pipeline
  const stageConfig: { key: LELONGSONStage; label: string; color: string }[] = [
    { key: "B1", label: "B1 Chuẩn bị", color: "bg-blue-200" },
    { key: "B2", label: "B2 Gửi CEO", color: "bg-blue-400" },
    { key: "B3_B5", label: "B3-B5 Phân tích", color: "bg-amber-400" },
    { key: "B7", label: "B7 Triển khai", color: "bg-emerald-400" },
    { key: "done", label: "Hoàn thành", color: "bg-emerald-600" },
  ];

  const stageMap = new Map<LELONGSONStage, SupabaseDirective[]>();
  for (const cfg of stageConfig) stageMap.set(cfg.key, []);

  for (const d of directives) {
    const stage = deriveLELONGSONStage(d.tinh_trang, d.lls_step);
    stageMap.get(stage)!.push(d);
  }

  // Map SupabaseDirective → Directive-like for pipeline display
  const mapToDisplayDirective = (d: SupabaseDirective) => ({
    id: d.id,
    title: d.t2_nhiem_vu.substring(0, 80) + (d.t2_nhiem_vu.length > 80 ? "…" : ""),
    status: d.tinh_trang,
    dau_moi: d.t1_dau_moi,
    nhiem_vu: d.t2_nhiem_vu,
    deadline: d.t4_thoi_han,
    hm50_ref: "",
    section: null,
    nguon: d.meeting_source || "",
    url: "",
    created_at: d.created_at,
    lelongson_stage: deriveLELONGSONStage(d.tinh_trang, d.lls_step),
  });

  const lelongsonPipeline = {
    stages: stageConfig.map((cfg) => ({
      ...cfg,
      count: stageMap.get(cfg.key)!.length,
      directives: stageMap.get(cfg.key)!.map(mapToDisplayDirective),
    })),
    total: directives.length,
  };

  // Map cho directive table display
  const displayDirectives = directives.map(mapToDisplayDirective);

  return { stats, byDauMoi, directives: displayDirectives, lelongsonPipeline };
}

// ===== DIRECTIVE ORIGINS from Supabase =====

export async function getDirectiveOriginsFromSupabase() {
  const { data } = await db
    .from("directives")
    .select("loai, hm50_id");

  const origins = { from_hm50: 0, escalation: 0, new_initiative: 0, total: 0, top_escalated: [] as { hm_tt: number; title: string; count: number }[] };

  for (const d of data || []) {
    origins.total++;
    if (d.loai === "leo_thang") origins.escalation++;
    else if (d.loai === "moi") origins.new_initiative++;
    else origins.from_hm50++; // bo_sung = từ HM50 backlog
  }

  // Top escalated HMs
  const { data: escalated } = await db
    .from("directives")
    .select("hm50_id")
    .eq("loai", "leo_thang")
    .not("hm50_id", "is", null);

  const escByHM: Record<string, number> = {};
  for (const d of escalated || []) {
    if (d.hm50_id) escByHM[d.hm50_id] = (escByHM[d.hm50_id] || 0) + 1;
  }

  const hmIds = Object.keys(escByHM);
  if (hmIds.length > 0) {
    const { data: hms } = await db
      .from("hm50")
      .select("id, hm_number, ten")
      .in("id", hmIds);

    origins.top_escalated = (hms || [])
      .map((h) => ({ hm_tt: h.hm_number, title: h.ten, count: escByHM[h.id] || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  return origins;
}

// ===== BOD TIMELINE from Supabase =====

export async function getBODTimelineFromSupabase() {
  // HM Items: các HM50 có directive count > 0 (đã leo thang)
  const hm50 = await getHM50FromSupabase();
  const hotHMs = hm50.filter((h) => h.directive_count > 0);

  const hmItems = hotHMs.map((h) => ({
    hm_tt: h.hm_number,
    title: h.ten,
    phan_cl: h.phan_cl || "",
    current_status: h.tinh_trang || "chua_bat_dau",
    t1_dau_moi: h.dau_moi || "",
    total_mentions: h.directive_count,
    total_escalations: h.directive_count,
    trend: h.directive_count >= 4 ? "critical" as const : h.directive_count >= 2 ? "worsening" as const : "stable" as const,
    escalation_history: [],
  }));

  // Meeting info từ directives
  const { data: meetingData } = await db
    .from("directives")
    .select("meeting_source, hm50_id");

  const meetingMap: Record<string, { total: number; hmSet: Set<string> }> = {};
  for (const d of meetingData || []) {
    const ms = d.meeting_source || "Unknown";
    if (!meetingMap[ms]) meetingMap[ms] = { total: 0, hmSet: new Set() };
    meetingMap[ms].total++;
    if (d.hm50_id) meetingMap[ms].hmSet.add(d.hm50_id);
  }

  const meetings = Object.entries(meetingMap).map(([id, info]) => ({
    meeting_id: id,
    date: id.replace("BOD ", ""),
    total_directives: info.total,
    hm_affected: info.hmSet.size,
    risk_signals: [],
  }));

  // directivesByMeeting
  const { data: allDirectives } = await db
    .from("directives")
    .select("directive_code, t1_dau_moi, t2_nhiem_vu, t4_thoi_han, loai, meeting_source, tinh_trang, hm50_id");

  const directivesByMeeting: Record<string, { local_id: number; title: string; nhom: string; loai: string; t1_dau_moi: string[]; t4_deadline: string | null; hm50_match: null; status: string }[]> = {};

  for (const d of allDirectives || []) {
    const ms = d.meeting_source || "Unknown";
    if (!directivesByMeeting[ms]) directivesByMeeting[ms] = [];
    const code = d.directive_code || "";
    const localId = parseInt(code.split("-").pop() || "0");
    directivesByMeeting[ms].push({
      local_id: localId,
      title: d.t2_nhiem_vu?.substring(0, 80) || "",
      nhom: "",
      loai: d.loai || "moi",
      t1_dau_moi: d.t1_dau_moi?.split(",").map((s: string) => s.trim()) || [],
      t4_deadline: d.t4_thoi_han,
      hm50_match: null,
      status: d.tinh_trang || "cho_xu_ly",
    });
  }

  // All HM for heatmap
  const allHM = hm50.map((h) => ({
    tt: h.hm_number,
    hang_muc: h.ten,
    phan_cl: h.phan_cl || "",
    status: h.tinh_trang || "chua_bat_dau",
  }));

  return { hmItems, meetings, directivesByMeeting, allHM };
}

// ===== PHASE 4: ALERT & ENGAGEMENT QUERIES =====

export interface AlertDirective {
  id: string;
  directive_code: string;
  t2_nhiem_vu: string;
  t1_dau_moi: string;
  t4_thoi_han: string | null;
  tinh_trang: string;
}

/**
 * Query chỉ đạo quá hạn / sắp hạn — dùng cho Alert Panel
 * Trả về tất cả chỉ đạo chưa hoàn thành có deadline ≤ 3 ngày tới hoặc đã quá
 */
export async function getAlertDirectives(): Promise<AlertDirective[]> {
  const { data, error } = await db
    .from("directives")
    .select("id, directive_code, t2_nhiem_vu, t1_dau_moi, t4_thoi_han, tinh_trang")
    .neq("tinh_trang", "hoan_thanh")
    .not("t4_thoi_han", "is", null)
    .order("t4_thoi_han", { ascending: true });

  if (error) {
    console.error("[SUPABASE] Lỗi đọc alert directives:", error.message);
    return [];
  }

  // Filter: chỉ giữ những chỉ đạo quá hạn hoặc deadline ≤ 3 ngày
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  return ((data || []) as unknown as AlertDirective[]).filter((d) => {
    if (!d.t4_thoi_han) return false;
    const dl = new Date(d.t4_thoi_han);
    return dl <= threeDaysLater; // quá hạn HOẶC ≤ 3 ngày nữa
  });
}

/**
 * Query engagement events gần nhất toàn hệ thống — dùng cho dashboard activity feed
 */
export async function getRecentEngagement(limit = 10) {
  const { data, error } = await db
    .from("engagement_events")
    .select("*, directives!inner(directive_code, t2_nhiem_vu)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[SUPABASE] Lỗi đọc engagement:", error.message);
    return [];
  }

  return (data || []) as {
    id: string;
    directive_id: string;
    event_type: string;
    recipient_email: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    directives: { directive_code: string; t2_nhiem_vu: string };
  }[];
}

// ===== DIRECTIVE DETAIL =====

export interface DirectiveDetail {
  id: string;
  directive_code: string;
  t1_dau_moi: string;
  t1_email: string | null;
  t2_nhiem_vu: string;
  t3_chi_tieu: string | null;
  t4_thoi_han: string | null;
  t5_thanh_vien: string[] | null;
  loai: string | null;
  meeting_source: string | null;
  lls_step: number;
  tinh_trang: string;
  approved_by: string | null;
  approved_at: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  hm50?: { hm_number: number; ten: string; bsc_perspective: string | null } | null;
}

export async function getDirectiveById(id: string): Promise<DirectiveDetail | null> {
  // Query directive + join hm50
  const { data, error } = await supabase
    .from("directives")
    .select("*, hm50(hm_number, ten, bsc_perspective)")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as unknown as DirectiveDetail;
}

// Tracking events cho directive detail
export async function getTrackingEvents(directiveId: string) {
  const { data } = await supabase
    .from("engagement_events")
    .select("*")
    .eq("directive_id", directiveId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data || []) as { event_type: string; recipient_email: string | null; metadata: Record<string, unknown> | null; created_at: string }[];
}

// LLS step history cho directive detail
export async function getStepHistory(directiveId: string) {
  const { data } = await supabase
    .from("lls_step_history")
    .select("*")
    .eq("directive_id", directiveId)
    .order("created_at", { ascending: false });

  return (data || []) as { step_number: number; step_name: string; action: string; actor: string | null; detail: string | null; created_at: string }[];
}
