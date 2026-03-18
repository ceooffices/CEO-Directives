# TEST PLAN — BOD MEETING DASHBOARD
**Version:** v8.2 / v9.0
**Updated:** 2026-03-06
**Scope:** End-to-end testing toan bo logic Dashboard + Admin + Email + API

---

## MUC LUC

1. [Khoi dong & Quyen truy cap](#1-khoi-dong--quyen-truy-cap)
2. [Dashboard — Tab Dang ky](#2-dashboard--tab-dang-ky)
3. [Dashboard — Tab Quy trinh (4 giai doan)](#3-dashboard--tab-quy-trinh)
4. [Dashboard — Tab Lich trinh](#4-dashboard--tab-lich-trinh)
5. [He thong Email — Nhac nho dang ky](#5-email--nhac-nho-dang-ky)
6. [He thong Email — Nhac phe duyet](#6-email--nhac-phe-duyet)
7. [He thong Email — Ket qua phe duyet](#7-email--ket-qua-phe-duyet)
8. [He thong Email — Lich trinh](#8-email--lich-trinh)
9. [Approval Workflow](#9-approval-workflow)
10. [Admin Page — Cau hinh](#10-admin-page--cau-hinh)
11. [Admin Page — Phan quyen](#11-admin-page--phan-quyen)
12. [Admin Page — Email Templates](#12-admin-page--email-templates)
13. [BOD Hosting](#13-bod-hosting)
14. [Google Form Integration](#14-google-form-integration)
15. [Responsive & Cross-browser](#15-responsive--cross-browser)
16. [Edge Cases & Error Handling](#16-edge-cases--error-handling)
17. [Data Integrity](#17-data-integrity)
18. [Performance](#18-performance)

---

## 1. KHOI DONG & QUYEN TRUY CAP

### TC-1.1: Mo Dashboard lan dau
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Truy cap URL /dev hoac /exec | Trang Dashboard load thanh cong |
| 2 | Kiem tra header | Hien "BTC MEETING BOD" + subtitle |
| 3 | Kiem tra date picker | Mac dinh = ngay hop gan nhat (Thu 2 toi) |
| 4 | Kiem tra BOD Hosting banner | Hien ten + email + thoi gian nhiem ky |
| 5 | Kiem tra 3 tab | "Dang ky" / "Quy trinh" / "Lich trinh" hien day du |

### TC-1.2: Quyen truy cap — User chua duoc duyet
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Dang nhap bang email KHONG co trong Users sheet | Hien thong bao "Chua co quyen truy cap" |
| 2 | Email co trong Users nhung status = "pending" | Hien thong bao cho duyet |
| 3 | Email co trong Users, status = "blocked" | Bi chan, khong truy cap duoc |

### TC-1.3: Quyen truy cap — Admin vs Viewer
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Dang nhap voi role = "admin" | Hien day du cac chuc nang: chinh sua, gui email, admin link |
| 2 | Dang nhap voi role = "viewer" | Chi xem, KHONG co nut chinh sua/gui email |

### TC-1.4: Mo Admin Page
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Tu menu Google Sheets > "Admin Page" | Mo popup dialog thanh cong |
| 2 | Hoac truy cap ?page=admin | Redirect den Admin Page |
| 3 | Kiem tra 3 tab admin | "Cau hinh" / "Email" / "Phan quyen" |

---

## 2. DASHBOARD — TAB DANG KY

### TC-2.1: Stat Cards (5 the thong ke)
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Chon ngay hop co du lieu | 5 cards hien so: Tong / Da duyet / Cho duyet / Tu choi / Hoan |
| 2 | Chon ngay hop KHONG co du lieu | Tat ca cards hien "0" hoac "--" |
| 3 | Doi ngay hop khac | Cards cap nhat tuong ung |
| 4 | Kiem tra tong | Tong = Da duyet + Cho duyet + Tu choi + Hoan |

### TC-2.2: Bang trang thai bo phan (Dept Status Table)
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Load trang | Bang hien tat ca bo phan bat buoc (tu "Dim bo phan") |
| 2 | Bo phan DA dang ky | Badge xanh "Da dang ky", so dang ky > 0 |
| 3 | Bo phan CHUA dang ky | Badge do "Chua dang ky", so dang ky = 0 |
| 4 | Bo phan co dang ky nhung chua duyet het | Badge vang "Cho duyet" |
| 5 | Cot "Lan nhac" | Hien so lan da gui reminder trong tuan |
| 6 | Cot "Dai dien" | Hien ten lien he tu "Dim bo phan" |
| 7 | Cot "Email" | Hien email dai dien, co icon chinh sua |

### TC-2.3: Chinh sua email bo phan
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Click icon chinh sua email | Hien prompt nhap email moi |
| 2 | Nhap email hop le (abc@xyz.com) | Cap nhat thanh cong, hien email moi |
| 3 | Nhap email KHONG hop le (abc@) | Hien loi validation, khong luu |
| 4 | Bam Cancel | Khong thay doi gi |

### TC-2.4: Bang dang ky chi tiet (Registration Items Table)
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Load trang co du lieu | Bang hien tat ca dang ky: STT, Ho ten, BP, Noi dung, Thoi luong, Trang thai |
| 2 | Cot "Trang thai" | Hien badge mau: Xanh=Duyet, Do=Tu choi, Vang=Cho duyet, Tim=Hoan |
| 3 | Cot "Thu tu" | Hien so thu tu sap xep (0 = chua sap) |
| 4 | Toggle "Chinh sua" | Bat toggle: hien dropdown trang thai + input thu tu + input ghi chu |
| 5 | Tat toggle | An het cac input, quay ve badge |

### TC-2.5: Reset dem nhac nho
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Click "Reset dem" | Confirm dialog hien len |
| 2 | Xac nhan | Xoa Email Log tuan nay, tat ca cot "Lan nhac" ve 0 |
| 3 | Huy | Khong thay doi |

---

## 3. DASHBOARD — TAB QUY TRINH

### TC-3.1: Timeline 4 giai doan
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Khong co dang ky nao | GD1 = Active (xanh), GD2-4 = Pending (xam) |
| 2 | Co dang ky, tat ca BP bat buoc da nop | GD1 = Done (xanh la), GD2 = Active |
| 3 | Tat ca da phe duyet | GD1-2 = Done, GD3 = Active |
| 4 | Lich trinh da gui | GD1-3 = Done, GD4 = Active |
| 5 | Sau ngay hop | GD1-4 = Done |

### TC-3.2: Thanh tien trinh (Progress Bar)
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | 0 giai doan hoan thanh | Thanh = 0% |
| 2 | 1 giai doan hoan thanh | Thanh = 25% |
| 3 | 2 giai doan hoan thanh | Thanh = 50% |
| 4 | 4 giai doan hoan thanh | Thanh = 100% (xanh la) |

### TC-3.3: Mo rong/thu gon giai doan
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Click GD1 | Mo rong panel GD1, hien checklist + nut hanh dong |
| 2 | Click GD2 (khi GD1 dang mo) | Dong GD1, mo GD2 |
| 3 | Click GD dang mo | Thu gon lai |

### TC-3.4: Checklist tu dong — Giai doan 1 (Tiep nhan)
| Buoc | Dieu kien | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Form dang ky dang mo | Check "Form dang ky dang mo" = tich xanh |
| 2 | Co it nhat 1 dang ky | Check "Co dang ky tu bo phan" = tich xanh |
| 3 | Tat ca BP bat buoc da nop | Check "Tat ca bo phan bat buoc" = tich xanh |
| 4 | Nut "Mo Form Dang Ky" | Mo Google Form trong tab moi |

### TC-3.5: Checklist tu dong — Giai doan 2 (Phe duyet)
| Buoc | Dieu kien | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Co dang ky nhung chua duyet | Check "Xem xet noi dung" = chua tich |
| 2 | Da duyet/tu choi/hoan tat ca | Check "Tat ca da xu ly" = tich xanh |
| 3 | Nut "Luu Phe Duyet" | Scroll den bang dang ky, bat edit mode |

### TC-3.6: Checklist — Giai doan 3 (Lich trinh)
| Buoc | Dieu kien | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Chua co lich trinh | Tat ca check chua tich |
| 2 | Da tao lich trinh (chua gui) | Check "Sap xep" + "Xac nhan" = tich |
| 3 | Da gui lich trinh | Tat ca 3 check tich xanh |
| 4 | Nut "Gui Lich Trinh" | Chuyen sang Tab Lich trinh |

### TC-3.7: Deadline hien thi dung
| Buoc | Kiem tra | Ket qua mong doi |
|------|---------|------------------|
| 1 | GD1 deadline text | "Han dang ky: Thu Sau hang tuan" |
| 2 | GD2 deadline text | "Han phe duyet: Thu Bay hang tuan" |
| 3 | GD3 deadline text | "Gui lich trinh: Chu Nhat truoc 20:00" |
| 4 | GD4 deadline text | "Hoan thanh: Trong ngay hop hoac ngay sau" |

### TC-3.8: Quest Hints
| Buoc | Dieu kien | Ket qua mong doi |
|------|-----------|------------------|
| 1 | GD active | Hien icon TARGET + huong dan hanh dong cu the |
| 2 | GD done | Hien icon CHECK + thong bao hoan thanh |
| 3 | GD pending (chua mo khoa) | Hien icon LOCK + thong bao cho |

---

## 4. DASHBOARD — TAB LICH TRINH

### TC-4.1: Preview lich trinh
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Chua co dang ky duyet | Hien thong bao "Chua co noi dung duoc duyet" |
| 2 | Co dang ky da duyet | Bang preview: STT, Gio, Noi dung, Nguoi TB, TB(phut), CD(phut), Lien quan |
| 3 | Kiem tra gio bat dau | Dong dau = 08:30 (hoac theo cau hinh) |
| 4 | Kiem tra tinh gio | Dong 2 = 08:30 + TB1 + CD1 (vi du: 08:30 + 20 + 10 = 09:00) |
| 5 | Kiem tra tong thoi gian | Footer hien tong phut |

### TC-4.2: Thu tu trinh bay
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Dat thu tu o Tab Dang ky (1, 2, 3...) | Tab Lich trinh sap xep dung thu tu |
| 2 | 2 item cung thu tu = 0 | Sap xep theo timestamp dang ky |
| 3 | Thay doi thu tu va luu | Lich trinh cap nhat ngay |

### TC-4.3: Trang thai lich trinh
| Buoc | Dieu kien | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Chua tao | Nut "Tao Lich Trinh" hien |
| 2 | Da tao, chua gui | Banner "BAN NHAP", nut "Gui Lich Trinh" hien |
| 3 | Da gui/xac nhan | Banner "DA DUYET", chi xem, khong chinh sua |

### TC-4.4: Gui lich trinh
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Click "Gui Lich Trinh" | Hien preview email truoc khi gui |
| 2 | Xac nhan gui | Gui email den tat ca BOD members + presenters |
| 3 | Kiem tra Email Log | Ghi nhan type = "schedule" |
| 4 | Kiem tra trang thai | Chuyen sang "DA DUYET" |

---

## 5. EMAIL — NHAC NHO DANG KY

### TC-5.1: Gui nhac nho don le (1 bo phan)
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Click "Nhac" tai dong bo phan chua dang ky | Mo email preview modal |
| 2 | Kiem tra To | Email dai dien bo phan |
| 3 | Kiem tra CC | BTC_FIXED (vynnl, minhhieu, dungntt, hoangkha) |
| 4 | Kiem tra Subject | "[BOD MEETING] Nhac nho dang ky — {date}" |
| 5 | Xac nhan gui | Email gui thanh cong, toast thong bao |
| 6 | Kiem tra "Lan nhac" | Tang len 1 |

### TC-5.2: Leo thang Lan 1 (Xanh)
| Buoc | Kiem tra | Ket qua mong doi |
|------|---------|------------------|
| 1 | Header | Gradient xanh (#0f172a -> #2563eb) |
| 2 | Subject | "[BOD MEETING] Nhac nho dang ky — {date}" |
| 3 | Noi dung VN | "hoan tat dang ky truoc 17:00 Thu Sau" |
| 4 | Noi dung JP | "金曜日17:00までにご登録をお願いいたします" |
| 5 | Info box | "Han dang ky: Thu Sau, 17:00 / 金曜日 17:00" |
| 6 | Nut CTA | Xanh, "DANG KY BAO CAO / 報告を登録する" |
| 7 | Giai dieu | Than thien, moi goi, ton trong |

### TC-5.3: Leo thang Lan 2 (Vang)
| Buoc | Kiem tra | Ket qua mong doi |
|------|---------|------------------|
| 1 | Header | Gradient vang (#92400e -> #f59e0b) |
| 2 | Subject | "[BOD MEETING] Nhac nho lan 2 — {dept} chua dang ky" |
| 3 | Badge | "NHAC NHO LAN 2" (vang) |
| 4 | Noi dung | "TRONG HOM NAY", tone gap hon |
| 5 | Bang lich su | Hien 4 tuan gan nhat voi trang thai dang ky |
| 6 | Nut "Nhac" tren Dashboard | Mau vang |

### TC-5.4: Leo thang Lan 3+ (Do)
| Buoc | Kiem tra | Ket qua mong doi |
|------|---------|------------------|
| 1 | Header | Gradient do (#7f1d1d -> #ef4444) |
| 2 | Subject | "[BOD MEETING] Nhac nho KHAN lan {n}" |
| 3 | Badge | "NHAC KHAN LAN {n}" (do) |
| 4 | CC | THEM BOD Hosting email (ngoai BTC_FIXED) |
| 5 | Noi dung | Cho 2 lua chon: Dang ky HOAC Xac nhan khong bao cao |
| 6 | Canh bao | "Email da CC Ban To Chuc va Ban Giam Doc" |
| 7 | Nut "Nhac" tren Dashboard | Mau do |

### TC-5.5: Gui nhac nho hang loat (Bulk)
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Click "Nhac tat ca" | Confirm dialog: "Gui nhac nho {n} bo phan?" |
| 2 | Xac nhan | Gui lien tuc cho tat ca BP chua dang ky (delay 500ms/email) |
| 3 | Kiem tra | Moi BP nhan dung lan nhac tuong ung (khong reset ve lan 1) |
| 4 | Tat ca BP da dang ky | Nut "Nhac tat ca" bi disable |

### TC-5.6: Bang thong ke dang ky trong email
| Buoc | Dieu kien | Ket qua mong doi |
|------|-----------|------------------|
| 1 | BP bo 1+ tuan | Bang hien 4 tuan gan nhat |
| 2 | Tuan da dang ky | Hien "Da dang ky" (xanh la) |
| 3 | Tuan chua dang ky | Hien "Chua dang ky" (do) |
| 4 | Tuan hien tai | Danh dau "Tuan nay" voi icon |
| 5 | Dong tong ket | "{X}/{Y} tuan da dang ky" + mau tuong ung |
| 6 | >= 75% | Dong tong ket xanh |
| 7 | 50-74% | Dong tong ket vang |
| 8 | < 50% | Dong tong ket do |

### TC-5.7: Song ngu (Bilingual)
| Buoc | Kiem tra | Ket qua mong doi |
|------|---------|------------------|
| 1 | Tieng Viet | 14px, noi dung chinh, phia tren |
| 2 | Tieng Nhat | 12px, khoi rieng, phia duoi, vien trai mau |
| 3 | Nut CTA | Song ngu: "DANG KY BAO CAO / 報告を登録する" |
| 4 | Info box | Song ngu: "Ngay hop / 会議日", "Han dang ky / 登録期限" |
| 5 | Footer | Song ngu: "Email tu dong... / 自動送信メール..." |

### TC-5.8: Nguoi Nhat (JP Detection)
| Buoc | Dieu kien | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Email co ".jp@esuhai.com" | Tu dong nhan dien la nguoi Nhat |
| 2 | Ten thuoc jpNames list | Tu dong nhan dien |
| 3 | Khi gui email cho nguoi JP | Template bilingual duoc ap dung dung |

---

## 6. EMAIL — NHAC PHE DUYET

### TC-6.1: Gui nhac phe duyet
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Click nut nhac phe duyet (Tab Dang ky) | Mo preview modal |
| 2 | Kiem tra To | Email BTC team |
| 3 | Kiem tra noi dung | "{n} dang ky dang cho phe duyet" |
| 4 | Kiem tra deadline | "17:00 Thu Bay" (VN) / "土曜日17:00" (JP) |
| 5 | Info box | "Han phe duyet: Thu Bay, 17:00" |
| 6 | Nut CTA | "MO DASHBOARD PHE DUYET" (gradient vang) |
| 7 | Xac nhan gui | Email gui, log ghi nhan |

### TC-6.2: Khong co noi dung cho duyet
| Buoc | Dieu kien | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Tat ca da phe duyet (pending = 0) | Nut nhac phe duyet bi disable hoac an |

---

## 7. EMAIL — KET QUA PHE DUYET

### TC-7.1: Email Duyet (Approved)
| Buoc | Kiem tra | Ket qua mong doi |
|------|---------|------------------|
| 1 | Badge | Xanh la (#10b981), "DUYET" |
| 2 | Noi dung | Chuc mung, huong dan buoc tiep theo |
| 3 | To | Email nguoi dang ky |

### TC-7.2: Email Tu choi (Rejected)
| Buoc | Kiem tra | Ket qua mong doi |
|------|---------|------------------|
| 1 | Badge | Do (#ef4444), "CAN DIEU CHINH" |
| 2 | Noi dung | Ghi chu tu BOD Hosting, khuyen khich gui lai tuan sau |
| 3 | GhiChu | Hien ro ly do tu choi |

### TC-7.3: Email Hoan (Postponed)
| Buoc | Kiem tra | Ket qua mong doi |
|------|---------|------------------|
| 1 | Badge | Tim (#8b5cf6), "CHUYEN KY SAU" |
| 2 | Noi dung | Tu dong chuyen sang tuan sau, khong can gui lai |

---

## 8. EMAIL — LICH TRINH

### TC-8.1: Email lich trinh cuoc hop
| Buoc | Kiem tra | Ket qua mong doi |
|------|---------|------------------|
| 1 | Subject | "[BOD Meeting] Lich trinh lam viec BOD {date}" |
| 2 | Bang lich trinh | STT, Gio, Noi dung, Nguoi TB, TB, CD |
| 3 | Tinh gio | Chinh xac (08:30 + cumulative) |
| 4 | Footer | Tong thoi gian, so nguoi trinh bay |
| 5 | To | Tat ca BOD members + presenters |

---

## 9. APPROVAL WORKFLOW

### TC-9.1: Phe duyet don le
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Bat edit mode (toggle) | Dropdown trang thai hien o moi dong |
| 2 | Chon "Duyet" cho 1 item | Dropdown chuyen sang xanh |
| 3 | Click "Luu Phe Duyet" | Luu thanh cong, toast xanh |
| 4 | Kiem tra Sheet | Column L (status) = "Duyet" |
| 5 | Stat cards | "Da duyet" tang 1, "Cho duyet" giam 1 |

### TC-9.2: Tu choi — bat buoc ghi chu
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Chon "Tu choi" | Input ghi chu hien ra |
| 2 | De trong ghi chu va Luu | LOI: "Vui long nhap ghi chu cho muc tu choi/hoan" |
| 3 | Input ghi chu bi highlight do | Visual cue ro rang |
| 4 | Nhap ghi chu va Luu lai | Luu thanh cong |
| 5 | Kiem tra Sheet | Column N (ghiChu) co noi dung |

### TC-9.3: Hoan lai — bat buoc ghi chu
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Chon "Hoan" | Input ghi chu hien ra |
| 2 | De trong ghi chu va Luu | LOI tuong tu TC-9.2 |
| 3 | Nhap ghi chu va Luu | Thanh cong, status = "Hoan" |

### TC-9.4: Dat thu tu trinh bay
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Nhap thu tu: 1, 2, 3 cho cac item | Luu thanh cong |
| 2 | Kiem tra Sheet | Column M (thuTu) cap nhat dung |
| 3 | Tab Lich trinh | Sap xep theo thu tu da dat |

### TC-9.5: Phe duyet nhieu item cung luc
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Thay doi trang thai 5 item (hon hop Duyet/Tu choi/Hoan) | Tat ca hien trang thai moi |
| 2 | Nhap ghi chu cho cac item Tu choi/Hoan | Tat ca co ghi chu |
| 3 | Click "Luu" 1 lan | Tat ca 5 item cap nhat cung luc |
| 4 | Reload trang | Du lieu giu nguyen |

### TC-9.6: Khong co thay doi
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Bat edit mode nhung khong thay doi gi | |
| 2 | Click "Luu" | Thong bao "Khong co thay doi" hoac luu binh thuong |

---

## 10. ADMIN PAGE — CAU HINH

### TC-10.1: Load settings
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Mo Admin Page | Tat ca fields load gia tri tu Settings sheet |
| 2 | Gio bat dau | Hien 08:30 (hoac gia tri da luu) |
| 3 | Han dang ky | Dropdown = "Thu 6" (value=5) |
| 4 | Han phe duyet | Dropdown = "Thu 7" (value=6) |
| 5 | Gui lich trinh | "Chu nhat 20:00" |
| 6 | Thoi luong toi da | 20 phut |
| 7 | Thoi luong chi dao | 10 phut |

### TC-10.2: Luu settings
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Thay doi gio bat dau = 09:00 | Field cap nhat |
| 2 | Thay doi han dang ky = Thu 5 | Dropdown cap nhat |
| 3 | Click "Luu tat ca Thiet lap" | Toast thanh cong |
| 4 | Reload Admin | Gia tri moi duoc giu |
| 5 | Kiem tra Settings sheet | cfg_startTime = "09:00", cfg_regDeadline = "4" |

### TC-10.3: Settings mac dinh
| Buoc | Dieu kien | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Settings sheet trong (lan dau) | Dung gia tri mac dinh tu v810_admin_api.js |
| 2 | Mac dinh regDeadline | "5" (Thu 6) |
| 3 | Mac dinh apprDeadline | "6" (Thu 7) |
| 4 | Mac dinh startTime | "08:30" |

### TC-10.4: He thong email
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Chon method = "n8n" | Hien field Webhook URL |
| 2 | Nhap webhook URL | Luu thanh cong |
| 3 | Chon method = "gmail" | An field Webhook URL |
| 4 | Gui test email | Email gui dung phuong thuc da chon |

---

## 11. ADMIN PAGE — PHAN QUYEN

### TC-11.1: Xem danh sach users
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Mo tab Phan quyen | Bang hien tat ca users: Email, Ten, Vai tro, Trang thai |
| 2 | User admin | Badge "admin" |
| 3 | User viewer | Badge "viewer" |

### TC-11.2: Them user moi
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Nhap email + ten + vai tro | Fields hop le |
| 2 | Click "Them" | User moi hien trong bang |
| 3 | Kiem tra Users sheet | Dong moi duoc them |
| 4 | Nhap email trung | LOI: "Email da ton tai" |
| 5 | De trong email | LOI: validation |

### TC-11.3: Cap nhat trang thai user
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Doi status tu "approved" sang "blocked" | Cap nhat thanh cong |
| 2 | User do truy cap Dashboard | Bi chan |
| 3 | Doi status sang "approved" lai | Truy cap binh thuong |

---

## 12. ADMIN PAGE — EMAIL TEMPLATES

### TC-12.1: Xem template
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Chon template "reminder" | Hien Subject + Body hien tai |
| 2 | Chon template "bulk_reminder" | Hien noi dung tuong ung |
| 3 | Chon template "schedule" | Hien noi dung tuong ung |

### TC-12.2: Sua va luu template
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Sua subject cua reminder | Field cap nhat |
| 2 | Sua body | Field cap nhat |
| 3 | Click "Luu" | Toast thanh cong |
| 4 | Kiem tra Settings sheet | tpl_reminder co gia tri JSON moi |
| 5 | Gui email thu | Noi dung email dung template da sua |

### TC-12.3: Variables trong template
| Buoc | Kiem tra | Ket qua mong doi |
|------|---------|------------------|
| 1 | {{ngay_hop}} | Duoc thay bang ngay hop thuc te |
| 2 | {{ten_bp}} | Duoc thay bang ten bo phan |
| 3 | {{link_form}} | Duoc thay bang URL Google Form |
| 4 | {{so_cho}} | Duoc thay bang so luong cho duyet |

---

## 13. BOD HOSTING

### TC-13.1: Hien thi BOD Hosting hien tai
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Load Dashboard | Banner hien: Ten + Email + "Tu {date} den {date}" |
| 2 | Khong co BOD Hosting active | Hien fallback tu CONFIG.BOD_HOSTING_DEFAULT |

### TC-13.2: Thay doi BOD Hosting
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Mo Admin > Cau hinh > BOD Hosting | Hien form nhap moi |
| 2 | Nhap ten + email + tu ngay + den ngay | Fields hop le |
| 3 | Luu | Entry cu = "expired", entry moi = "active" |
| 4 | Reload Dashboard | Banner cap nhat ten moi |
| 5 | Kiem tra BOD Hosting sheet | Dong cu co status "expired", dong moi "active" |

### TC-13.3: Lich su BOD Hosting
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Mo Admin > BOD Hosting | Hien bang lich su cac doi luan phien |
| 2 | Cac entry cu | Status "expired" |

---

## 14. GOOGLE FORM INTEGRATION

### TC-14.1: Submit form dang ky
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Mo Form tu link tren Dashboard | Form Google mo dung |
| 2 | Dien: Ten, Email, Bo phan, Noi dung, Thoi luong | Tat ca fields bat buoc |
| 3 | Chon ngay hop | Dropdown hien ngay hop kha dung |
| 4 | Submit | Response ghi vao "Form Dang ky" sheet |
| 5 | Kiem tra Sheet | Dong moi: Timestamp + data, Column L = "Cho duyet" |
| 6 | Reload Dashboard | Item moi hien trong bang dang ky |

### TC-14.2: Column mapping
| Buoc | Kiem tra | Ket qua mong doi |
|------|---------|------------------|
| 1 | Column A | Timestamp |
| 2 | Column B | Noi dung bao cao |
| 3 | Column C | Thoi luong (5/10/15/20) |
| 4 | Column H | Ngay hop |
| 5 | Column I | Ho ten |
| 6 | Column J | Email |
| 7 | Column K | Bo phan |
| 8 | Column L | Trang thai (mac dinh "Cho duyet") |
| 9 | Column M | Thu tu (mac dinh trong) |

### TC-14.3: Nhieu dang ky cung bo phan
| Buoc | Hanh dong | Ket qua mong doi |
|------|-----------|------------------|
| 1 | BP "KOKA" gui 2 dang ky | 2 dong trong Sheet |
| 2 | Dashboard | KOKA hien "2" o cot So dang ky |
| 3 | Stat card "Tong" | Tang 2 |

---

## 15. RESPONSIVE & CROSS-BROWSER

### TC-15.1: Desktop (>= 1024px)
| Buoc | Kiem tra | Ket qua mong doi |
|------|---------|------------------|
| 1 | Layout | Full-width, bang hien day du cot |
| 2 | Timeline | Ngang, 4 buoc tren 1 hang |
| 3 | Modal email | Centered, max-width 640px |

### TC-15.2: Tablet (768px - 1023px)
| Buoc | Kiem tra | Ket qua mong doi |
|------|---------|------------------|
| 1 | Layout | Responsive, cac bang cuon ngang neu can |
| 2 | Header | Van hien day du, date picker khong bi cat |
| 3 | Tabs | Van hien 3 tab tren 1 hang |

### TC-15.3: Mobile (< 768px)
| Buoc | Kiem tra | Ket qua mong doi |
|------|---------|------------------|
| 1 | Header | Title nho lai, subtitle an |
| 2 | Tabs | Van thao tac duoc, co the scroll ngang |
| 3 | Bang | Cuon ngang, khong bi vo layout |
| 4 | Modal | Full-width, padding giam |
| 5 | Nut hanh dong | Du lon de bam tren mobile |

### TC-15.4: Email rendering
| Buoc | Kiem tra | Ket qua mong doi |
|------|---------|------------------|
| 1 | Gmail (Web) | Inline CSS hien thi dung, max 640px |
| 2 | Gmail (App) | Responsive, khong bi vo |
| 3 | Outlook | Inline CSS hien thi dung (khong dung CSS class) |
| 4 | Dark mode | Van doc duoc (contrast du) |

---

## 16. EDGE CASES & ERROR HANDLING

### TC-16.1: Khong co du lieu
| Buoc | Dieu kien | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Sheet "Form Dang ky" trong | Dashboard hien "Chua co dang ky", cards = 0 |
| 2 | Sheet "Dim bo phan" trong | Bang bo phan trong, thong bao loi |
| 3 | Sheet "Settings" trong | Dung gia tri mac dinh |
| 4 | Sheet "Email Log" trong | Lan nhac = 0 cho tat ca BP |

### TC-16.2: Bo phan thieu email
| Buoc | Dieu kien | Ket qua mong doi |
|------|-----------|------------------|
| 1 | BP co email = trong | Hien "Chua co email" |
| 2 | Click "Nhac" | Nut disable, khong cho gui |
| 3 | Them email qua icon edit | Nut "Nhac" active tro lai |

### TC-16.3: N8N webhook loi
| Buoc | Dieu kien | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Webhook URL sai hoac N8N down | Tu dong fallback sang MailApp |
| 2 | MailApp cung loi | Hien loi cu the cho user |
| 3 | Log | Van ghi nhan attempt |

### TC-16.4: Dong thoi nhieu nguoi chinh sua
| Buoc | Dieu kien | Ket qua mong doi |
|------|-----------|------------------|
| 1 | User A va User B cung bat edit mode | Ca 2 thay dropdown |
| 2 | User A luu truoc | Du lieu cap nhat |
| 3 | User B luu sau | Du lieu cua B ghi de A (last-write-wins) |
| 4 | Luu y | Hien tai chua co lock mechanism |

### TC-16.5: Date picker — ngay khong hop le
| Buoc | Dieu kien | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Chon ngay trong qua khu (> 4 tuan) | Van hien du lieu (read-only) |
| 2 | Chon ngay tuong lai (> 2 tuan) | Van cho chon nhung co the khong co du lieu |
| 3 | Chon ngay khong phai Thu 2 | Khong cho chon (dropdown chi hien Thu 2) |

### TC-16.6: Ky tu dac biet trong du lieu
| Buoc | Dieu kien | Ket qua mong doi |
|------|-----------|------------------|
| 1 | Ten co ky tu JP (Utsumi-san) | Hien thi dung, khong bi loi encoding |
| 2 | Noi dung co HTML tags | Duoc escape (escapeHtml), khong bi XSS |
| 3 | Ghi chu co xuong dong | Hien thi dung trong cell |

### TC-16.7: Session timeout
| Buoc | Dieu kien | Ket qua mong doi |
|------|-----------|------------------|
| 1 | De Dashboard mo > 6 gio | Google token het han |
| 2 | Thao tac bat ky | Hien loi "Session expired", yeu cau reload |

---

## 17. DATA INTEGRITY

### TC-17.1: Dong bo du lieu giua cac sheet
| Buoc | Kiem tra | Ket qua mong doi |
|------|---------|------------------|
| 1 | Phe duyet tren Dashboard | Column L trong "Form Dang ky" cap nhat |
| 2 | Reload Dashboard | Du lieu khop voi Sheet |
| 3 | Gui email nhac nho | Email Log ghi dung type, timestamp, detail |
| 4 | Them BOD Hosting | Sheet "BOD Hosting" + "Cau hinh" dong bo |

### TC-17.2: Khong mat du lieu khi loi
| Buoc | Kiem tra | Ket qua mong doi |
|------|---------|------------------|
| 1 | Luu phe duyet nhung mang bi mat | Server bao loi, du lieu cu giu nguyen |
| 2 | Gui email loi | Du lieu form khong bi anh huong |
| 3 | Dong popup Admin giua chung | Settings chua luu khong mat |

### TC-17.3: Column mapping chinh xac
| Buoc | Kiem tra | Ket qua mong doi |
|------|---------|------------------|
| 1 | API doc Column L (status) | Dung cot "Trang thai" |
| 2 | API ghi Column M (thuTu) | Dung cot "Thu tu" |
| 3 | API doc Column K (boPhan) | Dung cot "Bo phan" |

---

## 18. PERFORMANCE

### TC-18.1: Thoi gian tai
| Buoc | Kiem tra | Ket qua mong doi |
|------|---------|------------------|
| 1 | Load Dashboard lan dau | < 5 giay (bao gom GAS cold start) |
| 2 | Doi ngay hop | < 3 giay |
| 3 | Luu phe duyet | < 2 giay |
| 4 | Mo preview email | < 1 giay (client-side rendering) |
| 5 | Gui 1 email | < 5 giay |
| 6 | Gui bulk email (9 BP) | < 30 giay (voi delay 500ms/email) |

### TC-18.2: Du lieu lon
| Buoc | Dieu kien | Ket qua mong doi |
|------|-----------|------------------|
| 1 | 100+ dang ky trong 1 tuan | Dashboard van load binh thuong |
| 2 | Email Log > 1000 dong | getEmailSendLog van tra ve nhanh (chi lay 20 moi nhat) |
| 3 | 50+ tuan du lieu | Date picker van load nhanh |

---

## CHECKLIST TONG KET TRUOC KHI DEPLOY

- [ ] TC-1.x: Khoi dong & quyen truy cap — PASS
- [ ] TC-2.x: Tab Dang ky — PASS
- [ ] TC-3.x: Tab Quy trinh — PASS
- [ ] TC-4.x: Tab Lich trinh — PASS
- [ ] TC-5.x: Email nhac nho dang ky (3 cap leo thang) — PASS
- [ ] TC-6.x: Email nhac phe duyet — PASS
- [ ] TC-7.x: Email ket qua phe duyet — PASS
- [ ] TC-8.x: Email lich trinh — PASS
- [ ] TC-9.x: Approval workflow — PASS
- [ ] TC-10.x: Admin cau hinh — PASS
- [ ] TC-11.x: Admin phan quyen — PASS
- [ ] TC-12.x: Admin email templates — PASS
- [ ] TC-13.x: BOD Hosting — PASS
- [ ] TC-14.x: Google Form integration — PASS
- [ ] TC-15.x: Responsive & cross-browser — PASS
- [ ] TC-16.x: Edge cases & error handling — PASS
- [ ] TC-17.x: Data integrity — PASS
- [ ] TC-18.x: Performance — PASS

---

## GHI CHU DEADLINE DUNG (sau fix 2026-03-06)

| Moc | Gia tri dung | Day-of-week value |
|-----|-------------|-------------------|
| Han dang ky | Thu Sau, 17:00 / 金曜日 17:00 | 5 (Friday) |
| Han phe duyet | Thu Bay, 17:00 / 土曜日 17:00 | 6 (Saturday) |
| Gui lich trinh | Chu Nhat 20:00 | 0 (Sunday) |
| Ngay hop | Thu Hai 08:30 | 1 (Monday) |
