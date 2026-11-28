// runtime/person/feed50c.js — đợt 50 C: feeding and the pet carrier — serve a bowl of food / water (`serveBowl`), put a pet into a carrier
// (`putInCarrier`), let it out (`takeOutOfCarrier`), pick the carrier up by its handle (`pickUpCarrier`) and set it down (`putDownCarrier`).
// Methods of `RigSVG`, installed by runtime/rig-svg.js: `this` is the rig, `RigSVG` its class.
//
// BÁT ĂN (`serveBowl`): người ngồi xổm đặt cái bát đang cầm xuống sàn trước mõm con vật (cách chỗ nó ăn một quãng `gap`), rồi đổ thức ăn từ
// muỗng xúc hạt (dụng cụ 55) / nước từ ca (56) — hạt rơi, dòng nước chảy, bát ĐẦY DẦN —, đứng lên lùi lại nhìn nó. Bát đã đặt là đồ của NGƯỜI
// này vẽ dưới sàn (nhóm `bowls50c` ở gốc SVG, dựng lần đầu dùng): kênh `bowl50c` = số bát đã đặt (GIỮ), `bowlFill50c` độ đầy của bát mới nhất
// (GIỮ; các bát trước đó đầy), `pour50c` dòng đổ đang chảy, `feedT50c` đồng hồ (hạt rơi, nước gợn). Con vật tự đi tới bát và ăn / uống
// (`walk` + `eat` / `drink` của nó, cùng lúc — tools/scene.py tự ghép như `giveTreat` → `chew`): bát nằm đúng chỗ mõm nó cúi xuống sau `gap`.
// `pickUp(pet, { item: 'bowl' })` nhặt bát ấy lên lại (runtime/person/floor.js).
//
// LỒNG VẬN CHUYỂN: lồng trên sàn là HAI đạo cụ (`carrierBack` sau con vật, `carrierFront` trước nó — runtime/props.js), lồng trên tay là món đồ
// `carrier` (runtime/parts.js) — cùng một hình. Mọi lần lồng đổi chỗ / con vật vào ra là một MỤC trong nhật ký của người (`carrierLog50c`), bật theo
// kênh `carrier50c` (số mục đã xảy ra — GIỮ, như `cageMove49a`): lúc vẽ, rig đọc lại nhật ký tới đó (`_carrierNow50c`) để biết lồng đang ở trên tay
// hay ở đạo cụ nào (đạo cụ kia ẩn đi), con vật nào trong lồng trên tay (SVG nó nằm trong ngăn `data-carrier-slot50c` của món đồ — đi theo tay khi
// người bước), cửa lồng nào để mở. Con vật trong lồng trên SÀN là hình nó dời vào giữa hai lớp (kênh `cageMove49a` của đợt 49 A — RigThu.dropX).
// Cửa lưới: kênh `carrierDoor50c` (0 đóng … 1 mở) của cửa thứ `carrierDoorN50c` trong `carrierProps50c`. Tua tới đâu cũng đúng.

import { HONG, DOI_Y, DAI, SQUAT42E, clamp, chuanHoaGoc, mix } from './shared.js';
import { PROP_FRAME, carrierShape50c } from '../props.js';
import { bowl42e, bowlShape42e, carrier50c } from '../parts.js';

const OPEN50C = 0.62;                 // cửa lưới mở hết còn 38 % bề ngang (xoay về phía người xem quanh bản lề — như cửa chuồng đợt 49 A)
const FIT50C = 1.04;                  // con vật rộng / cao hơn lòng lồng (× chừng này) thì không vừa — báo lỗi
const LEVEL50C = 24;                  // sàn lồng lệch chỗ con vật đứng quá chừng này (đơn vị khung người): lồng phải ở trên sàn
const BOWL_COLORS50C = { kibble: ['#d9534f', '#8c2f2b'], water: ['#4f8fc7', '#2c5a85'] };      // bát hạt đỏ, bát nước xanh: thân, lòng bát
const PELLETS50C = [[-10, -13], [-4, -14], [3, -13.5], [9, -12.5], [-7, -16], [0, -17], [6, -16], [-2, -19.5], [3, -20], [-12, -12], [12, -12], [-5, -11.5], [5, -11.5]];

// DỤNG CỤ ĐỔ (hệ cổ tay: lòng bàn tay ở (0, 10), dụng cụ chĩa theo +y; `data-spout` = miệng đổ). 55 MUỖNG XÚC HẠT: cán trong nắm tay, gáo nhựa
// đầy hạt (miệng ở đầu xa). 56 CA NƯỚC: thân ca xanh trong, mực nước, vòi ở đầu xa.
const TOOL50C = {
  55: `<g data-gadget="55" data-spout="0 43"><rect x="-3.400" y="-6" width="6.800" height="22" rx="3" fill="#f0b23a" stroke="#8a5a12" stroke-width="1.100"/>
        <path d="M -10 16 L 10 16 L 8 41 Q 0 44 -8 41 Z" fill="#f6d27a" stroke="#8a5a12" stroke-width="1.200" stroke-linejoin="round"/>
        <g data-scoop-food50c="">${[[-4, 36], [0, 38], [4, 36], [-2, 33], [3, 32], [-5, 31], [1, 29]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.300" fill="#a0612f" stroke="#6e3e1b" stroke-width=".6"/>`).join('')}</g></g>`,
  56: `<g data-gadget="56" data-spout="0 42"><rect x="-3.200" y="-6" width="6.400" height="18" rx="3" fill="#cfd8e0" stroke="#4a5562" stroke-width="1.100"/>
        <path d="M -11 12 L 11 12 L 10 36 L 3 42 L -3 42 L -10 36 Z" fill="#dff1fb" fill-opacity=".9" stroke="#4a6a82" stroke-width="1.200" stroke-linejoin="round"/>
        <path data-jug-water50c="" d="M -10.300 24 L 10.300 24 L 9.800 35.500 L 3 41 L -3 41 L -9.800 35.500 Z" fill="#7cc4ef" fill-opacity=".85"/></g>`,
};

export default (RigSVG) => mix(RigSVG, class {
  // Nhịp của `serveBowl` (giây từ đầu bước) — tools/scenelib/feed50c.py dùng cùng số: đặt bát xuống, bắt đầu đổ, con vật đi tới được (người đã lùi).
  static BOWL_DOWN50C = 1.04;
  static BOWL_POUR50C = 1.6;
  static BOWL_BACK50C = 0.8;          // lùi lại chừng ấy × bề ngang bát + quãng `gap` sau khi đổ xong
  static bowlReady50c(hold = 0.6) { return RigSVG.BOWL_POUR50C + 0.6 + hold + 0.75; }
  // Nhịp lồng: `takeOutOfCarrier` — cửa đã mở để con vật bước ra lúc này (giây từ đầu bước, khi lồng đã ở trên sàn; đang xách thì cộng `CARRIER_SET50C`).
  static CARRIER_OPEN50C = 1.75;
  static CARRIER_SET50C = 1.7;

  // ═══════════════════════════════════════════════ BÁT ĂN

  // Nhóm bát dưới sàn (gốc SVG, ngay sau món đồ chờ nhặt của đợt 42 E — sau người) — dựng lần đầu dùng: nhân vật chưa từng đặt bát thì SVG như cũ.
  _bowlLayer50c() {
    const e = this.el;
    if (!e.bowls50c) {
      e.drop42e.insertAdjacentHTML('afterend', '<g data-bowls50c=""><g data-bowl-list50c=""></g><g data-pour50c="" style="display:none"></g></g>');
      e.bowls50c = e.drop42e.nextElementSibling;
    }
    return e.bowls50c;
  }

  // Một bát dưới sàn: (x, y) gốc SVG là đáy giữa bát, `k` cỡ (đơn vị khung / đơn vị bàn tay — bằng cỡ bát lúc trong tay), `food` 'kibble' | 'water'.
  static _bowlSvg50c({ x, y, k, food }) {
    const [color, inner] = BOWL_COLORS50C[food];
    return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${k.toFixed(4)})" style="display:none">${bowlShape42e(color, inner)}
      <ellipse data-water50c="" cx="0" cy="-12" rx="15" ry="3.200" fill="#7cc4ef" style="display:none"/><ellipse data-shine50c="" cx="-5" cy="-12.6" rx="4" ry="1" fill="#ffffff" opacity=".7" style="display:none"/>
      <path data-mound50c="" fill="#a0612f" stroke="#6e3e1b" stroke-width=".7" style="display:none"/>
      <g data-pellets50c="">${PELLETS50C.map(([px, py]) => `<circle cx="${px}" cy="${py}" r="2.200" fill="#b0703a" stroke="#6e3e1b" stroke-width=".6" style="display:none"/>`).join('')}</g></g>`;
  }

  _drawBowls50c() {
    const s = this.s, list = this.bowls50c || [], g = this._bowlLayer50c(), box = g.firstElementChild;
    if (box.childElementCount !== list.length) box.innerHTML = list.map((bowl) => RigSVG._bowlSvg50c(bowl)).join('');
    const count = Math.round(s.bowl50c || 0), f2 = (v) => v.toFixed(2);
    list.forEach((bowl, n) => {
      const node = box.children[n], shown = n < count, fill = n < count - 1 ? 1 : clamp(+s.bowlFill50c || 0, 0, 1);
      node.style.display = shown ? '' : 'none';
      if (!shown) return;
      const water = node.querySelector('[data-water50c]'), shine = node.querySelector('[data-shine50c]'), mound = node.querySelector('[data-mound50c]');
      if (bowl.food === 'water') {
        water.style.display = fill > 0.02 ? '' : 'none'; shine.style.display = fill > 0.5 ? '' : 'none';
        // Mực nước dâng từ đáy lòng bát (y −7) lên sát miệng (−12): elip rộng dần theo thành bát; gợn nhẹ khi dòng nước đang đổ vào.
        const lv = -7 - 5 * fill, wob = s.pour50c > 0.05 && n === count - 1 ? 0.5 * Math.sin((+s.feedT50c || 0) * 23) : 0;
        water.setAttribute('cy', f2(lv)); water.setAttribute('rx', f2(11 + 4 * fill)); water.setAttribute('ry', f2(2.4 + 0.8 * fill + wob));
      } else {
        // Đống hạt nhô dần lên khỏi miệng bát, các hạt rời hiện dần từ đáy lên.
        mound.style.display = fill > 0.02 ? '' : 'none';
        const top = -11 - 8 * fill;
        mound.setAttribute('d', `M -15 -11.6 Q -11 ${f2(top + 2)} 0 ${f2(top)} Q 11 ${f2(top + 2)} 15 -11.6 Q 0 -9.6 -15 -11.6 Z`);
        [...node.querySelector('[data-pellets50c]').children].forEach((dot, i) => { dot.style.display = fill * PELLETS50C.length > i + 0.5 ? '' : 'none'; });
      }
    });
    // DÒNG ĐỔ: từ miệng dụng cụ (đo trên hình mỗi lần vẽ) xuống mặt bát mới nhất — hạt rơi lả tả / dòng nước.
    const pour = g.lastElementChild, v = clamp(+s.pour50c || 0, 0, 1), side = ['L', 'R'].find((k) => [55, 56].includes(Math.round(s['gadget' + k])));
    const tool = side && this.el['gadget' + side] && [...this.el['gadget' + side].children].find((child) => +child.getAttribute('data-gadget') === Math.round(s['gadget' + side]));
    const bowl = list[count - 1];
    if (!(v > 0.02 && tool && bowl && tool.getScreenCTM() && this.svg.getScreenCTM())) { pour.style.display = 'none'; return; }
    const [sx, sy] = tool.getAttribute('data-spout').split(' ').map(Number), m = this.svg.getScreenCTM().inverse().multiply(tool.getScreenCTM()), q = new DOMPoint(sx, sy).matrixTransform(m);
    const bx = bowl.x, by = bowl.y - 13 * bowl.k, T = +s.feedT50c || 0;
    pour.style.display = '';
    if (bowl.food === 'water') {
      const mid = (q.y + by) / 2, w = 0.8 * Math.sin(T * 17);
      if (pour.getAttribute('data-kind') !== 'water') { pour.setAttribute('data-kind', 'water'); pour.innerHTML = '<path fill="none" stroke="#7cc4ef" stroke-width="4.200" stroke-linecap="round" opacity=".85"/><path fill="none" stroke="#ffffff" stroke-width="1.600" stroke-linecap="round" stroke-dasharray="6 5"/><ellipse fill="#dff1fb" stroke="#7cc4ef" stroke-width="1"/>'; }
      const end = q.y + (by - q.y) * v, d = `M ${f2(q.x)} ${f2(q.y)} Q ${f2((q.x + bx) / 2 + w)} ${f2(Math.min(mid, end))} ${f2(bx + w * 0.5)} ${f2(end)}`;
      pour.children[0].setAttribute('d', d); pour.children[1].setAttribute('d', d); pour.children[1].setAttribute('stroke-dashoffset', f2(-T * 60));
      const splash = pour.children[2]; splash.style.display = v > 0.95 ? '' : 'none';
      splash.setAttribute('cx', f2(bx)); splash.setAttribute('cy', f2(by + 1)); splash.setAttribute('rx', f2(5 + Math.abs(Math.sin(T * 13)) * 2)); splash.setAttribute('ry', '1.8');
    } else {
      if (pour.getAttribute('data-kind') !== 'kibble') { pour.setAttribute('data-kind', 'kibble'); pour.innerHTML = Array.from({ length: 7 }, () => '<circle r="2.300" fill="#b0703a" stroke="#6e3e1b" stroke-width=".6"/>').join(''); }
      [...pour.children].forEach((dot, i) => {
        const p = ((T * 2.6 + i / 7) % 1 + 1) % 1, x = q.x + (bx - q.x) * p + Math.sin(i * 2.1 + T * 5) * 2.2, y = q.y + (by - q.y) * p * p;
        dot.style.display = p <= v ? '' : 'none'; dot.setAttribute('cx', f2(x)); dot.setAttribute('cy', f2(y));
      });
    }
  }

  // Dụng cụ đổ 55 / 56 — dựng lần đầu dùng vào ngăn `gadgetL/R` (như máy sấy đợt 49 B); mực hạt / nước trong dụng cụ vơi theo độ đầy của bát.
  _drawFeedTools50c() {
    const s = this.s, e = this.el;
    for (const side of ['L', 'R']) {
      const box = e['gadget' + side], kind = Math.round(s['gadget' + side]);
      if (!box || (kind !== 55 && kind !== 56)) continue;
      let tool = [...box.children].find((child) => +child.getAttribute('data-gadget') === kind);
      if (!tool) { box.insertAdjacentHTML('beforeend', TOOL50C[kind]); tool = box.lastElementChild; }
      tool.style.display = '';
      const left = 1 - clamp(+s.bowlFill50c || 0, 0, 1);
      if (kind === 55) [...tool.querySelector('[data-scoop-food50c]').children].forEach((dot, i) => { dot.style.display = left * 7 > i + 0.5 ? '' : 'none'; });
      else tool.querySelector('[data-jug-water50c]').setAttribute('transform', `translate(0 ${(17 * (1 - left)).toFixed(2)})`);
    }
  }

  // Bát mà người đã đặt xuống cho con vật `pet` (mới nhất trước), hay null — `pickUp(pet, { item: 'bowl' })` nhặt nó (runtime/person/floor.js).
  static bowlFor50c(pet) {
    const real = pet && pet.live ? pet.live : pet;
    for (const rig of [...(RigSVG._servers50c || [])].reverse()) {
      const list = rig.bowls50c || [], count = Math.round(rig.s.bowl50c || 0);
      for (let n = Math.min(count, list.length) - 1; n >= 0; n--) if (list[n].pet === real) return { rig, n, bowl: list[n], el: rig._bowlLayer50c().firstElementChild.children[n] };
    }
    return null;
  }

  // Tay `k` tới điểm `p` (hệ `_aimOf`) ở dáng NGỒI XỔM nhìn nghiêng về `dir` (như `pickUp`): đổ lưng tới 45°, rồi nhích lại gần tới 70 đơn vị.
  // `stand`: thử dáng ĐỨNG cúi trước (đích cao — quai lồng ngang hông). Trả { pose, lean, shift, squat }.
  _floorReach50c(k, p, dir, stand = false) {
    const s = this.s, saved = { huong: s.huong, squat42e: s.squat42e, seat: s.seat, kneel: s.kneel, than: s.than };
    const arm = DAI.canhTay * this.nv.daiCanhTay + DAI.cangTay * this.nv.daiCangTay + 8 * this.nv.coThan;
    let pose = null, lean = 0, shift = 0, squat = 0;
    try {
      if (stand) {
        Object.assign(s, { huong: dir, squat42e: 0, seat: 0, kneel: 0 });
        const fits = (deg) => { const geo = this._poseGeo({ huong: dir, lean: dir * deg }), sh = geo[k]; pose = this._palmTo(k, p, geo); return Math.hypot(p.x - sh.x, p.y - sh.y) <= arm; };
        for (lean = 0; lean <= 30; lean += 3) if (fits(lean)) return { pose, lean, shift: 0, squat: 0 };
      }
      Object.assign(s, { huong: dir, squat42e: 1, seat: 0, kneel: 0 });
      squat = 1; lean = SQUAT42E.lean;
      const g = this._floorLegGeo(), back = g[k].ankle.x - g[k].hip.x;
      const fits = (deg, extra) => { const geo = this._poseGeo({ huong: dir, lean: dir * deg, step: -back + dir * extra }), sh = geo[k]; pose = this._palmTo(k, p, geo); return Math.hypot(p.x - sh.x, p.y - sh.y) <= arm; };
      let done = false;
      for (; lean <= 45 && !(done = fits(lean, 0)); lean += 3);
      if (!done) for (lean = 42, shift = 5; shift <= 70 && !fits(lean, shift); shift += 5);
      lean = Math.min(lean, 45); shift = Math.min(shift, 70);
    } finally { Object.assign(s, saved); }
    return { pose, lean, shift, squat };
  }

  // Con vật `pet` (rig, hay đích `set.target(người, con vật, 'head')` trong bối cảnh 3D) → tâm đầu (hệ GỐC của SVG này) và hướng nó quay mặt.
  _petHead50c(pet) {
    const real = pet && pet.live ? pet.live : pet && pet.rig ? pet.rig : pet;
    if (!real || !real.svg || !real.el || !real.el.dau || real instanceof RigSVG) return null;
    const fwd = (real.s.huong || 0) < 0 ? -1 : 1;
    if (pet && pet !== real && typeof pet.x === 'number' && typeof pet.y === 'number') return { rig: real, x: pet.x, y: pet.y, fwd };
    RigSVG._homePet(real);
    real.apDung();
    const inv = this.svg.getScreenCTM().inverse(), q = real.el.dau.getBoundingClientRect(), a = new DOMPoint(q.left, q.top).matrixTransform(inv), b = new DOMPoint(q.right, q.bottom).matrixTransform(inv);
    return { rig: real, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, fwd, w: b.x - a.x };
  }

  /**
   * ĐẶT BÁT CHO ĂN / UỐNG: người quay nghiêng, NGỒI XỔM, đặt cái bát đang cầm (tay chưa có thì rig cho một cái bát, lấy ra lúc bắt đầu) xuống sàn TRƯỚC
   * MÕM con vật `pet`, cách chỗ nó cúi ăn `gap` đơn vị khung (về phía nó đang quay mặt — nó sẽ bước tới); rồi ĐỔ: muỗng xúc hạt (`food: 'kibble'`) hay
   * ca nước (`'water'`) hiện trong tay ấy, nghiêng trên bát — hạt rơi / dòng nước chảy, bát đầy dần trong `0,6 + hold` giây —, cất, đứng lên, LÙI
   * lại nhìn nó, cười. Bát nằm lại dưới sàn (vẽ trong SVG người này). Con vật đi tới và ăn / uống (`walk` + `eat` / `drink` của nó, bắt đầu sau
   * `RigSVG.bowlReady50c(hold)` giây). Người đứng phía con vật quay mặt về (trước đầu nó).
   */
  serveBowl(pet, { food = 'kibble', hold = 0.6, gap = 44, side = 'auto' } = {}) {
    if (food !== 'kibble' && food !== 'water') throw new Error(`[character] serveBowl: food must be 'kibble' or 'water', got ${JSON.stringify(food)}`);
    if (!(Number.isFinite(hold) && hold >= 0 && hold <= 4)) throw new Error(`[character] serveBowl: hold must be 0…4 seconds of pouring, got ${JSON.stringify(hold)}`);
    if (!(Number.isFinite(gap) && gap >= 0 && gap <= 160)) throw new Error(`[character] serveBowl: gap must be 0…160 frame units (how far in front of the muzzle the bowl goes), got ${JSON.stringify(gap)}`);
    if (side !== 'auto' && side !== 'L' && side !== 'R') throw new Error(`[character] serveBowl: side must be 'auto', 'L' or 'R', got ${JSON.stringify(side)}`);
    const head = this._petHead50c(pet);
    if (!head) throw new Error('[character] serveBowl(pet): pet must be a pet rig (createPet(...).rig) or set.target(person, pet, "head") — the bowl goes in front of its muzzle');
    const s = this.s, N = this.NGHI;
    if (s.lie42e > 0.5 || s.floor42e > 0.5 || s.seat > 0.5 || s.ride > 0.5) throw new Error('[character] serveBowl: stand up first (standUp / getOff) — the character serves the bowl from standing');
    if (s.om >= 0.5) throw new Error('[character] serveBowl: the character is carrying a pet — putDown() first');
    // CHỖ ĐẶT BÁT (gốc SVG): dưới mõm con vật khi nó cúi ăn (tâm đầu + 0,3 bề ngang đầu về phía nó quay mặt), thêm `gap` — trên sàn của người.
    const reach = (head.w || 40) * 0.3, rootX = head.x + head.fwd * (reach + gap), rootY = 428 + DOI_Y, me = HONG.x + (s.x || 0);
    if ((me - head.x) * head.fwd < 0) throw new Error('[character] serveBowl: stand on the side the pet faces (in front of its head) — the bowl goes in front of its muzzle');
    const dir = rootX >= me ? 1 : -1, near = dir > 0 ? 'L' : 'R', far = near === 'L' ? 'R' : 'L';
    // Tay CẦM BÁT: tay đang cầm bát; không thì tay gần (rảnh) — rig cho nó một cái bát (đang cất, lấy ra lúc bắt đầu).
    const has = (k) => !!(this.holds[k] && this.el['item' + k] && this.el['item' + k].querySelector('[data-bowl42e]'));
    const busy = (k) => this.holds[k] && s['item' + k] > 0.5 && !has(k);
    let k = side !== 'auto' ? side : [near, far].find((h) => has(h) && s['item' + h] > 0.5) || [near, far].find((h) => !busy(h));
    if (!k || busy(k)) throw new Error('[character] serveBowl: both hands hold something — put an item away first (hideItem)');
    const [color, inner] = BOWL_COLORS50C[food];
    const fresh = !has(k) || (this.bowlFood50c && this.bowlFood50c[k] !== food);
    if (fresh) {
      const keepArms = Object.fromEntries(['batL', 'cangL', 'tayL', 'batR', 'cangR', 'tayR', 'itemL', 'itemR'].map((key) => [key, s[key]]));
      this.setItem(k, (p, c) => bowl42e(c, { color, food: inner }), { shown: false });
      Object.assign(this.s, keepArms, { ['item' + k]: 0 }); this.apDung();
      this.bowlFood50c = { ...(this.bowlFood50c || {}), [k]: food };
    }
    const shown = s['item' + k] > 0.5;
    // Cỡ bát dưới sàn = cỡ bát trong tay (đơn vị khung / đơn vị bàn tay, đo trên hình).
    const ib = this.el['item' + k], m = ib && ib.getScreenCTM && ib.getScreenCTM(), r = this.svg.getScreenCTM && this.svg.getScreenCTM();
    const kb = m && r && Math.hypot(r.a, r.b) ? Math.hypot(m.a, m.b) / Math.hypot(r.a, r.b) : this.nv.coThan;
    // Bát thứ n (dựng lại bước — bản nháp rồi bản thật của `sequence()` — thì dùng lại số của nó).
    const list = this.bowls50c = this.bowls50c || [];
    let n = list.findIndex((b) => b.pet === head.rig && b.food === food && Math.abs(b.x - rootX) < 0.5);
    if (n < 0) { list.push({ x: rootX, y: rootY, k: kb, food, pet: head.rig }); n = list.length - 1; }
    (RigSVG._servers50c || (RigSVG._servers50c = new Set())).add(this);
    this._bowlLayer50c();
    const t = this.tl(), was = s.huong, o = k === 'L' ? 'R' : 'L';
    // Bàn tay ĐẶT BÁT: lòng bàn tay ngay trên vành bát (bát treo dưới lòng bàn tay 8 đơn vị — như `pickUp`).
    const spot = { x: rootX - (s.x || 0), y: 428 - 8 };
    const put = this._floorReach50c(k, spot, dir);
    const pourAt = { x: spot.x - dir * 4, y: 428 - 14 - 40 };
    const pourPose = this._floorReach50c(k, pourAt, dir).pose;
    if (!shown) t.to(s, { ['item' + k]: 1, duration: 0.12 }, 0.02);
    if (put.shift) t.to(s, { x: s.x + dir * put.shift, duration: 0.45, ease: 'sine.inOut' }, 0);
    t.to(s, { huong: dir, ['carry' + k]: 0, cuoi: 0.75, nhinX: dir * 2, duration: 0.35, ease: 'power2.inOut' }, 0);
    t.to(s, { ['aim' + k]: 1, duration: 0.3, ease: 'sine.inOut' }, 0.3);
    const free = !(this.holds[o] && s['item' + o] > 0.5), hang = -dir * (18 + put.lean);
    if (free) { t.to(s, { ['aim' + o]: 1, duration: 0.3, ease: 'sine.inOut' }, 0.3); t.set(s, { ['tay' + o]: 'mo' }, 0.32); }
    // 1. NGỒI XỔM, bát xuống tới sàn trước mõm con vật.
    t.to(s, { squat42e: put.squat, than: N.than + dir * put.lean, dau: N.dau - dir * put.lean * 0.45, dauY: 6, nhinY: 2.6, ['bat' + k]: put.pose.bat, ['cang' + k]: put.pose.cang,
              ...(free ? { ['bat' + o]: o === 'L' ? hang : -hang, ['cang' + o]: o === 'L' ? -12 * dir : 12 * dir } : {}), duration: 0.65, ease: 'power2.inOut' }, 0.35);
    // 2. BUÔNG BÁT: bàn tay mở, bát rời tay nằm lại dưới sàn (bát thứ n hiện, rỗng).
    const D = RigSVG.BOWL_DOWN50C, P = RigSVG.BOWL_POUR50C;
    t.set(s, { ['tay' + k]: 'xoe' }, D - 0.02);
    t.to(s, { ['item' + k]: 0, bowl50c: n + 1, bowlFill50c: 0, duration: 0.02 }, D);
    // 3. ĐỔ: tay nhấc lên trên bát, muỗng / ca hiện trong tay, CHÚC MIỆNG XUỐNG bát; hạt rơi / nước chảy, bát đầy dần.
    const fore = k === 'R' ? 90 - pourPose.bat - pourPose.cang : 90 + pourPose.bat + pourPose.cang, spin = chuanHoaGoc(90 - fore);
    t.to(s, { ['bat' + k]: pourPose.bat, ['cang' + k]: pourPose.cang, duration: 0.4, ease: 'power2.inOut' }, D + 0.08);
    t.set(s, { ['gadget' + k]: food === 'water' ? 56 : 55, ['tay' + k]: 'nam', ['gadgetTurn' + k]: 0, pour50c: 0 }, D + 0.14);
    t.to(s, { ['gadgetTurn' + k]: k === 'L' ? -spin : spin, duration: 0.35, ease: 'sine.inOut' }, D + 0.2);
    t.to(s, { pour50c: 1, duration: 0.25, ease: 'sine.out' }, P);
    t.fromTo(s, { feedT50c: 0 }, { feedT50c: 0.6 + hold + 0.6, duration: 0.6 + hold + 0.6, ease: 'none', immediateRender: false }, P - 0.3);
    t.to(s, { bowlFill50c: 1, duration: 0.6 + hold, ease: 'sine.inOut' }, P + 0.1);
    t.to(s, { cuoi: 1, mieng: 0.3, mayL: 0.5, mayR: 0.5, duration: 0.3 }, P + 0.3);
    const E = P + 0.6 + hold + 0.15;
    // 4. Xong: dòng đổ tắt, dụng cụ thẳng lại, cất (tay về), đứng lên, LÙI một quãng cho con vật tới bát; nhìn nó, cười.
    t.to(s, { pour50c: 0, duration: 0.15, ease: 'sine.in' }, E - 0.1);
    t.to(s, { ['gadgetTurn' + k]: 0, duration: 0.25, ease: 'sine.inOut' }, E);
    t.set(s, { ['gadget' + k]: 0, ['tay' + k]: 'mo' }, E + 0.3);
    t.to(s, { squat42e: 0, than: N.than, dau: N.dau, dauY: 0, nhinY: 0.8, duration: 0.6, ease: 'power2.inOut' }, E + 0.2);
    t.to(s, { ['aim' + k]: 0, ['bat' + k]: N['bat' + k], ['cang' + k]: N['cang' + k], ...(free ? { ['aim' + o]: 0, ['bat' + o]: N['bat' + o], ['cang' + o]: N['cang' + o] } : {}), duration: 0.5, ease: 'power2.inOut' }, E + 0.25);
    const back = RigSVG.BOWL_BACK50C * 36 * kb + gap;
    t.to(s, { x: s.x + dir * put.shift - dir * back, duration: 0.6, ease: 'sine.inOut' }, E + 0.4);
    t.to(s, { dauY: 3, duration: 0.15, ease: 'sine.inOut', yoyo: true, repeat: 3 }, E + 0.4);
    this._lookTo(t, { x: rootX - (s.x || 0) - dir * put.shift + dir * back, y: 428 - 20 }, E + 0.8, { d: 0.4, huong: was });
    t.to(s, { cuoi: 1, mieng: 0.25, duration: 0.3 }, E + 0.9);
    this._khep(t, 0.45, E + 1.05, { ['item' + k]: 0, bowl50c: n + 1, bowlFill50c: 1, huong: was, x: s.x + dir * put.shift - dir * back });
    return t;
  }

  /** Số đo bát (đợt 50 C — tools/acting_check.py qua `set.careProbe()`): các bát đã đặt (gốc SVG, cỡ, độ đầy), dòng đổ, dụng cụ trong tay. */
  feed50cProbe() {
    const s = this.s, count = Math.round(s.bowl50c || 0), list = this.bowls50c || [];
    const side = ['L', 'R'].find((k) => [55, 56].includes(Math.round(s['gadget' + k])));
    return { bowls: list.slice(0, count).map((b, n) => ({ x: b.x, y: b.y, k: b.k, food: b.food, fill: n < count - 1 ? 1 : +clamp(+s.bowlFill50c || 0, 0, 1).toFixed(3) })),
             pour: +clamp(+s.pour50c || 0, 0, 1).toFixed(3), tool: side ? Math.round(s['gadget' + side]) : 0, layer: this.el.bowls50c || null };
  }

  // ═══════════════════════════════════════════════ LỒNG VẬN CHUYỂN

  // LỒNG TRÊN SÀN trong hệ gốc của SVG này: `carrier` là đạo cụ `carrierFront` (createProp(…, 'carrierFront'), hay phần tử chứa nó — đo trên màn hình
  // lúc dựng), hay `{ at, scale, door, back }` (bối cảnh 3D): `at` = điểm giữa đáy lồng (x 200, sàn 458 của khung đạo cụ), `scale` = đơn vị khung người
  // / đơn vị khung đạo cụ, `door` / `back` = đạo cụ `carrierFront` / `carrierBack`. Lớp sau (`carrierBack`) không đưa thì tìm cái cùng chỗ trên trang.
  // Ghi đạo cụ vào `carrierProps50c` (số thứ tự của nó là `carrierDoorN50c` khi mở cửa nó). Trả về hàm đổi điểm, cỡ, hình học, cửa, bản lề, chốt.
  _carrier50c(carrier, name) {
    const svgOf = (v, kind) => v && (v.svg || (v.querySelector ? (v.matches && v.matches(`svg[data-prop="${kind}"]`) ? v : v.querySelector(`svg[data-prop="${kind}"]`)) : null));
    const usage = `${name}: the carrier must be a "carrierFront" prop (createProp(host, 'carrierFront') — the shell with the door; its "carrierBack" at the same place), the element holding it, or { at: { x, y }, scale, door, back } (a 3D set: at = set.targetPoint(rig, [x, 0, z]) — the middle of the carrier's floor —, scale = person frame units per prop frame unit, door / back = the "carrierFront" / "carrierBack" props)`;
    let at, k, front, back = null;
    if (carrier && carrier.at && typeof carrier.at.x === 'number' && typeof carrier.at.y === 'number') {
      if (!(typeof carrier.scale === 'number' && carrier.scale > 0)) throw new Error(`[character] ${usage}`);
      at = { x: carrier.at.x, y: carrier.at.y }; k = carrier.scale; front = svgOf(carrier.door, 'carrierFront'); back = svgOf(carrier.back, 'carrierBack');
    } else {
      front = svgOf(carrier, 'carrierFront');
      if (!front) throw new Error(`[character] ${usage}`);
      const r = front.getBoundingClientRect(), inv = this.svg.getScreenCTM().inverse();
      const a = new DOMPoint(r.left, r.top).matrixTransform(inv), b = new DOMPoint(r.right, r.bottom).matrixTransform(inv);
      k = (b.x - a.x) / PROP_FRAME.w; at = { x: a.x + PROP_FRAME.centre * k, y: a.y + PROP_FRAME.floor * k };
    }
    if (!front || front.getAttribute('data-prop') !== 'carrierFront') throw new Error(`[character] ${usage}`);
    const door = front.querySelector('[data-carrier-door50c]');
    if (!back) {
      // Lớp sau cùng chỗ: đạo cụ `carrierBack` gần tâm khung trước nhất, cỡ gần bằng (bối cảnh 3D: hai lớp lệch nhau chút chiều sâu).
      const fr = front.getBoundingClientRect(), cx = fr.left + fr.width / 2, cy = fr.bottom;
      let best = null;
      for (const svg of (front.ownerDocument || document).querySelectorAll('svg[data-prop="carrierBack"]')) {
        const q = svg.getBoundingClientRect(), d = Math.hypot(q.left + q.width / 2 - cx, q.bottom - cy);
        if (q.width > fr.width * 0.8 && q.width < fr.width * 1.25 && d < fr.width * 0.2 && (!best || d < best.d)) best = { svg, d };
      }
      back = best ? best.svg : null;
    }
    const num = (key) => +door.getAttribute('data-' + key);
    const open = { x0: num('x0'), x1: num('x1'), y0: num('y0'), y1: num('y1') }, hinge = num('hinge');
    const g = carrierShape50c({ w: num('w'), height: num('h'), door: door.getAttribute('data-door') });
    const latch = g.latch, p = (x, y) => ({ x: at.x + (x - PROP_FRAME.centre) * k, y: at.y + (y - PROP_FRAME.floor) * k });
    const latchAt = (o) => p(hinge + (latch - hinge) * (1 - OPEN50C * o), open.y0 + 12);
    const props = this.carrierProps50c || (this.carrierProps50c = []);
    let idx = props.findIndex((item) => item.front === front);
    if (idx < 0) { props.push({ front, back, door, hinge, init: front.style.visibility !== 'hidden' && !front.hasAttribute('data-carrier-spot50c') }); idx = props.length - 1; }
    else if (back && !props[idx].back) props[idx].back = back;
    return { at, k, p, g, open, hinge, latch, latchAt, door, front, back, idx, side: latch > hinge ? 1 : -1, color: door.getAttribute('data-color') || null };
  }

  // Ghi mục thứ `n` của nhật ký lồng (dựng lại bước thì ghi đè đúng mục ấy).
  _carrierEvent50c(n, entry) {
    (this.carrierLog50c || (this.carrierLog50c = []))[n] = entry;
    if (entry.pet) (this.carrierPets50c || (this.carrierPets50c = new Set())).add(entry.pet);
  }

  // ĐỌC LẠI NHẬT KÝ tới mục thứ `n` (mặc định: theo kênh `carrier50c`): lồng trên tay (`held`: { pet, fit, k, g }) hay null; đạo cụ nào đang có lồng
  // (`present`), con vật trong lồng trên sàn (`inside`), cửa lồng nào để mở (`open`).
  _carrierNow50c(n = Math.round(this.s.carrier50c || 0)) {
    const props = this.carrierProps50c || [], log = this.carrierLog50c || [];
    const present = new Map(props.map((item) => [item.front, item.init])), inside = new Map(), open = new Map();
    let held = null;
    for (let i = 0; i < n && i < log.length; i++) {
      const ev = log[i];
      if (!ev) continue;
      if (ev.kind === 'load') held = { pet: ev.pet || null, fit: ev.fit || null, k: ev.k, g: ev.g };
      else if (ev.kind === 'pick') { const inn = inside.get(ev.front); held = { pet: inn ? inn.pet : null, fit: inn ? inn.fit : null, k: ev.k, g: ev.g }; inside.delete(ev.front); present.set(ev.front, false); open.set(ev.front, 0); }
      else if (ev.kind === 'drop') { present.set(ev.front, true); open.set(ev.front, 0); if (held && held.pet) inside.set(ev.front, { pet: held.pet, fit: held.fit }); held = null; }
      else if (ev.kind === 'in') { inside.set(ev.front, { pet: ev.pet, fit: ev.fit }); open.set(ev.front, 0); }
      else if (ev.kind === 'out') { inside.delete(ev.front); open.set(ev.front, 1); }
    }
    return { held, present, inside, open };
  }

  // Phần con vật trong khung SVG của nó: tâm thân (bề ngang, 0…1, bỏ phần dời) và đáy chân (0…1) — đặt nó vào lòng lồng trên tay.
  static _carrierFit50c(home) {
    const w = home.r.x1 - home.r.x0, h = home.r.y1 - home.r.y0;
    return { fx: ((home.body.x0 + home.body.x1) / 2 - home.shift - home.r.x0) / w, fy: (home.feet - home.r.y0) / h, hx: home.middle, width: home.width, height: home.height, W: w };
  }

  // Chỗ con vật trong lồng (khung 400 × 470 của lồng `g`, đơn vị khung người / đơn vị khung lồng `k`): TÂM THÂN đặt sao cho ĐẦU nó ở sau cửa sổ phía nó
  // quay mặt (cửa lưới ở đầu `door`, cửa sổ hông ở đầu kia) — mặt nó thấy qua song —, rồi giữ cả thân trong lòng lồng.
  static _petCentre50c(g, fit, k) {
    const W = fit.W / k, headOff = (fit.hx - fit.fx) * W, d = g.door === 'left' ? -1 : 1;
    const win = Math.sign(headOff || d) === d ? (g.open.x0 + g.open.x1) / 2 : (g.side.x0 + g.side.x1) / 2, half = fit.width / k / 2;
    return clamp(win - headOff, g.room.x0 + half + 2, g.room.x1 - half - 2);
  }

  // VẼ (gọi trong `apDung`): đạo cụ lồng nào hiện / ẩn, cửa lưới mở bao nhiêu, lồng trên tay đặt đúng chỗ (quai ở lòng bàn tay, thẳng đứng), con vật
  // trong lồng trên tay nằm trong ngăn của món đồ.
  _drawCarriers50c() {
    const s = this.s, e = this.el, now = this._carrierNow50c(), props = this.carrierProps50c || [];
    const live = clamp(+s.carrierDoor50c || 0, 0, 1), liveAt = Math.round(s.carrierDoorN50c || 0) - 1;
    props.forEach((item, i) => {
      const v = now.present.get(item.front) ? '' : 'hidden';
      for (const svg of [item.front, item.back]) if (svg && svg.style.visibility !== v) svg.style.visibility = v;
      const o = Math.max(now.open.get(item.front) || 0, i === liveAt ? live : 0), key = o.toFixed(4);
      if (item.door.__drawn50c === key) return;
      item.door.__drawn50c = key;
      if (o < 1e-4) item.door.removeAttribute('transform');
      else item.door.setAttribute('transform', `translate(${item.hinge} 0) scale(${(1 - OPEN50C * o).toFixed(4)} 1) translate(${-item.hinge} 0)`);
    });
    // Lồng trên tay: theo hệ GỐC — đảo phép biến đổi của ngăn món đồ, rồi quai lồng ở lòng bàn tay, cỡ `k`.
    const root = this.svg.getScreenCTM && this.svg.getScreenCTM();
    let slotUsed = null;
    for (const side of ['L', 'R']) {
      const box = e['item' + side], node = box && this.holds[side] && box.querySelector('[data-carrier50c]');
      if (!node || !root) continue;
      // Lồng chỉ hiện trên tay khi nhật ký nói nó đang ở trên tay (món đồ dựng giữa chuỗi: các khung trước đó kênh `item` vẫn là 1).
      const all = node.parentNode, on = !!now.held;
      if (all && all.hasAttribute('data-carrier-item50c') && (all.style.display === 'none') === on) all.style.display = on ? '' : 'none';
      if (!on) continue;
      const bm = box.getScreenCTM();
      if (!bm) continue;
      const m = DOMMatrix.fromMatrix(root.inverse().multiply(bm)), palm = new DOMPoint(0, 10).matrixTransform(m);
      const held = now.held, k = held ? held.k : (this.carrierK50c || 1), gy = (held && held.g ? held.g : carrierShape50c({ w: +node.getAttribute('data-w'), height: +node.getAttribute('data-h') })).grip;
      const place = m.inverse().multiply(new DOMMatrix().translate(palm.x, palm.y).scale(k).translate(-gy.x, -gy.y));
      node.setAttribute('transform', `matrix(${[place.a, place.b, place.c, place.d, place.e, place.f].map((v) => v.toFixed(4)).join(' ')})`);
      if (held && held.pet && s['item' + side] > 0.5) slotUsed = { slot: node.querySelector('[data-carrier-slot50c]'), held, k, g: held.g };
    }
    // Con vật trong lồng trên tay: SVG nó vào ngăn, cỡ thật so với người (đo host của nó trên màn hình), thân giữa lòng lồng, chân trên đáy lồng.
    for (const pet of this.carrierPets50c || []) {
      const inSlot = pet.svg.parentNode && pet.svg.parentNode.hasAttribute && pet.svg.parentNode.hasAttribute('data-carrier-slot50c') && this.svg.contains(pet.svg);
      if (slotUsed && slotUsed.held.pet === pet) {
        const host = pet.host.getBoundingClientRect(), unit = Math.hypot(root.a, root.b) || 1, fit = slotUsed.held.fit;
        const w = host.width / unit / slotUsed.k, h = host.height / unit / slotUsed.k, room = slotUsed.g.room;
        if (pet.svg.parentNode !== slotUsed.slot) slotUsed.slot.appendChild(pet.svg);
        pet.heldBlend = 0;
        const x = RigSVG._petCentre50c(slotUsed.g, fit, slotUsed.k) - fit.fx * w, y = room.y1 - fit.fy * h;
        for (const [name, value] of [['x', x], ['y', y], ['width', w], ['height', h]]) pet.svg.setAttribute(name, value.toFixed(2));
        pet.svg.style.overflow = 'visible';
        const key = `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)}`;
        if (pet.__slot50c !== key) { pet.__slot50c = key; pet.apDung(); }
      } else if (inSlot) {
        pet.__slot50c = null;
        pet.host.appendChild(pet.svg);
        for (const [name, value] of pet.homeAttrs || []) value === null ? pet.svg.removeAttribute(name) : pet.svg.setAttribute(name, value);
        pet.apDung();
      }
    }
  }

  // VẼ (gọi trong `apDung`): bát, dụng cụ đổ, lồng — chỉ khi người này đã từng dùng chúng.
  _drawFeed50c() {
    // Con vật đang bế vẽ trước hai cánh tay (`omFront50c`, lúc hạ nó vào lồng): ngăn bế dời ra sau tay gần, trong cùng nhóm cha (cùng hệ toạ độ);
    // về chỗ cũ (ngay trước tay gần) khi kênh về 0 — nhân vật không dùng thì markup không đổi.
    const om = this.el.om, front = (this.s.omFront50c || 0) >= 0.5;
    if (om && front && !this._omHome50c) { this._omHome50c = { parent: om.parentNode, next: om.nextSibling }; om.parentNode.appendChild(om); }
    else if (om && !front && this._omHome50c) { const home = this._omHome50c; this._omHome50c = null; home.parent.insertBefore(om, home.next && home.next.parentNode === home.parent ? home.next : null); }
    if (this.bowls50c) this._drawBowls50c();
    this._drawFeedTools50c();
    if (this.carrierProps50c || this.carrierLog50c) this._drawCarriers50c();
  }

  // Tay `k` có lồng (món đồ `carrier`) chưa; chưa có / khác cỡ thì cho một cái (đang cất), cùng cỡ, cùng phía cửa với đạo cụ `g`. Tay ấy nghỉ ở dáng
  // XÁCH: cánh tay thõng thẳng bên hông (không gập ra trước như cầm cốc).
  _giveCarrier50c(k, g, color = null) {
    const s = this.s, node = this.holds[k] && this.el['item' + k] && this.el['item' + k].querySelector('[data-carrier50c]');
    if (!(node && +node.getAttribute('data-w') === g.w && +node.getAttribute('data-h') === g.h && node.getAttribute('data-door') === g.door)) {
      const keepArms = Object.fromEntries(['batL', 'cangL', 'tayL', 'batR', 'cangR', 'tayR', 'itemL', 'itemR'].map((key) => [key, s[key]]));
      const shown = s['item' + k] > 0.5 && !!node;
      this.setItem(k, (p, c) => carrier50c(c, { width: g.w, height: g.h, door: g.door, ...(color ? { color } : {}) }), { shown: false });
      Object.assign(this.s, keepArms, { ['item' + k]: shown ? 1 : 0 });
    }
    this.NGHI = Object.freeze({ ...this.NGHI, ['bat' + k]: RigSVG.CARRY_HANG50C[0], ['cang' + k]: RigSVG.CARRY_HANG50C[1] });
    this.apDung();
  }
  static CARRY_HANG50C = [9, -4];        // dáng xách lồng: bắp tay hơi dang, cẳng tay gần thẳng — lồng thõng cạnh chân

  /**
   * CON VẬT Ở SẴN TRONG LỒNG XÁCH TAY (đặt cảnh, không phải động tác): người cầm lồng (`items: { L: 'carrier' }`, chưa có thì rig cho ở tay `hand`)
   * và con vật `pet` ở trong — hình nó nằm trong lồng, đi theo tay khi người bước. `putDownCarrier` / `takeOutOfCarrier` đặt lồng xuống.
   */
  loadCarrier(pet, { hand = 'auto', width = 150, height = 112, door = 'right', carrier = null } = {}) {
    if (!pet || !pet.svg || typeof pet.apDung !== 'function' || !pet.el || !pet.el.dau || pet instanceof RigSVG) throw new Error('[character] loadCarrier(pet): pet must be a pet rig (createPet(...).rig)');
    // `carrier` (đạo cụ `carrierFront` / `{ at, scale, door, back }`): con vật ở sẵn trong LỒNG TRÊN SÀN ấy (không phải lồng trên tay) — hình nó dời vào
    // giữa lồng; người này là người sẽ mở lồng (`takeOutOfCarrier`) hay xách nó (`pickUpCarrier`).
    if (carrier) {
      const geo = this._carrier50c(carrier, 'loadCarrier'), s = this.s, now = this._carrierNow50c();
      if (now.inside.get(geo.front)) throw new Error('[character] loadCarrier: there is already a pet in that carrier');
      const home = this._petAt49a(pet), fit = RigSVG._carrierFit50c(home), n = Math.round(s.cageMove49a || 0), e = Math.round(s.carrier50c || 0);
      const centre = geo.p(RigSVG._petCentre50c(geo.g, fit, geo.k), 0).x;
      this._cageMove49a(pet, n, (centre - (home.centre + home.shift + home.bodyOff)) / home.unit);
      this._carrierEvent50c(e, { kind: 'in', front: geo.front, pet, fit });
      Object.assign(s, { cageMove49a: n + 1, carrier50c: e + 1 });
      this.apDung(); pet.apDung();
      return this;
    }
    if (hand !== 'auto' && hand !== 'L' && hand !== 'R') throw new Error(`[character] loadCarrier: hand must be 'auto', 'L' or 'R', got ${JSON.stringify(hand)}`);
    if (door !== 'left' && door !== 'right') throw new Error(`[character] loadCarrier: door must be 'left' or 'right', got ${JSON.stringify(door)}`);
    const s = this.s, has = (k) => !!(this.holds[k] && this.el['item' + k] && this.el['item' + k].querySelector('[data-carrier50c]'));
    const k = hand !== 'auto' ? hand : has('L') ? 'L' : has('R') ? 'R' : !this.holds.L ? 'L' : !this.holds.R ? 'R' : null;
    if (!k) throw new Error('[character] loadCarrier: both hands hold something — give the character a carrier: createCharacter(host, { id, items: { L: "carrier" } })');
    const node = has(k) ? this.el['item' + k].querySelector('[data-carrier50c]') : null;
    const g = carrierShape50c(node ? { w: +node.getAttribute('data-w'), height: +node.getAttribute('data-h'), door: node.getAttribute('data-door') } : { w: width, height, door });
    this._giveCarrier50c(k, g);
    const home = this._petAt49a(pet), fit = RigSVG._carrierFit50c(home);
    if (home.width > (g.room.x1 - g.room.x0) * FIT50C || home.height > (g.room.y1 - g.room.y0) * FIT50C) throw new Error(`[character] loadCarrier: the pet is too big for the carrier (${home.width.toFixed(0)} × ${home.height.toFixed(0)} frame units, inside ${(g.room.x1 - g.room.x0).toFixed(0)} × ${(g.room.y1 - g.room.y0).toFixed(0)}) — give a bigger width / height`);
    const n = Math.round(s.carrier50c || 0);
    this._carrierEvent50c(n, { kind: 'load', pet, fit, k: 1, g });
    Object.assign(s, { carrier50c: n + 1, ['item' + k]: 1, ['bat' + k]: RigSVG.CARRY_HANG50C[0], ['cang' + k]: RigSVG.CARRY_HANG50C[1], ['tay' + k]: 'nam' });
    this.NGHI = Object.freeze({ ...this.NGHI, ['item' + k]: 1 });
    this.apDung();
    return this;
  }

  // Tay đang xách lồng (món đồ `carrier` đang hiện), hay null.
  _carrierHand50c() { return ['L', 'R'].find((k) => this.holds[k] && this.s['item' + k] > 0.5 && this.el['item' + k] && this.el['item' + k].querySelector('[data-carrier50c]')) || null; }

  // MỞ / ĐÓNG cửa lưới bằng tay `k` ở dáng quỳ (như cửa chuồng đợt 49 A): tay tới chốt, cửa xoay theo `carrierDoor50c`, bàn tay theo chốt.
  _swingDoor50c(t, at, geo, k, from, to, d = 0.6) {
    const s = this.s, start = this._kneelReach49a(geo.latchAt(from), k), end = this._kneelReach49a(geo.latchAt(to), k);
    t.set(s, { carrierDoorN50c: geo.idx + 1 }, at);
    t.to(s, { ['bat' + k]: start.upper, ['cang' + k]: start.fore, ['aim' + k]: 1, ...start.look, duration: 0.45, ease: 'power2.out' }, at);
    t.set(s, { ['tay' + k]: 'nam' }, at + 0.4);
    t.to(s, { carrierDoor50c: to, ['bat' + k]: end.upper, ['cang' + k]: end.fore, ...end.look, duration: d, ease: 'sine.inOut' }, at + 0.5);
    t.set(s, { ['tay' + k]: 'mo' }, at + 0.5 + d);
    return at + 0.5 + d;
  }

  // Kiểm tra chung: con vật là rig thú, người đứng phía cửa lồng.
  static _petRig50c(pet, usage) {
    if (!pet || !pet.svg || typeof pet.apDung !== 'function' || !pet.el || !pet.el.dau || pet instanceof RigSVG) throw new Error(`[character] ${usage}: pet must be a pet rig (createPet(...).rig)`);
  }
  _doorSide50c(geo, name) {
    const me = HONG.x + (this.s.x || 0);
    if (Math.sign(me - geo.at.x) !== geo.side) throw new Error(`[character] ${name}: stand at the door end of the carrier (its ${geo.side > 0 ? 'right' : 'left'}) — the barred door is on that end`);
    return me;
  }

  // CẦM LẤY QUAI lồng đang ở đạo cụ `geo` bằng tay `k` từ dáng QUỲ cạnh nó (sau khi đóng cửa — `putInCarrier(…, { carry: true })`), rồi đứng lên xách.
  _liftFromKneel50c(t, at, geo, k, n, keep) {
    const s = this.s, grip = this._kneelReach49a(geo.p(geo.g.grip.x, geo.g.grip.y + 2), k);
    t.to(s, { ['bat' + k]: grip.upper, ['cang' + k]: grip.fore, ['aim' + k]: 1, ...grip.look, duration: 0.45, ease: 'power2.inOut' }, at);
    t.set(s, { ['tay' + k]: 'nam' }, at + 0.42);
    t.to(s, { carrier50c: n + 1, ['item' + k]: 1, duration: 0.02 }, at + 0.46);
    this._lookTo(t, null, at + 0.6, { d: 0.4 });
    this._khep(t, 0.6, at + 0.55, { ...keep, kneel: 0, seat: this.NGHI.seat, carrier50c: n + 1, ['item' + k]: 1, ['aim' + k]: 0 });
    return at + 1.15;
  }

  /**
   * CHO CON VẬT VÀO LỒNG VẬN CHUYỂN (trên sàn): đang bế nó thì giữ, chưa bế thì bế lên trước (như `carry`); quỳ ở ĐẦU CÓ CỬA của lồng, một tay vẫn
   * ôm nó, tay kia mở chốt kéo cửa lưới ra; hai tay hạ nó vào lồng (nó đứng giữa lòng lồng và vỏ: vỏ che nó, thấy nó qua cửa lưới và cửa sổ hông),
   * đóng cửa, gài chốt. `carry: true`: rồi nắm QUAI xách lồng lên, đứng dậy — con vật trong lồng đi theo tay. `carrier`: đạo cụ `carrierFront` (hay
   * `{ at, scale, door, back }` — xem `_carrier50c`). Lồng trên sàn, cùng sàn với chỗ con vật đứng.
   */
  putInCarrier(pet, carrier = null, { carry = false, hold = 0.4 } = {}) {
    RigSVG._petRig50c(pet, 'putInCarrier(pet, carrier)');
    if (typeof carry !== 'boolean') throw new Error(`[character] putInCarrier: carry must be true (pick the carrier up after) or false, got ${JSON.stringify(carry)}`);
    if (!(typeof hold === 'number' && hold >= 0 && hold <= 6)) throw new Error(`[character] putInCarrier: hold must be 0…6 seconds, got ${JSON.stringify(hold)}`);
    const geo = this._carrier50c(carrier, 'putInCarrier'), s = this.s, N = this.NGHI;
    const me = this._doorSide50c(geo, 'putInCarrier'), now = this._carrierNow50c();
    if (now.held) throw new Error('[character] putInCarrier: the character is holding a carrier — putDownCarrier() first');
    if (!now.present.get(geo.front)) throw new Error('[character] putInCarrier: that carrier is not there (it was picked up) — use the carrier where it stands');
    if (now.inside.get(geo.front)) throw new Error('[character] putInCarrier: there is already a pet in that carrier — takeOutOfCarrier() first');
    const carrying = s.om >= 0.5 && this._carriedNow() && this._carriedNow().pet === pet;
    if (s.om >= 0.5 && !carrying) throw new Error('[character] putInCarrier: already carrying another pet — putDown() first');
    const home = this._petAt49a(pet), room = { w: (geo.g.room.x1 - geo.g.room.x0) * geo.k, h: (geo.g.room.y1 - geo.g.room.y0) * geo.k };
    if (home.width > room.w * FIT50C || home.height > room.h * FIT50C) throw new Error(`[character] putInCarrier: the pet is too big for this carrier (${home.width.toFixed(0)} × ${home.height.toFixed(0)} frame units, inside ${room.w.toFixed(0)} × ${room.h.toFixed(0)}) — make the carrier wider / taller`);
    if (Math.abs(home.feet - geo.at.y) > LEVEL50C) throw new Error('[character] putInCarrier: the carrier must stand on the floor where the pet stands — the pet is set down inside it on that floor');
    const k = me > geo.at.x ? 'L' : 'R', other = k === 'L' ? 'R' : 'L';      // tay phía lồng mở / đóng cửa (và xách lồng)
    if (carry) {
      if (this.holds[k] && s['item' + k] > 0.5 && !this.el['item' + k].querySelector('[data-carrier50c]')) throw new Error(`[character] putInCarrier: hand ${k} holds an item — it picks the carrier up after (carry: true); put the item away first`);
      this._giveCarrier50c(k, geo.g, geo.color);
    }
    const t = carrying ? this.tl() : this.carry(pet), B = carrying ? 0 : t.duration(), n = Math.round(s.cageMove49a || 0), e = Math.round(s.carrier50c || 0);
    // Dời: tâm thân con vật vào giữa lòng lồng (đơn vị khung của nó) — bật lúc nó đang trên tay (hình không theo phần dời).
    const fit = RigSVG._carrierFit50c(home), centre = geo.p(RigSVG._petCentre50c(geo.g, fit, geo.k), 0).x;
    this._cageMove49a(pet, n, (centre - (home.centre + home.shift + home.bodyOff)) / home.unit);
    this._carrierEvent50c(e, { kind: 'in', front: geo.front, pet, fit });
    if (carry) this._carrierEvent50c(e + 1, { kind: 'pick', front: geo.front, k: geo.k, g: geo.g });
    const body = { x: centre + home.bodyOff * 0, y: geo.at.y - home.height * 0.45 };
    const inside = this._kneelReach49a(body), down = { seat: 1, kneel: 1, than: N.than - inside.lean * 0.6, dau: N.dau + inside.lean * 0.5, dauY: 6, cuoi: 0.8 };
    // 1. Quỳ xuống ở đầu có cửa, con vật vẫn ôm trước ngực.
    t.to(s, { ...down, duration: 0.6, ease: 'power2.inOut' }, B);
    // 2. Tay phía lồng rời con vật, mở chốt kéo cửa lưới ra; tay về ôm.
    t.to(s, { ['free49a' + k]: 1, duration: 0.3, ease: 'power2.out' }, B + 0.45);
    const opened = this._swingDoor50c(t, B + 0.5, geo, k, 0, 1);
    t.to(s, { ['free49a' + k]: 0, ['aim' + k]: 0, duration: 0.35, ease: 'power2.inOut' }, opened + 0.05);
    // 3. Hạ con vật vào lồng (chỗ nhà của nó đã là giữa lồng).
    const L0 = opened + 0.45;
    t.to(s, { cageMove49a: n + 1, carrier50c: e + 1, duration: 0.02 }, L0 - 0.05);
    // Hai tay đỡ dưới BỤNG nó (không giữa thân như chuồng): tay gần — vẽ trên con vật — không vắt ngang mặt / lưng nó lúc hạ xuống (đợt 50 C, duyệt).
    t.to(s, { ...this._twoHands49a({ x: body.x, y: body.y + home.height * 0.3 }, home.width, k), duration: 0.02 }, L0);
    t.set(s, { tayL: 'xoe', tayR: 'xoe' }, L0 + 0.02);
    t.to(s, { ...inside.look, than: N.than - inside.lean, dau: N.dau + inside.lean * 0.8, dauY: 7, duration: 0.6, ease: 'power2.inOut' }, L0);
    t.to(s, { omRise: 0, duration: 0.7, ease: 'sine.inOut' }, L0);
    // Duyệt đợt 50 C: lúc hai tay hạ nó xuống, con vật vẽ TRƯỚC hai cánh tay (`omFront50c`) — tay áo cùng màu áo vắt qua nó thì trên khung nhỏ nó
    // trông như mờ đi (hai bàn tay đỡ dưới bụng, sau nó).
    t.to(s, { omFront50c: 1, duration: 0.02 }, L0);
    t.to(s, { omFront50c: 0, duration: 0.02 }, L0 + 0.72);
    t.set(s, { om: 0 }, L0 + 0.72);
    // 4. Rút tay ra, đóng cửa, gài chốt.
    const R0 = L0 + 0.75;
    t.to(s, { ['bat' + other]: N['bat' + other], ['cang' + other]: N['cang' + other], ['aim' + other]: 0, ...down, duration: 0.45, ease: 'power2.inOut' }, R0);
    t.set(s, { tayL: 'mo', tayR: 'mo' }, R0 + 0.2);
    const closed = this._swingDoor50c(t, R0 + 0.05, geo, k, 1, 0, 0.55);
    t.to(s, { dauY: 11, cuoi: 1, duration: 0.18, ease: 'sine.out', yoyo: true, repeat: 1 }, closed + 0.1);
    const keep = { om: 0, omRise: 0, cageMove49a: n + 1 };
    if (carry) { this._liftFromKneel50c(t, closed + 0.45 + hold, geo, k, e + 1, keep); return t; }
    this._lookTo(t, null, closed + 0.15, { d: 0.5 });
    this._khep(t, 0.55, closed + 0.5 + hold, { ...keep, kneel: 0, seat: N.seat, carrier50c: e + 1 });
    return t;
  }

  /**
   * XÁCH LỒNG lên bằng quai (có con vật trong hay không): quay nghiêng về lồng, cúi (quai ngang hông) hay ngồi xổm, nắm quai, đứng lên — lồng
   * thõng bên hông, đi theo tay. `hand`: tay xách ('auto' = tay gần lồng).
   */
  pickUpCarrier(carrier = null, { hand = 'auto' } = {}) {
    if (hand !== 'auto' && hand !== 'L' && hand !== 'R') throw new Error(`[character] pickUpCarrier: hand must be 'auto', 'L' or 'R', got ${JSON.stringify(hand)}`);
    const geo = this._carrier50c(carrier, 'pickUpCarrier'), s = this.s, N = this.NGHI, now = this._carrierNow50c();
    if (s.lie42e > 0.5 || s.floor42e > 0.5 || s.seat > 0.5 || s.ride > 0.5) throw new Error('[character] pickUpCarrier: stand up first (standUp / getOff)');
    if (s.om >= 0.5) throw new Error('[character] pickUpCarrier: the character is carrying a pet — putDown() first');
    if (now.held) throw new Error('[character] pickUpCarrier: already holding a carrier — putDownCarrier() first');
    if (!now.present.get(geo.front)) throw new Error('[character] pickUpCarrier: that carrier is not there (it was picked up)');
    const me = HONG.x + (s.x || 0), dir = geo.at.x >= me ? 1 : -1, near = dir > 0 ? 'L' : 'R', far = near === 'L' ? 'R' : 'L';
    const busy = (k) => this.holds[k] && s['item' + k] > 0.5 && !this.el['item' + k].querySelector('[data-carrier50c]');      // lồng (món đồ dựng ở lần dựng trước) không tính
    const k = hand !== 'auto' ? hand : !busy(near) ? near : far;
    if (busy(k)) throw new Error(`[character] pickUpCarrier: hand ${k} holds an item — put it away first (hideItem)`);
    this._giveCarrier50c(k, geo.g, geo.color);
    const e = Math.round(s.carrier50c || 0), was = s.huong;
    this._carrierEvent50c(e, { kind: 'pick', front: geo.front, k: geo.k, g: geo.g });
    const grip = geo.p(geo.g.grip.x, geo.g.grip.y + 2), spot = { x: grip.x - (s.x || 0), y: grip.y - DOI_Y };
    const reach = this._floorReach50c(k, spot, dir, true), t = this.tl(), o = k === 'L' ? 'R' : 'L';
    if (reach.shift) t.to(s, { x: s.x + dir * reach.shift, duration: 0.45, ease: 'sine.inOut' }, 0);
    t.to(s, { huong: dir, ['carry' + k]: 0, cuoi: 0.6, nhinX: dir * 2, duration: 0.35, ease: 'power2.inOut' }, 0);
    t.to(s, { ['aim' + k]: 1, duration: 0.3, ease: 'sine.inOut' }, 0.3);
    t.set(s, { ['tay' + k]: 'xoe' }, 0.32);
    t.to(s, { squat42e: reach.squat, than: N.than + dir * reach.lean, dau: N.dau - dir * reach.lean * 0.45, dauY: 6, nhinY: 2.4, ['bat' + k]: reach.pose.bat, ['cang' + k]: reach.pose.cang, duration: 0.6, ease: 'power2.inOut' }, 0.35);
    t.set(s, { ['tay' + k]: 'nam' }, 0.97);
    t.to(s, { carrier50c: e + 1, ['item' + k]: 1, duration: 0.02 }, 1.0);
    // ĐỨNG LÊN xách lồng: lưng thẳng, tay thõng (dáng xách), quay về hướng cũ.
    t.to(s, { squat42e: 0, than: N.than, dau: N.dau, dauY: 0, nhinY: 0, duration: 0.6, ease: 'power2.inOut' }, 1.3);
    t.to(s, { ['aim' + k]: 0, ['bat' + k]: RigSVG.CARRY_HANG50C[0], ['cang' + k]: RigSVG.CARRY_HANG50C[1], duration: 0.55, ease: 'power2.inOut' }, 1.35);
    this._khep(t, 0.45, 1.9, { ['item' + k]: 1, carrier50c: e + 1, huong: was });
    return t;
  }

  /**
   * ĐẶT LỒNG đang xách XUỐNG ở đạo cụ `carrier` (chỗ đặt: đạo cụ `carrierFront` / `{ at, scale, door, back }` đang trống — trên sàn, hay trên mặt quầy
   * khi lồng rỗng): cúi / ngồi xổm, đáy lồng chạm chỗ ấy, buông quai, đứng lên. Con vật trong lồng ở lại trong lồng (hình nó về giữa lồng mới).
   */
  putDownCarrier(carrier = null) {
    const geo = this._carrier50c(carrier, 'putDownCarrier'), s = this.s, N = this.NGHI, now = this._carrierNow50c(), k = this._carrierHand50c();
    if (!now.held || !k) throw new Error('[character] putDownCarrier: the character is not holding a carrier — pickUpCarrier() / loadCarrier() first');
    if (now.present.get(geo.front)) throw new Error('[character] putDownCarrier: there is already a carrier at that spot — set it down at an empty spot (a "carrierFront" prop hidden until then: add data-carrier-spot50c to its svg, or make it visibility: hidden)');
    const t = this.tl(), e = Math.round(s.carrier50c || 0), done = this._putDownCarrierAt50c(t, 0, geo, k, now);
    this._khep(t, 0.45, done.end, { ['item' + k]: 0, carrier50c: e + 1, cageMove49a: done.moves, huong: s.huong });
    return t;
  }

  // Phần ĐẶT LỒNG XUỐNG (dùng chung cho `putDownCarrier` và `takeOutOfCarrier` khi đang xách): trả về giây đã đứng lên xong.
  _putDownCarrierAt50c(t, at, geo, k, now) {
    const s = this.s, N = this.NGHI, me = HONG.x + (s.x || 0), dir = geo.at.x >= me ? 1 : -1, e = Math.round(s.carrier50c || 0);
    const pet = now.held.pet;
    let move = s.cageMove49a;
    if (pet) {
      const home = this._petAt49a(pet);
      if (Math.abs(home.feet - geo.at.y) > LEVEL50C) throw new Error('[character] putDownCarrier: a carrier with a pet inside goes on the floor where the pet stands (it stays inside — the pet is drawn on its own floor)');
      const n = Math.round(s.cageMove49a || 0), centre = geo.p(RigSVG._petCentre50c(geo.g, now.held.fit || RigSVG._carrierFit50c(home), geo.k), 0).x;
      this._cageMove49a(pet, n, (centre - (home.centre + home.shift + home.bodyOff)) / home.unit);
      t.to(s, { cageMove49a: n + 1, duration: 0.02 }, at + 0.5);
      move = n + 1;
    }
    this._carrierEvent50c(e, { kind: 'drop', front: geo.front });
    const grip = geo.p(geo.g.grip.x, geo.g.grip.y + 2), spot = { x: grip.x - (s.x || 0), y: grip.y - DOI_Y };
    const reach = this._floorReach50c(k, spot, dir, true);
    if (reach.shift) t.to(s, { x: s.x + dir * reach.shift, duration: 0.45, ease: 'sine.inOut' }, at);
    t.to(s, { huong: dir, ['carry' + k]: 0, cuoi: 0.6, nhinX: dir * 2, duration: 0.35, ease: 'power2.inOut' }, at);
    t.to(s, { ['aim' + k]: 1, duration: 0.3, ease: 'sine.inOut' }, at + 0.3);
    t.to(s, { squat42e: reach.squat, than: N.than + dir * reach.lean, dau: N.dau - dir * reach.lean * 0.45, dauY: 6, nhinY: 2.4, ['bat' + k]: reach.pose.bat, ['cang' + k]: reach.pose.cang, duration: 0.65, ease: 'power2.inOut' }, at + 0.35);
    // BUÔNG QUAI: lồng nằm lại ở chỗ đặt (đạo cụ hiện, món đồ trên tay ẩn), con vật về giữa lồng mới.
    t.set(s, { ['tay' + k]: 'xoe' }, at + 1.0);
    t.to(s, { carrier50c: e + 1, ['item' + k]: 0, duration: 0.02 }, at + 1.02);
    t.to(s, { squat42e: 0, than: N.than, dau: N.dau, dauY: 0, nhinY: 0, duration: 0.6, ease: 'power2.inOut' }, at + 1.25);
    t.to(s, { ['aim' + k]: 0, ['bat' + k]: N['bat' + k], ['cang' + k]: N['cang' + k], duration: 0.5, ease: 'power2.inOut' }, at + 1.3);
    return { end: at + RigSVG.CARRIER_SET50C, moves: move };
  }

  /**
   * CHO CON VẬT RA KHỎI LỒNG: đang xách lồng (con vật trong đó) thì ĐẶT nó xuống ở `carrier` trước (như `putDownCarrier`); quỳ ở đầu có cửa, mở chốt,
   * kéo cửa lưới ra, rồi đứng lên LÙI lại nhường lối — con vật TỰ BƯỚC RA (bước `walk` của nó, cùng lúc: bắt đầu sau `RigSVG.CARRIER_OPEN50C` giây,
   * cộng `RigSVG.CARRIER_SET50C` khi phải đặt lồng xuống trước; tools/scene.py tự thêm). Cửa để mở. Người nhìn nó, cười.
   */
  takeOutOfCarrier(pet, carrier = null) {
    RigSVG._petRig50c(pet, 'takeOutOfCarrier(pet, carrier)');
    const geo = this._carrier50c(carrier, 'takeOutOfCarrier'), s = this.s, N = this.NGHI, now = this._carrierNow50c();
    if (s.om >= 0.5) throw new Error('[character] takeOutOfCarrier: the character is carrying a pet — putDown() first');
    const k0 = this._carrierHand50c(), holding = !!(now.held && k0);
    if (holding && now.held.pet !== pet) throw new Error('[character] takeOutOfCarrier: that pet is not in the carrier this character holds');
    if (!holding) {
      const inn = now.inside.get(geo.front);
      if (!inn || inn.pet !== pet) throw new Error('[character] takeOutOfCarrier: that pet is not in this carrier — putInCarrier() first, or loadCarrier() / "inCarrier" for a pet that starts inside');
    }
    const t = this.tl();
    let at = 0, moves = s.cageMove49a;
    if (holding) ({ end: at, moves } = this._putDownCarrierAt50c(t, 0, geo, k0, now));
    const me = this._doorSide50c(geo, 'takeOutOfCarrier'), k = me > geo.at.x ? 'L' : 'R';
    const e = Math.round(s.carrier50c || 0) + (holding ? 1 : 0);
    this._carrierEvent50c(e, { kind: 'out', front: geo.front, pet });
    const inside = this._kneelReach49a({ x: geo.at.x, y: geo.at.y - 40 * geo.k }), down = { seat: 1, kneel: 1, than: N.than - inside.lean * 0.6, dau: N.dau + inside.lean * 0.5, dauY: 6, cuoi: 0.8 };
    // 1. Quỳ xuống ở đầu có cửa, mở chốt, kéo cửa ra (cửa để mở).
    t.to(s, { ...down, squat42e: 0, duration: 0.6, ease: 'power2.inOut' }, at);
    const opened = this._swingDoor50c(t, at + 0.4, geo, k, 0, 1, 0.55);
    t.to(s, { carrier50c: e + 1, duration: 0.02 }, opened);
    // 2. Buông chốt, ĐỨNG LÊN, LÙI lại nhường lối: con vật bước ra; nhìn nó, cười.
    const back = (geo.g.w * 0.62 + 40) * geo.k, dir = geo.side;
    t.to(s, { ['aim' + k]: 0, ['bat' + k]: N['bat' + k], ['cang' + k]: N['cang' + k], duration: 0.4, ease: 'power2.inOut' }, opened + 0.05);
    t.to(s, { seat: N.seat, kneel: 0, than: N.than, dau: N.dau, dauY: 0, duration: 0.55, ease: 'power2.inOut' }, opened + 0.15);
    t.to(s, { x: s.x + dir * back, duration: 0.7, ease: 'sine.inOut' }, opened + 0.45);
    t.to(s, { dauY: 3, duration: 0.15, ease: 'sine.inOut', yoyo: true, repeat: 3 }, opened + 0.45);
    this._lookTo(t, { x: geo.at.x + dir * geo.g.w * 0.6 * geo.k - (s.x || 0) - dir * back, y: geo.at.y - 50 }, opened + 1.0, { d: 0.45, huong: -dir * 0.55 });
    t.to(s, { huong: -dir * 0.55, cuoi: 1, mieng: 0.25, duration: 0.4, ease: 'sine.inOut' }, opened + 1.05);
    this._khep(t, 0.45, opened + 1.6, { carrier50c: e + 1, huong: -dir * 0.55, x: s.x + dir * back, cageMove49a: moves, ...(holding ? { ['item' + k0]: 0 } : {}) });
    return t;
  }

  /** Số đo lồng (đợt 50 C — tools/acting_check.py qua `set.careProbe()`): lồng trên tay (tay nào), con vật trong lồng trên tay, cửa đang mở bao nhiêu. */
  carrier50cProbe() {
    const s = this.s, now = this._carrierNow50c(), side = this._carrierHand50c();
    const node = side ? this.el['item' + side].querySelector('[data-carrier50c]') : null;
    return { held: !!now.held, hand: side, pet: now.held && now.held.pet ? now.held.pet : null, node, door: +clamp(+s.carrierDoor50c || 0, 0, 1).toFixed(3),
             events: Math.round(s.carrier50c || 0), open: [...now.open.entries()].filter(([, v]) => v > 0.5).map(([front]) => front) };
  }
});
