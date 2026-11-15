// index.js — CỬA VÀO của thư viện nhân vật. Mọi thứ xuất ra ở đây mang tên tiếng Anh.
//
// Nạp bằng một trong hai cách:
//   • ES module (studio, trang web thường):  import { createCharacter } from './runtime/index.js'
//   • Thẻ <script> thường (HyperFrames):     <script src="dist/character.iife.js"> → window.VGCharacter
//     (bản dựng một tệp, sinh bằng `python3 tools/build.py`)
//
// Mọi hàm ở đây ĐỒNG BỘ và không đọc mạng: composition dựng video phải dựng xong timeline
// ngay trong lượt chạy script đầu tiên, và không được fetch gì lúc render.
//
// Hai bộ rig bên dưới dùng khoá nội bộ tiếng Việt; `schema.js` là từ điển giữa hai phía và
// tệp này là nơi DUY NHẤT gọi nó.
import { RigSVG } from './rig-svg.js';
import { RigThu } from './rig-thu.js';
import { dangKyDau, KIT } from './characters.js';
import { roundGlasses, shortBeard, moustache, wrinkles, apronBib, cup, clipboard, phone } from './parts.js';
import { COLOR_KEYS, PERSON_STATE_KEYS, PET_STATE_KEYS, HAND_SHAPES, CONFIG_GROUPS, PET_SHAPE_KEYS,
         definitionToInternal, definitionToPublic, configToInternal, stateToInternal } from './schema.js';
import CUSTOM_CHARACTERS from '../characters/index.js';

export const VERSION = '0.5.1';
/** Tên biến toàn cục của bản dựng IIFE. */
export const GLOBAL_NAME = 'VGCharacter';

// Hai bộ rig nhận bảng bí danh màu TRƯỚC khi có nhân vật nào được dựng.
RigSVG.COLOR_ALIASES = COLOR_KEYS;
RigThu.COLOR_ALIASES = COLOR_KEYS;

/* ───────────────────────────────────────────────── tên tiếng Anh trên hai bộ rig */

// Proxy đọc/ghi trạng thái bằng tên công khai: rig.state.upperArmR = 40.
function statePort(rig, table) {
  const hands = Object.fromEntries(Object.entries(HAND_SHAPES).map(([pub, internal]) => [internal, pub]));
  const isHand = (key) => key === 'handL' || key === 'handR';
  return new Proxy({}, {
    get: (_, key) => { const v = rig.s[table[key] || key]; return isHand(key) ? hands[v] || v : v; },
    set: (_, key, value) => { rig.s[table[key] || key] = isHand(key) ? HAND_SHAPES[value] || value : value; return true; },
    has: (_, key) => (table[key] || key) in rig.s,
    ownKeys: () => Object.keys(table),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  });
}
for (const [Rig, table] of [[RigSVG, PERSON_STATE_KEYS], [RigThu, PET_STATE_KEYS]]) {
  Object.defineProperties(Rig.prototype, {
    /** Trạng thái sống của nhân vật, khoá tiếng Anh. Ghi vào đây rồi hình tự vẽ lại. */
    state: { get() { return this.__statePort || (this.__statePort = statePort(this, table)); } },
    /** Vẽ lại từ trạng thái hiện tại. */
    render: { value() { this.apDung(); } },
    /** Về tư thế nghỉ, giữa khung. */
    reset: { value() { this.datNghi(); } },
    /** Đổi màu: rig.setColors({ top: '#2f9e8f' }). Màu tối/sáng đi kèm tự suy theo. */
    setColors: { value(colors) { this.doiMau(colors); return this; } },
  });
}
Object.defineProperty(RigSVG.prototype, 'actions', { get() { return [...RigSVG.DONG_TAC, ...RigSVG.DI_NGANG, ...RigSVG.STANCE]; } });
Object.defineProperty(RigThu.prototype, 'actions', { get() { return [...this.DONG_TAC]; } });

/* ─────────────────────────────────────────────────────────────── bộ đồ nghề */

const publicOutfit = (outfit) => definitionToPublic(outfit);
/**
 * BỘ ĐỒ NGHỀ đưa cho hàm `define` của nhân vật tuỳ chỉnh (tham số thứ hai).
 *   outfits   các bộ trang phục dựng sẵn — trải vào định nghĩa rồi ghi đè chi tiết
 *   outlines  đường bao thân áo của ba bộ ấy, nếu chỉ cần hình dáng
 *   parts     kính, râu, ria, nếp nhăn, yếm tạp dề và đồ vật cầm tay vẽ sẵn
 *   partsOf   lấy định nghĩa của một nhân vật KHÁC để mượn bộ phận: partsOf('doctor').faceExtras
 */
export const kit = {
  outfits: { scrubs: publicOutfit(KIT.boDo.doMo), pawTunic: publicOutfit(KIT.boDo.aoDauChan), coat: publicOutfit(KIT.boDo.aoBlouse),
             plainCoat: publicOutfit(KIT.boDo.plainCoat), tee: publicOutfit(KIT.boDo.tee), shirt: publicOutfit(KIT.boDo.shirt) },
  outlines: { scrubs: KIT.AO.doMo, pawTunic: KIT.AO.aoDauChan, coat: KIT.AO.aoBlouse },
  sideShading: KIT.suonTu, shoulderPatches: KIT.vaiCo, closedShoes: KIT.giayKin,
  nameTag: KIT.theTen, pawPrint: KIT.dauChan, stethoscope: KIT.ongNgheVatCo,
  parts: { roundGlasses, shortBeard, moustache, wrinkles, apronBib, cup, clipboard, phone },
  partsOf(id) {
    if (!RigSVG.NHAN_VAT[id]) throw new Error(`[character] partsOf("${id}"): no such character (available: ${Object.keys(RigSVG.NHAN_VAT).join(', ')})`);
    return definitionToPublic(RigSVG.NHAN_VAT[id]);
  },
};

/* ──────────────────────────────────────────────────────────────── kiểm tra */

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
function assertColors(palette, where) {
  const bad = Object.entries(palette).filter(([, v]) => v !== null && v !== undefined && !(typeof v === 'string' && HEX_COLOR.test(v)));
  if (bad.length) throw new Error(`[character] ${where}: colours must be hex (#rgb / #rrggbb) — invalid: ${bad.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')}`);
}

/**
 * Kiểm một bộ số TRƯỚC khi đổ vào rig; trả về danh sách lỗi (rỗng = hợp lệ).
 *
 * Phải kiểm vì rig không tự kiểm: một giá trị sai kiểu (`halfWidth: "wide"`) đi thẳng vào
 * phép tính và ra NaN trong SVG — hình hỏng mà không có lỗi nào; còn tên nhóm hay tên khoá
 * viết sai thì bị bỏ qua im lặng, người chỉnh tưởng đã áp mà nhân vật không đổi.
 *
 * `kind`: 'person' (mặc định) hoặc 'pet'.
 */
export function validateConfig(config, kind = 'person') {
  const problems = [];
  if (config === null || config === undefined) return problems;
  if (typeof config !== 'object' || Array.isArray(config)) return ['config must be an object'];
  const pet = kind === 'pet';
  const numberGroups = pet ? { shape: PET_SHAPE_KEYS } : Object.fromEntries(Object.entries(CONFIG_GROUPS).map(([g, [, table]]) => [g, Object.keys(table)]));
  const stateKeys = pet ? PET_STATE_KEYS : PERSON_STATE_KEYS;
  const allowed = [...Object.keys(numberGroups), ...(pet ? [] : ['restPose']), 'colors'];
  for (const [group, value] of Object.entries(config)) {
    if (!allowed.includes(group)) { problems.push(`unknown group "${group}" (valid: ${allowed.join(', ')})`); continue; }
    if (!value || typeof value !== 'object' || Array.isArray(value)) { problems.push(`"${group}" must be an object`); continue; }
    for (const [key, v] of Object.entries(value)) {
      if (group === 'colors') {
        if (!(typeof v === 'string' && HEX_COLOR.test(v))) problems.push(`colors.${key}: ${JSON.stringify(v)} is not a hex colour (#rgb / #rrggbb)`);
      } else if (group === 'restPose') {
        if (!(key in stateKeys)) problems.push(`restPose.${key}: no such state key`);
        else if (key === 'handL' || key === 'handR') { if (!(v in HAND_SHAPES)) problems.push(`restPose.${key}: ${JSON.stringify(v)} must be one of ${Object.keys(HAND_SHAPES).join(', ')}`); }
        else if (!Number.isFinite(v)) problems.push(`restPose.${key}: ${JSON.stringify(v)} must be a number`);
      } else if (!numberGroups[group].includes(key)) problems.push(`${group}.${key}: unknown key (valid: ${numberGroups[group].join(', ')})`);
      else if (!Number.isFinite(v)) problems.push(`${group}.${key}: ${JSON.stringify(v)} must be a number`);
    }
  }
  return problems;
}
function assertConfig(config, kind, who) {
  const problems = validateConfig(config, kind);
  if (problems.length) throw new Error(`[character] invalid config for "${who}":\n  - ${problems.join('\n  - ')}`);
}

/* ─────────────────────────────────────────────────────────────── đăng ký */

/**
 * Đăng ký một nhân vật tuỳ chỉnh (xem `characters/_template.js`).
 *   id      khoá, chỉ gồm chữ thường, số và gạch dưới
 *   base    id nhân vật làm GỐC — nhân vật mới thừa hưởng mọi thứ không ghi đè
 *   define  (base, kit) => object định nghĩa, khoá tiếng Anh (bảng khoá: references/slots.md)
 */
export function registerCharacter({ id, base = 'vet', define }) {
  if (!/^[a-z][a-z0-9_]*$/.test(id || '')) throw new Error(`[character] invalid id "${id}" (use lowercase letters, digits and underscores)`);
  const baseDefinition = RigSVG.NHAN_VAT[base];
  if (!baseDefinition) throw new Error(`[character] "${id}" is based on "${base}", which is not registered (available: ${Object.keys(RigSVG.NHAN_VAT).join(', ')})`);
  // Trùng id thì DỪNG, không ghi đè: hai tệp nhân vật cùng một id là nhân vật đăng ký trước
  // biến mất không dấu vết, và composition nào đang dùng nó bỗng ra một người khác.
  if (RigSVG.NHAN_VAT[id]) throw new Error(`[character] id "${id}" is already registered — choose another id`);
  if (typeof define !== 'function') throw new Error(`[character] "${id}": missing define(base, kit) function`);
  const written = define(definitionToPublic(baseDefinition), kit);
  if (!written || typeof written !== 'object') throw new Error(`[character] "${id}": define() must return an object`);
  const definition = definitionToInternal(written);
  if (definition.mau) assertColors(definition.mau, `character "${id}" colors`);
  if (definition.backHair !== undefined && !['full', 'low', 'none'].includes(definition.backHair))
    throw new Error(`[character] "${id}": backHair must be 'full', 'low' or 'none', got ${JSON.stringify(definition.backHair)}`);
  if (definition.mauSoSau) {
    definition.mauSoSau = COLOR_KEYS[definition.mauSoSau] || definition.mauSoSau;
    // Base `default` có bảng màu rỗng (dùng bảng mặc định của rig) — khi ấy không có gì để đối chiếu.
    if (definition.mau && Object.keys(definition.mau).length && !(definition.mauSoSau in definition.mau)) throw new Error(`[character] "${id}": backSkullColor names a colour that is not in colors`);
  }
  return RigSVG.dangKy(id, definition);
}

/* ─────────────────────────────────────────────────────────────── dựng */

// Bộ số đã lưu trong configs/ được tools/build.py nướng vào bản dựng một tệp (xem cuối tệp ấy).
const bakedConfigs = {};
/** [nội bộ] tools/build.py gọi hàm này ở cuối bản dựng để nạp các tệp configs/*.json. */
export function __setBakedConfigs(configs) { Object.assign(bakedConfigs, configs); }

// Đổ bộ số NỘI BỘ vào một rig người. Thứ tự có ý: màu dựng lại SVG nên chạy đầu; `tay` đổi
// tỉ lệ cánh tay nên chạy trước tư thế nghỉ.
function applyInternalPersonConfig(rig, c) {
  if (c.mau)   rig.doiMau(c.mau);
  if (c.than)  rig.doiThan(c.than);
  if (c.tay)   rig.doiTay(c.tay);
  if (c.tayAo) rig.doiTayAo(c.tayAo);
  if (c.chan)  rig.doiChan(c.chan);
  if (c.khuon) rig.doiKhuonMat(c.khuon);
  if (c.may || c.viTriMay) rig.doiChanMay({ ...(c.may || {}), ...(c.viTriMay || {}) });
  if (c.net)   rig.doiNetMat(c.net);
  if (c.nghi) {
    rig.nv.nghi = { ...(rig.nv.nghi || {}), ...c.nghi };
    rig.NGHI = Object.freeze({ ...rig.NGHI, ...c.nghi });
  }
  rig.datNghi();
}

/**
 * Đổ một bộ số (object như trong `configs/<id>.json`) vào rig. Ném lỗi nếu bộ số không hợp lệ.
 * Dùng được cho cả người lẫn thú.
 */
export function applyConfig(rig, config) {
  if (!config) return rig;
  const pet = rig instanceof RigThu;
  assertConfig(config, pet ? 'pet' : 'person', rig.publicId || 'character');
  const internal = configToInternal(config, pet);
  if (!pet) applyInternalPersonConfig(rig, internal);
  else {
    if (internal.mau) rig.doiMau(internal.mau);
    if (internal.shape) rig.setShape(internal.shape);
    rig.datNghi();
  }
  return rig;
}

/**
 * Dựng một nhân vật NGƯỜI vào `host`.
 *   id      id nhân vật ('vet' mặc định); `list()` liệt kê
 *   config  object bộ số. Bỏ trống → dùng bộ số đã nướng vào bản dựng (nếu có); `null` → không dùng
 */
export function createCharacter(host, { id = 'vet', config } = {}) {
  if (!RigSVG.NHAN_VAT[id]) throw new Error(`[character] no character "${id}" (available: ${Object.keys(RigSVG.NHAN_VAT).join(', ')})`);
  if (config === undefined) config = bakedConfigs[id] || null;
  assertConfig(config, 'person', id);
  host.style.aspectRatio = `${RigSVG.KHUNG.w}/${RigSVG.KHUNG.h}`;
  const rig = new RigSVG(host, id);
  rig.publicId = id;
  applyConfig(rig, config);
  return { rig, id };
}

/**
 * Dựng một THÚ CƯNG vào `host`.
 *   species  'dog' | 'shiba' | 'cat' | 'orange_cat' | 'black_cat'
 *   config   { shape: {…}, colors: {…} } — quy tắc mặc định như createCharacter
 */
export function createPet(host, { species = 'dog', config } = {}) {
  if (!RigThu.LOAI[species]) throw new Error(`[character] no species "${species}" (available: ${Object.keys(RigThu.LOAI).join(', ')})`);
  if (config === undefined) config = bakedConfigs[species] || null;
  assertConfig(config, 'pet', species);
  host.style.aspectRatio = `${RigThu.KHUNG.w}/${RigThu.KHUNG.h}`;
  const rig = new RigThu(host, species);
  rig.publicId = species;
  applyConfig(rig, config);
  return { rig, id: species };
}

/** Gieo hạt cho MỌI thứ ngẫu nhiên (chớp mắt, khẩu hình, cử chỉ). Bắt buộc khi dựng video. */
export function seed(value) { RigSVG.gieo(value); RigThu.gieo(value); }

// Tên hiển thị TIẾNG ANH của các nhân vật và giống có sẵn. Tên trong hai bộ rig là tiếng Việt
// (studio dùng); phía công khai trả về tên ở đây, nhân vật tuỳ chỉnh thì trả `name` nó tự khai.
const BUILT_IN_NAMES = {
  default: 'Default (plain adult)', vet: 'Veterinarian', surgeon: 'Surgeon', nurse: 'Nurse', doctor: 'Doctor with glasses',
  dog: 'Dog (golden puppy)', shiba: 'Dog (shiba)', cat: 'Cat (grey tabby)', orange_cat: 'Cat (orange tabby)', black_cat: 'Cat (black)',
};
const displayName = (id, definition) => BUILT_IN_NAMES[id] || definition.ten || id;

/** Liệt kê nhân vật đang có và động tác của từng loại. */
export function list() {
  return {
    people: Object.fromEntries(Object.entries(RigSVG.NHAN_VAT).map(([k, v]) => [k, displayName(k, v)])),
    pets: Object.fromEntries(Object.entries(RigThu.LOAI).map(([k, v]) => [k, displayName(k, v)])),
    personActions: [...RigSVG.DONG_TAC, ...RigSVG.DI_NGANG, ...RigSVG.STANCE],
    petActions: { ...RigThu.DONG_TAC },
    expressions: Object.keys(RigSVG.EXPRESSIONS),
    bakedConfigs: Object.keys(bakedConfigs),
  };
}

/**
 * Xếp một CHUỖI động tác của MỘT nhân vật thành một timeline (paused) — thứ để `add` vào
 * timeline của composition.
 *
 *   sequence(rig, ['enter', 'wave', ['explain', 'Xin chào!', 2.4], 0.5, ['idle', 2], 'exit'])
 *
 * Mỗi mục là tên động tác, hoặc [tên, ...tham số], hoặc một SỐ (nghỉ thêm chừng ấy giây).
 * Thời điểm từng bước nằm ở `timeline.data.steps`.
 *
 * Vì sao không tự `add` từng timeline: (1) vài động tác đọc vị trí nhân vật LÚC DỰNG (`walk`
 * có quãng đường, `point`) — hàm này đẩy nhân vật tới cuối từng bước trước khi dựng bước kế;
 * (2) timeline trả về đã được LẤY MẪU SẴN nên tua tới đâu, theo chiều nào, cũng ra đúng một
 * trạng thái (xem chú thích trong thân hàm).
 *
 * `gap`: giây nghỉ chèn giữa hai bước (mặc định 0.1). `sampleRate`: số mẫu mỗi giây (60).
 */
export function sequence(rig, stepList, { gap = 0.1, sampleRate = 60 } = {}) {
  const source = gsap.timeline({ paused: true, defaults: { lazy: false } });
  const keys = Object.keys(rig.NGHI);
  // Chỉ chép các khoá trạng thái thật — GSAP gắn thêm `_gsap` vào `rig.s`, chép cả nó là hỏng.
  const snapshot = () => keys.map((k) => rig.s[k]);
  const restore = (values) => keys.forEach((k, n) => { rig.s[k] = values[n]; });
  let at = 0, endState = snapshot(), firstFrame = null;
  const steps = [];
  for (const step of stepList) {
    if (typeof step === 'number') { at += step; continue; }
    const [name, ...args] = Array.isArray(step) ? step : [step];
    if (typeof rig[name] !== 'function') throw new Error(`[character] no action "${name}" (available: ${rig.actions.join(', ')})`);
    // Dựng nháp một lần để biết động tác này BẮT ĐẦU từ trạng thái nào. Vài động tác mở đầu
    // bằng `set` (enter đặt nhân vật ra ngoài khung), mà GSAP KHÔNG vẽ `set` khi đầu phát nằm
    // đúng ở thời điểm 0. Đặt sẵn trạng thái ấy vào rig TRƯỚC khi dựng bản thật.
    restore(endState);
    const draft = rig[name](...args);
    draft.progress(1e-6); const startState = snapshot(); draft.kill();
    restore(startState);
    if (!firstFrame) firstFrame = startState;
    const child = rig[name](...args);
    child.progress(1); endState = snapshot();
    child.progress(0).paused(false);
    source.add(child, at);
    steps.push({ name, start: +at.toFixed(3), duration: +child.duration().toFixed(3) });
    at += child.duration() + gap;
  }

  // LẤY MẪU SẴN. Timeline nguồn (các động tác nối nhau) chỉ chắc chắn đúng khi chạy TUẦN TỰ từ
  // đầu: nó gồm hàng trăm tween cùng ghi vào một object trạng thái, vài `set` tức thời và vài
  // tween gối đầu nhau, nên tua tới cùng một thời điểm từ phía trước và từ phía sau có thể ra
  // hai trạng thái khác nhau (đo được: enter / walkForward ở giữa chuỗi lệch tới cả vị trí lẫn
  // độ mờ). Bộ dựng video thì tua thẳng tới từng khung, có khi song song, có khi tua ngược.
  // Nên ở đây chạy timeline nguồn ĐÚNG MỘT LẦN theo chiều thuận, ghi lại trạng thái từng khung,
  // rồi trả về một timeline chỉ có MỘT tween phát lại các khung ấy — trạng thái ở thời điểm t
  // khi đó là một phép tra bảng, không còn phụ thuộc đường đi tới t.
  const duration = Math.max(source.duration(), 1e-3), count = Math.ceil(duration * sampleRate) + 1;
  if (firstFrame) restore(firstFrame);
  const frames = [];
  for (let n = 0; n < count; n++) { source.totalTime(Math.min(duration, n / sampleRate), false); frames.push(snapshot()); }
  source.kill();

  const numeric = keys.map((k) => typeof rig.NGHI[k] === 'number');
  const show = (position) => {
    const p = Math.min(count - 1, Math.max(0, position)), lo = Math.floor(p), hi = Math.min(count - 1, lo + 1), mix = p - lo;
    const a = frames[lo], b = frames[hi];
    // Số thì nội suy giữa hai khung mẫu; chuỗi (hình bàn tay) lấy của khung trước.
    keys.forEach((k, n) => { rig.s[k] = numeric[n] ? a[n] + (b[n] - a[n]) * mix : a[n]; });
    rig.apDung();
  };
  // Phát lại qua SETTER của thuộc tính đang tween: GSAP ghi thuộc tính ở mọi lần vẽ, kể cả khi
  // bị tua bằng seek() (tắt callback) và khi tua ngược.
  const playhead = { _frame: 0, get frame() { return this._frame; }, set frame(v) { this._frame = v; show(v); } };
  const timeline = gsap.timeline({ paused: true, defaults: { lazy: false } });
  timeline.to(playhead, { frame: (count - 1) * (duration * sampleRate) / (count - 1), duration, ease: 'none' }, 0);
  timeline.data = { type: 'character-sequence', character: rig.publicId || '', steps };
  show(0);                                      // rig nằm sẵn ở đúng khung 0 của chuỗi
  return timeline;
}

// Đăng ký nhân vật có sẵn rồi tới nhân vật tuỳ chỉnh. Đặt ở CUỐI module: việc đăng ký dùng
// các hằng kiểm tra khai báo phía trên, chạy sớm hơn là đụng vào chúng trước khi chúng có giá trị.
dangKyDau(RigSVG, 'vet');
for (const character of CUSTOM_CHARACTERS) registerCharacter(character);

export { RigSVG, RigThu };
