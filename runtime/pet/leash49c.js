// runtime/pet/leash49c.js — đợt 49 C: walked on a leash (`walkOnLeash`) beside the person holding it.
// Methods of `RigThu`, installed by runtime/rig-thu.js: `this` is the rig, `RigThu` its class.

import { clamp, mem, mix } from './shared.js';

export default (RigThu) => mix(RigThu, class {
  static LEASH_AHEAD_49C = 0.4;     // dừng lại với TÂM con vật đi trước giữa người chừng ấy × chiều cao người (dây gần căng, không chạm chân người)
  static LEASH_TRAIL_49C = 0.32;     // … hay THEO SAU chừng ấy, khi lúc bắt đầu nó ở phía sau hướng đi quá LEASH_TRAIL_FROM_49C × chiều cao người (người quay đầu đi ngược lại)
  static LEASH_TRAIL_FROM_49C = 0.12;
  static LEASH_BEAT_49C = 0.36;      // giây một nhịp chân kiệu (chừng ấy — số nhịp tròn cho vừa thời gian bước của người)
  static LEASH_PLAN_49C = { lead: 0.55, start: 0.69, step: 0.46, settle: 0.45 };   // nhịp của người khi không có người (như RigSVG.LEASH_*_49C)

  /**
   * ĐƯỢC DẮT ĐI DẠO (đợt 49 C) bởi người `person` — người ấy `walkOnLeash(pet, steps, distance)` CÙNG LÚC, cùng `steps` và `distance`
   * (đơn vị khung của NGƯỜI; tools/scene.py tự thêm phần này). Nó quay về hướng đi, vẫy đuôi háo hức trong lúc người móc dây, rồi KIỆU đi
   * cùng nhịp người, đi trước một quãng (dừng với tâm cách giữa người `LEASH_AHEAD_49C` × chiều cao người, về phía hướng đi — hay
   * THEO SAU `LEASH_TRAIL_49C` nếu lúc bắt đầu nó ở phía sau hướng đi: người quay đầu đi ngược lại thì nó không băng qua chân người); chó cúi
   * xuống ĐÁNH HƠI mặt đường một lúc giữa đường, rồi gần cuối NGOÁI NHÌN LẠI người dắt. Dừng cùng lúc với người, vẫn quay về hướng đi.
   * `{ distance }`: quãng của CHÍNH NÓ (đơn vị khung của nó) — tools/scene.py đưa sẵn; bỏ trống thì đo từ chỗ người đứng trên màn hình.
   * Không có người: kiệu tại chỗ (hay `distance` đơn vị) theo nhịp mặc định. Mèo đi dây yếm: được (không đánh hơi, đuôi dựng); thỏ: không.
   */
  walkOnLeash(person = null, buoc = 4, quang = 0, { distance = null } = {}) {
    this._only('walkOnLeash', ['dog', 'cat']);
    const real = person && person.live ? person.live : person;
    if (person !== null && (typeof person !== 'object' || !real || typeof real.leashPlan49c !== 'function')) throw new Error('[character] walkOnLeash(person, steps, distance): person must be the person walking this pet (createCharacter(...).rig) — they walkOnLeash(pet, steps, distance) at the same time');
    if (typeof quang !== 'number' || !isFinite(quang)) throw new Error(`[character] walkOnLeash(person, steps, distance): distance must be a number (the person's frame units, negative = to the left), got ${JSON.stringify(quang)}`);
    if (distance !== null && (typeof distance !== 'number' || !isFinite(distance))) throw new Error(`[character] walkOnLeash: { distance } must be a number of the pet's frame units, got ${JSON.stringify(distance)}`);
    const t = this.tl(), s = this.s, x0 = s.x, P = RigThu.LEASH_PLAN_49C, dog = this.nv.loai === 'dog';
    const plan = real ? real.leashPlan49c(buoc, quang) : (() => { const steps = Math.max(2, Math.round(+buoc || 4)); return { lead: P.lead, start: P.start, walk: steps * P.step }; })();
    const held = s.huong < 0 ? -1 : 1;
    // Quãng CỦA NÓ (đơn vị khung của nó): đưa sẵn, hay tới chỗ trước người (sau khi người đi `quang`) đo trên màn hình.
    let dx = 0, along = null;          // `along`: quãng NGƯỜI đi, đổi ra đơn vị khung của nó (null = không biết)
    const metrics = real ? this._personMetrics(person, 'walkOnLeash') : null;
    if (metrics) along = quang * (metrics.H / (470 * 0.96)) / metrics.scale;
    if (distance !== null) dx = distance;
    else if (metrics) {
      const { cx, H, scale } = metrics, dir = quang < 0 ? -1 : quang > 0 ? 1 : held, me = this.centerX();
      // Đang ở PHÍA SAU hướng đi (người quay đầu đi ngược lại): theo sau người, không băng qua chân người để lên trước.
      const lead = (me - cx) * dir < -RigThu.LEASH_TRAIL_FROM_49C * H ? -RigThu.LEASH_TRAIL_49C : RigThu.LEASH_AHEAD_49C;
      dx = quang ? (cx + quang * H / (470 * 0.96) + dir * lead * H - me) / scale : 0;
    } else dx = quang;
    if (Math.abs(dx) < 3) dx = 0;
    const dir = dx < 0 ? -1 : dx > 0 ? 1 : quang < 0 ? -1 : quang > 0 ? 1 : held;
    let at = this._dung(t, 0);
    // 1. Người móc dây: quay về hướng đi, tai vểnh, đuôi vẫy háo hức, ngước nhìn người.
    at = this._quayVe(t, Math.max(at, 0.1), dir);
    t.to(s, { taiL: 0.6, taiR: 0.6, cuoi: 0.85, mieng: dog ? 0.25 : 0, luoi: dog ? 0.5 : 0, nhinY: -0.8, duration: 0.25 }, at);
    if (dog) this._vay(t, at, Math.max(2, Math.floor((plan.start - at) / 0.1)), 30, 0.1, 18);
    // 2. Kiệu đi cùng nhịp người: số nhịp tròn cho vừa thời gian bước, sải chân tính cho đúng quãng (chân trụ không trượt).
    const walk = plan.walk, start = Math.max(at, plan.start);
    const cycles = Math.max(2, Math.round(walk / RigThu.LEASH_BEAT_49C)), h = walk / cycles;
    // Quãng HƠN / KÉM người (đi lên trước, hay lùi lại cho đúng chỗ): dồn vào NỬA ĐẦU quãng bước — sải dài hơn ở đầu (`boost`), nên nó lên
    // trước người sớm rồi đi đều cùng người, chân trụ vẫn không trượt. Muốn nửa đầu đi được phần `f` của cả quãng: sải nửa đầu ×(1 + b/2)
    // ⇒ f = (1 + b/2) / (2 + b/2) ⇒ b = 2(2f − 1) / (1 − f).
    let boost = 0;
    if (dx && along !== null && Math.sign(along) !== -Math.sign(dx)) {
      const total = Math.abs(dx), extra = total - Math.abs(along), f = clamp((Math.abs(along) / 2 + 0.85 * extra) / total, 0.3, 0.8);
      boost = clamp(2 * (2 * f - 1) / (1 - f), -0.6, 1.5);
    }
    const stride = (c) => 1 + boost * Math.max(0, 1 - c / (0.5 * cycles));
    const unitTable = (A) => { const M = 60, n = Math.round(cycles * M), bao = (c) => mem(c / 0.5) * mem((cycles - c) / 0.5); let X = 0; for (let i = 1; i <= n; i++) X += (2 * A * stride(i / M) / 0.6) * bao(i / M) / M; return X; };
    const A = dx ? clamp(Math.abs(dx) / unitTable(1), 6, 24 / (1 + Math.max(0, boost))) : 13, lift = clamp(A * 0.7, 7, 13);
    // Đánh hơi (chó, bước ≥ 1,4 s): cúi mõm xuống mặt đường từ 22 % tới 50 % quãng bước. Ngoái nhìn lại: 66 % → 94 %.
    const sniff = dog && walk >= 1.4 ? [0.22, 0.5] : null, back = walk >= 1.4 ? [0.66, 0.94] : null;
    const bump = (u, [a, b]) => { const k = (u - a) / (b - a); return k <= 0 || k >= 1 ? 0 : mem(k / 0.25) * mem((1 - k) / 0.25); };
    const add = (c) => {
      const u = c / cycles, w = sniff ? bump(u, sniff) : 0, r = back ? bump(u, back) : 0;
      return { dauY: 24 * w, dauX: 12 * w, dau: 14 * w - 9 * r, truocY: 4 * w, taiL: 0.6 - 0.9 * w, taiR: 0.6 - 0.9 * w, duoi: dog ? 0 : 26,
               nhinX: -dir * 1.8 * r, nhinY: 1.2 * w - 1 * r, mieng: dog ? 0.25 * (1 - w) : 0, luoi: dog ? 0.5 * (1 - w) : 0 };
    };
    this._diLeash49c(t, start, cycles, h, { quang: dx, x0, A, cao: lift, stride }, add);
    // 3. Dừng cùng lúc với người — vẫn quay về hướng đi, đứng đợi.
    this._khep(t, 0.45, start + walk, { ...(dx ? { x: x0 + dx } : {}), huong: dir });
    return t;
  }

  // Như `_diThem` (play.js) nhưng phần cộng thêm là HÀM CỦA NHỊP (`add(c)` → kênh: lượng) — cúi đánh hơi, ngoái lại giữa lúc đang kiệu. Kênh
  // `_buoc` không ghi (`dau`, tai, mắt) thì đặt thẳng; kênh nó ghi (`dauY`, `truocY`, `duoi`) thì cộng vào.
  _diLeash49c(t, at, chuKy, h, { quang = 0, x0 = 0, A = 13, cao = 9, stride = () => 1 } = {}, add = () => ({})) {
    const s = this.s, bao = (c) => mem(c / 0.5) * mem((chuKy - c) / 0.5);
    const M = 60, n = Math.round(chuKy * M), X = [0];
    for (let i = 1; i <= n; i++) X.push(X[i - 1] + (2 * A * stride(i / M) / 0.6) * bao(i / M) / M);
    const tiLe = quang ? Math.abs(quang) / X[n] : 0, dau = quang < 0 ? -1 : 1, rest = this.NGHI, owner = this;
    const pr = { _c: 0, get c() { return this._c; }, set c(v) {
      this._c = v;
      const a = bao(v), step = owner._buoc(v, a, A * stride(v) * (tiLe ? clamp(tiLe, 0.5, 1.35) : 1), cao), more = add(v), on = Math.min(1, a * 3);
      for (const k of Object.keys(more)) step[k] = k in step ? step[k] + more[k] * on : (rest[k] || 0) + more[k];
      Object.assign(s, step);
      if (quang) { const q = clamp(v, 0, chuKy) * M, i = Math.min(n - 1, Math.floor(q)); s.x = x0 + dau * tiLe * (X[i] + (X[i + 1] - X[i]) * (q - i)); }
    } };
    t.to(pr, { c: chuKy, duration: chuKy * h, ease: 'none' }, at);
    return at + chuKy * h;
  }
});
