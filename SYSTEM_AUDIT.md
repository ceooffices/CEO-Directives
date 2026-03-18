# SYSTEM AUDIT
*Cập nhật: 18/03/2026 — Gravity*

## TRẠNG THÁI HỆ THỐNG

### Kiến trúc hiện tại

| Layer | Component | Trạng thái |
| --- | --- | --- |
| **Frontend** | Next.js 16 (`web/`) | 🟢 12 routes, build pass |
| **BOD Meeting** | GAS Dashboard (`bod_meeting/`) | 🟢 ACTIVE — Thu đăng ký & quản lý BOD |
| **Database** | Supabase (PostgreSQL) | 🟢 52 directives, 366 staff, 50 hm50 |
| **Cron** | Edge Function `auto-escalation` | 🟢 ACTIVE — 8h sáng hàng ngày |
| **API** | 5 endpoints (status, confirm, approve, escalate, remind) | 🟢 All working |
| **Email** | SMTP + tracking pixel | 🟡 Template có, chưa gửi email thật |
| **Signal** | REST API briefing | 🟡 Script sẵn sàng, chưa kết nối Signal server |
| **AI** | Chưa tích hợp | 🔴 Cần AI Router (Gemini/OpenAI) |

### Dữ liệu Supabase (17/03/2026)

| Metric | Giá trị | Ghi chú |
|--------|---------|---------
| `directives` | 52 rows | 25 BOD 16/03 + 15 BOD 09/03 + 12 BOD 02/03 |
| `staff` | 366 rows | Nhân sự Esuhai, có email + department |
| `hm50` | 50 rows | BSC classified, directive_count đã seed |
| `engagement_events` | 0 rows | Cron sáng mai sẽ tạo events đầu tiên |
| `t1_email` | **52/52 (100%)** | ✅ Mapped hoàn tất |
| `phan_loai_giao` | 39 cá nhân, 8 nhóm, 5 tổng thể | ✅ Phân loại 3 tầng |
| `t4_thoi_han` | 18/52 có deadline | ⚠️ 34 chưa có deadline |
| `confirmed_at` | 0/52 | ❌ Chưa ai xác nhận 5T |
| `approved_at` | 0/52 | ❌ Chưa ai duyệt |

### Active Components (18/03/2026)

- `bod_meeting/` → 🟢 GAS Dashboard **ĐANG HOẠT ĐỘNG** (thu đăng ký, form, email BOD)
- `web/` → 🟢 Next.js CEO Strategic Cockpit (tracking chỉ đạo, LELONGSON)
- `automation/` → 🟢 Node.js scripts (transcript parser, workflows, AI)

### Đã archive

- `archive/apps-script/` → GAS form creator (1 lần, đã tạo xong)
- `archive/automation_n8n/` → n8n workflows cũ (chuyển sang Node.js)
- `archive/ceo_cockpit/` → Dashboard prototype (thay bởi web/)
- `archive/core/` → Docs cũ v1.x

### Environment

- `web/.env.local` — Supabase credentials cho Next.js
- `automation/.env` — Toàn bộ credentials (Supabase, SMTP, Signal, AI)

---

## SPRINT HIỆN TẠI: Sprint 4-5 — Hoàn thành ✅

### Đã hoàn thành (17/03/2026)

- [x] Seed email 52/52 chỉ đạo (100%)
- [x] Edge Function auto-escalation deployed + ACTIVE
- [x] Cron job `0 1 * * *` (8h sáng VN) — đã tạo qua pg_cron
- [x] API /api/status nâng cấp (health_score, events, hm50_hot, CORS)
- [x] Dedup check — tìm 14 cặp trùng lặp giữa 3 BOD
- [x] Signal briefing script sẵn sàng
- [x] Phân loại chỉ đạo 3 tầng (cá nhân/nhóm/tổng thể)
- [x] CC list cho chỉ đạo tổng thể (7 BOD members)
- [x] Routing rules: MS → Dũng, Thầy Nam → Huỳnh Phước

### Việc tiếp theo

- [ ] Kích hoạt gửi email thật (xác nhận 5T + nhắc nhở)
- [ ] Bổ sung deadline cho 34/52 chỉ đạo
- [ ] Tích hợp AI Router (Gemini + OpenAI fallback)
- [ ] Dashboard hiển thị phan_loai_giao
- [ ] Deploy production lên Vercel
