/* VGCharacter v0.36.0 — bản dựng một tệp của character-skill-build. SINH TỰ ĐỘNG bằng tools/build.py — đừng sửa tay. */
var VGCharacter = (function () {
'use strict';
const __m = {};
__m['runtime/rig-svg.js'] = (function () {
const KHUNG = { w: 400, h: 470 };
const DOI_Y = 30;                              // chừa chỗ phía trên cho đầu to / tóc búi            // bao được tư thế rộng nhất (present)
const NGHI = Object.freeze({
  x: 0, y: 0, mo: 1, co: 1, huong: 0,
  than: 0, tho: 0, vai: 0,
  dau: 0, dauX: 0, dauY: 0,
  batL: 11, batR: 11, cangL: -17, cangR: -17, vungL: 0, vungR: 0,
  duiL: 0, duiR: 0, ongL: 0, ongR: 0, nhacL: 0, nhacR: 0,
  seat: 0,                 // 0…1 ngồi: đùi rút ngắn về phía người xem, ống chân giữ nguyên (xem apDung)
  matY: 0, nhinX: 0, nhinY: 0,
  mayL: 0, mayR: 0, mieng: 0, chum: 0, cuoi: 0.35,
  itemL: 1, itemR: 1,      // độ hiện của đồ vật cầm ở tay trái / phải (0 = cất đi)
  itemTiltL: 0, itemTiltR: 0,   // độ nghiêng thêm của đồ vật về phía mặt (độ) — nghiêng cốc khi uống
  carryL: 1, carryR: 1,         // 1 = tay cầm đồ giữ dáng BƯNG khi quay nghiêng; động tác dùng tay ấy (uống, đưa, cất) hạ về 0
  aimL: 0, aimR: 0,             // 1 = góc của tay ấy là góc TRÊN MÀN HÌNH: dùng nguyên vẹn dù thân đang quay (xem apDung)
  tayL: 'mo', tayR: 'mo',
});
const MAU_MAC_DINH = {
  da: '#f1c3a0', daToi: '#d9a583', toc: '#2c2a33', ao: '#4a8ed6', aoToi: '#3a74b3',
  quan: '#2f3a4d', giay: '#1b2029', mat: '#1c1a22', mieng: '#5a2530', ma: '#e99a8c',
  miengToi: null,   // lòng miệng, tối hơn nét môi
  rang: '#fffaf4',
  luoi: null,       // lưỡi, sáng và hồng hơn nét môi
  may: null,        // màu chân mày; bỏ trống thì lấy đúng màu tóc
  vienNet: null,    // màu nét vẽ trên quần áo (mép túi, cổ áo); bỏ trống thì tự tối đi từ màu áo
};
function veKhuonMat({ rong = 50, cao = 54, cam = 56, yRong = -6,
                             tranVuong = 0, hamVuong = 0, rongTran = 1, rongCam = 1 } = {}) {
  const N = 34;
  const somu = (v) => 2 * Math.pow(2.4, v);
  const nua = (h, v, thu, xuong) => {
    const n = somu(v), k = 2 / n, ra = [];
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * (Math.PI / 2);
      const sx = Math.pow(Math.cos(th), k), sy = Math.pow(Math.sin(th), k);
      const x = rong * sx * (1 + (thu - 1) * Math.pow(sy, 0.7));
      ra.push([x, yRong + (xuong ? h * sy : -h * sy)]);
    }
    return ra;
  };
  const tren = nua(cao + yRong, tranVuong, rongTran, false).reverse();
  const duoi = nua(cam - yRong, hamVuong, rongCam, true);
  const phai = [...tren, ...duoi.slice(1)];
  const r = ([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`;
  const trai = phai.slice(0, -1).reverse().map(([x, y]) => [-x, y]);
  return `M ${phai.map(r).join(' L ')} L ${trai.map(r).join(' L ')} Z`;
}
function beRongTaiY(k, y) {
  const { rong = 50, cao = 54, cam = 56, yRong = -6 } = k;
  const tren = y < yRong;
  const h = tren ? cao + yRong : cam - yRong;
  const n = 2 * Math.pow(2.4, tren ? (k.tranVuong ?? 0) : (k.hamVuong ?? 0));
  const thu = tren ? (k.rongTran ?? 1) : (k.rongCam ?? 1);
  const sy = Math.min(1, Math.abs(y - yRong) / h);
  const sx = Math.pow(Math.max(0, 1 - Math.pow(sy, n)), 1 / n);
  return rong * sx * (1 + (thu - 1) * Math.pow(sy, 0.7));
}
function veChanMay({ dai = 10.5, day = 3, cong = 2.25, thon = 0, xech = 0 } = {}, ben = 'R') {
  const N = 40, lat = ben === 'L' ? -1 : 1;
  const g = -(xech * Math.PI) / 180, cosG = Math.cos(g), sinG = Math.sin(g);
  const vom = (st) => { const q = Math.pow(st, 1.15); return -cong * 4 * q * (1 - q); };
  const mu = (u) => (u >= 1 ? 1 : Math.sqrt(Math.max(0, 1 - (1 - u) * (1 - u))));
  const tren = [], duoi = [];
  for (let i = 0; i <= N; i++) {
    const st = i / N;                                  // 0 = đầu mày, 1 = đuôi
    const x = -dai + st * 2 * dai;
    const dayT = day * (1 - thon * Math.pow(st, 1.3));
    const e = Math.max(1e-3, dayT / 2 / (2 * dai));    // nửa bề dày, quy về đơn vị s
    const t = dayT * mu(st / e) * mu((1 - st) / e);
    const yc = vom(st);
    for (const [ds, kho] of [[-t / 2, tren], [t / 2, duoi]]) {
      const yy = yc + ds;
      kho.push([(x * cosG - yy * sinG) * lat, x * sinG + yy * cosG]);
    }
  }
  const doan = (ds) => ds.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L ');
  return `M ${doan(tren)} L ${doan(duoi.reverse())} Z`;
}
const RHUBARB = {
  A: { mieng: 0.05, chum: 0.15, cuoi: 0.28 },   // M B P — mím
  B: { mieng: 0.36, chum: 0.04, cuoi: 0.46 },   // K S T — hé, răng gần khít
  C: { mieng: 0.66, chum: 0.02, cuoi: 0.60 },   // EH AE — mở vừa, kéo ngang
  D: { mieng: 0.86, chum: 0.03, cuoi: 0.48 },   // AA — mở to
  E: { mieng: 0.42, chum: 0.45, cuoi: 0.14 },   // AO ER — tròn vừa
  F: { mieng: 0.26, chum: 0.85, cuoi: 0.00 },   // UW OW W — chúm
  G: { mieng: 0.16, chum: 0.20, cuoi: 0.34 },   // F V — răng chạm môi
  H: { mieng: 0.38, chum: 0.04, cuoi: 0.40 },   // L
  X: { mieng: 0.00, chum: 0.00, cuoi: 0.35 },   // nghỉ / im
};
const KHAU = [
  { mieng: 0.86, cuoi: 0.60, chum: 0.05 },   // AA — mở to
  { mieng: 0.64, cuoi: 0.72, chum: 0.00 },   // EH AE — hé rộng (nới từ 0.46, cùng lý do với bảng trên)
  { mieng: 0.30, cuoi: 0.08, chum: 0.85 },   // UW OW W — chúm
  { mieng: 0.26, cuoi: 0.45, chum: 0.10 },   // phụ âm — gần mím (nới từ 0.15)
];
const HONG = { x: 200, y: 262 };
const VAI = { L: { x: 167, y: 172 }, R: { x: 233, y: 172 } };
const DAI = { canhTay: 62, cangTay: 58, dui: 78, ong: 78 };
const CHOT_VAI = { x: 33, y: -90 };
const UC_DON = { x: 6, y: -98 };
const GOC_VAI_MAX = 16;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const chuanHoaGoc = (g) => ((((g + 180) % 360) + 360) % 360) - 180;
let ngau = Math.random;
const gieoHat = (hat) => {
  if (hat === null || hat === undefined) { ngau = Math.random; return; }
  let a = hat >>> 0;
  ngau = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
                 t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
const nhieu = (a, b) => a + ngau() * (b - a);
const RAD = Math.PI / 180;
const mem = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };   // smoothstep
const pha = (a, b, t) => a + (b - a) * t;
const napTayAo = (ben) => {
  const sg = ben === 'L' ? -1 : 1;
  return `M ${-sg * 12} -5 Q ${-sg * 6} -8 ${sg * 2} -6 Q ${sg * 10} -4 ${sg * 12} 2`;
};
const gauTayAo = (nv, ben) => {
  const sg = ben === 'L' ? -1 : 1, r = 11 * nv.rongTayAo, y = 24 * nv.daiTayAo;
  return { xB: sg * r, yB: y, cx: 0, cy: y, ex: -sg * r, ey: y - nv.xeoTayAo };
};
const gauDemVai = (nv, ben, t) => {
  const sg = ben === 'L' ? -1 : 1, g = gauTayAo(nv, ben);
  return { xB: pha(g.xB, sg * 12, t), yB: pha(g.yB, 6, t),
           cx: pha(g.cx, sg * 6, t), cy: pha(g.cy, 11, t),
           ex: pha(g.ex, -sg * 3, t), ey: pha(g.ey, 14, t) };
};
const boGocTrong = (nv, ben, t) => {
  const sg = ben === 'L' ? -1 : 1, g = gauDemVai(nv, ben, t);
  const r = Math.min((nv.boGocTayAo || 0) * (1 - t),
                     Math.max(0, 11 * nv.rongTayAo - 12 * nv.dayTay));
  if (!(r > 0)) return null;
  const don = (x, y) => { const d = Math.hypot(x, y) || 1; return [x / d, y / d]; };
  const [hx, hy] = don(g.cx - g.ex, g.cy - g.ey);              // ngược lên theo gấu
  const [mx, my] = don(-sg * 12 - g.ex, -5 - g.ey);            // ngược lên theo mép nách
  return { r, p1: [g.ex + hx * r, g.ey + hy * r], p2: [g.ex + mx * r, g.ey + my * r] };
};
const veDemVai = (nv, ben, t) => {
  const g = gauDemVai(nv, ben, t), b = boGocTrong(nv, ben, t);
  const dau = `${napTayAo(ben)} L ${g.xB} ${g.yB}`;
  return b
    ? `${dau} Q ${g.cx} ${g.cy} ${b.p1[0]} ${b.p1[1]} Q ${g.ex} ${g.ey} ${b.p2[0]} ${b.p2[1]} Z`
    : `${dau} Q ${g.cx} ${g.cy} ${g.ex} ${g.ey} Z`;
};
const veTayAo = (nv, ben) => veDemVai(nv, ben, 0);
const veGauTayAo = (nv, ben) => {
  const g = gauTayAo(nv, ben), b = boGocTrong(nv, ben, 0);
  const d = Math.min(nv.lechGau || 0, g.yB * 0.35), k = d ? 0.88 : 1;
  const [ex, ey] = b ? b.p1 : [g.ex * k, g.ey];
  return `M ${g.xB * k} ${g.yB - d} Q ${g.cx} ${g.cy - d} ${ex} ${ey - d}`;
};
const veDuongMayVai = (nv, ben, t) => {
  const sg = ben === 'L' ? -1 : 1, g = gauDemVai(nv, ben, t);
  return `M ${-sg * 13} -4 Q ${-sg * 15.5} ${pha(8, 5, t)} ${g.ex - sg} ${g.ey}`;
};
const nhacChotVai = (ben, goc) => {
  const sg = ben === 'L' ? -1 : 1;
  const r = (goc * Math.PI) / 180, c = Math.cos(r), sn = Math.sin(r);
  const dx = sg * (CHOT_VAI.x - UC_DON.x), dy = CHOT_VAI.y - UC_DON.y;   // chốt so với tâm xoay: (±27, 8)
  return { x: dx * c + sg * dy * sn - dx, y: -sg * dx * sn + dy * c - dy };
};
const chinhSang = (c, k) => {
  const s = c.replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map((x) => x + x).join('') : s, 16);
  const v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((u) => (k < 0 ? u * (1 + k) : u + (255 - u) * k));
  return '#' + v.map((u) => Math.round(clamp(u, 0, 255)).toString(16).padStart(2, '0')).join('');
};
const tron = (a, b, k) => {
  const ph = (c) => { const t = c.replace('#', ''); const n = parseInt(t.length === 3 ? t.split('').map((x) => x + x).join('') : t, 16);
                      return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const [x, y] = [ph(a), ph(b)];
  return '#' + x.map((u, i) => Math.round(u + (y[i] - u) * k).toString(16).padStart(2, '0')).join('');
};
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
function assertColors(palette, where) {
  const bad = Object.entries(palette).filter(([, v]) => v !== null && !(typeof v === 'string' && HEX_COLOR.test(v)));
  if (bad.length) throw new Error(`[character] ${where}: colours must be hex (#rgb / #rrggbb) — invalid: ${bad.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')}`);
}
const NV_MAC_DINH = {
  ten: 'Mặc định',
  mau: {},
  toc: (p, m) => `
              <g id="${p}-tocTruoc" fill="${m.toc}">
                <path d="M -45 -6 Q -50 -50 -4 -52 Q 44 -54 44 -8 Q 39 -24 27 -32 Q 16 -35 6 -28 Q -5 -22 -17 -30 Q -33 -33 -45 -6 Z"/>
                <path d="M -46 -6 Q -49 -22 -40 -30 Q -44 -14 -42 4 Z"/>
                <path d="M 46 -6 Q 49 -22 40 -30 Q 44 -14 42 4 Z"/>
              </g>`,
  coAo: (p, m) => `
        <!-- hai góc vải che mũi nhọn của chân cổ: không có thì lòi hai tam giác da nhỏ ở hai đầu cổ áo -->
        <path d="M -22.5 -95 L -16 -102 L -15.5 -95 Z M 22.5 -95 L 16 -102 L 15.5 -95 Z" fill="${m.ao}"/>
        <path d="M -17 -100 Q 0 -84 17 -100 Q 0 -94 -17 -100 Z" fill="${m.aoToi}"/>
        <path d="M -17 -100 Q 0 -84 17 -100" stroke="${m.ao}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  phuKien: () => '',
  phuKienTren: () => '',
  beard: () => '',
  mu: () => '',
  giay: (p, ben, m, ong) =>
    `<path id="${p}-ban${ben}" d="M -12 ${ong - 6} h 24 v 12 q 0 6 -6 6 h -16 q -8 0 -8 -8 z" fill="${m.giay}"/>`,
  net: () => '',
  mat: (p, ben, m) => `
            <g id="${p}-mat${ben}"><ellipse rx="6.5" ry="7.5" fill="#fff"/>
              <g id="${p}-nguoi${ben}"><circle r="3.6" fill="${m.mat}"/><circle cx="1.3" cy="-1.5" r="1.1" fill="#fff"/></g></g>`,
  nghi: {},          // ghi đè tư thế nghỉ (vd. tay đan trước bụng)
  coDau: 1,          // tỉ lệ đầu (chibi > 1)
  dauLech: 0,        // hạ đầu xuống (px) để cổ ngắn lại
  coThan: 1,         // tỉ lệ thân trên (tay, cổ, đầu co theo)
  torsoWidth: 1,     // bề NGANG của thân trên so với chiều cao của nó: >1 = người to ngang (vai, bụng, tay đều rộng ra); đầu giữ nguyên
  coChan: 1,         // tỉ lệ chiều dài chân (chibi < 1)
  daiCanhTay: 1,     // chiều dài cánh tay (vai → khuỷu)
  daiCangTay: 1,     // chiều dài cẳng tay (khuỷu → cổ tay)
  dayTay: 1,         // bề dày cả cánh lẫn cẳng (tay áo dày theo)
  coBanTay: 1,       // cỡ bàn tay
  daiDui: 1,         // chiều dài đùi (hông → gối)
  daiOng: 1,         // chiều dài ống chân (gối → cổ chân)
  dayChan: 1,        // bề dày cả đùi lẫn ống
  cachChan: 14,      // nửa khoảng cách hai chân (px, từ tim hông)
  coBanChan: 1,      // cỡ bàn chân / giày
  daiTayAo: 1,       // chiều dài tay áo (1 = gấu ngoài ở 24px dưới chốt)
  xeoTayAo: 6,       // gấu xéo: phía ngoài thấp hơn phía trong bao nhiêu px
  rongTayAo: 1,      // độ rộng gấu so với vai (>1 = loe)
  vienGau: 0,        // bề dày nét viền gấu (px, 0 = không viền)
  mauGau: null,      // màu nét gấu tay áo (null = tự tối đi từ màu áo)
  netGau: null,      // stroke-dasharray của nét gấu (null = nét liền)
  lechGau: 0,        // nét gấu thụt lên khỏi mép vải bao nhiêu đơn vị (0 = nằm đúng trên mép)
  boGocTayAo: 0,     // bán kính bo góc TRONG của gấu tay áo (0 = góc nhọn như cũ)
  tayDai: false,
  mauSoSau: 'toc',
  backHair: 'full',
  stoop: 0,
  skirt: null,
  heldItemL: () => '', heldItemR: () => '',
  damSuon: 0.45,     // độ đậm mảng tối hai bên sườn áo
  khuon: { rong: 44, cao: 44, cam: 51, yRong: 0, tranVuong: -0.06, hamVuong: -0.08, rongTran: 1.06, rongCam: 1.1 },
  dau: (m, nv) => veKhuonMat(nv.khuon),
  matX: 16, matY: -6, mayY: -22, maY: 16, maX: 24, miengY: 22, moiRong: 3, taiX: 43, maRong: 8, miengRong: 1, tocLech: 3, netLech: 18, buiLech: 12,   // bố cục mặt (toạ độ tâm đầu)
  matCo: 1,          // cỡ mắt, nhân vào cỡ đã vẽ trong slot `mat()`
  muiY: 0, muiCo: 1,
  netTheoMat: true,
  mui: (m) => `<path d="M -3 -6 Q -6 6 2 8" stroke="${m.daToi}" stroke-width="2" stroke-linecap="round" fill="none"/>`,
  may: { dai: 10.5, day: 3, cong: 2.25, thon: 0, xech: -2.5 },
  mayX: null,        // khoảng cách hai chân mày; bỏ trống thì lấy đúng `matX`
  vien: null,        // màu viền nét (null = kiểu phẳng không viền)
  vienRong: 2.2,
  ao: () => 'M -28 6 L -30 -40 Q -36 -78 -35 -88 Q -30 -97 -20 -101 Q -10 -105 0 -105 Q 10 -105 20 -101 Q 30 -97 35 -88 Q 36 -78 30 -40 L 28 6 Q 0 13 -28 6 Z',   // đường bao thân áo (toạ độ hông)
  suon: 'M -28 6 Q -30 -20 -31 -44 Q -35 -70 -30 -90 Q -31 -60 -25 -20 Q -24 -6 -28 6 Z',   // mảng tối bên sườn, phải nằm TRONG `ao`
};
const CHI_TIM = '#7d4472';        // chỉ may — hạ sáng cho khớp bề dày nét thật vẽ được
const ONG_TIM = '#8c4680';        // ống nghe
const MANH_CHI = 0.5;
const rongGau = (nv) => nv.vienGau * (nv.netGau ? MANH_CHI : 1);
const AO_BS = 'M -33 21 Q 0 30 33 21 Q 30.5 2 27 -14 Q 24 -30 26 -42 Q 27 -70 35 -88'
            + ' Q 30 -97 20 -101 Q 10 -105 0 -105 Q -10 -105 -20 -101 Q -30 -97 -35 -88'
            + ' Q -27 -70 -26 -42 Q -24 -30 -27 -14 Q -30.5 2 -33 21 Z';
const SUON_BS = ['L', 'R'].map((b) => { const g = b === 'L' ? -1 : 1;
  return `M ${g * 35} -88 Q ${g * 27} -70 ${g * 26} -42 Q ${g * 24} -30 ${g * 27} -14`
       + ` Q ${g * 30.5} 2 ${g * 33} 21 L ${g * 28} 22 Q ${g * 25.5} 3 ${g * 22} -13`
       + ` Q ${g * 19.5} -29 ${g * 21} -42 Q ${g * 22} -68 ${g * 30} -86 Z`; }).join(' ');
const chiMay = (d, m, rong = 1.05) =>
  `<path d="${d}" stroke="${m.phuKien}" stroke-width="${rong}" fill="none"
         stroke-dasharray="3 2.6" stroke-linecap="round"/>`;
const tuiHong = (ben, m) => { const g = ben === 'L' ? -1 : 1; return `
          <path d="M ${g * 28} -15 Q ${g * 21.5} -8 ${g * 17} -3 Q ${g * 16} 10 ${g * 15.5} 26"
                stroke="${m.vienNet}" stroke-width="1.9" fill="none" stroke-linecap="round"/>
          ${chiMay(`M ${g * 26} -12 Q ${g * 20.5} -6.5 ${g * 15.2} -2 Q ${g * 14.2} 10 ${g * 13.7} 23`, m)}`; };
const tuiNguc = (m) => `
        <path d="M 7.5 -68 h 13 a 2 2 0 0 1 2 2 v 19 l -8.5 6 l -8.5 -6 v -19 a 2 2 0 0 1 2 -2 z"
              fill="${chinhSang(m.ao, 0.05)}" stroke="${m.vienNet}" stroke-width="1.6" stroke-linejoin="round"/>
        ${chiMay('M 8.5 -66 h 11 a 1 1 0 0 1 1 1 v 16.5 l -6.5 4.6 l -6.5 -4.6 v -16.5 a 1 1 0 0 1 1 -1 z', m, 1)}
        ${'__HUYHIEU__'}`;
const NHANH_TAI = ['M -19 -65.5 Q -26.5 -55 -20.8 -45', 'M -19 -65.5 Q -9 -55 -13.2 -45'];
const ongNghe = (m) => `
        <g>
          ${[ 'M -13.5 -103 Q -30 -90 -19 -66', 'M 13.5 -103 Q 23 -89 17.7 -75.5', ...NHANH_TAI ]
              .map((d) => `<path d="${d}" stroke="${m.vienNet}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}
          <path d="M -13.5 -103 Q -30 -90 -19 -66" stroke="${ONG_TIM}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M 13.5 -103 Q 23 -89 17.7 -75.5" stroke="${ONG_TIM}" stroke-width="3" fill="none" stroke-linecap="round"/>
          ${NHANH_TAI.map((d) => `<path d="${d}" stroke="${ONG_TIM}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="${d}" stroke="#cdd3da" stroke-width="2.8" fill="none" stroke-linecap="round"
                pathLength="100" stroke-dasharray="0 34 66 0"/>`).join('')}
          <circle cx="-20.8" cy="-44.6" r="2.6" fill="#e6eaef" stroke="${m.vienNet}" stroke-width="1.2"/>
          <circle cx="-13.2" cy="-44.6" r="2.6" fill="#e6eaef" stroke="${m.vienNet}" stroke-width="1.2"/>
          <circle cx="17.7" cy="-75.5" r="5.6" fill="#c3c9d1" stroke="${m.vienNet}" stroke-width="1.6"/>
          <circle cx="17.7" cy="-75.5" r="3.1" fill="#eef0f4" stroke="#8d949f" stroke-width="1.3"/>
        </g>`;
const NV_BAC_SI_THU_Y = {
  ...NV_MAC_DINH,
  ten: 'Bác sĩ thú y',
  coDau: 1.37, coThan: 0.94, coChan: 0.68, dauLech: 9,
  daiCanhTay: 1.09, daiCangTay: 0.7, dayTay: 0.68, coBanTay: 0.95,
  daiDui: 1.4, daiOng: 1.25, dayChan: 1, cachChan: 14, coBanChan: 1,
  daiTayAo: 1.3, xeoTayAo: 1, rongTayAo: 1.3,
  may: { dai: 10, day: 3.6, cong: 2, thon: 0.45, xech: 1 },
  khuon: { rong: 50, cao: 54, cam: 56, yRong: -6, tranVuong: 0.1, hamVuong: -0.05, rongTran: 1.06, rongCam: 1.1 },   // dò từ path cũ, lệch tối đa 1.26px
  matX: 20, matY: 2, mayY: -18, maX: 31, maY: 24, miengY: 30, moiRong: 1.2, taiX: 51, maRong: 10, miengRong: 1.45, tocLech: 5, netLech: 21, buiLech: 15,
  mui: (m) => `<path d="M -1 8 q -3 4 1 5" stroke="${m.daToi}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
  vien: '#1d0d10', vienRong: 1.15,
  huyHieu: 'C+',                                 // chữ trên túi ngực ('' = dấu chân thú)
  mauGau: CHI_TIM, netGau: '3 2.6', lechGau: 7, vienGau: 2.5, boGocTayAo: 6,
  damSuon: 0.34,
  nghi: { batL: 19, batR: 19, cangL: -97, cangR: -97, cuoi: 1, mieng: 0.6, mayL: 0.15, mayR: 0.15 },
  mau: { da: '#f7d9c4', daToi: '#e2b39a', toc: '#151319', tocSang: '#3a3644', ao: '#4f5b64', aoToi: '#3b454a',
         quan: '#4f5b64', giay: '#d7b48f', mieng: '#7d2f3d', ma: '#f2a3a3', phuKien: CHI_TIM, mat: '#3a2416',
         vien: '#1d0d10', vienNet: '#2a1519' },
  toc: (p, m) => `
              <g id="${p}-tocTruoc" fill="${m.toc}">
                <g id="${p}-tocBui">
                  <ellipse cx="2" cy="-76" rx="26" ry="19"/>
                  <path d="M -14 -88 Q -2 -96 14 -90" stroke="${m.tocSang}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
                </g>
                <path d="M -22 -62 Q 2 -70 24 -62" stroke="${m.tocSang}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".55"/>
                <path d="M -50 34 Q -66 -28 -32 -68 Q 0 -84 32 -68 Q 66 -28 50 34 Q 50 22 47 8 Q 48 -34 0 -42 Q -48 -34 -47 8 Q -50 22 -50 34 Z"/>
                <path d="M -4 -42 Q 2 -52 -2 -62" stroke="${m.tocSang}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".9"/>
                <path d="M -42 -44 Q -28 -60 -8 -62" stroke="${m.tocSang}" stroke-width="3.6" fill="none" stroke-linecap="round" opacity=".9"/>
                <path d="M 16 -62 Q 34 -56 42 -44" stroke="${m.tocSang}" stroke-width="2.8" fill="none" stroke-linecap="round" opacity=".7"/>
                <path d="M -52 8 Q -56 -10 -50 -24" stroke="${m.tocSang}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".6"/>
              </g>`,
  mat: (p, ben, m) => `
            <g id="${p}-mat${ben}">
              <ellipse rx="11.5" ry="13" fill="#fff"/>
              <g id="${p}-nguoi${ben}">
                <circle r="8.8" cy="0.5" fill="${m.mat}"/>
                <circle r="5" cy="2" fill="#17110c"/>
                <circle cx="-3.2" cy="-4" r="3.2" fill="#fff"/>
                <circle cx="3.6" cy="4" r="1.5" fill="#fff" opacity=".9"/>
              </g>
              <path d="M -11.5 -4 Q 0 -15.5 11.5 -4" stroke="#17110c" stroke-width="2.6" fill="none" stroke-linecap="round"/>
              <path d="${ben === 'L' ? 'M -11 -6 l -3.4 -2.2 M -10 -9.5 l -2.6 -3.2' : 'M 11 -6 l 3.4 -2.2 M 10 -9.5 l 2.6 -3.2'}" stroke="#17110c" stroke-width="1.9" stroke-linecap="round"/>
            </g>`,
  coAo: (p, m) => `
        <path d="M -28.5 -96 Q -22 -102.5 -12.2 -103.5 L -8.5 -96 Z" fill="${m.ao}"/>
        <path d="M 28.5 -96 Q 22 -102.5 12.2 -103.5 L 8.5 -96 Z" fill="${m.ao}"/>
        <path d="M -8.5 -96 L 8.5 -96 L 0 -79 Z" fill="${m.aoToi}"/>
        <path d="M -12.2 -103.5 L 2.8 -73.4 M 12.2 -103.5 L -2.8 -73.4"
              stroke="${m.vienNet}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <path d="M -17.6 -101.9 L 0 -68 L 17.6 -101.9"
              stroke="${m.vienNet}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  phuKien: (p, m) => `
      <g id="${p}-phuKien">
        <clipPath id="${p}-aoCat"><path d="${AO_BS}"/></clipPath>
        <g clip-path="url(#${p}-aoCat)">
          ${chiMay('M -30 14 Q 0 32 30 14', m)}
          ${tuiHong('L', m)}${tuiHong('R', m)}
        </g>
        ${tuiNguc(m)}
        ${ongNghe(m)}
      </g>`,
  phuKienTren: (p, m) => ongNghe(m),
  ao: () => AO_BS,
  suon: SUON_BS,
  giay: (p, ben, m, ong) => `
          <g id="${p}-ban${ben}">
            <path d="M -11 ${ong - 5} Q 0 ${ong - 8} 11 ${ong - 5} L 12 ${ong + 4} q 0 6 -7 6 h -10 q -7 0 -7 -6 z" fill="${m.da}"/>
            <path d="M -12 ${ong + 1} Q 0 ${ong - 1} 12 ${ong + 1} L 12 ${ong + 4} q 0 6 -7 6 h -10 q -7 0 -7 -6 z" fill="${m.giay}"/>
          </g>`,
  net: () => '',
};
NV_BAC_SI_THU_Y.phuKien = ((goc) => (p, m, nv) => goc(p, m).replace('__HUYHIEU__',
  nv && nv.huyHieu
    ? `<text x="14" y="-49.5" font-family="Arial, sans-serif" font-size="12" font-weight="800" fill="#fff" text-anchor="middle" data-layout-ignore="" data-layout-allow-occlusion="">${nv.huyHieu}</text>`     // chữ là HOẠ TIẾT trên áo, không phải chữ để đọc — báo cho bộ kiểm bố cục của HyperFrames
    : `<g fill="#fff" transform="translate(14 -54)"><ellipse cx="0" cy="2.2" rx="4.4" ry="3.6"/><circle cx="-5" cy="-2.8" r="1.8"/><circle cx="-1.7" cy="-5" r="1.8"/><circle cx="1.7" cy="-5" r="1.8"/><circle cx="5" cy="-2.8" r="1.8"/></g>`))(NV_BAC_SI_THU_Y.phuKien);
class RigSVG {
  static KHUNG = KHUNG;
  static NGHI = NGHI;
  static DONG_TAC = ['idle', 'wave', 'thumbsUp', 'point', 'present', 'nod',
                     'shake', 'shrug', 'march', 'stroll', 'stepInPlace', 'walkForward', 'walkAway',
                     'speak', 'explain', 'worry', 'express', 'turn', 'sit', 'cheer', 'drink', 'stroke', 'write'];
  static DI_NGANG = ['walk', 'enter', 'exit'];
  static STANCE = ['sitDown', 'standUp', 'face', 'hideItem', 'showItem'];
  static EXCHANGE = ['handOver', 'take'];
  static gieo(hat) { gieoHat(hat); }
  static #dem = 0;
  static COLOR_ALIASES = {};
  static NHAN_VAT = { default: NV_MAC_DINH, vet: NV_BAC_SI_THU_Y };
  static dangKy(ten, dinhNghia) { RigSVG.NHAN_VAT[ten] = { ...NV_MAC_DINH, ...dinhNghia }; return RigSVG.NHAN_VAT[ten]; }
  constructor(host, nhanVat = 'default') {
    const nv = typeof nhanVat === 'string' ? RigSVG.NHAN_VAT[nhanVat] : nhanVat;
    if (!nv) throw new Error(`[character] no character "${nhanVat}"`);
    this.host = host;
    this.nv = { ...NV_MAC_DINH, ...nv };
    this.mauKhai = { ...(nv.mau || {}) };
    this.#suyMau();
    const K = this.nv.khuon, w = (y) => beRongTaiY(K, y) || 1;
    this.nv.tiNgang = {
      taiX: this.nv.taiX / w(4),
      matX: this.nv.matX / w(this.nv.matY),
      maX: this.nv.maX / w(this.nv.maY),
      mayX: (this.nv.mayX ?? this.nv.matX) / w(this.nv.mayY),
    };
    this.nv.khuonGoc = { ...K };
    this.nv.dauLechGoc = this.nv.dauLech;
    this.nv.netGoc = { matX: this.nv.matX, matY: this.nv.matY };
    this.NGHI = Object.freeze({ ...NGHI, ...(this.nv.nghi || {}) });
    this.id = `rig${++RigSVG.#dem}`;
    this.s = this.#theoDoi({ ...this.NGHI });
    this.#dungLai();
  }
  #choVe = false;
  #theoDoi(o) {
    return new Proxy(o, { set: (dich, k, v) => {
      dich[k] = v;
      if (!this.#choVe && this.el) { this.#choVe = true; queueMicrotask(() => { this.#choVe = false; this.apDung(); }); }
      return true;
    } });
  }
  #suyMau() {
    const m = { ...MAU_MAC_DINH, ...this.mauKhai };
    if (!m.vienNet) m.vienNet = chinhSang(m.ao, -0.62);
    if (!m.miengToi) m.miengToi = chinhSang(m.mieng, -0.45);
    if (!m.luoi) m.luoi = tron(m.mieng, '#e8848f', 0.62);
    if (!m.rang) m.rang = '#fffaf4';
    if (!m.may) m.may = m.toc;
    if (!m.phuKien) m.phuKien = '#d6453d';
    if (!m.tocSang) m.tocSang = chinhSang(m.toc, 0.22);
    for (const [alias, key] of Object.entries(RigSVG.COLOR_ALIASES)) if (key in m && !(alias in m)) m[alias] = m[key];
    this.mau = this.nv.mau = m;
  }
  #dungLai() {
    this.holds = { L: !!String(this.nv.heldItemL(this.id, this.mau, this.nv) || '').trim(), R: !!String(this.nv.heldItemR(this.id, this.mau, this.nv) || '').trim() };
    const khung = this.svg && this.svg.getAttribute('viewBox');   // trang chỉnh có thể đang zoom vào mặt
    this.host.innerHTML = this.#dungSVG();
    this.svg = this.host.querySelector('svg');
    if (khung) this.svg.setAttribute('viewBox', khung);
    this.#layPhanTu();
    this.apDung();
  }
  doiMau(kieu = {}) {
    kieu = Object.fromEntries(Object.entries(kieu).map(([name, v]) => [RigSVG.COLOR_ALIASES[name] || name, v]));
    assertColors(kieu, 'doiMau');
    const k = { ...kieu };
    if (k.ao && !k.aoToi) k.aoToi = chinhSang(k.ao, -0.21);
    if (k.da && !k.daToi) k.daToi = chinhSang(k.da, -0.12);
    if (k.toc && !k.tocSang && this.mauKhai.tocSang) k.tocSang = chinhSang(k.toc, 0.16);
    if (k.mu && !k.muSang && this.mauKhai.muSang) k.muSang = chinhSang(k.mu, 0.22);
    if (k.ao && !k.vienNet) delete this.mauKhai.vienNet;
    if (k.mieng) { if (!k.miengToi) delete this.mauKhai.miengToi; if (!k.luoi) delete this.mauKhai.luoi; }
    Object.assign(this.mauKhai, k);
    this.#suyMau();
    this.#dungLai();
    return { ...this.mau };
  }
  #tay(ben) {
    const p = `${this.id}-tay${ben}`, da = this.mau.da, toi = this.mau.daToi;
    const ngon = (x, dai, xoay) =>
      `<rect x="${x}" y="17" width="4.8" height="${dai}" rx="2.4" fill="${da}" transform="rotate(${xoay} ${x + 2.4} 17)"/>`;
    const ngonCong = (x, dai, cong) =>
      `<path d="M ${x} 16 q ${-cong * 0.15} ${dai * 0.55} ${-cong} ${dai * 0.9}" stroke="${da}" stroke-width="4.6" stroke-linecap="round" fill="none"/>`;
    const ke = (x) => `<path d="M ${x} 21 L ${x} 29" stroke="${toi}" stroke-width="1" stroke-linecap="round" opacity=".45"/>`;
    const nam = `
      <rect x="-10" y="-3" width="20" height="24" rx="8" fill="${da}"/>
      <circle cx="-7" cy="20" r="3.4" fill="${da}"/><circle cx="-2.3" cy="21" r="3.4" fill="${da}"/>
      <circle cx="2.3" cy="21" r="3.4" fill="${da}"/><circle cx="7" cy="20" r="3.4" fill="${da}"/>
      <path d="M -4.5 21 L -4.5 23 M 0 22 L 0 24 M 4.5 21 L 4.5 23" stroke="${toi}" stroke-width="1" stroke-linecap="round" opacity=".5"/>
      <rect x="-11" y="7" width="15" height="7.5" rx="3.7" fill="${da}"/>
      <path d="M -10 14.5 Q -3 15.5 4 13.5" stroke="${toi}" stroke-width="1" stroke-linecap="round" fill="none" opacity=".45"/>`;
    return `
      <g id="${p}">
        <g data-tay="mo">
          <path d="M -9 -3 Q -11 8 -8 18 Q 0 21 8 18 Q 11 8 9 -3 Q 0 -6 -9 -3 Z" fill="${da}"/>
          ${ngonCong(-6.6, 14, 5)}${ngonCong(-2.2, 15.5, 6.5)}${ngonCong(2.2, 14.5, 6.5)}${ngonCong(6.6, 11, 5)}
          <path d="M -6 3 q -6 4 -5 12" stroke="${da}" stroke-width="5.2" stroke-linecap="round" fill="none"/>
          <path d="M -7 17 Q 0 20 7 17" stroke="${toi}" stroke-width="1" stroke-linecap="round" fill="none" opacity=".35"/>
        </g>
        <g data-tay="xoe">
          <rect x="-9.5" y="-3" width="19" height="24" rx="7.5" fill="${da}"/>
          <rect x="-10.5" y="1" width="7" height="17" rx="3.5" fill="${da}" transform="rotate(32 -7 3)"/>
          ${ngon(-9.6, 15, -4)}${ngon(-4.8, 17.5, -1.5)}${ngon(0, 17, 1.5)}${ngon(4.8, 13.5, 4)}
          ${ke(-4.8)}${ke(0)}${ke(4.8)}
          <path d="M -9 6 Q -3 9 3 6" stroke="${toi}" stroke-width="1" stroke-linecap="round" fill="none" opacity=".35"/>
        </g>
        <g data-tay="nam">${nam}</g>
        <g data-tay="cai">${nam}
          <rect x="-4" y="17" width="8" height="21" rx="4" fill="${da}"/>
        </g>
        <g data-tay="chi">${nam}
          <rect x="-3" y="17" width="6" height="27" rx="3" fill="${da}"/>
        </g>
      </g>`;
  }
  #canhTay(ben) {
    const p = this.id, c = DAI.canhTay, g = DAI.cangTay, daThat = this.mau.da;
    const dai = this.nv.tayDai, da = dai ? this.mau.ao : daThat;   // tay áo dài: tô cả tay bằng màu áo
    return `
      <g id="${p}-canh${ben}">
        <g id="${p}-canhHinh${ben}">
          <circle cx="0" cy="4" r="9" fill="${da}"/>
          <path d="M -10 0 Q -12.5 ${c * 0.45} -8 ${c} L 8 ${c} Q 12.5 ${c * 0.45} 10 0 Z" fill="${da}"/>
          <path id="${p}-tayAo${ben}" d="${veTayAo(this.nv, ben)}" fill="${this.mau.ao}"/>
          <path id="${p}-gauTayAo${ben}" d="${veGauTayAo(this.nv, ben)}" fill="none" stroke="${this.nv.mauGau || chinhSang(this.mau.ao, -0.45)}" stroke-width="${rongGau(this.nv)}" stroke-linecap="round"${this.nv.netGau ? ` stroke-dasharray="${this.nv.netGau}"` : ''}/>
        </g>
        <g id="${p}-cang${ben}">
          <g id="${p}-cangHinh${ben}">
            <circle cx="0" cy="0" r="8" fill="${da}"/>
            <path d="M -8 0 Q -9.5 ${g * 0.4} -6 ${g} L 6 ${g} Q 9.5 ${g * 0.4} 8 0 Z" fill="${da}"/>
            <circle cx="0" cy="${g}" r="6" fill="${daThat}"/>
            ${dai ? `<path d="M -6.6 ${g - 5} Q 0 ${g - 2.5} 6.6 ${g - 5} L 6.2 ${g - 1} Q 0 ${g + 1.5} -6.2 ${g - 1} Z" fill="${da}"/>
            <path d="M -6.6 ${g - 5} Q 0 ${g - 2.5} 6.6 ${g - 5}" stroke="${this.mau.vienNet}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".7"/>` : ''}
          </g>
          <g id="${p}-coTay${ben}" transform="translate(0 ${g})">${this.#tay(ben)}<g id="${p}-item${ben}">${this.nv['heldItem' + ben](p, this.mau, this.nv)}</g></g>
        </g>
      </g>`;
  }
  #chan(ben) {
    const p = this.id, V = this.#V();
    return `
      <g id="${p}-chan${ben}"${V}>
        <g id="${p}-duiHinh${ben}">
          <rect x="-13" y="-6" width="26" height="${DAI.dui + 8}" rx="12" fill="${this.mau.quan}"/>
        </g>
        <g id="${p}-ong${ben}">
          <g id="${p}-ongHinh${ben}">
            <circle cx="0" cy="0" r="11" fill="${this.mau.quan}"/>
            <rect x="-11" y="-2" width="22" height="${DAI.ong + 2}" rx="10" fill="${this.mau.quan}"/>
          </g>
          <g id="${p}-banChanG${ben}">
          ${this.nv.giay(p, ben, this.mau, DAI.ong)}
          <!-- Vạch đế nằm CHUNG nhóm với giày nghiêng: để rời thì nó không xoay, không lật, không ẩn theo giày — nhìn thẳng vẫn hiện một vạch ngang qua mũi giày. -->
          <g id="${p}-banNg${ben}"><path d="M -10 ${DAI.ong - 3} Q -13 ${DAI.ong + 6} -6 ${DAI.ong + 10} L 18 ${DAI.ong + 10} Q 27 ${DAI.ong + 10} 26 ${DAI.ong + 5} Q 25 ${DAI.ong + 1} 15 ${DAI.ong - 1} L 5 ${DAI.ong - 4} Q -3 ${DAI.ong - 7} -10 ${DAI.ong - 3} Z" fill="${this.mau.giay}"/>
          <path d="M -8 ${DAI.ong + 5} L 18 ${DAI.ong + 5}" stroke="#2c3442" stroke-width="1.2" opacity=".6" data-de="1"/></g>
          </g>
        </g>
      </g>`;
  }
  static #lanBanChan(dui, ong) {
    const k = clamp(ong / 40, 0, 1);
    return (1 - k) * (Math.max(0, dui) * 1.4 - Math.max(0, -dui) * 0.45) + k * (dui + ong + 12);
  }
  #backSkullColor() {
    const hasHat = String(this.nv.mu(this.id, this.mau, this.nv) || '').trim() !== '';
    return (hasHat && this.mau[this.nv.mauSoSau]) || this.mau.toc;
  }
  #V() { return this.mau.vien ? ` filter="url(#${this.id}-vien)"` : ''; }
  #Vda() { return ''; }
  #Vtay() { return this.nv.tayDai ? this.#V() : this.#Vda(); }
  #dungSVG() {
    const p = this.id, V = this.#V();
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${KHUNG.w} ${KHUNG.h}" width="100%" height="100%" style="display:block;overflow:visible">
  <defs>
    ${this.mau.vien ? `<filter id="${p}-vien" x="-30%" y="-30%" width="160%" height="160%">
    <feMorphology in="SourceAlpha" operator="dilate" radius="${this.nv.vienRong}" result="d"/>
    <feFlood flood-color="${this.mau.vien}" result="c"/><feComposite in="c" in2="d" operator="in" result="o"/>
    <feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : ''}
    <clipPath id="${p}-momClip"><path id="${p}-momClipP"/></clipPath>
    <clipPath id="${p}-vaiCat"><rect id="${p}-vaiCatL" x="-70" y="-150" width="52" height="80"/><rect id="${p}-vaiCatR" x="18" y="-150" width="52" height="80"/></clipPath>
    <clipPath id="${p}-lowHairClip"><rect id="${p}-lowHairClipR" x="-200" width="400" height="300"/></clipPath>
    <clipPath id="${p}-matClip"><path id="${p}-matClipP" d="${this.nv.dau(this.mau, this.nv)}"/></clipPath>
  </defs>
  <g id="${p}-goc">
    <ellipse id="${p}-bong" cx="200" cy="428" rx="62" ry="8" fill="#000" opacity=".28"/>
    <g id="${p}-sauChan"></g>
    <g id="${p}-chanG" transform="translate(${HONG.x} ${HONG.y})">
      <g id="${p}-hongL" transform="translate(-14 0)">${this.#chan('L')}</g>
      <g id="${p}-hongR" transform="translate(14 0)">${this.#chan('R')}</g>
      ${this.nv.skirt ? `<path id="${p}-skirt" fill="${this.mau.skirt || this.mau.ao}" stroke-linejoin="round"${V}/>` : ''}
    </g>
    <g id="${p}-than">
      <g id="${p}-sau"><g id="${p}-batL"${this.#Vtay()}>${this.#canhTay('L')}</g></g>
      <g${V}>
      <path id="${p}-ao" d="${this.nv.ao(this.mau)}" fill="${this.mau.ao}"/>
      <path id="${p}-vaiL" d="${veDemVai(this.nv, 'L', 0)}" fill="${this.mau.ao}" transform="translate(${-CHOT_VAI.x} ${CHOT_VAI.y})"/>
      <path id="${p}-vaiR" d="${veDemVai(this.nv, 'R', 0)}" fill="${this.mau.ao}" transform="translate(${CHOT_VAI.x} ${CHOT_VAI.y})"/>
      <path id="${p}-mayVaiL" d="${veDuongMayVai(this.nv, 'L', 0)}" fill="none" stroke="${chinhSang(this.mau.ao, -0.45)}" stroke-width="1.5" stroke-linecap="round" opacity=".85" transform="translate(${-CHOT_VAI.x} ${CHOT_VAI.y})"/>
      <path id="${p}-mayVaiR" d="${veDuongMayVai(this.nv, 'R', 0)}" fill="none" stroke="${chinhSang(this.mau.ao, -0.45)}" stroke-width="1.5" stroke-linecap="round" opacity=".85" transform="translate(${CHOT_VAI.x} ${CHOT_VAI.y})"/>
      <path id="${p}-suon" d="${this.nv.suon}" fill="${this.mau.aoToi}" opacity="${this.nv.damSuon}"/>
      </g>
      ${this.nv.phuKien(p, this.mau, this.nv)}
      <g id="${p}-tren">
        <g id="${p}-co"${this.#Vda()}>
        <path id="${p}-coDa" d="M -13 -130 L 13 -130 L 13.5 -106 Q 15 -100 20 -96 L -20 -96 Q -15 -100 -13.5 -106 Z" fill="${this.mau.da}"/>
        <path d="M -13 -130 L 13 -130 L 13 -118 Q 0 -113 -13 -118 Z" fill="${this.mau.daToi}" opacity=".55"/>
        </g>
        <g id="${p}-coAo">${this.nv.coAo(p, this.mau)}</g>
        <g id="${p}-dau"${V}>
          <g transform="translate(0 -62)">
            <g id="${p}-veTay">
            <g id="${p}-tocLung"><ellipse id="${p}-tocLungE" fill="${this.nv.backHair === 'full' ? this.#backSkullColor() : this.mau.da}"/>
              ${this.nv.backHair === 'low' ? `<g clip-path="url(#${p}-lowHairClip)"><ellipse id="${p}-tocLungLow" fill="${this.mau.toc}"/></g>` : ''}</g>
            <path id="${p}-khuon" d="${this.nv.dau(this.mau, this.nv)}" fill="${this.mau.da}"/>
            <g id="${p}-tocG">${this.nv.toc(p, this.mau)}
            </g>
            <g clip-path="url(#${p}-matClip)"><g id="${p}-tocGay" fill="${this.mau.toc}"><path id="${p}-tocGayP"/></g></g>
            <g id="${p}-taiL"><ellipse rx="7" ry="9" fill="${this.mau.da}"/>
              <path id="${p}-taiNetL" d="M 1.8 -4.5 Q -3.2 -1 0.8 4.5" stroke="${this.mau.daToi}" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0"/></g>
            <g id="${p}-taiR"><ellipse rx="7" ry="9" fill="${this.mau.da}"/>
              <path id="${p}-taiNetR" d="M -1.8 -4.5 Q 3.2 -1 -0.8 4.5" stroke="${this.mau.daToi}" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0"/></g>
            <g id="${p}-muG">${this.nv.mu(p, this.mau, this.nv)}</g>
            <g clip-path="url(#${p}-matClip)"><g id="${p}-ma">
            <ellipse id="${p}-maL" cy="${this.nv.maY}" ry="${this.nv.maRong * 0.62}" fill="${this.mau.ma}" opacity=".55"/>
            <ellipse id="${p}-maR" cy="${this.nv.maY}" ry="${this.nv.maRong * 0.62}" fill="${this.mau.ma}" opacity=".55"/>
            </g></g>
            </g>
            <g id="${p}-net">
            ${this.nv.mat(p, 'L', this.mau)}
            ${this.nv.mat(p, 'R', this.mau)}
            <path id="${p}-mayL" d="${veChanMay(this.nv.may, 'L')}" fill="${this.mau.may}"/>
            <path id="${p}-mayR" d="${veChanMay(this.nv.may, 'R')}" fill="${this.mau.may}"/>
            <g id="${p}-mui">${this.nv.mui(this.mau)}</g>
            <g id="${p}-netThem">${this.nv.net(p, this.mau)}</g>
            <g id="${p}-beard">${this.nv.beard(p, this.mau, this.nv)}</g>
            <g id="${p}-momG">
              <path id="${p}-mieng" fill="${this.mau.miengToi}" stroke="${this.mau.mieng}" stroke-linejoin="round" stroke-linecap="round"/>
              <g clip-path="url(#${p}-momClip)">
                <path id="${p}-luoi" fill="${this.mau.luoi}" opacity="0"/>
                    <path id="${p}-rang" fill="${this.mau.rang}" opacity="0"/>
              </g>
              <path id="${p}-moiTren" fill="none" stroke="${this.mau.mieng}" stroke-linecap="round"/>
            </g>
            </g>
          </g>
        </g>
        <g id="${p}-batR"${this.#Vtay()}>${this.#canhTay('R')}</g>
        <g id="${p}-phuKienTren" clip-path="url(#${p}-vaiCat)">${this.nv.phuKienTren(p, this.mau, this.nv)}</g>
      </g>
    </g>
  </g>
</svg>`;
  }
  #layPhanTu() {
    const q = (n) => this.svg.querySelector('#' + this.id + '-' + n);
    this.el = {
      goc: q('goc'), bong: q('bong'), chanG: q('chanG'), than: q('than'), ao: q('ao'), tren: q('tren'), sau: q('sau'), sauChan: q('sauChan'), dau: q('dau'),
      hongL: q('hongL'), hongR: q('hongR'), tocG: q('tocG'), tocSau: q('tocSau'), tocTruoc: q('tocTruoc'), tocBui: q('tocBui'), coAo: q('coAo'), muG: q('muG'), co: q('co'), coDa: q('coDa'), phuKienTren: q('phuKienTren'), vaiCatL: q('vaiCatL'), vaiCatR: q('vaiCatR'),
      tocLungE: q('tocLungE'), tocLungLow: q('tocLungLow'), lowHairClipR: q('lowHairClipR'), tocGay: q('tocGay'), tocGayP: q('tocGayP'), taiNetL: q('taiNetL'), taiNetR: q('taiNetR'), matClipP: q('matClipP'), phuKien: q('phuKien'), suon: q('suon'), banL: q('banL'), banR: q('banR'), banNgL: q('banNgL'), banNgR: q('banNgR'), net: q('net'), ma: q('ma'), maL: q('maL'), maR: q('maR'), taiL: q('taiL'), taiR: q('taiR'),
      chanL: q('chanL'), chanR: q('chanR'), ongL: q('ongL'), ongR: q('ongR'), skirt: q('skirt'), itemL: q('itemL'), itemR: q('itemR'),
      batL: q('batL'), batR: q('batR'), cangL: q('cangL'), cangR: q('cangR'),
      vaiL: q('vaiL'), vaiR: q('vaiR'), mayVaiL: q('mayVaiL'), mayVaiR: q('mayVaiR'),
      tayAoL: q('tayAoL'), tayAoR: q('tayAoR'), gauTayAoL: q('gauTayAoL'), gauTayAoR: q('gauTayAoR'),
      canhHinhL: q('canhHinhL'), canhHinhR: q('canhHinhR'), cangHinhL: q('cangHinhL'), cangHinhR: q('cangHinhR'),
      coTayL: q('coTayL'), coTayR: q('coTayR'),
      duiHinhL: q('duiHinhL'), duiHinhR: q('duiHinhR'), ongHinhL: q('ongHinhL'), ongHinhR: q('ongHinhR'),
      banChanGL: q('banChanGL'), banChanGR: q('banChanGR'),
      matL: q('matL'), matR: q('matR'), nguoiL: q('nguoiL'), nguoiR: q('nguoiR'),
      mayL: q('mayL'), mayR: q('mayR'), mieng: q('mieng'), rang: q('rang'),
      khuon: q('khuon'), mui: q('mui'), netThem: q('netThem'),
      momG: q('momG'), momClipP: q('momClipP'), luoi: q('luoi'),
      moiTren: q('moiTren'),
      tayG: { L: q('tayL'), R: q('tayR') },
      tay: {
        L: Object.fromEntries([...q('tayL').children].map((g) => [g.dataset.tay, g])),
        R: Object.fromEntries([...q('tayR').children].map((g) => [g.dataset.tay, g])),
      },
    };
    if (this.el.tocSau) this.el.tocSau.style.display = 'none';   // slot kiểu cũ: rig tự sinh tóc sau đầu
  }
  apDung() {
    const s = this.s, e = this.el;
    const doiChan = this.hangChan();
    const seatDrop = DAI.dui * this.nv.daiDui * this.nv.coChan * 0.72 * clamp(s.seat, 0, 1);
    e.goc.setAttribute('transform', `translate(${s.x} ${s.y + seatDrop + DOI_Y + doiChan}) translate(200 428) scale(${s.co}) translate(-200 -428)`);
    e.goc.setAttribute('opacity', s.mo);
    const nhac = clamp(-s.y / 40, 0, 1);
    e.bong.setAttribute('transform', `translate(200 ${428 - doiChan - seatDrop / (s.co || 1)}) scale(${1 - nhac * 0.25} 1) translate(-200 -428)`);   // trừ seatDrop: bóng nằm lại dưới bàn chân
    e.bong.setAttribute('opacity', 0.28 - nhac * 0.12);
    const h = s.huong, ah = Math.abs(h);
    const { daiDui, daiOng, dayChan, cachChan, coBanChan } = this.nv;
    e.hongL.setAttribute('transform', `translate(${-cachChan * (1 - ah * 0.7) - ah * 3} 0)`);
    e.hongR.setAttribute('transform', `translate(${cachChan * (1 - ah * 0.7) + ah * 3} 0)`);
    for (const ben of ['L', 'R']) {
      e['duiHinh' + ben].setAttribute('transform', `scale(${dayChan} ${daiDui})`);
      e['ongHinh' + ben].setAttribute('transform', `scale(${dayChan} ${daiOng})`);
      e['banChanG' + ben].setAttribute('transform',
        `translate(0 ${DAI.ong * daiOng}) scale(${coBanChan}) translate(0 ${-DAI.ong})`);
    }
    const dauH = Math.sign(h || 1);
    const goc = (dui, ong) => ah * dauH * (RigSVG.#lanBanChan(dauH * dui, dauH * ong) - dauH * (dui + ong));
    for (const ben of ['L', 'R']) {
      const dui = s['dui' + ben], ong = s['ong' + ben];
      e['ban' + ben].setAttribute('opacity', 1 - ah);
      e['banNg' + ben].setAttribute('opacity', ah);
      const tf = `rotate(${goc(dui, ong)} 0 ${DAI.ong}) scale(${h < 0 ? -1 : 1} 1)`;
      e['ban' + ben].setAttribute('transform', tf);
      e['banNg' + ben].setAttribute('transform', tf);
    }
    const xa = ah > 0.1 ? (h > 0 ? 'R' : 'L') : null;
    for (const ben of ['L', 'R']) {
      const carrying = ben === xa && this.holds[ben] && s['item' + ben] > 0.5;
      const tay = e['bat' + ben], cho = ben === xa && !(carrying && ah < 0.8) && s['aim' + ben] < 0.5 ? e.sauChan : e.tren;      // tay XA nằm sau cả hai CHÂN: để nó sau thân mà trước chân thì bàn tay ló ra giữa hai đùi như một vệt da
      if (tay.parentNode !== cho) cho.appendChild(tay);
      const mo = ben === (h > 0 ? 'R' : 'L') && !carrying ? ah * (1 - clamp(s['aim' + ben], 0, 1)) : 0;
      for (const limb of [e['chan' + ben], tay]) {
        const outline = limb.getAttribute('filter');
        limb.style.filter = mo ? `${outline ? outline + ' ' : ''}brightness(${1 - mo * 0.28})` : '';
      }
    }
    if (xa && e['bat' + xa].parentNode === e.tren) e.tren.appendChild(e['bat' + (xa === 'L' ? 'R' : 'L')]);      // tay gần vẫn nằm trên tay xa đang cầm đồ
    if (!xa) {
      const diem = (b) => Math.abs(s['bat' + b]) + Math.abs(s['cang' + b]);
      const tren = diem('L') > diem('R') + 8 ? e.batL : e.batR, duoi = tren === e.batL ? e.batR : e.batL;
      if (duoi.compareDocumentPosition(tren) & Node.DOCUMENT_POSITION_PRECEDING) e.tren.appendChild(tren);
    }
    if (e.tren.lastElementChild !== e.phuKienTren) e.tren.appendChild(e.phuKienTren);
    e.phuKienTren.style.display = ah > 0.12 ? 'none' : '';
    const gan = h > 0 ? e.hongL : e.hongR;                  // chân gần vẽ sau cùng (nằm trên)
    if (e.chanG.lastElementChild !== gan && e.chanG.lastElementChild !== e.skirt) e.chanG.appendChild(gan);
    else if (e.skirt && e.skirt.previousElementSibling !== gan) e.chanG.insertBefore(gan, e.skirt);      // váy luôn nằm trên cả hai chân
    const nv = this.nv, K = nv.khuon, k = mem(ah), sg = h < 0 ? -1 : 1;
    const co = 1 - ah * 0.15, lech = h * nv.netLech;
    e.net.setAttribute('transform', `translate(${lech} 0) scale(${co} 1)`);
    for (const [ben, dau] of [['L', -1], ['R', 1]]) {
      const xa = Math.max(0, dau * h);                    // 1 = má này nằm phía mặt đang quay tới
      e['ma' + ben].setAttribute('cx', lech + co * dau * nv.maX);
      e['ma' + ben].setAttribute('rx', nv.maRong * co * (1 - xa * 0.25));
    }
    const G = nv.khuonGoc;
    const coToc = `scale(${(K.rong / G.rong).toFixed(4)} ${((K.cao + K.yRong) / (G.cao + G.yRong)).toFixed(4)})`;
    e.tocG.setAttribute('transform', coToc);
    e.muG.setAttribute('transform', `${coToc} translate(${h * nv.tocLech} 0)`);   // mũ đi đúng theo mái tóc
    e.tocTruoc.setAttribute('transform', `translate(${h * nv.tocLech} 0)`);
    if (e.tocBui) e.tocBui.setAttribute('transform', `translate(${-h * (nv.buiLech + nv.tocLech)} ${ah * 3})`);
    e.tocLungE.setAttribute('cx', -h * K.rong * 0.3);
    e.tocLungE.setAttribute('cy', -K.cao * 0.22);
    e.tocLungE.setAttribute('rx', K.rong - 1);
    e.tocLungE.setAttribute('ry', K.cao * 0.78 - 1);
    const hairline = -K.cao * 0.3;
    e.lowHairClipR.setAttribute('y', hairline);
    if (e.tocLungLow) for (const a of ['cx', 'cy', 'rx', 'ry']) e.tocLungLow.setAttribute(a, e.tocLungE.getAttribute(a));
    const xN = -K.rong - 8, tai = -nv.taiX * (1 - 0.18 * k), X = (d) => (xN + (d - xN) * k).toFixed(2);
    e.tocGay.setAttribute('transform', `scale(${sg} 1)`);
    const napeTop = nv.backHair === 'low'
      ? `M ${xN} ${hairline} L ${X(tai + 6)} ${hairline} Q ${X(tai + 10)} ${(hairline + 2) / 2} ${X(tai + 1)} 3`
      : `M ${xN} ${-K.cao - 8} L ${X(-K.rong * 0.1)} ${-K.cao - 8} Q ${X(tai + 15)} ${-K.cao * 0.5} ${X(tai + 7)} -5`;
    e.tocGayP.setAttribute('d', k < 0.001 || nv.backHair === 'none' ? '' :
      `${napeTop} L ${X(tai)} 3 Q ${X(tai - 1)} ${K.cam * 0.3} ${xN} ${K.cam * 0.6} Z`);
    e.suon.setAttribute('opacity', 0.45 * (1 - ah));           // vệt tối sườn chỉ hợp khi nhìn thẳng
    const w4 = beRongTaiY(K, 4);
    for (const [ben, dau] of [['L', -1], ['R', 1]]) {
      const gan = Math.max(0, -dau * h), xa = Math.max(0, dau * h);
      const x = gan ? nv.taiX * (1 - 0.18 * mem(gan)) : nv.taiX + (w4 - 6 - nv.taiX) * mem(xa);
      e['tai' + ben].setAttribute('transform', `translate(${dau * x} 4) scale(${1 - 0.15 * gan - 0.5 * xa} 1)`);
      e['taiNet' + ben].setAttribute('opacity', mem(gan));
    }
    const splay = RigSVG.SEAT_SPLAY * clamp(s.seat, 0, 1) * (1 - ah);
    const thighSeen = (1 - clamp(s.seat, 0, 1) * 0.72) / Math.cos(splay * RAD), shinFix = ` scale(1 ${(1 / thighSeen).toFixed(4)})`;
    e.chanL.setAttribute('transform', `rotate(${s.duiL + s.nhacL * 6 + splay}) scale(1 ${(1 - s.nhacL * 0.42) * thighSeen})`);
    e.chanR.setAttribute('transform', `rotate(${s.duiR - s.nhacR * 6 - splay}) scale(1 ${(1 - s.nhacR * 0.42) * thighSeen})`);
    e.ongL.setAttribute('transform', `translate(0 ${DAI.dui * daiDui})${shinFix} rotate(${s.ongL - splay})`);      // co ngược TRƯỚC rồi mới xoay: xoay trước thì phép co làm ống chân xiên đi
    e.ongR.setAttribute('transform', `translate(0 ${DAI.dui * daiDui})${shinFix} rotate(${s.ongR + splay})`);      // co ngược TRƯỚC rồi mới xoay: xoay trước thì phép co làm ống chân xiên đi
    if (e.skirt) {
      const K = this.nv.skirt, thigh = DAI.dui * daiDui, halfLeg = 13 * dayChan, flare = K.flare ?? 4;
      const reach = (K.length ?? 1) * thigh;                     // gấu cách hông bao xa, đo dọc theo chân
      const along = (side, offset) => {
        const hipX = (side === 'L' ? -1 : 1) * (cachChan * (1 - ah * 0.7) + ah * 3);
        const a = (s['dui' + side] + (side === 'L' ? 1 : -1) * (s['nhac' + side] * 6 + splay)) * RAD;
        const squash = (1 - s['nhac' + side] * 0.42) * thighSeen;                // đùi rút ngắn khi nhấc gối / khi ngồi
        const onThigh = Math.min(reach, thigh) * squash, past = Math.max(0, reach - thigh);
        const b = a + (s['ong' + side] - (side === 'L' ? 1 : -1) * splay) * RAD;
        return [hipX + offset * Math.cos(a) - onThigh * Math.sin(a) - past * Math.sin(b), offset * Math.sin(a) + onThigh * Math.cos(a) + past * Math.cos(b)];
      };
      const waist = cachChan * (1 - ah * 0.7) + ah * 3 + halfLeg;
      let L, R, top;
      if (K.kind === 'apron') {
        const cL = along('L', 0), cR = along('R', 0), mid = [(cL[0] + cR[0]) / 2 + h * waist * 0.55, Math.max(cL[1], cR[1])];
        const half = waist * 0.66 * (1 - ah * 0.5);
        L = [mid[0] - half - flare * 0.4, mid[1]]; R = [mid[0] + half + flare * 0.4, mid[1]];
        top = [h * waist * 0.5 - half * 0.92, h * waist * 0.5 + half * 0.92];
      } else {
        L = along('L', -(halfLeg + flare)); R = along('R', halfLeg + flare);
        if (L[0] > R[0]) [L, R] = [R, L];
        const waistTop = waist * (1 - ah * 0.3);                 // thân nhìn nghiêng hẹp hơn hai chân chụm lại
        top = [-waistTop, waistTop];
      }
      const sag = Math.max(L[1], R[1]) + 3.5;
      e.skirt.setAttribute('d', `M ${top[0].toFixed(2)} -4 L ${top[1].toFixed(2)} -4 L ${R[0].toFixed(2)} ${R[1].toFixed(2)} Q ${((L[0] + R[0]) / 2).toFixed(2)} ${sag.toFixed(2)} ${L[0].toFixed(2)} ${L[1].toFixed(2)} Z`);
    }
    const stoop = clamp(this.nv.stoop || 0, 0, 1);
    const wide = clamp(this.nv.torsoWidth || 1, 0.7, 1.6);
    e.than.setAttribute('transform', `translate(${HONG.x} ${HONG.y}) rotate(${s.than + h * stoop * 10}) scale(${this.nv.coThan * wide} ${this.nv.coThan * (1 - stoop * 0.05)})`);
    e.chanG.setAttribute('transform', `translate(${HONG.x} ${HONG.y}) scale(1 ${this.nv.coChan})`);
    const nhacY = -s.tho * 2.5 + s.vai;
    const bienAo = `translate(${h * 2} ${nhacY}) scale(${(1 + s.tho * 0.03) * (1 - ah * 0.4)} 1)`;  // ngực nở khi hít, hẹp khi xoay
    e.ao.setAttribute('transform', bienAo);
    if (e.suon) e.suon.setAttribute('transform', bienAo);
    if (e.phuKien) e.phuKien.setAttribute('transform', bienAo);
    e.phuKienTren.setAttribute('transform', `translate(${h * 2} 0) scale(${(1 + s.tho * 0.03) * (1 - ah * 0.4)} 1)`);
    const caoCat = 150 + CHOT_VAI.y + (24 * this.nv.daiTayAo - this.nv.xeoTayAo) * this.nv.daiCanhTay + 2;
    e.vaiCatL.setAttribute('height', caoCat);
    e.vaiCatR.setAttribute('height', caoCat);
    e.tren.setAttribute('transform', `translate(0 ${nhacY})`);
    e.sau.setAttribute('transform', `translate(0 ${nhacY})`);
    e.sauChan.setAttribute('transform', `${e.than.getAttribute('transform')} translate(0 ${nhacY})`);        // lớp tay xa nằm ngoài nhóm thân nên phải mang theo phép biến đổi của thân
    e.coAo.setAttribute('transform', `translate(${h * 3} 0) scale(${1 - ah * 0.45} 1)`);   // cổ áo hẹp theo thân, lệch về phía ngực
    const coHep = 1 - ah * 0.2, chanCo = 20 * (1 - ah * 0.5) / coHep, eoCo = 15 - ah * 4;
    e.co.setAttribute('transform', `translate(${h * 3} 0) scale(${coHep} 1)`);
    e.coDa.setAttribute('d', `M -13 -130 L 13 -130 L 13.5 -106 Q ${eoCo} -100 ${chanCo} -96 L ${-chanCo} -96 Q ${-eoCo} -100 -13.5 -106 Z`);
    e.dau.setAttribute('transform', `translate(${s.dauX + h * (2.5 + stoop * 7)} ${-103 + this.nv.dauLech + s.dauY + stoop * 9}) rotate(${s.dau}) scale(${this.nv.coDau / wide} ${this.nv.coDau})`);
    e.itemL.setAttribute('opacity', clamp(s.itemL, 0, 1));
    e.itemR.setAttribute('opacity', clamp(s.itemR, 0, 1));
    const tayTheoSau = (bat, cang, v) => {
      const truoc = Math.max(0, v), sau = Math.max(0, -v);
      return {
        bat: bat - truoc * 5 + sau * 11,
        cang: cang - truoc * 44 - sau * 10,
        co: 1 - Math.abs(v) * 0.26,
      };
    };
    const tL = tayTheoSau(s.batL, s.cangL, s.vungL), tR = tayTheoSau(s.batR, s.cangR, s.vungR);
    const psi = ah * 90 * RAD, cF = Math.cos(psi), sF = Math.sin(psi) * sg;
    const tayNghieng = (cang, v) => {
      const gap = Math.max(0, -cang) * 0.75;        // gập vào trước bụng → nhìn nghiêng là gập ra TRƯỚC
      return { bat: 24 * v - gap * 0.2, cang: clamp(4 + gap + 6 * v + 16 * Math.max(0, v), 2, 150) };
    };
    const nL = tayNghieng(s.cangL, s.vungL), nR = tayNghieng(s.cangR, s.vungR);
    for (const [side, arm] of [['L', nL], ['R', nR]]) if (this.holds[side] && s['item' + side] > 0.5) arm.cang += (Math.max(arm.cang, 86) - arm.cang) * clamp(s['carry' + side], 0, 1);
    const gocVai = { L: GOC_VAI_MAX * mem((Math.abs(tL.bat) * cF - 40) / 110), R: GOC_VAI_MAX * mem((Math.abs(tR.bat) * cF - 40) / 110) };
    const ghep = { L: mem((Math.abs(tL.bat) * cF - 15) / 50), R: mem((Math.abs(tR.bat) * cF - 15) / 50) };
    const chotX = { L: -CHOT_VAI.x * (1 - ah * 0.92) - ah * 2, R: CHOT_VAI.x * (1 - ah * 0.92) + ah * 2 };
    const tuck = Math.sin(Math.PI * Math.min(1, ah)) * 8;
    if (h > 0) chotX.R -= tuck; else if (h < 0) chotX.L += tuck;
    const doiChot = {};
    const { daiCanhTay, daiCangTay, dayTay, coBanTay } = this.nv;
    for (const ben of ['L', 'R']) {
      const sg = ben === 'L' ? -1 : 1;
      doiChot[ben] = nhacChotVai(ben, gocVai[ben]);
      e['canhHinh' + ben].setAttribute('transform', `scale(${dayTay} ${daiCanhTay})`);
      e['cangHinh' + ben].setAttribute('transform', `scale(${dayTay} ${daiCangTay})`);
      e['coTay' + ben].setAttribute('transform', `translate(0 ${DAI.cangTay * daiCangTay}) scale(${coBanTay})`);
      const bienDoi = `translate(${chotX[ben]} ${CHOT_VAI.y + nhacY}) rotate(${-sg * gocVai[ben]} ${-sg * (CHOT_VAI.x - UC_DON.x)} ${UC_DON.y - CHOT_VAI.y}) scale(${dayTay} ${daiCanhTay})`;
      e['vai' + ben].setAttribute('d', veDemVai(this.nv, ben, ghep[ben]));
      e['vai' + ben].setAttribute('transform', bienDoi);
      e['mayVai' + ben].setAttribute('d', veDuongMayVai(this.nv, ben, ghep[ben]));
      e['mayVai' + ben].setAttribute('transform', bienDoi);
      e['mayVai' + ben].setAttribute('opacity', 0.85 * (1 - mem(ah * 2)));
    }
    const rotation = {
      batL: tL.bat * cF - sF * nL.bat, batR: -tR.bat * cF - sF * nR.bat,
      cangL: tL.cang * cF - sF * nL.cang, cangR: -tR.cang * cF - sF * nR.cang,
    };
    for (const [side, pose, sign] of [['L', tL, 1], ['R', tR, -1]]) {
      const aim = clamp(s['aim' + side], 0, 1);
      if (!aim) continue;
      rotation['bat' + side] += (sign * pose.bat - rotation['bat' + side]) * aim;
      rotation['cang' + side] += (sign * pose.cang - rotation['cang' + side]) * aim;
    }
    e.batL.setAttribute('transform', `translate(${chotX.L + doiChot.L.x} ${CHOT_VAI.y + doiChot.L.y}) rotate(${rotation.batL}) scale(1 ${1 - (1 - tL.co) * cF})`);
    e.batR.setAttribute('transform', `translate(${chotX.R + doiChot.R.x} ${CHOT_VAI.y + doiChot.R.y}) rotate(${rotation.batR}) scale(1 ${1 - (1 - tR.co) * cF})`);
    e.cangL.setAttribute('transform', `translate(0 ${DAI.canhTay * daiCanhTay}) rotate(${rotation.cangL})`);
    e.cangR.setAttribute('transform', `translate(0 ${DAI.canhTay * daiCanhTay}) rotate(${rotation.cangR})`);
    const armTurn = { L: rotation.batL + rotation.cangL, R: rotation.batR + rotation.cangR };
    for (const side of ['L', 'R']) if (this.holds[side]) {
      const upright = chuanHoaGoc(-90 - armTurn[side] - s.than);
      const tilt = s['itemTilt' + side];
      e['item' + side].setAttribute('transform', `rotate(${(upright + (side === 'L' ? 1 : -1) * tilt).toFixed(2)} 0 10) translate(0 ${(-tilt * 0.6).toFixed(2)})`);
    }
    for (const ben of ['L', 'R']) {
      const grip = this.NGHI['tay' + ben] !== 'mo' ? this.NGHI['tay' + ben] : 'nam';
      const chon = this.holds[ben] && s['item' + ben] > 0.5 ? grip : s['tay' + ben];
      const bat = Math.abs(s['bat' + ben]), cang = Math.abs(s['cang' + ben]), vung = Math.abs(s['vung' + ben]);
      const xoe = chon !== 'mo' ? 1 : clamp(Math.max(bat - 30, cang - 44) / 22, 0, 1)   // chỉ xoè khi giơ tay cao hoặc gập cẳng tay lên; vung tay khi đi vẫn thả lỏng;
      const dangXoe = xoe >= 0.5;
      for (const [k, g] of Object.entries(e.tay[ben])) {
        const op = chon === 'mo' ? (k === (dangXoe ? 'xoe' : 'mo') ? 1 : 0) : (k === chon ? 1 : 0);
        g.setAttribute('opacity', op);
      }
      const guong = ben === 'L' ? -1 : 1;
      const huongTay = chuanHoaGoc(ben === 'L' ? 90 + s.batL + s.cangL : 90 - s.batR - s.cangR);   // 90 = xuống, -90 = lên (đã chuẩn hoá về ±180)
      const len = clamp((-huongTay - 15) / 45, 0, 1);
      let lat = chon === 'mo' ? 1 - 2 * len : (len < 0.5 ? 1 : -1);
      const lon = (ben === 'R' ? Math.max(0, h) : Math.max(0, -h)) * (1 - clamp(s['aim' + ben], 0, 1));
      lat *= 1 - 2 * lon;
      e.tayG[ben].setAttribute('transform',
        `scale(${guong * lat} 1) rotate(${-12 * (1 - xoe)}) scale(${0.68 + 0.32 * xoe} 1)`);
    }
    const mi = Math.max(0.05, 1 - s.matY);
    const mc = this.nv.matCo;
    e.matL.setAttribute('transform', `translate(${-this.nv.matX} ${this.nv.matY}) scale(${mc * (1 - Math.max(0, -h) * 0.3)} ${mc * mi})`);
    e.matR.setAttribute('transform', `translate(${this.nv.matX} ${this.nv.matY}) scale(${mc * (1 - Math.max(0, h) * 0.3)} ${mc * mi})`);
    if (e.mui) e.mui.setAttribute('transform', `translate(${h * 3} ${this.nv.muiY}) scale(${this.nv.muiCo})`);
    if (e.netThem && this.nv.netTheoMat && this.nv.netGoc) {
      const g = this.nv.netGoc;
      e.netThem.setAttribute('transform',
        `translate(0 ${(this.nv.matY - g.matY).toFixed(2)}) scale(${(this.nv.matX / g.matX).toFixed(4)} ${this.nv.matCo})`);
    }
    e.nguoiL.setAttribute('transform', `translate(${s.nhinX + h * 1.2} ${s.nhinY})`);   // mắt nhìn theo hướng đi
    e.nguoiR.setAttribute('transform', `translate(${s.nhinX + h * 1.2} ${s.nhinY})`);
    const mx = this.nv.mayX ?? this.nv.matX;
    e.mayL.setAttribute('transform', `translate(${-mx} ${this.nv.mayY - s.mayL * 5}) scale(${1 - Math.max(0, -h) * 0.28} 1) rotate(${-s.mayL * 8})`);
    e.mayR.setAttribute('transform', `translate(${mx} ${this.nv.mayY - s.mayR * 5}) scale(${1 - Math.max(0, h) * 0.28} 1) rotate(${s.mayR * 8})`);
    this.#veMom();
  }
  #veMom() {
    const s = this.s, e = this.el, R = this.nv.miengRong;
    if (!e.momG) return;
    e.momG.setAttribute('transform', `translate(0 ${this.nv.miengY})`);
    const chum = clamp(s.chum || 0, 0, 1);
    const mo = clamp(s.mieng, 0, 1) * 10.1 * (1 + 0.55 * chum);
    const w = (11 + clamp(s.mieng, 0, 1) * 2) * R * (1 - 0.55 * chum);
    const vong = s.cuoi * 3.5 * R;          // đỉnh nét cười
    const nhac = mo * 0.26;                 // môi trên nhấc lên khi hé
    const dinhTren = vong - nhac, dinhDuoi = dinhTren + mo;
    const cungTren = `M ${-w} 0 Q 0 ${2 * dinhTren} ${w} 0`;
    const khoang = `${cungTren} C ${w * 0.42} ${dinhDuoi / 0.75} ${-w * 0.42} ${dinhDuoi / 0.75} ${-w} 0 Z`;
    e.mieng.setAttribute('d', khoang);
    e.mieng.setAttribute('stroke-width', this.nv.moiRong * 0.72);
    e.momClipP.setAttribute('d', khoang);
    const day = Math.min(mo * 0.55, 4.2);
    e.rang.setAttribute('opacity', day > 0.25 ? 1 : 0);
    if (day > 0.25) {
      const d0 = 0.15;
      e.rang.setAttribute('d',
        `M ${-w} ${d0} Q 0 ${2 * dinhTren + d0} ${w} ${d0}`
        + ` Q 0 ${2 * dinhTren + d0 + 2 * day} ${-w} ${d0} Z`);
    }
    const loLuoi = clamp((mo - 6) / 4, 0, 1);
    e.luoi.setAttribute('opacity', loLuoi * 0.9);
    if (loLuoi > 0) {
      const ry = mo * 0.34, cy = dinhDuoi - ry * 0.45;
      e.luoi.setAttribute('d',
        `M ${-w * 0.6} ${cy} Q 0 ${cy - ry} ${w * 0.6} ${cy} Q 0 ${cy + ry * 1.6} ${-w * 0.6} ${cy} Z`);
    }
    e.moiTren.setAttribute('d', cungTren);
    e.moiTren.setAttribute('stroke-width', this.nv.moiRong * 1.15);
  }
  doiThan(kieu) {
    for (const k of ['dauLech', 'coDau', 'coThan', 'coChan'])
      if (kieu[k] !== undefined) this.nv[k] = kieu[k];
    if (kieu.dauLech !== undefined) this.nv.dauLechGoc = this.nv.dauLech;
    this.apDung();
    const { dauLech, coDau, coThan, coChan } = this.nv;
    return { dauLech, coDau, coThan, coChan };
  }
  doiTay(kieu) {
    for (const k of ['daiCanhTay', 'daiCangTay', 'dayTay', 'coBanTay'])
      if (kieu[k] !== undefined) this.nv[k] = kieu[k];
    const nghi = {};
    if (kieu.batNghi !== undefined) { nghi.batL = kieu.batNghi + (this.NGHI.batL - this.NGHI.batR); nghi.batR = kieu.batNghi; }
    if (kieu.cangNghi !== undefined) { nghi.cangL = kieu.cangNghi + (this.NGHI.cangL - this.NGHI.cangR); nghi.cangR = kieu.cangNghi; }
    if (Object.keys(nghi).length) {
      this.nv.nghi = { ...(this.nv.nghi || {}), ...nghi };
      this.NGHI = Object.freeze({ ...this.NGHI, ...nghi });
    }
    this.datNghi();
    const { daiCanhTay, daiCangTay, dayTay, coBanTay } = this.nv;
    return { daiCanhTay, daiCangTay, dayTay, coBanTay, batNghi: this.NGHI.batR, cangNghi: this.NGHI.cangR };
  }
  doiDang(posture) {
    if (posture.stoop !== undefined) this.nv.stoop = clamp(posture.stoop, 0, 1);
    const skirt = this.nv.skirt;
    if (skirt) {
      const next = { ...skirt };
      if (posture.skirtLength !== undefined) next.length = clamp(posture.skirtLength, 0.2, 2);
      if (posture.skirtFlare !== undefined) next.flare = clamp(posture.skirtFlare, 0, 30);
      this.nv.skirt = next;
    }
    this.apDung();
    return { stoop: this.nv.stoop || 0, skirtLength: (this.nv.skirt && this.nv.skirt.length) ?? 1, skirtFlare: (this.nv.skirt && this.nv.skirt.flare) ?? 4 };
  }
  doiTayAo(kieu) {
    for (const k of ['daiTayAo', 'xeoTayAo', 'rongTayAo', 'vienGau', 'boGocTayAo'])
      if (kieu[k] !== undefined) this.nv[k] = kieu[k];
    for (const ben of ['L', 'R']) {
      this.el['tayAo' + ben].setAttribute('d', veTayAo(this.nv, ben));
      this.el['gauTayAo' + ben].setAttribute('d', veGauTayAo(this.nv, ben));
      this.el['gauTayAo' + ben].setAttribute('stroke-width', rongGau(this.nv));
    }
    this.apDung();
    const { daiTayAo, xeoTayAo, rongTayAo, vienGau, boGocTayAo } = this.nv;
    return { daiTayAo, xeoTayAo, rongTayAo, vienGau, boGocTayAo };
  }
  doiChan(kieu) {
    for (const k of ['daiDui', 'daiOng', 'dayChan', 'cachChan', 'coBanChan'])
      if (kieu[k] !== undefined) this.nv[k] = kieu[k];
    this.apDung();
    const { daiDui, daiOng, dayChan, cachChan, coBanChan } = this.nv;
    return { daiDui, daiOng, dayChan, cachChan, coBanChan };
  }
  seatY() {
    const nv = this.nv;
    return HONG.y + DOI_Y + this.hangChan() + DAI.dui * nv.daiDui * nv.coChan * 0.72 + 13 * nv.dayChan * nv.coChan;
  }
  shotBox(kind = 'face') {
    const nv = this.nv, s = this.s;
    const drop = this.hangChan() + DAI.dui * nv.daiDui * nv.coChan * 0.72 * clamp(s.seat, 0, 1) + s.y;
    const headY = HONG.y + (nv.coDau * -62 + (-103 + nv.dauLech)) * nv.coThan + DOI_Y + drop;
    const head = 64 * nv.coDau * nv.coThan;                    // nửa bề cao đầu, tính cả tóc
    const centre = KHUNG.w / 2 + s.x, hip = HONG.y + DOI_Y + drop;
    const box = (top, bottom, aspect = 1) => ({ x: centre - (bottom - top) * aspect / 2, y: top, width: (bottom - top) * aspect, height: bottom - top });
    if (kind === 'face') return box(headY - head * 1.3, headY + head * 1.08 + 5);     // chừa chỗ cho búi tóc / mũ phía trên
    if (kind === 'chest') return box(headY - head * 1.2, hip + 12, 0.8);
    if (kind === 'full') return box(headY - head * 1.25, 428 + DOI_Y + 14, 0.55);
    throw new Error(`[character] no shot "${kind}" (available: face, chest, full)`);
  }
  hangChan() {
    const nv = this.nv;
    return (428 - HONG.y) - (DAI.dui * nv.daiDui + DAI.ong * nv.daiOng + 10 * nv.coBanChan) * nv.coChan;
  }
  doiNetMat(kieu) {
    for (const k of ['matX', 'matY', 'matCo', 'muiY', 'muiCo', 'miengY', 'miengRong'])
      if (kieu[k] !== undefined) this.nv[k] = kieu[k];
    const w = beRongTaiY(this.nv.khuon, this.nv.matY) || 1;
    this.nv.tiNgang.matX = this.nv.matX / w;
    this.apDung();
    const { matX, matY, matCo, muiY, muiCo, miengY, miengRong } = this.nv;
    return { matX, matY, matCo, muiY, muiCo, miengY, miengRong };
  }
  doiKhuonMat(kieu) {
    this.nv.khuon = { ...this.nv.khuon, ...kieu };
    this.el.khuon.setAttribute('d', veKhuonMat(this.nv.khuon));
    this.el.matClipP.setAttribute('d', veKhuonMat(this.nv.khuon));   // má và tóc gáy cắt theo viền mới
    const K = this.nv.khuon, ti = this.nv.tiNgang, w = (y) => beRongTaiY(K, y);
    this.nv.taiX = w(4) * ti.taiX;
    this.nv.matX = w(this.nv.matY) * ti.matX;
    this.nv.maX = Math.min(w(this.nv.maY) * ti.maX, w(this.nv.maY) - this.nv.maRong * 0.7);
    this.nv.mayX = w(this.nv.mayY) * ti.mayX;
    const G = this.nv.khuonGoc;
    this.nv.dauLech = this.nv.dauLechGoc - (K.cam - G.cam) * this.nv.coDau;
    this.apDung();
    return { ...this.nv.khuon };
  }
  doiChanMay(kieu) {
    const { mayX, mayY, ...hinh } = kieu;
    if (mayX !== undefined) this.nv.mayX = mayX;
    if (mayY !== undefined) this.nv.mayY = mayY;
    if (Object.keys(hinh).length) {
      this.nv.may = { ...this.nv.may, ...hinh };
      this.el.mayL.setAttribute('d', veChanMay(this.nv.may, 'L'));
      this.el.mayR.setAttribute('d', veChanMay(this.nv.may, 'R'));
    }
    this.apDung();
    return { ...this.nv.may, mayX: this.nv.mayX ?? this.nv.matX, mayY: this.nv.mayY };
  }
  datNghi() { Object.assign(this.s, this.NGHI); this.apDung(); }
  tl() {
    return gsap.timeline({ paused: true, defaults: { lazy: false }, onUpdate: () => this.apDung(), onComplete: () => this.apDung() });
  }
  #restArm(side, shown = this.s['item' + side]) {
    if (this.holds[side] && shown <= 0.5) return [NGHI['bat' + side], NGHI['cang' + side]];
    return [this.NGHI['bat' + side], this.NGHI['cang' + side]];
  }
  #khep(t, d = 0.5, at = '>', giu = {}) {
    const so = {};
    for (const k in this.NGHI) if (typeof this.NGHI[k] === 'number' && k !== 'x') so[k] = this.NGHI[k];
    so.seat = this.s.seat; so.huong = this.s.huong;
    so.itemL = this.s.itemL; so.itemR = this.s.itemR;          // đồ vật đã cất thì vẫn cất
    const target = { ...so, ...giu }, hands = { tayL: this.NGHI.tayL, tayR: this.NGHI.tayR };
    for (const side of ['L', 'R']) {
      if (!this.holds[side] || target['item' + side] > 0.5) continue;
      const [upper, fore] = this.#restArm(side, target['item' + side]);
      target['bat' + side] = upper; target['cang' + side] = fore; hands['tay' + side] = 'mo';
    }
    t.to(this.s, { ...target, duration: d, ease: 'power2.inOut' }, at);
    t.set(this.s, hands, `>-${d * 0.5}`);
    return t;
  }
  #chop(t, at) {
    t.to(this.s, { matY: 1, duration: 0.07, ease: 'power1.in' }, at)
     .to(this.s, { matY: this.blinkTo || 0, duration: 0.11, ease: 'power1.out' }, at + 0.07);
  }
  #tuTheDi(f, a, kA = 1) {
    const N = this.NGHI, nv = this.nv, cc = nv.coChan, P = 2 * Math.PI;
    const Ld = DAI.dui * nv.daiDui, Lo = DAI.ong * nv.daiOng;       // chiều dài thật sau `doiChan`
    const u = (p, m, rong) => { const d = Math.abs(((((p - m) % 1) + 1.5) % 1) - 0.5); return Math.exp(-((d / rong) ** 2)); };
    const A = (Math.atan(Math.tan(21 * RAD) * cc) / RAD) * kA;
    const goi = (38 + 12 * kA) * (0.55 + 0.45 * cc);
    const chan = (p) => ({
      dui: -A * (Math.cos(P * p) + 0.3),
      ong: 2 + 11 * u(p, 0.1, 0.075) + goi * u(p, 0.7, 0.125),
    });
    const L = chan(f), R = chan(f + 0.5);
    const vung = Math.cos(P * (f - 0.05));                          // tay trễ hơn chân
    const nhip = (tre) => Math.cos(2 * P * (f - tre));              // nhịp theo BƯỚC (2 lần mỗi chu kỳ)
    const than = 3 - 0.9 * Math.cos(P * f) + 0.4 * nhip(0);
    const d = {
      duiL: L.dui, ongL: L.ong, duiR: R.dui, ongR: R.ong,
      vungL: -0.85 * kA * vung, vungR: 0.85 * kA * vung,
      batL: 5, batR: 5, cangL: -8, cangR: -8,
      than,
      dau: -0.55 * (than - 3) - 0.5 * nhip(0.06),      // đầu giữ thăng bằng: xoay ngược thân
      dauY: 0.7 - 0.7 * nhip(0.08), vai: 0.7 * nhip(0.11),
    };
    const o = {};
    for (const key in d) o[key] = N[key] + (d[key] - N[key]) * a;
    const de = (g, og) => {
      const ph = RigSVG.#lanBanChan(g, og) * RAD;                    // gót ở x −8, mũi ở x 24, đế ở y +10
      return nv.coBanChan * (Math.max(-8 * Math.sin(ph), 24 * Math.sin(ph)) + 10 * Math.cos(ph));
    };
    const tam = (g, og) => Ld * Math.cos(g * RAD) + Lo * Math.cos((g + og) * RAD) + de(g, og);
    const xa = (g, og) => -(Ld * Math.sin(g * RAD) + Lo * Math.sin((g + og) * RAD));
    const l = tam(o.duiL, o.ongL), r = tam(o.duiR, o.ongR);
    o.y = (Ld + Lo + 10 * nv.coBanChan - 0.5 * (l + r + Math.hypot(l - r, 3) - 3)) * cc;
    return { o, l, r, xl: xa(o.duiL, o.ongL), xr: xa(o.duiR, o.ongR) };
  }
  #baoDi(buoc, vao, ra) {
    return (b) => (vao ? mem(b / 0.7) : 1) * (ra ? mem((buoc - b) / 0.7) : 1);
  }
  #bangDi(buoc, vao, ra, kA) {
    const M = 40, n = buoc * M, X = [0], bao = this.#baoDi(buoc, vao, ra);
    let tr = this.#tuTheDi(0.75, bao(0), kA);
    for (let i = 1; i <= n; i++) {
      const b = i / M, ht = this.#tuTheDi(0.75 + b / 2, bao(b), kA);
      const tru = tr.l + ht.l >= tr.r + ht.r ? 'xl' : 'xr';          // chân trụ = chân đang thấp hơn
      X.push(X[i - 1] + Math.max(0, tr[tru] - ht[tru]));
      tr = ht;
    }
    return { tong: X[n], x: (b) => { const v = clamp(b, 0, buoc) * M, i = Math.min(n - 1, Math.floor(v)); return X[i] + (X[i + 1] - X[i]) * (v - i); } };
  }
  #doBuoc(quang, vao, ra) {
    let buoc = 2, b;
    do { buoc++; b = this.#bangDi(buoc, vao, ra, 1); } while (b.tong * 1.04 < quang && buoc < 14);
    let kA = 1;
    for (let i = 0; i < 4; i++) { kA *= quang / b.tong; b = this.#bangDi(buoc, vao, ra, kA); }
    return { buoc, kA, x: (v) => b.x(v) * (quang / b.tong) };
  }
  #di(t, at, buoc, h, { vao = true, ra = true, kA = 1, x = null, chieu = 1 } = {}) {
    const s = this.s, bao = this.#baoDi(buoc, vao, ra);
    const dat = (b) => {
      const o = this.#tuTheDi(0.75 + b / 2, bao(b), kA).o;
      if (chieu < 0) {
        const a = { ...o }, N = this.NGHI;
        for (const [l, r] of [['duiL', 'duiR'], ['ongL', 'ongR']]) { o[l] = -a[r]; o[r] = -a[l]; }
        o.vungL = a.vungR; o.vungR = a.vungL;
        o.than = N.than - (a.than - N.than); o.dau = N.dau - (a.dau - N.dau);
      }
      for (const side of ['L', 'R']) if (this.holds[side] && s['item' + side] > 0.5) o['vung' + side] *= 0.15;
      Object.assign(s, o);
      if (x) s.x = x(b);
    };
    const pr = { _b: 0, get b() { return this._b; }, set b(v) { this._b = v; dat(v); } };
    t.to(pr, { b: buoc, duration: buoc * h, ease: 'none' }, at);
    return at + buoc * h;
  }
  idle(dur = 4) {
    const t = this.tl(), s = this.s, ck = 3.2;
    for (let a = 0; a < dur; a += ck) {                // thở
      const d = Math.min(ck, dur - a);
      t.to(s, { tho: 1, duration: d * 0.45, ease: 'sine.inOut' }, a)
       .to(s, { tho: 0, duration: d * 0.55, ease: 'sine.inOut' }, a + d * 0.45);
    }
    t.to(s, { than: this.NGHI.than + 1.2, duration: dur / 2, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0);
    for (let b = nhieu(0.6, 1.2); b < dur - 0.3; b += nhieu(1.6, 3.6)) this.#chop(t, b);
    if (dur > 2.5) {                                   // liếc mắt một cái
      const a = dur * 0.4;
      const N = this.NGHI;
      t.to(s, { nhinX: N.nhinX + 2.6, nhinY: N.nhinY - 0.6, dau: N.dau + 1.5, duration: 0.25, ease: 'power2.out' }, a)
       .to(s, { nhinX: N.nhinX, nhinY: N.nhinY, dau: N.dau, duration: 0.35, ease: 'power2.inOut' }, a + 1.1);
    }
    return t;
  }
  static GESTURE_TURN = 0.3;
  static SEAT_SPLAY = 12;               // độ xoè của mỗi đùi khi ngồi (nhìn từ trước)
  #openUp(t) {
    const held = this.s.huong, limit = RigSVG.GESTURE_TURN;
    if (Math.abs(held) > limit) t.to(this.s, { huong: Math.sign(held) * limit, duration: 0.4, ease: 'sine.inOut' }, 0);
  }
  #stage(t, arms, at = 0) {
    if (!RigSVG.SCREEN_AIM) return this.#openUp(t);
    for (const arm of arms) t.to(this.s, { ['aim' + arm]: 1, duration: 0.3, ease: 'sine.inOut' }, at);
  }
  #stageSpeech(t, hand = null) {
    const h = this.s.huong, busy = (side) => this.holds[side] && this.s['item' + side] > 0.5;
    const order = hand === 'L' || (hand !== 'R' && h < -0.1) ? ['L', 'R'] : ['R', 'L'], lead = order.find((side) => !busy(side));
    if (!RigSVG.SCREEN_AIM || (lead && Math.abs(h) > 0.1 && lead !== (h < 0 ? 'L' : 'R'))) this.#openUp(t);
  }
  #freeHand(hand = 'auto') {
    if (hand === 'L' || hand === 'R') return hand;
    const busy = (side) => this.holds[side] && this.s['item' + side] > 0.5;
    const toward = this.s.huong < -0.1 ? 'L' : this.s.huong > 0.1 ? 'R' : null;
    if (toward && !busy(toward)) return toward;
    return busy('R') && !busy('L') ? 'L' : 'R';
  }
  #handsFull(hand) {
    return hand === 'auto' && ['L', 'R'].every((side) => this.holds[side] && this.s['item' + side] > 0.5);
  }
  #headGesture(t, end, tilt) {
    const s = this.s, N = this.NGHI;
    t.to(s, { dau: N.dau + tilt, cuoi: 1, mieng: 0.15, mayL: 0.6, mayR: 0.6, nhinX: tilt < 0 ? 1.2 : -1.2, duration: 0.35, ease: 'back.out(1.4)' }, 0.1);
    for (let i = 0; i < 2; i++) {
      t.to(s, { dauY: 4, duration: 0.16, ease: 'power2.out' }, 0.55 + i * 0.42)
       .to(s, { dauY: 0, duration: 0.24, ease: 'power2.inOut' }, 0.71 + i * 0.42);
    }
    this.#chop(t, end * 0.55);
    this.#khep(t, 0.5, end - 0.5);
    return t;
  }
  wave(hand = 'auto') {
    const t = this.tl(), s = this.s;
    if (this.#handsFull(hand)) return this.#headGesture(t, 2.25, -7);
    const side = this.#freeHand(hand), m = side === 'L' ? -1 : 1;                 // m lật các nghiêng thân / đầu
    this.#stage(t, [side]);
    const handK = 'tay' + side, upperK = 'bat' + side, foreK = 'cang' + side;
    t.set(s, { [handK]: 'mo' }, 0);
    t.to(s, { [upperK]: this.NGHI[upperK] - 4, [foreK]: this.NGHI[foreK] - 6, duration: 0.12, ease: 'sine.in' }, 0);
    const raise = 128 - (RigSVG.SCREEN_AIM ? Math.min(Math.abs(s.huong), 0.7) * 48 : 0), bend = 128 - raise;
    t.to(s, { [upperK]: raise, vai: -3, than: -3 * m, dau: -6 * m, nhinX: 1.5 * m, cuoi: 1, mieng: 0.15, mayL: 0.5, mayR: 0.5,
              duration: 0.5, ease: 'power2.out' }, 0.12);
    t.to(s, { [foreK]: 22 + bend, duration: 0.5, ease: 'power2.out' }, 0.16);
    const swings = [44, 8, 38, 14];
    swings.forEach((angle, i) => {
      t.to(s, { [foreK]: angle + bend, dau: (i % 2 ? -6 : -8.5) * m, duration: 0.25, ease: 'sine.inOut' }, 0.66 + i * 0.25);
      t.to(s, { [upperK]: raise + (i % 2 ? 3 : -3), duration: 0.25, ease: 'sine.inOut' }, 0.7 + i * 0.25);
    });
    this.#chop(t, 0.95);
    this.#khep(t, 0.55, 1.7);
    return t;
  }
  thumbsUp(hand = 'auto') {
    const t = this.tl(), s = this.s;
    if (this.#handsFull(hand)) return this.#headGesture(t, 2, -5);
    this.#openUp(t);
    const side = this.#freeHand(hand), m = side === 'L' ? -1 : 1;
    const handK = 'tay' + side, upperK = 'bat' + side, foreK = 'cang' + side;
    t.set(s, { [handK]: 'nam' }, 0);
    t.to(s, { [upperK]: -2, [foreK]: -30, duration: 0.15, ease: 'power1.in' }, 0);
    t.to(s, { [upperK]: 22, [foreK]: -140, than: -2 * m, dau: -5 * m, cuoi: 1, mieng: 0.12, mayL: 0.6, mayR: 0.6,
              duration: 0.4, ease: 'back.out(1.6)' }, 0.15);
    t.set(s, { [handK]: 'cai' }, 0.38);
    t.to(s, { dauY: 4, [foreK]: -146, duration: 0.15, ease: 'power2.out' }, 0.65)   // gật nhẹ kèm nhấn tay
     .to(s, { dauY: 0, [foreK]: -140, duration: 0.3, ease: 'power2.inOut' }, 0.8);
    this.#chop(t, 1.15);
    this.#khep(t, 0.5, 1.5);
    return t;
  }
  static SCREEN_AIM = true;              // tắt để so sánh với cách cũ (mở người về phía người xem rồi pha trộn góc)
  #shoulderX(side) {
    const h = this.s.huong, ah = Math.abs(h), tuck = Math.sin(Math.PI * Math.min(1, ah)) * 8;
    let x = (side === 'L' ? -1 : 1) * (CHOT_VAI.x * (1 - ah * 0.92) + ah * 2);
    if (h > 0 && side === 'R') x -= tuck; else if (h < 0 && side === 'L') x += tuck;
    return HONG.x + x * this.nv.coThan;
  }
  #shoulderY() {
    const seatDrop = DAI.dui * this.nv.daiDui * this.nv.coChan * 0.72 * clamp(this.s.seat, 0, 1);
    return HONG.y + this.hangChan() + seatDrop + CHOT_VAI.y * this.nv.coThan;
  }
  point(muc = null) {
    const t = this.tl(), s = this.s, screen = RigSVG.SCREEN_AIM;
    if (!screen) this.#openUp(t);
    let tx = 380, ty = 165;
    if (muc && typeof muc.x === 'number' && typeof muc.y === 'number' && !(muc instanceof Element)) {
      tx = muc.x - s.x; ty = muc.y - s.y - DOI_Y;      // toạ độ viewBox trực tiếp
    } else if (muc) {
      const r = muc instanceof Element ? muc.getBoundingClientRect() : muc;
      const sv = this.svg.getBoundingClientRect();
      const k = Math.min(sv.width / KHUNG.w, sv.height / KHUNG.h) || 1;   // svg chưa có kích thước → coi như 1:1
      const ox = sv.left + (sv.width - KHUNG.w * k) / 2, oy = sv.top + (sv.height - KHUNG.h * k) / 2;
      tx = (r.left + r.width / 2 - ox) / k - s.x;
      ty = (r.top + r.height / 2 - oy) / k - s.y - DOI_Y;
    }
    const ben = tx < HONG.x ? 'L' : 'R', v = screen ? { x: this.#shoulderX(ben), y: this.#shoulderY() } : VAI[ben];
    const goc = Math.atan2(ty - v.y, tx - v.x) * 180 / Math.PI;
    const bat = clamp(chuanHoaGoc(ben === 'L' ? goc - 90 : 90 - goc), -15, 172);
    const dau = clamp((tx - HONG.x) * 0.05, -10, 10);
    const nhinX = clamp((tx - HONG.x) * 0.02, -3, 3), nhinY = clamp((ty - 88) * 0.02, -2.5, 2.5);
    const tay = 'tay' + ben, batK = 'bat' + ben, cangK = 'cang' + ben;
    t.set(s, { [tay]: 'nam' }, 0);
    if (screen) t.to(s, { ['aim' + ben]: 1, duration: 0.3, ease: 'sine.inOut' }, 0.1);        // góc chỉ là góc trên màn hình, giữ nguyên hướng đang quay
    t.to(s, { [batK]: -3, [cangK]: -35, duration: 0.15, ease: 'power1.in' }, 0);          // rút tay lấy đà
    t.to(s, { [batK]: bat, [cangK]: 0, than: ben === 'L' ? 2.5 : -2.5, vai: bat > 90 ? -3 : 0,
              dau, nhinX, nhinY, cuoi: 0.6, mieng: 0.2, mayL: 0.5, mayR: 0.5,
              duration: 0.4, ease: 'back.out(1.3)' }, 0.15);
    t.set(s, { [tay]: 'chi' }, 0.3);
    t.to(s, { [cangK]: ben === 'L' ? 4 : 4, dauY: 3, duration: 0.18, ease: 'power2.out' }, 0.75)   // nhấn "kia kìa"
     .to(s, { [cangK]: 0, dauY: 0, duration: 0.25, ease: 'power2.inOut' }, 0.93);
    this.#khep(t, 0.55, 1.5);
    return t;
  }
  present() {
    const t = this.tl(), s = this.s;
    const arms = ['L', 'R'].filter((side) => !(this.holds[side] && s['item' + side] > 0.5));
    this.#stage(t, arms);
    const pose = (values) => Object.fromEntries(arms.flatMap((side) => [['bat' + side, values[side][0]], ['cang' + side, values[side][1]]]));
    t.set(s, Object.fromEntries(arms.map((side) => ['tay' + side, 'mo'])), 0);
    t.to(s, { ...pose({ L: [8, -75], R: [8, -75] }), dauY: 1, duration: 0.25, ease: 'power2.in' }, 0); // gom trước ngực
    t.to(s, { ...pose({ L: [40, 72], R: [46, 76] }), than: 2, dau: 6, dauX: 3,
              mayL: 0.7, mayR: 0.7, cuoi: 0.9, mieng: 0.3, nhinX: 1.5,
              duration: 0.5, ease: 'back.out(1.2)' }, 0.25);                       // mở ra
    const lead = arms.includes('R') ? 'R' : arms[0];
    t.to(s, { ...(lead ? { ['bat' + lead]: 54, ['cang' + lead]: 84 } : {}), dau: 8, duration: 0.3, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.95); // nhấn
    this.#chop(t, 1.2);
    this.#khep(t, 0.55, 1.65);
    return t;
  }
  nod() {
    const t = this.tl(), s = this.s, N = this.NGHI;
    t.to(s, { cuoi: 0.7, mayL: 0.3, mayR: 0.3, duration: 0.2 }, 0);
    for (let i = 0; i < 2; i++) {
      const a = i * 0.5;
      t.to(s, { dauY: 15, dau: N.dau + 1.5, nhinY: 2, than: N.than + 2.2, vai: N.vai + 2.5, duration: 0.2, ease: 'power2.out' }, a)
       .to(s, { dauY: 0, dau: N.dau, nhinY: 0, than: N.than, vai: N.vai, duration: 0.3, ease: 'power2.inOut' }, a + 0.2);
    }
    this.#chop(t, 0.55);
    this.#khep(t, 0.35, 1.05);
    return t;
  }
  shake() {
    const t = this.tl(), s = this.s;
    t.to(s, { cuoi: -0.1, mieng: 0, mayL: -0.4, mayR: -0.4, duration: 0.2 }, 0);
    const bien = [-16, 16, -13, 10, -5];           // lắc đủ rộng để thấy ở cỡ toàn thân
    bien.forEach((d, i) => {
      t.to(s, { dauX: d, dau: -d * 0.4, nhinX: -d * 0.3, duration: 0.18, ease: 'sine.inOut' }, i * 0.18);
    });
    t.to(s, { dauX: 0, dau: 0, nhinX: 0, duration: 0.2, ease: 'power2.out' }, bien.length * 0.18);
    this.#khep(t, 0.35, 1.15);
    return t;
  }
  cheer() {
    const t = this.tl(), s = this.s;
    this.#openUp(t);
    const busy = (side) => this.holds[side] && s['item' + side] > 0.5;
    const up = {};
    for (const side of ['L', 'R']) if (!busy(side)) { up['bat' + side] = 122; up['cang' + side] = 6; }
    t.set(s, Object.fromEntries(['L', 'R'].filter((side) => !busy(side)).map((side) => ['tay' + side, 'xoe'])), 0);
    t.to(s, { ...Object.fromEntries(Object.keys(up).map((key) => [key, key.startsWith('bat') ? -4 : 24])), dauY: 3, duration: 0.14, ease: 'power1.in' }, 0);     // lấy đà
    t.to(s, { ...up, vai: -5, dau: -3, dauY: 0, cuoi: 1, mieng: 0.55, mayL: 0.9, mayR: 0.9, duration: 0.36, ease: 'back.out(1.6)' }, 0.14);
    const hop = s.seat > 0.5 ? 0 : -16;                                            // y âm là lên
    for (let i = 0; i < 2; i++) {
      t.to(s, { y: hop, duiL: 0, duiR: 0, duration: 0.17, ease: 'power2.out' }, 0.42 + i * 0.42)
       .to(s, { y: 0, duration: 0.2, ease: 'power2.in' }, 0.59 + i * 0.42);
      for (const key of Object.keys(up).filter((name) => name.startsWith('cang'))) t.to(s, { [key]: 26, duration: 0.17, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.42 + i * 0.42);
    }
    this.#chop(t, 0.9);
    this.#khep(t, 0.5, 1.4, { y: 0 });
    return t;
  }
  shrug() {
    const t = this.tl(), s = this.s;
    this.#openUp(t);
    t.set(s, { tayL: 'mo', tayR: 'mo' }, 0);
    t.to(s, { vai: 2, batL: 4, batR: 4, duration: 0.15, ease: 'power1.in' }, 0);    // hạ vai lấy đà
    t.to(s, { vai: -9, batL: 38, batR: 38, cangL: 112, cangR: 112, dau: 7, dauX: 2,
              mayL: 1, mayR: 1, cuoi: -0.4, mieng: 0.06, nhinX: 1, nhinY: -1,
              duration: 0.4, ease: 'back.out(1.5)' }, 0.15);
    t.to(s, { vai: -7, dau: 5, duration: 0.55, ease: 'sine.inOut' }, 0.6);           // giữ, buông nhẹ
    this.#chop(t, 0.9);
    this.#khep(t, 0.5, 1.2);
    return t;
  }
  #dam(t, at, h, ben, tay = 1, goiCao = 1, arms = null) {
    const s = this.s, L = ben === 'L';
    const goi = L ? 'nhacL' : 'nhacR';
    t.to(s, { [goi]: goiCao, y: -5 * goiCao, than: (L ? 2 : -2) * goiCao, dauY: -1, duration: h * 0.5, ease: 'power2.out' }, at);
    t.to(s, { [goi]: 0, y: 0, dauY: 1.5, duration: h * 0.5, ease: 'power2.in' }, at + h * 0.5);
    t.to(s, { vungL: (L ? -1 : 1) * tay, vungR: (L ? 1 : -1) * tay, vai: -tay,
              duration: h * 0.9, ease: 'sine.inOut' }, at + h * 0.1);
    if (arms) for (const side of ['L', 'R']) {
      if (this.holds[side] && s['item' + side] > 0.5) continue;                // tay cầm đồ đứng yên
      const [upper, fore] = side === ben ? arms.back : arms.front;
      t.to(s, { ['bat' + side]: upper, ['cang' + side]: fore, duration: h * 0.9, ease: 'sine.inOut' }, at + h * 0.1);
    }
    return at + h;
  }
  march(buoc = 6) {
    const t = this.tl(), h = 0.38;
    let at = 0;
    t.set(this.s, { tayL: 'nam', tayR: 'nam' }, 0);
    t.to(this.s, { cuoi: 0.6, mayL: 0.3, mayR: 0.3, duration: 0.2 }, 0);
    for (let i = 0; i < buoc; i++) at = this.#dam(t, at, h, i % 2 ? 'R' : 'L', 1, 1, { front: [22, -78], back: [5, -10] });
    this.#khep(t, 0.4, at);
    return t;
  }
  stroll(buoc = 6) {
    const t = this.tl(), h = 0.54;
    let at = 0;
    t.to(this.s, { cuoi: 0.45, duration: 0.25 }, 0);
    for (let i = 0; i < buoc; i++) at = this.#dam(t, at, h, i % 2 ? 'R' : 'L', 0.3, 0.5, { front: [15, -20], back: [7, -4] });      // tay buông, đung đưa nhẹ; gối nhấc thấp, nhịp chậm
    this.#khep(t, 0.4, at);
    return t;
  }
  stepInPlace(buoc = 6) {
    const t = this.tl(), h = 0.42;
    let at = 0;
    for (let i = 0; i < buoc; i++) at = this.#dam(t, at, h, i % 2 ? 'R' : 'L', 0, 0.85);
    this.#khep(t, 0.35, at);
    return t;
  }
  walkForward(buoc = 8) {
    const t = this.tl(), s = this.s, h = 0.38, T = buoc * h;
    t.set(s, { co: 0.42, y: -150, mo: 0, tayL: 'nam', tayR: 'nam' }, 0);
    t.to(s, { mo: 1, duration: 0.3 }, 0);
    t.to(s, { co: 1, y: 0, duration: T, ease: 'power1.in' }, 0);     // càng gần càng lớn nhanh (phối cảnh)
    t.to(s, { cuoi: 0.7, duration: 0.3 }, 0);
    let at = 0;
    for (let i = 0; i < buoc; i++) at = this.#dam(t, at, h, i % 2 ? 'R' : 'L');
    this.#khep(t, 0.45, at);
    return t;
  }
  walkAway(buoc = 8) {
    const t = this.tl(), s = this.s, h = 0.38, T = buoc * h;
    t.set(s, { tayL: 'nam', tayR: 'nam' }, 0);
    t.to(s, { co: 0.4, y: -150, duration: T, ease: 'power1.out' }, 0);
    t.to(s, { mo: 0, duration: 0.35 }, T - 0.35);
    let at = 0;
    for (let i = 0; i < buoc; i++) at = this.#dam(t, at, h, i % 2 ? 'R' : 'L');
    this.#khep(t, 0.3, at, { co: 0.4, y: -150, mo: 0 });        // khép tư thế nhưng vẫn ở xa và ẩn
    return t;
  }
  static EXPRESSIONS = {
    happy:     { cuoi: 1, mieng: 0.5, mayL: 0.55, mayR: 0.55, matY: 0.18, dau: -3, dauY: -1 },
    sad:       { cuoi: -0.85, mieng: 0, mayL: 0.75, mayR: 0.75, matY: 0.3, dau: 5, dauY: 5, nhinY: 1.6, vai: 3 },
    surprised: { cuoi: 0, mieng: 0.72, chum: 0.6, mayL: 1, mayR: 1, matY: -0.16, dauY: -3, vai: -3 },
    angry:     { cuoi: -0.6, mieng: 0.12, mayL: -0.9, mayR: -0.9, matY: 0.22, dau: 0, dauY: 2, than: 1.5 },
    thinking:  { cuoi: 0.1, mieng: 0, chum: 0.25, mayL: 0.7, mayR: -0.2, nhinX: 2.2, nhinY: -1.8, dau: 6, dauX: 2 },
    laughing:  { cuoi: 1, mieng: 0.85, mayL: 0.75, mayR: 0.75, matY: 0.6, dau: -4, dauY: -2, vai: -2 },        // mắt híp, miệng há
    worried:   { cuoi: -0.5, mieng: 0.14, mayL: 0.95, mayR: 0.95, matY: 0.06, dau: 3, dauY: 2, nhinY: 0.6, vai: 2 },
    confused:  { cuoi: -0.15, mieng: 0.08, mayL: 0.9, mayR: -0.45, dau: -8, dauX: -2, nhinX: -1.6, nhinY: -0.8 },  // một mày nhướn, đầu nghiêng
    tired:     { cuoi: -0.3, mieng: 0, mayL: 0.15, mayR: 0.15, matY: 0.5, dau: 4, dauY: 6, nhinY: 1.2, vai: 4 },   // mắt sụp, vai xệ
  };
  express(name = 'happy', hold = 1.2) {
    const face = RigSVG.EXPRESSIONS[name];
    if (!face) throw new Error(`[character] no expression "${name}" (available: ${Object.keys(RigSVG.EXPRESSIONS).join(', ')})`);
    const t = this.tl(), s = this.s, into = name === 'surprised' ? 0.16 : 0.32, N = this.NGHI;
    t.to(s, { ...face, duration: into, ease: name === 'surprised' ? 'back.out(2.2)' : 'power2.out' }, 0);
    const standing = s.seat < 0.5, free = ['L', 'R'].filter((side) => !(this.holds[side] && s['item' + side] > 0.5));
    const arm = (side, upper, fore, at, d, ease = 'power2.out') => t.to(s, { ['bat' + side]: upper, ['cang' + side]: fore, duration: d, ease }, at);
    if (name === 'happy') {                                   // nhún người một cái, vai nhấc
      if (standing) t.to(s, { y: -15, duration: 0.18, ease: 'power2.out' }, 0.05).to(s, { y: 0, duration: 0.2, ease: 'power2.in' }, 0.23);
      if (standing && into + hold >= 0.7) t.to(s, { y: -6, duration: 0.12, ease: 'power2.out' }, 0.43).to(s, { y: 0, duration: 0.14, ease: 'power2.in' }, 0.55);      // nhịp nảy thứ hai, chỉ khi còn kịp trước lúc khép
      t.to(s, { vai: -5, duration: 0.2, ease: 'power2.out' }, 0.05).to(s, { vai: -1, duration: 0.4, ease: 'sine.inOut' }, 0.3);
      if (into + hold >= 1.06) t.to(s, { dau: face.dau + 7, duration: 0.3, ease: 'sine.inOut' }, 0.45).to(s, { dau: face.dau, duration: 0.3, ease: 'sine.inOut' }, 0.75);
    } else if (name === 'surprised') {                        // giật mình: người bật lên, hai tay bung ra
      if (standing) t.to(s, { y: -5, duration: 0.12, ease: 'power2.out' }, 0).to(s, { y: 0, duration: 0.25, ease: 'power2.inOut' }, 0.12);
      for (const side of free) { t.set(s, { ['tay' + side]: 'mo' }, 0); arm(side, 26, 30, 0, into + 0.06, 'back.out(1.8)'); }
    } else if (name === 'thinking' && free.length) {          // đưa tay lên cằm
      const side = this.#freeHand();
      if (free.includes(side)) { t.set(s, { ['tay' + side]: 'mo' }, 0.05); arm(side, 34, -146, 0.05, 0.45, 'power2.inOut'); }
    } else if (name === 'angry') {                            // nắm tay, tay gồng xuống
      for (const side of free) { t.set(s, { ['tay' + side]: 'nam' }, 0.1); arm(side, 16, -8, 0, 0.3); }
      t.to(s, { vai: -3, duration: 0.3, ease: 'power2.out' }, 0);
    } else if (name === 'tired') {                            // thở dài: phồng ngực rồi xệ vai
      t.to(s, { tho: 1, duration: 0.45, ease: 'sine.inOut' }, 0).to(s, { tho: 0, vai: face.vai + 2, dauY: face.dauY + 2, duration: 0.6, ease: 'sine.inOut' }, 0.45);
      for (const side of free) arm(side, N['bat' + side] - 3, Math.abs(N['cang' + side]) > 40 ? N['cang' + side] : -6, 0.4, 0.6, 'sine.inOut');
    } else if (name === 'sad') {
      t.to(s, { than: N.than + 1.5, duration: 0.5, ease: 'sine.inOut' }, 0);
    }
    if (name === 'laughing') {
      const beats = Math.max(1, 2 * Math.round(hold / 0.3) - 1);
      t.to(s, { dauY: face.dauY + 9, vai: face.vai + 7, tho: 1, duration: 0.13, ease: 'sine.inOut', yoyo: true, repeat: beats }, into);
      if (standing) t.to(s, { y: -4, duration: 0.13, ease: 'sine.inOut', yoyo: true, repeat: beats }, into);
    }
    else if (name !== 'surprised' && hold > 0.8) { this.blinkTo = face.matY || 0; this.#chop(t, into + hold * 0.5); this.blinkTo = 0; }      // ngạc nhiên thì không chớp mắt
    this.#khep(t, 0.4, into + hold);
    return t;
  }
  turn(direction = 'right', hold = 1.5, amount = 0.55) {
    const t = this.tl(), s = this.s, side = direction === 'left' ? -1 : 1;
    t.to(s, { huong: side * clamp(amount, 0, 1), nhinX: side * 1.2, duration: 0.4, ease: 'power2.inOut' }, 0);
    if (hold > 1) this.#chop(t, 0.4 + hold * 0.5);
    this.#khep(t, 0.4, 0.4 + hold);
    return t;
  }
  centerX() {
    const frame = this.svg.getBoundingClientRect();
    const scale = Math.min(frame.width / KHUNG.w, frame.height / KHUNG.h) || 1;
    return frame.left + frame.width / 2 + this.s.x * scale;
  }
  face(target = 'right', amount = 0.55) {
    let side = target === 'left' ? -1 : target === 'front' ? 0 : 1;
    if (target && typeof target === 'object') {
      const box = target.getBoundingClientRect ? target.getBoundingClientRect() : null;
      const dx = (typeof target.centerX === 'function' ? target.centerX() : box.left + box.width / 2) - this.centerX();
      side = Math.abs(dx) < 1 ? 0 : dx < 0 ? -1 : 1;
    }
    const t = this.tl(), s = this.s, to = side * clamp(amount, 0, 1);
    t.to(s, { nhinX: side * 1.6, duration: 0.2, ease: 'power2.out' }, 0);          // mắt đi trước
    this.#khep(t, 0.4, 0.05, { huong: to });
    return t;
  }
  hideItem(side = 'R') { return this.#toggleItem(side, 0); }
  showItem(side = 'R') { return this.#toggleItem(side, 1); }
  #toggleItem(side, value) {
    const t = this.tl(), s = this.s, keep = {};
    if (side !== 'R') keep.itemL = value;
    if (side !== 'L') keep.itemR = value;
    const acting = (side === 'both' ? ['L', 'R'] : [side]).filter((k) => this.holds[k] && (s['item' + k] > 0.5) !== (value > 0.5));
    if (!acting.length) return this.#khep(t, 0.25, 0, keep);
    for (const k of acting) {
      if (value > 0.5) t.set(s, { ['tay' + k]: 'nam' }, 0);
      t.to(s, { ['bat' + k]: -12, ['cang' + k]: -4, ['carry' + k]: 0, duration: 0.3, ease: 'power2.inOut' }, 0);
      t.to(s, { ['item' + k]: value, duration: 0.13 }, 0.22);
    }
    t.to(s, { dauY: 2.5, nhinY: 1.2, duration: 0.3, ease: 'sine.inOut' }, 0);            // liếc xuống theo tay
    this.#khep(t, 0.38, 0.36, keep);
    return t;
  }
  setItem(side, draw, { shown = true } = {}) {
    if (side !== 'L' && side !== 'R') throw new Error(`[character] setItem(side, …): side must be 'L' or 'R', got ${JSON.stringify(side)}`);
    if (typeof draw !== 'function') throw new Error('[character] setItem(side, draw): draw must be a function returning SVG');
    this.nv = { ...this.nv, ['heldItem' + side]: draw };
    const carry = { ['bat' + side]: 14, ['cang' + side]: -85, ['tay' + side]: 'nam' };
    this.NGHI = Object.freeze({ ...this.NGHI, ...carry, ['item' + side]: shown ? 1 : 0 });
    this.#dungLai();
    Object.assign(this.s, shown ? carry : { ['bat' + side]: NGHI['bat' + side], ['cang' + side]: NGHI['cang' + side], ['tay' + side]: 'mo' }, { ['item' + side]: shown ? 1 : 0 });
    this.apDung();
    return this;
  }
  #towards(target, side) {
    if (target === 'left') return -1;
    if (target === 'right') return 1;
    if (target && typeof target.centerX === 'function') { const dx = target.centerX() - this.centerX(); if (Math.abs(dx) > 1) return dx < 0 ? -1 : 1; }
    else if (target && target.getBoundingClientRect) { const box = target.getBoundingClientRect(), dx = box.left + box.width / 2 - this.centerX(); if (Math.abs(dx) > 1) return dx < 0 ? -1 : 1; }
    return side === 'L' ? -1 : 1;
  }
  #reach(t, side, dir, at) {
    const s = this.s, N = this.NGHI, own = (side === 'R') === (dir > 0), [upper, fore] = own ? [44, 56] : [28, -124];
    t.to(s, { ['bat' + side]: upper, ['cang' + side]: fore, than: N.than - dir * 4, dau: N.dau + dir * 3, nhinX: dir * 1.6, cuoi: 0.8, mayL: 0.4, mayR: 0.4,
              duration: 0.42, ease: 'power2.out' }, at);
  }
  handOver(target = null, side = 'auto') {
    const s = this.s, held = ['R', 'L'].filter((k) => this.holds[k] && s['item' + k] > 0.5), k = side === 'auto' ? held[0] : side;
    if (!k || !held.includes(k)) throw new Error('[character] handOver: this character is not holding an item' + (side === 'auto' ? '' : ` in hand ${side}`) + ' — give it one with heldItemL / heldItemR, or createCharacter(host, { id, items: { R: "cup" } })');
    const t = this.tl(), dir = this.#towards(target, k);
    this.#stage(t, [k]);
    t.to(s, { ['bat' + k]: this.NGHI['bat' + k] - 3, ['carry' + k]: 0, duration: 0.12, ease: 'sine.in' }, 0);            // lấy đà
    this.#reach(t, k, dir, 0.12);
    t.to(s, { ['item' + k]: 0, duration: 0.15 }, 0.62);                                                // món đồ rời tay
    t.set(s, { ['tay' + k]: 'mo' }, 0.7);
    this.#khep(t, 0.45, 0.88, { ['item' + k]: 0 });
    return t;
  }
  take(source = null, side = 'auto') {
    const s = this.s, stored = ['R', 'L'].filter((k) => this.holds[k] && s['item' + k] <= 0.5), k = side === 'auto' ? stored[0] : side;
    if (!k || !stored.includes(k)) throw new Error('[character] take: this character has no put-away item to receive' + (side === 'auto' ? '' : ` in hand ${side}`) + ' — create it with createCharacter(host, { id, items: { R: "cup" }, itemsHidden: true })');
    const t = this.tl(), dir = this.#towards(source, k);
    this.#stage(t, [k]);
    t.set(s, { ['tay' + k]: 'mo', ['carry' + k]: 0 }, 0);
    this.#reach(t, k, dir, 0.12);
    t.set(s, { ['tay' + k]: 'nam' }, 0.62);
    t.to(s, { ['item' + k]: 1, duration: 0.15 }, 0.62);                                                // món đồ vào tay
    this.#khep(t, 0.45, 0.88, { ['item' + k]: 1 });
    return t;
  }
  drink(side = 'auto') {
    const t = this.tl(), s = this.s, N = this.NGHI;
    const held = ['R', 'L'].filter((k) => this.holds[k] && s['item' + k] > 0.5), k = side === 'auto' ? held[0] || this.#freeHand() : side, m = k === 'L' ? -1 : 1;
    if (Math.abs(s.huong) > 0.02) t.to(s, { huong: 0, duration: 0.3, ease: 'sine.inOut' }, 0);
    t.set(s, { ['tay' + k]: 'nam' }, 0);
    t.to(s, { ['carry' + k]: 0, duration: 0.15 }, 0);
    t.to(s, { ['bat' + k]: 10, ['cang' + k]: -155, vai: N.vai - 5, dau: N.dau + m * 4, dauX: m * 3, dauY: 5, mieng: 0.3, chum: 0.6, nhinY: 1.5, duration: 0.42, ease: 'power2.out' }, 0);
    t.to(s, { ['itemTilt' + k]: 30, dauY: 9, matY: 0.7, duration: 0.3, ease: 'sine.inOut' }, 0.42);                                   // nghiêng cốc, nhắm mắt uống
    t.to(s, { ['itemTilt' + k]: 0, dauY: 3, matY: 0, duration: 0.28, ease: 'sine.inOut' }, 1.0);
    t.to(s, { cuoi: 1, mieng: 0.2, chum: 0, mayL: 0.5, mayR: 0.5, duration: 0.2 }, 1.2);                                              // "à…"
    this.#khep(t, 0.5, 1.35);
    return t;
  }
  write(dur = 1.2) {
    const t = this.tl(), s = this.s, N = this.NGHI;
    const held = ['L', 'R'].filter((k) => this.holds[k] && s['item' + k] > 0.5), pad = held[0] || 'L', pen = pad === 'L' ? 'R' : 'L', m = pen === 'L' ? -1 : 1;
    this.#openUp(t);
    if (!held.length) { t.set(s, { ['tay' + pad]: 'mo' }, 0); t.to(s, { ['bat' + pad]: 14, ['cang' + pad]: -85, duration: 0.3, ease: 'power2.out' }, 0); }
    t.set(s, { ['tay' + pen]: 'chi' }, 0.1);
    t.to(s, { ['bat' + pen]: 20, ['cang' + pen]: -104, dauY: 7, dau: N.dau - m * 4, nhinY: 2.4, nhinX: -m * 1.2, mayL: 0.2, mayR: 0.2, cuoi: 0.3, duration: 0.35, ease: 'power2.out' }, 0);
    const strokes = Math.max(2, Math.round(dur / 0.15));
    for (let n = 0; n < strokes; n++) {
      t.to(s, { ['cang' + pen]: -104 + (n % 2 ? 4 : -5) - (n % 8 < 4 ? 0 : 6), ['bat' + pen]: 20 + (n % 2 ? 1.5 : -1.5), duration: dur / strokes, ease: 'sine.inOut' }, 0.38 + n * dur / strokes);
    }
    if (dur > 0.8) this.#chop(t, 0.38 + dur * 0.6);
    this.#khep(t, 0.45, 0.42 + dur);
    return t;
  }
  stroke(target = null) {
    const t = this.tl(), s = this.s, N = this.NGHI;
    let tx = 300, ty = 400;
    const live = target && target.live ? target.live : target;
    if (live && typeof live.x === 'number' && typeof live.y === 'number' && !live.el) { tx = live.x - s.x; ty = live.y - s.y - DOI_Y; }
    else if (live) {
      const node = live.el && live.el.dau ? live.el.dau : live.getBoundingClientRect ? live : null;
      if (node) {
        const r = node.getBoundingClientRect(), sv = this.svg.getBoundingClientRect();
        const unit = Math.min(sv.width / KHUNG.w, sv.height / KHUNG.h) || 1, ox = sv.left + (sv.width - KHUNG.w * unit) / 2, oy = sv.top + (sv.height - KHUNG.h * unit) / 2;
        tx = (r.left + r.width / 2 - ox) / unit - s.x; ty = (r.top + r.height * 0.2 - oy) / unit - s.y - DOI_Y;
      }
    }
    let k = tx < HONG.x ? 'L' : 'R';
    if (this.holds[k] && s['item' + k] > 0.5) k = k === 'L' ? 'R' : 'L';
    const crouch = s.seat > 0.5 ? 0 : clamp((ty - HONG.y) / 140, 0, 0.5), drop = DAI.dui * this.nv.daiDui * this.nv.coChan * 0.72 * crouch;
    const shoulder = VAI[k], angle = Math.atan2(ty - (shoulder.y + drop), tx - shoulder.x) * 180 / Math.PI;
    const lean = clamp((tx - HONG.x) * 0.06, -9, 9);
    const across = (k === 'L') !== (tx < HONG.x);
    const upper = across ? 8 : clamp(chuanHoaGoc(k === 'L' ? angle - 90 : 90 - angle) - Math.abs(lean), -10, 95), fore = across ? -58 : 0;
    this.#openUp(t);
    t.set(s, { ['tay' + k]: 'mo' }, 0);
    if (crouch) t.to(s, { seat: crouch, duration: 0.45, ease: 'power2.inOut' }, 0);
    t.to(s, { ['bat' + k]: upper, ['cang' + k]: fore, than: N.than - lean, dau: N.dau + lean * 0.8, dauY: 7, nhinX: clamp((tx - HONG.x) * 0.02, -3, 3), nhinY: 2.4, vai: N.vai + 3,
              cuoi: 0.9, mayL: 0.5, mayR: 0.5, duration: 0.45, ease: 'power2.out' }, 0);
    for (let n = 0; n < 3; n++) {
      t.to(s, { ['cang' + k]: fore - 9, ['bat' + k]: upper - 4, duration: 0.2, ease: 'sine.inOut' }, 0.48 + n * 0.4)
       .to(s, { ['cang' + k]: fore + 5, ['bat' + k]: upper + 3, duration: 0.2, ease: 'sine.inOut' }, 0.68 + n * 0.4);
    }
    this.#chop(t, 1.0);
    this.#khep(t, 0.5, 1.7);
    return t;
  }
  sitDown() {
    const t = this.tl(), s = this.s;
    t.to(s, { dauY: 2.5, than: 0, duration: 0.25, ease: 'power2.in' }, 0);
    this.#khep(t, 0.5, 0.05, { seat: 1 });
    return t;
  }
  standUp() {
    const t = this.tl(), s = this.s;
    t.to(s, { dauY: 2.5, duration: 0.2, ease: 'power2.in' }, 0);
    this.#khep(t, 0.5, 0.05, { seat: 0 });
    return t;
  }
  sit(hold = 2) {
    const t = this.tl(), s = this.s;
    t.to(s, { seat: 1, than: 0, dauY: 1.5, duration: 0.45, ease: 'power2.inOut' }, 0);
    t.to(s, { batL: 14, batR: 14, cangL: -38, cangR: -38, cuoi: 0.6, duration: 0.4, ease: 'power2.out' }, 0.15);   // hai tay đặt lên đùi
    for (let a = 0.6; a < 0.45 + hold - 0.3; a += 2.4) this.#chop(t, a + 0.5);
    this.#khep(t, 0.5, 0.45 + hold);
    return t;
  }
  walk(buoc = 4, quang = 0) {
    const t = this.tl(), s = this.s, chieu = quang < 0 ? -1 : 1;
    t.to(s, { huong: chieu, cuoi: 0.5, duration: 0.4, ease: 'power2.inOut' }, 0);   // xoay người rồi mới bước
    if (quang) {
      const x0 = s.x, d = this.#doBuoc(Math.abs(quang), true, true);
      const at = this.#di(t, 0.14, d.buoc, 0.46, { kA: d.kA, chieu, x: (b) => x0 + chieu * d.x(b) });
      this.#khep(t, 0.45, at, { x: x0 + quang });
    } else {
      const at = this.#di(t, 0.14, buoc, 0.46);
      this.#khep(t, 0.45, at);
    }
    return t;
  }
  #offstage(dir) {
    const frame = this.svg.getBoundingClientRect();
    const scale = Math.min(frame.width / KHUNG.w, frame.height / KHUNG.h);
    if (!(scale > 0)) return 300;                                   // chưa có kích thước (chưa gắn vào trang)
    const stage = (this.svg.closest('[data-composition-id]') || this.svg.ownerDocument.documentElement).getBoundingClientRect();
    const centre = frame.left + frame.width / 2;
    return clamp((dir > 0 ? stage.right - centre : centre - stage.left) / scale + 80, 270, 700);
  }
  enter(from = 'left', distance = null) {
    const t = this.tl(), s = this.s, chieu = from === 'right' ? -1 : 1;
    const far = distance > 0 ? distance : this.#offstage(-chieu), x0 = -far * chieu;
    const d = this.#doBuoc(far, false, true);              // vào khung khi đang đi, dừng lại ở giữa
    t.set(s, { x: x0, mo: 1, cuoi: 0.5, huong: chieu }, 0);
    const at = this.#di(t, 0, d.buoc, 0.42, { vao: false, kA: d.kA, chieu, x: (b) => x0 + chieu * d.x(b) });
    const shown = { get v() { return 0; }, set v(v) { s.mo = Math.min(1, v * at / 0.2); s.huong = chieu; s.seat = 0; } };    // hiện dần trong 0,2 s đầu
    t.to(shown, { v: 1, duration: at, ease: 'none' }, 0);
    this.#khep(t, 0.45, at, { x: 0, huong: 0, seat: 0, itemL: this.NGHI.itemL, itemR: this.NGHI.itemR });
    return t;
  }
  exit(to = 'right', distance = null) {
    const t = this.tl(), s = this.s, chieu = to === 'left' ? -1 : 1, x0 = s.x;
    const end = chieu * (distance > 0 ? distance : this.#offstage(chieu)), far = Math.max(60, (end - x0) * chieu);
    const d = this.#doBuoc(far, true, false);              // nhấc chân bước đi, ra khỏi khung khi vẫn đang đi
    t.to(s, { huong: chieu, cuoi: 0.6, duration: 0.35, ease: 'power2.inOut' }, 0);
    const at = this.#di(t, 0.1, d.buoc, 0.42, { ra: false, kA: d.kA, chieu, x: (b) => x0 + chieu * d.x(b) });
    t.to(s, { mo: 0, duration: 0.25 }, at - 0.25);
    this.#khep(t, 0.25, at, { x: x0 + chieu * far, mo: 0, huong: chieu });   // khép tư thế nhưng vẫn ở ngoài khung và ẩn
    return t;
  }
  #soAm(text, dur) {
    if (!text) return Math.max(4, Math.round(dur / 0.14));
    let n = 0;
    for (const tieng of text.trim().split(/\s+/)) {
      const tron = tieng.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
      if (/[a-z0-9]/.test(tron)) n += Math.max(1, (tron.match(/[aeiouy]+/g) || []).length);
    }
    return Math.max(4, n);
  }
  #tone(mood, brows = 0.5, smile = 0.5) {
    if (!mood) return { start: { mayL: brows, mayR: brows, cuoi: smile }, corner: (value) => value, eyes: 0 };
    const face = RigSVG.EXPRESSIONS[mood];
    if (!face) throw new Error(`[character] no mood "${mood}" (available: ${Object.keys(RigSVG.EXPRESSIONS).join(', ')})`);
    const corner = (value) => face.cuoi * 0.9 + (value - 0.45) * 0.22;
    const eyes = (face.matY || 0) * 0.35;
    return { start: { mayL: face.mayL ?? 0, mayR: face.mayR ?? 0, cuoi: corner(smile), matY: eyes }, corner, eyes };
  }
  #khauHinh(t, soAm, nhip, corner = (value) => value) {
    const s = this.s;
    let truoc = -1;
    for (let i = 0; i < soAm; i++) {
      let k;
      do { k = Math.floor(ngau() * KHAU.length); } while (k === truoc && KHAU.length > 1);
      truoc = k;
      const h = KHAU[k], a = i * nhip, giam = i % 5 === 4 ? 0.35 : 1;   // cuối nhịp thì hụt hơi
      t.to(s, { mieng: h.mieng * giam * nhieu(0.82, 1.08), chum: h.chum, cuoi: corner(h.cuoi),
                duration: nhip * 0.45, ease: 'power1.out' }, a)
       .to(s, { mieng: h.mieng * giam * 0.16, chum: h.chum * 0.5,
                duration: nhip * 0.55, ease: 'power1.in' }, a + nhip * 0.45);
    }
    return t;
  }
  speak(text = null, dur = 2, { mood = null } = {}) {
    const t = this.tl(), s = this.s, tone = this.#tone(mood);
    this.#openUp(t);
    const soAm = this.#soAm(text, dur), nhip = dur / soAm;
    t.set(s, { tayR: 'mo' }, 0);
    t.to(s, { ...tone.start, nhinX: 0.8, duration: 0.2 }, 0);
    this.blinkTo = tone.eyes;
    this.#khauHinh(t, soAm, nhip, tone.corner);
    t.to(s, { dau: -3, dauY: 2, duration: dur * 0.35, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.1);
    t.to(s, { batR: 34, cangR: -70, than: -1.5, duration: 0.35, ease: 'power2.out' }, 0.2)
     .to(s, { batR: 40, cangR: -60, duration: 0.35, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.55);
    if (dur > 1.2) this.#chop(t, dur * 0.55);
    this.blinkTo = 0;
    t.to(s, { mieng: 0, duration: 0.15 }, dur);
    this.#khep(t, 0.5, dur + 0.05);
    return t;
  }
  #troi(t, khoa, min, max, D, nganNhat = 0.7, daiNhat = 2.0) {
    let at = 0;
    while (at < D) {
      const d = Math.min(nhieu(nganNhat, daiNhat), D - at);
      if (d < 0.05) break;
      t.to(this.s, { [khoa]: nhieu(min, max), duration: d, ease: 'sine.inOut' }, at);
      at += d;
    }
    return t;
  }
  #cuChi(t, moc, D, beats = [], hand = null) {
    const s = this.s, N = this.NGHI;
    if (!moc.length && !beats.length) return t;
    const busy = (side) => this.holds[side] && s['item' + side] > 0.5;
    const order = hand === 'L' || (hand !== 'R' && s.huong < -0.1) ? ['L', 'R'] : ['R', 'L'];
    const free = order.filter((side) => !busy(side));
    if (!free.length) return t;
    const lead = free[0], other = free[1] || null;                    // tay chủ đạo (phải, nếu rảnh) và tay phụ
    const key = (side, joint) => (joint ? 'cang' : 'bat') + side;
    const base = (side) => this.#restArm(side);
    const ALL_POSES = [
      { lead: [14, 58], other: null },             // mở một tay ngang hông
      { lead: [12, 74], other: null },             // đưa tay sang bên
      { lead: [30, 62], other: null },             // đưa bàn tay ra phía trước-bên (cẳng tay quá ~75° thì bàn tay lật nghiêng, trông như cái que)
      { lead: [22, -112], other: null },           // đặt tay lên ngực
      { lead: [16, 50], other: [16, 50] },         // mở cả hai tay
      { lead: [18, 66], other: [12, 40] },         // hai tay, tay chủ đạo cao hơn
    ];
    const POSES = ALL_POSES.filter((pose) => Math.abs(pose.lead[1] - base(lead)[1]) >= 45);
    const anchors = [];
    for (const a of moc) if (!anchors.length || a - anchors[anchors.length - 1] >= 2.1) anchors.push(a);
    const pulse = (arm, around, at, size) => {
      const dip = (Math.abs(around) < 12 ? 1 : -Math.sign(around)) * size;
      t.to(s, { [key(arm, 1)]: around + dip, duration: 0.12, ease: 'power2.out' }, at)
       .to(s, { [key(arm, 1)]: around, duration: 0.22, ease: 'sine.inOut' }, at + 0.12);
    };
    const spaced = [];
    for (const b of beats) if (!spaced.length || b - spaced[spaced.length - 1] >= 0.45) spaced.push(b);
    const occupied = [];                                              // các quãng một cử chỉ lớn đang chiếm tay
    let last = -1;
    anchors.forEach((a, i) => {
      if (!POSES.length) return;
      let pick = last; while (pick === last && POSES.length > 1) pick = Math.floor(ngau() * POSES.length);
      last = pick;
      const pose = POSES[pick];
      const next = i + 1 < anchors.length ? anchors[i + 1] : D;
      const travel = Math.max(Math.abs(pose.lead[1] - base(lead)[1]), other && pose.other ? Math.abs(pose.other[1] - base(other)[1]) : 0);
      const longest = clamp(travel / 300, 0.36, 0.62) + 0.17;                 // + nhịp trễ của tay phụ và của cẳng tay
      const hold = clamp((next - a) - 0.16 - longest - 0.85, 0.25, 1.5);
      const stroke = a + 0.16;
      let release = stroke + longest + hold, handOver = false;
      if (release + 0.8 > next) {
        if (i + 1 < anchors.length || stroke + longest + 0.25 > D) return;
        release = D; handOver = true;
      }
      occupied.push([a - 0.06, release + 0.9]);
      const inHold = spaced.filter((b) => b >= stroke + longest + 0.12 && b + 0.36 <= release - 0.05);
      const arms = [[lead, pose.lead]];
      if (other && pose.other) arms.push([other, pose.other]);
      const side = lead === 'R' ? -1 : 1;                 // thân và đầu ngả nhẹ VỀ PHÍA tay đang diễn
      t.to(s, { than: N.than + side * nhieu(1.2, 2.4), vai: N.vai - nhieu(1.5, 3), dauY: nhieu(1.2, 2.6), duration: 0.4, ease: 'sine.out' }, stroke - 0.04);
      if (!handOver) t.to(s, { than: N.than, vai: N.vai, dauY: N.dauY, duration: 0.7, ease: 'sine.inOut' }, release);
      arms.forEach(([arm, [upper, fore]], n) => {
        const [upper0, fore0] = base(arm), lag = n * 0.08;         // tay phụ đi sau tay chủ đạo một nhịp
        const jitterU = nhieu(-3, 3), jitterF = nhieu(-6, 6);      // mỗi lần diễn một dáng hơi khác đi
        const reach = clamp(Math.abs(fore - fore0) / 300, 0.36, 0.62);
        t.set(s, { ['tay' + arm]: 'mo' }, a + lag);
        if (RigSVG.SCREEN_AIM) t.to(s, { ['aim' + arm]: 1, duration: 0.16 + reach * 0.6, ease: 'sine.inOut' }, a + lag);
        t.to(s, { [key(arm, 0)]: upper0 - 2, [key(arm, 1)]: fore0 - Math.sign(fore - fore0) * 5, duration: 0.16, ease: 'sine.in' }, a + lag)
         .to(s, { [key(arm, 0)]: upper + jitterU, duration: reach, ease: 'power2.out' }, stroke + lag)
         .to(s, { [key(arm, 1)]: fore + jitterF, duration: reach + 0.06, ease: 'power2.out' }, stroke + lag + 0.03);       // cẳng tay tới sau bắp tay
        const drift = release - (stroke + lag + reach + 0.1) - 0.05;
        if (inHold.length) {
          for (const b of inHold) pulse(arm, fore + jitterF, b + lag * 0.5, nhieu(6, 9) * (n ? 0.6 : 1));
        } else if (drift > 0.3) {
          t.to(s, { [key(arm, 1)]: fore + jitterF + nhieu(4, 8) * (ngau() < 0.5 ? -1 : 1), duration: drift / 2, ease: 'sine.inOut', yoyo: true, repeat: 1 }, stroke + lag + reach + 0.1);
          t.to(s, { [key(arm, 0)]: upper + jitterU + nhieu(1.5, 3), duration: drift / 2, ease: 'sine.inOut', yoyo: true, repeat: 1 }, stroke + lag + reach + 0.04);
        }
        if (handOver) return;
        if (RigSVG.SCREEN_AIM) t.to(s, { ['aim' + arm]: 0, duration: 0.6, ease: 'sine.inOut' }, release + lag);
        t.to(s, { [key(arm, 0)]: upper0, duration: 0.6, ease: 'sine.inOut' }, release + lag)
         .to(s, { [key(arm, 1)]: fore0, duration: 0.66, ease: 'sine.inOut' }, release + lag + 0.05);
        t.set(s, { ['tay' + arm]: this.holds[arm] ? 'mo' : N['tay' + arm] }, release + lag + 0.5);
      });
      if (other && !pose.other) {
        const [upper0, fore0] = base(other);
        t.to(s, { [key(other, 1)]: fore0 + nhieu(3, 7), [key(other, 0)]: upper0 + nhieu(1, 3), duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1 }, stroke + 0.1);
      }
    });
    for (const b of spaced) {
      if (b < 0.25 || b + 0.36 > D - 0.1 || occupied.some(([from, to]) => b + 0.36 > from && b < to)) continue;
      pulse(lead, base(lead)[1], b, nhieu(4, 7));
      if (other) pulse(other, base(other)[1], b + 0.03, nhieu(2, 4));
      t.to(s, { dauY: N.dauY + nhieu(1, 1.8), duration: 0.12, ease: 'power2.out' }, b).to(s, { dauY: N.dauY, duration: 0.24, ease: 'sine.inOut' }, b + 0.12);
    }
    return t;
  }
  explain(text = null, dur = 2.4, { mood = null, hand = null } = {}) {
    const t = this.tl(), s = this.s, tone = this.#tone(mood, 0.45, 0.5);
    this.#stageSpeech(t, hand);
    const soAm = this.#soAm(text, dur), nhip = dur / soAm;
    t.to(s, { ...tone.start, nhinX: 0.8, duration: 0.35, ease: 'power2.out' }, 0);
    this.blinkTo = tone.eyes;
    this.#khauHinh(t, soAm, nhip, tone.corner);
    const moc = [];
    for (let i = 1; i < soAm && i * nhip <= dur - 0.5; i++) moc.push(i * nhip);
    const stress = [];
    for (let i = 1; i < soAm; i += 3) stress.push(i * nhip);
    this.#cuChi(t, moc, dur, stress, hand);
    if (dur > 1.2) this.#chop(t, dur * nhieu(0.4, 0.65));
    this.blinkTo = 0;
    t.to(s, { mieng: 0, chum: 0, duration: 0.15 }, dur);
    this.#khep(t, 0.5, dur + 0.05);
    return t;
  }
  speakCues(cue, dur = null, { cuChi = true, mood = null, hand = null } = {}) {      // `{ text }` trong tham số thứ ba là LỜI cho `captions()`; rig không dùng tới
    const t = this.tl(), s = this.s, tone = this.#tone(mood, 0.4, 0.45);
    this.blinkTo = tone.eyes;
    this.#stageSpeech(t, hand);
    const ds = Array.isArray(cue) ? cue : (cue && cue.mouthCues) || [];
    const D = dur || (cue && cue.metadata && cue.metadata.duration)
                  || (ds.length ? ds[ds.length - 1].end : 2);
    if (!ds.length) return this.explain(null, D);
    t.to(s, { ...tone.start, nhinX: 0.6, duration: 0.3, ease: 'power2.out' }, 0);
    this.#troi(t, 'tho', 0, 1, D, 0.9, 2.2);
    this.#troi(t, 'dau', -3.4, 3.4, D, 1.0, 2.6);
    this.#troi(t, 'dauX', -4, 4, D, 0.9, 2.4);
    const x0 = s.x;
    let atC = nhieu(0.2, 0.9), ben = ngau() < 0.5 ? 1 : -1;
    while (atC < D) {
      const doi = nhieu(0.7, 1.3);
      if (atC + doi > D - 0.05) break;
      if (ngau() < 0.7) ben = -ben;
      const manh = nhieu(0.45, 1);
      t.to(s, { x: x0 + ben * 2.3 * manh, duiL: ben * 3.0 * manh, duiR: -ben * 3.0 * manh,
                ongL: -ben * 2.0 * manh, ongR: ben * 2.0 * manh,
                duration: doi, ease: 'sine.inOut' }, atC);
      atC += doi + nhieu(0.9, 3.2);
    }
    for (let m = nhieu(0.5, 1.0); m < D - 0.3; m += nhieu(1.1, 2.0)) {
      t.to(s, { nhinX: nhieu(-0.9, 1.4), nhinY: nhieu(-0.7, 0.5),
                duration: 0.12, ease: 'power2.out' }, m);
    }
    const VAO = 0.06;
    for (const c of ds) {
      const h = RHUBARB[c.value] || RHUBARB.X;
      t.to(s, { mieng: h.mieng, chum: h.chum, cuoi: tone.corner(h.cuoi),
                duration: Math.min(VAO, Math.max(0.02, (c.end - c.start) * 0.6)),
                ease: 'power1.out' }, c.start);
    }
    const moc = [];
    for (const c of ds) {
      if (c.value !== 'X' || c.end - c.start < 0.16) continue;
      if (c.end < 0.2 || c.end > D - 0.6) continue;
      if (moc.length && c.end - moc[moc.length - 1] < 2.4) continue;
      moc.push(c.end);
    }
    if (!moc.length && D > 1.6) moc.push(D * 0.35);
    const stress = [];
    ds.forEach((c, i) => { if (c.value === 'D' || (i && ds[i - 1].value === 'X' && c.value !== 'X' && c.value !== 'A')) stress.push(c.start); });
    if (cuChi) this.#cuChi(t, moc, D, stress, hand);
    for (let b = nhieu(0.6, 1.2); b < D - 0.4; b += nhieu(1.8, 3.4)) this.#chop(t, b);
    this.blinkTo = 0;
    t.to(s, { mieng: 0, chum: 0, duration: 0.18 }, D);
    this.#khep(t, 0.5, D + 0.05, { x: x0 });       // `#khep` không đụng `x`; trả về đúng chỗ đứng lúc bắt đầu
    return t;
  }
  worry() {
    const t = this.tl(), s = this.s;
    this.#openUp(t);
    t.set(s, { tayL: 'mo', tayR: 'mo' }, 0);
    t.to(s, { batR: 28, cangR: -122, batL: 10, cangL: -58,
              than: 2, vai: -2, dau: 5, dauY: 2.5, nhinY: 0.8, nhinX: -0.4,
              mayL: 0.7, mayR: 0.7, cuoi: -0.5, mieng: 0.08,
              duration: 0.55, ease: 'power2.out' }, 0);
    t.to(s, { nhinY: -0.3, nhinX: 0, dau: 3, dauY: 1.6, cangR: -128, cuoi: -0.42,
              duration: 0.4, ease: 'sine.inOut' }, 0.6)
     .to(s, { cangR: -122, dauY: 2, duration: 0.45, ease: 'sine.inOut' }, 1.0);
    this.#chop(t, 0.85);
    this.#khep(t, 0.6, 1.55);
    return t;
  }
}
return { veKhuonMat, beRongTaiY, veChanMay, RigSVG };
})();
__m['runtime/rig-thu.js'] = (function () {
const KHUNG = { w: 400, h: 330 };
const DAT = 292;                                   // cao độ mặt nền
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const RAD = Math.PI / 180;
const mem = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const pha = (a, b, k) => a + (b - a) * k;
let ngau = Math.random;
const gieoHat = (hat) => {
  if (hat === null || hat === undefined) { ngau = Math.random; return; }
  let a = hat >>> 0;
  ngau = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
                 t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
const nhieu = (a, b) => a + ngau() * (b - a);
const chinhSang = (c, k) => {
  const n = parseInt(c.replace('#', ''), 16);
  const v = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((u) => (k < 0 ? u * (1 + k) : u + (255 - u) * k));
  return '#' + v.map((u) => Math.round(clamp(u, 0, 255)).toString(16).padStart(2, '0')).join('');
};
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
function assertColors(palette, where) {
  const bad = Object.entries(palette).filter(([, v]) => v !== null && !(typeof v === 'string' && HEX_COLOR.test(v)));
  if (bad.length) throw new Error(`[character] ${where}: colours must be hex (#rgb / #rrggbb) — invalid: ${bad.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')}`);
}
const NGHI = Object.freeze({
  x: 0, y: 0, mo: 1, co: 1, huong: 1,
  ngoi: 0, tho: 0, truocX: 0, truocY: 0, sauX: 0, sauY: 0, cong: 0, xu: 0,
  dau: 0, dauX: 0, dauY: 0, taiL: 0, taiR: 0,
  matY: 0, nhinX: 0, nhinY: 0, dongTu: 1, mieng: 0, luoi: 0, cuoi: 0.4,
  duoi: 0, duoiCong: 0,
  tnX: 0, tnY: 0, tnNhac: 0, tnGoc: 0, txX: 0, txY: 0, txNhac: 0, txGoc: 0,
  snX: 0, snY: 0, sxX: 0, sxY: 0,
});
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
    <g id="${p}-nguoi${b}"><circle cx="-2" cy="-2.800" r="2.300" fill="#fff"/><circle cx="2.200" cy="2.600" r="1.100" fill="#fff" opacity=".8"/></g>
  </g>`; }).join('')}
  <g id="${p}-mom">
    <path id="${p}-ham" fill="${m.mieng}"/>
    <path id="${p}-luoi" fill="${m.luoi}"/>
    <path id="${p}-luoiNet" stroke="${chinhSang(m.luoi, -0.25)}" stroke-width="1" fill="none" stroke-linecap="round"/>
    <path id="${p}-moi" stroke="${m.mui}" stroke-width="1.800" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <path d="M -6.500 4 Q 0 1.200 6.500 4 Q 5.500 10.500 0 12 Q -5.500 10.500 -6.500 4 Z" fill="${m.mui}"/>
  <ellipse cx="-1.800" cy="5.200" rx="2.200" ry="1.100" fill="#fff" opacity=".45"/>`;
const dauMeo = (p, m) => `
  ${['L', 'R'].map((b) => { const g = b === 'L' ? -1 : 1; return `
  <g id="${p}-tai${b}"><path d="M ${g * 33} -12 L ${g * 29} -49 L ${g * 5} -29 Z" fill="${m.long}" stroke="${m.long}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M ${g * 28} -19 L ${g * 26.500} -40 L ${g * 12} -28 Z" fill="${m.taiTrong}"/></g>`; }).join('')}
  <ellipse rx="37" ry="32" fill="${m.long}"/>
  <path d="M 0 -31 v 9 M -9 -30 l 2 8 M 9 -30 l -2 8" stroke="${m.dom}" stroke-width="3.200" stroke-linecap="round"/>
  <path d="M -36 -2 l 9 1.500 M -35 7 l 8 -0.500 M 36 -2 l -9 1.500 M 35 7 l -8 -0.500" stroke="${m.dom}" stroke-width="2.600" stroke-linecap="round"/>
  <ellipse cx="0" cy="17" rx="16" ry="12" fill="${m.longSang}"/>
  <ellipse cx="-24" cy="12" rx="5.500" ry="3.200" fill="${m.ma}" opacity=".45"/><ellipse cx="24" cy="12" rx="5.500" ry="3.200" fill="${m.ma}" opacity=".45"/>
  ${['L', 'R'].map((b) => { const g = b === 'L' ? -1 : 1; return `
  <g id="${p}-mat${b}" transform="translate(${g * 15} -2)">
    <ellipse rx="7.800" ry="8.600" fill="${m.mat}" stroke="${m.vienNet}" stroke-width="1.400"/>
    <g id="${p}-nguoi${b}"><ellipse id="${p}-dongTu${b}" rx="2.600" ry="6.800" fill="#17110c"/>
      <circle cx="-2.400" cy="-3.200" r="2" fill="#fff"/></g>
  </g>`; }).join('')}
  <g id="${p}-mom">
    <path id="${p}-ham" fill="${m.mieng}"/>
    <path id="${p}-luoi" fill="${m.luoi}"/>
    <path id="${p}-luoiNet" stroke="${chinhSang(m.luoi, -0.25)}" stroke-width="0.800" fill="none" stroke-linecap="round"/>
    <path id="${p}-moi" stroke="${m.vienNet}" stroke-width="1.500" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <path d="M -4 9 Q 0 7.500 4 9 Q 2.500 13 0 13.800 Q -2.500 13 -4 9 Z" fill="${m.mui}"/>
  <path d="M -13 14 l -19 -4 M -13 17 l -20 1 M -13 20 l -18 6 M 13 14 l 19 -4 M 13 17 l 20 1 M 13 20 l 18 6"
        stroke="#ffffff" stroke-width="0.900" stroke-linecap="round" opacity=".85"/>`;
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
LOAI.shiba = {
  ...LOAI.dog, ten: 'Chó — shiba', ears: 'pointed', taiTam: [22, -24], taiGoc: 14,
  duoi: { ...LOAI.dog.duoi, dai: 50, cong: 1.15 },
  mau: { ...LOAI.dog.mau, long: '#e08a3c', longToi: '#b96a25', longSang: '#fff3e0', vongCo: '#2f6fd0' },
};
LOAI.orange_cat = {
  ...LOAI.cat, ten: 'Mèo — mướp cam',
  mau: { ...LOAI.cat.mau, long: '#eda24a', longToi: '#c9802e', dom: '#c9712a', longSang: '#fff6e8', mat: '#7cb342', vongCo: '#d6453d' },
};
LOAI.black_cat = {
  ...LOAI.cat, ten: 'Mèo — mun',
  mau: { ...LOAI.cat.mau, long: '#2f2d35', longToi: '#211f26', dom: '#2f2d35', longSang: '#4b4853', taiTrong: '#6b5560',
         mui: '#4a3f47', mat: '#f1c232', vongCo: '#8a5ad6' },
};
const SHAPE_RANGE = {
  headSize: [0.7, 1.4], bodyLength: [0.7, 1.5], bodyThickness: [0.7, 1.4], legLength: [0.6, 1.5],
  tailLength: [0.3, 1.8], tailCurl: [-1, 1], earSize: [0.6, 1.6],
};
const DEFAULT_SHAPE = Object.freeze({ headSize: 1, bodyLength: 1, bodyThickness: 1, legLength: 1, tailLength: 1, tailCurl: 0, earSize: 1 });
function shapedSpecies(base, shape) {
  const half = (base.S0.x - base.H0.x) / 2, mid = (base.S0.x + base.H0.x) / 2;
  const leg = (c) => ({ ...c, a: c.a * shape.legLength, b: c.b * shape.legLength, rong: c.rong * (0.5 + 0.5 * shape.bodyThickness),
                        ...(c.dui ? { dui: c.dui * shape.bodyThickness } : {}) });
  const lift = (y) => DAT - (DAT - y) * (0.35 + 0.65 * shape.legLength) - base.dayThan * (shape.bodyThickness - 1) * 0.5;
  return {
    ...base,
    H0: { x: mid - half * shape.bodyLength, y: lift(base.H0.y) },
    S0: { x: mid + half * shape.bodyLength, y: lift(base.S0.y) },
    dayThan: base.dayThan * shape.bodyThickness,
    chanT: leg(base.chanT), chanS: leg(base.chanS),
    dau: { ...base.dau, dx: base.dau.dx * (0.5 + 0.5 * shape.headSize), dy: base.dau.dy * (0.45 + 0.55 * shape.headSize) - base.dayThan * (shape.bodyThickness - 1) * 0.3 },
    duoi: { ...base.duoi, dai: base.duoi.dai * shape.tailLength, cong: base.duoi.cong + shape.tailCurl * 0.6 },
    headScale: shape.headSize, earScale: shape.earSize,
  };
}
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
  if (J.y > DAT - 4) J = j1.y < j2.y ? j1 : j2;
  return { J, T };
}
class RigThu {
  static KHUNG = KHUNG;
  static NGHI = NGHI;
  static LOAI = LOAI;
  static DONG_TAC = {
    dog: ['idle', 'wagTail', 'bark', 'sit', 'tiltHead', 'jump', 'beg', 'givePaw', 'sniff', 'walk', 'enter', 'exit'],
    cat: ['idle', 'meow', 'purr', 'lickPaw', 'stretch', 'hiss', 'tailSwish', 'tiltHead', 'pounce', 'walk', 'enter', 'exit'],
  };
  static gieo(hat) { gieoHat(hat); }
  static #dem = 0;
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
    this.shape = { ...DEFAULT_SHAPE };
    this.nv = shapedSpecies(nv, this.shape);
    this.mauKhai = { ...nv.mau };
    this.mau = this.nv.mau = RigThu.#withAliases(this.mauKhai);
    this.DONG_TAC = RigThu.DONG_TAC[nv.loai];
    this.NGHI = Object.freeze({ ...NGHI, ...(nv.nghi || {}) });
    this.id = `thu${++RigThu.#dem}`;
    this.s = this.#theoDoi({ ...this.NGHI });
    this.#dungLai();
  }
  #choVe = false;
  #theoDoi(o) {
    return new Proxy(o, { set: (dich, k, v) => {
      dich[k] = v;
      if (!this.#choVe && this.el) { this.#choVe = true; queueMicrotask(() => { this.#choVe = false; this.apDung(); }); }
      return true;
    } });
  }
  #dungLai() {
    const khung = this.svg && this.svg.getAttribute('viewBox');
    this.host.innerHTML = this.#dungSVG();
    this.svg = this.host.querySelector('svg');
    if (khung) this.svg.setAttribute('viewBox', khung);
    const q = (n) => this.svg.querySelector('#' + this.id + '-' + n);
    this.el = Object.fromEntries(['goc', 'bong', 'chanXa', 'chanGan', 'duoi', 'duoiDau', 'than', 'thanE', 'mong', 'nguc', 'gu', 'bung', 'ucSang', 'van', 'co', 'vong', 'the',
      'dau', 'taiL', 'taiR', 'matL', 'matR', 'nguoiL', 'nguoiR', 'dongTuL', 'dongTuR', 'ham', 'luoi', 'luoiNet', 'moi',
      'duiN', 'duiX', ...['tn', 'tx', 'sn', 'sx'].flatMap((k) => [k, k + 'Ban'])].map((n) => [n, q(n)]));
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
        ? [-17, -2, 13].map((x) => `<path d="M ${x} ${-nv.dayThan + 1} q 4 7 1 14" stroke="${m.dom}" stroke-width="3.400" fill="none" stroke-linecap="round"/>`).join('') : ''}</g>
    </g>
    <g id="${p}-chanGan"${V}>
      <circle id="${p}-duiN" r="${nv.chanS.dui}" fill="${m.long}"/>
      ${chan('sn', m.long, nv.chanS)}${chan('tn', m.long, nv.chanT)}
    </g>
    <g${V}>
      <path id="${p}-vong" stroke="${m.vongCo}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <circle id="${p}-the" r="4.200" fill="${m.the}" stroke="${m.vienNet}" stroke-width="0.900"/>
    </g>
    <g id="${p}-dau"${V}>${nv.veDau(p, m, nv)}</g>
  </g>
</svg>`;
  }
  khungMat(nua = 70) {
    const { S } = this.#khung(), d = this.nv.dau, k = this.s.huong < 0 ? -1 : 1;
    const cx = 200 + (S.x + d.dx - 200) * k, cy = S.y + d.dy;
    return `${cx - nua} ${cy - nua + 2} ${nua * 2} ${nua * 2}`;
  }
  #khung() {
    const s = this.s, nv = this.nv, ng = mem(s.ngoi);
    const H = { x: nv.H0.x + 22 * ng + s.sauX, y: pha(nv.H0.y, DAT - nv.dayThan + 3, ng) + s.sauY };
    const T = nv.chanT, vaiNgoi = Math.min(nv.S0.y, DAT - T.rong * 0.36 - 4 - 0.96 * (T.a + T.b));
    const S = { x: nv.S0.x - 9 * ng + s.truocX, y: pha(nv.S0.y, vaiNgoi, ng) + s.truocY };
    return { H, S, ng };
  }
  apDung() {
    const s = this.s, e = this.el, nv = this.nv, { H, S, ng } = this.#khung();
    const fx = (v) => v.toFixed(2);
    const flip = (s.huong < 0 ? -1 : 1) * (RigThu.FLIP_MIN + (1 - RigThu.FLIP_MIN) * Math.min(1, Math.abs(s.huong)));
    e.goc.setAttribute('transform', `translate(${fx(s.x)} ${fx(s.y)}) translate(200 ${DAT}) scale(${fx(s.co * flip)} ${fx(s.co)}) translate(-200 ${-DAT})`);
    e.goc.setAttribute('opacity', s.mo);
    const cao = clamp(-s.y / 50, 0, 1);
    e.bong.setAttribute('cx', fx((H.x + S.x) / 2 + 6));
    e.bong.setAttribute('rx', fx(((S.x - H.x) / 2 + nv.dayThan + 14) * (1 - cao * 0.3)));
    e.bong.setAttribute('transform', `translate(0 ${fx(-s.y / (s.co || 1))})`);   // bóng ở lại mặt nền khi nhảy
    e.bong.setAttribute('opacity', 0.26 - cao * 0.12);
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
      e[k].setAttribute('d', `M ${fx(R.x)} ${fx(R.y)} L ${fx(J.x)} ${fx(J.y)} L ${fx(ban.x)} ${fx(ban.y)}`);
      e[k + 'Ban'].setAttribute('transform', `translate(${fx(ban.x + c.rong * 0.22)} ${fx(ban.y)})`);
      return R;
    };
    const xTruoc = pha(nv.S0.x + 3, nv.S0.x - 5, ng), xSau = pha(nv.H0.x - 3, nv.H0.x + 52, ng);
    dat('tn', xTruoc, false); dat('tx', xTruoc, true);
    const hn = dat('sn', xSau, false), hx = dat('sx', xSau, true);
    e.duiN.setAttribute('transform', `translate(${fx(hn.x + 3)} ${fx(hn.y)})`);
    e.duiX.setAttribute('transform', `translate(${fx(hx.x + 3)} ${fx(hx.y)})`);
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
    const dd = nv.dau, tam = { x: S.x + dd.dx + s.dauX, y: S.y + dd.dy + s.dauY - ng * 2 };
    const goi = { x: S.x + 4, y: S.y - 8 };
    e.co.setAttribute('d', `M ${fx(goi.x)} ${fx(goi.y)} L ${fx(pha(goi.x, tam.x, 0.75))} ${fx(pha(goi.y, tam.y, 0.75))}`);
    const cg = { x: pha(goi.x, tam.x, 0.42), y: pha(goi.y, tam.y, 0.42) };
    const dc = Math.atan2(tam.y - goi.y, tam.x - goi.x) + Math.PI / 2, rc = nv.dayThan * 0.6;
    e.vong.setAttribute('d', `M ${fx(cg.x - rc * Math.cos(dc))} ${fx(cg.y - rc * Math.sin(dc))} L ${fx(cg.x + rc * Math.cos(dc))} ${fx(cg.y + rc * Math.sin(dc))}`);
    e.the.setAttribute('transform', `translate(${fx(cg.x + rc * 0.75 * Math.cos(dc) + 2)} ${fx(cg.y + rc * 0.75 * Math.sin(dc) + 5)})`);
    e.dau.setAttribute('transform', `translate(${fx(tam.x)} ${fx(tam.y)}) rotate(${fx(s.dau)}) scale(${fx(nv.headScale)})`);
    const [tx, ty] = nv.taiTam;
    const ear = (side, angle) => `rotate(${fx(angle)} ${side * tx} ${ty}) translate(${side * tx} ${ty}) scale(${fx(nv.earScale)}) translate(${-side * tx} ${-ty})`;
    e.taiL.setAttribute('transform', ear(-1, -s.taiL * nv.taiGoc));
    e.taiR.setAttribute('transform', ear(1, s.taiR * nv.taiGoc));
    const mi = Math.max(0.06, 1 - s.matY);
    for (const [b, g] of [['L', -1], ['R', 1]]) {
      const goc0 = e['mat' + b].getAttribute('transform').match(/translate\([^)]*\)/)[0];
      e['mat' + b].setAttribute('transform', `${goc0} scale(1 ${fx(mi)})`);
      e['nguoi' + b].setAttribute('transform', `translate(${fx(s.nhinX)} ${fx(s.nhinY)})`);
      if (e['dongTu' + b]) e['dongTu' + b].setAttribute('rx', fx(clamp(2.6 * s.dongTu, 0.7, 6.4)));
    }
    this.#veMom();
  }
  #veMom() {
    const s = this.s, e = this.el, k = this.nv.mom.co, y0 = this.nv.mom.y;
    const mo = clamp(s.mieng, 0, 1), cu = s.cuoi * 2.6 * k, w = 9.5 * k, f = (v) => v.toFixed(2);
    e.moi.setAttribute('d', `M 0 ${f(y0 - 3.4 * k)} V ${f(y0)} M ${f(-w)} ${f(y0 - cu)} Q ${f(-w / 2)} ${f(y0 + 5 * k)} 0 ${f(y0)} Q ${f(w / 2)} ${f(y0 + 5 * k)} ${f(w)} ${f(y0 - cu)}`);
    const sau = mo * 21 * k;
    e.ham.setAttribute('d', mo < 0.02 ? '' : `M ${f(-w * 0.82)} ${f(y0 + 2.4 * k)} Q 0 ${f(y0 + 2.4 * k + sau * 1.5)} ${f(w * 0.82)} ${f(y0 + 2.4 * k)} Q 0 ${f(y0 + 5.5 * k)} ${f(-w * 0.82)} ${f(y0 + 2.4 * k)} Z`);
    const dai = Math.max(clamp(s.luoi, 0, 1) * 17 * k, mo * 9 * k), r = 4.6 * k;
    if (dai < 1.2) { e.luoi.setAttribute('d', ''); e.luoiNet.setAttribute('d', ''); return; }
    const ty = y0 + 3.6 * k, day = ty + Math.max(dai - r, 0.1);
    e.luoi.setAttribute('d', `M ${f(-r)} ${f(ty)} L ${f(-r)} ${f(day)} A ${f(r)} ${f(r)} 0 0 0 ${f(r)} ${f(day)} L ${f(r)} ${f(ty)} Z`);
    e.luoiNet.setAttribute('d', dai > r * 1.6 ? `M 0 ${f(ty + 1.5)} V ${f(day + r * 0.3)}` : '');
  }
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
  static TEN_DONG_TAC = {
    idle: 'Đứng yên', walk: 'Đi', enter: 'Chạy vào', exit: 'Chạy ra', tiltHead: 'Nghiêng đầu',
    wagTail: 'Vẫy đuôi', bark: 'Sủa', sit: 'Ngồi', jump: 'Nhảy mừng', beg: 'Đứng xin', givePaw: 'Bắt tay', sniff: 'Đánh hơi',
    meow: 'Kêu meo', purr: 'Gừ gừ', lickPaw: 'Liếm chân', stretch: 'Vươn vai', hiss: 'Xù lông', tailSwish: 'Quẫy đuôi', pounce: 'Rình vồ',
  };
  tl() { return gsap.timeline({ paused: true, defaults: { lazy: false }, onUpdate: () => this.apDung(), onComplete: () => this.apDung() }); }
  #khep(t, d = 0.4, at = '>', giu = {}) {
    const { x, ...so } = this.NGHI;
    so.ngoi = this.s.ngoi; so.huong = this.s.huong;
    t.to(this.s, { ...so, ...giu, duration: d, ease: 'power2.inOut' }, at);
    return t;
  }
  #chop(t, at) {
    t.to(this.s, { matY: 1, duration: 0.07, ease: 'power1.in' }, at).to(this.s, { matY: 0, duration: 0.11, ease: 'power1.out' }, at + 0.07);
  }
  #dung(t, at = 0) {
    if (!this.s.ngoi) return at;
    t.to(this.s, { ngoi: 0, duration: 0.32, ease: 'power2.inOut' }, at);
    return at + 0.32;
  }
  #vay(t, at, n, bien, h, tam = 0) {
    for (let i = 0; i < n; i++) t.to(this.s, { duoi: tam + (i % 2 ? -bien : bien), duration: h, ease: 'sine.inOut' }, at + i * h);
    return at + n * h;
  }
  #buoc(f, a, A, cao) {
    const chan = (p) => { p = ((p % 1) + 1) % 1;
      if (p < 0.6) return { x: A * (1 - 2 * p / 0.6), y: 0 };
      const u = (p - 0.6) / 0.4; return { x: -A + 2 * A * mem(u), y: cao * Math.sin(Math.PI * u) }; };
    const c1 = chan(f), c2 = chan(f + 0.5), nh = Math.cos(4 * Math.PI * f);
    return { tnX: c1.x * a, tnY: c1.y * a, sxX: c1.x * a, sxY: c1.y * a, txX: c2.x * a, txY: c2.y * a, snX: c2.x * a, snY: c2.y * a,
             truocY: -1.6 * nh * a, sauY: 1.6 * nh * a, dauY: 1.4 * nh * a, duoi: 7 * Math.sin(2 * Math.PI * f) * a };
  }
  #di(t, at, chuKy, h, { vao = true, ra = true, quang = 0, x0 = 0, A = 13, cao = 9 } = {}) {
    const s = this.s;
    const bao = (c) => (vao ? mem(c / 0.5) : 1) * (ra ? mem((chuKy - c) / 0.5) : 1);
    const M = 60, n = Math.round(chuKy * M), X = [0];
    for (let i = 1; i <= n; i++) X.push(X[i - 1] + (2 * A / 0.6) * bao(i / M) / M);
    const tiLe = quang ? Math.abs(quang) / X[n] : 0, dau = quang < 0 ? -1 : 1;
    const dat = (c) => {
      const a = bao(c);
      Object.assign(s, this.#buoc(c, a, A * (tiLe ? Math.min(1.35, Math.max(0.5, tiLe)) : 1), cao));
      if (quang) { const v = clamp(c, 0, chuKy) * M, i = Math.min(n - 1, Math.floor(v)); s.x = x0 + dau * tiLe * (X[i] + (X[i + 1] - X[i]) * (v - i)); }
    };
    const pr = { _c: 0, get c() { return this._c; }, set c(v) { this._c = v; dat(v); } };
    t.to(pr, { c: chuKy, duration: chuKy * h, ease: 'none' }, at);
    return at + chuKy * h;
  }
  walk(buoc = 4, quang = 0) {
    const t = this.tl(), s = this.s, x0 = s.x;
    let at = this.#dung(t, 0);
    const held = s.huong < 0 ? -1 : 1, dir = quang < 0 ? -1 : quang > 0 ? 1 : held;
    if (dir !== held) { t.to(s, { huong: dir, duration: 0.22, ease: 'power1.inOut' }, at); at += 0.22; }
    t.to(s, { taiL: 0.5, taiR: 0.5, cuoi: 0.7, duration: 0.2 }, 0);
    const far = Math.abs(quang) > 160;
    const chuKy = quang ? Math.max(2, Math.round(Math.abs(quang) / (far ? 62 : 40))) : buoc / 2;
    at = this.#di(t, at, chuKy, far ? 0.4 : 0.5, far ? { quang, x0, A: 16, cao: 11 } : { quang, x0 });
    this.#khep(t, 0.4, at, quang ? { x: x0 + quang, huong: dir } : {});
    if (dir !== held) t.to(s, { huong: held, duration: 0.22, ease: 'power1.inOut' }, '>');
    return t;
  }
  #pace(far) {
    if (far <= 380) return { cycles: Math.max(6, Math.round(far / 52)), beat: 0.36, A: 16, lift: 11 };
    return { cycles: Math.max(6, Math.round(far / 86)), beat: 0.3, A: 22, lift: 15 };
  }
  #offstage(dir) {
    const frame = this.svg.getBoundingClientRect();
    const scale = Math.min(frame.width / KHUNG.w, frame.height / KHUNG.h);
    if (!(scale > 0)) return 300;
    const stage = (this.svg.closest('[data-composition-id]') || this.svg.ownerDocument.documentElement).getBoundingClientRect();
    const centre = frame.left + frame.width / 2;
    return clamp((dir > 0 ? stage.right - centre : centre - stage.left) / scale + 110, 300, 700);
  }
  enter(from = 'left', distance = null) {
    const t = this.tl(), s = this.s, dir = from === 'right' ? -1 : 1, far = distance > 0 ? distance : this.#offstage(-dir);
    t.set(s, { x: -far * dir, mo: 1, ngoi: 0, huong: dir, cuoi: 0.8, taiL: 0.6, taiR: 0.6 }, 0);
    const run = this.#pace(far), at = this.#di(t, 0, run.cycles, run.beat, { vao: false, quang: far * dir, x0: -far * dir, A: run.A, cao: run.lift });
    const shown = { get v() { return 0; }, set v(v) { s.mo = Math.min(1, v * at / 0.2); s.ngoi = 0; s.huong = dir; } };       // hiện, ĐỨNG và quay đúng hướng suốt quãng chạy — `set` ở trên không được ghi khi chạy trong `sequence()` (xem `enter` trong rig-svg.js): mèo từng trượt vào trong dáng ngồi
    t.to(shown, { v: 1, duration: at, ease: 'none' }, 0);
    this.#khep(t, 0.4, at, { x: 0, ngoi: this.NGHI.ngoi, huong: dir });    // vào xong: về dáng nghỉ của giống, đầu vẫn quay về hướng vừa chạy
    return t;
  }
  static STANCE = ['sitDown', 'standUp', 'face'];
  static FLIP_MIN = 0.3;                 // bề ngang nhỏ nhất của con vật giữa một cú lật hướng
  centerX() {
    const frame = this.svg.getBoundingClientRect();
    const scale = Math.min(frame.width / KHUNG.w, frame.height / KHUNG.h) || 1;
    return frame.left + frame.width / 2 + this.s.x * scale;
  }
  shotBox(kind = 'full') {
    const { S } = this.#khung(), d = this.nv.dau, s = this.s, k = s.huong < 0 ? -1 : 1;
    const headX = 200 + (S.x + d.dx - 200) * k + s.x, headY = S.y + d.dy + s.y;
    if (kind === 'face') return { x: headX - 66, y: headY - 64, width: 132, height: 132 };
    if (kind !== 'chest' && kind !== 'full') throw new Error(`[character] no shot "${kind}" (available: face, chest, full)`);
    const top = headY - 72, bottom = DAT + 10;
    return { x: 200 + s.x - 125, y: top, width: 250, height: bottom - top };
  }
  sitDown() { return this.#khep(this.tl(), 0.4, 0, { ngoi: 1 }); }
  standUp() { return this.#khep(this.tl(), 0.35, 0, { ngoi: 0 }); }
  face(target = 'right') {
    let side = target === 'left' ? -1 : 1;
    if (target && typeof target === 'object') {
      const box = target.getBoundingClientRect ? target.getBoundingClientRect() : null;
      const dx = (typeof target.centerX === 'function' ? target.centerX() : box.left + box.width / 2) - this.centerX();
      side = dx < 0 ? -1 : 1;
    }
    return this.#khep(this.tl(), 0.3, 0, { huong: side });
  }
  exit(to = 'right', distance = null) {
    const t = this.tl(), s = this.s, dir = to === 'left' ? -1 : 1, x0 = s.x;
    let at = this.#dung(t, 0);
    if ((s.huong < 0 ? -1 : 1) !== dir) { t.to(s, { huong: dir, duration: 0.22, ease: 'power1.inOut' }, at); at += 0.22; }
    const far = Math.max(60, (dir * (distance > 0 ? distance : this.#offstage(dir)) - x0) * dir);
    const run = this.#pace(far);
    at = this.#di(t, at, run.cycles, run.beat, { ra: false, quang: dir * far, x0, A: run.A, cao: run.lift });
    t.to(s, { mo: 0, duration: 0.2 }, at - 0.2);
    this.#khep(t, 0.2, at, { x: x0 + dir * far, mo: 0, huong: dir });
    return t;
  }
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
      t.to(s, { dauY: 3, truocY: 2, duration: 0.07, ease: 'sine.in' }, at - 0.07)
       .to(s, { mieng: 0.95, dau: -15, dauY: -9, dauX: 4, truocY: -7, duoi: 22, taiL: 0.2, taiR: 0.2, duration: 0.12, ease: 'power2.out' }, at)
       .to(s, { mieng: 0.1, dau: 0, dauY: 0, dauX: 0, truocY: 0, duoi: 14, taiL: 1, taiR: 1, duration: 0.2, ease: 'power2.in' }, at + 0.14);
      at += 0.42;
    }
    this.#khep(t, 0.35, at + 0.1);
    return t;
  }
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
  givePaw() {
    const t = this.tl(), s = this.s;
    t.to(s, { ngoi: 1, duoi: -22, duration: 0.3, ease: 'power2.inOut' }, 0);
    t.to(s, { tnNhac: 1, tnGoc: 84, dau: 6, cuoi: 0.9, taiL: 0.6, taiR: 0.6, duration: 0.3, ease: 'back.out(1.6)' }, 0.3);
    for (let i = 0; i < 4; i++) t.to(s, { tnGoc: i % 2 ? 84 : 70, duration: 0.17, ease: 'sine.inOut' }, 0.65 + i * 0.17);
    this.#chop(t, 0.9);
    this.#khep(t, 0.45, 1.45);
    return t;
  }
  sniff() {
    const t = this.tl(), s = this.s;
    t.to(s, { truocY: 13, dauX: 20, dauY: 40, dau: 16, taiL: -0.4, taiR: -0.4, duoi: -30, nhinY: 1.5, cuoi: 0, duration: 0.4, ease: 'power2.inOut' }, 0);
    for (let i = 0; i < 6; i++) t.to(s, { dauX: i % 2 ? 16 : 25, dauY: i % 2 ? 41 : 38, duration: 0.16, ease: 'sine.inOut' }, 0.4 + i * 0.16);
    this.#vay(t, 0.4, 6, 8, 0.16, -30);
    this.#khep(t, 0.4, 1.4);
    return t;
  }
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
  purr() {
    const t = this.tl(), s = this.s;
    t.to(s, { matY: 0.92, cuoi: 1, taiL: 0.3, taiR: 0.3, dau: 7, dauY: 2, duration: 0.3, ease: 'power2.out' }, 0);
    for (let i = 0; i < 14; i++) t.to(s, { tho: i % 2 ? 0 : 1, duration: 0.09, ease: 'sine.inOut' }, 0.3 + i * 0.09);      // rung
    t.to(s, { dau: -7, dauX: -3, duration: 0.5, ease: 'sine.inOut' }, 0.5).to(s, { dau: 6, dauX: 3, duration: 0.5, ease: 'sine.inOut' }, 1.0);
    t.to(s, { duoiCong: 0.35, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.3);
    this.#khep(t, 0.4, 1.6);
    return t;
  }
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
}
return { RigThu };
})();
__m['runtime/characters.js'] = (function () {
const suonTu = (diem) => ['L', 'R'].map((b) => { const g = b === 'L' ? -1 : 1;
  const ngoai = diem.map(([x, y]) => `${g * x} ${y}`), trong = diem.map(([x, y]) => `${g * (x - 5)} ${y}`).reverse();
  return `M ${ngoai.join(' L ')} L ${trong.join(' L ')} Z`; }).join(' ');
const vaiCo = (m) => `
        <path d="M -28.5 -96 Q -22 -102.5 -12.2 -103.5 L -8.5 -96 Z" fill="${m.ao}"/>
        <path d="M 28.5 -96 Q 22 -102.5 12.2 -103.5 L 8.5 -96 Z" fill="${m.ao}"/>`;
const giayKin = (soc) => (p, ben, m, ong) => `
          <g id="${p}-ban${ben}">
            <path d="M -12 ${ong - 6} h 24 v 11 q 0 7 -7 7 h -10 q -7 0 -7 -7 z" fill="${m.giay}"/>
            ${soc ? `<path d="M -12 ${ong + 1} h 24" stroke="${soc}" stroke-width="2.2"/>` : ''}
          </g>`;
const theTen = (x, y, mauDai, vien) => `
        <rect x="${x}" y="${y}" width="13" height="16" rx="1.6" fill="#fdfdfd" stroke="${vien}" stroke-width="1"/>
        <rect x="${x}" y="${y}" width="13" height="4.4" rx="1.6" fill="${mauDai}"/>
        <circle cx="${x + 4}" cy="${y + 9}" r="2.1" fill="#c8ced6"/>
        <path d="M ${x + 7.4} ${y + 8} h 3.6 M ${x + 7.4} ${y + 10.6} h 2.6 M ${x + 2.4} ${y + 13.4} h 8.4" stroke="#aab2bd" stroke-width="0.9" stroke-linecap="round"/>`;
const dauChan = (x, y, k, xoay = 0) => `<g transform="translate(${x} ${y}) rotate(${xoay}) scale(${k})">
          <ellipse cx="0" cy="1.6" rx="3.2" ry="2.6"/><circle cx="-3.6" cy="-2" r="1.3"/><circle cx="-1.2" cy="-3.7" r="1.3"/><circle cx="1.2" cy="-3.7" r="1.3"/><circle cx="3.6" cy="-2" r="1.3"/></g>`;
const ongNgheVatCo = (ong, vien) => `
        <g fill="none" stroke-linecap="round">
          ${['M -13.5 -103 Q -29 -90 -21.500 -63', 'M 13.5 -103 Q 29 -90 21.500 -66']
            .map((d) => `<path d="${d}" stroke="${vien}" stroke-width="5"/><path d="${d}" stroke="${ong}" stroke-width="3"/>`).join('')}
          <path d="M 21.500 -66 q -3.200 4 -2.600 9 M 21.500 -66 q 3.200 4 2.600 9" stroke="#b9c0c9" stroke-width="2.2"/>
          <circle cx="18.900" cy="-56.500" r="1.7" fill="#e6eaef" stroke="${vien}" stroke-width="0.8"/>
          <circle cx="24.100" cy="-56.500" r="1.7" fill="#e6eaef" stroke="${vien}" stroke-width="0.8"/>
          <circle cx="-21.500" cy="-59" r="5.4" fill="#c3c9d1" stroke="${vien}" stroke-width="1.5"/>
          <circle cx="-21.500" cy="-59" r="2.9" fill="#eef0f4" stroke="#8d949f" stroke-width="1.2"/>
        </g>`;
const AO_MO = 'M -31 20 Q 0 26 31 20 L 29 -40 Q 29.5 -70 35 -88 Q 30 -97 20 -101 Q 10 -105 0 -105'
            + ' Q -10 -105 -20 -101 Q -30 -97 -35 -88 Q -29.5 -70 -29 -40 Z';
const DO_MO = {
  ao: () => AO_MO,
  suon: suonTu([[35, -88], [29.5, -70], [29, -40], [31, 20]]),
  damSuon: 0.3,
  coAo: (p, m) => `${vaiCo(m)}
        <path d="M -11 -102 L 11 -102 L 0 -82 Z" fill="${m.da}"/>
        <path d="M -12.6 -103.5 L 0 -80.500 L 12.6 -103.5" stroke="${m.aoToi}" stroke-width="3.4" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
        <path d="M -14 -111 Q 0 -99 14 -111 L 12.500 -101.500 Q 0 -93.500 -12.500 -101.500 Z" fill="#cfe8f1" stroke="${m.vienNet}" stroke-width="1"/>
        <path d="M -9.500 -103.500 Q 0 -97.500 9.500 -103.500" stroke="#9fc6d4" stroke-width="0.9" fill="none"/>`,
  phuKien: (p, m) => `
      <g id="${p}-phuKien">
        <path d="M -22 -60 h 14 v 13 q 0 3 -3 3 h -8 q -3 0 -3 -3 z" fill="${m.aoToi}" opacity=".55"/>
        <path d="M -22 -60 h 14 v 13 q 0 3 -3 3 h -8 q -3 0 -3 -3 z" fill="none" stroke="${m.vienNet}" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M -18.500 -66 v 9" stroke="#f1c232" stroke-width="2" stroke-linecap="round"/>
        <path d="M -14.500 -65 v 8" stroke="#2f6fd0" stroke-width="2" stroke-linecap="round"/>
        ${theTen(8.5, -66, m.phuKien, m.vienNet)}
        <path d="M 15 -66 v -3" stroke="${m.vienNet}" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M -29.500 13 Q 0 19 29.500 13" stroke="${m.aoToi}" stroke-width="1.3" fill="none"/>
      </g>`,
  phuKienTren: () => '',
  giay: giayKin('#c9d0d8'),
  daiTayAo: 1.1, xeoTayAo: 4, rongTayAo: 1.22, vienGau: 0, mauGau: null, netGau: null, lechGau: 0, boGocTayAo: 4,
  tayDai: false, huyHieu: '', mauSoSau: 'mu',
};
const AO_DD = 'M -32 18 Q 0 28 32 18 Q 29 -10 26 -42 Q 27 -70 35 -88 Q 30 -97 20 -101 Q 10 -105 0 -105'
            + ' Q -10 -105 -20 -101 Q -30 -97 -35 -88 Q -27 -70 -26 -42 Q -29 -10 -32 18 Z';
const DO_DD = {
  ao: () => AO_DD,
  suon: suonTu([[35, -88], [27, -70], [26, -42], [29, -10], [32, 18]]),
  damSuon: 0.28,
  coAo: (p, m) => `${vaiCo(m)}
        <path d="M -13 -104 L 13 -104 L 13 -100 Q 0 -84 -13 -100 Z" fill="${m.da}"/>
        <path d="M -13.6 -102.500 Q 0 -83 13.6 -102.500" stroke="#ffffff" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
  phuKien: (p, m) => `
      <g id="${p}-phuKien">
        <clipPath id="${p}-aoCat"><path d="${AO_DD}"/></clipPath>
        <g clip-path="url(#${p}-aoCat)" fill="#ffffff" opacity=".5">
          ${[[-17, -72, 0.95, -12], [3, -62, 0.8, 10], [-8, -44, 0.9, 16], [19, -40, 0.85, -8], [-21, -24, 0.8, 8],
             [6, -22, 0.9, -14], [24, -12, 0.8, 12], [-28, -50, 0.75, 20], [-2, 16, 0.85, 6], [29, -66, 0.7, -18]]
            .map((d) => dauChan(...d)).join('')}
        </g>
        ${['L', 'R'].map((b) => { const g = b === 'L' ? -1 : 1; return `
        <path d="M ${g * 8} -6 H ${g * 25} L ${g * 26.500} 12 Q ${g * 17} 15.500 ${g * 8} 14.500 Z" fill="${m.ao}" stroke="${m.vienNet}" stroke-width="1.3" stroke-linejoin="round"/>
        <path d="M ${g * 8} -2.500 H ${g * 25.300}" stroke="#ffffff" stroke-width="1.6"/>`; }).join('')}
        <rect x="-23" y="-66" width="14" height="6.500" rx="1.5" fill="#fdfdfd" stroke="${m.vienNet}" stroke-width="0.9"/>
        <path d="M -20.500 -62.700 h 9" stroke="${m.phuKien}" stroke-width="1.3" stroke-linecap="round"/>
        <path d="M 15 -70 v 7" stroke="${m.phuKien}" stroke-width="3" stroke-linecap="round"/>
        <circle cx="15" cy="-58.500" r="5" fill="#fdfdfd" stroke="${m.vienNet}" stroke-width="1.3"/>
        <path d="M 15 -58.500 v -2.800 M 15 -58.500 l 2 1.200" stroke="${m.vienNet}" stroke-width="1" stroke-linecap="round"/>
      </g>`,
  phuKienTren: () => '',
  giay: giayKin('#ef9db0'),
  daiTayAo: 0.85, xeoTayAo: 9, rongTayAo: 1.4, vienGau: 1.8, mauGau: '#ffffff', netGau: null, lechGau: 1.5, boGocTayAo: 6,
  tayDai: false, huyHieu: '',
};
const AO_BL = 'M -34 38 Q 0 42 34 38 Q 31 0 27 -42 Q 28 -70 35 -88 Q 30 -97 20 -101 Q 10 -105 0 -105'
            + ' Q -10 -105 -20 -101 Q -30 -97 -35 -88 Q -28 -70 -27 -42 Q -31 0 -34 38 Z';
const innerShirtColor = (m) => m.aoTrong || m.aoToi;
const stethoscopeColor = (m) => m.ongNghe || m.phuKien;
const DO_BL = {
  ao: () => AO_BL,
  suon: suonTu([[35, -88], [28, -70], [27, -42], [31, 0], [34, 38]]),
  damSuon: 0.6,
  coAo: (p, m) => `${vaiCo(m)}
        <path d="M -11.500 -104 L 11.500 -104 L 0 -68 Z" fill="${innerShirtColor(m)}"/>
        <path d="M -12.500 -104 L 0 -67 L -9 -74 L -15.500 -84 L -9.500 -87.500 Z" fill="${m.ao}" stroke="${m.vienNet}" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M 12.500 -104 L 0 -67 L 9 -74 L 15.500 -84 L 9.500 -87.500 Z" fill="${m.ao}" stroke="${m.vienNet}" stroke-width="1.2" stroke-linejoin="round"/>`,
  phuKien: (p, m) => `
      <g id="${p}-phuKien">
        <path d="M 0 -67 V 40" stroke="${m.vienNet}" stroke-width="1.2"/>
        ${[-50, -28, -6].map((y) => `<circle cx="3.6" cy="${y}" r="1.9" fill="#dfe3e8" stroke="${m.vienNet}" stroke-width="0.8"/>`).join('')}
        <!-- túi ngực đặt THẤP hơn chạc tai nghe (chạc dừng ở y −55), không thì bút đâm vào ống nghe -->
        <path d="M 9 -47 h 13.500 v 14 h -13.500 z" fill="none" stroke="${m.vienNet}" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M 12.500 -52.500 v 8" stroke="#2f6fd0" stroke-width="2.1" stroke-linecap="round"/>
        <path d="M 16.500 -51.500 v 7" stroke="#d6453d" stroke-width="2.1" stroke-linecap="round"/>
        ${['L', 'R'].map((b) => { const g = b === 'L' ? -1 : 1; return `
        <path d="M ${g * 9} 6 H ${g * 27.500} L ${g * 29} 28 H ${g * 9} Z" fill="none" stroke="${m.vienNet}" stroke-width="1.2" stroke-linejoin="round"/>`; }).join('')}
        ${theTen(-22.500, -47, innerShirtColor(m), m.vienNet)}
        <path d="M -16 -47 v -2.500" stroke="${m.vienNet}" stroke-width="1.6" stroke-linecap="round"/>
        ${STETHOSCOPE_MARK}${ongNgheVatCo(stethoscopeColor(m), m.vienNet)}
      </g>`,
  phuKienTren: (p, m) => ongNgheVatCo(stethoscopeColor(m), m.vienNet),
  giay: giayKin(null),
  daiTayAo: 1, xeoTayAo: 3, rongTayAo: 1.12, vienGau: 0, mauGau: null, netGau: null, lechGau: 0, boGocTayAo: 3,
  tayDai: true, huyHieu: '',
};
const STETHOSCOPE_MARK = '<!--stethoscope-->';
const DO_BL_PLAIN = {
  ...DO_BL,
  phuKien: (p, m) => DO_BL.phuKien(p, m).split(STETHOSCOPE_MARK)[0] + '\n      </g>',
  phuKienTren: () => '',
};
const { mauSoSau: _capColor, ...PLAIN_BASE } = DO_MO;
const OUTFIT_TEE = {
  ...PLAIN_BASE,
  coAo: (p, m) => `${vaiCo(m)}
        <path d="M -12 -103 Q 0 -90 12 -103 Z" fill="${m.da}"/>
        <path d="M -13.500 -104 Q 0 -89 13.500 -104" stroke="${m.aoToi}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  phuKien: (p, m) => `
      <g id="${p}-phuKien">
        <path d="M -29.500 13 Q 0 19 29.500 13" stroke="${m.aoToi}" stroke-width="1.3" fill="none"/>
      </g>`,
  phuKienTren: () => '',
};
const OUTFIT_SHIRT = {
  ...PLAIN_BASE,
  tayDai: true,
  coAo: (p, m) => `${vaiCo(m)}
        <path d="M -9 -103 L 9 -103 L 0 -91 Z" fill="${m.da}"/>
        <path d="M -14 -106 L 0 -91 L -9.500 -84 Z M 14 -106 L 0 -91 L 9.500 -84 Z" fill="${m.ao}" stroke="${m.vienNet}" stroke-width="1.1" stroke-linejoin="round"/>`,
  phuKien: (p, m) => `
      <g id="${p}-phuKien">
        <path d="M 0 -90 V 15" stroke="${m.aoToi}" stroke-width="1.3"/>
        ${[-76, -58, -40, -22, -4].map((y) => `<circle cx="0" cy="${y}" r="1.700" fill="${m.cuc || '#f4f6f8'}" stroke="${m.vienNet}" stroke-width="0.700"/>`).join('')}
        <path d="M 11 -66 h 13 v 12 q 0 2.500 -2.500 2.500 h -8 q -2.500 0 -2.500 -2.500 z" fill="none" stroke="${m.aoToi}" stroke-width="1.200" stroke-linejoin="round"/>
        <path d="M -29.500 13 Q 0 19 29.500 13" stroke="${m.aoToi}" stroke-width="1.3" fill="none"/>
      </g>`,
  phuKienTren: () => '',
};
const AO_DRESS = 'M -29 3 Q 0 8 29 3 L 29 -40 Q 29.5 -70 35 -88 Q 30 -97 20 -101 Q 10 -105 0 -105'
               + ' Q -10 -105 -20 -101 Q -30 -97 -35 -88 Q -29.5 -70 -29 -40 Z';
const OUTFIT_DRESS = {
  ...OUTFIT_TEE,
  ao: () => AO_DRESS,
  suon: suonTu([[35, -88], [29.5, -70], [29, -40], [29, 3]]),
  skirt: { kind: 'skirt', length: 1.05, flare: 9 },
  daiTayAo: 0.75, rongTayAo: 1.3,
  phuKien: (p) => `
      <g id="${p}-phuKien"></g>`,
};
const OUTFIT_HOODIE = {
  ...PLAIN_BASE,
  tayDai: true,
  coAo: (p, m) => `
        <path d="M -27 -93 Q -30 -112 0 -113 Q 30 -112 27 -93 Q 14 -84 0 -84 Q -14 -84 -27 -93 Z" fill="${m.aoToi}" stroke="${m.vienNet}" stroke-width="1.100" stroke-linejoin="round"/>
        ${vaiCo(m)}
        <path d="M -11 -103 Q 0 -86 11 -103 Z" fill="${m.da}"/>
        <path d="M -13 -104 Q 0 -84 13 -104" stroke="${m.ao}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  phuKien: (p, m) => `
      <g id="${p}-phuKien">
        <path d="M -5 -88 V -64 M 5 -88 V -66" stroke="${m.day || '#f4f6f8'}" stroke-width="1.800" stroke-linecap="round"/>
        <path d="M -19 -22 H 19 L 24 6 H -24 Z" fill="none" stroke="${m.aoToi}" stroke-width="1.500" stroke-linejoin="round"/>
        <path d="M -30 11 Q 0 17 30 11" stroke="${m.aoToi}" stroke-width="2.600" fill="none"/>
      </g>`,
  phuKienTren: () => '',
};
const AO_SUIT = 'M -32 27 Q 0 32 32 27 Q 30 0 27 -42 Q 28 -70 35 -88 Q 30 -97 20 -101 Q 10 -105 0 -105'
              + ' Q -10 -105 -20 -101 Q -30 -97 -35 -88 Q -28 -70 -27 -42 Q -30 0 -32 27 Z';
const OUTFIT_SUIT = {
  ...DO_BL,
  ao: () => AO_SUIT,
  suon: suonTu([[35, -88], [28, -70], [27, -42], [30, 0], [32, 27]]),
  damSuon: 0.45,
  coAo: (p, m) => `${DO_BL.coAo(p, m)}
        <path d="M -3 -99 H 3 L 4.500 -92 L 0 -72 L -4.500 -92 Z" fill="${m.caVat || m.phuKien || m.aoToi}" stroke="${m.vienNet}" stroke-width="0.800" stroke-linejoin="round"/>
        <path d="M -3.500 -103 H 3.500 L 3 -98 H -3 Z" fill="${m.caVat || m.phuKien || m.aoToi}" stroke="${m.vienNet}" stroke-width="0.800" stroke-linejoin="round"/>`,
  phuKien: (p, m) => `
      <g id="${p}-phuKien">
        <path d="M 0 -67 V 29" stroke="${m.vienNet}" stroke-width="1.200"/>
        ${[-44, -24].map((y) => `<circle cx="3.600" cy="${y}" r="2" fill="${m.cuc || m.aoToi}" stroke="${m.vienNet}" stroke-width="0.800"/>`).join('')}
        <path d="M 10 -62 h 12" stroke="${m.vienNet}" stroke-width="1.300" stroke-linecap="round"/>
        ${['L', 'R'].map((b) => { const g = b === 'L' ? -1 : 1; return `
        <path d="M ${g * 10} 2 H ${g * 26}" stroke="${m.vienNet}" stroke-width="1.300" stroke-linecap="round"/>`; }).join('')}
      </g>`,
  phuKienTren: () => '',
};
const KIT = {
  boDo: { doMo: DO_MO, aoDauChan: DO_DD, aoBlouse: DO_BL, plainCoat: DO_BL_PLAIN, tee: OUTFIT_TEE, shirt: OUTFIT_SHIRT,
          dress: OUTFIT_DRESS, hoodie: OUTFIT_HOODIE, suit: OUTFIT_SUIT },
  AO: { doMo: AO_MO, aoDauChan: AO_DD, aoBlouse: AO_BL },
  suonTu, vaiCo, giayKin, theTen, dauChan, ongNgheVatCo,
};
function dungDau(goc) {
  const m0 = goc.mau;
  const surgeon = {
    ...goc, ...DO_MO,
    ten: 'Bác sĩ nam — đồ mổ',
    coDau: 1.3, dauLech: 10, coThan: 0.97, coChan: 0.76,
    daiCanhTay: 1.05, daiCangTay: 0.8, dayTay: 0.85, coBanTay: 1.05,
    daiDui: 1.25, daiOng: 1.2, dayChan: 1.05, cachChan: 15, coBanChan: 1.05,
    may: { dai: 11.5, day: 4.4, cong: 1.2, thon: 0.3, xech: 2 },
    nghi: { batL: 10, batR: 10, cangL: -13, cangR: -13, cuoi: 0.8, mieng: 0.1, mayL: 0.1, mayR: 0.1 },
    khuon: { rong: 50, cao: 54, cam: 52, yRong: -8, tranVuong: 0.08, hamVuong: 0.08, rongTran: 1.09, rongCam: 1.07 },
    matX: 20, matY: 3, mayY: -15, maX: 32, maY: 26, miengY: 29,
    moiRong: 1.3, taiX: 51, maRong: 8, miengRong: 1.35, tocLech: 4, netLech: 13,
    mau: { ...m0, da: '#eabf9c', daToi: '#cf9b78', toc: '#241f1b', tocSang: '#4b4139',
           ma: '#e0968a', mat: '#33210f',
           ao: '#2f9e8f', aoToi: '#237a6e', quan: '#2f9e8f', giay: '#f1f3f5', phuKien: '#1f5f8f', vienNet: '#12403a',
           mu: '#237a6e', muSang: '#4fb8a9' },
    toc: (p, m) => `
              <g id="${p}-tocSau" fill="${m.toc}">
                <path d="M -44 6 Q -50 -30 -28 -50 Q -4 -60 14 -54 L 14 -32 Q -8 -38 -22 -24 Q -33 -12 -33 6 Z"/>
              </g>
              <g id="${p}-tocTruoc" fill="${m.toc}">
                <path d="M -51 2 Q -55 -40 -20 -56 Q 16 -68 42 -46 Q 54 -34 51 2 Q 45 -24 22 -33 Q 2 -39 -16 -31 Q -36 -22 -51 2 Z"/>
                <path d="M -50 0 Q -52 12 -47 22 Q -42 10 -43 -6 Z"/>
                <path d="M 50 0 Q 52 12 47 22 Q 42 10 43 -6 Z"/>
                <path d="M -30 -46 Q -6 -56 16 -50" stroke="${m.tocSang}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".75"/>
                <path d="M 24 -42 Q 38 -36 45 -26" stroke="${m.tocSang}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".6"/>
              </g>`,
    mu: (p, m) => `
                <path d="M -53 -14 Q -58 -64 0 -66 Q 58 -64 53 -14 Q 30 -30 0 -30 Q -30 -30 -53 -14 Z" fill="${m.mu}"/>
                <path d="M -53 -14 Q -30 -30 0 -30 Q 30 -30 53 -14 L 52 -21 Q 30 -37 0 -37 Q -30 -37 -52.500 -21 Z" fill="${m.muSang}"/>
                <path d="M -30 -56 Q -6 -63 14 -58" stroke="${m.muSang}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`,
    mat: (p, ben, m) => `
            <g id="${p}-mat${ben}">
              <ellipse rx="9.5" ry="10.5" fill="#fff"/>
              <g id="${p}-nguoi${ben}">
                <circle r="7.2" cy="0.4" fill="${m.mat}"/>
                <circle r="4" cy="1.6" fill="#17110c"/>
                <circle cx="-2.6" cy="-3.2" r="2.6" fill="#fff"/>
              </g>
              <path d="M -9.5 -4 Q 0 -12.5 9.5 -4" stroke="#17110c" stroke-width="2.8" fill="none" stroke-linecap="round"/>
            </g>`,
    mui: (m) => `<path d="M -2 6 q -4 5 2 6" stroke="${m.daToi}" stroke-width="1.8" stroke-linecap="round" fill="none"/>`,
  };
  const nurse = {
    ...goc, ...DO_DD,
    ten: 'Điều dưỡng — áo dấu chân',
    coDau: 1.42, dauLech: 9, coThan: 0.92, coChan: 0.68,
    daiCanhTay: 1, daiCangTay: 0.7, dayTay: 0.75, coBanTay: 1,
    daiDui: 1.3, daiOng: 1.2, dayChan: 1, cachChan: 14, coBanChan: 1,
    may: { dai: 10, day: 2.8, cong: 3.2, thon: 0.5, xech: -1 },
    nghi: { batL: 15, batR: 15, cangL: -9, cangR: -9, cuoi: 1, mieng: 0.45, mayL: 0.25, mayR: 0.25 },
    khuon: { rong: 48, cao: 56, cam: 57, yRong: -10, tranVuong: 0.06, hamVuong: -0.04, rongTran: 1.09, rongCam: 1.07 },
    matX: 20, matY: 2, mayY: -18, maX: 31, maY: 24, miengY: 30,
    moiRong: 1.2, taiX: 49, maRong: 11, miengRong: 1.4, tocLech: 5, netLech: 13,
    mau: { ...m0, toc: '#4d3122', tocSang: '#8a5c3a', ma: '#f3a2a2', mat: '#4a2e18',
           ao: '#ef9db0', aoToi: '#d97f95', quan: '#3d5a80', giay: '#f5f5f5', phuKien: '#d9506e', vienNet: '#7a3346' },
    toc: (p, m) => `
              <g id="${p}-tocSau" fill="${m.toc}">
                <path d="M -34 48 Q -62 -4 -44 -50 Q -10 -76 26 -60 L 30 -30 Q 2 -44 -14 -20 Q -26 2 -22 48 Z"/>
              </g>
              <g id="${p}-tocTruoc" fill="${m.toc}">
                <path d="M -34 -40 Q -68 -26 -76 6 Q -82 40 -64 58 Q -52 42 -58 16 Q -60 -8 -30 -20 Z"/>
                <path d="M -46 -26 Q -60 -18 -63 0" stroke="${m.tocSang}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".5"/>
                <path d="M -50 22 Q -60 -30 -26 -58 Q 0 -74 26 -58 Q 60 -30 50 22 Q 47 -6 41 -18 Q 22 -38 2 -32 Q -20 -38 -41 -18 Q -47 -6 -50 22 Z"/>
                <path d="M -30 -50 Q -6 -62 18 -52" stroke="${m.tocSang}" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".8"/>
                <path d="M -46 -14 Q -44 -32 -32 -44" stroke="${m.tocSang}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".6"/>
                <path d="M 40 -20 Q 46 -34 34 -46" stroke="${m.tocSang}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".55"/>
                <circle cx="-40" cy="-32" r="5" fill="${m.phuKien}"/>
              </g>`,
    mui: (m) => `<path d="M -1 8 q -3 4 1 5" stroke="${m.daToi}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
  };
  const doctor = {
    ...goc, ...DO_BL,
    ten: 'Bác sĩ đeo kính — áo blouse',
    coDau: 1.38, dauLech: 9, coThan: 0.94, coChan: 0.7,
    daiCanhTay: 1.05, daiCangTay: 0.72, dayTay: 0.72, coBanTay: 0.95,
    daiDui: 1.35, daiOng: 1.25, dayChan: 0.95, cachChan: 13.5, coBanChan: 1,
    may: { dai: 11, day: 3.2, cong: 1.2, thon: 0.5, xech: 3 },
    nghi: { batL: 17, batR: 17, cangL: -92, cangR: -92, cuoi: 0.9, mieng: 0.35, mayL: 0.1, mayR: 0.1 },
    khuon: { rong: 49, cao: 55, cam: 55, yRong: -8, tranVuong: 0.08, hamVuong: 0.02, rongTran: 1.08, rongCam: 1.07 },
    matX: 20, matY: 2, mayY: -19, maX: 32, maY: 25, miengY: 30,
    moiRong: 1.2, taiX: 50, maRong: 9, miengRong: 1.4, tocLech: 5, netLech: 13,
    mau: { ...m0, da: '#f2cdb0', daToi: '#d8a888', toc: '#33261e', tocSang: '#6b5140',
           ma: '#eda6a0', mat: '#2e1f14',
           ao: '#f6f7f9', aoToi: '#c9d0d9', quan: '#2b3f63', giay: '#22262e', phuKien: '#2b3f63', vienNet: '#5b6470',
           aoTrong: '#3f6ea8', ongNghe: '#8d3f4a' },
    toc: (p, m) => `
              <g id="${p}-tocSau" fill="${m.toc}">
                <path d="M -32 44 Q -58 -6 -42 -50 Q -8 -74 28 -60 L 32 -30 Q 4 -44 -12 -20 Q -24 2 -20 44 Z"/>
                <ellipse cx="-42" cy="30" rx="17" ry="14"/>
              </g>
              <g id="${p}-tocTruoc" fill="${m.toc}">
                <path d="M -50 18 Q -58 -32 -24 -58 Q 4 -72 30 -56 Q 58 -34 50 18 Q 48 -10 43 -22 Q 30 -40 4 -36 Q -22 -30 -40 -14 Q -47 -2 -50 18 Z"/>
                <path d="M -22 -52 Q 4 -60 24 -50" stroke="${m.tocSang}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>
                <path d="M -44 -8 Q -40 -26 -26 -38" stroke="${m.tocSang}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".55"/>
              </g>`,
    mui: (m) => `<path d="M -1 9 q -3 4 2 5" stroke="${m.daToi}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
    net: (p, m) => `
            <g id="${p}-kinh" fill="none" stroke="${m.phuKien}" stroke-width="2.4" stroke-linejoin="round">
              <rect x="-34" y="-11" width="28" height="26" rx="10" fill="#ffffff" fill-opacity=".16"/>
              <rect x="6" y="-11" width="28" height="26" rx="10" fill="#ffffff" fill-opacity=".16"/>
              <path d="M -6 -2 Q 0 -7 6 -2"/>
              <path d="M -34 -4 L -48 -7" stroke-linecap="round"/>
              <path d="M 34 -4 L 48 -7" stroke-linecap="round"/>
            </g>`,
  };
  return { surgeon, nurse, doctor };
}
function dangKyDau(RigSVG, gocTen = 'vet') {
  const goc = RigSVG.NHAN_VAT[gocTen];
  if (!goc) throw new Error(`[characters] không có nhân vật gốc "${gocTen}"`);
  const ds = dungDau(goc);
  for (const [k, v] of Object.entries(ds)) RigSVG.dangKy(k, v);
  return Object.keys(ds);
}
return { KIT, dungDau, dangKyDau };
})();
__m['runtime/props.js'] = (function () {
const PROP_FRAME = { w: 400, h: 470, floor: 458, centre: 200 };
const SEAT_DEFAULT = 372;                      // cao độ mặt ghế khớp nhân vật có sẵn khi không đưa `for`
const shade = (hex, amount) => {               // tối đi (amount < 0) hoặc sáng lên một màu #rrggbb
  const n = parseInt(hex.slice(1), 16), mix = (v) => Math.max(0, Math.min(255, Math.round(v + (amount < 0 ? v : 255 - v) * amount)));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => mix(v).toString(16).padStart(2, '0')).join('');
};
const DRAW = {
  stool: ({ seat, w = 84, color, dark, line }) => {
    const F = PROP_FRAME.floor, x0 = 200 - w / 2, x1 = 200 + w / 2;
    return `
    <path d="M ${x0 + 12} ${seat + 8} L ${x0 + 2} ${F} M ${x1 - 12} ${seat + 8} L ${x1 - 2} ${F}" stroke="${dark}" stroke-width="7" stroke-linecap="round"/>
    <path d="M ${x0 + 9} ${seat + (F - seat) * 0.6} H ${x1 - 9}" stroke="${dark}" stroke-width="4.500" stroke-linecap="round"/>
    <rect x="${x0}" y="${seat}" width="${w}" height="13" rx="6.500" fill="${color}" stroke="${line}" stroke-width="1.400"/>`;
  },
  chair: ({ seat, w = 108, back = 92, color, dark, line }) => {
    const F = PROP_FRAME.floor, x0 = 200 - w / 2, x1 = 200 + w / 2;
    return `
    <rect x="${x0 + 4}" y="${seat - back}" width="${w - 8}" height="${back + 6}" rx="12" fill="${dark}" stroke="${line}" stroke-width="1.400"/>
    <path d="M ${x0 + 9} ${seat + 10} V ${F} M ${x1 - 9} ${seat + 10} V ${F}" stroke="${dark}" stroke-width="8" stroke-linecap="round"/>
    <rect x="${x0}" y="${seat}" width="${w}" height="15" rx="6" fill="${color}" stroke="${line}" stroke-width="1.400"/>`;
  },
  table: ({ w = 230, height = 150, color, dark, line }) => {
    const F = PROP_FRAME.floor, top = F - height, x0 = 200 - w / 2, x1 = 200 + w / 2;
    return `
    <path d="M ${x0 + 18} ${top + 10} V ${F} M ${x1 - 18} ${top + 10} V ${F}" stroke="${dark}" stroke-width="10" stroke-linecap="round"/>
    <rect x="${x0}" y="${top}" width="${w}" height="14" rx="5" fill="${color}" stroke="${line}" stroke-width="1.400"/>`;
  },
  counter: ({ w = 300, height = 150, color, dark, line }) => {
    const F = PROP_FRAME.floor, top = F - height, x0 = 200 - w / 2;
    return `
    <rect x="${x0 + 6}" y="${top + 8}" width="${w - 12}" height="${height - 8}" fill="${dark}" stroke="${line}" stroke-width="1.400"/>
    <path d="M ${x0 + 6 + (w - 12) / 3} ${top + 16} V ${F - 6} M ${x0 + 6 + (w - 12) * 2 / 3} ${top + 16} V ${F - 6}" stroke="${line}" stroke-width="1.200" opacity=".45"/>
    <rect x="${x0}" y="${top}" width="${w}" height="13" rx="4" fill="${color}" stroke="${line}" stroke-width="1.400"/>`;
  },
};
const PROP_KINDS = Object.keys(DRAW);
function createProp(host, kind, options = {}) {
  if (!DRAW[kind]) throw new Error(`[character] no prop "${kind}" (available: ${PROP_KINDS.join(', ')})`);
  const { color = '#8a6245', width, height, back } = options;
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error(`[character] prop "${kind}": color must be #rrggbb, got ${JSON.stringify(color)}`);
  for (const [name, value] of Object.entries({ width, height, back }))
    if (value !== undefined && !(typeof value === 'number' && value > 0)) throw new Error(`[character] prop "${kind}": ${name} must be a positive number (frame units), got ${JSON.stringify(value)}`);
  const sitter = options.for;
  if (sitter !== undefined && typeof (sitter && sitter.seatY) !== 'function') throw new Error(`[character] prop "${kind}": \`for\` must be a person rig (createCharacter(...).rig)`);
  const seat = sitter ? sitter.seatY() : SEAT_DEFAULT;
  const o = { seat, color, dark: shade(color, -0.28), line: shade(color, -0.55) };
  if (width !== undefined) o.w = width;
  if (height !== undefined) o.height = height;
  if (back !== undefined) o.back = back;
  host.style.aspectRatio = `${PROP_FRAME.w}/${PROP_FRAME.h}`;
  host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PROP_FRAME.w} ${PROP_FRAME.h}" width="100%" height="100%" style="display:block;overflow:visible" data-prop="${kind}">${DRAW[kind](o)}
  </svg>`;
  return { svg: host.firstElementChild, kind, seatY: seat };
}
return { PROP_FRAME, PROP_KINDS, createProp };
})();
__m['runtime/bodies.js'] = (function () {
const child = {
  headSize: 1.62, neckDrop: 15, torsoScale: 0.8, legScale: 0.5,
  upperArmLength: 0.8, forearmLength: 0.62, armThickness: 0.9, handSize: 0.92,
  thighLength: 1.15, shinLength: 1.1, legThickness: 1.1, legGap: 12, footSize: 0.95,
  hostScale: 0.75,
};
const teen = {
  headSize: 1.46, neckDrop: 10, torsoScale: 0.88, legScale: 0.64,
  upperArmLength: 0.98, forearmLength: 0.7, armThickness: 0.7, handSize: 0.95,
  thighLength: 1.3, shinLength: 1.22, legThickness: 0.92, legGap: 13, footSize: 1,
  hostScale: 0.84,
};
const adult = {
  headSize: 1.37, neckDrop: 9, torsoScale: 0.94, legScale: 0.68,
  upperArmLength: 1.09, forearmLength: 0.7, armThickness: 0.68, handSize: 0.95,
  thighLength: 1.4, shinLength: 1.25, legThickness: 1, legGap: 14, footSize: 1,
  hostScale: 1,
};
const tall = {
  headSize: 1.2, neckDrop: 5, torsoScale: 0.96, legScale: 0.86,
  upperArmLength: 1.08, forearmLength: 0.84, armThickness: 0.72, handSize: 0.95,
  thighLength: 1.3, shinLength: 1.25, legThickness: 0.95, legGap: 14, footSize: 1,
  hostScale: 1.08,
};
const stocky = {
  headSize: 1.34, neckDrop: 15, torsoScale: 1.08, torsoWidth: 1.28, legScale: 0.64,
  upperArmLength: 1.0, forearmLength: 0.7, armThickness: 1.05, handSize: 1.08,
  thighLength: 1.3, shinLength: 1.2, legThickness: 1.4, legGap: 17, footSize: 1.1,
  hostScale: 1,
};
return { child, teen, adult, tall, stocky };
})();
__m['runtime/hair.js'] = (function () {
const shine = (c, d, width = 3, opacity = 0.7) =>
  (c.hairHighlight ? `<path d="${d}" stroke="${c.hairHighlight}" stroke-width="${width}" fill="none" stroke-linecap="round" opacity="${opacity}"/>` : '');
const group = (p, c, body, mirror = false) => `
              <g id="${p}-hair-front" fill="${c.hair}"${mirror ? ' transform="scale(-1 1)"' : ''}>${body}
              </g>`;
const tieColor = (c, tie) => tie || c.accent || c.hairHighlight || c.hair;
const crop = () => (p, c) => group(p, c, `
                <path d="M -51 2 Q -55 -40 -20 -56 Q 16 -68 42 -46 Q 54 -34 51 2 Q 45 -24 22 -33 Q 2 -39 -16 -31 Q -36 -22 -51 2 Z"/>
                <path d="M -50 0 Q -52 12 -47 22 Q -42 10 -43 -6 Z"/>
                <path d="M 50 0 Q 52 12 47 22 Q 42 10 43 -6 Z"/>
                ${shine(c, 'M -30 -46 Q -6 -56 16 -50')}${shine(c, 'M 24 -42 Q 38 -36 45 -26', 2.2, 0.6)}`);
const sidePart = ({ side = 'left' } = {}) => (p, c) => group(p, c, `
                <path d="M -50 18 Q -58 -32 -24 -58 Q 4 -72 30 -56 Q 58 -34 50 18 Q 48 -10 43 -22 Q 30 -40 4 -36 Q -22 -30 -40 -14 Q -47 -2 -50 18 Z"/>
                ${shine(c, 'M -22 -52 Q 4 -60 24 -50')}${shine(c, 'M -44 -8 Q -40 -26 -26 -38', 2.4, 0.55)}`, side === 'right');
const bob = () => (p, c) => group(p, c, `
                <path d="M -53 31 Q -64 -34 -28 -61 Q 0 -75 28 -61 Q 64 -34 53 31 Q 45 36 40 27 Q 46 -8 31 -25 Q 12 -39 -4 -33 Q -29 -30 -40 -14 Q -45 6 -40 27 Q -45 36 -53 31 Z"/>
                ${shine(c, 'M -28 -52 Q -4 -63 20 -54', 3.2, 0.8)}${shine(c, 'M -48 4 Q -50 -18 -38 -36', 2.4, 0.6)}`);
const long = ({ length = 0.5 } = {}) => (p, c) => {
  const end = 62 + Math.max(0, Math.min(1, length)) * 44;
  return group(p, c, `
                <path d="M -55 ${end} Q -72 -30 -30 -62 Q 0 -77 30 -62 Q 72 -30 55 ${end} Q 45 ${end + 5} 37 ${end - 6} Q 47 20 43 -6 Q 36 -26 14 -34 Q -6 -38 -20 -30 Q -40 -22 -43 -4 Q -47 22 -37 ${end - 6} Q -45 ${end + 5} -55 ${end} Z"/>
                ${shine(c, 'M -28 -53 Q -2 -65 22 -55', 3.2, 0.8)}${shine(c, 'M -52 30 Q -58 -6 -44 -34', 2.4, 0.55)}${shine(c, 'M 52 34 Q 56 6 48 -18', 2.2, 0.45)}`);
};
const ponytail = ({ side = 'left', tie = null } = {}) => (p, c) => group(p, c, `
                <g id="${p}-hair-bun">
                  <path d="M -34 -40 Q -68 -26 -76 6 Q -82 40 -64 58 Q -52 42 -58 16 Q -60 -8 -30 -20 Z"/>
                  ${shine(c, 'M -46 -26 Q -60 -18 -63 0', 2.6, 0.5)}
                </g>
                <path d="M -50 22 Q -60 -30 -26 -58 Q 0 -74 26 -58 Q 60 -30 50 22 Q 47 -6 41 -18 Q 22 -38 2 -32 Q -20 -38 -41 -18 Q -47 -6 -50 22 Z"/>
                ${shine(c, 'M -30 -50 Q -6 -62 18 -52', 3.2, 0.8)}${shine(c, 'M -46 -14 Q -44 -32 -32 -44', 2.4, 0.6)}
                <circle cx="-40" cy="-32" r="5" fill="${tieColor(c, tie)}"/>`, side === 'right');
const bun = ({ size = 1 } = {}) => (p, c) => group(p, c, `
                <g id="${p}-hair-bun">
                  <ellipse cx="2" cy="${-58 - 18 * size}" rx="${26 * size}" ry="${19 * size}"/>
                  ${shine(c, `M ${-14 * size} ${-58 - 30 * size} Q -2 ${-58 - 38 * size} ${14 * size} ${-58 - 32 * size}`, 3.4, 0.9)}
                </g>
                <path d="M -50 34 Q -66 -28 -32 -68 Q 0 -84 32 -68 Q 66 -28 50 34 Q 50 22 47 8 Q 48 -34 0 -42 Q -48 -34 -47 8 Q -50 22 -50 34 Z"/>
                ${shine(c, 'M -42 -44 Q -28 -60 -8 -62', 3.6, 0.9)}${shine(c, 'M 16 -62 Q 34 -56 42 -44', 2.8, 0.7)}`);
const pigtails = ({ tie = null } = {}) => (p, c) => group(p, c, `
                <path d="M -50 -8 Q -74 -4 -72 26 Q -70 46 -58 52 Q -50 34 -52 14 Z"/>
                <path d="M 50 -8 Q 74 -4 72 26 Q 70 46 58 52 Q 50 34 52 14 Z"/>
                <path d="M -50 20 Q -60 -30 -26 -58 Q 0 -74 26 -58 Q 60 -30 50 20 Q 47 -8 40 -20 Q 22 -34 0 -44 Q -22 -34 -40 -20 Q -47 -8 -50 20 Z"/>
                ${shine(c, 'M -30 -50 Q -14 -60 -2 -60', 3, 0.8)}${shine(c, 'M 8 -60 Q 24 -56 34 -46', 2.6, 0.6)}
                <circle cx="-52" cy="-4" r="4.500" fill="${tieColor(c, tie)}"/><circle cx="52" cy="-4" r="4.500" fill="${tieColor(c, tie)}"/>`);
const curly = ({ volume = 1 } = {}) => (p, c) => {
  volume = Math.max(0.7, Math.min(1.4, volume));
  const r = 15 * volume, curls = [];
  const reach = (46 + r) / 61;
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * (1.08 - i * 0.145);
    curls.push(`<circle cx="${(52 * Math.cos(a)).toFixed(1)}" cy="${(-12 - 46 * Math.sin(a)).toFixed(1)}" r="${(r + (i % 2) * 1.5).toFixed(1)}"/>`);
  }
  for (let i = 0; i < 5; i++) curls.push(`<circle cx="${-32 + i * 16}" cy="${-34 - (i % 2) * 3}" r="${(10 * volume).toFixed(1)}"/>`);
  return group(p, c, `
                <path d="M -50 -4 Q -56 -54 0 -62 Q 56 -54 50 -4 Q 32 -32 0 -32 Q -32 -32 -50 -4 Z"/>
                ${curls.join('')}
                <g transform="translate(0 -12) scale(${reach.toFixed(3)}) translate(0 12)">${shine(c, 'M -30 -62 Q -22 -70 -12 -66', 2.6, 0.6)}${shine(c, 'M 6 -68 Q 16 -74 26 -66', 2.6, 0.6)}${shine(c, 'M -52 -28 Q -50 -38 -42 -42', 2.4, 0.5)}</g>`);
};
const spiky = () => (p, c) => group(p, c, `
                <path d="M -50 0 Q -55 -28 -45 -44 L -43 -62 L -30 -54 L -22 -73 L -9 -59 L 2 -78 L 12 -59 L 25 -71 L 31 -54 L 44 -61 L 45 -43 Q 55 -28 50 0 Q 45 -22 28 -30 Q 8 -36 -12 -30 Q -34 -24 -50 0 Z"/>
                ${shine(c, 'M -20 -62 L -14 -50', 2.6, 0.6)}${shine(c, 'M 4 -66 L 8 -52', 2.6, 0.6)}${shine(c, 'M 26 -60 L 28 -48', 2.4, 0.5)}`);
const tufts = () => (p, c) => group(p, c, `
                <path d="M -50 -22 Q -60 -12 -58 6 Q -57 18 -50 22 Q -46 6 -47 -8 Q -46 -18 -50 -22 Z"/>
                <path d="M 50 -22 Q 60 -12 58 6 Q 57 18 50 22 Q 46 6 47 -8 Q 46 -18 50 -22 Z"/>`);
const bald = () => (p, c) => group(p, c, '');
return { crop, sidePart, bob, long, ponytail, bun, pigtails, curly, spiky, tufts, bald };
})();
__m['runtime/parts.js'] = (function () {
function roundGlasses(c, { x = 20, y = 2, r = 12, color = null, width = 2.4 } = {}) {
  const stroke = color || c.accent || c.lineStroke;
  return `
            <g fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round">
              <circle cx="${-x}" cy="${y}" r="${r}" fill="#ffffff" fill-opacity=".14"/>
              <circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" fill-opacity=".14"/>
              <path d="M ${-x + r} ${y - 2} Q 0 ${y - 7} ${x - r} ${y - 2}"/>
              <path d="M ${-x - r} ${y - 2} L -47 ${y - 6} M ${x + r} ${y - 2} L 47 ${y - 6}"/>
            </g>`;
}
function shortBeard(c, { color = null, chin = 54, mouthY = 30, width = 43 } = {}) {
  const fill = color || c.hair;
  return `
            <path fill="${fill}" d="M ${-width} 10 Q ${-width - 2} ${chin - 12} ${-width * 0.55} ${chin - 1} Q 0 ${chin + 6} ${width * 0.55} ${chin - 1}
              Q ${width + 2} ${chin - 12} ${width} 10 Q ${width - 5} ${mouthY - 8} ${width * 0.42} ${mouthY - 9}
              Q 0 ${mouthY - 13} ${-width * 0.42} ${mouthY - 9} Q ${-width + 5} ${mouthY - 8} ${-width} 10 Z"/>
            <path fill="${c.skin}" d="M -13 ${mouthY - 5} Q 0 ${mouthY - 9} 13 ${mouthY - 5} Q 14 ${mouthY + 7} 0 ${mouthY + 9} Q -14 ${mouthY + 7} -13 ${mouthY - 5} Z"/>`;
}
function moustache(c, { color = null, mouthY = 30, width = 17 } = {}) {
  const fill = color || c.hair;
  return `
            <path fill="${fill}" d="M 0 ${mouthY - 9} Q ${-width * 0.5} ${mouthY - 13} ${-width} ${mouthY - 5} Q ${-width * 0.55} ${mouthY - 3.5} 0 ${mouthY - 5.5}
              Q ${width * 0.55} ${mouthY - 3.5} ${width} ${mouthY - 5} Q ${width * 0.5} ${mouthY - 13} 0 ${mouthY - 9} Z"/>`;
}
const lineOf = (c) => c.lineStroke || c.topShadow || '#3a3f4a';
function wrinkles(c, { color = null, eyeX = 20, eyeY = 2, mouthY = 30, forehead = true } = {}) {
  const stroke = color || c.skinShadow || '#c9987a';
  return `
            <g fill="none" stroke="${stroke}" stroke-width="1.3" stroke-linecap="round" opacity=".8">
              ${[-1, 1].map((g) => `
              <path d="M ${g * (eyeX + 15)} ${eyeY - 3} l ${g * 5} -3 M ${g * (eyeX + 16)} ${eyeY + 2} l ${g * 5.500} 1"/>
              <path d="M ${g * 15} ${mouthY - 14} Q ${g * 21} ${mouthY - 5} ${g * 18} ${mouthY + 3}"/>`).join('')}
              ${forehead ? `<path d="M -15 ${eyeY - 31} Q 0 ${eyeY - 34} 15 ${eyeY - 31} M -11 ${eyeY - 25} Q 0 ${eyeY - 27.500} 11 ${eyeY - 25}"/>` : ''}
            </g>`;
}
function apronBib(c, { color = null, top = -70, width = 16, waist = 14 } = {}) {
  const fill = color || c.skirt || c.accent || c.topShadow, line = lineOf(c);
  return `
        <path d="M ${-width + 2} ${top} Q ${-(width + 11) / 2} ${(top - 103) / 2 + 2} -9 -103 M ${width - 2} ${top} Q ${(width + 11) / 2} ${(top - 103) / 2 + 2} 9 -103" stroke="${fill}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M ${-width} ${top} H ${width} L ${width + 9} ${waist - 18} V ${waist} H ${-width - 9} V ${waist - 18} Z" fill="${fill}" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>
        <path d="M -9 ${top + 22} h 18 v 12 q 0 3 -3 3 h -12 q -3 0 -3 -3 z" fill="none" stroke="${line}" stroke-width="1.100" stroke-linejoin="round" opacity=".7"/>`;
}
function cup(c, { color = '#f4efe6', lid = '#4a3b33', sleeve = '#b9834f', size = 1.3 } = {}) {
  const line = lineOf(c);
  return `
        <g transform="translate(0 12) rotate(90) scale(${size})">
          <path d="M -8.500 -17 L -6.500 13 Q 0 15 6.500 13 L 8.500 -17 Z" fill="${color}" stroke="${line}" stroke-width="1.100" stroke-linejoin="round"/>
          <path d="M -8 -7 L -7.200 5 Q 0 7 7.200 5 L 8 -7 Q 0 -5 -8 -7 Z" fill="${sleeve}"/>
          <path d="M -10 -21 h 20 v 4 h -20 z" fill="${lid}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>
        </g>`;
}
function clipboard(c, { color = '#b9834f', paper = '#ffffff' } = {}) {
  const line = lineOf(c);
  return `
        <g transform="translate(2 10) rotate(90)">
          <rect x="-15" y="-34" width="30" height="40" rx="2.500" fill="${color}" stroke="${line}" stroke-width="1.100"/>
          <rect x="-12" y="-29" width="24" height="32" fill="${paper}"/>
          <path d="M -8 -21 h 16 M -8 -15 h 16 M -8 -9 h 11" stroke="${line}" stroke-width="1.200" stroke-linecap="round" opacity=".45"/>
          <rect x="-6" y="-37" width="12" height="6" rx="2" fill="#aeb6c0" stroke="${line}" stroke-width="1"/>
        </g>`;
}
function phone(c, { color = '#22262e', screen = '#8fd3ff' } = {}) {
  return `
        <g transform="translate(0 10) rotate(90)">
          <rect x="-7.500" y="-19" width="15" height="28" rx="3" fill="${color}"/>
          <rect x="-5.800" y="-16.500" width="11.600" height="21" rx="1.500" fill="${screen}"/>
        </g>`;
}
return { roundGlasses, shortBeard, moustache, wrinkles, apronBib, cup, clipboard, phone };
})();
__m['runtime/schema.js'] = (function () {
const DEFINITION_KEYS = {
  name: 'ten', colors: 'mau', restPose: 'nghi',
  hair: 'toc', hat: 'mu', eye: 'mat', nose: 'mui', faceExtras: 'net', beard: 'beard',
  top: 'ao', sideShading: 'suon', sideShadingOpacity: 'damSuon', collar: 'coAo',
  accessories: 'phuKien', shoulderAccessories: 'phuKienTren', shoes: 'giay',
  longSleeves: 'tayDai', backSkullColor: 'mauSoSau', backHair: 'backHair', stoop: 'stoop', skirt: 'skirt',
  heldItemL: 'heldItemL', heldItemR: 'heldItemR', badgeText: 'huyHieu', extrasFollowEyes: 'netTheoMat',
  outlineWidth: 'vienRong',
  headSize: 'coDau', neckDrop: 'dauLech', torsoScale: 'coThan', legScale: 'coChan', torsoWidth: 'torsoWidth',
  upperArmLength: 'daiCanhTay', forearmLength: 'daiCangTay', armThickness: 'dayTay', handSize: 'coBanTay',
  thighLength: 'daiDui', shinLength: 'daiOng', legThickness: 'dayChan', legGap: 'cachChan', footSize: 'coBanChan',
  sleeveLength: 'daiTayAo', sleeveSlant: 'xeoTayAo', sleeveFlare: 'rongTayAo', sleeveHemWidth: 'vienGau',
  sleeveCornerRadius: 'boGocTayAo', sleeveHemColor: 'mauGau', sleeveHemDash: 'netGau', sleeveHemInset: 'lechGau',
  faceShape: 'khuon', brows: 'may', browSpacing: 'mayX', browY: 'mayY',
  eyeSpacing: 'matX', eyeY: 'matY', eyeSize: 'matCo', noseOffsetY: 'muiY', noseSize: 'muiCo',
  mouthY: 'miengY', mouthWidth: 'miengRong', lipWidth: 'moiRong',
  cheekX: 'maX', cheekY: 'maY', cheekRadius: 'maRong', earX: 'taiX',
  featureTurnShift: 'netLech', hairTurnShift: 'tocLech', bunTurnShift: 'buiLech',
};
const FACE_SHAPE_KEYS = {
  halfWidth: 'rong', crownHeight: 'cao', chinLength: 'cam', widestY: 'yRong',
  foreheadSquareness: 'tranVuong', jawSquareness: 'hamVuong', foreheadWidth: 'rongTran', chinWidth: 'rongCam',
};
const BROW_KEYS = { halfLength: 'dai', thickness: 'day', arch: 'cong', taper: 'thon', slant: 'xech' };
const COLOR_KEYS = {
  skin: 'da', skinShadow: 'daToi', hair: 'toc', hairHighlight: 'tocSang',
  top: 'ao', topShadow: 'aoToi', trousers: 'quan', shoes: 'giay',
  iris: 'mat', lips: 'mieng', cheeks: 'ma', accent: 'phuKien',
  outline: 'vien', lineStroke: 'vienNet', brows: 'may', mouthInside: 'miengToi', tongue: 'luoi', teeth: 'rang',
  hat: 'mu', hatHighlight: 'muSang', innerShirt: 'aoTrong', stethoscope: 'ongNghe',
  buttons: 'cuc', tie: 'caVat', drawstrings: 'day',          // `skirt` (màu váy / tạp dề) đi qua nguyên vẹn
  fur: 'long', furLight: 'longSang', furDark: 'longToi', stripes: 'dom', nose: 'mui',
  collar: 'vongCo', tag: 'the', earInner: 'taiTrong',
};
const PERSON_STATE_KEYS = {
  x: 'x', y: 'y', opacity: 'mo', scale: 'co', facing: 'huong',
  lean: 'than', breath: 'tho', shoulders: 'vai',
  headTilt: 'dau', headX: 'dauX', headY: 'dauY',
  upperArmL: 'batL', upperArmR: 'batR', forearmL: 'cangL', forearmR: 'cangR', armSwingL: 'vungL', armSwingR: 'vungR',
  thighL: 'duiL', thighR: 'duiR', shinL: 'ongL', shinR: 'ongR', kneeLiftL: 'nhacL', kneeLiftR: 'nhacR', seat: 'seat',
  eyesClosed: 'matY', lookX: 'nhinX', lookY: 'nhinY', browL: 'mayL', browR: 'mayR',
  mouthOpen: 'mieng', pucker: 'chum', smile: 'cuoi', handL: 'tayL', handR: 'tayR', itemL: 'itemL', itemR: 'itemR',
};
const PET_STATE_KEYS = {
  x: 'x', y: 'y', opacity: 'mo', scale: 'co', facing: 'huong',
  sit: 'ngoi', breath: 'tho', chestX: 'truocX', chestY: 'truocY', hipX: 'sauX', hipY: 'sauY',
  arch: 'cong', puff: 'xu', headTilt: 'dau', headX: 'dauX', headY: 'dauY', earL: 'taiL', earR: 'taiR',
  eyesClosed: 'matY', lookX: 'nhinX', lookY: 'nhinY', pupil: 'dongTu',
  mouthOpen: 'mieng', tongue: 'luoi', smile: 'cuoi', tail: 'duoi', tailCurl: 'duoiCong',
};
const HAND_SHAPES = { relaxed: 'mo', fist: 'nam', thumb: 'cai', point: 'chi' };
const pick = (table, names) => Object.fromEntries(names.map((n) => [n, table[n]]));
const CONFIG_GROUPS = {
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
const PET_SHAPE_KEYS = ['headSize', 'bodyLength', 'bodyThickness', 'legLength', 'tailLength', 'tailCurl', 'earSize'];
const REQUIRED_IDS = [
  ['hair-front', 'tocTruoc'], ['hair-bun', 'tocBui'],
  ['eye-L', 'matL'], ['eye-R', 'matR'], ['pupil-L', 'nguoiL'], ['pupil-R', 'nguoiR'],
  ['accessories', 'phuKien'], ['shoe-L', 'banL'], ['shoe-R', 'banR'],
];
const invert = (table) => Object.fromEntries(Object.entries(table).map(([pub, internal]) => [internal, pub]));
const INTERNAL = {
  definition: invert(DEFINITION_KEYS), faceShape: invert(FACE_SHAPE_KEYS), brows: invert(BROW_KEYS),
  colors: invert(COLOR_KEYS), personState: invert(PERSON_STATE_KEYS), petState: invert(PET_STATE_KEYS),
  hands: invert(HAND_SHAPES),
};
const renameKeys = (object, table) => (object && typeof object === 'object' && !Array.isArray(object)
  ? Object.fromEntries(Object.entries(object).map(([k, v]) => [table[k] || k, v])) : object);
const colorsToInternal = (colors) => renameKeys(colors, COLOR_KEYS);
const colorsToPublic = (colors) => renameKeys(colors, INTERNAL.colors);
const handToInternal = (v) => HAND_SHAPES[v] || v;
const handToPublic = (v) => INTERNAL.hands[v] || v;
function stateToInternal(state, pet = false) {
  const out = renameKeys(state, pet ? PET_STATE_KEYS : PERSON_STATE_KEYS);
  if (out && !pet) for (const k of ['tayL', 'tayR']) if (k in out) out[k] = handToInternal(out[k]);
  return out;
}
function stateToPublic(state, pet = false) {
  const out = renameKeys(state, pet ? INTERNAL.petState : INTERNAL.personState);
  if (out && !pet) for (const k of ['handL', 'handR']) if (k in out) out[k] = handToPublic(out[k]);
  return out;
}
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
const DRAWING_SLOTS = ['toc', 'mu', 'mat', 'mui', 'net', 'beard', 'coAo', 'phuKien', 'phuKienTren', 'giay', 'heldItemL', 'heldItemR'];
function definitionToInternal(definition) {
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
function definitionToPublic(definition) {
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
function configToInternal(config, pet = false) {
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
function configToPublic(config, pet = false) {
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
return { DEFINITION_KEYS, FACE_SHAPE_KEYS, BROW_KEYS, COLOR_KEYS, PERSON_STATE_KEYS, PET_STATE_KEYS, HAND_SHAPES, CONFIG_GROUPS, PET_SHAPE_KEYS, REQUIRED_IDS, colorsToInternal, colorsToPublic, stateToInternal, stateToPublic, DRAWING_SLOTS, definitionToInternal, definitionToPublic, configToInternal, configToPublic };
})();
__m['characters/receptionist.js'] = (function () {
const __default = {
  id: 'receptionist',
  base: 'nurse',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.coat,                       // long-sleeved top with lapels, used as a blazer
    name: 'Receptionist',
    restPose: { upperArmL: 17, upperArmR: 17, forearmL: -92, forearmR: -92, smile: 1, mouthOpen: 0.4, browL: 0.2, browR: 0.2 },
    colors: {
      ...base.colors,
      hair: '#2a2024', hairHighlight: '#55464c',
      top: '#2f4b7c', topShadow: '#223a63', lineStroke: '#16233d', innerShirt: '#f6f7f9',
      trousers: '#2f4b7c', shoes: '#22262e', accent: '#d6453d',
    },
    hair: (p, c) => `
              <g id="${p}-hair-front" fill="${c.hair}">
                <path d="M -53 31 Q -64 -34 -28 -61 Q 0 -75 28 -61 Q 64 -34 53 31 Q 45 36 40 27 Q 46 -8 31 -25 Q 12 -39 -4 -33 Q -29 -30 -40 -14 Q -45 6 -40 27 Q -45 36 -53 31 Z"/>
                <path d="M -28 -52 Q -4 -63 20 -54" stroke="${c.hairHighlight}" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".8"/>
                <path d="M -48 4 Q -50 -18 -38 -36" stroke="${c.hairHighlight}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".6"/>
              </g>`,
    collar: (p, c) => `${kit.outfits.coat.collar(p, c)}
        <path d="M 0 -96.500 l -9.500 -4.500 v 9 z M 0 -96.500 l 9.500 -4.500 v 9 z" fill="${c.accent}" stroke="${c.lineStroke}" stroke-width="0.900" stroke-linejoin="round"/>
        <circle cx="0" cy="-96.500" r="2.300" fill="${c.accent}" stroke="${c.lineStroke}" stroke-width="0.900"/>`,
    accessories: (p, c) => `
      <g id="${p}-accessories">
        <path d="M 0 -67 V 40" stroke="${c.lineStroke}" stroke-width="1.200"/>
        ${[-44, -22].map((y) => `<circle cx="3.600" cy="${y}" r="2.200" fill="#e8c35a" stroke="${c.lineStroke}" stroke-width="0.800"/>`).join('')}
        <path d="M 9 -58 h 13 v 3 h -13 z" fill="${c.accent}"/>
        <path d="M 9 -55 h 13 v 11 h -13 z" fill="none" stroke="${c.lineStroke}" stroke-width="1.100" stroke-linejoin="round"/>
        ${kit.nameTag(-22.500, -58, c.accent, c.lineStroke)}
        ${['L', 'R'].map((side) => { const g = side === 'L' ? -1 : 1; return `
        <path d="M ${g * 10} 10 H ${g * 27.500}" stroke="${c.lineStroke}" stroke-width="1.200" stroke-linecap="round"/>`; }).join('')}
      </g>`,
    shoulderAccessories: () => '',
  }),
};
return { default: __default };
})();
__m['characters/barista.js'] = (function () {
const __default = {
  id: 'barista',
  base: 'nurse',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.tee,
    name: 'Barista',
    colors: {
      ...base.colors,
      hair: '#4a2f22', hairHighlight: '#7a5038',
      top: '#f2ede4', topShadow: '#d9d2c4', lineStroke: '#8d8474',
      trousers: '#3b3f4a', shoes: '#f4f4f2', skirt: '#5b7a4a', accent: '#c8643c',
    },
    skirt: { kind: 'apron', length: 0.9, flare: 2 },
    accessories: (p, c) => `
      <g id="${p}-accessories">${kit.parts.apronBib(c)}
      </g>`,
    heldItemR: (p, c) => kit.parts.cup(c),
    restPose: { ...base.restPose, handR: 'fist', upperArmR: 20, forearmR: -80, smile: 0.9 },
  }),
};
return { default: __default };
})();
__m['characters/granny.js'] = (function () {
const __default = {
  id: 'granny',
  base: 'nurse',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.shirt,
    name: 'Granny',
    stoop: 1,
    colors: {
      ...base.colors,
      hair: '#cfd3d8', hairHighlight: '#eef0f2', brows: '#a9adb3',
      top: '#b9a3c9', topShadow: '#9c86ad', lineStroke: '#6a557a',
      skirt: '#6d5a7d', trousers: base.colors.skin, shoes: '#f4f4f2', accent: '#d6457a',
    },
    skirt: { kind: 'skirt', length: 1.45, flare: 6 },
    faceExtras: (p, c) => kit.parts.wrinkles(c),
    restPose: { ...base.restPose, upperArmL: 8, upperArmR: 8, smile: 0.7 },
  }),
};
return { default: __default };
})();
__m['characters/grandpa.js'] = (function () {
const __default = {
  id: 'grandpa',
  base: 'surgeon',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.plainCoat,
    name: 'Grandpa',
    hat: () => '',
    backHair: 'low',
    stoop: 0.6,
    neckDrop: 14,
    restPose: { upperArmL: 10, upperArmR: 10, forearmL: -13, forearmR: -13, smile: 0.5 },
    colors: {
      ...base.colors,
      hair: '#f2f2ee', hairHighlight: '#ffffff', brows: '#d9d9d2',
      top: '#d9a521', topShadow: '#b5851a', lineStroke: '#7a5a10', innerShirt: '#fbfbf8',
      trousers: '#8a8f98', shoes: '#4a3a30', accent: '#5a4a3a',
    },
    hair: (p, c) => `
      <g id="${p}-hair-front" fill="${c.hair}" stroke="#b9bcc0" stroke-width="0.8">
        <path d="M -50 -22 Q -60 -12 -58 6 Q -57 18 -50 22 Q -46 6 -47 -8 Q -46 -18 -50 -22 Z"/>
        <path d="M 50 -22 Q 60 -12 58 6 Q 57 18 50 22 Q 46 6 47 -8 Q 46 -18 50 -22 Z"/>
      </g>`,
    faceExtras: (p, c) => `${kit.parts.wrinkles(c)}${kit.parts.roundGlasses(c, { r: 13 })}`,
    beard: (p, c) => kit.parts.moustache(c, { width: 21 }),
    accessories: (p, c) => `
      <g id="${p}-accessories">
        <path d="M 0 -62 V 40" stroke="${c.lineStroke}" stroke-width="1.2"/>
        ${[-48, -30, -12, 6, 24].map((y) => `<circle cx="4" cy="${y}" r="2.4" fill="#6b4a1e" stroke="${c.lineStroke}" stroke-width="0.8"/>`).join('')}
        ${[-24, -18, -12, -6, 0, 6, 12, 18, 24].map((x) => `<path d="M ${x} 33 V 40" stroke="${c.lineStroke}" stroke-width="0.9" opacity=".6"/>`).join('')}
        <path d="M -27 33 H 27" stroke="${c.lineStroke}" stroke-width="1" opacity=".7"/>
        <path d="M -24 4 H -9 V 18 H -24 Z M 9 4 H 24 V 18 H 9 Z" fill="none" stroke="${c.lineStroke}" stroke-width="1.1" stroke-linejoin="round"/>
      </g>`,
    shoulderAccessories: () => '',
  }),
};
return { default: __default };
})();
__m['characters/clerk.js'] = (function () {
const __default = {
  id: 'clerk',
  base: 'doctor',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.shirt,
    name: 'Office clerk',
    colors: {
      ...base.colors,
      top: '#dfe9f5', topShadow: '#c2d2e6', lineStroke: '#6f86a6', buttons: '#ffffff',
      trousers: '#39445a', shoes: '#22262e',
    },
    heldItemL: (p, c) => kit.parts.clipboard(c),
    restPose: { ...base.restPose, handL: 'fist', upperArmL: 14, forearmL: -70, upperArmR: 8, forearmR: -10 },
  }),
};
return { default: __default };
})();
__m['characters/girl.js'] = (function () {
const __default = {
  id: 'girl',
  base: 'nurse',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.dress,
    ...kit.bodies.child,
    name: 'Girl',
    hair: kit.hair.pigtails(),
    colors: {
      ...base.colors,
      hair: '#4a2f22', hairHighlight: '#7a5038',
      top: '#f2b53c', topShadow: '#d29722', lineStroke: '#8a6212',
      trousers: base.colors.skin, shoes: '#f4f4f2', accent: '#d6457a',
    },
    restPose: { ...base.restPose, smile: 1, mouthOpen: 0.3 },
  }),
};
return { default: __default };
})();
__m['characters/boy.js'] = (function () {
const __default = {
  id: 'boy',
  base: 'surgeon',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.hoodie,
    ...kit.bodies.child,
    name: 'Boy',
    hat: () => '',
    hair: kit.hair.spiky(),
    colors: {
      ...base.colors,
      hair: '#3a2a22', hairHighlight: '#6a5040',
      top: '#58a66a', topShadow: '#3f8452', lineStroke: '#2a5a38',
      trousers: '#39445a', shoes: '#f4f4f2',
    },
    restPose: { upperArmL: 9, upperArmR: 9, forearmL: -10, forearmR: -10, smile: 0.9, mouthOpen: 0.2 },
  }),
};
return { default: __default };
})();
__m['characters/manager.js'] = (function () {
const __default = {
  id: 'manager',
  base: 'doctor',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.suit,
    ...kit.bodies.tall,
    name: 'Manager',
    faceExtras: () => '',
    hair: kit.hair.sidePart(),
    colors: {
      ...base.colors,
      hair: '#2c2a33', hairHighlight: '#55505e',
      top: '#39445a', topShadow: '#2a3346', lineStroke: '#151b27',
      innerShirt: '#f4f6f8', tie: '#b23a3a', buttons: '#1d2331',
      trousers: '#39445a', shoes: '#1b2029',
    },
    restPose: { upperArmL: 10, upperArmR: 10, forearmL: -13, forearmR: -13, smile: 0.6 },
  }),
};
return { default: __default };
})();
__m['characters/index.js'] = (function () {
const receptionist = __m['characters/receptionist.js'].default;
const barista = __m['characters/barista.js'].default;
const granny = __m['characters/granny.js'].default;
const grandpa = __m['characters/grandpa.js'].default;
const clerk = __m['characters/clerk.js'].default;
const girl = __m['characters/girl.js'].default;
const boy = __m['characters/boy.js'].default;
const manager = __m['characters/manager.js'].default;
const __default = [receptionist, barista, granny, grandpa, clerk, girl, boy, manager];
return { default: __default };
})();
__m['runtime/index.js'] = (function () {
const { RigSVG } = __m['runtime/rig-svg.js'];
const { RigThu } = __m['runtime/rig-thu.js'];
const { dangKyDau, KIT } = __m['runtime/characters.js'];
const { createProp, PROP_KINDS } = __m['runtime/props.js'];
const { child, teen, adult, tall, stocky } = __m['runtime/bodies.js'];
const { crop, sidePart, bob, long, ponytail, bun, pigtails, curly, spiky, tufts, bald } = __m['runtime/hair.js'];
const { roundGlasses, shortBeard, moustache, wrinkles, apronBib, cup, clipboard, phone } = __m['runtime/parts.js'];
const { COLOR_KEYS, PERSON_STATE_KEYS, PET_STATE_KEYS, HAND_SHAPES, CONFIG_GROUPS, PET_SHAPE_KEYS, definitionToInternal, definitionToPublic, configToInternal, stateToInternal, DRAWING_SLOTS, DEFINITION_KEYS } = __m['runtime/schema.js'];
const CUSTOM_CHARACTERS = __m['characters/index.js'].default;
const VERSION = '0.36.0';
const GLOBAL_NAME = 'VGCharacter';
RigSVG.COLOR_ALIASES = COLOR_KEYS;
RigThu.COLOR_ALIASES = COLOR_KEYS;
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
    state: { get() { return this.__statePort || (this.__statePort = statePort(this, table)); } },
    render: { value() { this.apDung(); } },
    reset: { value() { this.datNghi(); } },
    setColors: { value(colors) { this.doiMau(colors); return this; } },
  });
}
Object.defineProperty(RigSVG.prototype, 'actions', { get() { return [...RigSVG.DONG_TAC, ...RigSVG.DI_NGANG, ...RigSVG.STANCE, ...RigSVG.EXCHANGE]; } });
Object.defineProperty(RigThu.prototype, 'actions', { get() { return [...this.DONG_TAC, ...RigThu.STANCE]; } });
const publicOutfit = (outfit) => definitionToPublic(outfit);
const kit = {
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
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
function assertColors(palette, where) {
  const bad = Object.entries(palette).filter(([, v]) => v !== null && v !== undefined && !(typeof v === 'string' && HEX_COLOR.test(v)));
  if (bad.length) throw new Error(`[character] ${where}: colours must be hex (#rgb / #rrggbb) — invalid: ${bad.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')}`);
}
function validateConfig(config, kind = 'person') {
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
function registerCharacter({ id, base = 'vet', define }) {
  if (!/^[a-z][a-z0-9_]*$/.test(id || '')) throw new Error(`[character] invalid id "${id}" (use lowercase letters, digits and underscores)`);
  const baseDefinition = RigSVG.NHAN_VAT[base];
  if (!baseDefinition) throw new Error(`[character] "${id}" is based on "${base}", which is not registered (available: ${Object.keys(RigSVG.NHAN_VAT).join(', ')})`);
  if (RigSVG.NHAN_VAT[id]) throw new Error(`[character] id "${id}" is already registered — choose another id`);
  if (typeof define !== 'function') throw new Error(`[character] "${id}": missing define(base, kit) function`);
  const written = define(definitionToPublic(baseDefinition), kit);
  if (!written || typeof written !== 'object') throw new Error(`[character] "${id}": define() must return an object`);
  const definition = definitionToInternal(written);
  if (definition.mau) assertColors(definition.mau, `character "${id}" colors`);
  if (definition.backHair !== undefined && !['full', 'low', 'none'].includes(definition.backHair))
    throw new Error(`[character] "${id}": backHair must be 'full', 'low' or 'none', got ${JSON.stringify(definition.backHair)}`);
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
  if (definition.ao !== undefined) {
    if (typeof definition.ao !== 'function') fail(`top must be a function returning path data, e.g. top: () => kit.outlines.scrubs — got ${definition.ao === null ? 'null' : typeof definition.ao === 'string' ? 'a string (wrap it: top: () => "M …")' : JSON.stringify(definition.ao)}`);
    const outline = definition.ao();
    if (typeof outline !== 'string' || !/^\s*M/i.test(outline)) fail(`top() must return SVG path data starting with "M", got ${outline === undefined ? 'undefined (kit.outlines has: ' + Object.keys(kit.outlines).join(', ') + ')' : JSON.stringify(outline).slice(0, 60)}`);
  }
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
    const known = Object.values(COLOR_KEYS).includes(definition.mauSoSau);
    if (!known && definition.mau && Object.keys(definition.mau).length && !(definition.mauSoSau in definition.mau)) throw new Error(`[character] "${id}": backSkullColor names a colour that is not in colors`);
  }
  return RigSVG.dangKy(id, definition);
}
const bakedConfigs = {};
function __setBakedConfigs(configs) { Object.assign(bakedConfigs, configs); }
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
function applyConfig(rig, config) {
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
const ITEMS = { cup, clipboard, phone };
function createCharacter(host, { id = 'vet', config, items = null, itemsHidden = false } = {}) {
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
function createPet(host, { species = 'dog', config } = {}) {
  if (!RigThu.LOAI[species]) throw new Error(`[character] no species "${species}" (available: ${Object.keys(RigThu.LOAI).join(', ')})`);
  if (config === undefined) config = bakedConfigs[species] || null;
  assertConfig(config, 'pet', species);
  host.style.aspectRatio = `${RigThu.KHUNG.w}/${RigThu.KHUNG.h}`;
  const rig = new RigThu(host, species);
  rig.publicId = species;
  applyConfig(rig, config);
  return { rig, id: species };
}
function seed(value) { RigSVG.gieo(value); RigThu.gieo(value); }
const BUILT_IN_NAMES = {
  default: 'Default (plain adult)', vet: 'Veterinarian', surgeon: 'Surgeon', nurse: 'Nurse', doctor: 'Doctor with glasses',
  dog: 'Dog (golden puppy)', shiba: 'Dog (shiba)', cat: 'Cat (grey tabby)', orange_cat: 'Cat (orange tabby)', black_cat: 'Cat (black)',
};
const displayName = (id, definition) => BUILT_IN_NAMES[id] || definition.ten || id;
function list() {
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
const SPEECH_STEPS = ['speak', 'explain', 'speakCues'];
const SPEECH_SETTLE = 0.55;
function sequence(rig, stepList, { gap = 0.1, sampleRate = 60, breathe = true } = {}) {
  const source = gsap.timeline({ paused: true, defaults: { lazy: false } });
  const keys = Object.keys(rig.NGHI);
  const snapshot = () => keys.map((k) => rig.s[k]);
  const restore = (values) => keys.forEach((k, n) => { rig.s[k] = values[n]; });
  let at = 0, endState = snapshot(), firstFrame = null;
  const steps = [];
  for (const step of stepList) {
    if (typeof step === 'number') { at += step; continue; }
    const [name, ...args] = Array.isArray(step) ? step : [step];
    if (typeof rig[name] !== 'function') throw new Error(`[character] no action "${name}" (available: ${rig.actions.join(', ')})`);
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
    if (name === 'face' && args[0] && typeof args[0] === 'object') entry.target = args[0].live || args[0];
    if (SPEECH_STEPS.includes(name)) {
      const text = name === 'speakCues' ? (args[2] && args[2].text) || (args[0] && args[0].metadata && args[0].metadata.text) : args[0];
      if (typeof text === 'string' && text.trim()) entry.text = text.trim();
      entry.speech = Math.max(0, entry.duration - SPEECH_SETTLE);          // tiếng nói ngắn hơn bước đúng quãng "về chỗ"
      if (name === 'speakCues' && args[0] && args[0].metadata && args[0].metadata.soundFile) entry.sound = args[0].metadata.soundFile;
      if (name === 'speakCues') entry.cues = Array.isArray(args[0]) ? args[0] : (args[0] && args[0].mouthCues) || [];      // cho tools/peek.sh --mouth
    }
    steps.push(entry);
    at += child.duration() + gap;
  }
  const duration = Math.max(source.duration(), 1e-3), count = Math.ceil(duration * sampleRate) + 1;
  if (firstFrame) restore(firstFrame);
  const frames = [];
  for (let n = 0; n < count; n++) { source.totalTime(Math.min(duration, n / sampleRate), false); frames.push(snapshot()); }
  source.kill();
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
    const span = hi === count - 1 ? Math.max(1e-9, lastPosition - lo) : 1, mix = Math.min(1, (p - lo) / span);
    const a = frames[lo], b = frames[hi];
    keys.forEach((k, n) => { rig.s[k] = numeric[n] ? a[n] + (b[n] - a[n]) * mix : a[n]; });
    rig.apDung();
  };
  const playhead = { _frame: 0, get frame() { return this._frame; }, set frame(v) { this._frame = v; show(v); } };
  const timeline = gsap.timeline({ paused: true, defaults: { lazy: false } });
  timeline.to(playhead, { frame: lastPosition, duration, ease: 'none' }, 0);
  timeline.data = { type: 'character-sequence', character: rig.publicId || '', steps, rig };
  rig.lastSequence = timeline;                  // `shot(…, { time })` dùng chuỗi này để biết nhân vật đang ở đâu lúc ấy
  show(0);                                      // rig nằm sẵn ở đúng khung 0 của chuỗi
  return timeline;
}
function shot(scene, subject, kind = 'face', { duration = 0.6, ease = 'power2.inOut', fill = 0.82, centerY = 0.5, sequence: given, time, frame, avoid = null } = {}) {
  const elements = [].concat(scene || []).flatMap((item) => (typeof item === 'string' ? [...document.querySelectorAll(item)] : [item])).filter((item) => item && item.nodeType === 1);
  if (!elements.length) throw new Error('[character] shot(scene, …): scene must be a selector, an element, or an array of them — and match at least one element');
  const root = frame || elements[0].closest('[data-composition-id]') || elements[0].parentElement;
  const frameWidth = root.offsetWidth, frameHeight = root.offsetHeight;
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
    const boxAt = (rig, index, boxKind) => {
      const actions = time === undefined ? null : sequences[index] || (sequences.length === 1 && rigs.length === 1 ? sequences[0] : null) || rig.lastSequence || null;
      const before = actions ? actions.time() : 0;
      if (actions) actions.time(Math.min(time, actions.duration()));
      const box = rig.shotBox(boxKind), shown = rig.s.mo > 0.5;
      if (actions) actions.time(before);
      const size = rig.constructor.KHUNG, host = place(rig.host), hostWidth = rig.host.offsetWidth, hostHeight = rig.host.offsetHeight;
      const unit = Math.min(hostWidth / size.w, hostHeight / size.h);
      const originX = host.x + (hostWidth - size.w * unit) / 2, originY = host.y + (hostHeight - size.h * unit) / 2;
      return { left: originX + box.x * unit, right: originX + (box.x + box.width) * unit, top: originY + box.y * unit, bottom: originY + (box.y + box.height) * unit, shown };
    };
    const frameFor = (shotKind) => {
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    rigs.forEach((rig, index) => {
      const box = boxAt(rig, index, shotKind);
      left = Math.min(left, box.left); right = Math.max(right, box.right); top = Math.min(top, box.top); bottom = Math.max(bottom, box.bottom);
    });
    const scale = Math.max(1, Math.min(8, fill * frameHeight / (bottom - top), (rigs.length > 1 ? 0.9 : 1.6) * frameWidth / (right - left)));
    const within = (value, size) => Math.min(0, Math.max(size - size * scale, value));
    const target = { x: within(frameWidth / 2 - (left + right) / 2 * scale, frameWidth), y: within(frameHeight * centerY - (top + bottom) / 2 * scale, frameHeight), scale };
    const crowded = [];
    for (const other of [].concat(avoid || [])) {
      if (rigs.includes(other) || typeof other.shotBox !== 'function') continue;
      const box = boxAt(other, -1, 'face');
      if (!box.shown) continue;
      { const hair = (box.right - box.left) * 0.25; box.left -= hair; box.right += hair; }
      const partly = (x) => { const a = box.left * scale + x, b = box.right * scale + x, seen = Math.min(frameWidth, b) - Math.max(0, a); return seen > 0.06 * (b - a) && seen < 0.94 * (b - a); };
      const overlapsY = box.bottom * scale + target.y > 0 && box.top * scale + target.y < frameHeight;
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
    if (framed.crowded.length && kind === 'chest' && rigs.length === 1) { const tighter = frameFor('face'); if (!tighter.crowded.length) framed = tighter; }
    target = framed.target;
    const crowded = framed.crowded;
    if (crowded.length) return shot(scene, [...rigs, ...crowded], kind, { duration, ease, fill, centerY, time, frame, avoid });
    subjects = rigs;
  }
  const timeline = gsap.timeline({ paused: true, defaults: { lazy: false } });
  for (const element of elements) {
    const at = place(element);
    gsap.set(element, { transformOrigin: `${-at.x}px ${-at.y}px` });
    if (target.scale > 1) element.setAttribute('data-layout-allow-overflow', '');
    timeline.to(element, { ...target, duration: Math.max(duration, 0.001), ease: duration > 0 ? ease : 'none' }, 0);
  }
  timeline.data = { type: 'character-shot', kind, target, subjects };
  return timeline;
}
function captions(source, element, { fade = 0.15, hold = 0.3, speaker = false, follow = false, offsetY = 12, readable = true, maxChars = 0, avoid = true } = {}) {
  if (!element || element.nodeType !== 1) throw new Error('[character] captions(source, element): element must be the DOM element that shows the text');
  const fromSteps = (steps, rig, shift = 0) => steps.filter((step) => step.text).map((step) => ({ start: step.start + shift, end: step.start + shift + (step.speech ?? step.duration), text: step.text, rig }));
  let lines;
  if (Array.isArray(source)) lines = source.map((line) => ({ ...line }));
  else if (source && Array.isArray(source.turns)) lines = source.turns.flatMap((turn) => fromSteps(turn.steps, turn.rig));
  else if (source && source.data && source.data.type === 'character-sequence') lines = fromSteps(source.data.steps, source.data.rig);
  else throw new Error('[character] captions(source, …): source must be a conversation(), a sequence(), or an array of { start, end, text }');
  lines = lines.filter((line) => line && typeof line.text === 'string' && line.end > line.start).sort((a, b) => a.start - b.start);
  if (maxChars > 0) lines = lines.flatMap((line) => {
    const parts = [];
    let rest = line.text.trim();
    while (rest.length > maxChars) {
      const head = rest.slice(0, maxChars + 1);
      let cut = -1;
      for (const marks of [/[.!?…]\s/g, /[;,]\s/g]) {
        for (const mark of head.matchAll(marks)) if (mark.index + 1 >= maxChars * 0.35) cut = mark.index + 1;
        if (cut > 0) break;
      }
      if (cut < 0) cut = head.lastIndexOf(' ');
      if (cut <= 0) cut = maxChars;
      parts.push(rest.slice(0, cut).trim()); rest = rest.slice(cut).trim();
    }
    if (rest) parts.push(rest);
    if (parts.length < 2) return [line];
    const total = parts.reduce((sum, part) => sum + part.length, 0), span = line.end - line.start;
    let at = line.start;
    return parts.map((text) => { const piece = { ...line, text, start: at, end: at + span * text.length / total }; at = piece.end; return piece; });
  });
  if (readable) lines.forEach((line, index) => {
    const words = line.text.trim().split(/\s+/).length, next = lines[index + 1];
    const wanted = line.start + Math.max(0.5 + 0.3 * words, next ? 0 : 3);
    line.end = Math.max(line.end, next ? Math.min(wanted, next.start - 2 * fade - hold) : wanted);
  });
  if (!lines.length) throw new Error('[character] captions: no spoken text found — speak / explain take the text as their first argument; for speakCues pass { text } as the fourth item of the step');
  const label = (line) => (speaker && line.rig ? `${list().people[line.rig.publicId] || line.rig.publicId || ''}: ` : '') + line.text;
  const slot = element.querySelector('[data-caption-text]') || element;
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
  if (avoid && !follow && source && Array.isArray(source.sequences)) {
    const root = element.closest('[data-composition-id]') || element.offsetParent || element.parentElement;
    const actors = source.sequences.map((item) => item && item.data && item.data.rig).filter((rig) => rig && rig.el && rig.el.dau);
    const reels = [...source.sequences, source.camera].filter(Boolean), before = reels.map((reel) => reel.time());
    const wasText = slot.textContent, wasOpacity = element.style.opacity;
    element.style.translate = 'none';
    for (const line of lines) {
      slot.textContent = label(line);
      const frame = root.getBoundingClientRect(), box = element.getBoundingClientRect(), ratio = frame.height / (root.offsetHeight || frame.height) || 1;
      const headsAt = (time) => {
        reels.forEach((reel) => reel.time(Math.max(0, Math.min(time, reel.duration()))));
        const found = [];
        for (const rig of actors) { if (rig.s.mo < 0.5) continue; const head = rig.el.dau.getBoundingClientRect(); if (head.width > 0 && head.right > frame.left && head.left < frame.right) found.push(head); }
        return found;
      };
      const pad = 6 * ratio, over = (list, shift) => list.some((head) => head.right > box.left - pad && head.left < box.right + pad && head.bottom > box.top + shift - pad && head.top < box.bottom + shift + pad);
      const settle = Math.min(line.start + 0.4, (line.start + line.end) / 2), leadTimes = [];
      for (let time = line.start - fade; time < settle; time += 0.08) leadTimes.push(time);
      const leadHeads = leadTimes.map(headsAt), lead = leadHeads.flat(), during = [settle, (line.start + line.end) / 2, line.end - 0.1].flatMap(headsAt);
      const hits = (shift) => over(lead, shift) || over(during, shift);
      if (!hits(0)) continue;
      const portrait = frame.height > frame.width, step = frame.height * 0.02;
      const low = frame.top + frame.height * (portrait ? 0.12 : 0.06), high = frame.bottom - frame.height * (portrait ? 0.22 : 0.06);
      for (let n = 1; n <= 22 && line.shift === undefined; n++) for (const shift of [n * step, -n * step]) {
        if (box.top + shift < low || box.bottom + shift > high || hits(shift)) continue;
        line.shift = shift / ratio; break;
      }
      if (line.shift === undefined && !over(during, 0)) {
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
    const line = [...lines].reverse().find((item) => time >= item.start - fade && time <= item.end + hold + fade) || null;
    if (line !== shown) {
      shown = line;
      if (line) {
        slot.textContent = label(line);
        if (follow && line.x !== undefined) { element.style.left = `${line.x.toFixed(1)}px`; element.style.top = `${line.y.toFixed(1)}px`; element.style.transform = 'translate(-50%, -100%)'; }
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
function conversation(turnList, { gap = 0.25, waiting = true, stepGap = 0.1, camera = null, leadIn = 0.6, overlap = true } = {}) {
  if (!Array.isArray(turnList) || !turnList.length) throw new Error('[character] conversation(turns): turns must be a non-empty array of [rig, ...steps]');
  const cast = new Map();                                  // rig → { steps: danh sách bước đang dựng, end: giờ kết thúc hiện tại }
  const part = (rig) => {
    if (!cast.has(rig)) { const keys = Object.keys(rig.NGHI); cast.set(rig, { steps: [], end: 0, used: false, keys, initial: keys.map((k) => rig.s[k]), centre: undefined }); }
    return cast.get(rig);
  };
  const restore = (rig) => { const mine = cast.get(rig); mine.keys.forEach((k, n) => { rig.s[k] = mine.initial[n]; }); };
  const anchor = (target) => {
    const known = cast.get(target), x = known && known.centre !== undefined ? known.centre : target.centerX();
    return { centerX: () => x, publicId: target.publicId, live: target };
  };
  const measure = (rig, steps) => {
    restore(rig);
    const draft = sequence(rig, steps, { gap: stepGap, sampleRate: 4 });
    draft.time(draft.duration());
    const data = { duration: draft.duration(), steps: draft.data.steps, centre: rig.centerX() };
    draft.kill(); restore(rig);
    return data;
  };
  const turns = [];
  const opening = (entry) => { const turn = entry && entry.turn ? entry.turn : entry; return turn && Array.isArray(turn.together) ? turn.together.map(opening).flat() : [Array.isArray(turn) ? turn[1] : null]; };
  const speaksFirst = opening(turnList[0]).some((step) => SPEECH_STEPS.includes(Array.isArray(step) ? step[0] : step));
  let clock = speaksFirst ? leadIn : 0;
  let lastLine = null;                                     // câu nói kết thúc lượt trước: { rig, start }
  turnList.forEach((entry, index) => {
    const override = entry && !Array.isArray(entry) && 'shot' in entry ? entry.shot : undefined;
    if (entry && !Array.isArray(entry) && Array.isArray(entry.turn)) entry = entry.turn;
    const parallel = entry && !Array.isArray(entry) && Array.isArray(entry.together) ? entry.together : [entry];
    let begin = clock;
    if (overlap && lastLine && parallel.length === 1) {
      const only = parallel[0] && !Array.isArray(parallel[0]) && Array.isArray(parallel[0].turn) ? parallel[0].turn : parallel[0];
      const names = Array.isArray(only) ? only.slice(1).map((step) => (Array.isArray(step) ? step[0] : step)) : [];
      if (names[0] === 'enter' && !names.some((name) => SPEECH_STEPS.includes(name)) && only[0] !== lastLine.rig) begin = Math.max(lastLine.start + 0.5, clock - 1.2);
    }
    const moved = [];
    let finish = begin, spokeLast = null;
    for (let turn of parallel) {
      let own = override;
      if (turn && !Array.isArray(turn) && Array.isArray(turn.turn)) { if ('shot' in turn) own = turn.shot; turn = turn.turn; }
      if (!Array.isArray(turn) || !turn[0] || typeof turn[0].shotBox !== 'function' || turn.length < 2) throw new Error(`[character] conversation: turn ${index + 1} must be [rig, ...steps], { turn: [rig, ...steps], shot }, or { together: [ …such turns ] }`);
      const [rig, ...written] = turn, mine = part(rig);
      const steps = written.map((step) => (Array.isArray(step) && ['face', 'handOver', 'take', 'stroke'].includes(step[0]) && step[1] && step[1] !== rig && typeof step[1].centerX === 'function' && !step[1].live
        ? [step[0], anchor(step[1]), ...step.slice(2)] : step));
      const first = !mine.used, lead = first ? 0 : stepGap;       // sau mỗi bước `sequence` tự chèn `stepGap`
      let wait = begin - mine.end - lead;
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
      const last = real[real.length - 1];
      finish = Math.max(finish, mine.end - (overlap && last && SPEECH_STEPS.includes(last.name) ? SPEECH_SETTLE : 0));
      spokeLast = last && SPEECH_STEPS.includes(last.name) ? { rig, start: last.start } : null;
      turns.push({ rig, character: rig.publicId || '', start: real.length ? real[0].start : begin, end: mine.end, steps: real, shot: own });
    }
    for (const [mine, centre] of moved) mine.centre = centre;
    clock = Math.max(clock, finish + gap);                   // lượt vào sớm không được kéo đồng hồ chung lùi lại
    lastLine = parallel.length === 1 ? spokeLast : null;
  });
  const sequences = [...cast.entries()].map(([rig, mine]) => { restore(rig); return sequence(rig, mine.steps, { gap: stepGap }); });
  const rigs = [...cast.keys()];
  const duration = Math.max(...sequences.map((item) => item.duration()));
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
      if (spoken.length) lastWords = Math.max(lastWords, until);
      const crossing = turn.steps.find((step) => ['enter', 'exit', 'walk', 'walkForward', 'walkAway'].includes(step.name));
      const goWide = (at) => { cameraTimeline.add(shot(scene, null, 'wide', { duration: move }).paused(false), Math.max(0, at - lead)); aimed = 'wide'; inFrame = []; };
      const walksFirst = crossing && (!spoken.length || crossing.start <= from);
      if (walksFirst && turn.shot === undefined && aimed && aimed !== 'wide') goWide(crossing.start);
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
      if (crossing && !walksFirst && turn.shot === undefined && aimed !== 'wide') goWide(crossing.start);
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
dangKyDau(RigSVG, 'vet');
for (const character of CUSTOM_CHARACTERS) registerCharacter(character);
return { VERSION, GLOBAL_NAME, kit, validateConfig, registerCharacter, __setBakedConfigs, applyConfig, createCharacter, createPet, seed, list, sequence, shot, captions, conversation, RigSVG, RigThu, createProp };
})();
__m['runtime/index.js'].__setBakedConfigs({});
return __m['runtime/index.js'];
})();
