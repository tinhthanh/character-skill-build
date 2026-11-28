// runtime/person/care.js — pet care at the table: examine, treat, brush, bath / teeth / towel, leash, listen, inject, weigh.
// Methods of `RigSVG`, installed by runtime/rig-svg.js: `this` is the rig, `RigSVG` its class.

import { KHUNG, DOI_Y, HONG, DAI, LOOK_DOWN, SPRAY_LEN42F, clamp, chuanHoaGoc, mix } from './shared.js';
import { leash } from '../parts.js';

export default (RigSVG) => mix(RigSVG, class {
  /**
   * KHÁM BẰNG ĐÈN SOI: cúi xuống, đưa cây đèn soi (hiện ra trong tay) tới `part` của con vật `target` — 'ears' (tai,
   * mặc định), 'eyes' (mắt), 'teeth' (răng: soi vào mõm; cho con vật `openMouth` cùng lúc) — soi hai chỗ, đầu nghiêng
   * nhìn kỹ, rồi gật.
   */
  examine(target = null, part = 'ears', hold = 1.4) {
    const spot = { ears: 'head', eyes: 'eyes', teeth: 'mouth' }[part];
    if (!spot) throw new Error(`[character] examine: part must be 'ears', 'eyes' or 'teeth', got ${JSON.stringify(part)}`);
    const t = this.tl(), s = this.s, N = this.NGHI, reach = this._reachLow(target, null, spot), { k, upper, fore } = reach, m = k === 'L' ? -1 : 1;
    this._leanTo(t, reach, 'nam');
    t.set(s, { ['gadget' + k]: 1 }, 0.1);
    t.to(s, { dau: N.dau + m * 6 + reach.lean * 0.8, dauY: 9, mayL: 0.2, mayR: 0.2, cuoi: 0.45, chum: 0.25, duration: 0.35, ease: 'sine.inOut' }, 0.45);
    // Đợt 37: ĐẦU quay / cúi về chỗ đang soi (tai, mắt, mõm), không chỉ con ngươi — cảnh thử: bác sĩ cười nhìn thẳng ra máy quay
    // trong lúc soi tai.
    this._lookTo(t, { x: reach.tx, y: reach.ty }, 0.4, { d: 0.4 });
    // Soi chỗ thứ nhất, nhích đèn sang chỗ thứ hai, rồi gật: "ổn".
    t.to(s, { ['bat' + k]: upper + 3, ['cang' + k]: fore - 5, duration: 0.25, ease: 'sine.inOut' }, 0.5 + hold * 0.45);
    t.to(s, { ['bat' + k]: upper, ['cang' + k]: fore, duration: 0.25, ease: 'sine.inOut' }, 0.5 + hold * 0.8);
    t.to(s, { dauY: 12, cuoi: 0.9, chum: 0, mayL: 0.5, mayR: 0.5, duration: 0.18, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.5 + hold);
    this._khep(t, 0.5, 0.9 + hold);
    return t;
  }

  /**
   * CHO ĂN BÁNH THƯỞNG: cúi xuống, chìa cái bánh xương (hiện ra trong tay) tới MÕM con vật `target`, đợi nó đớp (bánh
   * biến mất), cười rồi thu tay về. Cho con vật `beg` rồi `eat` cùng lúc trong một `together`. `{ kind: 'pill' }`: cho
   * uống một VIÊN THUỐC thay cho bánh.
   */
  giveTreat(target = null, { kind = 'treat' } = {}) {
    if (kind !== 'treat' && kind !== 'pill') throw new Error(`[character] giveTreat: kind must be 'treat' or 'pill', got ${JSON.stringify(kind)}`);
    const t = this.tl(), s = this.s, N = this.NGHI, reach = this._reachLow(target, null, 'mouth'), { k, upper, fore } = reach;
    this._leanTo(t, reach, 'nam');
    t.set(s, { ['gadget' + k]: kind === 'pill' ? 3 : 2 }, 0.05);
    t.to(s, { cuoi: 1, mieng: 0.25, mayL: 0.6, mayR: 0.6, duration: 0.3 }, 0.4);
    // Chìa tới thêm một chút, con vật đớp (bánh mất), tay rụt lại một nhịp.
    t.to(s, { ['bat' + k]: upper + 3, ['cang' + k]: fore - 4, duration: 0.25, ease: 'sine.out' }, 0.6);
    t.set(s, { ['gadget' + k]: 0 }, 1.05);
    t.to(s, { ['bat' + k]: upper - 4, ['cang' + k]: fore + 6, dauY: N.dauY + 3, duration: 0.18, ease: 'power2.out' }, 1.05);
    this._khep(t, 0.5, 1.4);
    return t;
  }

  /**
   * CHÌA TAY cho con vật (đợt 35): cúi xuống, đưa bàn tay mở ra trước mõm `target`, ngay dưới ĐẦU LƯỠI nó lúc liếm (`lickPoint()`) và giữ `hold` giây — cho nó
   * ngửi, liếm (`lick` của rig thú, tools/scene.py tự ghép), cười; bàn tay nhích nhẹ như bị liếm nhột. Rồi rụt về.
   */
  offerHand(target = null, hold = 1.6) {
    const t = this.tl(), s = this.s, reach = this._reachLow(target, null, 'tongue', 0.5), { k, upper, fore } = reach;
    this._leanTo(t, reach, 'xoe');
    t.to(s, { cuoi: 1, mieng: 0.3, mayL: 0.6, mayR: 0.6, duration: 0.3 }, 0.4);
    for (let a = 0.6, i = 0; a + 0.3 <= 0.6 + hold; a += 0.3, i++) t.to(s, { ['bat' + k]: upper + (i % 2 ? -0.5 : 0.5), ['cang' + k]: fore + (i % 2 ? 0.7 : -0.7), duration: 0.3, ease: 'sine.inOut' }, a);      // nhột khẽ — nhích nhiều thì tay rời đầu lưỡi
    this._khep(t, 0.5, 0.6 + hold);
    return t;
  }

  /**
   * GHÉ MÁ cho con vật đang bế liếm (đợt 35, lượt hai): cúi đầu xuống, nghiêng má về phía nó, mắt nhắm híp cười, `hold` giây — đi
   * cặp với `lick(…, { face: true })` của con vật trong tay (tools/scene.py tự thêm). Hai tay vẫn ôm.
   */
  offerCheek(hold = 1.8) {
    const t = this.tl(), s = this.s, N = this.NGHI;
    t.to(s, { dauY: N.dauY + 9, dau: N.dau + 12, dauX: N.dauX + 3, matY: 0.7, nhinY: 1.5, cuoi: 1, mieng: 0.35, duration: 0.35, ease: 'power2.out' }, 0);
    for (let a = 0.4, i = 0; a + 0.4 <= 0.35 + hold; a += 0.4, i++) t.to(s, { dau: N.dau + (i % 2 ? 12 : 9), duration: 0.4, ease: 'sine.inOut' }, a);
    this._khep(t, 0.45, 0.35 + hold);
    return t;
  }

  /**
   * CHẢI LÔNG: cúi xuống, cây lược hiện trong tay, chải dọc lưng con vật `target` bốn đường dài, cười — dịch vụ grooming.
   */
  brush(target = null, strokes = 4) {
    const t = this.tl(), s = this.s, reach = this._reachLow(target, null, 'body'), { k, upper, fore } = reach;
    this._leanTo(t, reach, 'nam');
    t.set(s, { ['gadget' + k]: 4 }, 0.1);
    for (let n = 0; n < strokes; n++) {
      t.to(s, { ['bat' + k]: upper + 7, ['cang' + k]: fore - 6, duration: 0.24, ease: 'sine.inOut' }, 0.48 + n * 0.42)
       .to(s, { ['bat' + k]: upper - 4, ['cang' + k]: fore + 8, duration: 0.18, ease: 'sine.inOut' }, 0.72 + n * 0.42);
    }
    this._chop(t, 1.0);
    this._khep(t, 0.5, 0.5 + strokes * 0.42);
    return t;
  }

  static BATH_SPRAY42F = 1.6;      // giây xối nước (ướt lông)
  static BATH_RINSE42F = 1.5;      // giây xả bọt
  static BATH_BACK42F = 34;        // lùi ra bấy nhiêu đơn vị khung trước khi con vật rũ nước
  static SHOWER_DIP42F = 68;       // vòi sen chĩa xuống chừng ấy độ dưới phương ngang, về phía con vật
  static SHOWER_AT42F = 33;        // mặt vòi sen cách cổ tay bấy nhiêu đơn vị khung theo bàn tay (gadget 40)
  static BRUSH_AT42F = 39;         // giữa đầu bàn chải (gadget 41) …
  static TOWEL_AT42F = 26;         // giữa khăn vắt trên tay (gadget 42) …
  /** Giây (tính từ đầu bước `bathPet`) con vật bắt đầu RŨ NƯỚC — người đã lùi ra (con vật tự rũ theo kênh `petShake42f` của người). */
  static bathShakeAt42f(hold = 1.8) { return +(0.55 + RigSVG.BATH_SPRAY42F + 0.55 + 0.35 + hold + 0.75 + RigSVG.BATH_RINSE42F + 1.2).toFixed(2); }

  // Vẽ theo trạng thái (gọi trong `apDung`): tia nước của vòi sen (`spray42f`, chảy theo `sprayT42f`), bọt trên đầu bàn chải (`foam`).
  _drawBathTools() {
    const e = this.el, s = this.s;
    for (const side of ['L', 'R']) {
      const box = e['gadget' + side], kind = Math.round(s['gadget' + side]);
      if (!box || kind < 40 || kind > 42) continue;
      const tool = [...box.children].find((child) => +child.getAttribute('data-gadget') === kind);
      if (!tool) continue;
      if (kind === 40) {
        const jet = tool.querySelector('[data-spray42f]'), v = clamp(+s['spray42f' + side] || 0, 0, 1);
        if (jet) {
          jet.style.display = v > 0.03 ? '' : 'none';
          if (v > 0.03) {
            jet.setAttribute('opacity', Math.min(1, v * 1.4).toFixed(2));
            const flow = (-(+s.sprayT42f || 0) * 24).toFixed(1);
            for (const path of jet.querySelectorAll('[data-jet]')) path.setAttribute('stroke-dashoffset', flow);
          }
        }
      }
      if (kind === 41) { const foam = tool.querySelector('[data-foam42f]'), v = clamp(+s.foam || 0, 0, 1); if (foam) { foam.style.display = v > 0.05 ? '' : 'none'; foam.setAttribute('opacity', v.toFixed(2)); } }
    }
    for (const pet of this.held38 || []) if (pet.el && !(this.caring && this.caring.has(pet))) pet.apDung();
  }

  /** Số đo cho tools/acting_check.py (đợt 42 F, `set.careProbe` → `c42`): dụng cụ 40–42 đang cầm (phần tử), tia nước, đầu bàn chải, bọt trên tay. */
  care42fProbe() {
    const e = this.el, s = this.s, side = ['L', 'R'].find((k) => Math.round(s['gadget' + k]) >= 40 && Math.round(s['gadget' + k]) <= 42) || null;
    const kind = side ? Math.round(s['gadget' + side]) : 0, tool = side ? [...e['gadget' + side].children].find((child) => +child.getAttribute('data-gadget') === kind) : null;
    const jet = tool && kind === 40 ? tool.querySelector('[data-spray42f]') : null, foamSides = ['L', 'R'].filter((k) => Math.round(s['gadget' + k]) === 14);
    let end = null;
    if (jet && jet.style.display !== 'none' && tool.getScreenCTM()) { const q = new DOMPoint(0, 36 + SPRAY_LEN42F).matrixTransform(tool.getScreenCTM()); end = { x: q.x, y: q.y, px: true }; }
    return { kind, side, tool, spray: jet && jet.style.display !== 'none' ? jet : null, sprayEnd: end, head: tool && kind === 41 ? tool.querySelector('rect:nth-of-type(3)') : null,
             foamHands: foamSides.length, sprayLevel: side ? +clamp(+s['spray42f' + side] || 0, 0, 1).toFixed(3) : 0 };
  }

  /**
   * TẮM cho con vật `target` (đứng trong chậu tắm — đạo cụ `tub`): quay nghiêng về nó, một tay đặt lên sườn giữ yên, tay kia cầm VÒI SEN (hiện
   * trong tay) chúc xuống xối nước lên lưng — tia nước thấy rõ, lông ướt sẫm lại, con vật cụp tai khó chịu; treo vòi, HAI TAY xoa dầu tắm trên
   * lưng `hold` giây — bọt trắng nổi dần trên lưng (và trên hai bàn tay); lấy vòi xả sạch bọt; treo vòi, LÙI RA một bước — lúc ấy con vật
   * RŨ NƯỚC (như `shakeOff` của nó, từ `RigSVG.bathShakeAt42f(hold)` giây — kênh `petShake42f`, không cần bước riêng), người giơ tay che, cười. Lông còn ướt tới khi
   * `towelDry`. Đầu người quay / cúi về chỗ tay làm.
   */
  bathPet(target = null, { hold = 1.8 } = {}) {
    if (!(Number.isFinite(hold) && hold >= 1 && hold <= 6)) throw new Error(`[character] bathPet: hold must be 1…6 seconds of lathering, got ${JSON.stringify(hold)}`);
    const t = this.tl(), s = this.s, N = this.NGHI, c = this._care38(t, target, 'bathPet', 0.1), { k, o, dir } = c;
    const Sc = c.spot('scruff'), B = c.spot('back'), Hd = c.spot('crown'), fwd = Hd.x >= Sc.x ? 1 : -1;
    const along = (u, dy = 0) => ({ x: Sc.x + (B.x - fwd * 8 - Sc.x) * u, y: Sc.y + (B.y - Sc.y) * u + dy });
    // Vòi sen chĩa CHÉO XUỐNG lưng từ phía người (`SHOWER_DIP42F` dưới phương ngang): đầu tia nước tới lưng. Lòng bàn tay đặt sao cho trục vòi
    // (xoay quanh lòng bàn tay — `gadgetTurn`) đúng hướng ấy. (Chúc thẳng đứng như lọ nhỏ mắt thì với con vật thấp, người thấp, cổ tay phải
    // cao ngang vai — tay không giải được, vòi chĩa ngang.)
    const dip = RigSVG.SHOWER_DIP42F * Math.PI / 180, v = { x: dir * Math.cos(dip), y: Math.sin(dip) }, cB = c.hand;
    const aim = (q, lift = 0) => {
      const end = (36 + SPRAY_LEN42F) * cB, palm = { x: q.x - v.x * (end - 10 * cB), y: q.y - lift - v.y * (end - 10 * cB) };
      const p = c.arm(k, palm.x, palm.y, 10);
      const fore = k === 'R' ? 90 - p.bat - p.cang : 90 + p.bat + p.cang;           // hướng cẳng tay trên màn hình theo đúng góc đã giải (kênh `aim`)
      const turn = chuanHoaGoc(Math.atan2(v.y, v.x) * 180 / Math.PI - fore);
      return { ...p, spin: k === 'R' ? turn : -turn };
    };
    const shower = (u) => aim(along(u));
    const flank = c.arm(o, B.x - fwd * 6, B.y + 13, 15);           // lòng bàn tay úp bên sườn, trên vành chậu
    const atHip = { ['bat' + k]: N['bat' + k], ['cang' + k]: N['cang' + k], ['aim' + k]: 0, ['gadgetTurn' + k]: 0 };
    const go = (side, p, at, d, extra = {}) => t.to(s, { ['bat' + side]: p.bat, ['cang' + side]: p.cang, ...(p.spin !== undefined ? { ['gadgetTurn' + side]: p.spin } : {}), ...extra, duration: d, ease: 'sine.inOut' }, at);
    const toolAt = (p) => ({ x: p.wx + p.u.x * 10 * cB + v.x * (RigSVG.SHOWER_AT42F - 10) * cB, y: p.wy + p.u.y * 10 * cB + v.y * (RigSVG.SHOWER_AT42F - 10) * cB });
    // 0. Tay xa đặt lên sườn, vòi sen hiện trong tay gần, chúc xuống trên gáy.
    const ready = aim(along(0.35), 12);
    go(k, ready, 0.05, 0.5, { ['bat' + o]: flank.bat, ['cang' + o]: flank.cang, dauY: 8, cuoi: 0.55, chum: 0.15, mayL: 0.3, mayR: 0.3 });
    t.set(s, { ['gadget' + k]: 40, ['spray42f' + k]: 0, sprayT42f: 0, petDry42f: 0, ['tay' + o]: 'xoe' }, 0.1);
    // Bối cảnh 3D: con vật vẽ TRƯỚC người (như `scanChip`) — cánh tay vươn qua đầu nó tới lưng nằm sau nó, hai bàn tay (bản chép) vẽ trên nó.
    const front = (on, at) => { if (c.pet) t.to(s, { onTopL: on, onTopR: on, careFront: on, duration: 0.02 }, at); };
    if (c.pet) (this.caring || (this.caring = new Set())).add(c.pet);
    front(1, 0.12);
    c.look(along(0.3), 0.05, { d: 0.45 });
    // 1. XỐI NƯỚC: tia nước lên lưng, rà từ gáy về giữa lưng rồi lại; lông ướt dần, con vật cụp tai.
    const W = 0.55, E1 = W + RigSVG.BATH_SPRAY42F;
    t.to(s, { ['spray42f' + k]: 1, duration: 0.15, ease: 'sine.out' }, W);
    t.to(s, { sprayT42f: E1 * 3, duration: E1, ease: 'none' }, 0);
    go(k, shower(0.35), W, 0.25); go(k, shower(0.95), W + 0.25, 0.7); go(k, shower(0.5), W + 0.95, 0.6);
    c.look(toolAt(shower(0.5)), W + 0.2, { d: 0.6 });
    t.to(s, { petWet42f: 1, duration: 1.2, ease: 'sine.in' }, W + 0.15);
    t.to(s, { petMood42f: -1, duration: 0.3, ease: 'power2.out' }, W + 0.25);
    t.to(s, { ['spray42f' + k]: 0, duration: 0.15, ease: 'sine.in' }, E1);
    // 2. Treo vòi (tay về hông), HAI TAY xoa dầu tắm trên lưng: bọt nổi dần trên lưng và hai bàn tay.
    go(k, ready, E1 + 0.05, 0.2);
    t.to(s, { ...atHip, duration: 0.3, ease: 'power2.inOut' }, E1 + 0.2);
    t.set(s, { ['gadget' + k]: 0, ['tay' + k]: 'xoe' }, E1 + 0.5);
    const qk = along(0.4), qo = along(0.95), L0 = E1 + 0.55;          // xa đầu con vật: bàn tay đầy bọt không che mặt nó
    const ring = (side, q, sign, dy) => [0, 1, 2, 3].map((n) => c.arm(side, q.x + sign * Math.cos(n * Math.PI / 2) * 4, q.y + dy + sign * Math.sin(n * Math.PI / 2) * 2.5, 15));
    const ringK = ring(k, qk, 1, 3), ringO = ring(o, qo, -1, 4), Lk = (q, n) => ringK[n % 4], Lo = (q, n) => ringO[n % 4];
    go(k, Lk(qk, 0), L0, 0.35, { ['aim' + k]: 1, ['bat' + o]: Lo(qo, 0).bat, ['cang' + o]: Lo(qo, 0).cang });
    c.look(along(0.65), L0, { d: 0.35 });
    const R0 = L0 + 0.35 + hold;
    t.set(s, { gadgetL: 14, gadgetR: 14, foam: 0.3 }, L0 + 0.3);
    t.to(s, { foam: 0.55, duration: 0.5, ease: 'sine.out' }, L0 + 0.3);         // bọt trên tay nhỏ hơn rửa tay: không che lưng con vật
    t.to(s, { petFoam42f: 1, duration: hold, ease: 'sine.out' }, L0 + 0.35);
    for (let a = L0 + 0.35, n = 1; a + 0.1 <= R0 - 0.05; a += 0.1, n++) { const d = Math.min(0.1, R0 - a); const pk = Lk(qk, n), po = Lo(qo, n); t.to(s, { ['bat' + k]: pk.bat, ['cang' + k]: pk.cang, ['bat' + o]: po.bat, ['cang' + o]: po.cang, duration: d, ease: 'none' }, a); }
    t.to(s, { petMood42f: -0.6, duration: 0.4 }, L0 + 0.6);
    // 3. XẢ: tay gần về hông lấy lại vòi (bọt trên tay ấy chùi đi), tay xa vẫn trên lưng; xối từ gáy về giữa lưng — bọt tan dần.
    t.to(s, { ...atHip, duration: 0.3, ease: 'power2.inOut' }, R0);
    t.set(s, { ['gadget' + k]: 40, ['tay' + k]: 'nam', ['spray42f' + k]: 0 }, R0 + 0.32);
    go(k, ready, R0 + 0.35, 0.35, { ['aim' + k]: 1, ['bat' + o]: flank.bat, ['cang' + o]: flank.cang });
    const W2 = R0 + 0.75, E2 = W2 + RigSVG.BATH_RINSE42F;
    t.to(s, { ['spray42f' + k]: 1, duration: 0.15, ease: 'sine.out' }, W2);
    t.to(s, { sprayT42f: RigSVG.BATH_RINSE42F * 3 + 2, duration: RigSVG.BATH_RINSE42F, ease: 'none' }, W2);
    go(k, shower(0.35), W2, 0.2); go(k, shower(0.95), W2 + 0.2, 0.7); go(k, shower(0.55), W2 + 0.9, RigSVG.BATH_RINSE42F - 0.9);
    c.look(toolAt(shower(0.5)), W2 + 0.1, { d: 0.5 });
    t.to(s, { petFoam42f: 0, duration: RigSVG.BATH_RINSE42F - 0.2, ease: 'sine.inOut' }, W2 + 0.1);
    t.to(s, { foam: 0, duration: RigSVG.BATH_RINSE42F - 0.3, ease: 'sine.inOut' }, W2 + 0.1);
    t.set(s, { ['gadget' + o]: 0 }, E2 - 0.15);
    t.to(s, { ['spray42f' + k]: 0, duration: 0.15, ease: 'sine.in' }, E2);
    // 4. Treo vòi, buông con vật, LÙI RA một bước; con vật rũ nước (`shakeOff` của nó, từ SH) — người giơ hai tay che, nheo mắt cười.
    go(k, ready, E2 + 0.05, 0.2);
    t.to(s, { ...atHip, ['bat' + o]: N['bat' + o], ['cang' + o]: N['cang' + o], ['aim' + o]: 0, duration: 0.35, ease: 'power2.inOut' }, E2 + 0.2);
    t.set(s, { ['gadget' + k]: 0, ['tay' + k]: 'mo', ['tay' + o]: 'mo', foam: 0 }, E2 + 0.5);
    front(0, E2 + 0.5);
    // Không có con vật (đích là một điểm / null — trang thử): diễn tại chỗ, không lùi, không giữ lông ướt.
    const SH = RigSVG.bathShakeAt42f(hold), x0 = s.x, back = c.pet ? x0 - dir * RigSVG.BATH_BACK42F : x0;
    let at = E2 + 0.45;
    t.to(s, { seat: 0, huong: dir * 0.55, duration: 0.3, ease: 'sine.inOut' }, at);
    at = this._dam(t, at, 0.34, 'R', 0, 0.6); at = this._dam(t, at, 0.34, 'L', 0, 0.6);
    if (c.pet) t.to(s, { x: back, duration: 0.68, ease: 'sine.inOut' }, E2 + 0.45);
    const face = c.spot('eye');
    this._lookTo(t, face, SH - 0.3, { d: 0.3, huong: dir * 0.55 });
    t.to(s, { batL: 30, cangL: -95, batR: 30, cangR: -95, aimL: 0, aimR: 0, tayL: 'xoe', tayR: 'xoe', cuoi: 1, mieng: 0.45, matY: 0.55, mayL: 0.8, mayR: 0.8, dauY: 3, duration: 0.25, ease: 'power2.out' }, SH);
    t.fromTo(s, { petShake42f: 0 }, { petShake42f: 1, duration: 1.0, ease: 'none', immediateRender: false }, SH);      // con vật RŨ NƯỚC (RigThu.SHAKE_DUR42F)
    t.set(s, { petShake42f: 0 }, SH + 1.02);
    t.to(s, { petMood42f: -0.2, duration: 0.3 }, SH + 0.2);
    t.to(s, { matY: 0.1, mieng: 0.3, duration: 0.25 }, SH + 1.0);
    this._khep(t, 0.5, SH + 1.35, { ...c.keep, ...(c.pet ? { x: back, petWet42f: 1, petDry42f: 0 } : { petWet42f: 0 }) });
    return t;
  }

  /**
   * ĐÁNH RĂNG cho con vật `target`: quay nghiêng về nó; tay xa NÂNG MÕM (giữ dưới cằm, vén môi — miệng nó hé ra, thấy răng), tay gần đưa bàn
   * chải đánh răng (hiện trong tay) vào răng, chải những đường ngắn dọc hàm `hold` giây — vài bọt trắng trên đầu bàn chải. Rút bàn chải, cất (tay
   * về hông), buông mõm — con vật LIẾM MÉP hai cái. Người cười, nhìn nó.
   */
  brushTeeth(target = null, { hold = 2 } = {}) {
    if (!(Number.isFinite(hold) && hold >= 0.8 && hold <= 6)) throw new Error(`[character] brushTeeth: hold must be 0.8…6 seconds of brushing, got ${JSON.stringify(hold)}`);
    const t = this.tl(), s = this.s, N = this.NGHI, c = this._care38(t, target, 'brushTeeth'), { k, o, dir } = c;
    const C0 = c.spot('chin'), E = c.spot('eye'), mouth = c.spot('mouth42f');
    // Môi về phía người: tâm mõm lệch về phía người một chút; bàn chải đặt ngang miệng, đầu chải ở đó.
    const hold0 = c.arm(o, C0.x, C0.y + 6, 16), hold1 = c.arm(o, C0.x, C0.y + 3, 16);
    const at = (dx) => c.arm(k, mouth.x + dx, mouth.y + 1, RigSVG.BRUSH_AT42F);
    const ready = c.arm(k, mouth.x - dir * 16, mouth.y - 10, RigSVG.BRUSH_AT42F);
    // 1. Tay xa tới dưới cằm, bàn chải hiện trong tay gần, sẵn ở cạnh mõm.
    t.to(s, { ['bat' + k]: ready.bat, ['cang' + k]: ready.cang, ['bat' + o]: hold0.bat, ['cang' + o]: hold0.cang, dauY: 8, cuoi: 0.6, chum: 0.2, mayL: 0.35, mayR: 0.35, duration: 0.5, ease: 'power2.out' }, 0.05);
    t.set(s, { ['gadget' + k]: 41, foam: 0, ['tay' + o]: 'xoe' }, 0.1);
    c.look(mouth, 0.05, { d: 0.45 });
    // 2. Nâng mõm, vén môi: miệng con vật hé ra (răng, lưỡi thấy được).
    t.to(s, { petGape42f: 0.42, ['bat' + o]: hold1.bat, ['cang' + o]: hold1.cang, duration: 0.35, ease: 'sine.out' }, 0.55);
    // 3. CHẢI: những đường ngắn dọc hàm (mỗi đường 0,26 s), bọt nổi trên đầu bàn chải.
    const B0 = 0.95, n = Math.max(3, Math.round(hold / 0.26)), per = hold / n;
    t.to(s, { ['bat' + k]: at(0).bat, ['cang' + k]: at(0).cang, duration: 0.3, ease: 'power2.out' }, 0.65);
    for (let i = 0; i < n; i++) { const p = at((i % 2 ? -1 : 1) * 5 * dir - (i % 4 < 2 ? 0 : 2) * dir); t.to(s, { ['bat' + k]: p.bat, ['cang' + k]: p.cang, duration: per, ease: 'sine.inOut' }, B0 + i * per); }
    t.to(s, { foam: 1, duration: 0.8, ease: 'sine.out' }, B0 + 0.1);
    t.to(s, { cuoi: 0.8, mieng: 0.2, duration: 0.3 }, B0 + 0.2);
    // 4. Rút bàn chải, cất (tay về hông), buông mõm; con vật liếm mép hai cái — không bàn tay nào ở đó.
    const e = B0 + hold;
    t.to(s, { ['bat' + k]: ready.bat, ['cang' + k]: ready.cang, mieng: 0, duration: 0.22, ease: 'power2.out' }, e);
    t.to(s, { ['bat' + k]: N['bat' + k], ['cang' + k]: N['cang' + k], ['aim' + k]: 0, duration: 0.35, ease: 'power2.inOut' }, e + 0.22);
    t.set(s, { ['gadget' + k]: 0, foam: 0, ['tay' + k]: 'mo' }, e + 0.55);
    t.to(s, { petGape42f: 0, duration: 0.25, ease: 'sine.in' }, e + 0.1);
    t.to(s, { ['bat' + o]: N['bat' + o], ['cang' + o]: N['cang' + o], ['aim' + o]: 0, duration: 0.4, ease: 'power2.inOut' }, e + 0.35);
    t.set(s, { ['tay' + o]: 'mo' }, e + 0.6);
    const lick = e + 0.8;
    t.to(s, { petLick42f: 1, duration: 0.18, ease: 'sine.out' }, lick).to(s, { petLick42f: 0.15, duration: 0.2, ease: 'sine.in' }, lick + 0.35)
     .to(s, { petLick42f: 1, duration: 0.18, ease: 'sine.out' }, lick + 0.6).to(s, { petLick42f: 0, duration: 0.25, ease: 'sine.in' }, lick + 0.95);
    c.look(E, e + 0.4, { d: 0.35 });
    t.to(s, { cuoi: 1, mieng: 0.3, mayL: 0.6, mayR: 0.6, chum: 0, duration: 0.3 }, e + 0.5);
    t.to(s, { dauY: 13, duration: 0.2, ease: 'sine.out', yoyo: true, repeat: 1 }, lick + 0.9);
    this._khep(t, 0.5, lick + 1.35, c.keep);
    return t;
  }

  /**
   * LAU KHÔ con vật `target` (vừa tắm): quay nghiêng về nó, tay gần mang chiếc KHĂN TẮM (hiện vắt trên tay) tới lưng nó — khăn mở ra, QUẤN quanh
   * thân —, HAI TAY chà trên khăn `hold` giây (khăn xô theo nhịp chà; lông khô dần, BÔNG lên: viền lông xù to ra); rồi một tay nhấc khăn lên (khăn về
   * tay), gấp vắt ở hông — con vật lông bông, vui. Đầu người nhìn chỗ đang lau, xong nhìn mặt nó, cười.
   */
  towelDry(target = null, { hold = 2.2 } = {}) {
    if (!(Number.isFinite(hold) && hold >= 1 && hold <= 6)) throw new Error(`[character] towelDry: hold must be 1…6 seconds of rubbing, got ${JSON.stringify(hold)}`);
    const t = this.tl(), s = this.s, N = this.NGHI, c = this._care38(t, target, 'towelDry'), { k, o, dir } = c;
    const Sc = c.spot('scruff'), B = c.spot('back'), Hd = c.spot('crown'), E = c.spot('eye'), fwd = Hd.x >= Sc.x ? 1 : -1;
    const along = (u, dy = 0) => ({ x: Sc.x + (B.x - fwd * 8 - Sc.x) * u, y: Sc.y + (B.y - Sc.y) * u + dy });
    const drape = along(0.4, -2), carry = c.arm(k, drape.x - fwd * 10, drape.y - 22, RigSVG.TOWEL_AT42F), lay = c.arm(k, drape.x, drape.y - 4, RigSVG.TOWEL_AT42F);
    const qk = along(0.15), qo = along(0.7);
    const ringK = [0, 1, 2, 3].map((n) => c.arm(k, qk.x + Math.cos(n * Math.PI / 2) * 5, qk.y + 3 + Math.sin(n * Math.PI / 2) * 3, 15));
    const ringO = [0, 1, 2, 3].map((n) => c.arm(o, qo.x - Math.cos(n * Math.PI / 2) * 5, qo.y + 4 - Math.sin(n * Math.PI / 2) * 3, 15));
    const rk = (n) => ringK[n % 4], ro = (n) => ringO[n % 4];
    // 1. Khăn hiện vắt trên tay gần, đưa tới trên lưng; tay xa đỡ sườn.
    t.to(s, { ['bat' + k]: carry.bat, ['cang' + k]: carry.cang, ['bat' + o]: ro(0).bat, ['cang' + o]: ro(0).cang, dauY: 8, cuoi: 0.7, chum: 0.1, mayL: 0.35, mayR: 0.35, duration: 0.5, ease: 'power2.out' }, 0.05);
    t.set(s, { ['gadget' + k]: 42, ['tay' + o]: 'xoe' }, 0.1);
    if (c.pet) { (this.caring || (this.caring = new Set())).add(c.pet); t.to(s, { onTopL: 1, onTopR: 1, careFront: 1, duration: 0.02 }, 0.12); }      // như `bathPet`
    c.look(drape, 0.05, { d: 0.45 });
    // 2. Đặt khăn lên lưng — khăn MỞ RA quấn quanh thân (cùng lúc khăn trên tay biến khỏi tay: nó đã ở trên con vật).
    t.to(s, { ['bat' + k]: lay.bat, ['cang' + k]: lay.cang, duration: 0.35, ease: 'sine.inOut' }, 0.6);
    t.set(s, { ['gadget' + k]: 0, petTowel42f: 0.05, ['tay' + k]: 'xoe' }, 0.95);
    t.to(s, { petTowel42f: 1, duration: 0.35, ease: 'power2.out' }, 0.95);
    // 3. CHÀ: hai bàn tay vòng tròn ngược nhau trên khăn, khăn xô theo; lông khô dần, bông lên.
    const R0 = 1.3, beat = 0.3;
    t.to(s, { ['bat' + k]: rk(0).bat, ['cang' + k]: rk(0).cang, duration: 0.3, ease: 'sine.inOut' }, 1.0);
    for (let a = R0, n = 1; a + 0.1 <= R0 + hold + 1e-6; a += 0.1, n++) {
      const pk = rk(n), po = ro(n);
      t.to(s, { ['bat' + k]: pk.bat, ['cang' + k]: pk.cang, ['bat' + o]: po.bat, ['cang' + o]: po.cang, petRub42f: Math.sin(n * Math.PI / 2), duration: 0.1, ease: 'none' }, a);
    }
    t.to(s, { petWet42f: 0, duration: hold, ease: 'sine.inOut' }, R0);
    t.to(s, { petDry42f: 1, duration: hold, ease: 'sine.in' }, R0 + 0.2);
    t.to(s, { petMood42f: 0.6, duration: 0.6 }, R0 + hold * 0.4);
    for (let a = R0 + beat; a < R0 + hold - 0.3; a += 1.1) t.to(s, { dau: N.dau + dir * 3, duration: 0.25, ease: 'sine.inOut', yoyo: true, repeat: 1 }, a);
    // 4. Nhấc khăn (về tay gần), gấp vắt ở hông; con vật lông bông, vui; nhìn mặt nó, cười.
    const U = R0 + hold;
    t.to(s, { ['bat' + k]: lay.bat, ['cang' + k]: lay.cang, petRub42f: 0, duration: 0.25, ease: 'sine.inOut' }, U);
    t.set(s, { ['tay' + k]: 'nam' }, U + 0.22);
    t.to(s, { petTowel42f: 0, duration: 0.2, ease: 'power2.in' }, U + 0.25);
    t.set(s, { ['gadget' + k]: 42 }, U + 0.4);
    t.to(s, { ['bat' + k]: carry.bat, ['cang' + k]: carry.cang, duration: 0.3, ease: 'power2.out' }, U + 0.4);
    t.to(s, { ['bat' + o]: N['bat' + o], ['cang' + o]: N['cang' + o], ['aim' + o]: 0, duration: 0.4, ease: 'power2.inOut' }, U + 0.35);
    t.to(s, { ['bat' + k]: N['bat' + k], ['cang' + k]: N['cang' + k], ['aim' + k]: 0, ['gadgetTurn' + k]: 0, duration: 0.4, ease: 'power2.inOut' }, U + 0.75);
    t.set(s, { ['gadget' + k]: 0, ['tay' + k]: 'mo', ['tay' + o]: 'mo' }, U + 1.15);
    if (c.pet) t.to(s, { onTopL: 0, onTopR: 0, careFront: 0, duration: 0.02 }, U + 0.8);
    t.to(s, { petMood42f: 1, duration: 0.35, ease: 'sine.out' }, U + 0.5);
    c.look(E, U + 0.5, { d: 0.35 });
    t.to(s, { cuoi: 1, mieng: 0.35, mayL: 0.7, mayR: 0.7, chum: 0, duration: 0.3 }, U + 0.6);
    t.to(s, { dauY: 13, duration: 0.2, ease: 'sine.out', yoyo: true, repeat: 1 }, U + 1.3);
    this._khep(t, 0.5, U + 1.9, { ...c.keep, petWet42f: 0, petDry42f: c.pet ? 1 : 0 });
    return t;
  }

  /**
   * DẮT con vật `pet` bằng dây: dây hiện ra từ quai dây trong tay (`items: { R: 'leash' }`) tới vòng cổ nó, và GIỮ (thế
   * dắt) — `walk` của người và của con vật trong một `together` là dắt nó đi dạo; dây bám theo cả hai. `unleash()` tháo dây.
   */
  leash(pet) {
    if (!pet || !pet.el || !pet.el.vong || pet instanceof RigSVG) throw new Error('[character] leash(pet): pet must be a pet rig (createPet(...).rig)');
    const s = this.s, k = ['R', 'L'].find((side) => this.holds[side] && s['item' + side] > 0.5 && this.el['item' + side].querySelector('[data-leash]'));
    if (!k) throw new Error('[character] leash: the character is not holding a leash — give it one: createCharacter(host, { id, items: { R: "leash" } })');
    const walking = this._leashNow49c() ? this._leashNow49c().pet : this.leashed;          // đợt 49 C
    if (walking && walking !== pet && s.leash >= 0.5) throw new Error('[character] leash: already walking another pet — unleash() first');
    this.leashed = pet; this.leashHand = k;
    pet.onDraw = () => this._drawLeash();
    const t = this.tl();
    if (s.leashPet49c) t.set(s, { leashPet49c: 0 }, 0);          // đợt 49 C: dây của lần dắt này, không phải con đã dắt bằng `walkOnLeash`
    // Cúi nhìn con vật, móc dây vào cổ nó (dây hiện), rồi đứng thẳng lên — vẫn giữ dây.
    t.to(s, { dauY: 6, nhinY: 2.2, cuoi: 0.9, duration: 0.3, ease: 'sine.out' }, 0);
    t.set(s, { leash: 1 }, 0.35);
    this._khep(t, 0.4, 0.55, { leash: 1 });
    return t;
  }

  /** THÁO DÂY con vật đang dắt (`leash`): dây biến mất, người về dáng nghỉ, vẫn cầm quai dây. */
  unleash() {
    if (!this.leashed || this.s.leash < 0.5) throw new Error('[character] unleash: the character is not walking a pet — leash(pet) first');
    const t = this.tl(), s = this.s;
    t.to(s, { dauY: 6, nhinY: 2.2, duration: 0.3, ease: 'sine.out' }, 0);
    t.set(s, { leash: 0 }, 0.35);
    this._khep(t, 0.4, 0.55, { leash: 0, leashRope49c: 0, leashPet49c: 0 });       // đợt 49 C: lần móc dây sau lại võng như cũ
    return t;
  }

  /**
   * NGHE TIM PHỔI: cúi xuống, áp mặt ống nghe (cầm trong tay, nối dây lên cổ) vào con vật `target`, giữ `hold` giây —
   * đầu nghiêng lắng nghe, mắt liếc lên, gật nhẹ — rồi thu tay về. Không cần cầm gì: ống nghe hiện ra trong tay lúc khám.
   */
  listen(target = null, hold = 1.6) {
    const t = this.tl(), s = this.s, N = this.NGHI, reach = this._reachLow(target, null, 'body'), { k, upper, fore } = reach, m = k === 'L' ? -1 : 1;
    this._leanTo(t, reach, 'nam');
    t.set(s, { ['tool' + k]: 1 }, 0.1);
    // Ấn nhẹ mặt ống nghe vào ngực con vật, rồi đứng yên nghe: đầu nghiêng, mắt liếc lên trời, mày nhíu nhẹ.
    t.to(s, { ['cang' + k]: fore - 4, ['bat' + k]: upper + 2, duration: 0.2, ease: 'sine.out' }, 0.45);
    t.to(s, { dau: N.dau + m * 8 + reach.lean * 0.8, nhinX: -m * 1.6, nhinY: -1.6, mayL: 0.15, mayR: 0.15, cuoi: 0.4, duration: 0.35, ease: 'sine.inOut' }, 0.6);
    // Dời ống nghe sang chỗ khác một lần ở giữa (nghe hai chỗ), rồi gật: "ổn".
    t.to(s, { ['bat' + k]: upper - 3, ['cang' + k]: fore + 4, duration: 0.25, ease: 'sine.inOut' }, 0.6 + hold * 0.5);
    t.to(s, { dauY: 10, cuoi: 0.9, mayL: 0.5, mayR: 0.5, duration: 0.18, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.6 + hold);
    this._khep(t, 0.5, 1.0 + hold);
    return t;
  }

  /**
   * TIÊM: tay cầm ống tiêm (`items: { R: 'syringe' }`) cúi xuống đưa mũi kim tới con vật `target`, ấn pít-tông, rút ra.
   * Mặt tập trung (mày nhíu, môi mím) rồi cười khi xong. Phải đang cầm ống tiêm.
   */
  inject(target = null) {
    const t = this.tl(), s = this.s, N = this.NGHI;
    // Ống tiêm đang CẤT (itemsHidden — tools/script.py giao sẵn cho người "tiêm"): lấy ra lúc tiêm, cất lại khi xong — cầm suốt
    // cảnh thì tay ấy bận, các động tác khác (khám, cho ăn) với không tới con vật (đợt 28, đo bằng tools/acting_check.py).
    const k = ['R', 'L'].find((side) => this.holds[side] && this.el['item' + side].querySelector('[data-syringe]'));
    if (!k) throw new Error('[character] inject: the character is not holding a syringe — give it one: createCharacter(host, { id, items: { R: "syringe" } })');
    const stowed = s['item' + k] < 0.5;
    if (stowed) t.to(s, { ['item' + k]: 1, duration: 0.15 }, 0);
    const reach = this._reachLow(target, k, 'body'), { upper, fore } = reach;
    // Con vật ở phía tay KIA: tay cầm ống tiêm phải vắt ngang qua bụng mà vẫn không tới — báo rõ thay vì diễn sai.
    if (reach.across) throw new Error(`[character] inject: the pet is on the ${k === 'R' ? 'left' : 'right'} but the syringe is in the ${k === 'R' ? 'right' : 'left'} hand — stand the pet on the ${k === 'R' ? 'right' : 'left'} of the character, or give the syringe to the other hand (items: { ${k === 'R' ? 'L' : 'R'}: "syringe" })`);
    t.to(s, { ['carry' + k]: 0, duration: 0.15 }, 0);
    this._leanTo(t, reach, 'nam');
    // Mũi kim chĩa vào con vật: nghiêng ống tiêm về phía nó (ống vẽ đứng, kim chúc xuống).
    t.to(s, { ['itemTilt' + k]: 35, duration: 0.4, ease: 'power2.out' }, 0.05);
    t.to(s, { mayL: 0.1, mayR: 0.1, cuoi: 0.2, chum: 0.3, duration: 0.25 }, 0.4);                 // tập trung
    // Đâm kim (cẳng tay nhích tới), ấn pít-tông (giữ), rút ra.
    t.to(s, { ['bat' + k]: upper + 3, ['cang' + k]: fore - 3, duration: 0.18, ease: 'power2.out' }, 0.55);
    t.to(s, { ['plunger' + k]: 1, duration: 0.7, ease: 'sine.inOut' }, 0.8);
    t.to(s, { ['bat' + k]: upper, ['cang' + k]: fore, duration: 0.2, ease: 'power2.in' }, 1.55);
    t.to(s, { cuoi: 0.95, chum: 0, mayL: 0.5, mayR: 0.5, duration: 0.25 }, 1.6);                 // xong rồi
    this._khep(t, 0.5, 1.85, { ['plunger' + k]: 0, ...(stowed ? { ['item' + k]: 0 } : {}) });
    return t;
  }

  /* ------------------------------------------------------------ ĐỢT 35: cân, đo nhiệt độ, cho uống thuốc
   * Ba động tác phòng khám có tay chạm con vật. Thẻ số đo (`readout`) là một màn hình số lớn vẽ ở gốc SVG của người — số
   * trên màn hình nhỏ của cân / nhiệt kế không đọc được ở cỡ trung cảnh.
   */
  static TEMP_POSE = [40, 145];            // giơ nhiệt kế lên SÁT MẶT, ngang cằm (khuỷu hạ sát sườn, cẳng tay gập dựng): đầu đo chĩa lên, thẻ số bên đầu
  static TEMP_SIDE = 0.6;                  // lúc đọc: tâm nhiệt kế cách tâm mặt bấy nhiêu bề ngang đầu, về phía con vật (lượt bốn)
  static TEMP_ZOOM = 2.0;                  // nhiệt kế phóng to lúc đọc
  static TEMP_TIP = 34;                    // đầu đo cách cổ tay (đơn vị khung) theo hướng bàn tay
  static TEMP_READ = 1.6;                  // giữ dáng đọc nhiệt kế bấy nhiêu giây (đợt 35, lượt ba: ≥ 1,2 s)
  static TEMP_TURN = 0.3;                  // lúc đọc: QUAY người / mặt 3/4 về phía nhiệt kế (chỉ liếc mắt thì ở góc trung không đọc ra)
  static WEIGH_READING = '4.2 kg';         // số cân khi không ai cho (`reading`), và cân không ghi số
  /** Số cân về không, giữ đơn vị và cách viết: '9.6 kg' → '0.0 kg', '12 kg' → '0 kg'. */
  static zeroReading(text) { return String(text).replace(/\d+(?:([.,])\d+)?/, (all, mark) => (mark ? '0' + mark + '0' : '0')); }

  // MÀN HÌNH CÂN (`weigh`): số cân khi con vật này đang nằm trên bệ (bế, chỗ "nhà" là bệ cân, đã hạ xuống quá nửa), không thì số 0.
  _drawScales() {
    if (!this.scaleShows) return;
    const s = this.s;
    for (const item of this.scaleShows) {
      const c = this._carriedNow(), on = c && c.pet === item.pet && s.om >= 0.5 && s.omScale >= 0.5 && s.omRise < 0.5;
      const want = on ? item.text : item.zero;
      if (item.el.textContent !== want) item.el.textContent = want;
    }
  }

  // Ghi một thẻ số đo, trả về số thứ tự của nó (giá trị `readoutN`).
  // Thẻ giống hệt đã có (`sequence()` dựng mỗi bước hai lần: bản nháp rồi bản thật) thì dùng lại số của nó.
  _reading(entry) {
    this.readings = this.readings || [];
    const key = JSON.stringify(entry), found = this.readings.findIndex((item) => JSON.stringify(item) === key);
    if (found >= 0) return found + 1;
    this.readings.push(entry);
    return this.readings.length;
  }

  // MẶT BỆ CÂN trong hệ gốc của SVG (khung 400 × 470): `{ x, y, text }`. `scale`: đạo cụ `createProp(…, 'scale')` (hay phần tử
  // chứa nó), một điểm `{ x, y }` trong khung (`set.targetPoint` — giữa mặt bệ), hay null: trên sàn, phía không có con vật.
  _scaleSpot(scale, petSide) {
    if (scale === null || scale === undefined) return { x: HONG.x - petSide * 125 + this.s.x, y: KHUNG.h - 12 - 17, text: null };
    if (typeof scale.x === 'number' && typeof scale.y === 'number' && !scale.nodeType) return { x: scale.x, y: scale.y, text: null };
    const svg = scale.svg || (scale.querySelector ? (scale.matches && scale.matches('svg[data-prop]') ? scale : scale.querySelector('svg[data-prop]')) : null);
    if (!svg || svg.getAttribute('data-prop') !== 'scale') throw new Error('[character] weigh(pet, scale): scale must be a "scale" prop (createProp(host, "scale")), the element holding it, or a point { x, y } in the 400 × 470 frame (the top of its platform)');
    const r = svg.getBoundingClientRect(), inv = this.svg.getScreenCTM().inverse();
    const top = new DOMPoint(r.left + r.width / 2, r.top + r.height * (458 - 17) / 470).matrixTransform(inv);
    const label = svg.querySelector('text');
    // Số GỐC của cân (`data-reading`): `weigh` ghi số 0 / số cân lên màn hình, đọc lại chữ đang hiện thì lần dựng sau thành '0.0 kg'.
    return { x: top.x, y: top.y, text: label ? label.getAttribute('data-reading') || label.textContent : null };
  }

  /**
   * CÂN con vật: cúi bế nó lên (như `carry`), đặt nó lên bệ cân `scale`, đứng thẳng lên nhìn xuống — một màn hình số lớn bật
   * lên trên con vật với số cân (`reading`, mặc định chữ trên cân hay '4.2 kg') —, gật, rồi bế nó về đặt lại đúng chỗ cũ.
   * `scale`: đạo cụ cân (`createProp(host, 'scale')`), hay `{ x, y }` (giữa mặt bệ, khung 400 × 470; trong bối cảnh 3D
   * `set.targetPoint(rig, [x, y, z])`). Cân và con vật phải trong tầm tay (như `carry`).
   */
  weigh(pet, scale = null, { reading = null, hold = 1.6, display = null } = {}) {
    if (!pet || !pet.svg || typeof pet.apDung !== 'function' || !pet.el || !pet.el.dau || pet instanceof RigSVG) throw new Error('[character] weigh(pet, scale): pet must be a pet rig (createPet(...).rig)');
    if (this.s.om >= 0.5) throw new Error('[character] weigh: already carrying a pet — putDown() first, or weigh it before picking it up');
    if (reading !== null && typeof reading !== 'string') throw new Error(`[character] weigh: reading must be a string such as '4.2 kg', got ${JSON.stringify(reading)}`);
    if (!(typeof hold === 'number' && hold > 0)) throw new Error(`[character] weigh: hold must be a number of seconds > 0, got ${JSON.stringify(hold)}`);
    const t = this.carry(pet), s = this.s, N = this.NGHI, home = this.carried.reach;
    let c = this.carried;
    // Đo con vật Ở NHÀ (carry vừa đưa nó về host): chân (đáy bàn chân), giữa thân, đỉnh đầu — trong hệ gốc của SVG này.
    const inv = this.svg.getScreenCTM().inverse(), root = (x, y) => new DOMPoint(x, y).matrixTransform(inv);
    const paws = ['tnBan', 'txBan', 'snBan', 'sxBan'].map((key) => pet.el[key]).filter(Boolean).map((el) => el.getBoundingClientRect()).filter((r) => r.height > 0);
    const frame = pet.svg.getBoundingClientRect(), bodyR = (pet.el.than || pet.svg).getBoundingClientRect(), headR = pet.el.dau.getBoundingClientRect();
    // Giữa con vật theo BỀ NGANG BỐN BÀN CHÂN (không theo thân): con corgi thân dài, đầu chìa trước — canh theo thân thì chân trước
    // thò khỏi mép bệ (Gemini, đợt 35).
    const feetY = root(0, paws.length ? Math.max(...paws.map((r) => r.bottom)) : frame.bottom).y, crown = root(0, Math.min(headR.top, bodyR.top)).y;
    const middle = paws.length ? (root(Math.min(...paws.map((r) => r.left)), 0).x + root(Math.max(...paws.map((r) => r.right)), 0).x) / 2 : root(bodyR.left + bodyR.width / 2, 0).x;
    const vb = pet.svg.viewBox && pet.svg.viewBox.baseVal;
    const offX = vb && vb.width ? ((pet.s.x || 0) + (typeof pet.dropX === 'function' ? pet.dropX() : 0)) * c.from.w / vb.width : 0, offY = vb && vb.height ? (pet.s.y || 0) * c.from.h / vb.height : 0;
    const side = home.tx >= HONG.x ? 1 : -1, spot = this._scaleSpot(scale, side);
    // Khung con vật trên cân: chân (hình chưa dời — trong tay người hình nó không dời theo bước đi) đứng giữa mặt bệ.
    const onScale0 = { x: spot.x - (middle - offX - c.from.x), y: spot.y - (feetY - offY - c.from.y) };
    // Lần bế này đã mang một cái cân KHÁC (cân lần hai cùng chỗ, trên cân khác — đợt 37): tách một mục riêng cho lần cân này.
    if (c.scale && (Math.abs(c.scale.x - onScale0.x) > 1e-6 || Math.abs(c.scale.y - onScale0.y) > 1e-6)) {
      const copy = { ...c };
      this.carriedList.push(copy); this.carried = copy; s.omSlot = this.carriedList.length - 1;
      t.set(s, { omSlot: s.omSlot }, 0);
      c = copy;
    }
    c.scale = onScale0;
    const n = this._reading({ text: reading || spot.text || RigSVG.WEIGH_READING, x: spot.x, y: c.scale.y + (crown - offY - c.from.y) - 8 });
    // MÀN HÌNH CỦA CÁI CÂN (đợt 35, lượt ba): '0.0 kg' khi trống, số cân khi con vật đứng trên bệ, về '0.0 kg' khi bế ra — rig ghi chữ
    // ấy mỗi lần vẽ (`_drawScales`). Cân là đạo cụ (`scale`) hay đưa riêng (`display`: bối cảnh 3D, `scale` là một điểm).
    const shown = display || (scale && (scale.svg || scale.querySelector) ? scale : null);
    const screen = shown && (shown.svg || shown).querySelector && (shown.svg || shown).querySelector('svg[data-prop="scale"] text, text');
    if (shown && !screen) throw new Error('[character] weigh: display must be a "scale" prop made with a reading (createProp(host, "scale", { reading: "0.0 kg" }))');
    if (screen) {
      if (!screen.hasAttribute('data-reading')) screen.setAttribute('data-reading', screen.textContent);
      const text = reading || spot.text || RigSVG.WEIGH_READING, zero = RigSVG.zeroReading(text);
      this.scaleShows = (this.scaleShows || []).filter((item) => item.el !== screen).concat([{ el: screen, pet, text, zero }]);
      if (screen.textContent !== zero) screen.textContent = zero;
    }
    // Tay tới THÂN con vật đứng trên cân — người QUỲ xuống (cân nằm trên sàn: đứng khuỵu nửa chừng thì tay chỉ tới ngang hông, con vật
    // tự trượt từ bụng xuống cân và ngược lại mà không có tay đỡ — Gemini, đợt 35). Góc tay tính ở dáng quỳ (`_reachLow` của người ngồi /
    // quỳ: vai đã hạ, thân cúi tới đích tối đa SEATED_LEAN).
    const was = { seat: s.seat, kneel: s.kneel };
    s.seat = 1; s.kneel = 1;
    const onScale = this._reachLow({ x: spot.x, y: spot.y - (feetY - crown) * 0.45 }, null, 'body');
    s.seat = was.seat; s.kneel = was.kneel;
    const other = onScale.k === 'L' ? 'R' : 'L', otherArm = onScale.bend ? -onScale.bend * 0.5 : onScale.upper * 0.6;
    const down = { seat: 1, kneel: 1, than: N.than - onScale.lean, dau: N.dau + onScale.lean * 0.8, dauY: 7, nhinY: 2.4, nhinX: clamp((onScale.tx - HONG.x) * 0.02, -3, 3) };
    const T1 = 1.6;
    // 1. Quỳ xuống, hạ con vật từ trước bụng xuống bệ cân CÙNG LÚC (tay sẵn ở dáng đặt — bị dáng ôm che lúc `omRise` = 1).
    t.to(s, { ['bat' + onScale.k]: onScale.upper, ['cang' + onScale.k]: onScale.fore, ['bat' + other]: otherArm, ['cang' + other]: -40, ['aim' + onScale.k]: 1, omScale: 1, duration: 0.02 }, T1);
    t.set(s, { tayL: 'xoe', tayR: 'xoe' }, T1 + 0.02);
    // Đợt 36: nhìn con vật (đầu quay / cúi tới chỗ nó trên bệ cân) lúc đặt nó xuống và lúc bế nó lên lại.
    s.seat = 1; s.kneel = 1;
    const kneelLook = this._lookAngles({ x: onScale.tx, y: onScale.ty });
    s.seat = was.seat; s.kneel = was.kneel;
    t.to(s, { ...kneelLook, duration: 0.6, ease: 'power2.inOut' }, T1);
    t.to(s, { ...down, duration: 0.6, ease: 'power2.inOut' }, T1);
    t.to(s, { omRise: 0, duration: 0.65, ease: 'power2.inOut' }, T1);
    // 2. Buông tay, đứng dậy, cúi nhìn số trên cân (thẻ số bật lên trên con vật), gật.
    const R = T1 + 0.7;
    // …đứng dậy: đầu quay / cúi về SỐ CÂN (thẻ số trên con vật) — Gemini đọc 1 khung / giây, mắt liếc không đủ.
    this._lookTo(t, { x: spot.x - s.x, y: c.scale.y + (crown - offY - c.from.y) - 30 - (s.y || 0) - DOI_Y }, R, { d: 0.55 });
    t.to(s, { ['bat' + onScale.k]: N['bat' + onScale.k], ['cang' + onScale.k]: N['cang' + onScale.k], ['bat' + other]: N['bat' + other], ['cang' + other]: N['cang' + other],
              seat: N.seat, kneel: 0, than: N.than, dau: N.dau + (spot.x > HONG.x + s.x ? 4 : -4), dauY: 8, nhinX: clamp((spot.x - s.x - HONG.x) * 0.02, -3, 3), nhinY: LOOK_DOWN.eyes, matY: LOOK_DOWN.lids, cuoi: 0.7,
              duration: 0.55, ease: 'power2.inOut' }, R);
    t.set(s, { tayL: N.tayL, tayR: N.tayR }, R + 0.25);
    t.to(s, { readoutN: n, duration: 0.02 }, R + 0.3);
    t.to(s, { readout: 1, mayL: 0.7, mayR: 0.7, duration: 0.35, ease: 'back.out(1.8)' }, R + 0.32);
    t.to(s, { dauY: 11, cuoi: 1, duration: 0.18, ease: 'sine.out', yoyo: true, repeat: 1 }, R + 0.45 + hold * 0.6);
    // 3. Thẻ tắt, quỳ xuống, hai tay ôm lấy con vật trên cân, rồi đứng dậy bế nó lên (nó lên theo thân người).
    const B = R + 0.55 + hold;
    t.to(s, { readout: 0, duration: 0.25, ease: 'power2.in' }, B - 0.1);
    t.to(s, { ...kneelLook, duration: 0.6, ease: 'power2.inOut' }, B);
    t.to(s, { ['bat' + onScale.k]: onScale.upper, ['cang' + onScale.k]: onScale.fore, ['bat' + other]: otherArm, ['cang' + other]: -40, ...down, matY: 0, duration: 0.6, ease: 'power2.inOut' }, B);
    this._lookTo(t, null, B + 0.65, { d: 0.6 });
    t.set(s, { tayL: 'xoe', tayR: 'xoe' }, B + 0.3);
    t.to(s, { omRise: 1, seat: N.seat, kneel: 0, than: N.than, dau: N.dau, dauY: 3, nhinY: 1.8, nhinX: 0, cuoi: 1, duration: 0.7, ease: 'power2.inOut' }, B + 0.65);
    // 4. Mang về, cúi đặt xuống đúng chỗ cũ (như `putDown`).
    const D = B + 1.4, back = home.k === 'L' ? 'R' : 'L';
    t.to(s, { omScale: 0, ['bat' + home.k]: home.upper, ['cang' + home.k]: home.fore, ['bat' + back]: home.bend ? -home.bend : home.upper * 0.6, ['cang' + back]: -40, duration: 0.02 }, D);
    if (home.crouch) t.to(s, { seat: home.crouch, duration: 0.5, ease: 'power2.inOut' }, D);
    this._lookTo(t, { x: home.tx, y: home.ty }, D, { d: 0.55, huong: c.facing });
    t.to(s, { omRise: 0, dauY: 7, nhinY: 2.4, duration: 0.55, ease: 'power2.inOut' }, D);
    t.to(s, { huong: c.facing, duration: 0.5, ease: 'sine.inOut' }, D);
    t.set(s, { om: 0 }, D + 0.6);
    this._khep(t, 0.45, D + 0.65, { om: 0, omRise: 0, omScale: 0, huong: c.facing, kneel: 0, seat: was.seat });
    return t;
  }

  /* ------------------------------------------------------------ đợt 35: dụng cụ và hồ sơ ở phòng khám
   * `bandage` / `putCone` đeo đồ cho con vật: MỨC ĐEO (`petWrap`, `petCone`) là trạng thái của NGƯỜI — chuỗi của người được
   * lấy mẫu sẵn (`sequence`), con vật đọc lại mỗi lần vẽ (RigThu.careLevel) — và GIỮ sau động tác (_khep): băng còn trên chân,
   * loa còn trên cổ. Mỗi người đeo cho một con vật.
   */
  // Rig con vật của đích `target` (rig thú, `set.target(…)` — có `.rig` —, hay mỏ neo `{ live }`); không phải con vật thì null.
  _petOf(target) {
    const rig = target && (target.el ? target : target.rig || (target.live && target.live.el ? target.live : null));
    return rig && typeof rig.careLevel === 'function' && rig.careBy ? rig : null;
  }

  // Tay ở PHÍA con vật (đợt 35): đang cầm đồ thì CẤT đồ ấy trong lúc làm (lấy ra lại khi xong) — dùng tay kia thì cánh tay vắt
  // ngang bụng mà không tới chân / đầu con vật (đo: bác sĩ cầm bìa hồ sơ, tay băng chân chó lơ lửng trước bụng).
  _careHand(t, target, part) {
    // Hai tay cùng làm (đợt 35, lượt hai): đồ đang cầm ở TAY NÀO cũng cất trong lúc làm, lấy ra lại khi xong.
    const s = this.s, k = this._reachLow(target, null, part).tx < HONG.x ? 'L' : 'R', keep = {};
    for (const side of ['L', 'R']) if (this.holds[side] && s['item' + side] > 0.5) { t.to(s, { ['item' + side]: 0, ['carry' + side]: 0, duration: 0.15 }, 0); keep['item' + side] = 1; }
    return { reach: this._reachLow(target, k, part), keep };
  }

  _careFor(pet, key, name) {
    if (!pet) return;
    const other = [...(this.caring || [])].find((rig) => rig !== pet && rig.careBy && rig.careBy.has(this) && this.s[key] > 0.5);
    if (other) throw new Error(`[character] ${name}: this person already put one on another pet — one pet per person (use another person for the second pet)`);
    (this.caring || (this.caring = new Set())).add(pet);
    pet.careBy.add(this);
  }

  // TAY HAI ĐỐT tới CỔ TAY ở (x, y) (khung của `_aimOf`, y xuống), tính từ vai (sx, sy): { bat, cang, dir } — góc TRÊN MÀN HÌNH
  // (dùng với `aim` = 1), khuỷu chọn phía DƯỚI đường vai → đích; `dir` = hướng cẳng tay (độ). Đích ngoài tầm: duỗi thẳng về phía nó.
  // Tay phải: bắp ở góc 90 − bat, cẳng ở 90 − bat − cang; tay trái soi gương (đợt 35 — hai tay cùng tới một chỗ trên con vật).
  _armTo(k, x, y, sx = this._shoulderX(k), sy = this._shoulderY()) {
    const a = DAI.canhTay * this.nv.daiCanhTay, b = DAI.cangTay * this.nv.daiCangTay, deg = 180 / Math.PI;
    const d = clamp(Math.hypot(x - sx, y - sy), Math.abs(a - b) + 1, a + b - 0.5), phi = Math.atan2(y - sy, x - sx) * deg;
    const alpha = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1)) * deg;
    const [u1, u2] = [phi + alpha, phi - alpha], low = (u) => sy + a * Math.sin(u / deg);
    const phiU = low(u1) >= low(u2) ? u1 : u2, ex = sx + a * Math.cos(phiU / deg), ey = sy + a * Math.sin(phiU / deg);
    const phiF = Math.hypot(x - sx, y - sy) > a + b - 0.5 ? phiU : Math.atan2(y - ey, x - ex) * deg;
    const bat = k === 'R' ? 90 - phiU : phiU - 90, cang = k === 'R' ? phiU - phiF : phiF - phiU;
    return { bat: clamp(chuanHoaGoc(bat), -60, 172), cang: chuanHoaGoc(cang), dir: phiF };
  }

  // Cúi tới con vật cho động tác HAI TAY (đợt 35): khuỵu gối (`seat`) — đích thấp hơn hông thì như `_reachLow`, cao ngang hông (con
  // vật trên bàn khám) vẫn khuỵu `min` cho thấy rõ là cúi xuống; đang ngồi / quỳ thì thôi. Trả về hàm góc tay từ vai ĐÃ HẠ.
  _stoopFor(t, reach, min) {
    const s = this.s, low = s.seat > 0.5 || s.kneel > 0.5, crouch = low ? 0 : Math.max(reach.crouch || 0, min);
    const drop = DAI.dui * this.nv.daiDui * this.nv.coChan * 0.72 * crouch, sy = this._shoulderY() + drop;
    if (crouch) t.to(s, { seat: crouch, duration: 0.45, ease: 'power2.inOut' }, 0);
    t.to(s, { aimL: 1, aimR: 1, duration: 0.3, ease: 'sine.inOut' }, 0);
    return (k, x, y) => this._armTo(k, x, y, this._shoulderX(k), sy);
  }

});
