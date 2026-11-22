// parts.js — vài BỘ PHẬN vẽ sẵn cho nhân vật tuỳ chỉnh: kính, râu, ria, nếp nhăn, yếm tạp dề,
// và đồ vật cầm tay (cốc, bìa kẹp hồ sơ, điện thoại).
//
// Mỗi hàm trả về một chuỗi SVG trong HỆ TOẠ ĐỘ TÂM ĐẦU, để đặt vào slot `faceExtras`
// (kính) hoặc `beard` (râu, ria). `c` là bảng màu của nhân vật; màu mặc định lấy từ đó,
// truyền `color` để chỉ định riêng.

/** Kính gọng tròn. `x`, `y`: tâm tròng kính (mặc định khớp mắt chuẩn), `r`: bán kính tròng. */
export function roundGlasses(c, { x = 20, y = 2, r = 12, color = null, width = 2.4 } = {}) {
  const stroke = color || c.accent || c.lineStroke;
  return `
            <g fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round">
              <circle cx="${-x}" cy="${y}" r="${r}" fill="#ffffff" fill-opacity=".14"/>
              <circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" fill-opacity=".14"/>
              <path d="M ${-x + r} ${y - 2} Q 0 ${y - 7} ${x - r} ${y - 2}"/>
              <path d="M ${-x - r} ${y - 2} L -47 ${y - 6} M ${x + r} ${y - 2} L 47 ${y - 6}"/>
            </g>`;
}

/**
 * Râu quai nón ngắn ôm hàm, có khoét quanh miệng. `chin`: cao độ đáy cằm của khuôn mặt
 * (mặc định 54 — khớp cằm chuẩn; mặt ngắn hơn thì giảm), `mouthY`: cao độ miệng.
 */
export function shortBeard(c, { color = null, chin = 54, mouthY = 30, width = 43 } = {}) {
  const fill = color || c.hair;
  return `
            <path fill="${fill}" d="M ${-width} 10 Q ${-width - 2} ${chin - 12} ${-width * 0.55} ${chin - 1} Q 0 ${chin + 6} ${width * 0.55} ${chin - 1}
              Q ${width + 2} ${chin - 12} ${width} 10 Q ${width - 5} ${mouthY - 8} ${width * 0.42} ${mouthY - 9}
              Q 0 ${mouthY - 13} ${-width * 0.42} ${mouthY - 9} Q ${-width + 5} ${mouthY - 8} ${-width} 10 Z"/>
            <path fill="${c.skin}" d="M -13 ${mouthY - 5} Q 0 ${mouthY - 9} 13 ${mouthY - 5} Q 14 ${mouthY + 7} 0 ${mouthY + 9} Q -14 ${mouthY + 7} -13 ${mouthY - 5} Z"/>`;
}

/** Ria mép. `mouthY`: cao độ miệng của nhân vật. */
export function moustache(c, { color = null, mouthY = 30, width = 17 } = {}) {
  const fill = color || c.hair;
  return `
            <path fill="${fill}" d="M 0 ${mouthY - 9} Q ${-width * 0.5} ${mouthY - 13} ${-width} ${mouthY - 5} Q ${-width * 0.55} ${mouthY - 3.5} 0 ${mouthY - 5.5}
              Q ${width * 0.55} ${mouthY - 3.5} ${width} ${mouthY - 5} Q ${width * 0.5} ${mouthY - 13} 0 ${mouthY - 9} Z"/>`;
}

// Màu nét cho các bộ phận dưới đây. Base `default` để trống `lineStroke` (rig tự suy khi vẽ áo),
// nên phải có đường lui — nếu không sẽ ra `stroke="null"`.
const lineOf = (c) => c.lineStroke || c.topShadow || '#3a3f4a';

/** Nếp nhăn tuổi tác: hai vết chân chim ở đuôi mắt, hai rãnh má, hai nếp trán. Đặt vào `faceExtras`. */
export function wrinkles(c, { color = null, eyeX = 20, eyeY = 2, mouthY = 30, forehead = true } = {}) {
  const stroke = color || c.skinShadow || '#c9987a';
  return `
            <g fill="none" stroke="${stroke}" stroke-width="1.3" stroke-linecap="round" opacity=".8">
              ${[-1, 1].map((g) => `
              <path d="M ${g * (eyeX + 15)} ${eyeY - 3} l ${g * 5} -3 M ${g * (eyeX + 16)} ${eyeY + 2} l ${g * 5.500} 1"/>
              <path d="M ${g * 15} ${mouthY - 14} Q ${g * 21} ${mouthY - 5} ${g * 18} ${mouthY + 3}"/>`).join('')}
              ${forehead ? `<path d="M -15 ${eyeY - 31} Q 0 ${eyeY - 34} 15 ${eyeY - 31} M -11 ${eyeY - 25} Q 0 ${eyeY - 27.500} 11 ${eyeY - 25}"/>` : ''}
            </g>`;
}

/**
 * YẾM tạp dề: tấm che ngực và hai dây vòng qua cổ, trong hệ toạ độ THÂN. Đặt vào `accessories`
 * (bên trong nhóm `<g id="${p}-accessories">`), ghép với `skirt: { kind: 'apron' }` cho phần dưới hông.
 * `top`: cao độ mép trên của yếm (y, âm là lên; −70 ≈ ngang ngực) · `width`: NỬA bề ngang mép trên (16;
 * người to ngang thì 22–26) · `waist`: cao độ mép dưới (y, 14 ≈ ngay trên gấu áo). Dây đeo tự nối từ hai
 * góc trên lên cổ, yếm rộng hay hẹp cũng vậy.
 */
export function apronBib(c, { color = null, top = -70, width = 16, waist = 14 } = {}) {
  const fill = color || c.skirt || c.accent || c.topShadow, line = lineOf(c);
  return `
        <path d="M ${-width + 2} ${top} Q ${-(width + 11) / 2} ${(top - 103) / 2 + 2} -9 -103 M ${width - 2} ${top} Q ${(width + 11) / 2} ${(top - 103) / 2 + 2} 9 -103" stroke="${fill}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M ${-width} ${top} H ${width} L ${width + 9} ${waist - 18} V ${waist} H ${-width - 9} V ${waist - 18} Z" fill="${fill}" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>
        <path d="M -9 ${top + 22} h 18 v 12 q 0 3 -3 3 h -12 q -3 0 -3 -3 z" fill="none" stroke="${line}" stroke-width="1.100" stroke-linejoin="round" opacity=".7"/>`;
}

/* ── ĐỒ VẬT CẦM TAY — hệ toạ độ CỔ TAY: lòng bàn tay quanh (0, 10), ngón chỉ xuống +y.
      Đặt vào `heldItemL` / `heldItemR`; nên cho bàn tay ấy nắm lại (`handL: 'fist'` trong restPose). */

// Bốn ngón tay ÔM PHÍA TRƯỚC món đồ, vẽ SAU món đồ nên nằm trên nó. Rig vẽ bàn tay trước rồi mới tới món đồ: không
// có lớp này thì cả bàn tay nằm sau cái cốc, chỉ ló mấy đầu ngón ở một mép — cốc trông như dán vào bụng hoặc cắm vào
// cổ tay chứ không được cầm. Hệ toạ độ cổ tay: ngón chạy theo +y (hướng cẳng tay) từ mép phía cổ tay, vắt ngang món
// đồ `reach` đơn vị; bốn ngón xếp cạnh nhau theo x quanh lòng bàn tay. NGÓN CÁI ló ra phía trên ngón trỏ, chếch về phía
// miệng món đồ (+x): thiếu nó thì bốn ngón đọc thành bốn viên thuốc dán lên cốc. Chúng bắt đầu NGAY Ở CỔ TAY ÁO (y −5) để ống tay áo
// chảy liền vào các ngón; rig ẩn nắm tay phía sau món đồ khi có nhóm `data-grip` (nắm tay ló ra ở mép bên kia cái cốc,
// đọc thành một bàn tay thứ hai).
const gripFingers = (c, { reach = 23, from = -5 } = {}) => {
  const line = lineOf(c), band = (x, len) =>
    `<rect x="${x - 2.3}" y="${from}" width="4.6" height="${len}" rx="2.3" fill="${c.skin}" stroke="${line}" stroke-width=".9"/>`;
  return `
        <g data-grip="1"><rect x="8" y="${from + 0.4}" width="13" height="5.4" rx="2.7" fill="${c.skin}" stroke="${line}" stroke-width=".9" transform="rotate(24 8 ${from + 3})"/>${band(-6.9, reach - 2)}${band(-2.3, reach)}${band(2.3, reach - 0.5)}${band(6.9, reach - 3)}</g>`;
};

// Món đồ DẸT (bìa hồ sơ, điện thoại) cầm kiểu khác: bốn ngón đỡ phía SAU, chỉ NGÓN CÁI đè lên mặt trước — vẽ bốn ngón
// vắt ngang thì che mất tờ giấy hay màn hình. `far`: vị trí mép bên kia của món đồ (y); cho vào thì vẽ thêm ba đầu ngón
// ló ra ở mép ấy.
const gripThumb = (c, { reach = 13, from = -5, x = 0, far = null } = {}) => {
  const line = lineOf(c);
  const tips = far == null ? '' : [-4.6, 0, 4.6].map((dx) => `<circle cx="${x + dx}" cy="${far}" r="2.3" fill="${c.skin}" stroke="${line}" stroke-width=".9"/>`).join('');
  return `
        <g data-grip="1">${tips}<rect x="${x - 2.9}" y="${from}" width="5.8" height="${reach}" rx="2.9" fill="${c.skin}" stroke="${line}" stroke-width=".9" transform="rotate(-14 ${x} ${from})"/></g>`;
};

/** Cốc giấy có nắp (cà phê mang đi), bàn tay nắm ngang thân cốc: bốn ngón ôm phía trước cốc (`grip: false` để bỏ). */
export function cup(c, { color = '#f4efe6', lid = '#4a3b33', sleeve = '#b9834f', size = 1.3, grip = true } = {}) {
  const line = lineOf(c);
  return `
        <g transform="translate(0 12) rotate(90) scale(${size})">
          <path d="M -8.500 -17 L -6.500 13 Q 0 15 6.500 13 L 8.500 -17 Z" fill="${color}" stroke="${line}" stroke-width="1.100" stroke-linejoin="round"/>
          <path d="M -8 -7 L -7.200 5 Q 0 7 7.200 5 L 8 -7 Q 0 -5 -8 -7 Z" fill="${sleeve}"/>
          <path d="M -10 -21 h 20 v 4 h -20 z" fill="${lid}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>
        </g>${grip ? gripFingers(c) : ''}`;
}

/** Bìa kẹp hồ sơ, cầm ở mép dưới: ngón cái đè lên mặt trước (`grip: false` để bỏ). */
export function clipboard(c, { color = '#b9834f', paper = '#ffffff', grip = true } = {}) {
  const line = lineOf(c);
  return `
        <g transform="translate(2 10) rotate(90)" data-clipboard="1">
          <rect x="-15" y="-34" width="30" height="40" rx="2.500" fill="${color}" stroke="${line}" stroke-width="1.100"/>
          <rect x="-12" y="-29" width="24" height="32" fill="${paper}"/>
          <path d="M -8 -23 h 9 M -8 -17 h 16 M -8 -11 h 13 M -8 -5 h 7" stroke="${line}" stroke-width="1.200" stroke-linecap="round" opacity=".45"/>
          <!-- TỜ TRÊN CÙNG (\`data-page\`: mép trên ở y −29) — \`readChart\` lật nó lên quanh mép kẹp; tờ dưới có dòng chữ khác. -->
          <g data-page="-29"><path data-sheet="1" data-paper="${paper}" d="M -12 -29 H 12 V 3 H -12 Z" fill="${paper}" stroke="${line}" stroke-width=".5" stroke-opacity=".35"/>
            <path data-ink="1" d="M -8 -21 h 16 M -8 -15 h 16 M -8 -9 h 11" stroke="${line}" stroke-width="1.200" stroke-linecap="round" opacity=".45"/></g>
          <rect x="-6" y="-37" width="12" height="6" rx="2" fill="#aeb6c0" stroke="${line}" stroke-width="1"/>
        </g>${grip ? gripThumb(c, { x: 1 }) : ''}`;
}

/**
 * Điện thoại, cầm dọc trong lòng bàn tay: ngón cái ở mặt trước, ba đầu ngón ló ra mép bên kia (`grip: false` để bỏ).
 * `image`: ảnh hiện trên màn hình (đường dẫn hay data URL — giao diện app chẳng hạn), lấp đầy màn hình, cắt theo góc bo.
 * Có sẵn MẶT LƯNG (`data-back`, ẩn) — rig lật sang nó khi áp điện thoại lên má (`call`), xem trạng thái `itemBack`.
 */
export function phone(c, { color = '#22262e', screen = '#8fd3ff', image = null, grip = true } = {}) {
  const line = lineOf(c);
  // Mã cắt riêng cho từng lần vẽ: hai nhân vật cùng cầm điện thoại có ảnh thì clipPath không được trùng id.
  const clip = 'vgPhoneClip' + (phoneClipCount++);
  const shot = image ? `<clipPath id="${clip}"><rect x="-5.800" y="-16.500" width="11.600" height="21" rx="1.500"/></clipPath>
          <image href="${String(image).replace(/"/g, '&quot;')}" x="-5.800" y="-16.500" width="11.600" height="21" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clip})"/>` : '';
  return `
        <g transform="translate(0 10) rotate(90)">
          <rect x="-7.500" y="-19" width="15" height="28" rx="3" fill="${color}" stroke="${line}" stroke-width=".8"/>
          <g data-front="1"><rect x="-5.800" y="-16.500" width="11.600" height="21" rx="1.500" fill="${screen}"/>${shot}</g>
          <g data-back="1" style="display:none"><circle cx="-3.6" cy="-15" r="1.6" fill="#0d0f13"/><circle cx="-3.6" cy="-11" r="1.6" fill="#0d0f13"/></g>
        </g>${grip ? `<g data-front="1">${gripThumb(c, { reach: 11, far: 18 })}</g><g data-back="1" style="display:none">${gripFingers(c, { reach: 15 })}</g>` : ''}`;
}
let phoneClipCount = 0;

/**
 * ỐNG TIÊM cầm dọc, mũi kim chúc xuống: thân trong suốt có vạch, thuốc màu `liquid`, pít-tông (`data-plunger`) trượt
 * xuống khi tiêm (`rig.inject()` lái kênh `plunger`). Ngón cái đè lên mặt trước. `data-syringe` để `inject` nhận ra.
 */
export function syringe(c, { liquid = '#8fd0e8', grip = true } = {}) {
  const line = lineOf(c);
  return `
        <g data-syringe="1" transform="translate(0 10) rotate(90) translate(0 -4)">
          <g data-plunger="9"><rect x="-1.4" y="-26" width="2.8" height="14" fill="#c9ced6" stroke="${line}" stroke-width=".7"/><rect x="-5" y="-28" width="10" height="3" rx="1.2" fill="#e8ebef" stroke="${line}" stroke-width=".8"/></g>
          <rect x="-4" y="-14" width="8" height="24" rx="1.5" fill="#f4f8fb" fill-opacity=".85" stroke="${line}" stroke-width=".9"/>
          <rect x="-3.2" y="-3" width="6.4" height="12.4" fill="${liquid}" opacity=".85"/>
          <path d="M -4 -6 h 3 M -4 -1 h 3 M -4 4 h 3" stroke="${line}" stroke-width=".6" opacity=".6"/>
          <rect x="-6" y="-15.5" width="12" height="2.4" rx="1" fill="#e8ebef" stroke="${line}" stroke-width=".7"/>
          <path d="M -1.6 10 h 3.2 l -1 3 h -1.2 z" fill="#c9ced6" stroke="${line}" stroke-width=".5"/>
          <path d="M 0 13 V 25" stroke="#9aa3ad" stroke-width="1" stroke-linecap="round"/>
        </g>${grip ? gripThumb(c, { reach: 10, from: -2 }) : ''}`;
}

/** QUAI DÂY DẮT (vòng quai và một đoạn dây thả xuống): cầm để `leash(pet)` — dây tới vòng cổ con vật do rig vẽ. */
export function leash(c, { color = '#c0392b', grip = true } = {}) {
  const line = lineOf(c);
  return `
        <g data-leash="1" transform="translate(0 12)">
          <path d="M -6 -2 Q -9 -14 0 -15 Q 9 -14 6 -2" fill="none" stroke="${color}" stroke-width="3.4" stroke-linecap="round"/>
          <path d="M -6 -2 Q -9 -14 0 -15 Q 9 -14 6 -2" fill="none" stroke="${line}" stroke-width=".7" opacity=".5"/>
          <rect x="-7.5" y="-3" width="15" height="6" rx="2.5" fill="${color}" stroke="${line}" stroke-width=".9"/>
        </g>${grip ? gripFingers(c, { reach: 15 }) : ''}`;
}

/** LỌ THUỐC (hộp thuốc viên có nắp, nhãn): đưa cho chủ nuôi, giới thiệu đơn thuốc. */
export function pills(c, { color = '#f2f4f7', cap = '#e46d5c', label = '#ffffff', grip = true } = {}) {
  const line = lineOf(c);
  return `
        <g transform="translate(0 12) rotate(90)">
          <rect x="-9" y="-13" width="18" height="24" rx="3" fill="${color}" stroke="${line}" stroke-width="1"/>
          <rect x="-10" y="-19" width="20" height="7" rx="2" fill="${cap}" stroke="${line}" stroke-width="1"/>
          <rect x="-7" y="-7" width="14" height="10" rx="1.2" fill="${label}" stroke="${line}" stroke-width=".6"/>
          <path d="M -3.5 -2 h 7 M 0 -5.5 v 7" stroke="${cap}" stroke-width="2" stroke-linecap="round"/>
        </g>${grip ? gripFingers(c, { reach: 21 }) : ''}`;
}
