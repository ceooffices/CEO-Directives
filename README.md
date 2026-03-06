# CEO Directives — Hệ thống Xử lý Chỉ đạo BOD

> **EsuhaiGroup S2** — Quản lý & tự động hóa chỉ đạo từ BOD/CEO theo quy tắc 5T

---

## 📋 Tổng quan

Hệ thống chuyển đổi chỉ đạo BOD/CEO thành các Clarification items theo quy tắc **5T**, tự động phê duyệt 2 bước qua email, và theo dõi tiến độ trên Notion.

```
📅 Ghi chép cuộc họp (CEO tạo)
    ↓
🎯 Outcomes + 📋 Clarifications (quy tắc 5T)
    ↓
⚡ n8n WF1 → Email phê duyệt 2 bước
    ↓
✅ Đầu mối xác nhận 5T → Hoàn thành
```

### Quy tắc 5T

| T | Thành phần | Ý nghĩa |
|---|---|---|
| T1 | Tên đầu mối | Ai thực hiện |
| T2 | Nhiệm vụ | Làm gì cụ thể |
| T3 | Chỉ tiêu | Đo lường thế nào |
| T4 | Thời hạn | Deadline |
| T5 | Thành viên liên quan | Ai cần phối hợp |

---

## 🏗️ Kiến trúc

### Công nghệ

| Layer | Công nghệ |
|---|---|
| Database & Relations | **Notion** (6 databases) |
| Automation | **n8n** (workflows WF0–WF5) |
| Dashboard UI | **Google Apps Script** (HTML/CSS/JS) |
| Email | n8n → Gmail API |

### 6 Databases (Notion)

| # | Database | Vai trò |
|---|---|---|
| 1 | 📅 Ghi chép cuộc họp | NGUỒN ĐẦU VÀO |
| 2 | 🎯 Kết quả Mong đợi | Mục tiêu chiến lược |
| 3 | 📋 Chỉ đạo Cần Làm Rõ | Track chỉ đạo (thay Tasks) |
| 4 | 🏢 PROJECT HUB | Quản lý dự án |
| 5 | 👤 Danh Bạ Nhân Sự | Thông tin nhân sự |
| 6 | 📊 Báo cáo Tổng hợp | OUTPUT |

---

## 📁 Cấu trúc thư mục

```
CEO-Directives/
├── core/                      # Tài liệu core (Source of Truth)
│   ├── CORE_RULES.md          # Quy tắc cốt lõi v1.5
│   ├── PROJECT_INSTRUCTIONS.md # Hướng dẫn dự án v1.3
│   ├── BOD_FULL_FLOW.md       # Full flow xử lý
│   └── notion_id_mapping.json # Mapping Notion IDs v1.4
│
├── automation_n8n/            # n8n Workflows (bản latest)
│   ├── WF0_AutoSyncEmail_v1.0.json
│   ├── WF1_v14_NEW_DB_IDS.json        # ⭐ Main workflow
│   ├── WF1_ExtractData_v12.10.js
│   ├── WF3_v3_FIXED.json
│   ├── WF4_v3_FIXED.json
│   └── WF5_v2_FIXED.json
│
├── bod_meeting/               # BOD Meeting Dashboard (GAS)
│   ├── Dashboard.html         # Dashboard chính
│   ├── AdminPage.html         # Trang quản trị
│   ├── Mã.js                  # Code chính
│   ├── v800_server_api.js     # Server API
│   ├── v810_admin_api.js      # Admin API
│   ├── v820_email_templates.gs # Email templates
│   ├── Css_*.html             # CSS modules
│   ├── Js_*.html              # JS modules
│   └── *.md                   # Documentation
│
├── ban_chep_loi/              # Transcript cuộc họp BOD
├── archive/                   # Phiên bản cũ (reference only)
│
├── notion_properties_lock.md  # ⚠️ Properties KHÔNG được đổi tên
├── changelog.md               # Nhật ký thay đổi
└── README.md                  # File này
```

---

## ⚡ Workflows (n8n)

| WF | Tên | Mô tả | Status |
|---|---|---|---|
| **WF0** | Auto Sync Email | Đồng bộ email tự động | ✅ Active |
| **WF1** | 2-Step Approval (v14) | Gửi email phê duyệt 2 bước cho BOD & đầu mối | ✅ Active |
| **WF3** | Phối hợp CC-BCC | Gửi email phối hợp | ✅ Active |
| **WF4** | Normalize ID | Chuẩn hóa ID | ✅ Active |
| **WF5** | Duolingo Reminders | Nhắc nhở học tập | ✅ Active |
| ~~WF2~~ | ~~Xử lý Form Làm rõ~~ | ~~Deprecated từ v1.4~~ | ⛔ Deprecated |

### WF1 — Luồng 2 bước

```
STEP 1: BOD Chủ trì duyệt
  Trigger: Status = "Chờ làm rõ" + chưa duyệt
  → Email gửi BOD Chủ trì
  → BOD vào Notion duyệt

STEP 2: Đầu mối xác nhận 5T
  Trigger: Đã duyệt + chưa xác nhận
  → Email gửi Đầu mối (kèm T5)
  → Đầu mối submit form → "Đã xác nhận 5T" ✅
```

---

## ⚠️ Lưu ý quan trọng

- **KHÔNG đổi tên** Notion properties trong file `notion_properties_lock.md` — sẽ làm hỏng workflows
- **Source of Truth:** `core/CORE_RULES.md` > SOP > Schema > Prompt
- **Thiếu thông tin** → Tạo Clarification, KHÔNG tự suy đoán

---

## 👥 Team

| Vai trò | Người |
|---|---|
| CEO Assistant | Anh Kha |
| AI Assistant | ClaudeK |
| Liên hệ | hoangkha@esuhai.com |

---

## 📝 Changelog

| Version | Ngày | Thay đổi |
|---|---|---|
| v1.0 | 27/12/2025 | Initial commit |
| v1.3 | 27/12/2025 | Kiến trúc 7 databases |
| v1.4 | 03/01/2026 | WF1 v13: 2-step approval |
| **v1.5** | **14/01/2026** | **4T→5T, Bỏ Tasks, WF1 v14** |
