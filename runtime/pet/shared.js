// runtime/pet/shared.js — module-level constants and helpers of `RigThu` (split out of runtime/rig-thu.js).
// Every name is exported: the core class (runtime/rig-thu.js) and the action groups next to this file import what they use.

import { MARKS, freshMark, attachMark, drawMark, markTweens, markOff } from '../marks.js';
import { attachShade, outlinePoints } from '../shading.js';


const KHUNG = { w: 400, h: 330 };
// DÁNG NẰM: hạ vai và hông xuống sát nền — chân tự gập nhờ IK — chân trước duỗi ra trước, chân sau thu vào. `nam` là
// THẾ GIỮ (như `ngoi`): đang nằm thì mọi động tác khép về dáng này chứ không về dáng đứng.
const LIE = { truocY: 48, sauY: 44, tnX: 46, txX: 46, snX: -8, sxX: -8 };
// DÁNG ĐƯỢC BẾ: thân gọn, chân trước GẬP dưới ngực, chân sau thu vào, đầu ngẩng nhìn ra. Dùng dáng nằm dưới sàn (chân
// trước duỗi) thì trong vòng tay con vật như đang trượt ra khỏi tay người bế.
const HELD = { truocY: 30, sauY: 38, tnX: -4, txX: 2, snX: -10, sxX: -10, dauY: -4 };
const DAT = 292;                                   // cao độ mặt nền

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const RAD = Math.PI / 180;
const mem = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const pha = (a, b, k) => a + (b - a) * k;
let ngau = Math.random;
// Trạng thái của dãy đã gieo (null = đang dùng Math.random) — `luuNgau` / `traNgau` chụp và trả lại nó, để một lần
// dựng NHÁP (sequence() dựng thử mỗi động tác) không ăn mất số ngẫu nhiên của lần dựng thật.
let hatHienTai = null;
const gieoHat = (hat) => {
  if (hat === null || hat === undefined) { ngau = Math.random; hatHienTai = null; return; }
  hatHienTai = hat >>> 0;
  ngau = () => { hatHienTai = (hatHienTai + 0x6D2B79F5) >>> 0; let t = hatHienTai; t = Math.imul(t ^ (t >>> 15), t | 1);
                 t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
const nhieu = (a, b) => a + ngau() * (b - a);
const chinhSang = (c, k) => {
  const n = parseInt(c.replace('#', ''), 16);
  const v = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((u) => (k < 0 ? u * (1 + k) : u + (255 - u) * k));
  return '#' + v.map((u) => Math.round(clamp(u, 0, 255)).toString(16).padStart(2, '0')).join('');
};

// Màu trong bảng màu phải là mã hex (#rgb hoặc #rrggbb), hoặc null với khoá cho phép tắt
// (vd. `vien`). Tên màu CSS như 'red' KHÔNG dùng được: các màu tối/sáng đi kèm được tính
// bằng số học trên mã hex, tên màu sẽ ra NaN và hỏng hình mà không báo gì.
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
function assertColors(palette, where) {
  const bad = Object.entries(palette).filter(([, v]) => v !== null && !(typeof v === 'string' && HEX_COLOR.test(v)));
  if (bad.length) throw new Error(`[character] ${where}: colours must be hex (#rgb / #rrggbb) — invalid: ${bad.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')}`);
}

const NGHI = Object.freeze({
  x: 0, y: 0, mo: 1, co: 1, huong: 1,
  ngoi: 0, nam: 0, tho: 0, truocX: 0, truocY: 0, sauX: 0, sauY: 0, cong: 0, xu: 0,
  dau: 0, dauX: 0, dauY: 0, taiL: 0, taiR: 0,
  matY: 0, nhinX: 0, nhinY: 0, dongTu: 1, mieng: 0, luoi: 0, cuoi: 0.4,
  lanh: 0, nhan: 0, nanh: 0,
  duoi: 0, duoiCong: 0,
  nuoc: 0,                 // 0…1 các giọt nước văng ra quanh thân (`shakeOff`)
  ballMouth: 0,            // 1 = ngậm quả bóng (`fetch`)
  // ĐỢT 40 A — đồ chơi trong mõm (`toy`: 0 không, 1 dây thừng, 2 khúc xương — `carryToy`, `tugOfWar`), đồ chơi đã nhả xuống sàn (`toyF`: loại, `toyFA`: độ hiện,
  // `toyFX`: chỗ), tiếng tru (`howl` 0…1, `howlT` pha sóng), đất bới văng ra sau (`dirtA` 0…1, `dirt` pha — mỗi 1 là một lượt cục đất bay hết quãng).
  toy: 0, toyF: 0, toyFA: 0, toyFX: 0, howl: 0, howlT: 0, dirtA: 0, dirt: 0,
  tnX: 0, tnY: 0, tnNhac: 0, tnGoc: 0, txX: 0, txY: 0, txNhac: 0, txGoc: 0,
  snX: 0, snY: 0, sxX: 0, sxY: 0,
  lan: 0,                  // 0…1 LĂN NGỬA (`rollOver`): thân, chân, đuôi lật úp lên trời, lưng chạm sàn — đầu vẫn ngửa mặt ra người xem
  // ĐỢT 40 B — mèo & thỏ: các kênh mới (đều về 0 khi nghỉ)
  phong: 0,                // 0…1 LÔNG DỰNG (`archBack`): viền lông xù răng cưa quanh lưng, đuôi xù thêm
  nghieng: 0,              // độ NGHIÊNG cả con vật quanh chân (dương = ngửa mũi lên, theo hướng đang quay) — `binky` xoay mình, `flop` ngã nghiêng
  yarn: 0, toyX: 0, toyY: 0, toyR: 0,   // đợt 40 B: `yarn` (không phải `toy` — kênh đồ chơi chó ngậm của đợt 40 A) — cuộn len (`batToy`): hiện 0…1, cách tâm thân (đơn vị khung, + = phía đầu), cao khỏi sàn, góc lăn (độ)
  box: 0, boxX: 0,         // hộp các-tông (`sitInBox`): cỡ 0…1 (>1 là nảy), dời ngang so với tâm khung
  gp: 0,                   // 0…1 bàn chân trước gần vẽ ĐÈ LÊN mặt (`groomFace`): chân đang quệt qua má, tai
  nose: 0, ria: 0, twitch: 0,   // thỏ (`noseTwitch`): mũi giật 0…1, ria hất (độ), độ rõ 0…1 (ria dày lên, mũi to ra)
  flop: 0,                 // THẾ GIỮ (như `nam`): thỏ nằm vật ra, bốn chân duỗi — `standUp` để dậy
  rise: 0,                 // NÂNG CẢ CON VẬT LẪN BÓNG (đơn vị khung, dương = lên) — xa máy hơn trên sàn, không phải nhảy (đợt 35, lượt ba)
  spin: 0, spinA: 0, spinX: 0, spinR: 0,   // VỆT CHẠY VÒNG (đợt 35, lượt ba — `chaseTail`): độ hiện, góc hiện tại (rad), tâm (x khung), bán kính (dấu = hướng)
  sua: 0,                  // 0…1 VẠCH TIẾNG SỦA trước mõm (`bark`, đợt 35, lượt bốn) — tiếng sủa thấy được trên hình
  // ĐỢT 40 C — thú ở phòng khám
  vung: 0,                 // −1…1 cú giật khi vùng vẫy (`struggle`): người đang BẾ đọc nó mỗi lần vẽ để hai tay lắc theo (rig-svg.js, `đợt 40 C`)
  crumb: 0,                // 0…1 VỤN cà rốt rơi từ miệng sau mỗi miếng gặm (`eatCarrot`) — pha rơi; 0 = không có
  liem: 0, liemGoc: 0,     // LIẾM (đợt 35, lượt hai): lưỡi dài thêm tới 120 % và xoay `liemGoc` độ về phía trước (dương) — tới tay / mặt người
  carrot: 0,               // 0…1 củ cà rốt trong miệng (`eatCarrot`) — độ dài còn lại; 0 = không có
  gape: 0,                 // 0…1 HÁ MIỆNG LỚN (đợt 36): hàm dưới hạ hẳn xuống dưới cằm, thấy lưỡi và răng nanh — đọc được ở góc trung
});

/* MẮT LONG LANH (`lanh`): mắt ướt, ngước lên — "mắt cún con" lúc buồn, hối lỗi. Một đốm sáng to thêm ở trên, một vệt
 * sáng dài ở dưới tròng (nước mắt đọng), nằm trong nhóm con ngươi nên đi theo hướng nhìn. `rx` / `ry`: cỡ tròng mắt. */
const lanhMat = (p, b, rx, ry) => `<g id="${p}-lanh${b}" opacity="0"><circle cx="${(rx * 0.3).toFixed(2)}" cy="${(-ry * 0.45).toFixed(2)}" r="${(rx * 0.3).toFixed(2)}" fill="#fff"/>
      <path d="M ${(-rx * 0.62).toFixed(2)} ${(ry * 0.5).toFixed(2)} Q 0 ${(ry * 0.86).toFixed(2)} ${(rx * 0.62).toFixed(2)} ${(ry * 0.5).toFixed(2)}" stroke="#dff4ff" stroke-width="${(rx * 0.22).toFixed(2)}" fill="none" stroke-linecap="round" opacity=".9"/></g>`;
/* NHẮM TỊT (`nhan`): hai nét > < thay cho mắt (mắt thật nhắm hẳn cùng lúc) — nhăn mặt vì đau. Đặt NGOÀI nhóm mắt: nhóm
 * ấy co lại theo `matY`, nét này thì không. */
const nhanMat = (p, b, x, y) => { const g = b === 'L' ? 1 : -1; return `
  <path id="${p}-nhan${b}" opacity="0" transform="translate(${x} ${y})" d="M ${-5 * g} -4 L ${4 * g} 0 L ${-5 * g} 4" stroke="#2a1d1a" stroke-width="2.200" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; };

/* CỦ CÀ RỐT (`eatCarrot`, đợt 35): nằm trong nhóm ĐẦU, đầu nhọn ở miệng — đi theo đầu khi gặm; `apDung` vẽ lại thân củ theo độ
 * dài còn lại (`carrot`), lá xanh ở đầu to. */
const carrotSVG = (p) => `<g id="${p}-carrot" style="display:none"><path id="${p}-carrotLeaf" stroke="#4caf50" stroke-width="3.400" fill="none" stroke-linecap="round"/>
        <path id="${p}-carrotBody" fill="#f08a24" stroke="#b85c12" stroke-width="1.300" stroke-linejoin="round"/>
        <path id="${p}-carrotRidge" stroke="#c8661a" stroke-width="1.300" fill="none" stroke-linecap="round"/>
        <path id="${p}-carrotCut" stroke="#ffd9a0" stroke-width="2.600" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
      <g id="${p}-carrotCrumb" style="display:none">${[0, 1, 2, 3, 4].map((n) => `<rect data-crumb="${n}" x="-1.600" y="-1.200" width="3.200" height="2.400" rx="0.800" fill="#f08a24" stroke="#b85c12" stroke-width=".6"/>`).join('')}</g>`;

/* ĐỒ CHƠI (đợt 40 A, `carryToy` / `tugOfWar`): dây thừng thắt nút hai đầu (loại 1) và khúc xương (loại 2), nằm ngang, tâm ở gốc toạ độ, dài 56. Trong mõm
 * (`toyM`) đặt ở nét môi dưới; đầu dây phía +x là chỗ dây kéo của người buộc vào (`toyEnd`). */
const toyShapeSVG = (kind, tag) => kind === 1 ? `
      <g data-toy="1${tag}"><path d="M -24 0 Q 0 3 24 0" stroke="#7a4a1c" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M -24 0 Q 0 3 24 0" stroke="#e0a85a" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M -16 -3.400 l 3.400 6.800 M -8 -3.400 l 3.400 6.800 M 0 -2.800 l 3.400 6.800 M 8 -3.400 l 3.400 6.800 M 16 -3.400 l 3.400 6.800" stroke="#8a5a22" stroke-width="1.400" stroke-linecap="round"/>
        <circle cx="-26" cy="0" r="5" fill="#d6453d" stroke="#7a2520" stroke-width="1.200"/><circle cx="26" cy="0" r="5" fill="#d6453d" stroke="#7a2520" stroke-width="1.200"/></g>` : `
      <g data-toy="2${tag}"><rect x="-22" y="-3.600" width="44" height="7.200" rx="3" fill="#f6ecd0" stroke="#a08a58" stroke-width="1.200"/>
        ${[[-24, -4.600], [-24, 4.600], [24, -4.600], [24, 4.600]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#f6ecd0" stroke="#a08a58" stroke-width="1.200"/>`).join('')}
        <rect x="-21" y="-3" width="42" height="6" rx="3" fill="#f6ecd0"/></g>`;
const toyMouthSVG = (p, nv) => `
      <g id="${p}-toyM" style="display:none" transform="translate(0 ${(nv.mom.y + 6).toFixed(1)})"><g id="${p}-toyMRope" style="display:none">${toyShapeSVG(1, 'M')}</g><g id="${p}-toyMBone" style="display:none">${toyShapeSVG(2, 'M')}</g>
        <circle id="${p}-toyEnd" cx="30" cy="0" r="1" fill="none"/></g>`;

/* ───────────────────────────────────────────────────────────── ĐẦU CHÓ
 * Toạ độ tâm đầu. Tai cụp, mõm sáng, hai đốm mày, lưỡi thè được.
 */
const dauCho = (p, m, nv) => `
  ${['L', 'R'].map((b) => { const g = b === 'L' ? -1 : 1; return nv.ears === 'pointed' ? `
  <g id="${p}-tai${b}"><path d="M ${g * 37} -12 L ${g * 33} -54 L ${g * 6} -31 Z" fill="${m.long}" stroke="${m.long}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M ${g * 31.500} -20 L ${g * 30} -44 L ${g * 14} -30 Z" fill="${m.longSang}"/></g>` : `
  <g id="${p}-tai${b}"><path d="M ${g * 20} -31 Q ${g * 50} -36 ${g * 50} 0 Q ${g * 47} 15 ${g * 36} 8 Q ${g * 30} -10 ${g * 15} -24 Z" fill="${m.longToi}"/></g>`; }).join('')}
  <ellipse rx="40" ry="36" fill="${m.long}"/>
  <path d="M -8 -35 Q 0 -20 -3 -4 Q 0 0 3 -4 Q 0 -20 8 -35 Q 0 -37.500 -8 -35 Z" fill="${m.longSang}"/>
  <ellipse cx="0" cy="15" rx="23" ry="17.500" fill="${m.longSang}"/>
  <ellipse cx="-15.500" cy="-18" rx="4.600" ry="3" fill="${m.longSang}"/><ellipse cx="15.500" cy="-18" rx="4.600" ry="3" fill="${m.longSang}"/>
  <ellipse cx="-25" cy="11" rx="6" ry="3.600" fill="${m.ma}" opacity=".5"/><ellipse cx="25" cy="11" rx="6" ry="3.600" fill="${m.ma}" opacity=".5"/>
  ${['L', 'R'].map((b) => { const g = b === 'L' ? -1 : 1; return `
  <g id="${p}-mat${b}" transform="translate(${g * 16} -4)">
    <ellipse rx="6.400" ry="7.600" fill="${m.mat}"/>
    <g id="${p}-nguoi${b}"><circle cx="-2" cy="-2.800" r="2.300" fill="#fff"/><circle cx="2.200" cy="2.600" r="1.100" fill="#fff" opacity=".8"/>${lanhMat(p, b, 6.4, 7.6)}</g>
  </g>${nhanMat(p, b, g * 16, -4)}`; }).join('')}
  <g id="${p}-mom">
    <path id="${p}-jaw" fill="${m.longSang}"/>
    <path id="${p}-ham" fill="${m.mieng}"/>
    <path id="${p}-luoi" fill="${m.luoi}"/>
    <path id="${p}-luoiNet" stroke="${chinhSang(m.luoi, -0.25)}" stroke-width="1" fill="none" stroke-linecap="round"/>
    <path id="${p}-nanh" fill="#ffffff" stroke="#3a2a2a" stroke-width=".6" stroke-linejoin="round"/>
    <path id="${p}-moi" stroke="${m.mui}" stroke-width="1.800" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <path d="M -6.500 4 Q 0 1.200 6.500 4 Q 5.500 10.500 0 12 Q -5.500 10.500 -6.500 4 Z" fill="${m.mui}"/>
  <ellipse cx="-1.800" cy="5.200" rx="2.200" ry="1.100" fill="#fff" opacity=".45"/>`;

/* ───────────────────────────────────────────────────────────── ĐẦU MÈO
 * Tai nhọn lót hồng, mắt có tròng màu và con ngươi dọc, ria, vằn trán.
 */
const dauMeo = (p, m) => `
  ${['L', 'R'].map((b) => { const g = b === 'L' ? -1 : 1; return `
  <g id="${p}-tai${b}"><path d="M ${g * 33} -12 L ${g * 29} -49 L ${g * 5} -29 Z" fill="${m.long}" stroke="${m.long}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M ${g * 28} -19 L ${g * 26.500} -40 L ${g * 12} -28 Z" fill="${m.taiTrong}"/></g>`; }).join('')}
  <ellipse rx="37" ry="32" fill="${m.long}"/>
  ${m.patch ? `<path d="M -36 -6 Q -38 -28 -14 -31 Q -4 -32 -2 -24 Q -6 -12 -18 -8 Q -28 -2 -36 -6 Z" fill="${m.patch}"/>` : ''}
  <path d="M 0 -31 v 9 M -9 -30 l 2 8 M 9 -30 l -2 8" stroke="${m.dom}" stroke-width="3.200" stroke-linecap="round"/>
  <path d="M -36 -2 l 9 1.500 M -35 7 l 8 -0.500 M 36 -2 l -9 1.500 M 35 7 l -8 -0.500" stroke="${m.dom}" stroke-width="2.600" stroke-linecap="round"/>
  <ellipse cx="0" cy="17" rx="16" ry="12" fill="${m.longSang}"/>
  <ellipse cx="-24" cy="12" rx="5.500" ry="3.200" fill="${m.ma}" opacity=".45"/><ellipse cx="24" cy="12" rx="5.500" ry="3.200" fill="${m.ma}" opacity=".45"/>
  ${['L', 'R'].map((b) => { const g = b === 'L' ? -1 : 1; return `
  <g id="${p}-mat${b}" transform="translate(${g * 15} -2)">
    <ellipse rx="7.800" ry="8.600" fill="${m.mat}" stroke="${m.vienNet}" stroke-width="1.400"/>
    <g id="${p}-nguoi${b}"><ellipse id="${p}-dongTu${b}" rx="2.600" ry="6.800" fill="#17110c"/>
      <circle cx="-2.400" cy="-3.200" r="2" fill="#fff"/>${lanhMat(p, b, 7.8, 8.6)}</g>
  </g>${nhanMat(p, b, g * 15, -2)}`; }).join('')}
  <g id="${p}-mom">
    <path id="${p}-jaw" fill="${m.longSang}"/>
    <path id="${p}-ham" fill="${m.mieng}"/>
    <path id="${p}-luoi" fill="${m.luoi}"/>
    <path id="${p}-luoiNet" stroke="${chinhSang(m.luoi, -0.25)}" stroke-width="0.800" fill="none" stroke-linecap="round"/>
    <path id="${p}-nanh" fill="#ffffff" stroke="#3a2a2a" stroke-width=".6" stroke-linejoin="round"/>
    <path id="${p}-moi" stroke="${m.vienNet}" stroke-width="1.500" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <path d="M -4 9 Q 0 7.500 4 9 Q 2.500 13 0 13.800 Q -2.500 13 -4 9 Z" fill="${m.mui}"/>
  <path d="M -13 14 l -19 -4 M -13 17 l -20 1 M -13 20 l -18 6 M 13 14 l 19 -4 M 13 17 l 20 1 M 13 20 l 18 6"
        stroke="#ffffff" stroke-width="0.900" stroke-linecap="round" opacity=".85"/>`;

/* ───────────────────────────────────────────────────────────── ĐẦU THỎ
 * Hai tai dài dựng đứng (lót hồng), mặt tròn, mắt tròn đen to, mũi hồng nhỏ, hai răng cửa, má phồng.
 */
const dauTho = (p, m) => `
  ${['L', 'R'].map((b) => { const g = b === 'L' ? -1 : 1; return `
  <g id="${p}-tai${b}"><ellipse cx="${g * 13}" cy="-62" rx="10.500" ry="34" fill="${m.long}" transform="rotate(${g * 8} ${g * 13} -30)"/>
    <ellipse cx="${g * 13}" cy="-60" rx="5.500" ry="26" fill="${m.taiTrong}" transform="rotate(${g * 8} ${g * 13} -30)"/></g>`; }).join('')}
  <ellipse rx="36" ry="32" fill="${m.long}"/>
  <ellipse cx="0" cy="14" rx="19" ry="13" fill="${m.longSang}"/>
  <ellipse cx="-22" cy="9" rx="5.500" ry="3.200" fill="${m.ma}" opacity=".5"/><ellipse cx="22" cy="9" rx="5.500" ry="3.200" fill="${m.ma}" opacity=".5"/>
  ${['L', 'R'].map((b) => { const g = b === 'L' ? -1 : 1; return `
  <g id="${p}-mat${b}" transform="translate(${g * 15} -4)">
    <ellipse rx="6.600" ry="7.400" fill="${m.mat}"/>
    <g id="${p}-nguoi${b}"><circle cx="-2" cy="-2.600" r="2.300" fill="#fff"/><circle cx="2" cy="2.400" r="1" fill="#fff" opacity=".8"/>${lanhMat(p, b, 6.6, 7.4)}</g>
  </g>${nhanMat(p, b, g * 15, -4)}`; }).join('')}
  <g id="${p}-mom">
    <path id="${p}-jaw" fill="${m.longSang}"/>
    <path id="${p}-ham" fill="${m.mieng}"/>
    <path id="${p}-luoi" fill="${m.luoi}"/>
    <path id="${p}-luoiNet" stroke="${chinhSang(m.luoi, -0.25)}" stroke-width="0.800" fill="none" stroke-linecap="round"/>
    <path id="${p}-nanh" fill="#ffffff" stroke="#3a2a2a" stroke-width=".6" stroke-linejoin="round"/>
    <path id="${p}-moi" stroke="${m.vienNet}" stroke-width="1.400" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <rect x="-3.800" y="14.500" width="3.500" height="5" rx="1" fill="#ffffff" stroke="${m.vienNet}" stroke-width=".7"/>
  <rect x="0.300" y="14.500" width="3.500" height="5" rx="1" fill="#ffffff" stroke="${m.vienNet}" stroke-width=".7"/>
  <path id="${p}-nose" d="M -3.500 7.500 Q 0 6 3.500 7.500 Q 2 11 0 11.500 Q -2 11 -3.500 7.500 Z" fill="${m.mui}"/>
  <path id="${p}-riaL" d="M -10 12 l -14 -3 M -10 15 l -15 1" stroke="${m.vienNet}" stroke-width=".7" stroke-linecap="round" opacity=".5"/>
  <path id="${p}-riaR" d="M 10 12 l 14 -3 M 10 15 l 15 1" stroke="${m.vienNet}" stroke-width=".7" stroke-linecap="round" opacity=".5"/>`;

/* ─────────────────────────────────────────────────────────────── LOÀI
 * H0 / S0: hông và vai lúc ĐỨNG. chanT / chanS: hai đốt chân trước / sau (a = đốt
 * trên, b = đốt dưới, rong = bề dày, dui = bán kính khối đùi). `mom`: cỡ miệng.
 */
const LOAI = {
  dog: {
    ten: 'Chó — cún vàng', loai: 'dog',
    H0: { x: 150, y: 236 }, S0: { x: 232, y: 232 }, dayThan: 30,
    chanT: { a: 30, b: 31, rong: 17 }, chanS: { a: 31, b: 32, rong: 18, dui: 25 },
    dau: { dx: 26, dy: -50, r: 40 }, mom: { y: 15, co: 1 }, veDau: dauCho, taiTam: [22, -28], taiGoc: 16,
    duoi: { dai: 46, rong: 13, goc: 64, cong: 0.95, dx: -22, dy: -12 },
    nghi: {},
    mau: { long: '#dc9a4c', longToi: '#b87a34', longSang: '#fbead0', ma: '#f2a3a3', mui: '#2a2024', mat: '#2e1c12',
           mieng: '#5a2530', luoi: '#ef8a94', vongCo: '#d6453d', the: '#f1c232', vien: '#1d0d10', vienNet: '#2a1519' },
  },
  cat: {
    ten: 'Mèo — mướp xám', loai: 'cat',
    H0: { x: 154, y: 242 }, S0: { x: 224, y: 240 }, dayThan: 23,
    chanT: { a: 26, b: 27, rong: 12.5 }, chanS: { a: 27, b: 28, rong: 13.5, dui: 19 },
    dau: { dx: 18, dy: -42, r: 36 }, mom: { y: 14.5, co: 0.72 }, veDau: dauMeo, taiTam: [19, -22], taiGoc: 20,
    duoi: { dai: 82, rong: 8.5, goc: 58, cong: -0.55, dx: -17, dy: -8 },
    nghi: { ngoi: 1, cuoi: 0.25 },            // mèo nghỉ ở dáng NGỒI
    mau: { long: '#9ba4af', longToi: '#7c8591', longSang: '#f5f2ed', dom: '#6b7480', taiTrong: '#f0a9b4', ma: '#f2a3a3',
           mui: '#e58b96', mat: '#8cc45a', mieng: '#5a2530', luoi: '#ef8a94', vongCo: '#2f9e8f', the: '#f1c232',
           vien: '#1d0d10', vienNet: '#2a1519' },
  },
};

// GIỐNG khác của cùng một loài: lấy nguyên hình thể rồi đổi vài thứ. `loai` (dog / cat) quyết
// định bộ động tác; khoá của bảng là id giống.
LOAI.shiba = {
  ...LOAI.dog, ten: 'Chó — shiba', ears: 'pointed', taiTam: [22, -24], taiGoc: 14,
  duoi: { ...LOAI.dog.duoi, dai: 50, cong: 1.15 },
  mau: { ...LOAI.dog.mau, long: '#e08a3c', longToi: '#b96a25', longSang: '#fff3e0', vongCo: '#2f6fd0' },
};
LOAI.orange_cat = {
  ...LOAI.cat, ten: 'Mèo — mướp cam',
  mau: { ...LOAI.cat.mau, long: '#eda24a', longToi: '#c9802e', dom: '#c9712a', longSang: '#fff6e8', mat: '#7cb342', vongCo: '#d6453d' },
};
// THỎ: loài riêng — thân tròn, chân sau to (đùi lớn), chân trước ngắn, đuôi bông ngắn; nghỉ ở dáng NGỒI; đi bằng NHẢY
// CÓC (`gait: 'hop'`, xem _buoc).
LOAI.rabbit = {
  ten: 'Thỏ — trắng xám', loai: 'rabbit', gait: 'hop',
  H0: { x: 160, y: 244 }, S0: { x: 222, y: 246 }, dayThan: 27,
  chanT: { a: 19, b: 19, rong: 11 }, chanS: { a: 26, b: 27, rong: 15, dui: 26 },
  dau: { dx: 16, dy: -40, r: 34 }, mom: { y: 13, co: 0.6 }, veDau: dauTho, taiTam: [13, -30], taiGoc: -26,       // âm: tai thỏ dài dựng đứng — "cụp" là XOÈ ra hai bên (tai máy bay), không xoay vào bắt chéo nhau
  duoi: { dai: 9, rong: 19, goc: 40, cong: 0, dx: -20, dy: -6 },
  nghi: { ngoi: 1, cuoi: 0.3 },
  mau: { long: '#d9d6d2', longToi: '#b9b4ae', longSang: '#ffffff', taiTrong: '#f2aab6', ma: '#f2a3a3', mui: '#e58b96', mat: '#2b1d1a',
         mieng: '#5a2530', luoi: '#ef8a94', vongCo: '#2f9e8f', the: '#f1c232', vien: '#1d0d10', vienNet: '#2a1519' },
};
// Các GIỐNG chó / mèo dựng trên hình thể sẵn có: đổi màu, tai, đuôi và (qua `shape`) dáng — corgi chân ngắn mình dài.
LOAI.corgi = {
  ...LOAI.dog, ten: 'Chó — corgi', ears: 'pointed', taiTam: [22, -24], taiGoc: 14, shape: { legLength: 0.62, bodyLength: 1.22 },
  duoi: { ...LOAI.dog.duoi, dai: 22, cong: 0.4 },
  mau: { ...LOAI.dog.mau, long: '#e3974a', longToi: '#bf7631', longSang: '#fffaf2', vongCo: '#d6453d' },
};
LOAI.poodle = {
  ...LOAI.dog, ten: 'Chó — poodle', shape: { headSize: 1.06, legLength: 1.08, bodyThickness: 0.92 },
  duoi: { ...LOAI.dog.duoi, dai: 40, cong: 1.5, rong: 15 },
  mau: { ...LOAI.dog.mau, long: '#e8c39a', longToi: '#c99f74', longSang: '#f7e6d2', vongCo: '#8a5ad6' },
};
LOAI.husky = {
  ...LOAI.dog, ten: 'Chó — husky', ears: 'pointed', taiTam: [22, -24], taiGoc: 14, shape: { legLength: 1.08 },
  duoi: { ...LOAI.dog.duoi, dai: 52, cong: 1.0 },
  mau: { ...LOAI.dog.mau, long: '#7d8895', longToi: '#5f6975', longSang: '#f6f7f8', mat: '#3d8fd6', vongCo: '#d6453d' },
};
LOAI.black_dog = {
  ...LOAI.dog, ten: 'Chó — mực',
  mau: { ...LOAI.dog.mau, long: '#2f2b2b', longToi: '#1d1a1a', longSang: '#5b5352', ma: '#c98a8a', mat: '#1a1210', vongCo: '#f1c232' },
};
LOAI.white_cat = {
  ...LOAI.cat, ten: 'Mèo — trắng',
  mau: { ...LOAI.cat.mau, long: '#f4f1ec', longToi: '#d9d4cc', dom: '#f4f1ec', longSang: '#ffffff', mat: '#5aa9e6', vongCo: '#d6453d' },
};
LOAI.calico = {
  ...LOAI.cat, ten: 'Mèo — tam thể',
  // Tam thể: nền trắng, vằn cam, chân xa và đuôi sẫm như mảng lông đen.
  mau: { ...LOAI.cat.mau, long: '#f7f3ec', longToi: '#d9d2c6', dom: '#e08a3c', patch: '#3a3234', longSang: '#ffffff', mat: '#c9a227', vongCo: '#2f9e8f' },
};
LOAI.black_cat = {
  ...LOAI.cat, ten: 'Mèo — mun',
  // Mèo một màu: vằn trùng màu lông nên không hiện; mõm và bàn chân chỉ sáng hơn một nấc.
  mau: { ...LOAI.cat.mau, long: '#2f2d35', longToi: '#211f26', dom: '#2f2d35', longSang: '#4b4853', taiTrong: '#6b5560',
         mui: '#4a3f47', mat: '#f1c232', vongCo: '#8a5ad6' },
};

/* ───────────────────────────────────────────────────────── HÌNH DÁNG chỉnh được
 * Bảy núm, đều là hệ số so với hình thể gốc của giống (1 = như gốc), riêng `tailCurl` là
 * lượng CỘNG vào độ cuộn đuôi. Khoảng hợp lệ để `setShape` kẹp lại.
 */
const SHAPE_RANGE = {
  headSize: [0.7, 1.4], bodyLength: [0.7, 1.5], bodyThickness: [0.7, 1.4], legLength: [0.6, 1.5],
  tailLength: [0.3, 1.8], tailCurl: [-1, 1], earSize: [0.6, 1.6],
};
const DEFAULT_SHAPE = Object.freeze({ headSize: 1, bodyLength: 1, bodyThickness: 1, legLength: 1, tailLength: 1, tailCurl: 0, earSize: 1 });

// Hình thể của một giống sau khi áp các núm hình dáng.
function shapedSpecies(base, shape) {
  const half = (base.S0.x - base.H0.x) / 2, mid = (base.S0.x + base.H0.x) / 2;
  const leg = (c) => ({ ...c, a: c.a * shape.legLength, b: c.b * shape.legLength, rong: c.rong * (0.5 + 0.5 * shape.bodyThickness),
                        ...(c.dui ? { dui: c.dui * shape.bodyThickness } : {}) });
  // Hông và vai cao lên theo chân; vai–hông dãn ra theo chiều dài thân, quanh điểm giữa.
  const lift = (y) => DAT - (DAT - y) * (0.35 + 0.65 * shape.legLength) - base.dayThan * (shape.bodyThickness - 1) * 0.5;
  return {
    ...base,
    H0: { x: mid - half * shape.bodyLength, y: lift(base.H0.y) },
    S0: { x: mid + half * shape.bodyLength, y: lift(base.S0.y) },
    dayThan: base.dayThan * shape.bodyThickness,
    chanT: leg(base.chanT), chanS: leg(base.chanS),
    // Đầu to ra thì tâm đầu nhích lên và ra trước một nửa chừng ấy, để cằm vẫn tựa trên cổ.
    dau: { ...base.dau, dx: base.dau.dx * (0.5 + 0.5 * shape.headSize), dy: base.dau.dy * (0.45 + 0.55 * shape.headSize) - base.dayThan * (shape.bodyThickness - 1) * 0.3 },
    duoi: { ...base.duoi, dai: base.duoi.dai * shape.tailLength, cong: base.duoi.cong + shape.tailCurl * 0.6 },
    headScale: shape.headSize, earScale: shape.earSize,
  };
}

// Giải khớp giữa của một chân hai đốt: gốc R, bàn chân T, hai đốt a và b.
// `raTruoc` = khớp gập về phía ĐẦU (gối chân sau), ngược lại là về phía đuôi (khuỷu chân trước).
function khop(R, T, a, b, raTruoc) {
  let dx = T.x - R.x, dy = T.y - R.y, d = Math.hypot(dx, dy) || 1e-6;
  const dMax = a + b - 0.5, dMin = Math.abs(a - b) + 0.5;
  if (d > dMax || d < dMin) {                       // với không tới thì kéo bàn chân về trong tầm
    const k = clamp(d, dMin, dMax) / d;
    dx *= k; dy *= k; d *= k; T = { x: R.x + dx, y: R.y + dy };
  }
  const goc = Math.atan2(dy, dx), A = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const j1 = { x: R.x + a * Math.cos(goc + A), y: R.y + a * Math.sin(goc + A) };
  const j2 = { x: R.x + a * Math.cos(goc - A), y: R.y + a * Math.sin(goc - A) };
  let J = (j1.x > j2.x) === raTruoc ? j1 : j2;
  // Khớp không được chui xuống dưới nền (ngực ép sát đất thì khuỷu chân trước dễ lọt xuống).
  if (J.y > DAT - 4) J = j1.y < j2.y ? j1 : j2;
  return { J, T };
}

// Động tác TRIỆU CHỨNG và chăm sóc, chung cho chó và mèo (nội dung thú y: ngứa, khập khiễng, sợ hãi, biếng ăn, ho…).
const SYMPTOMS = ['scratchItch', 'limp', 'tremble', 'eat', 'drink', 'cough', 'openMouth', 'shakeOff', 'sneeze', 'pant', 'yawn', 'rub', 'fetch', 'greet', 'play', 'chew'];
// Phụ kiện đeo (`wear`): loa chống liếm sau mổ, băng ở chân trước phía người xem.
const WEARABLES = ['cone', 'bandage'];


export { KHUNG, LIE, HELD, DAT, clamp, RAD, mem, pha, gieoHat, nhieu, chinhSang, HEX_COLOR, assertColors, NGHI, lanhMat, nhanMat, carrotSVG, toyShapeSVG, toyMouthSVG, dauCho, dauMeo, dauTho, LOAI, SHAPE_RANGE, DEFAULT_SHAPE, shapedSpecies, khop, SYMPTOMS, WEARABLES };

/** The seeded random source (see `gieoHat`) — call it, do not import `ngau`: a module binding would not follow a re-seed in the one-file build. */
export const ngauNhien = () => ngau();
/** State of the seeded sequence (null = Math.random): `luuNgau` / `traNgau` of the rig. */
export const luuHat = () => hatHienTai;
export const traHat = (state) => { if (state !== null && hatHienTai !== null) hatHienTai = state; };

/**
 * Copy the methods (and static members) of an action-group class onto the rig class. A name that already exists is an
 * error: two groups defining the same action would otherwise silently depend on the install order.
 */
export function mix(Target, Source) {
  for (const [to, from, skip] of [[Target.prototype, Source.prototype, ['constructor']], [Target, Source, ['length', 'name', 'prototype']]])
    for (const key of Object.getOwnPropertyNames(from)) {
      if (skip.includes(key)) continue;
      if (Object.prototype.hasOwnProperty.call(to, key)) throw new Error(`[character] ${Target.name}: "${key}" is defined twice (action groups)`);
      Object.defineProperty(to, key, Object.getOwnPropertyDescriptor(from, key));
    }
}
