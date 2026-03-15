# CEO Directives — Hệ thống Tự động Quản lý Chỉ đạo CEO

> **EsuhaiGroup S2** — Tự động hóa chỉ đạo CEO theo quy tắc 5T, tích hợp AI phân tích

---

## 📋 Tổng quan

Hệ thống end-to-end quản lý chỉ đạo CEO: từ ghi chép cuộc họp → phân tách 5T → email phê duyệt 2 bước → theo dõi tiến độ → AI phân tích rủi ro → Telegram Bot điều khiển.

```
📅 CEO tạo chỉ đạo trên Notion
    ↓
🎯 Auto phân tách 5T (T1-T5)
    ↓
📧 WF1: Email phê duyệt 2 bước (BOD → Đầu mối)
    ↓
⏳ WF2-5: Theo dõi, nhắc nhở, leo thang
    ↓
🤖 Telegram Bot + AI phân tích
    ↓
📊 Dashboard tổng quan
```

### Quy tắc 5T

| T | Thành phần | Ý nghĩa |
|---|---|---|
| T1 | Đầu mối | Ai thực hiện |
| T2 | Nhiệm vụ | Làm gì cụ thể |
| T3 | Tiêu chí | Đo lường kết quả |
| T4 | Thời hạn | Deadline |
| T5 | Tài chính | Ngân sách + chi phí |

---

## 🏗️ Kiến trúc

### Công nghệ

| Layer | Công nghệ |
|---|---|
| Database | **Notion** (6 databases) |
| Automation | **Node.js** (WF1-6, HM50 linker) |
| AI | **OpenAI GPT-4o-mini** (phân tích, hỏi đáp) |
| Bot | **Telegram Bot** (polling, inline keyboards) |
| Dashboard | **HTML/CSS/JS** (local server port 9090) |
| Scheduler | **node-cron** (tự động chạy workflows) |
| Bridge | **HTTP server** (OpenClaw bridge port 3100) |

### 6 Databases (Notion)

| # | Database | Vai trò |
|---|---|---|
| 1 | 📅 Ghi chép cuộc họp | Nguồn đầu vào |
| 2 | 🎯 Kết quả Mong đợi | Mục tiêu chiến lược |
| 3 | 📋 Chỉ đạo Cần Làm Rõ | Track chỉ đạo chính |
| 4 | 🏢 PROJECT HUB | Quản lý dự án |
| 5 | 👤 Danh Bạ Nhân Sự | Thông tin nhân sự |
| 6 | 📊 Báo cáo Tổng hợp | Output |

---

## 📁 Cấu trúc thư mục

```
CEO-Directives/
├── automation/                    # ⭐ Engine chính (Node.js)
│   ├── telegram-bot.js            # Telegram Bot + intent detection
│   ├── openclaw-bridge.js         # HTTP bridge port 3100
│   ├── scheduler.js               # Cron scheduler
│   ├── ai-analyzer.js             # AI phân tích + NL query
│   ├── report-generator.js        # Báo cáo tuần/tháng
│   ├── intent-detector.js         # Intent detection (12 types)
│   ├── session-manager.js         # Session memory (persist)
│   ├── content-bible.js           # Content Bible enforcement
│   ├── wf1-approval.js            # WF1: Email phê duyệt 2 bước
│   ├── wf2-directive-progress.js  # WF2: Notify tiến độ
│   ├── wf3-directive-status.js    # WF3: Detect thay đổi trạng thái
│   ├── wf4-directive-escalation.js# WF4: Leo thang quá hạn
│   ├── wf5-reminders.js           # WF5: Smart reminders
│   ├── wf6-dashboard-sync.js      # WF6: Sync dashboard
│   ├── hm50-linker.js             # Match chỉ đạo → 50 HM
│   ├── lib/                       # Shared libraries (notion-client)
│   ├── .env                       # Config (API keys, tokens)
│   └── package.json               # Dependencies
│
├── dashboard/                     # Dashboard UI (HTML/JS/CSS)
│   ├── index.html
│   ├── app.js
│   └── style.css
│
├── core/                          # Tài liệu core (Source of Truth)
│   ├── CORE_RULES.md
│   ├── PROJECT_INSTRUCTIONS.md
│   ├── BOD_FULL_FLOW.md
│   └── notion_id_mapping.json
│
├── data/                          # Data cache (JSON)
│   ├── directives.json
│   ├── people.json
│   ├── hm50_*.json
│   └── sessions/                  # Session memory persist
│
├── bod_meeting/                   # BOD Meeting system (Google Apps Script)
├── ban_chep_loi/                  # Transcript cuộc họp BOD
├── apps-script/                   # Google Apps Script (Forms WF4/WF5)
│
├── CONTENT_BIBLE_AIGENT.md        # Content Bible — chuẩn giao tiếp AI
├── CLAUDE.md                      # Context cho ClaudeCode
├── notion_properties_lock.md      # Properties KHÔNG được đổi tên
├── changelog.md                   # Nhật ký thay đổi
└── README.md                      # File này
```

---

## ⚡ Workflows

| WF | Tên | Mô tả | Trigger |
|---|---|---|---|
| **WF1** | Approval 2-Step | Email phê duyệt BOD → Đầu mối | Manual / Cron |
| **WF2** | Directive Progress | Notify chỉ đạo 5T confirmed | Cron |
| **WF3** | Status Change | Detect thay đổi trạng thái | Cron |
| **WF4** | Escalation | Leo thang chỉ đạo quá hạn | Cron / Form |
| **WF5** | Smart Reminders | Nhắc nhở thông minh | Cron / Form |
| **WF6** | Dashboard Sync | Sync data → dashboard | Cron |
| **HM50** | 50 HM Linker | Match chỉ đạo → 50 hạng mục | Manual |

---

## 🤖 Telegram Bot

### Commands

| Lệnh | Chức năng |
|---|---|
| `/start` | Giới thiệu + menu chính |
| `/trangthai` | Tổng quan trạng thái |
| `/quahan` | Chỉ đạo quá hạn |
| `/tim <keyword>` | Tìm chỉ đạo |
| `/chay <wf>` | Chạy workflow (có confirmation) |
| `/baocao` | Báo cáo nhanh |
| `/hoi <câu hỏi>` | Hỏi AI |
| `/phantich` | AI phân tích pattern + rủi ro |
| `/baocaotuan` | Báo cáo tuần AI |

### Free-text Chat

Bot hiểu chat tự nhiên bằng intent detection (12 types). Ví dụ:
- "Chào em" → greeting reply
- "Có gì quá hạn không" → auto gọi bridge
- "Phân tích tình hình" → AI analyze

---

## 🚀 Khởi chạy

```bash
cd automation

# 1. Bridge (port 3100)
node openclaw-bridge.js

# 2. Telegram Bot (polling)
node telegram-bot.js

# 3. Scheduler (cron jobs)
node scheduler.js

# 4. Dashboard (port 9090)
cd .. && python -m http.server 9090
```

---

## ⚠️ Lưu ý

- **KHÔNG đổi tên** Notion properties → xem `notion_properties_lock.md`
- **Source of Truth:** `core/CORE_RULES.md` > SOP > Schema > Prompt
- **Content Bible:** Tất cả AI output phải tuân thủ `CONTENT_BIBLE_AIGENT.md`
- **Bảo mật:** `TELEGRAM_ALLOWED_USERS` trong `.env` — chỉ CEO dùng bot

---

## 👥 Team

| Vai trò | Người |
|---|---|
| CEO | Thầy Lê Long Sơn |
| CEO Assistant | Anh Kha |
| AI Assistant (Gravity) | AntiGravity AI |
| AI Assistant (ClaudeCode) | Claude Code |

---

## 📝 Changelog

| Version | Ngày | Thay đổi |
|---|---|---|
| v1.0 | 27/12/2025 | Initial commit — Notion + n8n |
| v1.5 | 14/01/2026 | 4T→5T, WF1 v14 |
| v2.0 | 10/03/2026 | Migrate n8n → Node.js, Dashboard mới |
| v2.5 | 14/03/2026 | Telegram Bot, OpenClaw Bridge, AI Analyzer |
| **v3.0** | **15/03/2026** | **Intent Detection, Session Memory, Content Bible, Project cleanup** |
