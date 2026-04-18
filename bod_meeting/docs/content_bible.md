# CONTENT BIBLE — BTC MEETING BOD
# ESUHAI GROUP

> **Phiên bản:** v9.0 — Unified Edition
> **Cập nhật:** 2026-03-06
> **Soạn:** Antigravity + Anh Kha
> **Phạm vi:** Dashboard · Admin Page · Email Templates (song ngữ Việt–Nhật)
> **Nguyên tắc:** Chuyên nghiệp · Tâm lý học ứng dụng · Hướng tới hành động · Song ngữ đầy đủ

---

## MỤC LỤC

**PHẦN A — GIAO DIỆN**
1. [Dashboard UI](#phần-a--giao-diện)
2. [Admin Page UI](#9-admin-page)

**PHẦN B — EMAIL TEMPLATES**
3. [Nguyên tắc văn phong & tâm lý học](#phần-b--email-templates)
4. [Email 1 — Nhắc nhở đăng ký (3 cấp leo thang)](#11-email-1--nhắc-nhở-đăng-ký-báo-cáo)
5. [Email 2 — Nhắc phê duyệt](#12-email-2--nhắc-phê-duyệt-nội-dung)
6. [Email 3 — Kết quả phê duyệt](#13-email-3--kết-quả-phê-duyệt)
7. [Email 4 — Lịch trình cuộc họp](#14-email-4--lịch-trình-cuộc-họp)

**PHẦN C — KỸ THUẬT**
8. [Biến động, màu sắc, hướng dẫn áp dụng](#phần-c--kỹ-thuật-áp-dụng)

---

# PHẦN A — GIAO DIỆN

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
| Tiêu đề khi lọc | `stats-title-filtered` | TỔNG QUAN ĐĂNG KÝ — {date} |

---

## 3. BLOCK QUY TRÌNH CHUẨN BỊ (4 Giai đoạn)

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tiêu đề block | `process-title` | QUY TRÌNH CHUẨN BỊ CUỘC HỌP BOD |
| Mô tả chung | `process-desc` | Cuộc họp định kỳ thứ Hai lúc 08:30. Quy trình chuẩn bị theo từng mốc thời gian trong tuần. |

### Giai đoạn 1 — TIẾP NHẬN ĐĂNG KÝ

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tên | `stage1-title` | GIAI ĐOẠN 1 — TIẾP NHẬN ĐĂNG KÝ |
| Deadline | `stage1-deadline` | Hạn đăng ký: Thứ Sáu hàng tuần |
| Checklist 1 | `stage1-task1` | Form đăng ký đang mở nhận nội dung |
| Checklist 2 | `stage1-task2` | Có đăng ký từ bộ phận |
| Checklist 3 | `stage1-task3` | Tất cả bộ phận bắt buộc đã đăng ký |
| Nút | `stage1-btn` | Mở Form Đăng Ký |
| Hint | `stage1-result` | Kết quả dự kiến: Gửi email nhắc nhở đến đại diện các bộ phận chưa submit form. CC Ban Tổ Chức. |

### Giai đoạn 2 — PHÊ DUYỆT NỘI DUNG

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tên | `stage2-title` | GIAI ĐOẠN 2 — PHÊ DUYỆT NỘI DUNG |
| Deadline | `stage2-deadline` | Hạn phê duyệt: Thứ Bảy hàng tuần |
| Checklist 1 | `stage2-task1` | Xem xét nội dung từng đăng ký |
| Checklist 2 | `stage2-task2` | Phê duyệt, từ chối hoặc hoãn từng mục |
| Checklist 3 | `stage2-task3` | Tất cả đăng ký đã được xử lý |
| Nút | `stage2-btn` | Lưu Phê Duyệt |
| Lưu ý | `stage2-note` | Người phê duyệt: BOD Hosting |

### Giai đoạn 3 — XẾP LỊCH TRÌNH

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tên | `stage3-title` | GIAI ĐOẠN 3 — XẾP LỊCH TRÌNH |
| Deadline | `stage3-deadline` | Gửi lịch trình: Chủ Nhật trước 20:00 |
| Checklist 1 | `stage3-task1` | Sắp xếp thứ tự trình bày |
| Checklist 2 | `stage3-task2` | Xác nhận thời lượng từng phần |
| Checklist 3 | `stage3-task3` | Gửi lịch trình chính thức |
| Nút | `stage3-btn` | Gửi Lịch Trình |

### Giai đoạn 4 — BIÊN BẢN HỌP

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tên | `stage4-title` | GIAI ĐOẠN 4 — BIÊN BẢN HỌP |
| Deadline | `stage4-deadline` | Hoàn thành: Trong ngày họp hoặc ngay sau |
| Checklist 1 | `stage4-task1` | Ghi chép nội dung và quyết định |
| Checklist 2 | `stage4-task2` | Tổng hợp và soạn biên bản |
| Checklist 3 | `stage4-task3` | Gửi biên bản đến toàn bộ thành viên BOD |
| Nút | `stage4-btn` | Gửi Biên Bản |

---

## 4. BLOCK BỘ PHẬN BẮT BUỘC

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tiêu đề | `dept-title` | BỘ PHẬN BẮT BUỘC BÁO CÁO |
| Cột | | Bộ phận · Đại diện · Email · Số đăng ký · Duyệt · Trạng thái · Hành động |
| Đã đăng ký | `dept-status-done` | Đã đăng ký |
| Chưa đăng ký | `dept-status-pending` | Chưa đăng ký |
| Nút nhắc 1 BP | `dept-btn-remind-one` | Nhắc nhở |
| Nút nhắc tất cả | `dept-btn-remind-all` | Nhắc tất cả |
| Hint | `dept-hint` | Kết quả dự kiến: Gửi email nhắc nhở đến bộ phận chưa đăng ký. CC Ban Tổ Chức. |

---

## 5. BLOCK LỊCH TRÌNH CUỘC HỌP

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tiêu đề | `schedule-title` | LỊCH TRÌNH CUỘC HỌP BOD — {date} |
| Countdown | `schedule-countdown` | Còn {n} ngày |
| Cột | | STT · Giờ · Nội dung · Người trình bày · TB · CĐ · Liên quan |
| Nút | `sch-btn-send` | Gửi Lịch Trình |

---

## 6. BLOCK DANH SÁCH ĐĂNG KÝ

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tiêu đề | `reg-title` | DANH SÁCH ĐĂNG KÝ BÁO CÁO |
| Cột | | STT · Họ tên · Bộ phận · Nội dung báo cáo · Thời lượng · Phê duyệt · Thứ tự |
| Dropdown | | Chờ duyệt · Duyệt · Từ chối · Hoãn lại |
| Nút | `reg-btn-save` | Lưu Phê Duyệt |
| Rỗng | `reg-empty` | Không có đăng ký nào cho ngày này |

---

## 7. MODAL XEM TRƯỚC EMAIL

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tiêu đề | `modal-title` | XEM TRƯỚC NỘI DUNG EMAIL |
| Label | | Người nhận · Tiêu đề · Nội dung |
| Nút hủy | `modal-btn-cancel` | Hủy |
| Nút gửi | `modal-btn-send` | Gửi Ngay |

---

## 8. FOOTER

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Dashboard | `footer-dashboard` | BTC Meeting BOD v8.5 — ESUHAI GROUP |
| Admin | `footer-admin` | BTC Meeting BOD — Trang Quản Trị v8.5 — ESUHAI GROUP |

---

## 9. ADMIN PAGE (3 Tabs)

### Tab 1 — CẤU HÌNH CUỘC HỌP

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tiêu đề | `admin-meeting-title` | CẤU HÌNH CUỘC HỌP |
| BOD Hosting | `admin-hosting` | Người chủ trì (BOD Hosting) |
| Giờ bắt đầu | `admin-start` | Giờ bắt đầu họp |
| Link form | `admin-form` | Link Form đăng ký |

### Tab 2 — CẤU HÌNH EMAIL

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tiêu đề | `admin-email-title` | CẤU HÌNH GỬI EMAIL |
| Webhook URL | `admin-webhook` | N8N Webhook URL |
| Sender Name | `admin-sender-name` | Tên người gửi hiển thị |
| Sender Email | `admin-sender-email` | Email người gửi |
| Email BTC | `admin-btc-emails` | Email BTC (nhận nhắc phê duyệt) |
| CC mặc định | `admin-cc` | CC Email mặc định |

### Tab 3 — PHÂN QUYỀN

| Vị trí | Key | Nội dung |
|--------|-----|----------|
| Tiêu đề | `admin-acl-title` | PHÂN QUYỀN TRUY CẬP |
| Cột | | Họ tên · Email · Vai trò · Trạng thái · Hành động |
| Badge | | Đã duyệt · Chờ duyệt · Bị khóa |
| Form thêm | `admin-acl-add` | THÊM THÀNH VIÊN MỚI |

---

# PHẦN B — EMAIL TEMPLATES

> **File server:** `v820_email_templates.gs`
> **File preview:** `Js_Email.html`
> **Quy cách:** Inline CSS · Max 640px · Gmail/Outlook safe · Song ngữ Việt–Nhật

---

## 10. NGUYÊN TẮC VĂN PHONG & TÂM LÝ HỌC

### Triết lý cốt lõi

> Mỗi email không chỉ là một lời nhắc — mà là một lời mời đóng góp.
> Người nhận cần cảm nhận: "Tiếng nói của mình được chờ đợi, sự có mặt của mình có ý nghĩa."

### Giọng điệu theo cấp độ

| Cấp | Giọng điệu | Hình ảnh | Tâm lý học |
|-----|-----------|----------|------------|
| Lần 1 | **Lời mời chân thành** | "Chúng tôi muốn lắng nghe Anh/Chị" | Reciprocity · Autonomy Support |
| Lần 2 | **Đồng hành có trách nhiệm** | "Mọi người đang chờ mảnh ghép của Anh/Chị" | Social Proof · Commitment |
| Lần 3+ | **Leo thang với sự tôn trọng** | "Quyền lợi bộ phận cần tiếng nói đại diện" | Loss Aversion · Authority |

### Cơ chế leo thang kép

Leo thang dựa trên **2 trục** — không chỉ số lần nhắc trong tuần:

| Trục | Dữ liệu | Ảnh hưởng |
|------|---------|-----------|
| **Trục 1: Lần nhắc trong tuần** | reminderCount = 1, 2, 3... | Giọng điệu + màu sắc + CC |
| **Trục 2: Lịch sử tháng** | missedWeeks = số tuần chưa DK gần đây | **Bảng thống kê** xuất hiện |

**Quy tắc hiển thị bảng thống kê:**

| Điều kiện | Hành động |
|-----------|----------|
| BP đăng ký đầy đủ các tuần trước → Lần 1 tuần này | Không hiện bảng (email sạch, thân thiện) |
| BP đã bỏ lỡ >= 1 tuần gần đây → Lần 1 tuần này | **Hiện bảng thống kê ngay từ email đầu tiên** |
| Lần 2 trở lên (bất kỳ) | Luôn hiện bảng thống kê |

> **Tâm lý:** Bộ phận thấy ngay bảng số liệu rõ ràng → cảm nhận hệ thống có giám sát chuyên nghiệp, ghi nhận công bằng. Không ai bị bỏ sót, cũng không ai bị xử ép.

### Nguyên tắc tâm lý ứng dụng

| Nguyên tắc | Cách dùng | Ví dụ |
|-----------|----------|-------|
| **Reciprocity** (Cialdini) | Cho trước khi xin — BTC chủ động hỗ trợ | "BTC sẵn sàng hỗ trợ nếu Anh/Chị cần..." |
| **Social Proof** | Cho thấy người khác đã hành động | "Đã có 7/9 bộ phận hoàn tất đăng ký" |
| **Loss Aversion** (Kahneman) | Nhấn mạnh mất mát nếu không hành động | "Bộ phận sẽ không có đại diện trong lịch trình" |
| **Commitment & Consistency** | Nhắc cam kết đã có | "Theo quy trình đã được Ban Giám Đốc thống nhất..." |
| **Autonomy Support** (SDT) | Luôn cho 2 lựa chọn | "Đăng ký hoặc xác nhận không báo cáo" |
| **Identity-based** (Clear) | Gắn hành động với bản sắc | "Với vai trò đại diện bộ phận..." |

### Quy tắc bắt buộc

| Quy tắc | Mô tả |
|---------|-------|
| Song ngữ | Tiếng Việt (chính, 14px) + Tiếng Nhật (phụ, 12px, khối riêng) |
| Xưng hô VN | "Kính gửi Anh/Chị" — trang trọng nhưng gần gũi |
| Xưng hô JP | "{Tên} 様" hoặc "各位" |
| Từ cấm | "hậu quả", "phạt", "vi phạm", "cảnh báo cuối cùng", "bắt buộc" |
| Luôn có | Nút hành động (CTA) với link thật + thông tin liên hệ BTC |
| Deadline | Ghi cụ thể ngày + giờ, không ghi chung chung |
| CC minh bạch | Nếu CC ai, nói rõ trong email |

---

## 11. EMAIL 1 — NHẮC NHỞ ĐĂNG KÝ BÁO CÁO

> **Hàm:** `buildReminderEmail(deptName, contactName, reportDate, formUrl, isJp, reminderCount)`

---

### 11.1 SUBJECT LINE

| Lần | Subject |
|-----|---------|
| 1 | `[BOD Meeting] Đăng ký báo cáo — Cuộc họp {date} / [BOD会議] 報告登録のご案内` |
| 2 | `[BOD Meeting] Nhắc nhở lần 2 — Đăng ký báo cáo {date} / [BOD会議] 第2回リマインダー` |
| 3+ | `[Cần phản hồi] BOD Meeting — Đăng ký báo cáo {date} — Lần {n} / [要返信] BOD会議 第{n}回` |

### 11.2 HEADER & MÀU SẮC

| Lần | Header VN | Header JP | Gradient |
|-----|-----------|-----------|----------|
| 1 | BOD MEETING — ĐĂNG KÝ BÁO CÁO | BOD会議 — 報告登録のご案内 | #0f172a → #2563eb |
| 2 | BOD MEETING — NHẮC NHỞ LẦN 2 | BOD会議 — 第2回リマインダー | #92400e → #f59e0b |
| 3+ | BOD MEETING — CẦN PHẢN HỒI — LẦN {n} | BOD会議 — 要返信 — 第{n}回 | #7f1d1d → #ef4444 |

---

### 11.3 BẢNG THỐNG KÊ ĐĂNG KÝ THEO THÁNG

> **Điều kiện hiển thị:** Bộ phận có >= 1 tuần chưa đăng ký trong 4 tuần gần nhất.
> **Vị trí trong email:** Đặt ngay sau phần mở đầu, trước nút CTA.
> **Chỉ có 1 format duy nhất** — dùng cho tất cả các lần nhắc.

**TIẾNG VIỆT (HTML table, inline CSS):**

```
TÌNH HÌNH ĐĂNG KÝ — {deptName}

  Tuần {W1date} ({dd/MM}):   ✓ Đã đăng ký     hoặc   ✗ Chưa đăng ký
  Tuần {W2date} ({dd/MM}):   ✓ Đã đăng ký     hoặc   ✗ Chưa đăng ký
  Tuần {W3date} ({dd/MM}):   ✓ Đã đăng ký     hoặc   — Không họp
  ► Tuần này ({W4date}):     ✗ Chưa đăng ký

  Kết quả: {X}/{Y} tuần đã đăng ký trong tháng {month}
```

**TIẾNG NHẬT:**

```
登録状況 — {deptName}

  {W1date}週（{dd/MM}）：  ✓ 登録済み      または  ✗ 未登録
  {W2date}週（{dd/MM}）：  ✓ 登録済み      または  ✗ 未登録
  {W3date}週（{dd/MM}）：  ✓ 登録済み      または  — 会議なし
  ► 今週（{W4date}）：     ✗ 未登録

  実績：{month}月 {X}/{Y}週 登録済み
```

**Quy tắc hiển thị trong bảng:**

| Icon | Trạng thái VN | Trạng thái JP | Màu |
|------|--------------|--------------|-----|
| ✓ | Đã đăng ký | 登録済み | #10b981 (xanh lá) |
| ✗ | Chưa đăng ký | 未登録 | #ef4444 (đỏ) |
| — | Không họp | 会議なし | #94a3b8 (xám) |

**Quy tắc màu dòng tổng kết:**
- `{X}/{Y}` >= 75%: Xanh lá (#10b981) — "tốt"
- `{X}/{Y}` 50-74%: Amber (#f59e0b) — "cần cải thiện"
- `{X}/{Y}` < 50%: Đỏ (#ef4444) — "cần quan tâm"

**Nguồn dữ liệu:** Truy vấn sheet Responses, đếm row có `boPhan` = {deptName} trong 4 tuần gần nhất (4 ngày thứ Hai liên tiếp). Tuần không có cuộc họp (lễ, nghỉ) hiển thị "—" và không tính vào tổng.

---

### 11.4 LẦN 1 — LỜI MỜI CHÂN THÀNH

> **Tâm lý:** Reciprocity + Autonomy Support
> **Mục tiêu:** Người nhận cảm thấy "tiếng nói của mình được mong đợi"
> **Bảng thống kê:** Hiện nếu bộ phận đã bỏ lỡ >= 1 tuần gần đây (xem 11.3). Đặt sau đoạn "Hạn đăng ký".

**TIẾNG VIỆT:**

```
Kính gửi Anh/Chị {contactName},

Cuộc họp Ban Giám Đốc ngày {reportDate} đang được chuẩn bị.
Đây là dịp để CEO và Ban Giám Đốc lắng nghe trực tiếp tình hình
hoạt động, những thuận lợi cũng như khó khăn của từng bộ phận.

Tiếng nói của bộ phận {deptName} là phần không thể thiếu trong
bức tranh tổng thể đó.

BTC kính mời Anh/Chị đăng ký nội dung báo cáo, bao gồm:
  • Chủ đề báo cáo của bộ phận
  • Thời lượng trình bày dự kiến
  • Quyết định cần CEO phê duyệt (nếu có)

Hạn đăng ký: 17:00 Thứ Sáu tuần này.

Nếu tuần này bộ phận không có nội dung cần báo cáo, Anh/Chị
chỉ cần phản hồi ngắn email này để BTC ghi nhận — không cần
điền form.

Trân trọng,
Ban Tổ Chức Meeting BOD
```

**TIẾNG NHẬT:**

```
{contactName} 様

次回BOD会議（{reportDate}）の準備を進めております。
この会議は、CEOおよび経営陣が各部門の状況を直接お伺いする
大切な機会です。

{deptName}からの報告登録をお待ちしております。

登録内容：
  • 報告テーマ
  • 発表時間（目安）
  • CEO承認が必要な事項（該当する場合）

登録期限：今週金曜日 17:00

今週報告内容がない場合は、このメールにご返信いただくだけで
結構です。

よろしくお願いいたします。
BOD会議運営委員会
```

**NÚT CTA:** `ĐĂNG KÝ BÁO CÁO / 報告を登録する`
- Gradient: #2563eb → #1d4ed8
- Phía dưới nút hiện link text để người nhận copy

**INFO BOX:**
```
THÔNG TIN CUỘC HỌP / 会議情報
  Ngày họp / 会議日:      {reportDate}
  Giờ bắt đầu / 開始時間:  08:30
  Hạn đăng ký / 登録期限:  Thứ Sáu, 17:00 / 金曜日 17:00
```

**LIÊN HỆ:**
```
Cần hỗ trợ? Liên hệ BTC Meeting BOD — Ms. Vy (vynnl@esuhai.com)
ご不明な点は運営委員会までお問い合わせください。
```

---

### 11.5 LẦN 2 — ĐỒNG HÀNH CÓ TRÁCH NHIỆM

> **Tâm lý:** Social Proof + Scarcity + Commitment
> **Mục tiêu:** Tạo khẩn trương nhưng không gây áp lực — nhắc trách nhiệm tập thể
> **Bảng thống kê:** Luôn hiện (xem 11.3). Đặt sau đoạn "bức tranh tổng thể".

**BADGE:** `NHẮC NHỞ LẦN 2 / 第2回リマインダー`
- Background: #fef9c3, Border: #f59e0b

**TIẾNG VIỆT:**

```
Kính gửi Anh/Chị {contactName},

Đây là lần nhắc nhở thứ 2 từ BTC gửi đến bộ phận {deptName}.

Tính đến thời điểm hiện tại, phần lớn các bộ phận đã hoàn tất
đăng ký nội dung cho cuộc họp BOD ngày {reportDate}. CEO đang
chờ đợi bức tranh toàn cảnh từ tất cả bộ phận để chuẩn bị
nội dung chỉ đạo.

Mỗi bộ phận là một mảnh ghép — khi thiếu một mảnh, bức tranh
tổng thể sẽ không trọn vẹn.

{BẢNG THỐNG KÊ — xem format tại 11.3}

BTC hiểu rằng Anh/Chị đang bận rộn với nhiều công việc. Việc
đăng ký chỉ mất khoảng 5 phút nhưng mang lại giá trị lớn:
  • CEO nắm bắt đầy đủ tình hình mọi bộ phận
  • Bộ phận nhận được chỉ đạo và hỗ trợ kịp thời
  • Cuộc họp diễn ra hiệu quả, tôn trọng thời gian của mọi người

Kính mời Anh/Chị hoàn tất đăng ký trong hôm nay.

Nếu cần hỗ trợ hoặc gặp khó khăn khi điền form, vui lòng liên hệ
trực tiếp BTC — chúng tôi sẵn sàng hỗ trợ Anh/Chị.

Trân trọng,
Ban Tổ Chức Meeting BOD
```

**TIẾNG NHẬT:**

```
{contactName} 様

{deptName}部門への2回目のリマインダーです。

現時点で、大半の部門がBOD会議（{reportDate}）への報告登録を
完了しています。CEOは全部門からの報告をもとに、指示事項を
準備しております。

各部門からの報告は、全体像を把握するために欠かせないものです。

{登録状況テーブル — 11.3参照}

ご多忙中恐れ入りますが、本日中にご登録いただけますよう
お願いいたします。登録は約5分で完了します。

フォーム入力にご不明な点がございましたら、運営委員会まで
お気軽にお問い合わせください。

よろしくお願いいたします。
BOD会議運営委員会
```

**NÚT CTA:** `ĐĂNG KÝ NGAY — HẠN CUỐI HÔM NAY / 本日中に登録する`
- Gradient: #f59e0b → #d97706

**INFO BOX:** Giống Lần 1, thêm:
```
  Lần nhắc / リマインダー:  Lần 2 / 第2回 (màu amber)
```

---

### 11.6 LẦN 3+ — LEO THANG VỚI SỰ TÔN TRỌNG

> **Tâm lý:** Loss Aversion + Authority + Identity-based motivation
> **Mục tiêu:** Người nhận hiểu rõ hệ quả tự nhiên + có 2 lựa chọn hành động rõ ràng
> **Bảng thống kê:** Luôn hiện (xem 11.3). Đặt sau đoạn mở đầu.

**BADGE:** `CẦN PHẢN HỒI — LẦN {n} / 要返信 — 第{n}回`
- Background: #fef2f2, Border: #dc2626

**TIẾNG VIỆT:**

```
Kính gửi Anh/Chị {contactName},

Đây là lần thứ {count} BTC liên hệ bộ phận {deptName} về việc
đăng ký báo cáo cho cuộc họp BOD ngày {reportDate}.

BTC hoàn toàn thấu hiểu rằng công việc hàng ngày luôn có rất
nhiều ưu tiên cần xử lý. Tuy nhiên, với vai trò đại diện bộ phận,
Anh/Chị là cầu nối duy nhất giữa bộ phận mình và Ban Giám Đốc
trong cuộc họp này.

Hệ thống ghi nhận tình hình đăng ký của bộ phận {deptName}
trong thời gian gần đây:

{BẢNG THỐNG KÊ — xem format tại 11.3}

Cuộc họp BOD là nơi:
  • CEO lắng nghe và thấu hiểu tình hình từng bộ phận
  • Các quyết định ảnh hưởng đến nguồn lực và định hướng được đưa ra
  • Bộ phận nhận được sự hỗ trợ trực tiếp từ Ban Giám Đốc

Khi bộ phận không có mặt trong lịch trình, CEO sẽ không có cơ sở
để chỉ đạo hỗ trợ — và bộ phận có thể bỏ lỡ cơ hội nhận nguồn lực
cần thiết cho công việc.

Để BTC ghi nhận, kính mời Anh/Chị chọn một trong hai hướng:

  ① ĐĂNG KÝ BÁO CÁO
     Nhấn nút bên dưới — chỉ mất khoảng 5 phút

  ② XÁC NHẬN KHÔNG BÁO CÁO TUẦN NÀY
     Phản hồi email này với nội dung:
     "Bộ phận {deptName} xác nhận không có nội dung báo cáo tuần này"

Dù chọn hướng nào, sự phản hồi của Anh/Chị đều giúp BTC hoàn tất
chuẩn bị và tôn trọng thời gian của toàn bộ Ban Giám Đốc.

Email này được CC đến Ban Tổ Chức và Ban Giám Đốc để đảm bảo tính
minh bạch trong quy trình chuẩn bị cuộc họp.

Trân trọng,
Ban Tổ Chức Meeting BOD
```

**TIẾNG NHẬT:**

```
{contactName} 様

{deptName}部門への第{count}回のご連絡です。
BOD会議（{reportDate}）への報告登録についてお願いいたします。

日々の業務でお忙しい中、恐れ入ります。しかしながら、
部門代表として、この会議は経営陣と直接つながる唯一の場です。

直近の登録状況を以下にご案内いたします：

{登録状況テーブル — 11.3参照}

BOD会議では：
  • CEOが各部門の状況を直接把握します
  • リソース配分や方針に関する重要な決定が行われます
  • 各部門が経営陣からの直接的な支援を受けられます

以下のいずれかをお選びください：

  ① 報告登録：下のボタンから登録（約5分）
  ② 報告なし：このメールに「今週報告なし」とご返信ください

いずれのご対応も、会議準備の完了に役立ちます。

このメールは運営委員会および経営陣にCCされています。

よろしくお願いいたします。
BOD会議運営委員会
```

**CẢNH BÁO ĐỎ (chỉ hiện Lần 3+):**
```
Email này được CC đến Ban Tổ Chức và Ban Giám Đốc.
このメールは運営委員会および経営陣にCCされています。
```
- Background: #fef2f2, Text: #dc2626, Font-weight: 700

**NÚT CTA CHÍNH:** `ĐĂNG KÝ BÁO CÁO / 報告を登録する`
- Gradient: #dc2626 → #991b1b

**NÚT PHỤ (text link):** `Xác nhận không báo cáo tuần này / 今週報告なしと返信する`
- Dạng text link, không phải nút chính
- Link: `mailto:vynnl@esuhai.com?subject=Không báo cáo — {deptName}&body=Bộ phận {deptName} xác nhận không có nội dung báo cáo tuần này.`

---

## 12. EMAIL 2 — NHẮC PHÊ DUYỆT NỘI DUNG

> **Hàm:** `buildApprovalReminderEmail(reportDate, pendingCount)`

### Subject
```
[BOD Meeting] {pendingCount} đăng ký chờ phê duyệt — {date} / [BOD会議] 承認待ち{pendingCount}件
```

### Nội dung

**TIẾNG VIỆT:**

```
Kính gửi Ban Tổ Chức,

Hiện có {pendingCount} đăng ký báo cáo đang chờ phê duyệt cho
cuộc họp BOD ngày {reportDate}.

Các bộ phận đã dành thời gian chuẩn bị nội dung và đang mong chờ
phản hồi từ Ban Tổ Chức. Để lịch trình cuộc họp được gửi đúng hẹn
vào Chủ Nhật 20:00, kính mời Anh/Chị hoàn tất phê duyệt trước
17:00 Thứ Sáu.

Các bước cần thực hiện:
  • Xem xét nội dung từng đăng ký trên Dashboard
  • Chọn trạng thái: Duyệt / Từ chối / Hoãn
  • Ghi chú chỉ đạo cho người trình bày (nếu cần)

Sự phản hồi kịp thời của Anh/Chị giúp các bộ phận yên tâm chuẩn
bị và cuộc họp diễn ra trọn vẹn.

Trân trọng,
Hệ thống BTC Meeting BOD
```

**TIẾNG NHẬT:**

```
運営委員会 御中

BOD会議（{reportDate}）に向けて、{pendingCount}件の発表登録が
承認待ちです。

各部門は報告内容を準備し、承認結果をお待ちしています。
日曜日20:00までにスケジュールを配信するため、金曜日17:00までに
承認処理の完了をお願いいたします。

処理手順：
  • ダッシュボードで各登録内容を確認
  • 承認 / 不承認 / 保留 を選択
  • 必要に応じて、発表者へのコメントを記入

よろしくお願いいたします。
BOD会議運営システム
```

**INFO BOX (vàng):**
```
TÌNH TRẠNG PHÊ DUYỆT / 承認状況
  Ngày họp / 会議日:       {reportDate}
  Chờ phê duyệt / 承認待ち: {pendingCount} mục / {pendingCount}件
  Hạn phê duyệt / 承認期限: Thứ Bảy, 17:00 / 土曜日 17:00
```

**NÚT CTA:** `MỞ DASHBOARD PHÊ DUYỆT / ダッシュボードを開く` → link Dashboard

---

## 13. EMAIL 3 — KẾT QUẢ PHÊ DUYỆT

> **Hàm:** `buildApprovalResultEmail(recipientName, reportDate, status, content, ghiChu)`

### Subject

| Trạng thái | Subject |
|-----------|---------|
| Duyệt | `[BOD Meeting] Đã duyệt — {content} — {date} / [BOD会議] 承認済み` |
| Từ chối | `[BOD Meeting] Cần điều chỉnh — {content} — {date} / [BOD会議] 要修正` |
| Hoãn | `[BOD Meeting] Chuyển kỳ họp sau — {content} — {date} / [BOD会議] 次回へ繰越` |

---

### 13a. KẾT QUẢ: DUYỆT

**TIẾNG VIỆT:**

```
Kính gửi Anh/Chị {recipientName},

Cảm ơn Anh/Chị đã đăng ký nội dung báo cáo. BTC Meeting BOD xin
thông báo: nội dung của Anh/Chị ĐÃ ĐƯỢC PHÊ DUYỆT cho cuộc họp
BOD ngày {reportDate}.

                    ✓ ĐÃ DUYỆT / 承認済み

CHI TIẾT ĐĂNG KÝ:
  Ngày họp:     {reportDate}
  Nội dung:     {content}
  Kết quả:      Đã duyệt
  Ghi chú:      {ghiChu}

BƯỚC TIẾP THEO — để phần trình bày đạt hiệu quả cao nhất:

  ① Chuẩn bị slide hoặc tài liệu trình bày (.pptx/.pdf)

  ② CHIA SẺ LINK FILE BÁO CÁO CHO BTC (quan trọng)
     Cuộc họp BOD có hệ thống A.I phiên dịch trực tuyến Việt–Nhật
     hoạt động xuyên suốt buổi làm việc. Để hệ thống phiên dịch
     hoạt động chính xác và hiệu quả nhất, BTC đề nghị:

     ✦ Upload file báo cáo (.pptx/.pdf) lên OneDrive/SharePoint
       của bộ phận Anh/Chị

     ✦ Copy link chia sẻ (quyền xem) và dán vào trường
       "Link file báo cáo" trong Form đăng ký — hoàn thành
       trước Thứ Hai (trước khi buổi họp bắt đầu)

     ✦ Việc chia sẻ trước giúp: A.I phiên dịch nhận diện thuật
       ngữ chuyên ngành, tên riêng, và nội dung đặc thù của bộ
       phận — từ đó phiên dịch chính xác hơn cho người Nhật tham dự

  ③ Lịch trình chính thức sẽ được gửi trước 20:00 Chủ Nhật —
     Anh/Chị sẽ biết chính xác thứ tự và khung giờ của mình

  ④ Trình bày trong thời lượng đã đăng ký để đảm bảo cuộc họp
     diễn ra đúng tiến độ

Nếu cần điều chỉnh nội dung hoặc thời lượng, vui lòng liên hệ BTC
trước Thứ Bảy.

BTC chúc Anh/Chị có một phần trình bày ấn tượng!

Trân trọng,
Ban Tổ Chức Meeting BOD
```

**TIẾNG NHẬT:**

```
{recipientName} 様

報告登録のご提出、ありがとうございます。
ご登録いただいた内容は、BOD会議（{reportDate}）への発表として
承認されました。

                    ✓ 承認済み

登録詳細：
  会議日：      {reportDate}
  報告内容：    {content}
  結果：        承認
  コメント：    {ghiChu}

次のステップ：

  ① 発表資料のご準備をお願いいたします（.pptx/.pdf）

  ② 【重要】発表資料リンクの共有のお願い
     BOD会議では、AI通訳システムがベトナム語⇔日本語の
     リアルタイム通訳を行っております。
     通訳の精度を高めるため、下記の手順で資料リンクを
     共有してください：

     ✦ 発表資料（.pptx/.pdf）を部署のOneDrive/SharePointに
       アップロード

     ✦ 共有リンク（閲覧権限）を取得し、登録フォームの
       「発表資料リンク」欄に貼り付けてください
       （月曜日の会議開始前まで）

     事前にリンクを共有いただくことで、AI通訳が専門用語や
     固有名詞をより正確に認識・翻訳できるようになります。

  ③ 公式スケジュールは日曜日20:00までに配信いたします

  ④ 登録された時間内での発表をお願いいたします

内容や時間の変更がある場合は、土曜日までにBTCにご連絡ください。

素晴らしい発表になることを期待しております！

BOD会議運営委員会
```

---

### 13b. KẾT QUẢ: TỪ CHỐI

**TIẾNG VIỆT:**

```
Kính gửi Anh/Chị {recipientName},

Cảm ơn Anh/Chị đã dành thời gian chuẩn bị nội dung báo cáo.
Sau khi xem xét, BTC xin thông báo: nội dung đăng ký lần này
CẦN ĐƯỢC ĐIỀU CHỈNH trước khi đưa vào lịch trình cuộc họp.

                    ✗ CẦN ĐIỀU CHỈNH / 要修正

CHI TIẾT:
  Ngày họp:     {reportDate}
  Nội dung:     {content}
  Kết quả:      Cần điều chỉnh
  Góp ý:        {ghiChu}

BTC đánh giá cao sự chủ động của Anh/Chị trong việc đăng ký báo cáo.
Nội dung này có thể được điều chỉnh và đăng ký lại cho kỳ họp tiếp
theo hoặc ngay trong tuần này nếu kịp thời gian.

Nếu muốn trao đổi thêm về góp ý phê duyệt, vui lòng liên hệ trực
tiếp BTC. Chúng tôi sẵn sàng hỗ trợ Anh/Chị hoàn thiện nội dung.

Trân trọng,
Ban Tổ Chức Meeting BOD
```

**TIẾNG NHẬT:**

```
{recipientName} 様

報告内容のご準備にお時間をいただき、ありがとうございます。
検討の結果、今回のご登録内容は、スケジュールに組み込む前に
一部修正が必要と判断いたしました。

                    ✗ 要修正

詳細：
  会議日：      {reportDate}
  報告内容：    {content}
  結果：        要修正
  フィードバック： {ghiChu}

積極的にご登録いただいたことに感謝いたします。
修正のうえ、次回会議（または今週中に間に合えば今回の会議）に
再度ご登録いただけます。

フィードバックについてご相談がございましたら、運営委員会まで
お気軽にご連絡ください。

BOD会議運営委員会
```

---

### 13c. KẾT QUẢ: HOÃN

**TIẾNG VIỆT:**

```
Kính gửi Anh/Chị {recipientName},

BTC Meeting BOD xin thông báo: nội dung đăng ký báo cáo của Anh/Chị
cho ngày {reportDate} được CHUYỂN SANG KỲ HỌP SAU.

                    ∷ CHUYỂN KỲ SAU / 次回へ繰越

CHI TIẾT:
  Ngày họp:     {reportDate}
  Nội dung:     {content}
  Kết quả:      Chuyển kỳ sau
  Ghi chú:      {ghiChu}

Anh/Chị KHÔNG CẦN đăng ký lại. Nội dung sẽ được tự động chuyển sang
kỳ họp kế tiếp. BTC sẽ liên hệ nếu cần cập nhật thông tin.

Nếu Anh/Chị muốn chỉnh sửa nội dung trước kỳ họp tới, vui lòng
phản hồi email này.

Trân trọng,
Ban Tổ Chức Meeting BOD
```

**TIẾNG NHẬT:**

```
{recipientName} 様

ご登録いただいた報告内容は、次回BOD会議に繰り越しとなりました。

                    ∷ 次回へ繰越

詳細：
  会議日：      {reportDate}
  報告内容：    {content}
  結果：        次回繰越
  コメント：    {ghiChu}

再度の登録は不要です。内容は自動的に次回会議に引き継がれます。
内容の修正が必要な場合は、このメールにご返信ください。

BOD会議運営委員会
```

---

## 14. EMAIL 4 — LỊCH TRÌNH CUỘC HỌP

> **Hàm:** `buildScheduleEmail(reportDate, scheduleItems)`

### Subject
```
[BOD Meeting] Lịch trình chính thức — {date} — {soMục} nội dung / [BOD会議] 公式スケジュール
```

### Nội dung

**TIẾNG VIỆT:**

```
Kính gửi toàn thể thành viên BOD,

BTC Meeting BOD trân trọng gửi lịch trình làm việc chính thức cho
cuộc họp Ban Giám Đốc ngày {reportDate}.

Kính mời Anh/Chị:
  • Xem lại thứ tự và khung giờ trình bày của mình trong bảng bên dưới
  • Chuẩn bị tài liệu theo đúng nội dung đã đăng ký
  • Có mặt đúng giờ — cuộc họp bắt đầu lúc 08:30

THÔNG TIN CUỘC HỌP:
  Ngày họp:       {reportDate}
  Giờ bắt đầu:    08:30
  Số nội dung:    {soMục} mục
  Tổng thời gian:  {tongPhút} phút (dự kiến)

[BẢNG LỊCH TRÌNH]
| STT | GIỜ | NỘI DUNG | TRÌNH BÀY | TB | CĐ |
|-----|-----|----------|-----------|----|----|

Nếu cần điều chỉnh khẩn cấp, vui lòng liên hệ BTC trước 07:00
sáng ngày họp.

Chúc cuộc họp thành công tốt đẹp!

Trân trọng,
Ban Tổ Chức Meeting BOD
```

**TIẾNG NHẬT:**

```
BODメンバー各位

BOD会議（{reportDate}）の公式スケジュールをお送りいたします。

ご確認事項：
  • 下の表で発表順序と時間をご確認ください
  • 登録内容に沿った資料のご準備をお願いいたします
  • 定刻（08:30）にご出席をお願いいたします

会議情報：
  会議日：       {reportDate}
  開始時間：     08:30
  発表件数：     {soMục}件
  合計所要時間：  約{tongPhút}分

[スケジュール表]

変更が必要な場合は、会議当日の07:00までにBTCにご連絡ください。

会議の成功をお祈りいたします！

BOD会議運営委員会
```

---

## 15. FOOTER CHUNG

> Áp dụng tất cả email

**Mặc định:**
```
Email tự động từ BTC Meeting BOD — ESUHAI GROUP
自動送信メール — BOD会議運営委員会
Vui lòng không trả lời email này / このメールに返信しないでください
Liên hệ / お問い合わせ: BTC Meeting BOD — Ms. Vy (vynnl@esuhai.com)
```

**Footer đặc biệt — Email nhắc nhở Lần 3+:**
```
Phản hồi email này sẽ được gửi đến BTC và Ban Giám Đốc.
このメールへの返信はBTCおよび経営陣に送信されます。
```

---

# PHẦN C — KỸ THUẬT ÁP DỤNG

## 16. BIẾN ĐỘNG (Variables)

| Biến | Mô tả | Ví dụ |
|------|-------|-------|
| `{deptName}` | Tên bộ phận | KOKA TEAM |
| `{contactName}` | Tên người nhận | Utsumi |
| `{reportDate}` | Ngày họp hiển thị | Thứ 2, 10/03/2026 |
| `{formUrl}` | Link form đăng ký | Google Form URL |
| `{count}` | Số lần nhắc | 1, 2, 3 |
| `{pendingCount}` | Số đăng ký chờ duyệt | 5 |
| `{recipientName}` | Tên người nhận kết quả | Nguyễn Văn A |
| `{status}` | Trạng thái phê duyệt | Duyệt / Từ chối / Hoãn |
| `{content}` | Nội dung đăng ký | Báo cáo tình hình... |
| `{ghiChu}` | Ghi chú từ BOD | Cần bổ sung số liệu... |
| `{soMục}` | Số mục lịch trình | 8 |
| `{tongPhút}` | Tổng thời gian dự kiến | 120 |

### Biến thống kê lịch sử (dùng trong Bảng thống kê — xem 11.3)

| Biến | Mô tả | Ví dụ |
|------|-------|-------|
| `{month}` | Tháng hiện tại | 03/2026 |
| `{W1date}` ... `{W4date}` | Ngày thứ Hai đầu mỗi tuần (4 tuần gần nhất) | 03/03 |
| `{statusW1}` ... `{statusW4}` | Trạng thái VN | ✓ Đã đăng ký / ✗ Chưa đăng ký / — Không họp |
| `{X}/{Y}` | Số tuần đã DK / tổng tuần có họp trong tháng | 2/4 |
| `{missedWeeks}` | Số tuần chưa đăng ký trong 4 tuần gần nhất | 2 |

> **Nguồn dữ liệu:** Truy vấn sheet Responses, đếm row có `boPhan` = {deptName} trong 4 thứ Hai gần nhất. Tuần không có cuộc họp (lễ, nghỉ) hiển thị "—" và không tính vào tổng.
> **Điều kiện hiện bảng:** `missedWeeks >= 1` (bất kể đang ở Lần nhắc nào).

## 17. MÀU SẮC LEO THANG

| Lần | Badge BG | Badge Text | Nút CTA | Border-left |
|-----|----------|------------|---------|-------------|
| 1 | #eff6ff | #3b82f6 | #2563eb → #1d4ed8 | #3b82f6 |
| 2 | #fef9c3 | #f59e0b | #f59e0b → #d97706 | #f59e0b |
| 3+ | #fef2f2 | #dc2626 | #dc2626 → #991b1b | #dc2626 |

### Status badges (Email kết quả)

| Trạng thái | Màu chính | Background | Border | Icon |
|-----------|----------|-----------|--------|------|
| Duyệt | #10b981 | #ecfdf5 | #6ee7b7 | ✓ |
| Từ chối | #ef4444 | #fef2f2 | #fca5a5 | ✗ |
| Hoãn | #8b5cf6 | #f5f3ff | #c4b5fd | ∷ |

## 18. FILE CẦN SỬA KHI ÁP DỤNG

| File | Hàm | Nội dung |
|------|-----|----------|
| `v820_email_templates.gs` | `buildReminderEmail()` | Body VN + JP theo 3 cấp |
| `v820_email_templates.gs` | `buildApprovalReminderEmail()` | Body VN + JP |
| `v820_email_templates.gs` | `buildApprovalResultEmail()` | Body 3 trạng thái |
| `v820_email_templates.gs` | `buildScheduleEmail()` | Body + bảng lịch trình |
| `Js_Email.html` | `generateSingleReminderHtml()` | Preview 1 bộ phận |
| `Js_Email.html` | `generateReminderHtml()` | Preview bulk |
| `Js_Email.html` | `generateApprovalReminderHtml()` | Preview phê duyệt |
| `Js_Email.html` | `generateApprovalResultHtml()` | Preview kết quả |
| `Js_Email.html` | `generateScheduleHtml()` | Preview lịch trình |

## 19. CHECKLIST TRƯỚC KHI DEPLOY

- [ ] Tất cả email hiển thị đúng tên người nhận (không để trống)
- [ ] Nút CTA đều có link thật (không để href="#")
- [ ] Lần 2+: Badge leo thang hiển thị đúng
- [ ] Lần 3+: Dòng CC minh bạch hiển thị
- [ ] Lần 3+: Nút phụ "Xác nhận không báo cáo" hoạt động (mailto)
- [ ] Preview trong Dashboard khớp với email thực gửi
- [ ] Test trên Gmail + Outlook (inline CSS only, max 640px)
- [ ] Song ngữ hiển thị đúng (VN chính 14px, JP phụ 12px khối riêng)
- [ ] Footer có thông tin liên hệ BTC
- [ ] Kết quả phê duyệt: Badge status hiển thị đúng màu

---

## QUY TẮC VĂN PHONG TỔNG HỢP

| Quy tắc | Áp dụng |
|---------|---------|
| Tên tổ chức | BOD, BTC, ESUHAI (giữ nguyên, không dịch) |
| Quy trình | ĐĂNG KÝ → PHÊ DUYỆT → LỊCH TRÌNH → HỌP → CHỈ ĐẠO → TRACKING |
| Hạn đăng ký | Thứ Sáu 17:00 hàng tuần |
| Hạn phê duyệt | Thứ Bảy 17:00 hàng tuần |
| Gửi lịch trình | Chủ Nhật 20:00 |
| Giờ họp | Thứ Hai 08:30 |
| Người phê duyệt | BOD Hosting (luân phiên) |
| Từ cấm | "hậu quả", "phạt", "vi phạm", "cảnh báo cuối cùng", "bắt buộc" |
| Từ thay thế | "kết quả dự kiến", "cần điều chỉnh", "chuyển kỳ sau" |
| Giọng điệu Email | Tôn trọng → Đồng hành → Leo thang có đồng cảm |
