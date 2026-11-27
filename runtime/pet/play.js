// runtime/pet/play.js — food and play: eat, drink, cough, fetch, toys, tug of war, play bow, howl, dig, carry a toy, greet, play.
// Methods of `RigThu`, installed by runtime/rig-thu.js: `this` is the rig, `RigThu` its class.

import { KHUNG, DAT, clamp, mem, mix } from './shared.js';

export default (RigThu) => mix(RigThu, class {
  // Cúi đầu xuống cái bát trước mặt (ăn, uống): dáng chung — trả về thời điểm đã cúi xong.
  _toBowl(t) {
    const s = this.s, nv = this.nv, at = this._dung(t, 0);
    // Mõm xuống tới miệng bát trên sàn (cao ≈ 18 đơn vị): vai hạ (chân trước khuỵu) và đầu thò ra trước. Độ cúi tính theo
    // hình thể từng loài — một con số chung thì mèo (đầu thấp hơn chó) cúi lút đầu xuống dưới nền.
    this.bowlDip = DAT - 30 - (nv.S0.y + 20 + nv.dau.dy + nv.mom.y * (nv.headScale || 1));
    t.to(s, { truocY: 20, dauX: nv.dau.dx + 4, dauY: this.bowlDip, dau: 18, taiL: 0.2, taiR: 0.2, nhinY: 1.6, matY: 0.3, cuoi: 0.5, duration: 0.4, ease: 'power2.inOut' }, at);
    return at + 0.4;
  }

  /** ĂN `dur` giây: cúi xuống bát (đạo cụ `bowl`), nhai từng miếng, đầu nhấp nhô; chó vẫy đuôi chầm chậm. */
  eat(dur = 2) {
    const t = this.tl(), s = this.s, at = this._toBowl(t);
    // Đợt 36: mỗi miếng há rõ (`gape`) — nhịp 0,35 s thay 0,2 s, hàm hạ thấy được ở góc trung.
    for (let a = at, i = 0; a + 0.35 <= at + dur + 1e-6; a += 0.35, i++) t.to(s, { mieng: i % 2 ? 0.05 : 0.4, gape: i % 2 ? 0 : 0.6, dauY: this.bowlDip + (i % 2 ? 0 : 3), duration: 0.35, ease: 'sine.inOut' }, a);
    if (this.nv.loai === 'dog') this._vay(t, at, Math.max(2, Math.floor(dur / 0.3)), 18, 0.3, 10);
    this._khep(t, 0.4, at + dur);
    return t;
  }

  /** UỐNG NƯỚC `dur` giây: cúi xuống bát, lưỡi liếm nước từng nhịp. */
  drink(dur = 2) {
    const t = this.tl(), s = this.s, at = this._toBowl(t);
    for (let a = at, i = 0; a + 0.16 <= at + dur; a += 0.16, i++) t.to(s, { luoi: i % 2 ? 0.1 : 0.9, mieng: i % 2 ? 0.1 : 0.3, dauY: this.bowlDip + (i % 2 ? 0 : 2), duration: 0.16, ease: 'sine.inOut' }, a);
    this._khep(t, 0.4, at + dur);
    return t;
  }

  /** HO `times` tiếng: rướn cổ ra trước, mỗi tiếng ho ngực giật, miệng mở, mắt nhắm lại — bệnh hô hấp. */
  cough(times = 3) {
    const t = this.tl(), s = this.s;
    t.to(s, { dauX: 8, dauY: 8, dau: 8, taiL: -0.6, taiR: -0.6, cuoi: -0.3, duration: 0.25, ease: 'power2.out' }, 0);
    for (let i = 0; i < times; i++) {
      const a = 0.3 + i * 0.5;
      t.to(s, { truocY: 5, sauY: 2, dauY: 4, duration: 0.08, ease: 'power2.in' }, a)                                         // lấy hơi
       .to(s, { truocY: -3, sauY: -1, dauY: 13, dauX: 12, mieng: 0.75, matY: 0.85, duration: 0.1, ease: 'power3.out' }, a + 0.08)    // ho
       .to(s, { truocY: 0, sauY: 0, dauY: 8, dauX: 8, mieng: 0.05, matY: 0.2, duration: 0.25, ease: 'sine.inOut' }, a + 0.2);
    }
    this._khep(t, 0.4, 0.4 + times * 0.5);
    return t;
  }

  /** HÁ MIỆNG `hold` giây: ngẩng cằm, há to — cho bác sĩ khám răng (`examine(pet, 'teeth')` của rig người). */
  openMouth(hold = 1.2) {
    const t = this.tl(), s = this.s;
    // Đợt 36: há LỚN (`gape`) — hàm dưới hạ hẳn, thấy lưỡi, răng nanh; giữ suốt `hold` (há ~0,9 ở giữa, không khép lại giữa chừng).
    t.to(s, { dau: -10, dauY: -3, mieng: 0.95, gape: 1, luoi: 0.25, matY: 0.3, taiL: 0.3, taiR: 0.3, duration: 0.3, ease: 'power2.out' }, 0);
    t.to(s, { mieng: 0.85, gape: 0.9, duration: hold * 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.3);
    this._khep(t, 0.35, 0.3 + hold);
    return t;
  }

  /**
   * DỤI VÀO CHÂN (người đứng cạnh): đuôi dựng cong, đầu và má dụi qua dụi lại, thân lắc theo, mắt lim dim — làm nũng,
   * mừng chủ. Đặt con vật sát chân người ấy.
   */
  rub(times = 4) {
    const t = this.tl(), s = this.s;
    const at = this._dung(t, 0);
    t.to(s, { duoi: 34, duoiCong: 0.7, matY: 0.75, cuoi: 1, taiL: 0.2, taiR: 0.2, duration: 0.3, ease: 'power2.out' }, at);
    for (let i = 0; i < times * 2; i++) {
      const g = i % 2 ? -1 : 1;
      t.to(s, { dau: g * 13, dauX: g * 5, dauY: 3, truocX: g * 4, sauX: -g * 3, tho: i % 2 ? 0 : 1, duration: 0.24, ease: 'sine.inOut' }, at + 0.3 + i * 0.24);
    }
    this._khep(t, 0.4, at + 0.3 + times * 0.48);
    return t;
  }

  /**
   * CHẠY NHẶT BÓNG: chạy ra `distance` đơn vị về phía đang quay mặt (bóng do người `throwBall` ném), cúi ngậm quả
   * bóng, quay lại chạy về chỗ cũ, đứng vẫy đuôi khoe bóng rồi nhả. Đi cặp với `throwBall` của người: chạy `delay` giây
   * sau khi bắt đầu (đợi bóng bay).
   */
  fetch(distance = 260, { delay = 0.7 } = {}) {
    const t = this.tl(), s = this.s, x0 = s.x, dir = s.huong < 0 ? -1 : 1, d = Math.max(60, distance);
    let at = this._dung(t, 0);
    t.to(s, { taiL: 0.9, taiR: 0.9, cuoi: 1, mieng: 0.4, luoi: 0.6, nhinX: dir * 2, duration: 0.25 }, at);
    at = Math.max(at, delay);
    const run = this._pace(d);
    at = this._di(t, at, run.cycles, run.beat, { ra: false, quang: dir * d, x0, A: run.A, cao: run.lift });
    // Cúi ngậm bóng.
    t.to(s, { truocY: 14, dauX: 18, dauY: 34, dau: 14, mieng: 0.6, duration: 0.25, ease: 'power2.in' }, at);
    t.set(s, { ballMouth: 1 }, at + 0.25);
    t.to(s, { truocY: 0, dauX: 0, dauY: 0, dau: 0, mieng: 0.3, duration: 0.25, ease: 'power2.out' }, at + 0.28);
    at += 0.55;
    t.to(s, { huong: -dir, duration: 0.22, ease: 'power1.inOut' }, at); at += 0.22;
    at = this._di(t, at, run.cycles, run.beat, { vao: false, quang: -dir * d, x0: x0 + dir * d, A: run.A, cao: run.lift });
    t.to(s, { huong: dir, duration: 0.22, ease: 'power1.inOut' }, at); at += 0.22;
    at = this._vay(t, at, 8, 40, 0.11);
    t.set(s, { ballMouth: 0 }, at);
    this._khep(t, 0.35, at, { x: x0, huong: dir });
    return t;
  }

  // ĐỢT 40 A
  /* ------------------------------------------------ ĐỢT 40 A — sáu động tác của CHÓ
   * chổng mông rủ chơi (`playBow`), tru (`howl`), đào đất (`dig`), tha đồ chơi (`carryToy`), dựa vào chân người (`leanOnLeg`) và kéo co
   * (`tugOfWar` — đi cặp với `pullToy` của rig người). Đồ chơi: kênh `toy` (trong mõm), `toyF` (đã nhả xuống sàn); sóng tru `howl`; đất `dirt`. */
  static TOY_KINDS = { rope: 1, bone: 2, squeaky: 2 };   // tên → loại đồ chơi (1 dây thừng, 2 khúc xương)
  // KÉO CO: thế chân CHỐNG (cố định suốt lúc kéo — bàn chân không trượt) và hai thế thân: A = nó giật ngược lại (ngả ra sau), B = bị người kéo tới (chúi theo dây).
  static TUG_STANCE = { tnX: 12, txX: 8, snX: -12, sxX: -6, toy: 1, mieng: 0, matY: 0.45, cuoi: 0.2, taiL: -0.3, taiR: -0.3, duoi: 20, nhinY: 0 };
  static TUG_A = { truocX: -13, sauX: -9, truocY: 9, sauY: 5, dauY: 21, dauX: 9 };
  static TUG_B = { truocX: 2, sauX: 1, truocY: 5, sauY: 3, dauY: 21, dauX: 15 };
  static TUG_HALF = 0.45;      // giây mỗi nhịp kéo (một lần giật hay một lần bị lôi) — người chấm xem thưa (~1 khung / giây) thấy được cả hai thế
  static TUG_ROPE = { along: 0.15, reach: 0.14 };   // × chiều cao người: dây dài ngang chừng ấy từ tay tới mõm; tay người cầm dây ở trước người chừng ấy — mõm cách giữa người `along + reach`
  static LEAN_EDGE = 0.085;    // dựa chân: ngực con chó nằm cách giữa người chừng ấy × chiều cao người (mép ngoài ống chân ~0,09 — ép sát chân)

  // Số đo của người `person` từ phía con vật: x giữa người trên màn hình, chiều cao người (đơn vị khung của con vật), tỉ lệ px / đơn vị khung của con vật.
  _personMetrics(person, name) {
    const frame = this.svg.getBoundingClientRect(), scale = Math.min(frame.width / KHUNG.w, frame.height / KHUNG.h) || 1;
    const real = person && person.live ? person.live : person;        // mỏ neo của `conversation()` ({ centerX, live }) — cỡ lấy từ người thật
    const node = real && real.svg ? real.svg : real, box = node && node.getBoundingClientRect ? node.getBoundingClientRect() : null;
    const cx = person && typeof person.centerX === 'function' ? person.centerX() : box ? box.left + box.width / 2 : null;
    if (cx === null || !box) throw new Error(`[character] ${name}(person): needs a person rig (createCharacter(...).rig) or an element`);
    const unit = Math.min(box.width / 400, box.height / 470);        // khung người 400 × 470 (rig-svg.js)
    return { cx, H: unit * 470 * 0.96, scale };
  }

  // Quay về phía người (`side`: 1 phải màn hình, −1 trái) — thêm vào `t` tại `at`; trả về thời điểm xong.
  _quayVe(t, at, side) {
    if ((this.s.huong < 0 ? -1 : 1) === side) return at;
    t.to(this.s, { huong: side, duration: 0.22, ease: 'power1.inOut' }, at);
    return at + 0.22;
  }

  // Bước `dx` đơn vị khung (có dấu: + sang phải màn hình) tới chỗ đứng; trả về thời điểm xong. Dưới 3 đơn vị thì khỏi đi.
  _buocToi(t, at, dx, x0) {
    if (Math.abs(dx) < 3) return at;
    return this._di(t, at, Math.max(2, Math.round(Math.abs(dx) / 40)), 0.5, { quang: dx, x0 });
  }
  _buocThoiGian(dx) { return Math.abs(dx) < 3 ? 0 : Math.max(2, Math.round(Math.abs(dx) / 40)) * 0.5; }

  // Như `_di` nhưng cộng thêm `add` (kênh → lượng) lên dáng bước: đầu ngẩng, đuôi dựng, ngực ưỡn khi tha đồ chơi đi (`_di` ghi đè các kênh `truocY`, `sauY`,
  // `dauY`, `duoi` mỗi khung, nên không đặt được dáng bằng tween riêng).
  _diThem(t, at, chuKy, h, { quang = 0, x0 = 0, A = 15, cao = 10 } = {}, add = {}) {
    const s = this.s, bao = (c) => mem(c / 0.5) * mem((chuKy - c) / 0.5);
    const M = 60, n = Math.round(chuKy * M), X = [0];
    for (let i = 1; i <= n; i++) X.push(X[i - 1] + (2 * A / 0.6) * bao(i / M) / M);
    const tiLe = quang ? Math.abs(quang) / X[n] : 0, dau = quang < 0 ? -1 : 1;
    const pr = { _c: 0, get c() { return this._c; }, set c(v) {
      this._c = v;
      const a = bao(v), step = this.owner._buoc(v, a, A * (tiLe ? clamp(tiLe, 0.5, 1.35) : 1), cao);
      for (const k of Object.keys(add)) step[k] = (step[k] || 0) + add[k] * Math.min(1, a * 3);
      Object.assign(s, step);
      if (quang) { const q = clamp(v, 0, chuKy) * M, i = Math.min(n - 1, Math.floor(q)); s.x = x0 + dau * tiLe * (X[i] + (X[i + 1] - X[i]) * (q - i)); }
    } };
    pr.owner = this;
    t.to(pr, { c: chuKy, duration: chuKy * h, ease: 'none' }, at);
    return at + chuKy * h;
  }

  /**
   * CHỔNG MÔNG RỦ CHƠI (chó): hai chân trước duỗi dài ra trước, ngực sát sàn, mông nhổm cao, đuôi dựng vẫy nhanh, miệng há như sắp sủa — "chơi
   * với tao đi" — giữ `hold` giây (0,6…6), hai tiếng sủa ngắn. Rồi đứng dậy.
   */
  playBow(hold = 1.2) {
    this._only('playBow', ['dog']);
    const t = this.tl(), s = this.s, h = clamp(+hold || 1.2, 0.6, 6);
    let at = this._dung(t, 0);
    t.to(s, { truocY: 33, truocX: 8, sauY: -16, sauX: -2, tnX: 34, txX: 32, dauY: 12, dauX: 4, dau: 8, cuoi: 1, mieng: 0.6, gape: 0.35, luoi: 0.9, matY: 0.2, taiL: 0.9, taiR: 0.9,
              duoi: 34, duoiCong: 0.5, duration: 0.4, ease: 'power2.out' }, at);
    at += 0.4;
    const beats = Math.max(6, Math.round(h / 0.1));
    this._vay(t, at, beats, 40, h / beats, 34);                                                    // đuôi vẫy nhanh
    for (let i = 0; i < beats; i++) t.to(s, { sauX: i % 2 ? -5 : 1, duration: h / beats, ease: 'sine.inOut' }, at + i * h / beats);      // lắc mông theo
    for (const f of h > 1.6 ? [0.15, 0.62] : [0.3]) {
      t.to(s, { mieng: 0.95, gape: 0.8, sua: 0.8, dauY: 8, dau: 4, duration: 0.12, ease: 'power2.out' }, at + h * f)
       .to(s, { mieng: 0.6, gape: 0.35, sua: 0, dauY: 12, dau: 8, duration: 0.25, ease: 'power2.in' }, at + h * f + 0.3);
    }
    at += h;
    this._khep(t, 0.4, at);
    return t;
  }

  /**
   * TRU (chó): ngồi, ngửa đầu hết cỡ — mõm hướng lên trời, miệng tròn như chữ O, mắt nhắm —, ngực phập phồng, và `hold` giây (0,8…8) tiếng tru dài: ba
   * đường lượn sóng bay lên từ mõm (như vạch tiếng sủa của `bark` nhưng hướng lên và uốn lượn). Rồi hạ đầu xuống, đứng dậy.
   */
  howl(hold = 1.6) {
    this._only('howl', ['dog']);
    const t = this.tl(), s = this.s, h = clamp(+hold || 1.6, 0.8, 8);
    t.to(s, { ngoi: 1, duoi: -22, cuoi: 0.2, taiL: -0.2, taiR: -0.2, duration: 0.45, ease: 'back.out(1.2)' }, 0);
    let at = 0.45;
    t.to(s, { dau: -38, dauY: -9, dauX: 7, truocY: -4, mieng: 0.7, gape: 0.6, matY: 1, luoi: 0, howl: 1, duration: 0.6, ease: 'power2.out' }, at);
    at += 0.6;
    t.fromTo(s, { howlT: 0 }, { howlT: h * 1.1, duration: h, ease: 'none', immediateRender: false }, at);
    for (let a = at, i = 0; a < at + h - 0.2; a += 0.55, i++) {            // ngực phập phồng, đầu rung nhẹ theo hơi tru
      t.to(s, { tho: i % 2 ? 0 : 1, dau: i % 2 ? -38 : -42, dauY: i % 2 ? -9 : -11, duration: 0.55, ease: 'sine.inOut' }, a);
    }
    at += h;
    t.to(s, { howl: 0, duration: 0.25, ease: 'power1.in' }, at - 0.1);
    t.to(s, { mieng: 0.15, gape: 0, dau: 0, dauY: 0, dauX: 0, matY: 1, duration: 0.35, ease: 'power2.inOut' }, at);
    this._khep(t, 0.4, at + 0.35);
    return t;
  }

  /**
   * ĐÀO ĐẤT (chó): mõm chúi xuống, hai chân trước cào sàn thật nhanh, lần lượt từng chân (`times` lượt mỗi chân, 0,34 s một lượt) — mỗi lượt cào lùi
   * dọc sàn rồi nhấc lên đưa tới —, một hố tối hiện ra dưới chân, cục đất văng ra sau qua giữa hai chân sau, đuôi vẫy.
   */
  dig(times = 4) {
    this._only('dig', ['dog']);
    const t = this.tl(), s = this.s, n = clamp(Math.round(+times || 4), 1, 12), beat = 0.34;
    let at = this._dung(t, 0);
    t.to(s, { truocY: 14, truocX: 5, sauY: -5, dauY: 24, dauX: 9, dau: 16, mieng: 0.1, matY: 0.5, taiL: 0.2, taiR: 0.2, cuoi: 0.8, duoi: 16, dirtA: 1, duration: 0.35, ease: 'power2.out' }, at);
    at += 0.35;
    const total = n * beat + beat / 2;
    t.fromTo(s, { dirt: 0 }, { dirt: total / 0.55, duration: total, ease: 'none', immediateRender: false }, at);
    for (let i = 0; i < n; i++) for (const [k, off] of [['tn', 0], ['tx', beat / 2]]) {
      const a = at + i * beat + off;
      t.to(s, { [k + 'X']: -16, [k + 'Y']: 0, duration: beat * 0.55, ease: 'power1.in' }, a)                 // cào lùi trên sàn
       .to(s, { [k + 'X']: 22, [k + 'Y']: 12, duration: beat * 0.45, ease: 'power1.out' }, a + beat * 0.55);       // nhấc lên, đưa tới
    }
    for (let i = 0; i < n * 2; i++) t.to(s, { truocY: i % 2 ? 16 : 12, sauX: i % 2 ? 2 : -2, duration: beat / 2, ease: 'sine.inOut' }, at + i * beat / 2);       // thân nhún theo từng cú cào
    this._vay(t, at, Math.max(2, Math.round(total / 0.18)), 26, 0.18, 22);
    at += total;
    t.to(s, { tnX: 0, tnY: 0, txX: 0, txY: 0, dirtA: 0, duration: 0.35, ease: 'power2.inOut' }, at);
    this._khep(t, 0.4, at + 0.2);
    return t;
  }

  /**
   * THA ĐỒ CHƠI (chó): cúi ngậm đồ chơi (`{ kind }`: 'rope' dây thừng, thắt nút hai đầu — mặc định —, hay 'bone' / 'squeaky' khúc xương cao su), rồi KIỆU đi
   * `distance` đơn vị (0, mặc định: tại chỗ) về phía đang quay mặt — đầu ngẩng cao, ngực ưỡn, đuôi dựng, đắc ý — và nhả nó xuống sàn trước mặt. `carryToy(person)` hay
   * `{ target: person }`: kiệu tới người ấy và thả đồ chơi dưới chân họ (nhìn lên, vẫy đuôi), đồ chơi nằm ở đó chừng một giây rồi mờ đi.
   */
  carryToy(distance = 0, { kind = 'rope', target = null } = {}) {
    this._only('carryToy', ['dog']);
    if (distance && typeof distance === 'object') { target = distance; distance = null; }
    const toy = RigThu.TOY_KINDS[kind];
    if (!toy) throw new Error(`[character] carryToy: no toy "${kind}" (available: ${Object.keys(RigThu.TOY_KINDS).join(', ')})`);
    const t = this.tl(), s = this.s, x0 = s.x, held = s.huong < 0 ? -1 : 1;
    let side = held, dx;
    if (target) {
      const { cx, H, scale } = this._personMetrics(target, 'carryToy');
      side = cx - this.centerX() < 0 ? -1 : 1;
      // mõm dừng cách giữa người 0,2 × chiều cao (đồ chơi rơi ngay chân họ)
      const snout = this.centerX() + (this.nv.S0.x + this.nv.dau.dx + 30 - 200) * side * scale;
      dx = ((cx - side * 0.13 * H) - snout) / scale;
      if (dx * side < 0) dx = 0;
    } else dx = +distance > 0 ? held * Math.max(60, +distance) : 0;          // không đích, không quãng: kiệu tại chỗ
    const dir = dx < 0 ? -1 : dx > 0 ? 1 : side;
    let at = this._dung(t, 0);
    at = this._quayVe(t, at, target ? side : dir);
    // Cúi nhặt: đầu chúi xuống, đồ chơi hiện trong mõm, ngẩng lên đắc ý.
    t.to(s, { truocY: 12, dauY: 26, dauX: 14, dau: 14, mieng: 0.5, duration: 0.25, ease: 'power2.in' }, at);
    t.set(s, { toy }, at + 0.25);
    const proud = { dauY: -9, dauX: 5, dau: -7, truocY: -3, duoi: 38, duoiCong: 0.55, cuoi: 1, taiL: 0.9, taiR: 0.9, mieng: 0.1, matY: 0.25 };
    t.to(s, { ...proud, duration: 0.3, ease: 'power2.out' }, at + 0.28);
    at += 0.6;
    {
      const far = Math.abs(dx) >= 6 ? Math.abs(dx) : 0, cycles = far ? Math.max(3, Math.round(far / 46)) : 4;          // quãng 0: kiệu tại chỗ 4 nhịp
      at = this._diThem(t, at, cycles, 0.4, { quang: far ? dx : 0, x0, A: 15, cao: 10 }, { dauY: proud.dauY, truocY: proud.truocY, duoi: proud.duoi - 4 });
      t.set(s, proud, at - 0.01);                       // hết bước: giữ dáng đắc ý
    }
    t.to(s, { ...proud, duration: 0.1 }, at);
    at += 0.35;
    // Nhả đồ chơi xuống sàn trước mõm, nhìn lên (người / phía trước), vẫy đuôi.
    t.to(s, { truocY: 12, dauY: 28, dauX: 16, dau: 14, duration: 0.25, ease: 'power2.in' }, at);
    t.set(s, { toy: 0, toyF: toy, toyFA: 1, toyFX: this.nv.S0.x + this.nv.dau.dx + 20 }, at + 0.25);
    t.to(s, { truocY: 0, dauY: -4, dauX: 2, dau: -8, mieng: 0.35, luoi: 0.7, matY: 0.3, duration: 0.35, ease: 'power2.out' }, at + 0.3);
    at += 0.65;
    this._vay(t, at, 8, 38, 0.11, 30);
    at += 0.95;
    t.to(s, { toyFA: 0, duration: 0.3, ease: 'power1.in' }, at);
    t.set(s, { toyF: 0 }, at + 0.3);
    this._khep(t, 0.4, at + 0.3, { x: x0 + dx, huong: target ? side : dir });
    return t;
  }

  /**
   * DỰA VÀO CHÂN (chó): đi tới người `person` đang đứng, dừng sát cạnh họ và tì sườn vào chân họ — thân nghiêng về phía người (bốn bàn chân đứng yên, vai và
   * hông ngả sang chân họ), ngực áp vào ống chân —, ngẩng đầu nhìn lên họ, mắt lim dim, đuôi vẫy chậm, `hold` giây (mặc định 2). Ở lại chỗ đó,
   * quay mặt về phía người ấy sau khi xong. Cần người đứng cùng mặt phẳng (cùng độ sâu) với con vật.
   */
  leanOnLeg(person = null, hold = 2) {
    this._only('leanOnLeg', ['dog']);
    if (person !== null && typeof person !== 'object') throw new Error('[character] leanOnLeg(person): needs the standing person to lean on (a person rig)');
    const t = this.tl(), s = this.s, x0 = s.x, held = s.huong < 0 ? -1 : 1, h = clamp(+hold || 2, 0.8, 8);
    const { cx, H, scale } = person ? this._personMetrics(person, 'leanOnLeg') : { cx: this.centerX() + held, H: 1, scale: 1 };       // không có người: dựa vào khoảng không, tại chỗ
    const side = cx - this.centerX() < 0 ? -1 : 1, lean = { truocX: 14, sauX: 10 };
    // ngực (mép trước thân) tới mép ống chân: tính ở dáng nghiêng, tại chỗ hiện tại
    const chest = this.centerX() + (this.nv.S0.x + lean.truocX + this.nv.dayThan + 2 - 200) * side * scale;
    let dx = person ? ((cx - side * RigThu.LEAN_EDGE * H) - chest) / scale : 0;
    if (Math.abs(dx) < 3) dx = 0;
    let at = this._dung(t, 0);
    at = this._quayVe(t, at, side);
    at = this._buocToi(t, at, dx, x0);
    t.to(s, { ...lean, truocY: 3, dau: -16, dauY: -4, dauX: -6, matY: 0.55, nhinY: -1.6, cuoi: 1, mieng: 0.2, luoi: 0.25, taiL: -0.15, taiR: -0.15, duoi: 18, duoiCong: 0.3, duration: 0.5, ease: 'power2.out' }, at);
    at += 0.5;
    const beats = Math.max(2, Math.round(h / 0.45));
    this._vay(t, at, beats, 20, h / beats, 26);                                              // đuôi vẫy chậm
    for (let a = at, i = 0; a + 0.9 <= at + h; a += 0.9, i++) t.to(s, { tho: i % 2 ? 0 : 1, duration: 0.9, ease: 'sine.inOut' }, a);
    this._chop(t, at + h * 0.5);
    at += h;
    this._khep(t, 0.45, at, { x: x0 + dx, huong: side });
    return t;
  }

  /**
   * KÉO CO (chó) với người `person` (cùng lúc người ấy `pullToy(pet)`): đứng cách người một sợi dây (mõm cách giữa người chừng 0,3 × chiều cao người — tools/scene.py tự đưa nó tới đó), cúi ngậm một đầu DÂY THỪNG, rồi `hold` giây (1…8) giằng co
   * — nó chống bốn chân (bàn chân đứng yên), giật ngả ra sau rồi bị lôi chúi tới, lắc đầu liên tục, đuôi vẫy; dây luôn căng giữa mõm và tay người
   * (người vẽ: `pullToy`). Rồi nhả dây, đứng dậy. `tugPlan(person)` cho thời điểm bắt đầu kéo và độ giật — rig người dùng nó để đặt tay.
   */
  tugOfWar(person = null, hold = 2.4) {
    this._only('tugOfWar', ['dog']);
    if (person !== null && typeof person !== 'object') throw new Error('[character] tugOfWar(person): needs the person holding the other end (a person rig — they pullToy(pet) at the same time)');
    const t = this.tl(), s = this.s, h = clamp(+hold || 2.4, 1, 8), plan = this.tugPlan(person, h);
    const { A, B } = { A: RigThu.TUG_A, B: RigThu.TUG_B }, half = RigThu.TUG_HALF;
    let at = this._dung(t, 0);
    at = this._quayVe(t, at, plan.side);
    // Cúi ngậm đầu dây, nhấc lên, chống chân.
    t.to(s, { truocY: 10, dauY: 26, dauX: 14, dau: 12, mieng: 0.5, duration: 0.25, ease: 'power2.in' }, at);
    t.set(s, { toy: 1 }, at + 0.25);
    const stance = { ...RigThu.TUG_STANCE };
    delete stance.toy;
    t.to(s, { ...stance, ...A, duration: 0.3, ease: 'power2.out' }, at + 0.28);
    at += 0.6;
    const n = Math.max(2, Math.round(h / half));
    for (let i = 0; i < n; i++) t.to(s, { ...(i % 2 ? B : A), duration: half, ease: 'sine.inOut' }, at + i * half);        // giật ngược / bị lôi
    // lắc đầu liên tục (mỗi nhịp một cú) — `dau` / `dauX` chỉ ở đây, không tranh với hai thế thân
    for (let a = at, j = 0; a < at + n * half; a += 0.13, j++) t.to(s, { dau: 12 + (j % 2 ? 11 : -11), dauX: 12 + (j % 2 ? 3 : -3), duration: 0.13, ease: 'sine.inOut' }, a);
    this._vay(t, at, Math.max(4, Math.round(n * half / 0.12)), 30, 0.12, 22);
    at += n * half;
    t.set(s, { toy: 0 }, at);                    // nhả dây
    this._khep(t, 0.45, at, { huong: plan.side });
    return t;
  }

  /** Số đo cho tools/acting_check.py (đợt 40 A, `set.careProbe` → `p40`): trạng thái chính và các phần tử đang hiện (đồ chơi trong mõm / trên sàn, cục đất, sóng tru), đầu dây kéo co (px màn hình). */
  pet40Probe() {
    const e = this.el, s = this.s, on = (el) => (el && el.style.display !== 'none' ? el : null), keys = ['toy', 'toyF', 'truocX', 'truocY', 'sauY', 'dauY', 'dau', 'gape', 'mieng', 'matY', 'ngoi', 'howl', 'dirtA'];
    return { s: Object.fromEntries(keys.map((k) => [k, +(+s[k] || 0).toFixed(3)])), toy: on(e.toyM), floor: on(e.toyFG), howl: on(e.howlG),
             dirt: on(e.dirtG) ? [...e.dirtG.children].slice(1).filter((c) => +c.getAttribute('opacity') > 0.3) : [], end: s.toy >= 0.5 ? this.ropeEnd() : null };
  }

  /**
   * KẾ HOẠCH KÉO CO với người `person` (đợt 40 A) — rig người đọc để đặt tay: `{ side, lead, swing: { dx, dy } }`. `side`: người ở bên nào (1 phải màn hình, −1 trái);
   * `lead`: giây từ lúc bắt đầu tới lúc nó ngậm dây xong (bắt đầu giằng co); `swing`: chỗ buộc dây (`ropeEnd`) dời bao nhiêu px trên màn hình giữa thế giật ngược (A)
   * và thế bị lôi (B) — tay người dời đúng chừng ấy nên dây luôn căng.
   */
  tugPlan(person, hold = 2.4) {
    const held = this.s.huong < 0 ? -1 : 1, side = person ? (this._personMetrics(person, 'tugOfWar').cx - this.centerX() < 0 ? -1 : 1) : held;        // không có người: giằng co với sợi dây trong không khí, theo hướng đang quay
    const a = this.ropeEnd({ huong: side, ...RigThu.TUG_STANCE, ...RigThu.TUG_A }), b = this.ropeEnd({ huong: side, ...RigThu.TUG_STANCE, ...RigThu.TUG_B });
    return { side, lead: (this.s.ngoi ? 0.32 : 0) + (held !== side ? 0.22 : 0) + 0.6, swing: a && b ? { dx: b.x - a.x, dy: b.y - a.y } : { dx: 0, dy: 0 } };
  }

  /**
   * MỪNG CHỦ: đứng dựng lên hai chân sau, hai chân trước chồm ra trước (lên chân người đứng trước mặt), đuôi vẫy lia lịa,
   * lưỡi thè, mắt híp — `hold` giây rồi xuống. Đặt con vật sát người, quay mặt về phía người ấy.
   */
  greet(hold = 1.4) {
    const t = this.tl(), s = this.s;
    const at = this._dung(t, 0);
    t.to(s, { truocY: -38, truocX: 10, sauY: 2, tnNhac: 1, txNhac: 1, tnGoc: 118, txGoc: 108, dau: -8, dauY: -6, cuoi: 1, mieng: 0.55, luoi: 1, matY: 0.45, taiL: 0.8, taiR: 0.8,
              duration: 0.35, ease: 'back.out(1.6)' }, at);
    this._vay(t, at + 0.2, Math.max(4, Math.round(hold / 0.1)), 46, 0.1, 20);
    for (let a = at + 0.35, i = 0; a < at + 0.35 + hold; a += 0.22, i++) t.to(s, { tnGoc: i % 2 ? 118 : 128, txGoc: i % 2 ? 112 : 102, truocY: i % 2 ? -38 : -34, duration: 0.22, ease: 'sine.inOut' }, a);
    this._khep(t, 0.4, at + 0.35 + hold);
    return t;
  }

  /**
   * RỦ CHƠI: cúi rạp mời chơi (ngực sát đất, mông nhổm, đuôi vẫy), rồi nhảy qua lại hai lần — cho hai con vật đối mặt nhau
   * chạy cùng lúc trong một `together` là chúng đùa với nhau.
   */
  play(times = 2) {
    const t = this.tl(), s = this.s, x0 = s.x, dir = s.huong < 0 ? -1 : 1;
    const at = this._dung(t, 0);
    t.to(s, { truocY: 22, truocX: 8, sauY: -6, tnX: 18, txX: 18, dauY: 12, dau: 6, cuoi: 1, mieng: 0.5, luoi: 0.6, taiL: 0.7, taiR: 0.7, duration: 0.3, ease: 'power2.out' }, at);
    this._vay(t, at + 0.1, 6, 38, 0.12, 22);
    let a = at + 0.85;
    for (let i = 0; i < times; i++) {
      const g = i % 2 ? 1 : -1;
      t.to(s, { truocY: 0, sauY: 0, tnX: 0, txX: 0, dauY: 0, y: -26, x: x0 + g * dir * 18, tnY: 10, txY: 10, snY: 8, sxY: 8, duration: 0.2, ease: 'power2.out' }, a)
       .to(s, { y: 0, tnY: 0, txY: 0, snY: 0, sxY: 0, truocY: 14, duration: 0.18, ease: 'power2.in' }, a + 0.2);
      a += 0.45;
    }
    t.to(s, { x: x0, truocY: 0, duration: 0.25, ease: 'sine.inOut' }, a);
    this._khep(t, 0.35, a + 0.25, { x: x0 });
    return t;
  }

});
