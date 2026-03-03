# CONTENT BIBLE — BTC MEETING BOD DASHBOARD
> Phiên bản: v8.3 | Cập nhật: 2026-03-03
> Quy tắc: 100% tiếng Việt có dấu · Không emoji · Header IN HOA · Hint in nghiêng nhỏ

---

## 1. BANNER (Header)

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tiêu đề chính | `h1` | BTC MEETING BOD |
| Mô tả phụ | `header-sub` | Hệ thống quản lý đăng ký báo cáo — Cuộc họp BOD hàng tuần |
| Label chọn ngày | `date-label` | Xem lịch họp ngày |

---

## 2. BLOCK THỐNG KÊ (5 Cards)

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tiêu đề block | `stats-title` | TỔNG QUAN ĐĂNG KÝ |
| Card 1 | `stat-total` | Tổng đăng ký |
| Card 2 | `stat-approved` | Đã duyệt |
| Card 3 | `stat-pending` | Chờ duyệt |
| Card 4 | `stat-rejected` | Từ chối |
| Card 5 | `stat-deferred` | Hoãn lại |
| Tiêu đề khi lọc theo ngày | `stats-title-filtered` | TỔNG QUAN ĐĂNG KÝ — {date} |

---

## 3. BLOCK QUY TRÌNH CHUẨN BỊ (4 Giai đoạn)

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tiêu đề block | `process-title` | QUY TRÌNH CHUẨN BỊ CUỘC HỌP BOD |
| Mô tả chung | `process-desc` | Cuộc họp định kỳ thứ Hai lúc 08:30. Quy trình chuẩn bị theo từng mốc thời gian trong tuần. |

### Giai đoạn 1 — TIẾP NHẬN ĐĂNG KÝ

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tên giai đoạn | `stage1-title` | GIAI ĐOẠN 1 — TIẾP NHẬN ĐĂNG KÝ |
| Deadline | `stage1-deadline` | Hạn đăng ký: Thứ Năm hàng tuần |
| Checklist 1 | `stage1-task1` | Mở form đăng ký cho các bộ phận |
| Checklist 2 | `stage1-task2` | Nhắc các bộ phận bắt buộc điền đăng ký |
| Checklist 3 | `stage1-task3` | Kiểm tra danh sách bộ phận chưa đăng ký |
| Nút hành động | `stage1-btn` | Mở Form Đăng Ký |
| Kết quả dự kiến | `stage1-result` | Kết quả dự kiến khi kích hoạt: Mở form đăng ký và gửi thông báo đến tất cả bộ phận. |

### Giai đoạn 2 — PHÊ DUYỆT NỘI DUNG

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tên giai đoạn | `stage2-title` | GIAI ĐOẠN 2 — PHÊ DUYỆT NỘI DUNG |
| Deadline | `stage2-deadline` | Hạn phê duyệt: Thứ Sáu hàng tuần |
| Checklist 1 | `stage2-task1` | Xem xét nội dung từng đăng ký |
| Checklist 2 | `stage2-task2` | Phê duyệt, từ chối hoặc hoãn từng mục |
| Checklist 3 | `stage2-task3` | Đảm bảo tất cả đăng ký đã được xử lý |
| Nút hành động | `stage2-btn` | Lưu Phê Duyệt |
| Kết quả dự kiến | `stage2-result` | Kết quả dự kiến khi kích hoạt: Lưu trạng thái phê duyệt của tất cả đăng ký vào hệ thống. |
| Lưu ý | `stage2-note` | Người phê duyệt: BOD Hosting |

### Giai đoạn 3 — XẾP LỊCH TRÌNH

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tên giai đoạn | `stage3-title` | GIAI ĐOẠN 3 — XẾP LỊCH TRÌNH |
| Deadline | `stage3-deadline` | Gửi lịch trình: Chủ Nhật trước 20:00 |
| Checklist 1 | `stage3-task1` | Sắp xếp thứ tự trình bày |
| Checklist 2 | `stage3-task2` | Xác nhận thời lượng từng phần |
| Checklist 3 | `stage3-task3` | Gửi lịch trình chính thức đến các thành viên |
| Nút hành động | `stage3-btn` | Gửi Lịch Trình |
| Kết quả dự kiến | `stage3-result` | Kết quả dự kiến khi kích hoạt: Gửi email lịch trình cuộc họp đến tất cả thành viên tham dự. |

### Giai đoạn 4 — BIÊN BẢN HỌP

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tên giai đoạn | `stage4-title` | GIAI ĐOẠN 4 — BIÊN BẢN HỌP |
| Deadline | `stage4-deadline` | Hoàn thành: Trong ngày họp hoặc ngay sau |
| Checklist 1 | `stage4-task1` | Ghi chép nội dung và quyết định trong cuộc họp |
| Checklist 2 | `stage4-task2` | Tổng hợp và soạn biên bản |
| Checklist 3 | `stage4-task3` | Gửi biên bản đến toàn bộ thành viên BOD |
| Nút hành động | `stage4-btn` | Gửi Biên Bản |
| Kết quả dự kiến | `stage4-result` | Kết quả dự kiến khi kích hoạt: Gửi email biên bản cuộc họp đến tất cả thành viên. |

---

## 4. BLOCK BỘ PHẬN BẮT BUỘC

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tiêu đề block | `dept-title` | BỘ PHẬN BẮT BUỘC ĐĂNG KÝ |
| Cột STT | `dept-col-no` | STT |
| Cột Bộ phận | `dept-col-name` | Bộ phận |
| Cột Đại diện | `dept-col-rep` | Đại diện |
| Cột Trạng thái | `dept-col-status` | Trạng thái |
| Cột Hành động | `dept-col-action` | Hành động |
| Trạng thái đã đăng ký | `dept-status-done` | Đã đăng ký |
| Trạng thái chưa đăng ký | `dept-status-pending` | Chưa đăng ký |
| Nút nhắc 1 bộ phận | `dept-btn-remind-one` | Nhắc nhở |
| Nút nhắc tất cả | `dept-btn-remind-all` | Nhắc Tất Cả Bộ Phận Chưa Đăng Ký |
| Hint nút nhắc 1 | `dept-hint-remind-one` | *Gửi email nhắc nhở riêng đến đại diện bộ phận này* |
| Hint nút nhắc tất cả | `dept-hint-remind-all` | *Gửi email nhắc nhở đến tất cả bộ phận chưa hoàn thành đăng ký* |

---

## 5. BLOCK LỊCH TRÌNH LÀM VIỆC

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tiêu đề block | `schedule-title` | LỊCH TRÌNH CUỘC HỌP BOD — {date} |
| Countdown | `schedule-countdown` | Còn {n} ngày |
| Cột STT | `sch-col-no` | STT |
| Cột Giờ | `sch-col-time` | Giờ |
| Cột Nội dung | `sch-col-content` | Nội dung |
| Cột Người trình bày | `sch-col-presenter` | Người trình bày |
| Cột TB | `sch-col-tb` | TB |
| Cột CĐ | `sch-col-cd` | CĐ |
| Cột Liên quan | `sch-col-related` | Liên quan |
| Nút gửi lịch | `sch-btn-send` | Gửi Lịch Trình |
| Hint nút gửi lịch | `sch-hint-send` | *Gửi email lịch trình cuộc họp đến toàn bộ thành viên tham dự* |

---

## 6. BLOCK DANH SÁCH ĐĂNG KÝ

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tiêu đề block | `reg-title` | DANH SÁCH ĐĂNG KÝ BÁO CÁO |
| Cột STT | `reg-col-no` | STT |
| Cột Họ tên | `reg-col-name` | Họ tên |
| Cột Bộ phận | `reg-col-dept` | Bộ phận |
| Cột Nội dung báo cáo | `reg-col-content` | Nội dung báo cáo |
| Cột Thời lượng | `reg-col-duration` | Thời lượng |
| Cột Phê duyệt | `reg-col-approval` | Phê duyệt |
| Cột Thứ tự | `reg-col-order` | Thứ tự |
| Dropdown: Chờ duyệt | `approval-pending` | Chờ duyệt |
| Dropdown: Duyệt | `approval-approved` | Duyệt |
| Dropdown: Từ chối | `approval-rejected` | Từ chối |
| Dropdown: Hoãn | `approval-deferred` | Hoãn lại |
| Nút lưu phê duyệt | `reg-btn-save` | Lưu Phê Duyệt |
| Trạng thái rỗng | `reg-empty` | Không có đăng ký nào cho ngày này |

---

## 7. MODAL XEM TRƯỚC EMAIL

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tiêu đề modal | `modal-title` | XEM TRƯỚC EMAIL TRƯỚC KHI GỬI |
| Label Người nhận | `modal-to` | Người nhận |
| Label Tiêu đề | `modal-subject` | Tiêu đề |
| Label Nội dung | `modal-body` | Nội dung |
| Nút hủy | `modal-btn-cancel` | Hủy |
| Nút gửi | `modal-btn-send` | Gửi Ngay |

---

## 8. FOOTER

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Copyright | `footer-copy` | ESUHAI GROUP — Hệ thống quản lý họp BOD nội bộ |

---

## QUY TẮC VĂN PHONG

| Quy tắc | Áp dụng |
|---------|---------|
| Tên tổ chức | BOD, BTC, ESUHAI (giữ nguyên) |
| Quy trình chuẩn | TIẾP NHẬN → PHÊ DUYỆT → XẾP LỊCH → BIÊN BẢN |
| Deadline đăng ký | Thứ Năm hàng tuần |
| Deadline phê duyệt | Thứ Sáu hàng tuần |
| Gửi lịch trình | Chủ Nhật 20:00 |
| Giờ họp | Thứ Hai 08:30 |
| Người phê duyệt | BOD Hosting |
| Từ cấm | "hậu quả" → dùng "Kết quả dự kiến khi kích hoạt" |
| Emoji | Không sử dụng |
