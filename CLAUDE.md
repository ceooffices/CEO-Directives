# CEO Directive Automation — ClaudeCode Context

> Cập nhật: 2026-03-18
> Phiên bản: v3.1 — Supabase migration + BOD Meeting GAS restored

## Tổng quan dự án
Hệ thống tự động hóa quản lý chỉ đạo CEO cho EsuhaiGroup (Giáo dục & Nhân lực Việt-Nhật).
- **Frontend:** Next.js 16 (Turbopack) dashboard → `web/`
- **BOD Meeting:** Google Apps Script dashboard → `bod_meeting/` (thu đăng ký & quản lý BOD)
- **Database:** Supabase PostgreSQL (source of truth cho web/)
- **Backend:** Node.js automation scripts → `automation/`
- **AI:** Gemini 2.5 Pro (primary) + OpenAI (fallback)
- **Ngôn ngữ:** Node.js, tiếng Việt có dấu

## Data Architecture

```
Supabase (Source of Truth)
├── hm50 (50 records) — 50 Hạng Mục chiến lược 2026
├── staff (366 records) — Nhân sự EsuhaiGroup
├── directives — Chỉ đạo CEO (import từ transcript BOD)
├── lls_step_history — Lịch sử LELONGSON per directive
└── engagement_events — Email/action tracking

Notion — DEPRECATED (data = rác, KHÔNG đọc từ Notion)
JSON files trong data/ — DEPRECATED (thay bằng Supabase queries)
```

## Cấu trúc thư mục

```
CEO-Directives/
├── bod_meeting/              # 🔵 GAS: Thu đăng ký & Quản lý BOD Meeting
│   ├── Mã.js                 # Main: Menu, Triggers, Approval
│   ├── v800_server_api.js    # Server API + Dashboard routing
│   ├── v810_admin_api.js     # Admin API
│   ├── v820_email_templates.js # Email HTML song ngữ VN/JP
│   ├── v850_config.js        # CONFIG + loadConfigFromSheet
│   ├── v851_helpers.js       # Helpers, format, date, stats
│   ├── v852_email_router.js  # Email router (N8N/Gmail)
│   ├── v853_schedule.js      # Schedule generation
│   ├── Dashboard.html + modules # Dashboard UI
│   ├── AdminPage.html + modules # Admin UI
│   └── docs/                 # Docs (DEV_RULES, CORE_RULES, etc.)
├── automation/               # ⚙️ CLAUDECODE ZONE — Backend logic
│   ├── transcript-parser.js  # BOD transcript → 5T → Supabase
│   ├── telegram-bot.js       # Telegram Bot
│   ├── ai-analyzer.js        # AI analysis (Gemini/OpenAI)
│   ├── wf1-approval.js       # Email duyệt chỉ đạo
│   ├── wf2-*.js              # Notify + form processor
│   ├── hm50-linker.js        # Match chỉ đạo → 50 HM
│   └── lib/                  # Shared modules
├── supabase/                 # 📦 Schema + Seed scripts
│   ├── migration.sql         # 5 tables + RLS + indexes
│   ├── seed-hm50.js          # Seed 50 HM từ JSON
│   └── seed-staff.js         # Seed 366 staff từ CSV
├── web/                      # 🎨 GRAVITY ZONE — Next.js CEO Strategic Cockpit
│   ├── src/app/page.tsx      # Dashboard chính (4 tabs)
│   ├── src/app/dashboard/assistant/ # P1: Bảng điều khiển buổi sáng
│   ├── src/app/approve/[id]/ # P2: Duyệt chỉ đạo (BOD Hosting)
│   ├── src/app/confirm/[id]/ # P3: Xác nhận đầu mối
│   ├── src/app/directive/[id]/ # Chi tiết chỉ đạo
│   ├── src/app/api/          # 4 API routes
│   ├── src/lib/supabase.ts   # Supabase client
│   └── .env.local            # Supabase credentials
├── ban_chep_loi/             # Transcripts cuộc họp BOD (source of truth)
├── archive/                  # 📦 Files lỗi thời (prototype, old code)
├── CONTENT_BIBLE_AIGENT.md   # ⭐ ĐỌC TRƯỚC KHI CODE — Quy tắc content
└── .env.example → .env       # Environment config (automation/)
```

> ⚠️ **QUAN TRỌNG:** `bod_meeting/` là GAS project ĐANG HOẠT ĐỘNG, KHÔNG phải archive.
> Phục vụ pipeline thu đăng ký báo cáo BOD Meeting. KHÔNG được di chuyển hay xóa.

## Supabase Project

- **URL:** `https://fgiszdvchpknmyfscxnp.supabase.co`
- **Keys:** trong `web/.env.local` + `automation/.env`
- **Tables:** hm50, staff, directives, lls_step_history, engagement_events
- **RLS:** anon = SELECT only, service_role = full CRUD

## API Routes (Phase 2)

| Route | Persona | Mô tả |
|---|---|---|
| `POST /api/approve` | P2 (BOD Hosting) | Duyệt/từ chối → update lls_step |
| `POST /api/confirm` | P3 (Đầu mối) | Xác nhận 5T → update lls_step |
| `POST /api/remind` | P1 (Trợ lý CEO) | Nhắc đầu mối → ghi event |
| `POST /api/escalate` | P1 (Trợ lý CEO) | Leo thang CEO → ghi event |

## Import Transcript

```bash
# Dry-run (preview, không insert)
cd automation
node transcript-parser.js --file ../ban_chep_loi/transcipts_BOD_09032026.md --meeting-date 2026-03-09 --dry-run

# Live (insert vào Supabase)
node transcript-parser.js --file ../ban_chep_loi/transcipts_BOD_09032026.md --meeting-date 2026-03-09
```

## ⭐ Content Bible — BẮT BUỘC TUÂN THỦ

Đọc `CONTENT_BIBLE_AIGENT.md` trước khi sửa bất kỳ message nào.

### Quy tắc quan trọng:
1. **Xưng hô:** CEO/Manager = "Thầy", Bot = "con". Colleagues = "anh/chị", Bot = "em"
2. **Emoji:** CHỈ dùng 8 icon: ☑ ✖ ▫️ ► 📎 🔗 ⏳ 📌. KHÔNG dùng emoji trang trí
3. **Văn phong:** Cân bằng, không tô hồng, không xem nhẹ
4. **CTA:** Mọi output phải có ít nhất 1 Call to Action
5. **Phản biện:** Phân tích phải có 3 bước: Quan sát → Phản biện → Kết luận

### Từ cấm:
- "hậu quả", "phạt", "lỗi của..." → thay bằng "tác động", "điều chỉnh", "cần cải thiện"
- Không bịa số liệu, không đoán mò

## Environment Variables

File `automation/.env` chứa credentials (xem `.env.example`):
```
# Supabase
SUPABASE_URL=https://fgiszdvchpknmyfscxnp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# AI
GEMINI_API_KEY=...
OPENAI_API_KEY=... (fallback)

# Telegram / Signal / SMTP / GitHub
BOT_TOKEN=...
SIGNAL_BOT_NUMBER=...
SMTP_USER=... SMTP_PASS=...
```

File `web/.env.local` chứa Supabase keys (anon + service_role) + Notion (legacy).

## Coding Standards
- Comments tiếng Việt có dấu
- Console logs: `[MODULE] Message` (e.g. `[TRANSCRIPT] Tìm thấy 15 chỉ đạo`)
- Error messages tuân thủ Content Bible
- Test: `cd web && npm run build` để verify

## Phối hợp
- **Gravity** (Antigravity) review tất cả thay đổi trước khi merge
- Commit message tiếng Việt có dấu
- Không sửa `.env` trực tiếp — chỉ sửa `.env.example` và thông báo
- **KHÔNG sửa file trong phân vùng Gravity** (web/src/app/page.tsx, components/, supabase.ts functions có sẵn) trừ khi được duyệt
- Có thể THÊM function mới vào supabase.ts
