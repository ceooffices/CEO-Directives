# CEO Directive Automation — ClaudeCode Context

> Cập nhật: 2026-03-16
> Phiên bản: v2.0 — Sau dọn archive + chuyển Notion

## Tổng quan dự án
Hệ thống tự động hóa quản lý chỉ đạo CEO cho EsuhaiGroup (Giáo dục & Nhân lực Việt-Nhật).
- **Frontend:** Next.js 16 (Turbopack) dashboard → `web/`
- **Data source:** Notion API trực tiếp (raw fetch, cache 60s)
- **Backend:** Node.js automation scripts → `automation/`
- **Forms:** Google Forms (WF1/WF4/WF5) — live trên Google, IDs hardcode trong `email-templates.js`
- **AI:** Gemini 2.5 Pro (primary) + OpenAI (fallback) → cần build AI Router
- **Ngôn ngữ:** Node.js, tiếng Việt có dấu

## Cấu trúc thư mục

```
CEO-Directives/
├── automation/               # ⚙️ CLAUDECODE ZONE — Backend logic
│   ├── telegram-bot.js       # Telegram Bot
│   ├── openclaw-bridge.js    # HTTP bridge (port 3100)
│   ├── scheduler.js          # Cron scheduler
│   ├── ai-analyzer.js        # AI analysis (cần AI Router)
│   ├── report-generator.js   # Report generation
│   ├── wf1-approval.js       # Email duyệt chỉ đạo
│   ├── wf2-*.js              # Notify + form processor
│   ├── wf3-*.js              # Status detection
│   ├── wf4-*.js              # Escalation + form processor
│   ├── wf5-*.js              # Reminders + form processor
│   ├── wf6-dashboard-sync.js # Dashboard sync
│   ├── hm50-linker.js        # Match chỉ đạo → 50 HM
│   ├── parse_kpi_sheet.js    # KPI parser
│   ├── import-*.js           # Data imports
│   └── lib/                  # Shared modules
│       ├── notion-client.js  # Notion API client
│       ├── email-sender.js   # SMTP sender
│       ├── email-templates.js # Email HTML + Google Form prefill URLs
│       └── logger.js         # Logging utility
├── web/                      # 🎨 GRAVITY ZONE — Next.js Dashboard
│   ├── src/app/page.tsx      # Dashboard chính (5 sections)
│   ├── src/app/track/[token]/route.ts  # Email tracking pixel endpoint
│   ├── src/app/api/status/   # API health check
│   ├── src/app/components/   # stat-card, traffic-light, directive-table, copy-button
│   ├── src/lib/notion.ts     # Notion API client (raw fetch, cache 60s)
│   └── .env.local            # Notion credentials ONLY
├── data/                     # JSON data layer
├── archive/                  # 📦 Files lỗi thời (GAS, Supabase, old dashboards)
├── ban_chep_loi/             # Transcripts cuộc họp BOD
├── CONTENT_BIBLE_AIGENT.md   # ⭐ ĐỌC TRƯỚC KHI CODE — Quy tắc content
├── notion_properties_lock.md # Properties KHÔNG ĐƯỢC đổi tên
└── .env.example → .env       # Environment config (automation/)
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

## Google Forms — VẪN HOẠT ĐỘNG

Forms live trên Google (không phụ thuộc local code). IDs trong `email-templates.js`:
- **WF1:** Form xác nhận 5T → `FORM_ID`
- **WF4:** Phản hồi leo thang → `FORM_WF4_ID`
- **WF5:** Cập nhật tiến độ → `FORM_WF5_ID`

Response sheets → `wf4-form-processor.js` / `wf5-form-processor.js` poll CSV → update Notion.

## Sprint 1 — Tasks cho ClaudeCode

### 🔴 S1.4: Seed ChromaDB startup
- Seed 14 context files vào ChromaDB khi khởi động
- Đảm bảo bot có đủ context để trả lời

### 🔴 S1.5: Xóa dead code
- Xóa reference `sams_differ` trong codebase
- Dọn code không còn dùng

### 🔴 S1.6: Confirmation cho `/chay`
- File: `automation/telegram-bot.js`
- Thêm inline buttons "☑ Xác nhận chạy" / "✖ Hủy" trước khi gọi bridge
- Pattern: `cmd_confirm_wf1` → user bấm → gọi bridge

### 🟡 Sprint 2 Tasks (sau khi Sprint 1 pass QC)
- **S2.1:** AI Router (Gemini primary + OpenAI fallback) — `ai-analyzer.js`
- **S2.2:** RAG pipeline thay full context injection
- **S2.3:** Rate limit per user — `telegram-bot.js`
- **S2.4:** Error → admin DM (`notifyAdmin(error)` trong catch blocks)
- **S2.5:** Fix report-generator TelegramBot leak (singleton pattern)

## Environment Variables

File `automation/.env` chứa credentials (xem `.env.example`):
```
# Notion
NOTION_API_KEY=ntn_...
NOTION_CLARIFICATIONS_DB=317ce590-...

# Telegram / Signal / SMTP / GitHub / AI
BOT_TOKEN=...
SIGNAL_BOT_NUMBER=...
SMTP_USER=... SMTP_PASS=...
GITHUB_PAT=...
GEMINI_API_KEY=...
OPENAI_API_KEY=...
```

File `web/.env.local` chỉ chứa Notion credentials cho Next.js dashboard.

## Coding Standards
- Comments tiếng Việt có dấu
- Console logs: `[MODULE] icon Message` (e.g. `[BOT] ☑ Command processed`)
- Error messages tuân thủ Content Bible
- Không dùng `console.log` cho user-facing output — log riêng, message riêng
- Test: chạy `node telegram-bot.js --test` để verify

## Phối hợp
- **Gravity** (Antigravity) review tất cả thay đổi trước khi merge
- Commit message: `emoji Mô tả ngắn (Sprint X, task SX.Y)`
- Không sửa `.env` trực tiếp — chỉ sửa `.env.example` và thông báo
- Không sửa file trong `web/` (Gravity zone) trừ khi được duyệt
