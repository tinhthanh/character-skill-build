// schema.js — TỪ ĐIỂN giữa lược đồ CÔNG KHAI (tiếng Anh) và lược đồ NỘI BỘ của hai bộ rig.
//
// Hai bộ rig (`rig-svg.js`, `rig-thu.js`) được viết với khoá tiếng Việt và giữ nguyên như
// thế bên trong. Mọi thứ người dùng thư viện chạm tới — định nghĩa nhân vật, bảng màu, bộ
// số (config), tư thế nghỉ, trạng thái — đi qua tệp này để mang tên tiếng Anh. `index.js`
// là nơi duy nhất gọi các hàm dịch ở đây; mã nội bộ không biết gì về lược đồ công khai.
//
// Quy ước của mỗi bảng: KHOÁ là tên công khai, GIÁ TRỊ là tên nội bộ.

/** Khoá cấp một của một định nghĩa nhân vật người. */
export const DEFINITION_KEYS = {
  name: 'ten', colors: 'mau', restPose: 'nghi',
  // hình vẽ
  hair: 'toc', hat: 'mu', eye: 'mat', nose: 'mui', faceExtras: 'net', beard: 'beard',
  top: 'ao', sideShading: 'suon', sideShadingOpacity: 'damSuon', collar: 'coAo',
  accessories: 'phuKien', shoulderAccessories: 'phuKienTren', shoes: 'giay',
  // công tắc
  longSleeves: 'tayDai', backSkullColor: 'mauSoSau', backHair: 'backHair', stoop: 'stoop', skirt: 'skirt',
  heldItemL: 'heldItemL', heldItemR: 'heldItemR', badgeText: 'huyHieu', extrasFollowEyes: 'netTheoMat',
  outlineWidth: 'vienRong',
  // tỉ lệ
  headSize: 'coDau', neckDrop: 'dauLech', torsoScale: 'coThan', legScale: 'coChan', torsoWidth: 'torsoWidth',
  upperArmLength: 'daiCanhTay', forearmLength: 'daiCangTay', armThickness: 'dayTay', handSize: 'coBanTay',
  thighLength: 'daiDui', shinLength: 'daiOng', legThickness: 'dayChan', legGap: 'cachChan', footSize: 'coBanChan',
  // tay áo
  sleeveLength: 'daiTayAo', sleeveSlant: 'xeoTayAo', sleeveFlare: 'rongTayAo', sleeveHemWidth: 'vienGau',
  sleeveCornerRadius: 'boGocTayAo', sleeveHemColor: 'mauGau', sleeveHemDash: 'netGau', sleeveHemInset: 'lechGau',
  // khuôn mặt
  faceShape: 'khuon', brows: 'may', browSpacing: 'mayX', browY: 'mayY',
  eyeSpacing: 'matX', eyeY: 'matY', eyeSize: 'matCo', noseOffsetY: 'muiY', noseSize: 'muiCo',
  mouthY: 'miengY', mouthWidth: 'miengRong', lipWidth: 'moiRong',
  cheekX: 'maX', cheekY: 'maY', cheekRadius: 'maRong', earX: 'taiX',
  // dịch chuyển khi xoay đầu
  featureTurnShift: 'netLech', hairTurnShift: 'tocLech', bunTurnShift: 'buiLech',
};

/** Các khoá lồng nhau: khoá CÔNG KHAI của nhóm → bảng dịch khoá con. */
export const FACE_SHAPE_KEYS = {
  halfWidth: 'rong', crownHeight: 'cao', chinLength: 'cam', widestY: 'yRong',
  foreheadSquareness: 'tranVuong', jawSquareness: 'hamVuong', foreheadWidth: 'rongTran', chinWidth: 'rongCam',
};
export const BROW_KEYS = { halfLength: 'dai', thickness: 'day', arch: 'cong', taper: 'thon', slant: 'xech' };

/** Bảng màu — người và thú dùng chung một từ điển (khoá lạ đi qua nguyên vẹn). */
export const COLOR_KEYS = {
  skin: 'da', skinShadow: 'daToi', hair: 'toc', hairHighlight: 'tocSang',
  top: 'ao', topShadow: 'aoToi', trousers: 'quan', shoes: 'giay',
  iris: 'mat', lips: 'mieng', cheeks: 'ma', accent: 'phuKien',
  outline: 'vien', lineStroke: 'vienNet', brows: 'may', mouthInside: 'miengToi', tongue: 'luoi', teeth: 'rang',
  hat: 'mu', hatHighlight: 'muSang', innerShirt: 'aoTrong', stethoscope: 'ongNghe',
  buttons: 'cuc', tie: 'caVat', drawstrings: 'day',          // `skirt` (màu váy / tạp dề) đi qua nguyên vẹn
  // thú
  fur: 'long', furLight: 'longSang', furDark: 'longToi', stripes: 'dom', nose: 'mui',
  collar: 'vongCo', tag: 'the', earInner: 'taiTrong',
};

/** Trạng thái của rig NGƯỜI (cũng là khoá của tư thế nghỉ). */
export const PERSON_STATE_KEYS = {
  x: 'x', y: 'y', opacity: 'mo', scale: 'co', facing: 'huong',
  lean: 'than', breath: 'tho', shoulders: 'vai',
  headTilt: 'dau', headX: 'dauX', headY: 'dauY',
  upperArmL: 'batL', upperArmR: 'batR', forearmL: 'cangL', forearmR: 'cangR', armSwingL: 'vungL', armSwingR: 'vungR',
  thighL: 'duiL', thighR: 'duiR', shinL: 'ongL', shinR: 'ongR', kneeLiftL: 'nhacL', kneeLiftR: 'nhacR', seat: 'seat',
  eyesClosed: 'matY', lookX: 'nhinX', lookY: 'nhinY', browL: 'mayL', browR: 'mayR',
  mouthOpen: 'mieng', pucker: 'chum', smile: 'cuoi', handL: 'tayL', handR: 'tayR', itemL: 'itemL', itemR: 'itemR',
};

/** Trạng thái của rig THÚ (bốn chân dùng tên nội bộ tn/tx/sn/sx — hiếm khi cần chạm tới). */
export const PET_STATE_KEYS = {
  x: 'x', y: 'y', opacity: 'mo', scale: 'co', facing: 'huong',
  sit: 'ngoi', breath: 'tho', chestX: 'truocX', chestY: 'truocY', hipX: 'sauX', hipY: 'sauY',
  arch: 'cong', puff: 'xu', headTilt: 'dau', headX: 'dauX', headY: 'dauY', earL: 'taiL', earR: 'taiR',
  eyesClosed: 'matY', lookX: 'nhinX', lookY: 'nhinY', pupil: 'dongTu',
  mouthOpen: 'mieng', tongue: 'luoi', smile: 'cuoi', tail: 'duoi', tailCurl: 'duoiCong',
};

/** Giá trị của hai khoá bàn tay. */
export const HAND_SHAPES = { relaxed: 'mo', fist: 'nam', thumb: 'cai', point: 'chi' };

/**
 * Bộ số (config) của nhân vật người: nhóm công khai → [nhóm nội bộ, bảng dịch khoá con].
 * `restPose` và `colors` có bảng dịch riêng; `null` ở đây nghĩa là "xem hàm dịch".
 */
const pick = (table, names) => Object.fromEntries(names.map((n) => [n, table[n]]));
export const CONFIG_GROUPS = {
  proportions: ['than', pick(DEFINITION_KEYS, ['neckDrop', 'headSize', 'torsoScale', 'legScale'])],
  arms: ['tay', { ...pick(DEFINITION_KEYS, ['upperArmLength', 'forearmLength', 'armThickness', 'handSize']), restUpperArm: 'batNghi', restForearm: 'cangNghi' }],
  sleeves: ['tayAo', pick(DEFINITION_KEYS, ['sleeveLength', 'sleeveSlant', 'sleeveFlare', 'sleeveHemWidth', 'sleeveCornerRadius'])],
  legs: ['chan', pick(DEFINITION_KEYS, ['thighLength', 'shinLength', 'legThickness', 'legGap', 'footSize'])],
  faceShape: ['khuon', FACE_SHAPE_KEYS],
  brows: ['may', BROW_KEYS],
  browPosition: ['viTriMay', pick(DEFINITION_KEYS, ['browSpacing', 'browY'])],
  posture: ['dang', { stoop: 'stoop', skirtLength: 'skirtLength', skirtFlare: 'skirtFlare' }],
  features: ['net', pick(DEFINITION_KEYS, ['eyeSpacing', 'eyeY', 'eyeSize', 'noseOffsetY', 'noseSize', 'mouthY', 'mouthWidth'])],
};

/** Hình dáng của thú — tên công khai đã là tên nội bộ (mã mới), liệt kê để kiểm config. */
export const PET_SHAPE_KEYS = ['headSize', 'bodyLength', 'bodyThickness', 'legLength', 'tailLength', 'tailCurl', 'earSize'];

/**
 * ID phần tử BẮT BUỘC trong hình vẽ của người viết nhân vật: hậu tố công khai → hậu tố nội bộ.
 * Người viết ghi `id="${p}-hair-front"`; thư viện đổi thành id mà rig tìm.
 */
export const REQUIRED_IDS = [
  ['hair-front', 'tocTruoc'], ['hair-bun', 'tocBui'],
  ['eye-L', 'matL'], ['eye-R', 'matR'], ['pupil-L', 'nguoiL'], ['pupil-R', 'nguoiR'],
  ['accessories', 'phuKien'], ['shoe-L', 'banL'], ['shoe-R', 'banR'],
];

/* ───────────────────────────────────────────────────────────── hàm dịch */

const invert = (table) => Object.fromEntries(Object.entries(table).map(([pub, internal]) => [internal, pub]));
const INTERNAL = {
  definition: invert(DEFINITION_KEYS), faceShape: invert(FACE_SHAPE_KEYS), brows: invert(BROW_KEYS),
  colors: invert(COLOR_KEYS), personState: invert(PERSON_STATE_KEYS), petState: invert(PET_STATE_KEYS),
  hands: invert(HAND_SHAPES),
};

// Đổi tên khoá theo bảng; khoá không có trong bảng đi qua nguyên vẹn.
const renameKeys = (object, table) => (object && typeof object === 'object' && !Array.isArray(object)
  ? Object.fromEntries(Object.entries(object).map(([k, v]) => [table[k] || k, v])) : object);

export const colorsToInternal = (colors) => renameKeys(colors, COLOR_KEYS);
export const colorsToPublic = (colors) => renameKeys(colors, INTERNAL.colors);

const handToInternal = (v) => HAND_SHAPES[v] || v;
const handToPublic = (v) => INTERNAL.hands[v] || v;
export function stateToInternal(state, pet = false) {
  const out = renameKeys(state, pet ? PET_STATE_KEYS : PERSON_STATE_KEYS);
  if (out && !pet) for (const k of ['tayL', 'tayR']) if (k in out) out[k] = handToInternal(out[k]);
  return out;
}
export function stateToPublic(state, pet = false) {
  const out = renameKeys(state, pet ? INTERNAL.petState : INTERNAL.personState);
  if (out && !pet) for (const k of ['handL', 'handR']) if (k in out) out[k] = handToPublic(out[k]);
  return out;
}

// Bọc một hàm vẽ: đổi các id công khai trong chuỗi SVG nó trả về sang id nội bộ.
const WRAPPED = Symbol('character.wrappedSlot');
function wrapDrawing(fn) {
  if (typeof fn !== 'function' || fn[WRAPPED]) return fn;
  const wrapped = (...args) => {
    let svg = fn(...args);
    if (typeof svg !== 'string') return svg;
    for (const [pub, internal] of REQUIRED_IDS) svg = svg.split(`-${pub}"`).join(`-${internal}"`).split(`-${pub}'`).join(`-${internal}'`);
    return svg;
  };
  wrapped[WRAPPED] = true;
  return wrapped;
}
// Mắt và giày vẽ theo từng bên: người viết ghi `id="${p}-eye-${side}"`, nên id chỉ lộ ra sau
// khi hàm chạy — vì thế phải đổi id trên KẾT QUẢ của hàm chứ không đổi trên mã nguồn.
export const DRAWING_SLOTS = ['toc', 'mu', 'mat', 'mui', 'net', 'beard', 'coAo', 'phuKien', 'phuKienTren', 'giay', 'heldItemL', 'heldItemR'];

/** Định nghĩa nhân vật: công khai → nội bộ. Khoá lạ (kể cả khoá nội bộ) đi qua nguyên vẹn. */
export function definitionToInternal(definition) {
  const out = {};
  for (const [key, value] of Object.entries(definition)) {
    const k = DEFINITION_KEYS[key] || key;
    if (k === 'mau') out[k] = colorsToInternal(value);
    else if (k === 'nghi') out[k] = stateToInternal(value);
    else if (k === 'khuon') out[k] = renameKeys(value, FACE_SHAPE_KEYS);
    else if (k === 'may') out[k] = renameKeys(value, BROW_KEYS);
    else out[k] = value;
  }
  for (const slot of DRAWING_SLOTS) if (slot in out) out[slot] = wrapDrawing(out[slot]);
  return out;
}

/** Định nghĩa nhân vật: nội bộ → công khai. Dùng để đưa nhân vật GỐC cho người viết nhân vật mới. */
export function definitionToPublic(definition) {
  const out = {};
  for (const [key, value] of Object.entries(definition)) {
    const k = INTERNAL.definition[key] || key;
    if (key === 'mau') out[k] = colorsToPublic(value);
    else if (key === 'nghi') out[k] = stateToPublic(value);
    else if (key === 'khuon') out[k] = renameKeys(value, INTERNAL.faceShape);
    else if (key === 'may') out[k] = renameKeys(value, INTERNAL.brows);
    else if (key === 'mauSoSau') out[k] = INTERNAL.colors[value] || value;      // tên màu cũng đổi sang tên công khai
    else out[k] = value;
  }
  return out;
}

/** Bộ số: công khai → nội bộ. Không kiểm tra gì — `validateConfig` làm việc đó trước. */
export function configToInternal(config, pet = false) {
  if (!config) return config;
  const out = {};
  for (const [group, value] of Object.entries(config)) {
    if (group === 'colors') out.mau = colorsToInternal(value);
    else if (group === 'restPose') out.nghi = stateToInternal(value, pet);
    else if (pet && group === 'shape') out.shape = { ...value };
    else if (CONFIG_GROUPS[group]) out[CONFIG_GROUPS[group][0]] = renameKeys(value, CONFIG_GROUPS[group][1]);
    else out[group] = value;
  }
  return out;
}

/** Bộ số: nội bộ → công khai (studio dùng khi lưu). */
export function configToPublic(config, pet = false) {
  if (!config) return config;
  const groups = Object.fromEntries(Object.entries(CONFIG_GROUPS).map(([pub, [internal, table]]) => [internal, [pub, invert(table)]]));
  const out = {};
  for (const [group, value] of Object.entries(config)) {
    if (group === 'mau') out.colors = colorsToPublic(value);
    else if (group === 'nghi') out.restPose = stateToPublic(value, pet);
    else if (groups[group]) out[groups[group][0]] = renameKeys(value, groups[group][1]);
    else out[group] = value;
  }
  return out;
}
