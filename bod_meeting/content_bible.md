# CONTENT BIBLE — BTC MEETING BOD
> Phiên bản: v8.4 | Cập nhật: 2026-03-04
> Quy tắc: 100% tiếng Việt có dấu · Không emoji · Header IN HOA · Hint in nghiêng nhỏ
> Phạm vi: Dashboard + Admin Page + Email Templates

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

## 5. BLOCK LỊCH TRÌNH CUỘC HỌP

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
| Tiêu đề modal | `modal-title` | XEM TRƯỚC NỘI DUNG EMAIL |
| Label Người nhận | `modal-to` | Người nhận |
| Label Tiêu đề | `modal-subject` | Tiêu đề |
| Label Nội dung | `modal-body` | Nội dung |
| Nút hủy | `modal-btn-cancel` | Hủy |
| Nút gửi | `modal-btn-send` | Gửi Ngay |

---

## 8. FOOTER

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Footer Dashboard | `footer-dashboard` | BTC Meeting BOD v8.2 — ESUHAI GROUP |
| Footer Admin | `footer-admin` | BTC Meeting BOD Admin v8.2 |

---

## 9. ADMIN PAGE (3 Tabs)

### Tab 1 — MẪU EMAIL

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tiêu đề panel | `admin-tpl-title` | QUẢN LÝ MẪU EMAIL |
| Dropdown label | `admin-tpl-select` | Chọn loại email |
| Option 1 | `admin-tpl-opt1` | Nhắc nhở đăng ký (1 bộ phận) |
| Option 2 | `admin-tpl-opt2` | Nhắc nhở đăng ký (tất cả) |
| Option 3 | `admin-tpl-opt3` | Nhắc nhở phê duyệt |
| Option 4 | `admin-tpl-opt4` | Kết quả phê duyệt |
| Option 5 | `admin-tpl-opt5` | Gửi lịch trình |
| Label tiêu đề | `admin-tpl-subj` | TIÊU ĐỀ EMAIL |
| Label biến | `admin-tpl-vars` | BIẾN KHẢ DỤNG |
| Label nội dung | `admin-tpl-body` | NỘI DUNG EMAIL |
| Hint | `admin-tpl-hint` | *Dùng các biến bên trên để chèn dữ liệu tự động vào email* |
| Nút lưu | `admin-tpl-save` | Lưu mẫu |
| Nút xem trước | `admin-tpl-preview` | Xem trước |
| Nút khôi phục | `admin-tpl-reset` | Khôi phục mặc định |

### Tab 2 — PHÂN QUYỀN

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tiêu đề panel | `admin-acl-title` | PHÂN QUYỀN TRUY CẬP |
| Hint | `admin-acl-hint` | *Quản lý quyền truy cập hệ thống cho từng thành viên* |
| Cột Họ tên | `admin-acl-name` | Họ tên |
| Cột Email | `admin-acl-email` | Email |
| Cột Vai trò | `admin-acl-role` | Vai trò |
| Cột Trạng thái | `admin-acl-status` | Trạng thái |
| Cột Hành động | `admin-acl-action` | Hành động |
| Badge đã duyệt | `admin-acl-approved` | Đã duyệt |
| Badge chờ duyệt | `admin-acl-pending` | Chờ duyệt |
| Badge bị khóa | `admin-acl-blocked` | Bị khóa |
| Nút duyệt | `admin-acl-btn-approve` | Duyệt |
| Nút từ chối | `admin-acl-btn-reject` | Từ chối |
| Nút khóa | `admin-acl-btn-lock` | Khóa |
| Nút mở khóa | `admin-acl-btn-unlock` | Mở khóa |
| Form thêm user | `admin-acl-add` | THÊM THÀNH VIÊN MỚI |
| Form label email | `admin-acl-add-email` | Email |
| Form label vai trò | `admin-acl-add-role` | Vai trò |
| Nút thêm | `admin-acl-add-btn` | Thêm thành viên |

### Tab 3 — THIẾT LẬP

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tiêu đề panel | `admin-set-title` | THIẾT LẬP HỆ THỐNG |
| Hint | `admin-set-hint` | *Cấu hình các thông số mặc định cho hệ thống BTC Meeting BOD* |
| Label giờ bắt đầu | `admin-set-start` | Giờ bắt đầu họp |
| Label hạn đăng ký | `admin-set-reg` | Hạn đăng ký |
| Label hạn phê duyệt | `admin-set-appr` | Hạn phê duyệt |
| Label gửi lịch | `admin-set-sched` | Gửi lịch trình |
| Label thời lượng max | `admin-set-maxpres` | Thời lượng tối đa (phút) |
| Label CD mặc định | `admin-set-defcd` | Chỉ đạo mặc định (phút) |
| Label CC email | `admin-set-cc` | CC Email mặc định |
| Hint CC | `admin-set-cc-hint` | *Địa chỉ email luôn nhận CC khi gửi thông báo* |
| Label email BTC | `admin-set-btc` | Email BTC (nhận nhắc phê duyệt) |
| Label link form | `admin-set-form` | Link Form đăng ký |
| Label link sheet | `admin-set-sheet` | Link Google Sheet |
| Nút lưu | `admin-set-save` | Lưu thiết lập |
| Thông tin hệ thống | `admin-set-info` | THÔNG TIN HỆ THỐNG |

---

## 10. EMAIL TEMPLATES (Song ngữ Việt–Nhật)

> File: `v820_email_templates.gs` · Inline CSS · Max 640px · Gmail/Outlook safe

### Email 1 — Nhắc nhở đăng ký báo cáo

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Header VN | `email1-header` | BOD MEETING — NHẮC NHỞ ĐĂNG KÝ BÁO CÁO |
| Header JP | `email1-header-jp` | BOD会議 — 報告登録リマインダー |
| Lời mở | `email1-greeting` | Kính gửi {name} — {dept}, |
| Nội dung chính | `email1-body` | Bộ phận {dept} chưa gửi đăng ký báo cáo cho cuộc họp BOD ngày {date}. |
| Hành động | `email1-cta` | Kính mời Anh/Chị hoàn tất đăng ký trước 17:00 Thứ Năm. |
| Nút | `email1-btn` | Đăng ký ngay |

### Email 2 — Nhắc phê duyệt nội dung

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Header VN | `email2-header` | BOD MEETING — NHẮC PHÊ DUYỆT NỘI DUNG |
| Header JP | `email2-header-jp` | BOD会議 — 承認リマインダー |
| Lời mở | `email2-greeting` | Kính gửi Ban Tổ Chức, |
| Nội dung chính | `email2-body` | Hiện có {n} đăng ký báo cáo đang chờ phê duyệt. |
| Hành động | `email2-cta` | Kính mời Anh/Chị xem xét và hoàn tất phê duyệt trước 17:00 Thứ Sáu. |

### Email 3 — Kết quả phê duyệt

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Header VN | `email3-header` | BOD MEETING — KẾT QUẢ PHÊ DUYỆT |
| Header JP | `email3-header-jp` | BOD会議 — 承認結果通知 |
| Lời mở | `email3-greeting` | Kính gửi {name}, |
| Nội dung chính | `email3-body` | BTC Meeting BOD xin thông báo kết quả phê duyệt nội dung đăng ký báo cáo. |
| Status badges | `email3-status` | ĐÃ DUYỆT / TỪ CHỐI / HOÃN LẠI |

### Email 4 — Lịch trình cuộc họp

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Header VN | `email4-header` | BOD MEETING — LỊCH TRÌNH CUỘC HỌP |
| Header JP | `email4-header-jp` | BOD会議 — 議事スケジュール |
| Lời mở | `email4-greeting` | Kính gửi toàn thể thành viên BOD, |
| Nội dung chính | `email4-body` | BTC Meeting BOD trân trọng gửi lịch trình cuộc họp chính thức. |
| Hành động | `email4-cta` | Kính mời Anh/Chị chuẩn bị nội dung theo đúng thứ tự và thời lượng đã phân bổ. |

### Footer chung (tất cả email)

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Dòng 1 VN | `email-footer-vn` | Email tự động từ BTC Meeting BOD — ESUHAI GROUP |
| Dòng 2 JP | `email-footer-jp` | 自動送信メール — BOD会議運営委員会 |
| Dòng 3 | `email-footer-noreply` | Vui lòng không trả lời email này / このメールに返信しないでください |

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
