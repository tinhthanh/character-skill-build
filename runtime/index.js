// index.js — CỬA VÀO của thư viện nhân vật.
//
// Nạp bằng một trong hai cách:
//   • ES module (studio, trang web thường):  import { taoNhanVat } from './runtime/index.js'
//   • Thẻ <script> thường (HyperFrames):     <script src="dist/character.iife.js"> → window.VGCharacter
//     (bản dựng một tệp, sinh bằng `python3 tools/build.py`)
//
// Mọi hàm ở đây ĐỒNG BỘ và không đọc mạng: composition dựng video phải dựng xong
// timeline ngay trong lượt chạy script đầu tiên, và không được fetch gì lúc render.
// Bộ số (config) vì thế truyền vào dưới dạng OBJECT, không phải đường dẫn.
import { RigSVG } from './rig-svg.js';
import { RigThu } from './rig-thu.js';
import { dangKyDau, KIT } from './characters.js';
import TUY_CHINH from '../characters/index.js';

/** Tên biến toàn cục của bản dựng IIFE. */
export const IIFE_TEN = 'VGCharacter';

/**
 * Đăng ký một nhân vật tuỳ chỉnh (xem `characters/_mau.js`).
 *   id         khoá, chỉ gồm chữ thường, số và gạch dưới
 *   dua        khoá nhân vật làm GỐC — nhân vật mới thừa hưởng mọi thứ không ghi đè
 *   dinhNghia  (goc, kit) => object định nghĩa
 */
export function dangKyTuyChinh({ id, dua = 'bac_si_thu_y', dinhNghia }) {
  if (!/^[a-z][a-z0-9_]*$/.test(id || '')) throw new Error(`[character] id không hợp lệ: "${id}"`);
  const goc = RigSVG.NHAN_VAT[dua];
  if (!goc) throw new Error(`[character] "${id}" dựa trên "${dua}" nhưng chưa có nhân vật ấy (có: ${Object.keys(RigSVG.NHAN_VAT).join(', ')})`);
  return RigSVG.dangKy(id, dinhNghia(goc, KIT));
}

dangKyDau(RigSVG, 'bac_si_thu_y');
for (const nv of TUY_CHINH) dangKyTuyChinh(nv);

/**
 * Đổ bộ số (tệp `configs/<khoa>.json` do studio lưu) vào một rig NGƯỜI. Thứ tự có ý:
 * `mau` dựng lại SVG nên chạy đầu; `tay` đổi tỉ lệ cánh tay nên chạy trước `nghi`.
 */
export function napBoSo(rig, c) {
  if (!c) return rig;
  if (c.mau)   rig.doiMau(c.mau);
  if (c.than)  rig.doiThan(c.than);
  if (c.tay)   rig.doiTay(c.tay);
  if (c.tayAo) rig.doiTayAo(c.tayAo);
  if (c.chan)  rig.doiChan(c.chan);
  if (c.khuon) rig.doiKhuonMat(c.khuon);
  if (c.may || c.viTriMay) rig.doiChanMay({ ...(c.may || {}), ...(c.viTriMay || {}) });
  if (c.net)   rig.doiNetMat(c.net);
  if (c.nghi) {
    rig.nv.nghi = { ...(rig.nv.nghi || {}), ...c.nghi };
    rig.NGHI = Object.freeze({ ...rig.NGHI, ...c.nghi });
  }
  rig.datNghi();
  return rig;
}

/** Dựng một nhân vật NGƯỜI vào `host`. `config` là object bộ số (hoặc bỏ trống). */
export function taoNhanVat(host, { khoa = 'bac_si_thu_y', config = null } = {}) {
  if (!RigSVG.NHAN_VAT[khoa]) throw new Error(`[character] không có nhân vật "${khoa}" (có: ${Object.keys(RigSVG.NHAN_VAT).join(', ')})`);
  host.style.aspectRatio = `${RigSVG.KHUNG.w}/${RigSVG.KHUNG.h}`;
  const rig = new RigSVG(host, khoa);
  napBoSo(rig, config);
  return { rig, khoa };
}

/** Dựng một THÚ CƯNG ('cho' | 'meo') vào `host`. `config` hiện chỉ mang `mau`. */
export function taoThuCung(host, { loai = 'cho', config = null } = {}) {
  host.style.aspectRatio = `${RigThu.KHUNG.w}/${RigThu.KHUNG.h}`;
  const rig = new RigThu(host, loai);
  if (config && config.mau) rig.doiMau(config.mau);
  rig.datNghi();
  return { rig, khoa: loai };
}

/** Gieo hạt cho MỌI thứ ngẫu nhiên (chớp mắt, khẩu hình, cử chỉ). Bắt buộc khi dựng video. */
export function gieo(hat) { RigSVG.gieo(hat); RigThu.gieo(hat); }

/** Liệt kê nhân vật đang có và động tác của từng loại. */
export function danhSach() {
  return {
    nguoi: Object.fromEntries(Object.entries(RigSVG.NHAN_VAT).map(([k, v]) => [k, v.ten])),
    thu: Object.fromEntries(Object.entries(RigThu.LOAI).map(([k, v]) => [k, v.ten])),
    dongTacNguoi: [...RigSVG.DONG_TAC, ...RigSVG.DI_NGANG],
    dongTacThu: RigThu.DONG_TAC,
  };
}

/**
 * Xếp một CHUỖI động tác của MỘT nhân vật thành một timeline (paused) — thứ để
 * `add` vào timeline của composition.
 *
 *   kichBan(rig, ['enter', 'wave', ['giaiThich', 'Xin chào!', 2.4], 0.5, ['idle', 2], 'exit'])
 *
 * Mỗi mục là tên động tác, hoặc [tên, ...tham số], hoặc một SỐ (nghỉ thêm chừng ấy giây).
 *
 * Vì sao không tự `add` từng timeline: vài động tác đọc vị trí nhân vật LÚC DỰNG
 * (`walk` có quãng đường, `point`). Dựng tất cả từ tư thế ban đầu thì động tác sau
 * một lần đi sẽ xuất phát sai chỗ. Hàm này đẩy nhân vật tới cuối từng bước trước khi
 * dựng bước kế, rồi trả nhân vật về trạng thái đầu.
 */
export function kichBan(rig, cacBuoc, { cach = 0.1 } = {}) {
  const t = gsap.timeline({ paused: true, onUpdate: () => rig.apDung() });
  // Chỉ chép các khoá trạng thái thật — GSAP gắn thêm `_gsap` vào `rig.s`, chép cả nó là hỏng.
  const chup = () => Object.fromEntries(Object.keys(rig.NGHI).map((k) => [k, rig.s[k]]));
  let at = 0, cuoi = chup(), khung0 = null;
  for (const b of cacBuoc) {
    if (typeof b === 'number') { at += b; continue; }
    const [ten, ...thamSo] = Array.isArray(b) ? b : [b];
    if (typeof rig[ten] !== 'function') throw new Error(`[character] không có động tác "${ten}"`);
    // Dựng nháp một lần để biết động tác này BẮT ĐẦU từ trạng thái nào. Vài động tác mở đầu
    // bằng `set` (enter đặt nhân vật ra ngoài khung), mà GSAP KHÔNG vẽ `set` khi đầu phát nằm
    // đúng ở thời điểm 0 — tua về khung 0 thì nhân vật đứng giữa khung thay vì ở ngoài. Nên
    // đặt sẵn trạng thái ấy vào rig TRƯỚC khi dựng bản thật: lúc đó `set` không còn đổi gì,
    // và giá trị GSAP ghi nhớ để lùi về chính là trạng thái đúng.
    Object.assign(rig.s, cuoi);
    const nhap = rig[ten](...thamSo);
    nhap.progress(1e-6); const batDau = chup(); nhap.kill();
    Object.assign(rig.s, batDau);
    if (!khung0) khung0 = batDau;
    const con = rig[ten](...thamSo);
    con.progress(1); cuoi = chup();
    con.progress(0).paused(false);
    t.add(con, at);
    at += con.duration() + cach;
  }
  Object.assign(rig.s, khung0 || cuoi);       // rig nằm sẵn ở đúng khung 0 của chuỗi
  t.progress(0);
  rig.apDung();
  return t;
}

export { RigSVG, RigThu, KIT };
