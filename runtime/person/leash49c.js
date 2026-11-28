// runtime/person/leash49c.js — đợt 49 C: walk a dog (or a cat on a harness) on a leash, in one step (`walkOnLeash`).
// Methods of `RigSVG`, installed by runtime/rig-svg.js: `this` is the rig, `RigSVG` its class.
//
// Đi cặp với `walkOnLeash(person, steps, distance)` của rig con vật, CÙNG LÚC (tools/scene.py tự thêm phần của con vật):
// hai bên tính nhịp theo cùng một kế hoạch (`leashPlan49c`) — con vật là một SVG khác, timeline riêng — nên bắt đầu bước,
// dừng lại cùng lúc mà không bên nào phải đọc trạng thái của bên kia lúc dựng.

import { clamp, mix } from './shared.js';
import { leash } from '../parts.js';

export default (RigSVG) => mix(RigSVG, class {
  static LEASH_LEAD_49C = 0.55;     // giây đầu bước: móc dây vào vòng cổ (chưa dắt) hay cúi nhìn con vật "đi nào" (đang dắt) — hai trường hợp dài như nhau
  static LEASH_TURN_49C = 0.14;     // rồi quay ngang, chân bắt đầu bước sau chừng ấy giây (như `walk`)
  static LEASH_STEP_49C = 0.46;     // giây một bước (như `walk`)
  static LEASH_SETTLE_49C = 0.45;   // dừng: khép về dáng nghỉ (như `walk`)
  static LEASH_FLOOR_49C = 450;     // y thấp nhất của dây trong khung 400 × 470 (sàn ở 458): dây chùng nằm sát đất
  static LEASH_ROPE_49C = 0.55;     // dây dài chừng ấy × chiều cao người: con vật đi trước một quãng thì dây gần căng, lùi lại gần thì võng xuống

  /**
   * KẾ HOẠCH của một lần `walkOnLeash(pet, steps, distance)` — con vật (rig khác) đọc để bước cùng nhịp:
   * `{ lead, start, walk, end, steps }` (giây tính từ đầu bước: chân bắt đầu bước ở `start`, bước trong `walk` giây, xong hẳn ở `end`).
   * Chỉ phụ thuộc hình thể nhân vật và quãng đi (`_doBuoc`), không phụ thuộc trạng thái lúc dựng.
   */
  leashPlan49c(buoc = 4, quang = 0) {
    const lead = RigSVG.LEASH_LEAD_49C, start = lead + RigSVG.LEASH_TURN_49C;
    const steps = quang ? this._doBuoc(Math.abs(quang), true, true).buoc : Math.max(2, Math.round(+buoc || 4));
    const walk = steps * RigSVG.LEASH_STEP_49C;
    return { lead, start, walk, end: start + walk + RigSVG.LEASH_SETTLE_49C, steps };
  }

  /**
   * DẮT CHÓ ĐI DẠO (đợt 49 C): người và con vật `pet` cùng đi `distance` đơn vị khung (âm = sang trái; 0 = bước tại chỗ, `steps` bước).
   * Chưa móc dây thì cúi xuống móc dây vào vòng cổ nó (như `leash`); đã dắt thì cúi nhìn nó một nhịp. Rồi quay ngang, bước đi — tay
   * cầm quai dây không đánh theo nhịp bước, mắt liếc xuống con vật đi phía trước; dây võng tự nhiên theo khoảng cách (gần căng khi
   * nó đi trước một quãng). Dừng cùng lúc với nó, quay lại hướng cũ — DÂY VẪN MÓC (`unleash()` tháo sau).
   * Cầm quai dây: `items: { R: 'leash' }` (đang cầm hay đang cất). Chưa có thì rig tự cho một quai dây (đang cất) ở tay rảnh phía con
   * vật sẽ đi, lấy ra lúc bắt đầu. Con vật phải `walkOnLeash(person, steps, distance)` CÙNG LÚC (một `together`). Mèo: dây dắt yếm (có
   * thật, ít gặp) — được. Thỏ: không (nó nhảy cóc).
   */
  walkOnLeash(pet, buoc = 4, quang = 0) {
    const real = pet && pet.live ? pet.live : pet;
    if (!real || typeof real !== 'object' || !real.el || !real.el.vong || real instanceof RigSVG) throw new Error('[character] walkOnLeash(pet, steps, distance): pet must be a dog or cat rig (createPet(...).rig) — it does walkOnLeash(person, steps, distance) at the same time');
    if (real.nv && real.nv.loai === 'rabbit') throw new Error('[character] walkOnLeash: not for a rabbit — a rabbit hops and is not walked on a leash; walk a dog (or a cat on a harness)');
    if (typeof quang !== 'number' || !isFinite(quang)) throw new Error(`[character] walkOnLeash(pet, steps, distance): distance must be a number of frame units (negative = to the left), got ${JSON.stringify(quang)}`);
    const s = this.s;
    if (s.om >= 0.5) throw new Error('[character] walkOnLeash: the character is carrying a pet — putDown() first');
    if (s.seat > 0.5 || s.kneel > 0.5 || s.ride > 0.5 || s.floor42e > 0.5 || s.lie42e > 0.5) throw new Error('[character] walkOnLeash: stand up first (standUp / getOff) — the character walks the pet from standing');
    const now = this._leashNow49c(), walking = now ? now.pet : this.leashed;
    if (walking && walking !== real && s.leash >= 0.5) throw new Error('[character] walkOnLeash: already walking another pet — unleash() first');
    const chieu = quang < 0 ? -1 : 1, near = chieu > 0 ? 'L' : 'R', far = near === 'L' ? 'R' : 'L';
    // Tay CẦM QUAI DÂY (đang hiện trước, rồi đang cất). Không tay nào có: cho tay rảnh — tay GẦN máy quay khi quay về hướng đi (dây không vắt
    // qua trước thân) — một quai dây đang cất, như `pickUp` tự cho món đồ (dựng lại SVG một lần, giữ nguyên dáng tay đang có).
    const has = (k) => !!(this.holds[k] && this.el['item' + k] && this.el['item' + k].querySelector('[data-leash]'));
    let k = [this.leashHand, 'R', 'L'].find((side) => side && has(side) && s['item' + side] > 0.5) || [near, far].find(has);
    if (!k) {
      k = [near, far].find((side) => !this.holds[side]);
      if (!k) throw new Error('[character] walkOnLeash: both hands hold something — give the character a leash: createCharacter(host, { id, items: { R: "leash" } })');
      const keepArms = Object.fromEntries(['batL', 'cangL', 'tayL', 'batR', 'cangR', 'tayR', 'itemL', 'itemR'].map((key) => [key, s[key]]));
      this.setItem(k, (p, c) => leash(c), { shown: false });
      Object.assign(this.s, keepArms); this.apDung();
    }
    const shown = s['item' + k] > 0.5, on = walking === real && s.leash >= 0.5 && (now ? now.hand : this.leashHand) === k;
    // Con vật này vào sổ dắt của người (một lần mỗi con, mỗi tay); kênh `leashPet49c` chọn nó — tua tới đâu dây cũng tới đúng con.
    const list = this.leashPets49c = this.leashPets49c || [];
    let slot = list.findIndex((item) => item.pet === real && item.hand === k);
    if (slot < 0) { list.push({ pet: real, hand: k }); slot = list.length - 1; }
    this.leashed = real; this.leashHand = k;
    real.onDraw = () => this._drawLeash();
    const t = this.tl(), N = this.NGHI, plan = this.leashPlan49c(buoc, quang), x0 = s.x;
    t.set(s, { leashPet49c: slot + 1 }, 0);
    // 1. Lấy quai dây ra (đang cất), cúi nhìn con vật: móc dây vào cổ nó (dây hiện) — hay đã móc thì chỉ nhìn nó "đi nào".
    if (!shown) {
      t.set(s, { ['tay' + k]: 'nam' }, 0);
      t.to(s, { ['item' + k]: 1, duration: 0.14 }, 0.04);
    }
    t.to(s, { dauY: on ? 4 : 6, nhinY: on ? 1.8 : 2.2, nhinX: chieu * 0.8, cuoi: 0.85, duration: 0.3, ease: 'sine.out' }, 0);
    if (!on) t.set(s, { leash: 1 }, 0.35);
    t.to(s, { leashRope49c: 1, duration: 0.3, ease: 'sine.inOut' }, 0.3);          // dây theo độ dài thật của nó (võng theo khoảng cách)
    t.to(s, { dauY: N.dauY, nhinY: 0.9, cuoi: 0.6, duration: 0.2, ease: 'sine.inOut' }, 0.35);
    // 2. Quay ngang, bước đi cùng con vật — mắt liếc xuống nó (đi trước, phía hướng đi).
    t.to(s, { huong: chieu, duration: 0.4, ease: 'power2.inOut' }, plan.lead);
    t.to(s, { nhinX: chieu * 1.2, nhinY: 1, duration: 0.4, ease: 'sine.inOut' }, plan.lead + 0.2);
    // Tay cầm quai dây: buông xuôi, chìa nhẹ ra trước về phía con vật (không đánh theo bước) — bàn tay ngang hông, dây đi xuống cổ nó.
    // (`carry` 0: không giữ dáng bưng đồ — cẳng tay gập ngang bụng thì dây dốc ngược từ ngực xuống, như kéo ghì con vật.)
    const arm = { ['vung' + k]: 0.4, ['bat' + k]: 5, ['cang' + k]: -8, ['carry' + k]: 0 };
    let at;
    if (quang) {
      const d = this._doBuoc(Math.abs(quang), true, true);
      at = this._di(t, plan.start, d.buoc, RigSVG.LEASH_STEP_49C, { kA: d.kA, chieu, x: (b) => x0 + chieu * d.x(b), arm49c: arm });
    } else at = this._di(t, plan.start, plan.steps, RigSVG.LEASH_STEP_49C, { arm49c: arm });
    // 3. Dừng (cùng lúc với con vật), quay lại hướng cũ — vẫn dắt.
    this._khep(t, RigSVG.LEASH_SETTLE_49C, at, { ...(quang ? { x: x0 + quang } : {}), leash: 1, leashRope49c: 1, leashPet49c: slot + 1 });
    return t;
  }

  // Con vật đang dắt và tay cầm dây theo TRẠNG THÁI (`leashPet49c`), hay null (dắt bằng `leash`: `leashed`, `leashHand`).
  _leashNow49c() {
    const n = Math.round(+this.s.leashPet49c || 0), list = this.leashPets49c;
    return n > 0 && list && list[n - 1] ? list[n - 1] : null;
  }

  // Độ võng của dây (đợt 49 C, `leashRope49c` > 0): dây có ĐỘ DÀI THẬT `LEASH_ROPE_49C` × chiều cao người. Cung parabol dài L căng qua
  // khoảng `span` thì võng giữa d với L ≈ span + 8d²/(3·span) — d = √(3·span·(L − span)/8); căng hết cỡ (span ≥ L) thì gần thẳng.
  // Trả về điểm điều khiển (Bézier bậc hai: giữa cung lệch khỏi giữa dây cung đúng một nửa phần lệch của điểm điều khiển).
  _leashControl49c(a, b, span) {
    const L = RigSVG.LEASH_ROPE_49C * RigSVG.KHUNG.h * 0.96, d = Math.max(1.5, Math.sqrt(Math.max(0, 3 * span * (L - span) / 8)));
    // Chỗ võng thấp nhất (giữa cung: (a + 2c + b) / 4) không xuống dưới mặt sàn (y 458 của khung) — dây chùng thì nằm sát đất, không lún.
    const y = Math.min((a.y + b.y) / 2 + 2 * clamp(d, 0, 90), (4 * RigSVG.LEASH_FLOOR_49C - a.y - b.y) / 2);
    return { x: (a.x + b.x) / 2, y: Math.max(y, (a.y + b.y) / 2) };
  }
});
