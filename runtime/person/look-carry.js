// runtime/person/look-carry.js — looking at a point (`lookAt`), carried pets, worn items (mask, cap, gloves), handing a pet over.
// Methods of `RigSVG`, installed by runtime/rig-svg.js: `this` is the rig, `RigSVG` its class.

import { KHUNG, DOI_Y, HONG, LOOK_DOWN, HANDOVER_AT, CARRY_ZOOM, UPRIGHT_HANDS, clamp, pha, mix } from './shared.js';

export default (RigSVG) => mix(RigSVG, class {
  // ═══════════════════════════════════════════════ ĐỢT 36 — NHÌN THEO MỘT ĐIỂM (`lookAt`)
  // Đầu QUAY (`headTurn`, cộng vào hướng thân), CÚI / NGẨNG (`headPitch`) và NGHIÊNG (`headTilt`) về một điểm; mắt đi theo. Ở cảnh
  // trung mặt chỉ ~1/6 khung: chỉ liếc mắt thì người xem (và Gemini, ~1 khung / giây) đọc thành "nhìn thẳng ra máy quay".
  static LOOK_YAW = 0.75;         // tổng hướng đầu khi đích ở hẳn một bên (đơn vị `huong`: 1 = nghiêng hẳn) — ≈ 3/4, đọc ra ở cảnh trung
  static LOOK_TURN_MAX = 0.9;     // đầu quay thêm tối đa bấy nhiêu so với thân
  static LOOK_PITCH_DEG = 32;     // đích thấp hơn mặt chừng ấy độ (so với phương ngang) → cúi hẳn (`headPitch` 1)
  static LOOK_STEEP_MIN44A = 0.3; // đợt 44 A: nhìn xuống đích rất dốc (`steep44a`) — đầu vẫn quay về phía đích ít nhất chừng ấy (≈ 27°)
  static LOOK_UP = 0.6;           // ngẩng tối đa (`headPitch` −0,6)
  static PITCH_SHIFT = 12;        // `headPitch` 1: cụm nét mặt trượt xuống bấy nhiêu đơn vị đầu (đầu cũng hạ 3)
  static LOOK_TILT = 7;           // nhìn chếch xuống sang bên: nghiêng đầu thêm tối đa bấy nhiêu độ
  static LOOK_DUR = 0.35;

  // TÂM MẶT trong hệ của `_aimOf` (khung 400 × 470, trừ `DOI_Y` và `s.y`), ở trạng thái hiện tại; `huong` cho trước thì ở hướng ấy.
  _faceCentre(huong = this.s.huong) {
    const nv = this.nv, s = this.s;
    return { x: HONG.x + (s.dauX + huong * 2.5) * nv.coThan,
             y: HONG.y + this.hangChan() + this._lowered() + (nv.coDau * -62 + (-103 + nv.dauLech) + s.dauY) * nv.coThan,
             r: 64 * nv.coDau * nv.coThan };
  }

  // ĐÍCH NHÌN → điểm trong hệ của `_aimOf`, hay null (nhìn thẳng). Nhận: { x, y } trong khung (kể cả `set.target(…)` /
  // `set.targetPoint(…)`), một rig (đầu nó), 'L' / 'R' (bàn tay mình — đồ đang cầm), một phần tử trang hay DOMRect.
  _lookPoint(target) {
    const s = this.s;
    if (target === null || target === undefined || target === 'front') return null;
    if (target === 'L' || target === 'R') {
      const el = this.el['coTay' + target];
      const q = el && el.getScreenCTM && this.svg.getScreenCTM ? this.svg.getScreenCTM() : null;
      if (!q) return null;
      const p = new DOMPoint(0, 10).matrixTransform(q.inverse().multiply(el.getScreenCTM()));
      return { x: p.x - s.x, y: p.y - s.y - DOI_Y };
    }
    let muc = target;
    if (muc && muc.svg && muc.el) muc = muc.el.dau || muc.svg;
    if (muc && typeof muc.x === 'number' && typeof muc.y === 'number' && !(typeof Element !== 'undefined' && muc instanceof Element)) {
      const x = muc.x, y = muc.y;
      return Number.isFinite(x) && Number.isFinite(y) ? { x: x - s.x, y: y - s.y - DOI_Y } : null;
    }
    if (muc && (muc instanceof Element || typeof muc.left === 'number')) {
      const r = muc instanceof Element ? muc.getBoundingClientRect() : muc, sv = this.svg.getBoundingClientRect();
      const k = Math.min(sv.width / KHUNG.w, sv.height / KHUNG.h) || 1, ox = sv.left + (sv.width - KHUNG.w * k) / 2, oy = sv.top + (sv.height - KHUNG.h * k) / 2;
      const x = (r.left + r.width / 2 - ox) / k - s.x, y = (r.top + r.height / 2 - oy) / k - s.y - DOI_Y;
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    }
    throw new Error(`[character] lookAt(target): target must be a rig, { x, y } in the 400 × 470 frame, 'L' / 'R' (own hand), an element, a DOMRect, 'front' or null — got ${JSON.stringify(target)}`);
  }

  // GÓC NHÌN tới một điểm (hệ `_aimOf`): kênh đầu + mắt. `huong`: hướng THÂN lúc ấy (động tác quay người cùng lúc nhìn).
  // Đích ở một bên → tổng hướng đầu tới `LOOK_YAW` về phía ấy (thân đã quay xa hơn về phía ấy thì giữ); đích ngay trước / dưới mặt
  // → giữ hướng thân, chỉ cúi. Cúi theo góc từ mặt xuống đích.
  _lookAngles(point, { head = 1, eyes = 1, huong = this.s.huong, up = RigSVG.LOOK_UP, steep44a = false } = {}) {
    const N = this.NGHI;
    if (!point) return { headTurn: 0, headPitch: 0, headTilt: 0, matY: N.matY, nhinX: N.nhinX, nhinY: N.nhinY };
    const f = this._faceCentre(huong), dx = point.x - f.x, dy = point.y - f.y, side = dx < 0 ? -1 : 1;
    const w = clamp((Math.abs(dx) - f.r * 0.25) / (f.r * 1.1), 0, 1);       // đích lệch sang bên bao nhiêu (0: trước mặt, 1: hẳn một bên)
    const full = side * Math.max(RigSVG.LOOK_YAW, side * huong > 0 ? Math.abs(huong) : 0);
    let total = huong * (1 - w) + full * w;
    // ĐỢT 44 A — ĐÍCH DỐC HƠN ĐẦU CÚI ĐƯỢC (`steep44a`: chậu tắm dưới sàn cạnh chân): cúi hẳn rồi mà đầu vẫn quay ngang 3/4 thì hướng nhìn
    // trên hình chỉ chúc ~33° — nhìn qua đầu con vật. Quay mặt VỀ PHÍA NGƯỜI XEM bớt (đầu quay ngược thân) cho hướng nhìn (quay θ, cúi hẳn
    // φ = LOOK_PITCH_DEG) chiếu lên màn hình đúng hướng tới đích: sin θ = (ngang / dọc) · tan φ — như người cúi nhìn xuống chân mình.
    if (steep44a && dy > 0 && Math.abs(dx) > 1e-6) {
      const lean = Math.atan2(dy, Math.abs(dx)), max = RigSVG.LOOK_PITCH_DEG * Math.PI / 180;
      if (lean > max) total = side * Math.max(RigSVG.LOOK_STEEP_MIN44A, Math.min(Math.abs(total), Math.asin(Math.min(1, Math.tan(max) / Math.tan(lean))) * 2 / Math.PI));
    }
    const headTurn = clamp(total - huong, -RigSVG.LOOK_TURN_MAX, RigSVG.LOOK_TURN_MAX) * head;
    const angle = Math.atan2(dy, Math.max(Math.abs(dx), f.r * 0.8)) * 180 / Math.PI;
    const headPitch = clamp(angle / RigSVG.LOOK_PITCH_DEG, -up, 1) * head;
    const headTilt = -side * RigSVG.LOOK_TILT * Math.max(0, headPitch) * w * head;
    // Nhìn xuống thì mí mắt hạ theo (như `LOOK_DOWN`) — mắt mở tròn mà con ngươi dồn xuống đọc thành trợn mắt.
    return { headTurn, headPitch, headTilt, matY: N.matY + Math.max(0, headPitch) * LOOK_DOWN.lids * eyes,
             nhinX: N.nhinX + clamp(dx * 0.035, -3, 3) * eyes, nhinY: N.nhinY + clamp(dy * 0.03, -1.5, 2.6) * eyes };
  }

  /** Góc nhìn tới `target` ở trạng thái hiện tại (công khai cho công cụ đo / trang thử): { headTurn, headPitch, headTilt, nhinX, nhinY }. */
  lookAngles(target, options = {}) { return this._lookAngles(this._lookPoint(target), options); }

  // Trong một động tác: NHÌN tới điểm `point` (hệ `_aimOf`) từ giây `at`.
  _lookTo(t, point, at, { d = RigSVG.LOOK_DUR, huong = this.s.huong, head = 1, eyes = 1, ease = 'power2.inOut', up = RigSVG.LOOK_UP, steep44a = false } = {}) {
    t.to(this.s, { ...this._lookAngles(point, { head, eyes, huong, up, steep44a }), duration: d, ease }, at);
  }

  /**
   * NHÌN THEO MỘT ĐIỂM: QUAY và NGHIÊNG ĐẦU (không chỉ mắt) về `target` — `{ x, y }` trong khung 400 × 470 (hay `set.target(…)`,
   * `set.targetPoint(…)` trong bối cảnh 3D), một rig khác (đầu nó), 'L' / 'R' (bàn tay mình, đồ đang cầm), một phần tử trang;
   * `null` / 'front' = thôi nhìn, đầu về nghỉ. Thân đứng yên; đầu quay tới ~3/4 về phía đích ở một bên, cúi / ngẩng theo độ cao
   * của nó (tới ~30°), mắt đi theo.
   *   `head` / `eyes` 0…1: phần đầu / mắt (0 = chỉ liếc mắt; 0,5 = nửa chừng). `dur`: giây quay tới.
   *   `up` 0…1,5: ngẩng tối đa (`headPitch` −`up`; mặc định `LOOK_UP`) — đợt 38 C: trẻ con nhìn lên người lớn đứng sát cho 1,5.
   *   `hold`: giữ chừng ấy giây rồi tự về; bỏ trống = GIỮ như một thế (như `face`) — về nghỉ khi động tác khác bắt đầu (trong
   *   `sequence()`) hay `lookAt(null)`.
   */
  lookAt(target = null, { head = 1, eyes = 1, dur = RigSVG.LOOK_DUR, hold = null, up = RigSVG.LOOK_UP } = {}) {
    if (!(Number.isFinite(head) && Number.isFinite(eyes))) throw new Error('[character] lookAt: head and eyes must be numbers 0…1');
    if (!(Number.isFinite(dur) && dur > 0)) throw new Error(`[character] lookAt: dur must be a number of seconds > 0, got ${JSON.stringify(dur)}`);
    if (hold !== null && !(Number.isFinite(hold) && hold >= 0)) throw new Error(`[character] lookAt: hold must be a number of seconds ≥ 0 or null (keep looking), got ${JSON.stringify(hold)}`);
    const t = this.tl(), point = this._lookPoint(target);
    this._lookTo(t, point, 0, { d: dur, head: clamp(head, 0, 1), eyes: clamp(eyes, 0, 1), up: clamp(+up || 0, 0, 1.5) });
    if (hold === null) return t;
    if (hold > 1) this._chop(t, dur + hold * 0.5);
    this._lookTo(t, null, dur + hold, { d: dur });
    return t;
  }
  static LOOK_KEYS = ['headTurn', 'headPitch', 'headTilt'];

  // LẦN BẾ (đợt 37): `carry` / `takePet` ghi một mục mới vào `carriedList` và bật `omSlot` tới nó từ đầu bước. Trước đây chỉ có
  // một `this.carried`, ghi lúc DỰNG: một lần bế về sau (trả con vật cho chủ sau khi cân) ghi đè nó, và lúc phát các khung của lần
  // cân đọc lần bế mới — mất `scale`, con vật về lại bàn thay vì đứng trên cân (combo `vaccinationVisit` + `dischargePet`).
  // Lần bế GIỐNG HỆT đã có (`sequence()` dựng mỗi bước hai lần: bản nháp rồi bản thật) thì dùng lại số của nó — như `readoutN`:
  // gọi thẳng và qua `sequence()` ra cùng một `omSlot` (tools/check.html so từng kênh).
  _holdEntry(t, entry) {
    const list = this.carriedList || (this.carriedList = []);
    const key = (item) => JSON.stringify({ from: item.from, reach: item.reach, at: item.at, middle: item.middle, facing: item.facing });
    let n = list.findIndex((item) => item.pet === entry.pet && item.host === entry.host && item.giver === entry.giver && key(item) === key(entry));
    // Dùng lại NGUYÊN mục cũ (không ghi đè, không xoá trường): `scale` (cân) và `receiver` (trao) gắn thêm vào nó chỉ có tác dụng khi
    // `omScale` / `omGive` bật — một lần bế sau trùng chỗ với lần cân không làm mất cái cân của nó.
    if (n < 0) { list.push(entry); n = list.length - 1; }
    this.carried = list[n];
    // Ghi cả vào trạng thái LÚC DỰNG: `_khep` cuối bước giữ `omSlot` đang có — không thì cuối bước nó về lần bế trước.
    this.s.omSlot = n;
    t.set(this.s, { omSlot: this.s.omSlot }, 0);
  }

  // Lần bế của khung đang vẽ.
  _carriedNow() {
    const list = this.carriedList;
    if (!list || !list.length) return this.carried;
    return list[clamp(Math.round(this.s.omSlot || 0), 0, list.length - 1)] || this.carried;
  }

  // ĐẶT CON VẬT ĐANG BẾ vào đúng chỗ (gọi trong `apDung`, là hàm của trạng thái): `om` ≥ 0,5 thì SVG của nó nằm trong
  // ngăn `om` (giữa thân và hai tay), ở vị trí trượt từ chỗ nó đứng (`from`) lên trước bụng theo `omRise`; dưới 0,5 thì
  // trả nó về host của nó, đúng như cũ. Ngăn mang phép biến đổi NGƯỢC của `tren` nên bên trong là hệ toạ độ của SVG gốc.
  _placeCarried() {
    const c = this._carriedNow(), e = this.el, s = this.s;
    if (!c || !e.om) return;
    // Con vật của một lần bế KHÁC còn nằm trong ngăn (tua qua chỗ đổi lần bế): trả nó về host của nó trước.
    for (const node of [...e.om.children]) {
      if (node === c.pet.svg) continue;
      const owner = (this.carriedList || []).find((item) => item.pet.svg === node);
      if (owner) { owner.host.appendChild(node); for (const [name, value] of owner.attrs) value === null ? node.removeAttribute(name) : node.setAttribute(name, value); owner.pet.apDung(); }
    }
    const pet = c.pet, inside = pet.svg.parentNode === e.om;
    if (s.om < 0.5) {
      pet.carrier = null;                                          // đợt 40 C
      if (inside) { c.host.appendChild(pet.svg); for (const [name, value] of c.attrs) value === null ? pet.svg.removeAttribute(name) : pet.svg.setAttribute(name, value); pet.apDung(); }
      if (e.om.hasAttribute('transform')) e.om.removeAttribute('transform');      // đợt 46: ngăn trống về trạng thái cố định (như `xaCang`)
      return;
    }
    if (!inside) { e.om.appendChild(pet.svg); }
    pet.carrier = this;                                            // đợt 40 C: con vật biết ai đang bế nó (vẽ lại người bế khi nó vùng vẫy — rig-thu.js)
    const toRoot = this.svg.getScreenCTM && e.tren.getScreenCTM ? this.svg.getScreenCTM().inverse().multiply(e.tren.getScreenCTM()) : null;
    if (!toRoot) return;
    const m = toRoot.inverse();
    e.om.setAttribute('transform', `matrix(${[m.a, m.b, m.c, m.d, m.e, m.f].map((v) => v.toFixed(4)).join(' ')})`);
    // Trước bụng: điểm (0, −60) của hệ `than` (hông ở gốc), đổi sang hệ SVG gốc.
    const lift = e.tren.transform.baseVal.consolidate(), fromThan = toRoot.multiply(lift ? lift.matrix.inverse() : new DOMMatrix());
    const belly = new DOMPoint(0, -62).matrixTransform(fromThan);
    // Lúc ôm, con vật PHÓNG TO dần tới `CARRY_ZOOM` theo độ nhấc: đúng tỉ lệ thì một con mèo trước ngực một người chibi
    // chỉ bằng nửa bề ngang thân, chìm vào áo (cùng một lối "nói dối" như điện thoại phóng to khi khoe màn hình).
    // CHỖ Ở NHÀ ĐO LẠI MỖI KHUNG (đợt 35, lượt bốn): host của con vật vẫn nằm đúng chỗ nó đứng (bối cảnh 3D đặt nó theo máy quay của
    // khung này). Đo một lần lúc dựng bước thì lúc phát (máy đã đổi góc) chỗ ấy lệch — con vật nhảy một khúc lúc vào tay / lúc
    // được đặt xuống (5,7 % chiều cao người giữa hai khung).
    let from = c.from;
    const hostBox = c.host && c.host.getBoundingClientRect ? c.host.getBoundingClientRect() : null;
    if (hostBox && hostBox.width > 0 && hostBox.height > 0 && this.svg.getScreenCTM && !c.giver) {
      const inv = this.svg.getScreenCTM().inverse(), p0 = new DOMPoint(hostBox.left, hostBox.top).matrixTransform(inv), p1 = new DOMPoint(hostBox.right, hostBox.bottom).matrixTransform(inv);
      from = { x: p0.x, y: p0.y, w: p1.x - p0.x, h: p1.y - p0.y };
    }
    const down = (s.omHome || 0) > 0.5, rise = clamp(s.omRise, 0, 1), grow = c.giver && !down ? CARRY_ZOOM : pha(1, CARRY_ZOOM, rise), w = from.w * grow, h = from.h * grow;
    // Nhận con vật TỪ TAY NGƯỜI KHÁC (`takePet`): nó trượt từ trước bụng người trao (đo trên màn hình, ở khung này) về
    // trước bụng người nhận, giữ nguyên cỡ đang bế — không từ chỗ nó đứng dưới đất.
    let fromX = from.x, fromY = from.y;
    // Con vật ĐÃ ĐI trong khung của nó (`walk`: hình vẽ dời s.x đơn vị khung — con mèo đi tới người ngồi sofa). Đang được bế
    // thì hình nó KHÔNG dời nữa (RigThu.apDung), nên chỗ XUẤT PHÁT (`from`, khung ở nhà) phải cộng phần dời ấy — con vật bắt
    // đầu được nhấc lên từ đúng chỗ nó đứng; các đích (trước bụng, điểm giao) thì không (đợt 29).
    const box = pet.svg.viewBox && pet.svg.viewBox.baseVal, offX = box && box.width ? ((pet.s.x || 0) + (typeof pet.dropX === 'function' ? pet.dropX() : 0)) * w / box.width : 0, offY = box && box.height ? (pet.s.y || 0) * h / box.height : 0;
    fromX += offX; fromY += offY;
    // CÂN (`weigh`, đợt 35): trong lúc đặt lên / nhấc khỏi cân, chỗ "nhà" là MẶT BỆ CÂN — khung con vật đặt sẵn sao cho chân nó
    // (hình chưa dời, như lúc được bế) đứng giữa bệ (`c.scale`, tính lúc dựng).
    if (c.scale && (s.omScale || 0) >= 0.5) { fromX = c.scale.x; fromY = c.scale.y; }
    const toMine = (p) => p && new DOMPoint(p.x, p.y).matrixTransform(this.svg.getScreenCTM().inverse());
    // Nhận: con vật bắt đầu từ ĐIỂM GIỮA hai người — nơi người trao đã đưa nó ra (xem `omGive` bên dưới).
    if (c.giver && !down) {
      const q = toMine(RigSVG._meetPoint(c.giver, this));
      if (q) { fromX = q.x - w * c.middle; fromY = q.y - h * 0.66; }
    }
    // Thân con vật nằm TRÊN hai cẳng tay: đáy khung của nó (chân) ngay dưới đường cẳng tay.
    // ĐẦU con vật vào giữa ngực người bế (thân và đuôi sang một bên); đầu ở ngang ngực, không che cằm.
    let x = pha(fromX, belly.x - w * c.middle, rise), y = pha(fromY, belly.y - h * 0.66, rise);
    // Trao: từ trước bụng trượt ra điểm giữa hai người theo `omGive`.
    const give = clamp(s.omGive || 0, 0, 1);
    if (give && c.receiver) {
      const q = toMine(RigSVG._meetPoint(this, c.receiver));
      if (q) { x = pha(x, q.x - w * c.middle, give); y = pha(y, q.y - h * 0.66, give); }
    }
    for (const [name, value] of [['x', x], ['y', y], ['width', w], ['height', h]]) pet.svg.setAttribute(name, value.toFixed(2));
    pet.svg.style.overflow = 'visible';
    // Dáng cuộn trong tay đến DẦN theo độ nhấc (đợt 35, lượt bốn): vào tay mà đổi dáng ngay thì con vật như dịch tức thời vào tay.
    const blend = c.giver && !down ? 1 : rise;
    if (pet.heldBlend !== blend) { pet.heldBlend = blend; pet.apDung(); }
    else if (!inside) pet.apDung();
  }

  // Đưa SVG con vật về host của chính nó (bỏ vị trí / cỡ của thế bế) nếu nó đang nằm trong tay ai đó.
  static _homePet(pet) {
    if (!pet.svg.ownerSVGElement || !pet.host) return;
    pet.host.appendChild(pet.svg);
    for (const [name, value] of pet.homeAttrs || []) value === null ? pet.svg.removeAttribute(name) : pet.svg.setAttribute(name, value);
    pet.apDung();
  }

    // KHẨU TRANG y tế: phủ từ sống mũi xuống dưới cằm miệng, ba nếp gấp, hai quai vòng ra tai. Nằm trong nhóm nét mặt
  // (`net`) nên đi theo mặt khi quay. Ẩn cho tới khi `wear('mask')`.
  _veKhauTrang(p) {
    // Mép trên NGAY DƯỚI MẮT (mặt chibi: mũi nằm sát mắt — lấy mũi làm mốc thì khẩu trang che nửa con mắt), mép dưới qua
    // khỏi miệng một chút; bề ngang vừa tới hai má.
    const nv = this.nv, top = Math.max(nv.muiY - 2, nv.matY + 14 * (nv.matCo || 1)), bottom = nv.miengY + 13, half = nv.maX + 1;
    const folds = [0.3, 0.55, 0.8].map((k) => { const y = top + (bottom - top) * k; return `M ${-half + 5} ${y.toFixed(1)} Q 0 ${(y + 3).toFixed(1)} ${half - 5} ${y.toFixed(1)}`; }).join(' ');
    return `<g id="${p}-khauTrang" style="display:none">
              <path d="M ${-half} ${top + 4} Q 0 ${top - 6} ${half} ${top + 4} L ${half - 3} ${bottom - 6} Q 0 ${bottom + 4} ${-half + 3} ${bottom - 6} Z" fill="#cfe6f5" stroke="#8fb6cf" stroke-width="1.4" stroke-linejoin="round"/>
              <path d="${folds}" stroke="#9fc3d9" stroke-width="1.1" fill="none" stroke-linecap="round"/>
              <path d="M ${-half} ${top + 6} L ${-nv.taiX + 4} ${top - 2} M ${-half + 2} ${bottom - 8} L ${-nv.taiX + 4} ${top + 6} M ${half} ${top + 6} L ${nv.taiX - 4} ${top - 2} M ${half - 2} ${bottom - 8} L ${nv.taiX - 4} ${top + 6}" stroke="#e8f2f8" stroke-width="1.6" stroke-linecap="round"/>
            </g>`;
  }

  // MŨ PHẪU THUẬT (mũ trùm tóc): một vòm vải ôm đỉnh đầu, trùm cả búi tóc, viền thắt ở trán. Trong nhóm mũ (`muG`), đi
  // theo mái tóc. Ẩn cho tới khi `wear('cap')`.
  _veMuMo(p) {
    const w = this.nv.taiX + 6;
    return `<g id="${p}-muMo" style="display:none">
              <path d="M ${-w} -22 Q ${-w - 8} -88 -10 -104 Q 0 -110 10 -104 Q ${w + 8} -88 ${w} -22 Q 0 -40 ${-w} -22 Z" fill="#5fb3a5" stroke="#3d8578" stroke-width="1.6" stroke-linejoin="round"/>
              <path d="M ${-w + 2} -26 Q 0 -44 ${w - 2} -26" stroke="#3d8578" stroke-width="3" fill="none" stroke-linecap="round"/>
              <path d="M -24 -80 q 8 6 16 0 M 6 -88 q 8 6 16 0 M -14 -60 q 8 6 16 0" stroke="#7cc6b9" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>
            </g>`;
  }

  /**
   * ĐEO / THÁO phụ kiện — có hiệu lực ngay và suốt mọi động tác (không phải một bước trên timeline):
   *   wear('mask')  khẩu trang y tế     wear('gloves')  găng tay y tế     wear('cap')  mũ phẫu thuật
   *   wear('mask', false) tháo ra. Trả về chính rig.
   */
  wear(kind, on = true) {
    if (!RigSVG.WEARABLES.includes(kind)) throw new Error(`[character] wear: no accessory "${kind}" (available: ${RigSVG.WEARABLES.join(', ')})`);
    if (on) this.wearing.add(kind); else this.wearing.delete(kind);
    // Đợt 38 B: găng là KÊNH trạng thái (`gloveL/R`) — `putOnGloves` / `takeOffGloves` đổi nó trên timeline; `wear` đặt nó ngay, cả ở
    // tư thế nghỉ (`datNghi()` không tháo găng).
    if (kind === 'gloves') { const v = on ? 1 : 0; this.NGHI = Object.freeze({ ...this.NGHI, gloveL: v, gloveR: v }); Object.assign(this.s, { gloveL: v, gloveR: v }); }
    this._applyWear();
    return this;
  }
  static WEARABLES = ['mask', 'gloves', 'cap'];
  _applyWear() {
    const e = this.el;
    if (!e) return;
    if (e.khauTrang) e.khauTrang.style.display = this.wearing.has('mask') ? '' : 'none';
    if (e.muMo) e.muMo.style.display = this.wearing.has('cap') ? '' : 'none';
    this._veGang(e, this.s);
  }

  // ĐỢT 38 B: GĂNG trên từng bàn tay theo kênh `gloveL/R` (≥ 0,3: bàn tay xanh; mép găng trượt từ giữa bàn tay lên cổ tay tới 1, quá
  // cổ tay lúc búng > 1) và ĐÁM BỌT (`foam`) của dụng cụ 14. Hàm của trạng thái — tua tới khung nào cũng vẽ đúng.
  _veGang(e, s) {
    if (!e || !this.svg) return;
    let any = false;
    for (const side of ['L', 'R']) {
      const g = +(s['glove' + side] || 0), on = g >= 0.3;
      any = any || on;
      this.svg.classList.toggle(this.id + '-glove' + side, on);
      const cuff = e.tayG && e.tayG[side] && (e['cuff' + side] || (e['cuff' + side] = e.tayG[side].querySelector('[data-cuff]')));
      if (!cuff) continue;
      const grip = this.holds[side] && s['item' + side] > 0.5, upright = !grip && UPRIGHT_HANDS.includes(s['tay' + side]);
      cuff.style.display = on && !upright ? '' : 'none';
      if (on) cuff.setAttribute('transform', `translate(0 ${(16 - 19 * (g - 0.3) / 0.7).toFixed(2)})`);
      const foam = e['gadget' + side] && Math.round(s['gadget' + side]) === 14 ? e['gadget' + side].querySelector('[data-foam]') : null;
      if (foam) { const k = Math.max(0.05, +(s.foam || 0)) * 1.25; foam.setAttribute('transform', `translate(0 10) scale(${k.toFixed(3)}) translate(0 -10)`); }
    }
    this.svg.classList.toggle(this.id + '-gloved', any);
  }

  // Điểm "trước bụng" (nơi con vật nằm khi bế) TRÊN MÀN HÌNH, ở trạng thái đang vẽ — cho người nhận con vật (`takePet`).
  _bellyScreen() {
    const e = this.el, ctm = e.tren && e.tren.getScreenCTM && e.tren.getScreenCTM();
    if (!ctm) return null;
    const lift = e.tren.transform.baseVal.consolidate();
    return new DOMPoint(0, -62).matrixTransform(ctm.multiply(lift ? lift.matrix.inverse() : new DOMMatrix()));
  }

  // Điểm GIAO con vật trên màn hình: giữa trước-bụng của người trao và của người nhận.
  static _meetPoint(giver, receiver) {
    const a = giver._bellyScreen(), b = receiver._bellyScreen();
    return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a || b;
  }

  // Hai cánh tay đưa ra về phía người kia, ngang bụng (trao / nhận con vật đang bế).
  _offerArms(t, other, at = 0) {
    const s = this.s;
    for (const k of ['L', 'R']) {
      const pose = this._meetAngles(other, k, 0.42);
      if (!pose) continue;
      t.to(s, { ['aim' + k]: 1, ['bat' + k]: pose.bat, ['cang' + k]: pose.cang, duration: 0.45, ease: 'power2.inOut' }, at);
    }
  }

  /**
   * TRAO con vật đang bế (`carry`) sang tay người kia `other` — chạy cùng nhịp với `other.takePet(this)` trong một
   * `together`: hai tay đưa con vật về phía người ấy, nhả ra đúng lúc người kia đỡ lấy (0,55 s), rồi về dáng nghỉ.
   */
  handOverPet(target) {
    // `target`: rig người nhận, hay MỎ NEO của conversation ({ centerX, live }) mang chỗ họ đứng ở lượt này — tay đưa ra đúng
    // chỗ ấy, không phải chỗ hình SVG của họ vẽ lần cuối lúc dựng (đợt 29).
    const s = this.s, c = this.carried, other = target && target.live ? target.live : target;
    if (!c || s.om < 0.5) throw new Error('[character] handOverPet: the character is not carrying a pet — carry(pet) first');
    if (!other || !(other instanceof RigSVG) || other === this) throw new Error('[character] handOverPet(other): other must be another person rig (createCharacter(...).rig)');
    const t = this.tl(), dir = this._towards(target, 'R');
    // Hai tay đưa con vật ra ĐIỂM GIỮA hai người (`omGive`; hạ `omRise` thì nó lại trượt về chỗ nó đứng dưới sàn), người
    // ngả theo; người nhận vươn tay ra đón nó ở đó (`takePet`).
    c.receiver = other;
    this._offerArms(t, target, 0);
    t.to(s, { omGive: 1, than: this.NGHI.than - dir * 5, dau: this.NGHI.dau - dir * 4, nhinX: dir * 2, cuoi: 1, duration: 0.5, ease: 'power2.inOut' }, 0);
    t.set(s, { om: 0 }, HANDOVER_AT);                                         // người kia đã đỡ: con vật sang tay họ
    this._khep(t, 0.45, HANDOVER_AT + 0.1, { om: 0, omRise: 0, omGive: 0 });
    return t;
  }

  /**
   * NHẬN con vật từ tay người đang bế nó (`giver`), trong cùng một `together` với `giver.handOverPet(this)`: đưa hai tay
   * ra đỡ, con vật sang tay ở 0,55 s rồi được ôm vào trước ngực — và GIỮ (thế bế, như `carry`). `putDown()` đặt nó về chỗ
   * cũ của nó (chỗ nó đứng lúc được bế lên lần đầu).
   */
  // `petAt`: chỗ con vật đứng lúc được bế, tính bằng phần dời `s.x` của nó (đơn vị khung của nó) — lúc dựng bước này trạng thái
  // nó có thể đã về khung 0 (tools/scene.py điền; bỏ trống thì đọc `s.x` của nó).
  takePet(source, { petAt = null } = {}) {
    const giver = source && source.live ? source.live : source, from = giver && giver.carried;
    // Không xét `giver.s.om`: lúc dựng bước này, rig của người trao có thể đang ở trạng thái đầu cảnh (`sequence()` của
    // họ trả rig về khung 0 sau khi dựng) — chỉ cần họ đã `carry` một con vật.
    if (!(giver instanceof RigSVG) || !from) throw new Error('[character] takePet(giver): the giver is not carrying a pet — run giver.carry(pet) first, then takePet together with giver.handOverPet');
    const t = this.tl(), s = this.s, dir = this._towards(source, 'R');
    const scale = (giver.svg.getScreenCTM().a || 1) / (this.svg.getScreenCTM().a || 1);       // đơn vị khung của người trao → của người nhận
    // CHỖ NHÀ của con vật trong hệ toạ độ của người nhận (đo như `carry`): `putDown` hạ nó về đó. { x: 0, y: 0 } là góc trên trái
    // khung người nhận — con chó lơ lửng ngang ngực rồi rơi về chỗ cũ (cảnh thử đợt 29).
    RigSVG._homePet(from.pet);
    const inv = this.svg.getScreenCTM().inverse(), home = from.pet.svg.getBoundingClientRect();
    const a = new DOMPoint(home.left, home.top).matrixTransform(inv), b = new DOMPoint(home.right, home.bottom).matrixTransform(inv);
    const spot = home.width ? { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y } : { x: 0, y: 0, w: from.from.w * scale, h: from.from.h * scale };
    // ĐẶT XUỐNG NGAY CẠNH CHÂN NGƯỜI NHẬN (đợt 30): `putDown` hạ con vật về "chỗ nhà" của nó — chỗ nó đứng lúc được bế lần
    // đầu, có khi cách người nhận cả nửa căn phòng: nó trượt dọc sàn về đó. Dời chỗ nhà sang phía người nhận KHÔNG có người
    // trao (bên kia đã có người đứng), sát chân: đổi `s.x` (bước đi) của con vật lúc nó đang nằm trong tay — lúc ấy hình nó
    // không theo `s.x` (RigThu.apDung), bối cảnh 3D đặt nó đúng chỗ mới khi được thả.
    const pet = from.pet, petWide = (pet.constructor && pet.constructor.KHUNG && pet.constructor.KHUNG.w) || 400;
    let drop = null;
    if (home.width && spot.w > 0) {
      // Dời bằng `pet.dropX()` (RigThu) do kênh `petDrop` của người nhận bật, không bằng `s.x` của con vật: tween đi của chính nó
      // (đi tới người ngồi ghế đá) giữ `s.x` — tua nhảy thì tween ấy vẽ sau, đè lên chỗ mới (cảnh công viên CI).
      const side = -dir, now = spot.x + spot.w / 2 + ((typeof petAt === 'number' ? petAt : pet.s.x || 0) + (typeof pet.dropX === 'function' ? pet.dropX() : 0)) * spot.w / petWide, want = KHUNG.w / 2 + (s.x || 0) + side * (60 + spot.w * 0.25);
      if (!pet.drops) pet.drops = new Map();
      pet.drops.set(this, (pet.drops.get(this) || 0) * (s.petDrop || 0) + (want - now) * petWide / spot.w);
      t.set(s, { petDrop: 1 }, HANDOVER_AT);
      drop = { x: want, y: spot.y + spot.h * 0.6 };
    }
    this._holdEntry(t, { pet: from.pet, host: from.host, attrs: from.attrs, from: spot,
                     reach: this._reachLow(drop), at: s.x, middle: from.middle, facing: s.huong, giver });
    this._offerArms(t, source, 0);
    t.to(s, { than: this.NGHI.than - dir * 3, nhinX: dir * 2, cuoi: 1, duration: 0.45, ease: 'power2.inOut' }, 0);
    t.set(s, { om: 1, omRise: 0 }, HANDOVER_AT);
    t.to(s, { omRise: 1, huong: 0, than: this.NGHI.than, nhinX: 0, nhinY: 1.8, dauY: 3, duration: 0.55, ease: 'power2.inOut' }, HANDOVER_AT + 0.02);
    this._khep(t, 0.4, HANDOVER_AT + 0.6, { om: 1, omRise: 1, huong: 0, ...(drop ? { petDrop: 1 } : {}) });
    return t;
  }

});
