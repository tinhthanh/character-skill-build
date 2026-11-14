// _mau.js — KHUNG để chép khi tạo nhân vật mới. Tệp này KHÔNG được đăng ký.
//
//   cp characters/_mau.js characters/<id>.js      rồi sửa, rồi thêm vào characters/index.js
//
// Chỉ ghi đè thứ cần đổi; mọi slot không nhắc tới lấy từ nhân vật `dua`.
// Bảng slot, toạ độ và các ID bắt buộc: references/slots.md.
export default {
  id: 'ten_khoa',                // chữ thường, số, gạch dưới
  dua: 'bac_si_thu_y',           // bac_si_thu_y | bs_nam | dieu_duong | bs_kinh | mac_dinh | <id tuỳ chỉnh khác>
  dinhNghia: (goc, kit) => ({
    ...goc,
    // ...kit.boDo.doMo,         // (tuỳ chọn) lấy cả một bộ đồ: doMo | aoDauChan | aoBlouse
    ten: 'Tên hiển thị',

    // ── tỉ lệ (bỏ dòng nào thì lấy của nhân vật gốc) ──
    // coDau: 1.37, dauLech: 9, coThan: 0.94, coChan: 0.68,
    // daiCanhTay: 1.09, daiCangTay: 0.7, dayTay: 0.68, coBanTay: 0.95,
    // daiDui: 1.4, daiOng: 1.25, dayChan: 1, cachChan: 14, coBanChan: 1,

    // ── khuôn mặt ──
    // khuon: { rong: 50, cao: 54, cam: 56, yRong: -6, tranVuong: 0.1, hamVuong: -0.05, rongTran: 1.06, rongCam: 1.1 },
    // may: { dai: 10, day: 3.6, cong: 2, thon: 0.45, xech: 1 },

    // ── dáng nghỉ ──
    // nghi: { batL: 10, batR: 10, cangL: -13, cangR: -13, cuoi: 0.8, mieng: 0.1 },

    // ── màu: LUÔN trải `goc.mau` trước rồi mới ghi đè ──
    mau: { ...goc.mau /* , toc: '#2a2024', ao: '#2f4b7c', aoToi: '#223a63', quan: '#2f4b7c' */ },

    // ── hình vẽ (chuỗi SVG) — xem references/slots.md trước khi viết ──
    // toc: (p, m) => `<g id="${p}-tocTruoc" fill="${m.toc}">…</g>`,
    // mu: (p, m) => `…`,
    // coAo: (p, m) => `…`,
    // phuKien: (p, m) => `<g id="${p}-phuKien">…</g>`,
    // phuKienTren: () => '',
  }),
};
