// props.js — ĐẠO CỤ CẢNH vẽ sẵn: ghế, ghế đẩu, bàn, quầy, chậu cây, máy tính xách tay, màn hình.
//
// Đạo cụ vẽ trong CÙNG KHUNG với nhân vật người (400 × 470, sàn ở y = 458, giữa khung x = 200).
// Nhờ vậy muốn ghế nằm đúng dưới người ngồi thì chỉ cần cho host của ghế CÙNG `left`, `bottom`
// và `height` với host của nhân vật, đặt nó TRƯỚC nhân vật trong HTML (để nằm phía sau). Bàn và
// quầy cũng dùng cùng `bottom` + `height`, rồi dời `left` sang chỗ cần.

export const PROP_FRAME = { w: 400, h: 470, floor: 458, centre: 200 };
const SEAT_DEFAULT = 372;                      // cao độ mặt ghế khớp nhân vật có sẵn khi không đưa `for`

const shade = (hex, amount) => {               // tối đi (amount < 0) hoặc sáng lên một màu #rrggbb
  const n = parseInt(hex.slice(1), 16), mix = (v) => Math.max(0, Math.min(255, Math.round(v + (amount < 0 ? v : 255 - v) * amount)));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => mix(v).toString(16).padStart(2, '0')).join('');
};

// Mỗi đạo cụ: (o) => chuỗi SVG. `o.seat` là cao độ mặt ghế (y trong khung), `o.w` bề rộng.
const DRAW = {
  // Ghế đẩu: mặt tròn dẹt, bốn chân hơi choãi, một thanh giằng.
  stool: ({ seat, w = 84, color, dark, line }) => {
    const F = PROP_FRAME.floor, x0 = 200 - w / 2, x1 = 200 + w / 2;
    return `
    <path d="M ${x0 + 12} ${seat + 8} L ${x0 + 2} ${F} M ${x1 - 12} ${seat + 8} L ${x1 - 2} ${F}" stroke="${dark}" stroke-width="7" stroke-linecap="round"/>
    <path d="M ${x0 + 9} ${seat + (F - seat) * 0.6} H ${x1 - 9}" stroke="${dark}" stroke-width="4.500" stroke-linecap="round"/>
    <rect x="${x0}" y="${seat}" width="${w}" height="13" rx="6.500" fill="${color}" stroke="${line}" stroke-width="1.400"/>`;
  },
  // Ghế tựa nhìn từ trước: lưng ghế nhô lên sau lưng người ngồi.
  chair: ({ seat, w = 108, back = 92, color, dark, line }) => {
    const F = PROP_FRAME.floor, x0 = 200 - w / 2, x1 = 200 + w / 2;
    return `
    <rect x="${x0 + 4}" y="${seat - back}" width="${w - 8}" height="${back + 6}" rx="12" fill="${dark}" stroke="${line}" stroke-width="1.400"/>
    <path d="M ${x0 + 9} ${seat + 10} V ${F} M ${x1 - 9} ${seat + 10} V ${F}" stroke="${dark}" stroke-width="8" stroke-linecap="round"/>
    <rect x="${x0}" y="${seat}" width="${w}" height="15" rx="6" fill="${color}" stroke="${line}" stroke-width="1.400"/>`;
  },
  // Bàn: mặt bàn mỏng, hai chân.
  table: ({ w = 230, height = 150, color, dark, line }) => {
    const F = PROP_FRAME.floor, top = F - height, x0 = 200 - w / 2, x1 = 200 + w / 2;
    return `
    <path d="M ${x0 + 18} ${top + 10} V ${F} M ${x1 - 18} ${top + 10} V ${F}" stroke="${dark}" stroke-width="10" stroke-linecap="round"/>
    <rect x="${x0}" y="${top}" width="${w}" height="14" rx="5" fill="${color}" stroke="${line}" stroke-width="1.400"/>`;
  },
  // Quầy: khối đặc tới sàn, mặt quầy nhô ra một chút, hai đường chỉ ván.
  counter: ({ w = 300, height = 150, color, dark, line }) => {
    const F = PROP_FRAME.floor, top = F - height, x0 = 200 - w / 2;
    return `
    <rect x="${x0 + 6}" y="${top + 8}" width="${w - 12}" height="${height - 8}" fill="${dark}" stroke="${line}" stroke-width="1.400"/>
    <path d="M ${x0 + 6 + (w - 12) / 3} ${top + 16} V ${F - 6} M ${x0 + 6 + (w - 12) * 2 / 3} ${top + 16} V ${F - 6}" stroke="${line}" stroke-width="1.200" opacity=".45"/>
    <rect x="${x0}" y="${top}" width="${w}" height="13" rx="4" fill="${color}" stroke="${line}" stroke-width="1.400"/>`;
  },
  // Chậu cây: chậu hình thang, đất, năm lá dài toả ra. Dùng làm vật TIỀN CẢNH của bối cảnh 3D (đứng sát máy quay, trôi
  // qua khung hình nhanh hơn hậu cảnh khi máy lia — thị sai). `color` là màu chậu; lá luôn xanh.
  plant: ({ w = 120, color, dark, line }) => {
    const F = PROP_FRAME.floor, x0 = 200 - w / 2, x1 = 200 + w / 2, rim = F - 92;
    const leaf = (angle, length, tone) => `<path d="M 200 ${rim + 4} q ${Math.sin(angle) * length * 0.55 - 14} ${-Math.cos(angle) * length * 0.5} ${Math.sin(angle) * length} ${-Math.cos(angle) * length} q ${-Math.sin(angle) * length * 0.25 + 16} ${Math.cos(angle) * length * 0.55} ${-Math.sin(angle) * length} ${Math.cos(angle) * length} z" fill="${tone}" stroke="#2f5a3a" stroke-width="1.400" stroke-linejoin="round"/>`;
    return `
    ${leaf(-1.05, 170, '#5f9a68')}${leaf(1.0, 180, '#5f9a68')}${leaf(-0.45, 250, '#4f8a5b')}${leaf(0.5, 240, '#4f8a5b')}${leaf(0.02, 290, '#6aa873')}
    <path d="M ${x0} ${rim} H ${x1} L ${x1 - 14} ${F} H ${x0 + 14} Z" fill="${color}" stroke="${line}" stroke-width="1.400" stroke-linejoin="round"/>
    <rect x="${x0 - 6}" y="${rim - 6}" width="${w + 12}" height="18" rx="6" fill="${dark}" stroke="${line}" stroke-width="1.400"/>`;
  },
  // MÁY TÍNH XÁCH TAY đặt trên mặt bàn / quầy cao `on` (150 = bàn, quầy mặc định). `facing: 'away'` (mặc định) là máy
  // của người đứng SAU bàn: người xem thấy nắp máy (logo), nắp che hai bàn tay đang gõ (`rig.typing()`). `'viewer'`:
  // màn hình quay ra người xem, hiện `image` (giao diện app).
  laptop: ({ w = 96, on = 150, facing = 'away', image, color, dark, line }) => {
    const top = PROP_FRAME.floor - on, x0 = 200 - w / 2, h = w * 0.58;       // nắp thấp vừa đủ che bàn tay, để lộ vai và đầu đang cúi
    const base = `<rect x="${x0 - 6}" y="${top - 5}" width="${w + 12}" height="6" rx="2.500" fill="${dark}" stroke="${line}" stroke-width="1.200"/>`;
    if (facing === 'viewer') return `
    <rect x="${x0}" y="${top - 5 - h}" width="${w}" height="${h}" rx="5" fill="#22262e" stroke="${line}" stroke-width="1.400"/>
    ${screen(x0 + 5, top - h, w - 10, h - 10, image)}${base}`;
    return `
    <rect x="${x0}" y="${top - 5 - h}" width="${w}" height="${h}" rx="5" fill="${color}" stroke="${line}" stroke-width="1.400"/>
    <circle cx="200" cy="${top - 5 - h / 2}" r="${w * 0.07}" fill="${shade(color, 0.45)}"/>${base}`;
  },
  // MÀN HÌNH MÁY TÍNH để bàn trên mặt bàn / quầy cao `on`, màn hình quay ra người xem, hiện `image`.
  monitor: ({ w = 150, on = 150, image, color, dark, line }) => {
    const top = PROP_FRAME.floor - on, x0 = 200 - w / 2, h = w * 0.62, y0 = top - 26 - h;
    return `
    <path d="M 192 ${top - 28} h 16 l 5 24 h -26 z" fill="${dark}" stroke="${line}" stroke-width="1.200" stroke-linejoin="round"/>
    <rect x="172" y="${top - 6}" width="56" height="6" rx="3" fill="${dark}" stroke="${line}" stroke-width="1.200"/>
    <rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="6" fill="${color}" stroke="${line}" stroke-width="1.400"/>
    ${screen(x0 + 6, y0 + 6, w - 12, h - 12, image)}`;
  },
  // BÁT ăn của thú cưng, trên sàn: `fill` 'food' (hạt), 'water' (nước) hoặc 'empty'. Đặt host CÙNG khung với con vật
  // (`bottom`, `height` như host của nó) rồi dời ra trước mõm — `eat` / `drink` cúi đầu xuống đúng cao độ sàn.
  bowl: ({ w = 46, fill = 'food', color, dark, line }) => {
    const F = PROP_FRAME.floor, x0 = 200 - w / 2, x1 = 200 + w / 2, h = w * 0.36;
    const inside = fill === 'water' ? `<ellipse cx="200" cy="${F - h + 2}" rx="${w * 0.4}" ry="${w * 0.09}" fill="#8fd0f0"/>`
      : fill === 'food' ? [-12, -5, 2, 9, -8, 5].map((dx, n) => `<circle cx="${200 + dx * w / 46}" cy="${F - h + (n > 3 ? -1 : 1)}" r="${w * 0.07}" fill="#a0612f" stroke="#6e3e1b" stroke-width=".6"/>`).join('') : '';
    return `
    <path d="M ${x0} ${F - h} L ${x0 + w * 0.12} ${F} H ${x1 - w * 0.12} L ${x1} ${F - h} Z" fill="${color}" stroke="${line}" stroke-width="1.400" stroke-linejoin="round"/>
    <ellipse cx="200" cy="${F - h}" rx="${w / 2}" ry="${w * 0.12}" fill="${dark}" stroke="${line}" stroke-width="1.200"/>${inside}`;
  },
  // CÂN thú y: bệ cân thấp trên sàn, màn hình số ở mép trước hiện `reading` (vd. '4.2 kg'). Con vật đứng LÊN bệ: host của
  // nó cao hơn sàn đúng bề dày bệ (≈ 0,03 × chiều cao host).
  scale: ({ w = 210, reading = '', color, dark, line }) => {
    const F = PROP_FRAME.floor, x0 = 200 - w / 2, top = F - 14;
    const text = String(reading).replace(/[<&"]/g, '');
    return `
    <rect x="${x0}" y="${top}" width="${w}" height="14" rx="5" fill="${color}" stroke="${line}" stroke-width="1.400"/>
    <rect x="${x0 + 8}" y="${top - 3}" width="${w - 16}" height="5" rx="2.500" fill="${dark}" stroke="${line}" stroke-width="1"/>
    <rect x="${200 - 30}" y="${top + 2}" width="60" height="10" rx="2" fill="#18222b"/>
    ${text ? `<text x="200" y="${top + 10.5}" font-family="Arial, sans-serif" font-size="9" font-weight="700" fill="#7dffb0" text-anchor="middle" data-layout-ignore="">${text}</text>` : ''}`;
  },
};

// Mặt màn hình: nền sáng, hoặc ảnh lấp đầy (cắt theo khung). Mỗi lần vẽ một id cắt riêng.
let screenCount = 0;
function screen(x, y, w, h, image) {
  if (!image) return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#8fd3ff"/><path d="M ${x + 8} ${y + 10} h ${w * 0.5} M ${x + 8} ${y + 20} h ${w * 0.35}" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>`;
  const id = 'vgScreen' + (screenCount++);
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/></clipPath><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#fff"/>
    <image href="${String(image).replace(/"/g, '&quot;')}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`;
}

// Màu mặc định theo loại (đồ gỗ nâu; máy tính xám bạc / đen).
const DEFAULT_COLOR = { laptop: '#b8bfc8', monitor: '#2b2f36', bowl: '#d9534f', scale: '#c9d1d9' };

export const PROP_KINDS = Object.keys(DRAW);

/**
 * Dựng một đạo cụ vào `host`.
 *   kind     'chair' | 'stool' | 'table' | 'counter' | 'plant' | 'laptop' | 'monitor' | 'bowl' | 'scale'
 *   options  { for, color, width, height, back, on, image, facing, fill, reading }
 *     for      rig NGƯỜI sẽ ngồi lên (ghế, ghế đẩu) — mặt ghế tự khớp chiều cao ngồi của nhân vật ấy
 *     color    màu chính (#rrggbb); màu tối và màu nét tự suy
 *     width    bề rộng, đơn vị khung (ghế 108, ghế đẩu 84, bàn 230, quầy 300, chậu cây 120)
 *     height   chiều cao bàn / quầy tính từ sàn, đơn vị khung (150)
 *     back     chiều cao lưng ghế tính từ mặt ghế (92)
 *     on       máy tính: chiều cao mặt bàn / quầy nó đặt lên, tính từ sàn (150 — khớp bàn, quầy mặc định)
 *     image    máy tính: ảnh trên màn hình (đường dẫn / URL); laptop chỉ hiện khi `facing: 'viewer'`
 *     facing   laptop: 'away' (nắp quay ra người xem — máy của người đứng sau bàn) | 'viewer'
 *     fill     bát: 'food' (hạt, mặc định) | 'water' | 'empty'
 *     reading  cân: chữ trên màn hình số, vd. '4.2 kg'
 * Trả về { svg, kind, seatY }. Host nên có cùng `bottom` và `height` với host của nhân vật.
 */
export function createProp(host, kind, options = {}) {
  if (!DRAW[kind]) throw new Error(`[character] no prop "${kind}" (available: ${PROP_KINDS.join(', ')})`);
  const { color = DEFAULT_COLOR[kind] || '#8a6245', width, height, back, on, image, facing, fill, reading } = options;
  if (fill !== undefined && !['food', 'water', 'empty'].includes(fill)) throw new Error(`[character] prop "${kind}": fill must be 'food', 'water' or 'empty', got ${JSON.stringify(fill)}`);
  if (reading !== undefined && typeof reading !== 'string') throw new Error(`[character] prop "${kind}": reading must be a string such as '4.2 kg'`);
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error(`[character] prop "${kind}": color must be #rrggbb, got ${JSON.stringify(color)}`);
  if (facing !== undefined && facing !== 'away' && facing !== 'viewer') throw new Error(`[character] prop "${kind}": facing must be 'away' or 'viewer', got ${JSON.stringify(facing)}`);
  if (image !== undefined && typeof image !== 'string') throw new Error(`[character] prop "${kind}": image must be a path or URL string`);
  if (on !== undefined && !(typeof on === 'number' && on >= 0)) throw new Error(`[character] prop "${kind}": on must be a number ≥ 0 (frame units above the floor), got ${JSON.stringify(on)}`);
  for (const [name, value] of Object.entries({ width, height, back }))
    if (value !== undefined && !(typeof value === 'number' && value > 0)) throw new Error(`[character] prop "${kind}": ${name} must be a positive number (frame units), got ${JSON.stringify(value)}`);
  const sitter = options.for;
  if (sitter !== undefined && typeof (sitter && sitter.seatY) !== 'function') throw new Error(`[character] prop "${kind}": \`for\` must be a person rig (createCharacter(...).rig)`);
  const seat = sitter ? sitter.seatY() : SEAT_DEFAULT;
  const o = { seat, color, dark: shade(color, -0.28), line: shade(color, -0.55) };
  if (width !== undefined) o.w = width;
  if (height !== undefined) o.height = height;
  if (back !== undefined) o.back = back;
  if (on !== undefined) o.on = on;
  if (image !== undefined) o.image = image;
  if (facing !== undefined) o.facing = facing;
  if (fill !== undefined) o.fill = fill;
  if (reading !== undefined) o.reading = reading;
  host.style.aspectRatio = `${PROP_FRAME.w}/${PROP_FRAME.h}`;
  host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PROP_FRAME.w} ${PROP_FRAME.h}" width="100%" height="100%" style="display:block;overflow:visible" data-prop="${kind}">${DRAW[kind](o)}
  </svg>`;
  return { svg: host.firstElementChild, kind, seatY: seat };
}
