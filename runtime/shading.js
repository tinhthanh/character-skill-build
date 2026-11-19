// ĐỔ BÓNG TRÊN THÂN nhân vật / con vật 2D theo hướng sáng của bối cảnh 3D: phía hướng về nguồn sáng sáng (và nhuốm màu
// đèn), phía bên kia tối dần. Nhân vật phẳng tô màu đều thì trông như dán lên nền dù đã có viền sáng (Gemini soát ánh
// sáng đợt 16). Cách làm: một hình chữ nhật phủ lên hình vẽ, tô bằng một chuyển sắc theo hướng sáng, và CẮT theo đúng
// bóng của nhân vật bằng một mask là chính nhóm hình vẽ (`<use>` nhóm gốc, lọc thành trắng giữ độ trong suốt) — lớp
// sáng tối không tràn ra nền.

const NS = 'http://www.w3.org/2000/svg';
let counter = 0;

/** Gắn lớp đổ bóng vào `svg` cho nhóm hình vẽ `root` (có id). Trả về { set(dx, dy, amount, rgb, glow) } hay null. */
export function attachShade(svg, root) {
  if (!svg || !root || !root.id || typeof document === 'undefined') return null;
  const id = `shade${++counter}`;
  const defs = document.createElementNS(NS, 'defs');
  defs.innerHTML = `
    <filter id="${id}-white" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>
    <mask id="${id}-mask" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="4400" height="4400"><use href="#${root.id}" filter="url(#${id}-white)"/></mask>
    <linearGradient id="${id}-grad" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.4" stop-color="#000" stop-opacity="0"/><stop offset="0.62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
    </linearGradient>`;
  const cover = document.createElementNS(NS, 'rect');
  for (const [key, value] of Object.entries({ x: -2000, y: -2000, width: 4400, height: 4400, fill: `url(#${id}-grad)`, mask: `url(#${id}-mask)`, 'pointer-events': 'none', 'data-shade': '' })) cover.setAttribute(key, value);
  svg.appendChild(defs); svg.appendChild(cover);
  const grad = defs.querySelector('linearGradient'), stops = grad.querySelectorAll('stop');
  let box = null, last = '';
  return {
    cover,
    /**
     * `dx, dy`: hướng ánh sáng đi TRÊN MÀN HÌNH (từ nguồn sáng tới nhân vật, vector bất kỳ); `amount` 0…1 độ tối phía
     * khuất; `rgb` màu nguồn sáng ("255,213,154") và `glow` 0…1 độ nhuốm màu ấy ở phía được chiếu; `dark` màu phía khuất.
     * amount = 0 tắt lớp.
     */
    set(dx, dy, amount, rgb = '255,255,255', glow = 0, dark = '0,0,0') {
      const key = `${dx.toFixed(2)},${dy.toFixed(2)},${amount.toFixed(3)},${rgb},${glow.toFixed(3)},${dark}`;
      if (key === last) return;
      last = key;
      if (amount <= 0.003 && glow <= 0.003) { cover.style.display = 'none'; return; }
      cover.style.display = '';
      if (!box || !box.width) { try { box = root.getBBox(); } catch (error) { box = null; } }
      const b = box && box.width ? box : { x: 100, y: 0, width: 200, height: 470 };
      // Chủ yếu theo CHIỀU NGANG: ánh sáng từ một bên đọc rõ nhất trên hình chibi đứng thẳng; chuyển sắc trải theo bề NGANG
      // của hình (trải theo đường chéo cả khung thì giữa thân gần như không đổi — đo ở cảnh thử đợt 17).
      const cx = b.x + b.width / 2, cy = b.y + b.height / 2, sx = (dx < 0 ? -1 : 1) * Math.max(Math.abs(dx), Math.abs(dy) * 0.6), sy = dy * 0.35, length = Math.hypot(sx, sy) || 1, ux = sx / length, uy = sy / length;
      const half = b.width * 0.5;
      grad.setAttribute('x1', (cx - ux * half).toFixed(1)); grad.setAttribute('y1', (cy - uy * half).toFixed(1));
      grad.setAttribute('x2', (cx + ux * half).toFixed(1)); grad.setAttribute('y2', (cy + uy * half).toFixed(1));
      stops[0].setAttribute('stop-color', `rgb(${rgb})`); stops[0].setAttribute('stop-opacity', Math.min(0.5, glow).toFixed(3));
      // Màu phía khuất: màu bóng của giờ trong ngày (đêm: xanh lạnh) — đen thuần thì thành xám đục (Gemini, đợt 17).
      stops[2].setAttribute('stop-color', `rgb(${dark})`); stops[3].setAttribute('stop-color', `rgb(${dark})`);
      stops[2].setAttribute('stop-opacity', Math.min(0.7, amount * 0.75).toFixed(3));        // nửa khuất: tối rõ ngay sau giữa thân
      stops[3].setAttribute('stop-opacity', Math.min(0.7, amount).toFixed(3));
    },
  };
}
