---
description: Quy tắc viết commit message cho dự án CEO Directives
---

# Quy tắc Commit Message

## Ngôn ngữ
- **Viết bằng tiếng Việt có dấu đầy đủ**
- Dùng ngôn ngữ **nghiệp vụ (business)**, KHÔNG dùng thuật ngữ kỹ thuật (refactor, spawn, pipe, stdio, ...)
- Người đọc là CEO / quản lý, không phải developer

## Cấu trúc
Mỗi commit message phải ghi rõ:

1. **TRƯỚC KHI SỬA** — tình trạng cũ, vấn đề gặp phải
2. **SAU KHI SỬA** — kết quả đạt được, thay đổi cụ thể

## Ví dụ

```
Sửa lỗi bảng điều khiển không khởi động được bot

TRƯỚC: Các nút Bật/Tắt/Restart trên bảng điều khiển không phản hồi, bot không khởi động được, console không hiển thị log
SAU: Tất cả nút hoạt động, 4 dịch vụ khởi động đúng, console hiển thị log thời gian thực trên giao diện web
```

## Lưu ý
- Không viết commit 1 dòng chung chung kiểu "fix bug" hay "update code"
- Phải mô tả được **ảnh hưởng thực tế** đến người dùng / hệ thống
- Giữ ngắn gọn nhưng đủ ý
