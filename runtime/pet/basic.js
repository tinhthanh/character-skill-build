// runtime/pet/basic.js — everyday dog and cat moves and sounds: in / out of a kennel, shake off, sneeze, pant, wag, bark, sit, jump, beg, paw, sniff, meow, purr, hiss, pounce.
// Methods of `RigThu`, installed by runtime/rig-thu.js: `this` is the rig, `RigThu` its class.

import { LIE, mix } from './shared.js';

export default (RigThu) => mix(RigThu, class {
  /**
   * VÀO LỒNG: đi `distance` đơn vị về phía đang quay mặt (vào trong lồng vận chuyển đặt ở đó) rồi NẰM xuống — và ở yên
   * trong đó (thế nằm, chỗ mới). Lồng che con vật nhờ thứ tự lớp: đặt lồng gần máy hơn chỗ con vật nằm (bối cảnh 3D: `z`
   * lớn hơn một chút; cảnh 2D: host của lồng SAU host con vật). `comeOut(distance)` đi ra.
   */
  goIn(distance = 90) {
    const t = this.tl(), s = this.s, x0 = s.x, dir = s.huong < 0 ? -1 : 1;
    let at = this._dung(t, 0);
    at = this._di(t, at, Math.max(2, Math.round(Math.abs(distance) / 40)), 0.5, { quang: dir * distance, x0 });
    this._khep(t, 0.5, at, { x: x0 + dir * distance, nam: 1, ngoi: 0 });
    return t;
  }

  /** RA KHỎI LỒNG: đứng dậy, quay đầu ra phía cửa, đi `distance` đơn vị ra khỏi lồng, và giữ hướng vừa đi ra. */
  comeOut(distance = 120) {
    const t = this.tl(), s = this.s, x0 = s.x, held = s.huong < 0 ? -1 : 1, out = -held;
    let at = 0;
    if (s.nam > 0.5) { t.to(s, { nam: 0, ...Object.fromEntries(Object.keys(LIE).map((k) => [k, this.NGHI[k]])), duration: 0.5, ease: 'power2.inOut' }, 0); at = 0.5; }
    t.to(s, { huong: out, duration: 0.22, ease: 'power1.inOut' }, at); at += 0.22;
    at = this._di(t, at, Math.max(2, Math.round(Math.abs(distance) / 40)), 0.5, { quang: out * distance, x0 });
    this._khep(t, 0.4, at, { x: x0 + out * distance, huong: out, nam: 0 });
    return t;
  }

  /** RŨ NƯỚC sau khi tắm: cả người lắc mạnh từ đầu tới đuôi, tai văng ra, mắt nhắm. */
  shakeOff() {
    const t = this.tl(), s = this.s;
    const at = this._dung(t, 0);
    t.to(s, { matY: 0.85, cuoi: 0.5, truocY: 3, sauY: 3, duration: 0.15 }, at);
    t.fromTo(s, { nuoc: 0 }, { nuoc: 1, duration: 0.75, ease: 'none', immediateRender: false }, at + 0.15);
    for (let i = 0; i < 10; i++) {
      const g = i % 2 ? -1 : 1, fade = 1 - i / 14;
      t.to(s, { dau: g * 18 * fade, dauX: g * 5 * fade, truocX: g * 4 * fade, sauX: -g * 3 * fade, taiL: g * 1.6 * fade, taiR: -g * 1.6 * fade, duoi: g * 35 * fade,
                duration: 0.07, ease: 'sine.inOut' }, at + 0.15 + i * 0.07);
    }
    this._khep(t, 0.35, at + 0.9, { nuoc: 0 });
    return t;
  }

  /** HẮT HƠI: hít vào ngửa đầu, rồi gập đầu xuống thật nhanh, mắt nhắm, miệng bật mở. */
  sneeze() {
    const t = this.tl(), s = this.s;
    t.to(s, { dau: -14, dauY: -5, matY: 0.6, mieng: 0.35, taiL: 0.4, taiR: 0.4, duration: 0.35, ease: 'sine.in' }, 0);
    // Gập đầu thật mạnh và GIỮ một nhịp (0,25 s): chỉ vài khung thì ở khung trung không ai nhận ra (Gemini, đợt 5).
    t.to(s, { dau: 24, dauY: 13, dauX: 6, matY: 1, mieng: 0.8, truocY: 6, sauY: -2, taiL: -0.9, taiR: -0.9, duration: 0.1, ease: 'power3.out' }, 0.45);
    t.to(s, { dau: 4, dauY: 3, dauX: 0, mieng: 0.05, matY: 0.3, truocY: 0, sauY: 0, duration: 0.3, ease: 'sine.inOut' }, 0.8);
    this._chop(t, 1.25);
    this._khep(t, 0.35, 1.45);
    return t;
  }

  /** THỞ HỔN HỂN `dur` giây: há miệng, lưỡi thè dài, ngực phập phồng nhanh — trời nóng, say nắng, vừa chạy xong. */
  pant(dur = 2) {
    const t = this.tl(), s = this.s;
    t.to(s, { mieng: 0.75, luoi: 1, matY: 0.35, taiL: -0.3, taiR: -0.3, cuoi: 0.3, duration: 0.25 }, 0);
    for (let a = 0.25, i = 0; a + 0.13 <= 0.25 + dur; a += 0.13, i++) t.to(s, { tho: i % 2 ? 0 : 1, dauY: i % 2 ? 0 : 2, mieng: i % 2 ? 0.7 : 0.82, duration: 0.13, ease: 'sine.inOut' }, a);
    this._khep(t, 0.4, 0.25 + dur);
    return t;
  }

  /** NGÁP: ngửa đầu, há miệng thật to, nhắm mắt, lưỡi cong, rồi chép miệng. */
  yawn() {
    const t = this.tl(), s = this.s;
    t.to(s, { dau: -12, dauY: -4, mieng: 1, gape: 1, luoi: 0.3, matY: 1, taiL: -0.5, taiR: -0.5, duration: 0.5, ease: 'sine.inOut' }, 0);
    t.to(s, { mieng: 0.05, gape: 0, luoi: 0, dau: 0, dauY: 0, matY: 0.4, duration: 0.35, ease: 'sine.inOut' }, 1.15);
    t.to(s, { mieng: 0.15, duration: 0.1, yoyo: true, repeat: 1 }, 1.55);
    this._khep(t, 0.35, 1.8);
    return t;
  }

  /* ---------------------------------------------------------------- THỎ */

  /** NHẢY CÓC tại chỗ `times` cú: thụp lấy đà, bật lên (chân sau duỗi, tai ngả ra sau), đáp xuống. */
  hop(times = 2) {
    const t = this.tl(), s = this.s;
    let at = this._dung(t, 0);
    for (let i = 0; i < times; i++) {
      t.to(s, { sauY: 6, truocY: 4, duration: 0.12, ease: 'power2.in' }, at)
       .to(s, { y: -40, sauY: -2, truocY: -6, snX: -16, sxX: -16, tnX: 12, txX: 12, taiL: -0.6, taiR: -0.6, duration: 0.22, ease: 'power2.out' }, at + 0.12)
       .to(s, { y: 0, snX: 0, sxX: 0, tnX: 0, txX: 0, sauY: 4, truocY: 3, taiL: 0.2, taiR: 0.2, duration: 0.2, ease: 'power2.in' }, at + 0.34)
       .to(s, { sauY: 0, truocY: 0, duration: 0.12 }, at + 0.54);
      at += 0.66;
    }
    this._khep(t, 0.35, at);
    return t;
  }

  /** GIẬM CHÂN cảnh giác: tai dựng thẳng, mắt mở to, chân sau giậm mạnh xuống đất hai cái. */
  thump(times = 2) {
    const t = this.tl(), s = this.s;
    t.to(s, { taiL: -0.25, taiR: -0.25, matY: -0.1, nhinX: 1.5, dauY: -4, duration: 0.25, ease: 'power2.out' }, 0);      // tai DỰNG THẲNG, khép vào nhau (dương là xoè ra)
    for (let i = 0; i < times; i++) {
      const a = 0.35 + i * 0.4;
      t.to(s, { snY: 14, sxY: 14, sauY: -4, duration: 0.12, ease: 'power2.out' }, a).to(s, { snY: 0, sxY: 0, sauY: 2, duration: 0.07, ease: 'power3.in' }, a + 0.12).to(s, { sauY: 0, duration: 0.1 }, a + 0.19);
    }
    this._khep(t, 0.4, 0.45 + times * 0.4);
    return t;
  }

  /* ---------------------------------------------------------------- CHÓ */

  wagTail() {
    const t = this.tl(), s = this.s;
    t.to(s, { taiL: 0.8, taiR: 0.8, cuoi: 1, mieng: 0.45, luoi: 0.7, dau: -3, duration: 0.2, ease: 'power2.out' }, 0);
    this._vay(t, 0.1, 12, 44, 0.11);        // đuôi chó ngắn: biên nhỏ hơn thì ở cỡ toàn cảnh không thấy vẫy
    for (let i = 0; i < 12; i++) t.to(s, { sauX: i % 2 ? -2.2 : 2.2, duration: 0.11, ease: 'sine.inOut' }, 0.1 + i * 0.11);   // lắc cả mông theo đuôi
    this._chop(t, 0.7);
    this._khep(t, 0.4, 1.5);
    return t;
  }

  bark(lan = 2) {
    const t = this.tl(), s = this.s;
    t.to(s, { taiL: 1, taiR: 1, duoi: 14, duration: 0.15 }, 0);
    let at = 0.15;
    for (let i = 0; i < lan; i++) {
      // Thụp nhẹ lấy đà rồi hất đầu lên sủa, ngực nảy theo, miệng há to và GIỮ một nhịp, ba vạch tiếng sủa bật ra trước mõm (đợt 35,
      // lượt bốn: người chấm xem thưa ~1 khung / giây không thấy tiếng sủa 0,12 s).
      t.to(s, { dauY: 3, truocY: 2, duration: 0.07, ease: 'sine.in' }, at - 0.07)
       .to(s, { mieng: 0.95, gape: 0.85, dau: -18, dauY: -10, dauX: 5, truocY: -8, duoi: 24, taiL: 0.2, taiR: 0.2, sua: 1, duration: 0.12, ease: 'power2.out' }, at)
       .to(s, { mieng: 0.1, gape: 0, dau: 0, dauY: 0, dauX: 0, truocY: 0, duoi: 14, taiL: 1, taiR: 1, sua: 0, duration: 0.22, ease: 'power2.in' }, at + 0.42);
      at += 0.75;
    }
    this._khep(t, 0.35, at);
    return t;
  }


  /** Ngồi xuống, thè lưỡi thở một lúc rồi đứng dậy. */
  sit(giu = 1.6) {
    const t = this.tl(), s = this.s;
    t.to(s, { ngoi: 1, cuoi: 0.9, duoi: -22, duration: 0.4, ease: 'back.out(1.3)' }, 0);
    t.to(s, { mieng: 0.5, luoi: 1, duration: 0.2 }, 0.35);
    for (let a = 0.5; a < 0.4 + giu; a += 0.26) t.to(s, { tho: 1, duration: 0.13, ease: 'sine.inOut' }, a).to(s, { tho: 0, duration: 0.13, ease: 'sine.inOut' }, a + 0.13);
    this._chop(t, 0.4 + giu * 0.5);
    this._khep(t, 0.4, 0.5 + giu);
    return t;
  }

  jump(lan = 2) {
    const t = this.tl(), s = this.s;
    t.to(s, { cuoi: 1, mieng: 0.5, luoi: 0.5, taiL: 0.8, taiR: 0.8, duration: 0.15 }, 0);
    let at = 0.05;
    for (let i = 0; i < lan; i++) {
      t.to(s, { truocY: 9, sauY: 9, duration: 0.14, ease: 'power2.in' }, at);                                   // nhún lấy đà
      t.to(s, { y: -46, truocY: -4, sauY: -2, tnY: 12, txY: 12, snY: 10, sxY: 10, taiL: -0.6, taiR: -0.6, duoi: 24, duration: 0.24, ease: 'power2.out' }, at + 0.14);
      t.to(s, { y: 0, tnY: 0, txY: 0, snY: 0, sxY: 0, taiL: 0.8, taiR: 0.8, duoi: -10, duration: 0.2, ease: 'power2.in' }, at + 0.38);
      t.to(s, { truocY: 7, sauY: 7, duration: 0.07 }, at + 0.58).to(s, { truocY: 0, sauY: 0, duration: 0.14, ease: 'power2.out' }, at + 0.65);   // chạm đất, lún rồi bật
      at += 0.82;
    }
    this._khep(t, 0.35, at);
    return t;
  }

  /** Đứng hai chân sau "xin": ngồi, nhấc ngực, hai chân trước co lên ngực và vẫy vẫy. */
  beg() {
    const t = this.tl(), s = this.s;
    t.to(s, { ngoi: 1, duration: 0.3, ease: 'power2.inOut' }, 0);
    t.to(s, { truocX: -16, truocY: -34, dauX: -2, tnNhac: 1, txNhac: 1, tnGoc: 62, txGoc: 54, cuoi: 1, mieng: 0.4, luoi: 0.6, taiL: 0.7, taiR: 0.7,
              duration: 0.4, ease: 'back.out(1.5)' }, 0.25);
    for (let i = 0; i < 6; i++) t.to(s, { tnGoc: i % 2 ? 62 : 78, txGoc: i % 2 ? 70 : 54, duration: 0.16, ease: 'sine.inOut' }, 0.7 + i * 0.16);
    this._vay(t, 0.6, 8, 14, 0.13, -22);
    this._chop(t, 1.1);
    this._khep(t, 0.45, 1.8);
    return t;
  }

  /** Ngồi rồi đưa một chân trước lên "bắt tay". */
  givePaw() {
    const t = this.tl(), s = this.s;
    t.to(s, { ngoi: 1, duoi: -22, duration: 0.3, ease: 'power2.inOut' }, 0);
    t.to(s, { tnNhac: 1, tnGoc: 84, dau: 6, cuoi: 0.9, taiL: 0.6, taiR: 0.6, duration: 0.3, ease: 'back.out(1.6)' }, 0.3);
    for (let i = 0; i < 4; i++) t.to(s, { tnGoc: i % 2 ? 84 : 70, duration: 0.17, ease: 'sine.inOut' }, 0.65 + i * 0.17);
    this._chop(t, 0.9);
    this._khep(t, 0.45, 1.45);
    return t;
  }

  /** Cúi xuống đánh hơi mặt đất. */
  sniff() {
    const t = this.tl(), s = this.s;
    t.to(s, { truocY: 13, dauX: 20, dauY: 40, dau: 16, taiL: -0.4, taiR: -0.4, duoi: -30, nhinY: 1.5, cuoi: 0, duration: 0.4, ease: 'power2.inOut' }, 0);
    for (let i = 0; i < 6; i++) t.to(s, { dauX: i % 2 ? 16 : 25, dauY: i % 2 ? 41 : 38, duration: 0.16, ease: 'sine.inOut' }, 0.4 + i * 0.16);
    this._vay(t, 0.4, 6, 8, 0.16, -30);
    this._khep(t, 0.4, 1.4);
    return t;
  }

  /* ---------------------------------------------------------------- MÈO */

  meow() {
    const t = this.tl(), s = this.s;
    t.to(s, { dau: -6, dauY: -3, taiL: -0.3, taiR: -0.3, duration: 0.15 }, 0);
    t.to(s, { mieng: 0.75, matY: 0.55, cuoi: 0.1, duration: 0.14, ease: 'power2.out' }, 0.12)
     .to(s, { mieng: 0.5, duration: 0.3, ease: 'sine.inOut' }, 0.3)
     .to(s, { mieng: 0, matY: 0, duration: 0.2, ease: 'power2.in' }, 0.62);
    t.to(s, { duoiCong: 0.3, duration: 0.5, ease: 'sine.inOut' }, 0.1);
    this._khep(t, 0.35, 0.9);
    return t;
  }

  /** Gừ gừ khoái chí: lim dim, cười, người rung nhẹ, đầu dụi dụi. */
  purr() {
    const t = this.tl(), s = this.s;
    t.to(s, { matY: 0.92, cuoi: 1, taiL: 0.3, taiR: 0.3, dau: 7, dauY: 2, duration: 0.3, ease: 'power2.out' }, 0);
    for (let i = 0; i < 14; i++) t.to(s, { tho: i % 2 ? 0 : 1, duration: 0.09, ease: 'sine.inOut' }, 0.3 + i * 0.09);      // rung
    t.to(s, { dau: -7, dauX: -3, duration: 0.5, ease: 'sine.inOut' }, 0.5).to(s, { dau: 6, dauX: 3, duration: 0.5, ease: 'sine.inOut' }, 1.0);
    t.to(s, { duoiCong: 0.35, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.3);
    this._khep(t, 0.4, 1.6);
    return t;
  }

  /** Liếm chân: nhấc một chân trước lên miệng, cúi đầu, lưỡi thè ra thụt vào. */
  lickPaw() {
    const t = this.tl(), s = this.s;
    t.to(s, { ngoi: 1, duration: 0.25 }, 0);
    t.to(s, { tnNhac: 1, tnGoc: 112, dau: 13, dauX: -3, dauY: 9, matY: 0.7, nhinY: 1.5, taiL: -0.2, taiR: -0.2, duration: 0.35, ease: 'power2.out' }, 0.15);
    for (let i = 0; i < 4; i++) {
      const a = 0.55 + i * 0.3;
      t.to(s, { luoi: 0.8, mieng: 0.3, dauY: 11, tnGoc: 116, duration: 0.13, ease: 'power1.out' }, a)
       .to(s, { luoi: 0, mieng: 0.05, dauY: 7, tnGoc: 108, duration: 0.15, ease: 'power1.in' }, a + 0.14);
    }
    this._khep(t, 0.4, 1.8);
    return t;
  }

  /** Vươn vai: chổng mông, ép ngực sát đất, hai chân trước duỗi dài, ngáp. */
  stretch() {
    const t = this.tl(), s = this.s;
    let at = this._dung(t, 0);
    t.to(s, { truocY: 24, truocX: 6, sauY: -7, tnX: 44, txX: 44, dauX: 12, dauY: 14, dau: 8, duoi: 26, duoiCong: 0.5, taiL: -0.5, taiR: -0.5,
              duration: 0.5, ease: 'power2.inOut' }, at);
    t.to(s, { mieng: 0.95, matY: 1, luoi: 0.35, duration: 0.3, ease: 'power2.out' }, at + 0.35)
     .to(s, { mieng: 0, luoi: 0, duration: 0.3, ease: 'power2.in' }, at + 1.0);
    t.to(s, { sauY: -10, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1 }, at + 0.5);
    this._khep(t, 0.5, at + 1.6);
    return t;
  }

  /** Xù lông doạ: cong lưng, đuôi dựng xù, tai cụp, con ngươi hẹp, nhe miệng. */
  hiss() {
    const t = this.tl(), s = this.s;
    let at = this._dung(t, 0);
    t.to(s, { cong: 1, xu: 1, truocY: -5, sauY: -7, duoi: 18, duoiCong: 1.1, taiL: -2.6, taiR: -2.6, dongTu: 0.35, matY: 0.38, cuoi: -0.8, dau: -6, dauY: 5,       // tai ÉP ra sau (−1 gần như không thấy với tai mèo), mắt nheo, đuôi cong xù
              duration: 0.22, ease: 'back.out(2)' }, at);
    t.to(s, { mieng: 0.8, duration: 0.12 }, at + 0.15);
    for (let i = 0; i < 8; i++) t.to(s, { dauX: i % 2 ? -1.6 : 1.6, duoi: i % 2 ? 27 : 33, duration: 0.08 }, at + 0.3 + i * 0.08);      // run lên
    t.to(s, { mieng: 0.1, duration: 0.15 }, at + 1.0);
    this._khep(t, 0.5, at + 1.15);
    return t;
  }

  tailSwish() {
    const t = this.tl(), s = this.s;
    t.to(s, { nhinX: -2, dau: -5, taiL: 0.4, duration: 0.25 }, 0);
    for (let i = 0; i < 5; i++) t.to(s, { duoi: i % 2 ? -38 : 30, duoiCong: i % 2 ? 0.9 : -0.5, duration: 0.36, ease: 'sine.inOut' }, 0.1 + i * 0.36);
    this._chop(t, 1.0);
    this._khep(t, 0.4, 1.95);
    return t;
  }

  /** Rình rồi vồ: thụp người, lắc mông, con ngươi giãn, rồi bật lên chụp. */
  pounce() {
    const t = this.tl(), s = this.s;
    let at = this._dung(t, 0);
    t.to(s, { truocY: 15, sauY: 5, dauY: 6, dauX: 8, taiL: 0.9, taiR: 0.9, dongTu: 1.9, duoi: -34, nhinX: 2, cuoi: 0, duration: 0.3, ease: 'power2.out' }, at);
    for (let i = 0; i < 6; i++) t.to(s, { sauX: i % 2 ? -3 : 3, duoi: i % 2 ? -40 : -28, duration: 0.09, ease: 'sine.inOut' }, at + 0.35 + i * 0.09);   // lắc mông
    const b = at + 0.92;
    t.to(s, { y: -34, truocY: -8, sauY: 2, sauX: 0, tnX: 18, txX: 18, tnY: 16, txY: 16, snY: 8, sxY: 8, taiL: -0.5, taiR: -0.5, duoi: 20, mieng: 0.3,
              duration: 0.22, ease: 'power2.out' }, b);
    t.to(s, { y: 0, truocY: 9, sauY: 0, tnX: 14, txX: 14, tnY: 0, txY: 0, snY: 0, sxY: 0, mieng: 0, duration: 0.18, ease: 'power2.in' }, b + 0.22);
    t.to(s, { truocY: 4, dongTu: 1, duration: 0.25, ease: 'power2.out' }, b + 0.42);
    this._khep(t, 0.45, b + 0.75);
    return t;
  }

  /* ------------------------------------------------------------------------------------------------------------------
   * ĐỢT 40 B — MÈO: rửa mặt, nằm ổ bánh mì, chớp mắt chậm, vờn đồ chơi, cong lưng dựng lông, chui hộp;
   *            THỎ: nhảy vui, nằm vật ra, đứng hai chân, giật mũi.
   * Người xem thưa (~1 khung / giây): mỗi dáng chính GIỮ ≥ 1 s; `scene.py` cho các động tác này góc cận (PET_CLOSE).
   * ------------------------------------------------------------------------------------------------------------------ */

});
