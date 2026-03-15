# CEO Directive Automation — ClaudeCode Context

## Tổng quan dự án
Hệ thống tự động hóa quản lý chỉ đạo CEO cho EsuhaiGroup (Giáo dục & Nhân lực Việt-Nhật).
- **Kiến trúc:** Telegram Bot → OpenClaw Bridge (port 3100) → 6 Workflows → Notion DB
- **AI:** GPT-4o-mini (hiện tại) → cần chuyển sang AI Router (Gemini + OpenAI)
- **Ngôn ngữ:** Node.js, tiếng Việt có dấu

## Cấu trúc thư mục
```
F:\CEO_DIRECTIVES\
├── automation/               # Core code
│   ├── telegram-bot.js       # Telegram Bot (599 LOC)
│   ├── openclaw-bridge.js    # HTTP bridge (211 LOC)
│   ├── scheduler.js          # Cron scheduler (142 LOC)
│   ├── ai-analyzer.js        # AI analysis (262 LOC)
│   ├── report-generator.js   # Report gen (283 LOC)
│   ├── wf1-approval.js       # Email duyệt chỉ đạo
│   ├── wf2-*.js              # Notify + form processor
│   ├── wf3-*.js              # Status detection
│   ├── wf4-*.js              # Escalation + form
│   ├── wf5-*.js              # Reminders + form
│   ├── wf6-*.js              # Dashboard sync
│   ├── hm50-linker.js        # Match chỉ đạo → 50 HM
│   ├── parse_kpi_sheet.js    # KPI parser
│   ├── import-*.js           # Data imports
│   └── lib/                  # Shared modules
│       ├── notion-client.js
│       ├── email-sender.js
│       ├── email-templates.js
│       └── logger.js
├── data/                     # JSON data layer
├── dashboard/                # Static dashboard
├── CONTENT_BIBLE_AIGENT.md   # ⭐ Content Bible — ĐỌC TRƯỚC KHI CODE
└── .env                      # Environment (chưa có ADMIN_CHAT_ID)
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

## Sprint 1 — Tasks cho ClaudeCode

### 🔴 CRITICAL (làm trước)
1. **C3: Thêm confirmation trước `/chay`**
   - File: `automation/telegram-bot.js` L390-410
   - Thêm inline buttons "☑ Xác nhận chạy" / "✖ Hủy" trước khi gọi bridge
   - Pattern: `cmd_confirm_wf1` → user bấm → gọi bridge

2. **C4: AI Router cho ai-analyzer.js**
   - File: `automation/ai-analyzer.js`
   - Thay `new OpenAI({ apiKey })` bằng router chọn Gemini hoặc OpenAI
   - Nếu có `GEMINI_API_KEY` → dùng Gemini (rẻ hơn), fallback OpenAI

### 🟡 WARNING (làm sau critical)
3. **W1+W2: Cập nhật xưng hô + emoji**
   - File: `automation/telegram-bot.js`
   - Thay tất cả "Tôi" → "con", "Bạn" → "Thầy" (hoặc context-aware)
   - Thay emoji theo Bible list ở trên
   - Thay "❌" → "✖", "✅" → "☑", v.v.

4. **W3: Error → admin DM**
   - File: `automation/telegram-bot.js`
   - Thêm function `notifyAdmin(error, context)` gửi DM cho ADMIN_CHAT_ID
   - Gọi trong tất cả catch blocks

5. **W5: Fix report-generator TelegramBot leak**
   - File: `automation/report-generator.js` L221-222
   - Thay `new TelegramBot(token)` bằng parameter injection hoặc singleton

6. **W7: Validate AI response**
   - File: `automation/telegram-bot.js` L431-446
   - Thêm: `if (!result.answer) result.answer = "Thầy ơi, con chưa tìm được câu trả lời phù hợp."`

## Coding Standards
- Comments tiếng Việt có dấu
- Console logs: `[MODULE] icon Message` (e.g. `[BOT] ☑ Command processed`)
- Error messages tuân thủ Content Bible
- Không dùng `console.log` cho user-facing output — log riêng, message riêng
- Test: chạy `node telegram-bot.js --test` để verify

## Phối hợp
- Gravity (Antigravity) review tất cả thay đổi trước khi chạy thật
- Commit message: `[Sprint1] C3: Thêm confirmation cho /chay`
- Không sửa `.env` trực tiếp — chỉ sửa `.env.example` và thông báo
