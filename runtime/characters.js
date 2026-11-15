// characters.js — BA NHÂN VẬT có sẵn, dựng trên bộ xương của bác sĩ thú y, và BỘ ĐỒ NGHỀ
// (`KIT`) để nhân vật tuỳ chỉnh trong `characters/` dùng lại.
//
// Mỗi nhân vật có ĐẦU riêng và BỘ ĐỒ riêng; bộ xương, khớp và mọi động tác thì
// dùng chung (xem NV_MAC_DINH trong ./rig-svg.js).
//
//   surgeon      bác sĩ phẫu thuật — đồ mổ xanh ngọc cổ chữ V, mũ mổ, khẩu trang
//               kéo xuống cổ, thẻ tên, dép trắng; đứng buông tay
//   nurse  điều dưỡng — áo hồng in dấu chân, tay loe viền trắng, đồng hồ
//               cài ngực, hai túi dưới, quần xanh đậm, giày thể thao trắng
//   doctor     bác sĩ đeo kính — áo blouse trắng DÀI TAY, ve áo, hàng cúc, bút
//               cài túi ngực, thẻ tên, ống nghe, quần tây, giày đen
//
// Slot của ĐẦU:  khuon · coDau/dauLech · toc() · mu() · mat() · mui() · net() · bố cục
//                mặt (matX matY mayY maX maY miengY taiX…) · mau.da/toc/mat/…
// Slot của THÂN: ao() · suon · coAo() · phuKien() · phuKienTren() · giay() ·
//                các số tay áo (daiTayAo, rongTayAo, vienGau…) · tayDai · nghi ·
//                mau.ao/aoToi/quan/giay/phuKien
//
// ID BẮT BUỘC, sai là hỏng im lặng chứ không báo lỗi:
//   toc() phải có <g id="${p}-tocTruoc"> — rig dịch nó theo mặt khi xoay.
//     (<g id="${p}-tocSau"> là slot kiểu cũ: vẫn nhận nhưng rig ẩn đi, phần tóc
//     sau đầu rig tự sinh.) Mọi mảng tóc phải thấy khi nhìn thẳng — búi, đuôi,
//     mái, MŨ — đều đặt trong `tocTruoc`.
//   mat() phải có <g id="${p}-mat${ben}"> và <g id="${p}-nguoi${ben}">
//   phuKien() phải bọc trong <g id="${p}-phuKien"> — rig co nó theo thân áo.
//   giay() phải có id="${p}-ban${ben}".
//
// TOẠ ĐỘ. Đầu: gốc ở tâm đầu, sọ x −50…50, đỉnh y ≈ −56, cằm y ≈ +56.
// Thân: gốc ở HÔNG, y âm là lên — vai (±35, −88), chân cổ (±13, −103), eo
// y ≈ −30, gấu áo y ≈ +20; chốt vai ở (±33, −90) nên nắp tay áo phủ |x| > 21.

/* ───────────────────────────────────────────────────── mảnh đồ dùng chung */
// Hai dải tối ôm mép áo, sinh từ chính các điểm của đường bao (thụt vào 5).
const suonTu = (diem) => ['L', 'R'].map((b) => { const g = b === 'L' ? -1 : 1;
  const ngoai = diem.map(([x, y]) => `${g * x} ${y}`), trong = diem.map(([x, y]) => `${g * (x - 5)} ${y}`).reverse();
  return `M ${ngoai.join(' L ')} L ${trong.join(' L ')} Z`; }).join(' ');
// Hai miếng vải vai che phần cổ loe ra — cổ áo nào cũng cần.
const vaiCo = (m) => `
        <path d="M -28.5 -96 Q -22 -102.5 -12.2 -103.5 L -8.5 -96 Z" fill="${m.ao}"/>
        <path d="M 28.5 -96 Q 22 -102.5 12.2 -103.5 L 8.5 -96 Z" fill="${m.ao}"/>`;
// Giày kín mũi (dép mổ, giày tây, giày thể thao) — khác đôi giày bệt hở mu của bác sĩ thú y.
const giayKin = (soc) => (p, ben, m, ong) => `
          <g id="${p}-ban${ben}">
            <path d="M -12 ${ong - 6} h 24 v 11 q 0 7 -7 7 h -10 q -7 0 -7 -7 z" fill="${m.giay}"/>
            ${soc ? `<path d="M -12 ${ong + 1} h 24" stroke="${soc}" stroke-width="2.2"/>` : ''}
          </g>`;
// Thẻ tên: thẻ trắng, dải màu trên đầu, chấm ảnh và hai dòng chữ.
const theTen = (x, y, mauDai, vien) => `
        <rect x="${x}" y="${y}" width="13" height="16" rx="1.6" fill="#fdfdfd" stroke="${vien}" stroke-width="1"/>
        <rect x="${x}" y="${y}" width="13" height="4.4" rx="1.6" fill="${mauDai}"/>
        <circle cx="${x + 4}" cy="${y + 9}" r="2.1" fill="#c8ced6"/>
        <path d="M ${x + 7.4} ${y + 8} h 3.6 M ${x + 7.4} ${y + 10.6} h 2.6 M ${x + 2.4} ${y + 13.4} h 8.4" stroke="#aab2bd" stroke-width="0.9" stroke-linecap="round"/>`;
// Dấu chân thú, tâm (x, y), cỡ k.
const dauChan = (x, y, k, xoay = 0) => `<g transform="translate(${x} ${y}) rotate(${xoay}) scale(${k})">
          <ellipse cx="0" cy="1.6" rx="3.2" ry="2.6"/><circle cx="-3.6" cy="-2" r="1.3"/><circle cx="-1.2" cy="-3.7" r="1.3"/><circle cx="1.2" cy="-3.7" r="1.3"/><circle cx="3.6" cy="-2" r="1.3"/></g>`;
// Ống nghe vắt cổ: hai ống đổ xuống hai bên ngực, loa bên trái, chạc tai nghe bên phải.
const ongNgheVatCo = (ong, vien) => `
        <g fill="none" stroke-linecap="round">
          ${['M -13.5 -103 Q -29 -90 -21.500 -63', 'M 13.5 -103 Q 29 -90 21.500 -66']
            .map((d) => `<path d="${d}" stroke="${vien}" stroke-width="5"/><path d="${d}" stroke="${ong}" stroke-width="3"/>`).join('')}
          <path d="M 21.500 -66 q -3.200 4 -2.600 9 M 21.500 -66 q 3.200 4 2.600 9" stroke="#b9c0c9" stroke-width="2.2"/>
          <circle cx="18.900" cy="-56.500" r="1.7" fill="#e6eaef" stroke="${vien}" stroke-width="0.8"/>
          <circle cx="24.100" cy="-56.500" r="1.7" fill="#e6eaef" stroke="${vien}" stroke-width="0.8"/>
          <circle cx="-21.500" cy="-59" r="5.4" fill="#c3c9d1" stroke="${vien}" stroke-width="1.5"/>
          <circle cx="-21.500" cy="-59" r="2.9" fill="#eef0f4" stroke="#8d949f" stroke-width="1.2"/>
        </g>`;

/* ──────────────────────────────────────────────── A. đồ mổ của bác sĩ nam */
// Áo hộp, thẳng từ nách xuống gấu — đồ mổ không chiết eo.
const AO_MO = 'M -31 20 Q 0 26 31 20 L 29 -40 Q 29.5 -70 35 -88 Q 30 -97 20 -101 Q 10 -105 0 -105'
            + ' Q -10 -105 -20 -101 Q -30 -97 -35 -88 Q -29.5 -70 -29 -40 Z';
const DO_MO = {
  ao: () => AO_MO,
  suon: suonTu([[35, -88], [29.5, -70], [29, -40], [31, 20]]),
  damSuon: 0.3,
  // Cổ chữ V hở da, viền bằng một dải vải đậm; khẩu trang kéo xuống nằm vắt
  // ngang cổ — đầu vẽ sau nên cằm che mất mép trên, đúng kiểu đeo trễ.
  coAo: (p, m) => `${vaiCo(m)}
        <path d="M -11 -102 L 11 -102 L 0 -82 Z" fill="${m.da}"/>
        <path d="M -12.6 -103.5 L 0 -80.500 L 12.6 -103.5" stroke="${m.aoToi}" stroke-width="3.4" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
        <path d="M -14 -111 Q 0 -99 14 -111 L 12.500 -101.500 Q 0 -93.500 -12.500 -101.500 Z" fill="#cfe8f1" stroke="${m.vienNet}" stroke-width="1"/>
        <path d="M -9.500 -103.500 Q 0 -97.500 9.500 -103.500" stroke="#9fc6d4" stroke-width="0.9" fill="none"/>`,
  phuKien: (p, m) => `
      <g id="${p}-phuKien">
        <path d="M -22 -60 h 14 v 13 q 0 3 -3 3 h -8 q -3 0 -3 -3 z" fill="${m.aoToi}" opacity=".55"/>
        <path d="M -22 -60 h 14 v 13 q 0 3 -3 3 h -8 q -3 0 -3 -3 z" fill="none" stroke="${m.vienNet}" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M -18.500 -66 v 9" stroke="#f1c232" stroke-width="2" stroke-linecap="round"/>
        <path d="M -14.500 -65 v 8" stroke="#2f6fd0" stroke-width="2" stroke-linecap="round"/>
        ${theTen(8.5, -66, m.phuKien, m.vienNet)}
        <path d="M 15 -66 v -3" stroke="${m.vienNet}" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M -29.500 13 Q 0 19 29.500 13" stroke="${m.aoToi}" stroke-width="1.3" fill="none"/>
      </g>`,
  phuKienTren: () => '',
  giay: giayKin('#c9d0d8'),
  daiTayAo: 1.1, xeoTayAo: 4, rongTayAo: 1.22, vienGau: 0, mauGau: null, netGau: null, lechGau: 0, boGocTayAo: 4,
  tayDai: false, huyHieu: '', mauSoSau: 'mu',
};

/* ─────────────────────────────────────────── B. áo in dấu chân của điều dưỡng */
// Áo dáng suông hơi xoè, gấu bo tròn.
const AO_DD = 'M -32 18 Q 0 28 32 18 Q 29 -10 26 -42 Q 27 -70 35 -88 Q 30 -97 20 -101 Q 10 -105 0 -105'
            + ' Q -10 -105 -20 -101 Q -30 -97 -35 -88 Q -27 -70 -26 -42 Q -29 -10 -32 18 Z';
const DO_DD = {
  ao: () => AO_DD,
  suon: suonTu([[35, -88], [27, -70], [26, -42], [29, -10], [32, 18]]),
  damSuon: 0.28,
  // Cổ tròn, viền trắng.
  coAo: (p, m) => `${vaiCo(m)}
        <path d="M -13 -104 L 13 -104 L 13 -100 Q 0 -84 -13 -100 Z" fill="${m.da}"/>
        <path d="M -13.6 -102.500 Q 0 -83 13.6 -102.500" stroke="#ffffff" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
  phuKien: (p, m) => `
      <g id="${p}-phuKien">
        <clipPath id="${p}-aoCat"><path d="${AO_DD}"/></clipPath>
        <g clip-path="url(#${p}-aoCat)" fill="#ffffff" opacity=".5">
          ${[[-17, -72, 0.95, -12], [3, -62, 0.8, 10], [-8, -44, 0.9, 16], [19, -40, 0.85, -8], [-21, -24, 0.8, 8],
             [6, -22, 0.9, -14], [24, -12, 0.8, 12], [-28, -50, 0.75, 20], [-2, 16, 0.85, 6], [29, -66, 0.7, -18]]
            .map((d) => dauChan(...d)).join('')}
        </g>
        ${['L', 'R'].map((b) => { const g = b === 'L' ? -1 : 1; return `
        <path d="M ${g * 8} -6 H ${g * 25} L ${g * 26.500} 12 Q ${g * 17} 15.500 ${g * 8} 14.500 Z" fill="${m.ao}" stroke="${m.vienNet}" stroke-width="1.3" stroke-linejoin="round"/>
        <path d="M ${g * 8} -2.500 H ${g * 25.300}" stroke="#ffffff" stroke-width="1.6"/>`; }).join('')}
        <rect x="-23" y="-66" width="14" height="6.500" rx="1.5" fill="#fdfdfd" stroke="${m.vienNet}" stroke-width="0.9"/>
        <path d="M -20.500 -62.700 h 9" stroke="${m.phuKien}" stroke-width="1.3" stroke-linecap="round"/>
        <path d="M 15 -70 v 7" stroke="${m.phuKien}" stroke-width="3" stroke-linecap="round"/>
        <circle cx="15" cy="-58.500" r="5" fill="#fdfdfd" stroke="${m.vienNet}" stroke-width="1.3"/>
        <path d="M 15 -58.500 v -2.800 M 15 -58.500 l 2 1.200" stroke="${m.vienNet}" stroke-width="1" stroke-linecap="round"/>
      </g>`,
  phuKienTren: () => '',
  giay: giayKin('#ef9db0'),
  daiTayAo: 0.85, xeoTayAo: 9, rongTayAo: 1.4, vienGau: 1.8, mauGau: '#ffffff', netGau: null, lechGau: 1.5, boGocTayAo: 6,
  tayDai: false, huyHieu: '',
};

/* ───────────────────────────────────── C. áo blouse của bác sĩ đeo kính */
// Áo blouse dài quá hông (gấu ở y +38), hơi xoè. Thân áo vẽ SAU chân nên vạt
// áo phủ lên đùi; bước đi thì đùi lùa dưới vạt.
const AO_BL = 'M -34 38 Q 0 42 34 38 Q 31 0 27 -42 Q 28 -70 35 -88 Q 30 -97 20 -101 Q 10 -105 0 -105'
            + ' Q -10 -105 -20 -101 Q -30 -97 -35 -88 Q -28 -70 -27 -42 Q -31 0 -34 38 Z';
// Bộ áo khoác dùng hai màu mà không phải nhân vật gốc nào cũng khai (`aoTrong`, `ongNghe`).
// Thiếu thì lấy màu dự phòng, không để `undefined` lọt vào SVG — trải bộ áo này lên một
// nhân vật mặc đồ mổ là chuyện thường, và hình hỏng vì thiếu một màu thì rất khó đoán.
const innerShirtColor = (m) => m.aoTrong || m.aoToi;
const stethoscopeColor = (m) => m.ongNghe || m.phuKien;
const DO_BL = {
  ao: () => AO_BL,
  suon: suonTu([[35, -88], [28, -70], [27, -42], [31, 0], [34, 38]]),
  damSuon: 0.6,
  // Áo trong màu `mau.aoTrong` lộ ra giữa hai ve; ve là hai nét bẻ có khấc.
  coAo: (p, m) => `${vaiCo(m)}
        <path d="M -11.500 -104 L 11.500 -104 L 0 -68 Z" fill="${innerShirtColor(m)}"/>
        <path d="M -12.500 -104 L 0 -67 L -9 -74 L -15.500 -84 L -9.500 -87.500 Z" fill="${m.ao}" stroke="${m.vienNet}" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M 12.500 -104 L 0 -67 L 9 -74 L 15.500 -84 L 9.500 -87.500 Z" fill="${m.ao}" stroke="${m.vienNet}" stroke-width="1.2" stroke-linejoin="round"/>`,
  phuKien: (p, m) => `
      <g id="${p}-phuKien">
        <path d="M 0 -67 V 40" stroke="${m.vienNet}" stroke-width="1.2"/>
        ${[-50, -28, -6].map((y) => `<circle cx="3.6" cy="${y}" r="1.9" fill="#dfe3e8" stroke="${m.vienNet}" stroke-width="0.8"/>`).join('')}
        <!-- túi ngực đặt THẤP hơn chạc tai nghe (chạc dừng ở y −55), không thì bút đâm vào ống nghe -->
        <path d="M 9 -47 h 13.500 v 14 h -13.500 z" fill="none" stroke="${m.vienNet}" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M 12.500 -52.500 v 8" stroke="#2f6fd0" stroke-width="2.1" stroke-linecap="round"/>
        <path d="M 16.500 -51.500 v 7" stroke="#d6453d" stroke-width="2.1" stroke-linecap="round"/>
        ${['L', 'R'].map((b) => { const g = b === 'L' ? -1 : 1; return `
        <path d="M ${g * 9} 6 H ${g * 27.500} L ${g * 29} 28 H ${g * 9} Z" fill="none" stroke="${m.vienNet}" stroke-width="1.2" stroke-linejoin="round"/>`; }).join('')}
        ${theTen(-22.500, -47, innerShirtColor(m), m.vienNet)}
        <path d="M -16 -47 v -2.500" stroke="${m.vienNet}" stroke-width="1.6" stroke-linecap="round"/>
        ${STETHOSCOPE_MARK}${ongNgheVatCo(stethoscopeColor(m), m.vienNet)}
      </g>`,
  phuKienTren: (p, m) => ongNgheVatCo(stethoscopeColor(m), m.vienNet),
  giay: giayKin(null),
  daiTayAo: 1, xeoTayAo: 3, rongTayAo: 1.12, vienGau: 0, mauGau: null, netGau: null, lechGau: 0, boGocTayAo: 3,
  tayDai: true, huyHieu: '',
};

/**
 * BỘ ĐỒ NGHỀ cho nhân vật tuỳ chỉnh (`characters/*.js` nhận nó ở tham số thứ hai).
 *   boDo     ba bộ trang phục dựng sẵn — trải vào định nghĩa rồi ghi đè màu / chi tiết
 *   còn lại  các mảnh vẽ dùng chung (xem chú thích ở từng hàm phía trên)
 */
// Áo khoác KHÔNG ống nghe: cùng bộ áo, bỏ ống nghe khỏi cả hai lớp (thân áo và vắt vai).
const STETHOSCOPE_MARK = '<!--stethoscope-->';
const DO_BL_PLAIN = {
  ...DO_BL,
  phuKien: (p, m) => DO_BL.phuKien(p, m).split(STETHOSCOPE_MARK)[0] + '\n      </g>',
  phuKienTren: () => '',
};

export const KIT = {
  boDo: { doMo: DO_MO, aoDauChan: DO_DD, aoBlouse: DO_BL, plainCoat: DO_BL_PLAIN },
  AO: { doMo: AO_MO, aoDauChan: AO_DD, aoBlouse: AO_BL },
  suonTu, vaiCo, giayKin, theTen, dauChan, ongNgheVatCo,
};

/** Trả về bảng nhân vật mới, dựng từ một nhân vật gốc (mặc định: bác sĩ thú y). */
export function dungDau(goc) {
  const m0 = goc.mau;

  // ─────────────────────────────────────────────── A. Bác sĩ nam, tóc ngắn
  // Sọ vuông hơn, cằm rộng, mắt nhỏ lại (rx 9.5 so với 11.5 của bản gốc),
  // không mi giả. Đầu nhỏ hơn một nấc (1.38 so với 1.45) cho bớt trẻ con.
  const surgeon = {
    ...goc, ...DO_MO,
    ten: 'Bác sĩ nam — đồ mổ',
    // Cao và vững hơn ba nhân vật nữ: đầu nhỏ nhất, chân dài, tay và chân dày hơn.
    coDau: 1.3, dauLech: 10, coThan: 0.97, coChan: 0.76,
    daiCanhTay: 1.05, daiCangTay: 0.8, dayTay: 0.85, coBanTay: 1.05,
    daiDui: 1.25, daiOng: 1.2, dayChan: 1.05, cachChan: 15, coBanChan: 1.05,
    may: { dai: 11.5, day: 4.4, cong: 1.2, thon: 0.3, xech: 2 },
    // Đứng buông tay, hơi dạng — khác dáng đan tay trước bụng của bác sĩ thú y.
    nghi: { batL: 10, batR: 10, cangL: -13, cangR: -13, cuoi: 0.8, mieng: 0.1, mayL: 0.1, mayR: 0.1 },
    khuon: { rong: 50, cao: 54, cam: 52, yRong: -8, tranVuong: 0.08, hamVuong: 0.08, rongTran: 1.09, rongCam: 1.07 },
    matX: 20, matY: 3, mayY: -15, maX: 32, maY: 26, miengY: 29,
    moiRong: 1.3, taiX: 51, maRong: 8, miengRong: 1.35, tocLech: 4, netLech: 13,
    mau: { ...m0, da: '#eabf9c', daToi: '#cf9b78', toc: '#241f1b', tocSang: '#4b4139',
           ma: '#e0968a', mat: '#33210f',
           ao: '#2f9e8f', aoToi: '#237a6e', quan: '#2f9e8f', giay: '#f1f3f5', phuKien: '#1f5f8f', vienNet: '#12403a',
           mu: '#237a6e', muSang: '#4fb8a9' },
    toc: (p, m) => `
              <g id="${p}-tocSau" fill="${m.toc}">
                <path d="M -44 6 Q -50 -30 -28 -50 Q -4 -60 14 -54 L 14 -32 Q -8 -38 -22 -24 Q -33 -12 -33 6 Z"/>
              </g>
              <g id="${p}-tocTruoc" fill="${m.toc}">
                <path d="M -51 2 Q -55 -40 -20 -56 Q 16 -68 42 -46 Q 54 -34 51 2 Q 45 -24 22 -33 Q 2 -39 -16 -31 Q -36 -22 -51 2 Z"/>
                <path d="M -50 0 Q -52 12 -47 22 Q -42 10 -43 -6 Z"/>
                <path d="M 50 0 Q 52 12 47 22 Q 42 10 43 -6 Z"/>
                <path d="M -30 -46 Q -6 -56 16 -50" stroke="${m.tocSang}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".75"/>
                <path d="M 24 -42 Q 38 -36 45 -26" stroke="${m.tocSang}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".6"/>
              </g>`,
    // Mũ mổ nằm ở slot `mu`, KHÔNG nằm trong `toc()`: rig vẽ mảng tóc gáy sau `toc()`
    // nên mũ đặt trong đó bị tóc gáy quét đè lên khi quay nghiêng.
    mu: (p, m) => `
                <path d="M -53 -14 Q -58 -64 0 -66 Q 58 -64 53 -14 Q 30 -30 0 -30 Q -30 -30 -53 -14 Z" fill="${m.mu}"/>
                <path d="M -53 -14 Q -30 -30 0 -30 Q 30 -30 53 -14 L 52 -21 Q 30 -37 0 -37 Q -30 -37 -52.500 -21 Z" fill="${m.muSang}"/>
                <path d="M -30 -56 Q -6 -63 14 -58" stroke="${m.muSang}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`,
    mat: (p, ben, m) => `
            <g id="${p}-mat${ben}">
              <ellipse rx="9.5" ry="10.5" fill="#fff"/>
              <g id="${p}-nguoi${ben}">
                <circle r="7.2" cy="0.4" fill="${m.mat}"/>
                <circle r="4" cy="1.6" fill="#17110c"/>
                <circle cx="-2.6" cy="-3.2" r="2.6" fill="#fff"/>
              </g>
              <path d="M -9.5 -4 Q 0 -12.5 9.5 -4" stroke="#17110c" stroke-width="2.8" fill="none" stroke-linecap="round"/>
            </g>`,
    mui: (m) => `<path d="M -2 6 q -4 5 2 6" stroke="${m.daToi}" stroke-width="1.8" stroke-linecap="round" fill="none"/>`,
  };

  // ──────────────────────────────────── B. Điều dưỡng nữ, tóc đuôi ngựa cao
  // Đuôi ngựa nằm trong `tocTruoc` — xem ghi chú TOCSAU ở đầu file: đặt vào
  // `tocSau` thì nó chỉ hiện lúc quay người, còn nhìn thẳng là mất sạch.
  // Vẽ đuôi TRƯỚC khối tóc chính để khối tóc phủ lên chân đuôi, không lộ mối.
  // Đuôi cố ý dừng ở x ≥ −78: xa hơn nữa là đè lên cánh tay trái, vì tay trái
  // vẽ TRƯỚC nhóm `tren` (nằm trong `sau`) nên tóc sẽ phủ lên tay.
  const nurse = {
    ...goc, ...DO_DD,
    ten: 'Điều dưỡng — áo dấu chân',
    // Trẻ và tròn trịa nhất: đầu to nhất trong bốn người, tay chân mềm, mày cong.
    coDau: 1.42, dauLech: 9, coThan: 0.92, coChan: 0.68,
    daiCanhTay: 1, daiCangTay: 0.7, dayTay: 0.75, coBanTay: 1,
    daiDui: 1.3, daiOng: 1.2, dayChan: 1, cachChan: 14, coBanChan: 1,
    may: { dai: 10, day: 2.8, cong: 3.2, thon: 0.5, xech: -1 },
    // Hai tay buông hơi mở, cười tươi — dáng sẵn sàng giúp.
    nghi: { batL: 15, batR: 15, cangL: -9, cangR: -9, cuoi: 1, mieng: 0.45, mayL: 0.25, mayR: 0.25 },
    khuon: { rong: 48, cao: 56, cam: 57, yRong: -10, tranVuong: 0.06, hamVuong: -0.04, rongTran: 1.09, rongCam: 1.07 },
    matX: 20, matY: 2, mayY: -18, maX: 31, maY: 24, miengY: 30,
    moiRong: 1.2, taiX: 49, maRong: 11, miengRong: 1.4, tocLech: 5, netLech: 13,
    mau: { ...m0, toc: '#4d3122', tocSang: '#8a5c3a', ma: '#f3a2a2', mat: '#4a2e18',
           ao: '#ef9db0', aoToi: '#d97f95', quan: '#3d5a80', giay: '#f5f5f5', phuKien: '#d9506e', vienNet: '#7a3346' },
    toc: (p, m) => `
              <g id="${p}-tocSau" fill="${m.toc}">
                <path d="M -34 48 Q -62 -4 -44 -50 Q -10 -76 26 -60 L 30 -30 Q 2 -44 -14 -20 Q -26 2 -22 48 Z"/>
              </g>
              <g id="${p}-tocTruoc" fill="${m.toc}">
                <path d="M -34 -40 Q -68 -26 -76 6 Q -82 40 -64 58 Q -52 42 -58 16 Q -60 -8 -30 -20 Z"/>
                <path d="M -46 -26 Q -60 -18 -63 0" stroke="${m.tocSang}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".5"/>
                <path d="M -50 22 Q -60 -30 -26 -58 Q 0 -74 26 -58 Q 60 -30 50 22 Q 47 -6 41 -18 Q 22 -38 2 -32 Q -20 -38 -41 -18 Q -47 -6 -50 22 Z"/>
                <path d="M -30 -50 Q -6 -62 18 -52" stroke="${m.tocSang}" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".8"/>
                <path d="M -46 -14 Q -44 -32 -32 -44" stroke="${m.tocSang}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".6"/>
                <path d="M 40 -20 Q 46 -34 34 -46" stroke="${m.tocSang}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".55"/>
                <circle cx="-40" cy="-32" r="5" fill="${m.phuKien}"/>
              </g>`,
    mui: (m) => `<path d="M -1 8 q -3 4 1 5" stroke="${m.daToi}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
  };

  // ──────────────────────────────── C. Bác sĩ đeo kính, tóc rẽ ngôi lệch
  // Kính vẽ trong slot `net` — vì `net` là nhóm ĐI THEO MẶT khi xoay
  // (dịch theo netLech, co ngang theo phối cảnh — xem apDung trong rig-svg.js). Vẽ kính ở
  // chỗ khác — ví dụ trong `toc` — thì lúc quay mặt kính sẽ đứng yên tại chỗ.
  //
  // Búi tóc thấp đặt ở (−42, 30), KHÔNG phải (−4, 46). Bản đầu để giữa và thấp:
  // đứng thẳng thì `tocSau` trong suốt nên không thấy gì, nhưng vừa quay người
  // là búi hiện ra ngay dưới cằm — trông hệt bộ râu quai nón. Mọi mảng trong
  // `tocSau` phải nằm về phía GÁY (x âm, xa trục), vì nó chỉ tồn tại ở góc xoay.
  const doctor = {
    ...goc, ...DO_BL,
    ten: 'Bác sĩ đeo kính — áo blouse',
    // Thanh và nghiêm hơn: chân dài, mày ngang hơi xếch, tay đan cao trước bụng.
    coDau: 1.38, dauLech: 9, coThan: 0.94, coChan: 0.7,
    daiCanhTay: 1.05, daiCangTay: 0.72, dayTay: 0.72, coBanTay: 0.95,
    daiDui: 1.35, daiOng: 1.25, dayChan: 0.95, cachChan: 13.5, coBanChan: 1,
    may: { dai: 11, day: 3.2, cong: 1.2, thon: 0.5, xech: 3 },
    nghi: { batL: 17, batR: 17, cangL: -92, cangR: -92, cuoi: 0.9, mieng: 0.35, mayL: 0.1, mayR: 0.1 },
    khuon: { rong: 49, cao: 55, cam: 55, yRong: -8, tranVuong: 0.08, hamVuong: 0.02, rongTran: 1.08, rongCam: 1.07 },
    matX: 20, matY: 2, mayY: -19, maX: 32, maY: 25, miengY: 30,
    moiRong: 1.2, taiX: 50, maRong: 9, miengRong: 1.4, tocLech: 5, netLech: 13,
    mau: { ...m0, da: '#f2cdb0', daToi: '#d8a888', toc: '#33261e', tocSang: '#6b5140',
           ma: '#eda6a0', mat: '#2e1f14',
           ao: '#f6f7f9', aoToi: '#c9d0d9', quan: '#2b3f63', giay: '#22262e', phuKien: '#2b3f63', vienNet: '#5b6470',
           aoTrong: '#3f6ea8', ongNghe: '#8d3f4a' },
    toc: (p, m) => `
              <g id="${p}-tocSau" fill="${m.toc}">
                <path d="M -32 44 Q -58 -6 -42 -50 Q -8 -74 28 -60 L 32 -30 Q 4 -44 -12 -20 Q -24 2 -20 44 Z"/>
                <ellipse cx="-42" cy="30" rx="17" ry="14"/>
              </g>
              <g id="${p}-tocTruoc" fill="${m.toc}">
                <path d="M -50 18 Q -58 -32 -24 -58 Q 4 -72 30 -56 Q 58 -34 50 18 Q 48 -10 43 -22 Q 30 -40 4 -36 Q -22 -30 -40 -14 Q -47 -2 -50 18 Z"/>
                <path d="M -22 -52 Q 4 -60 24 -50" stroke="${m.tocSang}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>
                <path d="M -44 -8 Q -40 -26 -26 -38" stroke="${m.tocSang}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".55"/>
              </g>`,
    mui: (m) => `<path d="M -1 9 q -3 4 2 5" stroke="${m.daToi}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
    net: (p, m) => `
            <g id="${p}-kinh" fill="none" stroke="${m.phuKien}" stroke-width="2.4" stroke-linejoin="round">
              <rect x="-34" y="-11" width="28" height="26" rx="10" fill="#ffffff" fill-opacity=".16"/>
              <rect x="6" y="-11" width="28" height="26" rx="10" fill="#ffffff" fill-opacity=".16"/>
              <path d="M -6 -2 Q 0 -7 6 -2"/>
              <path d="M -34 -4 L -48 -7" stroke-linecap="round"/>
              <path d="M 34 -4 L 48 -7" stroke-linecap="round"/>
            </g>`,
  };

  return { surgeon, nurse, doctor };
}

/** Đăng ký cả ba vào RigSVG.NHAN_VAT; trả về danh sách khoá. */
export function dangKyDau(RigSVG, gocTen = 'vet') {
  const goc = RigSVG.NHAN_VAT[gocTen];
  if (!goc) throw new Error(`[characters] không có nhân vật gốc "${gocTen}"`);
  const ds = dungDau(goc);
  for (const [k, v] of Object.entries(ds)) RigSVG.dangKy(k, v);
  return Object.keys(ds);
}
