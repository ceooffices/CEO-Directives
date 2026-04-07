require('dotenv').config({ path: '/Users/esuhai/ceo-directives/CEO-Directives-github/automation/.env' });

function supabaseHeaders() {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

async function supabaseUpdate(table, id, data) {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: supabaseHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${table}: ${res.status}`);
  return res.json();
}

const mappings = [
  { id: "21705f79-9a5a-403c-9b56-72c21eefcccf", hm50_id: "32470b99-dfd4-46d5-a11e-e4e15ed84ec6", loai: "leo_thang" }, // HM-13 (Họp tuần)
  { id: "f84f77db-21e0-4c6f-ae1e-2b0b960cf719", hm50_id: "2b8be7db-4189-45a6-8d2f-88c59eda6696", loai: "leo_thang" }, // HM-15 (Ghi âm chỉ đạo)
  { id: "4b9768bf-4d57-49c6-b5b2-9f1834a17385", hm50_id: null, loai: "moi" }, // Virus vaccine - Mới
  { id: "df393da6-2ad1-4e75-82de-049f9d42438d", hm50_id: "4866fd38-1e2d-4f7d-ab5b-e4b2d194bffb", loai: "leo_thang" }, // HM-44 (8 cụm CSDL)
  { id: "b383c014-dbae-4d40-b491-73495f103e6e", hm50_id: "4866fd38-1e2d-4f7d-ab5b-e4b2d194bffb", loai: "leo_thang" }, // HM-44
  { id: "ae059fb0-31f7-4855-8675-23ffb9ae7053", hm50_id: "4e2e4a11-5795-417e-8c1a-42814c2a94ad", loai: "leo_thang" }, // HM-14 (Pipeline toàn hệ thống)
  { id: "6f44ff44-a9ef-456e-b00f-4ed895722083", hm50_id: "6b9513d8-5260-4938-9f22-01d56c782af6", loai: "leo_thang" }, // HM-7 (Công thức 5W)
  { id: "da6f3deb-21b1-468f-8525-d7ab85ab502d", hm50_id: "6b9513d8-5260-4938-9f22-01d56c782af6", loai: "leo_thang" }, // HM-7
  { id: "96519afe-4763-4311-9bdc-a066feaa6b4c", hm50_id: "4e2e4a11-5795-417e-8c1a-42814c2a94ad", loai: "leo_thang" }, // HM-14
  { id: "cda8245c-47da-45de-af98-14acf2fead50", hm50_id: null, loai: "moi" }, // Giải pháp giữ nguồn - Mới
  { id: "719ef875-7fc6-4e47-a6a3-21afcfe8f099", hm50_id: "4e2e4a11-5795-417e-8c1a-42814c2a94ad", loai: "leo_thang" }, // HM-14 (Pipeline / Bình xăng)
  { id: "7e5e1919-3e66-4f49-8fac-ef1b22a837e7", hm50_id: "124c7314-e64b-4fc1-addd-884a77cf971d", loai: "leo_thang" }, // HM-18 (Tái cấu trúc MSA 9 đội hình)
  { id: "ee82ea53-cd0e-4413-a7a0-f2845bb9e4a3", hm50_id: "d38d7f4d-3075-40a3-b3c6-4cc570df4c92", loai: "leo_thang" }  // HM-40 (4 kênh tạo nguồn)
];

(async () => {
  for (const m of mappings) {
    try {
      await supabaseUpdate('directives', m.id, { hm50_id: m.hm50_id, loai: m.loai });
      console.log(`Updated directive ID ${m.id} -> ${m.loai} | HM50: ${m.hm50_id}`);
    } catch (e) {
      console.error(e);
    }
  }
})();
