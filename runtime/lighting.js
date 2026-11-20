// lighting.js — ÁNH SÁNG của bối cảnh 3D (set3d.js): giờ trong ngày, đèn, cửa sổ, nắng, bóng đổ, đèn trong tay, ánh phản xạ.
// Tách khỏi set3d.js ở đợt 26 (không đổi hành vi — so từng điểm ảnh trước / sau trên 7 cảnh thử). Mọi hàm ở đây sống trong một
// bối cảnh: `createLighting(S)` nhận các mảng / hàm dùng chung của bối cảnh ấy và đọc trạng thái ánh sáng hiện tại qua
// `S.lighting` (set.light() gán lại nó), máy quay qua `S.set`.

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function createLighting(S) {
  const { actors, backdrop, props, layers, surfaces, view, layer } = S;
  /* ─────────────────────────────────────────────────────────── ÁNH SÁNG
   * Bối cảnh là các mặt phẳng CSS, không có bộ dựng ánh sáng — ánh sáng được VẼ ra:
   *   • mỗi mặt (sàn, tường, hộp, tấm) có hai lớp con: lớp TỐI (giờ trong ngày + hướng sáng chính, khoét sáng quanh mỗi
   *     đèn bằng mask) và lớp SÁNG (quầng ấm loang quanh đèn, tắt dần theo khoảng cách tới mặt);
   *   • nhân vật / đồ vật: `filter` độ sáng + sắc ấm theo khoảng cách tới đèn, tính lại mỗi khung (người đi thì sáng tối theo);
   *   • bóng đổ DÀI trên sàn, ngược phía mỗi đèn (và ngược phía nắng chiều);
   *   • cửa sổ hắt vệt nắng lên sàn; bóng đèn có quầng sáng, đèn trần có luồng sáng hình nón.
   * Các mặt chỉ tính lại khi mức sáng của đèn đổi (bật / tắt); nhân vật thì mỗi khung.
   */
  const MOODS = {
    day:     { name: 'day', dark: 0.06, keyShade: 0.16, key: [0.35, -0.8, -0.5],  shade: '20,28,40', tint: null,                       sun: [0.2, -0.6, 0.78],   sunColor: '255,244,214', sunAlpha: 0.62, lampsOn: false, warm: 0 },
    evening: { name: 'evening', dark: 0.3,  keyShade: 0.22, key: [0.8, -0.35, -0.45], shade: '45,26,48', tint: 'rgba(255,140,60,0.2)',     fog: 'rgba(255,176,128,0.1)', sun: [0.55, -0.36, 0.76], sunColor: '255,184,112', sunAlpha: 0.62, lampsOn: true,  warm: 0.26 },
    night:   { name: 'night', dark: 0.62, keyShade: 0.12, key: [0.2, -0.9, -0.3],   shade: '8,14,36',  tint: 'rgba(60,80,170,0.10)',     fog: 'rgba(46,62,120,0.12)', sun: null,                                         lampsOn: true,  warm: 0 },
  };
  // ỐNG KÍNH theo giờ: màu chỉnh toàn khung (soft-light), độ tối bốn góc, độ hạt.
  const LENS = { day: { grade: [255, 248, 235, 0.06], vignette: 0.2, grain: 0.035 }, evening: { grade: [255, 146, 70, 0.2], vignette: 0.3, grain: 0.045 }, night: { grade: [46, 74, 170, 0.26], vignette: 0.42, grain: 0.06 } };
  for (const name of Object.keys(MOODS)) Object.assign(MOODS[name], LENS[name]);
  // TRỘN hai giờ trong ngày (trời chuyển chiều → tối trong một cảnh): số thì nội suy, màu thì trộn từng kênh.
  const lerp = (a, b, t) => a + (b - a) * t;
  const rgbaOf = (text, other) => { if (text) return text.match(/[\d.]+/g).map(Number); const o = rgbaOf(other || 'rgba(0,0,0,0)'); return [o[0], o[1], o[2], 0]; };
  const mixMood = (a, b, t) => {
    if (t <= 0) return a; if (t >= 1) return b;
    const rgb = (x, y) => x.split(',').map((v, i) => Math.round(lerp(+v, +y.split(',')[i], t))).join(',');
    const rgba = (x, y) => { const p = rgbaOf(x, y), q = rgbaOf(y, x); return `rgba(${p.slice(0, 3).map((v, i) => Math.round(lerp(v, q[i], t))).join(',')},${lerp(p[3], q[3], t).toFixed(3)})`; };
    const sun = a.sun || b.sun;
    return { name: t < 0.5 ? a.name : b.name, dark: lerp(a.dark, b.dark, t), keyShade: lerp(a.keyShade, b.keyShade, t), key: a.key.map((v, i) => lerp(v, b.key[i], t)),
      shade: rgb(a.shade, b.shade), tint: rgba(a.tint, b.tint), fog: rgba(a.fog, b.fog), sun, sunColor: rgb(a.sunColor || b.sunColor, b.sunColor || a.sunColor),
      sunAlpha: lerp(a.sun ? a.sunAlpha : 0, b.sun ? b.sunAlpha : 0, t), lampsOn: b.lampsOn, warm: lerp(a.warm, b.warm, t),
      grade: a.grade.map((v, i) => lerp(v, b.grade[i], t)), vignette: lerp(a.vignette, b.vignette, t), grain: lerp(a.grain, b.grain, t) };
  };
  // Nắng còn bao nhiêu (0…1): trời chuyển chiều → tối thì nắng tắt dần.
  const sunFade = () => (S.lighting && S.lighting.mood.sun ? clamp(S.lighting.mood.sunAlpha / 0.62, 0, 1) : 0);
  const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((c) => c / l); };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const rgbOf = (hex) => { const h = hex.replace('#', ''), full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h; return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(','); };

  // Một mặt: lớp tối + lớp sáng, theo trạng thái đèn hiện tại.
  const lightSurface = (f) => {
    const mood = S.lighting.mood;
    if (!f.shadeEl) {
      f.shadeEl = document.createElement('div'); f.glowEl = document.createElement('div');
      // Lớp tối / sáng phủ cả VIỀN của tấm (khung cửa sổ trắng): `inset: 0` chỉ phủ phần trong viền — khung trắng sáng
      // trưng giữa lúc mất điện (Gemini đợt 21).
      const edge = f.edge = parseFloat(getComputedStyle(f.element).borderTopWidth) || 0;
      for (const el of [f.shadeEl, f.glowEl]) { el.style.cssText = `position:absolute;inset:${-edge}px;pointer-events:none`; f.element.appendChild(el); }
      // BÓNG GÓC (ambient occlusion): chân tường giáp sàn và hai mép tường tối lại; dải sàn sát tường sau cũng vậy.
      if (f.kind === 'wall') f.glowEl.dataset.ao = 'linear-gradient(to top, rgba(0,0,0,.2), rgba(0,0,0,0) 24%), linear-gradient(to right, rgba(0,0,0,.1), rgba(0,0,0,0) 7%, rgba(0,0,0,0) 93%, rgba(0,0,0,.1))';
      if (f.kind === 'floor' && f.back) f.glowEl.dataset.ao = 'linear-gradient(to bottom, rgba(0,0,0,.16), rgba(0,0,0,0) 80px)';
    }
    const facing = Math.max(0, dot(f.n, S.lighting.key.map((c) => -c)));
    const darkness = 1 - (1 - mood.dark) * (1 - mood.keyShade * (1 - facing));
    const glow = [], mask = [];
    for (const lamp of S.lighting.lamps) {
      if (lamp.level <= 0.001) continue;
      const p = [lamp.x - f.origin[0], lamp.y - f.origin[1], lamp.z - f.origin[2]], d = dot(p, f.n);
      if (d < -20 || Math.abs(d) >= lamp.range) continue;                                        // đèn ở sau mặt này, hay quá xa
      const strength = lamp.power * lamp.level * (lamp.pulse ?? 1) * Math.pow(1 - Math.abs(d) / lamp.range, 0.8), R = Math.sqrt(lamp.range * lamp.range - d * d);
      const u = dot(p, f.u).toFixed(1), v = dot(p, f.v).toFixed(1), c = lamp.rgb;
      glow.push(`radial-gradient(circle ${R.toFixed(1)}px at ${u}px ${v}px, rgba(${c},${Math.min(0.66, 0.7 * strength).toFixed(3)}) 0, rgba(${c},${Math.min(0.34, 0.3 * strength).toFixed(3)}) ${(R * 0.4).toFixed(1)}px, rgba(${c},0) ${R.toFixed(1)}px)`);
      mask.push(`radial-gradient(circle ${R.toFixed(1)}px at ${u}px ${v}px, rgba(0,0,0,${Math.max(0, 1 - 1.9 * strength).toFixed(3)}) 0, rgba(0,0,0,${Math.max(0, 1 - 0.7 * strength).toFixed(3)}) ${(R * 0.45).toFixed(1)}px, rgba(0,0,0,1) ${R.toFixed(1)}px)`);
    }
    // Ô CỬA lúc tối: kính xanh thẫm (trời đêm), không giữ màu trời ngày như các mặt khác (Gemini soát ánh sáng đợt 19).
    const night = f.window && mood.name === 'night';
    f.shadeEl.style.background = night ? 'linear-gradient(rgba(6,12,38,.9), rgba(18,30,70,.82))' : darkness > 0.004 ? `rgba(${mood.shade},${darkness.toFixed(3)})` : 'none';
    // Khung cửa (viền) lúc đêm: tối như tường quanh nó, kính thì xanh thẫm.
    f.shadeEl.style.boxShadow = night && f.edge ? `inset 0 0 0 ${f.edge}px rgba(${mood.shade},${Math.min(0.85, darkness + 0.15).toFixed(3)})` : 'none';
    const masks = mask.length && !night ? mask.join(', ') : 'none';
    // Ô cửa ban ngày / chiều LOÁ ra tường quanh nó (ống kính không chứa nổi khoảng trời sáng).
    if (f.window) { const fade = sunFade(); f.element.style.boxShadow = fade > 0.05 ? `0 0 70px 14px rgba(${mood.name === 'evening' ? mood.sunColor : '255,252,240'},${(0.5 * fade).toFixed(3)})` : 'none'; }                       // kính đêm: đèn trong phòng không làm trời sáng ra
    f.shadeEl.style.maskImage = masks; f.shadeEl.style.webkitMaskImage = masks;
    f.shadeEl.style.maskComposite = 'intersect'; f.shadeEl.style.webkitMaskComposite = 'source-in';
    // SÀN BÓNG (gạch phòng khám): bóng đèn và ô cửa phản chiếu thành một vệt sáng dọc trên sàn, kéo về phía máy quay.
    if (f.kind === 'floor' && S.lighting.gloss) {
      for (const lamp of S.lighting.lamps) {
        if (lamp.level <= 0.001 || lamp.kind === 'screen') continue;
        const u = lamp.x - f.origin[0], v = lamp.z + 160 - f.origin[2];
        glow.push(`radial-gradient(ellipse 46px 240px at ${u.toFixed(1)}px ${v.toFixed(1)}px, rgba(${lamp.rgb},${(0.26 * lamp.level).toFixed(3)}), rgba(${lamp.rgb},0))`);
      }
      for (const win of S.lighting.windows) {
        if (!mood.sun) continue;
        const u = win.x + win.width / 2 - f.origin[0], v = win.z + 220 - f.origin[2];
        glow.push(`radial-gradient(ellipse ${(win.width * 0.42).toFixed(1)}px 260px at ${u.toFixed(1)}px ${v.toFixed(1)}px, rgba(255,255,255,0.22), rgba(255,255,255,0))`);
      }
    }
    // SƯƠNG MỜ trên tường lúc chiều / tối: không khí giữa máy quay và tường xa có màu — căn phòng có chiều sâu.
    const fog = f.kind === 'wall' && mood.fog ? [`linear-gradient(${mood.fog}, ${mood.fog})`] : [];
    // TƯỜNG TỐI DẦN LÊN TRÊN (ban ngày / chiều): đèn và cửa sổ chiếu xuống, mép trần nhận ít sáng — tường trắng đều một màu
    // từ chân tới trần thì phòng phẳng như tờ giấy (Gemini đợt 21: phòng khám 2/10).
    // TRỜI VẼ TRÊN TƯỜNG (công viên: bầu trời và đồi xa là dải màu của tường sau, `skyline` = phần trời): chiều / tối thì phần
    // ấy tối như bầu trời — sẫm hẳn, không chỉ phủ một lớp tối của tường (đợt 23: đêm công viên trời vẫn xám sáng).
    if (f.kind === 'wall' && S.lighting.skyline && mood.dark > 0.1) {
      const a = clamp((mood.dark - 0.06) * 1.65, 0, 0.92), line = (S.lighting.skyline * 100).toFixed(1);
      fog.push(`linear-gradient(to bottom, rgba(${mood.shade},${a.toFixed(3)}), rgba(${mood.shade},${(a * 0.8).toFixed(3)}) ${line}%, rgba(${mood.shade},0) ${line}%)`);
    }
    if (f.kind === 'wall' && mood.name !== 'night') fog.push(`linear-gradient(to bottom, rgba(${mood.shade},.16), rgba(${mood.shade},.05) 40%, rgba(${mood.shade},0) 70%)`);
    const layers = [...glow, ...fog, ...(mood.tint ? [`linear-gradient(${mood.tint}, ${mood.tint})`] : []), ...(f.glowEl.dataset.ao ? [f.glowEl.dataset.ao] : [])];
    f.glowEl.style.background = layers.length ? layers.join(', ') : 'none';
  };

  // TRONG VỆT NẮNG (hình bình hành nắng qua ô cửa trên sàn): 0…1 — ba điểm dưới chân (giữa, hai bên) có bao nhiêu điểm
  // nằm trong vệt, nhân với độ che của mây.
  const inside = (poly, x, z) => { let hit = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit; } return hit; };
  const sunAt = (x, z) => {
    if (!S.lighting || !S.lighting.patches.length) return 0;
    const hits = [-45, 0, 45].filter((dx) => S.lighting.patches.some((poly) => inside(poly, x + dx, z))).length;
    return hits / 3 * S.lighting.cloud * sunFade();
  };

  // Ánh sáng tại một điểm: { level (độ sáng, 1 = bình thường), warm (0…1 sắc ấm) } — cho nhân vật, đồ vật.
  const lightAt = (x, y, z, self = null) => {
    const mood = S.lighting.mood;
    let level = 1 - (mood.dark > 0.1 ? mood.dark * 0.85 : 0), warm = mood.warm;
    const sources = [];
    for (const lamp of S.lighting.lamps) {
      if (lamp.level <= 0.001) continue;
      const d = Math.hypot(lamp.x - x, lamp.y - y, lamp.z - z);
      if (d >= lamp.range * 1.15) continue;
      const k = lamp.power * lamp.level * (lamp.pulse ?? 1) * Math.pow(1 - d / (lamp.range * 1.15), 1.5);
      // Đèn ở TRƯỚC nhân vật (phía máy quay) chiếu vào mặt ta thấy; đèn ở SAU lưng chỉ cho viền sáng — không làm mặt trước
      // sáng bừng (bà đứng trước cây đèn lúc chiều: tóc cháy trắng, cảnh thử đợt 19).
      const front = clamp(0.55 + 0.45 * (lamp.z - z) / Math.max(1, Math.hypot(lamp.x - x, lamp.z - z)), 0.15, 1);
      // Trời TỐI: đèn là nguồn sáng duy nhất — người đứng trong vũng đèn phải sáng nổi lên hơn mặt đất tối quanh đó (đợt 25:
      // "cậu bé dưới đèn không sáng hơn nền").
      const night = mood.dark > 0.3 && lamp.kind !== 'screen' ? 1.7 : 1;
      level += k * 0.6 * night * (0.35 + 0.65 * front); warm += k * lamp.warmth * (0.4 + 0.6 * front);
      sources.push({ k, x: lamp.x, y: lamp.y, z: lamp.z, rgb: lamp.rgb, front, screen: lamp.kind === 'screen' });
    }
    // ĐÈN SOI / ĐÈN PIN trong tay người (`examine`, `shine`): nguồn sáng nhỏ, gần, trắng — đi theo bàn tay. Con vật ở cuối
    // luồng sáng bừng lên một phía (Gemini đợt 20: luồng đèn khám như miếng dán, không chiếu sáng gì).
    for (const torch of S.lighting.torches) {
      if (torch.owner === self) continue;
      const d = beamGap(torch, x, y, z);
      if (d >= torch.range) continue;
      const k = torch.power * Math.pow(1 - d / torch.range, 1.2);
      level += k * 0.35 * (mood.dark > 0.3 ? 1.6 : 1); warm += k * 0.03;
      sources.push({ k, x: torch.x, y: torch.y, z: torch.z + 30, rgb: torch.rgb, front: 0.9, torch: true });
    }
    // CỬA SỔ ban ngày / chiều cũng là một nguồn sáng: ánh trời xanh nhạt (chiều: màu nắng) hắt vào từ phía ô cửa — người
    // đứng giữa cửa sổ và cây đèn có HAI phía hai màu (ấm / lạnh), không còn một phía sáng một phía tối.
    if (mood.sun) for (const win of S.lighting.windows) {
      const wx = win.x + win.width / 2, wy = win.y - win.height / 2, d = Math.hypot(wx - x, wy - y, win.z - z);
      if (d >= 1500) continue;
      sources.push({ k: 0.42 * S.lighting.cloud * sunFade() * (1 - d / 1500), x: wx, y: wy, z: win.z + 40, rgb: mood.name === 'evening' ? mood.sunColor : '206,226,255', window: true });
    }
    // Đứng TRONG VỆT NẮNG: nắng chiếu thẳng lên người — sáng và ấm hẳn lên, viền nắng gắt phía cửa sổ (Gemini đợt 19: mèo
    // ngồi giữa vệt nắng mà tối xỉn như dán lên).
    const sunlit = sunAt(x, z);
    if (sunlit > 0) {
      const sun = norm(mood.sun);
      level += 0.16 * sunlit; warm += (mood.name === 'evening' ? 0.16 : 0.06) * sunlit;
      sources.push({ k: 0.75 * sunlit, x: x - sun[0] * 1000, y: y - sun[1] * 1000, z: z - sun[2] * 1000, rgb: mood.sunColor, front: 0.6, sun: true });
    }
    // Đêm mà KHÔNG đèn nào sáng (mất điện): chỉ còn ánh trời đêm qua cửa sổ — người và vật chìm hẳn vào bóng tối (Gemini đợt
    // 20: mất điện mà bà vẫn sáng rõ như có đèn rọi).
    if (mood.dark > 0.5) { const lit = S.lighting.lamps.reduce((sum, lamp) => sum + (lamp.kind === 'screen' ? 0.4 : 1) * lamp.level, 0); level -= 0.2 * clamp(1 - lit, 0, 1); }
    sources.sort((a, b) => b.k - a.k);
    let rim = sources[0] || null;
    // Nắng chiều: viền sáng cam phía mặt trời (ngược phía bóng đổ).
    if (mood.name === 'evening' && sunFade() > 0.2 && (!rim || rim.k < 0.35)) { rim = { k: 0.55 * sunFade(), x: x - mood.sun[0] * 1000, y: y - mood.sun[1] * 1000, z: z - mood.sun[2] * 1000, rgb: mood.sunColor }; sources.unshift(rim); }
    // Trần 1,06: sáng hơn nữa thì nhân vật đứng sát đèn bạc trắng như cháy sáng (đo ở phòng khách đêm, đợt 16).
    return { level: clamp(level, 0.22, 1.06), warm: clamp(warm, 0, 0.42), rim, sources };
  };

  // MÀU SÀN (để tính ánh sáng phản xạ): màu nền của dải sàn, hay màu đầu tiên trong hoạ tiết của nó. Đo một lần.
  let floorTone = null;
  const floorRgb = () => {
    if (floorTone) return floorTone;
    const strip = backdrop.find((el) => el.dataset.floor !== undefined);
    if (!strip) return (floorTone = '200,200,200');
    const style = getComputedStyle(strip), solid = style.backgroundColor.match(/[\d.]+/g);
    if (solid && (solid.length < 4 || +solid[3] > 0.1)) return (floorTone = solid.slice(0, 3).join(','));
    const hex = style.backgroundImage.match(/#([0-9a-f]{3,6})\b/i), rgb = style.backgroundImage.match(/rgba?\(([^)]+)\)/);
    return (floorTone = rgb ? rgb[1].split(',').slice(0, 3).map((v) => Math.round(+v)).join(',') : hex ? rgbOf(hex[0]) : '200,200,200');
  };
  // ÁNH SÁNG PHẢN XẠ lên phần dưới một nhân vật: sàn càng được chiếu sáng (vệt nắng dưới chân, đèn gần, ban ngày) thì càng hắt
  // màu của nó lên chân, váy, bụng con vật. Đứng trong vệt nắng: màu sàn pha màu nắng. { rgb, amount }.
  const bounceAt = (actor, L) => {
    const mood = S.lighting.mood, sunlit = sunAt(actor.where, actor.spot.z);
    let amount = mood.name === 'day' ? 0.1 : mood.name === 'evening' ? 0.08 : 0.03;
    amount += 0.32 * sunlit;
    for (const src of L.sources) if (!src.window && !src.sun) amount += 0.1 * src.k;
    if (actor.spot.y > 0) amount *= 0.6;                                              // trên mặt bàn: mặt bàn nhỏ, hắt ít hơn sàn
    const floor = floorRgb().split(',').map(Number), sun = (mood.sunColor || '255,255,255').split(',').map(Number), mix = clamp(sunlit * 0.6, 0, 0.6);
    return { rgb: floor.map((v, i) => Math.round(lerp(v, sun[i], mix))).join(','), amount: clamp(amount, 0, 0.42) };
  };

  // BÓNG GẬP LÊN TƯỜNG: bóng dài trên sàn chạm chân một bức tường thì phần còn lại LEO LÊN tường (bóng thật không xuyên
  // tường mà đi vào phòng bên). Tia từ (x, z) theo `angle` dài `length`: bức tường gần nhất nó chạm (mặt quay vào phòng).
  // Trả về { t (quãng trên sàn), wall, at [x, z] } hay null.
  const wallHit = (x, z, angle, length) => {
    const dx = Math.cos(angle), dz = Math.sin(angle);
    let best = null;
    for (const f of surfaces) {
      if (f.kind !== 'wall' || dx * f.n[0] + dz * f.n[2] >= -0.05) continue;
      const ux = f.u[0], uz = f.u[2], ox = f.origin[0], oz = f.origin[2], det = dx * -uz - dz * -ux;
      if (Math.abs(det) < 1e-6) continue;
      const rx = ox - x, rz = oz - z, t = (rx * -uz - rz * -ux) / det, along = (dx * rz - dz * rx) / det;
      if (t <= 4 || t >= length - 4 || along < 0 || along > f.width) continue;
      if (!best || t < best.t) best = { t, wall: f, at: [x + dx * t, z + dz * t] };
    }
    return best;
  };
  // Các mốc chuyển sắc theo px dọc bóng (dài `length`), dời đi `offset` — phần trên sàn và phần trên tường nối liền một dải.
  const ramp = (stops, length, offset = 0) => stops.map(([alpha, at]) => `rgba(${alpha}) ${(at * length - offset).toFixed(1)}px`).join(', ');
  // Phần bóng trên tường: dựng đứng sát mặt tường ở chỗ chạm, rộng `across`, cao bằng quãng còn lại.
  const climbOn = (el, hit, across, rise, background, opacity) => {
    const f = hit.wall, turn = -Math.atan2(f.u[2], f.u[0]) * 180 / Math.PI;
    // Đầu bóng trên tường BO TRÒN (bóng của đầu người / mép hộp), không phải một khối chữ nhật cạnh thẳng (đợt 21).
    Object.assign(el.style, { width: across.toFixed(1) + 'px', height: rise.toFixed(1) + 'px', opacity, background, borderRadius: '50% 50% 12% 12% / 34% 34% 6% 6%',
      transform: `translate3d(${hit.at[0].toFixed(1)}px, ${(-rise).toFixed(1)}px, ${hit.at[1].toFixed(1)}px) rotateY(${turn.toFixed(2)}deg) translate3d(${(-across / 2).toFixed(1)}px, 0px, 1.6px)` });
  };
  const climbEl = (blur) => {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none;filter:blur(${blur}px);opacity:0`;
    layer(0).appendChild(el);
    return el;
  };

  // Bóng đổ dài trên sàn của một nhân vật, ngược phía mỗi đèn / nắng chiều (mảng phần tử, dùng lại qua các khung).
  const castShadows = (actor, rank, seen) => {
    const casts = [];
    if (S.lighting && seen > 0.05 && !actor.lamp) {
      const tall = actor.height * 0.85, x = actor.where, z = actor.spot.z, y = actor.spot.y;
      for (const lamp of S.lighting.lamps) {
        if (lamp.level <= 0.001 || lamp.kind === 'screen' || lamp.y <= tall + y + 20) continue;
        const dx = x - lamp.x, dz = z - lamp.z, flat = Math.hypot(dx, dz), d = Math.hypot(flat, lamp.y - y);
        if (d >= lamp.range * 1.3 || flat < 1) continue;
        const strength = lamp.power * lamp.level * (1 - d / (lamp.range * 1.3));
        // Lúc chạng vạng nắng là nguồn chính — bóng theo đèn đường chỉ nhạt, không thì bóng con vật đổi phía khi nó đi
        // qua cột đèn (Gemini soát ánh sáng đợt 16).
        // Đêm: bóng theo đèn đường ít nhất dài bằng người và đậm hơn — ngắn quá thì nó nằm ngay dưới chân, hai mô hình chấm đều
        // nói "bóng không đổ ra xa cột đèn" (đợt 25).
        const nightLamp = S.lighting.mood.dark > 0.3;
        casts.push({ angle: Math.atan2(dz, dx), length: clamp(flat * tall / (lamp.y - y - tall), tall * (nightLamp ? 0.9 : 0.25), tall * 2.2), alpha: (S.lighting.mood.name === 'evening' ? 0.3 : 1.8) * strength * seen });       // đêm: bóng theo đèn đường đậm hơn (đợt 23: "bóng nằm ngay dưới chân")
      }
      // ĐÈN PIN rọi vào: bóng đậm đổ ra phía sau, ngược phía bàn tay cầm đèn — rõ nhất khi phòng tối (Gemini đợt 21: "không
      // có bóng con mèo sau luồng đèn").
      for (const torch of S.lighting.torches) {
        if (torch.kind !== 5 || torch.owner === actor) continue;
        const gap = beamGap(torch, x, y + tall * 0.5, z), near = clamp(1 - gap / torch.range, 0, 1);
        if (near <= 0.05) continue;
        const dx = x - torch.hx, dz = (z - torch.z) || 1, flat = Math.hypot(dx, dz), lift = Math.max(30, torch.hy - y - tall * 0.6);
        const dark = clamp((S.lighting.mood.dark - 0.1) / 0.5, 0.25, 1);
        // Hướng bóng chủ yếu SANG NGANG (ngược phía bàn tay trên màn hình): đúng hình học thì nó đổ về phía máy quay, ra ngoài
        // đáy khung — người xem không thấy con vật có bóng (đợt 22).
        // Theo HƯỚNG LUỒNG (bàn tay → điểm rọi), không theo hiệu toạ độ con vật − bàn tay: con vật đứng gần như ngay dưới tay
        // thì hiệu ấy nhỏ, bóng ngả về phía đèn (Gemini đợt 22, lượt 2).
        const along = Math.sign(torch.x - torch.hx) || Math.sign(dx) || 1;
        casts.push({ angle: Math.atan2(0.18, along), length: clamp(flat * tall / lift, tall * 0.8, tall * 2.2), alpha: 0.95 * near * dark * seen });
      }
      // Ô CỬA ban ngày (ánh trời tán xạ): bóng mềm, nhạt, đổ ra xa cửa sổ — về phía máy quay.
      if (S.lighting.mood.sun) for (const win of S.lighting.windows) {
        const wx = win.x + win.width / 2, dx = x - wx, dz = z - win.z, flat = Math.hypot(dx, dz);
        if (flat > 1400 || flat < 1) continue;
        casts.push({ angle: Math.atan2(dz, dx), length: tall * 0.9, alpha: 0.3 * (1 - flat / 1400) * S.lighting.cloud * sunFade() * seen, soft: true });
      }
      const sun = S.lighting.mood.sun, sunlit = sunAt(x, z);
      // Nắng chiều: bóng dài khắp nơi; ĐỨNG TRONG VỆT NẮNG (cả ban ngày): bóng đậm, đổ theo hướng nắng.
      if (sun && (S.lighting.mood.name === 'evening' || sunlit > 0)) casts.push({ angle: Math.atan2(sun[2], sun[0]), length: tall * (S.lighting.mood.name === 'evening' ? 1.7 : 1.3), alpha: Math.max(S.lighting.mood.name === 'evening' ? 0.34 * sunFade() : 0, 0.55 * sunlit) * seen });
    }
    actor.casts = actor.casts || [];
    while (actor.casts.length < casts.length) {
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;left:0;top:0;transform-origin:0 0;border-radius:50%;pointer-events:none;filter:blur(3px)';
      actor.casts.push(el);
    }
    actor.climbs = actor.climbs || [];
    while (actor.climbs.length < actor.casts.length) actor.climbs.push(null);
    actor.casts.forEach((el, n) => {
      const cast = casts[n], up = actor.climbs[n];
      if (!cast) { el.style.opacity = '0'; if (up) up.style.opacity = '0'; return; }
      if (el.parentNode !== layers[rank]) layers[rank].appendChild(el);
      const across = actor.width * 0.26, opacity = Math.min(1, cast.alpha).toFixed(3);
      // Đậm ở gốc, nhạt và nhoè dần về đuôi (bóng thật mềm ra theo khoảng cách — Gemini đợt 20: "bóng quá sắc").
      // BÓNG MỀM THEO KHOẢNG CÁCH (đợt 23): sát chân đậm và sắc, càng xa càng nhạt và nhoè — độ nhoè cả tấm theo chiều dài bóng
      // (bóng dài của vật cao thì đuôi loang rộng), gốc đậm hơn trước.
      const stops = [['0,0,0,.7', 0], ['0,0,0,.42', 0.18], ['0,0,0,.2', 0.45], ['0,0,0,.05', 0.82], ['0,0,0,0', 1]];
      el.style.filter = `blur(${(2 + cast.length * 0.011).toFixed(1)}px)`;
      const hit = !cast.soft && actor.spot.y <= 0 ? wallHit(actor.where, actor.spot.z, cast.angle, cast.length) : null;
      if (hit) {
        // Cao tối đa bằng người: phần còn lại của bóng dài hơn thế là bóng đã quá mờ ở đuôi.
        const rise = Math.min((cast.length - hit.t) * 0.85, actor.height * 0.95), upEl = up || (actor.climbs[n] = climbEl(7));
        climbOn(upEl, hit, across * 1.1, rise, `linear-gradient(to top, ${ramp(stops, cast.length, hit.t)})`, opacity);
      } else if (up && up.style.opacity !== '0') up.style.opacity = '0';
      Object.assign(el.style, { width: (hit ? hit.t + across * 0.1 : cast.length).toFixed(1) + 'px', height: across.toFixed(1) + 'px', opacity,
        borderRadius: hit ? '50% 0 0 50%' : '50%',
        background: cast.soft ? 'radial-gradient(ellipse at 0% 50%, rgba(0,0,0,.4), rgba(0,0,0,0) 70%)' : `linear-gradient(to right, ${ramp(stops, cast.length)})`,
        transform: `translate3d(${actor.where.toFixed(1)}px, ${(-actor.spot.y - 0.7).toFixed(1)}px, ${actor.spot.z.toFixed(1)}px) rotateY(${(-cast.angle * 180 / Math.PI).toFixed(2)}deg) rotateX(90deg) translate(0px, ${(-across / 2).toFixed(1)}px)` });
    });
  };

  // BÓNG DÀI CỦA ĐỒ VẬT (bàn, sofa, kệ): như của nhân vật — ngược phía mỗi đèn cao hơn mặt hộp, theo nắng chiều, và theo
  // nắng khi hộp nằm trong vệt nắng (Gemini soát ánh sáng đợt 19: "hộp nâu giữa vệt nắng không có bóng").
  const boxShadows = () => {
    for (const prop of props) {
      const b = prop.spec;
      if (!b || b.y > 0) continue;
      const cx = b.x + b.width / 2, cz = b.z - b.depth / 2, casts = [], across = Math.max(b.width, b.depth) * 0.9;
      for (const lamp of S.lighting.lamps) {
        if (lamp.level <= 0.001 || lamp.kind === 'screen' || lamp.y <= b.height + 20) continue;
        const dx = cx - lamp.x, dz = cz - lamp.z, flat = Math.hypot(dx, dz), d = Math.hypot(flat, lamp.y);
        if (d >= lamp.range * 1.3 || flat < 1) continue;
        const strength = lamp.power * lamp.level * (1 - d / (lamp.range * 1.3));
        casts.push({ angle: Math.atan2(dz, dx), length: clamp(flat * b.height / (lamp.y - b.height), b.height * 0.6, b.height * 2.5) + across / 2, alpha: (S.lighting.mood.name === 'evening' ? 0.6 : 1.8) * strength });
      }
      const sun = S.lighting.mood.sun, sunlit = sunAt(cx, cz);
      if (sun && (S.lighting.mood.name === 'evening' || sunlit > 0)) casts.push({ angle: Math.atan2(sun[2], sun[0]), length: b.height * (S.lighting.mood.name === 'evening' ? 1.8 : 1.3) + across / 2, alpha: Math.max(S.lighting.mood.name === 'evening' ? 0.6 * sunFade() : 0, 0.75 * sunlit) });
      prop.casts = prop.casts || [];
      while (prop.casts.length < casts.length) {
        const el = document.createElement('div');
        el.style.cssText = 'position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none;filter:blur(5px)';
        layer(0).appendChild(el); prop.casts.push(el);
      }
      prop.climbs = prop.climbs || [];
      prop.casts.forEach((el, n) => {
        const cast = casts[n], up = prop.climbs[n];
        if (!cast || cast.alpha < 0.01) { if (el.style.opacity !== '0') el.style.opacity = '0'; if (up && up.style.opacity !== '0') up.style.opacity = '0'; return; }
        // Đậm ĐỀU tới mép hộp rồi mới nhạt dần: phần dưới thân hộp thì khuất, phần lộ ra ngoài hộp mới là cái người xem thấy —
        // nhạt từ tâm thì tới mép hộp bóng đã gần hết (đợt 22: bàn khám không có bóng).
        const shade = S.lighting.mood.shade, edge = Math.min(0.75, (Math.max(b.width, b.depth) / 2) / cast.length);
        const stops = [[`${shade},.75`, 0], [`${shade},.7`, edge], [`${shade},.32`, edge + (1 - edge) * 0.5], [`${shade},0`, 1]], opacity = Math.min(1, cast.alpha).toFixed(3);
        // Gốc bóng ở TÂM hộp: tính chỗ chạm tường từ tâm, phần trên tường rộng bằng hộp.
        const hit = wallHit(cx, cz, cast.angle, cast.length);
        if (hit) {
          const upEl = up || (prop.climbs[n] = climbEl(8));
          climbOn(upEl, hit, across, Math.min(b.height * 1.6, (cast.length - hit.t) * 0.85), `linear-gradient(to top, ${ramp(stops, cast.length, hit.t)})`, opacity);
        } else if (up && up.style.opacity !== '0') up.style.opacity = '0';
        el.style.filter = `blur(${(3 + cast.length * 0.012).toFixed(1)}px)`;
        Object.assign(el.style, { width: (hit ? hit.t : cast.length).toFixed(1) + 'px', height: across.toFixed(1) + 'px', opacity,
          background: `linear-gradient(to right, ${ramp(stops, cast.length)})`,
          transform: `translate3d(${cx.toFixed(1)}px, -2.2px, ${cz.toFixed(1)}px) rotateY(${(-cast.angle * 180 / Math.PI).toFixed(2)}deg) rotateX(90deg) translate(0px, ${(-across / 2).toFixed(1)}px)` });
      });
    }
  };

  // BÓNG TRÊN TƯỜNG SAU LƯNG: người / con vật đứng gần tường sau làm mảng tường sau lưng tối đi một vệt mềm, lệch ngược
  // phía nguồn sáng chính — đứng sát tường mà tường sau lưng sáng đều thì nhân vật như dán lên ảnh nền.
  const wallShadow = (actor, seen) => {
    const wall = surfaces.find((f) => f.kind === 'wall' && f.n[2] > 0.9);
    const gap = wall ? actor.spot.z - wall.origin[2] : Infinity, reach = 420;
    const strength = S.lighting && wall && actor.width && !actor.lamp ? clamp(1 - gap / reach, 0, 1) * seen : 0;
    if (!actor.wallShade) {
      if (strength <= 0) return;
      actor.wallShade = document.createElement('div');
      actor.wallShade.style.cssText = 'position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none;border-radius:50%;filter:blur(14px)';
      layer(0).appendChild(actor.wallShade);
    }
    const el = actor.wallShade;
    if (strength <= 0) { if (el.style.opacity !== '0') el.style.opacity = '0'; return; }
    const L = lightAt(actor.where, actor.spot.y + actor.height * 0.45, actor.spot.z, actor), src = L.rim;
    // Nguồn sáng ở bên trái thì bóng lệch sang phải, càng xa tường càng lệch và càng loang.
    const shift = src ? clamp((actor.where - src.x) * gap / Math.max(200, Math.abs(src.z - wall.origin[2])), -160, 160) : 0;
    const w = actor.width * (0.55 + gap / 900), h = actor.height * 0.8;
    Object.assign(el.style, { width: w.toFixed(1) + 'px', height: h.toFixed(1) + 'px', opacity: (strength * (S.lighting.mood.dark > 0.2 ? 0.5 : 0.34)).toFixed(3),
      background: `radial-gradient(closest-side, rgba(${S.lighting.mood.shade},.55), rgba(${S.lighting.mood.shade},0))`,
      transform: `translate3d(${(actor.where + shift - w / 2).toFixed(1)}px, ${(-actor.spot.y - h * 0.95).toFixed(1)}px, ${(wall.origin[2] + 1.5).toFixed(1)}px)` });
  };

  // ĐÈN TRONG TAY: người đang cầm đèn soi (gadget 1) / đèn pin (gadget 5) — đọc chỗ điểm rọi (`data-tip`) và bàn tay trong
  // hệ toạ độ của chính SVG (không phụ thuộc host đang đặt ở đâu trên màn hình), đổi ra toạ độ bối cảnh.
  const toSet = (actor, ux, uy) => {
    const size = (actor.rig.constructor && actor.rig.constructor.KHUNG) || { w: 400, h: 470 }, unit = actor.height / size.h;
    return [actor.spot.x + (ux - size.w / 2) * unit, actor.spot.y + ((actor.ground || 1) * size.h - uy) * unit];
  };
  const svgPoint = (rig, element) => {
    const ctm = element && element.getScreenCTM && element.getScreenCTM(), root = rig.svg.getScreenCTM();
    if (!ctm || !root) return null;
    const p = new DOMPoint(+(element.getAttribute('cx') || 0), +(element.getAttribute('cy') || 0)).matrixTransform(ctm).matrixTransform(root.inverse());
    return [p.x, p.y];
  };
  // Khoảng cách từ một điểm tới LUỒNG SÁNG (đoạn từ bàn tay tới quá điểm rọi một nửa) — vật nằm dọc luồng đều được rọi.
  const beamGap = (torch, x, y, z) => {
    const ext = torch.kind === 5 ? 1.4 : 0.5, ax = torch.hx, ay = torch.hy, bx = torch.x + (torch.x - torch.hx) * ext, by = torch.y + (torch.y - torch.hy) * ext;
    const vx = bx - ax, vy = by - ay, t = clamp(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1), 0, 1);
    // Chiều sâu tính nhẹ (0,15): luồng là một lớp trên màn hình — con vật gần máy hơn người cầm đèn vẫn nằm trong luồng
    // (Gemini đợt 21: rọi thẳng vào mặt mà con mèo không phản ứng).
    return Math.hypot(ax + vx * t - x, ay + vy * t - y, (torch.z - z) * 0.15);
  };
  // Hình con của dụng cụ trong tay theo số (`data-gadget`). Không dùng chuỗi template trong querySelector: bộ đóng gói HTML
  // của HyperFrames vấp phải nó (tools/lint-examples.sh).
  const gadgetOf = (box, kind) => [...box.children].find((child) => +child.getAttribute('data-gadget') === kind);
  const findTorches = () => {
    const torches = [];
    for (const actor of actors) {
      const rig = actor.rig;
      if (!rig || !rig.el || !rig.s || !actor.height || actor.host.style.display === 'none' || !actor.host.contains(rig.svg)) continue;
      for (const side of ['L', 'R']) {
        const kind = Math.round(rig.s['gadget' + side] || 0), box = rig.el['gadget' + side];
        if ((kind !== 1 && kind !== 5) || !box) continue;
        const tip = svgPoint(rig, gadgetOf(box, kind).querySelector('[data-tip]')), hand = svgPoint(rig, rig.el['coTay' + side]);
        if (!tip || !hand) continue;
        const [x, y] = toSet(actor, ...tip), [hx, hy] = toSet(actor, ...hand);
        torches.push({ owner: actor, kind, side, x, y, z: actor.spot.z, hx, hy, power: kind === 5 ? 1 : 0.75, range: kind === 5 ? 320 : 200, rgb: '255,250,230' });
      }
    }
    S.lighting.torches = torches;
  };
  // NHẮM ĐÈN PIN Ở TỪNG KHUNG: góc tay do `shine` đặt lúc dựng timeline (theo góc máy lúc ấy); máy cắt sang góc khác thì luồng
  // lệch khỏi con vật (đợt 24). Ở đây đo lại trên màn hình — mặt kính → mặt con vật — và xoay bắp tay cho luồng chĩa đúng,
  // cộng độ lệch đo được vào góc đang vẽ.
  const aimTorch = (torch) => {
    const rig = torch.owner.rig, aim = rig.shineAim, to = aim && aim.target && aim.target.aimTo;
    if (torch.kind !== 5 || !to || !rig.el || aim.side !== torch.side) return;
    const pet = actors.find((actor) => actor.rig === to);
    if (!pet || !pet.width || typeof to.shotBox !== 'function') return;
    const group = gadgetOf(rig.el['gadget' + torch.side], 5), lensEl = group && group.querySelector('[data-lens]'), tipEl = group && group.querySelector('[data-tip]');
    // Đo THẲNG TRÊN MÀN HÌNH (ma trận màn hình của từng phần tử SVG) — đổi qua toạ độ bối cảnh rồi chiếu lại thì lệch tới 18°
    // khi SVG không lấp kín đúng tỉ lệ host (đo ở cảnh thử đợt 25).
    const screenOf = (element, x, y) => { const ctm = element && element.getScreenCTM && element.getScreenCTM(); return ctm ? new DOMPoint(x, y).matrixTransform(ctm) : null; };
    const l = lensEl && screenOf(lensEl, +lensEl.getAttribute('cx'), +lensEl.getAttribute('cy')), t = tipEl && screenOf(tipEl, +tipEl.getAttribute('cx'), +tipEl.getAttribute('cy'));
    const box = to.shotBox('face'), f = screenOf(to.svg, box.x + box.width / 2, box.y + box.height / 2);
    if (!l || !t || !f) return;
    const now = Math.atan2(t.y - l.y, t.x - l.x), want = Math.atan2(f.y - l.y, f.x - l.x);
    let delta = (want - now) * 180 / Math.PI;
    delta = ((delta + 540) % 360) - 180;
    // Độ lệch đo trên tư thế ĐANG VẼ (giá trị `bat` hiện có — của động tác, hay lần chỉnh trước nếu động tác không đặt lại):
    // cộng thẳng vào đó, hội tụ sau một hai khung. Tay phải: luồng chúc xuống khi `bat` giảm; tay trái ngược lại.
    const key = 'bat' + torch.side;
    const next = clamp(rig.s[key] + clamp(torch.side === 'R' ? -delta : delta, -60, 60), -15, 172);
    if (Math.abs(rig.s[key] - next) > 0.05) { rig.s[key] = next; rig.render(); }
  };

  // CON VẬT BỊ RỌI ĐÈN VÀO MẶT nheo mắt, đồng tử co lại. Ghi đè trạng thái mắt của rig như cách quay bù theo góc máy (xem
  // `huong` ở cuối `update`): nhận ra giá trị do động tác đặt bằng cách so với lần ghi trước — không cộng dồn.
  const squint = (actor) => {
    const rig = actor.rig;
    if (!rig || typeof rig.seatY === 'function' || !rig.s || typeof rig.s.matY !== 'number' || typeof rig.shotBox !== 'function') return;
    let glare = 0;
    if (S.lighting.torches.length && actor.height) {
      const box = rig.shotBox('face'), [fx, fy] = toSet(actor, box.x + box.width / 2, box.y + box.height / 2), reach = Math.max(90, 1.4 * box.width * actor.height / 470);
      // Đo TRÊN MÀN HÌNH: luồng sáng là một nét vẽ trên màn hình (nhắm theo hình chiếu — `aimAt`), con vật gần máy hơn người
      // cầm đèn thì trong không gian nó không nằm trên đường thẳng của luồng dù trên hình luồng rọi trúng mặt (đợt 24).
      const face = S.set.project(fx, fy, actor.spot.z), r = Math.max(12, reach * face.scale);
      for (const torch of S.lighting.torches) {
        if (torch.owner === actor) continue;
        const a = S.set.project(torch.hx, torch.hy, torch.z), tip = S.set.project(torch.x, torch.y, torch.z), ext = torch.kind === 5 ? 1.4 : 0.5;
        const bx = tip.x + (tip.x - a.x) * ext, by = tip.y + (tip.y - a.y) * ext, vx = bx - a.x, vy = by - a.y;
        const t = clamp(((face.x - a.x) * vx + (face.y - a.y) * vy) / (vx * vx + vy * vy || 1), 0, 1), gap = Math.hypot(a.x + vx * t - face.x, a.y + vy * t - face.y);
        glare = Math.max(glare, clamp(1.4 - gap / r, 0, 1) * (torch.kind === 5 ? 1 : 0.85));
      }
    }
    const eye = actor.eye || (actor.eye = { wrote: null, base: null });
    const own = eye.wrote && rig.s.matY === eye.wrote[0] && rig.s.dongTu === eye.wrote[1] ? eye.base : [rig.s.matY, rig.s.dongTu];
    eye.base = own;
    const next = glare > 0.02 ? [Math.max(own[0], Math.min(0.8, 0.85 * glare)), Math.min(own[1], 1 - 0.5 * glare)] : own;
    eye.wrote = next;
    if (rig.s.matY !== next[0] || rig.s.dongTu !== next[1]) { rig.s.matY = next[0]; rig.s.dongTu = next[1]; rig.render(); }
  };
  // VŨNG SÁNG của đèn pin khi phòng tối: tia đi từ bàn tay qua điểm rọi — chạm sàn thì một vệt elip sáng trên sàn, đi ngang
  // thì một quầng tròn trên tường sau. Ban ngày không thấy.
  const torchPools = () => {
    const dark = clamp((S.lighting.mood.dark - 0.15) / 0.4, 0, 1), wall = surfaces.find((f) => f.kind === 'wall' && f.n[2] > 0.9);
    const beams = S.lighting.torches.filter((torch) => torch.kind === 5);
    while (S.lighting.pools.length < beams.length) {
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none;border-radius:50%;filter:blur(8px)';
      layer(0).appendChild(el); S.lighting.pools.push(el);
    }
    S.lighting.pools.forEach((el, n) => {
      const torch = beams[n];
      if (!torch || dark < 0.02) { if (el.style.opacity !== '0') el.style.opacity = '0'; return; }
      const dx = torch.x - torch.hx, dy = torch.y - torch.hy, len = Math.hypot(dx, dy) || 1;
      const glow = `radial-gradient(closest-side, rgba(${torch.rgb},.85), rgba(${torch.rgb},.4) 55%, rgba(${torch.rgb},0))`;
      if (dy / len < -0.25 && torch.hy > 0) {
        const fx = torch.hx + dx * (torch.hy / -dy), w = 300, d = 150;
        Object.assign(el.style, { width: w + 'px', height: d + 'px', background: glow, opacity: (0.75 * dark).toFixed(3),
          transform: `translate3d(${(fx - w / 2).toFixed(1)}px, -1.2px, ${(torch.z - d / 2).toFixed(1)}px) rotateX(90deg)` });
      } else if (wall) {
        const wx = torch.x + dx / len * 260, wy = clamp(torch.y + dy / len * 260, 60, 900), r = 120 + (torch.z - wall.origin[2]) * 0.18;
        Object.assign(el.style, { width: (2 * r).toFixed(1) + 'px', height: (2 * r).toFixed(1) + 'px', background: glow, opacity: (0.6 * dark).toFixed(3),
          transform: `translate3d(${(wx - r).toFixed(1)}px, ${(-wy - r).toFixed(1)}px, ${(wall.origin[2] + 2).toFixed(1)}px)` });
      }
    });
  };

  // LUỒNG SÁNG TRÊN MÀN HÌNH: vẽ lại luồng của đèn trong tay thành một lớp phủ (hoà màu `screen`) trên mọi nhân vật — luồng
  // vẽ trong SVG của người cầm đèn bị độ tối, lớp đổ bóng của chính người ấy phủ lên thành một vệt xám (cảnh thử đợt 21).
  const beamOverlays = () => {
    S.lighting.beams = S.lighting.beams || [];
    const box = view.getBoundingClientRect(), sx = view.clientWidth / (box.width || 1), sy = view.clientHeight / (box.height || 1);
    const live = [];
    for (const torch of S.lighting.torches) {
      const rig = torch.owner.rig, group = gadgetOf(rig.el['gadget' + torch.side], torch.kind);
      for (const el of group.querySelectorAll('[data-beam]')) if (el.style.display !== 'none') el.style.display = 'none';
      const centreOf = (el) => { const r = el.getBoundingClientRect(); return [(r.left + r.width / 2 - box.left) * sx, (r.top + r.height / 2 - box.top) * sy]; };
      // Luồng đi từ MẶT KÍNH của đèn (`data-lens`) qua điểm rọi (`data-tip`).
      const tip = centreOf(group.querySelector('[data-tip]')), from = centreOf(group.querySelector('[data-lens]'));
      const dx = tip[0] - from[0], dy = tip[1] - from[1], len = Math.hypot(dx, dy);
      if (len < 4) continue;
      // Đèn soi nhỏ: phóng to hơn tỉ lệ thật, không thì giữa phòng khám sáng nó biến mất (Gemini đợt 21).
      // Đèn pin: luồng dài gần gấp đôi khoảng tay → điểm rọi, nhạt dần — chiếu tới con vật ở xa (đợt 23).
      const reach = len * (torch.kind === 5 ? 1.9 : 1.5), wide = reach * (torch.kind === 5 ? 0.5 : 0.8);
      const night = clamp((S.lighting.mood.dark - 0.1) / 0.5, 0, 1), strength = (torch.kind === 5 ? 0.55 : 1) + 0.4 * night;
      live.push({ from, angle: Math.atan2(dy, dx), reach, wide, strength, night, kind: torch.kind, hidden: torch.owner.host.style.display === 'none', z: +(torch.owner.host.style.zIndex || 1) });
    }
    while (S.lighting.beams.length < live.length) {
      const el = document.createElement('div'), spot = document.createElement('div');
      el.style.cssText = 'position:absolute;left:0;top:0;transform-origin:0 50%;pointer-events:none;mix-blend-mode:screen';
      spot.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;mix-blend-mode:screen;border-radius:50%;filter:blur(4px)';
      const flare = spot.cloneNode();
      view.appendChild(el); view.appendChild(spot); view.appendChild(flare); S.lighting.beams.push({ el, spot, flare });
    }
    S.lighting.beams.forEach(({ el, spot, flare }, n) => {
      const b = live[n];
      if (!b || b.hidden) { el.style.display = 'none'; spot.style.display = 'none'; flare.style.display = 'none'; return; }
      // QUẦNG Ở MẶT KÍNH: đầu đèn chói, loá ra một vòng nhỏ.
      // Phòng SÁNG: hoà `screen` trên nền trắng thì không còn gì — đèn soi ban ngày thấy được nhờ chấm loá ở đầu đèn có một
      // quầng xám rất mảnh quanh nó (tương phản với nền sáng) và điểm rọi trắng phủ thường lên lông con vật (đợt 22).
      const day = 1 - b.night, f = Math.max(10, b.wide * 0.32) * (1 + 0.4 * day);
      flare.style.mixBlendMode = day > 0.5 ? 'normal' : 'screen'; spot.style.mixBlendMode = day > 0.5 ? 'normal' : 'screen';
      Object.assign(flare.style, { display: '', zIndex: 8992, width: (2 * f).toFixed(1) + 'px', height: (2 * f).toFixed(1) + 'px',
        background: `radial-gradient(closest-side, rgba(255,255,252,${(0.95 * b.strength).toFixed(3)}), rgba(255,250,225,${(0.55 * b.strength).toFixed(3)}) 30%, rgba(255,246,210,${(0.2 * b.strength).toFixed(3)}) 55%, rgba(110,110,100,${(0.14 * day).toFixed(3)}) 72%, rgba(110,110,100,0))`,
        transform: `translate(${(b.from[0] - f).toFixed(1)}px, ${(b.from[1] - f).toFixed(1)}px)` });
      const a = b.strength;
      // Mép luồng NHOÈ theo cỡ luồng trên màn hình (Gemini đợt 21: "tam giác trắng cạnh sắc"); quầng sáng ở mặt kính đèn.
      Object.assign(el.style, { display: '', zIndex: 8990, width: b.reach.toFixed(1) + 'px', height: b.wide.toFixed(1) + 'px', filter: `blur(${Math.max(2, b.wide * 0.07).toFixed(1)}px)`,
        boxShadow: 'none',
        clipPath: 'polygon(0 45%, 100% 0, 100% 100%, 0 55%)',
        background: `linear-gradient(to right, rgba(255,251,228,${(0.8 * a).toFixed(3)}), rgba(255,246,206,${(0.34 * a).toFixed(3)}) 45%, rgba(255,242,180,0))`,
        transform: `translate(${b.from[0].toFixed(1)}px, ${(b.from[1] - b.wide / 2).toFixed(1)}px) rotate(${(b.angle * 180 / Math.PI).toFixed(2)}deg)` });
      // ĐIỂM RỌI: quầng trắng nơi luồng gặp vật (điểm `data-tip`, 87 % luồng).
      const r = b.wide * 0.42, at = b.kind === 5 ? 0.62 : 0.87, cx = b.from[0] + Math.cos(b.angle) * b.reach * at, cy = b.from[1] + Math.sin(b.angle) * b.reach * at;
      Object.assign(spot.style, { display: '', zIndex: 8991, width: (2 * r).toFixed(1) + 'px', height: (2 * r).toFixed(1) + 'px',
        background: `radial-gradient(closest-side, rgba(255,255,245,${((b.night > 0.5 ? 0.75 : 0.55) * a).toFixed(3)}), rgba(255,248,214,${(0.3 * a).toFixed(3)}) 55%, rgba(255,244,190,0))`,
        transform: `translate(${(cx - r).toFixed(1)}px, ${(cy - r).toFixed(1)}px)` });
    });
  };


  return { MOODS, LENS, lerp, rgbaOf, mixMood, sunFade, norm, dot, rgbOf, lightSurface, inside, sunAt, lightAt, floorRgb, bounceAt, wallHit, ramp, climbOn, climbEl, castShadows, boxShadows, wallShadow, toSet, svgPoint, beamGap, gadgetOf, findTorches, aimTorch, squint, torchPools, beamOverlays };
}
