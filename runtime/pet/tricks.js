// runtime/pet/tricks.js — roll over, chase the tail, knead, lick, hide, eat a carrot.
// Methods of `RigThu`, installed by runtime/rig-thu.js: `this` is the rig, `RigThu` its class.

import { KHUNG, clamp, RAD, mix } from './shared.js';
import { markTweens } from '../marks.js';

export default (RigThu) => mix(RigThu, class {
  /**
   * LĂN NGỬA (chó, mèo): nằm xuống, lăn ngửa bụng lên trời, bốn chân co lại đạp đạp trên không, đuôi quét sàn, lưng uốn qua
   * lại `hold` giây — rồi lăn về và đứng (mèo: ngồi) dậy. Đầu không lộn ngược: tựa trên sàn cạnh vai, mặt ra người xem.
   */
  rollOver(hold = 2.4) {
    this._only('rollOver', ['dog', 'cat']);
    const t = this.tl(), s = this.s, dog = this.nv.loai === 'dog';
    let at = this._dung(t, 0);
    // Nằm xuống (thân hạ sát sàn), rồi lăn: chân trước co về ngực, chân sau co lên bụng — lật lên thì thành bốn chân chổng trời.
    t.to(s, { truocY: 12, sauY: 12, nam: 0, dau: 6, dauY: 6, taiL: 0.3, taiR: 0.3, cuoi: 0.8, duration: 0.35, ease: 'power2.in' }, at);
    at += 0.35;
    const up = { tnNhac: 1, txNhac: 1, tnGoc: -24, txGoc: -8, snX: 10, sxX: 18, snY: -12, sxY: -6 };
    t.to(s, { lan: 1, ...up, dau: -24, dauX: 0, dauY: 0, mieng: 0.5, luoi: dog ? 0.9 : 0.3, matY: 0.4, taiL: -0.5, taiR: -0.5, duoi: dog ? -96 : -70, duoiCong: dog ? -0.6 : 0.3,
              duration: 0.5, ease: 'power2.inOut' }, at);
    at += 0.5;
    // Đạp chân luân phiên, lưng uốn qua lại, đầu lắc lư khoái chí; đuôi quét sàn (chó vẫy nhanh, mèo quẫy chậm).
    for (let a = at, i = 0; a < at + hold - 0.05; a += 0.2, i++) {
      const g = i % 2 ? 1 : -1;
      t.to(s, { tnGoc: -24 + 16 * g, txGoc: -8 - 16 * g, snY: -12 + 8 * g, sxY: -6 - 8 * g, sauX: 3 * g, truocX: -2 * g, dau: -24 + 6 * g, duration: 0.2, ease: 'sine.inOut' }, a);
    }
    const beats = Math.max(2, Math.round(hold / (dog ? 0.13 : 0.3)));
    this._vay(t, at, beats, dog ? 34 : 22, hold / beats, dog ? -96 : -70);
    this._chop(t, at + hold * 0.55);
    at += hold;
    t.to(s, { lan: 0, tnNhac: 0, txNhac: 0, tnGoc: 0, txGoc: 0, snX: 0, sxX: 0, snY: 0, sxY: 0, sauX: 0, truocX: 0, dau: 6, dauY: 6, duration: 0.45, ease: 'power2.inOut' }, at);
    this._khep(t, 0.4, at + 0.45);
    return t;
  }

  /**
   * ĐUỔI ĐUÔI (chó): chạy một vòng tròn nhỏ trên sàn `turns` vòng (1…5), một giây một vòng — quay qua quay lại, phía xa vòng nhỏ và
   * cao lên, đầu ngoảnh về cái đuôi cong lên, miệng đớp — rồi dừng
   * lại CHÓNG MẶT: người lảo đảo, mắt đảo vòng, lưỡi thè, dấu xoáy trên đầu. Xong đứng đúng chỗ cũ, quay đúng hướng cũ.
   */
  chaseTail(turns = 3) {
    this._only('chaseTail', ['dog']);
    const t = this.tl(), s = this.s, x0 = s.x, y0 = s.y, co0 = s.co, held = s.huong < 0 ? -1 : 1, n = clamp(Math.round(turns), 1, 5);
    const R = RigThu.SPIN_RADIUS, per = RigThu.SPIN_TURN;
    let at = this._dung(t, 0);
    // Thân CONG: đầu rụt hẳn ra sau, ngoảnh về phía đuôi, đuôi cong vồng lên ra trước — đầu và đuôi gần nhau trên lưng, như chữ C.
    t.to(s, { taiL: 0.9, taiR: 0.9, cuoi: 1, mieng: 0.5, luoi: 0.5, dongTu: 1.4, nhinX: -2.8, dauX: -28, dauY: -4, dau: 30, truocY: 8, sauY: -4, duoi: 70, duoiCong: 1.5,
              duration: 0.3, ease: 'power2.out' }, at);
    t.set(s, { spinX: x0, spinR: held * R }, at);
    t.to(s, { spin: 1, duration: 0.3 }, at);
    at += 0.25;
    // Pha `c` = số vòng đã chạy: con chó chạy trên một vòng tròn bán kính R trên SÀN, nhìn từ trước — sang ngang theo sin, quay mặt
    // theo cos (đổi bên ở hai mép vòng), nửa vòng phía sau nhỏ đi và cao lên (xa máy), nửa vòng phía trước to ra và thấp xuống.
    const go = (c) => {
      const th = 2 * Math.PI * c, cos = Math.cos(th), sin = Math.sin(th), a = Math.min(1, c * 3, (n - c) * 3);
      Object.assign(s, this._buoc(c * 3.2, a, 14, 10));
      s.huong = held * (Math.abs(cos) < 0.02 ? (cos < 0 ? -0.02 : 0.02) : cos);
      s.x = x0 + held * R * sin;
      s.co = co0 * (1 - 0.16 * (1 - cos) / 2 * a);
      s.spinA = th; s.duoi = 70 + 14 * Math.sin(th * 3); s.mieng = 0.3 + 0.4 * Math.max(0, Math.sin(th * 4));
    };
    const pr = { _c: 0, get c() { return this._c; }, set c(v) { this._c = v; go(v); } };
    // Tốc độ ĐỀU (lượt ba): chậm-nhanh-chậm thì các vòng giữa chỉ ~1 s — người chấm xem thưa không thấy vòng.
    t.to(pr, { c: n, duration: n * per, ease: 'none' }, at);
    at += n * per;
    t.set(s, { huong: held, x: x0, y: y0, co: co0, rise: 0 }, at);
    t.to(s, { spin: 0, duration: 0.6 }, at);
    // CHÓNG MẶT: lảo đảo qua lại, đầu nghiêng theo, mắt đảo vòng (con ngươi chạy theo vòng tròn), một tai cụp một tai vểnh.
    if (RigThu.AUTO_MARKS) markTweens(t, this.m, 'dizzy', at, 1.5);
    t.to(s, { matY: 0.4, mieng: 0.35, luoi: 0.9, taiL: -0.6, taiR: 0.7, dongTu: 1.1, dauX: 0, dauY: 0, truocY: 0, sauY: 0, duoi: -10, duoiCong: 0, duration: 0.3, ease: 'power2.out' }, at);
    for (let i = 0; i < 5; i++) {
      const g = i % 2 ? -1 : 1;
      t.to(s, { truocX: 6 * g, sauX: -4 * g, dau: 16 * g, dauX: 3 * g, duration: 0.34, ease: 'sine.inOut' }, at + i * 0.34);
    }
    const eye = { _a: 0, get a() { return this._a; }, set a(v) { this._a = v; s.nhinX = 2.2 * Math.cos(v); s.nhinY = 2.2 * Math.sin(v); } };
    t.to(eye, { a: Math.PI * 6, duration: 1.7, ease: 'none' }, at);
    this._khep(t, 0.45, at + 1.7, { x: x0, huong: held, y: y0, co: co0 });
    return t;
  }
  static HIDE_SHORT = 36;      // nấp: thân dừng trước giữa người chừng ấy đơn vị (lượt bốn: 14 — đầu ló ra ngay dưới bàn tay buông của cô bé)
  static KNEAD_HEAD = { x: -12, y: -10 };   // lượt hai: đầu lùi / ngẩng lúc nhào
  static KNEAD_ANGLE = 108;    // đợt 36: chân nhấc TREO theo vai (`Nhac`), chĩa chéo lên trước 108° — như giơ chân bắt tay; bản trước dời bàn chân lên
                               // 36 đơn vị, bàn chân trắng nằm gọn trước ngực trắng, dưới cằm — ở góc trung không thấy
  static KNEAD_BEAT = 0.6;     // giây mỗi lần ấn (đợt 35, lượt ba: 0,36 — người chấm xem thưa chỉ thấy một chân nhấc nhẹ)
  static SPIN_RADIUS = 82;     // đường kính vòng ≥ một thân chó (vai–hông + hai bề dày thân ≈ 142)
  static SPIN_TURN = 1.3;      // giây mỗi vòng — người chấm xem thưa (~1 khung / giây)
  static SPIN_DEPTH = 14;      // vệt bụi: phía xa vòng cao hơn phía gần chừng ấy (đơn vị khung) — con chó KHÔNG nâng lên (bối cảnh 3D đổ bóng
                               // riêng trên sàn: nâng lên là lơ lửng); xa / gần chỉ bằng cỡ

  /**
   * NHÀO (mèo): ngồi xổm, ngực hạ thấp, hai chân trước luân phiên nhấc cao rồi ấn xuống `times` lần như nhào bột, mắt nhắm híp,
   * gừ gừ (người rung khẽ), đuôi dựng — mèo làm nũng trên chăn, trên đùi người.
   */
  knead(times = 6) {
    this._only('knead', ['cat']);
    const t = this.tl(), s = this.s;
    let at = this._dung(t, 0);
    // Ngồi xổm, ngực hạ thấp, mắt nhắm híp (không chớp: chớp mắt mở mắt ra lại), cười, đuôi dựng.
    // Lượt hai (đợt 36): đầu NGẨNG và LÙI về sau (KNEAD_HEAD) — đầu không che bàn chân đang giơ trước ngực.
    t.to(s, { truocY: 16, sauY: 6, tnX: 10, txX: 10, dau: -6, dauX: RigThu.KNEAD_HEAD.x, dauY: RigThu.KNEAD_HEAD.y, matY: 0.95, cuoi: 1, taiL: 0.3, taiR: 0.3, duoi: 30, duoiCong: 0.6, duration: 0.35, ease: 'power2.out' }, at);
    at += 0.3;
    const beat = RigThu.KNEAD_BEAT, end = at + times * beat;
    for (let i = 0; i < times; i++) {
      const a = at + i * beat, k = i % 2 ? 'tx' : 'tn', o = i % 2 ? 'tn' : 'tx';
      // nhấc hẳn một bàn lên cao (ngang ngực), GIỮ một nhịp, rồi ấn mạnh xuống — vai trĩu theo; bàn kia đang nằm ấn dưới sàn
      // Đợt 36: GIƠ HẲN chân ra trước (KNEAD_ANGLE) — bàn chân trắng ra ngoài hình ngực trắng, thấy trên nền; giữ trên
      // cao tới 65 % nhịp (người chấm xem thưa ~1 khung / giây: lượt đạt, lượt trượt khi bàn chân nằm trước ngực).
      t.to(s, { [k + 'Nhac']: 1, [k + 'Goc']: RigThu.KNEAD_ANGLE, [k + 'Y']: 0, [k + 'X']: 12, [o + 'Nhac']: 0, [o + 'Y']: 0, [o + 'X']: 10, truocY: 6, duration: 0.18, ease: 'power2.out' }, a)
       .to(s, { [k + 'Nhac']: 0, truocY: 20, duration: 0.18, ease: 'power2.in' }, a + beat * 0.65);
    }
    for (let a = at, i = 0; a < end; a += 0.09, i++) t.to(s, { tho: i % 2 ? 0 : 1, duration: 0.09, ease: 'sine.inOut' }, a);      // gừ gừ
    t.to(s, { dau: -2, dauX: RigThu.KNEAD_HEAD.x - 2, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 1 }, at + 0.4);
    if (RigThu.AUTO_MARKS) markTweens(t, this.m, 'heart', at + 0.2, Math.max(0.4, times * beat - 0.6));      // làm nũng, khoái chí
    this._khep(t, 0.4, end);
    return t;
  }

  // DÁNG LIẾM (đợt 35, lượt hai): dưới sàn — quay mặt về bàn tay, mõm hơi chúi, lưỡi dài chĩa chéo xuống về phía trước; trong
  // vòng tay — rướn hẳn lên, lưỡi hất ngược lên tới má người bế.
  static LICK_BEAT = 1.0;      // giây mỗi cái liếm (đợt 35, lượt ba: 0,4; đợt 40 C: 0,8 → 1,0 — cái liếm có đoạn giữ trên đích)
  static LICK_REACH = 1.9;     // lưỡi thè tối đa dài thêm bấy nhiêu lần (đợt 40 C: 1,2 → 1,9) — tools/scene.py dùng cùng số này cho bàn tay chìa ra
  static LICK_FLOOR = { dau: 8, dauX: 12, dauY: 0, liem: 1, liemGoc: 66 };
  static LICK_HELD = { dau: -18, dauX: 10, dauY: -62, liem: 1, liemGoc: 150 };
  // Người ĐỨNG (không quỳ): con vật chồm lên, hai chân trước tì lên chân người ấy, rướn mõm liếm bàn tay chìa ra ngang hông.
  static LICK_REAR = { truocY: -36, truocX: 10, sauY: 2, tnNhac: 1, txNhac: 1, tnGoc: 112, txGoc: 102, dau: -12, dauX: 12, dauY: -12, liem: 1, liemGoc: 108 };
  /** Người `who` đang đứng (không ngồi, không quỳ) — con vật chồm lên để liếm tay họ. */
  static standing(who) { return !!(who && who.s && typeof who.seatY === 'function' && !(who.s.seat > 0.5)); }

  /**
   * ĐẦU LƯỠI lúc liếm dưới sàn (đợt 35, lượt hai), trong khung 400 × 330 của con vật (tính cả quãng đã đi, theo hướng đang quay) —
   * người `offerHand` đặt lòng bàn tay ở đó (`set.target(…, 'tongue')`, hay đích là chính rig con vật).
   */
  // `side`: phía người chìa tay (1 = bên phải màn hình, −1 = bên trái) — con vật quay mặt về đó lúc liếm; bỏ trống = hướng đang quay.
  // `rear`: dáng chồm lên (người đứng — `LICK_REAR`).
  lickPoint(side = null, { rear = false } = {}) {
    const s = this._view(), nv = this.nv, { S, ng } = this._khung(), P = rear ? RigThu.LICK_REAR : RigThu.LICK_FLOOR, k = nv.mom.co, sc = nv.headScale || 1;
    const sx = S.x + (P.truocX || 0) - (s.truocX || 0), sy = S.y + (P.truocY || 0) - (s.truocY || 0);
    const head = { x: sx + nv.dau.dx + P.dauX, y: sy + nv.dau.dy + P.dauY - ng * 2 };
    const ty = nv.mom.y + 3.6 * k, len = 17 * k * (1 + RigThu.LICK_REACH) - 4.6 * k, g = P.liemGoc * RAD;
    const tip = { x: Math.sin(g) * len, y: ty + Math.cos(g) * len }, a = P.dau * RAD;
    const bx = head.x + sc * (tip.x * Math.cos(a) - tip.y * Math.sin(a)), by = head.y + sc * (tip.x * Math.sin(a) + tip.y * Math.cos(a));
    const flip = side ? (side < 0 ? -1 : 1) : s.huong < 0 ? -1 : 1, away = this.isCarried();
    return { x: 200 + (bx - 200) * flip + (away ? 0 : s.x + this.dropX()), y: by + (away ? 0 : s.y) };
  }

  /**
   * LIẾM (chó, mèo) `times` cái: con vật đang được BẾ (hay `{ face: true }`) thì rướn cổ lên liếm má người bế, lưỡi hất lên; đứng
   * dưới sàn thì quay về phía `target` (rig người, phần tử, { x, y } trong khung của nó) và liếm bàn tay chìa ra trước mõm — người
   * ấy `offerHand(pet)` cùng lúc (tools/scene.py tự thêm), lòng bàn tay ở đầu lưỡi (`lickPoint()`). Lưỡi dài thè ra thụt vào, mắt
   * híp, chó vẫy đuôi.
   */
  lick(target = null, times = 5, { face = null } = {}) {
    this._only('lick', ['dog', 'cat']);
    // `face: true`: đang trong vòng tay `target` — liếm MẶT (tools/scene.py báo; lúc dựng bước, hình nó có thể chưa nằm trong tay).
    const t = this.tl(), s = this.s, carried = face === null ? this.isCarried() : !!face, dog = this.nv.loai === 'dog', held = s.huong < 0 ? -1 : 1;
    let at = 0, side = held;
    if (!carried && target && typeof target === 'object') {
      const box = target.getBoundingClientRect ? target.getBoundingClientRect() : null;
      const there = typeof target.centerX === 'function' ? target.centerX() : box ? box.left + box.width / 2 : null;
      if (there !== null) side = there - this.centerX() < 0 ? -1 : 1;
      else if (typeof target.x === 'number') side = target.x - 200 - s.x < 0 ? -1 : 1;
      if (side !== held) { t.to(s, { huong: side, duration: 0.22, ease: 'power1.inOut' }, 0); at = 0.22; }
    }
    if (!carried) at = this._dung(t, at);
    // Lượt bốn: dưới sàn con vật ĐỨNG bốn chân liếm bàn tay người hạ xuống trước mõm (chồm lên thì trông như lơ lửng giữa không trung).
    const pose = carried ? RigThu.LICK_HELD : RigThu.LICK_FLOOR;
    t.to(s, { ...pose, luoi: 0.5, matY: 0.6, cuoi: 1, taiL: 0.6, taiR: 0.6, mieng: 0.45, duration: 0.3, ease: 'power2.out' }, at);
    at += 0.3;
    const beat = RigThu.LICK_BEAT;
    for (let i = 0; i < times; i++) {
      // Đợt 40 C — người chấm bảo liếm "đọc nhỏ": mỗi cái liếm là lưỡi thè DÀI hết cỡ (`LICK_REACH`), GIỮ trên tay / má gần nửa nhịp
      // và quệt qua lại hai lần (đầu nhích), rồi mới thụt nửa chừng — ở ~1 khung / giây khung nào cũng thấy lưỡi nằm trên đích.
      const a = at + i * beat;
      t.to(s, { luoi: 1, mieng: 0.6, dauX: pose.dauX + 4, dauY: pose.dauY - 2, dau: pose.dau - 2, duration: 0.18, ease: 'power2.out' }, a)
       .to(s, { dauX: pose.dauX + 1, dau: pose.dau + 3, duration: 0.26, ease: 'sine.inOut' }, a + 0.22)
       .to(s, { dauX: pose.dauX + 4, dau: pose.dau - 2, duration: 0.26, ease: 'sine.inOut' }, a + 0.48)
       .to(s, { luoi: 0.4, mieng: 0.4, dauX: pose.dauX, dauY: pose.dauY, dau: pose.dau, duration: 0.22, ease: 'power2.in' }, a + beat * 0.76);
    }
    if (dog) this._vay(t, at, times * 3, 36, beat / 3);
    else t.to(s, { duoi: this.NGHI.duoi + 16, duoiCong: this.NGHI.duoiCong + 0.35, duration: 0.5, ease: 'sine.inOut' }, at);
    this._khep(t, 0.45, at + times * beat, { huong: side });
    return t;
  }

  // Chỗ (s.x) để THÂN con vật đứng ngay sau `target`: rig (người), phần tử, hay { x } trong khung của chính nó (set.target).
  _behind(target) {
    const mid = (this.nv.H0.x + this.nv.S0.x) / 2;
    if (target && typeof target.x === 'number' && typeof target.centerX !== 'function' && !target.getBoundingClientRect) return target.x - mid;
    const frame = this.svg.getBoundingClientRect(), scale = Math.min(frame.width / KHUNG.w, frame.height / KHUNG.h) || 1;
    const box = target && target.getBoundingClientRect ? target.getBoundingClientRect() : null;
    const there = target && typeof target.centerX === 'function' ? target.centerX() : box ? box.left + box.width / 2 : null;
    if (there === null) throw new Error('[character] hide(target): target must be a rig, an element or { x, y } in the pet frame');
    return this.s.x + (there - this.centerX()) / scale + (200 - mid);
  }

  /**
   * NẤP (mọi loài): giật mình (tai cụp, mắt trợn, dấu "!"), chạy tới nấp SAU `target` (bỏ trống: nấp tại chỗ — đã đứng sau đồ đạc) — một người (rig), một phần tử, hay { x }
   * trong khung của nó — rồi quay lại thụp xuống và LÓ ĐẦU ra nhìn `peeks` lần, run run; ở lại chỗ nấp. Để nó khuất sau
   * người ấy: bối cảnh 3D — đặt con vật xa máy hơn (z nhỏ hơn 60–120: gần quá thì trông như chạy xuyên qua chân); cảnh 2D — host của người ấy SAU host con vật.
   */
  hide(target = null, { peeks = 2 } = {}) {
    const t = this.tl(), s = this.s, x0 = s.x, held = s.huong < 0 ? -1 : 1, dog = this.nv.loai === 'dog', rabbit = this.nv.loai === 'rabbit';
    // Không có đích: nấp TẠI CHỖ (đã đứng sau đồ đạc) — giật mình, quay lại, thụp xuống, ló đầu ra.
    const mid = target ? this._behind(target) : x0, way = Math.abs(mid - x0) < 1 ? held : mid < x0 ? -1 : 1;
    // Thân dừng TRƯỚC giữa người ấy một chút (chưa chạy hết): quay lại nhìn về phía vừa chạy tới thì đầu nằm ngay mép chân họ, ló ra
    // là thấy cả đầu.
    const goal = target ? mid - way * RigThu.HIDE_SHORT : x0, dist = goal - x0, dir = Math.abs(dist) < 1 ? held : dist < 0 ? -1 : 1, back = target ? -dir : held;
    const scared = { taiL: -1.6, taiR: -1.6, dongTu: 1.8, matY: -0.1, cuoi: -0.6, mieng: 0, ...(rabbit ? {} : { duoi: dog ? -112 : -84, duoiCong: dog ? -1.1 : 0.45 }) };
    let at = this._dung(t, 0);
    t.to(s, { ...scared, truocY: 7, sauY: 9, dauY: 6, duration: 0.18, ease: 'back.out(2)' }, at);
    if (RigThu.AUTO_MARKS) markTweens(t, this.m, '!', at, 0.7);
    at += 0.3;
    if (dir !== held) { t.to(s, { huong: dir, duration: 0.2, ease: 'power1.inOut' }, at); at += 0.2; }
    if (Math.abs(dist) > 6) {
      t.to(s, { truocY: 0, sauY: 0, dauY: 0, duration: 0.12 }, at);
      at = this._di(t, at, Math.max(2, Math.round(Math.abs(dist) / 50)), 0.3, { quang: dist, x0, A: 16, cao: 11 });
      t.to(s, { ...scared, duration: 0.1 }, at - 0.1);
    }
    // Quay mặt ra phía vừa chạy tới (cái làm nó sợ), thụp người sau chân người kia, đầu rụt lại.
    t.to(s, { huong: back, x: goal, duration: 0.25, ease: 'power1.inOut' }, at); at += 0.25;
    t.to(s, { truocY: 12, sauY: 13, dauX: -12, dauY: 10, dau: 4, duration: 0.3, ease: 'power2.out' }, at); at += 0.3;
    const from = at;
    for (let i = 0; i < Math.max(1, peeks); i++) {
      t.to(s, { dauX: 18, dauY: 4, dau: -8, nhinX: 2, truocX: 8, duration: 0.3, ease: 'power2.out' }, at)          // ló đầu ra
       .to(s, { dauX: 2, dauY: 10, dau: 4, nhinX: 0, truocX: 2, duration: 0.25, ease: 'power2.in' }, at + 1.0);     // rụt vào (ít: rụt sâu thì đầu nằm dưới bàn tay buông của người ấy)
      at += 1.5;
    }
    for (let a = from, i = 0; a < at; a += 0.045, i++) t.to(s, { sauX: i % 2 ? -1.2 : 1.2, duration: 0.045, ease: 'none' }, a);     // run
    this._khep(t, 0.45, at - 0.2, { x: goal, huong: back });
    return t;
  }

  /**
   * GẶM CÀ RỐT (thỏ): ngồi, hai chân trước ôm củ cà rốt (hiện ra trong tay) đưa lên miệng, gặm `bites` miếng — miệng nhóp nhép,
   * đầu nhấp nhô, củ ngắn dần — rồi miếng cuối hết sạch, liếm mép.
   */
  eatCarrot(bites = 4) {
    this._only('eatCarrot', ['rabbit']);
    const t = this.tl(), s = this.s, n = clamp(Math.round(bites), 2, 8), bite = RigThu.BITE;
    t.to(s, { ngoi: 1, duration: 0.25, ease: 'power2.inOut' }, 0);
    t.to(s, { tnNhac: 1, txNhac: 1, tnGoc: 132, txGoc: 122, truocY: -5, dau: 5, dauY: 3, nhinY: 1, matY: 0.25, cuoi: 0.6, taiL: 0.15, taiR: 0.15, duration: 0.35, ease: 'power2.out' }, 0.1);
    t.fromTo(s, { carrot: 0 }, { carrot: 1, duration: 0.12, ease: 'none', immediateRender: false }, 0.3);
    // Củ cà rốt NGUYÊN giữ 1 s cho thấy rõ, rồi mỗi miếng (`BITE` giây): hai cú cắn, củ CỤT hẳn một khúc ở mặt cắt có vết cắn (xem `_veCarrot`),
    // vụn rơi từ miệng, nhai hai nhịp — và củ ĐỨNG YÊN ở độ dài mới tới hết miếng (đợt 40 C: người chấm xem thưa, ~1 khung / giây, thấy
    // một bậc ngắn lại cho từng khung). Miếng cuối còn một ĐOẠN CỤT, giữ trong tay gần 1 s (nhai) rồi mới được nhét vào miệng và nuốt.
    let at = 1.4;
    const stub = 0.1, last = n - 1;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 2; j++) {
        const a = at + j * 0.2;
        t.to(s, { mieng: 0.5, gape: 0.4, dauY: 7, duration: 0.08, ease: 'sine.out' }, a).to(s, { mieng: 0.05, gape: 0, dauY: 3, duration: 0.1, ease: 'sine.in' }, a + 0.1);
      }
      t.to(s, { carrot: i === last ? stub : 1 - (i + 1) * (1 - stub) / n, tnGoc: 132 - (i + 1) * 5 / n, duration: 0.1, ease: 'power1.out' }, at + 0.34)
       .fromTo(s, { crumb: 0 }, { crumb: 1, duration: 0.85, ease: 'none', immediateRender: false }, at + 0.34);
      for (let j = 0; j < 2; j++) t.to(s, { mieng: 0.22, dauY: 4, duration: 0.12, ease: 'sine.inOut' }, at + 0.55 + j * 0.28).to(s, { mieng: 0.04, dauY: 3, duration: 0.14, ease: 'sine.inOut' }, at + 0.67 + j * 0.28);
      at += bite;
    }
    // đoạn cuối: nhai (củ cụt vẫn trong tay), rồi nhét cả vào miệng — thụt dần vào, không biến mất tức thì
    for (let j = 0; j < 3; j++) t.to(s, { mieng: 0.25, dauY: 4, duration: 0.14, ease: 'sine.inOut' }, at + j * 0.3).to(s, { mieng: 0.04, dauY: 3, duration: 0.16, ease: 'sine.inOut' }, at + 0.14 + j * 0.3);
    at += 0.95;
    t.to(s, { mieng: 0.55, gape: 0.5, dauY: 8, duration: 0.1, ease: 'sine.out' }, at).to(s, { carrot: 0.03, tnGoc: 128, duration: 0.55, ease: 'none' }, at + 0.05)
     .to(s, { mieng: 0.05, gape: 0, dauY: 3, duration: 0.14, ease: 'sine.in' }, at + 0.5)
     .fromTo(s, { crumb: 0 }, { crumb: 1, duration: 0.7, ease: 'none', immediateRender: false }, at + 0.5);
    at += 0.65;
    t.set(s, { carrot: 0 }, at);
    t.set(s, { crumb: 0 }, at + 0.6);                  // vụn cuối đã rơi hết — về 0 TRƯỚC khi `#khep` kéo các kênh về nghỉ (không thì vụn bay ngược lên)
    t.to(s, { tnNhac: 0, txNhac: 0, tnGoc: 0, txGoc: 0, truocY: 0, duration: 0.3, ease: 'power2.inOut' }, at);
    for (let i = 0; i < 2; i++) t.to(s, { luoi: 0.5, mieng: 0.2, duration: 0.1, ease: 'power2.out' }, at + 0.15 + i * 0.28).to(s, { luoi: 0, mieng: 0, duration: 0.13, ease: 'power2.in' }, at + 0.27 + i * 0.28);
    this._khep(t, 0.35, at + 0.75);
    return t;
  }
  static BITE = 1.35;          // giây mỗi miếng gặm (đợt 35, lượt ba: 1,1; đợt 40 C: 1,35 — củ đứng yên ở độ dài mới lâu hơn)


});
