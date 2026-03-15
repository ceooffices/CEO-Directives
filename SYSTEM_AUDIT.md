# SYSTEM AUDIT
*Cập nhật: 2026-03-16*

## TRẠNG THÁI HỆ THỐNG

### Kiến trúc hiện tại
| Layer | Component | Trạng thái |
| --- | --- | --- |
| **Frontend** | Next.js 16 (`web/`) | 🟢 Chạy, đọc Notion trực tiếp |
| **Data source** | Notion API (raw fetch) | 🟢 HTTP 200 verified |
| **Backend** | Node.js automation/ (6 WF) | 🟡 Cần Sprint 1 fixes |
| **Forms** | Google Forms (WF1/WF4/WF5) | 🟢 Live trên Google |
| **Email tracking** | `web/src/app/track/[token]/` | 🟡 Built, chưa tích hợp vào email templates |
| **AI** | OpenAI (đang dùng) | 🟡 Cần AI Router (Gemini + fallback) |

### Đã dọn archive (2026-03-16)
- `apps-script/` → GAS form creator (1 lần, đã tạo xong)
- `bod_meeting/` → GAS Dashboard cũ (vẫn live trên GAS)
- `dashboard/` → HTML Dashboard cũ
- `core/` → Docs cũ
- `supabase.ts`, `supabase-client.js`, `supabase-schema.sql` → Đã chuyển Notion

### Environment
- `web/.env.local` — Notion credentials cho Next.js
- `automation/.env` — Toàn bộ credentials (Notion, Telegram, Signal, SMTP, GitHub, AI)

## SPRINT HIỆN TẠI: Sprint 1 — Nền tảng

### Gravity (PM/QC)
- [x] S1.1: Cập nhật CLAUDE.md
- [x] S1.2: Cập nhật SYSTEM_AUDIT.md
- [/] S1.3: Cập nhật .env.example
- [ ] S1.7: Viết test cases cho convert module

### ClaudeCode (DEV)
- [ ] S1.4: Seed ChromaDB startup
- [ ] S1.5: Xóa dead code (sams_differ)
- [ ] S1.6: Confirmation cho /chay
