# Phase 4 Backend — ClaudeCode Tasks

> Tạo bởi Gravity (17/03/2026) — Đọc kỹ trước khi bắt đầu
> Pull code mới nhất: `git pull` (Gravity đã push commit `f805043`)

---

## CONTEXT

### Supabase Project
- **Project ID:** `fgiszdvchpknmyfscxnp`
- **URL:** `https://fgiszdvchpknmyfscxnp.supabase.co`
- **Env file:** `web/.env.local` (đã có SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY)

### Database Tables (public schema)

| Table | Mô tả |
| --- | --- |
| `directives` | 25 chỉ đạo BOD 16/03 (sẽ thêm BOD 09/03 + 02/03) |
| `hm50` | 50 hạng mục chiến lược + 366 staff |
| `engagement_events` | Tracking events (approve, confirm, remind, escalate, view) |
| `lls_step_history` | Lịch sử bước LELONGSON cho mỗi directive |
| `staff` | 366+ nhân viên Esuhai |
| `documents` | Tài liệu liên quan |
| `document_opens` | Tracking mở tài liệu |

### Directives Schema

```sql
-- directives table
id              uuid DEFAULT gen_random_uuid() PRIMARY KEY
directive_code  text         -- "BOD-16032026-01"
t1_dau_moi      text         -- "Sơn, Tuấn"
t1_email        text         -- email đầu mối
t2_nhiem_vu     text         -- nhiệm vụ chính
t3_chi_tieu     text         -- chỉ tiêu đo lường
t4_thoi_han     date         -- deadline
t5_thanh_vien   text[]       -- team members
loai            text         -- "leo_thang" | "bo_sung" | "moi"
hm50_id         uuid FK→hm50 -- liên kết HM50
meeting_source  text         -- "BOD 16/03/2026"
lls_step        integer DEFAULT 1  -- bước LELONGSON (1-7)
tinh_trang      text DEFAULT 'cho_xu_ly'
                -- "cho_xu_ly" | "cho_duyet" | "da_duyet" | "da_xac_nhan"
                -- "dang_thuc_hien" | "hoan_thanh" | "tu_choi" | "leo_thang_ceo"
approved_by     text
approved_at     timestamptz
confirmed_by    text
confirmed_at    timestamptz
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

### Engagement Events Schema

```sql
-- engagement_events table
id              uuid DEFAULT gen_random_uuid() PRIMARY KEY
directive_id    uuid FK→directives
event_type      text    -- "approve" | "reject" | "confirm" | "clarify"
                        -- "remind" | "escalate" | "view" | "email_sent"
                        -- "auto_remind" | "auto_escalate"  ← CẦN TẠO
recipient_email text
metadata        jsonb   -- { note: "...", reason: "...", ly_do: "..." }
created_at      timestamptz DEFAULT now()
```

### Existing API Routes (web/src/app/api/)

| Route | Method | Chức năng |
| --- | --- | --- |
| `/api/approve` | POST | Duyệt/từ chối chỉ đạo |
| `/api/confirm` | POST | Xác nhận/yêu cầu làm rõ |
| `/api/escalate` | POST | Leo thang CEO |
| `/api/remind` | POST | Gửi nhắc nhở |
| `/api/status` | GET | Trạng thái hệ thống |

### UI đã có (Gravity commit f805043)

Gravity đã tạo 3 component UI sẵn sàng hiển thị data từ backend:

1. **`alert-panel.tsx`** — Board cảnh báo 3 cấp (💀 >14 ngày / 🔥 quá hạn / ⚡ ≤3 ngày)
2. **`engagement-activity.tsx`** — Timeline hỗ trợ 10 event_type bao gồm `auto_remind` và `auto_escalate`
3. **`deadline-countdown.tsx`** — Badge countdown hiển thị trên dashboard + detail

→ Backend chỉ cần ghi đúng event vào `engagement_events`, UI tự hiển thị.

---

## TASK 1: Cron Auto-Escalation Engine

### Yêu cầu

Tạo **Supabase Edge Function** hoặc **cron job** chạy mỗi ngày 1 lần (8h sáng VN):

```
Với mỗi directive chưa hoàn thành (tinh_trang != 'hoan_thanh'):
  - Quá 24h chưa xác nhận (confirmed_at IS NULL, created > 24h)
    → Insert engagement_event: event_type = "auto_remind"
    → Optional: gửi email nhắc nhở qua t1_email

  - Quá 48h chưa xác nhận
    → Insert engagement_event: event_type = "auto_escalate"
    → Update tinh_trang → "leo_thang_ceo" (nếu chưa)

  - Quá 72h không phản hồi
    → Insert engagement_event: event_type = "auto_escalate", metadata: { severity: "critical" }
    → Gửi email cho bod_hosting_email (CEO)
```

### Gợi ý triển khai

```typescript
// Supabase Edge Function: supabase/functions/auto-escalation/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async () => {
  // 1. Query directives chưa hoàn thành
  // 2. Tính số giờ từ created_at đến now
  // 3. Insert engagement_events theo rules
  // 4. Update tinh_trang nếu cần
  // 5. Trả về summary
});
```

### Lưu ý
- Dùng `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS)
- Không ghi duplicate events (check đã có auto_remind/auto_escalate trong 24h chưa)
- Log kết quả vào metadata: `{ checked: 25, reminded: 3, escalated: 1 }`

---

## TASK 2: Enhanced API /api/status

### Yêu cầu

Nâng cấp `/api/status` (GET) trả về JSON đầy đủ cho external tools:

```json
{
  "timestamp": "2026-03-17T11:00:00+07:00",
  "summary": {
    "total_directives": 25,
    "by_status": { "cho_xu_ly": 20, "da_xac_nhan": 3, "hoan_thanh": 2 },
    "overdue_count": 8,
    "critical_count": 2
  },
  "alerts": [
    { "directive_code": "BOD-16032026-01", "days_overdue": 15, "level": "critical" }
  ],
  "recent_events": [
    { "event_type": "auto_remind", "directive_code": "...", "created_at": "..." }
  ],
  "health_score": 65
}
```

---

## TASK 3: Import BOD 09/03 Directives

### File nguồn
`ban_chep_loi/transcipts_BOD_09032026.review.md`

### Format mỗi directive trong file

```
### Chỉ đạo XX: [tên]
- **Code:** BOD-09032026-XX
- **T1 - Đầu mối:** [tên]
- **T2 - Nhiệm vụ:** [nội dung]
- **T3 - Mục tiêu:** [chỉ tiêu]
- **T4 - Thời hạn:** [ngày]
- **T5 - Tiêu chuẩn:** [tiêu chuẩn]
- **Loại:** leo_thang | bo_sung | moi
- **HM50 Match:** HM-XX hoặc N/A
```

### Cách import

1. Parse file markdown → extract 39 directives
2. Map HM50 Match → hm50_id (query bảng hm50 bằng hm_number)
3. Insert vào `directives` với `meeting_source = "BOD 09/03/2026"`
4. Verify: `SELECT count(*) FROM directives` = 25 + 39 = 64

### HM50 ID Mapping (đã có trong Supabase)

```sql
SELECT id, hm_number, ten FROM hm50 ORDER BY hm_number;
-- Dùng hm_number để match "HM-XX" từ file
```

---

## TASK 4: Signal Weekly Briefing (Nếu còn thời gian)

Tạo function gửi tổng hợp hàng tuần qua Signal:
- Gọi `/api/status` lấy data
- Format thành message Signal
- Gửi qua Signal bot API

---

## QUY TẮC

1. **Commit message tiếng Việt** — Mô tả giá trị business, ít kỹ thuật
2. **Test trước commit** — Chạy `cd web && npx next build` verify 0 errors
3. **Không sửa file UI** — Gravity quản lý: `src/app/components/`, `src/app/page.tsx`, `src/app/directive/`
4. **Được sửa:** `src/app/api/`, `src/lib/supabase.ts` (thêm functions mới), `supabase/functions/`
5. **Pull trước khi code:** `git pull` để lấy Phase 4 UI mới nhất
