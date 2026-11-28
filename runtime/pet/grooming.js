// runtime/pet/grooming.js — đợt 49 B: the pet's side of `blowDry` and `trimFur` (runtime/person/grooming.js) — fur blown in the airflow,
// ears fluttering back, squinting; long tufts that fall when trimmed; a neater outline afterwards.
// Methods of `RigThu`, installed by runtime/rig-thu.js: `this` is the rig, `RigThu` its class.
//
// Như đợt 42 F: con vật đọc kênh của NGƯỜI đang làm (tập `heldBy38`) mỗi lần vẽ. Các hình (túm lông trên lưng / bụng, túm lông đang rơi) KHÔNG
// có trong markup: `_veGroom49b` dựng chúng lần đầu có kênh khác 0 — con vật chưa từng được sấy / tỉa thì SVG y như trước đợt này.

import { DAT, clamp, RAD, chinhSang, mix } from './shared.js';

const NB49B = 10;              // túm lông dọc lưng
const NU49B = 5;               // túm lông dưới bụng (ở các túm lẻ của lưng)
const FALL_G49B = 420;         // gia tốc rơi (đơn vị khung / s²)
const FADE49B = 0.45;          // giây túm lông nằm trên mặt đứng rồi tan

const hat = (i) => Math.abs(Math.sin(i * 2.3 + 0.7));          // "ngẫu nhiên" cố định theo số thứ tự — không dùng Math.random

export default (RigThu) => mix(RigThu, class {
  static TRIM_V49B = [0.45, 1.75];        // = RigSVG.TRIM_V49B: túm thứ i ở tham số V0 + (V1 − V0)(i + ½)/n của đường gáy → lưng → mông (V1: `petTrimEnd49b` của người tỉa)

  // Mức các kênh đợt 49 B gộp từ người làm: gió (lớn nhất) cùng đồng hồ của người ấy, lông xù, giây đã tỉa / giây tỉa hết. Không có gì: null.
  _groomLevels49b() {
    if (!this.heldBy38 || !this.heldBy38.size) return null;
    let blow = 0, phase = 0, shag = 0, cutT = 0, dur = 0, stand = 0, end = 0, start = 0;
    for (const rig of this.heldBy38) {
      const q = rig && rig.s;
      if (!q) continue;
      const b = clamp(+q.petBlow49b || 0, 0, 1), sh = clamp(+q.petShag49b || 0, 0, 1);
      if (b > blow) { blow = b; phase = +q.groomT49b || 0; }
      stand = Math.max(stand, clamp(+q.petStand49b || 0, 0, 1));
      if (sh > shag || (sh === shag && (+q.petCutDur49b || 0) > dur)) { shag = sh; cutT = Math.max(0, +q.petCutT49b || 0); dur = Math.max(0, +q.petCutDur49b || 0); end = +q.petTrimEnd49b || 0; start = +q.petTrimStart49b || 0; }
    }
    if (!blow && !shag && !dur && !stand) return null;
    return { blow, phase, shag, cutT, dur, stand, end, start, trim: dur > 0 ? clamp(cutT / dur, 0, 1) : 0 };
  }

  // Phần cộng vào dáng / nét mặt (`_careView`): ĐỨNG DẬY cho người sấy / tỉa (`petStand49b` — mèo, thỏ nghỉ ở dáng ngồi: lưng lộ ra, mặt không
  // nằm dưới vòi sấy); gió thổi — tai rạp ra sau, phất phơ; mắt nheo. Không có gì thì null.
  _groomFace49b() {
    const L = this._groomLevels49b();
    if (!L || !(L.blow || L.stand)) return null;
    const { blow, phase, stand } = L;
    if (!blow) return { ngoi: (v) => v * (1 - stand) };
    return { ngoi: (v) => v * (1 - stand), taiL: (v) => v - 1.25 * blow + 0.35 * blow * Math.sin(phase * 29), taiR: (v) => v - 1.25 * blow + 0.35 * blow * Math.sin(phase * 29 + 1.4),
             matY: (v) => Math.max(v, 0.62 * blow), duoi: (v) => v - 6 * blow * Math.sin(phase * 13) };
  }

  // Các điểm của đường tỉa (khung của `goc`): gáy, giữa lưng, mông — như `carePoint('scruff' | 'back' | 'rump49b')`.
  _trimLine49b(H, S, mx, my, ang, day) {
    const d = this.nv.dayThan, rot = (x, y) => ({ x: mx + x * Math.cos(ang) - y * Math.sin(ang), y: my + x * Math.sin(ang) + y * Math.cos(ang) });
    const Sc = { x: S.x - d * 0.35, y: S.y - d * 0.92 }, B = rot(0, -day * 0.95), R = { x: H.x + d * 0.15, y: H.y - (d + 1) * 0.9 };
    return (u) => (u <= 1 ? { x: Sc.x + (B.x - Sc.x) * u, y: Sc.y + (B.y - Sc.y) * u } : { x: B.x + (R.x - B.x) * (u - 1), y: B.y + (R.y - B.y) * (u - 1) });
  }

  // Vẽ phần đợt 49 B (sau `_veBath`). `s`: trạng thái đang vẽ; `H`, `S`: hông, vai.
  _veGroom49b(s, H, S) {
    const L = this._groomLevels49b();
    if (!L && !this._g49b) return;
    const e = this.el, nv = this.nv, m = this.mau, f = (v) => v.toFixed(2);
    if (!this._g49b) {
      // Dựng một lần: túm lông trên thân (trong nhóm `than` — chung bộ lọc viền, liền với dáng thân) và túm lông rơi (sau nhóm `lan`, trước vòng cổ).
      const tuft = `<path fill="${m.long}" stroke="${m.long}" stroke-width="1.200" stroke-linejoin="round"/>`;
      e.than.insertAdjacentHTML('beforeend', `<g data-groom49b="coat" style="display:none">${tuft.repeat(NB49B + NU49B)}</g>`);
      e.lan.insertAdjacentHTML('afterend', `<g data-groom49b="fall" style="display:none">${`<path fill="${m.long}" stroke="${chinhSang(m.long, -0.45)}" stroke-width="1" stroke-linejoin="round"/>`.repeat(NB49B + NU49B)}</g>`);
      this._g49b = { coat: e.than.lastElementChild, fall: e.lan.nextElementSibling };
    }
    const G = this._g49b, Z = L || { blow: 0, phase: 0, shag: 0, cutT: 0, dur: 0, trim: 0 };
    const mx = (H.x + S.x) / 2, my = (H.y + S.y) / 2, ang = Math.atan2(S.y - H.y, S.x - H.x), nua = Math.hypot(S.x - H.x, S.y - H.y) / 2;
    const day = +e.thanE.getAttribute('ry') || nv.dayThan, rx = +e.thanE.getAttribute('rx') || nua + nv.dayThan * 0.55;
    const dry = this._bathLevels ? (this._bathLevels() || { dry: 0 }).dry : 0, trim = Z.trim;
    // LÔNG GỌN sau khi tỉa: thân bớt phồng, đuôi gọn, viền lông bông (đã sấy / lau khô) nhỏ lại và bớt gợn.
    if (trim > 0.001) {
      e.thanE.setAttribute('ry', f(day * (1 - 0.05 * trim)));
      e.duoi.setAttribute('stroke-width', f(+e.duoi.getAttribute('stroke-width') * (1 - 0.18 * trim) / (1 + 0.4 * dry) * (1 + 0.4 * dry * (1 - 0.7 * trim))));
    }
    if (e.fluff42f && dry > 0.03 && (Z.blow > 0.001 || trim > 0.001)) {
      const d2 = dry * (1 - 0.75 * trim), waveK = 0.07 * d2 * (1 - 0.6 * trim), ripple = 0.05 * Z.blow, ry2 = day * (1 - 0.05 * trim);
      const Rx = nua + nv.dayThan * 0.55 + 2 + 5 * d2, Ry = ry2 + 2 + 6 * d2, n = 26, pts = [];
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * Math.PI * 2, top = Math.sin(a) < 0 ? 1 : 0.4;
        const k = (i % 2 ? 1 + waveK : 1) + ripple * top * Math.sin(a * 7 + Z.phase * 23) + (i % 2 ? ripple * 0.8 * top : 0);
        pts.push(`${f(Math.cos(a) * Rx * k)} ${f(Math.sin(a) * Ry * k)}`);
      }
      e.fluff42f.setAttribute('d', 'M ' + pts.join(' L ') + ' Z');
    }
    // Đường dáng thân (hệ của thân: x dọc thân, về phía đầu; y xuống): mép trên / dưới ở x — elip thân, ngực, mông.
    const shapes = [[0, rx, day * (1 - 0.05 * trim)], [nua, nv.dayThan, nv.dayThan], [-nua, nv.dayThan + 1, nv.dayThan + 1]];
    const edge = (x, sign) => {
      let best = null;
      for (const [cx, a, b] of shapes) { const u = (x - cx) / a; if (Math.abs(u) < 1) { const y = sign * b * Math.sqrt(1 - u * u); if (best === null || y * sign > best * sign) best = y; } }
      return best === null ? sign * day * 0.5 : best;
    };
    const line = this._trimLine49b(H, S, mx, my, ang, day), V0 = Z.start || RigThu.TRIM_V49B[0], V1 = Z.end > V0 ? Z.end : RigThu.TRIM_V49B[1];          // quãng người tỉa (`petTrimStart49b`, `petTrimEnd49b`)
    const toLocal = (q) => { const dx = q.x - mx, dy = q.y - my; return dx * Math.cos(ang) + dy * Math.sin(ang); };
    const toWorld = (x, y) => ({ x: mx + x * Math.cos(ang) - y * Math.sin(ang), y: my + x * Math.sin(ang) + y * Math.cos(ang) });
    const blowLen = (4 + 5 * dry) * Z.blow;
    const coat = [...G.coat.children], fall = [...G.fall.children];
    let shown = 0, falling = 0, lean = 0;
    const tuftAt = (i, under) => {
      const j = under ? 2 * i + 1 : i, u = (j + 0.5) / NB49B, v = V0 + (V1 - V0) * u, x = toLocal(line(v));
      const sign = under ? 1 : -1, y0 = edge(x, sign) - sign * 2.2;
      const cutAt = u * Z.dur, cutNow = Z.dur > 0 && Z.cutT >= cutAt;
      // gió thổi từ đầu về đuôi (−x): túm lông rạp theo, gợn theo đồng hồ của người sấy
      const lean = (-0.35 - (0.55 + 0.25 * Math.sin(Z.phase * 26 + j * 1.7)) * Z.blow) * (under ? -0.6 : 1);
      const shagLen = (under ? 7 : 9) * (0.75 + 0.5 * hat(j)) * Z.shag, len = Math.max(cutNow ? 0 : shagLen, blowLen * (under ? 0.5 : 1));
      return { j, x, y0, sign, lean, len, cutAt, cutNow };
    };
    const tuftPath = (x, y0, sign, lean, len, w) => {
      const tx = x + Math.sin(lean) * len, ty = y0 + sign * Math.cos(lean) * len, cx = x + Math.sin(lean) * len * 0.35, cy = y0 + sign * Math.cos(lean) * len * 0.55;
      return `M ${f(x - w)} ${f(y0)} Q ${f(cx - w * 0.5)} ${f(cy)} ${f(tx)} ${f(ty)} Q ${f(cx + w * 0.7)} ${f(cy)} ${f(x + w)} ${f(y0)} Z`;
    };
    const all = [...Array(NB49B).keys()].map((i) => tuftAt(i, false)).concat([...Array(NU49B).keys()].map((i) => tuftAt(i, true)));
    all.forEach((q, n) => {
      const el = coat[n];
      if (q.len > 0.6) { el.style.display = ''; el.setAttribute('d', tuftPath(q.x, q.y0, q.sign, q.lean, q.len, 3 + 0.8 * hat(q.j + 3))); if (!shown) lean = q.lean; shown++; }
      else el.style.display = 'none';
      // TÚM LÔNG RƠI: tách khỏi lông lúc dụng cụ qua (`cutAt` giây sau nhát đầu), rơi xuống mặt đứng (sàn / mặt bàn của nó), nằm đó rồi tan.
      const fe = fall[n], age = Z.cutT - q.cutAt;
      if (!(Z.dur > 0 && Z.shag > 0.05 && age >= 0)) { fe.style.display = 'none'; return; }
      const L0 = (q.sign < 0 ? 9 : 7) * (0.75 + 0.5 * hat(q.j)) * Z.shag, mid = toWorld(q.x + Math.sin(q.lean) * L0 * 0.5, q.y0 + q.sign * Math.cos(q.lean) * L0 * 0.5);
      const floor = DAT - 2, land = Math.sqrt(Math.max(0, 2 * (floor - mid.y) / FALL_G49B)), a = Math.min(age, land);
      const x = mid.x + (-10 - 8 * hat(q.j + 1)) * a + 3 * Math.sin(a * 9 + q.j), y = Math.min(floor, mid.y + 0.5 * FALL_G49B * a * a);
      const op = age <= land ? 1 : 1 - (age - land) / FADE49B;
      if (op <= 0.02) { fe.style.display = 'none'; return; }
      const spin = age <= land ? (ang / RAD) + (q.sign < 0 ? 0 : 180) + (q.j % 2 ? 1 : -1) * 260 * a : 90;
      fe.style.display = ''; falling++;
      fe.setAttribute('d', tuftPath(0, L0 * 0.6, -1, 0.3, L0 * 1.2, 3.2));
      fe.setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(${f(spin)})`);
      fe.setAttribute('opacity', f(op));
    });
    G.coat.style.display = shown ? '' : 'none';
    if (shown) G.coat.setAttribute('transform', `translate(${f(mx)} ${f(my)}) rotate(${f(ang / RAD)})`);
    G.fall.style.display = falling ? '' : 'none';
    this._g49bCount = { shown, falling, lean };
  }

  /** Số đo cho tools/acting_check.py (đợt 49 B, `set.careProbe` → `c49b`): túm lông trên thân, túm lông đang rơi (thấp nhất / cao nhất), viền lông bông, thân, đầu, các mức. */
  groom49bProbe() {
    const e = this.el, L = this._groomLevels49b() || { blow: 0, shag: 0, trim: 0, cutT: 0, dur: 0 }, v = this._careView(this.s), on = (el) => (el && el.style.display !== 'none' ? el : null);
    const G = this._g49b, n = this._g49bCount || { shown: 0, falling: 0 }, r3 = (x) => +(+x || 0).toFixed(3);
    const drops = G ? [...G.fall.children].filter((el) => el.style.display !== 'none') : [];
    const low = drops.length ? drops.reduce((a, b) => (a.getBoundingClientRect().bottom > b.getBoundingClientRect().bottom ? a : b)) : null;
    const high = drops.length ? drops.reduce((a, b) => (a.getBoundingClientRect().top < b.getBoundingClientRect().top ? a : b)) : null;
    const bath = (this._bathLevels && this._bathLevels()) || { dry: 0, wet: 0 };
    return { coat: G ? on(G.coat) : null, fallLow: low, fallHigh: high, fluff: on(e.fluff42f), body: e.thanE, head: e.dau, tufts: n.shown, falling: drops.length,
             blow: r3(L.blow), shag: r3(L.shag), trim: r3(L.trim), cutT: r3(L.cutT), dry: r3(bath.dry), wet: r3(bath.wet), ears: r3(v.taiL), eyes: r3(v.matY),
             lean: r3(n.lean || 0) };
  }
});
