// Lễ tân — nhân vật tuỳ chỉnh MẪU: đầu của điều dưỡng (đổi tóc), áo vest dài tay.
//
// Đây là ví dụ đầy đủ của một nhân vật tuỳ chỉnh:
//   1. chọn `dua` — nhân vật có sẵn gần với thứ cần làm nhất (ở đây lấy khuôn mặt,
//      mắt, tỉ lệ thân của `dieu_duong`);
//   2. trải một BỘ ĐỒ dựng sẵn từ `kit.boDo` rồi ghi đè chi tiết;
//   3. ghi đè tóc, màu, dáng nghỉ.
export default {
  id: 'le_tan',
  dua: 'dieu_duong',
  dinhNghia: (goc, kit) => ({
    ...goc,
    ...kit.boDo.aoBlouse,                      // thân áo dài tay có ve — dùng làm áo vest
    ten: 'Lễ tân — vest xanh',
    // Tay đan trước bụng: dáng đón khách.
    nghi: { batL: 17, batR: 17, cangL: -92, cangR: -92, cuoi: 1, mieng: 0.4, mayL: 0.2, mayR: 0.2 },
    mau: {
      ...goc.mau,
      toc: '#2a2024', tocSang: '#55464c',
      ao: '#2f4b7c', aoToi: '#223a63', vienNet: '#16233d', aoTrong: '#f6f7f9',
      quan: '#2f4b7c', giay: '#22262e', phuKien: '#d6453d',
    },
    // Tóc bob ngang cằm. Mọi mảng tóc thấy được khi nhìn thẳng nằm trong `tocTruoc`.
    toc: (p, m) => `
              <g id="${p}-tocTruoc" fill="${m.toc}">
                <path d="M -53 31 Q -64 -34 -28 -61 Q 0 -75 28 -61 Q 64 -34 53 31 Q 45 36 40 27 Q 46 -8 31 -25 Q 12 -39 -4 -33 Q -29 -30 -40 -14 Q -45 6 -40 27 Q -45 36 -53 31 Z"/>
                <path d="M -28 -52 Q -4 -63 20 -54" stroke="${m.tocSang}" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".8"/>
                <path d="M -48 4 Q -50 -18 -38 -36" stroke="${m.tocSang}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".6"/>
              </g>`,
    // Ve áo của bộ blouse + một chiếc nơ cổ.
    coAo: (p, m) => `${kit.boDo.aoBlouse.coAo(p, m)}
        <path d="M 0 -96.500 l -9.500 -4.500 v 9 z M 0 -96.500 l 9.500 -4.500 v 9 z" fill="${m.phuKien}" stroke="${m.vienNet}" stroke-width="0.900" stroke-linejoin="round"/>
        <circle cx="0" cy="-96.500" r="2.300" fill="${m.phuKien}" stroke="${m.vienNet}" stroke-width="0.900"/>`,
    // Thân áo vest: đường khép vạt, hai cúc vàng, bảng tên, khăn túi ngực. KHÔNG ống nghe.
    // Phải bọc trong <g id="${p}-phuKien"> — rig co nhóm này theo thân áo.
    phuKien: (p, m) => `
      <g id="${p}-phuKien">
        <path d="M 0 -67 V 40" stroke="${m.vienNet}" stroke-width="1.200"/>
        ${[-44, -22].map((y) => `<circle cx="3.600" cy="${y}" r="2.200" fill="#e8c35a" stroke="${m.vienNet}" stroke-width="0.800"/>`).join('')}
        <path d="M 9 -58 h 13 v 3 h -13 z" fill="${m.phuKien}"/>
        <path d="M 9 -55 h 13 v 11 h -13 z" fill="none" stroke="${m.vienNet}" stroke-width="1.100" stroke-linejoin="round"/>
        ${kit.theTen(-22.500, -58, m.phuKien, m.vienNet)}
        ${['L', 'R'].map((b) => { const g = b === 'L' ? -1 : 1; return `
        <path d="M ${g * 10} 10 H ${g * 27.500}" stroke="${m.vienNet}" stroke-width="1.200" stroke-linecap="round"/>`; }).join('')}
      </g>`,
    phuKienTren: () => '',
  }),
};
