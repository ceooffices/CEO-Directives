# 🔒 NOTION PROPERTIES LOCK – KHÔNG ĐƯỢC ĐỔI TÊN

> **Cảnh báo:** Toàn bộ hệ thống n8n phụ thuộc vào tên chính xác của các Properties dưới đây.
> Nếu đổi tên BẤT KỲ property nào → Workflow tương ứng sẽ LỖI NGAY LẬP TỨC.
> Liên hệ **hoangkha@esuhai.com** trước khi thay đổi bất kỳ điều gì.

---

## Database: CLARIFICATIONS (Chỉ đạo Cần Làm Rõ)

| Property | Loại | Workflow sử dụng | Ghi chú |
|---|---|---|---|
| `Tiêu đề` | Title | WF1 | Tên chỉ đạo |
| `TINH_TRANG` | Select | WF1 | Trạng thái: Chờ làm rõ, Đã gửi email, **Đã xác nhận 5T** |
| `✅ Đã duyệt bởi người chỉ đạo` | Select | WF1 | Chưa duyệt / Đã duyệt |
| `LENH_GUI_LOI_NHAC` | Select | WF1 | Gửi lời nhắc / Đã nhắc |
| `Nguồn` | Select | WF1 | CEO / BOD / GM |
| `Ngày nhận` | Date | WF1 | Ngày nhận chỉ đạo |
| `Nội dung gốc` | Rich Text | WF1 | Nội dung chỉ đạo gốc |
| `T1 - ĐẦU MỐI` | Relation | WF1 | Link đến HR DB |
| `T2 - NHIỆM VỤ` | Rich Text | WF1 | Mô tả nhiệm vụ |
| `T3 - CHỈ TIÊU` | Rich Text | WF1 | Đo lường kết quả |
| `T4 - THỜI HẠN` | Date | WF1 | Deadline |
| `Email đầu mối` | Rollup | WF1 | Từ T1-ĐẦU MỐI → Email |
| `Email người chỉ đạo` | Rollup | WF1 | Từ Người chỉ đạo → Email |
| `Tên người chỉ đạo` | Rollup | WF1 | Từ Người chỉ đạo → Name |
| `Tên đầu mối` | Rollup | WF1 | Từ T1-ĐẦU MỐI → Name |
| `Công việc (sau khi rõ)` | Relation | WF1 | Link sang Tasks DB |
| `Người chỉ đạo` | Relation | WF1 | Link đến HR DB |

## Database: TASKS (Công việc) — ⚠️ ARCHIVE từ v1.5, WF2 đã deprecated

| Property | Loại | Workflow sử dụng |
|---|---|---|
| `Tiêu đề` (Title) | Title | WF2, WF3, WF5 |
| `T2 - Nhiệm vụ` | Rich Text | WF2 |
| `T3 - Chỉ tiêu` | Rich Text | WF2 |
| `T4 - Thời hạn` | Date | WF2, WF3, WF5 |
| `Tình trạng` | Select | WF2, WF3, WF5 |
| `Ưu tiên` | Select | WF2 |
| `Cấp độ` | Select | WF2 |
| `Chỉ đạo Cần Làm Rõ` | Relation | WF2 |
| `Ghi chú & Trở ngại` | Rich Text | WF4 |

## Database: WF LOGS

| Property | Loại | Workflow sử dụng |
|---|---|---|
| `Log` | Title | WF1 |
| `Workflow` | Select | WF1 |
| `Status` | Select | WF1 |
| `Clarification` | Relation | WF1 |
| `Details` | Rich Text | WF1 |
| `Email To` | Email | WF1 |

## Database: MESSAGE LIBRARY

| Property | Loại | Workflow sử dụng |
|---|---|---|
| `Nội dung` | Title | WF3 |
| `Category` | Select | WF3 |
| `Active` | Checkbox | WF3 |
| `Used Count` | Number | WF3 |
