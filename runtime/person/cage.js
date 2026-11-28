// runtime/person/cage.js — boarding (pet hotel, clinic ward): put a pet into a cage (`putInCage`), take it out (`takeOutOfCage`).
// Methods of `RigSVG`, installed by runtime/rig-svg.js: `this` is the rig, `RigSVG` its class.
//
// ĐỢT 49 A — CHUỒNG LƯU TRÚ. Chuồng là hai đạo cụ cùng cỡ, cùng chỗ (runtime/props.js): `cage` (lòng chuồng, vẽ SAU con vật) và `cageFront`
// (khung trước + cửa song `data-cage-door49a`, vẽ TRƯỚC nó). Con vật vào chuồng là HÌNH NÓ DỜI vào giữa hai lớp ấy: phần dời là kênh của NGƯỜI
// (`cageMove49a` — số lần người này đã đưa con vật vào / ra, như `picked42e`), con vật đọc lại trong `dropX()` (rig-thu.js) — gọi thẳng hay qua
// `sequence()` đều đúng nhịp, tua tới đâu cũng đúng. Cửa: kênh `cageDoor49a` (0 đóng … 1 mở) của người, rig vẽ cửa xoay quanh bản lề mỗi lần vẽ
// (`_drawCages49a`). Đang bế mà mở cửa: một tay rời con vật (`free49aL/R` — tay ấy thôi dáng ôm), tay kia vẫn ôm.

import { HONG, clamp, mix } from './shared.js';
import { PROP_FRAME } from '../props.js';

const OPEN49A = 0.62;                    // cửa mở hết còn 38 % bề ngang (xoay về phía người xem quanh bản lề) — chốt vẫn trong tầm tay người quỳ cạnh chuồng
const FIT49A = 1.04;                     // con vật rộng / cao hơn ô cửa (× chừng này) thì không vừa chuồng — báo lỗi
const LEVEL49A = 24;                     // sàn chuồng lệch sàn chỗ con vật đứng quá chừng này (đơn vị khung người) — báo lỗi (chuồng phải đặt trên sàn)

export default (RigSVG) => mix(RigSVG, class {
  // CHUỒNG trong hệ gốc của SVG này (khung 400 × 470): `cage` là đạo cụ `cageFront` (createProp(…, 'cageFront') hay phần tử chứa nó — đo trên
  // màn hình lúc dựng), hay `{ at, scale, door }` (bối cảnh 3D): `at` = điểm giữa sàn chuồng (x 200, sàn 458 của khung đạo cụ) — `set.targetPoint(rig,
  // [x, 0, z])` —, `scale` = đơn vị khung người / đơn vị khung đạo cụ, `door` = đạo cụ `cageFront` (cửa của nó xoay). Trả về hàm đổi điểm của đạo cụ
  // sang khung người (`p`), cỡ (`k`), ô cửa, bản lề, chốt và phần tử cửa.
  _cage49a(cage, name) {
    const svgOf = (v) => v && (v.svg || (v.querySelector ? (v.matches && v.matches('svg[data-prop]') ? v : v.querySelector('svg[data-prop]')) : null));
    const usage = `${name}(pet, cage): cage must be a "cageFront" prop (createProp(host, 'cageFront') — the front of the cage, with its door), the element holding it, or { at: { x, y }, scale, door } (a 3D set: at = set.targetPoint(rig, [x, 0, z]) — the middle of the cage floor —, scale = person frame units per prop frame unit, door = the "cageFront" prop)`;
    let at, k, front;
    if (cage && cage.at && typeof cage.at.x === 'number' && typeof cage.at.y === 'number') {
      if (!(typeof cage.scale === 'number' && cage.scale > 0)) throw new Error(`[character] ${usage}`);
      at = { x: cage.at.x, y: cage.at.y }; k = cage.scale; front = svgOf(cage.door);
    } else {
      front = svgOf(cage);
      if (!front) throw new Error(`[character] ${usage}`);
      if (front.getAttribute('data-prop') === 'cage') throw new Error(`[character] ${name}: pass the "cageFront" prop (the door is on it), not the "cage" (the inside)`);
      const r = front.getBoundingClientRect(), inv = this.svg.getScreenCTM().inverse();
      const a = new DOMPoint(r.left, r.top).matrixTransform(inv), b = new DOMPoint(r.right, r.bottom).matrixTransform(inv);
      k = (b.x - a.x) / PROP_FRAME.w; at = { x: a.x + PROP_FRAME.centre * k, y: a.y + PROP_FRAME.floor * k };
    }
    const door = front && front.getAttribute('data-prop') === 'cageFront' ? front.querySelector('[data-cage-door49a]') : null;
    if (!door) throw new Error(`[character] ${usage}`);
    const num = (key) => +door.getAttribute('data-' + key);
    const open = { x0: num('x0'), x1: num('x1'), y0: num('y0'), y1: num('y1') }, hinge = num('hinge'), latch = door.getAttribute('data-door') === 'right' ? open.x0 + 7 : open.x1 - 7;
    const p = (x, y) => ({ x: at.x + (x - PROP_FRAME.centre) * k, y: at.y + (y - PROP_FRAME.floor) * k });
    // Chỗ CHỐT cửa ở độ mở `o` (cửa xoay quanh bản lề: chốt chạy về phía bản lề).
    const latchAt = (o) => p(hinge + (latch - hinge) * (1 - OPEN49A * o), (open.y0 + open.y1) / 2);
    return { at, k, p, open, hinge, latch, latchAt, door, side: latch > hinge ? 1 : -1 };
  }

  // CON VẬT ở nhà (trong host của nó), trong hệ gốc của SVG này: khung SVG của nó (`r`), đơn vị khung của nó (`unit`), phần hình đang dời
  // (`shift`: s.x + dropX), tâm khung chưa dời (`centre` + `shift` là tâm hình đang vẽ), khung thân + đầu (`body`), đáy chân (`feet`), vị trí đầu theo bề
  // ngang khung CHƯA DỜI (`middle`, 0…1 — như `carry`: đầu vào giữa ngực người bế).
  _petAt49a(pet) {
    RigSVG._homePet(pet);
    pet.apDung();                        // hình nó theo trạng thái lúc dựng (phần dời của các người khác)
    const inv = this.svg.getScreenCTM().inverse(), root = (x, y) => new DOMPoint(x, y).matrixTransform(inv);
    const box = (el) => { const q = el.getBoundingClientRect(), a = root(q.left, q.top), b = root(q.right, q.bottom); return { x0: a.x, y0: a.y, x1: b.x, y1: b.y }; };
    const r = box(pet.svg), vb = pet.svg.viewBox && pet.svg.viewBox.baseVal, unit = (r.x1 - r.x0) / ((vb && vb.width) || 400);
    const parts = [pet.el.dau, pet.el.than, ...['tnBan', 'txBan', 'snBan', 'sxBan'].map((key) => pet.el[key])].filter((el) => el && el.getBoundingClientRect().height > 0).map(box);
    const body = { x0: Math.min(...parts.map((q) => q.x0)), x1: Math.max(...parts.map((q) => q.x1)), y0: Math.min(...parts.map((q) => q.y0)), y1: Math.max(...parts.map((q) => q.y1)) };
    const paws = ['tnBan', 'txBan', 'snBan', 'sxBan'].map((key) => pet.el[key]).filter((el) => el && el.getBoundingClientRect().height > 0).map(box);
    const feet = paws.length ? Math.max(...paws.map((q) => q.y1)) : body.y1, head = box(pet.el.dau);
    const shift = ((pet.s.x || 0) + (typeof pet.dropX === 'function' ? pet.dropX() : 0)) * unit, centre = (r.x0 + r.x1) / 2;
    const middle = clamp(((head.x0 + head.x1) / 2 - shift - r.x0) / (r.x1 - r.x0), 0.1, 0.9);
    return { r, unit, shift, centre, body, feet, middle, bodyOff: (body.x0 + body.x1) / 2 - shift - centre, width: body.x1 - body.x0, height: feet - body.y0 };
  }

  // Ghi một lần dời con vật (đơn vị khung của NÓ) vào ô `n` của người này — ô đọc theo `cageMove49a` (RigThu.dropX). Dựng lại bước (bản nháp rồi bản
  // thật của `sequence()`) thì ghi đè đúng ô ấy.
  _cageMove49a(pet, n, dx) {
    (this.cageMoves49a || (this.cageMoves49a = []))[n] = { pet, dx };
    (pet.cagers49a || (pet.cagers49a = new Set())).add(this);
    (this.cagePets49a || (this.cagePets49a = new Set())).add(pet);
  }

  _cageDoor49a(geo) {
    const list = this.cageDoors49a || (this.cageDoors49a = []);
    if (!list.some((item) => item.el === geo.door)) list.push({ el: geo.door, hinge: geo.hinge });
  }

  // VẼ CỬA CHUỒNG (gọi trong `apDung`): mỗi cửa người này từng mở xoay quanh bản lề theo `cageDoor49a`; nhiều người cùng một cửa thì lấy độ mở lớn
  // nhất. Con vật người này đã dời vào / ra mà lúc này không ai bế: vẽ lại nó khi số lần dời đổi (tua nhảy qua lúc thả nó vào chuồng).
  _drawCages49a() {
    if (this.cageDoors49a) for (const item of this.cageDoors49a) {
      const el = item.el, opens = el.__open49a || (el.__open49a = new Map());
      opens.set(this, clamp(this.s.cageDoor49a || 0, 0, 1));
      const o = Math.max(...opens.values()), key = o.toFixed(4);
      if (el.__drawn49a === key) continue;
      el.__drawn49a = key;
      if (o < 1e-4) el.removeAttribute('transform');
      else el.setAttribute('transform', `translate(${item.hinge} 0) scale(${(1 - OPEN49A * o).toFixed(4)} 1) translate(${-item.hinge} 0)`);
    }
    if (this.cagePets49a) {
      const n = Math.round(this.s.cageMove49a || 0);
      if (this._cageSeen49a !== n) { this._cageSeen49a = n; for (const pet of this.cagePets49a) if (!pet.isCarried()) pet.apDung(); }
    }
  }

  // HAI TAY đỡ con vật trong chuồng (đợt 49 A): tay phía chuồng tới nửa xa của thân nó, tay kia tới nửa gần — góc trên màn hình (`aim`), dáng quỳ.
  _twoHands49a(body, width, near) {
    const other = near === 'L' ? 'R' : 'L', dir = near === 'L' ? -1 : 1;      // tay trái ở phía trái màn hình: nửa xa của con vật ở phía ấy
    const a = this._kneelReach49a({ x: body.x + dir * width * 0.18, y: body.y }, near), b = this._kneelReach49a({ x: body.x - dir * width * 0.22, y: body.y + width * 0.05 }, other);
    return { ['bat' + near]: a.upper, ['cang' + near]: a.fore, ['aim' + near]: 1, ['bat' + other]: b.upper, ['cang' + other]: b.fore, ['aim' + other]: 1 };
  }

  // Góc tay / thân khi QUỲ cạnh chuồng (như `weigh`: tay tính ở dáng quỳ — vai đã hạ).
  _kneelReach49a(point, hand = null) {
    const s = this.s, was = { seat: s.seat, kneel: s.kneel };
    s.seat = 1; s.kneel = 1;
    const reach = this._reachLow(point, hand, 'body'), look = this._lookAngles({ x: reach.tx, y: reach.ty });
    s.seat = was.seat; s.kneel = was.kneel;
    return { ...reach, look };
  }

  // MỞ / ĐÓNG cửa bằng tay `k` (đợt 49 A): tay tới chốt, cửa xoay theo kênh `cageDoor49a` trong `d` giây, bàn tay đi theo chốt. `from` / `to` độ mở.
  _swingDoor49a(t, at, geo, k, from, to, d = 0.6) {
    const s = this.s, start = this._kneelReach49a(geo.latchAt(from), k), end = this._kneelReach49a(geo.latchAt(to), k);
    t.to(s, { ['bat' + k]: start.upper, ['cang' + k]: start.fore, ['aim' + k]: 1, ...start.look, duration: 0.45, ease: 'power2.out' }, at);
    t.set(s, { ['tay' + k]: 'nam' }, at + 0.4);
    t.to(s, { cageDoor49a: to, ['bat' + k]: end.upper, ['cang' + k]: end.fore, ...end.look, duration: d, ease: 'sine.inOut' }, at + 0.5);
    t.set(s, { ['tay' + k]: 'mo' }, at + 0.5 + d);
    return at + 0.5 + d;
  }

  /**
   * ĐẶT CON VẬT VÀO CHUỒNG (gửi thú lưu trú): đang bế nó thì giữ, chưa bế thì cúi bế nó lên trước (như `carry` — nó phải trong tầm tay); quỳ cạnh
   * chuồng, một tay vẫn ôm nó, tay kia mở chốt kéo cửa ra; hai tay hạ nó vào trong chuồng (nó đứng giữa lòng chuồng và khung trước: song cửa đè lên
   * nó), rút tay ra, đóng cửa, gài chốt, gật, đứng lên. `cage`: đạo cụ `cageFront` (hay `{ at, scale, door }` — xem `_cage49a`); người đứng ở phía
   * CHỐT cửa (phía không có bản lề). Chuồng đặt trên sàn, cùng sàn với chỗ con vật đứng.
   */
  putInCage(pet, cage = null, { hold = 0.5 } = {}) {
    if (!pet || !pet.svg || typeof pet.apDung !== 'function' || !pet.el || !pet.el.dau || pet instanceof RigSVG) throw new Error('[character] putInCage(pet, cage): pet must be a pet rig (createPet(...).rig)');
    if (!(typeof hold === 'number' && hold >= 0 && hold <= 6)) throw new Error(`[character] putInCage: hold must be 0…6 seconds, got ${JSON.stringify(hold)}`);
    const geo = this._cage49a(cage, 'putInCage'), s = this.s, N = this.NGHI;
    const me = HONG.x + (s.x || 0);
    if (Math.sign(me - geo.at.x) !== geo.side) throw new Error(`[character] putInCage: stand on the latch side of the cage (the ${geo.side > 0 ? 'right' : 'left'}) — its door is hinged on the other side`);
    const carrying = s.om >= 0.5 && this._carriedNow() && this._carriedNow().pet === pet;
    if (s.om >= 0.5 && !carrying) throw new Error('[character] putInCage: already carrying another pet — putDown() first');
    const home = this._petAt49a(pet);
    // Vừa chuồng không: thân + đầu trong ô cửa (bề ngang), đỉnh đầu dưới mép trên ô cửa.
    const room = { w: (geo.open.x1 - geo.open.x0) * geo.k, h: (PROP_FRAME.floor - geo.open.y0) * geo.k };
    if (home.width > room.w * FIT49A || home.height > room.h * FIT49A) throw new Error(`[character] putInCage: the pet is too big for this cage (${home.width.toFixed(0)} × ${home.height.toFixed(0)} frame units, the door opening is ${room.w.toFixed(0)} × ${room.h.toFixed(0)}) — make the cage wider / taller`);
    if (Math.abs(home.feet - geo.at.y) > LEVEL49A) throw new Error('[character] putInCage: the cage floor must be level with where the pet stands (both on the floor) — the pet is set down inside the cage on that same floor');
    const t = carrying ? this.tl() : this.carry(pet), B = carrying ? 0 : t.duration(), n = Math.round(s.cageMove49a || 0);
    // Dời: tâm hình con vật vào giữa chuồng (đơn vị khung của nó). Bật ở lúc nó đang trên tay (hình không theo phần dời) — không thấy nhảy.
    this._cageMove49a(pet, n, (geo.at.x - (home.centre + home.shift)) / home.unit);
    this._cageDoor49a(geo);
    const k = me > geo.at.x ? 'L' : 'R', other = k === 'L' ? 'R' : 'L';      // tay phía chuồng mở / đóng cửa
    const inside = this._kneelReach49a({ x: geo.at.x + home.bodyOff, y: geo.at.y - home.height * 0.45 }), down = { seat: 1, kneel: 1, than: N.than - inside.lean * 0.6, dau: N.dau + inside.lean * 0.5, dauY: 6, cuoi: 0.8 };
    // 1. Quỳ xuống cạnh chuồng, con vật vẫn ôm trước ngực; nhìn cửa chuồng.
    t.to(s, { ...down, duration: 0.6, ease: 'power2.inOut' }, B);
    // 2. Tay phía chuồng rời con vật (tay kia vẫn ôm), tới chốt, kéo cửa mở; buông chốt, tay về ôm con vật.
    t.to(s, { ['free49a' + k]: 1, duration: 0.3, ease: 'power2.out' }, B + 0.45);
    const opened = this._swingDoor49a(t, B + 0.5, geo, k, 0, 1);
    t.to(s, { ['free49a' + k]: 0, ['aim' + k]: 0, duration: 0.35, ease: 'power2.inOut' }, opened + 0.05);
    // 3. Hạ con vật vào chuồng: chỗ "nhà" của nó đã là giữa chuồng (`cageMove49a`), hai tay đỡ nó xuống tới sàn chuồng (tay đặt sẵn ở dáng đỡ — dáng
    //    ôm che nó khi `omRise` = 1, như `putDown`).
    const L0 = opened + 0.45;
    t.to(s, { cageMove49a: n + 1, duration: 0.02 }, L0 - 0.05);
    t.to(s, { ...this._twoHands49a({ x: geo.at.x + home.bodyOff, y: geo.at.y - home.height * 0.45 }, home.width, k), duration: 0.02 }, L0);
    t.set(s, { tayL: 'xoe', tayR: 'xoe' }, L0 + 0.02);
    t.to(s, { ...inside.look, than: N.than - inside.lean, dau: N.dau + inside.lean * 0.8, dauY: 7, duration: 0.6, ease: 'power2.inOut' }, L0);
    t.to(s, { omRise: 0, duration: 0.7, ease: 'sine.inOut' }, L0);
    t.set(s, { om: 0 }, L0 + 0.72);
    // 4. Rút tay ra (con vật đã ở trong chuồng — giữa hai lớp), đóng cửa bằng tay phía chuồng, gài chốt.
    const R0 = L0 + 0.75;
    t.to(s, { ['bat' + other]: N['bat' + other], ['cang' + other]: N['cang' + other], ['aim' + other]: 0, ...down, duration: 0.45, ease: 'power2.inOut' }, R0);
    t.set(s, { tayL: 'mo', tayR: 'mo' }, R0 + 0.2);
    const closed = this._swingDoor49a(t, R0 + 0.05, geo, k, 1, 0, 0.55);
    // 5. Gật một cái (đã gài chốt), đứng lên.
    t.to(s, { dauY: 11, cuoi: 1, duration: 0.18, ease: 'sine.out', yoyo: true, repeat: 1 }, closed + 0.1);
    this._lookTo(t, null, closed + 0.15, { d: 0.5 });
    this._khep(t, 0.55, closed + 0.5 + hold, { om: 0, omRise: 0, kneel: 0, seat: N.seat, cageMove49a: n + 1 });
    return t;
  }

  /**
   * BẾ CON VẬT RA KHỎI CHUỒNG (trả thú lưu trú): quỳ cạnh chuồng, mở chốt kéo cửa ra, hai tay vào chuồng bế nó lên trước ngực, một tay đóng cửa lại,
   * đứng lên — và GIỮ thế bế (như `carry`). `putDown()` đặt nó xuống cạnh chân mình, phía không có chuồng; `handOverPet` trao nó cho chủ.
   * Con vật phải đang ở trong chuồng ấy (đặt vào bằng `putInCage`, hay cảnh đặt sẵn nó giữa hai lớp chuồng).
   */
  takeOutOfCage(pet, cage = null) {
    if (!pet || !pet.svg || typeof pet.apDung !== 'function' || !pet.el || !pet.el.dau || pet instanceof RigSVG) throw new Error('[character] takeOutOfCage(pet, cage): pet must be a pet rig (createPet(...).rig)');
    if (this.s.om >= 0.5) throw new Error('[character] takeOutOfCage: already carrying a pet — putDown() first (both hands go into the cage)');
    const geo = this._cage49a(cage, 'takeOutOfCage'), s = this.s, N = this.NGHI;
    const me = HONG.x + (s.x || 0);
    if (Math.sign(me - geo.at.x) !== geo.side) throw new Error(`[character] takeOutOfCage: stand on the latch side of the cage (the ${geo.side > 0 ? 'right' : 'left'}) — its door is hinged on the other side`);
    const pt = this._petAt49a(pet), t = this.tl(), n = Math.round(s.cageMove49a || 0);
    // Con vật đứng giữa chuồng (tâm hình nó ở giữa sàn chuồng) — không đo chỗ nó đang vẽ: lúc dựng, người đã đưa nó vào có thể đang ở khung 0.
    const body = { x: geo.at.x + pt.bodyOff, y: geo.at.y - pt.height * 0.45 };
    // Chỗ nhà MỚI: cạnh chân người này, phía không có chuồng (`putDown` đặt nó ở đó) — như `takePet`.
    const away = geo.side, want = me + away * (60 + pt.width * 0.5), drop = { x: want + pt.bodyOff, y: geo.at.y - pt.height * 0.45 };
    this._cageMove49a(pet, n, (want - geo.at.x) / pt.unit);
    this._cageDoor49a(geo);
    const k = me > geo.at.x ? 'L' : 'R', inside = this._kneelReach49a(body), other = inside.k === 'L' ? 'R' : 'L';
    const down = { seat: 1, kneel: 1, than: N.than - inside.lean * 0.6, dau: N.dau + inside.lean * 0.5, dauY: 6, cuoi: 0.8 };
    // Lần bế này: con vật ở nhà là trong chuồng (host của nó + phần dời đang có); sau khi đã lên tay thì nhà là cạnh chân người (`cageMove49a` + 1).
    this._holdEntry(t, { pet, host: pet.host || pet.svg.parentNode, attrs: pet.homeAttrs || ['x', 'y', 'width', 'height'].map((key) => [key, pet.svg.getAttribute(key)]),
                     from: { x: pt.r.x0, y: pt.r.y0, w: pt.r.x1 - pt.r.x0, h: pt.r.y1 - pt.r.y0 }, reach: this._reachLow(drop, null, 'body'), at: s.x, middle: pt.middle, facing: s.huong });
    // 1. Quỳ xuống cạnh chuồng, mở cửa.
    t.to(s, { ...down, duration: 0.6, ease: 'power2.inOut' }, 0);
    const opened = this._swingDoor49a(t, 0.4, geo, k, 0, 1);
    // 2. Hai tay vào chuồng đỡ lấy con vật, bế nó lên trước ngực.
    const P = opened + 0.1;
    t.to(s, { ...this._twoHands49a(body, pt.width, k), ...inside.look, than: N.than - inside.lean, dau: N.dau + inside.lean * 0.8, dauY: 7, duration: 0.5, ease: 'power2.out' }, P);
    t.set(s, { tayL: 'xoe', tayR: 'xoe' }, P + 0.3);
    t.set(s, { om: 1, omRise: 0 }, P + 0.5);
    t.to(s, { omRise: 1, ...down, dauY: 3, nhinX: 0, nhinY: 1.8, headTurn: 0, headPitch: 0, cuoi: 1, duration: 0.65, ease: 'sine.inOut' }, P + 0.55);
    t.to(s, { cageMove49a: n + 1, duration: 0.02 }, P + 1.25);
    // 3. Một tay rời con vật, đóng cửa, gài chốt; tay về ôm.
    t.to(s, { ['free49a' + k]: 1, duration: 0.3, ease: 'power2.out' }, P + 1.25);
    const closed = this._swingDoor49a(t, P + 1.3, geo, k, 1, 0, 0.55);
    t.to(s, { ['free49a' + k]: 0, ['aim' + k]: 0, duration: 0.35, ease: 'power2.inOut' }, closed + 0.05);
    this._lookTo(t, null, closed + 0.1, { d: 0.5 });
    // 4. Đứng lên, vẫn bế nó (thế bế, nhìn thẳng như `carry`).
    this._khep(t, 0.55, closed + 0.45, { om: 1, omRise: 1, huong: 0, kneel: 0, seat: N.seat, cageMove49a: n + 1 });
    return t;
  }

  /** Số đo chuồng (đợt 49 A — tools/check.html, tools/acting_check.py qua `set.careProbe()`): độ mở cửa, tay đang rời con vật, số lần đã dời con vật. */
  cage49aProbe() {
    const s = this.s;
    return { door: +(s.cageDoor49a || 0).toFixed(3), freeL: +(s.free49aL || 0).toFixed(3), freeR: +(s.free49aR || 0).toFixed(3), moves: Math.round(s.cageMove49a || 0) };
  }
});
