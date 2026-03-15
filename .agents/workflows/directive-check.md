---
description: Kiểm tra trạng thái các chỉ đạo CEO và báo cáo tình hình theo Triết lý Cố vấn Đồng hành (Advisor)
---

# Quy trình Kiểm tra Chỉ đạo (CEO Directive Check V2 - The Advisor)

## Mục đích
Hệ thống không đóng vai trò "Nhắc nợ" cơ học. Khi CEO mở conversation, Agent sẽ đóng vai trò Cố vấn (COO ảo), rà soát "Nhịp Đập" của 50 Chỉ đạo 5T, phát hiện các điểm nghẽn (Bottlenecks) và chủ động đề xuất các phương án "Mở nút thắt" (Unblocking) dựa trên tư duy, tâm tư của CEO (Transcript 4/2).

## Các bước thực hiện

// turbo-all

### 1. "Ngửi" Bối Cảnh (Context Sensing & Ingestion)
- Chạy truy vấn NotebookLM notebook `74ef5699-a615-4f0a-a76f-df3f331cc2ae` (File text từ 4/2) để cập nhật những tư tưởng, định hướng mới nhất của CEO.
- Mục tiêu: Hiểu rõ CEO đang trăn trở điều gì nhất trong tuần này để thiết lập mức độ ưu tiên (Impact_Score context).

### 2. Đo Lường Nhịp Đập (Rhythm Diagnostic từ Data thực tế của Đầu mối)
Sử dụng Notion MCP query database `308ce590-e9e6-810f-bb3d-cff3a0a3a681` (50 Chỉ đạo 5T) - Nơi tập hợp dữ liệu đổ về từ Form báo cáo n8n:
- Lọc các chỉ đạo có `Signal_Color` là 🟡 Vàng hoặc 🔴 Đỏ.
- Phân tích `Bottleneck_Log` (nội dung đầu mối ghi trong Form): Khó khăn là do Kỹ thuật, Nhân sự, hay Thiếu Quyết định từ CEO?
- Phân tích sự im lặng: Nếu mục 🟡 Vàng nhưng không có dữ liệu Form/Webhook đổ về quá 2 ngày, đánh dấu là **Silent Bottleneck**.

### 3. Đồng Hành & Cố Vấn Đầu Mối (Mentorship Preparation)
Thay vì soạn "Email nhắc deadline", với mỗi điểm nghẽn, Agent chuẩn bị "Thông điệp Unblock":
- Áp dụng triết lý 5T (Thuận, Thấu, Thích, Thương, Thông).
- Sử dụng nguyên lý Cialdini (đã định nghĩa trong `content_bible.md`).
- Trích xuất triết lý của CEO (như "Upgrade or Nothing", "Công thức 5W1H") từ Bước 1 để gợi ý hướng giải quyết.
- Đề xuất câu hỏi để hỏi thăm đầu mối: *"Hệ thống thấy hạng mục này đang đứng yên. Bottleneck hiện tại của anh/chị là gì? Có phải liên quan đến nguồn lực không, hệ thống có thể giúp gì?"*

### 4. Phiên Dịch Báo Cáo Tính Đa Chiều (Holistic Feedback for CEO)
Dịch báo cáo từ ngôn ngữ Tác nghiệp sang Ngôn ngữ Quản trị cho CEO:
```
📋 NHỊP ĐẬP TỔ CHỨC — [Ngày]

🔴 NGUY CƠ GÃY NHỊP (Cần CEO Quyết định/Unblock):
- [Tên Hạng Mục] (Impact: [Điểm]): [Tên đầu mối] đang kẹt ở [Vấn đề]. 
  → Nhận định Cố vấn: Vấn đề này vượt quá thẩm quyền của đầu mối, cần CEO ra quyết định phân bổ lại nguồn lực.

🟡 ĐANG MA SÁT (Agent đang hỗ trợ Unblock):
- [Tên Hạng Mục] (Impact: [Điểm]): Đang chậm nhịp. 
  → Hành động của Agent: Đã chuẩn bị thông điệp truyền cảm hứng và gợi ý giải pháp 5W1H cho [Tên đầu mối] (chờ duyệt để gửi).

🟢 DÒNG CHẢY XUYÊN SUỐT:
- [Số lượng] hạng mục đang duy trì nhịp độ bình thường. Nổi bật: [Tên HM hoàn thành].
```

### 5. Thực Thi Kép
- Xin phép CEO để gửi các **Thông điệp Unblock** tới đầu mối (không gửi email nhắc việc cơ học).
- Xin chỉ đạo của CEO đối với các mục 🔴 Nguy cơ gãy nhịp.

## Lưu ý Phương pháp luận
- Luôn giữ thái độ hỗ trợ, không phán xét đầu mối. Chúng ta giúp họ hoàn thành phần việc của tổ chức.
- Mọi email/tin nhắn tạo ra phải thấm đẫm phong cách của hệ tư tưởng Esuhai Group.
