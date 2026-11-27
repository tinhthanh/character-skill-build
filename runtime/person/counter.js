// runtime/person/counter.js — the till and the café counter (pay by QR / card, change, stamp card, pour, wipe), writing, phone calls.
// Methods of `RigSVG`, installed by runtime/rig-svg.js: `this` is the rig, `RigSVG` its class.

import { DOI_Y, HONG, CALL_POSE, CALL_TILT, SHOW_POSE, LOOK_DOWN, clamp, chuanHoaGoc, RAD, mix } from './shared.js';

export default (RigSVG) => mix(RigSVG, class {
  // ═══════════════════════════════════════════════ ĐỢT 39 A — QUẦY THU NGÂN & QUẦY CÀ PHÊ
  // Quét mã QR / quẹt thẻ, thối tiền, đóng dấu thẻ, rót đồ uống, lau quầy. Mọi điểm (mã QR, đầu mép cốc, ô đóng dấu) tính trên màn hình từ
  // trạng thái + số đo khung như `_palmTo` (không đọc dáng đang vẽ lúc dựng); đồ vật cầm là món đồ (`phone`, `card`, `stampcard`, `cup`, `cash`),
  // dụng cụ trong tay là gadget 20 = khăn lau, 21 = con dấu, 22 = bình rót (kèm dòng nước), 23 = xấp tiền đang đếm.
  static PAY_ZOOM = 1.55;           // điện thoại / thẻ phóng to khi quét — mặt lưng máy, dấu tick đọc được ở cảnh trung
  static PAY_SCAN_GAP = 14;         // quét QR: tâm điện thoại lệch khỏi tâm mã QR chừng này đơn vị về phía người cầm — che nửa mã, không chạm máy quẹt thẻ bên cạnh
  static CASH_ZOOM = 1.4;
  static COUNT_NOTES = 4;           // số tờ đếm sang tay kia
  static COUNT_EVERY = 0.62;        // giây mỗi tờ
  static STAMP_ZOOM = 1.35;
  static STAMP_PRESS = 0.75;        // giây ấn con dấu xuống thẻ (giữ nguyên)
  static POUR_SECONDS = 1.9;        // giây rót (mức nước dâng từ 0 tới đầy)
  static POUR_TIP = 42;             // độ nghiêng bình lúc rót
  static WIPE_LOOP = 1.15;          // giây mỗi vòng lau
  static DESK_TURN = 0.1;           // quay nhẹ về người kia: quá 0,1 thì tay GẦN bị thả xuôi dần (xem `hangNear` trong apDung) — hai tay cùng làm việc trước ngực
  static FACE_COUNTER = 0.1;        // thân quay tối đa (đơn vị `huong`) khi làm việc ở quầy — như GESTURE_TURN

  // Tay đang cầm món đồ (đang hiện) có phần tử `selector`, hay null.
  // Món đồ đang CẤT (`itemsHidden`, `hideItem`) cũng tính khi `stowed`: động tác tự lấy nó ra (kênh `item` lên 1 trong 0,15 s đầu) và cất lại lúc xong — như `readChart`.
  _heldWith(selector, side = 'auto', stowed = false) {
    const s = this.s, has = (k, shown) => this.holds[k] && (shown ? s['item' + k] > 0.5 : s['item' + k] <= 0.5) && this.el['item' + k] && this.el['item' + k].querySelector(selector);
    if (side === 'L' || side === 'R') return has(side, true) || (stowed && has(side, false)) ? side : null;
    return ['R', 'L'].find((k) => has(k, true)) || (stowed ? ['R', 'L'].find((k) => has(k, false)) : null) || null;
  }

  // Góc xoay dụng cụ (`gadgetTurn`) cho trục +y của nó chúc thẳng xuống màn hình, khi tay `k` ở dáng `pose` (bắp / cẳng — góc trên màn hình).
  // Đo trên hình: `gadgetTurn` dương xoay dụng cụ tay phải theo chiều kim đồng hồ, tay trái NGƯỢC chiều (hình tay trái không soi gương) — nên tay trái đổi dấu.
  _spinDown(k, pose) { const d = 90 - (k === 'R' ? 90 - pose.bat - pose.cang : 90 + pose.bat + pose.cang); return chuanHoaGoc(k === 'R' ? d : -d); }

  // ĐIỂM trong hệ `_aimOf` của một phần tử con của món đồ / dụng cụ (`el`, điểm cục bộ `local`) khi đặt tạm `patch` lên trạng thái, rồi trả lại;
  // null nếu chưa đo được (chưa gắn vào trang) — người gọi dùng công thức dự phòng.
  _deskSpot(patch, el, local = [0, 0]) {
    const s = this.s;
    if (!el || !el.getScreenCTM || !this.svg.getScreenCTM || !this.svg.getScreenCTM()) return null;
    const was = Object.fromEntries(Object.keys(patch).map((key) => [key, s[key]]));
    Object.assign(s, patch);
    try {
      this.apDung();
      const q = new DOMPoint(local[0], local[1]).matrixTransform(this.svg.getScreenCTM().inverse().multiply(el.getScreenCTM()));
      return Number.isFinite(q.x) && Number.isFinite(q.y) ? { x: q.x - s.x, y: q.y - (s.y || 0) - DOI_Y } : null;
    } catch (error) { return null; } finally { Object.assign(s, was); this.apDung(); }
  }

  // MẶT QUẦY `top` (`{ x, y }` trong khung — `set.targetPoint(…)` lên mặt quầy trước người này): kéo cả vùng làm việc LÊN khi mặt quầy cao hơn chỗ bàn tay thấp nhất
  // (`lowest`, y của lòng bàn tay) — tay và đồ vật nằm TRÊN quầy, không khuất sau nó —, nhưng không cao quá vai. Trả độ dời y (≤ 0).
  _deskLift(top, lowest, mine) {
    const p = top ? this._lookPoint(top) : null;
    if (!p) return 0;
    return clamp(p.y - 12 * this.nv.coThan - lowest, -Math.max(0, lowest - (mine.L.y + 16 * this.nv.coThan)), 0);
  }

  // Người kia (rig, hay mỏ neo `{ centerX, live }`) → mặt họ trong hệ của mình, dáng ĐỨNG quay về phía mình: để nhìn họ lúc đưa đồ.
  _deskFaceOf(anchor, name, turnThem = 0.2) {
    const pair = this._pair(anchor, name), o = pair.other;
    return { pair, face: pair.back(RigSVG._screenGeo(o, pair.them, o._poseGeo({ huong: -pair.dir * turnThem })).face) };
  }

  /**
   * TRẢ TIỀN BẰNG MÃ QR: giơ điện thoại đang cầm (mặt lưng ra ngoài, phóng to) tới mã QR trên đế thanh toán `target` (`createProp(host,
   * 'paystand').qr`, hay `set.targetPoint(…)` / `{ x, y }` trong khung 400 × 470), đầu cúi nhìn mã, giữ yên `hold` giây để máy quét, rồi "ting" —
   * dấu tick xanh bật lên trên điện thoại —, gật đầu cười, hạ máy. Không có `target`: mã ở một chỗ ước chừng trước ngực phía tay cầm máy.
   */
  payByQR(target = null, hold = 1.4, { side = 'auto' } = {}) { return this._deskPay('payByQR', target, hold, side); }

  /**
   * QUẸT THẺ: đưa thẻ ngân hàng đang cầm (`items: { R: 'card' }`) tới máy đọc thẻ `target` (`createProp(host, 'paystand').reader`), chạm vào máy
   * hai lần (lần đầu nhấc ra ngay, lần sau áp giữ `hold` giây), "ting" + dấu tick xanh trên thẻ, gật đầu cười, hạ thẻ.
   */
  payByCard(target = null, hold = 1.2, { side = 'auto' } = {}) { return this._deskPay('payByCard', target, hold, side); }

  _deskPay(name, target, hold, side) {
    const qr = name === 'payByQR', s = this.s, N = this.NGHI, k = this._heldWith(qr ? '[data-back]' : '[data-card]', side, true);
    if (!k) throw new Error(`[character] ${name}: the character is not holding ${qr ? 'a phone' : 'a bank card'}${side === 'L' || side === 'R' ? ' in hand ' + side : ''} — give it one: createCharacter(host, { id, items: { R: "${qr ? 'phone' : 'card'}" } })`);
    if (!(Number.isFinite(hold) && hold > 0 && hold <= 8)) throw new Error(`[character] ${name}: hold must be a number of seconds between 0 and 8, got ${JSON.stringify(hold)}`);
    const t = this.tl(), c = this.nv.coThan, cB = this.nv.coBanTay || 1, z = RigSVG.PAY_ZOOM, m = k === 'L' ? -1 : 1;
    const huong = clamp(s.huong, -RigSVG.FACE_COUNTER, RigSVG.FACE_COUNTER), mine = this._poseGeo({ huong });
    const spot = this._lookPoint(target) || { x: HONG.x + m * 52 * c, y: mine[k].y + 34 * c };
    const toward = Math.sign(spot.x - HONG.x) || m;
    // Điện thoại: cạnh mã QR phía người cầm, mã vẫn lộ ra; thẻ: chạm vào mặt máy. Tâm món đồ → lòng bàn tay (món đồ nhô lên trên lòng bàn tay).
    const at = qr ? { x: spot.x - toward * RigSVG.PAY_SCAN_GAP * c, y: spot.y + 3 * c } : { x: spot.x - toward * 9 * c, y: spot.y + 4 * c };
    const rise = (qr ? 5 : 11) * z * cB, lift = 15 * c;
    const hit = this._palmTo(k, { x: at.x, y: at.y + rise }, mine), ready = this._palmTo(k, { x: at.x - toward * 18 * c, y: at.y + rise + lift }, mine), off = this._palmTo(k, { x: at.x - toward * 8 * c, y: at.y + rise + 6 * c }, mine);
    const look = this._lookAngles(spot, { huong });
    const gaze = { ...look, cuoi: 0.5, mayL: 0.3, mayR: 0.3 };
    const stowed = s['item' + k] <= 0.5;
    if (stowed) { t.set(s, { ['tay' + k]: 'nam' }, 0); t.to(s, { ['item' + k]: 1, duration: 0.15 }, 0); }          // đang cất: lấy ra
    this._stage(t, [k]);
    t.to(s, { huong, ['carry' + k]: 0, ['aim' + k]: 1, ['itemBack' + k]: qr ? 1 : 0, duration: 0.3, ease: 'sine.inOut' }, 0);
    t.to(s, { ['bat' + k]: ready.bat, ['cang' + k]: ready.cang, ['itemZoom' + k]: z, than: N.than + toward * 2.5, ...gaze, duration: 0.5, ease: 'power2.out' }, 0.05);
    // Chạm / quét: QR — tiến sát mã, giữ yên (máy rung nhẹ); thẻ — chạm, nhấc ra, chạm lại và áp giữ.
    let at1 = 0.6;
    if (qr) t.to(s, { ['bat' + k]: hit.bat, ['cang' + k]: hit.cang, duration: 0.4, ease: 'power2.inOut' }, at1);
    else {
      t.to(s, { ['bat' + k]: hit.bat, ['cang' + k]: hit.cang, duration: 0.3, ease: 'power2.in' }, at1);
      t.to(s, { ['bat' + k]: off.bat, ['cang' + k]: off.cang, duration: 0.2, ease: 'power2.out' }, at1 + 0.4);
      t.to(s, { ['bat' + k]: hit.bat, ['cang' + k]: hit.cang, duration: 0.25, ease: 'power2.in' }, at1 + 0.75);
      at1 += 0.5;
    }
    const scanned = at1 + 0.45 + hold;
    for (let a = at1 + 0.45; a + 0.3 < scanned; a += 0.3) t.to(s, { ['cang' + k]: hit.cang + (a % 0.6 < 0.3 ? 1.2 : -1.2), duration: 0.15, ease: 'sine.inOut', yoyo: true, repeat: 1 }, a);
    // "TING": dấu tick xanh bật ra (cỡ nảy), người gật đầu cười.
    t.to(s, { ting: 1, duration: 0.2, ease: 'back.out(2.2)' }, scanned);
    t.to(s, { cuoi: 1, mieng: 0.2, mayL: 0.55, mayR: 0.55, duration: 0.25 }, scanned + 0.05);
    t.to(s, { dauY: 6, duration: 0.25, ease: 'sine.inOut' }, scanned + 0.3).to(s, { dauY: 0, duration: 0.3, ease: 'sine.inOut' }, scanned + 0.7);
    this._chop(t, scanned + 0.5);
    const end = scanned + 1.15;                       // tick giữ ≥ 1 s trước khi hạ máy
    t.to(s, { ting: 0, duration: 0.2 }, end - 0.05);
    this._khep(t, 0.5, end, stowed ? { ['item' + k]: 0 } : {});
    return t;
  }

  // Vẽ theo trạng thái (gọi trong `apDung`): bình nghiêng + dòng nước rót, tờ tiền đang đếm, khăn trải / gấp, dấu đỏ trên thẻ tích điểm, dấu tick "ting"
  // trên điện thoại / thẻ, mức nước trong cốc (cốc nào có `brew` > 0 cũng hiện thành cốc thuỷ tinh).
  _drawDeskTools() {
    const e = this.el, s = this.s;
    for (const side of ['L', 'R']) {
      const box = e['gadget' + side], kind = Math.round(s['gadget' + side]);
      const tool = box && kind >= 20 && kind <= 23 ? [...box.children].find((child) => +child.getAttribute('data-gadget') === kind) : null;
      if (tool && kind === 20) {
        const folded = clamp(s['fold' + side] || 0, 0, 1) >= 0.5;
        tool.querySelector('[data-spread]').style.display = folded ? 'none' : '';
        tool.querySelector('[data-folded]').style.display = folded ? '' : 'none';
      }
      if (tool && kind === 22) {
        const tip = s['tip' + side] || 0, len = s['pour' + side] || 0, r = tip * RAD, stream = tool.querySelector('[data-stream]');
        tool.querySelector('[data-pitcher]').setAttribute('transform', `${side === 'L' ? 'scale(-1 1) ' : ''}rotate(${(-tip).toFixed(2)} 0 10)`);       // tay trái: vòi quay sang phải (về phía thân)
        stream.style.display = len > 0.5 ? '' : 'none';
        if (len > 0.5) {
          // Vòi (−31, 0,5) quay quanh lòng bàn tay (0, 10) theo `tip`; dòng nước rơi thẳng xuống (dụng cụ đã xoay cho trục +y chúc xuống) `pour` đơn vị.
          const x = (side === 'L' ? -1 : 1) * (-31 * Math.cos(r) - 9.5 * Math.sin(r)), y = 10 + 31 * Math.sin(r) - 9.5 * Math.cos(r);
          stream.querySelector('[data-flow]').setAttribute('d', `M ${x.toFixed(2)} ${(y - 1).toFixed(2)} L ${x.toFixed(2)} ${(y + len).toFixed(2)}`);
          stream.querySelector('[data-flowlight]').setAttribute('d', `M ${(x - 0.6).toFixed(2)} ${(y + 1).toFixed(2)} L ${(x - 0.6).toFixed(2)} ${(y + len - 1).toFixed(2)}`);
          const splash = stream.querySelector('[data-splash]');
          splash.style.display = len > 6 ? '' : 'none';
          splash.setAttribute('transform', `translate(${x.toFixed(2)} ${(y + len).toFixed(2)})`);
        }
      }
      if (tool && kind === 23) {
        const n = Math.round(clamp(s['fan' + side] || 0, 0, 5));
        for (const note of tool.querySelectorAll('[data-n]')) note.style.display = +note.getAttribute('data-n') <= n ? '' : 'none';
      }
      const item = e['item' + side];
      if (!item) continue;
      const ting = item.querySelector('[data-ting]');
      if (ting) { const f = clamp(s.ting || 0, 0, 1.3); ting.style.display = f > 0.02 && s['item' + side] > 0.5 ? '' : 'none'; ting.setAttribute('transform', `translate(0 10) scale(${f.toFixed(3)}) translate(0 -10)`); }
      const stamp = item.querySelector('[data-stampink]');
      if (stamp) stamp.style.display = stamp.getAttribute('data-stampink') === 'always' || (s['ink' + side] || 0) > 0.5 ? '' : 'none';
      const cup = item.querySelector('[data-cup]');
      if (cup) {
        const brew = clamp(s['brew' + side] || 0, 0, 1), full = cup.hasAttribute('data-full') ? 1 : 0, open = cup.getAttribute('data-cup') === 'open' || brew > 0, f = brew > 0 ? brew : full;
        const body = cup.querySelector('[data-cupbody]'), level = cup.querySelector('[data-level]'), sleeve = cup.querySelector('[data-sleeve]'), lid = cup.querySelector('[data-lid]');
        body.setAttribute('fill', open ? '#e3f1f7' : body.getAttribute('data-cupbody')); body.setAttribute('fill-opacity', open ? '0.6' : '1');
        sleeve.style.display = open ? 'none' : ''; lid.style.display = open ? 'none' : '';
        const top = 13 - f * 28, half = (y) => 6.5 + (13 - y) / 30 * 2;
        level.style.display = open && f > 0.01 ? '' : 'none';
        if (open && f > 0.01) level.setAttribute('d', `M ${(-half(top)).toFixed(2)} ${top.toFixed(2)} L ${half(top).toFixed(2)} ${top.toFixed(2)} L 6.5 13 Q 0 15 -6.5 13 Z`);
      }
    }
  }

  /** Số đo cho tools/acting_check.py (đợt 39 A, `set.careProbe`): phần tử đang hiện — tick "ting", dấu đỏ và ô đóng dấu, mặt con dấu, dòng nước, miệng / thân cốc, khăn, tờ tiền — và mức nước, số tờ tiền. */
  desk39Probe() {
    const e = this.el, s = this.s, out = { ting: null, ink: null, spot: null, stamp: null, stream: null, mouth: null, cup: null, cloth: null, level: 0, notes: 0 };
    for (const side of ['L', 'R']) {
      const item = e['item' + side], shown = item && this.holds[side] && s['item' + side] > 0.5;
      if (shown) {
        const q = (sel) => item.querySelector(sel);
        out.ting = out.ting || q('[data-ting]'); out.ink = out.ink || q('[data-stampink]'); out.spot = out.spot || q('[data-stampspot]');
        out.mouth = out.mouth || q('[data-mouth]'); out.cup = out.cup || q('[data-cupbody]');
        if (q('[data-cup]')) { const brew = clamp(s['brew' + side] || 0, 0, 1); out.level = Math.max(out.level, brew > 0 ? brew : q('[data-cup]').hasAttribute('data-full') ? 1 : 0); }
      }
      const kind = Math.round(s['gadget' + side] || 0), box = e['gadget' + side], tool = box && kind >= 20 && kind <= 23 ? [...box.children].find((child) => +child.getAttribute('data-gadget') === kind) : null;
      if (!tool) continue;
      if (kind === 20) out.cloth = tool;
      if (kind === 21) out.stamp = tool.querySelector('rect:last-of-type');
      if (kind === 22) out.stream = tool.querySelector('[data-flow]');
      if (kind === 23) out.notes = Math.round(clamp(s['fan' + side] || 0, 0, 5));
    }
    return out;
  }

  // Thời điểm (giây) người đưa trao đồ sau phần đếm / đóng dấu — người nhận (`takeChange` / `takeCard`) chờ tới lúc ấy rồi mới vươn tay.
  static get CHANGE_AT() { return 0.6 + RigSVG.COUNT_NOTES * RigSVG.COUNT_EVERY + 1.05; }
  static get STAMP_GIVE_AT() { return 1.35 + RigSVG.STAMP_PRESS + 1.4; }       // `stampCard(other)`: giây trao thẻ (sau khi ngắm dấu)

  // PHẦN TRAO của người đưa (như `handOver`, đặt từ giây `at`): tay `k` vươn tới `other`, món đồ rời tay lúc `at + 0.62`, buông về nghỉ.
  _deskGive(t, k, other, at, face) {
    const s = this.s, N = this.NGHI, dir = this._towards(other, k);
    t.to(s, { ['carry' + k]: 0, duration: 0.1 }, at);
    this._reach(t, k, dir, at + 0.12, other);
    if (face) t.to(s, { ...face, duration: 0.35, ease: 'power2.inOut' }, at);
    t.to(s, { ['item' + k]: 0, duration: 0.15 }, at + 0.62);
    t.set(s, { ['tay' + k]: 'mo' }, at + 0.7);
    this._khep(t, 0.45, at + 0.88, { ['item' + k]: 0, ...(face || {}) });
  }

  // PHẦN NHẬN (như `take`, bắt đầu từ giây `at`; trước đó nhìn người đưa làm việc): món đồ đang cất ở tay `k` hiện ra lúc `at + 0.62`, cùng cỡ với tay người đưa.
  _deskTakeLater(name, giver, selector, at, zoom) {
    const s = this.s, N = this.NGHI, stored = ['R', 'L'].filter((k) => this.holds[k] && s['item' + k] <= 0.5 && this.el['item' + k] && this.el['item' + k].querySelector(selector)), k = stored[0];
    if (!k) throw new Error(`[character] ${name}: this character has no put-away ${selector === '[data-cash]' ? 'banknotes' : 'stamp card'} to receive — createCharacter(host, { id, items: { R: "${selector === '[data-cash]' ? 'cash' : 'stampcard'}" }, itemsHidden: true })`);
    const { pair, face } = this._deskFaceOf(giver, name), dir = pair.dir, t = this.tl(), huong = dir * RigSVG.DESK_TURN;
    const watch = this._lookAngles({ x: face.x, y: face.y + 1.9 * 64 * pair.other.nv.coDau * pair.other.nv.coThan * pair.tu / pair.u }, { huong, up: RigSVG.PAIR_UP }), eyes = this._lookAngles(face, { huong, up: RigSVG.PAIR_UP });
    this._stage(t, [k]);
    t.to(s, { huong, ...watch, cuoi: 0.5, duration: 0.45, ease: 'sine.inOut' }, 0.05);
    t.set(s, { ['tay' + k]: 'mo', ['carry' + k]: 0 }, at);
    t.to(s, { ...eyes, duration: 0.3 }, at - 0.1);
    this._reach(t, k, dir, at + 0.12, giver);
    const handScale = (rig, side) => { const m = rig.el['coTay' + side] && rig.el['coTay' + side].getScreenCTM(); return m ? Math.hypot(m.a, m.b) : 1; };
    const giverSide = ['R', 'L'].find((side) => pair.other.holds[side] && pair.other.el['item' + side].querySelector(selector)) || 'R';
    t.set(s, { ['tay' + k]: 'nam', ['itemZoom' + k]: zoom * handScale(pair.other, giverSide) / (handScale(this, k) || 1) }, at + 0.62);
    t.to(s, { ['item' + k]: 1, duration: 0.15 }, at + 0.62);
    t.to(s, { dauY: 6, cuoi: 1, duration: 0.2, ease: 'power2.out' }, at + 1.0).to(s, { dauY: 0, duration: 0.25, ease: 'power2.inOut' }, at + 1.2);
    this._khep(t, 0.45, at + 0.88, { ['item' + k]: 1, huong, headTurn: eyes.headTurn, headPitch: eyes.headPitch, headTilt: eyes.headTilt });
    return t;
  }

  /**
   * THỐI TIỀN cho người kia `other`: thu ngân cầm xấp tiền (`items: { R: 'cash' }`), mắt nhìn xuống tay, ĐẾM `COUNT_NOTES` tờ từ tay này sang tay kia —
   * mỗi tờ hiện ra thấy rõ trong tay nhận, miệng nhẩm theo —, gộp lại cho đều, ngẩng nhìn khách rồi đưa xấp tiền ra; hai bên cầm ~0,6 s, tiền sang tay
   * khách. Chạy cùng nhịp với `other.takeChange(this)` (khách có sẵn xấp tiền đang cất: `items: { R: 'cash' }, itemsHidden: true`).
   */
  giveChange(other, { top = null } = {}) {
    const s = this.s, N = this.NGHI, k = this._heldWith('[data-cash]', 'auto', true);
    if (!k) throw new Error('[character] giveChange: this character is not holding banknotes — createCharacter(host, { id, items: { R: "cash" } })');
    const o = k === 'R' ? 'L' : 'R', m = k === 'L' ? -1 : 1;
    if (this.holds[o] && s['item' + o] > 0.5) throw new Error('[character] giveChange: needs a free second hand to count the notes into');
    const { pair, face } = this._deskFaceOf(other, 'giveChange'), dir = pair.dir, t = this.tl(), c = this.nv.coThan, cB = this.nv.coBanTay || 1, z = RigSVG.CASH_ZOOM;
    const huong = dir * RigSVG.DESK_TURN, mine = this._poseGeo({ huong }), base0 = mine[k].y + 44 * c + 14 * z * cB, y0 = base0 + this._deskLift(top, base0, mine);
    const home = this._palmTo(k, { x: HONG.x + m * 22 * c, y: y0 }, mine), fanAt = this._palmTo(o, { x: HONG.x - m * 22 * c, y: y0 }, mine);
    const meet = this._palmTo(k, { x: HONG.x - m * 4 * c, y: y0 - 2 * c }, mine), join = this._palmTo(o, { x: HONG.x + m * 14 * c, y: y0 }, mine);
    const hands = { x: HONG.x, y: y0 - 18 * c }, down = this._lookAngles(hands, { huong });
    const spin = chuanHoaGoc(this._spinDown(o, fanAt) + 180);                         // xấp tiền xoè LÊN trên nắm tay
    const look = this._lookAngles(face, { huong, up: RigSVG.PAIR_UP });
    if (s['item' + k] <= 0.5) { t.set(s, { ['tay' + k]: 'nam' }, 0); t.to(s, { ['item' + k]: 1, duration: 0.15 }, 0); }          // đang cất: lấy ra
    this._stage(t, [k, o]);
    t.set(s, { ['tay' + o]: 'nam', ['gadget' + o]: 23, ['fan' + o]: 0, ['gadgetTurn' + o]: spin }, 0.05);
    t.to(s, { huong, ['carry' + k]: 0, ['carry' + o]: 0, ['aimL']: 1, ['aimR']: 1, ['bat' + k]: home.bat, ['cang' + k]: home.cang, ['bat' + o]: fanAt.bat, ['cang' + o]: fanAt.cang, ['itemZoom' + k]: z,
              ...down, cuoi: 0.4, mayL: 0.3, mayR: 0.3, duration: 0.55, ease: 'power2.out' }, 0);
    // ĐẾM: tay cầm xấp đưa sang chạm tay kia (tờ mới hiện trong tay kia), rồi về; miệng nhẩm một nhịp mỗi tờ.
    let a = 0.6;
    for (let n = 1; n <= RigSVG.COUNT_NOTES; n++, a += RigSVG.COUNT_EVERY) {
      t.to(s, { ['bat' + k]: meet.bat, ['cang' + k]: meet.cang, duration: RigSVG.COUNT_EVERY * 0.4, ease: 'power2.inOut' }, a);
      t.set(s, { ['fan' + o]: n }, a + RigSVG.COUNT_EVERY * 0.4);
      t.to(s, { ['bat' + k]: home.bat, ['cang' + k]: home.cang, duration: RigSVG.COUNT_EVERY * 0.4, ease: 'power2.inOut' }, a + RigSVG.COUNT_EVERY * 0.45);
      t.to(s, { mieng: 0.28, duration: 0.1, ease: 'sine.out', yoyo: true, repeat: 1 }, a + 0.05);
      t.to(s, { dauY: LOOK_DOWN.head + 1.5, duration: 0.1, ease: 'sine.out', yoyo: true, repeat: 1 }, a + 0.05);
    }
    // Đếm xong: nhìn lại tờ tiền một nhịp, gộp vào xấp (tay kia đưa tới tay cầm xấp, tờ rời tay lúc hai tay gặp nhau), ngẩng nhìn khách.
    const done = a + 0.35, merged = done + 0.55;
    t.to(s, { ['bat' + o]: join.bat, ['cang' + o]: join.cang, duration: 0.5, ease: 'power2.inOut' }, done);
    t.set(s, { ['fan' + o]: 0, ['gadget' + o]: 0 }, merged);
    t.to(s, { ['bat' + o]: N['bat' + o], ['cang' + o]: N['cang' + o], duration: 0.4, ease: 'power2.inOut' }, merged);
    t.set(s, { ['tay' + o]: 'mo' }, merged + 0.1);
    t.to(s, { ...look, dauY: 0, mieng: 0, cuoi: 0.9, duration: 0.4, ease: 'power2.inOut' }, merged - 0.1);
    this._deskGive(t, k, other, RigSVG.CHANGE_AT, null);
    return t;
  }

  /** NHẬN TIỀN THỐI từ `giver` (cùng nhịp với `giver.giveChange(this)`): nhìn họ đếm, rồi vươn tay nhận xấp tiền, gật cảm ơn. Cần xấp tiền đang cất (`items: { R: 'cash' }, itemsHidden: true`). */
  takeChange(giver) { return this._deskTakeLater('takeChange', giver, '[data-cash]', RigSVG.CHANGE_AT, RigSVG.CASH_ZOOM); }

  /**
   * ĐÓNG DẤU THẺ: thẻ tích điểm (`items: { L: 'stampcard' }`) giơ trước ngực, tay kia cầm con dấu (hiện trong tay) hạ xuống ô trống của thẻ, ẤN CHẶT
   * `STAMP_PRESS` giây (người nhún xuống theo tay), nhấc lên — một DẤU ĐỎ nằm lại trên thẻ —, ngắm lại. Có `other`: đưa thẻ cho họ (như `handOver`;
   * người nhận `takeCard(giver)`, có sẵn thẻ đang cất `items: { R: { kind: 'stampcard', stamped: true } }, itemsHidden: true`).
   */
  stampCard(other = null, { top = null } = {}) {
    const s = this.s, N = this.NGHI, k = this._heldWith('[data-stampcard]', 'auto', true);
    if (!k) throw new Error('[character] stampCard: this character is not holding a stamp card — createCharacter(host, { id, items: { L: "stampcard" } })');
    const p = k === 'R' ? 'L' : 'R', m = k === 'L' ? -1 : 1;
    if (this.holds[p] && s['item' + p] > 0.5) throw new Error('[character] stampCard: needs a free second hand for the stamp');
    const t = this.tl(), c = this.nv.coThan, cB = this.nv.coBanTay || 1, z = RigSVG.STAMP_ZOOM;
    const pair = other ? this._deskFaceOf(other, 'stampCard') : null, dir = pair ? pair.pair.dir : 0;
    const huong = pair ? dir * RigSVG.DESK_TURN : clamp(s.huong, -RigSVG.FACE_COUNTER, RigSVG.FACE_COUNTER), mine = this._poseGeo({ huong });
    const baseCard = mine[k].y + 58 * c + 14.5 * z * cB, cardAt = { x: HONG.x + m * 12 * c, y: baseCard + this._deskLift(top, baseCard, mine) }, cardPose = this._palmTo(k, cardAt, mine);
    const inkEl = this.el['item' + k].querySelector('[data-stampspot]');
    const ink = this._deskSpot({ ['item' + k]: 1, ['bat' + k]: cardPose.bat, ['cang' + k]: cardPose.cang, ['aim' + k]: 1, ['carry' + k]: 0, ['itemZoom' + k]: z, huong }, inkEl, [13.5, -16])
      || { x: cardAt.x + 13.5 * z * cB, y: cardAt.y - 26 * z * cB };
    const face = 14 * cB;                                                                   // mặt con dấu cách lòng bàn tay chừng ấy (khi dụng cụ chúc thẳng xuống)
    const hover = this._palmTo(p, { x: ink.x, y: ink.y - face - 24 * c }, mine), press = this._palmTo(p, { x: ink.x, y: ink.y - face + 1.2 * c }, mine);
    const away = this._palmTo(p, { x: ink.x + (m ? -m : 1) * 34 * c, y: ink.y - face - 14 * c }, mine), touch = this._palmTo(p, { x: ink.x, y: ink.y - face }, mine);
    const spin = this._spinDown(p, hover), look = this._lookAngles(ink, { huong });
    const showCard = this._lookAngles({ x: cardAt.x, y: cardAt.y - 20 * c }, { huong });
    const T = { press: 1.35, lift: 1.35 + RigSVG.STAMP_PRESS };
    const stowed = s['item' + k] <= 0.5;
    if (stowed) { t.set(s, { ['tay' + k]: 'nam' }, 0); t.to(s, { ['item' + k]: 1, duration: 0.15 }, 0); }          // đang cất: lấy ra
    this._stage(t, [k, p]);
    t.set(s, { ['tay' + p]: 'nam', ['gadget' + p]: 21, ['gadgetTurn' + p]: spin }, 0.05);
    t.to(s, { huong, ['carry' + k]: 0, ['carry' + p]: 0, aimL: 1, aimR: 1, ['bat' + k]: cardPose.bat, ['cang' + k]: cardPose.cang, ['itemZoom' + k]: z,
              ['bat' + p]: away.bat, ['cang' + p]: away.cang, ...look, cuoi: 0.35, mayL: 0.25, mayR: 0.25, duration: 0.55, ease: 'power2.out' }, 0);
    t.to(s, { ['bat' + p]: hover.bat, ['cang' + p]: hover.cang, duration: 0.5, ease: 'power2.inOut' }, 0.6);                   // dừng trên ô trống
    t.to(s, { ['bat' + p]: touch.bat, ['cang' + p]: touch.cang, duration: 0.22, ease: 'power3.in' }, 1.15);                    // hạ xuống: chạm thẻ
    t.to(s, { ['bat' + p]: press.bat, ['cang' + p]: press.cang, dauY: LOOK_DOWN.head, than: N.than + 1.5, duration: 0.14, ease: 'power2.out' }, T.press - 0.0);    // ẤN CHẶT
    t.set(s, { ['ink' + k]: 1 }, T.press + 0.05);                                                                              // dấu in lên thẻ (con dấu đang che)
    t.to(s, { ['bat' + p]: press.bat, ['cang' + p]: press.cang + 0.4, duration: RigSVG.STAMP_PRESS - 0.14, ease: 'none' }, T.press + 0.14);     // giữ
    t.to(s, { ['bat' + p]: hover.bat, ['cang' + p]: hover.cang, dauY: 0, than: N.than, duration: 0.3, ease: 'power2.out' }, T.lift);             // nhấc lên: lộ dấu đỏ
    // Ngắm dấu đỏ, gật nhẹ, cười.
    t.to(s, { ['bat' + p]: away.bat, ['cang' + p]: away.cang, duration: 0.4, ease: 'power2.inOut' }, T.lift + 0.45);
    t.to(s, { dauY: 5, cuoi: 0.9, duration: 0.25, ease: 'sine.inOut' }, T.lift + 0.5).to(s, { dauY: 0, duration: 0.3 }, T.lift + 0.95);
    const end = T.lift + 1.3;
    if (!other) {
      t.set(s, { ['gadget' + p]: 0, ['gadgetTurn' + p]: 0, ['tay' + p]: 'mo' }, end + 0.05);
      this._khep(t, 0.5, end, { ['ink' + k]: 1, ...(stowed ? { ['item' + k]: 0 } : {}) });
    } else {
      // Đưa thẻ cho họ: ngẩng nhìn khách, tay đóng dấu về nghỉ, tay cầm thẻ vươn ra.
      t.to(s, { ['bat' + p]: N['bat' + p], ['cang' + p]: N['cang' + p], ['itemZoom' + k]: z, duration: 0.4, ease: 'power2.inOut' }, end - 0.25);
      t.set(s, { ['gadget' + p]: 0, ['gadgetTurn' + p]: 0, ['tay' + p]: 'mo' }, end + 0.2);
      this._deskGive(t, k, other, RigSVG.STAMP_GIVE_AT, this._lookAngles(pair.face, { huong, up: RigSVG.PAIR_UP }));
    }
    return t;
  }

  /** NHẬN THẺ vừa đóng dấu từ `giver` (cùng nhịp với `giver.stampCard(this)`): nhìn họ đóng dấu, rồi vươn tay nhận thẻ. Cần thẻ đang cất (`items: { R: { kind: 'stampcard', stamped: true } }, itemsHidden: true`). */
  takeCard(giver) { return this._deskTakeLater('takeCard', giver, '[data-stampcard]', RigSVG.STAMP_GIVE_AT, RigSVG.STAMP_ZOOM); }

  /**
   * RÓT ĐỒ UỐNG: cốc đang cầm (`items: { L: 'cup' }`) giữ trước bụng, tay kia nhấc BÌNH (hiện trong tay) lên trên miệng cốc, nghiêng bình — một DÒNG NƯỚC
   * chảy thấy rõ từ vòi xuống cốc, MỨC NƯỚC trong cốc dâng từ đáy lên đầy (cốc nào cũng hiện thành cốc thuỷ tinh đựng nước) —, dựng bình lại, rồi chìa
   * cốc ra mời, cười, gật đầu. Xong cốc vẫn ở tay (đầy), sẵn sàng cho `handOver`.
   */
  pourDrink({ top = null } = {}) {
    const s = this.s, N = this.NGHI, c0 = this._heldWith('[data-cup]', 'auto', true);
    if (!c0) throw new Error('[character] pourDrink: this character is not holding a cup — createCharacter(host, { id, items: { L: "cup" } })');
    const p = c0 === 'R' ? 'L' : 'R', m = c0 === 'L' ? -1 : 1, sp = p === 'R' ? -1 : 1;             // `sp`: vòi bình quay về phía cốc (trên màn hình)
    if (this.holds[p] && s['item' + p] > 0.5) throw new Error('[character] pourDrink: needs a free second hand for the pitcher');
    const t = this.tl(), c = this.nv.coThan, cB = this.nv.coBanTay || 1, z = 1.2;
    const huong = clamp(s.huong, -RigSVG.FACE_COUNTER, RigSVG.FACE_COUNTER), mine = this._poseGeo({ huong });
    const baseCup = mine[c0].y + 76 * c, lift = this._deskLift(top, baseCup, mine), cupAt = { x: HONG.x + m * 4 * c, y: baseCup + lift }, cupPose = this._palmTo(c0, cupAt, mine);
    const mouthEl = this.el['item' + c0].querySelector('[data-mouth]');
    // Miệng cốc và mặt nước (đầy / cạn): cốc đứng thẳng trong bàn tay, miệng cách lòng bàn tay chừng 22 đơn vị phía trên, đáy 17 phía dưới.
    const mouth = this._deskSpot({ ['item' + c0]: 1, ['bat' + c0]: cupPose.bat, ['cang' + c0]: cupPose.cang, ['aim' + c0]: 1, ['carry' + c0]: 0, ['itemZoom' + c0]: z, huong }, mouthEl, [0, -17])
      || { x: cupAt.x + 2 * z * cB, y: cupAt.y - 22.1 * z * cB };
    const surface = (f) => mouth.y + (38.9 - 36.4 * f) * z * cB;                           // y mặt nước khi mức nước = f (0 = đáy, 1 = miệng)
    // Bình: vòi (-31, 0,5) quanh lòng bàn tay, nghiêng POUR_TIP độ → cách lòng bàn tay (−29,4 · sp, +13,7) đơn vị bàn tay; vòi nằm trên miệng cốc `gap`.
    const tip = RigSVG.POUR_TIP, r = tip * RAD, spout = [-31 * Math.cos(r) - 9.5 * Math.sin(r), 31 * Math.sin(r) - 9.5 * Math.cos(r)];
    const gap = 17 * c, palmP = { x: mouth.x - sp * Math.abs(spout[0]) * cB, y: mouth.y - gap - spout[1] * cB };
    const pourPose = this._palmTo(p, palmP, mine), readyPose = this._palmTo(p, { x: palmP.x + sp * -14 * c, y: palmP.y - 6 * c }, mine);
    const spin = this._spinDown(p, pourPose), L0 = (surface(0) - (palmP.y + spout[1] * cB)) / cB, L1 = (surface(1) - (palmP.y + spout[1] * cB)) / cB;
    const look = this._lookAngles({ x: mouth.x, y: mouth.y + 6 * c }, { huong });
    const offerAt = { x: HONG.x + m * 50 * c, y: mine[c0].y + 48 * c + lift }, offerPose = this._palmTo(c0, offerAt, mine);
    const offerLook = this._lookAngles({ x: offerAt.x + m * 20 * c, y: offerAt.y - 40 * c }, { huong });
    const T = { tip: 0.95, pour: 1.25 }, D = RigSVG.POUR_SECONDS, tEnd = T.pour + D;
    if (s['item' + c0] <= 0.5) { t.set(s, { ['tay' + c0]: 'nam' }, 0); t.to(s, { ['item' + c0]: 1, duration: 0.15 }, 0); }          // đang cất: lấy ra (cốc ở lại trong tay)
    this._stage(t, [c0, p]);
    t.set(s, { ['brew' + c0]: 0, ['tay' + p]: 'nam', ['gadget' + p]: 22, ['gadgetTurn' + p]: spin, ['tip' + p]: 0, ['pour' + p]: 0 }, 0.05);
    t.to(s, { huong, ['carry' + c0]: 0, ['carry' + p]: 0, aimL: 1, aimR: 1, ['bat' + c0]: cupPose.bat, ['cang' + c0]: cupPose.cang, ['itemZoom' + c0]: z,
              ['bat' + p]: readyPose.bat, ['cang' + p]: readyPose.cang, ...look, cuoi: 0.4, mayL: 0.25, mayR: 0.25, duration: 0.6, ease: 'power2.out' }, 0);
    t.to(s, { ['bat' + p]: pourPose.bat, ['cang' + p]: pourPose.cang, ['tip' + p]: tip, dauY: LOOK_DOWN.head, duration: 0.5, ease: 'power2.inOut' }, T.tip - 0.3);   // nghiêng bình trên miệng cốc
    t.to(s, { ['pour' + p]: L0, duration: 0.18, ease: 'power1.out' }, T.pour - 0.05);                                        // nước bắt đầu chảy
    t.to(s, { ['pour' + p]: L1, ['brew' + c0]: 1, duration: D, ease: 'none' }, T.pour);                                      // dâng dần tới đầy
    t.to(s, { ['tip' + p]: tip + 6, duration: D, ease: 'sine.inOut' }, T.pour);
    t.to(s, { ['pour' + p]: 0, ['tip' + p]: 0, duration: 0.25, ease: 'power2.in' }, tEnd);                                    // dựng bình, dòng nước dứt
    t.to(s, { ['bat' + p]: readyPose.bat, ['cang' + p]: readyPose.cang, dauY: 0, duration: 0.4, ease: 'power2.inOut' }, tEnd + 0.1);
    t.to(s, { ['bat' + p]: N['bat' + p], ['cang' + p]: N['cang' + p], duration: 0.4, ease: 'power2.inOut' }, tEnd + 0.5);
    t.set(s, { ['gadget' + p]: 0, ['gadgetTurn' + p]: 0, ['tay' + p]: 'mo' }, tEnd + 0.9);
    // Chìa cốc ra mời: tay cầm cốc đưa ra, cười, gật.
    const offer = tEnd + 0.45;
    t.to(s, { ['bat' + c0]: offerPose.bat, ['cang' + c0]: offerPose.cang, ...offerLook, cuoi: 1, mieng: 0.2, mayL: 0.55, mayR: 0.55, duration: 0.5, ease: 'power2.inOut' }, offer);
    t.to(s, { dauY: 6, duration: 0.25, ease: 'sine.inOut' }, offer + 0.7).to(s, { dauY: 0, mieng: 0, duration: 0.3, ease: 'sine.inOut' }, offer + 1.15);
    this._khep(t, 0.55, offer + 1.55, { ['brew' + c0]: 1, ['item' + c0]: 1 });
    return t;
  }

  /**
   * LAU QUẦY: cầm khăn (hiện trong tay) áp xuống mặt quầy `target` (`{ x, y }` trong khung, `set.targetPoint(…)`; bỏ trống: chỗ ước chừng trước bụng) và lau
   * thành những VÒNG RỘNG trong `hold` giây, thân cúi về phía quầy, đầu cúi nhìn chỗ lau; xong gấp khăn lại hai lần (tay kia giúp) và nhét về bên hông.
   */
  wipeCounter(hold = 2, target = null) {
    if (!(Number.isFinite(hold) && hold >= 0.8 && hold <= 12)) throw new Error(`[character] wipeCounter: hold must be a number of seconds between 0.8 and 12, got ${JSON.stringify(hold)}`);
    const s = this.s, N = this.NGHI, busy = (side) => this.holds[side] && s['item' + side] > 0.5;
    const k = this._freeHand(), o = k === 'R' ? 'L' : 'R', m = k === 'L' ? -1 : 1;
    if (busy(k)) throw new Error('[character] wipeCounter: needs a free hand for the cloth');
    const t = this.tl(), c = this.nv.coThan, cB = this.nv.coBanTay || 1;
    const huong = clamp(s.huong, -RigSVG.FACE_COUNTER, RigSVG.FACE_COUNTER), mine = this._poseGeo({ huong });
    const top = this._lookPoint(target) || { x: HONG.x + m * 28 * c, y: mine[k].y + 66 * c };
    const rx = 24 * c, ry = 7 * c, below = 14 * cB;                                           // khăn nằm dưới nắm tay: tâm khăn cách lòng bàn tay chừng ấy
    const centre = { x: top.x, y: top.y - below };
    const at = (th) => this._palmTo(k, { x: centre.x + rx * Math.cos(th), y: centre.y + ry * Math.sin(th) }, mine);
    const first = at(0), spin = this._spinDown(k, first), look = this._lookAngles(top, { huong });
    const loops = Math.max(1, hold / RigSVG.WIPE_LOOP), steps = Math.round(loops * 12), seg = hold / steps;
    const lean = Math.sign(top.x - HONG.x) || m;
    this._stage(t, [k]);
    t.set(s, { ['tay' + k]: 'nam', ['gadget' + k]: 20, ['gadgetTurn' + k]: spin, ['fold' + k]: 0 }, 0.05);
    t.to(s, { huong, ['carry' + k]: 0, ['bat' + k]: first.bat, ['cang' + k]: first.cang, ...look, dauY: Math.max(look.dauY || 0, LOOK_DOWN.head), than: N.than + lean * 3, cuoi: 0.25, mayL: 0.2, mayR: 0.2, duration: 0.55, ease: 'power2.out' }, 0);
    // Lau: hai vòng rộng trên mặt quầy (elip, tay đi theo vòng — mỗi đoạn một nhịp đều).
    for (let n = 1; n <= steps; n++) {
      const pose = at(2 * Math.PI * n / 12);
      t.to(s, { ['bat' + k]: pose.bat, ['cang' + k]: pose.cang, duration: seg, ease: 'none' }, 0.55 + (n - 1) * seg);
    }
    const wiped = 0.55 + hold;
    t.to(s, { than: N.than, duration: 0.3 }, wiped);
    // Gấp khăn: nhấc lên trước ngực, tay kia tới giúp, gấp (khăn thu lại thành miếng dày), vuốt phẳng, nhét về bên hông.
    const chest = this._palmTo(k, { x: HONG.x + m * 8 * c, y: mine[k].y + 40 * c }, mine), help = this._palmTo(o, { x: HONG.x - m * 12 * c, y: mine[k].y + 38 * c }, mine);
    const upright = chuanHoaGoc(this._spinDown(k, chest) + 90);
    t.to(s, { ['bat' + k]: chest.bat, ['cang' + k]: chest.cang, ['gadgetTurn' + k]: upright, dauY: LOOK_DOWN.head - 2, duration: 0.5, ease: 'power2.inOut' }, wiped);
    t.set(s, { ['tay' + o]: 'xoe' }, wiped + 0.2);
    t.to(s, { aimL: 1, aimR: 1, ['bat' + o]: help.bat, ['cang' + o]: help.cang, duration: 0.45, ease: 'power2.out' }, wiped + 0.15);
    t.to(s, { ['fold' + k]: 0.5, ['bat' + o]: help.bat - 6, duration: 0.3, ease: 'sine.inOut' }, wiped + 0.75);
    t.to(s, { ['fold' + k]: 1, ['bat' + o]: help.bat, duration: 0.3, ease: 'sine.inOut' }, wiped + 1.15);
    const tuck = this._palmTo(k, { x: HONG.x + m * 34 * c, y: mine[k].y + 74 * c }, mine);
    t.to(s, { ['bat' + o]: N['bat' + o], ['cang' + o]: N['cang' + o], dauY: 0, duration: 0.4, ease: 'power2.inOut' }, wiped + 1.55);
    t.set(s, { ['tay' + o]: 'mo' }, wiped + 1.7);
    t.to(s, { ['bat' + k]: tuck.bat, ['cang' + k]: tuck.cang, duration: 0.45, ease: 'power2.inOut' }, wiped + 1.6);
    t.set(s, { ['gadget' + k]: 0, ['gadgetTurn' + k]: 0, ['fold' + k]: 0, ['tay' + k]: 'mo' }, wiped + 2.1);                 // khăn nhét vào thắt lưng, trong tay vừa hạ xuống
    this._khep(t, 0.45, wiped + 2.15);
    return t;
  }

  /**
   * GHI CHÉP: tay kia đưa tới món đồ đang cầm (bìa kẹp hồ sơ, điện thoại) và viết vài nét, đầu cúi xuống nhìn.
   * `dur` = số giây viết. Không cầm gì thì viết lên lòng bàn tay trái.
   */
  write(dur = 1.2) {
    const t = this.tl(), s = this.s, N = this.NGHI;
    const held = ['L', 'R'].filter((k) => this.holds[k] && s['item' + k] > 0.5), pad = held[0] || 'L', pen = pad === 'L' ? 'R' : 'L', m = pen === 'L' ? -1 : 1;
    this._openUp(t);
    // Tay giữ "tờ giấy": đang cầm đồ thì ở yên dáng bưng; không thì đưa bàn tay ngửa ra trước bụng.
    if (!held.length) { t.set(s, { ['tay' + pad]: 'mo' }, 0); t.to(s, { ['bat' + pad]: 14, ['cang' + pad]: -85, duration: 0.3, ease: 'power2.out' }, 0); }
    // Tay viết: ngón trỏ làm bút, đưa ngang qua trước bụng tới chỗ tay kia.
    t.set(s, { ['tay' + pen]: 'chi' }, 0.1);
    t.to(s, { ['bat' + pen]: 20, ['cang' + pen]: -104, dauY: 7, dau: N.dau - m * 4, nhinY: 2.4, nhinX: -m * 1.2, mayL: 0.2, mayR: 0.2, cuoi: 0.3, duration: 0.35, ease: 'power2.out' }, 0);
    const strokes = Math.max(2, Math.round(dur / 0.15));
    for (let n = 0; n < strokes; n++) {
      // Nét bút: cẳng tay rung nhỏ, và cứ bốn nét thì dịch sang một chút như xuống dòng.
      t.to(s, { ['cang' + pen]: -104 + (n % 2 ? 4 : -5) - (n % 8 < 4 ? 0 : 6), ['bat' + pen]: 20 + (n % 2 ? 1.5 : -1.5), duration: dur / strokes, ease: 'sine.inOut' }, 0.38 + n * dur / strokes);
    }
    if (dur > 0.8) this._chop(t, 0.38 + dur * 0.6);
    this._khep(t, 0.45, 0.42 + dur);
    return t;
  }

  // Tay đang cầm ĐIỆN THOẠI (món đồ có mặt lưng `data-back`, hoặc bất kỳ món đồ nào nếu không tìm ra), hoặc tay rảnh.
  _phoneHand(side = 'auto') {
    if (side === 'L' || side === 'R') return side;
    const held = ['R', 'L'].filter((k) => this.holds[k] && this.s['item' + k] > 0.5);
    return held.find((k) => this.el['item' + k].querySelector('[data-back]')) || held[0] || this._freeHand();
  }

  // Khẩu hình cho một câu nói CHÈN vào giữa một động tác (gọi điện), bắt đầu ở `at`.
  _talkInto(t, text, dur, at, mood) {
    const s = this.s, tone = this._tone(mood), soAm = this._soAm(text, dur), nhip = dur / soAm, talk = gsap.timeline();
    t.to(s, { ...tone.start, duration: 0.2 }, at);
    this._khauHinh(talk, soAm, nhip, tone.corner);
    t.add(talk, at);
    t.to(s, { mieng: 0, duration: 0.15 }, at + dur);
  }

  /**
   * GỌI ĐIỆN: áp điện thoại lên má (đầu nghiêng về phía nó, mặt lưng điện thoại quay ra ngoài), nói `text` trong `dur`
   * giây rồi hạ xuống. `text` bỏ trống = đang NGHE: gật nhẹ, "ừ, ừ". Không cầm điện thoại thì làm điệu bộ bằng tay rảnh.
   * Đầu chibi to, tay ngắn: nhìn thẳng thì bàn tay không với tới tai — áp lên MÁ, đầu nghiêng xuống đón, là cách vẽ
   * quen thuộc của hoạt hình. Đang quay nghiêng thì quay về phía người xem như `drink`.
   *   rig.call('Alo, phòng khám VetGo xin nghe.', 2.2)      rig.call(null, 2, { mood: 'worried' })
   */
  call(text = null, dur = 2.4, { mood = null, side = 'auto' } = {}) {
    const t = this.tl(), s = this.s, k = this._phoneHand(side), held = this.holds[k] && s['item' + k] > 0.5, was = s['phone' + k];
    if (Math.abs(s.huong) > 0.02) t.to(s, { huong: 0, duration: 0.3, ease: 'sine.inOut' }, 0);
    // Có điện thoại: dùng thế áp máy (kênh `phone`), rồi trả về như lúc bắt đầu — gọi khi đang `phoneUp` thì máy vẫn ở má.
    // Tay không: làm điệu bộ — nắm tay áp lên má với đúng dáng ấy.
    if (held) t.to(s, { ['phone' + k]: 1, ['carry' + k]: 0, vai: this.NGHI.vai - 3, nhinX: (k === 'L' ? 1 : -1) * 1.2, duration: was >= 1 ? 0.01 : 0.5, ease: 'power2.inOut' }, 0);
    else {
      const m = k === 'L' ? -1 : 1;
      t.set(s, { ['tay' + k]: 'nam' }, 0);
      t.to(s, { ['bat' + k]: CALL_POSE[0], ['cang' + k]: CALL_POSE[1], ['aim' + k]: 1, dau: this.NGHI.dau + m * CALL_TILT, dauX: m * CALL_TILT * 0.4, duration: 0.5, ease: 'power2.inOut' }, 0);
    }
    const at = 0.55;
    if (text) this._talkInto(t, text, dur, at, mood);
    else {
      // Đang nghe: gật nhẹ đều đều, mắt liếc xuống, miệng hé "ừ" ở mỗi cái gật.
      const nods = Math.max(1, Math.round(dur / 0.9));
      for (let n = 0; n < nods; n++) {
        const a = at + 0.15 + n * dur / nods;
        t.to(s, { dauY: 3, mieng: 0.12, duration: 0.22, ease: 'sine.out' }, a).to(s, { dauY: 0, mieng: 0, duration: 0.3, ease: 'sine.inOut' }, a + 0.22);
      }
      t.to(s, { nhinY: 0.8, mayL: mood ? 0 : 0.25, mayR: mood ? 0 : 0.25, duration: 0.3 }, at);
    }
    if (dur > 1.2) this._chop(t, at + dur * 0.5);
    this._khep(t, 0.5, at + dur, held ? { ['phone' + k]: was } : {});
    return t;
  }

  /**
   * NHẤC MÁY và GIỮ: áp điện thoại (món đồ đang cầm) lên má rồi để nguyên đó — các động tác sau (nói, nói theo giọng
   * đọc `speakCues`, gật đầu…) diễn trong lúc áp máy, tay kia vẫn cử chỉ được. `phoneDown()` để đặt máy xuống.
   */
  phoneUp(side = 'auto') {
    const t = this.tl(), s = this.s, k = this._phoneHand(side);
    if (!(this.holds[k] && s['item' + k] > 0.5)) throw new Error('[character] phoneUp: the character is not holding anything in hand ' + k + ' — give it a phone: createCharacter(host, { id, items: { R: "phone" } })');
    t.to(s, { ['phone' + k]: 1, ['carry' + k]: 0, duration: 0.5, ease: 'power2.inOut' }, 0);
    t.to(s, { nhinX: (k === 'L' ? 1 : -1) * 1.2, duration: 0.3 }, 0.1);
    return this._khep(t, 0.3, 0.5, { ['phone' + k]: 1 });
  }

  /** ĐẶT MÁY xuống sau `phoneUp`: điện thoại về lại tay ở dáng cầm. */
  phoneDown() {
    const t = this.tl();
    return this._khep(t, 0.5, 0, { phoneL: 0, phoneR: 0 });
  }

  /**
   * KHOE MÀN HÌNH điện thoại: giơ nó lên cạnh mặt, quay màn hình về người xem và PHÓNG TO cho đọc được (giao diện app
   * — `items: { R: { kind: 'phone', image: 'app.png' } }`), cười, giữ `hold` giây rồi hạ xuống. Phải đang cầm một món đồ.
   */
  showPhone(hold = 1.8, { side = 'auto', zoom = 2.6 } = {}) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this._phoneHand(side), m = k === 'L' ? -1 : 1;
    if (!(this.holds[k] && s['item' + k] > 0.5)) throw new Error('[character] showPhone: the character is not holding anything in hand ' + k + ' — give it a phone: createCharacter(host, { id, items: { R: "phone" } })');
    this._stage(t, [k]);
    t.to(s, { ['carry' + k]: 0, duration: 0.15 }, 0);
    t.to(s, { ['bat' + k]: SHOW_POSE[0], ['cang' + k]: SHOW_POSE[1], ['itemZoom' + k]: zoom, dau: N.dau - m * 4, dauX: -m * 2, nhinX: m * 1.4, cuoi: 1, mayL: 0.5, mayR: 0.5,
              duration: 0.5, ease: 'back.out(1.4)' }, 0);
    // Một cái lắc nhẹ món đồ lúc vừa giơ lên — "đây này" — rồi đứng yên cho người xem đọc.
    t.to(s, { ['itemTilt' + k]: 6, duration: 0.18, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.5);
    t.to(s, { nhinX: 0, duration: 0.3 }, 0.9);                 // liếc sang màn hình rồi nhìn lại người xem
    if (hold > 1) this._chop(t, 0.5 + hold * 0.6);
    this._khep(t, 0.5, 0.5 + hold);
    return t;
  }

});
