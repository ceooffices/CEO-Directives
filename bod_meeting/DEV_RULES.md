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

## 3. QUY TẮC DEPLOY

### clasp push
- Chỉ đẩy code lên HEAD version trên GAS cloud
- **KHÔNG tự động cập nhật** Web App deployment
- Để cập nhật Web App public: vào Apps Script → Deploy → Manage deployments → chọn version mới

### Kiểm tra sau khi push
1. `clasp push` thành công (24 files)
2. Mở Sheet → menu BOD Tools → 🌐 Mở Dashboard → Dashboard hiển thị
3. Dashboard → icon ⚙ chân trang → AdminPage hiển thị

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
