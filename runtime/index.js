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

export const VERSION = '0.36.4';
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
Object.defineProperty(RigSVG.prototype, 'actions', { get() { return [...RigSVG.DONG_TAC, ...RigSVG.DI_NGANG, ...RigSVG.STANCE, ...RigSVG.EXCHANGE]; } });
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

// Món đồ có sẵn để cho nhân vật cầm bằng tên: createCharacter(host, { id, items: { R: 'cup' } }).
const ITEMS = { cup, clipboard, phone };

/**
 * Dựng một nhân vật NGƯỜI vào `host`.
 *   id           id nhân vật ('vet' mặc định); `list()` liệt kê
 *   config       object bộ số. Bỏ trống → dùng bộ số đã nướng vào bản dựng (nếu có); `null` → không dùng
 *   items        { L | R: 'cup' | 'clipboard' | 'phone' | (p, colours) => svg } — cho nhân vật cầm thêm món đồ ấy
 *   itemsHidden  true (hoặc ['R']) — món đồ có sẵn nhưng đang cất: để `take()` nhận nó, hay `showItem()` lấy ra
 */
export function createCharacter(host, { id = 'vet', config, items = null, itemsHidden = false } = {}) {
  if (!RigSVG.NHAN_VAT[id]) throw new Error(`[character] no character "${id}" (available: ${Object.keys(RigSVG.NHAN_VAT).join(', ')})`);
  if (config === undefined) config = bakedConfigs[id] || null;
  assertConfig(config, 'person', id);
  host.style.aspectRatio = `${RigSVG.KHUNG.w}/${RigSVG.KHUNG.h}`;
  const rig = new RigSVG(host, id);
  rig.publicId = id;
  applyConfig(rig, config);
  for (const [side, item] of Object.entries(items || {})) {
    if (side !== 'L' && side !== 'R') throw new Error(`[character] createCharacter: items keys must be 'L' or 'R', got ${JSON.stringify(side)}`);
    const draw = typeof item === 'function' ? item : ITEMS[item] ? (p, colours) => ITEMS[item](colours) : null;
    if (!draw) throw new Error(`[character] createCharacter: no item ${JSON.stringify(item)} (available: ${Object.keys(ITEMS).join(', ')}, or a function returning SVG)`);
    rig.setItem(side, draw, { shown: !(itemsHidden === true || (Array.isArray(itemsHidden) && itemsHidden.includes(side))) });
  }
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
    personActions: [...RigSVG.DONG_TAC, ...RigSVG.DI_NGANG, ...RigSVG.STANCE, ...RigSVG.EXCHANGE],
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
 * `breathe`: nhịp thở và đung đưa nhẹ chồng lên cả chuỗi (mặc định bật).
 */
// Các bước CÓ LỜI, và quãng "về chỗ" (miệng đã khép, tay đang thu về) ở cuối mỗi bước ấy.
const SPEECH_STEPS = ['speak', 'explain', 'speakCues'];
const SPEECH_SETTLE = 0.55;

export function sequence(rig, stepList, { gap = 0.1, sampleRate = 60, breathe = true } = {}) {
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
  // NHỊP THỞ nền, chồng lên mọi khung: phần lớn động tác tới dáng đích rồi GIỮ một hai giây, và trong lúc giữ nhân vật
  // là một bức tượng. Ngực phồng xẹp chậm (chu kỳ 3,4 s) và thân đung đưa rất nhẹ (chu kỳ 5,6 s) suốt cả chuỗi; mờ
  // dần ở 0,6 s đầu và cuối để chuỗi vẫn bắt đầu và kết thúc đúng trạng thái của các động tác. `breathe: false` để tắt.
  const breath = keys.indexOf('tho'), sway = keys.indexOf('than');
  if (breathe && breath >= 0 && duration > 1.5) {
    frames.forEach((frame, n) => {
      const time = Math.min(duration, n / sampleRate), fade = Math.min(1, time / 0.6, (duration - time) / 0.6);
      frame[breath] = Math.min(1, frame[breath] + fade * 0.7 * (0.5 - 0.5 * Math.cos(2 * Math.PI * time / 3.4)));
      if (sway >= 0) frame[sway] += fade * 0.7 * Math.sin(2 * Math.PI * time / 5.6);
    });
  }

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
 *             avoid: các rig KHÁC đang có mặt trong cảnh — khung sẽ né để không rig nào bị mép khung cắt
 *             ngang, hoặc đưa hẳn nó vào khung nếu né không được (`timeline.data.subjects` cho biết kết quả).
 *
 * Vị trí tính MỘT LẦN lúc dựng, từ bố cục trang và hình học của rig — nên tua tới đâu cũng ra
 * cùng một khung hình. Máy quay không bám theo nhân vật đang di chuyển.
 */
export function shot(scene, subject, kind = 'face', { duration = 0.6, ease = 'power2.inOut', fill = 0.82, centerY = 0.5, sequence: given, time, frame, avoid = null } = {}) {
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
  let target = { x: 0, y: 0, scale: 1 }, subjects = [];
  if (kind !== 'wide') {
    const rigs = [].concat(subject || []);
    if (!rigs.length || rigs.some((rig) => !rig || typeof rig.shotBox !== 'function')) throw new Error(`[character] shot(scene, subject, "${kind}"): subject must be a rig (createCharacter / createPet …).rig, or an array of rigs`);
    const sequences = [].concat(given || []);
    // Hộp ngắm của một rig trong toạ độ KHUNG HÌNH, ở thời điểm của cảnh quay (và nó có đang hiện không).
    const boxAt = (rig, index, boxKind) => {
      const actions = time === undefined ? null : sequences[index] || (sequences.length === 1 && rigs.length === 1 ? sequences[0] : null) || rig.lastSequence || null;
      const before = actions ? actions.time() : 0;
      if (actions) actions.time(Math.min(time, actions.duration()));
      const box = rig.shotBox(boxKind), shown = rig.s.mo > 0.5;
      if (actions) actions.time(before);
      // Khung của rig (người 400 × 470, thú 400 × 330) nằm vừa trong host, canh giữa.
      const size = rig.constructor.KHUNG, host = place(rig.host), hostWidth = rig.host.offsetWidth, hostHeight = rig.host.offsetHeight;
      const unit = Math.min(hostWidth / size.w, hostHeight / size.h);
      const originX = host.x + (hostWidth - size.w * unit) / 2, originY = host.y + (hostHeight - size.h * unit) / 2;
      return { left: originX + box.x * unit, right: originX + (box.x + box.width) * unit, top: originY + box.y * unit, bottom: originY + (box.y + box.height) * unit, shown };
    };
    // Tính khung cho một CỠ CẢNH: đích phóng + những người đứng cạnh bị mép khung cắt mà không đẩy ra được.
    const frameFor = (shotKind) => {
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    rigs.forEach((rig, index) => {
      const box = boxAt(rig, index, shotKind);
      left = Math.min(left, box.left); right = Math.max(right, box.right); top = Math.min(top, box.top); bottom = Math.max(bottom, box.bottom);
    });
    // Vừa cả chiều cao lẫn bề ngang của vùng ngắm (hai nhân vật đứng xa nhau thì bề ngang quyết định).
    const scale = Math.max(1, Math.min(8, fill * frameHeight / (bottom - top), (rigs.length > 1 ? 0.9 : 1.6) * frameWidth / (right - left)));
    // Canh vùng ngắm vào giữa khung, nhưng không để lộ ra ngoài mép cảnh.
    const within = (value, size) => Math.min(0, Math.max(size - size * scale, value));
    const target = { x: within(frameWidth / 2 - (left + right) / 2 * scale, frameWidth), y: within(frameHeight * centerY - (top + bottom) / 2 * scale, frameHeight), scale };
    // NGƯỜI ĐỨNG CẠNH: một cái đầu (hay con vật) bị mép khung cắt ngang trông như lỗi dựng hình. Với mỗi rig trong
    // `avoid`: nếu nó nằm LƯNG CHỪNG trong khung thì đẩy khung sang cho nó ra hẳn; đẩy không được (chủ thể sẽ bị
    // cắt, hoặc chạm mép cảnh) thì đưa luôn nó vào khung — thành cảnh hai người.
    const crowded = [];
    for (const other of [].concat(avoid || [])) {
      if (rigs.includes(other) || typeof other.shotBox !== 'function') continue;
      // Chỉ xét cái ĐẦU, cả với thú. Đã thử xét cả thân con vật: trong cảnh có con chó đứng giữa hai người, mọi cận
      // cảnh đều phải nới ra ôm cả ba — mất hết cận cảnh. Nửa thân sau lấn vào mép khung thì chấp nhận.
      const box = boxAt(other, -1, 'face');
      if (!box.shown) continue;
      // Hộp mặt là hình vuông quanh cái đầu; tóc buộc / tóc xoã sang bên thì thò ra ngoài nó. Nới ngang mỗi bên một
      // phần tư để một mảng tóc ló vào mép khung cũng được tính là "bị cắt".
      { const hair = (box.right - box.left) * 0.25; box.left -= hair; box.right += hair; }
      const partly = (x) => { const a = box.left * scale + x, b = box.right * scale + x, seen = Math.min(frameWidth, b) - Math.max(0, a); return seen > 0.06 * (b - a) && seen < 0.94 * (b - a); };
      const overlapsY = box.bottom * scale + target.y > 0 && box.top * scale + target.y < frameHeight;
      // Bị mép DƯỚI / TRÊN cắt ngang (con vật đứng thấp hơn khung cận ngực của người): không đẩy khung theo chiều dọc
      // được mà không cắt chủ thể, nên đưa luôn nó vào khung.
      const seenY = Math.min(frameHeight, box.bottom * scale + target.y) - Math.max(0, box.top * scale + target.y), tall = (box.bottom - box.top) * scale;
      const insideX = box.right * scale + target.x > 0 && box.left * scale + target.x < frameWidth;
      if (insideX && seenY > 0.06 * tall && seenY < 0.94 * tall) { crowded.push(other); continue; }
      if (!overlapsY || !partly(target.x)) continue;
      const shifted = within(target.x + ((box.left + box.right) / 2 > (left + right) / 2 ? frameWidth - (box.left * scale + target.x) + 6 : -(box.right * scale + target.x) - 6), frameWidth);
      const keepsSubject = left * scale + shifted >= 0 && right * scale + shifted <= frameWidth;
      if (keepsSubject && !partly(shifted)) target.x = shifted; else crowded.push(other);
    }
    return { target, crowded };
    };
    let framed = frameFor(kind);
    // Có người đứng sát bị mép cắt: thử SIẾT khung lại (cận mặt) trước khi nới ra. Cận mặt hẹp hơn nên người bên cạnh
    // nằm hẳn ngoài khung, và người nói vẫn có một cận cảnh thật — nới ra ôm cả hai thì người nói chỉ còn cao nửa khung.
    if (framed.crowded.length && kind === 'chest' && rigs.length === 1) { const tighter = frameFor('face'); if (!tighter.crowded.length) framed = tighter; }
    target = framed.target;
    const crowded = framed.crowded;
    // Gộp xong thì XÉT LẠI những rig còn lại với khung mới (rộng hơn): bản trước không xét lại, nên con chó đứng cạnh
    // vẫn bị cắt nửa cái đầu ở góc khung hai người.
    if (crowded.length) return shot(scene, [...rigs, ...crowded], kind, { duration, ease, fill, centerY, time, frame, avoid });
    subjects = rigs;
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
  timeline.data = { type: 'character-shot', kind, target, subjects };
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
 *   options   maxChars (0 = không chia; ví dụ 110 = câu dài tự tách thành các cụm khoảng hai dòng) ·
 *             fade (0.15 s hiện / ẩn) · hold (0.3 s giữ chữ sau khi dứt lời) · readable (true: mỗi câu ở lại
 *             đủ lâu để đọc — 0,5 s + 0,3 s mỗi từ, câu cuối ít nhất 3 s) · speaker (false; true
 *             để thêm "Tên: " phía trước) · follow (false; true = BONG BÓNG: đặt phần tử phía trên
 *             đầu người nói bằng left / top — phần tử phải `position: absolute` trong khung hình
 *             và KHÔNG nằm trong danh sách `scene` của máy quay) · offsetY (khoảng hở trên đầu, px)
 *
 * Trả về một timeline (paused). Chữ và độ mờ là HÀM CỦA THỜI GIAN (một tween, tra bảng) nên tua
 * tới đâu cũng ra đúng một khung hình. `timeline.data.lines` giữ danh sách câu.
 */
export function captions(source, element, { fade = 0.15, hold = 0.3, speaker = false, follow = false, offsetY = 12, readable = true, maxChars = 0, avoid = true } = {}) {
  if (!element || element.nodeType !== 1) throw new Error('[character] captions(source, element): element must be the DOM element that shows the text');
  const fromSteps = (steps, rig, shift = 0) => steps.filter((step) => step.text).map((step) => ({ start: step.start + shift, end: step.start + shift + (step.speech ?? step.duration), text: step.text, rig }));
  let lines;
  if (Array.isArray(source)) lines = source.map((line) => ({ ...line }));
  else if (source && Array.isArray(source.turns)) lines = source.turns.flatMap((turn) => fromSteps(turn.steps, turn.rig));
  else if (source && source.data && source.data.type === 'character-sequence') lines = fromSteps(source.data.steps, source.data.rig);
  else throw new Error('[character] captions(source, …): source must be a conversation(), a sequence(), or an array of { start, end, text }');
  lines = lines.filter((line) => line && typeof line.text === 'string' && line.end > line.start).sort((a, b) => a.start - b.start);
  // CHIA CỤM: một câu dài hơn `maxChars` được tách thành nhiều cụm hiện lần lượt (ngắt ở dấu câu nếu được),
  // mỗi cụm chiếm phần thời gian tỉ lệ với độ dài của nó. Không thì cả câu là một khối chữ đứng yên chục giây.
  if (maxChars > 0) lines = lines.flatMap((line) => {
    const parts = [];
    let rest = line.text.trim();
    while (rest.length > maxChars) {
      const head = rest.slice(0, maxChars + 1);
      // Ưu tiên ngắt ở cuối CÂU (. ! ? …), rồi tới dấu phẩy / chấm phẩy — lấy dấu CUỐI CÙNG còn vừa dòng, miễn cụm
      // không ngắn hơn một phần tư dòng. Không ngắt sau dấu hai chấm: "Ba:" mà đứng cuối cụm thì người đọc bị treo.
      let cut = -1;
      for (const marks of [/[.!?…]\s/g, /[;,]\s/g]) {
        for (const mark of head.matchAll(marks)) if (mark.index + 1 >= maxChars * 0.25) cut = mark.index + 1;
        if (cut > 0) break;
      }
      // Không có dấu câu nào trong tầm: ngắt ở khoảng trắng, nhưng CHIA ĐỀU phần còn lại thay vì nhồi đầy dòng —
      // nhồi đầy thì cụm cuối chỉ còn một hai chữ ("…suốt cả" / "ngày, …"), và cụm nào cũng đứt giữa chừng một ý.
      if (cut < 0) {
        // Chia đều trong phạm vi MỆNH ĐỀ hiện tại (tới dấu câu kế tiếp), để chỗ ngắt sau rơi đúng vào dấu câu ấy.
        const clause = rest.slice(maxChars).search(/[.!?…;,]\s/), span = clause < 0 ? rest.length : maxChars + clause + 1;
        const target = span / Math.ceil(span / maxChars);
        for (let at = head.indexOf(' '); at > 0; at = head.indexOf(' ', at + 1)) if (cut < 0 || Math.abs(at - target) < Math.abs(cut - target)) cut = at;
      }
      if (cut <= 0) cut = maxChars;
      parts.push(rest.slice(0, cut).trim()); rest = rest.slice(cut).trim();
    }
    if (rest) parts.push(rest);
    if (parts.length < 2) return [line];
    const total = parts.reduce((sum, part) => sum + part.length, 0), span = line.end - line.start;
    let at = line.start;
    return parts.map((text) => { const piece = { ...line, text, start: at, end: at + span * text.length / total }; at = piece.end; return piece; });
  });
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
  // TRÁNH ĐẦU NHÂN VẬT (`avoid`, chỉ khi nguồn là một `conversation()`): hộp chữ nằm ở một chỗ cố định trong khung
  // hình, còn nhân vật thì di chuyển và máy quay thì phóng — có câu hộp chữ đè đúng lên một cái đầu. Với từng câu:
  // tua các chuỗi động tác và máy quay tới ba thời điểm của câu ấy, đo các cái đầu đang hiện, rồi dời hộp chữ theo
  // chiều DỌC tới chỗ gần nhất không đè lên cái đầu nào (trong vùng an toàn 6–94% chiều cao khung). Không có chỗ thì để yên.
  if (avoid && !follow && source && Array.isArray(source.sequences)) {
    const root = element.closest('[data-composition-id]') || element.offsetParent || element.parentElement;
    const actors = source.sequences.map((item) => item && item.data && item.data.rig).filter((rig) => rig && rig.el && rig.el.dau);
    const reels = [...source.sequences, source.camera].filter(Boolean), before = reels.map((reel) => reel.time());
    const wasText = slot.textContent, wasOpacity = element.style.opacity;
    element.style.translate = 'none';
    for (const line of lines) {
      slot.textContent = label(line);
      const frame = root.getBoundingClientRect(), box = element.getBoundingClientRect(), ratio = frame.height / (root.offsetHeight || frame.height) || 1;
      // Các cái đầu đang hiện trong khung ở một thời điểm (đã tính cả máy quay).
      const headsAt = (time) => {
        reels.forEach((reel) => reel.time(Math.max(0, Math.min(time, reel.duration()))));
        const found = [];
        for (const rig of actors) { if (rig.s.mo < 0.5) continue; const head = rig.el.dau.getBoundingClientRect(); if (head.width > 0 && head.right > frame.left && head.left < frame.right) found.push(head); }
        return found;
      };
      const pad = 6 * ratio, over = (list, shift) => list.some((head) => head.right > box.left - pad && head.left < box.right + pad && head.bottom > box.top + shift - pad && head.top < box.bottom + shift + pad);
      // Đo cả lúc hộp chữ BẮT ĐẦU HIỆN (trước khi câu nói bắt đầu một nhịp `fade`): khi ấy máy quay còn đang ở cảnh
      // trước, chưa phóng vào người nói — cái đầu nằm ở chỗ khác hẳn so với giữa câu.
      // Quãng ĐẦU câu (từ lúc hộp chữ bắt đầu hiện tới khi máy quay phóng xong, ~0,4 s sau khi câu bắt đầu) đo dày,
      // mỗi 0,08 s: máy quay đang chạy nên cái đầu lướt qua nhiều chỗ. Phần còn lại của câu đo ba điểm.
      const settle = Math.min(line.start + 0.4, (line.start + line.end) / 2), leadTimes = [];
      for (let time = line.start - fade; time < settle; time += 0.08) leadTimes.push(time);
      const leadHeads = leadTimes.map(headsAt), lead = leadHeads.flat(), during = [settle, (line.start + line.end) / 2, line.end - 0.1].flatMap(headsAt);
      const hits = (shift) => over(lead, shift) || over(during, shift);
      if (!hits(0)) continue;
      // Vùng được dời tới: 6–94% chiều cao; khung DỌC thì 12–78% — phần dưới cùng của video dọc thường bị giao diện
      // của nền tảng che (tên kênh, nút bấm).
      const portrait = frame.height > frame.width, step = frame.height * 0.02;
      const low = frame.top + frame.height * (portrait ? 0.12 : 0.06), high = frame.bottom - frame.height * (portrait ? 0.22 : 0.06);
      for (let n = 1; n <= 22 && line.shift === undefined; n++) for (const shift of [n * step, -n * step]) {
        if (box.top + shift < low || box.bottom + shift > high || hits(shift)) continue;
        line.shift = shift / ratio; break;
      }
      // Không có chỗ nào trống suốt cả câu, nhưng chỉ vướng ở LÚC ĐẦU (máy quay còn đang phóng vào): cho hộp chữ hiện
      // MUỘN hơn một chút, khi máy quay đã tới nơi — tối đa một giây, và không quá nửa câu.
      if (line.shift === undefined && !over(during, 0)) {
        // Hiện từ mẫu đầu tiên mà kể từ đó không còn mẫu nào vướng.
        let clear = leadTimes.length;
        while (clear > 0 && !over(leadHeads[clear - 1], 0)) clear--;
        const wait = (clear < leadTimes.length ? leadTimes[clear] : settle) + fade - line.start;
        if (wait > 0 && wait <= Math.min(1, (line.end - line.start) / 2)) line.start += wait;
      }
    }
    reels.forEach((reel, index) => reel.time(before[index]));
    slot.textContent = wasText; element.style.opacity = wasOpacity;
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
        // Dời bằng thuộc tính CSS `translate`, KHÔNG ghi `transform`: hộp chữ thường được canh giữa bằng
        // `transform: translateX(-50%)` trong stylesheet — ghi đè nó là hộp chữ nhảy sang phải nửa bề ngang.
        else if (!follow && avoid) element.style.translate = line.shift ? `0 ${line.shift.toFixed(1)}px` : 'none';
      }
    }
    const opacity = !line ? 0 : Math.max(0, Math.min(1, (time - (line.start - fade)) / fade, (line.end + hold + fade - time) / fade));
    element.style.opacity = opacity.toFixed(3);
  };
  const playhead = { _time: 0, get time() { return this._time; }, set time(value) { this._time = value; show(value); } };
  const timeline = gsap.timeline({ paused: true, defaults: { lazy: false } });
  timeline.to(playhead, { time: total, duration: total, ease: 'none' }, 0);
  timeline.data = { type: 'character-captions', lines: lines.map(({ start, end, text, rig, shift }) => ({ start, end, text, character: rig ? rig.publicId || '' : '', shift: shift || 0 })) };
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
 * đầu sau `leadIn` giây (0.6) chứ không phải ở khung hình đầu. Sau một câu nói, lượt kế bắt đầu ngay khi dứt
 * lời (gối lên quãng người nói thu tay về); `overlap: false` để chờ hết. Trong lúc chờ tới lượt, nhân vật
 * THỞ và chớp mắt (`idle`) thay vì đứng hình — `waiting: false` để tắt.
 *
 * Trả về { sequences, turns, duration, addTo, of }:
 *   sequences   mỗi nhân vật một timeline `sequence()` (cùng thứ tự xuất hiện)
 *   turns       [{ rig, character, start, end, steps: [{ name, start, duration }] }] — giờ tuyệt đối
 *   addTo(timeline, at = 0)   thêm mọi chuỗi vào timeline của composition
 *   of(rig)     chuỗi của một nhân vật
 */
export function conversation(turnList, { gap = 0.25, waiting = true, stepGap = 0.1, camera = null, leadIn = 0.6, overlap = true } = {}) {
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
  let lastLine = null;                                     // câu nói kết thúc lượt trước: { rig, start }
  turnList.forEach((entry, index) => {
    // Một mục: [rig, ...bước] · { together: [[rig, …], …] } · { turn: [rig, …], shot } (ghi đè máy quay cho lượt ấy)
    const override = entry && !Array.isArray(entry) && 'shot' in entry ? entry.shot : undefined;
    if (entry && !Array.isArray(entry) && Array.isArray(entry.turn)) entry = entry.turn;
    const parallel = entry && !Array.isArray(entry) && Array.isArray(entry.together) ? entry.together : [entry];
    // Lượt KHÔNG LỜI mở đầu bằng `enter` (con vật chạy vào, ai đó bước vào rồi mới làm gì đó), ngay sau câu nói của
    // người khác: cho bắt đầu sớm tới 1,2 s — nhân vật xuất hiện khi người kia đang nói nốt câu. Chờ dứt lời rồi mới
    // cho vào thì cả quãng đi vào là một khoảng lặng (đo được: hơn sáu giây khi con mèo chạy vào rồi kêu).
    let begin = clock;
    if (overlap && lastLine && parallel.length === 1) {
      const only = parallel[0] && !Array.isArray(parallel[0]) && Array.isArray(parallel[0].turn) ? parallel[0].turn : parallel[0];
      const names = Array.isArray(only) ? only.slice(1).map((step) => (Array.isArray(step) ? step[0] : step)) : [];
      if (names[0] === 'enter' && !names.some((name) => SPEECH_STEPS.includes(name)) && only[0] !== lastLine.rig) begin = Math.max(lastLine.start + 0.5, clock - 1.2);
    }
    const moved = [];
    let finish = begin, spokeLast = null;
    for (let turn of parallel) {
      // Lượt bên trong `together` cũng có thể mang `shot` riêng: { turn: [rig, …], shot }.
      let own = override;
      if (turn && !Array.isArray(turn) && Array.isArray(turn.turn)) { if ('shot' in turn) own = turn.shot; turn = turn.turn; }
      if (!Array.isArray(turn) || !turn[0] || typeof turn[0].shotBox !== 'function' || turn.length < 2) throw new Error(`[character] conversation: turn ${index + 1} must be [rig, ...steps], { turn: [rig, ...steps], shot }, or { together: [ …such turns ] }`);
      const [rig, ...written] = turn, mine = part(rig);
      // `face`, `handOver`, `take`, `stroke` nhận một NHÂN VẬT KHÁC làm đích: thay bằng mỏ neo (xem `anchor`).
      const steps = written.map((step) => (Array.isArray(step) && ['face', 'handOver', 'take', 'stroke'].includes(step[0]) && step[1] && step[1] !== rig && typeof step[1].centerX === 'function' && !step[1].live
        ? [step[0], anchor(step[1]), ...step.slice(2)] : step));
      // Chờ tới giờ bắt đầu lượt: thở cho tới gần lúc đó, rồi một quãng nghỉ số cho khít từng phần trăm giây.
      const first = !mine.used, lead = first ? 0 : stepGap;       // sau mỗi bước `sequence` tự chèn `stepGap`
      let wait = begin - mine.end - lead;
      // Cùng một nhân vật nói hai lượt liền nhau: lượt sau bắt đầu ngay khi lượt trước của CHÍNH NÓ xong hẳn
      // (đồng hồ chung đã chạy sớm hơn một chút vì lượt kế được phép gối lên quãng "về chỗ" — xem bên dưới).
      if (wait < 0) wait = 0;
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
      // Lượt kết thúc bằng một CÂU NÓI: người kế tiếp được bắt đầu ngay khi dứt lời, không chờ hết 0,55 s người
      // nói thu tay về — hai người đối đáp thì gối nhau như thế; chờ đủ thì mỗi câu thêm một quãng im.
      const last = real[real.length - 1];
      finish = Math.max(finish, mine.end - (overlap && last && SPEECH_STEPS.includes(last.name) ? SPEECH_SETTLE : 0));
      spokeLast = last && SPEECH_STEPS.includes(last.name) ? { rig, start: last.start } : null;
      turns.push({ rig, character: rig.publicId || '', start: real.length ? real[0].start : begin, end: mine.end, steps: real, shot: own });
    }
    // Vị trí mới chỉ có hiệu lực SAU lượt này: các lượt diễn cùng lúc đều thấy nhau ở chỗ cũ.
    for (const [mine, centre] of moved) mine.centre = centre;
    clock = Math.max(clock, finish + gap);                   // lượt vào sớm không được kéo đồng hồ chung lùi lại
    lastLine = parallel.length === 1 ? spokeLast : null;
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
    let inFrame = [];                                             // các nhân vật mà cảnh quay hiện tại đang ôm
    for (const turn of turns) {
      const spoken = turn.steps.filter((step) => SPEECH_STEPS.includes(step.name));
      const from = spoken.length ? spoken[0].start : turn.start, until = spoken.length ? spoken[spoken.length - 1].start + spoken[spoken.length - 1].speech : turn.end;
      // Lượt `shot: false` giữ nguyên máy quay — nhưng lời của nó vẫn tính khi quyết định lúc nào về toàn cảnh.
      if (spoken.length) lastWords = Math.max(lastWords, until);
      // Lượt có BƯỚC VÀO / BƯỚC RA: người ấy đi ngang qua cả cảnh, nên lùi về toàn cảnh ngay khi họ bắt đầu đi —
      // cận cảnh của người khác mà có một cái đầu lướt ngang mép khung thì rất khó hiểu.
      // `walk` cũng tính: nhân vật đi sang chỗ khác thì cận cảnh đang ghì vào chỗ cũ sẽ cắt ngang người rồi còn lại khung trống.
      const crossing = turn.steps.find((step) => ['enter', 'exit', 'walk', 'walkForward', 'walkAway'].includes(step.name));
      const goWide = (at) => { cameraTimeline.add(shot(scene, null, 'wide', { duration: move }).paused(false), Math.max(0, at - lead)); aimed = 'wide'; inFrame = []; };
      // Bước đi diễn ra TRƯỚC lời của lượt (bước vào rồi mới nói): lùi ngay bây giờ. Bước đi SAU lời (nói xong rồi bước
      // ra) thì lùi sau khi đã đặt cảnh cận cho câu nói — xem cuối vòng lặp. Bản trước chỉ có nhánh đầu, và bỏ qua nó
      // khi máy quay đang ở toàn cảnh: người nói xong bước ra, máy quay vẫn ghì cận vào chỗ trống.
      const walksFirst = crossing && (!spoken.length || crossing.start <= from);
      if (walksFirst && turn.shot === undefined && aimed && aimed !== 'wide') goWide(crossing.start);
      // Lượt KHÔNG LỜI (con chó sủa, ai đó reo mừng) mà người diễn đang nằm ngoài cảnh cận hiện tại: lùi
      // về toàn cảnh cho khán giả thấy. Người diễn đang ở trong khung thì máy quay đứng yên.
      // Lượt không lời có động tác VƯƠN TỚI người / vật khác (đưa đồ, nhận đồ, vuốt ve): cận cảnh của một người thì
      // không thấy bàn tay và bên kia — về toàn cảnh.
      // Cả `write`: viết vào bìa kẹp diễn ra ngang bụng, cận mặt thì không thấy gì.
      const reaching = turn.steps.find((step) => ['handOver', 'take', 'stroke', 'write'].includes(step.name));
      if (reaching && !spoken.length && turn.shot === undefined && aimed && aimed !== 'wide') goWide(reaching.start);
      if (!spoken.length && turn.shot === undefined) {
        if (aimed && aimed !== 'wide' && !inFrame.includes(turn.rig)) {
          cameraTimeline.add(shot(scene, null, 'wide', { duration: move }).paused(false), Math.max(0, turn.start - lead));
          aimed = 'wide'; inFrame = [];
        }
        continue;
      }
      if (turn.shot === false) continue;
      // Ghi đè: 'wide' · một cỡ cảnh · { subject, kind } · một mảng rig (đưa tất cả vào khung).
      const choice = turn.shot === undefined ? {} : typeof turn.shot === 'string' ? { kind: turn.shot } : Array.isArray(turn.shot) || (turn.shot && turn.shot.shotBox) ? { subject: turn.shot } : turn.shot;
      const shotKind = choice.kind || kind, subject = choice.subject || turn.rig;
      const key = shotKind === 'wide' ? 'wide' : [].concat(subject).map((rig) => rigs.indexOf(rig)).join('+') + ':' + shotKind;
      if (key !== aimed) {
        const at = Math.max(0, from - lead);
        cameraTimeline.add(shot(scene, shotKind === 'wide' ? null : subject, shotKind, { time: Math.min(from + 0.5, until), duration: move, ...framing, avoid: rigs }).paused(false), at);
        const made = cameraTimeline.getChildren(false, false, true).pop();
        aimed = key; inFrame = shotKind === 'wide' ? [] : (made && made.data && made.data.subjects) || [].concat(subject);
      }
      lastWords = Math.max(lastWords, until);
      // Nói xong rồi BƯỚC RA (hoặc đi ngang cảnh): lùi về toàn cảnh đúng lúc bắt đầu đi.
      if (crossing && !walksFirst && turn.shot === undefined && aimed !== 'wide') goWide(crossing.start);
      // Nói xong rồi mới VƯƠN TAY / GHI CHÉP trong cùng lượt: cũng lùi về toàn cảnh lúc động tác ấy bắt đầu.
      if (reaching && reaching.start >= until - 0.05 && turn.shot === undefined && aimed !== 'wide') goWide(reaching.start);
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
