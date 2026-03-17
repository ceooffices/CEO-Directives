/**
 * Notion client for CEO Dashboard (Next.js)
 * Đọc trực tiếp từ Notion API — không cần tầng trung gian
 * Dùng raw fetch thay vì SDK để tránh type issues
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const CLARIFICATION_DB = process.env.NOTION_CLARIFICATIONS_DB!;
const NOTION_VERSION = "2022-06-28";

const headers = {
  Authorization: `Bearer ${NOTION_API_KEY}`,
  "Notion-Version": NOTION_VERSION,
  "Content-Type": "application/json",
};

// ===== HELPERS =====

function safeText(richTextArray: unknown): string {
  if (!Array.isArray(richTextArray) || richTextArray.length === 0) return "";
  return richTextArray
    .map((t: { plain_text?: string }) => t.plain_text || "")
    .join("");
}

function safeSelect(select: unknown): string {
  if (select && typeof select === "object" && "name" in select) {
    return (select as { name: string }).name || "";
  }
  return "";
}

function safeDate(date: unknown): string | null {
  if (date && typeof date === "object" && "start" in date) {
    return (date as { start: string }).start || null;
  }
  return null;
}

// ===== TYPES =====

export interface Directive {
  id: string;
  title: string;
  status: string;
  dau_moi: string;
  nhiem_vu: string;
  deadline: string | null;
  hm50_ref: string;
  section: string | null;
  nguon: string;
  url: string;
  created_at: string;
  lelongson_stage?: LELONGSONStage;
}

// ===== BSC & LELONGSON TYPES =====

export interface BSCPerspective {
  key: string;
  label: string;
  hm_count: number;
  directive_count: number;
  completed: number;
  completion_pct: number;
  sections: string[];
  hm_items: {
    tt: number;
    title: string;
    status: string;
    dau_moi: string;
    directive_count: number;
    progress_pct: number;
  }[];
}

export interface DirectiveOrigins {
  from_hm50: number;
  escalation: number;
  new_initiative: number;
  total: number;
  top_escalated: { hm_tt: number; title: string; count: number }[];
}

export type LELONGSONStage = "B1" | "B2" | "B3_B5" | "B7" | "done";

export interface LELONGSONPipeline {
  stages: {
    key: LELONGSONStage;
    label: string;
    count: number;
    color: string;
    directives: Directive[];
  }[];
  total: number;
}

// TODO: Chuyển sang đọc LELONGSON_Stage property khi populated trong Notion
function deriveLELONGSONStage(status: string): LELONGSONStage {
  if (status === "Hoàn thành" || status === "Đã hoàn thành") return "done";
  if (status === "Đang thực hiện" || status === "Đang xử lý") return "B7";
  if (status === "Đã xác nhận 5T" || status === "Đã xác nhận") return "B3_B5";
  if (status === "Chờ xác nhận") return "B2";
  return "B1";
}

// ===== QUERY =====


async function queryAll(): Promise<Directive[]> {
  const results: Directive[] = [];
  let cursor: string | undefined;

  do {
    const body: Record<string, unknown> = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(
      `https://api.notion.com/v1/databases/${CLARIFICATION_DB}/query`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        next: { revalidate: 60 }, // Cache 60 giây
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Notion API error:", res.status, err);
      break;
    }

    const data = await res.json();

    for (const page of data.results) {
      const props = page.properties || {};

      const hm50Ref =
        safeSelect(props["HM50_REF"]?.select) ||
        safeText(props["HM50_REF"]?.rich_text);
      const sectionMatch = hm50Ref.match(/SEC-[IVX]+/i);

      results.push({
        id: page.id,
        title: safeText(props["Tiêu đề"]?.title),
        status: safeSelect(props["TINH_TRANG"]?.select),
        dau_moi: safeText(props["T1 - Đầu mối"]?.rich_text),
        nhiem_vu: safeText(props["T2 - Nhiệm vụ"]?.rich_text),
        deadline: safeDate(props["T4 - Thời hạn"]?.date),
        hm50_ref: hm50Ref,
        section: sectionMatch ? sectionMatch[0].toUpperCase() : null,
        nguon: safeText(props["Nguồn"]?.rich_text),
        url: page.url || "",
        created_at: page.created_time || "",
      });
    }

    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return results;
}

// ===== AGGREGATION =====

export async function getDirectives(): Promise<Directive[]> {
  return queryAll();
}

export async function getDashboardStats() {
  const directives = await queryAll();
  const now = new Date();

  const stats = {
    total: directives.length,
    pending: 0,
    confirmed: 0,
    active: 0,
    completed: 0,
    overdue: 0,
  };

  const byDauMoi: Record<
    string,
    { total: number; overdue: number; completed: number }
  > = {};
  const bySection: Record<string, { total: number; completed: number }> = {};

  for (const d of directives) {
    // Count by status
    if (
      d.status === "Chờ làm rõ" ||
      d.status === "Chờ xác nhận" ||
      d.status === "Chờ xử lý"
    )
      stats.pending++;
    else if (d.status === "Đã xác nhận 5T" || d.status === "Đã xác nhận")
      stats.confirmed++;
    else if (d.status === "Đang thực hiện" || d.status === "Đang xử lý")
      stats.active++;
    else if (d.status === "Hoàn thành" || d.status === "Đã hoàn thành")
      stats.completed++;

    // Check overdue
    const isOverdue =
      d.deadline &&
      new Date(d.deadline) < now &&
      d.status !== "Hoàn thành" &&
      d.status !== "Đã hoàn thành";
    if (isOverdue) stats.overdue++;

    // Group by đầu mối
    const dm = d.dau_moi || "Không rõ";
    if (!byDauMoi[dm]) byDauMoi[dm] = { total: 0, overdue: 0, completed: 0 };
    byDauMoi[dm].total++;
    if (isOverdue) byDauMoi[dm].overdue++;
    if (d.status === "Hoàn thành" || d.status === "Đã hoàn thành")
      byDauMoi[dm].completed++;

    // Group by section
    const sec = d.section || "Ngoài kế hoạch";
    if (!bySection[sec]) bySection[sec] = { total: 0, completed: 0 };
    bySection[sec].total++;
    if (d.status === "Hoàn thành" || d.status === "Đã hoàn thành")
      bySection[sec].completed++;
  }

  // Tính LELONGSON pipeline từ directives
  const stageConfig: { key: LELONGSONStage; label: string; color: string }[] = [
    { key: "B1", label: "B1 Chuẩn bị", color: "bg-blue-200" },
    { key: "B2", label: "B2 Gửi CEO", color: "bg-blue-400" },
    { key: "B3_B5", label: "B3-B5 Phân tích", color: "bg-amber-400" },
    { key: "B7", label: "B7 Triển khai", color: "bg-emerald-400" },
    { key: "done", label: "Hoàn thành", color: "bg-emerald-600" },
  ];

  const stageMap = new Map<LELONGSONStage, Directive[]>();
  for (const cfg of stageConfig) stageMap.set(cfg.key, []);

  for (const d of directives) {
    d.lelongson_stage = deriveLELONGSONStage(d.status);
    stageMap.get(d.lelongson_stage)!.push(d);
  }

  const lelongsonPipeline: LELONGSONPipeline = {
    stages: stageConfig.map((cfg) => ({
      ...cfg,
      count: stageMap.get(cfg.key)!.length,
      directives: stageMap.get(cfg.key)!,
    })),
    total: directives.length,
  };

  return { stats, byDauMoi, bySection, directives, lelongsonPipeline };
}

// ===== BOD TIMELINE DATA =====

import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "..", "data");

export interface HMTimelineItem {
  hm_tt: number;
  title: string;
  phan_cl: string;
  current_status: string;
  t1_dau_moi: string;
  total_mentions: number;
  total_escalations: number;
  trend: "critical" | "worsening" | "stable";
  escalation_history: {
    meeting: string;
    date: string;
    count: number;
    directives: { id: string; title: string; loai: string }[];
  }[];
}

export interface BODMeetingInfo {
  meeting_id: string;
  date: string;
  total_directives: number;
  hm_affected: number;
  risk_signals: { hm_tt: number; reason: string }[];
}

export interface BODDirectiveInfo {
  local_id: number;
  title: string;
  nhom: string;
  loai: string;
  t1_dau_moi: string[];
  t4_deadline: string | null;
  hm50_match: {
    hm_tt: number;
    hm_title: string;
    confidence: number;
    hm_status: string;
  } | null;
  status: string;
}

export interface AllHMItem {
  tt: number;
  hang_muc: string;
  phan_cl: string;
  status: string;
}

export async function getBODTimeline() {
  // Đọc timeline JSON (generated bởi hm50-linker.js)
  const timelinePath = join(DATA_DIR, "hm50_timeline.json");
  let hmItems: HMTimelineItem[] = [];
  let meetings: BODMeetingInfo[] = [];

  if (existsSync(timelinePath)) {
    const raw = JSON.parse(readFileSync(timelinePath, "utf-8"));
    hmItems = raw.hm_items || [];
    meetings = raw.meetings || [];
  }

  // Đọc tất cả BOD JSON files để lấy directives
  const bodDir = join(DATA_DIR, "bod");
  const directivesByMeeting: Record<string, BODDirectiveInfo[]> = {};

  if (existsSync(bodDir)) {
    const bodFiles = readdirSync(bodDir).filter(
      (f) => f.startsWith("BOD_") && f.endsWith(".json")
    );

    for (const file of bodFiles) {
      const bod = JSON.parse(readFileSync(join(bodDir, file), "utf-8"));
      directivesByMeeting[bod.meeting_id] = (bod.directives || []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (d: any) => ({
          local_id: d.local_id,
          title: d.title,
          nhom: d.nhom,
          loai: d.loai,
          t1_dau_moi: d.t1_dau_moi,
          t4_deadline: d.t4_deadline,
          hm50_match: d.hm50_match,
          status: d.status,
        })
      );
    }
  }

  // Đọc hm50_master.json cho full 50 HM list
  const masterPath = join(DATA_DIR, "hm50_master.json");
  let allHM: AllHMItem[] = [];

  if (existsSync(masterPath)) {
    const master = JSON.parse(readFileSync(masterPath, "utf-8"));
    allHM = (master.items || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (h: any) => ({
        tt: h.tt,
        hang_muc: h.hang_muc,
        phan_cl: h.phan_cl,
        status: h.status,
      })
    );
  }

  return { hmItems, meetings, directivesByMeeting, allHM };
}

// ===== BSC DASHBOARD DATA =====

const BSC_CONFIG: {
  key: string;
  label: string;
  sections: string[];
}[] = [
  { key: "financial", label: "Tài chính", sections: ["VI — Chiến lược KD & MKT"] },
  { key: "customer", label: "Khách hàng", sections: ["V — Văn hóa & Con người"] },
  { key: "process", label: "Quy trình nội bộ", sections: ["II — Quản trị kết quả", "IV — Lương 3P & Đầu mối", "VII — Công nghệ & Dữ liệu"] },
  { key: "learning", label: "Học tập & Phát triển", sections: ["I — Tầm nhìn & Triết lý", "III — Tổ chức & Nhân sự", "VIII — Học tập & Tương lai"] },
];

const BSC_LABEL_MAP: Record<string, string> = {
  "Tài chính": "financial",
  "Khách hàng": "customer",
  "Quy trình nội bộ": "process",
  "Học tập & Phát triển": "learning",
};

export async function getBSCDashboardData() {
  // Đọc hm50_progress.json cho BSC data
  // Convention: completion tính từ raw counts (completed/total × 100), không dùng Notion Completion_Rate
  // (tránh BUG-3: Completion_Rate trong Notion là 0-1, dễ nhầm với 0-100)
  const progressPath = join(DATA_DIR, "hm50_progress.json");
  const bscPerspectives: BSCPerspective[] = [];
  let matchSummary = { matched: 0, total: 0 };

  if (existsSync(progressPath)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const progress = JSON.parse(readFileSync(progressPath, "utf-8")) as any;
    matchSummary = {
      matched: progress.summary?.matched || 0,
      total: progress.summary?.total_directives || 0,
    };

    const byBsc = progress.by_bsc || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = progress.items || [];

    for (const cfg of BSC_CONFIG) {
      const bscData = byBsc[cfg.label] || { total_hm: 0, total_directives: 0, completed: 0 };
      const hmItems = items
        .filter((h) => h.bsc_perspective === cfg.label)
        .map((h) => ({
          tt: h.tt,
          title: h.title,
          status: h.status,
          dau_moi: h.dau_moi || "",
          directive_count: h.total || 0,
          progress_pct: h.progress_pct || 0,
        }));

      bscPerspectives.push({
        key: cfg.key,
        label: cfg.label,
        hm_count: bscData.total_hm,
        directive_count: bscData.total_directives,
        completed: bscData.completed,
        completion_pct: bscData.total_directives > 0
          ? Math.round((bscData.completed / bscData.total_directives) * 100)
          : 0,
        sections: cfg.sections,
        hm_items: hmItems,
      });
    }
  } else {
    // Fallback: 4 perspectives trống
    for (const cfg of BSC_CONFIG) {
      bscPerspectives.push({
        key: cfg.key,
        label: cfg.label,
        hm_count: 0,
        directive_count: 0,
        completed: 0,
        completion_pct: 0,
        sections: cfg.sections,
        hm_items: [],
      });
    }
  }

  // Tính directive origins từ BOD JSONs
  const origins: DirectiveOrigins = {
    from_hm50: 0,
    escalation: 0,
    new_initiative: 0,
    total: 0,
    top_escalated: [],
  };

  const bodDir = join(DATA_DIR, "bod");
  if (existsSync(bodDir)) {
    const bodFiles = readdirSync(bodDir).filter(
      (f) => f.startsWith("BOD_") && f.endsWith(".json")
    );

    for (const file of bodFiles) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bod = JSON.parse(readFileSync(join(bodDir, file), "utf-8")) as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const d of (bod.directives || []) as any[]) {
        origins.total++;
        if (d.loai === "leo_thang") origins.escalation++;
        else if (d.loai === "moi") origins.new_initiative++;
        else origins.from_hm50++; // bo_sung = từ HM50 backlog
      }
    }
  }

  // Top escalated HMs từ timeline
  const timelinePath = join(DATA_DIR, "hm50_timeline.json");
  if (existsSync(timelinePath)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const timeline = JSON.parse(readFileSync(timelinePath, "utf-8")) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hmItems: any[] = timeline.hm_items || [];
    origins.top_escalated = hmItems
      .filter((h) => h.total_escalations > 0)
      .sort((a, b) => b.total_escalations - a.total_escalations)
      .slice(0, 5)
      .map((h) => ({
        hm_tt: h.hm_tt,
        title: h.title,
        count: h.total_escalations,
      }));
  }

  return { bscPerspectives, origins, matchSummary };
}
