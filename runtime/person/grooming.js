// runtime/person/grooming.js — đợt 49 B: grooming after the bath — blow-dry (`blowDry`) and trim the coat (`trimFur`).
// Methods of `RigSVG`, installed by runtime/rig-svg.js: `this` is the rig, `RigSVG` its class.
//
// Như đợt 42 F (runtime/person/care.js): quay nghiêng về con vật (`_care38`), dụng cụ CHỈ HIỆN trong tay gần — 43 máy sấy cầm tay (vòi thổi + ống
// gió), 44 kéo tỉa lông, 45 tông-đơ điện. Ba hình ấy KHÔNG có sẵn trong markup của người: `_drawGroomTools49b` dựng chúng vào ngăn `gadgetL/R`
// lần đầu kênh `gadget` của tay ấy là 43–45 (nhân vật chưa từng sấy / tỉa thì SVG y như trước đợt này).
// Việc tay làm lên con vật là kênh của người, con vật đọc lại khi vẽ (runtime/pet/grooming.js): `petBlow49b` gió thổi vào lông (0…1),
// `petShag49b` lông dài xù chưa tỉa (0…1, GIỮ), `petCutT49b` giây đã tỉa (đi thẳng theo thời gian — túm lông thứ i rụng ở `i`/n × `petCutDur49b`,
// GIỮ), `petCutDur49b` giây tỉa hết lưng (GIỮ); `groomT49b` đồng hồ của động tác (gió chảy, lông gợn, tông-đơ rung). Lông ướt → khô bông dùng lại
// kênh đợt 42 F (`petWet42f`, `petDry42f`, `petMood42f`).

import { clamp, chuanHoaGoc, mix } from './shared.js';

const AIR_LEN49B = 36;                 // luồng gió dài chừng ấy (đơn vị khung bàn tay) từ miệng vòi sấy
const NOZZLE49B = 41;                  // miệng vòi sấy cách cổ tay chừng ấy theo bàn tay (gadget 43)
const SCISSORS_TIP49B = 44;            // mũi kéo (gadget 44)
const CLIPPER_TIP49B = 39;             // lưỡi tông-đơ (gadget 45)

// Hình ba dụng cụ (hệ cổ tay: lòng bàn tay ở (0, 10), dụng cụ chĩa theo +y).
const TOOL49B = {
  // MÁY SẤY: tay cầm xanh ngọc trong nắm tay, vòi thổi trắng thuôn dần, miệng vòi dẹt; ống gió gân xám rủ ra sau; LUỒNG GIÓ (`data-air49b`):
  // năm vệt trắng viền xanh nhạt loe ra, gợn và chảy theo `groomT49b`, vài cụm gió tròn trôi theo.
  43: `<g data-gadget="43"><path d="M 0 -5 C -2 -18 -18 -22 -22 -10 S -20 14 -30 22" fill="none" stroke="#5b6b78" stroke-width="6" stroke-linecap="round"/>
        <path d="M 0 -5 C -2 -18 -18 -22 -22 -10 S -20 14 -30 22" fill="none" stroke="#9aa7b2" stroke-width="3.400" stroke-linecap="round" stroke-dasharray="2.200 2.600"/>
        <g data-solid49b=""><rect x="-4.800" y="-7" width="9.600" height="22" rx="3.600" fill="#2f9e8f" stroke="#1d5f56" stroke-width="1.200"/>
        <path d="M -5.600 14 L -3.600 ${NOZZLE49B - 3} L 3.600 ${NOZZLE49B - 3} L 5.600 14 Z" fill="#eef3f6" stroke="#4a5562" stroke-width="1.200" stroke-linejoin="round"/>
        <rect x="-6.400" y="${NOZZLE49B - 4}" width="12.800" height="5" rx="1.800" fill="#b9c4cd" stroke="#4a5562" stroke-width="1.200"/></g>
        <g data-air49b="" style="display:none"><path data-cone49b="" fill="#e3f5fd" fill-opacity=".5" stroke="#bfe4f6" stroke-width="1.200" stroke-opacity=".8"/>${[0, 1, 2].map((n) => `<path data-flow="${n}" fill="none" stroke="#a9d8f0" stroke-width="4" stroke-linecap="round" opacity=".55"/><path data-flow-core="${n}" fill="none" stroke="#ffffff" stroke-width="2.200" stroke-linecap="round" stroke-dasharray="11 7"/>`).join('')}
          ${[0, 1, 2, 3].map((n) => `<circle data-puff="${n}" fill="#ffffff" fill-opacity=".8" stroke="#9fd0ea" stroke-width="1.100"/>`).join('')}</g></g>`,
  // KÉO TỈA: hai vòng cầm xanh ngọc trong nắm tay, hai lưỡi thép quay quanh chốt (0, 21) — mở / khép theo `snip49b`.
  44: `<g data-gadget="44"><circle cx="-4.400" cy="7" r="4.600" fill="none" stroke="#2f9e8f" stroke-width="2.600"/><circle cx="4.400" cy="7" r="4.600" fill="none" stroke="#2f9e8f" stroke-width="2.600"/>
        <g data-blade="1"><path d="M -2.600 11 L 1.200 21 L 0.800 ${SCISSORS_TIP49B} L -1.600 21 Z" fill="#dfe5ea" stroke="#3b3f47" stroke-width="1.100" stroke-linejoin="round"/></g>
        <g data-blade="2"><path d="M 2.600 11 L -1.200 21 L -0.800 ${SCISSORS_TIP49B} L 1.600 21 Z" fill="#c7ced6" stroke="#3b3f47" stroke-width="1.100" stroke-linejoin="round"/></g>
        <circle cx="0" cy="21" r="1.700" fill="#8a929e" stroke="#3b3f47" stroke-width=".8"/></g>`,
  // TÔNG-ĐƠ ĐIỆN: thân trắng tròn cạnh, vạch xanh ngọc, công tắc; đầu lưỡi thép có răng; VẠCH RUNG (`data-buzz49b`) hai bên đầu lưỡi khi chạy.
  45: `<g data-gadget="45"><g data-body49b=""><rect x="-6.200" y="-9" width="12.400" height="37" rx="5.400" fill="#f4f7fa" stroke="#4a5562" stroke-width="1.200"/>
        <rect x="-6.200" y="6" width="12.400" height="5" fill="#2f9e8f"/><rect x="-2" y="15" width="4" height="7" rx="1.600" fill="#8a929e"/>
        <path d="M -7.200 28 L 7.200 28 L 6.400 ${CLIPPER_TIP49B - 1} L -6.400 ${CLIPPER_TIP49B - 1} Z" fill="#b9c4cd" stroke="#3b3f47" stroke-width="1.100" stroke-linejoin="round"/>
        <path d="M -5.600 ${CLIPPER_TIP49B - 1} v 2 M -2.800 ${CLIPPER_TIP49B - 1} v 2 M 0 ${CLIPPER_TIP49B - 1} v 2 M 2.800 ${CLIPPER_TIP49B - 1} v 2 M 5.600 ${CLIPPER_TIP49B - 1} v 2" stroke="#3b3f47" stroke-width="1.100" stroke-linecap="round"/></g>
        <g data-buzz49b="" style="display:none" fill="none" stroke="#f0a020" stroke-width="1.700" stroke-linecap="round" stroke-linejoin="round"><path d="M 10 26 l 3 2 l -3 2 l 3 2 l -3 2"/><path d="M -10 26 l -3 2 l 3 2 l -3 2 l 3 2"/><path d="M 15 23 l 3 2.500 l -3 2.500 l 3 2.500"/><path d="M -15 23 l -3 2.500 l 3 2.500 l -3 2.500"/></g></g>`,
};

export default (RigSVG) => mix(RigSVG, class {
  static AIR_LEN49B = AIR_LEN49B;
  static DRYER_DIP49B = 72;          // vòi sấy chĩa xuống chừng ấy độ dưới phương ngang, theo chiều đầu → đuôi con vật (gió không vào mặt nó)
  static TRIM_V49B = [0.45, 1.75];    // đường tỉa trên lưng: tham số gáy (0) → giữa lưng (1) → mông (2) — RigThu.TRIM_V49B (runtime/pet/grooming.js) dùng cùng số
  static TRIM_FALL49B = 1.25;        // giây sau nhát cuối: túm lông cuối cùng rơi xuống và tan hết

  // Vẽ theo trạng thái (gọi trong `_drawHeldItems`): dựng hình dụng cụ 43–45 lần đầu dùng, luồng gió máy sấy, kéo mở / khép, tông-đơ rung.
  _drawGroomTools49b() {
    const e = this.el, s = this.s, T = +s.groomT49b || 0, f = (v) => v.toFixed(2);
    for (const side of ['L', 'R']) {
      const box = e['gadget' + side], kind = Math.round(s['gadget' + side]);
      if (!box || kind < 43 || kind > 45) continue;
      let tool = [...box.children].find((child) => +child.getAttribute('data-gadget') === kind);
      if (!tool) { box.insertAdjacentHTML('beforeend', TOOL49B[kind]); tool = box.lastElementChild; }
      tool.style.display = '';
      if (kind === 43) {
        const air = tool.querySelector('[data-air49b]'), v = clamp(+s['air49b' + side] || 0, 0, 1);
        air.style.display = v > 0.03 ? '' : 'none';
        if (v > 0.03) {
          air.setAttribute('opacity', f(Math.min(1, v * 1.3)));
          const y0 = NOZZLE49B + 1, L = AIR_LEN49B * (0.55 + 0.45 * v);
          // nón gió trong mờ loe ra từ miệng vòi, ba vệt gió cong chữ S trong nón; lõi trắng đứt khúc chảy ra khỏi vòi
          tool.querySelector('[data-cone49b]').setAttribute('d', `M -5.5 ${f(y0)} Q ${f(-10 + Math.sin(T * 11))} ${f(y0 + L * 0.5)} -14 ${f(y0 + L)} Q 0 ${f(y0 + L + 4)} 14 ${f(y0 + L)} Q ${f(10 + Math.sin(T * 13))} ${f(y0 + L * 0.5)} 5.5 ${f(y0)} Z`);
          for (let n = 0; n < 3; n++) {
            const x0 = (n - 1) * 2.8, x1 = (n - 1) * 8.5, wob = 2.4 * Math.sin(T * 15 + n * 1.9);
            const d = `M ${f(x0)} ${f(y0 + 1)} C ${f(x0 + wob)} ${f(y0 + L * 0.35)} ${f(x1 - wob)} ${f(y0 + L * 0.65)} ${f(x1)} ${f(y0 + L - 1)}`, off = f(-T * 75 - n * 6);
            for (const path of tool.querySelectorAll(`[data-flow="${n}"], [data-flow-core="${n}"]`)) { path.setAttribute('d', d); if (path.hasAttribute('stroke-dasharray')) path.setAttribute('stroke-dashoffset', off); }
          }
          // cụm gió trôi theo luồng: vị trí = phần lẻ của thời gian, to dần, nhạt dần
          tool.querySelectorAll('[data-puff]').forEach((c, n) => {
            const p = ((T * 2.2 + n / 4) % 1 + 1) % 1, x = Math.sin(n * 2.4 + T * 3) * 6 * p;
            c.setAttribute('cx', f(x)); c.setAttribute('cy', f(y0 + 4 + p * L)); c.setAttribute('r', f(1.6 + 2.6 * p)); c.setAttribute('opacity', f((1 - p) * 0.9));
          });
        }
      } else if (kind === 44) {
        const open = clamp(+s['snip49b' + side] || 0, 0, 1), a = 2 + 16 * open;
        tool.querySelector('[data-blade="1"]').setAttribute('transform', `rotate(${f(-a)} 0 21)`);
        tool.querySelector('[data-blade="2"]').setAttribute('transform', `rotate(${f(a)} 0 21)`);
      } else {
        const v = clamp(+s['buzz49b' + side] || 0, 0, 1), buzz = tool.querySelector('[data-buzz49b]'), body = tool.querySelector('[data-body49b]');
        buzz.style.display = v > 0.05 ? '' : 'none';
        if (v > 0.05) buzz.setAttribute('opacity', f(v * (0.65 + 0.35 * Math.abs(Math.sin(T * 41)))));
        const j = v > 0.05 ? 0.45 * v * Math.sin(T * 97) : 0;          // rung rất nhẹ
        if (j) body.setAttribute('transform', `translate(${f(j)} 0)`); else body.removeAttribute('transform');
      }
    }
  }

  /** Số đo cho tools/acting_check.py (đợt 49 B, `set.careProbe` → `c49b`): dụng cụ 43–45 đang cầm, luồng gió và chỗ nó tới (px màn hình), mũi kéo / lưỡi tông-đơ. */
  groom49bProbe() {
    const e = this.el, s = this.s, side = ['L', 'R'].find((k) => Math.round(s['gadget' + k]) >= 43 && Math.round(s['gadget' + k]) <= 45) || null;
    const kind = side ? Math.round(s['gadget' + side]) : 0, tool = side ? [...e['gadget' + side].children].find((child) => +child.getAttribute('data-gadget') === kind) || null : null;
    const air = tool && kind === 43 ? tool.querySelector('[data-air49b]') : null, shown = air && air.style.display !== 'none';
    const at = (y) => { if (!tool || !tool.getScreenCTM()) return null; const q = new DOMPoint(0, y).matrixTransform(tool.getScreenCTM()); return { x: q.x, y: q.y, px: true }; };
    const v = side ? +clamp(+s['air49b' + side] || 0, 0, 1) : 0;
    return { kind, side, tool, solid: tool && kind === 43 ? tool.querySelector('[data-solid49b]') : tool, air: shown ? air : null, nozzle: kind === 43 ? at(NOZZLE49B) : null, airEnd: shown ? at(NOZZLE49B + 1 + AIR_LEN49B * (0.55 + 0.45 * v)) : null,
             tip: kind === 44 ? at(SCISSORS_TIP49B - 2) : kind === 45 ? at(CLIPPER_TIP49B) : null, airLevel: +v.toFixed(3),
             snip: side ? +clamp(+s['snip49b' + side] || 0, 0, 1).toFixed(3) : 0, buzz: side ? +clamp(+s['buzz49b' + side] || 0, 0, 1).toFixed(3) : 0 };
  }

  // Đầu con vật (tâm, bán kính) từ đỉnh đầu và cằm, trong hệ của `_care38`: điểm nào trên đường lưng nằm trong đầu (thỏ đầu to, gáy khuất sau đầu)
  // thì tay / dụng cụ không tới đó — đặt ở đó là che mặt nó.
  _offHead49b(c) {
    const Hd = c.spot('crown', 'petStand49b', 1), Cn = c.spot('chin', 'petStand49b', 1);
    const hc = { x: (Hd.x + Cn.x) / 2, y: (Hd.y + Cn.y) / 2 }, hr = Math.hypot(Hd.x - Cn.x, Hd.y - Cn.y) / 2;
    const off = (q) => !c.pet || Math.hypot(q.x - hc.x, q.y - hc.y) > hr * 1.05 + 4;
    // Chỗ dự phòng cho tay xa khi không với tới lưng sau đầu: ĐỠ NGỰC (dưới cằm, trên bàn chân trước), dưới mặt nó.
    const Pw = c.spot('paw', 'petStand49b', 1);
    off.chest = { x: (Cn.x + Pw.x) / 2, y: Math.max(Cn.y + hr * 0.5, Cn.y + (Pw.y - Cn.y) * 0.6) };
    return off;
  }

  /**
   * SẤY LÔNG con vật `target` (vừa tắm, hay vừa lau khăn): quay nghiêng về nó, tay gần cầm VÒI MÁY SẤY (hiện trong tay, ống gió rủ ra sau) chĩa
   * chéo xuống lưng — luồng gió trắng thấy rõ tới lông; rà từ gáy về giữa lưng, qua lại `hold` giây; tay kia VÒ XÙ lông trên lưng, sau chỗ gió
   * thổi. Con vật: lông gợn, dựng lên và rạp theo chiều gió (từ đầu về đuôi), tai rạp ra sau phất phơ, mắt nheo; lông khô dần và BÔNG lên (như
   * `towelDry` — viền lông xù, đuôi to). Tắt máy, cất vòi (tay về hông), nhìn mặt nó, cười. Lông còn khô bông sau động tác.
   */
  blowDry(target = null, { hold = 2.4 } = {}) {
    if (!(Number.isFinite(hold) && hold >= 1 && hold <= 6)) throw new Error(`[character] blowDry: hold must be 1…6 seconds of drying, got ${JSON.stringify(hold)}`);
    const t = this.tl(), s = this.s, N = this.NGHI, c = this._care38(t, target, 'blowDry', 0.1), { k, o, dir } = c;
    // Chỗ trên con vật đo ở dáng ĐỨNG (`petStand49b` — mèo, thỏ đang ngồi thì đứng dậy cho sấy).
    const Sc = c.spot('scruff', 'petStand49b', 1), B = c.spot('back', 'petStand49b', 1), Hd = c.spot('crown', 'petStand49b', 1), E = c.spot('eye', 'petStand49b', 1), fwd = Hd.x >= Sc.x ? 1 : -1;
    const along = (u, dy = 0) => ({ x: Sc.x + (B.x - fwd * 8 - Sc.x) * u, y: Sc.y + (B.y - Sc.y) * u + dy });
    // Vòi sấy chĩa CHÉO XUỐNG (`DRYER_DIP49B`) theo chiều đầu → đuôi con vật: cuối luồng gió tới lưng (như vòi sen của `bathPet`).
    const dip = RigSVG.DRYER_DIP49B * Math.PI / 180, v = { x: -fwd * Math.cos(dip), y: Math.sin(dip) }, cB = c.hand;      // gió lùa từ đầu về đuôi — không vào mặt nó
    const aim = (q, lift = 0) => {
      const end = (NOZZLE49B + 1 + AIR_LEN49B) * cB, palm = { x: q.x - v.x * (end - 10 * cB), y: q.y - lift - v.y * (end - 10 * cB) };
      const p = c.arm(k, palm.x, palm.y, 10);
      const fore = k === 'R' ? 90 - p.bat - p.cang : 90 + p.bat + p.cang;
      const turn = chuanHoaGoc(Math.atan2(v.y, v.x) * 180 / Math.PI - fore);
      return { ...p, spin: k === 'R' ? turn : -turn };
    };
    // Góc xoay dụng cụ đi LIÊN TỤC giữa các nhịp (cộng bội 360°): ±180° kề nhau không được quay vòng ngược qua 0 (vòi sấy chĩa ngược lên một lúc).
    let spun = +s['gadgetTurn' + k] || 0;
    const turnTo = (spin) => (spun += chuanHoaGoc(spin - spun));
    const go = (side, p, at, d, extra = {}) => t.to(s, { ['bat' + side]: p.bat, ['cang' + side]: p.cang, ...(p.spin !== undefined ? { ['gadgetTurn' + side]: turnTo(p.spin) } : {}), ...extra, duration: d, ease: 'sine.inOut' }, at);
    // Chỗ tay xa vò lông: sau chỗ gió thổi; không với tới (thỏ đầu to, con vật nhỏ: tay xa vắt qua đầu nó) thì gần hơn — chỗ đầu tiên với tới.
    const off = this._offHead49b(c), lo = [0.85, 1.0, 1.15, 1.3].find((u) => off(along(u))) || 1.3, hi = Math.max(1.3, lo + 0.35);      // gió rà từ sau đầu về giữa lưng
    const qo = [1.75, 1.45, 1.2, 1.0].map((u) => along(u, 3)).find((q) => off(q) && !(c.arm(o, q.x, q.y + 3, 15).short > 1)) || { x: off.chest.x, y: off.chest.y - 3 };
    const ringO = [0, 1, 2, 3].map((n) => c.arm(o, qo.x - Math.cos(n * Math.PI / 2) * 4, qo.y + 3 - Math.sin(n * Math.PI / 2) * 2.5, 15)), ro = (n) => ringO[n % 4];
    const W = 0.6, E1 = W + hold, total = E1 + 1.95;
    // 0. Vòi sấy hiện trong tay gần, chĩa xuống trên gáy; tay xa tới lưng.
    const ready = aim(along(lo + 0.05), 10);
    go(k, ready, 0.05, 0.5, { ['bat' + o]: ro(0).bat, ['cang' + o]: ro(0).cang, dauY: 8, cuoi: 0.6, chum: 0.1, mayL: 0.3, mayR: 0.3 });
    t.set(s, { ['gadget' + k]: 43, ['air49b' + k]: 0, ['tay' + o]: 'xoe' }, 0.1);
    t.to(s, { petStand49b: 1, duration: 0.45, ease: 'sine.inOut' }, 0.05);
    t.fromTo(s, { groomT49b: 0 }, { groomT49b: total, duration: total, ease: 'none', immediateRender: false }, 0);
    if (c.pet) { (this.caring || (this.caring = new Set())).add(c.pet); t.to(s, { onTopL: 1, onTopR: 1, careFront: 1, duration: 0.02 }, 0.12); }      // như `bathPet`
    c.look(along(0.4), 0.05, { d: 0.45 });
    // 1. BẬT MÁY: gió thổi vào lưng; rà từ gáy về giữa lưng và lại; tay xa vò lông (vòng nhỏ); lông khô dần, bông lên.
    t.to(s, { ['air49b' + k]: 1, duration: 0.2, ease: 'sine.out' }, W);
    t.to(s, { petBlow49b: 1, duration: 0.3, ease: 'sine.out' }, W);
    const n = Math.max(2, Math.round(hold / 0.75)), per = hold / n;
    for (let i = 0; i < n; i++) go(k, aim(along(i % 2 ? lo : hi)), W + i * per, per);
    for (let a = W, m = 1; a + 0.1 <= E1 + 1e-6; a += 0.1, m++) { const po = ro(m); t.to(s, { ['bat' + o]: po.bat, ['cang' + o]: po.cang, duration: 0.1, ease: 'none' }, a); }
    c.look(along(0.7), W + 0.1, { d: 0.5 });
    t.to(s, { petWet42f: 0, duration: hold, ease: 'sine.inOut' }, W);
    t.to(s, { petDry42f: 1, duration: hold, ease: 'sine.in' }, W + 0.1);
    t.to(s, { petMood42f: 0.3, duration: 0.6 }, W + hold * 0.5);
    for (let a = W + 0.4; a < E1 - 0.4; a += 1.2) t.to(s, { dau: N.dau + dir * 3, duration: 0.25, ease: 'sine.inOut', yoyo: true, repeat: 1 }, a);
    // 2. TẮT MÁY: gió tắt, vòi về hông (cất), tay xa buông; con vật lông bông, vui; nhìn mặt nó, cười, gật.
    t.to(s, { ['air49b' + k]: 0, duration: 0.15, ease: 'sine.in' }, E1);
    t.to(s, { petBlow49b: 0, duration: 0.3, ease: 'sine.in' }, E1);
    go(k, ready, E1 + 0.05, 0.25);
    t.to(s, { ['bat' + k]: N['bat' + k], ['cang' + k]: N['cang' + k], ['aim' + k]: 0, ['gadgetTurn' + k]: spun - chuanHoaGoc(spun), duration: 0.35, ease: 'power2.inOut' }, E1 + 0.3);
    t.to(s, { ['bat' + o]: N['bat' + o], ['cang' + o]: N['cang' + o], ['aim' + o]: 0, duration: 0.4, ease: 'power2.inOut' }, E1 + 0.15);
    t.set(s, { ['gadget' + k]: 0, ['tay' + k]: 'mo', ['tay' + o]: 'mo' }, E1 + 0.66);
    if (c.pet) t.to(s, { onTopL: 0, onTopR: 0, careFront: 0, duration: 0.02 }, E1 + 0.55);
    t.to(s, { petMood42f: 1, duration: 0.35, ease: 'sine.out' }, E1 + 0.3);
    t.to(s, { petStand49b: 0, duration: 0.5, ease: 'sine.inOut' }, E1 + 0.7);
    c.look(E, E1 + 0.4, { d: 0.35 });
    t.to(s, { cuoi: 1, mieng: 0.35, mayL: 0.7, mayR: 0.7, chum: 0, duration: 0.3 }, E1 + 0.5);
    t.to(s, { dauY: 13, duration: 0.2, ease: 'sine.out', yoyo: true, repeat: 1 }, E1 + 1.0);
    this._khep(t, 0.5, E1 + 1.45, { ...c.keep, petWet42f: 0, petDry42f: c.pet ? 1 : 0 });
    return t;
  }

  /**
   * TỈA LÔNG con vật `target` bằng KÉO (`tool: 'scissors'`) hay TÔNG-ĐƠ (`'clipper'`): quay nghiêng về nó; tay xa VÒ XÙ lông trên lưng (lông dài
   * dựng lên thành túm) rồi ĐỠ SƯỜN giữ nó yên; tay gần đưa dụng cụ (hiện trong tay) dọc lưng từ gáy về mông trong `hold` giây — kéo mở / khép
   * từng nhát, tông-đơ rung (vạch rung hai bên) — túm lông dài bị cắt RỤNG xuống (rơi rồi tan trên mặt bàn / sàn); con vật đứng yên, dễ chịu. Xong:
   * lưng gọn — không còn túm dài, viền lông bớt xù (đã sấy bông thì bớt bông), đuôi gọn. Cất dụng cụ, nhìn mặt nó, cười. Lông GIỮ gọn sau động tác.
   */
  trimFur(target = null, { tool = 'scissors', hold = 2.4 } = {}) {
    if (tool !== 'scissors' && tool !== 'clipper') throw new Error(`[character] trimFur: tool must be 'scissors' or 'clipper', got ${JSON.stringify(tool)}`);
    if (!(Number.isFinite(hold) && hold >= 1 && hold <= 6)) throw new Error(`[character] trimFur: hold must be 1…6 seconds of trimming, got ${JSON.stringify(hold)}`);
    const t = this.tl(), s = this.s, N = this.NGHI, c = this._care38(t, target, 'trimFur', 0.1), { k, o, dir } = c;
    const Sc = c.spot('scruff', 'petStand49b', 1), B = c.spot('back', 'petStand49b', 1), E = c.spot('eye', 'petStand49b', 1);       // đo ở dáng đứng (như `blowDry`)
    // Mông: chỗ trên con vật (RigThu.carePoint 'rump49b'); không có con vật (trang thử) thì kéo dài đường gáy → lưng.
    const R = c.pet ? c.spot('rump49b', 'petStand49b', 1) : { x: B.x + (B.x - Sc.x) * 0.8, y: B.y + 2 };
    const path = (u) => (u <= 1 ? { x: Sc.x + (B.x - Sc.x) * u, y: Sc.y + (B.y - Sc.y) * u } : { x: B.x + (R.x - B.x) * (u - 1), y: B.y + (R.y - B.y) * (u - 1) });
    const G = tool === 'scissors' ? 44 : 45, TIP = tool === 'scissors' ? SCISSORS_TIP49B - 2 : CLIPPER_TIP49B, [Vmin, Vmax] = RigSVG.TRIM_V49B, off = this._offHead49b(c);
    // Đường tỉa bắt đầu sau đầu con vật (thỏ: gáy khuất sau cái đầu to) — con vật xếp túm lông từ đúng chỗ ấy (`petTrimStart49b`).
    let V0 = Vmin;
    while (V0 < 1.2 && !off(path(V0))) V0 = +(V0 + 0.1).toFixed(2);
    // Dụng cụ CHÚC XUỐNG lưng từ trên (`armDown`, như máy quét chip): bàn tay ở trên lưng, không vắt ngang trước mặt con vật.
    const cut = (u, lift = 0) => { const q = path(u); return c.armDown(k, q.x, q.y + 1 - lift, TIP); };
    // Đường tỉa dừng ở chỗ xa nhất tay gần còn với tới (con vật dài, người thấp): con vật xếp túm lông trên đúng quãng ấy (`petTrimEnd49b`).
    let V1 = Vmax;
    while (V1 > 1.05 && cut(V1).short > 1) V1 = +(V1 - 0.1).toFixed(2);
    let spun = +s['gadgetTurn' + k] || 0;          // góc xoay dụng cụ liên tục (như `blowDry`)
    const turnTo = (spin) => (spun += chuanHoaGoc(spin - spun));
    const go = (side, p, at, d, ease = 'sine.inOut') => t.to(s, { ['bat' + side]: p.bat, ['cang' + side]: p.cang, ...(p.spin !== undefined ? { ['gadgetTurn' + side]: turnTo(p.spin) } : {}), duration: d, ease }, at);
    // Tay xa đỡ SƯỜN sau giữa lưng; không với tới (con vật nhỏ dưới sàn, người quỳ ở phía đầu nó: tay xa vắt qua đầu nó) thì đỡ giữa sườn, rồi úp
    // trên VAI nó (trên lưng, sau gáy), cuối cùng đỡ NGỰC — không để bàn tay duỗi hết cỡ mà dừng trước mặt nó.
    const steady = [[B.x + (R.x - B.x) * 0.15, B.y + 14], [B.x, B.y + 12], ...[1.2, 1.0, 0.85, 0.7].map((u) => [path(u).x, path(u).y + 3])].filter(([x, y]) => off({ x, y })).concat([[off.chest.x, off.chest.y]]).map(([x, y]) => c.arm(o, x, y, 15));
    const qo = [1.05, 0.85, 0.7, 1.3].map((u) => path(u)).find((q) => off(q) && !(c.arm(o, q.x, q.y + 3, 15).short > 1)) || { x: off.chest.x, y: off.chest.y - 3 }, flank = steady.find((p) => !(p.short > 1)) || steady[steady.length - 1] || c.arm(o, B.x, B.y + 12, 15);
    const ringO = [0, 1, 2, 3].map((n) => c.arm(o, qo.x - Math.cos(n * Math.PI / 2) * 4, qo.y + 3 - Math.sin(n * Math.PI / 2) * 3, 15)), ro = (n) => ringO[n % 4];
    const C0 = 1.0, U = C0 + hold, total = U + 1.9;
    // 0. Dụng cụ hiện trong tay gần, giơ trên gáy; tay xa tới lưng; lông cũ (lần tỉa trước) trả về chưa tỉa.
    const ready = cut(V0, 10);
    t.to(s, { ['bat' + k]: ready.bat, ['cang' + k]: ready.cang, ['gadgetTurn' + k]: turnTo(ready.spin), ['bat' + o]: ro(0).bat, ['cang' + o]: ro(0).cang, dauY: 8, cuoi: 0.6, chum: 0.15, mayL: 0.3, mayR: 0.3, duration: 0.5, ease: 'power2.out' }, 0.05);
    t.set(s, { ['gadget' + k]: G, ['snip49b' + k]: 0, ['buzz49b' + k]: 0, ['tay' + o]: 'xoe', petShag49b: 0, petCutT49b: 0, petCutDur49b: hold, petTrimStart49b: V0, petTrimEnd49b: V1 }, 0.02);
    t.fromTo(s, { groomT49b: 0 }, { groomT49b: total, duration: total, ease: 'none', immediateRender: false }, 0);
    if (c.pet) { (this.caring || (this.caring = new Set())).add(c.pet); t.to(s, { onTopL: 1, onTopR: 1, careFront: 1, duration: 0.02 }, 0.12); }
    c.look(qo, 0.05, { d: 0.45 });
    t.to(s, { petStand49b: 1, duration: 0.45, ease: 'sine.inOut' }, 0.05);
    // 1. VÒ XÙ: tay xa vòng nhỏ trên lưng, lông dài dựng lên thành túm.
    for (let a = 0.5, m = 1; a + 0.1 <= C0 - 0.2 + 1e-6; a += 0.1, m++) { const po = ro(m); t.to(s, { ['bat' + o]: po.bat, ['cang' + o]: po.cang, duration: 0.1, ease: 'none' }, a); }
    t.to(s, { petShag49b: 1, duration: 0.45, ease: 'sine.out' }, 0.45);
    t.to(s, { petMood42f: 0.35, duration: 0.5 }, 0.6);
    // 2. TỈA: tay xa đỡ sườn; dụng cụ dọc lưng từ gáy về mông, túm lông rụng theo `petCutT49b` (đi thẳng theo giây — con vật tính lúc từng túm rụng).
    go(o, flank, C0 - 0.2, 0.3);
    go(k, cut(V0), C0 - 0.3, 0.3);
    c.look(path(0.6), C0 - 0.2, { d: 0.4 });
    t.fromTo(s, { petCutT49b: 0 }, { petCutT49b: hold + RigSVG.TRIM_FALL49B, duration: hold + RigSVG.TRIM_FALL49B, ease: 'none', immediateRender: false }, C0);
    const beat = tool === 'scissors' ? 0.3 : 0.25, n = Math.max(3, Math.round(hold / beat)), per = hold / n;
    for (let i = 0; i < n; i++) {
      const a = C0 + i * per, u = V0 + (V1 - V0) * (i + 1) / n;
      if (tool === 'scissors') {
        // kéo mở (lùi nhẹ khỏi lông), tiến tới chỗ kế, khép — một nhát
        go(k, cut(u - (V1 - V0) * 0.5 / n, 1.5), a, per * 0.5);
        t.to(s, { ['snip49b' + k]: 1, duration: per * 0.4, ease: 'sine.out' }, a);
        go(k, cut(u), a + per * 0.5, per * 0.5);
        t.to(s, { ['snip49b' + k]: 0, duration: per * 0.35, ease: 'power2.in' }, a + per * 0.55);
      } else go(k, cut(u, i % 2 ? 0.8 : 0), a, per, 'none');
      if (i % 4 === 1) c.look(path(u), a, { d: 0.3 });
    }
    if (tool === 'clipper') { t.to(s, { ['buzz49b' + k]: 1, duration: 0.12 }, C0 - 0.15); t.to(s, { ['buzz49b' + k]: 0, duration: 0.12 }, U); }
    // 3. Xong: nhấc dụng cụ, cất (tay về hông), buông; nhìn mặt nó, cười, gật — lưng gọn.
    go(k, cut(V1, 10), U + 0.02, 0.25);
    t.to(s, { ['bat' + k]: N['bat' + k], ['cang' + k]: N['cang' + k], ['aim' + k]: 0, ['gadgetTurn' + k]: spun - chuanHoaGoc(spun), duration: 0.35, ease: 'power2.inOut' }, U + 0.3);
    t.to(s, { ['bat' + o]: N['bat' + o], ['cang' + o]: N['cang' + o], ['aim' + o]: 0, duration: 0.4, ease: 'power2.inOut' }, U + 0.2);
    t.set(s, { ['gadget' + k]: 0, ['snip49b' + k]: 0, ['tay' + k]: 'mo', ['tay' + o]: 'mo' }, U + 0.66);
    if (c.pet) t.to(s, { onTopL: 0, onTopR: 0, careFront: 0, duration: 0.02 }, U + 0.55);
    t.to(s, { petMood42f: 0.9, duration: 0.35, ease: 'sine.out' }, U + 0.4);
    t.to(s, { petStand49b: 0, duration: 0.5, ease: 'sine.inOut' }, U + 0.7);
    c.look(E, U + 0.45, { d: 0.35 });
    t.to(s, { cuoi: 1, mieng: 0.3, mayL: 0.7, mayR: 0.7, chum: 0, duration: 0.3 }, U + 0.55);
    t.to(s, { dauY: 13, duration: 0.2, ease: 'sine.out', yoyo: true, repeat: 1 }, U + 1.0);
    this._khep(t, 0.5, U + 1.4, { ...c.keep, ...(c.pet ? { petShag49b: 1, petCutT49b: hold + RigSVG.TRIM_FALL49B, petCutDur49b: hold, petTrimStart49b: V0, petTrimEnd49b: V1 } : { petShag49b: 0, petCutT49b: 0, petCutDur49b: 0 }) });
    return t;
  }
});
