// runtime/pet/species.js — cat and rabbit specials: groom, loaf, slow blink, bat a toy, arch, box; binky, flop, periscope, nose twitch, chew.
// Methods of `RigThu`, installed by runtime/rig-thu.js: `this` is the rig, `RigThu` its class.

import { DAT, clamp, pha, mix } from './shared.js';
import { markTweens } from '../marks.js';

export default (RigThu) => mix(RigThu, class {
  static GROOM_BEAT = 0.9;       // giây mỗi lần quệt chân lên mặt (lên + xuống), chậm cho người xem thưa
  static GROOM_REACH = 176;      // góc treo của chân trước lúc quệt tới tai (độ; liếm chân là 112)
  static LOAF = { truocY: 30, sauY: 30, tnX: -10, txX: -6, snX: 4, sxX: -2, dauY: 14, dauX: -9, dau: -3, matY: 0.55, cuoi: 1, taiL: -0.2, taiR: -0.2, duoi: -30, duoiCong: 0.9, dongTu: 1.15 };
  static BLINK_BEAT = 2.6;       // giây mỗi lần chớp chậm: nhắm 0,8 — giữ 1,0 — mở 0,8
  static TOY_X = 74;             // cuộn len nằm cách tâm thân chừng ấy (đơn vị khung, về phía đầu)
  static TOY_HOP = 15;           // mỗi cú vờn cuộn len nảy xa thêm chừng ấy
  static BOX_X = 112;            // hộp cách tâm thân chừng ấy lúc hiện ra
  static FLOP = { truocY: 44, sauY: 40, tnX: 62, txX: 52, snX: -34, sxX: -42, dauY: 22, dauX: 6, dau: 62, matY: 0.72, taiL: -1.2, taiR: -1.2, cuoi: 0.9, duoi: -62, dongTu: 1.1 };

  // Vẽ phần thêm của đợt 40 B: viền lông dựng, cuộn len, hộp, bàn chân đè lên mặt, mũi và ria thỏ.
  _veSpeciesProps(s, H, S, ng) {
    const e = this.el, nv = this.nv, f = (v) => v.toFixed(2);
    // LÔNG DỰNG: một vòng viền răng cưa phủ lên lưng, cao hơn thân nửa thân — cả hình to ra, không chỉ cái gù.
    if (e.phong) {
      const pv = clamp(s.phong || 0, 0, 1);
      e.phong.style.display = pv > 0.02 ? '' : 'none';
      if (pv > 0.02) {
        const day = nv.dayThan, dx = S.x - H.x, dy = S.y - H.y, len = Math.hypot(dx, dy) || 1, tx = dx / len, ty = dy / len, nx = ty, ny = -tx;
        const A = { x: H.x - tx * day * 0.8, y: H.y - ty * day * 0.8 }, B = { x: S.x + tx * day * 0.7, y: S.y + ty * day * 0.7 };
        const apex = (day * 0.3 + Math.max(0, s.cong) * day * 0.8) * pv, N = 18, up = [];
        const at = (u, h) => ({ x: pha(A.x, B.x, u) + nx * h, y: pha(A.y, B.y, u) + ny * h });
        const top = (u) => day * 0.78 + apex * 4 * u * (1 - u);
        for (let i = 0; i <= N; i++) {
          const u = i / N, q = at(u, top(u));
          up.push(q);
          if (i < N) { const um = (i + 0.5) / N; up.push(at(um, top(um) + (6 + 4 * Math.sin(i * 2.3)) * pv)); }
        }
        const low = (u) => at(u, -day * 0.55);
        e.phong.setAttribute('d', 'M ' + up.map((q) => `${f(q.x)} ${f(q.y)}`).join(' L ') + ` L ${f(low(1).x)} ${f(low(1).y)} L ${f(low(0).x)} ${f(low(0).y)} Z`);
      }
    }
    if (e.toy) {
      const v = clamp(s.yarn || 0, 0, 1.2);
      e.toy.style.display = v > 0.02 ? '' : 'none';
      if (v > 0.02) { e.toy.setAttribute('transform', `translate(${f(200 + s.toyX)} ${f(DAT - 15 * v - s.toyY)}) scale(${f(v * 1.3)})`); e.toyBall.setAttribute('transform', `rotate(${f(s.toyR)})`); }
    }
    if (e.boxB) {
      const v = clamp(s.box || 0, 0, 1.3), on = v > 0.02;
      for (const g of [e.boxB, e.boxF]) { g.style.display = on ? '' : 'none'; if (on) g.setAttribute('transform', `translate(${f(200 + s.boxX)} ${DAT}) scale(${f(v)})`); }
    }
    if (e.gPaw) {
      const on = clamp(s.gp || 0, 0, 1) > 0.5 && !!this._legNear;
      e.gPaw.style.display = on ? '' : 'none';
      if (on) {
        const { J, ban } = this._legNear, c = nv.chanT;
        e.gArm.setAttribute('d', `M ${f(J.x)} ${f(J.y)} L ${f(ban.x)} ${f(ban.y)}`);
        e.gBan.setAttribute('transform', `translate(${f(ban.x + c.rong * 0.22)} ${f(ban.y)})`);
      }
    }
    if (e.nose) {
      const n = clamp(s.nose || 0, 0, 1), w = clamp(s.twitch || 0, 0, 1);
      e.nose.setAttribute('transform', `translate(0 ${f(9.4 - 1.4 * n)}) scale(${f(1 + 0.5 * n * w + 0.15 * w)} ${f(1 - 0.35 * n * w)}) translate(0 -9.4)`);
      for (const [el, g] of [[e.riaL, 1], [e.riaR, -1]]) {
        el.setAttribute('transform', `rotate(${f(g * (s.ria || 0))} ${g * -10} 13.500)`);
        el.setAttribute('stroke-width', f(0.7 + 0.9 * w)); el.setAttribute('opacity', f(0.5 + 0.45 * w));
      }
    }
  }

  /**
   * RỬA MẶT (mèo): ngồi, liếm một chân trước hai cái, rồi quệt chân lên má, lên tai `times` lần (1–6): chân giơ khỏi mặt tới tận tai, đầu
   * nghiêng theo, mắt nhắm híp. Bàn chân vẽ ĐÈ lên mặt (`gp`) — không thì mặt che mất chân.
   */
  groomFace(times = 3) {
    this._only('groomFace', ['cat']);
    const t = this.tl(), s = this.s, n = clamp(Math.round(times), 1, 6), beat = RigThu.GROOM_BEAT, N = this.NGHI;
    t.to(s, { ngoi: 1, duration: 0.25, ease: 'power2.inOut' }, 0);
    t.to(s, { tnNhac: 1, tnGoc: 112, gp: 1, dau: 13, dauX: -3, dauY: 9, matY: 0.6, nhinY: 1.5, taiL: -0.2, taiR: -0.2, duration: 0.4, ease: 'power2.out' }, 0.15);
    // liếm lòng chân hai cái
    for (let i = 0; i < 2; i++) {
      const a = 0.6 + i * 0.45;
      t.to(s, { luoi: 0.8, mieng: 0.3, dauY: 11, duration: 0.15, ease: 'power1.out' }, a).to(s, { luoi: 0, mieng: 0.05, dauY: 8, duration: 0.2, ease: 'power1.in' }, a + 0.2);
    }
    // quệt: chân đưa lên qua má tới tai (đầu nghiêng đón chân, tai bên ấy gập), giữ trên cao một nhịp, rồi hạ về miệng
    let at = 1.55;
    for (let i = 0; i < n; i++) {
      t.to(s, { tnGoc: RigThu.GROOM_REACH, dau: -9, dauX: 4, dauY: 5, matY: 0.92, taiR: 0.5, taiL: -0.3, duration: beat * 0.4, ease: 'sine.inOut' }, at)
       .to(s, { tnGoc: 150, duration: beat * 0.2, ease: 'sine.inOut' }, at + beat * 0.4)
       .to(s, { tnGoc: 112, dau: 13, dauX: -3, dauY: 9, matY: 0.6, taiR: -0.2, taiL: -0.2, duration: beat * 0.4, ease: 'sine.inOut' }, at + beat * 0.6);
      if (i < n - 1 && i % 2 === 1) t.to(s, { luoi: 0.7, mieng: 0.25, duration: 0.12 }, at + beat).to(s, { luoi: 0, mieng: 0.05, duration: 0.15 }, at + beat + 0.12);
      at += beat;
    }
    t.to(s, { gp: 0, duration: 0.01 }, at + 0.25);
    this._khep(t, 0.45, at + 0.3, { gp: N.gp });
    return t;
  }

  /**
   * NẰM Ổ BÁNH MÌ (mèo, `hold` giây — mặc định 2; KHÔNG phải thế giữ, xong thì ngồi dậy như lúc nghỉ): hạ người sát sàn, chân trước
   * và chân sau gập dưới bụng, đuôi quấn sát thân, đầu rụt vào vai — một khối tròn gọn như ổ bánh mì; mắt lim dim, thở chậm.
   */
  loaf(hold = 2) {
    this._only('loaf', ['cat']);
    const t = this.tl(), s = this.s, h = Math.max(0.8, hold);
    t.to(s, { ngoi: 0, ...RigThu.LOAF, duration: 0.7, ease: 'power2.inOut' }, 0);
    for (let a = 0.8, i = 0; a < 0.7 + h; a += 0.7, i++) t.to(s, { tho: i % 2 ? 0 : 1, duration: 0.7, ease: 'sine.inOut' }, a);      // thở chậm
    this._khep(t, 0.55, 0.7 + h);
    return t;
  }

  /**
   * CHỚP MẮT CHẬM (mèo, `times` lần — mặc định 2): nhìn người, từ từ nhắm mắt (0,8 s), GIỮ nhắm 1 s, từ từ mở (0,8 s) — dấu hiệu tin cậy
   * của mèo. Tai thả lỏng, nét mặt cười; mắt nhắm hẳn nên người xem thưa thấy được.
   */
  slowBlink(times = 2) {
    this._only('slowBlink', ['cat']);
    const t = this.tl(), s = this.s, n = clamp(Math.round(times), 1, 4), beat = RigThu.BLINK_BEAT, N = this.NGHI;
    t.to(s, { dau: 5, dauY: -1, nhinX: 1.2, cuoi: 1, taiL: 0.25, taiR: 0.25, duration: 0.35, ease: 'power2.out' }, 0);
    for (let i = 0; i < n; i++) {
      const a = 0.5 + i * beat;
      t.to(s, { matY: 1, duration: 0.8, ease: 'sine.inOut' }, a).to(s, { matY: N.matY, duration: 0.8, ease: 'sine.inOut' }, a + 1.8);
      if (RigThu.AUTO_MARKS && i === 0) markTweens(t, this.m, 'heart', a + 0.7, 1.4);
    }
    this._khep(t, 0.4, 0.5 + n * beat - 0.2);
    return t;
  }

  /**
   * VỜN ĐỒ CHƠI (mèo, `times` cú — mặc định 3): thụp người, lắc mông, một cuộn len hiện ra trước mặt; mỗi cú chân trước quệt trúng thì
   * cuộn len nảy lên, lăn xa thêm một đoạn (TOY_HOP), mèo chồm theo; xong cuộn len lăn mất.
   */
  batToy(times = 3) {
    this._only('batToy', ['cat']);
    const t = this.tl(), s = this.s, n = clamp(Math.round(times), 1, 6), x0 = RigThu.TOY_X, hop = RigThu.TOY_HOP;
    let at = this._dung(t, 0);
    t.set(s, { toyX: x0, toyY: 0, toyR: 0 }, at);
    t.to(s, { truocY: 16, sauY: 5, tnX: 8, dauY: 7, dauX: 10, taiL: 0.9, taiR: 0.9, dongTu: 1.9, duoi: -34, nhinX: 2, nhinY: 1, cuoi: 0, duration: 0.35, ease: 'power2.out' }, at);
    t.fromTo(s, { yarn: 0 }, { yarn: 1, duration: 0.3, ease: 'back.out(2)', immediateRender: false }, at + 0.05);
    at += 0.45;
    const per = 1.15;
    for (let i = 0; i < n; i++) {
      const a = at + i * per, hit = a + 0.62;
      for (let k = 0; k < 3; k++) t.to(s, { sauX: k % 2 ? -3 : 3, duoi: k % 2 ? -40 : -28, duration: 0.1, ease: 'sine.inOut' }, a + k * 0.1);      // lắc mông
      // giơ chân lên, vồ tới, trúng thì thu lại; vai chồm dần về phía cuộn len
      t.to(s, { tnNhac: 1, tnGoc: 28, truocX: 3 + 4 * i, truocY: 18, duration: 0.28, ease: 'power2.out' }, a + 0.3)
       .to(s, { tnGoc: 78 + 3 * i, truocY: 20, duration: 0.1, ease: 'power3.in' }, hit - 0.1)
       .to(s, { tnGoc: 36, duration: 0.22, ease: 'power2.out' }, hit + 0.1);
      t.to(s, { toyX: x0 + hop * (i + 1), duration: 0.5, ease: 'power1.out' }, hit)
       .to(s, { toyY: 26, duration: 0.2, ease: 'power2.out' }, hit).to(s, { toyY: 0, duration: 0.22, ease: 'bounce.out' }, hit + 0.2)
       .to(s, { toyR: 170 * (i + 1), duration: 0.5, ease: 'power1.out' }, hit);
      t.to(s, { nhinX: 2.4, dauX: 12 + 2 * i, duration: 0.25 }, hit);
    }
    at += n * per;
    t.to(s, { toyX: x0 + hop * (n + 1.5), toyR: 170 * (n + 1.5), yarn: 0, duration: 0.5, ease: 'power1.out' }, at);
    this._khep(t, 0.45, at + 0.2);
    return t;
  }

  /**
   * CONG LƯNG DỰNG LÔNG (mèo, `hold` giây — mặc định 1,4): đứng nghiêng người, lưng cong vồng cao, lông dựng răng cưa (hình to ra), đuôi dựng
   * lên xù như bàn chải, chân cứng nhón lên, tai ép ra sau, khè. Khác `hiss` ở chỗ cả THÂN to ra, không chỉ gương mặt.
   */
  archBack(hold = 1.4) {
    this._only('archBack', ['cat']);
    const t = this.tl(), s = this.s, h = Math.max(0.8, hold);
    let at = this._dung(t, 0);
    // giật mình nhảy tại chỗ, rồi đáp xuống thành thế cong lưng
    t.to(s, { y: -14, cong: 1, phong: 0.6, xu: 1, duration: 0.14, ease: 'power2.out' }, at)
     .to(s, { y: 0, duration: 0.14, ease: 'power2.in' }, at + 0.14);
    t.to(s, { cong: 2.6, phong: 1, xu: 1.5, truocY: -10, sauY: -12, tnX: -6, snX: 6, duoi: 28, duoiCong: 0.95, taiL: -2.6, taiR: -2.6, dongTu: 0.35, matY: 0.3, cuoi: -0.8, dau: -6, dauY: 6,
              duration: 0.3, ease: 'back.out(1.6)' }, at);
    t.to(s, { mieng: 0.85, nanh: 1, duration: 0.15 }, at + 0.25);
    for (let i = 0; i < Math.round(h / 0.1); i++) t.to(s, { dauX: i % 2 ? -1.4 : 1.4, duoi: i % 2 ? 24 : 32, phong: i % 2 ? 0.92 : 1, duration: 0.1 }, at + 0.45 + i * 0.1);      // lông rung
    at += 0.45 + h;
    t.to(s, { mieng: 0.1, nanh: 0, duration: 0.15 }, at);
    this._khep(t, 0.6, at + 0.1);
    return t;
  }

  /**
   * CHUI HỘP (mèo, `hold` giây — mặc định 2): một cái hộp các-tông hiện ra ngay trước mặt, mèo thụp người nhắm rồi nhảy vào, ngồi gọn trong
   * hộp — chỉ đầu và tai thò lên khỏi miệng hộp, mắt lim dim, gừ gừ, đuôi vẩy — rồi nhảy ra, hộp biến mất.
   */
  sitInBox(hold = 2) {
    this._only('sitInBox', ['cat']);
    const t = this.tl(), s = this.s, h = Math.max(0.8, hold), x0 = s.x, dir = s.huong < 0 ? -1 : 1, bx = x0 + dir * RigThu.BOX_X, N = this.NGHI;
    t.set(s, { boxX: bx }, 0);
    t.fromTo(s, { box: 0 }, { box: 1, duration: 0.4, ease: 'back.out(2.2)', immediateRender: false }, 0);
    let at = this._dung(t, 0.1);
    // ngó cái hộp, thụp người lấy đà, lắc mông
    t.to(s, { truocY: 14, sauY: 6, dauY: 5, dauX: 8, nhinX: 2, taiL: 0.8, taiR: 0.8, dongTu: 1.7, duoi: -30, duration: 0.3, ease: 'power2.out' }, at);
    for (let k = 0; k < 4; k++) t.to(s, { sauX: k % 2 ? -3 : 3, duoi: k % 2 ? -38 : -26, duration: 0.1, ease: 'sine.inOut' }, at + 0.3 + k * 0.1);
    at += 0.8;
    // nhảy vào: một vòng cung qua miệng hộp, đáp xuống ngồi
    t.to(s, { x: bx, duration: 0.5, ease: 'sine.inOut' }, at);
    t.to(s, { y: -62, truocY: -6, sauY: -2, tnX: 12, txX: 12, snX: -8, duration: 0.25, ease: 'power2.out' }, at).to(s, { y: 6, truocY: 0, sauY: 0, tnX: 0, txX: 0, snX: 0, duration: 0.25, ease: 'power2.in' }, at + 0.25);
    t.to(s, { ngoi: 1, duoi: 0, dongTu: 1, nhinX: 0, dauX: 0, dauY: -3, dau: 0, duration: 0.3 }, at + 0.3);
    at += 0.6;
    // ngồi gọn trong hộp: lim dim, cười, gừ gừ
    t.to(s, { matY: 0.85, cuoi: 1, taiL: 0.2, taiR: 0.2, duration: 0.35, ease: 'power2.out' }, at);
    if (RigThu.AUTO_MARKS) markTweens(t, this.m, 'heart', at + 0.3, Math.max(0.4, h - 0.5));
    for (let a = at + 0.2, i = 0; a < at + h; a += 0.1, i++) t.to(s, { tho: i % 2 ? 0 : 1, duration: 0.1, ease: 'sine.inOut' }, a);
    t.to(s, { dau: 4, dauX: 2, duration: 0.7, ease: 'sine.inOut', yoyo: true, repeat: 1 }, at + 0.3);
    at += h;
    // nhảy ra
    t.to(s, { matY: N.matY, duration: 0.15 }, at);
    t.to(s, { x: x0, duration: 0.5, ease: 'sine.inOut' }, at + 0.1);
    t.to(s, { y: -58, truocY: -6, tnX: 12, txX: 12, duration: 0.25, ease: 'power2.out' }, at + 0.1).to(s, { y: 0, truocY: 3, tnX: 0, txX: 0, duration: 0.25, ease: 'power2.in' }, at + 0.35);
    t.to(s, { box: 0, duration: 0.35, ease: 'back.in(2)' }, at + 0.75);
    this._khep(t, 0.4, at + 0.65, { x: x0 });
    return t;
  }

  /**
   * NHẢY VUI (thỏ, `times` cú — mặc định 2): thụp, bật cao, GIỮA KHÔNG TRUNG xoay mình — thân nghiêng, bề ngang hẹp lại như vặn người —
   * hai chân sau đá tung ra sau, tai bay, rồi đáp xuống; cú sau vặn về phía ngược lại.
   */
  binky(times = 2) {
    this._only('binky', ['rabbit']);
    const t = this.tl(), s = this.s, n = clamp(Math.round(times), 1, 5), held = s.huong;
    let at = this._dung(t, 0);
    for (let i = 0; i < n; i++) {
      const g = i % 2 ? -1 : 1;
      t.to(s, { sauY: 8, truocY: 6, dauY: 4, taiL: 0.3, taiR: 0.3, duration: 0.16, ease: 'power2.in' }, at);
      t.to(s, { y: -62, sauY: -4, truocY: -8, tnX: 14, txX: 14, snX: -34, sxX: -42, snY: 26, sxY: 32, nghieng: 20 * g, huong: held * 0.45, dau: -14 * g, taiL: -0.8, taiR: -0.8, matY: 0.5, cuoi: 1,
                mieng: 0.3, duoi: 0, duration: 0.3, ease: 'power2.out' }, at + 0.16);
      t.to(s, { snX: -44, sxX: -34, nghieng: -16 * g, huong: held * 0.6, duration: 0.2, ease: 'sine.inOut' }, at + 0.46);       // vặn nốt, đá cú thứ hai
      t.to(s, { y: 0, snX: 0, sxX: 0, snY: 0, sxY: 0, tnX: 0, txX: 0, nghieng: 0, huong: held, sauY: 5, truocY: 4, dau: 0, taiL: 0.2, taiR: 0.2, mieng: 0, duration: 0.24, ease: 'power2.in' }, at + 0.66);
      t.to(s, { sauY: 0, truocY: 0, dauY: 0, matY: 0, duration: 0.2 }, at + 0.9);
      at += 1.2;
    }
    this._khep(t, 0.4, at, { huong: held });
    return t;
  }

  /**
   * NẰM VẬT RA (thỏ, THẾ GIỮ — `standUp()` để dậy, như `lieDown`): đột ngột đổ nghiêng, bẹp xuống sàn, bốn chân duỗi ra hai phía, đầu
   * gục nghiêng, tai xoè phẳng, mắt lim dim — thoải mái hết cỡ. Các động tác sau (nghiêng đầu, giật mũi…) vẫn diễn khi đang nằm vật.
   */
  flop() {
    this._only('flop', ['rabbit']);
    const t = this.tl(), s = this.s;
    let at = this._dung(t, 0);
    t.to(s, { nghieng: -7, truocY: -3, taiL: -0.3, taiR: -0.3, duration: 0.2, ease: 'power2.out' }, at);       // chao đảo trước khi đổ
    t.set(s, { nam: 1, flop: 1 }, at + 0.2);
    t.to(s, { y: -5, duration: 0.1, ease: 'power2.out' }, at + 0.2).to(s, { y: 0, duration: 0.15, ease: 'bounce.out' }, at + 0.3);
    this._khep(t, 0.4, at + 0.2, { nam: 1, flop: 1, ngoi: 0 });
    t.to(s, { nghieng: 0, duration: 0.3, ease: 'power2.out' }, at + 0.35);
    // nằm thả lỏng thêm ~1,5 s (người xem thưa phải thấy dáng này): thở chậm, một tai khẽ giật
    for (let a = at + 0.7, i = 0; i < 2; a += 0.8, i++) t.to(s, { tho: 1 - i % 2, duration: 0.8, ease: 'sine.inOut' }, a);
    t.to(s, { taiR: -0.8, duration: 0.15, yoyo: true, repeat: 1 }, at + 1.5).to(s, { tho: 0, duration: 0.2 }, at + 2.3);
    return t;
  }

  /**
   * ĐỨNG HAI CHÂN (thỏ, `hold` giây — mặc định 1,6): vươn thẳng người trên hai chân sau, hai chân trước co gọn trước ngực, tai dựng cao, ngóng
   * sang trái rồi sang phải — như kính tiềm vọng — rồi hạ xuống ngồi.
   */
  periscope(hold = 1.6) {
    this._only('periscope', ['rabbit']);
    const t = this.tl(), s = this.s, h = Math.max(0.8, hold);
    let at = this._dung(t, 0);
    t.to(s, { truocY: -34, truocX: -22, sauY: -9, sauX: -4, snX: 6, sxX: 6, tnNhac: 1, txNhac: 1, tnGoc: 38, txGoc: 28, dauY: -4, dau: 0, taiL: -0.3, taiR: -0.3, matY: -0.1, nhinY: -0.6, dongTu: 1.2,
              duration: 0.45, ease: 'power2.out' }, at);
    at += 0.55;
    // ngóng: đầu quay qua lại, mắt liếc theo
    const look = [[-7, -1.4], [7, 1.4], [-5, -1], [5, 1]];
    const k = Math.max(2, Math.floor(h / 0.6));
    for (let i = 0; i < k; i++) { const [d, nx] = look[i % 4]; t.to(s, { dau: d, nhinX: nx, dauX: d * 0.6, duration: 0.3, ease: 'sine.inOut' }, at + i * (h / k)); }
    at += h;
    t.to(s, { dau: 0, nhinX: 0, dauX: 0, duration: 0.2 }, at);
    this._khep(t, 0.5, at + 0.1);
    return t;
  }

  /**
   * GIẬT MŨI (thỏ, `hold` giây — mặc định 1,6; cận cảnh): mũi hồng giật liên tục (phình ra, nhích lên), ria hất lên hất xuống, hai tai xoay
   * mỗi bên một hướng như dò âm thanh, miệng nhóp nhép khẽ.
   */
  noseTwitch(hold = 1.6) {
    this._only('noseTwitch', ['rabbit']);
    const t = this.tl(), s = this.s, h = Math.max(0.8, hold);
    let at = this._dung(t, 0);
    t.to(s, { twitch: 1, dauY: -2, dau: 3, nhinY: 0.6, dongTu: 1.15, taiL: 0.3, taiR: -0.25, duration: 0.3, ease: 'power2.out' }, at);
    at += 0.3;
    const beat = 0.12, n = Math.floor(h / beat);
    for (let i = 0; i < n; i++) {
      const on = i % 2 === 0;
      t.to(s, { nose: on ? 1 : 0, ria: on ? 11 : -3, mieng: on ? 0.16 : 0.02, duration: beat, ease: 'sine.inOut' }, at + i * beat);
    }
    // tai xoay dò âm thanh: mỗi bên một hướng, đổi bên giữa chừng
    t.to(s, { taiL: -0.3, taiR: 0.45, duration: 0.4, ease: 'sine.inOut' }, at + h * 0.45);
    t.to(s, { dau: -3, dauX: -2, duration: 0.5, ease: 'sine.inOut' }, at + h * 0.3);
    at += h;
    t.to(s, { nose: 0, ria: 0, twitch: 0, mieng: 0, duration: 0.2 }, at);
    this._khep(t, 0.4, at + 0.1);
    return t;
  }

  /**
   * NHAI: vừa đớp được bánh thưởng / viên thuốc — hàm nhóp nhép `times` nhịp, mắt híp khoái chí, rồi liếm mép hai cái.
   * `scene.py` tự cho con vật nhai khi người `giveTreat` nó.
   */
  chew(times = 4) {
    const t = this.tl(), s = this.s, N = this.NGHI;
    t.to(s, { dau: N.dau - 4, dauY: N.dauY - 2, matY: 0.4, cuoi: 0.8, taiL: 0.5, taiR: 0.5, duration: 0.15, ease: 'power2.out' }, 0);
    const beat = RigThu.CHEW_BEAT;
    for (let i = 0; i < times; i++) {
      const a = 0.15 + i * beat;
      // Đủ rõ ở cỡ trung cảnh: hàm há 0,5 và cả đầu nhấp theo (bản trước há 0,32 — Gemini không thấy con chó nhai).
      // Đợt 36: há LỚN (`gape` 0,8) giữ nửa nhịp rồi khép hẳn nửa nhịp — nhịp CHEW_BEAT (≥ 0,35 s; bản trước 0,24 s, người chấm vẫn
      // thấy "miệng khép, không nhai").
      t.to(s, { mieng: 0.5, gape: 0.8, dauY: N.dauY + 1.5, dau: N.dau - 1, duration: beat * 0.35, ease: 'sine.out' }, a)
       .to(s, { mieng: 0.04, gape: 0, dauY: N.dauY - 2.5, dau: N.dau - 5, duration: beat * 0.35, ease: 'sine.in' }, a + beat * 0.5);
    }
    const end = 0.15 + times * beat;
    for (let i = 0; i < 2; i++) t.to(s, { luoi: 0.55, mieng: 0.22, duration: 0.1, ease: 'power2.out' }, end + i * 0.3).to(s, { luoi: 0, mieng: 0, duration: 0.14, ease: 'power2.in' }, end + i * 0.3 + 0.12);
    this._khep(t, 0.35, end + 0.65);
    return t;
  }

  static CHEW_BEAT = 0.45;      // giây mỗi nhịp nhai (đợt 36: 0,24 → 0,45)

  /* ------------------------------------------- ĐỢT 35: LĂN NGỬA, ĐUỔI ĐUÔI, NHÀO, LIẾM, NẤP, GẶM CÀ RỐT */

  // Động tác chỉ hợp với vài loài: báo lỗi rõ thay vì diễn sai (thỏ không đuổi đuôi, chó không nhào bột).
  _only(name, kinds) {
    if (kinds.includes(this.nv.loai)) return;
    const say = { dog: 'dogs', cat: 'cats', rabbit: 'the rabbit' };
    throw new Error(`[character] ${name}: not for ${this.nv.loai === 'rabbit' ? 'a rabbit' : `a ${this.nv.loai}`} — ${name} is for ${kinds.map((k) => say[k]).join(' and ')}`);
  }

});
