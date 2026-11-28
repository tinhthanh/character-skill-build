// shop50b-items.js — ĐỢT 50 B: ba MÓN HÀNG của cửa hàng thú cưng cầm trong tay (lấy trên kệ — `takeFromShelf`, quét mã — `scanBarcode`):
// túi hạt (`foodBag`), hộp bánh thưởng (`treatBox`), lon pate (`can`). Nhãn chung chung, không thương hiệu (dữ liệu giả).
//
// Hệ toạ độ như các món đồ khác của parts.js: hệ CỔ TAY, lòng bàn tay ở (0, 10); nhóm món hàng xoay 90° (−y là phía trên khi đứng thẳng).
// Mỗi món có HAI MẶT: mặt trước có nhãn (`data-side50b="front"`) và mặt sau / cạnh hộp (`data-side50b="back"`, ẩn) — rig lật sang mặt sau lúc vừa
// lấy khỏi kệ rồi XOAY về mặt nhãn để đọc (kênh `spin50bL/R`, runtime/person/shop50b.js). `data-shop50b` = loại món (rig nhận ra món hàng), có một
// điểm `data-code50b` ở giữa vạch mã vạch (máy quét chĩa vào đó).

const SIZE50B = 1.4;                   // món hàng to hơn đồ cầm thường (đọc được ở cảnh trung)
const lineOf = (c) => c.lineStroke || c.topShadow || '#3a3f4a';

// Ngón cái đè lên mặt trước, bốn ngón ló ra ở mép kia (như bìa hồ sơ của parts.js) — không che nhãn.
const thumb50b = (c, { reach = 12, from = -5, x = 0, far = null } = {}) => {
  const line = lineOf(c);
  const tips = far == null ? '' : [-4.6, 0, 4.6].map((dx) => `<circle cx="${x + dx}" cy="${far}" r="2.3" fill="${c.skin}" stroke="${line}" stroke-width=".9"/>`).join('');
  return `<g data-grip="1">${tips}<rect x="${x - 2.9}" y="${from}" width="5.8" height="${reach}" rx="2.9" fill="${c.skin}" stroke="${line}" stroke-width=".9" transform="rotate(-14 ${x} ${from})"/></g>`;
};
// Bốn ngón nắm mép trên của túi (túi treo dưới nắm tay, như túi thuốc).
const fingers50b = (c, { reach = 13, from = -9 } = {}) => {
  const line = lineOf(c), band = (x, len) => `<rect x="${x - 2.3}" y="${from}" width="4.6" height="${len}" rx="2.3" fill="${c.skin}" stroke="${line}" stroke-width=".9"/>`;
  return `<g data-grip="1"><rect x="8" y="${from + 0.4}" width="13" height="5.4" rx="2.7" fill="${c.skin}" stroke="${line}" stroke-width=".9" transform="rotate(24 8 ${from + 3})"/>${band(-6.9, reach - 2)}${band(-2.3, reach)}${band(2.3, reach - 0.5)}${band(6.9, reach - 3)}</g>`;
};
// Mã vạch nhỏ (mặt sau): vạch đen trên nền trắng, điểm giữa `data-code50b`.
const barcode50b = (x, y, w = 14, h = 7) => {
  const bars = [0, 1.6, 2.6, 4.4, 5.3, 6.9, 8.1, 9.2, 10.9, 12.2].map((dx, n) => `<rect x="${(x + 1 + dx * (w - 2) / 13).toFixed(2)}" y="${y + 1}" width="${n % 3 ? 0.7 : 1.2}" height="${h - 2}" fill="#1d2128"/>`).join('');
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.8" fill="#ffffff" stroke="#9aa3ad" stroke-width=".4"/>${bars}<circle data-code50b="1" cx="${x + w / 2}" cy="${y + h / 2}" r="0.5" fill="none"/>`;
};
const text50b = (x, y, size, words, fill = '#16303a', weight = 700) => `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="middle" data-layout-ignore="">${words}</text>`;
const paw50b = (x, y, r, fill) => `<g fill="${fill}"><ellipse cx="${x}" cy="${y + r * 0.35}" rx="${r * 0.62}" ry="${r * 0.5}"/>${[[-0.62, -0.32], [-0.22, -0.7], [0.22, -0.7], [0.62, -0.32]].map(([dx, dy]) => `<circle cx="${(x + dx * r).toFixed(2)}" cy="${(y + dy * r).toFixed(2)}" r="${(r * 0.24).toFixed(2)}"/>`).join('')}</g>`;

/** TÚI HẠT cho chó (mặc định "Hạt cho chó"): túi giấy bạc đáy vuông, mép trên dán kín — cầm ở mép trên, túi treo dưới nắm tay. */
export function foodBag50b(c, { color = '#e0773a', band = '#f6d36b', label = 'Hạt cho chó', grip = true } = {}) {
  const line = lineOf(c);
  return `
        <g data-shop50b="foodBag" transform="translate(0 10) rotate(90) scale(${SIZE50B})">
          <path d="M -12 -2 H 12 V 5 H -12 Z" fill="${band}" stroke="${line}" stroke-width="1"/>
          <path d="M -12 5 L 12 5 L 15 44 Q 0 46.5 -15 44 Z" fill="${color}" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>
          <g data-side50b="front"><rect x="-11" y="14" width="22" height="20" rx="3" fill="#fffaf0" stroke="${line}" stroke-width=".6"/>
            ${paw50b(0, 21.5, 4.6, color)}${text50b(0, 31.5, 4.6, label)}
            <path d="M -14 39 Q 0 41 14 39" stroke="${band}" stroke-width="2.4" fill="none"/></g>
          <g data-side50b="back" style="display:none"><path d="M -9 12 h 18 M -9 16 h 14 M -9 20 h 16 M -9 24 h 11" stroke="#fffaf0" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>${barcode50b(-7, 31, 14, 8)}</g>
        </g>${grip ? fingers50b(c, { reach: 13, from: -9 }) : ''}`;
}

/** HỘP BÁNH THƯỞNG (mặc định "Bánh thưởng"): hộp giấy chữ nhật, cầm dọc ở mép dưới — ngón cái đè lên mặt trước, đầu ngón ló ra ở mép kia. */
export function treatBox50b(c, { color = '#3f8fd6', band = '#ffffff', label = 'Bánh thưởng', grip = true } = {}) {
  const line = lineOf(c);
  return `
        <g data-shop50b="treatBox" transform="translate(0 10) rotate(90) scale(${SIZE50B})">
          <path d="M -13 -30 L 13 -30 L 13 2 L -13 2 Z" fill="${color}" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>
          <path d="M -13 -30 L -10 -34 L 16 -34 L 13 -30 Z M 13 -30 L 16 -34 L 16 -2 L 13 2 Z" fill="${color}" stroke="${line}" stroke-width=".9" stroke-linejoin="round" opacity=".8"/>
          <g data-side50b="front"><rect x="-10" y="-25" width="20" height="17" rx="2.6" fill="${band}" stroke="${line}" stroke-width=".6"/>
            <path d="M -6 -19.5 a 2.4 2.4 0 1 1 3 -2.6 h 6 a 2.4 2.4 0 1 1 3 2.6 a 2.4 2.4 0 1 1 -3 2.6 h -6 a 2.4 2.4 0 1 1 -3 -2.6 z" fill="#e8b87a" stroke="${line}" stroke-width=".5"/>
            ${text50b(0, -10.6, 4.2, label)}</g>
          <g data-side50b="back" style="display:none"><path d="M -9 -26 h 18 M -9 -22 h 13 M -9 -18 h 16" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity=".75"/>${barcode50b(-7, -13, 14, 8)}</g>
        </g>${grip ? thumb50b(c, { reach: 10, x: 1, far: -2 }) : ''}`;
}

/** LON PATE cho mèo (mặc định "Pate cho mèo"): lon thiếc tròn có nắp khoen, nhãn quấn quanh — cầm ngang thân lon. */
export function can50b(c, { color = '#d94f6a', band = '#fff4f0', label = 'Pate cho mèo', grip = true } = {}) {
  const line = lineOf(c);
  return `
        <g data-shop50b="can" transform="translate(0 10) rotate(90) scale(${SIZE50B})">
          <path d="M -10 -18 L 10 -18 L 10 6 Q 0 9 -10 6 Z" fill="#c9ced6" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>
          <ellipse cx="0" cy="-18" rx="10" ry="2.6" fill="#e3e7ec" stroke="${line}" stroke-width=".9"/><path d="M -3 -18.5 h 6" stroke="#8a929e" stroke-width="1.2" stroke-linecap="round"/>
          <path d="M -10 -14 L 10 -14 L 10 3 Q 0 5.6 -10 3 Z" fill="${color}"/>
          <g data-side50b="front"><rect x="-8" y="-12" width="16" height="12" rx="2" fill="${band}" stroke="${line}" stroke-width=".5"/>
            ${paw50b(0, -8.4, 2.8, color)}${text50b(0, -2.4, 3.4, label)}</g>
          <g data-side50b="back" style="display:none">${barcode50b(-6, -11, 12, 7)}<path d="M -7 -1.5 h 14" stroke="${band}" stroke-width="1.2" stroke-linecap="round" opacity=".8"/></g>
        </g>${grip ? thumb50b(c, { reach: 10, x: 1, far: 9 }) : ''}`;
}

// Bảng món hàng: tên → hàm vẽ, chữ nhãn mặc định, giá giả hiện trên máy quét (`scanBarcode`).
export const SHOP50B = {
  foodBag: { draw: foodBag50b, label: 'Hạt cho chó', price: '125.000đ' },
  treatBox: { draw: treatBox50b, label: 'Bánh thưởng', price: '45.000đ' },
  can: { draw: can50b, label: 'Pate cho mèo', price: '28.000đ' },
};
