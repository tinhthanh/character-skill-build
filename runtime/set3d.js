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
  const backdrop = [], props = [], actors = [], layers = [], focused = [];
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
  const face = (parent, width, height, transform, style, centre = null) => {
    const element = document.createElement('div');
    element.style.cssText = `position:absolute;left:0;top:0;transform-origin:0 0;width:${width}px;height:${height}px;transform:${transform};${style || ''}`;
    parent.appendChild(element);
    if (centre) focused.push({ element, centre, filter: element.style.filter || '', blur: 0 });
    return element;
  };
  const paint = (style, fallback) => (typeof style === 'string' && style.trim() ? (/[:;]/.test(style) ? style : `background:${style}`) : `background:${fallback}`);

  const set = {
    camera,
    view,

    /** SÀN: hình chữ nhật trên mặt y = 0, từ `x[0]`…`x[1]` và `z[0]`…`z[1]`. `style` là màu, hoặc CSS (`background: …`). */
    floor({ x = [-900, 900], z = [-1100, 200], y = 0, style = null } = {}) {
      // Sàn dựng thành NHIỀU DẢI theo chiều sâu (mỗi dải ~150 đơn vị): một mặt phẳng chỉ mờ được đều một mức, mà sàn thì
      // trải từ sát máy tới chân tường sau. Hoạ tiết nối liền qua các dải nhờ dời `background-position` cho khớp.
      const depth = z[1] - z[0], strips = clamp(Math.round(depth / 150), 1, 12), each = depth / strips;
      room = room ? [Math.min(room[0], x[0]), Math.max(room[1], x[1])] : [x[0], x[1]];
      for (let k = 0; k < strips; k++) {
        const strip = face(layer(0), x[1] - x[0], each + 0.5, `translate3d(${x[0]}px, ${-y}px, ${z[0] + k * each}px) rotateX(90deg)`,
          paint(style, '#a9c4cb') + `;background-position-y:${(-k * each).toFixed(2)}px`, [(x[0] + x[1]) / 2, y, z[0] + (k + 0.5) * each]);
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
      backdrop.push(face(layer(0), length, height, `translate3d(${from[0]}px, ${-y - height}px, ${from[1]}px) rotateY(${turn}deg)`, paint(style, '#c9dce1') + ';backface-visibility:hidden',
        [(from[0] + to[0]) / 2, y + height / 2, (from[1] + to[1]) / 2]));
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
        [at[0] + Math.cos(across) * size[0] / 2, at[1] - size[1] / 2, at[2] - Math.sin(across) * size[0] / 2]));
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
      face(group, width, depth, `translate3d(${x}px, ${top}px, ${z - depth}px) rotateX(90deg)`, paint(tone.top, '#f1f4f5'), middle);
      face(group, depth, height, `translate3d(${x}px, ${top}px, ${z}px) rotateY(90deg)`, paint(tone.side, '#7da3b0') + ';filter:brightness(.94)', middle);
      face(group, depth, height, `translate3d(${x + width}px, ${top}px, ${z}px) rotateY(90deg)`, paint(tone.side, '#7da3b0') + ';filter:brightness(.94)', middle);
      face(group, width, height, `translate3d(${x}px, ${top}px, ${z}px)`, paint(tone.front, '#8fb3bf'), middle);
      // Bốn mặt vừa dựng là mặt của một VẬT: đánh dấu để `update` không làm mờ chúng khi chúng tràn ra ngoài khung hình.
      for (const item of focused.slice(-4)) item.solid = true;
      const prop = { group, centre: middle, top: y + height, front: z, span: [x, x + width] };
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
    target(from, to, part = 'head') {
      const of = (rig) => actors.find((actor) => actor.rig === rig);
      if (!of(from) || !of(to)) throw new Error('[character] set.target(from, to): both must be rigs placed with set.place()');
      const frameOf = (rig) => (rig.constructor && rig.constructor.KHUNG) || { w: 400, h: 470 };
      const facts = (actor) => {
        if (!actor.width) { actor.width = actor.host.offsetWidth; actor.height = actor.host.offsetHeight; }
        if (actor.ground === null) actor.ground = groundOf(actor.rig);
        const size = frameOf(actor.rig), unit = actor.height / size.h, ground = (actor.ground || 1) * size.h;
        return { size, unit, ground, x: actor.spot.x + (actor.rig.s.x || 0) * unit };
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
      for (let index = 0; index <= shown.length; index++) {
        const element = layer(index);
        element.style.left = cx + 'px'; element.style.top = cy + 'px';
        element.style.transform = `scale(${camera.zoom}) translateZ(${pull}px) ${moves}`;
      }
      shown.forEach(({ actor, at }, rank) => {
        const { host, rig } = actor;
        if (!actor.width) { actor.width = host.offsetWidth; actor.height = host.offsetHeight; }        // host đang ẩn thì chưa đo được: đo lại ở khung sau
        if (actor.ground === null && actor.width) actor.ground = groundOf(rig);
        soften(actor, host, '', blurAt(at.depth));
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
        if (+(host.style.opacity || 1) !== +present.toFixed(3)) host.style.opacity = present < 1 ? present.toFixed(3) : '';
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
          Object.assign(actor.shadow.style, { width: across + 'px', height: deep + 'px', opacity: seen.toFixed(3),
            transform: `translate3d(${(actor.where - across / 2).toFixed(2)}px, ${(-actor.spot.y - 0.5).toFixed(2)}px, ${(actor.spot.z - deep / 2).toFixed(2)}px) rotateX(90deg)` });
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
    frameOn(subjects, size = 'medium', { avoid = null, lens = 1700, zoom = 1, at = null, seek = null } = {}) {
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
        const at = set.project(actor.where, actor.spot.y, actor.spot.z), box = view.getBoundingClientRect(), r = part.getBoundingClientRect();
        if (mark) mark.style.display = shown || '';
        if (hidden) host.style.display = 'none';
        if (!r.width || !at.scale) return null;
        const sx = W / box.width, sy = H / box.height, toX = (px) => actor.where + ((px - box.left) * sx - at.x) / at.scale, toY = (py) => actor.spot.y + (at.y - (py - box.top) * sy) / at.scale;
        return { x0: toX(r.left), x1: toX(r.right), top: toY(r.top), base: toY(r.bottom), z: actor.spot.z, person: !!(actor.rig && typeof actor.rig.seatY === 'function') };
      };
      // Vùng cần lấy của từng chủ thể theo cỡ cảnh; phần khung hình (theo chiều cao) mà vùng ấy chiếm.
      const FILL = { person: { close: 0.55, medium: 0.86, full: 0.84 }, pet: { close: 0.45, medium: 0.32, full: 0.22 } };
      const regionOf = (m) => {
        const h = m.top - m.base;
        if (!m.person) return { x0: m.x0, x1: m.x1, y0: m.base, y1: m.top };
        return { x0: m.x0, x1: m.x1, y0: size === 'close' ? m.base + 0.66 * h : size === 'medium' ? m.base + 0.45 * h : m.base, y1: m.top + (size === 'close' ? 0.04 * h : 0) };
      };
      // `at: [t0, t1, …]` + `seek(t)`: đo ở từng lúc rồi gộp — khung chứa mọi chỗ chủ thể đứng trong khoảng ấy.
      const merge = (a, b) => (a && b ? { ...a, x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), top: Math.max(a.top, b.top), base: Math.min(a.base, b.base) } : a || b);
      let shots = wanted.map(measure);
      if (Array.isArray(at) && seek) {
        for (const time of at) { seek(time); shots = shots.map((m, n) => merge(m, measure(wanted[n]))); }
        seek(at[0]);
      }
      shots = shots.filter(Boolean);
      if (!shots.length) throw new Error('[character] set.frameOn: the subjects are not visible');
      const fill = FILL[shots.some((m) => m.person) ? 'person' : 'pet'][size] || 0.5;
      const k = lens * zoom;
      const solve = (region) => {
        const distance = Math.max(250, k * Math.max((region.y1 - region.y0) / (fill * H), (region.x1 - region.x0) / (0.75 * W)));
        // Điểm ngắm hiện ở 57 % chiều cao khung (`centre`): hạ điểm ngắm để giữa vùng nằm giữa khung.
        return { x: (region.x0 + region.x1) / 2, y: (region.y0 + region.y1) / 2 - 0.07 * H * distance / k, distance };
      };
      let region = shots.map(regionOf).reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) }));
      let cam = solve(region);
      const others = (avoid || actors.filter((actor) => !wanted.includes(actor) && actor.rig).map((actor) => actor.rig))
        .map((rig) => actors.find((actor) => actor.rig === rig)).filter(Boolean).map(measure).filter(Boolean);
      for (let pass = 0; pass < 3; pass++) {
        const half = (W / 2) * cam.distance / k;
        const edge = half * 0.06;
        const cut = others.find((m) => { const seen = Math.max(0, Math.min(m.x1, cam.x + half + edge) - Math.max(m.x0, cam.x - half - edge)); return seen > 0 && seen < (m.x1 - m.x0) * 0.98; });
        if (!cut) break;
        // Dời cho người ấy ra HẲN ngoài khung, nếu chủ thể vẫn trọn trong khung; không thì nới khung lấy trọn người ấy.
        const margin = half * 0.06;                                                       // tóc, tay đung đưa: chừa một khoảng
        const x = (cut.x0 + cut.x1) / 2 < cam.x ? cut.x1 + half + margin : cut.x0 - half - margin;
        if (region.x0 >= x - half && region.x1 <= x + half) cam = { ...cam, x };
        else { region = { x0: Math.min(region.x0, cut.x0), x1: Math.max(region.x1, cut.x1), y0: Math.min(region.y0, cut.base), y1: Math.max(region.y1, cut.top) }; cam = solve(region); }
      }
      // Theo CHIỀU DỌC: ai đó chỉ ló lên ở đáy khung (tai con chó trên bàn dưới góc cận mặt bác sĩ) — nâng khung lên cho họ
      // ra hẳn, nếu chủ thể vẫn trọn trong khung. Điểm ngắm nằm ở 57 % chiều cao khung (`centre`).
      {
        const half = (W / 2) * cam.distance / k, above = 0.57 * H * cam.distance / k, below = 0.43 * H * cam.distance / k;
        for (const m of others) {
          if (Math.min(m.x1, cam.x + half) <= Math.max(m.x0, cam.x - half)) continue;                 // ngoài khung theo chiều ngang
          // Lề 5 % chiều cao khung: máy chúc xuống vài độ (pitch) nên đáy khung thật thấp hơn phép tính phẳng này một chút.
          const bottom = cam.y - below, slack = (above + below) * 0.05;
          if (m.top > bottom - slack && m.top < region.y0 && m.base < bottom) {
            const lift = m.top - bottom + slack;
            if (region.y1 <= cam.y + above + lift - (above + below) * 0.02) { cam = { ...cam, y: cam.y + lift }; continue; }
            // Không nâng được (chủ thể sẽ bị cụt đầu): dời NGANG cho người ấy ra hẳn, nếu chủ thể vẫn trọn trong khung.
            const margin = half * 0.06, x = (m.x0 + m.x1) / 2 < cam.x ? m.x1 + half + margin : m.x0 - half - margin;
            if (region.x0 >= x - half && region.x1 <= x + half) { cam = { ...cam, x }; continue; }
            // Không dời được (người ấy đứng sát chủ thể): SIẾT khung — vào gần hơn, đỉnh khung ngay trên chủ thể, cho tới khi
            // đáy khung qua khỏi người ấy; chỉ khi chủ thể vẫn chiếm không quá 95 % chiều cao khung.
            const pad = (region.y1 - region.y0) * 0.04, frame = region.y1 + pad - (m.top + slack);
            if (frame >= (region.y1 - region.y0) * 1.05) {
              const distance = frame * k / H, top = region.y1 + pad;
              cam = { ...cam, distance, y: top - 0.57 * H * distance / k };
            }
          }
        }
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
        const hold = beat.speech ? Math.min(minShot, 1.0) : minShot;
        if (shot && at - shot.at < hold) at = shot.at + hold;
        const next = beats.slice(index + 1).find((later) => later.fixed);
        if (at > beat.end - 0.8 || (next && at > next.time - 0.8)) continue;              // không kịp: giữ góc đang có
        let values;
        // Đo ở cả ĐẦU và CUỐI nhịp: nhịp có người đi (lại gần con vật để đưa thuốc, rồi lùi về) thì khung phải chứa cả hai
        // chỗ đứng — đo một lúc thì người đi ra khỏi khung (Gemini soát cảnh thử đợt 14).
        try { values = set.frameOn(beat.subjects, beat.size, { at: [at, Math.max(at, beat.end - 0.05)], seek: (time) => { tl.seek(time, false); set.update(); } }); } catch (error) { continue; }      // chủ thể đang không thấy (được bế…)
        const glide = shot && !shot.fixed && same(shot.subjects, beat.subjects);
        tl.add(glide ? set.move(values, pan, 'sine.inOut') : set.cut(values), at);
        if (!glide) cuts.push(at);
        shot = { subjects: beat.subjects, size: beat.size, at };
      }
      tl.seek(0, false); set.update();
      return cuts;
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
        const rects = parts.map((part) => part.getBoundingClientRect()).filter((r) => r.width > 0);
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
      shadow.style.cssText = 'position:absolute;left:0;top:0;transform-origin:0 0;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.30),rgba(0,0,0,.16) 62%,rgba(0,0,0,0))';
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
    if (rounded === item.blur) return;
    item.blur = rounded;
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
