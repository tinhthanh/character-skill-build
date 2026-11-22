// DẤU CẢM XÚC kiểu truyện tranh trên đầu nhân vật / con vật: ! ? tim zzz giọt mồ hôi gân giận nốt nhạc.
// Đọc được cả ở cỡ toàn cảnh, nơi nét mặt quá nhỏ để thấy. Vẽ trong NHÓM ĐẦU của rig (đi theo đầu khi nghiêng, gục),
// viền trắng dày (paint-order) nên nổi trên mọi nền. Trạng thái nằm ngoài `rig.s` (`rig.m = { kind, a, p }`) — các động
// tác khác khép về tư thế nghỉ không xoá mất dấu đang hiện.

export const MARKS = ['!', '?', 'heart', 'zzz', 'sweat', 'anger', 'music', 'dizzy'];

const OUT = 'stroke="#ffffff" stroke-width="3.2" paint-order="stroke" stroke-linejoin="round"';
const ART = {
  '!': `<path d="M -5.500 -36 L 5.500 -36 L 3.200 -8 L -3.200 -8 Z" fill="#e53935" ${OUT}/><circle cy="3" r="4.800" fill="#e53935" ${OUT}/>`,
  '?': `<path d="M -10 -25 Q -10 -37 1 -37 Q 12 -37 12 -26 Q 12 -18 4 -14 Q 0.500 -12 0.500 -6" fill="none" stroke="#ffffff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M -10 -25 Q -10 -37 1 -37 Q 12 -37 12 -26 Q 12 -18 4 -14 Q 0.500 -12 0.500 -6" fill="none" stroke="#1e88e5" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="0.500" cy="4" r="4.400" fill="#1e88e5" ${OUT}/>`,
  heart: `<path d="M 0 2 C -4 -2 -16 -8 -16 -19 C -16 -27 -9 -31 -4 -28 C -2 -27 -0.500 -25 0 -23 C 0.500 -25 2 -27 4 -28 C 9 -31 16 -27 16 -19 C 16 -8 4 -2 0 2 Z" fill="#ef476f" ${OUT}/>
        <ellipse cx="-8" cy="-20" rx="3.200" ry="2" fill="#ffffff" opacity=".7" transform="rotate(-35 -8 -20)"/>`,
  zzz: [[-12, -2, 1], [0, -16, 0.8], [10, -28, 0.62]].map(([x, y, k], n) => `<path class="z${n}" transform="translate(${x} ${y}) scale(${k})" d="M -7 -7 H 7 L -7 7 H 7" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        <path class="z${n}" transform="translate(${x} ${y}) scale(${k})" d="M -7 -7 H 7 L -7 7 H 7" fill="none" stroke="#5c6bc0" stroke-width="3.800" stroke-linecap="round" stroke-linejoin="round"/>`).join(''),
  sweat: `<path d="M 0 -26 Q 9 -12 9 -5 Q 9 4 0 4 Q -9 4 -9 -5 Q -9 -12 0 -26 Z" fill="#64b5f6" ${OUT}/><ellipse cx="-3.500" cy="-6" rx="2" ry="3.400" fill="#ffffff" opacity=".75"/>`,
  anger: [0, 90, 180, 270].map((r) => `<path transform="rotate(${r})" d="M -11 -4 Q -5 -5 -4 -11" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
        <path transform="rotate(${r})" d="M -11 -4 Q -5 -5 -4 -11" fill="none" stroke="#e53935" stroke-width="4" stroke-linecap="round"/>`).join(''),
  music: `<path d="M -6 -30 L 10 -35 L 10 -8" fill="none" stroke="#ffffff" stroke-width="7" stroke-linejoin="round"/>
        <path d="M -6 -30 L 10 -35 L 10 -8 M -6 -30 L -6 -3" fill="none" stroke="#7e57c2" stroke-width="3.400" stroke-linejoin="round"/>
        <ellipse cx="-10" cy="-2" rx="5.600" ry="4.400" fill="#7e57c2" ${OUT} transform="rotate(-20 -10 -2)"/>
        <ellipse cx="6" cy="-7" rx="5.600" ry="4.400" fill="#7e57c2" ${OUT} transform="rotate(-20 6 -7)"/>`,
  // CHÓNG MẶT (đợt 35, `chaseTail`): vòng xoáy và ba ngôi sao quay quanh — `drawMark` xoay cả dấu theo pha.
  dizzy: `<path d="M 0 0 m -15 0 a 15 9 0 1 0 30 0 a 11 6.5 0 1 0 -22 0 a 7 4 0 1 0 14 0" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>
        <path d="M 0 0 m -15 0 a 15 9 0 1 0 30 0 a 11 6.5 0 1 0 -22 0 a 7 4 0 1 0 14 0" fill="none" stroke="#8e44ad" stroke-width="3.200" stroke-linecap="round"/>
        ${[[-19, -10], [17, -13], [2, 14]].map(([x, y]) => `<path transform="translate(${x} ${y}) scale(0.9)" d="M 0 -7 L 2 -2 L 7 -2 L 3 1.500 L 4.500 7 L 0 3.800 L -4.500 7 L -3 1.500 L -7 -2 L -2 -2 Z" fill="#fbc02d" ${OUT}/>`).join('')}`,
};

/** Trạng thái dấu mới cho một rig. */
export const freshMark = () => ({ kind: '', a: 0, p: 0 });

/** Thêm nhóm vẽ dấu vào nhóm đầu `head` (một lần sau mỗi lần dựng SVG). Trả về phần tử nhóm. */
export function attachMark(head, at, size = 1) {
  if (!head) return null;
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('data-mark', '');
  g.dataset.x = at[0]; g.dataset.y = at[1]; g.dataset.size = size;
  head.appendChild(g);
  return g;
}

/**
 * Vẽ dấu theo trạng thái `m`: `kind` (tên, '' = không), `a` 0…1 hiện ra (bật lên bằng cách phóng to), `p` 0…1 pha của
 * nhịp riêng (tim / zzz / nốt nhạc bay lên, giọt mồ hôi trượt xuống, ! và gân giận đập nhẹ).
 */
export function drawMark(g, m) {
  if (!g) return;
  const kind = m && m.a > 0.01 ? m.kind : '';
  if (g.dataset.kind !== kind) { g.innerHTML = kind ? ART[kind] || '' : ''; g.dataset.kind = kind; }
  if (!kind) return;
  const a = Math.min(1, Math.max(0, m.a)), p = m.p || 0, wave = Math.sin(p * Math.PI * 4);
  let dx = 0, dy = 0, turn = 0, size = (0.45 + 0.55 * a) * (+g.dataset.size || 1);
  if (kind === 'heart' || kind === 'music') { dy = -12 * p; turn = 8 * Math.sin(p * Math.PI * 3); size *= 1 + 0.06 * wave; }
  else if (kind === 'zzz') { dy = -8 * p; dx = 3 * p; }
  else if (kind === 'sweat') { dy = 6 * p; }
  else if (kind === '!' || kind === 'anger' || kind === '?') { size *= 1 + 0.07 * Math.max(0, wave); }
  else if (kind === 'dizzy') { dy = -16; turn = 360 * p; }
  g.setAttribute('opacity', a.toFixed(3));
  g.setAttribute('transform', `translate(${(+g.dataset.x + dx).toFixed(2)} ${(+g.dataset.y + dy).toFixed(2)}) rotate(${turn.toFixed(2)}) scale(${size.toFixed(3)})`);
  if (kind === 'zzz') g.querySelectorAll('[class^="z"]').forEach((el) => { const n = +el.getAttribute('class').slice(1); el.setAttribute('opacity', (p > 0 ? Math.min(1, Math.max(0, p * 3 - n * 0.6 + 0.4)) : 1).toFixed(3)); });      // giữ tĩnh (p = 0): cả ba chữ
}

/**
 * Các tween của dấu, thêm vào timeline `t` của rig: hiện `kind` ở mốc `at`, giữ `hold` giây (pha `p` chạy suốt), rồi tắt.
 * `hold = null`: hiện và GIỮ (không tắt — `markOff` tắt sau).
 */
export function markTweens(t, m, kind, at = 0, hold = 1.2) {
  t.set(m, { kind }, at);
  t.fromTo(m, { a: 0 }, { a: 1, duration: 0.28, ease: 'back.out(2.4)', immediateRender: false }, at);
  if (hold === null) return t;
  t.fromTo(m, { p: 0 }, { p: 1, duration: hold + 0.28, ease: 'none', immediateRender: false }, at);
  markOff(t, m, at + 0.28 + hold);
  return t;
}
export function markOff(t, m, at) {
  t.to(m, { a: 0, duration: 0.22, ease: 'power2.in' }, at);
  t.set(m, { kind: '' }, at + 0.22);
  return t;
}
