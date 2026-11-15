// _template.js — KHUNG để chép khi tạo nhân vật mới. Tệp này KHÔNG được đăng ký.
//
//   cp characters/_template.js characters/<id>.js      rồi sửa, rồi thêm vào characters/index.js
//
// Chỉ ghi đè thứ cần đổi; mọi thứ không nhắc tới lấy từ nhân vật `base`.
// Bảng khoá, toạ độ và các id bắt buộc: references/slots.md.
export default {
  id: 'my_character',            // chữ thường, số, gạch dưới
  base: 'vet',                   // vet | surgeon | nurse | doctor | default | <id tuỳ chỉnh khác>
  define: (base, kit) => ({
    ...base,
    // ...kit.outfits.scrubs,    // (tuỳ chọn) lấy cả một bộ đồ: scrubs | pawTunic | coat | plainCoat
    name: 'Tên hiển thị',

    // ── tỉ lệ (bỏ dòng nào thì lấy của nhân vật gốc) ──
    // headSize: 1.37, neckDrop: 9, torsoScale: 0.94, legScale: 0.68,
    // upperArmLength: 1.09, forearmLength: 0.7, armThickness: 0.68, handSize: 0.95,
    // thighLength: 1.4, shinLength: 1.25, legThickness: 1, legGap: 14, footSize: 1,

    // ── khuôn mặt ──
    // faceShape: { halfWidth: 50, crownHeight: 54, chinLength: 56, widestY: -6, foreheadSquareness: 0.1, jawSquareness: -0.05, foreheadWidth: 1.06, chinWidth: 1.1 },
    // brows: { halfLength: 10, thickness: 3.6, arch: 2, taper: 0.45, slant: 1 },

    // ── dáng nghỉ ──
    // restPose: { upperArmL: 10, upperArmR: 10, forearmL: -13, forearmR: -13, smile: 0.8, mouthOpen: 0.1 },

    // ── màu: LUÔN trải `base.colors` trước rồi mới ghi đè ──
    colors: { ...base.colors /* , hair: '#2a2024', top: '#2f4b7c', topShadow: '#223a63', trousers: '#2f4b7c' */ },

    // ── mượn bộ phận của nhân vật khác / dùng bộ phận vẽ sẵn ──
    // faceExtras: kit.partsOf('doctor').faceExtras,                 // kính của bác sĩ
    // faceExtras: (p, c) => kit.parts.roundGlasses(c),              // kính tròn
    // beard: (p, c) => kit.parts.shortBeard(c),                     // râu quai nón ngắn
    // hat: () => '',                                                // bỏ mũ thừa kế

    // ── hình vẽ riêng (chuỗi SVG) — đọc references/slots.md trước khi viết ──
    // hair: (p, c) => `<g id="${p}-hair-front" fill="${c.hair}">…</g>`,
    // collar: (p, c) => `…`,
    // accessories: (p, c) => `<g id="${p}-accessories">…</g>`,
    // shoulderAccessories: () => '',
  }),
};
