'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

/* ═══════════════════════════════════════════════════
   P2 — DUYỆT CHỈ ĐẠO
   Cho ai? → BOD Hosting (Anh Lê Anh Tuấn)
   Lúc nào? → Khi nhận email WF1, mở link
   Biết gì trong 10s? → 5T đã prefill
   Bấm gì? → Duyệt hoặc Trả lại
   ═══════════════════════════════════════════════════ */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface DirectiveData {
  id: string;
  directive_code: string;
  t1_dau_moi: string;
  t2_nhiem_vu: string;
  t3_chi_tieu: string | null;
  t4_thoi_han: string | null;
  t5_thanh_vien: string[] | null;
  meeting_source: string | null;
  lls_step: number;
}

export default function ApprovePage() {
  const params = useParams();
  const directiveId = params.id as string;

  const [directive, setDirective] = useState<DirectiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'approved' | 'rejected'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch directive từ Supabase
  useEffect(() => {
    async function load() {
      const { data, error: fetchErr } = await supabase
        .from('directives')
        .select('id, directive_code, t1_dau_moi, t2_nhiem_vu, t3_chi_tieu, t4_thoi_han, t5_thanh_vien, meeting_source, lls_step')
        .eq('id', directiveId)
        .single();

      if (fetchErr || !data) {
        setError('Không tìm thấy chỉ đạo');
      } else {
        setDirective(data as DirectiveData);
      }
      setLoading(false);
    }
    load();
  }, [directiveId]);

  async function handleAction(action: 'approve' | 'reject') {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directive_id: directiveId,
          action,
          note: note || undefined,
          actor: 'BOD Hosting',
        }),
      });
      const result = await res.json();
      if (result.success) {
        setStatus(action === 'approve' ? 'approved' : 'rejected');
      } else {
        setError(result.error || 'Lỗi không xác định');
      }
    } catch {
      setError('Lỗi kết nối server');
    }
    setIsSubmitting(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400">Đang tải...</p>
      </main>
    );
  }

  if (error && !directive) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-400 mb-2">{error}</p>
          <p className="text-zinc-500 text-sm font-mono">ID: {directiveId}</p>
        </div>
      </main>
    );
  }

  const d = directive!;

  if (status !== 'idle') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">{status === 'approved' ? '✅' : '↩'}</div>
          <h1 className="text-xl font-bold mb-2">
            {status === 'approved' ? 'Đã duyệt' : 'Đã trả lại'}
          </h1>
          <p className="text-zinc-400 text-sm">
            {status === 'approved'
              ? `Chỉ đạo ${d.directive_code} đã được duyệt. Email sẽ gửi cho đầu mối ${d.t1_dau_moi}.`
              : `Chỉ đạo ${d.directive_code} đã trả lại. Trợ lý CEO sẽ chỉnh sửa 5T.`}
          </p>
          {note && (
            <div className="mt-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-left">
              <p className="text-xs text-zinc-500 mb-1">Ghi chú của bạn:</p>
              <p className="text-sm text-zinc-300">{note}</p>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-zinc-500 font-mono mb-1">#{d.directive_code}</p>
        <h1 className="text-2xl font-bold tracking-tight">Duyệt Chỉ Đạo</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {d.meeting_source ? `Từ cuộc họp ${d.meeting_source}` : 'Chỉ đạo mới'}
        </p>
      </div>

      {/* 5T Card */}
      <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-5 mb-6">
        <h2 className="text-sm font-semibold text-zinc-400 mb-4 uppercase tracking-wider">
          Thông tin 5T
        </h2>
        <div className="space-y-4">
          <Field label="T1 — Đầu mối" value={d.t1_dau_moi} />
          <Field label="T2 — Nhiệm vụ" value={d.t2_nhiem_vu} />
          <Field label="T3 — Chỉ tiêu" value={d.t3_chi_tieu || '(Chưa có)'} />
          <Field label="T4 — Thời hạn" value={d.t4_thoi_han || '(Chưa có)'} />
          <Field label="T5 — Thành viên" value={d.t5_thanh_vien?.join(', ') || '(Chưa có)'} />
        </div>
      </div>

      {/* Note */}
      <div className="mb-6">
        <label className="text-sm text-zinc-400 block mb-2">
          Ghi chú cho đầu mối (tùy chọn):
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nhập ghi chú hoặc hướng dẫn thêm..."
          className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-blue-500 focus:outline-none text-sm text-zinc-200 placeholder:text-zinc-600 resize-none"
          rows={3}
        />
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => handleAction('approve')}
          disabled={isSubmitting}
          className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
        >
          {isSubmitting ? '...' : '✅ Duyệt'}
        </button>
        <button
          onClick={() => handleAction('reject')}
          disabled={isSubmitting}
          className="flex-1 py-3 rounded-xl border border-zinc-600 hover:border-zinc-400 text-zinc-300 font-semibold text-sm transition-colors disabled:opacity-50"
        >
          {isSubmitting ? '...' : '↩ Trả lại'}
        </button>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
      <p className="text-sm text-zinc-200">{value}</p>
    </div>
  );
}
