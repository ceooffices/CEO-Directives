# CHANGELOG - 14/01/2026

**Session:** Điều chỉnh quy trình BOD Meeting  
**Thành phần họp:** Anh Kha, Chị Ly, Chị Vy, Dũng, Hiếu  
**Người thực hiện:** ClaudeK + Anh Kha

---

## THAY ĐỔI CHÍNH

### 1. 4T → 5T
- Thêm **T5 - Thành viên liên quan**: Ai cần phối hợp
- T5 do đầu mối tự xác định, không phải BOD chỉ định
- Cập nhật Form xác nhận (cần bổ sung entry ID cho T5)

### 2. Bỏ Tasks khỏi luồng chính
- Database Tasks → status: **ARCHIVED**
- Track chỉ đạo tại **Clarifications** (không tạo Tasks)
- WF2 → **DEPRECATED** (không tự động tạo Tasks nữa)
- Status cuối: "Đã xác nhận 5T" (thay vì "Đã tạo task")

### 3. Kiến trúc 7 → 6 Databases
- Bỏ Tasks khỏi luồng active
- Flow mới: Meetings → Outcomes → Clarifications (DỪNG)

---

## FILES UPDATED

| File | Old Version | New Version |
|------|-------------|-------------|
| CORE_RULES.md | 1.4 | **1.5** |
| BOD_FULL_FLOW.md | 1.0 | **1.1** |
| notion_id_mapping.json | 1.3 | **1.4** |
| PROJECT_INSTRUCTIONS.md | 1.2 | **1.3** |

---

## PENDING (Ưu tiên 2)

- [ ] Google Sheets: Thêm cột Thời lượng chỉ đạo
- [ ] Google Sheets: Tính lại timestamp (Trình bày + Chỉ đạo)
- [ ] Google Sheets: VLOOKUP email → Tên
- [ ] Email: Song ngữ Việt - Nhật
- [ ] Form: Bổ sung entry ID cho T5

---

## BƯỚC TIẾP THEO (Anh Kha)

1. Upload 4 files vào Project Knowledge:
   - CORE_RULES_v1_5.md
   - BOD_FULL_FLOW_v1_1.md
   - notion_id_mapping_v1_4.json
   - PROJECT_INSTRUCTIONS_v1.3.md (hoặc copy nội dung vào Instructions)

2. Cập nhật Custom Instructions trong Project Settings

3. Thông báo Hiếu bổ sung entry ID cho T5 trong Form

---

**Ghi chú:** Các file versioned (có số version) giữ lại để tracking history.
