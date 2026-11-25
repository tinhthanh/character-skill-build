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
import { localMatrix } from './shading.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const CAMERA_KEYS = ['yaw', 'pitch', 'distance', 'lens', 'x', 'y', 'z', 'zoom', 'blur'];
// Tấm đồ vật tính là ĐỒ ĐẠC khi soát mép khung (`propFraming`, đợt 30) — cây, đèn, bát, ô cửa thì không.
const FURNITURE = ['tv', 'table', 'counter', 'chair', 'stool', 'monitor', 'carrier', 'scale'];
// Góc trung rộng ≥ 85 % góc toàn của cùng chủ thể: cắt sang nó gần như không đổi khung (đợt 31, `direct`).
const MEDIUM_WIDE = 0.85;

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
  let ghostCount = 0;                                    // bàn tay vuốt chép lên trên con vật (đợt 32)
  let frame = null, room = null;                     // room: bề ngang sàn [xMin, xMax] — ra ngoài là ra khỏi phòng
  let trial = null;                                  // máy THỬ (đợt 32): `direct` đo đồ đạc ở mép một góc chưa đặt — đè lên máy của timeline

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
    box({ x, z, width, depth, height, y = 0, colors = '#8fb3bf', name = null } = {}) {
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
      const prop = { group, centre: middle, top: y + height, front: z, span: [x, x + width], spec: { x, z, width, depth, height, y }, name };
      props.push(prop);
      return prop;
    },

    /**
     * ĐẶT một nhân vật (rig người hay thú) vào bối cảnh: chân ở (`x`, `z`) trên sàn, hoặc trên một mặt cao `y` (mặt bàn).
     * `height`: chiều cao của host tính bằng px ở mặt phẳng tiêu cự (bỏ trống thì lấy chiều cao host đang có).
     * `turn: false` để nhân vật KHÔNG tự xoay bù theo góc máy. Trả về điểm đứng { x, y, z } — tween nó để nhân vật đi
     * trong phòng (bước chân thì vẫn do động tác `walk` của rig lo).
     */
    // `over` (đợt 31): một rig người — con vật này luôn vẽ TRÊN người ấy khi hai bên đứng sát nhau (con mèo tới bên bà ngồi
    // sofa: đứng trước hai ống chân bà, không khuất sau chúng). Mặc định người đứng sát con vật luôn vẽ trước nó.
    place(rig, { x = 0, z = 0, y = 0, height = null, turn = true, over = null } = {}) {
      const host = rig && (rig.host || (rig.svg && rig.svg.parentNode));
      if (!host || !rig.svg) throw new Error('[character] set.place(rig, …): pass a rig made by createCharacter / createPet — for a picture or a prop use set.stand(element, …)');
      const spot = stand(host, rig, { x, z, y, height, turn, ground: null, shadow: true });
      if (over) { actors.find((actor) => actor.rig === rig).over = over; set.update(); }
      return spot;
    },

    /**
     * DỜI CHIỀU SÂU (z) của một nhân vật đã đặt — một tween thêm vào timeline: `tl.add(set.depth(cat, -780, 0.45), 9.2)`.
     * Rig 2D chỉ vươn tay trong mặt phẳng của mình: con vật mà hai người ở hai chiều sâu khác nhau cùng với tới thì đứng ở
     * mặt phẳng của người đang với tới nó, lượt nào người nấy (đợt 33).
     */
    // `between: [from, to]` (đợt 33, lượt hai): dời được bất cứ lúc nào trong quãng ấy — `settleDepths` chọn lúc không ai thấy nó
    // trượt (lúc cắt cảnh, hay trong bước đi của chính nó). Mọi lần dời ghi vào `set.depthLog` (acting_check đo).
    depth(rig, z, duration = 0.45, ease = 'sine.inOut', { between = null } = {}) {
      const actor = actors.find((item) => item.rig === rig);
      if (!actor) throw new Error('[character] set.depth(rig, z): rig must be placed with set.place()');
      if (typeof z !== 'number' || !isFinite(z)) throw new Error(`[character] set.depth(rig, z): z must be a number — got ${z}`);
      const tween = gsap.to(actor.spot, { z, duration: Math.max(0, duration), ease, immediateRender: false });
      set.depthLog.push({ rig, name: actor.host.dataset.name || actor.host.id || '', z, tween, between, how: 'tween' });
      return tween;
    },

    /**
     * ĐẶT LẠI LÚC DỜI CHIỀU SÂU (đợt 33, lượt hai) — gọi sau `direct`, với các lúc cắt cảnh: mỗi lần dời có `between` thành tức thì
     * ở lần CẮT muộn nhất trong quãng ấy; không có lần cắt nào thì trải theo một bước ĐI của chính con vật trong quãng ấy
     * (`walks(rig)` → [[t0, t1]…]). Không có cả hai thì để nguyên (trượt 0,45 s trên hình — `how: 'slide'`).
     * Trượt 0,45 s trước lượt người kế với tới thì người xem thấy con mèo đứng yên mà trôi về phía máy.
     */
    settleDepths(cuts = [], walks = null) {
      set.cutLog = cuts.slice();
      for (const move of set.depthLog) {
        if (!move.between) continue;
        const [from, to] = move.between, eps = 1e-3;
        const cut = cuts.filter((time) => time >= from - eps && time <= to + eps).sort((a, b) => b - a)[0];
        if (cut !== undefined) { move.tween.duration(0); move.tween.startTime(cut); move.how = 'cut'; move.at = cut; continue; }
        const walk = (walks ? walks(move.rig) : []).filter(([a, b]) => b > from && a < to).sort((x, y) => y[0] - x[0])[0];
        if (walk) {
          const a = Math.max(walk[0], from), b = Math.min(walk[1], to);
          move.tween.duration(Math.max(0.05, b - a)); move.tween.startTime(a); move.how = 'walk'; move.at = a;
          // THEO BƯỚC CHÂN (đợt 34): bước `walk` có quãng quay đầu, đứng lấy đà, khép chân — x đứng yên ở đó; trải đều z theo thời
          // gian thì con vật vẫn trôi về phía máy lúc chân chưa bước (15 khung). Lấy mẫu x của chính nó suốt bước đi (tua timeline),
          // rồi cho z đi theo đúng phần x đã đi: chân đứng thì z đứng.
          const tl = move.tween.parent, actor = actors.find((item) => item.rig === move.rig);
          if (tl && actor && typeof tl.seek === 'function') {
            const n = Math.max(2, Math.ceil((b - a) * 30)), xs = [], back = tl.time();
            for (let i = 0; i <= n; i++) { tl.seek(a + (b - a) * i / n, false); xs.push(move.rig.s.x || 0); }
            tl.seek(back, false);
            const x0 = xs[0], x1 = xs[n];
            if (Math.abs(x1 - x0) > 1e-3) {
              const ease = (p) => { const f = Math.min(n, Math.max(0, p * n)), k = Math.min(n - 1, Math.floor(f)), x = xs[k] + (xs[k + 1] - xs[k]) * (f - k);
                return Math.min(1, Math.max(0, (x - x0) / (x1 - x0))); };
              const tween = gsap.to(actor.spot, { z: move.z, duration: Math.max(0.05, b - a), ease, immediateRender: false });
              tl.remove(move.tween); tl.add(tween, a); move.tween = tween;
            }
          }
          continue;
        }
        move.how = 'slide'; move.at = move.tween.startTime();
      }
      return set;
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
        return { size, unit, ground, x: actor.spot.x + ((actor.rig === to && typeof at === 'number' ? at : actor.rig.s.x || 0) + (typeof actor.rig.dropX === 'function' ? actor.rig.dropX() : 0)) * unit };
      };
      const head = () => {
        // `part`: 'head' (mặt — chỉ tay, vuốt ve), 'crown' (đỉnh đầu) hay 'body' (giữa thân — nghe tim phổi, tiêm): khung toàn thân, dưới
        // tâm một chút (con vật nằm ngang: phần dưới khung là thân, phần trên là đầu).
        const actor = of(to), f = facts(actor), box = typeof to.shotBox === 'function' ? to.shotBox(part === 'body' || part === 'rear' ? 'full' : 'face') : null;
        // 'crown' (đợt 31): ĐỈNH ĐẦU — con vật đứng TRƯỚC người vuốt (lớp vẽ trên): nhắm giữa mặt thì bàn tay khuất sau đầu nó.
        // 'crown' (con vật vẽ trên người): ngay trên mép đỉnh đầu — tay đè mép, không khuất sau tai. 'top' (người vẽ trước con
        // vật): trong đỉnh đầu, 15 % — tay đặt lên đầu mà không che mặt nó.
        const down = part === 'crown' ? -0.04 : part === 'top' ? 0.15 : part === 'chin' ? 0.8 : 0.5;          // 'chin' (đợt 35): dưới cằm — tay chìa cho liếm
        let hx = box ? box.x + box.width / 2 : f.size.w / 2, hy = box ? box.y + box.height * down : f.ground * (part === 'body' ? 0.4 : 0.6);
        // 'rear' (đợt 35, đo nhiệt độ): THÂN SAU — từ giữa khung toàn thân dời về phía NGƯỜI ĐO một phần tư bề ngang. Con vật quay đuôi
        // về phía người đo trước lượt ấy (tools/scene.py); hướng nó lúc đích được đọc có thể còn là hướng cũ — không suy từ cái đầu.
        // 'chin' / 'lips' (đợt 35, cho uống thuốc): cằm — đáy khung mặt; môi — giữa nét môi THẬT của con vật (`moi`) trong khung của nó.
        if (part === 'chin' && box) hy = box.y + box.height * 0.92;
        if (part === 'rear' && box) hy = box.y + box.height * 0.52;                     // hông (mèo ngồi: giữa khung là ngực — lượt ba)
        const lips = part === 'lips' && to.el && to.el.moi ? lipsOf(to) : null;
        if (lips) { hx = lips.x; hy = lips.y; }
        if (part === 'rear' && box) hx += Math.sign(of(from).spot.x - (f.x + (hx - f.size.w / 2 - (to.s.x || 0)) * f.unit) || 1) * box.width * 0.25;
        // 'leg' (đợt 35): giữa ống chân trước phía người xem — chỗ quấn băng (`bandage`).
        if (part === 'leg' && typeof to.legPoint === 'function') { const q = to.legPoint(); hx = q.x; hy = q.y; }
        // 'tongue' (đợt 35, lượt hai): ngay dưới đầu lưỡi con vật lúc liếm — lòng bàn tay chìa ra ở đó (`offerHand`).
        if (part === 'tongue' && typeof to.lickPoint === 'function') { const q = to.lickPoint(of(from).spot.x < f.x ? -1 : 1); hx = q.x; hy = q.y + 7; }
        return { x: f.x + (hx - f.size.w / 2 - (to.s.x || 0) - (typeof to.dropX === 'function' ? to.dropX() : 0)) * f.unit, y: actor.spot.y + (f.ground - hy) * f.unit };
      };
      // DÁNG ĐẦU của `to` lúc đích được đọc (đợt 32): `follow` dời điểm từ dáng ấy sang dáng ở khung đang vẽ.
      let pose = null, seen = null;
      const mark = () => { if (typeof to.headPose === 'function') pose = to.headPose(); };
      return {
        rig: to,                                            // con vật / người được nhắm (đợt 35: `bandage`, `putCone` đeo đồ cho nó)
        get x() { mark(); const actor = of(from), f = facts(actor); return f.size.w / 2 + (head().x - actor.spot.x) / f.unit; },
        get y() { mark(); const actor = of(from), f = facts(actor); return f.ground - (head().y - actor.spot.y) / f.unit; },
        // BỀ NGANG ĐẦU con vật trong khung của `from` (đợt 32): quãng bàn tay trượt khi vuốt (`stroke`).
        get span() { const box = typeof to.shotBox === 'function' ? to.shotBox('face') : null; return box ? box.width * facts(of(to)).unit / facts(of(from)).unit : 0; },
        pet: to,                                          // rig được nhắm tới (đợt 35: `givePill` vẽ bàn tay trên nó)
        // ĐIỂM (x, y) trong khung của `from`, gắn vào đầu `to` lúc đầu chưa gật / nghiêng: chỗ nó đang ở bây giờ (đợt 32) — bàn tay
        // vuốt bám theo đầu con vật đang dụi, tính lại mỗi khung hình (`stroke`).
        // `time`: giây trong chuỗi (`sequence`) của `to` — đang lấy mẫu chuỗi của `from` thì con vật chưa ở đúng giây ấy: tua chuỗi
        // đã lấy mẫu của nó tới đó, đo, rồi tua về.
        follow(xp, yp, time = null) {
          if (typeof to.follow !== 'function') return { x: xp, y: yp };
          const reel = typeof time === 'number' && to.lastSequence ? to.lastSequence : null, before = reel ? reel.totalTime() : 0;
          if (reel) reel.totalTime(Math.min(time, reel.duration()), false);
          try { return followNow(xp, yp); } finally { if (reel) reel.totalTime(before, false); }
        },
        // ĐỈNH ĐẦU THẬT (đợt 32, chỉ đích 'crown' — con vật vẽ trước người, bàn tay đặt lên mép trên của nó): y trong khung của
        // `from` của mép trên đầu `to` (cả tai) trong khoảng ngang [x0, x1] của `from` chia `bins` cột, ở giây `time` của chuỗi `to`.
        // `bins` = 0: bề ngang cả đầu { x0, x1 }.
        crown(x0, x1, time = null, bins = 1) {
          if (part !== 'crown' || typeof to.crownPoints !== 'function') return null;
          // Viền đầu đo một lần cho mỗi giây `time` (bàn tay dò nhiều độ cao trong cùng một khung).
          if (typeof time !== 'number' || !seen || seen.time !== time) {
            const reel = typeof time === 'number' && to.lastSequence ? to.lastSequence : null, before = reel ? reel.totalTime() : 0;
            if (reel) reel.totalTime(Math.min(time, reel.duration()), false);
            try { seen = { time, points: to.crownPoints().map((q) => toFrom(q.x, q.y)) }; } finally { if (reel) reel.totalTime(before, false); }
          }
          if (bins === 0) {                                   // bề ngang của đầu: { x0, x1 }
            const xs = seen.points.map((q) => q.x);
            return xs.length ? { x0: Math.min(...xs), x1: Math.max(...xs) } : null;
          }
          const tops = new Array(bins).fill(null), width = (x1 - x0) / bins || 1;
          for (const q of seen.points) {
            if (q.x < x0 || q.x > x1) continue;
            const i = Math.min(bins - 1, Math.floor((q.x - x0) / width));
            if (tops[i] === null || q.y < tops[i]) tops[i] = q.y;
          }
          return tops;
        },
      };
      // Khung của `from` ↔ khung của `to` (cùng đổi qua toạ độ bối cảnh).
      function toPet(xp, yp) {
        const a = of(from), fa = facts(a), b = of(to), fb = facts(b), shift = (to.s.x || 0) + (typeof to.dropX === 'function' ? to.dropX() : 0);
        const X = a.spot.x + (xp - fa.size.w / 2) * fa.unit, Y = a.spot.y + (fa.ground - yp) * fa.unit;
        return { x: (X - fb.x) / fb.unit + fb.size.w / 2 + shift, y: fb.ground - (Y - b.spot.y) / fb.unit };
      }
      function toFrom(px, py) {
        const a = of(from), fa = facts(a), b = of(to), fb = facts(b), shift = (to.s.x || 0) + (typeof to.dropX === 'function' ? to.dropX() : 0);
        const X = fb.x + (px - fb.size.w / 2 - shift) * fb.unit, Y = b.spot.y + (fb.ground - py) * fb.unit;
        return { x: fa.size.w / 2 + (X - a.spot.x) / fa.unit, y: fa.ground - (Y - a.spot.y) / fa.unit };
      }
      // (x, y) của `from` → khung của `to` → `to.follow` (đầu đang gật / nghiêng) → về khung của `from`.
      function followNow(xp, yp) { const p = toPet(xp, yp), q = to.follow(p.x, p.y, pose); return toFrom(q.x, q.y); }
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
      if (trial) Object.assign(camera, trial);
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
        // `dropX()`: chỗ người nhận đặt con vật xuống (rig thú, đợt 30) — cộng vào quãng đi.
        actor.step = size && actor.height && actor.rig.s && typeof actor.rig.s.x === 'number' ? actor.rig.s.x + (typeof actor.rig.dropX === 'function' ? actor.rig.dropX() : 0) : 0;
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
      // `over` (set.place, đợt 31): con vật vẽ ngay TRÊN người ấy khi hai bên sát nhau — dời nó ra sau người ấy trong thứ tự lớp
      // (luật cặp trong hàm so sánh không chắc được `sort` áp: nó không bắc cầu với thứ tự theo độ sâu).
      for (const item of shown.filter((entry) => entry.actor.over)) {
        const from = shown.indexOf(item), to = shown.findIndex((entry) => entry.actor.rig === item.actor.over);
        if (to > from && together(item.actor, shown[to].actor)) { shown.splice(from, 1); shown.splice(to, 0, item); }
      }
      // ĐANG BĂNG CHÂN / ĐEO LOA (đợt 35, lượt hai: `rig.caring` + `onTop`): con vật lên TRƯỚC người ấy — hai cánh tay vươn qua
      // thân nó nằm sau nó, chỉ hai bàn tay (bản chép, ở dưới) vẽ trên nó. Người trước con vật thì hai cánh tay che 33 % con chó.
      for (const item of shown.filter((entry) => isPerson(entry.actor) && entry.actor.rig && entry.actor.rig.caring && entry.actor.rig.s && entry.actor.rig.s.careFront > 0.5)) {
        for (const pet of shown.filter((entry) => entry.actor.rig && item.actor.rig.caring.has(entry.actor.rig))) {
          const from = shown.indexOf(pet), to = shown.indexOf(item);
          if (from < to && together(item.actor, pet.actor)) { shown.splice(from, 1); shown.splice(shown.indexOf(item) + 1, 0, pet); }
        }
      }
      // HAI NGƯỜI (đợt 38 C: thì thầm, vỗ vai — `rig.s.pairFront`): người ấy lên TRƯỚC người đang cùng diễn (`rig.pairList[pairSlot]`)
      // khi hai người đứng sát nhau — miệng, bàn tay khum, bàn tay trên vai không khuất sau đầu / tóc người kia.
      const partnerOf = (rig) => rig.pairList && rig.pairList[Math.round(rig.s.pairSlot || 0)];
      for (const item of shown.filter((entry) => isPerson(entry.actor) && entry.actor.rig.s && entry.actor.rig.s.pairFront > 0.5 && partnerOf(entry.actor.rig))) {
        const from = shown.indexOf(item), to = shown.findIndex((entry) => entry.actor.rig === partnerOf(item.actor.rig));
        if (to > from && together(item.actor, shown[to].actor)) { shown.splice(from, 1); shown.splice(to, 0, item); }
      }
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
        if (!away && actor.rig && typeof actor.rig.redrawSign === 'function') actor.rig.redrawSign();      // đợt 39 C: bảng chữ / chớp sáng đặt theo bàn tay — host vừa hiện lại thì vẽ lại
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
      // BÀN TAY VUỐT VẼ TRÊN CON VẬT (đợt 32). Con vật `over` một người ngồi vẽ trên cả người ấy (không khuất sau hai ống chân) —
      // nên bàn tay đặt lên đỉnh đầu nó cũng khuất sau đầu nó: tay đè vào đầu là "lún qua viền" (bà vuốt mèo: chạm ≈ lún + 6 %,
      // không có độ cao bàn tay nào vừa chạm ≥ 15 % vừa lún ≤ 10 %). Trong lúc vuốt (`onTopL/R` của người ấy), vẽ thêm bàn tay ấy
      // ở một lớp ngay TRÊN con vật: một host chép đúng chỗ, cỡ, ánh sáng (`filter`) của host người, trong đó một SVG cùng khung
      // chỉ có `<use>` của nhóm cổ tay, đặt bằng các lớp transform của tay người — trùng từng điểm với bàn tay thật.
      // Đợt 35: cả người đang BĂNG CHÂN / ĐEO LOA cho con vật (`rig.caring`) — bàn tay quấn băng, cầm vành loa vẽ trên nó.
      // Đợt 35 (lượt hai): HAI bàn tay (băng chân, đeo loa bằng hai tay) — mỗi tay đang `onTop` một bản chép (`pet.ghosts[0 | 1]`).
      for (const pet of actors) {
        if (!pet.rig) continue;
        // Đợt 35: người BĂNG CHÂN / ĐEO LOA (`rig.caring`) hay CHO THUỐC (`givePill` ghi con vật ở `rig.onTopPet`) — mọi tay đang `onTop`.
        const caring = !pet.over && actors.find((item) => item.rig && item.rig !== pet.rig && ((item.rig.caring && item.rig.caring.has(pet.rig)) || item.rig.onTopPet === pet.rig) && item.rig.s && (item.rig.s.onTopL > 0.5 || item.rig.s.onTopR > 0.5));
        const ghosts = pet.ghosts || (pet.ghosts = []);
        const hide = (from) => { for (let n = from; n < ghosts.length; n++) if (ghosts[n]) ghosts[n].style.display = 'none'; };
        if (!pet.over && !caring) { hide(0); continue; }
        const person = caring || actors.find((item) => item.rig === pet.over), s = person && person.rig.s;
        // Người ngồi vuốt (`over`): một tay như đợt 32; người đeo đồ: mọi tay đang `onTop`.
        const sides = !s ? [] : caring ? ['L', 'R'].filter((side) => s['onTop' + side] > 0.5) : [s.onTopR > 0.5 ? 'R' : s.onTopL > 0.5 ? 'L' : null].filter(Boolean);
        let slot = 0;
        for (const k of sides) {
          const hand = person.rig.el && person.rig.el['coTay' + k];
          const usable = hand && hand.id && person.host.style.display !== 'none' && pet.host.style.display !== 'none' && person.host.parentNode;
          if (!usable) continue;
          let ghost = ghosts[slot];
          if (!ghost) {
            ghost = ghosts[slot] = document.createElement('div');
            ghost.dataset.ghost = '1';
            // bàn tay, rồi hai lớp đổ bóng / hắt sáng của người (`shading.js`) cắt theo đúng hình bàn tay — thiếu chúng thì bản chép
            // sáng hơn bàn tay thật (người ngồi trong nửa tối của chuyển sắc)
            const mask = `ghost${++ghostCount}`;
            // `data-outline` (đợt 35, lượt hai): VIỀN của bàn tay — rig vẽ viền tay bằng một bộ lọc ở cả cánh tay (`-vienTay`), ngoài
            // nhóm cổ tay; thiếu nó thì bản chép không viền, 20 % điểm ảnh bàn tay (mép) khác bàn tay thật.
            ghost.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block;overflow:visible"><g><use data-outline="1"/><use/></g>
              <defs><filter id="${mask}-white" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>
                <mask id="${mask}" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="4400" height="4400"><g><use filter="url(#${mask}-white)"/></g></mask></defs>
              <g mask="url(#${mask})"><use data-layer="up"/><use data-layer="cover"/></g></svg>`;
          }
          slot++;
          if (ghost.parentNode !== person.host.parentNode) person.host.parentNode.appendChild(ghost);
          ghost.className = person.host.className;
          ghost.style.cssText = person.host.style.cssText;
          ghost.style.zIndex = +(pet.host.style.zIndex || 0) + 1;
          ghost.style.pointerEvents = 'none';
          const svg = ghost.firstChild, outline = svg.firstChild.firstChild, use = outline.nextSibling;
          const ring = person.rig.svg.querySelector('#' + person.rig.id + '-vienTay');
          if (outline.getAttribute('href') !== '#' + hand.id) outline.setAttribute('href', '#' + hand.id);
          if (ring) outline.setAttribute('filter', `url(#${ring.id})`); else outline.removeAttribute('filter');
          const box = person.rig.svg.getAttribute('viewBox');
          if (box && svg.getAttribute('viewBox') !== box) svg.setAttribute('viewBox', box);
          const clip = svg.querySelector('mask > g'), clipUse = clip.firstChild;
          for (const item of [use, clipUse]) if (item.getAttribute('href') !== '#' + hand.id) item.setAttribute('href', '#' + hand.id);
          for (const [key, selector] of [['up', '[data-bounce]'], ['cover', '[data-shade]']]) {
            const layerEl = person.rig.svg.querySelector(':scope > ' + selector), item = svg.querySelector('use[data-layer="' + key + '"]');
            if (layerEl && layerEl.id && item.getAttribute('href') !== '#' + layerEl.id) item.setAttribute('href', '#' + layerEl.id);
          }
          let chain = new DOMMatrix();
          for (let node = hand.parentNode; node && node !== person.rig.svg; node = node.parentNode) {
            chain = localMatrix(node).multiply(chain);
          }
          const placed = `matrix(${[chain.a, chain.b, chain.c, chain.d, chain.e, chain.f].map((v) => +v.toFixed(4)).join(' ')})`;
          svg.firstChild.setAttribute('transform', placed); clip.setAttribute('transform', placed);
          ghost.style.display = '';
        }
        hide(slot);
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
    // `limit` (đợt 31): khoảng cách máy tối đa — góc trung không lùi quá chừng ấy để lấy trọn đồ đạc; đồ đạc PHỤ (không phải TV,
    // không ai ngồi / đứng trên nó) thì được lẹm mép. `direct` đặt nó khi góc trung gần rộng bằng góc toàn.
    // `fill` (đợt 35, lượt ba): phần chiều cao khung chủ thể chiếm — thay số mặc định của cỡ cảnh (góc cận riêng một con vật đang diễn).
    frameOn(subjects, size = 'medium', { avoid = null, lens = 1700, zoom = 1, at = null, seek = null, lamps = false, tight = false, limit = Infinity, roomy = false, core = false, hands = null, fill: share = null } = {}) {
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
        // PHẦN TRÊN THÂN (đợt 32): đầu, mình, hai tay — không có chân. Góc trung / cận cắt ngang dưới hông nên chỉ cần bề ngang
        // này: đo cả người thì đầu gối người ngồi chìa ngang (bà trên sofa: 912 px so với 610 px phần trên) — khung dọc hẹp
        // lùi tới đúng khoảng cách góc toàn (góc trung = 100 % góc toàn, phải giữ góc toàn).
        const upperEl = actor.rig.el && actor.rig.el.than, u = upperEl && upperEl !== part ? drawnRect(upperEl) : null;
        const upper = u && u.width ? { x0: toX(u.left), x1: toX(u.right) } : null;
        // LÕI (đợt 32, lượt hai): đầu và thân áo — không có hai cánh tay. `core`: góc trung lấy bề ngang theo lõi (`direct` thử khi góc
        // trung thường gần bằng góc toàn): hai tay đang múa (giảng giải) chìa ngang làm phần trên thân rộng ~0,6 chiều cao người —
        // khung dọc hẹp thì góc trung không chặt hơn ~0,95 góc toàn 80 %; bàn tay ra mép khung ở góc trung là chuyện thường. Không
        // dùng mặc định: góc trung một người theo lõi là cái mặt choán cả khung dọc (0,43 góc toàn — thành góc cận).
        const coreEls = [actor.rig.el && actor.rig.el.dau, actor.rig.el && actor.rig.el.ao].filter(Boolean).map(drawnRect).filter((r) => r.width > 0);
        const core = coreEls.length && typeof actor.rig.seatY === 'function' ? { x0: toX(Math.min(...coreEls.map((r) => r.left))), x1: toX(Math.max(...coreEls.map((r) => r.right))) } : null;
        return { x0: toX(r.left), x1: toX(r.right), top: toY(r.top), base: toY(r.bottom), z: actor.spot.z, person: !!(actor.rig && typeof actor.rig.seatY === 'function'), head, upper, core, rig: actor.rig };
      };
      // Vùng cần lấy của từng chủ thể theo cỡ cảnh; phần khung hình (theo chiều cao) mà vùng ấy chiếm.
      const FILL = { person: { close: 0.55, medium: 0.86, full: 0.84 }, pet: { close: 0.45, medium: 0.32, full: 0.22 } };
      const mixedClose = wanted.some((actor) => actor.rig && typeof actor.rig.seatY === 'function') && wanted.some((actor) => actor.rig && typeof actor.rig.seatY !== 'function');
      const regionOf = (m) => {
        const h = m.top - m.base;
        // Con vật: chừa chỗ cho DẤU CẢM XÚC trên đầu (! ? zzz) — không thì dấu ló ra ngoài mép khung (phim dọc đợt 15).
        // Góc CẬN có cả người lẫn con vật (đợt 35, lượt ba — cho thuốc, đọc nhiệt kế): lấy ĐẦU con vật (chừa quanh nó), không lấy cả
        // con — con corgi nằm dài trên bàn thấp kéo khung từ đầu người xuống tận bụng nó, thành gần góc toàn (mặt nó 13 % khung).
        if (!m.person && size === 'close' && mixedClose && m.head) { const w = m.head.x1 - m.head.x0, hh = m.head.top - m.head.base; return { x0: m.head.x0 - 0.35 * w, x1: m.head.x1 + 0.35 * w, y0: m.head.base - 0.45 * hh, y1: m.head.top + 0.3 * hh }; }
        if (!m.person) { const w = m.x1 - m.x0, h = m.top - m.base; return { x0: m.x0 - 0.1 * w, x1: m.x1 + 0.1 * w, y0: m.base, y1: m.top + 0.35 * h }; }
        // Góc cận: khoảng trống trên đầu 8 % (4 % là đầu chạm mép trên — Gemini đợt 21: "thiếu khoảng thở"); đáy khung dưới
        // vai một chút (0,62) — không cắt ngang giữa ngực.
        const across = size !== 'full' && core && m.core ? m.core : size !== 'full' && m.upper ? m.upper : m;     // góc trung / cận: bề ngang phần trên thân (đợt 32); `core`: lõi
        // Góc cận người + con vật (đợt 35, lượt bốn): mép trên khung cắt qua TÓC (dưới đỉnh đầu 22 % chiều cao đầu) — con mèo nhỏ cạnh người
        // thì khung từ đỉnh tóc xuống tới đầu nó cao quá, mặt nó chỉ 13 % khung.
        // … và chừa phía con vật 1,0 bề ngang đầu: nhiệt kế giơ ngang mắt bên mặt, thẻ số cạnh nó (lượt bốn: thẻ lẹm mép phải).
        if (size === 'close' && mixedClose && m.head) {
          const hw = m.head.x1 - m.head.x0, pets = shots.filter((q) => !q.person), side = pets.length && (pets[0].x0 + pets[0].x1) / 2 > (m.head.x0 + m.head.x1) / 2 ? 1 : -1;
          return { x0: side < 0 ? Math.min(across.x0, m.head.x0 - 1.0 * hw) : across.x0, x1: side > 0 ? Math.max(across.x1, m.head.x1 + 1.0 * hw) : across.x1, y0: m.base + 0.62 * h, y1: m.head.top - 0.22 * (m.head.top - m.head.base) };
        }
        return { x0: across.x0, x1: across.x1, y0: size === 'close' ? m.base + 0.62 * h : size === 'medium' ? m.base + 0.45 * h : m.base, y1: m.top + (size === 'close' ? 0.08 * h : 0) };
      };
      // `at: [t0, t1, …]` + `seek(t)`: đo ở từng lúc rồi gộp — khung chứa mọi chỗ chủ thể đứng trong khoảng ấy.
      const spread = (a, b) => (a && b ? { x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1) } : a || b);
      const merge = (a, b) => (a && b ? { ...a, x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), top: Math.max(a.top, b.top), base: Math.min(a.base, b.base), upper: spread(a.upper, b.upper), core: spread(a.core, b.core) } : a || b);
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
      // Góc TOÀN dọc: người chiếm 80 % chiều cao. `roomy` (đợt 32): 66 % — `direct` dùng khi góc 80 % còn lẹm đồ đạc quan trọng
      // (cái TV lúc mất điện). Lượt đầu đợt 32 dùng 66 % cho mọi góc toàn dọc để góc trung một người chặt hơn được: góc mở đầu
      // một người đứng thừa sàn, thừa tường — nay góc trung khung dọc lấy bề ngang theo LÕI (đầu, thân áo) thay vào.
      const tall = H > W * 1.2, PORTRAIT = { close: 0.38, medium: 0.62, full: roomy ? 0.66 : 0.8 };
      // Góc cận người + con vật (đợt 35, lượt ba): vùng (mặt người … đầu con vật) chiếm 80 % chiều cao khung — 55 % thì mặt con corgi
      // chỉ 13,9 % khung, viên thuốc / miệng nó vài chục px (Gemini đọc ~1 khung / giây).
      const fill = share || (size === 'close' && mixedClose && !tall ? 0.86 : tall && shots.some((m) => m.person) ? PORTRAIT[size] : FILL[shots.some((m) => m.person) ? 'person' : 'pet'][size]) || 0.5;
      const k = lens * zoom;
      const solve = (region, share = fill, wide = null) => {
        // Bề ngang được dùng: 75 % khung ngang; khung DỌC hẹp thì 90 % — không thì toàn cảnh dọc lùi quá xa, nửa trên là tường.
        // `wide`: bề ngang được dùng khác (bàn tay đang làm động tác chỉ cần nằm trong khung — đợt 33).
        const across = wide || (H > W * 1.2 ? 0.9 : 0.75);
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
      // BÀN TAY ĐANG LÀM ĐỘNG TÁC (đợt 33): `hands` — các lúc (giây) một người trong chủ thể vẫy / chỉ / giơ ngón: khung lấy cả hai
      // bàn tay ở các lúc ấy (thêm 15 % bàn tay mỗi bên). Góc trung khung dọc theo lõi (đầu, thân áo) để tay đang chỉ ra ngoài mép.
      let reach = null;
      if (Array.isArray(hands) && hands.length && seek) {
        const people = wanted.filter((actor) => actor.rig && typeof actor.rig.seatY === 'function' && actor.rig.el);
        for (const time of hands) {
          seek(time);
          for (const actor of people) {
            // Máy lúc dò còn ở góc trước (người này ngoài khung thì host bị ẩn): hiện tạm để đo, như `measure`.
            const host = actor.host, hidden = host.style.display === 'none';
            if (!host.contains(actor.rig.svg)) continue;
            if (hidden) host.style.display = '';
            const at = set.project(actor.where, actor.spot.y, actor.spot.z), box = view.getBoundingClientRect();
            if (!at.scale) { if (hidden) host.style.display = 'none'; continue; }
            const sx = W / box.width, sy = H / box.height, toX = (px) => actor.where + ((px - box.left) * sx - at.x) / at.scale, toY = (py) => actor.spot.y + (at.y - (py - box.top) * sy) / at.scale;
            for (const key of ['coTayL', 'coTayR']) {
              const el = actor.rig.el[key];
              if (!el) continue;
              const r = drawnRect(el);
              if (!r.width) continue;
              const x0 = toX(r.left), x1 = toX(r.right), top = toY(r.top), pad = (x1 - x0) * 0.15;
              if (toY(r.bottom) < region.y0) continue;                                       // dưới đáy khung (tay buông dưới hông)
              reach = { ...(reach || region), x0: Math.min((reach || region).x0, x0 - pad), x1: Math.max((reach || region).x1, x1 + pad), y1: Math.max((reach || region).y1, top + pad) };
            }
            if (hidden) host.style.display = 'none';
          }
        }
        if (timed) seek(at[0]);
      }
      let cam = solve(region);
      // Bàn tay chỉ cần NẰM TRONG khung (92 % bề cao, 94 % bề ngang), không phải chiếm phần khung của người: reo hai tay lên cao
      // mà tính như đầu thì góc trung lùi xa hơn cả góc toàn (123 %). Máy lùi đủ cho cả hai, ngắm giữa vùng có tay.
      if (reach && (reach.x0 < region.x0 || reach.x1 > region.x1 || reach.y1 > region.y1)) {
        // `limit` (góc trung không được lùi quá — `direct`): lùi tới đó thôi, rồi dời ngang về phía bàn tay hết mức mà người (đầu, thân)
        // vẫn trọn trong khung — tay chỉ / vẫy ra ngoài ít nhất có thể, góc trung vẫn hẹp hơn góc toàn.
        const loose = solve(reach, 0.92, 0.94), middle = H > W * 1.2 ? 0.55 : 0.5;
        const distance = Math.max(cam.distance, Math.min(loose.distance, limit)), half = (W / 2) * distance / k * 0.97;
        const x = Math.min(Math.max((reach.x0 + reach.x1) / 2, region.x1 - half), region.x0 + half);
        const fits = distance >= loose.distance;
        cam = { x: region.x1 - region.x0 <= 2 * half ? x : (region.x0 + region.x1) / 2, y: (reach.y0 + reach.y1) / 2 - (0.57 - middle) * H * distance / k, distance };
        // Đỉnh khung ở `cam.y` + 57 % bề cao khung: đầu người luôn trọn trong khung, kể cả khi tay giơ cao không vừa.
        cam.y = Math.max(cam.y, region.y1 - 0.55 * H * distance / k);
        if (fits) region = reach;
      }
      // NGUỒN SÁNG TRONG KHUNG: một đèn đang sáng gần chủ thể — lấy cả bóng đèn vào khung nếu chỉ phải lùi máy thêm ≤ 30 %
      // (góc toàn thân: ≤ 60 %)
      // (ánh sáng có nguồn thấy được, Gemini soát ánh sáng đợt 16). Góc cận thì không.
      if (lighting && size !== 'close') for (const lamp of lighting.lamps) {
        // Màn hình (TV) vào khung ở góc mở đầu / lượt bật đèn lúc tối — nguồn sáng nhấp nháy của căn phòng phải thấy được
        // (Gemini soát ánh sáng đợt 19: "không thấy ánh TV"). Góc toàn: với xa hơn.
        const reach = size === 'full' ? 900 : 500;
        if ((lamp.level < 0.5 && !lamps) || (lamp.kind === 'screen' && !(lamps && lighting.mood.name !== 'day')) || lamp.x < region.x0 - reach || lamp.x > region.x1 + reach) continue;      // `lamps`: lượt bật / tắt đèn — lấy cả đèn đang tắt
        const wider = { x0: Math.min(region.x0, lamp.x - 40), x1: Math.max(region.x1, lamp.x + 40), y0: region.y0, y1: Math.max(region.y1, lamp.y + 50) }, test = solve(wider);
        if (test.distance <= cam.distance * (size === 'full' ? 1.6 : 1.3) && test.distance <= limit) { region = wider; cam = test; }
      }
      let stillCut = 0;                                                                   // đồ đạc quan trọng còn lẹm mép (`direct`, đợt 31)
      // ĐỒ VẬT BỊ MÉP KHUNG CẮT ĐÔI (TV, bàn nước — Gemini đợt 21): dời ngang tối đa 35 % nửa khung để nó ra hẳn hay vào trọn,
      // nếu chủ thể vẫn trọn trong khung. Vật ở tiền cảnh (gần máy hơn chủ thể) thì để: lấp ló ở mép là cách dựng tiền cảnh.
      {
        const zMeanProps = shots.reduce((sum, m) => sum + m.z, 0) / shots.length;
        // `near` / `far`: mặt trước và mặt sau của hộp — mép hộp trên màn hình là mép của mặt GẦN máy hơn (đợt 30: tính theo giữa
        // hộp thì bàn nước "trọn trong khung" mà hình vẽ chạm mép).
        const spans = props.filter((prop) => prop.spec).map((prop) => ({ a: prop.spec.x, b: prop.spec.x + prop.spec.width, z: prop.spec.z - prop.spec.depth / 2, near: prop.spec.z, far: prop.spec.z - prop.spec.depth, name: prop.name }))
          .concat(actors.filter((actor) => !actor.rig && !actor.lamp && actor.content && actor.width).map((actor) => {
            const left = actor.where - actor.width / 2; return { a: left + actor.content[0] * actor.width, b: left + actor.content[2] * actor.width, z: actor.spot.z, near: actor.spot.z, far: actor.spot.z, kind: propKind(actor) };
          }));
        for (const span of spans) {
          // Tiền cảnh: chỉ đẩy ra hẳn một MẨU lấp ló ở mép (nhánh cây chọc vào khung — Gemini đợt 22), không kéo nó vào.
          const front = span.z > zMeanProps + 150;
          const half = (W / 2) * cam.distance / k, plane = (x) => cam.x + (x - cam.x) * cam.distance / (cam.distance + (zMeanProps - span.z));
          const a = plane(span.a), b = plane(span.b);
          if (b - a > 2 * half) continue;                                   // rộng hơn cả khung: không lấy trọn được
          const shown = (Math.min(b, cam.x + half) - Math.max(a, cam.x - half)) / (b - a);
          // Lẹm dù chỉ 3 % (mép sofa, chân kệ TV ở mép khung dọc) cũng là cắt dở — cả hai mô hình chấm đều thấy (đợt 27).
          // Trọn trong khung là cách mép ít nhất 3 % nửa khung: lộ 97 % — hay lộ hết mà chạm mép — vẫn là "chạm mép" (kệ TV khung
          // dọc lúc mất điện, Gemini đợt 29).
          const clear = a >= cam.x - half * 0.97 && b <= cam.x + half * 0.97;
          if (front ? shown <= 0.01 || shown >= 0.35 : shown <= 0.02 || clear) continue;
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
              .filter(({ a, b }) => b - a <= 2 * half && (Math.min(b, cam.x + half) - Math.max(a, cam.x - half)) / (b - a) > 0.02 && !(a >= cam.x - half * 0.97 && b <= cam.x + half * 0.97));
          };
          // LẶP tới khi không còn gì lẹm (đợt 30): lấy trọn cái bàn nước thì máy đặt lại tâm khung, cái TV vừa được đẩy ra hẳn
          // ở trên lại lẹm mép phải (49 % — góc mở đầu phòng khách khung ngang, Gemini): lượt sau lấy trọn cả nó. Lùi quá giới
          // hạn thì giữ góc của lượt trước.
          for (let pass = 0; pass < 4; pass++) {
            const cut = still();
            if (!cut.length) break;
            const margin = (W / 2) * cam.distance / k * 0.04;
            const wider = { ...region, x0: Math.min(region.x0, ...cut.map((c) => c.a - margin)), x1: Math.max(region.x1, ...cut.map((c) => c.b + margin)) }, test = solve(wider);
            if (test.distance > start * (H > W * 1.2 ? 1.6 : 1.35)) break;
            region = wider; cam = test;
          }
        }
        // CÒN ĐỒ VẬT LẸM MÉP (đợt 30): sửa từng cái một thì cái này đẩy cái kia vào mép — góc mở đầu phòng khách khung ngang để
        // TV lộ 49 % ở mép phải; góc trung lúc rọi đèn (khung dọc) cắt đôi TV và bàn nước. Thử một lượt các chỗ đặt máy (dời
        // ngang, góc toàn / trung lùi thêm chút) mà chủ thể vẫn trọn, lấy chỗ ít lẹm nhất: lẹm dở nặng hơn chạm mép.
        // Góc cận người + con vật (đợt 35, lượt bốn) cũng né đồ đạc lẹm mép: bàn khám con vật đứng trên bị mép phải cắt dở (87 %).
        if (size !== 'close' || mixedClose) {
          const portrait = H > W * 1.2, c0 = (0.57 - (portrait ? 0.55 : 0.5)) * H / k, base = cam;
          // `limit`: đồ đạc phụ được lẹm mép — chỉ TV và đồ đang được dùng phải trọn trong khung hay ra hẳn ngoài; đồ phụ lẹm
          // vẫn tính, nhẹ hơn bốn lần (đẩy được nó ra hẳn trong giới hạn thì tốt hơn). `vital`: phần do đồ quan trọng.
          const backed = spans.filter((span) => span.z <= zMeanProps + 150).map((span) => ({ ...span, weight: limit === Infinity || importantProp(span) ? 1 : 0.25 }));
          let vital = 0;
          const badness = (c) => {
            const half = (W / 2) * c.distance / k;
            let bad = 0;
            vital = 0;
            for (const span of backed) {
              const xs = [span.near, span.far].flatMap((z) => { const f = c.distance / Math.max(50, c.distance + (zMeanProps - z)); return [c.x + (span.a - c.x) * f, c.x + (span.b - c.x) * f]; });
              const a = Math.min(...xs), b = Math.max(...xs);
              if (b - a > 2 * half) continue;
              // Ước lượng phẳng lệch vài phần trăm so với hình vẽ thật: ra hẳn ngoài là cách mép thêm 3 %, trọn trong là cách mép 5 %.
              const shown = (Math.min(b, c.x + half * 1.03) - Math.max(a, c.x - half * 1.03)) / (b - a);
              if (shown <= 0 || (a >= c.x - half * 0.95 && b <= c.x + half * 0.95)) continue;
              const cost = shown >= 0.97 ? 0.1 : 0.3 + Math.min(shown, 1 - shown);
              bad += cost * span.weight;
              if (span.weight === 1) vital += cost;
            }
            return bad;
          };
          let best = { cam: base, bad: badness(base), cost: 0, vital };
          if (best.bad > 0) {
            // Góc trung: lùi tới 1,45 / 1,6 (dọc) — góc trung hai người cách xa nhau (bà trên sofa, con mèo) thì xấp xỉ góc toàn; lùi
            // 1,2 thì TV vẫn chạm mép phải.
            const top = Math.min(size === 'full' ? (portrait ? 1.6 : 1.35) : (portrait ? 1.6 : 1.45), limit / base.distance);
            for (let factor = 1; factor <= top + 1e-6 && best.bad > 0; factor += 0.05) {
              const distance = Math.max(base.distance, base.distance * factor), half = (W / 2) * distance / k;
              const shift = size === 'full' ? Infinity : half * (portrait ? 0.7 : 0.35);
              const lo = Math.max(region.x1 - half, base.x - shift), hi = Math.min(region.x0 + half, base.x + shift);
              if (lo > hi) continue;
              for (let n = 0; n <= 24; n++) {
                const c = { ...base, x: lo + (hi - lo) * n / 24, y: base.y - c0 * (distance - base.distance), distance };
                const bad = badness(c), cost = (factor - 1) + Math.abs(c.x - base.x) / (W * distance / k);
                if (bad < best.bad - 1e-6 || (Math.abs(bad - best.bad) < 1e-6 && cost < best.cost)) best = { cam: c, bad, cost, vital };
              }
            }
            cam = best.cam;
          }
          stillCut = best.vital;
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
        else if (size === 'close' && cut.person) {
          // Thành góc hai nhân vật: dựng hẳn góc TRUNG của cả hai, qua bước đồ đạc (đợt 31 — xem dưới).
          const rig = (cut.raw || cut).rig;
          if (rig && !list.includes(rig)) { try { return set.frameOn([...list, rig], 'medium', { avoid, lens, zoom, at, seek, lamps, tight, limit }); } catch (error) { /* giữ cách cũ */ } }
          region = { x0: Math.min(region.x0, cut.x0), x1: Math.max(region.x1, cut.x1), y0: region.y0, y1: Math.max(region.y1, cut.top) }; cam = solve(region);
        }
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
          // CON VẬT bị ĐÁY khung cắt ngang (đợt 31): con mèo trên bàn khám dưới góc cận bác sĩ — lộ đầu và nửa thân ở đáy khung
          // (67 %, `tools/scene.py` nhắc suốt 3 s). Nới khung xuống lấy trọn nó nếu chỉ phải lùi máy ≤ 1,8 lần (thành góc người +
          // con vật đang được khám); không thì dời ngang cho nó ra hẳn, nếu chủ thể vẫn trọn trong khung.
          {
            const bottom = cam.y - below, shown = (m.top - bottom) / ((m.top - m.base) || 1);
            if (!m.person && m.base < bottom && shown > 0.05 && shown < 0.95) {
              const pad = (m.top - m.base) * 0.08;
              const wider = { x0: Math.min(region.x0, m.x0), x1: Math.max(region.x1, m.x1), y0: Math.min(region.y0, m.base - pad), y1: region.y1 }, test = solve(wider, Math.max(fill, 0.8));
              // `ruleLog` (đợt 32): luật này chạy ở đâu — CI (tools/check_scene.py) dựng một cảnh chạm tới nó.
              const noted = (how) => set.ruleLog.push({ rule: 'petBottom', how, size, shown: +shown.toFixed(3) });
              if (test.distance <= cam.distance * 1.8 && test.distance <= limit) { region = wider; cam = test; noted('widen'); continue; }
              const margin = half * 0.06, x = outside(m, half, margin, (m.x0 + m.x1) / 2 < cam.x);
              if (region.x0 >= x - half && region.x1 <= x + half) { cam = { ...cam, x }; noted('shift'); continue; }
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
              // Góc CẬN thành góc hai nhân vật (đợt 31): dựng hẳn góc TRUNG của cả hai — qua bước đồ đạc (góc cận bỏ qua nó: góc
              // cận con mèo nới ra lấy đầu bà ở mẫu "đêm mất điện" để TV lộ 15 % ở mép phải, sofa lẹm mép trái).
              if (test.distance <= cam.distance * 2.5 && size === 'close' && m.rig && !list.includes(m.rig)) {
                try { return set.frameOn([...list, m.rig], 'medium', { avoid, lens, zoom, at, seek, lamps, tight, limit }); } catch (error) { /* giữ cách cũ */ }
              }
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
        else {
          // Nâng đáy khung lên ngang gối — trừ khi thế là cắt mất CON VẬT đang là chủ thể (đợt 31: góc trung bé + con chó, con chó
          // dưới sàn chỉ còn hai cái tai ở đáy khung).
          const raised = cam.y + (0.3 - rel) * h, newBottom = raised - 0.43 * span;
          if (!shots.some((pet) => !pet.person && pet.base < newBottom)) cam = { ...cam, y: raised };
        }
        break;
      }
      const z = shots.reduce((sum, m) => sum + m.z, 0) / shots.length;
      // `whole` (đợt 31): mọi CON VẬT trong chủ thể trọn trong khung — `direct` chỉ nhận góc trung thay thế khi đúng thế.
      const span = (H * cam.distance) / k, half = (W / 2) * cam.distance / k;
      const whole = shots.filter((m) => !m.person).every((m) => m.base >= cam.y - 0.43 * span - span * 0.01 && m.top <= cam.y + 0.57 * span && m.x0 >= cam.x - half && m.x1 <= cam.x + half);
      set.lastFrame = { region, cam, others, shots, stillCut, whole };                                    // để soát: số đo của lần gọi gần nhất
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
    shotLog: [],
    depthLog: [],                                                                          // các lần dời chiều sâu (`depth`, đợt 33)
    ruleLog: [],                                                                           // luật khung hình đã chạy (đợt 32: con vật ở mép dưới)

    direct(tl, beats, { minShot = 2.5, pan = 1.2 } = {}) {
      const cuts = [], same = (a, b) => a.length === b.length && a.every((rig) => b.includes(rig));
      // ĐỒ ĐẠC Ở MÉP của một góc thử (đợt 32): đo bằng phép chiếu THẬT — đặt máy thử (`trial`) rồi `propFraming()`, như
      // acting_check chấm. Ước lượng phẳng của `frameOn` (`stillCut`) bỏ qua góc ngẩng / độ sâu.
      // Trả lại ĐÚNG máy cũ sau khi thử (đợt 32, lượt hai): `update` chép máy thử đè lên `camera` — để nguyên thì các phép đo sau
      // (`frameOn` chiếu bằng máy hiện có) đo từ góc thử cuối cùng: góc cận con mèo lệch sang, lẹm TV 97 % (`dem-mat-dien`).
      const edgeCut = (v) => {
        const kept = { ...camera };
        trial = { ...v }; set.update();
        const cut = set.propFraming().filter((p) => !p.minor && !p.front);
        trial = null; Object.assign(camera, kept); set.update();
        return cut;
      };
      const tallView = view.clientHeight > view.clientWidth * 1.2;
      // NHÍCH MÁY cho đồ đạc quan trọng hết lẹm mép (đợt 32, lượt hai): góc đã chọn còn lẹm một món (TV lộ 97 % — dời máy để
      // đẩy người bên cạnh ra khỏi góc cận con mèo thì kéo nó tới mép) — thử dời máy về phía nó (hay ra xa nó) 0…80 đơn vị, lùi xa thêm 0…45 % (góc trung vẫn phải hẹp hơn 85 % góc toàn — `direct`),
      // nhận cách đầu tiên lẹm ít món hơn mà không chủ thể nào bị mép khung cắt.
      const nameOfRig = (rig) => { const actor = actors.find((item) => item.rig === rig); return actor ? actor.host.id || actor.host.dataset.name || '' : ''; };
      const nudge = (v, subjects) => {
        const cut = edgeCut(v);
        if (!cut.length) return v;
        const names = subjects.map(nameOfRig), toward = cut[0].edge === 'right' ? 1 : -1;
        // về phía món ấy (lấy trọn) trước, rồi ra xa nó (đẩy hẳn ra ngoài — cái bàn khám lộ 12 % ở mép góc trung bác sĩ)
        for (const sign of [toward, -toward]) for (const grow of [1, 1.04, 1.08, 1.12, 1.2, 1.3, 1.45]) for (const d of [0, 8, 16, 24, 32, 48, 64, 80]) {
          if (grow === 1 && !d) continue;
          const test = { ...v, x: +(v.x + sign * d).toFixed(1), distance: +(v.distance * grow).toFixed(1) }, kept = { ...camera };
          trial = { ...test }; set.update();
          const props = set.propFraming().filter((p) => !p.minor && !p.front), people = set.framing().filter((c) => names.includes(c.name));
          trial = null; Object.assign(camera, kept); set.update();
          if (props.length < cut.length && !people.length) { set.ruleLog.push({ rule: 'nudge', from: cut.map((p) => `${p.name} ${Math.round(p.shown * 100)} %`), by: sign * d, grow }); return test; }
        }
        return v;
      };
      // HAI BÀN TAY TRONG KHUNG của góc `v` ở các lúc `times` (đợt 33): đặt máy thử, tua tới từng lúc, đo bàn tay của các người
      // trong `subjects` trên màn hình — như `acting_check` chấm. Tay dưới mép dưới (buông dưới hông) thì thôi.
      const handsInside = (v, subjects, times) => {
        const kept = { ...camera }, W = view.clientWidth, H = view.clientHeight, box = view.getBoundingClientRect();
        let inside = true;
        trial = { ...v };
        for (const time of times) {
          tl.seek(time, false); set.update();
          for (const rig of subjects) {
            if (typeof rig.seatY !== 'function' || !rig.el) continue;
            for (const key of ['coTayL', 'coTayR']) {
              const el = rig.el[key], r = el && drawnRect(el);
              if (!r || !r.width) continue;
              const x0 = (r.left - box.left) * W / box.width, x1 = (r.right - box.left) * W / box.width, y0 = (r.top - box.top) * H / box.height;
              if (y0 >= H) continue;
              // Có dư: cách mép ít nhất 6 % bề rộng bàn tay (acting_check đòi 5 %).
              const room = 0.06 * (x1 - x0);
              if (x0 < room || x1 > W - room || y0 < room) inside = false;
            }
          }
        }
        trial = null; Object.assign(camera, kept); set.update();
        return inside;
      };
      let shot = null;
      for (const [index, beat] of beats.entries()) {
        if (beat.fixed) { shot = { fixed: true, at: beat.time }; continue; }
        // Góc chèn con vật giữ qua nhịp phản ứng của nó (đợt 33, xem `until`).
        if (shot && shot.insert && shot.until && beat.time < shot.until - 0.05 && beat.subjects.every((rig) => shot.subjects.includes(rig))) continue;
        // Nhịp có ĐỘNG TÁC TAY (`hands`, đợt 33) giữ góc đang có chỉ khi hai bàn tay của người làm nằm trong khung ấy lúc động tác.
        const gesture = beat.size !== 'full' && Array.isArray(beat.hands) && beat.hands.length ? beat.hands : null;
        if (shot && !shot.fixed && shot.size === beat.size && same(shot.subjects, beat.subjects) && (!gesture || !shot.values || handsInside(shot.values, beat.subjects, gesture))) continue;
        // Nhịp CÓ LỜI được ưu tiên: người đang nói phải lên hình — góc trước chỉ cần giữ 1 s (không thì câu của cậu bé
        // hiện chữ trên cảnh cận con mèo, cảnh thử đợt 14).
        let at = beat.time;
        // `move`: có người đi — đổi góc kịp trước khi họ ra khỏi khung. `insert`: góc đang có là góc CHÈN phản ứng của con vật
        // (đợt 32) — giữ đủ 2,5 s thì đẩy lùi nhịp sau (lượt có điện lại mất góc toàn của nó, phim-4).
        const hold = beat.speech || beat.move || (shot && shot.insert) ? Math.min(minShot, 1.0) : minShot;
        if (shot && at - shot.at < hold) at = shot.at + hold;
        const next = beats.slice(index + 1).find((later) => later.fixed);
        if (at > beat.end - 0.8 || (next && at > next.time - 0.8)) continue;              // không kịp: giữ góc đang có
        let values;
        // Đo ở cả ĐẦU và CUỐI nhịp: nhịp có người đi (lại gần con vật để đưa thuốc, rồi lùi về) thì khung phải chứa cả hai
        // chỗ đứng — đo một lúc thì người đi ra khỏi khung (Gemini soát cảnh thử đợt 14).
        // `mid`: đo đúng lúc GIỮA nhịp (đang khám / cho thuốc) — không phải cả quãng người bước tới rồi lùi về.
        const times = beat.mid ? [(at + beat.end) / 2] : [at, (at + beat.end) / 2, Math.max(at, beat.end - 0.05)];
        try { values = set.frameOn(beat.subjects, beat.size, { lamps: !!beat.lamp, tight: !!beat.mid, at: times, seek: (time) => { tl.seek(time, false); set.update(); }, hands: gesture }); } catch (error) { continue; }      // chủ thể đang không thấy (được bế…)
        // SỔ GÓC MÁY (đợt 31): góc trung ghi kèm bề rộng góc TOÀN của cùng chủ thể ở cùng các lúc — cùng ống kính thì bề rộng
        // khung tỉ lệ với khoảng cách máy. Góc trung ≥ 85 % góc toàn là cắt sang một khung gần như cũ (`tools/scene.py` nhắc,
        // `acting_check` chấm).
        // Gần bằng: (1) dựng lại góc trung không lùi quá 80 % góc toàn — đồ đạc phụ được lẹm mép (`limit`); (2) góc trung đo đúng
        // lúc động tác; (3) vẫn không được (hai chủ thể đứng xa nhau) thì GIỮ GÓC TOÀN: không cắt sang một khung gần như cũ.
        // GÓC TOÀN DỌC còn lẹm đồ đạc quan trọng (đợt 32, lượt hai): lùi thành góc rộng 66 % nếu nó lẹm ít hơn — cái TV lúc
        // mất điện / có điện lại. Không thì giữ 80 %.
        if (beat.size === 'full' && tallView && beat.subjects.some((rig) => typeof rig.seatY === 'function')) {
          const cut = edgeCut(values);
          if (cut.length) {
            let roomy = null;
            try { roomy = set.frameOn(beat.subjects, 'full', { lamps: !!beat.lamp, tight: !!beat.mid, at: times, seek: (time) => { tl.seek(time, false); set.update(); }, roomy: true }); } catch (error) { roomy = null; }
            const after = roomy ? edgeCut(roomy) : null, used = !!(after && after.length < cut.length);
            set.ruleLog.push({ rule: 'roomyFull', t: +at.toFixed(2), cut: cut.map((p) => `${p.name} ${Math.round(p.shown * 100)} %`), roomy: after ? after.map((p) => `${p.name} ${Math.round(p.shown * 100)} %`) : null, used });
            if (used) values = roomy;
          }
        }
        let size = beat.size, reaction = null;
        if (beat.size === 'medium') {
          const seek = (time) => { tl.seek(time, false); set.update(); };
          let full = null, how = 'medium';
          const tries = {};                                                                  // các lần dựng lại (để soát: vì sao giữ góc toàn)
          const ratio = values.distance;
          // Lượt có ĐỘNG TÁC TAY (đợt 33, lượt hai): góc trung được lùi tới 83 % góc toàn (không phải 80 %) để bàn tay chỉ của người lớn
          // trong khung dọc có dư ở mép — vẫn hẹp hơn mốc 85 %.
          const cap = gesture ? 0.83 : 0.8;
          try { full = set.frameOn(beat.subjects, 'full', { lamps: !!beat.lamp, at: times, seek }); } catch (error) { full = null; }
          if (full && values.distance >= MEDIUM_WIDE * full.distance) {
            let loose = null;
            try { loose = set.frameOn(beat.subjects, 'medium', { lamps: !!beat.lamp, tight: !!beat.mid, at: times, seek, limit: full.distance * cap, hands: gesture }); } catch (error) { loose = null; }
            // Đồ đạc ở mép: `edgeCut` (phép chiếu thật) — góc trung bác sĩ phòng khám khung dọc ước phẳng 0,58 "lẹm" mà hình thật
            // không lẹm gì: góc trung bị bỏ, giữ góc toàn.
            // `sliver`: một mẩu đồ đạc lộ < 35 % ở mép được (góc trung lõi — như góc trung thường, vốn không soát đồ đạc).
            const usable = (v, sliver = false) => {
              if (!v) return false;
              const frame = set.lastFrame, cut = edgeCut(v).filter((p) => !(sliver && p.shown < 0.35)), ok = v.distance < MEDIUM_WIDE * full.distance && !cut.length && frame.whole;
              return { ok, ratio: +(v.distance / full.distance).toFixed(3), cut: cut.map((p) => `${p.name} ${Math.round(p.shown * 100)} %`), whole: frame.whole };
            };
            // Góc thử còn lẹm đồ đạc: nhích máy trước khi chấm (`nudge`). Trả về góc dùng được, hay null.
            const judged = (name, v) => {
              if (!v) return null;
              const w = nudge(v, beat.subjects), r = usable(w, name === 'core');
              tries[name] = { ratio: r.ratio, cut: r.cut, whole: r.whole, ...(w !== v ? { nudged: true } : {}) };
              return r.ok ? w : null;
            };
            let got = null;
            if ((got = judged('loose', loose))) { values = got; how = 'loose'; }
            else {
              // (2) góc trung của người làm động tác + con vật, đo ĐÚNG LÚC động tác (giữa nhịp) — nhịp dài gộp mọi chỗ họ đứng
              // (bé bước tới, quỳ, đứng lên: khung rộng 89–92 % góc toàn). Người xem thấy động tác to hơn, không phải góc toàn.
              let moment = null;
              try { moment = set.frameOn(beat.subjects, 'medium', { lamps: !!beat.lamp, tight: true, at: [(at + beat.end) / 2], seek, limit: full.distance * cap, hands: gesture }); } catch (error) { moment = null; }
              if ((got = judged('moment', moment))) { values = got; how = 'moment'; }
              else if (tallView && (got = judged('core', (() => { try { return set.frameOn(beat.subjects, 'medium', { lamps: !!beat.lamp, tight: !!beat.mid, at: times, seek, limit: full.distance * cap, core: true, hands: gesture }); } catch (error) { return null; } })()))) {
                // (2b) KHUNG DỌC: bề ngang theo LÕI (đầu, thân áo) — hai tay đang múa được ra mép khung (đợt 32, lượt hai).
                values = got; how = 'core';
                // Lõi một người choán cả bề ngang (bác sĩ phòng khám: 0,57 góc toàn — thành góc cận mặt): nới ra tới 0,75 góc toàn nếu
                // vẫn dùng được.
                const roomier = { ...got, distance: +Math.max(got.distance, full.distance * 0.75).toFixed(1) };
                if (roomier.distance > got.distance) { const r = usable(roomier, true); if (r && r.ok) { values = roomier; tries.core.widened = r.ratio; } }
              }
              else {
                // (3) GÓC ĐƠN của người làm (đợt 32): hai chủ thể đứng xa nhau — khung dọc hẹp, bà trên sofa rọi đèn pin sang con
                // mèo giữa phòng: góc hai người nào cũng gần bằng góc toàn (98 %) hay lẹm TV. Quay người làm một mình ở cỡ trung
                // (con vật có góc cận của nó ở nhịp sau). Chỉ khi chủ thể đầu là người.
                let single = null;
                const actor = beat.subjects[0], person = actor && typeof actor.seatY === 'function';
                if (person && beat.subjects.length > 1) {
                  try { single = set.frameOn([actor], 'full', { lamps: !!beat.lamp, tight: true, at: [(at + beat.end) / 2], seek, limit: full.distance * 0.8 }); } catch (error) { single = null; }
                }
                if ((got = judged('single', single))) {
                  values = got; how = 'single';
                  // CẮT SANG CON VẬT TRONG CÙNG LƯỢT (đợt 32, lượt hai): góc đơn bỏ mất con vật — người xem (và người chấm) không thấy nó
                  // phản ứng với động tác (bà rọi đèn pin, con mèo giật mình). Nửa sau nhịp: góc trung của các chủ thể còn lại, đo
                  // đúng lúc ấy. Nhịp quá ngắn (mỗi góc < 1,2 s) thì thôi.
                  const others = beat.subjects.filter((rig) => rig !== actor), cutAt = Math.max(at + 1.2, (at + beat.end) / 2);
                  if (others.length && cutAt <= beat.end - 1.2 && !(next && cutAt > next.time - 0.8)) {
                    // PHẢN ỨNG Ở LƯỢT SAU (đợt 33): nhịp ngay sau chỉ có con vật ấy (nó giật mình, sợ…) — góc chèn kéo dài tới hết nhịp
                    // ấy, đo cả lúc giữa nhịp ấy; không thì phản ứng rơi vào một góc mới (cắt từ góc trung sang góc cận cùng con vật).
                    const after = beats[index + 1], through = after && !after.fixed && after.subjects.length && after.subjects.every((rig) => others.includes(rig)) && !(next && after.time >= next.time) ? after : null;
                    const when = [(cutAt + beat.end) / 2].concat(through ? [(through.time + through.end) / 2] : []);
                    let pet = null;
                    try { pet = set.frameOn(others, 'medium', { lamps: !!beat.lamp, tight: true, at: when, seek }); } catch (error) { pet = null; }
                    // Góc chèn cũng nhích máy cho đồ đạc quan trọng hết lẹm mép (sofa lộ 16 % ở mép trái khi góc chèn nới ra lấy cả
                    // lúc con mèo giật lùi).
                    if (pet) { seek(when[when.length - 1]); reaction = { values: nudge(pet, others), at: cutAt, subjects: others, until: through ? through.end : beat.end }; }
                  }
                }
                else { values = full; size = 'full'; how = 'full'; }      // (4) vẫn không được: giữ góc toàn
              }
            }
          }
          // GÓC TOÀN CHO ĐỘNG TÁC HAI TAY (đợt 33, lượt hai): khung dọc, góc trung đã chọn vẫn không chứa hai bàn tay lúc động tác (bé
          // reo hai tay chữ V: cần ~1,02 góc toàn) — quay hẳn góc toàn có cả hai tay. Một góc trung rộng hơn góc toàn không còn là góc trung.
          if (gesture && tallView && full && !handsInside(values, beat.subjects, gesture)) {
            let wide = null;
            try { wide = set.frameOn(beat.subjects, 'full', { lamps: !!beat.lamp, at: times, seek, hands: gesture }); } catch (error) { wide = null; }
            if (wide) {
              const w = nudge(wide, beat.subjects);
              if (handsInside(w, beat.subjects, gesture)) { values = w; size = 'full'; how = 'gesture'; reaction = null; }
            }
          }
          const nameOf = (rig) => { const actor = actors.find((item) => item.rig === rig); return actor ? actor.host.dataset.name || actor.host.id || '' : ''; };
          set.shotLog.push({ t: +at.toFixed(2), end: +beat.end.toFixed(2), size: beat.size, subjects: beat.subjects.map(nameOf), how,
                             first: full ? +(ratio / full.distance).toFixed(3) : null, ratio: full ? +(values.distance / full.distance).toFixed(3) : null, tries, ...(gesture ? { hands: handsInside(values, beat.subjects, gesture) } : {}),
                             ...(reaction ? { then: { t: +reaction.at.toFixed(2), until: +reaction.until.toFixed(2), subjects: reaction.subjects.map(nameOf) } } : {}) });
          // Thành góc toàn của đúng những chủ thể của góc đang có: giữ nguyên, không cắt.
          if (size === 'full' && shot && !shot.fixed && shot.size === 'full' && same(shot.subjects, beat.subjects)) continue;
        }
        values = nudge(values, size === 'full' || !reaction ? beat.subjects : beat.subjects.slice(0, 1));
        const glide = shot && !shot.fixed && same(shot.subjects, beat.subjects);
        tl.add(glide ? set.move(values, pan, 'sine.inOut') : set.cut(values), at);
        if (!glide) cuts.push(at);
        // `drift` (giây): máy LÙI CHẬM ra trong lúc ấy — trời chuyển tối, cả căn phòng đổi màu trước mắt người xem.
        if (beat.drift) tl.add(set.move({ distance: +(values.distance * 1.14).toFixed(1) }, Math.max(0.5, Math.min(beat.drift, beat.end - at)), 'sine.inOut'), at + 0.05);
        shot = { subjects: beat.subjects, size, at, values };
        if (reaction) { tl.add(set.cut(reaction.values), reaction.at); cuts.push(reaction.at); shot = { subjects: reaction.subjects, size: 'medium', at: reaction.at, insert: true, until: reaction.until, values: reaction.values }; }
      }
      tl.seek(0, false); set.update();
      return cuts;
    },

    /**
     * SỐ ĐO DIỄN XUẤT ở khung vừa vẽ (tools/acting_check.py): với mỗi nhân vật / con vật đang thấy — đường sàn dưới chân
     * (`ground`, y trên màn hình của điểm đứng), đáy bàn chân (`feet`), lòng hai bàn tay (`hands`), khung mặt (`face`) và khung
     * thân (`body`), cao bao nhiêu trên màn hình (`tall`), có đang ngồi không. Toạ độ px trong `view`. Gọi sau khi tua tới lúc cần đo.
     */
    /** ĐIỂM CHỈ trên phim X-quang (đạo cụ `xray`, phần tử `data-xray-spot`) ở khung vừa vẽ, cùng hệ toạ độ với `actingProbe` (đợt 35). */
    spotProbe() {
      set.update();
      const box = view.getBoundingClientRect(), sx = view.clientWidth / (box.width || 1), sy = view.clientHeight / (box.height || 1);
      return [...view.querySelectorAll('[data-xray-spot]')].map((el) => { const r = el.getBoundingClientRect(); return { x: (r.left + r.width / 2 - box.left) * sx, y: (r.top + r.height / 2 - box.top) * sy }; });
    },

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
        // `box` (đợt 31): khung hình vẽ của bàn tay trên màn hình — acting_check đo bàn tay có khuất sau con vật không.
        const hands = person ? ['L', 'R'].map((side) => e['coTay' + side] && { side, ...point(e['coTay' + side], 0, 10), box: rect(drawnRect(e['coTay' + side])) }).filter((h) => h && Number.isFinite(h.x)) : [];
        // NGƯỜI NGỒI trên một hộp (sofa, ghế đá): đường mặt ghế của rig (`seatY`, nơi mông đặt xuống) và mặt trên của hộp dưới
        // họ, cả hai đo trên màn hình — lệch nhau là người lơ lửng trên ghế hay lún vào nó (đợt 29).
        // QUỲ (bé quỳ vuốt con chó cạnh ghế đá) cũng mượn kênh `seat` — không phải ngồi trên hộp (đợt 30).
        const sitting = person && rig.s && rig.s.seat > 0.5 && !(rig.s.kneel > 0.5);
        const under = sitting ? props.find((prop) => prop.spec && actor.where >= prop.span[0] && actor.where <= prop.span[1] && actor.spot.z >= prop.front - prop.spec.depth - 40 && actor.spot.z <= prop.front + 60) : null;
        const seatLine = sitting && typeof rig.seatY === 'function' ? point(rig.svg, 200, rig.seatY()) : null;
        const seat = seatLine ? { y: seatLine.y, top: under ? set.project(actor.where, under.top, Math.min(actor.spot.z, under.front)).y : null } : null;
        const face = typeof rig.shotBox === 'function' ? frameBox(rig, rig.shotBox('face')) : null;
        const body = typeof rig.shotBox === 'function' ? frameBox(rig, rig.shotBox('full')) : null;
        // CHÂN NGƯỜI dạng "viên thuốc" (đợt 30): đùi hông → gối, ống chân gối → cổ chân, kèm bán kính — trên màn hình. Để biết
        // bàn tay có đang đặt trên đùi / gối của chính người ấy không (bà ngồi sofa "vuốt" mèo mà tay nằm trên gối mình), và
        // phần nào của con vật bị chân người đứng trước che mất.
        const legs = person ? ['L', 'R'].flatMap((side) => {
          const leg = e['chan' + side], shin = e['ong' + side];
          if (!leg || !shin) return [];
          const hip = point(leg, 0, 0), knee = point(shin, 0, 0), edge = point(shin, 12, 0);
          let length = 0;
          try { const b = rig.svg.querySelector('#' + rig.id + '-ongHinh' + side).getBBox(); length = b.y + b.height - 10; } catch (error) { length = 0; }
          const ankle = point(shin, 0, length);
          if (!hip || !knee || !ankle || !edge) return [];
          const r = Math.hypot(edge.x - knee.x, edge.y - knee.y);
          return [{ side, part: 'thigh', a: hip, b: knee, r }, { side, part: 'shin', a: knee, b: ankle, r }];
        }) : [];
        // PHẦN THẤY ĐƯỢC của con vật (đợt 30): khung hình vẽ của đầu và thân — không phải khung chụp `shotBox('full')`, lan ra
        // sau đầu gối người ngồi cạnh nó. `acting_check` đo tay tới những điểm trong hai khung ấy mà không bị người khác che.
        const parts = !person && e.dau ? Object.fromEntries([['head', e.dau], ['back', e.than]].filter(([, el]) => el).map(([key, el]) => [key, rect(drawnRect(el))])
          .filter(([, r]) => r.x1 > r.x0 && r.y1 > r.y0)) : null;
        return { name: actor.host.dataset.name || actor.host.id || '', person, carried, seated: !!(rig.s && rig.s.seat > 0.5 && !(rig.s.kneel > 0.5)), ground: at.y, feet: feet.length && !carried ? Math.max(...feet.map((r) => r.y1)) : null,
          tall: (actor.height || 0) * at.scale, hands, face, body, x: at.x, seat, keySide: actor.keySide || 0, light: actor.lightInfo || null,
          // `lean` (đợt 31): thân người nghiêng bao nhiêu độ so với dáng nghỉ — người ngồi cúi qua đầu gối tới con vật.
          lean: person && rig.NGHI && typeof rig.s.than === 'number' ? +Math.abs(rig.s.than - (rig.NGHI.than || 0)).toFixed(1) : 0,
          // BÀN CHÂN CON VẬT (đợt 35): khung hình vẽ của bốn bàn chân — acting_check đo chân trên sàn, chân chổng trời khi lăn ngửa.
          paws: !person && !carried ? ['tnBan', 'txBan', 'snBan', 'sxBan'].map((key) => e[key]).filter(Boolean).map((el) => rect(drawnRect(el))).filter((r) => r.y1 > r.y0) : [],
          // Đợt 35, lượt hai: bàn chân trước theo tên (biên độ nhào), hướng quay (đếm vòng đuổi đuôi), khung LƯỠI (liếm tới tay / mặt),
          // đầu người (mặt người bế), người đang quỳ.
          front: !person && !carried ? Object.fromEntries(['tnBan', 'txBan'].filter((key) => e[key]).map((key) => [key, rect(drawnRect(e[key]))])) : null,
          facing: rig.s ? +(rig.s.huong || 0).toFixed(3) : null,                       // người và con vật (đếm vòng đuổi đuôi)
          tongue: !person && e.luoi && e.luoi.getAttribute('d') ? rect(drawnRect(e.luoi)) : null,
          carrot: !person && e.carrot && e.carrot.style.display !== 'none' && e.carrotBody ? rect(drawnRect(e.carrotBody)) : null,
          // ĐỢT 40 B: cuộn len (`batToy`), hộp (mặt trước — `sitInBox`), mắt (`slowBlink`), mũi thỏ (`noseTwitch`), chân trước vẽ đè lên mặt (`groomFace`)
          toy: !person && e.toy && e.toy.style.display !== 'none' ? rect(drawnRect(e.toyBall)) : null, box: !person && e.boxF && e.boxF.style.display !== 'none' ? rect(drawnRect(e.boxF)) : null,
          eye: !person && e.matL ? rect(drawnRect(e.matL)) : null, nose: !person && e.nose ? rect(drawnRect(e.nose)) : null,
          gpaw: !person && e.gPaw && e.gPaw.style.display !== 'none' ? rect(drawnRect(e.gBan)) : null,
          headBox: person && e.dau ? rect(drawnRect(e.dau)) : null,                    // khung đầu người (mặt người bế — liếm mặt)
          // HƯỚNG ĐẦU (đợt 36, `lookAt`): quay (đơn vị `huong`, thân + đầu — đã gồm phần bù góc máy), cúi (`headPitch`), nghiêng; tâm và chiều
          // cao KHUÔN MẶT trên màn hình — tools/acting_check.py dựng tia nhìn từ đó.
          gaze: person && rig.s && e.khuon ? (() => { const r = rect(drawnRect(e.khuon)); return { yaw: +Math.max(-1, Math.min(1, (rig.s.huong || 0) + (rig.s.headTurn || 0))).toFixed(3), pitch: +(rig.s.headPitch || 0).toFixed(3),
            tilt: +(rig.s.headTilt || 0).toFixed(2), x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2, h: r.y1 - r.y0, pitchDeg: (rig.constructor && rig.constructor.LOOK_PITCH_DEG) || 32 }; })() : null,
          readout: person && e.readout && e.readout.style.display !== 'none' ? rect(drawnRect(e.readout)) : null,          // thẻ số đo đang hiện (số cân, nhiệt độ)
          kneel: !!(person && rig.s && rig.s.kneel > 0.5),
          legs, parts, layer: +(actor.host.style.zIndex || 0), shoulders: person ? ['L', 'R'].map((side) => e['vai' + side] && { side, ...point(e['vai' + side], 0, 0) }).filter((p) => p && Number.isFinite(p.x)) : [],
          // ĐỢT 35: đồ đang cầm thấy được (bìa hồ sơ — `readChart`) và đồ con vật đang đeo (băng, loa — `bandage`, `putCone`), khung trên màn hình.
          // `facing` (huong) và DỤNG CỤ đang hiện trong tay (`gadget` — vành loa, cuộn băng), đợt 35 lượt hai.
          // ĐẦU (lượt ba): nghiêng (độ, so với dáng nghỉ) và hạ (`dauY`) — đọc bệnh án cúi đầu, gật.
          head: person && rig.s && rig.NGHI ? { tilt: +((rig.s.dau || 0) - (rig.NGHI.dau || 0)).toFixed(2), down: +((rig.s.dauY || 0) - (rig.NGHI.dauY || 0)).toFixed(2), pitch: +(rig.s.headPitch || 0).toFixed(3) } : null,
          gadgets: person ? ['L', 'R'].map((side) => { const el = e['gadget' + side]; if (!el || el.style.display === 'none') return null; const r = drawnRect(el);
            return r.width > 0 ? { side, kind: Math.round(rig.s['gadget' + side] || 0), box: rect(r) } : null; }).filter(Boolean)
            // vòng loa đang cầm (`putCone` — hình riêng ở gốc SVG, không trong bàn tay): kind 9 như vành loa
            .concat([e.ring, e.ringFront].filter((el) => el && el.style.display !== 'none').map((el) => ({ side: 'ring', kind: 9, box: rect(drawnRect(el)) })))
            // ĐỢT 39 C: tấm bảng chữ (`holdSign`, kind 28 — kèm cao chữ trên màn hình `textH`) và chớp sáng (`takeSelfie`, kind 29) — hình riêng ở gốc SVG.
            .concat([['sign', 28], ['flash', 29]].map(([key, kind]) => ({ el: rig.svg.querySelector('#' + rig.id + '-' + key), kind })).filter((g) => g.el && g.el.style.display !== 'none')
              .map((g) => { const line = g.el.querySelector('[data-sign-line]'), card = g.el.firstElementChild && g.kind === 28 ? g.el.firstElementChild : g.el;
                return { side: g.kind === 28 ? 'sign' : 'flash', kind: g.kind, box: rect(drawnRect(card)), ...(line ? { textH: line.getBoundingClientRect().height * sy } : {}) }; })) : [],
          items: person ? ['L', 'R'].map((side) => { const el = e['item' + side]; if (!el || !rig.holds || !rig.holds[side] || !(rig.s['item' + side] > 0.5)) return null;
            const r = drawnRect(el); return r.width > 0 ? { side, kind: el.querySelector('[data-clipboard]') ? 'clipboard' : 'item', box: rect(r) } : null; }).filter(Boolean) : [],
          worn: !person ? Object.fromEntries([['bandage', e.bang], ['cone', e.cone]].map(([key, el]) => { if (!el || el.style.display === 'none') return [key, null];
            const r = drawnRect(el); return [key, r.width > 0 ? rect(r) : null]; })) : null,
          // ĐỢT 38 B: bàn tay nào đang đeo găng (`gloveL/R` ≥ 0,3 — `putOnGloves`, `takeOffGloves`, `wear('gloves')`).
          gloves: person && rig.s ? ['L', 'R'].filter((side) => +(rig.s['glove' + side] || 0) >= 0.3) : [] };
      });
    },

    /**
     * SỐ ĐO CHĂM SÓC (đợt 35, tools/acting_check.py) ở khung vừa vẽ, px trong `view`: người — mắt (giữa tròng, giữa con ngươi, bề
     * ngang mắt) và dụng cụ đang hiện trong tay (`gadget`: số, tâm); con vật — độ há miệng (`mieng`) và tâm nét môi. Gọi sau khi tua.
     */
    careProbe() {
      set.update();
      const box = view.getBoundingClientRect(), sx = view.clientWidth / (box.width || 1), sy = view.clientHeight / (box.height || 1);
      const centre = (el) => { const r = el && el.getBoundingClientRect(); return r && (r.width || r.height) ? { x: (r.left + r.width / 2 - box.left) * sx, y: (r.top + r.height / 2 - box.top) * sy, w: r.width * sx, h: r.height * sy } : null; };
      const out = {};
      for (const actor of actors) {
        const rig = actor.rig, e = rig && rig.el;
        if (!e || actor.host.style.display === 'none') continue;
        const name = actor.host.dataset.name || actor.host.id || '';
        if (typeof rig.seatY === 'function') {
          const eyes = ['L', 'R'].map((side) => { const eye = e['mat' + side], pupil = e['nguoi' + side];               // tròng mắt, con ngươi (rig-svg: `mat`, `nguoi`)
            const a = centre(eye), b = centre(pupil); return a && b ? { side, eye: a, pupil: b } : null; }).filter(Boolean);
          const gadgets = ['L', 'R'].map((side) => { const kind = Math.round(rig.s['gadget' + side] || 0), g = e['gadget' + side];
            const shown = kind && g ? [...g.children].find((child) => +child.getAttribute('data-gadget') === kind) : null; const c = shown && centre(shown);
            const r = shown && shown.getBoundingClientRect(); return c ? { side, kind, ...c, h: r.height * sy } : null; }).filter(Boolean);
          const head = centre(e.dau), mouthP = centre(e.mieng);
          out[name] = { person: true, eyes, gadgets, head, mouthP, turn: rig.s.huong || 0, tilt: (rig.s.dau || 0) - ((rig.NGHI && rig.NGHI.dau) || 0), drop: (rig.s.dauY || 0) - ((rig.NGHI && rig.NGHI.dauY) || 0), tall: (actor.height || 0) * set.project(actor.where, actor.spot.y, actor.spot.z).scale };
          // ĐỢT 40 A: dây kéo co (`rig.pull40Probe()`) — hai đầu dây, tay cầm, đầu dây ở mõm (px trong `view`).
          if (typeof rig.pull40Probe === 'function') { const q = rig.pull40Probe(), pt = (p) => p && { x: (p.x - box.left) * sx, y: (p.y - box.top) * sy }; out[name].p40 = { from: pt(q.from), to: pt(q.to), hand: pt(q.hand), mouth: pt(q.mouth), rope: !!q.rope }; }
        } else {
          // Đợt 35, lượt ba: cỡ TRÊN KHUNG — chiều cao đầu (`face`), bề ngang nét môi (`lipsW`), độ mở hàm (`jaw`, px).
          const f = e.dau && e.dau.getBoundingClientRect(), j = e.ham && e.ham.getBoundingClientRect(), l = e.moi && e.moi.getBoundingClientRect();
          out[name] = { person: false, mouth: Math.max(rig.s.mieng || 0, rig.s.gape || 0), lips: centre(e.moi), face: f ? f.height * sy : 0, faceW: f ? f.width * sx : 0, lipsW: l ? l.width * sx : 0, jaw: j ? j.height * sy : 0 };
          // Đợt 36: độ há theo HÌNH HỌC trong khung của đầu — chiều cao khoang miệng (`ham`) / chiều cao bầu đầu (không tính tai, không
          // phụ thuộc đầu nghiêng hay cỡ cảnh).
          if (e.ham && typeof rig.skullHeight === 'function') { let h = 0; try { h = e.ham.getBBox().height; } catch (err) { h = 0; } out[name].jawRatio = h / rig.skullHeight(); }
          // ĐỢT 40 A: số đo của sáu động tác chó (`rig.pet40Probe()`) — phần tử → tâm và cỡ trên màn hình, điểm → px trong `view`.
          if (typeof rig.pet40Probe === 'function') { const q = rig.pet40Probe(); out[name].p40 = { s: q.s, toy: centre(q.toy), floor: centre(q.floor), howl: centre(q.howl), dirt: q.dirt.map(centre).filter(Boolean), end: q.end && { x: (q.end.x - box.left) * sx, y: (q.end.y - box.top) * sy } }; }
        }
      }
      // Màn hình các cái cân (chữ trên đó) — đồng bộ với con vật đứng trên bệ (`weigh`).
      // ĐỢT 38 A: số đo của cắt móng / nhỏ mắt / lau tai / quét chip (`rig.care38Probe()` — phần tử → tâm và cỡ trên màn hình, số giữ nguyên).
      for (const actor of actors) {
        const rig = actor.rig, name = actor.host.dataset.name || actor.host.id || '';
        if (!rig || !rig.el || actor.host.style.display === 'none' || typeof rig.care38Probe !== 'function' || !out[name]) continue;
        const one = (v) => (v && v.getBoundingClientRect ? (v.style && v.style.display === 'none' ? null : centre(v)) : v);
        out[name].c38 = Object.fromEntries(Object.entries(rig.care38Probe()).map(([key, v]) => [key, Array.isArray(v) ? v.map(one) : one(v)]));
      }
      // ĐỢT 39 A: số đo quầy thu ngân / cà phê (`rig.desk39Probe()`: tick, dấu đỏ, con dấu, dòng nước, cốc, khăn — phần tử → tâm và cỡ trên màn hình) và chỗ mã QR / máy quẹt thẻ của đế thanh toán.
      for (const actor of actors) {
        const rig = actor.rig, name = actor.host.dataset.name || actor.host.id || '';
        if (!rig || !rig.el || actor.host.style.display === 'none' || typeof rig.desk39Probe !== 'function' || !out[name]) continue;
        out[name].d39 = Object.fromEntries(Object.entries(rig.desk39Probe()).map(([key, v]) => [key, v && v.getBoundingClientRect ? (v.style && v.style.display === 'none' ? null : centre(v)) : v]));
      }
      out['@pay39'] = { qr: [...view.querySelectorAll('[data-pay-qr]')].map(centre).filter(Boolean), reader: [...view.querySelectorAll('[data-pay-reader]')].map(centre).filter(Boolean) };
      // ĐỢT 39 B: số đo của sáu cử chỉ thường ngày (`rig.gesture39Probe()` — phần tử → tâm và cỡ trên màn hình, số giữ nguyên).
      for (const actor of actors) {
        const rig = actor.rig, name = actor.host.dataset.name || actor.host.id || '';
        if (!rig || !rig.el || actor.host.style.display === 'none' || typeof rig.gesture39Probe !== 'function' || !out[name]) continue;
        const one = (v) => (v && v.getBoundingClientRect ? centre(v) : v);
        out[name].g39 = Object.fromEntries(Object.entries(rig.gesture39Probe()).map(([key, v]) => [key, one(v)]));
      }
      // đợt 42 F: tắm / đánh răng / lau khô (`rig.care42fProbe()` của người và con vật — phần tử → tâm và cỡ trên màn hình, điểm `px` → px trong `view`) và vành các chậu tắm.
      for (const actor of actors) {
        const rig = actor.rig, name = actor.host.dataset.name || actor.host.id || '';
        if (!rig || !rig.el || actor.host.style.display === 'none' || typeof rig.care42fProbe !== 'function' || !out[name]) continue;
        const one = (v) => (v && v.getBoundingClientRect ? (v.style && v.style.display === 'none' ? null : centre(v)) : v && v.px ? { x: (v.x - box.left) * sx, y: (v.y - box.top) * sy } : v);
        out[name].c42 = Object.fromEntries(Object.entries(rig.care42fProbe()).map(([key, v]) => [key, one(v)]));
      }
      out['@tub42f'] = [...view.querySelectorAll('[data-tub-rim42f]')].map(centre).filter(Boolean);
      out['@scales'] = [...view.querySelectorAll('svg[data-prop="scale"] text')].map((text) => text.textContent);
      out['@H'] = view.clientHeight;
      return out;
    },

    /**
     * ĐÁY CHÂN CON VẬT trên màn hình (px trong `view`), kể cả khi nó nằm trong hình người khác (bế, đặt lên cân): { tên: y }
     * — tools/acting_check.py đo con vật đứng trên bệ cân (`weigh`, đợt 35). Gọi sau khi tua tới lúc cần đo.
     */
    paws() {
      set.update();
      const box = view.getBoundingClientRect(), sy = view.clientHeight / (box.height || 1), out = {};
      for (const actor of actors) {
        const rig = actor.rig, e = rig && rig.el;
        if (!e || typeof rig.seatY === 'function' || !rig.svg.isConnected) continue;
        const feet = ['tnBan', 'txBan', 'snBan', 'sxBan'].map((key) => e[key]).filter(Boolean).map((el) => el.getBoundingClientRect()).filter((r) => r.height > 0);
        if (feet.length) out[actor.host.dataset.name || actor.host.id || ''] = (Math.max(...feet.map((r) => r.bottom)) - box.top) * sy;
      }
      return out;
    },

    /**
     * ĐỒ VẬT BỊ MÉP KHUNG CẮT ở khung vừa vẽ (đợt 30): `[{ name, kind, shown, edge, front }]` — hộp (sofa, bàn, kệ) và tấm
     * đồ vật (TV, bàn, quầy, ghế) mà mép trái / phải khung cắt dở, hay chạm: trọn trong khung là cách mép ít nhất 3 % nửa
     * khung, như `frameOn`. `shown`: phần bề ngang còn trong khung. Vật rộng hơn cả khung, vật ra hẳn ngoài khung, cây, đèn,
     * ô cửa thì không tính. `front`: vật ở tiền cảnh (gần máy hơn mọi nhân vật ≥ 150) — lấp ló ở mép là cách dựng tiền cảnh.
     */
    propFraming() {
      set.update();
      const W = view.clientWidth, margin = W / 2 * 0.03, out = [];
      const near = Math.max(-Infinity, ...actors.filter((actor) => actor.rig && actor.host.style.display !== 'none').map((actor) => actor.spot.z)) + 150;
      const judge = (item) => {
        const { x0, x1 } = item;
        if (!(x1 > x0) || x1 - x0 > W) return;
        const shown = (Math.min(x1, W) - Math.max(x0, 0)) / (x1 - x0);
        if (shown <= 0.02 || (x0 >= margin && x1 <= W - margin)) return;
        out.push({ ...item, shown: +shown.toFixed(3), edge: (x0 + x1) / 2 < W / 2 ? 'left' : 'right', front: item.z > near, x0: Math.round(x0), x1: Math.round(x1) });
      };
      for (const prop of props) {
        if (!prop.spec) continue;
        const { x, z, width, depth, height, y } = prop.spec, xs = [];
        for (const px of [x, x + width]) for (const pz of [z, z - depth]) for (const py of [y, y + height]) { const at = set.project(px, py, pz); if (at.depth < camera.lens - 60) xs.push(at.x); }
        if (xs.length === 8) judge({ name: prop.name || 'box', kind: 'box', z, x0: Math.min(...xs), x1: Math.max(...xs), minor: !importantProp({ a: x, b: x + width, near: z, far: z - depth, name: prop.name }) });
      }
      for (const actor of actors) {
        if (actor.rig || actor.lamp || !actor.frame || actor.host.style.display === 'none') continue;
        const kind = propKind(actor);
        if (!FURNITURE.includes(kind)) continue;
        const [cx0, , cx1] = actor.content || [0, 0, 1, 1], f = actor.frame;
        const left = actor.where - (actor.width || 0) / 2;
        judge({ name: kind, kind, z: actor.spot.z, x0: f.left + cx0 * f.w, x1: f.left + cx1 * f.w,
                minor: !importantProp({ a: left + cx0 * (actor.width || 0), b: left + cx1 * (actor.width || 0), near: actor.spot.z, far: actor.spot.z, kind }) });
      }
      return out;
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

  // Loại tấm đồ vật (`data-prop` của SVG trong host: tv, table, chair…), không phải tấm đồ vật thì ''.
  function propKind(actor) { return ((actor.host.querySelector && actor.host.querySelector('svg[data-prop]')) || { dataset: {} }).dataset.prop || ''; }

  // ĐỒ ĐẠC QUAN TRỌNG (đợt 31): TV, hay đồ ĐANG ĐƯỢC DÙNG — một người / con vật đứng trong bề ngang của nó, ở độ sâu của nó
  // (ngồi trên sofa, ghế đá; con vật trên bàn khám; người sau quầy). `{ a, b }`: bề ngang trong phòng; `near` / `far`: mặt trước,
  // mặt sau. Góc trung sát góc toàn được lẹm mép đồ đạc khác (bàn nước) — không được lẹm những thứ này.
  function importantProp({ a, b, near, far, kind = '', name = '' }) {
    if (kind === 'tv' || name === 'tv') return true;
    return actors.some((actor) => actor.rig && actor.host.style.display !== 'none' && actor.where >= a - 30 && actor.where <= b + 30 && actor.spot.z >= far - 60 && actor.spot.z <= near + 60);
  }

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
    // `auto`, not '': an <img> stood with its file's width/height attributes (tools/scene.py writes them so it can be
    // centred before it loads) would otherwise keep the attribute's width — a picture whose file is bigger or smaller
    // than its scene size (a 2x PNG, an SVG scaled in the set) showed stretched sideways.
    if (height) { host.style.height = height + 'px'; host.style.width = 'auto'; }
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
  // Giữa nét môi của con vật trong khung SVG của nó (đợt 35): ghép transform từng lớp tới SVG gốc — không qua màn hình.
  function lipsOf(rig) {
    try {
      const b = rig.el.moi.getBBox();
      if (!b.width && !b.height) return null;
      let m = new DOMMatrix();
      for (let node = rig.el.moi; node && node !== rig.svg; node = node.parentNode) m = localMatrix(node).multiply(m);
      const p = new DOMPoint(b.x + b.width / 2, b.y + b.height / 2).matrixTransform(m);
      return { x: p.x, y: p.y };
    } catch (error) { return null; }
  }

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
