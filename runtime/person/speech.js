// runtime/person/speech.js — talking: syllable mouth shapes, tone of voice, `speak`, `explain` (talking hands), `speakCues`, `worry`.
// Methods of `RigSVG`, installed by runtime/rig-svg.js: `this` is the rig, `RigSVG` its class.

import { RHUBARB, KHAU, clamp, nhieu, pha, tron, ngauNhien, mix } from './shared.js';

export default (RigSVG) => mix(RigSVG, class {
  // Số âm tiết: ĐẾM CỤM NGUYÊN ÂM của từng tiếng, sau khi bỏ dấu. Bản trước
  // nhân 1.7 âm mỗi từ — nhưng chữ Việt viết rời từng âm tiết, mỗi tiếng cách
  // nhau bằng dấu cách đúng là MỘT âm ("được", "người" đều một cụm nguyên âm),
  // nên câu 7 tiếng ra 12 khẩu hình và môi mấp máy nhanh gần gấp đôi lời đọc.
  // Đếm cụm nguyên âm thì tiếng Việt ra 1 mỗi tiếng, tiếng Anh vẫn ra số âm
  // gần đúng ("hello" 2, "beautiful" 3). Không có lời thì chia đều theo thời
  // lượng. Sàn 4 âm là để chặn `dur` bé kéo `soAm` về 0 — chia cho 0 ra `nhip`
  // vô cực và cả timeline hỏng im lặng chứ không báo lỗi.
  _soAm(text, dur) {
    if (!text) return Math.max(4, Math.round(dur / 0.14));
    let n = 0;
    for (const tieng of text.trim().split(/\s+/)) {
      const tron = tieng.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
      if (/[a-z0-9]/.test(tron)) n += Math.max(1, (tron.match(/[aeiouy]+/g) || []).length);
    }
    return Math.max(4, n);
  }

  // KHẨU HÌNH của một câu: mỗi âm tiết bốc một hình rồi khép, thay vì chỉ nhấp
  // nhô một hình duy nhất theo độ mở. Bốn hình đủ để câu nói có nhịp: mở to,
  // hé rộng, chúm, gần mím — và chúng là ba kênh của cùng một họ hình nên nối
  // vào nhau liên tục.
  // Tách riêng vì `speak()` và `explain()` dùng CHUNG. Để hai bản chép tay
  // thì sớm muộn cũng trôi khỏi nhau, và lúc ấy hai động tác cùng một nhân vật
  // lại mấp máy môi theo hai kiểu khác nhau.
  /**
   * GIỌNG ĐIỆU của một câu nói: nét mặt giữ SUỐT câu trong khi miệng vẫn nhép theo lời. Trả về
   *   { start }  phần chân mày / mắt đặt một lần ở đầu câu
   *   corner(v)  khoé miệng của từng khẩu hình, kéo về phía nét mặt (buồn thì trễ xuống dù đang nói)
   * Không có `mood` thì là kiểu nói mặc định: tươi tỉnh, hơi cười.
   */
  _tone(mood, brows = 0.5, smile = 0.5) {
    if (!mood) return { start: { mayL: brows, mayR: brows, cuoi: smile }, corner: (value) => value, eyes: 0 };
    const face = RigSVG.EXPRESSIONS[mood];
    if (!face) throw new Error(`[character] no mood "${mood}" (available: ${Object.keys(RigSVG.EXPRESSIONS).join(', ')})`);
    // Khoé miệng bám SÁT nét mặt, khẩu hình chỉ xê dịch nó chút ít. Trộn 70/30 thì với nét mặt buồn / giận (khoé −0,5)
    // khẩu hình mở to (khoé +0,7) vẫn đẩy khoé miệng lên gần mức ngang — miệng há với khoé ngang đọc ra một nụ cười,
    // và nhân vật lo lắng cứ mở miệng là cười.
    const corner = (value) => face.cuoi * 0.9 + (value - 0.45) * 0.22;
    // Mắt chỉ khép MỘT PHẦN so với nét mặt đứng yên: nói mà mắt lim dim (vui, cười) thì thành ra nhếch mép, buồn ngủ.
    const eyes = (face.matY || 0) * 0.35;
    return { start: { mayL: face.mayL ?? 0, mayR: face.mayR ?? 0, cuoi: corner(smile), matY: eyes }, corner, eyes };
  }

  _khauHinh(t, soAm, nhip, corner = (value) => value) {
    const s = this.s;
    let truoc = -1;
    for (let i = 0; i < soAm; i++) {
      let k;
      do { k = Math.floor(ngauNhien() * KHAU.length); } while (k === truoc && KHAU.length > 1);
      truoc = k;
      const h = KHAU[k], a = i * nhip, giam = i % 5 === 4 ? 0.35 : 1;   // cuối nhịp thì hụt hơi
      t.to(s, { mieng: h.mieng * giam * nhieu(0.82, 1.08), chum: h.chum, cuoi: corner(h.cuoi),
                duration: nhip * 0.45, ease: 'power1.out' }, a)
       .to(s, { mieng: h.mieng * giam * 0.16, chum: h.chum * 0.5,
                duration: nhip * 0.55, ease: 'power1.in' }, a + nhip * 0.45);
    }
    return t;
  }

  speak(text = null, dur = 2, { mood = null } = {}) {
    const t = this.tl(), s = this.s, tone = this._tone(mood);
    // Đang quay về phía ai đó: nói bằng tay Ở PHÍA NGƯỜI NGHE, giữ nguyên dáng 3/4 (kênh `aim`)
    // — nhân vật đan tay mở tay gần ra thì bàn tay đưa về phía sau lưng; nhân vật buông tay nâng tay gần lên bụng thì
    // khuỷu bạnh ra, bàn tay đặt ở hông như chống nạnh. Các trường hợp khác (tay ấy đang cầm đồ, nhìn thẳng) như cũ: mở
    // người về phía người xem, diễn bằng tay gần.
    const listener = s.huong > 0.1 ? 'R' : s.huong < -0.1 ? 'L' : null;
    const toListener = RigSVG.SCREEN_AIM && listener && this._freeHand() === listener;
    const arm = toListener ? listener : this._chestHand();    // tay phải; đang quay mặt sang phải thì tay trái (tay gần người xem)
    if (toListener) this._stage(t, [arm], 0.1); else this._openUp(t);
    const soAm = this._soAm(text, dur), nhip = dur / soAm;
    t.set(s, { ['tay' + arm]: 'mo' }, 0);
    t.to(s, { ...tone.start, nhinX: 0.8, duration: 0.2 }, 0);
    this.blinkTo = tone.eyes;
    this._khauHinh(t, soAm, nhip, tone.corner);
    // đầu và tay phụ hoạ theo câu nói
    t.to(s, { dau: -3, dauY: 2, duration: dur * 0.35, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.1);
    // Cử chỉ là MỞ cẳng tay sang bên một nhịp, bàn tay xoè (dáng nhỏ của `explain`). Dáng cũ nâng bàn tay lên ngang bụng
    // (bắp 34°, cẳng −70°): nhân vật đan tay thì bàn tay gần như đứng yên, nhân vật buông tay thì bàn tay dừng ở hông —
    // cả hai chỉ thấy khuỷu bạnh ra, đọc thành chống nạnh.
    const beat = toListener ? [[36, 12], [40, 22]] : [[26, 48], [30, 60]];      // tay phía người nghe: chéo xuống về phía họ, như cử chỉ một tay của `explain`
    // Từ dáng đan tay, cẳng tay phải đi hơn 100° mới tới dáng mở: cho nó 0,5 s thay vì 0,35 s, kẻo thành một cú vung.
    const reach = Math.abs(beat[0][1] - this._restArm(arm)[1]) > 90 ? 0.5 : 0.35;
    t.to(s, { ['bat' + arm]: beat[0][0], ['cang' + arm]: beat[0][1], than: -1.5, duration: reach, ease: 'power2.out' }, 0.2)
     .to(s, { ['bat' + arm]: beat[1][0], ['cang' + arm]: beat[1][1], duration: 0.35, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.2 + reach);
    if (dur > 1.2) this._chop(t, dur * 0.55);
    this.blinkTo = 0;
    t.to(s, { mieng: 0, duration: 0.15 }, dur);
    this._khep(t, 0.5, dur + 0.05);
    return t;
  }

  /**
   * TRÔI KHÔNG CHU KỲ — thay cho `yoyo` hình sin.
   *
   * Bản trước dựng cả tầng "sống" bằng yoyo sin chu kỳ cố định (thở 1.9s, đầu
   * 2.6/3.1s, dồn chân 5.2s). Đo tự-tương-quan trên bản render: 7 trong 11 kênh
   * có đỉnh ≥ 0.7 — dao động đều tăm tắp. ĐÓ CHÍNH LÀ CHỮ KÝ CỦA MÁY. Chọn ba
   * chu kỳ lệch nhau không cứu được: từng kênh vẫn tuần hoàn, và mắt bắt được
   * tính tuần hoàn của TỪNG kênh chứ không bắt tổng của chúng.
   *
   * Ở đây mỗi kênh đi tới một đích NGẪU NHIÊN trong một khoảng thời gian cũng
   * NGẪU NHIÊN, nối đuôi nhau — không có chu kỳ để mà bắt.
   */
  _troi(t, khoa, min, max, D, nganNhat = 0.7, daiNhat = 2.0) {
    let at = 0;
    while (at < D) {
      // Nhịp cuối bị cắt cho vừa `D`: một nhịp trôi còn chạy sau `D` sẽ đè lên `_khep` và để kênh
      // ấy (đầu nghiêng, hơi thở) dừng lệch khỏi tư thế nghỉ.
      const d = Math.min(nhieu(nganNhat, daiNhat), D - at);
      if (d < 0.05) break;
      t.to(this.s, { [khoa]: nhieu(min, max), duration: d, ease: 'sine.inOut' }, at);
      at += d;
    }
    return t;
  }

  /**
   * CỬ CHỈ CÓ CẤU TRÚC — bốn pha, dùng chung cho `explain()` và `speakCues()`.
   *
   * HAI BẢN TRƯỚC ĐỀU SAI, VÀ SAI NGƯỢC CHIỀU NHAU:
   *   · Bản 1 là BỘ XUNG: vung ra rồi kéo nguyên về, giữa hai xung không có
   *     gì. Rút khung từ bản render: mười khung đứng im, một khung giật.
   *   · Bản 2 chữa bằng cách cho tay ĐI LIÊN TỤC giữa các tư thế NGẪU NHIÊN.
   *     Hết đơ nhưng thành "vơ tay lung tung" — vì NGẪU NHIÊN KHÔNG PHẢI LÀ
   *     SỐNG. Tay đi mãi mà không tới đâu thì mắt đọc ra nhiễu, không ra ý.
   *
   * Cử chỉ người thật có bốn pha, và pha thứ ba mới làm nên nghĩa:
   *   LẤY ĐÀ  (0.18s) — nhích ngược hướng một chút, lấy trớn.
   *   NHẤN    (0.26s) — bung tới đích, nhanh, vọt qua rồi lắng lại.
   *   GIỮ     (0.35–1.6s) — ĐỨNG YÊN Ở ĐÍCH. Bỏ pha này là mọi cử chỉ thành
   *                        nhiễu; chính khoảng trống này làm nó "có ý".
   *   BUÔNG   (0.55s) — về thế chuẩn bị, chậm hơn lúc nhấn.
   *
   * Và THÂN DẪN TRƯỚC TAY 0.10s: người thật khởi động từ thân rồi mới tới chi.
   * Thiếu độ trễ đó thì tay như que gắn vào khối gỗ.
   */
  _cuChi(t, moc, D, beats = [], hand = null) {
    const s = this.s, N = this.NGHI;
    if (!moc.length && !beats.length) return t;
    // NỀN là TƯ THẾ NGHỈ CỦA CHÍNH NHÂN VẬT (đan tay, buông tay, một tay cầm đồ…), không phải một dáng "hai tay
    // trước bụng" chung cho mọi người. Bản trước đặt thẳng dáng chung ấy ở khung đầu của câu nói — tay GIẬT trong
    // đúng một khung hình — và ai nói cũng ra cùng một dáng. Cử chỉ nào cũng đi từ nền này và về lại nền này.
    //
    // Tay đang cầm đồ thì không diễn; tay còn lại diễn thay. Cả hai tay đều bận thì chỉ còn đầu và thân.
    const busy = (side) => this.holds[side] && s['item' + side] > 0.5;
    // Đang quay mặt sang trái thì tay chủ đạo là tay trái (xem `_freeHand`).
    // `hand` ('L' | 'R'): tay chủ đạo do người gọi chọn — người dẫn đứng cạnh bảng nội dung thì diễn bằng tay phía bảng.
    const order = hand === 'L' || (hand !== 'R' && s.huong < -0.1) ? ['L', 'R'] : ['R', 'L'];
    const free = order.filter((side) => !busy(side));
    if (!free.length) return t;
    const lead = free[0], other = free[1] || null;                    // tay chủ đạo (phải, nếu rảnh) và tay phụ
    // Các DÁNG ĐÍCH — góc của tay chủ đạo [bắp, cẳng] và của tay phụ (null = tay phụ chỉ nhích theo).
    // Cẳng tay DƯƠNG là mở ra ngoài: bàn tay đưa sang bên, lòng bàn tay hướng về người nghe. Bản trước dùng cẳng
    // tay âm với bắp tay nâng cao — khuỷu chĩa ngang, bàn tay rủ xuống — trông như cánh gà.
    const key = (side, joint) => (joint ? 'cang' : 'bat') + side;
    const base = (side) => this._restArm(side);
    const ALL_POSES = [
      { lead: [14, 58], other: null },             // mở một tay ngang hông
      { lead: [12, 74], other: null },             // đưa tay sang bên
      { lead: [30, 62], other: null },             // đưa bàn tay ra phía trước-bên (cẳng tay quá ~75° thì bàn tay lật nghiêng, trông như cái que)
      { lead: [22, -112], other: null },           // đặt tay lên ngực
      { lead: [16, 50], other: [16, 50] },         // mở cả hai tay
      { lead: [18, 66], other: [12, 40] },         // hai tay, tay chủ đạo cao hơn
    ];
    // Dáng nào gần trùng tư thế nghỉ của nhân vật thì bỏ: người nghỉ ở dáng đan tay (cẳng −97°) mà "đặt tay lên
    // ngực" (−112°) là cánh tay nhích 15° — cả câu nói không thấy một cử chỉ nào.
    // Đang quay 3/4 mà tay chủ đạo là tay PHÍA XA (tay phía người nghe, nằm sau thân): bỏ các dáng GẬP CẲNG TAY VÀO
    // TRONG (đặt tay lên ngực). Tay xa gập vào trong thì rig ẩn bắp tay của nó cho ống tay áo khỏi đè lên ngực — chỉ còn
    // cẳng tay vắt ngang bụng, mọc ra từ mép áo: người xem đọc thành mất bắp tay (bà cụ vừa áp điện thoại vừa nói, giây 1).
    const farLead = Math.abs(s.huong) > 0.1 && lead === (s.huong < 0 ? 'L' : 'R');
    const POSES = ALL_POSES.filter((pose) => Math.abs(pose.lead[1] - base(lead)[1]) >= 45 && !(farLead && pose.lead[1] < 0));
    // Một cử chỉ trọn vẹn (lấy đà → đưa tay → giữ → về nền) cần gần hai giây. Mốc nào sát mốc trước quá thì bỏ:
    // hai cử chỉ gối lên nhau là hai tween cùng giành một khớp, và cánh tay nhảy cóc giữa chừng.
    const anchors = [];
    for (const a of moc) if (!anchors.length || a - anchors[anchors.length - 1] >= 2.1) anchors.push(a);
    // NHỊP NHỎ theo trọng âm (`beats`): một cái nhấn tay vài độ rồi về, đúng lúc người nói nhấn giọng. Nhịp chỉ
    // được đặt vào chỗ khớp tay đang RẢNH — trong lúc giữ một dáng, hoặc lúc tay nằm ở nền giữa hai cử chỉ — để
    // không tween nào giành khớp với tween nào.
    const pulse = (arm, around, at, size) => {
      const dip = (Math.abs(around) < 12 ? 1 : -Math.sign(around)) * size;
      t.to(s, { [key(arm, 1)]: around + dip, duration: 0.12, ease: 'power2.out' }, at)
       .to(s, { [key(arm, 1)]: around, duration: 0.22, ease: 'sine.inOut' }, at + 0.12);
    };
    const spaced = [];
    for (const b of beats) if (!spaced.length || b - spaced[spaced.length - 1] >= 0.45) spaced.push(b);
    const occupied = [];                                              // các quãng một cử chỉ lớn đang chiếm tay
    let last = -1;
    anchors.forEach((a, i) => {
      if (!POSES.length) return;
      let pick = last; while (pick === last && POSES.length > 1) pick = Math.floor(ngauNhien() * POSES.length);
      last = pick;
      let pose = POSES[pick];
      // Đang đứng dáng 3/4 và chỉ MỘT tay (tay phía người nghe) mở ra, tay kia vẫn đan trước bụng: các dáng trên đặt
      // cẳng tay nằm ngang đúng độ cao khuỷu — tức đúng độ cao của cẳng tay đang đan. Hai cẳng tay thẳng hàng, nối đầu
      // vào nhau, nhìn như MỘT cánh tay dài xuyên qua thân. Đưa bắp tay ra ngoài hơn và duỗi bớt cẳng tay: cả cánh tay thành một đường chéo từ vai xuống về phía người nghe, bàn tay mở ở ngang hông.
      // (Chếch LÊN thì bàn tay chỉ lên tới ngang bàn tay kia — tay nhân vật ngắn — vẫn thẳng hàng.)
      if (RigSVG.SCREEN_AIM && Math.abs(s.huong) > 0.1 && lead === (s.huong < 0 ? 'L' : 'R') && !pose.other && pose.lead[1] > 0)
{
        // Bắp tay không quá 38° (đưa ra nhiều hơn là khuỷu lên cao, bàn tay lại về ngang bàn tay kia); bắp + cẳng ≤ 52°,
        // chừa chỗ cho phần xê dịch ngẫu nhiên và nhịp nhấn (tới +17°) mà cẳng tay vẫn còn chếch xuống rõ.
        const upper = Math.min(pose.lead[0] + 22, 38);
        pose = { lead: [upper, Math.min(pose.lead[1] - 30, 52 - upper)], other: null };
      }
      const next = i + 1 < anchors.length ? anchors[i + 1] : D;
      // Thời gian đưa tay dài nhất trong các tay tham gia (đường đi càng dài càng lâu, xem bên dưới).
      const travel = Math.max(Math.abs(pose.lead[1] - base(lead)[1]), other && pose.other ? Math.abs(pose.other[1] - base(other)[1]) : 0);
      const longest = clamp(travel / 300, 0.36, 0.62) + 0.17;                 // + nhịp trễ của tay phụ và của cẳng tay
      const hold = clamp((next - a) - 0.16 - longest - 0.85, 0.25, 1.5);
      const stroke = a + 0.16;
      let release = stroke + longest + hold, handOver = false;
      if (release + 0.8 > next) {
        // Không đủ chỗ cho pha về nền. Giữa câu thì bỏ nhịp này. CUỐI câu thì vẫn diễn: giữ dáng tới hết câu rồi để
        // `_khep` của người gọi đưa tay về — bỏ đi là nửa sau câu nói tay đứng im trong khi miệng còn nói.
        if (i + 1 < anchors.length || stroke + longest + 0.25 > D) return;
        release = D; handOver = true;
      }
      occupied.push([a - 0.06, release + 0.9]);
      const inHold = spaced.filter((b) => b >= stroke + longest + 0.12 && b + 0.36 <= release - 0.05);

      const arms = [[lead, pose.lead]];
      if (other && pose.other) arms.push([other, pose.other]);
      const side = lead === 'R' ? -1 : 1;                 // thân và đầu ngả nhẹ VỀ PHÍA tay đang diễn
      // Thân, vai và đầu cùng tham gia: chỉ có cánh tay chuyển động thì nhìn như tay gắn vào một thân cứng.
      t.to(s, { than: N.than + side * nhieu(1.2, 2.4), vai: N.vai - nhieu(1.5, 3), dauY: nhieu(1.2, 2.6), duration: 0.4, ease: 'sine.out' }, stroke - 0.04);
      if (!handOver) t.to(s, { than: N.than, vai: N.vai, dauY: N.dauY, duration: 0.7, ease: 'sine.inOut' }, release);
      arms.forEach(([arm, [upper, fore]], n) => {
        const [upper0, fore0] = base(arm), lag = n * 0.08;         // tay phụ đi sau tay chủ đạo một nhịp
        const jitterU = nhieu(-3, 3), jitterF = nhieu(-6, 6);      // mỗi lần diễn một dáng hơi khác đi
        // Đường đi càng dài thì đưa tay càng lâu: từ dáng đan tay (cẳng −97°) mở ra ngoài là gần 170° — đi hết
        // trong 0,4 s thì cánh tay quất như roi.
        const reach = clamp(Math.abs(fore - fore0) / 300, 0.36, 0.62);
        // 1. LẤY ĐÀ: nhích ngược một chút.   2. ĐƯA TAY: nhanh rồi chậm dần, không nảy quá đà.
        t.set(s, { ['tay' + arm]: 'mo' }, a + lag);
        // Dáng đích là dáng MẶT TRƯỚC: bật `aim` trong lúc đưa tay để nó hiện đúng như thế ở dáng 3/4, rồi tắt khi về nền.
        if (RigSVG.SCREEN_AIM) t.to(s, { ['aim' + arm]: 1, duration: 0.16 + reach * 0.6, ease: 'sine.inOut' }, a + lag);
        t.to(s, { [key(arm, 0)]: upper0 - 2, [key(arm, 1)]: fore0 - Math.sign(fore - fore0) * 5, duration: 0.16, ease: 'sine.in' }, a + lag)
         .to(s, { [key(arm, 0)]: upper + jitterU, duration: reach, ease: 'power2.out' }, stroke + lag)
         .to(s, { [key(arm, 1)]: fore + jitterF, duration: reach + 0.06, ease: 'power2.out' }, stroke + lag + 0.03);       // cẳng tay tới sau bắp tay
        // 3. GIỮ mà vẫn SỐNG: cẳng tay trôi vài độ, bắp tay thở theo — tay người không bao giờ đứng im tuyệt đối.
        const drift = release - (stroke + lag + reach + 0.1) - 0.05;
        if (inHold.length) {
          for (const b of inHold) pulse(arm, fore + jitterF, b + lag * 0.5, nhieu(6, 9) * (n ? 0.6 : 1));
        } else if (drift > 0.3) {
          t.to(s, { [key(arm, 1)]: fore + jitterF + nhieu(4, 8) * (ngauNhien() < 0.5 ? -1 : 1), duration: drift / 2, ease: 'sine.inOut', yoyo: true, repeat: 1 }, stroke + lag + reach + 0.1);
          t.to(s, { [key(arm, 0)]: upper + jitterU + nhieu(1.5, 3), duration: drift / 2, ease: 'sine.inOut', yoyo: true, repeat: 1 }, stroke + lag + reach + 0.04);
        }
        // 4. VỀ NỀN: chậm hơn lúc đưa ra, cẳng tay về sau.
        if (handOver) return;
        if (RigSVG.SCREEN_AIM) t.to(s, { ['aim' + arm]: 0, duration: 0.6, ease: 'sine.inOut' }, release + lag);
        t.to(s, { [key(arm, 0)]: upper0, duration: 0.6, ease: 'sine.inOut' }, release + lag)
         .to(s, { [key(arm, 1)]: fore0, duration: 0.66, ease: 'sine.inOut' }, release + lag + 0.05);
        t.set(s, { ['tay' + arm]: this.holds[arm] ? 'mo' : N['tay' + arm] }, release + lag + 0.5);
      });
      // Tay phụ không diễn trong dáng này: nhích nhẹ theo nhịp, để không là một khúc gỗ bên cạnh tay đang diễn.
      if (other && !pose.other) {
        const [upper0, fore0] = base(other);
        t.to(s, { [key(other, 1)]: fore0 + nhieu(3, 7), [key(other, 0)]: upper0 + nhieu(1, 3), duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1 }, stroke + 0.1);
      }
    });
    // Nhịp rơi vào lúc tay đang ở NỀN: nhấn nhẹ cả tay chủ đạo lẫn tay phụ, kèm một cái gật rất nhỏ.
    for (const b of spaced) {
      if (b < 0.25 || b + 0.36 > D - 0.1 || occupied.some(([from, to]) => b + 0.36 > from && b < to)) continue;
      pulse(lead, base(lead)[1], b, nhieu(4, 7));
      if (other) pulse(other, base(other)[1], b + 0.03, nhieu(2, 4));
      t.to(s, { dauY: N.dauY + nhieu(1, 1.8), duration: 0.12, ease: 'power2.out' }, b).to(s, { dauY: N.dauY, duration: 0.24, ease: 'sine.inOut' }, b + 0.12);
    }
    return t;
  }

  /**
   * NÓI CÓ ĐÁNH TAY — dùng chung khẩu hình với `speak()`, thêm tầng cử chỉ.
   *
   * `speak()` để tay gần như bất động: đúng MỘT dao động của riêng tay phải cho
   * cả câu, tay trái không hề nhúc nhích. Cận mặt thì không sao, nhưng nhân vật
   * đứng toàn thân nói vài giây thì ra pho tượng biết mấp máy môi — mà đoạn nói
   * chiếm phần lớn thời lượng mọi video.
   *
   * BẢN ĐẦU TÔI LÀM SAI, ghi lại để đừng ai làm lại: nhấc cả hai tay lên một
   * tư thế "nhà" rộng (bat 60–66) rồi GIỮ nguyên suốt câu, chỉ rung quanh nó
   * ±18. Ra dáng bù nhìn dang tay, không ra người đang nói. Ba chỗ hỏng:
   * `bat` lớn đẩy khuỷu ra xa thân; hai tay đối xứng; và cái dáng rộng ấy là
   * dáng GIỮ, nên biên độ nhịp nhỏ hơn hẳn độ lệch tĩnh — mắt đọc ra tư thế
   * chứ không đọc ra chuyển động.
   *
   * Bản này đảo lại cấu trúc:
   *   • NỀN THẤP, gần tư thế nghỉ — tay buông hờ trước bụng, khuỷu sát thân.
   *     Giữa hai nhịp tay VỀ nền, nên không lúc nào đông cứng ở dáng rộng.
   *   • MỖI NHỊP LÀ MỘT CỬ CHỈ THẬT: cẳng tay phải nâng từ bụng lên ngực rồi
   *     lắng xuống. Biên độ lớn hơn hẳn độ lệch của nền, nên thứ đập vào mắt
   *     là chuyển động chứ không phải tư thế.
   *   • MỘT TAY CHỦ ĐẠO. Tay trái chỉ góp ở nhịp nhấn và biên nhỏ hơn. Hai tay
   *     cùng làm mọi nhịp là quay lại đúng dáng bù nhìn.
   *   • Nhịp cách 4 âm, không phải mỗi âm — và đủ dài để nâng rồi lắng cho hết.
   */
  explain(text = null, dur = 2.4, { mood = null, hand = null } = {}) {
    const t = this.tl(), s = this.s, tone = this._tone(mood, 0.45, 0.5);
    this._stageSpeech(t, hand);
    const soAm = this._soAm(text, dur), nhip = dur / soAm;
    // Nền THẤP và LỆCH: tay trái buông gần thõng, tay phải hé hơn một chút.
    // Trái phải khác nhau ngay từ nền thì cái nâng của tay phải mới nổi lên —
    // để hai tay ngang nhau là bàn tay phải bị bàn tay trái che mất.

    // Không đặt lại dáng tay ở đây: cử chỉ (`_cuChi`) đi thẳng từ tư thế nghỉ của nhân vật.
    t.to(s, { ...tone.start, nhinX: 0.8, duration: 0.35, ease: 'power2.out' }, 0);

    this.blinkTo = tone.eyes;
    this._khauHinh(t, soAm, nhip, tone.corner);

    // Bỏ nhịp nào rơi vào 0.5s cuối: đang vung dở thì bị `_khep` giật về nghỉ.
    // Mọi âm tiết đều là ứng viên; `_cuChi` tự giãn các cử chỉ cách nhau đủ xa. Bản trước chỉ lấy âm thứ 1, 6,
    // 11…: câu 4,5 s rơi mất hai trong ba mốc (một quá sát mốc trước, một quá sát cuối câu) và chỉ còn một cử chỉ.
    const moc = [];
    for (let i = 1; i < soAm && i * nhip <= dur - 0.5; i++) moc.push(i * nhip);
    // Không có tiếng thật: nhịp nhấn ước theo âm tiết — cứ ba âm tiết một lần nhấn.
    const stress = [];
    for (let i = 1; i < soAm; i += 3) stress.push(i * nhip);
    this._cuChi(t, moc, dur, stress, hand);

    if (dur > 1.2) this._chop(t, dur * nhieu(0.4, 0.65));
    this.blinkTo = 0;
    t.to(s, { mieng: 0, chum: 0, duration: 0.15 }, dur);
    this._khep(t, 0.5, dur + 0.05);
    return t;
  }

  /**
   * NÓI THEO CUE THẬT — nhép miệng bám âm thanh, kèm nhịp tay.
   *
   * Khác `speak()`/`explain()`: hai hàm kia ĐOÁN nhịp từ số từ, nên môi chạy
   * đúng tiết tấu nhưng không đúng lời. Hàm này nhận cue đo từ chính file
   * tiếng (định dạng Rhubarb) nên môi khớp lời.
   *
   *   const cue = await (await fetch('loi.cues.json')).json();
   *   tl.add(rig.speakCues(cue).paused(false), 2.0);
   *
   * HAI QUYẾT ĐỊNH đáng ghi:
   *
   * 1. VUỐT chứ không NHẢY hình. Rhubarb định cho hiển thị rời từng khung,
   *    nhưng ở cỡ nhân vật đứng trong slide thì nhảy hình đọc ra giật môi.
   *    Vuốt 60ms giữ nguyên nhịp mà hết giật — cùng lý do `speak.py` nội suy
   *    40ms cho đường clip. Vuốt bị kẹp lại nếu cue ngắn hơn.
   *
   * 2. NHỊP TAY BÁM CHỖ NGẮT HƠI, không chia đều theo giây. Mỗi khoảng im (X)
   *    dài hơn 0.16s là ranh giới một mệnh đề, và người dẫn đánh tay ngay khi
   *    vào mệnh đề mới. Chia đều thì tay rơi vào giữa từ — đó chính là cái
   *    "cứng đơ": tay vẫn động nhưng động lệch chỗ nên não đọc ra máy móc.
   */
  speakCues(cue, dur = null, { cuChi = true, mood = null, hand = null } = {}) {      // `{ text }` trong tham số thứ ba là LỜI cho `captions()`; rig không dùng tới
    const t = this.tl(), s = this.s, tone = this._tone(mood, 0.4, 0.45);
    this.blinkTo = tone.eyes;
    this._stageSpeech(t, hand);
    const ds = Array.isArray(cue) ? cue : (cue && cue.mouthCues) || [];
    const D = dur || (cue && cue.metadata && cue.metadata.duration)
                  || (ds.length ? ds[ds.length - 1].end : 2);
    // Không có cue thì rơi về nhịp ước lượng, đừng đứng im mở mắt.
    if (!ds.length) return this.explain(null, D);

    // Nền CAO hơn `explain`: người dẫn tin giữ thế sẵn sàng, hai tay tách
    // nhau ngang bụng — không phải thế nghỉ đan tay. Giữa hai mệnh đề tay về
    // đây, nên nền chính là tư thế người xem nhìn thấy nhiều nhất.
    // Không đặt lại dáng tay ở đây: cử chỉ (`_cuChi`) đi thẳng từ tư thế nghỉ của nhân vật.
    t.to(s, { ...tone.start, nhinX: 0.6, duration: 0.3, ease: 'power2.out' }, 0);

    // LỚP NỀN SỐNG — thở, đảo đầu, đảo mắt, chạy suốt cả câu trên những kênh
    // mà tầng nhịp tay KHÔNG đụng tới (`tho`, `dauX`, `nhinX`). Thiếu lớp này
    // thì giữa hai mệnh đề nhân vật đứng đơ hoàn toàn — mà chỗ ngắt hơi lại
    // đúng là chỗ mắt người xem rơi vào. Ba chu kỳ lệch nhau (1.9 / 2.6 / 3.4s)
    // nên chúng không bao giờ trùng pha thành một nhịp máy móc.
    this._troi(t, 'tho', 0, 1, D, 0.9, 2.2);
    // ĐẦU phải NGHIÊNG, không chỉ dịch ngang: `dauX` 1.3 đơn vị chỉ dời đầu
    // ~2px, dưới ngưỡng mắt thấy, còn xoay `dau` làm đổi pixel trên KHẮP đường
    // bao đầu. Hai kênh này KHÔNG đụng `dauY`/`than` — hai khoá đó do
    // `_cuChi` giữ, chồng tween lên nhau là đầu giằng co.
    this._troi(t, 'dau', -3.4, 3.4, D, 1.0, 2.6);
    this._troi(t, 'dauX', -4, 4, D, 0.9, 2.4);

    // ĐỨNG KHÔNG PHẢI LÀ ĐỨNG YÊN. Người đứng nói dồn trọng tâm qua lại giữa
    // hai chân suốt buổi. Đo bản trước trên chính file mp4: vùng chân đứng im
    // 54/89 khung — từ thắt lưng xuống là một cái cột, và đó mới là thứ đọc ra
    // "đứng đơ", chứ không phải tay.
    //   `x` dời cả người, `dui`/`ong` đổi chân trụ. Chu kỳ 5.2s để lệch hẳn
    // với thở (1.9) và với đầu (2.6/3.1) — ba nhịp không bao giờ trùng pha.
    // Dồn trọng tâm: ĐỔI BÊN rồi GIỮ một lúc, cả hai đều ngẫu nhiên. Người
    // đứng không lắc lư theo nhịp — họ tì một chân, đứng đó một lúc, rồi đổi.
    // Dồn trọng tâm quanh CHỖ ĐANG ĐỨNG (`x0`), không quanh giữa khung: nhân vật đã `walk` tới
    // một điểm đánh dấu mà dồn quanh 0 thì vừa mở miệng đã trượt về giữa khung và ở luôn đó.
    const x0 = s.x;
    let atC = nhieu(0.2, 0.9), ben = ngauNhien() < 0.5 ? 1 : -1;
    while (atC < D) {
      const doi = nhieu(0.7, 1.3);
      // Nhịp dồn trọng tâm phải XONG trước khi câu nói kết thúc: nhịp nào còn chạy lúc `_khep`
      // đưa người về chỗ cũ thì nó thắng, và nhân vật dừng lại ở tư thế lệch.
      if (atC + doi > D - 0.05) break;
      // ĐỔI BÊN chỉ 70% số lần — 30% còn lại chỉnh lại trọng tâm trên CÙNG
      // một chân. Luân phiên cứng trái–phải là một sóng vuông, và tự-tương-
      // quan bắt được nó ngay (đo được đỉnh quay lại 0.57 ở `x`).
      if (ngauNhien() < 0.7) ben = -ben;
      const manh = nhieu(0.45, 1);
      t.to(s, { x: x0 + ben * 2.3 * manh, duiL: ben * 3.0 * manh, duiR: -ben * 3.0 * manh,
                ongL: -ben * 2.0 * manh, ongR: ben * 2.0 * manh,
                duration: doi, ease: 'sine.inOut' }, atC);
      atC += doi + nhieu(0.9, 3.2);
    }

    // MẮT ĐẢO THEO BƯỚC NHẢY, không theo hình sin. Mắt người không trôi đều —
    // nó đứng một chỗ rồi nhảy sang chỗ khác (saccade). Cho `nhinX` chạy sin
    // thì thành mắt đảo như búp bê; nhảy rồi giữ mới ra người đang nói.
    for (let m = nhieu(0.5, 1.0); m < D - 0.3; m += nhieu(1.1, 2.0)) {
      t.to(s, { nhinX: nhieu(-0.9, 1.4), nhinY: nhieu(-0.7, 0.5),
                duration: 0.12, ease: 'power2.out' }, m);
    }

    // MIỆNG ĐI TRƯỚC TIẾNG `LEAD` giây. Đo trên một câu 7,5 s (giọng máy + cue `spectral`): bắt đầu đổi khẩu hình đúng
    // mốc cue thì độ mở miệng khớp biên độ tiếng nhất khi dời SỚM 67 ms — tức miệng đang chậm hơn tiếng chừng hai
    // khung hình 30 fps. Mắt người chịu được hình đi trước tiếng tốt hơn nhiều so với hình đi sau (đó cũng là lệ của
    // dân hoạt hình: khẩu hình sớm một hai khung), nên dời mọi khẩu hình sớm lên.
    const VAO = 0.06, LEAD = 0.06;
    for (const c of ds) {
      const h = RHUBARB[c.value] || RHUBARB.X;
      t.to(s, { mieng: h.mieng, chum: h.chum, cuoi: tone.corner(h.cuoi),
                duration: Math.min(VAO, Math.max(0.02, (c.end - c.start) * 0.6)),
                ease: 'power1.out' }, Math.max(0, c.start - LEAD));
    }

    const moc = [];
    // CỬ CHỈ ĐẦU TIÊN đi cùng tiếng đầu tiên. Mốc cử chỉ vốn chỉ là chỗ dứt một quãng ngắt hơi GIỮA câu, nên câu nào
    // cũng mở đầu bằng một đoạn đứng yên tay cho tới quãng ngắt đầu — đo trên một câu 7,5 s là 1,5 s đứng đan tay mà
    // nói. Câu đủ dài (trên 2,4 s) thì thêm mốc ở ngay tiếng đầu; mốc ngắt hơi nào sát nó hơn 2,4 s vẫn bị bỏ như cũ.
    const opening = ds.find((c) => c.value !== 'X');
    if (opening && D > 2.4 && opening.start < 0.6) moc.push(Math.max(opening.start, 0.12));
    for (const c of ds) {
      if (c.value !== 'X' || c.end - c.start < 0.16) continue;
      if (c.end < 0.2 || c.end > D - 0.6) continue;
      // Cách nhau ít nhất 2.4s: một cử chỉ đủ bốn pha mất ~1.6s, chưa kể
      // khoảng lặng giữa hai cử chỉ. Dồn sát hơn là quay lại vơ tay.
      if (moc.length && c.end - moc[moc.length - 1] < 2.4) continue;
      moc.push(c.end);
    }
    if (!moc.length && D > 1.6) moc.push(D * 0.35);
    // KHÔNG chèn thêm mốc nữa. Bản trước chèn điểm giữa mọi quãng > 2.6s để
    // "tay khỏi đứng" — đó chính là chỗ đẻ ra vơ tay. Tay đứng yên giữa hai cử
    // chỉ là ĐÚNG; cái phải sống trong khoảng đó là mặt, đầu và hơi thở.
    // `cuChi: false` — ĐỨNG YÊN TAY, chỉ thở và nói. Người dẫn tin thật gần
    // như không khoát tay: họ đứng, để mặt và đầu gánh hết. Tay vẫn không chết
    // cứng vì hai cánh tay treo trong nhóm `tren`/`sau`, mà nhóm đó nhấc lên
    // hạ xuống theo hơi thở (`nhacY`) — nên tay nhô theo nhịp thở, chỉ là
    // không có cử chỉ nào.
    // TRỌNG ÂM lấy từ chính bộ cue: chỗ miệng mở to nhất (D), và âm tiết đầu tiên sau một quãng ngắt.
    const stress = [];
    ds.forEach((c, i) => { if (c.value === 'D' || (i && ds[i - 1].value === 'X' && c.value !== 'X' && c.value !== 'A')) stress.push(c.start); });
    if (cuChi) this._cuChi(t, moc, D, stress, hand);

    for (let b = nhieu(0.6, 1.2); b < D - 0.4; b += nhieu(1.8, 3.4)) this._chop(t, b);
    this.blinkTo = 0;
    t.to(s, { mieng: 0, chum: 0, duration: 0.18 }, D);
    this._khep(t, 0.5, D + 0.05, { x: x0 });       // `#khep` không đụng `x`; trả về đúng chỗ đứng lúc bắt đầu
    return t;
  }

  /**
   * LO LẮNG / NÊU VẤN ĐỀ — bàn tay đặt lên ngực, mày nhướn, khoé miệng trĩu.
   *
   * Nhịp mở đầu của gần như mọi video marketing ("thú cưng nhà bạn có đang…?")
   * trước nay KHÔNG có cử chỉ nào diễn được: đo 13 động tác cũ thì `cuoi` chỉ
   * chạm âm ở đúng `shrug` (−0.4), còn lại trung tính tới vui hết.
   *
   * PHẢI KHÁC `shrug` Ở NGÔN NGỮ THÂN, không ở nét mặt. Hai động tác dùng gần
   * như cùng bộ mặt (mày nhướn + khoé miệng trĩu) vì đó là bộ mặt duy nhất rig
   * diễn được cho cả hai; phân biệt nằm ở chỗ khác:
   *   `shrug`  — nhanh, hai tay hất ra ngoài, vai giật lên: "chịu, không biết".
   *   `worry` — chậm, MỘT tay thu vào ngực, vai hơi rụt: "tôi đang lo".
   *
   * Nhịp quan trọng nhất là MẮT NGƯỚC LÊN ở giữa: vào thì cúi nhìn xuống, giữa
   * chừng mới ngước lên nhìn thẳng người xem. Đó là chỗ câu hỏi chạm tới khán
   * giả; thiếu nó thì chỉ là một người đang buồn chuyện riêng.
   */
  worry() {
    const t = this.tl(), s = this.s;
    this._openUp(t);
    // Một tay lên ngực bằng `cang` (gập khuỷu) — đo thì bàn tay từ y 320 lên 285, tức vừa chạm dưới túi ngực. Tay kia
    // buông thấp cho lệch hẳn. Tay lên ngực là tay phải; đang quay mặt sang phải thì là tay trái (xem `_chestHand`).
    const chest = this._chestHand(), low = chest === 'L' ? 'R' : 'L';
    t.set(s, { tayL: 'mo', tayR: 'mo' }, 0);
    t.to(s, { ['bat' + chest]: 28, ['cang' + chest]: -122, ['bat' + low]: 10, ['cang' + low]: -58,
              than: 2, vai: -2, dau: 5, dauY: 2.5, nhinY: 0.8, nhinX: -0.4,
              mayL: 0.7, mayR: 0.7, cuoi: -0.5, mieng: 0.08,
              duration: 0.55, ease: 'power2.out' }, 0);
    // Ngước lên nhìn thẳng, tay khẽ ấn vào ngực rồi buông — để tư thế còn thở
    // chứ không đông cứng suốt clip.
    t.to(s, { nhinY: -0.3, nhinX: 0, dau: 3, dauY: 1.6, ['cang' + chest]: -128, cuoi: -0.42,
              duration: 0.4, ease: 'sine.inOut' }, 0.6)
     .to(s, { ['cang' + chest]: -122, dauY: 2, duration: 0.45, ease: 'sine.inOut' }, 1.0);
    this._chop(t, 0.85);
    this._khep(t, 0.6, 1.55);
    return t;
  }
});
