// ĐỔ BÓNG TRÊN THÂN nhân vật / con vật 2D theo hướng sáng của bối cảnh 3D: phía hướng về nguồn sáng sáng (và nhuốm màu
// đèn), phía bên kia tối dần. Nhân vật phẳng tô màu đều thì trông như dán lên nền dù đã có viền sáng (Gemini soát ánh
// sáng đợt 16). Cách làm: một hình chữ nhật phủ lên hình vẽ, tô bằng một chuyển sắc theo hướng sáng, và CẮT theo đúng
// bóng của nhân vật bằng một mask là chính nhóm hình vẽ (`<use>` nhóm gốc, lọc thành trắng giữ độ trong suốt) — lớp
// sáng tối không tràn ra nền.

const NS = 'http://www.w3.org/2000/svg';
let counter = 0;

/** Gắn lớp đổ bóng vào `svg` cho nhóm hình vẽ `root` (có id). Trả về { set(dx, dy, amount, rgb, glow) } hay null. */
/** Phép biến đổi RIÊNG của một phần tử SVG (thuộc tính `transform`), không `consolidate()` — hàm ấy viết đè danh sách. */
export function localMatrix(node) {
  const list = node && node.transform && node.transform.baseVal;
  let m = new DOMMatrix();
  if (list) for (let i = 0; i < list.numberOfItems; i++) m = m.multiply(list.getItem(i).matrix);
  return m;
}

// Điểm mẫu trên đường viền của từng hình, trong hệ của CHÍNH hình ấy: hình không đổi (cùng `d`, cùng kích thước) thì khỏi lấy mẫu
// lại — bàn tay vuốt dò hàng chục độ cao mỗi khung (đợt 32).
const outlineCache = new WeakMap();
const SHAPE_KEYS = ['d', 'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'points'];

/**
 * ĐƯỜNG VIỀN của các hình TÔ (không tính nét không tô, hình đang ẩn — `display: none`, `visibility: hidden`, `opacity="0"`) trong
 * `group`, trong hệ của SVG gốc `svg`: [{ x, y, edge }] — `edge` là nửa bề dày nét viền (nét tô ra ngoài hình chừng ấy).
 * Các điểm cách nhau ~1 đơn vị của hình. `skip(el)`: bỏ qua thêm.
 */
export function outlinePoints(svg, group, skip = null) {
  const out = [];
  for (const el of group.querySelectorAll('path, circle, ellipse, rect, polygon')) {
    if (typeof el.getTotalLength !== 'function' || (skip && skip(el))) continue;
    let hidden = false, m = new DOMMatrix();
    for (let node = el; node && node !== svg; node = node.parentNode) {
      if ((node.style && (node.style.display === 'none' || node.style.visibility === 'hidden')) || (node.getAttribute && (node.getAttribute('display') === 'none' || node.getAttribute('opacity') === '0'))) { hidden = true; break; }
      m = localMatrix(node).multiply(m);
    }
    if (hidden) continue;
    const key = SHAPE_KEYS.map((name) => el.getAttribute(name)).join('|');
    let shape = outlineCache.get(el);
    if (!shape || shape.key !== key) {
      const style = getComputedStyle(el), length = el.getTotalLength(), points = [];
      const fill = style.fill !== 'none', edge = style.stroke && style.stroke !== 'none' ? (parseFloat(style.strokeWidth) || 0) / 2 : 0;
      if (fill && length > 0) { const count = Math.max(16, Math.ceil(length)); for (let n = 0; n <= count; n++) points.push(el.getPointAtLength(length * n / count)); }
      shape = { key, edge, points };
      outlineCache.set(el, shape);
    }
    if (!shape.points.length) continue;
    const scale = Math.hypot(m.a, m.b), edge = shape.edge * scale;
    for (const p of shape.points) out.push({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f, edge });
  }
  return out;
}

export function attachShade(svg, root) {
  if (!svg || !root || !root.id || typeof document === 'undefined') return null;
  const id = `shade${++counter}`;
  const defs = document.createElementNS(NS, 'defs');
  defs.innerHTML = `
    <filter id="${id}-white" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>
    <mask id="${id}-mask" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="4400" height="4400"><use href="#${root.id}" filter="url(#${id}-white)"/></mask>
    <linearGradient id="${id}-grad" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.4" stop-color="#000" stop-opacity="0"/><stop offset="0.62" stop-color="#000" stop-opacity="0"/><stop offset="0.86" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${id}-bounce" gradientUnits="userSpaceOnUse" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>`;
  const cover = document.createElementNS(NS, 'rect');
  for (const [key, value] of Object.entries({ x: -2000, y: -2000, width: 4400, height: 4400, fill: `url(#${id}-grad)`, mask: `url(#${id}-mask)`, 'pointer-events': 'none', 'data-shade': '' })) cover.setAttribute(key, value);
  // ÁNH SÁNG PHẢN XẠ (bounce): một lớp thứ hai, chuyển sắc từ CHÂN lên — sàn được chiếu sáng hắt màu của nó lên phần dưới
  // người (vệt nắng vàng trên sàn gỗ: chân, váy ấm lên). Cũng cắt theo bóng nhân vật.
  const up = cover.cloneNode();
  up.setAttribute('fill', `url(#${id}-bounce)`); up.removeAttribute('data-shade'); up.setAttribute('data-bounce', ''); up.style.display = 'none';
  // id: bối cảnh 3D vẽ lại hai lớp này (qua `<use>`) trên bàn tay vuốt chép lên trên con vật (set3d, đợt 32)
  cover.id = `${id}-cover`; up.id = `${id}-up`;
  svg.appendChild(defs); svg.appendChild(up); svg.appendChild(cover);
  const grad = defs.querySelector('linearGradient'), stops = grad.querySelectorAll('stop');
  const rise = defs.querySelectorAll('linearGradient')[1], riseStops = rise.querySelectorAll('stop');
  let box = null, last = '', lastBounce = '';
  // Khung hình vẽ trong hệ toạ độ của `svg` (nơi chuyển sắc được tính, `userSpaceOnUse`). `getBBox()` của nhóm gốc là khung
  // TRONG hệ của chính nhóm — chưa có phép dời của nó (`translate(s.x …)`: nhân vật đi trong khung của mình). Đo một lần rồi
  // đổi theo phép biến đổi HIỆN TẠI của nhóm: không thì người đã đi vài bước đứng hẳn trong nửa tối (hay nửa sáng) của chuyển
  // sắc — sáng tối hai bên biến mất (đợt 29: bà vừa đi tới bàn khám tối đều cả mặt).
  const frame = () => {
    if (!box || !box.width) { try { box = root.getBBox(); } catch (error) { box = null; } }
    const b = box && box.width ? box : { x: 100, y: 0, width: 200, height: 470 };
    const list = root.transform && root.transform.baseVal;
    if (!list || !list.numberOfItems) return b;
    let m = new DOMMatrix();                                    // (không `consolidate()`: nó viết đè danh sách biến đổi của nhóm)
    for (let i = 0; i < list.numberOfItems; i++) m = m.multiply(list.getItem(i).matrix);
    const xs = [], ys = [];
    for (const [x, y] of [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]) { xs.push(m.a * x + m.c * y + m.e); ys.push(m.b * x + m.d * y + m.f); }
    return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  };
  return {
    cover,
    /**
     * `dx, dy`: hướng ánh sáng đi TRÊN MÀN HÌNH (từ nguồn sáng tới nhân vật, vector bất kỳ); `amount` 0…1 độ tối phía
     * khuất; `rgb` màu nguồn sáng ("255,213,154") và `glow` 0…1 độ nhuốm màu ấy ở phía được chiếu; `dark` màu phía khuất.
     * `fill`, `fillAmount`: ÁNH SÁNG PHỤ ở phía khuất (cửa sổ lạnh bên kia đèn bàn ấm) — mép phía khuất nhuốm màu ấy thay vì
     * tối hẳn. amount = 0 tắt lớp.
     */
    set(dx, dy, amount, rgb = '255,255,255', glow = 0, dark = '0,0,0', fill = null, fillAmount = 0) {
      const key = `${dx.toFixed(2)},${dy.toFixed(2)},${amount.toFixed(3)},${rgb},${glow.toFixed(3)},${dark},${fill},${fillAmount.toFixed(3)},${root.getAttribute('transform')}`;
      if (key === last) return;
      last = key;
      if (amount <= 0.003 && glow <= 0.003) { cover.style.display = 'none'; return; }
      cover.style.display = '';
      const b = frame();
      // Chủ yếu theo CHIỀU NGANG: ánh sáng từ một bên đọc rõ nhất trên hình chibi đứng thẳng; chuyển sắc trải theo bề NGANG
      // của hình (trải theo đường chéo cả khung thì giữa thân gần như không đổi — đo ở cảnh thử đợt 17).
      const cx = b.x + b.width / 2, cy = b.y + b.height / 2, sx = (dx < 0 ? -1 : 1) * Math.max(Math.abs(dx), Math.abs(dy) * 0.6), sy = dy * 0.35, length = Math.hypot(sx, sy) || 1, ux = sx / length, uy = sy / length;
      const half = b.width * 0.5;
      grad.setAttribute('x1', (cx - ux * half).toFixed(1)); grad.setAttribute('y1', (cy - uy * half).toFixed(1));
      grad.setAttribute('x2', (cx + ux * half).toFixed(1)); grad.setAttribute('y2', (cy + uy * half).toFixed(1));
      stops[0].setAttribute('stop-color', `rgb(${rgb})`); stops[0].setAttribute('stop-opacity', Math.min(0.6, glow).toFixed(3));
      // Màu phía khuất: màu bóng của giờ trong ngày (đêm: xanh lạnh) — đen thuần thì thành xám đục (Gemini, đợt 17).
      stops[2].setAttribute('stop-color', `rgb(${dark})`); stops[3].setAttribute('stop-color', `rgb(${dark})`);
      // Nửa khuất tối rõ NGAY sau giữa thân (0,95 × độ tối): một ranh giới sáng / tối đọc được ở cỡ nhỏ — 0,75 thì người chấm
      // (hai mô hình, đợt 25) đều thấy nhân vật "sáng đều hai bên".
      stops[2].setAttribute('stop-opacity', Math.min(0.75, amount * 0.95).toFixed(3));
      stops[3].setAttribute('stop-opacity', Math.min(0.7, amount).toFixed(3));
      // Mép ngoài cùng phía khuất: màu ánh sáng phụ (nếu có), không thì vẫn tối.
      const lift = fill && fillAmount > 0.003;
      stops[4].setAttribute('stop-color', lift ? `rgb(${fill})` : `rgb(${dark})`);
      stops[4].setAttribute('stop-opacity', (lift ? Math.min(0.5, fillAmount) : Math.min(0.7, amount)).toFixed(3));
    },
    /** ÁNH SÁNG PHẢN XẠ từ sàn: màu `rgb` ("214,168,110"), độ mạnh `amount` 0…1 (0 tắt) — dày ở chân, tan hết ở ngang ngực. */
    bounce(rgb = '255,255,255', amount = 0) {
      const key = `${rgb},${amount.toFixed(3)},${root.getAttribute('transform')}`;
      if (key === lastBounce) return;
      lastBounce = key;
      if (amount <= 0.004) { up.style.display = 'none'; return; }
      up.style.display = '';
      const b = frame();
      rise.setAttribute('y1', (b.y + b.height).toFixed(1)); rise.setAttribute('y2', (b.y + b.height * 0.35).toFixed(1));
      for (const stop of riseStops) stop.setAttribute('stop-color', `rgb(${rgb})`);
      riseStops[0].setAttribute('stop-opacity', Math.min(0.5, amount).toFixed(3));
      riseStops[1].setAttribute('stop-opacity', Math.min(0.5, amount * 0.35).toFixed(3));
    },
  };
}
