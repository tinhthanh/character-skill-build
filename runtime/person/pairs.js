// runtime/person/pairs.js — two people together: high five, hug, pat on the shoulder, whisper, medicine bag, notify, throw a ball, tug toy, kneel.
// Methods of `RigSVG`, installed by runtime/rig-svg.js: `this` is the rig, `RigSVG` its class.

import { KHUNG, DOI_Y, HONG, VAI, DAI, KNEEL_SHIN, clamp, RAD, pha, mix } from './shared.js';

export default (RigSVG) => mix(RigSVG, class {
  // ═══════════════════════════════════════════════ ĐỢT 38 C — HAI NGƯỜI VỚI NHAU: đập tay, ôm, vỗ vai, thì thầm, đưa túi thuốc
  // Mọi động tác ở đây nhận NGƯỜI KIA (rig, hay mỏ neo `{ centerX, live }` của conversation — chỗ họ đứng ở lượt này) và tính mọi
  // điểm (chỗ hai bàn tay đập nhau, lưng người kia, vai, tai, quai túi) TRÊN MÀN HÌNH từ trạng thái + số đo khung của cả hai, như
  // `_meetAngles` — không đọc tư thế đang vẽ lúc dựng. Hai bên dùng cùng một công thức đối xứng (theo người BÊN TRÁI / BÊN PHẢI trên
  // màn hình), nên cùng ra một điểm dù khác chiều cao (người lớn + trẻ con) hay đứng xa gần máy khác nhau.
  static FIVE_TURN = 0.2;          // đập tay: thân chỉ quay nhẹ về nhau — quay 3/4 thì tay phía người kia là tay XA, giơ lên đi ngang qua mặt
  static FIVE_AT = 0.55;           // giây hai lòng bàn tay chạm nhau; giữ áp tay tới FIVE_AT + FIVE_HOLD
  static FIVE_HOLD = 1.05;
  static FIVE_HAIR = 1.2;          // mép đầu tính cả tóc (bán kính mặt × chừng ấy): hai bàn tay đập nhau ngoài mép ấy, không khuất sau đầu ai
  static FIVE_UP = 0.3;            // điểm đập tay cao hơn tâm hai khuôn mặt chừng ấy bán kính đầu — trên đuôi tóc, mép tóc hai bên
  static HUG_TURN = 0.45;          // ôm: thân quay 3/4 về nhau, ĐẦU quay ngược lại phần lớn — hai khuôn mặt áp má, vẫn hướng ra người xem
  static HUG_HEAD = 0.75;
  static HUG_LEAN = 5;            // độ ngả người vào nhau
  static HUG_CLOSE = 0.75;        // ôm: hai tâm người cách nhau chừng ấy tổng bán kính hai đầu — hai đầu kề nhau, không đầu nào che mặt người kia
  static HUG_ABOVE = 80;          // người cao hơn hạ tới khi vai còn cao hơn vai người kia chừng ấy đơn vị — đầu người lớn trên đầu đứa bé
  static HUG_BODY = 1.5;          // … và hai thân cách nhau ít nhất chừng ấy tổng nửa bề ngang thân
  static HUG_HOLD = 1.9;           // giây ôm (lắc nhẹ hai nhịp)
  static PAT_TURN = 0.4;
  static PAT_OUT = 8; static PAT_DOWN = 17;   // vỗ vai: lòng bàn tay ở mép ngoài đầu vai người kia (đơn vị khung của họ)
  static PAT_BODY_44A = 2.2;      // vỗ vai: bước tới nhưng hai thân còn cách nhau chừng ấy tổng nửa bề ngang thân (không đứng đè lên người kia)
  static WHISPER_TURN = 0.5;
  static WHISPER_GAP = 0.12;      // miệng dừng trước tai người nghe chừng ấy bán kính đầu — bàn tay khum nằm trong khoảng ấy, không khuất sau đầu họ
  static WHISPER_TALK = 2.0;       // giây thì thầm (miệng mấp máy)
  static BAG_TURN = 0.3;
  static CROUCH_MAX = 0.32;        // hạ người: khuỵu gối tới chừng ấy `seat` — sâu hơn thì đọc thành ngồi ghế vô hình, nên quỳ một gối
  static PAIR_UP = 1.5;             // nhìn người kia: được ngẩng hẳn (trẻ con nhìn lên người lớn đứng sát — `LOOK_UP` 0,6 chỉ tới ~19°, 1,5 tới ~48°)
  static BAG_ZOOM = 1.5;           // túi thuốc phóng to lúc trao — đọc được dấu cộng ở cảnh trung hai người
  static BAG_AT = 1.25;            // giây túi thuốc sang tay người nhận (`handOverBag` / `takeBag` cùng nhịp)

  // HÌNH HỌC CỦA CẶP. `me(p)` / `them(p)`: điểm trong hệ `_aimOf` của mình / của người kia → màn hình { X, Y }; `back(P)`: màn hình
  // → hệ của mình. `dir`: người kia ở bên nào (−1 trái, +1 phải). `u` / `tu`: px mỗi đơn vị khung của mình / của họ.
  _pair(anchor, name) {
    const other = anchor && anchor.live ? anchor.live : anchor;
    if (!(other instanceof RigSVG) || other === this) throw new Error(`[character] ${name}(other): other must be another person rig (createCharacter(...).rig), not ${other === this ? 'the same character' : JSON.stringify(typeof other)}`);
    const frame = (rig) => { const r = rig.svg.getBoundingClientRect(), u = Math.min(r.width / KHUNG.w, r.height / KHUNG.h) || 1; return { u, top: r.top + (r.height - KHUNG.h * u) / 2 }; };
    const a = frame(this), b = frame(other), s = this.s, os = other.s;
    const myX = this.centerX(), theirX = typeof anchor.centerX === 'function' ? anchor.centerX() : other.centerX();
    return {
      other, dir: theirX < myX ? -1 : 1, u: a.u, tu: b.u, myX, theirX,
      me: (p) => ({ X: myX + (p.x - KHUNG.w / 2) * a.u, Y: a.top + (p.y + (s.y || 0) + DOI_Y) * a.u }),
      them: (p) => ({ X: theirX + (p.x - KHUNG.w / 2) * b.u, Y: b.top + (p.y + (os.y || 0) + DOI_Y) * b.u }),
      back: (P) => ({ x: KHUNG.w / 2 + (P.X - myX) / a.u, y: (P.Y - a.top) / a.u - (s.y || 0) - DOI_Y }),
      backThem: (P) => ({ x: KHUNG.w / 2 + (P.X - theirX) / b.u, y: (P.Y - b.top) / b.u - (os.y || 0) - DOI_Y }),
    };
  }

  // NGƯỜI CÙNG DIỄN (`pairFront`): số thứ tự trong `rig.pairList`, dùng lại mục cũ cho cùng người (`sequence()` dựng mỗi bước hai lần).
  _pairSlot(other) {
    const list = this.pairList || (this.pairList = []);
    let n = list.indexOf(other);
    if (n < 0) { list.push(other); n = list.length - 1; }
    return n;
  }

  // DÁNG CỦA RIG NÀY ở một tư thế cho trước — hướng thân `huong`, khuỵu gối `seat` / quỳ `kneel` (mặc định ĐỨNG: lúc dựng bước của một
  // người, trạng thái của NGƯỜI KIA là một khung cũ bất kỳ — đọc `seat` của họ thì hai bên tính ra hai điểm khác nhau), ngả thân `lean` độ (quanh hông, như kênh `than`),
  // dời ngang `step` đơn vị (bước tới): hai vai, tâm mặt (+ bán kính), miệng, hông, eo, trong hệ `_aimOf` của chính nó.
  _poseGeo({ huong = this.s.huong, seat = 0, kneel = 0, lean = 0, step = 0, pitch = 0 } = {}) {
    const s = this.s, was = [s.huong, s.seat, s.kneel];
    s.huong = huong; s.seat = seat; s.kneel = kneel;
    let sh, face, hip;
    try {
      sh = { L: { x: this._shoulderX('L'), y: this._shoulderY() }, R: { x: this._shoulderX('R'), y: this._shoulderY() } };
      face = this._faceCentre(huong); hip = { x: HONG.x, y: HONG.y + this.hangChan() + this._lowered() };
    } finally { s.huong = was[0]; s.seat = was[1]; s.kneel = was[2]; }
    const c = Math.cos(lean * RAD), n = Math.sin(lean * RAD);
    const turn = (p) => { const dx = p.x - hip.x, dy = p.y - hip.y; return { ...p, x: hip.x + dx * c - dy * n + step, y: hip.y + dx * n + dy * c }; };
    const r = face.r, side = Math.sign(huong) || 0;
    // Miệng: dưới tâm mặt ~0,42 bán kính, trượt về phía đang quay (nét mặt dồn sang bên ấy khi quay 3/4).
    const mouth = turn({ x: face.x + side * Math.min(1, Math.abs(huong)) * r * 0.42, y: face.y + r * 0.42 + (RigSVG.PITCH_SHIFT * this.nv.coDau + 3) * this.nv.coThan * pitch });
    return { L: turn(sh.L), R: turn(sh.R), face: { ...turn(face), r }, mouth, hip: { x: hip.x + step, y: hip.y }, lean, step,
             waist: turn({ x: HONG.x, y: hip.y - 22 * this.nv.coThan }), torso: (hip.y - sh.L.y), half: 27 * this.nv.coThan * (1 - 0.35 * Math.min(1, Math.abs(huong))) };
  }

  // HẠ NGƯỜI XUỐNG `units` đơn vị khung (người lớn với tới trẻ con): ít thì khuỵu gối (`seat` ≤ `CROUCH_MAX` — sâu hơn thì thành ngồi trên ghế
  // vô hình), nhiều thì QUỲ một gối (`seat` 1 + `kneel` 1). Trả { seat, kneel, drop } — `drop`: thật sự hạ bao nhiêu.
  _lowerBy(units) {
    const nv = this.nv, perSeat = DAI.dui * nv.daiDui * nv.coChan * 0.72, kneelAll = perSeat + DAI.ong * nv.daiOng * nv.coChan * KNEEL_SHIN;
    if (units <= 2) return { seat: 0, kneel: 0, drop: 0 };
    if (units <= perSeat * RigSVG.CROUCH_MAX) { const seat = units / perSeat; return { seat, kneel: 0, drop: seat * perSeat }; }
    return { seat: 1, kneel: 1, drop: kneelAll };
  }

  // Góc tay để LÒNG BÀN TAY (điểm đo của tools/acting_check.py: 10 đơn vị quá cổ tay) tới `p`, từ vai ở dáng `geo` (đã ngả `lean`
  // độ — góc bắp tay trừ đi phần thân ngả, vì cánh tay xoay theo thân). Góc trên màn hình: dùng với `aim` = 1.
  _palmTo(k, p, geo, drawn44a = false) {
    // Lòng bàn tay cách cổ tay 10 đơn vị CỦA BÀN TAY — đổi ra đơn vị khung theo cỡ thật của bàn tay (trẻ con tay to so với thân), bỏ phần
    // phóng to bàn tay đang có (`handZoom`) lúc dựng.
    const m = this.el['coTay' + k] && this.el['coTay' + k].getScreenCTM && this.el['coTay' + k].getScreenCTM(), r = this.svg.getScreenCTM && this.svg.getScreenCTM();
    const ratio = m && r && Math.hypot(r.a, r.b) ? Math.hypot(m.a, m.b) / Math.hypot(r.a, r.b) / (this.s['handZoom' + k] || 1) : this.nv.coThan;
    const sh = geo[k], hand = 10 * (Number.isFinite(ratio) && ratio > 0 ? ratio : this.nv.coThan);
    // Đợt 44 A: cánh tay VẼ trong nhóm thân (`than` co theo `coThan`), còn `_armTo` tính với độ dài tay chưa co — người có thân nhỏ
    // hơn 1 (y tá, dược sĩ, các chủ nuôi đợt 42 B: 0,92) thì bàn tay dừng ngắn ~8 % quãng từ vai: hai người cùng đưa tay tới một
    // điểm (đưa túi thuốc) mà hai bàn tay cách nhau ~2 % chiều cao, túi nhảy lúc sang tay. Phóng điểm đích quanh vai theo 1 / coThan.
    // Chỉ các động tác HAI NGƯỜI đợt 38 C (`drawn44a`): động tác quầy đợt 39 A đã chỉnh hằng số theo lời giải cũ.
    const c = drawn44a ? this.nv.coThan || 1 : 1, arm = (x, y) => this._armTo(k, sh.x + (x - sh.x) / c, sh.y + (y - sh.y) / c, sh.x, sh.y);
    let a = arm(p.x, p.y);
    for (let n = 0; n < 2; n++) a = arm(p.x - Math.cos(a.dir * RAD) * hand, p.y - Math.sin(a.dir * RAD) * hand);
    return { bat: a.bat + (k === 'R' ? 1 : -1) * geo.lean, cang: a.cang };
  }

  // Dáng của NGƯỜI KIA trong động tác cặp của họ (cùng hằng số, cùng phép tính) — ở hệ của họ, rồi đổi ra màn hình.
  static _screenGeo(rig, toScreen, geo) {
    const P = (p) => toScreen(p);
    return { L: P(geo.L), R: P(geo.R), face: { ...P(geo.face), r: geo.face.r }, mouth: P(geo.mouth), hip: P(geo.hip), waist: P(geo.waist), torso: geo.torso, half: geo.half };
  }

  /**
   * ĐẬP TAY (high five) với người kia `other`: hai người quay nhẹ về nhau, giơ bàn tay phía người kia lên lấy đà rồi đập vào nhau ở
   * một điểm GIỮA hai người, ngang đầu (chung cho cả hai, dù khác chiều cao), nảy người một cái, cười tươi, áp tay ~1 s rồi buông.
   * Chạy cùng nhịp với `other.highFive(this)` (`together`). Tay ấy đang cầm đồ thì dùng tay kia.
   */
  highFive(other) {
    const pair = this._pair(other, 'highFive'), o = pair.other, dir = pair.dir, t = this.tl(), s = this.s, N = this.NGHI;
    const k = this._holdsFree(dir > 0 ? 'R' : 'L');
    let mine = this._poseGeo({ huong: dir * RigSVG.FIVE_TURN });
    const theirs = RigSVG._screenGeo(o, pair.them, o._poseGeo({ huong: -dir * RigSVG.FIVE_TURN }));
    const me = RigSVG._screenGeo(this, pair.me, mine);
    // ĐIỂM ĐẬP TAY (màn hình): giữa khoảng trống hai cái đầu (mép phải đầu người bên trái … mép trái đầu người bên phải), ngang tâm
    // hai khuôn mặt, nhích lên một chút. Hai bàn tay ngoài hai cái đầu — đầu chibi to, đập ngay giữa hai tâm thì tay chìm vào mặt.
    const [left, right] = dir > 0 ? [me, theirs] : [theirs, me], [lu, ru] = dir > 0 ? [pair.u, pair.tu] : [pair.tu, pair.u];
    // Theo TẦM TAY: điểm ngang chia khoảng trống theo tỉ lệ tầm tay hai người (trẻ con tay ngắn — gần người lớn hơn), và không cao quá
    // chỗ người nào với tới (0,92 tầm tay tính từ vai) — trẻ con không với tới ngang đầu người lớn thì đập thấp xuống.
    const [lRig, rRig] = dir > 0 ? [this, o] : [o, this];
    const reachOf = (rig, unit) => (DAI.canhTay * rig.nv.daiCanhTay + DAI.cangTay * rig.nv.daiCangTay) * unit * 0.92;
    const Rl = reachOf(lRig, lu), Rr = reachOf(rRig, ru), eL = left.face.X + RigSVG.FIVE_HAIR * left.face.r * lu, eR = right.face.X - RigSVG.FIVE_HAIR * right.face.r * ru;
    // Mỗi người có một chỗ "giơ tay" tự nhiên (trên vai, chếch về phía người kia); điểm đập là trung bình của hai chỗ ấy, nặng về phía
    // người tay NGẮN hơn (trọng số 1 / tầm²) — người lớn hạ tay xuống chỗ đứa bé giơ tới, không phải đứa bé với lên ngang đầu người lớn.
    const raised = (S, R, side) => ({ X: S.X + side * 0.5 * R, Y: S.Y - 0.78 * R });
    const pl = raised(left.R, Rl, 1), pr = raised(right.L, Rr, -1), wl = 1 / (Rl * Rl), wr = 1 / (Rr * Rr);
    const spot = { X: (pl.X * wl + pr.X * wr) / (wl + wr), Y: Math.max((pl.Y * wl + pr.Y * wr) / (wl + wr), (left.face.Y + right.face.Y) / 2 - RigSVG.FIVE_UP * (left.face.r * lu + right.face.r * ru) / 2) };
    if (eL < eR) spot.X = clamp(spot.X, eL, eR);
    else {
      // Hai đầu CHỒNG nhau theo bề ngang (đứa bé đứng sát dưới người lớn): đập tay ở mép đầu của người THẤP hơn, phía người kia — tay
      // người lớn hạ xuống tới đó, tay đứa bé giơ cạnh má mình (độ cao: tầm tay đứa bé, bên dưới).
      const shortLeft = left.face.Y > right.face.Y;
      spot.X = shortLeft ? eL : eR;
    }
    for (const [S, R] of [[left.R, Rl], [right.L, Rr]]) { const dx = Math.abs(spot.X - S.X); spot.Y = Math.max(spot.Y, S.Y - Math.sqrt(Math.max(0, R * R - dx * dx))); }
    const meet = pair.back(spot), wind = pair.back({ X: spot.X - dir * 26 * pair.u, Y: spot.Y - 22 * pair.u });
    // Điểm đập THẤP dưới tầm tay mình (người lớn đập tay đứa bé — tay trẻ con chibi chỉ tới ngang vai nó): khuỵu gối / quỳ một gối.
    const R = (DAI.canhTay * this.nv.daiCanhTay + DAI.cangTay * this.nv.daiCangTay) * 0.9, sh0 = mine[k], dx0 = meet.x - sh0.x;
    const lowFor = (rig, geo, side, p) => {
      const reach = (DAI.canhTay * rig.nv.daiCanhTay + DAI.cangTay * rig.nv.daiCangTay) * 0.9, q = geo[side], dx = p.x - q.x;
      return p.y > q.y && Math.hypot(dx, p.y - q.y) > reach ? rig._lowerBy(p.y - q.y - Math.sqrt(Math.max(0, reach * reach - dx * dx)) + 4) : { seat: 0, kneel: 0 };
    };
    const low = lowFor(this, mine, k, meet);
    if (low.seat) mine = this._poseGeo({ huong: dir * RigSVG.FIVE_TURN, seat: low.seat, kneel: low.kneel });
    const hit = this._palmTo(k, { x: meet.x + dir * 3, y: meet.y }, mine, true), up = this._palmTo(k, wind, mine, true);
    // Người kia cũng có thể quỳ xuống (cùng phép tính, phía họ): nhìn vào mặt họ Ở DÁNG ẤY, đầu mình ở dáng của mình.
    const their0 = o._poseGeo({ huong: -dir * RigSVG.FIVE_TURN }), theirLow = lowFor(o, their0, o._holdsFree(dir > 0 ? 'L' : 'R'), pair.backThem(spot));
    const theirFace = theirLow.seat ? pair.them(o._poseGeo({ huong: -dir * RigSVG.FIVE_TURN, seat: theirLow.seat, kneel: theirLow.kneel }).face) : theirs.face;
    const was = [s.seat, s.kneel];
    s.seat = low.seat; s.kneel = low.kneel;
    let head;
    try { head = this._lookAngles(pair.back(theirFace), { huong: dir * RigSVG.FIVE_TURN, up: RigSVG.PAIR_UP }); } finally { s.seat = was[0]; s.kneel = was[1]; }
    t.set(s, { ['tay' + k]: 'xoe' }, 0.05);
    // NGƯỜI CAO HƠN vẽ trước (bối cảnh 3D): hai bàn tay gặp nhau cạnh đầu đứa bé — tay người lớn nằm trên tóc / bím tóc nó, không khuất sau.
    const taller = me.face.Y < theirs.face.Y - 0.3 * theirs.face.r * pair.tu, slot = taller ? this._pairSlot(o) : 0;
    if (taller) t.to(s, { pairFront: 1, pairSlot: slot, duration: 0.02 }, 0);
    t.to(s, { huong: dir * RigSVG.FIVE_TURN, seat: low.seat, kneel: low.kneel, ['aim' + k]: 1, ['carry' + k]: 0, ['handZoom' + k]: 1.3, ['bat' + k]: up.bat, ['cang' + k]: up.cang, ...head, cuoi: 1, mieng: 0.35, mayL: 0.55, mayR: 0.55,
              duration: 0.38, ease: 'power2.out' }, 0);
    // Đập: bàn tay lao tới điểm gặp, nảy người lên một chút (y) rồi hạ, miệng cười mở.
    t.to(s, { ['bat' + k]: hit.bat, ['cang' + k]: hit.cang, than: N.than + dir * 3, duration: RigSVG.FIVE_AT - 0.4, ease: 'power3.in' }, 0.4);
    t.to(s, { y: -7, mieng: 0.55, duration: 0.14, ease: 'power2.out' }, RigSVG.FIVE_AT)
     .to(s, { y: 0, duration: 0.2, ease: 'power2.in' }, RigSVG.FIVE_AT + 0.14)
     .to(s, { y: -4, duration: 0.12, ease: 'power2.out' }, RigSVG.FIVE_AT + 0.42)
     .to(s, { y: 0, duration: 0.16, ease: 'power2.in' }, RigSVG.FIVE_AT + 0.54);
    t.to(s, { mieng: 0.3, than: N.than + dir * 1.5, duration: 0.4, ease: 'sine.inOut' }, RigSVG.FIVE_AT + 0.45);
    this._khep(t, 0.5, RigSVG.FIVE_AT + RigSVG.FIVE_HOLD, taller ? { pairSlot: slot } : {});
    return t;
  }

  /**
   * ÔM người kia `other`: bước lại sát, quay 3/4 về nhau, hai tay vòng qua người họ (một tay ngang bả vai, một tay ngang lưng — tới
   * lưng người kia), hai đầu áp má cạnh nhau (đầu quay về phía người xem), nhắm mắt cười, đung đưa nhẹ hai nhịp, rồi buông và lùi về
   * chỗ cũ. Chạy cùng nhịp với `other.hug(this)`. Người lớn ôm trẻ con thì khuỵu gối xuống ngang vai đứa bé; trẻ con ôm ngang bụng.
   */
  hug(other) {
    const pair = this._pair(other, 'hug'), o = pair.other, dir = pair.dir, t = this.tl(), s = this.s, N = this.NGHI;
    const huong = dir * RigSVG.HUG_TURN, lean = dir * RigSVG.HUG_LEAN;
    // HẠ NGƯỜI trước (người cao hơn hẳn — người lớn ôm trẻ con — khuỵu / quỳ cho vai xuống ngang trên vai người kia), tính cho CẢ HAI
    // bằng cùng một phép (ai gọi cũng ra cùng kết quả), rồi BƯỚC: hai người cùng bước, mỗi người một nửa quãng thừa. Đo theo HAI ĐẦU
    // đã ngả vào nhau: tâm hai mặt cách nhau `HUG_CLOSE` tổng bán kính (tính cả chênh cao), hai thân không gần hơn `HUG_BODY` tổng nửa
    // bề ngang thân.
    const lowered = (rig, mine0, other0, toMine, toOther, u) => rig._lowerBy((toOther(other0[dir > 0 ? 'L' : 'R']).Y - toMine(mine0[dir > 0 ? 'R' : 'L']).Y) / u - RigSVG.HUG_ABOVE);
    const a0 = this._poseGeo({ huong, lean, seat: 0, kneel: 0 }), b0 = o._poseGeo({ huong: -huong, lean: -lean, seat: 0, kneel: 0 });
    const down = lowered(this, a0, b0, pair.me, pair.them, pair.u);
    const flip = (g) => ({ L: g.R, R: g.L });            // nhìn từ phía người kia: vai phía mình là vai bên kia
    const theirDown = lowered(o, flip(b0), flip(a0), pair.them, pair.me, pair.tu);
    const seat = down.seat, kneel = down.kneel;
    const g0 = this._poseGeo({ huong, lean, seat, kneel }), h0 = o._poseGeo({ huong: -huong, lean: -lean, seat: theirDown.seat, kneel: theirDown.kneel });
    const f0 = pair.me(g0.face), f1 = pair.them(h0.face), rMe = g0.face.r * pair.u, rThem = h0.face.r * pair.tu;
    const close = RigSVG.HUG_CLOSE * (rMe + rThem), dyF = Math.abs(f1.Y - f0.Y);
    const bodies = RigSVG.HUG_BODY * (g0.half * pair.u + h0.half * pair.tu);
    const faceGap = Math.abs(f1.X - f0.X), centreGap = Math.abs(pair.theirX - pair.myX);
    const stepPx = clamp(Math.min((faceGap - Math.sqrt(Math.max(0, close * close - dyF * dyF))) / 2, (centreGap - bodies) / 2), -40 * Math.min(pair.u, pair.tu), 80 * Math.min(pair.u, pair.tu));
    const step = dir * stepPx / pair.u, theirStep = -dir * stepPx / pair.tu;
    const mine = this._poseGeo({ huong, lean, step, seat, kneel });
    const theirs = RigSVG._screenGeo(o, pair.them, o._poseGeo({ huong: -huong, lean: -lean, step: theirStep, seat: theirDown.seat, kneel: theirDown.kneel }));
    // Hai tay tới LƯNG người kia (mép thân phía xa mình), một tay cao (bả vai), một tay thấp (lưng) — trong dải thân của họ.
    const top = theirs.L.Y + theirs.torso * pair.tu * 0.12, low = theirs.hip.Y - theirs.torso * pair.tu * 0.18;
    const myLevel = pair.me(mine[dir > 0 ? 'R' : 'L']).Y + 10 * pair.u;
    const highY = clamp(myLevel, top, low - 20 * pair.tu), lowY = clamp(highY + theirs.torso * pair.tu * 0.38, top, low);
    const backX = theirs.hip.X + dir * theirs.half * pair.tu * 0.6;
    const far = dir > 0 ? 'R' : 'L', near = far === 'R' ? 'L' : 'R';
    const farArm = this._palmTo(far, pair.back({ X: backX, Y: highY }), mine, true);
    const nearArm = this._palmTo(near, pair.back({ X: backX - dir * theirs.half * pair.tu * 0.9, Y: lowY }), mine, true);
    // Đầu: quay ngược về phía người xem, nghiêng về phía người kia (áp má), nhắm mắt.
    const keep = {};
    for (const side of ['L', 'R']) if (this.holds[side] && s['item' + side] > 0.5) { t.to(s, { ['item' + side]: 0, ['carry' + side]: 0, duration: 0.15 }, 0); keep['item' + side] = 1; }
    t.to(s, { x: s.x + step, huong, seat, kneel, duration: 0.5, ease: 'power2.inOut' }, 0);
    t.to(s, { than: N.than + lean, headTurn: -dir * RigSVG.HUG_HEAD, dau: N.dau + dir * 9, dauX: dir * 3, cuoi: 0.9, mayL: 0.55, mayR: 0.55, duration: 0.45, ease: 'sine.inOut' }, 0.3);
    t.set(s, { tayL: 'mo', tayR: 'mo' }, 0.3);
    t.to(s, { aimL: 1, aimR: 1, carryL: 0, carryR: 0, ['bat' + far]: farArm.bat, ['cang' + far]: farArm.cang, ['bat' + near]: nearArm.bat, ['cang' + near]: nearArm.cang,
              duration: 0.45, ease: 'power2.out' }, 0.35);
    t.to(s, { matY: 1, cuoi: 1, duration: 0.25, ease: 'sine.inOut' }, 0.75);
    // Đung đưa nhẹ: cả người (thân + dời ngang) nghiêng qua lại hai nhịp; tay theo thân.
    const T0 = 0.85, sway = RigSVG.HUG_HOLD / 4;
    for (let n = 0; n < 4; n++) t.to(s, { than: N.than + lean + (n % 2 ? -1 : 1) * 2.5, x: s.x + step + (n % 2 ? -1 : 1) * 2, duration: sway, ease: 'sine.inOut' }, T0 + n * sway);
    const end = T0 + RigSVG.HUG_HOLD;
    t.to(s, { matY: 0, than: N.than + lean, x: s.x + step, duration: 0.2, ease: 'sine.inOut' }, end);
    // Buông, lùi về chỗ cũ.
    t.to(s, { x: s.x, duration: 0.5, ease: 'power2.inOut' }, end + 0.35);
    this._khep(t, 0.5, end + 0.25, keep);
    return t;
  }

  /**
   * VỖ VAI an ủi người kia `other`: quay về phía họ, đặt bàn tay phía họ lên vai gần của họ, vỗ hai nhịp chậm, mặt cảm thông (mày
   * nhướn, cười nhẹ, đầu nghiêng), mắt nhìn họ; rồi buông. Người kia có thể đứng yên (`tools/scene.py` cho họ nhìn lại người vỗ).
   */
  patShoulder(other) {
    const pair = this._pair(other, 'patShoulder'), o = pair.other, dir = pair.dir, t = this.tl(), s = this.s, N = this.NGHI;
    const huong = dir * RigSVG.PAT_TURN, k = this._holdsFree(dir > 0 ? 'R' : 'L');
    const slot = this._pairSlot(o);
    t.to(s, { pairFront: 1, pairSlot: slot, duration: 0.02 }, 0);
    // Đợt 44 A: vai người kia ở HƯỚNG THÂN THẬT của họ (đang quay về phía mình — `faces`), không ở dáng nhìn thẳng: quay 3/4 thì vai
    // gần dồn vào giữa cả nửa bề ngang vai — tính ở hướng 0 thì bàn tay dừng ngoài vai ~7 % chiều cao (mọi người lớn đứng cách ~300).
    // Họ không quay thân trong lượt này (`lookAt` chỉ quay đầu), nên đọc `s.huong` lúc dựng là đúng.
    const theirs = RigSVG._screenGeo(o, pair.them, o._poseGeo({ huong: clamp(o.s.huong || 0, -1, 1) }));
    const shoulder = theirs[dir > 0 ? 'L' : 'R'];
    // Lòng bàn tay ôm lấy ĐẦU VAI phía ngoài (mép tay áo, dưới mép đầu): người kia đứng trước thì bàn tay đặt trên đỉnh vai khuất sau
    // đầu / tóc họ — ở mép ngoài thì thấy được dù ai vẽ trước.
    const rest = pair.back({ X: shoulder.X - dir * RigSVG.PAT_OUT * pair.tu, Y: shoulder.Y + RigSVG.PAT_DOWN * pair.tu });
    // Đứng xa quá tầm tay (trẻ con tay ngắn): BƯỚC tới một chút trong động tác (≤ 60 đơn vị), lùi về chỗ cũ lúc buông.
    const R = (DAI.canhTay * this.nv.daiCanhTay + DAI.cangTay * this.nv.daiCangTay) * 0.9;
    // Đợt 44 A: không bước lấn vào người kia — hai thân còn cách nhau ít nhất `PAT_BODY_44A` tổng nửa bề ngang thân (vai gần của người
    // đang quay 3/4 nằm sâu vào trong: người thấp bước đủ 60 đơn vị thì đứng đè trước ngực họ, đầu che mặt họ).
    const me0 = this._poseGeo({ huong, lean: dir * 3 });
    const room = Math.max(0, (Math.abs(pair.theirX - pair.myX) - RigSVG.PAT_BODY_44A * (me0.half * pair.u + theirs.half * pair.tu)) / pair.u);
    const reachX = Math.abs(rest.x - me0[k].x), step = dir * clamp(reachX - 0.75 * R, 0, Math.min(60, room));
    let mine = this._poseGeo({ huong, lean: dir * 3, step }), sh = mine[k], dx = rest.x - sh.x, low = { seat: 0, kneel: 0 };
    // Người kia THẤP hơn hẳn (người lớn vỗ vai trẻ con): vai họ dưới tầm tay — khuỵu gối / quỳ một gối xuống (`_lowerBy`).
    // (Đợt 44 A: chỉ khi hạ người giúp được — vai họ gần ngang vai mình mà ngoài tầm theo BỀ NGANG thì quỳ xuống cũng không với tới,
    // chỉ tụt đầu xuống ngực họ.)
    if (rest.y > sh.y && Math.hypot(dx, rest.y - sh.y) > 0.9 * R && (Math.abs(dx) < 0.9 * R || rest.y - sh.y > 0.25 * R)) {
      low = this._lowerBy(rest.y - sh.y - Math.sqrt(Math.max(0, 0.81 * R * R - dx * dx)) + 6);
      mine = this._poseGeo({ huong, lean: dir * 3, step, seat: low.seat, kneel: low.kneel }); sh = mine[k]; dx = rest.x - sh.x;
    }
    // Người kia CAO hơn hẳn (trẻ con vỗ vai người lớn): vai ngoài tầm tay — đặt bàn tay thấp xuống dọc bắp tay họ, tới chỗ với được
    // (không thấp quá khuỷu tay họ).
    if (rest.y < sh.y && Math.hypot(dx, rest.y - sh.y) > R && Math.abs(dx) < R) rest.y = Math.min(sh.y - Math.sqrt(R * R - dx * dx), rest.y + 55 * pair.tu / pair.u);
    // … và không giơ tay quá đỉnh vai MÌNH: trẻ con với lên vai người lớn thì cánh tay đi sau cái đầu to của chính nó — đặt tay lên bắp
    // tay họ, ngang vai mình (thấy được, đọc thành "vỗ về").
    if (rest.y < mine.face.y) rest.y = sh.y + 0.1 * R;
    const lift = { x: rest.x, y: rest.y - 12 };
    const on = this._palmTo(k, rest, mine, true), up = this._palmTo(k, lift, mine, true);
    const head = this._lookAngles(pair.back(theirs.face), { huong, up: RigSVG.PAIR_UP });
    const keep = this.holds[k] && s['item' + k] > 0.5 ? { ['item' + k]: 1 } : {};
    if (keep['item' + k]) t.to(s, { ['item' + k]: 0, ['carry' + k]: 0, duration: 0.15 }, 0);
    t.set(s, { ['tay' + k]: 'mo' }, 0.1);
    t.to(s, { x: s.x + step, seat: low.seat, kneel: low.kneel, huong, than: N.than + dir * 3, ['aim' + k]: 1, ['carry' + k]: 0, ['bat' + k]: up.bat, ['cang' + k]: up.cang, ...head,
              cuoi: 0.25, mayL: 0.8, mayR: 0.8, dau: N.dau + dir * 6, duration: 0.5, ease: 'power2.inOut' }, 0);
    t.to(s, { ['bat' + k]: on.bat, ['cang' + k]: on.cang, duration: 0.3, ease: 'power2.inOut' }, 0.5);
    // Hai nhịp vỗ chậm: nhấc lên 0,25 s, đặt xuống 0,25 s, nằm yên 0,35 s.
    for (let n = 0; n < 2; n++) {
      const at = 1.15 + n * 0.85;
      t.to(s, { ['bat' + k]: up.bat, ['cang' + k]: up.cang, duration: 0.25, ease: 'sine.out' }, at)
       .to(s, { ['bat' + k]: on.bat, ['cang' + k]: on.cang, duration: 0.25, ease: 'sine.in' }, at + 0.25);
    }
    t.to(s, { cuoi: 0.45, mieng: 0.08, duration: 0.4, ease: 'sine.inOut' }, 2.0);
    this.blinkTo = 0; this._chop(t, 1.6);
    this._khep(t, 0.5, 3.0, { ...keep, pairSlot: slot });
    if (step) t.to(s, { x: s.x, duration: 0.5, ease: 'power2.inOut' }, 3.0);
    return t;
  }

  /**
   * THÌ THẦM với người kia `other`: quay về họ, ngả người (người lớn với trẻ con thì khuỵu xuống) đưa miệng sát TAI họ, bàn tay phía
   * họ khum cạnh miệng, miệng mấp máy khẽ ~2 s, mắt liếc ra; rồi rút về, nhìn họ, gật, cười. Chạy cùng nhịp với `other.hearWhisper(this)`
   * (nghiêng tai lại nghe, rồi ngạc nhiên / vui và gật) — `tools/scene.py` tự thêm.
   */
  whisper(other) {
    const pair = this._pair(other, 'whisper'), o = pair.other, dir = pair.dir, t = this.tl(), s = this.s, N = this.NGHI;
    const plan = RigSVG._whisperPlan(this, o, pair, true), k = this._holdsFree(dir > 0 ? 'R' : 'L');
    const slot = this._pairSlot(o);
    t.to(s, { pairFront: 1, pairSlot: slot, duration: 0.02 }, 0);
    const mine = this._poseGeo({ huong: plan.huong, lean: plan.lean, step: plan.step, seat: plan.seat, kneel: plan.kneel, pitch: plan.pitch });
    // Bàn tay khum: giữa miệng mình và tai họ, ngang miệng, hơi ra trước.
    const mouth = mine.mouth, cup = this._palmTo(k, { x: mouth.x + dir * mine.face.r * 0.3, y: mouth.y + mine.face.r * 0.1 }, mine, true);
    const keep = this.holds[k] && s['item' + k] > 0.5 ? { ['item' + k]: 1 } : {};
    if (keep['item' + k]) t.to(s, { ['item' + k]: 0, ['carry' + k]: 0, duration: 0.15 }, 0);
    t.set(s, { ['tay' + k]: 'xoe' }, 0.15);
    t.to(s, { x: s.x + plan.step, huong: plan.huong, seat: plan.seat, kneel: plan.kneel, than: N.than + plan.lean, y: plan.rise, headPitch: plan.pitch, dau: N.dau + dir * 4,
              nhinX: dir * 2.4, nhinY: 0.6, mayL: 0.7, mayR: 0.7, cuoi: 0.2, duration: 0.55, ease: 'power2.inOut' }, 0);
    t.to(s, { ['aim' + k]: 1, ['carry' + k]: 0, ['bat' + k]: cup.bat, ['cang' + k]: cup.cang, duration: 0.45, ease: 'power2.out' }, 0.15);
    // Mấp máy khẽ: miệng hé nhỏ, chúm, nhịp nhanh — liếc mắt ra ngoài một lần (bí mật).
    const T0 = 0.6, talk = RigSVG.WHISPER_TALK;
    t.to(s, { chum: 0.35, duration: 0.15 }, T0);
    for (let n = 0, at = T0; at < T0 + talk - 0.15; n++, at += 0.17) t.to(s, { mieng: n % 2 ? 0.06 : 0.22 + 0.06 * ((n * 7) % 3) / 2, duration: 0.17, ease: 'sine.inOut' }, at);
    t.to(s, { mieng: 0, chum: 0, duration: 0.15 }, T0 + talk - 0.1);
    t.to(s, { nhinX: -dir * 2, duration: 0.2 }, T0 + 0.9).to(s, { nhinX: dir * 2.4, duration: 0.2 }, T0 + 1.3);
    // Rút về, nhìn họ, gật, cười.
    const end = T0 + talk, theirFace = RigSVG._screenGeo(o, pair.them, o._poseGeo({ huong: -dir * 0.3 })).face;
    const look = this._lookAngles(pair.back(theirFace), { huong: dir * 0.45, up: RigSVG.PAIR_UP });
    t.to(s, { x: s.x, seat: s.seat, kneel: s.kneel, than: N.than, y: 0, huong: dir * 0.45, ...look, dau: N.dau, cuoi: 0.9, mayL: 0.55, mayR: 0.55, ['aim' + k]: 0,
              ['bat' + k]: this._restArm(k)[0], ['cang' + k]: this._restArm(k)[1], duration: 0.5, ease: 'power2.inOut' }, end);
    t.to(s, { dauY: 6, duration: 0.2, ease: 'power2.out' }, end + 0.6).to(s, { dauY: 0, duration: 0.25, ease: 'power2.inOut' }, end + 0.8);
    this._khep(t, 0.45, end + 1.25, { ...keep, pairSlot: slot });
    return t;
  }

  /**
   * NGHE THÌ THẦM từ người kia `source` (chạy cùng nhịp với `source.whisper(this)`): nghiêng tai về phía họ (đầu nghiêng, thân ngả nhẹ,
   * mắt liếc sang, mày nhướn chăm chú), người cao hơn thì khuỵu xuống; nghe xong quay lại nhìn họ — mắt mở to, cười — và gật hai cái.
   */
  hearWhisper(source) {
    const pair = this._pair(source, 'hearWhisper'), o = pair.other, dir = pair.dir, t = this.tl(), s = this.s, N = this.NGHI;
    const plan = RigSVG._whisperPlan(o, this, pair, false);
    t.to(s, { huong: plan.listenHuong, seat: plan.listenSeat, kneel: plan.listenKneel, than: N.than + plan.listenLean, dau: N.dau - dir * 7, headTurn: 0, nhinX: dir * 2.6, nhinY: 0.4,
              mayL: 0.75, mayR: 0.75, cuoi: 0.1, mieng: 0, duration: 0.55, ease: 'power2.inOut' }, 0);
    const T0 = 0.6, end = T0 + RigSVG.WHISPER_TALK;
    this._chop(t, T0 + 1.0);
    const theirFace = RigSVG._screenGeo(o, pair.them, o._poseGeo({ huong: -dir * 0.45 })).face;
    const look = this._lookAngles(pair.back(theirFace), { huong: dir * 0.3, up: RigSVG.PAIR_UP });
    // Phản ứng: quay lại nhìn họ, mắt mở to (ngạc nhiên vui), rồi cười, gật hai cái.
    t.to(s, { huong: dir * 0.3, seat: s.seat, kneel: s.kneel, than: N.than, dau: N.dau, ...look, matY: -0.15, mayL: 1, mayR: 1, mieng: 0.5, chum: 0.5, cuoi: 0.3, duration: 0.4, ease: 'back.out(1.6)' }, end);
    t.to(s, { mieng: 0.2, chum: 0, cuoi: 1, matY: 0.1, mayL: 0.55, mayR: 0.55, duration: 0.35, ease: 'sine.inOut' }, end + 0.45);
    for (let n = 0; n < 2; n++) t.to(s, { dauY: 7, duration: 0.17, ease: 'power2.out' }, end + 0.55 + n * 0.38).to(s, { dauY: 0, duration: 0.2, ease: 'power2.inOut' }, end + 0.72 + n * 0.38);
    this._khep(t, 0.45, end + 1.25);
    return t;
  }

  // KẾ HOẠCH THÌ THẦM — chung cho người nói (`whisper`) và người nghe (`hearWhisper`), tính cùng một cách từ cả hai: người nói quay về
  // người nghe, ngả `lean`, bước `step`; người CAO HƠN hạ xuống (`_lowerBy`: khuỵu gối, chênh nhiều thì quỳ một gối) — người nói cao
  // thì nói hạ, người nghe cao thì nghe hạ và nghiêng tai xuống —, phần lệch còn lại bù bằng cúi / ngẩng đầu. Miệng người nói dừng
  // trước tai người nghe `WHISPER_GAP` bán kính đầu. `pair` là của rig gọi.
  static _whisperPlan(talker, listener, pair, fromTalker) {
    const dir = fromTalker ? pair.dir : -pair.dir;                 // người nghe ở bên nào của người nói
    const uT = fromTalker ? pair.u : pair.tu, uL = fromTalker ? pair.tu : pair.u;
    const toScreenT = fromTalker ? pair.me : pair.them, toScreenL = fromTalker ? pair.them : pair.me;
    const huong = dir * RigSVG.WHISPER_TURN, listenHuong = -dir * 0.12, lean = dir * 10, listenLean = -dir * 3;
    const earOf = (g) => toScreenL({ x: g.face.x - dir * g.face.r * 0.88, y: g.face.y + g.face.r * 0.12 });
    const mouth = toScreenT(talker._poseGeo({ huong, lean }).mouth), ear = earOf(listener._poseGeo({ huong: listenHuong, lean: listenLean }));
    const dy = ear.Y - mouth.Y;                                    // > 0: tai thấp hơn miệng (người nói cao hơn)
    let low = { seat: 0, kneel: 0, drop: 0 }, listenLow = { seat: 0, kneel: 0, drop: 0 }, rise = 0;
    if (dy > 0) low = talker._lowerBy(dy / uT - 4);
    else if (dy < 0) { listenLow = listener._lowerBy(-dy / uL - 4); rise = -clamp((-dy - listenLow.drop * uL) / uT, 0, 6); }
    // Phần còn lệch (theo chiều đứng, đơn vị người nói): cúi đầu xuống (dương) / ngẩng lên (âm).
    const left = (dy - low.drop * uT + listenLow.drop * uL) / uT + rise;
    const pitch = clamp(left / 30, -0.4, 0.8);
    const tall2 = talker._poseGeo({ huong, lean, seat: low.seat, kneel: low.kneel, pitch });
    const heard2 = listener._poseGeo({ huong: listenHuong, lean: listenLean, seat: listenLow.seat, kneel: listenLow.kneel });
    const mouth2 = toScreenT(tall2.mouth), ear2 = earOf(heard2);
    // Bước tới (hay lùi): miệng dừng trước tai `WHISPER_GAP` bán kính đầu người nói — bàn tay khum nằm trong khoảng ấy.
    const want = ear2.X - dir * tall2.face.r * RigSVG.WHISPER_GAP * uT, step = dir * clamp(dir * (want - mouth2.X) / uT, -40, 60);
    return { huong, lean, seat: low.seat, kneel: low.kneel, rise, pitch, step, listenHuong, listenLean, listenSeat: listenLow.seat, listenKneel: listenLow.kneel };
  }

  /**
   * ĐƯA TÚI THUỐC bằng HAI TAY cho người kia `other`: túi (`items: { R: 'bag' }`) đang cầm ở quai — đưa ra điểm giữa hai người ngang
   * ngực, tay kia đỡ dưới đáy túi, giữ cho họ cầm lấy (hai người cùng cầm ~0,7 s), túi sang tay họ đúng lúc `BAG_AT`, buông, cười, gật.
   * Chạy cùng nhịp với `other.takeBag(this)` (người nhận phải có túi đang cất: `items: { R: 'bag' }, itemsHidden: true`).
   */
  handOverBag(other) {
    const s = this.s, k = ['R', 'L'].find((side) => this.holds[side] && s['item' + side] > 0.5 && this._isBag(side));
    if (!k) throw new Error('[character] handOverBag: this character is not holding a medicine bag — createCharacter(host, { id, items: { R: "bag" } })');
    const pair = this._pair(other, 'handOverBag'), dir = pair.dir, t = this.tl(), N = this.NGHI, o = k === 'R' ? 'L' : 'R';
    const spot = RigSVG._bagSpot(this, pair.other, pair, true), mine = this._poseGeo({ huong: dir * RigSVG.BAG_TURN, lean: dir * 3 });
    const hold = this._palmTo(k, spot.handle, mine, true), out = this._palmTo(k, { x: spot.handle.x - dir * 14, y: spot.handle.y + 6 }, mine, true), under = this._palmTo(o, spot.giverBase, mine, true);
    const head = this._lookAngles(spot.otherFace, { huong: dir * RigSVG.BAG_TURN, up: RigSVG.PAIR_UP });
    t.set(s, { ['tay' + o]: 'xoe' }, 0.2);
    t.to(s, { huong: dir * RigSVG.BAG_TURN, than: N.than + dir * 3, aimL: 1, aimR: 1, carryL: 0, carryR: 0, ['bat' + k]: out.bat, ['cang' + k]: out.cang, ['bat' + o]: under.bat, ['cang' + o]: under.cang,
              ['itemZoom' + k]: RigSVG.BAG_ZOOM, ...head, cuoi: 0.8, mayL: 0.5, mayR: 0.5, duration: 0.5, ease: 'power2.inOut' }, 0);
    t.to(s, { ['bat' + k]: hold.bat, ['cang' + k]: hold.cang, duration: 0.35, ease: 'power2.out' }, 0.5);
    t.to(s, { ['item' + k]: 0, duration: 0.06 }, RigSVG.BAG_AT);                  // túi sang tay người kia (cùng chỗ trên màn hình)
    t.set(s, { ['tay' + k]: 'mo' }, RigSVG.BAG_AT + 0.05);
    t.to(s, { dauY: 6, cuoi: 1, duration: 0.2, ease: 'power2.out' }, RigSVG.BAG_AT + 0.45).to(s, { dauY: 0, duration: 0.25, ease: 'power2.inOut' }, RigSVG.BAG_AT + 0.65);
    this._khep(t, 0.5, RigSVG.BAG_AT + 0.35, { ['item' + k]: 0, itemZoomL: 1, itemZoomR: 1 });
    return t;
  }

  /**
   * NHẬN TÚI THUỐC bằng hai tay từ `giver` (cùng nhịp với `giver.handOverBag(this)`): vươn tay cầm quai túi cạnh tay họ, tay kia đỡ
   * đáy; túi sang tay lúc `BAG_AT`, rồi ôm về dáng cầm, cười, gật cảm ơn. Cần túi đang cất (`items: { R: 'bag' }, itemsHidden: true`).
   */
  takeBag(giver) {
    const s = this.s, k = ['R', 'L'].find((side) => this.holds[side] && s['item' + side] <= 0.5 && this._isBag(side));
    if (!k) throw new Error('[character] takeBag: this character has no put-away medicine bag to receive — createCharacter(host, { id, items: { R: "bag" }, itemsHidden: true })');
    const pair = this._pair(giver, 'takeBag'), dir = pair.dir, t = this.tl(), N = this.NGHI, o = k === 'R' ? 'L' : 'R';
    const spot = RigSVG._bagSpot(pair.other, this, pair, false), mine = this._poseGeo({ huong: dir * RigSVG.BAG_TURN, lean: dir * 2 });
    const reach = this._palmTo(k, { x: spot.handle.x - dir * 16, y: spot.handle.y + 4 }, mine, true), hold = this._palmTo(k, spot.handle, mine, true), under = this._palmTo(o, spot.takerBase, mine, true);
    const head = this._lookAngles(spot.otherFace, { huong: dir * RigSVG.BAG_TURN, up: RigSVG.PAIR_UP });
    t.set(s, { ['tay' + k]: 'mo', ['tay' + o]: 'xoe', ['carry' + k]: 0 }, 0);
    t.to(s, { huong: dir * RigSVG.BAG_TURN, than: N.than + dir * 2, aimL: 1, aimR: 1, carryL: 0, carryR: 0, ['bat' + k]: reach.bat, ['cang' + k]: reach.cang, ...head,
              cuoi: 0.7, mayL: 0.55, mayR: 0.55, duration: 0.5, ease: 'power2.inOut' }, 0.25);
    t.to(s, { ['bat' + k]: hold.bat, ['cang' + k]: hold.cang, ['bat' + o]: under.bat, ['cang' + o]: under.cang, duration: 0.35, ease: 'power2.out' }, 0.75);
    // Cùng CỠ trên màn hình với túi trong tay người đưa (trẻ con, đứng xa máy hơn: đơn vị khung nhỏ hơn) — túi không co lại lúc sang tay;
    // rồi về cỡ của mình khi ôm túi về (`_khep`).
    const handScale = (rig, side) => { const m = rig.el['coTay' + side].getScreenCTM(); return m ? Math.hypot(m.a, m.b) : 1; };
    const giverSide = ['R', 'L'].find((side) => pair.other.holds[side] && pair.other._isBag(side)) || 'R';
    t.set(s, { ['tay' + k]: 'nam', ['itemZoom' + k]: RigSVG.BAG_ZOOM * handScale(pair.other, giverSide) / (handScale(this, k) || 1) }, RigSVG.BAG_AT);
    t.to(s, { ['item' + k]: 1, duration: 0.06 }, RigSVG.BAG_AT);
    // Đợt 44 A: túi hiện ra đúng chỗ, đúng cỡ túi trong tay người đưa (đo lúc vẽ), rồi trượt về tay mình trong lúc tay người đưa còn
    // đặt yên trên quai (họ buông ở BAG_AT + 0,35).
    const givers = this.bagGivers44a || (this.bagGivers44a = []);
    let slot = givers.findIndex((g) => g.rig === pair.other && g.side === giverSide && g.k === k);
    if (slot < 0) { givers.push({ rig: pair.other, side: giverSide, k }); slot = givers.length - 1; }
    t.set(s, { bagGiver44a: slot, bagMatch44a: 1 }, RigSVG.BAG_AT);
    t.to(s, { bagMatch44a: 0, duration: 0.33, ease: 'sine.inOut' }, RigSVG.BAG_AT + 0.02);
    // Ôm túi về dáng cầm, cười, gật cảm ơn.
    t.to(s, { dauY: 7, cuoi: 1, mieng: 0.15, duration: 0.2, ease: 'power2.out' }, RigSVG.BAG_AT + 0.85).to(s, { dauY: 0, mieng: 0, duration: 0.25, ease: 'power2.inOut' }, RigSVG.BAG_AT + 1.05);
    this._khep(t, 0.6, RigSVG.BAG_AT + 0.35, { ['item' + k]: 1, itemZoomL: 1, itemZoomR: 1 });
    return t;
  }

  // ĐỢT 44 A — TÚI SANG TAY KHÔNG NHẢY. Chỗ trao túi tính lúc dựng, theo máy quay lúc ấy (góc toàn); hai người ở hai chiều sâu (dược sĩ sau
  // quầy, khách trước quầy) thì ở góc cận tỉ lệ cỡ hai người khác hẳn — túi trong tay người nhận to hơn / lệch khỏi túi trong tay người
  // đưa vài % chiều cao (tools/acting_check.py: nhảy 3–5 % một khung). Lúc vẽ, với `bagMatch44a` > 0: dời và phóng túi của tay `side` cho
  // chốt quai (0, 10) và cỡ trùng túi trong tay người đưa (đo bằng getScreenCTM), pha dần về tay mình khi `bagMatch44a` về 0.
  _bagMatch(side, zoom) {
    const w = clamp(this.s.bagMatch44a || 0, 0, 1), giver = (this.bagGivers44a || [])[Math.round(this.s.bagGiver44a)];
    if (!(w > 0) || !giver || side !== giver.k) return null;
    const mine = this.el['item' + side], theirs = giver.rig.el && giver.rig.el['item' + giver.side];
    const m = mine && mine.parentNode && mine.parentNode.getScreenCTM && mine.parentNode.getScreenCTM(), g = theirs && theirs.parentNode && theirs.parentNode.getScreenCTM && theirs.parentNode.getScreenCTM();
    if (!m || !g) return null;
    const scale = (q) => Math.sqrt(Math.abs(q.a * q.d - q.b * q.c)) || 1;
    const P = new DOMPoint(0, 10).matrixTransform(g), local = P.matrixTransform(m.inverse());
    const want = Math.max(0.05, (giver.rig.s['itemZoom' + giver.side] || 1) * scale(g) / scale(m));
    return { dx: (local.x - 0) * w, dy: (local.y - 10) * w, zoom: zoom + (want - zoom) * w };
  }

  _isBag(side) {
    const item = this.el && this.el['item' + side];
    return !!(item && item.querySelector && item.querySelector('[data-bag]'));
  }

  // CHỖ TRAO TÚI (màn hình → hệ của rig gọi): quai túi ở giữa hai người (theo tầm tay), ngang ngực người thấp hơn; hai bàn tay đỡ đáy
  // túi cạnh nhau (bên người đưa / bên người nhận); mặt người kia (để nhìn). Chung cho hai bên.
  static _bagSpot(giver, taker, pair, fromGiver) {
    const dirGT = fromGiver ? pair.dir : -pair.dir;                // người nhận ở bên nào của người đưa
    const uG = fromGiver ? pair.u : pair.tu, uT = fromGiver ? pair.tu : pair.u;
    const G = RigSVG._screenGeo(giver, fromGiver ? pair.me : pair.them, giver._poseGeo({ huong: dirGT * RigSVG.BAG_TURN, lean: dirGT * 3 }));
    const T = RigSVG._screenGeo(taker, fromGiver ? pair.them : pair.me, taker._poseGeo({ huong: -dirGT * RigSVG.BAG_TURN, lean: -dirGT * 2 }));
    const reachG = (DAI.canhTay * giver.nv.daiCanhTay + DAI.cangTay * giver.nv.daiCangTay) * uG, reachT = (DAI.canhTay * taker.nv.daiCanhTay + DAI.cangTay * taker.nv.daiCangTay) * uT;
    const sg = G[dirGT > 0 ? 'R' : 'L'], st = T[dirGT > 0 ? 'L' : 'R'];
    let X = sg.X + (st.X - sg.X) * reachG / (reachG + reachT), Y = Math.max(sg.Y, st.Y) + 0.18 * Math.min(reachG, reachT);
    // Trong TẦM TAY cả hai (trẻ con tay ngắn): kéo quai túi về phía người với không tới, mỗi lần một người (người nhận trước).
    for (const [q, R] of [[st, reachT * 0.65], [sg, reachG * 0.85], [st, reachT * 0.65]]) {
      const dx = X - q.X, dy = Y - q.Y, d = Math.hypot(dx, dy);
      if (d > R) { X = q.X + dx * R / d; Y = q.Y + dy * R / d; }
    }
    const bottom = Y + 38 * RigSVG.BAG_ZOOM * Math.min(uG, uT);
    const back = pair.back;
    return { handle: back({ X, Y }), giverBase: back({ X: X - dirGT * 7 * uG, Y: bottom }), takerBase: back({ X: X + dirGT * 7 * uT, Y: bottom }),
             otherFace: back(fromGiver ? T.face : G.face) };
  }

  /**
   * NHẬN THÔNG BÁO trên điện thoại đang cầm: máy rung, một THẺ THÔNG BÁO bật ra phía trên máy (dòng đầu đậm — ví dụ
   * "Nhắc lịch tái khám", dòng sau — "Thứ Bảy, 9:00"), người nhìn xuống máy, mắt sáng lên, giữ `hold` giây rồi thẻ tắt.
   * `text`: một chuỗi (tự xuống dòng ở khoảng 24 ký tự) hoặc [dòng 1, dòng 2]. Phải đang cầm điện thoại.
   */
  notify(text = 'Thông báo mới', hold = 1.8, { side = 'auto' } = {}) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this._phoneHand(side);
    if (!(this.holds[k] && s['item' + k] > 0.5 && this.el['item' + k].querySelector('[data-back]'))) throw new Error('[character] notify: the character is not holding a phone — give it one: createCharacter(host, { id, items: { R: "phone" } })');
    const lines = Array.isArray(text) ? text.map(String) : RigSVG._noteLines(String(text));
    this.noted = { side: k };
    const [first, second] = [...this.el.note.querySelectorAll('text')];
    first.textContent = (lines[0] || '').slice(0, 30); second.textContent = (lines[1] || '').slice(0, 30);
    // Rung: món đồ nghiêng qua lại thật nhanh vài nhịp ("bzz").
    for (let n = 0; n < 6; n++) t.to(s, { ['itemTilt' + k]: n % 2 ? -7 : 7, duration: 0.05, ease: 'none' }, n * 0.05);
    t.to(s, { ['itemTilt' + k]: 0, duration: 0.05 }, 0.3);
    t.to(s, { note: 1, duration: 0.3, ease: 'back.out(1.8)' }, 0.25);
    t.to(s, { nhinY: 2.2, nhinX: k === 'L' ? -1.2 : 1.2, dauY: 4, mayL: 0.8, mayR: 0.8, cuoi: 0.9, duration: 0.3, ease: 'power2.out' }, 0.3);
    t.to(s, { nhinY: 0, nhinX: 0, dauY: 0, duration: 0.3, ease: 'sine.inOut' }, 0.6 + hold * 0.6);
    t.to(s, { note: 0, duration: 0.25, ease: 'power2.in' }, 0.55 + hold);
    this._khep(t, 0.4, 0.8 + hold);
    return t;
  }

  // Chia một câu thông báo thành hai dòng ở khoảng trắng gần ký tự thứ 24.
  static _noteLines(text) {
    if (text.length <= 24) return [text, ''];
    // Có dấu hai chấm / gạch ngang ở nửa đầu thì ngắt ở đó: "Nhắc lịch tái khám:" | "Thứ Bảy 9:00".
    const mark = text.search(/[:\-–] /);
    if (mark > 6 && mark < 30) return [text.slice(0, mark + 1).trim(), text.slice(mark + 1).trim()];
    const cut = text.lastIndexOf(' ', 24);
    return cut > 8 ? [text.slice(0, cut), text.slice(cut + 1)] : [text.slice(0, 24), text.slice(24)];
  }

  /**
   * NÉM BÓNG: lấy đà (tay ra sau), vung tay ném quả bóng bay vòng cung về phía `direction` ('right' | 'left'), rơi xuống
   * sàn cách `distance` đơn vị (mặc định ra ngoài khung). Đi cặp với `fetch` của con vật trong một `together`.
   * Đợt 44 A: `direction` là CON CHÓ (rig thú / mỏ neo của conversation) — ném về phía nó đang quay mặt, phía nó sẽ chạy theo
   * (`fetch` chạy theo hướng mặt): chó quay trái thì bóng bay sang trái.
   */
  throwBall(direction = 'right', distance = 420) {
    const pet = direction && direction.live ? direction.live : direction;
    if (pet && typeof pet === 'object' && !(pet.s && typeof pet.s.huong === 'number')) throw new Error('[character] throwBall(direction): direction is "right", "left" or a pet rig (the ball goes the way it faces)');
    const t = this.tl(), s = this.s, N = this.NGHI, dir = pet && typeof pet === 'object' ? (pet.s.huong < 0 ? -1 : 1) : direction === 'left' ? -1 : 1, m = dir;
    // Ném bằng tay phía hướng ném; tay ấy đang cầm đồ thì tay kia.
    const k = this._holdsFree(dir > 0 ? 'R' : 'L');
    if (this.holds[k] && s['item' + k] > 0.5) return this._headGesture(t, 2, -5);
    this.thrown = { dir, distance, x0: s.x + VAI[k].x + dir * 10, y0: VAI[k].y - 40, apex: 110 };
    this._stage(t, [k]);
    t.set(s, { ['tay' + k]: 'nam' }, 0.05);
    // Lấy đà: tay vung ra sau – lên; rồi quăng ra trước, người ngả theo.
    t.to(s, { ['bat' + k]: -40, ['cang' + k]: -70, than: N.than + m * 4, dau: N.dau + m * 4, nhinX: m * 2, cuoi: 0.8, duration: 0.35, ease: 'power2.out' }, 0);
    t.to(s, { ['bat' + k]: 150, ['cang' + k]: 10, than: N.than - m * 5, duration: 0.18, ease: 'power3.in' }, 0.4);
    t.set(s, { ['tay' + k]: 'xoe' }, 0.55);
    t.fromTo(s, { ball: 0.001 }, { ball: 1, duration: 1.1, ease: 'none', immediateRender: false }, 0.55);
    t.to(s, { ['bat' + k]: 95, ['cang' + k]: 0, nhinX: m * 3, nhinY: -0.6, cuoi: 1, duration: 0.3, ease: 'power2.out' }, 0.6);
    this._khep(t, 0.45, 1.7);
    return t;
  }

  // ĐỢT 40 A — KÉO CO. Dây thừng căng từ lòng bàn tay cầm tới đầu dây trong mõm con chó (`ropeEnd()` của rig thú), vẽ ở gốc SVG như dây dắt; con chó tự vẽ lại
  // theo (`onDraw`). Thẳng tắp — dây căng — và dài bằng đúng quãng tay–mõm.
  _drawRope() {
    const g = this.el && this.el.rope, pet = this.tugPet40;
    if (!g) return;
    const off = () => { g.style.display = 'none'; };
    if (!pet || this.s.rope < 0.5 || !pet.el || !pet.el.dau || typeof pet.ropeEnd !== 'function' || !this.svg.getScreenCTM) return off();
    const hand = this.el['coTay' + this.tugHand40], toRoot = this.svg.getScreenCTM(), handCTM = hand && hand.getScreenCTM(), end = pet.ropeEnd();
    if (!toRoot || !handCTM || !end) return off();
    const inverse = toRoot.inverse(), a = new DOMPoint(0, 14).matrixTransform(handCTM).matrixTransform(inverse), b = new DOMPoint(end.x, end.y).matrixTransform(inverse);
    const petCTM = pet.svg.getScreenCTM(), w = clamp(7 * (petCTM && toRoot.a ? petCTM.a / toRoot.a : 1), 3.2, 8), len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len, tail = { x: a.x - ux * 9, y: a.y - uy * 9 };        // đuôi dây thò ra sau bàn tay
    const d = `M ${tail.x.toFixed(1)} ${tail.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`, [base, top, twist, knot] = g.children;
    base.setAttribute('d', d); base.setAttribute('stroke-width', w.toFixed(1));
    top.setAttribute('d', d); top.setAttribute('stroke-width', (w * 0.68).toFixed(1));
    twist.setAttribute('d', d); twist.setAttribute('stroke-width', (w * 0.7).toFixed(1)); twist.setAttribute('stroke-dasharray', `${(w * 0.25).toFixed(1)} ${(w * 1.1).toFixed(1)}`);
    knot.setAttribute('cx', tail.x.toFixed(1)); knot.setAttribute('cy', tail.y.toFixed(1)); knot.setAttribute('r', (w * 0.7).toFixed(1));
    g.style.display = '';
  }

  /** Số đo cho tools/acting_check.py (đợt 40 A, `set.careProbe`): dây kéo co (phần tử + hai đầu trên màn hình + độ cong), tay cầm dây. */
  pull40Probe() {
    const e = this.el, pet = this.tugPet40, on = !!(e && e.rope && e.rope.style.display !== 'none' && pet && pet.ropeEnd);
    const path = on ? e.rope.firstElementChild : null, d = path ? (path.getAttribute('d') || '').match(/-?[\d.]+/g) : null;
    const toScreen = (x, y) => { const m = this.svg.getScreenCTM(), q = new DOMPoint(x, y).matrixTransform(m); return { x: q.x, y: q.y }; };
    const hand = on ? e['coTay' + this.tugHand40] : null, m = hand && hand.getScreenCTM(), grip = m ? new DOMPoint(0, 14).matrixTransform(m) : null;
    return { rope: on ? path : null, from: d && d.length >= 4 ? toScreen(+d[0], +d[1]) : null, to: d && d.length >= 4 ? toScreen(+d[2], +d[3]) : null,
             hand: grip ? { x: grip.x, y: grip.y } : null, mouth: on ? pet.ropeEnd() : null };
  }

  /**
   * KÉO CO (đợt 40 A): giữ đầu kia của sợi dây thừng con chó `pet` đang ngậm (`tugOfWar(person)` của rig chó, cùng lúc — tools/scene.py tự thêm cho bước
   * `["tugOfWar", "@người"]`): cúi tay xuống nắm dây (dây hiện ra căng từ tay tới mõm nó), rồi `hold` giây (1…8) giằng co — người ngả theo từng nhịp
   * giật của con chó (0,45 s một nhịp: nó giật ngược, người bị lôi tới; rồi người kéo lại, nó chúi theo), mặt gồng cười —, cuối cùng buông dây.
   * Hai bên cách nhau đúng một sợi dây: `pet.tugPlan(person)` cho chỗ con chó đứng, tay người đặt theo đó.
   */
  pullToy(pet, hold = 2.4) {
    if (!pet || pet instanceof RigSVG || typeof pet.tugPlan !== 'function' || !pet.el || !pet.el.dau) throw new Error('[character] pullToy(pet): pet must be a dog rig (createPet(...).rig) — it does tugOfWar(person) at the same time');
    const t = this.tl(), s = this.s, N = this.NGHI, h = clamp(+hold || 2.4, 1, 8), plan = pet.tugPlan(this, h);
    const Pet = pet.constructor, R = Pet.TUG_ROPE, half = Pet.TUG_HALF, side = plan.side;
    // Tay cầm dây ở TRƯỚC người, phía con chó (`side` là phía NGƯỜI so với con chó, nên con chó ở phía −side), ngang đùi (toạ độ khung người, không phụ thuộc con chó đang ở đâu); tay dời theo độ giật của đầu dây bên kia.
    const sv = this.svg.getBoundingClientRect(), unit = Math.min(sv.width / KHUNG.w, sv.height / KHUNG.h) || 1;
    const A = { x: s.x + HONG.x - side * R.reach * KHUNG.h * 0.96, y: s.y + DOI_Y + HONG.y + 95 };
    const reach = this._reachLow(A, null, 'body', 0.5), { k, crouch } = reach, dxB = plan.swing.dx / unit, dyB = plan.swing.dy / unit;
    const arms = { A: reach, B: reach.solve(reach.tx + dxB, reach.ty + dyB) };
    this.tugPet40 = pet; this.tugHand40 = k;
    pet.ropeHolders40 = pet.ropeHolders40 || new Set(); pet.ropeHolders40.add(this);
    if (!pet.onDraw || !pet.onDraw.rope40) {
      const before = pet.onDraw, draw = () => { if (before) before(); for (const who of pet.ropeHolders40) who._drawRope(); };
      draw.rope40 = true; pet.onDraw = draw;
    }
    const at0 = Math.max(0, plan.lead - 0.7), end = plan.lead + Math.max(2, Math.round(h / half)) * half, away = (phase) => (phase === 'A' ? side * 3.5 : -side * 4.5);
    t.to(s, { ['aim' + k]: 1, duration: 0.3, ease: 'sine.inOut' }, at0);
    t.set(s, { ['tay' + k]: 'nam' }, at0 + 0.02);
    if (crouch) t.to(s, { seat: crouch, duration: 0.45, ease: 'power2.inOut' }, at0);
    t.to(s, { ['bat' + k]: arms.A.upper, ['cang' + k]: arms.A.fore, than: N.than + away('A'), dau: N.dau + away('A') * 0.6, dauY: 6, nhinX: -side * 2.4, nhinY: 2.2, cuoi: 0.9, mieng: 0.2, mayL: 0.5, mayR: 0.5, duration: 0.5, ease: 'power2.out' }, at0);
    t.set(s, { rope: 1 }, plan.lead);
    for (let i = 0, n = Math.max(2, Math.round(h / half)); i < n; i++) {
      const ph = i % 2 ? 'B' : 'A';
      t.to(s, { ['bat' + k]: arms[ph].upper, ['cang' + k]: arms[ph].fore, than: N.than + away(ph), dau: N.dau + away(ph) * 0.6, duration: half, ease: 'sine.inOut' }, plan.lead + i * half);
    }
    t.set(s, { rope: 0 }, end);
    this._khep(t, 0.5, end);
    return t;
  }

  /** QUỲ XUỐNG ngang tầm con vật dưới sàn và GIỮ (thế quỳ): vuốt ve, khám, cho ăn diễn khi đang quỳ. `standUp()` để đứng. */
  kneel() {
    const t = this.tl(), s = this.s;
    t.to(s, { dauY: 4, nhinY: 1.6, cuoi: 0.9, duration: 0.3, ease: 'power2.in' }, 0);
    this._khep(t, 0.6, 0.05, { seat: 1, kneel: 1 });
    return t;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // ĐỢT 42 E — SÁT SÀN: NHẶT đồ dưới sàn (`pickUp`), NGỒI BỆT xếp bằng (`sitOnFloor`), NẰM trên sàn / sofa (`lieDown`). Hai thế giữ cuối dậy
  // bằng `standUp` (qua dáng quỳ). Hình học chân mới: kênh `floor42e` / `squat42e` cộng thêm vào góc khớp chân (`_floorLegAdd`), người hạ
  // xuống đúng tới chỗ chân chạm sàn (`_floorContactDrop`); nằm: cả người xoay quanh hông (`lie42e`), chỗ thấp nhất đặt lên mặt sàn (`_floorLay`).
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

});
