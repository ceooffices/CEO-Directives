'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

/* ═══════════════════════════════════════════════════
   P3 — BỔ SUNG CHỈ ĐẠO (ĐẦU MỐI)
   Cho ai? → 20+ đầu mối (Satomura, Dũng MSA, Lan Vy...)
   Lúc nào? → Khi nhận email WF2 sau BOD duyệt
   Biết gì trong 10s? → 5T đã prefill sẵn, chỉ cần bổ sung
   Bấm gì? → Xác nhận hoặc Cần làm rõ
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
}

export default function ConfirmPage() {
  const params = useParams();
  const directiveId = params.id as string;

  const [directive, setDirective] = useState<DirectiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    t1: '', t2: '', t3: '', t4: '', t5: '',
    plan: '',
    confirmed: false,
  });
  const [clarifyText, setClarifyText] = useState('');
  const [status, setStatus] = useState<'idle' | 'confirmed' | 'clarify_form' | 'clarify_sent'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch directive từ Supabase
  useEffect(() => {
    async function load() {
      const { data, error: fetchErr } = await supabase
        .from('directives')
        .select('id, directive_code, t1_dau_moi, t2_nhiem_vu, t3_chi_tieu, t4_thoi_han, t5_thanh_vien, meeting_source')
        .eq('id', directiveId)
        .single();

      if (fetchErr || !data) {
        setError('Không tìm thấy chỉ đạo');
      } else {
        const d = data as DirectiveData;
        setDirective(d);
        setForm({
          t1: d.t1_dau_moi,
          t2: d.t2_nhiem_vu,
          t3: d.t3_chi_tieu || '',
          t4: d.t4_thoi_han || '',
          t5: d.t5_thanh_vien?.join(', ') || '',
          plan: '',
          confirmed: false,
        });
      }
      setLoading(false);
    }
    load();
  }, [directiveId]);

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleConfirm() {
    if (!form.confirmed) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directive_id: directiveId,
          action: 'confirm',
          updates: {
            t1_dau_moi: form.t1,
            t2_nhiem_vu: form.t2,
            t3_chi_tieu: form.t3 || undefined,
            t4_thoi_han: form.t4 || undefined,
          },
          plan_text: form.plan || undefined,
          actor: directive?.t1_dau_moi,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setStatus('confirmed');
      } else {
        setError(result.error || 'Lỗi không xác định');
      }
    } catch {
      setError('Lỗi kết nối server');
    }
    setIsSubmitting(false);
  }

  async function handleClarify() {
    if (status === 'idle') {
      setStatus('clarify_form');
      return;
    }
    if (!clarifyText.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directive_id: directiveId,
          action: 'clarify',
          plan_text: clarifyText,
          actor: directive?.t1_dau_moi,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setStatus('clarify_sent');
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

  if (status === 'confirmed') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold mb-2">Đã xác nhận</h1>
          <p className="text-zinc-400 text-sm">
            Cảm ơn {d.t1_dau_moi}! Chỉ đạo {d.directive_code} đã được xác nhận.
            Trợ lý CEO sẽ theo dõi tiến độ.
          </p>
          {form.plan && (
            <div className="mt-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-left">
              <p className="text-xs text-zinc-500 mb-1">Kế hoạch đã gửi:</p>
              <p className="text-sm text-zinc-300">{form.plan}</p>
            </div>
          )}
        </div>
      </main>
    );
  }

  if (status === 'clarify_sent') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">❓</div>
          <h1 className="text-xl font-bold mb-2">Đã gửi câu hỏi</h1>
          <p className="text-zinc-400 text-sm">
            Câu hỏi của bạn đã gửi cho Trợ lý CEO. Bạn sẽ nhận email trả lời sớm.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Bổ Sung Chỉ Đạo</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Dành cho: <span className="text-zinc-200 font-medium">{d.t1_dau_moi}</span>
        </p>
        <p className="text-xs text-zinc-500 mt-1 font-mono">
          {d.directive_code} · {d.meeting_source || 'Chỉ đạo mới'}
        </p>
      </div>

      {/* 5T Editable Fields */}
      <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-5 mb-6 space-y-4">
        <EditableField label="T1 — Đầu mối" value={form.t1} onChange={(v) => updateField('t1', v)} />
        <EditableField label="T2 — Nhiệm vụ" value={form.t2} onChange={(v) => updateField('t2', v)} multiline />
        <EditableField label="T3 — Chỉ tiêu" value={form.t3} onChange={(v) => updateField('t3', v)} />
        <EditableField label="T4 — Thời hạn" value={form.t4} onChange={(v) => updateField('t4', v)} />
        <EditableField label="T5 — Thành viên" value={form.t5} onChange={(v) => updateField('t5', v)} />
      </div>

      {/* Plan textarea */}
      <div className="mb-5">
        <label className="text-sm text-zinc-400 block mb-2">
          Bổ sung kế hoạch thực hiện:
        </label>
        <textarea
          value={form.plan}
          onChange={(e) => updateField('plan', e.target.value)}
          placeholder="Viết thêm kế hoạch chi tiết..."
          className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-blue-500 focus:outline-none text-sm text-zinc-200 placeholder:text-zinc-600 resize-none"
          rows={4}
        />
      </div>

      {/* Clarify form */}
      {status === 'clarify_form' && (
        <div className="mb-5 rounded-xl bg-amber-950/20 border border-amber-900/40 p-4">
          <label className="text-sm text-amber-400 block mb-2">Câu hỏi cần làm rõ:</label>
          <textarea
            value={clarifyText}
            onChange={(e) => setClarifyText(e.target.value)}
            placeholder="Viết câu hỏi cần Trợ lý CEO giải đáp..."
            className="w-full p-3 rounded-xl bg-zinc-900 border border-amber-800 focus:border-amber-500 focus:outline-none text-sm text-zinc-200 placeholder:text-zinc-600 resize-none"
            rows={3}
            autoFocus
          />
          <button
            onClick={handleClarify}
            disabled={!clarifyText.trim() || isSubmitting}
            className="mt-3 w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting ? '...' : 'Gửi câu hỏi'}
          </button>
        </div>
      )}

      {/* Confirm checkbox */}
      <label className="flex items-start gap-3 mb-6 cursor-pointer group">
        <input
          type="checkbox"
          checked={form.confirmed}
          onChange={(e) => updateField('confirmed', e.target.checked)}
          aria-label="Xác nhận cam kết thực hiện đúng thời hạn"
          className="mt-0.5 w-5 h-5 rounded border-zinc-600 bg-zinc-800 checked:bg-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">
          Tôi xác nhận nội dung trên là đúng và cam kết thực hiện đúng thời hạn
        </span>
      </label>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* Actions */}
      {status !== 'clarify_form' && (
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={!form.confirmed || isSubmitting}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting ? '...' : '✅ Xác nhận'}
          </button>
          <button
            onClick={handleClarify}
            className="flex-1 py-3 rounded-xl border border-amber-700 hover:border-amber-500 text-amber-400 font-semibold text-sm transition-colors"
          >
            Cần làm rõ
          </button>
        </div>
      )}
    </main>
  );
}

function EditableField({
  label, value, onChange, multiline,
}: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div>
        <label className="text-xs text-zinc-500 block mb-1">{label}</label>
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setEditing(false)}
            className="w-full p-2 rounded-lg bg-zinc-800 border border-blue-600 focus:outline-none text-sm text-zinc-200 resize-none"
            rows={2}
            autoFocus
          />
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setEditing(false)}
            aria-label={label}
            className="w-full p-2 rounded-lg bg-zinc-800 border border-blue-600 focus:outline-none text-sm text-zinc-200"
            autoFocus
          />
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="cursor-pointer group hover:bg-zinc-800/50 -mx-2 px-2 py-1 rounded-lg transition-colors"
    >
      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-200">{value || '(Chưa có)'}</p>
        <span className="text-zinc-600 group-hover:text-blue-400 transition-colors text-xs">✏</span>
      </div>
    </div>
  );
}
