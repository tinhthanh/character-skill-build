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
export function veKhuonMat({ rong = 50, cao = 54, cam = 56, yRong = -6,
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
export function beRongTaiY(k, y) {
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
export function veChanMay({ dai = 10.5, day = 3, cong = 2.25, thon = 0, xech = 0 } = {}, ben = 'R') {
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
  B: { mieng: 0.22, chum: 0.04, cuoi: 0.46 },   // K S T — hé, răng gần khít
  C: { mieng: 0.48, chum: 0.02, cuoi: 0.60 },   // EH AE — mở vừa, kéo ngang
  D: { mieng: 0.86, chum: 0.03, cuoi: 0.48 },   // AA — mở to
  E: { mieng: 0.42, chum: 0.45, cuoi: 0.14 },   // AO ER — tròn vừa
  F: { mieng: 0.26, chum: 0.85, cuoi: 0.00 },   // UW OW W — chúm
  G: { mieng: 0.16, chum: 0.20, cuoi: 0.34 },   // F V — răng chạm môi
  H: { mieng: 0.38, chum: 0.04, cuoi: 0.40 },   // L
  X: { mieng: 0.00, chum: 0.00, cuoi: 0.35 },   // nghỉ / im
};

const KHAU = [
  { mieng: 0.86, cuoi: 0.60, chum: 0.05 },   // AA — mở to
  { mieng: 0.46, cuoi: 0.72, chum: 0.00 },   // EH AE — hé rộng
  { mieng: 0.30, cuoi: 0.08, chum: 0.85 },   // UW OW W — chúm
  { mieng: 0.15, cuoi: 0.45, chum: 0.10 },   // phụ âm — gần mím
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
    ? `<text x="14" y="-49.5" font-family="Arial, sans-serif" font-size="12" font-weight="800" fill="#fff" text-anchor="middle">${nv.huyHieu}</text>`
    : `<g fill="#fff" transform="translate(14 -54)"><ellipse cx="0" cy="2.2" rx="4.4" ry="3.6"/><circle cx="-5" cy="-2.8" r="1.8"/><circle cx="-1.7" cy="-5" r="1.8"/><circle cx="1.7" cy="-5" r="1.8"/><circle cx="5" cy="-2.8" r="1.8"/></g>`))(NV_BAC_SI_THU_Y.phuKien);

export class RigSVG {
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
                     'speak', 'explain', 'worry', 'express', 'turn', 'sit'];
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
      e['chan' + ben].style.filter = tay.style.filter = mo ? `brightness(${1 - mo * 0.28})` : '';
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
      ? `M ${xN} ${hairline} L ${X(tai + 13)} ${hairline} Q ${X(tai + 10)} ${(hairline - 5) / 2} ${X(tai + 7)} -5`
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
    e.than.setAttribute('transform', `translate(${HONG.x} ${HONG.y}) rotate(${s.than + h * stoop * 10}) scale(${this.nv.coThan} ${this.nv.coThan * (1 - stoop * 0.05)})`);
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
    e.dau.setAttribute('transform', `translate(${s.dauX + h * (2.5 + stoop * 7)} ${-103 + this.nv.dauLech + s.dauY + stoop * 9}) rotate(${s.dau}) scale(${this.nv.coDau})`);
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
      const chon = s['tay' + ben];
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
    if (kieu.batNghi !== undefined) nghi.batL = nghi.batR = kieu.batNghi;
    if (kieu.cangNghi !== undefined) nghi.cangL = nghi.cangR = kieu.cangNghi;
    if (Object.keys(nghi).length) {
      this.nv.nghi = { ...(this.nv.nghi || {}), ...nghi };
      this.NGHI = Object.freeze({ ...this.NGHI, ...nghi });
    }
    this.datNghi();
    const { daiCanhTay, daiCangTay, dayTay, coBanTay } = this.nv;
    return { daiCanhTay, daiCangTay, dayTay, coBanTay, batNghi: this.NGHI.batR, cangNghi: this.NGHI.cangR };
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
    t.to(this.s, { matY: 1, duration: 0.07, ease: 'power1.in' }, at)
     .to(this.s, { matY: 0, duration: 0.11, ease: 'power1.out' }, at + 0.07);
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
  wave() {
    const t = this.tl(), s = this.s;
    t.set(s, { tayR: 'mo' }, 0);
    t.to(s, { batR: -4, cangR: 22, duration: 0.12, ease: 'power1.in' }, 0);      // lấy đà
    t.to(s, { batR: 148, cangR: 18, vai: -3, than: -3, dau: -6, nhinX: 1.5,
              cuoi: 1, mieng: 0.15, mayL: 0.5, mayR: 0.5,
              duration: 0.45, ease: 'back.out(1.4)' }, 0.12);
    for (let i = 0; i < 4; i++) {                                                // vẫy 4 nhịp
      t.to(s, { cangR: i % 2 ? 6 : 46, dau: i % 2 ? -6 : -9, duration: 0.22, ease: 'sine.inOut' }, 0.57 + i * 0.22);
    }
    t.to(s, { cangR: 18, duration: 0.2, ease: 'sine.inOut' }, 1.45);
    this.#chop(t, 0.95);
    this.#khep(t, 0.55, 1.7);
    return t;
  }

  thumbsUp() {
    const t = this.tl(), s = this.s;
    t.set(s, { tayR: 'nam' }, 0);
    t.to(s, { batR: -2, cangR: -30, duration: 0.15, ease: 'power1.in' }, 0);
    t.to(s, { batR: 22, cangR: -140, than: -2, dau: -5, cuoi: 1, mieng: 0.12, mayL: 0.6, mayR: 0.6,
              duration: 0.4, ease: 'back.out(1.6)' }, 0.15);
    t.set(s, { tayR: 'cai' }, 0.38);
    t.to(s, { dauY: 4, cangR: -146, duration: 0.15, ease: 'power2.out' }, 0.65)   // gật nhẹ kèm nhấn tay
     .to(s, { dauY: 0, cangR: -140, duration: 0.3, ease: 'power2.inOut' }, 0.8);
    this.#chop(t, 1.15);
    this.#khep(t, 0.5, 1.5);
    return t;
  }

  // Chỉ vào phần tử DOM (hoặc {left,top,width,height}); không có mục tiêu thì chỉ sang phải.
  point(muc = null) {
    const t = this.tl(), s = this.s;
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

  shrug() {
    const t = this.tl(), s = this.s;
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
    if (name !== 'surprised' && hold > 0.8) this.#chop(t, into + hold * 0.5);      // ngạc nhiên thì không chớp mắt
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
   * QUAY MẶT về một phía và GIỮ hướng đó cho các động tác sau.
   *   face('left') · face('right') · face('front')        theo tên
   *   face(element) · face(otherRig)                      quay về phía phần tử / nhân vật ấy
   * `amount` 0…1 — 0.55 là nghiêng 3/4 (mặc định), 1 là nghiêng hẳn.
   */
  face(target = 'right', amount = 0.55) {
    let side = target === 'left' ? -1 : target === 'front' ? 0 : 1;
    if (target && typeof target === 'object') {
      // Phần tử DOM hoặc một rig khác: so tâm của nó với tâm của mình trên màn hình.
      const box = (el) => el.getBoundingClientRect(), other = box(target.svg || target), mine = box(this.svg);
      const dx = (other.left + other.width / 2) - (mine.left + mine.width / 2);
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
  #khauHinh(t, soAm, nhip) {
    const s = this.s;
    let truoc = -1;
    for (let i = 0; i < soAm; i++) {
      let k;
      do { k = Math.floor(ngau() * KHAU.length); } while (k === truoc && KHAU.length > 1);
      truoc = k;
      const h = KHAU[k], a = i * nhip, giam = i % 5 === 4 ? 0.35 : 1;   // cuối nhịp thì hụt hơi
      t.to(s, { mieng: h.mieng * giam * nhieu(0.82, 1.08), chum: h.chum, cuoi: h.cuoi,
                duration: nhip * 0.45, ease: 'power1.out' }, a)
       .to(s, { mieng: h.mieng * giam * 0.16, chum: h.chum * 0.5,
                duration: nhip * 0.55, ease: 'power1.in' }, a + nhip * 0.45);
    }
    return t;
  }

  speak(text = null, dur = 2) {
    const t = this.tl(), s = this.s;
    const soAm = this.#soAm(text, dur), nhip = dur / soAm;
    t.set(s, { tayR: 'mo' }, 0);
    t.to(s, { mayL: 0.5, mayR: 0.5, cuoi: 0.5, nhinX: 0.8, duration: 0.2 }, 0);
    this.#khauHinh(t, soAm, nhip);
    // đầu và tay phụ hoạ theo câu nói
    t.to(s, { dau: -3, dauY: 2, duration: dur * 0.35, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.1);
    t.to(s, { batR: 34, cangR: -70, than: -1.5, duration: 0.35, ease: 'power2.out' }, 0.2)
     .to(s, { batR: 40, cangR: -60, duration: 0.35, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.55);
    if (dur > 1.2) this.#chop(t, dur * 0.55);
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
      const d = nhieu(nganNhat, daiNhat);
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
  explain(text = null, dur = 2.4) {
    const t = this.tl(), s = this.s;
    const soAm = this.#soAm(text, dur), nhip = dur / soAm;
    // Nền THẤP và LỆCH: tay trái buông gần thõng, tay phải hé hơn một chút.
    // Trái phải khác nhau ngay từ nền thì cái nâng của tay phải mới nổi lên —
    // để hai tay ngang nhau là bàn tay phải bị bàn tay trái che mất.
    const NEN = { batL: 10, batR: 16, cangL: -60, cangR: -72 };

    t.set(s, { tayL: 'xoe', tayR: 'xoe' }, 0);
    t.to(s, { ...NEN, than: -1.5, mayL: 0.45, mayR: 0.45, cuoi: 0.5, nhinX: 0.8,
              duration: 0.35, ease: 'power2.out' }, 0);

    this.#khauHinh(t, soAm, nhip);

    // Bỏ nhịp nào rơi vào 0.5s cuối: đang vung dở thì bị `#khep` giật về nghỉ.
    const BUOC = 5, moc = [];
    for (let i = 1; i < soAm && i * nhip <= dur - 0.5; i += BUOC) moc.push(i * nhip);
    this.#cuChi(t, moc, dur);

    if (dur > 1.2) this.#chop(t, dur * nhieu(0.4, 0.65));
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
  speakCues(cue, dur = null, { cuChi = true } = {}) {
    const t = this.tl(), s = this.s;
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
    t.to(s, { ...NEN, than: -1.5, mayL: 0.4, mayR: 0.4, cuoi: 0.45, nhinX: 0.6,
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
    let atC = nhieu(0.2, 0.9), ben = ngau() < 0.5 ? 1 : -1;
    while (atC < D) {
      const doi = nhieu(0.7, 1.3);
      // ĐỔI BÊN chỉ 70% số lần — 30% còn lại chỉnh lại trọng tâm trên CÙNG
      // một chân. Luân phiên cứng trái–phải là một sóng vuông, và tự-tương-
      // quan bắt được nó ngay (đo được đỉnh quay lại 0.57 ở `x`).
      if (ngau() < 0.7) ben = -ben;
      const manh = nhieu(0.45, 1);
      t.to(s, { x: ben * 2.3 * manh, duiL: ben * 3.0 * manh, duiR: -ben * 3.0 * manh,
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
      t.to(s, { mieng: h.mieng, chum: h.chum, cuoi: h.cuoi,
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
    t.to(s, { mieng: 0, chum: 0, duration: 0.18 }, D);
    this.#khep(t, 0.5, D + 0.05);
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

