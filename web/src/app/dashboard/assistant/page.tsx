import { createClient } from '@supabase/supabase-js';
import AssistantClient from './client';

/* ═══════════════════════════════════════════════════
   P1 — BẢNG ĐIỀU KHIỂN BUỔI SÁNG
   Cho ai? → Anh Kha (Trợ lý CEO)
   Server component fetch data → client component render + actions
   ═══════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function AssistantDashboardPage() {
  // Chỉ đạo chờ duyệt (lls_step = 1 hoặc 2)
  const { data: pendingApproval } = await supabase
    .from('directives')
    .select('id, directive_code, t1_dau_moi, t2_nhiem_vu, meeting_source, lls_step')
    .in('lls_step', [1, 2])
    .order('created_at', { ascending: false })
    .limit(10);

  // Chỉ đạo đã gửi nhưng chưa phản hồi > 48h (lls_step = 4, updated > 48h ago)
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: silentDirectives } = await supabase
    .from('directives')
    .select('id, directive_code, t1_dau_moi, t2_nhiem_vu, updated_at, lls_step')
    .eq('lls_step', 4)
    .lt('updated_at', twoDaysAgo)
    .order('updated_at', { ascending: true })
    .limit(10);

  // Hoàn thành gần đây (lls_step = 7 hoặc tinh_trang chứa 'hoan_thanh')
  const { data: completedRecent } = await supabase
    .from('directives')
    .select('id, directive_code, t1_dau_moi, t2_nhiem_vu')
    .eq('tinh_trang', 'hoan_thanh')
    .order('updated_at', { ascending: false })
    .limit(5);

  // HM50 stats
  const { data: hm50All } = await supabase
    .from('hm50')
    .select('hm_number, ten, tinh_trang, directive_count');

  const hmStats = {
    total: hm50All?.length || 0,
    done: hm50All?.filter(h => h.tinh_trang === 'hoan_thanh').length || 0,
    inProgress: hm50All?.filter(h => h.tinh_trang === 'dang_lam').length || 0,
    notStarted: hm50All?.filter(h => h.tinh_trang === 'chua_bat_dau').length || 0,
    blocked: hm50All?.filter(h => h.tinh_trang === 'nghen').length || 0,
  };

  // Tổng directives count
  const { count: totalDirectives } = await supabase
    .from('directives')
    .select('*', { count: 'exact', head: true });

  return (
    <AssistantClient
      pendingApproval={(pendingApproval || []).map(d => ({
        id: d.id,
        code: d.directive_code,
        t2: d.t2_nhiem_vu,
        t1: d.t1_dau_moi,
        meeting: d.meeting_source || '',
      }))}
      silentDirectives={(silentDirectives || []).map(d => ({
        id: d.id,
        code: d.directive_code,
        name: d.t1_dau_moi,
        title: d.t2_nhiem_vu,
        updatedAt: d.updated_at,
        silentHours: Math.round((Date.now() - new Date(d.updated_at).getTime()) / (1000 * 60 * 60)),
      }))}
      completedRecent={(completedRecent || []).map(d => ({
        code: d.directive_code,
        title: d.t2_nhiem_vu,
        dau_moi: d.t1_dau_moi,
      }))}
      hmStats={hmStats}
      totalDirectives={totalDirectives || 0}
    />
  );
}
