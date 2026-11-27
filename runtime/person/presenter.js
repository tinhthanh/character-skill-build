// runtime/person/presenter.js — presenter actions (hold a sign, show a size, selfies, yawn), phone tapping, typing, stroking a pet, clap, count, ponder…
// Methods of `RigSVG`, installed by runtime/rig-svg.js: `this` is the rig, `RigSVG` its class.

import { KHUNG, DOI_Y, HONG, VAI, DAI, TAP_POSE, TYPE_POSE, LOOK_DOWN, CLAP_POSE, COUNT_BEAT, COUNT_POSE, WATCH_POSE, PONDER_POSE, HUG_ARM_POSE, FOLD_POSE, HIPS_POSE, CHEST_POSE, HAIL_POSE, STARTLE_POSE, VSIGN_POSE, clamp, chuanHoaGoc, pha, chinhSang, HEX_COLOR, mix } from './shared.js';
import { outlinePoints } from '../shading.js';

export default (RigSVG) => mix(RigSVG, class {
  // ═══════════════════════════════════════════════ ĐỢT 39 C — NGƯỜI DẪN: giơ bảng, ra dấu kích thước, chụp ảnh tự sướng, ngáp vươn vai
  // Video giải thích / video dọc ngắn: người dẫn GIƠ TẤM BẢNG CHỮ trước ngực ("Giảm 20%"), ra dấu "to cỡ này" bằng hai bàn tay, giơ điện
  // thoại chụp ảnh tự sướng (một mình hay cùng người / con vật khác), ngáp và vươn vai. Mọi dáng chính giữ ≥ 1 s (người chấm xem ~1 khung / giây).
  static SIGN_FONT = [44, 34, 27];        // cỡ chữ tối đa (đơn vị khung) cho bảng 1 / 2 / 3 dòng
  static SIGN_PAD = 12;                   // lề chữ trong bảng
  static SIGN_GRIP = 6;                   // lòng bàn tay nằm vào trong mép bảng chừng ấy (nắm tay đè lên mép)
  static SIGN_MIN = 130; static SIGN_MAX = 260; static SIGN_NARROW = 170;  // bề ngang bảng (đơn vị khung, người lớn — trẻ con theo tầm với)
  static SIGN_TILT = 4;                   // độ nghiêng tấm bảng lúc giơ (hai tay lệch nhau)
  static SIZE_GAP = { small: 44, medium: 130, big: 250 };   // `showSize`: khe giữa hai lòng bàn tay (đơn vị khung, người lớn)
  static SELFIE_AT = [1.9, 0.9];         // `takeSelfie`: lòng bàn tay cầm máy ở cách giữa mặt 1,6 bán kính mặt ra ngoài, 0,55 bán kính LÊN TRÊN — máy ngang đỉnh đầu
  static SELFIE_ZOOM = 1.7;               // điện thoại phóng to lúc chụp (thấy rõ trong tay)
  static STRETCH_POSE = [146, 34];        // `yawnStretch`: bắp tay giơ chữ V, cẳng tay gập vào một chút — nắm tay ngang trán, ngoài đầu

  // Góc tay để LÒNG BÀN TAY tới `p` (hệ `_aimOf`, từ vai ở dáng `geo`) với KHUỶU RA NGOÀI — xa giữa thân (hai tay đưa ra trước người: giơ
  // bảng, ra dấu kích thước). `_armTo` chọn khuỷu thấp hơn: hai lời giải đổi chỗ khi tay đi ngang qua dưới vai, cẳng tay quay ngoắt 240°.
  // Độ dài tay theo cỡ thân (`coThan`). Góc trên màn hình: dùng với `aim` = 1.
  _reachOut(k, p, geo, low = false) {
    const c = this.nv.coThan, a = DAI.canhTay * this.nv.daiCanhTay * c, b = DAI.cangTay * this.nv.daiCangTay * c, deg = 180 / Math.PI;
    const sh = geo[k], out = k === 'L' ? -1 : 1, hand = 10 * c;
    let wx = p.x, wy = p.y, res = null;
    for (let n = 0; n < 3; n++) {
      const d = clamp(Math.hypot(wx - sh.x, wy - sh.y), Math.abs(a - b) + 1, a + b - 0.5), phi = Math.atan2(wy - sh.y, wx - sh.x) * deg;
      const alpha = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1)) * deg;
      const ex = (u) => sh.x + a * Math.cos(u / deg);
      const ey = (u) => Math.sin(u / deg), pick = low ? ey(phi + alpha) >= ey(phi - alpha) : out * (ex(phi + alpha) - ex(phi - alpha)) >= 0;      // `low`: khuỷu THẤP (tay ôm trước ngực), không thì khuỷu ra ngoài
      const phiU = pick ? phi + alpha : phi - alpha, exU = ex(phiU), eyU = sh.y + a * Math.sin(phiU / deg);
      const phiF = Math.hypot(wx - sh.x, wy - sh.y) > a + b - 0.5 ? phiU : Math.atan2(wy - eyU, wx - exU) * deg;
      res = { bat: clamp(chuanHoaGoc(k === 'R' ? 90 - phiU : phiU - 90), -60, 172), cang: chuanHoaGoc(k === 'R' ? phiU - phiF : phiF - phiU), dir: phiF };
      wx = p.x - Math.cos(phiF / deg) * hand; wy = p.y - Math.sin(phiF / deg) * hand;
    }
    return res;
  }

  // Một tấm bảng trong `rig.signs` (chữ, màu, cỡ — đơn vị khung). Tấm GIỐNG HỆT đã có thì dùng lại số của nó (`sequence()` dựng mỗi bước
  // hai lần) — như `_reading`.
  _signEntry(text, color, maxW) {
    const lines = (Array.isArray(text) ? text : String(text).split(/\n|\s*\|\s*/)).map((line) => String(line).trim()).filter(Boolean);
    if (!lines.length || lines.length > 3) throw new Error(`[character] holdSign: text must be 1–3 short lines (split with "\\n" or "|"), got ${JSON.stringify(text)}`);
    const longest = Math.max(...lines.map((line) => [...line].length)), pad = RigSVG.SIGN_PAD;
    const minW = Math.min(RigSVG.SIGN_MIN, maxW);
    const font = Math.max(14, Math.min(RigSVG.SIGN_FONT[lines.length - 1], (maxW - 2 * pad) / (longest * 0.58)));
    const w = clamp(longest * 0.58 * font + 2 * pad, minW, maxW), h = lines.length * font * 1.16 + 2 * pad;
    if (color !== null && !HEX_COLOR.test(String(color))) throw new Error(`[character] holdSign: color must be a hex colour such as "#2f9e8f", got ${JSON.stringify(color)}`);
    const fill = color || '#ffffff', dark = (() => { const c = fill.length === 4 ? fill.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3') : fill, v = parseInt(c.slice(1), 16);
      return ((v >> 16) * 0.299 + ((v >> 8) & 255) * 0.587 + (v & 255) * 0.114) < 150; })();
    const entry = { lines, font: +font.toFixed(2), w: +w.toFixed(2), h: +h.toFixed(2), fill, ink: dark ? '#ffffff' : '#16303a', edge: color ? chinhSang(fill, -0.35) : '#1f8a70' };
    this.signs = this.signs || [];
    const key = JSON.stringify(entry), found = this.signs.findIndex((item) => JSON.stringify(item) === key);
    if (found >= 0) return { n: found + 1, entry: this.signs[found] };
    this.signs.push(entry);
    return { n: this.signs.length, entry };
  }

  /** Vẽ lại bảng chữ / chớp sáng nếu đang hiện (host vừa hiện lại sau khi bị ẩn lúc rig vẽ: không đo được bàn tay, bảng nằm sai chỗ). */
  redrawSign() { if (this.s && (this.s.sign > 0.02 || this.s.flash > 0.02)) this._drawSign(); }

  // Vẽ tấm bảng (giữa hai lòng bàn tay, nghiêng theo đường nối hai tay) và chớp sáng (ở bàn tay cầm điện thoại) — mỗi khung.
  _drawSign() {
    const e = this.el, s = this.s;
    if (!e || !this.svg) return;
    const sign = e.sign39 || (e.sign39 = this.svg.querySelector('#' + this.id + '-sign')), flash = e.flash39 || (e.flash39 = this.svg.querySelector('#' + this.id + '-flash'));
    // `getCTM` (hệ của phần tử → hệ của chính khung SVG), KHÔNG `getScreenCTM`: không phụ thuộc cỡ / chỗ của host trên màn hình lúc vẽ (máy quay 3D
    // đổi chỗ host sau khi rig vẽ — bảng đặt theo hệ màn hình thì lệch khi tua nhảy cóc).
    // Nhân với nghịch đảo của một phần tử trống luôn hiện ở gốc SVG (`signRef`): bỏ phần co theo `viewBox` — kết quả ở hệ của chính tấm bảng.
    const ref = e.signRef39 || (e.signRef39 = this.svg.querySelector('#' + this.id + '-signRef')), rm = ref && ref.getCTM(), inv = rm ? rm.inverse() : null;
    const palm = (k) => { const m = e['coTay' + k] && e['coTay' + k].getCTM(); return m && inv ? new DOMPoint(0, 9).matrixTransform(inv.multiply(m)) : null; };
    if (sign) {
      const k = clamp(s.sign, 0, 1), r = (this.signs || [])[Math.round(s.signN) - 1], a = palm('L'), b = palm('R');
      if (!r || k < 0.02 || !a || !b) sign.style.display = 'none';
      else {
        const card = sign.firstElementChild;
        if (sign.getAttribute('data-n') !== String(Math.round(s.signN))) {
          card.innerHTML = `<rect x="${-r.w / 2}" y="${-r.h / 2}" width="${r.w}" height="${r.h}" rx="9" fill="${r.fill}" stroke="${r.edge}" stroke-width="4.5"/>`
            + `<rect x="${-r.w / 2 + 6}" y="${-r.h / 2 + 6}" width="${r.w - 12}" height="${r.h - 12}" rx="6" fill="none" stroke="${r.edge}" stroke-width="1.2" opacity=".55"/>`
            + r.lines.map((line, n) => `<text data-sign-line="${n}" x="0" y="${((n - (r.lines.length - 1) / 2) * r.font * 1.16 + r.font * 0.36).toFixed(2)}" font-family="Arial, Helvetica, sans-serif" font-size="${r.font}" font-weight="700" fill="${r.ink}" text-anchor="middle" data-layout-ignore="">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`).join('');
          sign.setAttribute('data-n', String(Math.round(s.signN)));
        }
        // Giữa hai lòng bàn tay, nghiêng theo đường nối chúng; lớn dần theo `sign` (hiện ra giữa hai tay).
        const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, turn = clamp(Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI, -25, 25), size = 0.55 + 0.45 * k;
        card.setAttribute('transform', `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${turn.toFixed(2)}) scale(${size.toFixed(3)})`);
        card.style.opacity = Math.min(1, k * 2).toFixed(2);
        // Hai bàn tay vẽ lại TRÊN tấm bảng, đúng chỗ và hình của chúng (hệ của bàn tay → gốc SVG).
        for (const hand of sign.querySelectorAll('[data-sign-hand]')) {
          const el = this.svg.querySelector('#' + this.id + '-tay' + hand.getAttribute('data-sign-hand')), m = el && el.getCTM && el.getCTM();
          if (!m || !inv) continue;
          const q = inv.multiply(m);
          hand.setAttribute('transform', `matrix(${[q.a, q.b, q.c, q.d, q.e, q.f].map((v) => v.toFixed(4)).join(' ')})`);
        }
        sign.style.display = '';
      }
    }
    if (flash) {
      const k = clamp(s.flash, 0, 1), side = this.selfieSide, p = side && k > 0.02 ? palm(side) : null;
      if (!p) flash.style.display = 'none';
      else {
        // Đèn ở MẶT LƯNG điện thoại, trên nắm tay (máy phóng to `SELFIE_ZOOM` quanh lòng bàn tay, dựng đứng).
        flash.setAttribute('transform', `translate(${p.x.toFixed(1)} ${(p.y - 26 * this.nv.coThan).toFixed(1)}) scale(${(0.5 + 0.7 * k).toFixed(3)})`);
        flash.style.opacity = k.toFixed(2);
        flash.style.display = '';
      }
    }
  }

  /**
   * GIƠ BẢNG: lấy ra một tấm bảng nhỏ có chữ `text` (1–3 dòng ngắn, ngắt bằng "\n" hay "|"; tiếng Việt có dấu), cầm hai mép bằng HAI tay,
   * giơ lên trước ngực, quay về người xem, nghiêng nhẹ, liếc xuống bảng rồi nhìn người xem, cười — giữ `hold` giây — rồi hạ xuống. Bảng
   * phóng to theo chữ (rộng tới `SIGN_MAX`, trẻ con theo tầm tay). `color`: màu nền bảng (chữ trắng trên nền tối). Đồ đang cầm được cất
   * trong lúc giơ bảng và lấy ra lại sau.
   *   rig.holdSign('Giảm 20%')    rig.holdSign('Tiêm phòng|miễn phí', 2.5, { color: '#2f9e8f' })
   */
  holdSign(text = 'Hello!', hold = 2, { color = null, narrow = false } = {}) {
    if (!(Number.isFinite(hold) && hold > 0)) throw new Error(`[character] holdSign: hold must be a number of seconds > 0, got ${JSON.stringify(hold)}`);
    const t = this.tl(), s = this.s, N = this.NGHI, keep = this._stowBoth(t), geo = this._poseGeo({ huong: 0 });
    this._faceFront(t);
    // Tầm tay: lòng bàn tay với tới ~0,9 cánh tay duỗi, tính ngang ngực.
    const face = geo.face, arm = (DAI.canhTay * this.nv.daiCanhTay + DAI.cangTay * this.nv.daiCangTay) * this.nv.coThan * 0.88;
    const top = face.y + face.r * 0.92, guessH = 80 * this.nv.coThan, cy0 = top + guessH / 2;
    const reachX = (geo.R.x - HONG.x) + Math.sqrt(Math.max(0, arm * arm - (cy0 - geo.R.y) ** 2));
    const { n, entry } = this._signEntry(text, color, Math.min(narrow ? RigSVG.SIGN_NARROW : RigSVG.SIGN_MAX, 2 * (reachX + RigSVG.SIGN_GRIP)));
    const cy = top + entry.h / 2, half = entry.w / 2 - RigSVG.SIGN_GRIP;
    const pose = (y, tilt = 0) => { const L = this._reachOut('L', { x: HONG.x - half, y: y + tilt }, geo), R = this._reachOut('R', { x: HONG.x + half, y: y - tilt }, geo);
      return { batL: L.bat, cangL: L.cang, batR: R.bat, cangR: R.cang }; };
    const low = pose(geo.hip.y - 6 * this.nv.coThan), up = pose(cy), tilted = pose(cy, RigSVG.SIGN_TILT), back = pose(cy, -RigSVG.SIGN_TILT * 0.6);
    t.set(s, { tayL: 'nam', tayR: 'nam', signN: n }, 0.02);
    t.to(s, { aimL: 1, aimR: 1, carryL: 0, carryR: 0, duration: 0.25, ease: 'sine.inOut' }, 0);
    // Hai tay xuống trước đùi, cách nhau đúng bề ngang bảng — tấm bảng hiện ra giữa chúng —, rồi giơ lên trước ngực, nảy nhẹ.
    t.to(s, { ...low, dauY: 3, nhinY: 1.2, duration: 0.32, ease: 'power2.inOut' }, 0);
    t.to(s, { sign: 1, duration: 0.22, ease: 'power2.out' }, 0.24);
    t.to(s, { ...up, dauY: 0, nhinY: 0, cuoi: 1, mieng: 0.3, mayL: 0.6, mayR: 0.6, duration: 0.45, ease: 'back.out(1.5)' }, 0.42);
    // Nghiêng tấm bảng một chút (lắc qua rồi dừng hơi nghiêng), liếc xuống đọc bảng rồi nhìn thẳng người xem.
    t.to(s, { ...tilted, dau: N.dau - 5, duration: 0.3, ease: 'sine.inOut' }, 0.9).to(s, { ...back, duration: 0.3, ease: 'sine.inOut' }, 1.2);
    this._lookTo(t, { x: HONG.x, y: cy }, 0.9, { d: 0.3, huong: 0 });
    this._lookTo(t, null, 1.35, { d: 0.3, huong: 0 });
    t.to(s, { mieng: 0.15, dau: N.dau + 3, duration: 0.3, ease: 'sine.inOut' }, 1.35);
    const U = 0.87 + Math.max(hold, 1.2);
    if (hold > 1.4) this._chop(t, 1.7);
    t.to(s, { ...low, dau: N.dau, cuoi: 0.6, mieng: 0, duration: 0.4, ease: 'power2.inOut' }, U);
    t.to(s, { sign: 0, duration: 0.16, ease: 'power2.in' }, U + 0.3);
    this._khep(t, 0.45, U + 0.46, keep);
    return t;
  }

  /**
   * RA DẤU KÍCH THƯỚC ("to cỡ này"): hai bàn tay giơ trước người, lòng bàn tay quay vào nhau, cách nhau `size` — 'small' (một bàn tay),
   * 'medium', 'big' (dang rộng hai tay) hay một số (khe giữa hai lòng bàn tay, đơn vị khung 400 × 470 của người lớn) —, nảy nhẹ hai nhịp,
   * mắt nhìn vào khoảng giữa hai tay rồi nhìn người xem (nhướn mày, há miệng "to thế này!"). Giữ `hold` giây. Tay trẻ con ngắn: khe lớn
   * nhất theo tầm tay. Đồ đang cầm được cất trong lúc làm.
   */
  showSize(size = 'medium', hold = 1.4, { narrow = false } = {}) {
    const gap0 = typeof size === 'number' ? size : RigSVG.SIZE_GAP[size];
    if (!(Number.isFinite(gap0) && gap0 > 0)) throw new Error(`[character] showSize: size must be 'small', 'medium', 'big' or a number of frame units > 0, got ${JSON.stringify(size)}`);
    if (!(Number.isFinite(hold) && hold > 0)) throw new Error(`[character] showSize: hold must be a number of seconds > 0, got ${JSON.stringify(hold)}`);
    const t = this.tl(), s = this.s, N = this.NGHI, keep = this._stowBoth(t), geo = this._poseGeo({ huong: 0 }), c = this.nv.coThan;
    this._faceFront(t);
    const arm = (DAI.canhTay * this.nv.daiCanhTay + DAI.cangTay * this.nv.daiCangTay) * c;
    // Cao ngang ngực dưới (rộng: ngang vai — hai tay dang ra); khe theo cỡ người, không quá tầm tay.
    const big = gap0 > 160, y = big ? geo.R.y + 10 * c : geo.R.y + 26 * c;
    const most = 2 * ((geo.R.x - HONG.x) + Math.sqrt(Math.max(0, (arm * 0.86) ** 2 - (y - geo.R.y) ** 2)));
    const gap = Math.min(gap0 * c, most, narrow ? 150 * c : Infinity);       // khung dọc: khe hẹp — hai bàn tay còn trong khung
    const pose = (g) => { const L = this._reachOut('L', { x: HONG.x - g / 2, y }, geo, !big), R = this._reachOut('R', { x: HONG.x + g / 2, y }, geo, !big);
      return { batL: L.bat, cangL: L.cang, batR: R.bat, cangR: R.cang }; };
    const at = pose(gap), wide = pose(gap * 1.12 + 4 * c), small = gap < 40 * c;
    t.set(s, { tayL: 'mo', tayR: 'mo' }, 0.02);
    t.to(s, { aimL: 1, aimR: 1, carryL: 0, carryR: 0, duration: 0.25, ease: 'sine.inOut' }, 0);
    t.to(s, { ...at, mayL: 0.8, mayR: 0.8, cuoi: 0.6, mieng: small ? 0.1 : 0.45, chum: small ? 0.5 : 0.3, duration: 0.45, ease: 'back.out(1.4)' }, 0);
    // Nảy: hai tay mở thêm một chút rồi về, hai nhịp, đầu gật theo — "cỡ NÀY này!".
    for (let i = 0; i < 2; i++) t.to(s, { ...wide, dauY: 3, duration: 0.17, ease: 'sine.out' }, 0.5 + i * 0.4).to(s, { ...at, dauY: 0, duration: 0.2, ease: 'sine.inOut' }, 0.67 + i * 0.4);
    // Mắt vào khoảng giữa hai tay, rồi ra người xem.
    this._lookTo(t, { x: HONG.x, y }, 0.15, { d: 0.3, huong: 0 });
    this._lookTo(t, null, 0.5 + Math.max(0.6, hold * 0.45), { d: 0.3, huong: 0 });
    const end = 0.45 + Math.max(hold, 1.1);
    if (hold > 1.2) this._chop(t, end - 0.35);
    this._khep(t, 0.45, end, keep);
    return t;
  }

  /**
   * CHỤP ẢNH TỰ SƯỚNG: giơ điện thoại đang cầm (`items: { R: 'phone' }`; đang cất thì lấy ra) lên cao trước mặt, duỗi hết tay, mặt lưng máy
   * về phía người xem; nghiêng đầu, cười thật tươi, tay kia làm chữ V cạnh mặt, nhìn vào máy; CHỚP SÁNG (bấm chụp) — giữ `hold` giây — rồi
   * hạ máy xuống. `with`: người / con vật chụp cùng (rig) — máy giơ chếch về phía họ và người chụp nghiêng đầu về phía họ; cho họ làm phần
   * của mình cùng lúc (`joinSelfie` cho người — tools/scene.py tự thêm). Không cầm điện thoại thì báo lỗi.
   */
  takeSelfie(hold = 1.6, { with: partner = null, side = 'auto' } = {}) {
    if (!(Number.isFinite(hold) && hold > 0)) throw new Error(`[character] takeSelfie: hold must be a number of seconds > 0, got ${JSON.stringify(hold)}`);
    const s = this.s, N = this.NGHI, isPhone = (k) => this.holds[k] && this.el['item' + k] && this.el['item' + k].querySelector('[data-back]');
    const k = side === 'L' || side === 'R' ? side : ['R', 'L'].find((x) => isPhone(x) && s['item' + x] > 0.5) || ['R', 'L'].find(isPhone);
    if (!k || !isPhone(k)) throw new Error('[character] takeSelfie: the character is not holding a phone' + (side === 'L' || side === 'R' ? ` in hand ${side}` : '') + ' — give it one: createCharacter(host, { id, items: { R: "phone" } })');
    if (partner !== null && !(partner && (typeof partner.centerX === 'function' || partner.live || (typeof partner.x === 'number')))) throw new Error('[character] takeSelfie: with must be another character or pet (a rig)');
    const t = this.tl(), o = k === 'L' ? 'R' : 'L', m = k === 'L' ? -1 : 1, stowed = s['item' + k] < 0.5, otherBusy = this.holds[o] && s['item' + o] > 0.5;
    this.selfieSide = k;
    // Người chụp cùng ở phía nào: nghiêng đầu về phía ấy (má kề má), máy chếch về phía ấy nếu cùng phía tay cầm máy.
    const towards = partner ? this._towards(partner.live || partner, k) : m, lean = towards;
    this._faceFront(t);
    if (stowed) t.to(s, { ['item' + k]: 1, duration: 0.15 }, 0);
    if (otherBusy) t.to(s, { ['item' + o]: 0, ['carry' + o]: 0, duration: 0.15 }, 0);
    const geo = this._poseGeo({ huong: 0 }), fc = geo.face, phoneAt = { x: fc.x + m * fc.r * (RigSVG.SELFIE_AT[0] - (partner && towards !== m ? 0.35 : 0)), y: fc.y - fc.r * RigSVG.SELFIE_AT[1] };
    const reach = this._reachOut(k, phoneAt, geo);
    t.set(s, { ['tay' + k]: 'nam' }, 0.02);
    t.to(s, { ['aim' + k]: 1, ['carry' + k]: 0, ['bat' + k]: reach.bat, ['cang' + k]: reach.cang, ['itemZoom' + k]: RigSVG.SELFIE_ZOOM, ['itemBack' + k]: 1, ['itemTilt' + k]: 0,
              duration: 0.5, ease: 'back.out(1.3)' }, 0);
    // Đầu nghiêng (về phía người chụp cùng, hay về phía máy), ngẩng nhìn máy; cười tươi; tay kia chữ V cạnh mặt.
    this._lookTo(t, phoneAt, 0.15, { d: 0.4, huong: 0, up: 1 });
    t.to(s, { dau: N.dau + lean * 9, dauX: lean * 3, than: N.than + lean * 2, vai: N.vai - 6, cuoi: 1, mieng: 0.45, mayL: 0.7, mayR: 0.7, duration: 0.4, ease: 'power2.out' }, 0.15);
    t.to(s, { ['ovBat' + o]: VSIGN_POSE[0], ['ovCang' + o]: VSIGN_POSE[1], duration: 0.02 }, 0.3);      // đồ ở tay kia đã cất (lấy ra lại sau)
    t.to(s, { ['ov' + o]: 1, ['carry' + o]: 0, ['handZoom' + o]: 1.5, duration: 0.3, ease: 'back.out(1.6)' }, 0.3);
    t.set(s, { ['tay' + o]: 'hai' }, 0.35);
    // Bấm chụp: chớp sáng (và một cái nháy mắt) giữa lúc giữ dáng.
    const shot = 0.75 + Math.max(0.5, hold * 0.45);
    t.to(s, { flash: 1, duration: 0.06, ease: 'power2.out' }, shot).to(s, { flash: 0, duration: 0.3, ease: 'power2.in' }, shot + 0.06);
    t.to(s, { ['itemTilt' + k]: -4, duration: 0.08, ease: 'sine.inOut', yoyo: true, repeat: 1 }, shot - 0.02);
    const end = 0.7 + Math.max(hold, 1.2);
    t.set(s, { ['tay' + o]: 'mo' }, end + 0.1);
    this._khep(t, 0.5, end, { ...(stowed ? { ['item' + k]: 0 } : {}), ...(otherBusy ? { ['item' + o]: 1 } : {}) });
    return t;
  }

  /**
   * CHỤP CÙNG (phần của người kia trong `takeSelfie`): nghiêng người và đầu về phía người chụp `taker` (má kề má), ngẩng nhìn máy họ giơ trên
   * cao, cười tươi, tay phía ngoài làm chữ V — giữ cùng nhịp với `takeSelfie(hold)`. Chạy `together` với bước `takeSelfie` của người chụp.
   */
  joinSelfie(taker = null, hold = 1.6) {
    if (!(Number.isFinite(hold) && hold > 0)) throw new Error(`[character] joinSelfie: hold must be a number of seconds > 0, got ${JSON.stringify(hold)}`);
    const t = this.tl(), s = this.s, N = this.NGHI, dir = taker ? this._towards(taker.live || taker, 'R') : 1, outer = dir > 0 ? 'L' : 'R';
    const busy = this.holds[outer] && s['item' + outer] > 0.5;
    this._faceFront(t);
    // Máy ở trên cao phía người chụp: ngẩng và quay đầu về phía ấy.
    const face = this._faceCentre(0);
    this._lookTo(t, { x: face.x + dir * face.r * 2.2, y: face.y - face.r * 2.4 }, 0.15, { d: 0.4, huong: 0, up: 1 });
    t.to(s, { dau: N.dau + dir * 10, dauX: dir * 3, than: N.than + dir * 4, cuoi: 1, mieng: 0.45, mayL: 0.7, mayR: 0.7, duration: 0.45, ease: 'power2.out' }, 0.1);
    if (!busy) {
      t.to(s, { ['ovBat' + outer]: VSIGN_POSE[0], ['ovCang' + outer]: VSIGN_POSE[1], duration: 0.02 }, 0.3);
      t.to(s, { ['ov' + outer]: 1, ['carry' + outer]: 0, ['handZoom' + outer]: 1.5, duration: 0.3, ease: 'back.out(1.6)' }, 0.3);
      t.set(s, { ['tay' + outer]: 'hai' }, 0.35);
    }
    const end = 0.7 + Math.max(hold, 1.2);
    if (!busy) t.set(s, { ['tay' + outer]: 'mo' }, end + 0.1);
    this._khep(t, 0.5, end);
    return t;
  }

  /**
   * NGÁP VƯƠN VAI: hai tay giơ cao qua đầu (chữ V, nắm tay), người rướn lên, ngửa đầu, NGÁP TO (miệng há tròn, mắt nhắm) — giữ `hold` giây,
   * duỗi thêm một chút —, rồi hạ tay, khép miệng, lắc đầu cho tỉnh, chớp mắt. Mệt / vừa ngủ dậy. Đồ đang cầm được cất trong lúc vươn.
   */
  yawnStretch(hold = 1.3) {
    if (!(Number.isFinite(hold) && hold > 0)) throw new Error(`[character] yawnStretch: hold must be a number of seconds > 0, got ${JSON.stringify(hold)}`);
    const t = this.tl(), s = this.s, N = this.NGHI, keep = this._stowBoth(t), [upper, fore] = RigSVG.STRETCH_POSE, standing = s.seat < 0.5;
    this._faceFront(t);
    t.set(s, { tayL: 'nam', tayR: 'nam' }, 0.02);
    t.to(s, { aimL: 1, aimR: 1, carryL: 0, carryR: 0, duration: 0.25 }, 0);
    t.to(s, { batL: upper, batR: upper, cangL: fore, cangR: fore, vai: N.vai - 7, tho: 1, ...(standing ? { y: -6 } : {}), duration: 0.55, ease: 'power2.inOut' }, 0);
    // Ngáp: miệng há to tròn, mắt nhắm, đầu ngửa — đủ lâu cho người xem thấy.
    t.to(s, { mieng: 1, chum: 0.45, cuoi: 0, matY: 1, mayL: 0.55, mayR: 0.55, headPitch: -0.45, dauY: -3, duration: 0.45, ease: 'sine.inOut' }, 0.25);
    const top = 0.7, H = Math.max(hold, 1.1);
    t.to(s, { batL: upper + 5, batR: upper + 5, cangL: fore - 6, cangR: fore - 6, duration: H * 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1 }, top);      // duỗi thêm, run run
    const down = top + H;
    t.to(s, { batL: N.batL, batR: N.batR, cangL: N.cangL, cangR: N.cangR, vai: N.vai, tho: 0, y: 0, mieng: 0.08, chum: 0, headPitch: 0, dauY: 0, matY: 0.35, cuoi: 0.2, duration: 0.5, ease: 'power2.inOut' }, down);
    t.to(s, { mieng: 0, duration: 0.15 }, down + 0.5);
    // Lắc đầu cho tỉnh, chớp mắt.
    [-11, 11, -8, 5].forEach((d, i) => t.to(s, { dauX: d, dau: N.dau - d * 0.45, duration: 0.14, ease: 'sine.inOut' }, down + 0.55 + i * 0.14));
    t.to(s, { dauX: 0, dau: N.dau, matY: 0, duration: 0.18 }, down + 1.11);
    this._chop(t, down + 1.3);
    this._khep(t, 0.4, down + 1.35, keep);
    return t;
  }

  /**
   * DÙNG ĐIỆN THOẠI: đưa nó lên trước ngực (hơi phóng to, màn hình hướng ra ngoài cho người xem thấy), cúi nhìn, ngón
   * trỏ tay kia chạm và vuốt màn hình trong `dur` giây. Đặt lịch, xem nhắc lịch… Phải đang cầm một món đồ.
   */
  tapPhone(dur = 1.6, { side = 'auto', zoom = 2, keep = false } = {}) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this._phoneHand(side), pen = k === 'L' ? 'R' : 'L', m = pen === 'L' ? -1 : 1;
    if (!(this.holds[k] && s['item' + k] > 0.5)) throw new Error('[character] tapPhone: the character is not holding anything in hand ' + k + ' — give it a phone: createCharacter(host, { id, items: { R: "phone" } })');
    this._openUp(t);
    t.to(s, { ['carry' + k]: 0, duration: 0.15 }, 0);
    // CÚI HẲN XUỐNG NHÌN MÀN HÌNH suốt lúc bấm (đầu hạ, mắt nhìn xuống, mí hơi khép): đầu chibi to, cúi ít là đọc thành
    // nhìn thẳng ống kính — Gemini chấm "không nhìn màn hình khi bấm" ở bản đầu (đầu hạ 6, mắt 2,2).
    t.to(s, { ['bat' + k]: TAP_POSE.hold[0], ['cang' + k]: TAP_POSE.hold[1], ['itemZoom' + k]: zoom, dauY: LOOK_DOWN.head, dau: N.dau + m * 3, nhinY: LOOK_DOWN.eyes, matY: LOOK_DOWN.lids,
              nhinX: m * 0.6, cuoi: 0.5, duration: 0.4, ease: 'power2.out' }, 0);
    t.set(s, { ['tay' + pen]: 'chi' }, 0.1);
    t.to(s, { ['bat' + pen]: TAP_POSE.finger[0], ['cang' + pen]: TAP_POSE.finger[1], duration: 0.4, ease: 'power2.out' }, 0.05);
    // Chạm (đầu ngón nhấn tới rồi nhấc) xen với vuốt (cẳng tay quét một đoạn): đọc ra đang bấm chọn trên app.
    const taps = Math.max(2, Math.round(dur / 0.4));
    for (let n = 0; n < taps; n++) {
      const a = 0.45 + n * dur / taps, d = dur / taps, swipe = n % 3 === 2;
      if (swipe) t.to(s, { ['cang' + pen]: TAP_POSE.finger[1] - 14, duration: d * 0.6, ease: 'sine.inOut', yoyo: true, repeat: 1 }, a);
      else t.to(s, { ['bat' + pen]: TAP_POSE.finger[0] + 4, ['cang' + pen]: TAP_POSE.finger[1] + 6, dauY: LOOK_DOWN.head + 1, duration: d * 0.35, ease: 'sine.in', yoyo: true, repeat: 1 }, a);
    }
    if (dur > 1) t.to(s, { cuoi: 0.9, duration: 0.25 }, 0.45 + dur * 0.7);        // tìm được rồi: cười
    // `keep`: tay cầm điện thoại Ở NGUYÊN dáng bấm (phóng to, trước ngực) cho động tác sau — `showPhone` nối thẳng từ đó
    // ra cạnh mặt, không thu điện thoại về cỡ nhỏ rồi lại phóng to (khựng ở 17,4 s bản đầu). `sequence()` tự bật nó khi
    // bước sau là `showPhone`.
    this._khep(t, 0.45, 0.5 + dur, keep ? { ['bat' + k]: TAP_POSE.hold[0], ['cang' + k]: TAP_POSE.hold[1], ['itemZoom' + k]: zoom, ['carry' + k]: 0 } : {});
    return t;
  }

  /**
   * GÕ PHÍM (máy tính đặt trên bàn hay quầy trước mặt — `createProp(host, 'laptop')`): hai tay đưa ra trước, các ngón
   * nhấp liên tục, đầu cúi nhìn màn hình; thỉnh thoảng ngẩng lên đọc. `dur` = số giây gõ.
   */
  typing(dur = 2) {
    const t = this.tl(), s = this.s;
    this._openUp(t);
    t.set(s, { tayL: 'mo', tayR: 'mo' }, 0);
    // CÚI NHÌN MÀN HÌNH rõ ràng: hai bàn tay khuất sau nắp máy, nên ĐẦU và VAI là thứ duy nhất kể chuyện "đang gõ".
    // Bản đầu chỉ hạ đầu 5 đơn vị — nhìn ra vẫn đứng yên nhìn ống kính, như video bị đứng hình (Gemini chấm 1,5/5).
    t.to(s, { batL: TYPE_POSE[0], batR: TYPE_POSE[0], cangL: TYPE_POSE[1], cangR: TYPE_POSE[1], carryL: 0, carryR: 0, dauY: LOOK_DOWN.head, nhinY: LOOK_DOWN.eyes,
              matY: LOOK_DOWN.lids, dau: this.NGHI.dau + 3, cuoi: 0.35, mayL: 0.15, mayR: 0.15, duration: 0.4, ease: 'power2.out' }, 0);
    const beats = Math.max(4, Math.round(dur / 0.12));
    for (let n = 0; n < beats; n++) {
      const side = n % 2 ? 'L' : 'R', a = 0.4 + n * dur / beats;
      // Mỗi nhịp gõ: cẳng tay nảy, VAI bên ấy nhún theo, đầu gật rất nhẹ — nhìn từ trên nắp máy vẫn thấy đang gõ.
      t.to(s, { ['cang' + side]: TYPE_POSE[1] + 6 + (n % 3), vai: (n % 2 ? 1.6 : -1.6) * (side === 'L' ? 1 : 1), dauY: LOOK_DOWN.head + (n % 4 === 0 ? 1.2 : 0),
                duration: dur / beats * 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1 }, a);
    }
    // Ngẩng lên đọc màn hình ở giữa chừng (mắt vẫn nhìn xuống máy), rồi cúi xuống gõ tiếp.
    if (dur > 1.4) t.to(s, { dauY: LOOK_DOWN.head * 0.4, nhinY: LOOK_DOWN.eyes * 0.6, matY: 0, duration: 0.3, ease: 'sine.inOut', yoyo: true, repeat: 1, repeatDelay: 0.35 }, 0.4 + dur * 0.45);
    this._khep(t, 0.45, 0.45 + dur);
    return t;
  }

  // ĐÍCH THẤP (con vật dưới đất / trên bàn): tay nào vươn tới, góc bắp / cẳng, độ ngả người và độ khuỵu gối. `hand`: ép
  // dùng tay ấy (tay đang cầm ống tiêm); bỏ trống = tay ở phía con vật, tay ấy đang cầm đồ thì tay kia.
  static FLOOR_FORE42E = 92;            // đợt 42 E: ngồi bệt vuốt con vật — cẳng tay gập tối đa (độ) khi dò chỗ đặt bàn tay lên đầu nó
  static SEATED_LEAN = 25;              // người ngồi cúi qua đầu gối tới con vật dưới sàn: tối đa bấy nhiêu độ (đợt 30)
  // VUỐT (đợt 32): bàn tay trượt ± 20 % bề ngang đầu con vật (tối đa 10 đơn vị khung), mép dưới bàn tay cao hơn đích 4 đơn vị —
  // đo trên b1 / b2 (tools/acting_check.py, dải mốc vuốt): rộng 30 % thì tay lún qua tai con mèo 22 %, không nâng thì 19 %.
  // Đích 'crown' (bàn tay vẽ trên đầu con vật — set3d `onTopL/R`), mỗi khung: độ cao cổ tay cho phần bàn tay ĐÈ lên đầu (đo trên
  // hình vẽ, từng cột) ít nhất mà phần đè + dải `STROKE_BAND` đơn vị quanh viền đầu ≥ `STROKE_TOUCH` bàn tay, đè ≤ `STROKE_SUNK`.
  static STROKE_GLIDE = 0.2; static STROKE_MAX = 10; static STROKE_LIFT = 4; static STROKE_SUNK = 0.25; static STROKE_TOUCH = 0.16; static STROKE_BAND = 1.2;

  // `maxCrouch` (đợt 35, lượt hai): khuỵu gối tối đa — `offerHand` khuỵu ít (khuỵu sâu mà không quỳ trông như ngồi lên không khí).
  _reachLow(target, hand = null, part = 'head', maxCrouch = 0.5) {
    const s = this.s;
    let tx = 300, ty = 400, span = 0;                 // span: bề ngang đầu con vật (khung của người) — quãng tay trượt khi vuốt
    const live = target && target.live ? target.live : target;
    if (live && typeof live.x === 'number' && typeof live.y === 'number' && !live.el) { tx = live.x - s.x; ty = live.y - s.y - DOI_Y; span = typeof live.span === 'number' ? live.span : 0; }
    else if (live) {
      // Vuốt ve nhắm vào ĐẦU (đỉnh đầu); nghe tim phổi và tiêm nhắm vào THÂN (giữa ngực con vật).
      const body = (part === 'body' || part === 'rear') && live.el && (live.el.thanE || live.el.nguc);
      // Trên đầu con vật: đỉnh đầu (vuốt ve, soi tai), ngang mắt, hay MÕM (soi răng, đưa bánh thưởng).
      const headAt = { head: 0.2, eyes: 0.45, mouth: 0.7, chin: 0.94, lips: 0.5, leg: 0.5 }[part] ?? 0.2;
      // MÔI THẬT của con vật (`givePill`, đợt 35): giữa nét môi (`moi`) — mõm không phải lúc nào cũng ở 70 % đầu (mèo ngồi, chó quay nghiêng).
      const lips = part === 'lips' && live.el && live.el.moi && live.el.moi.getBoundingClientRect().width > 0 ? live.el.moi : null;
      // 'leg' (đợt 35): ống chân trước phía người xem — chỗ quấn băng.
      const leg = part === 'leg' && live.el && live.el.tn;
      const node = body || lips || leg || (live.el && live.el.dau ? live.el.dau : live.getBoundingClientRect ? live : null);
      // Đích là MỎ NEO của conversation (`{ centerX, live }`): con vật ở lượt này đứng ở `centerX()`, còn hình nó lúc dựng
      // vẽ ở một trạng thái cũ (trước khi nó đi tới). Vẽ lại nó theo trạng thái hiện có, rồi dời đích ngang đúng chừng chênh
      // giữa hai chỗ — không thì người ngồi ghế đá với tay ra chỗ con chó đứng lúc đầu cảnh (cảnh thử đợt 29: tay chìa
      // ngang, cách lưng con chó vừa tới sát chân 6,7 % chiều cao).
      const anchored = target !== live && typeof target.centerX === 'function' && typeof live.centerX === 'function' && typeof live.apDung === 'function';
      if (anchored && node) live.apDung();
      // ĐẦU LƯỠI con vật đang liếm (đợt 35, lượt hai): `offerHand` đặt lòng bàn tay ngay dưới đó.
      const tongue = part === 'tongue' && typeof live.lickPoint === 'function' && live.svg && live.svg.getScreenCTM ? live.lickPoint(typeof live.centerX === 'function' && this.centerX() < live.centerX() ? -1 : 1) : null;
      if (tongue) {
        const q = new DOMPoint(tongue.x, tongue.y + 7).matrixTransform(live.svg.getScreenCTM()), sv = this.svg.getBoundingClientRect();
        const unit = Math.min(sv.width / KHUNG.w, sv.height / KHUNG.h) || 1, ox = sv.left + (sv.width - KHUNG.w * unit) / 2, oy = sv.top + (sv.height - KHUNG.h * unit) / 2;
        tx = (q.x - ox) / unit - s.x; ty = (q.y - oy) / unit - s.y - DOI_Y; span = 0;
      } else if (node) {
        const r = node.getBoundingClientRect(), sv = this.svg.getBoundingClientRect();
        const unit = Math.min(sv.width / KHUNG.w, sv.height / KHUNG.h) || 1, ox = sv.left + (sv.width - KHUNG.w * unit) / 2, oy = sv.top + (sv.height - KHUNG.h * unit) / 2;
        const shift = anchored ? (target.centerX() - live.centerX()) / unit : 0;
        tx = (r.left + r.width / 2 - ox) / unit - s.x + shift; ty = (r.top + r.height * (body ? 0.35 : headAt) - oy) / unit - s.y - DOI_Y;
        // THÂN SAU (`takeTemp`, đợt 35): dời về phía ĐUÔI — ngược phía đầu — một phần tư bề ngang thân.
        if (part === 'rear' && body && live.el.dau) { const h = live.el.dau.getBoundingClientRect(); tx += Math.sign(r.left + r.width / 2 - (h.left + h.width / 2)) * r.width * 0.25 / unit; }
        span = r.width / unit;
      }
    }
    // Tay ở PHÍA con vật; tay ấy đang cầm đồ thì dùng tay kia.
    let k = hand || (tx < HONG.x ? 'L' : 'R');
    if (!hand && this.holds[k] && s['item' + k] > 0.5) k = k === 'L' ? 'R' : 'L';
    // Đích thấp hơn hông (con vật dưới đất) thì KHUỴU GỐI xuống — mượn kênh `seat` — cho bàn tay tới gần hơn; vai hạ
    // theo đúng phần thân vừa hạ, nên góc tay tính từ vai ĐÃ HẠ.
    const crouch = s.seat > 0.5 || s.floor42e > 0.5 ? 0 : clamp((ty - HONG.y) / 140, 0, maxCrouch), drop = DAI.dui * this.nv.daiDui * this.nv.coChan * 0.72 * crouch;
    const armUpper = DAI.canhTay * this.nv.daiCanhTay, armFore = DAI.cangTay * this.nv.daiCangTay;
    // Tay Ở PHÍA con vật: duỗi thẳng tới nó. Tay BÊN KIA (vì tay phía con vật đang cầm đồ): không duỗi thẳng tới được —
    // cánh tay phải vắt ngang qua thân — nên gập cẳng tay đưa bàn tay sang phía con vật, trước bụng.
    const across = (k === 'L') !== (tx < HONG.x);
    // Vai THẬT của nhân vật (đợt 31): `VAI` là vai của dáng chuẩn người lớn — bé (chân ngắn, thân ngắn) có vai thấp hơn ~150
    // đơn vị khung, con mèo trên bàn khám ngang đầu bé thành "dưới vai", tay chúc xuống vuốt mép bàn.
    let shoulder = { x: HONG.x + (VAI[k].x - HONG.x) * this.nv.coThan, y: this._shoulderY() };
    // Thân ngả về phía con vật làm cánh tay bên ấy nhấc lên đúng chừng ấy độ — trừ đi, không thì bàn tay chĩa cao hơn đích.
    let lean = clamp((tx - HONG.x) * 0.06, -9, 9), tilt = Math.abs(lean), bend = 0;
    if ((s.seat > 0.5 || s.floor42e > 0.5) && !across) {          // đợt 42 E: ngồi bệt cũng cúi qua đầu gối tới con vật
      // NGƯỜI NGỒI (đợt 30): vai thật đã hạ theo chỗ ngồi (`_shoulderY`) — tính từ vai đứng (`VAI`) thì góc tay dốc quá, bàn
      // tay đặt xuống đùi mình. Con vật dưới sàn ngoài đầu gối thì CÚI NGƯỜI qua đầu gối về phía nó (thân xoay quanh hông,
      // tới SEATED_LEAN độ) cho tới khi đầu nó vào tầm tay — bà trên sofa vuốt mèo: tay đặt trên gối mình, cách đầu mèo
      // 15,7 % chiều cao. `lean` âm = thân xoay theo chiều kim đồng hồ (`than` tăng).
      const px = HONG.x, py = HONG.y + this.hangChan() + this._lowered(), bx = this._shoulderX(k), by = this._shoulderY();
      const dir = tx >= px ? 1 : -1, far = (armUpper + armFore) * 0.92;
      const at = (deg) => { const a = dir * deg * Math.PI / 180; return { x: px + (bx - px) * Math.cos(a) - (by - py) * Math.sin(a), y: py + (bx - px) * Math.sin(a) + (by - py) * Math.cos(a) }; };
      let phi = 0;
      while (phi < RigSVG.SEATED_LEAN && Math.hypot(tx - at(phi).x, ty - at(phi).y) > far) phi = Math.min(phi + 2, RigSVG.SEATED_LEAN);
      shoulder = at(phi); lean = -dir * phi; tilt = -phi; bend = phi;
    }
    // Góc hai đốt tay để bàn tay tới (x, y) — cùng vai, cùng dáng cúi. `stroke` gọi lại ở hai điểm trên đường viền đầu con vật
    // để bàn tay TRƯỢT theo nó (đợt 32).
    const solve = (x, y) => {
      const angle = Math.atan2(y - (shoulder.y + drop), x - shoulder.x) * 180 / Math.PI;
      let upper = across ? 8 : clamp(chuanHoaGoc(k === 'L' ? angle - 90 : 90 - angle) - tilt, -10, 95), fore = across ? -58 : 0;
      // Đích GẦN hơn chiều dài cánh tay (đầu con vật trên bàn khám, người đứng sát): duỗi thẳng thì bàn tay vượt quá đích,
      // thõng xuống dưới nó — đèn soi rọi vào thành bàn. Gập khuỷu (hai đốt, như `_meetAngles`): khuỷu thấp, cẳng tay
      // hất lên, bàn tay dừng đúng ở đích.
      const d = Math.hypot(x - shoulder.x, y - (shoulder.y + drop));
      // `dir`: hướng CẲNG TAY trong khung (độ, y xuống) — bàn tay nối dài theo nó. Duỗi thẳng: hướng vai → đích; gập khuỷu: lệch
      // lên một góc bằng góc ở cổ tay của tam giác vai – khuỷu – cổ tay.
      let dir = angle;
      const bent = !across && d < (armUpper + armFore) * 0.96;
      if (bent) {
        const alpha = Math.acos(clamp((armUpper * armUpper + d * d - armFore * armFore) / (2 * armUpper * d), -1, 1)) * 180 / Math.PI;
        const beta = Math.acos(clamp((armUpper * armUpper + armFore * armFore - d * d) / (2 * armUpper * armFore), -1, 1)) * 180 / Math.PI;
        upper = clamp(upper - alpha, -15, 95); fore = 180 - beta;
        dir = k === 'R' ? angle - (180 - alpha - beta) : angle + (180 - alpha - beta);
      }
      return { upper, fore, dir, bent };
    };
    const { upper, fore, dir } = solve(tx, ty);
    // Đích biết ĐẦU CON VẬT đang dụi / gật tới đâu (`set.target(…).follow`, đợt 32): `stroke` hỏi lại mỗi khung hình. Đích là
    // chính rig con vật (`live.el`) thì không — `RigThu.follow` tính trong khung của con vật.
    const follow = live && !live.el && typeof live.follow === 'function' ? (x, y) => live.follow(x, y, typeof this.bakeTime === 'number' ? this.bakeTime : null) : null;
    const crown = live && !live.el && typeof live.crown === 'function' ? (x0, x1, bins) => live.crown(x0, x1, typeof this.bakeTime === 'number' ? this.bakeTime : null, bins) : null;
    return { k, upper, fore, dir, lean, crouch, tx, ty, span, across, bend, solve, follow, crown, shoulderX: shoulder.x };
  }

  // Cúi người và đưa tay tới đích thấp (dùng chung cho vuốt ve, nghe tim phổi, tiêm).
  _leanTo(t, reach, hand) {
    const s = this.s, N = this.NGHI, { k, upper, fore, lean, crouch, tx } = reach;
    this._openUp(t);
    // Góc tay là góc TRÊN MÀN HÌNH (kênh `aim`), tính từ vị trí con vật: đang quay 3/4 về phía nó mà để góc tay bị pha
    // theo góc quay thì cánh tay co ngắn lại và chúc xuống — tay dừng ở mép bàn khám, thiếu cả thân con vật (đo ở cảnh
    // khám bệnh: thiếu 80 px, thấp 46 px).
    t.to(s, { ['aim' + k]: 1, duration: 0.3, ease: 'sine.inOut' }, 0);
    t.set(s, { ['tay' + k]: hand }, 0.02);
    if (crouch) t.to(s, { seat: crouch, duration: 0.45, ease: 'power2.inOut' }, 0);
    // Cúi sâu lúc ngồi (`bend`): tay bên kia xoay theo thân thì chĩa ngược ra sau — cho nó buông thẳng xuống (đợt 30).
    if (reach.bend) { const other = k === 'L' ? 'R' : 'L'; t.to(s, { ['bat' + other]: -reach.bend, ['cang' + other]: -20, ['aim' + other]: 0, duration: 0.45, ease: 'power2.out' }, 0); }
    t.to(s, { ['bat' + k]: upper, ['cang' + k]: fore, than: N.than - lean, dau: N.dau + lean * 0.8, dauY: 7, nhinX: clamp((tx - HONG.x) * 0.02, -3, 3), nhinY: 2.4, vai: N.vai + 3,
              cuoi: 0.9, mayL: 0.5, mayR: 0.5, duration: 0.45, ease: 'power2.out' }, 0);
  }

  // KHUNG HÌNH VẼ của một nhóm (bàn tay) trong khung 400 × 470 của nhân vật, đo trên đường viền các hình tô của nó (đợt 32):
  // { x0, x1, bottom, columns(n) }. Ghép transform từng lớp tới SVG gốc — không qua màn hình (bối cảnh 3D chiếu nghiêng).
  _outline(group) {
    let x0 = Infinity, x1 = -Infinity, bottom = -Infinity;
    const points = [];
    // nét viền: hình thấy được dày thêm nửa bề dày nét mỗi phía
    for (const q of outlinePoints(this.svg, group)) {
      x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); bottom = Math.max(bottom, q.y + q.edge); points.push({ x: q.x, y: q.y - q.edge }, { x: q.x, y: q.y + q.edge });
    }
    // `columns(n)`: mép trên / dưới của nhóm trong n cột đều nhau từ x0 tới x1 — { high, low } (`null`: cột trống).
    const columns = (n) => {
      const out = new Array(n).fill(null), width = (x1 - x0) / n || 1;
      for (const q of points) {
        const i = Math.min(n - 1, Math.floor((q.x - x0) / width));
        if (!out[i]) out[i] = { high: q.y, low: q.y }; else { out[i].high = Math.min(out[i].high, q.y); out[i].low = Math.max(out[i].low, q.y); }
      }
      return out;
    };
    return Number.isFinite(bottom) ? { x0, x1, bottom, columns } : null;
  }

  /**
   * VUỐT VE một con vật (hay chạm vào một thứ gì thấp hơn mình): cúi người, đưa bàn tay tới `target` — một rig thú,
   * một phần tử, hoặc { x, y } trong hệ viewBox — rồi vuốt ba nhịp. Không có đích thì vuốt một thứ ở cạnh chân phải.
   */
  stroke(target = null) {
    const t = this.tl(), reach = this._reachLow(target), { k } = reach, s = this.s;
    let { upper, fore } = reach;
    this._leanTo(t, reach, 'xoe');          // bàn tay XOÈ úp lên lưng con vật; dáng thả lỏng nhìn cạnh ở đầu một cánh tay duỗi chéo chỉ là một cái gai
    // TRƯỢT THEO ĐẦU (đợt 32): bàn tay đi tới đi lui giữa hai điểm trên cùng đường ngang của đích (đỉnh đầu con vật), mỗi điểm
    // một lời giải hai đốt tay — trước đây lắc khớp ±(4°, 9°) nên bàn tay vẽ một cung: nhấc khỏi đầu rồi lún qua viền nó (bà vuốt
    // mèo: 4 / 13 mốc tay rời đầu, có lúc 64 % bàn tay khuất sau đầu mèo). Quãng trượt: `STROKE_GLIDE` bề ngang đầu mỗi bên.
    const glide = reach.span && !reach.across ? Math.min(RigSVG.STROKE_MAX, reach.span * RigSVG.STROKE_GLIDE) : 0;
    // MÉP DƯỚI BÀN TAY trên một đường (đợt 32): đặt cổ tay cùng một độ cao chưa đủ — đầu "lùi" cẳng tay dựng, bàn tay nằm
    // ngang, hở khỏi đầu con mèo; đầu "tới" bàn tay chúc 26°, lún qua viền nó (mép dưới lệch 14 đơn vị khung). Bàn tay nối dài
    // theo cẳng tay (`dir`): mép dưới của nó cách cổ tay bao nhiêu thì đặt cổ tay cao lên bấy nhiêu, so với dáng ở đích.
    let box = { x: -20, y: -23, width: 31, height: 61 }, scale = 0.9;
    try {
      const el = this.el['coTay' + k], m = this.svg.getScreenCTM().inverse().multiply(el.getScreenCTM());
      const b = el.getBBox();
      if (b.height > 0) { box = b; scale = Math.hypot(m.a, m.b) || scale; }
    } catch (error) { /* chưa vẽ: số đo của bàn tay mẫu */ }
    const below = (deg) => {
      const a = deg * Math.PI / 180, sin = Math.sin(a), cos = Math.abs(Math.cos(a)), half = box.width / 2;
      return scale * (Math.max(box.y * sin, (box.y + box.height) * sin) + half * cos);
    };
    const line = reach.ty + below(reach.dir) - RigSVG.STROKE_LIFT;
    // Đặt cổ tay cho mép dưới bàn tay nằm ở (x, y). `y` mặc định: đường lúc dựng.
    const place = (x, y = line) => {
      let pose = reach.solve(x, y - below(reach.dir));
      for (let n = 0; n < 4; n++) pose = reach.solve(x, y - below(pose.dir));
      return pose;
    };
    // Trong TẦM TAY: điểm xa quá thì cánh tay duỗi thẳng mà cổ tay vẫn không xuống tới đường (bà ngồi sofa đã cúi hết 25°) —
    // bàn tay hở khỏi đầu con vật. Thu quãng trượt phía ấy lại cho tới khi khuỷu còn gập.
    // ĐỢT 42 E: NGỒI BỆT — vai thấp, đỉnh đầu con vật ngang vai: dáng với tới ĐỈNH ĐẦU (`_reachLow`) gập khuỷu hất bàn tay lên quá đầu nó. Với tới
    // đường MÉP DƯỚI bàn tay ngay từ đầu (như khi trượt); khi dò độ cao cổ tay bỏ các lời giải cẳng tay gập quá `FLOOR_FORE42E` (cẳng tay dựng đứng).
    if (s.floor42e > 0.5) { const p = place(reach.tx); upper = p.upper; fore = Math.min(p.fore, RigSVG.FLOOR_FORE42E); t.to(s, { ['bat' + k]: upper, ['cang' + k]: fore, duration: 0.45, ease: 'power2.out' }, 0); }
    const reachable = (sign) => {
      let g = glide, pose = place(reach.tx + sign * g);
      while (g > 1 && !pose.bent && reach.solve(reach.tx, reach.ty).bent) { g *= 0.7; pose = place(reach.tx + sign * g); }
      return g;
    };
    if (glide) {
      // BÁM THEO ĐẦU TỪNG KHUNG (đợt 32, lượt hai): đường trượt dựng một lần lúc dựng timeline thì đầu con vật dụi / nghiêng
      // khi được vuốt (mèo gừ gừ: nghiêng ±7°, dời ±3) kéo tai nó lên quá mép bàn tay — 16–21 % bàn tay khuất sau tai ở hai đầu
      // quãng trượt; nhấc khỏi đầu ở chiều kia. Giờ mỗi khung: điểm dưới bàn tay trên đường ấy dời theo đầu con vật
      // (`follow`), rồi giải lại hai đốt tay. Nhịp như cũ: lùi – tới ba lần, mỗi chặng 0,2 s, sine.
      // TẦM TAY hai phía: xa nhất mà khuỷu còn gập (duỗi thẳng là cổ tay không xuống tới đường — bàn tay hở).
      const limit = (sign) => { let g = 0; while (g < 40 && place(reach.tx + sign * (g + 1)).bent) g += 1; return reach.tx + sign * g; };
      const bentHere = reach.solve(reach.tx, reach.ty).bent, far = bentHere ? limit(1) : reach.tx + glide, near = bentHere ? limit(-1) : reach.tx - glide;
      const crowned = !!(reach.crown && this.el['coTay' + k] && reach.crown(reach.tx - 1, reach.tx + 1, 1));      // đích 'crown' đo được đỉnh đầu
      // `lead`: hoà dần từ dáng cúi (tween của `_leanTo`, xong ở 0,45 s) sang dáng bám đầu TRƯỚC khi trượt — tới 0,45 s đã bám trọn.
      // đợt 42 E: NGỒI BỆT — vai ngang đầu con vật: kéo bàn tay về phía người thì khuỷu gập, bàn tay hất lên khỏi đầu nó. Chỉ trượt ra phía trước.
      const back = s.floor42e > 0.5 ? Math.min(2, reachable(-1)) : reachable(-1), ahead = reachable(1), knots = [0, -1, 1, -1, 1, -1, 1], glider = { u: 0 }, lead = 0.23, span = 1.2 + lead;
      const ease = (f) => (1 - Math.cos(Math.PI * f)) / 2;
      t.to(glider, { u: 1, duration: span, ease: 'none', onUpdate: () => {
        if (glider.u <= 0) return;                                  // tua về trước lúc trượt: để các tween cúi người lo
        const time = glider.u * span, at = Math.max(0, time - lead) / 0.2, n = Math.min(5, Math.floor(at)), f = ease(at - n), p = knots[n] + (knots[n + 1] - knots[n]) * f;
        // Tâm quãng trượt BÁM THEO ĐẦU cả chiều ngang (mèo gừ gừ: đầu dời ngang tới nửa bề ngang nó — giữ đường cũ thì bàn tay
        // vuốt vào khoảng không), nhưng không quá TẦM TAY (`far`): đầu dụi ra xa thì bàn tay dừng ở mép tầm, vẫn trên đầu nó.
        // Độ cao: đường dưới bàn tay xoay / dời cùng đầu, đọc ở đúng chỗ bàn tay.
        // Đích 'crown': tâm là giữa bề ngang ĐẦU ĐANG VẼ ở giây ấy (đo trên hình) — điểm `follow` của một đầu cứng lệch nửa đầu khi
        // con mèo dụi nghiêng.
        const width = crowned ? reach.crown(0, 0, 0) : null;
        const centre = width ? (width.x0 + width.x1) / 2 : reach.follow ? reach.follow(reach.tx, line).x : reach.tx;
        let x = Math.max(near, Math.min(far, centre + p * (p < 0 ? back : ahead)));
        let y = line;
        if (reach.follow) {
          const a = reach.follow(x - 10, line), b = reach.follow(x + 10, line);
          y = a.y + (b.y - a.y) * (x - a.x) / ((b.x - a.x) || 1);
        }
        let pose = place(x, y);
        const w = time < lead ? ease(time / lead) : 1;
        const apply = (q) => { s['bat' + k] = upper + (q.upper - upper) * w; s['cang' + k] = fore + (q.fore - fore) * w; };
        // Đích 'crown' (con vật vẽ trước người; bàn tay vẽ lại trên nó — set3d): đo BÀN TAY THẬT vừa vẽ và MÉP TRÊN THẬT của đầu
        // con vật (cả tai) ở đúng giây ấy, rồi đặt cổ tay cho bàn tay đè lên đầu vừa đủ — tai vểnh, đầu nghiêng, con vật ngồi thấp
        // xuống tới đâu bàn tay theo tới đó. Mô hình bàn tay (`below`) lệch tới vài chục đơn vị với hình vẽ (ngón cái thõng).
        // Đáy bàn tay đổi GẤP theo độ cao cổ tay (gần duỗi thẳng, cẳng tay xoay nhiều: dời cổ tay 1 đơn vị, đầu ngón dời 10–20) —
        // không lặp sửa sai số được, nên DÒ các độ cao cổ tay. Mỗi độ cao: vẽ bàn tay (cộng sẵn nhịp thở), đo từng cột 2 đơn vị
        // phần bàn tay nằm dưới đỉnh đầu ngay dưới nó (đè) và phần sát đỉnh ấy trong `STROKE_BAND` (chạm) — so điểm thấp nhất của
        // bàn tay với điểm cao nhất của đầu thì bàn tay lơ lửng: ngón cái thõng ở chỗ đầu thấp, tai nhô dưới các ngón kia.
        if (crowned) {
          const judge = (h) => {
            const q = place(x, h);
            if (s.floor42e > 0.5 && q.fore > RigSVG.FLOOR_FORE42E) return null;          // đợt 42 E: xem trên
            apply(q);
            // nhịp thở `sequence` sẽ cộng vào khung này (thân đung đưa ±0,7°: vai dời, đáy bàn tay dời cả đơn vị)
            const extra = this.bakeBreath, was = { than: s.than, tho: s.tho };
            if (extra) { s.than = was.than + extra.than; s.tho = Math.min(1, was.tho + extra.tho); }
            this.apDung();
            if (extra) { s.than = was.than; s.tho = was.tho; }
            const hand = this._outline(this.el['coTay' + k]);
            if (!hand) return null;
            const bins = Math.max(1, Math.round((hand.x1 - hand.x0) / 2)), tops = reach.crown(hand.x0, hand.x1, bins), cols = hand.columns(bins);
            let area = 0, sunk = 0, touch = 0;
            cols.forEach((col, i) => {
              if (!col) return;
              area += col.low - col.high;
              if (tops[i] === null) return;
              sunk += Math.max(0, col.low - Math.max(tops[i], col.high)); touch += Math.max(0, col.low - Math.max(tops[i] - RigSVG.STROKE_BAND, col.high));
            });
            return area > 0 ? { h, sunk: sunk / area, touch: touch / area, off: Math.abs(h - y) } : null;
          };
          // Lún trong mức và chạm đủ (`STROKE_TOUCH`): lún ít nhất; lún trong mức mà chưa chạm đủ: chạm nhiều nhất; quá mức: lún ít
          // nhất. Ngang nhau (sai khác < 0,5 %): độ cao gần đường hơn — không thì cổ tay nhảy tới một lời giải xa (bàn tay lật ngửa
          // lên khi không độ cao nào chạm).
          const rank = (p) => (p.sunk > RigSVG.STROKE_SUNK ? 0 : p.touch < RigSVG.STROKE_TOUCH ? 1 : 2), near = (a, b) => Math.abs(a - b) < 0.005;
          const pick = (p, q, a, b, more) => (near(a, b) ? (p.off <= q.off ? p : q) : (more ? a > b : a < b) ? p : q);
          const better = (p, q) => (!q ? p : !p ? q : rank(p) !== rank(q) ? (rank(p) > rank(q) ? p : q)
            : rank(p) === 1 ? pick(p, q, p.touch, q.touch, true) : pick(p, q, p.sunk, q.sunk, false));
          // Dò quanh độ cao của khung trước (lấy mẫu đi tuần tự từng khung): ±6, bước 2; khung đầu / tua nhảy: cả dải −24…12, bước 3.
          const last = this.strokeFit && Math.abs(this.strokeFit.time - (this.bakeTime ?? -1)) < 0.05 ? this.strokeFit.offset : null;
          const search = () => {
            let best = null;
            if (last !== null) for (let d = -6; d <= 6; d += 2) best = better(best, judge(y + last + d));
            else for (let d = -24; d <= 12; d += 3) best = better(best, judge(y + d + (s.floor42e > 0.5 ? 6 : 0)));      // đợt 42 E: ngồi bệt — dò thấp hơn một chút (bàn tay hay lơ lửng trên đầu nó)
            if (best) { const coarse = best.h; for (const d of [-2, -1, 1, 2]) best = better(best, judge(coarse + d)); const fine = best.h; for (const d of [-0.5, 0.5]) best = better(best, judge(fine + d)); }
            return best;
          };
          let best = search();
          // Không độ cao nào chạm (đầu xa của quãng trượt, tay đã duỗi hết mà không hạ tới đầu con vật): lùi điểm trượt về phía
          // người, mỗi lần 3 đơn vị.
          for (let n = 0; n < 5 && (!best || best.touch <= 0); n++) { x -= 3 * (Math.sign(x - reach.shoulderX) || 1); best = search(); }
          if (best) { this.strokeFit = { time: this.bakeTime ?? -1, offset: best.h - y }; y = best.h; pose = place(x, y); }
        }
        apply(pose);
      } }, 0.48 - lead);
      // Đích 'crown': bàn tay vẽ TRÊN đầu con vật trong lúc trượt (set3d, `onTopL/R`) — tween rất ngắn, không `set` ở mốc 0.
      if (crowned) t.to(s, { ['onTop' + k]: 1, duration: 0.02 }, 0.3).to(s, { ['onTop' + k]: 0, duration: 0.02 }, 0.48 - lead + span);
    } else {
      // Đích không đo được bề ngang (một điểm): giữ cách lắc cũ, nhỏ.
      for (let n = 0; n < 3; n++) {
        t.to(s, { ['cang' + k]: fore - 4, ['bat' + k]: upper - 2, duration: 0.2, ease: 'sine.inOut' }, 0.48 + n * 0.4)
         .to(s, { ['cang' + k]: fore + 5, ['bat' + k]: upper + 3, duration: 0.2, ease: 'sine.inOut' }, 0.68 + n * 0.4);
      }
    }
    this._chop(t, 1.0);
    this._khep(t, 0.5, 1.7);
    return t;
  }

  /** VỖ TAY `times` lần trước ngực, cười tươi — khen, chúc mừng. */
  clap(times = 4) {
    const t = this.tl(), s = this.s;
    this._faceFront(t);
    t.set(s, { tayL: 'xoe', tayR: 'xoe' }, 0.05);
    t.to(s, { batL: CLAP_POSE[0], batR: CLAP_POSE[0], cangL: CLAP_POSE[1] + 22, cangR: CLAP_POSE[1] + 22, carryL: 0, carryR: 0, cuoi: 1, mieng: 0.35, mayL: 0.6, mayR: 0.6,
              duration: 0.3, ease: 'power2.out' }, 0);
    for (let n = 0; n < times; n++) {
      const a = 0.3 + n * 0.32;
      t.to(s, { cangL: CLAP_POSE[1], cangR: CLAP_POSE[1], dauY: 2, duration: 0.12, ease: 'power2.in' }, a)            // chạm
       .to(s, { cangL: CLAP_POSE[1] + 22, cangR: CLAP_POSE[1] + 22, dauY: 0, duration: 0.2, ease: 'power2.out' }, a + 0.12);
    }
    this._khep(t, 0.45, 0.35 + times * 0.32);
    return t;
  }

  /** ĐẾM NGÓN TAY tới `count` (1…3): giơ tay cạnh vai, một – hai – ba ngón, mỗi ngón một nhịp — liệt kê lợi ích. */
  countFingers(count = 3, { hand = 'auto' } = {}) {
    const t = this.tl(), s = this.s, k = this._freeHand(hand), m = k === 'L' ? -1 : 1, n = clamp(Math.round(count), 1, 3);
    this._stage(t, [k]);
    t.to(s, { ['ovBat' + k]: COUNT_POSE[0], ['ovCang' + k]: COUNT_POSE[1], duration: 0.02 }, 0);      // tween ngắn, không `set` ở mốc 0 (xem checkWatch)
    t.set(s, { ['tay' + k]: 'nam' }, 0.02);
    // Bàn tay phóng to 1,7 lần: ở khung trung, ngón tay chibi chỉ là một chấm — đếm không đọc được (Gemini, đợt 3).
    // Góc đặt qua kênh `ov` (bước cuối của apDung) cho đúng dáng khuỷu hạ – cẳng tay dựng.
    t.to(s, { ['ov' + k]: 1, ['handZoom' + k]: 1.7, dau: this.NGHI.dau - m * 3, cuoi: 0.8, mayL: 0.5, mayR: 0.5, duration: 0.35, ease: 'back.out(1.5)' }, 0);
    for (let i = 0; i < n; i++) {
      const a = 0.35 + i * COUNT_BEAT;
      t.set(s, { ['tay' + k]: ['mot', 'hai', 'ba'][i] }, a);
      t.to(s, { ['ovCang' + k]: COUNT_POSE[1] + 8, dauY: 2, duration: 0.12, ease: 'power2.out' }, a)                  // nhấn mỗi ngón
       .to(s, { ['ovCang' + k]: COUNT_POSE[1], dauY: 0, duration: 0.25, ease: 'sine.inOut' }, a + 0.12);
    }
    this._khep(t, 0.45, 0.45 + n * COUNT_BEAT);
    return t;
  }

  /** XEM ĐỒNG HỒ: giơ cổ tay lên trước ngực, cúi nhìn đồng hồ, rồi ngẩng lên sốt ruột — chờ lâu, trễ hẹn. */
  checkWatch() {
    const t = this.tl(), s = this.s, k = this._holdsFree('L'), m = k === 'L' ? -1 : 1;
    this._faceFront(t);
    // Góc `ov` đặt bằng tween rất ngắn, KHÔNG `set` ở mốc 0: trong `sequence()` lệnh `set` đúng mốc 0 của một bước không
    // được vẽ — `ov` lên 1 với góc 0 là tay duỗi thẳng xuống (cảnh quầy lễ tân, giây 4).
    t.to(s, { ['ovBat' + k]: WATCH_POSE[0], ['ovCang' + k]: WATCH_POSE[1], ['watch' + k]: 1, duration: 0.02 }, 0);
    t.set(s, { ['tay' + k]: 'nam' }, 0.02);
    t.to(s, { ['ov' + k]: 1, ['carry' + k]: 0, dauY: 8, nhinY: LOOK_DOWN.eyes, matY: LOOK_DOWN.lids, nhinX: m * 1.2, dau: this.NGHI.dau + m * 4,
              duration: 0.4, ease: 'power2.out' }, 0);
    t.to(s, { mayL: -0.4, mayR: -0.4, cuoi: -0.2, duration: 0.3 }, 0.7);                                             // trễ rồi…
    t.to(s, { dauY: 0, nhinY: -0.6, matY: 0, nhinX: -m * 1.4, dau: this.NGHI.dau, duration: 0.35, ease: 'sine.inOut' }, 1.25);  // ngẩng lên nhìn quanh
    t.to(s, { mieng: 0.12, chum: 0.5, duration: 0.15, yoyo: true, repeat: 1 }, 1.6);                                  // "chậc"
    t.set(s, { ['watch' + k]: 0 }, 2.35);
    this._khep(t, 0.45, 1.95);
    return t;
  }

  // Đặt nhanh góc `ov` của các tay rồi bật trọng số lên (dáng chính xác của một cử chỉ) — tween ngắn chứ không `set` ở
  // mốc 0 (xem checkWatch). `poses`: { L: [bắp, cẳng], R: [bắp, cẳng] }.
  _ovPose(t, poses, extra = {}, d = 0.4, ease = 'power2.out') {
    const s = this.s, angles = {}, weights = {};
    for (const [k, [upper, fore]] of Object.entries(poses)) { angles['ovBat' + k] = upper; angles['ovCang' + k] = fore; weights['ov' + k] = 1; weights['carry' + k] = 0; }
    t.to(s, { ...angles, duration: 0.02 }, 0);
    t.to(s, { ...weights, ...extra, duration: d, ease }, 0);
  }

  // Tay rảnh để cử chỉ một tay; cả hai tay đều cầm đồ thì không có tay nào — trả null.
  _gestureHand(hand) {
    const k = this._freeHand(hand);
    return this.holds[k] && this.s['item' + k] > 0.5 ? null : k;
  }

  /** SUY NGHĨ `hold` giây: tay chống cằm, tay kia vắt ngang bụng đỡ khuỷu, mắt nhìn lên một bên, gõ nhẹ ngón vào cằm. */
  ponder(hold = 1.8, { hand = 'auto' } = {}) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this._gestureHand(hand), m = k === 'L' ? -1 : 1;
    if (!k) return this.express('thinking', hold + 0.6);
    const other = k === 'L' ? 'R' : 'L', otherFree = !(this.holds[other] && s['item' + other] > 0.5);
    this._faceFront(t);
    this._ovPose(t, otherFree ? { [k]: PONDER_POSE, [other]: HUG_ARM_POSE } : { [k]: PONDER_POSE },
      { dau: N.dau - m * 6, dauY: 17, nhinX: m * 2.2, nhinY: -1.8, mayL: m > 0 ? 0.2 : 0.75, mayR: m > 0 ? 0.75 : 0.2, chum: 0.45, cuoi: 0.2, duration: 0.45 });
    t.set(s, { ['tay' + k]: 'nam', ...(otherFree ? { ['tay' + other]: 'mo' } : {}) }, 0.05);
    for (let a = 0.6, n = 0; a + 0.3 < 0.45 + hold; a += 0.5, n++) t.to(s, { ['ovCang' + k]: PONDER_POSE[1] + 6, duration: 0.12, ease: 'sine.out', yoyo: true, repeat: 1 }, a);
    this._khep(t, 0.45, 0.45 + hold);
    return t;
  }

  /** KHOANH TAY `hold` giây: hai cẳng tay chéo trước ngực, nghiêng đầu, một bên mày nhướng — hoài nghi, chờ đợi, "để xem". */
  crossArms(hold = 2) {
    const t = this.tl(), s = this.s, N = this.NGHI;
    if (['L', 'R'].some((side) => this.holds[side] && s['item' + side] > 0.5)) return this._headGesture(t, 2, -5);
    this._faceFront(t);
    this._ovPose(t, FOLD_POSE, { dau: N.dau + 5, dauY: -2, mayL: 0.85, mayR: 0.1, cuoi: 0.15, nhinX: -1, vai: N.vai - 2 });
    t.set(s, { tayL: 'nam', tayR: 'nam' }, 0.05);
    t.to(s, { dau: N.dau + 8, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.5 + hold * 0.3);
    this._khep(t, 0.45, 0.4 + hold);
    return t;
  }

  /** CHỐNG NẠNH `hold` giây: hai tay úp vào hông, khuỷu dang ra, ưỡn ngực, cười tự tin. */
  handsOnHips(hold = 2) {
    const t = this.tl(), s = this.s, N = this.NGHI;
    const sides = ['L', 'R'].filter((side) => !(this.holds[side] && s['item' + side] > 0.5));
    if (!sides.length) return this._headGesture(t, 2, -5);
    this._faceFront(t);
    this._ovPose(t, Object.fromEntries(sides.map((side) => [side, HIPS_POSE])), { dauY: -3, vai: N.vai - 3, cuoi: 1, mayL: 0.6, mayR: 0.6, tho: 1 });
    t.set(s, Object.fromEntries(sides.map((side) => ['tay' + side, 'nam'])), 0.05);
    t.to(s, { dau: N.dau + 4, duration: 0.35, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.6);
    this._khep(t, 0.45, 0.4 + hold);
    return t;
  }

  /** GIỚI THIỆU MÌNH: đặt bàn tay lên ngực, nghiêng đầu cười, gật nhẹ — "tôi là…", "cảm ơn". */
  introduce(hand = 'auto') {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this._gestureHand(hand);
    if (!k) return this.nod();
    this._ovPose(t, { [k]: CHEST_POSE }, { cuoi: 1, mayL: 0.55, mayR: 0.55, dau: N.dau + (k === 'L' ? 4 : -4) });
    t.set(s, { ['tay' + k]: 'xoe' }, 0.05);
    t.to(s, { dauY: 9, matY: 0.4, duration: 0.25, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.55);
    this._khep(t, 0.45, 1.5);
    return t;
  }

  /** GỌI TO: giơ cao một tay vẫy, ngẩng đầu, miệng mở to — "Mời bé Milo vào khám!", gọi ai từ xa. */
  callOut(hold = 1.2, { hand = 'auto' } = {}) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this._gestureHand(hand), m = k === 'L' ? -1 : 1;
    if (!k) return this._headGesture(t, 2, -5);
    this._faceFront(t);
    this._ovPose(t, { [k]: HAIL_POSE }, { dauY: -5, dau: N.dau - m * 4, mayL: 0.8, mayR: 0.8, cuoi: 0.5, nhinX: m * 1.5, duration: 0.35 });
    for (let n = 0; n < 4; n++) t.to(s, { ['ovCang' + k]: HAIL_POSE[1] + (n % 2 ? -16 : 16), duration: 0.18, ease: 'sine.inOut' }, 0.4 + n * 0.18);
    t.set(s, { ['tay' + k]: 'xoe' }, 0.05);
    // Hai tiếng gọi: miệng mở to, đầu nhấn theo.
    for (const a of [0.4, 0.4 + hold * 0.55]) t.to(s, { mieng: 0.9, chum: 0, dauY: -8, duration: 0.12, ease: 'power2.out' }, a).to(s, { mieng: 0.25, dauY: -5, duration: hold * 0.4, ease: 'sine.inOut' }, a + 0.12);
    this._khep(t, 0.4, 0.45 + hold);
    return t;
  }

  /** THỞ PHÀO: đặt tay lên ngực, nhắm mắt, vai trĩu xuống một hơi dài, rồi cười nhẹ nhõm — "may quá, bé khỏe rồi". */
  relief(hand = 'auto') {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this._gestureHand(hand);
    if (!k) return this.express('happy', 1.6);
    this._ovPose(t, { [k]: CHEST_POSE }, { matY: 0.85, mieng: 0.3, chum: 0.6, cuoi: 0.4, tho: 1, vai: N.vai - 3, dauY: -2, duration: 0.45 });
    t.set(s, { ['tay' + k]: 'xoe' }, 0.05);
    // Thở ra: vai và đầu trĩu xuống, miệng chúm thổi hơi, rồi mở mắt cười.
    t.to(s, { tho: 0, vai: N.vai + 4, dauY: 8, mieng: 0.15, duration: 0.8, ease: 'sine.inOut' }, 0.5);
    t.to(s, { matY: 0, chum: 0, cuoi: 1, mayL: 0.6, mayR: 0.6, dauY: 2, duration: 0.35, ease: 'power2.out' }, 1.35);
    this._khep(t, 0.45, 1.9);
    return t;
  }

  /** GIẬT MÌNH: người giật lùi, hai bàn tay xoè giơ lên cạnh vai, mắt tròn, miệng chữ O, rồi hoàn hồn. */
  startle() {
    const t = this.tl(), s = this.s, N = this.NGHI;
    const sides = ['L', 'R'].filter((side) => !(this.holds[side] && s['item' + side] > 0.5));
    this._faceFront(t, 0.1);
    this._ovPose(t, Object.fromEntries(sides.map((side) => [side, STARTLE_POSE])), { dauY: -7, vai: N.vai - 6, mieng: 0.85, chum: 0.6, cuoi: -0.2, mayL: 1, mayR: 1, nhinY: -0.6, duration: 0.14, ease: 'back.out(2)' });
    if (sides.length) t.set(s, Object.fromEntries(sides.map((side) => ['tay' + side, 'xoe'])), 0.03);
    t.to(s, { x: s.x - 5, duration: 0.12, ease: 'power2.out' }, 0).to(s, { x: s.x, duration: 0.4, ease: 'sine.inOut' }, 0.6);
    this._chop(t, 0.75);
    t.to(s, { mieng: 0.3, chum: 0.2, duration: 0.3 }, 0.7);
    this._khep(t, 0.45, 1.0);
    return t;
  }

  /** NGÓ QUANH: quay đầu nhìn sang trái, sang phải, rồi về — tìm ai đó, tìm thú cưng đi lạc. */
  lookAround() {
    const t = this.tl(), s = this.s, N = this.NGHI, h = s.huong;
    t.to(s, { huong: clamp(h - 0.35, -1, 1), dau: N.dau + 5, dauX: -4, nhinX: -2.6, mayL: 0.6, mayR: 0.6, cuoi: 0.3, duration: 0.4, ease: 'power2.inOut' }, 0);
    t.to(s, { huong: clamp(h + 0.35, -1, 1), dau: N.dau - 5, dauX: 4, nhinX: 2.6, duration: 0.6, ease: 'power2.inOut' }, 0.9);
    this._chop(t, 1.6);
    this._khep(t, 0.45, 2.0);
    return t;
  }

  /**
   * ĐI VỘI / CHẠY: như `walk` (ngang, đứng lại ở đích) nhưng nhịp chân nhanh gần gấp rưỡi, sải dài, nhón người — tình
   * huống khẩn cấp. `hurry()` chạy tại chỗ; `hurry(6, 200)` chạy 200 đơn vị sang phải.
   */
  hurry(buoc = 6, quang = 0) {
    const t = this.tl(), s = this.s, chieu = quang < 0 ? -1 : 1;
    t.to(s, { huong: chieu, cuoi: 0.2, mayL: 0.85, mayR: 0.85, mieng: 0.25, duration: 0.25, ease: 'power2.inOut' }, 0);
    if (quang) {
      const x0 = s.x, d = this._doBuoc(Math.abs(quang), true, true);
      const at = this._di(t, 0.1, d.buoc, 0.3, { kA: d.kA, chieu, x: (b) => x0 + chieu * d.x(b) });
      this._khep(t, 0.4, at, { x: x0 + quang });
    } else {
      const at = this._di(t, 0.1, buoc, 0.3, { kA: 1.2 });
      this._khep(t, 0.4, at);
    }
    return t;
  }

  // ═════════════════════════════════════ ĐỢT 42 D — CHẠY, NHẢY LÊN, NHẢY MÚA: chuyển động cả thân
  // Ba động tác cần cơ học thật: PHA BAY (cả hai chân rời đất — kênh `lift42d`, bóng ở lại trên sàn), LẤY ĐÀ (khuỵu gối — `seat`
  // một phần, bàn chân vẫn trên đất), TIẾP ĐẤT (gối gập đỡ lực), và CHÂN TRỤ KHÔNG TRƯỢT (chạy: hông đi đúng bằng phần bàn chân trụ
  // lùi về sau; nhảy / múa: không dời `x`, chân trụ đứng yên). Đọc được ở ~1 khung / giây: dáng nghiêng người chạy, hai tay giơ cao lúc bay.

});
