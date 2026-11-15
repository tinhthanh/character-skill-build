/* VGCharacter v0.17.0 — bản dựng một tệp của character-skill-build. SINH TỰ ĐỘNG bằng tools/build.py — đừng sửa tay. */
var VGCharacter = (function () {
'use strict';
const __m = {};

/* ───── runtime/rig-svg.js ───── */
__m['runtime/rig-svg.js'] = (function () {
// rig-svg.js — Nhân vật 2D SVG thuần, điều khiển bằng GSAP (global `gsap`).
//
// Luật:
//  • Mọi động tác TRẢ VỀ timeline ở trạng thái paused, không tự chạy (§6).
//  • Mọi động tác KHÉP về tư thế nghỉ (NGHI) nên nối liền không giật.
//  • Trạng thái sống trong `rig.s`; `apDung()` đổ trạng thái xuống SVG.
//
// Quy ước góc (đơn vị độ, nhìn từ phía trước):
//  • batL/batR  : cánh tay, 0 = buông thẳng, DƯƠNG = giơ ra xa thân (cả hai bên).
//  • cangL/cangR: cẳng tay so với cánh tay, DƯƠNG = gập tiếp ra ngoài, ÂM = gập vào thân.
//  • duiL/duiR  : đùi, ÂM = đưa về phía trước (nhân vật đi sang phải màn hình).
//  • ongL/ongR  : ống chân, DƯƠNG = gập gối.
//  • than       : thân nghiêng, ÂM = ngả sang trái màn hình.
//  • dau/dauX/dauY: đầu nghiêng / lắc ngang / gật xuống.
//  • matY 0..1  : mắt nhắm;  mieng 0..1: miệng mở;  cuoi -1..1: khóe miệng.
//  • chum 0..1  : chúm môi — hẹp ngang, dày dọc. Ba kênh (mieng, cuoi, chum)
//    đúng bằng ba kênh [mở, rộng, tròn] quen thuộc của các bộ viseme, nên bảng khẩu hình
//    của công cụ nhép miệng khác dùng lại được.
//  • tayL/tayR  : 'mo' | 'nam' | 'cai' | 'chi'.

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
  tayL: 'mo', tayR: 'mo',
});

const MAU_MAC_DINH = {
  da: '#f1c3a0', daToi: '#d9a583', toc: '#2c2a33', ao: '#4a8ed6', aoToi: '#3a74b3',
  quan: '#2f3a4d', giay: '#1b2029', mat: '#1c1a22', mieng: '#5a2530', ma: '#e99a8c',
  // Miệng cần BỐN màu, không phải một. Tô cả khoang miệng bằng đúng màu nét
  // môi cho ra một khối bệt — mở to là thành lát dưa hấu. Ba màu dưới đây tự
  // suy từ `mieng` nếu nhân vật không khai, xem #mauMieng().
  miengToi: null,   // lòng miệng, tối hơn nét môi
  rang: '#fffaf4',
  luoi: null,       // lưỡi, sáng và hồng hơn nét môi
  may: null,        // màu chân mày; bỏ trống thì lấy đúng màu tóc
  vienNet: null,    // màu nét vẽ trên quần áo (mép túi, cổ áo); bỏ trống thì tự tối đi từ màu áo
};

/**
 * Sinh đường bao KHUÔN MẶT — nửa phải rồi lật gương, nên luôn cân đối.
 *
 * Hai nửa siêu-elip nối nhau tại điểm RỘNG NHẤT (gò má), vì mặt người không
 * đối xứng trên–dưới: vòm sọ ngắn và tròn, phần hàm dài và thu lại.
 *
 *   rong  nửa bề ngang ở chỗ rộng nhất   yRong  chỗ ấy nằm ở đâu theo trục dọc
 *   cao   từ tâm lên đỉnh đầu            cam    từ tâm xuống hết cằm
 *   tranVuong / hamVuong  −1 nhọn · 0 bo tròn · +1 vuông (số mũ siêu-elip)
 *   rongTran / rongCam    thu bề ngang của nửa trên / nửa dưới; 0.5 = hẹp một nửa
 *
 * Bảy số này đủ cho mặt tròn, trái xoan, chữ điền, trái tim, V-line — thứ mà
 * bảy đường `Q` viết tay không làm được: sửa một đoạn là phải căn lại cả sáu
 * đoạn kia cho liền nét.
 */
function veKhuonMat({ rong = 50, cao = 54, cam = 56, yRong = -6,
                             tranVuong = 0, hamVuong = 0, rongTran = 1, rongCam = 1 } = {}) {
  const N = 34;
  // v ∈ [−1,1] → số mũ siêu-elip: 0.83 (nhọn) · 2 (elip) · 4.8 (vuông).
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
  // Nửa trên đi từ chỗ rộng nhất LÊN đỉnh; đảo lại để đường chạy từ đỉnh xuống.
  const tren = nua(cao + yRong, tranVuong, rongTran, false).reverse();
  const duoi = nua(cam - yRong, hamVuong, rongCam, true);
  const phai = [...tren, ...duoi.slice(1)];
  const r = ([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`;
  const trai = phai.slice(0, -1).reverse().map(([x, y]) => [-x, y]);
  return `M ${phai.map(r).join(' L ')} L ${trai.map(r).join(' L ')} Z`;
}

/**
 * Nửa bề ngang của khuôn mặt tại một cao độ `y` — nghịch đảo của `veKhuonMat`.
 *
 * Cần nó để đặt MỐC theo viền thật chứ không theo `rong`. Má hồng nằm ở y = 24,
 * tức đã vào vùng hàm thu lại: buộc nó theo tỉ lệ với `rong` thì mặt V-line kéo
 * má văng hẳn ra ngoài cằm, mà nhìn ảnh chỉ tưởng "má vẽ sai chỗ".
 *
 * Từ tham số hoá: sy = sin(θ)^(2/n) ⇒ sx = (1 − sy^n)^(1/n).
 */
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

/**
 * Sinh đường bao MỘT chân mày — hình đặc, không phải nét kẻ.
 *
 * Nét kẻ (`stroke`) chỉ ra được sợi mày dày ĐỀU từ đầu tới đuôi, mà đúng chỗ
 * đó mới là thứ phân biệt các kiểu mày: mày thật dày ở đầu rồi thon dần về
 * đuôi. Nên vẽ thành hình đặc, bề dày là một hàm của vị trí.
 *
 *   dai   nửa chiều dài            day   bề dày ở đầu mày
 *   cong  độ vồng của vòm          thon  0 = dày đều, 1 = đuôi nhọn hoắt
 *   xech  độ xếch, tính bằng độ (dương = đuôi hất lên)
 *
 * Đỉnh vòm đặt ở 62% quãng đường từ đầu ra đuôi, không phải chính giữa —
 * mày người vồng lệch về phía đuôi, canh giữa cho ra hình cái cầu vồng.
 * `sin(π·s^1.45)` cho đúng chỗ đó: s^1.45 = 0.5 khi s = 0.62.
 *
 * `ben` chỉ đổi hướng: sinh cho mày phải rồi lật x cho mày trái, vì hai bên
 * đối xứng qua sống mũi chứ không phải hai hình khác nhau.
 */
function veChanMay({ dai = 10.5, day = 3, cong = 2.25, thon = 0, xech = 0 } = {}, ben = 'R') {
  const N = 40, lat = ben === 'L' ? -1 : 1;
  // Góc xếch KHÔNG nhân `lat`: phép lật x ở cuối đã lo phần đối xứng rồi.
  // Nhân thêm vào đây thì hai bên mày xếch ngược chiều nhau theo trục dọc —
  // một bên hất lên, bên kia cụp xuống. Dấu âm để `xech` dương = đuôi hất LÊN
  // (y của SVG hướng xuống).
  const g = -(xech * Math.PI) / 180, cosG = Math.cos(g), sinG = Math.sin(g);
  // Mũ 1.15 đẩy đỉnh vòm ra 55% quãng đường về phía đuôi — mày người vồng lệch
  // về đuôi chứ không cân giữa. Bản đầu tôi dùng sin(π·s^1.45), đỉnh ở 62% và
  // dốc đổ nhanh: ở cỡ 20px nó không đọc ra cái vòm mà ra một nếp gấp chữ ^.
  const vom = (st) => { const q = Math.pow(st, 1.15); return -cong * 4 * q * (1 - q); };
  // Mũ tròn ở hai đầu, đúng theo phương trình đường tròn. Bản đầu vuốt bề dày
  // bằng hàm luỹ thừa trên 7% chiều dài — với 26 mẫu thì chỉ còn hai điểm, và
  // đầu mày ra hình cắt vát chứ không tròn.
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

// Bốn khẩu hình cho speak(), viết bằng ba kênh (mở, cười/rộng, chúm) — rút gọn
// từ một bảng viseme 9 hình: bốn nhóm này bao được nhịp của một câu
// nói, còn phân biệt B với C thì chỉ có ý nghĩa khi bám cue Rhubarb thật.
// Chín hình của Rhubarb quy về BA kênh miệng của rig (mở / chúm / khoé môi).
// Đây là bảng cho nhép miệng THẬT — bám cue đo từ âm thanh. `KHAU` bên dưới
// là bảng ƯỚC LƯỢNG cho `speak()`/`explain()` khi không có âm thanh.
const RHUBARB = {
  A: { mieng: 0.05, chum: 0.15, cuoi: 0.28 },   // M B P — mím
  // B và C từng là 0.22 và 0.48. Soát bằng dải cận miệng (tools/peek.sh --mouth) thì hai hình này — vốn chiếm
  // phần lớn thời gian của một câu — chỉ ra một khe hở mảnh, nhân vật trông như nói lí nhí. Nới ra.
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

// Toạ độ tuyệt đối (viewBox): hông (200,262), vai (168|232,165), cổ (200,150), tâm đầu (200,88).
const HONG = { x: 200, y: 262 };
const VAI = { L: { x: 167, y: 172 }, R: { x: 233, y: 172 } };
const DAI = { canhTay: 62, cangTay: 58, dui: 78, ong: 78 };
// Chốt cánh tay so với hông (±33,−90). Vai không phải bản lề chết: giơ tay cao
// thì cả bờ vai nhấc lên và xoay quanh khớp ỨC–ĐÒN (đầu trong xương đòn, cạnh
// hõm cổ). `UC_DON` là tâm xoay đó, tính theo toạ độ hông; `GOC_VAI_MAX` là
// góc xoay lớn nhất — 16° trên cánh tay đòn 27px cho vai nhấc ~7px.
const CHOT_VAI = { x: 33, y: -90 };
const UC_DON = { x: 6, y: -98 };
const GOC_VAI_MAX = 16;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const chuanHoaGoc = (g) => ((((g + 180) % 360) + 360) % 360) - 180;
// Nguồn ngẫu nhiên của MỌI động tác (chớp mắt, khẩu hình, cử chỉ). Mặc định là
// `Math.random`; gọi `RigSVG.gieo(hat)` thì thành dãy cố định (mulberry32), để
// hai lần render cùng một kịch bản ra đúng cùng một hình — không gieo thì mỗi
// lần dựng timeline chớp mắt một kiểu, không so khung với nhau được.
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

/**
 * ĐỆM VAI — mảnh áo bịt khớp vai, vẽ trong nhóm THÂN ÁO (toạ độ chốt vai).
 *
 * Trước đây khớp vai là bản lề giấy: tay áo xoay cứng theo cánh tay, còn góc
 * áo ở vai đứng yên. Tay giơ 90° thì nách gãy thành khe, giơ 150° thì góc áo
 * lòi ra như đỉnh nhọn và tay áo xoay tròn trên ngực như cái đĩa.
 *
 *   t = 0  tay buông: đệm TRÙNG KHÍT với đường bao tay áo nghỉ (vòm, cạnh
 *          ngoài, gấu) — vô hình, kể cả với nhân vật có viền vì nó nằm trong
 *          nhóm áo và bộ lọc viền lấy hợp của cả nhóm.
 *   t = 1  tay giơ cao: đệm rút gấu lên sát chốt, thành khoảng nách bo tròn
 *          nối thân áo với tay áo đang xoay.
 * Cạnh trong luôn nằm trong thân áo nên không bao giờ lộ.
 */
// NẮP TAY ÁO — cạnh trên của tay áo, toạ độ chốt vai, đi từ phía TRONG ra
// phía NGOÀI. Không phải vòm tròn: vòm đội lên trên bờ vai thành bầu phồng,
// giữa bầu và cổ áo lại thủng một chỗ lõm — nhìn như áo độn vai. Nắp xuôi
// dần ra ngoài thì bờ vai là MỘT đường liền từ cổ tới hết tay áo, như ảnh
// mẫu; điểm cao nhất lệch về phía trong (mỏm vai), phía ngoài bo tròn xuống.
const napTayAo = (ben) => {
  const sg = ben === 'L' ? -1 : 1;
  return `M ${-sg * 12} -5 Q ${-sg * 6} -8 ${sg * 2} -6 Q ${sg * 10} -4 ${sg * 12} 2`;
};
// Gấu tay áo theo định nghĩa nhân vật: góc ngoài (±11·rộng, 24·dài) thấp hơn
// góc trong (∓11·rộng, 24·dài − xéo). Đệm vai rút gấu lên theo t về một
// khoảng nách cố định — tay áo rộng hay hẹp thì nách lúc giơ tay vẫn thế.
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
// BO GÓC TRONG của gấu tay áo. Góc này — chỗ gấu gặp mép nách — là góc duy
// nhất của tay áo chĩa VÀO ngực, nên tay áo càng loe (`rongTayAo`) thì nó càng
// thọc sâu vào giữa thân và xỉa thẳng vào ống nghe đeo trước ngực. Bo nó lại
// thì tay áo lùi khỏi vùng ngực mà bề ngang gấu phía ngoài vẫn giữ nguyên.
//
// Trả về hai điểm tiếp tuyến: `p1` lùi `r` dọc theo GẤU, `p2` lùi `r` dọc theo
// MÉP NÁCH. Nối chúng bằng một quadratic lấy chính góc nhọn cũ làm điểm điều
// khiển — đó là cách bo góc rẻ nhất mà vẫn tiếp tuyến đúng ở cả hai đầu.
// Bán kính nhân (1 − t): lúc giơ tay cao đệm vai co thành khoảng nách nhỏ,
// giữ nguyên bán kính thì bo ăn hết cả miếng đệm.
const boGocTrong = (nv, ben, t) => {
  const sg = ben === 'L' ? -1 : 1, g = gauDemVai(nv, ben, t);
  // Chặn trên KHÔNG lấy theo bề rộng gấu mà theo KHOẢNG THỪA giữa mép gấu và
  // mép cánh tay (11·rộng − 12·dày). Bo quá khoảng đó là ăn lẹm vào chỗ đang
  // che cánh tay, và da lòi ra ở mặt trong bắp — tay càng gầy thì càng bo được
  // nhiều, tay to thì tự động bo ít lại.
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
// Tay áo trên cánh tay = đệm vai lúc t = 0 — cùng một hàm, nên không bao giờ
// lệch nhau. Viền gấu là nét riêng, đi theo đúng đường gấu.
const veTayAo = (nv, ben) => veDemVai(nv, ben, 0);
// Nét gấu vẽ THỤT LÊN khỏi mép vải `lechGau` đơn vị, không nằm đúng trên mép.
// Nằm trên mép thì nửa bề dày nét + hai đầu bo tròn thò ra ngoài vải, và với
// nhân vật có viền thì phần thò ra đó lại được bộ lọc bọc thêm một vòng đen —
// thành ra cái bèo ở cửa tay chứ không phải đường chỉ. Ảnh mẫu thụt 7 đơn vị.
// Kẹp ở 35% chiều dài tay áo để tay áo cánh tiên không bị chỉ chạy giữa bắp.
// Thụt vào thì hai đầu nét cũng phải co lại (0.88) cho khỏi chạm mép ngoài.
const veGauTayAo = (nv, ben) => {
  const g = gauTayAo(nv, ben), b = boGocTrong(nv, ben, 0);
  const d = Math.min(nv.lechGau || 0, g.yB * 0.35), k = d ? 0.88 : 1;
  // Đường chỉ dừng ở chỗ gấu BẮT ĐẦU vòng (`p1`), không chạy tới góc cũ — chạy
  // tới đó là nó thò ra ngoài mảnh vải vừa bị bo đi.
  const [ex, ey] = b ? b.p1 : [g.ex * k, g.ey];
  return `M ${g.xB * k} ${g.yB - d} Q ${g.cx} ${g.cy - d} ${ex} ${ey - d}`;
};
// ĐƯỜNG MAY tay áo — nét mảnh chạy dọc cạnh trong của tay áo, từ mỏm vai
// xuống nách, hơi cong ôm vào thân như ảnh mẫu. Vẽ trên ĐỆM (nhóm áo) chứ
// không vẽ trên tay áo: tay trái nằm SAU thân áo, may trên tay áo thì vai
// trái không bao giờ thấy đường may. Lệch 1px vào trong để tay áo trước
// (vẽ đè lên) không nuốt mất nửa nét.
const veDuongMayVai = (nv, ben, t) => {
  const sg = ben === 'L' ? -1 : 1, g = gauDemVai(nv, ben, t);
  return `M ${-sg * 13} -4 Q ${-sg * 15.5} ${pha(8, 5, t)} ${g.ex - sg} ${g.ey}`;
};

// Xoay chốt vai quanh khớp ức–đòn một góc `goc` (độ, dương = nhấc lên) — trả
// về độ lệch (dx, dy) so với chốt nghỉ, toạ độ chốt vai.
const nhacChotVai = (ben, goc) => {
  const sg = ben === 'L' ? -1 : 1;
  const r = (goc * Math.PI) / 180, c = Math.cos(r), sn = Math.sin(r);
  const dx = sg * (CHOT_VAI.x - UC_DON.x), dy = CHOT_VAI.y - UC_DON.y;   // chốt so với tâm xoay: (±27, 8)
  return { x: dx * c + sg * dy * sn - dx, y: -sg * dx * sn + dy * c - dy };
};

// Chỉnh sáng một mã màu: k < 0 tối đi, k > 0 sáng lên (0…1 = pha về trắng).
// Có nó thì nhân vật chỉ cần khai MỘT màu môi, ba màu còn lại của miệng suy ra.
const chinhSang = (c, k) => {
  const s = c.replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map((x) => x + x).join('') : s, 16);
  const v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((u) => (k < 0 ? u * (1 + k) : u + (255 - u) * k));
  return '#' + v.map((u) => Math.round(clamp(u, 0, 255)).toString(16).padStart(2, '0')).join('');
};

// Pha hai màu theo tỉ lệ k. Cần cho màu lưỡi: pha màu môi về TRẮNG cho ra tím
// xám (môi vốn đã đục), pha về một sắc hồng ấm mới ra đúng cái lưỡi.
const tron = (a, b, k) => {
  const ph = (c) => { const t = c.replace('#', ''); const n = parseInt(t.length === 3 ? t.split('').map((x) => x + x).join('') : t, 16);
                      return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const [x, y] = [ph(a), ph(b)];
  return '#' + x.map((u, i) => Math.round(u + (y[i] - u) * k).toString(16).padStart(2, '0')).join('');
};

// Màu trong bảng màu phải là mã hex (#rgb hoặc #rrggbb), hoặc null với khoá cho phép tắt
// (vd. `vien`). Tên màu CSS như 'red' KHÔNG dùng được: các màu tối/sáng đi kèm được tính
// bằng số học trên mã hex, tên màu sẽ ra NaN và hỏng hình mà không báo gì.
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
function assertColors(palette, where) {
  const bad = Object.entries(palette).filter(([, v]) => v !== null && !(typeof v === 'string' && HEX_COLOR.test(v)));
  if (bad.length) throw new Error(`[character] ${where}: colours must be hex (#rgb / #rrggbb) — invalid: ${bad.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')}`);
}

/* ---------------------------------------------------------------- NHÂN VẬT
 * Mỗi nhân vật là một object định nghĩa màu sắc + các mảnh SVG "thay được":
 *   mau       : bảng màu (ghi đè lên MAU_MAC_DINH)
 *   toc(p,m)  : tóc — PHẢI có <g id="${p}-tocTruoc"> (mái + chỏm, rig dịch theo mặt khi xoay).
 *               Tuỳ chọn <g id="${p}-tocBui">: búi/đuôi tóc, rig đẩy nó về phía GÁY khi xoay.
 *               Phần tóc sau đầu và tóc gáy do rig tự sinh từ `khuon` (xem apDung) —
 *               <g id="${p}-tocSau"> của bản cũ vẫn được nhận nhưng bị ẩn.
 *   coAo(p,m) : cổ áo, vẽ đè lên cổ (toạ độ hông: cổ ở y≈-100)
 *   phuKien(p,m): phụ kiện trên thân áo (ống nghe, túi, huy hiệu…), vẽ sau áo, trước cổ
 *   giay(p,ben,m,ong): giày nhìn thẳng, PHẢI có id="${p}-ban${ben}"
 *   net(p,m)  : nét trang điểm thêm trên mặt (lông mi, môi…), vẽ sau mắt/mày
 * Thêm nhân vật mới: RigSVG.dangKy('ten', { ...NV_MAC_DINH, mau: {...}, toc: ... })
 * Bộ xương, khớp, động tác dùng chung — chỉ "da" đổi.
 */
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
  // Phần phụ kiện VẮT QUA VAI (ống nghe, dây thẻ…): vẽ thêm một lần nữa ĐÈ LÊN
  // tay áo, cắt tới ngang gấu tay áo. Thiếu nó thì nắp tay áo — vẽ sau thân —
  // phủ lên đoạn dây chạy qua vai, nhìn như ống nghe luồn dưới áo. Chỉ đè tới
  // gấu chứ không đè cả cánh tay: cẳng tay và bàn tay đưa ra trước ngực thì
  // vẫn phải nằm TRÊN ống nghe.
  phuKienTren: () => '',
  // RÂU (ria, râu quai nón), toạ độ tâm đầu. Vẽ SAU kính và các nét thêm, TRƯỚC miệng — nên
  // râu phủ được cả cằm lẫn môi trên mà miệng vẫn hiện. Khác `net()`: không co theo cỡ mắt.
  beard: () => '',
  // MŨ đội đầu (mũ mổ, mũ y tá…), toạ độ tâm đầu như `toc()`. Vẽ TRÊN mọi lớp tóc,
  // kể cả mảng tóc gáy rig tự sinh lúc xoay — để mũ trong `toc()` thì quay nghiêng
  // là mảng tóc gáy quét một vệt đen chéo qua mũ. Rig dịch và co nó cùng với tóc.
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
  // Tỉ lệ TAY, đi qua transform nên đổi lúc chạy được (trang cài đặt kéo là
  // thấy). Chibi thì tay ngắn và mập: 0.72 / 0.72 / 1.35; tay dài tới háng là
  // tỉ lệ người lớn, không phải chibi.
  daiCanhTay: 1,     // chiều dài cánh tay (vai → khuỷu)
  daiCangTay: 1,     // chiều dài cẳng tay (khuỷu → cổ tay)
  dayTay: 1,         // bề dày cả cánh lẫn cẳng (tay áo dày theo)
  coBanTay: 1,       // cỡ bàn tay
  // Tỉ lệ CHÂN, cũng qua transform. `coChan` (ở trên) co CẢ chân kể cả bàn
  // chân — đó là núm chibi tổng; năm số này chỉnh từng phần, bàn chân giữ cỡ.
  daiDui: 1,         // chiều dài đùi (hông → gối)
  daiOng: 1,         // chiều dài ống chân (gối → cổ chân)
  dayChan: 1,        // bề dày cả đùi lẫn ống
  cachChan: 14,      // nửa khoảng cách hai chân (px, từ tim hông)
  coBanChan: 1,      // cỡ bàn chân / giày
  // TAY ÁO (toạ độ chốt vai). Gốc bó sát cánh tay, gấu chỉ là ranh màu; áo
  // blouse thật rộng, loe ra, gấu xéo và có viền — bốn số này cho đúng cái đó.
  daiTayAo: 1,       // chiều dài tay áo (1 = gấu ngoài ở 24px dưới chốt)
  xeoTayAo: 6,       // gấu xéo: phía ngoài thấp hơn phía trong bao nhiêu px
  rongTayAo: 1,      // độ rộng gấu so với vai (>1 = loe)
  vienGau: 0,        // bề dày nét viền gấu (px, 0 = không viền)
  mauGau: null,      // màu nét gấu tay áo (null = tự tối đi từ màu áo)
  netGau: null,      // stroke-dasharray của nét gấu (null = nét liền)
  lechGau: 0,        // nét gấu thụt lên khỏi mép vải bao nhiêu đơn vị (0 = nằm đúng trên mép)
  boGocTayAo: 0,     // bán kính bo góc TRONG của gấu tay áo (0 = góc nhọn như cũ)
  // TAY ÁO DÀI (áo blouse, áo khoác): cả cánh lẫn cẳng tay tô màu áo, chỉ bàn tay
  // là da, cổ tay có một nét măng-sét. Khi bật, nhóm tay cũng được lọc viền như
  // quần áo — tay trắng đan trước áo trắng mà không viền là tan vào thân áo.
  tayDai: false,
  // Khối SỌ SAU (lộ ra khi xoay nghiêng) tô bằng màu nào trong bảng màu. Mặc định
  // là tóc; nhân vật đội mũ trùm đầu thì khai tên màu mũ, không thì quay nghiêng
  // là một búi tóc đen thò ra sau mũ.
  mauSoSau: 'toc',
  // Tóc phía SAU ĐẦU do rig tự sinh (khối sọ sau và mảng tóc gáy lộ ra khi quay):
  //   'full'  phủ cả đầu (mặc định)        'low'   chỉ từ ngang tai trở xuống — hói đỉnh
  //   'none'  không có — đầu trọc
  // Không có núm này thì đầu hói vẽ đẹp lúc nhìn thẳng, quay nghiêng là mọc lại tóc kín đầu.
  backHair: 'full',
  // DÁNG CÒNG 0…1: thân ngắn lại một chút, đầu chúi xuống giữa hai vai; quay nghiêng thì cả
  // thân ngả về trước. (`than` trong trạng thái chỉ nghiêng SANG BÊN, không ra được dáng này.)
  stoop: 0,
  // VÁY / TẠP DỀ — lớp trang phục DƯỚI HÔNG, rig tự vẽ theo hai đùi nên nó xoè ra khi bước,
  // ngắn lại khi ngồi và hẹp đi khi quay nghiêng. `null` = không có.
  //   { kind: 'skirt' | 'apron', length: 1, flare: 4 }
  //   length  tính bằng chiều dài đùi: 0.6 giữa đùi · 1 ngang gối · 1.5 giữa ống chân
  //   flare   gấu rộng hơn hông bao nhiêu đơn vị mỗi bên
  // Màu lấy từ `mau.skirt`, không khai thì theo màu áo.
  skirt: null,
  // ĐỒ VẬT CẦM TAY: hàm vẽ trong hệ toạ độ CỔ TAY (lòng bàn tay quanh (0, 12), ngón chỉ xuống
  // +y). Vẽ đè lên bàn tay, đi theo cổ tay. Hiện/ẩn bằng trạng thái `itemL` / `itemR`.
  heldItemL: () => '', heldItemR: () => '',
  damSuon: 0.45,     // độ đậm mảng tối hai bên sườn áo
  // Khuôn mặt: bảy tham số của `veKhuonMat`, không phải đường vẽ tay. Bộ số
  // dưới đây DÒ RA từ chính đường cũ (`M -44 0 A 44 44 …`) bằng tìm kiếm lưới:
  // sai lệch ngang lớn nhất 0.99px trên khuôn mặt rộng 88px.
  khuon: { rong: 44, cao: 44, cam: 51, yRong: 0, tranVuong: -0.06, hamVuong: -0.08, rongTran: 1.06, rongCam: 1.1 },
  // `dau` vẫn còn để nhân vật nào muốn vẽ tay thì ghi đè — nhưng mặc định thì
  // sinh từ `khuon`, vì bảy số chỉnh được còn một chuỗi path thì không.
  dau: (m, nv) => veKhuonMat(nv.khuon),
  matX: 16, matY: -6, mayY: -22, maY: 16, maX: 24, miengY: 22, moiRong: 3, taiX: 43, maRong: 8, miengRong: 1, tocLech: 3, netLech: 18, buiLech: 12,   // bố cục mặt (toạ độ tâm đầu)
  matCo: 1,          // cỡ mắt, nhân vào cỡ đã vẽ trong slot `mat()`
  // Mũi: LỆCH và CỠ, không phải toạ độ tuyệt đối — hình mũi vẽ tay trong slot
  // `mui()` đã tự đặt chỗ, ở đây chỉ dịch nó đi so với chỗ ấy. Đặt tuyệt đối
  // thì mỗi nhân vật một mốc khác nhau, con số trên thanh trượt vô nghĩa.
  muiY: 0, muiCo: 1,
  // `net()` (kính, lông mi, môi kẻ…) BÁM THEO MẮT khi mắt đổi chỗ hoặc đổi cỡ.
  // Đây là một phán đoán, không phải luật: trong repo này `net()` chỉ dùng để
  // vẽ kính, mà kính rời khỏi mắt thì nhìn ra hỏng ngay. Nhân vật nào vẽ thứ
  // khác vào đó — nốt ruồi, son môi — thì đặt `netTheoMat: false`.
  netTheoMat: true,
  mui: (m) => `<path d="M -3 -6 Q -6 6 2 8" stroke="${m.daToi}" stroke-width="2" stroke-linecap="round" fill="none"/>`,
  // Chân mày: tham số, không phải đường vẽ tay. Mặc định đúng bằng nét kẻ cũ
  // (nửa dài 10.5, dày 3, vòm 2.25, dày đều) nên nhân vật cũ không đổi hình.
  may: { dai: 10.5, day: 3, cong: 2.25, thon: 0, xech: -2.5 },
  mayX: null,        // khoảng cách hai chân mày; bỏ trống thì lấy đúng `matX`
  vien: null,        // màu viền nét (null = kiểu phẳng không viền)
  vienRong: 2.2,
  ao: () => 'M -28 6 L -30 -40 Q -36 -78 -35 -88 Q -30 -97 -20 -101 Q -10 -105 0 -105 Q 10 -105 20 -101 Q 30 -97 35 -88 Q 36 -78 30 -40 L 28 6 Q 0 13 -28 6 Z',   // đường bao thân áo (toạ độ hông)
  suon: 'M -28 6 Q -30 -20 -31 -44 Q -35 -70 -30 -90 Q -31 -60 -25 -20 Q -24 -6 -28 6 Z',   // mảng tối bên sườn, phải nằm TRONG `ao`
};

/* ------------------------------------------------ BỘ SCRUBS CỦA BÁC SĨ THÚ Y
 * Mọi con số dưới đây ĐO từ ảnh mẫu của bộ đồ (không kèm trong repo — ảnh mẫu bộ
 * đồ), không ước lượng bằng mắt. Ảnh mẫu và rig KHÔNG cùng tỉ lệ: khớp theo
 * bề ngang thì 1px = 0.168 đơn vị, khớp theo chiều cao thì 1px = 0.273 —
 * người trong rig là chibi, thân ngắn hơn bản vẽ. Nên toạ độ NGANG quy đổi
 * bằng 0.168, toạ độ DỌC bằng 0.273, còn vật tròn (loa ống nghe) thì giữ
 * tròn theo bề ngang. Lấy một hệ số duy nhất cho cả hai là túi ngực thành
 * hình chữ nhật đứng và loa ống nghe thành quả trứng.
 */
// Chỉ may và ống nghe KHÔNG cùng một màu tím, dù nhìn qua thì tưởng thế.
// Trung vị đo riêng từng vùng trong ảnh mẫu: ống nghe #8c4680 (nét dày nên ra
// đúng màu chỉ), còn đường chỉ chỉ dày 0.55 đơn vị nên hoà với vải và hiện ra
// #5d3355. Lấy màu ống đem đi may thì đường chỉ sáng gắt hẳn so với ảnh mẫu.
const CHI_TIM = '#7d4472';        // chỉ may — hạ sáng cho khớp bề dày nét thật vẽ được
const ONG_TIM = '#8c4680';        // ống nghe
// Chỉ may MẢNH hơn viền gấu nhiều. `vienGau` vốn là knob cho VIỀN vải (các bộ
// số đã lưu để 1.6…2.2), còn chỉ may trong ảnh mẫu chỉ 0.55 đơn vị. Nhân vật
// nào khai `netGau` — tức gấu tay áo là đường chỉ chứ không phải viền — thì
// bề dày lấy `vienGau` nhân hệ số này, nên knob cũ vẫn chỉnh được (kể cả tắt
// hẳn bằng 0) mà không phải dò lại từ đầu.
const MANH_CHI = 0.5;
const rongGau = (nv) => nv.vienGau * (nv.netGau ? MANH_CHI : 1);

// Thân áo chữ A: hóp ở eo (±25 tại y −27) rồi xoè dần ra gấu (±33 tại y +21),
// gấu võng xuống giữa. Bản cũ thẳng đuột ±30 từ nách tới gấu.
const AO_BS = 'M -33 21 Q 0 30 33 21 Q 30.5 2 27 -14 Q 24 -30 26 -42 Q 27 -70 35 -88'
            + ' Q 30 -97 20 -101 Q 10 -105 0 -105 Q -10 -105 -20 -101 Q -30 -97 -35 -88'
            + ' Q -27 -70 -26 -42 Q -24 -30 -27 -14 Q -30.5 2 -33 21 Z';
// Hai dải tối ôm sát mép áo — bám ĐÚNG đường bao mới, thụt vào 5. Dùng lại
// dải cũ (vẽ cho thân thẳng) thì nó lơ lửng giữa ngực khi áo xoè ra.
const SUON_BS = ['L', 'R'].map((b) => { const g = b === 'L' ? -1 : 1;
  return `M ${g * 35} -88 Q ${g * 27} -70 ${g * 26} -42 Q ${g * 24} -30 ${g * 27} -14`
       + ` Q ${g * 30.5} 2 ${g * 33} 21 L ${g * 28} 22 Q ${g * 25.5} 3 ${g * 22} -13`
       + ` Q ${g * 19.5} -29 ${g * 21} -42 Q ${g * 22} -68 ${g * 30} -86 Z`; }).join(' ');

// Chỉ may: nét tím ĐỨT QUÃNG. Cùng một hàm cho gấu áo, hai túi hông và túi
// ngực nên ba chỗ không bao giờ lệch bước chỉ nhau.
const chiMay = (d, m, rong = 1.05) =>
  `<path d="${d}" stroke="${m.phuKien}" stroke-width="${rong}" fill="none"
         stroke-dasharray="3 2.6" stroke-linecap="round"/>`;

// Túi hông: miệng túi chạy TỪ đường sườn vào rồi bổ thẳng xuống gấu. Nét đen
// là mép vải, nét tím là đường chỉ, thụt vào trong 1.5. Cả hai bị `aoCat` xén
// nên đầu trên luôn dừng đúng ở mép áo dù áo có xoè rộng hẹp thế nào.
const tuiHong = (ben, m) => { const g = ben === 'L' ? -1 : 1; return `
          <path d="M ${g * 28} -15 Q ${g * 21.5} -8 ${g * 17} -3 Q ${g * 16} 10 ${g * 15.5} 26"
                stroke="${m.vienNet}" stroke-width="1.9" fill="none" stroke-linecap="round"/>
          ${chiMay(`M ${g * 26} -12 Q ${g * 20.5} -6.5 ${g * 15.2} -2 Q ${g * 14.2} 10 ${g * 13.7} 23`, m)}`; };

// Túi ngực: hình khiên — hai cạnh thẳng rồi đáy vát vào một mũi nhọn ở giữa.
// Ảnh mẫu để túi ở x 7.5…23.2; thu mép PHẢI về 22.5 để nó không chui xuống
// dưới tay áo (gấu tay áo hạ tới y −57, mép trong tay áo ở x 21.5).
const tuiNguc = (m) => `
        <path d="M 7.5 -68 h 13 a 2 2 0 0 1 2 2 v 19 l -8.5 6 l -8.5 -6 v -19 a 2 2 0 0 1 2 -2 z"
              fill="${chinhSang(m.ao, 0.05)}" stroke="${m.vienNet}" stroke-width="1.6" stroke-linejoin="round"/>
        ${chiMay('M 8.5 -66 h 11 a 1 1 0 0 1 1 1 v 16.5 l -6.5 4.6 l -6.5 -4.6 v -16.5 a 1 1 0 0 1 1 -1 z', m, 1)}
        ${'__HUYHIEU__'}`;

// Ống nghe: hai ống tím vắt qua cổ. Ống PHẢI đổ xuống loa (đĩa tròn ngay trên
// túi ngực); ống TRÁI đổ xuống bộ tai nghe — hai nhánh bạc cong ra rồi chụm
// lại, đầu là hai nút tai. Bản cũ đặt loa bên trái và bỏ hẳn tai nghe, thành
// ra hai cái đĩa treo hai bên không nối vào đâu.
//   `pathLength=100` + `dasharray "0 34 66 0"` = tô 34%…100% của nhánh, tức
// đoạn dưới màu bạc; đoạn trên để lộ nét tím vẽ sẵn bên dưới. Cắt bằng tỉ lệ
// nên đổi dáng nhánh thì chỗ giao tím–bạc tự đi theo.
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

// Bác sĩ thú y (kiểu chibi): đầu to, mắt to nâu có ánh sáng, tóc đen búi bóng, scrubs xám đậm
// viền tím, túi ngực có huy hiệu, ống nghe, giày bệt, tay đan trước bụng khi đứng.
const NV_BAC_SI_THU_Y = {
  ...NV_MAC_DINH,
  ten: 'Bác sĩ thú y',
  // BỘ SỐ ĐẸP NHẤT đã dò (đây là "mặc định gốc" mà nút Đặt lại của studio trả về).
  // Dáng thanh hơn bản chibi đầu tiên: đầu nhỏ lại một nấc, chân dài ra (đùi 1.4,
  // ống 1.25 trên nền `coChan` 0.68), tay mảnh và cẳng tay ngắn để hai bàn tay đan
  // nhau trước bụng chứ không thõng xuống háng, tay áo rộng và dài hơn.
  coDau: 1.37, coThan: 0.94, coChan: 0.68, dauLech: 9,
  daiCanhTay: 1.09, daiCangTay: 0.7, dayTay: 0.68, coBanTay: 0.95,
  daiDui: 1.4, daiOng: 1.25, dayChan: 1, cachChan: 14, coBanChan: 1,
  daiTayAo: 1.3, xeoTayAo: 1, rongTayAo: 1.3,
  may: { dai: 10, day: 3.6, cong: 2, thon: 0.45, xech: 1 },
  khuon: { rong: 50, cao: 54, cam: 56, yRong: -6, tranVuong: 0.1, hamVuong: -0.05, rongTran: 1.06, rongCam: 1.1 },   // dò từ path cũ, lệch tối đa 1.26px
  matX: 20, matY: 2, mayY: -18, maX: 31, maY: 24, miengY: 30, moiRong: 1.2, taiX: 51, maRong: 10, miengRong: 1.45, tocLech: 5, netLech: 21, buiLech: 15,
  mui: (m) => `<path d="M -1 8 q -3 4 1 5" stroke="${m.daToi}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
  // Bề dày viền phải BẰNG nét vẽ sẵn trong ảnh đầu, không phải một số chọn cho
  // đẹp. Đo trên bản dựng thật (nền trắng, deviceScaleFactor 4): nét quanh tóc
  // của bản vẽ mẫu dày 8px, còn `vienRong` 2.4 cho ra viền 17px quanh cánh tay
  // — dày gấp 2.1 lần. Mặt một cỡ bút, thân một cỡ bút khác thì nhìn ra cánh
  // tay bị kẻ đậm chứ không ra cùng một bản vẽ. 8px ÷ 7.1px-mỗi-đơn-vị = 1.13.
  // Màu #1d0d10 là trung vị nét viền đo trong ảnh mẫu.
  vien: '#1d0d10', vienRong: 1.15,
  huyHieu: 'C+',                                 // chữ trên túi ngực ('' = dấu chân thú)
  // Gấu tay áo không phải nét viền vải mà là ĐƯỜNG CHỈ MAY — cùng màu tím với
  // chỉ ở gấu áo và hai túi, nên phải đứt quãng chứ không liền.
  mauGau: CHI_TIM, netGau: '3 2.6', lechGau: 7, vienGau: 2.5, boGocTayAo: 6,
  damSuon: 0.34,
  nghi: { batL: 19, batR: 19, cangL: -97, cangR: -97, cuoi: 1, mieng: 0.6, mayL: 0.15, mayR: 0.15 },
  // Sáu màu vải đo TRUNG VỊ từ ảnh mẫu chứ không ước lượng:
  // thân áo và quần CÙNG một mã (#4f5b64) — trong ảnh mẫu chúng chỉ tách nhau
  // nhờ nét viền, nên bỏ viền đi là hai mảnh dính làm một.
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
  // CỔ CHỮ V BẮT CHÉO (surplice), đo từ ảnh mẫu: KHÔNG phải một chữ V mà là
  // hai vạt áo vắt qua nhau. Mép trong hai vạt cắt nhau ở (0,−79) rồi mỗi mép
  // còn thò tiếp một đoạn ngắn xuống dưới; mép ngoài mới là chữ V khép ở
  // (0,−68). Vẽ đúng một chữ V thì mất hẳn cái nút thắt ở đáy cổ.
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
// Chữ trên túi ngực căn theo TÂM TÚI (x 14) chứ không phải mép: túi đổi bề
// rộng thì chữ tự ở giữa. Ảnh mẫu để chữ cao ~10.6 đơn vị, gần kín lòng túi.
NV_BAC_SI_THU_Y.phuKien = ((goc) => (p, m, nv) => goc(p, m).replace('__HUYHIEU__',
  nv && nv.huyHieu
    ? `<text x="14" y="-49.5" font-family="Arial, sans-serif" font-size="12" font-weight="800" fill="#fff" text-anchor="middle" data-layout-ignore="" data-layout-allow-occlusion="">${nv.huyHieu}</text>`     // chữ là HOẠ TIẾT trên áo, không phải chữ để đọc — báo cho bộ kiểm bố cục của HyperFrames
    : `<g fill="#fff" transform="translate(14 -54)"><ellipse cx="0" cy="2.2" rx="4.4" ry="3.6"/><circle cx="-5" cy="-2.8" r="1.8"/><circle cx="-1.7" cy="-5" r="1.8"/><circle cx="1.7" cy="-5" r="1.8"/><circle cx="5" cy="-2.8" r="1.8"/></g>`))(NV_BAC_SI_THU_Y.phuKien);

class RigSVG {
  static KHUNG = KHUNG;
  static NGHI = NGHI;
  // `enter`/`exit` đã bỏ: hai động tác duy nhất DỜI nhân vật theo phương ngang
  // (đo được 262 và 300 đơn vị) nên chúng chạy ra ngoài khung hình — chính vì
  // thế các công cụ đo khung hình phải lọc chúng ra khỏi phép đo.
  // `walk` cũng bỏ: nó không dời chỗ nhưng QUAY NGƯỜI sang ngang (`huong` 1)
  // rồi bước, nên nhìn ra đi ngang. Ba động tác bước còn lại (`march`,
  // `stroll`, `stepInPlace`) dậm tại chỗ và vẫn nhìn thẳng, `walkForward`/
  // `walkAway` thì đi xa–gần bằng `co` chứ không sang ngang.
  // `wave` bỏ theo yêu cầu, không phải vì dịch ngang (nó dịch ngang 0).
  static DONG_TAC = ['idle', 'wave', 'thumbsUp', 'point', 'present', 'nod',
                     'shake', 'shrug', 'march', 'stroll', 'stepInPlace', 'walkForward', 'walkAway',
                     'speak', 'explain', 'worry', 'express', 'turn', 'sit', 'cheer'];
  // Ba động tác xoay người sang ngang (`huong` 1). Để riêng, không gộp vào
  // `DONG_TAC`: hai công cụ đo ở trên quét `DONG_TAC` và giả định nhân vật
  // đứng trong khung. Trang thử và trang chỉnh liệt kê cả hai danh sách.
  static DI_NGANG = ['walk', 'enter', 'exit'];
  // Động tác đổi THẾ ĐỨNG và giữ nguyên thế ấy cho các động tác sau (không khép về nghỉ).
  static STANCE = ['sitDown', 'standUp', 'face', 'hideItem', 'showItem'];
  /** Gieo hạt cho mọi thứ ngẫu nhiên (chớp mắt, khẩu hình, cử chỉ). `null` = trả về `Math.random`. */
  static gieo(hat) { gieoHat(hat); }
  static #dem = 0;
  /** Tên màu công khai → khoá màu nội bộ. `index.js` gán bảng này lúc nạp thư viện. */
  static COLOR_ALIASES = {};
  static NHAN_VAT = { default: NV_MAC_DINH, vet: NV_BAC_SI_THU_Y };
  static dangKy(ten, dinhNghia) { RigSVG.NHAN_VAT[ten] = { ...NV_MAC_DINH, ...dinhNghia }; return RigSVG.NHAN_VAT[ten]; }

  constructor(host, nhanVat = 'default') {
    const nv = typeof nhanVat === 'string' ? RigSVG.NHAN_VAT[nhanVat] : nhanVat;
    if (!nv) throw new Error(`[character] no character "${nhanVat}"`);
    this.host = host;
    this.nv = { ...NV_MAC_DINH, ...nv };
    // Giữ riêng phần màu nhân vật ĐÃ KHAI, tách khỏi phần rig tự suy. `doiMau`
    // cần biết chỗ nào là khai tay: đổi màu tóc thì chân mày đi theo, trừ khi
    // nhân vật đã khai màu mày riêng.
    this.mauKhai = { ...(nv.mau || {}) };
    this.#suyMau();
    // Mốc NGANG trên mặt (tai, mắt, má, mày) ghi lại dưới dạng TỈ LỆ với bề
    // rộng mặt, để `doiKhuonMat` bóp mặt hẹp lại thì tai không lơ lửng ngoài
    // má và hai mắt không dạt ra sát viền.
    // Ghi theo BỀ NGANG TẠI CHÍNH CAO ĐỘ CỦA NÓ, không theo `rong`: má nằm
    // trong vùng hàm đã thu lại, lấy tỉ lệ với chỗ rộng nhất là mặt V-line kéo
    // má văng ra ngoài cằm.
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

  // `rig.s` là một Proxy: hễ có ai GHI vào trạng thái thì hẹn vẽ lại ở cuối lượt chạy
  // hiện tại (microtask). Timeline vẫn gọi `apDung` qua `onUpdate` như cũ — lớp này để
  // phòng trường hợp bộ dựng video tua bằng `seek()`, vốn TẮT mọi callback của GSAP:
  // không có nó thì trạng thái đổi mà hình đứng yên. Vẽ lại hai lần trong một lượt
  // không sao, `apDung` chỉ là hàm của trạng thái.
  #choVe = false;
  #theoDoi(o) {
    return new Proxy(o, { set: (dich, k, v) => {
      dich[k] = v;
      if (!this.#choVe && this.el) { this.#choVe = true; queueMicrotask(() => { this.#choVe = false; this.apDung(); }); }
      return true;
    } });
  }

  // Bảng màu đang dùng = mặc định + phần đã khai + phần SUY RA từ đó.
  #suyMau() {
    const m = { ...MAU_MAC_DINH, ...this.mauKhai };
    // `mau.vienNet` KHÔNG phải `mau.vien`. `vien` bật bộ lọc dilate trên cả
    // nhóm, nên nó chỉ hợp với hình phẳng không có nét bên trong; `vienNet`
    // chỉ là màu để vẽ nét — mép túi, cổ áo, ống nghe — bằng stroke thật.
    if (!m.vienNet) m.vienNet = chinhSang(m.ao, -0.62);
    // Ba màu còn lại của miệng suy từ màu môi, để nhân vật cũ không phải khai
    // thêm gì mà vẫn có khoang/răng/lưỡi. Khai tay thì tôn trọng khai báo.
    if (!m.miengToi) m.miengToi = chinhSang(m.mieng, -0.45);
    if (!m.luoi) m.luoi = tron(m.mieng, '#e8848f', 0.62);
    if (!m.rang) m.rang = '#fffaf4';
    if (!m.may) m.may = m.toc;
    // Hai màu mà bộ trang phục và kiểu tóc dựng sẵn đọc nhưng nhân vật `default` không khai: màu
    // nhấn (dây buộc tóc, thẻ tên, cà vạt) và vệt sáng trên tóc. Thiếu là ra `fill="undefined"`.
    if (!m.phuKien) m.phuKien = '#d6453d';
    if (!m.tocSang) m.tocSang = chinhSang(m.toc, 0.22);
    // Bí danh CÔNG KHAI (tiếng Anh) cho từng màu, để hàm vẽ của nhân vật tuỳ chỉnh đọc
    // được `c.hair`, `c.top`… Bảng bí danh do `index.js` nạp vào; rig không tự biết nó.
    for (const [alias, key] of Object.entries(RigSVG.COLOR_ALIASES)) if (key in m && !(alias in m)) m[alias] = m[key];
    this.mau = this.nv.mau = m;
  }

  // Dựng (lại) toàn bộ SVG từ `this.nv`. An toàn giữa chừng một động tác:
  // tween GSAP trỏ vào `this.s`, không trỏ vào DOM, nên trạng thái và timeline
  // còn nguyên — chỉ các phần tử là mới. Mọi thứ đã chỉnh bằng `doi*` cũng
  // còn, vì chúng đều ghi vào `nv` và markup dựng lại từ `nv`.
  #dungLai() {
    // Tay nào có đồ vật (hàm vẽ trả về thứ gì đó) — để bàn tay giữ dáng nắm và động tác một tay chọn tay rảnh.
    this.holds = { L: !!String(this.nv.heldItemL(this.id, this.mau, this.nv) || '').trim(), R: !!String(this.nv.heldItemR(this.id, this.mau, this.nv) || '').trim() };
    const khung = this.svg && this.svg.getAttribute('viewBox');   // trang chỉnh có thể đang zoom vào mặt
    this.host.innerHTML = this.#dungSVG();
    this.svg = this.host.querySelector('svg');
    if (khung) this.svg.setAttribute('viewBox', khung);
    this.#layPhanTu();
    this.apDung();
  }

  /**
   * Đổi MÀU sau khi đã dựng — trả về bảng màu đang dùng.
   *
   *   rig.doiMau({ ao: '#d65a4a' })          // tay áo, cổ áo, đệm vai, sườn đi theo
   *   rig.doiMau({ toc: '#6b4b2f' })         // chân mày đi theo nếu chưa khai `may`
   *
   * Màu nằm rải trong markup của hơn chục slot (`toc()`, `coAo()`, `phuKien()`,
   * tay áo, đệm vai…), nên không có cách nào "tô lại" từng phần tử mà không sót:
   * hai nút đổi màu của trang thử cũ sửa thẳng DOM và bỏ quên tay áo, cổ áo,
   * chân mày. Ở đây dựng lại cả SVG từ bảng màu mới.
   *
   * Màu TỐI đi kèm (`aoToi`, `daToi`, `tocSang`) tự suy theo màu chính nếu
   * lần gọi này không truyền nó — đổi áo sang đỏ mà bóng sườn vẫn xanh thì hỏng.
   */
  doiMau(kieu = {}) {
    // Nhận cả tên màu công khai lẫn khoá nội bộ.
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

  /* ------------------------------------------------------------------ SVG */

  #tay(ben) {
    const p = `${this.id}-tay${ben}`, da = this.mau.da, toi = this.mau.daToi;
    // Bàn tay dựng từ khối tròn không viền: lòng bàn tay + 4 ngón khép nhẹ, ngón cái ở
    // phía trong (về thân). Vẽ cho tay phải (ngón cái ở -x), tay trái lật gương.
    const ngon = (x, dai, xoay) =>
      `<rect x="${x}" y="17" width="4.8" height="${dai}" rx="2.4" fill="${da}" transform="rotate(${xoay} ${x + 2.4} 17)"/>`;
    // Ngón thả lỏng: cong dần vào lòng bàn tay (về phía ngón cái), đầu ngón tròn.
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
    // Cánh tay thon dần từ vai xuống cổ tay. Khớp da là hình tròn cùng màu nên
    // không có vết nối — nhưng tâm hạ xuống 4px: nắp tay áo giờ XUÔI (xem
    // `napTayAo`), tròn đặt ngay chốt là đỉnh da ló lên trên vai.
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

  // Góc của BÀN CHÂN so với mặt đất khi nhìn nghiêng (độ; dương = mũi chúc xuống).
  // Chân trụ: gần như áp đất, lăn từ gót (đùi đưa trước) sang mũi (đùi ra sau).
  // Chân đang vung (gối gập): rủ mũi 12° so với ống chân.
  // Một hàm dùng CHUNG cho `apDung` (xoay bàn chân) và `#tuTheDi` (đặt cao độ
  // hông): hai nơi tính riêng thì bàn chân xoay một kiểu còn hông hạ theo kiểu
  // khác, và mũi giày chìm xuống dưới mặt đất — đo được 11 đơn vị ở bản trước.
  static #lanBanChan(dui, ong) {
    const k = clamp(ong / 40, 0, 1);
    return (1 - k) * (Math.max(0, dui) * 1.4 - Math.max(0, -dui) * 0.45) + k * (dui + ong + 12);
  }

  // Màu khối sọ sau. Chỉ theo `mauSoSau` khi nhân vật THẬT SỰ đội mũ (slot `mu` vẽ ra thứ
  // gì đó). Nhân vật dựa trên một nhân vật đội mũ rồi bỏ mũ đi (`mu: () => ''`) thường quên
  // đặt lại `mauSoSau` — và quay nghiêng là sau đầu hiện một mảng màu mũ. Không có mũ thì
  // luôn là màu tóc, khỏi phải nhớ.
  #backSkullColor() {
    const hasHat = String(this.nv.mu(this.id, this.mau, this.nv) || '').trim() !== '';
    return (hasHat && this.mau[this.nv.mauSoSau]) || this.mau.toc;
  }

  #V() { return this.mau.vien ? ` filter="url(#${this.id}-vien)"` : ''; }
  // MẢNG DA (cánh tay, cổ) KHÔNG lọc viền — chỉ quần áo mới có nét.
  //
  // Bộ lọc chạy trên TỪNG NHÓM, nên mỗi nhóm tự bọc một vòng viền quanh mình,
  // kể cả những cạnh nằm đè lên nhóm khác. Hai chỗ hỏng vì thế:
  //   • nhóm tay viền cả CẠNH NÁCH — cạnh nằm trên ngực — ra một nét đen tách
  //     tay áo khỏi thân, nhìn như tay áo dán lên người. Trong ảnh mẫu vai và
  //     tay áo là MỘT khối liền, không có nét nào ngăn giữa.
  //   • nhóm cổ viền quanh hình thang cổ, kể cả phần loe ở đáy nằm trên ngực,
  //     nên trong lòng chữ V hiện một nét đen viền quanh cổ.
  // Bỏ lọc ở đây thì lúc buông tay, viền tay áo VẪN CÒN — đệm vai nằm trong
  // nhóm thân, lúc nghỉ cùng hình với tay áo nên đã vẽ sẵn vòng viền đó.
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
    // Nối chuỗi, KHÔNG dùng template literal trong querySelector: bộ lint của HyperFrames
    // (và bộ đóng gói HTML của nó) từ chối selector có biến nội suy.
    const q = (n) => this.svg.querySelector('#' + this.id + '-' + n);
    this.el = {
      goc: q('goc'), bong: q('bong'), chanG: q('chanG'), than: q('than'), ao: q('ao'), tren: q('tren'), sau: q('sau'), dau: q('dau'),
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

  /* ------------------------------------------------------ đổ trạng thái */

  apDung() {
    const s = this.s, e = this.el;
    // co dãn quanh điểm chạm đất (200,428) để thu nhỏ = lùi xa, phóng to = tiến gần
    const doiChan = this.hangChan();
    // Ngồi (`seat`) hạ cả người xuống đúng bằng phần đùi rút đi (xem chỗ vẽ chân bên dưới).
    // Tính ngay ở đây chứ không để động tác tween `y`: `y` còn là "nhảy lên" và "lùi ra xa",
    // gộp chung thì bóng đổ tụt theo người xuống dưới bàn chân.
    const seatDrop = DAI.dui * this.nv.daiDui * this.nv.coChan * 0.72 * clamp(s.seat, 0, 1);
    e.goc.setAttribute('transform', `translate(${s.x} ${s.y + seatDrop + DOI_Y + doiChan}) translate(200 428) scale(${s.co}) translate(-200 -428)`);
    e.goc.setAttribute('opacity', s.mo);
    // bóng thu lại khi nhấc người lên
    const nhac = clamp(-s.y / 40, 0, 1);
    // `bong` nằm TRONG `goc` nên đã mang sẵn phép dời/co của `goc`. Bản trước
    // chép lại nguyên phép ấy vào đây: bóng bị dời HAI lần — rơi xuống dưới bàn
    // chân đúng `DOI_Y + doiChan` đơn vị và chạy gấp đôi `x` lúc enter/exit.
    // Ở đây chỉ còn phép co riêng của bóng quanh chính tâm bóng, và KÉO NGƯỢC
    // `doiChan`: `goc` hạ cả người xuống chừng ấy để bàn chân chạm nền, tức
    // trong hệ của `goc` bàn chân nằm ở 428 − doiChan chứ không phải 428.
    e.bong.setAttribute('transform', `translate(200 ${428 - doiChan - seatDrop / (s.co || 1)}) scale(${1 - nhac * 0.25} 1) translate(-200 -428)`);   // trừ seatDrop: bóng nằm lại dưới bàn chân
    e.bong.setAttribute('opacity', 0.28 - nhac * 0.12);

    // nhacL/R: gối đưa về phía người xem → chân ngắn lại (rút gọn phối cảnh), hơi xoè ra
    // Xoay người sang bên (huong: 0 = nhìn thẳng, 1 = nghiêng phải khi đi ngang):
    // thân hẹp lại, hai chân/hai vai dồn vào một đường, nét mặt dịch theo hướng nhìn,
    // tay & chân xa hơi tối đi, bàn chân xoay mũi về phía trước.
    const h = s.huong, ah = Math.abs(h);
    const { daiDui, daiOng, dayChan, cachChan, coBanChan } = this.nv;
    e.hongL.setAttribute('transform', `translate(${-cachChan * (1 - ah * 0.7) - ah * 3} 0)`);
    e.hongR.setAttribute('transform', `translate(${cachChan * (1 - ah * 0.7) + ah * 3} 0)`);
    // Tỉ lệ chân: đùi và ống co giãn quanh khớp đầu của nó; bàn chân KHÔNG co
    // theo ống, chỉ dời xuống cổ chân mới rồi phóng theo cỡ riêng quanh cổ chân.
    for (const ben of ['L', 'R']) {
      e['duiHinh' + ben].setAttribute('transform', `scale(${dayChan} ${daiDui})`);
      e['ongHinh' + ben].setAttribute('transform', `scale(${dayChan} ${daiOng})`);
      e['banChanG' + ben].setAttribute('transform',
        `translate(0 ${DAI.ong * daiOng}) scale(${coBanChan}) translate(0 ${-DAI.ong})`);
    }
    // Đi sang TRÁI là ảnh gương: mọi góc khớp đổi dấu, nên phải đưa về quy ước
    // "đi sang phải" (× dấu của h) trước khi hỏi bàn chân đang lăn tới đâu.
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
    // Quay mặt sang phải màn hình thì vai bên TRÁI màn hình xoay về phía người xem, vai
    // bên phải lùi ra sau lưng — nên tay/chân XA là bên cùng phía với hướng quay. (Bản cũ
    // làm ngược: tay gần chui ra sau thân, nhìn như đang quay lưng lại.) Tay xa lùi ra sau
    // thân sớm, lúc nó còn nằm ngoài mép áo, để không "biến mất" giữa ngực.
    const xa = ah > 0.1 ? (h > 0 ? 'R' : 'L') : null;
    for (const ben of ['L', 'R']) {
      const tay = e['bat' + ben], cho = ben === xa ? e.sau : e.tren;
      if (tay.parentNode !== cho) cho.appendChild(tay);
      const mo = ben === (h > 0 ? 'R' : 'L') ? ah : 0;
      // Tối đi bằng CSS `filter`. Thuộc tính CSS ĐÈ lên thuộc tính SVG `filter="url(#…-vien)"` của
      // chính phần tử ấy, nên phải nối bộ lọc viền vào trước — không thì tay / chân xa vừa tối đi
      // vừa mất luôn nét viền.
      for (const limb of [e['chan' + ben], tay]) {
        const outline = limb.getAttribute('filter');
        limb.style.filter = mo ? `${outline ? outline + ' ' : ''}brightness(${1 - mo * 0.28})` : '';
      }
    }
    // Nhìn thẳng thì cả hai tay nằm trong `tren`, và tay nào vẽ SAU thì đè lên tay
    // kia. Tay đang LÀM ĐỘNG TÁC (giơ, gập nhiều hơn) phải nằm trên: bàn tay ấy là
    // thứ đưa ngang qua ngực, để nó dưới tay áo bên kia thì ngón tay bị áo che mất
    // (nắm tay tán thành, ngón cái chui dưới tay áo trái). Hai tay ngang nhau thì
    // tay phải nằm trên — có ngưỡng 8° để lúc hai tay đan nhau không nhấp nháy.
    if (!xa) {
      const diem = (b) => Math.abs(s['bat' + b]) + Math.abs(s['cang' + b]);
      const tren = diem('L') > diem('R') + 8 ? e.batL : e.batR, duoi = tren === e.batL ? e.batR : e.batL;
      if (duoi.compareDocumentPosition(tren) & Node.DOCUMENT_POSITION_PRECEDING) e.tren.appendChild(tren);
    }
    // Lớp phụ kiện vắt vai luôn nằm TRÊN hai tay (vòng lặp trên vừa `appendChild`
    // tay vào cuối nhóm). Xoay nghiêng thì ẩn: lúc ấy tay gần vung ngang qua ngực
    // và phải che được ống nghe, còn bản dưới thân vẫn hiện.
    if (e.tren.lastElementChild !== e.phuKienTren) e.tren.appendChild(e.phuKienTren);
    e.phuKienTren.style.display = ah > 0.12 ? 'none' : '';
    const gan = h > 0 ? e.hongL : e.hongR;                  // chân gần vẽ sau cùng (nằm trên)
    if (e.chanG.lastElementChild !== gan && e.chanG.lastElementChild !== e.skirt) e.chanG.appendChild(gan);
    else if (e.skirt && e.skirt.previousElementSibling !== gan) e.chanG.insertBefore(gan, e.skirt);      // váy luôn nằm trên cả hai chân
    // ---- ĐẦU XOAY NGHIÊNG (3/4). Coi đầu là khối cầu bán kính `khuon.rong`:
    // xoay góc θ thì một điểm ở x0 trên mặt đi tới x0·cosθ + sâu·sinθ. Cả cụm nét mặt
    // vì thế chỉ cần MỘT phép dịch (netLech ≈ R·sinθ) và MỘT phép co ngang (cosθ).
    // Mọi thứ đổi bằng HÌNH HỌC, không bằng opacity: mảng tóc mờ dần đè lên da cho ra
    // một cái bóng xám giữa mặt suốt lúc đang xoay.
    const nv = this.nv, K = nv.khuon, k = mem(ah), sg = h < 0 ? -1 : 1;
    const co = 1 - ah * 0.15, lech = h * nv.netLech;
    e.net.setAttribute('transform', `translate(${lech} 0) scale(${co} 1)`);
    // Má đi theo nét mặt và bị CẮT theo viền mặt: má phía xa trượt ra mép rồi khuất
    // sau đường bao, thay vì tràn ra ngoài tóc.
    for (const [ben, dau] of [['L', -1], ['R', 1]]) {
      const xa = Math.max(0, dau * h);                    // 1 = má này nằm phía mặt đang quay tới
      e['ma' + ben].setAttribute('cx', lech + co * dau * nv.maX);
      e['ma' + ben].setAttribute('rx', nv.maRong * co * (1 - xa * 0.25));
    }
    // Tóc là mảng VẼ TAY, không suy ra được từ bảy tham số — nhưng co giãn cả
    // nhóm theo tỉ lệ mặt thì nó vẫn ôm lấy hộp sọ ở mức đổi vừa phải. Không co
    // thì bóp mặt hẹp là tóc lơ lửng hai bên như đội mũ rộng vành. Đặt ở đây
    // chứ không trong `doiKhuonMat`, để `doiMau` dựng lại SVG mà không mất nó.
    const G = nv.khuonGoc;
    const coToc = `scale(${(K.rong / G.rong).toFixed(4)} ${((K.cao + K.yRong) / (G.cao + G.yRong)).toFixed(4)})`;
    e.tocG.setAttribute('transform', coToc);
    e.muG.setAttribute('transform', `${coToc} translate(${h * nv.tocLech} 0)`);   // mũ đi đúng theo mái tóc
    // Chỏm/mái dịch nhẹ theo mặt; búi tóc nằm sau đỉnh đầu nên đi NGƯỢC lại, về phía gáy.
    e.tocTruoc.setAttribute('transform', `translate(${h * nv.tocLech} 0)`);
    if (e.tocBui) e.tocBui.setAttribute('transform', `translate(${-h * (nv.buiLech + nv.tocLech)} ${ah * 3})`);
    // Sọ sau: một khối tóc nằm SAU khuôn mặt, nhìn thẳng thì khuất hẳn, xoay thì lùi về
    // gáy — đầu người sâu hơn bề ngang mặt, thiếu nó thì nhìn nghiêng đầu dẹt như cái đĩa.
    e.tocLungE.setAttribute('cx', -h * K.rong * 0.3);
    e.tocLungE.setAttribute('cy', -K.cao * 0.22);
    e.tocLungE.setAttribute('rx', K.rong - 1);
    e.tocLungE.setAttribute('ry', K.cao * 0.78 - 1);
    // Hói đỉnh: thêm một khối tóc cùng hình, cắt từ ĐƯỜNG CHÂN TÓC trở xuống.
    const hairline = -K.cao * 0.3;
    e.lowHairClipR.setAttribute('y', hairline);
    if (e.tocLungLow) for (const a of ['cx', 'cy', 'rx', 'ry']) e.tocLungLow.setAttribute(a, e.tocLungE.getAttribute(a));
    // Tóc gáy: mảng tóc phủ phần da sau đường chân tóc. Mép của nó TRƯỢT từ ngoài viền
    // mặt vào tới sau vành tai (cắt theo viền mặt nên nhìn thẳng không lộ gì): từ đỉnh
    // đầu vòng xuống thái dương, nhọn thành tóc mai ngay trước tai, rồi lẩn ra sau tai.
    const xN = -K.rong - 8, tai = -nv.taiX * (1 - 0.18 * k), X = (d) => (xN + (d - xN) * k).toFixed(2);
    e.tocGay.setAttribute('transform', `scale(${sg} 1)`);
    // Mép trên của mảng tóc gáy: đỉnh đầu (tóc đủ), hoặc đường chân tóc (hói đỉnh); trọc thì không vẽ.
    const napeTop = nv.backHair === 'low'
      // Hói đỉnh: mép trước là MỘT đường cong tròn từ chân tóc xuống sau tai — không có mũi tóc mai
      // nhọn như tóc đủ (mũi nhọn cộng với mép trên phẳng trông thành hình ngôi sao sau đầu).
      ? `M ${xN} ${hairline} L ${X(tai + 6)} ${hairline} Q ${X(tai + 10)} ${(hairline + 2) / 2} ${X(tai + 1)} 3`
      : `M ${xN} ${-K.cao - 8} L ${X(-K.rong * 0.1)} ${-K.cao - 8} Q ${X(tai + 15)} ${-K.cao * 0.5} ${X(tai + 7)} -5`;
    e.tocGayP.setAttribute('d', k < 0.001 || nv.backHair === 'none' ? '' :
      `${napeTop} L ${X(tai)} 3 Q ${X(tai - 1)} ${K.cam * 0.3} ${xN} ${K.cam * 0.6} Z`);
    e.suon.setAttribute('opacity', 0.45 * (1 - ah));           // vệt tối sườn chỉ hợp khi nhìn thẳng
    // Tai phía gáy trôi vào trong (nằm đè mép tóc gáy) và lộ vành tai; tai phía mặt
    // trượt vào sau má — cùng màu da nên tự khuất, không cần làm mờ.
    const w4 = beRongTaiY(K, 4);
    for (const [ben, dau] of [['L', -1], ['R', 1]]) {
      const gan = Math.max(0, -dau * h), xa = Math.max(0, dau * h);
      const x = gan ? nv.taiX * (1 - 0.18 * mem(gan)) : nv.taiX + (w4 - 6 - nv.taiX) * mem(xa);
      e['tai' + ben].setAttribute('transform', `translate(${dau * x} 4) scale(${1 - 0.15 * gan - 0.5 * xa} 1)`);
      e['taiNet' + ben].setAttribute('opacity', mem(gan));
    }
    // NGỒI (`seat`): nhìn từ trước, đùi chĩa về phía người xem nên chỉ còn một khúc ngắn, còn
    // ống chân vẫn dài nguyên. Nhóm chân co theo chiều dọc để rút đùi; ống chân là con của nhóm
    // ấy nên nhận phép co NGƯỢC lại cho khỏi ngắn theo. (Khác `nhac`, vốn rút cả chân — dùng cho
    // dậm chân, chỗ đó cả chân nhấc về phía trước.)
    const thighSeen = 1 - clamp(s.seat, 0, 1) * 0.72, shinFix = ` scale(1 ${(1 / thighSeen).toFixed(4)})`;
    e.chanL.setAttribute('transform', `rotate(${s.duiL + s.nhacL * 6}) scale(1 ${(1 - s.nhacL * 0.42) * thighSeen})`);
    e.chanR.setAttribute('transform', `rotate(${s.duiR - s.nhacR * 6}) scale(1 ${(1 - s.nhacR * 0.42) * thighSeen})`);
    e.ongL.setAttribute('transform', `translate(0 ${DAI.dui * daiDui}) rotate(${s.ongL})${shinFix}`);
    e.ongR.setAttribute('transform', `translate(0 ${DAI.dui * daiDui}) rotate(${s.ongR})${shinFix}`);

    // ── VÁY / TẠP DỀ: một tứ giác từ eo xuống gấu, hai góc gấu BÁM theo hai đùi.
    if (e.skirt) {
      const K = this.nv.skirt, thigh = DAI.dui * daiDui, halfLeg = 13 * dayChan, flare = K.flare ?? 4;
      const reach = (K.length ?? 1) * thigh;                     // gấu cách hông bao xa, đo dọc theo chân
      // Điểm trên chân `side` ở cách hông `reach`, lệch ngang `offset` so với trục chân — trong
      // hệ toạ độ nhóm chân. Quá gối thì đi tiếp theo hướng ống chân.
      const along = (side, offset) => {
        const hipX = (side === 'L' ? -1 : 1) * (cachChan * (1 - ah * 0.7) + ah * 3);
        const a = (s['dui' + side] + (side === 'L' ? 1 : -1) * s['nhac' + side] * 6) * RAD;
        const squash = (1 - s['nhac' + side] * 0.42) * thighSeen;                // đùi rút ngắn khi nhấc gối / khi ngồi
        const onThigh = Math.min(reach, thigh) * squash, past = Math.max(0, reach - thigh);
        const b = a + s['ong' + side] * RAD;
        return [hipX + offset * Math.cos(a) - onThigh * Math.sin(a) - past * Math.sin(b), offset * Math.sin(a) + onThigh * Math.cos(a) + past * Math.cos(b)];
      };
      const waist = cachChan * (1 - ah * 0.7) + ah * 3 + halfLeg;
      let L, R, top;
      if (K.kind === 'apron') {
        // Tạp dề chỉ che MẶT TRƯỚC: tấm hẹp hơn hông, quay nghiêng thì dạt về phía bụng và hẹp lại.
        const cL = along('L', 0), cR = along('R', 0), mid = [(cL[0] + cR[0]) / 2 + h * waist * 0.55, Math.max(cL[1], cR[1])];
        const half = waist * 0.66 * (1 - ah * 0.5);
        L = [mid[0] - half - flare * 0.4, mid[1]]; R = [mid[0] + half + flare * 0.4, mid[1]];
        top = [h * waist * 0.5 - half * 0.92, h * waist * 0.5 + half * 0.92];
      } else {
        L = along('L', -(halfLeg + flare)); R = along('R', halfLeg + flare);
        // Hai chân bắt chéo (đang bước nghiêng): gấu vẫn phải đi từ mép trái sang mép phải.
        if (L[0] > R[0]) [L, R] = [R, L];
        const waistTop = waist * (1 - ah * 0.3);                 // thân nhìn nghiêng hẹp hơn hai chân chụm lại
        top = [-waistTop, waistTop];
      }
      const sag = Math.max(L[1], R[1]) + 3.5;
      e.skirt.setAttribute('d', `M ${top[0].toFixed(2)} -4 L ${top[1].toFixed(2)} -4 L ${R[0].toFixed(2)} ${R[1].toFixed(2)} Q ${((L[0] + R[0]) / 2).toFixed(2)} ${sag.toFixed(2)} ${L[0].toFixed(2)} ${L[1].toFixed(2)} Z`);
    }

    // ── DÁNG CÒNG: thân ngắn lại, và khi quay nghiêng thì ngả hẳn về trước (xoay theo hướng nhìn).
    const stoop = clamp(this.nv.stoop || 0, 0, 1);
    // `torsoWidth` kéo cả thân trên ra theo chiều ngang. Đầu nằm trong nhóm thân nên bị kéo theo —
    // chỗ đặt đầu (bên dưới) chia lại cho đúng bằng hệ số ấy để đầu vẫn tròn.
    const wide = clamp(this.nv.torsoWidth || 1, 0.7, 1.6);
    e.than.setAttribute('transform', `translate(${HONG.x} ${HONG.y}) rotate(${s.than + h * stoop * 10}) scale(${this.nv.coThan * wide} ${this.nv.coThan * (1 - stoop * 0.05)})`);
    e.chanG.setAttribute('transform', `translate(${HONG.x} ${HONG.y}) scale(1 ${this.nv.coChan})`);
    // NHẤC VAI — cổ, đầu, hai cánh tay, đệm vai VÀ THÂN ÁO đều dời theo cùng
    // một lượng. Thiếu thân áo ở đây là `shrug()` (vai −9) nhấc đệm vai lên
    // còn thân áo đứng yên, hở ra hai góc nền đen hai bên cổ. Hơi thở cũng
    // nhấc chừng 2.5 nên lỗi ấy còn chớp nhẹ suốt lúc đứng yên, chỉ là nhỏ quá
    // nên không ai để ý.
    const nhacY = -s.tho * 2.5 + s.vai;
    // `suon` và `phuKien` PHẢI mang đúng biến đổi của `ao`: chúng là mảng tối
    // và chi tiết vẽ TRÊN thân áo, lệch một chút là bóng sườn trôi khỏi mép.
    const bienAo = `translate(${h * 2} ${nhacY}) scale(${(1 + s.tho * 0.03) * (1 - ah * 0.4)} 1)`;  // ngực nở khi hít, hẹp khi xoay
    e.ao.setAttribute('transform', bienAo);
    if (e.suon) e.suon.setAttribute('transform', bienAo);
    if (e.phuKien) e.phuKien.setAttribute('transform', bienAo);
    // Cùng biến đổi với thân áo, trừ phần nhấc vai (nhóm `tren` đã mang sẵn). Cắt
    // ở gấu TRONG của tay áo — chỗ dây ống nghe chui ra khỏi nắp tay áo. Hai ô
    // cắt chừa lại dải giữa (|x| < 18): ở đó là cổ áo, và dây phải chui DƯỚI cổ áo.
    e.phuKienTren.setAttribute('transform', `translate(${h * 2} 0) scale(${(1 + s.tho * 0.03) * (1 - ah * 0.4)} 1)`);
    const caoCat = 150 + CHOT_VAI.y + (24 * this.nv.daiTayAo - this.nv.xeoTayAo) * this.nv.daiCanhTay + 2;
    e.vaiCatL.setAttribute('height', caoCat);
    e.vaiCatR.setAttribute('height', caoCat);
    e.tren.setAttribute('transform', `translate(0 ${nhacY})`);
    e.sau.setAttribute('transform', `translate(0 ${nhacY})`);
    e.coAo.setAttribute('transform', `translate(${h * 3} 0) scale(${1 - ah * 0.45} 1)`);   // cổ áo hẹp theo thân, lệch về phía ngực
    // CỔ cũng phải hẹp lại khi xoay — nhưng không đều: thân cổ chỉ thon đi một chút
    // (cổ người nhìn nghiêng gần bằng nhìn thẳng), còn phần CHÂN CỔ loe ra hai vai
    // thì phải thu mạnh, vì hai vai đã dồn về một đường. Để nguyên thì chân cổ rộng
    // ±20 thò ra ngoài bờ vai đã hẹp còn ±12, và hai đầu nét cổ áo lơ lửng trên da.
    const coHep = 1 - ah * 0.2, chanCo = 20 * (1 - ah * 0.5) / coHep, eoCo = 15 - ah * 4;
    e.co.setAttribute('transform', `translate(${h * 3} 0) scale(${coHep} 1)`);
    e.coDa.setAttribute('d', `M -13 -130 L 13 -130 L 13.5 -106 Q ${eoCo} -100 ${chanCo} -96 L ${-chanCo} -96 Q ${-eoCo} -100 -13.5 -106 Z`);
    // Còng lưng: đầu chúi xuống giữa hai vai (cổ ngắn lại) và nhô ra trước khi quay nghiêng.
    e.dau.setAttribute('transform', `translate(${s.dauX + h * (2.5 + stoop * 7)} ${-103 + this.nv.dauLech + s.dauY + stoop * 9}) rotate(${s.dau}) scale(${this.nv.coDau / wide} ${this.nv.coDau})`);
    e.itemL.setAttribute('opacity', clamp(s.itemL, 0, 1));
    e.itemR.setAttribute('opacity', clamp(s.itemR, 0, 1));

    // Đánh tay theo chiều sâu (nhìn từ trước): tay ra trước thì rút ngắn (phối cảnh),
    // khuỷu gập nhiều và hơi khép vào thân; tay ra sau thì gần thẳng, hơi mở ra ngoài.
    const tayTheoSau = (bat, cang, v) => {
      const truoc = Math.max(0, v), sau = Math.max(0, -v);
      return {
        bat: bat - truoc * 5 + sau * 11,
        cang: cang - truoc * 44 - sau * 10,
        co: 1 - Math.abs(v) * 0.26,
      };
    };
    const tL = tayTheoSau(s.batL, s.cangL, s.vungL), tR = tayTheoSau(s.batR, s.cangR, s.vungR);
    // Nhịp vai–cánh tay: cánh tay tự giơ được tới ~45°, cao hơn là bờ vai phải
    // nhấc theo (người thật: xương bả vai xoay). Chốt vai và đệm vai cùng xoay
    // quanh khớp ức–đòn — đệm giữ vòm tay áo luôn có chỗ tựa, còn gấu đệm rút
    // lên (`ghep`) từ 15° tới 65° để không thành một tay áo rỗng treo dưới nách.
    // `bat`/`cang` là góc trong mặt phẳng TRÁN (dang ra hai bên), `vung` là đánh tay theo
    // chiều TRƯỚC–SAU. Thân xoay góc ψ thì phần dang ngang co lại theo cos ψ, phần trước–sau
    // lộ ra theo sin ψ. Bản cũ đọc thẳng `bat`/`cang` thành góc trước–sau khi nghiêng: tay
    // đan trước bụng (cẳng tay gập VÀO) thành khuỷu bẻ ngược ra sau lưng.
    const psi = ah * 90 * RAD, cF = Math.cos(psi), sF = Math.sin(psi) * sg;
    const tayNghieng = (cang, v) => {
      const gap = Math.max(0, -cang) * 0.75;        // gập vào trước bụng → nhìn nghiêng là gập ra TRƯỚC
      return { bat: 24 * v - gap * 0.2, cang: clamp(4 + gap + 6 * v + 16 * Math.max(0, v), 2, 150) };
    };
    const nL = tayNghieng(s.cangL, s.vungL), nR = tayNghieng(s.cangR, s.vungR);
    // Bờ vai chỉ nhấc theo phần giơ tay CÒN THẤY trong mặt phẳng trán (× cos ψ):
    // nhìn nghiêng thì tay đánh trước–sau, không có gì đẩy vai lên.
    const gocVai = { L: GOC_VAI_MAX * mem((Math.abs(tL.bat) * cF - 40) / 110), R: GOC_VAI_MAX * mem((Math.abs(tR.bat) * cF - 40) / 110) };
    const ghep = { L: mem((Math.abs(tL.bat) * cF - 15) / 50), R: mem((Math.abs(tR.bat) * cF - 15) / 50) };
    // Độ lệch thêm theo `ah`, KHÔNG theo `h`: nó tách hai vai (và hai hông ở trên) ra
    // một chút cho khỏi chồng khít lên nhau, quay bên nào cũng phải tách như nhau. Viết
    // theo `h` thì quay trái là hai vai chập lại — dáng đi sang trái không còn là ảnh
    // gương của dáng đi sang phải (lệch đo được 4–6 đơn vị).
    const chotX = { L: -CHOT_VAI.x * (1 - ah * 0.92) - ah * 2, R: CHOT_VAI.x * (1 - ah * 0.92) + ah * 2 };
    // Tay XA nép vào sau thân ở giữa vòng quay. Hai vai dồn vào đều nhau, nên ở góc 3/4 cánh tay
    // xa (đang nằm sau thân) thò ra ngoài mép áo đúng một vệt mảnh kèm bàn tay — trông như một
    // nét vẽ thừa. Kéo chốt vai xa vào thêm, nhiều nhất ở giữa vòng, bằng 0 khi nhìn thẳng / nghiêng hẳn.
    const tuck = Math.sin(Math.PI * Math.min(1, ah)) * 8;
    if (h > 0) chotX.R -= tuck; else if (h < 0) chotX.L += tuck;
    const doiChot = {};
    // Tỉ lệ tay: mỗi đốt co giãn quanh khớp đầu của nó, khớp tiếp theo dời
    // theo chiều dài mới. Đệm vai và đường may co CÙNG tay áo (cùng scale) để
    // lúc nghỉ vẫn trùng khít — tay áo ngắn đi mà đệm không ngắn theo thì đệm
    // thò ra dưới gấu.
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
      // Đường may vai là chi tiết của mặt TRƯỚC: xoay nghiêng thì hai đường dồn về
      // sát cổ và chĩa lên như hai cái sừng, nên cho lặn dần trong nửa đầu vòng xoay.
      e['mayVai' + ben].setAttribute('opacity', 0.85 * (1 - mem(ah * 2)));
    }
    e.batL.setAttribute('transform', `translate(${chotX.L + doiChot.L.x} ${CHOT_VAI.y + doiChot.L.y}) rotate(${tL.bat * cF - sF * nL.bat}) scale(1 ${1 - (1 - tL.co) * cF})`);
    e.batR.setAttribute('transform', `translate(${chotX.R + doiChot.R.x} ${CHOT_VAI.y + doiChot.R.y}) rotate(${-tR.bat * cF - sF * nR.bat}) scale(1 ${1 - (1 - tR.co) * cF})`);
    e.cangL.setAttribute('transform', `translate(0 ${DAI.canhTay * daiCanhTay}) rotate(${tL.cang * cF - sF * nL.cang})`);
    e.cangR.setAttribute('transform', `translate(0 ${DAI.canhTay * daiCanhTay}) rotate(${-tR.cang * cF - sF * nR.cang})`);

    for (const ben of ['L', 'R']) {
      // Tay ĐANG CẦM ĐỒ thì không buông: động tác nào đòi xoè tay hay chỉ trỏ bằng tay ấy, bàn tay
      // vẫn giữ dáng nắm của tư thế nghỉ — nếu không cái cốc sẽ dính lơ lửng vào lòng bàn tay xoè.
      const grip = this.NGHI['tay' + ben] !== 'mo' ? this.NGHI['tay' + ben] : 'nam';
      const chon = this.holds[ben] && s['item' + ben] > 0.5 ? grip : s['tay' + ben];
      // Buông thõng → lòng bàn tay úp vào đùi, nhìn từ trước chỉ thấy cạnh tay (hẹp ~60%),
      // ngón hơi hướng vào thân. Tay càng giơ lên / vung xa thì bàn tay càng xoè phẳng ra.
      const bat = Math.abs(s['bat' + ben]), cang = Math.abs(s['cang' + ben]), vung = Math.abs(s['vung' + ben]);
      const xoe = chon !== 'mo' ? 1 : clamp(Math.max(bat - 30, cang - 44) / 22, 0, 1)   // chỉ xoè khi giơ tay cao hoặc gập cẳng tay lên; vung tay khi đi vẫn thả lỏng;
      // Bàn tay 'mo' = pha giữa ngón cong thả lỏng (khi buông) và xoè phẳng (khi giơ lên/vẫy).
      // Cong ↔ xoè ĐỔI HẲN, không hoà mờ. Bản trước cho hai hình mờ chéo nhau trong
      // một khoảng hẹp — nhưng cử chỉ lúc nói giữ tay đúng trong khoảng ấy, nên suốt
      // câu nói bàn tay là hai hình bán trong suốt chồng lên nhau, xám xịt như bóng ma.
      // Ngưỡng là MỘT con số, không có độ trễ: độ trễ phải nhớ khung trước, mà bộ dựng
      // video tua thẳng tới từng khung (có khi song song) — hình hiện ra phải là hàm
      // của trạng thái, không phải của lịch sử. Để tay không nháy quanh ngưỡng, `xoe`
      // tính từ mốc gập 44° (xem trên): cử chỉ lúc nói gập 60–70° nằm hẳn về phía xoè.
      const dangXoe = xoe >= 0.5;
      for (const [k, g] of Object.entries(e.tay[ben])) {
        const op = chon === 'mo' ? (k === (dangXoe ? 'xoe' : 'mo') ? 1 : 0) : (k === chon ? 1 : 0);
        g.setAttribute('opacity', op);
      }
      const guong = ben === 'L' ? -1 : 1;
      // Ngửa/sấp cẳng tay: khi bàn tay hướng LÊN (giơ tay, vẫy) cẳng tay xoay ngửa nên
      // ngón cái phải nằm phía TRONG (về phía đầu). Tính "độ hướng lên" của cẳng tay,
      // rồi lật gương bàn tay; với tay xoè thì lật mượt (đi qua cạnh tay như đang xoay
      // cổ tay), với nắm tay/ngón chỉ thì lật thẳng vì hình gần đối xứng.
      const huongTay = chuanHoaGoc(ben === 'L' ? 90 + s.batL + s.cangL : 90 - s.batR - s.cangR);   // 90 = xuống, -90 = lên (đã chuẩn hoá về ±180)
      const len = clamp((-huongTay - 15) / 45, 0, 1);
      let lat = chon === 'mo' ? 1 - 2 * len : (len < 0.5 ? 1 : -1);
      // Xoay nghiêng: nhìn từ bên hông chỉ thấy cạnh ngón cái, và ngón cái phải quay về
      // phía TRƯỚC (hướng đi). Tay phía gần người xem vốn có ngón cái quay vào thân
      // (= ra sau khi nghiêng) nên lật lại; lật mượt theo mức xoay để không giật.
      const lon = ben === 'R' ? Math.max(0, h) : Math.max(0, -h);
      lat *= 1 - 2 * lon;
      e.tayG[ben].setAttribute('transform',
        `scale(${guong * lat} 1) rotate(${-12 * (1 - xoe)}) scale(${0.68 + 0.32 * xoe} 1)`);
    }

    const mi = Math.max(0.05, 1 - s.matY);
    // `matCo` nhân vào CẢ HAI trục của phép co sẵn có (nheo theo góc xoay,
    // nhắm theo `matY`), nên nháy mắt và liếc mắt vẫn đúng ở mọi cỡ.
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
    // Chân mày KHÔNG buộc phải thẳng hàng với mắt: `mayX` tách riêng, bỏ trống
    // thì rơi về `matX` như cũ. Trên mặt thật hai mày thường cách nhau rộng hơn
    // hai con ngươi một chút, và đó là thứ đổi được nét mặt rõ nhất sau `xech`.
    const mx = this.nv.mayX ?? this.nv.matX;
    e.mayL.setAttribute('transform', `translate(${-mx} ${this.nv.mayY - s.mayL * 5}) scale(${1 - Math.max(0, -h) * 0.28} 1) rotate(${-s.mayL * 8})`);
    e.mayR.setAttribute('transform', `translate(${mx} ${this.nv.mayY - s.mayR * 5}) scale(${1 - Math.max(0, h) * 0.28} 1) rotate(${s.mayR * 8})`);

    this.#veMom();
  }

  /**
   * Miệng: hai cung parabol + khoang + răng + lưỡi, cắt bằng clipPath.
   *
   * Cùng họ hình với các bộ viseme ba kênh thông dụng —
   * ba kênh liên tục (mở, rộng/cười, chúm) thay vì một tá hình vẽ rời, nên
   * chuyển giữa các khẩu hình là liên tục, không giật.
   *
   * Bézier bậc hai TRÙNG KHÍT parabol ở đây: hai đầu cùng tung độ nên x chạy
   * tuyến tính theo t, và y = A + (C−A)·u/2 với u = 1 − (x/w)². Vậy muốn đỉnh
   * giữa lệch B thì điểm điều khiển đặt ở 2B — không cần lấy mẫu đa giác.
   *
   * Bốn thứ bản cũ không có, và thiếu cái nào cũng thấy ngay:
   *   • KHOANG tối hơn nét môi. Bản cũ tô cả hình bằng đúng màu nét, mở to là
   *     ra một khối bệt phẳng lì, không có chiều sâu.
   *   • RĂNG là dải NGANG bị cắt bởi khoang, không phải bản thu nhỏ của chính
   *     hình miệng. Thu nhỏ thì đáy răng cong y hệt đáy môi — nhìn ra miếng
   *     dán chứ không ra hàm răng.
   *   • LƯỠI, chỉ khi đã mở đủ sâu; không có nó thì miệng mở to là một hố đen.
   *   • MÔI DƯỚI mảnh hơn môi trên: nét bao khoang 0.72× còn môi trên 1.15×.
   *     Môi trên đậm, môi dưới nhạt là quy ước của gần như mọi nét hoạt hoạ,
   *     và chính nét bao ấy BO TRÒN HAI KHOÉ — thiếu nó thì hai đầu miệng
   *     nhọn hoắt như mũi kim, vì hai parabol gặp nhau ở đúng một điểm.
   *
   * `chum` thu bề ngang và cộng thêm độ hé: chúm mà chỉ hẹp ngang thì ra
   * "miệng nhỏ", không ra "chúm môi" (đã thử và thấy ngay).
   */
  #veMom() {
    const s = this.s, e = this.el, R = this.nv.miengRong;
    if (!e.momG) return;
    // Cao độ miệng phải đặt Ở ĐÂY, không phải nướng vào markup lúc dựng.
    // Bản trước để `transform="translate(0 ${miengY})"` ngay trong chuỗi HTML:
    // đổi `nv.miengY` sau đó thì không gì nhúc nhích, mà thanh trượt vẫn hiện
    // số mới — hỏng đúng kiểu im lặng nhất, nhìn giao diện tưởng đang chạy.
    e.momG.setAttribute('transform', `translate(0 ${this.nv.miengY})`);

    const chum = clamp(s.chum || 0, 0, 1);
    // HÌNH DÁNG giữ y nguyên bản cũ — bản cũ nhìn quen mắt và cân với khuôn
    // mặt; cái sai của nó nằm ở RUỘT chứ không ở đường bao. Ba số dưới đây quy
    // đúng về công thức cũ khi chum = 0:
    //     w cũ = (11 + mieng·2)·R          · đỉnh nét cười cũ = 3.5·R·cuoi
    //     độ hé thật cũ = 0.675·(15·mieng) = 10.1·mieng
    // (bản cũ đặt điểm ĐIỀU KHIỂN chứ không đặt đỉnh, nên "mo = 15·mieng" của
    // nó chỉ mở ra 0.675 chừng ấy. Lần trước tôi đọc thẳng số đó thành độ hé và
    // cái miệng há to hơn bản cũ 65% — nhìn là thấy ngay nhân vật cứ nhe răng.)
    const mo = clamp(s.mieng, 0, 1) * 10.1 * (1 + 0.55 * chum);
    const w = (11 + clamp(s.mieng, 0, 1) * 2) * R * (1 - 0.55 * chum);
    const vong = s.cuoi * 3.5 * R;          // đỉnh nét cười
    const nhac = mo * 0.26;                 // môi trên nhấc lên khi hé
    const dinhTren = vong - nhac, dinhDuoi = dinhTren + mo;

    // Nét môi trên là parabol — đó là đường cười. Nhưng ĐÁY khoang phải là
    // BẬC BA: parabol khép quá nhanh về hai khoé nên miệng mở ra hình chữ V.
    // Bậc ba với điểm điều khiển kéo vào 0.42w giữ độ sâu ra sát khoé — đúng ý
    // số mũ u^0.7 quen dùng cho hình miệng. Đỉnh giữa của bậc ba đối xứng bằng 0.75·H.
    const cungTren = `M ${-w} 0 Q 0 ${2 * dinhTren} ${w} 0`;
    const khoang = `${cungTren} C ${w * 0.42} ${dinhDuoi / 0.75} ${-w * 0.42} ${dinhDuoi / 0.75} ${-w} 0 Z`;
    e.mieng.setAttribute('d', khoang);
    e.mieng.setAttribute('stroke-width', this.nv.moiRong * 0.72);
    e.momClipP.setAttribute('d', khoang);

    // Răng: một DẢI BÁM THEO NÉT MÔI TRÊN, dày dần theo độ hé, luôn trắng đặc.
    // Bản trước tôi cho mờ dần bằng opacity: trắng pha lên khoang tối ra xám
    // đục, và ở độ hé nhỏ — chỗ hay gặp nhất — cái miệng thành một vệt bẩn.
    // Dày dần từ 0 vừa tránh được chuyện đó vừa đúng thật: hé ít thì chỉ thấy
    // một vạch răng mỏng.
    // Dải răng là một THẤU KÍNH: hai cung cùng xuất phát từ (±w, d0), nên nó
    // dày nhất ở giữa và thon về hai khoé. Dải dày đều thì hai đầu bị clipPath
    // cắt cụt, ra hình chữ nhật bo góc — nhìn ra cái nẹp, không ra hàm răng.
    const day = Math.min(mo * 0.55, 4.2);
    e.rang.setAttribute('opacity', day > 0.25 ? 1 : 0);
    if (day > 0.25) {
      const d0 = 0.15;
      e.rang.setAttribute('d',
        `M ${-w} ${d0} Q 0 ${2 * dinhTren + d0} ${w} ${d0}`
        + ` Q 0 ${2 * dinhTren + d0 + 2 * day} ${-w} ${d0} Z`);
    }
    // Lưỡi: chỉ khi há thật sâu, nếu không nó chiếm hết khoang và trông như kẹo.
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

  /**
   * Đổi tỉ lệ ĐẦU ↔ THÂN và chỗ đặt đầu trên cổ.
   *
   * `dauLech` là thứ quyết định hở bao nhiêu cổ: cằm nằm ở
   * `(-62 + khuon.cam)·coDau + (-103 + dauLech)`, còn cổ vẽ cứng ở −130…−96.
   * Đặt tay nó thì phải cập nhật luôn `dauLechGoc`, nếu không lần sau đổi
   * `khuon.cam` là `doiKhuonMat` bù trừ từ mốc CŨ và xoá mất chỉnh tay.
   */
  doiThan(kieu) {
    for (const k of ['dauLech', 'coDau', 'coThan', 'coChan'])
      if (kieu[k] !== undefined) this.nv[k] = kieu[k];
    if (kieu.dauLech !== undefined) this.nv.dauLechGoc = this.nv.dauLech;
    this.apDung();
    const { dauLech, coDau, coThan, coChan } = this.nv;
    return { dauLech, coDau, coThan, coChan };
  }

  /**
   * Đổi tỉ lệ TAY và góc tay ở TƯ THẾ NGHỈ — trả về bộ đang dùng.
   *
   * Tay ngắn lại mà giữ nguyên góc nghỉ thì hai bàn tay không chạm nhau nữa
   * (tay đan trước bụng hoá ra hai tay thõng cách nhau), nên góc nghỉ phải
   * chỉnh được cùng chỗ. `batNghi`/`cangNghi` đặt cho CẢ HAI tay: tư thế nghỉ
   * cân đối, một số cho hai bên.
   *
   * `nv.nghi` được GÁN object mới chứ không sửa tại chỗ: năm nhân vật lắp trên
   * cùng một thân nên dùng chung một object `nghi` — sửa tại chỗ là đổi một
   * nhân vật, bốn nhân vật kia đổi theo mà không ai gọi gì.
   */
  doiTay(kieu) {
    for (const k of ['daiCanhTay', 'daiCangTay', 'dayTay', 'coBanTay'])
      if (kieu[k] !== undefined) this.nv[k] = kieu[k];
    const nghi = {};
    // Số đưa vào là góc của tay PHẢI; tay trái giữ nguyên độ LỆCH so với tay phải mà nhân vật
    // đã khai (một tay nâng lên cầm cốc, tay kia buông). Nhân vật đối xứng thì lệch = 0, y như cũ.
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

  /**
   * Đổi DÁNG và TRANG PHỤC DƯỚI — `stoop` (độ còng 0…1), `skirtLength`, `skirtFlare`. Trả về bộ
   * đang dùng. Hai số của váy chỉ có tác dụng khi nhân vật KHAI `skirt`; nhân vật không có váy
   * thì chúng được nhớ nhưng không vẽ gì.
   */
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

  /**
   * Đổi TAY ÁO — trả về bộ đang dùng. Tay áo là đường vẽ nướng trong SVG nên
   * phải ghi lại `d`; đệm vai và đường may thì `apDung` tự dựng lại từ `nv`.
   */
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

  /** Đổi tỉ lệ CHÂN — trả về bộ đang dùng. Chân ngắn đi thì cả người hạ xuống theo (`hangChan`). */
  doiChan(kieu) {
    for (const k of ['daiDui', 'daiOng', 'dayChan', 'cachChan', 'coBanChan'])
      if (kieu[k] !== undefined) this.nv[k] = kieu[k];
    this.apDung();
    const { daiDui, daiOng, dayChan, cachChan, coBanChan } = this.nv;
    return { daiDui, daiOng, dayChan, cachChan, coBanChan };
  }

  /**
   * Cả người phải HẠ xuống bao nhiêu để bàn chân vẫn chạm nền y = 428.
   * Đế giày ở cổ chân + 10 (theo cỡ bàn chân); mọi thứ nhân `coChan` vì nhóm
   * chân co cả cụm. Chân mặc định: 78 + 78 + 10 = 166 = 428 − 262, hạ 0.
   */
  /**
   * Cao độ MẶT GHẾ (y trong khung 400 × 470, sàn ở 458) khớp với nhân vật này khi ngồi: mặt
   * dưới của đùi lúc `seat = 1`. Đạo cụ ghế dùng số này (runtime/props.js).
   */
  seatY() {
    const nv = this.nv;
    return HONG.y + DOI_Y + this.hangChan() + DAI.dui * nv.daiDui * nv.coChan * 0.72 + 13 * nv.dayChan * nv.coChan;
  }

  /**
   * KHUNG NGẮM của một cỡ cảnh, tính từ hình học của rig ở TRẠNG THÁI HIỆN TẠI (đã đi tới đâu,
   * đang ngồi hay đứng) — trong đơn vị khung 400 × 470. Máy quay (`shot` trong index.js) dùng nó.
   *   'face'   cận mặt      'chest'  từ đỉnh đầu tới hông      'full'  cả người
   * Trả về { x, y, width, height }.
   */
  shotBox(kind = 'face') {
    const nv = this.nv, s = this.s;
    const drop = this.hangChan() + DAI.dui * nv.daiDui * nv.coChan * 0.72 * clamp(s.seat, 0, 1) + s.y;
    const headY = HONG.y + (nv.coDau * -62 + (-103 + nv.dauLech)) * nv.coThan + DOI_Y + drop;
    const head = 64 * nv.coDau * nv.coThan;                    // nửa bề cao đầu, tính cả tóc
    const centre = KHUNG.w / 2 + s.x, hip = HONG.y + DOI_Y + drop;
    // Bề ngang: mặt thì vuông; ngang ngực và cả người thì hẹp hơn chiều cao (để ghép khung hai nhân vật cho sát).
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

  /**
   * Đổi CHỖ ĐẶT của mắt / mũi / miệng — trả về bộ đang dùng.
   *
   * Đặt tay `matX` thì phải ghi lại TỈ LỆ của nó với viền mặt, nếu không lần
   * sau đổi khuôn mặt là `doiKhuonMat` tính lại `matX` theo tỉ lệ CŨ và xoá
   * mất chỉnh tay — sai một cách im lặng, vì hai thanh trượt nằm ở hai hàng
   * khác nhau nên không ai nghĩ chúng dính vào nhau.
   */
  doiNetMat(kieu) {
    for (const k of ['matX', 'matY', 'matCo', 'muiY', 'muiCo', 'miengY', 'miengRong'])
      if (kieu[k] !== undefined) this.nv[k] = kieu[k];
    const w = beRongTaiY(this.nv.khuon, this.nv.matY) || 1;
    this.nv.tiNgang.matX = this.nv.matX / w;
    this.apDung();
    const { matX, matY, matCo, muiY, muiCo, miengY, miengRong } = this.nv;
    return { matX, matY, matCo, muiY, muiCo, miengY, miengRong };
  }

  /**
   * Đổi khuôn mặt sau khi đã dựng — trả về bộ tham số đang dùng.
   *
   * Đổi `rong` thì KÉO THEO tai, mắt, má, mày theo đúng tỉ lệ đã ghi lúc dựng.
   * Không kéo theo thì bóp mặt hẹp một chút là tai rời khỏi đầu và hai con mắt
   * dạt ra sát viền — mà nhìn ảnh thì tưởng hàm bị méo chứ không nghĩ tới mốc.
   *
   * Mốc DỌC (`matY`, `mayY`, `miengY`) cố ý KHÔNG kéo theo `cao`/`cam`: kéo
   * dài cằm mà mũi miệng trôi xuống theo thì không ra "mặt dài", chỉ ra "đầu
   * to hơn".
   */
  doiKhuonMat(kieu) {
    this.nv.khuon = { ...this.nv.khuon, ...kieu };
    this.el.khuon.setAttribute('d', veKhuonMat(this.nv.khuon));
    this.el.matClipP.setAttribute('d', veKhuonMat(this.nv.khuon));   // má và tóc gáy cắt theo viền mới
    const K = this.nv.khuon, ti = this.nv.tiNgang, w = (y) => beRongTaiY(K, y);
    this.nv.taiX = w(4) * ti.taiX;
    this.nv.matX = w(this.nv.matY) * ti.matX;
    // Kẹp má lại trong viền: `maX` là TÂM đốm má, còn đốm rộng `maRong` nữa —
    // đúng tâm mà không kẹp thì mặt V-line vẫn lòi nửa đốm ra ngoài hàm.
    this.nv.maX = Math.min(w(this.nv.maY) * ti.maX, w(this.nv.maY) - this.nv.maRong * 0.7);
    this.nv.mayX = w(this.nv.mayY) * ti.mayX;
    // (Tóc vẽ tay co giãn theo tỉ lệ mặt — đặt trong `apDung`, xem ở đó.)
    const G = this.nv.khuonGoc;
    // Cằm ngắn lại thì HẠ CẢ ĐẦU xuống đúng chừng ấy, để cằm vẫn chạm cổ.
    // Không hạ thì cổ thò ra dưới cằm thành một cái mấu vuông — nhìn ảnh chỉ
    // tưởng đường bao cằm bị vẽ hụt, không nghĩ tới chỗ đặt đầu.
    this.nv.dauLech = this.nv.dauLechGoc - (K.cam - G.cam) * this.nv.coDau;
    this.apDung();
    return { ...this.nv.khuon };
  }

  /**
   * Đổi kiểu chân mày sau khi đã dựng — trả về tham số đang dùng.
   *
   * Chỉ ghi lại thuộc tính `d`, không dựng lại cả SVG: dựng lại là mất sạch
   * trạng thái `s` đang chạy và mọi tween GSAP đang trỏ vào nó.
   */
  doiChanMay(kieu) {
    const { mayX, mayY, ...hinh } = kieu;
    // Vị trí và hình dáng đi hai đường khác nhau: `mayX`/`mayY` là transform,
    // apDung() đọc lại mỗi frame; còn hình dáng phải sinh lại `d`. Nhét chung
    // vào `nv.may` thì veChanMay sẽ coi chúng là tham số hình học.
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

  /* ------------------------------------------------------------ tiện ích */

  // `lazy: false` cho MỌI tween của rig. Mặc định GSAP hoãn lần ghi đầu tiên của một tween
  // tới cuối tick; khi cả timeline bị đẩy một phát tới cuối (kichBan làm thế để dựng chuỗi,
  // bộ dựng video làm thế khi tua thẳng tới một khung), tween đứng sau đọc giá trị đầu của
  // nó TRƯỚC khi tween đứng trước kịp ghi — và ghi nhớ một trạng thái cũ. Triệu chứng: vừa
  // bước vào xong, nhân vật giật về điểm xuất phát rồi trượt lại.
  tl() {
    return gsap.timeline({ paused: true, defaults: { lazy: false }, onUpdate: () => this.apDung(), onComplete: () => this.apDung() });
  }

  // Khép về tư thế nghỉ, bàn tay đổi về 'mo' ở nửa sau đoạn khép.
  #khep(t, d = 0.5, at = '>', giu = {}) {
    // VỊ TRÍ `x` KHÔNG thuộc tư thế nghỉ: nhân vật đã đi tới đâu thì đứng lại ở đó.
    // Khép cả `x` thì động tác nào chạy sau một lần đi cũng kéo nhân vật trượt về giữa.
    // (`datNghi()` mới là thứ đưa nhân vật về giữa.)
    //
    // `seat` (đang ngồi) và `huong` (đang quay mặt về đâu) cũng là THẾ ĐỨNG chứ không phải tư
    // thế nghỉ: động tác nào xong cũng trả hai thứ này về đúng giá trị LÚC NÓ BẮT ĐẦU, không về
    // 0. Nhờ vậy nhân vật đã `sitDown()` thì nói, gật, vẫy tay xong vẫn còn ngồi; đã `face()` về
    // phía ai thì vẫn nhìn về phía đó; còn `walk()` quay ngang để bước rồi tự quay lại hướng cũ.
    // (Giá trị đọc lúc DỰNG timeline — `sequence()` lo cho trạng thái lúc ấy đúng.)
    const so = {};
    for (const k in this.NGHI) if (typeof this.NGHI[k] === 'number' && k !== 'x') so[k] = this.NGHI[k];
    so.seat = this.s.seat; so.huong = this.s.huong;
    so.itemL = this.s.itemL; so.itemR = this.s.itemR;          // đồ vật đã cất thì vẫn cất
    t.to(this.s, { ...so, ...giu, duration: d, ease: 'power2.inOut' }, at);
    // Bàn tay về hình dạng NGHỈ của nhân vật (mặc định thả lỏng, nhưng có thể là nắm tay).
    t.set(this.s, { tayL: this.NGHI.tayL, tayR: this.NGHI.tayR }, `>-${d * 0.5}`);
    return t;
  }

  #chop(t, at) {
    // Chớp xong mắt mở lại tới `blinkTo`: 0 lúc thường, lớn hơn khi nét mặt đang giữ mắt khép hờ (buồn, mệt).
    t.to(this.s, { matY: 1, duration: 0.07, ease: 'power1.in' }, at)
     .to(this.s, { matY: this.blinkTo || 0, duration: 0.11, ease: 'power1.out' }, at + 0.07);
  }

  /* ------------------------------------------------------------ chu kỳ đi
   * Dáng đi nghiêng là một HÀM CỦA PHA, không phải chuỗi tween nối nhau. Nối tween
   * thì cuối mỗi nửa bước mọi khớp cùng dừng về vận tốc 0 một lúc — đi kiểu "tạo dáng
   * rồi tạo dáng". Ở đây mỗi khớp là một sóng liên tục với độ trễ riêng: tay trễ hơn
   * chân, khuỷu trễ hơn vai, đầu trễ hơn thân.
   *
   *   f   pha, 1 = một chu kỳ = HAI bước. Chân trái chạm gót ở f = 0, nhấc mũi ở 0.5.
   *   a   0..1 biên độ: 0 = đúng tư thế nghỉ, 1 = đang đi. Dùng để vào/ra dáng đi.
   *   kA  hệ số sải chân (đổi để một số bước nguyên đi vừa hết quãng đường).
   */
  #tuTheDi(f, a, kA = 1) {
    const N = this.NGHI, nv = this.nv, cc = nv.coChan, P = 2 * Math.PI;
    const Ld = DAI.dui * nv.daiDui, Lo = DAI.ong * nv.daiOng;       // chiều dài thật sau `doiChan`
    const u = (p, m, rong) => { const d = Math.abs(((((p - m) % 1) + 1.5) % 1) - 0.5); return Math.exp(-((d / rong) ** 2)); };
    // Chân bị co dọc `coChan` nên góc trên màn hình lớn hơn góc khớp: quy sải chân
    // về góc NHÌN THẤY (21°), nếu không nhân vật chân ngắn xoạc ra như cái kéo.
    const A = (Math.atan(Math.tan(21 * RAD) * cc) / RAD) * kA;
    // Gối: nhún nhẹ lúc nhận trọng lượng (10% chu kỳ), gập sâu giữa pha vung (70%).
    // Đùi lệch hẳn về phía trước (0.3): gối lúc nào cũng hơi gập nên bàn chân bị kéo
    // lùi, không bù thì chân trước không bao giờ vươn tới còn chân sau duỗi quá đà.
    const goi = (38 + 12 * kA) * (0.55 + 0.45 * cc);
    const chan = (p) => ({
      dui: -A * (Math.cos(P * p) + 0.3),
      ong: 2 + 11 * u(p, 0.1, 0.075) + goi * u(p, 0.7, 0.125),
    });
    const L = chan(f), R = chan(f + 0.5);
    const vung = Math.cos(P * (f - 0.05));                          // tay trễ hơn chân
    const nhip = (tre) => Math.cos(2 * P * (f - tre));              // nhịp theo BƯỚC (2 lần mỗi chu kỳ)
    const than = 3 - 0.9 * Math.cos(P * f) + 0.4 * nhip(0);
    // Tay đánh ngược chân bằng kênh `vung` (dương = ra trước); apDung tự gập khuỷu tay
    // ra trước và duỗi tay ra sau. `bat`/`cang` chỉ còn là dáng buông thõng.
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
    // Hông đặt theo CHÂN: điểm thấp nhất của bàn chân thấp nhất luôn chạm đất, nên
    // thân nhấp nhô đúng cung con lắc ngược mà không chân nào lơ lửng. Lấy max "mềm"
    // để đáy cung không gãy.
    // Độ sâu tính tới ĐẾ GIÀY chứ không dừng ở cổ chân: bàn chân lăn gót–mũi quanh
    // cổ chân, nên lúc nhấc gót thì mũi giày chúc xuống thấp hơn cổ chân nhiều hơn
    // 10 đơn vị lúc đứng. Dừng ở cổ chân là mũi giày chìm dưới mặt đất.
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

  // Biên độ theo số bước đã đi: vào dáng trong 0.7 bước đầu, ra dáng trong 0.7 bước cuối.
  #baoDi(buoc, vao, ra) {
    return (b) => (vao ? mem(b / 0.7) : 1) * (ra ? mem((buoc - b) / 0.7) : 1);
  }

  // Quãng đường hông đi được nếu CHÂN TRỤ KHÔNG TRƯỢT, tính sẵn thành bảng theo số
  // bước. Là hàm của pha chứ không cộng dồn lúc chạy, nên tua timeline tới đâu cũng đúng.
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

  // Chọn số bước và sải chân để đi vừa đúng `quang` đơn vị mà chân không trượt.
  #doBuoc(quang, vao, ra) {
    let buoc = 2, b;
    do { buoc++; b = this.#bangDi(buoc, vao, ra, 1); } while (b.tong * 1.04 < quang && buoc < 14);
    let kA = 1;
    for (let i = 0; i < 4; i++) { kA *= quang / b.tong; b = this.#bangDi(buoc, vao, ra, kA); }
    return { buoc, kA, x: (v) => b.x(v) * (quang / b.tong) };
  }

  // Đặt `buoc` bước đi nghiêng vào timeline, mỗi bước dài h giây. Pha bắt đầu ở 0.75
  // (hai đùi thẳng đứng, chân trái đang nhấc) nên từ tư thế nghỉ là NHẤC CHÂN bước đi,
  // và kết thúc là đặt chân xuống cạnh chân kia. `x(b)` nếu có thì dời cả người theo.
  // `chieu` −1 = đi sang TRÁI: lấy đúng tư thế đi sang phải rồi soi gương — đổi dấu
  // mọi góc xoay trong mặt phẳng màn hình và ĐỔI VAI hai bên (chân/tay gần người
  // xem khi quay trái là bên R, khi quay phải là bên L).
  #di(t, at, buoc, h, { vao = true, ra = true, kA = 1, x = null, chieu = 1 } = {}) {
    const s = this.s, bao = this.#baoDi(buoc, vao, ra);
    const dat = (b) => {
      const o = this.#tuTheDi(0.75 + b / 2, bao(b), kA).o;
      if (chieu < 0) {
        const a = { ...o }, N = this.NGHI;
        for (const [l, r] of [['duiL', 'duiR'], ['ongL', 'ongR']]) { o[l] = -a[r]; o[r] = -a[l]; }
        o.vungL = a.vungR; o.vungR = a.vungL;
        // `than`/`dau` pha từ tư thế nghỉ: chỉ phần LỆCH do dáng đi mới soi gương.
        o.than = N.than - (a.than - N.than); o.dau = N.dau - (a.dau - N.dau);
      }
      Object.assign(s, o);
      if (x) s.x = x(b);
    };
    // Dáng đi đổ xuống qua SETTER của thuộc tính đang được tween, không qua `onUpdate`:
    // GSAP luôn ghi thuộc tính mỗi lần vẽ, kể cả khi bị tua bằng `seek()` (tắt callback)
    // và kể cả khi tua NGƯỢC về trước lúc bắt đầu đi — lúc đó nó ghi b = 0, dáng đi trả
    // đúng tư thế nghỉ và vị trí xuất phát. Dùng `onUpdate` thì tua ngược xong nhân vật
    // vẫn đứng ở chỗ đã đi tới.
    const pr = { _b: 0, get b() { return this._b; }, set b(v) { this._b = v; dat(v); } };
    t.to(pr, { b: buoc, duration: buoc * h, ease: 'none' }, at);
    return at + buoc * h;
  }

  /* ------------------------------------------------------------ động tác */

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
      // Liếc rồi trả về ĐÚNG tư thế nghỉ của nhân vật, không phải về 0: nhân vật nghỉ ở dáng
      // nghiêng đầu (restPose.headTilt) mà idle trả đầu về 0 thì cứ sau một lần liếc là đầu
      // bật thẳng — và động tác không còn khép về nghỉ.
      const N = this.NGHI;
      t.to(s, { nhinX: N.nhinX + 2.6, nhinY: N.nhinY - 0.6, dau: N.dau + 1.5, duration: 0.25, ease: 'power2.out' }, a)
       .to(s, { nhinX: N.nhinX, nhinY: N.nhinY, dau: N.dau, duration: 0.35, ease: 'power2.inOut' }, a + 1.1);
    }
    return t;
  }

  /**
   * VẪY TAY CHÀO. Từng bị bỏ cùng `enter`/`exit`, nay đưa lại theo yêu cầu —
   * và nó vốn KHÔNG thuộc nhóm "di chuyển ngang": đo thì `wave` dịch ngang 0,
   * chỉ giơ tay và nghiêng người.
   */
  /**
   * MỞ NGƯỜI ra phía khán giả cho một cử chỉ tay. Cánh tay vẽ theo mặt TRƯỚC; quay nghiêng quá
   * ~0.25 thì tay giơ lên bị ép dẹt thành một vệt (dáng nghiêng chỉ hợp với tay buông / vung khi
   * bước). Nên cử chỉ nào cũng bớt quay về tối đa GESTURE_TURN trong lúc diễn — vẫn hơi hướng về
   * người đối diện — rồi `#khep` đưa về đúng hướng đang giữ.
   */
  static GESTURE_TURN = 0.2;
  #openUp(t) {
    const held = this.s.huong, limit = RigSVG.GESTURE_TURN;
    if (Math.abs(held) > limit) t.to(this.s, { huong: Math.sign(held) * limit, duration: 0.25, ease: 'power2.inOut' }, 0);
  }

  /**
   * Chọn tay cho động tác MỘT TAY. `hand`: 'L' | 'R' để chỉ định; 'auto' (mặc định) lấy tay phải,
   * trừ khi tay phải đang cầm đồ mà tay trái thì không — khi ấy dùng tay trái.
   */
  #freeHand(hand = 'auto') {
    if (hand === 'L' || hand === 'R') return hand;
    const busy = (side) => this.holds[side] && this.s['item' + side] > 0.5;
    return busy('R') && !busy('L') ? 'L' : 'R';
  }

  // Cả hai tay đều đang cầm đồ (và không chỉ định tay): không có tay nào để vẫy hay giơ ngón cái.
  #handsFull(hand) {
    return hand === 'auto' && ['L', 'R'].every((side) => this.holds[side] && this.s['item' + side] > 0.5);
  }
  // Chào / tán thành KHÔNG DÙNG TAY, cho nhân vật hai tay đều bận: nghiêng đầu, cười, nhướn mày
  // và gật hai nhịp. Dài đúng bằng động tác gốc (`end`) để kịch bản không lệch giờ.
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
    this.#openUp(t);
    const side = this.#freeHand(hand), m = side === 'L' ? -1 : 1;                 // m lật các nghiêng thân / đầu
    const handK = 'tay' + side, upperK = 'bat' + side, foreK = 'cang' + side;
    t.set(s, { [handK]: 'mo' }, 0);
    t.to(s, { [upperK]: -4, [foreK]: 22, duration: 0.12, ease: 'power1.in' }, 0);      // lấy đà
    t.to(s, { [upperK]: 148, [foreK]: 18, vai: -3, than: -3 * m, dau: -6 * m, nhinX: 1.5 * m,
              cuoi: 1, mieng: 0.15, mayL: 0.5, mayR: 0.5,
              duration: 0.45, ease: 'back.out(1.4)' }, 0.12);
    for (let i = 0; i < 4; i++) {                                                // vẫy 4 nhịp
      t.to(s, { [foreK]: i % 2 ? 6 : 46, dau: (i % 2 ? -6 : -9) * m, duration: 0.22, ease: 'sine.inOut' }, 0.57 + i * 0.22);
    }
    t.to(s, { [foreK]: 18, duration: 0.2, ease: 'sine.inOut' }, 1.45);
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

  // Chỉ vào phần tử DOM (hoặc {left,top,width,height}); không có mục tiêu thì chỉ sang phải.
  point(muc = null) {
    const t = this.tl(), s = this.s;
    this.#openUp(t);
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
    const ben = tx < HONG.x ? 'L' : 'R', v = VAI[ben];
    const goc = Math.atan2(ty - v.y, tx - v.x) * 180 / Math.PI;
    const bat = clamp(chuanHoaGoc(ben === 'L' ? goc - 90 : 90 - goc), -15, 172);
    const dau = clamp((tx - HONG.x) * 0.05, -10, 10);
    const nhinX = clamp((tx - HONG.x) * 0.02, -3, 3), nhinY = clamp((ty - 88) * 0.02, -2.5, 2.5);
    const tay = 'tay' + ben, batK = 'bat' + ben, cangK = 'cang' + ben;

    t.set(s, { [tay]: 'nam' }, 0);
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
    this.#openUp(t);
    t.set(s, { tayL: 'mo', tayR: 'mo' }, 0);
    t.to(s, { batL: 8, batR: 8, cangL: -75, cangR: -75, dauY: 1, duration: 0.25, ease: 'power2.in' }, 0); // gom trước ngực
    t.to(s, { batL: 62, batR: 72, cangL: -22, cangR: -26, than: 2, dau: 6, dauX: 3,
              mayL: 0.7, mayR: 0.7, cuoi: 0.9, mieng: 0.3, nhinX: 1.5,
              duration: 0.5, ease: 'back.out(1.2)' }, 0.25);                       // mở ra
    t.to(s, { batR: 80, cangR: -18, dau: 8, duration: 0.3, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.95); // nhấn
    this.#chop(t, 1.2);
    this.#khep(t, 0.55, 1.65);
    return t;
  }

  nod() {
    const t = this.tl(), s = this.s;
    t.to(s, { cuoi: 0.7, mayL: 0.3, mayR: 0.3, duration: 0.2 }, 0);
    for (let i = 0; i < 2; i++) {
      const a = i * 0.5;
      t.to(s, { dauY: 8, dau: 1.5, nhinY: 1.5, than: 0.8, duration: 0.2, ease: 'power2.out' }, a)
       .to(s, { dauY: 0, dau: 0, nhinY: 0, than: 0, duration: 0.3, ease: 'power2.inOut' }, a + 0.2);
    }
    this.#chop(t, 0.55);
    this.#khep(t, 0.35, 1.05);
    return t;
  }

  shake() {
    const t = this.tl(), s = this.s;
    t.to(s, { cuoi: -0.1, mieng: 0, mayL: -0.4, mayR: -0.4, duration: 0.2 }, 0);
    const bien = [-9, 9, -7, 6, -3];
    bien.forEach((d, i) => {
      t.to(s, { dauX: d, dau: -d * 0.4, nhinX: -d * 0.3, duration: 0.18, ease: 'sine.inOut' }, i * 0.18);
    });
    t.to(s, { dauX: 0, dau: 0, nhinX: 0, duration: 0.2, ease: 'power2.out' }, bien.length * 0.18);
    this.#khep(t, 0.35, 1.15);
    return t;
  }

  /**
   * REO MỪNG: hai tay giơ cao, nhún lên hai lần, mặt rạng rỡ. Động tác toàn thân duy nhất để tỏ ra
   * vui — nét mặt và ngón cái thì quá nhỏ trong cảnh toàn. Đang ngồi thì chỉ giơ tay, không nhún.
   * Tay nào đang cầm đồ thì giữ nguyên, chỉ tay kia giơ lên.
   */
  cheer() {
    const t = this.tl(), s = this.s;
    this.#openUp(t);
    const busy = (side) => this.holds[side] && s['item' + side] > 0.5;
    const up = {};
    // Giơ thành chữ V mở rộng, không giơ thẳng đứng: đầu chibi to hơn tầm với của tay (nhất là trẻ em),
    // giơ thẳng thì hai tay khuất sau đầu hoặc trông như đang bịt tai.
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

  // Một nhịp dậm chân nhìn từ phía trước: gối `ben` nhấc lên rồi đặt xuống, tay vung ngược.
  #dam(t, at, h, ben, tay = 1, goiCao = 1) {
    const s = this.s, L = ben === 'L';
    const goi = L ? 'nhacL' : 'nhacR';
    t.to(s, { [goi]: goiCao, y: -5 * goiCao, than: (L ? 2 : -2) * goiCao, dauY: -1, duration: h * 0.5, ease: 'power2.out' }, at);
    t.to(s, { [goi]: 0, y: 0, dauY: 1.5, duration: h * 0.5, ease: 'power2.in' }, at + h * 0.5);
    // Tay đối diện ra trước, tay cùng bên ra sau — đổi chiều mượt suốt cả nhịp, hơi trễ so với chân.
    t.to(s, { vungL: (L ? -1 : 1) * tay, vungR: (L ? 1 : -1) * tay, vai: -tay,
              duration: h * 0.9, ease: 'sine.inOut' }, at + h * 0.1);
    return at + h;
  }

  // Dậm chân tại chỗ (nhìn thẳng), tạo cảm giác đang bước.
  march(buoc = 6) {
    const t = this.tl(), h = 0.38;
    let at = 0;
    t.set(this.s, { tayL: 'nam', tayR: 'nam' }, 0);
    t.to(this.s, { cuoi: 0.6, mayL: 0.3, mayR: 0.3, duration: 0.2 }, 0);
    for (let i = 0; i < buoc; i++) at = this.#dam(t, at, h, i % 2 ? 'R' : 'L');
    this.#khep(t, 0.4, at);
    return t;
  }

  // Bước tại chỗ thong thả: gối nhấc vừa, tay chỉ đung đưa nhẹ theo quán tính.
  stroll(buoc = 6) {
    const t = this.tl(), h = 0.46;
    let at = 0;
    t.to(this.s, { cuoi: 0.45, duration: 0.25 }, 0);
    for (let i = 0; i < buoc; i++) at = this.#dam(t, at, h, i % 2 ? 'R' : 'L', 0.3, 0.75);
    this.#khep(t, 0.4, at);
    return t;
  }

  // Dậm chân tại chỗ mà không đánh tay (tay buông thõng, chỉ hơi rung theo nhịp).
  stepInPlace(buoc = 6) {
    const t = this.tl(), h = 0.42;
    let at = 0;
    for (let i = 0; i < buoc; i++) at = this.#dam(t, at, h, i % 2 ? 'R' : 'L', 0, 0.85);
    this.#khep(t, 0.35, at);
    return t;
  }

  // Đi thẳng về phía người xem: bắt đầu nhỏ và ở xa (cao hơn trên sân), vừa dậm chân vừa lớn dần.
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

  // Đi ra xa: quay lưng (giấu mặt bằng cách tắt nét mặt không cần — đơn giản là nhỏ dần) rồi mờ đi.
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

  /* ------------------------------------------------- biểu cảm · quay · ngồi */

  // Nét mặt dựng sẵn. Mỗi mục là các kênh trạng thái ở đỉnh biểu cảm; `eyesClosed` âm là
  // mở mắt TO hơn bình thường.
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

  /**
   * Làm một BIỂU CẢM rồi trở về: `express('happy')`, `express('sad', 2)`.
   * Tên hợp lệ: happy · sad · surprised · angry · thinking. `hold` = số giây giữ nét mặt.
   */
  express(name = 'happy', hold = 1.2) {
    const face = RigSVG.EXPRESSIONS[name];
    if (!face) throw new Error(`[character] no expression "${name}" (available: ${Object.keys(RigSVG.EXPRESSIONS).join(', ')})`);
    const t = this.tl(), s = this.s, into = name === 'surprised' ? 0.16 : 0.32;
    t.to(s, { ...face, duration: into, ease: name === 'surprised' ? 'back.out(2.2)' : 'power2.out' }, 0);
    if (name === 'laughing') t.to(s, { dauY: face.dauY + 3.5, vai: face.vai + 2, duration: 0.13, ease: 'sine.inOut', yoyo: true, repeat: Math.max(1, 2 * Math.round(hold / 0.3) - 1) }, into);   // rung người vì cười
    else if (name !== 'surprised' && hold > 0.8) { this.blinkTo = face.matY || 0; this.#chop(t, into + hold * 0.5); this.blinkTo = 0; }      // ngạc nhiên thì không chớp mắt
    this.#khep(t, 0.4, into + hold);
    return t;
  }

  /**
   * QUAY NGƯỜI sang một bên (dáng 3/4), giữ, rồi quay lại nhìn thẳng.
   * `direction`: 'right' | 'left'. `amount` 0…1 — 0.55 là nghiêng 3/4, 1 là nghiêng hẳn.
   */
  turn(direction = 'right', hold = 1.5, amount = 0.55) {
    const t = this.tl(), s = this.s, side = direction === 'left' ? -1 : 1;
    t.to(s, { huong: side * clamp(amount, 0, 1), nhinX: side * 1.2, duration: 0.4, ease: 'power2.inOut' }, 0);
    if (hold > 1) this.#chop(t, 0.4 + hold * 0.5);
    this.#khep(t, 0.4, 0.4 + hold);
    return t;
  }

  /**
   * Hoành độ TÂM nhân vật trên màn hình (px), tính cả quãng đã `walk` / `enter` — khung SVG thì
   * đứng yên, nhân vật dịch chuyển bên trong nó.
   */
  centerX() {
    const frame = this.svg.getBoundingClientRect();
    const scale = Math.min(frame.width / KHUNG.w, frame.height / KHUNG.h) || 1;
    return frame.left + frame.width / 2 + this.s.x * scale;
  }

  /**
   * QUAY MẶT về một phía và GIỮ hướng đó cho các động tác sau.
   *   face('left') · face('right') · face('front')        theo tên
   *   face(element) · face(otherRig)                      quay về phía phần tử / nhân vật ấy
   * `amount` 0…1 — 0.55 là nghiêng 3/4 (mặc định), 1 là nghiêng hẳn.
   */
  face(target = 'right', amount = 0.55) {
    let side = target === 'left' ? -1 : target === 'front' ? 0 : 1;
    if (target && typeof target === 'object') {
      // Phần tử DOM hoặc một rig khác: so tâm của nó với tâm của mình trên màn hình.
      const box = target.getBoundingClientRect ? target.getBoundingClientRect() : null;
      const dx = (typeof target.centerX === 'function' ? target.centerX() : box.left + box.width / 2) - this.centerX();
      side = Math.abs(dx) < 1 ? 0 : dx < 0 ? -1 : 1;
    }
    const t = this.tl(), s = this.s, to = side * clamp(amount, 0, 1);
    t.to(s, { nhinX: side * 1.6, duration: 0.2, ease: 'power2.out' }, 0);          // mắt đi trước
    this.#khep(t, 0.4, 0.05, { huong: to });
    return t;
  }

  /** CẤT đồ vật đang cầm ở tay `side` ('L' | 'R' | 'both'); nó vẫn ẩn qua các động tác sau. */
  hideItem(side = 'R') { return this.#toggleItem(side, 0); }
  /** LẤY RA lại đồ vật đã cất. */
  showItem(side = 'R') { return this.#toggleItem(side, 1); }
  #toggleItem(side, value) {
    const keep = {};
    if (side !== 'R') keep.itemL = value;
    if (side !== 'L') keep.itemR = value;
    return this.#khep(this.tl(), 0.25, 0, keep);
  }

  /** NGỒI XUỐNG và ở yên trong dáng ngồi; các động tác sau (nói, gật, vẫy…) diễn khi đang ngồi. */
  sitDown() {
    const t = this.tl(), s = this.s;
    t.to(s, { dauY: 2.5, than: 0, duration: 0.25, ease: 'power2.in' }, 0);
    this.#khep(t, 0.5, 0.05, { seat: 1 });
    return t;
  }

  /** ĐỨNG DẬY từ dáng ngồi. */
  standUp() {
    const t = this.tl(), s = this.s;
    t.to(s, { dauY: 2.5, duration: 0.2, ease: 'power2.in' }, 0);
    this.#khep(t, 0.5, 0.05, { seat: 0 });
    return t;
  }

  /**
   * NGỒI xuống (như ngồi lên một chiếc ghế vô hình, nhìn thẳng), giữ, rồi đứng dậy.
   * Đùi rút ngắn theo phối cảnh — đầu gối đưa về phía người xem — và cả người hạ xuống đúng
   * bằng phần đùi vừa rút, nên bàn chân vẫn nằm trên mặt đất. Composition tự vẽ ghế nếu cần.
   */
  sit(hold = 2) {
    const t = this.tl(), s = this.s;
    // Chỉ cần đẩy `seat`: apDung tự rút đùi và hạ thân, bàn chân và bóng ở lại mặt đất.
    t.to(s, { seat: 1, than: 0, dauY: 1.5, duration: 0.45, ease: 'power2.inOut' }, 0);
    t.to(s, { batL: 14, batR: 14, cangL: -38, cangR: -38, cuoi: 0.6, duration: 0.4, ease: 'power2.out' }, 0.15);   // hai tay đặt lên đùi
    for (let a = 0.6; a < 0.45 + hold - 0.3; a += 2.4) this.#chop(t, a + 0.5);
    this.#khep(t, 0.5, 0.45 + hold);
    return t;
  }

  /**
   * Đi NGHIÊNG.
   *
   *   walk()           4 bước TẠI CHỖ, mặt quay sang phải (như máy chạy bộ) — nền
   *                    phải tự trôi thì mới hợp.
   *   walk(4, 120)     đi thật 120 đơn vị sang PHẢI rồi đứng lại ở đó; số bước và
   *                    sải chân tự chọn để chân trụ không trượt (`buoc` bị bỏ qua).
   *   walk(4, -120)    như trên nhưng sang TRÁI.
   *
   * Vị trí xuất phát đọc từ `s.x` LÚC DỰNG timeline, giống `point()`.
   */
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

  /** Bước VÀO khung rồi dừng ở giữa. `from`: 'left' (mặc định, đi sang phải) hoặc 'right'. */
  enter(from = 'left') {
    const t = this.tl(), s = this.s, chieu = from === 'right' ? -1 : 1, x0 = -270 * chieu;
    const d = this.#doBuoc(270, false, true);              // vào khung khi đang đi, dừng lại ở giữa
    t.set(s, { x: x0, mo: 1, cuoi: 0.5, huong: chieu }, 0);
    const at = this.#di(t, 0, d.buoc, 0.42, { vao: false, kA: d.kA, chieu, x: (b) => x0 + chieu * d.x(b) });
    this.#khep(t, 0.45, at, { x: 0, huong: 0, seat: 0, itemL: 1, itemR: 1 });
    return t;
  }

  /** Bước RA khỏi khung và ẩn đi. `to`: 'right' (mặc định) hoặc 'left'. */
  exit(to = 'right') {
    const t = this.tl(), s = this.s, chieu = to === 'left' ? -1 : 1;
    const d = this.#doBuoc(300, true, false);              // nhấc chân bước đi, ra khỏi khung khi vẫn đang đi
    t.to(s, { huong: chieu, cuoi: 0.6, duration: 0.35, ease: 'power2.inOut' }, 0);
    const at = this.#di(t, 0.1, d.buoc, 0.42, { ra: false, kA: d.kA, chieu, x: (b) => chieu * d.x(b) });
    t.to(s, { mo: 0, duration: 0.25 }, at - 0.25);
    this.#khep(t, 0.25, at, { x: 300 * chieu, mo: 0, huong: chieu });   // khép tư thế nhưng vẫn ở ngoài khung và ẩn
    return t;
  }

  // Số âm tiết: ĐẾM CỤM NGUYÊN ÂM của từng tiếng, sau khi bỏ dấu. Bản trước
  // nhân 1.7 âm mỗi từ — nhưng chữ Việt viết rời từng âm tiết, mỗi tiếng cách
  // nhau bằng dấu cách đúng là MỘT âm ("được", "người" đều một cụm nguyên âm),
  // nên câu 7 tiếng ra 12 khẩu hình và môi mấp máy nhanh gần gấp đôi lời đọc.
  // Đếm cụm nguyên âm thì tiếng Việt ra 1 mỗi tiếng, tiếng Anh vẫn ra số âm
  // gần đúng ("hello" 2, "beautiful" 3). Không có lời thì chia đều theo thời
  // lượng. Sàn 4 âm là để chặn `dur` bé kéo `soAm` về 0 — chia cho 0 ra `nhip`
  // vô cực và cả timeline hỏng im lặng chứ không báo lỗi.
  #soAm(text, dur) {
    if (!text) return Math.max(4, Math.round(dur / 0.14));
    let n = 0;
    for (const tieng of text.trim().split(/\s+/)) {
      const tron = tieng.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
      if (/[a-z0-9]/.test(tron)) n += Math.max(1, (tron.match(/[aeiouy]+/g) || []).length);
    }
    return Math.max(4, n);
  }

  // KHẨU HÌNH của một câu: mỗi âm tiết bốc một hình rồi khép, thay vì chỉ nhấp
  // nhô một hình duy nhất theo độ mở. Bốn hình đủ để câu nói có nhịp: mở to,
  // hé rộng, chúm, gần mím — và chúng là ba kênh của cùng một họ hình nên nối
  // vào nhau liên tục.
  // Tách riêng vì `speak()` và `explain()` dùng CHUNG. Để hai bản chép tay
  // thì sớm muộn cũng trôi khỏi nhau, và lúc ấy hai động tác cùng một nhân vật
  // lại mấp máy môi theo hai kiểu khác nhau.
  /**
   * GIỌNG ĐIỆU của một câu nói: nét mặt giữ SUỐT câu trong khi miệng vẫn nhép theo lời. Trả về
   *   { start }  phần chân mày / mắt đặt một lần ở đầu câu
   *   corner(v)  khoé miệng của từng khẩu hình, kéo về phía nét mặt (buồn thì trễ xuống dù đang nói)
   * Không có `mood` thì là kiểu nói mặc định: tươi tỉnh, hơi cười.
   */
  #tone(mood, brows = 0.5, smile = 0.5) {
    if (!mood) return { start: { mayL: brows, mayR: brows, cuoi: smile }, corner: (value) => value, eyes: 0 };
    const face = RigSVG.EXPRESSIONS[mood];
    if (!face) throw new Error(`[character] no mood "${mood}" (available: ${Object.keys(RigSVG.EXPRESSIONS).join(', ')})`);
    const corner = (value) => face.cuoi * 0.7 + value * 0.3;
    // Mắt chỉ khép MỘT PHẦN so với nét mặt đứng yên: nói mà mắt lim dim (vui, cười) thì thành ra nhếch mép, buồn ngủ.
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
    // đầu và tay phụ hoạ theo câu nói
    t.to(s, { dau: -3, dauY: 2, duration: dur * 0.35, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.1);
    t.to(s, { batR: 34, cangR: -70, than: -1.5, duration: 0.35, ease: 'power2.out' }, 0.2)
     .to(s, { batR: 40, cangR: -60, duration: 0.35, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.55);
    if (dur > 1.2) this.#chop(t, dur * 0.55);
    this.blinkTo = 0;
    t.to(s, { mieng: 0, duration: 0.15 }, dur);
    this.#khep(t, 0.5, dur + 0.05);
    return t;
  }

  /**
   * TRÔI KHÔNG CHU KỲ — thay cho `yoyo` hình sin.
   *
   * Bản trước dựng cả tầng "sống" bằng yoyo sin chu kỳ cố định (thở 1.9s, đầu
   * 2.6/3.1s, dồn chân 5.2s). Đo tự-tương-quan trên bản render: 7 trong 11 kênh
   * có đỉnh ≥ 0.7 — dao động đều tăm tắp. ĐÓ CHÍNH LÀ CHỮ KÝ CỦA MÁY. Chọn ba
   * chu kỳ lệch nhau không cứu được: từng kênh vẫn tuần hoàn, và mắt bắt được
   * tính tuần hoàn của TỪNG kênh chứ không bắt tổng của chúng.
   *
   * Ở đây mỗi kênh đi tới một đích NGẪU NHIÊN trong một khoảng thời gian cũng
   * NGẪU NHIÊN, nối đuôi nhau — không có chu kỳ để mà bắt.
   */
  #troi(t, khoa, min, max, D, nganNhat = 0.7, daiNhat = 2.0) {
    let at = 0;
    while (at < D) {
      // Nhịp cuối bị cắt cho vừa `D`: một nhịp trôi còn chạy sau `D` sẽ đè lên `#khep` và để kênh
      // ấy (đầu nghiêng, hơi thở) dừng lệch khỏi tư thế nghỉ.
      const d = Math.min(nhieu(nganNhat, daiNhat), D - at);
      if (d < 0.05) break;
      t.to(this.s, { [khoa]: nhieu(min, max), duration: d, ease: 'sine.inOut' }, at);
      at += d;
    }
    return t;
  }

  /**
   * CỬ CHỈ CÓ CẤU TRÚC — bốn pha, dùng chung cho `explain()` và `speakCues()`.
   *
   * HAI BẢN TRƯỚC ĐỀU SAI, VÀ SAI NGƯỢC CHIỀU NHAU:
   *   · Bản 1 là BỘ XUNG: vung ra rồi kéo nguyên về, giữa hai xung không có
   *     gì. Rút khung từ bản render: mười khung đứng im, một khung giật.
   *   · Bản 2 chữa bằng cách cho tay ĐI LIÊN TỤC giữa các tư thế NGẪU NHIÊN.
   *     Hết đơ nhưng thành "vơ tay lung tung" — vì NGẪU NHIÊN KHÔNG PHẢI LÀ
   *     SỐNG. Tay đi mãi mà không tới đâu thì mắt đọc ra nhiễu, không ra ý.
   *
   * Cử chỉ người thật có bốn pha, và pha thứ ba mới làm nên nghĩa:
   *   LẤY ĐÀ  (0.18s) — nhích ngược hướng một chút, lấy trớn.
   *   NHẤN    (0.26s) — bung tới đích, nhanh, vọt qua rồi lắng lại.
   *   GIỮ     (0.35–1.6s) — ĐỨNG YÊN Ở ĐÍCH. Bỏ pha này là mọi cử chỉ thành
   *                        nhiễu; chính khoảng trống này làm nó "có ý".
   *   BUÔNG   (0.55s) — về thế chuẩn bị, chậm hơn lúc nhấn.
   *
   * Và THÂN DẪN TRƯỚC TAY 0.10s: người thật khởi động từ thân rồi mới tới chi.
   * Thiếu độ trễ đó thì tay như que gắn vào khối gỗ.
   */
  #cuChi(t, moc, D) {
    const s = this.s;
    if (!moc.length) return t;
    // THẾ CHUẨN BỊ — tay buông hờ ngang bụng. Cử chỉ nào cũng đi từ đây và về
    // đây, nên đây là tư thế người xem nhìn thấy nhiều nhất.
    const CB = { batL: 18, cangL: -70, batR: 24, cangR: -78 };
    // Đích của các cú nhấn: ÍT và KHÁC NHAU RÕ, không phải một bảng rung quanh
    // cùng một chỗ như bản trước. Tay phải chủ đạo.
    const DICH = [
      { batR: 56, cangR: -54, batL: 22, cangL: -72 },   // mở sang phải
      { batR: 40, cangR: -98, batL: 20, cangL: -74 },   // đưa lên ngực
      { batR: 50, cangR: -62, batL: 46, cangL: -60 },   // mở cả hai tay
      { batR: 34, cangR: -70, batL: 44, cangL: -58 },   // nhường sang trái
    ];
    t.set(s, CB, 0);
    let k = Math.floor(ngau() * DICH.length);
    moc.forEach((a, i) => {
      let m = k; while (m === k && DICH.length > 1) m = Math.floor(ngau() * DICH.length);
      k = m;
      const h = DICH[k];
      const sau = i + 1 < moc.length ? moc[i + 1] : D;
      const giu = clamp((sau - a) - 1.05, 0.35, 1.6);
      const tNhan = a + 0.18, tBuong = tNhan + 0.26 + giu;
      if (tBuong + 0.55 > sau + 0.35) return;            // không đủ chỗ thì bỏ nhịp này

      t.to(s, { than: -1.5 + nhieu(-2.2, 2.2), duration: 0.34, ease: 'sine.inOut' }, a + 0.10);
      t.to(s, { batR: CB.batR - 5, cangR: CB.cangR - 4, duration: 0.18, ease: 'sine.in' }, a);
      t.to(s, { batR: h.batR, cangR: h.cangR, duration: 0.26, ease: 'back.out(1.5)' }, tNhan)
       .to(s, { batL: h.batL, cangL: h.cangL, duration: 0.34, ease: 'back.out(1.1)' }, tNhan + 0.07);
      t.to(s, { dauY: nhieu(1.4, 3.0), duration: 0.26, ease: 'power2.out' }, tNhan)
       .to(s, { dauY: 0, duration: 0.5, ease: 'sine.inOut' }, tNhan + 0.30);
      // GIỮ: cố ý KHÔNG có tween nào trên tay trong khoảng này.
      t.to(s, { batR: CB.batR, cangR: CB.cangR, duration: 0.55, ease: 'power2.inOut' }, tBuong)
       .to(s, { batL: CB.batL, cangL: CB.cangL, duration: 0.62, ease: 'power2.inOut' }, tBuong + 0.06);
    });
    return t;
  }

  /**
   * NÓI CÓ ĐÁNH TAY — dùng chung khẩu hình với `speak()`, thêm tầng cử chỉ.
   *
   * `speak()` để tay gần như bất động: đúng MỘT dao động của riêng tay phải cho
   * cả câu, tay trái không hề nhúc nhích. Cận mặt thì không sao, nhưng nhân vật
   * đứng toàn thân nói vài giây thì ra pho tượng biết mấp máy môi — mà đoạn nói
   * chiếm phần lớn thời lượng mọi video.
   *
   * BẢN ĐẦU TÔI LÀM SAI, ghi lại để đừng ai làm lại: nhấc cả hai tay lên một
   * tư thế "nhà" rộng (bat 60–66) rồi GIỮ nguyên suốt câu, chỉ rung quanh nó
   * ±18. Ra dáng bù nhìn dang tay, không ra người đang nói. Ba chỗ hỏng:
   * `bat` lớn đẩy khuỷu ra xa thân; hai tay đối xứng; và cái dáng rộng ấy là
   * dáng GIỮ, nên biên độ nhịp nhỏ hơn hẳn độ lệch tĩnh — mắt đọc ra tư thế
   * chứ không đọc ra chuyển động.
   *
   * Bản này đảo lại cấu trúc:
   *   • NỀN THẤP, gần tư thế nghỉ — tay buông hờ trước bụng, khuỷu sát thân.
   *     Giữa hai nhịp tay VỀ nền, nên không lúc nào đông cứng ở dáng rộng.
   *   • MỖI NHỊP LÀ MỘT CỬ CHỈ THẬT: cẳng tay phải nâng từ bụng lên ngực rồi
   *     lắng xuống. Biên độ lớn hơn hẳn độ lệch của nền, nên thứ đập vào mắt
   *     là chuyển động chứ không phải tư thế.
   *   • MỘT TAY CHỦ ĐẠO. Tay trái chỉ góp ở nhịp nhấn và biên nhỏ hơn. Hai tay
   *     cùng làm mọi nhịp là quay lại đúng dáng bù nhìn.
   *   • Nhịp cách 4 âm, không phải mỗi âm — và đủ dài để nâng rồi lắng cho hết.
   */
  explain(text = null, dur = 2.4, { mood = null } = {}) {
    const t = this.tl(), s = this.s, tone = this.#tone(mood, 0.45, 0.5);
    this.#openUp(t);
    const soAm = this.#soAm(text, dur), nhip = dur / soAm;
    // Nền THẤP và LỆCH: tay trái buông gần thõng, tay phải hé hơn một chút.
    // Trái phải khác nhau ngay từ nền thì cái nâng của tay phải mới nổi lên —
    // để hai tay ngang nhau là bàn tay phải bị bàn tay trái che mất.
    const NEN = { batL: 10, batR: 16, cangL: -60, cangR: -72 };

    t.set(s, { tayL: 'xoe', tayR: 'xoe' }, 0);
    t.to(s, { ...NEN, than: -1.5, ...tone.start, nhinX: 0.8,
              duration: 0.35, ease: 'power2.out' }, 0);

    this.blinkTo = tone.eyes;
    this.#khauHinh(t, soAm, nhip, tone.corner);

    // Bỏ nhịp nào rơi vào 0.5s cuối: đang vung dở thì bị `#khep` giật về nghỉ.
    const BUOC = 5, moc = [];
    for (let i = 1; i < soAm && i * nhip <= dur - 0.5; i += BUOC) moc.push(i * nhip);
    this.#cuChi(t, moc, dur);

    if (dur > 1.2) this.#chop(t, dur * nhieu(0.4, 0.65));
    this.blinkTo = 0;
    t.to(s, { mieng: 0, chum: 0, duration: 0.15 }, dur);
    this.#khep(t, 0.5, dur + 0.05);
    return t;
  }

  /**
   * NÓI THEO CUE THẬT — nhép miệng bám âm thanh, kèm nhịp tay.
   *
   * Khác `speak()`/`explain()`: hai hàm kia ĐOÁN nhịp từ số từ, nên môi chạy
   * đúng tiết tấu nhưng không đúng lời. Hàm này nhận cue đo từ chính file
   * tiếng (định dạng Rhubarb) nên môi khớp lời.
   *
   *   const cue = await (await fetch('loi.cues.json')).json();
   *   tl.add(rig.speakCues(cue).paused(false), 2.0);
   *
   * HAI QUYẾT ĐỊNH đáng ghi:
   *
   * 1. VUỐT chứ không NHẢY hình. Rhubarb định cho hiển thị rời từng khung,
   *    nhưng ở cỡ nhân vật đứng trong slide thì nhảy hình đọc ra giật môi.
   *    Vuốt 60ms giữ nguyên nhịp mà hết giật — cùng lý do `speak.py` nội suy
   *    40ms cho đường clip. Vuốt bị kẹp lại nếu cue ngắn hơn.
   *
   * 2. NHỊP TAY BÁM CHỖ NGẮT HƠI, không chia đều theo giây. Mỗi khoảng im (X)
   *    dài hơn 0.16s là ranh giới một mệnh đề, và người dẫn đánh tay ngay khi
   *    vào mệnh đề mới. Chia đều thì tay rơi vào giữa từ — đó chính là cái
   *    "cứng đơ": tay vẫn động nhưng động lệch chỗ nên não đọc ra máy móc.
   */
  speakCues(cue, dur = null, { cuChi = true, mood = null } = {}) {      // `{ text }` trong tham số thứ ba là LỜI cho `captions()`; rig không dùng tới
    const t = this.tl(), s = this.s, tone = this.#tone(mood, 0.4, 0.45);
    this.blinkTo = tone.eyes;
    this.#openUp(t);
    const ds = Array.isArray(cue) ? cue : (cue && cue.mouthCues) || [];
    const D = dur || (cue && cue.metadata && cue.metadata.duration)
                  || (ds.length ? ds[ds.length - 1].end : 2);
    // Không có cue thì rơi về nhịp ước lượng, đừng đứng im mở mắt.
    if (!ds.length) return this.explain(null, D);

    // Nền CAO hơn `explain`: người dẫn tin giữ thế sẵn sàng, hai tay tách
    // nhau ngang bụng — không phải thế nghỉ đan tay. Giữa hai mệnh đề tay về
    // đây, nên nền chính là tư thế người xem nhìn thấy nhiều nhất.
    const NEN = { batL: 20, batR: 28, cangL: -70, cangR: -80 };
    t.set(s, { tayL: 'xoe', tayR: 'xoe' }, 0);
    t.to(s, { ...NEN, than: -1.5, ...tone.start, nhinX: 0.6,
              duration: 0.3, ease: 'power2.out' }, 0);

    // LỚP NỀN SỐNG — thở, đảo đầu, đảo mắt, chạy suốt cả câu trên những kênh
    // mà tầng nhịp tay KHÔNG đụng tới (`tho`, `dauX`, `nhinX`). Thiếu lớp này
    // thì giữa hai mệnh đề nhân vật đứng đơ hoàn toàn — mà chỗ ngắt hơi lại
    // đúng là chỗ mắt người xem rơi vào. Ba chu kỳ lệch nhau (1.9 / 2.6 / 3.4s)
    // nên chúng không bao giờ trùng pha thành một nhịp máy móc.
    this.#troi(t, 'tho', 0, 1, D, 0.9, 2.2);
    // ĐẦU phải NGHIÊNG, không chỉ dịch ngang: `dauX` 1.3 đơn vị chỉ dời đầu
    // ~2px, dưới ngưỡng mắt thấy, còn xoay `dau` làm đổi pixel trên KHẮP đường
    // bao đầu. Hai kênh này KHÔNG đụng `dauY`/`than` — hai khoá đó do
    // `#cuChi` giữ, chồng tween lên nhau là đầu giằng co.
    this.#troi(t, 'dau', -3.4, 3.4, D, 1.0, 2.6);
    this.#troi(t, 'dauX', -4, 4, D, 0.9, 2.4);

    // ĐỨNG KHÔNG PHẢI LÀ ĐỨNG YÊN. Người đứng nói dồn trọng tâm qua lại giữa
    // hai chân suốt buổi. Đo bản trước trên chính file mp4: vùng chân đứng im
    // 54/89 khung — từ thắt lưng xuống là một cái cột, và đó mới là thứ đọc ra
    // "đứng đơ", chứ không phải tay.
    //   `x` dời cả người, `dui`/`ong` đổi chân trụ. Chu kỳ 5.2s để lệch hẳn
    // với thở (1.9) và với đầu (2.6/3.1) — ba nhịp không bao giờ trùng pha.
    // Dồn trọng tâm: ĐỔI BÊN rồi GIỮ một lúc, cả hai đều ngẫu nhiên. Người
    // đứng không lắc lư theo nhịp — họ tì một chân, đứng đó một lúc, rồi đổi.
    // Dồn trọng tâm quanh CHỖ ĐANG ĐỨNG (`x0`), không quanh giữa khung: nhân vật đã `walk` tới
    // một điểm đánh dấu mà dồn quanh 0 thì vừa mở miệng đã trượt về giữa khung và ở luôn đó.
    const x0 = s.x;
    let atC = nhieu(0.2, 0.9), ben = ngau() < 0.5 ? 1 : -1;
    while (atC < D) {
      const doi = nhieu(0.7, 1.3);
      // Nhịp dồn trọng tâm phải XONG trước khi câu nói kết thúc: nhịp nào còn chạy lúc `#khep`
      // đưa người về chỗ cũ thì nó thắng, và nhân vật dừng lại ở tư thế lệch.
      if (atC + doi > D - 0.05) break;
      // ĐỔI BÊN chỉ 70% số lần — 30% còn lại chỉnh lại trọng tâm trên CÙNG
      // một chân. Luân phiên cứng trái–phải là một sóng vuông, và tự-tương-
      // quan bắt được nó ngay (đo được đỉnh quay lại 0.57 ở `x`).
      if (ngau() < 0.7) ben = -ben;
      const manh = nhieu(0.45, 1);
      t.to(s, { x: x0 + ben * 2.3 * manh, duiL: ben * 3.0 * manh, duiR: -ben * 3.0 * manh,
                ongL: -ben * 2.0 * manh, ongR: ben * 2.0 * manh,
                duration: doi, ease: 'sine.inOut' }, atC);
      atC += doi + nhieu(0.9, 3.2);
    }

    // MẮT ĐẢO THEO BƯỚC NHẢY, không theo hình sin. Mắt người không trôi đều —
    // nó đứng một chỗ rồi nhảy sang chỗ khác (saccade). Cho `nhinX` chạy sin
    // thì thành mắt đảo như búp bê; nhảy rồi giữ mới ra người đang nói.
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
      // Cách nhau ít nhất 2.4s: một cử chỉ đủ bốn pha mất ~1.6s, chưa kể
      // khoảng lặng giữa hai cử chỉ. Dồn sát hơn là quay lại vơ tay.
      if (moc.length && c.end - moc[moc.length - 1] < 2.4) continue;
      moc.push(c.end);
    }
    if (!moc.length && D > 1.6) moc.push(D * 0.35);
    // KHÔNG chèn thêm mốc nữa. Bản trước chèn điểm giữa mọi quãng > 2.6s để
    // "tay khỏi đứng" — đó chính là chỗ đẻ ra vơ tay. Tay đứng yên giữa hai cử
    // chỉ là ĐÚNG; cái phải sống trong khoảng đó là mặt, đầu và hơi thở.
    // `cuChi: false` — ĐỨNG YÊN TAY, chỉ thở và nói. Người dẫn tin thật gần
    // như không khoát tay: họ đứng, để mặt và đầu gánh hết. Tay vẫn không chết
    // cứng vì hai cánh tay treo trong nhóm `tren`/`sau`, mà nhóm đó nhấc lên
    // hạ xuống theo hơi thở (`nhacY`) — nên tay nhô theo nhịp thở, chỉ là
    // không có cử chỉ nào.
    if (cuChi) this.#cuChi(t, moc, D);

    for (let b = nhieu(0.6, 1.2); b < D - 0.4; b += nhieu(1.8, 3.4)) this.#chop(t, b);
    this.blinkTo = 0;
    t.to(s, { mieng: 0, chum: 0, duration: 0.18 }, D);
    this.#khep(t, 0.5, D + 0.05, { x: x0 });       // `#khep` không đụng `x`; trả về đúng chỗ đứng lúc bắt đầu
    return t;
  }

  /**
   * LO LẮNG / NÊU VẤN ĐỀ — bàn tay đặt lên ngực, mày nhướn, khoé miệng trĩu.
   *
   * Nhịp mở đầu của gần như mọi video marketing ("thú cưng nhà bạn có đang…?")
   * trước nay KHÔNG có cử chỉ nào diễn được: đo 13 động tác cũ thì `cuoi` chỉ
   * chạm âm ở đúng `shrug` (−0.4), còn lại trung tính tới vui hết.
   *
   * PHẢI KHÁC `shrug` Ở NGÔN NGỮ THÂN, không ở nét mặt. Hai động tác dùng gần
   * như cùng bộ mặt (mày nhướn + khoé miệng trĩu) vì đó là bộ mặt duy nhất rig
   * diễn được cho cả hai; phân biệt nằm ở chỗ khác:
   *   `shrug`  — nhanh, hai tay hất ra ngoài, vai giật lên: "chịu, không biết".
   *   `worry` — chậm, MỘT tay thu vào ngực, vai hơi rụt: "tôi đang lo".
   *
   * Nhịp quan trọng nhất là MẮT NGƯỚC LÊN ở giữa: vào thì cúi nhìn xuống, giữa
   * chừng mới ngước lên nhìn thẳng người xem. Đó là chỗ câu hỏi chạm tới khán
   * giả; thiếu nó thì chỉ là một người đang buồn chuyện riêng.
   */
  worry() {
    const t = this.tl(), s = this.s;
    this.#openUp(t);
    // Tay phải lên ngực bằng `cang` (gập khuỷu) — đo thì bàn tay từ y 320 lên
    // 285, tức vừa chạm dưới túi ngực. Tay trái buông thấp cho lệch hẳn.
    t.set(s, { tayL: 'mo', tayR: 'mo' }, 0);
    t.to(s, { batR: 28, cangR: -122, batL: 10, cangL: -58,
              than: 2, vai: -2, dau: 5, dauY: 2.5, nhinY: 0.8, nhinX: -0.4,
              mayL: 0.7, mayR: 0.7, cuoi: -0.5, mieng: 0.08,
              duration: 0.55, ease: 'power2.out' }, 0);
    // Ngước lên nhìn thẳng, tay khẽ ấn vào ngực rồi buông — để tư thế còn thở
    // chứ không đông cứng suốt clip.
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

/* ───── runtime/rig-thu.js ───── */
__m['runtime/rig-thu.js'] = (function () {
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
//   duoi (độ, cộng vào góc đuôi) · duoiCong (cộng vào độ cuộn)
//   Bốn chân — tn/tx = TRƯỚC gần/xa, sn/sx = SAU gần/xa:
//     ..X ..Y   dời bàn chân tới (x dương = về phía đầu) và nhấc lên (y dương = lên)
//     tnNhac txNhac 0..1  chân trước rời đất, treo theo vai;  tnGoc txGoc góc treo
//                         (độ; 0 = thõng xuống, dương = đưa ra trước / lên)

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
  ngoi: 0, tho: 0, truocX: 0, truocY: 0, sauX: 0, sauY: 0, cong: 0, xu: 0,
  dau: 0, dauX: 0, dauY: 0, taiL: 0, taiR: 0,
  matY: 0, nhinX: 0, nhinY: 0, dongTu: 1, mieng: 0, luoi: 0, cuoi: 0.4,
  duoi: 0, duoiCong: 0,
  tnX: 0, tnY: 0, tnNhac: 0, tnGoc: 0, txX: 0, txY: 0, txNhac: 0, txGoc: 0,
  snX: 0, snY: 0, sxX: 0, sxY: 0,
});

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

/* ───────────────────────────────────────────────────────────── ĐẦU MÈO
 * Tai nhọn lót hồng, mắt có tròng màu và con ngươi dọc, ria, vằn trán.
 */
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

  // `rig.s` là một Proxy: hễ có ai GHI vào trạng thái thì hẹn vẽ lại ở cuối lượt chạy
  // hiện tại (microtask). Timeline vẫn gọi `apDung` qua `onUpdate` như cũ — lớp này để
  // phòng trường hợp bộ dựng video tua bằng `seek()`, vốn TẮT mọi callback của GSAP:
  // không có nó thì trạng thái đổi mà hình đứng yên. Vẽ lại hai lần trong một lượt
  // không sao, `apDung` chỉ là hàm của trạng thái.
  #choVe = false;
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
    // Nối chuỗi, KHÔNG dùng template literal trong querySelector: bộ lint của HyperFrames
    // (và bộ đóng gói HTML của nó) từ chối selector có biến nội suy.
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

  /** viewBox cắt sát mặt — cho nút "Cận mặt" của studio. */
  khungMat(nua = 70) {
    const { S } = this.#khung(), d = this.nv.dau, k = this.s.huong < 0 ? -1 : 1;
    const cx = 200 + (S.x + d.dx - 200) * k, cy = S.y + d.dy;
    return `${cx - nua} ${cy - nua + 2} ${nua * 2} ${nua * 2}`;
  }

  // Hông H và vai S theo trạng thái. Ngồi: mông hạ xuống chạm nền và dịch tới, vai lùi nhẹ.
  #khung() {
    const s = this.s, nv = this.nv, ng = mem(s.ngoi);
    const H = { x: nv.H0.x + 22 * ng + s.sauX, y: pha(nv.H0.y, DAT - nv.dayThan + 3, ng) + s.sauY };
    // Ngồi thì VAI NHẤC LÊN cho hai chân trước gần duỗi thẳng (96% chiều dài chân): để vai
    // ở cao độ lúc đứng thì chân trước khuỵu gập, nhìn ra con vật đang giơ tay chứ không ngồi.
    const T = nv.chanT, vaiNgoi = Math.min(nv.S0.y, DAT - T.rong * 0.36 - 4 - 0.96 * (T.a + T.b));
    const S = { x: nv.S0.x - 9 * ng + s.truocX, y: pha(nv.S0.y, vaiNgoi, ng) + s.truocY };
    return { H, S, ng };
  }

  /* ------------------------------------------------------ đổ trạng thái */

  apDung() {
    const s = this.s, e = this.el, nv = this.nv, { H, S, ng } = this.#khung();
    const fx = (v) => v.toFixed(2);
    // Cả con lật theo `huong` quanh trục giữa khung; co dãn quanh điểm chạm đất.
    e.goc.setAttribute('transform', `translate(${fx(s.x)} ${fx(s.y)}) translate(200 ${DAT}) scale(${fx(s.co * (s.huong || 1e-3))} ${fx(s.co)}) translate(-200 ${-DAT})`);
    e.goc.setAttribute('opacity', s.mo);
    const cao = clamp(-s.y / 50, 0, 1);
    e.bong.setAttribute('cx', fx((H.x + S.x) / 2 + 6));
    e.bong.setAttribute('rx', fx(((S.x - H.x) / 2 + nv.dayThan + 14) * (1 - cao * 0.3)));
    e.bong.setAttribute('transform', `translate(0 ${fx(-s.y / (s.co || 1))})`);   // bóng ở lại mặt nền khi nhảy
    e.bong.setAttribute('opacity', 0.26 - cao * 0.12);

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
      e[k].setAttribute('d', `M ${fx(R.x)} ${fx(R.y)} L ${fx(J.x)} ${fx(J.y)} L ${fx(ban.x)} ${fx(ban.y)}`);
      e[k + 'Ban'].setAttribute('transform', `translate(${fx(ban.x + c.rong * 0.22)} ${fx(ban.y)})`);
      return R;
    };
    const xTruoc = pha(nv.S0.x + 3, nv.S0.x - 5, ng), xSau = pha(nv.H0.x - 3, nv.H0.x + 52, ng);
    dat('tn', xTruoc, false); dat('tx', xTruoc, true);
    const hn = dat('sn', xSau, false), hx = dat('sx', xSau, true);
    e.duiN.setAttribute('transform', `translate(${fx(hn.x + 3)} ${fx(hn.y)})`);
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
    }
    this.#veMom();
  }

  // Mõm: nét môi hình chữ "w" dưới mũi, hàm mở ra phía dưới, lưỡi nằm trong hàm rồi thè ra.
  #veMom() {
    const s = this.s, e = this.el, k = this.nv.mom.co, y0 = this.nv.mom.y;
    const mo = clamp(s.mieng, 0, 1), cu = s.cuoi * 2.6 * k, w = 9.5 * k, f = (v) => v.toFixed(2);
    e.moi.setAttribute('d', `M 0 ${f(y0 - 3.4 * k)} V ${f(y0)} M ${f(-w)} ${f(y0 - cu)} Q ${f(-w / 2)} ${f(y0 + 5 * k)} 0 ${f(y0)} Q ${f(w / 2)} ${f(y0 + 5 * k)} ${f(w)} ${f(y0 - cu)}`);
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

  /** Tên tiếng Việt của từng động tác — cho giao diện. */
  static TEN_DONG_TAC = {
    idle: 'Đứng yên', walk: 'Đi', enter: 'Chạy vào', exit: 'Chạy ra', tiltHead: 'Nghiêng đầu',
    wagTail: 'Vẫy đuôi', bark: 'Sủa', sit: 'Ngồi', jump: 'Nhảy mừng', beg: 'Đứng xin', givePaw: 'Bắt tay', sniff: 'Đánh hơi',
    meow: 'Kêu meo', purr: 'Gừ gừ', lickPaw: 'Liếm chân', stretch: 'Vươn vai', hiss: 'Xù lông', tailSwish: 'Quẫy đuôi', pounce: 'Rình vồ',
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
    so.ngoi = this.s.ngoi; so.huong = this.s.huong;
    t.to(this.s, { ...so, ...giu, duration: d, ease: 'power2.inOut' }, at);
    return t;
  }
  #chop(t, at) {
    t.to(this.s, { matY: 1, duration: 0.07, ease: 'power1.in' }, at).to(this.s, { matY: 0, duration: 0.11, ease: 'power1.out' }, at + 0.07);
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
    const chan = (p) => { p = ((p % 1) + 1) % 1;
      if (p < 0.6) return { x: A * (1 - 2 * p / 0.6), y: 0 };
      const u = (p - 0.6) / 0.4; return { x: -A + 2 * A * mem(u), y: cao * Math.sin(Math.PI * u) }; };
    const c1 = chan(f), c2 = chan(f + 0.5), nh = Math.cos(4 * Math.PI * f);
    return { tnX: c1.x * a, tnY: c1.y * a, sxX: c1.x * a, sxY: c1.y * a, txX: c2.x * a, txY: c2.y * a, snX: c2.x * a, snY: c2.y * a,
             truocY: -1.6 * nh * a, sauY: 1.6 * nh * a, dauY: 1.4 * nh * a, duoi: 7 * Math.sin(2 * Math.PI * f) * a };
  }
  // Đặt `chuKy` chu kỳ bước vào timeline; `quang` ≠ 0 thì dời cả con đúng chừng ấy (chân trụ không trượt).
  #di(t, at, chuKy, h, { vao = true, ra = true, quang = 0, x0 = 0, A = 13, cao = 9 } = {}) {
    const s = this.s;
    const bao = (c) => (vao ? mem(c / 0.5) : 1) * (ra ? mem((chuKy - c) / 0.5) : 1);
    // Chân trụ lùi 2A trong 0.6 chu kỳ ⇒ thân tiến (2A/0.6)·biên độ mỗi chu kỳ. Lập bảng quãng đường.
    const M = 60, n = Math.round(chuKy * M), X = [0];
    for (let i = 1; i <= n; i++) X.push(X[i - 1] + (2 * A / 0.6) * bao(i / M) / M);
    const tiLe = quang ? Math.abs(quang) / X[n] : 0, dau = quang < 0 ? -1 : 1;
    const dat = (c) => {
      const a = bao(c);
      Object.assign(s, this.#buoc(c, a, A * (tiLe ? Math.min(1.35, Math.max(0.5, tiLe)) : 1), cao));
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

  /** Chạy VÀO khung từ bên trái rồi dừng ở giữa. */
  enter() {
    const t = this.tl(), s = this.s;
    t.set(s, { x: -300, mo: 1, ngoi: 0, huong: 1, cuoi: 0.8, taiL: 0.6, taiR: 0.6 }, 0);
    const at = this.#di(t, 0, 6, 0.36, { vao: false, quang: 300, x0: -300, A: 16, cao: 11 });
    this.#khep(t, 0.4, at, { x: 0, ngoi: this.NGHI.ngoi, huong: 1 });      // vào xong: về dáng nghỉ của giống, đầu quay phải
    return t;
  }

  /* ----------------------------------------------------------- thế đứng */

  // Động tác đổi THẾ ĐỨNG và giữ nguyên cho các động tác sau.
  static STANCE = ['sitDown', 'standUp', 'face'];

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
  shotBox(kind = 'full') {
    const { S } = this.#khung(), d = this.nv.dau, s = this.s, k = s.huong < 0 ? -1 : 1;
    const headX = 200 + (S.x + d.dx - 200) * k + s.x, headY = S.y + d.dy + s.y;
    if (kind === 'face') return { x: headX - 66, y: headY - 64, width: 132, height: 132 };
    if (kind !== 'chest' && kind !== 'full') throw new Error(`[character] no shot "${kind}" (available: face, chest, full)`);
    const top = headY - 72, bottom = DAT + 10;
    return { x: 200 + s.x - 125, y: top, width: 250, height: bottom - top };
  }

  /** NGỒI XUỐNG và ở yên trong dáng ngồi. */
  sitDown() { return this.#khep(this.tl(), 0.4, 0, { ngoi: 1 }); }

  /** ĐỨNG DẬY và ở yên trong dáng đứng (mèo vốn nghỉ ở dáng ngồi). */
  standUp() { return this.#khep(this.tl(), 0.35, 0, { ngoi: 0 }); }

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

  /** Chạy RA khỏi khung về bên phải và ẩn đi. */
  exit() {
    const t = this.tl(), s = this.s;
    let at = this.#dung(t, 0);
    at = this.#di(t, at, 6, 0.36, { ra: false, quang: 320, x0: 0, A: 16, cao: 11 });
    t.to(s, { mo: 0, duration: 0.2 }, at - 0.2);
    this.#khep(t, 0.2, at, { x: 320, mo: 0 });
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

  /* ---------------------------------------------------------------- CHÓ */

  wagTail() {
    const t = this.tl(), s = this.s;
    t.to(s, { taiL: 0.8, taiR: 0.8, cuoi: 1, mieng: 0.45, luoi: 0.7, dau: -3, duration: 0.2, ease: 'power2.out' }, 0);
    this.#vay(t, 0.1, 12, 30, 0.11);
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
      t.to(s, { mieng: 0.95, dau: -9, dauY: -5, dauX: 3, truocY: -4, taiL: 0.3, taiR: 0.3, duration: 0.09, ease: 'power2.out' }, at)
       .to(s, { mieng: 0.1, dau: 0, dauY: 0, dauX: 0, truocY: 0, taiL: 1, taiR: 1, duration: 0.17, ease: 'power2.in' }, at + 0.11);
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
    t.to(s, { cong: 1, xu: 1, truocY: -5, sauY: -7, duoi: 30, duoiCong: 0.55, taiL: -1, taiR: -1, dongTu: 0.35, cuoi: -0.6, dau: -4, dauY: 3,
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
    for (let i = 0; i < 5; i++) t.to(s, { duoi: i % 2 ? -26 : 20, duoiCong: i % 2 ? 0.75 : -0.35, duration: 0.36, ease: 'sine.inOut' }, 0.1 + i * 0.36);
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
}

return { RigThu };
})();

/* ───── runtime/characters.js ───── */
__m['runtime/characters.js'] = (function () {
// characters.js — BA NHÂN VẬT có sẵn, dựng trên bộ xương của bác sĩ thú y, và BỘ ĐỒ NGHỀ
// (`KIT`) để nhân vật tuỳ chỉnh trong `characters/` dùng lại.
//
// Mỗi nhân vật có ĐẦU riêng và BỘ ĐỒ riêng; bộ xương, khớp và mọi động tác thì
// dùng chung (xem NV_MAC_DINH trong ./rig-svg.js).
//
//   surgeon      bác sĩ phẫu thuật — đồ mổ xanh ngọc cổ chữ V, mũ mổ, khẩu trang
//               kéo xuống cổ, thẻ tên, dép trắng; đứng buông tay
//   nurse  điều dưỡng — áo hồng in dấu chân, tay loe viền trắng, đồng hồ
//               cài ngực, hai túi dưới, quần xanh đậm, giày thể thao trắng
//   doctor     bác sĩ đeo kính — áo blouse trắng DÀI TAY, ve áo, hàng cúc, bút
//               cài túi ngực, thẻ tên, ống nghe, quần tây, giày đen
//
// Slot của ĐẦU:  khuon · coDau/dauLech · toc() · mu() · mat() · mui() · net() · bố cục
//                mặt (matX matY mayY maX maY miengY taiX…) · mau.da/toc/mat/…
// Slot của THÂN: ao() · suon · coAo() · phuKien() · phuKienTren() · giay() ·
//                các số tay áo (daiTayAo, rongTayAo, vienGau…) · tayDai · nghi ·
//                mau.ao/aoToi/quan/giay/phuKien
//
// ID BẮT BUỘC, sai là hỏng im lặng chứ không báo lỗi:
//   toc() phải có <g id="${p}-tocTruoc"> — rig dịch nó theo mặt khi xoay.
//     (<g id="${p}-tocSau"> là slot kiểu cũ: vẫn nhận nhưng rig ẩn đi, phần tóc
//     sau đầu rig tự sinh.) Mọi mảng tóc phải thấy khi nhìn thẳng — búi, đuôi,
//     mái, MŨ — đều đặt trong `tocTruoc`.
//   mat() phải có <g id="${p}-mat${ben}"> và <g id="${p}-nguoi${ben}">
//   phuKien() phải bọc trong <g id="${p}-phuKien"> — rig co nó theo thân áo.
//   giay() phải có id="${p}-ban${ben}".
//
// TOẠ ĐỘ. Đầu: gốc ở tâm đầu, sọ x −50…50, đỉnh y ≈ −56, cằm y ≈ +56.
// Thân: gốc ở HÔNG, y âm là lên — vai (±35, −88), chân cổ (±13, −103), eo
// y ≈ −30, gấu áo y ≈ +20; chốt vai ở (±33, −90) nên nắp tay áo phủ |x| > 21.

/* ───────────────────────────────────────────────────── mảnh đồ dùng chung */
// Hai dải tối ôm mép áo, sinh từ chính các điểm của đường bao (thụt vào 5).
const suonTu = (diem) => ['L', 'R'].map((b) => { const g = b === 'L' ? -1 : 1;
  const ngoai = diem.map(([x, y]) => `${g * x} ${y}`), trong = diem.map(([x, y]) => `${g * (x - 5)} ${y}`).reverse();
  return `M ${ngoai.join(' L ')} L ${trong.join(' L ')} Z`; }).join(' ');
// Hai miếng vải vai che phần cổ loe ra — cổ áo nào cũng cần.
const vaiCo = (m) => `
        <path d="M -28.5 -96 Q -22 -102.5 -12.2 -103.5 L -8.5 -96 Z" fill="${m.ao}"/>
        <path d="M 28.5 -96 Q 22 -102.5 12.2 -103.5 L 8.5 -96 Z" fill="${m.ao}"/>`;
// Giày kín mũi (dép mổ, giày tây, giày thể thao) — khác đôi giày bệt hở mu của bác sĩ thú y.
const giayKin = (soc) => (p, ben, m, ong) => `
          <g id="${p}-ban${ben}">
            <path d="M -12 ${ong - 6} h 24 v 11 q 0 7 -7 7 h -10 q -7 0 -7 -7 z" fill="${m.giay}"/>
            ${soc ? `<path d="M -12 ${ong + 1} h 24" stroke="${soc}" stroke-width="2.2"/>` : ''}
          </g>`;
// Thẻ tên: thẻ trắng, dải màu trên đầu, chấm ảnh và hai dòng chữ.
const theTen = (x, y, mauDai, vien) => `
        <rect x="${x}" y="${y}" width="13" height="16" rx="1.6" fill="#fdfdfd" stroke="${vien}" stroke-width="1"/>
        <rect x="${x}" y="${y}" width="13" height="4.4" rx="1.6" fill="${mauDai}"/>
        <circle cx="${x + 4}" cy="${y + 9}" r="2.1" fill="#c8ced6"/>
        <path d="M ${x + 7.4} ${y + 8} h 3.6 M ${x + 7.4} ${y + 10.6} h 2.6 M ${x + 2.4} ${y + 13.4} h 8.4" stroke="#aab2bd" stroke-width="0.9" stroke-linecap="round"/>`;
// Dấu chân thú, tâm (x, y), cỡ k.
const dauChan = (x, y, k, xoay = 0) => `<g transform="translate(${x} ${y}) rotate(${xoay}) scale(${k})">
          <ellipse cx="0" cy="1.6" rx="3.2" ry="2.6"/><circle cx="-3.6" cy="-2" r="1.3"/><circle cx="-1.2" cy="-3.7" r="1.3"/><circle cx="1.2" cy="-3.7" r="1.3"/><circle cx="3.6" cy="-2" r="1.3"/></g>`;
// Ống nghe vắt cổ: hai ống đổ xuống hai bên ngực, loa bên trái, chạc tai nghe bên phải.
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

/* ──────────────────────────────────────────────── A. đồ mổ của bác sĩ nam */
// Áo hộp, thẳng từ nách xuống gấu — đồ mổ không chiết eo.
const AO_MO = 'M -31 20 Q 0 26 31 20 L 29 -40 Q 29.5 -70 35 -88 Q 30 -97 20 -101 Q 10 -105 0 -105'
            + ' Q -10 -105 -20 -101 Q -30 -97 -35 -88 Q -29.5 -70 -29 -40 Z';
const DO_MO = {
  ao: () => AO_MO,
  suon: suonTu([[35, -88], [29.5, -70], [29, -40], [31, 20]]),
  damSuon: 0.3,
  // Cổ chữ V hở da, viền bằng một dải vải đậm; khẩu trang kéo xuống nằm vắt
  // ngang cổ — đầu vẽ sau nên cằm che mất mép trên, đúng kiểu đeo trễ.
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

/* ─────────────────────────────────────────── B. áo in dấu chân của điều dưỡng */
// Áo dáng suông hơi xoè, gấu bo tròn.
const AO_DD = 'M -32 18 Q 0 28 32 18 Q 29 -10 26 -42 Q 27 -70 35 -88 Q 30 -97 20 -101 Q 10 -105 0 -105'
            + ' Q -10 -105 -20 -101 Q -30 -97 -35 -88 Q -27 -70 -26 -42 Q -29 -10 -32 18 Z';
const DO_DD = {
  ao: () => AO_DD,
  suon: suonTu([[35, -88], [27, -70], [26, -42], [29, -10], [32, 18]]),
  damSuon: 0.28,
  // Cổ tròn, viền trắng.
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

/* ───────────────────────────────────── C. áo blouse của bác sĩ đeo kính */
// Áo blouse dài quá hông (gấu ở y +38), hơi xoè. Thân áo vẽ SAU chân nên vạt
// áo phủ lên đùi; bước đi thì đùi lùa dưới vạt.
const AO_BL = 'M -34 38 Q 0 42 34 38 Q 31 0 27 -42 Q 28 -70 35 -88 Q 30 -97 20 -101 Q 10 -105 0 -105'
            + ' Q -10 -105 -20 -101 Q -30 -97 -35 -88 Q -28 -70 -27 -42 Q -31 0 -34 38 Z';
// Bộ áo khoác dùng hai màu mà không phải nhân vật gốc nào cũng khai (`aoTrong`, `ongNghe`).
// Thiếu thì lấy màu dự phòng, không để `undefined` lọt vào SVG — trải bộ áo này lên một
// nhân vật mặc đồ mổ là chuyện thường, và hình hỏng vì thiếu một màu thì rất khó đoán.
const innerShirtColor = (m) => m.aoTrong || m.aoToi;
const stethoscopeColor = (m) => m.ongNghe || m.phuKien;
const DO_BL = {
  ao: () => AO_BL,
  suon: suonTu([[35, -88], [28, -70], [27, -42], [31, 0], [34, 38]]),
  damSuon: 0.6,
  // Áo trong màu `mau.aoTrong` lộ ra giữa hai ve; ve là hai nét bẻ có khấc.
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

/**
 * BỘ ĐỒ NGHỀ cho nhân vật tuỳ chỉnh (`characters/*.js` nhận nó ở tham số thứ hai).
 *   boDo     ba bộ trang phục dựng sẵn — trải vào định nghĩa rồi ghi đè màu / chi tiết
 *   còn lại  các mảnh vẽ dùng chung (xem chú thích ở từng hàm phía trên)
 */
// Áo khoác KHÔNG ống nghe: cùng bộ áo, bỏ ống nghe khỏi cả hai lớp (thân áo và vắt vai).
const STETHOSCOPE_MARK = '<!--stethoscope-->';
const DO_BL_PLAIN = {
  ...DO_BL,
  phuKien: (p, m) => DO_BL.phuKien(p, m).split(STETHOSCOPE_MARK)[0] + '\n      </g>',
  phuKienTren: () => '',
};

// ── ĐỒ THƯỜNG NGÀY (không phải đồ y tế): dùng lại dáng thân của đồ mổ, bỏ hết túi và thẻ tên.
// Không mang theo `mauSoSau` của đồ mổ (màu mũ): đồ thường không quyết định màu sau đầu.
const { mauSoSau: _capColor, ...PLAIN_BASE } = DO_MO;
// Áo thun: cổ tròn có bo, tay ngắn, trơn.
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
// Sơ mi: tay dài, cổ bẻ hai ve nhọn, nẹp giữa và hàng cúc.
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
// Váy liền: thân áo thun cổ tròn, có đường eo, liền với chân váy (lớp `skirt` của rig — màu
// `skirt` không khai thì theo màu áo nên ra một chiếc váy liền một màu).
// Thân áo dừng ở EO (gấu y +3) chứ không xuống hông: chân váy vẽ dưới thân áo, nên gấu áo dài
// sẽ in một khung chữ nhật lên chân váy như cái túi. Dừng ở eo thì mép ấy thành đường eo.
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
// Hoodie: tay dài, mũ trùm nằm sau cổ, hai dây rút, túi kangaroo, bo gấu.
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
// Vest (áo khoác âu): dài quá hông một chút, ve áo, sơ mi và cà vạt, hai cúc, túi ngực.
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

/** Trả về bảng nhân vật mới, dựng từ một nhân vật gốc (mặc định: bác sĩ thú y). */
function dungDau(goc) {
  const m0 = goc.mau;

  // ─────────────────────────────────────────────── A. Bác sĩ nam, tóc ngắn
  // Sọ vuông hơn, cằm rộng, mắt nhỏ lại (rx 9.5 so với 11.5 của bản gốc),
  // không mi giả. Đầu nhỏ hơn một nấc (1.38 so với 1.45) cho bớt trẻ con.
  const surgeon = {
    ...goc, ...DO_MO,
    ten: 'Bác sĩ nam — đồ mổ',
    // Cao và vững hơn ba nhân vật nữ: đầu nhỏ nhất, chân dài, tay và chân dày hơn.
    coDau: 1.3, dauLech: 10, coThan: 0.97, coChan: 0.76,
    daiCanhTay: 1.05, daiCangTay: 0.8, dayTay: 0.85, coBanTay: 1.05,
    daiDui: 1.25, daiOng: 1.2, dayChan: 1.05, cachChan: 15, coBanChan: 1.05,
    may: { dai: 11.5, day: 4.4, cong: 1.2, thon: 0.3, xech: 2 },
    // Đứng buông tay, hơi dạng — khác dáng đan tay trước bụng của bác sĩ thú y.
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
    // Mũ mổ nằm ở slot `mu`, KHÔNG nằm trong `toc()`: rig vẽ mảng tóc gáy sau `toc()`
    // nên mũ đặt trong đó bị tóc gáy quét đè lên khi quay nghiêng.
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

  // ──────────────────────────────────── B. Điều dưỡng nữ, tóc đuôi ngựa cao
  // Đuôi ngựa nằm trong `tocTruoc` — xem ghi chú TOCSAU ở đầu file: đặt vào
  // `tocSau` thì nó chỉ hiện lúc quay người, còn nhìn thẳng là mất sạch.
  // Vẽ đuôi TRƯỚC khối tóc chính để khối tóc phủ lên chân đuôi, không lộ mối.
  // Đuôi cố ý dừng ở x ≥ −78: xa hơn nữa là đè lên cánh tay trái, vì tay trái
  // vẽ TRƯỚC nhóm `tren` (nằm trong `sau`) nên tóc sẽ phủ lên tay.
  const nurse = {
    ...goc, ...DO_DD,
    ten: 'Điều dưỡng — áo dấu chân',
    // Trẻ và tròn trịa nhất: đầu to nhất trong bốn người, tay chân mềm, mày cong.
    coDau: 1.42, dauLech: 9, coThan: 0.92, coChan: 0.68,
    daiCanhTay: 1, daiCangTay: 0.7, dayTay: 0.75, coBanTay: 1,
    daiDui: 1.3, daiOng: 1.2, dayChan: 1, cachChan: 14, coBanChan: 1,
    may: { dai: 10, day: 2.8, cong: 3.2, thon: 0.5, xech: -1 },
    // Hai tay buông hơi mở, cười tươi — dáng sẵn sàng giúp.
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

  // ──────────────────────────────── C. Bác sĩ đeo kính, tóc rẽ ngôi lệch
  // Kính vẽ trong slot `net` — vì `net` là nhóm ĐI THEO MẶT khi xoay
  // (dịch theo netLech, co ngang theo phối cảnh — xem apDung trong rig-svg.js). Vẽ kính ở
  // chỗ khác — ví dụ trong `toc` — thì lúc quay mặt kính sẽ đứng yên tại chỗ.
  //
  // Búi tóc thấp đặt ở (−42, 30), KHÔNG phải (−4, 46). Bản đầu để giữa và thấp:
  // đứng thẳng thì `tocSau` trong suốt nên không thấy gì, nhưng vừa quay người
  // là búi hiện ra ngay dưới cằm — trông hệt bộ râu quai nón. Mọi mảng trong
  // `tocSau` phải nằm về phía GÁY (x âm, xa trục), vì nó chỉ tồn tại ở góc xoay.
  const doctor = {
    ...goc, ...DO_BL,
    ten: 'Bác sĩ đeo kính — áo blouse',
    // Thanh và nghiêm hơn: chân dài, mày ngang hơi xếch, tay đan cao trước bụng.
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

/** Đăng ký cả ba vào RigSVG.NHAN_VAT; trả về danh sách khoá. */
function dangKyDau(RigSVG, gocTen = 'vet') {
  const goc = RigSVG.NHAN_VAT[gocTen];
  if (!goc) throw new Error(`[characters] không có nhân vật gốc "${gocTen}"`);
  const ds = dungDau(goc);
  for (const [k, v] of Object.entries(ds)) RigSVG.dangKy(k, v);
  return Object.keys(ds);
}

return { KIT, dungDau, dangKyDau };
})();

/* ───── runtime/props.js ───── */
__m['runtime/props.js'] = (function () {
// props.js — ĐẠO CỤ CẢNH vẽ sẵn: ghế, ghế đẩu, bàn, quầy.
//
// Đạo cụ vẽ trong CÙNG KHUNG với nhân vật người (400 × 470, sàn ở y = 458, giữa khung x = 200).
// Nhờ vậy muốn ghế nằm đúng dưới người ngồi thì chỉ cần cho host của ghế CÙNG `left`, `bottom`
// và `height` với host của nhân vật, đặt nó TRƯỚC nhân vật trong HTML (để nằm phía sau). Bàn và
// quầy cũng dùng cùng `bottom` + `height`, rồi dời `left` sang chỗ cần.

const PROP_FRAME = { w: 400, h: 470, floor: 458, centre: 200 };
const SEAT_DEFAULT = 372;                      // cao độ mặt ghế khớp nhân vật có sẵn khi không đưa `for`

const shade = (hex, amount) => {               // tối đi (amount < 0) hoặc sáng lên một màu #rrggbb
  const n = parseInt(hex.slice(1), 16), mix = (v) => Math.max(0, Math.min(255, Math.round(v + (amount < 0 ? v : 255 - v) * amount)));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => mix(v).toString(16).padStart(2, '0')).join('');
};

// Mỗi đạo cụ: (o) => chuỗi SVG. `o.seat` là cao độ mặt ghế (y trong khung), `o.w` bề rộng.
const DRAW = {
  // Ghế đẩu: mặt tròn dẹt, bốn chân hơi choãi, một thanh giằng.
  stool: ({ seat, w = 84, color, dark, line }) => {
    const F = PROP_FRAME.floor, x0 = 200 - w / 2, x1 = 200 + w / 2;
    return `
    <path d="M ${x0 + 12} ${seat + 8} L ${x0 + 2} ${F} M ${x1 - 12} ${seat + 8} L ${x1 - 2} ${F}" stroke="${dark}" stroke-width="7" stroke-linecap="round"/>
    <path d="M ${x0 + 9} ${seat + (F - seat) * 0.6} H ${x1 - 9}" stroke="${dark}" stroke-width="4.500" stroke-linecap="round"/>
    <rect x="${x0}" y="${seat}" width="${w}" height="13" rx="6.500" fill="${color}" stroke="${line}" stroke-width="1.400"/>`;
  },
  // Ghế tựa nhìn từ trước: lưng ghế nhô lên sau lưng người ngồi.
  chair: ({ seat, w = 108, back = 92, color, dark, line }) => {
    const F = PROP_FRAME.floor, x0 = 200 - w / 2, x1 = 200 + w / 2;
    return `
    <rect x="${x0 + 4}" y="${seat - back}" width="${w - 8}" height="${back + 6}" rx="12" fill="${dark}" stroke="${line}" stroke-width="1.400"/>
    <path d="M ${x0 + 9} ${seat + 10} V ${F} M ${x1 - 9} ${seat + 10} V ${F}" stroke="${dark}" stroke-width="8" stroke-linecap="round"/>
    <rect x="${x0}" y="${seat}" width="${w}" height="15" rx="6" fill="${color}" stroke="${line}" stroke-width="1.400"/>`;
  },
  // Bàn: mặt bàn mỏng, hai chân.
  table: ({ w = 230, height = 150, color, dark, line }) => {
    const F = PROP_FRAME.floor, top = F - height, x0 = 200 - w / 2, x1 = 200 + w / 2;
    return `
    <path d="M ${x0 + 18} ${top + 10} V ${F} M ${x1 - 18} ${top + 10} V ${F}" stroke="${dark}" stroke-width="10" stroke-linecap="round"/>
    <rect x="${x0}" y="${top}" width="${w}" height="14" rx="5" fill="${color}" stroke="${line}" stroke-width="1.400"/>`;
  },
  // Quầy: khối đặc tới sàn, mặt quầy nhô ra một chút, hai đường chỉ ván.
  counter: ({ w = 300, height = 150, color, dark, line }) => {
    const F = PROP_FRAME.floor, top = F - height, x0 = 200 - w / 2;
    return `
    <rect x="${x0 + 6}" y="${top + 8}" width="${w - 12}" height="${height - 8}" fill="${dark}" stroke="${line}" stroke-width="1.400"/>
    <path d="M ${x0 + 6 + (w - 12) / 3} ${top + 16} V ${F - 6} M ${x0 + 6 + (w - 12) * 2 / 3} ${top + 16} V ${F - 6}" stroke="${line}" stroke-width="1.200" opacity=".45"/>
    <rect x="${x0}" y="${top}" width="${w}" height="13" rx="4" fill="${color}" stroke="${line}" stroke-width="1.400"/>`;
  },
};

const PROP_KINDS = Object.keys(DRAW);

/**
 * Dựng một đạo cụ vào `host`.
 *   kind     'chair' | 'stool' | 'table' | 'counter'
 *   options  { for, color, width, height, back }
 *     for      rig NGƯỜI sẽ ngồi lên (ghế, ghế đẩu) — mặt ghế tự khớp chiều cao ngồi của nhân vật ấy
 *     color    màu chính (#rrggbb); màu tối và màu nét tự suy
 *     width    bề rộng, đơn vị khung (ghế 108, ghế đẩu 84, bàn 230, quầy 300)
 *     height   chiều cao bàn / quầy tính từ sàn, đơn vị khung (150)
 *     back     chiều cao lưng ghế tính từ mặt ghế (92)
 * Trả về { svg, kind, seatY }. Host nên có cùng `bottom` và `height` với host của nhân vật.
 */
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

/* ───── runtime/bodies.js ───── */
__m['runtime/bodies.js'] = (function () {
// bodies.js — DÁNG NGƯỜI dựng sẵn: bộ số tỉ lệ (khoá công khai) để trải vào định nghĩa.
//
//     define: (base, kit) => ({ ...base, ...kit.bodies.child, … })
//
// Dáng chỉ đổi TỈ LỆ giữa đầu, thân, tay, chân. Chiều cao trên màn hình do host quyết định:
// nhân vật luôn cao gần hết host của nó, nên một đứa trẻ đứng cạnh người lớn cần host THẤP hơn
// — `hostScale` dưới đây là tỉ lệ nên dùng so với host của người lớn (khoá này rig bỏ qua).

/** Trẻ nhỏ (5–8 tuổi): đầu rất to, thân và chân ngắn, tay chân mũm mĩm. */
const child = {
  headSize: 1.62, neckDrop: 15, torsoScale: 0.8, legScale: 0.5,
  upperArmLength: 0.8, forearmLength: 0.62, armThickness: 0.9, handSize: 0.92,
  thighLength: 1.15, shinLength: 1.1, legThickness: 1.1, legGap: 12, footSize: 0.95,
  hostScale: 0.75,
};

/** Thiếu niên: giữa trẻ nhỏ và người lớn, tay chân mảnh. */
const teen = {
  headSize: 1.46, neckDrop: 10, torsoScale: 0.88, legScale: 0.64,
  upperArmLength: 0.98, forearmLength: 0.7, armThickness: 0.7, handSize: 0.95,
  thighLength: 1.3, shinLength: 1.22, legThickness: 0.92, legGap: 13, footSize: 1,
  hostScale: 0.84,
};

/** Người lớn chuẩn của bộ nhân vật có sẵn (bác sĩ thú y). */
const adult = {
  headSize: 1.37, neckDrop: 9, torsoScale: 0.94, legScale: 0.68,
  upperArmLength: 1.09, forearmLength: 0.7, armThickness: 0.68, handSize: 0.95,
  thighLength: 1.4, shinLength: 1.25, legThickness: 1, legGap: 14, footSize: 1,
  hostScale: 1,
};

/** Người cao, ít chibi hơn: đầu nhỏ lại, chân dài. */
const tall = {
  headSize: 1.2, neckDrop: 5, torsoScale: 0.96, legScale: 0.86,
  upperArmLength: 1.08, forearmLength: 0.84, armThickness: 0.72, handSize: 0.95,
  thighLength: 1.3, shinLength: 1.25, legThickness: 0.95, legGap: 14, footSize: 1,
  hostScale: 1.08,
};

/** Người to con: thân lớn và RỘNG NGANG, cổ rụt, tay chân to. */
const stocky = {
  headSize: 1.34, neckDrop: 15, torsoScale: 1.08, torsoWidth: 1.28, legScale: 0.64,
  upperArmLength: 1.0, forearmLength: 0.7, armThickness: 1.05, handSize: 1.08,
  thighLength: 1.3, shinLength: 1.2, legThickness: 1.4, legGap: 17, footSize: 1.1,
  hostScale: 1,
};

return { child, teen, adult, tall, stocky };
})();

/* ───── runtime/hair.js ───── */
__m['runtime/hair.js'] = (function () {
// hair.js — KIỂU TÓC dựng sẵn cho nhân vật tuỳ chỉnh.
//
// Mỗi kiểu là một HÀM TẠO: gọi nó (kèm tuỳ chọn) để lấy hàm vẽ đặt thẳng vào slot `hair`:
//
//     hair: kit.hair.bob(),
//     hair: kit.hair.ponytail({ side: 'right', tie: '#d6453d' }),
//
// Hình vẽ nằm trong HỆ TOẠ ĐỘ TÂM ĐẦU (sọ: x −50…50, đỉnh y ≈ −56, cằm y ≈ +56), bọc sẵn trong
// nhóm `hair-front` mà rig yêu cầu; phần búi / đuôi nằm trong `hair-bun` để rig đẩy ra sau khi
// nhân vật quay. Màu lấy từ `colors.hair`, vệt sáng từ `colors.hairHighlight` (không khai thì
// không vẽ vệt sáng), dây buộc từ `colors.accent`.

const shine = (c, d, width = 3, opacity = 0.7) =>
  (c.hairHighlight ? `<path d="${d}" stroke="${c.hairHighlight}" stroke-width="${width}" fill="none" stroke-linecap="round" opacity="${opacity}"/>` : '');
const group = (p, c, body, mirror = false) => `
              <g id="${p}-hair-front" fill="${c.hair}"${mirror ? ' transform="scale(-1 1)"' : ''}>${body}
              </g>`;
const tieColor = (c, tie) => tie || c.accent || c.hairHighlight || c.hair;

/** Cắt ngắn gọn, mái vuốt ngang — kiểu nam cơ bản. */
const crop = () => (p, c) => group(p, c, `
                <path d="M -51 2 Q -55 -40 -20 -56 Q 16 -68 42 -46 Q 54 -34 51 2 Q 45 -24 22 -33 Q 2 -39 -16 -31 Q -36 -22 -51 2 Z"/>
                <path d="M -50 0 Q -52 12 -47 22 Q -42 10 -43 -6 Z"/>
                <path d="M 50 0 Q 52 12 47 22 Q 42 10 43 -6 Z"/>
                ${shine(c, 'M -30 -46 Q -6 -56 16 -50')}${shine(c, 'M 24 -42 Q 38 -36 45 -26', 2.2, 0.6)}`);

/** Rẽ ngôi lệch, mái chải sang một bên. `side`: ngôi nằm bên 'left' | 'right' của màn hình. */
const sidePart = ({ side = 'left' } = {}) => (p, c) => group(p, c, `
                <path d="M -50 18 Q -58 -32 -24 -58 Q 4 -72 30 -56 Q 58 -34 50 18 Q 48 -10 43 -22 Q 30 -40 4 -36 Q -22 -30 -40 -14 Q -47 -2 -50 18 Z"/>
                ${shine(c, 'M -22 -52 Q 4 -60 24 -50')}${shine(c, 'M -44 -8 Q -40 -26 -26 -38', 2.4, 0.55)}`, side === 'right');

/** Tóc bob ngang cằm, mái thưa. */
const bob = () => (p, c) => group(p, c, `
                <path d="M -53 31 Q -64 -34 -28 -61 Q 0 -75 28 -61 Q 64 -34 53 31 Q 45 36 40 27 Q 46 -8 31 -25 Q 12 -39 -4 -33 Q -29 -30 -40 -14 Q -45 6 -40 27 Q -45 36 -53 31 Z"/>
                ${shine(c, 'M -28 -52 Q -4 -63 20 -54', 3.2, 0.8)}${shine(c, 'M -48 4 Q -50 -18 -38 -36', 2.4, 0.6)}`);

/** Tóc dài thẳng qua vai. `length`: 0 (ngang vai) … 1 (giữa ngực). */
const long = ({ length = 0.5 } = {}) => (p, c) => {
  const end = 62 + Math.max(0, Math.min(1, length)) * 44;
  return group(p, c, `
                <path d="M -55 ${end} Q -72 -30 -30 -62 Q 0 -77 30 -62 Q 72 -30 55 ${end} Q 45 ${end + 5} 37 ${end - 6} Q 47 20 43 -6 Q 36 -26 14 -34 Q -6 -38 -20 -30 Q -40 -22 -43 -4 Q -47 22 -37 ${end - 6} Q -45 ${end + 5} -55 ${end} Z"/>
                ${shine(c, 'M -28 -53 Q -2 -65 22 -55', 3.2, 0.8)}${shine(c, 'M -52 30 Q -58 -6 -44 -34', 2.4, 0.55)}${shine(c, 'M 52 34 Q 56 6 48 -18', 2.2, 0.45)}`);
};

/** Đuôi ngựa buộc lệch một bên. `side`: bên màn hình có đuôi tóc; `tie`: màu dây buộc. */
const ponytail = ({ side = 'left', tie = null } = {}) => (p, c) => group(p, c, `
                <g id="${p}-hair-bun">
                  <path d="M -34 -40 Q -68 -26 -76 6 Q -82 40 -64 58 Q -52 42 -58 16 Q -60 -8 -30 -20 Z"/>
                  ${shine(c, 'M -46 -26 Q -60 -18 -63 0', 2.6, 0.5)}
                </g>
                <path d="M -50 22 Q -60 -30 -26 -58 Q 0 -74 26 -58 Q 60 -30 50 22 Q 47 -6 41 -18 Q 22 -38 2 -32 Q -20 -38 -41 -18 Q -47 -6 -50 22 Z"/>
                ${shine(c, 'M -30 -50 Q -6 -62 18 -52', 3.2, 0.8)}${shine(c, 'M -46 -14 Q -44 -32 -32 -44', 2.4, 0.6)}
                <circle cx="-40" cy="-32" r="5" fill="${tieColor(c, tie)}"/>`, side === 'right');

/** Búi cao trên đỉnh đầu. `size`: 0.7 … 1.4. */
const bun = ({ size = 1 } = {}) => (p, c) => group(p, c, `
                <g id="${p}-hair-bun">
                  <ellipse cx="2" cy="${-58 - 18 * size}" rx="${26 * size}" ry="${19 * size}"/>
                  ${shine(c, `M ${-14 * size} ${-58 - 30 * size} Q -2 ${-58 - 38 * size} ${14 * size} ${-58 - 32 * size}`, 3.4, 0.9)}
                </g>
                <path d="M -50 34 Q -66 -28 -32 -68 Q 0 -84 32 -68 Q 66 -28 50 34 Q 50 22 47 8 Q 48 -34 0 -42 Q -48 -34 -47 8 Q -50 22 -50 34 Z"/>
                ${shine(c, 'M -42 -44 Q -28 -60 -8 -62', 3.6, 0.9)}${shine(c, 'M 16 -62 Q 34 -56 42 -44', 2.8, 0.7)}`);

/** Hai bím hai bên (trẻ em). `tie`: màu dây buộc. */
const pigtails = ({ tie = null } = {}) => (p, c) => group(p, c, `
                <path d="M -50 -8 Q -74 -4 -72 26 Q -70 46 -58 52 Q -50 34 -52 14 Z"/>
                <path d="M 50 -8 Q 74 -4 72 26 Q 70 46 58 52 Q 50 34 52 14 Z"/>
                <path d="M -50 20 Q -60 -30 -26 -58 Q 0 -74 26 -58 Q 60 -30 50 20 Q 47 -8 40 -20 Q 22 -34 0 -44 Q -22 -34 -40 -20 Q -47 -8 -50 20 Z"/>
                ${shine(c, 'M -30 -50 Q -14 -60 -2 -60', 3, 0.8)}${shine(c, 'M 8 -60 Q 24 -56 34 -46', 2.6, 0.6)}
                <circle cx="-52" cy="-4" r="4.500" fill="${tieColor(c, tie)}"/><circle cx="52" cy="-4" r="4.500" fill="${tieColor(c, tie)}"/>`);

/** Tóc xoăn bồng. `volume`: 0.7 … 1.4. */
const curly = ({ volume = 1 } = {}) => (p, c) => {
  volume = Math.max(0.7, Math.min(1.4, volume));
  const r = 15 * volume, curls = [];
  // Vệt sáng vẽ cho độ bồng 1; bồng ít hay nhiều hơn thì co giãn theo vòng lọn quanh tâm đầu,
  // không thì tóc nhỏ lại mà vệt sáng đứng nguyên, lơ lửng phía trên.
  const reach = (46 + r) / 61;
  // Một vòng lọn tròn ôm từ thái dương bên này qua đỉnh đầu sang bên kia…
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * (1.08 - i * 0.145);
    curls.push(`<circle cx="${(52 * Math.cos(a)).toFixed(1)}" cy="${(-12 - 46 * Math.sin(a)).toFixed(1)}" r="${(r + (i % 2) * 1.5).toFixed(1)}"/>`);
  }
  // …và một hàng lọn nhỏ làm mái.
  for (let i = 0; i < 5; i++) curls.push(`<circle cx="${-32 + i * 16}" cy="${-34 - (i % 2) * 3}" r="${(10 * volume).toFixed(1)}"/>`);
  return group(p, c, `
                <path d="M -50 -4 Q -56 -54 0 -62 Q 56 -54 50 -4 Q 32 -32 0 -32 Q -32 -32 -50 -4 Z"/>
                ${curls.join('')}
                <g transform="translate(0 -12) scale(${reach.toFixed(3)}) translate(0 12)">${shine(c, 'M -30 -62 Q -22 -70 -12 -66', 2.6, 0.6)}${shine(c, 'M 6 -68 Q 16 -74 26 -66', 2.6, 0.6)}${shine(c, 'M -52 -28 Q -50 -38 -42 -42', 2.4, 0.5)}</g>`);
};

/** Tóc dựng chỉa (thiếu niên, trẻ em). */
const spiky = () => (p, c) => group(p, c, `
                <path d="M -50 0 Q -55 -28 -45 -44 L -43 -62 L -30 -54 L -22 -73 L -9 -59 L 2 -78 L 12 -59 L 25 -71 L 31 -54 L 44 -61 L 45 -43 Q 55 -28 50 0 Q 45 -22 28 -30 Q 8 -36 -12 -30 Q -34 -24 -50 0 Z"/>
                ${shine(c, 'M -20 -62 L -14 -50', 2.6, 0.6)}${shine(c, 'M 4 -66 L 8 -52', 2.6, 0.6)}${shine(c, 'M 26 -60 L 28 -48', 2.4, 0.5)}`);

/** Hói đỉnh đầu, còn hai chỏm tóc trên tai. Dùng kèm `backHair: 'low'`. */
const tufts = () => (p, c) => group(p, c, `
                <path d="M -50 -22 Q -60 -12 -58 6 Q -57 18 -50 22 Q -46 6 -47 -8 Q -46 -18 -50 -22 Z"/>
                <path d="M 50 -22 Q 60 -12 58 6 Q 57 18 50 22 Q 46 6 47 -8 Q 46 -18 50 -22 Z"/>`);

/** Trọc hẳn. Dùng kèm `backHair: 'none'`. */
const bald = () => (p, c) => group(p, c, '');

return { crop, sidePart, bob, long, ponytail, bun, pigtails, curly, spiky, tufts, bald };
})();

/* ───── runtime/parts.js ───── */
__m['runtime/parts.js'] = (function () {
// parts.js — vài BỘ PHẬN vẽ sẵn cho nhân vật tuỳ chỉnh: kính, râu, ria, nếp nhăn, yếm tạp dề,
// và đồ vật cầm tay (cốc, bìa kẹp hồ sơ, điện thoại).
//
// Mỗi hàm trả về một chuỗi SVG trong HỆ TOẠ ĐỘ TÂM ĐẦU, để đặt vào slot `faceExtras`
// (kính) hoặc `beard` (râu, ria). `c` là bảng màu của nhân vật; màu mặc định lấy từ đó,
// truyền `color` để chỉ định riêng.

/** Kính gọng tròn. `x`, `y`: tâm tròng kính (mặc định khớp mắt chuẩn), `r`: bán kính tròng. */
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

/**
 * Râu quai nón ngắn ôm hàm, có khoét quanh miệng. `chin`: cao độ đáy cằm của khuôn mặt
 * (mặc định 54 — khớp cằm chuẩn; mặt ngắn hơn thì giảm), `mouthY`: cao độ miệng.
 */
function shortBeard(c, { color = null, chin = 54, mouthY = 30, width = 43 } = {}) {
  const fill = color || c.hair;
  return `
            <path fill="${fill}" d="M ${-width} 10 Q ${-width - 2} ${chin - 12} ${-width * 0.55} ${chin - 1} Q 0 ${chin + 6} ${width * 0.55} ${chin - 1}
              Q ${width + 2} ${chin - 12} ${width} 10 Q ${width - 5} ${mouthY - 8} ${width * 0.42} ${mouthY - 9}
              Q 0 ${mouthY - 13} ${-width * 0.42} ${mouthY - 9} Q ${-width + 5} ${mouthY - 8} ${-width} 10 Z"/>
            <path fill="${c.skin}" d="M -13 ${mouthY - 5} Q 0 ${mouthY - 9} 13 ${mouthY - 5} Q 14 ${mouthY + 7} 0 ${mouthY + 9} Q -14 ${mouthY + 7} -13 ${mouthY - 5} Z"/>`;
}

/** Ria mép. `mouthY`: cao độ miệng của nhân vật. */
function moustache(c, { color = null, mouthY = 30, width = 17 } = {}) {
  const fill = color || c.hair;
  return `
            <path fill="${fill}" d="M 0 ${mouthY - 9} Q ${-width * 0.5} ${mouthY - 13} ${-width} ${mouthY - 5} Q ${-width * 0.55} ${mouthY - 3.5} 0 ${mouthY - 5.5}
              Q ${width * 0.55} ${mouthY - 3.5} ${width} ${mouthY - 5} Q ${width * 0.5} ${mouthY - 13} 0 ${mouthY - 9} Z"/>`;
}

// Màu nét cho các bộ phận dưới đây. Base `default` để trống `lineStroke` (rig tự suy khi vẽ áo),
// nên phải có đường lui — nếu không sẽ ra `stroke="null"`.
const lineOf = (c) => c.lineStroke || c.topShadow || '#3a3f4a';

/** Nếp nhăn tuổi tác: hai vết chân chim ở đuôi mắt, hai rãnh má, hai nếp trán. Đặt vào `faceExtras`. */
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

/**
 * YẾM tạp dề: tấm che ngực và hai dây vòng qua cổ, trong hệ toạ độ THÂN. Đặt vào `accessories`
 * (bên trong nhóm `<g id="${p}-accessories">`), ghép với `skirt: { kind: 'apron' }` cho phần dưới hông.
 * `top`: cao độ mép trên của yếm (y, âm là lên; −70 ≈ ngang ngực) · `width`: NỬA bề ngang mép trên (16;
 * người to ngang thì 22–26) · `waist`: cao độ mép dưới (y, 14 ≈ ngay trên gấu áo). Dây đeo tự nối từ hai
 * góc trên lên cổ, yếm rộng hay hẹp cũng vậy.
 */
function apronBib(c, { color = null, top = -70, width = 16, waist = 14 } = {}) {
  const fill = color || c.skirt || c.accent || c.topShadow, line = lineOf(c);
  return `
        <path d="M ${-width + 2} ${top} Q ${-(width + 11) / 2} ${(top - 103) / 2 + 2} -9 -103 M ${width - 2} ${top} Q ${(width + 11) / 2} ${(top - 103) / 2 + 2} 9 -103" stroke="${fill}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M ${-width} ${top} H ${width} L ${width + 9} ${waist - 18} V ${waist} H ${-width - 9} V ${waist - 18} Z" fill="${fill}" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>
        <path d="M -9 ${top + 22} h 18 v 12 q 0 3 -3 3 h -12 q -3 0 -3 -3 z" fill="none" stroke="${line}" stroke-width="1.100" stroke-linejoin="round" opacity=".7"/>`;
}

/* ── ĐỒ VẬT CẦM TAY — hệ toạ độ CỔ TAY: lòng bàn tay quanh (0, 10), ngón chỉ xuống +y.
      Đặt vào `heldItemL` / `heldItemR`; nên cho bàn tay ấy nắm lại (`handL: 'fist'` trong restPose). */

/** Cốc giấy có nắp (cà phê mang đi), bàn tay nắm ngang thân cốc. */
function cup(c, { color = '#f4efe6', lid = '#4a3b33', sleeve = '#b9834f', size = 1.3 } = {}) {
  const line = lineOf(c);
  return `
        <g transform="translate(0 12) rotate(90) scale(${size})">
          <path d="M -8.500 -17 L -6.500 13 Q 0 15 6.500 13 L 8.500 -17 Z" fill="${color}" stroke="${line}" stroke-width="1.100" stroke-linejoin="round"/>
          <path d="M -8 -7 L -7.200 5 Q 0 7 7.200 5 L 8 -7 Q 0 -5 -8 -7 Z" fill="${sleeve}"/>
          <path d="M -10 -21 h 20 v 4 h -20 z" fill="${lid}" stroke="${line}" stroke-width="1" stroke-linejoin="round"/>
        </g>`;
}

/** Bìa kẹp hồ sơ, cầm ở mép dưới. */
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

/** Điện thoại, cầm dọc trong lòng bàn tay. */
function phone(c, { color = '#22262e', screen = '#8fd3ff' } = {}) {
  return `
        <g transform="translate(0 10) rotate(90)">
          <rect x="-7.500" y="-19" width="15" height="28" rx="3" fill="${color}"/>
          <rect x="-5.800" y="-16.500" width="11.600" height="21" rx="1.500" fill="${screen}"/>
        </g>`;
}

return { roundGlasses, shortBeard, moustache, wrinkles, apronBib, cup, clipboard, phone };
})();

/* ───── runtime/schema.js ───── */
__m['runtime/schema.js'] = (function () {
// schema.js — TỪ ĐIỂN giữa lược đồ CÔNG KHAI (tiếng Anh) và lược đồ NỘI BỘ của hai bộ rig.
//
// Hai bộ rig (`rig-svg.js`, `rig-thu.js`) được viết với khoá tiếng Việt và giữ nguyên như
// thế bên trong. Mọi thứ người dùng thư viện chạm tới — định nghĩa nhân vật, bảng màu, bộ
// số (config), tư thế nghỉ, trạng thái — đi qua tệp này để mang tên tiếng Anh. `index.js`
// là nơi duy nhất gọi các hàm dịch ở đây; mã nội bộ không biết gì về lược đồ công khai.
//
// Quy ước của mỗi bảng: KHOÁ là tên công khai, GIÁ TRỊ là tên nội bộ.

/** Khoá cấp một của một định nghĩa nhân vật người. */
const DEFINITION_KEYS = {
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
const FACE_SHAPE_KEYS = {
  halfWidth: 'rong', crownHeight: 'cao', chinLength: 'cam', widestY: 'yRong',
  foreheadSquareness: 'tranVuong', jawSquareness: 'hamVuong', foreheadWidth: 'rongTran', chinWidth: 'rongCam',
};
const BROW_KEYS = { halfLength: 'dai', thickness: 'day', arch: 'cong', taper: 'thon', slant: 'xech' };

/** Bảng màu — người và thú dùng chung một từ điển (khoá lạ đi qua nguyên vẹn). */
const COLOR_KEYS = {
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
const PERSON_STATE_KEYS = {
  x: 'x', y: 'y', opacity: 'mo', scale: 'co', facing: 'huong',
  lean: 'than', breath: 'tho', shoulders: 'vai',
  headTilt: 'dau', headX: 'dauX', headY: 'dauY',
  upperArmL: 'batL', upperArmR: 'batR', forearmL: 'cangL', forearmR: 'cangR', armSwingL: 'vungL', armSwingR: 'vungR',
  thighL: 'duiL', thighR: 'duiR', shinL: 'ongL', shinR: 'ongR', kneeLiftL: 'nhacL', kneeLiftR: 'nhacR', seat: 'seat',
  eyesClosed: 'matY', lookX: 'nhinX', lookY: 'nhinY', browL: 'mayL', browR: 'mayR',
  mouthOpen: 'mieng', pucker: 'chum', smile: 'cuoi', handL: 'tayL', handR: 'tayR', itemL: 'itemL', itemR: 'itemR',
};

/** Trạng thái của rig THÚ (bốn chân dùng tên nội bộ tn/tx/sn/sx — hiếm khi cần chạm tới). */
const PET_STATE_KEYS = {
  x: 'x', y: 'y', opacity: 'mo', scale: 'co', facing: 'huong',
  sit: 'ngoi', breath: 'tho', chestX: 'truocX', chestY: 'truocY', hipX: 'sauX', hipY: 'sauY',
  arch: 'cong', puff: 'xu', headTilt: 'dau', headX: 'dauX', headY: 'dauY', earL: 'taiL', earR: 'taiR',
  eyesClosed: 'matY', lookX: 'nhinX', lookY: 'nhinY', pupil: 'dongTu',
  mouthOpen: 'mieng', tongue: 'luoi', smile: 'cuoi', tail: 'duoi', tailCurl: 'duoiCong',
};

/** Giá trị của hai khoá bàn tay. */
const HAND_SHAPES = { relaxed: 'mo', fist: 'nam', thumb: 'cai', point: 'chi' };

/**
 * Bộ số (config) của nhân vật người: nhóm công khai → [nhóm nội bộ, bảng dịch khoá con].
 * `restPose` và `colors` có bảng dịch riêng; `null` ở đây nghĩa là "xem hàm dịch".
 */
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

/** Hình dáng của thú — tên công khai đã là tên nội bộ (mã mới), liệt kê để kiểm config. */
const PET_SHAPE_KEYS = ['headSize', 'bodyLength', 'bodyThickness', 'legLength', 'tailLength', 'tailCurl', 'earSize'];

/**
 * ID phần tử BẮT BUỘC trong hình vẽ của người viết nhân vật: hậu tố công khai → hậu tố nội bộ.
 * Người viết ghi `id="${p}-hair-front"`; thư viện đổi thành id mà rig tìm.
 */
const REQUIRED_IDS = [
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
const DRAWING_SLOTS = ['toc', 'mu', 'mat', 'mui', 'net', 'beard', 'coAo', 'phuKien', 'phuKienTren', 'giay', 'heldItemL', 'heldItemR'];

/** Định nghĩa nhân vật: công khai → nội bộ. Khoá lạ (kể cả khoá nội bộ) đi qua nguyên vẹn. */
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

/** Định nghĩa nhân vật: nội bộ → công khai. Dùng để đưa nhân vật GỐC cho người viết nhân vật mới. */
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

/** Bộ số: công khai → nội bộ. Không kiểm tra gì — `validateConfig` làm việc đó trước. */
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

/** Bộ số: nội bộ → công khai (studio dùng khi lưu). */
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

/* ───── characters/receptionist.js ───── */
__m['characters/receptionist.js'] = (function () {
// Receptionist — the worked EXAMPLE of a custom character: the nurse's head with new hair,
// and a long-sleeved blazer.
//
// The three moves every custom character makes:
//   1. pick `base` — the built-in closest to what you need (here: the face, eyes and body
//      proportions of `nurse`);
//   2. spread a ready-made OUTFIT from `kit.outfits`, then override its details;
//   3. override hair, colours and rest pose.
const __default = {
  id: 'receptionist',
  base: 'nurse',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.coat,                       // long-sleeved top with lapels, used as a blazer
    name: 'Receptionist',
    // Hands clasped at the belly: a welcoming pose.
    restPose: { upperArmL: 17, upperArmR: 17, forearmL: -92, forearmR: -92, smile: 1, mouthOpen: 0.4, browL: 0.2, browR: 0.2 },
    colors: {
      ...base.colors,
      hair: '#2a2024', hairHighlight: '#55464c',
      top: '#2f4b7c', topShadow: '#223a63', lineStroke: '#16233d', innerShirt: '#f6f7f9',
      trousers: '#2f4b7c', shoes: '#22262e', accent: '#d6453d',
    },
    // Chin-length bob. Every hair shape visible from the front lives in the `hair-front` group.
    hair: (p, c) => `
              <g id="${p}-hair-front" fill="${c.hair}">
                <path d="M -53 31 Q -64 -34 -28 -61 Q 0 -75 28 -61 Q 64 -34 53 31 Q 45 36 40 27 Q 46 -8 31 -25 Q 12 -39 -4 -33 Q -29 -30 -40 -14 Q -45 6 -40 27 Q -45 36 -53 31 Z"/>
                <path d="M -28 -52 Q -4 -63 20 -54" stroke="${c.hairHighlight}" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".8"/>
                <path d="M -48 4 Q -50 -18 -38 -36" stroke="${c.hairHighlight}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".6"/>
              </g>`,
    // The coat's lapels, plus a bow tie.
    collar: (p, c) => `${kit.outfits.coat.collar(p, c)}
        <path d="M 0 -96.500 l -9.500 -4.500 v 9 z M 0 -96.500 l 9.500 -4.500 v 9 z" fill="${c.accent}" stroke="${c.lineStroke}" stroke-width="0.900" stroke-linejoin="round"/>
        <circle cx="0" cy="-96.500" r="2.300" fill="${c.accent}" stroke="${c.lineStroke}" stroke-width="0.900"/>`,
    // Blazer details: front seam, two gold buttons, name tag, pocket square. NO stethoscope.
    // Must be wrapped in <g id="${p}-accessories"> — the rig scales this group with the torso.
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

/* ───── characters/barista.js ───── */
__m['characters/barista.js'] = (function () {
// Barista — everyday clothes with an APRON and a HELD ITEM.
//   · `kit.outfits.tee`      a plain T-shirt instead of a medical outfit
//   · `skirt: { kind: 'apron' }` + `kit.parts.apronBib`   the apron: the rig draws the part below
//     the hips (it follows the legs and the turn), the bib is drawn on the torso
//   · `heldItemR`            a paper cup in the screen-right hand (L / R are screen sides); `hideItem('R')` puts it away
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
    // Right forearm raised to offer the cup; the hand holding something is a fist.
    restPose: { ...base.restPose, handR: 'fist', upperArmR: 20, forearmR: -80, smile: 0.9 },
  }),
};

return { default: __default };
})();

/* ───── characters/granny.js ───── */
__m['characters/granny.js'] = (function () {
// Granny — an ELDERLY character: age comes from four cues together.
//   · grey hair (colours only — the ponytail drawing is the nurse's)
//   · `kit.parts.wrinkles`   lines on the face
//   · `stoop: 1`             bent back; shows most when she turns sideways
//   · `skirt`                a long skirt, with `colors.trousers` set to skin for bare shins
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

/* ───── characters/grandpa.js ───── */
__m['characters/grandpa.js'] = (function () {
// Grandpa — bald on top, white hair at the sides, moustache, round glasses, mustard cardigan.
//   · `hat: () => ''`        the surgeon base wears a cap; remove it
//   · `backHair: 'low'`      hair only from the ears down when he turns (bald crown)
//   · `kit.outfits.plainCoat` used as a cardigan: buttons, ribbed hem and pockets in `accessories`
//   · `stoop`                a slight bend
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
    // Two tufts above the ears; the crown stays bare.
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

/* ───── characters/clerk.js ───── */
__m['characters/clerk.js'] = (function () {
// Office clerk — a long-sleeved SHIRT and a clipboard.
//   · `kit.outfits.shirt`    collar, placket, buttons, chest pocket
//   · `heldItemL`            clipboard in the screen-left hand (the L drawing is mirrored)
//   · keeps the doctor's glasses and hair; `shoulderAccessories` cleared so no stethoscope
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
    // Left forearm across the body carrying the clipboard, right arm relaxed.
    restPose: { ...base.restPose, handL: 'fist', upperArmL: 14, forearmL: -70, upperArmR: 8, forearmR: -10 },
  }),
};

return { default: __default };
})();

/* ───── characters/girl.js ───── */
__m['characters/girl.js'] = (function () {
// Girl — a CHILD: body preset, a ready-made hairstyle and a one-piece dress.
//   · `kit.bodies.child`     big head, short torso and legs. Next to an adult, give her host
//                            about 0.75 × the adult's height (`kit.bodies.child.hostScale`)
//   · `kit.hair.pigtails()`  ready-made hair — no SVG to draw
//   · `kit.outfits.dress`    top + skirt in one colour; bare legs = `trousers` in the skin colour
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

/* ───── characters/boy.js ───── */
__m['characters/boy.js'] = (function () {
// Boy — a child in a hoodie with spiky hair.
//   · `hat: () => ''`        the surgeon base wears a cap; remove it
//   · `kit.hair.spiky()` · `kit.outfits.hoodie` · `kit.bodies.child`
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

/* ───── characters/manager.js ───── */
__m['characters/manager.js'] = (function () {
// Manager — a taller, less chibi adult in a suit.
//   · `kit.bodies.tall`      smaller head, longer legs
//   · `kit.outfits.suit`     jacket with lapels, shirt (`colors.innerShirt`) and tie (`colors.tie`)
//   · `kit.hair.sidePart()`  ready-made hair; the doctor's glasses are removed
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

/* ───── characters/index.js ───── */
__m['characters/index.js'] = (function () {
// The list of CUSTOM characters. To add one: create a file in this folder (copy `_template.js`)
// and add it to the array below. Order matters: a character whose `base` is another custom
// character must come AFTER it.
//
// The ones here are SAMPLES — each shows a different part of the vocabulary:
//   receptionist   new hair + an outfit reused as a blazer
//   barista        T-shirt, apron, a cup in the hand
//   granny         age cues: grey hair, wrinkles, stoop, long skirt
//   grandpa        bald crown, moustache, glasses, cardigan
//   clerk          shirt and a clipboard
//   girl, boy      children: body preset, ready-made hair, dress / hoodie
//   manager        tall body preset, suit
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

/* ───── runtime/index.js ───── */
__m['runtime/index.js'] = (function () {
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
const { RigSVG } = __m['runtime/rig-svg.js'];
const { RigThu } = __m['runtime/rig-thu.js'];
const { dangKyDau, KIT } = __m['runtime/characters.js'];
const { createProp, PROP_KINDS } = __m['runtime/props.js'];
const { child, teen, adult, tall, stocky } = __m['runtime/bodies.js'];
const { crop, sidePart, bob, long, ponytail, bun, pigtails, curly, spiky, tufts, bald } = __m['runtime/hair.js'];
const { roundGlasses, shortBeard, moustache, wrinkles, apronBib, cup, clipboard, phone } = __m['runtime/parts.js'];
const { COLOR_KEYS, PERSON_STATE_KEYS, PET_STATE_KEYS, HAND_SHAPES, CONFIG_GROUPS, PET_SHAPE_KEYS, definitionToInternal, definitionToPublic, configToInternal, stateToInternal, DRAWING_SLOTS, DEFINITION_KEYS } = __m['runtime/schema.js'];
const CUSTOM_CHARACTERS = __m['characters/index.js'].default;

const VERSION = '0.17.0';
/** Tên biến toàn cục của bản dựng IIFE. */
const GLOBAL_NAME = 'VGCharacter';

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

/* ─────────────────────────────────────────────────────────────── đăng ký */

/**
 * Đăng ký một nhân vật tuỳ chỉnh (xem `characters/_template.js`).
 *   id      khoá, chỉ gồm chữ thường, số và gạch dưới
 *   base    id nhân vật làm GỐC — nhân vật mới thừa hưởng mọi thứ không ghi đè
 *   define  (base, kit) => object định nghĩa, khoá tiếng Anh (bảng khoá: references/slots.md)
 */
function registerCharacter({ id, base = 'vet', define }) {
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
function __setBakedConfigs(configs) { Object.assign(bakedConfigs, configs); }

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

/**
 * Dựng một nhân vật NGƯỜI vào `host`.
 *   id      id nhân vật ('vet' mặc định); `list()` liệt kê
 *   config  object bộ số. Bỏ trống → dùng bộ số đã nướng vào bản dựng (nếu có); `null` → không dùng
 */
function createCharacter(host, { id = 'vet', config } = {}) {
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

/** Gieo hạt cho MỌI thứ ngẫu nhiên (chớp mắt, khẩu hình, cử chỉ). Bắt buộc khi dựng video. */
function seed(value) { RigSVG.gieo(value); RigThu.gieo(value); }

// Tên hiển thị TIẾNG ANH của các nhân vật và giống có sẵn. Tên trong hai bộ rig là tiếng Việt
// (studio dùng); phía công khai trả về tên ở đây, nhân vật tuỳ chỉnh thì trả `name` nó tự khai.
const BUILT_IN_NAMES = {
  default: 'Default (plain adult)', vet: 'Veterinarian', surgeon: 'Surgeon', nurse: 'Nurse', doctor: 'Doctor with glasses',
  dog: 'Dog (golden puppy)', shiba: 'Dog (shiba)', cat: 'Cat (grey tabby)', orange_cat: 'Cat (orange tabby)', black_cat: 'Cat (black)',
};
const displayName = (id, definition) => BUILT_IN_NAMES[id] || definition.ten || id;

/** Liệt kê nhân vật đang có và động tác của từng loại. */
function list() {
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

function sequence(rig, stepList, { gap = 0.1, sampleRate = 60 } = {}) {
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
 *             avoid: các rig KHÁC đang có mặt trong cảnh — khung sẽ né để không rig nào bị mép khung cắt
 *             ngang, hoặc đưa hẳn nó vào khung nếu né không được (`timeline.data.subjects` cho biết kết quả).
 *
 * Vị trí tính MỘT LẦN lúc dựng, từ bố cục trang và hình học của rig — nên tua tới đâu cũng ra
 * cùng một khung hình. Máy quay không bám theo nhân vật đang di chuyển.
 */
function shot(scene, subject, kind = 'face', { duration = 0.6, ease = 'power2.inOut', fill = 0.82, centerY = 0.5, sequence: given, time, frame, avoid = null } = {}) {
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
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
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
    rigs.forEach((rig, index) => {
      const box = boxAt(rig, index, kind);
      left = Math.min(left, box.left); right = Math.max(right, box.right); top = Math.min(top, box.top); bottom = Math.max(bottom, box.bottom);
    });
    // Vừa cả chiều cao lẫn bề ngang của vùng ngắm (hai nhân vật đứng xa nhau thì bề ngang quyết định).
    const scale = Math.max(1, Math.min(8, fill * frameHeight / (bottom - top), (rigs.length > 1 ? 0.9 : 1.6) * frameWidth / (right - left)));
    // Canh vùng ngắm vào giữa khung, nhưng không để lộ ra ngoài mép cảnh.
    const within = (value, size) => Math.min(0, Math.max(size - size * scale, value));
    target = { x: within(frameWidth / 2 - (left + right) / 2 * scale, frameWidth), y: within(frameHeight * centerY - (top + bottom) / 2 * scale, frameHeight), scale };
    // NGƯỜI ĐỨNG CẠNH: một cái đầu (hay con vật) bị mép khung cắt ngang trông như lỗi dựng hình. Với mỗi rig trong
    // `avoid`: nếu nó nằm LƯNG CHỪNG trong khung thì đẩy khung sang cho nó ra hẳn; đẩy không được (chủ thể sẽ bị
    // cắt, hoặc chạm mép cảnh) thì đưa luôn nó vào khung — thành cảnh hai người.
    const crowded = [];
    for (const other of [].concat(avoid || [])) {
      if (rigs.includes(other) || typeof other.shotBox !== 'function') continue;
      const box = boxAt(other, -1, 'face');
      if (!box.shown) continue;
      const partly = (x) => { const a = box.left * scale + x, b = box.right * scale + x, seen = Math.min(frameWidth, b) - Math.max(0, a); return seen > 0.06 * (b - a) && seen < 0.94 * (b - a); };
      const overlapsY = box.bottom * scale + target.y > 0 && box.top * scale + target.y < frameHeight;
      if (!overlapsY || !partly(target.x)) continue;
      const shifted = within(target.x + ((box.left + box.right) / 2 > (left + right) / 2 ? frameWidth - (box.left * scale + target.x) + 6 : -(box.right * scale + target.x) - 6), frameWidth);
      const keepsSubject = left * scale + shifted >= 0 && right * scale + shifted <= frameWidth;
      if (keepsSubject && !partly(shifted)) target.x = shifted; else crowded.push(other);
    }
    if (crowded.length) return shot(scene, [...rigs, ...crowded], kind, { duration, ease, fill, centerY, time, frame });
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
function captions(source, element, { fade = 0.15, hold = 0.3, speaker = false, follow = false, offsetY = 12, readable = true, maxChars = 0 } = {}) {
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
      // Ưu tiên ngắt ở cuối CÂU (. ! ? …), rồi tới dấu phẩy / chấm phẩy, cuối cùng mới là khoảng trắng.
      // Không ngắt sau dấu hai chấm: "Ba:" mà đứng cuối cụm thì người đọc bị treo.
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
function conversation(turnList, { gap = 0.25, waiting = true, stepGap = 0.1, camera = null, leadIn = 0.6, overlap = true } = {}) {
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
    let inFrame = [];                                             // các nhân vật mà cảnh quay hiện tại đang ôm
    for (const turn of turns) {
      const spoken = turn.steps.filter((step) => SPEECH_STEPS.includes(step.name));
      const from = spoken.length ? spoken[0].start : turn.start, until = spoken.length ? spoken[spoken.length - 1].start + spoken[spoken.length - 1].speech : turn.end;
      // Lượt `shot: false` giữ nguyên máy quay — nhưng lời của nó vẫn tính khi quyết định lúc nào về toàn cảnh.
      if (spoken.length) lastWords = Math.max(lastWords, until);
      // Lượt có BƯỚC VÀO / BƯỚC RA: người ấy đi ngang qua cả cảnh, nên lùi về toàn cảnh ngay khi họ bắt đầu đi —
      // cận cảnh của người khác mà có một cái đầu lướt ngang mép khung thì rất khó hiểu.
      const crossing = turn.steps.find((step) => ['enter', 'exit', 'walkForward', 'walkAway'].includes(step.name));
      if (crossing && turn.shot === undefined && aimed && aimed !== 'wide') {
        cameraTimeline.add(shot(scene, null, 'wide', { duration: move }).paused(false), Math.max(0, crossing.start - lead));
        aimed = 'wide'; inFrame = [];
      }
      // Lượt KHÔNG LỜI (con chó sủa, ai đó reo mừng) mà người diễn đang nằm ngoài cảnh cận hiện tại: lùi
      // về toàn cảnh cho khán giả thấy. Người diễn đang ở trong khung thì máy quay đứng yên.
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


return { VERSION, GLOBAL_NAME, kit, validateConfig, registerCharacter, __setBakedConfigs, applyConfig, createCharacter, createPet, seed, list, sequence, shot, captions, conversation, RigSVG, RigThu, createProp };
})();

__m['runtime/index.js'].__setBakedConfigs({});
return __m['runtime/index.js'];
})();
