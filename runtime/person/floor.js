// runtime/person/floor.js — on the floor: pick up, sit on the floor, lie down (leg IK, floor poses).
// Methods of `RigSVG`, installed by runtime/rig-svg.js: `this` is the rig, `RigSVG` its class.

import { KHUNG, DOI_Y, HONG, DAI, CHOT_VAI, RIDE_THIGH, RIDE_KNEE, RIDE_LEAN, FLOOR42E, SQUAT42E, LIE42E, KNEEL_SHIN, clamp, chuanHoaGoc, RAD, mix } from './shared.js';
import { toy42e, bowl42e, leash, toyShape42e, bowlShape42e } from '../parts.js';

export default (RigSVG) => mix(RigSVG, class {
  // Góc cộng thêm vào khớp chân (độ), theo đúng quy ước vẽ chân của `apDung`: `joint` 'dui' (đùi) | 'ong' (ống chân so với đùi).
  _floorLegAdd(ben, joint, h) {
    const s = this.s, fl = clamp(s.floor42e || 0, 0, 1), sq = clamp(s.squat42e || 0, 0, 1), L = clamp(s.lie42e || 0, 0, 1);
    if (!fl && !sq && !L) return 0;
    const ah = Math.min(1, Math.abs(h)), dauH = Math.sign(h || 1), side = ben === 'L' ? 1 : -1, near = ben === (h >= 0 ? 'L' : 'R');
    // Ngồi bệt mà QUAY 3/4 (nhìn con vật cạnh mình): chân vẫn xếp bằng như nhìn thẳng — chỉ thân trên quay; dáng chân nhìn nghiêng chỉ khi quay hẳn.
    const F = FLOOR42E, Q = this._squatAngles(), ahF = clamp((ah - 0.7) / 0.3, 0, 1);
    // Nằm nghiêng: chân PHÍA TRÊN (phía không chạm sàn) co gối nhẹ ra trước, chân dưới duỗi — dáng nằm thả lỏng, không đơ như khúc gỗ.
    const top = L * (1 - fl) * (ben === (s.lieDir42e < 0 ? 'R' : 'L') ? 1 : 0), towards = s.lieDir42e < 0 ? 1 : -1;
    if (joint === 'dui') return fl * ((1 - ahF) * side * F.thigh - ahF * dauH * F.thighSide * (near ? 1 : 0.9)) - sq * dauH * (near ? Q.thigh : Q.farThigh) + top * towards * 14;
    return fl * (-(1 - ahF) * side * F.knee + ahF * dauH * F.kneeSide) + sq * dauH * (near ? Q.knee : Q.farKnee) - top * towards * 26;
  }

  // Ngồi xổm: góc đùi / gối của chân gần và chân xa. Chân xa đùi thấp hơn 6° (hai chân khỏi chồng khít), gối gập sao cho cổ chân vẫn ngang sàn.
  _squatAngles() {
    const nv = this.nv, S = SQUAT42E, far = S.thigh - 6, r = (nv.daiDui || 1) / (nv.daiOng || 1);
    const c = clamp(Math.cos((S.knee - S.thigh) * RAD) + r * (Math.cos(S.thigh * RAD) - Math.cos(far * RAD)), -1, 1);
    return { thigh: S.thigh, knee: S.knee, farThigh: far, farKnee: Math.acos(c) / RAD + far };
  }

  // Đùi rút ngắn thêm khi ngồi bệt nhìn thẳng (đùi chĩa cả về phía người xem).
  _floorSeen(ah) { return 1 - FLOOR42E.seen * clamp(this.s.floor42e || 0, 0, 1) * (1 - clamp((ah - 0.7) / 0.3, 0, 1)); }

  // Bàn chân lúc ngồi bệt / ngồi xổm: { side: độ hiện giày nhìn nghiêng, flat: mức áp đế xuống sàn, turn: góc xoay để đế nằm ngang, mirror }.
  _floorFoot(ben, h, dui, ong) {
    const s = this.s, fl = clamp(s.floor42e || 0, 0, 1), sq = clamp(s.squat42e || 0, 0, 1);
    if (!fl && !sq) return null;
    const ah = Math.min(1, Math.abs(h)), front = fl * (1 - clamp((ah - 0.7) / 0.3, 0, 1));
    return { side: Math.max(ah, fl), flat: Math.max(fl, sq), turn: -(dui + ong), mirror: front > 0.5 ? (ben === 'L' ? 1 : -1) : (h < 0 ? -1 : 1) };
  }

  // HÌNH HỌC HAI CHÂN ở trạng thái hiện tại (chép đúng phép vẽ chân của `apDung`): hông, gối, cổ chân trong hệ nhóm chân (`chanG`, trước phép co
  // dọc `coChan`), và góc ống chân (rad).
  _floorLegGeo(h = this.s.huong) {
    const s = this.s, nv = this.nv, ah = Math.abs(h), dauH = Math.sign(h || 1), ride = clamp(s.ride || 0, 0, 1);
    const seat = clamp(s.seat, 0, 1), kneel = clamp(s.kneel || 0, 0, 1);
    const splay = RigSVG.SEAT_SPLAY * seat * (1 - ah) * (1 - seat * clamp(ah / 0.2, 0, 1) * (1 - kneel));
    const sitFold = -Math.sign(h) * 75 * seat * clamp(ah / 0.2, 0, 1) * (1 - kneel);
    const seen = (1 - seat * 0.72) / Math.cos(splay * RAD) / Math.cos(sitFold * RAD) * this._floorSeen(ah);
    const shift = Math.sign(h) * Math.sin(Math.PI * Math.min(1, ah) * 0.9) * 3, Lt = DAI.dui * nv.daiDui, Ls = DAI.ong * nv.daiOng, out = {};
    for (const ben of ['L', 'R']) {
      const sign = ben === 'L' ? 1 : -1, near = ben === (h >= 0 ? 'L' : 'R');
      const dui = s['dui' + ben] - dauH * ride * (near ? RIDE_THIGH : RIDE_THIGH - 6) + this._floorLegAdd(ben, 'dui', h);
      const ong = s['ong' + ben] + dauH * ride * RIDE_KNEE + this._floorLegAdd(ben, 'ong', h);
      const a = (dui + sign * (s['nhac' + ben] * 6 + splay) + sitFold) * RAD, b = (ong - sign * splay - sitFold) * RAD;
      const lift = 1 - s['nhac' + ben] * 0.42, hx = -sign * (nv.cachChan * (1 - ah * 0.7) + ah * 3) + shift;
      const knee = { x: hx - Math.sin(a) * Lt * lift * seen, y: Math.cos(a) * Lt * lift * seen };
      const vx = -Math.sin(b) * Ls, vy = Math.cos(b) * Ls * lift * (1 - KNEEL_SHIN * kneel);
      out[ben] = { hip: { x: hx, y: 0 }, knee, ankle: { x: knee.x + vx * Math.cos(a) - vy * Math.sin(a), y: knee.y + vx * Math.sin(a) + vy * Math.cos(a) }, shin: a + b };
    }
    return out;
  }

  // Đáy chân (đơn vị nhóm chân, dưới hông): thấp nhất trong gối và cổ chân + đế giày (ống chân nằm ngang thì là mép ống quần).
  _floorLegLow(g) {
    const nv = this.nv, foot = 10 * nv.coBanChan;
    let low = 0;
    for (const leg of [g.L, g.R]) {
      const c = Math.abs(Math.cos(leg.shin));
      low = Math.max(low, leg.knee.y + 8 * nv.dayChan, leg.ankle.y + foot * c + 11 * nv.dayChan * (1 - c));
    }
    return low;
  }

  // Người HẠ bao nhiêu (đơn vị khung) để chỗ thấp nhất của hai chân chạm đúng sàn — dùng cho ngồi bệt / ngồi xổm (thay công thức của `seat`).
  _floorContactDrop() {
    const nv = this.nv, standing = DAI.dui * nv.daiDui + DAI.ong * nv.daiOng + 10 * nv.coBanChan;
    return Math.max(0, standing - this._floorLegLow(this._floorLegGeo())) * nv.coChan;
  }

  // Điểm trong hệ THÂN (than) → hệ của `goc` (trước phép xoay lúc nằm).
  _fromTorso(p) {
    const s = this.s, nv = this.nv, h = s.huong, wide = clamp(nv.torsoWidth || 1, 0.7, 1.6), stoop = clamp(nv.stoop || 0, 0, 1);
    const a = (s.than + h * stoop * 10 + Math.sign(h || 1) * clamp(s.ride || 0, 0, 1) * RIDE_LEAN) * RAD, x = p.x * nv.coThan * wide, y = p.y * nv.coThan * (1 - stoop * 0.05);
    return { x: HONG.x + x * Math.cos(a) - y * Math.sin(a), y: HONG.y + x * Math.sin(a) + y * Math.cos(a) };
  }
  _toTorso(p) {
    const s = this.s, nv = this.nv, h = s.huong, wide = clamp(nv.torsoWidth || 1, 0.7, 1.6), stoop = clamp(nv.stoop || 0, 0, 1);
    const a = -(s.than + h * stoop * 10 + Math.sign(h || 1) * clamp(s.ride || 0, 0, 1) * RIDE_LEAN) * RAD, dx = p.x - HONG.x, dy = p.y - HONG.y;
    return { x: (dx * Math.cos(a) - dy * Math.sin(a)) / (nv.coThan * wide), y: (dx * Math.sin(a) + dy * Math.cos(a)) / (nv.coThan * (1 - stoop * 0.05)) };
  }

  // Hai đốt tay từ `from` tới `to` (hệ thân): góc xoay của nhóm cánh tay (độ; dương = bàn tay về phía −x) và cẳng tay; khuỷu bẻ về phía `out` (±1 theo x).
  _floorIk(from, to, out) {
    const a = DAI.canhTay * this.nv.daiCanhTay, b = DAI.cangTay * this.nv.daiCangTay, dx = to.x - from.x, dy = to.y - from.y;
    const d = clamp(Math.hypot(dx, dy), Math.abs(a - b) + 0.5, a + b - 0.5), dir = Math.atan2(-dx, dy);
    const alpha = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1)), up = dir - out * alpha;
    const elbow = { x: from.x - a * Math.sin(up), y: from.y + a * Math.cos(up) };
    const fore = Math.hypot(dx, dy) > a + b - 0.5 ? up : Math.atan2(-(to.x - elbow.x), to.y - elbow.y);
    return { upper: up / RAD, fore: chuanHoaGoc((fore - up) / RAD), elbow, wrist: { x: elbow.x - b * Math.sin(fore), y: elbow.y + b * Math.cos(fore) } };
  }

  // Tâm đầu và bán kính trong hệ thân (theo `shotBox`: tâm mặt ở 0, −62 của nhóm đầu).
  _headTorso() {
    const s = this.s, nv = this.nv, stoop = clamp(nv.stoop || 0, 0, 1), wide = clamp(nv.torsoWidth || 1, 0.7, 1.6);
    return { x: s.dauX + s.huong * (2.5 + stoop * 7), y: -103 + nv.dauLech + s.dauY + stoop * 9 - 62 * nv.coDau, rx: 64 * nv.coDau / wide, ry: 64 * nv.coDau };
  }

  // Tay KÊ DƯỚI ĐẦU lúc nằm: tay phía mặt sàn (đầu về trái → tay trái màn hình). Không nằm: null.
  _pillowArm() { return this.s.lie42e > 0.5 ? (this.s.lieDir42e < 0 ? 'L' : 'R') : null; }

  // Dáng tay kê đầu (hệ thân): bắp tay giơ dọc bên đầu phía sàn, cẳng tay gập vào dưới đầu — đầu tựa lên cẳng tay.
  _pillowPose(k) {
    const hd = this._headTorso(), out = k === 'L' ? -1 : 1, from = { x: out * CHOT_VAI.x, y: CHOT_VAI.y };
    return this._floorIk(from, { x: hd.x + out * hd.rx * 0.85, y: hd.y - hd.ry * 1.3 }, out);
  }

  // Tay ở thế sát sàn (gọi trong `apDung`, sau mọi luật chỉnh góc tay): ngồi bệt — hai bàn tay úp lên hai đầu gối; nằm — tay phía sàn kê dưới đầu.
  // Tay đang diễn thì nhả dần: bắp tay giơ lệch dáng nghỉ quá 40° (vẫy, chỉ), `aim` (vuốt ve, bế), `ov`, áp điện thoại, đang bế, đang cầm đồ.
  _floorArms(rotation, pivot, nhacY, cradle) {
    const s = this.s, fl = clamp(s.floor42e || 0, 0, 1), L = clamp(s.lie42e || 0, 0, 1);
    if (!fl && !L) return null;
    const free = (side) => clamp(1 - (Math.abs(s['bat' + side] - this._restArm(side)[0]) - 40) / 40, 0, 1) * (1 - clamp(s['ov' + side], 0, 1)) * (1 - clamp(s['aim' + side], 0, 1))
      * (1 - clamp(s['phone' + side], 0, 1)) * (1 - cradle) * (this.holds[side] && s['item' + side] > 0.5 ? 0 : 1);
    let legs = null;
    for (const side of ['L', 'R']) {
      const out = side === 'L' ? -1 : 1, from = { x: pivot[side].x, y: pivot[side].y + nhacY };
      let w = 0, pose = null;
      if (fl > 0.001 && L < 0.999) {
        // Đầu gối CÙNG PHÍA (hệ nhóm chân → hệ `goc` → hệ thân), bàn tay úp lên mặt trên của nó.
        legs = legs || this._floorLegGeo();
        const knee = legs[side].knee, nv = this.nv, at = { x: HONG.x + knee.x - out * 3, y: HONG.y + (knee.y - 12 * nv.dayChan) * nv.coChan };
        pose = this._floorIk(from, this._toTorso(at), out); w = fl * (1 - L) * free(side);
      }
      if (L > 0.001 && side === (s.lieDir42e < 0 ? 'L' : 'R')) { pose = this._pillowPose(side); w = L * free(side); }
      if (!pose || w <= 0) continue;
      rotation['bat' + side] += (pose.upper - rotation['bat' + side]) * w;
      rotation['cang' + side] += (chuanHoaGoc(pose.fore) - rotation['cang' + side]) * w;
    }
    return null;
  }

  // NẰM: góc xoay, các điểm mốc của thân (hệ `goc`, đã xoay) và phần hạ / dời để chỗ thấp nhất nằm trên mặt sàn (`lieLift42e` cao hơn sàn).
  _floorLay(seatDrop, doiChan) {
    const s = this.s, nv = this.nv, L = clamp(s.lie42e || 0, 0, 1), dir = s.lieDir42e < 0 ? -1 : 1;
    const angle = dir * (90 - LIE42E.tilt) * L, c = Math.cos(angle * RAD), n = Math.sin(angle * RAD);
    const turn = (p) => ({ x: HONG.x + (p.x - HONG.x) * c - (p.y - HONG.y) * n, y: HONG.y + (p.x - HONG.x) * n + (p.y - HONG.y) * c });
    const legs = this._floorLegGeo(), pts = [];
    const leg = (p, r) => pts.push({ ...turn({ x: HONG.x + p.x, y: HONG.y + p.y * nv.coChan }), r: r * nv.coChan });
    for (const side of ['L', 'R']) { const g = legs[side]; leg(g.knee, 13 * nv.dayChan); leg(g.ankle, 12 * nv.dayChan); leg({ x: g.hip.x - (side === 'L' ? 1 : -1) * 13 * nv.dayChan, y: 0 }, 0); }
    for (const q of [{ x: -36, y: -88 }, { x: 36, y: -88 }, { x: -31, y: -30 }, { x: 31, y: -30 }, { x: -30, y: 18 }, { x: 30, y: 18 }]) pts.push({ ...turn(this._fromTorso(q)), r: 0 });
    const hd = this._headTorso(), head = { ...turn(this._fromTorso(hd)), r: hd.ry * nv.coThan * 0.94 };
    pts.push(head);
    const k = this._pillowArm();
    if (k) { const pose = this._pillowPose(k); for (const q of [pose.elbow, pose.wrist]) pts.push({ ...turn(this._fromTorso(q)), r: 10 * nv.dayTay * nv.coThan }); }
    const low = Math.max(...pts.map((p) => p.y + p.r)), x0 = Math.min(...pts.map((p) => p.x - p.r)), x1 = Math.max(...pts.map((p) => p.x + p.r));
    const floor = 428 - doiChan - (s.lieLift42e || 0), blend = clamp(L * 2.5, 0, 1);
    // Hạ: từ phần hạ thường lệ (đứng / quỳ) sang phần hạ cho chỗ thấp nhất chạm mặt nằm; dời ngang: giữa thân về chỗ đứng.
    const dy = (floor - low - seatDrop) * blend, dx = (HONG.x - (x0 + x1) / 2) * blend;
    return { angle, dx, dy, blend, pts, head, low, floor, span: [x0, x1], turn };
  }

  // Phép biến đổi của `goc` lúc ngồi xổm / nằm (null: như thường). Ghi lại hình học nằm (`this.lay42e`, khung gốc) cho bóng, gối, khung ngắm.
  _floorGoc(seatDrop, doiChan) {
    const s = this.s, sq = clamp(s.squat42e || 0, 0, 1), L = clamp(s.lie42e || 0, 0, 1);
    this.lay42e = null;
    if (!sq && !L) return null;
    let x = s.x, y = s.y + seatDrop + DOI_Y + doiChan, rot = '', blend = 0;
    if (sq) { const g = this._floorLegGeo(), near = s.huong >= 0 ? 'L' : 'R'; x -= g[near].ankle.x - g[near].hip.x; }
    if (L) {
      const lay = this._floorLay(seatDrop, doiChan), co = s.co;
      x += lay.dx; y += lay.dy; rot = ` rotate(${lay.angle.toFixed(3)} ${HONG.x} ${HONG.y})`; blend = lay.blend;
      const root = (p) => ({ x: x + 200 + co * (p.x - 200), y: y + 428 + co * (p.y - 428) });
      this.lay42e = { ...lay, root, head: { ...root(lay.head), r: lay.head.r * co }, floorY: root({ x: 0, y: lay.floor }).y, x0: root({ x: lay.span[0], y: 0 }).x, x1: root({ x: lay.span[1], y: 0 }).x,
                      hip: root(lay.turn({ x: HONG.x, y: HONG.y })), pts: lay.pts.map((p) => ({ ...root(p), r: p.r * co })) };
    }
    return { transform: `translate(${x} ${y}) translate(200 428) scale(${s.co}) translate(-200 -428)${rot}`, blend };
  }

  // Vẽ thêm (cuối `apDung`): bóng dài và gối dưới người nằm; các món đồ còn nằm dưới sàn chờ nhặt (hay ẩn đạo cụ đã được nhặt lên).
  _drawFloor() {
    const e = this.el, s = this.s, lay = this.lay42e;
    if (e.under42e) {
      e.under42e.style.display = lay && lay.blend > 0.01 ? '' : 'none';
      if (lay && lay.blend > 0.01) {
        const [shadow, pillow] = e.under42e.children, len = lay.x1 - lay.x0, hd = lay.head;
        shadow.setAttribute('cx', ((lay.x0 + lay.x1) / 2).toFixed(2)); shadow.setAttribute('cy', (lay.floorY + 1.5).toFixed(2));
        shadow.setAttribute('rx', (len * 0.5).toFixed(2)); shadow.setAttribute('ry', '8'); shadow.setAttribute('opacity', (0.26 * lay.blend * clamp(s.mo, 0, 1)).toFixed(3));
        // GỐI TỰA (nằm trên sofa — mặt nằm cao hơn sàn): một chiếc gối dưới đầu, từ mặt sofa lên tới gáy.
        const top = hd.y + hd.r * 0.45, cushion = (s.lieLift42e || 0) > 1 && lay.floorY - top > 4 && s.lie42e > 0.5;
        pillow.style.display = cushion ? '' : 'none';
        if (cushion) {
          const w = hd.r * 1.9, rect = pillow.firstElementChild, seam = pillow.lastElementChild, x0 = hd.x - w / 2, hgt = lay.floorY - top + 2;
          Object.entries({ x: x0, y: top, width: w, height: hgt, rx: Math.min(hgt / 2, 12) }).forEach(([key, v]) => rect.setAttribute(key, v.toFixed(2)));
          seam.setAttribute('d', `M ${(x0 + 8).toFixed(1)} ${(top + hgt * 0.5).toFixed(1)} Q ${hd.x.toFixed(1)} ${(top + hgt * 0.62).toFixed(1)} ${(x0 + w - 8).toFixed(1)} ${(top + hgt * 0.5).toFixed(1)}`);
        }
      }
    }
    const list = this.picks42e || [];
    if (e.drop42e && e.drop42e.childElementCount !== list.length) {
      e.drop42e.innerHTML = list.map((item) => `<g transform="translate(${item.x.toFixed(2)} ${item.y.toFixed(2)})" data-drop42e="${item.kind}" style="display:none">${item.el ? '' : RigSVG._floorShape(item.kind)}</g>`).join('');
    }
    list.forEach((item, n) => {
      const down = s.picked42e < n + 0.5, g = e.drop42e && e.drop42e.children[n];
      if (g) g.style.display = down && !item.el ? '' : 'none';
      if (item.el && item.el.style) { const v = down ? '' : 'hidden'; if (item.el.style.visibility !== v) item.el.style.visibility = v; }      // đạo cụ thật được nhặt lên: ẩn nó đi
    });
  }

  // Đợt 50 C: chỗ cái bát người `served.rig` đã đặt (gốc SVG của họ) → hệ `_aimOf` của người này; phần tử bát để ẩn khi nhặt lên.
  _servedSpot50c(served) {
    const s = this.s, q = new DOMPoint(served.bowl.x, served.bowl.y).matrixTransform(served.rig.svg.getScreenCTM()).matrixTransform(this.svg.getScreenCTM().inverse());
    return { x: q.x - s.x, y: Math.min(428, q.y - s.y - DOI_Y), el: served.el };
  }

  // Hình món đồ NẰM DƯỚI SÀN (hệ cục bộ: đáy ở y = 0).
  static _floorShape(kind) {
    if (kind === 'bowl') return bowlShape42e();
    if (kind === 'leash') return `<path d="M -16 -3 Q -18 -14 -4 -13 Q 10 -12 6 -4 Q 2 2 -8 -1 M 6 -4 Q 14 -2 18 -1" fill="none" stroke="#c0392b" stroke-width="3.4" stroke-linecap="round"/>
          <rect x="-20" y="-6" width="9" height="6" rx="2" fill="#c0392b" stroke="#7d241a" stroke-width=".8"/>`;
    return toyShape42e();
  }

  // Món đồ để nhặt → điểm đặt nó trong hệ của `_aimOf` (sàn ở y 428) và phần tử thật (đạo cụ) nếu có.
  //   null → trước mặt bên phải · số → cách giữa người chừng ấy đơn vị khung (âm: bên trái) · { x, y } trong khung (y bỏ trống: trên sàn)
  //   · rig con vật → cạnh chân trước nó, phía người · phần tử / đạo cụ → đáy giữa của nó (nó ẩn đi khi được nhặt lên).
  _pickSpot(target) {
    const s = this.s, live = target && target.live ? target.live : target;
    const toFrame = (sx, sy) => {
      const sv = this.svg.getBoundingClientRect(), unit = Math.min(sv.width / KHUNG.w, sv.height / KHUNG.h) || 1;
      const ox = sv.left + (sv.width - KHUNG.w * unit) / 2, oy = sv.top + (sv.height - KHUNG.h * unit) / 2;
      return { x: (sx - ox) / unit - s.x, y: (sy - oy) / unit - s.y - DOI_Y };
    };
    if (live === null || live === undefined) return { x: HONG.x + 78 * this.nv.coThan, y: 428, el: null };
    if (typeof live === 'number' && Number.isFinite(live)) return { x: HONG.x + live, y: 428, el: null };
    if (typeof live.x === 'number' && !live.el && !live.getBoundingClientRect) return { x: live.x - s.x, y: typeof live.y === 'number' ? Math.min(428, live.y - s.y - DOI_Y) : 428, el: null };
    if (live.el && live.svg) {
      // Con vật: đồ chơi nằm cạnh chân trước nó (phía người này), trên mặt sàn dưới chân nó.
      const paws = ['tnBan', 'txBan', 'snBan', 'sxBan'].map((key) => live.el[key]).filter(Boolean).map((el) => el.getBoundingClientRect()).filter((r) => r.height > 0);
      const body = live.svg.getBoundingClientRect(), drawn = live.el.than ? live.el.than.getBoundingClientRect() : body;
      const bottom = paws.length ? Math.max(...paws.map((r) => r.bottom)) : body.bottom, mine = this.centerX();
      const edge = mine < drawn.left + drawn.width / 2 ? drawn.left : drawn.right, p = toFrame(edge, bottom);
      return { x: p.x + (mine < drawn.left + drawn.width / 2 ? -16 : 16), y: Math.min(428, p.y), el: null };
    }
    if (live.getBoundingClientRect) { const r = live.getBoundingClientRect(), p = toFrame(r.left + r.width / 2, r.bottom); return { x: p.x, y: Math.min(428, p.y), el: live }; }
    throw new Error('[character] pickUp(target): target must be null, a distance, { x, y }, a pet rig or an element');
  }

  /**
   * NHẶT một món đồ dưới sàn lên: quay nghiêng về phía nó, NGỒI XỔM xuống (gập gối, lưng thẳng đổ về trước ~30°, gót sau gối), bàn tay
   * với tới món đồ và nắm lại, rồi đứng thẳng lên cầm nó — món đồ thành đồ cầm ở tay ấy (như `heldItemR`), sẵn cho `handOver`. Quay về hướng cũ.
   * `target`: bỏ trống (trước mặt), một quãng (đơn vị khung), { x, y }, một rig con vật (đồ chơi cạnh chân nó) hay một đạo cụ / phần tử.
   * `item`: 'toy' (quả bóng) | 'bowl' (bát ăn) | 'leash' (dây dắt) — tay ấy chưa có đồ thì rig tự cho nó món ấy (đang cất) rồi nhặt.
   */
  pickUp(target = null, { item = 'toy', side = 'auto' } = {}) {
    if (!['toy', 'bowl', 'leash'].includes(item)) throw new Error(`[character] pickUp: item must be 'toy', 'bowl' or 'leash', got ${JSON.stringify(item)}`);
    if (side !== 'auto' && side !== 'L' && side !== 'R') throw new Error(`[character] pickUp: side must be 'auto', 'L' or 'R', got ${JSON.stringify(side)}`);
    const s = this.s;
    if (s.lie42e > 0.5 || s.floor42e > 0.5 || s.seat > 0.5 || s.ride > 0.5) throw new Error('[character] pickUp: stand up first (standUp / getOff) — the character picks things up from standing');
    if (s.om >= 0.5) throw new Error('[character] pickUp: the character is carrying a pet — putDown() first');
    // Đợt 50 C: nhặt cái BÁT đã đặt cho con vật ấy (`serveBowl`) — đích là chính cái bát dưới sàn (nó ẩn đi khi được nhặt lên).
    const served = item === 'bowl' && target && typeof RigSVG.bowlFor50c === 'function' ? RigSVG.bowlFor50c(target) : null;
    const spot = served ? this._servedSpot50c(served) : this._pickSpot(target), dir = spot.x >= HONG.x ? 1 : -1, near = dir > 0 ? 'L' : 'R', far = near === 'L' ? 'R' : 'L';
    // Món đồ rig TỰ CHO ở lần dựng trước (`conversation()` / `sequence()` dựng mỗi bước hai lần, rồi trả trạng thái đầu — lúc ấy chưa có món
    // đồ, `item` = 1) mà chưa được nhặt: coi như đang cất.
    const auto = (k) => !!(this.autoItem42e && typeof this.autoItem42e[k] === 'number' && s.picked42e < this.autoItem42e[k] + 0.5);
    const busy = (k) => this.holds[k] && s['item' + k] > 0.5 && !auto(k), stored = (k) => this.holds[k] && !busy(k);
    // Tay đang CẤT một món đồ (`items` + `itemsHidden`, hay món rig tự cho) thì nhặt bằng tay ấy — ưu tiên tay gần; không thì tay gần (rảnh).
    const k = side !== 'auto' ? side : stored(near) ? near : stored(far) ? far : !busy(near) ? near : far;
    if (busy(k)) throw new Error(`[character] pickUp: hand ${k} already holds an item — put it away (hideItem) or hand it over first`);
    // Tay ấy chưa có món đồ nào: cho nó món `item` ở trạng thái ĐANG CẤT (dựng lại SVG một lần, lúc dựng bước — như `createCharacter({ items, itemsHidden })`).
    const fresh = !this.holds[k];
    if (fresh) {
      // `setItem` đặt lại góc tay ấy (và tay kia, nếu nó thôi đan tay) — giữ nguyên dáng đang có, để gọi thẳng và qua `sequence()` bắt đầu như nhau.
      const keepArms = Object.fromEntries(['batL', 'cangL', 'tayL', 'batR', 'cangR', 'tayR', 'itemL', 'itemR'].map((key) => [key, s[key]]));
      const draw = item === 'bowl' ? bowl42e : item === 'leash' ? leash : toy42e; this.setItem(k, (p, c) => draw(c), { shown: false });
      Object.assign(this.s, keepArms); this.apDung();
    }
    // Món đồ dưới sàn (khung gốc). Giống hệt một món đã có (`sequence()` dựng mỗi bước hai lần) thì dùng lại số của nó.
    const list = this.picks42e = this.picks42e || [], rootX = spot.x + s.x, rootY = spot.y + DOI_Y;
    let n = list.findIndex((it) => it.kind === item && it.el === spot.el && Math.abs(it.x - rootX) < 0.5 && Math.abs(it.y - rootY) < 0.5);
    if (n < 0) { list.push({ kind: item, x: rootX, y: rootY, el: spot.el }); n = list.length - 1; }
    this.pick42e = { k, n, x: rootX, y: rootY, kind: item };
    if (fresh || auto(k)) this.autoItem42e = { ...(this.autoItem42e || {}), [k]: n };
    const t = this.tl(), N = this.NGHI, was = s.huong;
    if (auto(k) && s['item' + k] > 0.5) t.to(s, { ['item' + k]: 0, duration: 0.01 }, 0);          // món rig tự cho, trạng thái đầu cảnh ghi nó "đang hiện": cất đi
    // Góc tay lúc nắm: vai (đã hạ theo dáng ngồi xổm, đã dời lùi, đã đổ về trước), tới GIỮA món đồ. Với chưa tới thì đổ thêm lưng (tới 48°).
    const grab = { x: spot.x, y: spot.y - (item === 'bowl' ? 8 : 11) };
    const saved = { huong: s.huong, squat42e: s.squat42e, seat: s.seat, kneel: s.kneel, than: s.than };
    let pose = null, lean = SQUAT42E.lean, shift = 0;
    try {
      Object.assign(s, { huong: dir, squat42e: 1, seat: 0, kneel: 0 });
      const g = this._floorLegGeo(), back = g[near].ankle.x - g[near].hip.x, arm = DAI.canhTay * this.nv.daiCanhTay + DAI.cangTay * this.nv.daiCangTay + 8 * this.nv.coThan;
      // Thử đổ lưng thêm (tới 45°); vẫn chưa tới thì NHÍCH lại gần món đồ (tới 70 đơn vị khung) trong lúc quay người.
      const fits = (deg, extra) => {
        const geo = this._poseGeo({ huong: dir, lean: dir * deg, step: -back + dir * extra }), sh = geo[k];
        pose = this._palmTo(k, grab, geo);
        return Math.hypot(grab.x - sh.x, grab.y - sh.y) <= arm;
      };
      let done = false;
      for (; lean <= 45 && !(done = fits(lean, 0)); lean += 3);
      if (!done) for (lean = 42, shift = 5; shift <= 70 && !fits(lean, shift); shift += 5);
      lean = Math.min(lean, 45); shift = Math.min(shift, 70);
    } finally { Object.assign(s, saved); }
    if (shift) t.to(s, { x: s.x + dir * shift, duration: 0.45, ease: 'sine.inOut' }, 0);
    t.to(s, { huong: dir, ['carry' + k]: 0, cuoi: 0.7, nhinX: dir * 2, duration: 0.35, ease: 'power2.inOut' }, 0);
    t.to(s, { ['aim' + k]: 1, duration: 0.3, ease: 'sine.inOut' }, 0.3);
    t.set(s, { ['tay' + k]: 'xoe' }, 0.32);
    // Tay kia (rảnh): buông thõng xuống trước đầu gối (góc trên màn hình) — để theo thân đổ tới thì nó chĩa ra sau lưng như cái đuôi.
    const o = k === 'L' ? 'R' : 'L', hang = -dir * (18 + lean), free = !busy(o);
    if (free) { t.to(s, { ['aim' + o]: 1, duration: 0.3, ease: 'sine.inOut' }, 0.3); t.set(s, { ['tay' + o]: 'mo' }, 0.32); }
    t.to(s, { squat42e: 1, than: N.than + dir * lean, dau: N.dau - dir * lean * 0.45, dauY: 6, nhinY: 2.6, ['bat' + k]: pose.bat, ['cang' + k]: pose.cang,
              ...(free ? { ['bat' + o]: o === 'L' ? hang : -hang, ['cang' + o]: o === 'L' ? -12 * dir : 12 * dir } : {}), duration: 0.65, ease: 'power2.inOut' }, 0.35);
    // NẮM LẠI: bàn tay khép, món đồ rời sàn vào tay (tween rất ngắn, không `set` đúng mốc — xem `putDown`).
    t.set(s, { ['tay' + k]: 'nam' }, 1.02);
    t.to(s, { picked42e: n + 1, duration: 0.02 }, 1.04);
    t.to(s, { ['item' + k]: 1, duration: 0.08 }, 1.04);
    // ĐỨNG LÊN cầm món đồ: lưng thẳng lại, gối duỗi; tay về dáng cầm đồ; rồi quay về hướng cũ (`_khep`).
    t.to(s, { squat42e: 0, than: N.than, dau: N.dau, dauY: 0, nhinY: 0, duration: 0.6, ease: 'power2.inOut' }, 1.35);
    t.to(s, { ['aim' + k]: 0, ['bat' + k]: N['bat' + k], ['cang' + k]: N['cang' + k], ...(free ? { ['aim' + o]: 0, ['bat' + o]: N['bat' + o], ['cang' + o]: N['cang' + o] } : {}), duration: 0.55, ease: 'power2.inOut' }, 1.4);
    this._khep(t, 0.45, 1.95, { ['item' + k]: 1, picked42e: n + 1, huong: was });
    return t;
  }

  /**
   * NGỒI BỆT xếp bằng trên sàn và GIỮ (thế giữ tới `standUp`): quỳ xuống rồi ngồi hẳn xuống, hai đùi xoè ngang, hai ống chân gập chéo trước
   * bụng, mông chạm sàn, lưng thẳng, hai bàn tay úp lên hai đầu gối. Nói, gật, vẫy, vuốt con vật cạnh mình, bế con vật nhỏ lên lòng diễn khi
   * vẫn ngồi. `standUp()` đứng dậy qua dáng quỳ.
   */
  sitOnFloor() {
    const t = this.tl(), s = this.s;
    if (s.lie42e > 0.5) throw new Error('[character] sitOnFloor: the character is lying down — standUp() first');
    if (s.floor42e > 0.5) return this._khep(t, 0.3, 0);
    if (s.ride > 0.5) throw new Error('[character] sitOnFloor: the character is riding — getOff() first');
    t.to(s, { dauY: 4, nhinY: 1.4, than: 0, cuoi: 0.6, duration: 0.3, ease: 'power2.in' }, 0);
    // Quỳ xuống trước (gối chạm sàn), rồi ngồi hẳn xuống: chân quỳ chuyển dần sang chân xếp bằng — chân không xuyên sàn (hạ theo chỗ chạm).
    t.to(s, { seat: 1, kneel: 1, duration: 0.45, ease: 'power2.inOut' }, 0);
    t.to(s, { seat: 0, kneel: 0, floor42e: 1, duration: 0.6, ease: 'sine.inOut' }, 0.5);
    this._khep(t, 0.4, 1.1, { floor42e: 1, seat: 0, kneel: 0 });
    return t;
  }

  /**
   * NẰM xuống và GIỮ (thế giữ tới `standUp`): `where` 'floor' — nằm nghiêng trên sàn, đầu gối lên cánh tay phía dưới; 'sofa' — nằm trên mặt
   * sofa (cao `rig.seatY()` như người ngồi), đầu gối lên một chiếc gối tựa. `{ head }` 'left' | 'right' (đầu về bên nào; mặc định phía đang
   * quay mặt, nhìn thẳng thì trái), `{ sleep }` true: mắt nhắm (ngủ). Đang ngồi bệt thì nằm thẳng từ đó; đứng thì quỳ xuống trước.
   * Đặt người ở giữa chỗ nằm (sofa: giữa bề ngang sofa) — thân nằm ngang giữa chỗ đứng của nó.
   */
  lieDown(where = 'floor', { head = null, sleep = false, lift = null } = {}) {
    if (where !== 'floor' && where !== 'sofa') throw new Error(`[character] lieDown(where): where must be 'floor' or 'sofa', got ${JSON.stringify(where)}`);
    if (head !== null && head !== 'left' && head !== 'right') throw new Error(`[character] lieDown: head must be 'left' or 'right', got ${JSON.stringify(head)}`);
    const t = this.tl(), s = this.s;
    if (s.ride > 0.5) throw new Error('[character] lieDown: the character is riding — getOff() first');
    if (s.om >= 0.5) throw new Error('[character] lieDown: the character is carrying a pet — putDown() first');
    const dir = head === 'left' ? -1 : head === 'right' ? 1 : s.huong > 0.1 ? 1 : -1;
    if (lift !== null && !(typeof lift === 'number' && lift >= 0 && lift < 300)) throw new Error(`[character] lieDown: lift must be a height in frame units (0…300), got ${JSON.stringify(lift)}`);
    // Mặt nằm: sàn (0) hay mặt sofa — cao `lift` đơn vị khung (bối cảnh 3D: đúng mặt hộp sofa), mặc định bằng mặt ghế của chính nhân vật (`seatY`).
    const surface = where === 'sofa' ? (lift !== null ? lift : Math.max(0, 428 + DOI_Y - this.seatY())) : 0;
    const keep = { lie42e: 1, lieDir42e: dir, lieLift42e: surface, nap42e: sleep ? 1 : 0, floor42e: 0, seat: 0, kneel: 0, huong: 0 };
    if (s.lie42e > 0.5) { t.to(s, { lieDir42e: dir, lieLift42e: surface, duration: 0.01 }, 0); return this._khep(t, 0.5, 0.02, keep); }
    t.set(s, { lieDir42e: dir }, 0.01);
    t.to(s, { lieLift42e: surface, duration: 0.02 }, 0);
    // Từ dáng ngồi bệt / ngồi ghế (sofa): ngả thẳng xuống. Đứng: quỳ xuống, ngồi bệt xuống, rồi mới ngả lưng — không đổ người như khúc gỗ.
    const seated = s.floor42e > 0.5 || (s.seat > 0.5 && !(s.kneel > 0.5)), from = seated ? 0 : 0.95;
    if (seated) t.to(s, { huong: 0, dauY: 3, duration: 0.3, ease: 'sine.inOut' }, 0);
    else {
      t.to(s, { huong: 0, dauY: 4, nhinY: 1.4, cuoi: 0.6, duration: 0.3, ease: 'power2.in' }, 0);
      t.to(s, { seat: 1, kneel: 1, duration: 0.45, ease: 'power2.inOut' }, 0);
      t.to(s, { seat: 0, kneel: 0, floor42e: 1, duration: 0.5, ease: 'sine.inOut' }, 0.45);
    }
    // Ngả xuống: thân xoay dần về nằm ngang quanh hông, chân duỗi ra; đầu tựa xuống tay / gối.
    t.to(s, { lie42e: 1, seat: 0, kneel: 0, floor42e: 0, dauY: 0, nhinY: 0, cuoi: 0.5, duration: 0.85, ease: 'sine.inOut' }, from);
    if (sleep) t.to(s, { nap42e: 1, cuoi: 0.25, duration: 0.5, ease: 'sine.inOut' }, from + 0.8);
    this._khep(t, 0.4, from + 0.95, keep);
    return t;
  }

  // ĐỨNG DẬY từ sàn (`standUp` gọi): nằm — lật nghiêng, chống tay đẩy người lên thành dáng quỳ; ngồi bệt — nhổm lên quỳ; rồi đứng thẳng.
  _floorRise(t) {
    const s = this.s, lying = s.lie42e > 0.5, sofa = lying && (s.lieLift42e || 0) > 1;
    t.to(s, { nap42e: 0, dauY: 3, cuoi: 0.5, duration: 0.25, ease: 'sine.inOut' }, 0);
    let at = 0.1;
    // Nằm trên SOFA: ngồi dậy trên mặt sofa (như người ngồi ghế). Nằm dưới SÀN: chống tay ngồi dậy thành dáng ngồi bệt.
    if (sofa) { t.to(s, { lie42e: 0, seat: 1, kneel: 0, duration: 0.85, ease: 'sine.inOut' }, at); at += 0.85; }
    else if (lying) { t.to(s, { lie42e: 0, floor42e: 1, duration: 0.8, ease: 'sine.inOut' }, at); at += 0.8; }
    // Từ sàn: nhổm lên dáng quỳ — rồi đứng thẳng.
    if (!sofa) { t.to(s, { floor42e: 0, seat: 1, kneel: 1, duration: 0.5, ease: 'sine.inOut' }, at); at += 0.5; }
    t.to(s, { lieLift42e: 0, duration: 0.02 }, at);
    this._khep(t, 0.6, at, { seat: 0, kneel: 0, floor42e: 0, lie42e: 0, lieLift42e: 0, nap42e: 0 });
    return t;
  }

  /** Đường LÒNG của người ngồi bệt (y trong khung 400 × 470): mặt trên hai ống chân xếp chéo — con vật được bế nằm trên đó (set3d: như mặt ghế). */
  lapY42e() {
    const nv = this.nv, s = this.s, drop = this.hangChan() + this._lowered() + s.y;
    return HONG.y + DOI_Y + drop + 13 * nv.dayChan * nv.coChan;
  }

  // Khung ngắm của người NẰM (khung gốc): 'face' quanh đầu, 'chest' đầu + thân trên, 'full' cả người — rộng, thấp.
  _floorShotBox(kind) {
    if (!(this.s.lie42e > 0.5)) return null;
    this.apDung();
    const lay = this.lay42e;
    if (!lay) return null;
    const nv = this.nv, hd = lay.head, box = (x0, y0, x1, y1) => ({ x: x0, y: y0, width: x1 - x0, height: y1 - y0 });
    if (kind === 'face') { const half = 64 * nv.coDau * nv.coThan * 1.2; return box(hd.x - half, hd.y - half, hd.x + half, hd.y + half); }
    const all = lay.pts, xs = all.map((p) => [p.x - p.r, p.x + p.r]).flat(), top = Math.min(...all.map((p) => p.y - p.r)) - 14;
    if (kind === 'chest') {
      const hipX = lay.hip.x, x0 = Math.min(hd.x - hd.r, hipX), x1 = Math.max(hd.x + hd.r, hipX);
      return box(x0 - 14, Math.min(top, hd.y - hd.r - 14), x1 + 14, lay.floorY + 10);
    }
    if (kind === 'full') return box(Math.min(...xs) - 16, top, Math.max(...xs) + 16, lay.floorY + 14);
    throw new Error(`[character] no shot "${kind}" (available: face, chest, full)`);
  }

  /**
   * SỐ ĐO SÁT SÀN cho tools/acting_check.py (set3d `actingProbe`), khung gốc 400 × 470 (sàn ở 458): ngồi bệt / ngồi xổm / nằm (0…1), góc thân
   * (độ, 0 = đứng thẳng), hông, đáy mông, chỗ thấp nhất của người, mặt nằm, tâm đầu, hai cổ chân, món đồ dưới sàn (và đã nhặt chưa).
   */
  floorProbe42e() {
    this.apDung();
    const s = this.s, nv = this.nv, lay = this.lay42e, drop = this.hangChan() + this._lowered() + s.y;
    const legs = this._floorLegGeo(), at = (p) => ({ x: s.x + HONG.x + p.x, y: HONG.y + DOI_Y + drop + p.y * nv.coChan });
    const hip = lay ? lay.hip : { x: s.x + HONG.x, y: HONG.y + DOI_Y + drop };
    const low = lay ? Math.max(...lay.pts.map((p) => p.y + p.r)) : HONG.y + DOI_Y + drop + this._floorLegLow(legs) * nv.coChan;
    const items = (this.picks42e || []).map((it, n) => ({ kind: it.kind, x: it.x, y: it.y, down: s.picked42e < n + 0.5, prop: !!it.el }));
    return { sit: +s.floor42e || 0, squat: +s.squat42e || 0, lie: +s.lie42e || 0, angle: lay ? lay.angle : 0, sofa: (s.lieLift42e || 0) > 1, hip,
             seat: { x: hip.x, y: hip.y + 13 * nv.dayChan * nv.coChan }, low, floor: lay ? lay.floorY : 428 + DOI_Y, head: lay ? { x: lay.head.x, y: lay.head.y } : null,
             ankles: lay ? null : [at(legs.L.ankle), at(legs.R.ankle)], items, pick: this.pick42e || null };
  }

});
