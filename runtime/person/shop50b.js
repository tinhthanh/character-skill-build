// runtime/person/shop50b.js — đợt 50 B: the pet shop and the POS counter — take a product off a shelf (`takeFromShelf`), scan its barcode
// (`scanBarcode`). Methods of `RigSVG`, installed by runtime/rig-svg.js: `this` is the rig, `RigSVG` its class.
//
// ĐỢT 50 B — CỬA HÀNG THÚ CƯNG & QUẦY THU NGÂN.
// • LẤY HÀNG TRÊN KỆ: quay nghiêng về kệ, với tay tới tầng hàng (`level`: 'high' — kiễng chân với lên, 'middle' — ngang ngực, 'low' — ngồi xổm,
//   đổ lưng như `pickUp`), nắm lấy món hàng (túi hạt / hộp bánh thưởng / lon pate — runtime/shop50b-items.js), đưa về trước ngực, XOAY nó về mặt
//   nhãn để đọc (mặt sau → mặt trước: kênh `spin50bL/R` 1 → 0), gật nhẹ, rồi giữ món hàng (như `pickUp`: món đồ thành đồ cầm ở tay ấy, sẵn cho `handOver`).
//   Tay ấy chưa có đồ thì rig tự cho nó món hàng (đang cất) — như `pickUp` (`autoItem50b`).
// • QUÉT MÃ VẠCH: máy quét cầm tay (gadget 50 — dựng vào markup lần đầu dùng, nhân vật chưa từng quét thì SVG y như trước đợt này) chĩa vào món hàng
//   cầm ở tay kia; TIA ĐỎ (`beam50bL/R`: độ dài tia, đơn vị khung bàn tay — vạch quét đỏ nằm ngang trên món hàng ở cuối tia), "BÍP" (`beep50b`: cung
//   xanh hai bên đầu máy, ô kính loé xanh) và thẻ số giá tiền (hệ thẻ số đo `readout`, như `scanChip`). Món hàng: đang cầm ở tay kia, của KHÁCH (rig /
//   mỏ neo — vươn tay NHẬN lấy món họ đưa, cùng nhịp với `handOver` của họ: món hàng sang tay lúc 0,62 s), hay nằm trên quầy (điểm / phần tử).
//   Quét xong: `put` 'down' đặt xuống quầy, 'keep' giữ lại (để `handOver` trả khách), 'bag' bỏ vào túi đang cất ở tay cầm máy (túi hiện ra).
// • KIỄNG CHÂN (`tiptoe50b` 0…1): cả người nhấc lên (`lift42d`, bóng ở lại trên sàn) và hai bàn chân nhìn nghiêng xoay quanh cổ chân cho mũi giày
//   chạm sàn — vẽ sau bước vẽ chân (`_drawShopTools50b`), chỉ khi kênh > 0.

import { HONG, DOI_Y, DAI, KHUNG, SQUAT42E, clamp, chuanHoaGoc, RAD, mix } from './shared.js';
import { SHOP50B } from '../shop50b-items.js';

const SCANNER_WINDOW50B = 32;          // ô kính đầu máy quét cách cổ tay chừng ấy theo bàn tay (gadget 50): tia đỏ bắt đầu ở đây
const SCAN_FAN50B = 6.5;               // tia loe ra tới nửa bề ngang chừng ấy ở cuối (đơn vị khung bàn tay) — vạch quét nằm ngang trên món hàng
const TIPTOE_LIFT50B = 9;              // kiễng chân: người nhấc lên chừng ấy đơn vị khung
const ITEM_DY50B = { foodBag: 35, treatBox: -20, can: -8 };      // tâm món hàng dưới (+) / trên (−) lòng bàn tay chừng ấy đơn vị bàn tay khi cầm thẳng
const LEVELS50B = ['high', 'middle', 'low'];
const PUTS50B = ['down', 'keep', 'bag'];

// MÁY QUÉT MÃ VẠCH cầm tay (hệ cổ tay: lòng bàn tay ở (0, 10), máy chĩa theo +y): cán đen trong nắm tay, đầu máy vàng cam, ô kính đỏ ở mũi; tia đỏ loe
// ra (`data-beam50b`, độ dài theo kênh) với vạch quét sáng ở cuối (`data-line50b`); hai cung "bíp" xanh (`data-beep50b`) và ô kính loé xanh (`data-flash50b`).
const SCANNER50B = `<g data-gadget="50"><rect x="-4.6" y="-7" width="9.2" height="22" rx="3.2" fill="#2b2f36" stroke="#15181d" stroke-width="1.1"/>
        <path d="M -7.5 13 L 7.5 13 L 10 ${SCANNER_WINDOW50B - 1} L -10 ${SCANNER_WINDOW50B - 1} Z" fill="#f2b134" stroke="#7a5512" stroke-width="1.2" stroke-linejoin="round"/>
        <rect x="-3.4" y="16" width="6.8" height="4.4" rx="1.2" fill="#2b2f36"/>
        <rect x="-9.4" y="${SCANNER_WINDOW50B - 2}" width="18.8" height="3.4" rx="1.4" fill="#d83a3a" stroke="#7a1d1d" stroke-width=".8"/>
        <rect data-flash50b="1" x="-9.4" y="${SCANNER_WINDOW50B - 2}" width="18.8" height="3.4" rx="1.4" fill="#5cf08a" style="display:none"/>
        <g data-beam50b="1" style="display:none"><path data-fan50b="1" fill="#ff3b3b" fill-opacity=".22" stroke="none"/><path data-ray50b="1" stroke="#ff3b3b" stroke-width="1" stroke-opacity=".7" fill="none"/>
          <path data-line50b="1" stroke="#ff2020" stroke-width="2" stroke-linecap="round" fill="none"/><path data-glow50b="1" stroke="#ff9a9a" stroke-width="4.4" stroke-linecap="round" stroke-opacity=".45" fill="none"/></g>
        <g data-beep50b="1" style="display:none" stroke="#38c172" stroke-width="2.2" fill="none" stroke-linecap="round"><path d="M 14 16 q 5 8 0 16 M 19 12 q 8 12 0 24"/><path d="M -14 16 q -5 8 0 16 M -19 12 q -8 12 0 24"/></g></g>`;

export default (RigSVG) => mix(RigSVG, class {
  static SCAN_BEEP50B = 0.55;        // giây "bíp" sau khi tia đỏ bật (tối đa — `hold` ngắn thì sớm hơn)
  static HANDOFF50B = 0.62;          // giây món hàng sang tay thu ngân khi nhận từ khách — như `take` / `handOver` (cùng nhịp)

  // ── VẼ (gọi trong `_drawHeldItems`): dựng máy quét lần đầu dùng, tia đỏ / bíp; mặt món hàng (nhãn / mặt sau); kiễng chân.
  _drawShopTools50b(f) {
    const e = this.el, s = this.s, n2 = (v) => v.toFixed(2);
    for (const side of ['L', 'R']) {
      const box = e['gadget' + side], kind = Math.round(s['gadget' + side]);
      if (box && kind === 50) {
        let tool = [...box.children].find((child) => +child.getAttribute('data-gadget') === 50);
        if (!tool) { box.insertAdjacentHTML('beforeend', SCANNER50B); tool = box.lastElementChild; }
        tool.style.display = '';
        const L = Math.max(0, +s['beam50b' + side] || 0), beam = tool.querySelector('[data-beam50b]');
        beam.style.display = L > 0.5 ? '' : 'none';
        if (L > 0.5) {
          const y0 = SCANNER_WINDOW50B + 1.4, y1 = y0 + L, w = SCAN_FAN50B, wob = 0.8 * Math.sin((+s.scanT50b || 0) * 31);
          tool.querySelector('[data-fan50b]').setAttribute('d', `M -2.4 ${n2(y0)} L ${n2(-w)} ${n2(y1 + wob)} L ${n2(w)} ${n2(y1 - wob)} L 2.4 ${n2(y0)} Z`);
          tool.querySelector('[data-ray50b]').setAttribute('d', `M 0 ${n2(y0)} L 0 ${n2(y1)}`);
          for (const key of ['line50b', 'glow50b']) tool.querySelector(`[data-${key}]`).setAttribute('d', `M ${n2(-w)} ${n2(y1 + wob)} L ${n2(w)} ${n2(y1 - wob)}`);
        }
        const beep = clamp(+s.beep50b || 0, 0, 1);
        tool.querySelector('[data-beep50b]').style.display = beep > 0.3 ? '' : 'none';
        tool.querySelector('[data-flash50b]').style.display = beep > 0.3 ? '' : 'none';
      }
      // Mặt món hàng: chỉ đổi khi khác — món hàng nghỉ ở mặt nhãn (markup gốc).
      const goods = this.holds[side] && e['item' + side] && e['item' + side].querySelector('[data-shop50b]');
      if (goods) {
        const back = (+s['spin50b' + side] || 0) >= 0.5;
        for (const face of goods.querySelectorAll('[data-side50b]')) {
          const hide = (face.getAttribute('data-side50b') === 'front') === back;
          if ((face.style.display === 'none') !== hide) face.style.display = hide ? 'none' : '';
        }
      }
    }
    // KIỄNG CHÂN: bàn chân nhìn nghiêng xoay quanh cổ chân (mũi xuống sàn, gót lên); bàn chân nhìn thẳng dời xuống theo phần người nhấc lên.
    const toe = clamp(+s.tiptoe50b || 0, 0, 1);
    if (toe > 0.001) {
      const lift = TIPTOE_LIFT50B * toe, ankle = { x: 2, y: DAI.ong - 2 }, tip = { x: 26 - ankle.x, y: DAI.ong + 10 - ankle.y };
      const r = Math.hypot(tip.x, tip.y), base = Math.atan2(tip.y, tip.x), want = clamp((tip.y + lift / (this.nv.coBanChan || 1)) / r, -1, 1);
      const turn = (Math.asin(want) - base) / RAD;
      for (const ben of ['L', 'R']) {
        const side = e['banNg' + ben], front = e['ban' + ben];
        if (side) side.setAttribute('transform', `${side.getAttribute('transform') || ''} rotate(${n2(turn)} ${ankle.x} ${ankle.y})`);
        if (front) front.setAttribute('transform', `${front.getAttribute('transform') || ''} translate(0 ${n2(lift * 0.8)})`);
      }
    }
  }

  /** Số đo (đợt 50 B — tools/check.html, tools/acting_check.py qua `set.careProbe()` → `c50b`): món hàng trong tay, máy quét, tia đỏ, kệ. */
  shop50bProbe() {
    const e = this.el, s = this.s;
    const scanSide = ['L', 'R'].find((k) => Math.round(s['gadget' + k]) === 50) || null;
    const tool = scanSide ? [...e['gadget' + scanSide].children].find((child) => +child.getAttribute('data-gadget') === 50) || null : null;
    const goodsSide = ['L', 'R'].find((k) => this.holds[k] && s['item' + k] > 0.5 && e['item' + k].querySelector('[data-shop50b]')) || null;
    const goods = goodsSide ? e['item' + goodsSide].querySelector('[data-shop50b]') : null;
    const L = scanSide ? Math.max(0, +s['beam50b' + scanSide] || 0) : 0, beam = tool && L > 0.5 ? tool.querySelector('[data-line50b]') : null;
    const at = (el, x, y) => { const m = el && el.getScreenCTM(); if (!m) return null; const q = new DOMPoint(x, y).matrixTransform(m); return { x: q.x, y: q.y, px: true }; };
    return { scanner: tool, scanSide, beam: L > 0.5, beamLine: beam, beamEnd: tool && L > 0.5 ? at(tool, 0, SCANNER_WINDOW50B + 1.4 + L) : null, window: tool ? at(tool, 0, SCANNER_WINDOW50B) : null,
             goods, goodsSide, goodsKind: goods ? goods.getAttribute('data-shop50b') : null, label: goods ? !((+s['spin50b' + goodsSide] || 0) >= 0.5) : null,
             beep: +clamp(+s.beep50b || 0, 0, 1).toFixed(3), tiptoe: +clamp(+s.tiptoe50b || 0, 0, 1).toFixed(3), squat: +clamp(+s.squat42e || 0, 0, 1).toFixed(3),
             hand: goodsSide ? at(e['coTay' + goodsSide], 0, 10) : null, handR: at(e.coTayR, 0, 10), handL: at(e.coTayL, 0, 10), shelf: this.shelf50b || null, readout: +clamp(+s.readout || 0, 0, 1).toFixed(3) };
  }

  // Món hàng (loại) trong tay `k`, hay null. Món rig tự cho mà chưa lấy (lần dựng trước của `sequence()`) coi như đang cất.
  _goods50b(k) {
    const el = this.holds[k] && this.el['item' + k] && this.el['item' + k].querySelector('[data-shop50b]');
    return el ? el.getAttribute('data-shop50b') : null;
  }
  _autoGoods50b(k) { return !!(this.autoItem50b && this.autoItem50b[k] && this._goods50b(k) === this.autoItem50b[k]); }

  // Cỡ bàn tay so với khung (như `_palmTo`): đơn vị khung mỗi đơn vị bàn tay.
  _handScale50b(k) {
    const m = this.el['coTay' + k] && this.el['coTay' + k].getScreenCTM && this.el['coTay' + k].getScreenCTM(), r = this.svg.getScreenCTM && this.svg.getScreenCTM();
    const ratio = m && r && Math.hypot(r.a, r.b) ? Math.hypot(m.a, m.b) / Math.hypot(r.a, r.b) / (this.s['handZoom' + k] || 1) : this.nv.coThan;
    return Number.isFinite(ratio) && ratio > 0 ? ratio : this.nv.coThan || 1;
  }

  // Cho tay `k` món hàng `draw` (đang cất) nếu tay ấy chưa có — giữ nguyên dáng đang có (gọi thẳng và qua `sequence()` bắt đầu như nhau).
  _giveGoods50b(k, draw, kind) {
    const s = this.s, keepArms = Object.fromEntries(['batL', 'cangL', 'tayL', 'batR', 'cangR', 'tayR', 'itemL', 'itemR'].map((key) => [key, s[key]]));
    this.setItem(k, draw, { shown: false });
    Object.assign(this.s, keepArms); this.apDung();
    this.autoItem50b = { ...(this.autoItem50b || {}), [k]: kind };
  }

  // CHỖ LẤY HÀNG trong khung người (hệ `_aimOf`): kệ = null (khoảng không cạnh người, phía đang quay — hay bên phải), { x, y } (hệ gốc của SVG —
  // `set.targetPoint(rig, [x, y, z])`), { at, shelf } (bối cảnh 3D: `at` như trên, `shelf` = phần tử kệ cho số đo), hay một phần tử trang (cạnh kệ gần
  // người, tầng theo `level`).
  _shelfSpot50b(shelf, level) {
    const s = this.s, c = this.nv.coThan || 1, toFrame = (p) => ({ x: p.x - (s.x || 0), y: p.y - (s.y || 0) - DOI_Y });
    const sy = this._shoulderY(), floor = KHUNG.h - 42;
    const heights = { high: sy - 104 * c, middle: sy + 26 * c, low: floor - 54 * c };
    if (shelf === null || shelf === undefined || shelf === 'left' || shelf === 'right') {
      const dir = shelf === 'left' ? -1 : shelf === 'right' ? 1 : Math.sign(s.huong) || 1;
      if (level === 'high') {          // tầng cao: tay gần duỗi thẳng, chếch 58° lên trên — đầu chibi to, ngang đỉnh đầu là quá tầm tay
        const reach = (DAI.canhTay * this.nv.daiCanhTay + DAI.cangTay * this.nv.daiCangTay) * c * 0.94, a = 58 * RAD;
        return { x: HONG.x + dir * (22 * c + Math.cos(a) * reach), y: sy - TIPTOE_LIFT50B - Math.sin(a) * reach, el: null };
      }
      return { x: HONG.x + dir * 74 * c, y: heights[level], el: null };
    }
    if (shelf && shelf.at && typeof shelf.at.x === 'number' && typeof shelf.at.y === 'number') return { ...toFrame(shelf.at), el: shelf.shelf || null };
    if (typeof shelf.x === 'number' && typeof shelf.y === 'number' && !shelf.getBoundingClientRect) return { ...toFrame(shelf), el: null };
    const el = shelf && (shelf.svg || shelf);
    if (el && el.getBoundingClientRect) {
      const r = el.getBoundingClientRect(), inv = this.svg.getScreenCTM().inverse(), mine = this.centerX();
      const fr = { high: 0.8, middle: 0.5, low: 0.18 }[level], near = mine < r.left + r.width / 2 ? r.left + r.width * 0.1 : r.right - r.width * 0.1;
      const p = new DOMPoint(near, r.bottom - r.height * fr).matrixTransform(inv);
      return { ...toFrame(p), el };
    }
    throw new Error('[character] takeFromShelf(shelf): shelf must be null (a shelf beside the character), "left" / "right", { x, y } (the spot in the SVG root frame — set.targetPoint(rig, [x, y, z])), { at, shelf } or an element (the shelf)');
  }

  // Dáng tay tới đích `p` (khung) bằng tay `k`, quay hướng `huong`: đứng (ngả `lean` độ), kiễng chân (`lift` đơn vị) hay ngồi xổm. Với chưa tới thì
  // đổ lưng thêm / NHÍCH lại gần (tới 60 đơn vị) như `pickUp`. Trả { pose, lean, shift, mode }.
  _shelfPose50b(k, p, dir, huong, mode) {
    const s = this.s, saved = { huong: s.huong, squat42e: s.squat42e, seat: s.seat, kneel: s.kneel };
    const arm = (DAI.canhTay * this.nv.daiCanhTay + DAI.cangTay * this.nv.daiCangTay) * (this.nv.coThan || 1) * 0.97;
    let pose = null, lean = 0, shift = 0;
    try {
      if (mode === 'low') {
        Object.assign(s, { huong: dir, squat42e: 1, seat: 0, kneel: 0 });
        const g = this._floorLegGeo(), near = dir > 0 ? 'L' : 'R', back = g[near].ankle.x - g[near].hip.x;
        const fits = (deg, extra) => { const geo = this._poseGeo({ huong: dir, lean: dir * deg, step: -back + dir * extra }), sh = geo[k]; pose = this._palmTo(k, p, geo, true); return Math.hypot(p.x - sh.x, p.y - sh.y) <= arm; };
        let done = false;
        for (lean = SQUAT42E.lean * 0.6; lean <= 45 && !(done = fits(lean, 0)); lean += 3);
        if (!done) for (lean = 42, shift = 5; shift <= 60 && !fits(lean, shift); shift += 5);
        lean = Math.min(lean, 45); shift = Math.min(shift, 60);
      } else {
        Object.assign(s, { huong, squat42e: 0, seat: 0, kneel: 0 });
        const lift = mode === 'high' ? TIPTOE_LIFT50B : 0, q = { x: p.x, y: p.y + lift };
        const fits = (deg, extra) => { const geo = this._poseGeo({ huong, lean: dir * deg, step: dir * extra }), sh = geo[k]; pose = this._palmTo(k, q, geo, true); return Math.hypot(q.x - sh.x, q.y - sh.y) <= arm; };
        let done = false;
        for (lean = mode === 'high' ? 0 : 3; lean <= (mode === 'high' ? 6 : 12) && !(done = fits(lean, 0)); lean += 3);
        if (!done) for (lean = mode === 'high' ? 4 : 10, shift = 5; shift <= 60 && !fits(lean, shift); shift += 5);
        shift = Math.min(shift, 60);
        // Tầng cao, đích xa (≥ 85 % tầm tay): DUỖI THẲNG tay theo hướng vai → đích (khuỷu gập xuống thì bàn tay dừng cạnh tai — như nghe điện thoại).
        if (mode === 'high') {
          const geo = this._poseGeo({ huong, lean: dir * lean, step: dir * shift }), sh = geo[k];
          if (Math.hypot(q.x - sh.x, q.y - sh.y) >= arm * 0.85) {
            const phi = Math.atan2(q.y - sh.y, q.x - sh.x) / RAD;
            pose = { bat: (k === 'R' ? 90 - phi : phi - 90) + (k === 'R' ? 1 : -1) * dir * lean, cang: k === 'R' ? 6 : -6 };
          }
        }
      }
    } finally { Object.assign(s, saved); }
    return { pose, lean, shift, mode };
  }

  /**
   * LẤY MỘT MÓN HÀNG TRÊN KỆ: quay nghiêng về kệ `shelf`, với tay tới tầng `level` — 'high' kiễng chân với lên, 'middle' ngang ngực, 'low' ngồi xổm
   * đổ lưng —, nắm lấy món hàng `item` ('foodBag' túi hạt · 'treatBox' hộp bánh thưởng · 'can' lon pate), đưa về trước ngực, xoay nó về mặt nhãn
   * và đọc (đầu cúi nhìn, gật nhẹ), rồi GIỮ nó (thành đồ cầm ở tay ấy — sẵn cho `handOver`). `shelf`: null (khoảng không cạnh người — làm điệu bộ),
   * 'left' / 'right', { x, y } (hệ gốc của SVG — `set.targetPoint(rig, [x, y, z])`), { at, shelf }, hay phần tử kệ. `side`: tay ('auto' — tay phía
   * người xem khi đã quay về kệ). `label`: chữ trên nhãn (mặc định theo món: "Hạt cho chó", "Bánh thưởng", "Pate cho mèo").
   */
  takeFromShelf(shelf = null, { item = 'foodBag', level = 'middle', side = 'auto', label = null } = {}) {
    if (!SHOP50B[item]) throw new Error(`[character] takeFromShelf: item must be one of ${Object.keys(SHOP50B).map((k) => `'${k}'`).join(', ')}, got ${JSON.stringify(item)}`);
    if (!LEVELS50B.includes(level)) throw new Error(`[character] takeFromShelf: level must be 'high', 'middle' or 'low', got ${JSON.stringify(level)}`);
    if (side !== 'auto' && side !== 'L' && side !== 'R') throw new Error(`[character] takeFromShelf: side must be 'auto', 'L' or 'R', got ${JSON.stringify(side)}`);
    if (label !== null && !(typeof label === 'string' && label.trim() && label.length <= 18)) throw new Error(`[character] takeFromShelf: label must be a short text (up to 18 characters), got ${JSON.stringify(label)}`);
    const s = this.s, N = this.NGHI;
    if (s.lie42e > 0.5 || s.floor42e > 0.5 || s.seat > 0.5 || s.ride > 0.5) throw new Error('[character] takeFromShelf: stand up first (standUp / getOff) — the character takes things off a shelf standing');
    if (s.om >= 0.5) throw new Error('[character] takeFromShelf: the character is carrying a pet — putDown() first');
    // Tay: tầng thấp / giữa — tay phía người xem (đã quay về kệ, nó vươn ra trước thân); tầng CAO — tay phía kệ (tay kia không giơ chéo qua đầu được).
    const spot = this._shelfSpot50b(shelf, level), dir = spot.x >= HONG.x ? 1 : -1, near = (dir > 0) === (level !== 'high') ? 'L' : 'R', far = near === 'L' ? 'R' : 'L';
    // Tay: rảnh (không có đồ), hay đang cất ĐÚNG món hàng này (món rig tự cho ở lần dựng trước cũng tính) — ưu tiên tay phía người xem.
    const fits = (k) => !this.holds[k] || (this._goods50b(k) === item && (s['item' + k] <= 0.5 || this._autoGoods50b(k)));
    const k = side !== 'auto' ? side : fits(near) ? near : fits(far) ? far : null;
    if (!k) throw new Error('[character] takeFromShelf: both hands already hold something — put an item away (hideItem) or hand it over first');
    if (!fits(k)) throw new Error(`[character] takeFromShelf: hand ${k} already holds ${this._goods50b(k) ? `a ${this._goods50b(k)}` : 'another item'} — use the other hand or put it away first`);
    const o = k === 'L' ? 'R' : 'L';
    const want = label ? (c) => SHOP50B[item].draw(c, { label }) : (c) => SHOP50B[item].draw(c);
    if (!this.holds[k]) this._giveGoods50b(k, (p, colours) => want(colours), item);
    const auto = this._autoGoods50b(k);
    this.shelf50b = spot.el;
    const t = this.tl(), was = s.huong, c = this.nv.coThan || 1;
    if (auto && s['item' + k] > 0.5) t.to(s, { ['item' + k]: 0, duration: 0.01 }, 0);          // món rig tự cho, trạng thái đầu ghi nó "đang hiện": cất đi
    // Tầng: theo ĐỘ CAO THẬT của chỗ lấy so với vai / hông (một kệ thấp có tầng "high" vẫn ngang ngực) — kiễng chân, đứng với, ngồi xổm.
    const sy = this._shoulderY(), mode = spot.y < sy - 22 * c ? 'high' : spot.y > HONG.y + this.hangChan() + 36 * c ? 'low' : 'middle';
    const turn = dir * (mode === 'low' ? 1 : mode === 'high' ? 0.45 : 0.72);
    const reach = this._shelfPose50b(k, spot, dir, turn, mode);
    const ready = this._shelfPose50b(k, { x: spot.x - dir * 16 * c, y: spot.y + (mode === 'high' ? 10 : 6) * c }, dir, turn, mode);
    const free = !(this.holds[o] && s['item' + o] > 0.5);
    // 1. Quay về kệ, mắt tìm tầng hàng; tay với ra (xoè), kiễng chân / ngồi xổm.
    t.to(s, { huong: turn, ['carry' + k]: 0, cuoi: 0.6, mayL: 0.35, mayR: 0.35, duration: 0.4, ease: 'power2.inOut' }, 0);
    this._lookTo(t, spot, 0.05, { d: 0.45, huong: turn, up: 1.2 });
    t.to(s, { ['aim' + k]: 1, duration: 0.3, ease: 'sine.inOut' }, 0.2);
    t.set(s, { ['tay' + k]: 'xoe', ['spin50b' + k]: 1 }, 0.3);
    if (reach.shift) t.to(s, { x: s.x + dir * reach.shift, duration: 0.45, ease: 'sine.inOut' }, 0.05);
    const body = mode === 'high' ? { tiptoe50b: 1, lift42d: TIPTOE_LIFT50B, than: N.than + dir * reach.lean } : mode === 'low' ? { squat42e: 1, than: N.than + dir * reach.lean, dau: N.dau - dir * reach.lean * 0.45, dauY: 6 } : { than: N.than + dir * reach.lean };
    if (mode === 'low' && free) { t.to(s, { ['aim' + o]: 1, duration: 0.3, ease: 'sine.inOut' }, 0.3); t.set(s, { ['tay' + o]: 'mo' }, 0.32); }
    const hang = -dir * (18 + reach.lean), otherArm = mode === 'low' && free ? { ['bat' + o]: o === 'L' ? hang : -hang, ['cang' + o]: o === 'L' ? -12 * dir : 12 * dir } : {};
    t.to(s, { ...body, ...otherArm, ['bat' + k]: ready.pose.bat, ['cang' + k]: ready.pose.cang, duration: 0.55, ease: 'power2.inOut' }, 0.3);
    t.to(s, { ['bat' + k]: reach.pose.bat, ['cang' + k]: reach.pose.cang, duration: 0.25, ease: 'power2.out' }, 0.85);
    // 2. NẮM LẤY: bàn tay khép, món hàng vào tay (tween rất ngắn, không `set` đúng mốc — như `pickUp`), kéo ra khỏi kệ một chút.
    const G = 1.12;
    t.set(s, { ['tay' + k]: 'nam' }, G - 0.02);
    t.to(s, { ['item' + k]: 1, duration: 0.08 }, G);
    t.to(s, { ['bat' + k]: ready.pose.bat, ['cang' + k]: ready.pose.cang, duration: 0.3, ease: 'power2.inOut' }, G + 0.12);
    // 3. Đưa về trước ngực, đứng thẳng lại / hạ gót; quay nửa về người xem — món hàng phóng to một chút cho đọc được.
    const B = G + 0.42, hold = { x: HONG.x + dir * 30 * c, y: sy + 36 * c - (ITEM_DY50B[item] > 0 ? 12 : 0) * c };
    const front = dir * 0.3, rd = this._palmTo(k, hold, this._poseGeo({ huong: front }), true);
    t.to(s, { tiptoe50b: 0, lift42d: 0, squat42e: 0, than: N.than, dau: N.dau, dauY: 0, huong: front, ['bat' + k]: rd.bat, ['cang' + k]: rd.cang, ['itemZoom' + k]: 1.35, ['itemTilt' + k]: -24,
              ...(mode === 'low' && free ? { ['aim' + o]: 0, ['bat' + o]: N['bat' + o], ['cang' + o]: N['cang' + o] } : {}), duration: 0.6, ease: 'power2.inOut' }, B);
    const look = { x: hold.x, y: hold.y + ITEM_DY50B[item] * 0.6 * c };
    this._lookTo(t, look, B + 0.15, { d: 0.45, huong: front });
    // 4. XOAY món hàng về mặt nhãn (mặt sau → mặt trước ở nửa chừng), đọc: mày nhướn, gật nhẹ, cười.
    const R = B + 0.65;
    t.to(s, { ['itemTilt' + k]: 0, duration: 0.4, ease: 'sine.inOut' }, R);
    t.to(s, { ['spin50b' + k]: 0, duration: 0.02 }, R + 0.18);
    t.to(s, { mayL: 0.6, mayR: 0.6, cuoi: 0.85, duration: 0.3 }, R + 0.3);
    t.to(s, { headPitch: s.headPitch + 0.35, duration: 0.2, ease: 'sine.inOut', yoyo: true, repeat: 1 }, R + 0.75);
    // 5. Hạ món hàng về dáng cầm, quay về hướng cũ.
    this._khep(t, 0.5, R + 1.3, { ['item' + k]: 1, huong: was });
    return t;
  }

  /**
   * QUÉT MÃ VẠCH một món hàng: máy quét cầm tay hiện trong một tay, chĩa vào món hàng — TIA ĐỎ loe ra, vạch quét đỏ nằm ngang trên món hàng, "BÍP"
   * (ô kính loé xanh, hai cung âm thanh) và thẻ giá bật lên; rồi `put`: 'down' (đặt xuống quầy — mặc định), 'keep' (giữ lại, để `handOver` trả khách),
   * 'bag' (bỏ vào túi đang cất ở tay cầm máy — túi hiện ra, sẵn cho `handOverBag`). `item`: bỏ trống — món hàng đang cầm ở tay kia; một NGƯỜI (rig /
   * mỏ neo) — vươn tay nhận món hàng họ đang cầm (họ làm `handOver(this)` cùng nhịp: món hàng sang tay lúc 0,62 s); hay chỗ món hàng nằm trên quầy
   * ({ x, y } hệ gốc của SVG, hay phần tử). `hold`: giây tia đỏ rà (0,4…4). `price`: chữ trên thẻ giá (mặc định giá giả theo món).
   */
  scanBarcode(item = null, { hold = 1.2, put = 'down', price = null, side = 'auto' } = {}) {
    if (!(Number.isFinite(hold) && hold >= 0.4 && hold <= 4)) throw new Error(`[character] scanBarcode: hold must be 0.4…4 seconds, got ${JSON.stringify(hold)}`);
    if (!PUTS50B.includes(put)) throw new Error(`[character] scanBarcode: put must be 'down', 'keep' or 'bag', got ${JSON.stringify(put)}`);
    if (price !== null && !(typeof price === 'string' && price.trim() && price.length <= 14)) throw new Error(`[character] scanBarcode: price must be a short text (up to 14 characters) such as '125.000đ', got ${JSON.stringify(price)}`);
    if (side !== 'auto' && side !== 'L' && side !== 'R') throw new Error(`[character] scanBarcode: side must be 'auto', 'L' or 'R' (the hand with the product), got ${JSON.stringify(side)}`);
    const s = this.s, N = this.NGHI, c = this.nv.coThan || 1;
    if (s.om >= 0.5) throw new Error('[character] scanBarcode: the character is carrying a pet — putDown() first (one hand holds the scanner, the other the product)');
    const other = item && item.live ? item.live : item, person = other instanceof RigSVG && other !== this ? other : null;
    if (other === this) throw new Error('[character] scanBarcode(item): item must be another person (a customer handing the product over), not the same character');
    const showing = (k) => this.holds[k] && s['item' + k] > 0.5 && !this._autoGoods50b(k);
    let k, kind, dir, lying = null;
    if (person) {
      // Món hàng của KHÁCH: tay nào của họ có món hàng (đang hiện thì hơn); thu ngân nhận bằng tay phía họ (tay ấy rảnh, hay đang cất đúng món ấy).
      const theirs = ['R', 'L'].filter((q) => person.holds[q] && person._goods50b && person._goods50b(q));
      const q = theirs.find((h) => person.s['item' + h] > 0.5) || theirs[0];
      if (!q) throw new Error('[character] scanBarcode(customer): the customer holds no product — they take one first (takeFromShelf), or give them items: { R: "foodBag" }');
      kind = person._goods50b(q); dir = this._towards(item, 'R');
      const own = dir > 0 ? 'R' : 'L', fits = (h) => !this.holds[h] || (this._goods50b(h) === kind && !showing(h));
      k = side !== 'auto' ? side : fits(own) ? own : fits(own === 'R' ? 'L' : 'R') ? (own === 'R' ? 'L' : 'R') : null;
      if (!k || !fits(k)) throw new Error('[character] scanBarcode(customer): no free hand to take the product with — put the other item away (hideItem) first');
      if (!this.holds[k]) this._giveGoods50b(k, person.nv['heldItem' + q], kind);
    } else if (item === null || item === undefined) {
      const mine = ['R', 'L'].filter((h) => this.holds[h] && s['item' + h] > 0.5 && this._goods50b(h));
      k = side !== 'auto' ? side : mine[0];
      if (!k || !mine.includes(k)) throw new Error('[character] scanBarcode: the character holds no product' + (side === 'auto' ? '' : ` in hand ${side}`) + ' — take one first (takeFromShelf), pass the customer who hands it over, or the spot of a product on the counter');
      kind = this._goods50b(k); dir = k === 'R' ? 1 : -1;
    } else {
      // Món hàng NẰM trên quầy: điểm (hệ gốc) hay phần tử; máy quét trong tay phía nó.
      const toFrame = (p) => ({ x: p.x - (s.x || 0), y: p.y - (s.y || 0) - DOI_Y });
      if (typeof item.x === 'number' && typeof item.y === 'number' && !item.getBoundingClientRect) lying = toFrame(item);
      else if (item.getBoundingClientRect) { const r = item.getBoundingClientRect(), p = new DOMPoint(r.left + r.width / 2, r.top + r.height * 0.45).matrixTransform(this.svg.getScreenCTM().inverse()); lying = toFrame(p); }
      else throw new Error('[character] scanBarcode(item): item must be null (the product in the other hand), a person (the customer hands it over), { x, y } or an element (a product on the counter)');
      if (put === 'bag') throw new Error("[character] scanBarcode: put 'bag' needs the product in hand — a product lying on the counter stays there");
      dir = lying.x >= HONG.x ? 1 : -1; kind = null;
    }
    const o = lying ? (side !== 'auto' ? side : dir > 0 ? 'R' : 'L') : k === 'L' ? 'R' : 'L';
    // Tay cầm máy quét đang cầm một món khác (cốc…): cất nó đi lúc bắt đầu, lấy ra lại lúc xong (như `_stowBoth`).
    const stash = put !== 'bag' && this.holds[o] && s['item' + o] > 0.5 && !this._autoGoods50b(o);
    const bag = put === 'bag' ? this.holds[o] && this.el['item' + o].querySelector('[data-bag]') : null;
    if (put === 'bag' && !bag) throw new Error(`[character] scanBarcode: put 'bag' needs a put-away bag in hand ${o} (the scanner hand) — createCharacter(host, { id, items: { ${o}: "bag" }, itemsHidden: ["${o}"] })`);
    const t = this.tl(), was = s.huong, auto = k && this._autoGoods50b(k);
    if (stash) t.to(s, { ['item' + o]: 0, ['carry' + o]: 0, duration: 0.15 }, 0);
    if (auto && s['item' + k] > 0.5) t.to(s, { ['item' + k]: 0, duration: 0.01 }, 0);
    if (this._autoGoods50b(o) && s['item' + o] > 0.5) t.to(s, { ['item' + o]: 0, duration: 0.01 }, 0);
    // 1. Có khách đưa: vươn tay nhận (như `take`) — món hàng vào tay lúc HANDOFF50B.
    let A = 0.1;
    if (person) {
      this._stage(t, [k]);
      t.set(s, { ['tay' + k]: 'mo', ['carry' + k]: 0, ['spin50b' + k]: 1 }, 0);
      this._reach(t, k, dir, 0.12, item);
      t.set(s, { ['tay' + k]: 'nam' }, RigSVG.HANDOFF50B);
      t.to(s, { ['item' + k]: 1, duration: 0.15 }, RigSVG.HANDOFF50B);
      A = 0.88;
    }
    // 2. Đưa món hàng ra trước ngực (mặt mã vạch về phía máy quét), máy quét hiện trong tay kia, chĩa vào món hàng.
    // Gần như nhìn thẳng (quay ≤ 0,08): quay 3/4 thì một trong hai tay là tay XA, vẽ sau thân — món hàng hay máy quét khuất sau người.
    const front = clamp(dir * 0.08, -0.08, 0.08), geo = this._poseGeo({ huong: front }), hs = (h) => this._handScale50b(h);
    const sy = this._shoulderY(), dy = kind ? ITEM_DY50B[kind] : 0;
    const target = lying || { x: HONG.x + dir * 34 * c, y: sy + 30 * c };            // tâm món hàng: ngang ngực trên — cao hơn mặt quầy và máy tính tiền
    const palmK = lying ? null : { x: target.x, y: target.y - dy * hs(k) };
    const palmO = { x: target.x - dir * 48 * c, y: target.y + 10 * c };
    const pk = palmK && this._palmTo(k, palmK, geo, true), po = this._palmTo(o, palmO, geo, true);
    // Góc máy quét trong tay (quanh lòng bàn tay, góc trên màn hình): mũi máy chĩa từ lòng bàn tay tới tâm món hàng.
    const arm = this._armTo(o, palmO.x, palmO.y, geo[o].x, geo[o].y), aimDeg = Math.atan2(target.y - palmO.y, target.x - palmO.x) / RAD;
    const spin = chuanHoaGoc(aimDeg - arm.dir), beam = Math.max(4, Math.hypot(target.x - palmO.x, target.y - palmO.y) / hs(o) - (SCANNER_WINDOW50B + 1.4 - 10));
    if (!person) this._stage(t, [o, ...(k && !lying ? [k] : [])], A - 0.1);
    else this._stage(t, [o], A - 0.1);
    t.to(s, { huong: front, ['carry' + o]: 0, ...(pk ? { ['carry' + k]: 0, ['bat' + k]: pk.bat, ['cang' + k]: pk.cang, ['itemTilt' + k]: dir * 8, ['spin50b' + k]: 1 } : {}),
              ['bat' + o]: po.bat, ['cang' + o]: po.cang, ['gadgetTurn' + o]: spin, cuoi: 0.6, duration: 0.5, ease: 'power2.inOut' }, A);
    t.set(s, { ['gadget' + o]: 50, ['tay' + o]: 'nam' }, A + 0.05);
    this._lookTo(t, target, A + 0.05, { d: 0.45, huong: front });
    // 3. RÀ: tia đỏ bật, vạch quét trên món hàng; máy rung nhẹ; "BÍP" — ô kính loé xanh, thẻ giá bật lên (lệch về phía khách, thấp — không che mặt ai).
    const S0 = A + 0.55, beep = S0 + Math.min(RigSVG.SCAN_BEEP50B, hold * 0.6), off = S0 + hold;
    t.to(s, { ['beam50b' + o]: beam, duration: 0.08 }, S0);
    t.fromTo(s, { scanT50b: 0 }, { scanT50b: hold + 0.6, duration: hold + 0.6, ease: 'none' }, S0);
    for (let a = S0 + 0.1; a + 0.24 <= off; a += 0.24) t.to(s, { ['gadgetTurn' + o]: spin + (Math.round((a - S0) / 0.24) % 2 ? -2.5 : 2.5), duration: 0.12, ease: 'sine.inOut', yoyo: true, repeat: 1 }, a);
    t.to(s, { beep50b: 1, duration: 0.06 }, beep);
    t.to(s, { beep50b: 0, duration: 0.08 }, beep + 0.6);
    const text = price || (kind ? SHOP50B[kind].price : '35.000đ'), w = Math.max(116, Math.round(text.length * 13 + 26));
    const card = { x: HONG.x - dir * 86 * c, y: sy + 4 * c };          // thẻ giá phía KIA người (phía máy quét), ngang vai: không che mặt khách, không che món hàng
    t.to(s, { readoutN: this._reading({ text, x: card.x + (s.x || 0), y: card.y + (s.y || 0) + DOI_Y, w }), duration: 0.02 }, beep - 0.04);
    t.to(s, { readout: 1, duration: 0.3, ease: 'back.out(1.8)' }, beep);
    t.to(s, { cuoi: 1, mayL: 0.55, mayR: 0.55, duration: 0.25 }, beep + 0.1);
    t.to(s, { ['beam50b' + o]: 0, duration: 0.06 }, off);
    t.to(s, { readout: 0, duration: 0.25, ease: 'power2.in' }, Math.max(off, beep + 1.1));
    // 4. Cất máy quét; món hàng: đặt xuống quầy / giữ lại / bỏ vào túi.
    const P = off + 0.12;
    t.to(s, { ['bat' + o]: N['bat' + o], ['cang' + o]: N['cang' + o], ['aim' + o]: 0, duration: 0.4, ease: 'power2.inOut' }, P);
    t.set(s, { ['gadget' + o]: 0, ['gadgetTurn' + o]: 0, ['tay' + o]: 'mo' }, P + 0.2);
    const keep = {};
    let end = P + 0.45;
    if (k && put === 'down') {
      const down = this._palmTo(k, { x: target.x + dir * 6 * c, y: target.y + 40 * c - Math.max(0, dy) * hs(k) * 0.5 }, geo, true);
      t.to(s, { ['bat' + k]: down.bat, ['cang' + k]: down.cang, ['itemTilt' + k]: 0, dauY: 4, duration: 0.45, ease: 'power2.inOut' }, P);
      t.to(s, { ['item' + k]: 0, duration: 0.12 }, P + 0.45);
      t.set(s, { ['tay' + k]: 'mo' }, P + 0.5);
      keep['item' + k] = 0; end = P + 0.6;
    } else if (k && put === 'bag') {
      // Túi hiện ra ở tay cầm máy (thấp, trước bụng); món hàng hạ vào miệng túi rồi khuất trong túi.
      const mouth = { x: HONG.x - dir * 6 * c, y: sy + 70 * c }, holdBag = this._palmTo(o, { x: mouth.x - dir * 4 * c, y: mouth.y - 6 * c }, geo, true);
      t.set(s, { ['tay' + o]: 'nam' }, P + 0.2);
      t.to(s, { ['item' + o]: 1, duration: 0.15 }, P + 0.25);
      t.to(s, { ['aim' + o]: 1, ['bat' + o]: holdBag.bat, ['cang' + o]: holdBag.cang, duration: 0.35, ease: 'power2.out' }, P + 0.25);
      const drop = this._palmTo(k, { x: mouth.x, y: mouth.y - 16 * c - Math.max(0, dy) * hs(k) * 0.4 }, geo, true);
      t.to(s, { ['bat' + k]: drop.bat, ['cang' + k]: drop.cang, ['itemTilt' + k]: 0, dauY: 5, duration: 0.45, ease: 'power2.inOut' }, P + 0.3);
      t.to(s, { ['item' + k]: 0, duration: 0.12 }, P + 0.78);
      t.set(s, { ['tay' + k]: 'mo' }, P + 0.82);
      keep['item' + k] = 0; keep['item' + o] = 1; end = P + 0.95;
    } else if (k) keep['item' + k] = 1;
    if (stash) { keep['item' + o] = 1; t.set(s, { ['tay' + o]: 'nam' }, end); }
    this._khep(t, 0.5, end, { ...keep, huong: was, spin50bL: 0, spin50bR: 0 });
    return t;
  }
});
