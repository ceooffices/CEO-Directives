# QUY TẮC KỸ THUẬT — BOD MEETING DASHBOARD

**Version:** 1.2  
**Updated:** 18/03/2026  
**By:** Antigravity + Anh Kha  
**Status:** APPROVED — SOURCE OF TRUTH  

---

## 1. QUY TẮC VÀNG: CHỈ DÙNG FILE `.js` CHO CODE BACKEND

### Nguyên tắc

| Loại file | Vai trò | Được clasp push? |
|-----------|---------|:-:|
| `.js` | **Code chạy thật** — clasp push đẩy lên GAS cloud | ✅ CÓ |
| `.html` | Template/module — clasp push đẩy lên GAS cloud | ✅ CÓ |

### Hệ quả bắt buộc

1. **MỌI code backend PHẢI dùng extension `.js`** (kể cả email templates)
2. Khi thêm hàm/file mới → luôn tạo file `.js`
3. File component CSS/JS cho Dashboard đã được build sẵn vào `Dashboard.html` → liệt kê trong `.claspignore` để không push trùng

### v1.1 — THAY ĐỔI
- Đã đổi tên `v820_email_templates.gs` → `v820_email_templates.js` để nhất quán
- Loại bỏ convention giữ file `.gs` tham khảo (gây nhầm lẫn)

---

## 2. QUY TẮC HTML PAGE: DÙNG createHtmlOutputFromFile

### Cả Dashboard và AdminPage đều đã build sẵn (self-contained)

`Dashboard.html` được tạo bởi `build_dashboard.ps1` — gộp toàn bộ CSS+HTML+JS component vào 1 file (221KB). Không còn scriptlet `<?!= include() ?>`.

```javascript
// ✅ ĐÚNG — Cả 2 page đều self-contained
HtmlService.createHtmlOutputFromFile("Dashboard")
HtmlService.createHtmlOutputFromFile("AdminPage")
```

### Tóm tắt

| Page | Build | Hàm đúng |
|------|-------|----------|
| Dashboard | Pre-built bởi `build_dashboard.ps1` | `createHtmlOutputFromFile()` |
| AdminPage | Self-contained | `createHtmlOutputFromFile()` |

> **Lưu ý:** Nếu sau này Dashboard quay lại dùng scriptlet `<?!= include() ?>`, phải đổi sang `createTemplateFromFile().evaluate()`.

---

## 3. QUY TRÌNH DEPLOY VÀ PHÂN LUỒNG MÔI TRƯỜNG

Để kiểm soát chặt chẽ, không bắt người dùng phải deploy nhiều lần, áp dụng cơ chế 2 môi trường:

### Môi trường DEV (Test nội bộ)
- **URL sử dụng:** Link đuôi `/dev` (Click "Thử nghiệm bộ triển khai" / "Test deployments")
- **Đặc điểm:** Luôn chạy code mới nhất từ trạng thái HEAD (code vừa được `clasp push`).
- **Quy tắc:** MỌI tính năng mới, fix bug đều **PHẢI TEST TRÊN LINK /dev**. Người dùng không cần tạo Deploy mới. Antigravity tự push và tự test trên link /dev.

### Môi trường PRODUCTION (Sử dụng chính thức)
- **URL sử dụng:** Link đuôi `/exec`
- **Đặc điểm:** Cố định ở một phiên bản (Version) cụ thể. Chỉ thay đổi khi có lệnh Deploy mới.
- **Quy tắc:** Chỉ tạo Deploy mới khi **toàn bộ tính năng ở môi trường DEV đã được test hoàn hảo**.

### Chu trình 4 bước chuẩn
1. **Code & Push:** Antigravity sửa code và chạy `npx clasp push`
2. **Test DEV:** Antigravity/Owner kiểm tra mọi chức năng qua menu Sheets (pop-up) hoặc link Web App đuôi `/dev`
3. **Gom nhóm & Chốt (Freeze):** Gom tất cả các tính năng cần thiết thành một cụm phát hành (Release cụm).
4. **Deploy PRODUCTION (Duy nhất 1 lần):** Owner vào "Manage Deployments" -> chọn Version MỚI -> Deploy.

---

## 4. CẤU TRÚC FILE DỰ ÁN

```text
bod_meeting/                     ← 🔵 GAS: Thu đăng ký & Quản lý BOD Meeting
│
├── .clasp.json                  ← Config clasp (script ID, rootDir)
├── .claspignore                 ← Danh sách file bị bỏ qua khi push
├── appsscript.json              ← GAS manifest
├── build_dashboard.ps1          ← Script build Dashboard (gộp modules → 1 file)
│
│── ─── SERVER-SIDE CODE (.js) ──────────────────
├── Mã.js                        ← Main: Menu, Triggers, Approval, Test
├── v800_server_api.js           ← SERVER API + routing (Web Dashboard)
├── v810_admin_api.js            ← ADMIN API
├── v820_email_templates.js      ← Email HTML templates (song ngữ VN/JP)
├── v850_config.js               ← CONFIG object + loadConfigFromSheet
├── v851_helpers.js              ← Helpers, format, date, stats, lookup
├── v852_email_router.js         ← Email router (N8N/Gmail), plain text templates, log
├── v853_schedule.js             ← Schedule generation, refresh Dashboard Sheet
│
│── ─── DASHBOARD UI (.html) ───────────────────
├── Dashboard.html               ← Entry point Dashboard (pre-built)
├── Html_Body.html               ← HTML layout Dashboard
├── Css_Base.html                ← CSS base styles
├── Css_Components.html          ← CSS components
├── Css_Extras.html              ← CSS extras
├── Css_Modal.html               ← CSS modal dialogs
├── Css_Responsive.html          ← CSS responsive/mobile
├── Css_Timeline.html            ← CSS timeline
├── Js_Core.html                 ← JS core logic
├── Js_Approval.html             ← JS approval flow
├── Js_DeptSchedule.html         ← JS department schedule
├── Js_Email.html                ← JS email preview
├── Js_Helpers.html              ← JS helper functions
├── Js_Process.html              ← JS process flow
├── Js_Toast.html                ← JS toast notifications
│
│── ─── ADMIN UI (.html) ───────────────────────
├── AdminPage.html               ← Admin entry point (self-contained)
├── Admin_Css.html               ← Admin CSS
├── Admin_Html.html              ← Admin HTML layout
├── Admin_Js.html                ← Admin JS logic
│
└── docs/                        ← Documentation (ignored by clasp)
    ├── DEV_RULES.md             ← Quy tắc kỹ thuật (FILE NÀY)
    ├── CORE_RULES.md            ← Quy tắc nghiệp vụ
    ├── Full_Flows.md            ← Luồng xử lý đầy đủ
    ├── TEST_PLAN.md             ← Kế hoạch test
    ├── content_bible.md         ← Nội dung chuẩn
    └── n8n_bod_email_workflow.json ← WF email tham khảo
```

> **Lưu ý:** Ngoài `bod_meeting/`, repo còn có:
> - `web/` — Next.js CEO Strategic Cockpit (tracking chỉ đạo, tiến độ LLS Master)
> - `supabase/` — Backend cho web dashboard
> - `automation/` — Telegram Bot + n8n workflows

---

## 5. CHECKLIST TRƯỚC KHI PUSH

- [ ] Sửa code trong file `.js` (KHÔNG phải `.gs`)
- [ ] Kiểm tra `showDashboardDialog()` vẫn dùng `createTemplateFromFile`
- [ ] Kiểm tra `AdminPage` routing vẫn dùng `createHtmlOutputFromFile`
- [ ] `npx clasp push` thành công (24 files)
- [ ] `git add -A; git commit; git push origin main`
- [ ] Test Dashboard từ menu Sheet

---

## 6. SAI LẦM ĐÃ GẶP (BÀI HỌC)

| Ngày | Sai lầm | Nguyên nhân | Khắc phục |
|------|---------|-------------|-----------|
| 05/03/2026 | Dashboard trắng | Sửa `.gs` nhưng clasp chỉ push `.js` | Sửa trong `.js`, push lại |
| 05/03/2026 | AdminPage trắng | Dùng `createHtmlOutputFromFile` cho file có scriptlet | Gộp AdminPage thành self-contained |
| 05/03/2026 | Dashboard không mở từ Sheet | `showDashboardDialog` dùng redirect URL thay vì mở trực tiếp | Đổi sang `createHtmlOutputFromFile` (Dashboard đã pre-built) |
| 08/03/2026 | Reminder count luôn = 0 | `getDeptRegistrationStatus` không parse `dd/mm` (2 parts) | Thêm handle `sp.length === 2` |
| 08/03/2026 | Config AdminPage không có hiệu lực | `sendEmail()` không gọi `loadConfigFromSheet()` | Thêm load config đầu `sendEmail()` |
| 08/03/2026 | File `.gs` gây nhầm lẫn convention | `v820_email_templates.gs` trái với quy tắc chỉ dùng `.js` | Đổi tên → `.js` |

---

**KẾT THÚC TÀI LIỆU**
