# Hướng dẫn thêm trường "Link file báo cáo" vào Form đăng ký BOD

> Cập nhật: 2026-04-18
> Người thực hiện: BTC Meeting BOD (Ms. Vy / Anh Hiếu)

## Mục đích

Thay đổi quy trình thu nhận slide báo cáo:

- **Trước:** Mỗi bộ phận gửi file `.pptx/.pdf` qua email tới `minhhieu@esuhai.com` + `dungntt@esuhai.com`
- **Sau:** Mỗi bộ phận tự upload file lên OneDrive/SharePoint → Copy link chia sẻ → Dán vào Form đăng ký

## Trình tự 4 bước

### Bước 1 — Thêm câu hỏi mới vào Google Form

1. Mở Google Form đăng ký báo cáo BOD (link lưu trong sheet `Settings` → key `sys_formUrl`)
2. Click **+ Add question** ở cuối form
3. Điền thông tin:

   | Trường | Giá trị |
   |---|---|
   | Loại câu hỏi | **Câu trả lời ngắn** (Short answer) |
   | Tiêu đề | `Link file báo cáo` |
   | Mô tả (Description) | Upload file `.pptx/.pdf` lên OneDrive của bộ phận → Copy link chia sẻ (quyền xem) → Dán vào đây. Để trống nếu chưa có link — sẽ bổ sung sau. |
   | Bắt buộc (Required) | **TẮT** (optional) |
   | Response validation | **URL** (tùy chọn — khuyến nghị bật để chặn text không phải link) |

4. Click **Save** / Lưu form

### Bước 2 — Xác minh cột mới trên Sheet

1. Mở sheet `Form Đăng ký` (response sheet của Google Form)
2. Kiểm tra cột cuối cùng có header **"Link file báo cáo"** (hoặc tương đương tiếng Nhật)
3. Vị trí mong đợi: **cột L** (cột thứ 12, index 11). Google Form chèn cột mới ngay sau cột Form cuối (Bộ phận), đẩy các cột admin sang phải.
4. Chạy menu `🔧 BOD Tools` → `🔗 Kiểm tra cột Link báo cáo` để script tự xác minh

Script sẽ báo 1 trong 3 kết quả:

- ☑ **Đúng vị trí** → Hoàn tất, không cần làm gì thêm
- ◻ **Chưa tìm thấy** → Bạn chưa thêm question vào Google Form (quay lại Bước 1)
- ⚠ **Lệch vị trí** → Script sẽ báo index thực tế. Sửa `COLUMN_MAP.linkBaoCao` trong `v850_config.js` cho khớp, sau đó `clasp push`

### Bước 3 — Test bằng 1 response mẫu

1. Mở Google Form (preview), điền 1 response test với link giả (ví dụ `https://test.example/slide.pptx`)
2. Kiểm tra sheet: cột R của row mới phải có link vừa nhập
3. Mở Dashboard → tìm row test → cột **"File báo cáo"** phải hiển thị `☑ Có link` với hyperlink clickable
4. Xóa row test sau khi xác minh xong

### Bước 4 — Cập nhật email template (ĐÃ LÀM SẴN QUA CODE)

Email template đã được cập nhật:

- `v820_email_templates.js` → email kết quả phê duyệt (Duyệt)
- `Dashboard.html` → copy template khi xem preview
- `docs/content_bible.md` → bản chuẩn tiếng Việt + Nhật

**Không cần sửa tay** — chỉ cần `clasp push` sau khi hoàn tất Bước 1-3.

## Điểm cần lưu ý

### Behavior của Google Form khi thêm question

- Google Form thêm question mới → cột mới **append vào cuối** response sheet (nếu sheet đã có data)
- Các cột admin-added hiện tại (cột L-Q = Trạng thái, Thứ tự, Ghi chú BOD, TL chỉ đạo, Tên liên quan, Đã gửi email) **KHÔNG bị ảnh hưởng**
- Rủi ro: Nếu Google đặt cột ở vị trí khác với dự kiến → chạy menu verify để phát hiện sớm

### Quyền chia sẻ link OneDrive/SharePoint

Khi hướng dẫn bộ phận, nhắc họ chọn:

- **"Anyone in Esuhai Group with the link"** (quyền xem) — an toàn, không lộ ra ngoài
- Tránh **"Anyone with the link"** (public internet) — rò rỉ dữ liệu nội bộ
- Tránh **"Specific people"** — BTC không mở được

### Fallback nếu bộ phận quên dán link

Nếu tới Thứ Hai mà cột "Link file báo cáo" vẫn trống:

- BTC email nhắc trực tiếp bộ phận đó qua Dashboard (nút nhắc sẵn có)
- Nếu cấp bách, BTC có thể update link thủ công vào sheet (cột R) — code sẽ tự đọc lại

## Rollback (nếu cần)

Nếu cần quay lại quy trình cũ (gửi email):

1. Xóa question "Link file báo cáo" trong Google Form (Settings → Delete question) — **CẢNH BÁO:** Google sẽ xóa toàn bộ data cột R đã thu thập
2. Xóa dòng `linkBaoCao: 17` trong `v850_config.js`
3. Revert các commit liên quan tới email template
4. `clasp push`

Khuyến nghị **KHÔNG rollback** sau khi đã đi vào vận hành — thay vào đó, điều chỉnh nội dung hướng dẫn nếu có vấn đề.
