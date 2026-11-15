// params.js — MỘT bảng mô tả mọi thứ chỉnh được trên khuôn mặt nhân vật.
//
// Bốn nhóm (khẩu hình · chân mày · khuôn mặt · mắt-mũi-miệng) trước đây nằm ở
// bốn tệp, và trang thì dựng bốn khối giao diện gần y hệt nhau cho chúng. Bốn
// khối ấy ĐÃ BẮT ĐẦU TRÔI KHỎI NHAU — một khối làm tròn theo khoá, ba khối kia
// làm tròn theo bước — nên gộp lại không phải để cho gọn mắt: gộp rồi thì thêm
// một ô gõ tay, một nút, một cách lưu là sửa MỘT lần thay vì bốn.
//
// Mỗi nhóm khai đủ bốn thứ để trang tự dựng lấy:
//   ten     nhãn hiện trên giao diện
//   kieu    bảng mẫu — [tên, {tham số}] — chỉ là ĐIỂM XUẤT PHÁT
//   muc     khoảng hợp lệ của từng tham số, cho thanh trượt và cho phép kẹp
//   dat     cách đặt bộ tham số ấy lên một rig, TRẢ VỀ giá trị thực đang dùng
//
// `dat` phải trả về giá trị thực kể cả khoá không truyền vào: nhiều tham số
// suy ra lẫn nhau (`mayX` bỏ trống thì rơi về `matX`; đổi bề rộng mặt thì
// `matX` được tính lại theo viền), nên ô số phải hiện cái rig ĐANG dùng chứ
// không phải cái vừa gửi đi.

/* ─────────────────────────────────────────────────── KHẨU HÌNH (ba kênh) */
// mở (`mieng`) · rộng/khoé (`cuoi`) · chúm (`chum`) — đúng ba kênh
// [open, wide, round] quen thuộc của các bộ viseme, nên bảng khẩu hình dùng chung được.
const KIEU_MIENG = [
  ['nghỉ — mím cười',     { mieng: 0,    cuoi: 0.35, chum: 0 }],
  ['nghỉ của bác sĩ',     { mieng: 0.6,  cuoi: 1,    chum: 0 }],
  ['cười tươi, khép',     { mieng: 0.08, cuoi: 1,    chum: 0 }],
  ['cười hở răng',        { mieng: 0.45, cuoi: 1,    chum: 0 }],
  ['cười to',             { mieng: 0.85, cuoi: 0.9,  chum: 0.05 }],
  ['A · AA mở to',        { mieng: 0.86, cuoi: 0.60, chum: 0.05 }],
  ['B · EH AE hé rộng',   { mieng: 0.46, cuoi: 0.72, chum: 0 }],
  ['C · UW OW chúm',      { mieng: 0.30, cuoi: 0.08, chum: 0.85 }],
  ['D · phụ âm gần mím',  { mieng: 0.15, cuoi: 0.45, chum: 0.10 }],
  ['ngạc nhiên — O',      { mieng: 0.70, cuoi: -0.1, chum: 0.95 }],
  ['buồn',                { mieng: 0,    cuoi: -0.7, chum: 0 }],
  ['mếu, hé',             { mieng: 0.28, cuoi: -0.5, chum: 0.2 }],
];

/* ───────────────────────────────────────────────────────────── CHÂN MÀY */
// dai · day (bề dày ở ĐẦU mày) · cong · thon (0 dày đều → 1 đuôi nhọn) ·
// xech (độ, dương = đuôi hất LÊN). Không kiểu nào là một đường vẽ tay: cả
// mười là cùng một hàm `veChanMay`, khác nhau ở năm con số.
//
// `mayY` / `mayX` là VỊ TRÍ, đi qua transform chứ không qua `veChanMay`. Chúng
// không nằm trong bảng kiểu vì đặt mày cao thấp là chuyện của từng khuôn mặt,
// còn kiểu mày thì dùng lại được trên mọi khuôn mặt.
const KIEU_MAY = [
  ['mặc định — thanh',     { dai: 10.5, day: 3.0, cong: 2.25, thon: 0,    xech: -2.5 }],
  ['mảnh, vòm cao',        { dai: 10.5, day: 2.1, cong: 4.2,  thon: 0.55, xech: 0 }],
  ['dày, gần thẳng',       { dai: 11.5, day: 4.2, cong: 1.0,  thon: 0.35, xech: 1 }],
  ['rậm — nam tính',       { dai: 12.0, day: 5.0, cong: 1.6,  thon: 0.25, xech: 2 }],
  ['xếch — cương nghị',    { dai: 11.0, day: 3.4, cong: 1.2,  thon: 0.60, xech: 9 }],
  ['cụp — hiền, buồn',     { dai: 10.5, day: 2.8, cong: 1.4,  thon: 0.50, xech: -9 }],
  ['ngắn tròn — chibi',    { dai: 8.0,  day: 3.4, cong: 3.2,  thon: 0,    xech: 0 }],
  ['dài, đuôi nhọn',       { dai: 13.0, day: 3.6, cong: 2.4,  thon: 0.90, xech: 3 }],
  ['mày ngang — kiểu Hàn', { dai: 11.5, day: 3.2, cong: 0.5,  thon: 0.30, xech: 0 }],
  ['cong tròn — ngây thơ', { dai: 9.5,  day: 2.6, cong: 5.0,  thon: 0.40, xech: -1 }],
];

/* ──────────────────────────────────────────────────────────── KHUÔN MẶT */
// Hai nửa siêu-elip nối tại điểm rộng nhất. Bốn kiểu mặt kinh điển rơi thẳng
// ra từ bảy số: trái xoan (`cam` dài, `rongCam` ~0.8) · chữ điền (`hamVuong`
// cao) · trái tim (`rongTran` > 1, `rongCam` thấp) · V-line (`rongCam` rất thấp).
//
// Bộ số của "tròn — chibi" DÒ RA từ chính đường vẽ tay cũ bằng tìm kiếm lưới:
// lệch ngang lớn nhất 1.26px trên khuôn mặt rộng 100px.
//
// Hai kiểu cực đoan (trái tim, V-line) cố ý ĐỂ NHẸ TAY: `rongCam` dưới ~0.5 là
// cằm hẹp hơn khoảng cách hai mắt, ra hình côn trùng chứ không ra mặt thon.
const KIEU_MAT = [
  ['tròn — chibi (gốc)',   { rong: 50, cao: 54, cam: 56, yRong: -6,  tranVuong: 0.10, hamVuong: -0.05, rongTran: 1.06, rongCam: 1.10 }],
  ['trái xoan',            { rong: 46, cao: 56, cam: 60, yRong: -8,  tranVuong: 0.00, hamVuong: -0.20, rongTran: 1.00, rongCam: 0.82 }],
  ['chữ điền — hàm vuông', { rong: 51, cao: 52, cam: 52, yRong: -6,  tranVuong: 0.50, hamVuong: 0.85,  rongTran: 1.02, rongCam: 0.98 }],
  ['trái tim',             { rong: 50, cao: 52, cam: 56, yRong: -10, tranVuong: 0.15, hamVuong: -0.35, rongTran: 1.08, rongCam: 0.68 }],
  ['V-line — cằm nhọn',    { rong: 48, cao: 54, cam: 60, yRong: -9,  tranVuong: 0.05, hamVuong: -0.40, rongTran: 1.02, rongCam: 0.55 }],
  ['bầu bĩnh',             { rong: 54, cao: 50, cam: 52, yRong: -2,  tranVuong: 0.00, hamVuong: -0.10, rongTran: 1.08, rongCam: 1.18 }],
  ['dài, thanh',           { rong: 44, cao: 58, cam: 66, yRong: -6,  tranVuong: 0.00, hamVuong: -0.10, rongTran: 1.02, rongCam: 0.88 }],
  ['vuông ngắn',           { rong: 52, cao: 48, cam: 48, yRong: -4,  tranVuong: 0.70, hamVuong: 0.90,  rongTran: 1.05, rongCam: 1.00 }],
];

/* ──────────────────────────────────────────────────── MẮT · MŨI · MIỆNG */
// `muiY` là ĐỘ LỆCH so với chỗ hình mũi tự đặt trong slot `mui()`, không phải
// toạ độ tuyệt đối: mỗi nhân vật đặt mũi một kiểu nên số tuyệt đối vô nghĩa.
const KIEU_NET = [
  ['gốc — bác sĩ thú y',    { matX: 20, matY: 2,  matCo: 1,    muiY: 0,  muiCo: 1,    miengY: 30, miengRong: 1.45 }],
  ['mắt to, mặt trẻ',       { matX: 21, matY: 4,  matCo: 1.12, muiY: 1,  muiCo: 0.9,  miengY: 32, miengRong: 1.5 }],
  ['mắt nhỏ, trưởng thành', { matX: 20, matY: 0,  matCo: 0.82, muiY: -1, muiCo: 1.15, miengY: 29, miengRong: 1.35 }],
  ['nét dồn xuống thấp',    { matX: 20, matY: 8,  matCo: 0.95, muiY: 5,  muiCo: 1,    miengY: 36, miengRong: 1.4 }],
  ['nét dồn lên cao',       { matX: 20, matY: -5, matCo: 0.95, muiY: -5, muiCo: 1,    miengY: 22, miengRong: 1.4 }],
  ['hai mắt xa nhau',       { matX: 25, matY: 2,  matCo: 0.95, muiY: 0,  muiCo: 1,    miengY: 30, miengRong: 1.45 }],
  ['hai mắt gần nhau',      { matX: 16, matY: 2,  matCo: 1,    muiY: 0,  muiCo: 1,    miengY: 30, miengRong: 1.45 }],
  ['mặt thon — mắt vừa',    { matX: 18, matY: 2,  matCo: 0.8,  muiY: 0,  muiCo: 0.95, miengY: 30, miengRong: 1.25 }],
];

/* ─────────────────────────────────────────────────────── ĐẦU ↔ THÂN */
// Bốn số này quyết định tỉ lệ chibi và chỗ đầu ngồi trên cổ. `dauLech` là thứ
// hay phải chỉnh nhất mà lại khó đoán nhất: KHÔNG có tham số nào tên là "cổ",
// nhìn ảnh thấy cổ dài hay cổ rụt thì thứ phải sửa là chỗ ĐẶT ĐẦU.
//
//   cằm nằm ở  (−62 + khuon.cam)·coDau + (−103 + dauLech),  cổ vẽ cứng ở −130…−96
//   → dauLech lớn = đầu xuống thấp = hở ít cổ
//
// Bảng mẫu ở đây đặt lên MỌI nhân vật cùng lúc, mà `dauLech` thì mỗi nhân vật
// một khác — cằm mỗi đầu ở một cao độ.
// Chỉnh riêng một nhân vật thì mở trang với `?nv=<khoá>`.
const KIEU_THAN = [
  ['gốc — bác sĩ thú y',   { dauLech: 9,  coDau: 1.37, coThan: 0.94, coChan: 0.68 }],
  ['chibi — đầu to',       { dauLech: 9,  coDau: 1.45, coThan: 0.90, coChan: 0.68 }],
  ['chibi hơn',            { dauLech: 14, coDau: 1.62, coThan: 0.86, coChan: 0.56 }],
  ['bớt chibi',            { dauLech: 6,  coDau: 1.24, coThan: 0.95, coChan: 0.84 }],
  ['tỉ lệ người lớn',      { dauLech: 2,  coDau: 1.00, coThan: 1.00, coChan: 1.00 }],
  ['cổ dài',               { dauLech: -2, coDau: 1.45, coThan: 0.90, coChan: 0.68 }],
  ['cổ rụt',               { dauLech: 22, coDau: 1.45, coThan: 0.90, coChan: 0.68 }],
];

/* ──────────────────────────────────────────────────────────────── TAY */
// Tay đi qua transform (mỗi đốt co giãn quanh khớp đầu của nó) nên kéo là
// thấy, không phải dựng lại SVG. Gốc để tay dài tới háng — tỉ lệ người lớn
// lắp lên thân chibi; mẫu chibi (ảnh tham chiếu) tay ngắn ~0.7 và mập ~1.35,
// hai bàn tay gặp nhau trước BỤNG chứ không phải trước háng.
//
// Góc nghỉ tính để hai bàn tay CHẠM nhau với từng độ dài: vị trí bàn tay =
// vai + cánh·(sin bat, cos bat) + cẳng·(sin(bat+cang), cos(bat+cang)); tay
// ngắn hơn thì phải gập khuỷu sâu hơn (`cangNghi` âm hơn) mới chạm.
const KIEU_TAY = [
  ['gốc — mảnh, đan tay',  { daiCanhTay: 1.09, daiCangTay: 0.7,  dayTay: 0.68, coBanTay: 0.95, batNghi: 19, cangNghi: -97 }],
  ['dài tới háng',         { daiCanhTay: 1,    daiCangTay: 1,    dayTay: 1,    coBanTay: 1,    batNghi: 16, cangNghi: -64 }],
  ['chibi — ngắn, mập',    { daiCanhTay: 0.72, daiCangTay: 0.72, dayTay: 1.35, coBanTay: 1.1,  batNghi: 16, cangNghi: -80 }],
  ['ngắn vừa',             { daiCanhTay: 0.85, daiCangTay: 0.85, dayTay: 1.15, coBanTay: 1.05, batNghi: 16, cangNghi: -72 }],
  ['ngắn, thanh',          { daiCanhTay: 0.78, daiCangTay: 0.78, dayTay: 0.95, coBanTay: 0.95, batNghi: 14, cangNghi: -76 }],
  ['dài, mảnh',            { daiCanhTay: 1.08, daiCangTay: 1.08, dayTay: 0.85, coBanTay: 0.95, batNghi: 16, cangNghi: -60 }],
  ['tay thõng — chibi',    { daiCanhTay: 0.72, daiCangTay: 0.72, dayTay: 1.35, coBanTay: 1.1,  batNghi: 8,  cangNghi: -6 }],
];

/* ───────────────────────────────────────────────────────────── TAY ÁO */
// Gốc bó sát cánh tay, gấu chỉ là ranh màu. Áo blouse trong ảnh mẫu: tay áo
// RỘNG, loe ra khỏi cánh tay, ngắn, gấu xéo và có viền đậm. `daiTayAo` 1 =
// gấu ngoài ở 24px dưới chốt vai; `xeoTayAo` là px gấu ngoài thấp hơn gấu
// trong; `rongTayAo` là bề rộng gấu so với vai; `vienGau` là px nét viền gấu.
const KIEU_TAY_AO = [
  ['gốc — bó sát',           { daiTayAo: 1,    xeoTayAo: 6,  rongTayAo: 1,    vienGau: 0,   boGocTayAo: 0 }],
  ['blouse — rộng, viền',    { daiTayAo: 0.95, xeoTayAo: 8,  rongTayAo: 1.35, vienGau: 1.6, boGocTayAo: 6 }],
  ['rộng, không viền',       { daiTayAo: 1,    xeoTayAo: 7,  rongTayAo: 1.3,  vienGau: 0,   boGocTayAo: 6 }],
  ['ngắn — cánh tiên',       { daiTayAo: 0.7,  xeoTayAo: 10, rongTayAo: 1.5,  vienGau: 1.2, boGocTayAo: 7 }],
  ['dài, bó',                { daiTayAo: 1.35, xeoTayAo: 4,  rongTayAo: 0.95, vienGau: 0,   boGocTayAo: 0 }],
  ['gấu ngang, viền dày',    { daiTayAo: 1,    xeoTayAo: 0,  rongTayAo: 1.15, vienGau: 2.2, boGocTayAo: 4 }],
];

/* ─────────────────────────────────────────────────────────────── CHÂN */
// `coChan` (hàng Đầu ↔ thân) co CẢ chân kể cả bàn chân — núm chibi tổng. Năm
// số này chỉnh từng phần và giữ cỡ bàn chân: đùi, ống, dày, cách hai chân,
// bàn chân. Chân ngắn đi thì cả người tự hạ xuống cho giày vẫn chạm nền.
const KIEU_CHAN = [
  ['gốc — chân dài',       { daiDui: 1.4,  daiOng: 1.25, dayChan: 1,    cachChan: 14, coBanChan: 1 }],
  ['ngắn — chibi',         { daiDui: 1,    daiOng: 1,    dayChan: 1,    cachChan: 14, coBanChan: 1 }],
  ['chibi — mập, khép',    { daiDui: 0.9,  daiOng: 0.9,  dayChan: 1.35, cachChan: 13, coBanChan: 1.15 }],
  ['ngắn, mập',            { daiDui: 0.75, daiOng: 0.75, dayChan: 1.4,  cachChan: 13, coBanChan: 1.2 }],
  ['dài, thanh',           { daiDui: 1.15, daiOng: 1.15, dayChan: 0.85, cachChan: 15, coBanChan: 0.95 }],
  ['đứng dạng chân',       { daiDui: 1,    daiOng: 1,    dayChan: 1,    cachChan: 19, coBanChan: 1 }],
  ['chân khép sát',        { daiDui: 1,    daiOng: 1,    dayChan: 1.1,  cachChan: 11, coBanChan: 1 }],
  ['bàn chân to — chibi',  { daiDui: 0.9,  daiOng: 0.9,  dayChan: 1.25, cachChan: 13, coBanChan: 1.4 }],
];

export const NHOM = {
  mieng: {
    ten: 'Khẩu hình', kieu: KIEU_MIENG,
    // Khẩu hình sống trong `rig.s` — cùng chỗ với động tác. Đặt tay mà không
    // dừng timeline thì mỗi frame nó ghi đè lại, kéo trượt xong miệng nhảy về.
    dungDongTac: true,
    muc: {
      mieng: { min: 0, max: 1, buoc: 0.01, ten: 'mở' },
      cuoi:  { min: -1, max: 1, buoc: 0.01, ten: 'cười' },
      chum:  { min: 0, max: 1, buoc: 0.01, ten: 'chúm' },
    },
    dat: (r, k) => {
      Object.assign(r.s, k); r.apDung();
      return { mieng: r.s.mieng, cuoi: r.s.cuoi, chum: r.s.chum };
    },
  },
  may: {
    ten: 'Chân mày', kieu: KIEU_MAY,
    muc: {
      dai:  { min: 6,   max: 15,  buoc: 0.1,  ten: 'dài' },
      day:  { min: 1,   max: 6,   buoc: 0.1,  ten: 'dày' },
      cong: { min: -2,  max: 7,   buoc: 0.1,  ten: 'vòm' },
      thon: { min: 0,   max: 1,   buoc: 0.01, ten: 'thon' },
      xech: { min: -18, max: 18,  buoc: 0.5,  ten: 'xếch' },
      // `nghich`: thanh trượt vẽ ngược, kéo sang PHẢI là mày LÊN. Con số vẫn là
      // `mayY` thật (âm = lên) để chép thẳng vào định nghĩa nhân vật được — đổi
      // luôn dấu cho dễ kéo thì con số không còn dán vào đâu.
      mayY: { min: -36, max: -2, buoc: 0.5, ten: 'cao ↕', nghich: true },
      mayX: { min: 10,  max: 32, buoc: 0.5, ten: 'cách ↔' },
    },
    // Chọn KIỂU chỉ đổi hình dáng, giữ nguyên vị trí đang đặt — nếu không thì
    // mỗi lần thử một kiểu là mất công kéo lại hai thanh vị trí.
    khoaKieu: ['dai', 'day', 'cong', 'thon', 'xech'],
    dat: (r, k) => r.doiChanMay(k),
    chuanBi: (r) => { r.s.mayL = r.s.mayR = 0.6; r.apDung(); },   // nhướn sẵn cho thấy kiểu
  },
  mat: {
    ten: 'Khuôn mặt', kieu: KIEU_MAT,
    muc: {
      rong:      { min: 32,   max: 62,   buoc: 0.5,  ten: 'rộng' },
      cao:       { min: 36,   max: 72,   buoc: 0.5,  ten: 'cao' },
      cam:       { min: 36,   max: 78,   buoc: 0.5,  ten: 'cằm' },
      yRong:     { min: -22,  max: 10,   buoc: 0.5,  ten: 'gò má ↕' },
      tranVuong: { min: -0.6, max: 1.2,  buoc: 0.02, ten: 'trán ▢' },
      hamVuong:  { min: -0.8, max: 1.2,  buoc: 0.02, ten: 'hàm ▢' },
      rongTran:  { min: 0.6,  max: 1.2,  buoc: 0.01, ten: 'trán ↔' },
      rongCam:   { min: 0.35, max: 1.25, buoc: 0.01, ten: 'cằm ↔' },
    },
    dat: (r, k) => r.doiKhuonMat(k),
    // Bề rộng mặt đổi thì `mayX` và `matX` được tính lại theo viền — hai hàng
    // kia phải hiện lại số, không thì chúng chỉ con số đã cũ.
    keoTheo: ['may', 'net'],
  },
  than: {
    ten: 'Đầu ↔ thân', kieu: KIEU_THAN,
    muc: {
      dauLech: { min: -12, max: 60,  buoc: 0.5,  ten: 'đầu ↕' },
      coDau:   { min: 0.8, max: 1.8, buoc: 0.01, ten: 'đầu ⌀' },
      coThan:  { min: 0.7, max: 1.3, buoc: 0.01, ten: 'thân ⌀' },
      coChan:  { min: 0.5, max: 1.3, buoc: 0.01, ten: 'chân ⌀' },
    },
    dat: (r, k) => r.doiThan(k),
    ghiChu: 'mỗi nhân vật một “đầu ↕” riêng — chỉnh riêng thì mở ?nv=<khoá>',
    // Đổi cỡ đầu hay chỗ đặt đầu thì khung "phóng vào mặt" tính từ trước đó
    // không còn đúng — trang phải tính lại, xem `khungMat`.
    tinhLaiKhung: true,
  },
  tay: {
    ten: 'Tay', kieu: KIEU_TAY,
    // Góc nghỉ sống trong `rig.s` như khẩu hình: không dừng timeline thì động
    // tác đang chạy ghi đè lại, kéo xong tay nhảy về.
    dungDongTac: true,
    muc: {
      daiCanhTay: { min: 0.5,  max: 1.4, buoc: 0.01, ten: 'cánh tay ↕' },
      daiCangTay: { min: 0.5,  max: 1.4, buoc: 0.01, ten: 'cẳng tay ↕' },
      dayTay:     { min: 0.6,  max: 1.8, buoc: 0.01, ten: 'dày ↔' },
      coBanTay:   { min: 0.6,  max: 1.6, buoc: 0.01, ten: 'bàn tay ⌀' },
      batNghi:    { min: -10,  max: 60,  buoc: 0.5,  ten: 'nghỉ: bắp °' },
      cangNghi:   { min: -110, max: 20,  buoc: 0.5,  ten: 'nghỉ: cẳng °' },
    },
    dat: (r, k) => r.doiTay(k),
    ghiChu: 'góc nghỉ áp cho cả hai tay — tay ngắn lại thì gập cẳng sâu hơn (số âm hơn) để hai bàn tay còn chạm nhau',
  },
  tayAo: {
    ten: 'Tay áo', kieu: KIEU_TAY_AO,
    muc: {
      daiTayAo:  { min: 0.4, max: 2,   buoc: 0.01, ten: 'dài ↕' },
      xeoTayAo:  { min: -6,  max: 16,  buoc: 0.5,  ten: 'gấu xéo' },
      rongTayAo: { min: 0.8, max: 1.8, buoc: 0.01, ten: 'rộng ↔' },
      vienGau:   { min: 0,   max: 4,   buoc: 0.1,  ten: 'viền gấu' },
      boGocTayAo:{ min: 0,   max: 10,  buoc: 0.5,  ten: 'bo góc trong' },
    },
    dat: (r, k) => r.doiTayAo(k),
    ghiChu: 'tay áo dài theo cánh tay (hàng Tay) rồi mới nhân số ở đây; đệm vai và đường may tự co theo gấu. '
          + '"bo góc trong" bo cái góc gấu chĩa vào ngực — tay áo càng loe thì góc đó càng thọc vào ống nghe; '
          + 'bo bị chặn theo khoảng thừa giữa gấu và cánh tay nên kéo quá tay cũng không lòi da',
  },
  chan: {
    ten: 'Chân', kieu: KIEU_CHAN,
    muc: {
      daiDui:    { min: 0.5, max: 1.4, buoc: 0.01, ten: 'đùi ↕' },
      daiOng:    { min: 0.5, max: 1.4, buoc: 0.01, ten: 'ống ↕' },
      dayChan:   { min: 0.6, max: 1.8, buoc: 0.01, ten: 'dày ↔' },
      cachChan:  { min: 6,   max: 26,  buoc: 0.5,  ten: 'cách ↔' },
      coBanChan: { min: 0.6, max: 1.8, buoc: 0.01, ten: 'bàn chân ⌀' },
    },
    dat: (r, k) => r.doiChan(k),
    ghiChu: '“chân ⌀” ở hàng Đầu ↔ thân co cả chân kể cả giày; hàng này chỉnh từng phần, giày giữ cỡ',
    tinhLaiKhung: true,       // chân ngắn đi thì cả người hạ xuống, khung mặt dời theo
  },
  net: {
    ten: 'Mắt · mũi · miệng', kieu: KIEU_NET,
    muc: {
      matX:      { min: 10,  max: 30,  buoc: 0.5,  ten: 'mắt ↔' },
      matY:      { min: -14, max: 18,  buoc: 0.5,  ten: 'mắt ↕' },
      matCo:     { min: 0.6, max: 1.4, buoc: 0.01, ten: 'mắt ⌀' },
      muiY:      { min: -14, max: 14,  buoc: 0.5,  ten: 'mũi ↕' },
      muiCo:     { min: 0.5, max: 1.8, buoc: 0.02, ten: 'mũi ⌀' },
      miengY:    { min: 12,  max: 48,  buoc: 0.5,  ten: 'miệng ↕' },
      miengRong: { min: 0.7, max: 2,   buoc: 0.02, ten: 'miệng ↔' },
    },
    dat: (r, k) => r.doiNetMat(k),
  },
};

/**
 * viewBox cắt sát khuôn mặt của MỘT rig cụ thể.
 *
 * Phải tính chứ không hằng số hoá được: tâm đầu phụ thuộc `coDau`, `dauLech`,
 * `coThan`, `coChan` — bốn thứ mỗi nhân vật một khác. Khung cứng hợp với bác
 * sĩ thú y sẽ lệch 7px với `surgeon`, đủ để cắt mất cằm.
 *
 * Chuỗi transform trong `apDung`, đi từ trong ra:
 *   đầu:  translate(0 −62)·scale(coDau)  rồi  translate(0, −103 + dauLech)
 *   thân: translate(200 262)·scale(coThan)
 *   gốc:  translate(0, DOI_Y + doiChan),  doiChan = rig.hangChan() — bàn chân luôn chạm nền 428
 */
export function khungMat(rig, nua = 68) {
  const nv = rig.nv;
  const doiChan = rig.hangChan();     // gồm cả coChan lẫn tỉ lệ từng đốt chân
  const cy = 262 + (nv.coDau * -62 + (-103 + nv.dauLech)) * nv.coThan + 30 + doiChan;
  // Hạ tâm khung xuống 5px: đầu chibi có tóc cao, canh đúng tâm hình học thì
  // xén mất búi ở trên mà dưới cằm lại thừa một khoảng trống.
  return `${200 - nua} ${cy - nua + 5} ${nua * 2} ${nua * 2}`;
}
