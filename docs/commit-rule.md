---
description: Quy trình commit GitHub — format TRƯỚC/SAU cho CEO-Directives
---

# Quy trình Commit GitHub — CEO-Directives

> Adapt từ team-workflows (Tikme) — 17/03/2026

## Nguyên tắc bắt buộc

1. **KHÔNG BAO GIỜ dùng `git add .`** — phải add từng file cụ thể
2. **Commit message bằng tiếng Việt**, thuật ngữ kỹ thuật giữ nguyên + giải thích trong ngoặc đơn
3. **Mỗi commit = 1 mục tiêu rõ ràng**, không gộp nhiều việc khác nhau
4. **Viết cho người không rành công nghệ hiểu** — nói về giá trị business, bớt yếu tố kỹ thuật trừ điểm nhấn quan trọng

## Format commit message

```
[LABEL] Mô tả ngắn gọn

TRƯỚC: <tình trạng cũ>
SAU: <tình trạng mới — giá trị business>
```

### Labels

- `[OPS]` — hạ tầng, bảo mật, deploy, CI/CD
- `[FIX]` — sửa lỗi
- `[FEATURE]` — tính năng mới
- `[TÀI LIỆU]` — documentation, báo cáo
- `[REFACTOR]` — cải thiện code, không thay đổi logic
- `[CONTENT]` — nội dung, Content Bible, wording
- `[TRACKING]` — email tracking, engagement, metrics

### Ví dụ đúng — CEO-Directives

```
[FEATURE] Nâng cấp trang chi tiết chỉ đạo — thêm tracking & diff view

TRƯỚC: Trang chi tiết chỉ đạo chỉ hiện bảng 5T tĩnh, không biết email đã mở chưa, không có lịch sử thay đổi.
SAU: Dashboard tracking email realtime (mở/click), timeline kiểu GitHub grouped by date, diff view đỏ/xanh cho thay đổi nội dung — CEO thấy ngay đầu mối quan tâm ở mức nào.
```

```
[TRACKING] Thêm API nhận tracking pixel từ email chỉ đạo

TRƯỚC: Email gửi đi nhưng không biết người nhận có mở hay không.
SAU: API tự động ghi nhận khi đầu mối mở email, phân biệt bot (Apple Mail, Google Cache) vs người thật — dữ liệu chính xác hơn cho CEO đánh giá mức độ quan tâm.
```

```
[CONTENT] Cập nhật từ vựng theo Content Bible — triết lý Cố vấn Đồng hành

TRƯỚC: Dùng từ "nhắc nhở", "leo thang", "quá hạn" — tạo áp lực, phán xét.
SAU: "Hỗ trợ", "tín hiệu rủi ro", "cần quan tâm" — hỗ trợ, tinh tế, đồng hành cùng đầu mối.
```

## Phân biệt tác giả

| Account | Ai | Nhiệm vụ |
|:--------|:---|:---------|
| `ceooffices` | Anh Kha + Gravity (Frontend/QC) | UI, content, design, test |
| `ceooffices` | ClaudeCode (Backend) | Database, API, automation, infra |

> ⚠️ Phân biệt bằng **NỘI DUNG commit**, không phải account. Frontend → Gravity. Backend → ClaudeCode.

## Quy trình thực hiện

1. Kiểm tra `git status` — xác nhận files cần commit
2. `git add` từng file cụ thể (KHÔNG dùng `git add .`)
3. Viết commit message theo format TRƯỚC/SAU
4. `git commit`
5. `git push origin main`
6. Xác nhận push thành công
