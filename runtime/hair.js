// hair.js — KIỂU TÓC dựng sẵn cho nhân vật tuỳ chỉnh.
//
// Mỗi kiểu là một HÀM TẠO: gọi nó (kèm tuỳ chọn) để lấy hàm vẽ đặt thẳng vào slot `hair`:
//
//     hair: kit.hair.bob(),
//     hair: kit.hair.ponytail({ side: 'right', tie: '#d6453d' }),
//
// Hình vẽ nằm trong HỆ TOẠ ĐỘ TÂM ĐẦU (sọ: x −50…50, đỉnh y ≈ −56, cằm y ≈ +56), bọc sẵn trong
// nhóm `hair-front` mà rig yêu cầu; phần búi / đuôi nằm trong `hair-bun` để rig đẩy ra sau khi
// nhân vật quay. Màu lấy từ `colors.hair`, vệt sáng từ `colors.hairHighlight` (không khai thì
// không vẽ vệt sáng), dây buộc từ `colors.accent`.

const shine = (c, d, width = 3, opacity = 0.7) =>
  (c.hairHighlight ? `<path d="${d}" stroke="${c.hairHighlight}" stroke-width="${width}" fill="none" stroke-linecap="round" opacity="${opacity}"/>` : '');
const group = (p, c, body, mirror = false) => `
              <g id="${p}-hair-front" fill="${c.hair}"${mirror ? ' transform="scale(-1 1)"' : ''}>${body}
              </g>`;
const tieColor = (c, tie) => tie || c.accent || c.hairHighlight || c.hair;

/** Cắt ngắn gọn, mái vuốt ngang — kiểu nam cơ bản. */
export const crop = () => (p, c) => group(p, c, `
                <path d="M -51 2 Q -55 -40 -20 -56 Q 16 -68 42 -46 Q 54 -34 51 2 Q 45 -24 22 -33 Q 2 -39 -16 -31 Q -36 -22 -51 2 Z"/>
                <path d="M -50 0 Q -52 12 -47 22 Q -42 10 -43 -6 Z"/>
                <path d="M 50 0 Q 52 12 47 22 Q 42 10 43 -6 Z"/>
                ${shine(c, 'M -30 -46 Q -6 -56 16 -50')}${shine(c, 'M 24 -42 Q 38 -36 45 -26', 2.2, 0.6)}`);

/** Rẽ ngôi lệch, mái chải sang một bên. `side`: ngôi nằm bên 'left' | 'right' của màn hình. */
export const sidePart = ({ side = 'left' } = {}) => (p, c) => group(p, c, `
                <path d="M -50 18 Q -58 -32 -24 -58 Q 4 -72 30 -56 Q 58 -34 50 18 Q 48 -10 43 -22 Q 30 -40 4 -36 Q -22 -30 -40 -14 Q -47 -2 -50 18 Z"/>
                ${shine(c, 'M -22 -52 Q 4 -60 24 -50')}${shine(c, 'M -44 -8 Q -40 -26 -26 -38', 2.4, 0.55)}`, side === 'right');

/** Tóc bob ngang cằm, mái thưa. */
export const bob = () => (p, c) => group(p, c, `
                <path d="M -53 31 Q -64 -34 -28 -61 Q 0 -75 28 -61 Q 64 -34 53 31 Q 45 36 40 27 Q 46 -8 31 -25 Q 12 -39 -4 -33 Q -29 -30 -40 -14 Q -45 6 -40 27 Q -45 36 -53 31 Z"/>
                ${shine(c, 'M -28 -52 Q -4 -63 20 -54', 3.2, 0.8)}${shine(c, 'M -48 4 Q -50 -18 -38 -36', 2.4, 0.6)}`);

/** Tóc dài thẳng qua vai. `length`: 0 (ngang vai) … 1 (giữa ngực). */
export const long = ({ length = 0.5 } = {}) => (p, c) => {
  const end = 62 + Math.max(0, Math.min(1, length)) * 44;
  return group(p, c, `
                <path d="M -55 ${end} Q -72 -30 -30 -62 Q 0 -77 30 -62 Q 72 -30 55 ${end} Q 45 ${end + 5} 37 ${end - 6} Q 47 20 43 -6 Q 36 -26 14 -34 Q -6 -38 -20 -30 Q -40 -22 -43 -4 Q -47 22 -37 ${end - 6} Q -45 ${end + 5} -55 ${end} Z"/>
                ${shine(c, 'M -28 -53 Q -2 -65 22 -55', 3.2, 0.8)}${shine(c, 'M -52 30 Q -58 -6 -44 -34', 2.4, 0.55)}${shine(c, 'M 52 34 Q 56 6 48 -18', 2.2, 0.45)}`);
};

/** Đuôi ngựa buộc lệch một bên. `side`: bên màn hình có đuôi tóc; `tie`: màu dây buộc. */
export const ponytail = ({ side = 'left', tie = null } = {}) => (p, c) => group(p, c, `
                <g id="${p}-hair-bun">
                  <path d="M -34 -40 Q -68 -26 -76 6 Q -82 40 -64 58 Q -52 42 -58 16 Q -60 -8 -30 -20 Z"/>
                  ${shine(c, 'M -46 -26 Q -60 -18 -63 0', 2.6, 0.5)}
                </g>
                <path d="M -50 22 Q -60 -30 -26 -58 Q 0 -74 26 -58 Q 60 -30 50 22 Q 47 -6 41 -18 Q 22 -38 2 -32 Q -20 -38 -41 -18 Q -47 -6 -50 22 Z"/>
                ${shine(c, 'M -30 -50 Q -6 -62 18 -52', 3.2, 0.8)}${shine(c, 'M -46 -14 Q -44 -32 -32 -44', 2.4, 0.6)}
                <circle cx="-40" cy="-32" r="5" fill="${tieColor(c, tie)}"/>`, side === 'right');

/** Búi cao trên đỉnh đầu. `size`: 0.7 … 1.4. */
export const bun = ({ size = 1 } = {}) => (p, c) => group(p, c, `
                <g id="${p}-hair-bun">
                  <ellipse cx="2" cy="${-58 - 18 * size}" rx="${26 * size}" ry="${19 * size}"/>
                  ${shine(c, `M ${-14 * size} ${-58 - 30 * size} Q -2 ${-58 - 38 * size} ${14 * size} ${-58 - 32 * size}`, 3.4, 0.9)}
                </g>
                <path d="M -50 34 Q -66 -28 -32 -68 Q 0 -84 32 -68 Q 66 -28 50 34 Q 50 22 47 8 Q 48 -34 0 -42 Q -48 -34 -47 8 Q -50 22 -50 34 Z"/>
                ${shine(c, 'M -42 -44 Q -28 -60 -8 -62', 3.6, 0.9)}${shine(c, 'M 16 -62 Q 34 -56 42 -44', 2.8, 0.7)}`);

/** Hai bím hai bên (trẻ em). `tie`: màu dây buộc. */
export const pigtails = ({ tie = null } = {}) => (p, c) => group(p, c, `
                <path d="M -50 -8 Q -74 -4 -72 26 Q -70 46 -58 52 Q -50 34 -52 14 Z"/>
                <path d="M 50 -8 Q 74 -4 72 26 Q 70 46 58 52 Q 50 34 52 14 Z"/>
                <path d="M -50 20 Q -60 -30 -26 -58 Q 0 -74 26 -58 Q 60 -30 50 20 Q 47 -8 40 -20 Q 22 -34 0 -44 Q -22 -34 -40 -20 Q -47 -8 -50 20 Z"/>
                ${shine(c, 'M -30 -50 Q -14 -60 -2 -60', 3, 0.8)}${shine(c, 'M 8 -60 Q 24 -56 34 -46', 2.6, 0.6)}
                <circle cx="-52" cy="-4" r="4.500" fill="${tieColor(c, tie)}"/><circle cx="52" cy="-4" r="4.500" fill="${tieColor(c, tie)}"/>`);

/** Tóc xoăn bồng. `volume`: 0.7 … 1.4. */
export const curly = ({ volume = 1 } = {}) => (p, c) => {
  const r = 15 * volume, curls = [];
  // Một vòng lọn tròn ôm từ thái dương bên này qua đỉnh đầu sang bên kia…
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * (1.08 - i * 0.145);
    curls.push(`<circle cx="${(52 * Math.cos(a)).toFixed(1)}" cy="${(-12 - 46 * Math.sin(a)).toFixed(1)}" r="${(r + (i % 2) * 1.5).toFixed(1)}"/>`);
  }
  // …và một hàng lọn nhỏ làm mái.
  for (let i = 0; i < 5; i++) curls.push(`<circle cx="${-32 + i * 16}" cy="${-34 - (i % 2) * 3}" r="${(10 * volume).toFixed(1)}"/>`);
  return group(p, c, `
                <path d="M -50 -4 Q -56 -54 0 -62 Q 56 -54 50 -4 Q 32 -32 0 -32 Q -32 -32 -50 -4 Z"/>
                ${curls.join('')}
                ${shine(c, 'M -30 -62 Q -22 -70 -12 -66', 2.6, 0.6)}${shine(c, 'M 6 -68 Q 16 -74 26 -66', 2.6, 0.6)}${shine(c, 'M -52 -28 Q -50 -38 -42 -42', 2.4, 0.5)}`);
};

/** Tóc dựng chỉa (thiếu niên, trẻ em). */
export const spiky = () => (p, c) => group(p, c, `
                <path d="M -50 0 Q -55 -28 -45 -44 L -43 -62 L -30 -54 L -22 -73 L -9 -59 L 2 -78 L 12 -59 L 25 -71 L 31 -54 L 44 -61 L 45 -43 Q 55 -28 50 0 Q 45 -22 28 -30 Q 8 -36 -12 -30 Q -34 -24 -50 0 Z"/>
                ${shine(c, 'M -20 -62 L -14 -50', 2.6, 0.6)}${shine(c, 'M 4 -66 L 8 -52', 2.6, 0.6)}${shine(c, 'M 26 -60 L 28 -48', 2.4, 0.5)}`);

/** Hói đỉnh đầu, còn hai chỏm tóc trên tai. Dùng kèm `backHair: 'low'`. */
export const tufts = () => (p, c) => group(p, c, `
                <path d="M -50 -22 Q -60 -12 -58 6 Q -57 18 -50 22 Q -46 6 -47 -8 Q -46 -18 -50 -22 Z"/>
                <path d="M 50 -22 Q 60 -12 58 6 Q 57 18 50 22 Q 46 6 47 -8 Q 46 -18 50 -22 Z"/>`);

/** Trọc hẳn. Dùng kèm `backHair: 'none'`. */
export const bald = () => (p, c) => group(p, c, '');
