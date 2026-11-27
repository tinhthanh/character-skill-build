// runtime/person/motion.js — whole-body motion: run, jump, dance.
// Methods of `RigSVG`, installed by runtime/rig-svg.js: `this` is the rig, `RigSVG` its class.

import { KHUNG, DAI, HIPS_POSE, clamp, RAD, mem, pha, mix } from './shared.js';

export default (RigSVG) => mix(RigSVG, class {
  static RUN_GAP_42D = 0.42;          // đợt 43: `run(rig)` dừng cách nó chừng ấy × nửa chiều cao khung (như RUN_GAP của tools/scenelib)
  static RUN_STEP_42D = 0.3;          // giây một bước chạy (`speed` 1); `walk` 0,46, `hurry` 0,3 nhưng không có pha bay
  static RUN_CONTACT_42D = 0.3;       // phần CHU KỲ (2 bước = 1) một chân trên đất: 60 % mỗi bước — 40 % còn lại cả hai chân trên không
  static RUN_LIFT_42D = 0.15;         // pha bay: hông nhấc thêm chừng ấy × chiều dài chân nhìn thấy (người lớn ~22 đơn vị, trẻ con ~14)
  static JUMP_LIFT_42D = 0.36;        // nhảy lên: cao chừng ấy × chiều dài chân nhìn thấy (`height` 1) — người lớn ~50 đơn vị, trẻ con ~32
  static DANCE_BPM_42D = 120;         // nhịp mặc định của `dance` (phách 0,5 s) — `{ bpm }` để khớp với bài nhạc
  static DANCE_LEAD_42D = 0.25;       // phách đầu tiên của `dance` rơi ở giây này của bước (quay ra trước máy quay xong)
  static DANCE_STYLES_42D = { happy: { arms: 1, bounce: 0.13, sway: 7, lift: 0.6 }, gentle: { arms: 0.6, bounce: 0.07, sway: 4, lift: 0.3 } };
  // Dáng chân chạy theo PHA của chân ấy (0 = chạm đất, gót đưa trước). Góc NHÌN THẤY (độ; đùi âm = ra trước, gối dương = gập) —
  // đổi ra góc khớp theo `coChan` lúc dùng, nên trẻ con chân ngắn không xoạc chân như cái kéo. 0 → 0,3: chân trụ (hông đi qua bàn
  // chân, gối nhún ở giữa, duỗi đạp đi); 0,3 → 0,55: gót đá lên sát mông; 0,7 → 0,85: GỐI NHẤC CAO; rồi duỗi ra đón đất.
  static _RUN_KEYS_42D = {
    dui: [[0, -20], [0.15, 0], [0.3, 22], [0.42, 22], [0.55, -4], [0.7, -38], [0.85, -40], [0.95, -27]],
    ong: [[0, 12], [0.15, 30], [0.3, 12], [0.42, 80], [0.55, 112], [0.7, 92], [0.85, 48], [0.95, 20]],
    tru: [[0, 1], [0.15, 1], [0.3, 1], [0.42, 0], [0.55, 0], [0.7, 0], [0.85, 0], [0.95, 0.6]],      // 1 = đang trụ (gối co theo sải)
  };
  static _RUN_F0_42D = 0.15;          // pha lúc xuất phát: chân trái trụ giữa bước, chân phải đang vung gối cao (cũng là pha lúc dừng — số bước nguyên)

  // Nội suy Catmull-Rom VÒNG (pha 0…1 lặp lại) qua các mốc [pha, giá trị] — khớp chuyển động liên tục, không dừng ở mỗi mốc.
  static _runLoop(keys, p) {
    p = ((p % 1) + 1) % 1;
    const n = keys.length;
    let i = 0;
    for (let k = 0; k < n; k++) if (keys[k][0] <= p) i = k;
    const at = (k) => { const j = ((k % n) + n) % n; return [keys[j][0] + Math.floor(k / n), keys[j][1]]; };
    const [p0, v0] = at(i - 1), [p1, v1] = at(i), [p2, v2] = at(i + 1), [p3, v3] = at(i + 2);
    const u = (p - p1) / (p2 - p1), u2 = u * u, u3 = u2 * u;
    const m1 = (v2 - v0) / (p2 - p0) * (p2 - p1), m2 = (v3 - v1) / (p3 - p1) * (p2 - p1);
    return (2 * u3 - 3 * u2 + 1) * v1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * v2 + (u3 - u2) * m2;
  }

  // Chiều dài chân NHÌN THẤY (đơn vị khung): đùi + ống + đế, sau `coChan`.
  _runLegSeen() {
    const nv = this.nv;
    return (DAI.dui * nv.daiDui + DAI.ong * nv.daiOng + 10 * nv.coBanChan) * nv.coChan;
  }

  /*
   * Dáng chạy là HÀM CỦA PHA (như `_tuTheDi`): f = pha (1 = hai bước), a = biên độ 0…1 (0 = đúng tư thế nghỉ), kA = sải đùi.
   * Trả về các kênh, độ sâu bàn chân (l, r), chỗ bàn chân so với hông (xL, xR) và chân nào đang trụ (`stance`, null = đang bay).
   * Hông đặt theo bàn chân thấp nhất (luôn có chân chạm đất như dáng đi), rồi PHA BAY nhấc cả người thêm `lift42d` — hai bàn chân
   * rời đất, bóng ở lại.
   */
  _tuTheChay(f, a, kA = 1) {
    const N = this.NGHI, nv = this.nv, cc = nv.coChan, P = 2 * Math.PI, K = RigSVG._RUN_KEYS_42D, c = RigSVG.RUN_CONTACT_42D;
    const Ld = DAI.dui * nv.daiDui, Lo = DAI.ong * nv.daiOng;
    // Góc nhìn thấy → góc khớp: nhóm chân bị co dọc `cc`, nên một đoạn xoay J nhìn ra atan2(sin J, cc·cos J) (xem `ck` dưới đây).
    // Đổi theo √cc chứ không theo cc: chân chibi co dọc mạnh thì đổi đủ cc làm gối gập ít trong khớp — bàn chân đang vung chỉ nhấc
    // khỏi sàn vài đơn vị, lê qua dưới hông (đo được). √cc: dáng hơi "hoạt hình" hơn ở trẻ con, nhưng gối nhấc cao đọc ra được.
    const ck = Math.sqrt(cc);
    const khop = (p) => {
      const V = RigSVG._runLoop(K.dui, p) * kA, B = RigSVG._runLoop(K.ong, p) * (1 - (1 - Math.min(1, kA)) * clamp(RigSVG._runLoop(K.tru, p), 0, 1));     // gối chân VUNG không co theo sải (quãng ngắn vẫn nhấc cao khỏi sàn); gối chân TRỤ co theo sải — sải ngắn mà gối vẫn nhún / duỗi đủ thì bàn chân trụ bị đẩy tới trước, trượt
      const J = Math.atan2(ck * Math.sin(V * RAD), Math.cos(V * RAD)) / RAD, S = Math.atan2(ck * Math.sin((V + B) * RAD), Math.cos((V + B) * RAD)) / RAD;
      return { dui: J, ong: S - J, V };
    };
    const L = khop(f), R = khop(f + 0.5);
    // Tay đánh NGƯỢC chân, theo chính đùi bên kia: đùi phải ra trước (V âm) thì tay trái ra trước. Khuỷu gập ~90° (`cang` −96).
    const tay = (V) => clamp(-(V + 9) / 31, -1.25, 1.25);
    const nhip = Math.cos(2 * P * (f - RigSVG._RUN_F0_42D - 0.02));                  // nhịp theo BƯỚC (2 lần mỗi chu kỳ)
    const than = 10 + 1.4 * nhip;                                                    // người đổ về trước, nhún theo bước
    const d = {
      duiL: L.dui, ongL: L.ong, duiR: R.dui, ongR: R.ong,
      vungL: 1.45 * tay(R.V), vungR: 1.45 * tay(L.V),
      batL: 7, batR: 7, cangL: -96, cangR: -96,
      than, dau: -0.6 * (than - 3) - 0.6 * nhip, dauY: 0.5 - 0.8 * nhip, vai: 0.8 * nhip,
    };
    const o = {};
    // GỐI vào dáng nhanh hơn đùi (×1,8): lúc tăng tốc / hãm lại, sải đùi còn nhỏ mà gối đã gập — chân đang vung nhấc khỏi sàn chứ
    // không quét lê trên sàn tới chỗ đặt (đo được: bàn chân vung lê 1,7 % chiều cao người một khung ở bước hãm cuối).
    const aK = Math.min(1, a * 1.8);
    for (const key in d) o[key] = N[key] + (d[key] - N[key]) * (key.startsWith('ong') ? aK : a);
    const de = (g, og) => {
      const ph = RigSVG._lanBanChan(g, og) * RAD;
      return nv.coBanChan * (Math.max(-8 * Math.sin(ph), 24 * Math.sin(ph)) + 10 * Math.cos(ph));
    };
    const tam = (g, og) => Ld * Math.cos(g * RAD) + Lo * Math.cos((g + og) * RAD) + de(g, og);
    const xa = (g, og) => -(Ld * Math.sin(g * RAD) + Lo * Math.sin((g + og) * RAD));
    const l = tam(o.duiL, o.ongL), r = tam(o.duiR, o.ongR);
    o.y = (Ld + Lo + 10 * nv.coBanChan - 0.5 * (l + r + Math.hypot(l - r, 3) - 3)) * cc;
    const pL = ((f % 1) + 1) % 1, pR = (((f + 0.5) % 1) + 1) % 1;
    const bay = (p) => (p >= c && p < 0.5 ? Math.sin(Math.PI * (p - c) / (0.5 - c)) : 0);
    o.lift42d = RigSVG.RUN_LIFT_42D * this._runLegSeen() * a * Math.max(bay(pL), bay(pR));
    return { o, l, r, xL: xa(o.duiL, o.ongL), xR: xa(o.duiR, o.ongR), stance: pL < c ? 'L' : pR < c ? 'R' : null };
  }

  // Biên độ theo số bước đã chạy: vào dáng trong NỬA bước đầu, ra dáng trong nửa bước cuối. Số bước nguyên, pha đầu 0,15 nên nửa
  // bước cuối là lúc một chân TRỤ giữa bước còn chân kia vừa đá gót lên cao — ra dáng thì chân ấy hạ THẲNG xuống cạnh chân trụ. Ra
  // dáng cả một bước thì chân vung hạ dần xuống sàn khi còn đang đưa ra trước: bàn chân lê trên sàn (đo được ~22 đơn vị một khung).
  _baoChay(buoc, vao = true, ra = true) {
    return (b) => (vao ? mem(b / 0.5) : 1) * (ra ? mem((buoc - b) / 0.5) : 1);
  }

  // Quãng hông đi được theo số bước nếu CHÂN TRỤ KHÔNG TRƯỢT: chân trụ trên đất thì hông đi đúng bằng phần bàn chân ấy lùi về
  // sau; pha bay thì đi tiếp đúng vận tốc của pha trụ (vật đang bay không đổi vận tốc ngang). Bảng theo pha — tua đâu cũng đúng.
  _bangChay(buoc, kA) {
    const M = 40, n = buoc * M, X = [0], bao = this._baoChay(buoc), c = RigSVG.RUN_CONTACT_42D, f0 = RigSVG._RUN_F0_42D;
    let tr = this._tuTheChay(f0, bao(0), kA);
    for (let i = 1; i <= n; i++) {
      const b = i / M, ht = this._tuTheChay(f0 + b / 2, bao(b), kA);
      let dx;
      if (ht.stance && ht.stance === tr.stance) dx = Math.max(0, tr['x' + ht.stance] - ht['x' + ht.stance]);
      else {
        const A = bao(b), s0 = this._tuTheChay(0, A, kA), s1 = this._tuTheChay(c, A, kA);
        dx = Math.max(0, s0.xL - s1.xL) / c * (0.5 / M);
      }
      X.push(X[i - 1] + dx);
      tr = ht;
    }
    return { tong: X[n], x: (b) => { const v = clamp(b, 0, buoc) * M, i = Math.min(n - 1, Math.floor(v)); return X[i] + (X[i + 1] - X[i]) * (v - i); } };
  }

  // Số bước và sải đùi để chạy vừa đúng `quang` đơn vị mà chân trụ không trượt (như `_doBuoc`).
  _doChay(quang) {
    let buoc = 2, b;
    do { buoc++; b = this._bangChay(buoc, 1); } while (b.tong * 1.04 < quang && buoc < 30);
    let kA = 1;
    for (let i = 0; i < 5; i++) { kA = clamp(kA * quang / b.tong, 0.2, 1.25); b = this._bangChay(buoc, kA); }
    return { buoc, kA, x: (v) => b.x(v) * (quang / b.tong) };
  }

  // Đặt `buoc` bước chạy vào timeline (mỗi bước h giây) — như `_di`: dáng đổ xuống qua SETTER của thuộc tính đang tween, nên tua
  // xuôi / ngược / nhảy cóc tới đâu cũng đúng. `chieu` −1: soi gương dáng chạy sang phải.
  _chay(t, at, buoc, h, { kA = 1, x = null, chieu = 1 } = {}) {
    const s = this.s, bao = this._baoChay(buoc), f0 = RigSVG._RUN_F0_42D;
    const busy = (side) => s.om >= 0.5 || (this.holds[side] && s['item' + side] > 0.5);
    const held = { L: busy('L'), R: busy('R') };
    const dat = (b) => {
      const o = this._tuTheChay(f0 + b / 2, bao(b), kA).o;
      if (chieu < 0) {
        const q = { ...o }, N = this.NGHI;
        for (const [l, r] of [['duiL', 'duiR'], ['ongL', 'ongR']]) { o[l] = -q[r]; o[r] = -q[l]; }
        o.vungL = q.vungR; o.vungR = q.vungL; o.batL = q.batR; o.batR = q.batL; o.cangL = q.cangR; o.cangR = q.cangL;
        o.than = N.than - (q.than - N.than); o.dau = N.dau - (q.dau - N.dau);
      }
      // CHÂN VUNG lúc vào / ra dáng: co hẳn lên (`nhac` rút ngắn cả chân quanh hông) — đầu bước nó nhấc THẲNG lên khỏi sàn, cuối bước
      // nó dừng trên không cạnh chân trụ rồi `_khep` hạ THẲNG xuống. Không có nó thì nửa bước ra dáng kéo bàn chân vung từ sau ra dưới
      // hông, chạm sàn khi còn đang lướt tới (đo được 10–14 đơn vị một khung).
      // Chân vung ở pha đầu: chân phải; ở pha cuối: chân không trụ (theo số bước chẵn / lẻ). Soi gương thì đổi bên.
      const flip = (k) => (chieu < 0 ? (k === 'L' ? 'R' : 'L') : k), pEnd = (((f0 + buoc / 2) % 1) + 1) % 1;
      o.nhacL = 0; o.nhacR = 0;
      if (b < 0.5) o['nhac' + flip('R')] = 0.5 * Math.sin(Math.PI * clamp(b / 0.5, 0, 1));
      else if (b > buoc - 0.5) o['nhac' + flip(pEnd < RigSVG.RUN_CONTACT_42D ? 'R' : 'L')] = 0.5 * (1 - bao(b));
      // Tay CẦM ĐỒ (hay đang bế thú) giữ dáng của nó: không đánh tay, không gập khuỷu chạy.
      for (const side of ['L', 'R']) if (held[side]) { delete o['bat' + side]; delete o['cang' + side]; o['vung' + side] *= s.om >= 0.5 ? 0 : 0.15; }
      Object.assign(s, o);
      if (x) s.x = x(b);
    };
    const pr = { _b: 0, get b() { return this._b; }, set b(v) { this._b = v; dat(v); } };
    t.to(pr, { b: buoc, duration: buoc * h, ease: 'none' }, at);
    return at + buoc * h;
  }

  /**
   * CHẠY: quay ngang, CHẠY THẬT (không phải đi nhanh) — có pha bay cả hai chân rời đất, gối nhấc cao, gót đá lên, hai tay gập
   * khuỷu đánh ngược chân, người đổ về trước, nhún theo bước — rồi dừng lại, quay về hướng cũ. `run(300)` chạy 300 đơn vị khung
   * sang phải, `run(-300)` sang trái (số bước tự chọn để chân trụ không trượt), `run()` chạy tại chỗ `steps` bước.
   * `{ speed }` 0,5…2 (1 = 0,3 s một bước). Đang ngồi / quỳ thì đứng dậy trước; đang cầm đồ thì tay ấy giữ đồ, không đánh tay.
   * Vị trí xuất phát đọc từ `s.x` lúc dựng (như `walk`); `x` ở lại chỗ chạy tới.
   */
  run(quang = 0, { speed = 1, steps = 6 } = {}) {
    // ĐỢT 43: `run(rig)` — chạy tới ĐỨNG CẠNH một nhân vật / con vật (rig hay mỏ neo `{ centerX, live }` của conversation), đo trên
    // màn hình lúc dựng, cách như tools/scene.py đổi `["run", "@cho"]` ra quãng: dừng cách nó nửa bề ngang thân nó + RUN_GAP_42D × nửa
    // chiều cao khung người chạy. Combo `rushToPet` trong `sequence()` cần nó (scene.py đã tự đổi ra số).
    if (quang && typeof quang === 'object' && typeof quang.centerX === 'function') {
      const live = quang.live || quang, frame = this.svg.getBoundingClientRect(), unit = Math.min(frame.width / KHUNG.w, frame.height / KHUNG.h) || 1;
      const box = live.svg && live.svg.getBoundingClientRect ? live.svg.getBoundingClientRect() : null;
      const dx = (quang.centerX() - this.centerX()) / unit, side = dx >= 0 ? 1 : -1;
      const half = box ? (live instanceof RigSVG ? 0.1 : 0.12) * box.height / unit : 0;       // nửa bề ngang thân nó, chừng
      quang = Math.round(dx - side * (half + RigSVG.RUN_GAP_42D * 0.5 * frame.height / unit));
    }
    if (typeof quang !== 'number' || !isFinite(quang)) throw new Error(`[character] run(distance): distance is a number of frame units (0 = on the spot, negative = to the left), or a character / pet to run up to — got ${JSON.stringify(quang)}`);
    if (!(typeof speed === 'number' && speed >= 0.5 && speed <= 2)) throw new Error(`[character] run(distance, { speed }): speed is a number from 0.5 to 2 — got ${JSON.stringify(speed)}`);
    if (!(Number.isInteger(steps) && steps >= 2 && steps <= 30)) throw new Error(`[character] run(0, { steps }): steps is a whole number from 2 to 30 — got ${JSON.stringify(steps)}`);
    if (this.s.ride > 0.5) throw new Error('[character] run: the character is riding a scooter — getOff() first');
    const t = this.tl(), s = this.s, chieu = quang < 0 ? -1 : 1, h = RigSVG.RUN_STEP_42D / speed, x0 = s.x;
    let at0 = 0;
    // Đang NGỒI / QUỲ: đứng dậy trước (chạy từ dáng ngồi là đùi nằm ngang lướt trên sàn).
    if (s.seat > 0.02 || s.kneel > 0.02) { t.to(s, { seat: 0, kneel: 0, dauY: 2.5, duration: 0.45, ease: 'power2.inOut' }, 0); at0 = 0.4; }
    t.to(s, { huong: chieu, cuoi: 0.7, mieng: 0.3, mayL: 0.45, mayR: 0.45, duration: 0.25, ease: 'power2.inOut' }, at0);
    const fists = ['L', 'R'].filter((side) => !(this.holds[side] && s['item' + side] > 0.5) && s.om < 0.5);
    if (fists.length) t.set(s, Object.fromEntries(fists.map((side) => ['tay' + side, 'nam'])), at0 + 0.12);
    let end;
    if (quang) {
      const d = this._doChay(Math.abs(quang));
      end = this._chay(t, at0 + 0.12, d.buoc, h, { kA: d.kA, chieu, x: (b) => x0 + chieu * d.x(b) });
    } else end = this._chay(t, at0 + 0.12, steps, h, { chieu });
    this._chop(t, at0 + 0.5);
    this._khep(t, 0.4, end, { x: x0 + quang, seat: 0, kneel: 0 });
    return t;
  }

  /**
   * NHẢY LÊN (mừng rỡ): khuỵu gối lấy đà, hai tay vung xuống ra sau — bật lên, hai tay vung cao, CẢ HAI BÀN CHÂN RỜI SÀN (gối co
   * lên giữa cú bay, bóng ở lại trên sàn và co lại) — tiếp đất gối gập đỡ lực, đứng thẳng lại. `times` lần (1…6), `{ height }`
   * 0,3…2 (1 ≈ 0,36 × chiều dài chân). Khác `cheer` (nhún nhẹ hai cái tại chỗ). Đang ngồi / quỳ: khuỵu đứng dậy rồi nhảy.
   * Tay cầm đồ giữ đồ, chỉ tay kia vung lên.
   */
  jump(times = 1, { height = 1 } = {}) {
    if (!(Number.isInteger(times) && times >= 1 && times <= 6)) throw new Error(`[character] jump(times): times is a whole number from 1 to 6 — got ${JSON.stringify(times)}`);
    if (!(typeof height === 'number' && height >= 0.3 && height <= 2)) throw new Error(`[character] jump(times, { height }): height is a number from 0.3 to 2 — got ${JSON.stringify(height)}`);
    if (this.s.ride > 0.5) throw new Error('[character] jump: the character is riding a scooter — getOff() first');
    const t = this.tl(), s = this.s, N = this.NGHI, H = RigSVG.JUMP_LIFT_42D * this._runLegSeen() * height;
    const free = ['L', 'R'].filter((side) => !(this.holds[side] && s['item' + side] > 0.5) && s.om < 0.5);
    const arms = (bat, cang) => Object.fromEntries(free.flatMap((side) => [['bat' + side, bat], ['cang' + side, cang]]));
    const hands = (shape) => Object.fromEntries(free.map((side) => ['tay' + side, shape]));
    const CROUCH = 0.34, up = 0.25, down = 0.22;                     // khuỵu (seat một phần) · bay lên · rơi xuống (giây)
    const sat = s.seat > 0.5 || s.kneel > 0.5;
    // LẤY ĐÀ: khuỵu gối, cúi đầu, hai tay vung xuống — bàn chân vẫn trên sàn (`seat` tự hạ hông đúng bằng phần đùi rút).
    let at = 0;
    const crouchFor = sat ? 0.42 : 0.26;
    // Nhảy mừng là nhảy VỀ PHÍA NGƯỜI XEM: đang quay 3/4 thì hai tay giơ chữ V thành dang ngang, đùi khuỵu thành gập ngang — quay ra
    // trước trong lúc lấy đà (`_khep` trả lại hướng cũ khi xong).
    this._faceFront(t, crouchFor);
    t.to(s, { seat: CROUCH, kneel: 0, than: N.than, dauY: 4, nhinY: 0.6, cuoi: 0.9, mieng: 0.15, mayL: 0.6, mayR: 0.6, ...arms(3, -6), duration: crouchFor, ease: 'power2.inOut' }, at);
    if (free.length) t.set(s, hands('mo'), at);
    at += crouchFor;
    for (let n = 0; n < times; n++) {
      // BẬT: duỗi gối (hông lên, chân còn trên sàn), tay vung lên chữ V — rồi rời sàn.
      t.to(s, { seat: 0, dauY: -3, nhinY: -0.6, mieng: 0.6, cuoi: 1, mayL: 0.9, mayR: 0.9, duration: 0.09, ease: 'power2.in' }, at);
      t.to(s, { ...arms(124, 6), vai: -5, duration: 0.2, ease: 'back.out(1.4)' }, at);
      if (free.length) t.set(s, hands('xoe'), at + 0.04);
      const off = at + 0.09;
      t.to(s, { lift42d: H, duration: up, ease: 'power2.out' }, off).to(s, { lift42d: 0, duration: down, ease: 'power2.in' }, off + up);
      // Giữa cú bay: gối CO lên về phía người xem (hai bàn chân lên khỏi sàn rõ hơn), mắt híp cười; duỗi ra trước khi chạm đất.
      t.to(s, { nhacL: 0.55, nhacR: 0.55, matY: 0.35, duration: up * 0.8, ease: 'sine.out' }, off + 0.03).to(s, { nhacL: 0, nhacR: 0, matY: 0, duration: down * 0.75, ease: 'sine.in' }, off + up);
      const land = off + up + down;
      // TIẾP ĐẤT: gối gập đỡ lực, tay hạ nửa chừng; lần nhảy sau lấy đà luôn từ cú khuỵu này.
      const last = n === times - 1;
      t.to(s, { seat: last ? 0.3 : CROUCH, dauY: 3, ...arms(last ? 32 : 8, last ? 14 : -6), vai: 0, duration: 0.11, ease: 'power2.out' }, land);
      at = land + (last ? 0.11 : 0.16);
    }
    t.to(s, { seat: 0, dauY: 0, duration: 0.3, ease: 'sine.inOut' }, at);
    this._chop(t, at + 0.1);
    this._khep(t, 0.4, at + 0.2, { seat: 0, kneel: 0, lift42d: 0 });
    return t;
  }

  /**
   * NHẢY MÚA một đoạn ngắn theo NHỊP (video mạng xã hội): quay ra trước máy quay, mỗi phách nhún gối một cái; ô nhịp lẻ BƯỚC CHẠM
   * (nhấc gối trái / phải luân phiên, người nghiêng theo, hai tay vung cùng sang một bên), ô nhịp chẵn LẮC HÔNG HAI TAY GIƠ CAO;
   * hai phách cuối XOAY MỘT VÒNG rồi TẠO DÁNG (một tay chỉ chéo lên trời, tay kia chống nạnh, nháy mắt). `bars` ô nhịp (4 phách
   * mỗi ô, 1…8), `style` 'happy' | 'gentle' (nhỏ hơn: người lớn tuổi). `{ bpm }` 60…180 (mặc định `RigSVG.DANCE_BPM_42D` = 120):
   * phách n rơi ở `DANCE_LEAD_42D + n × 60 / bpm` giây của bước — khớp nhạc nền. Bàn chân không rời chỗ (không trượt).
   * Đang ngồi: chỉ tay và đầu múa. Tay cầm đồ giữ đồ.
   */
  dance(style = 'happy', bars = 2, { bpm = RigSVG.DANCE_BPM_42D } = {}) {
    const S = RigSVG.DANCE_STYLES_42D[style];
    if (!S) throw new Error(`[character] dance(style): style is ${Object.keys(RigSVG.DANCE_STYLES_42D).map((k) => `'${k}'`).join(' or ')} — got ${JSON.stringify(style)}`);
    if (!(Number.isInteger(bars) && bars >= 1 && bars <= 8)) throw new Error(`[character] dance(style, bars): bars is a whole number from 1 to 8 — got ${JSON.stringify(bars)}`);
    if (!(typeof bpm === 'number' && bpm >= 60 && bpm <= 180)) throw new Error(`[character] dance(style, bars, { bpm }): bpm is a number from 60 to 180 — got ${JSON.stringify(bpm)}`);
    if (this.s.ride > 0.5) throw new Error('[character] dance: the character is riding a scooter — getOff() first');
    const t = this.tl(), s = this.s, N = this.NGHI, B = 60 / bpm, lead = RigSVG.DANCE_LEAD_42D, A = S.arms;
    const seated = s.seat > 0.5;
    const free = ['L', 'R'].filter((side) => !(this.holds[side] && s['item' + side] > 0.5) && s.om < 0.5);
    const arm = (side, bat, cang) => (free.includes(side) ? { ['bat' + side]: bat, ['cang' + side]: cang } : {});
    const hands = (shape, only = free) => Object.fromEntries(only.filter((side) => free.includes(side)).map((side) => ['tay' + side, shape]));
    this._faceFront(t, lead);
    t.to(s, { cuoi: 1, mieng: 0.35, mayL: 0.55, mayR: 0.55, duration: lead, ease: 'power2.out' }, 0);
    if (free.length) t.set(s, hands('xoe'), 0.05);
    const total = bars * 4, beat = (n) => lead + n * B;
    for (let n = 0; n < total; n++) {
      const at = beat(n), bar = Math.floor(n / 4), side = n % 2 ? 1 : -1, finish = n >= total - 2 && total >= 4;
      // NHÚN theo phách: gối khuỵu xuống ĐÚNG phách, đứng lên giữa hai phách (bàn chân yên trên sàn).
      if (!seated) t.to(s, { seat: S.bounce, duration: B * 0.3, ease: 'power2.out' }, at).to(s, { seat: 0, duration: B * 0.6, ease: 'sine.inOut' }, at + B * 0.3);
      if (finish && n === total - 2) {
        // XOAY MỘT VÒNG trong một phách: quay sang phải tới nghiêng hẳn, lật sang nghiêng trái (lúc quay lưng), về mặt trước.
        t.to(s, { ...arm('L', 18, -112), ...arm('R', 18, -112), than: N.than, dau: N.dau, duration: B * 0.25, ease: 'power2.out' }, at);
        t.to(s, { huong: 1, duration: B * 0.4, ease: 'power1.in' }, at).set(s, { huong: -1 }, at + B * 0.4).to(s, { huong: 0, duration: B * 0.5, ease: 'power1.out' }, at + B * 0.42);
        continue;
      }
      if (finish) {
        // TẠO DÁNG: tay rảnh (ưu tiên tay phải) chỉ chéo lên trời, tay kia chống nạnh, đầu nghiêng, nháy mắt.
        const k = free.includes('R') ? 'R' : free[0], o = k === 'R' ? 'L' : 'R', m = k === 'L' ? -1 : 1;
        t.to(s, { ...(k ? arm(k, 128 * A + 20, 12) : {}), ...(o ? arm(o, HIPS_POSE[0], HIPS_POSE[1]) : {}), than: N.than + m * 3, dau: N.dau + m * 8, cuoi: 1, mieng: 0.45, duration: B * 0.35, ease: 'back.out(1.8)' }, at);
        if (k) t.set(s, { ['tay' + k]: 'chi' }, at + 0.03);
        if (o && free.includes(o)) t.set(s, { ['tay' + o]: 'mo' }, at + 0.03);
        t.to(s, { [m > 0 ? 'nhayL' : 'nhayR']: 1, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 }, at + B * 0.5);
        continue;
      }
      if (bar % 2 === 0) {
        // BƯỚC CHẠM: nhấc gối một bên (phách chẵn trái, lẻ phải), người nghiêng sang chân trụ, hai tay vung cùng sang phía gối nhấc.
        const lift = side < 0 ? 'nhacL' : 'nhacR', other = side < 0 ? 'nhacR' : 'nhacL';
        if (!seated) t.to(s, { [lift]: S.lift, [other]: 0, duration: B * 0.3, ease: 'power2.out' }, at).to(s, { [lift]: 0, duration: B * 0.45, ease: 'sine.in' }, at + B * 0.45);
        const out = side < 0 ? 'L' : 'R', across = side < 0 ? 'R' : 'L';
        t.to(s, { ...arm(out, 70 + 40 * A, 30 * A), ...arm(across, 20, -95 - 20 * A), than: N.than - side * S.sway * 0.6, dau: N.dau + side * 6, dauX: side * 2,
                  duration: B * 0.45, ease: 'sine.inOut' }, at);
      } else {
        // LẮC HÔNG HAI TAY GIƠ CAO: thân lắc sang hai bên theo phách, hai bàn tay xoè trên đầu đung đưa ngược chiều, đầu nghiêng ngược.
        const high = 100 + 50 * A;
        t.to(s, { ...arm('L', high + side * 8, -12 + side * 14), ...arm('R', high - side * 8, -12 - side * 14), than: N.than + side * S.sway, dau: N.dau - side * 5, dauX: -side * 2,
                  duration: B * 0.5, ease: 'sine.inOut' }, at);
      }
      if (n % 4 === 1) this._chop(t, at + B * 0.6);
    }
    const end = beat(total);
    t.to(s, { seat: seated ? s.seat : 0, duration: 0.2 }, end);
    this._khep(t, 0.45, end + (total >= 4 ? 0.25 : 0), seated ? {} : { seat: 0, kneel: 0 });
    return t;
  }

});
