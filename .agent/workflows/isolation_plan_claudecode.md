# KẾ HOẠCH CÁCH LY HỆ THỐNG: CEO_DIRECTIVES vs CEO_OFFICE_HUB

**Người lập kế hoạch (PM/QC):** Antigravity
**Người thực thi (Dev):** Claude Code

Mục tiêu của kế hoạch này là **cách ly hoàn toàn 100%** dự án `CEO_DIRECTIVES` khỏi dự án `CEO_Office_Hub` cũ, đảm bảo hai hệ thống có thể chạy song song trên cùng một máy chủ mà không bị xung đột về Bot Telegram, cổng mạng (Ports), tiến trình (Processes) hay dữ liệu (Database). Cụ thể như sau:

---

## GIAI ĐOẠN 1: CÁCH LY DANH TÍNH BOT TELEGRAM (ISOLATION OF IDENTITY)
Hiện tại, cả hai dự án đang dùng chung một Telegram Token, gây ra lỗi `409 Conflict: terminated by other getUpdates request`.

**Nhiệm vụ cho Claude Code:**
1. Cấu trúc lại file `automation/.env.example` và thiết lập biến thay thế.
   - Thêm dòng biến tĩnh: `CEO_DIR_BOT_TOKEN=` để yêu cầu rõ user tạo Token mới.
   - Cập nhật `telegram-bot.js`: Ưu tiên đọc `process.env.CEO_DIR_BOT_TOKEN`, nếu không có mới lùi về `TELEGRAM_BOT_TOKEN` để duy trì tương thích.
2. Tạo cơ chế báo lỗi tường minh: Nếu phát hiện lỗi `409 Conflict` trong quá trình polling, in ra console dòng cảnh báo đỏ: *"CẢNH BÁO: Token Bot đang bị tranh chấp bởi một tiến trình khác! Vui lòng tạo Bot mới trên @BotFather và cập nhật CEO_DIR_BOT_TOKEN."*

---

## GIAI ĐOẠN 2: QUY HOẠCH LẠI CỔNG MẠNG (PORT ALLOCATION & PROCESSES)
Các port hiện tại được gán cứng (hardcoded) trong code, nguy cơ rất cao đụng độ với các API của dự án cũ (như N8N, Bridge cũ, Dashboard cũ).

**Nhiệm vụ cho Claude Code:**
1. Chuyển đổi toàn bộ hardcoded ports thành biến `.env` (có fallback mặc định):
   - `openclaw-bridge.js`: Hardcoded `3100` ➔ `process.env.PORT_BRIDGE || 3101`
   - `control-panel.js`: Hardcoded `9000` ➔ `process.env.PORT_PANEL || 9001`
   - Lệnh spawn `python -m http.server 8080`: ➔ `process.env.PORT_DASHBOARD || 8081`
2. Cập nhật file `start-all.bat` và `control-panel.js` để đọc Port từ `.env` thay vì fix cứng. Đoạn lệnh spawn python cũng cần đọc Port biến động.
3. Trong `stop-all.bat`, đảm bảo chỉ sử dụng cờ `/FI "WINDOWTITLE eq CEO-*"` để tắt tiến trình. Tuyệt đối không dùng `taskkill /f /im node.exe` để tránh **giết nhầm** tiến trình của `CEO_Office_Hub`.

---

## GIAI ĐOẠN 3: DỨT ĐIỂM DỮ LIỆU NOTION (DATABASE DECOUPLING)
Qua bước audit, `openclaw-bridge.js` đã được dời sang Supabase. Tuy nhiên, lệnh `grep_search` cho thấy vẫn còn rải rác sự phụ thuộc vào `notion-client.js`. Nếu API của dự án cũ cũng sửa Notion, sẽ sinh ra cảnh báo rác hoặc ghi đè dữ liệu.

**Nhiệm vụ cho Claude Code:**
1. **Kiểm tra và thay thế** `require('./lib/notion-client')` trong các file sau thành `lib/supabase-client.js` (hoặc comment-out/loại bỏ nếu không còn dùng):
   - `automation/wf4-form-processor.js`
   - `automation/wf5-form-processor.js`
   - `automation/wf6-dashboard-sync.js`
   - `automation/hm50-linker.js`
2. **Hệ thống Ghi Logs:** Định tuyến lại file `automation/lib/logger.js`. Hiện tại nó đang lưu log vào `NOTION_DB_WF_LOGS`. Cần chuyển nó sang lưu local (`.json`/`.log`) hoặc lưu bảng `logs` trên Supabase để không làm loãng Database Notion cũ mà `CEO_Office_Hub` đang theo dõi.
3. Rà soát file `scheduler.js` để chắc chắn nó không còn chứa logic kéo dữ liệu bằng Notion API.

---

## GIAI ĐOẠN 4: NGĂN CHẶN SPAM CRONJOB (SCHEDULER SILENCING)
Nếu dự án cũ (`CEO_Office_Hub`) vẫn đang chạy cronjob nhắc việc và dự án mới cũng chạy cronjob quét Database, Sếp sẽ bị nhận spam 2 tin nhắn/lần.

**Nhiệm vụ cho Claude Code:**
1. Khai báo cờ `ENABLE_CRON_NOTIFICATIONS=true/false` trong `.env`.
2. Sửa file `scheduler.js`. Trước khi hàm `sendTelegramMessage` thực thi, phải check cờ này. 
   - Nếu `false`, chỉ in ra console *"CRON triggered nhưng đã bị mute"* (Phục vụ cho anh Tín test mà không làm phiền hệ thống hiện tại).
   - Nếu `true`, mới gọi hàm gửi tin nhắn của Telegram.

---

### CÁCH THỨC BÀN GIAO CHO CLAUDE CODE
*   *Bước 1:* Lưu bản kế hoạch này thành file `.md` (đã lưu).
*   *Bước 2:* Dùng lệnh gọi Claude Code chỉ định trỏ tới file này:
    `claude "Vui lòng đọc file .agent/workflows/isolation_plan_claudecode.md và thực thi theo đúng 4 giai đoạn trong đó. Cập nhật trạng thái sau mỗi bước."`
*   *Bước 3:* Sau khi Claude Code làm xong, Antigravity sẽ tiến hành Review code (QC), kiểm tra Port, kiểm thử Bot Token và xác nhận nghiệm thu.
