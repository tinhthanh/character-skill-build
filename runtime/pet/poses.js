// runtime/pet/poses.js — sit / stand / lie / sleep, facing, exit, idle, and feeling unwell (itch, limp, shiver at the vet, struggle, groggy, cone, tremble).
// Methods of `RigThu`, installed by runtime/rig-thu.js: `this` is the rig, `RigThu` its class.

import { LIE, DAT, clamp, RAD, pha, nhieu, ngauNhien, mix } from './shared.js';
import { markTweens } from '../marks.js';

export default (RigThu) => mix(RigThu, class {
  /** NGỒI XUỐNG và ở yên trong dáng ngồi. */
  sitDown() { return this._khep(this.tl(), 0.4, 0, { ngoi: 1 }); }

  /** ĐỨNG DẬY và ở yên trong dáng đứng (mèo vốn nghỉ ở dáng ngồi). Đang nằm thì cũng đứng dậy. */
  standUp() { return this._khep(this.tl(), this.s.nam > 0.5 ? 0.55 : 0.35, 0, { ngoi: 0, nam: 0, flop: 0, ...(this.s.side50a ? { side50a: 0 } : {}) }); }      // đợt 50 A: cả khi đang nằm nghiêng

  /** NẰM XUỐNG và ở yên trong dáng nằm: các động tác sau (vẫy đuôi, gừ gừ, nghiêng đầu…) diễn khi đang nằm. `standUp` để dậy. */
  lieDown() { return this._khep(this.tl(), 0.6, 0, { nam: 1, ngoi: 0, flop: 0, ...(this.s.side50a ? { side50a: 0 } : {}) }); }

  /**
   * NGỦ `dur` giây: nằm xuống (nếu chưa nằm), gục đầu, nhắm mắt, tai thả, thở chậm và sâu, đuôi cuộn vào thân. Xong thì
   * mở mắt, vẫn NẰM (thức dậy tại chỗ). `standUp()` để dậy hẳn.
   */
  sleep(dur = 3) {
    const t = this.tl(), s = this.s;
    t.to(s, { ...LIE, nam: 1, ngoi: 0, duration: s.nam > 0.5 ? 0.2 : 0.6, ease: 'power2.inOut' }, 0);
    t.to(s, { dauY: 16, dauX: 6, dau: -4, matY: 1, taiL: -0.5, taiR: -0.5, duoi: -20, duoiCong: 0.6, cuoi: 0.5, duration: 0.6, ease: 'sine.inOut' }, 0.3);
    // Thở ngủ: chậm (1,6 s một nhịp) và sâu hơn thở thường; đầu nhấp nhô theo.
    for (let a = 0.9; a + 1.6 <= 0.9 + dur; a += 1.6) {
      t.to(s, { tho: 1, dauY: 17.5, duration: 0.8, ease: 'sine.inOut' }, a).to(s, { tho: 0, dauY: 16, duration: 0.8, ease: 'sine.inOut' }, a + 0.8);
    }
    this._khep(t, 0.5, 0.9 + dur, { nam: 1, flop: 0, ...(s.side50a ? { side50a: 0 } : {}) });
    return t;
  }

  /** MỆT / ỐM `hold` giây: tai cụp, mắt lờ đờ, đầu cúi thấp, đuôi rủ, thở dài một hơi. Đứng hay nằm đều được. */
  unwell(hold = 2.5) {
    const t = this.tl(), s = this.s;
    t.to(s, { dauY: 10, dau: -3, matY: 0.55, nhinY: 1.2, taiL: -1, taiR: -1, duoi: -65, duoiCong: -0.2, cuoi: -0.3, duration: 0.6, ease: 'sine.inOut' }, 0);
    // Thở dài: một hơi sâu, đầu trĩu xuống thêm rồi thôi.
    t.to(s, { tho: 1, dauY: 13, duration: 0.7, ease: 'sine.inOut' }, 0.7).to(s, { tho: 0, dauY: 10, duration: 0.9, ease: 'sine.inOut' }, 1.4);
    if (hold > 2) this._chop(t, 0.6 + hold * 0.6);
    this._khep(t, 0.6, 0.6 + hold);
    return t;
  }

  /**
   * QUAY ĐẦU về một phía và giữ: face('left') · face('right') · face(element) · face(otherRig).
   * Con vật đứng nghiêng nên chỉ có hai hướng.
   */
  face(target = 'right') {
    let side = target === 'left' ? -1 : 1;
    if (target && typeof target === 'object') {
      const box = target.getBoundingClientRect ? target.getBoundingClientRect() : null;
      const dx = (typeof target.centerX === 'function' ? target.centerX() : box.left + box.width / 2) - this.centerX();
      side = dx < 0 ? -1 : 1;
    }
    return this._khep(this.tl(), 0.3, 0, { huong: side });
  }

  /** Chạy RA khỏi khung và ẩn đi. `to`: 'right' (mặc định) hoặc 'left'. */
  exit(to = 'right', distance = null) {
    const t = this.tl(), s = this.s, dir = to === 'left' ? -1 : 1, x0 = s.x;
    let at = this._dung(t, 0);
    // Đang quay đầu về phía kia thì QUAY LẠI rồi mới chạy: bản trước cứ thế chạy sang phải — con vật đã
    // `face('left')` là đi giật lùi ra khỏi khung. Xuất phát từ chỗ đang đứng (`x0`), không phải từ giữa.
    if ((s.huong < 0 ? -1 : 1) !== dir) { t.to(s, { huong: dir, duration: 0.22, ease: 'power1.inOut' }, at); at += 0.22; }
    const far = Math.max(60, (dir * (distance > 0 ? distance : this._offstage(dir)) - x0) * dir);
    const run = this._pace(far);
    at = this._di(t, at, run.cycles, run.beat, { ra: false, quang: dir * far, x0, A: run.A, cao: run.lift });
    t.to(s, { mo: 0, duration: 0.2 }, at - 0.2);
    this._khep(t, 0.2, at, { x: x0 + dir * far, mo: 0, huong: dir });
    return t;
  }

  /* ------------------------------------------------------- động tác chung */

  idle(dur = 4) {
    const t = this.tl(), s = this.s, ck = 2.6, meo = this.nv.loai === 'cat';
    for (let a = 0; a < dur; a += ck) { const d = Math.min(ck, dur - a);
      t.to(s, { tho: 1, duration: d * 0.45, ease: 'sine.inOut' }, a).to(s, { tho: 0, duration: d * 0.55, ease: 'sine.inOut' }, a + d * 0.45); }
    for (let b = nhieu(0.5, 1.2); b < dur - 0.3; b += nhieu(1.6, 3.4)) this._chop(t, b);
    if (meo) {                                            // mèo: chóp đuôi lượn chậm
      for (let a = 0; a < dur - 0.2; a += 1.4) t.to(s, { duoiCong: (Math.round(a / 1.4) % 2 ? -0.16 : 0.16), duration: Math.min(1.4, dur - a), ease: 'sine.inOut' }, a);
    } else this._vay(t, 0, Math.max(2, Math.floor(dur / 0.55)), 7, dur / Math.max(2, Math.floor(dur / 0.55)));
    if (dur > 2.4) {                                      // giật tai một cái, liếc mắt
      const a = dur * 0.45, tai = ngauNhien() < 0.5 ? 'taiL' : 'taiR';
      const N = this.NGHI;                                  // mọi thứ trả về tư thế nghỉ của con vật, không về 0
      t.to(s, { [tai]: 0.9, duration: 0.08 }, a).to(s, { [tai]: N[tai], duration: 0.2 }, a + 0.1);
      t.to(s, { nhinX: N.nhinX + 2, dau: N.dau + 3, duration: 0.25, ease: 'power2.out' }, a + 0.4).to(s, { nhinX: N.nhinX, dau: N.dau, duration: 0.35, ease: 'power2.inOut' }, a + 1.3);
    }
    t.to(s, { duoi: this.NGHI.duoi, duoiCong: this.NGHI.duoiCong, duration: 0.2 }, dur - 0.2);
    return t;
  }

  tiltHead() {
    const t = this.tl(), s = this.s;
    t.to(s, { dau: 20, dauX: 4, taiL: 0.9, taiR: 0.6, nhinY: -0.6, cuoi: 0.2, duration: 0.3, ease: 'back.out(1.6)' }, 0);
    this._chop(t, 0.55);
    t.to(s, { dau: -14, dauX: -3, taiL: 0.5, taiR: 0.9, duration: 0.35, ease: 'power2.inOut' }, 1.0);
    this._chop(t, 1.5);
    this._khep(t, 0.4, 1.9);
    return t;
  }

  /* ------------------------------------------------ TRIỆU CHỨNG, CHĂM SÓC */

  /**
   * GÃI NGỨA: ngồi xuống, co chân sau phía người xem lên cổ gãi lia lịa `times` nhịp, đầu nghiêng về phía chân, mắt lim
   * dim — ngứa da, ve rận. Chân sau chibi ngắn không tới tai: nó gãi ở cổ, nhìn vẫn ra "gãi tai".
   */
  scratchItch(times = 8) {
    const t = this.tl(), s = this.s, nv = this.nv, C = nv.chanS;
    t.to(s, { ngoi: 1, duration: 0.3, ease: 'power2.inOut' }, 0);
    // Đích của bàn chân: cổ, ngay dưới tai — tính ở dáng NGỒI (xem _khung); khớp chân tự kéo về trong tầm với.
    const T = nv.chanT, shoulderY = Math.min(nv.S0.y, DAT - T.rong * 0.36 - 4 - 0.96 * (T.a + T.b)), neck = { x: nv.S0.x - 9 + nv.dau.dx * 0.35, y: shoulderY + nv.dau.dy * 0.45 };
    const footX = neck.x - (nv.H0.x + 52), footY = (DAT - C.rong * 0.36) - neck.y;
    t.to(s, { snX: footX, snY: footY, dau: 22, dauX: -9, dauY: 9, matY: 0.55, cuoi: 0.6, mieng: 0.25, luoi: nv.loai === 'dog' ? 0.6 : 0, taiR: -0.4, duration: 0.3, ease: 'power2.out' }, 0.2);
    for (let i = 0; i < times * 2; i++) t.to(s, { snY: footY + (i % 2 ? 10 : -8), snX: footX + (i % 2 ? -5 : 4), dau: i % 2 ? 19 : 25, duration: 0.07, ease: 'sine.inOut' }, 0.5 + i * 0.07);
    const end = 0.5 + times * 0.14;
    this._khep(t, 0.4, end);
    return t;
  }

  /**
   * ĐI KHẬP KHIỄNG: một chân trước co lên không dám chạm đất, đầu và ngực chúi xuống mỗi bước, tai cụp, đuôi rủ — đau
   * chân, xương khớp. `limp()` bước tại chỗ; `limp(4, 120)` đi thật 120 đơn vị (như `walk`).
   */
  limp(buoc = 4, quang = 0) {
    const t = this.tl(), s = this.s, x0 = s.x;
    let at = this._dung(t, 0);
    const held = s.huong < 0 ? -1 : 1, dir = quang < 0 ? -1 : quang > 0 ? 1 : held;
    if (dir !== held) { t.to(s, { huong: dir, duration: 0.22, ease: 'power1.inOut' }, at); at += 0.22; }
    t.to(s, { tnNhac: 1, tnGoc: 62, taiL: -0.7, taiR: -0.7, cuoi: -0.2, duoi: -45, matY: 0.25, duration: 0.25, ease: 'power2.out' }, at);
    const chuKy = quang ? Math.max(2, Math.round(Math.abs(quang) / 32)) : buoc / 2;
    at = this._di(t, at + 0.15, chuKy, 0.65, { quang, x0, A: 10, cao: 7, bob: 3.2 });
    this._khep(t, 0.4, at, quang ? { x: x0 + quang, huong: dir } : {});
    if (dir !== held) t.to(s, { huong: held, duration: 0.22, ease: 'power1.inOut' }, '>');
    return t;
  }

  // ĐỢT 40 C — THÚ Ở PHÒNG KHÁM: sợ run trên bàn khám, vùng vẫy trong tay người bế, lừ đừ sau thuốc mê, cào cái loa chống liếm.

  /**
   * SỢ RUN Ở PHÒNG KHÁM `hold` giây (khác `tremble`: đó là RUN — còn đây là cả DÁNG SỢ rồi mới run): thụp sát bàn, vai rụt lại, tai ép
   * hẳn ra sau, đuôi cụp giữa hai chân, mắt long lanh mở TO ngước lên, miệng hé rên khẽ, giọt mồ hôi lạnh trên đầu; cả người rung nhanh,
   * nhỏ (0,05 s một nhịp — ở 30 khung / giây là 3 khung một chu kỳ, không bị lệch pha) suốt lúc ấy. Thấy rõ ở ~1 khung / giây: thấp hơn hẳn dáng đứng, mắt to, tai ra sau.
   */
  shiverAtVet(hold = 2) {
    const t = this.tl(), s = this.s;
    const up = this._dung(t, 0);
    const pose = { truocY: 21, sauY: 24, truocX: -6, dauY: 15, dauX: -7, dau: 8, taiL: -1.9, taiR: -1.9, dongTu: 1.9, matY: -0.2, nhinY: -1.7, lanh: 1, cuoi: -1, mieng: 0.12, ...this._duoiCua('scared') };
    t.to(s, { ...pose, duration: 0.35, ease: 'power2.out' }, up);
    const from = up + 0.35;
    if (RigThu.AUTO_MARKS) markTweens(t, this.m, 'sweat', from, Math.max(0.4, hold - 0.6));
    // rung: lệch qua lại ~3 đơn vị, 0,05 s một nhịp, ngực nảy lên xuống nửa đơn vị, tai run theo
    for (let a = from, i = 0; a < from + hold - 1e-6; a += 0.05, i++) {
      const g = i % 2 ? -1 : 1;
      t.to(s, { sauX: g * 3, truocX: pose.truocX - g * 2.6, dauX: pose.dauX - g * 1.4, truocY: pose.truocY + (i % 4 < 2 ? 1 : -1), taiL: pose.taiL + g * 0.12, taiR: pose.taiR - g * 0.12, duration: 0.05, ease: 'none' }, a);
    }
    // rên khẽ: miệng hé ra khép lại chậm (0,5 s) — vẫn thấy được dưới lúc rung
    for (let a = from + 0.1, i = 0; a + 0.5 <= from + hold; a += 0.5, i++) t.to(s, { mieng: i % 2 ? 0.05 : 0.3, duration: 0.5, ease: 'sine.inOut' }, a);
    this._khep(t, 0.45, from + hold);
    return t;
  }

  /**
   * VÙNG VẪY `hold` giây: đang được BẾ (`carry` của rig người) thì bốn chân đạp trong không khí, thân vặn qua lại, đầu quay đi, miệng kêu;
   * người bế giữ chặt — hai tay lắc theo (con vật ghi `vung`, `rig-svg.js` đọc ở `_placeCarried` / `apDung` của người). Đứng dưới sàn thì
   * LẶN NGƯỜI: bàn chân đứng yên, thân và đầu ngoáy qua lại. `{ carried: true }` báo đang trong tay (tools/scene.py tự thêm; lúc dựng
   * bước, hình con vật có thể chưa nằm trong tay — như `lick`).
   */
  struggle(hold = 1.6, { carried = null } = {}) {
    const t = this.tl(), s = this.s, held = carried === null ? this.isCarried() : !!carried, dog = this.nv.loai === 'dog', cat = this.nv.loai === 'cat';
    const up = held ? 0 : this._dung(t, 0);
    t.to(s, { taiL: -1.5, taiR: -1.5, dongTu: 1.8, matY: -0.1, nhinX: -1.5, nhinY: -0.4, cuoi: -0.8, mieng: 0.5, dau: 20, dauX: -6, ...this._duoiCua('scared'), duration: 0.25, ease: 'power2.out' }, up);
    if (RigThu.AUTO_MARKS && !held) markTweens(t, this.m, '!', up, Math.max(0.4, hold - 0.6));        // trong tay người bế: dấu "!" đè lên mặt người ấy — bỏ
    const half = 0.14, n = Math.max(2, Math.round((hold - 0.25) / half));
    for (let i = 0; i < n; i++) {
      const a = up + 0.25 + i * half, g = i % 2 ? -1 : 1;
      const body = { truocX: g * 9, sauX: -g * 9, cong: i % 2 ? 0.6 : 0.05, dau: 20 + g * 18, dauX: -6 + g * 5, mieng: i % 3 ? 0.55 : 0.3, duration: half, ease: 'sine.inOut' };
      if (held) Object.assign(body, { tnNhac: 1, txNhac: 1, tnGoc: 50 + g * 45, txGoc: 50 - g * 45, snY: g > 0 ? 24 : 2, sxY: g > 0 ? 2 : 24, snX: g * 10, sxX: -g * 10, vung: g });
      else Object.assign(body, { sauX: -g * 10, truocX: g * 9 });
      if (cat) body.duoi = g * 40;
      t.to(s, body, a);
    }
    this._khep(t, 0.35, up + 0.25 + n * half);
    return t;
  }

  /**
   * LỪ ĐỪ SAU THUỐC MÊ `hold` giây: nằm (đang nằm thì giữ) hay ngồi, đầu gục xuống rồi giật lên, tai cụp, mắt hé một nửa chớp thật chậm,
   * con ngươi nhỏ, thân đung đưa chậm, dấu chóng mặt trên đầu — chưa tỉnh thuốc. Đầu rũ SÂU: đọc được ở ~1 khung / giây.
   */
  groggy(hold = 2.4) {
    const t = this.tl(), s = this.s, N = this.NGHI, dog = this.nv.loai === 'dog', lying = s.nam > 0.5;
    let at = 0;
    if (!lying) { t.to(s, { ngoi: 1, duration: 0.35, ease: 'power2.inOut' }, 0); at = 0.35; }
    const tail = dog ? { duoi: -70, duoiCong: -0.2 } : this.nv.loai === 'cat' ? { duoi: N.duoi - 30, duoiCong: 0.25 } : {};
    t.to(s, { dauY: 25, dau: 15, dauX: 5, taiL: -1.1, taiR: -1.1, matY: 0.62, nhinY: 1.4, dongTu: 0.75, cuoi: -0.2, mieng: dog ? 0.1 : 0, luoi: dog ? 0.25 : 0, ...tail, duration: 0.5, ease: 'sine.inOut' }, at);
    const from = at + 0.5;
    if (RigThu.AUTO_MARKS) markTweens(t, this.m, 'dizzy', from, Math.max(0.5, hold - 0.4));
    // gật gù: đầu sụp dần (0,9 s), giật lên một cái (0,18 s), rũ lại (0,4 s) — chu kỳ 1,5 s
    let end = from + hold + 1.2;                                // chu kỳ gật cuối có thể dài quá `hold`: khép về nghỉ SAU nó (không thì tween chồng lên `#khep`)
    for (let a = from, i = 0; a < from + hold - 0.3; a += 1.5, i++) {
      end = Math.max(end, a + 1.5);
      t.to(s, { dauY: 34, dau: 27, dauX: 6, duration: 0.9, ease: 'sine.in' }, a)
       .to(s, { dauY: 28, dau: 8, dauX: 3, duration: 0.18, ease: 'power2.out' }, a + 0.9)
       .to(s, { dauY: 25, dau: 15, dauX: 5, duration: 0.42, ease: 'sine.inOut' }, a + 1.08);
    }
    // chớp thật chậm: nhắm hẳn 0,5 s, hé lại 0,6 s — mỗi 1,3 s
    for (let a = from + 0.2; a < from + hold - 0.4; a += 1.3) t.to(s, { matY: 0.97, duration: 0.5, ease: 'sine.in' }, a).to(s, { matY: 0.62, duration: 0.6, ease: 'sine.out' }, a + 0.55);
    // đung đưa chậm (nằm: ít hơn)
    const sway = lying ? 1.6 : 3.2;
    for (let a = from, i = 0; a < from + hold; a += 0.8, i++) t.to(s, { truocX: i % 2 ? -sway : sway, sauX: i % 2 ? sway * 0.4 : -sway * 0.4, duration: 0.8, ease: 'sine.inOut' }, a);
    this._khep(t, 0.5, end);
    return t;
  }

  // Góc treo chân trước (`tnGoc`) để bàn chân chạm VÀNH loa (đợt 40 C): vành là elip 70 × 63 quanh tâm đầu, trong hệ của nhóm đầu — tính theo
  // dáng đầu và vai đã định (`pose`: truocX/Y, dau, dauX/Y), thử từng góc, lấy góc có đầu chân sát vành nhất ở NỬA DƯỚI của vành.
  _coneAngle(pose) {
    const nv = this.nv, T = nv.chanT, dai = (T.a + T.b) * 0.8, hs = nv.headScale || 1, dd = nv.dau;
    const S = { x: nv.S0.x + (pose.truocX || 0), y: nv.S0.y + (pose.truocY || 0) }, R = { x: S.x - 1, y: S.y + 4 };
    const head = { x: S.x + dd.dx + (pose.dauX || 0), y: S.y + dd.dy + (pose.dauY || 0) }, rot = -(pose.dau || 0) * RAD;
    let best = { g: 80, miss: Infinity };
    for (let g = 20; g <= 170; g += 1) {
      const tip = { x: R.x + dai * Math.sin(g * RAD), y: R.y + dai * Math.cos(g * RAD) };
      const dx = (tip.x - head.x) / hs, dy = (tip.y - head.y) / hs, px = dx * Math.cos(rot) - dy * Math.sin(rot), py = dx * Math.sin(rot) + dy * Math.cos(rot);
      const miss = Math.abs(Math.hypot(px / 70, py / 63) - 1.1) + (py < 0 ? 1 : 0);        // 1,1: đầu chân hơi NGOÀI vành — vành vẽ đè lên chân, ra ngoài một chút thì bàn chân còn thấy
      if (miss < best.miss) best = { g, miss };
    }
    return best.g;
  }

  /**
   * CÀO LOA `times` lượt (cần ĐANG ĐEO loa chống liếm — `wear('cone')` / `createPet({ wear: ['cone'] })` / sau `putCone` của người): đứng
   * dậy, giơ chân trước cào vào MÉP loa quanh đầu (ba nhát), lắc đầu lắc tai như muốn hất ra; hết `times` lượt thì bỏ cuộc — hạ chân,
   * ngồi xuống, mặt buồn, đầu gục trong cái loa — giữ gần 1,5 s rồi đứng lại.
   */
  pawAtCone(times = 3) {
    if (!(this.wearing.has('cone') || this.coneAsked || this.careLevel('petCone') > 0.5)) throw new Error('[character] pawAtCone: the pet is not wearing the cone — wear("cone") or createPet({ wear: ["cone"] }), or let a person putCone(pet) first');
    const t = this.tl(), s = this.s, N = this.NGHI, n = clamp(Math.round(times), 1, 6), rabbit = this.nv.loai === 'rabbit';
    let at = this._dung(t, 0);
    const lean = { truocY: 4, truocX: 2, dauY: 12, dauX: -4, dau: 0 }, g0 = this._coneAngle(lean);
    t.to(s, { ...lean, tnNhac: 1, tnGoc: g0, taiL: -0.5, taiR: -0.5, matY: 0.25, cuoi: -0.5, nhinY: 0.6, duration: 0.35, ease: 'power2.out' }, at);
    at += 0.35;
    for (let i = 0; i < n; i++) {
      // ba nhát cào dọc vành (chân quét lên xuống ±11°), đầu nghiêng theo
      for (let j = 0; j < 3; j++) t.to(s, { tnGoc: g0 + (j % 2 ? -16 : 16), dau: j % 2 ? -3 : 3, duration: 0.16, ease: 'sine.inOut' }, at + j * 0.16);
      at += 0.52;
      // lắc đầu: hai cú sang hai bên, tai bay theo — loa lắc cùng đầu
      for (let j = 0; j < 4; j++) t.to(s, { dau: j % 2 ? -17 : 17, dauX: lean.dauX + (j % 2 ? -4 : 4), taiL: j % 2 ? -1.3 : 0.4, taiR: j % 2 ? 0.4 : -1.3, tnGoc: g0 - 6, duration: 0.11, ease: 'sine.inOut' }, at + j * 0.11);
      t.to(s, { dau: 0, dauX: lean.dauX, tnGoc: g0, taiL: -0.5, taiR: -0.5, duration: 0.14, ease: 'sine.out' }, at + 0.44);
      at += 0.6;
    }
    // bỏ cuộc: hạ chân, ngồi, buồn
    t.to(s, { tnNhac: 0, tnGoc: 0, truocY: 0, truocX: 0, duration: 0.35, ease: 'power2.inOut' }, at);
    t.to(s, { ngoi: 1, ...RigThu.EXPRESSIONS.sad, ...this._duoiCua('sad'), dauY: 13, dau: 8, dauX: 0, duration: 0.5, ease: 'sine.inOut' }, at + 0.1);
    at += 0.6;
    t.to(s, { tho: 1, duration: 0.7, ease: 'sine.inOut' }, at + 0.1).to(s, { tho: 0, duration: 0.7, ease: 'sine.inOut' }, at + 0.8);
    if (RigThu.AUTO_MARKS) markTweens(t, this.m, 'sweat', at, 0.9);
    at += 1.5;
    this._khep(t, 0.5, at, { ngoi: s.ngoi });
    return t;
  }

  /**
   * RUN SỢ `hold` giây: thụp thấp người, tai ép ra sau, đuôi cụp giữa hai chân, mắt mở to — sợ đi khám, sợ tiếng pháo.
   * Người rung bần bật suốt lúc ấy.
   */
  tremble(hold = 2) {
    const t = this.tl(), s = this.s, N = this.NGHI, dog = this.nv.loai === 'dog';
    // Đứng dậy (mèo nghỉ ở dáng ngồi) rồi thụp xuống; đuôi CỤP: chó gỡ độ cuộn của đuôi, mèo đuôi dài thì vòng sát
    // sàn ra sau chứ không chọc xuống dưới nền.
    const up = this._dung(t, 0);
    t.to(s, { truocY: 9, sauY: 12, dauY: 9, dauX: -4, dau: 6, taiL: -1.6, taiR: -1.6, duoi: dog ? -112 : -84, duoiCong: dog ? -1.1 : 0.45, dongTu: 1.7, nhinY: -0.8, cuoi: -0.6, mieng: 0,
              duration: 0.3, ease: 'power2.out' }, up);
    // Run: lệch qua lại 1,3 đơn vị, 0,045 s một nhịp — nhanh hơn mọi nhịp thở hay bước chân, đọc ngay ra "run".
    for (let a = up + 0.3, i = 0; a < up + 0.3 + hold; a += 0.045, i++) t.to(s, { sauX: i % 2 ? -1.3 : 1.3, truocX: i % 2 ? 1 : -1, dauX: -4 + (i % 2 ? 1 : -1), duration: 0.045, ease: 'none' }, a);
    this._chop(t, up + 0.3 + hold * 0.55);
    this._khep(t, 0.45, up + 0.3 + hold, { dongTu: N.dongTu });
    return t;
  }

});
