// runtime/person/gestures.js — hand signs and emotions (thumbs down, stop, heart, laugh, facepalm, salute, bow, wai…), handshake.
// Methods of `RigSVG`, installed by runtime/rig-svg.js: `this` is the rig, `RigSVG` its class.

import { KHUNG, DOI_Y, DAI, WAI_POSE, SHAKE_POSE, FACE_HANDS_POSE, STOP_POSE, WAG_POSE, BECKON_POSE, HEART_POSE, VSIGN_POSE, NAPE_POSE, HANDS_39, LAUGH_BELLY, clamp, chuanHoaGoc, mix } from './shared.js';

export default (RigSVG) => mix(RigSVG, class {
  /** CHÊ: ngón cái chĩa xuống trước ngực, mặt nhăn, lắc đầu nhẹ — "không nên", "sai rồi". Đi cặp với `thumbsUp`. */
  thumbsDown(hand = 'auto') {
    const t = this.tl(), s = this.s, N = this.NGHI;
    if (this._handsFull(hand)) return this.shake();
    const k = this._chestHand(hand);
    // Bàn tay đưa RA BÊN thân (không đặt giữa ngực, chỗ ống nghe / cà vạt): nắm tay giữa ngực lẫn vào áo (Gemini, đợt 5).
    this._ovPose(t, { [k]: [40, -112] }, { ['handZoom' + k]: 1.45, cuoi: -0.6, mayL: 0.95, mayR: 0.95, mieng: 0.1, chum: 0.3, duration: 0.35, ease: 'back.out(1.5)' });
    t.set(s, { ['tay' + k]: 'xuong' }, 0.05);
    for (let n = 0; n < 4; n++) t.to(s, { dau: N.dau + (n % 2 ? -5 : 5), duration: 0.16, ease: 'sine.inOut' }, 0.45 + n * 0.16);
    t.to(s, { ['ovCang' + k]: -104, duration: 0.15, ease: 'power2.out', yoyo: true, repeat: 1 }, 0.5);
    this._khep(t, 0.45, 1.3);
    return t;
  }

  /** CHẶN LẠI: giơ lòng bàn tay ra trước ngực, mặt nghiêm, nhấn một cái — "dừng lại!", "đừng cho chó ăn sô-cô-la". */
  stopSign(hold = 1.2, { hand = 'auto' } = {}) {
    const t = this.tl(), s = this.s, k = this._gestureHand(hand);
    if (!k) return this.shake();
    this._faceFront(t);
    this._ovPose(t, { [k]: STOP_POSE }, { ['handZoom' + k]: 1.45, cuoi: -0.3, mayL: 0.15, mayR: 0.15, chum: 0.2, dauY: -2, duration: 0.25, ease: 'back.out(1.8)' });
    t.set(s, { ['tay' + k]: 'xoe' }, 0.05);
    t.to(s, { ['handZoom' + k]: 1.6, dauY: 2, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 }, 0.35);
    this._khep(t, 0.4, 0.35 + hold);
    return t;
  }

  /** LẮC NGÓN TAY "không không": ngón trỏ giơ cạnh vai lắc qua lại, lắc đầu, môi mím. */
  fingerWag(times = 3, { hand = 'auto' } = {}) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this._gestureHand(hand);
    if (!k) return this.shake();
    this._ovPose(t, { [k]: WAG_POSE }, { ['handZoom' + k]: 1.5, cuoi: -0.1, chum: 0.5, mayL: 0.3, mayR: 0.3, duration: 0.3 });
    t.set(s, { ['tay' + k]: 'mot' }, 0.05);
    for (let n = 0; n < times * 2; n++) t.to(s, { ['ovCang' + k]: WAG_POSE[1] + (n % 2 ? -14 : 14), dau: N.dau + (n % 2 ? -4 : 4), duration: 0.15, ease: 'sine.inOut' }, 0.35 + n * 0.15);
    this._khep(t, 0.4, 0.4 + times * 0.3);
    return t;
  }

  /** VẪY GỌI LẠI GẦN: bàn tay ngửa đưa ra bên hông, các ngón vẫy vào mấy nhịp, cười, nghiêng đầu — gọi thú cưng, mời khách. */
  beckon(times = 3, { hand = 'auto' } = {}) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this._gestureHand(hand), m = k === 'L' ? -1 : 1;
    if (!k) return this.nod();
    this._ovPose(t, { [k]: BECKON_POSE }, { cuoi: 1, mayL: 0.6, mayR: 0.6, dau: N.dau + m * 5, duration: 0.3 });
    t.set(s, { ['tay' + k]: 'xoe' }, 0.05);
    for (let n = 0; n < times; n++) {
      const a = 0.35 + n * 0.36;
      t.set(s, { ['tay' + k]: 'mo' }, a + 0.12).set(s, { ['tay' + k]: 'xoe' }, a + 0.3);
      t.to(s, { ['ovCang' + k]: BECKON_POSE[1] + 28, duration: 0.15, ease: 'power2.in' }, a).to(s, { ['ovCang' + k]: BECKON_POSE[1], duration: 0.2, ease: 'power2.out' }, a + 0.15);
    }
    this._khep(t, 0.4, 0.4 + times * 0.36);
    return t;
  }

  /** BẮN TIM: nắm tay trước ngực, ngón cái – ngón trỏ bắt chéo, một trái tim đỏ bật ra và đập hai nhịp, nháy mắt cười. */
  fingerHeart(hold = 1.4, { hand = 'auto' } = {}) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this._gestureHand(hand), m = k === 'L' ? -1 : 1;
    if (!k) return this.express('happy', hold);
    this._faceFront(t);
    this._ovPose(t, { [k]: HEART_POSE }, { ['handZoom' + k]: 1.6, cuoi: 1, mieng: 0.25, mayL: 0.6, mayR: 0.6, dau: N.dau - m * 6, duration: 0.3, ease: 'back.out(1.6)' });
    t.set(s, { ['tay' + k]: 'tim' }, 0.05);
    t.to(s, { ['heart' + k]: 1, duration: 0.3, ease: 'back.out(3)' }, 0.3);
    t.to(s, { matY: 0.75, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 }, 0.5);         // nháy mắt
    for (let n = 0; n < 2; n++) t.to(s, { ['heart' + k]: 1.25, duration: 0.14, ease: 'power2.out', yoyo: true, repeat: 1 }, 0.75 + n * 0.4);
    t.to(s, { ['heart' + k]: 0, duration: 0.2, ease: 'power2.in' }, 0.3 + hold);
    t.set(s, { ['tay' + k]: 'mo' }, 0.55 + hold);                 // hạ tay thì buông dáng tay: hình bắn tim xuống tới hông trông lạc lõng
    this._khep(t, 0.4, 0.45 + hold);
    return t;
  }

  /** TẠO DÁNG CHỮ V: hai ngón tay giơ cạnh mặt, nghiêng đầu, cười tươi, nháy mắt — chụp ảnh, chào kết video. */
  vSign(hold = 1.4, { hand = 'auto' } = {}) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this._gestureHand(hand), m = k === 'L' ? -1 : 1;
    if (!k) return this.express('happy', hold);
    this._faceFront(t);
    this._ovPose(t, { [k]: VSIGN_POSE }, { ['handZoom' + k]: 1.6, cuoi: 1, mieng: 0.35, mayL: 0.6, mayR: 0.6, dau: N.dau + m * 8, dauX: m * 2, duration: 0.3, ease: 'back.out(1.6)' });
    t.set(s, { ['tay' + k]: 'hai' }, 0.05);
    t.to(s, { matY: 0.75, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 }, 0.5);
    t.to(s, { ['ovCang' + k]: VSIGN_POSE[1] - 8, duration: 0.18, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.75);
    t.set(s, { ['tay' + k]: 'mo' }, 0.45 + hold);
    this._khep(t, 0.4, 0.35 + hold);
    return t;
  }

  // ═════════════════════════════════════ ĐỢT 39 B — cười lớn, lau nước mắt, ôm trán, suỵt, ra dấu OK, chào kiểu quân đội
  // Sáu cử chỉ thường ngày, không đạo cụ. Bàn tay tới ĐÚNG chỗ trên mặt (môi, mắt, trán, chân mày) ở mọi nhân vật — trẻ con tay ngắn
  // đầu to, người ngồi, người đang quay 3/4 (quay về trước như `vSign`) — nhờ ĐO lúc dựng (`_gestureFit`): đặt tạm dáng, vẽ, đo đầu ngón /
  // lòng bàn tay và đích trên mặt, sửa đích của _armTo đúng bằng phần lệch, lặp vài lần, rồi trả mọi kênh về như cũ và vẽ lại.

  // Điểm (hệ `_aimOf`) của phần tử `el`: tâm khung hình vẽ của nó, hay điểm (x, y) trong hệ của nó. null khi chưa vẽ được (host ẩn).
  _gestureAt(el, x = null, y = null) {
    const q = el && el.getScreenCTM ? el.getScreenCTM() : null, r = this.svg && this.svg.getScreenCTM ? this.svg.getScreenCTM() : null;
    if (!q || !r || !Math.hypot(r.a, r.b)) return null;
    let px = x, py = y;
    if (px === null) {
      let b; try { b = el.getBBox(); } catch (error) { return null; }
      if (!b || (!b.width && !b.height)) return null;
      px = b.x + b.width / 2; py = b.y + b.height / 2;
    }
    const p = new DOMPoint(px, py).matrixTransform(r.inverse().multiply(q));
    return Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: p.x - this.s.x, y: p.y - this.s.y - DOI_Y } : null;
  }

  // Các điểm trên mặt (hệ `_aimOf`) ở dáng đang vẽ: hai mắt, hai chân mày, miệng, giữa mặt và nửa bề ngang mặt. Chưa đo được (host
  // ẩn): ước theo `_faceCentre`.
  _gestureFace() {
    const e = this.el, f = this._faceCentre(0), r = f.r;
    const guess = { eyeL: { x: f.x - r * 0.3, y: f.y + r * 0.08 }, eyeR: { x: f.x + r * 0.3, y: f.y + r * 0.08 }, browL: { x: f.x - r * 0.3, y: f.y - r * 0.12 },
                    browR: { x: f.x + r * 0.3, y: f.y - r * 0.12 }, mouth: { x: f.x, y: f.y + r * 0.42 }, centre: { x: f.x, y: f.y }, half: r * 0.62, measured: false };
    const pts = { eyeL: this._gestureAt(e.matL), eyeR: this._gestureAt(e.matR), browL: this._gestureAt(e.mayL), browR: this._gestureAt(e.mayR), mouth: this._gestureAt(e.momG), centre: this._gestureAt(e.khuon) };
    if (Object.values(pts).some((p) => !p)) return guess;
    let half = guess.half;
    try {
      const b = e.khuon.getBBox(), p0 = this._gestureAt(e.khuon, b.x, b.y + b.height / 2), p1 = this._gestureAt(e.khuon, b.x + b.width, b.y + b.height / 2);
      if (p0 && p1) half = Math.abs(p1.x - p0.x) / 2;
    } catch (error) { /* ước */ }
    return { ...pts, half, measured: true };
  }

  // ĐO MÀ ĐẶT TAY: góc `ov` (góc trên màn hình, như `_ovPose`) của tay `k` để điểm `ref()` (đo trên hình) tới `goal(mặt)` (đo trên
  // hình), ở dáng `pose` (kênh đầu, hình bàn tay, phóng to…), bắt đầu từ `guess` [bắp, cẳng] — dáng gần đúng, quyết định khuỷu ở đâu.
  // Trả { bat, cang, miss } — `miss`: còn lệch bao nhiêu đơn vị khung (tay chibi ngắn không với tới thì > 0), null khi không đo được
  // (host chưa hiện: dùng nguyên `guess`).
  _gestureFit(k, pose, ref, goal, guess) {
    const s = this.s, keys = [...new Set([...Object.keys(pose), 'ov' + k, 'ovBat' + k, 'ovCang' + k, 'carry' + k])];
    const was = Object.fromEntries(keys.map((key) => [key, s[key]]));
    let best = { bat: guess[0], cang: guess[1], miss: null };
    try {
      Object.assign(s, pose, { ['ov' + k]: 1, ['carry' + k]: 0 });
      // Đo lệch (đích − điểm tay) ở góc (b, c).
      const err = (b, c) => { s['ovBat' + k] = b; s['ovCang' + k] = c; this.apDung(); const r = ref(), g = goal(this._gestureFace()); return r && g ? [g.x - r.x, g.y - r.y] : null; };
      let [b, c] = guess;
      for (let n = 0; n < 14; n++) {
        const e0 = err(b, c);
        if (!e0) break;
        const miss = Math.hypot(e0[0], e0[1]);
        if (best.miss === null || miss < best.miss) best = { bat: b, cang: c, miss };
        (globalThis.__fit39 || (globalThis.__fit39 = [])).push({ k, n, a: [+b.toFixed(1), +c.toFixed(1)], miss: +miss.toFixed(1) });   // DEBUG39
        if (miss < 0.6) break;
        // Gauss–Newton với ma trận Jacobi ĐO bằng sai phân (2°), bước giới hạn 25°, có giảm chấn — tới được thì khớp, không tới
        // được (tay chibi ngắn) thì dừng ở chỗ gần nhất.
        const eb = err(b + 2, c), ec = err(b, c + 2);
        if (!eb || !ec) break;
        const J = [[(e0[0] - eb[0]) / 2, (e0[0] - ec[0]) / 2], [(e0[1] - eb[1]) / 2, (e0[1] - ec[1]) / 2]];
        const lam = 0.5, A = [[J[0][0] ** 2 + J[1][0] ** 2 + lam, J[0][0] * J[0][1] + J[1][0] * J[1][1]], [0, J[0][1] ** 2 + J[1][1] ** 2 + lam]];
        A[1][0] = A[0][1];
        const v = [J[0][0] * e0[0] + J[1][0] * e0[1], J[0][1] * e0[0] + J[1][1] * e0[1]], det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
        if (!det) break;
        let db = (A[1][1] * v[0] - A[0][1] * v[1]) / det, dc = (A[0][0] * v[1] - A[1][0] * v[0]) / det;
        const big = Math.max(Math.abs(db), Math.abs(dc));
        if (big > 25) { db *= 25 / big; dc *= 25 / big; }
        b = clamp(b + db, -80, 175); c = clamp(c + dc, -235, 235);          // cẳng tay gập quá 180° (chéo trước bắp tay) vẫn vẽ được
      }
    } finally { Object.assign(s, was); this.apDung(); }
    return best;
  }

  _gestureTip(k, shape) {
    const el = this.el.tay[k] && this.el.tay[k][shape] && this.el.tay[k][shape].querySelector('[data-tip39]');
    return () => this._gestureAt(el);
  }
  _gesturePalm(k, y = 10) { return () => this._gestureAt(this.el['coTay' + k], 0, y); }

  // Đưa tay `k` tới góc `a` (kênh `ov`) từ `at` trong `d` giây; `a` null → buông về dáng thường.
  _gestureOv(t, k, a, at, d, ease = 'power2.out', fresh = true) {
    if (!a) { t.to(this.s, { ['ov' + k]: 0, duration: d, ease }, at); return; }
    if (fresh) t.to(this.s, { ['ovBat' + k]: a.bat, ['ovCang' + k]: a.cang, duration: 0.02 }, at);
    else t.to(this.s, { ['ovBat' + k]: a.bat, ['ovCang' + k]: a.cang, duration: d, ease }, at);
    t.to(this.s, { ['ov' + k]: 1, ['carry' + k]: 0, duration: d, ease }, at);
  }

  /**
   * CƯỜI LỚN (cả người): mắt híp tịt, miệng há to, ngửa đầu ra sau, vai rung theo tiếng "ha ha", một bàn tay ôm bụng; nửa sau gập
   * người về trước (cúi đầu, tay ấn bụng), rồi ngẩng lên còn cười. Khác `express('laughing')` (chỉ nét mặt). `hold`: giây cười.
   */
  laugh(hold = 1.6) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this._gestureHand('auto'), m = k === 'L' ? -1 : 1;
    hold = clamp(+hold || 1.6, 0.8, 6);
    const T0 = 0.3, mid = T0 + hold * 0.5, end = T0 + hold, standing = s.seat < 0.5 && !(s.ride > 0.5);
    this._faceFront(t);
    t.to(s, { cuoi: 1, mieng: 1, chum: 0, matY: 0.92, mayL: 0.85, mayR: 0.85, doMa: 0.7, tho: 1, headPitch: -0.6, dauY: -5, dau: N.dau - m * 7, vai: N.vai - 5,
              duration: 0.3, ease: 'back.out(1.6)' }, 0);
    if (k) { this._ovPose(t, { [k]: LAUGH_BELLY }, {}, 0.35); t.set(s, { ['tay' + k]: 'xoe' }, 0.05); }
    // Vai, đầu và người NẢY theo từng tiếng "ha" (0,2 s một nhịp), miệng khép mở theo — đủ lớn để thấy ở cảnh trung.
    for (let a = T0, n = 0; a < end - 0.05; a += 0.2, n++) {
      const base = a < mid ? N.vai - 5 : N.vai + 2;
      t.to(s, { vai: base + (n % 2 ? 5 : -2), mieng: n % 2 ? 0.7 : 1, duration: 0.2, ease: 'sine.inOut' }, a);
      if (standing) t.to(s, { y: n % 2 ? 0 : -5, duration: 0.2, ease: 'sine.inOut' }, a);
    }
    // Gập về trước: cúi hẳn đầu, mắt vẫn híp, tay ấn vào bụng.
    t.to(s, { headPitch: 0.8, dauY: 13, dau: N.dau + m * 6, tho: 0, duration: 0.4, ease: 'power2.inOut' }, mid);
    if (k) t.to(s, { ['ovCang' + k]: LAUGH_BELLY[1] + 8, duration: 0.4, ease: 'power2.inOut' }, mid);
    // Hết cười: ngẩng lên, vẫn cười tươi.
    t.to(s, { headPitch: 0, dauY: 0, dau: N.dau, mieng: 0.4, matY: 0.35, vai: N.vai, y: 0, duration: 0.3, ease: 'power2.out' }, end);
    if (k) t.set(s, { ['tay' + k]: N['tay' + k] }, end + 0.6);
    this._khep(t, 0.45, end + 0.4);
    return t;
  }

  /**
   * LAU NƯỚC MẮT: mếu, nước mắt chảy, nấc hai nhịp; rồi lấy mu bàn tay (nắm tay) dụi mắt bên ấy, tay kia dụi mắt bên kia (một tay
   * đang cầm đồ thì tay rảnh dụi cả hai mắt), nước mắt khô dần; hít mũi một cái, rồi cười nhẹ, gắng gượng. `hand`: tay dụi trước.
   */
  wipeTears(hand = 'auto') {
    const t = this.tl(), s = this.s, N = this.NGHI, cry = RigSVG.EXPRESSIONS.crying;
    const busy = (side) => this.holds[side] && s['item' + side] > 0.5;
    const free = ['L', 'R'].filter((side) => !busy(side)), auto = this._freeHand('auto');
    const first = (hand === 'L' || hand === 'R') && !busy(hand) ? hand : free.includes(auto) ? auto : free[0];
    this._faceFront(t);
    t.to(s, { ...cry, duration: 0.35, ease: 'power2.out' }, 0);
    t.fromTo(s, { khocY: 0 }, { khocY: 1, duration: 0.9, ease: 'power1.in', immediateRender: false }, 0.2);
    for (const a of [0.4, 0.8]) t.to(s, { vai: cry.vai - 5, dauY: cry.dauY - 3, duration: 0.13, ease: 'power2.out' }, a).to(s, { vai: cry.vai, dauY: cry.dauY, duration: 0.25, ease: 'sine.inOut' }, a + 0.13);
    let at = 1.15;
    if (first) {
      const other = first === 'L' ? 'R' : 'L', hands = free.length === 2 ? [first, other] : [first, first], eyes = [first, other];
      const pose = { ...cry, matY: 0.9, headPitch: 0.4, dauY: cry.dauY + 7, huong: 0 };
      // Nắm tay NGAY DƯỚI mắt, lệch ra đuôi mắt một chút — đốt ngón dụi lên mắt.
      const fits = hands.map((k, n) => this._gestureFit(k, { ...pose, ['tay' + k]: 'nam' }, this._gesturePalm(k, 8),
        (f) => { const eye = f['eye' + eyes[n]], g = eyes[n] === 'L' ? -1 : 1; return { x: eye.x + g * f.half * 0.12, y: eye.y + f.half * 0.18 }; }, eyes[n] === k ? [118, -226] : [105, -212]));
      t.to(s, { headPitch: 0.4, dauY: cry.dauY + 7, matY: 0.9, duration: 0.3, ease: 'sine.inOut' }, at - 0.1);
      hands.forEach((k, n) => {
        const a = fits[n], start = at + n * 1.25, prev = n ? hands[n - 1] : null, g = k === 'L' ? 1 : -1;
        if (prev && prev !== k) { this._gestureOv(t, prev, null, start, 0.3, 'power2.inOut'); t.set(s, { ['tay' + prev]: N['tay' + prev] }, start + 0.3); }
        t.set(s, { ['tay' + k]: 'nam' }, start + 0.02);
        this._gestureOv(t, k, a, start, 0.3, 'power2.out', prev !== k);
        // Dụi: ba nhịp nhỏ quanh mắt, đầu nghiêng theo tay.
        for (let r = 0; r < 3; r++) t.to(s, { ['ovCang' + k]: a.cang + (r % 2 ? -7 : 7) * g, ['ovBat' + k]: a.bat + (r % 2 ? 2 : -2), dau: N.dau + (eyes[n] === 'L' ? -1 : 1) * (r % 2 ? 3 : 6),
                                          duration: 0.24, ease: 'sine.inOut' }, start + 0.32 + r * 0.24);
        t.to(s, { ['ovCang' + k]: a.cang, ['ovBat' + k]: a.bat, duration: 0.15 }, start + 1.04);
        t.to(s, { khoc: n ? 0 : 0.5, duration: 0.5 }, start + 0.5);
      });
      at += hands.length * 1.25;
      const last = hands[hands.length - 1];
      this._gestureOv(t, last, null, at, 0.35, 'power2.inOut');
      t.set(s, { ['tay' + last]: N['tay' + last] }, at + 0.3);
    } else t.to(s, { khoc: 0, duration: 0.6 }, at);
    // Hít mũi: vai nhấc, đầu ngẩng nhanh, mắt nheo.
    t.to(s, { tho: 1, vai: N.vai - 4, dauY: -2, headPitch: 0, matY: 0.55, mieng: 0, chum: 0.6, duration: 0.16, ease: 'power2.out' }, at)
     .to(s, { tho: 0, vai: N.vai, duration: 0.3, ease: 'sine.inOut' }, at + 0.16);
    // Cười nhẹ, gắng gượng: miệng cười nhỏ, mày vẫn hơi chau, giữ 1 s.
    t.to(s, { cuoi: 0.5, mieng: 0.05, chum: 0, matY: 0.12, mayL: 0.65, mayR: 0.65, dau: N.dau + 4, dauY: 0, khoc: 0, duration: 0.35, ease: 'power2.out' }, at + 0.35);
    this._khep(t, 0.45, at + 1.45);
    return t;
  }

  /**
   * ÔM TRÁN (facepalm): bàn tay duỗi đưa lên úp lên trán và hai mắt, đầu gục vào lòng bàn tay, lắc đầu chầm chậm, thở dài một hơi —
   * "trời ơi", bó tay. Hai tay đều cầm đồ: chỉ gục đầu, nhắm mắt, lắc và thở dài.
   */
  facepalm(hold = 1.2) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this._gestureHand('auto');
    hold = clamp(+hold || 1.2, 0.6, 6);
    const T0 = 0.5, end = T0 + hold + 0.3;
    this._faceFront(t);
    const face = { matY: 1, cuoi: -0.45, mieng: 0, chum: 0.2, mayL: 0.85, mayR: 0.85 };
    if (k) {
      const pose = { ['tay' + k]: 'chao', ['handZoom' + k]: 1.3, headPitch: 0.6, dauY: 13, huong: 0, ...face };
      // Lòng bàn tay giữa hai mắt, hơi cao — ngón duỗi lên trán, gốc bàn tay che hai mắt.
      const a = this._gestureFit(k, pose, this._gesturePalm(k, 14), (f) => ({ x: (f.eyeL.x + f.eyeR.x) / 2, y: (f.eyeL.y + f.eyeR.y) / 2 - f.half * 0.12 }), [105, -218]);
      t.set(s, { ['tay' + k]: 'chao' }, 0.05);
      this._gestureOv(t, k, a, 0, 0.45, 'power2.inOut');
      t.to(s, { ['handZoom' + k]: 1.3, duration: 0.3 }, 0.1);
    }
    t.to(s, { ...face, headPitch: 0.6, dauY: 13, vai: N.vai + 2, duration: 0.45, ease: 'power2.inOut' }, 0.1);
    // Lắc đầu chầm chậm trong lòng bàn tay.
    const beats = Math.max(2, Math.round(hold / 0.5));
    for (let n = 0; n < beats; n++) t.to(s, { dau: N.dau + (n % 2 ? -5 : 5), duration: hold / beats, ease: 'sine.inOut' }, T0 + n * hold / beats);
    t.to(s, { dau: N.dau, duration: 0.2 }, T0 + hold);
    // Thở dài: phồng ngực, rồi xệ vai, miệng chúm thổi ra.
    t.to(s, { tho: 1, duration: 0.3, ease: 'sine.inOut' }, T0 + hold * 0.3)
     .to(s, { tho: 0, vai: N.vai + 6, mieng: 0.22, chum: 0.6, duration: 0.6, ease: 'sine.inOut' }, T0 + hold * 0.3 + 0.3);
    if (k) t.set(s, { ['tay' + k]: N['tay' + k] }, end + 0.3);
    this._khep(t, 0.5, end);
    return t;
  }

  /** SUỴT: ngón trỏ dựng trên môi, mắt mở to, môi chúm "sh-h-h", người hơi rướn tới — "nói nhỏ thôi", "bé đang ngủ". */
  shush(hold = 1.2) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this._gestureHand('auto'), m = k === 'L' ? -1 : 1;
    hold = clamp(+hold || 1.2, 0.6, 6);
    const face = { matY: -0.18, mayL: 0.9, mayR: 0.9, chum: 1, mieng: 0.2, cuoi: 0 };
    this._faceFront(t);
    t.to(s, { ...face, headPitch: 0.22, dauY: 4, dau: N.dau - m * 4, vai: N.vai - 2, duration: 0.35, ease: 'power2.out' }, 0);
    if (k) {
      const pose = { ['tay' + k]: 'suyt', ['handZoom' + k]: 1.4, headPitch: 0.22, dauY: 4, dau: N.dau - m * 4, huong: 0, ...face };
      const a = this._gestureFit(k, pose, this._gestureTip(k, 'suyt'), (f) => ({ x: f.mouth.x, y: f.mouth.y }), [16, -176]);
      t.set(s, { ['tay' + k]: 'suyt' }, 0.05);
      this._gestureOv(t, k, a, 0, 0.35, 'back.out(1.4)');
      t.to(s, { ['handZoom' + k]: 1.4, duration: 0.25 }, 0.05);
    }
    // "Sh-h-h": môi chúm phồng ra hai nhịp, mắt liếc sang một bên rồi về.
    for (let n = 0; n < 2; n++) t.to(s, { mieng: 0.28, duration: 0.2, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.45 + n * hold * 0.45);
    t.to(s, { nhinX: m * 1.8, duration: 0.2 }, 0.4 + hold * 0.3).to(s, { nhinX: 0, duration: 0.2 }, 0.4 + hold * 0.65);
    if (k) t.set(s, { ['tay' + k]: N['tay' + k] }, 0.55 + hold);
    this._khep(t, 0.4, 0.4 + hold);
    return t;
  }

  /** RA DẤU OK: ngón cái và ngón trỏ khép vòng tròn, ba ngón giơ, cạnh mặt; nháy một mắt, cười, gật hai cái — "ổn rồi", "tuyệt". */
  okSign(hold = 1.2, { hand = 'auto' } = {}) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this._gestureHand(hand), m = k === 'L' ? -1 : 1;
    hold = clamp(+hold || 1.2, 0.6, 6);
    if (!k) return this.express('happy', hold);
    this._faceFront(t);
    const face = { cuoi: 1, mieng: 0.3, mayL: 0.55, mayR: 0.55 };
    const pose = { ['tay' + k]: 'ok', ['handZoom' + k]: 1.6, dau: N.dau + m * 6, huong: 0, ...face };
    // Vòng tròn ngang mắt, ngoài mép mặt phía tay ấy.
    const a = this._gestureFit(k, pose, this._gestureTip(k, 'ok'), (f) => ({ x: f.centre.x + m * f.half * 1.45, y: f['eye' + k].y }), [40, 130]);
    t.to(s, { ...face, dau: N.dau + m * 6, duration: 0.3, ease: 'back.out(1.6)' }, 0);
    t.set(s, { ['tay' + k]: 'ok' }, 0.05);
    this._gestureOv(t, k, a, 0, 0.3, 'back.out(1.6)');
    t.to(s, { ['handZoom' + k]: 1.6, duration: 0.25 }, 0.05);
    // Nháy mắt phía tay giơ (giữ 0,55 s), gật hai cái.
    t.to(s, { ['nhay' + k]: 1, duration: 0.1, ease: 'power2.out' }, 0.4).to(s, { ['nhay' + k]: 0, duration: 0.15, ease: 'power2.in' }, 0.95);
    for (let n = 0; n < 2; n++) t.to(s, { dauY: 6, duration: 0.15, ease: 'power2.out' }, 0.45 + n * 0.4).to(s, { dauY: 0, duration: 0.22, ease: 'power2.inOut' }, 0.6 + n * 0.4);
    t.set(s, { ['tay' + k]: N['tay' + k] }, 0.5 + hold);
    this._khep(t, 0.4, 0.35 + hold);
    return t;
  }

  /**
   * CHÀO KIỂU QUÂN ĐỘI: bàn tay duỗi thẳng bật lên, đầu ngón chạm đuôi chân mày, khuỷu dang ra; cằm ngẩng, mặt nghiêm, ưỡn ngực, giữ
   * `hold` giây; rồi hạ tay dứt khoát. Dùng tay phải của nhân vật (bên TRÁI màn hình) nếu nó rảnh.
   */
  salute(hold = 1.2) {
    const t = this.tl(), s = this.s, N = this.NGHI;
    hold = clamp(+hold || 1.2, 0.6, 6);
    const busy = (side) => this.holds[side] && s['item' + side] > 0.5;
    const k = !busy('L') ? 'L' : !busy('R') ? 'R' : null, m = k === 'L' ? -1 : 1;
    if (!k) return this._headGesture(t, 2, -3);
    this._faceFront(t);
    const face = { cuoi: 0.15, mieng: 0, chum: 0.1, mayL: -0.15, mayR: -0.15, matY: 0 };
    const pose = { ['tay' + k]: 'chao', ['handZoom' + k]: 1.25, headPitch: -0.3, dauY: -3, huong: 0, ...face };
    const a = this._gestureFit(k, pose, this._gestureTip(k, 'chao'), (f) => { const b = f['brow' + k]; return { x: b.x + m * f.half * 0.5, y: b.y - f.half * 0.2 }; }, [85, 125]);
    // BẬT tay lên (0,24 s) — dứt khoát; cằm ngẩng, ưỡn ngực.
    t.to(s, { ...face, headPitch: -0.3, dauY: -3, vai: N.vai - 3, tho: 1, duration: 0.25, ease: 'power2.out' }, 0);
    t.set(s, { ['tay' + k]: 'chao' }, 0.05);
    this._gestureOv(t, k, a, 0, 0.24, 'power3.out');
    t.to(s, { ['handZoom' + k]: 1.25, duration: 0.2 }, 0.05);
    this._chop(t, 0.3 + hold * 0.6);
    // Hạ tay dứt khoát xuống bên hông (0,18 s), rồi về dáng nghỉ.
    const down = 0.3 + hold;
    t.to(s, { ['ovBat' + k]: 6, ['ovCang' + k]: 0, duration: 0.18, ease: 'power3.in' }, down);
    t.set(s, { ['tay' + k]: N['tay' + k] }, down + 0.1);
    t.to(s, { headPitch: 0, dauY: 0, tho: 0, cuoi: 0.6, duration: 0.25 }, down);
    this._khep(t, 0.35, down + 0.2);
    return t;
  }

  // Số đo cho tools/acting_check.py (đợt 39 B, qua `set.careProbe()`): đầu ngón / tâm vòng OK / đầu ngón chào của bàn tay đang có hình
  // ấy, hai mắt, hai chân mày, miệng, khuôn mặt (phần tử — bối cảnh đo tâm trên màn hình) và các kênh đầu / vai / mặt (số).
  gesture39Probe() {
    const e = this.el, s = this.s, out = {};
    for (const k of ['L', 'R']) {
      const shape = s['tay' + k], g = HANDS_39.includes(shape) ? e.tay[k][shape] : null;
      out['tip' + k] = g ? g.querySelector('[data-tip39]') : null;
      out['chao' + k] = shape === 'chao' ? 1 : 0;
      out['ov' + k] = +clamp(s['ov' + k] || 0, 0, 1).toFixed(3);
      out['wink' + k] = +clamp(s['nhay' + k] || 0, 0, 1).toFixed(3);
      out['hand' + k] = e.tay[k] && e.tay[k][shape] ? e.tay[k][shape] : null;          // cả bàn tay đang hiện (nắm tay lau mắt, bàn tay ôm bụng)
    }
    Object.assign(out, { eyeL: e.matL, eyeR: e.matR, browL: e.mayL, browR: e.mayR, mouth: e.momG, face: e.khuon,
                         pitch: +(s.headPitch || 0).toFixed(3), drop: +((s.dauY || 0) - (this.NGHI.dauY || 0)).toFixed(2), tilt: +((s.dau || 0) - (this.NGHI.dau || 0)).toFixed(2),
                         shoulders: +(s.vai || 0).toFixed(2), mouthOpen: +(s.mieng || 0).toFixed(3), eyesShut: +(s.matY || 0).toFixed(3), tears: +(s.khoc || 0).toFixed(3) });
    return out;
  }
  // ═════════════════════════════════════ hết ĐỢT 39 B

  /**
   * GÃI GÁY: khuỷu giơ cạnh đầu, bàn tay vòng ra SAU đầu gãi mấy nhịp, cười ngượng, mắt nhìn lên — bối rối, quên mất,
   * xin lỗi. Tay chibi ngắn không với tới đỉnh đầu; đưa bàn tay ra trước thì nó che mất miệng (đọc thành cười thầm).
   */
  scratchHead(hand = 'auto') {
    const t = this.tl(), s = this.s, k = this._freeHand(hand), m = k === 'L' ? -1 : 1;
    this._faceFront(t);
    t.to(s, { ['ovBat' + k]: NAPE_POSE[0], ['ovCang' + k]: NAPE_POSE[1], ['sauDau' + k]: 1, duration: 0.02 }, 0);      // tween ngắn, không `set` ở mốc 0 (xem checkWatch)
    t.set(s, { ['tay' + k]: 'nam' }, 0.05);
    t.to(s, { ['ov' + k]: 1, dau: this.NGHI.dau - m * 8, dauX: -m * 3, nhinY: -1.6, nhinX: m, cuoi: 0.6, matY: 0.3, mayL: 0.7, mayR: 0.7, doMa: 0.5,
              duration: 0.4, ease: 'power2.out' }, 0);
    for (let n = 0; n < 4; n++) t.to(s, { ['ovCang' + k]: NAPE_POSE[1] + (n % 2 ? 10 : -10), duration: 0.14, ease: 'sine.inOut' }, 0.45 + n * 0.14);
    // Cánh tay ở SAU đầu suốt lúc hạ xuống, chỉ về trước đầu khi đã hạ hẳn: đổi lớp giữa chừng thì nắm tay đang còn giơ
    // cao thoáng hiện ra cạnh đầu (Gemini: "giơ nắm đấm sát đầu").
    // Hạ tay theo đường của người thật: khuỷu hạ xuống trong khi cẳng tay GẬP SÂU thêm (bàn tay vẫn khuất sau vai), rồi mới buông. Nội suy
    // thẳng từ dáng giơ cao về dáng nghỉ thì cánh tay quét ngang ra ngoài, ngang đầu người đứng cạnh.
    t.to(s, { ['ovBat' + k]: 50, ['ovCang' + k]: 160, duration: 0.25, ease: 'sine.inOut' }, 1.2);
    t.set(s, { ['tay' + k]: 'mo' }, 1.3);                 // buông tay: bàn tay thả lỏng, không còn nắm (nắm tay ngang vai đọc thành giơ nắm đấm)
    this._khep(t, 0.3, 1.45, { ['sauDau' + k]: 1 });
    t.set(s, { ['sauDau' + k]: 0 }, 1.76);
    return t;
  }

  /** ÔM MẶT: hai bàn tay áp lên hai má, đầu gục xuống, nhắm mắt, lắc đầu — quá tải, rối tung (giấy tờ, lịch hẹn chồng chéo). */
  headInHands(hold = 1.4) {
    const t = this.tl(), s = this.s;
    this._faceFront(t);
    // Khuỷu HẠ xuống, hai bàn tay áp hai bên má (kênh đặt góc cuối `ov`); đầu gục xuống đón tay — tay chibi ngắn chỉ tới
    // ngang cằm. Bản trước để khuỷu dang ngang như cánh máy bay, đọc thành vươn vai.
    t.to(s, { ovBatL: FACE_HANDS_POSE[0], ovBatR: FACE_HANDS_POSE[0], ovCangL: FACE_HANDS_POSE[1], ovCangR: FACE_HANDS_POSE[1], duration: 0.02 }, 0);   // tween ngắn (xem checkWatch)
    t.set(s, { tayL: 'xoe', tayR: 'xoe' }, 0.05);
    t.to(s, { ovL: 1, ovR: 1, carryL: 0, carryR: 0, dauY: 18, matY: 0.85, cuoi: -0.7, mieng: 0.2, mayL: 1, mayR: 1, vai: this.NGHI.vai - 4, duration: 0.4, ease: 'power2.out' }, 0);
    for (let n = 0; n < 3; n++) t.to(s, { dau: (n % 2 ? -1 : 1) * 6, duration: 0.22, ease: 'sine.inOut' }, 0.45 + n * 0.22);
    t.to(s, { dau: this.NGHI.dau, duration: 0.2 }, 0.45 + 3 * 0.22);
    t.to(s, { mieng: 0.05, duration: 0.3 }, 0.45 + hold * 0.6);
    this._khep(t, 0.5, 0.45 + hold);
    return t;
  }

  /** CÚI CHÀO: đầu và vai cúi xuống, mắt nhắm, giữ một nhịp rồi ngẩng lên cười — cảm ơn, xin lỗi, chào khách. */
  bow(depth = 1) {
    const t = this.tl(), s = this.s, d = clamp(depth, 0.3, 1.5);
    this._openUp(t);
    this._faceFront(t);
    t.to(s, { dauY: 24 * d, vai: this.NGHI.vai + 6 * d, seat: s.seat > 0.5 ? s.seat : 0.12 * d, matY: 0.8, cuoi: 0.6, duration: 0.45, ease: 'power2.inOut' }, 0);
    t.to(s, { dauY: 0, vai: this.NGHI.vai, seat: s.seat, matY: 0, cuoi: 1, duration: 0.4, ease: 'power2.out' }, 1.05);
    this._khep(t, 0.35, 1.45);
    return t;
  }

  /** CHẮP TAY CHÀO kiểu Thái (wai): hai lòng bàn tay áp vào nhau trước ngực, cúi đầu nhẹ, cười. */
  wai() {
    const t = this.tl(), s = this.s;
    this._faceFront(t);
    t.set(s, { tayL: 'xoe', tayR: 'xoe' }, 0.05);
    t.to(s, { batL: WAI_POSE[0], batR: WAI_POSE[0], cangL: WAI_POSE[1], cangR: WAI_POSE[1], carryL: 0, carryR: 0, cuoi: 0.8, duration: 0.4, ease: 'power2.out' }, 0);
    t.to(s, { dauY: 10, matY: 0.6, duration: 0.35, ease: 'power2.inOut' }, 0.45)
     .to(s, { dauY: 0, matY: 0, cuoi: 1, duration: 0.35, ease: 'power2.out' }, 1.15);
    this._khep(t, 0.45, 1.6);
    return t;
  }

  /**
   * BẮT TAY người kia (`target`: rig, 'left' | 'right'): đưa bàn tay phía người ấy ra ngang hông, lắc ba nhịp, cười.
   * Chạy cùng nhịp với `handshake` của người kia (`together`). Tay ấy đang cầm đồ thì dùng tay kia.
   */
  handshake(target = null) {
    const t = this.tl(), s = this.s, N = this.NGHI;
    const dir = this._towards(target, 'R'), k = this._holdsFree(dir > 0 ? 'R' : 'L');
    const pose = this._meetAngles(target, k, 0.55) || { bat: SHAKE_POSE[0], cang: SHAKE_POSE[1] };
    this._stage(t, [k]);
    t.set(s, { ['tay' + k]: 'xoe' }, 0.05);
    t.to(s, { ['bat' + k]: pose.bat, ['cang' + k]: pose.cang, ['carry' + k]: 0, than: N.than - dir * 3, dau: N.dau + dir * 3, nhinX: dir * 1.6, cuoi: 1, mayL: 0.5, mayR: 0.5,
              duration: 0.45, ease: 'power2.out' }, 0);
    // Lắc tay: cả cánh tay nhấp lên xuống quanh điểm gặp (bắp tay ±4°, cẳng tay bù lại cho bàn tay đi theo phương đứng).
    for (let n = 0; n < 3; n++) {
      t.to(s, { ['bat' + k]: pose.bat + 4, ['cang' + k]: pose.cang - 6, duration: 0.13, ease: 'sine.inOut' }, 0.5 + n * 0.26)
       .to(s, { ['bat' + k]: pose.bat - 3, ['cang' + k]: pose.cang + 4, duration: 0.13, ease: 'sine.inOut' }, 0.63 + n * 0.26);
    }
    this._khep(t, 0.45, 1.35);
    return t;
  }

  // ĐIỂM GẶP của hai bàn tay khi bắt tay, và góc tay để tới đó. Hai người khác chiều cao mà mỗi người đưa tay theo
  // một dáng cố định thì bàn tay người lớn chìa ngang mặt đứa bé, còn tay đứa bé ở dưới bụng — không bao giờ chạm. Điểm
  // gặp: giữa hai vai theo chiều ngang; cao độ là trung bình hai vai, hạ xuống `drop` × chiều dài tay. Góc tay: IK hai
  // đốt, khuỷu chúc xuống; xa quá tầm thì duỗi thẳng về phía ấy. (Đập tay đã thử và bỏ: đầu chibi chắn đúng chỗ hai bàn
  // tay phải gặp nhau khi đứng gần, đứng xa thì tay không tới.) Đích không phải rig
  // ('left' | 'right') thì trả về `null` — dùng dáng mặc định.
  _meetAngles(anchor, k, drop) {
    // Đích là MỎ NEO của conversation (`{ centerX, live }`): rig thật nằm ở `live`, còn chỗ đứng của nó LÚC LƯỢT NÀY là
    // `centerX()`. Lúc dựng timeline hình SVG của mỗi rig còn vẽ ở một tư thế cũ bất kỳ (lần vẽ cuối của bản nháp), nên
    // KHÔNG đọc vai từ DOM: tính từ trạng thái `s` + số đo khung — vai = tâm + (vai trong khung − nửa khung) × tỉ lệ
    // (đợt 28: bác sĩ chìa tay phía xa ra chỗ đứa bé đứng lúc đầu cảnh, rồi vươn quá đầu nó).
    const target = anchor && anchor.live ? anchor.live : anchor;
    if (!(target && target.el && target.svg && this.svg.getScreenCTM && target.svg.getScreenCTM)) return null;
    const other = this._towards(anchor, k) > 0 ? 'L' : 'R';
    const sv = this.svg.getBoundingClientRect(), unit = Math.min(sv.width / KHUNG.w, sv.height / KHUNG.h) || 1;
    const ox = sv.left + (sv.width - KHUNG.w * unit) / 2, oy = sv.top + (sv.height - KHUNG.h * unit) / 2, s = this.s;
    let mine = new DOMPoint(0, 0).matrixTransform(this.el['bat' + k].getScreenCTM()), theirs = new DOMPoint(0, 0).matrixTransform(target.el['bat' + other].getScreenCTM());
    if (target !== anchor && target instanceof RigSVG) {      // một rig người khác (trước đây: phép kiểm `#shoulderX in target`)
      const ts = target.svg.getBoundingClientRect(), tu = Math.min(ts.width / KHUNG.w, ts.height / KHUNG.h) || unit;
      const toy = ts.top + (ts.height - KHUNG.h * tu) / 2;
      mine = { x: this.centerX() + (this._shoulderX(k) - KHUNG.w / 2) * unit, y: oy + (this._shoulderY() + (s.y || 0) + DOI_Y) * unit };
      theirs = { x: anchor.centerX() + (target._shoulderX(other) - KHUNG.w / 2) * tu, y: toy + (target._shoulderY() + (target.s.y || 0) + DOI_Y) * tu };
    }
    // Cổ tay (không phải đầu ngón) tới điểm gặp: hai bàn tay chồng lên nhau ở đó, như đang nắm / chạm.
    const upper = DAI.canhTay * this.nv.daiCanhTay, fore = DAI.cangTay * this.nv.daiCangTay, reach = upper + fore;
    // CÙNG MỘT điểm cho cả hai người (tính trên màn hình): độ hạ / nâng theo chiều dài tay TRUNG BÌNH của hai người, tính
    // bằng px. Mỗi người tính theo tay mình thì hai người nhắm hai điểm khác nhau — người lớn với tay cao hơn đứa bé.
    const ts = target.svg.getBoundingClientRect(), theirUnit = Math.min(ts.width / KHUNG.w, ts.height / KHUNG.h) || unit;
    const theirReach = target.nv ? DAI.canhTay * (target.nv.daiCanhTay || 1) + DAI.cangTay * (target.nv.daiCangTay || 1) : reach;
    const meetY = (mine.y + theirs.y) / 2 + drop * (reach * unit + theirReach * theirUnit) / 2;
    // Bắt tay: mỗi người vươn QUÁ điểm giữa một chút về phía người kia — hai bàn tay chồng lên nhau, không hở.
    const meetX = (mine.x + theirs.x) / 2 + Math.sign(theirs.x - mine.x) * 6 * unit;
    const sx = this._shoulderX(k), sy = this._shoulderY();
    const mx = (meetX - ox) / unit - s.x, my = (meetY - oy) / unit - s.y - DOI_Y;
    const dx = mx - sx, dy = my - sy, d = Math.max(1, Math.hypot(dx, dy));
    const phi = Math.atan2(dy, dx) * 180 / Math.PI, toward = k === 'L' ? phi - 90 : 90 - phi;      // 0 = thõng xuống, dương = đưa ra phía tay ấy
    if (d >= reach * 0.98) return { bat: clamp(chuanHoaGoc(toward), -15, 172), cang: 6 };
    const alpha = Math.acos(clamp((upper * upper + d * d - fore * fore) / (2 * upper * d), -1, 1)) * 180 / Math.PI;
    const beta = Math.acos(clamp((upper * upper + fore * fore - d * d) / (2 * upper * fore), -1, 1)) * 180 / Math.PI;
    return { bat: clamp(chuanHoaGoc(toward - alpha), -15, 172), cang: 180 - beta };
  }

  // QUAY VỀ PHÍA NGƯỜI XEM trong lúc diễn (cử chỉ hai tay, cử chỉ "khoe"); `_khep` trả lại hướng đang giữ. Ở dáng 3/4 tay
  // phía xa nằm sau thân: vỗ tay, chắp tay chỉ còn thấy một tay (Gemini, đợt 3).
  _faceFront(t, d = 0.3) {
    if (Math.abs(this.s.huong) > 0.02) t.to(this.s, { huong: 0, duration: d, ease: 'sine.inOut' }, 0);
  }

  // Tay `preferred` nếu nó rảnh; đang cầm đồ thì tay kia.
  _holdsFree(preferred) {
    const busy = (side) => this.holds[side] && this.s['item' + side] > 0.5;
    return busy(preferred) && !busy(preferred === 'L' ? 'R' : 'L') ? (preferred === 'L' ? 'R' : 'L') : preferred;
  }

});
