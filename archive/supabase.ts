/**
 * Supabase client for CEO Directives Dashboard
 * Tham khảo kiến trúc Track_URL/src/lib/supabase.ts
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const headers = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

// ===== TYPES =====

export interface Directive {
  id: string;
  notion_page_id: string | null;
  title: string;
  status: string;
  dau_moi: string;
  nhiem_vu: string;
  deadline: string | null;
  hm50_ref: string | null;
  section: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailOpen {
  id: string;
  directive_id: string | null;
  recipient: string;
  ip_address: string;
  user_agent: string;
  is_bot: boolean;
  opened_at: string;
}

// ===== DIRECTIVES =====

export async function getDirectives(): Promise<Directive[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/directives?select=*&order=created_at.desc`,
    { headers, next: { revalidate: 0 } }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function getDirective(id: string): Promise<Directive | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/directives?id=eq.${encodeURIComponent(id)}&select=*`,
    { headers, next: { revalidate: 0 } }
  );
  if (!res.ok) return null;
  const rows: Directive[] = await res.json();
  return rows[0] ?? null;
}

export async function getDirectivesByStatus(status: string): Promise<Directive[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/directives?status=eq.${encodeURIComponent(status)}&select=*&order=deadline.asc`,
    { headers, next: { revalidate: 0 } }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function getOverdueDirectives(): Promise<Directive[]> {
  const today = new Date().toISOString().split("T")[0];
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/directives?deadline=lt.${today}&status=neq.Hoàn thành&select=*&order=deadline.asc`,
    { headers, next: { revalidate: 0 } }
  );
  if (!res.ok) return [];
  return res.json();
}

// ===== EMAIL TRACKING =====

export async function getEmailOpens(directiveId: string): Promise<EmailOpen[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/email_opens?directive_id=eq.${encodeURIComponent(directiveId)}&select=*&order=opened_at.desc`,
    { headers, next: { revalidate: 0 } }
  );
  if (!res.ok) return [];
  return res.json();
}

export function logEmailOpen(
  directiveId: string | null,
  recipient: string,
  ip: string,
  userAgent: string,
  isBot: boolean
) {
  fetch(`${SUPABASE_URL}/rest/v1/email_opens`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      directive_id: directiveId,
      recipient,
      ip_address: ip,
      user_agent: userAgent,
      is_bot: isBot,
    }),
  }).catch((err) => console.error("Email open log error:", err));
}

// ===== STATS & AGGREGATION =====

export async function getDashboardStats() {
  const directives = await getDirectives();
  const now = new Date();

  const stats = {
    total: directives.length,
    pending: 0,
    confirmed: 0,
    active: 0,
    completed: 0,
    overdue: 0,
  };

  const byDauMoi: Record<string, { total: number; overdue: number; completed: number }> = {};
  const bySection: Record<string, { total: number; completed: number }> = {};

  for (const d of directives) {
    // Count by status
    if (d.status === "Chờ làm rõ" || d.status === "Chờ xác nhận") stats.pending++;
    else if (d.status === "Đã xác nhận 5T") stats.confirmed++;
    else if (d.status === "Đang thực hiện") stats.active++;
    else if (d.status === "Hoàn thành") stats.completed++;

    // Check overdue
    const isOverdue =
      d.deadline &&
      new Date(d.deadline) < now &&
      d.status !== "Hoàn thành";
    if (isOverdue) stats.overdue++;

    // Group by đầu mối
    const dm = d.dau_moi || "Không rõ";
    if (!byDauMoi[dm]) byDauMoi[dm] = { total: 0, overdue: 0, completed: 0 };
    byDauMoi[dm].total++;
    if (isOverdue) byDauMoi[dm].overdue++;
    if (d.status === "Hoàn thành") byDauMoi[dm].completed++;

    // Group by section (HM50)
    const sec = d.section || "Ngoài kế hoạch";
    if (!bySection[sec]) bySection[sec] = { total: 0, completed: 0 };
    bySection[sec].total++;
    if (d.status === "Hoàn thành") bySection[sec].completed++;
  }

  return { stats, byDauMoi, bySection, directives };
}
