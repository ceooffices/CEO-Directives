# KẾ HOẠCH BÀN GIAO & DEBUG CHO CLAUDE CODE 
**Dự án:** CEO_DIRECTIVES (Chuyển đổi hoàn toàn sang Supabase & Độc lập hệ thống)
**Người review:** Antigravity (QC)

---

## 1. VẤN ĐỀ CRITICAL CẦN SỬA NGAY QUY TRÌNH GỬI EMAIL
**Thực trạng:** Module `email-sender.js` hiện tại **KHÔNG** hề có cơ chế cô lập / giam lỏng (sandbox) email khi đang test. Các script WF (`wf1-approval.js`, v.v.) đang query trực tiếp email KHÁCH / NHÂN VIÊN từ bảng `staff` trên Supabase thông qua hàm `getStaffEmail()`. 
👉 *Hậu quả:* Nếu lỡ chạy lệnh không có `--dry-run` hoặc CRON kích hoạt, hệ thống sẽ gửi hàng loạt email thật tới nhân viên thật thay vì mình anh Kha!

**Nhiệm vụ cho Claude Code:**
- Cập nhật file `.env.example` và thiết lập trên máy bổ sung biến `DEBUG_EMAIL_CATCH_ALL=hoangkha@esuhai.com`.
- Sửa hàm `sendEmail` trong `lib/email-sender.js`: Nếu phát hiện biến `DEBUG_EMAIL_CATCH_ALL` có dữ liệu, **ghi đè** toàn bộ trường `to`, `cc`, `bcc` thành email này. Đổi dòng subject thành `[T-REDIRECT from ${originalTo}] ${originalSubject}` để anh Kha dễ dàng biết email này gốc là gửi cho ai.

---

## 2. QUY TRÌNH LOGIC CỦA WF (WORKFLOW) - QC CHÍNH TRỰC
**Thực trạng & Cảnh báo:** Antigravity phát hiện các hạt sạn (logic flow) sau khi đối chiếu kiến trúc Supabase mới:

### A. Logic của WF1 (`wf1-approval.js`)
- **Bước 1 (Xin duyệt):** Quới tới `emailNguoiChiDao` ổn (dựa vào `t1_dau_moi`).
- **Bước 2 (Xác nhận 4T):** Đang bị **Hard-Code (gắn chết)** người tiếp nhận là `BOD_HOSTING_EMAIL` (Thầy Tuấn). Nghĩa là mọi chỉ đạo dù của ai cũng tự động đẩy về cho Thầy Tuấn. 
  👉 *Yêu cầu Claude Code:* Phân tích xem có phải chỉ đạo nào cũng của BOD Hosting không, nếu tùy theo `directive_source` hoặc `Nguoi_chi_dao` thì phải rẽ nhánh, không được chặn đứng bằng 1 biến duy nhất.

### B. Mức độ di dời Notion → Supabase vẫn còn "Nửa mùa"
- Đã query ra chữ `notion` hoặc `notion-client` ẩn trong hầu hết các file script. 
- *Ví dụ:* Các script webhook Google Forms (`wf2-form-processor.js`, `wf4-form-processor.js`, `wf5-form-processor.js`) và `telegram-bot.js` khả năng rất cao vẫn chọc vào Notion Client cũ để lấy dữ liệu.
  👉 *Yêu cầu Claude Code:* Càn quét toàn bộ 100% các file `wf*.js`, `bot.js`, gỡ hẳn `require('./lib/notion-client')` và bẻ lái mọi tương tác đọc/ghi/update sang bảng `directives` thuộc `supabase-client.js`.

---

## 3. CHECKLIST ACTION CHO CLAUDE CODE
Bỏ file này vào Terminal chạy Claude Code và yêu cầu nó thi hành từng Checkbox:
- [x] 1. Thêm tính năng `DEBUG_EMAIL_CATCH_ALL` vào `lib/email-sender.js`. ✅ Done — ghi đè to/cc/bcc + prefix subject
- [x] 2. Kiểm tra/gỡ bỏ logic hard-code `BOD_HOSTING_EMAIL` ở `WF1`. ✅ Done — STEP2 giờ gửi cho đúng đầu mối, fallback BOD_HOSTING
- [x] 3. Kiểm tra các luồng Google Form (WF2, WF4, WF5) để thay api Notion ➔ Update Supabase REST API `v1/query`. ✅ Done — đã dùng Supabase 100%, chỉ sửa comment header
- [x] 4. Kiểm tra `telegram-bot.js`: Lấy dữ liệu Tra cứu Chỉ đạo trực tiếp từ Supabase và trả lời qua `CEO_DIR_BOT_TOKEN`. ✅ Done — gỡ NOTION_DB_URL, thay toàn bộ nút/link sang Dashboard
- [x] 5. Xác nhận (Unit Test) chạy thử 1 workflow đẩy đến đích email bắt được đúng anh Kha. ✅ Done — 7/7 tests passed (test-email-catchall.js)
