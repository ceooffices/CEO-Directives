# QUY TẮC KỸ THUẬT — BOD MEETING DASHBOARD

**Version:** 1.0  
**Updated:** 05/03/2026  
**By:** Antigravity + Anh Kha  
**Status:** APPROVED — SOURCE OF TRUTH  

---

## 1. QUY TẮC VÀNG: FILE .GS KHÔNG BAO GIỜ ĐƯỢC PUSH LÊN CLOUD

### Nguyên tắc

| Loại file | Vai trò | Được clasp push? |
|-----------|---------|:-:|
| `.js` | **Code chạy thật** — clasp push đẩy lên GAS cloud | ✅ CÓ |
| `.gs` | **Bản tham khảo local** — bị `.claspignore` chặn | ❌ KHÔNG |
| `.html` | Template/module — clasp push đẩy lên GAS cloud | ✅ CÓ |

### Hệ quả bắt buộc

1. **MỌI thay đổi code backend PHẢI sửa trong file `.js`**, không phải `.gs`
2. File `.gs` chỉ dùng để tham khảo cú pháp GAS, **không phải nguồn thật**
3. Nếu sửa file `.gs` mà quên sửa `.js` → code trên cloud **KHÔNG thay đổi** → lỗi
4. Khi thêm hàm mới → thêm vào `.js` trước, `.gs` sửa sau (nếu cần)

### Lý do

`.claspignore` cấu hình:
```
v800_server_api.gs
v810_admin_api.gs
```
→ clasp push bỏ qua toàn bộ file `.gs`. Chỉ file `.js` được đẩy lên Google Apps Script.

---

## 2. QUY TẮC DASHBOARD: LUÔN DÙNG createTemplateFromFile

### Dashboard (dùng include pattern)

```javascript
// ✅ ĐÚNG — Dashboard cần scriptlet <?!= include() ?>
HtmlService.createTemplateFromFile("Dashboard").evaluate()

// ❌ SAI — include() sẽ không hoạt động
HtmlService.createHtmlOutputFromFile("Dashboard")
```

### AdminPage (file self-contained)

```javascript
// ✅ ĐÚNG — AdminPage gộp toàn bộ CSS+HTML+JS trong 1 file
HtmlService.createHtmlOutputFromFile("AdminPage")

// ❌ KHÔNG CẦN — AdminPage không dùng scriptlet
HtmlService.createTemplateFromFile("AdminPage").evaluate()
```

### Tóm tắt

| Page | Pattern | Hàm đúng |
|------|---------|----------|
| Dashboard | include() modular | `createTemplateFromFile().evaluate()` |
| AdminPage | self-contained | `createHtmlOutputFromFile()` |

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

```
bod_meeting/
├── .clasp.json          ← Config clasp (script ID)
├── .claspignore         ← Danh sách file bị bỏ qua khi push
├── appsscript.json      ← GAS manifest
│
├── Mã.js                ← Code gốc (CONFIG, menu, helpers)
├── v800_server_api.js   ← SERVER API + routing (NGUỒN THẬT)
├── v810_admin_api.js    ← ADMIN API (NGUỒN THẬT)
├── v820_email_templates.gs ← Email templates
│
├── v800_server_api.gs   ← THAM KHẢO — không push
├── v810_admin_api.gs    ← THAM KHẢO — không push
│
├── Dashboard.html       ← Entry point Dashboard (include pattern)
├── Css_*.html           ← CSS modules cho Dashboard
├── Html_Body.html       ← HTML layout Dashboard
├── Js_*.html            ← JS modules cho Dashboard
│
├── AdminPage.html       ← Trang quản trị (self-contained)
├── Admin_Css.html       ← CSS module (source cho AdminPage)
├── Admin_Html.html      ← HTML module (source cho AdminPage)
├── Admin_Js.html        ← JS module (source cho AdminPage)
│
├── _archive/            ← Backup cũ
├── CORE___RULES.md      ← Quy tắc nghiệp vụ
├── DEV_RULES.md         ← Quy tắc kỹ thuật (FILE NÀY)
└── content_bible.md     ← Nội dung chuẩn
```

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
| 05/03/2026 | Dashboard không mở từ Sheet | `showDashboardDialog` dùng redirect URL thay vì mở trực tiếp | Đổi sang `createTemplateFromFile().evaluate()` |

---

**KẾT THÚC TÀI LIỆU**
