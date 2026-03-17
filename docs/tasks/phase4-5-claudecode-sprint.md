# Sprint 4-5 Backend — ClaudeCode Tasks

> Tạo bởi Gravity (17/03/2026 14:20)
> **Pull mới nhất trước khi bắt đầu:** `git pull` (Gravity commit `9c2cd58`)
> **Đọc CLAUDE.md** trước khi code — chứa context, schema, quy tắc phân vùng

---

## HIỆN TRẠNG DỮ LIỆU THỰC TẾ (17/03/2026)

| Metric | Giá trị | Ghi chú |
|--------|---------|---------|
| **Supabase Project** | `fgiszdvchpknmyfscxnp` (Track_URL) | Region: ap-southeast-1 |
| `directives` | **52 rows** | 25 BOD 16/03 + 15 BOD 09/03 + 12 BOD 02/03 |
| `hm50` | **50 rows** | BSC classified, directive_count đã seed |
| `staff` | **366 rows** | Nhân sự Esuhai, có email + department |
| `engagement_events` | **0 rows** | ❌ Bảng trống — chưa có ai dùng |
| `lls_step_history` | **0 rows** | ❌ Bảng trống |
| `t1_email` | **0/52 có email** | ❌ CRITICAL — không gửi được nhắc nhở |
| `t4_thoi_han` | **18/52 có deadline** | 34 chỉ đạo không có deadline → skip cron |
| `bod_hosting_email` | **0/52** | ❌ Chưa ai set |
| `confirmed_at` | **0/52** | Chưa ai confirm |
| `approved_at` | **0/52** | Chưa ai approve |

### Supabase Credentials

```
# Trong automation/.env VÀ web/.env.local
SUPABASE_URL=https://fgiszdvchpknmyfscxnp.supabase.co
# SUPABASE_SERVICE_ROLE_KEY và SUPABASE_ANON_KEY đã có trong cả 2 file .env
```

### Directives Schema (TÓM TẮT)

```sql
directives (
  id uuid PK, directive_code text UNIQUE,
  t1_dau_moi text, t1_email text,
  t2_nhiem_vu text, t3_chi_tieu text,
  t4_thoi_han date, t5_thanh_vien text[],
  loai text CHECK ('tu_50hm','leo_thang','bo_sung','moi'),
  hm50_id uuid FK→hm50,
  meeting_source text,           -- "BOD 16/03/2026" | "BOD 09/03/2026" | "BOD 02/03/2026"
  lls_step integer DEFAULT 1,    -- LELONGSON 1-7
  tinh_trang text DEFAULT 'cho_xu_ly',
  bod_hosting_email text,
  approved_by text, approved_at timestamptz,
  confirmed_by text, confirmed_at timestamptz
)

engagement_events (
  id uuid PK, directive_id uuid FK→directives,
  event_type text CHECK ('email_sent','email_opened','link_clicked',
    'confirmed','escalated','approve','reject','clarify',
    'remind','view','auto_remind','auto_escalate'),
  recipient_email text, metadata jsonb, created_at timestamptz
)

staff (
  id uuid PK, staff_code text UNIQUE,
  name text, email text, department text,
  zone integer, title text, company text,
  location text, is_manager boolean DEFAULT false
)
```

### Existing API Routes (`web/src/app/api/`)

| Route | Method | Chức năng | Status |
|-------|--------|-----------|--------|
| `/api/approve` | POST | Duyệt/từ chối | ✅ Done |
| `/api/confirm` | POST | Xác nhận 5T | ✅ Done |
| `/api/escalate` | POST | Leo thang CEO | ✅ Done |
| `/api/remind` | POST | Nhắc nhở manual | ✅ Done |
| `/api/status` | GET | Trạng thái hệ thống | ✅ Done (basic) |

### Existing UI Components (KHÔNG ĐƯỢC SỬA)

```
web/src/app/components/alert-panel.tsx      ← 3 cấp cảnh báo (💀🔥⚡)
web/src/app/components/engagement-activity.tsx ← Timeline events (hỗ trợ auto_remind, auto_escalate)
web/src/app/components/deadline-countdown.tsx  ← Badge countdown
web/src/app/components/bsc-scorecard.tsx
web/src/app/components/lelongson-pipeline.tsx
web/src/app/components/bod-timeline.tsx
web/src/app/components/hm50-heatmap.tsx
web/src/app/dashboard/assistant/             ← Persona page Trợ lý CEO
web/src/app/approve/[id]/                    ← Persona page BOD Hosting
web/src/app/confirm/[id]/                    ← Persona page Đầu mối
```

---

## TASK 0: Seed Email Data (PREREQUISITE — LÀM ĐẦU TIÊN)

**Vấn đề**: 0/52 chỉ đạo có `t1_email` → cron chạy không gửi được email cho ai.

### A. Map `t1_email` từ bảng `staff`

Gravity đã tạo sẵn function `resolveStaffEmails()` trong `web/src/lib/supabase.ts`.
Logic tra cứu 3 tầng:

1. **Alias table** — "Thầy Nam" → "Lê Long Sơn", "Cô Nhiên" → "Trần Thị Nhiên"
2. **ILIKE match** — tìm trong 366 nhân viên bảng `staff`
3. **Department fallback** — nếu t1_dau_moi là tên bộ phận → lấy email trưởng bộ phận (`is_manager = true`)

**Yêu cầu**: Tạo script `automation/seed-emails.js` chạy 1 lần:

```
1. Query: SELECT id, t1_dau_moi FROM directives WHERE t1_email IS NULL
2. Với mỗi directive:
   a. Tách t1_dau_moi thành array (có thể "Dũng, Hiếu" → ["Dũng", "Hiếu"])
   b. Với mỗi tên, tra cứu staff:
      - Thử ILIKE '%tên%' trên staff.name
      - Nếu nhiều kết quả, ưu tiên is_manager = true
      - Nếu vẫn không tìm thấy, thử alias table
   c. Lấy email đầu tiên tìm được → UPDATE directives SET t1_email = ?
3. Log kết quả: { total: 52, mapped: X, failed: Y, details: [...] }
```

**Alias table** (hardcode trong script):

```javascript
const ALIASES = {
  'Thầy': 'Lê Long Sơn',
  'Sếp': 'Lê Long Sơn',
  'TGĐ': 'Lê Long Sơn',
  'Sếp Tuấn': 'Lê Anh Tuấn',
  'Tuấn': 'Lê Anh Tuấn',
  'Cô Nhiên': 'Trần Thị Nhiên',
  'Thầy Nam': 'Võ Nam',
  'Dũng': 'Đặng Tiến Dũng',
  'Hiếu': 'Bùi Thị Thanh Hiếu',
  'Lan Vy': 'Nguyễn Ngọc Lan Vy',
  'Ngọc Hân': 'Nguyễn Ngọc Hân',
  'Như Trang': 'Nguyễn Như Trang',
  'Anh Minh': 'Trần Anh Minh',
  'Đối ngoại': 'Ban Đối Ngoại',    // → department lookup
  'MSA': 'MSA',                      // → department lookup
  'ONETEAM': 'ONETEAM',             // → department lookup
  'KAIZEN': 'KAIZEN',               // → department lookup
};
```

### B. Set `bod_hosting_email`

**Business Rule Quan Trọng:**

| Cuộc họp | Chủ trì | Email |
|----------|---------|-------|
| BOD 16/03/2026 | Lê Anh Tuấn (PTGĐốc) | Tra trong staff table |
| BOD 09/03/2026 | Lê Anh Tuấn (PTGĐốc) | Tra trong staff table |
| BOD 02/03/2026 | Lê Anh Tuấn (PTGĐốc) | Tra trong staff table |

```sql
-- Tìm email Lê Anh Tuấn trong staff table
SELECT email FROM staff WHERE name ILIKE '%Lê Anh Tuấn%' LIMIT 1;

-- Set bod_hosting_email = email tìm được cho tất cả
UPDATE directives SET bod_hosting_email = '<email_found>'
WHERE bod_hosting_email IS NULL;

-- Ngoại lệ: chỉ đạo do TGĐ trực tiếp ra (nếu TGĐ là t1_dau_moi)
-- → bod_hosting_email = email TGĐ (vì TGĐ tự approve luôn)
```

**Output mong đợi**: `t1_email` mapped cho >30/52, `bod_hosting_email` mapped 52/52.

---

## TASK 1: Cron Auto-Escalation Engine

**Yêu cầu**: Supabase Edge Function chạy hàng ngày 1h UTC (= 8h sáng VN).

### Logic ($\important{dùng t4_thoi_han, KHÔNG dùng created_at!}$)

```
Với mỗi directive WHERE:
  - tinh_trang NOT IN ('hoan_thanh', 'tu_choi')
  - t4_thoi_han IS NOT NULL

  days_overdue = CURRENT_DATE - t4_thoi_han

  IF days_overdue >= 1 AND confirmed_at IS NULL:
    → Check dedup: đã có auto_remind trong 24h chưa?
    → Nếu chưa: INSERT engagement_events (auto_remind)
    → Nếu t1_email != NULL: gửi email nhắc nhở

  IF days_overdue >= 3:
    → INSERT engagement_events (auto_escalate, metadata: { severity: 'warning' })
    → UPDATE tinh_trang → 'leo_thang_ceo' (nếu chưa phải)

  IF days_overdue >= 7:
    → INSERT engagement_events (auto_escalate, metadata: { severity: 'critical' })
    → Gửi email cho bod_hosting_email (nếu có)

  IF days_overdue >= 14:
    → INSERT engagement_events (auto_escalate, metadata: { severity: 'lost_control' })
```

### Dedup Rule

Trước khi insert, check:

```sql
SELECT count(*) FROM engagement_events
WHERE directive_id = ? AND event_type = ? AND created_at > NOW() - INTERVAL '24 hours'
```

### Deploy dưới dạng Edge Function

```
supabase/functions/auto-escalation/index.ts
```

Dùng `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS).

### Response trả về

```json
{
  "timestamp": "2026-03-17T08:00:00+07:00",
  "checked": 18, "skipped_no_deadline": 34,
  "auto_remind": 5, "auto_escalate": 2, "lost_control": 1,
  "email_sent": 3, "email_skipped_no_address": 4
}
```

### File tham khảo

Gravity đã viết `automation/auto-escalation.js` (Node.js version) — xem logic để hiểu flow.
Nhưng deploy production nên là **Supabase Edge Function** (Deno) để chạy cron tự động.

---

## TASK 2: Nâng cấp API /api/status

File: `web/src/app/api/status/route.ts` — đã có basic version.

**Thêm:**

1. **`recent_events`** — 10 engagement_events gần nhất (query Supabase)
2. **`health_score`** — tính từ công thức:

```
health = 100
  - (overdue_count * 5)        // mỗi chỉ đạo quá hạn trừ 5
  - (critical_count * 15)      // mỗi chỉ đạo "mất kiểm soát" trừ 15
  + (confirmed_count * 2)      // mỗi chỉ đạo đã xác nhận cộng 2
  clamped to [0, 100]
```

3. **`hm50_hot`** — top 5 HM có directive_count cao nhất:

```sql
SELECT hm_number, ten, directive_count
FROM hm50 ORDER BY directive_count DESC LIMIT 5;
```

4. **CORS headers** — để Signal bot / external tools gọi được

```typescript
return NextResponse.json(data, {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60',
  },
});
```

---

## TASK 3: Dedup Check — Chỉ đạo trùng lặp giữa 3 cuộc BOD

**Vấn đề tiềm ẩn**: Chỉ đạo leo thang lặp lại qua nhiều cuộc họp.
Ví dụ: "Tuyển 17 MS" có thể xuất hiện ở cả BOD 02/03 và 09/03.

**Yêu cầu**: Tạo script `automation/dedup-directives.js`:

```
1. Query tất cả 52 directives
2. Group by hm50_id WHERE hm50_id IS NOT NULL
3. Trong mỗi group, kiểm tra:
   - Nếu cùng hm50_id + cùng loại 'leo_thang' ở meeting khác nhau
     → Đánh dấu directive cũ hơn là "superseded" (metadata)
     → KHÔNG xóa — chỉ tag để dashboard biết hiển thị cái mới nhất
4. Output: report markdown liệt kê các cặp có khả năng trùng
5. Flag: --dry-run (default) / --apply
```

**Không tự động merge** — chỉ tạo report cho Gravity review.

---

## TASK 4: Signal Weekly Briefing (NẾU CÓ THỜI GIAN)

Tạo function gọi `/api/status` → format thành message Signal.

```javascript
// automation/signal-briefing.js
// 1. Fetch GET /api/status (hoặc gọi Supabase trực tiếp)
// 2. Format markdown message:
//    📊 BÁO CÁO TUẦN — CEO Directives
//    ───────────────────────
//    Tổng chỉ đạo: 52
//    ✅ Hoàn thành: 0 | ⏳ Đang xử lý: 52
//    🔥 Quá hạn: 8 | 💀 Mất kiểm soát: 2
//    ───────────────────────
//    TOP 5 HM nóng nhất:
//    1. HM40 — 4 kênh tạo nguồn (4 leo thang)
//    ...
// 3. Gửi qua Signal CLI hoặc HTTP API
```

---

## QUY TẮC BẮT BUỘC

### Phân vùng Code — KHÔNG ĐƯỢC SỬA

```
❌ web/src/app/components/     ← Gravity quản lý
❌ web/src/app/page.tsx        ← Gravity quản lý
❌ web/src/app/directive/      ← Gravity quản lý
❌ web/src/app/dashboard/      ← Gravity quản lý
❌ web/src/app/approve/        ← Gravity quản lý
❌ web/src/app/confirm/        ← Gravity quản lý
❌ templates/                  ← Gravity quản lý
❌ docs/                       ← Gravity quản lý (đọc thôi)
```

### ĐƯỢC SỬA

```
✅ web/src/app/api/            ← API routes
✅ web/src/lib/supabase.ts     ← Thêm functions mới (KHÔNG xóa cái cũ)
✅ automation/                 ← Backend scripts
✅ supabase/functions/         ← Edge Functions
✅ supabase/                   ← Migrations
✅ tests/                      ← Test cases
```

### Git Commit Rules

```
# Format: emoji + Mô tả tiếng Việt (trước/sau, business value)
git commit -m "✨ Seed email 52 chỉ đạo — Trước: 0/52 có email đầu mối. Sau: 38/52 mapped tự động từ 366 nhân sự, hệ thống nhắc nhở email sẵn sàng hoạt động"

# Emoji chuẩn:
# ✨ Feature mới    🐛 Bug fix    📋 Docs    🔧 Config    🧪 Test
```

### Test Trước Commit

```bash
# Build frontend
cd web && npx next build   # PHẢI pass 0 errors

# Test script
node automation/seed-emails.js --dry-run   # Test trước khi apply
```

### Thứ tự thực hiện

```
TASK 0 (seed email)     ← BẮT BUỘC ĐẦU TIÊN
  ↓
TASK 1 (cron engine)    ← Core value — tự động nhắc nhở
  ↓
TASK 2 (api/status)     ← Nâng cấp dashboard API
  ↓
TASK 3 (dedup check)    ← Quality assurance
  ↓
TASK 4 (signal brief)   ← Nice-to-have
```

---

## VERIFY CHECKLIST (Gravity sẽ QC sau)

- [ ] Task 0: `SELECT count(*) FROM directives WHERE t1_email IS NOT NULL` > 30
- [ ] Task 0: `SELECT count(*) FROM directives WHERE bod_hosting_email IS NOT NULL` = 52
- [ ] Task 1: Edge Function deployed, chạy được via curl
- [ ] Task 1: `engagement_events` có records mới sau khi chạy
- [ ] Task 1: Dedup — không tạo duplicate events trong 24h
- [ ] Task 2: `GET /api/status` trả về health_score, recent_events, hm50_hot
- [ ] Task 3: Report file tạo ra liệt kê các cặp trùng lặp
- [ ] Build: `next build` pass 0 errors sau tất cả thay đổi
- [ ] Git: Tất cả commit messages tiếng Việt, có emoji đúng quy ước
