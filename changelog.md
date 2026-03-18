# CHANGELOG — CEO Directives

> Nhật ký thay đổi toàn bộ dự án, cập nhật lần cuối: **18/03/2026**

---

## v5.1 — Tái cấu trúc repo + QC Audit (18/03/2026)

**By:** Antigravity + Anh Kha

- **Khôi phục `bod_meeting/`** — 31 files GAS (HTML, JS, config) từ archive
- **Tổ chức docs** — Move tài liệu vào `bod_meeting/docs/` (DEV_RULES, CORE_RULES, Full_Flows, etc.)
- **QC Audit toàn diện** — 4 critical fixes + 4 warnings resolved
- **Fix `.clasp.json`** — rootDir Mac path → cross-platform `"."`
- **Cập nhật CLAUDE.md, SYSTEM_AUDIT.md, README.md** — thêm `bod_meeting/` vào kiến trúc
- **Xác nhận 2 hạ tầng song song:** GAS (bod_meeting/) + Next.js (web/)
- **Archive `ceo_cockpit/`** → prototype đã thay bởi `web/`

---

## v5.0 — Tái cấu trúc Dashboard + Content Bible (17/03/2026)

**By:** Gravity (Antigravity) + ClaudeCode

- **Dashboard 4 tab:** Tổng quan / Hành động / Chiến lược / Diễn biến
- **Triết lý Advisor:** "Cố Vấn Đồng Hành" — tâm lý học ứng dụng vào UX
- **Content Bible** — CONTENT_BIBLE_AIGENT.md: quy tắc xưng hô, emoji, văn phong
- **README v5.0** — Viết lại toàn bộ, bổ sung 10 bài học tâm lý

---

## v4.0 — Auto-Escalation + Email Seeding (17/03/2026)

**By:** ClaudeCode + Anh Kha

- **52/52 email mapped** (100%) — seed-emails.js
- **Edge Function `auto-escalation` deployed** — Supabase Edge Function ACTIVE
- **Cron job** `0 1 * * *` (8h sáng VN) — pg_cron tự động
- **API /api/status** nâng cấp: health_score, events, hm50_hot, CORS
- **Dedup check** — 14 cặp trùng lặp giữa 3 BOD
- **Signal briefing** script sẵn sàng
- **Phân loại 3 tầng:** cá nhân (39) / nhóm (8) / tổng thể (5)
- **CC list** cho chỉ đạo tổng thể (7 BOD members)
- **Routing rules:** MS → Dũng, Thầy Nam → Huỳnh Phước

---

## v3.5 — BSC Scorecard + HM50 Heatmap (16/03/2026)

**By:** Gravity + ClaudeCode

- **BSC Scorecard** — 8 pillars, directive_count per HM
- **LELONGSON Pipeline** — 7 bước visualization
- **HM50 Heatmap** — 50 hạng mục chiến lược 2026
- **BOD Timeline** — activity log per cuộc họp
- **Import BOD 16/03** — 25 chỉ đạo mới (transcript-parser.js)

---

## v3.0 — CEO Strategic Cockpit (12/03/2026)

**By:** Antigravity + Anh Kha

- **CEO Strategic Cockpit** — Standalone dashboard mới (`dashboard/`)
  - Tab 1 **Bức tranh**: Health score ring + Traffic lights (Xanh/Vàng/Đỏ/Đen) + 8 pillars scorecard
  - Tab 2 **Leo thang**: Escalation pipeline timeline, sorted directives with action suggestions
  - Tab 3 **Chiến lược**: Strategy map — DẪN ĐẾN ĐÂU cho từng pillar + linked BOD directives + HM50
  - Tab 4 **Hành động**: Urgent actions + grouped by status + progress tracking per person
- **Apple-style light theme**: Bỏ emoji → SVG icons, bo tròn corners, backdrop blur topbar
- **PWA support**: Dark glassmorphism premium UI, manifest for mobile install
- **Phase 1 Data Layer**: Migrate Notion → LightData JSON (`data/` — directives, outcomes, people, meetings, status_log)
- Thêm transcript BOD 09/03/2026

---

## v2.5 — Email System Overhaul (07–08/03/2026)

**By:** Antigravity + Anh Kha

### Email Templates (v820)
- **Redesign schedule email**: Timeline cards HTML thay PDF attachment
- **Responsive email**: Mobile font 13px body / 16px header / 18px title, viewport meta
- **Song ngữ VN/JP**: Template bilingual cho tất cả loại email
- Fix font-family syntax (remove single quotes cho GAS)
- Fix banner dùng `table+bgcolor` thay CSS gradient (email client compatibility)

### QC Fixes (8 mục)
- Column 7 mapping trong `sendScheduleEmail`
- Rename `.gs` → `.js` nhất quán
- `loadConfigFromSheet` trong `sendEmail` 
- Fix dd/mm parse (handle 2-part format)
- `sendReminderToMissingDepts` dùng `sendEmail` router
- HTML templates cho `sendApprovalResults`
- `logEmailSend` tracking cho mọi loại email
- `sendViaGmail` retry preserves `htmlBody`

### Dev Process
- Cập nhật `DEV_RULES.md` v1.1
- Fix `.clasp.json` rootDir cho Windows F: drive

---

## v2.0 — BOD Meeting Dashboard Complete (03–06/03/2026)

**By:** Antigravity + Anh Kha

### Dashboard UI (v8.0 → v8.4)
- **v8.0**: Cards wrapper, header uppercase, date-picker, confirm dialogs chi tiết
- **v8.3**: Apple rounded corners, header BTC MEETING BOD, merge approval into table, vertical timeline process
- **v8.4**: Content bible, interactive process checklists, auto-check progress
- Fullscreen dashboard, edit toggle on/off, editable TL/CĐ inputs
- GHI CHÚ BOD column với required validation cho Hoãn/Từ chối

### AdminPage
- AdminPage 4 tab: Cấu hình / Email / Phân quyền / Hệ thống
- Modularize Dashboard.html → 14 module files
- Self-contained AdminPage (không dùng `include()`)
- `doGet` routing `?page=admin`

### Email System
- HTML email templates song ngữ Việt-Nhật (v820)
- Avatar initials, department color tags, summary cards, countdown badge
- Approval result emails: HTML template + CC BTC + anti-duplicate
- Form submit notification email redesign
- 3-level escalation (Xanh → Vàng → Đỏ) cho nhắc nhở đăng ký
- Live dept registration history trong email preview

### Bug Fixes (06/03)
- 6 bugs from test audit (checklist mismatch, missing fields, thuTu input, showStatus typo)
- Remove duplicate `showMsg`
- `escapeHtml` moved to block 1 (root cause of button errors)
- BOD Hosting banner: green dot, loading state, approval deadlines
- Audit deadlines: approval Fri → Sat (VN+JP)

### Deploy & Architecture (05/03)
- `showDashboardDialog` popup trực tiếp (`createHtmlOutputFromFile`)
- Gộp Dashboard thành self-contained file (bypass GAS HTML sanitizer)
- Fix BOM character trong Dashboard.html
- Email chuyển sang Gmail (n8n chưa sẵn sàng), thêm AdminPage vào menu Sheet
- `DEV_RULES.md` — quy tắc kỹ thuật dự án

---

## v1.5 — 5T System (14/01/2026)

**By:** ClaudeK + Anh Kha

- **4T → 5T**: Thêm T5 - Thành viên liên quan
- **Bỏ Tasks** khỏi luồng chính → Track tại Clarifications
- **WF1 v14**: 2-step approval với T5
- **6 databases** active, Tasks chuyển ARCHIVE
- Cập nhật CORE_RULES.md v1.5, PROJECT_INSTRUCTIONS.md v1.3

---

## v1.4 — 2-Step Approval (03/01/2026)

**By:** ClaudeK + Anh Kha

- **WF1 v13**: Quy trình 2 bước phê duyệt
  - Step 1: BOD Chủ trì duyệt
  - Step 2: Đầu mối xác nhận 5T
- Anti-spam logic (LENH_GUI_LOI_NHAC)
- Triggers: 08:00, 13:00, 17:00 + manual webhook

---

## v1.0–v1.3 — Foundation (27/12/2025)

**By:** ClaudeK + Anh Kha

- **v1.0**: Initial commit — Quy tắc 4T, 10 hiệu ứng tâm lý, Ethical Checkpoint
- **v1.1**: Thêm Mục 7 (Quy trình xử lý biên bản), Mục 8 (Việt hóa Notion)
- **v1.2**: Review 6 databases
- **v1.3**: Kiến trúc 7 databases, thêm `notion_id_mapping.json`, Ghi chép cuộc họp

---

## Chi tiết thay đổi Notion (27/12/2025)

### Thêm Database: Ghi chép cuộc họp
- **Collection ID:** `29279870-ebff-8032-ba8c-000b6ca77b45`
- **Vai trò:** NGUỒN ĐẦU VÀO CHÍNH
- **Relations:** Kết quả mong đợi, Chỉ đạo Cần Làm Rõ

### Đổi tên: Sessions → Báo cáo Tổng hợp
- **Database:** `b033bbc3-5903-4142-8626-feafed22502a`
- **Property:** `Loại buổi` → `Loại báo cáo`
- **Options:** Báo cáo Tuần / Tháng / Chuyên sâu / Dự án / CEO / Khác

---

**END OF CHANGELOG**
