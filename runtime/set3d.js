// set3d.js — BỐI CẢNH 3D cho nhân vật 2D: phòng dựng bằng mặt phẳng CSS 3D, máy quay là một bộ số tween được,
// nhân vật vẫn là rig SVG phẳng luôn quay mặt về ống kính.
//
// HAI ĐIỀU QUYẾT ĐỊNH CÁCH LÀM (đo trên bản thử, xem CHANGELOG 0.39.0):
//
//  1. NHÂN VẬT KHÔNG NẰM TRONG KHÔNG GIAN 3D. Đặt host của rig vào ngữ cảnh `preserve-3d` thì Chrome vẽ nó ra ảnh một
//     lần rồi, chừng nào phép biến đổi còn đổi từng khung (máy quay đang chạy), chỉ co kéo ảnh ấy: vào cận cảnh là vỡ
//     hạt. Không có cách nào ép nó vẽ lại từ trong trang. Nên ở đây mỗi khung TỰ TÍNH phép chiếu của điểm đặt chân và
//     đặt host như một phần tử 2D (translate + scale) — đúng kiểu biến đổi mà các cảnh 2D vẫn dùng, luôn nét.
//
//  2. CHE KHUẤT BẰNG CÁCH XẾP LỚP. Phần tử 2D không chung bộ đệm chiều sâu với các mặt phẳng 3D. Nên bối cảnh được
//     dựng thành nhiều LỚP chồng nhau, cùng một phép biến đổi máy quay: lớp 0 chứa nền (sàn, tường) và mọi đồ vật ở
//     sau tất cả nhân vật; lớp k chứa những đồ vật nằm GIỮA nhân vật thứ k và nhân vật kế tiếp gần máy hơn. Nhân vật
//     xen giữa các lớp ấy theo `z-index`. Che khuất vì thế tính theo CẢ đồ vật (tâm của nó), không theo từng điểm ảnh.
//
//  3. MÁY QUAY Ở NGANG TẦM MẮT. Nhân vật vẽ ngang tầm mắt và luôn đứng thẳng; máy càng chúc xuống thì càng lộ ra đó
//     là một tấm bìa dựng trên sàn (bản thử có góc isometric chúc 35°: nhìn thấy rõ là hỏng). Nên góc chúc bị giới
//     hạn ở `CAMERA_LIMITS.pitch`, và máy không vòng quá `CAMERA_LIMITS.yaw` — rig chỉ xoay được từ chính diện tới nghiêng hẳn, không
//     có mặt sau. Muốn nhìn bao quát cả phòng thì dùng `OVERVIEW`: lùi xa với ống kính dài, gần như không phối cảnh,
//     góc chúc vẫn thấp — kiểu toàn cảnh của sân khấu, không phải góc nhìn từ trên cao.
//
// Hệ toạ độ của bối cảnh: x sang phải, z về phía người xem (âm là lùi vào trong), y = 0 là sàn và y DƯƠNG LÀ LÊN CAO
// (ngược với CSS; mô-đun này tự đổi dấu). Đơn vị là px ở tỉ lệ 1 : 1 tại mặt phẳng tiêu cự.

import { PROP_FRAME } from './props.js';
import { createLighting } from './lighting.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const CAMERA_KEYS = ['yaw', 'pitch', 'distance', 'lens', 'x', 'y', 'z', 'zoom', 'blur'];

/** Giới hạn của máy quay: góc chúc (độ, âm là ngước lên) và góc vòng sang hai bên (độ). */
export const CAMERA_LIMITS = Object.freeze({ pitch: [-8, 15], yaw: 60 });

/**
 * TOÀN CẢNH: ống kính rất dài (gần như không phối cảnh), lùi xa tương ứng, chúc 14°. Ghép với `x y z` (điểm ngắm, thường
 * là giữa phòng) và `zoom` cho vừa khung: `set.cut({ ...OVERVIEW, y: 280, z: -450, zoom: 0.95 })`.
 */
export const OVERVIEW = Object.freeze({ pitch: 14, lens: 5000, distance: 5000 });

// Ngừng hẳn khi kịch bản đặt máy quay ra ngoài giới hạn — một khung hình hỏng lọt vào video thì không ai thấy lỗi.
function checkCamera(values, where) {
  for (const key of Object.keys(values)) {
    if (key === 'iso') throw new Error(`[character] ${where}: there is no isometric camera any more — a view from above shows the characters are flat cards. Use OVERVIEW (a long lens at a low angle)`);
    if (!CAMERA_KEYS.includes(key)) throw new Error(`[character] ${where}: unknown camera key "${key}" (${CAMERA_KEYS.join(', ')})`);
    if (typeof values[key] !== 'number' || !Number.isFinite(values[key])) throw new Error(`[character] ${where}: camera "${key}" must be a number`);
  }
  if ('pitch' in values && (values.pitch < CAMERA_LIMITS.pitch[0] || values.pitch > CAMERA_LIMITS.pitch[1]))
    throw new Error(`[character] ${where}: pitch ${values.pitch}° is outside ${CAMERA_LIMITS.pitch[0]}…${CAMERA_LIMITS.pitch[1]}° — from higher up the characters read as cards standing on the floor`);
  if ('yaw' in values && Math.abs(values.yaw) > CAMERA_LIMITS.yaw)
    throw new Error(`[character] ${where}: yaw ${values.yaw}° is beyond ±${CAMERA_LIMITS.yaw}° — the characters have no back to show. Cut to another angle instead`);
  if ('lens' in values && values.lens < 400) throw new Error(`[character] ${where}: lens ${values.lens} is too short (at least 400)`);
  if ('distance' in values && values.distance <= 50) throw new Error(`[character] ${where}: distance must be more than 50`);
  if ('blur' in values && (values.blur < 0 || values.blur > 30)) throw new Error(`[character] ${where}: blur ${values.blur} must be within 0…30`);
}

/**
 * Dựng một bối cảnh 3D trong `view` (một phần tử có kích thước, thường là một `.clip` phủ kín khung hình).
 *   origin   [x, y] trong `view` — điểm mà máy quay ngắm tới sẽ rơi vào (mặc định: giữa bề ngang, 57% bề cao)
 *   camera   bộ số ban đầu của máy quay (xem `camera` bên dưới)
 */
export function createSet(view, { origin = null, camera: initial = {} } = {}) {
  if (!view || !view.appendChild) throw new Error('[character] createSet(view): view must be an element');
  if (getComputedStyle(view).position === 'static') view.style.position = 'relative';
  view.style.overflow = 'hidden';

  // MÁY QUAY. Điểm ngắm (x, y, z) luôn rơi vào `origin`. `distance` là khoảng cách từ mắt tới điểm ngắm, `lens` là tiêu
  // cự (px): distance = lens thì vật ở điểm ngắm hiện đúng cỡ 1 : 1; distance nhỏ hơn là vào gần. `zoom` phóng cả hình.
  // `yaw` dương = máy quay vòng sang PHẢI của cảnh; `pitch` dương = chúc xuống. Giới hạn: `CAMERA_LIMITS`.
  //
  // MÁY QUAY LÀ HÀM CỦA THỜI GIAN. `base` là máy quay lúc đầu (đặt bằng `look`); mỗi `move` / `cut` là một MỐC đặt vào
  // timeline, và mỗi khung `update()` tính lại máy quay từ đầu: đi qua các mốc theo thứ tự thời gian, áp mốc nào đã tới
  // (mốc đang chạy thì pha theo tiến độ). Không dựa vào GSAP để "trả lại" giá trị khi tua lùi: một `gsap.set` đặt trong
  // timeline ghi lại giá trị ban đầu của nó lúc được dựng, và hai lần cắt máy liền nhau ghi chéo giá trị của nhau —
  // bộ dựng HyperFrames tua tới khung 3 s thì nhận ống kính của cảnh toàn ở giây thứ 10 (đo được: mặt nhân vật phóng 3 lần).
  //
  // ĐỘ SÂU TRƯỜNG ẢNH (`blur`, mặc định 0 = tắt): vật nào càng xa mặt phẳng lấy nét — mặt phẳng đi qua điểm ngắm — thì
  // càng mờ, `blur` px cho một vật cách nó đúng bằng `distance`, tối đa 16 px. Mờ hậu cảnh và tiền cảnh là cách rẻ nhất
  // để cảnh 2,5D có chiều sâu, và nó che luôn chỗ mặt phẳng nền bị co kéo khi máy quay vào gần.
  const base = { yaw: 0, pitch: 6, distance: 1700, lens: 1700, x: 0, y: 300, z: -350, zoom: 1, blur: 0 };
  const camera = { ...base }, marks = [];
  const backdrop = [], props = [], actors = [], layers = [], focused = [], surfaces = [];
  let frame = null, room = null;                     // room: bề ngang sàn [xMin, xMax] — ra ngoài là ra khỏi phòng

  const centre = () => origin || [view.clientWidth / 2, view.clientHeight * 0.57];
  const layer = (index) => {
    while (layers.length <= index) {
      const element = document.createElement('div');
      element.style.cssText = 'position:absolute;width:0;height:0;transform-style:preserve-3d';
      element.style.zIndex = 2 * layers.length;
      // Sàn và tường cố ý chìa ra ngoài khung hình (`view` cắt chúng đi): `hyperframes check` không được coi đó là tràn.
      // Chỉ đặt trên các lớp bối cảnh — đặt trên `view` thì nó cũng thôi nhìn thấy nhân vật cử động.
      element.setAttribute('data-layout-ignore', '');
      view.appendChild(element); layers.push(element);
    }
    return layers[index];
  };
  // `centre` [x, y, z] (y hướng lên): điểm dùng để tính độ mờ theo chiều sâu của mặt này.
  // `geom` { origin, u, v, n, kind }: mặt phẳng ấy trong bối cảnh — góc trên-trái `origin` [x, y, z] (y hướng lên), hướng
  // bề ngang `u` và bề cao `v` của phần tử (vector đơn vị), pháp tuyến `n` phía người xem thấy. Dùng cho ÁNH SÁNG (`light`).
  const face = (parent, width, height, transform, style, centre = null, geom = null) => {
    const element = document.createElement('div');
    element.style.cssText = `position:absolute;left:0;top:0;transform-origin:0 0;width:${width}px;height:${height}px;transform:${transform};${style || ''}`;
    parent.appendChild(element);
    if (centre) focused.push({ element, centre, filter: element.style.filter || '', blur: 0 });
    if (geom) surfaces.push({ element, width, height, ...geom });
    return element;
  };
  const paint = (style, fallback) => (typeof style === 'string' && style.trim() ? (/[:;]/.test(style) ? style : `background:${style}`) : `background:${fallback}`);

  let lighting = null, litKey = '', driven = null;
  // ÁNH SÁNG: runtime/lighting.js — các hàm của nó đọc trạng thái `lighting` (gán lại ở `light()`) qua getter.
  const { MOODS, LENS, lerp, rgbaOf, mixMood, sunFade, norm, dot, rgbOf, lightSurface, inside, sunAt, lightAt, floorRgb, bounceAt, wallHit, ramp, climbOn, climbEl, castShadows, boxShadows, wallShadow, toSet, svgPoint, beamGap, gadgetOf, findTorches, aimTorch, squint, torchPools, beamOverlays } = createLighting({ actors, backdrop, props, layers, surfaces, view, layer, get set() { return set; }, get lighting() { return lighting; } });

  const set = {
    camera,
    view,

    /**
     * ÁNH SÁNG của bối cảnh. `mood`: 'day' (sáng đều, có hướng sáng chính) · 'evening' (chạng vạng: tối hơn, sắc cam, bóng
     * dài) · 'night' (tối, ánh xanh — đèn là nguồn sáng chính). `lamps`: [{ name, x, y, z, color, power, range, on, kind }]
     * — `y` là độ cao bóng đèn; `kind` 'point' (đèn cây, đèn đường) hay 'ceiling' (đèn trần, có luồng sáng hình nón); `on`
     * mặc định bật khi trời tối / chiều. `windows`: [{ x, y, width, height, z }] — ô cửa trên tường sau (góc trên-trái), hắt
     * vệt nắng lên sàn ban ngày / chiều. Gọi một lần sau khi dựng phòng; `lamp(name, on)` bật / tắt trên timeline.
     */
    light({ mood = 'day', lamps = [], windows = [], gloss = false, shading = true, clouds = true, lens = true, grain = true, skyline = 0 } = {}) {
      if (!MOODS[mood]) throw new Error(`[character] set.light: mood must be ${Object.keys(MOODS).join(', ')} — got ${JSON.stringify(mood)}`);
      const preset = MOODS[mood];
      lighting = { mood: preset, key: norm(preset.key), lamps: [], torches: [], pools: [], skyline, windows, gloss, dust: [], shading, clouds: clouds && !!preset.sun, cloud: 1, sunFaces: [], patches: [], base: preset, shift: null, lens: null, bloom: [] };
      // ỐNG KÍNH: ba lớp phủ cả khung, trên mọi lớp của bối cảnh — chỉnh màu theo giờ (soft-light), tối bốn góc, hạt phim
      // (nhiễu SVG, dời theo từng khung hình — tua tới đâu cũng như nhau). Cả khung "ra chất phim" (đợt 20).
      // TRỜI (nền của `view`, phía trên tường): một lớp phủ đổi màu theo giờ, nằm sau mọi lớp của bối cảnh — nền là màu CSS
      // tĩnh, không ăn ánh sáng: khung DỌC lộ cả nửa trên là trời xanh sáng giữa đêm (phim thử đợt 23).
      lighting.sky = document.createElement('div');
      lighting.sky.setAttribute('data-sky-shade', '');
      lighting.sky.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:0';
      view.insertBefore(lighting.sky, view.firstChild);
      lighting.skyKey = '';
      if (lens) {
        const grainImage = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 1.6 -0.3"/></filter><rect width="220" height="220" filter="url(#n)"/></svg>')}")`;
        const make = (css) => { const el = document.createElement('div'); el.setAttribute('data-lens', ''); el.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:9000;${css}`; view.appendChild(el); return el; };
        // `grain: false`: bỏ riêng hạt phim — lớp tốn nhất của ống kính (~20 % thời gian render, đo ở đợt 24); bản nháp dùng.
        lighting.lens = { grade: make('mix-blend-mode:soft-light'), vignette: make(''), grain: grain ? make(`background-image:${grainImage};background-size:220px 220px;mix-blend-mode:overlay`) : null, last: '' };
      }
      lamps.forEach((spec, n) => {
        const color = spec.color || '#ffd59a', lamp = { name: spec.name || `lamp${n + 1}`, x: spec.x || 0, y: spec.y ?? 600, z: spec.z ?? -500, rgb: rgbOf(color),
          power: spec.power ?? 1, range: spec.range ?? Math.max(760, (spec.y ?? 600) * 1.7), kind: spec.kind || 'point', level: (spec.on ?? preset.lampsOn) ? 1 : 0 };      // tầm sáng: đủ xuống tới sàn từ bóng đèn trên cao
        const [r, g, b] = lamp.rgb.split(',').map(Number);
        lamp.warmth = clamp((r - b) / 255, 0, 1) * 0.35;
        lamp.sprites = [];
        // MÀN HÌNH (laptop, máy tính, TV) trong phòng tối: chiếu ánh xanh nhẹ lên người ngồi trước nó — không có quầng bóng đèn.
        // TV (tầm sáng xa): một quầng màu màn hình loang trên tường SAU nó, đổi màu và nhấp nháy theo "cảnh" đang chiếu (đợt 23:
        // không thấy ánh TV trên tường).
        if (lamp.kind === 'screen') {
          if (lamp.range >= 900) {
            const halo = document.createElement('div'), wide = 680 * Math.sqrt(lamp.power);
            halo.style.cssText = `width:${wide}px;height:${wide * 0.8}px;aspect-ratio:1.25;border-radius:50%;pointer-events:none;filter:blur(6px)`;
            stand(halo, null, { x: lamp.x, z: lamp.z - 120, y: Math.max(0, lamp.y - wide * 0.4), height: wide * 0.8, turn: false, ground: 1, shadow: false });
            actors[actors.length - 1].lamp = lamp; lamp.halo = halo; lamp.sprites = [halo];
          }
          lighting.lamps.push(lamp); return;
        }
        // QUẦNG SÁNG ở bóng đèn: một tấm luôn quay về máy quay (như nhân vật), sáng ấm ở giữa, tan ra ngoài.
        const glow = document.createElement('div'), size = 150 * Math.sqrt(lamp.power);
        // `aspect-ratio`: stand() chỉ đặt chiều cao (bề ngang của host do nội dung — ở đây không có nội dung).
        glow.style.cssText = `width:${size}px;height:${size}px;aspect-ratio:1;border-radius:50%;pointer-events:none;background:radial-gradient(closest-side, rgba(255,255,255,.95), rgba(${lamp.rgb},.75) 18%, rgba(${lamp.rgb},.22) 48%, rgba(${lamp.rgb},0))`;
        stand(glow, null, { x: lamp.x, z: lamp.z + 2, y: lamp.y - size / 2, height: size, turn: false, ground: 1, shadow: false });
        actors[actors.length - 1].lamp = lamp; lamp.sprites = [glow];
        // LOÁ ỐNG KÍNH quanh bóng đèn: một quầng rộng, rất nhạt, quanh quầng chính — ánh sáng mạnh tràn ra trong ống kính.
        const bloom = document.createElement('div'), wide = size * 2.8;
        bloom.style.cssText = `width:${wide}px;height:${wide}px;aspect-ratio:1;border-radius:50%;pointer-events:none;background:radial-gradient(closest-side, rgba(${lamp.rgb},.3), rgba(${lamp.rgb},.1) 45%, rgba(${lamp.rgb},0))`;
        stand(bloom, null, { x: lamp.x, z: lamp.z + 3, y: lamp.y - wide / 2, height: wide, turn: false, ground: 1, shadow: false });
        actors[actors.length - 1].lamp = lamp; lamp.sprites.push(bloom);
        if (lamp.kind === 'ceiling') {
          // LUỒNG SÁNG hình nón từ đèn trần xuống sàn, rất mờ.
          const cone = document.createElement('div'), wide = 520 * Math.sqrt(lamp.power);
          cone.style.cssText = `width:${wide}px;height:${lamp.y}px;aspect-ratio:${(wide / lamp.y).toFixed(4)};pointer-events:none;clip-path:polygon(44% 0, 56% 0, 100% 100%, 0 100%);background:linear-gradient(rgba(${lamp.rgb},.26), rgba(${lamp.rgb},.08) 70%, rgba(${lamp.rgb},0))`;
          stand(cone, null, { x: lamp.x, z: lamp.z + 1, y: 0, height: lamp.y, turn: false, ground: 1, shadow: false });
          actors[actors.length - 1].lamp = lamp; lamp.sprites.push(cone);
        }
        // ĐÈN ĐƯỜNG / đèn cao (bóng đèn trên 300): VŨNG SÁNG tròn trên mặt đất ngay dưới nó lúc chiều / tối — vệt loang trên lớp
        // tối của sàn thì quá mờ (đợt 23).
        if (lamp.kind === 'point' && lamp.y > 300) {
          const r = Math.min(lamp.range * 0.42, 360);
          lamp.pool = face(layer(0), 2 * r, 2 * r, `translate3d(${lamp.x - r}px, -1.4px, ${lamp.z + 40 - r}px) rotateX(90deg)`,
            `pointer-events:none;border-radius:50%;opacity:0;background:radial-gradient(closest-side, rgba(${lamp.rgb},.55), rgba(${lamp.rgb},.22) 55%, rgba(${lamp.rgb},0))`);
        }
        lighting.lamps.push(lamp);
      });
      // VỆT NẮNG qua cửa sổ: chiếu bốn góc ô cửa theo hướng nắng xuống sàn → một hình bình hành sáng trên sàn.
      if (preset.sun) for (const win of windows) {
        const sun = norm(preset.sun), corners = [[win.x, win.y], [win.x + win.width, win.y], [win.x + win.width, win.y - win.height], [win.x, win.y - win.height]]
          .map(([x, y]) => { const t = -y / sun[1]; return [x + t * sun[0], win.z + t * sun[2]]; });
        lighting.patches.push(corners);
        const xs = corners.map((c) => c[0]), zs = corners.map((c) => c[1]), x0 = Math.min(...xs), z0 = Math.min(...zs), w = Math.max(...xs) - x0, h = Math.max(...zs) - z0;
        const shape = corners.map(([x, z]) => `${((x - x0) / w * 100).toFixed(2)}% ${((z - z0) / h * 100).toFixed(2)}%`).join(', ');
        // LUỒNG NẮNG trong không khí: mặt phẳng quét từ mép trên ô cửa theo hướng nắng xuống tới sàn — mờ, tan dần.
        const reach = win.y / -sun[1], vx = sun[0], vy = -sun[1], vz = sun[2], nx = 0 * vz - 0 * vy, ny = 0 * vx - 1 * vz, nz = 1 * vy - 0 * vx;
        const shaft = face(layer(0), win.width, reach, `matrix3d(1,0,0,0, ${vx.toFixed(4)},${vy.toFixed(4)},${vz.toFixed(4)},0, ${nx.toFixed(4)},${ny.toFixed(4)},${nz.toFixed(4)},0, ${win.x},${-win.y},${win.z + 2},1)`,
          `pointer-events:none;filter:blur(10px);background:linear-gradient(to bottom, rgba(${preset.sunColor},${(preset.sunAlpha * 0.32).toFixed(2)}), rgba(${preset.sunColor},${(preset.sunAlpha * 0.12).toFixed(2)}) 70%, rgba(${preset.sunColor},0))`);
        // BỤI lấp lánh trôi chậm trong luồng nắng: các hạt nằm trên chính mặt phẳng của luồng nắng (không mờ), vị trí là hàm
        // của thời gian timeline (`drive`) — tua tới đâu cũng đúng.
        const motes = face(layer(0), win.width, reach, `matrix3d(1,0,0,0, ${vx.toFixed(4)},${vy.toFixed(4)},${vz.toFixed(4)},0, ${nx.toFixed(4)},${ny.toFixed(4)},${nz.toFixed(4)},0, ${win.x},${-win.y},${win.z + 3},1)`, 'pointer-events:none;overflow:hidden');
        for (let n = 0; n < 26; n++) {
          const dot = document.createElement('div'), r = 1.6 + ((n * 7) % 5) * 0.5;
          dot.style.cssText = `position:absolute;left:0;top:0;width:${r * 2}px;height:${r * 2}px;border-radius:50%;background:rgba(255,252,236,.85);box-shadow:0 0 ${r * 2}px rgba(255,248,220,.7)`;
          motes.appendChild(dot);
          lighting.dust.push({ dot, bx: ((n * 37) % 100) / 100 * win.width, by: ((n * 61) % 100) / 100 * reach, phase: n * 1.7, w: win.width, h: reach });
        }
        const patch = face(layer(0), w, h, `translate3d(${x0}px, -1px, ${z0}px) rotateX(90deg)`,
          `pointer-events:none;clip-path:polygon(${shape});filter:blur(6px);background:linear-gradient(to bottom, rgba(${preset.sunColor},${(preset.sunAlpha * 0.55).toFixed(2)}), rgba(${preset.sunColor},${preset.sunAlpha}))`);
        lighting.sunFaces.push(shaft, motes, patch);
      }
      // Tấm nào là Ô CỬA: tấm nền có góc trên-trái trùng ô cửa đã khai.
      for (const f of surfaces) f.window = f.kind === 'panel' && windows.some((win) => Math.abs(f.origin[0] - win.x) < 30 && Math.abs(f.origin[1] - win.y) < 30);
      litKey = '';
      set.update();
      return set;
    },

    /** Chỗ CÔNG TẮC của một đèn (tên, số thứ tự, hay null = đèn đầu tiên): [x, y, z] — trên thân cột đèn, ngang tầm tay. */
    lampPoint(which = null) {
      if (!lighting || !lighting.lamps.length) throw new Error('[character] set.lampPoint: the set has no lamps');
      const lamp = which === null ? lighting.lamps[0] : typeof which === 'number' ? lighting.lamps[which] : lighting.lamps.find((item) => item.name === which);
      if (!lamp) throw new Error(`[character] set.lampPoint: no lamp ${JSON.stringify(which)}`);
      return [lamp.x, Math.min(lamp.y * 0.62, 330), lamp.z];
    },

    /** BẬT / TẮT một đèn (tên hay số thứ tự) — một tween để thêm vào timeline: `tl.add(set.lamp('den', true), 3)`. */
    lamp(which, on = true, duration = 0.6, { flicker = true } = {}) {
      if (!lighting) throw new Error('[character] set.lamp: call set.light({ lamps: […] }) first');
      const lamp = typeof which === 'number' ? lighting.lamps[which] : lighting.lamps.find((item) => item.name === which);
      if (!lamp) throw new Error(`[character] set.lamp: no lamp ${JSON.stringify(which)} (lamps: ${lighting.lamps.map((item) => item.name).join(', ')})`);
      if (!on || !flicker) return gsap.fromTo(lamp, { level: on ? 0 : 1 }, { level: on ? 1 : 0, duration, ease: 'power2.inOut', immediateRender: false, onUpdate: () => set.update() });
      // BẬT ĐÈN: chớp một hai nhịp rồi mới sáng hẳn (bóng đèn / đèn huỳnh quang mồi) — bật trơn từ 0 lên 1 như vặn dimmer.
      // Ít nhất 0,9 giây: ngắn hơn thì mỗi nhịp chớp chưa tới hai khung hình, mắt không kịp thấy.
      const total = Math.max(duration, 0.9), steps = [[0.7, 0.1], [0.04, 0.12], [0.9, 0.1], [0.2, 0.1], [1, 0.58]], tl = gsap.timeline({ onUpdate: () => set.update() });
      tl.fromTo(lamp, { level: 0 }, { level: steps[0][0], duration: total * steps[0][1], ease: 'none', immediateRender: false });
      for (const [level, part] of steps.slice(1)) tl.to(lamp, { level, duration: total * part, ease: level === 1 ? 'power2.out' : 'none' });
      return tl;
    },

    /**
     * TRỜI CHUYỂN trong một cảnh (chiều → tối, ngày → chiều…): một tween để thêm vào timeline —
     * `tl.add(set.shift('night', 6), 4)`. Nắng tắt dần, phòng tối và đổi màu dần; `lamps` (mặc định có): giờ mới là lúc lên
     * đèn thì các đèn đang tắt tự bật (chớp) khi trời đã tối được hơn nửa. Trời chỉ chuyển được từ giờ đã khai ở `light`.
     */
    shift(mood, duration = 5, { lamps = true } = {}) {
      if (!lighting) throw new Error('[character] set.shift: call set.light({ mood }) first');
      if (!MOODS[mood]) throw new Error(`[character] set.shift: mood must be ${Object.keys(MOODS).join(', ')} — got ${JSON.stringify(mood)}`);
      const state = { t: 0 }, from = lighting.base, to = MOODS[mood];
      lighting.shift = { from, to, state };
      const tl = gsap.timeline();
      tl.fromTo(state, { t: 0 }, { t: 1, duration, ease: 'sine.inOut', immediateRender: false, onUpdate: () => set.update() });
      if (lamps && to.lampsOn && (!from.lampsOn || to.dark > from.dark)) lighting.lamps.filter((lamp) => lamp.kind !== 'screen' && lamp.level < 0.5)
        .forEach((lamp, n) => tl.add(set.lamp(lamp.name, true, 0.9), duration * 0.55 + n * 0.35));
      return tl;
    },

    /** SÀN: hình chữ nhật trên mặt y = 0, từ `x[0]`…`x[1]` và `z[0]`…`z[1]`. `style` là màu, hoặc CSS (`background: …`). */
    floor({ x = [-900, 900], z = [-1100, 200], y = 0, style = null } = {}) {
      // Sàn dựng thành NHIỀU DẢI theo chiều sâu (mỗi dải ~150 đơn vị): một mặt phẳng chỉ mờ được đều một mức, mà sàn thì
      // trải từ sát máy tới chân tường sau. Hoạ tiết nối liền qua các dải nhờ dời `background-position` cho khớp.
      const depth = z[1] - z[0], strips = clamp(Math.round(depth / 150), 1, 12), each = depth / strips;
      room = room ? [Math.min(room[0], x[0]), Math.max(room[1], x[1])] : [x[0], x[1]];
      for (let k = 0; k < strips; k++) {
        const strip = face(layer(0), x[1] - x[0], each + 0.5, `translate3d(${x[0]}px, ${-y}px, ${z[0] + k * each}px) rotateX(90deg)`,
          paint(style, '#a9c4cb') + `;background-position-y:${(-k * each).toFixed(2)}px`, [(x[0] + x[1]) / 2, y, z[0] + (k + 0.5) * each],
          { origin: [x[0], y, z[0] + k * each], u: [1, 0, 0], v: [0, 0, 1], n: [0, 1, 0], kind: 'floor', back: k === 0 });
        strip.dataset.floor = k;
        backdrop.push(strip);
      }
      return set;
    },

    /**
     * TƯỜNG: mặt đứng nối hai điểm trên sàn `from` [x, z] → `to` [x, z], cao `height`. Tường chỉ có MỘT MẶT: nhìn từ
     * phía sau thì nó biến mất — nhờ vậy khi máy quay lùi ra ngoài phòng, bức tường nằm giữa máy và căn phòng không
     * che mất cảnh. Mặt nhìn thấy quay vào trong khi kể các góc phòng THEO CHIỀU KIM ĐỒNG HỒ nhìn từ
     * trên xuống: tường sau đi từ trái sang phải, tường phải từ trong ra ngoài, tường trái từ ngoài vào trong.
     */
    wall({ from, to, height = 700, y = 0, style = null } = {}) {
      if (!Array.isArray(from) || !Array.isArray(to)) throw new Error('[character] set.wall({ from: [x, z], to: [x, z] }) needs both ends');
      const length = Math.hypot(to[0] - from[0], to[1] - from[1]), turn = -Math.atan2(to[1] - from[1], to[0] - from[0]) * 180 / Math.PI;
      const u = [(to[0] - from[0]) / length, 0, (to[1] - from[1]) / length];
      backdrop.push(face(layer(0), length, height, `translate3d(${from[0]}px, ${-y - height}px, ${from[1]}px) rotateY(${turn}deg)`, paint(style, '#c9dce1') + ';backface-visibility:hidden',
        [(from[0] + to[0]) / 2, y + height / 2, (from[1] + to[1]) / 2], { origin: [from[0], y + height, from[1]], u, v: [0, -1, 0], n: [-u[2], 0, u[0]], kind: 'wall' }));
      return set;
    },

    /**
     * Một TẤM phẳng tuỳ ý thuộc phần NỀN (cửa sổ, tranh, bảng trên tường): góc trên-trái ở `at` [x, y, z], kích thước
     * `size` [rộng, cao], xoay quanh trục đứng `turn` độ (0 = quay mặt về phía người xem, 90 = nằm dọc theo tường bên trái).
     * Đặt nó lệch khỏi mặt tường 1 đơn vị để hai mặt không tranh nhau.
     */
    panel({ at, size, turn = 0, style = null } = {}) {
      const across = turn * Math.PI / 180;
      backdrop.push(face(layer(0), size[0], size[1], `translate3d(${at[0]}px, ${-at[1]}px, ${at[2]}px) rotateY(${turn}deg)`, paint(style, '#f4f7f8'),
        [at[0] + Math.cos(across) * size[0] / 2, at[1] - size[1] / 2, at[2] - Math.sin(across) * size[0] / 2],
        { origin: [at[0], at[1], at[2]], u: [Math.cos(across), 0, -Math.sin(across)], v: [0, -1, 0], n: [Math.sin(across), 0, Math.cos(across)], kind: 'panel' }));
      return set;
    },

    /**
     * Một HỘP đứng trên sàn (bàn, quầy, ghế băng, kệ): góc trước-trái ở (`x`, `z`), `width` theo x, `depth` lùi vào
     * trong, cao `height`. Hộp là ĐỒ VẬT: nó che nhân vật đứng sau nó và bị nhân vật đứng trước nó che.
     * `colors`: một màu, hoặc { top, front, side }.
     */
    box({ x, z, width, depth, height, y = 0, colors = '#8fb3bf' } = {}) {
      for (const [name, value] of Object.entries({ x, z, width, depth, height })) if (typeof value !== 'number') throw new Error(`[character] set.box: ${name} must be a number`);
      const tone = typeof colors === 'string' ? { top: colors, front: colors, side: colors } : colors;
      const group = document.createElement('div');
      group.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;transform-style:preserve-3d';
      layer(0).appendChild(group);
      const top = -y - height, middle = [x + width / 2, y + height / 2, z - depth / 2];
      // BÓNG TIẾP ĐẤT dưới hộp: một vệt tối mềm trên sàn, nhỉnh hơn chân hộp — không có nó cái bàn như dán lên sàn.
      // Một tấm TỐI ĐỀU bo góc, nhoè mép — không phải chuyển sắc tròn: tâm của chuyển sắc nằm khuất dưới thân hộp, phần lộ ra
      // ở mép thì gần như trong suốt; tô đỏ để soát thì thấy rõ (đợt 22: bàn khám như lơ lửng).
      // Loang sang HAI BÊN rộng hơn (40 mỗi bên): máy thấp, dải sàn trước hộp hẹp — hai bên hộp mới là chỗ thấy bóng (đợt 24).
      face(layer(0), width + 80, depth + 60, `translate3d(${x - 40}px, ${-y - 2}px, ${z - depth - 18}px) rotateX(90deg)`,
        `background:rgba(0,0,0,.3);border-radius:24px;filter:blur(10px);opacity:${y > 0 ? 0 : 1}`);
      const geomTop = { origin: [x, y + height, z - depth], u: [1, 0, 0], v: [0, 0, 1], n: [0, 1, 0], kind: 'box' };
      face(group, width, depth, `translate3d(${x}px, ${top}px, ${z - depth}px) rotateX(90deg)`, paint(tone.top, '#f1f4f5'), middle, geomTop);
      face(group, depth, height, `translate3d(${x}px, ${top}px, ${z}px) rotateY(90deg)`, paint(tone.side, '#7da3b0') + ';filter:brightness(.94)', middle,
        { origin: [x, y + height, z], u: [0, 0, -1], v: [0, -1, 0], n: [-1, 0, 0], kind: 'box' });
      face(group, depth, height, `translate3d(${x + width}px, ${top}px, ${z}px) rotateY(90deg)`, paint(tone.side, '#7da3b0') + ';filter:brightness(.94)', middle,
        { origin: [x + width, y + height, z], u: [0, 0, -1], v: [0, -1, 0], n: [1, 0, 0], kind: 'box' });
      face(group, width, height, `translate3d(${x}px, ${top}px, ${z}px)`, paint(tone.front, '#8fb3bf'), middle,
        { origin: [x, y + height, z], u: [1, 0, 0], v: [0, -1, 0], n: [0, 0, 1], kind: 'box' });
      // Bốn mặt vừa dựng là mặt của một VẬT: đánh dấu để `update` không làm mờ chúng khi chúng tràn ra ngoài khung hình.
      for (const item of focused.slice(-4)) item.solid = true;
      const prop = { group, centre: middle, top: y + height, front: z, span: [x, x + width], spec: { x, z, width, depth, height, y } };
      props.push(prop);
      return prop;
    },

    /**
     * ĐẶT một nhân vật (rig người hay thú) vào bối cảnh: chân ở (`x`, `z`) trên sàn, hoặc trên một mặt cao `y` (mặt bàn).
     * `height`: chiều cao của host tính bằng px ở mặt phẳng tiêu cự (bỏ trống thì lấy chiều cao host đang có).
     * `turn: false` để nhân vật KHÔNG tự xoay bù theo góc máy. Trả về điểm đứng { x, y, z } — tween nó để nhân vật đi
     * trong phòng (bước chân thì vẫn do động tác `walk` của rig lo).
     */
    place(rig, { x = 0, z = 0, y = 0, height = null, turn = true } = {}) {
      const host = rig && (rig.host || (rig.svg && rig.svg.parentNode));
      if (!host || !rig.svg) throw new Error('[character] set.place(rig, …): pass a rig made by createCharacter / createPet — for a picture or a prop use set.stand(element, …)');
      return stand(host, rig, { x, z, y, height, turn, ground: null, shadow: true });
    },

    /**
     * DỰNG một tấm hình PHẲNG đứng thẳng trong bối cảnh — đạo cụ vẽ sẵn (`createProp(host, 'plant')`), ảnh, SVG: nó luôn
     * quay mặt về ống kính, nét ở mọi cự ly và xếp lớp theo chiều sâu cùng các nhân vật. Đặt nó SÁT MÁY QUAY (z gần mép
     * trước của phòng) là có TIỀN CẢNH: khi máy lia, nó trôi qua khung nhanh hơn hậu cảnh — thị sai.
     *   ground   chỗ chân đứng tính theo chiều cao phần tử, 0…1 (đạo cụ vẽ sẵn: tự nhận; mặc định 1 = mép dưới)
     *   shadow   vẽ bóng trên sàn (mặc định có)
     */
    stand(element, { x = 0, z = 0, y = 0, height = null, ground = null, shadow = true } = {}) {
      if (!element || !element.style) throw new Error('[character] set.stand(element, …): pass an element');
      const prop = element.querySelector && element.querySelector('svg[data-prop]');
      return stand(element, null, { x, z, y, height, turn: false, shadow, ground: ground != null ? ground : prop ? PROP_FRAME.floor / PROP_FRAME.h : 1 });
    },


    /**
     * ĐÍCH cho `point` / `stroke` của nhân vật `from`, nhắm vào cái đầu của `to` (người, thú) — tính theo VỊ TRÍ TRONG
     * PHÒNG, không theo màn hình. Hai động tác ấy tự tính hướng tay từ vị trí trên màn hình lúc DỰNG timeline, tức theo
     * góc máy lúc đầu; trong bối cảnh 3D máy quay đổi góc sau đó (có khi ngay lượt ấy), và người chỉ còn bước đi trước
     * lượt ấy. Đích trả về là { x, y } trong khung 400 × 470 của `from`, tính MUỘN — đúng lúc động tác đọc nó, sau khi
     * các bước đi trước đã được dựng: `from.point(set.target(from, cat))`.
     * Tay vươn trong mặt phẳng của `from`: đứng lệch nhau theo chiều sâu (z) thì bàn tay không chạm được.
     */
    // `at`: chỗ `to` đứng Ở LƯỢT NÀY, tính bằng phần dời ngang trong khung của nó (như `s.x` sau các bước đi) — lúc dựng,
    // trạng thái của nó có thể còn ở đầu cảnh (con chó đi tới người ngồi ở một lượt trước — đợt 29).
    target(from, to, part = 'head', { at = null } = {}) {
      const of = (rig) => actors.find((actor) => actor.rig === rig);
      if (!of(from) || !of(to)) throw new Error('[character] set.target(from, to): both must be rigs placed with set.place()');
      const frameOf = (rig) => (rig.constructor && rig.constructor.KHUNG) || { w: 400, h: 470 };
      const facts = (actor) => {
        if (!actor.width) { actor.width = actor.host.offsetWidth; actor.height = actor.host.offsetHeight; }
        if (actor.ground === null) actor.ground = groundOf(actor.rig);
        const size = frameOf(actor.rig), unit = actor.height / size.h, ground = (actor.ground || 1) * size.h;
        return { size, unit, ground, x: actor.spot.x + (actor.rig === to && typeof at === 'number' ? at : actor.rig.s.x || 0) * unit };
      };
      const head = () => {
        // `part`: 'head' (mặt — chỉ tay, vuốt ve) hay 'body' (giữa thân — nghe tim phổi, tiêm): khung toàn thân, dưới
        // tâm một chút (con vật nằm ngang: phần dưới khung là thân, phần trên là đầu).
        const actor = of(to), f = facts(actor), box = typeof to.shotBox === 'function' ? to.shotBox(part === 'body' ? 'full' : 'face') : null;
        const hx = box ? box.x + box.width / 2 : f.size.w / 2, hy = box ? box.y + box.height * (part === 'body' ? 0.5 : 0.5) : f.ground * (part === 'body' ? 0.4 : 0.6);
        return { x: f.x + (hx - f.size.w / 2 - (to.s.x || 0)) * f.unit, y: actor.spot.y + (f.ground - hy) * f.unit };
      };
      return {
        get x() { const actor = of(from), f = facts(actor); return f.size.w / 2 + (head().x - actor.spot.x) / f.unit; },
        get y() { const actor = of(from), f = facts(actor); return f.ground - (head().y - actor.spot.y) / f.unit; },
      };
    },

    /**
     * ĐÍCH THEO MÀN HÌNH cho `shine` (rọi đèn pin): cái đầu của `to` ĐÚNG CHỖ NÓ HIỆN TRÊN MÀN HÌNH, đổi về khung 400 × 470 của
     * `from`. `target` tính trong mặt phẳng của `from` — con vật gần máy hơn thì trên màn hình thấp hơn chỗ ấy, luồng đèn đi
     * quá đầu nó (phim thử đợt 23). Luồng sáng là một nét vẽ trên màn hình, nên nhắm theo màn hình mới trúng.
     */
    aimAt(from, to) {
      const of = (rig) => actors.find((actor) => actor.rig === rig);
      if (!of(from) || !of(to)) throw new Error('[character] set.aimAt(from, to): both must be rigs placed with set.place()');
      const inner = set.target(from, to);
      // Đo trên MÀN HÌNH lúc dựng timeline (góc máy lúc ấy). Đợt 24 thử thay bằng một máy quay chuẩn nhìn thẳng (không phụ
      // thuộc góc máy) — khung dọc máy gần và chúc hơn nhiều, luồng đèn đi ngang qua đầu con mèo: bỏ, giữ cách này.
      const screen = () => {
        const a = of(from), b = of(to);
        if (!a.frame || !b.width) return null;
        const size = (from.constructor && from.constructor.KHUNG) || { w: 400, h: 470 }, tsize = (to.constructor && to.constructor.KHUNG) || { w: 400, h: 470 };
        const box = typeof to.shotBox === 'function' ? to.shotBox('face') : { x: tsize.w / 2 - 40, y: tsize.h * 0.3, width: 80, height: 80 };
        const [hx, hy] = toSet(b, box.x + box.width / 2, box.y + box.height / 2), p = set.project(hx, hy, b.spot.z);
        return { x: (p.x - a.frame.left) / a.frame.w * size.w, y: (p.y - a.frame.top) / a.frame.h * size.h };
      };
      return { aimFrom: from, aimTo: to, get x() { const s = screen(); return s ? s.x : inner.x; }, get y() { const s = screen(); return s ? s.y : inner.y; } };
    },

    /** Một ĐIỂM của bối cảnh [x, y, z] nhìn từ nhân vật `from`, trong khung 400 × 470 của nó — đích cho `point` (với tay tới
     *  công tắc / cây đèn). */
    targetPoint(from, point) {
      const actor = actors.find((item) => item.rig === from);
      if (!actor) throw new Error('[character] set.targetPoint(from, [x, y, z]): from must be a rig placed in the set');
      const size = (from.constructor && from.constructor.KHUNG) || { w: 400, h: 470 };
      const facts = () => {
        if (!actor.width) { actor.width = actor.host.offsetWidth; actor.height = actor.host.offsetHeight; }
        if (actor.ground === null) actor.ground = groundOf(actor.rig);
        const unit = actor.height / size.h; return { unit, ground: (actor.ground || 1) * size.h, x: actor.spot.x + (from.s.x || 0) * unit };
      };
      return {
        get x() { const f = facts(); return size.w / 2 + (from.s.x || 0) + (point[0] - f.x) / f.unit; },
        get y() { const f = facts(); return f.ground - (point[1] - actor.spot.y) / f.unit; },
      };
    },

    /**
     * Chiếu một điểm của bối cảnh lên `view`: { x, y } tính bằng px trong `view`, `scale` là độ phóng tại điểm ấy,
     * `depth` càng lớn càng gần máy quay.
     */
    project(x, y, z) {
      const lens = frame || set.update(), point = lens.matrix.transformPoint(new DOMPoint(x, -y, z));
      const scale = camera.lens / Math.max(1, camera.lens - point.z) * camera.zoom;
      return { x: lens.cx + point.x * scale, y: lens.cy + point.y * scale, scale, depth: point.z };
    },

    /** Đặt máy quay ngay lập tức: `set.look({ yaw: 20, distance: 1200 })`. Trả về `set`. */
    look(values = {}) {
      checkCamera(values, 'set.look');
      Object.assign(base, values);
      set.update();
      return set;
    },

    /**
     * Một tween GSAP đưa máy quay tới `values` — thêm vào timeline: `tl.add(set.move({ yaw: 20 }, 3), 0)`.
     * Muốn CẮT cảnh (đổi hẳn góc, kể cả sang toàn cảnh) thì `tl.add(set.cut({ ...OVERVIEW, zoom: 0.9 }), 9)`.
     * Đổi `yaw` nhiều (quá 40°) thì nên cắt hơn là lia: lia qua chừng ấy độ là nhân vật xoay trước mắt người xem.
     */
    move(values, duration = 1, ease = 'sine.inOut') {
      checkCamera(values, 'set.move');
      return mark(values, Math.max(0, duration), ease);
    },
    cut(values) {
      checkCamera(values, 'set.cut');
      return mark(values, 0, 'none');
    },

    /**
     * GẮN bối cảnh vào timeline chính để máy quay được áp ở MỌI khung, kể cả khi bộ dựng tua bằng `seek(t)` — lệnh này
     * TẮT callback của GSAP, nên `onUpdate: set.update` không chạy và khung ấy mang góc máy của lần vẽ trước. Bộ dựng
     * chụp nhiều khung song song: khi máy đang lia, các khung xen kẽ mang hai góc máy khác nhau — hình CHỚP (đo được ở
     * cảnh thử đợt 5: cậu bé nhảy qua lại mỗi khung trong lúc lia). Gọi SAU khi đã dựng xong timeline:
     *   const tl = gsap.timeline({ paused: true, onUpdate: set.update }); … ; set.drive(tl);
     * Một tween rỗng phủ cả timeline; setter của nó (GSAP ghi ở mọi lần vẽ, kể cả khi tua) hẹn `set.update()` vào cuối
     * lượt (microtask) — SAU khi mọi nhân vật đã nhận trạng thái của khung, như rig tự vẽ lại (xem `rig.s`).
     */
    drive(tl) {
      driven = tl;                                       // thời gian của cảnh — cho những thứ trôi theo thời gian (bụi trong nắng)
      let queued = false;
      const driver = { _t: 0, get t() { return this._t; }, set t(value) {
        this._t = value;
        if (!queued) { queued = true; queueMicrotask(() => { queued = false; set.update(); }); }
      } };
      tl.to(driver, { t: 1, duration: Math.max(tl.duration(), 0.001), ease: 'none' }, 0);
      return set;
    },

    /**
     * ÁP máy quay hiện tại lên bối cảnh và mọi nhân vật. Gọi sau mỗi lần timeline cập nhật:
     * `gsap.timeline({ paused: true, onUpdate: set.update })` — và phải gọi SAU khi các rig đã dựng khung của mình.
     */
    update() {
      // Máy quay tại thời điểm hiện tại của timeline chứa các mốc (xem `base` ở trên).
      Object.assign(camera, base);
      const placed = marks.filter((entry) => entry.tween.parent && entry.tween.parent !== gsap.globalTimeline)
        .sort((a, b) => a.tween.startTime() - b.tween.startTime() || a.order - b.order);
      for (const entry of placed) {
        const local = entry.tween.parent.time() - entry.tween.startTime();
        if (local < 0) continue;
        const done = entry.duration ? clamp(local / entry.duration, 0, 1) : 1, k = entry.curve(done);
        for (const [key, value] of Object.entries(entry.values)) camera[key] += (value - camera[key]) * k;
      }
      // ÁNH SÁNG SỐNG theo thời gian của timeline (tua tới đâu cũng đúng): mây thỉnh thoảng che nắng — vệt nắng, luồng nắng,
      // bụi và ánh cửa sổ trên người dịu đi rồi sáng lại; màn hình TV / laptop nhấp nháy, đổi màu theo "cảnh" trên màn hình.
      if (lighting) {
        const time = driven ? driven.time() : 0;
        // Trời đang CHUYỂN (`shift`): giờ trong ngày hiện tại là trộn của hai giờ theo tiến độ của tween.
        if (lighting.shift) lighting.mood = mixMood(lighting.shift.from, lighting.shift.to, lighting.shift.state.t);
        if (lighting.clouds) {
          const pass = Math.max(0, Math.sin(time * 0.57 + 0.6)) ** 2;                   // một đám mây qua mỗi ~11 giây
          lighting.cloud = 1 - 0.62 * pass;                                              // nhẹ hơn thì mắt không nhận ra (Gemini, đợt 19)
        }
        const opacity = (lighting.cloud * sunFade()).toFixed(3);
        for (const el of lighting.sunFaces) if (el.style.opacity !== opacity) el.style.opacity = opacity;
        {
          // Trời theo giờ: chiều — trên thẫm tím, sát chân trời ánh cam; đêm — xanh đen; ngày — để nguyên.
          const mood = lighting.mood, a = clamp((mood.dark - 0.06) * 1.45, 0, 0.84), key = `${mood.shade}|${a.toFixed(3)}|${(mood.sunAlpha || 0).toFixed(2)}`;
          if (key !== lighting.skyKey) {
            lighting.skyKey = key;
            const sun = mood.sun && mood.sunColor ? clamp(mood.sunAlpha / 0.62, 0, 1) * (mood.warm > 0.1 ? 0.45 : 0) : 0;
            lighting.sky.style.background = a < 0.01 ? 'none' : `linear-gradient(rgba(${mood.shade},${Math.min(0.92, a * 1.1).toFixed(3)}), rgba(${mood.shade},${(a * 0.8).toFixed(3)}) 55%, ${sun > 0.01 ? `rgba(${mood.sunColor},${sun.toFixed(3)})` : `rgba(${mood.shade},${(a * 0.7).toFixed(3)})`})`;
          }
        }
        if (lighting.lens) {
          const mood = lighting.mood, g = mood.grade, lens = lighting.lens, key = `${g.map((v) => v.toFixed(2))}|${mood.vignette.toFixed(3)}`;
          if (key !== lens.last) {
            lens.last = key;
            lens.grade.style.background = `rgba(${g.slice(0, 3).map(Math.round).join(',')},${g[3].toFixed(3)})`;
            lens.vignette.style.background = `radial-gradient(ellipse 75% 70% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,${mood.vignette.toFixed(3)}) 100%)`;
            if (lens.grain) lens.grain.style.opacity = (mood.grain * 4.4).toFixed(3);                     // nhẹ hơn thì nén video xoá mất (Gemini đợt 20)
          }
          // Hạt phim: đổi chỗ mỗi khung hình (24 lần / giây), theo thời gian timeline.
          const frame = Math.floor(time * 24);
          if (lens.grain) lens.grain.style.backgroundPosition = `${(frame * 73) % 220}px ${(frame * 131) % 220}px`;
        }
        for (const lamp of lighting.lamps) {
          if (lamp.kind !== 'screen') continue;
          lamp.baseRgb = lamp.baseRgb || lamp.rgb;
          const shot = Math.floor((time + lamp.x * 0.001) / 2.3), tones = [lamp.baseRgb, '255,196,160', '168,214,255', '214,255,220'];
          lamp.rgb = tones[(shot * 7 + 3) % tones.length];
          lamp.pulse = 0.78 + 0.12 * Math.sin(time * 9.1) * Math.sin(time * 3.7 + 1) + 0.1 * Math.sin(time * 23);
        }
      }
      const pull = camera.lens - camera.distance, [cx, cy] = centre();
      const moves = `rotateX(${-camera.pitch}deg) rotateY(${-camera.yaw}deg) translate3d(${-camera.x}px, ${camera.y}px, ${-camera.z}px)`;
      view.style.perspective = camera.lens + 'px';
      view.style.perspectiveOrigin = `${cx}px ${cy}px`;
      frame = { cx, cy, matrix: new DOMMatrix(`translateZ(${pull}px) ${moves}`) };
      // BƯỚC ĐI TRONG PHÒNG. Rig đi bằng cách dời hình vẽ trong khung của chính nó (`s.x`, đơn vị khung). Ở đây quãng ấy
      // được đổi thành quãng đi THẬT dọc trục x của căn phòng — vị trí 3D, xếp lớp và cái bóng đi theo — rồi bù ngược
      // trong phép đặt host để hình không bị dời hai lần.
      for (const actor of actors) {
        // Đo kích thước TRƯỚC khi tính quãng đi: đo muộn (trong vòng đặt host bên dưới) thì khung đầu tiên được dựng tính
        // quãng đi bằng 0 — khung ấy ra khác hẳn tuỳ nó có phải khung đầu hay không (bộ dựng tua không theo thứ tự).
        if (!actor.width) { actor.width = actor.host.offsetWidth; actor.height = actor.host.offsetHeight; }
        const size = actor.rig && actor.rig.constructor && actor.rig.constructor.KHUNG;
        actor.step = size && actor.height && actor.rig.s && typeof actor.rig.s.x === 'number' ? actor.rig.s.x : 0;
        actor.unit = size && actor.height ? actor.height / size.h : 0;
        actor.where = actor.spot.x + actor.step * actor.unit;
      }
      // xa → gần. Người và con vật đứng SÁT NHAU, CÙNG độ sâu trong phòng (con vật trên bàn khám ngay cạnh bác sĩ): NGƯỜI
      // luôn ở trước, bất kể góc máy — không thì bàn tay soi đèn / tiêm / đưa bánh chui ra sau con vật. Quyết định theo vị
      // trí TRONG PHÒNG (z, x), không theo khoảng cách tới máy: máy xoay thì khoảng cách ấy đổi dần, và thứ tự lớp đảo
      // đúng một khung giữa lúc lia — con vật bật từ sau ra trước tay người (Gemini / người dùng: "giây 19 vẫn giật").
      const isPerson = (actor) => !!(actor.rig && typeof actor.rig.seatY === 'function');
      const together = (a, b) => Math.abs(a.spot.z - b.spot.z) < 30 && Math.abs(a.where - b.where) < 220;
      const shown = actors.map((actor) => ({ actor, at: set.project(actor.where, actor.spot.y, actor.spot.z) })).sort((a, b) => {
        if (isPerson(a.actor) !== isPerson(b.actor) && together(a.actor, b.actor)) return isPerson(a.actor) ? 1 : -1;
        return a.at.depth - b.at.depth;
      });
      // Đèn trong tay (đèn soi, đèn pin): tìm trước khi chiếu sáng từng nhân vật.
      if (lighting) { findTorches(); for (const torch of lighting.torches) aimTorch(torch); if (lighting.torches.some((t) => t.kind === 5)) findTorches(); torchPools(); for (const actor of actors) squint(actor); }
      for (let index = 0; index <= shown.length; index++) {
        const element = layer(index);
        element.style.left = cx + 'px'; element.style.top = cy + 'px';
        element.style.transform = `scale(${camera.zoom}) translateZ(${pull}px) ${moves}`;
      }
      shown.forEach(({ actor, at }, rank) => {
        const { host, rig } = actor;
        if (!actor.width) { actor.width = host.offsetWidth; actor.height = host.offsetHeight; }        // host đang ẩn thì chưa đo được: đo lại ở khung sau
        if (actor.ground === null && actor.width) actor.ground = groundOf(rig);
        // ÁNH SÁNG trên nhân vật / đồ vật: sáng hơn và ấm hơn khi ở gần đèn, tối đi khi ra xa (tính mỗi khung — người đi
        // ngang qua cây đèn là sáng lên rồi tối dần). Quầng sáng của chính bóng đèn thì không.
        let lit = '';
        if (lighting && !actor.lamp) {
          const L = lightAt(actor.where, actor.spot.y + (actor.height || 0) * 0.45, actor.spot.z, actor);
          const sideOf = (src) => (set.project(src.x, src.y, src.z).x < at.x ? -1 : 1);
          // ÁNH SÁNG PHỤ: nguồn mạnh thứ hai ở PHÍA BÊN KIA màn hình so với nguồn chính (đèn bàn ấm một bên, cửa sổ lạnh bên
          // kia) — phía khuất không tối đen mà nhuốm màu nguồn ấy, có viền mảnh màu ấy.
          const fill = L.rim && L.sources.find((src) => src !== L.rim && src.k > 0.1 && src.rgb !== L.rim.rgb && sideOf(src) !== sideOf(L.rim)) || null;
          // NGƯỢC SÁNG: nguồn sáng (ô cửa ban ngày, bóng đèn đang sáng) ở SAU nhân vật và nằm ngay sau đầu / thân trên màn
          // hình — mặt trước tối lại, viền sáng hai bên vai và tóc (hình bóng ngược sáng của điện ảnh).
          let back = 0, backRgb = '255,250,236', dim = 0, backLamp = 0;
          if (actor.width) {
            const w = actor.width * at.scale, h = actor.height * at.scale, top = at.y - h * (actor.ground || 1);
            for (const win of lighting.mood.sun ? lighting.windows : []) {
              if (win.z > actor.spot.z - 80) continue;
              const a = set.project(win.x, win.y, win.z), b = set.project(win.x + win.width, win.y - win.height, win.z);
              const across = Math.max(0, Math.min(b.x, at.x + w * 0.2) - Math.max(a.x, at.x - w * 0.2)) / (w * 0.4);
              const up = Math.max(0, Math.min(b.y, top + h * 0.6) - Math.max(a.y, top)) / (h * 0.6);
              const k = across * up * lighting.cloud * sunFade() * (lighting.mood.name === 'day' ? 1 : 0.8);
              if (k > back) { back = k; backRgb = lighting.mood.name === 'evening' ? lighting.mood.sunColor : '255,250,236'; }
              dim = Math.max(dim, k);
            }
            for (const lamp of lighting.lamps) {
              if (lamp.kind === 'screen' || lamp.level < 0.3 || lamp.z > actor.spot.z - 80) continue;
              const p = set.project(lamp.x, lamp.y, lamp.z), near = Math.hypot((p.x - at.x) / (w * 0.5), (p.y - (top + h * 0.35)) / (h * 0.5));
              const k = clamp(1.2 - near, 0, 1) * lamp.level * 0.9;
              if (k > back) { back = k; backRgb = lamp.rgb; }
              backLamp = Math.max(backLamp, k);
              dim = Math.max(dim, k * 0.4);                                              // đèn sau lưng: mặt trước tối nhẹ (ngược sáng)
            }
          }
          // Chỉ ô cửa sáng lớn mới làm mặt trước TỐI đi (máy đo sáng theo khoảng trời sau lưng); bóng đèn nhỏ sau lưng chỉ cho
          // viền sáng — làm tối theo nó thì bà đứng trước cây đèn lúc chiều xám xịt (cảnh thử đợt 19).
          const level = L.level * (1 - 0.38 * dim);
          // Sắc ấm: `sepia` một mình làm bạc màu (bà lúc chiều xám xỉn — Gemini đợt 19): bù lại độ bão hoà.
          if (Math.abs(level - 1) > 0.004 || L.warm > 0.004) lit = `brightness(${level.toFixed(3)}) sepia(${(L.warm * 0.7).toFixed(3)}) saturate(${(1 + L.warm * 0.9).toFixed(3)})`;
          // VIỀN SÁNG (rim light): một viền màu đèn ở mép phía nguồn sáng — nhân vật 2D "ăn" ánh sáng của phòng thay vì
          // như dán lên (Gemini soát ánh sáng đợt 16). Phía nào: theo vị trí đèn TRÊN MÀN HÌNH so với nhân vật.
          // ĐỔ BÓNG TRÊN THÂN: hướng ánh sáng trên màn hình (từ nguồn sáng tới nhân vật) — đèn gần nhất, hay hướng sáng
          // chính / nắng khi không có đèn đủ mạnh. Ban ngày nhẹ, tối có đèn thì rõ.
          if (actor.rig && typeof actor.rig.lightShade === 'function' && lighting.shading) {
            const mood = lighting.mood, centre = [actor.where, actor.spot.y + (actor.height || 0) * 0.45, actor.spot.z];
            let from, amount, glow = 0, rgb = '255,255,255';
            // Đổ bóng theo nguồn mạnh nhất ở PHÍA TRƯỚC / bên cạnh: nguồn sau lưng (đèn khám treo sau bàn) chỉ cho viền sáng — lấy
            // hướng của nó thì sáng tối trên thân gần như không có chiều ngang, người chấm thấy "sáng đều hai bên" (đợt 27).
            const key = L.sources.find((src) => src.k > 0.12 && (src.front ?? 1) >= 0.5);
            if (key) { from = [key.x, key.y, key.z]; amount = clamp(0.26 + key.k * 0.5, 0, 0.6); glow = clamp(key.k * 0.35, 0, 0.34) * (key.front ?? 1); rgb = key.rgb; }
            else { const key = mood.sun && mood.name === 'evening' ? norm(mood.sun) : lighting.key; from = [centre[0] - key[0] * 800, centre[1] - key[1] * 800, centre[2] - key[2] * 800]; amount = mood.name === 'night' ? 0.12 : mood.name === 'evening' ? 0.4 : 0.24; glow = mood.name === 'evening' ? 0.18 : 0; rgb = mood.name === 'evening' ? mood.sunColor : rgb; }
            const a = set.project(...from), b = set.project(...centre);
            // BAN NGÀY, người: phía hướng về nắng / cửa sổ ỬNG SÁNG (màu nắng), phía kia tối hơn. Chỉ làm tối phía khuất (0,24, phía
            // sáng không thêm gì) thì nửa phía nguồn sáng chỉ sáng hơn nửa kia 2–5 % (đo bằng tools/light_side.py, đợt 29) — người
            // chấm thấy "sáng đều hai bên", câu hỏi duy nhất trượt ổn định (đợt 28). Đêm / chiều / cạnh đèn: giữ như cũ.
            if (mood.name === 'day' && isPerson(actor)) { amount = Math.max(amount, 0.34); glow = Math.max(glow, 0.32); if (!key) rgb = mood.sunColor || '255,244,214'; }
            // Thú nhỏ, mình ngang: khối sáng tối phải đậm hơn mới đọc ra (Gemini đợt 17: "mèo còn phẳng").
            if (!isPerson(actor)) { amount = Math.min(0.68, amount * 1.45); glow = Math.min(0.4, glow * 1.3); }
            // Ngược sáng: phía trước tối đều, không còn một phía được chiếu rõ.
            // Ô cửa chỉ lấp ló sau vai (ngược sáng MỘT PHẦN, dim ≲ 0,2): phía hướng về nguồn chính vẫn được chiếu gần đủ — làm tối
            // theo cả `dim` thì ông đứng lệch trước cửa sổ phòng khách chỉ sáng hơn nửa kia 6 % (đợt 29). Ngược sáng thật (≥ 0,4):
            // như cũ, phía trước tối đều.
            if (dim > 0) glow *= 1 - dim * (0.3 + 0.7 * clamp((dim - 0.15) / 0.25, 0, 1));
            // NHỎ TRÊN MÀN HÌNH thì sáng tối phải đậm hơn mới đọc ra (đợt 25: "phía nào hướng về đèn?" hỏng 3 lần ở khung dọc, nhân
            // vật cao ~400 px): dưới 700 px tăng dần tới 1,5 lần.
            const tallPx = (actor.height || 0) * at.scale, small = clamp((700 - tallPx) / 400, 0, 1);
            amount = Math.min(0.75, amount * (1 + 0.5 * small)); glow = Math.min(0.5, glow * (1 + 0.6 * small) + (mood.name === 'night' ? 0 : 0.06 * small));
            // Ban ngày / phòng sáng: phía khuất NGẢ LẠNH hẳn (xanh xám), không chỉ tối đi — đọc ra hướng sáng (phòng khám "phẳng").
            // CON VẬT: phía khuất tối trung tính ấm, không ngả xanh, và không quá 0,45 — xanh lam ở độ đậm 0,6–0,7 (×1,45 rồi
            // ×1,5 vì nhỏ trên màn hình) phủ gần hết con mèo xám, con corgi cam thành xanh xám (đợt 29). Đang ĐƯỢC BẾ: nằm
            // trước ngực người, chỉ tối nhẹ (≤ 0,2) — giữ màu lông thật.
            const carried = !!(actor.rig.svg && !host.contains(actor.rig.svg));
            if (!isPerson(actor)) { amount = Math.min(carried ? 0.2 : 0.45, amount); if (carried) glow = Math.min(glow, 0.1); }
            const darkSide = !isPerson(actor) ? (mood.name === 'night' ? mood.shade : '46,36,30') : mood.name === 'day' ? '52,82,140' : mood.shade;
            actor.rig.lightShade(b.x - a.x, b.y - a.y, amount, rgb, glow, darkSide, fill ? fill.rgb : null, fill ? clamp(fill.k * 1.1, 0, 0.5) : 0);
            actor.keySide = Math.sign(a.x - b.x) || 1;                                     // phía nguồn sáng chính trên màn hình (viền mảnh bên dưới)
            // Cho tools/light_side.py: giờ trong ngày, có nguồn sáng chính gần (đèn, cửa sổ) hay chỉ hướng sáng chung, ngược sáng bao nhiêu.
            actor.lightInfo = { mood: mood.name, key: !!key, back: +dim.toFixed(3), amount: +amount.toFixed(3), glow: +glow.toFixed(3) };
            if (typeof actor.rig.lightBounce === 'function') { const up = bounceAt(actor, L); actor.rig.lightBounce(up.rgb, carried ? 0 : up.amount); }      // trong vòng tay: không còn ánh sàn hắt lên
          }
          const scale = Math.max(0.3, at.scale), wide = lighting.mood.dark > 0.2 ? 3.4 : 2.2;
          // Đứng GẦN ĐÈN lúc tối: một quầng nhạt màu đèn ôm quanh người — đèn tách người khỏi nền tối.
          if (actor.rig && lighting.mood.dark > 0.3) {
            const near = L.sources.find((src) => !src.window && !src.sun && !src.torch && !src.screen && src.k > 0.15);
            if (near) lit += ` drop-shadow(0 0 ${(9 / scale).toFixed(2)}px rgba(${near.rgb},${Math.min(0.45, near.k * 0.6).toFixed(3)}))`;
          }
          if ((!L.rim || L.rim.k <= 0.08) && actor.rig && actor.keySide && lighting.mood.name !== 'night') {
            // Không có nguồn gần: một VIỀN MẢNH ở mép hướng về hướng sáng chính (nắng, trời) — mép ấy sáng hơn mép kia (đợt 25).
            const px = (1.6 / scale).toFixed(2), tone = lighting.mood.name === 'evening' ? lighting.mood.sunColor : '255,252,240';
            lit += ` drop-shadow(${actor.keySide * px}px ${(-px * 0.3).toFixed(2)}px 0 rgba(${tone},0.5))`;
          }
          if (L.rim && L.rim.k > 0.08) {                                                  // cả đạo cụ phẳng (cây, TV): viền sáng phía nguồn sáng
            // Phòng tối: viền dày hơn (3,4 px trên màn hình) — viền sáng là thứ tách nhân vật khỏi nền tối.
            // Ánh cửa sổ ban ngày: viền trắng rõ hơn (phòng khám sáng gắt sau lưng — Gemini đợt 20).
            const px = ((L.rim.window ? 3 : wide) * Math.min(1, L.rim.k * (L.rim.window ? 2.4 : 1.6)) / scale).toFixed(2);
            lit += ` drop-shadow(${sideOf(L.rim) * px}px ${(-px * 0.4).toFixed(2)}px 0 rgba(${L.rim.rgb},${Math.min(0.75, L.rim.k * 1.1).toFixed(3)}))`;
          }
          if (fill && actor.rig) {
            const px = (1.6 * Math.min(1, fill.k * 1.8) / scale).toFixed(2);
            lit += ` drop-shadow(${sideOf(fill) * px}px 0px 0 rgba(${fill.rgb},${Math.min(0.55, fill.k * 1.1).toFixed(3)}))`;
          }
          if (back > 0.08 && actor.rig) {
            // Ô CỬA sáng sau lưng: viền rõ hai bên (5 px trên màn hình) và một quầng mềm loang quanh tóc, vai — ánh trời tràn
            // qua mép hình. BÓNG ĐÈN nhỏ sau lưng: chỉ viền mảnh — quầng màu đèn trên tường sáng thành viền cam bẩn quanh đầu
            // (Gemini soát ánh sáng đợt 19).
            // Đèn sau lưng: viền vàng rõ (3,2 px) và một chút sáng tràn qua mép (light wrap) — nhỏ, sát mép: quầng rộng màu đèn
            // trên tường sáng thành viền cam bẩn (đợt 19).
            const lampOnly = backLamp >= back - 0.001, px = ((lampOnly ? 3.2 : 5) * Math.min(1, back * 1.3) / scale).toFixed(2), alpha = Math.min(lampOnly ? 0.8 : 0.9, back * 1.1).toFixed(3);
            lit += ` drop-shadow(${px}px ${(-px * 0.3).toFixed(2)}px 0 rgba(${backRgb},${alpha})) drop-shadow(-${px}px ${(-px * 0.3).toFixed(2)}px 0 rgba(${backRgb},${alpha}))`;
            lit += lampOnly ? ` drop-shadow(0 0 ${(4 / scale).toFixed(2)}px rgba(${backRgb},${(0.4 * back).toFixed(3)}))` : ` drop-shadow(0 0 ${(14 / scale).toFixed(2)}px rgba(${backRgb},${(0.55 * back).toFixed(3)}))`;
          }
        }
        soften(actor, host, lit, blurAt(at.depth));
        host.style.zIndex = 2 * rank + 1;
        // Nằm HẲN ngoài khung (vật tiền cảnh khi máy đã lia đi, nhân vật khi máy vào cận người khác) hoặc ở sau lưng máy
        // quay thì ẩn: khỏi vẽ, và `hyperframes check` không coi nó là phần tử lạc khỏi khung.
        // Xét theo PHẦN CÓ HÌNH của nó (đạo cụ chỉ chiếm giữa khung 400 × 470), không theo cả hộp host — chậu cây sát máy
        // có hộp to gấp bốn khung hình, mép hộp lấn vào khung trong khi chậu cây đã ra ngoài.
        if (!actor.content) actor.content = contentOf(host);
        const [cx0, cy0, cx1, cy1] = actor.content, w = actor.width * at.scale, h = actor.height * at.scale;
        const left = at.x - w / 2, top = at.y - h * (actor.ground || 1);
        const away = camera.lens - at.depth < 60 || left + cx0 * w > view.clientWidth || left + cx1 * w < 0 || top + cy0 * h > view.clientHeight || top + cy1 * h < 0;
        actor.frame = away ? null : { left, top, w, h };                                                // khung host trên màn hình (cho `framing()`)
        if ((host.style.display === 'none') !== away) host.style.display = away ? 'none' : '';          // `display`, không `visibility`: `check` vẫn đo phần tử bị ẩn bằng visibility
        // RA KHỎI PHÒNG (bước vào / bước ra qua tường bên): mờ dần trong khoảng một phần tư bề ngang người hai bên mép sàn —
        // tường bên chỉ là một mặt phẳng nền, không che được ai đứng ngoài nó.
        const margin = actor.width * 0.25, inside = room ? Math.min(actor.where - room[0], room[1] - actor.where) : Infinity;
        const present = room ? clamp((inside + margin) / (2 * margin), 0, 1) : 1;
        // Quầng sáng / luồng sáng của một ĐÈN: độ hiện là mức sáng của đèn (đèn tắt thì không có quầng).
        if (actor.lamp) { if (host.style.opacity !== actor.lamp.level.toFixed(3)) host.style.opacity = actor.lamp.level.toFixed(3); }
        else if (+(host.style.opacity || 1) !== +present.toFixed(3)) host.style.opacity = present < 1 ? present.toFixed(3) : '';
        host.style.transform = `translate(${(at.x - (actor.width / 2 + actor.step * actor.unit) * at.scale).toFixed(2)}px, ${(at.y - actor.height * (actor.ground || 1) * at.scale).toFixed(2)}px) scale(${at.scale.toFixed(5)})`;
        // DẤU CẢM XÚC LUÔN Ở TRÊN CÙNG (! ? tim zzz — marks.js): dấu vẽ trong SVG của chính nhân vật, nên người đứng trước
        // con vật (bác sĩ cạnh chó trên bàn) che mất dấu của nó (Gemini soát cảnh thử đợt 13). Khi có dấu: chép nó ra một
        // lớp phủ riêng trên mọi lớp của bối cảnh, đúng chỗ dấu gốc trên màn hình, và ẩn dấu gốc.
        const markEl = rig && rig.markEl;
        if (markEl) {
          const lit = !away && markEl.dataset.kind && +(markEl.getAttribute('opacity') || 0) > 0.01;
          if (lit) {
            if (!actor.markLayer) {
              actor.markLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              actor.markLayer.setAttribute('data-mark-layer', '');
              actor.markLayer.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:9999';
              view.appendChild(actor.markLayer);
            }
            markEl.style.visibility = '';
            const box = view.getBoundingClientRect(), r = markEl.getBoundingClientRect(), local = markEl.getBBox();
            const sx = view.clientWidth / (box.width || 1), sy = view.clientHeight / (box.height || 1), layer = actor.markLayer;
            layer.setAttribute('viewBox', `${local.x} ${local.y} ${Math.max(1, local.width)} ${Math.max(1, local.height)}`);
            layer.setAttribute('width', (r.width * sx).toFixed(2)); layer.setAttribute('height', (r.height * sy).toFixed(2));
            layer.style.transform = `translate(${((r.left - box.left) * sx).toFixed(2)}px, ${((r.top - box.top) * sy).toFixed(2)}px)`;
            layer.style.opacity = markEl.getAttribute('opacity');
            layer.style.display = '';
            layer.innerHTML = markEl.innerHTML;
            markEl.style.visibility = 'hidden';
          } else {
            markEl.style.visibility = '';
            if (actor.markLayer) actor.markLayer.style.display = 'none';
          }
        }
        // Bóng trên sàn: nằm ở lớp ngay SAU nhân vật — trên nền và trên những nhân vật ở xa hơn, dưới mọi đồ vật đứng trước.
        if (rig && rig.el && rig.el.bong && rig.el.bong.style.display !== 'none') rig.el.bong.style.display = 'none';      // dựng lại rig (đổi màu, cầm đồ) thì phần tử mới: ẩn lại
        if (actor.shadow) {
          if (actor.shadow.parentNode !== layers[rank]) layers[rank].appendChild(actor.shadow);
          const across = actor.width * 0.32, deep = across * 0.55, lifted = rig && rig.s && typeof rig.s.y === 'number' && rig.s.y < 0 ? clamp(1 + rig.s.y / 300, 0.4, 1) : 1;
          // Con vật đang được BẾ: SVG của nó nằm trong tay một người (rời khỏi host) — host trống, không có bóng trên sàn.
          const carried = rig && rig.svg && !host.contains(rig.svg);
          const seen = lifted * present * (rig && rig.s && typeof rig.s.mo === 'number' ? clamp(rig.s.mo, 0, 1) : 1) * (away || carried ? 0 : 1);
          castShadows(actor, rank, seen);
          wallShadow(actor, seen);
          Object.assign(actor.shadow.style, { width: across + 'px', height: deep + 'px', opacity: seen.toFixed(3),
            // Đứng trên một hộp (mèo trên bàn khám): nhấc bóng lên khỏi mặt hộp rõ hơn — cùng mặt phẳng thì mặt bàn vẽ đè lên bóng.
            transform: `translate3d(${(actor.where - across / 2).toFixed(2)}px, ${(-actor.spot.y - (actor.spot.y > 0 ? 2.5 : 0.5)).toFixed(2)}px, ${(actor.spot.z - deep / 2).toFixed(2)}px) rotateX(90deg)` });
        }
        if (!actor.turn) return;
        // Máy quay lệch đi thì nhân vật 2D quay BÙ: mức quay của rig = mức do động tác đặt − góc máy / 90°. Giá trị do
        // động tác đặt được nhận ra bằng cách so với lần ghi trước của chính hàm này — không cộng dồn khi `update` chạy
        // hai lần cho cùng một khung.
        const own = rig.s.huong === actor.wrote ? actor.base : rig.s.huong;
        actor.base = own; actor.wrote = clamp(own - camera.yaw / 90, -1, 1);
        if (rig.s.huong !== actor.wrote) { rig.s.huong = actor.wrote; rig.render(); }
      });
      // Mỗi đồ vật vào lớp nằm ngay TRƯỚC những nhân vật ở SAU nó. Nhân vật đứng sát hộp theo chiều ngang thì "sau" tính
      // theo VỊ TRÍ TRONG PHÒNG: đứng sau mặt trước của hộp (z nhỏ hơn) là ở sau hộp, ở mọi góc máy. So khoảng cách tới
      // máy của TÂM hộp với của nhân vật thì người đứng ngang giữa bề sâu cái bàn (bác sĩ cạnh bàn khám) có cùng độ sâu
      // với tâm bàn — máy lia hay người bước nhích là cái bàn nhảy trước / sau người liên tục (người dùng, đợt 5).
      // Nhân vật ở xa hộp (không chồng lên nó trên màn hình) vẫn xếp theo độ sâu như cũ.
      for (const prop of props) {
        const depth = set.project(...prop.centre).depth;
        const near = (actor) => prop.span && actor.where > prop.span[0] - 200 && actor.where < prop.span[1] + 200;
        // Đứng TRÊN hộp (con vật trên bàn khám: chân ở mặt bàn) thì luôn ở trên hộp. Người đứng sát một con vật đang ở trên
        // hộp cũng ở trên hộp: người ấy đã được xếp TRƯỚC con vật (bàn tay khám không chui ra sau nó), mà con vật thì ở trên
        // hộp — để hộp trước người là một vòng lặp lớp, và phép xếp chọn lúc thế này lúc thế kia theo góc máy.
        const onTop = (actor) => actor.spot.y >= prop.top - 1;
        const tending = (actor) => isPerson(actor) && shown.some(({ actor: other }) => other !== actor && onTop(other) && near(other) && together(actor, other));
        const behind = ({ actor, at }) => (onTop(actor) || tending(actor) ? false : near(actor) ? actor.spot.z <= prop.front + 0.5 : at.depth < depth);
        // Hộp nằm ngay DƯỚI nhân vật đầu tiên (xa máy nhất) ở trước nó. Đếm số nhân vật ở sau thì sai khi thứ tự không đúng
        // theo độ sâu (người được xếp trước con vật cạnh nó): hộp nhảy lên trên con vật đứng trên chính nó.
        const first = shown.findIndex((entry) => !behind(entry)), index = first < 0 ? shown.length : first;
        if (prop.group.parentNode !== layers[index]) layers[index].appendChild(prop.group);
      }
      // MẶT CỦA KHỐI HỘP TRÀN RA NGOÀI KHUNG thì không làm mờ. Chrome vẽ hỏng một mặt phẳng 3D có `filter` (mờ, dù chỉ
      // 0,4 px) khi nó tràn khỏi khung hình: cả một khúc mặt trước của cái quầy biến mất, người đứng sau quầy lộ nguyên
      // chân như đứng trước quầy (đo ở cảnh quầy lễ tân, máy quay đặt gần). Vật ở sát máy quay mà nét thì còn hơn một cái
      // hộp bị khuyết. Sàn và tường cũng tràn khung nhưng không hỏng như thế — chỉ xét mặt của vật.
      const frameBox = view.getBoundingClientRect(), margin = 2;
      for (const item of focused) {
        let px = blurAt(set.project(...item.centre).depth);
        if (px && item.solid) {
          const r = item.element.getBoundingClientRect();
          if (r.left < frameBox.left - margin || r.top < frameBox.top - margin || r.right > frameBox.right + margin || r.bottom > frameBox.bottom + margin) px = 0;
        }
        soften(item, item.element, item.filter, px);
      }
      if (lighting) { boxShadows(); beamOverlays(); }
      // Bụi trong luồng nắng: trôi xuống chậm, lắc ngang nhẹ, lấp lánh — theo thời gian của timeline.
      if (lighting && lighting.dust.length) {
        const time = driven ? driven.time() : 0;
        for (const mote of lighting.dust) {
          const y = (mote.by + time * 14) % mote.h, x = mote.bx + Math.sin(time * 0.45 + mote.phase) * 18;
          mote.dot.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
          mote.dot.style.opacity = (0.35 + 0.65 * Math.abs(Math.sin(time * 1.3 + mote.phase))).toFixed(2);
        }
      }
      // Các mặt của bối cảnh chỉ tính lại ánh sáng khi mức sáng của một đèn đổi (bật / tắt dần).
      if (lighting) {
        // Màn hình TV: mức nhấp nháy (làm tròn) và màu cũng vào khoá — vệt sáng TV trên tường, sàn nhấp nháy theo.
        const key = lighting.lamps.map((lamp) => (lamp.kind === 'screen' ? `${(lamp.level * (lamp.pulse ?? 1)).toFixed(2)}${lamp.rgb}` : lamp.level.toFixed(3))).join(',')
          + (lighting.shift ? `|${lighting.shift.state.t.toFixed(3)}` : '');
        if (key !== litKey) {
          litKey = key;
          surfaces.forEach(lightSurface);
          for (const lamp of lighting.lamps) for (const sprite of lamp.sprites) sprite.style.opacity = lamp.level.toFixed(3);
          const dusk = clamp((lighting.mood.dark - 0.1) / 0.45, 0, 1);
          for (const lamp of lighting.lamps) {
            if (lamp.pool) lamp.pool.style.opacity = (lamp.level * dusk).toFixed(3);
            if (lamp.halo) {
              const k = lamp.level * (lamp.pulse ?? 1) * dusk;
              lamp.halo.style.background = `radial-gradient(closest-side, rgba(${lamp.rgb},${(0.8 * k).toFixed(3)}), rgba(${lamp.rgb},${(0.36 * k).toFixed(3)}) 50%, rgba(${lamp.rgb},0))`;
              lamp.halo.style.opacity = '1';
            }
          }
        }
      }
      return frame;
    },

    /**
     * Ai đang BỊ MÉP KHUNG CẮT DỞ ở khung vừa vẽ: `[{ name, shown, edge, pet }]` — `shown` là phần hình còn trong khung (0…1),
     * `edge` là mép cắt ('left' | 'right' | 'top' | 'bottom'). Chỉ nhân vật / con vật (có rig), không tính đồ vật hay
     * người đã ra hẳn ngoài khung. Dùng để soát góc máy: `tools/scene.py` quét cả cảnh và nhắc chỗ nào cắt người làm đôi.
     */
    /**
     * GÓC MÁY TỰ ĐỘNG: giá trị máy quay `{ x, y, z, distance, lens, zoom }` để lấy vừa `subjects` (một rig hay mảng rig) —
     * `size` = 'close' (người: cận mặt; thú: cả con, to), 'medium' (người: ngang ngực), 'full' (cả người). Đo HÌNH VẼ
     * THẬT trên màn hình lúc gọi (ai đang đứng đâu, cao thấp, ngồi trên bàn), nên gọi sau khi đã tua timeline tới lúc
     * cần quay. Những nhân vật khác (`avoid`, mặc định: mọi người còn lại) không bị mép khung cắt đôi: máy dời để họ ra
     * hẳn ngoài khung, không được thì nới khung lấy trọn họ vào. `{ at: [t0, t1], seek }`: chủ thể đi lại — khung chứa
     * mọi chỗ họ đứng ở các lúc ấy (`seek(t)` tua cảnh tới lúc t).
     */
    frameOn(subjects, size = 'medium', { avoid = null, lens = 1700, zoom = 1, at = null, seek = null, lamps = false, tight = false } = {}) {
      set.update();
      const W = view.clientWidth, H = view.clientHeight, list = Array.isArray(subjects) ? subjects : [subjects];
      const wanted = list.map((rig) => actors.find((actor) => actor.rig === rig)).filter(Boolean);
      if (!wanted.length) throw new Error('[character] set.frameOn: none of the subjects stands in this set');
      // Hình vẽ của một nhân vật, đổi về toạ độ bối cảnh: x0 / x1 (ngang), base / top (cao), z.
      const measure = (actor) => {
        const host = actor.host, hidden = host.style.display === 'none', part = (actor.rig.el && actor.rig.el.goc) || actor.rig.svg;
        if (!part || !host.contains(part)) return null;                                   // đang được bế: trong tay người khác
        if (hidden) host.style.display = '';
        // Dấu cảm xúc trên đầu (! ? zzz) không phải là người / con vật: ẩn đi lúc đo, không thì có dấu là khung lùi xa hơn.
        const mark = actor.rig.markEl, shown = mark && mark.style.display;
        if (mark) mark.style.display = 'none';
        const at = set.project(actor.where, actor.spot.y, actor.spot.z), box = view.getBoundingClientRect(), r = drawnRect(part);
        if (mark) mark.style.display = shown || '';
        if (hidden) host.style.display = 'none';
        if (!r.width || !at.scale) return null;
        const sx = W / box.width, sy = H / box.height, toX = (px) => actor.where + ((px - box.left) * sx - at.x) / at.scale, toY = (py) => actor.spot.y + (at.y - (py - box.top) * sy) / at.scale;
        // ĐẦU (người): góc cận né theo đầu — mặt người bên cạnh ra hẳn khỏi khung, cánh tay đang khám / cho thuốc thì được lấn vào.
        const headEl = actor.rig.el && actor.rig.el.dau, h = headEl ? headEl.getBoundingClientRect() : null;
        const head = h && h.width ? { x0: toX(h.left), x1: toX(h.right), top: toY(h.top), base: toY(h.bottom) } : null;
        return { x0: toX(r.left), x1: toX(r.right), top: toY(r.top), base: toY(r.bottom), z: actor.spot.z, person: !!(actor.rig && typeof actor.rig.seatY === 'function'), head };
      };
      // Vùng cần lấy của từng chủ thể theo cỡ cảnh; phần khung hình (theo chiều cao) mà vùng ấy chiếm.
      const FILL = { person: { close: 0.55, medium: 0.86, full: 0.84 }, pet: { close: 0.45, medium: 0.32, full: 0.22 } };
      const regionOf = (m) => {
        const h = m.top - m.base;
        // Con vật: chừa chỗ cho DẤU CẢM XÚC trên đầu (! ? zzz) — không thì dấu ló ra ngoài mép khung (phim dọc đợt 15).
        if (!m.person) { const w = m.x1 - m.x0, h = m.top - m.base; return { x0: m.x0 - 0.1 * w, x1: m.x1 + 0.1 * w, y0: m.base, y1: m.top + 0.35 * h }; }
        // Góc cận: khoảng trống trên đầu 8 % (4 % là đầu chạm mép trên — Gemini đợt 21: "thiếu khoảng thở"); đáy khung dưới
        // vai một chút (0,62) — không cắt ngang giữa ngực.
        return { x0: m.x0, x1: m.x1, y0: size === 'close' ? m.base + 0.62 * h : size === 'medium' ? m.base + 0.45 * h : m.base, y1: m.top + (size === 'close' ? 0.08 * h : 0) };
      };
      // `at: [t0, t1, …]` + `seek(t)`: đo ở từng lúc rồi gộp — khung chứa mọi chỗ chủ thể đứng trong khoảng ấy.
      const merge = (a, b) => (a && b ? { ...a, x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), top: Math.max(a.top, b.top), base: Math.min(a.base, b.base) } : a || b);
      // Người KHÁC cũng đo qua các mốc: bác sĩ bước tới khám rồi lùi về ngay trong nhịp — đo ở đầu / cuối nhịp thì không thấy
      // lúc họ đứng sát con vật (đợt 18: góc cận con mèo vẫn lẹm nửa mặt bác sĩ).
      const otherActors = (avoid || actors.filter((actor) => !wanted.includes(actor) && actor.rig).map((actor) => actor.rig)).map((rig) => actors.find((actor) => actor.rig === rig)).filter(Boolean);
      const mergeHead = (a, b) => (a && b ? merge(a, b) : a || b);
      const mergeOther = (a, b) => (a && b ? { ...merge(a, b), head: mergeHead(a.head, b.head) } : a || b);
      // Có các mốc `at`: chỉ đo ĐÚNG ở các mốc ấy — đo thêm ở lúc hiện tại (trước khi tua) thì vị trí cũ của người vừa bước
      // tới bị gộp vào, khung rộng ra cả quãng đi.
      const timed = Array.isArray(at) && at.length && seek;
      let shots = timed ? wanted.map(() => null) : wanted.map(measure), seen = timed ? otherActors.map(() => null) : otherActors.map(measure);
      if (timed) {
        for (const time of at) { seek(time); shots = shots.map((m, n) => merge(m, measure(wanted[n]))); seen = seen.map((m, n) => mergeOther(m, measure(otherActors[n]))); }
        seek(at[0]);
      }
      shots = shots.filter(Boolean);
      if (!shots.length) throw new Error('[character] set.frameOn: the subjects are not visible');
      // Khung DỌC: người chiếm ít chiều cao hơn — trung cảnh ở 86 % là một cái đầu to đầy khung, mặt rơi đúng chỗ phụ đề.
      const tall = H > W * 1.2, PORTRAIT = { close: 0.38, medium: 0.62, full: 0.8 };
      const fill = (tall && shots.some((m) => m.person) ? PORTRAIT[size] : FILL[shots.some((m) => m.person) ? 'person' : 'pet'][size]) || 0.5;
      const k = lens * zoom;
      const solve = (region, share = fill) => {
        // Bề ngang được dùng: 75 % khung ngang; khung DỌC hẹp thì 90 % — không thì toàn cảnh dọc lùi quá xa, nửa trên là tường.
        const across = H > W * 1.2 ? 0.9 : 0.75;
        const distance = Math.max(250, k * Math.max((region.y1 - region.y0) / (share * H), (region.x1 - region.x0) / (across * W)));
        // Điểm ngắm hiện ở 57 % chiều cao khung (`centre`): hạ điểm ngắm để giữa vùng nằm giữa khung. Khung DỌC: đặt vùng
        // THẤP hơn (55 %) — phụ đề hai dòng nằm trên đầu nhân vật, ở khoảng tường trống (phim dọc đợt 15: phụ đề ở giữa
        // khung thì đè ngang mặt — đầu chibi chiếm nửa thân, miệng luôn ở gần giữa vùng).
        const middle = H > W * 1.2 ? 0.55 : 0.5;
        return { x: (region.x0 + region.x1) / 2, y: (region.y0 + region.y1) / 2 - (0.57 - middle) * H * distance / k, distance };
      };
      // GẦN MÁY HƠN các chủ thể khác (con mèo trên sàn trước bà): trên màn hình nó rơi THẤP hơn số đo phẳng — chừa thêm
      // đáy khung theo khoảng chênh độ sâu (cảnh thử đợt 21: góc hai nhân vật cắt mất chân con mèo).
      const zMean = shots.reduce((sum, m) => sum + m.z, 0) / shots.length;
      const deeper = (m) => { const r = regionOf(m), nearer = Math.max(0, m.z - zMean); return nearer > 40 ? { ...r, y0: r.y0 - nearer * 0.35 } : r; };
      let region = shots.map(deeper).reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) }));
      let cam = solve(region);
      // NGUỒN SÁNG TRONG KHUNG: một đèn đang sáng gần chủ thể — lấy cả bóng đèn vào khung nếu chỉ phải lùi máy thêm ≤ 30 %
      // (góc toàn thân: ≤ 60 %)
      // (ánh sáng có nguồn thấy được, Gemini soát ánh sáng đợt 16). Góc cận thì không.
      if (lighting && size !== 'close') for (const lamp of lighting.lamps) {
        // Màn hình (TV) vào khung ở góc mở đầu / lượt bật đèn lúc tối — nguồn sáng nhấp nháy của căn phòng phải thấy được
        // (Gemini soát ánh sáng đợt 19: "không thấy ánh TV"). Góc toàn: với xa hơn.
        const reach = size === 'full' ? 900 : 500;
        if ((lamp.level < 0.5 && !lamps) || (lamp.kind === 'screen' && !(lamps && lighting.mood.name !== 'day')) || lamp.x < region.x0 - reach || lamp.x > region.x1 + reach) continue;      // `lamps`: lượt bật / tắt đèn — lấy cả đèn đang tắt
        const wider = { x0: Math.min(region.x0, lamp.x - 40), x1: Math.max(region.x1, lamp.x + 40), y0: region.y0, y1: Math.max(region.y1, lamp.y + 50) }, test = solve(wider);
        if (test.distance <= cam.distance * (size === 'full' ? 1.6 : 1.3)) { region = wider; cam = test; }
      }
      // ĐỒ VẬT BỊ MÉP KHUNG CẮT ĐÔI (TV, bàn nước — Gemini đợt 21): dời ngang tối đa 35 % nửa khung để nó ra hẳn hay vào trọn,
      // nếu chủ thể vẫn trọn trong khung. Vật ở tiền cảnh (gần máy hơn chủ thể) thì để: lấp ló ở mép là cách dựng tiền cảnh.
      {
        const zMeanProps = shots.reduce((sum, m) => sum + m.z, 0) / shots.length;
        const spans = props.filter((prop) => prop.spec).map((prop) => ({ a: prop.spec.x, b: prop.spec.x + prop.spec.width, z: prop.spec.z - prop.spec.depth / 2 }))
          .concat(actors.filter((actor) => !actor.rig && !actor.lamp && actor.content && actor.width).map((actor) => {
            const left = actor.where - actor.width / 2; return { a: left + actor.content[0] * actor.width, b: left + actor.content[2] * actor.width, z: actor.spot.z };
          }));
        for (const span of spans) {
          // Tiền cảnh: chỉ đẩy ra hẳn một MẨU lấp ló ở mép (nhánh cây chọc vào khung — Gemini đợt 22), không kéo nó vào.
          const front = span.z > zMeanProps + 150;
          const half = (W / 2) * cam.distance / k, plane = (x) => cam.x + (x - cam.x) * cam.distance / (cam.distance + (zMeanProps - span.z));
          const a = plane(span.a), b = plane(span.b);
          if (b - a > 2 * half) continue;                                   // rộng hơn cả khung: không lấy trọn được
          const shown = (Math.min(b, cam.x + half) - Math.max(a, cam.x - half)) / (b - a);
          // Lẹm dù chỉ 3 % (mép sofa, chân kệ TV ở mép khung dọc) cũng là cắt dở — cả hai mô hình chấm đều thấy (đợt 27).
          if (front ? shown <= 0.01 || shown >= 0.35 : shown <= 0.02 || shown >= 0.97) continue;
          const margin = half * 0.04, left = (a + b) / 2 < cam.x;
          const fits = (x) => region.x0 >= x - half && region.x1 <= x + half && Math.abs(x - cam.x) <= half * (H > W * 1.2 ? 0.7 : 0.35);      // khung dọc hẹp: dời xa hơn
          const out = left ? b + half + margin : a - half - margin, into = left ? a + half - margin : b - half + margin;
          if (fits(out)) cam = { ...cam, x: out }; else if (!front && fits(into)) cam = { ...cam, x: into };
          else if (!front && size === 'full') {
            // Góc TOÀN (mở cảnh): không dời được thì lùi máy lấy trọn đồ vật, nếu chỉ phải lùi ≤ 35 % — khung dọc hẹp, cái TV ở
            // mép phải bị cắt đôi ở mọi cảnh phòng khách (đợt 23).
            const wider = { ...region, x0: Math.min(region.x0, a - margin), x1: Math.max(region.x1, b + margin) }, test = solve(wider);
            if (test.distance <= cam.distance * (H > W * 1.2 ? 1.6 : 1.35)) { region = wider; cam = test; }      // khung dọc hẹp: lùi xa hơn (đợt 25: TV cắt đôi lúc mất điện)
          }
        }
        // XỬ LÝ TỪNG CÁI một thì sửa cái này hỏng cái kia (lấy trọn TV thì sofa ở mép trái bị lẹm — đợt 27). Góc toàn: còn đồ vật
        // nào lẹm mép thì lùi máy lấy trọn TẤT CẢ chúng, cùng giới hạn lùi như trên (tính từ khoảng cách lúc vào bước này).
        if (size === 'full') {
          const start = cam.distance, still = () => {
            const half = (W / 2) * cam.distance / k, plane = (x, z) => cam.x + (x - cam.x) * cam.distance / (cam.distance + (zMeanProps - z));
            return spans.filter((span) => span.z <= zMeanProps + 150).map((span) => ({ a: plane(span.a, span.z), b: plane(span.b, span.z) }))
              .filter(({ a, b }) => b - a <= 2 * half && (Math.min(b, cam.x + half) - Math.max(a, cam.x - half)) / (b - a) > 0.02 && (Math.min(b, cam.x + half) - Math.max(a, cam.x - half)) / (b - a) < 0.97);
          };
          const cut = still();
          if (cut.length) {
            const margin = (W / 2) * cam.distance / k * 0.04;
            const wider = { ...region, x0: Math.min(region.x0, ...cut.map((c) => c.a - margin)), x1: Math.max(region.x1, ...cut.map((c) => c.b + margin)) }, test = solve(wider);
            if (test.distance <= start * (H > W * 1.2 ? 1.6 : 1.35)) { region = wider; cam = test; }
          }
        }
      }
      const others = seen.filter(Boolean)
        // Góc cận: người bên cạnh tính theo ĐẦU (Gemini soát phim đợt 18: góc cận con mèo lấy nửa mặt bác sĩ ở mép khung).
        .map((m) => (size === 'close' && m.person && m.head ? { ...m, ...m.head } : m));
      // NGƯỜI Ở ĐỘ SÂU KHÁC: đổi bề ngang của họ về MẶT PHẲNG CHỦ THỂ (như đồ vật ở trên). Người xa máy hơn trông gần giữa khung
      // hơn toạ độ thật của họ — bà ngồi sofa sau con mèo, ngỡ ở ngoài khung, mẩu tóc vẫn lấp ló ở mép (mẫu phim đợt 26).
      const zSubject = shots.reduce((sum, m) => sum + m.z, 0) / shots.length;
      const depthF = (m) => cam.distance / Math.max(50, cam.distance + (zSubject - m.z));
      const inPlane = (m) => { const f = depthF(m); return { ...m, raw: m, x0: cam.x + (m.x0 - cam.x) * f, x1: cam.x + (m.x1 - cam.x) * f, top: cam.y + (m.top - cam.y) * f, base: cam.y + (m.base - cam.y) * f }; };
      // Nằm HẲN ngoài khung theo chiều dọc (con mèo dưới đáy khung khi cận mặt bà): không tính là bị mép trái / phải cắt.
      const inHeight = (m) => { const span = H * cam.distance / k; return m.top > cam.y - 0.43 * span && m.base < cam.y + 0.57 * span; };
      // Chỗ đặt máy để người `m` ra HẲN ngoài khung (bên trái / phải chủ thể): tính từ toạ độ THẬT — dời máy thì phép đổi về mặt
      // phẳng chủ thể đổi theo, tính bằng toạ độ đã đổi thì dời xong họ lại lấn vào (mẫu phim TV, đợt 26).
      const outside = (m, half, margin, leftOf) => { const raw = m.raw || m, f = depthF(raw); return leftOf ? raw.x1 + (half + margin) / f : raw.x0 - (half + margin) / f; };
      for (let pass = 0; pass < 3; pass++) {
        const half = (W / 2) * cam.distance / k;
        const edge = half * 0.06;
        const cut = others.map(inPlane).filter(inHeight).find((m) => { const seen = Math.max(0, Math.min(m.x1, cam.x + half + edge) - Math.max(m.x0, cam.x - half - edge)); return seen > 0 && seen < (m.x1 - m.x0) * 0.98; });
        if (!cut) break;
        // Dời cho người ấy ra HẲN ngoài khung, nếu chủ thể vẫn trọn trong khung; không thì nới khung lấy trọn người ấy.
        const margin = half * 0.06;                                                       // tóc, tay đung đưa: chừa một khoảng
        const x = outside(cut, half, margin, (cut.x0 + cut.x1) / 2 < cam.x);
        if (region.x0 >= x - half && region.x1 <= x + half) cam = { ...cam, x };
        // Góc CẬN: không đẩy ra được thì giữ cỡ cận — người bên cạnh lẹm vào mép (kiểu "cận bẩn" quen thuộc). Nới khung lấy
        // trọn họ thì góc cận con chó thành góc hai người nhỏ xíu (khung dọc, bác sĩ đứng sát bàn — cảnh thử đợt 15).
        // Góc cận, người bên cạnh không đẩy ra được: lấy trọn ĐẦU họ vào (góc hai nhân vật: đầu, vai người cạnh con vật) —
        // không để nửa khuôn mặt ở mép khung (Gemini, đợt 18). Vật / con vật khác thì giữ cỡ cận, cho lẹm mép.
        else if (size === 'close' && cut.person) { region = { x0: Math.min(region.x0, cut.x0), x1: Math.max(region.x1, cut.x1), y0: region.y0, y1: Math.max(region.y1, cut.top) }; cam = solve(region); }
        else if (tight && cut.person) {
          // `tight`: lấy trọn người lẹm mép nếu chỉ phải lùi máy ≤ 30 % (ba người cùng khung, không ai bị cắt đôi mặt); không
          // thì giữ cỡ cảnh, cho họ lẹm mép (Gemini soát phim đợt 18: bà chủ cắt nửa người ở mép trái suốt lượt khám).
          const wider = { x0: Math.min(region.x0, cut.x0), x1: Math.max(region.x1, cut.x1), y0: region.y0, y1: Math.max(region.y1, cut.top) }, test = solve(wider);
          if (test.distance > cam.distance * 1.3) break;
          region = wider; cam = test;
        }
        else if (size === 'close' || tight) break;                                       // `tight`: giữ cỡ cảnh, người khác lẹm mép
        else { region = { x0: Math.min(region.x0, cut.x0), x1: Math.max(region.x1, cut.x1), y0: Math.min(region.y0, cut.base), y1: Math.max(region.y1, cut.top) }; cam = solve(region); }
      }
      // Theo CHIỀU DỌC: ai đó chỉ ló lên ở đáy khung (tai con chó trên bàn dưới góc cận mặt bác sĩ) — nâng khung lên cho họ
      // ra hẳn, nếu chủ thể vẫn trọn trong khung. Điểm ngắm nằm ở 57 % chiều cao khung (`centre`).
      {
        const half = (W / 2) * cam.distance / k, above = 0.57 * H * cam.distance / k, below = 0.43 * H * cam.distance / k;
        for (const m of others.map(inPlane)) {
          if (Math.min(m.x1, cam.x + half) <= Math.max(m.x0, cam.x - half)) continue;                 // ngoài khung theo chiều ngang
          // Lề 5 % chiều cao khung: máy chúc xuống vài độ (pitch) nên đáy khung thật thấp hơn phép tính phẳng này một chút.
          const bottom = cam.y - below, slack = (above + below) * 0.05;
          if (m.top > bottom - slack && m.top < region.y0 && m.base < bottom) {
            const lift = m.top - bottom + slack;
            if (region.y1 <= cam.y + above + lift - (above + below) * 0.02) { cam = { ...cam, y: cam.y + lift }; continue; }
            // Không nâng được (chủ thể sẽ bị cụt đầu): dời NGANG cho người ấy ra hẳn, nếu chủ thể vẫn trọn trong khung.
            const margin = half * 0.06, x = outside(m, half, margin, (m.x0 + m.x1) / 2 < cam.x);
            if (region.x0 >= x - half && region.x1 <= x + half) { cam = { ...cam, x }; continue; }
            // Không dời được (người ấy đứng sát chủ thể): SIẾT khung — vào gần hơn, đỉnh khung ngay trên chủ thể, cho tới khi
            // đáy khung qua khỏi người ấy; chỉ khi chủ thể vẫn chiếm không quá 95 % chiều cao khung.
            const pad = (region.y1 - region.y0) * 0.04, frame = region.y1 + pad - (m.top + slack);
            if (frame >= (region.y1 - region.y0) * 1.05) {
              const distance = frame * k / H, top = region.y1 + pad;
              cam = { ...cam, distance, y: top - 0.57 * H * distance / k };
            }
          }
          // ĐỈNH khung cắt ngang một người đứng (góc cận con mèo dưới sàn, bà đứng ngay sau: thấy thân, mất đầu — cảnh thử
          // đợt 19): dời NGANG cho người ấy ra hẳn, nếu chủ thể vẫn trọn trong khung; không thì để nguyên (cận bẩn).
          const ceiling = cam.y + above;
          // Lộ dù chỉ 2 % khung (cằm, miệng ở mép trên) cũng là cắt dở — cảnh thử đợt 21 lộ 8 % mà trước đây bỏ qua.
          if (m.person && m.top > ceiling && m.base < ceiling - (above + below) * 0.02 && m.base > region.y0 - (above + below) * 0.5) {
            const margin = half * 0.06, x = outside(m, half, margin, (m.x0 + m.x1) / 2 < cam.x);
            if (region.x0 >= x - half && region.x1 <= x + half) cam = { ...cam, x };
            else {
              // Không dời được (người ấy đứng ngay sau chủ thể): NỚI khung lấy trọn đầu họ, nếu chỉ phải lùi máy ≤ 2,5 lần — góc
              // cận thành góc hai nhân vật, không còn cái thân mất đầu (cảnh thử đợt 20, 21: bà sau con mèo — phải lùi 2,3 lần).
              // Khung mới là góc HAI nhân vật: vùng chiếm 86 % chiều cao như góc trung — không giữ tỉ lệ 45 % của góc cận con vật.
              const wider = { ...region, y1: Math.max(region.y1, m.top + (m.top - m.base) * 0.12) }, test = solve(wider, Math.max(fill, 0.8));      // chừa 12 %: đổi độ sâu chỉ gần đúng
              if (test.distance <= cam.distance * 2.5) { region = wider; cam = { ...test, x: cam.x }; }
            }
          }
        }
      }
      // ĐÁY KHUNG CẮT NGANG CỔ CHÂN (Gemini đợt 21: "cắt mất bàn chân" ở góc trung): cắt sát chân là lỗi bố cục quen thuộc.
      // Hạ khung cho thấy cả bàn chân (và một chút sàn) nếu đầu vẫn trọn trong khung; không thì nâng đáy khung lên ngang gối.
      if (size !== 'close') for (const m of shots) {
        if (!m.person) continue;
        const span = (H * cam.distance) / k, h = m.top - m.base, bottom = cam.y - 0.43 * span, rel = (bottom - m.base) / (h || 1);
        if (rel <= 0 || rel >= 0.2) continue;
        const down = bottom - m.base + 0.03 * span;
        if (region.y1 <= cam.y - down + 0.57 * span - 0.02 * span) cam = { ...cam, y: cam.y - down };
        else cam = { ...cam, y: cam.y + (0.3 - rel) * h };
        break;
      }
      const z = shots.reduce((sum, m) => sum + m.z, 0) / shots.length;
      set.lastFrame = { region, cam, others, shots };                                    // để soát: số đo của lần gọi gần nhất
      return { x: +cam.x.toFixed(1), y: +cam.y.toFixed(1), z: +z.toFixed(1), distance: +cam.distance.toFixed(1), lens, zoom };
    },

    /**
     * ĐẠO DIỄN TỰ ĐỘNG: đặt máy cho cả cảnh từ danh sách NHỊP `beats` — mỗi nhịp `{ time, end, subjects: [rig…], size, speech }`
     * (góc mong muốn từ `time`), hay `{ time, fixed: true }` (kịch bản tự đặt máy ở đây: không đụng tới). Luật:
     *   • một góc giữ ít nhất `minShot` giây (trước một nhịp có lời `speech`: 1 s) — nhịp tới sớm hơn thì đổi góc muộn lại;
     *     nhịp quá ngắn để kịp đổi thì bỏ qua;
     *   • nhịp muốn đúng góc đang có thì giữ nguyên (không cắt sang chính nó);
     *   • cùng nhân vật, chỉ đổi cỡ cảnh: LIA (`move`) thay vì cắt.
     * Góc của từng lần đổi là `frameOn` ở đúng lúc ấy (tua `tl` tới đó để đo). Trả về các thời điểm CẮT (cho phụ đề).
     */
    direct(tl, beats, { minShot = 2.5, pan = 1.2 } = {}) {
      const cuts = [], same = (a, b) => a.length === b.length && a.every((rig) => b.includes(rig));
      let shot = null;
      for (const [index, beat] of beats.entries()) {
        if (beat.fixed) { shot = { fixed: true, at: beat.time }; continue; }
        if (shot && !shot.fixed && shot.size === beat.size && same(shot.subjects, beat.subjects)) continue;
        // Nhịp CÓ LỜI được ưu tiên: người đang nói phải lên hình — góc trước chỉ cần giữ 1 s (không thì câu của cậu bé
        // hiện chữ trên cảnh cận con mèo, cảnh thử đợt 14).
        let at = beat.time;
        const hold = beat.speech || beat.move ? Math.min(minShot, 1.0) : minShot;      // `move`: có người đi — đổi góc kịp trước khi họ ra khỏi khung
        if (shot && at - shot.at < hold) at = shot.at + hold;
        const next = beats.slice(index + 1).find((later) => later.fixed);
        if (at > beat.end - 0.8 || (next && at > next.time - 0.8)) continue;              // không kịp: giữ góc đang có
        let values;
        // Đo ở cả ĐẦU và CUỐI nhịp: nhịp có người đi (lại gần con vật để đưa thuốc, rồi lùi về) thì khung phải chứa cả hai
        // chỗ đứng — đo một lúc thì người đi ra khỏi khung (Gemini soát cảnh thử đợt 14).
        // `mid`: đo đúng lúc GIỮA nhịp (đang khám / cho thuốc) — không phải cả quãng người bước tới rồi lùi về.
        const times = beat.mid ? [(at + beat.end) / 2] : [at, (at + beat.end) / 2, Math.max(at, beat.end - 0.05)];
        try { values = set.frameOn(beat.subjects, beat.size, { lamps: !!beat.lamp, tight: !!beat.mid, at: times, seek: (time) => { tl.seek(time, false); set.update(); } }); } catch (error) { continue; }      // chủ thể đang không thấy (được bế…)
        const glide = shot && !shot.fixed && same(shot.subjects, beat.subjects);
        tl.add(glide ? set.move(values, pan, 'sine.inOut') : set.cut(values), at);
        if (!glide) cuts.push(at);
        // `drift` (giây): máy LÙI CHẬM ra trong lúc ấy — trời chuyển tối, cả căn phòng đổi màu trước mắt người xem.
        if (beat.drift) tl.add(set.move({ distance: +(values.distance * 1.14).toFixed(1) }, Math.max(0.5, Math.min(beat.drift, beat.end - at)), 'sine.inOut'), at + 0.05);
        shot = { subjects: beat.subjects, size: beat.size, at };
      }
      tl.seek(0, false); set.update();
      return cuts;
    },

    /**
     * SỐ ĐO DIỄN XUẤT ở khung vừa vẽ (tools/acting_check.py): với mỗi nhân vật / con vật đang thấy — đường sàn dưới chân
     * (`ground`, y trên màn hình của điểm đứng), đáy bàn chân (`feet`), lòng hai bàn tay (`hands`), khung mặt (`face`) và khung
     * thân (`body`), cao bao nhiêu trên màn hình (`tall`), có đang ngồi không. Toạ độ px trong `view`. Gọi sau khi tua tới lúc cần đo.
     */
    actingProbe() {
      set.update();
      const box = view.getBoundingClientRect(), sx = view.clientWidth / (box.width || 1), sy = view.clientHeight / (box.height || 1);
      const rect = (r) => ({ x0: (r.left - box.left) * sx, y0: (r.top - box.top) * sy, x1: (r.right - box.left) * sx, y1: (r.bottom - box.top) * sy });
      const point = (element, x, y) => { const ctm = element && element.getScreenCTM && element.getScreenCTM(); if (!ctm) return null; const p = new DOMPoint(x, y).matrixTransform(ctm); return { x: (p.x - box.left) * sx, y: (p.y - box.top) * sy }; };
      const frameBox = (rig, b) => { const a = point(rig.svg, b.x, b.y), c = point(rig.svg, b.x + b.width, b.y + b.height); return a && c ? { x0: Math.min(a.x, c.x), y0: Math.min(a.y, c.y), x1: Math.max(a.x, c.x), y1: Math.max(a.y, c.y) } : null; };
      // Con vật ĐANG ĐƯỢC BẾ: hình nó nằm trong hình người bế (không trong host của nó) — vẫn đo thân / mặt (`carried`: true),
      // không đo chân (đợt 29: đo `carry`, `takePet`).
      return actors.filter((actor) => actor.rig && actor.rig.svg && actor.host.style.display !== 'none' && (actor.host.contains(actor.rig.svg) || (actor.rig.svg.isConnected && view.contains(actor.rig.svg)))).map((actor) => {
        const rig = actor.rig, e = rig.el || {}, person = typeof rig.seatY === 'function', at = set.project(actor.where, actor.spot.y, actor.spot.z), carried = !actor.host.contains(rig.svg);
        const feet = ['banL', 'banR', 'banNgL', 'banNgR'].map((key) => e[key]).filter(Boolean).map((el) => el.getBoundingClientRect()).filter((r) => r.height > 0).map(rect);
        const hands = person ? ['L', 'R'].map((side) => e['coTay' + side] && { side, ...point(e['coTay' + side], 0, 10) }).filter((h) => h && Number.isFinite(h.x)) : [];
        // NGƯỜI NGỒI trên một hộp (sofa, ghế đá): đường mặt ghế của rig (`seatY`, nơi mông đặt xuống) và mặt trên của hộp dưới
        // họ, cả hai đo trên màn hình — lệch nhau là người lơ lửng trên ghế hay lún vào nó (đợt 29).
        const sitting = person && rig.s && rig.s.seat > 0.5;
        const under = sitting ? props.find((prop) => prop.spec && actor.where >= prop.span[0] && actor.where <= prop.span[1] && actor.spot.z >= prop.front - prop.spec.depth - 40 && actor.spot.z <= prop.front + 60) : null;
        const seatLine = sitting && typeof rig.seatY === 'function' ? point(rig.svg, 200, rig.seatY()) : null;
        const seat = seatLine ? { y: seatLine.y, top: under ? set.project(actor.where, under.top, Math.min(actor.spot.z, under.front)).y : null } : null;
        const face = typeof rig.shotBox === 'function' ? frameBox(rig, rig.shotBox('face')) : null;
        const body = typeof rig.shotBox === 'function' ? frameBox(rig, rig.shotBox('full')) : null;
        return { name: actor.host.dataset.name || actor.host.id || '', person, carried, seated: !!(rig.s && rig.s.seat > 0.5), ground: at.y, feet: feet.length && !carried ? Math.max(...feet.map((r) => r.y1)) : null,
          tall: (actor.height || 0) * at.scale, hands, face, body, x: at.x, seat, keySide: actor.keySide || 0, light: actor.lightInfo || null };
      });
    },

    framing() {
      const W = view.clientWidth, H = view.clientHeight, cut = [];
      for (const actor of actors) {
        if (!actor.rig || !actor.frame || actor.host.style.display === 'none' || +(actor.host.style.opacity || 1) < 0.5) continue;
        // Phần LÕI của người / con vật — ĐẦU và THÂN, đo trên màn hình — không phải cả hộp host: khung 400 × 470 của rig rộng
        // gấp đôi người, còn SVG thì chứa cả dây dắt, đồ cầm tay (kể cả đang ẩn). Đo theo những thứ ấy thì một khoảng trống
        // hay sợi dây lấn vào mép khung cũng bị coi là "cắt người", hoặc ngược lại che mất một người bị cắt đôi thật.
        const rig = actor.rig, parts = rig.el ? [rig.el.dau, rig.el.than].filter(Boolean) : [];
        if (!parts.length || !rig.svg || !actor.host.contains(rig.svg)) continue;          // đang được bế: nằm trong tay người khác
        const origin = view.getBoundingClientRect(), scale = origin.width / (W || 1) || 1;
        const rects = parts.map(drawnRect).filter((r) => r.width > 0);
        if (!rects.length) continue;
        const x0 = (Math.min(...rects.map((r) => r.left)) - origin.left) / scale, x1 = (Math.max(...rects.map((r) => r.right)) - origin.left) / scale;
        const y0 = (Math.min(...rects.map((r) => r.top)) - origin.top) / scale, y1 = (Math.max(...rects.map((r) => r.bottom)) - origin.top) / scale;
        const area = (x1 - x0) * (y1 - y0);
        if (area <= 0) continue;
        const inside = Math.max(0, Math.min(x1, W) - Math.max(x0, 0)) * Math.max(0, Math.min(y1, H) - Math.max(y0, 0));
        const over = { left: -x0, right: x1 - W, top: -y0, bottom: y1 - H };
        const edge = Object.keys(over).reduce((a, b) => (over[a] >= over[b] ? a : b));
        if (over[edge] > 0) cut.push({ name: actor.host.id || actor.host.dataset.name || '?', shown: +(inside / area).toFixed(3), edge, pet: typeof rig.seatY !== 'function' });
      }
      return cut;
    },
  };

  // Khung HÌNH VẼ của một phần tử trên màn hình. Con vật ĐANG ĐƯỢC BẾ nằm trong hình người bế, mang theo lớp đổ bóng của nó
  // (hình chữ nhật 4400 × 4400, cắt bằng mask) — getBoundingClientRect tính cả hình ấy: người bế "rộng" gấp mười, máy lùi ra
  // xa tít suốt lúc bế, `framing()` báo người ấy bị mép khung cắt (cảnh thử đợt 29). Ẩn các lớp ấy lúc đo.
  function drawnRect(element) {
    const covers = [...element.querySelectorAll('svg svg [data-shade], svg svg [data-bounce]')].map((el) => [el, el.style.display]);
    covers.forEach(([el]) => { el.style.display = 'none'; });
    const r = element.getBoundingClientRect();
    covers.forEach(([el, display]) => { el.style.display = display; });
    return r;
  }

  // Đưa một phần tử phẳng (host của rig, hay một tấm hình) vào bối cảnh. `rig` = null với tấm hình.
  function stand(host, rig, { x, z, y, height, turn, ground, shadow: withShadow }) {
    if (host.parentNode !== view) view.appendChild(host);
    host.setAttribute('data-set3d', '');            // để `captions({ follow })` biết host này do máy quay 3D đặt, không theo bố cục
    Object.assign(host.style, { position: 'absolute', left: '0', top: '0', right: 'auto', bottom: 'auto', transformOrigin: '0 0' });
    if (height) { host.style.height = height + 'px'; host.style.width = ''; }
    const spot = { x, y, z };
    // BÓNG NẰM TRÊN SÀN: một hình elip mờ trên mặt phẳng nằm ngang của bối cảnh, nên nó dẹt lại và xoay đúng theo góc
    // máy. Bóng rig tự vẽ (một elip trong khung phẳng của nó) bị ẩn đi — nó đứng thẳng cùng tấm bìa.
    let shadow = null;
    if (withShadow) {
      shadow = document.createElement('div');
      // Bóng tiếp đất đậm ở giữa: phòng sáng gắt (phòng khám) mà bóng nhạt thì người như lơ lửng (Gemini đợt 21).
      shadow.style.cssText = 'position:absolute;left:0;top:0;transform-origin:0 0;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.55),rgba(0,0,0,.26) 55%,rgba(0,0,0,0))';
    }
    actors.push({ rig, host, spot, ground, shadow, turn: turn && rig && rig.s && typeof rig.s.huong === 'number', blur: 0 });
    // Đặt ngay vào chỗ: không chờ timeline chạy. Công cụ xem trước (peek.sh) hay một trình duyệt mở trang mà chưa tua
    // gì thì thấy đúng cảnh ở khung 0, chứ không phải các host chồng nhau ở góc trên trái.
    set.update();
    return spot;
  }

  // Phần có hình của một host, tính theo tỉ lệ bề ngang / bề cao của nó: [trái, trên, phải, dưới]. Đo một lần (getBBox
  // của SVG theo viewBox); không đo được thì là cả hộp.
  function contentOf(host) {
    const svg = host.querySelector && host.querySelector('svg[data-prop]');
    const frame = svg && svg.viewBox && svg.viewBox.baseVal;
    if (!frame || !frame.width) return [0, 0, 1, 1];
    try {
      const box = svg.getBBox();
      if (!box.width) return [0, 0, 1, 1];
      return [(box.x - frame.x) / frame.width, (box.y - frame.y) / frame.height, (box.x + box.width - frame.x) / frame.width, (box.y + box.height - frame.y) / frame.height];
    } catch (error) { return [0, 0, 1, 1]; }
  }

  // Độ mờ (px) của một vật có độ sâu `depth` (toạ độ máy quay của `project`). Mắt ở `lens`; điểm ngắm cách mắt `distance`.
  const blurAt = (depth) => (camera.blur > 0 ? Math.min(16, camera.blur * Math.abs(camera.lens - depth - camera.distance) / camera.distance) : 0);
  const soften = (item, element, filter, px) => {
    const rounded = Math.round(px * 10) / 10;
    if (rounded === item.blur && filter === item.applied) return;
    item.blur = rounded; item.applied = filter;
    element.style.filter = [filter, rounded ? `blur(${rounded}px)` : ''].filter(Boolean).join(' ');
  };

  // CHÂN Ở ĐÂU TRONG KHUNG CỦA RIG (tỉ lệ theo chiều cao host). Không phải mép dưới host — đặt mép dưới vào điểm đứng thì
  // nhân vật lơ lửng — và cũng không phải tâm cái bóng rig tự vẽ: với nhân vật chân dài (bác sĩ thú y) bàn chân thấp hơn
  // tâm bóng tới 45 đơn vị, đo được trên bản thử. Đo ĐẾ GIÀY thật: đáy thấp nhất của hai bàn chân đang hiện, trừ hai đơn
  // vị cho bề dày đế. Thú (không có phần tử bàn chân riêng) đứng trên mặt nền của khung, chỗ tâm bóng của nó.
  function groundOf(rig) {
    if (!rig) return 1;
    const frame = rig.svg && rig.svg.getBoundingClientRect();
    if (!frame || !frame.height) return null;
    const feet = ['banL', 'banR', 'banNgL', 'banNgR'].map((key) => rig.el && rig.el[key]).filter(Boolean)
      .map((element) => element.getBoundingClientRect()).filter((box) => box.height > 0);
    const size = rig.constructor && rig.constructor.KHUNG;
    if (feet.length) return clamp((Math.max(...feet.map((box) => box.bottom)) - frame.top) / frame.height - 2 / (size ? size.h : 470), 0.5, 1);
    const own = rig.el && rig.el.bong;
    if (own) { const box = own.getBoundingClientRect(); if (box.height) return clamp((box.top + box.height / 2 - frame.top) / frame.height, 0.5, 1); }
    return 1;
  }

  // Một MỐC của máy quay: một tween rỗng (không đụng tới gì) chỉ để chiếm chỗ trên timeline — vị trí và độ dài của nó cho
  // `update()` biết mốc bắt đầu khi nào, chạy bao lâu.
  function mark(values, duration, ease) {
    const tween = gsap.to({}, { duration: Math.max(duration, 0.001), immediateRender: false, ease: 'none' });
    marks.push({ tween, values: { ...values }, duration, curve: gsap.parseEase(ease) || ((p) => p), order: marks.length });
    return tween;
  }

  set.look(initial);
  return set;
}
