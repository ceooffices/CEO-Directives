# SYSTEM AUDIT
*Cập nhật: 07/04/2026 — Gravity*

## TRẠNG THÁI HỆ THỐNG

### Kiến trúc hiện tại

| Layer | Component | Trạng thái |
| --- | --- | --- |
| **Frontend** | Next.js 16 (`web/`) | 🟢 Light Theme iOS Mobile-First (Viewport optimized) |
| **BOD Meeting** | GAS Dashboard (`bod_meeting/`) | 🟢 ACTIVE — Thu đăng ký & quản lý BOD |
| **Database** | Supabase (PostgreSQL) | 🟢 LIVE (Kết nối domain `fgiszdvchpknmyfscxnp`) |
| **Cron / Automations** | Node Scripts / Workflow | 🟢 7-step Pipeline, Escalation Rules, NKHĐS Reports |
| **API** | App Router API & Endpoints | 🟢 Tích hợp `getServiceClient` bypass RLS cho Dashboard |
| **Email** | SMTP + Tracking pixel | 🟢 URL Tracking chuẩn: `ceodirectives.vercel.app` |
| **Environment** | Quản lý biến môi trường | 🟢 Đồng bộ Supabase/Vercel secrets qua `.env.local` |

### Dữ liệu Live Supabase (Báo cáo mới nhất 07/04/2026)

| Metric | Giá trị | Ghi chú |
|--------|---------|---------|
| `employee_commitments`| 256 rows | Đủ thông tin Name, Role, Commit Number, Target |
| **KPI Nhập học (Thực tế)**| **25.112** | Gom cả từ khóa "nhập học", "tuyển sinh", "khai giảng", "cả hai" |
| **KPI Matching (Thực tế)**| **25.383** | Gom cả từ khóa "matching", "xuất cảnh", "cả hai" |
| *BOD 07/04/2026 Seed*| 127 Matching | Nguồn Báo cáo OneTeam BOD 07/04 (Đã tích hợp ghi đè khi Db có số) |

### Active Components (07/04/2026)

- `web/` → 🟢 **Dashboard CEO Mobile-First**: 
  Thân thiện với iOS Pro Max. Loại bỏ hoàn toàn Dark mode cũ, thay bằng Light Theme sang trọng, phong cách thẻ trắng (card) bo góc, CTA to, rõ ràng, giúp CEO thao tác chỉ bằng một tay.
- `automation/` → 🟢 **NemoClaw Workflows**:
  Đã hoàn thiện các luồng WF7 (Pre-flight checks), WF8 (NKHĐS automation báo cáo gửi email stakeholder).
- `supabase.ts` → 🟢 **Database Interface**:
  Toàn bộ các Data Fetching functions trên NextJS App Router đã dùng `getServiceClient()` để fetch data server-side không lo lỗi schema rỗng từ public RLS.

### Đã archive (Theo thời gian)

- `archive/apps-script/` → GAS form creator (1 lần, đã tạo xong)
- `archive/automation_n8n/` → n8n workflows (Chuyển sang Node.js chạy ổn định hơn)
- `archive/...` → Các form processor thừa của WF2/WF5 bị xoá bớt, gộp chung luồng xử lý.

---

## LỊCH SỬ NÂNG CẤP & SPRINT HIỆN TẠI: Sprint Redesign UI & Live DB

### Cột mốc hoàn thành (07/04/2026)

- [x] **Mobile-first UI/UX Overhaul**: Chuyển toàn bộ giao diện sang Light Theme. Tạo không gian SafeArea insets dưới chân trang (pb-safe) chống đè vạch Home Bar của iPhone 15/17 Pro Max.
- [x] **Upscaling Typography**: Tăng min 3-4 sizes cho toàn bộ font text trên giao diện từ Tab Navigation, Stat Cards, KPI Cards, đến Pipeline 7 Bước và Bảng Chỉ Đạo để dễ đọc.
- [x] **Data Analytics Fix (KPIs)**: Fix lỗi count dữ liệu thiếu khi nhân viên để Target: `"Khai giảng"` hoặc `"Cả hai / 両方"`.
- [x] **Vercel Integration URL**: Dọn dẹp thống nhất 100% URL Hyperlink, Dashboard URL và Email Tracking pixels về `ceodirectives.vercel.app`.
- [x] **Production DB Switch**: Ngắt kết nối Supabase Local/Mock (`wegkeiqpxubresjhpccu`) và chỉ điểm thẳng vào Live Production (`fgiszdvchpknmyfscxnp`). Tất cả dashboard queries server-side đã chạy trơn tru.

### Việc tiếp theo trên Radar

- [ ] Giám sát Vercel Deployments sau khi Push Github (kiểm tra Environment Variables).
- [ ] Tiếp tục đưa Timeline Dữ liệu BOD mới (nếu có cuộc họp tuần tới) vào cơ sở dữ liệu Supabase.
- [ ] Cải thiện tốc độ phản hồi Telegram Bot / Signal Bot (Phase Integration NemoClaw).
