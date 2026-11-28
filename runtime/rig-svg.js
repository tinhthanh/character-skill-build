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

import { KHUNG, DOI_Y, NGHI, MAU_MAC_DINH, veKhuonMat, beRongTaiY, veChanMay, HONG, VAI, DAI, CHOT_VAI, UC_DON, GOC_VAI_MAX, CALL_POSE, CALL_TILT, RIDE_THIGH, RIDE_KNEE, RIDE_LEAN, RIDE_ARM, CONE_GRIP, KNEEL_SHIN, UPRIGHT_HANDS, HANDS_39, CRADLE, CAP_RADIUS, CAP_DROP, CAP_SOLID, GLOVE, GLOVE_RIM, GLOVE_LINE, SPRAY_LEN42F, FOAM_BUBBLES, clamp, chuanHoaGoc, gieoHat, RAD, mem, pha, napTayAo, gauTayAo, veDemVai, veTayAo, veGauTayAo, veDuongMayVai, nhacChotVai, chinhSang, tron, assertColors, NV_MAC_DINH, rongGau, NV_BAC_SI_THU_Y, luuHat, traHat, mix } from './person/shared.js';
import { MARKS, freshMark, attachMark, drawMark, markTweens, markOff } from './marks.js';
import { attachShade } from './shading.js';
import { leash } from './parts.js';
import basic from './person/basic.js';
import counter from './person/counter.js';
import presenter from './person/presenter.js';
import motion from './person/motion.js';
import gestures from './person/gestures.js';
import care from './person/care.js';
import treatment from './person/treatment.js';
import lookCarry from './person/look-carry.js';
import pairs from './person/pairs.js';
import floor from './person/floor.js';
import stance from './person/stance.js';
import speech from './person/speech.js';

// Các động tác nằm theo nhóm trong runtime/person/ (mỗi tệp một nhóm); lớp ở đây giữ phần lõi: dựng SVG, vẽ (`apDung`),
// đổi màu / dáng, tư thế nghỉ, và các bảng tên động tác.

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
                     'thumbsDown', 'stopSign', 'fingerWag', 'beckon', 'fingerHeart', 'vSign', 'brush', 'throwBall', 'takeTemp',
                     'laugh', 'wipeTears', 'facepalm', 'shush', 'okSign', 'salute',          // đợt 39 B
                     'bandage', 'putCone', 'showXray', 'offerHand', 'offerCheek',
                     'clipNails', 'eyeDrops', 'cleanEars', 'scanChip',          // đợt 38 A
                     'restrain', 'washHands',                                     // đợt 38 B
                     'holdSign', 'showSize', 'yawnStretch'];                      // đợt 39 C
  // Ba động tác xoay người sang ngang (`huong` 1). Để riêng, không gộp vào
  // `DONG_TAC`: hai công cụ đo ở trên quét `DONG_TAC` và giả định nhân vật
  // đứng trong khung. Trang thử và trang chỉnh liệt kê cả hai danh sách.
  static DI_NGANG = ['walk', 'enter', 'exit', 'hurry'];
  static SIDESTEP = 70;                  // quãng `walk` ngắn hơn chừng này (đơn vị khung) thì bước nhích, không quay ngang
  // Động tác đổi THẾ ĐỨNG và giữ nguyên thế ấy cho các động tác sau (không khép về nghỉ).
  static STANCE = ['sitDown', 'standUp', 'face', 'hideItem', 'showItem', 'phoneDown', 'kneel', 'ride', 'getOff', 'lookAt', 'putOnGloves'];
  // Động tác TRAO ĐỔI đồ vật giữa hai nhân vật: cần một món đồ (đang cầm / đang cất), nên không chạy trơn như `DONG_TAC`.
  static EXCHANGE = ['handOver', 'take', 'carry', 'handshake', 'handOverPet', 'takePet', 'weigh', 'givePill', 'highFive', 'hug', 'patShoulder', 'whisper', 'hearWhisper', 'handOverBag', 'takeBag',
                     'joinSelfie'];       // đợt 39 C — `givePill`: cần con vật và hai tay rảnh
  // Động tác cần ĐANG CẦM một món đồ (điện thoại): không có thì báo lỗi, nên cũng không chạy trơn như `DONG_TAC`.
  static WITH_ITEM = ['showPhone', 'tapPhone', 'phoneUp', 'inject', 'putDown', 'leash', 'unleash', 'notify', 'readChart', 'takeOffGloves',
                       'takeSelfie'];       // đợt 39 C — `phoneUp` cũng là một THẾ GIỮ (xem STANCE)
  static { this.DONG_TAC.push('wipeCounter'); this.EXCHANGE.push('giveChange', 'takeChange', 'takeCard'); this.WITH_ITEM.push('payByQR', 'payByCard', 'stampCard', 'pourDrink'); }       // đợt 39 A
  static { this.EXCHANGE.push('pullToy'); }       // đợt 40 A — kéo co: cần con chó (`tugOfWar` cùng lúc)
  static { this.DONG_TAC.push('jump', 'dance'); this.DI_NGANG.push('run'); }       // đợt 42 D — nhảy lên, nhảy múa (tại chỗ); chạy (dời `x`, quay ngang)
  static { this.STANCE.push('sitOnFloor', 'lieDown'); this.EXCHANGE.push('pickUp'); }       // đợt 42 E — ngồi bệt / nằm (thế giữ tới `standUp`); nhặt đồ (kết thúc với món đồ trong tay)
  /** Gieo hạt cho mọi thứ ngẫu nhiên (chớp mắt, khẩu hình, cử chỉ). `null` = trả về `Math.random`. */
  static gieo(hat) { gieoHat(hat); }
  static luuNgau() { return luuHat(); }
  static traNgau(state) { traHat(state); }
  static _dem = 0;
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
    this._suyMau();
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
    this.id = `rig${++RigSVG._dem}`;
    this.s = this._theoDoi({ ...this.NGHI });
    this.m = freshMark();                 // dấu cảm xúc trên đầu (marks.js) — ngoài `s`: động tác khác không xoá nó
    this._dungLai();
  }

  // `rig.s` là một Proxy: hễ có ai GHI vào trạng thái thì hẹn vẽ lại ở cuối lượt chạy
  // hiện tại (microtask). Timeline vẫn gọi `apDung` qua `onUpdate` như cũ — lớp này để
  // phòng trường hợp bộ dựng video tua bằng `seek()`, vốn TẮT mọi callback của GSAP:
  // không có nó thì trạng thái đổi mà hình đứng yên. Vẽ lại hai lần trong một lượt
  // không sao, `apDung` chỉ là hàm của trạng thái.
  _choVe = false;
  _theoDoi(o) {
    return new Proxy(o, { set: (dich, k, v) => {
      dich[k] = v;
      if (!this._choVe && this.el) { this._choVe = true; queueMicrotask(() => { this._choVe = false; this.apDung(); }); }
      return true;
    } });
  }

  // Bảng màu đang dùng = mặc định + phần đã khai + phần SUY RA từ đó.
  _suyMau() {
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
  _dungLai() {
    // Tay nào có đồ vật (hàm vẽ trả về thứ gì đó) — để bàn tay giữ dáng nắm và động tác một tay chọn tay rảnh.
    this.holds = { L: !!String(this.nv.heldItemL(this.id, this.mau, this.nv) || '').trim(), R: !!String(this.nv.heldItemR(this.id, this.mau, this.nv) || '').trim() };
    const khung = this.svg && this.svg.getAttribute('viewBox');   // trang chỉnh có thể đang zoom vào mặt
    this.host.innerHTML = this._dungSVG();
    this.svg = this.host.querySelector('svg');
    if (khung) this.svg.setAttribute('viewBox', khung);
    this._layPhanTu();
    this._applyWear();                          // dựng lại (đổi màu, đổi dáng) thì phụ kiện đang đeo vẫn đeo
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
    this._suyMau();
    this._dungLai();
    return { ...this.mau };
  }

  /* ------------------------------------------------------------------ SVG */

  _tay(ben) {
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
        <!-- ĐỢT 39 B. SUỴT: nắm tay nhìn nghiêng, NGÓN TRỎ dựng thẳng (viền mảnh, tách khỏi nắm tay) — vẽ đứng thẳng như 'cai'.
             \`data-tip39\`: chỗ ngón trỏ đặt lên môi (đo, không vẽ). -->
        <g data-tay="suyt">
          <rect x="-2.9" y="-23" width="5.8" height="28" rx="2.9" fill="${da}" stroke="${toi}" stroke-width=".9"/>
          <rect x="-8.5" y="-0.5" width="17" height="20" rx="7" fill="${da}"/>
          <path d="M -7.5 5.5 Q 0 7.5 7.5 5 M -7.5 10.5 Q 0 12.5 7.5 10 M -7.5 15 Q 0 16.5 7 14.5" stroke="${toi}" stroke-width="1" stroke-linecap="round" fill="none" opacity=".5"/>
          <path d="M -8 3 Q -3 2 -1 6" stroke="${da}" stroke-width="5" stroke-linecap="round" fill="none"/>
          <circle data-tip39="1" cx="0" cy="-13" r="0.6" fill="none"/>
        </g>
        <!-- ĐỢT 39 B. RA DẤU OK: ngón cái và ngón trỏ khép thành VÒNG TRÒN (lỗ giữa để trống), ba ngón còn lại giơ xoè — vẽ đứng thẳng.
             \`data-tip39\`: tâm vòng tròn. -->
        <g data-tay="ok">
          ${[[1.6, 2, 24], [6, 12, 22], [9.6, 22, 18.5]].map(([x, turn, h]) => `<rect x="${x - 2.7}" y="${-17 + (24 - h)}" width="5.4" height="${h}" rx="2.7" fill="${da}" stroke="${toi}" stroke-width=".9" transform="rotate(${turn} ${x} 7)"/>`).join('')}
          <circle cx="-5.5" cy="-4" r="8.6" fill="none" stroke="${toi}" stroke-width=".9"/>
          <rect x="-10.5" y="-0.5" width="21" height="20" rx="7.5" fill="${da}"/>
          <circle cx="-5.5" cy="-4" r="6.3" fill="none" stroke="${da}" stroke-width="4.6"/>
          <circle cx="-5.5" cy="-4" r="4" fill="none" stroke="${toi}" stroke-width=".9"/>
          <path d="M -9 10 Q -1 12.5 7 9" stroke="${toi}" stroke-width="1" stroke-linecap="round" fill="none" opacity=".5"/>
          <circle data-tip39="1" cx="-5.5" cy="-4" r="0.6" fill="none"/>
        </g>
        <!-- ĐỢT 39 B. BÀN TAY DUỖI THẲNG, bốn ngón khép sát (chào kiểu quân đội; che trán): một lưỡi dài, ngón cái ép dọc mép trong.
             Đi theo cẳng tay như 'xoe'. \`data-tip39\`: đầu các ngón (chạm chân mày khi chào). -->
        <g data-tay="chao">
          <path d="M -7 -3 Q -9.8 8 -8.6 19 L -8 31 Q -7.4 36.5 -3 36.5 L 3.6 36.8 Q 8 36.6 8.2 31.5 L 8.6 18 Q 9.8 6 7 -3 Q 0 -5 -7 -3 Z" fill="${da}"/>
          <path d="M -3.9 19 V 35 M 0.2 19.5 V 35.8 M 4.3 19 V 35" stroke="${toi}" stroke-width=".9" stroke-linecap="round" opacity=".45"/>
          <path d="M -6.2 3 Q -10.6 9 -9.4 18" stroke="${da}" stroke-width="5.4" stroke-linecap="round" fill="none"/>
          <path d="M -6.6 10 Q -7.6 14 -6.8 17.5" stroke="${toi}" stroke-width="1" stroke-linecap="round" fill="none" opacity=".4"/>
          <circle data-tip39="1" cx="0" cy="35" r="0.6" fill="none"/>
        </g>
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
        <!-- ĐỢT 38 B: MÉP GĂNG (cổ găng cuộn) — apDung dời nó từ giữa bàn tay lên cổ tay theo kênh \`glove\` (đeo găng: thấy mép găng bị kéo lên). -->
        <g data-cuff style="display:none"><rect x="-11.5" y="-4.5" width="23" height="7.5" rx="3.4" fill="${GLOVE_RIM}" stroke="${GLOVE_LINE}" stroke-width="1.2"/>
          <path d="M -9 -1 H 9" stroke="#a9bff2" stroke-width="1.2" stroke-linecap="round" opacity=".8"/></g>
      </g>`;
  }

  _canhTay(ben) {
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
          <g id="${p}-coTay${ben}" transform="translate(0 ${g})">${this._tay(ben)}<g id="${p}-item${ben}">${this.nv['heldItem' + ben](p, this.mau, this.nv)}</g>
            <g id="${p}-watch${ben}" style="display:none"><rect x="-10" y="-8" width="20" height="10" rx="3" fill="#3b3f47"/><circle cx="0" cy="-3" r="8.4" fill="#f4f1e8" stroke="#3b3f47" stroke-width="1.8"/><path d="M 0 -3 V -8.6 M 0 -3 H 4.2" stroke="#3b3f47" stroke-width="1.5" stroke-linecap="round"/></g>
            <g id="${p}-tool${ben}" style="display:none"><path d="M 0 10 C ${ben === 'L' ? 14 : -14} 0 ${ben === 'L' ? 4 : -4} -18 ${ben === 'L' ? 12 : -12} -32" fill="none" stroke="#3b3f47" stroke-width="2.6" stroke-linecap="round"/>
              <circle cx="0" cy="12" r="7.5" fill="#c7ccd4" stroke="#3b3f47" stroke-width="1.4"/><circle cx="0" cy="12" r="3.8" fill="#8a929e"/></g>
            <defs>
              <linearGradient id="${p}-beam${ben}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe4" stop-opacity=".9"/><stop offset=".35" stop-color="#fff6c8" stop-opacity=".42"/><stop offset="1" stop-color="#fff2b0" stop-opacity="0"/></linearGradient>
              <radialGradient id="${p}-spot${ben}"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".45" stop-color="#fff6cc" stop-opacity=".5"/><stop offset="1" stop-color="#fff2b0" stop-opacity="0"/></radialGradient>
              <filter id="${p}-soft${ben}" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="1.8"/></filter>
            </defs>
            <g id="${p}-gadget${ben}" style="display:none">
              <!-- ĐỢT 39 A — KHĂN LAU (20: khăn trải phẳng dưới nắm tay / \`data-folded\` gấp lại), CON DẤU (21: cán gỗ trong nắm tay, mặt cao su đỏ chúc xuống),
                   BÌNH RÓT (22: bình thuỷ tinh cầm ở quai, vòi quay về phía thân; \`data-pitcher\` nghiêng theo \`tip\`, \`data-stream\` là dòng nước theo \`pour\`),
                   XẤP TIỀN ĐANG ĐẾM (23: \`data-n\` = tờ thứ n, hiện theo \`fan\`). -->
              <g data-gadget="20"><g data-spread><path d="M -18 14 Q -20 24 -17 33 Q -9 36 0 33 Q 9 36 17 33 Q 20 24 18 14 Q 0 11 -18 14 Z" fill="#f4e3b8" stroke="#9a7634" stroke-width="1.2" stroke-linejoin="round"/>
                  <path d="M -9 12.600 Q -10 24 -8.500 34 M 0 12.200 Q 0 24 0 34 M 9 12.600 Q 10 24 8.500 34 M -18 20 Q 0 18 18 20 M -18 27 Q 0 25 18 27" stroke="#5aa6d6" stroke-width="1.700" fill="none" opacity=".75"/>
                  <path d="M -13 30 q 4 3 9 1" stroke="#ffffff" stroke-width="1.500" fill="none" opacity=".7"/></g>
                <g data-folded style="display:none"><rect x="-10" y="17" width="20" height="14" rx="2.500" fill="#f1dca6" stroke="#9a7634" stroke-width="1.300"/>
                  <path d="M -10 21 h 20 M -10 25 h 20 M -3 17 v 14 M 4 17 v 14" stroke="#5aa6d6" stroke-width="1.400" opacity=".7"/></g></g>
              <g data-gadget="21"><rect x="-3.200" y="-3" width="6.400" height="16" rx="2.800" fill="#b27a45" stroke="#6b4223" stroke-width="1.100"/>
                <ellipse cx="0" cy="-3" rx="5.600" ry="3.600" fill="#c8894f" stroke="#6b4223" stroke-width="1.100"/>
                <rect x="-11" y="15" width="22" height="5.500" rx="2.200" fill="#8e5a31" stroke="#5b3a1e" stroke-width="1.100"/>
                <rect x="-9.500" y="20.500" width="19" height="4.200" rx="1.200" fill="#d1263b" stroke="#8c1626" stroke-width="1"/></g>
              <g data-gadget="22"><g data-pitcher><path d="M -26.500 3 L -22.500 36 Q -14 39.500 -5.500 36 L -1.500 3 Z" fill="#e6f3f8" fill-opacity=".62" stroke="#5f7f90" stroke-width="1.300" stroke-linejoin="round"/>
                  <path d="M -25 14 L -22.500 36 Q -14 39.500 -5.500 36 L -3 14 Z" fill="#8a5432" opacity=".92"/>
                  <path d="M -26.500 3 L -32 0 L -29.500 6.500 Z" fill="#e6f3f8" fill-opacity=".85" stroke="#5f7f90" stroke-width="1.300" stroke-linejoin="round"/>
                  <path d="M -2 6 Q 8.500 8 7.500 20 Q 6.500 31 -3.500 32" fill="none" stroke="#5f7f90" stroke-width="3.200" stroke-linecap="round"/>
                  <path d="M -22 8 L -21 24" stroke="#ffffff" stroke-width="1.800" stroke-linecap="round" opacity=".7"/></g>
                <g data-stream style="display:none"><path data-flow d="M 0 0 L 0 10" stroke="#8a5432" stroke-width="3" fill="none" stroke-linecap="round"/>
                  <path data-flowlight d="M 0 0 L 0 10" stroke="#c18a5e" stroke-width="1" fill="none" stroke-linecap="round" opacity=".8"/>
                  <ellipse data-splash cx="0" cy="0" rx="5" ry="1.800" fill="#a4663a" opacity=".85" style="display:none"/></g></g>
              <g data-gadget="23">${[0, 1, 2, 3, 4].map((n) => `<g data-n="${n + 1}" transform="translate(${(n - 2) * 3.4} ${20 - Math.abs(n - 2) * 1.4}) rotate(${(n - 2) * 9})"><rect x="-15" y="-7" width="30" height="14" rx="1.600" fill="${['#bfe3c6', '#d8e7c4', '#cfe8d4', '#c9e0bf', '#bfe3c6'][n]}" stroke="#2f7a4f" stroke-width="1"/>
                  <rect x="-12.600" y="-4.800" width="25.200" height="9.600" rx="1" fill="none" stroke="#2f7a4f" stroke-width=".6" opacity=".7"/><circle cx="-5" cy="0" r="3.300" fill="#2f7a4f" opacity=".55"/><path d="M 1.500 -2.400 h 8 M 1.500 0.400 h 6 M 1.500 3 h 8" stroke="#2f7a4f" stroke-width="1.100" stroke-linecap="round" opacity=".8"/></g>`).join('')}</g>
              <!-- ĐỢT 38 B — BỌT XÀ PHÒNG quanh bàn tay (\`washHands\`; \`data-foam\` co giãn theo kênh \`foam\`) và CHIẾC GĂNG cầm ở cổ
                   găng, rũ xuống (\`putOnGloves\` / \`takeOffGloves\`), cùng màu găng trên tay. -->
              <g data-gadget="14"><g data-foam>${FOAM_BUBBLES.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" fill-opacity=".93" stroke="#a8cbe2" stroke-width="1"/>`).join('')}
                ${FOAM_BUBBLES.filter((b, n) => n % 2 === 0).map(([x, y, r]) => `<circle cx="${(x - r * 0.35).toFixed(1)}" cy="${(y - r * 0.35).toFixed(1)}" r="${(r * 0.28).toFixed(1)}" fill="#dff1fb"/>`).join('')}</g></g>
              <g data-gadget="15"><path d="M -7.5 13 L 7.5 13 L 8.5 20 L -8.5 20 Z" fill="${GLOVE_RIM}" stroke="${GLOVE_LINE}" stroke-width="1.1" stroke-linejoin="round"/>
                <path d="M -8.5 20 Q -11 31 -8.5 42 L 8.5 42 Q 11 31 8.5 20 Z" fill="${GLOVE}" stroke="${GLOVE_LINE}" stroke-width="1.1"/>
                ${[[-8.4, 11], [-4.1, 13], [0.2, 12.5], [4.5, 10.5]].map(([x, h]) => `<rect x="${x}" y="40" width="3.9" height="${h}" rx="1.95" fill="${GLOVE}" stroke="${GLOVE_LINE}" stroke-width="1"/>`).join('')}
                <rect x="7" y="25" width="4" height="11" rx="2" fill="${GLOVE}" stroke="${GLOVE_LINE}" stroke-width="1" transform="rotate(-28 9 25)"/>
                <path d="M -5 24 Q -6 32 -4.5 38 M 2 24 Q 3 31 2 38" stroke="#a9bff2" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".8"/></g>
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
              <!-- NHIỆT KẾ ĐIỆN TỬ (\`takeTemp\`, đợt 35): thân trắng dẹt, ô số xanh, nút xanh, đầu đo bạc thon dài chĩa ra như đèn soi. -->
              <g data-gadget="6"><rect x="-4.2" y="-4" width="8.4" height="26" rx="3.6" fill="#f4f7fa" stroke="#3d4b58" stroke-width="1.1"/>
                <rect x="-2.9" y="0" width="5.8" height="9" rx="1" fill="#1d2b33"/><path d="M -1.6 2.4 h 3.2 M -1.6 4.6 h 3.2 M -1.6 6.8 h 2" stroke="#7dffb0" stroke-width="1"/>
                <circle cx="0" cy="14" r="2" fill="#2f9e8f"/><path d="M -2 22 L -1 36 Q 0 38.5 1 36 L 2 22 Z" fill="#c9d1d9" stroke="#3d4b58" stroke-width="1"/></g>
              <!-- VIÊN THUỐC TO (\`givePill\`, đợt 35): trắng, viền đậm, kẹp giữa ngón cái và ngón trỏ ở đầu bàn tay — đủ to để thấy ở góc trung. -->
              <g data-gadget="7" transform="translate(0 24) rotate(90)"><rect data-pill x="-8" y="-4.5" width="16" height="9" rx="4.5" fill="#ffffff" stroke="#1f2a33" stroke-width="1.8"/>
                <path d="M -4.5 -1.5 H -1" stroke="#c9d1d9" stroke-width="1.5" stroke-linecap="round"/></g>
              <!-- CUỘN BĂNG (\`bandage\`, đợt 35): cuộn băng thú y xanh nhạt như băng trên chân con vật, một dải thả ra. -->
              <g data-gadget="8"><path d="M 0 16 q 6 8 2 16" stroke="#7cc4e6" stroke-width="4.5" fill="none" stroke-linecap="round"/>
                <rect x="-8" y="8" width="16" height="13" rx="4" fill="#7cc4e6" stroke="#3f86a8" stroke-width="1.2"/><path d="M -8 12.5 h 16 M -8 16.5 h 16" stroke="#ffffff" stroke-width="1.2" opacity=".8"/></g>
              <!-- LOA CHỐNG LIẾM cầm ở mép (\`putCone\`, đợt 35): cùng vành trong mờ như loa trên đầu con vật, tâm cách lòng bàn tay CONE_GRIP. -->
              <g data-gadget="9"><ellipse cx="0" cy="${10 + CONE_GRIP}" rx="${CONE_GRIP}" ry="${CONE_GRIP * 0.9}" fill="#e6f3fa" fill-opacity=".72" stroke="#8fb8cf" stroke-width="2.4"/>
                <ellipse cx="0" cy="${10 + CONE_GRIP}" rx="${CONE_GRIP * 0.68}" ry="${CONE_GRIP * 0.62}" fill="none" stroke="#8fb8cf" stroke-width="1.3" opacity=".6"/>
                <path d="M ${-CONE_GRIP * 0.9} ${10 + CONE_GRIP * 0.6} Q ${-CONE_GRIP * 0.7} ${10 + CONE_GRIP * 0.1} ${-CONE_GRIP * 0.3} ${10 + CONE_GRIP * 0.05}" stroke="#ffffff" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".8"/></g>
              <!-- ĐỢT 38 A. KÌM CẮT MÓNG (\`clipNails\`): hai cán cam, đầu kìm thép ở đầu ngón; má trên (\`data-snip\`) xoay quanh chốt, khép theo \`snip\`. -->
              <g data-gadget="10"><path d="M -1.5 21 L -8.5 -2" stroke="#d9472f" stroke-width="5" stroke-linecap="round"/>
                <path d="M -1.2 20 Q -6 29 -1.6 41 L 1.6 40 Q -1 30 1 21 Z" fill="#c9d1d9" stroke="#2f3a45" stroke-width="1.2" stroke-linejoin="round"/>
                <g data-snip="1"><path d="M 1.5 21 L 8.5 -2" stroke="#e8553f" stroke-width="5" stroke-linecap="round"/>
                  <path d="M 1.2 20 Q 6 29 1.6 41 L -1.6 40 Q 1 30 -1 21 Z" fill="#e3e8ec" stroke="#2f3a45" stroke-width="1.2" stroke-linejoin="round"/></g>
                <circle cx="0" cy="21" r="2.4" fill="#8a929e" stroke="#2f3a45" stroke-width="1"/></g>
              <!-- LỌ NHỎ MẮT (\`eyeDrops\`): lọ trắng nhãn xanh, vòi nhỏ chúc theo hướng bàn tay; GIỌT THUỐC (\`data-drop\`) rơi từ đầu vòi theo \`drop\`. -->
              <g data-gadget="11"><rect x="-7" y="-7" width="14" height="22" rx="3.5" fill="#f7fafc" stroke="#2f3a45" stroke-width="1.3"/>
                <rect x="-7" y="-1" width="14" height="9" fill="#2f9e8f"/><path d="M -4 2.5 h 8 M -4 5 h 5" stroke="#ffffff" stroke-width="1.2"/>
                <path d="M -5 15 L -1.8 28 Q 0 30.5 1.8 28 L 5 15 Z" fill="#ffffff" stroke="#2f3a45" stroke-width="1.3" stroke-linejoin="round"/>
                <path data-drop="1" d="M 0 -5.5 Q 5 1.5 0 5 Q -5 1.5 0 -5.5 Z" fill="#4fb3f0" stroke="#17588a" stroke-width="1.3" style="display:none"/></g>
              <!-- BÔNG LAU TAI (\`cleanEars\`): miếng bông tròn trắng kẹp ở đầu ngón. -->
              <g data-gadget="12"><circle cx="0" cy="25" r="8.5" fill="#ffffff" stroke="#b8c2cc" stroke-width="1.6"/>
                <path d="M -5 22 q 3 -3 6 0 q 3 3 5 0 M -6 27 q 3 -3 6 0 q 3 3 5 0" stroke="#d6dde4" stroke-width="1.3" fill="none" stroke-linecap="round"/></g>
              <!-- MÁY QUÉT CHIP (\`scanChip\`): cán xám trong nắm tay, đầu đọc tròn xanh có màn hình; vạch "bíp" (\`data-beep\`) bật khi đọc được. -->
              <g data-gadget="13"><rect x="-4.5" y="-6" width="9" height="24" rx="3" fill="#3b414b" stroke="#1d2128" stroke-width="1.1"/>
                <rect x="-12" y="17" width="24" height="26" rx="10" fill="#2f7fd0" stroke="#173f66" stroke-width="1.4"/>
                <rect x="-7.5" y="21" width="15" height="9" rx="2" fill="#16232b"/><path d="M -5 25.5 h 10" stroke="#7dffb0" stroke-width="1.6"/>
                <circle cx="0" cy="36" r="3.4" fill="#e8f4ff" stroke="#173f66" stroke-width="1"/>
                <g data-beep="1" style="display:none" stroke="#38c172" stroke-width="2.4" fill="none" stroke-linecap="round"><path d="M 15 22 q 5 8 0 16 M 20 18 q 8 12 0 24"/><path d="M -15 22 q -5 8 0 16 M -20 18 q -8 12 0 24"/></g></g>
              <!-- ĐỢT 42 F. VÒI SEN (\`bathPet\`, 40): tay cầm trắng trong nắm tay, đầu vòi loe ra theo hướng bàn tay, dây vòi rủ xuống; TIA NƯỚC
                   (\`data-spray42f\`) phun ra từ mặt vòi theo \`spray42f\`, các vệt chảy theo \`sprayT42f\`, giọt bắn ở cuối tia. -->
              <g data-gadget="40"><path d="M 0 -3 C 4 -16 20 -12 22 6 S 18 40 24 60" fill="none" stroke="#7d8a96" stroke-width="3.400" stroke-linecap="round"/>
                <rect x="-4.200" y="-6" width="8.400" height="26" rx="3.600" fill="#f4f7fa" stroke="#4a5562" stroke-width="1.200"/>
                <path d="M -5 19 L -15 31 L 15 31 L 5 19 Z" fill="#dfe6ec" stroke="#4a5562" stroke-width="1.200" stroke-linejoin="round"/>
                <rect x="-16.500" y="30" width="33" height="5" rx="2.500" fill="#b9c4cd" stroke="#4a5562" stroke-width="1.200"/>
                ${[-11, -5.5, 0, 5.5, 11].map((x) => `<circle cx="${x}" cy="32.500" r="0.900" fill="#4a5562"/>`).join('')}
                <g data-spray42f style="display:none">${[-12, -7, -2.500, 2.500, 7, 12].map((x, n) => `<path data-jet d="M ${x * 0.85} 36 L ${(x * 1.35).toFixed(2)} ${SPRAY_LEN42F + 36}" stroke="${n % 2 ? '#9fd8f4' : '#5fb8e8'}" stroke-width="${n % 2 ? 2 : 2.600}" stroke-linecap="round" stroke-dasharray="7 5" fill="none"/>`).join('')}
                  ${[-14, -6, 4, 13].map((x, n) => `<ellipse data-splash cx="${x}" cy="${SPRAY_LEN42F + 36 + (n % 2) * 2}" rx="3.200" ry="1.600" fill="#7cc8f0" opacity=".85"/>`).join('')}</g></g>
              <!-- BÀN CHẢI ĐÁNH RĂNG thú cưng (\`brushTeeth\`, 41): cán xanh ngọc dài, đầu bàn chải trắng với lông xanh ở đầu ngón; BỌT (\`data-foam42f\`) theo \`foam\`. -->
              <g data-gadget="41"><rect x="-3.400" y="-8" width="6.800" height="34" rx="3.200" fill="#2f9e8f" stroke="#1d5f56" stroke-width="1.100"/>
                <rect x="-2.200" y="24" width="4.400" height="10" rx="1.600" fill="#2f9e8f" stroke="#1d5f56" stroke-width="1"/>
                <rect x="-6.500" y="33" width="13" height="11" rx="2.400" fill="#f4f7fa" stroke="#4a5562" stroke-width="1.100"/>
                <path d="M -5 35.500 h 10 M -5 38.500 h 10 M -5 41.500 h 10" stroke="#5fb8e8" stroke-width="1.700" stroke-linecap="round"/>
                <g data-foam42f style="display:none">${[[-8, 37, 3], [8, 40, 3.400], [-3, 46, 2.600], [5, 46.500, 2.200], [0, 31.500, 2.200]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" stroke="#a8cbe2" stroke-width=".9"/>`).join('')}</g></g>
              <!-- KHĂN TẮM gấp đôi vắt trên bàn tay (\`towelDry\`, 42): rủ xuống hai bên nắm tay, sọc xanh ở mép — cùng màu khăn quấn trên con vật. -->
              <g data-gadget="42"><path d="M -20 6 Q 0 0 20 6 L 22 46 Q 11 50 0 46 Q -11 50 -22 46 Z" fill="#bfe8e0" stroke="#2f9e8f" stroke-width="1.500" stroke-linejoin="round"/>
                <path d="M -21 38 Q 0 34 21 38" stroke="#2f9e8f" stroke-width="3.200" fill="none" opacity=".55"/><path d="M -8 10 Q -9 28 -6 44 M 7 10 Q 8 28 6 44" stroke="#8fcfc4" stroke-width="1.700" fill="none" stroke-linecap="round"/></g>
            </g></g>
        </g>
      </g>`;
  }

  _chan(ben) {
    const p = this.id, V = this._V();
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
  // Một hàm dùng CHUNG cho `apDung` (xoay bàn chân) và `_tuTheDi` (đặt cao độ
  // hông): hai nơi tính riêng thì bàn chân xoay một kiểu còn hông hạ theo kiểu
  // khác, và mũi giày chìm xuống dưới mặt đất — đo được 11 đơn vị ở bản trước.
  static _lanBanChan(dui, ong) {
    const k = clamp(ong / 40, 0, 1);
    return (1 - k) * (Math.max(0, dui) * 1.4 - Math.max(0, -dui) * 0.45) + k * (dui + ong + 12);
  }

  // Màu khối sọ sau. Chỉ theo `mauSoSau` khi nhân vật THẬT SỰ đội mũ (slot `mu` vẽ ra thứ
  // gì đó). Nhân vật dựa trên một nhân vật đội mũ rồi bỏ mũ đi (`mu: () => ''`) thường quên
  // đặt lại `mauSoSau` — và quay nghiêng là sau đầu hiện một mảng màu mũ. Không có mũ thì
  // luôn là màu tóc, khỏi phải nhớ.
  _backSkullColor() {
    const hasHat = String(this.nv.mu(this.id, this.mau, this.nv) || '').trim() !== '';
    return (hasHat && this.mau[this.nv.mauSoSau]) || this.mau.toc;
  }

  _V() { return this.mau.vien ? ` filter="url(#${this.id}-vien)"` : ''; }
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
  _Vda() { return ''; }
  _Vtay() { return this.nv.tayDai ? this._V() : this._Vda(); }
  // CÁNH TAY + VIỀN TÁCH RỜI. Bộ lọc viền đặt thẳng lên nhóm tay thì bọc kín cả NẮP VAI: nắp tay áo nằm đè lên thân
  // áo mà có một vòng nét đen quanh nó, nên nhìn nghiêng (tay gần ở giữa thân) cánh tay như mảnh giấy dán lên áo,
  // chốt vai lộ thành cái núm. Ở đây viền là một bản sao (`use`) chỉ có nét, nằm dưới cánh tay, và bị MẶT NẠ xoá đi
  // trong vùng nắp vai TRÙNG với thân áo — vai và tay áo liền một khối như ảnh mẫu (cách các rig dùng lưới có trọng
  // số làm khớp vai, ở đây làm bằng mặt nạ). Phần nắp thò ra NGOÀI thân áo vẫn có viền, nên đường bao vai không hở.
  _armBody(ben) {
    const p = this.id;
    if (!this._Vtay()) return this._canhTay(ben);
    return `<use href="#${p}-arm${ben}" filter="url(#${p}-vienTay)" mask="url(#${p}-capMask${ben})"/><g id="${p}-arm${ben}">${this._canhTay(ben)}</g>`;
  }

  _dungSVG() {
    const p = this.id, V = this._V();
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${KHUNG.w} ${KHUNG.h}" width="100%" height="100%" style="display:block;overflow:visible">
  <defs>
    ${this.mau.vien ? `<filter id="${p}-vien" x="-30%" y="-30%" width="160%" height="160%">
    <feMorphology in="SourceAlpha" operator="dilate" radius="${this.nv.vienRong}" result="d"/>
    <feFlood flood-color="${this.mau.vien}" result="c"/><feComposite in="c" in2="d" operator="in" result="o"/>
    <feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : ''}
    ${this._Vtay() ? `<filter id="${p}-vienTay" x="-30%" y="-30%" width="160%" height="160%">
    <feMorphology in="SourceAlpha" operator="dilate" radius="${this.nv.vienRong}" result="d"/>
    <feFlood flood-color="${this.mau.vien}" result="c"/><feComposite in="c" in2="d" operator="in"/></filter>
    <radialGradient id="${p}-capGrad"><stop offset="0" stop-color="#000"/><stop offset="${CAP_SOLID}" stop-color="#000"/><stop offset="1" stop-color="#fff"/></radialGradient>
    <clipPath id="${p}-thanCat" clipPathUnits="userSpaceOnUse"><use href="#${p}-ao"/><use href="#${p}-vaiL"/><use href="#${p}-vaiR"/></clipPath>
    ${['L', 'R'].map((ben) => `<mask id="${p}-capMask${ben}" maskUnits="userSpaceOnUse" x="-400" y="-500" width="800" height="1000">
      <rect x="-400" y="-500" width="800" height="1000" fill="#fff"/>
      <g id="${p}-capInv${ben}"><circle id="${p}-cap${ben}" r="0" fill="url(#${p}-capGrad)" clip-path="url(#${p}-thanCat)"/></g></mask>`).join('')}` : ''}
    <clipPath id="${p}-momClip"><path id="${p}-momClipP"/></clipPath>
    <style>${['L', 'R'].map((b) => `.${p}-glove${b} #${p}-tay${b} [fill="${this.mau.da}"], .${p}-glove${b} #${p}-item${b} [data-grip] [fill="${this.mau.da}"]`).join(', ')} { fill: ${GLOVE}; }</style>
    <clipPath id="${p}-vaiCat"><rect id="${p}-vaiCatL" x="-70" y="-150" width="52" height="80"/><rect id="${p}-vaiCatR" x="18" y="-150" width="52" height="80"/></clipPath>
    <clipPath id="${p}-phuKienClip" clipPathUnits="userSpaceOnUse"><rect id="${p}-phuKienRect" x="-400" y="-500" width="800" height="1000"/></clipPath>
    <mask id="${p}-xaMask" maskUnits="userSpaceOnUse" x="-400" y="-500" width="800" height="1000">
      <rect x="-400" y="-500" width="800" height="1000" fill="#fff"/>
      <g id="${p}-xaMaskG" style="filter:brightness(0)"><use href="#${p}-ao"/><use href="#${p}-vaiL"/><use href="#${p}-vaiR"/></g>
    </mask>
    <clipPath id="${p}-lowHairClip"><rect id="${p}-lowHairClipR" x="-200" width="400" height="300"/></clipPath>
    <clipPath id="${p}-matClip"><path id="${p}-matClipP" d="${this.nv.dau(this.mau, this.nv)}"/></clipPath>
  </defs>
  <!-- VÒNG LOA CHỐNG LIẾM đang cầm (\`putCone\`, đợt 35 lượt hai): ở GỐC SVG, SAU người (hai bàn tay vẽ trên mép vòng), đặt theo \`ringX/ringY\` (khung của \`#aimOf\`) và cỡ \`ringR\` —
       vòng luôn đúng chỗ, hai bàn tay đặt lên mép nó. -->
  <g id="${p}-ring" style="display:none"><ellipse rx="40" ry="36" fill="#e6f3fa" fill-opacity=".72" stroke="#8fb8cf" stroke-width="3"/>
    <ellipse rx="28" ry="25" fill="none" stroke="#8fb8cf" stroke-width="1.6" opacity=".6"/>
    <path d="M -36 14 Q -32 -14 -12 -30" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/></g>
  <!-- ĐỢT 42 E: dưới người NẰM — bóng dài trên sàn và gối tựa dưới đầu (khung gốc, không xoay theo người); món đồ nằm dưới sàn chờ NHẶT (\`pickUp\`). -->
  <g id="${p}-under42e" style="display:none"><ellipse cx="0" cy="0" rx="1" ry="1" fill="#000" opacity=".26"/>
    <g data-pillow="1"><rect x="-1" y="-1" width="2" height="2" rx="1" fill="#f3e3c3" stroke="#c9b28a" stroke-width="2"/><path d="M 0 0" stroke="#e1cda6" stroke-width="2" fill="none" data-seam="1"/></g></g>
  <g id="${p}-drop42e"></g>
  <g id="${p}-goc">
    <ellipse id="${p}-bong" cx="200" cy="428" rx="62" ry="8" fill="#000" opacity=".28"/>
    <g id="${p}-sauChan"></g>
    <g id="${p}-chanG" transform="translate(${HONG.x} ${HONG.y})">
      <g id="${p}-hongL" transform="translate(-14 0)">${this._chan('L')}</g>
      <g id="${p}-hongR" transform="translate(14 0)">${this._chan('R')}</g>
      ${this.nv.skirt ? `<path id="${p}-skirt" fill="${this.mau.skirt || this.mau.ao}" stroke-linejoin="round"${V}/>` : ''}
    </g>
    <g id="${p}-than">
      <g id="${p}-sau"><g id="${p}-batL">${this._armBody('L')}</g></g>
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
        <g id="${p}-co"${this._Vda()}>
        <path id="${p}-coDa" d="M -13 -130 L 13 -130 L 13.5 -106 Q 15 -100 20 -96 L -20 -96 Q -15 -100 -13.5 -106 Z" fill="${this.mau.da}"/>
        <path d="M -13 -130 L 13 -130 L 13 -118 Q 0 -113 -13 -118 Z" fill="${this.mau.daToi}" opacity=".55"/>
        </g>
        <g id="${p}-coAo">${this.nv.coAo(p, this.mau)}</g>
        <g id="${p}-dau"${V}>
          <g transform="translate(0 -62)">
            <g id="${p}-veTay">
            <g id="${p}-tocLung"><ellipse id="${p}-tocLungE" fill="${this.nv.backHair === 'full' ? this._backSkullColor() : this.mau.da}"/>
              ${this.nv.backHair === 'low' ? `<g clip-path="url(#${p}-lowHairClip)"><ellipse id="${p}-tocLungLow" fill="${this.mau.toc}"/></g>` : ''}</g>
            <path id="${p}-khuon" d="${this.nv.dau(this.mau, this.nv)}" fill="${this.mau.da}"/>
            <g id="${p}-tocG">${this.nv.toc(p, this.mau)}
            </g>
            <g clip-path="url(#${p}-matClip)"><g id="${p}-tocGay" fill="${this.mau.toc}"><path id="${p}-tocGayP"/></g></g>
            <g id="${p}-taiL"><ellipse rx="7" ry="9" fill="${this.mau.da}"/>
              <path id="${p}-taiNetL" d="M 1.8 -4.5 Q -3.2 -1 0.8 4.5" stroke="${this.mau.daToi}" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0"/></g>
            <g id="${p}-taiR"><ellipse rx="7" ry="9" fill="${this.mau.da}"/>
              <path id="${p}-taiNetR" d="M -1.8 -4.5 Q 3.2 -1 -0.8 4.5" stroke="${this.mau.daToi}" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0"/></g>
            <g id="${p}-muG">${this.nv.mu(p, this.mau, this.nv)}${this._veMuMo(p)}</g>
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
            ${this._veKhauTrang(p)}
            </g>
          </g>
        </g>
        <!-- xaCang SAU xaTruoc: bàn tay bưng đồ (ở xaCang) phải nằm trên phần cẳng tay ló ra ngoài mép áo của chính nó. -->
        <g id="${p}-xaTruoc" mask="url(#${p}-xaMask)"></g>
        <g id="${p}-xaCang"${this._Vtay()}></g>
        <!-- Ngăn BẾ THÚ: sau đầu và sau các lớp tay xa, trước tay gần — tay gần ôm đè lên con vật, tay xa nằm sau nó. -->
        <g id="${p}-om"></g>
        <g id="${p}-batR">${this._armBody('R')}</g>
        <g id="${p}-phuKienTren" clip-path="url(#${p}-vaiCat)">${this.nv.phuKienTren(p, this.mau, this.nv)}</g>
      </g>
    </g>
  </g>
  <!-- DÂY DẮT (leash): ở GỐC SVG, ngoài mọi phép biến đổi — hai đầu dây đo trên màn hình rồi đổi về hệ này. -->
  <path id="${p}-leash" fill="none" stroke="#c0392b" stroke-width="3.2" stroke-linecap="round" style="display:none"/>
  <!-- DÂY KÉO CO (đợt 40 A, \`pullToy\`): như dây dắt — ở gốc SVG, đầu tay và đầu mõm đo trên màn hình; hai nét: sợi nâu, sợi be bện lên trên. -->
  <g id="${p}-rope" style="display:none"><path data-rope="base" fill="none" stroke="#7a4a1c" stroke-linecap="round"/><path data-rope="top" fill="none" stroke="#e0a85a" stroke-linecap="round"/>
    <path data-rope="twist" fill="none" stroke="#8a5a22" stroke-linecap="round"/><circle data-rope="knot" r="4" fill="#d6453d" stroke="#7a2520" stroke-width="1.200"/></g>
  <g id="${p}-note" style="display:none">
    <path d="M -86 -46 H 86 Q 96 -46 96 -36 V 6 Q 96 16 86 16 H 10 L 0 28 L -10 16 H -86 Q -96 16 -96 6 V -36 Q -96 -46 -86 -46 Z" fill="#ffffff" stroke="#c8d3da" stroke-width="1.6"/>
    <rect x="-86" y="-38" width="22" height="22" rx="6" fill="#2f9e8f"/><path d="M -75 -33 q -6 1 -6 8 v 4 h 12 v -4 q 0 -7 -6 -8 z M -77 -19 h 4" stroke="#ffffff" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <text data-note="1" x="-56" y="-27" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#16303a" data-layout-ignore=""></text>
    <text data-note="2" x="-56" y="-10" font-family="Arial, sans-serif" font-size="13" fill="#3b5560" data-layout-ignore=""></text>
  </g>
  <!-- THẺ SỐ ĐO (đợt 35): màn hình số lớn bật lên trên cân (\`weigh\`) hay trên nhiệt kế (\`takeTemp\`), đuôi chỉ xuống chỗ đo. -->
  <g id="${p}-readout" style="display:none">
    <path d="M -58 -50 H 58 Q 66 -50 66 -42 V -12 Q 66 -4 58 -4 H 9 L 0 8 L -9 -4 H -58 Q -66 -4 -66 -12 V -42 Q -66 -50 -58 -50 Z" fill="#ffffff" stroke="#9fb0bc" stroke-width="1.6"/>
    <rect x="-58" y="-44" width="116" height="34" rx="5" fill="#16232b"/>
    <text data-readout="1" x="0" y="-19" font-family="Arial, sans-serif" font-size="23" font-weight="700" fill="#7dffb0" text-anchor="middle" data-layout-ignore=""></text>
  </g>
  <!-- …và bản vẽ TRƯỚC người (\`ringFront\`): lúc giơ vòng lên trước bụng — sau thân thì khuất; mờ hơn cho thấy hai bàn tay qua nó. -->
  <g id="${p}-ringFront" style="display:none"><ellipse rx="40" ry="36" fill="#e6f3fa" fill-opacity=".38" stroke="#8fb8cf" stroke-width="3"/>
    <ellipse rx="28" ry="25" fill="none" stroke="#8fb8cf" stroke-width="1.6" opacity=".6"/>
    <path d="M -36 14 Q -32 -14 -12 -30" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/></g>
  <!-- ĐỢT 39 C: TẤM BẢNG CHỮ (\`holdSign\`) — ở GỐC SVG, trên thân, đầu và cánh tay (cánh tay không vắt ngang chữ); hai bàn tay vẽ lại
       trên nó (\`use\`), đúng chỗ, đúng hình — nắm hai mép bảng. -->
  <g id="${p}-signRef"></g>
  <g id="${p}-sign" style="display:none"><g data-sign-card=""></g><use data-sign-hand="L" href="#${p}-tayL"/><use data-sign-hand="R" href="#${p}-tayR"/></g>
  <!-- ĐỢT 39 C: CHỚP SÁNG ở điện thoại lúc chụp ảnh tự sướng (\`takeSelfie\`). -->
  <g id="${p}-flash" style="display:none"><circle r="30" fill="#ffffff" opacity=".55"/><circle r="15" fill="#ffffff"/>
    <path d="M 0 -46 L 5 -10 L 46 0 L 5 10 L 0 46 L -5 10 L -46 0 L -5 -10 Z" fill="#fffbe0"/></g>
  <g id="${p}-ball" style="display:none"><circle r="11" fill="#d6e84a" stroke="#7d8a1c" stroke-width="1.5"/>
    <path d="M -10 -3 Q 0 5 10 -3 M -10 4 Q 0 -4 10 4" stroke="#ffffff" stroke-width="1.8" fill="none" opacity=".9"/></g>
</svg>`;
  }

  _layPhanTu() {
    // Nối chuỗi, KHÔNG dùng template literal trong querySelector: bộ lint của HyperFrames
    // (và bộ đóng gói HTML của nó) từ chối selector có biến nội suy.
    const q = (n) => this.svg.querySelector('#' + this.id + '-' + n);
    this.el = {
      goc: q('goc'), bong: q('bong'), chanG: q('chanG'), than: q('than'), ao: q('ao'), tren: q('tren'), sau: q('sau'), sauChan: q('sauChan'), xaTruoc: q('xaTruoc'), xaCang: q('xaCang'), canhL: q('canhL'), canhR: q('canhR'), xaMaskG: q('xaMaskG'), phuKienRect: q('phuKienRect'), dau: q('dau'),
      hongL: q('hongL'), hongR: q('hongR'), tocG: q('tocG'), tocSau: q('tocSau'), tocTruoc: q('tocTruoc'), tocBui: q('tocBui'), coAo: q('coAo'), muG: q('muG'), co: q('co'), coDa: q('coDa'), phuKienTren: q('phuKienTren'), vaiCatL: q('vaiCatL'), vaiCatR: q('vaiCatR'),
      tocLungE: q('tocLungE'), tocLungLow: q('tocLungLow'), lowHairClipR: q('lowHairClipR'), tocGay: q('tocGay'), tocGayP: q('tocGayP'), taiNetL: q('taiNetL'), taiNetR: q('taiNetR'), matClipP: q('matClipP'), phuKien: q('phuKien'), suon: q('suon'), banL: q('banL'), banR: q('banR'), banNgL: q('banNgL'), banNgR: q('banNgR'), net: q('net'), ma: q('ma'), maL: q('maL'), maR: q('maR'), taiL: q('taiL'), taiR: q('taiR'),
      chanL: q('chanL'), chanR: q('chanR'), ongL: q('ongL'), ongR: q('ongR'), skirt: q('skirt'), itemL: q('itemL'), itemR: q('itemR'), toolL: q('toolL'), toolR: q('toolR'), gadgetL: q('gadgetL'), gadgetR: q('gadgetR'), leash: q('leash'), rope: q('rope'), ball: q('ball'), ring: q('ring'), ringFront: q('ringFront'), note: q('note'), readout: q('readout'), watchL: q('watchL'), watchR: q('watchR'), om: q('om'),
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
    Object.assign(this.el, { under42e: q('under42e'), drop42e: q('drop42e') });      // đợt 42 E
    if (this.el.tocSau) this.el.tocSau.style.display = 'none';   // slot kiểu cũ: rig tự sinh tóc sau đầu
    // Dấu cảm xúc: cạnh góc trên bên phải đầu (toạ độ trong nhóm đầu, tâm mặt ở 0, −62) — cao hơn nữa thì ra khỏi khung SVG.
    this.markEl = attachMark(this.el.dau, [70, -128], 1.35);
    this.shadeEl = attachShade(this.svg, this.el.goc);      // đổ bóng trên thân theo hướng sáng (shading.js; bối cảnh 3D đặt)
  }

  /* ------------------------------------------------------ đổ trạng thái */

  apDung() {
    // Vẽ lại toàn bộ hình từ trạng thái `this.s`, theo từng bước dưới đây (mỗi bước một method). Các giá trị một bước tính ra mà
    // bước sau còn dùng (hướng quay, tay xa, độ nhấc vai…) đi qua `f` — khung hình đang vẽ.
    const f = {};
    this._drawRoot(f);
    this._drawLegs(f);
    this._layerArms(f);
    this._drawHeadTurn(f);
    this._drawThighs(f);
    this._drawTorso(f);
    this._poseArms(f);
    this._drawHeldItems(f);
    this._drawHands(f);
    this._drawFace(f);
    const s = this.s, e = this.el;
    const { goc42e, under42e } = f;
    this._veMom();
    this._drawLeash();
    this._drawBall();
    this._drawRope();
    this._drawNote();
    this._drawReadout();
    this._drawSign();                       // đợt 39 C: tấm bảng giữa hai bàn tay, chớp sáng ở điện thoại
    this._drawFloor(goc42e, under42e);          // đợt 42 E: bóng dài + gối dưới người nằm, món đồ dưới sàn chờ nhặt
    this._drawScales();
    for (const [el, on] of [[e.ring, s.ring >= 0.5 && !(s.ringFront >= 0.5)], [e.ringFront, s.ring >= 0.5 && s.ringFront >= 0.5]]) {
      if (!el) continue;
      el.style.display = on ? '' : 'none';
      if (on) el.setAttribute('transform', `translate(${(s.ringX + s.x).toFixed(2)} ${(s.ringY + s.y + DOI_Y).toFixed(2)}) scale(${(s.ringR / 40).toFixed(4)})`);
    }
    if (this.markEl && this.m) drawMark(this.markEl, this.m);
    // Con vật đang được người này băng chân / đeo loa (đợt 35): nó đọc mức đeo từ trạng thái của người này — vẽ lại nó ngay,
    // thứ tự vẽ lại của hai chuỗi lúc tua thế nào cũng ra đúng.
    for (const pet of this.caring || []) if (pet.el) pet.apDung();
  }

  /** Gốc của cả người: chỗ đứng, độ co (xa / gần), hạ người khi ngồi, bay khỏi sàn; bóng dưới chân; ngồi xổm / nằm (đợt 42 E) (một bước của `apDung`) */
  _drawRoot(f) {
    const s = this.s, e = this.el;
    // co dãn quanh điểm chạm đất (200,428) để thu nhỏ = lùi xa, phóng to = tiến gần
    const doiChan = this.hangChan();
    // Ngồi (`seat`) hạ cả người xuống đúng bằng phần đùi rút đi (xem chỗ vẽ chân bên dưới).
    // Tính ngay ở đây chứ không để động tác tween `y`: `y` còn là "nhảy lên" và "lùi ra xa",
    // gộp chung thì bóng đổ tụt theo người xuống dưới bàn chân.
    const seatDrop = this._lowered();
    const bay42d = Math.max(0, s.lift42d || 0);           // đợt 42 D: bay khỏi sàn (chạy, nhảy) — người lên, bóng ở lại
    e.goc.setAttribute('transform', `translate(${s.x} ${s.y + seatDrop + DOI_Y + doiChan - bay42d}) translate(200 428) scale(${s.co}) translate(-200 -428)`);
    e.goc.setAttribute('opacity', s.mo);
    // bóng thu lại khi nhấc người lên
    const nhac = clamp(-s.y / 40 + bay42d / 50, 0, 1);
    // `bong` nằm TRONG `goc` nên đã mang sẵn phép dời/co của `goc`. Bản trước
    // chép lại nguyên phép ấy vào đây: bóng bị dời HAI lần — rơi xuống dưới bàn
    // chân đúng `DOI_Y + doiChan` đơn vị và chạy gấp đôi `x` lúc enter/exit.
    // Ở đây chỉ còn phép co riêng của bóng quanh chính tâm bóng, và KÉO NGƯỢC
    // `doiChan`: `goc` hạ cả người xuống chừng ấy để bàn chân chạm nền, tức
    // trong hệ của `goc` bàn chân nằm ở 428 − doiChan chứ không phải 428.
    e.bong.setAttribute('transform', `translate(200 ${428 - doiChan - (seatDrop - bay42d) / (s.co || 1)}) scale(${1 - nhac * 0.25} 1) translate(-200 -428)`);   // trừ seatDrop: bóng nằm lại dưới bàn chân; cộng bay42d: bóng ở lại trên sàn
    e.bong.setAttribute('opacity', 0.28 - nhac * 0.12);
    // ĐỢT 42 E: NGỒI XỔM — cả người lùi về sau đúng chừng bàn chân trượt ra trước (bàn chân đứng yên); NẰM — cả người xoay quanh hông, hạ
    // xuống / dời ngang cho chỗ thấp nhất nằm đúng trên mặt sàn (mặt sofa) và thân nằm giữa chỗ đứng. Bóng trong khung thì mờ đi (bóng dài vẽ riêng).
    const goc42e = this._floorGoc(seatDrop, doiChan);
    if (goc42e) { e.goc.setAttribute('transform', goc42e.transform); if (goc42e.blend) e.bong.setAttribute('opacity', ((0.28 - nhac * 0.12) * (1 - goc42e.blend)).toFixed(3)); }
    Object.assign(f, { goc42e });
  }

  /** Hai hông, tỉ lệ đùi / ống / bàn chân, và bàn chân lăn theo góc khớp (cầm lái, ngồi bệt cộng thêm) (một bước của `apDung`) */
  _drawLegs(f) {
    const s = this.s, e = this.el;
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
    // CẦM LÁI (`ride`): cộng thêm vào góc khớp chân — đùi xoay ra TRƯỚC (về phía đang quay mặt) tới gần nằm ngang, ống
    // chân gập lại gần thẳng đứng, bàn chân hơi đưa ra trước lên sàn để chân. Cộng vào chứ không ghi đè `dui`/`ong`: động
    // tác nào xong cũng khép hai kênh ấy về 0, còn `ride` là thế giữ (xem _khep).
    const ride = clamp(s.ride || 0, 0, 1);
    const legDui = (ben) => s['dui' + ben] - dauH * ride * (ben === (h >= 0 ? 'L' : 'R') ? RIDE_THIGH : RIDE_THIGH - 6) + this._floorLegAdd(ben, 'dui', h);      // + ngồi bệt / ngồi xổm (đợt 42 E)
    const legOng = (ben) => s['ong' + ben] + dauH * ride * RIDE_KNEE + this._floorLegAdd(ben, 'ong', h);
    const goc = (dui, ong) => ah * dauH * (RigSVG._lanBanChan(dauH * dui, dauH * ong) - dauH * (dui + ong));
    for (const ben of ['L', 'R']) {
      const dui = legDui(ben), ong = legOng(ben);
      // ĐỢT 42 E: ngồi bệt / ngồi xổm — giày nhìn nghiêng, ÁP ĐẾ xuống sàn (xoay ngược đúng góc ống chân); ngồi bệt nhìn thẳng: mũi giày
      // chĩa ra ngoài, về phía bàn chân ấy nằm (bàn chân trái nằm bên phải, dưới đùi phải).
      const foot42e = this._floorFoot(ben, h, dui, ong);
      e['ban' + ben].setAttribute('opacity', foot42e ? 1 - foot42e.side : 1 - ah);
      e['banNg' + ben].setAttribute('opacity', foot42e ? foot42e.side : ah);
      const tf = foot42e ? `rotate(${goc(dui, ong) * (1 - foot42e.flat) + foot42e.flat * foot42e.turn} 0 ${DAI.ong}) scale(${foot42e.mirror} 1)` : `rotate(${goc(dui, ong)} 0 ${DAI.ong}) scale(${h < 0 ? -1 : 1} 1)`;
      e['ban' + ben].setAttribute('transform', tf);
      e['banNg' + ben].setAttribute('transform', tf);
    }
    Object.assign(f, { h, ah, daiDui, dayChan, cachChan, turnDetail, legShift, dauH, ride, legDui, legOng });
  }

  /** Xếp lớp hai tay theo hướng quay: tay xa sau thân / sau chân, đan tay, bưng đồ, bế con vật, gãi gáy; chân gần nằm trên (một bước của `apDung`) */
  _layerArms(f) {
    const s = this.s, e = this.el;
    const { h, ah } = f;
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
    const restFar = xa ? this._restArm(xa) : [0, 0];
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
      const back = s['sauDau' + ben] >= 0.5 || this._pillowArm() === ben;          // đợt 42 E: tay kê dưới đầu lúc nằm — đầu tựa lên nó
      if (back && !beforeHead) e.tren.insertBefore(arm, e.dau);
      else if (!back && beforeHead) e.tren.insertBefore(arm, e.phuKienTren);
    }
    e.phuKienTren.style.display = ah > 0.12 ? 'none' : '';
    const gan = h > 0 ? e.hongL : e.hongR;                  // chân gần vẽ sau cùng (nằm trên)
    if (e.chanG.lastElementChild !== gan && e.chanG.lastElementChild !== e.skirt) e.chanG.appendChild(gan);
    else if (e.skirt && e.skirt.previousElementSibling !== gan) e.chanG.insertBefore(gan, e.skirt);      // váy luôn nằm trên cả hai chân
    Object.assign(f, { xa, atRest, clasp, carryFront, front });
  }

  /** Đầu xoay nghiêng (3/4) và cúi / ngẩng: cụm nét mặt, má, nước mắt, mồ hôi, tóc, mũ, tóc gáy, tai (một bước của `apDung`) */
  _drawHeadTurn(f) {
    const s = this.s, e = this.el;
    const { h, ah } = f;
    // ---- ĐẦU XOAY NGHIÊNG (3/4). Coi đầu là khối cầu bán kính `khuon.rong`:
    // xoay góc θ thì một điểm ở x0 trên mặt đi tới x0·cosθ + sâu·sinθ. Cả cụm nét mặt
    // vì thế chỉ cần MỘT phép dịch (netLech ≈ R·sinθ) và MỘT phép co ngang (cosθ).
    // Mọi thứ đổi bằng HÌNH HỌC, không bằng opacity: mảng tóc mờ dần đè lên da cho ra
    // một cái bóng xám giữa mặt suốt lúc đang xoay.
    // HƯỚNG ĐẦU (đợt 36, `lookAt`): đầu quay thêm `headTurn` so với thân (cùng đơn vị với `huong`), cúi `headPitch` (1 = cúi hẳn,
    // −1 = ngẩng). Mọi thứ trên đầu (nét mặt, tóc, tai, mũ) vẽ theo `hd`; thân, cổ áo vẫn theo `h`.
    const hd = clamp(h + (s.headTurn || 0), -1, 1), ahd = Math.abs(hd), pitch = clamp(s.headPitch || 0, -1, 1);
    const nv = this.nv, K = nv.khuon, k = mem(ahd), sg = h < 0 ? -1 : 1, sgd = hd < 0 ? -1 : 1;
    const co = 1 - ahd * 0.15, lech = hd * nv.netLech;
    // Cúi / ngẩng (`headPitch`): cụm nét mặt trượt xuống / lên trên khối cầu của đầu và hơi dẹt lại theo chiều dọc.
    const pitchY = pitch * RigSVG.PITCH_SHIFT;
    e.net.setAttribute('transform', `translate(${lech} ${pitchY.toFixed(2)}) scale(${co} ${(1 - Math.abs(pitch) * 0.08).toFixed(3)})`);
    // Má đi theo nét mặt và bị CẮT theo viền mặt: má phía xa trượt ra mép rồi khuất
    // sau đường bao, thay vì tràn ra ngoài tóc.
    for (const [ben, dau] of [['L', -1], ['R', 1]]) {
      const xa = Math.max(0, dau * hd);                    // 1 = má này nằm phía mặt đang quay tới
      e['ma' + ben].setAttribute('cx', lech + co * dau * nv.maX);
      e['ma' + ben].setAttribute('cy', nv.maY + pitchY);
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
    e.muG.setAttribute('transform', `${coToc} translate(${hd * nv.tocLech} 0)`);   // mũ đi đúng theo mái tóc
    // Chỏm/mái dịch nhẹ theo mặt; búi tóc nằm sau đỉnh đầu nên đi NGƯỢC lại, về phía gáy.
    e.tocTruoc.setAttribute('transform', `translate(${hd * nv.tocLech} ${(pitch * RigSVG.PITCH_SHIFT * 0.3).toFixed(2)})`);
    if (e.tocBui) e.tocBui.setAttribute('transform', `translate(${-hd * (nv.buiLech + nv.tocLech)} ${ahd * 3})`);
    // Sọ sau: một khối tóc nằm SAU khuôn mặt, nhìn thẳng thì khuất hẳn, xoay thì lùi về
    // gáy — đầu người sâu hơn bề ngang mặt, thiếu nó thì nhìn nghiêng đầu dẹt như cái đĩa.
    e.tocLungE.setAttribute('cx', -hd * K.rong * 0.3);
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
    e.tocGay.setAttribute('transform', `scale(${sgd} 1)`);
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
      const gan = Math.max(0, -dau * hd), xa = Math.max(0, dau * hd);
      const x = gan ? nv.taiX * (1 - 0.18 * mem(gan)) : nv.taiX + (w4 - 6 - nv.taiX) * mem(xa);
      e['tai' + ben].setAttribute('transform', `translate(${dau * x} ${(4 - pitch * RigSVG.PITCH_SHIFT * 0.45).toFixed(2)}) scale(${1 - 0.15 * gan - 0.5 * xa} 1)`);
      e['taiNet' + ben].setAttribute('opacity', mem(gan));
    }
    Object.assign(f, { hd, pitch, sg });
  }

  /** Đùi và ống chân: xoè khi ngồi, đùi nằm ngang khi ngồi quay 3/4, quỳ; váy / tạp dề bám theo hai đùi (một bước của `apDung`) */
  _drawThighs(f) {
    const s = this.s, e = this.el;
    const { h, ah, daiDui, dayChan, cachChan, legShift, legDui, legOng } = f;
    // NGỒI (`seat`): nhìn từ trước, đùi chĩa về phía người xem nên chỉ còn một khúc ngắn, còn
    // ống chân vẫn dài nguyên. Nhóm chân co theo chiều dọc để rút đùi; ống chân là con của nhóm
    // ấy nên nhận phép co NGƯỢC lại cho khỏi ngắn theo. (Khác `nhac`, vốn rút cả chân — dùng cho
    // dậm chân, chỗ đó cả chân nhấc về phía trước.)
    // Ngồi thì hai đùi XOÈ ra, ống chân vẫn thẳng đứng: có một chỗ GẬP ở đầu gối để mắt đọc ra dáng ngồi. Chỉ rút
    // ngắn đùi theo chiều dọc thì chân vẫn là một đường thẳng — nhìn như nhân vật lùn đi chứ không phải ngồi xuống.
    // (Ngồi quay 3/4 — đùi gập nằm ngang, xem `sideSit` dưới đây — thì thôi xoè: xoè cộng gập làm một đùi dốc hơn, bàn chân lún.)
    const splay = RigSVG.SEAT_SPLAY * clamp(s.seat, 0, 1) * (1 - ah) * (1 - clamp(s.seat, 0, 1) * clamp(ah / 0.2, 0, 1) * (1 - clamp(s.kneel || 0, 0, 1)));
    // Đùi xoè thì dài thêm 1/cos để đầu gối vẫn ở đúng độ cao cũ — bàn chân không rời mặt đất.
    // Quỳ: ống chân cũng rút (chĩa về phía người xem) — co thêm sau phép co ngược của đùi.
    // NGỒI MÀ QUAY 3/4 (đợt 29): đùi NẰM NGANG trên mặt ghế, chĩa về phía mặt nhìn, gần đủ dài; ống chân thõng thẳng xuống.
    // Nhìn thẳng thì đùi chỉ còn một khúc rút ngắn nối thẳng với ống chân — người ngồi sofa / ghế đá trông như đứng trước
    // ghế. Đùi 75° dài đủ thì phần thẳng đứng của nó là cos 75° ≈ 0,26 chiều dài — gần đúng 0,28 của dáng nhìn thẳng, nên
    // hông vẫn hạ đúng chừng ấy (`seatY`, mặt ghế) và bàn chân vẫn chạm đất.
    const sideSit = clamp(s.seat, 0, 1) * clamp(ah / 0.2, 0, 1) * (1 - clamp(s.kneel || 0, 0, 1));
    const sitFold = -Math.sign(h) * 75 * sideSit;                                      // xoay dương = về bên trái màn hình
    // Phần thẳng đứng của đùi luôn bằng của dáng nhìn thẳng (1 − 0,72 × seat): đùi xoay φ thì dài thêm 1/cos φ — quay dở
    // (đang vuốt con chó, huong −0,3) mà để đùi dài theo `sideSit` thì đầu gối thấp quá, bàn chân lún 4,5 % chiều cao.
    const thighSeen = (1 - clamp(s.seat, 0, 1) * 0.72) / Math.cos(splay * RAD) / Math.cos(sitFold * RAD) * this._floorSeen(ah), shinFix = ` scale(1 ${((1 - KNEEL_SHIN * clamp(s.kneel || 0, 0, 1)) / thighSeen).toFixed(4)})`;
    e.chanL.setAttribute('transform', `rotate(${legDui('L') + s.nhacL * 6 + splay + sitFold}) scale(1 ${(1 - s.nhacL * 0.42) * thighSeen})`);
    e.chanR.setAttribute('transform', `rotate(${legDui('R') - s.nhacR * 6 - splay + sitFold}) scale(1 ${(1 - s.nhacR * 0.42) * thighSeen})`);
    e.ongL.setAttribute('transform', `translate(0 ${DAI.dui * daiDui})${shinFix} rotate(${legOng('L') - splay - sitFold})`);      // co ngược TRƯỚC rồi mới xoay: xoay trước thì phép co làm ống chân xiên đi
    e.ongR.setAttribute('transform', `translate(0 ${DAI.dui * daiDui})${shinFix} rotate(${legOng('R') + splay - sitFold})`);      // co ngược TRƯỚC rồi mới xoay: xoay trước thì phép co làm ống chân xiên đi

    // ── VÁY / TẠP DỀ: một tứ giác từ eo xuống gấu, hai góc gấu BÁM theo hai đùi.
    if (e.skirt) {
      const K = this.nv.skirt, thigh = DAI.dui * daiDui, halfLeg = 13 * dayChan, flare = K.flare ?? 4;
      const reach = (K.length ?? 1) * thigh;                     // gấu cách hông bao xa, đo dọc theo chân
      // Điểm trên chân `side` ở cách hông `reach`, lệch ngang `offset` so với trục chân — trong
      // hệ toạ độ nhóm chân. Quá gối thì đi tiếp theo hướng ống chân.
      const along = (side, offset) => {
        const hipX = (side === 'L' ? -1 : 1) * (cachChan * (1 - ah * 0.7) + ah * 3) + legShift;
        const a = (legDui(side) + (side === 'L' ? 1 : -1) * (s['nhac' + side] * 6 + splay) + sitFold) * RAD;
        const squash = (1 - s['nhac' + side] * 0.42) * thighSeen;                // đùi rút ngắn khi nhấc gối / khi ngồi
        const onThigh = Math.min(reach, thigh) * squash, past = Math.max(0, reach - thigh);
        const b = a + (legOng(side) - (side === 'L' ? 1 : -1) * splay - sitFold) * RAD;
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
  }

  /** Thân, nhóm chân, nhấc vai và hơi thở: thân áo, chi tiết ngực xoay theo thân, cổ áo, cổ, đầu; độ hiện của món đồ (một bước của `apDung`) */
  _drawTorso(f) {
    const s = this.s, e = this.el;
    const { h, ah, turnDetail, dauH, ride, pitch } = f;
    // ── DÁNG CÒNG: thân ngắn lại, và khi quay nghiêng thì ngả hẳn về trước (xoay theo hướng nhìn).
    const stoop = clamp(this.nv.stoop || 0, 0, 1);
    // `torsoWidth` kéo cả thân trên ra theo chiều ngang. Đầu nằm trong nhóm thân nên bị kéo theo —
    // chỗ đặt đầu (bên dưới) chia lại cho đúng bằng hệ số ấy để đầu vẫn tròn.
    const wide = clamp(this.nv.torsoWidth || 1, 0.7, 1.6);
    e.than.setAttribute('transform', `translate(${HONG.x} ${HONG.y}) rotate(${s.than + h * stoop * 10 + dauH * ride * RIDE_LEAN}) scale(${this.nv.coThan * wide} ${this.nv.coThan * (1 - stoop * 0.05)})`);
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
    e.dau.setAttribute('transform', `translate(${s.dauX + onPhone * CALL_TILT * 0.4 + h * (2.5 + stoop * 7) + (s.headTurn || 0) * 2.5} ${-103 + this.nv.dauLech + s.dauY + stoop * 9 + pitch * 3}) rotate(${s.dau + onPhone * CALL_TILT + (s.headTilt || 0)}) scale(${this.nv.coDau / wide} ${this.nv.coDau})`);
    e.itemL.setAttribute('opacity', clamp(s.itemL, 0, 1));
    e.itemR.setAttribute('opacity', clamp(s.itemR, 0, 1));
    Object.assign(f, { nhacY });
  }

  /** Góc của hai cánh tay: đánh tay theo chiều sâu, pha dáng nhìn nghiêng, vai nhấc theo tay (chốt vai, đệm vai), aim, khuỷu không thẳng đuột, tay xa đan / khép, ov, điện thoại, bế, cầm lái, ngồi bệt; nắp vai, cẳng tay (một bước của `apDung`) */
  _poseArms(f) {
    const s = this.s, e = this.el;
    const { h, ah, dauH, ride, xa, atRest, clasp, carryFront, front, sg, nhacY } = f;
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
    const near = xa === 'R' ? 'L' : xa === 'L' ? 'R' : null, restNearArm = near ? this._restArm(near) : null;
    // Cũng vậy khi tay xa KHÔNG khoanh ở dáng nghỉ (đã trao món đồ đi: tay ấy về dáng buông) — một bàn tay gần một mình
    // giữa ngực, không có bàn tay kia để đan vào.
    const farFolded = xa && !(this.holds[xa] && s['item' + xa] > 0.5) && this._restArm(xa)[1] <= -45;
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
      const restNear = this._restArm(near), front = tayTheoSau(restNear[0], restNear[1], 0), side = tayNghieng(restNear[1], 0), sign = near === 'L' ? 1 : -1;
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
    // Đang trao (`omGive`): hai tay rời dáng ôm, vươn theo con vật ra điểm giữa hai người (góc do `_offerArms` đặt).
    const cradle = clamp(s.omRise, 0, 1) * (1 - clamp(s.omGive || 0, 0, 1));
    if (cradle) for (const [side, sign] of [['L', 1], ['R', -1]]) {
      rotation['bat' + side] += (sign * CRADLE[0] - rotation['bat' + side]) * cradle;
      rotation['cang' + side] += (sign * CRADLE[1] - rotation['cang' + side]) * cradle;
    }
    // đợt 40 C — con vật trong tay VÙNG VẪY (`struggle` của rig thú ghi `vung` −1…1): hai cánh tay giữ chặt mà lắc theo từng cú giật —
    // cùng quét sang một phía (`swing`) và siết vào mỗi lần giật (`squeeze`). Đọc từ trạng thái con vật mỗi lần vẽ, nên gọi thẳng hay qua `sequence()` như nhau.
    const held40 = cradle ? this._carriedNow() : null, squirm = held40 && held40.pet && held40.pet.s ? clamp(+held40.pet.s.vung || 0, -1, 1) : 0;
    if (squirm) for (const [side, sign] of [['L', 1], ['R', -1]]) {
      rotation['bat' + side] += squirm * 7 * cradle + sign * Math.abs(squirm) * 4 * cradle;
      rotation['cang' + side] += -squirm * 5 * cradle + sign * Math.abs(squirm) * 3 * cradle;
    }
    // CẦM LÁI: hai tay vươn ra trước–xuống tới tay lái (góc TRÊN MÀN HÌNH, cùng hướng với mặt), bàn tay nắm lại. Tay nào
    // GIƠ HẲN LÊN (vẫy, chỉ — bắp tay lệch dáng nghỉ quá 40°) thì nhả tay lái dần, xong lại về nắm; nhịp tay lúc nói
    // không làm buông tay lái.
    const rideGrip = { L: 0, R: 0 };
    if (ride) for (const side of ['L', 'R']) {
      const off = Math.abs(s['bat' + side] - this._restArm(side)[0]);         // chỉ BẮP TAY giơ lên mới tính: cử chỉ lúc nói chủ yếu gập cẳng tay
      const w = ride * clamp(1 - (off - 40) / 40, 0, 1) * (1 - clamp(s['ov' + side], 0, 1));
      rideGrip[side] = w;
      if (!w) continue;
      rotation['bat' + side] += (-dauH * RIDE_ARM[0] - rotation['bat' + side]) * w;
      rotation['cang' + side] += (-dauH * RIDE_ARM[1] - rotation['cang' + side]) * w;
    }
    // ĐỢT 42 E: NGỒI BỆT — hai bàn tay đặt lên hai đầu gối; NẰM — tay phía dưới kê dưới đầu. Tay đang diễn (giơ hẳn lên, `aim`, `ov`, bế) thì nhả.
    const under42e = this._floorArms(rotation, pivot, nhacY, cradle);
    e.batL.setAttribute('transform', `translate(${pivot.L.x} ${pivot.L.y}) rotate(${rotation.batL}) scale(1 ${(1 - (1 - tL.co) * cF) * shrink.L})`);
    e.batR.setAttribute('transform', `translate(${pivot.R.x} ${pivot.R.y}) rotate(${rotation.batR}) scale(1 ${(1 - (1 - tR.co) * cF) * shrink.R})`);

    // Vùng xoá viền ở nắp vai (xem `_armBody`). Mặt nạ nằm trong hệ toạ độ CỦA CÁNH TAY (đã xoay, đã co), còn thân áo
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
    // Đợt 46: nhóm trống thì về trạng thái cố định — nhóm trống có bộ lọc viền vẫn được Chrome vẽ (một lớp lọc theo phép biến đổi của
    // nó), mang phép biến đổi của lần nó có tay gần nhất thì điểm ảnh quanh đó lệch 1–2 mức tuỳ những khung đã vẽ trước.
    else if (e.xaCang.hasAttribute('transform')) e.xaCang.removeAttribute('transform');
    if (!front && e.xaCang.style.filter) e.xaCang.style.filter = '';
    Object.assign(f, { armAngle, rotation, rideGrip, under42e });
  }

  /** Món đồ trong tay và dụng cụ: luôn đứng thẳng, nghiêng / phóng, mặt trước / lưng, pít-tông, tờ giấy lật, các ngón ôm món đồ (một bước của `apDung`) */
  _drawHeldItems(f) {
    const s = this.s, e = this.el;
    const { rotation } = f;
    this._placeCarried();
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
      // Xoay dụng cụ quanh lòng bàn tay (0, 10) theo `gadgetTurn` — tay trái vẽ soi gương nên góc đổi dấu.
      const spin = +(s['gadgetTurn' + side] || 0);
      if (spin) box.setAttribute('transform', `rotate(${(side === 'L' ? -spin : spin).toFixed(2)} 0 10)`); else box.removeAttribute('transform');
      for (const child of box.children) child.style.display = +child.getAttribute('data-gadget') === kind ? '' : 'none';
    }
    this._drawCareTools();                     // đợt 38 A: kìm khép, giọt thuốc rơi, vạch "bíp" của máy quét chip
    this._drawBathTools();                    // đợt 42 F: tia nước vòi sen, bọt trên bàn chải
    this._drawDeskTools();                     // đợt 39 A: dòng nước rót, mức nước trong cốc, tờ tiền đang đếm, khăn gấp, dấu đỏ trên thẻ, tick "ting"
    this._veGang(e, s);                                       // đợt 38 B: găng trên từng tay, mép găng, đám bọt xà phòng
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
      const match = this._bagMatch(side, zoom);
      e['item' + side].setAttribute('transform', (match ? `translate(${match.dx.toFixed(2)} ${match.dy.toFixed(2)}) ` : '') + `rotate(${itemTurn.toFixed(2)} 0 10) translate(0 ${(-lift).toFixed(2)})`
        + ((match ? match.zoom : zoom) !== 1 ? ` translate(0 10) scale(${(match ? match.zoom : zoom).toFixed(3)}) translate(0 -10)` : ''));
      // Mặt LƯNG của món đồ (`data-back`) hiện theo `itemBack`, mặt trước (`data-front`) ẩn đi tương ứng — đổi hẳn ở nửa
      // chừng, không hoà mờ (hai mặt chồng mờ lên nhau là một vệt xám).
      const back = s['itemBack' + side] >= 0.5 || phone >= 0.5;
      // Pít-tông ống tiêm (`data-plunger`) trượt vào thân ống theo `plunger` (0…1) — đơn vị trong hệ của món đồ.
      const plunger = e['item' + side].querySelector('[data-plunger]');
      if (plunger) plunger.setAttribute('transform', `translate(0 ${(clamp(s['plunger' + side], 0, 1) * +(plunger.dataset.plunger || 10)).toFixed(2)})`);
      // TỜ TRÊN CÙNG của bìa hồ sơ (`data-page`) lật lên quanh mép kẹp theo `page` (0…1, `readChart`): co về mép trên rồi
      // lật hẳn ra phía trên kẹp, mặt sau (trắng, không chữ) — tờ dưới lộ ra.
      // Lượt ba: tờ giấy LẬT MỀM — mép dưới đi theo một cung quanh mép kẹp (cos), hai mép bên phồng cong (sin), quá nửa thì thấy mặt
      // sau (xám nhạt, không chữ), gần hết thì khuất sau bảng. `data-sheet` là hình tờ giấy, vẽ lại mỗi khung.
      const sheet = e['item' + side].querySelector('[data-page]');
      if (sheet) {
        const flip = clamp(s['page' + side] || 0, 0, 1), top = +(sheet.dataset.page || 0), shape = sheet.querySelector('[data-sheet]');
        sheet.style.display = flip > 0.93 ? 'none' : '';
        sheet.removeAttribute('transform');
        if (shape) {
          const span = 32, yb = top + span * Math.cos(Math.PI * flip), bulge = 10 * Math.sin(Math.PI * flip), mid = (top + yb) / 2, curl = -4 * Math.sin(Math.PI * flip);
          shape.setAttribute('d', `M -12 ${top} L 12 ${top} Q ${(12 + bulge).toFixed(2)} ${(mid + curl).toFixed(2)} 12 ${yb.toFixed(2)} Q 0 ${(yb + curl * 1.5).toFixed(2)} -12 ${yb.toFixed(2)} Q ${(-12 - bulge).toFixed(2)} ${(mid + curl).toFixed(2)} -12 ${top} Z`);
          shape.setAttribute('fill', flip > 0.5 ? '#e4e9ee' : shape.dataset.paper || '#ffffff');
        }
        for (const ink of sheet.querySelectorAll('[data-ink]')) ink.style.display = flip > 0.02 ? 'none' : '';
      }
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
    Object.assign(f, { armTurn, gripping });
  }

  /** Bàn tay: chọn hình (nắm, xoè, chỉ…), lật ngón cái theo hướng cẳng tay, ngón cái giơ lên luôn chỉ lên trời (một bước của `apDung`) */
  _drawHands(f) {
    const s = this.s, e = this.el;
    const { h, clasp, armAngle, rideGrip, armTurn, gripping } = f;
    for (const ben of ['L', 'R']) {
      // Tay ĐANG CẦM ĐỒ thì không buông: động tác nào đòi xoè tay hay chỉ trỏ bằng tay ấy, bàn tay
      // vẫn giữ dáng nắm của tư thế nghỉ — nếu không cái cốc sẽ dính lơ lửng vào lòng bàn tay xoè.
      const grip = this.NGHI['tay' + ben] !== 'mo' ? this.NGHI['tay' + ben] : 'nam';
      // Đang ÔM con vật: bàn tay khum lại ôm lấy nó (xoè ngửa phía dưới đọc thành bưng một cái khay).
      const chon = this.holds[ben] && s['item' + ben] > 0.5 ? grip : s.omRise >= 0.5 || rideGrip[ben] >= 0.5 ? 'nam' : s['tay' + ben];
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
        // ĐỢT 39 B: ba hình mới dài / rộng hơn bàn tay thường — không hiện thì BỎ HẲN khỏi khung (`drawnRect` đo cả hình đang mờ).
        if (HANDS_39.includes(k)) g.style.display = op ? '' : 'none';
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
      // ĐỢT 39 B: bàn tay duỗi thẳng 'chao' (chào, che trán) cũng phóng to theo `handZoom` — đọc được ở cảnh trung.
      if (chon === 'chao') e.tayG[ben].setAttribute('transform', `scale(${(guong * lat * hz).toFixed(3)} ${hz.toFixed(3)})`);
    }
  }

  /** Mắt (nhắm, nháy, liếc), mũi, con ngươi, chân mày theo hướng đầu (một bước của `apDung`) */
  _drawFace(f) {
    const s = this.s, e = this.el;
    const { hd } = f;
    const mi = Math.max(0.05, 1 - Math.max(s.matY, clamp(s.nap42e || 0, 0, 1)));      // đợt 42 E: `nap42e` — nằm ngủ, mắt nhắm
    // `matCo` nhân vào CẢ HAI trục của phép co sẵn có (nheo theo góc xoay,
    // nhắm theo `matY`), nên nháy mắt và liếc mắt vẫn đúng ở mọi cỡ.
    const mc = this.nv.matCo;
    // Mắt, mũi, con ngươi, chân mày theo HƯỚNG ĐẦU `hd` (`headTurn` cộng vào `huong`, đợt 36).
    e.matL.setAttribute('transform', `translate(${-this.nv.matX} ${this.nv.matY}) scale(${mc * (1 - Math.max(0, -hd) * 0.3)} ${mc * mi})`);
    e.matR.setAttribute('transform', `translate(${this.nv.matX} ${this.nv.matY}) scale(${mc * (1 - Math.max(0, hd) * 0.3)} ${mc * mi})`);
    // ĐỢT 39 B: NHÁY MỘT MẮT (`nhayL` / `nhayR` cộng vào độ nhắm của riêng mắt ấy).
    for (const [ben, el, sg] of [['L', e.matL, -1], ['R', e.matR, 1]]) if (s['nhay' + ben] > 0.001) {
      el.setAttribute('transform', `translate(${sg * this.nv.matX} ${this.nv.matY}) scale(${mc * (1 - Math.max(0, sg * hd) * 0.3)} ${mc * Math.max(0.05, 1 - clamp(s.matY + s['nhay' + ben], 0, 1))})`);
    }
    if (e.mui) e.mui.setAttribute('transform', `translate(${hd * 3} ${this.nv.muiY}) scale(${this.nv.muiCo})`);
    if (e.netThem && this.nv.netTheoMat && this.nv.netGoc) {
      const g = this.nv.netGoc;
      e.netThem.setAttribute('transform',
        `translate(0 ${(this.nv.matY - g.matY).toFixed(2)}) scale(${(this.nv.matX / g.matX).toFixed(4)} ${this.nv.matCo})`);
    }
    e.nguoiL.setAttribute('transform', `translate(${s.nhinX + hd * 1.2} ${s.nhinY})`);   // mắt nhìn theo hướng đi
    e.nguoiR.setAttribute('transform', `translate(${s.nhinX + hd * 1.2} ${s.nhinY})`);
    // Chân mày KHÔNG buộc phải thẳng hàng với mắt: `mayX` tách riêng, bỏ trống
    // thì rơi về `matX` như cũ. Trên mặt thật hai mày thường cách nhau rộng hơn
    // hai con ngươi một chút, và đó là thứ đổi được nét mặt rõ nhất sau `xech`.
    const mx = this.nv.mayX ?? this.nv.matX;
    e.mayL.setAttribute('transform', `translate(${-mx} ${this.nv.mayY - s.mayL * 5}) scale(${1 - Math.max(0, -hd) * 0.28} 1) rotate(${-s.mayL * 8})`);
    e.mayR.setAttribute('transform', `translate(${mx} ${this.nv.mayY - s.mayR * 5}) scale(${1 - Math.max(0, hd) * 0.28} 1) rotate(${s.mayR * 8})`);
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
  _drawNote() {
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

  // THẺ SỐ ĐO (`weigh`, `takeTemp` — đợt 35): thẻ thứ `readoutN` trong `this.readings` — { text, x, y } (chỗ cố định trong hệ gốc:
  // trên con vật đứng trên cân) hay { text, side } (trên bàn tay cầm nhiệt kế, đo mỗi khung như thẻ thông báo). Lớn dần theo `readout`.
  _drawReadout() {
    const e = this.el, s = this.s;
    if (!e || !e.readout) return;
    const k = clamp(s.readout, 0, 1), r = (this.readings || [])[Math.round(s.readoutN) - 1];
    if (!r || k < 0.02) { e.readout.style.display = 'none'; return; }
    let x = r.x, y = r.y;
    if (r.side) {
      const hand = e['coTay' + r.side], ctm = hand && hand.getScreenCTM(), root = this.svg.getScreenCTM();
      if (!ctm || !root) { e.readout.style.display = 'none'; return; }
      const p = new DOMPoint(0, 0).matrixTransform(ctm).matrixTransform(root.inverse());
      x = p.x + (r.side === 'L' ? -1 : 1) * 118; y = p.y - 8;           // cạnh bàn tay, lệch hẳn ra ngoài: không che mặt
    }
    const text = e.readout.querySelector('[data-readout]');
    if (text.textContent !== r.text) text.textContent = r.text;
    // Đợt 38 A: thẻ RỘNG theo chữ (`w` — mã chip của `scanChip`); không có thì cỡ cũ (ô số 116).
    const half = (r.w || 116) / 2 + 8;
    if (e.readout.getAttribute('data-half') !== String(half)) {
      const [card, screen] = e.readout.children, a = half - 8;
      card.setAttribute('d', `M ${-a} -50 H ${a} Q ${half} -50 ${half} -42 V -12 Q ${half} -4 ${a} -4 H 9 L 0 8 L -9 -4 H ${-a} Q ${-half} -4 ${-half} -12 V -42 Q ${-half} -50 ${-a} -50 Z`);
      screen.setAttribute('x', -a); screen.setAttribute('width', 2 * a);
      e.readout.setAttribute('data-half', String(half));
    }
    e.readout.setAttribute('transform', `translate(${(r.side || r.w ? x : clamp(x, half + 4, KHUNG.w - half - 4)).toFixed(1)} ${(y - 6 * k).toFixed(1)}) scale(${((0.45 + 0.55 * k) * (r.w ? 0.82 : 1)).toFixed(3)})`);      // thẻ rộng (mã chip) nhỏ lại một chút: chữ vẫn ≥ 8 % khung ở góc cận
    e.readout.style.opacity = Math.min(1, k * 1.6).toFixed(2);
    e.readout.style.display = '';
  }

  // QUẢ BÓNG đang bay (`throwBall`): một đường parabol trong hệ gốc của SVG, từ trên vai tay ném tới một điểm trên sàn
  // cách `throw.distance` đơn vị về phía ném.
  _drawBall() {
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
  _drawLeash() {
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
  _veMom() {
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
    const lying = this._floorShotBox(kind);                     // đợt 42 E: người NẰM — khung ôm thân nằm ngang
    if (lying) return lying;
    const drop = this.hangChan() + this._lowered() + s.y - Math.max(0, s.lift42d || 0);      // đợt 42 D: đang bay khỏi sàn
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
  _restArm(side, shown = this.s['item' + side]) {
    if (this.holds[side] && shown <= 0.5) return [NGHI['bat' + side], NGHI['cang' + side]];
    return [this.NGHI['bat' + side], this.NGHI['cang' + side]];
  }

  // Khép về tư thế nghỉ, bàn tay đổi về 'mo' ở nửa sau đoạn khép.
  _khep(t, d = 0.5, at = '>', giu = {}) {
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
    so.seat = this.s.seat; so.huong = this.s.huong; so.kneel = this.s.kneel; so.ride = this.s.ride;
    for (const k of ['floor42e', 'lie42e', 'lieDir42e', 'lieLift42e', 'nap42e', 'picked42e']) so[k] = this.s[k];      // đợt 42 E: ngồi bệt, nằm, ngủ, đồ đã nhặt — thế giữ
    so.itemL = this.s.itemL; so.itemR = this.s.itemR;          // đồ vật đã cất thì vẫn cất
    so.phoneL = this.s.phoneL; so.phoneR = this.s.phoneR;      // đang áp điện thoại thì vẫn áp
    so.om = this.s.om; so.omRise = this.s.omRise;              // đang bế thú thì vẫn bế
    so.omSlot = this.s.omSlot;                                 // … và vẫn là lần bế ấy (đợt 37)
    so.petDrop = this.s.petDrop;                               // con vật đã nhận thì đặt xuống ở chỗ mới (`takePet`, đợt 30)
    so.leash = this.s.leash;                                   // đang dắt thú thì vẫn dắt
    so.petWrap = this.s.petWrap; so.petCone = this.s.petCone;  // băng đã quấn, loa đã đeo cho con vật thì vẫn còn trên nó (đợt 35)
    so.gloveL = this.s.gloveL; so.gloveR = this.s.gloveR;      // găng đã đeo thì vẫn đeo (đợt 38 B)
    so.petWet42f = this.s.petWet42f; so.petDry42f = this.s.petDry42f;      // đợt 42 F: con vật đã tắm thì còn ướt, đã lau thì còn khô bông
    // Tay ĐÃ CẤT ĐỒ thì buông lỏng: tư thế nghỉ của nhân vật cầm đồ là cánh tay gập giữ cái cốc — cất cốc rồi
    // mà tay vẫn gập nắm như thế là bàn tay nắm vào không khí.
    const target = { ...so, ...giu }, hands = { tayL: this.NGHI.tayL, tayR: this.NGHI.tayR };
    for (const side of ['L', 'R']) {
      if (!this.holds[side] || target['item' + side] > 0.5) continue;
      const [upper, fore] = this._restArm(side, target['item' + side]);
      target['bat' + side] = upper; target['cang' + side] = fore; hands['tay' + side] = 'mo';
    }
    t.to(this.s, { ...target, duration: d, ease: 'power2.inOut' }, at);
    // Bàn tay về hình dạng NGHỈ của nhân vật (mặc định thả lỏng, nhưng có thể là nắm tay).
    t.set(this.s, hands, `>-${d * 0.5}`);
    return t;
  }

  _chop(t, at) {
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
  _tuTheDi(f, a, kA = 1) {
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
      const ph = RigSVG._lanBanChan(g, og) * RAD;                    // gót ở x −8, mũi ở x 24, đế ở y +10
      return nv.coBanChan * (Math.max(-8 * Math.sin(ph), 24 * Math.sin(ph)) + 10 * Math.cos(ph));
    };
    const tam = (g, og) => Ld * Math.cos(g * RAD) + Lo * Math.cos((g + og) * RAD) + de(g, og);
    const xa = (g, og) => -(Ld * Math.sin(g * RAD) + Lo * Math.sin((g + og) * RAD));
    const l = tam(o.duiL, o.ongL), r = tam(o.duiR, o.ongR);
    o.y = (Ld + Lo + 10 * nv.coBanChan - 0.5 * (l + r + Math.hypot(l - r, 3) - 3)) * cc;
    return { o, l, r, xl: xa(o.duiL, o.ongL), xr: xa(o.duiR, o.ongR) };
  }

  // Biên độ theo số bước đã đi: vào dáng trong 0.7 bước đầu, ra dáng trong 0.7 bước cuối.
  _baoDi(buoc, vao, ra) {
    return (b) => (vao ? mem(b / 0.7) : 1) * (ra ? mem((buoc - b) / 0.7) : 1);
  }

  // Quãng đường hông đi được nếu CHÂN TRỤ KHÔNG TRƯỢT, tính sẵn thành bảng theo số
  // bước. Là hàm của pha chứ không cộng dồn lúc chạy, nên tua timeline tới đâu cũng đúng.
  _bangDi(buoc, vao, ra, kA) {
    const M = 40, n = buoc * M, X = [0], bao = this._baoDi(buoc, vao, ra);
    let tr = this._tuTheDi(0.75, bao(0), kA);
    for (let i = 1; i <= n; i++) {
      const b = i / M, ht = this._tuTheDi(0.75 + b / 2, bao(b), kA);
      const tru = tr.l + ht.l >= tr.r + ht.r ? 'xl' : 'xr';          // chân trụ = chân đang thấp hơn
      X.push(X[i - 1] + Math.max(0, tr[tru] - ht[tru]));
      tr = ht;
    }
    return { tong: X[n], x: (b) => { const v = clamp(b, 0, buoc) * M, i = Math.min(n - 1, Math.floor(v)); return X[i] + (X[i + 1] - X[i]) * (v - i); } };
  }

  // Chọn số bước và sải chân để đi vừa đúng `quang` đơn vị mà chân không trượt.
  _doBuoc(quang, vao, ra) {
    let buoc = 2, b;
    do { buoc++; b = this._bangDi(buoc, vao, ra, 1); } while (b.tong * 1.04 < quang && buoc < 14);
    let kA = 1;
    for (let i = 0; i < 4; i++) { kA *= quang / b.tong; b = this._bangDi(buoc, vao, ra, kA); }
    return { buoc, kA, x: (v) => b.x(v) * (quang / b.tong) };
  }

  // Đặt `buoc` bước đi nghiêng vào timeline, mỗi bước dài h giây. Pha bắt đầu ở 0.75
  // (hai đùi thẳng đứng, chân trái đang nhấc) nên từ tư thế nghỉ là NHẤC CHÂN bước đi,
  // và kết thúc là đặt chân xuống cạnh chân kia. `x(b)` nếu có thì dời cả người theo.
  // `chieu` −1 = đi sang TRÁI: lấy đúng tư thế đi sang phải rồi soi gương — đổi dấu
  // mọi góc xoay trong mặt phẳng màn hình và ĐỔI VAI hai bên (chân/tay gần người
  // xem khi quay trái là bên R, khi quay phải là bên L).
  _di(t, at, buoc, h, { vao = true, ra = true, kA = 1, x = null, chieu = 1 } = {}) {
    const s = this.s, bao = this._baoDi(buoc, vao, ra);
    const dat = (b) => {
      const o = this._tuTheDi(0.75 + b / 2, bao(b), kA).o;
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

  // ĐỢT 42 F — TẮM, ĐÁNH RĂNG, LAU KHÔ cho con vật (dịch vụ grooming / spa). Như đợt 38 A: quay gần nghiêng hẳn về con vật (`_care38`), hai tay
  // cùng vươn ra trước; dụng cụ chỉ hiện trong tay (gadget 40 vòi sen, 41 bàn chải đánh răng, 42 khăn tắm; 14 bọt trên bàn tay khi xoa dầu tắm).
  // Việc bàn tay làm lên con vật là kênh của người (`petWet42f`, `petFoam42f`, `petDry42f`, `petTowel42f`, `petRub42f`, `petMood42f`, `petGape42f`,
  // `petLick42f`) — con vật đọc lại khi vẽ (RigThu._veBath): gọi thẳng hay qua `sequence()` đều đúng nhịp. Con vật trong chậu tắm: đạo cụ `tub`
  // + `pet.inTub42f(rim)` (tools/scene.py: `"inTub": true`).
  static { this.DONG_TAC.push('bathPet', 'brushTeeth', 'towelDry'); }      // đợt 42 F
}
for (const install of [basic, counter, presenter, motion, gestures, care, treatment, lookCarry, pairs, floor, stance, speech]) install(RigSVG);
export { veKhuonMat, beRongTaiY, veChanMay };
