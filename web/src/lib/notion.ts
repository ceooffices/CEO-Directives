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

  return { stats, byDauMoi, bySection, directives };
}
