// runtime/pet/mood.js — facial expressions, mood marks above the head, `express` / `mood`.
// Methods of `RigThu`, installed by runtime/rig-thu.js: `this` is the rig, `RigThu` its class.

import { mix } from './shared.js';
import { MARKS, markTweens, markOff } from '../marks.js';

export default (RigThu) => mix(RigThu, class {
  /* ------------------------------------------------------------ BIỂU CẢM
   * Con vật không có lông mày: cảm xúc nằm ở TAI (vểnh / cụp / ép ra sau), MẮT (híp, mở to, long lanh, nhắm tịt), CON
   * NGƯƠI (giãn khi sợ / tò mò, hẹp khi giận), MIỆNG (thè lưỡi, nhe nanh), ĐẦU (nghiêng, gục) và ĐUÔI (vẫy, rủ, cụp).
   * Bảng dưới là NÉT MẶT (giữ được qua động tác khác — xem `mood`); dáng người và nhịp (vẫy, run, nhún) do `express` thêm.
   */
  static EXPRESSIONS = {
    happy:   { taiL: 0.8, taiR: 0.8, matY: 0.45, cuoi: 1, mieng: 0.45, luoi: 0.7, dau: -4, dongTu: 1.1 },
    excited: { taiL: 1, taiR: 1, matY: 0.1, cuoi: 1, mieng: 0.6, luoi: 0.9, dau: -8, dauY: -3, dongTu: 1.35 },
    sad:     { taiL: -1.1, taiR: -1.1, matY: 0.12, nhinY: -1.3, dongTu: 1.45, lanh: 1, cuoi: -1, mieng: 0, dau: 7, dauY: 9 },
    scared:  { taiL: -1.6, taiR: -1.6, matY: -0.1, dongTu: 1.8, nhinY: -0.6, cuoi: -0.6, mieng: 0, dau: 6, dauY: 8, dauX: -4 },
    angry:   { taiL: -0.5, taiR: -0.5, matY: 0.35, dongTu: 0.5, cuoi: -0.9, mieng: 0.32, nanh: 1, dau: -4, dauY: 4 },
    curious: { taiL: 1, taiR: 0.25, matY: -0.08, dongTu: 1.55, nhinY: -0.5, cuoi: 0.25, mieng: 0, dau: 18, dauX: 4 },
    guilty:  { taiL: -1.3, taiR: -1.3, matY: 0.1, nhinY: -1.9, nhinX: 1.4, dongTu: 1.4, lanh: 0.7, cuoi: -0.6, mieng: 0, dau: 9, dauY: 12 },
    pain:    { taiL: -1.3, taiR: -1.3, matY: 1, nhan: 1, cuoi: -0.8, mieng: 0.18, dau: 5, dauY: 7 },
    sleepy:  { taiL: -0.5, taiR: -0.5, matY: 0.78, nhinY: 1, cuoi: 0, mieng: 0, dau: 5, dauY: 9 },
  };
  // Đuôi theo loài: chó đuôi ngắn cong, mèo đuôi dài — cùng một "rủ" thì góc khác nhau (xem `tremble`). Thỏ đuôi bông: bỏ.
  _duoiCua(name) {
    const dog = this.nv.loai === 'dog', N = this.NGHI;
    if (this.nv.loai === 'rabbit') return {};
    const tail = {
      sad: dog ? { duoi: -62, duoiCong: -0.3 } : { duoi: N.duoi - 30, duoiCong: 0.25 },
      scared: dog ? { duoi: -112, duoiCong: -1.1 } : { duoi: -84, duoiCong: 0.45 },
      guilty: dog ? { duoi: -50, duoiCong: -0.2 } : { duoi: N.duoi - 24, duoiCong: 0.2 },
      pain: dog ? { duoi: -55, duoiCong: -0.2 } : { duoi: N.duoi - 20 },
      angry: dog ? { duoi: 26 } : {},
      curious: dog ? { duoi: 18 } : { duoiCong: N.duoiCong + 0.35 },
    };
    return tail[name] || {};
  }

  /**
   * Làm một BIỂU CẢM `hold` giây rồi trở về: `express('happy')`, `express('sad', 2)`. Tên: happy · excited · sad ·
   * scared · angry · curious · guilty · pain · sleepy (`RigThu.EXPRESSIONS`). Đang giữ `mood` thì trở về nét mặt ấy.
   */
  express(name = 'happy', hold = 1.4, { mark = null } = {}) {
    const face = RigThu.EXPRESSIONS[name];
    if (!face) throw new Error(`[character] no pet expression "${name}" (available: ${Object.keys(RigThu.EXPRESSIONS).join(', ')})`);
    const t = this.tl(), s = this.s, N = this.NGHI, loai = this.nv.loai, dog = loai === 'dog', cat = loai === 'cat';
    const into = name === 'scared' ? 0.18 : 0.32, end = into + hold;
    let at = 0;
    // Sợ, giận, hào hứng là thế ĐỨNG (khom, cong lưng, nhún) — đang ngồi thì đứng dậy trước.
    if (['scared', 'excited'].includes(name) || (name === 'angry' && cat)) at = this._dung(t, 0);
    t.to(s, { ...face, ...this._duoiCua(name), duration: into, ease: name === 'scared' ? 'back.out(2)' : 'power2.out' }, at);
    const stop = at + end;
    if (name === 'happy') {
      if (dog) this._vay(t, at + 0.1, Math.max(2, Math.floor(hold / 0.13)), 40, hold / Math.max(2, Math.floor(hold / 0.13)));
      else if (cat) t.to(s, { duoi: N.duoi + 18, duoiCong: N.duoiCong + 0.4, duration: 0.5, ease: 'sine.inOut' }, at);                 // mèo vui: đuôi dựng, chóp cong
      this._chop(t, at + hold * 0.6);
    } else if (name === 'excited') {
      // Nhún nhảy tại chỗ, đuôi vẫy tít (chó), tai giật.
      for (let a = at + 0.1; a < stop - 0.35; a += 0.36) t.to(s, { y: -14, duration: 0.16, ease: 'power2.out' }, a).to(s, { y: 0, duration: 0.16, ease: 'power2.in' }, a + 0.16);
      if (dog) this._vay(t, at + 0.1, Math.max(2, Math.floor(hold / 0.09)), 46, hold / Math.max(2, Math.floor(hold / 0.09)));
      else if (cat) for (let a = at + 0.1, i = 0; a < stop - 0.2; a += 0.1, i++) t.to(s, { duoiCong: N.duoiCong + (i % 2 ? 0.5 : 0.3), duration: 0.1, ease: 'sine.inOut' }, a);
    } else if (name === 'sad') {
      // Một tiếng thở dài: phồng ngực, đầu trĩu xuống thêm rồi thôi; chớp chậm.
      t.to(s, { tho: 1, duration: 0.6, ease: 'sine.inOut' }, at + 0.35).to(s, { tho: 0, dauY: face.dauY + 3, duration: 0.8, ease: 'sine.inOut' }, at + 0.95);
      if (hold > 1.6) t.to(s, { matY: 0.85, duration: 0.18, ease: 'power1.in' }, at + hold * 0.7).to(s, { matY: face.matY, duration: 0.3, ease: 'power1.out' }, at + hold * 0.7 + 0.18);
    } else if (name === 'scared') {
      t.to(s, { truocY: 9, sauY: 12, duration: into, ease: 'power2.out' }, at);
      for (let a = at + into, i = 0; a < stop - 0.05; a += 0.045, i++) t.to(s, { sauX: i % 2 ? -1.3 : 1.3, truocX: i % 2 ? 1 : -1, duration: 0.045, ease: 'none' }, a);
    } else if (name === 'angry') {
      if (cat) {                                          // mèo: cong lưng, xù lông, đuôi dựng xù, há miệng khè
        t.to(s, { cong: 1, xu: 1, truocY: -5, sauY: -7, duoi: 18, duoiCong: 1.1, taiL: -2.6, taiR: -2.6, mieng: 0.75, duration: into, ease: 'back.out(2)' }, at);
      } else {                                            // chó: hạ thấp đầu, chân trước choãi, gầm gừ — đầu rung nhẹ
        t.to(s, { truocY: 5, dauY: 7, duration: into, ease: 'power2.out' }, at);
      }
      for (let a = at + into, i = 0; a < stop - 0.1; a += 0.07, i++) t.to(s, { dauX: (face.dauX || 0) + (i % 2 ? -0.9 : 0.9), duration: 0.07, ease: 'none' }, a);
    } else if (name === 'curious') {
      // Nghiêng đầu bên này rồi bên kia, tai đổi bên.
      if (hold > 1.2) t.to(s, { dau: -14, dauX: -3, taiL: 0.3, taiR: 1, duration: 0.35, ease: 'power2.inOut' }, at + hold * 0.55);
      this._chop(t, at + hold * 0.35);
    } else if (name === 'guilty') {
      // Liếc lên rồi cụp mắt xuống, đuôi vẫy khẽ dưới thấp.
      t.to(s, { nhinY: 1.2, duration: 0.3, ease: 'sine.inOut' }, at + hold * 0.45).to(s, { nhinY: face.nhinY, duration: 0.3, ease: 'sine.inOut' }, at + hold * 0.75);
      if (dog) this._vay(t, at + 0.2, Math.max(2, Math.floor((hold - 0.2) / 0.22)), 10, (hold - 0.2) / Math.max(2, Math.floor((hold - 0.2) / 0.22)), -50);
    } else if (name === 'pain') {
      // Rên khẽ: miệng mếu giật nhẹ, người co lại theo nhịp.
      for (let a = at + into + 0.1, i = 0; a < stop - 0.2; a += 0.32, i++) t.to(s, { mieng: i % 2 ? 0.18 : 0.3, truocY: i % 2 ? 2 : 4, duration: 0.16, ease: 'sine.inOut' }, a);
    } else if (name === 'sleepy') {
      // Gà gật: đầu gục dần rồi giật lên; ngáp một cái nếu còn thời gian.
      t.to(s, { dauY: face.dauY + 6, matY: 0.95, duration: Math.min(1.2, hold * 0.5), ease: 'sine.in' }, at + into)
       .to(s, { dauY: face.dauY - 1, matY: 0.6, duration: 0.18, ease: 'power2.out' }, at + into + Math.min(1.2, hold * 0.5));
      if (hold > 2) t.to(s, { mieng: 0.9, luoi: 0.3, matY: 1, duration: 0.35, ease: 'power2.out' }, at + hold * 0.7).to(s, { mieng: 0, luoi: 0, matY: face.matY, duration: 0.3, ease: 'power2.in' }, at + hold * 0.7 + 0.5);
    }
    // DẤU CẢM XÚC đi kèm (đọc được cả ở toàn cảnh, nơi nét mặt quá nhỏ): sợ "!", tò mò "?", buồn ngủ "zzz", vui tim,
    // giận gân giận, hối lỗi / đau giọt mồ hôi. `RigThu.AUTO_MARKS = false` (hay `{ mark: false }`) để tắt.
    const autoMark = { scared: '!', curious: '?', sleepy: 'zzz', happy: 'heart', excited: 'heart', angry: 'anger', guilty: 'sweat', pain: 'sweat' }[name];
    if (mark !== false && (mark || (RigThu.AUTO_MARKS && autoMark))) markTweens(t, this.m, mark || autoMark, at + 0.1, Math.max(0.3, end - 0.35));
    this._khep(t, 0.45, stop);
    return t;
  }

  /**
   * DẤU CẢM XÚC trên đầu, giữ cho tới khi tắt: `mark('!')` · `mark('?')` · `mark('heart')` · `mark('zzz')` · `mark('sweat')`
   * · `mark('anger')` · `mark('music')`; `mark(null)` tắt. Hiện song song với các động tác sau (ngủ, đi, ăn).
   */
  mark(kind = null) {
    if (kind !== null && !MARKS.includes(kind)) throw new Error(`[character] no mark "${kind}" (available: ${MARKS.join(', ')})`);
    const t = this.tl();
    if (kind) markTweens(t, this.m, kind, 0, null); else markOff(t, this.m, 0);
    t.to({}, { duration: 0.3 }, 0);
    return t;
  }
  static MARKS = MARKS;
  /** Ánh sáng trên thân (do bối cảnh 3D gọi mỗi khung): hướng sáng trên màn hình, độ tối phía khuất, màu và độ nhuốm phía sáng. */
  lightShade(dx, dy, amount, rgb, glow, dark, fill, fillAmount) { if (this.shadeEl) this.shadeEl.set(dx, dy, amount, rgb, glow, dark, fill, fillAmount); }
  /** Ánh sáng PHẢN XẠ từ sàn lên phần dưới người / con vật (bối cảnh 3D gọi mỗi khung). */
  lightBounce(rgb, amount) { if (this.shadeEl && this.shadeEl.bounce) this.shadeEl.bounce(rgb, amount); }
  static AUTO_MARKS = true;

  /**
   * GIỮ một nét mặt cho tới khi đổi: `mood('sad')` — mọi động tác sau (đi khập khiễng, nằm, ăn) khép về nét mặt ấy chứ
   * không về nét mặt nghỉ. `mood(null)` thôi giữ. Chỉ giữ nét MẶT, tai và đuôi — dáng người vẫn do từng động tác.
   * `mood('scared', { mark: '!' })`: kèm dấu cảm xúc trên đầu suốt lúc giữ; `mood(null)` tắt mọi dấu đang hiện.
   */
  mood(name = null, { mark = null } = {}) {
    if (name !== null && !RigThu.EXPRESSIONS[name]) throw new Error(`[character] no pet mood "${name}" (available: ${Object.keys(RigThu.EXPRESSIONS).join(', ')})`);
    if (!this.baseRest) this.baseRest = this.NGHI;
    const face = name ? { ...RigThu.EXPRESSIONS[name], ...this._duoiCua(name) } : {};
    // Chỉ các kênh của mặt / tai / đuôi; `dau` / `dauY` (đầu gục) giữ nhẹ hơn để còn nhìn thấy động tác.
    const keep = Object.fromEntries(Object.entries(face).filter(([key]) => !['dauX'].includes(key)).map(([key, value]) => [key, ['dau', 'dauY'].includes(key) ? value * 0.6 : value]));
    this.NGHI = Object.freeze({ ...this.baseRest, ...keep });
    this.moodName = name;
    const t = this._khep(this.tl(), 0.4, 0);
    // `{ mark: '!' }`: dấu cảm xúc giữ cùng nét mặt; `mood(null)` tắt luôn dấu do `mood` bật.
    // (Không dùng cờ "dấu do mood bật": `sequence()` gọi mỗi bước HAI lần — bản nháp rồi bản thật — cờ bị lật ở bản
    // nháp và bản thật không tắt dấu nữa; trái tim ở lại trên đầu suốt mười giây, cảnh thử đợt 13.)
    if (name && mark) markTweens(t, this.m, mark, 0, null);
    else if (!name) markOff(t, this.m, 0);
    return t;
  }
});
