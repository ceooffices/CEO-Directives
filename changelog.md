# CHANGELOG — CEO Directive Automation

---

## v4.0.0 — Sprint 1 + 2 (16/03/2026)

> Team: Gravity (PM/QC) + ClaudeCode (DEV) + anh Kha (Director)
> Build: `next build` ✅ PASS

### 🏗️ Kiến trúc mới (Sprint 1)

**Bỏ Supabase, chuyển toàn bộ sang Notion API**
- Dashboard (`web/`) đọc trực tiếp từ Notion — không cần tầng trung gian
- 7 file lỗi thời chuyển vào `archive/` (GAS scripts, Supabase client, old dashboard)
- BOD Meeting archive: giữ data/docs, bỏ code
- Tài liệu hệ thống viết lại: CLAUDE.md v2.0, SYSTEM_AUDIT.md, .env.example

### 🤖 Intelligence (Sprint 2 — ClaudeCode)

| Module | Mô tả |
|--------|-------|
| AI Router | Gemini 2.5 Pro primary, OpenAI fallback (`ai-analyzer.js`) |
| RAG Engine | TF-IDF retrieval, 12 context files, tiếng Việt tokenizer (`rag-engine.js`) |
| Rate Limit | Per-user cooldown trong Telegram Bot |
| Error → Admin DM | `notifyAdmin()` gửi lỗi qua Telegram cho admin — 10 vị trí |
| Bot Leak Fix | Singleton pattern trong `report-generator.js` |
| /chay Confirm | Inline buttons "☑ Xác nhận" + callback handler |
| Dead Code | Xóa `sams_differ` — 0 references |

### 📧 Email (Sprint 2 — Gravity)

| Feature | Mô tả |
|---------|-------|
| Tracking Pixel | 1x1 invisible pixel trong footer 6 loại email. Log vào `data/email_opens.json` |
| TrackChange Diff | LELONGSON-Master 2.0 — dark header + diff table + multi-field (status, deadline, assignee) |
| QC Emoji | 13 violations fixed: 📋📝💡👉🏆 → ▸📌☑ (theo Content Bible) |

### 🐛 Bug Fixes

| Bug | Nguyên nhân | Fix |
|-----|-------------|-----|
| Build fail `@/lib/supabase` | Gravity bỏ sót `api/status/route.ts` khi migrate | Import `getDirectives` từ `@/lib/notion` |

---

## v3.0.2 (15/03/2026) — ClaudeCode

- Gemini AI router + retry rate limit
- Dashboard URL in bot UI

## v3.0.1 (15/03/2026) — ClaudeCode

- Update package.json + .env.example for cross-platform setup

## v3.0 (14/03/2026) — ClaudeCode

- Intelligence modules + project cleanup

---

## v1.0 — Database Integration (27/12/2025)

- Kiến trúc 7 Databases Notion
- Meeting → Outcomes → Clarifications → Tasks flow
- Sessions → Báo cáo Tổng hợp (đổi tên)
- Relations: Ghi chép cuộc họp ↔ Outcomes ↔ Clarifications

