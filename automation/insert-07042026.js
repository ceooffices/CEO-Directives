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
    { dau_moi: 'Ly', nhiem_vu: 'Timeline quy trình gửi slide + form kèm file', thoi_han: '2026-04-07 17:00:00', thanh_vien: 'Kha' },
    { dau_moi: 'Ly', nhiem_vu: 'Tổng hợp chỉ đạo buổi họp', thoi_han: '2026-04-07 17:00:00', thanh_vien: 'Kha' },
    { dau_moi: 'Dũng', nhiem_vu: 'Thu thập dữ liệu "virus" lôi kéo học viên gửi sếp sản xuất vaccine', thoi_han: '2026-04-07 20:00:00', thanh_vien: 'Kha' },
    { dau_moi: 'Ly', nhiem_vu: 'Xây bảng Excel tiêu chí dữ liệu HV', thoi_han: '2026-04-08 17:00:00', thanh_vien: '' },
    { dau_moi: 'Ly', nhiem_vu: 'Thống nhất tiêu chí KG/NH/thu phí', thoi_han: '2026-04-09 17:00:00', thanh_vien: 'Hiếu, Hân, Kế toán' },
    { dau_moi: 'Hiếu', nhiem_vu: 'Thống nhất matching cung-cầu Q2', thoi_han: '2026-04-10 17:00:00', thanh_vien: 'Dũng, Lanh, Tuấn, Kha' },
    { dau_moi: 'Hiếu', nhiem_vu: 'Bản mục tiêu 3333/2222 ký xác nhận', thoi_han: '2026-04-12 17:00:00', thanh_vien: 'Lanh, Tuấn' },
    { dau_moi: 'Dũng', nhiem_vu: 'Nộp project chi tiết T4 theo tuần/kênh/khu vực', thoi_han: '2026-04-12 17:00:00', thanh_vien: 'Hiếu' },
    { dau_moi: 'Nhiên', nhiem_vu: 'Đặt lịch phối hợp nguồn', thoi_han: '2026-04-12 17:00:00', thanh_vien: 'Tuấn' },
    { dau_moi: 'Khoa', nhiem_vu: 'Hoàn thiện mô tả giải pháp giữ nguồn và trình duyệt', thoi_han: '2026-04-13 08:30:00', thanh_vien: 'Lanh' },
    { dau_moi: 'Tuấn', nhiem_vu: 'Slide tổng nguồn "bình xăng" báo cáo', thoi_han: '2026-04-13 08:30:00', thanh_vien: '' },
    { dau_moi: 'Dũng', nhiem_vu: 'Gặp team 8+9 chuẩn hóa vận hành Q2', thoi_han: '2026-04-13 08:30:00', thanh_vien: 'Hiếu' },
    { dau_moi: 'Tuấn', nhiem_vu: 'Khởi động chương trình tuyển dụng 14/4', thoi_han: '2026-04-13 17:00:00', thanh_vien: 'Dũng, Hiếu' }
  ];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const code = `DR-20260407-${(i + 1).toString().padStart(3, '0')}`;
    const row = {
      directive_code: code,
      t1_dau_moi: item.dau_moi,
      t2_nhiem_vu: item.nhiem_vu,
      t4_thoi_han: item.thoi_han,
      t5_thanh_vien: item.thanh_vien ? item.thanh_vien.split(',').map(s=>s.trim()) : null,
      loai: 'moi',
      meeting_source: 'BOD 2026-04-07',
      lls_step: 1,
      tinh_trang: 'cho_xu_ly'
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
