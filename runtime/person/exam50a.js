// runtime/person/exam50a.js — đợt 50 A: the exam room — feel the pet's belly / flanks (`palpate`), an ultrasound scan with the pet lying on its side
// (`useUltrasound`), look into a microscope at the lab bench (`lookMicroscope`).
// Methods of `RigSVG`, installed by runtime/rig-svg.js: `this` is the rig, `RigSVG` its class.
//
// Như đợt 38 A / 49 B: quay nghiêng về con vật (`_care38`), dụng cụ CHỈ HIỆN trong tay gần — 46 đầu dò siêu âm (dây cáp cong ra sau), 47 lọ gel. Hai hình
// ấy KHÔNG có sẵn trong markup của người: `_drawExam50a` dựng chúng vào ngăn `gadgetL/R` lần đầu kênh `gadget` của tay ấy là 46 / 47; THẺ ẢNH SIÊU ÂM
// (`scan50a`, như thẻ số đo của `weigh` / `takeTemp`: hình minh hoạ chung chung — không số đo, không chữ chẩn đoán) dựng ở gốc SVG lần đầu hiện.
// Việc tay làm lên con vật là kênh của người, con vật đọc lại khi vẽ (runtime/pet/exam50a.js): `petSide50a` nằm nghiêng, `petPress50a` bị ấn,
// `petFlinch50a` giật mình khẽ, `petCalm50a` lim dim dễ chịu, `petGel50a` / `petGelU50a` lớp gel trên bụng; con mèo / thỏ đang ngồi đứng dậy cho sờ
// bụng qua kênh `petStand49b` của đợt 49 B.

import { HONG, DOI_Y, DAI, clamp, chuanHoaGoc, mix } from './shared.js';

const PROBE_TIP50A = 31;              // mặt đầu dò (gadget 46) cách cổ tay chừng ấy theo bàn tay
const GEL_TIP50A = 27;                // miệng lọ gel (gadget 47)
const GEL_GAP50A = 22;                // giọt gel rơi chừng ấy từ miệng lọ tới bụng
const SCAN_FAN50A = { apex: -88, r: 74, half: 42 };     // quạt ảnh siêu âm trong thẻ (độ mở ±42°)

// Hình hai dụng cụ (hệ cổ tay: lòng bàn tay ở (0, 10), dụng cụ chĩa theo +y).
const TOOL50A = {
  // ĐẦU DÒ SIÊU ÂM: tay cầm trắng trong nắm tay, vạch xanh ngọc, đầu loe ra với mặt dò cong sẫm màu ở đầu; dây cáp xám từ đuôi tay cầm cong ra sau.
  46: `<g data-gadget="46"><path d="M 3.200 13 C 12 14 16 22 14 32 S 18 42 24 44" fill="none" stroke="#3b4652" stroke-width="2.600" stroke-linecap="round"/>
        <g data-solid50a=""><rect x="-3.200" y="6" width="6.400" height="10" rx="2.600" fill="#eef3f6" stroke="#4a5562" stroke-width="1.200"/><rect x="-3.200" y="11" width="6.400" height="2.400" fill="#2f9e8f"/>
        <path d="M -4.200 15 L -8.500 ${PROBE_TIP50A - 3} Q 0 ${PROBE_TIP50A + 2} 8.500 ${PROBE_TIP50A - 3} L 4.200 15 Z" fill="#dfe6ec" stroke="#4a5562" stroke-width="1.200" stroke-linejoin="round"/>
        <path data-face50a="" d="M -8.500 ${PROBE_TIP50A - 3} Q 0 ${PROBE_TIP50A + 2} 8.500 ${PROBE_TIP50A - 3}" fill="none" stroke="#24303a" stroke-width="2.600" stroke-linecap="round"/></g></g>`,
  // LỌ GEL: lọ bóp trong xanh nhạt, nhãn trắng trơn (không chữ), nắp nhọn xanh ngọc; GIỌT GEL (`data-drop50a`) rơi từ miệng lọ khi bóp.
  47: `<g data-gadget="47"><rect x="-6.500" y="-9" width="13" height="27" rx="4" fill="#8fd0f0" stroke="#2c6f96" stroke-width="1.200"/>
        <rect x="-6.500" y="0" width="13" height="8" fill="#ffffff" opacity=".85"/>
        <path d="M -4.500 18 L -1.600 ${GEL_TIP50A} L 1.600 ${GEL_TIP50A} L 4.500 18 Z" fill="#2f9e8f" stroke="#1d5f56" stroke-width="1.100" stroke-linejoin="round"/>
        <g data-drop50a="" style="display:none"><path d="M 0 -5 Q 4.500 1.500 0 6 Q -4.500 1.500 0 -5 Z" fill="#bfe6fb" stroke="#4aa3d6" stroke-width="1.100"/></g></g>`,
};

// THẺ ẢNH SIÊU ÂM (gốc SVG, như thẻ số đo): khung trắng có đuôi chỉ xuống đầu dò, màn hình sẫm, QUẠT ẢNH xám lấm tấm, một vùng tối bầu dục,
// vạch quét sáng lia qua lia lại — hình minh hoạ chung, không chữ, không số.
const SCAN_CARD50A = (() => {
  const { apex, r, half } = SCAN_FAN50A, a = half * Math.PI / 180, x1 = r * Math.sin(a), y1 = apex + r * Math.cos(a);
  const dots = [[-22, -50, 2.4], [-8, -60, 1.8], [14, -55, 2.2], [26, -42, 1.6], [-30, -36, 1.8], [-12, -28, 2.6], [10, -24, 1.8], [30, -30, 2.2], [-2, -44, 1.4], [20, -70, 1.4], [-18, -68, 1.6]];
  return `<g data-scan50a="" style="display:none">
    <path d="M -70 -98 H 70 Q 78 -98 78 -90 V -10 Q 78 -2 70 -2 H 9 L 0 10 L -9 -2 H -70 Q -78 -2 -78 -10 V -90 Q -78 -98 -70 -98 Z" fill="#ffffff" stroke="#9fb0bc" stroke-width="1.600"/>
    <rect x="-70" y="-91" width="140" height="82" rx="5" fill="#10181e"/>
    <path data-fan50a="" d="M 0 ${apex} L ${(-x1).toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 0 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="#5d6a73" stroke="#8a979f" stroke-width="1"/>
    ${dots.map(([x, y, rr], n) => `<ellipse data-speck="${n}" cx="${x}" cy="${y}" rx="${rr}" ry="${(rr * 0.7).toFixed(2)}" fill="#c3ccd2" opacity=".55"/>`).join('')}
    <ellipse cx="5" cy="-40" rx="17" ry="11" fill="#1b252c" stroke="#9aa7ae" stroke-width="1.200"/>
    <path data-sweep50a="" stroke="#d8f3ff" stroke-width="2" stroke-linecap="round" opacity=".7"/>
    <circle cx="62" cy="-82" r="2.400" fill="#7dffb0"/><circle cx="62" cy="-74" r="2.400" fill="#7dffb0" opacity=".6"/>
  </g>`;
})();

export default (RigSVG) => mix(RigSVG, class {
  static PROBE_TIP50A = PROBE_TIP50A;
  static SCAN_LIFT50A = 112;          // thẻ ảnh siêu âm nổi trên đầu dò chừng ấy (đơn vị khung) …
  static SCAN_ASIDE50A = 92;          // … lệch về phía đuôi con vật chừng ấy (xa mặt người và mặt nó)
  static MICRO_TURN50A = 0.6;         // soi kính hiển vi: quay 3/4 về phía kính
  static MICRO_LEAN50A = 34;          // … thân cúi tới đó tối đa chừng ấy độ, khuỵu gối tối đa MICRO_CROUCH50A
  static MICRO_CROUCH50A = 0.6;

  // Vẽ theo trạng thái (gọi trong `_drawHeldItems`): dựng hình dụng cụ 46 / 47 lần đầu dùng, giọt gel rơi, thẻ ảnh siêu âm.
  _drawExam50a() {
    const e = this.el, s = this.s, f = (v) => v.toFixed(2);
    for (const side of ['L', 'R']) {
      const box = e['gadget' + side], kind = Math.round(s['gadget' + side]);
      if (!box || (kind !== 46 && kind !== 47)) continue;
      let tool = [...box.children].find((child) => +child.getAttribute('data-gadget') === kind);
      if (!tool) { box.insertAdjacentHTML('beforeend', TOOL50A[kind]); tool = box.lastElementChild; }
      tool.style.display = '';
      if (kind === 47) {
        const drop = tool.querySelector('[data-drop50a]'), v = clamp(+s.gelDrop50a || 0, 0, 1);
        drop.style.display = v > 0.02 && v < 0.98 ? '' : 'none';
        if (v > 0.02 && v < 0.98) drop.setAttribute('transform', `translate(0 ${f(GEL_TIP50A + 3 + v * GEL_GAP50A)}) scale(${f(0.7 + 0.5 * Math.min(1, v * 3))})`);
      }
    }
    // Thẻ ảnh siêu âm: nổi trên đầu dò (đo mỗi khung như thẻ nhiệt kế), lệch về phía đuôi con vật (`scanDir50a`), lớn dần theo `scan50a`.
    const k = clamp(+s.scan50a || 0, 0, 1);
    if (!this._scan50a && k < 0.02) return;
    if (!this._scan50a) { e.readout.insertAdjacentHTML('afterend', SCAN_CARD50A); this._scan50a = e.readout.nextElementSibling; }
    const card = this._scan50a, side = ['L', 'R'].find((key) => Math.round(s['gadget' + key]) === 46);
    const hand = side && e['coTay' + side], ctm = hand && hand.getScreenCTM(), root = this.svg.getScreenCTM();
    if (k < 0.02 || !ctm || !root) { card.style.display = 'none'; return; }
    const p = new DOMPoint(0, 0).matrixTransform(ctm).matrixTransform(root.inverse()), dir = (+s.scanDir50a || 0) < 0 ? -1 : 1;
    card.setAttribute('transform', `translate(${f(p.x + dir * RigSVG.SCAN_ASIDE50A)} ${f(p.y - RigSVG.SCAN_LIFT50A * (0.85 + 0.15 * k))}) scale(${f(0.45 + 0.55 * k)})`);
    card.style.opacity = Math.min(1, k * 1.6).toFixed(2);
    card.style.display = '';
    const T = +s.scanT50a || 0, { apex, r, half } = SCAN_FAN50A, a = Math.sin(T * 1.9) * half * 0.85 * Math.PI / 180;
    card.querySelector('[data-sweep50a]').setAttribute('d', `M 0 ${apex} L ${f(r * Math.sin(a))} ${f(apex + r * Math.cos(a))}`);
    card.querySelectorAll('[data-speck]').forEach((el, n) => el.setAttribute('opacity', f(0.35 + 0.3 * Math.abs(Math.sin(T * 3.1 + n * 1.7)))));
  }

  /** Số đo cho tools/acting_check.py (đợt 50 A, `set.careProbe` → `c50a`): dụng cụ đang cầm, mặt đầu dò / miệng lọ (px màn hình), giọt gel, thẻ ảnh,
   *  hai con mắt (soi kính hiển vi), các mức. */
  exam50aProbe() {
    const e = this.el, s = this.s, side = ['L', 'R'].find((k) => [46, 47].includes(Math.round(s['gadget' + k]))) || null;
    const kind = side ? Math.round(s['gadget' + side]) : 0, tool = side ? [...e['gadget' + side].children].find((child) => +child.getAttribute('data-gadget') === kind) || null : null;
    const at = (el, x, y) => { if (!el || !el.getScreenCTM()) return null; const q = new DOMPoint(x, y).matrixTransform(el.getScreenCTM()); return { x: q.x, y: q.y, px: true }; };
    const drop = tool && kind === 47 ? tool.querySelector('[data-drop50a]') : null, card = this._scan50a && this._scan50a.style.display !== 'none' ? this._scan50a : null;
    return { kind, side, tool, solid: tool && kind === 46 ? tool.querySelector('[data-solid50a]') : tool, tip: kind === 46 ? tool.querySelector('[data-face50a]') : kind === 47 ? at(tool, 0, GEL_TIP50A) : null,          // mặt dò: phần tử (khung trên màn hình — bối cảnh 3D chiếu nghiêng, getScreenCTM không theo)
             
             drop: drop && drop.style.display !== 'none' ? drop : null, card: card ? card.querySelector('rect') : null, scan: +clamp(+s.scan50a || 0, 0, 1).toFixed(3),
             eyeL: at(e.matL, 0, 0), eyeR: at(e.matR, 0, 0), micro: +clamp(+s.micro50a || 0, 0, 1).toFixed(3), knob: +(+s.knob50a || 0).toFixed(3),
             press: +clamp(+s.petPress50a || 0, 0, 1).toFixed(3), side50a: +clamp(+s.petSide50a || 0, 0, 1).toFixed(3),
             // kính hiển vi của lần soi gần nhất: đỉnh thị kính, núm chỉnh (điểm khung 400 × 470 = toạ độ gốc SVG → màn hình), lòng bàn tay gần
             eyepiece: this._micro50a ? at(this.svg, +this._micro50a.eye.x, +this._micro50a.eye.y) : null, knobAt: this._micro50a ? at(this.svg, +this._micro50a.knob.x, +this._micro50a.knob.y) : null,
             palm: this._micro50a ? at(e['coTay' + this._micro50a.k], 0, 10) : null };
  }

  // Chỗ `which` trên con vật ở dáng `key` = 1 (hệ của `_care38`). Đích là một ĐIỂM của bối cảnh 3D (`set.target`: giữa mặt nó LÚC DỰNG — đang đứng):
  // `_petSpot` dời quanh khung mặt ở dáng mới, mà nằm nghiêng / đứng dậy thì cái đầu đã dời đi — tính theo khung mặt ở dáng hiện tại cho đúng.
  _spot50a(c, which, key, u = 0.5) {
    const target = c.target50a, pet = c.pet;
    if (!pet) return c.spot(which, key, 1);
    const isPoint = target && !target.el && typeof target.x === 'number' && typeof target.span === 'number' && typeof pet.shotBox === 'function';
    pet.apDung();
    const box = isPoint ? pet.shotBox('face') : null, was = this.s[key], heading = pet.s.huong;
    this.s[key] = 1;
    // `facing` (đợt 50 A): con vật sẽ quay về phía ấy lúc làm (tools/scene.py cho nó quay đuôi về người trước lượt — lúc dựng chuỗi của người, con
    // vật còn ở dáng khác): đo ở hướng ấy. Khung mặt (`box`) vẫn đo ở dáng hiện tại — `c.base` là giữa mặt ở dáng ấy.
    if (c.facing50a) pet.s.huong = (c.facing50a === 'away' ? 1 : -1) * c.dir;
    try {
      pet.apDung();
      // bụng / sườn: chỗ thứ `u` dọc thân (0 phía ngực … 1 phía hông — RigThu#_examPoint50a); chỗ khác: `carePoint`
      const q = which === 'belly50a' || which === 'flank50a' ? pet._examPoint50a(which, u) : pet.carePoint(which, c.base.tx >= HONG.x ? -1 : 1);
      if (isPoint) { const r = target.span / (box.width || 1); return { x: c.base.tx + (q.x - (box.x + box.width / 2)) * r, y: c.base.ty + (q.y - (box.y + box.height * 0.5)) * r }; }
      // rig thú (trang 2D): qua màn hình, như `_petSpot`
      const p = new DOMPoint(q.x, q.y).matrixTransform(pet.svg.getScreenCTM()), sv = this.svg.getBoundingClientRect();
      const unit = Math.min(sv.width / 400, sv.height / 470) || 1, ox = sv.left + (sv.width - 400 * unit) / 2, oy = sv.top + (sv.height - 470 * unit) / 2;
      return { x: (p.x - ox) / unit - this.s.x, y: (p.y - oy) / unit - this.s.y - DOI_Y };
    } finally { this.s[key] = was; pet.s.huong = heading; pet.apDung(); }
  }

  // Đầu con vật ở dáng `key` (như `_offHead49b`): hàm "điểm này KHÔNG nằm trong đầu nó" — tay / dụng cụ không đặt lên mặt nó.
  _offHead50a(c, key) {
    if (!c.pet) return () => true;
    const Hd = this._spot50a(c, 'crown', key), Cn = this._spot50a(c, 'chin', key);
    const hc = { x: (Hd.x + Cn.x) / 2, y: (Hd.y + Cn.y) / 2 }, hr = Math.hypot(Hd.x - Cn.x, Hd.y - Cn.y) / 2;
    return (q) => Math.hypot(q.x - hc.x, q.y - hc.y) > hr * 1.1 + 4;
  }

  // Bụng / sườn con vật (hệ của `_care38`) ở dáng `key` = 1 (đứng dậy `petStand49b`, nằm nghiêng `petSide50a`): `at(u)` — chỗ thứ `u` dọc thân
  // (−1 phía hông … 0 giữa … 1 phía ngực), đo trên chính hình con vật. Không có con vật (trang thử): ước theo đầu nó.
  _bellyLine50a(c, which, key) {
    if (!c.pet) { const dirX = c.dir > 0 ? -1 : 1, base = { x: c.base.tx - dirX * 40, y: c.base.ty + 28 }; return { P: base, at: (u, dy = 0) => ({ x: base.x + dirX * 35 * u, y: base.y + dy }) }; }
    const memo = new Map(), at = (u, dy = 0) => { const key2 = u.toFixed(3); if (!memo.has(key2)) memo.set(key2, this._spot50a(c, which, key, 0.5 - 0.5 * u)); const q = memo.get(key2); return { x: q.x, y: q.y + dy }; };
    return { P: at(0), at };
  }

  /**
   * SỜ NẮN con vật `target` (khám bụng / đánh giá thể trạng): quay nghiêng về nó, cúi xuống; HAI BÀN TAY XOÈ NGÓN đặt lên `part` — 'belly' (bụng, mặc
   * định: nửa dưới thân) hay 'flank' (hai bên sườn) — tay gần phía ngực, tay xa phía hông; ấn nhẹ từng nhịp, hai tay so le (nhào khẽ) suốt `hold` giây.
   * Đầu nghiêng như đang lắng nghe, mắt tập trung, mày hơi nhíu; xong gật một cái, cười. Con vật: giật mình khẽ ở nhịp ấn đầu tiên (tai cụp, nheo
   * mắt), rồi yên, lim dim. Mèo / thỏ đang ngồi đứng dậy cho sờ. Con vật dưới sàn: quỳ xuống trước (như các động tác chăm sóc khác).
   */
  palpate(target = null, { part = 'belly', hold = 2, facing = null } = {}) {
    if (part !== 'belly' && part !== 'flank') throw new Error(`[character] palpate: part must be 'belly' or 'flank', got ${JSON.stringify(part)}`);
    if (!(Number.isFinite(hold) && hold >= 1 && hold <= 6)) throw new Error(`[character] palpate: hold must be 1…6 seconds of feeling, got ${JSON.stringify(hold)}`);
    if (facing !== null && facing !== 'away' && facing !== 'toward') throw new Error(`[character] palpate: facing must be 'away', 'toward' or null (the way the pet faces while felt), got ${JSON.stringify(facing)}`);
    const t = this.tl(), s = this.s, N = this.NGHI, c = this._care38(t, target, 'palpate', 0.2), { k, o, dir } = c;
    c.target50a = target; c.facing50a = facing;
    const line = this._bellyLine50a(c, part === 'belly' ? 'belly50a' : 'flank50a', 'petStand49b'), off = this._offHead50a(c, 'petStand49b');
    // Hai bàn tay trên bụng / sườn: tay GẦN (phía con vật — với xa hơn) về phía đầu thân xa người, tay xa về phía đầu thân gần người — hai cánh
    // tay không bắt chéo; mỗi tay lấy chỗ đầu tiên với tới (không duỗi hết cỡ mà còn thiếu) và không nằm trong đầu con vật (thỏ đầu to).
    const near = Math.abs(line.at(0.4).x - HONG.x) <= Math.abs(line.at(-0.4).x - HONG.x) ? 1 : -1;
    const pick = (side, list) => list.map((u) => line.at(u)).find((q) => off(q) && !(c.arm(side, q.x, q.y, 13).short > 1)) || line.at(list[list.length - 1]);
    const lowPet = c.pet && (s.kneel > 0.5 || s.seat > 0.5);          // con vật dưới sàn, người đã quỳ: cúi thân tới cho tay xuống tới bụng nó
    const listK = [0.35, 0.2, 0.05, -0.1, -0.25].map((u) => -u * near), listO = [0.45, 0.6, 0.3, 0.15].map((u) => u * near);
    let qk = lowPet ? line.at(listK[0]) : pick(k, listK), qo = lowPet ? line.at(listO[0]) : pick(o, listO);
    if (part === 'belly') { qk = { x: qk.x, y: qk.y + 3 }; qo = { x: qo.x, y: qo.y + 3 }; }          // lòng bàn tay ôm hẳn xuống bụng
    let hand = (side, q, press = 0) => c.arm(side, q.x, q.y + press, 13), lean = 0;
    if (lowPet) {
      // QUỲ mà tay chưa tới bụng: thân CÚI về phía con vật từng nấc (đo bàn tay trên hình — `_armAt50a`), dừng ở nấc đầu tiên cả hai tay tới.
      const poseOf = (L) => ({ huong: c.turn, than: N.than - dir * 2 + dir * L, vai: N.vai + 3, aimL: 1, aimR: 1 });
      lean = [0, 8, 14, 20, 26, 32].find((L) => this._armAt50a(k, qk.x, qk.y, poseOf(L), 13).miss < 3 && this._armAt50a(o, qo.x, qo.y, poseOf(L), 13).miss < 3) ?? 32;
      hand = (side, q, press = 0) => this._armAt50a(side, q.x, q.y + press, poseOf(lean), 13);
      t.to(s, { than: poseOf(lean).than, duration: 0.45, ease: 'sine.inOut' }, 0.05);
    }
    const restK = hand(k, qk, -5), restO = hand(o, qo, -5);
    const C0 = 0.6, U = C0 + hold, total = U + 1.5;
    // 0. Hai bàn tay xoè tới bụng / sườn; con vật đứng dậy (mèo, thỏ đang ngồi).
    t.to(s, { ['bat' + k]: restK.bat, ['cang' + k]: restK.cang, ['bat' + o]: restO.bat, ['cang' + o]: restO.cang, dauY: 8, cuoi: 0.5, chum: 0.2, mayL: 0.25, mayR: 0.25, duration: 0.5, ease: 'power2.out' }, 0.05);
    t.set(s, { ['tay' + k]: 'xoe', ['tay' + o]: 'xoe' }, 0.03);
    t.to(s, { petStand49b: 1, duration: 0.45, ease: 'sine.inOut' }, 0.05);
    if (c.pet) { (this.caring || (this.caring = new Set())).add(c.pet); t.to(s, { onTopL: 1, onTopR: 1, careFront: 1, duration: 0.02 }, 0.12); }
    c.look(line.at(0), 0.1, { d: 0.45 });
    // 1. ẤN NHẸ từng nhịp (0,45 s): hai tay so le — tay này ấn xuống khi tay kia nhấc khẽ; con vật giật mình khẽ ở nhịp đầu, rồi yên.
    const beat = 0.45, n = Math.max(2, Math.round(hold / beat)), per = hold / n;
    for (let i = 0; i < n; i++) {
      const a = C0 + i * per, wob = (i % 3) - 1;
      const dk = i % 2 ? 0 : 3.2, dO = i % 2 ? 3.2 : 0;
      const pk = hand(k, { x: qk.x + wob * 1.5, y: qk.y }, dk - 1), po = hand(o, { x: qo.x - wob * 1.5, y: qo.y }, dO - 1);
      t.to(s, { ['bat' + k]: pk.bat, ['cang' + k]: pk.cang, ['bat' + o]: po.bat, ['cang' + o]: po.cang, duration: per, ease: 'sine.inOut' }, a);
      t.to(s, { petPress50a: 0.9, duration: per * 0.5, ease: 'sine.out', yoyo: true, repeat: 1 }, a);
    }
    t.to(s, { petFlinch50a: 0.85, duration: 0.12, ease: 'power2.out' }, C0 + 0.08);
    t.to(s, { petFlinch50a: 0, duration: 0.45, ease: 'sine.inOut' }, C0 + 0.35);
    t.to(s, { petCalm50a: 0.55, duration: 0.6, ease: 'sine.inOut' }, C0 + 0.8);
    // Đầu nghiêng lắng nghe, mắt liếc lên (như `listen`), mày nhíu — tập trung vào cảm giác dưới bàn tay.
    t.to(s, { headTilt: dir * 0.55, nhinY: -1.2, nhinX: -dir * 1.2, mayL: 0.1, mayR: 0.1, chum: 0.35, cuoi: 0.3, duration: 0.4, ease: 'sine.inOut' }, C0 + 0.3);
    c.look(line.at(-0.2), C0 + hold * 0.55, { d: 0.4 });
    t.to(s, { headTilt: dir * 0.4, nhinY: -1, duration: 0.3, ease: 'sine.inOut' }, C0 + hold * 0.55 + 0.05);
    // 2. Xong: nhấc tay, buông; gật một cái, cười — "ổn".
    t.to(s, { ['bat' + k]: restK.bat, ['cang' + k]: restK.cang, ['bat' + o]: restO.bat, ['cang' + o]: restO.cang, duration: 0.2, ease: 'sine.out' }, U);
    t.to(s, { ['bat' + k]: N['bat' + k], ['cang' + k]: N['cang' + k], ['bat' + o]: N['bat' + o], ['cang' + o]: N['cang' + o], ['aim' + k]: 0, ['aim' + o]: 0, duration: 0.4, ease: 'power2.inOut' }, U + 0.2);
    t.set(s, { ['tay' + k]: 'mo', ['tay' + o]: 'mo' }, U + 0.6);
    if (c.pet) t.to(s, { onTopL: 0, onTopR: 0, careFront: 0, duration: 0.02 }, U + 0.45);
    t.to(s, { petStand49b: 0, petCalm50a: 0, duration: 0.5, ease: 'sine.inOut' }, U + 0.5);
    c.look(c.spot('eye', 'petStand49b', 1), U + 0.3, { d: 0.35 });
    t.to(s, { headTilt: 0, nhinY: 0, nhinX: 0, cuoi: 1, chum: 0, mayL: 0.6, mayR: 0.6, mieng: 0.25, duration: 0.3 }, U + 0.35);
    t.to(s, { dauY: 13, duration: 0.2, ease: 'sine.out', yoyo: true, repeat: 1 }, U + 0.75);
    this._khep(t, 0.45, total - 0.45, { ...c.keep });
    return t;
  }

  /**
   * SIÊU ÂM con vật `target`: quay nghiêng về nó, tay xa đặt lên vai / ngực nó vỗ về — con vật NẰM NGHIÊNG ra (bụng lộ ra; như `lieOnSide` của nó);
   * tay gần bóp LỌ GEL lên bụng (giọt gel rơi, lớp gel trong mờ trên bụng), đổi sang ĐẦU DÒ (dây cáp) đặt lên gel, rà chậm qua lại `hold` giây — một THẺ
   * ẢNH SIÊU ÂM bật lên trên (quạt ảnh xám, vạch quét — hình minh hoạ chung, không chữ). Người liếc nhìn màn hình: `screen` (điểm { x, y } khung
   * 400 × 470 — màn hình xe đẩy siêu âm của bối cảnh 3D, `set.targetPoint`) hay thẻ ảnh. Xong: nhấc đầu dò, thẻ tắt, gel tan, con vật đứng dậy (con vật
   * vốn đã `lieOnSide` thì vẫn nằm), gật, cười.
   */
  useUltrasound(target = null, { hold = 2.6, screen = null, facing = null } = {}) {
    if (!(Number.isFinite(hold) && hold >= 1 && hold <= 6)) throw new Error(`[character] useUltrasound: hold must be 1…6 seconds of scanning, got ${JSON.stringify(hold)}`);
    if (facing !== null && facing !== 'away' && facing !== 'toward') throw new Error(`[character] useUltrasound: facing must be 'away', 'toward' or null (the way the pet faces while scanned), got ${JSON.stringify(facing)}`);
    if (screen !== null && !(screen && Number.isFinite(+screen.x) && Number.isFinite(+screen.y))) throw new Error(`[character] useUltrasound: screen must be a point { x, y } in the 400 × 470 frame (set.targetPoint(person, [x, y, z]) in a 3D set) or null, got ${JSON.stringify(screen)}`);
    // KHUỴU GỐI vừa đủ: thử trên một timeline nháp — sâu dần tới khi đầu dò đặt thẳng xuống được bụng con vật đang nằm (bàn thấp, con vật nhỏ).
    const crouchFor = () => {
      for (const deep of [0.45, 0.6, 0.75]) {
        const d = this._care38(gsap.timeline(), target, 'useUltrasound', deep);
        if (!d.pet || this.s.seat > 0.5 || this.s.kneel > 0.5) return deep;
        d.target50a = target; d.facing50a = facing;
        const L = this._bellyLine50a(d, 'belly50a', 'petSide50a');
        if ([0, 0.15, -0.15, 0.3, -0.3].some((u) => { const q = L.at(u); return !(d.armDown(d.k, q.x, q.y + 2, PROBE_TIP50A).short > 1); })) return deep;
      }
      return 0.75;
    };
    const t = this.tl(), s = this.s, N = this.NGHI, c = this._care38(t, target, 'useUltrasound', crouchFor()), { k, o, dir } = c;
    c.target50a = target; c.facing50a = facing;
    const line = this._bellyLine50a(c, 'belly50a', 'petSide50a'), off = this._offHead50a(c, 'petSide50a');
    // Tay xa: vỗ về trên vai / ngực con vật đang nằm (chỗ gáy → lưng ở dáng nằm), không che mặt nó.
    const Sc = this._spot50a(c, 'scruff', 'petSide50a'), B = this._spot50a(c, 'back', 'petSide50a');
    // Tay xa vỗ về trên LƯNG nó (đầu ngón tay ở đường lưng, lòng bàn tay phía người — các ngón không chìa tới mặt nó).
    const Rp = c.pet ? this._spot50a(c, 'rump49b', 'petSide50a') : { x: B.x + (B.x - Sc.x), y: B.y }, probeAt = line.at(0);
    const calm = [...[0.35, 0.6].map((v) => ({ x: B.x + (Rp.x - B.x) * v, y: B.y + (Rp.y - B.y) * v - 1 })), ...[0.9, 0.7].map((u) => ({ x: Sc.x + (B.x - Sc.x) * u, y: Sc.y + (B.y - Sc.y) * u - 1 }))]
      .filter((q) => off(q) && !(c.arm(o, q.x, q.y, 24).short > 1)).sort((p, q) => Math.abs(q.x - probeAt.x) - Math.abs(p.x - probeAt.x))[0] || { x: B.x, y: B.y };          // xa chỗ đầu dò nhất: tay không khuất sau đầu dò
    const pat = (dy) => c.arm(o, calm.x, calm.y + dy, 24);
    const down = (tip, u, lift = 0) => { const q = line.at(u); return c.armDown(k, q.x, q.y + 2 - lift, tip); };          // mặt dò ấn khẽ vào gel
    // CHỖ RÀ: giữa bụng nếu với tới, không thì nhích về phía ngực (gần người hơn) tới chỗ đầu tiên đầu dò đặt được thẳng xuống; rà ±0,18 quanh đó.
    const reachable = (u) => !(down(PROBE_TIP50A, u).short > 1) && off(line.at(u));
    const near = Math.abs(line.at(0.4).x - HONG.x) <= Math.abs(line.at(-0.4).x - HONG.x) ? 1 : -1;          // phía thân gần người (ngực hay hông)
    const U0 = [0, 0.12, 0.24, 0.36, 0.48].map((u) => u * near).find(reachable) ?? 0.48 * near, slide = (d) => [U0 + d, U0 + d / 2, U0].find(reachable) ?? U0;
    let spun = +s['gadgetTurn' + k] || 0;
    const turnTo = (spin) => (spun += chuanHoaGoc(spin - spun));
    const go = (p, at, d, ease = 'sine.inOut') => t.to(s, { ['bat' + k]: p.bat, ['cang' + k]: p.cang, ...(p.spin !== undefined ? { ['gadgetTurn' + k]: turnTo(p.spin) } : {}), duration: d, ease }, at);
    const G0 = 0.55, S0 = 1.85, E = S0 + hold, total = E + 1.9;
    // 0. Vỗ về, con vật nằm nghiêng ra; lọ gel hiện trong tay gần, giơ trên bụng.
    t.to(s, { ['bat' + o]: pat(-3).bat, ['cang' + o]: pat(-3).cang, dauY: 8, cuoi: 0.6, chum: 0.1, mayL: 0.35, mayR: 0.35, duration: 0.45, ease: 'power2.out' }, 0.05);
    t.set(s, { ['tay' + o]: 'xoe', scanDir50a: dir, gelDrop50a: 0, petGelU50a: 0.5 - 0.5 * U0 }, 0.03);
    for (let a = 0.5, i = 0; a < S0 - 0.2; a += 0.35, i++) t.to(s, { ['bat' + o]: pat(i % 2 ? -2 : 1).bat, ['cang' + o]: pat(i % 2 ? -2 : 1).cang, duration: 0.35, ease: 'sine.inOut' }, a);
    t.to(s, { petSide50a: 1, duration: 0.85, ease: 'sine.inOut' }, 0.1);
    t.to(s, { petCalm50a: 0.5, duration: 0.6, ease: 'sine.inOut' }, 0.7);
    if (c.pet) { (this.caring || (this.caring = new Set())).add(c.pet); t.to(s, { onTopL: 1, onTopR: 1, careFront: 1, duration: 0.02 }, 0.12); }
    c.look(line.at(0), 0.1, { d: 0.45 });
    t.set(s, { ['gadget' + k]: 47 }, G0);
    go(down(GEL_TIP50A, U0, GEL_GAP50A + 4), G0, 0.35);
    // 1. BÓP GEL: giọt gel rơi xuống bụng, lớp gel loang ra.
    t.fromTo(s, { gelDrop50a: 0 }, { gelDrop50a: 1, duration: 0.38, ease: 'power1.in', immediateRender: false }, G0 + 0.42);
    t.to(s, { petGel50a: 1, duration: 0.3, ease: 'sine.out' }, G0 + 0.72);
    // 2. ĐỔI SANG ĐẦU DÒ (lọ gel cất), đặt lên gel.
    t.set(s, { ['gadget' + k]: 46, gelDrop50a: 0 }, G0 + 0.95);
    go(down(PROBE_TIP50A, U0, 8), G0 + 0.92, 0.25);
    go(down(PROBE_TIP50A, U0), S0 - 0.25, 0.25);
    t.fromTo(s, { scanT50a: 0 }, { scanT50a: total, duration: total, ease: 'none', immediateRender: false }, 0);
    // 3. RÀ CHẬM qua lại trên bụng; thẻ ảnh siêu âm bật lên; liếc nhìn màn hình (hay thẻ ảnh) rồi lại nhìn bụng.
    t.to(s, { scan50a: 1, duration: 0.35, ease: 'back.out(1.6)' }, S0);
    const stops = [0.18, -0.18, 0.12, -0.12, 0.16, -0.14], m = Math.max(2, Math.round(hold / 0.9)), per = hold / m;
    for (let i = 0; i < m; i++) { go(down(PROBE_TIP50A, slide(stops[i % stops.length])), S0 + i * per, per); }
    const glance = screen ? { x: +screen.x - s.x, y: +screen.y - s.y - DOI_Y } : null;
    const card = (() => { const q = line.at(U0); return { x: q.x + dir * RigSVG.SCAN_ASIDE50A * 0.8, y: q.y - RigSVG.SCAN_LIFT50A * 0.75 }; })();
    c.look(line.at(U0), S0 + 0.1, { d: 0.35 });
    c.look(glance || card, S0 + hold * 0.3, { d: 0.4 });
    t.to(s, { mayL: 0.15, mayR: 0.15, chum: 0.3, cuoi: 0.4, duration: 0.3 }, S0 + hold * 0.3 + 0.1);
    c.look(line.at(U0), S0 + hold * 0.3 + 0.95, { d: 0.4 });
    if (hold >= 2) c.look(glance || card, S0 + hold * 0.78, { d: 0.35 });
    // 4. Xong: thẻ tắt, nhấc đầu dò, cất; gel tan; con vật dậy (nếu nó không tự nằm), vui; nhìn mặt nó, cười, gật.
    t.to(s, { scan50a: 0, duration: 0.25, ease: 'power2.in' }, E);
    go(down(PROBE_TIP50A, U0, 12), E + 0.02, 0.25);
    t.to(s, { ['bat' + k]: N['bat' + k], ['cang' + k]: N['cang' + k], ['aim' + k]: 0, ['gadgetTurn' + k]: spun - chuanHoaGoc(spun), duration: 0.35, ease: 'power2.inOut' }, E + 0.3);
    t.to(s, { ['bat' + o]: N['bat' + o], ['cang' + o]: N['cang' + o], ['aim' + o]: 0, duration: 0.4, ease: 'power2.inOut' }, E + 0.35);
    t.set(s, { ['gadget' + k]: 0, ['tay' + k]: 'mo', ['tay' + o]: 'mo' }, E + 0.66);
    if (c.pet) t.to(s, { onTopL: 0, onTopR: 0, careFront: 0, duration: 0.02 }, E + 0.55);
    t.to(s, { petGel50a: 0, duration: 0.5, ease: 'sine.in' }, E + 0.4);
    t.to(s, { petSide50a: 0, petCalm50a: 0, duration: 0.8, ease: 'sine.inOut' }, E + 0.7);
    c.look(c.spot('eye'), E + 0.45, { d: 0.35 });
    t.to(s, { cuoi: 1, mieng: 0.3, mayL: 0.7, mayR: 0.7, chum: 0, duration: 0.3 }, E + 0.55);
    t.to(s, { dauY: 13, duration: 0.2, ease: 'sine.out', yoyo: true, repeat: 1 }, E + 1.1);
    this._khep(t, 0.45, total - 0.45, { ...c.keep });
    return t;
  }

  // Mắt (giữa hai con mắt) trong hệ `_aimOf` ở dáng `pose` (đặt tạm, vẽ, đo, trả lại). Chưa vẽ được (chưa gắn vào trang): null.
  _eyeAt50a(pose) {
    const s = this.s, keys = Object.keys(pose), was = Object.fromEntries(keys.map((key) => [key, s[key]]));
    if (!this.svg.getScreenCTM() || !this.el.matL || !this.el.matL.getScreenCTM) return null;
    Object.assign(s, pose);
    try {
      this.apDung();
      const inv = this.svg.getScreenCTM().inverse(), pts = ['matL', 'matR'].map((key) => new DOMPoint(0, 0).matrixTransform(this.el[key].getScreenCTM()).matrixTransform(inv));
      const x = (pts[0].x + pts[1].x) / 2, y = (pts[0].y + pts[1].y) / 2;
      return Number.isFinite(x) && Number.isFinite(y) ? { x: x - s.x, y: y - (s.y || 0) - DOI_Y } : null;
    } catch (error) { return null; } finally { Object.assign(s, was); this.apDung(); }
  }

  // Góc hai đốt tay (góc trên màn hình, `aim` = 1) để lòng bàn tay `side` tới (x, y) hệ `_aimOf` ở dáng `pose`: lời giải mô hình (vai thật ở dáng ấy)
  // rồi ĐO LẠI TRÊN HÌNH và dời đích bù chỗ lệch (như `_care38`), giữ lần trúng nhất.
  _armAt50a(side, x, y, pose, reachIn = 10) {
    const s = this.s, keys = [...new Set([...Object.keys(pose), 'bat' + side, 'cang' + side, 'aim' + side, 'carry' + side])], was = Object.fromEntries(keys.map((key) => [key, s[key]]));
    const drop = DAI.dui * this.nv.daiDui * this.nv.coChan * 0.72 * (pose.seat || 0);
    const solve = (a, b) => this._armToTurned(side, a, b, pose.huong ?? s.huong, drop);
    let tx = x, ty = y, p = solve(tx, ty), best = null;
    if (!this.svg.getScreenCTM() || !this.el['coTay' + side]) return p;
    try {
      for (let n = 0; n < 4; n++) {
        Object.assign(s, pose, { ['bat' + side]: p.bat, ['cang' + side]: p.cang, ['aim' + side]: 1, ['carry' + side]: 0 });
        this.apDung();
        const m = this.svg.getScreenCTM().inverse().multiply(this.el['coTay' + side].getScreenCTM()), q = new DOMPoint(0, reachIn).matrixTransform(m);
        if (!Number.isFinite(q.x)) break;
        const hx = q.x - s.x, hy = q.y - (s.y || 0) - DOI_Y, miss = Math.hypot(x - hx, y - hy);
        if (!best || miss < best.miss) best = { p, miss };
        if (miss < 0.6) break;
        tx += x - hx; ty += y - hy; p = solve(tx, ty);
      }
    } catch (error) { /* chưa vẽ được: giữ lời giải mô hình */ } finally { Object.assign(s, was); this.apDung(); }
    return best ? { ...best.p, miss: best.miss } : { ...p, miss: Infinity };
  }

  /**
   * SOI KÍNH HIỂN VI ở bàn xét nghiệm: quay 3/4 về phía kính, CÚI NGƯỜI tới (thân ngả, khuỵu gối nếu kính thấp) cho MẮT áp vào thị kính `target`
   * (điểm { x, y } khung 400 × 470 — đỉnh thị kính; bối cảnh 3D: `set.targetPoint(người, [x, y, z])` của cutout kính hiển vi), đầu chúi tới và cúi
   * xuống, mắt nheo; tay gần VẶN NÚM CHỈNH TIÊU CỰ (`knob` — điểm { x, y }; mặc định dưới thị kính) từng nấc nhỏ, tay kia tì lên mặt bàn; giữ `hold`
   * giây. Rồi đứng thẳng lên, gật gù, cười ("thấy rồi"). Không có `target`: diễn ở một điểm trước mặt, ngang ngực (trang thử).
   */
  lookMicroscope(target = null, { hold = 2, knob = null } = {}) {
    if (!(Number.isFinite(hold) && hold >= 1 && hold <= 6)) throw new Error(`[character] lookMicroscope: hold must be 1…6 seconds at the eyepiece, got ${JSON.stringify(hold)}`);
    const point = (v, what) => {
      if (v === null || v === undefined) return null;
      const live = v.live ? v.live : v;
      if (!(live && Number.isFinite(+live.x) && Number.isFinite(+live.y)) || live.el) throw new Error(`[character] lookMicroscope: ${what} must be a point { x, y } in the 400 × 470 frame (set.targetPoint(person, [x, y, z]) in a 3D set) or null, got ${JSON.stringify(v)}`);
      return { x: +live.x - this.s.x, y: +live.y - this.s.y - DOI_Y };
    };
    const t = this.tl(), s = this.s, N = this.NGHI, keep = {};
    for (const side of ['L', 'R']) if (this.holds[side] && s['item' + side] > 0.5) { t.to(s, { ['item' + side]: 0, ['carry' + side]: 0, duration: 0.15 }, 0); keep['item' + side] = 1; }
    const face = this._faceCentre(N.huong);
    const E = point(target, 'target') || { x: face.x + 78, y: face.y + 70 }, dir = E.x >= HONG.x ? 1 : -1, k = dir > 0 ? 'R' : 'L', o = k === 'L' ? 'R' : 'L';
    const turn = dir * RigSVG.MICRO_TURN50A;
    // Mắt tới SÁT thị kính (dừng trước nó chừng 3 đơn vị về phía người): thử các độ cúi thân / khuỵu gối, đo mắt trên hình, lấy chỗ gần nhất.
    const want = { x: E.x - dir * 3, y: E.y - 1 };
    const poseOf = (lean, crouch) => {
      const base = { huong: turn, than: N.than + dir * lean, seat: crouch, vai: N.vai + 4, dauY: 9, dauX: N.dauX + dir * 3 };
      const look = this._lookAngles(want, { huong: turn });
      return { ...base, headTurn: look.headTurn, headPitch: Math.max(0.45, look.headPitch), headTilt: look.headTilt };
    };
    let best = null;
    for (let crouch = 0; crouch <= RigSVG.MICRO_CROUCH50A + 1e-6; crouch += 0.1) {
      for (let lean = 0; lean <= RigSVG.MICRO_LEAN50A; lean += 2) {
        const eye = this._eyeAt50a(poseOf(lean, crouch));
        if (!eye) continue;
        const miss = Math.hypot(eye.x - want.x, eye.y - want.y) + lean * 0.04 + crouch * 2;      // gần bằng nhau thì chọn dáng ít cúi hơn
        if (!best || miss < best.miss) best = { lean, crouch, miss };
      }
    }
    const lean = best ? best.lean : 14, crouch = best ? Math.round(best.crouch * 10) / 10 : 0, pose = poseOf(lean, crouch);
    // Núm chỉnh tiêu cự: đưa sẵn, hay dưới thị kính về phía kính; tay kia tì mặt bàn, phía người, thấp hơn núm.
    const reach = Math.max(60, Math.abs(E.y - face.y) + 40);
    const K = point(knob, 'knob') || { x: E.x + dir * 22, y: E.y + reach * 0.55 };
    const span = Math.max(40, K.y - E.y), rest = { x: K.x - dir * span * 0.55, y: K.y + span * 0.35 };
    const kPose = (twist) => this._armAt50a(k, K.x, K.y + twist, pose), oPose = this._armAt50a(o, rest.x, rest.y, pose);
    const kp = kPose(0), kTwist = [kPose(-1.6), kPose(1.6)];
    if (target) this._micro50a = { eye: target.live || target, knob: knob ? knob.live || knob : { x: K.x + s.x, y: K.y + s.y + DOI_Y }, k };
    const D = 0.55, L0 = D + 0.7, U = L0 + hold, total = U + 1.6;
    // 0. Quay về phía kính, nhìn nó.
    this._openUp(t);
    t.to(s, { huong: turn, aimL: 1, aimR: 1, carryL: 0, carryR: 0, duration: 0.45, ease: 'sine.inOut' }, 0);
    this._lookTo(t, want, 0.1, { d: 0.4, huong: turn });
    // 1. Cúi người tới: thân ngả, khuỵu gối, đầu chúi xuống thị kính; tay gần tới núm, tay kia tì mặt bàn.
    t.to(s, { than: pose.than, seat: pose.seat, vai: pose.vai, dauY: pose.dauY, dauX: pose.dauX, headTurn: pose.headTurn, headPitch: pose.headPitch, headTilt: pose.headTilt,
              ['bat' + k]: kp.bat, ['cang' + k]: kp.cang, ['bat' + o]: oPose.bat, ['cang' + o]: oPose.cang, micro50a: 1, duration: 0.7, ease: 'power2.inOut' }, D);
    t.set(s, { ['tay' + k]: 'nam', ['tay' + o]: 'mo' }, D + 0.3);
    // mắt nheo vào thị kính, mày nhíu — chăm chú
    t.to(s, { matY: 0.55, nhinY: 1.2, nhinX: dir * 0.8, mayL: 0.05, mayR: 0.05, chum: 0.35, cuoi: 0.25, duration: 0.3 }, L0 - 0.15);
    // 2. VẶN NÚM từng nấc nhỏ (cổ tay xoay nhẹ, bàn tay nhích lên / xuống), đầu yên.
    for (let a = L0, i = 0; a + 0.3 <= U - 0.05; a += 0.4, i++) {
      const p = kTwist[i % 2];
      t.to(s, { ['bat' + k]: p.bat, ['cang' + k]: p.cang, knob50a: i + 1, duration: 0.3, ease: 'sine.inOut' }, a);
    }
    t.to(s, { mayL: 0.45, mayR: 0.45, chum: 0.1, duration: 0.25 }, L0 + hold * 0.7);           // "rõ rồi"
    // 3. Đứng thẳng lên, nhìn ra, gật gù, cười.
    t.to(s, { than: N.than, seat: N.seat, vai: N.vai, dauY: 4, dauX: N.dauX, headTurn: 0, headPitch: 0, headTilt: 0, matY: N.matY, nhinY: 0, nhinX: 0, micro50a: 0,
              ['bat' + k]: N['bat' + k], ['cang' + k]: N['cang' + k], ['bat' + o]: N['bat' + o], ['cang' + o]: N['cang' + o], duration: 0.55, ease: 'power2.inOut' }, U);
    t.set(s, { ['tay' + k]: 'mo', ['tay' + o]: 'mo' }, U + 0.3);
    t.to(s, { cuoi: 1, mieng: 0.3, mayL: 0.7, mayR: 0.7, chum: 0, duration: 0.3 }, U + 0.45);
    t.to(s, { dauY: 12, duration: 0.2, ease: 'sine.out', yoyo: true, repeat: 3 }, U + 0.6);
    this._khep(t, 0.4, total - 0.4, { ...keep });
    return t;
  }
});
