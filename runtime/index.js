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
import { createProp, PROP_KINDS } from './props.js';
import { child, teen, adult, tall, stocky } from './bodies.js';
import { crop, sidePart, bob, long, ponytail, bun, pigtails, curly, spiky, tufts, bald } from './hair.js';
import { roundGlasses, shortBeard, moustache, wrinkles, apronBib, cup, clipboard, phone } from './parts.js';
import { COLOR_KEYS, PERSON_STATE_KEYS, PET_STATE_KEYS, HAND_SHAPES, CONFIG_GROUPS, PET_SHAPE_KEYS,
         definitionToInternal, definitionToPublic, configToInternal, stateToInternal, DRAWING_SLOTS, DEFINITION_KEYS } from './schema.js';
import CUSTOM_CHARACTERS from '../characters/index.js';

export const VERSION = '0.12.3';
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
Object.defineProperty(RigThu.prototype, 'actions', { get() { return [...this.DONG_TAC, ...RigThu.STANCE]; } });

/* ─────────────────────────────────────────────────────────────── bộ đồ nghề */

const publicOutfit = (outfit) => definitionToPublic(outfit);
/**
 * BỘ ĐỒ NGHỀ đưa cho hàm `define` của nhân vật tuỳ chỉnh (tham số thứ hai).
 *   outfits   các bộ trang phục dựng sẵn — trải vào định nghĩa rồi ghi đè chi tiết
 *   outlines  đường bao thân áo của ba bộ ấy, nếu chỉ cần hình dáng
 *   hair      kiểu tóc dựng sẵn — `hair: kit.hair.bob()`
 *   bodies    bộ số tỉ lệ dáng người — trải vào định nghĩa
 *   parts     kính, râu, ria, nếp nhăn, yếm tạp dề và đồ vật cầm tay vẽ sẵn
 *   partsOf   lấy định nghĩa của một nhân vật KHÁC để mượn bộ phận: partsOf('doctor').faceExtras
 */
export const kit = {
  outfits: { scrubs: publicOutfit(KIT.boDo.doMo), pawTunic: publicOutfit(KIT.boDo.aoDauChan), coat: publicOutfit(KIT.boDo.aoBlouse),
             plainCoat: publicOutfit(KIT.boDo.plainCoat), tee: publicOutfit(KIT.boDo.tee), shirt: publicOutfit(KIT.boDo.shirt),
             dress: publicOutfit(KIT.boDo.dress), hoodie: publicOutfit(KIT.boDo.hoodie), suit: publicOutfit(KIT.boDo.suit) },
  outlines: { scrubs: KIT.AO.doMo, pawTunic: KIT.AO.aoDauChan, coat: KIT.AO.aoBlouse },
  sideShading: KIT.suonTu, shoulderPatches: KIT.vaiCo, closedShoes: KIT.giayKin,
  nameTag: KIT.theTen, pawPrint: KIT.dauChan, stethoscope: KIT.ongNgheVatCo,
  bodies: { child, teen, adult, tall, stocky },
  hair: { crop, sidePart, bob, long, ponytail, bun, pigtails, curly, spiky, tufts, bald },
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
  // Các khoá của trang phục dưới, dáng và đồ cầm tay: khai sai thì rig vẫn vẽ ra MỘT THỨ GÌ ĐÓ
  // (chuỗi 'apron' thành váy thường, `stoop: 5` thành 1) — nên phải báo ngay ở đây.
  const fail = (message) => { throw new Error(`[character] "${id}": ${message}`); };
  const { skirt, stoop } = definition;
  if (skirt !== undefined && skirt !== null) {
    if (typeof skirt !== 'object' || Array.isArray(skirt)) fail(`skirt must be an object like { kind: 'skirt', length: 1 } or null, got ${JSON.stringify(skirt)}`);
    for (const key of Object.keys(skirt)) if (!['kind', 'length', 'flare'].includes(key)) fail(`skirt has an unknown key "${key}" (allowed: kind, length, flare)`);
    if (!['skirt', 'apron'].includes(skirt.kind)) fail(`skirt.kind must be 'skirt' or 'apron', got ${JSON.stringify(skirt.kind)}`);
    if (skirt.length !== undefined && !(typeof skirt.length === 'number' && skirt.length >= 0.2 && skirt.length <= 2)) fail(`skirt.length must be a number from 0.2 to 2 (thigh lengths; 1 = knee), got ${JSON.stringify(skirt.length)}`);
    if (skirt.flare !== undefined && !(typeof skirt.flare === 'number' && skirt.flare >= 0 && skirt.flare <= 30)) fail(`skirt.flare must be a number from 0 to 30, got ${JSON.stringify(skirt.flare)}`);
  }
  if (stoop !== undefined && !(typeof stoop === 'number' && stoop >= 0 && stoop <= 1)) fail(`stoop must be a number from 0 to 1, got ${JSON.stringify(stoop)}`);
  // `top` (đường bao thân áo) phải là HÀM trả về chuỗi `d` của path. Đưa thẳng một chuỗi, hay một
  // giá trị không có (`kit.outlines.stocky`), thì lỗi lộ ra rất muộn và bằng tên nội bộ của rig.
  if (definition.ao !== undefined) {
    if (typeof definition.ao !== 'function') fail(`top must be a function returning path data, e.g. top: () => kit.outlines.scrubs — got ${definition.ao === null ? 'null' : typeof definition.ao === 'string' ? 'a string (wrap it: top: () => "M …")' : JSON.stringify(definition.ao)}`);
    const outline = definition.ao();
    if (typeof outline !== 'string' || !/^\s*M/i.test(outline)) fail(`top() must return SVG path data starting with "M", got ${outline === undefined ? 'undefined (kit.outlines has: ' + Object.keys(kit.outlines).join(', ') + ')' : JSON.stringify(outline).slice(0, 60)}`);
  }
  // Khoá vẽ phải là HÀM trả về chuỗi: quên `return` là ra chữ "undefined" trong SVG.
  for (const internalKey of DRAWING_SLOTS) {
    const publicKey = Object.keys(DEFINITION_KEYS).find((key) => DEFINITION_KEYS[key] === internalKey) || internalKey;
    if (definition[internalKey] === undefined) continue;
    if (typeof definition[internalKey] !== 'function') fail(`${publicKey} must be a function returning SVG${publicKey.startsWith('heldItem') ? ', e.g. (p, c) => kit.parts.cup(c)' : ''}; use () => '' for none — got ${JSON.stringify(definition[internalKey])}`);
    let drawn;
    try { drawn = internalKey === 'mat' || internalKey === 'giay' ? definition[internalKey]('check', 'L', definition.mau || {}, 0) : definition[internalKey]('check', definition.mau || {}, definition); }
    catch (error) { continue; }                 // lỗi trong hàm vẽ sẽ hiện đầy đủ khi dựng nhân vật
    if (typeof drawn !== 'string') fail(`${publicKey} must return a string of SVG, got ${drawn === undefined ? 'undefined (missing return?)' : typeof drawn}`);
  }
  if (definition.mauSoSau) {
    definition.mauSoSau = COLOR_KEYS[definition.mauSoSau] || definition.mauSoSau;
    // Base `default` có bảng màu rỗng (dùng bảng mặc định của rig) — khi ấy không có gì để đối chiếu.
    // Tên màu LẠ thì báo lỗi. Tên màu hợp lệ nhưng nhân vật không khai (trải `kit.outfits.scrubs` —
    // vốn trỏ tới màu mũ — lên một nhân vật không đội mũ) thì cho qua: rig tự lấy màu tóc.
    const known = Object.values(COLOR_KEYS).includes(definition.mauSoSau);
    if (!known && definition.mau && Object.keys(definition.mau).length && !(definition.mauSoSau in definition.mau)) throw new Error(`[character] "${id}": backSkullColor names a colour that is not in colors`);
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
  if (c.dang)  rig.doiDang(c.dang);
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
    petActions: Object.fromEntries(Object.entries(RigThu.DONG_TAC).map(([kind, names]) => [kind, [...names, ...RigThu.STANCE]])),
    expressions: Object.keys(RigSVG.EXPRESSIONS),
    props: [...PROP_KINDS],
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
// Các bước CÓ LỜI, và quãng "về chỗ" (miệng đã khép, tay đang thu về) ở cuối mỗi bước ấy.
const SPEECH_STEPS = ['speak', 'explain', 'speakCues'];
const SPEECH_SETTLE = 0.55;

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
    const entry = { name, start: +at.toFixed(3), duration: +child.duration().toFixed(3) };
    // `face` về phía một nhân vật / phần tử: ghi lại đích để tools/peek.sh soát xem về sau nó có còn ở phía ấy không.
    if (name === 'face' && args[0] && typeof args[0] === 'object') entry.target = args[0].live || args[0];
    // LỜI của bước nói — để `captions()` hiện chữ đúng giờ. `speak` / `explain` nhận lời ở tham số
    // đầu; `speakCues` lấy từ `{ text }` (tham số thứ ba) hoặc từ `metadata.text` của bộ cue.
    if (SPEECH_STEPS.includes(name)) {
      const text = name === 'speakCues' ? (args[2] && args[2].text) || (args[0] && args[0].metadata && args[0].metadata.text) : args[0];
      if (typeof text === 'string' && text.trim()) entry.text = text.trim();
      entry.speech = Math.max(0, entry.duration - SPEECH_SETTLE);          // tiếng nói ngắn hơn bước đúng quãng "về chỗ"
      // Tệp tiếng mà bộ cue này được tạo ra từ đó — tools/peek.sh ghép <audio> với bước theo tên tệp.
      if (name === 'speakCues' && args[0] && args[0].metadata && args[0].metadata.soundFile) entry.sound = args[0].metadata.soundFile;
      if (name === 'speakCues') entry.cues = Array.isArray(args[0]) ? args[0] : (args[0] && args[0].mouthCues) || [];      // cho tools/peek.sh --mouth
    }
    steps.push(entry);
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
  const lastPosition = duration * sampleRate;       // vị trí (tính bằng khung) của giây cuối cùng
  const show = (position) => {
    const p = Math.min(count - 1, Math.max(0, position)), lo = Math.min(count - 2, Math.floor(p)), hi = lo + 1;
    // Khung CUỐI được chụp đúng ở `duration`, tức sớm hơn một nhịp mẫu trọn vẹn — khoảng cuối
    // ngắn hơn các khoảng khác. Chia theo độ dài thật của nó, nếu không thì ở đúng giây cuối
    // chuỗi vẫn còn thiếu một chút mới tới trạng thái kết thúc.
    const span = hi === count - 1 ? Math.max(1e-9, lastPosition - lo) : 1, mix = Math.min(1, (p - lo) / span);
    const a = frames[lo], b = frames[hi];
    // Số thì nội suy giữa hai khung mẫu; chuỗi (hình bàn tay) lấy của khung trước.
    keys.forEach((k, n) => { rig.s[k] = numeric[n] ? a[n] + (b[n] - a[n]) * mix : a[n]; });
    rig.apDung();
  };
  // Phát lại qua SETTER của thuộc tính đang tween: GSAP ghi thuộc tính ở mọi lần vẽ, kể cả khi
  // bị tua bằng seek() (tắt callback) và khi tua ngược.
  const playhead = { _frame: 0, get frame() { return this._frame; }, set frame(v) { this._frame = v; show(v); } };
  const timeline = gsap.timeline({ paused: true, defaults: { lazy: false } });
  timeline.to(playhead, { frame: lastPosition, duration, ease: 'none' }, 0);
  timeline.data = { type: 'character-sequence', character: rig.publicId || '', steps, rig };
  rig.lastSequence = timeline;                  // `shot(…, { time })` dùng chuỗi này để biết nhân vật đang ở đâu lúc ấy
  show(0);                                      // rig nằm sẵn ở đúng khung 0 của chuỗi
  return timeline;
}

/**
 * MÁY QUAY: phóng CẢNH vào một hay nhiều nhân vật — cận mặt, ngang ngực, cả người — hoặc trả
 * về toàn cảnh. Trả về một timeline (paused) để `add` vào timeline của composition.
 *
 *   const scene = ['#wall', '#floor', '#dog', '#vet'];          // mọi thứ thuộc về cảnh
 *   tl.add(VGCharacter.shot(scene, vet, 'face', { time: 5.2 }).paused(false), 5.0);
 *   tl.add(VGCharacter.shot(scene, [vet, dog], 'full', { time: 9 }).paused(false), 8.6);   // cả hai trong một khung
 *   tl.add(VGCharacter.shot(scene, null, 'wide').paused(false), 12.0);
 *
 *   scene     các phần tử của cảnh: một selector, một phần tử, hoặc một mảng của hai thứ đó.
 *             TỪNG phần tử được dịch và phóng như nhau quanh góc trên-trái của khung hình, nên
 *             chúng cứ nằm phẳng cạnh nhau trong composition — không cần (và không nên) bọc
 *             chung vào một lớp. Thứ không nằm trong danh sách (phụ đề, logo) thì đứng yên.
 *   subject   một rig (người hoặc thú) hay một MẢNG rig — khung ôm lấy tất cả (bỏ qua khi kind = 'wide')
 *   kind      'face' | 'chest' | 'full' | 'wide'
 *   options   duration (0.6; 0 = cắt cảnh), ease, fill (0.82 — phần khung hình mà vùng ngắm chiếm),
 *             centerY (0.5 — vùng ngắm nằm ở đâu theo chiều dọc; khung dọc có phụ đề giữa khung thì ~0.36),
 *             time: thời điểm của cảnh quay, để ngắm đúng chỗ nhân vật ĐANG Ở lúc ấy (đã đi, đã
 *             ngồi). Tính trong chuỗi của từng nhân vật — tức cũng là giờ của composition khi các
 *             chuỗi được `add` ở 0. Không đưa thì lấy trạng thái hiện tại của rig (khung đầu).
 *             sequence: chuỗi dùng để tua tới `time`; mặc định là chuỗi `sequence()` dựng gần nhất
 *             cho rig ấy (đưa một mảng nếu ngắm nhiều rig và muốn chỉ định).
 *             frame: phần tử làm khung hình (mặc định: phần tử gốc có data-composition-id).
 *
 * Vị trí tính MỘT LẦN lúc dựng, từ bố cục trang và hình học của rig — nên tua tới đâu cũng ra
 * cùng một khung hình. Máy quay không bám theo nhân vật đang di chuyển.
 */
export function shot(scene, subject, kind = 'face', { duration = 0.6, ease = 'power2.inOut', fill = 0.82, centerY = 0.5, sequence: given, time, frame } = {}) {
  const elements = [].concat(scene || []).flatMap((item) => (typeof item === 'string' ? [...document.querySelectorAll(item)] : [item])).filter((item) => item && item.nodeType === 1);
  if (!elements.length) throw new Error('[character] shot(scene, …): scene must be a selector, an element, or an array of them — and match at least one element');
  const root = frame || elements[0].closest('[data-composition-id]') || elements[0].parentElement;
  const frameWidth = root.offsetWidth, frameHeight = root.offsetHeight;
  // Vị trí của một phần tử trong khung hình, cộng dồn theo chuỗi offsetParent — KHÔNG dùng
  // getBoundingClientRect, vì số ấy đã gồm cả phép phóng của một cảnh quay trước.
  const place = (element) => {
    let x = 0, y = 0;
    for (let node = element; node && node !== root; node = node.offsetParent) { x += node.offsetLeft; y += node.offsetTop; }
    return { x, y };
  };
  let target = { x: 0, y: 0, scale: 1 };
  if (kind !== 'wide') {
    const rigs = [].concat(subject || []);
    if (!rigs.length || rigs.some((rig) => !rig || typeof rig.shotBox !== 'function')) throw new Error(`[character] shot(scene, subject, "${kind}"): subject must be a rig (createCharacter / createPet …).rig, or an array of rigs`);
    const sequences = [].concat(given || []);
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    rigs.forEach((rig, index) => {
      // Đưa nhân vật tới đúng thời điểm của cảnh quay để đọc vị trí, rồi trả chuỗi về chỗ cũ.
      const actions = time === undefined ? null : sequences[index] || (sequences.length === 1 && rigs.length === 1 ? sequences[0] : null) || rig.lastSequence || null;
      const before = actions ? actions.time() : 0;
      if (actions) actions.time(Math.min(time, actions.duration()));
      const box = rig.shotBox(kind);
      if (actions) actions.time(before);
      // Khung của rig (người 400 × 470, thú 400 × 330) nằm vừa trong host, canh giữa.
      const size = rig.constructor.KHUNG, host = place(rig.host), hostWidth = rig.host.offsetWidth, hostHeight = rig.host.offsetHeight;
      const unit = Math.min(hostWidth / size.w, hostHeight / size.h);
      const originX = host.x + (hostWidth - size.w * unit) / 2, originY = host.y + (hostHeight - size.h * unit) / 2;
      left = Math.min(left, originX + box.x * unit); right = Math.max(right, originX + (box.x + box.width) * unit);
      top = Math.min(top, originY + box.y * unit); bottom = Math.max(bottom, originY + (box.y + box.height) * unit);
    });
    // Vừa cả chiều cao lẫn bề ngang của vùng ngắm (hai nhân vật đứng xa nhau thì bề ngang quyết định).
    const scale = Math.max(1, Math.min(8, fill * frameHeight / (bottom - top), (rigs.length > 1 ? 0.9 : 1.6) * frameWidth / (right - left)));
    // Canh vùng ngắm vào giữa khung, nhưng không để lộ ra ngoài mép cảnh.
    const within = (value, size) => Math.min(0, Math.max(size - size * scale, value));
    target = { x: within(frameWidth / 2 - (left + right) / 2 * scale, frameWidth), y: within(frameHeight * centerY - (top + bottom) / 2 * scale, frameHeight), scale };
  }
  const timeline = gsap.timeline({ paused: true, defaults: { lazy: false } });
  for (const element of elements) {
    // Gốc phóng của TỪNG phần tử là góc trên-trái của khung hình (tính trong toạ độ của nó), nên
    // mọi phần tử chịu đúng một phép biến đổi như thể chúng nằm chung một lớp.
    const at = place(element);
    gsap.set(element, { transformOrigin: `${-at.x}px ${-at.y}px` });
    // Cảnh được phóng thì tràn ra ngoài khung là CHỦ Ý — báo cho `hyperframes check` (nó cảnh báo
    // `panel_out_of_canvas` nếu không có dấu này).
    if (target.scale > 1) element.setAttribute('data-layout-allow-overflow', '');
    timeline.to(element, { ...target, duration: Math.max(duration, 0.001), ease: duration > 0 ? ease : 'none' }, 0);
  }
  timeline.data = { type: 'character-shot', kind, target };
  return timeline;
}

/**
 * PHỤ ĐỀ / BONG BÓNG THOẠI: hiện LỜI của từng câu nói vào một phần tử, đúng lúc câu ấy được nói.
 *
 *   tl.add(VGCharacter.captions(talk, document.getElementById('caption')).paused(false), 0);
 *
 *   source    kết quả của `conversation()`, một timeline `sequence()`, hoặc mảng
 *             [{ start, end, text, rig? }] tự soạn. Lời lấy từ chính các bước nói:
 *             `['speak', 'lời', 2]`, `['explain', 'lời', 2.4]`, `['speakCues', cues, null, { text: 'lời' }]`
 *             (hoặc `metadata.text` do `tools/cues.py --text` ghi vào bộ cue).
 *   element   phần tử hiện chữ — kiểu dáng do composition lo. Nếu có một phần tử con mang
 *             thuộc tính `data-caption-text` thì chữ ghi vào đó (phần còn lại là khung, đuôi bong bóng…).
 *   options   fade (0.15 s hiện / ẩn) · hold (0.3 s giữ chữ sau khi dứt lời) · readable (true: mỗi câu ở lại
 *             đủ lâu để đọc — 0,5 s + 0,3 s mỗi từ, câu cuối ít nhất 3 s) · speaker (false; true
 *             để thêm "Tên: " phía trước) · follow (false; true = BONG BÓNG: đặt phần tử phía trên
 *             đầu người nói bằng left / top — phần tử phải `position: absolute` trong khung hình
 *             và KHÔNG nằm trong danh sách `scene` của máy quay) · offsetY (khoảng hở trên đầu, px)
 *
 * Trả về một timeline (paused). Chữ và độ mờ là HÀM CỦA THỜI GIAN (một tween, tra bảng) nên tua
 * tới đâu cũng ra đúng một khung hình. `timeline.data.lines` giữ danh sách câu.
 */
export function captions(source, element, { fade = 0.15, hold = 0.3, speaker = false, follow = false, offsetY = 12, readable = true } = {}) {
  if (!element || element.nodeType !== 1) throw new Error('[character] captions(source, element): element must be the DOM element that shows the text');
  const fromSteps = (steps, rig, shift = 0) => steps.filter((step) => step.text).map((step) => ({ start: step.start + shift, end: step.start + shift + (step.speech ?? step.duration), text: step.text, rig }));
  let lines;
  if (Array.isArray(source)) lines = source.map((line) => ({ ...line }));
  else if (source && Array.isArray(source.turns)) lines = source.turns.flatMap((turn) => fromSteps(turn.steps, turn.rig));
  else if (source && source.data && source.data.type === 'character-sequence') lines = fromSteps(source.data.steps, source.data.rig);
  else throw new Error('[character] captions(source, …): source must be a conversation(), a sequence(), or an array of { start, end, text }');
  lines = lines.filter((line) => line && typeof line.text === 'string' && line.end > line.start).sort((a, b) => a.start - b.start);
  // ĐỦ GIỜ ĐỂ ĐỌC: một câu ở lại ít nhất 0,5 s + 0,3 s mỗi từ (câu cuối của phim: ít nhất 3 s), kể cả
  // khi tiếng nói ngắn hơn thế — nhưng không lấn sang câu kế tiếp.
  if (readable) lines.forEach((line, index) => {
    const words = line.text.trim().split(/\s+/).length, next = lines[index + 1];
    const wanted = line.start + Math.max(0.5 + 0.3 * words, next ? 0 : 3);
    line.end = Math.max(line.end, next ? Math.min(wanted, next.start - 2 * fade - hold) : wanted);
  });
  if (!lines.length) throw new Error('[character] captions: no spoken text found — speak / explain take the text as their first argument; for speakCues pass { text } as the fourth item of the step');
  const label = (line) => (speaker && line.rig ? `${list().people[line.rig.publicId] || line.rig.publicId || ''}: ` : '') + line.text;
  const slot = element.querySelector('[data-caption-text]') || element;
  // BONG BÓNG: vị trí phía trên đầu người nói, tính một lần cho từng câu (ở giữa câu ấy).
  if (follow) {
    const root = element.closest('[data-composition-id]') || element.offsetParent || element.parentElement;
    const place = (node) => { let x = 0, y = 0; for (let n = node; n && n !== root; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return { x, y }; };
    for (const line of lines) {
      if (!line.rig || typeof line.rig.shotBox !== 'function') continue;
      const actions = line.rig.lastSequence, before = actions ? actions.time() : 0;
      if (actions) actions.time(Math.min((line.start + line.end) / 2, actions.duration()));
      const box = line.rig.shotBox('face');
      if (actions) actions.time(before);
      const size = line.rig.constructor.KHUNG, host = place(line.rig.host), unit = Math.min(line.rig.host.offsetWidth / size.w, line.rig.host.offsetHeight / size.h);
      line.x = host.x + (line.rig.host.offsetWidth - size.w * unit) / 2 + (box.x + box.width / 2) * unit;
      line.y = host.y + (line.rig.host.offsetHeight - size.h * unit) / 2 + box.y * unit - offsetY;
    }
  }
  const total = lines[lines.length - 1].end + hold + fade;
  let shown = null;
  const show = (time) => {
    // Câu đang hiện: câu cuối cùng đã bắt đầu và chưa hết (kể cả quãng giữ + mờ dần).
    const line = [...lines].reverse().find((item) => time >= item.start - fade && time <= item.end + hold + fade) || null;
    if (line !== shown) {
      shown = line;
      if (line) {
        slot.textContent = label(line);
        if (follow && line.x !== undefined) { element.style.left = `${line.x.toFixed(1)}px`; element.style.top = `${line.y.toFixed(1)}px`; element.style.transform = 'translate(-50%, -100%)'; }
      }
    }
    const opacity = !line ? 0 : Math.max(0, Math.min(1, (time - (line.start - fade)) / fade, (line.end + hold + fade - time) / fade));
    element.style.opacity = opacity.toFixed(3);
  };
  const playhead = { _time: 0, get time() { return this._time; }, set time(value) { this._time = value; show(value); } };
  const timeline = gsap.timeline({ paused: true, defaults: { lazy: false } });
  timeline.to(playhead, { time: total, duration: total, ease: 'none' }, 0);
  timeline.data = { type: 'character-captions', lines: lines.map(({ start, end, text, rig }) => ({ start, end, text, character: rig ? rig.publicId || '' : '' })) };
  show(0);
  return timeline;
}

/**
 * HỘI THOẠI: xếp LƯỢT của nhiều nhân vật nối tiếp nhau và tự căn giờ — không phải cộng tay
 * thời lượng của người này để ra quãng nghỉ của người kia.
 *
 *   const talk = VGCharacter.conversation([
 *     [vet, ['enter', 'left'], ['walk', 4, 230], ['face', boy]],     // một lượt = [rig, ...các bước]
 *     [boy, ['face', vet]],
 *     [vet, ['speakCues', cues.line1]],
 *     [boy, ['speakCues', cues.line2], 'nod'],
 *     { together: [[vet, 'wave'], [dog, 'bark']] },                  // nhiều nhân vật CÙNG LÚC
 *   ], { gap: 0.25 });
 *   talk.addTo(tl, 0);
 *
 * Lượt sau bắt đầu khi lượt trước xong (cộng `gap` giây). Nếu lượt ĐẦU TIÊN mở bằng một câu nói thì nó bắt
 * đầu sau `leadIn` giây (0.6) chứ không phải ở khung hình đầu. Trong lúc chờ tới lượt, nhân vật
 * THỞ và chớp mắt (`idle`) thay vì đứng hình — `waiting: false` để tắt.
 *
 * Trả về { sequences, turns, duration, addTo, of }:
 *   sequences   mỗi nhân vật một timeline `sequence()` (cùng thứ tự xuất hiện)
 *   turns       [{ rig, character, start, end, steps: [{ name, start, duration }] }] — giờ tuyệt đối
 *   addTo(timeline, at = 0)   thêm mọi chuỗi vào timeline của composition
 *   of(rig)     chuỗi của một nhân vật
 */
export function conversation(turnList, { gap = 0.25, waiting = true, stepGap = 0.1, camera = null, leadIn = 0.6 } = {}) {
  if (!Array.isArray(turnList) || !turnList.length) throw new Error('[character] conversation(turns): turns must be a non-empty array of [rig, ...steps]');
  const cast = new Map();                                  // rig → { steps: danh sách bước đang dựng, end: giờ kết thúc hiện tại }
  // Mỗi nhân vật nhớ TRẠNG THÁI BAN ĐẦU (để lần dựng nào cũng xuất phát từ đúng chỗ ấy) và `centre`:
  // hoành độ tâm của nó sau các lượt đã xếp — chỗ nó ĐANG ĐỨNG khi tới lượt kế tiếp.
  const part = (rig) => {
    if (!cast.has(rig)) { const keys = Object.keys(rig.NGHI); cast.set(rig, { steps: [], end: 0, used: false, keys, initial: keys.map((k) => rig.s[k]), centre: undefined }); }
    return cast.get(rig);
  };
  const restore = (rig) => { const mine = cast.get(rig); mine.keys.forEach((k, n) => { rig.s[k] = mine.initial[n]; }); };
  // `face(nhân vật khác)` đọc vị trí của người kia LÚC DỰNG. Mỗi nhân vật lại được dựng riêng, nên lúc
  // ấy người kia đang nằm ở khung đầu của họ — chưa bước vào, chưa đi tới chỗ đứng. Vì thế đích của
  // `face` được thay bằng một "mỏ neo" mang đúng chỗ người kia đứng ở thời điểm của lượt này.
  const anchor = (target) => {
    const known = cast.get(target), x = known && known.centre !== undefined ? known.centre : target.centerX();
    return { centerX: () => x, publicId: target.publicId, live: target };
  };
  // Đo một danh sách bước: dựng thử với tần số lấy mẫu thấp (nhanh), đọc giờ từng bước.
  const measure = (rig, steps) => {
    restore(rig);
    const draft = sequence(rig, steps, { gap: stepGap, sampleRate: 4 });
    draft.time(draft.duration());
    const data = { duration: draft.duration(), steps: draft.data.steps, centre: rig.centerX() };
    draft.kill(); restore(rig);
    return data;
  };
  const turns = [];
  // Cảnh mở đầu bằng LỜI NÓI thì chừa một nhịp: không thì nhân vật nói ngay từ khung hình đầu tiên, và
  // máy quay vẫn đang đẩy vào khi câu đã bắt đầu.
  const opening = (entry) => { const turn = entry && entry.turn ? entry.turn : entry; return turn && Array.isArray(turn.together) ? turn.together.map(opening).flat() : [Array.isArray(turn) ? turn[1] : null]; };
  const speaksFirst = opening(turnList[0]).some((step) => SPEECH_STEPS.includes(Array.isArray(step) ? step[0] : step));
  let clock = speaksFirst ? leadIn : 0;
  turnList.forEach((entry, index) => {
    // Một mục: [rig, ...bước] · { together: [[rig, …], …] } · { turn: [rig, …], shot } (ghi đè máy quay cho lượt ấy)
    const override = entry && !Array.isArray(entry) && 'shot' in entry ? entry.shot : undefined;
    if (entry && !Array.isArray(entry) && Array.isArray(entry.turn)) entry = entry.turn;
    const parallel = entry && !Array.isArray(entry) && Array.isArray(entry.together) ? entry.together : [entry];
    const begin = clock, moved = [];
    let finish = begin;
    for (let turn of parallel) {
      // Lượt bên trong `together` cũng có thể mang `shot` riêng: { turn: [rig, …], shot }.
      let own = override;
      if (turn && !Array.isArray(turn) && Array.isArray(turn.turn)) { if ('shot' in turn) own = turn.shot; turn = turn.turn; }
      if (!Array.isArray(turn) || !turn[0] || typeof turn[0].shotBox !== 'function' || turn.length < 2) throw new Error(`[character] conversation: turn ${index + 1} must be [rig, ...steps], { turn: [rig, ...steps], shot }, or { together: [ …such turns ] }`);
      const [rig, ...written] = turn, mine = part(rig);
      const steps = written.map((step) => (Array.isArray(step) && step[0] === 'face' && step[1] && step[1] !== rig && typeof step[1].centerX === 'function' && !step[1].live
        ? ['face', anchor(step[1]), ...step.slice(2)] : step));
      // Chờ tới giờ bắt đầu lượt: thở cho tới gần lúc đó, rồi một quãng nghỉ số cho khít từng phần trăm giây.
      const first = !mine.used, lead = first ? 0 : stepGap;       // sau mỗi bước `sequence` tự chèn `stepGap`
      let wait = begin - mine.end - lead;
      if (wait < -1e-6) throw new Error(`[character] conversation: turn ${index + 1} would start before "${rig.publicId || 'character'}" finished its previous turn`);
      if (waiting && wait > 0.8 && typeof rig.idle === 'function') {
        mine.steps.push(['idle', +(wait - 0.3).toFixed(3)]);
        mine.end = measure(rig, mine.steps).duration; mine.used = true;
        wait = begin - mine.end - stepGap;
      }
      if (wait > 1e-4) mine.steps.push(+wait.toFixed(4));
      const from = mine.steps.length;
      mine.steps.push(...steps);
      const measured = measure(rig, mine.steps), real = measured.steps.slice(measured.steps.length - steps.filter((step) => typeof step !== 'number').length);
      mine.end = measured.duration; mine.used = true;
      moved.push([mine, measured.centre]);
      finish = Math.max(finish, mine.end);
      turns.push({ rig, character: rig.publicId || '', start: real.length ? real[0].start : begin, end: mine.end, steps: real, shot: own });
    }
    // Vị trí mới chỉ có hiệu lực SAU lượt này: các lượt diễn cùng lúc đều thấy nhau ở chỗ cũ.
    for (const [mine, centre] of moved) mine.centre = centre;
    clock = finish + gap;
  });
  const sequences = [...cast.entries()].map(([rig, mine]) => { restore(rig); return sequence(rig, mine.steps, { gap: stepGap }); });
  const rigs = [...cast.keys()];
  const duration = Math.max(...sequences.map((item) => item.duration()));

  // MÁY QUAY TỰ ĐỘNG: cắt vào người đang NÓI, về toàn cảnh khi hết lời. `camera` là danh sách phần
  // tử cảnh (như tham số đầu của `shot`), hoặc { scene, kind = 'chest', duration = 0.6, lead = 0.25, wide = true, fill, centerY }.
  let cameraTimeline = null;
  if (camera) {
    const setup = Array.isArray(camera) || typeof camera === 'string' || camera.nodeType ? { scene: camera } : camera;
    const { scene, kind = 'chest', duration: move = 0.6, lead = 0.25, wide = true, fill, centerY } = setup;
    const framing = { ...(fill !== undefined ? { fill } : {}), ...(centerY !== undefined ? { centerY } : {}) };
    cameraTimeline = gsap.timeline({ paused: true });
    let aimed = null, lastWords = 0;                              // đang ngắm ai / gì; lời cuối cùng kết thúc lúc nào
    for (const turn of turns) {
      const spoken = turn.steps.filter((step) => SPEECH_STEPS.includes(step.name));
      const from = spoken.length ? spoken[0].start : turn.start, until = spoken.length ? spoken[spoken.length - 1].start + spoken[spoken.length - 1].speech : turn.end;
      // Lượt `shot: false` giữ nguyên máy quay — nhưng lời của nó vẫn tính khi quyết định lúc nào về toàn cảnh.
      if (spoken.length) lastWords = Math.max(lastWords, until);
      if (turn.shot === false || (!spoken.length && turn.shot === undefined)) continue;
      // Ghi đè: 'wide' · một cỡ cảnh · { subject, kind } · một mảng rig (đưa tất cả vào khung).
      const choice = turn.shot === undefined ? {} : typeof turn.shot === 'string' ? { kind: turn.shot } : Array.isArray(turn.shot) || (turn.shot && turn.shot.shotBox) ? { subject: turn.shot } : turn.shot;
      const shotKind = choice.kind || kind, subject = choice.subject || turn.rig;
      const key = shotKind === 'wide' ? 'wide' : [].concat(subject).map((rig) => rigs.indexOf(rig)).join('+') + ':' + shotKind;
      if (key !== aimed) {
        const at = Math.max(0, from - lead);
        cameraTimeline.add(shot(scene, shotKind === 'wide' ? null : subject, shotKind, { time: Math.min(from + 0.5, until), duration: move, ...framing }).paused(false), at);
        aimed = key;
      }
      lastWords = Math.max(lastWords, until);
    }
    if (wide && aimed && aimed !== 'wide') cameraTimeline.add(shot(scene, null, 'wide', { duration: move }).paused(false), lastWords + 0.3);
  }
  return {
    sequences, turns, duration, camera: cameraTimeline,
    of: (rig) => sequences[rigs.indexOf(rig)] || null,
    addTo(timeline, at = 0) {
      for (const item of sequences) timeline.add(item.paused(false), at);
      if (cameraTimeline) timeline.add(cameraTimeline.paused(false), at);
      return timeline;
    },
  };
}

// Đăng ký nhân vật có sẵn rồi tới nhân vật tuỳ chỉnh. Đặt ở CUỐI module: việc đăng ký dùng
// các hằng kiểm tra khai báo phía trên, chạy sớm hơn là đụng vào chúng trước khi chúng có giá trị.
dangKyDau(RigSVG, 'vet');
for (const character of CUSTOM_CHARACTERS) registerCharacter(character);

export { RigSVG, RigThu, createProp };
