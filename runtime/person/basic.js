// runtime/person/basic.js — idle, everyday gestures (wave, point, nod…), stepping in place, moods (`express`), turning, items in hand, handOver/take, drink.
// Methods of `RigSVG`, installed by runtime/rig-svg.js: `this` is the rig, `RigSVG` its class.

import { KHUNG, DOI_Y, NGHI, HONG, VAI, DAI, CHOT_VAI, KNEEL_SHIN, clamp, chuanHoaGoc, nhieu, pha, mix } from './shared.js';

export default (RigSVG) => mix(RigSVG, class {
  idle(dur = 4) {
    const t = this.tl(), s = this.s, ck = 3.2;
    for (let a = 0; a < dur; a += ck) {                // thở
      const d = Math.min(ck, dur - a);
      t.to(s, { tho: 1, duration: d * 0.45, ease: 'sine.inOut' }, a)
       .to(s, { tho: 0, duration: d * 0.55, ease: 'sine.inOut' }, a + d * 0.45);
    }
    t.to(s, { than: this.NGHI.than + 1.2, duration: dur / 2, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0);
    for (let b = nhieu(0.6, 1.2); b < dur - 0.3; b += nhieu(1.6, 3.6)) this._chop(t, b);
    if (dur > 2.5) {                                   // liếc mắt một cái
      const a = dur * 0.4;
      // Liếc rồi trả về ĐÚNG tư thế nghỉ của nhân vật, không phải về 0: nhân vật nghỉ ở dáng
      // nghiêng đầu (restPose.headTilt) mà idle trả đầu về 0 thì cứ sau một lần liếc là đầu
      // bật thẳng — và động tác không còn khép về nghỉ.
      const N = this.NGHI;
      t.to(s, { nhinX: N.nhinX + 2.6, nhinY: N.nhinY - 0.6, dau: N.dau + 1.5, duration: 0.25, ease: 'power2.out' }, a)
       .to(s, { nhinX: N.nhinX, nhinY: N.nhinY, dau: N.dau, duration: 0.35, ease: 'power2.inOut' }, a + 1.1);
    }
    return t;
  }

  /**
   * VẪY TAY CHÀO. Từng bị bỏ cùng `enter`/`exit`, nay đưa lại theo yêu cầu —
   * và nó vốn KHÔNG thuộc nhóm "di chuyển ngang": đo thì `wave` dịch ngang 0,
   * chỉ giơ tay và nghiêng người.
   */
  /**
   * MỞ NGƯỜI ra phía khán giả cho một cử chỉ tay. Cánh tay vẽ theo mặt TRƯỚC; quay nghiêng quá
   * ~0.25 thì tay giơ lên bị ép dẹt thành một vệt (dáng nghiêng chỉ hợp với tay buông / vung khi
   * bước). Nên cử chỉ nào cũng bớt quay về tối đa GESTURE_TURN trong lúc diễn — vẫn hơi hướng về
   * người đối diện — rồi `_khep` đưa về đúng hướng đang giữ.
   */
  static GESTURE_TURN = 0.3;
  static SEAT_SPLAY = 12;               // độ xoè của mỗi đùi khi ngồi (nhìn từ trước)
  _openUp(t) {
    const held = this.s.huong, limit = RigSVG.GESTURE_TURN;
    if (Math.abs(held) > limit) t.to(this.s, { huong: Math.sign(held) * limit, duration: 0.4, ease: 'sine.inOut' }, 0);
  }

  /**
   * Vào thế cho một cử chỉ tay. Cách mới (`SCREEN_AIM`): GIỮ NGUYÊN hướng đang quay và bật kênh `aim` của những tay
   * sẽ diễn — góc của chúng thành góc trên màn hình, nên dáng tay đọc được y như lúc nhìn thẳng dù thân đang ở dáng
   * 3/4. `_khep` trả `aim` về 0. Cách cũ: mở người về phía người xem (`_openUp`).
   */
  _stage(t, arms, at = 0) {
    if (!RigSVG.SCREEN_AIM) return this._openUp(t);
    for (const arm of arms) t.to(this.s, { ['aim' + arm]: 1, duration: 0.3, ease: 'sine.inOut' }, at);
  }

  /**
   * Chọn tay cho động tác đưa bàn tay lên TRƯỚC NGỰC (giơ ngón cái, đặt tay lên ngực). Đang quay mặt về một phía thì
   * đó là tay GẦN người xem — tay ở phía lưng: nó vốn nằm trước thân. Tay phía đang quay tới là tay xa, vai nó đã dồn
   * vào giữa và cả cánh tay nằm sau thân; bàn tay đưa lên ngực là khuất mất, hoặc chồng lên bàn tay kia.
   */
  _chestHand(hand = 'auto') {
    if (hand === 'L' || hand === 'R') return hand;
    const busy = (side) => this.holds[side] && this.s['item' + side] > 0.5;
    const near = this.s.huong > 0.1 ? 'L' : this.s.huong < -0.1 ? 'R' : null;
    return near && !busy(near) ? near : this._freeHand(hand);
  }

  /**
   * Vào thế cho một CÂU NÓI có cử chỉ. Tay nào diễn thì `_cuChi` tự bật `aim` theo từng cử chỉ, nên ở đây chỉ còn một
   * việc: giữ dáng 3/4 hay mở người. Giữ dáng 3/4 chỉ đẹp khi tay chủ đạo là tay Ở PHÍA đang quay mặt — nó mở về phía
   * người nghe. Tay chủ đạo là tay bên kia (vì tay phía người nghe đang cầm đồ, hoặc người gọi chỉ định) thì nó mở ra
   * SAU LƯNG; khi ấy mở người về phía khán giả như trước, để cử chỉ thành "mở ra với người xem".
   */
  _stageSpeech(t, hand = null) {
    const h = this.s.huong, busy = (side) => this.holds[side] && this.s['item' + side] > 0.5;
    const order = hand === 'L' || (hand !== 'R' && h < -0.1) ? ['L', 'R'] : ['R', 'L'], lead = order.find((side) => !busy(side));
    if (!RigSVG.SCREEN_AIM || (lead && Math.abs(h) > 0.1 && lead !== (h < 0 ? 'L' : 'R'))) this._openUp(t);
  }

  /**
   * Chọn tay cho động tác MỘT TAY. `hand`: 'L' | 'R' để chỉ định; 'auto' (mặc định) lấy tay phải,
   * trừ khi tay phải đang cầm đồ mà tay trái thì không — khi ấy dùng tay trái.
   */
  _freeHand(hand = 'auto') {
    if (hand === 'L' || hand === 'R') return hand;
    const busy = (side) => this.holds[side] && this.s['item' + side] > 0.5;
    // Đang quay mặt về một phía thì diễn bằng tay Ở PHÍA ĐÓ — tay đưa về phía người đối diện. Dùng tay kia là
    // vẫy và mở tay ra sau lưng mình.
    const toward = this.s.huong < -0.1 ? 'L' : this.s.huong > 0.1 ? 'R' : null;
    if (toward && !busy(toward)) return toward;
    return busy('R') && !busy('L') ? 'L' : 'R';
  }

  // Cả hai tay đều đang cầm đồ (và không chỉ định tay): không có tay nào để vẫy hay giơ ngón cái.
  _handsFull(hand) {
    return hand === 'auto' && ['L', 'R'].every((side) => this.holds[side] && this.s['item' + side] > 0.5);
  }
  // Chào / tán thành KHÔNG DÙNG TAY, cho nhân vật hai tay đều bận: nghiêng đầu, cười, nhướn mày
  // và gật hai nhịp. Dài đúng bằng động tác gốc (`end`) để kịch bản không lệch giờ.
  _headGesture(t, end, tilt) {
    const s = this.s, N = this.NGHI;
    t.to(s, { dau: N.dau + tilt, cuoi: 1, mieng: 0.15, mayL: 0.6, mayR: 0.6, nhinX: tilt < 0 ? 1.2 : -1.2, duration: 0.35, ease: 'back.out(1.4)' }, 0.1);
    for (let i = 0; i < 2; i++) {
      t.to(s, { dauY: 4, duration: 0.16, ease: 'power2.out' }, 0.55 + i * 0.42)
       .to(s, { dauY: 0, duration: 0.24, ease: 'power2.inOut' }, 0.71 + i * 0.42);
    }
    this._chop(t, end * 0.55);
    this._khep(t, 0.5, end - 0.5);
    return t;
  }

  wave(hand = 'auto') {
    const t = this.tl(), s = this.s;
    if (this._handsFull(hand)) return this._headGesture(t, 2.25, -7);
    const side = this._freeHand(hand), m = side === 'L' ? -1 : 1;                 // m lật các nghiêng thân / đầu
    this._stage(t, [side]);
    const handK = 'tay' + side, upperK = 'bat' + side, foreK = 'cang' + side;
    t.set(s, { [handK]: 'mo' }, 0);
    // Lấy đà NGAY TẠI tư thế nghỉ (nhích vài độ), không phải ở một dáng cố định: từ dáng đan tay mà bật về dáng
    // ấy trong 0,12 s là cẳng tay quất gần 1.800°/giây.
    t.to(s, { [upperK]: this.NGHI[upperK] - 4, [foreK]: this.NGHI[foreK] - 6, duration: 0.12, ease: 'sine.in' }, 0);
    // Giơ tay: nhanh rồi chậm dần, không nảy quá đà; cẳng tay tới sau bắp tay một nhịp.
    // Bắp tay giơ 128°, không giơ thẳng đứng: nhân vật đầu to tay ngắn (trẻ em) giơ thẳng thì bàn tay khuất sau đầu.
    // Đang ở dáng 3/4 (giữ nguyên hướng quay) thì hai vai dồn vào giữa, bàn tay vẫy rơi đúng vào mặt: ngả bắp tay ra ngoài.
    // Cẳng tay gập thêm đúng chừng ấy, để nó (và bàn tay xoè) vẫn chĩa lên như cũ — chỉ có khuỷu dời ra ngoài.
    const raise = 128 - (RigSVG.SCREEN_AIM ? Math.min(Math.abs(s.huong), 0.7) * 48 : 0), bend = 128 - raise;
    t.to(s, { [upperK]: raise, vai: -3, than: -3 * m, dau: -6 * m, nhinX: 1.5 * m, cuoi: 1, mieng: 0.15, mayL: 0.5, mayR: 0.5,
              duration: 0.5, ease: 'power2.out' }, 0.12);
    t.to(s, { [foreK]: 22 + bend, duration: 0.5, ease: 'power2.out' }, 0.16);
    // Vẫy bốn nhịp, BIÊN ĐỘ NHỎ DẦN quanh một điểm giữa; bắp tay đung đưa ngược một chút, đi sau cẳng tay —
    // vẫy đều tăm tắp giữa hai góc cố định thì giống cần gạt nước.
    const swings = [44, 8, 38, 14];
    swings.forEach((angle, i) => {
      t.to(s, { [foreK]: angle + bend, dau: (i % 2 ? -6 : -8.5) * m, duration: 0.25, ease: 'sine.inOut' }, 0.66 + i * 0.25);
      t.to(s, { [upperK]: raise + (i % 2 ? 3 : -3), duration: 0.25, ease: 'sine.inOut' }, 0.7 + i * 0.25);
    });
    this._chop(t, 0.95);
    this._khep(t, 0.55, 1.7);
    return t;
  }

  thumbsUp(hand = 'auto') {
    const t = this.tl(), s = this.s;
    if (this._handsFull(hand)) return this._headGesture(t, 2, -5);
    this._openUp(t);
    const side = this._chestHand(hand), m = side === 'L' ? -1 : 1;
    const handK = 'tay' + side, upperK = 'bat' + side, foreK = 'cang' + side;
    t.set(s, { [handK]: 'nam' }, 0);
    t.to(s, { [upperK]: -2, [foreK]: -30, duration: 0.15, ease: 'power1.in' }, 0);
    t.to(s, { [upperK]: 22, [foreK]: -140, than: -2 * m, dau: -5 * m, cuoi: 1, mieng: 0.12, mayL: 0.6, mayR: 0.6,
              duration: 0.4, ease: 'back.out(1.6)' }, 0.15);
    t.set(s, { [handK]: 'cai' }, 0.38);
    t.to(s, { dauY: 4, [foreK]: -146, duration: 0.15, ease: 'power2.out' }, 0.65)   // gật nhẹ kèm nhấn tay
     .to(s, { dauY: 0, [foreK]: -140, duration: 0.3, ease: 'power2.inOut' }, 0.8);
    this._chop(t, 1.15);
    this._khep(t, 0.5, 1.5);
    return t;
  }

  // Chỉ vào phần tử DOM (hoặc {left,top,width,height}); không có mục tiêu thì chỉ sang phải.
  static SCREEN_AIM = true;              // tắt để so sánh với cách cũ (mở người về phía người xem rồi pha trộn góc)

  // Hoành độ của vai `side` trên màn hình (viewBox) ở hướng đang quay — hai vai dồn về giữa khi quay nghiêng.
  _shoulderX(side) {
    const h = this.s.huong, ah = Math.abs(h), tuck = Math.sin(Math.PI * Math.min(1, ah)) * 8;
    let x = (side === 'L' ? -1 : 1) * (CHOT_VAI.x * (1 - ah * 0.92) + ah * 2);
    if (h > 0 && side === 'R') x -= tuck; else if (h < 0 && side === 'L') x += tuck;
    else if (ah > 0) x = (side === 'L' ? -1 : 1) * (CHOT_VAI.x * (0.08 + 0.92 * Math.cos(ah * Math.PI / 2)) + ah * 2);      // vai gần: theo cos (xem apDung)
    return HONG.x + x * this.nv.coThan;
  }

  // Tung độ của vai trên màn hình, trong hệ mà `point` tính đích (viewBox trừ `DOI_Y` và `s.y`). Hằng `VAI.y` chỉ đúng
  // cho người lớn: chân ngắn (`coChan`) thì hông tụt xuống, thân nhỏ (`coThan`) thì vai gần hông hơn — cậu bé tính
  // theo vai người lớn là chỉ thấp hơn đích cả chục độ.
  // Người HẠ XUỐNG bao nhiêu (đơn vị khung) vì ngồi (`seat`: đùi rút) và quỳ (`kneel`: ống chân rút thêm).
  _lowered() {
    const nv = this.nv, s = this.s;
    if (s.floor42e > 0 || s.squat42e > 0) return this._floorContactDrop();       // đợt 42 E: ngồi bệt / ngồi xổm — hạ đúng tới chỗ chân chạm sàn
    return DAI.dui * nv.daiDui * nv.coChan * 0.72 * clamp(s.seat, 0, 1) + DAI.ong * nv.daiOng * nv.coChan * KNEEL_SHIN * clamp(s.kneel || 0, 0, 1)
      + DAI.dui * nv.daiDui * nv.coChan * clamp(s.ride || 0, 0, 1);          // cầm lái: đùi nằm ngang — hông hạ đúng một đùi, bàn chân vẫn trên nền
  }

  _shoulderY() {
    const seatDrop = this._lowered();
    return HONG.y + this.hangChan() + seatDrop + CHOT_VAI.y * this.nv.coThan;
  }

  // HƯỚNG TAY tới một đích (rig, phần tử, { x, y } trong khung, DOMRect, hay null = ngang vai sang phải): tay nào, góc bắp
  // tay, đầu và mắt nhìn theo — dùng chung cho `point` và `shine`.
  _aimOf(muc) {
    const s = this.s, screen = RigSVG.SCREEN_AIM;
    let tx = 380, ty = 165;

    // Đích là một NHÂN VẬT / THÚ (rig): chỉ vào cái đầu của nó (thú: cả thân nếu không có đầu riêng). Bản trước chỉ nhận
    // phần tử trang hay toạ độ — truyền một rig vào thì `getBoundingClientRect` không có, mọi góc thành NaN và cả hình
    // nhân vật co rúm lại suốt động tác (tools/scene.py truyền đúng thế cho ["point", "@cat"]).
    if (muc && muc.svg && muc.el) muc = (muc.el.dau || muc.svg);
    if (muc && typeof muc.x === 'number' && typeof muc.y === 'number' && !(muc instanceof Element)) {
      tx = muc.x - s.x; ty = muc.y - s.y - DOI_Y;      // toạ độ viewBox trực tiếp
    } else if (muc) {
      if (!(muc instanceof Element) && typeof muc.left !== 'number') throw new Error('[character] point(target): target must be an element, a rig, { x, y } in the 400 × 470 frame, or a DOMRect');
      const r = muc instanceof Element ? muc.getBoundingClientRect() : muc;
      const sv = this.svg.getBoundingClientRect();
      const k = Math.min(sv.width / KHUNG.w, sv.height / KHUNG.h) || 1;   // svg chưa có kích thước → coi như 1:1
      const ox = sv.left + (sv.width - KHUNG.w * k) / 2, oy = sv.top + (sv.height - KHUNG.h * k) / 2;
      tx = (r.left + r.width / 2 - ox) / k - s.x;
      ty = (r.top + r.height / 2 - oy) / k - s.y - DOI_Y;
    }
    // Không có đích: chỉ NGANG VAI CỦA CHÍNH MÌNH về bên phải. Đích mặc định cũ nằm ở một cao độ cố định trong khung
    // (ngang vai người lớn): nhân vật trẻ con, vai thấp hơn, phải chỉ chếch lên — bàn tay chồng lên bím tóc và mép mặt.
    if (!muc) ty = (screen ? this._shoulderY() : VAI.R.y) - 6;
    // Chỉ bằng tay ở PHÍA đích; góc tính từ chỗ cái vai ấy đang nằm trên màn hình (quay nghiêng thì vai dồn vào giữa).
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) { tx = 380; ty = (screen ? this._shoulderY() : VAI.R.y) - 6; }      // đích chưa có kích thước (chưa gắn vào trang): chỉ ngang sang phải
    const ben = tx < HONG.x ? 'L' : 'R', v = screen ? { x: this._shoulderX(ben), y: this._shoulderY() } : VAI[ben];
    const goc = Math.atan2(ty - v.y, tx - v.x) * 180 / Math.PI;
    const bat = clamp(chuanHoaGoc(ben === 'L' ? goc - 90 : 90 - goc), -15, 172);
    const dau = clamp((tx - HONG.x) * 0.05, -10, 10);
    const nhinX = clamp((tx - HONG.x) * 0.02, -3, 3), nhinY = clamp((ty - 88) * 0.02, -2.5, 2.5);
    return { ben, bat, dau, nhinX, nhinY };
  }

  /**
   * RỌI ĐÈN PIN vào `target` (rig, phần tử, { x, y } trong khung, hay null = thẳng sang phải) trong `hold` giây: đèn pin hiện
   * trong tay, giơ lên rọi, giữ, rồi hạ xuống. Trong bối cảnh 3D đèn pin là một NGUỒN SÁNG đi theo bàn tay: rọi sáng người /
   * con vật ở cuối luồng (con vật nheo mắt), in một vũng sáng lên sàn và tường khi phòng tối (mất điện).
   */
  shine(muc = null, hold = 2) {
    const t = this.tl(), s = this.s, screen = RigSVG.SCREEN_AIM;
    if (!screen) this._openUp(t);
    const { ben, bat, dau, nhinX, nhinY } = this._aimOf(muc);
    const batK = 'bat' + ben, cangK = 'cang' + ben;
    // Bối cảnh 3D đọc chỗ này để nhắm lại luồng đèn ở từng khung theo góc máy lúc ấy (set3d `aimTorch`).
    this.shineAim = { target: muc, side: ben };
    t.set(s, { ['tay' + ben]: 'nam', ['gadget' + ben]: 5 }, 0.05);
    if (screen) t.to(s, { ['aim' + ben]: 1, duration: 0.3, ease: 'sine.inOut' }, 0.1);
    t.to(s, { [batK]: bat, [cangK]: 0, than: ben === 'L' ? 1.5 : -1.5, dau, nhinX, nhinY, cuoi: 0.1, chum: 0.2, duration: 0.45, ease: 'sine.out' }, 0.05);
    // Lia đèn nhè nhẹ quanh đích — tay người cầm đèn không đứng yên như giá đỡ.
    t.to(s, { [batK]: bat + 4, duration: hold * 0.3, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.5);
    this._khep(t, 0.45, 0.5 + hold);
    return t;
  }

  point(muc = null) {
    const t = this.tl(), s = this.s, screen = RigSVG.SCREEN_AIM;
    if (!screen) this._openUp(t);
    const { ben, bat, dau, nhinX, nhinY } = this._aimOf(muc);
    const tay = 'tay' + ben, batK = 'bat' + ben, cangK = 'cang' + ben;

    t.set(s, { [tay]: 'nam' }, 0);
    if (screen) t.to(s, { ['aim' + ben]: 1, duration: 0.3, ease: 'sine.inOut' }, 0.1);        // góc chỉ là góc trên màn hình, giữ nguyên hướng đang quay
    t.to(s, { [batK]: -3, [cangK]: -35, duration: 0.15, ease: 'power1.in' }, 0);          // rút tay lấy đà
    t.to(s, { [batK]: bat, [cangK]: 0, than: ben === 'L' ? 2.5 : -2.5, vai: bat > 90 ? -3 : 0,
              dau, nhinX, nhinY, cuoi: 0.6, mieng: 0.2, mayL: 0.5, mayR: 0.5,
              duration: 0.4, ease: 'back.out(1.3)' }, 0.15);
    t.set(s, { [tay]: 'chi' }, 0.3);
    t.to(s, { [cangK]: ben === 'L' ? 4 : 4, dauY: 3, duration: 0.18, ease: 'power2.out' }, 0.75)   // nhấn "kia kìa"
     .to(s, { [cangK]: 0, dauY: 0, duration: 0.25, ease: 'power2.inOut' }, 0.93);
    this._khep(t, 0.55, 1.5);
    return t;
  }

  present() {
    const t = this.tl(), s = this.s;
    // Tay đang cầm đồ thì đứng yên; tay còn lại diễn một mình.
    const arms = ['L', 'R'].filter((side) => !(this.holds[side] && s['item' + side] > 0.5));
    this._stage(t, arms);
    const pose = (values) => Object.fromEntries(arms.flatMap((side) => [['bat' + side, values[side][0]], ['cang' + side, values[side][1]]]));
    t.set(s, Object.fromEntries(arms.map((side) => ['tay' + side, 'mo'])), 0);
    t.to(s, { ...pose({ L: [8, -75], R: [8, -75] }), dauY: 1, duration: 0.25, ease: 'power2.in' }, 0); // gom trước ngực
    // Mở hai tay ra, CẲNG TAY NÂNG LÊN, lòng bàn tay ngửa — dáng "xin mời / đây ạ". Bản trước dang cả cánh tay chếch
    // xuống (bắp 62–72°, cẳng −22°): lòng bàn tay úp, trông như dáng chữ A lúc kiểm tra rig.
    t.to(s, { ...pose({ L: [40, 72], R: [46, 76] }), than: 2, dau: 6, dauX: 3,
              mayL: 0.7, mayR: 0.7, cuoi: 0.9, mieng: 0.3, nhinX: 1.5,
              duration: 0.5, ease: 'back.out(1.2)' }, 0.25);                       // mở ra
    const lead = arms.includes('R') ? 'R' : arms[0];
    t.to(s, { ...(lead ? { ['bat' + lead]: 54, ['cang' + lead]: 84 } : {}), dau: 8, duration: 0.3, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.95); // nhấn
    this._chop(t, 1.2);
    this._khep(t, 0.55, 1.65);
    return t;
  }

  nod() {
    const t = this.tl(), s = this.s, N = this.NGHI;
    t.to(s, { cuoi: 0.7, mayL: 0.3, mayR: 0.3, duration: 0.2 }, 0);
    for (let i = 0; i < 2; i++) {
      const a = i * 0.5;
      // Gật đủ sâu để THẤY ở cỡ toàn thân, vai và thân chúi theo: 8 đơn vị là chưa tới bốn điểm ảnh trong khung 720p.
      t.to(s, { dauY: 15, dau: N.dau + 1.5, nhinY: 2, than: N.than + 2.2, vai: N.vai + 2.5, duration: 0.2, ease: 'power2.out' }, a)
       .to(s, { dauY: 0, dau: N.dau, nhinY: 0, than: N.than, vai: N.vai, duration: 0.3, ease: 'power2.inOut' }, a + 0.2);
    }
    this._chop(t, 0.55);
    this._khep(t, 0.35, 1.05);
    return t;
  }

  shake() {
    const t = this.tl(), s = this.s;
    t.to(s, { cuoi: -0.1, mieng: 0, mayL: -0.4, mayR: -0.4, duration: 0.2 }, 0);
    const bien = [-16, 16, -13, 10, -5];           // lắc đủ rộng để thấy ở cỡ toàn thân
    bien.forEach((d, i) => {
      t.to(s, { dauX: d, dau: -d * 0.4, nhinX: -d * 0.3, duration: 0.18, ease: 'sine.inOut' }, i * 0.18);
    });
    t.to(s, { dauX: 0, dau: 0, nhinX: 0, duration: 0.2, ease: 'power2.out' }, bien.length * 0.18);
    this._khep(t, 0.35, 1.15);
    return t;
  }

  /**
   * REO MỪNG: hai tay giơ cao, nhún lên hai lần, mặt rạng rỡ. Động tác toàn thân duy nhất để tỏ ra
   * vui — nét mặt và ngón cái thì quá nhỏ trong cảnh toàn. Đang ngồi thì chỉ giơ tay, không nhún.
   * Tay nào đang cầm đồ thì giữ nguyên, chỉ tay kia giơ lên.
   * `{ narrow: true }` — REO HẸP cho khung dọc (đợt 34): hai nắm tay giơ lên cạnh vai, khuỷu sát thân, đấm nhẹ lên hai
   * nhịp ("yes!"), thay cho chữ V dang rộng — bề ngang chỉ cỡ cái đầu, nên góc trung khung dọc giữ được cả hai tay.
   */
  cheer({ narrow = false } = {}) {
    const t = this.tl(), s = this.s;
    this._openUp(t);
    const busy = (side) => this.holds[side] && s['item' + side] > 0.5;
    const up = {};
    // Giơ thành chữ V mở rộng, không giơ thẳng đứng: đầu chibi to hơn tầm với của tay (nhất là trẻ em),
    // giơ thẳng thì hai tay khuất sau đầu hoặc trông như đang bịt tai. Bản hẹp: cánh tay 70° ra ngoài, cẳng tay gập
    // thêm 108° — cẳng tay gần thẳng đứng, nắm tay ngang cằm, không che mặt.
    const [upper, fore, pump] = narrow ? [70, 108, 14] : [122, 6, 26];
    for (const side of ['L', 'R']) if (!busy(side)) { up['bat' + side] = upper; up['cang' + side] = fore; }
    t.set(s, Object.fromEntries(['L', 'R'].filter((side) => !busy(side)).map((side) => ['tay' + side, narrow ? 'nam' : 'xoe'])), 0);
    t.to(s, { ...Object.fromEntries(Object.keys(up).map((key) => [key, key.startsWith('bat') ? -4 : 24])), dauY: 3, duration: 0.14, ease: 'power1.in' }, 0);     // lấy đà
    t.to(s, { ...up, vai: -5, dau: -3, dauY: 0, cuoi: 1, mieng: 0.55, mayL: 0.9, mayR: 0.9, duration: 0.36, ease: 'back.out(1.6)' }, 0.14);
    const hop = s.seat > 0.5 ? 0 : -16;                                            // y âm là lên
    for (let i = 0; i < 2; i++) {
      t.to(s, { y: hop, duiL: 0, duiR: 0, duration: 0.17, ease: 'power2.out' }, 0.42 + i * 0.42)
       .to(s, { y: 0, duration: 0.2, ease: 'power2.in' }, 0.59 + i * 0.42);
      for (const key of Object.keys(up).filter((name) => name.startsWith('cang'))) t.to(s, { [key]: narrow ? fore + pump : pump, duration: 0.17, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.42 + i * 0.42);
    }
    this._chop(t, 0.9);
    this._khep(t, 0.5, 1.4, { y: 0 });
    return t;
  }

  shrug() {
    const t = this.tl(), s = this.s;
    this._openUp(t);
    t.set(s, { tayL: 'mo', tayR: 'mo' }, 0);
    t.to(s, { vai: 2, batL: 4, batR: 4, duration: 0.15, ease: 'power1.in' }, 0);    // hạ vai lấy đà
    t.to(s, { vai: -9, batL: 38, batR: 38, cangL: 112, cangR: 112, dau: 7, dauX: 2,
              mayL: 1, mayR: 1, cuoi: -0.4, mieng: 0.06, nhinX: 1, nhinY: -1,
              duration: 0.4, ease: 'back.out(1.5)' }, 0.15);
    t.to(s, { vai: -7, dau: 5, duration: 0.55, ease: 'sine.inOut' }, 0.6);           // giữ, buông nhẹ
    this._chop(t, 0.9);
    this._khep(t, 0.5, 1.2);
    return t;
  }

  // Một nhịp dậm chân nhìn từ phía trước: gối `ben` nhấc lên rồi đặt xuống, tay vung ngược.
  _dam(t, at, h, ben, tay = 1, goiCao = 1, arms = null) {
    const s = this.s, L = ben === 'L';
    const goi = L ? 'nhacL' : 'nhacR';
    t.to(s, { [goi]: goiCao, y: -5 * goiCao, than: (L ? 2 : -2) * goiCao, dauY: -1, duration: h * 0.5, ease: 'power2.out' }, at);
    t.to(s, { [goi]: 0, y: 0, dauY: 1.5, duration: h * 0.5, ease: 'power2.in' }, at + h * 0.5);
    // Tay đối diện ra trước, tay cùng bên ra sau — đổi chiều mượt suốt cả nhịp, hơi trễ so với chân.
    t.to(s, { vungL: (L ? -1 : 1) * tay, vungR: (L ? 1 : -1) * tay, vai: -tay,
              duration: h * 0.9, ease: 'sine.inOut' }, at + h * 0.1);
    // `vung` chỉ thấy khi quay nghiêng. NHÌN THẲNG thì tay đánh là cẳng tay gập lên trước ngực (tay đối diện với
    // chân đang nhấc) rồi duỗi xuống — thiếu phần này thì march, stroll và stepInPlace trông y hệt nhau.
    if (arms) for (const side of ['L', 'R']) {
      if (this.holds[side] && s['item' + side] > 0.5) continue;                // tay cầm đồ đứng yên
      const [upper, fore] = side === ben ? arms.back : arms.front;
      t.to(s, { ['bat' + side]: upper, ['cang' + side]: fore, duration: h * 0.9, ease: 'sine.inOut' }, at + h * 0.1);
    }
    return at + h;
  }

  // Dậm chân tại chỗ (nhìn thẳng), tạo cảm giác đang bước.
  march(buoc = 6) {
    const t = this.tl(), h = 0.38;
    let at = 0;
    t.set(this.s, { tayL: 'nam', tayR: 'nam' }, 0);
    t.to(this.s, { cuoi: 0.6, mayL: 0.3, mayR: 0.3, duration: 0.2 }, 0);
    // Đều bước: nắm tay, cẳng tay đánh cao trước ngực.
    for (let i = 0; i < buoc; i++) at = this._dam(t, at, h, i % 2 ? 'R' : 'L', 1, 1, { front: [22, -78], back: [5, -10] });
    this._khep(t, 0.4, at);
    return t;
  }

  // Bước tại chỗ thong thả: gối nhấc vừa, tay chỉ đung đưa nhẹ theo quán tính.
  stroll(buoc = 6) {
    const t = this.tl(), h = 0.54;
    let at = 0;
    t.to(this.s, { cuoi: 0.45, duration: 0.25 }, 0);
    for (let i = 0; i < buoc; i++) at = this._dam(t, at, h, i % 2 ? 'R' : 'L', 0.3, 0.5, { front: [15, -20], back: [7, -4] });      // tay buông, đung đưa nhẹ; gối nhấc thấp, nhịp chậm
    this._khep(t, 0.4, at);
    return t;
  }

  // Dậm chân tại chỗ mà không đánh tay (tay buông thõng, chỉ hơi rung theo nhịp).
  stepInPlace(buoc = 6) {
    const t = this.tl(), h = 0.42;
    let at = 0;
    for (let i = 0; i < buoc; i++) at = this._dam(t, at, h, i % 2 ? 'R' : 'L', 0, 0.85);
    this._khep(t, 0.35, at);
    return t;
  }

  // Đi thẳng về phía người xem: bắt đầu nhỏ và ở xa (cao hơn trên sân), vừa dậm chân vừa lớn dần.
  walkForward(buoc = 8) {
    const t = this.tl(), s = this.s, h = 0.38, T = buoc * h;
    t.set(s, { co: 0.42, y: -150, mo: 0, tayL: 'nam', tayR: 'nam' }, 0);
    t.to(s, { mo: 1, duration: 0.3 }, 0);
    t.to(s, { co: 1, y: 0, duration: T, ease: 'power1.in' }, 0);     // càng gần càng lớn nhanh (phối cảnh)
    t.to(s, { cuoi: 0.7, duration: 0.3 }, 0);
    let at = 0;
    for (let i = 0; i < buoc; i++) at = this._dam(t, at, h, i % 2 ? 'R' : 'L');
    this._khep(t, 0.45, at);
    return t;
  }

  // Đi ra xa: quay lưng (giấu mặt bằng cách tắt nét mặt không cần — đơn giản là nhỏ dần) rồi mờ đi.
  walkAway(buoc = 8) {
    const t = this.tl(), s = this.s, h = 0.38, T = buoc * h;
    t.set(s, { tayL: 'nam', tayR: 'nam' }, 0);
    t.to(s, { co: 0.4, y: -150, duration: T, ease: 'power1.out' }, 0);
    t.to(s, { mo: 0, duration: 0.35 }, T - 0.35);
    let at = 0;
    for (let i = 0; i < buoc; i++) at = this._dam(t, at, h, i % 2 ? 'R' : 'L');
    this._khep(t, 0.3, at, { co: 0.4, y: -150, mo: 0 });        // khép tư thế nhưng vẫn ở xa và ẩn
    return t;
  }

  /* ------------------------------------------------- biểu cảm · quay · ngồi */

  // Nét mặt dựng sẵn. Mỗi mục là các kênh trạng thái ở đỉnh biểu cảm; `eyesClosed` âm là
  // mở mắt TO hơn bình thường.
  static EXPRESSIONS = {
    happy:     { cuoi: 1, mieng: 0.5, mayL: 0.55, mayR: 0.55, matY: 0.18, dau: -3, dauY: -1 },
    sad:       { cuoi: -0.85, mieng: 0, mayL: 0.75, mayR: 0.75, matY: 0.3, dau: 5, dauY: 5, nhinY: 1.6, vai: 3 },
    surprised: { cuoi: 0, mieng: 0.72, chum: 0.6, mayL: 1, mayR: 1, matY: -0.16, dauY: -3, vai: -3 },
    angry:     { cuoi: -0.6, mieng: 0.12, mayL: -0.9, mayR: -0.9, matY: 0.22, dau: 0, dauY: 2, than: 1.5 },
    thinking:  { cuoi: 0.1, mieng: 0, chum: 0.25, mayL: 0.7, mayR: -0.2, nhinX: 2.2, nhinY: -1.8, dau: 6, dauX: 2 },
    laughing:  { cuoi: 1, mieng: 0.85, mayL: 0.75, mayR: 0.75, matY: 0.6, dau: -4, dauY: -2, vai: -2 },        // mắt híp, miệng há
    worried:   { cuoi: -0.5, mieng: 0.14, mayL: 0.95, mayR: 0.95, matY: 0.06, dau: 3, dauY: 2, nhinY: 0.6, vai: 2 },
    confused:  { cuoi: -0.15, mieng: 0.08, mayL: 0.9, mayR: -0.45, dau: -8, dauX: -2, nhinX: -1.6, nhinY: -0.8 },  // một mày nhướn, đầu nghiêng
    tired:     { cuoi: -0.3, mieng: 0, mayL: 0.15, mayR: 0.15, matY: 0.5, dau: 4, dauY: 6, nhinY: 1.2, vai: 4 },   // mắt sụp, vai xệ
    crying:    { cuoi: -0.9, mieng: 0.4, chum: 0.2, mayL: 0.95, mayR: 0.95, matY: 0.7, dau: 3, dauY: 5, vai: 4, khoc: 1 },   // mắt nhắm tịt, miệng mếu, nước mắt
    embarrassed: { cuoi: 0.35, mieng: 0.04, mayL: 0.7, mayR: 0.7, matY: 0.15, dau: 6, dauY: 3, nhinX: 1.6, nhinY: 1, doMa: 1, moHoi: 1 },   // cười ngượng, liếc đi, má đỏ, giọt mồ hôi
    sleepy:    { cuoi: 0, mieng: 0, mayL: 0.1, mayR: 0.1, matY: 0.72, dau: 6, dauY: 7, nhinY: 1, vai: 3 },              // mắt díp, đầu gục, ngáp
  };

  /**
   * Làm một BIỂU CẢM rồi trở về: `express('happy')`, `express('sad', 2)`.
   * Tên hợp lệ: happy · sad · surprised · angry · thinking. `hold` = số giây giữ nét mặt.
   */
  express(name = 'happy', hold = 1.2) {
    const face = RigSVG.EXPRESSIONS[name];
    if (!face) throw new Error(`[character] no expression "${name}" (available: ${Object.keys(RigSVG.EXPRESSIONS).join(', ')})`);
    const t = this.tl(), s = this.s, into = name === 'surprised' ? 0.16 : 0.32, N = this.NGHI;
    t.to(s, { ...face, duration: into, ease: name === 'surprised' ? 'back.out(2.2)' : 'power2.out' }, 0);
    // THÂN NGƯỜI cùng diễn: chỉ đổi nét mặt trên một thân đứng im thì nhìn như dán mặt nạ lên tượng.
    const standing = s.seat < 0.5, free = ['L', 'R'].filter((side) => !(this.holds[side] && s['item' + side] > 0.5));
    const arm = (side, upper, fore, at, d, ease = 'power2.out') => t.to(s, { ['bat' + side]: upper, ['cang' + side]: fore, duration: d, ease }, at);
    if (name === 'happy') {                                   // nhún người một cái, vai nhấc
      // Nhún đủ cao để THẤY ở cỡ toàn thân (7 đơn vị là ba điểm ảnh trong khung 720p — không ai thấy), rồi lắc đầu một nhịp.
      if (standing) t.to(s, { y: -15, duration: 0.18, ease: 'power2.out' }, 0.05).to(s, { y: 0, duration: 0.2, ease: 'power2.in' }, 0.23);
      if (standing && into + hold >= 0.7) t.to(s, { y: -6, duration: 0.12, ease: 'power2.out' }, 0.43).to(s, { y: 0, duration: 0.14, ease: 'power2.in' }, 0.55);      // nhịp nảy thứ hai, chỉ khi còn kịp trước lúc khép
      t.to(s, { vai: -5, duration: 0.2, ease: 'power2.out' }, 0.05).to(s, { vai: -1, duration: 0.4, ease: 'sine.inOut' }, 0.3);
      if (into + hold >= 1.06) t.to(s, { dau: face.dau + 7, duration: 0.3, ease: 'sine.inOut' }, 0.45).to(s, { dau: face.dau, duration: 0.3, ease: 'sine.inOut' }, 0.75);
    } else if (name === 'surprised') {                        // giật mình: người bật lên, hai tay bung ra
      if (standing) t.to(s, { y: -5, duration: 0.12, ease: 'power2.out' }, 0).to(s, { y: 0, duration: 0.25, ease: 'power2.inOut' }, 0.12);
      for (const side of free) { t.set(s, { ['tay' + side]: 'mo' }, 0); arm(side, 26, 30, 0, into + 0.06, 'back.out(1.8)'); }
    } else if (name === 'thinking' && free.length) {          // đưa tay lên cằm
      const side = this._freeHand();
      if (free.includes(side)) { t.set(s, { ['tay' + side]: 'mo' }, 0.05); arm(side, 34, -146, 0.05, 0.45, 'power2.inOut'); }
    } else if (name === 'angry') {                            // nắm tay, tay gồng xuống
      for (const side of free) { t.set(s, { ['tay' + side]: 'nam' }, 0.1); arm(side, 16, -8, 0, 0.3); }
      t.to(s, { vai: -3, duration: 0.3, ease: 'power2.out' }, 0);
    } else if (name === 'tired') {                            // thở dài: phồng ngực rồi xệ vai
      t.to(s, { tho: 1, duration: 0.45, ease: 'sine.inOut' }, 0).to(s, { tho: 0, vai: face.vai + 2, dauY: face.dauY + 2, duration: 0.6, ease: 'sine.inOut' }, 0.45);
      for (const side of free) arm(side, N['bat' + side] - 3, Math.abs(N['cang' + side]) > 40 ? N['cang' + side] : -6, 0.4, 0.6, 'sine.inOut');
    } else if (name === 'sad') {
      t.to(s, { than: N.than + 1.5, duration: 0.5, ease: 'sine.inOut' }, 0);
    } else if (name === 'crying') {                           // nấc: vai giật lên theo nhịp, nước mắt chảy xuống má
      const sobs = Math.max(2, Math.round(hold / 0.45));
      for (let n = 0; n < sobs; n++) t.to(s, { vai: face.vai - 4, dauY: face.dauY - 2, duration: 0.14, ease: 'power2.out' }, into + n * 0.45).to(s, { vai: face.vai, dauY: face.dauY, duration: 0.3, ease: 'sine.inOut' }, into + n * 0.45 + 0.14);
      t.fromTo(s, { khocY: 0 }, { khocY: 1, duration: Math.max(0.6, hold * 0.8), ease: 'power1.in', immediateRender: false }, into);
    } else if (name === 'sleepy') {                           // ngáp: miệng há to, mắt nhắm, rồi gật gù
      // Ngáp phải GIỮ miệng há đủ lâu (≈ 1,1 s) mới đọc được — há 0,5 s rồi khép thì người xem chỉ thấy một nét miệng.
      t.to(s, { mieng: 1, chum: 0.45, matY: 1, tho: 1, dauY: face.dauY - 6, vai: face.vai - 4, duration: 0.45, ease: 'sine.inOut' }, into)
       .to(s, { mieng: 0, chum: 0, matY: face.matY, tho: 0, dauY: face.dauY, vai: face.vai, duration: 0.45, ease: 'sine.inOut' }, into + 1.55);
      if (hold > 2.4) t.to(s, { dauY: face.dauY + 12, dau: face.dau + 5, duration: 0.45, ease: 'sine.in', yoyo: true, repeat: 1 }, into + 2.05);      // gật gù
    }
    if (name === 'laughing') {
      // Rung người vì cười: vai và đầu nảy theo nhịp, thân ngả nhẹ ra sau. Bản trước chỉ nảy 4 đơn vị — đo trên phim
      // 720p là một điểm ảnh, nhìn như ảnh tĩnh.
      const beats = Math.max(1, 2 * Math.round(hold / 0.3) - 1);
      t.to(s, { dauY: face.dauY + 9, vai: face.vai + 7, tho: 1, duration: 0.13, ease: 'sine.inOut', yoyo: true, repeat: beats }, into);
      if (standing) t.to(s, { y: -4, duration: 0.13, ease: 'sine.inOut', yoyo: true, repeat: beats }, into);
    }
    else if (!['surprised', 'crying', 'sleepy'].includes(name) && hold > 0.8) { this.blinkTo = face.matY || 0; this._chop(t, into + hold * 0.5); this.blinkTo = 0; }      // ngạc nhiên thì không chớp mắt
    this._khep(t, 0.4, into + hold);
    return t;
  }

  /**
   * QUAY NGƯỜI sang một bên (dáng 3/4), giữ, rồi quay lại nhìn thẳng.
   * `direction`: 'right' | 'left'. `amount` 0…1 — 0.55 là nghiêng 3/4, 1 là nghiêng hẳn.
   */
  turn(direction = 'right', hold = 1.5, amount = 0.55) {
    const t = this.tl(), s = this.s, side = direction === 'left' ? -1 : 1;
    t.to(s, { huong: side * clamp(amount, 0, 1), nhinX: side * 1.2, duration: 0.4, ease: 'power2.inOut' }, 0);
    if (hold > 1) this._chop(t, 0.4 + hold * 0.5);
    this._khep(t, 0.4, 0.4 + hold);
    return t;
  }

  /**
   * Hoành độ TÂM nhân vật trên màn hình (px), tính cả quãng đã `walk` / `enter` — khung SVG thì
   * đứng yên, nhân vật dịch chuyển bên trong nó.
   */
  centerX() {
    const frame = this.svg.getBoundingClientRect();
    const scale = Math.min(frame.width / KHUNG.w, frame.height / KHUNG.h) || 1;
    return frame.left + frame.width / 2 + this.s.x * scale;
  }

  /**
   * QUAY MẶT về một phía và GIỮ hướng đó cho các động tác sau.
   *   face('left') · face('right') · face('front')        theo tên
   *   face(element) · face(otherRig)                      quay về phía phần tử / nhân vật ấy
   * `amount` 0…1 — 0.55 là nghiêng 3/4 (mặc định), 1 là nghiêng hẳn.
   */
  face(target = 'right', amount = 0.55) {
    let side = target === 'left' ? -1 : target === 'front' ? 0 : 1;
    if (target && typeof target === 'object') {
      // Phần tử DOM hoặc một rig khác: so tâm của nó với tâm của mình trên màn hình.
      const box = target.getBoundingClientRect ? target.getBoundingClientRect() : null;
      const dx = (typeof target.centerX === 'function' ? target.centerX() : box.left + box.width / 2) - this.centerX();
      side = Math.abs(dx) < 1 ? 0 : dx < 0 ? -1 : 1;
    }
    const t = this.tl(), s = this.s, to = side * clamp(amount, 0, 1);
    t.to(s, { nhinX: side * 1.6, duration: 0.2, ease: 'power2.out' }, 0);          // mắt đi trước
    this._khep(t, 0.4, 0.05, { huong: to });
    return t;
  }

  /** CẤT đồ vật đang cầm ở tay `side` ('L' | 'R' | 'both'); nó vẫn ẩn qua các động tác sau. */
  hideItem(side = 'R') { return this._toggleItem(side, 0); }
  /** LẤY RA lại đồ vật đã cất. */
  showItem(side = 'R') { return this._toggleItem(side, 1); }
  _toggleItem(side, value) {
    const t = this.tl(), s = this.s, keep = {};
    if (side !== 'R') keep.itemL = value;
    if (side !== 'L') keep.itemR = value;
    // Tay nào thật sự đổi trạng thái (đang cầm mà cất, đang cất mà lấy ra). Không có tay nào thì chỉ ghi trạng thái.
    const acting = (side === 'both' ? ['L', 'R'] : [side]).filter((k) => this.holds[k] && (s['item' + k] > 0.5) !== (value > 0.5));
    if (!acting.length) return this._khep(t, 0.25, 0, keep);
    // CÓ ĐỘNG TÁC: bàn tay đưa xuống cạnh hông, hơi ra sau — món đồ mờ đi (hoặc hiện ra) Ở ĐÓ — rồi tay về dáng nghỉ
    // (buông lỏng nếu vừa cất, dáng cầm nếu vừa lấy). Bản trước món đồ mờ đi ngay giữa ngực trong 0,25 s.
    for (const k of acting) {
      if (value > 0.5) t.set(s, { ['tay' + k]: 'nam' }, 0);
      t.to(s, { ['bat' + k]: -12, ['cang' + k]: -4, ['carry' + k]: 0, duration: 0.3, ease: 'power2.inOut' }, 0);
      t.to(s, { ['item' + k]: value, duration: 0.13 }, 0.22);
    }
    t.to(s, { dauY: 2.5, nhinY: 1.2, duration: 0.3, ease: 'sine.inOut' }, 0);            // liếc xuống theo tay
    this._khep(t, 0.38, 0.36, keep);
    return t;
  }

  /**
   * CHO nhân vật một món đồ để cầm ở tay `side` ('L' | 'R'): `draw(p, colours, definition)` trả về SVG trong hệ cổ tay
   * (như `heldItemL/R`). `shown: false` = có món đồ nhưng đang cất — để `take()` nhận nó từ người khác, hay `showItem()`
   * lấy nó ra. Tay ấy nghỉ ở dáng bưng đồ khi món đồ đang hiện.
   */
  setItem(side, draw, { shown = true } = {}) {
    if (side !== 'L' && side !== 'R') throw new Error(`[character] setItem(side, …): side must be 'L' or 'R', got ${JSON.stringify(side)}`);
    if (typeof draw !== 'function') throw new Error('[character] setItem(side, draw): draw must be a function returning SVG');
    this.nv = { ...this.nv, ['heldItem' + side]: draw };
    const carry = { ['bat' + side]: 14, ['cang' + side]: -85, ['tay' + side]: 'nam' };
    // Tay PHẢI vẽ ở lớp trên tay trái. Nhân vật nghỉ ở dáng đan tay trước bụng mà cầm đồ bằng tay TRÁI thì bàn tay phải
    // đang nghỉ nằm đè lên mặt trước món đồ. Cho tay phải rảnh ấy buông xuôi. (Cầm tay phải thì bàn tay trái nằm SAU
    // món đồ, đọc thành tay đỡ — để nguyên.)
    const free = side === 'L' && !this.holds.R && this.NGHI.cangR < -40 ? { batR: NGHI.batR, cangR: NGHI.cangR, tayR: 'mo' } : {};
    this.NGHI = Object.freeze({ ...this.NGHI, ...carry, ...free, ['item' + side]: shown ? 1 : 0 });
    this._dungLai();
    Object.assign(this.s, free, shown ? carry : { ['bat' + side]: NGHI['bat' + side], ['cang' + side]: NGHI['cang' + side], ['tay' + side]: 'mo' }, { ['item' + side]: shown ? 1 : 0 });
    this.apDung();
    return this;
  }

  // Người / vật kia ở bên nào: −1 trái, +1 phải. `target`: rig, phần tử, 'left' | 'right', hoặc bỏ trống (phía của tay `side`).
  _towards(target, side) {
    if (target === 'left') return -1;
    if (target === 'right') return 1;
    if (target && typeof target.centerX === 'function') { const dx = target.centerX() - this.centerX(); if (Math.abs(dx) > 1) return dx < 0 ? -1 : 1; }
    else if (target && target.getBoundingClientRect) { const box = target.getBoundingClientRect(), dx = box.left + box.width / 2 - this.centerX(); if (Math.abs(dx) > 1) return dx < 0 ? -1 : 1; }
    return side === 'L' ? -1 : 1;
  }
  // Dáng VƯƠN TAY đưa / nhận đồ về phía `dir`: tay cùng phía thì cẳng tay mở ra ngoài; tay khác phía thì đưa ngang qua trước bụng.
  // Có người kia (rig / mỏ neo): tay CÙNG PHÍA nhắm tới ĐIỂM GẶP giữa hai vai như bắt tay (`_meetAngles`) — dáng cố định
  // [44°, 56°] chỉ đưa bàn tay ra ngang bụng, cách tay người nhận 20 % chiều cao (đo bằng tools/acting_check.py, đợt 29).
  _reach(t, side, dir, at, target = null) {
    const s = this.s, N = this.NGHI, own = (side === 'R') === (dir > 0), aimed = own && target ? this._meetAngles(target, side, 0.5) : null;
    const [upper, fore] = aimed ? [aimed.bat, aimed.cang] : own ? [44, 56] : [28, -124];
    t.to(s, { ['bat' + side]: upper, ['cang' + side]: fore, than: N.than - dir * 4, dau: N.dau + dir * 3, nhinX: dir * 1.6, cuoi: 0.8, mayL: 0.4, mayR: 0.4,
              duration: 0.42, ease: 'power2.out' }, at);
  }

  /**
   * ĐƯA món đồ đang cầm cho người khác: vươn tay về phía `target`, món đồ rời tay, tay buông về nghỉ. Món đồ ở lại
   * trạng thái "đã cất" (như sau `hideItem`). Ghép với `take()` của người nhận trong cùng một nhịp:
   *   conversation([{ together: [[barista, ['handOver', granny]], [granny, ['take', barista]]] }])
   */
  handOver(target = null, side = 'auto') {
    const s = this.s, held = ['R', 'L'].filter((k) => this.holds[k] && s['item' + k] > 0.5), k = side === 'auto' ? held[0] : side;
    if (!k || !held.includes(k)) throw new Error('[character] handOver: this character is not holding an item' + (side === 'auto' ? '' : ` in hand ${side}`) + ' — give it one with heldItemL / heldItemR, or createCharacter(host, { id, items: { R: "cup" } })');
    const t = this.tl(), dir = this._towards(target, k);
    this._stage(t, [k]);
    t.to(s, { ['bat' + k]: this.NGHI['bat' + k] - 3, ['carry' + k]: 0, duration: 0.12, ease: 'sine.in' }, 0);            // lấy đà
    this._reach(t, k, dir, 0.12, target);
    t.to(s, { ['item' + k]: 0, duration: 0.15 }, 0.62);                                                // món đồ rời tay
    t.set(s, { ['tay' + k]: 'mo' }, 0.7);
    this._khep(t, 0.45, 0.88, { ['item' + k]: 0 });
    return t;
  }

  /**
   * NHẬN một món đồ: vươn tay về phía `source`, món đồ hiện ra trong tay, rồi về dáng cầm. Nhân vật phải CÓ món đồ ấy
   * ở trạng thái đã cất — `createCharacter(host, { id, items: { R: 'cup' }, itemsHidden: true })`, hoặc sau `hideItem`.
   */
  take(source = null, side = 'auto') {
    const s = this.s, stored = ['R', 'L'].filter((k) => this.holds[k] && s['item' + k] <= 0.5), k = side === 'auto' ? stored[0] : side;
    if (!k || !stored.includes(k)) throw new Error('[character] take: this character has no put-away item to receive' + (side === 'auto' ? '' : ` in hand ${side}`) + ' — create it with createCharacter(host, { id, items: { R: "cup" }, itemsHidden: true })');
    const t = this.tl(), dir = this._towards(source, k);
    this._stage(t, [k]);
    t.set(s, { ['tay' + k]: 'mo', ['carry' + k]: 0 }, 0);
    this._reach(t, k, dir, 0.12, source);
    t.set(s, { ['tay' + k]: 'nam' }, 0.62);
    t.to(s, { ['item' + k]: 1, duration: 0.15 }, 0.62);                                                // món đồ vào tay
    this._khep(t, 0.45, 0.88, { ['item' + k]: 1 });
    return t;
  }

  /**
   * UỐNG một ngụm: nâng món đồ đang cầm (cốc) lên miệng, nghiêng cốc, ngửa đầu nhẹ, rồi hạ xuống — mắt khép, xong thì
   * cười. Không cầm gì thì làm điệu bộ uống bằng tay rảnh. `side` chọn tay.
   */
  drink(side = 'auto') {
    const t = this.tl(), s = this.s, N = this.NGHI;
    const held = ['R', 'L'].filter((k) => this.holds[k] && s['item' + k] > 0.5), k = side === 'auto' ? held[0] || this._freeHand() : side, m = k === 'L' ? -1 : 1;
    // Uống thì quay HẲN về phía người xem (rồi `_khep` trả về hướng đang giữ): ở dáng 3/4 cánh tay đưa lên miệng bị thân
    // che, cái cốc lấp ló bên ngực chứ không ra động tác uống.
    if (Math.abs(s.huong) > 0.02) t.to(s, { huong: 0, duration: 0.3, ease: 'sine.inOut' }, 0);
    t.set(s, { ['tay' + k]: 'nam' }, 0);
    // Dáng đưa bàn tay tới GẦN MIỆNG NHẤT đo được (bắp 10°, cẳng −155°: bàn tay ở ngực trên, lệch về phía tay ấy);
    // đầu cúi xuống đón, vai nhấc lên.
    t.to(s, { ['carry' + k]: 0, duration: 0.15 }, 0);
    t.to(s, { ['bat' + k]: 10, ['cang' + k]: -155, vai: N.vai - 5, dau: N.dau + m * 4, dauX: m * 3, dauY: 5, mieng: 0.3, chum: 0.6, nhinY: 1.5, duration: 0.42, ease: 'power2.out' }, 0);
    t.to(s, { ['itemTilt' + k]: 30, dauY: 9, matY: 0.7, duration: 0.3, ease: 'sine.inOut' }, 0.42);                                   // nghiêng cốc, nhắm mắt uống
    t.to(s, { ['itemTilt' + k]: 0, dauY: 3, matY: 0, duration: 0.28, ease: 'sine.inOut' }, 1.0);
    t.to(s, { cuoi: 1, mieng: 0.2, chum: 0, mayL: 0.5, mayR: 0.5, duration: 0.2 }, 1.2);                                              // "à…"
    this._khep(t, 0.5, 1.35);
    return t;
  }

});
