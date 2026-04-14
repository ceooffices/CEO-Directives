require('dotenv').config({ path: '/Users/esuhai/ceo-directives/CEO-Directives-github/automation/.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function supabaseHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

async function supabaseInsert(table, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase INSERT ${table}: ${res.status} - ${err}`);
  }
  return res.json();
}

async function run() {
  const items = [
    { dau_moi: 'Dũng', nhiem_vu: 'A1 - Tái cấu trúc slide báo cáo MSA: thêm tổng nguồn, tổng mục tiêu 140 bạn và KH tuần', thoi_han: '2026-04-21 17:00:00', thanh_vien: 'Thanh Hiếu' },
    { dau_moi: 'Dũng', nhiem_vu: 'A2 - Triển khai 19 hạng mục giải pháp cho đơn tuyển JR', thoi_han: '2026-04-21 17:00:00', thanh_vien: 'Thanh Hiếu' },
    { dau_moi: 'Tuấn', nhiem_vu: 'A3 - Hoàn thiện lộ trình chi phí và quy đổi KPI cho đơn JR', thoi_han: '2026-04-15 17:00:00', thanh_vien: 'Thanh Hiếu, Thiện Tín' },
    { dau_moi: 'Thiện Tín', nhiem_vu: 'A4 - Truyền thông đơn tuyển JR — tập hợp data chứng thực và mô hình mẫu', thoi_han: '2026-04-18 17:00:00', thanh_vien: 'MSA, JPC' },
    { dau_moi: 'Anh Thư', nhiem_vu: 'B1 - Vẽ lại lộ trình đào tạo trực quan — TẤT CẢ các gói', thoi_han: '2026-04-15 08:30:00', thanh_vien: 'Khoa, Lanh, Shimizu' },
    { dau_moi: 'Anh Thư', nhiem_vu: 'P2 - Thống nhất kịch bản tư vấn mới: không thể vừa học vừa làm', thoi_han: '2026-05-04 17:00:00', thanh_vien: 'MSA' },
    { dau_moi: 'Masuda', nhiem_vu: 'C1 - Đồng bộ dữ liệu kỹ sư giữa Esutech và hệ sinh thái Esuhai', thoi_han: '2026-04-14 14:00:00', thanh_vien: 'Phương, Satomura, Yamamoto, Hân' },
    { dau_moi: 'Việt', nhiem_vu: 'D1 - Quản lý danh sách kỹ sư về nước — thiết kế với Bitrix CRM', thoi_han: '2026-04-18 17:00:00', thanh_vien: 'Masuda, Satomura, Sugiyama, Hà' },
    { dau_moi: 'Việt', nhiem_vu: 'D2 - Đẩy nhanh matching + Dự án Future Vĩnh Long', thoi_han: '2026-04-20 17:00:00', thanh_vien: 'Hữu, Satomura, Huy' },
    { dau_moi: 'Huy', nhiem_vu: 'E1 - Khẩn: Giải quyết mức phí NISO/TECHNOHAMA 9.600.000đ trước khai giảng 21/04', thoi_han: '2026-04-16 17:00:00', thanh_vien: 'Masuda, Satomura, Lanh' },
    { dau_moi: 'Huy', nhiem_vu: 'E2 - Đóng gói chương trình P2 kết nối doanh nghiệp', thoi_han: '2026-04-16 17:00:00', thanh_vien: 'Masuda, Tùng, Pháp chế' },
    { dau_moi: 'Việt', nhiem_vu: 'E3 - Kết nối Esuworks vệ tinh + Trường JPC đào tạo N4', thoi_han: '2026-04-21 17:00:00', thanh_vien: 'Tùng' },
    { dau_moi: 'BOD', nhiem_vu: 'H1 - BOD phụ trách đôn đốc phó phẩm đăng ký slide trước 17h thứ 6 hàng tuần', thoi_han: '2026-04-17 17:00:00', thanh_vien: 'Ly' },
    { dau_moi: 'Yamamoto', nhiem_vu: 'H2 - Esutech điều chỉnh giờ làm, họp sáng xong sơm để tham gia giao ban 8h30', thoi_han: '2026-04-20 08:30:00', thanh_vien: 'Masuda' }
  ];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const code = `DR-20260413-${(i + 1).toString().padStart(3, '0')}`;
    const row = {
      directive_code: code,
      t1_dau_moi: item.dau_moi,
      t2_nhiem_vu: item.nhiem_vu,
      t4_thoi_han: item.thoi_han,
      t5_thanh_vien: item.thanh_vien ? item.thanh_vien.split(',').map(s=>s.trim()) : null,
      loai: 'moi',
      meeting_source: 'BOD 2026-04-13',
      lls_step: 3,
      tinh_trang: 'dang_thuc_hien', // bypass WF1 and Confirmation, goes directly to WF2 (Thực hiện)
      approved_by: 'BOD_13042026',
      approved_at: new Date().toISOString(),
      confirmed_by: 'System',
      confirmed_at: new Date().toISOString()
    };
    try {
      await supabaseInsert('directives', row);
      console.log(`✅ Đã insert [${code}] ${item.nhiem_vu}`);
    } catch (e) {
      console.log(`❌ Lỗi insert [${code}]:`, e.message);
    }
  }
}
run();
