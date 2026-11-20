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

import { MARKS, freshMark, attachMark, drawMark, markTweens, markOff } from './marks.js';
import { attachShade } from './shading.js';

const KHUNG = { w: 400, h: 470 };
const DOI_Y = 30;                              // chừa chỗ phía trên cho đầu to / tóc búi            // bao được tư thế rộng nhất (present)

const NGHI = Object.freeze({
  x: 0, y: 0, mo: 1, co: 1, huong: 0,
  than: 0, tho: 0, vai: 0,
  dau: 0, dauX: 0, dauY: 0,
  batL: 11, batR: 11, cangL: -17, cangR: -17, vungL: 0, vungR: 0,
  duiL: 0, duiR: 0, ongL: 0, ongR: 0, nhacL: 0, nhacR: 0,
  seat: 0,                 // 0…1 ngồi: đùi rút ngắn về phía người xem, ống chân giữ nguyên (xem apDung)
  kneel: 0,                // 0…1 QUỲ (cộng với `seat` = 1): ống chân cũng chĩa về phía người xem, rút ngắn một nửa — người hạ thêm
  matY: 0, nhinX: 0, nhinY: 0,
  mayL: 0, mayR: 0, mieng: 0, chum: 0, cuoi: 0.35,
  itemL: 1, itemR: 1,      // độ hiện của đồ vật cầm ở tay trái / phải (0 = cất đi)
  itemTiltL: 0, itemTiltR: 0,   // độ nghiêng thêm của đồ vật về phía mặt (độ) — nghiêng cốc khi uống
  itemZoomL: 1, itemZoomR: 1,   // món đồ phóng to quanh lòng bàn tay — giơ điện thoại khoe màn hình cho người xem đọc được
  itemBackL: 0, itemBackR: 0,
  phoneL: 0, phoneR: 0,
  toolL: 0, toolR: 0,
  gadgetL: 0, gadgetR: 0,       // dụng cụ nhỏ hiện trong tay ấy: 1 = đèn soi (`examine`), 2 = bánh thưởng, 3 = viên thuốc (`giveTreat`), 4 = lược (`brush`), 5 = đèn pin (`shine`)
  note: 0,                      // 0…1 THẺ THÔNG BÁO bật ra trên điện thoại (`notify`): độ lớn / độ hiện
  ball: 0,                      // quả bóng ném đi (`throwBall`): 0 = không có, 0…1 đang bay, 1 = đã chạm đất ở xa
  leash: 0,                     // 1 = đang DẮT một con vật: vẽ dây từ tay cầm quai dây (`items: { R: 'leash' }`) tới vòng cổ nó
  watchL: 0, watchR: 0,
  heartL: 0, heartR: 0,         // trái tim bật ra trên bàn tay 'tim' (bắn tim): 0 = chưa có, 1 = đủ lớn
  ovL: 0, ovR: 0, ovBatL: 0, ovBatR: 0, ovCangL: 0, ovCangR: 0,   // đặt góc tay CUỐI CÙNG (góc trên màn hình), trọng số 0…1 — xem apDung
  sauDauL: 0, sauDauR: 0,       // 1 = cánh tay ấy vẽ SAU đầu (gãi gáy: bàn tay vòng ra sau đầu)
  handZoomL: 1, handZoomR: 1,   // phóng to bàn tay (đếm ngón cho dễ đọc)
  khoc: 0, khocY: 0,            // nước mắt (0…1 hiện) và độ chảy của giọt nước mắt (0…1, xuống má)
  moHoi: 0, doMa: 0,            // giọt mồ hôi ở thái dương (ngượng, bối rối) · má đỏ thêm (0…1)         // 1 = đồng hồ đeo ở cổ tay ấy (`checkWatch`)
  omGive: 0,                    // 0…1 đang TRAO con vật đang bế (`handOverPet`): nó và hai cánh tay đi ra điểm giữa hai người
  om: 0, omRise: 0,             // đang BẾ một con vật (SVG của nó nằm trong ngăn `om`) / độ nhấc nó lên trước ngực 0…1           // 1 = mặt ống nghe hiện trong tay ấy (`listen`)
  plungerL: 0, plungerR: 0,     // 0…1 pít-tông ống tiêm ấn xuống (`inject`)         // 1 = đang ÁP ĐIỆN THOẠI lên má bằng tay ấy (thế giữ: `phoneUp` / `phoneDown`, xem apDung)   // 0 = mặt trước món đồ, 1 = mặt LƯNG (phần tử `data-back`) — điện thoại áp lên má thì quay lưng ra ngoài
  carryL: 1, carryR: 1,         // 1 = tay cầm đồ giữ dáng BƯNG khi quay nghiêng; động tác dùng tay ấy (uống, đưa, cất) hạ về 0
  aimL: 0, aimR: 0,             // 1 = góc của tay ấy là góc TRÊN MÀN HÌNH: dùng nguyên vẹn dù thân đang quay (xem apDung)
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
// Dáng tay của các động tác với điện thoại / máy tính — [bắp, cẳng(, nghiêng món đồ)], đo trên trang thử dáng.
// Điện thoại áp lên má (nghiêng 25°, phóng 1,4 cho cân với đầu chibi), đầu nghiêng 15° về phía máy (`CALL_TILT`).
// BẮP TAY ĐƯA NGANG RA BÊN (100°), khuỷu ở ngang cằm phía ngoài, cẳng tay vòng lên má. Hai bản trước giơ khuỷu lên cao
// (140 / −165 rồi 125 / −140): bắp tay chạy sát dưới hàm, đầu chibi to che mất vai — cánh tay như mọc ra từ cằm, người
// xem đọc thành bà cụ mất tay phải.
const CALL_POSE = [100, -152, 25, 1.4];
const CALL_TILT = 15;
const SHOW_POSE = [70, -125];                             // giơ điện thoại cạnh mặt, màn hình về người xem
const TAP_POSE = { hold: [20, -110], finger: [24, -118] };   // tay cầm đưa lên trước ngực; tay kia chạm màn hình
const TYPE_POSE = [14, -72];                              // hai tay đưa ra trước trên bàn phím
// Cúi nhìn màn hình (gõ phím, bấm điện thoại): hạ đầu, đồng tử xuống đáy mắt, mí hạ nửa chừng. Mắt chibi to: đồng tử dịch
// 2,8 đơn vị vẫn đọc ra nhìn thẳng ống kính (Gemini, lần audit thứ hai) — phải có MÍ HẠ mới thành ánh mắt nhìn xuống.
const LOOK_DOWN = { head: 10, eyes: 4.5, lids: 0.5 };      // đầu hạ 10: 14 thì ở cảnh cận đầu lún vào cổ áo, hai vai trồi lên ngang cằm
// Dáng tay của các cử chỉ đợt 3 — [bắp, cẳng], góc TRƯỚC MẶT (dò trên trang thử dáng).
const CLAP_POSE = [22, -138];             // hai bàn tay gặp nhau trước ngực
const WAI_POSE = [16, -150];              // hai lòng bàn tay áp nhau trước ngực, cao hơn vỗ tay
const COUNT_BEAT = 0.8;                   // mỗi nhịp đếm ngón giữ 0,8 s cho người xem kịp đọc
const COUNT_POSE = [35, 135];             // khuỷu HẠ, cẳng tay dựng lên: bàn tay giơ cạnh vai (khuỷu cao, cẳng tay chúc xuống thì bàn tay nằm dưới cẳng tay, ngón chĩa ngược vào tay áo)
const WATCH_POSE = [24, -120];            // cẳng tay NGANG trước ngực, mặt đồng hồ hướng ra (sát cằm thì ở cảnh cận chỉ còn mẩu tay áo cạnh cằm)
const SHAKE_POSE = [40, 50];
const FACE_HANDS_POSE = [35, -170];       // ôm mặt: khuỷu hạ, hai bàn tay áp hai bên má (đầu gục xuống đón)
// Đợt 4 — cử chỉ cho video giải thích (góc màn hình qua kênh `ov`, [bắp, cẳng] như các dáng trên).
const PONDER_POSE = [16, -179];           // tay chống cằm: khuỷu hạ, cẳng tay dựng sát người, bàn tay dưới cằm (đầu cúi xuống đón — tay chibi ngắn)
const HUG_ARM_POSE = [12, -98];           // cẳng tay vắt ngang bụng đỡ khuỷu tay kia (dáng suy nghĩ)
const FOLD_POSE = { L: [24, -132], R: [18, -118] };   // khoanh tay: hai cẳng tay chéo nhau trước ngực, một cao một thấp
const HIPS_POSE = [52, -100];             // chống nạnh: khuỷu dang ra, bàn tay úp vào hông
const CHEST_POSE = [20, -128];            // đặt tay lên ngực (giới thiệu bản thân, cảm ơn, thở phào)
const HAIL_POSE = [150, 18];              // giơ cao một tay vẫy gọi (tay chibi không khum tới miệng: khum tay chỉ thành tay đặt lên vai)
const STARTLE_POSE = [38, 138];           // giật mình: hai bàn tay xoè giơ lên cạnh vai
// Đợt 5 — cử chỉ "nên / không nên" và kêu gọi.
const STOP_POSE = [20, 162];              // giơ lòng bàn tay chặn trước ngực: khuỷu hạ, cẳng tay dựng
const WAG_POSE = [32, 150];               // ngón trỏ giơ cạnh vai để lắc "không không"
const BECKON_POSE = [34, 100];            // bàn tay ngửa đưa ra bên hông, ngón vẫy vào "lại đây"
const HEART_POSE = [22, -150];            // bắn tim: nắm tay trước ngực, lệch về giữa
const VSIGN_POSE = [36, 140];             // chữ V cạnh mặt
const NAPE_POSE = [135, 105];
const HANDOVER_AT = 0.55;                 // thời điểm con vật sang tay người nhận (`handOverPet` / `takePet` cùng nhịp)
const KNEEL_SHIN = 0.55;                  // quỳ: ống chân rút ngắn chừng này (chĩa về phía người xem) — người hạ thêm đúng chừng ấy             // gãi gáy: khuỷu giơ cạnh đầu, bàn tay vòng ra SAU đầu (cánh tay vẽ sau lớp đầu)              // tay đưa ra ngang hông về phía người kia
const CARRY_ZOOM = 1.15;
const UPRIGHT_HANDS = ['cai', 'mot', 'hai', 'ba', 'xuong', 'tim'];          // hình bàn tay vẽ dựng đứng, luôn xoay cho ngón chỉ lên trời
const CRADLE = [20, -78];                                 // dáng ôm con vật: cẳng tay nằm ngang trước bụng, con vật nằm TRÊN cẳng tay
// Vùng xoá viền ở nắp vai: tâm hạ `CAP_DROP` dưới chốt vai, bán kính `CAP_RADIUS`, đặc hoàn toàn tới `CAP_SOLID` bán
// kính rồi nhạt dần — viền dọc hai bên bắp tay hiện dần từ ngang nách xuống, không đứt cụt.
const CAP_RADIUS = 24, CAP_DROP = 4, CAP_SOLID = 0.75;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const chuanHoaGoc = (g) => ((((g + 180) % 360) + 360) % 360) - 180;
// Nguồn ngẫu nhiên của MỌI động tác (chớp mắt, khẩu hình, cử chỉ). Mặc định là
// `Math.random`; gọi `RigSVG.gieo(hat)` thì thành dãy cố định (mulberry32), để
// hai lần render cùng một kịch bản ra đúng cùng một hình — không gieo thì mỗi
// lần dựng timeline chớp mắt một kiểu, không so khung với nhau được.
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
           cx: pha(g.cx, sg * 6, t), cy: pha(g.cy, 9, t),
           ex: pha(g.ex, -sg * 5, t), ey: pha(g.ey, 9.5, t) };
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

// ÁO KHOÁC THÚ Y DÀI TAY (bản 0.38). Thay bộ scrubs ngắn tay chữ A: ống tay ngắn loe rộng mà cánh tay da thì mảnh,
// nên dang tay là hai cái cánh vải với hai que da thò ra, giơ tay cao là hai khối vải đè lên má. Áo dài tay thì cả
// cánh tay là vải có viền, chỉ bàn tay là da — dáng nào cũng ra một cánh tay liền.
// Thân áo gần thẳng: hơi ôm ở eo (±27 tại y −30), gấu ±35 tại y +20 võng nhẹ. Gấu phải rộng hơn hông: thân áo co
// ngang khi quay người còn hông thì không, gấu ±30 là mép quần lòi ra thành một cái gờ ở hông ngay trên bo gấu.
const AO_KHOAC = 'M -35 20 Q 0 26 35 20 Q 31 0 27 -30 Q 27.5 -70 35 -88'
               + ' Q 30 -97 20 -101 Q 10 -105 0 -105 Q -10 -105 -20 -101 Q -30 -97 -35 -88'
               + ' Q -27.5 -70 -27 -30 Q -31 0 -35 20 Z';
const SUON_KHOAC = ['L', 'R'].map((b) => { const g = b === 'L' ? -1 : 1;
  return `M ${g * 35} -88 Q ${g * 27.5} -70 ${g * 27} -30 Q ${g * 31} 0 ${g * 35} 20`
       + ` L ${g * 30} 21 Q ${g * 26} 0 ${g * 22} -30 Q ${g * 22.5} -68 ${g * 30} -86 Z`; }).join(' ');

// Chỉ may: nét tím ĐỨT QUÃNG. Cùng một hàm cho gấu áo, hai túi hông và túi
// ngực nên ba chỗ không bao giờ lệch bước chỉ nhau.
const chiMay = (d, m, rong = 1.05) =>
  `<path d="${d}" stroke="${m.phuKien}" stroke-width="${rong}" fill="none"
         stroke-dasharray="3 2.6" stroke-linecap="round"/>`;

// Túi ngực của áo khoác: chữ nhật bo góc, nắp túi là một đường ngang. Huy hiệu vẫn căn theo tâm túi (x 14).
const tuiNgucKhoac = (m) => `
        <path d="M 6.5 -66 h 15 a 1.6 1.6 0 0 1 1.6 1.6 v 18.4 a 3 3 0 0 1 -3 3 h -12.2 a 3 3 0 0 1 -3 -3 v -18.4 a 1.6 1.6 0 0 1 1.6 -1.6 z"
              fill="${chinhSang(m.ao, 0.06)}" stroke="${m.vienNet}" stroke-width="1.5" stroke-linejoin="round"/>
        ${chiMay('M 5.6 -61.5 h 16.8', m, 1)}
        ${'__HUYHIEU__'}`;
// Túi hông của áo khoác: miệng túi xéo, một nét mép vải và một đường chỉ tím song song.
const tuiHongKhoac = (ben, m) => { const g = ben === 'L' ? -1 : 1; return `
          <path d="M ${g * 25} -12 L ${g * 15} 4" stroke="${m.vienNet}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          ${chiMay(`M ${g * 23} -11.5 L ${g * 13.4} 3.8`, m)}`; };

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

// Bác sĩ thú y (kiểu chibi): đầu to, mắt to nâu có ánh sáng, tóc đen búi bóng, áo khoác xám đậm dài tay
// kéo khoá, chỉ tím, túi ngực có huy hiệu, ống nghe, giày bệt, tay đan trước bụng khi đứng.
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
  // Áo dài tay: cả cánh tay tô màu áo và có viền; ống tay vừa cánh tay, không loe.
  tayDai: true, daiTayAo: 1, xeoTayAo: 3, rongTayAo: 1.1, vienGau: 0, boGocTayAo: 4,
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
  damSuon: 0.34,
  // Tay đan ở NGANG BỤNG (bắp 14°, cẳng −82°). Bản trước (19°, −97°) để cẳng tay hơi chếch lên: nhìn thẳng thì vừa,
  // nhưng quay 3/4 là bàn tay lên tới ngực, đè vào đáy bảng tên.
  nghi: { batL: 14, batR: 14, cangL: -82, cangR: -82, cuoi: 1, mieng: 0.6, mayL: 0.15, mayR: 0.15 },
  // Sáu màu vải đo TRUNG VỊ từ ảnh mẫu chứ không ước lượng:
  // thân áo và quần CÙNG một mã (#4f5b64) — trong ảnh mẫu chúng chỉ tách nhau
  // nhờ nét viền, nên bỏ viền đi là hai mảnh dính làm một.
  mau: { da: '#f7d9c4', daToi: '#e2b39a', toc: '#151319', tocSang: '#3a3644', ao: '#4f5b64', aoToi: '#3b454a',
         quan: '#4f5b64', giay: '#eef0f2', mieng: '#7d2f3d', ma: '#f2a3a3', phuKien: CHI_TIM, mat: '#3a2416',
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
  // CỔ TRÒN CÓ BO (áo khoác kéo khoá): hai miếng vai che phần cổ loe ra, một vòng bo sẫm ôm chân cổ, viền ngoài và
  // viền trong của bo là hai nét mảnh. Bản trước là cổ chữ V bắt chéo của bộ scrubs.
  coAo: (p, m) => `
        <path d="M -28.5 -96 Q -22 -102.5 -12.2 -103.5 L -8.5 -96 Z" fill="${m.ao}"/>
        <path d="M 28.5 -96 Q 22 -102.5 12.2 -103.5 L 8.5 -96 Z" fill="${m.ao}"/>
        <path d="M -15 -104 Q -13 -90 0 -88 Q 13 -90 15 -104 L 9.5 -104.5 Q 8.5 -94.5 0 -93.5 Q -8.5 -94.5 -9.5 -104.5 Z" fill="${m.aoToi}"/>
        <path d="M -15 -104 Q -13 -90 0 -88 Q 13 -90 15 -104 M -9.5 -104.5 Q -8.5 -94.5 0 -93.5 Q 8.5 -94.5 9.5 -104.5"
              stroke="${m.vienNet}" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  phuKien: (p, m) => `
      <g id="${p}-phuKien">
        <clipPath id="${p}-aoCat"><path d="${AO_KHOAC}"/></clipPath>
        <g clip-path="url(#${p}-aoCat)">
          <path d="M 0 -88 V 26" stroke="${m.vienNet}" stroke-width="1.5" fill="none"/>
          <path d="M -36 12.5 Q 0 18.5 36 12.5 L 36 30 L -36 30 Z" fill="${m.aoToi}" opacity=".55"/>
          ${chiMay('M -36 12.5 Q 0 18.5 36 12.5', m)}
          ${tuiHongKhoac('L', m)}${tuiHongKhoac('R', m)}
        </g>
        <rect x="-1.9" y="-88" width="3.8" height="6.4" rx="1.2" fill="#c3c9d1" stroke="${m.vienNet}" stroke-width="1"/>
        ${tuiNgucKhoac(m)}
        ${ongNghe(m)}
      </g>`,
  phuKienTren: (p, m) => ongNghe(m),
  ao: () => AO_KHOAC,
  suon: SUON_KHOAC,
  // Giày thể thao kín mũi, sáng màu, có đế sẫm. Đôi giày bệt hở mu màu da trước đây đọc thành chân trần.
  giay: (p, ben, m, ong) => `
          <g id="${p}-ban${ben}">
            <path d="M -12 ${ong - 6} h 24 v 10 q 0 6 -7 6 h -10 q -7 0 -7 -6 z" fill="${m.giay}"/>
            <path d="M -12 ${ong + 5.5} q 1 4.5 7 4.5 h 10 q 6 0 7 -4.5 z" fill="${m.quan}"/>
            <path d="M -5 ${ong - 1} h 10 M -4.5 ${ong + 2} h 9" stroke="${m.quan}" stroke-width="1" stroke-linecap="round" opacity=".45"/>
          </g>`,
  net: () => '',
};
// Chữ trên túi ngực căn theo TÂM TÚI (x 14) chứ không phải mép: túi đổi bề
// rộng thì chữ tự ở giữa. Ảnh mẫu để chữ cao ~10.6 đơn vị, gần kín lòng túi.
NV_BAC_SI_THU_Y.phuKien = ((goc) => (p, m, nv) => goc(p, m).replace('__HUYHIEU__',
  nv && nv.huyHieu
    ? `<text x="14" y="-49.5" font-family="Arial, sans-serif" font-size="12" font-weight="800" fill="#fff" text-anchor="middle" data-layout-ignore="" data-layout-allow-occlusion="">${nv.huyHieu}</text>`     // chữ là HOẠ TIẾT trên áo, không phải chữ để đọc — báo cho bộ kiểm bố cục của HyperFrames
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
                     'speak', 'explain', 'worry', 'express', 'turn', 'sit', 'cheer', 'drink', 'stroke', 'write',
                     'call', 'typing', 'listen', 'clap', 'countFingers', 'checkWatch', 'scratchHead', 'headInHands', 'bow', 'wai',
                     'examine', 'giveTreat', 'shine', 'ponder', 'crossArms', 'handsOnHips', 'introduce', 'callOut', 'relief', 'startle', 'lookAround',
                     'thumbsDown', 'stopSign', 'fingerWag', 'beckon', 'fingerHeart', 'vSign', 'brush', 'throwBall'];
  // Ba động tác xoay người sang ngang (`huong` 1). Để riêng, không gộp vào
  // `DONG_TAC`: hai công cụ đo ở trên quét `DONG_TAC` và giả định nhân vật
  // đứng trong khung. Trang thử và trang chỉnh liệt kê cả hai danh sách.
  static DI_NGANG = ['walk', 'enter', 'exit', 'hurry'];
  static SIDESTEP = 70;                  // quãng `walk` ngắn hơn chừng này (đơn vị khung) thì bước nhích, không quay ngang
  // Động tác đổi THẾ ĐỨNG và giữ nguyên thế ấy cho các động tác sau (không khép về nghỉ).
  static STANCE = ['sitDown', 'standUp', 'face', 'hideItem', 'showItem', 'phoneDown', 'kneel'];
  // Động tác TRAO ĐỔI đồ vật giữa hai nhân vật: cần một món đồ (đang cầm / đang cất), nên không chạy trơn như `DONG_TAC`.
  static EXCHANGE = ['handOver', 'take', 'carry', 'handshake', 'handOverPet', 'takePet'];
  // Động tác cần ĐANG CẦM một món đồ (điện thoại): không có thì báo lỗi, nên cũng không chạy trơn như `DONG_TAC`.
  static WITH_ITEM = ['showPhone', 'tapPhone', 'phoneUp', 'inject', 'putDown', 'leash', 'unleash', 'notify'];       // `phoneUp` cũng là một THẾ GIỮ (xem STANCE)
  /** Gieo hạt cho mọi thứ ngẫu nhiên (chớp mắt, khẩu hình, cử chỉ). `null` = trả về `Math.random`. */
  static gieo(hat) { gieoHat(hat); }
  static luuNgau() { return hatHienTai; }
  static traNgau(state) { if (state !== null && hatHienTai !== null) hatHienTai = state; }
  static #dem = 0;
  /** Tên màu công khai → khoá màu nội bộ. `index.js` gán bảng này lúc nạp thư viện. */
  static COLOR_ALIASES = {};
  static NHAN_VAT = { default: NV_MAC_DINH, vet: NV_BAC_SI_THU_Y };
  static dangKy(ten, dinhNghia) { RigSVG.NHAN_VAT[ten] = { ...NV_MAC_DINH, ...dinhNghia }; return RigSVG.NHAN_VAT[ten]; }

  constructor(host, nhanVat = 'default') {
    const nv = typeof nhanVat === 'string' ? RigSVG.NHAN_VAT[nhanVat] : nhanVat;
    if (!nv) throw new Error(`[character] no character "${nhanVat}"`);
    this.host = host;
    this.wearing = new Set();                     // phụ kiện đang đeo (`wear`): khẩu trang, găng tay, mũ phẫu thuật
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
    this.m = freshMark();                 // dấu cảm xúc trên đầu (marks.js) — ngoài `s`: động tác khác không xoá nó
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
    this.#applyWear();                          // dựng lại (đổi màu, đổi dáng) thì phụ kiện đang đeo vẫn đeo
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
    // Ngón xoè: mọc từ mép lòng bàn tay (y 11), dài NGẮN KHÁC NHAU và hơi toả ra — bốn ngón bằng nhau, song song thì
    // bàn tay đọc thành một cái găng hộp.
    const ngon = (x, dai, xoay) =>
      `<rect x="${x}" y="11" width="4.5" height="${dai}" rx="2.25" fill="${da}" transform="rotate(${xoay} ${x + 2.25} 11)"/>`;
    const ke = (x, xoay) => `<path d="M ${x} 16 L ${x} 25" stroke="${toi}" stroke-width="1" stroke-linecap="round" opacity=".45" transform="rotate(${xoay} ${x} 11)"/>`;
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
          <!-- Bàn tay buông, nhìn từ cạnh: MỘT khối thon dần tới các đầu ngón hơi cong vào thân, ngón cái nằm phía trước. -->
          <path d="M -6.5 -3 Q -9.5 6 -8.6 15 Q -9.4 23 -7 28.5 Q -4.6 32.5 -1.6 30.6 Q 0.6 33.4 3.2 30.4 Q 5.8 31 6.8 27 Q 9.4 20 8.6 12 Q 9.4 4 6.5 -3 Q 0 -5 -6.5 -3 Z" fill="${da}"/>
          <path d="M -1.8 30 Q -1.2 26 -1.6 22 M 3 30 Q 3.4 26.5 3 23" stroke="${toi}" stroke-width="1" stroke-linecap="round" fill="none" opacity=".45"/>
          <path d="M -4.6 3 Q -9.6 8 -7.4 17.5" stroke="${da}" stroke-width="5.6" stroke-linecap="round" fill="none"/>
          <path d="M -4.4 12 Q -3.6 15.5 -5.6 18.6" stroke="${toi}" stroke-width="1" stroke-linecap="round" fill="none" opacity=".4"/>
        </g>
        <g data-tay="xoe">
          <!-- Lòng bàn tay hẹp ở cổ tay, rộng dần tới gốc ngón; ngón cái là một khối RIÊNG chĩa chéo ra ngoài. -->
          <path d="M -6.5 -3 Q -10.5 3 -9.6 14 L 9.6 13 Q 10.5 3 6.5 -3 Q 0 -5 -6.5 -3 Z" fill="${da}"/>
          <rect x="-12.2" y="0" width="6.2" height="16" rx="3.1" fill="${da}" transform="rotate(44 -9 3)"/>
          ${ngon(-9.5, 18, -7)}${ngon(-4.7, 20.5, -2.2)}${ngon(0.1, 19, 2.6)}${ngon(4.9, 15, 8)}
          ${ke(-4.9, -4.5)}${ke(-0.1, 0.2)}${ke(4.7, 5.2)}
          <path d="M -8.5 6 Q -3 9.5 3 7" stroke="${toi}" stroke-width="1" stroke-linecap="round" fill="none" opacity=".35"/>
        </g>
        <g data-tay="nam">${nam}</g>
        <g data-tay="cai">
          <!-- Vẽ trong hệ ĐỨNG THẲNG quanh lòng bàn tay (0, 9): apDung xoay cả nhóm cho ngón cái luôn chỉ lên trời.
               Nắm tay nhìn từ phía mu: bốn ngón cuộn là bốn dải NGANG, ngón cái mọc lên từ mép trên, lệch về phía thân. -->
          <rect x="-4.6" y="-13" width="8.6" height="20" rx="4.3" fill="${da}" transform="rotate(-8 -1 2)"/>
          <rect x="-11" y="-1.5" width="22" height="21" rx="7.5" fill="${da}"/>
          <path d="M -1 4 L 9.5 4 M -2 9 L 10 9 M -1 14 L 9.5 14" stroke="${toi}" stroke-width="1" stroke-linecap="round" opacity=".5"/>
          <path d="M -5.2 -1 Q -6 3 -3.4 6" stroke="${toi}" stroke-width="1" stroke-linecap="round" fill="none" opacity=".45"/>
        </g>
        <g data-tay="chi">${nam}
          <rect x="-3.5" y="15" width="7" height="23" rx="3.5" fill="${da}"/>
        </g>
        ${[1, 2, 3].map((count) => `<g data-tay="${['mot', 'hai', 'ba'][count - 1]}">
          <!-- ĐẾM NGÓN: vẽ trong hệ ĐỨNG THẲNG như 'cai' (apDung xoay cho ngón chỉ lên trời). Mỗi ngón có VIỀN MẢNH và xoè
               ra quanh gốc bàn tay — không viền thì hai, ba ngón dính thành một khối. Ngón cái gập ngang lòng bàn tay. -->
          ${[[0], [-11, 11], [-17, 0, 17]][count - 1].map((turn, n) => `<rect x="-2.7" y="${-18 + (turn === 0 && count === 3 ? -1.5 : 0)}" width="5.4" height="24" rx="2.7" fill="${da}" stroke="${toi}" stroke-width=".9" transform="rotate(${turn} 0 7)"/>`).join('')}
          <rect x="-10.5" y="-0.5" width="21" height="20" rx="7.5" fill="${da}"/>
          <path d="M -9 7 Q -1 9.5 7 5.5" stroke="${da}" stroke-width="5.4" stroke-linecap="round" fill="none"/>
          <path d="M -8 10.5 Q -1 12.5 6 9.5" stroke="${toi}" stroke-width="1" stroke-linecap="round" fill="none" opacity=".55"/>
        </g>`).join('')}
        <g data-tay="xuong">
          <!-- NGÓN CÁI CHĨA XUỐNG: đúng hình 'cai' lật ngược quanh lòng bàn tay (apDung giữ nó đứng thẳng như 'cai'). -->
          <g transform="rotate(180 0 9)">
            <rect x="-4.6" y="-13" width="8.6" height="20" rx="4.3" fill="${da}" transform="rotate(-8 -1 2)"/>
            <rect x="-11" y="-1.5" width="22" height="21" rx="7.5" fill="${da}"/>
            <path d="M -1 4 L 9.5 4 M -2 9 L 10 9 M -1 14 L 9.5 14" stroke="${toi}" stroke-width="1" stroke-linecap="round" opacity=".5"/>
          </g>
        </g>
        <g data-tay="tim">
          <!-- BẮN TIM: nắm tay, ngón cái và ngón trỏ bắt chéo ở đỉnh (có viền mảnh cho hai ngón tách nhau), một trái tim
               đỏ bật ra phía trên (độ lớn theo kênh heart). Vẽ đứng thẳng như 'cai'. -->
          <rect x="-10.5" y="-0.5" width="21" height="20" rx="7.5" fill="${da}"/>
          <rect x="-4.5" y="-13" width="5.4" height="17" rx="2.7" fill="${da}" stroke="${toi}" stroke-width=".9" transform="rotate(-24 -2 2)"/>
          <rect x="-1" y="-13.5" width="5.4" height="17" rx="2.7" fill="${da}" stroke="${toi}" stroke-width=".9" transform="rotate(20 1.5 2)"/>
          <path d="M -8 10.5 Q -1 12.5 6 9.5" stroke="${toi}" stroke-width="1" stroke-linecap="round" fill="none" opacity=".55"/>
          <path data-heart="1" d="M 0 -20 C -4 -25 -11 -23 -10 -17.5 C -9 -13 -3 -10 0 -7 C 3 -10 9 -13 10 -17.5 C 11 -23 4 -25 0 -20 Z" fill="#e8425b" stroke="#a5223a" stroke-width="1"/>
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
            <circle cx="0" cy="${g}" r="${dai ? 4.6 : 6}" fill="${daThat}"/>
            ${dai ? `<path d="M -6.6 ${g - 5} Q 0 ${g - 2.5} 6.6 ${g - 5} L 6.2 ${g - 1} Q 0 ${g + 1.5} -6.2 ${g - 1} Z" fill="${da}"/>
            <path d="M -6.6 ${g - 5} Q 0 ${g - 2.5} 6.6 ${g - 5}" stroke="${this.mau.vienNet}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".7"/>` : ''}
          </g>
          <g id="${p}-coTay${ben}" transform="translate(0 ${g})">${this.#tay(ben)}<g id="${p}-item${ben}">${this.nv['heldItem' + ben](p, this.mau, this.nv)}</g>
            <g id="${p}-watch${ben}" style="display:none"><rect x="-10" y="-8" width="20" height="10" rx="3" fill="#3b3f47"/><circle cx="0" cy="-3" r="8.4" fill="#f4f1e8" stroke="#3b3f47" stroke-width="1.8"/><path d="M 0 -3 V -8.6 M 0 -3 H 4.2" stroke="#3b3f47" stroke-width="1.5" stroke-linecap="round"/></g>
            <g id="${p}-tool${ben}" style="display:none"><path d="M 0 10 C ${ben === 'L' ? 14 : -14} 0 ${ben === 'L' ? 4 : -4} -18 ${ben === 'L' ? 12 : -12} -32" fill="none" stroke="#3b3f47" stroke-width="2.6" stroke-linecap="round"/>
              <circle cx="0" cy="12" r="7.5" fill="#c7ccd4" stroke="#3b3f47" stroke-width="1.4"/><circle cx="0" cy="12" r="3.8" fill="#8a929e"/></g>
            <defs>
              <linearGradient id="${p}-beam${ben}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe4" stop-opacity=".9"/><stop offset=".35" stop-color="#fff6c8" stop-opacity=".42"/><stop offset="1" stop-color="#fff2b0" stop-opacity="0"/></linearGradient>
              <radialGradient id="${p}-spot${ben}"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".45" stop-color="#fff6cc" stop-opacity=".5"/><stop offset="1" stop-color="#fff2b0" stop-opacity="0"/></radialGradient>
              <filter id="${p}-soft${ben}" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="1.8"/></filter>
            </defs>
            <g id="${p}-gadget${ben}" style="display:none">
              <!-- LUỒNG SÁNG có thật: sáng ở đầu đèn, tan dần ra xa, mép nhoè; ĐIỂM RỌI sáng trắng ở cuối luồng (Gemini đợt 20: luồng
                   vàng đặc như miếng dán). <circle data-tip> là chỗ điểm rọi — bối cảnh 3D đọc nó để chiếu sáng con vật, và vẽ lại luồng
                   sáng (\`data-beam\`) thành một lớp riêng trên màn hình: trong hình nhân vật nó bị lớp tối của nhân vật phủ xám. -->
              <g data-gadget="1"><path data-beam d="M -3.4 27 L -12 52 Q 0 57 12 52 L 3.4 27 Z" fill="url(#${p}-beam${ben})" filter="url(#${p}-soft${ben})"/>
                <ellipse data-beam cx="0" cy="49" rx="11" ry="7" fill="url(#${p}-spot${ben})" filter="url(#${p}-soft${ben})"/><circle data-tip cx="0" cy="49" r="0.6" fill="none"/><circle data-lens cx="0" cy="27" r="0.6" fill="none"/>
                <rect x="-3" y="2" width="6" height="22" rx="2.5" fill="#3d7fd0" stroke="#24415f" stroke-width="1.1"/><rect x="-3.6" y="21" width="7.2" height="6" rx="1.5" fill="#d9dde3" stroke="#24415f" stroke-width="1"/>
                <ellipse cx="0" cy="27.4" rx="3.4" ry="1.6" fill="#fffbe0"/></g>
              <!-- ĐÈN PIN (\`shine\`): thân đen, đầu loe, luồng sáng dài. -->
              <g data-gadget="5"><path data-beam d="M -6 31 L -40 150 Q 0 166 40 150 L 6 31 Z" fill="url(#${p}-beam${ben})" filter="url(#${p}-soft${ben})"/>
                <ellipse data-beam cx="0" cy="148" rx="30" ry="14" fill="url(#${p}-spot${ben})" filter="url(#${p}-soft${ben})" opacity=".7"/><circle data-tip cx="0" cy="148" r="0.6" fill="none"/><circle data-lens cx="0" cy="31" r="0.6" fill="none"/>
                <rect x="-4.6" y="-2" width="9.2" height="25" rx="3" fill="#2f3440" stroke="#15181e" stroke-width="1.1"/><rect x="-1.6" y="6" width="3.2" height="5" rx="1" fill="#e8553f"/>
                <path d="M -4.6 22 L -7.4 31 H 7.4 L 4.6 22 Z" fill="#555c69" stroke="#15181e" stroke-width="1.1"/><ellipse cx="0" cy="31" rx="7" ry="2.4" fill="#fffbe0"/></g>
              <g data-gadget="2" transform="translate(0 16)"><path d="M -8 -2.6 H 8 M -8 2.6 H 8" stroke="#a5784a" stroke-width="1"/><rect x="-8" y="-2.8" width="16" height="5.6" fill="#ecc893"/>
                <circle cx="-9" cy="-2.6" r="3.2" fill="#ecc893" stroke="#a5784a" stroke-width="1"/><circle cx="-9" cy="2.6" r="3.2" fill="#ecc893" stroke="#a5784a" stroke-width="1"/>
                <circle cx="9" cy="-2.6" r="3.2" fill="#ecc893" stroke="#a5784a" stroke-width="1"/><circle cx="9" cy="2.6" r="3.2" fill="#ecc893" stroke="#a5784a" stroke-width="1"/>
                <rect x="-8" y="-1.6" width="16" height="3.2" fill="#ecc893"/></g>
              <g data-gadget="3" transform="translate(0 19) rotate(30) scale(1.7)"><rect x="-6.5" y="-3.2" width="13" height="6.4" rx="3.2" fill="#ffffff" stroke="#4a5562" stroke-width="1"/>
                <rect x="0" y="-3.2" width="6.5" height="6.4" rx="3.2" fill="#e8553f" stroke="#4a5562" stroke-width="1"/></g>
              <g data-gadget="4"><rect x="-3" y="2" width="6" height="18" rx="3" fill="#a0683a" stroke="#6b4223" stroke-width="1"/>
                <rect x="-9" y="19" width="18" height="9" rx="3" fill="#c98a52" stroke="#6b4223" stroke-width="1"/>
                <path d="M -7 28 v 5 M -3.5 28 v 5 M 0 28 v 5 M 3.5 28 v 5 M 7 28 v 5" stroke="#4a3a2c" stroke-width="1.4" stroke-linecap="round"/></g>
            </g></g>
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
  // CÁNH TAY + VIỀN TÁCH RỜI. Bộ lọc viền đặt thẳng lên nhóm tay thì bọc kín cả NẮP VAI: nắp tay áo nằm đè lên thân
  // áo mà có một vòng nét đen quanh nó, nên nhìn nghiêng (tay gần ở giữa thân) cánh tay như mảnh giấy dán lên áo,
  // chốt vai lộ thành cái núm. Ở đây viền là một bản sao (`use`) chỉ có nét, nằm dưới cánh tay, và bị MẶT NẠ xoá đi
  // trong vùng nắp vai TRÙNG với thân áo — vai và tay áo liền một khối như ảnh mẫu (cách các rig dùng lưới có trọng
  // số làm khớp vai, ở đây làm bằng mặt nạ). Phần nắp thò ra NGOÀI thân áo vẫn có viền, nên đường bao vai không hở.
  #armBody(ben) {
    const p = this.id;
    if (!this.#Vtay()) return this.#canhTay(ben);
    return `<use href="#${p}-arm${ben}" filter="url(#${p}-vienTay)" mask="url(#${p}-capMask${ben})"/><g id="${p}-arm${ben}">${this.#canhTay(ben)}</g>`;
  }

  #dungSVG() {
    const p = this.id, V = this.#V();
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${KHUNG.w} ${KHUNG.h}" width="100%" height="100%" style="display:block;overflow:visible">
  <defs>
    ${this.mau.vien ? `<filter id="${p}-vien" x="-30%" y="-30%" width="160%" height="160%">
    <feMorphology in="SourceAlpha" operator="dilate" radius="${this.nv.vienRong}" result="d"/>
    <feFlood flood-color="${this.mau.vien}" result="c"/><feComposite in="c" in2="d" operator="in" result="o"/>
    <feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : ''}
    ${this.#Vtay() ? `<filter id="${p}-vienTay" x="-30%" y="-30%" width="160%" height="160%">
    <feMorphology in="SourceAlpha" operator="dilate" radius="${this.nv.vienRong}" result="d"/>
    <feFlood flood-color="${this.mau.vien}" result="c"/><feComposite in="c" in2="d" operator="in"/></filter>
    <radialGradient id="${p}-capGrad"><stop offset="0" stop-color="#000"/><stop offset="${CAP_SOLID}" stop-color="#000"/><stop offset="1" stop-color="#fff"/></radialGradient>
    <clipPath id="${p}-thanCat" clipPathUnits="userSpaceOnUse"><use href="#${p}-ao"/><use href="#${p}-vaiL"/><use href="#${p}-vaiR"/></clipPath>
    ${['L', 'R'].map((ben) => `<mask id="${p}-capMask${ben}" maskUnits="userSpaceOnUse" x="-400" y="-500" width="800" height="1000">
      <rect x="-400" y="-500" width="800" height="1000" fill="#fff"/>
      <g id="${p}-capInv${ben}"><circle id="${p}-cap${ben}" r="0" fill="url(#${p}-capGrad)" clip-path="url(#${p}-thanCat)"/></g></mask>`).join('')}` : ''}
    <clipPath id="${p}-momClip"><path id="${p}-momClipP"/></clipPath>
    <style>.${p}-gloved #${p}-tayL [fill="${this.mau.da}"], .${p}-gloved #${p}-tayR [fill="${this.mau.da}"] { fill: #7b9be8; }</style>
    <clipPath id="${p}-vaiCat"><rect id="${p}-vaiCatL" x="-70" y="-150" width="52" height="80"/><rect id="${p}-vaiCatR" x="18" y="-150" width="52" height="80"/></clipPath>
    <clipPath id="${p}-phuKienClip" clipPathUnits="userSpaceOnUse"><rect id="${p}-phuKienRect" x="-400" y="-500" width="800" height="1000"/></clipPath>
    <mask id="${p}-xaMask" maskUnits="userSpaceOnUse" x="-400" y="-500" width="800" height="1000">
      <rect x="-400" y="-500" width="800" height="1000" fill="#fff"/>
      <g id="${p}-xaMaskG" style="filter:brightness(0)"><use href="#${p}-ao"/><use href="#${p}-vaiL"/><use href="#${p}-vaiR"/></g>
    </mask>
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
      <g id="${p}-sau"><g id="${p}-batL">${this.#armBody('L')}</g></g>
      <g${V}>
      <path id="${p}-ao" d="${this.nv.ao(this.mau)}" fill="${this.mau.ao}"/>
      <path id="${p}-vaiL" d="${veDemVai(this.nv, 'L', 0)}" fill="${this.mau.ao}" transform="translate(${-CHOT_VAI.x} ${CHOT_VAI.y})"/>
      <path id="${p}-vaiR" d="${veDemVai(this.nv, 'R', 0)}" fill="${this.mau.ao}" transform="translate(${CHOT_VAI.x} ${CHOT_VAI.y})"/>
      <path id="${p}-mayVaiL" d="${veDuongMayVai(this.nv, 'L', 0)}" fill="none" stroke="${chinhSang(this.mau.ao, -0.45)}" stroke-width="1.5" stroke-linecap="round" opacity=".85" transform="translate(${-CHOT_VAI.x} ${CHOT_VAI.y})"/>
      <path id="${p}-mayVaiR" d="${veDuongMayVai(this.nv, 'R', 0)}" fill="none" stroke="${chinhSang(this.mau.ao, -0.45)}" stroke-width="1.5" stroke-linecap="round" opacity=".85" transform="translate(${CHOT_VAI.x} ${CHOT_VAI.y})"/>
      <path id="${p}-suon" d="${this.nv.suon}" fill="${this.mau.aoToi}" opacity="${this.nv.damSuon}"/>
      </g>
      <g id="${p}-phuKienCat" clip-path="url(#${p}-phuKienClip)">${this.nv.phuKien(p, this.mau, this.nv)}</g>
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
            <g id="${p}-muG">${this.nv.mu(p, this.mau, this.nv)}${this.#veMuMo(p)}</g>
            <g clip-path="url(#${p}-matClip)"><g id="${p}-ma">
            <ellipse id="${p}-maL" cy="${this.nv.maY}" ry="${this.nv.maRong * 0.62}" fill="${this.mau.ma}" opacity=".55"/>
            <ellipse id="${p}-maR" cy="${this.nv.maY}" ry="${this.nv.maRong * 0.62}" fill="${this.mau.ma}" opacity=".55"/>
            </g></g>
            </g>
            <g id="${p}-net">
            ${this.nv.mat(p, 'L', this.mau)}
            ${this.nv.mat(p, 'R', this.mau)}
            <!-- NƯỚC MẮT (biểu cảm khóc): một dòng dưới mỗi mắt và một giọt chảy xuống má theo \`khocY\`. -->
            <g id="${p}-nuocMat" opacity="0">${['L', 'R'].map((b) => { const x = (b === 'L' ? -1 : 1) * this.nv.matX; return `
              <path d="M ${x - 4} ${this.nv.matY + 9} Q ${x} ${this.nv.matY + 12} ${x + 4} ${this.nv.matY + 9}" stroke="#8fd0f0" stroke-width="3" fill="none" stroke-linecap="round"/>
              <path class="giot" d="M ${x} ${this.nv.matY + 12} q -4 6 0 9 q 4 -3 0 -9 z" fill="#8fd0f0" stroke="#5aa9d6" stroke-width=".8"/>`; }).join('')}</g>
            <!-- GIỌT MỒ HÔI ở thái dương (ngượng, bối rối). -->
            <path id="${p}-moHoi" d="M ${this.nv.matX + 22} -40 q -9 13 0 19 q 9 -6 0 -19 z" fill="#bfe6f7" stroke="#5aa9d6" stroke-width="1.4" opacity="0"/>
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
            ${this.#veKhauTrang(p)}
            </g>
          </g>
        </g>
        <!-- xaCang SAU xaTruoc: bàn tay bưng đồ (ở xaCang) phải nằm trên phần cẳng tay ló ra ngoài mép áo của chính nó. -->
        <g id="${p}-xaTruoc" mask="url(#${p}-xaMask)"></g>
        <g id="${p}-xaCang"${this.#Vtay()}></g>
        <!-- Ngăn BẾ THÚ: sau đầu và sau các lớp tay xa, trước tay gần — tay gần ôm đè lên con vật, tay xa nằm sau nó. -->
        <g id="${p}-om"></g>
        <g id="${p}-batR">${this.#armBody('R')}</g>
        <g id="${p}-phuKienTren" clip-path="url(#${p}-vaiCat)">${this.nv.phuKienTren(p, this.mau, this.nv)}</g>
      </g>
    </g>
  </g>
  <!-- DÂY DẮT (leash): ở GỐC SVG, ngoài mọi phép biến đổi — hai đầu dây đo trên màn hình rồi đổi về hệ này. -->
  <path id="${p}-leash" fill="none" stroke="#c0392b" stroke-width="3.2" stroke-linecap="round" style="display:none"/>
  <g id="${p}-note" style="display:none">
    <path d="M -86 -46 H 86 Q 96 -46 96 -36 V 6 Q 96 16 86 16 H 10 L 0 28 L -10 16 H -86 Q -96 16 -96 6 V -36 Q -96 -46 -86 -46 Z" fill="#ffffff" stroke="#c8d3da" stroke-width="1.6"/>
    <rect x="-86" y="-38" width="22" height="22" rx="6" fill="#2f9e8f"/><path d="M -75 -33 q -6 1 -6 8 v 4 h 12 v -4 q 0 -7 -6 -8 z M -77 -19 h 4" stroke="#ffffff" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <text data-note="1" x="-56" y="-27" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#16303a" data-layout-ignore=""></text>
    <text data-note="2" x="-56" y="-10" font-family="Arial, sans-serif" font-size="13" fill="#3b5560" data-layout-ignore=""></text>
  </g>
  <g id="${p}-ball" style="display:none"><circle r="11" fill="#d6e84a" stroke="#7d8a1c" stroke-width="1.5"/>
    <path d="M -10 -3 Q 0 5 10 -3 M -10 4 Q 0 -4 10 4" stroke="#ffffff" stroke-width="1.8" fill="none" opacity=".9"/></g>
</svg>`;
  }

  #layPhanTu() {
    // Nối chuỗi, KHÔNG dùng template literal trong querySelector: bộ lint của HyperFrames
    // (và bộ đóng gói HTML của nó) từ chối selector có biến nội suy.
    const q = (n) => this.svg.querySelector('#' + this.id + '-' + n);
    this.el = {
      goc: q('goc'), bong: q('bong'), chanG: q('chanG'), than: q('than'), ao: q('ao'), tren: q('tren'), sau: q('sau'), sauChan: q('sauChan'), xaTruoc: q('xaTruoc'), xaCang: q('xaCang'), canhL: q('canhL'), canhR: q('canhR'), xaMaskG: q('xaMaskG'), phuKienRect: q('phuKienRect'), dau: q('dau'),
      hongL: q('hongL'), hongR: q('hongR'), tocG: q('tocG'), tocSau: q('tocSau'), tocTruoc: q('tocTruoc'), tocBui: q('tocBui'), coAo: q('coAo'), muG: q('muG'), co: q('co'), coDa: q('coDa'), phuKienTren: q('phuKienTren'), vaiCatL: q('vaiCatL'), vaiCatR: q('vaiCatR'),
      tocLungE: q('tocLungE'), tocLungLow: q('tocLungLow'), lowHairClipR: q('lowHairClipR'), tocGay: q('tocGay'), tocGayP: q('tocGayP'), taiNetL: q('taiNetL'), taiNetR: q('taiNetR'), matClipP: q('matClipP'), phuKien: q('phuKien'), suon: q('suon'), banL: q('banL'), banR: q('banR'), banNgL: q('banNgL'), banNgR: q('banNgR'), net: q('net'), ma: q('ma'), maL: q('maL'), maR: q('maR'), taiL: q('taiL'), taiR: q('taiR'),
      chanL: q('chanL'), chanR: q('chanR'), ongL: q('ongL'), ongR: q('ongR'), skirt: q('skirt'), itemL: q('itemL'), itemR: q('itemR'), toolL: q('toolL'), toolR: q('toolR'), gadgetL: q('gadgetL'), gadgetR: q('gadgetR'), leash: q('leash'), ball: q('ball'), note: q('note'), watchL: q('watchL'), watchR: q('watchR'), om: q('om'),
      batL: q('batL'), batR: q('batR'), cangL: q('cangL'), cangR: q('cangR'),
      vaiL: q('vaiL'), vaiR: q('vaiR'), capL: q('capL'), capR: q('capR'), capInvL: q('capInvL'), capInvR: q('capInvR'), mayVaiL: q('mayVaiL'), mayVaiR: q('mayVaiR'),
      tayAoL: q('tayAoL'), tayAoR: q('tayAoR'), gauTayAoL: q('gauTayAoL'), gauTayAoR: q('gauTayAoR'),
      canhHinhL: q('canhHinhL'), canhHinhR: q('canhHinhR'), cangHinhL: q('cangHinhL'), cangHinhR: q('cangHinhR'),
      coTayL: q('coTayL'), coTayR: q('coTayR'),
      duiHinhL: q('duiHinhL'), duiHinhR: q('duiHinhR'), ongHinhL: q('ongHinhL'), ongHinhR: q('ongHinhR'),
      banChanGL: q('banChanGL'), banChanGR: q('banChanGR'),
      matL: q('matL'), matR: q('matR'), nguoiL: q('nguoiL'), nguoiR: q('nguoiR'),
      mayL: q('mayL'), mayR: q('mayR'), mieng: q('mieng'), rang: q('rang'),
      khuon: q('khuon'), mui: q('mui'), netThem: q('netThem'),
      momG: q('momG'), khauTrang: q('khauTrang'), muMo: q('muMo'), momClipP: q('momClipP'), luoi: q('luoi'),
      moiTren: q('moiTren'), nuocMat: q('nuocMat'), moHoi: q('moHoi'),
      tayG: { L: q('tayL'), R: q('tayR') },
      tay: {
        L: Object.fromEntries([...q('tayL').children].map((g) => [g.dataset.tay, g])),
        R: Object.fromEntries([...q('tayR').children].map((g) => [g.dataset.tay, g])),
      },
    };
    if (this.el.tocSau) this.el.tocSau.style.display = 'none';   // slot kiểu cũ: rig tự sinh tóc sau đầu
    // Dấu cảm xúc: cạnh góc trên bên phải đầu (toạ độ trong nhóm đầu, tâm mặt ở 0, −62) — cao hơn nữa thì ra khỏi khung SVG.
    this.markEl = attachMark(this.el.dau, [70, -128], 1.35);
    this.shadeEl = attachShade(this.svg, this.el.goc);      // đổ bóng trên thân theo hướng sáng (shading.js; bối cảnh 3D đặt)
  }

  /* ------------------------------------------------------ đổ trạng thái */

  apDung() {
    const s = this.s, e = this.el;
    // co dãn quanh điểm chạm đất (200,428) để thu nhỏ = lùi xa, phóng to = tiến gần
    const doiChan = this.hangChan();
    // Ngồi (`seat`) hạ cả người xuống đúng bằng phần đùi rút đi (xem chỗ vẽ chân bên dưới).
    // Tính ngay ở đây chứ không để động tác tween `y`: `y` còn là "nhảy lên" và "lùi ra xa",
    // gộp chung thì bóng đổ tụt theo người xuống dưới bàn chân.
    const seatDrop = this.#lowered();
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
    // Thân dưới cũng xoay: khe giữa hai ống quần dời về phía đang quay tới như khoá kéo phía trên (xem `CHEST_SHIFT`),
    // ít hơn vì hông xoay ít hơn ngực. Không có nó thì khoá kéo lệch một đằng, đường giữa quần đứng nguyên một nẻo.
    const turnDetail = Math.sin(Math.PI * Math.min(1, ah) * 0.9), legShift = Math.sign(h) * turnDetail * 3;
    e.hongL.setAttribute('transform', `translate(${-cachChan * (1 - ah * 0.7) - ah * 3 + legShift} 0)`);
    e.hongR.setAttribute('transform', `translate(${cachChan * (1 - ah * 0.7) + ah * 3 + legShift} 0)`);
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
    // ĐAN TAY ở dáng 3/4. Tay xa gập cẳng tay vào trong (dáng nghỉ đan tay) mà đem giấu hết sau thân thì nhân vật trông
    // như mất một tay. Ngoài đời, nhìn chếch thì BẮP tay xa nằm sau thân — ló ra một dải ở mép sườn xa, khuỷu nhô ở
    // ngang eo — còn CẲNG tay vòng ra TRƯỚC bụng, bàn tay nằm dưới bàn tay gần. Một cánh tay, hai lớp: nhóm cánh tay
    // (còn lại bắp tay) ở lớp sau thân, còn nhóm CẲNG TAY + bàn tay được chuyển sang `xaCang` — một nhóm ở lớp trước
    // thân mang đúng phép biến đổi của cánh tay, nên khuỷu vẫn khớp. (Bản 0.37 ẩn hẳn bắp tay và vẽ một mẩu cẳng tay
    // ngắn trước bụng: với áo dài tay thì thấy rõ là thiếu cả ống tay áo — cụt tay.)
    // CHỈ áp dụng cho TƯ THẾ NGHỈ: `atRest` 1…0 là tay xa còn cách dáng nghỉ của nó bao xa — 1 khi lệch dưới 10° (lúc
    // nói, tay ở nền vẫn nhấn nhịp vài độ: bản 0.37.0 tính mờ dần ngay từ 0° nên suốt câu nói bàn tay xa gần như trong
    // suốt), 0 khi lệch 20°. Một động
    // tác khác cũng gập cẳng tay — giơ ngón cái, đặt tay lên ngực, đưa cốc lên miệng — thì không phải đan tay, và cũng
    // không được đem giấu sau thân. `fold` = `atRest` nếu dáng nghỉ ấy là dáng gập cẳng tay vào trong.
    const restFar = xa ? this.#restArm(xa) : [0, 0];
    const atRest = xa && !(this.holds[xa] && s['item' + xa] > 0.5) && ah < 0.8 ? clamp(2 - Math.max(Math.abs(s['bat' + xa] - restFar[0]), Math.abs(s['cang' + xa] - restFar[1])) / 10, 0, 1) : 0;
    const fold = restFar[1] <= -45 && Math.abs(s['aim' + xa]) < 0.9 ? atRest : 0;
    const clasp = fold >= 0.5 ? xa : null;
    // Tay xa BƯNG ĐỒ ở dáng 3/4: cùng cách chia hai lớp như đan tay. Bản trước vẽ CẢ cánh tay trước thân — bắp tay chạy
    // dọc qua ngực, che nửa bảng tên (thấy rõ ở giây 2 của cảnh đưa cốc, nhất là khi nắp vai đã bỏ viền: thành một dải
    // áo cắt ngang bảng tên). Giờ bắp tay ở lớp `xaTruoc` (mặt nạ thân áo: chỉ phần ló ra ngoài mép áo còn thấy), còn
    // chỉ BÀN TAY + món đồ ở `xaCang`, trước bụng. Cẳng tay cũng ở lớp có mặt nạ: ở dáng 3/4 khuỷu rơi vào giữa thân, đưa
    // cẳng tay ra trước thì nó mọc ra giữa bụng với một đầu khuỷu tròn có viền. Đi ngang hẳn (ah ≥ 0,8) thì như cũ: cả
    // tay sau chân.
    // Mọi lúc tay ấy KHÔNG vươn ra (vươn ra = `aim` ≥ 0,5 với cẳng tay không gập vào — lớp `xaTruoc` nguyên cánh). Bản
    // đầu chỉ xét `aim` < 0,5: lúc bắt đầu đưa cốc, `aim` đã quá 0,5 mà cẳng tay còn gập (dáng bưng), cả cánh tay rơi về
    // lớp trước thân đúng một khung — ống tay vắt qua ngực, che bảng tên.
    const carryFront = xa && !clasp && this.holds[xa] && s['item' + xa] > 0.5 && ah < 0.8 && s['phone' + xa] < 0.5
      && !(Math.abs(s['aim' + xa]) >= 0.5 && s['cang' + xa] > -30) ? xa : null;
    const front = clasp || carryFront;
    for (const ben of ['L', 'R']) {
      // Tay xa đang DIỄN một dáng gập cẳng tay vào trong (giơ ngón cái trước ngực, đặt tay lên ngực) nằm trước thân và ẩn
      // bắp tay: để nguyên thì ống tay áo đè lên ngực áo, như dán lên ngực.
      const acting = ben === xa && Math.abs(s['aim' + ben]) >= 0.9 && s['cang' + ben] <= -30 && !(this.holds[ben] && s['item' + ben] > 0.5);
      e['canhHinh' + ben].style.visibility = acting && ah >= 0.175 ? 'hidden' : '';
      // Cẳng tay của tay đang đan sang lớp trước thân; không thì về lại trong cánh tay của nó.
      const fore = e['cang' + ben], home = ben === clasp ? e.xaCang : e['canh' + ben];
      if (fore.parentNode !== home) home.appendChild(fore);
      const wrist = e['coTay' + ben], wristHome = ben === carryFront ? e.xaCang : fore;
      if (wrist.parentNode !== wristHome) wristHome.appendChild(wrist);
    }
    e.xaCang.style.opacity = clasp && fold < 1 ? ((fold - 0.5) * 2).toFixed(3) : '';       // hai ba khung mờ dần lúc tay rời dáng nghỉ, thay cho biến mất đột ngột
    for (const ben of ['L', 'R']) {
      // Tay xa đang CẦM ĐỒ cũng nằm SAU thân như mọi tay xa. Nó giữ dáng bưng (cẳng tay gập ra trước bụng, xem
      // `carry`), nên bàn tay và món đồ ló ra khỏi mép trước của thân — đúng như nhìn một người bưng cốc đi ngang.
      // (Bản 0.24 để cả cánh tay ấy ở lớp TRÊN thân: cẳng tay vắt ngang qua ngực như mọc ra từ giữa người.) Chỉ
      // không làm TỐI nó đi, để món đồ giữ nguyên màu.
      const carrying = ben === xa && this.holds[ben] && s['item' + ben] > 0.5;
      // …nhưng CHỈ khi đã quay gần hẳn sang ngang (đang đi). Đứng dáng 3/4 thì bàn tay ấy còn nằm sau thân: đẩy cánh
      // tay ra sau là món đồ biến mất — bác sĩ quay về phía khách mà không thấy bìa kẹp đâu.
      // Tay XA nằm sau cả hai CHÂN: để nó sau thân mà trước chân thì bàn tay ló ra giữa hai đùi như một vệt da.
      // Tay xa đang DIỄN (`aim`) thì khác: nó phải thấy được, kể cả khi vươn ngang qua cái đầu to của nhân vật chibi —
      // nhưng ống tay áo không được đè lên ngực áo (bản 0.36.0 vẽ cả cánh tay trước thân: ống tay che ống nghe và bảng
      // tên, như dán lên ngực). Nên nó vào lớp `xaTruoc`: nằm TRÊN đầu, và bị MẶT NẠ hình thân áo che đi phần chồng
      // lên thân — cánh tay ló ra từ sau mép áo. Riêng dáng gập cẳng tay vào trong (đặt tay lên ngực) thì bàn tay
      // phải nằm trước thân, không mặt nạ.
      const aimed = Math.abs(s['aim' + ben]), inward = s['cang' + ben] <= -30;
      const tay = e['bat' + ben];
      // Tay xa đang VƯƠN RA (aim, cẳng tay không gập vào) thì ở lớp `xaTruoc` dù đang cầm đồ: trước đây tay cầm đồ được
      // ưu tiên ở lớp trước thân, nên lúc đưa cốc cho người khác, đúng khung cái cốc rời tay cả cánh tay nhảy sang lớp có
      // mặt nạ — bắp tay biến mất sau thân áo trong một khung (đo được ở 2,9 s của cảnh đưa cốc). Món đồ ở đầu cánh tay
      // vươn ra nằm ngoài thân áo nên mặt nạ không che nó.
      // Đang BẾ con vật: cả hai tay ở lớp `tren` (dưới đây xếp tay xa ra sau con vật nếu quay hẳn 3/4) — để vào lớp sau chân
      // như tay xa thường lệ thì người bế mất hẳn một tay.
      const cho = ben !== xa || s['phone' + ben] >= 0.5 || s.om >= 0.5 ? e.tren : ben === carryFront || (aimed >= 0.5 && !inward) ? e.xaTruoc : (carrying && ah < 0.8) || (aimed >= 0.9 && inward) ? e.tren : e.sauChan;
      if (tay.parentNode !== cho) cho.appendChild(tay);
      // Tay đang HƯỚNG THEO MÀN HÌNH (`aim`) là tay đang diễn: không làm tối, dù nó là tay phía xa.
      const far = ben === (h > 0 ? 'R' : 'L'), mo = far && !carrying ? ah * (1 - clamp(s['aim' + ben], 0, 1)) : 0;
      // Tối đi bằng CSS `filter`. Thuộc tính CSS ĐÈ lên thuộc tính SVG `filter="url(#…-vien)"` của
      // chính phần tử ấy, nên phải nối bộ lọc viền vào trước — không thì tay / chân xa vừa tối đi
      // vừa mất luôn nét viền.
      // Chân xa tối theo mức quay; tay xa thì thôi tối khi nó đang diễn hoặc đang đan vào tay kia trước bụng.
      for (const [limb, dim] of [[e['chan' + ben], far ? ah : 0], [tay, mo]]) {
        const outline = limb.getAttribute('filter');
        limb.style.filter = dim ? `${outline ? outline + ' ' : ''}brightness(${1 - dim * 0.28})` : '';
      }
      // Cẳng tay xa đang đan (ở lớp trước) tối đúng như bắp tay của nó ở lớp sau — và nhờ thế bàn tay xa sẫm hơn bàn
      // tay gần: hai bàn tay cùng màu da chồng lên nhau mà sáng như nhau thì dính thành một khối.
      if (ben === clasp) { const outline = e.xaCang.getAttribute('filter'); e.xaCang.style.filter = `${outline ? outline + ' ' : ''}brightness(${1 - ah * 0.28})`; }
      else if (ben === carryFront) e.xaCang.style.filter = '';          // tay bưng đồ không tối đi (giữ màu món đồ), như khi nó cả cánh ở lớp trước
    }
    // Nhìn thẳng thì cả hai tay nằm trong `tren`, và tay nào vẽ SAU thì đè lên tay
    // kia. Tay đang LÀM ĐỘNG TÁC (giơ, gập nhiều hơn) phải nằm trên: bàn tay ấy là
    // thứ đưa ngang qua ngực, để nó dưới tay áo bên kia thì ngón tay bị áo che mất
    // (nắm tay tán thành, ngón cái chui dưới tay áo trái). Hai tay ngang nhau thì
    // tay phải nằm trên — có ngưỡng 8° để lúc hai tay đan nhau không nhấp nháy.
    if (xa && e['bat' + xa].parentNode === e.tren) e.tren.appendChild(e['bat' + (xa === 'L' ? 'R' : 'L')]);      // tay gần vẫn nằm trên tay xa đang cầm đồ
    if (!xa) {
      const diem = (b) => Math.abs(s['bat' + b]) + Math.abs(s['cang' + b]);
      const tren = diem('L') > diem('R') + 8 ? e.batL : e.batR, duoi = tren === e.batL ? e.batR : e.batL;
      if (duoi.compareDocumentPosition(tren) & Node.DOCUMENT_POSITION_PRECEDING) e.tren.appendChild(tren);
    }
    // Lớp phụ kiện vắt vai luôn nằm TRÊN hai tay (vòng lặp trên vừa `appendChild`
    // tay vào cuối nhóm). Xoay nghiêng thì ẩn: lúc ấy tay gần vung ngang qua ngực
    // và phải che được ống nghe, còn bản dưới thân vẫn hiện.
    // Đang bế ở dáng 3/4: tay XA nằm SAU con vật (ngăn `om` chèn ngay sau nó) — vẽ đè lên thì nó buông chéo qua mặt con vật.
    // Mọi tay KHÔNG phải tay xa thì nằm TRÊN con vật (ôm lấy nó) — kể cả tay vừa là tay xa lúc đang quay về nhìn thẳng.
    // Chỉ coi là tay xa khi quay hẳn 3/4 (> 0,3): trong bối cảnh 3D góc máy bù hướng nhân vật một chút (≈ 0,1), và
    // ngưỡng 0,1 thường lệ đẩy tay trái ra sau con vật — người bế chỉ còn một tay.
    const farHug = ah > 0.3 ? xa : null;
    if (s.om >= 0.5) for (const ben of ['L', 'R']) {
      const arm = e['bat' + ben];
      if (arm.parentNode !== e.tren) continue;
      const before = !!(arm.compareDocumentPosition(e.om) & Node.DOCUMENT_POSITION_FOLLOWING);
      if (ben === farHug && !before) e.tren.insertBefore(arm, e.om);
      else if (ben !== farHug && before) e.tren.insertBefore(arm, e.phuKienTren);
    }
    if (e.tren.lastElementChild !== e.phuKienTren) e.tren.appendChild(e.phuKienTren);
    // Tay vòng ra SAU ĐẦU (gãi gáy): cánh tay ấy vẽ ngay trước nhóm đầu trong `tren` — đầu che bàn tay.
    // Hết gãi gáy thì cánh tay về lại TRƯỚC đầu (trước lớp phụ kiện vắt vai).
    for (const ben of ['L', 'R']) {
      const arm = e['bat' + ben];
      if (arm.parentNode !== e.tren) continue;
      const beforeHead = !!(arm.compareDocumentPosition(e.dau) & Node.DOCUMENT_POSITION_FOLLOWING);
      if (s['sauDau' + ben] >= 0.5 && !beforeHead) e.tren.insertBefore(arm, e.dau);
      else if (s['sauDau' + ben] < 0.5 && beforeHead) e.tren.insertBefore(arm, e.phuKienTren);
    }
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
      e['ma' + ben].setAttribute('rx', nv.maRong * co * (1 - xa * 0.25) * (1 + 0.6 * clamp(s.doMa, 0, 1)));
      e['ma' + ben].setAttribute('ry', nv.maRong * 0.62 * (1 + 0.35 * clamp(s.doMa, 0, 1)));
      e['ma' + ben].setAttribute('opacity', (0.55 + 0.45 * clamp(s.doMa, 0, 1)).toFixed(3));     // ngượng: má đỏ đậm và lan rộng ra
    }
    if (e.nuocMat) {
      e.nuocMat.setAttribute('opacity', clamp(s.khoc, 0, 1).toFixed(3));
      for (const drop of e.nuocMat.querySelectorAll('.giot')) drop.setAttribute('transform', `translate(0 ${(clamp(s.khocY, 0, 1) * 14).toFixed(2)})`);
    }
    if (e.moHoi) e.moHoi.setAttribute('opacity', clamp(s.moHoi, 0, 1).toFixed(3));
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
    // Ngồi thì hai đùi XOÈ ra, ống chân vẫn thẳng đứng: có một chỗ GẬP ở đầu gối để mắt đọc ra dáng ngồi. Chỉ rút
    // ngắn đùi theo chiều dọc thì chân vẫn là một đường thẳng — nhìn như nhân vật lùn đi chứ không phải ngồi xuống.
    const splay = RigSVG.SEAT_SPLAY * clamp(s.seat, 0, 1) * (1 - ah);
    // Đùi xoè thì dài thêm 1/cos để đầu gối vẫn ở đúng độ cao cũ — bàn chân không rời mặt đất.
    // Quỳ: ống chân cũng rút (chĩa về phía người xem) — co thêm sau phép co ngược của đùi.
    const thighSeen = (1 - clamp(s.seat, 0, 1) * 0.72) / Math.cos(splay * RAD), shinFix = ` scale(1 ${((1 - KNEEL_SHIN * clamp(s.kneel || 0, 0, 1)) / thighSeen).toFixed(4)})`;
    e.chanL.setAttribute('transform', `rotate(${s.duiL + s.nhacL * 6 + splay}) scale(1 ${(1 - s.nhacL * 0.42) * thighSeen})`);
    e.chanR.setAttribute('transform', `rotate(${s.duiR - s.nhacR * 6 - splay}) scale(1 ${(1 - s.nhacR * 0.42) * thighSeen})`);
    e.ongL.setAttribute('transform', `translate(0 ${DAI.dui * daiDui})${shinFix} rotate(${s.ongL - splay})`);      // co ngược TRƯỚC rồi mới xoay: xoay trước thì phép co làm ống chân xiên đi
    e.ongR.setAttribute('transform', `translate(0 ${DAI.dui * daiDui})${shinFix} rotate(${s.ongR + splay})`);      // co ngược TRƯỚC rồi mới xoay: xoay trước thì phép co làm ống chân xiên đi

    // ── VÁY / TẠP DỀ: một tứ giác từ eo xuống gấu, hai góc gấu BÁM theo hai đùi.
    if (e.skirt) {
      const K = this.nv.skirt, thigh = DAI.dui * daiDui, halfLeg = 13 * dayChan, flare = K.flare ?? 4;
      const reach = (K.length ?? 1) * thigh;                     // gấu cách hông bao xa, đo dọc theo chân
      // Điểm trên chân `side` ở cách hông `reach`, lệch ngang `offset` so với trục chân — trong
      // hệ toạ độ nhóm chân. Quá gối thì đi tiếp theo hướng ống chân.
      const along = (side, offset) => {
        const hipX = (side === 'L' ? -1 : 1) * (cachChan * (1 - ah * 0.7) + ah * 3) + legShift;
        const a = (s['dui' + side] + (side === 'L' ? 1 : -1) * (s['nhac' + side] * 6 + splay)) * RAD;
        const squash = (1 - s['nhac' + side] * 0.42) * thighSeen;                // đùi rút ngắn khi nhấc gối / khi ngồi
        const onThigh = Math.min(reach, thigh) * squash, past = Math.max(0, reach - thigh);
        const b = a + (s['ong' + side] - (side === 'L' ? 1 : -1) * splay) * RAD;
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
    // CHI TIẾT NGỰC XOAY THEO THÂN. Thân áo chỉ hẹp lại khi xoay; nếu túi, khoá kéo, ống nghe hẹp theo đúng như thế thì
    // thân ở dáng 3/4 đọc thành một thân chính diện bị ép dẹp. Trên một khối trụ, đường giữa ngực dời về phía đang
    // quay tới: dịch cả lớp chi tiết `CHEST_SHIFT` đơn vị mỗi đơn vị `huong` và ép thêm một chút; phần trôi ra ngoài
    // mép thân bên xa bị cắt (ô cắt chỉ giới hạn bề NGANG — yếm, dây đeo vẫn được vượt lên cổ và xuống dưới gấu).
    const CHEST_SHIFT = 7.2;     // về 0 khi nghiêng hẳn: lúc ấy `ah * 0.4` đã ép chi tiết lại, dịch nữa là trôi khỏi thân
    const scaleAo = (1 + s.tho * 0.03) * (1 - ah * 0.4);
    if (e.phuKien) e.phuKien.setAttribute('transform', `translate(${h * 2 + Math.sign(h) * turnDetail * CHEST_SHIFT} ${nhacY}) scale(${scaleAo * (1 - 0.1 * turnDetail)} 1)`);
    if (e.phuKienRect) {
      // Bề rộng áo đo MỘT LẦN cho mỗi lần dựng SVG (`e` được tạo lại khi dựng lại, nên số đo cũ tự mất) — và CHỈ nhớ khi
      // đo được: host đang `display: none` thì `getBBox()` trả về toàn 0; nhớ số 0 ấy là từ đó hễ xoay người là mọi chi
      // tiết ngực bị cắt sạch. Chưa đo được thì khỏi cắt.
      if (!e.aoBox) { const box = e.ao.getBBox(); if (box.width > 0) e.aoBox = box; }
      const half = ah > 0.02 && e.aoBox ? Math.max(Math.abs(e.aoBox.x), Math.abs(e.aoBox.x + e.aoBox.width)) * scaleAo : 400;
      e.phuKienRect.setAttribute('x', (h * 2 - half).toFixed(2)); e.phuKienRect.setAttribute('width', (half * 2).toFixed(2));
    }
    // Cùng biến đổi với thân áo, trừ phần nhấc vai (nhóm `tren` đã mang sẵn). Cắt
    // ở gấu TRONG của tay áo — chỗ dây ống nghe chui ra khỏi nắp tay áo. Hai ô
    // cắt chừa lại dải giữa (|x| < 18): ở đó là cổ áo, và dây phải chui DƯỚI cổ áo.
    e.phuKienTren.setAttribute('transform', `translate(${h * 2} 0) scale(${(1 + s.tho * 0.03) * (1 - ah * 0.4)} 1)`);
    const caoCat = 150 + CHOT_VAI.y + (24 * this.nv.daiTayAo - this.nv.xeoTayAo) * this.nv.daiCanhTay + 2;
    e.vaiCatL.setAttribute('height', caoCat);
    e.vaiCatR.setAttribute('height', caoCat);
    e.tren.setAttribute('transform', `translate(0 ${nhacY})`);
    e.sau.setAttribute('transform', `translate(0 ${nhacY})`);
    e.xaMaskG.setAttribute('transform', `translate(0 ${-nhacY})`);            // mặt nạ nằm trong hệ của `tren` (đã nhấc `nhacY`), thân áo thì không
    e.sauChan.setAttribute('transform', `${e.than.getAttribute('transform')} translate(0 ${nhacY})`);        // lớp tay xa nằm ngoài nhóm thân nên phải mang theo phép biến đổi của thân
    e.coAo.setAttribute('transform', `translate(${h * 3 + Math.sign(h) * turnDetail * CHEST_SHIFT * 0.5} 0) scale(${1 - ah * 0.45} 1)`);   // cổ áo hẹp theo thân, lệch về phía ngực
    // CỔ cũng phải hẹp lại khi xoay — nhưng không đều: thân cổ chỉ thon đi một chút
    // (cổ người nhìn nghiêng gần bằng nhìn thẳng), còn phần CHÂN CỔ loe ra hai vai
    // thì phải thu mạnh, vì hai vai đã dồn về một đường. Để nguyên thì chân cổ rộng
    // ±20 thò ra ngoài bờ vai đã hẹp còn ±12, và hai đầu nét cổ áo lơ lửng trên da.
    const coHep = 1 - ah * 0.2, chanCo = 20 * (1 - ah * 0.5) / coHep, eoCo = 15 - ah * 4;
    e.co.setAttribute('transform', `translate(${h * 3} 0) scale(${coHep} 1)`);
    e.coDa.setAttribute('d', `M -13 -130 L 13 -130 L 13.5 -106 Q ${eoCo} -100 ${chanCo} -96 L ${-chanCo} -96 Q ${-eoCo} -100 -13.5 -106 Z`);
    // Còng lưng: đầu chúi xuống giữa hai vai (cổ ngắn lại) và nhô ra trước khi quay nghiêng.
    // Đang áp điện thoại: đầu nghiêng về phía nó (cộng thêm, không ghi vào `dau` — các cử chỉ lúc nói vẫn lắc đầu được).
    const onPhone = clamp(s.phoneR, 0, 1) - clamp(s.phoneL, 0, 1);
    e.dau.setAttribute('transform', `translate(${s.dauX + onPhone * CALL_TILT * 0.4 + h * (2.5 + stoop * 7)} ${-103 + this.nv.dauLech + s.dauY + stoop * 9}) rotate(${s.dau + onPhone * CALL_TILT}) scale(${this.nv.coDau / wide} ${this.nv.coDau})`);
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
    // TAY GẦN THẢ XUÔI khi TAY XA đang bưng đồ ở dáng 3/4. Dáng nghỉ khoanh tay trước bụng (bác sĩ thú y) chỉ đọc được
    // khi hai bàn tay gặp nhau; tay xa đang bưng cốc thì bàn tay gần lơ lửng giữa ngực, cả ống tay áo vắt chéo ngang
    // áo khoác như dán lên đó. Pha dần sang dáng buông theo mức quay (0,1 → 0,25), chỉ khi tay gần ĐANG NGHỈ — tay gần
    // đang diễn (chỉ, vẫy, giơ ngón cái) thì để nguyên.
    const near = xa === 'R' ? 'L' : xa === 'L' ? 'R' : null, restNearArm = near ? this.#restArm(near) : null;
    // Cũng vậy khi tay xa KHÔNG khoanh ở dáng nghỉ (đã trao món đồ đi: tay ấy về dáng buông) — một bàn tay gần một mình
    // giữa ngực, không có bàn tay kia để đan vào.
    const farFolded = xa && !(this.holds[xa] && s['item' + xa] > 0.5) && this.#restArm(xa)[1] <= -45;
    const hangNear = near && !farFolded && !(this.holds[near] && s['item' + near] > 0.5) && restNearArm[1] <= -45
      // Nhả DẦN trong 10°…60° lệch khỏi dáng nghỉ (không phải 10…20°): bước đi bắt đầu từ dáng nghỉ, cánh tay rời nó từ
      // từ — nhả gắt thì ở những khung đầu của bước đi cánh tay bật từ dáng buông về nửa dáng khoanh, gập ngang bụng.
      ? clamp((ah - 0.1) / 0.15, 0, 1) * clamp(1 - (Math.max(Math.abs(s['bat' + near] - restNearArm[0]), Math.abs(s['cang' + near] - restNearArm[1])) - 10) / 50, 0, 1) : 0;
    const armAngle = (side, key) => s[key + side] + (side === near && hangNear ? ((key === 'bat' ? NGHI.batL : NGHI.cangL) - s[key + side]) * hangNear : 0);
    const tL = tayTheoSau(armAngle('L', 'bat'), armAngle('L', 'cang'), s.vungL), tR = tayTheoSau(armAngle('R', 'bat'), armAngle('R', 'cang'), s.vungR);
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
    const nL = tayNghieng(armAngle('L', 'cang'), s.vungL), nR = tayNghieng(armAngle('R', 'cang'), s.vungR);
    // Tay đang CẦM ĐỒ thì nhìn nghiêng vẫn gập cẳng tay ngang trước bụng (bưng đồ). Nhân vật nghỉ ở dáng gập hờ thì
    // công thức trên chỉ gập ~50°: vừa quay người là cái cốc tụt từ ngang bụng xuống ngang hông trong hai khung hình.
    // Chỉ khi tay ấy đang Ở DÁNG CẦM: tay đang diễn (nâng cốc lên uống, vươn ra đưa đồ) mà vẫn bị ép về dáng bưng thì
    // cái cốc ở lại ngang bụng trong khi cánh tay đã lên tới cằm.
    // …và BẮP TAY đưa ra trước ~26°: để bắp tay thẳng đứng sau thân thì khuỷu nằm khuất sau ngực, chỉ còn một mẩu cẳng tay
    // nằm ngang thò ra từ giữa ngực — đọc thành cánh tay mọc ra từ ngực (Gemini chỉ ra trên cảnh đi ngang cầm cốc). Cẳng
    // tay gập bớt tương ứng để cái cốc vẫn ở chừng ngang bụng.
    for (const [side, arm] of [['L', nL], ['R', nR]]) if (this.holds[side] && s['item' + side] > 0.5) {
      // Chỉ khi đã quay gần hẳn sang ngang (0,55 → 0,85): ở dáng 3/4 bắp tay đưa ra trước thành khuỷu bạnh ra ngoài hông,
      // như chống nạnh cầm cốc.
      const carry = clamp(s['carry' + side], 0, 1), profile = carry * clamp((ah - 0.55) / 0.3, 0, 1);
      arm.bat += (Math.max(arm.bat, 26) - arm.bat) * profile;
      arm.cang += (Math.max(arm.cang, 86 - 24 * profile) - arm.cang) * carry;
    }
    // Bờ vai chỉ nhấc theo phần giơ tay CÒN THẤY trong mặt phẳng trán (× cos ψ):
    // nhìn nghiêng thì tay đánh trước–sau, không có gì đẩy vai lên.
    const gocVai = { L: GOC_VAI_MAX * mem((Math.abs(tL.bat) * cF - 40) / 110), R: GOC_VAI_MAX * mem((Math.abs(tR.bat) * cF - 40) / 110) };
    const ghep = { L: mem((Math.abs(tL.bat) * cF - 15) / 50), R: mem((Math.abs(tR.bat) * cF - 15) / 50) };
    // Độ lệch thêm theo `ah`, KHÔNG theo `h`: nó tách hai vai (và hai hông ở trên) ra
    // một chút cho khỏi chồng khít lên nhau, quay bên nào cũng phải tách như nhau. Viết
    // theo `h` thì quay trái là hai vai chập lại — dáng đi sang trái không còn là ảnh
    // gương của dáng đi sang phải (lệch đo được 4–6 đơn vị).
    const chotX = { L: -CHOT_VAI.x * (1 - ah * 0.92) - ah * 2, R: CHOT_VAI.x * (1 - ah * 0.92) + ah * 2 };
    // Vai GẦN đi theo cos của góc quay chứ không co tuyến tính: ở dáng 3/4 công thức tuyến tính đặt nó cách mép thân tới
    // 10 đơn vị vào trong, cả cánh tay gần nằm đè lên ngực — che túi ngực, che nửa mặt ống nghe. Theo cos thì vai gần
    // còn ở sát mép thân như lúc nhìn thẳng; quay hẳn sang ngang (ah = 1) hai công thức trùng nhau.
    if (ah > 0) chotX[h > 0 ? 'L' : 'R'] = (h > 0 ? -1 : 1) * (CHOT_VAI.x * (0.08 + 0.92 * Math.cos(ah * Math.PI / 2)) + ah * 2);
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
    // GÓC CÁNH TAY. Mặc định là PHA TRỘN: tư thế mặt trước × cos ψ + tư thế nhìn nghiêng × sin ψ — đúng cho tay buông,
    // tay đánh khi đi, tay đan trước bụng. Nhưng một CỬ CHỈ hướng tới một thứ trên màn hình (chỉ, đưa đồ, vẫy về phía
    // ai đó) mà đem pha như thế thì ở dáng 3/4 chỉ còn hai phần ba biên độ, lại bị tư thế nghiêng kéo lệch. Kênh
    // `aimL/R` (0…1) chuyển tay ấy sang đọc `bat`/`cang` như góc TRÊN MÀN HÌNH, không pha — động tác tự tính góc cho
    // đúng hướng nhìn hiện tại rồi bật kênh này lên.
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
    // KHUỶU KHÔNG BAO GIỜ THẲNG ĐUỘT khi tay giơ lên. Chỉ tay, đưa đồ, dang tay giới thiệu đặt cẳng tay thẳng hàng với
    // bắp tay: cả cánh tay thành một cái ống thước kẻ. Tay giơ quá 40° thì cẳng tay gập thêm tối thiểu `MIN_ELBOW`
    // về phía đang giơ, và bắp tay lùi lại gần nửa góc ấy để bàn tay vẫn ở gần chỗ cũ (đích chỉ không lệch đáng kể).
    // Tay buông không đụng tới: tay thõng thẳng là tự nhiên, và dáng nghỉ của từng nhân vật đã dò sẵn.
    const MIN_ELBOW = 9;
    for (const side of ['L', 'R']) {
      const upper = rotation['bat' + side], dir = Math.sign(upper) || 1, bend = rotation['cang' + side] * dir;
      const raised = clamp((Math.abs(upper) - 40) / 25, 0, 1);
      // Phần gập thêm là một hàm LIÊN TỤC của độ gập sẵn có: đủ `MIN_ELBOW` khi cẳng tay thẳng hàng, giảm đều về 0 khi nó
      // đã gập `2 × MIN_ELBOW` về BẤT KỲ phía nào. Bản 0.38.2 bù cho đủ 9° hễ độ gập nằm trong ±9°: cẳng tay đang gập
      // ngược −9° nhích thêm một chút là nhảy sang +9° — 18° trong một khung hình, thấy rõ lúc tay rút về sau khi chỉ.
      const add = MIN_ELBOW * raised * Math.max(0, 1 - Math.abs(bend) / (2 * MIN_ELBOW));
      if (!add) continue;
      rotation['cang' + side] += dir * add;
      rotation['bat' + side] -= dir * add * 0.45;
    }
    // Tay XA đang gập cẳng tay vào trong (dáng nghỉ đan tay trước bụng) mà không diễn: cẳng tay và bàn tay đã khuất sau
    // thân, chỉ còn BẮP TAY ló ra ngoài mép áo như một mẩu da cụt bên eo — rõ nhất ở mức quay 0,3–0,45. Cho cả cánh
    // tay ấy buông thẳng, hơi khép vào, nằm gọn sau thân và chân. (Tay xa đang cầm đồ thì không: món đồ phải ló ra.)
    const shrink = { L: 1, R: 1 };
    const pivot = { L: { x: chotX.L + doiChot.L.x, y: CHOT_VAI.y + doiChot.L.y }, R: { x: chotX.R + doiChot.R.x, y: CHOT_VAI.y + doiChot.R.y } };
    if (clasp) {
      // Cổ tay của tay GẦN đang ở đâu (động học thuận: mỗi đốt vẽ dọc trục +y, xoay θ thì đầu mút ở (−L·sin θ, L·cos θ)).
      const near = clasp === 'L' ? 'R' : 'L', out = clasp === 'R' ? 1 : -1, RAD_ = Math.PI / 180;
      const upper = DAI.canhTay * daiCanhTay, fore = DAI.cangTay * daiCangTay;
      // …lấy ở DÁNG NGHỈ của nó, không phải dáng hiện tại: tay gần đang giơ ngón cái hay đặt lên ngực thì bàn tay xa
      // vẫn ở yên trước bụng, không bám theo.
      const restNear = this.#restArm(near), front = tayTheoSau(restNear[0], restNear[1], 0), side = tayNghieng(restNear[1], 0), sign = near === 'L' ? 1 : -1;
      const restUpper = sign * front.bat * cF - sF * side.bat, restFore = sign * front.cang * cF - sF * side.cang;
      const a0 = restUpper * RAD_, b0 = (restUpper + restFore) * RAD_;
      const wrist = { x: pivot[near].x - upper * Math.sin(a0) - fore * Math.sin(b0), y: pivot[near].y + upper * Math.cos(a0) + fore * Math.cos(b0) };
      // Cổ tay của tay XA: cạnh cổ tay kia, lệch về phía xa và thấp hơn một chút — hai bàn tay chồng lên nhau một nửa.
      // …cách cổ tay kia chừng một bàn tay về phía xa: hai bàn tay gặp nhau ở giữa bụng, bàn tay gần úp lên bàn tay xa,
      // còn cổ tay và cửa tay áo của tay xa thì lộ ra ở phía xa. (Đặt hai cổ tay sát nhau thì bàn tay xa trượt hết sang
      // dưới cẳng tay gần, chỉ còn mấy đầu ngón thò ra ở tận bên kia.)
      const target = { x: wrist.x + out * 12 * coBanTay, y: wrist.y + 4 };
      // Hai đốt, đủ chiều dài, từ VAI THẬT tới cổ tay ấy; khuỷu bẻ ra phía xa (ngoài mép sườn). Góc α ở vai theo định lý
      // cos; hướng vai → cổ tay là φ (0° = thẳng xuống, cùng quy ước với phép xoay của đốt tay).
      // Vai xa đang đan tay dịch ra ngoài 6 đơn vị (vào dần theo `ease`): cho ống tay áo của bắp tay ló rõ sau mép sườn —
      // ló ít quá thì khuỷu trông như mọc ngang ra từ eo.
      const ease = clamp((ah - 0.1) / 0.15, 0, 1);
      pivot[clasp].x += out * 6 * ease;
      const from = pivot[clasp], gap = clamp(Math.hypot(target.x - from.x, target.y - from.y), Math.abs(upper - fore) + 1, upper + fore - 1);
      const toward = Math.atan2(-(target.x - from.x), target.y - from.y), open = Math.acos(clamp((upper * upper + gap * gap - fore * fore) / (2 * upper * gap), -1, 1));
      const lift = toward - out * open;                                             // góc bắp tay (rad)
      const elbow = { x: from.x - upper * Math.sin(lift), y: from.y + upper * Math.cos(lift) };
      const bend = Math.atan2(-(target.x - elbow.x), target.y - elbow.y) - lift;      // góc cẳng tay so với bắp tay
      // Vào dần trong lúc quay người (0,1 → 0,25), để nối liền với dáng nhìn thẳng.
      rotation['bat' + clasp] += (lift / RAD_ - rotation['bat' + clasp]) * ease;
      rotation['cang' + clasp] += (chuanHoaGoc(bend / RAD_) - rotation['cang' + clasp]) * ease;
    } else if (xa && !(this.holds[xa] && s['item' + xa] > 0.5) && s.om < 0.5) {
      const pose = xa === 'L' ? tL : tR, inward = xa === 'L' ? -1 : 1;
      // Mức khép chỉ theo ĐỘ GẬP của cẳng tay, không mờ dần theo `aim`: lúc tay rời dáng nghỉ để diễn, `aim` lên trước
      // khi cẳng tay kịp mở ra — mờ theo `aim` là mẩu bắp tay lại ló ra bên eo trong vài khung. Tay ở yên sau thân cho
      // tới khi cẳng tay mở quá −75°…−45°, rồi mới vươn ra từ sau mép áo. (Dáng đặt tay lên ngực, `aim` đủ 0,9: thôi khép.)
      // Khép hết khi cẳng tay gập quá 45°, nhả dần cho tới khi cẳng tay duỗi thẳng (0°): ở mốc ấy tay khép và tay thật
      // trùng nhau, nên cẳng tay đi một mạch từ sau thân ra ngoài. (Bản 0.36.4 nhả trong khoảng −75°…−45°: cẳng tay đang
      // duỗi 0° bị kéo ngược về −45° rồi mới mở ra — bàn tay hạ, hất lên, lại tụt xuống trong ba khung liền.) Đi ngang
      // (quay gần hết cỡ) thì thôi: tay đánh theo bước chân.
      const tuck = clamp(ah / 0.2, 0, 1) * clamp((0.9 - ah) / 0.2, 0, 1) * clamp(-pose.cang / 45, 0, 1) * (Math.abs(s['aim' + xa]) >= 0.9 ? 0 : 1)
        * (Math.abs(s['aim' + xa]) > 0.02 ? 1 : atRest);          // chỉ giấu tay đang NGHỈ, hoặc đang rời dáng nghỉ để diễn một cử chỉ `aim` — không giấu tay đang giơ ngón cái
      shrink[xa] = 1 - 0.35 * tuck;               // …và ngắn lại (như đang đưa ra sau), kẻo bàn tay thò xuống dưới gấu áo cạnh đùi
      rotation['bat' + xa] += (inward * 12 * clamp(1 - ah * 1.3, 0, 1) - rotation['bat' + xa]) * tuck;      // quay càng nhiều thân càng hẹp: khép ít lại, kẻo bàn tay lòi ra phía sau lưng
      rotation['cang' + xa] += (0 - rotation['cang' + xa]) * tuck;                // …và duỗi cẳng tay theo, không thì bàn tay văng ra phía sau lưng
    }
    // THẾ ÁP ĐIỆN THOẠI: tay ấy kéo về dáng áp má, theo góc TRÊN MÀN HÌNH (như `aim`) — mọi động tác khác (cử chỉ lúc
    // nói, gật đầu) vẫn chạy, chỉ tay cầm máy là đứng yên ở má.
    // ĐẶT GÓC CUỐI (`ov`): cử chỉ cần đúng một dáng tay trên màn hình (ôm mặt, gãi gáy) đặt ở đây, SAU mọi quy tắc chỉnh
    // khuỷu ở trên — đặt qua `bat`/`cang` thì các quy tắc ấy kéo cẳng tay duỗi ra, dáng lệch hẳn.
    for (const [side, sign] of [['L', 1], ['R', -1]]) {
      const w = clamp(s['ov' + side], 0, 1);
      if (!w) continue;
      rotation['bat' + side] += (sign * s['ovBat' + side] - rotation['bat' + side]) * w;
      rotation['cang' + side] += (sign * s['ovCang' + side] - rotation['cang' + side]) * w;
    }
    for (const [side, sign] of [['L', 1], ['R', -1]]) {
      const phone = clamp(s['phone' + side], 0, 1);
      if (!phone) continue;
      rotation['bat' + side] += (sign * CALL_POSE[0] - rotation['bat' + side]) * phone;
      rotation['cang' + side] += (sign * CALL_POSE[1] - rotation['cang' + side]) * phone;
    }
    // THẾ BẾ: hai tay về dáng ôm trước bụng theo độ nhấc con vật lên (`omRise`) — lúc nhấc, tay đi từ dáng cúi xuống
    // đỡ con vật lên tới dáng ôm; trong lúc bế, cử chỉ khi nói không kéo tay ra khỏi con vật.
    // Đang trao (`omGive`): hai tay rời dáng ôm, vươn theo con vật ra điểm giữa hai người (góc do `#offerArms` đặt).
    const cradle = clamp(s.omRise, 0, 1) * (1 - clamp(s.omGive || 0, 0, 1));
    if (cradle) for (const [side, sign] of [['L', 1], ['R', -1]]) {
      rotation['bat' + side] += (sign * CRADLE[0] - rotation['bat' + side]) * cradle;
      rotation['cang' + side] += (sign * CRADLE[1] - rotation['cang' + side]) * cradle;
    }
    e.batL.setAttribute('transform', `translate(${pivot.L.x} ${pivot.L.y}) rotate(${rotation.batL}) scale(1 ${(1 - (1 - tL.co) * cF) * shrink.L})`);
    e.batR.setAttribute('transform', `translate(${pivot.R.x} ${pivot.R.y}) rotate(${rotation.batR}) scale(1 ${(1 - (1 - tR.co) * cF) * shrink.R})`);

    // Vùng xoá viền ở nắp vai (xem `#armBody`). Mặt nạ nằm trong hệ toạ độ CỦA CÁNH TAY (đã xoay, đã co), còn thân áo
    // thì ở hệ `than`: nhóm nội dung mặt nạ mang phép biến đổi NGƯỢC của cánh tay, cộng độ nhấc `nhacY` nếu tay đang ở
    // lớp `tren`. Tay sau chân (`sauChan`) nằm ngoài hệ `than` và khuất sau thân rồi: không xoá gì.
    for (const ben of ['L', 'R']) {
      const cap = e['cap' + ben];
      if (!cap) continue;
      const parent = e['bat' + ben].parentNode, lift = parent === e.tren || parent === e.xaTruoc ? nhacY : 0;
      const sy = Math.max(0.05, (1 - (1 - (ben === 'L' ? tL : tR).co) * cF) * shrink[ben]);
      e['capInv' + ben].setAttribute('transform', `scale(1 ${1 / sy}) rotate(${-rotation['bat' + ben]}) translate(${-pivot[ben].x} ${-pivot[ben].y - lift})`);
      cap.setAttribute('cx', pivot[ben].x); cap.setAttribute('cy', pivot[ben].y + lift + CAP_DROP * daiCanhTay);
      cap.setAttribute('r', parent === e.sauChan ? 0 : CAP_RADIUS * dayTay);
    }
    e.cangL.setAttribute('transform', `translate(0 ${DAI.canhTay * daiCanhTay}) rotate(${rotation.cangL})`);
    e.cangR.setAttribute('transform', `translate(0 ${DAI.canhTay * daiCanhTay}) rotate(${rotation.cangR})`);
    // Cẳng tay (đan tay) hay bàn tay (bưng đồ) ở lớp trước đi theo đúng cánh tay của nó — bàn tay thì cộng thêm phép
    // biến đổi của cẳng tay.
    if (front) e.xaCang.setAttribute('transform', e['bat' + front].getAttribute('transform') + (front === carryFront ? ' ' + e['cang' + front].getAttribute('transform') : ''));
    this.#placeCarried();
    // ĐỒ CẦM LUÔN ĐỨNG THẲNG. Đồ vật vẽ trong hệ cổ tay, đúng chiều khi cẳng tay nằm NGANG trước bụng (dáng bưng đồ:
    // bắp + cẳng ≈ ±90°). Cánh tay lệch khỏi dáng ấy bao nhiêu — nghỉ ở dáng gập hờ, hay quay nghiêng người khiến
    // cẳng tay gập ra trước — thì cái cốc nghiêng theo bấy nhiêu, có lúc nằm ngang. Xoay ngược nó lại quanh LÒNG BÀN
    // TAY (0, 10) để nó vẫn nằm trong tay.
    const armTurn = { L: rotation.batL + rotation.cangL, R: rotation.batR + rotation.cangR };
    // Mặt ống nghe trong tay (`listen`): hiện / ẩn hẳn theo `tool`, không hoà mờ.
    for (const side of ['L', 'R']) if (e['tool' + side]) e['tool' + side].style.display = s['tool' + side] >= 0.5 ? '' : 'none';
    for (const side of ['L', 'R']) if (e['watch' + side]) e['watch' + side].style.display = s['watch' + side] >= 0.5 ? '' : 'none';
    // Dụng cụ nhỏ trong tay (`gadget`): số nguyên chọn MỘT hình con (`data-gadget`), 0 = không có gì.
    for (const side of ['L', 'R']) {
      const box = e['gadget' + side], kind = Math.round(s['gadget' + side]);
      if (!box) continue;
      box.style.display = kind > 0 ? '' : 'none';
      for (const child of box.children) child.style.display = +child.getAttribute('data-gadget') === kind ? '' : 'none';
    }
    const gripping = { L: false, R: false };
    for (const side of ['L', 'R']) if (this.holds[side]) {
      // Mốc là −90° cho CẢ HAI tay: hình tay trái được soi gương sẵn bên trong, còn hình tay phải vẽ nguyên — ở dáng
      // bưng đồ của tay phải (+90°) nắp cốc chúc XUỐNG. Trước bản này cốc của người cầm tay phải luôn lộn ngược.
      const upright = chuanHoaGoc(-90 - armTurn[side] - s.than);
      // `itemTilt` nghiêng món đồ về phía mặt và NHẤC nó lên một chút trong lòng bàn tay (0,6 đơn vị mỗi độ): tay nhân
      // vật ngắn, bàn tay chỉ lên tới ngực trên — không nhấc thì miệng cốc không tới được môi.
      const phone = clamp(s['phone' + side], 0, 1);
      const tilt = s['itemTilt' + side] + CALL_POSE[2] * phone;
      const itemTurn = upright + (side === 'L' ? 1 : -1) * tilt;
      const zoom = Math.max(0.05, s['itemZoom' + side] + (CALL_POSE[3] - 1) * phone);
      // Chỉ CỐC mới được nhấc lên khi nghiêng (cho miệng cốc tới môi). Ống tiêm nghiêng mũi kim mà bị nhấc thì nó rời hẳn
      // khỏi bàn tay, lơ lửng cạnh nắm tay.
      const lift = e['item' + side].querySelector('[data-syringe]') ? 0 : tilt * 0.6;
      e['item' + side].setAttribute('transform', `rotate(${itemTurn.toFixed(2)} 0 10) translate(0 ${(-lift).toFixed(2)})` + (zoom !== 1 ? ` translate(0 10) scale(${zoom.toFixed(3)}) translate(0 -10)` : ''));
      // Mặt LƯNG của món đồ (`data-back`) hiện theo `itemBack`, mặt trước (`data-front`) ẩn đi tương ứng — đổi hẳn ở nửa
      // chừng, không hoà mờ (hai mặt chồng mờ lên nhau là một vệt xám).
      const back = s['itemBack' + side] >= 0.5 || phone >= 0.5;
      // Pít-tông ống tiêm (`data-plunger`) trượt vào thân ống theo `plunger` (0…1) — đơn vị trong hệ của món đồ.
      const plunger = e['item' + side].querySelector('[data-plunger]');
      if (plunger) plunger.setAttribute('transform', `translate(0 ${(clamp(s['plunger' + side], 0, 1) * +(plunger.dataset.plunger || 10)).toFixed(2)})`);
      for (const face of e['item' + side].querySelectorAll('[data-back]')) face.style.display = back ? '' : 'none';
      for (const face of e['item' + side].querySelectorAll('[data-front]')) face.style.display = back ? 'none' : '';
      // Các ngón ôm món đồ (`data-grip`) vẽ trong hệ của MÓN ĐỒ, mọc từ mép phía cổ tay. Món đồ được xoay cho đứng thẳng,
      // nên ở dáng bưng của một trong hai tay nó quay gần 180° so với cổ tay — và các ngón mọc ra từ mép BÊN KIA cái
      // cốc, rời hẳn khỏi cổ tay áo. Món đồ quay quá 90° thì lật nhóm ngón lại quanh lòng bàn tay.
      // Có thể có hai nhóm ngón (mặt trước / mặt lưng của điện thoại): lật cả hai.
      const groups = e['item' + side].querySelectorAll('[data-grip]'), fingers = groups[0];
      for (const group of groups) group.setAttribute('transform', Math.cos(itemTurn * RAD) < 0 ? 'translate(0 20) scale(1 -1)' : '');      // SOI GƯƠNG qua lòng bàn tay, không xoay: ngón cái vẫn phải chĩa về phía miệng món đồ
      gripping[side] = fingers ? clamp(s['item' + side], 0, 1) : 0;          // độ hiện của các ngón ôm món đồ (mờ theo món đồ)
    }

    for (const ben of ['L', 'R']) {
      // Tay ĐANG CẦM ĐỒ thì không buông: động tác nào đòi xoè tay hay chỉ trỏ bằng tay ấy, bàn tay
      // vẫn giữ dáng nắm của tư thế nghỉ — nếu không cái cốc sẽ dính lơ lửng vào lòng bàn tay xoè.
      const grip = this.NGHI['tay' + ben] !== 'mo' ? this.NGHI['tay' + ben] : 'nam';
      // Đang ÔM con vật: bàn tay khum lại ôm lấy nó (xoè ngửa phía dưới đọc thành bưng một cái khay).
      const chon = this.holds[ben] && s['item' + ben] > 0.5 ? grip : s.omRise >= 0.5 ? 'nam' : s['tay' + ben];
      // Buông thõng → lòng bàn tay úp vào đùi, nhìn từ trước chỉ thấy cạnh tay (hẹp ~60%),
      // ngón hơi hướng vào thân. Tay càng giơ lên / vung xa thì bàn tay càng xoè phẳng ra.
      const bat = Math.abs(armAngle(ben, 'bat')), cang = Math.abs(armAngle(ben, 'cang')), vung = Math.abs(s['vung' + ben]);      // góc THẬT đang vẽ (kể cả tay gần thả xuôi)
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
      const guong = ben === 'L' ? -1 : 1;
      // Món đồ tự vẽ các ngón ôm nó (`data-grip`) thì nắm tay phía sau ẩn đi: chỉ còn ống tay áo → các ngón. Ẩn cả NHÓM
      // chứ không đổi hình: bàn tay vẫn ở dáng nắm, món đồ rời tay là nó hiện lại ngay.
      // Món đồ đang mờ đi (vừa trao cho người khác, vừa cất): các ngón ôm nó mờ theo, bàn tay của rig hiện dần lên — hai
      // thứ hoà chéo. Ẩn / hiện đột ngột ở ngưỡng 0,5 thì có những khung cái cốc mờ lơ lửng cạnh một bàn tay xoè.
      e.tayG[ben].style.visibility = gripping[ben] >= 0.999 ? 'hidden' : '';
      e.tayG[ben].style.opacity = gripping[ben] > 0.001 && gripping[ben] < 0.999 ? (1 - gripping[ben]).toFixed(3) : '';
      for (const [k, g] of Object.entries(e.tay[ben])) {
        const op = chon === 'mo' ? (k === (dangXoe ? 'xoe' : 'mo') ? 1 : 0) : (k === chon ? 1 : 0);
        g.setAttribute('opacity', op);
      }
      // Ngửa/sấp cẳng tay: khi bàn tay hướng LÊN (giơ tay, vẫy) cẳng tay xoay ngửa nên
      // ngón cái phải nằm phía TRONG (về phía đầu). Tính "độ hướng lên" của cẳng tay,
      // rồi lật gương bàn tay; với tay xoè thì lật mượt (đi qua cạnh tay như đang xoay
      // cổ tay), với nắm tay/ngón chỉ thì lật thẳng vì hình gần đối xứng.
      const huongTay = chuanHoaGoc(ben === 'L' ? 90 + armAngle('L', 'bat') + armAngle('L', 'cang') : 90 - armAngle('R', 'bat') - armAngle('R', 'cang'));   // 90 = xuống, -90 = lên (đã chuẩn hoá về ±180)
      const len = clamp((-huongTay - 15) / 45, 0, 1);
      // Bàn tay xoè: ngón cái nằm phía TRÊN mỗi khi cẳng tay nằm ngang trên màn hình, bất kể nó đưa ra ngoài hay
      // gập vào trong. Tính từ góc THẬT của cẳng tay (`armTurn`, đã gồm `aim` và dáng xoay), soi gương cho tay trái:
      // m = 0 thõng xuống, −90 đưa ngang RA NGOÀI, +90 gập ngang VÀO TRONG, ±180 giơ thẳng lên. Mốc cũ chỉ lật khi
      // cẳng tay vượt lên trên phương ngang, nên suốt cử chỉ lúc nói ngón cái chúc xuống đất và bàn tay đọc thành
      // một nắm tay sần. Hai điểm đổi hẹp 10–12° để bàn tay không đứng lâu ở dáng "cạnh tay", và điểm đổi phía ngoài
      // đặt ở 20–30° so với phương thõng: KHÔNG cử chỉ nào dừng ở đó (tay nghỉ lệch dưới 17°, cử chỉ đưa tay từ 33°
      // trở lên). Bản 0.38.2 đặt nó ở 34–46°: nhịp vuốt ve đung đưa quanh 33–40° làm bàn tay lật qua lật lại, mỗi
      // lần đi qua bề ngang 0 — một cái gai ở đầu cánh tay.
      const m = chuanHoaGoc(guong * (armTurn[ben] + s.than));
      const side = m > 0 ? clamp((135 - m) / 12, 0, 1) : clamp((m + 30) / 10, 0, 1);
      let lat = chon === 'mo' ? 2 * side - 1 : (len < 0.5 ? 1 : -1);
      // Xoay nghiêng: nhìn từ bên hông chỉ thấy cạnh ngón cái, và ngón cái phải quay về
      // phía TRƯỚC (hướng đi). Tay phía gần người xem vốn có ngón cái quay vào thân
      // (= ra sau khi nghiêng) nên lật lại; lật mượt theo mức xoay để không giật.
      // Tay đang `aim` thì KHÔNG lật: phép lật mượt đi qua bề ngang 0 đúng ở dáng 3/4 — bàn tay chỉ của tay phía xa
      // co lại thành một cái gai.
      // …ĐỔI HẲN ở giữa vòng xoay, không lật mượt: lật mượt đi qua bề ngang 0 đúng ở dáng 3/4, nên mọi cử chỉ của tay xa
      // khi thân đang hé 0,3 (vuốt ve, reo mừng, nhún vai) có bàn tay chỉ còn 40% bề ngang — một cái gai ở đầu cánh tay.
      const lon = s['aim' + ben] > 0.02 || ben === clasp ? 0 : (ben === 'R' ? h : -h) > 0.5 ? 1 : 0;
      lat *= 1 - 2 * lon;
      // NGÓN CÁI GIƠ LÊN thì phải chỉ LÊN TRỜI. Hình 'cai' vẽ ngón cái dọc theo cẳng tay; cẳng tay đặt chéo trước
      // ngực thì ngón cái chĩa ngang — đọc thành "chỉ vào túi áo". Xoay cả nắm tay quanh lòng bàn tay (0, 9) cho
      // ngón cái đứng thẳng, cùng cách món đồ cầm được giữ thẳng ở trên.
      const hz = Math.max(0.2, s['handZoom' + ben]);
      if (chon === 'tim') {
        const heart = e.tayG[ben].querySelector('[data-heart]'), k = clamp(s['heart' + ben], 0, 1.6);
        heart.setAttribute('transform', `translate(0 ${(-6 * k).toFixed(2)}) translate(0 -15) scale(${(0.15 + k).toFixed(3)}) translate(0 15)`);
        heart.style.opacity = k < 0.05 ? 0 : 1;
      }
      if (UPRIGHT_HANDS.includes(chon)) e.tayG[ben].setAttribute('transform', `rotate(${chuanHoaGoc(-armTurn[ben] - s.than).toFixed(2)} 0 9) scale(${(guong * hz).toFixed(3)} ${hz.toFixed(3)})`);
      else e.tayG[ben].setAttribute('transform',
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
    this.#drawLeash();
    this.#drawBall();
    this.#drawNote();
    if (this.markEl && this.m) drawMark(this.markEl, this.m);
  }

  /**
   * DẤU CẢM XÚC trên đầu, giữ cho tới khi tắt: `mark('!')` · `mark('?')` · `mark('heart')` · `mark('zzz')` · `mark('sweat')`
   * · `mark('anger')` · `mark('music')`; `mark(null)` tắt. Hiện song song với các động tác sau (nói, gật, đi).
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

  // THẺ THÔNG BÁO (`notify`): bật ra phía trên bàn tay cầm điện thoại, đuôi chỉ xuống máy; lớn dần theo `note`.
  #drawNote() {
    const e = this.el, s = this.s, n = this.noted;
    if (!e || !e.note) return;
    const k = clamp(s.note, 0, 1);
    if (!n || k < 0.02) { e.note.style.display = 'none'; return; }
    const hand = e['coTay' + n.side], ctm = hand && hand.getScreenCTM(), root = this.svg.getScreenCTM();
    if (!ctm || !root) { e.note.style.display = 'none'; return; }
    const p = new DOMPoint(0, 4).matrixTransform(ctm).matrixTransform(root.inverse());
    // Thẻ nằm TRÊN bàn tay, lệch vào phía trong khung một chút để không tràn khỏi mép khung nhân vật.
    const x = clamp(p.x, 110, KHUNG.w - 110), y = p.y - 40 - 20 * k;
    e.note.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(0.4 + 0.6 * k).toFixed(3)})`);
    e.note.style.opacity = Math.min(1, k * 1.6).toFixed(2);
    e.note.style.display = '';
  }

  // QUẢ BÓNG đang bay (`throwBall`): một đường parabol trong hệ gốc của SVG, từ trên vai tay ném tới một điểm trên sàn
  // cách `throw.distance` đơn vị về phía ném.
  #drawBall() {
    const e = this.el, s = this.s, b = this.thrown;
    if (!e || !e.ball) return;
    const k = s.ball;
    if (!b || k <= 0.001 || k >= 0.999) { e.ball.style.display = 'none'; return; }
    const x = b.x0 + b.dir * b.distance * k, y = pha(b.y0, 446, k) - 4 * b.apex * k * (1 - k);
    e.ball.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(k * 540 * b.dir).toFixed(0)})`);
    e.ball.style.display = '';
  }

  // DÂY DẮT: từ lòng bàn tay cầm quai dây tới vòng cổ con vật đang dắt, võng xuống ở giữa. Hai đầu đo TRÊN MÀN HÌNH
  // (con vật là một SVG khác, đứng đâu cũng được) rồi đổi về hệ gốc của SVG này. Con vật tự gọi hàm này sau mỗi lần nó
  // vẽ (`onDraw`), nên dây bám theo cả khi chỉ con vật cử động.
  #drawLeash() {
    const line = this.el && this.el.leash, pet = this.leashed;
    if (!line) return;
    if (!pet || this.s.leash < 0.5 || !pet.el || !pet.el.vong || !this.svg.getScreenCTM) { line.style.display = 'none'; return; }
    const k = this.leashHand, hand = this.el['coTay' + k], toRoot = this.svg.getScreenCTM();
    const handCTM = hand && hand.getScreenCTM();
    if (!toRoot || !handCTM) { line.style.display = 'none'; return; }
    const inverse = toRoot.inverse();
    const a = new DOMPoint(0, 16).matrixTransform(handCTM).matrixTransform(inverse);
    const collar = pet.el.vong.getBoundingClientRect();
    const b = new DOMPoint(collar.left + collar.width / 2, collar.top + collar.height / 2).matrixTransform(inverse);
    const span = Math.hypot(b.x - a.x, b.y - a.y), sag = Math.min(40, span * 0.16);
    const mx = (a.x + b.x) / 2, my = Math.max(a.y, b.y) + sag;
    line.setAttribute('d', `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
    line.style.display = '';
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
    const drop = this.hangChan() + this.#lowered() + s.y;
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

  // Góc nghỉ [bắp, cẳng] của một tay. Tay cầm đồ mà đồ đang được cất thì nghỉ ở dáng buông chung, không ở dáng giữ đồ.
  #restArm(side, shown = this.s['item' + side]) {
    if (this.holds[side] && shown <= 0.5) return [NGHI['bat' + side], NGHI['cang' + side]];
    return [this.NGHI['bat' + side], this.NGHI['cang' + side]];
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
    so.seat = this.s.seat; so.huong = this.s.huong; so.kneel = this.s.kneel;
    so.itemL = this.s.itemL; so.itemR = this.s.itemR;          // đồ vật đã cất thì vẫn cất
    so.phoneL = this.s.phoneL; so.phoneR = this.s.phoneR;      // đang áp điện thoại thì vẫn áp
    so.om = this.s.om; so.omRise = this.s.omRise;              // đang bế thú thì vẫn bế
    so.leash = this.s.leash;                                   // đang dắt thú thì vẫn dắt
    // Tay ĐÃ CẤT ĐỒ thì buông lỏng: tư thế nghỉ của nhân vật cầm đồ là cánh tay gập giữ cái cốc — cất cốc rồi
    // mà tay vẫn gập nắm như thế là bàn tay nắm vào không khí.
    const target = { ...so, ...giu }, hands = { tayL: this.NGHI.tayL, tayR: this.NGHI.tayR };
    for (const side of ['L', 'R']) {
      if (!this.holds[side] || target['item' + side] > 0.5) continue;
      const [upper, fore] = this.#restArm(side, target['item' + side]);
      target['bat' + side] = upper; target['cang' + side] = fore; hands['tay' + side] = 'mo';
    }
    t.to(this.s, { ...target, duration: d, ease: 'power2.inOut' }, at);
    // Bàn tay về hình dạng NGHỈ của nhân vật (mặc định thả lỏng, nhưng có thể là nắm tay).
    t.set(this.s, hands, `>-${d * 0.5}`);
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
      // Tay đang CẦM ĐỒ không đánh theo nhịp bước: cái cốc gắn vào bàn tay, tay vung là cốc lắc như con lắc.
      for (const side of ['L', 'R']) if (this.holds[side] && s['item' + side] > 0.5) o['vung' + side] *= 0.15;
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
  static GESTURE_TURN = 0.3;
  static SEAT_SPLAY = 12;               // độ xoè của mỗi đùi khi ngồi (nhìn từ trước)
  #openUp(t) {
    const held = this.s.huong, limit = RigSVG.GESTURE_TURN;
    if (Math.abs(held) > limit) t.to(this.s, { huong: Math.sign(held) * limit, duration: 0.4, ease: 'sine.inOut' }, 0);
  }

  /**
   * Vào thế cho một cử chỉ tay. Cách mới (`SCREEN_AIM`): GIỮ NGUYÊN hướng đang quay và bật kênh `aim` của những tay
   * sẽ diễn — góc của chúng thành góc trên màn hình, nên dáng tay đọc được y như lúc nhìn thẳng dù thân đang ở dáng
   * 3/4. `#khep` trả `aim` về 0. Cách cũ: mở người về phía người xem (`#openUp`).
   */
  #stage(t, arms, at = 0) {
    if (!RigSVG.SCREEN_AIM) return this.#openUp(t);
    for (const arm of arms) t.to(this.s, { ['aim' + arm]: 1, duration: 0.3, ease: 'sine.inOut' }, at);
  }

  /**
   * Chọn tay cho động tác đưa bàn tay lên TRƯỚC NGỰC (giơ ngón cái, đặt tay lên ngực). Đang quay mặt về một phía thì
   * đó là tay GẦN người xem — tay ở phía lưng: nó vốn nằm trước thân. Tay phía đang quay tới là tay xa, vai nó đã dồn
   * vào giữa và cả cánh tay nằm sau thân; bàn tay đưa lên ngực là khuất mất, hoặc chồng lên bàn tay kia.
   */
  #chestHand(hand = 'auto') {
    if (hand === 'L' || hand === 'R') return hand;
    const busy = (side) => this.holds[side] && this.s['item' + side] > 0.5;
    const near = this.s.huong > 0.1 ? 'L' : this.s.huong < -0.1 ? 'R' : null;
    return near && !busy(near) ? near : this.#freeHand(hand);
  }

  /**
   * Vào thế cho một CÂU NÓI có cử chỉ. Tay nào diễn thì `#cuChi` tự bật `aim` theo từng cử chỉ, nên ở đây chỉ còn một
   * việc: giữ dáng 3/4 hay mở người. Giữ dáng 3/4 chỉ đẹp khi tay chủ đạo là tay Ở PHÍA đang quay mặt — nó mở về phía
   * người nghe. Tay chủ đạo là tay bên kia (vì tay phía người nghe đang cầm đồ, hoặc người gọi chỉ định) thì nó mở ra
   * SAU LƯNG; khi ấy mở người về phía khán giả như trước, để cử chỉ thành "mở ra với người xem".
   */
  #stageSpeech(t, hand = null) {
    const h = this.s.huong, busy = (side) => this.holds[side] && this.s['item' + side] > 0.5;
    const order = hand === 'L' || (hand !== 'R' && h < -0.1) ? ['L', 'R'] : ['R', 'L'], lead = order.find((side) => !busy(side));
    if (!RigSVG.SCREEN_AIM || (lead && Math.abs(h) > 0.1 && lead !== (h < 0 ? 'L' : 'R'))) this.#openUp(t);
  }

  /**
   * Chọn tay cho động tác MỘT TAY. `hand`: 'L' | 'R' để chỉ định; 'auto' (mặc định) lấy tay phải,
   * trừ khi tay phải đang cầm đồ mà tay trái thì không — khi ấy dùng tay trái.
   */
  #freeHand(hand = 'auto') {
    if (hand === 'L' || hand === 'R') return hand;
    const busy = (side) => this.holds[side] && this.s['item' + side] > 0.5;
    // Đang quay mặt về một phía thì diễn bằng tay Ở PHÍA ĐÓ — tay đưa về phía người đối diện. Dùng tay kia là
    // vẫy và mở tay ra sau lưng mình.
    const toward = this.s.huong < -0.1 ? 'L' : this.s.huong > 0.1 ? 'R' : null;
    if (toward && !busy(toward)) return toward;
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
    const side = this.#freeHand(hand), m = side === 'L' ? -1 : 1;                 // m lật các nghiêng thân / đầu
    this.#stage(t, [side]);
    const handK = 'tay' + side, upperK = 'bat' + side, foreK = 'cang' + side;
    t.set(s, { [handK]: 'mo' }, 0);
    // Lấy đà NGAY TẠI tư thế nghỉ (nhích vài độ), không phải ở một dáng cố định: từ dáng đan tay mà bật về dáng
    // ấy trong 0,12 s là cẳng tay quất gần 1.800°/giây.
    t.to(s, { [upperK]: this.NGHI[upperK] - 4, [foreK]: this.NGHI[foreK] - 6, duration: 0.12, ease: 'sine.in' }, 0);
    // Giơ tay: nhanh rồi chậm dần, không nảy quá đà; cẳng tay tới sau bắp tay một nhịp.
    // Bắp tay giơ 128°, không giơ thẳng đứng: nhân vật đầu to tay ngắn (trẻ em) giơ thẳng thì bàn tay khuất sau đầu.
    // Đang ở dáng 3/4 (giữ nguyên hướng quay) thì hai vai dồn vào giữa, bàn tay vẫy rơi đúng vào mặt: ngả bắp tay ra ngoài.
    // Cẳng tay gập thêm đúng chừng ấy, để nó (và bàn tay xoè) vẫn chĩa lên như cũ — chỉ có khuỷu dời ra ngoài.
    const raise = 128 - (RigSVG.SCREEN_AIM ? Math.min(Math.abs(s.huong), 0.7) * 48 : 0), bend = 128 - raise;
    t.to(s, { [upperK]: raise, vai: -3, than: -3 * m, dau: -6 * m, nhinX: 1.5 * m, cuoi: 1, mieng: 0.15, mayL: 0.5, mayR: 0.5,
              duration: 0.5, ease: 'power2.out' }, 0.12);
    t.to(s, { [foreK]: 22 + bend, duration: 0.5, ease: 'power2.out' }, 0.16);
    // Vẫy bốn nhịp, BIÊN ĐỘ NHỎ DẦN quanh một điểm giữa; bắp tay đung đưa ngược một chút, đi sau cẳng tay —
    // vẫy đều tăm tắp giữa hai góc cố định thì giống cần gạt nước.
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
    const side = this.#chestHand(hand), m = side === 'L' ? -1 : 1;
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
  static SCREEN_AIM = true;              // tắt để so sánh với cách cũ (mở người về phía người xem rồi pha trộn góc)

  // Hoành độ của vai `side` trên màn hình (viewBox) ở hướng đang quay — hai vai dồn về giữa khi quay nghiêng.
  #shoulderX(side) {
    const h = this.s.huong, ah = Math.abs(h), tuck = Math.sin(Math.PI * Math.min(1, ah)) * 8;
    let x = (side === 'L' ? -1 : 1) * (CHOT_VAI.x * (1 - ah * 0.92) + ah * 2);
    if (h > 0 && side === 'R') x -= tuck; else if (h < 0 && side === 'L') x += tuck;
    else if (ah > 0) x = (side === 'L' ? -1 : 1) * (CHOT_VAI.x * (0.08 + 0.92 * Math.cos(ah * Math.PI / 2)) + ah * 2);      // vai gần: theo cos (xem apDung)
    return HONG.x + x * this.nv.coThan;
  }

  // Tung độ của vai trên màn hình, trong hệ mà `point` tính đích (viewBox trừ `DOI_Y` và `s.y`). Hằng `VAI.y` chỉ đúng
  // cho người lớn: chân ngắn (`coChan`) thì hông tụt xuống, thân nhỏ (`coThan`) thì vai gần hông hơn — cậu bé tính
  // theo vai người lớn là chỉ thấp hơn đích cả chục độ.
  // Người HẠ XUỐNG bao nhiêu (đơn vị khung) vì ngồi (`seat`: đùi rút) và quỳ (`kneel`: ống chân rút thêm).
  #lowered() {
    const nv = this.nv, s = this.s;
    return DAI.dui * nv.daiDui * nv.coChan * 0.72 * clamp(s.seat, 0, 1) + DAI.ong * nv.daiOng * nv.coChan * KNEEL_SHIN * clamp(s.kneel || 0, 0, 1);
  }

  #shoulderY() {
    const seatDrop = this.#lowered();
    return HONG.y + this.hangChan() + seatDrop + CHOT_VAI.y * this.nv.coThan;
  }

  // HƯỚNG TAY tới một đích (rig, phần tử, { x, y } trong khung, DOMRect, hay null = ngang vai sang phải): tay nào, góc bắp
  // tay, đầu và mắt nhìn theo — dùng chung cho `point` và `shine`.
  #aimOf(muc) {
    const s = this.s, screen = RigSVG.SCREEN_AIM;
    let tx = 380, ty = 165;

    // Đích là một NHÂN VẬT / THÚ (rig): chỉ vào cái đầu của nó (thú: cả thân nếu không có đầu riêng). Bản trước chỉ nhận
    // phần tử trang hay toạ độ — truyền một rig vào thì `getBoundingClientRect` không có, mọi góc thành NaN và cả hình
    // nhân vật co rúm lại suốt động tác (tools/scene.py truyền đúng thế cho ["point", "@cat"]).
    if (muc && muc.svg && muc.el) muc = (muc.el.dau || muc.svg);
    if (muc && typeof muc.x === 'number' && typeof muc.y === 'number' && !(muc instanceof Element)) {
      tx = muc.x - s.x; ty = muc.y - s.y - DOI_Y;      // toạ độ viewBox trực tiếp
    } else if (muc) {
      if (!(muc instanceof Element) && typeof muc.left !== 'number') throw new Error('[character] point(target): target must be an element, a rig, { x, y } in the 400 × 470 frame, or a DOMRect');
      const r = muc instanceof Element ? muc.getBoundingClientRect() : muc;
      const sv = this.svg.getBoundingClientRect();
      const k = Math.min(sv.width / KHUNG.w, sv.height / KHUNG.h) || 1;   // svg chưa có kích thước → coi như 1:1
      const ox = sv.left + (sv.width - KHUNG.w * k) / 2, oy = sv.top + (sv.height - KHUNG.h * k) / 2;
      tx = (r.left + r.width / 2 - ox) / k - s.x;
      ty = (r.top + r.height / 2 - oy) / k - s.y - DOI_Y;
    }
    // Không có đích: chỉ NGANG VAI CỦA CHÍNH MÌNH về bên phải. Đích mặc định cũ nằm ở một cao độ cố định trong khung
    // (ngang vai người lớn): nhân vật trẻ con, vai thấp hơn, phải chỉ chếch lên — bàn tay chồng lên bím tóc và mép mặt.
    if (!muc) ty = (screen ? this.#shoulderY() : VAI.R.y) - 6;
    // Chỉ bằng tay ở PHÍA đích; góc tính từ chỗ cái vai ấy đang nằm trên màn hình (quay nghiêng thì vai dồn vào giữa).
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) { tx = 380; ty = (screen ? this.#shoulderY() : VAI.R.y) - 6; }      // đích chưa có kích thước (chưa gắn vào trang): chỉ ngang sang phải
    const ben = tx < HONG.x ? 'L' : 'R', v = screen ? { x: this.#shoulderX(ben), y: this.#shoulderY() } : VAI[ben];
    const goc = Math.atan2(ty - v.y, tx - v.x) * 180 / Math.PI;
    const bat = clamp(chuanHoaGoc(ben === 'L' ? goc - 90 : 90 - goc), -15, 172);
    const dau = clamp((tx - HONG.x) * 0.05, -10, 10);
    const nhinX = clamp((tx - HONG.x) * 0.02, -3, 3), nhinY = clamp((ty - 88) * 0.02, -2.5, 2.5);
    return { ben, bat, dau, nhinX, nhinY };
  }

  /**
   * RỌI ĐÈN PIN vào `target` (rig, phần tử, { x, y } trong khung, hay null = thẳng sang phải) trong `hold` giây: đèn pin hiện
   * trong tay, giơ lên rọi, giữ, rồi hạ xuống. Trong bối cảnh 3D đèn pin là một NGUỒN SÁNG đi theo bàn tay: rọi sáng người /
   * con vật ở cuối luồng (con vật nheo mắt), in một vũng sáng lên sàn và tường khi phòng tối (mất điện).
   */
  shine(muc = null, hold = 2) {
    const t = this.tl(), s = this.s, screen = RigSVG.SCREEN_AIM;
    if (!screen) this.#openUp(t);
    const { ben, bat, dau, nhinX, nhinY } = this.#aimOf(muc);
    const batK = 'bat' + ben, cangK = 'cang' + ben;
    // Bối cảnh 3D đọc chỗ này để nhắm lại luồng đèn ở từng khung theo góc máy lúc ấy (set3d `aimTorch`).
    this.shineAim = { target: muc, side: ben };
    t.set(s, { ['tay' + ben]: 'nam', ['gadget' + ben]: 5 }, 0.05);
    if (screen) t.to(s, { ['aim' + ben]: 1, duration: 0.3, ease: 'sine.inOut' }, 0.1);
    t.to(s, { [batK]: bat, [cangK]: 0, than: ben === 'L' ? 1.5 : -1.5, dau, nhinX, nhinY, cuoi: 0.1, chum: 0.2, duration: 0.45, ease: 'sine.out' }, 0.05);
    // Lia đèn nhè nhẹ quanh đích — tay người cầm đèn không đứng yên như giá đỡ.
    t.to(s, { [batK]: bat + 4, duration: hold * 0.3, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.5);
    this.#khep(t, 0.45, 0.5 + hold);
    return t;
  }

  point(muc = null) {
    const t = this.tl(), s = this.s, screen = RigSVG.SCREEN_AIM;
    if (!screen) this.#openUp(t);
    const { ben, bat, dau, nhinX, nhinY } = this.#aimOf(muc);
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
    // Tay đang cầm đồ thì đứng yên; tay còn lại diễn một mình.
    const arms = ['L', 'R'].filter((side) => !(this.holds[side] && s['item' + side] > 0.5));
    this.#stage(t, arms);
    const pose = (values) => Object.fromEntries(arms.flatMap((side) => [['bat' + side, values[side][0]], ['cang' + side, values[side][1]]]));
    t.set(s, Object.fromEntries(arms.map((side) => ['tay' + side, 'mo'])), 0);
    t.to(s, { ...pose({ L: [8, -75], R: [8, -75] }), dauY: 1, duration: 0.25, ease: 'power2.in' }, 0); // gom trước ngực
    // Mở hai tay ra, CẲNG TAY NÂNG LÊN, lòng bàn tay ngửa — dáng "xin mời / đây ạ". Bản trước dang cả cánh tay chếch
    // xuống (bắp 62–72°, cẳng −22°): lòng bàn tay úp, trông như dáng chữ A lúc kiểm tra rig.
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
      // Gật đủ sâu để THẤY ở cỡ toàn thân, vai và thân chúi theo: 8 đơn vị là chưa tới bốn điểm ảnh trong khung 720p.
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
  #dam(t, at, h, ben, tay = 1, goiCao = 1, arms = null) {
    const s = this.s, L = ben === 'L';
    const goi = L ? 'nhacL' : 'nhacR';
    t.to(s, { [goi]: goiCao, y: -5 * goiCao, than: (L ? 2 : -2) * goiCao, dauY: -1, duration: h * 0.5, ease: 'power2.out' }, at);
    t.to(s, { [goi]: 0, y: 0, dauY: 1.5, duration: h * 0.5, ease: 'power2.in' }, at + h * 0.5);
    // Tay đối diện ra trước, tay cùng bên ra sau — đổi chiều mượt suốt cả nhịp, hơi trễ so với chân.
    t.to(s, { vungL: (L ? -1 : 1) * tay, vungR: (L ? 1 : -1) * tay, vai: -tay,
              duration: h * 0.9, ease: 'sine.inOut' }, at + h * 0.1);
    // `vung` chỉ thấy khi quay nghiêng. NHÌN THẲNG thì tay đánh là cẳng tay gập lên trước ngực (tay đối diện với
    // chân đang nhấc) rồi duỗi xuống — thiếu phần này thì march, stroll và stepInPlace trông y hệt nhau.
    if (arms) for (const side of ['L', 'R']) {
      if (this.holds[side] && s['item' + side] > 0.5) continue;                // tay cầm đồ đứng yên
      const [upper, fore] = side === ben ? arms.back : arms.front;
      t.to(s, { ['bat' + side]: upper, ['cang' + side]: fore, duration: h * 0.9, ease: 'sine.inOut' }, at + h * 0.1);
    }
    return at + h;
  }

  // Dậm chân tại chỗ (nhìn thẳng), tạo cảm giác đang bước.
  march(buoc = 6) {
    const t = this.tl(), h = 0.38;
    let at = 0;
    t.set(this.s, { tayL: 'nam', tayR: 'nam' }, 0);
    t.to(this.s, { cuoi: 0.6, mayL: 0.3, mayR: 0.3, duration: 0.2 }, 0);
    // Đều bước: nắm tay, cẳng tay đánh cao trước ngực.
    for (let i = 0; i < buoc; i++) at = this.#dam(t, at, h, i % 2 ? 'R' : 'L', 1, 1, { front: [22, -78], back: [5, -10] });
    this.#khep(t, 0.4, at);
    return t;
  }

  // Bước tại chỗ thong thả: gối nhấc vừa, tay chỉ đung đưa nhẹ theo quán tính.
  stroll(buoc = 6) {
    const t = this.tl(), h = 0.54;
    let at = 0;
    t.to(this.s, { cuoi: 0.45, duration: 0.25 }, 0);
    for (let i = 0; i < buoc; i++) at = this.#dam(t, at, h, i % 2 ? 'R' : 'L', 0.3, 0.5, { front: [15, -20], back: [7, -4] });      // tay buông, đung đưa nhẹ; gối nhấc thấp, nhịp chậm
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
    crying:    { cuoi: -0.9, mieng: 0.4, chum: 0.2, mayL: 0.95, mayR: 0.95, matY: 0.7, dau: 3, dauY: 5, vai: 4, khoc: 1 },   // mắt nhắm tịt, miệng mếu, nước mắt
    embarrassed: { cuoi: 0.35, mieng: 0.04, mayL: 0.7, mayR: 0.7, matY: 0.15, dau: 6, dauY: 3, nhinX: 1.6, nhinY: 1, doMa: 1, moHoi: 1 },   // cười ngượng, liếc đi, má đỏ, giọt mồ hôi
    sleepy:    { cuoi: 0, mieng: 0, mayL: 0.1, mayR: 0.1, matY: 0.72, dau: 6, dauY: 7, nhinY: 1, vai: 3 },              // mắt díp, đầu gục, ngáp
  };

  /**
   * Làm một BIỂU CẢM rồi trở về: `express('happy')`, `express('sad', 2)`.
   * Tên hợp lệ: happy · sad · surprised · angry · thinking. `hold` = số giây giữ nét mặt.
   */
  express(name = 'happy', hold = 1.2) {
    const face = RigSVG.EXPRESSIONS[name];
    if (!face) throw new Error(`[character] no expression "${name}" (available: ${Object.keys(RigSVG.EXPRESSIONS).join(', ')})`);
    const t = this.tl(), s = this.s, into = name === 'surprised' ? 0.16 : 0.32, N = this.NGHI;
    t.to(s, { ...face, duration: into, ease: name === 'surprised' ? 'back.out(2.2)' : 'power2.out' }, 0);
    // THÂN NGƯỜI cùng diễn: chỉ đổi nét mặt trên một thân đứng im thì nhìn như dán mặt nạ lên tượng.
    const standing = s.seat < 0.5, free = ['L', 'R'].filter((side) => !(this.holds[side] && s['item' + side] > 0.5));
    const arm = (side, upper, fore, at, d, ease = 'power2.out') => t.to(s, { ['bat' + side]: upper, ['cang' + side]: fore, duration: d, ease }, at);
    if (name === 'happy') {                                   // nhún người một cái, vai nhấc
      // Nhún đủ cao để THẤY ở cỡ toàn thân (7 đơn vị là ba điểm ảnh trong khung 720p — không ai thấy), rồi lắc đầu một nhịp.
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
    } else if (name === 'crying') {                           // nấc: vai giật lên theo nhịp, nước mắt chảy xuống má
      const sobs = Math.max(2, Math.round(hold / 0.45));
      for (let n = 0; n < sobs; n++) t.to(s, { vai: face.vai - 4, dauY: face.dauY - 2, duration: 0.14, ease: 'power2.out' }, into + n * 0.45).to(s, { vai: face.vai, dauY: face.dauY, duration: 0.3, ease: 'sine.inOut' }, into + n * 0.45 + 0.14);
      t.fromTo(s, { khocY: 0 }, { khocY: 1, duration: Math.max(0.6, hold * 0.8), ease: 'power1.in', immediateRender: false }, into);
    } else if (name === 'sleepy') {                           // ngáp: miệng há to, mắt nhắm, rồi gật gù
      // Ngáp phải GIỮ miệng há đủ lâu (≈ 1,1 s) mới đọc được — há 0,5 s rồi khép thì người xem chỉ thấy một nét miệng.
      t.to(s, { mieng: 1, chum: 0.45, matY: 1, tho: 1, dauY: face.dauY - 6, vai: face.vai - 4, duration: 0.45, ease: 'sine.inOut' }, into)
       .to(s, { mieng: 0, chum: 0, matY: face.matY, tho: 0, dauY: face.dauY, vai: face.vai, duration: 0.45, ease: 'sine.inOut' }, into + 1.55);
      if (hold > 2.4) t.to(s, { dauY: face.dauY + 12, dau: face.dau + 5, duration: 0.45, ease: 'sine.in', yoyo: true, repeat: 1 }, into + 2.05);      // gật gù
    }
    if (name === 'laughing') {
      // Rung người vì cười: vai và đầu nảy theo nhịp, thân ngả nhẹ ra sau. Bản trước chỉ nảy 4 đơn vị — đo trên phim
      // 720p là một điểm ảnh, nhìn như ảnh tĩnh.
      const beats = Math.max(1, 2 * Math.round(hold / 0.3) - 1);
      t.to(s, { dauY: face.dauY + 9, vai: face.vai + 7, tho: 1, duration: 0.13, ease: 'sine.inOut', yoyo: true, repeat: beats }, into);
      if (standing) t.to(s, { y: -4, duration: 0.13, ease: 'sine.inOut', yoyo: true, repeat: beats }, into);
    }
    else if (!['surprised', 'crying', 'sleepy'].includes(name) && hold > 0.8) { this.blinkTo = face.matY || 0; this.#chop(t, into + hold * 0.5); this.blinkTo = 0; }      // ngạc nhiên thì không chớp mắt
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
    const t = this.tl(), s = this.s, keep = {};
    if (side !== 'R') keep.itemL = value;
    if (side !== 'L') keep.itemR = value;
    // Tay nào thật sự đổi trạng thái (đang cầm mà cất, đang cất mà lấy ra). Không có tay nào thì chỉ ghi trạng thái.
    const acting = (side === 'both' ? ['L', 'R'] : [side]).filter((k) => this.holds[k] && (s['item' + k] > 0.5) !== (value > 0.5));
    if (!acting.length) return this.#khep(t, 0.25, 0, keep);
    // CÓ ĐỘNG TÁC: bàn tay đưa xuống cạnh hông, hơi ra sau — món đồ mờ đi (hoặc hiện ra) Ở ĐÓ — rồi tay về dáng nghỉ
    // (buông lỏng nếu vừa cất, dáng cầm nếu vừa lấy). Bản trước món đồ mờ đi ngay giữa ngực trong 0,25 s.
    for (const k of acting) {
      if (value > 0.5) t.set(s, { ['tay' + k]: 'nam' }, 0);
      t.to(s, { ['bat' + k]: -12, ['cang' + k]: -4, ['carry' + k]: 0, duration: 0.3, ease: 'power2.inOut' }, 0);
      t.to(s, { ['item' + k]: value, duration: 0.13 }, 0.22);
    }
    t.to(s, { dauY: 2.5, nhinY: 1.2, duration: 0.3, ease: 'sine.inOut' }, 0);            // liếc xuống theo tay
    this.#khep(t, 0.38, 0.36, keep);
    return t;
  }

  /**
   * CHO nhân vật một món đồ để cầm ở tay `side` ('L' | 'R'): `draw(p, colours, definition)` trả về SVG trong hệ cổ tay
   * (như `heldItemL/R`). `shown: false` = có món đồ nhưng đang cất — để `take()` nhận nó từ người khác, hay `showItem()`
   * lấy nó ra. Tay ấy nghỉ ở dáng bưng đồ khi món đồ đang hiện.
   */
  setItem(side, draw, { shown = true } = {}) {
    if (side !== 'L' && side !== 'R') throw new Error(`[character] setItem(side, …): side must be 'L' or 'R', got ${JSON.stringify(side)}`);
    if (typeof draw !== 'function') throw new Error('[character] setItem(side, draw): draw must be a function returning SVG');
    this.nv = { ...this.nv, ['heldItem' + side]: draw };
    const carry = { ['bat' + side]: 14, ['cang' + side]: -85, ['tay' + side]: 'nam' };
    // Tay PHẢI vẽ ở lớp trên tay trái. Nhân vật nghỉ ở dáng đan tay trước bụng mà cầm đồ bằng tay TRÁI thì bàn tay phải
    // đang nghỉ nằm đè lên mặt trước món đồ. Cho tay phải rảnh ấy buông xuôi. (Cầm tay phải thì bàn tay trái nằm SAU
    // món đồ, đọc thành tay đỡ — để nguyên.)
    const free = side === 'L' && !this.holds.R && this.NGHI.cangR < -40 ? { batR: NGHI.batR, cangR: NGHI.cangR, tayR: 'mo' } : {};
    this.NGHI = Object.freeze({ ...this.NGHI, ...carry, ...free, ['item' + side]: shown ? 1 : 0 });
    this.#dungLai();
    Object.assign(this.s, free, shown ? carry : { ['bat' + side]: NGHI['bat' + side], ['cang' + side]: NGHI['cang' + side], ['tay' + side]: 'mo' }, { ['item' + side]: shown ? 1 : 0 });
    this.apDung();
    return this;
  }

  // Người / vật kia ở bên nào: −1 trái, +1 phải. `target`: rig, phần tử, 'left' | 'right', hoặc bỏ trống (phía của tay `side`).
  #towards(target, side) {
    if (target === 'left') return -1;
    if (target === 'right') return 1;
    if (target && typeof target.centerX === 'function') { const dx = target.centerX() - this.centerX(); if (Math.abs(dx) > 1) return dx < 0 ? -1 : 1; }
    else if (target && target.getBoundingClientRect) { const box = target.getBoundingClientRect(), dx = box.left + box.width / 2 - this.centerX(); if (Math.abs(dx) > 1) return dx < 0 ? -1 : 1; }
    return side === 'L' ? -1 : 1;
  }
  // Dáng VƯƠN TAY đưa / nhận đồ về phía `dir`: tay cùng phía thì cẳng tay mở ra ngoài; tay khác phía thì đưa ngang qua trước bụng.
  #reach(t, side, dir, at) {
    const s = this.s, N = this.NGHI, own = (side === 'R') === (dir > 0), [upper, fore] = own ? [44, 56] : [28, -124];
    t.to(s, { ['bat' + side]: upper, ['cang' + side]: fore, than: N.than - dir * 4, dau: N.dau + dir * 3, nhinX: dir * 1.6, cuoi: 0.8, mayL: 0.4, mayR: 0.4,
              duration: 0.42, ease: 'power2.out' }, at);
  }

  /**
   * ĐƯA món đồ đang cầm cho người khác: vươn tay về phía `target`, món đồ rời tay, tay buông về nghỉ. Món đồ ở lại
   * trạng thái "đã cất" (như sau `hideItem`). Ghép với `take()` của người nhận trong cùng một nhịp:
   *   conversation([{ together: [[barista, ['handOver', granny]], [granny, ['take', barista]]] }])
   */
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

  /**
   * NHẬN một món đồ: vươn tay về phía `source`, món đồ hiện ra trong tay, rồi về dáng cầm. Nhân vật phải CÓ món đồ ấy
   * ở trạng thái đã cất — `createCharacter(host, { id, items: { R: 'cup' }, itemsHidden: true })`, hoặc sau `hideItem`.
   */
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

  /**
   * UỐNG một ngụm: nâng món đồ đang cầm (cốc) lên miệng, nghiêng cốc, ngửa đầu nhẹ, rồi hạ xuống — mắt khép, xong thì
   * cười. Không cầm gì thì làm điệu bộ uống bằng tay rảnh. `side` chọn tay.
   */
  drink(side = 'auto') {
    const t = this.tl(), s = this.s, N = this.NGHI;
    const held = ['R', 'L'].filter((k) => this.holds[k] && s['item' + k] > 0.5), k = side === 'auto' ? held[0] || this.#freeHand() : side, m = k === 'L' ? -1 : 1;
    // Uống thì quay HẲN về phía người xem (rồi `#khep` trả về hướng đang giữ): ở dáng 3/4 cánh tay đưa lên miệng bị thân
    // che, cái cốc lấp ló bên ngực chứ không ra động tác uống.
    if (Math.abs(s.huong) > 0.02) t.to(s, { huong: 0, duration: 0.3, ease: 'sine.inOut' }, 0);
    t.set(s, { ['tay' + k]: 'nam' }, 0);
    // Dáng đưa bàn tay tới GẦN MIỆNG NHẤT đo được (bắp 10°, cẳng −155°: bàn tay ở ngực trên, lệch về phía tay ấy);
    // đầu cúi xuống đón, vai nhấc lên.
    t.to(s, { ['carry' + k]: 0, duration: 0.15 }, 0);
    t.to(s, { ['bat' + k]: 10, ['cang' + k]: -155, vai: N.vai - 5, dau: N.dau + m * 4, dauX: m * 3, dauY: 5, mieng: 0.3, chum: 0.6, nhinY: 1.5, duration: 0.42, ease: 'power2.out' }, 0);
    t.to(s, { ['itemTilt' + k]: 30, dauY: 9, matY: 0.7, duration: 0.3, ease: 'sine.inOut' }, 0.42);                                   // nghiêng cốc, nhắm mắt uống
    t.to(s, { ['itemTilt' + k]: 0, dauY: 3, matY: 0, duration: 0.28, ease: 'sine.inOut' }, 1.0);
    t.to(s, { cuoi: 1, mieng: 0.2, chum: 0, mayL: 0.5, mayR: 0.5, duration: 0.2 }, 1.2);                                              // "à…"
    this.#khep(t, 0.5, 1.35);
    return t;
  }

  /**
   * GHI CHÉP: tay kia đưa tới món đồ đang cầm (bìa kẹp hồ sơ, điện thoại) và viết vài nét, đầu cúi xuống nhìn.
   * `dur` = số giây viết. Không cầm gì thì viết lên lòng bàn tay trái.
   */
  write(dur = 1.2) {
    const t = this.tl(), s = this.s, N = this.NGHI;
    const held = ['L', 'R'].filter((k) => this.holds[k] && s['item' + k] > 0.5), pad = held[0] || 'L', pen = pad === 'L' ? 'R' : 'L', m = pen === 'L' ? -1 : 1;
    this.#openUp(t);
    // Tay giữ "tờ giấy": đang cầm đồ thì ở yên dáng bưng; không thì đưa bàn tay ngửa ra trước bụng.
    if (!held.length) { t.set(s, { ['tay' + pad]: 'mo' }, 0); t.to(s, { ['bat' + pad]: 14, ['cang' + pad]: -85, duration: 0.3, ease: 'power2.out' }, 0); }
    // Tay viết: ngón trỏ làm bút, đưa ngang qua trước bụng tới chỗ tay kia.
    t.set(s, { ['tay' + pen]: 'chi' }, 0.1);
    t.to(s, { ['bat' + pen]: 20, ['cang' + pen]: -104, dauY: 7, dau: N.dau - m * 4, nhinY: 2.4, nhinX: -m * 1.2, mayL: 0.2, mayR: 0.2, cuoi: 0.3, duration: 0.35, ease: 'power2.out' }, 0);
    const strokes = Math.max(2, Math.round(dur / 0.15));
    for (let n = 0; n < strokes; n++) {
      // Nét bút: cẳng tay rung nhỏ, và cứ bốn nét thì dịch sang một chút như xuống dòng.
      t.to(s, { ['cang' + pen]: -104 + (n % 2 ? 4 : -5) - (n % 8 < 4 ? 0 : 6), ['bat' + pen]: 20 + (n % 2 ? 1.5 : -1.5), duration: dur / strokes, ease: 'sine.inOut' }, 0.38 + n * dur / strokes);
    }
    if (dur > 0.8) this.#chop(t, 0.38 + dur * 0.6);
    this.#khep(t, 0.45, 0.42 + dur);
    return t;
  }

  // Tay đang cầm ĐIỆN THOẠI (món đồ có mặt lưng `data-back`, hoặc bất kỳ món đồ nào nếu không tìm ra), hoặc tay rảnh.
  #phoneHand(side = 'auto') {
    if (side === 'L' || side === 'R') return side;
    const held = ['R', 'L'].filter((k) => this.holds[k] && this.s['item' + k] > 0.5);
    return held.find((k) => this.el['item' + k].querySelector('[data-back]')) || held[0] || this.#freeHand();
  }

  // Khẩu hình cho một câu nói CHÈN vào giữa một động tác (gọi điện), bắt đầu ở `at`.
  #talkInto(t, text, dur, at, mood) {
    const s = this.s, tone = this.#tone(mood), soAm = this.#soAm(text, dur), nhip = dur / soAm, talk = gsap.timeline();
    t.to(s, { ...tone.start, duration: 0.2 }, at);
    this.#khauHinh(talk, soAm, nhip, tone.corner);
    t.add(talk, at);
    t.to(s, { mieng: 0, duration: 0.15 }, at + dur);
  }

  /**
   * GỌI ĐIỆN: áp điện thoại lên má (đầu nghiêng về phía nó, mặt lưng điện thoại quay ra ngoài), nói `text` trong `dur`
   * giây rồi hạ xuống. `text` bỏ trống = đang NGHE: gật nhẹ, "ừ, ừ". Không cầm điện thoại thì làm điệu bộ bằng tay rảnh.
   * Đầu chibi to, tay ngắn: nhìn thẳng thì bàn tay không với tới tai — áp lên MÁ, đầu nghiêng xuống đón, là cách vẽ
   * quen thuộc của hoạt hình. Đang quay nghiêng thì quay về phía người xem như `drink`.
   *   rig.call('Alo, phòng khám VetGo xin nghe.', 2.2)      rig.call(null, 2, { mood: 'worried' })
   */
  call(text = null, dur = 2.4, { mood = null, side = 'auto' } = {}) {
    const t = this.tl(), s = this.s, k = this.#phoneHand(side), held = this.holds[k] && s['item' + k] > 0.5, was = s['phone' + k];
    if (Math.abs(s.huong) > 0.02) t.to(s, { huong: 0, duration: 0.3, ease: 'sine.inOut' }, 0);
    // Có điện thoại: dùng thế áp máy (kênh `phone`), rồi trả về như lúc bắt đầu — gọi khi đang `phoneUp` thì máy vẫn ở má.
    // Tay không: làm điệu bộ — nắm tay áp lên má với đúng dáng ấy.
    if (held) t.to(s, { ['phone' + k]: 1, ['carry' + k]: 0, vai: this.NGHI.vai - 3, nhinX: (k === 'L' ? 1 : -1) * 1.2, duration: was >= 1 ? 0.01 : 0.5, ease: 'power2.inOut' }, 0);
    else {
      const m = k === 'L' ? -1 : 1;
      t.set(s, { ['tay' + k]: 'nam' }, 0);
      t.to(s, { ['bat' + k]: CALL_POSE[0], ['cang' + k]: CALL_POSE[1], ['aim' + k]: 1, dau: this.NGHI.dau + m * CALL_TILT, dauX: m * CALL_TILT * 0.4, duration: 0.5, ease: 'power2.inOut' }, 0);
    }
    const at = 0.55;
    if (text) this.#talkInto(t, text, dur, at, mood);
    else {
      // Đang nghe: gật nhẹ đều đều, mắt liếc xuống, miệng hé "ừ" ở mỗi cái gật.
      const nods = Math.max(1, Math.round(dur / 0.9));
      for (let n = 0; n < nods; n++) {
        const a = at + 0.15 + n * dur / nods;
        t.to(s, { dauY: 3, mieng: 0.12, duration: 0.22, ease: 'sine.out' }, a).to(s, { dauY: 0, mieng: 0, duration: 0.3, ease: 'sine.inOut' }, a + 0.22);
      }
      t.to(s, { nhinY: 0.8, mayL: mood ? 0 : 0.25, mayR: mood ? 0 : 0.25, duration: 0.3 }, at);
    }
    if (dur > 1.2) this.#chop(t, at + dur * 0.5);
    this.#khep(t, 0.5, at + dur, held ? { ['phone' + k]: was } : {});
    return t;
  }

  /**
   * NHẤC MÁY và GIỮ: áp điện thoại (món đồ đang cầm) lên má rồi để nguyên đó — các động tác sau (nói, nói theo giọng
   * đọc `speakCues`, gật đầu…) diễn trong lúc áp máy, tay kia vẫn cử chỉ được. `phoneDown()` để đặt máy xuống.
   */
  phoneUp(side = 'auto') {
    const t = this.tl(), s = this.s, k = this.#phoneHand(side);
    if (!(this.holds[k] && s['item' + k] > 0.5)) throw new Error('[character] phoneUp: the character is not holding anything in hand ' + k + ' — give it a phone: createCharacter(host, { id, items: { R: "phone" } })');
    t.to(s, { ['phone' + k]: 1, ['carry' + k]: 0, duration: 0.5, ease: 'power2.inOut' }, 0);
    t.to(s, { nhinX: (k === 'L' ? 1 : -1) * 1.2, duration: 0.3 }, 0.1);
    return this.#khep(t, 0.3, 0.5, { ['phone' + k]: 1 });
  }

  /** ĐẶT MÁY xuống sau `phoneUp`: điện thoại về lại tay ở dáng cầm. */
  phoneDown() {
    const t = this.tl();
    return this.#khep(t, 0.5, 0, { phoneL: 0, phoneR: 0 });
  }

  /**
   * KHOE MÀN HÌNH điện thoại: giơ nó lên cạnh mặt, quay màn hình về người xem và PHÓNG TO cho đọc được (giao diện app
   * — `items: { R: { kind: 'phone', image: 'app.png' } }`), cười, giữ `hold` giây rồi hạ xuống. Phải đang cầm một món đồ.
   */
  showPhone(hold = 1.8, { side = 'auto', zoom = 2.6 } = {}) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this.#phoneHand(side), m = k === 'L' ? -1 : 1;
    if (!(this.holds[k] && s['item' + k] > 0.5)) throw new Error('[character] showPhone: the character is not holding anything in hand ' + k + ' — give it a phone: createCharacter(host, { id, items: { R: "phone" } })');
    this.#stage(t, [k]);
    t.to(s, { ['carry' + k]: 0, duration: 0.15 }, 0);
    t.to(s, { ['bat' + k]: SHOW_POSE[0], ['cang' + k]: SHOW_POSE[1], ['itemZoom' + k]: zoom, dau: N.dau - m * 4, dauX: -m * 2, nhinX: m * 1.4, cuoi: 1, mayL: 0.5, mayR: 0.5,
              duration: 0.5, ease: 'back.out(1.4)' }, 0);
    // Một cái lắc nhẹ món đồ lúc vừa giơ lên — "đây này" — rồi đứng yên cho người xem đọc.
    t.to(s, { ['itemTilt' + k]: 6, duration: 0.18, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.5);
    t.to(s, { nhinX: 0, duration: 0.3 }, 0.9);                 // liếc sang màn hình rồi nhìn lại người xem
    if (hold > 1) this.#chop(t, 0.5 + hold * 0.6);
    this.#khep(t, 0.5, 0.5 + hold);
    return t;
  }

  /**
   * DÙNG ĐIỆN THOẠI: đưa nó lên trước ngực (hơi phóng to, màn hình hướng ra ngoài cho người xem thấy), cúi nhìn, ngón
   * trỏ tay kia chạm và vuốt màn hình trong `dur` giây. Đặt lịch, xem nhắc lịch… Phải đang cầm một món đồ.
   */
  tapPhone(dur = 1.6, { side = 'auto', zoom = 2, keep = false } = {}) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this.#phoneHand(side), pen = k === 'L' ? 'R' : 'L', m = pen === 'L' ? -1 : 1;
    if (!(this.holds[k] && s['item' + k] > 0.5)) throw new Error('[character] tapPhone: the character is not holding anything in hand ' + k + ' — give it a phone: createCharacter(host, { id, items: { R: "phone" } })');
    this.#openUp(t);
    t.to(s, { ['carry' + k]: 0, duration: 0.15 }, 0);
    // CÚI HẲN XUỐNG NHÌN MÀN HÌNH suốt lúc bấm (đầu hạ, mắt nhìn xuống, mí hơi khép): đầu chibi to, cúi ít là đọc thành
    // nhìn thẳng ống kính — Gemini chấm "không nhìn màn hình khi bấm" ở bản đầu (đầu hạ 6, mắt 2,2).
    t.to(s, { ['bat' + k]: TAP_POSE.hold[0], ['cang' + k]: TAP_POSE.hold[1], ['itemZoom' + k]: zoom, dauY: LOOK_DOWN.head, dau: N.dau + m * 3, nhinY: LOOK_DOWN.eyes, matY: LOOK_DOWN.lids,
              nhinX: m * 0.6, cuoi: 0.5, duration: 0.4, ease: 'power2.out' }, 0);
    t.set(s, { ['tay' + pen]: 'chi' }, 0.1);
    t.to(s, { ['bat' + pen]: TAP_POSE.finger[0], ['cang' + pen]: TAP_POSE.finger[1], duration: 0.4, ease: 'power2.out' }, 0.05);
    // Chạm (đầu ngón nhấn tới rồi nhấc) xen với vuốt (cẳng tay quét một đoạn): đọc ra đang bấm chọn trên app.
    const taps = Math.max(2, Math.round(dur / 0.4));
    for (let n = 0; n < taps; n++) {
      const a = 0.45 + n * dur / taps, d = dur / taps, swipe = n % 3 === 2;
      if (swipe) t.to(s, { ['cang' + pen]: TAP_POSE.finger[1] - 14, duration: d * 0.6, ease: 'sine.inOut', yoyo: true, repeat: 1 }, a);
      else t.to(s, { ['bat' + pen]: TAP_POSE.finger[0] + 4, ['cang' + pen]: TAP_POSE.finger[1] + 6, dauY: LOOK_DOWN.head + 1, duration: d * 0.35, ease: 'sine.in', yoyo: true, repeat: 1 }, a);
    }
    if (dur > 1) t.to(s, { cuoi: 0.9, duration: 0.25 }, 0.45 + dur * 0.7);        // tìm được rồi: cười
    // `keep`: tay cầm điện thoại Ở NGUYÊN dáng bấm (phóng to, trước ngực) cho động tác sau — `showPhone` nối thẳng từ đó
    // ra cạnh mặt, không thu điện thoại về cỡ nhỏ rồi lại phóng to (khựng ở 17,4 s bản đầu). `sequence()` tự bật nó khi
    // bước sau là `showPhone`.
    this.#khep(t, 0.45, 0.5 + dur, keep ? { ['bat' + k]: TAP_POSE.hold[0], ['cang' + k]: TAP_POSE.hold[1], ['itemZoom' + k]: zoom, ['carry' + k]: 0 } : {});
    return t;
  }

  /**
   * GÕ PHÍM (máy tính đặt trên bàn hay quầy trước mặt — `createProp(host, 'laptop')`): hai tay đưa ra trước, các ngón
   * nhấp liên tục, đầu cúi nhìn màn hình; thỉnh thoảng ngẩng lên đọc. `dur` = số giây gõ.
   */
  typing(dur = 2) {
    const t = this.tl(), s = this.s;
    this.#openUp(t);
    t.set(s, { tayL: 'mo', tayR: 'mo' }, 0);
    // CÚI NHÌN MÀN HÌNH rõ ràng: hai bàn tay khuất sau nắp máy, nên ĐẦU và VAI là thứ duy nhất kể chuyện "đang gõ".
    // Bản đầu chỉ hạ đầu 5 đơn vị — nhìn ra vẫn đứng yên nhìn ống kính, như video bị đứng hình (Gemini chấm 1,5/5).
    t.to(s, { batL: TYPE_POSE[0], batR: TYPE_POSE[0], cangL: TYPE_POSE[1], cangR: TYPE_POSE[1], carryL: 0, carryR: 0, dauY: LOOK_DOWN.head, nhinY: LOOK_DOWN.eyes,
              matY: LOOK_DOWN.lids, dau: this.NGHI.dau + 3, cuoi: 0.35, mayL: 0.15, mayR: 0.15, duration: 0.4, ease: 'power2.out' }, 0);
    const beats = Math.max(4, Math.round(dur / 0.12));
    for (let n = 0; n < beats; n++) {
      const side = n % 2 ? 'L' : 'R', a = 0.4 + n * dur / beats;
      // Mỗi nhịp gõ: cẳng tay nảy, VAI bên ấy nhún theo, đầu gật rất nhẹ — nhìn từ trên nắp máy vẫn thấy đang gõ.
      t.to(s, { ['cang' + side]: TYPE_POSE[1] + 6 + (n % 3), vai: (n % 2 ? 1.6 : -1.6) * (side === 'L' ? 1 : 1), dauY: LOOK_DOWN.head + (n % 4 === 0 ? 1.2 : 0),
                duration: dur / beats * 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1 }, a);
    }
    // Ngẩng lên đọc màn hình ở giữa chừng (mắt vẫn nhìn xuống máy), rồi cúi xuống gõ tiếp.
    if (dur > 1.4) t.to(s, { dauY: LOOK_DOWN.head * 0.4, nhinY: LOOK_DOWN.eyes * 0.6, matY: 0, duration: 0.3, ease: 'sine.inOut', yoyo: true, repeat: 1, repeatDelay: 0.35 }, 0.4 + dur * 0.45);
    this.#khep(t, 0.45, 0.45 + dur);
    return t;
  }

  // ĐÍCH THẤP (con vật dưới đất / trên bàn): tay nào vươn tới, góc bắp / cẳng, độ ngả người và độ khuỵu gối. `hand`: ép
  // dùng tay ấy (tay đang cầm ống tiêm); bỏ trống = tay ở phía con vật, tay ấy đang cầm đồ thì tay kia.
  #reachLow(target, hand = null, part = 'head') {
    const s = this.s;
    let tx = 300, ty = 400;
    const live = target && target.live ? target.live : target;
    if (live && typeof live.x === 'number' && typeof live.y === 'number' && !live.el) { tx = live.x - s.x; ty = live.y - s.y - DOI_Y; }
    else if (live) {
      // Vuốt ve nhắm vào ĐẦU (đỉnh đầu); nghe tim phổi và tiêm nhắm vào THÂN (giữa ngực con vật).
      const body = part === 'body' && live.el && (live.el.thanE || live.el.nguc);
      // Trên đầu con vật: đỉnh đầu (vuốt ve, soi tai), ngang mắt, hay MÕM (soi răng, đưa bánh thưởng).
      const headAt = { head: 0.2, eyes: 0.45, mouth: 0.7 }[part] ?? 0.2;
      const node = body || (live.el && live.el.dau ? live.el.dau : live.getBoundingClientRect ? live : null);
      if (node) {
        const r = node.getBoundingClientRect(), sv = this.svg.getBoundingClientRect();
        const unit = Math.min(sv.width / KHUNG.w, sv.height / KHUNG.h) || 1, ox = sv.left + (sv.width - KHUNG.w * unit) / 2, oy = sv.top + (sv.height - KHUNG.h * unit) / 2;
        tx = (r.left + r.width / 2 - ox) / unit - s.x; ty = (r.top + r.height * (body ? 0.35 : headAt) - oy) / unit - s.y - DOI_Y;
      }
    }
    // Tay ở PHÍA con vật; tay ấy đang cầm đồ thì dùng tay kia.
    let k = hand || (tx < HONG.x ? 'L' : 'R');
    if (!hand && this.holds[k] && s['item' + k] > 0.5) k = k === 'L' ? 'R' : 'L';
    // Đích thấp hơn hông (con vật dưới đất) thì KHUỴU GỐI xuống — mượn kênh `seat` — cho bàn tay tới gần hơn; vai hạ
    // theo đúng phần thân vừa hạ, nên góc tay tính từ vai ĐÃ HẠ.
    const crouch = s.seat > 0.5 ? 0 : clamp((ty - HONG.y) / 140, 0, 0.5), drop = DAI.dui * this.nv.daiDui * this.nv.coChan * 0.72 * crouch;
    const shoulder = VAI[k], angle = Math.atan2(ty - (shoulder.y + drop), tx - shoulder.x) * 180 / Math.PI;
    // Thân ngả về phía con vật làm cánh tay bên ấy nhấc lên đúng chừng ấy độ — trừ đi, không thì bàn tay chĩa cao hơn đích.
    const lean = clamp((tx - HONG.x) * 0.06, -9, 9);
    // Tay Ở PHÍA con vật: duỗi thẳng tới nó. Tay BÊN KIA (vì tay phía con vật đang cầm đồ): không duỗi thẳng tới được —
    // cánh tay phải vắt ngang qua thân — nên gập cẳng tay đưa bàn tay sang phía con vật, trước bụng.
    const across = (k === 'L') !== (tx < HONG.x);
    let upper = across ? 8 : clamp(chuanHoaGoc(k === 'L' ? angle - 90 : 90 - angle) - Math.abs(lean), -10, 95), fore = across ? -58 : 0;
    // Đích GẦN hơn chiều dài cánh tay (đầu con vật trên bàn khám, người đứng sát): duỗi thẳng thì bàn tay vượt quá đích,
    // thõng xuống dưới nó — đèn soi rọi vào thành bàn. Gập khuỷu (hai đốt, như `#meetAngles`): khuỷu thấp, cẳng tay
    // hất lên, bàn tay dừng đúng ở đích.
    const armUpper = DAI.canhTay * this.nv.daiCanhTay, armFore = DAI.cangTay * this.nv.daiCangTay;
    const d = Math.hypot(tx - shoulder.x, ty - (shoulder.y + drop));
    if (!across && d < (armUpper + armFore) * 0.96) {
      const alpha = Math.acos(clamp((armUpper * armUpper + d * d - armFore * armFore) / (2 * armUpper * d), -1, 1)) * 180 / Math.PI;
      const beta = Math.acos(clamp((armUpper * armUpper + armFore * armFore - d * d) / (2 * armUpper * armFore), -1, 1)) * 180 / Math.PI;
      upper = clamp(upper - alpha, -15, 95); fore = 180 - beta;
    }
    return { k, upper, fore, lean, crouch, tx, across };
  }

  // Cúi người và đưa tay tới đích thấp (dùng chung cho vuốt ve, nghe tim phổi, tiêm).
  #leanTo(t, reach, hand) {
    const s = this.s, N = this.NGHI, { k, upper, fore, lean, crouch, tx } = reach;
    this.#openUp(t);
    // Góc tay là góc TRÊN MÀN HÌNH (kênh `aim`), tính từ vị trí con vật: đang quay 3/4 về phía nó mà để góc tay bị pha
    // theo góc quay thì cánh tay co ngắn lại và chúc xuống — tay dừng ở mép bàn khám, thiếu cả thân con vật (đo ở cảnh
    // khám bệnh: thiếu 80 px, thấp 46 px).
    t.to(s, { ['aim' + k]: 1, duration: 0.3, ease: 'sine.inOut' }, 0);
    t.set(s, { ['tay' + k]: hand }, 0.02);
    if (crouch) t.to(s, { seat: crouch, duration: 0.45, ease: 'power2.inOut' }, 0);
    t.to(s, { ['bat' + k]: upper, ['cang' + k]: fore, than: N.than - lean, dau: N.dau + lean * 0.8, dauY: 7, nhinX: clamp((tx - HONG.x) * 0.02, -3, 3), nhinY: 2.4, vai: N.vai + 3,
              cuoi: 0.9, mayL: 0.5, mayR: 0.5, duration: 0.45, ease: 'power2.out' }, 0);
  }

  /**
   * VUỐT VE một con vật (hay chạm vào một thứ gì thấp hơn mình): cúi người, đưa bàn tay tới `target` — một rig thú,
   * một phần tử, hoặc { x, y } trong hệ viewBox — rồi vuốt ba nhịp. Không có đích thì vuốt một thứ ở cạnh chân phải.
   */
  stroke(target = null) {
    const t = this.tl(), reach = this.#reachLow(target), { k, upper, fore } = reach, s = this.s;
    this.#leanTo(t, reach, 'xoe');          // bàn tay XOÈ úp lên lưng con vật; dáng thả lỏng nhìn cạnh ở đầu một cánh tay duỗi chéo chỉ là một cái gai
    for (let n = 0; n < 3; n++) {
      t.to(s, { ['cang' + k]: fore - 9, ['bat' + k]: upper - 4, duration: 0.2, ease: 'sine.inOut' }, 0.48 + n * 0.4)
       .to(s, { ['cang' + k]: fore + 5, ['bat' + k]: upper + 3, duration: 0.2, ease: 'sine.inOut' }, 0.68 + n * 0.4);
    }
    this.#chop(t, 1.0);
    this.#khep(t, 0.5, 1.7);
    return t;
  }

  /** VỖ TAY `times` lần trước ngực, cười tươi — khen, chúc mừng. */
  clap(times = 4) {
    const t = this.tl(), s = this.s;
    this.#faceFront(t);
    t.set(s, { tayL: 'xoe', tayR: 'xoe' }, 0.05);
    t.to(s, { batL: CLAP_POSE[0], batR: CLAP_POSE[0], cangL: CLAP_POSE[1] + 22, cangR: CLAP_POSE[1] + 22, carryL: 0, carryR: 0, cuoi: 1, mieng: 0.35, mayL: 0.6, mayR: 0.6,
              duration: 0.3, ease: 'power2.out' }, 0);
    for (let n = 0; n < times; n++) {
      const a = 0.3 + n * 0.32;
      t.to(s, { cangL: CLAP_POSE[1], cangR: CLAP_POSE[1], dauY: 2, duration: 0.12, ease: 'power2.in' }, a)            // chạm
       .to(s, { cangL: CLAP_POSE[1] + 22, cangR: CLAP_POSE[1] + 22, dauY: 0, duration: 0.2, ease: 'power2.out' }, a + 0.12);
    }
    this.#khep(t, 0.45, 0.35 + times * 0.32);
    return t;
  }

  /** ĐẾM NGÓN TAY tới `count` (1…3): giơ tay cạnh vai, một – hai – ba ngón, mỗi ngón một nhịp — liệt kê lợi ích. */
  countFingers(count = 3, { hand = 'auto' } = {}) {
    const t = this.tl(), s = this.s, k = this.#freeHand(hand), m = k === 'L' ? -1 : 1, n = clamp(Math.round(count), 1, 3);
    this.#stage(t, [k]);
    t.to(s, { ['ovBat' + k]: COUNT_POSE[0], ['ovCang' + k]: COUNT_POSE[1], duration: 0.02 }, 0);      // tween ngắn, không `set` ở mốc 0 (xem checkWatch)
    t.set(s, { ['tay' + k]: 'nam' }, 0.02);
    // Bàn tay phóng to 1,7 lần: ở khung trung, ngón tay chibi chỉ là một chấm — đếm không đọc được (Gemini, đợt 3).
    // Góc đặt qua kênh `ov` (bước cuối của apDung) cho đúng dáng khuỷu hạ – cẳng tay dựng.
    t.to(s, { ['ov' + k]: 1, ['handZoom' + k]: 1.7, dau: this.NGHI.dau - m * 3, cuoi: 0.8, mayL: 0.5, mayR: 0.5, duration: 0.35, ease: 'back.out(1.5)' }, 0);
    for (let i = 0; i < n; i++) {
      const a = 0.35 + i * COUNT_BEAT;
      t.set(s, { ['tay' + k]: ['mot', 'hai', 'ba'][i] }, a);
      t.to(s, { ['ovCang' + k]: COUNT_POSE[1] + 8, dauY: 2, duration: 0.12, ease: 'power2.out' }, a)                  // nhấn mỗi ngón
       .to(s, { ['ovCang' + k]: COUNT_POSE[1], dauY: 0, duration: 0.25, ease: 'sine.inOut' }, a + 0.12);
    }
    this.#khep(t, 0.45, 0.45 + n * COUNT_BEAT);
    return t;
  }

  /** XEM ĐỒNG HỒ: giơ cổ tay lên trước ngực, cúi nhìn đồng hồ, rồi ngẩng lên sốt ruột — chờ lâu, trễ hẹn. */
  checkWatch() {
    const t = this.tl(), s = this.s, k = this.#holdsFree('L'), m = k === 'L' ? -1 : 1;
    this.#faceFront(t);
    // Góc `ov` đặt bằng tween rất ngắn, KHÔNG `set` ở mốc 0: trong `sequence()` lệnh `set` đúng mốc 0 của một bước không
    // được vẽ — `ov` lên 1 với góc 0 là tay duỗi thẳng xuống (cảnh quầy lễ tân, giây 4).
    t.to(s, { ['ovBat' + k]: WATCH_POSE[0], ['ovCang' + k]: WATCH_POSE[1], ['watch' + k]: 1, duration: 0.02 }, 0);
    t.set(s, { ['tay' + k]: 'nam' }, 0.02);
    t.to(s, { ['ov' + k]: 1, ['carry' + k]: 0, dauY: 8, nhinY: LOOK_DOWN.eyes, matY: LOOK_DOWN.lids, nhinX: m * 1.2, dau: this.NGHI.dau + m * 4,
              duration: 0.4, ease: 'power2.out' }, 0);
    t.to(s, { mayL: -0.4, mayR: -0.4, cuoi: -0.2, duration: 0.3 }, 0.7);                                             // trễ rồi…
    t.to(s, { dauY: 0, nhinY: -0.6, matY: 0, nhinX: -m * 1.4, dau: this.NGHI.dau, duration: 0.35, ease: 'sine.inOut' }, 1.25);  // ngẩng lên nhìn quanh
    t.to(s, { mieng: 0.12, chum: 0.5, duration: 0.15, yoyo: true, repeat: 1 }, 1.6);                                  // "chậc"
    t.set(s, { ['watch' + k]: 0 }, 2.35);
    this.#khep(t, 0.45, 1.95);
    return t;
  }

  // Đặt nhanh góc `ov` của các tay rồi bật trọng số lên (dáng chính xác của một cử chỉ) — tween ngắn chứ không `set` ở
  // mốc 0 (xem checkWatch). `poses`: { L: [bắp, cẳng], R: [bắp, cẳng] }.
  #ovPose(t, poses, extra = {}, d = 0.4, ease = 'power2.out') {
    const s = this.s, angles = {}, weights = {};
    for (const [k, [upper, fore]] of Object.entries(poses)) { angles['ovBat' + k] = upper; angles['ovCang' + k] = fore; weights['ov' + k] = 1; weights['carry' + k] = 0; }
    t.to(s, { ...angles, duration: 0.02 }, 0);
    t.to(s, { ...weights, ...extra, duration: d, ease }, 0);
  }

  // Tay rảnh để cử chỉ một tay; cả hai tay đều cầm đồ thì không có tay nào — trả null.
  #gestureHand(hand) {
    const k = this.#freeHand(hand);
    return this.holds[k] && this.s['item' + k] > 0.5 ? null : k;
  }

  /** SUY NGHĨ `hold` giây: tay chống cằm, tay kia vắt ngang bụng đỡ khuỷu, mắt nhìn lên một bên, gõ nhẹ ngón vào cằm. */
  ponder(hold = 1.8, { hand = 'auto' } = {}) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this.#gestureHand(hand), m = k === 'L' ? -1 : 1;
    if (!k) return this.express('thinking', hold + 0.6);
    const other = k === 'L' ? 'R' : 'L', otherFree = !(this.holds[other] && s['item' + other] > 0.5);
    this.#faceFront(t);
    this.#ovPose(t, otherFree ? { [k]: PONDER_POSE, [other]: HUG_ARM_POSE } : { [k]: PONDER_POSE },
      { dau: N.dau - m * 6, dauY: 17, nhinX: m * 2.2, nhinY: -1.8, mayL: m > 0 ? 0.2 : 0.75, mayR: m > 0 ? 0.75 : 0.2, chum: 0.45, cuoi: 0.2, duration: 0.45 });
    t.set(s, { ['tay' + k]: 'nam', ...(otherFree ? { ['tay' + other]: 'mo' } : {}) }, 0.05);
    for (let a = 0.6, n = 0; a + 0.3 < 0.45 + hold; a += 0.5, n++) t.to(s, { ['ovCang' + k]: PONDER_POSE[1] + 6, duration: 0.12, ease: 'sine.out', yoyo: true, repeat: 1 }, a);
    this.#khep(t, 0.45, 0.45 + hold);
    return t;
  }

  /** KHOANH TAY `hold` giây: hai cẳng tay chéo trước ngực, nghiêng đầu, một bên mày nhướng — hoài nghi, chờ đợi, "để xem". */
  crossArms(hold = 2) {
    const t = this.tl(), s = this.s, N = this.NGHI;
    if (['L', 'R'].some((side) => this.holds[side] && s['item' + side] > 0.5)) return this.#headGesture(t, 2, -5);
    this.#faceFront(t);
    this.#ovPose(t, FOLD_POSE, { dau: N.dau + 5, dauY: -2, mayL: 0.85, mayR: 0.1, cuoi: 0.15, nhinX: -1, vai: N.vai - 2 });
    t.set(s, { tayL: 'nam', tayR: 'nam' }, 0.05);
    t.to(s, { dau: N.dau + 8, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.5 + hold * 0.3);
    this.#khep(t, 0.45, 0.4 + hold);
    return t;
  }

  /** CHỐNG NẠNH `hold` giây: hai tay úp vào hông, khuỷu dang ra, ưỡn ngực, cười tự tin. */
  handsOnHips(hold = 2) {
    const t = this.tl(), s = this.s, N = this.NGHI;
    const sides = ['L', 'R'].filter((side) => !(this.holds[side] && s['item' + side] > 0.5));
    if (!sides.length) return this.#headGesture(t, 2, -5);
    this.#faceFront(t);
    this.#ovPose(t, Object.fromEntries(sides.map((side) => [side, HIPS_POSE])), { dauY: -3, vai: N.vai - 3, cuoi: 1, mayL: 0.6, mayR: 0.6, tho: 1 });
    t.set(s, Object.fromEntries(sides.map((side) => ['tay' + side, 'nam'])), 0.05);
    t.to(s, { dau: N.dau + 4, duration: 0.35, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.6);
    this.#khep(t, 0.45, 0.4 + hold);
    return t;
  }

  /** GIỚI THIỆU MÌNH: đặt bàn tay lên ngực, nghiêng đầu cười, gật nhẹ — "tôi là…", "cảm ơn". */
  introduce(hand = 'auto') {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this.#gestureHand(hand);
    if (!k) return this.nod();
    this.#ovPose(t, { [k]: CHEST_POSE }, { cuoi: 1, mayL: 0.55, mayR: 0.55, dau: N.dau + (k === 'L' ? 4 : -4) });
    t.set(s, { ['tay' + k]: 'xoe' }, 0.05);
    t.to(s, { dauY: 9, matY: 0.4, duration: 0.25, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.55);
    this.#khep(t, 0.45, 1.5);
    return t;
  }

  /** GỌI TO: giơ cao một tay vẫy, ngẩng đầu, miệng mở to — "Mời bé Milo vào khám!", gọi ai từ xa. */
  callOut(hold = 1.2, { hand = 'auto' } = {}) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this.#gestureHand(hand), m = k === 'L' ? -1 : 1;
    if (!k) return this.#headGesture(t, 2, -5);
    this.#faceFront(t);
    this.#ovPose(t, { [k]: HAIL_POSE }, { dauY: -5, dau: N.dau - m * 4, mayL: 0.8, mayR: 0.8, cuoi: 0.5, nhinX: m * 1.5, duration: 0.35 });
    for (let n = 0; n < 4; n++) t.to(s, { ['ovCang' + k]: HAIL_POSE[1] + (n % 2 ? -16 : 16), duration: 0.18, ease: 'sine.inOut' }, 0.4 + n * 0.18);
    t.set(s, { ['tay' + k]: 'xoe' }, 0.05);
    // Hai tiếng gọi: miệng mở to, đầu nhấn theo.
    for (const a of [0.4, 0.4 + hold * 0.55]) t.to(s, { mieng: 0.9, chum: 0, dauY: -8, duration: 0.12, ease: 'power2.out' }, a).to(s, { mieng: 0.25, dauY: -5, duration: hold * 0.4, ease: 'sine.inOut' }, a + 0.12);
    this.#khep(t, 0.4, 0.45 + hold);
    return t;
  }

  /** THỞ PHÀO: đặt tay lên ngực, nhắm mắt, vai trĩu xuống một hơi dài, rồi cười nhẹ nhõm — "may quá, bé khỏe rồi". */
  relief(hand = 'auto') {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this.#gestureHand(hand);
    if (!k) return this.express('happy', 1.6);
    this.#ovPose(t, { [k]: CHEST_POSE }, { matY: 0.85, mieng: 0.3, chum: 0.6, cuoi: 0.4, tho: 1, vai: N.vai - 3, dauY: -2, duration: 0.45 });
    t.set(s, { ['tay' + k]: 'xoe' }, 0.05);
    // Thở ra: vai và đầu trĩu xuống, miệng chúm thổi hơi, rồi mở mắt cười.
    t.to(s, { tho: 0, vai: N.vai + 4, dauY: 8, mieng: 0.15, duration: 0.8, ease: 'sine.inOut' }, 0.5);
    t.to(s, { matY: 0, chum: 0, cuoi: 1, mayL: 0.6, mayR: 0.6, dauY: 2, duration: 0.35, ease: 'power2.out' }, 1.35);
    this.#khep(t, 0.45, 1.9);
    return t;
  }

  /** GIẬT MÌNH: người giật lùi, hai bàn tay xoè giơ lên cạnh vai, mắt tròn, miệng chữ O, rồi hoàn hồn. */
  startle() {
    const t = this.tl(), s = this.s, N = this.NGHI;
    const sides = ['L', 'R'].filter((side) => !(this.holds[side] && s['item' + side] > 0.5));
    this.#faceFront(t, 0.1);
    this.#ovPose(t, Object.fromEntries(sides.map((side) => [side, STARTLE_POSE])), { dauY: -7, vai: N.vai - 6, mieng: 0.85, chum: 0.6, cuoi: -0.2, mayL: 1, mayR: 1, nhinY: -0.6, duration: 0.14, ease: 'back.out(2)' });
    if (sides.length) t.set(s, Object.fromEntries(sides.map((side) => ['tay' + side, 'xoe'])), 0.03);
    t.to(s, { x: s.x - 5, duration: 0.12, ease: 'power2.out' }, 0).to(s, { x: s.x, duration: 0.4, ease: 'sine.inOut' }, 0.6);
    this.#chop(t, 0.75);
    t.to(s, { mieng: 0.3, chum: 0.2, duration: 0.3 }, 0.7);
    this.#khep(t, 0.45, 1.0);
    return t;
  }

  /** NGÓ QUANH: quay đầu nhìn sang trái, sang phải, rồi về — tìm ai đó, tìm thú cưng đi lạc. */
  lookAround() {
    const t = this.tl(), s = this.s, N = this.NGHI, h = s.huong;
    t.to(s, { huong: clamp(h - 0.35, -1, 1), dau: N.dau + 5, dauX: -4, nhinX: -2.6, mayL: 0.6, mayR: 0.6, cuoi: 0.3, duration: 0.4, ease: 'power2.inOut' }, 0);
    t.to(s, { huong: clamp(h + 0.35, -1, 1), dau: N.dau - 5, dauX: 4, nhinX: 2.6, duration: 0.6, ease: 'power2.inOut' }, 0.9);
    this.#chop(t, 1.6);
    this.#khep(t, 0.45, 2.0);
    return t;
  }

  /**
   * ĐI VỘI / CHẠY: như `walk` (ngang, đứng lại ở đích) nhưng nhịp chân nhanh gần gấp rưỡi, sải dài, nhón người — tình
   * huống khẩn cấp. `hurry()` chạy tại chỗ; `hurry(6, 200)` chạy 200 đơn vị sang phải.
   */
  hurry(buoc = 6, quang = 0) {
    const t = this.tl(), s = this.s, chieu = quang < 0 ? -1 : 1;
    t.to(s, { huong: chieu, cuoi: 0.2, mayL: 0.85, mayR: 0.85, mieng: 0.25, duration: 0.25, ease: 'power2.inOut' }, 0);
    if (quang) {
      const x0 = s.x, d = this.#doBuoc(Math.abs(quang), true, true);
      const at = this.#di(t, 0.1, d.buoc, 0.3, { kA: d.kA, chieu, x: (b) => x0 + chieu * d.x(b) });
      this.#khep(t, 0.4, at, { x: x0 + quang });
    } else {
      const at = this.#di(t, 0.1, buoc, 0.3, { kA: 1.2 });
      this.#khep(t, 0.4, at);
    }
    return t;
  }

  /** CHÊ: ngón cái chĩa xuống trước ngực, mặt nhăn, lắc đầu nhẹ — "không nên", "sai rồi". Đi cặp với `thumbsUp`. */
  thumbsDown(hand = 'auto') {
    const t = this.tl(), s = this.s, N = this.NGHI;
    if (this.#handsFull(hand)) return this.shake();
    const k = this.#chestHand(hand);
    // Bàn tay đưa RA BÊN thân (không đặt giữa ngực, chỗ ống nghe / cà vạt): nắm tay giữa ngực lẫn vào áo (Gemini, đợt 5).
    this.#ovPose(t, { [k]: [40, -112] }, { ['handZoom' + k]: 1.45, cuoi: -0.6, mayL: 0.95, mayR: 0.95, mieng: 0.1, chum: 0.3, duration: 0.35, ease: 'back.out(1.5)' });
    t.set(s, { ['tay' + k]: 'xuong' }, 0.05);
    for (let n = 0; n < 4; n++) t.to(s, { dau: N.dau + (n % 2 ? -5 : 5), duration: 0.16, ease: 'sine.inOut' }, 0.45 + n * 0.16);
    t.to(s, { ['ovCang' + k]: -104, duration: 0.15, ease: 'power2.out', yoyo: true, repeat: 1 }, 0.5);
    this.#khep(t, 0.45, 1.3);
    return t;
  }

  /** CHẶN LẠI: giơ lòng bàn tay ra trước ngực, mặt nghiêm, nhấn một cái — "dừng lại!", "đừng cho chó ăn sô-cô-la". */
  stopSign(hold = 1.2, { hand = 'auto' } = {}) {
    const t = this.tl(), s = this.s, k = this.#gestureHand(hand);
    if (!k) return this.shake();
    this.#faceFront(t);
    this.#ovPose(t, { [k]: STOP_POSE }, { ['handZoom' + k]: 1.45, cuoi: -0.3, mayL: 0.15, mayR: 0.15, chum: 0.2, dauY: -2, duration: 0.25, ease: 'back.out(1.8)' });
    t.set(s, { ['tay' + k]: 'xoe' }, 0.05);
    t.to(s, { ['handZoom' + k]: 1.6, dauY: 2, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 }, 0.35);
    this.#khep(t, 0.4, 0.35 + hold);
    return t;
  }

  /** LẮC NGÓN TAY "không không": ngón trỏ giơ cạnh vai lắc qua lại, lắc đầu, môi mím. */
  fingerWag(times = 3, { hand = 'auto' } = {}) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this.#gestureHand(hand);
    if (!k) return this.shake();
    this.#ovPose(t, { [k]: WAG_POSE }, { ['handZoom' + k]: 1.5, cuoi: -0.1, chum: 0.5, mayL: 0.3, mayR: 0.3, duration: 0.3 });
    t.set(s, { ['tay' + k]: 'mot' }, 0.05);
    for (let n = 0; n < times * 2; n++) t.to(s, { ['ovCang' + k]: WAG_POSE[1] + (n % 2 ? -14 : 14), dau: N.dau + (n % 2 ? -4 : 4), duration: 0.15, ease: 'sine.inOut' }, 0.35 + n * 0.15);
    this.#khep(t, 0.4, 0.4 + times * 0.3);
    return t;
  }

  /** VẪY GỌI LẠI GẦN: bàn tay ngửa đưa ra bên hông, các ngón vẫy vào mấy nhịp, cười, nghiêng đầu — gọi thú cưng, mời khách. */
  beckon(times = 3, { hand = 'auto' } = {}) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this.#gestureHand(hand), m = k === 'L' ? -1 : 1;
    if (!k) return this.nod();
    this.#ovPose(t, { [k]: BECKON_POSE }, { cuoi: 1, mayL: 0.6, mayR: 0.6, dau: N.dau + m * 5, duration: 0.3 });
    t.set(s, { ['tay' + k]: 'xoe' }, 0.05);
    for (let n = 0; n < times; n++) {
      const a = 0.35 + n * 0.36;
      t.set(s, { ['tay' + k]: 'mo' }, a + 0.12).set(s, { ['tay' + k]: 'xoe' }, a + 0.3);
      t.to(s, { ['ovCang' + k]: BECKON_POSE[1] + 28, duration: 0.15, ease: 'power2.in' }, a).to(s, { ['ovCang' + k]: BECKON_POSE[1], duration: 0.2, ease: 'power2.out' }, a + 0.15);
    }
    this.#khep(t, 0.4, 0.4 + times * 0.36);
    return t;
  }

  /** BẮN TIM: nắm tay trước ngực, ngón cái – ngón trỏ bắt chéo, một trái tim đỏ bật ra và đập hai nhịp, nháy mắt cười. */
  fingerHeart(hold = 1.4, { hand = 'auto' } = {}) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this.#gestureHand(hand), m = k === 'L' ? -1 : 1;
    if (!k) return this.express('happy', hold);
    this.#faceFront(t);
    this.#ovPose(t, { [k]: HEART_POSE }, { ['handZoom' + k]: 1.6, cuoi: 1, mieng: 0.25, mayL: 0.6, mayR: 0.6, dau: N.dau - m * 6, duration: 0.3, ease: 'back.out(1.6)' });
    t.set(s, { ['tay' + k]: 'tim' }, 0.05);
    t.to(s, { ['heart' + k]: 1, duration: 0.3, ease: 'back.out(3)' }, 0.3);
    t.to(s, { matY: 0.75, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 }, 0.5);         // nháy mắt
    for (let n = 0; n < 2; n++) t.to(s, { ['heart' + k]: 1.25, duration: 0.14, ease: 'power2.out', yoyo: true, repeat: 1 }, 0.75 + n * 0.4);
    t.to(s, { ['heart' + k]: 0, duration: 0.2, ease: 'power2.in' }, 0.3 + hold);
    t.set(s, { ['tay' + k]: 'mo' }, 0.55 + hold);                 // hạ tay thì buông dáng tay: hình bắn tim xuống tới hông trông lạc lõng
    this.#khep(t, 0.4, 0.45 + hold);
    return t;
  }

  /** TẠO DÁNG CHỮ V: hai ngón tay giơ cạnh mặt, nghiêng đầu, cười tươi, nháy mắt — chụp ảnh, chào kết video. */
  vSign(hold = 1.4, { hand = 'auto' } = {}) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this.#gestureHand(hand), m = k === 'L' ? -1 : 1;
    if (!k) return this.express('happy', hold);
    this.#faceFront(t);
    this.#ovPose(t, { [k]: VSIGN_POSE }, { ['handZoom' + k]: 1.6, cuoi: 1, mieng: 0.35, mayL: 0.6, mayR: 0.6, dau: N.dau + m * 8, dauX: m * 2, duration: 0.3, ease: 'back.out(1.6)' });
    t.set(s, { ['tay' + k]: 'hai' }, 0.05);
    t.to(s, { matY: 0.75, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 }, 0.5);
    t.to(s, { ['ovCang' + k]: VSIGN_POSE[1] - 8, duration: 0.18, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.75);
    t.set(s, { ['tay' + k]: 'mo' }, 0.45 + hold);
    this.#khep(t, 0.4, 0.35 + hold);
    return t;
  }

  /**
   * GÃI GÁY: khuỷu giơ cạnh đầu, bàn tay vòng ra SAU đầu gãi mấy nhịp, cười ngượng, mắt nhìn lên — bối rối, quên mất,
   * xin lỗi. Tay chibi ngắn không với tới đỉnh đầu; đưa bàn tay ra trước thì nó che mất miệng (đọc thành cười thầm).
   */
  scratchHead(hand = 'auto') {
    const t = this.tl(), s = this.s, k = this.#freeHand(hand), m = k === 'L' ? -1 : 1;
    this.#faceFront(t);
    t.to(s, { ['ovBat' + k]: NAPE_POSE[0], ['ovCang' + k]: NAPE_POSE[1], ['sauDau' + k]: 1, duration: 0.02 }, 0);      // tween ngắn, không `set` ở mốc 0 (xem checkWatch)
    t.set(s, { ['tay' + k]: 'nam' }, 0.05);
    t.to(s, { ['ov' + k]: 1, dau: this.NGHI.dau - m * 8, dauX: -m * 3, nhinY: -1.6, nhinX: m, cuoi: 0.6, matY: 0.3, mayL: 0.7, mayR: 0.7, doMa: 0.5,
              duration: 0.4, ease: 'power2.out' }, 0);
    for (let n = 0; n < 4; n++) t.to(s, { ['ovCang' + k]: NAPE_POSE[1] + (n % 2 ? 10 : -10), duration: 0.14, ease: 'sine.inOut' }, 0.45 + n * 0.14);
    // Cánh tay ở SAU đầu suốt lúc hạ xuống, chỉ về trước đầu khi đã hạ hẳn: đổi lớp giữa chừng thì nắm tay đang còn giơ
    // cao thoáng hiện ra cạnh đầu (Gemini: "giơ nắm đấm sát đầu").
    // Hạ tay theo đường của người thật: khuỷu hạ xuống trong khi cẳng tay GẬP SÂU thêm (bàn tay vẫn khuất sau vai), rồi mới buông. Nội suy
    // thẳng từ dáng giơ cao về dáng nghỉ thì cánh tay quét ngang ra ngoài, ngang đầu người đứng cạnh.
    t.to(s, { ['ovBat' + k]: 50, ['ovCang' + k]: 160, duration: 0.25, ease: 'sine.inOut' }, 1.2);
    t.set(s, { ['tay' + k]: 'mo' }, 1.3);                 // buông tay: bàn tay thả lỏng, không còn nắm (nắm tay ngang vai đọc thành giơ nắm đấm)
    this.#khep(t, 0.3, 1.45, { ['sauDau' + k]: 1 });
    t.set(s, { ['sauDau' + k]: 0 }, 1.76);
    return t;
  }

  /** ÔM MẶT: hai bàn tay áp lên hai má, đầu gục xuống, nhắm mắt, lắc đầu — quá tải, rối tung (giấy tờ, lịch hẹn chồng chéo). */
  headInHands(hold = 1.4) {
    const t = this.tl(), s = this.s;
    this.#faceFront(t);
    // Khuỷu HẠ xuống, hai bàn tay áp hai bên má (kênh đặt góc cuối `ov`); đầu gục xuống đón tay — tay chibi ngắn chỉ tới
    // ngang cằm. Bản trước để khuỷu dang ngang như cánh máy bay, đọc thành vươn vai.
    t.to(s, { ovBatL: FACE_HANDS_POSE[0], ovBatR: FACE_HANDS_POSE[0], ovCangL: FACE_HANDS_POSE[1], ovCangR: FACE_HANDS_POSE[1], duration: 0.02 }, 0);   // tween ngắn (xem checkWatch)
    t.set(s, { tayL: 'xoe', tayR: 'xoe' }, 0.05);
    t.to(s, { ovL: 1, ovR: 1, carryL: 0, carryR: 0, dauY: 18, matY: 0.85, cuoi: -0.7, mieng: 0.2, mayL: 1, mayR: 1, vai: this.NGHI.vai - 4, duration: 0.4, ease: 'power2.out' }, 0);
    for (let n = 0; n < 3; n++) t.to(s, { dau: (n % 2 ? -1 : 1) * 6, duration: 0.22, ease: 'sine.inOut' }, 0.45 + n * 0.22);
    t.to(s, { dau: this.NGHI.dau, duration: 0.2 }, 0.45 + 3 * 0.22);
    t.to(s, { mieng: 0.05, duration: 0.3 }, 0.45 + hold * 0.6);
    this.#khep(t, 0.5, 0.45 + hold);
    return t;
  }

  /** CÚI CHÀO: đầu và vai cúi xuống, mắt nhắm, giữ một nhịp rồi ngẩng lên cười — cảm ơn, xin lỗi, chào khách. */
  bow(depth = 1) {
    const t = this.tl(), s = this.s, d = clamp(depth, 0.3, 1.5);
    this.#openUp(t);
    this.#faceFront(t);
    t.to(s, { dauY: 24 * d, vai: this.NGHI.vai + 6 * d, seat: s.seat > 0.5 ? s.seat : 0.12 * d, matY: 0.8, cuoi: 0.6, duration: 0.45, ease: 'power2.inOut' }, 0);
    t.to(s, { dauY: 0, vai: this.NGHI.vai, seat: s.seat, matY: 0, cuoi: 1, duration: 0.4, ease: 'power2.out' }, 1.05);
    this.#khep(t, 0.35, 1.45);
    return t;
  }

  /** CHẮP TAY CHÀO kiểu Thái (wai): hai lòng bàn tay áp vào nhau trước ngực, cúi đầu nhẹ, cười. */
  wai() {
    const t = this.tl(), s = this.s;
    this.#faceFront(t);
    t.set(s, { tayL: 'xoe', tayR: 'xoe' }, 0.05);
    t.to(s, { batL: WAI_POSE[0], batR: WAI_POSE[0], cangL: WAI_POSE[1], cangR: WAI_POSE[1], carryL: 0, carryR: 0, cuoi: 0.8, duration: 0.4, ease: 'power2.out' }, 0);
    t.to(s, { dauY: 10, matY: 0.6, duration: 0.35, ease: 'power2.inOut' }, 0.45)
     .to(s, { dauY: 0, matY: 0, cuoi: 1, duration: 0.35, ease: 'power2.out' }, 1.15);
    this.#khep(t, 0.45, 1.6);
    return t;
  }

  /**
   * BẮT TAY người kia (`target`: rig, 'left' | 'right'): đưa bàn tay phía người ấy ra ngang hông, lắc ba nhịp, cười.
   * Chạy cùng nhịp với `handshake` của người kia (`together`). Tay ấy đang cầm đồ thì dùng tay kia.
   */
  handshake(target = null) {
    const t = this.tl(), s = this.s, N = this.NGHI;
    const dir = this.#towards(target, 'R'), k = this.#holdsFree(dir > 0 ? 'R' : 'L');
    const pose = this.#meetAngles(target, k, 0.55) || { bat: SHAKE_POSE[0], cang: SHAKE_POSE[1] };
    this.#stage(t, [k]);
    t.set(s, { ['tay' + k]: 'xoe' }, 0.05);
    t.to(s, { ['bat' + k]: pose.bat, ['cang' + k]: pose.cang, ['carry' + k]: 0, than: N.than - dir * 3, dau: N.dau + dir * 3, nhinX: dir * 1.6, cuoi: 1, mayL: 0.5, mayR: 0.5,
              duration: 0.45, ease: 'power2.out' }, 0);
    // Lắc tay: cả cánh tay nhấp lên xuống quanh điểm gặp (bắp tay ±4°, cẳng tay bù lại cho bàn tay đi theo phương đứng).
    for (let n = 0; n < 3; n++) {
      t.to(s, { ['bat' + k]: pose.bat + 4, ['cang' + k]: pose.cang - 6, duration: 0.13, ease: 'sine.inOut' }, 0.5 + n * 0.26)
       .to(s, { ['bat' + k]: pose.bat - 3, ['cang' + k]: pose.cang + 4, duration: 0.13, ease: 'sine.inOut' }, 0.63 + n * 0.26);
    }
    this.#khep(t, 0.45, 1.35);
    return t;
  }

  // ĐIỂM GẶP của hai bàn tay khi bắt tay, và góc tay để tới đó. Hai người khác chiều cao mà mỗi người đưa tay theo
  // một dáng cố định thì bàn tay người lớn chìa ngang mặt đứa bé, còn tay đứa bé ở dưới bụng — không bao giờ chạm. Điểm
  // gặp: giữa hai vai theo chiều ngang; cao độ là trung bình hai vai, hạ xuống `drop` × chiều dài tay. Góc tay: IK hai
  // đốt, khuỷu chúc xuống; xa quá tầm thì duỗi thẳng về phía ấy. (Đập tay đã thử và bỏ: đầu chibi chắn đúng chỗ hai bàn
  // tay phải gặp nhau khi đứng gần, đứng xa thì tay không tới.) Đích không phải rig
  // ('left' | 'right') thì trả về `null` — dùng dáng mặc định.
  #meetAngles(target, k, drop) {
    if (!(target && target.el && target.svg && this.svg.getScreenCTM && target.svg.getScreenCTM)) return null;
    const other = this.#towards(target, k) > 0 ? 'L' : 'R';
    const mine = new DOMPoint(0, 0).matrixTransform(this.el['bat' + k].getScreenCTM()), theirs = new DOMPoint(0, 0).matrixTransform(target.el['bat' + other].getScreenCTM());
    const sv = this.svg.getBoundingClientRect(), unit = Math.min(sv.width / KHUNG.w, sv.height / KHUNG.h) || 1;
    const ox = sv.left + (sv.width - KHUNG.w * unit) / 2, oy = sv.top + (sv.height - KHUNG.h * unit) / 2, s = this.s;
    // Cổ tay (không phải đầu ngón) tới điểm gặp: hai bàn tay chồng lên nhau ở đó, như đang nắm / chạm.
    const upper = DAI.canhTay * this.nv.daiCanhTay, fore = DAI.cangTay * this.nv.daiCangTay, reach = upper + fore;
    // CÙNG MỘT điểm cho cả hai người (tính trên màn hình): độ hạ / nâng theo chiều dài tay TRUNG BÌNH của hai người, tính
    // bằng px. Mỗi người tính theo tay mình thì hai người nhắm hai điểm khác nhau — người lớn với tay cao hơn đứa bé.
    const ts = target.svg.getBoundingClientRect(), theirUnit = Math.min(ts.width / KHUNG.w, ts.height / KHUNG.h) || unit;
    const theirReach = target.nv ? DAI.canhTay * (target.nv.daiCanhTay || 1) + DAI.cangTay * (target.nv.daiCangTay || 1) : reach;
    const meetY = (mine.y + theirs.y) / 2 + drop * (reach * unit + theirReach * theirUnit) / 2;
    // Bắt tay: mỗi người vươn QUÁ điểm giữa một chút về phía người kia — hai bàn tay chồng lên nhau, không hở.
    const meetX = (mine.x + theirs.x) / 2 + Math.sign(theirs.x - mine.x) * 6 * unit;
    const sx = this.#shoulderX(k), sy = this.#shoulderY();
    const mx = (meetX - ox) / unit - s.x, my = (meetY - oy) / unit - s.y - DOI_Y;
    const dx = mx - sx, dy = my - sy, d = Math.max(1, Math.hypot(dx, dy));
    const phi = Math.atan2(dy, dx) * 180 / Math.PI, toward = k === 'L' ? phi - 90 : 90 - phi;      // 0 = thõng xuống, dương = đưa ra phía tay ấy
    if (d >= reach * 0.98) return { bat: clamp(chuanHoaGoc(toward), -15, 172), cang: 6 };
    const alpha = Math.acos(clamp((upper * upper + d * d - fore * fore) / (2 * upper * d), -1, 1)) * 180 / Math.PI;
    const beta = Math.acos(clamp((upper * upper + fore * fore - d * d) / (2 * upper * fore), -1, 1)) * 180 / Math.PI;
    return { bat: clamp(chuanHoaGoc(toward - alpha), -15, 172), cang: 180 - beta };
  }

  // QUAY VỀ PHÍA NGƯỜI XEM trong lúc diễn (cử chỉ hai tay, cử chỉ "khoe"); `#khep` trả lại hướng đang giữ. Ở dáng 3/4 tay
  // phía xa nằm sau thân: vỗ tay, chắp tay chỉ còn thấy một tay (Gemini, đợt 3).
  #faceFront(t, d = 0.3) {
    if (Math.abs(this.s.huong) > 0.02) t.to(this.s, { huong: 0, duration: d, ease: 'sine.inOut' }, 0);
  }

  // Tay `preferred` nếu nó rảnh; đang cầm đồ thì tay kia.
  #holdsFree(preferred) {
    const busy = (side) => this.holds[side] && this.s['item' + side] > 0.5;
    return busy(preferred) && !busy(preferred === 'L' ? 'R' : 'L') ? (preferred === 'L' ? 'R' : 'L') : preferred;
  }

  /**
   * KHÁM BẰNG ĐÈN SOI: cúi xuống, đưa cây đèn soi (hiện ra trong tay) tới `part` của con vật `target` — 'ears' (tai,
   * mặc định), 'eyes' (mắt), 'teeth' (răng: soi vào mõm; cho con vật `openMouth` cùng lúc) — soi hai chỗ, đầu nghiêng
   * nhìn kỹ, rồi gật.
   */
  examine(target = null, part = 'ears', hold = 1.4) {
    const spot = { ears: 'head', eyes: 'eyes', teeth: 'mouth' }[part];
    if (!spot) throw new Error(`[character] examine: part must be 'ears', 'eyes' or 'teeth', got ${JSON.stringify(part)}`);
    const t = this.tl(), s = this.s, N = this.NGHI, reach = this.#reachLow(target, null, spot), { k, upper, fore } = reach, m = k === 'L' ? -1 : 1;
    this.#leanTo(t, reach, 'nam');
    t.set(s, { ['gadget' + k]: 1 }, 0.1);
    t.to(s, { dau: N.dau + m * 6 + reach.lean * 0.8, dauY: 9, nhinY: 2.6, mayL: 0.2, mayR: 0.2, cuoi: 0.45, chum: 0.25, duration: 0.35, ease: 'sine.inOut' }, 0.45);
    // Soi chỗ thứ nhất, nhích đèn sang chỗ thứ hai, rồi gật: "ổn".
    t.to(s, { ['bat' + k]: upper + 3, ['cang' + k]: fore - 5, duration: 0.25, ease: 'sine.inOut' }, 0.5 + hold * 0.45);
    t.to(s, { ['bat' + k]: upper, ['cang' + k]: fore, duration: 0.25, ease: 'sine.inOut' }, 0.5 + hold * 0.8);
    t.to(s, { dauY: 12, cuoi: 0.9, chum: 0, mayL: 0.5, mayR: 0.5, duration: 0.18, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.5 + hold);
    this.#khep(t, 0.5, 0.9 + hold);
    return t;
  }

  /**
   * CHO ĂN BÁNH THƯỞNG: cúi xuống, chìa cái bánh xương (hiện ra trong tay) tới MÕM con vật `target`, đợi nó đớp (bánh
   * biến mất), cười rồi thu tay về. Cho con vật `beg` rồi `eat` cùng lúc trong một `together`. `{ kind: 'pill' }`: cho
   * uống một VIÊN THUỐC thay cho bánh.
   */
  giveTreat(target = null, { kind = 'treat' } = {}) {
    if (kind !== 'treat' && kind !== 'pill') throw new Error(`[character] giveTreat: kind must be 'treat' or 'pill', got ${JSON.stringify(kind)}`);
    const t = this.tl(), s = this.s, N = this.NGHI, reach = this.#reachLow(target, null, 'mouth'), { k, upper, fore } = reach;
    this.#leanTo(t, reach, 'nam');
    t.set(s, { ['gadget' + k]: kind === 'pill' ? 3 : 2 }, 0.05);
    t.to(s, { cuoi: 1, mieng: 0.25, mayL: 0.6, mayR: 0.6, duration: 0.3 }, 0.4);
    // Chìa tới thêm một chút, con vật đớp (bánh mất), tay rụt lại một nhịp.
    t.to(s, { ['bat' + k]: upper + 3, ['cang' + k]: fore - 4, duration: 0.25, ease: 'sine.out' }, 0.6);
    t.set(s, { ['gadget' + k]: 0 }, 1.05);
    t.to(s, { ['bat' + k]: upper - 4, ['cang' + k]: fore + 6, dauY: N.dauY + 3, duration: 0.18, ease: 'power2.out' }, 1.05);
    this.#khep(t, 0.5, 1.4);
    return t;
  }

  /**
   * CHẢI LÔNG: cúi xuống, cây lược hiện trong tay, chải dọc lưng con vật `target` bốn đường dài, cười — dịch vụ grooming.
   */
  brush(target = null, strokes = 4) {
    const t = this.tl(), s = this.s, reach = this.#reachLow(target, null, 'body'), { k, upper, fore } = reach;
    this.#leanTo(t, reach, 'nam');
    t.set(s, { ['gadget' + k]: 4 }, 0.1);
    for (let n = 0; n < strokes; n++) {
      t.to(s, { ['bat' + k]: upper + 7, ['cang' + k]: fore - 6, duration: 0.24, ease: 'sine.inOut' }, 0.48 + n * 0.42)
       .to(s, { ['bat' + k]: upper - 4, ['cang' + k]: fore + 8, duration: 0.18, ease: 'sine.inOut' }, 0.72 + n * 0.42);
    }
    this.#chop(t, 1.0);
    this.#khep(t, 0.5, 0.5 + strokes * 0.42);
    return t;
  }

  /**
   * DẮT con vật `pet` bằng dây: dây hiện ra từ quai dây trong tay (`items: { R: 'leash' }`) tới vòng cổ nó, và GIỮ (thế
   * dắt) — `walk` của người và của con vật trong một `together` là dắt nó đi dạo; dây bám theo cả hai. `unleash()` tháo dây.
   */
  leash(pet) {
    if (!pet || !pet.el || !pet.el.vong || pet instanceof RigSVG) throw new Error('[character] leash(pet): pet must be a pet rig (createPet(...).rig)');
    const s = this.s, k = ['R', 'L'].find((side) => this.holds[side] && s['item' + side] > 0.5 && this.el['item' + side].querySelector('[data-leash]'));
    if (!k) throw new Error('[character] leash: the character is not holding a leash — give it one: createCharacter(host, { id, items: { R: "leash" } })');
    if (this.leashed && this.leashed !== pet && s.leash >= 0.5) throw new Error('[character] leash: already walking another pet — unleash() first');
    this.leashed = pet; this.leashHand = k;
    pet.onDraw = () => this.#drawLeash();
    const t = this.tl();
    // Cúi nhìn con vật, móc dây vào cổ nó (dây hiện), rồi đứng thẳng lên — vẫn giữ dây.
    t.to(s, { dauY: 6, nhinY: 2.2, cuoi: 0.9, duration: 0.3, ease: 'sine.out' }, 0);
    t.set(s, { leash: 1 }, 0.35);
    this.#khep(t, 0.4, 0.55, { leash: 1 });
    return t;
  }

  /** THÁO DÂY con vật đang dắt (`leash`): dây biến mất, người về dáng nghỉ, vẫn cầm quai dây. */
  unleash() {
    if (!this.leashed || this.s.leash < 0.5) throw new Error('[character] unleash: the character is not walking a pet — leash(pet) first');
    const t = this.tl(), s = this.s;
    t.to(s, { dauY: 6, nhinY: 2.2, duration: 0.3, ease: 'sine.out' }, 0);
    t.set(s, { leash: 0 }, 0.35);
    this.#khep(t, 0.4, 0.55, { leash: 0 });
    return t;
  }

  /**
   * NGHE TIM PHỔI: cúi xuống, áp mặt ống nghe (cầm trong tay, nối dây lên cổ) vào con vật `target`, giữ `hold` giây —
   * đầu nghiêng lắng nghe, mắt liếc lên, gật nhẹ — rồi thu tay về. Không cần cầm gì: ống nghe hiện ra trong tay lúc khám.
   */
  listen(target = null, hold = 1.6) {
    const t = this.tl(), s = this.s, N = this.NGHI, reach = this.#reachLow(target, null, 'body'), { k, upper, fore } = reach, m = k === 'L' ? -1 : 1;
    this.#leanTo(t, reach, 'nam');
    t.set(s, { ['tool' + k]: 1 }, 0.1);
    // Ấn nhẹ mặt ống nghe vào ngực con vật, rồi đứng yên nghe: đầu nghiêng, mắt liếc lên trời, mày nhíu nhẹ.
    t.to(s, { ['cang' + k]: fore - 4, ['bat' + k]: upper + 2, duration: 0.2, ease: 'sine.out' }, 0.45);
    t.to(s, { dau: N.dau + m * 8 + reach.lean * 0.8, nhinX: -m * 1.6, nhinY: -1.6, mayL: 0.15, mayR: 0.15, cuoi: 0.4, duration: 0.35, ease: 'sine.inOut' }, 0.6);
    // Dời ống nghe sang chỗ khác một lần ở giữa (nghe hai chỗ), rồi gật: "ổn".
    t.to(s, { ['bat' + k]: upper - 3, ['cang' + k]: fore + 4, duration: 0.25, ease: 'sine.inOut' }, 0.6 + hold * 0.5);
    t.to(s, { dauY: 10, cuoi: 0.9, mayL: 0.5, mayR: 0.5, duration: 0.18, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.6 + hold);
    this.#khep(t, 0.5, 1.0 + hold);
    return t;
  }

  /**
   * TIÊM: tay cầm ống tiêm (`items: { R: 'syringe' }`) cúi xuống đưa mũi kim tới con vật `target`, ấn pít-tông, rút ra.
   * Mặt tập trung (mày nhíu, môi mím) rồi cười khi xong. Phải đang cầm ống tiêm.
   */
  inject(target = null) {
    const t = this.tl(), s = this.s, N = this.NGHI;
    const k = ['R', 'L'].find((side) => this.holds[side] && s['item' + side] > 0.5 && this.el['item' + side].querySelector('[data-syringe]'));
    if (!k) throw new Error('[character] inject: the character is not holding a syringe — give it one: createCharacter(host, { id, items: { R: "syringe" } })');
    const reach = this.#reachLow(target, k, 'body'), { upper, fore } = reach;
    // Con vật ở phía tay KIA: tay cầm ống tiêm phải vắt ngang qua bụng mà vẫn không tới — báo rõ thay vì diễn sai.
    if (reach.across) throw new Error(`[character] inject: the pet is on the ${k === 'R' ? 'left' : 'right'} but the syringe is in the ${k === 'R' ? 'right' : 'left'} hand — stand the pet on the ${k === 'R' ? 'right' : 'left'} of the character, or give the syringe to the other hand (items: { ${k === 'R' ? 'L' : 'R'}: "syringe" })`);
    t.to(s, { ['carry' + k]: 0, duration: 0.15 }, 0);
    this.#leanTo(t, reach, 'nam');
    // Mũi kim chĩa vào con vật: nghiêng ống tiêm về phía nó (ống vẽ đứng, kim chúc xuống).
    t.to(s, { ['itemTilt' + k]: 35, duration: 0.4, ease: 'power2.out' }, 0.05);
    t.to(s, { mayL: 0.1, mayR: 0.1, cuoi: 0.2, chum: 0.3, duration: 0.25 }, 0.4);                 // tập trung
    // Đâm kim (cẳng tay nhích tới), ấn pít-tông (giữ), rút ra.
    t.to(s, { ['bat' + k]: upper + 3, ['cang' + k]: fore - 3, duration: 0.18, ease: 'power2.out' }, 0.55);
    t.to(s, { ['plunger' + k]: 1, duration: 0.7, ease: 'sine.inOut' }, 0.8);
    t.to(s, { ['bat' + k]: upper, ['cang' + k]: fore, duration: 0.2, ease: 'power2.in' }, 1.55);
    t.to(s, { cuoi: 0.95, chum: 0, mayL: 0.5, mayR: 0.5, duration: 0.25 }, 1.6);                 // xong rồi
    this.#khep(t, 0.5, 1.85, { ['plunger' + k]: 0 });
    return t;
  }

  // ĐẶT CON VẬT ĐANG BẾ vào đúng chỗ (gọi trong `apDung`, là hàm của trạng thái): `om` ≥ 0,5 thì SVG của nó nằm trong
  // ngăn `om` (giữa thân và hai tay), ở vị trí trượt từ chỗ nó đứng (`from`) lên trước bụng theo `omRise`; dưới 0,5 thì
  // trả nó về host của nó, đúng như cũ. Ngăn mang phép biến đổi NGƯỢC của `tren` nên bên trong là hệ toạ độ của SVG gốc.
  #placeCarried() {
    const c = this.carried, e = this.el, s = this.s;
    if (!c || !e.om) return;
    const pet = c.pet, inside = pet.svg.parentNode === e.om;
    if (s.om < 0.5) {
      if (inside) { c.host.appendChild(pet.svg); for (const [name, value] of c.attrs) value === null ? pet.svg.removeAttribute(name) : pet.svg.setAttribute(name, value); pet.apDung(); }
      return;
    }
    if (!inside) { e.om.appendChild(pet.svg); }
    const toRoot = this.svg.getScreenCTM && e.tren.getScreenCTM ? this.svg.getScreenCTM().inverse().multiply(e.tren.getScreenCTM()) : null;
    if (!toRoot) return;
    const m = toRoot.inverse();
    e.om.setAttribute('transform', `matrix(${[m.a, m.b, m.c, m.d, m.e, m.f].map((v) => v.toFixed(4)).join(' ')})`);
    // Trước bụng: điểm (0, −60) của hệ `than` (hông ở gốc), đổi sang hệ SVG gốc.
    const lift = e.tren.transform.baseVal.consolidate(), fromThan = toRoot.multiply(lift ? lift.matrix.inverse() : new DOMMatrix());
    const belly = new DOMPoint(0, -62).matrixTransform(fromThan);
    // Lúc ôm, con vật PHÓNG TO dần tới `CARRY_ZOOM` theo độ nhấc: đúng tỉ lệ thì một con mèo trước ngực một người chibi
    // chỉ bằng nửa bề ngang thân, chìm vào áo (cùng một lối "nói dối" như điện thoại phóng to khi khoe màn hình).
    const rise = clamp(s.omRise, 0, 1), grow = c.giver ? CARRY_ZOOM : pha(1, CARRY_ZOOM, rise), w = c.from.w * grow, h = c.from.h * grow;
    // Nhận con vật TỪ TAY NGƯỜI KHÁC (`takePet`): nó trượt từ trước bụng người trao (đo trên màn hình, ở khung này) về
    // trước bụng người nhận, giữ nguyên cỡ đang bế — không từ chỗ nó đứng dưới đất.
    let fromX = c.from.x, fromY = c.from.y;
    const toMine = (p) => p && new DOMPoint(p.x, p.y).matrixTransform(this.svg.getScreenCTM().inverse());
    // Nhận: con vật bắt đầu từ ĐIỂM GIỮA hai người — nơi người trao đã đưa nó ra (xem `omGive` bên dưới).
    if (c.giver) {
      const q = toMine(RigSVG.#meetPoint(c.giver, this));
      if (q) { fromX = q.x - w * c.middle; fromY = q.y - h * 0.66; }
    }
    // Thân con vật nằm TRÊN hai cẳng tay: đáy khung của nó (chân) ngay dưới đường cẳng tay.
    // ĐẦU con vật vào giữa ngực người bế (thân và đuôi sang một bên); đầu ở ngang ngực, không che cằm.
    let x = pha(fromX, belly.x - w * c.middle, rise), y = pha(fromY, belly.y - h * 0.66, rise);
    // Trao: từ trước bụng trượt ra điểm giữa hai người theo `omGive`.
    const give = clamp(s.omGive || 0, 0, 1);
    if (give && c.receiver) {
      const q = toMine(RigSVG.#meetPoint(this, c.receiver));
      if (q) { x = pha(x, q.x - w * c.middle, give); y = pha(y, q.y - h * 0.66, give); }
    }
    for (const [name, value] of [['x', x], ['y', y], ['width', w], ['height', h]]) pet.svg.setAttribute(name, value.toFixed(2));
    pet.svg.style.overflow = 'visible';
    if (!inside) pet.apDung();
  }

  // Đưa SVG con vật về host của chính nó (bỏ vị trí / cỡ của thế bế) nếu nó đang nằm trong tay ai đó.
  static #homePet(pet) {
    if (!pet.svg.ownerSVGElement || !pet.host) return;
    pet.host.appendChild(pet.svg);
    for (const [name, value] of pet.homeAttrs || []) value === null ? pet.svg.removeAttribute(name) : pet.svg.setAttribute(name, value);
    pet.apDung();
  }

    // KHẨU TRANG y tế: phủ từ sống mũi xuống dưới cằm miệng, ba nếp gấp, hai quai vòng ra tai. Nằm trong nhóm nét mặt
  // (`net`) nên đi theo mặt khi quay. Ẩn cho tới khi `wear('mask')`.
  #veKhauTrang(p) {
    // Mép trên NGAY DƯỚI MẮT (mặt chibi: mũi nằm sát mắt — lấy mũi làm mốc thì khẩu trang che nửa con mắt), mép dưới qua
    // khỏi miệng một chút; bề ngang vừa tới hai má.
    const nv = this.nv, top = Math.max(nv.muiY - 2, nv.matY + 14 * (nv.matCo || 1)), bottom = nv.miengY + 13, half = nv.maX + 1;
    const folds = [0.3, 0.55, 0.8].map((k) => { const y = top + (bottom - top) * k; return `M ${-half + 5} ${y.toFixed(1)} Q 0 ${(y + 3).toFixed(1)} ${half - 5} ${y.toFixed(1)}`; }).join(' ');
    return `<g id="${p}-khauTrang" style="display:none">
              <path d="M ${-half} ${top + 4} Q 0 ${top - 6} ${half} ${top + 4} L ${half - 3} ${bottom - 6} Q 0 ${bottom + 4} ${-half + 3} ${bottom - 6} Z" fill="#cfe6f5" stroke="#8fb6cf" stroke-width="1.4" stroke-linejoin="round"/>
              <path d="${folds}" stroke="#9fc3d9" stroke-width="1.1" fill="none" stroke-linecap="round"/>
              <path d="M ${-half} ${top + 6} L ${-nv.taiX + 4} ${top - 2} M ${-half + 2} ${bottom - 8} L ${-nv.taiX + 4} ${top + 6} M ${half} ${top + 6} L ${nv.taiX - 4} ${top - 2} M ${half - 2} ${bottom - 8} L ${nv.taiX - 4} ${top + 6}" stroke="#e8f2f8" stroke-width="1.6" stroke-linecap="round"/>
            </g>`;
  }

  // MŨ PHẪU THUẬT (mũ trùm tóc): một vòm vải ôm đỉnh đầu, trùm cả búi tóc, viền thắt ở trán. Trong nhóm mũ (`muG`), đi
  // theo mái tóc. Ẩn cho tới khi `wear('cap')`.
  #veMuMo(p) {
    const w = this.nv.taiX + 6;
    return `<g id="${p}-muMo" style="display:none">
              <path d="M ${-w} -22 Q ${-w - 8} -88 -10 -104 Q 0 -110 10 -104 Q ${w + 8} -88 ${w} -22 Q 0 -40 ${-w} -22 Z" fill="#5fb3a5" stroke="#3d8578" stroke-width="1.6" stroke-linejoin="round"/>
              <path d="M ${-w + 2} -26 Q 0 -44 ${w - 2} -26" stroke="#3d8578" stroke-width="3" fill="none" stroke-linecap="round"/>
              <path d="M -24 -80 q 8 6 16 0 M 6 -88 q 8 6 16 0 M -14 -60 q 8 6 16 0" stroke="#7cc6b9" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>
            </g>`;
  }

  /**
   * ĐEO / THÁO phụ kiện — có hiệu lực ngay và suốt mọi động tác (không phải một bước trên timeline):
   *   wear('mask')  khẩu trang y tế     wear('gloves')  găng tay y tế     wear('cap')  mũ phẫu thuật
   *   wear('mask', false) tháo ra. Trả về chính rig.
   */
  wear(kind, on = true) {
    if (!RigSVG.WEARABLES.includes(kind)) throw new Error(`[character] wear: no accessory "${kind}" (available: ${RigSVG.WEARABLES.join(', ')})`);
    if (on) this.wearing.add(kind); else this.wearing.delete(kind);
    this.#applyWear();
    return this;
  }
  static WEARABLES = ['mask', 'gloves', 'cap'];
  #applyWear() {
    const e = this.el;
    if (!e) return;
    if (e.khauTrang) e.khauTrang.style.display = this.wearing.has('mask') ? '' : 'none';
    if (e.muMo) e.muMo.style.display = this.wearing.has('cap') ? '' : 'none';
    this.svg.classList.toggle(this.id + '-gloved', this.wearing.has('gloves'));
  }

  // Điểm "trước bụng" (nơi con vật nằm khi bế) TRÊN MÀN HÌNH, ở trạng thái đang vẽ — cho người nhận con vật (`takePet`).
  #bellyScreen() {
    const e = this.el, ctm = e.tren && e.tren.getScreenCTM && e.tren.getScreenCTM();
    if (!ctm) return null;
    const lift = e.tren.transform.baseVal.consolidate();
    return new DOMPoint(0, -62).matrixTransform(ctm.multiply(lift ? lift.matrix.inverse() : new DOMMatrix()));
  }

  // Điểm GIAO con vật trên màn hình: giữa trước-bụng của người trao và của người nhận.
  static #meetPoint(giver, receiver) {
    const a = giver.#bellyScreen(), b = receiver.#bellyScreen();
    return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a || b;
  }

  // Hai cánh tay đưa ra về phía người kia, ngang bụng (trao / nhận con vật đang bế).
  #offerArms(t, other, at = 0) {
    const s = this.s;
    for (const k of ['L', 'R']) {
      const pose = this.#meetAngles(other, k, 0.42);
      if (!pose) continue;
      t.to(s, { ['aim' + k]: 1, ['bat' + k]: pose.bat, ['cang' + k]: pose.cang, duration: 0.45, ease: 'power2.inOut' }, at);
    }
  }

  /**
   * TRAO con vật đang bế (`carry`) sang tay người kia `other` — chạy cùng nhịp với `other.takePet(this)` trong một
   * `together`: hai tay đưa con vật về phía người ấy, nhả ra đúng lúc người kia đỡ lấy (0,55 s), rồi về dáng nghỉ.
   */
  handOverPet(other) {
    const s = this.s, c = this.carried;
    if (!c || s.om < 0.5) throw new Error('[character] handOverPet: the character is not carrying a pet — carry(pet) first');
    if (!other || !(other instanceof RigSVG) || other === this) throw new Error('[character] handOverPet(other): other must be another person rig (createCharacter(...).rig)');
    const t = this.tl(), dir = this.#towards(other, 'R');
    // Hai tay đưa con vật ra ĐIỂM GIỮA hai người (`omGive`; hạ `omRise` thì nó lại trượt về chỗ nó đứng dưới sàn), người
    // ngả theo; người nhận vươn tay ra đón nó ở đó (`takePet`).
    c.receiver = other;
    this.#offerArms(t, other, 0);
    t.to(s, { omGive: 1, than: this.NGHI.than - dir * 5, dau: this.NGHI.dau - dir * 4, nhinX: dir * 2, cuoi: 1, duration: 0.5, ease: 'power2.inOut' }, 0);
    t.set(s, { om: 0 }, HANDOVER_AT);                                         // người kia đã đỡ: con vật sang tay họ
    this.#khep(t, 0.45, HANDOVER_AT + 0.1, { om: 0, omRise: 0, omGive: 0 });
    return t;
  }

  /**
   * NHẬN con vật từ tay người đang bế nó (`giver`), trong cùng một `together` với `giver.handOverPet(this)`: đưa hai tay
   * ra đỡ, con vật sang tay ở 0,55 s rồi được ôm vào trước ngực — và GIỮ (thế bế, như `carry`). `putDown()` đặt nó về chỗ
   * cũ của nó (chỗ nó đứng lúc được bế lên lần đầu).
   */
  takePet(giver) {
    const from = giver && giver.carried;
    // Không xét `giver.s.om`: lúc dựng bước này, rig của người trao có thể đang ở trạng thái đầu cảnh (`sequence()` của
    // họ trả rig về khung 0 sau khi dựng) — chỉ cần họ đã `carry` một con vật.
    if (!(giver instanceof RigSVG) || !from) throw new Error('[character] takePet(giver): the giver is not carrying a pet — run giver.carry(pet) first, then takePet together with giver.handOverPet');
    const t = this.tl(), s = this.s, dir = this.#towards(giver, 'R');
    const scale = (giver.svg.getScreenCTM().a || 1) / (this.svg.getScreenCTM().a || 1);       // đơn vị khung của người trao → của người nhận
    this.carried = { pet: from.pet, host: from.host, attrs: from.attrs, from: { x: 0, y: 0, w: from.from.w * scale, h: from.from.h * scale },
                     reach: this.#reachLow(null), at: s.x, middle: from.middle, facing: s.huong, giver };
    this.#offerArms(t, giver, 0);
    t.to(s, { than: this.NGHI.than - dir * 3, nhinX: dir * 2, cuoi: 1, duration: 0.45, ease: 'power2.inOut' }, 0);
    t.set(s, { om: 1, omRise: 0 }, HANDOVER_AT);
    t.to(s, { omRise: 1, huong: 0, than: this.NGHI.than, nhinX: 0, nhinY: 1.8, dauY: 3, duration: 0.55, ease: 'power2.inOut' }, HANDOVER_AT + 0.02);
    this.#khep(t, 0.4, HANDOVER_AT + 0.6, { om: 1, omRise: 1, huong: 0 });
    return t;
  }

  /**
   * NHẬN THÔNG BÁO trên điện thoại đang cầm: máy rung, một THẺ THÔNG BÁO bật ra phía trên máy (dòng đầu đậm — ví dụ
   * "Nhắc lịch tái khám", dòng sau — "Thứ Bảy, 9:00"), người nhìn xuống máy, mắt sáng lên, giữ `hold` giây rồi thẻ tắt.
   * `text`: một chuỗi (tự xuống dòng ở khoảng 24 ký tự) hoặc [dòng 1, dòng 2]. Phải đang cầm điện thoại.
   */
  notify(text = 'Thông báo mới', hold = 1.8, { side = 'auto' } = {}) {
    const t = this.tl(), s = this.s, N = this.NGHI, k = this.#phoneHand(side);
    if (!(this.holds[k] && s['item' + k] > 0.5 && this.el['item' + k].querySelector('[data-back]'))) throw new Error('[character] notify: the character is not holding a phone — give it one: createCharacter(host, { id, items: { R: "phone" } })');
    const lines = Array.isArray(text) ? text.map(String) : RigSVG.#noteLines(String(text));
    this.noted = { side: k };
    const [first, second] = [...this.el.note.querySelectorAll('text')];
    first.textContent = (lines[0] || '').slice(0, 30); second.textContent = (lines[1] || '').slice(0, 30);
    // Rung: món đồ nghiêng qua lại thật nhanh vài nhịp ("bzz").
    for (let n = 0; n < 6; n++) t.to(s, { ['itemTilt' + k]: n % 2 ? -7 : 7, duration: 0.05, ease: 'none' }, n * 0.05);
    t.to(s, { ['itemTilt' + k]: 0, duration: 0.05 }, 0.3);
    t.to(s, { note: 1, duration: 0.3, ease: 'back.out(1.8)' }, 0.25);
    t.to(s, { nhinY: 2.2, nhinX: k === 'L' ? -1.2 : 1.2, dauY: 4, mayL: 0.8, mayR: 0.8, cuoi: 0.9, duration: 0.3, ease: 'power2.out' }, 0.3);
    t.to(s, { nhinY: 0, nhinX: 0, dauY: 0, duration: 0.3, ease: 'sine.inOut' }, 0.6 + hold * 0.6);
    t.to(s, { note: 0, duration: 0.25, ease: 'power2.in' }, 0.55 + hold);
    this.#khep(t, 0.4, 0.8 + hold);
    return t;
  }

  // Chia một câu thông báo thành hai dòng ở khoảng trắng gần ký tự thứ 24.
  static #noteLines(text) {
    if (text.length <= 24) return [text, ''];
    // Có dấu hai chấm / gạch ngang ở nửa đầu thì ngắt ở đó: "Nhắc lịch tái khám:" | "Thứ Bảy 9:00".
    const mark = text.search(/[:\-–] /);
    if (mark > 6 && mark < 30) return [text.slice(0, mark + 1).trim(), text.slice(mark + 1).trim()];
    const cut = text.lastIndexOf(' ', 24);
    return cut > 8 ? [text.slice(0, cut), text.slice(cut + 1)] : [text.slice(0, 24), text.slice(24)];
  }

  /**
   * NÉM BÓNG: lấy đà (tay ra sau), vung tay ném quả bóng bay vòng cung về phía `direction` ('right' | 'left'), rơi xuống
   * sàn cách `distance` đơn vị (mặc định ra ngoài khung). Đi cặp với `fetch` của con vật trong một `together`.
   */
  throwBall(direction = 'right', distance = 420) {
    const t = this.tl(), s = this.s, N = this.NGHI, dir = direction === 'left' ? -1 : 1, m = dir;
    // Ném bằng tay phía hướng ném; tay ấy đang cầm đồ thì tay kia.
    const k = this.#holdsFree(dir > 0 ? 'R' : 'L');
    if (this.holds[k] && s['item' + k] > 0.5) return this.#headGesture(t, 2, -5);
    this.thrown = { dir, distance, x0: s.x + VAI[k].x + dir * 10, y0: VAI[k].y - 40, apex: 110 };
    this.#stage(t, [k]);
    t.set(s, { ['tay' + k]: 'nam' }, 0.05);
    // Lấy đà: tay vung ra sau – lên; rồi quăng ra trước, người ngả theo.
    t.to(s, { ['bat' + k]: -40, ['cang' + k]: -70, than: N.than + m * 4, dau: N.dau + m * 4, nhinX: m * 2, cuoi: 0.8, duration: 0.35, ease: 'power2.out' }, 0);
    t.to(s, { ['bat' + k]: 150, ['cang' + k]: 10, than: N.than - m * 5, duration: 0.18, ease: 'power3.in' }, 0.4);
    t.set(s, { ['tay' + k]: 'xoe' }, 0.55);
    t.fromTo(s, { ball: 0.001 }, { ball: 1, duration: 1.1, ease: 'none', immediateRender: false }, 0.55);
    t.to(s, { ['bat' + k]: 95, ['cang' + k]: 0, nhinX: m * 3, nhinY: -0.6, cuoi: 1, duration: 0.3, ease: 'power2.out' }, 0.6);
    this.#khep(t, 0.45, 1.7);
    return t;
  }

  /** QUỲ XUỐNG ngang tầm con vật dưới sàn và GIỮ (thế quỳ): vuốt ve, khám, cho ăn diễn khi đang quỳ. `standUp()` để đứng. */
  kneel() {
    const t = this.tl(), s = this.s;
    t.to(s, { dauY: 4, nhinY: 1.6, cuoi: 0.9, duration: 0.3, ease: 'power2.in' }, 0);
    this.#khep(t, 0.6, 0.05, { seat: 1, kneel: 1 });
    return t;
  }

  /**
   * BẾ một con vật lên: cúi xuống, hai tay đỡ lấy nó, nhấc lên ôm trước bụng — và GIỮ (thế bế): các động tác sau (nói,
   * gật, quay mặt, đi) diễn khi đang bế, con vật cuộn trong tay và vẫn tự diễn động tác của nó (gừ gừ, vẫy đuôi).
   * `putDown()` đặt nó xuống lại đúng chỗ cũ. Con vật phải ở trong tầm tay (như `stroke`).
   */
  carry(pet) {
    if (!pet || !pet.svg || typeof pet.apDung !== 'function' || !pet.el || !pet.el.dau || pet instanceof RigSVG) throw new Error('[character] carry(pet): pet must be a pet rig (createPet(...).rig)');
    if (this.carried && this.carried.pet !== pet && this.s.om >= 0.5) throw new Error('[character] carry: already carrying another pet — putDown() first');
    const t = this.tl(), s = this.s, N = this.NGHI;
    // Đo con vật Ở NHÀ: lúc dựng bước này nó có thể đang nằm tạm trong tay người khác (bản nháp của `sequence()` vừa đi
    // qua một `carry` / `takePet`), và đo ở đó thì "chỗ nhà" ghi nhầm thành ngăn bế của người ấy — con vật hiện trong tay
    // người này suốt cảnh (cảnh thử đợt 6). Lúc phát, mỗi khung tự đặt nó lại đúng chỗ theo trạng thái.
    RigSVG.#homePet(pet);
    // Con vật đang ở đâu, trong hệ SVG gốc của người (đo lúc DỰNG timeline, như `point`).
    const inv = this.svg.getScreenCTM().inverse(), r = pet.svg.getBoundingClientRect();
    const a = new DOMPoint(r.left, r.top).matrixTransform(inv), b = new DOMPoint(r.right, r.bottom).matrixTransform(inv);
    const reach = this.#reachLow(pet, null, 'body');
    // Vị trí ĐẦU con vật theo bề ngang khung của nó (0…1): đầu được đặt vào GIỮA NGỰC người bế, chỗ trống giữa hai cánh
    // tay. Canh theo thân thì đầu rơi đúng chỗ một cánh tay đi qua — cánh tay vẽ đè ngang mặt con vật.
    const head = pet.el.dau ? pet.el.dau.getBoundingClientRect() : r, middle = r.width ? clamp((head.left + head.width / 2 - r.left) / r.width, 0.1, 0.9) : 0.5;
    this.carried = { pet, host: pet.host || pet.svg.parentNode, attrs: pet.homeAttrs || ['x', 'y', 'width', 'height'].map((name) => [name, pet.svg.getAttribute(name)]),
                     from: { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }, reach, at: s.x, middle, facing: s.huong };
    const other = reach.k === 'L' ? 'R' : 'L';
    this.#leanTo(t, reach, 'xoe');
    t.to(s, { ['bat' + other]: reach.upper * 0.6, ['cang' + other]: -40, ['tay' + other]: 'xoe', duration: 0.45, ease: 'power2.out' }, 0);
    t.set(s, { om: 1 }, 0.5);                                                              // hai tay đã chạm: con vật vào tay
    // Nhấc lên và QUAY VỀ PHÍA NGƯỜI XEM: dáng ôm là dáng nhìn thẳng (ở dáng 3/4 tay phía xa buông chéo qua mặt con
    // vật), và "khoe" con vật ra máy quay cũng là điều ta muốn thấy. Thế bế giữ hướng nhìn thẳng; `putDown` trả lại hướng cũ.
    // Đang NGỒI (`sitDown`, ghế phòng chờ) thì vẫn ngồi — con vật nằm trên đùi; đứng thì đứng thẳng lại sau cú khuỵu gối.
    t.to(s, { omRise: 1, huong: 0, seat: s.seat >= 0.5 ? s.seat : N.seat, than: N.than, dau: N.dau, dauY: 3, nhinX: 0, nhinY: 1.8, cuoi: 1, duration: 0.6, ease: 'power2.inOut' }, 0.55);
    this.#khep(t, 0.4, 1.15, { om: 1, omRise: 1, huong: 0 });
    return t;
  }

  /** ĐẶT con vật đang bế xuống, đúng chỗ nó đứng lúc được bế lên. */
  putDown() {
    const t = this.tl(), s = this.s, c = this.carried;
    if (!c || s.om < 0.5) throw new Error('[character] putDown: the character is not carrying a pet — carry(pet) first');
    if (Math.abs(s.x - c.at) > 20) throw new Error('[character] putDown: the character walked away from where it picked the pet up — walk back first (the pet goes back to its own spot)');
    const { reach } = c, other = reach.k === 'L' ? 'R' : 'L';
    // Tay đặt sẵn ở dáng cúi xuống (bị dáng ôm che đi lúc `omRise` = 1), rồi hạ con vật: tay đi từ dáng ôm về dáng ấy.
    // (Một tween rất ngắn chứ không `set` ở mốc 0: `sequence()` dựng nháp ở đầu bước và `set` đúng mốc 0 không được vẽ —
    // tay ở lại dáng ôm cho tới khi con vật đã chạm đất.)
    t.to(s, { ['bat' + reach.k]: reach.upper, ['cang' + reach.k]: reach.fore, ['bat' + other]: reach.upper * 0.6, ['cang' + other]: -40, duration: 0.02 }, 0);
    t.set(s, { tayL: 'xoe', tayR: 'xoe' }, 0.02);
    if (reach.crouch) t.to(s, { seat: reach.crouch, duration: 0.5, ease: 'power2.inOut' }, 0);
    t.to(s, { omRise: 0, dauY: 7, nhinY: 2.4, duration: 0.55, ease: 'power2.inOut' }, 0);
    t.to(s, { huong: c.facing, duration: 0.5, ease: 'sine.inOut' }, 0);                    // quay lại hướng lúc bế lên
    t.set(s, { om: 0 }, 0.6);                                                              // con vật về chỗ của nó
    this.#khep(t, 0.45, 0.65, { om: 0, omRise: 0, huong: c.facing });
    return t;
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
    this.#khep(t, s.kneel > 0.5 ? 0.65 : 0.5, 0.05, { seat: 0, kneel: 0 });
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
    // QUÃNG NGẮN (bước lại gần một chút trước khi với tay — tools/scene.py chèn): BƯỚC NHÍCH sang ngang, KHÔNG quay người.
    // Quay hẳn người sang ngang, đi hai bước, rồi quay lại cho 40 đơn vị thì cả thân xoay qua xoay lại trong một giây —
    // người xem thấy nhân vật giật (Gemini, đợt 5, giây 14–15).
    if (quang && Math.abs(quang) <= RigSVG.SIDESTEP) {
      const x0 = s.x, steps = 2, h = 0.36;
      let at = 0;
      for (let i = 0; i < steps; i++) at = this.#dam(t, at, h, (i % 2 ? 'L' : 'R') , 0, 0.6);
      t.to(s, { x: x0 + quang, duration: at, ease: 'sine.inOut' }, 0);
      this.#khep(t, 0.3, at, { x: x0 + quang });
      return t;
    }
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

  /**
   * Từ chỗ đứng gốc (x = 0) phải đi bao xa về phía `dir` (−1 trái, +1 phải) thì RA HẲN ngoài khung hình — đơn vị
   * viewBox. Khung hình là phần tử composition (`data-composition-id`) chứa nhân vật, không có thì là cả trang.
   * Bản trước đi cố định 270–300 đơn vị: trong cảnh rộng nhân vật mới tới lưng chừng sân khấu đã mờ đi, và bước
   * vào thì hiện ra giữa khung. Chặn trên 700 đơn vị cho khỏi mất quá năm giây; khi ấy vẫn còn đoạn mờ ở cuối.
   */
  #offstage(dir) {
    const frame = this.svg.getBoundingClientRect();
    const scale = Math.min(frame.width / KHUNG.w, frame.height / KHUNG.h);
    if (!(scale > 0)) return 300;                                   // chưa có kích thước (chưa gắn vào trang)
    const stage = (this.svg.closest('[data-composition-id]') || this.svg.ownerDocument.documentElement).getBoundingClientRect();
    const centre = frame.left + frame.width / 2;
    return clamp((dir > 0 ? stage.right - centre : centre - stage.left) / scale + 80, 270, 700);
  }

  /**
   * Bước VÀO từ ngoài khung hình rồi dừng ở chỗ đứng của mình. `from`: 'left' (mặc định, đi sang phải) hoặc 'right'.
   * `distance` (đơn vị viewBox): quãng đi; bỏ trống thì tự tính cho vừa từ ngoài mép khung hình.
   */
  enter(from = 'left', distance = null) {
    const t = this.tl(), s = this.s, chieu = from === 'right' ? -1 : 1;
    const far = distance > 0 ? distance : this.#offstage(-chieu), x0 = -far * chieu;
    const d = this.#doBuoc(far, false, true);              // vào khung khi đang đi, dừng lại ở giữa
    t.set(s, { x: x0, mo: 1, cuoi: 0.5, huong: chieu }, 0);
    const at = this.#di(t, 0, d.buoc, 0.42, { vao: false, kA: d.kA, chieu, x: (b) => x0 + chieu * d.x(b) });
    // HIỆN suốt quãng đi. `set` ở trên không đủ: `sequence()` đặt sẵn trạng thái đầu của động tác vào rig trước khi
    // dựng nó, nên GSAP thấy `mo` đã là 1, không ghi gì — nhân vật vừa `exit` (mo 0) bước vào trong vô hình rồi hiện
    // phụt ra ở giữa khung. Ghi qua setter thì khung nào cũng ghi.
    const shown = { get v() { return 0; }, set v(v) { s.mo = Math.min(1, v * at / 0.2); s.huong = chieu; s.seat = 0; } };    // hiện dần trong 0,2 s đầu
    t.to(shown, { v: 1, duration: at, ease: 'none' }, 0);
    // Bước vào thì món đồ về trạng thái BAN ĐẦU của nhân vật: đang cầm (mặc định), hoặc đang cất nếu nhân vật được tạo
    // với `itemsHidden` — ghi cứng 1 ở đây là người sắp `take()` một món đồ bước vào đã cầm sẵn nó.
    this.#khep(t, 0.45, at, { x: 0, huong: 0, seat: 0, itemL: this.NGHI.itemL, itemR: this.NGHI.itemR });
    return t;
  }

  /**
   * Bước RA khỏi khung hình và ẩn đi. `to`: 'right' (mặc định) hoặc 'left'. `distance`: như `enter`.
   * Xuất phát từ chỗ ĐANG ĐỨNG (kể cả sau khi đã `walk` đi chỗ khác).
   */
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
    // Khoé miệng bám SÁT nét mặt, khẩu hình chỉ xê dịch nó chút ít. Trộn 70/30 thì với nét mặt buồn / giận (khoé −0,5)
    // khẩu hình mở to (khoé +0,7) vẫn đẩy khoé miệng lên gần mức ngang — miệng há với khoé ngang đọc ra một nụ cười,
    // và nhân vật lo lắng cứ mở miệng là cười.
    const corner = (value) => face.cuoi * 0.9 + (value - 0.45) * 0.22;
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
    // Đang quay về phía ai đó: nói bằng tay Ở PHÍA NGƯỜI NGHE, giữ nguyên dáng 3/4 (kênh `aim`)
    // — nhân vật đan tay mở tay gần ra thì bàn tay đưa về phía sau lưng; nhân vật buông tay nâng tay gần lên bụng thì
    // khuỷu bạnh ra, bàn tay đặt ở hông như chống nạnh. Các trường hợp khác (tay ấy đang cầm đồ, nhìn thẳng) như cũ: mở
    // người về phía người xem, diễn bằng tay gần.
    const listener = s.huong > 0.1 ? 'R' : s.huong < -0.1 ? 'L' : null;
    const toListener = RigSVG.SCREEN_AIM && listener && this.#freeHand() === listener;
    const arm = toListener ? listener : this.#chestHand();    // tay phải; đang quay mặt sang phải thì tay trái (tay gần người xem)
    if (toListener) this.#stage(t, [arm], 0.1); else this.#openUp(t);
    const soAm = this.#soAm(text, dur), nhip = dur / soAm;
    t.set(s, { ['tay' + arm]: 'mo' }, 0);
    t.to(s, { ...tone.start, nhinX: 0.8, duration: 0.2 }, 0);
    this.blinkTo = tone.eyes;
    this.#khauHinh(t, soAm, nhip, tone.corner);
    // đầu và tay phụ hoạ theo câu nói
    t.to(s, { dau: -3, dauY: 2, duration: dur * 0.35, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.1);
    // Cử chỉ là MỞ cẳng tay sang bên một nhịp, bàn tay xoè (dáng nhỏ của `explain`). Dáng cũ nâng bàn tay lên ngang bụng
    // (bắp 34°, cẳng −70°): nhân vật đan tay thì bàn tay gần như đứng yên, nhân vật buông tay thì bàn tay dừng ở hông —
    // cả hai chỉ thấy khuỷu bạnh ra, đọc thành chống nạnh.
    const beat = toListener ? [[36, 12], [40, 22]] : [[26, 48], [30, 60]];      // tay phía người nghe: chéo xuống về phía họ, như cử chỉ một tay của `explain`
    // Từ dáng đan tay, cẳng tay phải đi hơn 100° mới tới dáng mở: cho nó 0,5 s thay vì 0,35 s, kẻo thành một cú vung.
    const reach = Math.abs(beat[0][1] - this.#restArm(arm)[1]) > 90 ? 0.5 : 0.35;
    t.to(s, { ['bat' + arm]: beat[0][0], ['cang' + arm]: beat[0][1], than: -1.5, duration: reach, ease: 'power2.out' }, 0.2)
     .to(s, { ['bat' + arm]: beat[1][0], ['cang' + arm]: beat[1][1], duration: 0.35, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.2 + reach);
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
  #cuChi(t, moc, D, beats = [], hand = null) {
    const s = this.s, N = this.NGHI;
    if (!moc.length && !beats.length) return t;
    // NỀN là TƯ THẾ NGHỈ CỦA CHÍNH NHÂN VẬT (đan tay, buông tay, một tay cầm đồ…), không phải một dáng "hai tay
    // trước bụng" chung cho mọi người. Bản trước đặt thẳng dáng chung ấy ở khung đầu của câu nói — tay GIẬT trong
    // đúng một khung hình — và ai nói cũng ra cùng một dáng. Cử chỉ nào cũng đi từ nền này và về lại nền này.
    //
    // Tay đang cầm đồ thì không diễn; tay còn lại diễn thay. Cả hai tay đều bận thì chỉ còn đầu và thân.
    const busy = (side) => this.holds[side] && s['item' + side] > 0.5;
    // Đang quay mặt sang trái thì tay chủ đạo là tay trái (xem `#freeHand`).
    // `hand` ('L' | 'R'): tay chủ đạo do người gọi chọn — người dẫn đứng cạnh bảng nội dung thì diễn bằng tay phía bảng.
    const order = hand === 'L' || (hand !== 'R' && s.huong < -0.1) ? ['L', 'R'] : ['R', 'L'];
    const free = order.filter((side) => !busy(side));
    if (!free.length) return t;
    const lead = free[0], other = free[1] || null;                    // tay chủ đạo (phải, nếu rảnh) và tay phụ
    // Các DÁNG ĐÍCH — góc của tay chủ đạo [bắp, cẳng] và của tay phụ (null = tay phụ chỉ nhích theo).
    // Cẳng tay DƯƠNG là mở ra ngoài: bàn tay đưa sang bên, lòng bàn tay hướng về người nghe. Bản trước dùng cẳng
    // tay âm với bắp tay nâng cao — khuỷu chĩa ngang, bàn tay rủ xuống — trông như cánh gà.
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
    // Dáng nào gần trùng tư thế nghỉ của nhân vật thì bỏ: người nghỉ ở dáng đan tay (cẳng −97°) mà "đặt tay lên
    // ngực" (−112°) là cánh tay nhích 15° — cả câu nói không thấy một cử chỉ nào.
    // Đang quay 3/4 mà tay chủ đạo là tay PHÍA XA (tay phía người nghe, nằm sau thân): bỏ các dáng GẬP CẲNG TAY VÀO
    // TRONG (đặt tay lên ngực). Tay xa gập vào trong thì rig ẩn bắp tay của nó cho ống tay áo khỏi đè lên ngực — chỉ còn
    // cẳng tay vắt ngang bụng, mọc ra từ mép áo: người xem đọc thành mất bắp tay (bà cụ vừa áp điện thoại vừa nói, giây 1).
    const farLead = Math.abs(s.huong) > 0.1 && lead === (s.huong < 0 ? 'L' : 'R');
    const POSES = ALL_POSES.filter((pose) => Math.abs(pose.lead[1] - base(lead)[1]) >= 45 && !(farLead && pose.lead[1] < 0));
    // Một cử chỉ trọn vẹn (lấy đà → đưa tay → giữ → về nền) cần gần hai giây. Mốc nào sát mốc trước quá thì bỏ:
    // hai cử chỉ gối lên nhau là hai tween cùng giành một khớp, và cánh tay nhảy cóc giữa chừng.
    const anchors = [];
    for (const a of moc) if (!anchors.length || a - anchors[anchors.length - 1] >= 2.1) anchors.push(a);
    // NHỊP NHỎ theo trọng âm (`beats`): một cái nhấn tay vài độ rồi về, đúng lúc người nói nhấn giọng. Nhịp chỉ
    // được đặt vào chỗ khớp tay đang RẢNH — trong lúc giữ một dáng, hoặc lúc tay nằm ở nền giữa hai cử chỉ — để
    // không tween nào giành khớp với tween nào.
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
      let pose = POSES[pick];
      // Đang đứng dáng 3/4 và chỉ MỘT tay (tay phía người nghe) mở ra, tay kia vẫn đan trước bụng: các dáng trên đặt
      // cẳng tay nằm ngang đúng độ cao khuỷu — tức đúng độ cao của cẳng tay đang đan. Hai cẳng tay thẳng hàng, nối đầu
      // vào nhau, nhìn như MỘT cánh tay dài xuyên qua thân. Đưa bắp tay ra ngoài hơn và duỗi bớt cẳng tay: cả cánh tay thành một đường chéo từ vai xuống về phía người nghe, bàn tay mở ở ngang hông.
      // (Chếch LÊN thì bàn tay chỉ lên tới ngang bàn tay kia — tay nhân vật ngắn — vẫn thẳng hàng.)
      if (RigSVG.SCREEN_AIM && Math.abs(s.huong) > 0.1 && lead === (s.huong < 0 ? 'L' : 'R') && !pose.other && pose.lead[1] > 0)
{
        // Bắp tay không quá 38° (đưa ra nhiều hơn là khuỷu lên cao, bàn tay lại về ngang bàn tay kia); bắp + cẳng ≤ 52°,
        // chừa chỗ cho phần xê dịch ngẫu nhiên và nhịp nhấn (tới +17°) mà cẳng tay vẫn còn chếch xuống rõ.
        const upper = Math.min(pose.lead[0] + 22, 38);
        pose = { lead: [upper, Math.min(pose.lead[1] - 30, 52 - upper)], other: null };
      }
      const next = i + 1 < anchors.length ? anchors[i + 1] : D;
      // Thời gian đưa tay dài nhất trong các tay tham gia (đường đi càng dài càng lâu, xem bên dưới).
      const travel = Math.max(Math.abs(pose.lead[1] - base(lead)[1]), other && pose.other ? Math.abs(pose.other[1] - base(other)[1]) : 0);
      const longest = clamp(travel / 300, 0.36, 0.62) + 0.17;                 // + nhịp trễ của tay phụ và của cẳng tay
      const hold = clamp((next - a) - 0.16 - longest - 0.85, 0.25, 1.5);
      const stroke = a + 0.16;
      let release = stroke + longest + hold, handOver = false;
      if (release + 0.8 > next) {
        // Không đủ chỗ cho pha về nền. Giữa câu thì bỏ nhịp này. CUỐI câu thì vẫn diễn: giữ dáng tới hết câu rồi để
        // `#khep` của người gọi đưa tay về — bỏ đi là nửa sau câu nói tay đứng im trong khi miệng còn nói.
        if (i + 1 < anchors.length || stroke + longest + 0.25 > D) return;
        release = D; handOver = true;
      }
      occupied.push([a - 0.06, release + 0.9]);
      const inHold = spaced.filter((b) => b >= stroke + longest + 0.12 && b + 0.36 <= release - 0.05);

      const arms = [[lead, pose.lead]];
      if (other && pose.other) arms.push([other, pose.other]);
      const side = lead === 'R' ? -1 : 1;                 // thân và đầu ngả nhẹ VỀ PHÍA tay đang diễn
      // Thân, vai và đầu cùng tham gia: chỉ có cánh tay chuyển động thì nhìn như tay gắn vào một thân cứng.
      t.to(s, { than: N.than + side * nhieu(1.2, 2.4), vai: N.vai - nhieu(1.5, 3), dauY: nhieu(1.2, 2.6), duration: 0.4, ease: 'sine.out' }, stroke - 0.04);
      if (!handOver) t.to(s, { than: N.than, vai: N.vai, dauY: N.dauY, duration: 0.7, ease: 'sine.inOut' }, release);
      arms.forEach(([arm, [upper, fore]], n) => {
        const [upper0, fore0] = base(arm), lag = n * 0.08;         // tay phụ đi sau tay chủ đạo một nhịp
        const jitterU = nhieu(-3, 3), jitterF = nhieu(-6, 6);      // mỗi lần diễn một dáng hơi khác đi
        // Đường đi càng dài thì đưa tay càng lâu: từ dáng đan tay (cẳng −97°) mở ra ngoài là gần 170° — đi hết
        // trong 0,4 s thì cánh tay quất như roi.
        const reach = clamp(Math.abs(fore - fore0) / 300, 0.36, 0.62);
        // 1. LẤY ĐÀ: nhích ngược một chút.   2. ĐƯA TAY: nhanh rồi chậm dần, không nảy quá đà.
        t.set(s, { ['tay' + arm]: 'mo' }, a + lag);
        // Dáng đích là dáng MẶT TRƯỚC: bật `aim` trong lúc đưa tay để nó hiện đúng như thế ở dáng 3/4, rồi tắt khi về nền.
        if (RigSVG.SCREEN_AIM) t.to(s, { ['aim' + arm]: 1, duration: 0.16 + reach * 0.6, ease: 'sine.inOut' }, a + lag);
        t.to(s, { [key(arm, 0)]: upper0 - 2, [key(arm, 1)]: fore0 - Math.sign(fore - fore0) * 5, duration: 0.16, ease: 'sine.in' }, a + lag)
         .to(s, { [key(arm, 0)]: upper + jitterU, duration: reach, ease: 'power2.out' }, stroke + lag)
         .to(s, { [key(arm, 1)]: fore + jitterF, duration: reach + 0.06, ease: 'power2.out' }, stroke + lag + 0.03);       // cẳng tay tới sau bắp tay
        // 3. GIỮ mà vẫn SỐNG: cẳng tay trôi vài độ, bắp tay thở theo — tay người không bao giờ đứng im tuyệt đối.
        const drift = release - (stroke + lag + reach + 0.1) - 0.05;
        if (inHold.length) {
          for (const b of inHold) pulse(arm, fore + jitterF, b + lag * 0.5, nhieu(6, 9) * (n ? 0.6 : 1));
        } else if (drift > 0.3) {
          t.to(s, { [key(arm, 1)]: fore + jitterF + nhieu(4, 8) * (ngau() < 0.5 ? -1 : 1), duration: drift / 2, ease: 'sine.inOut', yoyo: true, repeat: 1 }, stroke + lag + reach + 0.1);
          t.to(s, { [key(arm, 0)]: upper + jitterU + nhieu(1.5, 3), duration: drift / 2, ease: 'sine.inOut', yoyo: true, repeat: 1 }, stroke + lag + reach + 0.04);
        }
        // 4. VỀ NỀN: chậm hơn lúc đưa ra, cẳng tay về sau.
        if (handOver) return;
        if (RigSVG.SCREEN_AIM) t.to(s, { ['aim' + arm]: 0, duration: 0.6, ease: 'sine.inOut' }, release + lag);
        t.to(s, { [key(arm, 0)]: upper0, duration: 0.6, ease: 'sine.inOut' }, release + lag)
         .to(s, { [key(arm, 1)]: fore0, duration: 0.66, ease: 'sine.inOut' }, release + lag + 0.05);
        t.set(s, { ['tay' + arm]: this.holds[arm] ? 'mo' : N['tay' + arm] }, release + lag + 0.5);
      });
      // Tay phụ không diễn trong dáng này: nhích nhẹ theo nhịp, để không là một khúc gỗ bên cạnh tay đang diễn.
      if (other && !pose.other) {
        const [upper0, fore0] = base(other);
        t.to(s, { [key(other, 1)]: fore0 + nhieu(3, 7), [key(other, 0)]: upper0 + nhieu(1, 3), duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1 }, stroke + 0.1);
      }
    });
    // Nhịp rơi vào lúc tay đang ở NỀN: nhấn nhẹ cả tay chủ đạo lẫn tay phụ, kèm một cái gật rất nhỏ.
    for (const b of spaced) {
      if (b < 0.25 || b + 0.36 > D - 0.1 || occupied.some(([from, to]) => b + 0.36 > from && b < to)) continue;
      pulse(lead, base(lead)[1], b, nhieu(4, 7));
      if (other) pulse(other, base(other)[1], b + 0.03, nhieu(2, 4));
      t.to(s, { dauY: N.dauY + nhieu(1, 1.8), duration: 0.12, ease: 'power2.out' }, b).to(s, { dauY: N.dauY, duration: 0.24, ease: 'sine.inOut' }, b + 0.12);
    }
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
  explain(text = null, dur = 2.4, { mood = null, hand = null } = {}) {
    const t = this.tl(), s = this.s, tone = this.#tone(mood, 0.45, 0.5);
    this.#stageSpeech(t, hand);
    const soAm = this.#soAm(text, dur), nhip = dur / soAm;
    // Nền THẤP và LỆCH: tay trái buông gần thõng, tay phải hé hơn một chút.
    // Trái phải khác nhau ngay từ nền thì cái nâng của tay phải mới nổi lên —
    // để hai tay ngang nhau là bàn tay phải bị bàn tay trái che mất.

    // Không đặt lại dáng tay ở đây: cử chỉ (`#cuChi`) đi thẳng từ tư thế nghỉ của nhân vật.
    t.to(s, { ...tone.start, nhinX: 0.8, duration: 0.35, ease: 'power2.out' }, 0);

    this.blinkTo = tone.eyes;
    this.#khauHinh(t, soAm, nhip, tone.corner);

    // Bỏ nhịp nào rơi vào 0.5s cuối: đang vung dở thì bị `#khep` giật về nghỉ.
    // Mọi âm tiết đều là ứng viên; `#cuChi` tự giãn các cử chỉ cách nhau đủ xa. Bản trước chỉ lấy âm thứ 1, 6,
    // 11…: câu 4,5 s rơi mất hai trong ba mốc (một quá sát mốc trước, một quá sát cuối câu) và chỉ còn một cử chỉ.
    const moc = [];
    for (let i = 1; i < soAm && i * nhip <= dur - 0.5; i++) moc.push(i * nhip);
    // Không có tiếng thật: nhịp nhấn ước theo âm tiết — cứ ba âm tiết một lần nhấn.
    const stress = [];
    for (let i = 1; i < soAm; i += 3) stress.push(i * nhip);
    this.#cuChi(t, moc, dur, stress, hand);

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
  speakCues(cue, dur = null, { cuChi = true, mood = null, hand = null } = {}) {      // `{ text }` trong tham số thứ ba là LỜI cho `captions()`; rig không dùng tới
    const t = this.tl(), s = this.s, tone = this.#tone(mood, 0.4, 0.45);
    this.blinkTo = tone.eyes;
    this.#stageSpeech(t, hand);
    const ds = Array.isArray(cue) ? cue : (cue && cue.mouthCues) || [];
    const D = dur || (cue && cue.metadata && cue.metadata.duration)
                  || (ds.length ? ds[ds.length - 1].end : 2);
    // Không có cue thì rơi về nhịp ước lượng, đừng đứng im mở mắt.
    if (!ds.length) return this.explain(null, D);

    // Nền CAO hơn `explain`: người dẫn tin giữ thế sẵn sàng, hai tay tách
    // nhau ngang bụng — không phải thế nghỉ đan tay. Giữa hai mệnh đề tay về
    // đây, nên nền chính là tư thế người xem nhìn thấy nhiều nhất.
    // Không đặt lại dáng tay ở đây: cử chỉ (`#cuChi`) đi thẳng từ tư thế nghỉ của nhân vật.
    t.to(s, { ...tone.start, nhinX: 0.6, duration: 0.3, ease: 'power2.out' }, 0);

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

    // MIỆNG ĐI TRƯỚC TIẾNG `LEAD` giây. Đo trên một câu 7,5 s (giọng máy + cue `spectral`): bắt đầu đổi khẩu hình đúng
    // mốc cue thì độ mở miệng khớp biên độ tiếng nhất khi dời SỚM 67 ms — tức miệng đang chậm hơn tiếng chừng hai
    // khung hình 30 fps. Mắt người chịu được hình đi trước tiếng tốt hơn nhiều so với hình đi sau (đó cũng là lệ của
    // dân hoạt hình: khẩu hình sớm một hai khung), nên dời mọi khẩu hình sớm lên.
    const VAO = 0.06, LEAD = 0.06;
    for (const c of ds) {
      const h = RHUBARB[c.value] || RHUBARB.X;
      t.to(s, { mieng: h.mieng, chum: h.chum, cuoi: tone.corner(h.cuoi),
                duration: Math.min(VAO, Math.max(0.02, (c.end - c.start) * 0.6)),
                ease: 'power1.out' }, Math.max(0, c.start - LEAD));
    }

    const moc = [];
    // CỬ CHỈ ĐẦU TIÊN đi cùng tiếng đầu tiên. Mốc cử chỉ vốn chỉ là chỗ dứt một quãng ngắt hơi GIỮA câu, nên câu nào
    // cũng mở đầu bằng một đoạn đứng yên tay cho tới quãng ngắt đầu — đo trên một câu 7,5 s là 1,5 s đứng đan tay mà
    // nói. Câu đủ dài (trên 2,4 s) thì thêm mốc ở ngay tiếng đầu; mốc ngắt hơi nào sát nó hơn 2,4 s vẫn bị bỏ như cũ.
    const opening = ds.find((c) => c.value !== 'X');
    if (opening && D > 2.4 && opening.start < 0.6) moc.push(Math.max(opening.start, 0.12));
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
    // TRỌNG ÂM lấy từ chính bộ cue: chỗ miệng mở to nhất (D), và âm tiết đầu tiên sau một quãng ngắt.
    const stress = [];
    ds.forEach((c, i) => { if (c.value === 'D' || (i && ds[i - 1].value === 'X' && c.value !== 'X' && c.value !== 'A')) stress.push(c.start); });
    if (cuChi) this.#cuChi(t, moc, D, stress, hand);

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
    // Một tay lên ngực bằng `cang` (gập khuỷu) — đo thì bàn tay từ y 320 lên 285, tức vừa chạm dưới túi ngực. Tay kia
    // buông thấp cho lệch hẳn. Tay lên ngực là tay phải; đang quay mặt sang phải thì là tay trái (xem `#chestHand`).
    const chest = this.#chestHand(), low = chest === 'L' ? 'R' : 'L';
    t.set(s, { tayL: 'mo', tayR: 'mo' }, 0);
    t.to(s, { ['bat' + chest]: 28, ['cang' + chest]: -122, ['bat' + low]: 10, ['cang' + low]: -58,
              than: 2, vai: -2, dau: 5, dauY: 2.5, nhinY: 0.8, nhinX: -0.4,
              mayL: 0.7, mayR: 0.7, cuoi: -0.5, mieng: 0.08,
              duration: 0.55, ease: 'power2.out' }, 0);
    // Ngước lên nhìn thẳng, tay khẽ ấn vào ngực rồi buông — để tư thế còn thở
    // chứ không đông cứng suốt clip.
    t.to(s, { nhinY: -0.3, nhinX: 0, dau: 3, dauY: 1.6, ['cang' + chest]: -128, cuoi: -0.42,
              duration: 0.4, ease: 'sine.inOut' }, 0.6)
     .to(s, { ['cang' + chest]: -122, dauY: 2, duration: 0.45, ease: 'sine.inOut' }, 1.0);
    this.#chop(t, 0.85);
    this.#khep(t, 0.6, 1.55);
    return t;
  }
}

