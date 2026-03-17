# Phase 3 — Connect Supabase Data + Import Biên Bản
# ĐẦU VIỆC CHO CLAUDECODE

> **Giao bởi:** Gravity (UI/QC)
> **Phê duyệt:** Anh Kha (Director)
> **Ngày:** 2026-03-17
> **Ưu tiên:** S (Task 1-3), M (Task 4-5)

---

## BỐI CẢNH QUAN TRỌNG

### Đã làm xong (Gravity + ClaudeCode chung):
- ✅ Supabase project `fgiszdvchpknmyfscxnp` (dùng chung project track_url)
- ✅ 5 tables: `hm50`, `directives`, `staff`, `events`, `reminders`
- ✅ 50 HM seeded (BSC classified) + 366 staff seeded
- ✅ **25 chỉ đạo BOD 16/03** đã import vào `directives` table
- ✅ `web/src/lib/supabase.ts` — 4 functions đọc data thật từ Supabase
- ✅ `web/src/app/page.tsx` — Dashboard **đã bỏ Notion**, 100% Supabase
- ✅ 4 API routes: approve, confirm, remind, escalate

### Không dùng nữa (anh Kha chỉ đạo):
- ❌ **Data Notion = rác** — KHÔNG đọc từ Notion nữa
- ❌ JSON files trong `data/` — thay bằng Supabase queries
- ❌ Sprint 4 Notion schema upgrade (`docs/tasks/sprint4-bsc-tracking.md`) — đã outdated

### Source of truth:
- **Biên bản họp BOD** → file trong `ban_chep_loi/`
- **Supabase** = database duy nhất

---

## ENV VARIABLES (đã có trong `web/.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://fgiszdvchpknmyfscxnp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...(anon)
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...(service_role)
```

Automation `.env` cũng cần set tương tự nếu chưa có.

---

## TASK 1: Import biên bản BOD 09/03/2026 (Ưu tiên S)

### Mô tả
File `ban_chep_loi/transcipts_BOD_09032026.md` chứa transcript cuộc họp BOD ngày 09/03.
Cần extract chỉ đạo ra format 5T rồi insert vào Supabase `directives` table.

### Quy trình
1. Đọc file transcript → extract danh sách chỉ đạo (dùng AI nếu cần)
2. Parse 5T cho mỗi chỉ đạo: T1 đầu mối, T2 nhiệm vụ, T3 chỉ tiêu, T4 thời hạn, T5 thành viên
3. Phân loại `loai`: `leo_thang` / `bo_sung` / `moi`
4. Match với HM50 → lấy `hm50_id`
5. Insert vào `directives` (directive_code format: `CD-2026-0309-XX`)
6. Update `hm50.directive_count`

### Tham khảo format
Xem `ban_chep_loi/BOD_16032026.review.md` — đây là mẫu chuẩn Gravity đã dùng để import 25 chỉ đạo đầu tiên.

### Schema `directives` table

```sql
directive_code  TEXT UNIQUE      -- CD-2026-0309-01
t1_dau_moi      TEXT NOT NULL    -- Tên đầu mối
t1_email        TEXT             -- Email (optional)
t2_nhiem_vu     TEXT NOT NULL    -- Mô tả nhiệm vụ
t3_chi_tieu     TEXT             -- Chỉ tiêu định lượng
t4_thoi_han     DATE             -- Deadline
t5_thanh_vien   TEXT[]           -- Thành viên hỗ trợ
loai            TEXT             -- leo_thang / bo_sung / moi
hm50_id         UUID FK          -- Link tới hm50.id
meeting_source  TEXT             -- 'BOD 09/03/2026'
lls_step        INT DEFAULT 1    -- Bước LELONGSON (1-7)
tinh_trang      TEXT DEFAULT 'cho_xu_ly'
```

### Output
- Số lượng chỉ đạo inserted
- Breakdown: leo_thang / bo_sung / moi
- HM50 directive_count updated

---

## TASK 2: Import biên bản BOD 02/03/2026 (Ưu tiên S)

Tương tự Task 1, nhưng file có thể trên NotebookLM hoặc chưa có trong repo.
- Nếu file chưa có → báo Gravity/anh Kha để lấy file
- Directive code format: `CD-2026-0302-XX`
- meeting_source = `BOD 02/03/2026`

---

## TASK 3: Tạo transcript-parser tự động (Ưu tiên S)

### Mô tả
Script Node.js chạy quy trình: đọc transcript → extract 5T → insert Supabase.
Để từ nay mỗi cuộc họp BOD mới chỉ cần chạy 1 lệnh là xong.

### File: `automation/transcript-parser.js`

```
node transcript-parser.js --file ban_chep_loi/BOD_16032026.md --meeting-date 2026-03-16
```

### Flow
1. Đọc file markdown transcript
2. Dùng **Gemini 2.5 Pro** API:
   - System prompt: "Extract danh sách chỉ đạo CEO theo format 5T"
   - Output JSON: array of `{ t1, t2, t3, t4, t5, loai, hm_number_match }`
3. Match `hm_number` → `hm50.id` (query Supabase)
4. Generate `directive_code`
5. Insert Supabase
6. Update `hm50.directive_count`

### Acceptance Criteria
- Extract ≥ 80% chỉ đạo từ transcript
- Mỗi chỉ đạo có T1 + T2 (T3-T5 optional)
- `--dry-run` mode (preview, không insert)
- Log rõ ràng: "Tìm thấy X chỉ đạo, Y matched HM50"

---

## TASK 4: Directive detail page — Server-side data (Ưu tiên M)

### Mô tả
File `web/src/app/directive/[id]/page.tsx` đang gọi Notion API.
Chuyển sang đọc từ Supabase.

### Thay đổi
- Import: `getServiceClient()` từ `@/lib/supabase`
- Query: `directives` JOIN `hm50` WHERE `directives.id = params.id`
- Giữ nguyên UI layout — chỉ đổi data source

### Phân vùng
- ClaudeCode: viết function `getDirectiveById(id)` trong `supabase.ts`
- Gravity: review + QC UI

---

## TASK 5: CLAUDE.md cập nhật (Ưu tiên M)

File `CLAUDE.md` hiện tại vẫn ghi "Notion API trực tiếp" — cần cập nhật:
- Data source: Supabase (không phải Notion)
- `web/.env.local`: thêm Supabase keys
- `src/lib/supabase.ts` thay `src/lib/notion.ts` cho dashboard
- Remove mention JSON files trong `data/` (deprecated)

---

## THỨ TỰ LÀM VIỆC

1. `git pull` — lấy code mới nhất (Gravity vừa sửa `page.tsx`, `supabase.ts`)
2. Task 1 → Task 2 → Task 3 (sequential, mỗi task commit riêng)
3. Task 4 + Task 5 (parallel được)
4. Mỗi task xong → commit + push
5. **Gravity QC sau mỗi task**

---

## GIT COMMIT CONVENTION

```bash
git commit -m "✨ Import 15 chỉ đạo BOD 09/03 — giúp Sếp theo dõi xuyên suốt 3 cuộc họp gần nhất"
git commit -m "✨ Transcript parser tự động — mỗi cuộc họp mới chỉ cần 1 lệnh để import chỉ đạo"
git commit -m "🔧 Cập nhật CLAUDE.md — phản ánh chuyển đổi từ Notion sang Supabase"
```

---

## LƯU Ý QUAN TRỌNG

> ⚠️ **KHÔNG ĐỌC DATA TỪ NOTION** — tất cả data Notion hiện có = rác (anh Kha xác nhận)
>
> ⚠️ **KHÔNG SỬA file trong phân vùng Gravity** trừ khi được duyệt:
> - `web/src/app/page.tsx`
> - `web/src/app/components/`
> - `web/src/lib/supabase.ts` (thêm function OK, KHÔNG sửa function có sẵn)
>
> ⚠️ **Vietnamese có dấu đầy đủ** — tất cả UI text, commit message, console log

---

## ACCEPTANCE CRITERIA TỔNG

- [ ] BOD 09/03 chỉ đạo imported → `directives` table
- [ ] BOD 02/03 chỉ đạo imported (nếu file có sẵn)
- [ ] `transcript-parser.js` chạy được với `--dry-run`
- [ ] Directive detail page đọc từ Supabase
- [ ] `CLAUDE.md` phản ánh đúng trạng thái Supabase
- [ ] Không regression — dashboard build OK sau mỗi task
