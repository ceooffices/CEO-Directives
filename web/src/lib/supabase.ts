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

// ===== QUY TRÌNH 7 BƯỚC — Đồng bộ với email templates =====

export const QUY_TRINH_7_BUOC: Record<number, { label: string; desc: string; icon: string }> = {
  1: { label: 'Ghi nhận',  desc: 'Thư ký ghi 5T tại cuộc họp', icon: '📝' },
  2: { label: 'Duyệt',     desc: 'BOD Hosting xác nhận 5T', icon: '✅' },
  3: { label: 'Xác nhận',  desc: 'Đầu mối xác nhận + kế hoạch', icon: '🤝' },
  4: { label: 'Phân tích', desc: 'AI rà soát rủi ro, khả thi', icon: '🧠' },
  5: { label: 'Thực hiện', desc: 'Đầu mối triển khai', icon: '⚡' },
  6: { label: 'Đồng hành', desc: 'Hệ thống nhắc nhở, phát hiện rủi ro', icon: '🔄' },
  7: { label: 'Hoàn thành', desc: 'Xác nhận kết quả đạt chỉ tiêu T3', icon: '🏆' },
};

// Keep backward compat alias
export const LLS_STEP_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(QUY_TRINH_7_BUOC).map(([k, v]) => [k, `B${k} ${v.label}`])
);

// ===== STAFF EMAIL LOOKUP — 3-tier resolution =====

/**
 * Bảng alias: tên tắt / chức danh → tên đầy đủ trong bảng staff (UPPER)
 * Được build từ QC audit data thực tế 17/03/2026
 * 
 * Rule theo anh Kha:
 * - Tên viết tắt → tham chiếu phòng ban từ context cuộc họp để xác định đúng người
 * - Giao cho bộ phận → lấy trưởng bộ phận đầu mối
 */
const ALIAS_MAP: Record<string, string> = {
  // Chức danh → họ tên đầy đủ
  "Thầy Nam":       "TRẦN HOÀNG HOÀI NAM",
  "Cô Nhiên":       "NGUYỄN THỊ NHIÊN",
  "Cô Anh Thư":     "HUỲNH THỊ ANH THƯ",
  "Thầy Huy":       "ĐẶNG QUANG HUY",
  "Cô Xuân":        "LÊ THỊ XUÂN",
  // Tên tắt → họ tên dựa theo context phòng ban cuộc họp BOD 16/03
  "Thanh Hiếu":     "BÙI THỊ THANH HIẾU",
  "Hoàng":          "NGUYỄN NGỌC HOÀNG",     // MSA context
  "Trúc":           "HỒ PHAN BẠCH TRÚC",     // MSA context
};

/**
 * Mapping bộ phận → department name trong bảng staff
 * Rule: giao bộ phận → lấy trưởng bộ phận (is_manager = true)
 */
const DEPARTMENT_ALIAS: Record<string, string> = {
  "Toàn bộ MS":     "MSA",
  "toàn bộ MS":     "MSA",
  "Ban Giám Đốc":   "BAN TỔNG GIÁM ĐỐC",
};

interface EmailResolution {
  /** Map: tên gốc → email (có thể nhiều email nếu nhiều đầu mối) */
  resolved: Record<string, string>;
  /** Tên không tìm được email */
  unresolved: string[];
}

/**
 * Resolve email từ tên đầu mối (t1_dau_moi).
 * 3-tier lookup:
 *   1. ALIAS_MAP — tên tắt/chức danh → query staff bằng tên đầy đủ
 *   2. Exact ILIKE — tìm trong staff.name
 *   3. Department — nếu là tên bộ phận, query trưởng bộ phận (is_manager)
 */
export async function resolveStaffEmails(names: string[]): Promise<EmailResolution> {
  const resolved: Record<string, string> = {};
  const unresolved: string[] = [];

  for (const rawName of names) {
    const name = rawName.trim();
    if (!name) continue;

    // Check department alias first (e.g. "Toàn bộ MS" → trưởng MSA)
    if (DEPARTMENT_ALIAS[name]) {
      const dept = DEPARTMENT_ALIAS[name];
      const { data } = await db
        .from("staff")
        .select("name, email")
        .eq("department", dept)
        .eq("is_manager", true)
        .limit(1)
        .single();
      if (data?.email) {
        resolved[name] = data.email;
        continue;
      }
    }

    // Resolve alias → full name
    const fullName = ALIAS_MAP[name] || name.toUpperCase();

    // Query staff table by ILIKE on name
    const { data } = await db
      .from("staff")
      .select("name, email")
      .ilike("name", `%${fullName}%`)
      .limit(3);

    if (data && data.length === 1 && data[0].email) {
      // Unique match
      resolved[name] = data[0].email;
    } else if (data && data.length > 1) {
      // Multiple matches — try exact match first 
      const exact = data.find(
        (s: { name: string; email: string | null }) => s.name === fullName && s.email
      );
      if (exact) {
        resolved[name] = exact.email!;
      } else if (data[0].email) {
        // Take first match (best effort)
        resolved[name] = data[0].email;
      } else {
        unresolved.push(name);
      }
    } else {
      unresolved.push(name);
    }
  }

  return { resolved, unresolved };
}

/**
 * Parse t1_dau_moi (comma-separated) → resolve all emails
 * Returns: first email found (primary contact) + all emails array
 */
export async function resolveDirectiveEmail(
  t1_dau_moi: string
): Promise<{ primary: string | null; all: string[]; unresolved: string[] }> {
  const names = t1_dau_moi.split(",").map((n) => n.trim()).filter(Boolean);
  const { resolved, unresolved } = await resolveStaffEmails(names);
  const allEmails = Object.values(resolved);
  return {
    primary: allEmails[0] || null,
    all: allEmails,
    unresolved,
  };
}

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

// Bước quy trình: 1-7 (map với QUY_TRINH_7_BUOC)
type BuocQuyTrinh = 1 | 2 | 3 | 4 | 5 | 6 | 7;

function deriveBuocQuyTrinh(tinh_trang: string, lls_step: number): BuocQuyTrinh {
  if (tinh_trang === "hoan_thanh") return 7;
  if (tinh_trang === "dang_thuc_hien") {
    // Đang triển khai: nếu lls_step >= 6 thì đang ở bước Đồng hành
    return lls_step >= 6 ? 6 : 5;
  }
  if (tinh_trang === "da_xac_nhan" || lls_step >= 3) return 4;
  if (tinh_trang === "da_gui_email") return 3;
  if (tinh_trang === "cho_duyet" || tinh_trang === "cho_xu_ly") return 2;
  return 1;
}

// Backward compat
type LELONGSONStage = "B1" | "B2" | "B3_B5" | "B7" | "done";
function deriveLELONGSONStage(tinh_trang: string, lls_step: number): LELONGSONStage {
  const buoc = deriveBuocQuyTrinh(tinh_trang, lls_step);
  if (buoc === 7) return "done";
  if (buoc >= 5) return "B7";
  if (buoc >= 3) return "B3_B5";
  if (buoc >= 2) return "B2";
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
      quyTrinhPipeline: { steps: [], total: 0 },
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

  // Quy trình 7 bước pipeline
  const buocConfig: { key: BuocQuyTrinh; label: string; desc: string; color: string; icon: string }[] = [
    { key: 1, label: 'Ghi nhận',  desc: 'Thư ký ghi 5T tại cuộc họp', color: 'bg-slate-400', icon: '📝' },
    { key: 2, label: 'Duyệt',     desc: 'BOD Hosting xác nhận 5T', color: 'bg-blue-400', icon: '✅' },
    { key: 3, label: 'Xác nhận',  desc: 'Đầu mối xác nhận + kế hoạch', color: 'bg-cyan-400', icon: '🤝' },
    { key: 4, label: 'Phân tích', desc: 'AI rà soát rủi ro, khả thi', color: 'bg-purple-400', icon: '🧠' },
    { key: 5, label: 'Thực hiện', desc: 'Đầu mối triển khai', color: 'bg-amber-400', icon: '⚡' },
    { key: 6, label: 'Đồng hành', desc: 'Hệ thống nhắc nhở, phát hiện rủi ro', color: 'bg-orange-400', icon: '🔄' },
    { key: 7, label: 'Hoàn thành', desc: 'Xác nhận kết quả đạt chỉ tiêu T3', color: 'bg-emerald-500', icon: '🏆' },
  ];

  const buocMap = new Map<BuocQuyTrinh, SupabaseDirective[]>();
  for (const cfg of buocConfig) buocMap.set(cfg.key, []);

  for (const d of directives) {
    const buoc = deriveBuocQuyTrinh(d.tinh_trang, d.lls_step);
    buocMap.get(buoc)!.push(d);
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
    buoc_quy_trinh: deriveBuocQuyTrinh(d.tinh_trang, d.lls_step),
    lelongson_stage: deriveLELONGSONStage(d.tinh_trang, d.lls_step),
  });

  // New 7-step pipeline
  const quyTrinhPipeline = {
    steps: buocConfig.map((cfg) => ({
      ...cfg,
      count: buocMap.get(cfg.key)!.length,
      directives: buocMap.get(cfg.key)!.map(mapToDisplayDirective),
    })),
    total: directives.length,
  };

  // Backward compat: LELONGSON pipeline
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

  return { stats, byDauMoi, directives: displayDirectives, lelongsonPipeline, quyTrinhPipeline };
}

// ===== RAW DIRECTIVES FOR DRILLDOWN =====

export async function getAllDirectivesForDrilldown() {
  const { data, error } = await db
    .from("directives")
    .select("id, directive_code, t1_dau_moi, t2_nhiem_vu, t4_thoi_han, tinh_trang, meeting_source, created_at, lls_step")
    .order("directive_code");

  if (error) {
    console.error("[SUPABASE] Lỗi đọc directives for drilldown:", error.message);
    return [];
  }
  return (data || []) as { id: string; directive_code: string; t1_dau_moi: string; t2_nhiem_vu: string; t4_thoi_han: string | null; tinh_trang: string; meeting_source: string | null; created_at: string; lls_step: number | null }[];
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

// Tracking events cho directive detail — tăng limit cho timeline đầy đủ
export async function getTrackingEvents(directiveId: string) {
  const { data } = await supabase
    .from("engagement_events")
    .select("*")
    .eq("directive_id", directiveId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (data || []) as { event_type: string; recipient_email: string | null; metadata: Record<string, unknown> | null; created_at: string }[];
}

// Engagement stats — aggregate cho hero panel
export async function getEngagementStats(directiveId: string) {
  const { data } = await supabase
    .from("engagement_events")
    .select("event_type, recipient_email, created_at, metadata")
    .eq("directive_id", directiveId)
    .order("created_at", { ascending: true });

  const events = (data || []) as { event_type: string; recipient_email: string | null; created_at: string; metadata: Record<string, unknown> | null }[];

  let emailSent = 0;
  let emailOpened = 0;
  let linkClicked = 0;
  let firstOpenAt: string | null = null;
  let lastOpenAt: string | null = null;
  const openerEmails = new Set<string>();
  const recipientEmails = new Set<string>();

  for (const e of events) {
    if (e.recipient_email) recipientEmails.add(e.recipient_email);

    switch (e.event_type) {
      case "email_sent":
        emailSent++;
        break;
      case "email_opened": {
        const isBot = e.metadata?.is_bot === true;
        if (!isBot) {
          emailOpened++;
          if (!firstOpenAt) firstOpenAt = e.created_at;
          lastOpenAt = e.created_at;
          if (e.recipient_email) openerEmails.add(e.recipient_email);
        }
        break;
      }
      case "link_clicked":
        linkClicked++;
        break;
    }
  }

  return {
    emailSent,
    emailOpened,
    linkClicked,
    firstOpenAt,
    lastOpenAt,
    uniqueOpeners: openerEmails.size,
    totalRecipients: Math.max(recipientEmails.size, 1), // ít nhất 1
  };
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

// ===== KPI THỰC TẾ — Nhập học & Matching =====
/**
 * Tổng hợp kết quả thực tế từ employee_commitments
 * - nhapHoc: SUM commit_number WHERE target ILIKE '%nhập học%' OR '%tuyển sinh%'
 * - matching: SUM commit_number WHERE target ILIKE '%matching%' OR '%xuất cảnh%'
 */
export async function getKPIActual(): Promise<{ nhapHoc: number; matching: number }> {
  const { data, error } = await db
    .from("employee_commitments")
    .select("commit_number, target");

  if (error || !data) {
    // Bảng chưa có hoặc lỗi — trả về 0, không crash
    return { nhapHoc: 0, matching: 0 };
  }

  let nhapHoc = 0;
  let matching = 0;

  for (const row of data) {
    const t = (row.target || "").toLowerCase();
    const v = Number(row.commit_number) || 0;
    if (t.includes("nhập học") || t.includes("nhan hoc") || t.includes("tuyển sinh") || t.includes("tuyen sinh")) {
      nhapHoc += v;
    } else if (t.includes("matching") || t.includes("xuất cảnh") || t.includes("xuat canh")) {
      matching += v;
    }
  }

  return { nhapHoc, matching };
}
