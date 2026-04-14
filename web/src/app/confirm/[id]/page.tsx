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
      <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <p className="text-slate-500 text-lg">Đang tải...</p>
      </main>
    );
  }

  if (error && !directive) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">{error}</p>
          <p className="text-slate-500 text-sm font-mono">ID: {directiveId}</p>
        </div>
      </main>
    );
  }

  const d = directive!;

  if (status === 'confirmed') {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Đã xác nhận</h1>
          <p className="text-slate-600 text-base">
            Cảm ơn {d.t1_dau_moi}! Chỉ đạo {d.directive_code} đã được xác nhận.
            Trợ lý CEO sẽ theo dõi tiến độ.
          </p>
          {form.plan && (
            <div className="mt-6 p-4 rounded-xl bg-white border border-slate-200 shadow-sm text-left">
              <p className="text-sm font-semibold text-slate-500 mb-1">Kế hoạch đã gửi:</p>
              <p className="text-base text-slate-800">{form.plan}</p>
            </div>
          )}
        </div>
      </main>
    );
  }

  if (status === 'clarify_sent') {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">❓</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Đã gửi câu hỏi</h1>
          <p className="text-slate-600 text-base">
            Câu hỏi của bạn đã gửi cho Trợ lý CEO. Bạn sẽ nhận email trả lời sớm.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 px-4 py-10 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Bổ Sung Chỉ Đạo</h1>
        <p className="text-base text-slate-600 mt-2">
          Dành cho: <span className="text-blue-700 font-bold">{d.t1_dau_moi}</span>
        </p>
        <p className="text-sm text-slate-500 mt-1 font-mono bg-slate-200 inline-block px-2 py-1 rounded">
          {d.directive_code} · {d.meeting_source || 'Chỉ đạo mới'}
        </p>
      </div>

      {/* 5T Editable Fields */}
      <div className="rounded-2xl bg-white shadow-md border border-slate-200 p-6 mb-8 space-y-5">
        <EditableField label="T1 — Đầu mối" value={form.t1} onChange={(v) => updateField('t1', v)} />
        <EditableField label="T2 — Nhiệm vụ" value={form.t2} onChange={(v) => updateField('t2', v)} multiline />
        <EditableField label="T3 — Chỉ tiêu" value={form.t3} onChange={(v) => updateField('t3', v)} />
        <EditableField label="T4 — Thời hạn" value={form.t4} onChange={(v) => updateField('t4', v)} />
        <EditableField label="T5 — Thành viên" value={form.t5} onChange={(v) => updateField('t5', v)} />
      </div>

      {/* Plan textarea */}
      <div className="mb-8">
        <label className="text-base font-bold text-slate-800 block mb-3">
          Thông tin góp ý / Kế hoạch thực hiện:
        </label>
        <textarea
          value={form.plan}
          onChange={(e) => updateField('plan', e.target.value)}
          placeholder="Viết thêm kế hoạch chi tiết hoặc góp ý của bạn..."
          className="w-full p-4 rounded-xl bg-white border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none text-base text-slate-900 placeholder:text-slate-400 resize-none shadow-sm transition-all"
          rows={5}
        />
      </div>

      {/* Clarify form */}
      {status === 'clarify_form' && (
        <div className="mb-8 rounded-xl bg-amber-50 border border-amber-200 p-5 shadow-sm">
          <label className="text-base font-bold text-amber-900 block mb-3">Nội dung cần làm rõ:</label>
          <textarea
            value={clarifyText}
            onChange={(e) => setClarifyText(e.target.value)}
            placeholder="Viết câu hỏi cần Trợ lý/Sếp giải đáp..."
            className="w-full p-4 rounded-xl bg-white border border-amber-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-100 focus:outline-none text-base text-slate-900 placeholder:text-slate-400 resize-none shadow-sm"
            rows={4}
            autoFocus
          />
          <button
            onClick={handleClarify}
            disabled={!clarifyText.trim() || isSubmitting}
            className="mt-4 w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-base transition-colors disabled:opacity-50 shadow"
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi câu hỏi'}
          </button>
        </div>
      )}

      {/* Confirm checkbox */}
      <label className="flex items-start gap-4 mb-8 cursor-pointer group bg-slate-100 p-4 rounded-xl border border-slate-200 hover:border-blue-400 transition-colors">
        <input
          type="checkbox"
          checked={form.confirmed}
          onChange={(e) => updateField('confirmed', e.target.checked)}
          aria-label="Xác nhận cam kết thực hiện đúng thời hạn"
          className="mt-1 w-6 h-6 rounded border-slate-300 bg-white checked:bg-blue-600 focus:ring-blue-500 cursor-pointer"
        />
        <span className="text-base font-medium text-slate-800">
          Tôi xác nhận nội dung chỉ đạo trên là hiển nhiên và cam kết thực hiện theo đúng kế hoạch.
        </span>
      </label>

      {error && <p className="text-red-600 font-semibold text-center mb-4">{error}</p>}

      {/* Actions */}
      {status !== 'clarify_form' && (
        <div className="flex gap-4">
          <button
            onClick={handleConfirm}
            disabled={!form.confirmed || isSubmitting}
            className="flex-2 w-2/3 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Đang xử lý...' : '✅ Xác nhận nhận lệnh'}
          </button>
          <button
            onClick={handleClarify}
            className="flex-1 w-1/3 py-4 rounded-xl border-2 border-amber-500 hover:bg-amber-50 text-amber-700 font-bold text-lg transition-colors"
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
      <div className="bg-slate-50 p-3 -mx-3 rounded-xl border border-blue-200 shadow-sm">
        <label className="text-sm font-semibold text-blue-700 block mb-2">{label}</label>
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setEditing(false)}
            className="w-full p-3 rounded-lg bg-white border-2 border-blue-500 focus:outline-none text-base text-slate-900 resize-none shadow-inner"
            rows={3}
            autoFocus
          />
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setEditing(false)}
            aria-label={label}
            className="w-full p-3 rounded-lg bg-white border-2 border-blue-500 focus:outline-none text-base text-slate-900 shadow-inner"
            autoFocus
          />
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="cursor-pointer group hover:bg-slate-50 -mx-3 px-3 py-2 rounded-xl transition-colors border border-transparent hover:border-slate-200"
    >
      <p className="text-sm font-semibold text-slate-500 mb-1">{label}</p>
      <div className="flex items-start justify-between gap-4">
        <p className="text-base font-medium text-slate-900 leading-relaxed whitespace-pre-wrap">{value || <span className="text-slate-400 italic">(Bấm để nhập nội dung)</span>}</p>
        <div className="mt-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 group-hover:bg-blue-100 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0">
          <svg className="w-3.5 h-3.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18"><path d="M12.687 14.408a3.01 3.01 0 0 1-1.533.821l-3.566.713a3 3 0 0 1-3.53-3.53l.713-3.566a3.01 3.01 0 0 1 .821-1.533L10.905 2H2.167A2.169 2.169 0 0 0 0 4.167v11.666A2.169 2.169 0 0 0 2.167 18h11.666A2.169 2.169 0 0 0 16 15.833V11.1l-3.313 3.308Zm5.53-9.065.546-.546a2.518 2.518 0 0 0 0-3.56 2.576 2.576 0 0 0-3.559 0l-.547.547 3.56 3.56Z"/><path d="M13.243 3.2 7.359 9.081a.5.5 0 0 0-.136.256L6.51 12.9a.5.5 0 0 0 .59.59l3.566-.713a.5.5 0 0 0 .255-.136L16.8 6.757 13.243 3.2Z"/></svg>
        </div>
      </div>
    </div>
  );
}
