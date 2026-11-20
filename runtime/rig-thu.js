// rig-thu.js — THÚ BỐN CHÂN (chó, mèo) bằng SVG thuần, điều khiển bằng GSAP (global `gsap`).
//
// Bộ rig riêng, không dùng chung khung xương với `rig-svg.js` (người đứng hai
// chân, thú đi bốn chân) — nhưng giữ ĐÚNG các luật của nó, để studio và template
// dùng hai loại như nhau:
//  • Mọi động tác TRẢ VỀ timeline ở trạng thái paused, không tự chạy.
//  • Mọi động tác KHÉP về tư thế nghỉ (`NGHI`) nên nối liền không giật.
//  • Trạng thái sống trong `rig.s`; `apDung()` đổ trạng thái xuống SVG.
//  • `doiMau()` đổi màu, `datNghi()` về nghỉ, `RigThu.gieo(hat)` cố định ngẫu nhiên.
//
// HÌNH: thân nhìn NGANG (đầu quay sang phải màn hình), mặt quay ra người xem —
// kiểu linh vật quen thuộc, và hợp với đầu nhìn thẳng của các nhân vật người.
//
// CHÂN LÀ IK, không phải góc khớp. Mỗi bàn chân có một ĐIỂM ĐẶT (trên nền, hoặc
// treo theo vai khi nhấc lên); khớp giữa tự giải từ hông/vai tới điểm ấy. Nhờ thế
// hạ mông xuống là chân sau tự gập thành dáng ngồi, hạ ngực là chân trước tự
// khuỵu — không phải viết tay góc cho từng tư thế, và bàn chân không bao giờ lún.
//
// Trạng thái (`rig.s`):
//   x y mo co        vị trí, độ mờ, cỡ            huong   1 = quay phải, −1 = quay trái
//   ngoi 0..1        ngồi                          tho     hơi thở
//   truocX/Y sauX/Y  dời VAI và HÔNG (đơn vị, y dương = xuống) — cúi, vươn, đứng lên
//   cong 0..1        cong lưng (mèo xù lông)       xu 0..1 xù đuôi
//   dau dauX dauY    đầu nghiêng (độ) / dời         taiL taiR  tai: +1 vểnh, −1 cụp
//   matY 0..1 nhắm · nhinX nhinY · dongTu (1 = thường, <1 con ngươi hẹp, >1 giãn)
//   mieng 0..1 · luoi 0..1 thè lưỡi · cuoi
//   lanh 0..1 mắt long lanh (ướt, ngước — buồn, hối lỗi) · nhan 0..1 nhắm tịt hình > < (đau) · nanh 0..1 nhe nanh (gầm gừ)
//   duoi (độ, cộng vào góc đuôi) · duoiCong (cộng vào độ cuộn)
//   Bốn chân — tn/tx = TRƯỚC gần/xa, sn/sx = SAU gần/xa:
//     ..X ..Y   dời bàn chân tới (x dương = về phía đầu) và nhấc lên (y dương = lên)
//     tnNhac txNhac 0..1  chân trước rời đất, treo theo vai;  tnGoc txGoc góc treo
//                         (độ; 0 = thõng xuống, dương = đưa ra trước / lên)

import { MARKS, freshMark, attachMark, drawMark, markTweens, markOff } from './marks.js';
import { attachShade } from './shading.js';

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
  tnX: 0, tnY: 0, tnNhac: 0, tnGoc: 0, txX: 0, txY: 0, txNhac: 0, txGoc: 0,
  snX: 0, snY: 0, sxX: 0, sxY: 0,
});

/* MẮT LONG LANH (`lanh`): mắt ướt, ngước lên — "mắt cún con" lúc buồn, hối lỗi. Một đốm sáng to thêm ở trên, một vệt
 * sáng dài ở dưới tròng (nước mắt đọng), nằm trong nhóm con ngươi nên đi theo hướng nhìn. `rx` / `ry`: cỡ tròng mắt. */
const lanhMat = (p, b, rx, ry) => `<g id="${p}-lanh${b}" opacity="0"><circle cx="${(rx * 0.3).toFixed(2)}" cy="${(-ry * 0.45).toFixed(2)}" r="${(rx * 0.3).toFixed(2)}" fill="#fff"/>
      <path d="M ${(-rx * 0.62).toFixed(2)} ${(ry * 0.5).toFixed(2)} Q 0 ${(ry * 0.86).toFixed(2)} ${(rx * 0.62).toFixed(2)} ${(ry * 0.5).toFixed(2)}" stroke="#dff4ff" stroke-width="${(rx * 0.22).toFixed(2)}" fill="none" stroke-linecap="round" opacity=".9"/></g>`;
/* NHẮM TỊT (`nhan`): hai nét > < thay cho mắt (mắt thật nhắm hẳn cùng lúc) — nhăn mặt vì đau. Đặt NGOÀI nhóm mắt: nhóm
 * ấy co lại theo `matY`, nét này thì không. */
const nhanMat = (p, b, x, y) => { const g = b === 'L' ? 1 : -1; return `
  <path id="${p}-nhan${b}" opacity="0" transform="translate(${x} ${y})" d="M ${-5 * g} -4 L ${4 * g} 0 L ${-5 * g} 4" stroke="#2a1d1a" stroke-width="2.200" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; };

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
    <path id="${p}-ham" fill="${m.mieng}"/>
    <path id="${p}-luoi" fill="${m.luoi}"/>
    <path id="${p}-luoiNet" stroke="${chinhSang(m.luoi, -0.25)}" stroke-width="0.800" fill="none" stroke-linecap="round"/>
    <path id="${p}-nanh" fill="#ffffff" stroke="#3a2a2a" stroke-width=".6" stroke-linejoin="round"/>
    <path id="${p}-moi" stroke="${m.vienNet}" stroke-width="1.400" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <rect x="-3.800" y="14.500" width="3.500" height="5" rx="1" fill="#ffffff" stroke="${m.vienNet}" stroke-width=".7"/>
  <rect x="0.300" y="14.500" width="3.500" height="5" rx="1" fill="#ffffff" stroke="${m.vienNet}" stroke-width=".7"/>
  <path d="M -3.500 7.500 Q 0 6 3.500 7.500 Q 2 11 0 11.500 Q -2 11 -3.500 7.500 Z" fill="${m.mui}"/>
  <path d="M -10 12 l -14 -3 M -10 15 l -15 1 M 10 12 l 14 -3 M 10 15 l 15 1" stroke="${m.vienNet}" stroke-width=".7" stroke-linecap="round" opacity=".5"/>`;

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
// CÓC (`gait: 'hop'`, xem #buoc).
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

export class RigThu {
  static KHUNG = KHUNG;
  static NGHI = NGHI;
  static LOAI = LOAI;
  static DONG_TAC = {
    dog: ['idle', 'wagTail', 'bark', 'sit', 'tiltHead', 'jump', 'beg', 'givePaw', 'sniff', 'unwell', 'walk', 'enter', 'exit', ...SYMPTOMS, 'express'],
    cat: ['idle', 'meow', 'purr', 'lickPaw', 'stretch', 'hiss', 'tailSwish', 'tiltHead', 'pounce', 'unwell', 'walk', 'enter', 'exit', ...SYMPTOMS, 'express'],
    rabbit: ['idle', 'hop', 'thump', 'tiltHead', 'unwell', 'walk', 'enter', 'exit', ...SYMPTOMS.filter((name) => name !== 'fetch' && name !== 'greet'), 'express'],
  };
  static gieo(hat) { gieoHat(hat); }
  static luuNgau() { return hatHienTai; }
  static traNgau(state) { if (state !== null && hatHienTai !== null) hatHienTai = state; }
  static #dem = 0;
  /** Tên màu công khai → khoá màu nội bộ. `index.js` gán bảng này lúc nạp thư viện. */
  static COLOR_ALIASES = {};
  static #withAliases(palette) {
    const m = { ...palette };
    for (const [alias, key] of Object.entries(RigThu.COLOR_ALIASES)) if (key in m && !(alias in m)) m[alias] = m[key];
    return m;
  }

  constructor(host, loai = 'dog') {
    const nv = typeof loai === 'string' ? LOAI[loai] : loai;
    if (!nv) throw new Error(`[character] no species "${loai}" (available: ${Object.keys(LOAI).join(', ')})`);
    this.host = host;
    this.base = nv;                               // hình thể gốc của giống — setShape tính lại từ đây
    this.shape = { ...DEFAULT_SHAPE, ...(nv.shape || {}) };          // giống có dáng riêng (corgi chân ngắn) — `setShape` chỉnh tiếp từ đó
    this.nv = shapedSpecies(nv, this.shape);
    this.mauKhai = { ...nv.mau };
    this.mau = this.nv.mau = RigThu.#withAliases(this.mauKhai);
    this.DONG_TAC = RigThu.DONG_TAC[nv.loai];
    this.NGHI = Object.freeze({ ...NGHI, ...(nv.nghi || {}) });
    this.id = `thu${++RigThu.#dem}`;
    this.wearing = new Set();
    this.s = this.#theoDoi({ ...this.NGHI });
    this.m = freshMark();                 // dấu cảm xúc trên đầu (marks.js) — ngoài `s`: động tác khác không xoá nó
    this.#dungLai();
  }

  // `rig.s` là một Proxy: hễ có ai GHI vào trạng thái thì hẹn vẽ lại ở cuối lượt chạy
  // hiện tại (microtask). Timeline vẫn gọi `apDung` qua `onUpdate` như cũ — lớp này để
  // phòng trường hợp bộ dựng video tua bằng `seek()`, vốn TẮT mọi callback của GSAP:
  // không có nó thì trạng thái đổi mà hình đứng yên. Vẽ lại hai lần trong một lượt
  // không sao, `apDung` chỉ là hàm của trạng thái.
  #choVe = false;
  #legNear = null;
  #theoDoi(o) {
    return new Proxy(o, { set: (dich, k, v) => {
      dich[k] = v;
      if (!this.#choVe && this.el) { this.#choVe = true; queueMicrotask(() => { this.#choVe = false; this.apDung(); }); }
      return true;
    } });
  }

  /* ------------------------------------------------------------------ SVG */

  #dungLai() {
    const khung = this.svg && this.svg.getAttribute('viewBox');
    this.host.innerHTML = this.#dungSVG();
    this.svg = this.host.querySelector('svg');
    if (khung) this.svg.setAttribute('viewBox', khung);
    // Thuộc tính của SVG khi nó ở NHÀ (trong host của chính nó) — người bế (`carry`) trả con vật về đúng như thế.
    this.homeAttrs = ['x', 'y', 'width', 'height'].map((name) => [name, this.svg.getAttribute(name)]);
    // Nối chuỗi, KHÔNG dùng template literal trong querySelector: bộ lint của HyperFrames
    // (và bộ đóng gói HTML của nó) từ chối selector có biến nội suy.
    const q = (n) => this.svg.querySelector('#' + this.id + '-' + n);
    this.el = Object.fromEntries(['goc', 'bong', 'chanXa', 'chanGan', 'duoi', 'duoiDau', 'than', 'thanE', 'mong', 'nguc', 'gu', 'bung', 'ucSang', 'van', 'co', 'vong', 'the',
      'dau', 'taiL', 'taiR', 'matL', 'matR', 'nguoiL', 'nguoiR', 'dongTuL', 'dongTuR', 'ham', 'luoi', 'luoiNet', 'moi', 'nanh', 'lanhL', 'lanhR', 'nhanL', 'nhanR',
      'duiN', 'duiX', 'nuoc', 'ballM', 'cone', 'bang', 'bangP', 'bangNet', ...['tn', 'tx', 'sn', 'sx'].flatMap((k) => [k, k + 'Ban'])].map((n) => [n, q(n)]));
    // Dấu cảm xúc: góc trên, phía trước đầu (về phía mõm), trên chóp tai.
    this.markEl = attachMark(this.el.dau, [this.nv.loai === 'rabbit' ? 48 : 32, this.nv.loai === 'rabbit' ? -78 : -66], 1.25);
    this.shadeEl = attachShade(this.svg, this.el.goc);      // đổ bóng trên thân theo hướng sáng (shading.js; bối cảnh 3D đặt)
    this.apDung();
  }

  #dungSVG() {
    const p = this.id, m = this.mau, nv = this.nv, V = ` filter="url(#${p}-vien)"`;
    const chan = (k, mau, c) => `<path id="${p}-${k}" stroke="${mau}" stroke-width="${c.rong}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <ellipse id="${p}-${k}Ban" rx="${(c.rong * 0.68).toFixed(1)}" ry="${(c.rong * 0.44).toFixed(1)}" fill="${m.longSang}"/>`;
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${KHUNG.w} ${KHUNG.h}" width="100%" height="100%" style="display:block;overflow:visible">
  <defs>
    <!-- Vùng lọc tính theo TOẠ ĐỘ KHUNG, không theo hộp bao của phần tử: cái đuôi dựng thẳng
         đứng có hộp bao rộng 0, mà 160% của 0 vẫn là 0 — bộ lọc xén sạch, đuôi còn một sợi chỉ. -->
    <filter id="${p}-vien" filterUnits="userSpaceOnUse" x="-400" y="-300" width="1200" height="900">
      <feMorphology in="SourceAlpha" operator="dilate" radius="1.3" result="d"/>
      <feFlood flood-color="${m.vien}" result="c"/><feComposite in="c" in2="d" operator="in" result="o"/>
      <feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g id="${p}-goc">
    <ellipse id="${p}-bong" cy="${DAT + 1}" ry="7" fill="#000" opacity=".26"/>
    <g id="${p}-chanXa"${V}>
      <circle id="${p}-duiX" r="${nv.chanS.dui * 0.9}" fill="${m.longToi}"/>
      ${chan('sx', m.longToi, nv.chanS)}${chan('tx', m.longToi, nv.chanT)}
    </g>
    <g${V}><path id="${p}-duoi" stroke="${m.long}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path id="${p}-duoiDau" stroke="${nv.loai === 'cat' ? m.dom : m.longSang}" fill="none" stroke-linecap="round"/></g>
    <g id="${p}-than"${V}>
      <circle id="${p}-mong" r="${nv.dayThan + 1}" fill="${m.long}"/>
      <circle id="${p}-gu" r="${nv.dayThan * 0.92}" fill="${m.long}"/>
      <ellipse id="${p}-thanE" fill="${m.long}"/>
      <!-- cổ nằm CHUNG nhóm với thân: để riêng thì bộ lọc viền kẻ một vòng tròn ngang ngực -->
      <path id="${p}-co" stroke="${m.long}" stroke-width="${nv.dayThan * 1.25}" fill="none" stroke-linecap="round"/>
      <circle id="${p}-nguc" r="${nv.dayThan}" fill="${m.long}"/>
      <ellipse id="${p}-bung" fill="${m.longSang}"/>
      <circle id="${p}-ucSang" r="${nv.dayThan * 0.6}" fill="${m.longSang}"/>
      <g id="${p}-van">${nv.loai === 'cat'
        ? (m.patch ? `<ellipse cx="-14" cy="${(-nv.dayThan * 0.35).toFixed(1)}" rx="15" ry="${(nv.dayThan * 0.55).toFixed(1)}" fill="${m.patch}"/><ellipse cx="16" cy="${(-nv.dayThan * 0.5).toFixed(1)}" rx="9" ry="${(nv.dayThan * 0.4).toFixed(1)}" fill="${m.dom}"/>` : '')
          + [-17, -2, 13].map((x) => `<path d="M ${x} ${-nv.dayThan + 1} q 4 7 1 14" stroke="${m.dom}" stroke-width="3.400" fill="none" stroke-linecap="round"/>`).join('') : ''}</g>
    </g>
    <g id="${p}-chanGan"${V}>
      <circle id="${p}-duiN" r="${nv.chanS.dui}" fill="${m.long}"/>
      ${chan('sn', m.long, nv.chanS)}${chan('tn', m.long, nv.chanT)}
      <!-- BĂNG CHÂN (wear('bandage')): băng thú y màu XANH NHẠT quấn ống chân trước phía người xem, hai vạch quấn trắng —
           băng trắng thì lẫn vào bàn chân trắng của mèo (Gemini, đợt 5). -->
      <g id="${p}-bang" style="display:none"><path id="${p}-bangP" stroke="#7cc4e6" stroke-width="${(nv.chanT.rong + 3).toFixed(1)}" fill="none" stroke-linecap="round"/>
        <path id="${p}-bangNet" stroke="#ffffff" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>
    </g>
    <g${V}>
      <path id="${p}-vong" stroke="${m.vongCo}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <circle id="${p}-the" r="4.200" fill="${m.the}" stroke="${m.vienNet}" stroke-width="0.900"/>
    </g>
    <g id="${p}-nuoc" style="display:none">${[0, 1, 2, 3, 4, 5, 6, 7].map((n) => `<path data-drop="${n}" d="M 0 -10 Q 6.5 0 0 6.5 Q -6.5 0 0 -10 Z" fill="#7cc8f0" stroke="#3a8cc4" stroke-width="1.2"/>`).join('')}</g>
    <g id="${p}-dau"${V}>
      <!-- LOA CHỐNG LIẾM (wear('cone')): nhìn thẳng vào mặt, cái loa là một vành trong mờ bao quanh đầu, vẽ SAU đầu. -->
      <g id="${p}-cone" style="display:none"><ellipse rx="70" ry="63" fill="#e6f3fa" fill-opacity=".78" stroke="#8fb8cf" stroke-width="3"/>
        <ellipse rx="50" ry="45" fill="none" stroke="#8fb8cf" stroke-width="1.6" opacity=".55"/>
        <path d="M -70 0 Q -66 -30 -40 -50 M 66 22 Q 58 44 36 56" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/></g>
      ${nv.veDau(p, m, nv)}
      <g id="${p}-ballM" style="display:none" transform="translate(0 ${(nv.mom.y + 7).toFixed(1)})"><circle r="10" fill="#d6e84a" stroke="#7d8a1c" stroke-width="1.4"/>
        <path d="M -9 -3 Q 0 4 9 -3 M -9 4 Q 0 -3 9 4" stroke="#ffffff" stroke-width="1.6" fill="none" opacity=".9"/></g></g>
  </g>
</svg>`;
  }

  /** viewBox cắt sát mặt — cho nút "Cận mặt" của studio. */
  khungMat(nua = 70) {
    const { S } = this.#khung(), d = this.nv.dau, k = this.s.huong < 0 ? -1 : 1;
    const cx = 200 + (S.x + d.dx - 200) * k, cy = S.y + d.dy;
    return `${cx - nua} ${cy - nua + 2} ${nua * 2} ${nua * 2}`;
  }

  // Hông H và vai S theo trạng thái. Ngồi: mông hạ xuống chạm nền và dịch tới, vai lùi nhẹ.
  // Trạng thái để VẼ. Con vật đang được BẾ (SVG của nó nằm lồng trong SVG một người — xem `carry` của rig người) thì
  // vẽ ở dáng nằm cuộn trong tay, CỘNG THÊM vào trạng thái của chính nó: timeline riêng của con vật (gừ gừ, vẫy đuôi)
  // vẫn chạy, chỉ thân và chân được đặt nằm, không đứng / ngồi trên không trung.
  #view() {
    if (!(this.svg && this.svg.ownerSVGElement)) return this.s;
    const s = this.s;
    // Khoá nào có trong HELD thì lấy dáng bế; riêng đầu (dauY) CỘNG thêm để con vật vẫn gật / nghiêng đầu được.
    return new Proxy(s, { get: (o, key) => (key === 'ngoi' ? 0 : key === 'dauY' ? o[key] + HELD.dauY : key in HELD ? HELD[key] : o[key]) });
  }

  #khung() {
    const s = this.#view(), nv = this.nv, ng = mem(s.ngoi);
    const H = { x: nv.H0.x + 22 * ng + s.sauX, y: pha(nv.H0.y, DAT - nv.dayThan + 3, ng) + s.sauY };
    // Ngồi thì VAI NHẤC LÊN cho hai chân trước gần duỗi thẳng (96% chiều dài chân): để vai
    // ở cao độ lúc đứng thì chân trước khuỵu gập, nhìn ra con vật đang giơ tay chứ không ngồi.
    const T = nv.chanT, vaiNgoi = Math.min(nv.S0.y, DAT - T.rong * 0.36 - 4 - 0.96 * (T.a + T.b));
    const S = { x: nv.S0.x - 9 * ng + s.truocX, y: pha(nv.S0.y, vaiNgoi, ng) + s.truocY };
    return { H, S, ng };
  }

  /* ------------------------------------------------------ đổ trạng thái */

  apDung() {
    const s = this.#view(), e = this.el, nv = this.nv, { H, S, ng } = this.#khung();
    const held = s !== this.s;
    const fx = (v) => v.toFixed(2);
    // Cả con lật theo `huong` quanh trục giữa khung; co dãn quanh điểm chạm đất.
    // Giữa chừng cú lật KHÔNG ép con vật dẹt về 0: bề ngang chỉ co tới 30% rồi đổi bên. Co về 0 thì có một khung hình
    // con vật là một vạch dọc mảnh như sợi chỉ.
    const flip = (s.huong < 0 ? -1 : 1) * (RigThu.FLIP_MIN + (1 - RigThu.FLIP_MIN) * Math.min(1, Math.abs(s.huong)));
    // ĐANG ĐƯỢC BẾ (hình nằm trong tay người khác, không trong host của nó): bỏ phần dời của chính nó — người bế đặt cả khung
    // SVG vào tay. Để phần dời lại thì vị trí trong tay phụ thuộc thứ tự cập nhật: tua nhảy tới giữa cảnh, người bế đặt con mèo
    // theo `s.x` cũ của nó, rồi con mèo mới dời hình đi — nó lệch hẳn khỏi tay (đợt 29, b1 lúc 11,4 s).
    const away = this.isCarried();
    e.goc.setAttribute('transform', `translate(${fx(away ? 0 : s.x)} ${fx(away ? 0 : s.y)}) translate(200 ${DAT}) scale(${fx(s.co * flip)} ${fx(s.co)}) translate(-200 ${-DAT})`);
    e.goc.setAttribute('opacity', s.mo);
    const cao = clamp(-s.y / 50, 0, 1);
    e.bong.setAttribute('cx', fx((H.x + S.x) / 2 + 6));
    e.bong.setAttribute('rx', fx(((S.x - H.x) / 2 + nv.dayThan + 14) * (1 - cao * 0.3)));
    e.bong.setAttribute('transform', `translate(0 ${fx(-s.y / (s.co || 1))})`);   // bóng ở lại mặt nền khi nhảy
    e.bong.setAttribute('opacity', held ? 0 : 0.26 - cao * 0.12);       // đang được bế: không có bóng dưới chân

    // ---- thân: hai khối tròn ở hông và vai, nối bằng một elip xoay theo đường hông–vai
    const mx = (H.x + S.x) / 2, my = (H.y + S.y) / 2, goc = Math.atan2(S.y - H.y, S.x - H.x) / RAD;
    const nua = Math.hypot(S.x - H.x, S.y - H.y) / 2, day = nv.dayThan * (1 + s.tho * 0.035);
    const xoay = `translate(${fx(mx)} ${fx(my)}) rotate(${fx(goc)})`;
    e.mong.setAttribute('transform', `translate(${fx(H.x)} ${fx(H.y)})`);
    e.nguc.setAttribute('transform', `translate(${fx(S.x)} ${fx(S.y)})`);
    e.thanE.setAttribute('transform', xoay);
    e.thanE.setAttribute('rx', fx(nua + nv.dayThan * 0.55)); e.thanE.setAttribute('ry', fx(day));
    e.gu.setAttribute('transform', `${xoay} translate(0 ${fx(-s.cong * nv.dayThan * 0.8)})`);
    e.bung.setAttribute('transform', `${xoay} translate(2 ${fx(day * 0.5)})`);
    e.bung.setAttribute('rx', fx(nua * 0.86)); e.bung.setAttribute('ry', fx(day * 0.42));
    e.ucSang.setAttribute('transform', `translate(${fx(S.x + 7)} ${fx(S.y + 8)})`);
    e.van.setAttribute('transform', `${xoay} translate(0 ${fx(-s.cong * nv.dayThan * 0.8)})`);

    // ---- chân. Điểm đặt chân sau dịch theo dáng ngồi; chân trước treo theo vai khi `Nhac`.
    const T = nv.chanT, C = nv.chanS;
    const dat = (k, goc0, xa) => {
      const truoc = k[0] === 't', R = truoc ? { x: S.x + (xa ? 9 : -1), y: S.y + 4 } : { x: H.x + (xa ? 9 : -1), y: H.y + 3 };
      const c = truoc ? T : C, x0 = goc0 + (xa ? 10 : 0);
      let dich = { x: x0 + s[k + 'X'], y: DAT - c.rong * 0.36 - s[k + 'Y'] };
      if (truoc) {
        const nh = clamp(s[k + 'Nhac'], 0, 1), g = s[k + 'Goc'] * RAD, dai = (c.a + c.b) * 0.8;
        const treo = { x: R.x + dai * Math.sin(g), y: R.y + dai * Math.cos(g) };
        dich = { x: pha(dich.x, treo.x, nh), y: pha(dich.y, treo.y, nh) };
      }
      const { J, T: ban } = khop(R, dich, c.a, c.b, !truoc);
      if (k === 'tn') this.#legNear = { J, ban };
      e[k].setAttribute('d', `M ${fx(R.x)} ${fx(R.y)} L ${fx(J.x)} ${fx(J.y)} L ${fx(ban.x)} ${fx(ban.y)}`);
      e[k + 'Ban'].setAttribute('transform', `translate(${fx(ban.x + c.rong * 0.22)} ${fx(ban.y)})`);
      return R;
    };
    const xTruoc = pha(nv.S0.x + 3, nv.S0.x - 5, ng), xSau = pha(nv.H0.x - 3, nv.H0.x + 52, ng);
    dat('tn', xTruoc, false); dat('tx', xTruoc, true);
    const hn = dat('sn', xSau, false), hx = dat('sx', xSau, true);
    e.duiN.setAttribute('transform', `translate(${fx(hn.x + 3)} ${fx(hn.y)})`);
    if (e.ballM) e.ballM.style.display = s.ballMouth >= 0.5 ? '' : 'none';
    // Giọt nước khi rũ mình: toả ra từ giữa thân theo `nuoc`, hiện rồi tắt theo nửa chu kỳ sin.
    if (e.nuoc) {
      const w = clamp(s.nuoc, 0, 1);
      e.nuoc.style.display = w > 0.02 && w < 0.98 ? '' : 'none';
      if (w > 0.02) [...e.nuoc.children].forEach((drop, n) => {
        const a = (n / 8) * Math.PI * 2 + 0.3, r = nv.dayThan * 1.3 + w * 46;
        drop.setAttribute('transform', `translate(${fx(mx + Math.cos(a) * r * 1.4)} ${fx(my - 6 + Math.sin(a) * r)}) rotate(${fx(a / RAD + 90)})`);
        drop.style.opacity = Math.sin(Math.PI * w).toFixed(2);
      });
    }
    // Phụ kiện: loa quanh đầu, băng quấn ống chân trước (từ 25% tới 80% đoạn khuỷu → bàn chân).
    if (e.cone) e.cone.style.display = this.wearing.has('cone') ? '' : 'none';
    if (e.bang) {
      e.bang.style.display = this.wearing.has('bandage') ? '' : 'none';
      if (this.wearing.has('bandage') && this.#legNear) {
        const { J, ban } = this.#legNear, at = (k) => ({ x: pha(J.x, ban.x, k), y: pha(J.y, ban.y, k) }), a = at(0.22), b = at(0.8);
        e.bangP.setAttribute('d', `M ${fx(a.x)} ${fx(a.y)} L ${fx(b.x)} ${fx(b.y)}`);
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len * (nv.chanT.rong * 0.55), ny = dx / len * (nv.chanT.rong * 0.55);
        e.bangNet.setAttribute('d', [0.35, 0.65].map((k) => { const c = { x: pha(a.x, b.x, k), y: pha(a.y, b.y, k) }; return `M ${fx(c.x - nx)} ${fx(c.y - ny + 2)} L ${fx(c.x + nx)} ${fx(c.y + ny - 2)}`; }).join(' '));
      }
    }
    e.duiX.setAttribute('transform', `translate(${fx(hx.x + 3)} ${fx(hx.y)})`);

    // ---- đuôi: ba đoạn nối nhau, mỗi đoạn lệch thêm một góc `cong` → cuộn hoặc lượn chữ S
    const D = nv.duoi, B = { x: H.x + D.dx, y: H.y + D.dy + ng * 8 };
    const th = (D.goc + s.duoi) * RAD, c = (D.cong + s.duoiCong) * 42 * RAD, L = D.dai / 3;
    const huong = (g) => ({ x: -Math.cos(g), y: -Math.sin(g) });
    const P = [B];
    for (let i = 0; i < 3; i++) { const h = huong(th + c * i); P.push({ x: P[i].x + L * h.x, y: P[i].y + L * h.y }); }
    const rongDuoi = D.rong * (1 + s.xu * 0.9);
    e.duoi.setAttribute('d', `M ${fx(P[0].x)} ${fx(P[0].y)} C ${fx(P[1].x)} ${fx(P[1].y)} ${fx(P[2].x)} ${fx(P[2].y)} ${fx(P[3].x)} ${fx(P[3].y)}`);
    e.duoi.setAttribute('stroke-width', fx(rongDuoi));
    const giua = { x: (P[2].x + P[3].x) / 2, y: (P[2].y + P[3].y) / 2 };
    e.duoiDau.setAttribute('d', `M ${fx(giua.x)} ${fx(giua.y)} L ${fx(P[3].x)} ${fx(P[3].y)}`);
    e.duoiDau.setAttribute('stroke-width', fx(rongDuoi * (nv.loai === 'cat' ? 1 : 0.86)));

    // ---- cổ, vòng cổ, đầu
    const dd = nv.dau, tam = { x: S.x + dd.dx + s.dauX, y: S.y + dd.dy + s.dauY - ng * 2 };
    const goi = { x: S.x + 4, y: S.y - 8 };
    e.co.setAttribute('d', `M ${fx(goi.x)} ${fx(goi.y)} L ${fx(pha(goi.x, tam.x, 0.75))} ${fx(pha(goi.y, tam.y, 0.75))}`);
    const cg = { x: pha(goi.x, tam.x, 0.42), y: pha(goi.y, tam.y, 0.42) };
    const dc = Math.atan2(tam.y - goi.y, tam.x - goi.x) + Math.PI / 2, rc = nv.dayThan * 0.6;
    e.vong.setAttribute('d', `M ${fx(cg.x - rc * Math.cos(dc))} ${fx(cg.y - rc * Math.sin(dc))} L ${fx(cg.x + rc * Math.cos(dc))} ${fx(cg.y + rc * Math.sin(dc))}`);
    e.the.setAttribute('transform', `translate(${fx(cg.x + rc * 0.75 * Math.cos(dc) + 2)} ${fx(cg.y + rc * 0.75 * Math.sin(dc) + 5)})`);
    e.dau.setAttribute('transform', `translate(${fx(tam.x)} ${fx(tam.y)}) rotate(${fx(s.dau)}) scale(${fx(nv.headScale)})`);

    const [tx, ty] = nv.taiTam;
    // Tai xoay quanh chân tai, rồi phóng theo `earScale` cũng quanh chân tai.
    const ear = (side, angle) => `rotate(${fx(angle)} ${side * tx} ${ty}) translate(${side * tx} ${ty}) scale(${fx(nv.earScale)}) translate(${-side * tx} ${-ty})`;
    e.taiL.setAttribute('transform', ear(-1, -s.taiL * nv.taiGoc));
    e.taiR.setAttribute('transform', ear(1, s.taiR * nv.taiGoc));
    const mi = Math.max(0.06, 1 - s.matY);
    for (const [b, g] of [['L', -1], ['R', 1]]) {
      const goc0 = e['mat' + b].getAttribute('transform').match(/translate\([^)]*\)/)[0];
      e['mat' + b].setAttribute('transform', `${goc0} scale(1 ${fx(mi)})`);
      e['nguoi' + b].setAttribute('transform', `translate(${fx(s.nhinX)} ${fx(s.nhinY)})`);
      if (e['dongTu' + b]) e['dongTu' + b].setAttribute('rx', fx(clamp(2.6 * s.dongTu, 0.7, 6.4)));
      if (e['lanh' + b]) e['lanh' + b].setAttribute('opacity', fx(clamp(s.lanh, 0, 1)));
      if (e['nhan' + b]) e['nhan' + b].setAttribute('opacity', fx(clamp(s.nhan, 0, 1)));
    }
    this.#veMom();
    if (this.markEl && this.m) drawMark(this.markEl, this.m);
    // Ai đó cần vẽ lại theo con vật (dây dắt của người dắt nó — `leash` của rig người) thì gọi họ sau mỗi lần vẽ.
    if (this.onDraw) this.onDraw();
  }

  // Mõm: nét môi hình chữ "w" dưới mũi, hàm mở ra phía dưới, lưỡi nằm trong hàm rồi thè ra.
  #veMom() {
    const s = this.s, e = this.el, k = this.nv.mom.co, y0 = this.nv.mom.y;
    const mo = clamp(s.mieng, 0, 1), cu = s.cuoi * 2.6 * k, w = 9.5 * k, f = (v) => v.toFixed(2);
    // Nét môi chữ "w": khi `cuoi` âm (buồn, hối lỗi, đau) hai vòng cung dẹt lại rồi úp xuống — giữ nguyên vòng cung thì
    // khoé môi có trễ xuống mõm vẫn như đang cười (Gemini soát cảnh thử đợt 13).
    const bow = 5 * k * (s.cuoi >= 0 ? 1 : Math.max(-0.6, 1 + s.cuoi * 1.6));
    e.moi.setAttribute('d', `M 0 ${f(y0 - 3.4 * k)} V ${f(y0)} M ${f(-w)} ${f(y0 - cu)} Q ${f(-w / 2)} ${f(y0 + bow)} 0 ${f(y0)} Q ${f(w / 2)} ${f(y0 + bow)} ${f(w)} ${f(y0 - cu)}`);
    // NANH (`nanh`): hai răng nanh nhọn chĩa xuống ở hai bên dưới môi trên — nhe răng gầm gừ. Môi trên kéo xệch lên theo.
    const fang = clamp(s.nanh, 0, 1);
    if (e.nanh) e.nanh.setAttribute('d', fang < 0.03 ? '' : [-1, 1].map((g) => { const x = g * w * 0.5, top = y0 + 1.2 * k, len = (2.2 + 4.2 * fang) * k;
      return `M ${f(x - 2 * k)} ${f(top)} L ${f(x + 2 * k)} ${f(top)} L ${f(x + g * 0.4 * k)} ${f(top + len)} Z`; }).join(' '));
    const sau = mo * 21 * k;
    e.ham.setAttribute('d', mo < 0.02 ? '' : `M ${f(-w * 0.82)} ${f(y0 + 2.4 * k)} Q 0 ${f(y0 + 2.4 * k + sau * 1.5)} ${f(w * 0.82)} ${f(y0 + 2.4 * k)} Q 0 ${f(y0 + 5.5 * k)} ${f(-w * 0.82)} ${f(y0 + 2.4 * k)} Z`);
    // Lưỡi: dài theo `luoi` (thè ra ngoài), tối thiểu nằm lọt trong hàm khi miệng mở.
    const dai = Math.max(clamp(s.luoi, 0, 1) * 17 * k, mo * 9 * k), r = 4.6 * k;
    if (dai < 1.2) { e.luoi.setAttribute('d', ''); e.luoiNet.setAttribute('d', ''); return; }
    const ty = y0 + 3.6 * k, day = ty + Math.max(dai - r, 0.1);
    e.luoi.setAttribute('d', `M ${f(-r)} ${f(ty)} L ${f(-r)} ${f(day)} A ${f(r)} ${f(r)} 0 0 0 ${f(r)} ${f(day)} L ${f(r)} ${f(ty)} Z`);
    e.luoiNet.setAttribute('d', dai > r * 1.6 ? `M 0 ${f(ty + 1.5)} V ${f(day + r * 0.3)}` : '');
  }

  /** Đổi MÀU — dựng lại SVG từ bảng màu mới. `long` đổi thì `longToi` (chân xa, tai) tự tối theo. */
  doiMau(kieu = {}) {
    kieu = Object.fromEntries(Object.entries(kieu).map(([name, v]) => [RigThu.COLOR_ALIASES[name] || name, v]));
    assertColors(kieu, 'doiMau');
    const k = { ...kieu };
    if (k.long && !k.longToi) k.longToi = chinhSang(k.long, -0.2);
    Object.assign(this.mauKhai, k);
    this.mau = this.nv.mau = RigThu.#withAliases(this.mauKhai);
    this.#dungLai();
    return { ...this.mau };
  }

  /**
   * Đổi HÌNH DÁNG — trả về bộ đang dùng. Chỉ truyền núm cần đổi; giá trị bị kẹp vào khoảng
   * hợp lệ. Dựng lại SVG (bán kính thân, đùi… nằm trong markup), trạng thái và timeline còn nguyên.
   *   headSize · bodyLength · bodyThickness · legLength · tailLength · earSize   hệ số, 1 = gốc
   *   tailCurl                                                                    −1…1, cộng vào độ cuộn
   */
  setShape(changes = {}) {
    for (const [key, value] of Object.entries(changes)) {
      if (!(key in SHAPE_RANGE)) throw new Error(`[character] no shape dial "${key}" (available: ${Object.keys(SHAPE_RANGE).join(', ')})`);
      if (!Number.isFinite(value)) throw new Error(`[character] shape.${key}: ${JSON.stringify(value)} must be a number`);
      this.shape[key] = clamp(value, SHAPE_RANGE[key][0], SHAPE_RANGE[key][1]);
    }
    const palette = this.nv.mau;
    this.nv = shapedSpecies(this.base, this.shape);
    this.nv.mau = palette;
    this.#dungLai();
    return { ...this.shape };
  }
  static SHAPE_RANGE = SHAPE_RANGE;

  datNghi() { Object.assign(this.s, this.NGHI); this.apDung(); }

  /**
   * ĐEO / THÁO phụ kiện — có hiệu lực ngay và suốt mọi động tác sau (không phải một động tác trên timeline):
   *   wear('cone')       loa chống liếm sau mổ          wear('bandage')   băng ở chân trước phía người xem
   *   wear('cone', false) tháo ra. Trả về chính rig để gọi nối.
   */
  wear(kind, on = true) {
    if (!WEARABLES.includes(kind)) throw new Error(`[character] wear: no accessory "${kind}" (available: ${WEARABLES.join(', ')})`);
    if (on) this.wearing.add(kind); else this.wearing.delete(kind);
    this.apDung();
    return this;
  }
  static WEARABLES = WEARABLES;

  /** Tên tiếng Việt của từng động tác — cho giao diện. */
  static TEN_DONG_TAC = {
    idle: 'Đứng yên', walk: 'Đi', enter: 'Chạy vào', exit: 'Chạy ra', tiltHead: 'Nghiêng đầu',
    wagTail: 'Vẫy đuôi', bark: 'Sủa', sit: 'Ngồi', jump: 'Nhảy mừng', beg: 'Đứng xin', givePaw: 'Bắt tay', sniff: 'Đánh hơi',
    meow: 'Kêu meo', purr: 'Gừ gừ', lickPaw: 'Liếm chân', stretch: 'Vươn vai', hiss: 'Xù lông', tailSwish: 'Quẫy đuôi', pounce: 'Rình vồ',
    sleep: 'Ngủ', unwell: 'Mệt / ốm',
    hop: 'Nhảy cóc', thump: 'Giậm chân',
    rub: 'Dụi vào chân', fetch: 'Chạy nhặt bóng', greet: 'Mừng chủ', play: 'Rủ chơi', goIn: 'Vào lồng', comeOut: 'Ra khỏi lồng',
    shakeOff: 'Rũ nước', sneeze: 'Hắt hơi', pant: 'Thở hổn hển', yawn: 'Ngáp',
    express: 'Biểu cảm', mood: 'Giữ nét mặt',
    chew: 'Nhai', scratchItch: 'Gãi ngứa', limp: 'Đi khập khiễng', tremble: 'Run sợ', eat: 'Ăn', drink: 'Uống nước', cough: 'Ho', openMouth: 'Há miệng',
  };

  /* ------------------------------------------------------------ tiện ích */

  // `lazy: false`: xem chú thích ở `tl()` của rig-svg.js.
  tl() { return gsap.timeline({ paused: true, defaults: { lazy: false }, onUpdate: () => this.apDung(), onComplete: () => this.apDung() }); }

  #khep(t, d = 0.4, at = '>', giu = {}) {
    // `x` không thuộc tư thế nghỉ: con vật đi tới đâu thì đứng lại ở đó (xem rig-svg.js).
    // `ngoi` (đang ngồi) và `huong` (đang quay về bên nào) là THẾ ĐỨNG: động tác xong thì trả về
    // đúng giá trị lúc nó bắt đầu chứ không về tư thế nghỉ — chó đã `sitDown()` thì sủa, nghiêng
    // đầu xong vẫn ngồi; con vật đã `face('left')` thì vẫn quay trái. (Như rig người.)
    const { x, ...so } = this.NGHI;
    so.ngoi = this.s.ngoi; so.huong = this.s.huong; so.nam = this.s.nam;
    // Đang NẰM (hoặc động tác này đặt nằm xuống): khép về dáng nằm, không ngồi — trừ khoá nào động tác tự giữ.
    const lying = (giu.nam ?? so.nam) > 0.5;
    if (lying) Object.assign(so, LIE, { ngoi: 0 });
    t.to(this.s, { ...so, ...giu, duration: d, ease: 'power2.inOut' }, at);
    return t;
  }
  #chop(t, at) {
    // Mở lại tới độ mở của nét mặt nghỉ (đang `mood('sleepy')` thì mắt díp), không phải mở to — con mèo buồn ngủ chớp
    // mắt một cái là tỉnh hẳn dưới dấu "zzz" (cảnh thử đợt 13).
    t.to(this.s, { matY: 1, duration: 0.07, ease: 'power1.in' }, at).to(this.s, { matY: this.NGHI.matY, duration: 0.11, ease: 'power1.out' }, at + 0.07);
  }
  // Đứng dậy nếu đang ngồi (mèo nghỉ ở dáng ngồi; chó sau `sitDown`); trả về thời điểm đứng xong.
  #dung(t, at = 0) {
    if (!this.s.ngoi) return at;
    t.to(this.s, { ngoi: 0, duration: 0.32, ease: 'power2.inOut' }, at);
    return at + 0.32;
  }
  // Vẫy đuôi `n` nhịp quanh góc `tam`, biên độ `bien` độ, mỗi nhịp `h` giây.
  #vay(t, at, n, bien, h, tam = 0) {
    for (let i = 0; i < n; i++) t.to(this.s, { duoi: tam + (i % 2 ? -bien : bien), duration: h, ease: 'sine.inOut' }, at + i * h);
    return at + n * h;
  }

  /* ------------------------------------------------------------ bước đi
   * Bốn chân là HÀM CỦA PHA: chân trụ trượt lùi đều (60% chu kỳ), chân vung nhấc lên
   * đưa tới (40%). Hai cặp chéo lệch nhau nửa chu kỳ — kiểu đi nước kiệu.
   */
  #buoc(f, a, A, cao) {
    // THỎ nhảy cóc: mỗi chu kỳ một cú bật — cả thân vọt lên theo nửa vòng sin, chân sau duỗi ra sau, chân trước với ra
    // trước lúc bay; hai chân mỗi cặp đi cùng nhau.
    if (this.nv.gait === 'hop') {
      const c = ((f % 1) + 1) % 1, fly = Math.sin(Math.PI * c);
      return { y: -cao * 2.2 * fly * a, tnX: A * 0.9 * fly * a, txX: A * 0.9 * fly * a, snX: -A * 1.1 * fly * a, sxX: -A * 1.1 * fly * a, tnY: 4 * fly * a, txY: 4 * fly * a,
               snY: 0, sxY: 0, truocY: -3 * fly * a, sauY: 2 * fly * a, dauY: -2 * fly * a, duoi: 0 };
    }
    const chan = (p) => { p = ((p % 1) + 1) % 1;
      if (p < 0.6) return { x: A * (1 - 2 * p / 0.6), y: 0 };
      const u = (p - 0.6) / 0.4; return { x: -A + 2 * A * mem(u), y: cao * Math.sin(Math.PI * u) }; };
    const c1 = chan(f), c2 = chan(f + 0.5), nh = Math.cos(4 * Math.PI * f);
    return { tnX: c1.x * a, tnY: c1.y * a, sxX: c1.x * a, sxY: c1.y * a, txX: c2.x * a, txY: c2.y * a, snX: c2.x * a, snY: c2.y * a,
             truocY: -1.6 * nh * a, sauY: 1.6 * nh * a, dauY: 1.4 * nh * a, duoi: 7 * Math.sin(2 * Math.PI * f) * a };
  }
  // Đặt `chuKy` chu kỳ bước vào timeline; `quang` ≠ 0 thì dời cả con đúng chừng ấy (chân trụ không trượt).
  #di(t, at, chuKy, h, { vao = true, ra = true, quang = 0, x0 = 0, A = 13, cao = 9, bob = 1 } = {}) {
    const s = this.s;
    const bao = (c) => (vao ? mem(c / 0.5) : 1) * (ra ? mem((chuKy - c) / 0.5) : 1);
    // Chân trụ lùi 2A trong 0.6 chu kỳ ⇒ thân tiến (2A/0.6)·biên độ mỗi chu kỳ. Lập bảng quãng đường.
    const M = 60, n = Math.round(chuKy * M), X = [0];
    for (let i = 1; i <= n; i++) X.push(X[i - 1] + (2 * A / 0.6) * bao(i / M) / M);
    const tiLe = quang ? Math.abs(quang) / X[n] : 0, dau = quang < 0 ? -1 : 1;
    const dat = (c) => {
      const a = bao(c);
      const step = this.#buoc(c, a, A * (tiLe ? Math.min(1.35, Math.max(0.5, tiLe)) : 1), cao);
      // `bob` > 1: ĐI KHẬP KHIỄNG — ngực và đầu chúi xuống mạnh mỗi khi chân trước lành chịu sức (xem `limp`).
      if (bob !== 1) { step.truocY *= bob; step.dauY *= bob; }
      Object.assign(s, step);
      if (quang) { const v = clamp(c, 0, chuKy) * M, i = Math.min(n - 1, Math.floor(v)); s.x = x0 + dau * tiLe * (X[i] + (X[i + 1] - X[i]) * (v - i)); }
    };
    // Đổ qua SETTER chứ không qua `onUpdate` — tua bằng seek() hay tua ngược vẫn đúng (xem rig-svg.js).
    const pr = { _c: 0, get c() { return this._c; }, set c(v) { this._c = v; dat(v); } };
    t.to(pr, { c: chuKy, duration: chuKy * h, ease: 'none' }, at);
    return at + chuKy * h;
  }

  /**
   * Đi. `walk()` bước tại chỗ; `walk(4, 120)` đi thật 120 đơn vị về phía đầu rồi dừng,
   * `walk(4, -120)` quay đầu lại rồi đi về phía kia. Vị trí xuất phát đọc lúc dựng timeline.
   */
  walk(buoc = 4, quang = 0) {
    const t = this.tl(), s = this.s, x0 = s.x;
    let at = this.#dung(t, 0);
    // Đi về phía nào thì quay đầu về phía ấy; đi xong quay lại hướng ĐANG GIỮ (xem `face`).
    const held = s.huong < 0 ? -1 : 1, dir = quang < 0 ? -1 : quang > 0 ? 1 : held;
    if (dir !== held) { t.to(s, { huong: dir, duration: 0.22, ease: 'power1.inOut' }, at); at += 0.22; }
    t.to(s, { taiL: 0.5, taiR: 0.5, cuoi: 0.7, duration: 0.2 }, 0);
    // Quãng NGẮN thì đi thong thả (40 đơn vị mỗi nhịp, nửa giây một nhịp). Quãng dài mà giữ nhịp ấy thì
    // con vật mất gần chục giây để băng qua khung hình — nên đổi sang chạy lúp xúp: sải dài hơn, nhịp nhanh hơn.
    const far = Math.abs(quang) > 160;
    const chuKy = quang ? Math.max(2, Math.round(Math.abs(quang) / (far ? 62 : 40))) : buoc / 2;
    at = this.#di(t, at, chuKy, far ? 0.4 : 0.5, far ? { quang, x0, A: 16, cao: 11 } : { quang, x0 });
    this.#khep(t, 0.4, at, quang ? { x: x0 + quang, huong: dir } : {});
    if (dir !== held) t.to(s, { huong: held, duration: 0.22, ease: 'power1.inOut' }, '>');
    return t;
  }

  // Nhịp chạy cho một quãng `far`: quãng ngắn thì lúp xúp như trước (52 đơn vị mỗi chu kỳ 0,36 s); quãng DÀI (cảnh
  // rộng) thì phi — sải dài hơn, nhịp nhanh hơn — để băng qua nửa khung hình trong khoảng ba giây chứ không phải năm.
  #pace(far) {
    if (far <= 380) return { cycles: Math.max(6, Math.round(far / 52)), beat: 0.36, A: 16, lift: 11 };
    return { cycles: Math.max(6, Math.round(far / 86)), beat: 0.3, A: 22, lift: 15 };
  }

  // Quãng từ chỗ đứng gốc ra hẳn ngoài khung hình về phía `dir` — xem `#offstage` trong rig-svg.js.
  #offstage(dir) {
    const frame = this.svg.getBoundingClientRect();
    const scale = Math.min(frame.width / KHUNG.w, frame.height / KHUNG.h);
    if (!(scale > 0)) return 300;
    const stage = (this.svg.closest('[data-composition-id]') || this.svg.ownerDocument.documentElement).getBoundingClientRect();
    const centre = frame.left + frame.width / 2;
    return clamp((dir > 0 ? stage.right - centre : centre - stage.left) / scale + 110, 300, 700);
  }

  /** Chạy VÀO từ ngoài khung hình rồi dừng ở chỗ của mình. `from`: 'left' (mặc định) hoặc 'right'; `distance`: quãng chạy, bỏ trống thì tự tính. */
  enter(from = 'left', distance = null) {
    const t = this.tl(), s = this.s, dir = from === 'right' ? -1 : 1, far = distance > 0 ? distance : this.#offstage(-dir);
    t.set(s, { x: -far * dir, mo: 1, ngoi: 0, huong: dir, cuoi: 0.8, taiL: 0.6, taiR: 0.6 }, 0);
    const run = this.#pace(far), at = this.#di(t, 0, run.cycles, run.beat, { vao: false, quang: far * dir, x0: -far * dir, A: run.A, cao: run.lift });
    const shown = { get v() { return 0; }, set v(v) { s.mo = Math.min(1, v * at / 0.2); s.ngoi = 0; s.huong = dir; } };       // hiện, ĐỨNG và quay đúng hướng suốt quãng chạy — `set` ở trên không được ghi khi chạy trong `sequence()` (xem `enter` trong rig-svg.js): mèo từng trượt vào trong dáng ngồi
    t.to(shown, { v: 1, duration: at, ease: 'none' }, 0);
    this.#khep(t, 0.4, at, { x: 0, ngoi: this.NGHI.ngoi, huong: dir });    // vào xong: về dáng nghỉ của giống, đầu vẫn quay về hướng vừa chạy
    return t;
  }

  /* ----------------------------------------------------------- thế đứng */

  // Động tác đổi THẾ ĐỨNG và giữ nguyên cho các động tác sau.
  // `sleep` cũng đổi thế: ngủ xong con vật vẫn NẰM (thức dậy tại chỗ).
  static STANCE = ['sitDown', 'standUp', 'face', 'lieDown', 'sleep', 'goIn', 'comeOut'];
  static FLIP_MIN = 0.3;                 // bề ngang nhỏ nhất của con vật giữa một cú lật hướng

  /** Hoành độ TÂM con vật trên màn hình (px), tính cả quãng đã đi. */
  centerX() {
    const frame = this.svg.getBoundingClientRect();
    const scale = Math.min(frame.width / KHUNG.w, frame.height / KHUNG.h) || 1;
    return frame.left + frame.width / 2 + this.s.x * scale;
  }

  /**
   * KHUNG NGẮM cho máy quay (`shot` trong index.js), đơn vị khung 400 × 330, ở trạng thái hiện tại.
   *   'face'  cận mặt        'chest' / 'full'  cả con vật
   */
  /** Đang được bế: hình nằm trong tay một người khác (không trong host của nó). */
  isCarried() { return !!(this.host && this.svg && this.svg.parentNode && this.svg.parentNode !== this.host && this.svg.ownerSVGElement); }

  shotBox(kind = 'full') {
    const { S } = this.#khung(), d = this.nv.dau, k = this.s.huong < 0 ? -1 : 1;
    const s = this.isCarried() ? { ...this.s, x: 0, y: 0 } : this.s;                // đang được bế: không có phần dời (xem apDung)
    const headX = 200 + (S.x + d.dx - 200) * k + s.x, headY = S.y + d.dy + s.y;
    if (kind === 'face') return { x: headX - 66, y: headY - 64, width: 132, height: 132 };
    if (kind !== 'chest' && kind !== 'full') throw new Error(`[character] no shot "${kind}" (available: face, chest, full)`);
    const top = headY - 72, bottom = DAT + 10;
    return { x: 200 + s.x - 125, y: top, width: 250, height: bottom - top };
  }

  /** NGỒI XUỐNG và ở yên trong dáng ngồi. */
  sitDown() { return this.#khep(this.tl(), 0.4, 0, { ngoi: 1 }); }

  /** ĐỨNG DẬY và ở yên trong dáng đứng (mèo vốn nghỉ ở dáng ngồi). Đang nằm thì cũng đứng dậy. */
  standUp() { return this.#khep(this.tl(), this.s.nam > 0.5 ? 0.55 : 0.35, 0, { ngoi: 0, nam: 0 }); }

  /** NẰM XUỐNG và ở yên trong dáng nằm: các động tác sau (vẫy đuôi, gừ gừ, nghiêng đầu…) diễn khi đang nằm. `standUp` để dậy. */
  lieDown() { return this.#khep(this.tl(), 0.6, 0, { nam: 1, ngoi: 0 }); }

  /**
   * NGỦ `dur` giây: nằm xuống (nếu chưa nằm), gục đầu, nhắm mắt, tai thả, thở chậm và sâu, đuôi cuộn vào thân. Xong thì
   * mở mắt, vẫn NẰM (thức dậy tại chỗ). `standUp()` để dậy hẳn.
   */
  sleep(dur = 3) {
    const t = this.tl(), s = this.s;
    t.to(s, { ...LIE, nam: 1, ngoi: 0, duration: s.nam > 0.5 ? 0.2 : 0.6, ease: 'power2.inOut' }, 0);
    t.to(s, { dauY: 16, dauX: 6, dau: -4, matY: 1, taiL: -0.5, taiR: -0.5, duoi: -20, duoiCong: 0.6, cuoi: 0.5, duration: 0.6, ease: 'sine.inOut' }, 0.3);
    // Thở ngủ: chậm (1,6 s một nhịp) và sâu hơn thở thường; đầu nhấp nhô theo.
    for (let a = 0.9; a + 1.6 <= 0.9 + dur; a += 1.6) {
      t.to(s, { tho: 1, dauY: 17.5, duration: 0.8, ease: 'sine.inOut' }, a).to(s, { tho: 0, dauY: 16, duration: 0.8, ease: 'sine.inOut' }, a + 0.8);
    }
    this.#khep(t, 0.5, 0.9 + dur, { nam: 1 });
    return t;
  }

  /** MỆT / ỐM `hold` giây: tai cụp, mắt lờ đờ, đầu cúi thấp, đuôi rủ, thở dài một hơi. Đứng hay nằm đều được. */
  unwell(hold = 2.5) {
    const t = this.tl(), s = this.s;
    t.to(s, { dauY: 10, dau: -3, matY: 0.55, nhinY: 1.2, taiL: -1, taiR: -1, duoi: -65, duoiCong: -0.2, cuoi: -0.3, duration: 0.6, ease: 'sine.inOut' }, 0);
    // Thở dài: một hơi sâu, đầu trĩu xuống thêm rồi thôi.
    t.to(s, { tho: 1, dauY: 13, duration: 0.7, ease: 'sine.inOut' }, 0.7).to(s, { tho: 0, dauY: 10, duration: 0.9, ease: 'sine.inOut' }, 1.4);
    if (hold > 2) this.#chop(t, 0.6 + hold * 0.6);
    this.#khep(t, 0.6, 0.6 + hold);
    return t;
  }

  /**
   * QUAY ĐẦU về một phía và giữ: face('left') · face('right') · face(element) · face(otherRig).
   * Con vật đứng nghiêng nên chỉ có hai hướng.
   */
  face(target = 'right') {
    let side = target === 'left' ? -1 : 1;
    if (target && typeof target === 'object') {
      const box = target.getBoundingClientRect ? target.getBoundingClientRect() : null;
      const dx = (typeof target.centerX === 'function' ? target.centerX() : box.left + box.width / 2) - this.centerX();
      side = dx < 0 ? -1 : 1;
    }
    return this.#khep(this.tl(), 0.3, 0, { huong: side });
  }

  /** Chạy RA khỏi khung và ẩn đi. `to`: 'right' (mặc định) hoặc 'left'. */
  exit(to = 'right', distance = null) {
    const t = this.tl(), s = this.s, dir = to === 'left' ? -1 : 1, x0 = s.x;
    let at = this.#dung(t, 0);
    // Đang quay đầu về phía kia thì QUAY LẠI rồi mới chạy: bản trước cứ thế chạy sang phải — con vật đã
    // `face('left')` là đi giật lùi ra khỏi khung. Xuất phát từ chỗ đang đứng (`x0`), không phải từ giữa.
    if ((s.huong < 0 ? -1 : 1) !== dir) { t.to(s, { huong: dir, duration: 0.22, ease: 'power1.inOut' }, at); at += 0.22; }
    const far = Math.max(60, (dir * (distance > 0 ? distance : this.#offstage(dir)) - x0) * dir);
    const run = this.#pace(far);
    at = this.#di(t, at, run.cycles, run.beat, { ra: false, quang: dir * far, x0, A: run.A, cao: run.lift });
    t.to(s, { mo: 0, duration: 0.2 }, at - 0.2);
    this.#khep(t, 0.2, at, { x: x0 + dir * far, mo: 0, huong: dir });
    return t;
  }

  /* ------------------------------------------------------- động tác chung */

  idle(dur = 4) {
    const t = this.tl(), s = this.s, ck = 2.6, meo = this.nv.loai === 'cat';
    for (let a = 0; a < dur; a += ck) { const d = Math.min(ck, dur - a);
      t.to(s, { tho: 1, duration: d * 0.45, ease: 'sine.inOut' }, a).to(s, { tho: 0, duration: d * 0.55, ease: 'sine.inOut' }, a + d * 0.45); }
    for (let b = nhieu(0.5, 1.2); b < dur - 0.3; b += nhieu(1.6, 3.4)) this.#chop(t, b);
    if (meo) {                                            // mèo: chóp đuôi lượn chậm
      for (let a = 0; a < dur - 0.2; a += 1.4) t.to(s, { duoiCong: (Math.round(a / 1.4) % 2 ? -0.16 : 0.16), duration: Math.min(1.4, dur - a), ease: 'sine.inOut' }, a);
    } else this.#vay(t, 0, Math.max(2, Math.floor(dur / 0.55)), 7, dur / Math.max(2, Math.floor(dur / 0.55)));
    if (dur > 2.4) {                                      // giật tai một cái, liếc mắt
      const a = dur * 0.45, tai = ngau() < 0.5 ? 'taiL' : 'taiR';
      const N = this.NGHI;                                  // mọi thứ trả về tư thế nghỉ của con vật, không về 0
      t.to(s, { [tai]: 0.9, duration: 0.08 }, a).to(s, { [tai]: N[tai], duration: 0.2 }, a + 0.1);
      t.to(s, { nhinX: N.nhinX + 2, dau: N.dau + 3, duration: 0.25, ease: 'power2.out' }, a + 0.4).to(s, { nhinX: N.nhinX, dau: N.dau, duration: 0.35, ease: 'power2.inOut' }, a + 1.3);
    }
    t.to(s, { duoi: this.NGHI.duoi, duoiCong: this.NGHI.duoiCong, duration: 0.2 }, dur - 0.2);
    return t;
  }

  tiltHead() {
    const t = this.tl(), s = this.s;
    t.to(s, { dau: 20, dauX: 4, taiL: 0.9, taiR: 0.6, nhinY: -0.6, cuoi: 0.2, duration: 0.3, ease: 'back.out(1.6)' }, 0);
    this.#chop(t, 0.55);
    t.to(s, { dau: -14, dauX: -3, taiL: 0.5, taiR: 0.9, duration: 0.35, ease: 'power2.inOut' }, 1.0);
    this.#chop(t, 1.5);
    this.#khep(t, 0.4, 1.9);
    return t;
  }

  /* ------------------------------------------------ TRIỆU CHỨNG, CHĂM SÓC */

  /**
   * GÃI NGỨA: ngồi xuống, co chân sau phía người xem lên cổ gãi lia lịa `times` nhịp, đầu nghiêng về phía chân, mắt lim
   * dim — ngứa da, ve rận. Chân sau chibi ngắn không tới tai: nó gãi ở cổ, nhìn vẫn ra "gãi tai".
   */
  scratchItch(times = 8) {
    const t = this.tl(), s = this.s, nv = this.nv, C = nv.chanS;
    t.to(s, { ngoi: 1, duration: 0.3, ease: 'power2.inOut' }, 0);
    // Đích của bàn chân: cổ, ngay dưới tai — tính ở dáng NGỒI (xem #khung); khớp chân tự kéo về trong tầm với.
    const T = nv.chanT, shoulderY = Math.min(nv.S0.y, DAT - T.rong * 0.36 - 4 - 0.96 * (T.a + T.b)), neck = { x: nv.S0.x - 9 + nv.dau.dx * 0.35, y: shoulderY + nv.dau.dy * 0.45 };
    const footX = neck.x - (nv.H0.x + 52), footY = (DAT - C.rong * 0.36) - neck.y;
    t.to(s, { snX: footX, snY: footY, dau: 22, dauX: -9, dauY: 9, matY: 0.55, cuoi: 0.6, mieng: 0.25, luoi: nv.loai === 'dog' ? 0.6 : 0, taiR: -0.4, duration: 0.3, ease: 'power2.out' }, 0.2);
    for (let i = 0; i < times * 2; i++) t.to(s, { snY: footY + (i % 2 ? 10 : -8), snX: footX + (i % 2 ? -5 : 4), dau: i % 2 ? 19 : 25, duration: 0.07, ease: 'sine.inOut' }, 0.5 + i * 0.07);
    const end = 0.5 + times * 0.14;
    this.#khep(t, 0.4, end);
    return t;
  }

  /**
   * ĐI KHẬP KHIỄNG: một chân trước co lên không dám chạm đất, đầu và ngực chúi xuống mỗi bước, tai cụp, đuôi rủ — đau
   * chân, xương khớp. `limp()` bước tại chỗ; `limp(4, 120)` đi thật 120 đơn vị (như `walk`).
   */
  limp(buoc = 4, quang = 0) {
    const t = this.tl(), s = this.s, x0 = s.x;
    let at = this.#dung(t, 0);
    const held = s.huong < 0 ? -1 : 1, dir = quang < 0 ? -1 : quang > 0 ? 1 : held;
    if (dir !== held) { t.to(s, { huong: dir, duration: 0.22, ease: 'power1.inOut' }, at); at += 0.22; }
    t.to(s, { tnNhac: 1, tnGoc: 62, taiL: -0.7, taiR: -0.7, cuoi: -0.2, duoi: -45, matY: 0.25, duration: 0.25, ease: 'power2.out' }, at);
    const chuKy = quang ? Math.max(2, Math.round(Math.abs(quang) / 32)) : buoc / 2;
    at = this.#di(t, at + 0.15, chuKy, 0.65, { quang, x0, A: 10, cao: 7, bob: 3.2 });
    this.#khep(t, 0.4, at, quang ? { x: x0 + quang, huong: dir } : {});
    if (dir !== held) t.to(s, { huong: held, duration: 0.22, ease: 'power1.inOut' }, '>');
    return t;
  }

  /**
   * RUN SỢ `hold` giây: thụp thấp người, tai ép ra sau, đuôi cụp giữa hai chân, mắt mở to — sợ đi khám, sợ tiếng pháo.
   * Người rung bần bật suốt lúc ấy.
   */
  tremble(hold = 2) {
    const t = this.tl(), s = this.s, N = this.NGHI, dog = this.nv.loai === 'dog';
    // Đứng dậy (mèo nghỉ ở dáng ngồi) rồi thụp xuống; đuôi CỤP: chó gỡ độ cuộn của đuôi, mèo đuôi dài thì vòng sát
    // sàn ra sau chứ không chọc xuống dưới nền.
    const up = this.#dung(t, 0);
    t.to(s, { truocY: 9, sauY: 12, dauY: 9, dauX: -4, dau: 6, taiL: -1.6, taiR: -1.6, duoi: dog ? -112 : -84, duoiCong: dog ? -1.1 : 0.45, dongTu: 1.7, nhinY: -0.8, cuoi: -0.6, mieng: 0,
              duration: 0.3, ease: 'power2.out' }, up);
    // Run: lệch qua lại 1,3 đơn vị, 0,045 s một nhịp — nhanh hơn mọi nhịp thở hay bước chân, đọc ngay ra "run".
    for (let a = up + 0.3, i = 0; a < up + 0.3 + hold; a += 0.045, i++) t.to(s, { sauX: i % 2 ? -1.3 : 1.3, truocX: i % 2 ? 1 : -1, dauX: -4 + (i % 2 ? 1 : -1), duration: 0.045, ease: 'none' }, a);
    this.#chop(t, up + 0.3 + hold * 0.55);
    this.#khep(t, 0.45, up + 0.3 + hold, { dongTu: N.dongTu });
    return t;
  }

  // Cúi đầu xuống cái bát trước mặt (ăn, uống): dáng chung — trả về thời điểm đã cúi xong.
  #toBowl(t) {
    const s = this.s, nv = this.nv, at = this.#dung(t, 0);
    // Mõm xuống tới miệng bát trên sàn (cao ≈ 18 đơn vị): vai hạ (chân trước khuỵu) và đầu thò ra trước. Độ cúi tính theo
    // hình thể từng loài — một con số chung thì mèo (đầu thấp hơn chó) cúi lút đầu xuống dưới nền.
    this.bowlDip = DAT - 30 - (nv.S0.y + 20 + nv.dau.dy + nv.mom.y * (nv.headScale || 1));
    t.to(s, { truocY: 20, dauX: nv.dau.dx + 4, dauY: this.bowlDip, dau: 18, taiL: 0.2, taiR: 0.2, nhinY: 1.6, matY: 0.3, cuoi: 0.5, duration: 0.4, ease: 'power2.inOut' }, at);
    return at + 0.4;
  }

  /** ĂN `dur` giây: cúi xuống bát (đạo cụ `bowl`), nhai từng miếng, đầu nhấp nhô; chó vẫy đuôi chầm chậm. */
  eat(dur = 2) {
    const t = this.tl(), s = this.s, at = this.#toBowl(t);
    for (let a = at, i = 0; a + 0.2 <= at + dur; a += 0.2, i++) t.to(s, { mieng: i % 2 ? 0.05 : 0.4, dauY: this.bowlDip + (i % 2 ? 0 : 3), duration: 0.2, ease: 'sine.inOut' }, a);
    if (this.nv.loai === 'dog') this.#vay(t, at, Math.max(2, Math.floor(dur / 0.3)), 18, 0.3, 10);
    this.#khep(t, 0.4, at + dur);
    return t;
  }

  /** UỐNG NƯỚC `dur` giây: cúi xuống bát, lưỡi liếm nước từng nhịp. */
  drink(dur = 2) {
    const t = this.tl(), s = this.s, at = this.#toBowl(t);
    for (let a = at, i = 0; a + 0.16 <= at + dur; a += 0.16, i++) t.to(s, { luoi: i % 2 ? 0.1 : 0.9, mieng: i % 2 ? 0.1 : 0.3, dauY: this.bowlDip + (i % 2 ? 0 : 2), duration: 0.16, ease: 'sine.inOut' }, a);
    this.#khep(t, 0.4, at + dur);
    return t;
  }

  /** HO `times` tiếng: rướn cổ ra trước, mỗi tiếng ho ngực giật, miệng mở, mắt nhắm lại — bệnh hô hấp. */
  cough(times = 3) {
    const t = this.tl(), s = this.s;
    t.to(s, { dauX: 8, dauY: 8, dau: 8, taiL: -0.6, taiR: -0.6, cuoi: -0.3, duration: 0.25, ease: 'power2.out' }, 0);
    for (let i = 0; i < times; i++) {
      const a = 0.3 + i * 0.5;
      t.to(s, { truocY: 5, sauY: 2, dauY: 4, duration: 0.08, ease: 'power2.in' }, a)                                         // lấy hơi
       .to(s, { truocY: -3, sauY: -1, dauY: 13, dauX: 12, mieng: 0.75, matY: 0.85, duration: 0.1, ease: 'power3.out' }, a + 0.08)    // ho
       .to(s, { truocY: 0, sauY: 0, dauY: 8, dauX: 8, mieng: 0.05, matY: 0.2, duration: 0.25, ease: 'sine.inOut' }, a + 0.2);
    }
    this.#khep(t, 0.4, 0.4 + times * 0.5);
    return t;
  }

  /** HÁ MIỆNG `hold` giây: ngẩng cằm, há to — cho bác sĩ khám răng (`examine(pet, 'teeth')` của rig người). */
  openMouth(hold = 1.2) {
    const t = this.tl(), s = this.s;
    t.to(s, { dau: -10, dauY: -3, mieng: 0.95, luoi: 0.25, matY: 0.3, taiL: 0.3, taiR: 0.3, duration: 0.3, ease: 'power2.out' }, 0);
    t.to(s, { mieng: 0.85, duration: hold * 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.3);
    this.#khep(t, 0.35, 0.3 + hold);
    return t;
  }

  /**
   * DỤI VÀO CHÂN (người đứng cạnh): đuôi dựng cong, đầu và má dụi qua dụi lại, thân lắc theo, mắt lim dim — làm nũng,
   * mừng chủ. Đặt con vật sát chân người ấy.
   */
  rub(times = 4) {
    const t = this.tl(), s = this.s;
    const at = this.#dung(t, 0);
    t.to(s, { duoi: 34, duoiCong: 0.7, matY: 0.75, cuoi: 1, taiL: 0.2, taiR: 0.2, duration: 0.3, ease: 'power2.out' }, at);
    for (let i = 0; i < times * 2; i++) {
      const g = i % 2 ? -1 : 1;
      t.to(s, { dau: g * 13, dauX: g * 5, dauY: 3, truocX: g * 4, sauX: -g * 3, tho: i % 2 ? 0 : 1, duration: 0.24, ease: 'sine.inOut' }, at + 0.3 + i * 0.24);
    }
    this.#khep(t, 0.4, at + 0.3 + times * 0.48);
    return t;
  }

  /**
   * CHẠY NHẶT BÓNG: chạy ra `distance` đơn vị về phía đang quay mặt (bóng do người `throwBall` ném), cúi ngậm quả
   * bóng, quay lại chạy về chỗ cũ, đứng vẫy đuôi khoe bóng rồi nhả. Đi cặp với `throwBall` của người: chạy `delay` giây
   * sau khi bắt đầu (đợi bóng bay).
   */
  fetch(distance = 260, { delay = 0.7 } = {}) {
    const t = this.tl(), s = this.s, x0 = s.x, dir = s.huong < 0 ? -1 : 1, d = Math.max(60, distance);
    let at = this.#dung(t, 0);
    t.to(s, { taiL: 0.9, taiR: 0.9, cuoi: 1, mieng: 0.4, luoi: 0.6, nhinX: dir * 2, duration: 0.25 }, at);
    at = Math.max(at, delay);
    const run = this.#pace(d);
    at = this.#di(t, at, run.cycles, run.beat, { ra: false, quang: dir * d, x0, A: run.A, cao: run.lift });
    // Cúi ngậm bóng.
    t.to(s, { truocY: 14, dauX: 18, dauY: 34, dau: 14, mieng: 0.6, duration: 0.25, ease: 'power2.in' }, at);
    t.set(s, { ballMouth: 1 }, at + 0.25);
    t.to(s, { truocY: 0, dauX: 0, dauY: 0, dau: 0, mieng: 0.3, duration: 0.25, ease: 'power2.out' }, at + 0.28);
    at += 0.55;
    t.to(s, { huong: -dir, duration: 0.22, ease: 'power1.inOut' }, at); at += 0.22;
    at = this.#di(t, at, run.cycles, run.beat, { vao: false, quang: -dir * d, x0: x0 + dir * d, A: run.A, cao: run.lift });
    t.to(s, { huong: dir, duration: 0.22, ease: 'power1.inOut' }, at); at += 0.22;
    at = this.#vay(t, at, 8, 40, 0.11);
    t.set(s, { ballMouth: 0 }, at);
    this.#khep(t, 0.35, at, { x: x0, huong: dir });
    return t;
  }

  /**
   * MỪNG CHỦ: đứng dựng lên hai chân sau, hai chân trước chồm ra trước (lên chân người đứng trước mặt), đuôi vẫy lia lịa,
   * lưỡi thè, mắt híp — `hold` giây rồi xuống. Đặt con vật sát người, quay mặt về phía người ấy.
   */
  greet(hold = 1.4) {
    const t = this.tl(), s = this.s;
    const at = this.#dung(t, 0);
    t.to(s, { truocY: -38, truocX: 10, sauY: 2, tnNhac: 1, txNhac: 1, tnGoc: 118, txGoc: 108, dau: -8, dauY: -6, cuoi: 1, mieng: 0.55, luoi: 1, matY: 0.45, taiL: 0.8, taiR: 0.8,
              duration: 0.35, ease: 'back.out(1.6)' }, at);
    this.#vay(t, at + 0.2, Math.max(4, Math.round(hold / 0.1)), 46, 0.1, 20);
    for (let a = at + 0.35, i = 0; a < at + 0.35 + hold; a += 0.22, i++) t.to(s, { tnGoc: i % 2 ? 118 : 128, txGoc: i % 2 ? 112 : 102, truocY: i % 2 ? -38 : -34, duration: 0.22, ease: 'sine.inOut' }, a);
    this.#khep(t, 0.4, at + 0.35 + hold);
    return t;
  }

  /**
   * RỦ CHƠI: cúi rạp mời chơi (ngực sát đất, mông nhổm, đuôi vẫy), rồi nhảy qua lại hai lần — cho hai con vật đối mặt nhau
   * chạy cùng lúc trong một `together` là chúng đùa với nhau.
   */
  play(times = 2) {
    const t = this.tl(), s = this.s, x0 = s.x, dir = s.huong < 0 ? -1 : 1;
    const at = this.#dung(t, 0);
    t.to(s, { truocY: 22, truocX: 8, sauY: -6, tnX: 18, txX: 18, dauY: 12, dau: 6, cuoi: 1, mieng: 0.5, luoi: 0.6, taiL: 0.7, taiR: 0.7, duration: 0.3, ease: 'power2.out' }, at);
    this.#vay(t, at + 0.1, 6, 38, 0.12, 22);
    let a = at + 0.85;
    for (let i = 0; i < times; i++) {
      const g = i % 2 ? 1 : -1;
      t.to(s, { truocY: 0, sauY: 0, tnX: 0, txX: 0, dauY: 0, y: -26, x: x0 + g * dir * 18, tnY: 10, txY: 10, snY: 8, sxY: 8, duration: 0.2, ease: 'power2.out' }, a)
       .to(s, { y: 0, tnY: 0, txY: 0, snY: 0, sxY: 0, truocY: 14, duration: 0.18, ease: 'power2.in' }, a + 0.2);
      a += 0.45;
    }
    t.to(s, { x: x0, truocY: 0, duration: 0.25, ease: 'sine.inOut' }, a);
    this.#khep(t, 0.35, a + 0.25, { x: x0 });
    return t;
  }

  /**
   * VÀO LỒNG: đi `distance` đơn vị về phía đang quay mặt (vào trong lồng vận chuyển đặt ở đó) rồi NẰM xuống — và ở yên
   * trong đó (thế nằm, chỗ mới). Lồng che con vật nhờ thứ tự lớp: đặt lồng gần máy hơn chỗ con vật nằm (bối cảnh 3D: `z`
   * lớn hơn một chút; cảnh 2D: host của lồng SAU host con vật). `comeOut(distance)` đi ra.
   */
  goIn(distance = 90) {
    const t = this.tl(), s = this.s, x0 = s.x, dir = s.huong < 0 ? -1 : 1;
    let at = this.#dung(t, 0);
    at = this.#di(t, at, Math.max(2, Math.round(Math.abs(distance) / 40)), 0.5, { quang: dir * distance, x0 });
    this.#khep(t, 0.5, at, { x: x0 + dir * distance, nam: 1, ngoi: 0 });
    return t;
  }

  /** RA KHỎI LỒNG: đứng dậy, quay đầu ra phía cửa, đi `distance` đơn vị ra khỏi lồng, và giữ hướng vừa đi ra. */
  comeOut(distance = 120) {
    const t = this.tl(), s = this.s, x0 = s.x, held = s.huong < 0 ? -1 : 1, out = -held;
    let at = 0;
    if (s.nam > 0.5) { t.to(s, { nam: 0, ...Object.fromEntries(Object.keys(LIE).map((k) => [k, this.NGHI[k]])), duration: 0.5, ease: 'power2.inOut' }, 0); at = 0.5; }
    t.to(s, { huong: out, duration: 0.22, ease: 'power1.inOut' }, at); at += 0.22;
    at = this.#di(t, at, Math.max(2, Math.round(Math.abs(distance) / 40)), 0.5, { quang: out * distance, x0 });
    this.#khep(t, 0.4, at, { x: x0 + out * distance, huong: out, nam: 0 });
    return t;
  }

  /** RŨ NƯỚC sau khi tắm: cả người lắc mạnh từ đầu tới đuôi, tai văng ra, mắt nhắm. */
  shakeOff() {
    const t = this.tl(), s = this.s;
    const at = this.#dung(t, 0);
    t.to(s, { matY: 0.85, cuoi: 0.5, truocY: 3, sauY: 3, duration: 0.15 }, at);
    t.fromTo(s, { nuoc: 0 }, { nuoc: 1, duration: 0.75, ease: 'none', immediateRender: false }, at + 0.15);
    for (let i = 0; i < 10; i++) {
      const g = i % 2 ? -1 : 1, fade = 1 - i / 14;
      t.to(s, { dau: g * 18 * fade, dauX: g * 5 * fade, truocX: g * 4 * fade, sauX: -g * 3 * fade, taiL: g * 1.6 * fade, taiR: -g * 1.6 * fade, duoi: g * 35 * fade,
                duration: 0.07, ease: 'sine.inOut' }, at + 0.15 + i * 0.07);
    }
    this.#khep(t, 0.35, at + 0.9, { nuoc: 0 });
    return t;
  }

  /** HẮT HƠI: hít vào ngửa đầu, rồi gập đầu xuống thật nhanh, mắt nhắm, miệng bật mở. */
  sneeze() {
    const t = this.tl(), s = this.s;
    t.to(s, { dau: -14, dauY: -5, matY: 0.6, mieng: 0.35, taiL: 0.4, taiR: 0.4, duration: 0.35, ease: 'sine.in' }, 0);
    // Gập đầu thật mạnh và GIỮ một nhịp (0,25 s): chỉ vài khung thì ở khung trung không ai nhận ra (Gemini, đợt 5).
    t.to(s, { dau: 24, dauY: 13, dauX: 6, matY: 1, mieng: 0.8, truocY: 6, sauY: -2, taiL: -0.9, taiR: -0.9, duration: 0.1, ease: 'power3.out' }, 0.45);
    t.to(s, { dau: 4, dauY: 3, dauX: 0, mieng: 0.05, matY: 0.3, truocY: 0, sauY: 0, duration: 0.3, ease: 'sine.inOut' }, 0.8);
    this.#chop(t, 1.25);
    this.#khep(t, 0.35, 1.45);
    return t;
  }

  /** THỞ HỔN HỂN `dur` giây: há miệng, lưỡi thè dài, ngực phập phồng nhanh — trời nóng, say nắng, vừa chạy xong. */
  pant(dur = 2) {
    const t = this.tl(), s = this.s;
    t.to(s, { mieng: 0.75, luoi: 1, matY: 0.35, taiL: -0.3, taiR: -0.3, cuoi: 0.3, duration: 0.25 }, 0);
    for (let a = 0.25, i = 0; a + 0.13 <= 0.25 + dur; a += 0.13, i++) t.to(s, { tho: i % 2 ? 0 : 1, dauY: i % 2 ? 0 : 2, mieng: i % 2 ? 0.7 : 0.82, duration: 0.13, ease: 'sine.inOut' }, a);
    this.#khep(t, 0.4, 0.25 + dur);
    return t;
  }

  /** NGÁP: ngửa đầu, há miệng thật to, nhắm mắt, lưỡi cong, rồi chép miệng. */
  yawn() {
    const t = this.tl(), s = this.s;
    t.to(s, { dau: -12, dauY: -4, mieng: 1, luoi: 0.3, matY: 1, taiL: -0.5, taiR: -0.5, duration: 0.5, ease: 'sine.inOut' }, 0);
    t.to(s, { mieng: 0.05, luoi: 0, dau: 0, dauY: 0, matY: 0.4, duration: 0.35, ease: 'sine.inOut' }, 1.15);
    t.to(s, { mieng: 0.15, duration: 0.1, yoyo: true, repeat: 1 }, 1.55);
    this.#khep(t, 0.35, 1.8);
    return t;
  }

  /* ---------------------------------------------------------------- THỎ */

  /** NHẢY CÓC tại chỗ `times` cú: thụp lấy đà, bật lên (chân sau duỗi, tai ngả ra sau), đáp xuống. */
  hop(times = 2) {
    const t = this.tl(), s = this.s;
    let at = this.#dung(t, 0);
    for (let i = 0; i < times; i++) {
      t.to(s, { sauY: 6, truocY: 4, duration: 0.12, ease: 'power2.in' }, at)
       .to(s, { y: -40, sauY: -2, truocY: -6, snX: -16, sxX: -16, tnX: 12, txX: 12, taiL: -0.6, taiR: -0.6, duration: 0.22, ease: 'power2.out' }, at + 0.12)
       .to(s, { y: 0, snX: 0, sxX: 0, tnX: 0, txX: 0, sauY: 4, truocY: 3, taiL: 0.2, taiR: 0.2, duration: 0.2, ease: 'power2.in' }, at + 0.34)
       .to(s, { sauY: 0, truocY: 0, duration: 0.12 }, at + 0.54);
      at += 0.66;
    }
    this.#khep(t, 0.35, at);
    return t;
  }

  /** GIẬM CHÂN cảnh giác: tai dựng thẳng, mắt mở to, chân sau giậm mạnh xuống đất hai cái. */
  thump(times = 2) {
    const t = this.tl(), s = this.s;
    t.to(s, { taiL: -0.25, taiR: -0.25, matY: -0.1, nhinX: 1.5, dauY: -4, duration: 0.25, ease: 'power2.out' }, 0);      // tai DỰNG THẲNG, khép vào nhau (dương là xoè ra)
    for (let i = 0; i < times; i++) {
      const a = 0.35 + i * 0.4;
      t.to(s, { snY: 14, sxY: 14, sauY: -4, duration: 0.12, ease: 'power2.out' }, a).to(s, { snY: 0, sxY: 0, sauY: 2, duration: 0.07, ease: 'power3.in' }, a + 0.12).to(s, { sauY: 0, duration: 0.1 }, a + 0.19);
    }
    this.#khep(t, 0.4, 0.45 + times * 0.4);
    return t;
  }

  /* ---------------------------------------------------------------- CHÓ */

  wagTail() {
    const t = this.tl(), s = this.s;
    t.to(s, { taiL: 0.8, taiR: 0.8, cuoi: 1, mieng: 0.45, luoi: 0.7, dau: -3, duration: 0.2, ease: 'power2.out' }, 0);
    this.#vay(t, 0.1, 12, 44, 0.11);        // đuôi chó ngắn: biên nhỏ hơn thì ở cỡ toàn cảnh không thấy vẫy
    for (let i = 0; i < 12; i++) t.to(s, { sauX: i % 2 ? -2.2 : 2.2, duration: 0.11, ease: 'sine.inOut' }, 0.1 + i * 0.11);   // lắc cả mông theo đuôi
    this.#chop(t, 0.7);
    this.#khep(t, 0.4, 1.5);
    return t;
  }

  bark(lan = 2) {
    const t = this.tl(), s = this.s;
    t.to(s, { taiL: 1, taiR: 1, duoi: 14, duration: 0.15 }, 0);
    let at = 0.15;
    for (let i = 0; i < lan; i++) {
      // Thụp nhẹ lấy đà rồi hất đầu lên sủa; ngực nảy theo. Miệng mở trong ba khung hình (0,12 s), không bật trong một.
      t.to(s, { dauY: 3, truocY: 2, duration: 0.07, ease: 'sine.in' }, at - 0.07)
       .to(s, { mieng: 0.95, dau: -15, dauY: -9, dauX: 4, truocY: -7, duoi: 22, taiL: 0.2, taiR: 0.2, duration: 0.12, ease: 'power2.out' }, at)
       .to(s, { mieng: 0.1, dau: 0, dauY: 0, dauX: 0, truocY: 0, duoi: 14, taiL: 1, taiR: 1, duration: 0.2, ease: 'power2.in' }, at + 0.14);
      at += 0.42;
    }
    this.#khep(t, 0.35, at + 0.1);
    return t;
  }

  /** Ngồi xuống, thè lưỡi thở một lúc rồi đứng dậy. */
  sit(giu = 1.6) {
    const t = this.tl(), s = this.s;
    t.to(s, { ngoi: 1, cuoi: 0.9, duoi: -22, duration: 0.4, ease: 'back.out(1.3)' }, 0);
    t.to(s, { mieng: 0.5, luoi: 1, duration: 0.2 }, 0.35);
    for (let a = 0.5; a < 0.4 + giu; a += 0.26) t.to(s, { tho: 1, duration: 0.13, ease: 'sine.inOut' }, a).to(s, { tho: 0, duration: 0.13, ease: 'sine.inOut' }, a + 0.13);
    this.#chop(t, 0.4 + giu * 0.5);
    this.#khep(t, 0.4, 0.5 + giu);
    return t;
  }

  jump(lan = 2) {
    const t = this.tl(), s = this.s;
    t.to(s, { cuoi: 1, mieng: 0.5, luoi: 0.5, taiL: 0.8, taiR: 0.8, duration: 0.15 }, 0);
    let at = 0.05;
    for (let i = 0; i < lan; i++) {
      t.to(s, { truocY: 9, sauY: 9, duration: 0.14, ease: 'power2.in' }, at);                                   // nhún lấy đà
      t.to(s, { y: -46, truocY: -4, sauY: -2, tnY: 12, txY: 12, snY: 10, sxY: 10, taiL: -0.6, taiR: -0.6, duoi: 24, duration: 0.24, ease: 'power2.out' }, at + 0.14);
      t.to(s, { y: 0, tnY: 0, txY: 0, snY: 0, sxY: 0, taiL: 0.8, taiR: 0.8, duoi: -10, duration: 0.2, ease: 'power2.in' }, at + 0.38);
      t.to(s, { truocY: 7, sauY: 7, duration: 0.07 }, at + 0.58).to(s, { truocY: 0, sauY: 0, duration: 0.14, ease: 'power2.out' }, at + 0.65);   // chạm đất, lún rồi bật
      at += 0.82;
    }
    this.#khep(t, 0.35, at);
    return t;
  }

  /** Đứng hai chân sau "xin": ngồi, nhấc ngực, hai chân trước co lên ngực và vẫy vẫy. */
  beg() {
    const t = this.tl(), s = this.s;
    t.to(s, { ngoi: 1, duration: 0.3, ease: 'power2.inOut' }, 0);
    t.to(s, { truocX: -16, truocY: -34, dauX: -2, tnNhac: 1, txNhac: 1, tnGoc: 62, txGoc: 54, cuoi: 1, mieng: 0.4, luoi: 0.6, taiL: 0.7, taiR: 0.7,
              duration: 0.4, ease: 'back.out(1.5)' }, 0.25);
    for (let i = 0; i < 6; i++) t.to(s, { tnGoc: i % 2 ? 62 : 78, txGoc: i % 2 ? 70 : 54, duration: 0.16, ease: 'sine.inOut' }, 0.7 + i * 0.16);
    this.#vay(t, 0.6, 8, 14, 0.13, -22);
    this.#chop(t, 1.1);
    this.#khep(t, 0.45, 1.8);
    return t;
  }

  /** Ngồi rồi đưa một chân trước lên "bắt tay". */
  givePaw() {
    const t = this.tl(), s = this.s;
    t.to(s, { ngoi: 1, duoi: -22, duration: 0.3, ease: 'power2.inOut' }, 0);
    t.to(s, { tnNhac: 1, tnGoc: 84, dau: 6, cuoi: 0.9, taiL: 0.6, taiR: 0.6, duration: 0.3, ease: 'back.out(1.6)' }, 0.3);
    for (let i = 0; i < 4; i++) t.to(s, { tnGoc: i % 2 ? 84 : 70, duration: 0.17, ease: 'sine.inOut' }, 0.65 + i * 0.17);
    this.#chop(t, 0.9);
    this.#khep(t, 0.45, 1.45);
    return t;
  }

  /** Cúi xuống đánh hơi mặt đất. */
  sniff() {
    const t = this.tl(), s = this.s;
    t.to(s, { truocY: 13, dauX: 20, dauY: 40, dau: 16, taiL: -0.4, taiR: -0.4, duoi: -30, nhinY: 1.5, cuoi: 0, duration: 0.4, ease: 'power2.inOut' }, 0);
    for (let i = 0; i < 6; i++) t.to(s, { dauX: i % 2 ? 16 : 25, dauY: i % 2 ? 41 : 38, duration: 0.16, ease: 'sine.inOut' }, 0.4 + i * 0.16);
    this.#vay(t, 0.4, 6, 8, 0.16, -30);
    this.#khep(t, 0.4, 1.4);
    return t;
  }

  /* ---------------------------------------------------------------- MÈO */

  meow() {
    const t = this.tl(), s = this.s;
    t.to(s, { dau: -6, dauY: -3, taiL: -0.3, taiR: -0.3, duration: 0.15 }, 0);
    t.to(s, { mieng: 0.75, matY: 0.55, cuoi: 0.1, duration: 0.14, ease: 'power2.out' }, 0.12)
     .to(s, { mieng: 0.5, duration: 0.3, ease: 'sine.inOut' }, 0.3)
     .to(s, { mieng: 0, matY: 0, duration: 0.2, ease: 'power2.in' }, 0.62);
    t.to(s, { duoiCong: 0.3, duration: 0.5, ease: 'sine.inOut' }, 0.1);
    this.#khep(t, 0.35, 0.9);
    return t;
  }

  /** Gừ gừ khoái chí: lim dim, cười, người rung nhẹ, đầu dụi dụi. */
  purr() {
    const t = this.tl(), s = this.s;
    t.to(s, { matY: 0.92, cuoi: 1, taiL: 0.3, taiR: 0.3, dau: 7, dauY: 2, duration: 0.3, ease: 'power2.out' }, 0);
    for (let i = 0; i < 14; i++) t.to(s, { tho: i % 2 ? 0 : 1, duration: 0.09, ease: 'sine.inOut' }, 0.3 + i * 0.09);      // rung
    t.to(s, { dau: -7, dauX: -3, duration: 0.5, ease: 'sine.inOut' }, 0.5).to(s, { dau: 6, dauX: 3, duration: 0.5, ease: 'sine.inOut' }, 1.0);
    t.to(s, { duoiCong: 0.35, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.3);
    this.#khep(t, 0.4, 1.6);
    return t;
  }

  /** Liếm chân: nhấc một chân trước lên miệng, cúi đầu, lưỡi thè ra thụt vào. */
  lickPaw() {
    const t = this.tl(), s = this.s;
    t.to(s, { ngoi: 1, duration: 0.25 }, 0);
    t.to(s, { tnNhac: 1, tnGoc: 112, dau: 13, dauX: -3, dauY: 9, matY: 0.7, nhinY: 1.5, taiL: -0.2, taiR: -0.2, duration: 0.35, ease: 'power2.out' }, 0.15);
    for (let i = 0; i < 4; i++) {
      const a = 0.55 + i * 0.3;
      t.to(s, { luoi: 0.8, mieng: 0.3, dauY: 11, tnGoc: 116, duration: 0.13, ease: 'power1.out' }, a)
       .to(s, { luoi: 0, mieng: 0.05, dauY: 7, tnGoc: 108, duration: 0.15, ease: 'power1.in' }, a + 0.14);
    }
    this.#khep(t, 0.4, 1.8);
    return t;
  }

  /** Vươn vai: chổng mông, ép ngực sát đất, hai chân trước duỗi dài, ngáp. */
  stretch() {
    const t = this.tl(), s = this.s;
    let at = this.#dung(t, 0);
    t.to(s, { truocY: 24, truocX: 6, sauY: -7, tnX: 44, txX: 44, dauX: 12, dauY: 14, dau: 8, duoi: 26, duoiCong: 0.5, taiL: -0.5, taiR: -0.5,
              duration: 0.5, ease: 'power2.inOut' }, at);
    t.to(s, { mieng: 0.95, matY: 1, luoi: 0.35, duration: 0.3, ease: 'power2.out' }, at + 0.35)
     .to(s, { mieng: 0, luoi: 0, duration: 0.3, ease: 'power2.in' }, at + 1.0);
    t.to(s, { sauY: -10, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1 }, at + 0.5);
    this.#khep(t, 0.5, at + 1.6);
    return t;
  }

  /** Xù lông doạ: cong lưng, đuôi dựng xù, tai cụp, con ngươi hẹp, nhe miệng. */
  hiss() {
    const t = this.tl(), s = this.s;
    let at = this.#dung(t, 0);
    t.to(s, { cong: 1, xu: 1, truocY: -5, sauY: -7, duoi: 18, duoiCong: 1.1, taiL: -2.6, taiR: -2.6, dongTu: 0.35, matY: 0.38, cuoi: -0.8, dau: -6, dauY: 5,       // tai ÉP ra sau (−1 gần như không thấy với tai mèo), mắt nheo, đuôi cong xù
              duration: 0.22, ease: 'back.out(2)' }, at);
    t.to(s, { mieng: 0.8, duration: 0.12 }, at + 0.15);
    for (let i = 0; i < 8; i++) t.to(s, { dauX: i % 2 ? -1.6 : 1.6, duoi: i % 2 ? 27 : 33, duration: 0.08 }, at + 0.3 + i * 0.08);      // run lên
    t.to(s, { mieng: 0.1, duration: 0.15 }, at + 1.0);
    this.#khep(t, 0.5, at + 1.15);
    return t;
  }

  tailSwish() {
    const t = this.tl(), s = this.s;
    t.to(s, { nhinX: -2, dau: -5, taiL: 0.4, duration: 0.25 }, 0);
    for (let i = 0; i < 5; i++) t.to(s, { duoi: i % 2 ? -38 : 30, duoiCong: i % 2 ? 0.9 : -0.5, duration: 0.36, ease: 'sine.inOut' }, 0.1 + i * 0.36);
    this.#chop(t, 1.0);
    this.#khep(t, 0.4, 1.95);
    return t;
  }

  /** Rình rồi vồ: thụp người, lắc mông, con ngươi giãn, rồi bật lên chụp. */
  pounce() {
    const t = this.tl(), s = this.s;
    let at = this.#dung(t, 0);
    t.to(s, { truocY: 15, sauY: 5, dauY: 6, dauX: 8, taiL: 0.9, taiR: 0.9, dongTu: 1.9, duoi: -34, nhinX: 2, cuoi: 0, duration: 0.3, ease: 'power2.out' }, at);
    for (let i = 0; i < 6; i++) t.to(s, { sauX: i % 2 ? -3 : 3, duoi: i % 2 ? -40 : -28, duration: 0.09, ease: 'sine.inOut' }, at + 0.35 + i * 0.09);   // lắc mông
    const b = at + 0.92;
    t.to(s, { y: -34, truocY: -8, sauY: 2, sauX: 0, tnX: 18, txX: 18, tnY: 16, txY: 16, snY: 8, sxY: 8, taiL: -0.5, taiR: -0.5, duoi: 20, mieng: 0.3,
              duration: 0.22, ease: 'power2.out' }, b);
    t.to(s, { y: 0, truocY: 9, sauY: 0, tnX: 14, txX: 14, tnY: 0, txY: 0, snY: 0, sxY: 0, mieng: 0, duration: 0.18, ease: 'power2.in' }, b + 0.22);
    t.to(s, { truocY: 4, dongTu: 1, duration: 0.25, ease: 'power2.out' }, b + 0.42);
    this.#khep(t, 0.45, b + 0.75);
    return t;
  }

  /**
   * NHAI: vừa đớp được bánh thưởng / viên thuốc — hàm nhóp nhép `times` nhịp, mắt híp khoái chí, rồi liếm mép hai cái.
   * `scene.py` tự cho con vật nhai khi người `giveTreat` nó.
   */
  chew(times = 4) {
    const t = this.tl(), s = this.s, N = this.NGHI;
    t.to(s, { dau: N.dau - 4, dauY: N.dauY - 2, matY: 0.4, cuoi: 0.8, taiL: 0.5, taiR: 0.5, duration: 0.15, ease: 'power2.out' }, 0);
    for (let i = 0; i < times; i++) {
      const a = 0.15 + i * 0.24;
      // Đủ rõ ở cỡ trung cảnh: hàm há 0,5 và cả đầu nhấp theo (bản trước há 0,32 — Gemini không thấy con chó nhai).
      t.to(s, { mieng: 0.5, dauY: N.dauY + 1.5, dau: N.dau - 1, duration: 0.1, ease: 'sine.out' }, a).to(s, { mieng: 0.04, dauY: N.dauY - 2.5, dau: N.dau - 5, duration: 0.12, ease: 'sine.in' }, a + 0.11);
    }
    const end = 0.15 + times * 0.24;
    for (let i = 0; i < 2; i++) t.to(s, { luoi: 0.55, mieng: 0.22, duration: 0.1, ease: 'power2.out' }, end + i * 0.3).to(s, { luoi: 0, mieng: 0, duration: 0.14, ease: 'power2.in' }, end + i * 0.3 + 0.12);
    this.#khep(t, 0.35, end + 0.65);
    return t;
  }

  /* ------------------------------------------------------------ BIỂU CẢM
   * Con vật không có lông mày: cảm xúc nằm ở TAI (vểnh / cụp / ép ra sau), MẮT (híp, mở to, long lanh, nhắm tịt), CON
   * NGƯƠI (giãn khi sợ / tò mò, hẹp khi giận), MIỆNG (thè lưỡi, nhe nanh), ĐẦU (nghiêng, gục) và ĐUÔI (vẫy, rủ, cụp).
   * Bảng dưới là NÉT MẶT (giữ được qua động tác khác — xem `mood`); dáng người và nhịp (vẫy, run, nhún) do `express` thêm.
   */
  static EXPRESSIONS = {
    happy:   { taiL: 0.8, taiR: 0.8, matY: 0.45, cuoi: 1, mieng: 0.45, luoi: 0.7, dau: -4, dongTu: 1.1 },
    excited: { taiL: 1, taiR: 1, matY: 0.1, cuoi: 1, mieng: 0.6, luoi: 0.9, dau: -8, dauY: -3, dongTu: 1.35 },
    sad:     { taiL: -1.1, taiR: -1.1, matY: 0.12, nhinY: -1.3, dongTu: 1.45, lanh: 1, cuoi: -1, mieng: 0, dau: 7, dauY: 9 },
    scared:  { taiL: -1.6, taiR: -1.6, matY: -0.1, dongTu: 1.8, nhinY: -0.6, cuoi: -0.6, mieng: 0, dau: 6, dauY: 8, dauX: -4 },
    angry:   { taiL: -0.5, taiR: -0.5, matY: 0.35, dongTu: 0.5, cuoi: -0.9, mieng: 0.32, nanh: 1, dau: -4, dauY: 4 },
    curious: { taiL: 1, taiR: 0.25, matY: -0.08, dongTu: 1.55, nhinY: -0.5, cuoi: 0.25, mieng: 0, dau: 18, dauX: 4 },
    guilty:  { taiL: -1.3, taiR: -1.3, matY: 0.1, nhinY: -1.9, nhinX: 1.4, dongTu: 1.4, lanh: 0.7, cuoi: -0.6, mieng: 0, dau: 9, dauY: 12 },
    pain:    { taiL: -1.3, taiR: -1.3, matY: 1, nhan: 1, cuoi: -0.8, mieng: 0.18, dau: 5, dauY: 7 },
    sleepy:  { taiL: -0.5, taiR: -0.5, matY: 0.78, nhinY: 1, cuoi: 0, mieng: 0, dau: 5, dauY: 9 },
  };
  // Đuôi theo loài: chó đuôi ngắn cong, mèo đuôi dài — cùng một "rủ" thì góc khác nhau (xem `tremble`). Thỏ đuôi bông: bỏ.
  #duoiCua(name) {
    const dog = this.nv.loai === 'dog', N = this.NGHI;
    if (this.nv.loai === 'rabbit') return {};
    const tail = {
      sad: dog ? { duoi: -62, duoiCong: -0.3 } : { duoi: N.duoi - 30, duoiCong: 0.25 },
      scared: dog ? { duoi: -112, duoiCong: -1.1 } : { duoi: -84, duoiCong: 0.45 },
      guilty: dog ? { duoi: -50, duoiCong: -0.2 } : { duoi: N.duoi - 24, duoiCong: 0.2 },
      pain: dog ? { duoi: -55, duoiCong: -0.2 } : { duoi: N.duoi - 20 },
      angry: dog ? { duoi: 26 } : {},
      curious: dog ? { duoi: 18 } : { duoiCong: N.duoiCong + 0.35 },
    };
    return tail[name] || {};
  }

  /**
   * Làm một BIỂU CẢM `hold` giây rồi trở về: `express('happy')`, `express('sad', 2)`. Tên: happy · excited · sad ·
   * scared · angry · curious · guilty · pain · sleepy (`RigThu.EXPRESSIONS`). Đang giữ `mood` thì trở về nét mặt ấy.
   */
  express(name = 'happy', hold = 1.4, { mark = null } = {}) {
    const face = RigThu.EXPRESSIONS[name];
    if (!face) throw new Error(`[character] no pet expression "${name}" (available: ${Object.keys(RigThu.EXPRESSIONS).join(', ')})`);
    const t = this.tl(), s = this.s, N = this.NGHI, loai = this.nv.loai, dog = loai === 'dog', cat = loai === 'cat';
    const into = name === 'scared' ? 0.18 : 0.32, end = into + hold;
    let at = 0;
    // Sợ, giận, hào hứng là thế ĐỨNG (khom, cong lưng, nhún) — đang ngồi thì đứng dậy trước.
    if (['scared', 'excited'].includes(name) || (name === 'angry' && cat)) at = this.#dung(t, 0);
    t.to(s, { ...face, ...this.#duoiCua(name), duration: into, ease: name === 'scared' ? 'back.out(2)' : 'power2.out' }, at);
    const stop = at + end;
    if (name === 'happy') {
      if (dog) this.#vay(t, at + 0.1, Math.max(2, Math.floor(hold / 0.13)), 40, hold / Math.max(2, Math.floor(hold / 0.13)));
      else if (cat) t.to(s, { duoi: N.duoi + 18, duoiCong: N.duoiCong + 0.4, duration: 0.5, ease: 'sine.inOut' }, at);                 // mèo vui: đuôi dựng, chóp cong
      this.#chop(t, at + hold * 0.6);
    } else if (name === 'excited') {
      // Nhún nhảy tại chỗ, đuôi vẫy tít (chó), tai giật.
      for (let a = at + 0.1; a < stop - 0.35; a += 0.36) t.to(s, { y: -14, duration: 0.16, ease: 'power2.out' }, a).to(s, { y: 0, duration: 0.16, ease: 'power2.in' }, a + 0.16);
      if (dog) this.#vay(t, at + 0.1, Math.max(2, Math.floor(hold / 0.09)), 46, hold / Math.max(2, Math.floor(hold / 0.09)));
      else if (cat) for (let a = at + 0.1, i = 0; a < stop - 0.2; a += 0.1, i++) t.to(s, { duoiCong: N.duoiCong + (i % 2 ? 0.5 : 0.3), duration: 0.1, ease: 'sine.inOut' }, a);
    } else if (name === 'sad') {
      // Một tiếng thở dài: phồng ngực, đầu trĩu xuống thêm rồi thôi; chớp chậm.
      t.to(s, { tho: 1, duration: 0.6, ease: 'sine.inOut' }, at + 0.35).to(s, { tho: 0, dauY: face.dauY + 3, duration: 0.8, ease: 'sine.inOut' }, at + 0.95);
      if (hold > 1.6) t.to(s, { matY: 0.85, duration: 0.18, ease: 'power1.in' }, at + hold * 0.7).to(s, { matY: face.matY, duration: 0.3, ease: 'power1.out' }, at + hold * 0.7 + 0.18);
    } else if (name === 'scared') {
      t.to(s, { truocY: 9, sauY: 12, duration: into, ease: 'power2.out' }, at);
      for (let a = at + into, i = 0; a < stop - 0.05; a += 0.045, i++) t.to(s, { sauX: i % 2 ? -1.3 : 1.3, truocX: i % 2 ? 1 : -1, duration: 0.045, ease: 'none' }, a);
    } else if (name === 'angry') {
      if (cat) {                                          // mèo: cong lưng, xù lông, đuôi dựng xù, há miệng khè
        t.to(s, { cong: 1, xu: 1, truocY: -5, sauY: -7, duoi: 18, duoiCong: 1.1, taiL: -2.6, taiR: -2.6, mieng: 0.75, duration: into, ease: 'back.out(2)' }, at);
      } else {                                            // chó: hạ thấp đầu, chân trước choãi, gầm gừ — đầu rung nhẹ
        t.to(s, { truocY: 5, dauY: 7, duration: into, ease: 'power2.out' }, at);
      }
      for (let a = at + into, i = 0; a < stop - 0.1; a += 0.07, i++) t.to(s, { dauX: (face.dauX || 0) + (i % 2 ? -0.9 : 0.9), duration: 0.07, ease: 'none' }, a);
    } else if (name === 'curious') {
      // Nghiêng đầu bên này rồi bên kia, tai đổi bên.
      if (hold > 1.2) t.to(s, { dau: -14, dauX: -3, taiL: 0.3, taiR: 1, duration: 0.35, ease: 'power2.inOut' }, at + hold * 0.55);
      this.#chop(t, at + hold * 0.35);
    } else if (name === 'guilty') {
      // Liếc lên rồi cụp mắt xuống, đuôi vẫy khẽ dưới thấp.
      t.to(s, { nhinY: 1.2, duration: 0.3, ease: 'sine.inOut' }, at + hold * 0.45).to(s, { nhinY: face.nhinY, duration: 0.3, ease: 'sine.inOut' }, at + hold * 0.75);
      if (dog) this.#vay(t, at + 0.2, Math.max(2, Math.floor((hold - 0.2) / 0.22)), 10, (hold - 0.2) / Math.max(2, Math.floor((hold - 0.2) / 0.22)), -50);
    } else if (name === 'pain') {
      // Rên khẽ: miệng mếu giật nhẹ, người co lại theo nhịp.
      for (let a = at + into + 0.1, i = 0; a < stop - 0.2; a += 0.32, i++) t.to(s, { mieng: i % 2 ? 0.18 : 0.3, truocY: i % 2 ? 2 : 4, duration: 0.16, ease: 'sine.inOut' }, a);
    } else if (name === 'sleepy') {
      // Gà gật: đầu gục dần rồi giật lên; ngáp một cái nếu còn thời gian.
      t.to(s, { dauY: face.dauY + 6, matY: 0.95, duration: Math.min(1.2, hold * 0.5), ease: 'sine.in' }, at + into)
       .to(s, { dauY: face.dauY - 1, matY: 0.6, duration: 0.18, ease: 'power2.out' }, at + into + Math.min(1.2, hold * 0.5));
      if (hold > 2) t.to(s, { mieng: 0.9, luoi: 0.3, matY: 1, duration: 0.35, ease: 'power2.out' }, at + hold * 0.7).to(s, { mieng: 0, luoi: 0, matY: face.matY, duration: 0.3, ease: 'power2.in' }, at + hold * 0.7 + 0.5);
    }
    // DẤU CẢM XÚC đi kèm (đọc được cả ở toàn cảnh, nơi nét mặt quá nhỏ): sợ "!", tò mò "?", buồn ngủ "zzz", vui tim,
    // giận gân giận, hối lỗi / đau giọt mồ hôi. `RigThu.AUTO_MARKS = false` (hay `{ mark: false }`) để tắt.
    const autoMark = { scared: '!', curious: '?', sleepy: 'zzz', happy: 'heart', excited: 'heart', angry: 'anger', guilty: 'sweat', pain: 'sweat' }[name];
    if (mark !== false && (mark || (RigThu.AUTO_MARKS && autoMark))) markTweens(t, this.m, mark || autoMark, at + 0.1, Math.max(0.3, end - 0.35));
    this.#khep(t, 0.45, stop);
    return t;
  }

  /**
   * DẤU CẢM XÚC trên đầu, giữ cho tới khi tắt: `mark('!')` · `mark('?')` · `mark('heart')` · `mark('zzz')` · `mark('sweat')`
   * · `mark('anger')` · `mark('music')`; `mark(null)` tắt. Hiện song song với các động tác sau (ngủ, đi, ăn).
   */
  mark(kind = null) {
    if (kind !== null && !MARKS.includes(kind)) throw new Error(`[character] no mark "${kind}" (available: ${MARKS.join(', ')})`);
    const t = this.tl();
    if (kind) markTweens(t, this.m, kind, 0, null); else markOff(t, this.m, 0);
    t.to({}, { duration: 0.3 }, 0);
    return t;
  }
  static MARKS = MARKS;
  /** Ánh sáng trên thân (do bối cảnh 3D gọi mỗi khung): hướng sáng trên màn hình, độ tối phía khuất, màu và độ nhuốm phía sáng. */
  lightShade(dx, dy, amount, rgb, glow, dark, fill, fillAmount) { if (this.shadeEl) this.shadeEl.set(dx, dy, amount, rgb, glow, dark, fill, fillAmount); }
  /** Ánh sáng PHẢN XẠ từ sàn lên phần dưới người / con vật (bối cảnh 3D gọi mỗi khung). */
  lightBounce(rgb, amount) { if (this.shadeEl && this.shadeEl.bounce) this.shadeEl.bounce(rgb, amount); }
  static AUTO_MARKS = true;

  /**
   * GIỮ một nét mặt cho tới khi đổi: `mood('sad')` — mọi động tác sau (đi khập khiễng, nằm, ăn) khép về nét mặt ấy chứ
   * không về nét mặt nghỉ. `mood(null)` thôi giữ. Chỉ giữ nét MẶT, tai và đuôi — dáng người vẫn do từng động tác.
   * `mood('scared', { mark: '!' })`: kèm dấu cảm xúc trên đầu suốt lúc giữ; `mood(null)` tắt mọi dấu đang hiện.
   */
  mood(name = null, { mark = null } = {}) {
    if (name !== null && !RigThu.EXPRESSIONS[name]) throw new Error(`[character] no pet mood "${name}" (available: ${Object.keys(RigThu.EXPRESSIONS).join(', ')})`);
    if (!this.baseRest) this.baseRest = this.NGHI;
    const face = name ? { ...RigThu.EXPRESSIONS[name], ...this.#duoiCua(name) } : {};
    // Chỉ các kênh của mặt / tai / đuôi; `dau` / `dauY` (đầu gục) giữ nhẹ hơn để còn nhìn thấy động tác.
    const keep = Object.fromEntries(Object.entries(face).filter(([key]) => !['dauX'].includes(key)).map(([key, value]) => [key, ['dau', 'dauY'].includes(key) ? value * 0.6 : value]));
    this.NGHI = Object.freeze({ ...this.baseRest, ...keep });
    this.moodName = name;
    const t = this.#khep(this.tl(), 0.4, 0);
    // `{ mark: '!' }`: dấu cảm xúc giữ cùng nét mặt; `mood(null)` tắt luôn dấu do `mood` bật.
    // (Không dùng cờ "dấu do mood bật": `sequence()` gọi mỗi bước HAI lần — bản nháp rồi bản thật — cờ bị lật ở bản
    // nháp và bản thật không tắt dấu nữa; trái tim ở lại trên đầu suốt mười giây, cảnh thử đợt 13.)
    if (name && mark) markTweens(t, this.m, mark, 0, null);
    else if (!name) markOff(t, this.m, 0);
    return t;
  }
}
