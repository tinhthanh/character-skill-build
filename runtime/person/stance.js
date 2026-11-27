// runtime/person/stance.js — carry / put down, ride / get off, sit down / stand up, walk, enter, exit.
// Methods of `RigSVG`, installed by runtime/rig-svg.js: `this` is the rig, `RigSVG` its class.

import { KHUNG, DOI_Y, HONG, DAI, clamp, mix } from './shared.js';

export default (RigSVG) => mix(RigSVG, class {
  /**
   * BẾ một con vật lên: cúi xuống, hai tay đỡ lấy nó, nhấc lên ôm trước bụng — và GIỮ (thế bế): các động tác sau (nói,
   * gật, quay mặt, đi) diễn khi đang bế, con vật cuộn trong tay và vẫn tự diễn động tác của nó (gừ gừ, vẫy đuôi).
   * `putDown()` đặt nó xuống lại đúng chỗ cũ. Con vật phải ở trong tầm tay (như `stroke`).
   */
  carry(pet) {
    if (!pet || !pet.svg || typeof pet.apDung !== 'function' || !pet.el || !pet.el.dau || pet instanceof RigSVG) throw new Error('[character] carry(pet): pet must be a pet rig (createPet(...).rig)');
    if (this.carried && this.carried.pet !== pet && this.s.om >= 0.5) throw new Error('[character] carry: already carrying another pet — putDown() first');
    const t = this.tl(), s = this.s, N = this.NGHI;
    // Đo con vật Ở NHÀ: lúc dựng bước này nó có thể đang nằm tạm trong tay người khác (bản nháp của `sequence()` vừa đi
    // qua một `carry` / `takePet`), và đo ở đó thì "chỗ nhà" ghi nhầm thành ngăn bế của người ấy — con vật hiện trong tay
    // người này suốt cảnh (cảnh thử đợt 6). Lúc phát, mỗi khung tự đặt nó lại đúng chỗ theo trạng thái.
    RigSVG._homePet(pet);
    // Con vật đang ở đâu, trong hệ SVG gốc của người (đo lúc DỰNG timeline, như `point`).
    const inv = this.svg.getScreenCTM().inverse(), r = pet.svg.getBoundingClientRect();
    const a = new DOMPoint(r.left, r.top).matrixTransform(inv), b = new DOMPoint(r.right, r.bottom).matrixTransform(inv);
    const reach = this._reachLow(pet, null, 'body');
    // Vị trí ĐẦU con vật theo bề ngang khung của nó (0…1): đầu được đặt vào GIỮA NGỰC người bế, chỗ trống giữa hai cánh
    // tay. Canh theo thân thì đầu rơi đúng chỗ một cánh tay đi qua — cánh tay vẽ đè ngang mặt con vật.
    // (Trừ phần hình vẽ đã dời khi con vật đi trong khung của nó — xem `_placeCarried`.)
    const vb = pet.svg.viewBox && pet.svg.viewBox.baseVal, walked = vb && vb.width ? (pet.s.x || 0) / vb.width : 0;
    const head = pet.el.dau ? pet.el.dau.getBoundingClientRect() : r, middle = r.width ? clamp((head.left + head.width / 2 - r.left) / r.width - walked, 0.1, 0.9) : 0.5;
    this._holdEntry(t, { pet, host: pet.host || pet.svg.parentNode, attrs: pet.homeAttrs || ['x', 'y', 'width', 'height'].map((name) => [name, pet.svg.getAttribute(name)]),
                     from: { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }, reach, at: s.x, middle, facing: s.huong });
    const other = reach.k === 'L' ? 'R' : 'L';
    this._leanTo(t, reach, 'xoe');
    t.to(s, { ['bat' + other]: reach.bend ? -reach.bend : reach.upper * 0.6, ['cang' + other]: -40, ['tay' + other]: 'xoe', duration: 0.45, ease: 'power2.out' }, 0);
    t.set(s, { om: 1 }, 0.5);                                                              // hai tay đã chạm: con vật vào tay
    // Nhấc lên và QUAY VỀ PHÍA NGƯỜI XEM: dáng ôm là dáng nhìn thẳng (ở dáng 3/4 tay phía xa buông chéo qua mặt con
    // vật), và "khoe" con vật ra máy quay cũng là điều ta muốn thấy. Thế bế giữ hướng nhìn thẳng; `putDown` trả lại hướng cũ.
    // Đang NGỒI (`sitDown`, ghế phòng chờ) thì vẫn ngồi — con vật nằm trên đùi; đứng thì đứng thẳng lại sau cú khuỵu gối.
    // Đang NGỒI quay 3/4 (đùi nằm trên mặt ghế): giữ một chút quay (0,22) — nhìn thẳng hẳn thì đùi dựng lại, người bế con vật
    // trông như đứng trước ghế (đợt 29). Hai cánh tay vẫn gần như nhìn thẳng.
    const turnKeep = s.seat >= 0.5 && Math.abs(s.huong) > 0.02 ? Math.sign(s.huong) * 0.22 : 0;
    // `sine.inOut` (đợt 35, lượt bốn): power2 nhanh gấp đôi ở giữa — con vật vụt vào tay (5,2–5,9 % chiều cao người giữa hai khung).
    t.to(s, { omRise: 1, huong: turnKeep, seat: s.seat >= 0.5 ? s.seat : N.seat, than: N.than, dau: N.dau, dauY: 3, nhinX: 0, nhinY: 1.8, cuoi: 1, duration: 0.6, ease: 'sine.inOut' }, 0.55);
    this._khep(t, 0.4, 1.15, { om: 1, omRise: 1, huong: turnKeep });
    return t;
  }

  /** ĐẶT con vật đang bế xuống, đúng chỗ nó đứng lúc được bế lên. */
  putDown() {
    const t = this.tl(), s = this.s, c = this.carried;
    if (!c || s.om < 0.5) throw new Error('[character] putDown: the character is not carrying a pet — carry(pet) first');
    if (Math.abs(s.x - c.at) > 20) throw new Error('[character] putDown: the character walked away from where it picked the pet up — walk back first (the pet goes back to its own spot)');
    const { reach } = c, other = reach.k === 'L' ? 'R' : 'L';
    // Tay đặt sẵn ở dáng cúi xuống (bị dáng ôm che đi lúc `omRise` = 1), rồi hạ con vật: tay đi từ dáng ôm về dáng ấy.
    // (Một tween rất ngắn chứ không `set` ở mốc 0: `sequence()` dựng nháp ở đầu bước và `set` đúng mốc 0 không được vẽ —
    // tay ở lại dáng ôm cho tới khi con vật đã chạm đất.)
    t.to(s, { ['bat' + reach.k]: reach.upper, ['cang' + reach.k]: reach.fore, ['bat' + other]: reach.bend ? -reach.bend : reach.upper * 0.6, ['cang' + other]: -40, duration: 0.02 }, 0);
    t.set(s, { tayL: 'xoe', tayR: 'xoe' }, 0.02);
    t.to(s, { omHome: 1, duration: 0.02 }, 0);                                             // hạ về chỗ nhà (xem `#placeCarried`)
    if (reach.crouch) t.to(s, { seat: reach.crouch, duration: 0.5, ease: 'power2.inOut' }, 0);
    t.to(s, { omRise: 0, dauY: 7, nhinY: 2.4, duration: 0.55, ease: 'sine.inOut' }, 0);
    t.to(s, { huong: c.facing, duration: 0.5, ease: 'sine.inOut' }, 0);                    // quay lại hướng lúc bế lên
    t.set(s, { om: 0 }, 0.6);                                                              // con vật về chỗ của nó
    this._khep(t, 0.45, 0.65, { om: 0, omRise: 0, omHome: 0, huong: c.facing });
    return t;
  }

  /**
   * CẦM LÁI XE MÁY và giữ thế ấy: quay hẳn sang ngang (giữ hướng đang quay; đang nhìn thẳng thì sang phải), đùi nằm ngang
   * ra trước, ống chân xuống sàn để chân, lưng hơi đổ tới, hai tay nắm tay lái trước ngực. Các động tác sau (nói, gật,
   * nhìn, vẫy một tay) diễn khi vẫn ngồi trên xe; `getOff()` đứng xuống. Hông ở cao độ `rideSeatY()` — đặt yên xe ở đó.
   * Xe là một hình (cutout / đạo cụ) do cảnh tự đặt; rig không vẽ xe.
   */
  ride() {
    const t = this.tl(), s = this.s, side = s.huong < -0.1 ? -1 : 1;
    t.to(s, { dauY: 2, cuoi: 0.6, duration: 0.25, ease: 'power2.in' }, 0);
    this._khep(t, 0.55, 0.05, { ride: 1, seat: 0, kneel: 0, huong: side });
    return t;
  }

  /** XUỐNG XE: thôi thế cầm lái, đứng thẳng lại, giữ hướng đang quay. */
  getOff() {
    const t = this.tl(), s = this.s;
    t.to(s, { dauY: 2.5, duration: 0.2, ease: 'power2.in' }, 0);
    this._khep(t, 0.55, 0.05, { ride: 0 });
    return t;
  }

  /**
   * Cao độ YÊN XE khớp với nhân vật này khi cầm lái (y trong khung 400 × 470, sàn ở 458): mặt dưới của đùi lúc `ride = 1`.
   * Như `seatY()` của ghế: dời / co hình chiếc xe sao cho mặt yên nằm ở đây.
   */
  rideSeatY() {
    const nv = this.nv;
    return HONG.y + DOI_Y + this.hangChan() + DAI.dui * nv.daiDui * nv.coChan + 13 * nv.dayChan * nv.coChan;
  }

  /** NGỒI XUỐNG và ở yên trong dáng ngồi; các động tác sau (nói, gật, vẫy…) diễn khi đang ngồi. */
  sitDown() {
    const t = this.tl(), s = this.s;
    t.to(s, { dauY: 2.5, than: 0, duration: 0.25, ease: 'power2.in' }, 0);
    this._khep(t, 0.5, 0.05, { seat: 1 });
    return t;
  }

  /** ĐỨNG DẬY từ dáng ngồi. */
  standUp() {
    const t = this.tl(), s = this.s;
    if (s.floor42e > 0.5 || s.lie42e > 0.5) return this._floorRise(t);      // đợt 42 E: dậy từ sàn — qua dáng quỳ
    t.to(s, { dauY: 2.5, duration: 0.2, ease: 'power2.in' }, 0);
    this._khep(t, s.kneel > 0.5 ? 0.65 : 0.5, 0.05, { seat: 0, kneel: 0 });
    return t;
  }

  /**
   * NGỒI xuống (như ngồi lên một chiếc ghế vô hình, nhìn thẳng), giữ, rồi đứng dậy.
   * Đùi rút ngắn theo phối cảnh — đầu gối đưa về phía người xem — và cả người hạ xuống đúng
   * bằng phần đùi vừa rút, nên bàn chân vẫn nằm trên mặt đất. Composition tự vẽ ghế nếu cần.
   */
  sit(hold = 2) {
    const t = this.tl(), s = this.s;
    // Chỉ cần đẩy `seat`: apDung tự rút đùi và hạ thân, bàn chân và bóng ở lại mặt đất.
    t.to(s, { seat: 1, than: 0, dauY: 1.5, duration: 0.45, ease: 'power2.inOut' }, 0);
    t.to(s, { batL: 14, batR: 14, cangL: -38, cangR: -38, cuoi: 0.6, duration: 0.4, ease: 'power2.out' }, 0.15);   // hai tay đặt lên đùi
    for (let a = 0.6; a < 0.45 + hold - 0.3; a += 2.4) this._chop(t, a + 0.5);
    this._khep(t, 0.5, 0.45 + hold);
    return t;
  }

  /**
   * Đi NGHIÊNG.
   *
   *   walk()           4 bước TẠI CHỖ, mặt quay sang phải (như máy chạy bộ) — nền
   *                    phải tự trôi thì mới hợp.
   *   walk(4, 120)     đi thật 120 đơn vị sang PHẢI rồi đứng lại ở đó; số bước và
   *                    sải chân tự chọn để chân trụ không trượt (`buoc` bị bỏ qua).
   *   walk(4, -120)    như trên nhưng sang TRÁI.
   *
   * Vị trí xuất phát đọc từ `s.x` LÚC DỰNG timeline, giống `point()`.
   */
  walk(buoc = 4, quang = 0) {
    const t = this.tl(), s = this.s, chieu = quang < 0 ? -1 : 1;
    // QUÃNG NGẮN (bước lại gần một chút trước khi với tay — tools/scene.py chèn): BƯỚC NHÍCH sang ngang, KHÔNG quay người.
    // Quay hẳn người sang ngang, đi hai bước, rồi quay lại cho 40 đơn vị thì cả thân xoay qua xoay lại trong một giây —
    // người xem thấy nhân vật giật (Gemini, đợt 5, giây 14–15).
    if (quang && Math.abs(quang) <= RigSVG.SIDESTEP) {
      const x0 = s.x, steps = 2, h = 0.36;
      let at = 0;
      for (let i = 0; i < steps; i++) at = this._dam(t, at, h, (i % 2 ? 'L' : 'R') , 0, 0.6);
      t.to(s, { x: x0 + quang, duration: at, ease: 'sine.inOut' }, 0);
      this._khep(t, 0.3, at, { x: x0 + quang });
      return t;
    }
    t.to(s, { huong: chieu, cuoi: 0.5, duration: 0.4, ease: 'power2.inOut' }, 0);   // xoay người rồi mới bước
    if (quang) {
      const x0 = s.x, d = this._doBuoc(Math.abs(quang), true, true);
      const at = this._di(t, 0.14, d.buoc, 0.46, { kA: d.kA, chieu, x: (b) => x0 + chieu * d.x(b) });
      this._khep(t, 0.45, at, { x: x0 + quang });
    } else {
      const at = this._di(t, 0.14, buoc, 0.46);
      this._khep(t, 0.45, at);
    }
    return t;
  }

  /**
   * Từ chỗ đứng gốc (x = 0) phải đi bao xa về phía `dir` (−1 trái, +1 phải) thì RA HẲN ngoài khung hình — đơn vị
   * viewBox. Khung hình là phần tử composition (`data-composition-id`) chứa nhân vật, không có thì là cả trang.
   * Bản trước đi cố định 270–300 đơn vị: trong cảnh rộng nhân vật mới tới lưng chừng sân khấu đã mờ đi, và bước
   * vào thì hiện ra giữa khung. Chặn trên 700 đơn vị cho khỏi mất quá năm giây; khi ấy vẫn còn đoạn mờ ở cuối.
   */
  _offstage(dir) {
    const frame = this.svg.getBoundingClientRect();
    const scale = Math.min(frame.width / KHUNG.w, frame.height / KHUNG.h);
    if (!(scale > 0)) return 300;                                   // chưa có kích thước (chưa gắn vào trang)
    const stage = (this.svg.closest('[data-composition-id]') || this.svg.ownerDocument.documentElement).getBoundingClientRect();
    const centre = frame.left + frame.width / 2;
    return clamp((dir > 0 ? stage.right - centre : centre - stage.left) / scale + 80, 270, 700);
  }

  /**
   * Bước VÀO từ ngoài khung hình rồi dừng ở chỗ đứng của mình. `from`: 'left' (mặc định, đi sang phải) hoặc 'right'.
   * `distance` (đơn vị viewBox): quãng đi; bỏ trống thì tự tính cho vừa từ ngoài mép khung hình.
   */
  enter(from = 'left', distance = null) {
    const t = this.tl(), s = this.s, chieu = from === 'right' ? -1 : 1;
    const far = distance > 0 ? distance : this._offstage(-chieu), x0 = -far * chieu;
    const d = this._doBuoc(far, false, true);              // vào khung khi đang đi, dừng lại ở giữa
    t.set(s, { x: x0, mo: 1, cuoi: 0.5, huong: chieu }, 0);
    const at = this._di(t, 0, d.buoc, 0.42, { vao: false, kA: d.kA, chieu, x: (b) => x0 + chieu * d.x(b) });
    // HIỆN suốt quãng đi. `set` ở trên không đủ: `sequence()` đặt sẵn trạng thái đầu của động tác vào rig trước khi
    // dựng nó, nên GSAP thấy `mo` đã là 1, không ghi gì — nhân vật vừa `exit` (mo 0) bước vào trong vô hình rồi hiện
    // phụt ra ở giữa khung. Ghi qua setter thì khung nào cũng ghi.
    const shown = { get v() { return 0; }, set v(v) { s.mo = Math.min(1, v * at / 0.2); s.huong = chieu; s.seat = 0; } };    // hiện dần trong 0,2 s đầu
    t.to(shown, { v: 1, duration: at, ease: 'none' }, 0);
    // Bước vào thì món đồ về trạng thái BAN ĐẦU của nhân vật: đang cầm (mặc định), hoặc đang cất nếu nhân vật được tạo
    // với `itemsHidden` — ghi cứng 1 ở đây là người sắp `take()` một món đồ bước vào đã cầm sẵn nó.
    this._khep(t, 0.45, at, { x: 0, huong: 0, seat: 0, itemL: this.NGHI.itemL, itemR: this.NGHI.itemR });
    return t;
  }

  /**
   * Bước RA khỏi khung hình và ẩn đi. `to`: 'right' (mặc định) hoặc 'left'. `distance`: như `enter`.
   * Xuất phát từ chỗ ĐANG ĐỨNG (kể cả sau khi đã `walk` đi chỗ khác).
   */
  exit(to = 'right', distance = null) {
    const t = this.tl(), s = this.s, chieu = to === 'left' ? -1 : 1, x0 = s.x;
    const end = chieu * (distance > 0 ? distance : this._offstage(chieu)), far = Math.max(60, (end - x0) * chieu);
    const d = this._doBuoc(far, true, false);              // nhấc chân bước đi, ra khỏi khung khi vẫn đang đi
    t.to(s, { huong: chieu, cuoi: 0.6, duration: 0.35, ease: 'power2.inOut' }, 0);
    const at = this._di(t, 0.1, d.buoc, 0.42, { ra: false, kA: d.kA, chieu, x: (b) => x0 + chieu * d.x(b) });
    t.to(s, { mo: 0, duration: 0.25 }, at - 0.25);
    this._khep(t, 0.25, at, { x: x0 + chieu * far, mo: 0, huong: chieu });   // khép tư thế nhưng vẫn ở ngoài khung và ẩn
    return t;
  }

});
