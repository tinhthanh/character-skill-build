// runtime/pet/exam50a.js — đợt 50 A: the exam room, the pet's side — lying on its side (`lieOnSide`, also for the ultrasound), being felt
// (`palpate`: a mild flinch, ears), the ultrasound gel on its belly. The person's side is runtime/person/exam50a.js.
// Methods of `RigThu`, installed by runtime/rig-thu.js: `this` is the rig, `RigThu` its class.
//
// Như đợt 38 A / 49 B: con vật đọc kênh của NGƯỜI đang làm (tập `heldBy38`) mỗi lần vẽ — `petSide50a` 0…1 nằm nghiêng cho siêu âm, `petPress50a`
// 0…1 bàn tay ấn vào bụng / sườn (thân lún nhẹ chỗ ấy), `petFlinch50a` 0…1 giật mình khẽ (tai cụp, đầu ngoảnh, nhắm mắt), `petGel50a` 0…1 lớp gel
// trên bụng, `petGelU50a` chỗ gel / đầu dò dọc bụng. Nằm nghiêng TỰ NÓ (`lieOnSide`) là thế giữ của chính nó (`side50a`, như `flop` của thỏ).
// Hình mới (vệt gel) KHÔNG có trong markup: `_veExam50a` dựng lần đầu có gel — con vật chưa từng siêu âm thì SVG y như trước đợt này.

import { clamp, pha, mix } from './shared.js';

export default (RigThu) => mix(RigThu, class {
  // DÁNG NẰM NGHIÊNG (đợt 50 A): thân hạ sát mặt đứng, bốn chân duỗi ra hai phía (trước ra trước, sau ra sau), đầu ngả xuống mặt bàn, mắt mở hé,
  // tai thả, đuôi duỗi — bình thản. Như `flop` của thỏ nhưng đầu không gục hẳn (còn nhìn được), cho cả ba loài.
  static SIDE50A = { truocY: 45, sauY: 41, tnX: 56, txX: 46, snX: -36, sxX: -44, dauY: 17, dauX: 5, dau: 30, matY: 0.3, taiL: -0.7, taiR: -0.7, duoi: -78, cuoi: 0.35 };

  /**
   * NẰM NGHIÊNG (THẾ GIỮ — `standUp()` để dậy, như `lieDown`): hạ người xuống, ngả sang một bên — bốn chân duỗi ra hai phía, đầu ngả xuống mặt bàn /
   * sàn, mắt hé, đuôi duỗi; thở chậm, bình thản (cho siêu âm, cho khám bụng). Các động tác sau (vẫy đuôi, giật tai…) diễn khi đang nằm.
   * Người siêu âm (`useUltrasound`) tự đặt con vật nằm nghiêng như thế trong lúc làm, không cần bước này.
   */
  lieOnSide() {
    const t = this.tl(), s = this.s;
    let at = this._dung(t, 0);
    t.to(s, { ...RigThu.SIDE50A, nam: 1, ngoi: 0, flop: 0, side50a: 1, duration: s.side50a > 0.5 ? 0.2 : 0.7, ease: 'power2.inOut' }, at);
    at += 0.7;
    // thở chậm hai nhịp, tai khẽ giật — nằm yên chứ không đứng hình
    for (let i = 0; i < 2; i++) t.to(s, { tho: 1, duration: 0.6, ease: 'sine.inOut' }, at + i * 1.2).to(s, { tho: 0, duration: 0.6, ease: 'sine.inOut' }, at + i * 1.2 + 0.6);
    t.to(s, { taiR: RigThu.SIDE50A.taiR + 0.5, duration: 0.12, yoyo: true, repeat: 1 }, at + 0.9);
    this._khep(t, 0.3, at + 2.4, { nam: 1, flop: 0, side50a: 1, ngoi: 0 });
    return t;
  }

  // Mức các kênh đợt 50 A gộp từ những người đang làm (lớn nhất), chỗ gel theo người có gel nhiều nhất. Không có gì: null.
  _exam50aLevels() {
    if (!this.heldBy38 || !this.heldBy38.size) return null;
    let side = 0, press = 0, flinch = 0, gel = 0, u = 0.5, calm = 0;
    for (const rig of this.heldBy38) {
      const q = rig && rig.s;
      if (!q) continue;
      side = Math.max(side, clamp(+q.petSide50a || 0, 0, 1)); press = Math.max(press, clamp(+q.petPress50a || 0, 0, 1));
      flinch = Math.max(flinch, clamp(+q.petFlinch50a || 0, 0, 1)); calm = Math.max(calm, clamp(+q.petCalm50a || 0, 0, 1));
      const g = clamp(+q.petGel50a || 0, 0, 1);
      if (g > gel) { gel = g; u = clamp(+q.petGelU50a || 0.5, 0, 1); }
    }
    if (!side && !press && !flinch && !gel && !calm) return null;
    return { side, press, flinch, gel, u, calm };
  }

  // Phần cộng vào dáng / nét mặt (`_careView`): NẰM NGHIÊNG theo người siêu âm (pha từ dáng đang có tới dáng nằm nghiêng — mèo đang ngồi cũng nằm
  // xuống), GIẬT MÌNH khẽ khi bị ấn (tai cụp ra sau, đầu ngoảnh nhẹ, mắt nheo), dễ chịu (mắt lim dim) lúc được xoa. Không có gì thì null.
  _exam50aView() {
    const L = this._exam50aLevels();
    if (!L) return null;
    const { side, flinch, calm } = L, P = RigThu.SIDE50A, out = {};
    if (side) {
      for (const key of Object.keys(P)) out[key] = (v) => pha(v, P[key], side);
      out.ngoi = (v) => v * (1 - side);
      out.sauX = (v) => v * (1 - side); out.truocX = (v) => v * (1 - side);
    }
    if (flinch || calm) {
      const was = { ...out };
      const after = (key, fn) => { const f0 = was[key]; out[key] = f0 ? (v) => fn(f0(v)) : fn; };
      after('taiL', (v) => v - 0.9 * flinch); after('taiR', (v) => v - 0.9 * flinch);
      after('matY', (v) => Math.max(v, 0.5 * flinch, 0.45 * calm));
      after('dau', (v) => v - 9 * flinch);
      after('cuoi', (v) => v - 0.4 * flinch + 0.3 * calm);
    }
    return out;
  }

  // Chỗ trên con vật cho người khám (khung 400 × 330 của nó, như `carePoint`): 'belly50a' — bụng, nửa dưới sườn về phía hông (chỗ đầu dò siêu âm /
  // bàn tay sờ bụng), `u` 0 (gần ngực) … 1 (gần hông); 'flank50a' — giữa sườn, cao hơn bụng một chút. `e.thanE`: elip thân (x dọc thân, về phía đầu).
  _examPoint50a(which, u = 0.5) {
    const e = this.el, ry = +e.thanE.getAttribute('ry') || this.nv.dayThan, rx = +e.thanE.getAttribute('rx') || this.nv.dayThan * 2;
    const x = rx * (0.2 - 0.7 * clamp(u, 0, 1));
    if (which === 'belly50a') return this._framePoint(e.thanE, x, ry * 0.42);
    return this._framePoint(e.thanE, x, ry * 0.05);
  }

  // Vẽ phần đợt 50 A (sau `_veGroom49b`): lớp GEL trong mờ trên bụng (chỗ đầu dò rà), bụng sáng màu lộ ra rộng hơn khi nằm nghiêng, thân lún nhẹ
  // khi bị ấn. `s`: trạng thái đang vẽ; `H`, `S`: hông, vai.
  _veExam50a(s, H, S) {
    const L = this._exam50aLevels(), e = this.el, f = (v) => v.toFixed(2);
    const lying = Math.max(L ? L.side : 0, clamp(+s.side50a || 0, 0, 1));
    if (lying > 0.01 && e.bung) {
      // BỤNG LỘ RA khi nằm nghiêng: mảng lông sáng dưới thân to hơn, nhích lên giữa sườn — đọc ra "nằm phơi bụng".
      const nua = Math.hypot(S.x - H.x, S.y - H.y) / 2, day = this.nv.dayThan * (1 + (s.tho || 0) * 0.035);
      const xoay = `translate(${f((H.x + S.x) / 2)} ${f((H.y + S.y) / 2)}) rotate(${f(Math.atan2(S.y - H.y, S.x - H.x) * 180 / Math.PI)})`;
      e.bung.setAttribute('transform', `${xoay} translate(${f(2 - 4 * lying)} ${f(day * (0.5 - 0.16 * lying))})`);
      e.bung.setAttribute('rx', f(nua * (0.86 + 0.1 * lying))); e.bung.setAttribute('ry', f(day * (0.42 + 0.2 * lying)));
    }
    if (L && L.press > 0.01) e.thanE.setAttribute('ry', f((+e.thanE.getAttribute('ry') || this.nv.dayThan) * (1 - 0.035 * L.press)));
    const gel = L ? L.gel : 0;
    if (!gel && !this._gel50a) return;
    if (!this._gel50a) {
      // Dựng một lần: vệt gel xanh nhạt trong mờ, viền sáng, hai đốm phản quang — trong nhóm lật (`lan`), ngay sau thân, trước chân gần.
      e.than.insertAdjacentHTML('afterend', `<g data-exam50a="gel" style="display:none"><ellipse fill="#bfe6fb" fill-opacity=".78" stroke="#6fb9e3" stroke-width="1.400"/>
        <ellipse data-shine="1" fill="#ffffff" fill-opacity=".85"/><ellipse data-shine="2" fill="#ffffff" fill-opacity=".7"/></g>`);
      this._gel50a = e.than.nextElementSibling;
    }
    const G = this._gel50a;
    G.style.display = gel > 0.02 ? '' : 'none';
    if (gel <= 0.02) return;
    const ry = +e.thanE.getAttribute('ry') || this.nv.dayThan, rx = +e.thanE.getAttribute('rx') || this.nv.dayThan * 2;
    const tr = e.thanE.getAttribute('transform') || '', x = rx * (0.2 - 0.7 * L.u), y = ry * 0.42, w = rx * 0.3 * (0.4 + 0.6 * gel), h = ry * 0.24 * (0.5 + 0.5 * gel);
    G.setAttribute('transform', `${tr} translate(${f(x)} ${f(y)})`);
    G.setAttribute('opacity', f(Math.min(1, gel * 1.4)));
    const [blob, s1, s2] = G.children;
    blob.setAttribute('rx', f(w)); blob.setAttribute('ry', f(h));
    s1.setAttribute('cx', f(-w * 0.35)); s1.setAttribute('cy', f(-h * 0.3)); s1.setAttribute('rx', f(w * 0.22)); s1.setAttribute('ry', f(h * 0.22));
    s2.setAttribute('cx', f(w * 0.3)); s2.setAttribute('cy', f(-h * 0.1)); s2.setAttribute('rx', f(w * 0.1)); s2.setAttribute('ry', f(h * 0.14));
  }

  /** Số đo cho tools/acting_check.py (đợt 50 A, `set.careProbe` → `c50a`): thân, đầu, bụng (điểm), vệt gel, các mức, tai / mắt đang vẽ. */
  exam50aProbe() {
    const e = this.el, L = this._exam50aLevels() || { side: 0, press: 0, flinch: 0, gel: 0, u: 0.5, calm: 0 }, v = this._careView(this.s), r3 = (x) => +(+x || 0).toFixed(3);
    const pt = (q) => { if (!q || !this.svg.getScreenCTM()) return null; const p = new DOMPoint(q.x, q.y).matrixTransform(this.svg.getScreenCTM()); return { x: p.x, y: p.y, px: true }; };
    return { body: e.thanE, head: e.dau, belly: pt(this._examPoint50a('belly50a', L.u)), flank: pt(this._examPoint50a('flank50a', 0.5)),
             gel: this._gel50a && this._gel50a.style.display !== 'none' ? this._gel50a.firstElementChild : null,
             side: r3(Math.max(L.side, clamp(+this.s.side50a || 0, 0, 1))), press: r3(L.press), flinch: r3(L.flinch), gelLevel: r3(L.gel),
             ears: r3(v.taiL), eyes: r3(v.matY), low: r3(v.truocY) };
  }
});
