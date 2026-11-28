// runtime/person/shared.js — module-level constants and helpers of `RigSVG` (split out of runtime/rig-svg.js).
// Every name is exported: the core class (runtime/rig-svg.js) and the action groups next to this file import what they use.

import { MARKS, freshMark, attachMark, drawMark, markTweens, markOff } from '../marks.js';
import { attachShade, outlinePoints } from '../shading.js';
import { toy42e, bowl42e, leash, toyShape42e, bowlShape42e } from '../parts.js';

// đợt 42 E: món đồ nhặt dưới sàn lên (`pickUp`) — quả bóng, bát ăn, dây dắt

const KHUNG = { w: 400, h: 470 };
const DOI_Y = 30;                              // chừa chỗ phía trên cho đầu to / tóc búi            // bao được tư thế rộng nhất (present)

const NGHI = Object.freeze({
  x: 0, y: 0, mo: 1, co: 1, huong: 0,
  than: 0, tho: 0, vai: 0,
  dau: 0, dauX: 0, dauY: 0,
  batL: 11, batR: 11, cangL: -17, cangR: -17, vungL: 0, vungR: 0,
  duiL: 0, duiR: 0, ongL: 0, ongR: 0, nhacL: 0, nhacR: 0,
  seat: 0,                 // 0…1 ngồi: đùi rút ngắn về phía người xem, ống chân giữ nguyên (xem apDung)
  ride: 0,                 // 0…1 CẦM LÁI xe máy (`ride`): nghiêng hẳn, đùi nằm ngang ra trước, hai tay nắm tay lái (xem apDung)
  kneel: 0,                // 0…1 QUỲ (cộng với `seat` = 1): ống chân cũng chĩa về phía người xem, rút ngắn một nửa — người hạ thêm
  // ĐỢT 42 E — SÁT SÀN: `floor42e` 0…1 NGỒI BỆT xếp bằng (hai đùi xoè ngang, hai ống chân gập chéo trước bụng, mông chạm sàn — `sitOnFloor`);
  // `squat42e` 0…1 NGỒI XỔM nhìn nghiêng (đùi chĩa ra trước–lên, gót sau gối, bàn chân áp sàn — `pickUp`); `lie42e` 0…1 NẰM (cả người xoay
  // quanh hông tới gần nằm ngang — `lieDown`), `lieDir42e` −1 đầu về bên trái / +1 bên phải, `lieLift42e` mặt nằm cao hơn sàn bao nhiêu (đơn vị
  // khung: 0 sàn, mặt sofa), `nap42e` 0…1 mắt nhắm (ngủ); `picked42e` số món đồ đã NHẶT khỏi sàn (món thứ n nằm dưới sàn khi `picked42e` < n − 0,5).
  floor42e: 0, squat42e: 0, lie42e: 0, lieDir42e: -1, lieLift42e: 0, nap42e: 0, picked42e: 0,
  matY: 0, nhinX: 0, nhinY: 0,
  mayL: 0, mayR: 0, mieng: 0, chum: 0, cuoi: 0.35,
  itemL: 1, itemR: 1,      // độ hiện của đồ vật cầm ở tay trái / phải (0 = cất đi)
  itemTiltL: 0, itemTiltR: 0,   // độ nghiêng thêm của đồ vật về phía mặt (độ) — nghiêng cốc khi uống
  itemZoomL: 1, itemZoomR: 1,   // món đồ phóng to quanh lòng bàn tay — giơ điện thoại khoe màn hình cho người xem đọc được
  itemBackL: 0, itemBackR: 0,
  // Đợt 44 A — NHẬN TÚI (`takeBag`): `bagMatch44a` 1…0 túi trong tay mình vẽ ĐÚNG CHỖ VÀ CỠ túi trong tay người đưa (người thứ
  // `bagGiver44a` trong `rig.bagGivers44a`, đo trên màn hình lúc vẽ), rồi trượt về tay mình — túi không nhảy lúc sang tay dù máy quay nào.
  bagMatch44a: 0, bagGiver44a: -1,
  phoneL: 0, phoneR: 0,
  toolL: 0, toolR: 0,
  gadgetL: 0, gadgetR: 0,       // dụng cụ nhỏ hiện trong tay ấy: 1 = đèn soi (`examine`), 2 = bánh thưởng, 3 = viên thuốc (`giveTreat`), 4 = lược (`brush`), 5 = đèn pin (`shine`), 6 = nhiệt kế (`takeTemp`), 7 = viên thuốc to (`givePill`), 8 = cuộn băng (`bandage`), 9 = loa cầm tay (`putCone`)
                                // … đợt 38 A: 10 = kìm cắt móng (`clipNails`), 11 = lọ nhỏ mắt (`eyeDrops`), 12 = bông lau tai (`cleanEars`), 13 = máy quét chip (`scanChip`)
  // ĐỢT 39 A — quầy thu ngân & quầy cà phê (gadget 20 = khăn lau, 21 = con dấu, 22 = bình rót, 23 = xấp tiền đang đếm): `ting` 0…1 dấu tick xanh trên điện thoại /
  // thẻ (`payByQR`, `payByCard`); `inkL/R` 0…1 dấu đỏ đã đóng trên thẻ tích điểm cầm ở tay ấy (`stampCard`); `pourL/R` độ dài dòng nước từ bình trong tay ấy
  // (đơn vị bàn tay, 0 = không chảy); `tipL/R` độ nghiêng bình (độ); `brewL/R` mức nước trong cốc cầm ở tay ấy 0…1 (> 0: cốc hiện thành cốc thuỷ tinh đựng nước);
  // `fanL/R` số tờ tiền hiện trong tay ấy (gadget 23); `foldL/R` 0 khăn trải ra → 1 gấp lại (gadget 20).
  ting: 0, inkL: 0, inkR: 0, pourL: 0, pourR: 0, tipL: 0, tipR: 0, brewL: 0, brewR: 0, fanL: 0, fanR: 0, foldL: 0, foldR: 0,
  note: 0,                      // 0…1 THẺ THÔNG BÁO bật ra trên điện thoại (`notify`): độ lớn / độ hiện
  ball: 0,                      // quả bóng ném đi (`throwBall`): 0 = không có, 0…1 đang bay, 1 = đã chạm đất ở xa
  leash: 0,                     // 1 = đang DẮT một con vật: vẽ dây từ tay cầm quai dây (`items: { R: 'leash' }`) tới vòng cổ nó
  leashPet49c: 0,               // đợt 49 C: con vật đang dắt = `leashPets49c[leashPet49c − 1]` (0: con của `leash`, `leashed`) — trạng thái, nên một người dắt lần lượt nhiều con
  leashRope49c: 0,              // đợt 49 C: 0…1 dây dắt võng theo ĐỘ DÀI THẬT của nó (`walkOnLeash`) thay cho độ võng cố định — giữ tới `unleash`
  rope: 0,                      // đợt 40 A: 1 = đang KÉO CO (`pullToy`) — dây thừng căng từ tay tới mõm con chó
  watchL: 0, watchR: 0,
  heartL: 0, heartR: 0,         // trái tim bật ra trên bàn tay 'tim' (bắn tim): 0 = chưa có, 1 = đủ lớn
  ovL: 0, ovR: 0, ovBatL: 0, ovBatR: 0, ovCangL: 0, ovCangR: 0,   // đặt góc tay CUỐI CÙNG (góc trên màn hình), trọng số 0…1 — xem apDung
  sauDauL: 0, sauDauR: 0,       // 1 = cánh tay ấy vẽ SAU đầu (gãi gáy: bàn tay vòng ra sau đầu)
  handZoomL: 1, handZoomR: 1,   // phóng to bàn tay (đếm ngón cho dễ đọc)
  khoc: 0, khocY: 0,            // nước mắt (0…1 hiện) và độ chảy của giọt nước mắt (0…1, xuống má)
  moHoi: 0, doMa: 0,            // giọt mồ hôi ở thái dương (ngượng, bối rối) · má đỏ thêm (0…1)         // 1 = đồng hồ đeo ở cổ tay ấy (`checkWatch`)
  petDrop: 0,                   // 0 / 1 đã nhận con vật từ tay người khác (`takePet`): nó được đặt xuống cạnh chân người này (RigThu.dropX, đợt 30)
  omGive: 0,                    // 0…1 đang TRAO con vật đang bế (`handOverPet`): nó và hai cánh tay đi ra điểm giữa hai người
  omHome: 0,                    // 1 trong lúc ĐẶT con vật xuống (`putDown`): nó hạ về CHỖ NHÀ của nó — kể cả khi nhận nó từ tay người khác
  om: 0, omRise: 0,             // đang BẾ một con vật (SVG của nó nằm trong ngăn `om`) / độ nhấc nó lên trước ngực 0…1           // 1 = mặt ống nghe hiện trong tay ấy (`listen`)
  plungerL: 0, plungerR: 0,     // 0…1 pít-tông ống tiêm ấn xuống (`inject`)         // 1 = đang ÁP ĐIỆN THOẠI lên má bằng tay ấy (thế giữ: `phoneUp` / `phoneDown`, xem apDung)   // 0 = mặt trước món đồ, 1 = mặt LƯNG (phần tử `data-back`) — điện thoại áp lên má thì quay lưng ra ngoài
  carryL: 1, carryR: 1,         // 1 = tay cầm đồ giữ dáng BƯNG khi quay nghiêng; động tác dùng tay ấy (uống, đưa, cất) hạ về 0
  aimL: 0, aimR: 0,             // 1 = góc của tay ấy là góc TRÊN MÀN HÌNH: dùng nguyên vẹn dù thân đang quay (xem apDung)
  onTopL: 0, onTopR: 0,         // 1 = bàn tay ấy đang VUỐT đỉnh đầu một con vật vẽ trên người này (`over`): bối cảnh 3D vẽ thêm nó trên con vật
  petWrap: 0,                   // 0…1 BĂNG đã quấn lên chân trước con vật (`bandage`, đợt 35) — con vật đọc lại (RigThu.careLevel); giữ sau động tác
  // ĐỢT 42 F — tắm, đánh răng, lau khô: việc tay người làm lên con vật đang được giữ (con vật đọc lại khi vẽ — RigThu._veBath, tập `heldBy38`):
  // `petWet42f` lông ướt (GIỮ sau động tác), `petFoam42f` bọt trên lưng, `petDry42f` lông khô bông lên (GIỮ), `petTowel42f` khăn quấn quanh thân
  // (0…1), `petRub42f` khăn xô theo nhịp chà (−1…1), `petMood42f` −1 khó chịu (tai cụp) … 1 vui, `petGape42f` miệng hé cho đánh răng, `petLick42f`
  // liếm mép, `petShake42f` pha rũ nước 0 → 1 (con vật tự lắc — đã buông tay). `spray42fL/R` 0…1 tia nước từ vòi sen trong tay ấy (gadget 40), `sprayT42f` pha chảy của tia nước.
  petWet42f: 0, petFoam42f: 0, petDry42f: 0, petTowel42f: 0, petRub42f: 0, petMood42f: 0, petGape42f: 0, petLick42f: 0, petShake42f: 0, spray42fL: 0, spray42fR: 0, sprayT42f: 0,
  // ĐỢT 49 B — sấy, tỉa lông (runtime/person/grooming.js): `air49bL/R` 0…1 luồng gió từ vòi sấy trong tay ấy (gadget 43), `snip49bL/R` 0…1 kéo mở
  // (gadget 44), `buzz49bL/R` 0…1 tông-đơ chạy (gadget 45), `groomT49b` đồng hồ của động tác (gió chảy, lông gợn); con vật đọc `petBlow49b` gió vào lông,
  // `petStand49b` 0…1 con vật đứng dậy (mèo / thỏ đang ngồi), `petShag49b` lông dài chưa tỉa (GIỮ), `petCutT49b` / `petCutDur49b` giây đã tỉa / giây tỉa hết lưng, `petTrimStart49b` / `petTrimEnd49b` chỗ đầu / cuối đường tỉa (GIỮ) — runtime/pet/grooming.js.
  air49bL: 0, air49bR: 0, snip49bL: 0, snip49bR: 0, buzz49bL: 0, buzz49bR: 0, groomT49b: 0, petStand49b: 0, petBlow49b: 0, petShag49b: 0, petCutT49b: 0, petCutDur49b: 0, petTrimStart49b: 0, petTrimEnd49b: 0,
  petCone: 0,                   // 0…1 LOA chống liếm đã đeo vào cổ con vật (`putCone`, đợt 35) — như `petWrap`
  gadgetTurnL: 0, gadgetTurnR: 0,   // độ xoay thêm của dụng cụ trong tay quanh lòng bàn tay (góc trên màn hình) — vành loa (`putCone`, đợt 35)
  ring: 0, ringX: 0, ringY: 0, ringR: 40, ringFront: 0,
  careFront: 0,                 // 1 = con vật đang được đeo đồ vẽ TRƯỚC người này (set3d; `putCone` — cánh tay sau nó, hai bàn tay chép trên nó)   // VÒNG LOA đang cầm (`putCone`, đợt 35 lượt hai): hiện / tâm / bán kính, khung của `#aimOf`
  pageL: 0, pageR: 0,           // 0…1 tờ trên cùng của bìa kẹp hồ sơ đang LẬT lên (`readChart`, đợt 35)
  tayL: 'mo', tayR: 'mo',
  // ĐỢT 35 — cân, đo nhiệt độ, cho uống thuốc:
  readout: 0,                   // 0…1 THẺ SỐ ĐO bật lên (số cân trên cân `weigh`, nhiệt độ trên nhiệt kế `takeTemp`): độ lớn / độ hiện
  // ĐỢT 39 C — người dẫn: TẤM BẢNG CHỮ giơ bằng hai tay trước ngực (`holdSign`) và CHỚP SÁNG ở điện thoại khi chụp ảnh tự sướng (`takeSelfie`).
  sign: 0, signN: 0,            // 0…1 tấm bảng hiện giữa hai bàn tay · bảng nào trong `rig.signs` (chữ, màu, cỡ) — như `readoutN`
  flash: 0,                     // 0…1 chớp sáng ở điện thoại (`takeSelfie`)
  readoutN: 0,                  // thẻ nào trong `rig.readings` (1, 2, …; 0 = không có) — chữ và chỗ đặt ghi lúc dựng động tác
  omSlot: 0,                    // ĐỢT 37: lần BẾ nào trong `rig.carriedList` (carry / weigh / takePet) — mỗi khung vẽ đúng lần bế của nó
  // ĐỢT 42 D — chạy, nhảy lên, nhảy múa: `lift42d` = cả người BAY KHỎI SÀN bấy nhiêu đơn vị khung (pha bay của bước chạy, cú nhảy).
  // Khác `y` (y còn là "lùi ra xa" của walkForward / walkAway, bóng đi theo): nhấc người lên nhưng BÓNG Ở LẠI trên sàn, co lại và nhạt đi.
  lift42d: 0,
  omScale: 0,                   // 1 = con vật đang bế ĐI TỚI / RỜI CÂN (`weigh`): chỗ "nhà" của nó trong lúc ấy là mặt bệ cân, không phải chỗ nó đứng
  // ĐỢT 36 — NHÌN THEO MỘT ĐIỂM (`lookAt`): đầu quay riêng so với thân (cùng đơn vị `huong`), cúi (1) / ngẩng (−1), nghiêng thêm (độ).
  headTurn: 0, headPitch: 0, headTilt: 0,
  // ĐỢT 39 B — cười lớn, lau nước mắt, ôm trán, suỵt, ra dấu OK, chào kiểu quân đội: NHÁY MỘT MẮT (`nhayL` / `nhayR`, 0…1 cộng vào
  // độ nhắm `matY` của riêng mắt ấy — `matY` nhắm cả hai mắt nên chỉ chớp được, không nháy được).
  nhayL: 0, nhayR: 0,
  // ĐỢT 38 A — cắt móng, nhỏ mắt, vệ sinh tai, quét chip. Bốn kênh `pet…` là việc tay người làm trên con vật đang được giữ — con vật
  // đọc lại mỗi lần vẽ (RigThu._careView): chân trước nhấc lên, cằm nâng lên, mắt nhắm sau giọt thuốc, lắc đầu (−1…1).
  petPaw: 0, petChin: 0, petBlink: 0, petShake: 0,
  snipL: 0, snipR: 0,           // 0…1 kìm cắt móng trong tay ấy KHÉP lại (gadget 10)
  dropL: 0, dropR: 0,           // 0…1 giọt thuốc rơi từ đầu lọ nhỏ mắt (gadget 11) tới mắt con vật; 0 = chưa / không có giọt
  // ĐỢT 38 B — rửa tay, đeo / tháo găng: bọt xà phòng quanh hai bàn tay (0…1, cỡ đám bọt của dụng cụ 14) và GĂNG trên từng tay
  // (0 = tay trần, ≥ 0,3 bàn tay đã trong găng — mép găng trượt từ giữa bàn tay lên cổ tay tới 1; > 1 là mép găng bật quá cổ tay
  // lúc búng). Găng là THẾ GIỮ như `itemL`: `_khep` giữ nguyên. Dụng cụ (`gadget`) 14 = bọt xà phòng, 15 = chiếc găng cầm ở cổ găng.
  foam: 0, gloveL: 0, gloveR: 0,
  // ĐỢT 38 C — HAI NGƯỜI: 1 = người này vẽ TRƯỚC người đang cùng diễn (`rig.pairWith`) trong bối cảnh 3D — miệng và bàn tay khum khi
  // thì thầm, bàn tay đặt lên vai khi vỗ vai không khuất sau đầu / tóc người kia.
  pairFront: 0, pairSlot: 0,    // `pairSlot`: người kia là mục nào của `rig.pairList` (như `omSlot`) — mỗi khung đúng người của lần ấy
  // ĐỢT 49 A — CHUỒNG LƯU TRÚ (`putInCage`, `takeOutOfCage`): `cageDoor49a` 0 đóng … 1 mở cửa chuồng người này đang mở; `cageMove49a` số lần người này đã
  // dời con vật vào / ra chuồng (lần thứ n đã dời khi `cageMove49a` > n − 0,5 — RigThu.dropX; GIỮ như `picked42e`); `free49aL/R` 1 = tay ấy rời con vật đang bế (mở cửa).
  cageDoor49a: 0, cageMove49a: 0, free49aL: 0, free49aR: 0,
  // ĐỢT 50 C — BÁT ĂN (`serveBowl`): `bowl50c` số bát người này đã đặt xuống (GIỮ), `bowlFill50c` 0…1 độ đầy của bát mới nhất (GIỮ), `pour50c` 0…1 dòng
  // đổ đang chảy, `feedT50c` giây (hạt rơi, nước gợn). LỒNG VẬN CHUYỂN: `carrier50c` số mục nhật ký lồng đã xảy ra (GIỮ — `carrierLog50c`), `carrierDoor50c`
  // 0 đóng … 1 mở cửa lưới của đạo cụ thứ `carrierDoorN50c` − 1 trong `carrierProps50c`.
  bowl50c: 0, bowlFill50c: 0, pour50c: 0, feedT50c: 0, carrier50c: 0, carrierDoor50c: 0, carrierDoorN50c: 0,
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
const RIDE_THIGH = 84;                    // cầm lái: đùi gần (độ) xoay ra trước — gần nằm ngang; đùi xa ít hơn 6° cho hai chân khỏi chồng khít
const RIDE_KNEE = 76;                     // …ống chân gập lại gần thẳng đứng, bàn chân hơi ra trước (sàn để chân)
const RIDE_LEAN = 7;                      // …lưng hơi đổ về trước
const RIDE_ARM = [56, 24];                // …hai tay (góc trên màn hình, về phía mặt): bắp tay ra trước–xuống, cẳng tay ngang hơn tới tay lái
// ĐỢT 42 E — sát sàn (độ / tỉ lệ). NGỒI BỆT nhìn thẳng: đùi xoè ra ngang (`thigh`), rút ngắn vì chĩa cả về phía người xem (`seen`), ống chân gập
// ngược vào (`knee`, so với đùi) gần nằm ngang chéo trước bụng; nhìn nghiêng: đùi chĩa ra trước (`thighSide`), ống chân gập về sau dưới đùi (`kneeSide`).
const FLOOR42E = { thigh: 72, seen: 0.38, knee: 150, thighSide: 84, kneeSide: 158 };
// NGỒI XỔM (nhìn nghiêng): đùi ra trước, đầu gối cao hơn hông một chút (`thigh`), ống chân chéo về sau (gót sau gối: `knee` so với đùi), lưng
// đổ về trước `lean` độ — lưng thẳng, gập ở hông và gối, không cúi khom.
const SQUAT42E = { thigh: 100, knee: 125, lean: 30 };
const LIE42E = { tilt: 9 };               // nằm: thân xoay (90 − tilt)° — phía đầu nhấc lên chút, gối lên cánh tay / gối tựa
// Đợt 35 — dụng cụ & hồ sơ ở phòng khám.
const BANDAGE_LOOP = 7;                   // bàn tay quấn băng đi một vòng elip bán kính chừng ấy quanh ống chân (đơn vị khung)
const CONE_GRIP = 26;                     // loa chống liếm cầm ở mép: tâm vành cách lòng bàn tay chừng ấy (đơn vị khung, dọc cẳng tay)
const CHART_POSE = { hold: [24, -112], flip: [26, -122], zoom: 1.7 };
const CHART_FRONT = 0.65;                // đợt 37: đọc bệnh án khi đứng nghiêng — đầu quay về trước, bù chừng ấy phần hướng thân
const CHART_NOD_PITCH = 0.7;            // đợt 36: gật sau khi đọc bệnh án — đầu cúi (headPitch) ở đáy mỗi lần gật
const CHART_FLIP_ZOOM = 2.3;            // đợt 36: bìa hồ sơ phóng to lúc lật trang
const CHART_TILT = 14, CHART_DOWN = 11, CHART_NOD = 17;   // đọc bệnh án: đầu nghiêng (độ) và hạ về phía bảng; gật sâu (lượt ba: Gemini 1 khung / giây)   // bìa hồ sơ trước ngực (phóng to cho đọc được); tay kia lên mép trên lật trang
const XRAY_TURN = 0.55;                   // quay 3/4 về phía tấm phim lúc chỉ
const XRAY_LISTEN = 0.75, XRAY_FACE_HOLD = 1.0;   // chỉ xong: quay HẲN về người nghe (0,75) và giữ 1 s trong bước (lượt ba)
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
// ĐỢT 39 B — hình bàn tay mới: 'suyt' (ngón trỏ dựng, nhìn nghiêng — suỵt), 'ok' (ngón cái + ngón trỏ khép vòng tròn, ba ngón giơ —
// dựng đứng như 'cai'), 'chao' (bàn tay duỗi thẳng, các ngón khép — chào kiểu quân đội, che trán; đi theo cẳng tay, phóng to theo `handZoom`).
UPRIGHT_HANDS.push('suyt', 'ok');
const HANDS_39 = ['suyt', 'ok', 'chao'];
const LAUGH_BELLY = [16, -92];            // đợt 39 B — cười lớn: bàn tay xoè đặt lên bụng (khuỷu hạ, cẳng tay vắt ngang)
const CRADLE = [20, -78];                                 // dáng ôm con vật: cẳng tay nằm ngang trước bụng, con vật nằm TRÊN cẳng tay
// Vùng xoá viền ở nắp vai: tâm hạ `CAP_DROP` dưới chốt vai, bán kính `CAP_RADIUS`, đặc hoàn toàn tới `CAP_SOLID` bán
// kính rồi nhạt dần — viền dọc hai bên bắp tay hiện dần từ ngang nách xuống, không đứt cụt.
const CAP_RADIUS = 24, CAP_DROP = 4, CAP_SOLID = 0.75;
// ĐỢT 38 B — rửa tay, đeo găng. Màu găng (thân, mép cuộn, nét viền) — cùng màu `wear('gloves')`.
const GLOVE = '#7b9be8', GLOVE_RIM = '#6d8ee0', GLOVE_LINE = '#4d6cc0';
// Bọt xà phòng quanh lòng bàn tay (0, 10): [x, y, bán kính] trong hệ bàn tay — lan ra hai bên để hai bàn tay chụm lại thành một đám.
const SPRAY_LEN42F = 24;           // đợt 42 F: tia nước dài chừng ấy (đơn vị khung của bàn tay) từ mặt vòi sen
const FOAM_BUBBLES = [[-12, 3, 5.5], [-3, -3, 4.5], [7, -1, 5.5], [14, 7, 4.8], [-15, 14, 4.6], [11, 18, 5.4], [-6, 23, 5], [4, 28, 4],
                      [0, 11, 6.5], [-9, 9, 3.6], [16, 25, 3.4], [-14, 26, 3.2], [-18, 6, 2.6], [19, 13, 2.8]];
const WASH_POSE = { rub: [22, -142], high: [26, -152], low: [18, -132] };   // hai bàn tay chụm trước ngực (thấp hơn chắp tay `WAI_POSE`) — xoa lên / xuống
const GLOVE_POSE = { hold: [24, -132], pull: [30, -160], flex: [34, -148] };  // tay đeo găng chìa ra trước ngực; tay kéo găng; giơ hai tay co duỗi ngón

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


export { KHUNG, DOI_Y, NGHI, MAU_MAC_DINH, RHUBARB, KHAU, HONG, VAI, DAI, CHOT_VAI, UC_DON, GOC_VAI_MAX, CALL_POSE, CALL_TILT, SHOW_POSE, TAP_POSE, TYPE_POSE, LOOK_DOWN, CLAP_POSE, WAI_POSE, COUNT_BEAT, RIDE_THIGH, RIDE_KNEE, RIDE_LEAN, RIDE_ARM, FLOOR42E, SQUAT42E, LIE42E, BANDAGE_LOOP, CONE_GRIP, CHART_POSE, CHART_FRONT, CHART_NOD_PITCH, CHART_FLIP_ZOOM, CHART_TILT, CHART_DOWN, CHART_NOD, XRAY_TURN, XRAY_LISTEN, XRAY_FACE_HOLD, COUNT_POSE, WATCH_POSE, SHAKE_POSE, FACE_HANDS_POSE, PONDER_POSE, HUG_ARM_POSE, FOLD_POSE, HIPS_POSE, CHEST_POSE, HAIL_POSE, STARTLE_POSE, STOP_POSE, WAG_POSE, BECKON_POSE, HEART_POSE, VSIGN_POSE, NAPE_POSE, HANDOVER_AT, KNEEL_SHIN, CARRY_ZOOM, UPRIGHT_HANDS, HANDS_39, LAUGH_BELLY, CRADLE, CAP_RADIUS, CAP_DROP, CAP_SOLID, GLOVE, GLOVE_RIM, GLOVE_LINE, SPRAY_LEN42F, FOAM_BUBBLES, WASH_POSE, GLOVE_POSE, clamp, chuanHoaGoc, gieoHat, nhieu, RAD, mem, pha, napTayAo, gauTayAo, gauDemVai, boGocTrong, veDemVai, veTayAo, veGauTayAo, veDuongMayVai, nhacChotVai, chinhSang, tron, HEX_COLOR, assertColors, NV_MAC_DINH, CHI_TIM, ONG_TIM, MANH_CHI, rongGau, AO_KHOAC, SUON_KHOAC, chiMay, tuiNgucKhoac, tuiHongKhoac, NHANH_TAI, ongNghe, NV_BAC_SI_THU_Y };

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
