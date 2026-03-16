# Sprint 4 — BSC Strategic Tracking Model
# ĐẦU VIỆC CHO CLAUDECODE

> **Giao bởi:** Gravity (PM/QC)
> **Phê duyệt:** Anh Kha (Director)
> **Ngày:** 2026-03-16
> **Ưu tiên tổng:** S (Phase 1-2), M (Phase 3-4)

---

## TÓM TẮT YÊU CẦU

Nâng cấp hệ thống từ "track chỉ đạo" → "hiểu WHY behind each directive".
Mỗi chỉ đạo cần trả lời: tại sao ra đời? hướng tới mục tiêu chiến lược nào? đang ở giai đoạn LELONGSON-Master nào?

---

## NOTION DATABASE IDs (đã verify)

```
CLARIFICATION = 317ce590-e9e6-8150-a14e-cc16d23334ae   # Chỉ đạo Cần Làm Rõ
HM50          = 308ce590-e9e6-810f-bb3d-cff3a0a3a681   # 50 Chỉ đạo 5T
COMMITMENTS   = 317ce590-e9e6-8100-adf2-f1fdb139e581   # Mục tiêu Cam kết 2026
BOD_MEETINGS  = 317ce590-e9e6-811e-9dbf-d7a4d86b7231   # BOD Meeting DB
```

---

## PHASE 1: NOTION SCHEMA UPGRADE (Ưu tiên S — Làm đầu tiên)

### Task 1.1 — Thêm properties vào `50 Chỉ đạo 5T` (HM50)

Notion API: `PATCH /databases/{HM50}`

Thêm 5 properties mới (KHÔNG xóa/sửa property cũ):

| Property | Type | Options/Spec |
|---|---|---|
| `BSC_Perspective` | select | `Tài chính`, `Khách hàng`, `Quy trình nội bộ`, `Học tập & Phát triển` |
| `Strategic_Goal` | rich_text | Link trực tiếp tới mục tiêu 3333/2222 |
| `Directive_Count` | number | Số chỉ đạo hàng ngày linked vào HM này |
| `Completion_Rate` | number (percent) | % hoàn thành |
| `LELONGSON_Stage` | select | `Chưa gửi`, `Đã gửi đề xuất`, `ChatLong phản hồi`, `Đang nâng cấp`, `Đã duyệt`, `Hoàn thành` |

Verify: chạy `queryAllHM50()` → property mới xuất hiện, data cũ intact.

### Task 1.2 — Thêm properties vào `Chỉ đạo Cần Làm Rõ` (CLARIFICATION)

Thêm 4 properties mới:

| Property | Type | Options/Spec |
|---|---|---|
| `Directive_Type` | select | `Mới phát sinh`, `Leo thang từ HM`, `Bổ sung/điều chỉnh` |
| `HM50_Link` | relation | → database `308ce590-e9e6-810f-bb3d-cff3a0a3a681` |
| `WHY_Context` | rich_text | Lý do chỉ đạo ra đời (từ transcript) |
| `Meeting_Source` | relation | → database `317ce590-e9e6-811e-9dbf-d7a4d86b7231` |

⚠️ `HM50_Link` relation phải hoạt động 2 chiều. Existing records KHÔNG bị ảnh hưởng.

---

## PHASE 2: LINKER UPGRADE (Ưu tiên S — Sau Phase 1)

### Task 2.1 — Upgrade `automation/hm50-linker.js`

Thay đổi chính:
1. Match thành công → **write Notion relation** `HM50_Link` trên Clarification page
2. Sau link → **update** `Directive_Count` và `Completion_Rate` trên HM50 page
3. Directive không match → set `Directive_Type` = `Mới phát sinh`
4. Directive match → set `Directive_Type` = `Leo thang từ HM`

Giữ nguyên:
- Backward: vẫn save `hm50_mapping.json` + `hm50_progress.json`
- `--dry-run` mode
- Log vào `DB.WF_LOGS`

Reference code pattern: xem `updatePage()` trong `lib/notion-client.js`

### Task 2.2 — BSC auto-classify (thêm function vào hm50-linker.js)

Mapping cứng:
```javascript
const PHAN_CL_TO_BSC = {
  'I — Tầm nhìn & Triết lý':        'Học tập & Phát triển',
  'II — Quản trị kết quả':           'Quy trình nội bộ',
  'III — Tổ chức & Nhân sự':         'Học tập & Phát triển',
  'IV — Lương 3P & Đầu mối':        'Quy trình nội bộ',
  'V — Văn hóa & Con người':        'Khách hàng',
  'VI — Chiến lược KD & MKT':       'Tài chính',
  'VII — Công nghệ & Dữ liệu':      'Quy trình nội bộ',
  'VIII — Học tập & Tương lai':      'Học tập & Phát triển',
};
```

Khi chạy linker → auto set `BSC_Perspective` cho mỗi HM50 item.

---

## PHASE 3: TRANSCRIPT PARSER (Ưu tiên M)

### Task 3.1 — Tạo file mới `automation/transcript-parser.js`

Input: file `.md` từ `ban_chep_loi/`
Output: tạo records trong Clarification DB

Flow:
```
node transcript-parser.js --file ban_chep_loi/BOD_16032026.md --meeting-id <notion_page_id>
```

Dùng AI (Gemini API, pattern giống `ai-analyzer.js`):
1. Extract danh sách chỉ đạo từ transcript
2. Parse 5T cho mỗi chỉ đạo
3. Extract WHY context (đoạn transcript gốc)
4. Auto-match tới HM50

Mỗi record tạo ra:
- `Tiêu đề`: tên chỉ đạo
- `T1–T5`: từ context
- `WHY_Context`: đoạn transcript lý do
- `Meeting_Source`: link BOD Meeting record
- `Directive_Type`: auto-classify
- `TINH_TRANG`: `Chờ làm rõ`

### Task 3.2 — Wire vào Telegram bot

File: `automation/telegram-bot.js`

Thêm command `/transcript <meeting_date>`:
1. Tìm file `ban_chep_loi/BOD_DDMMYYYY.md`
2. Chạy transcript-parser
3. Respond: "Đã tạo X chỉ đạo từ BOD DD/MM/YYYY"
4. Error handling friendly

---

## PHASE 4: DASHBOARD BSC DATA (Ưu tiên M)

### Task 4.1 — BSC summary output

Thêm vào `automation/wf6-dashboard-sync.js` hoặc file mới.

Output JSON:
```json
{
  "bsc": {
    "financial": { "hm_count": 0, "directive_count": 0, "completion": 0 },
    "customer": { "hm_count": 0, "directive_count": 0, "completion": 0 },
    "process": { "hm_count": 0, "directive_count": 0, "completion": 0 },
    "learning": { "hm_count": 0, "directive_count": 0, "completion": 0 }
  },
  "lelongson_stages": {
    "chua_gui": 0, "da_gui": 0, "chatlong_phan_hoi": 0,
    "dang_nang_cap": 0, "da_duyet": 0, "hoan_thanh": 0
  }
}
```

Save to `data/bsc_summary.json`. Chạy được từ scheduler.

---

## ENV VARIABLES CẦN THÊM VÀO `.env`

```
NOTION_DB_BOD_MEETINGS=317ce590-e9e6-811e-9dbf-d7a4d86b7231
```

(Các DB khác đã có trong `.env` hiện tại)

---

## GIT COMMIT CONVENTION

```bash
git commit -m "✨ Thêm BSC Perspective mapping — giúp Sếp thấy mỗi chỉ đạo nằm ở góc nhìn chiến lược nào"
git commit -m "🔧 Nâng cấp hm50-linker — từ match JSON thành Notion relation 2 chiều"
git commit -m "✨ Transcript parser — chuyển biên bản họp BOD thành danh sách chỉ đạo 5T"
```

---

## THỨ TỰ LÀM VIỆC

1. ✅ Pull code mới nhất: `git pull`
2. ✅ Đọc CHANGELOG.md
3. Phase 1 → Phase 2 → Phase 3 → Phase 4
4. Mỗi phase xong → commit + push
5. Gravity QC sau mỗi phase

---

## ACCEPTANCE CRITERIA TỔNG

- [ ] Schema mới không phá data cũ
- [ ] Match rate ≥ 58%
- [ ] Relation 2 chiều hoạt động trong Notion UI
- [ ] `Directive_Count` tự update mỗi lần chạy linker
- [ ] 50 HM đều có `BSC_Perspective` sau 1 lần run
- [ ] Transcript parser extract ≥ 80% chỉ đạo từ BOD transcript
- [ ] Mỗi directive có `WHY_Context`
- [ ] BSC JSON output valid
