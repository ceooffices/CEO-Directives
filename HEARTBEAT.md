# HEARTBEAT.md — CEO Directives Agent

## Checklist (chạy mỗi heartbeat)

- [ ] Gọi `GET /health` kiểm tra bridge còn sống
- [ ] Gọi `GET /status` lấy tổng quan chỉ đạo
- [ ] Gọi `GET /overdue?limit=5` kiểm tra chỉ đạo cần quan tâm
- [ ] Nếu có chỉ đạo cần quan tâm > 3 ngày: báo cáo qua Telegram

## Quy tắc

- Chỉ báo cáo khi có dữ liệu đáng chú ý (không spam)
- Tuân thủ Content Bible (từ cấm, emoji hạn chế)
- Nếu bridge offline: ghi log, không báo lỗi liên tục
