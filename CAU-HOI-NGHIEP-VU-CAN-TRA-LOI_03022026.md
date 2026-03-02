# CÂU HỎI NGHIỆP VỤ CẦN THẦY TRẢ LỜI

> **Hướng dẫn:** Thầy điền câu trả lời vào các chỗ `[___]` hoặc đánh dấu ✅ vào lựa chọn phù hợp
> **Ngày tạo:** 03/02/2026
> **Quan trọng:** File này quyết định cấu trúc database, vui lòng điền đầy đủ

---

## PHẦN 1: CẤU TRÚC TỔ CHỨC

### 1.1 Số lượng nhân sự dự kiến

| Vai trò | Số lượng hiện tại | Số lượng dự kiến (6 tháng tới) |
|---------|-------------------|-------------------------------|
| Admin | [___] | [___] |
| MS1 | [___] | [___] |
| MS2 | [___] | [___] |
| CTV | [___] | [___] |

---

### 1.2 Cấu trúc phân cấp

**Câu hỏi:** Mỗi cấp quản lý bao nhiêu người cấp dưới?

```
Admin
  └── MS1: Mỗi Admin quản lý [___] MS1
        └── MS2: Mỗi MS1 quản lý [___] MS2
              └── CTV: Mỗi MS2 quản lý [___] CTV
```

**Câu hỏi bổ sung:**
- [ ] 1 CTV chỉ thuộc 1 MS2 (không đổi)
- [ ] 1 CTV có thể chuyển sang MS2 khác (có thể đổi)

---

### 1.3 Ai tạo tài khoản cho ai?

**Đánh dấu ✅ vào phương án phù hợp:**

| Vai trò cần tạo | Ai tạo? |
|-----------------|---------|
| **MS1** | [ ] Admin tạo thủ công trong Supabase |
|         | [ ] Admin tạo qua Admin Dashboard (cần làm sau) |
| **MS2** | [ ] Admin tạo |
|         | [ ] MS1 tạo cho team mình |
|         | [ ] Tự đăng ký, Admin/MS1 duyệt |
| **CTV** | [ ] MS2 tạo cho team mình |
|         | [ ] Tự đăng ký qua form "Đăng ký CTV", MS2/Admin duyệt |
|         | [ ] Cả hai cách trên |
| **TV (Thành viên)** | [ ] Tự đăng ký, tự động kích hoạt |
|                     | [ ] Tự đăng ký, cần duyệt |

---

## PHẦN 2: QUẢN LÝ ỨNG VIÊN

### 2.1 Nguồn ứng viên

**Đánh dấu ✅ tất cả các nguồn ứng viên có thể có:**

- [ ] **A. CTV tự nhập thủ công** (điền form trên website)
- [ ] **B. Ứng viên tự đăng ký** qua website với link referral của CTV
- [ ] **C. Ứng viên đăng ký qua hotline/fanpage** → Admin/MS nhập vào hệ thống
- [ ] **D. Import từ Excel** (Admin upload file)
- [ ] **E. Khác:** [___________________________________]

---

### 2.2 Trạng thái ứng viên (Candidate Funnel)

**Em đề xuất các trạng thái sau. Thầy kiểm tra và điều chỉnh:**

| # | Mã trạng thái | Tên hiển thị | Giữ/Bỏ/Sửa | Ghi chú của Thầy |
|---|---------------|--------------|------------|------------------|
| 1 | `NEW` | Mới | [ ] Giữ [ ] Bỏ | |
| 2 | `CONTACTED` | Đã liên hệ | [ ] Giữ [ ] Bỏ | |
| 3 | `CONSULTING` | Đang tư vấn | [ ] Giữ [ ] Bỏ | |
| 4 | `QUALIFIED` | Đủ điều kiện | [ ] Giữ [ ] Bỏ | |
| 5 | `DEPOSITED` | Đã đóng cọc | [ ] Giữ [ ] Bỏ | |
| 6 | `ENROLLED` | Học viên chính thức | [ ] Giữ [ ] Bỏ | |
| 7 | `REJECTED` | Từ chối/Không ĐK | [ ] Giữ [ ] Bỏ | |
| 8 | `CANCELLED` | Hủy/Hoàn tiền | [ ] Giữ [ ] Bỏ | |

**Thầy muốn thêm trạng thái nào?**
- [___________________________________]
- [___________________________________]

---

### 2.3 Ai có quyền thay đổi trạng thái ứng viên?

**Điền vai trò có quyền thực hiện (có thể nhiều vai trò):**

| Hành động | Ai thực hiện? | Ghi chú |
|-----------|---------------|---------|
| Tạo ứng viên mới (NEW) | [___] | |
| NEW → CONTACTED | [___] | |
| CONTACTED → CONSULTING | [___] | |
| CONSULTING → QUALIFIED | [___] | |
| QUALIFIED → DEPOSITED | [___] | Khi nào? Khi UV đóng tiền? |
| DEPOSITED → ENROLLED | [___] | Đây là bước xác nhận HV chính thức |
| Bất kỳ → REJECTED | [___] | |
| Bất kỳ → CANCELLED | [___] | Khi nào? Hoàn tiền trong 14 ngày? |

---

### 2.4 Thông tin ứng viên cần thu thập

**Đánh dấu ✅ các trường bắt buộc:**

| Trường | Bắt buộc? | Ghi chú |
|--------|-----------|---------|
| Họ tên | [ ] Có [ ] Không | |
| Số điện thoại | [ ] Có [ ] Không | |
| Email | [ ] Có [ ] Không | |
| Ngày sinh | [ ] Có [ ] Không | |
| Giới tính | [ ] Có [ ] Không | |
| Địa chỉ (Tỉnh/Thành) | [ ] Có [ ] Không | |
| Trình độ học vấn | [ ] Có [ ] Không | |
| Chương trình quan tâm | [ ] Có [ ] Không | |
| Kinh nghiệm làm việc | [ ] Có [ ] Không | |
| Trình độ tiếng Nhật | [ ] Có [ ] Không | |
| Ghi chú | [ ] Có [ ] Không | |

**Thầy muốn thêm trường nào?**
- [___________________________________]
- [___________________________________]

---

## PHẦN 3: HỆ THỐNG ĐIỂM & HOA HỒNG

### 3.1 Thời điểm tính điểm

**Đánh dấu ✅ thời điểm điểm được GHI NHẬN (PENDING):**

- [ ] Khi ứng viên DEPOSITED (đóng cọc)
- [ ] Khi ứng viên ENROLLED (học viên chính thức)
- [ ] Khác: [___________________________________]

**Đánh dấu ✅ thời điểm điểm được XÁC NHẬN (CONFIRMED):**

- [ ] Ngay khi ghi nhận
- [ ] Sau 7 ngày không hoàn phí
- [ ] Sau 14 ngày không hoàn phí
- [ ] Admin duyệt thủ công
- [ ] Khác: [___________________________________]

---

### 3.2 Quy trình rút điểm

**Điều kiện rút điểm (đánh dấu ✅ các điều kiện áp dụng):**

- [ ] Đã hoàn thành KYC
- [ ] Tài khoản >= 30 ngày tuổi
- [ ] Điểm tối thiểu: [___] điểm (mặc định 500)
- [ ] Không có cảnh báo gian lận
- [ ] Khác: [___________________________________]

**Ai duyệt yêu cầu rút điểm?**

- [ ] **A.** Tự động duyệt nếu đủ điều kiện
- [ ] **B.** Admin duyệt thủ công tất cả
- [ ] **C.** Tự động nếu <= [___] điểm, Admin duyệt nếu lớn hơn
- [ ] **D.** Khác: [___________________________________]

**Thời gian xử lý rút điểm:**
- Sau khi duyệt, chuyển khoản trong: [___] ngày làm việc

---

### 3.3 Xác nhận thông tin bảng điểm

**Theo tài liệu Business Logic, em hiểu như sau. Thầy xác nhận:**

| Thông tin | Em hiểu | Thầy xác nhận |
|-----------|---------|---------------|
| 1 điểm = ? VNĐ | 1.000 VNĐ | [ ] Đúng [ ] Sai: [___] |
| CTV Cơ bản hệ số | ×1.0 | [ ] Đúng [ ] Sai: [___] |
| CTV Vàng hệ số | ×1.15 | [ ] Đúng [ ] Sai: [___] |
| CTV Kim Cương hệ số | ×1.30 | [ ] Đúng [ ] Sai: [___] |
| Lên Vàng cần | 5 HV thành công | [ ] Đúng [ ] Sai: [___] |
| Lên Kim Cương cần | 10 HV thành công | [ ] Đúng [ ] Sai: [___] |

---

## PHẦN 4: DANH MỤC CHƯƠNG TRÌNH

### 4.1 Danh sách chương trình đào tạo

**Thầy kiểm tra và bổ sung:**

| # | Tên chương trình | Mã | Giữ/Bỏ | Điểm CTV (cơ bản) | Điểm MS1 (Lead-TTao) |
|---|------------------|-----|--------|-------------------|---------------------|
| 1 | Tiếng Nhật dự bị PTN | PTN | [ ] | 200 | 700 |
| 2 | TTS 1 năm | TTS1 | [ ] | 450 | 1.500 |
| 3 | Lưu học | LH | [ ] | 1.000 | 3.000 |
| 4 | TTS 3 năm | TTS3 | [ ] | 1.000 | 3.000 |
| 5 | Kaigo (Điều dưỡng) | KAIGO | [ ] | 1.000 | 3.000 |
| 6 | NP1 | NP1 | [ ] | 1.000 | 3.000 |
| 7 | JPC Sơ cấp | JPC | [ ] | 1.000 | 3.000 |
| 8 | Kỹ năng đặc định | KNDD | [ ] | 1.000 | 3.000 |
| 9 | Kỹ sư (đăng ký) | KS_DK | [ ] | 1.000 | 3.000 |
| 10 | Kỹ sư (sau PV) | KS_PV | [ ] | 300 | 1.000 |
| 11 | Nhân sự cao cấp | NSCC | [ ] | 1.000 | 4.000 |
| 12 | JPC - HK1 | JPC_HK1 | [ ] | 1.000 | 3.000 |
| 13 | JPC - HK2 | JPC_HK2 | [ ] | 250 | 500 |
| 14 | JPC - HK3 | JPC_HK3 | [ ] | 250 | 500 |

**Thầy muốn thêm chương trình nào?**

| Tên | Mã | Điểm CTV | Điểm MS1 |
|-----|-----|----------|----------|
| [___] | [___] | [___] | [___] |
| [___] | [___] | [___] | [___] |

---

## PHẦN 5: KYC (XÁC THỰC DANH TÍNH)

### 5.1 Thông tin KYC cần thu thập

**Đánh dấu ✅ các trường cần thu thập cho KYC:**

| Trường | Cần? | Bắt buộc? |
|--------|------|-----------|
| Số CCCD/CMND | [ ] | [ ] |
| Ảnh mặt trước CCCD | [ ] | [ ] |
| Ảnh mặt sau CCCD | [ ] | [ ] |
| Ảnh chân dung (selfie) | [ ] | [ ] |
| Số tài khoản ngân hàng | [ ] | [ ] |
| Tên chủ tài khoản | [ ] | [ ] |
| Tên ngân hàng | [ ] | [ ] |
| Chi nhánh ngân hàng | [ ] | [ ] |
| Địa chỉ thường trú | [ ] | [ ] |

**Ai duyệt KYC?**
- [ ] Admin duyệt thủ công
- [ ] Tự động (nếu thông tin hợp lệ)

---

## PHẦN 6: CÂU HỎI BỔ SUNG

### 6.1 Thông báo (Notifications)

**Thầy muốn gửi thông báo qua kênh nào?**

- [ ] In-app notification (trên website)
- [ ] Email
- [ ] SMS
- [ ] Zalo ZNS
- [ ] Push notification (app mobile - tương lai)

### 6.2 Báo cáo

**Thầy cần những báo cáo nào?**

- [ ] Báo cáo ứng viên theo ngày/tuần/tháng
- [ ] Báo cáo doanh thu theo chương trình
- [ ] Báo cáo hiệu suất CTV/MS2/MS1
- [ ] Báo cáo điểm thưởng đã chi
- [ ] Khác: [___________________________________]

### 6.3 Câu hỏi khác từ Thầy

**Thầy có câu hỏi hoặc yêu cầu gì khác không?**

```
[Thầy điền ở đây]




```

---

## HOÀN THÀNH

Sau khi điền xong file này, Thầy:

1. **Lưu file**
2. **Gửi cho Claude Code** bằng cách nói: *"Em ơi, Thầy đã điền xong file câu hỏi nghiệp vụ rồi. Em đọc và tạo database giúp Thầy nhé."*

Claude Code sẽ đọc file này và:
- Generate SQL script tạo database
- Tạo file hướng dẫn nhập dữ liệu mẫu
- Kết nối data thật vào code

---

**Cảm ơn Thầy đã dành thời gian điền form này!**
