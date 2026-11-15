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

/** Cốc giấy có nắp (cà phê mang đi), bàn tay nắm ngang thân cốc. */
export function cup(c, { color = '#f4efe6', lid = '#4a3b33', sleeve = '#b9834f', size = 1.3 } = {}) {
  const line = lineOf(c);
  return `
        <g transform="translate(0 12) rotate(90) scale(${size})">
          <path d="M -8.500 -17 L -6.500 13 Q 0 15 6.500 13 L 8.500 -17 Z" fill="${color}" stroke="${line}" stroke-width="1.100" stroke-linejoin="round"/>
          <path d="M -8 -7 L -7.200 5 Q 0 7 7.200 5 L 8 -7 Q 0 -5 -8 -7 Z" fill="${sleeve}"/>
          <path d="M -10 -21 h 20 v 4 h -20 z" fill="${lid}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>
        </g>`;
}

/** Bìa kẹp hồ sơ, cầm ở mép dưới. */
export function clipboard(c, { color = '#b9834f', paper = '#ffffff' } = {}) {
  const line = lineOf(c);
  return `
        <g transform="translate(2 10) rotate(90)">
          <rect x="-15" y="-34" width="30" height="40" rx="2.500" fill="${color}" stroke="${line}" stroke-width="1.100"/>
          <rect x="-12" y="-29" width="24" height="32" fill="${paper}"/>
          <path d="M -8 -21 h 16 M -8 -15 h 16 M -8 -9 h 11" stroke="${line}" stroke-width="1.200" stroke-linecap="round" opacity=".45"/>
          <rect x="-6" y="-37" width="12" height="6" rx="2" fill="#aeb6c0" stroke="${line}" stroke-width="1"/>
        </g>`;
}

/** Điện thoại, cầm dọc trong lòng bàn tay. */
export function phone(c, { color = '#22262e', screen = '#8fd3ff' } = {}) {
  return `
        <g transform="translate(0 10) rotate(90)">
          <rect x="-7.500" y="-19" width="15" height="28" rx="3" fill="${color}"/>
          <rect x="-5.800" y="-16.500" width="11.600" height="21" rx="1.500" fill="${screen}"/>
        </g>`;
}
