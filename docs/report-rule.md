---
description: Quy tắc báo cáo kỹ thuật CEO-Directives — trung thực, tinh tế, hướng tới quyết định
---

# Quy tắc Báo cáo — CEO-Directives

> Adapt từ team-workflows (Tikme) — 17/03/2026
> Tích hợp triết lý **Cố vấn Đồng hành** + Carl Jung SELF

## Nguyên tắc nền tảng

> **Trung thực trước, ấn tượng sau.**
> Không bao giờ đưa con số như sự thật tuyệt đối. Luôn nói rõ giới hạn, sai số, và bối cảnh.

## Văn phong — SELF (Carl Jung) × Cố vấn Đồng hành

```
Trong Phân tâm học Carl Jung, con người có 4 nguyên mẫu:
  Ego     — cái tôi ý thức, muốn thể hiện
  Persona — mặt nạ xã hội, viết để gây ấn tượng
  Shadow  — phần tối, che giấu điểm yếu
  SELF    — bản thể toàn vẹn, cân bằng ánh sáng & bóng tối

Triết lý Cố vấn Đồng hành: Nhận diện hành vi qua metadata — không phán xét, chỉ hỗ trợ.

→ KHÔNG tô hồng (Persona): "Tất cả đầu mối đều đang tuân thủ tốt"
→ KHÔNG tiêu cực (Shadow): "Đầu mối chưa mở email — cần nhắc nhở"
→ CÂN BẰNG (Self): "3/5 đầu mối đã mở email. 2 đầu mối chưa có tương tác — hệ thống sẽ đồng hành hỗ trợ."
```

### Áp dụng vào CEO-Directives

| Nguyên tắc | Giải thích | Ví dụ |
|:-----------|:-----------|:------|
| **Chánh kiến** | Trình bày đúng bản chất, không thiên lệch | ✅ "3/5 email đã mở" · ❌ "Hầu hết đã đọc" |
| **Giá trị thông tin cao** | Mỗi câu giúp CEO ra quyết định | ✅ "Đầu mối A mở email 3 lần, click CTA" · ❌ "Có tương tác" |
| **Không tô hồng** | Nêu rõ đã làm VÀ chưa làm | ✅ "Tracking hoạt động, diff view đang build" · ❌ "Xong hết" |
| **Không bi quan** | Nêu hạn chế kèm hướng đi | ✅ "Email tracking chỉ biết mở/chưa mở — đủ nhận diện mức quan tâm" · ❌ "Không đo được thời gian đọc" |
| **Hướng tới quyết định** | Kết thúc bằng câu hỏi rõ ràng | ✅ "Cần xác nhận: gửi email hỗ trợ tự động sau 48h không mở?" · ❌ "Anh quyết nhé" |
| **Đồng hành, không phán xét** | Dùng từ Content Bible | ✅ "Cần quan tâm", "Hỗ trợ" · ❌ "Quá hạn", "Nhắc nhở" |

## Nguyên tắc trung thực (từ góp ý Sếp)

1. **Gắn "Độ tin cậy" cho mọi con số so sánh**
   - Dữ liệu đo trực tiếp (Supabase, tracking pixel) → 90%
   - So sánh với benchmark ngành → 70-75%
   - Ước tính gián tiếp → 65%

2. **Tự phản biện trước khi người khác phản biện**
   - Báo cáo so sánh → PHẢI có phần "Giới hạn & Rủi ro"
   - Nêu rõ điều kiện mà con số KHÔNG đúng

3. **"Đúng" quan trọng hơn "ấn tượng"**
   - Giọng văn bình tĩnh, dữ liệu nói thay
   - Một con số có bối cảnh tốt hơn mười con số in đậm

## Cấu trúc báo cáo chuẩn

```
📋 TIÊU ĐỀ BÁO CÁO
│
├── Header: Ngày / Người báo cáo / Kính gửi / Chủ đề
│
├── 1. KẾT QUẢ CHÍNH (đọc 30 giây hiểu ngay)
│   ├── Bảng tổng kết: đạt bao nhiêu, còn bao nhiêu
│   └── Callout: điểm nhấn quan trọng nhất
│
├── 2. BẰNG CHỨNG (screenshot kết quả)
│   ├── Screenshot dashboard / giao diện end-user
│   └── Caption giải thích ngắn
│
├── 3. CHI TIẾT (chỉ ai muốn đọc sâu mới cuộn xuống)
│   ├── Phân tích dữ liệu, tracking events
│   └── Timeline thay đổi
│
├── 4. HÀNH ĐỘNG TIẾP THEO
│   ├── Cần CEO quyết định
│   ├── Đang chờ (blocking)
│   └── Dự kiến timeline
│
└── Footer: Tên — Ngày
```

## Nguyên tắc screenshot

```
✅ ĐÚNG: Chụp KẾT QUẢ — dashboard, directive detail, engagement stats
❌ SAI:  Chụp QUÁ TRÌNH — terminal, code editor, log

Quy tắc:
1. Chỉ chụp kết quả end-user / CEO nhìn thấy
2. Không chụp quá trình kỹ thuật trừ điểm nhấn
3. Mỗi screenshot PHẢI có caption giải thích
```

## Template CSS chuẩn (mobile-first)

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', 'Noto Sans', system-ui, sans-serif;
  font-size: 16px;
  line-height: 1.75;
  color: #1a1a2e;
  background: #fff;
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 20px;
}

h1 { font-size: 28px; color: #0c4a6e; border-bottom: 3px solid #0ea5e9; padding-bottom: 12px; margin-bottom: 10px; }
h2 { font-size: 22px; color: #0369a1; margin-top: 32px; margin-bottom: 14px; padding-left: 14px; border-left: 4px solid #0ea5e9; }
h3 { font-size: 18px; color: #334155; margin-top: 22px; margin-bottom: 10px; }

.header-meta { font-size: 15px; color: #6b7280; margin-bottom: 30px; line-height: 1.9; }
.header-meta strong { color: #374151; }

table { width: 100%; border-collapse: collapse; margin: 14px 0 22px; font-size: 15px; }
th { background: #f0f9ff; color: #0369a1; font-weight: 600; text-align: left; padding: 10px 14px; border: 1px solid #e0f2fe; }
td { padding: 9px 14px; border: 1px solid #e5e7eb; vertical-align: top; }
tr:nth-child(even) td { background: #fafbfc; }

.callout { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; margin: 18px 0; border-radius: 0; font-size: 15px; }
.callout.important { background: #fef3c7; border-color: #f59e0b; }
.callout.success { background: #f0fdf4; border-color: #22c55e; }

.screenshot { margin: 16px 0; text-align: center; }
.screenshot img { max-width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.12); border: 1px solid #e5e7eb; }
.screenshot .caption { font-size: 14px; color: #9ca3af; margin-top: 8px; font-style: italic; }

blockquote { border-left: 4px solid #0ea5e9; padding: 12px 20px; margin: 14px 0; color: #4b5563; font-style: italic; font-size: 15px; }
blockquote strong { color: #1f2937; font-style: normal; }

.next-actions { background: #f8fafc; border: 2px solid #0ea5e9; padding: 20px; margin: 24px 0; }
.next-actions h3 { color: #0369a1; margin-top: 0; }
.next-actions ul { padding-left: 20px; }
.next-actions li { margin-bottom: 8px; font-size: 15px; }

.footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 14px; text-align: right; }
a { color: #0ea5e9; text-decoration: none; }

@media (min-width: 768px) { body { padding: 40px 50px; } }

@media print {
  body { padding: 20px 30px; font-size: 14px; }
  h1 { font-size: 24px; }
  h2 { font-size: 19px; }
  .screenshot img { box-shadow: none; }
  .page-break { page-break-before: always; }
}
```

## Checklist trước khi gửi

```
□ Kết quả chính nằm ở đầu báo cáo?
□ Đọc 30 giây đã hiểu được điều quan trọng nhất?
□ Tiếng Việt có dấu, dễ hiểu, không jargon?
□ Từ cấm Content Bible đã thay hết? (nhắc nhở → hỗ trợ, leo thang → tín hiệu rủi ro)
□ Screenshot chỉ có kết quả, không có quá trình?
□ Có mục "Hành động tiếp theo" rõ ràng?
□ HTML có <meta viewport> cho mobile?
□ Văn phong SELF — không tô hồng, không bi quan?
□ Mỗi câu giúp CEO ra quyết định?
```
