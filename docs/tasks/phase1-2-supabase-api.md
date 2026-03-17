# TASK BRIEF — ClaudeCode: Phase 1-2 Supabase Schema + API

> **Giao bởi:** Gravity (PM/QC)
> **Ngày:** 17/03/2026
> **Ưu tiên:** P1 — Làm ngay
> **Nguyên tắc:** "Tôi làm điều này cho ai?" — mỗi table, mỗi API phải phục vụ 1 persona cụ thể

---

## BỐI CẢNH

Hệ thống hiện tại dùng Notion làm database, nhưng:
- Notion API rate limit 3 req/s → không đủ cho realtime dashboard
- 3 dự án (CEO Office Hubs, CEO-Directives, Proposal Tracking) dùng 3 DB riêng (SQLite, Notion, Supabase)
- Dashboard đọc từ file JSON cũ → data stale

**Quyết định đã duyệt:** Supabase = source of truth. Notion = giao diện nhập liệu (sync 2 chiều).

---

## PHASE 1 — SUPABASE SCHEMA (2 ngày)

### Yêu cầu: Tạo 5 tables chính

> [!IMPORTANT]
> Schema này dựa trên `lls_tracker.py` (CEO Office Hubs) đã có sẵn — KHÔNG tạo mới mà **chuyển từ SQLite sang Supabase Postgres** + mở rộng.

#### 1. `directives` — Chỉ đạo (cho P1, P2, P3)

```sql
CREATE TABLE directives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directive_code TEXT UNIQUE NOT NULL, -- VD: CD-2026-0316-A
  notion_page_id TEXT, -- sync với Notion
  
  -- 5T
  t1_dau_moi TEXT NOT NULL,
  t1_email TEXT,
  t2_nhiem_vu TEXT NOT NULL,
  t3_chi_tieu TEXT,
  t4_thoi_han DATE,
  t5_thanh_vien TEXT[],
  
  -- Origin
  loai TEXT CHECK (loai IN ('tu_50hm', 'leo_thang', 'bo_sung', 'moi')),
  hm50_id UUID REFERENCES hm50(id),
  meeting_source TEXT, -- VD: "BOD 16/03/2026"
  
  -- LELONGSON Pipeline
  lls_step INTEGER DEFAULT 1 CHECK (lls_step BETWEEN 1 AND 7),
  tinh_trang TEXT DEFAULT 'cho_xu_ly',
  
  -- Routing
  bod_hosting_email TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  confirmed_by TEXT,
  confirmed_at TIMESTAMPTZ,
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2. `lls_step_history` — Lịch sử LELONGSON (cho P1 dashboard timeline)

```sql
CREATE TABLE lls_step_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directive_id UUID REFERENCES directives(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  action TEXT NOT NULL, -- approve, confirm, escalate, remind
  actor TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 3. `engagement_events` — Email tracking (cho P5 AI)

```sql
CREATE TABLE engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directive_id UUID REFERENCES directives(id),
  event_type TEXT CHECK (event_type IN ('email_sent', 'email_opened', 'link_clicked', 'confirmed', 'escalated')),
  recipient_email TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 4. `hm50` — 50 Hạng Mục cam kết 2026 (cho P4 CEO, P1 overview)

```sql
CREATE TABLE hm50 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hm_number INTEGER UNIQUE NOT NULL, -- 1-50
  ten TEXT NOT NULL,
  dau_moi TEXT,
  tinh_trang TEXT CHECK (tinh_trang IN ('hoan_thanh', 'dang_lam', 'chua_bat_dau', 'nghen')),
  muc_tieu TEXT,
  thoi_han TEXT,
  bsc_perspective TEXT CHECK (bsc_perspective IN ('tai_chinh', 'khach_hang', 'quy_trinh', 'hoc_hoi')),
  notion_page_id TEXT,
  directive_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 5. `staff` — Nhân sự (seed từ CSV, cho email resolution)

```sql
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_code TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  department TEXT,
  zone INTEGER,
  title TEXT,
  company TEXT,
  is_manager BOOLEAN DEFAULT FALSE
);
```

### RLS (Row Level Security)

- Enable RLS trên tất cả tables
- Tạo service role key cho backend scripts
- Public read cho dashboard (anon key)

### Seed Data

1. Seed `hm50` từ file `TỔNG_HỢP_50_HẠNG_MỤC_CHỈ_ĐẠO_CAM_KẾT_BẢNG_5T_14_02_2026.md` (đã có trong CEO_Office_Hubs)
2. Seed `staff` từ `staff_directory.csv` (đã có trong CEO_Office_Hubs)
3. Seed `directives` từ Notion Clarifications DB hiện tại

---

## PHASE 2 — API ENDPOINTS (2 ngày)

### Yêu cầu: 4 API routes trong Next.js

> Mỗi API phải ghi câu trả lời: **"API này cho ai bấm?"**

#### 1. `POST /api/approve` — Cho P2 (BOD Hosting) bấm

```
Input: { directive_id, action: 'approve' | 'reject', note? }
Logic:
  1. Update directive.approved_by, directive.approved_at
  2. Nếu approve: chuyển lls_step = 4, ghi step_history
  3. Nếu reject: chuyển lls_step = 1, ghi step_history
  4. Trigger WF2 email cho đầu mối (nếu approve)
Output: { success, directive }
```

#### 2. `POST /api/confirm` — Cho P3 (Đầu mối) bấm

```
Input: { directive_id, updates: { t1?, t2?, t3?, t4?, t5? }, plan_text, action: 'confirm' | 'clarify' }
Logic:
  1. Update 5T fields nếu có changes
  2. Nếu confirm: chuyển lls_step = 5, ghi step_history
  3. Nếu clarify: giữ lls_step = 4, ghi step_history, gửi email ngược P1
Output: { success, directive }
```

#### 3. `POST /api/remind` — Cho P1 (Anh Kha) bấm "Nhắc ngay"

```
Input: { directive_id }
Logic:
  1. Ghi engagement_event (type: 'escalated')
  2. Gửi email nhắc cho đầu mối
  3. CC BOD Hosting
Output: { success, email_sent_to }
```

#### 4. `POST /api/escalate` — Cho P1 (Anh Kha) bấm "Leo thang CEO"

```
Input: { directive_id }
Logic:
  1. Ghi engagement_event + step_history
  2. Gửi Signal message cho Sếp Sơn (qua CEO Office Hubs Signal bot API)
  3. Update directive trạng thái
Output: { success }
```

---

## KIỂM TRA

- [ ] Schema migration chạy thành công trên Supabase
- [ ] Seed data HM50 (50 records) + Staff (từ CSV)
- [ ] 4 API routes trả đúng response
- [ ] RLS đúng: anon key đọc được, service key ghi được
- [ ] Mỗi API ghi step_history khi có action

---

## LƯU Ý

- **KHÔNG sửa file trong phân vùng Gravity** (docs/, templates/, src/signal/signal_config.py)
- Supabase project ID: lấy từ env hoặc hỏi anh Kha
- Notion sync 2 chiều: GIAI ĐOẠN SAU (Phase 4+), Phase 1-2 chỉ cần Supabase → Next.js
- Commit message bằng tiếng Việt, emoji chuẩn
