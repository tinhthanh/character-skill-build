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

import { KHUNG, LIE, HELD, DAT, clamp, RAD, mem, pha, gieoHat, chinhSang, assertColors, NGHI, carrotSVG, toyShapeSVG, toyMouthSVG, LOAI, SHAPE_RANGE, DEFAULT_SHAPE, shapedSpecies, khop, SYMPTOMS, WEARABLES, luuHat, traHat, mix } from './pet/shared.js';
import { freshMark, attachMark, drawMark } from './marks.js';
import { attachShade, outlinePoints } from './shading.js';
import poses from './pet/poses.js';
import play from './pet/play.js';
import basic from './pet/basic.js';
import species from './pet/species.js';
import tricks from './pet/tricks.js';
import mood from './pet/mood.js';
import grooming from './pet/grooming.js';
import leash49c from './pet/leash49c.js';
import exam50a from './pet/exam50a.js';

// Các động tác nằm theo nhóm trong runtime/pet/ (mỗi tệp một nhóm); lớp ở đây giữ phần lõi: dựng SVG, vẽ (`apDung`),
// đổi màu / dáng, tư thế nghỉ, và các bảng tên động tác.

export class RigThu {
  static KHUNG = KHUNG;
  static NGHI = NGHI;
  static LOAI = LOAI;
  static DONG_TAC = {
    dog: ['idle', 'wagTail', 'bark', 'sit', 'tiltHead', 'jump', 'beg', 'givePaw', 'sniff', 'unwell', 'walk', 'enter', 'exit', ...SYMPTOMS, 'express', 'rollOver', 'chaseTail', 'lick', 'hide',
          'playBow', 'howl', 'dig', 'carryToy', 'leanOnLeg', 'tugOfWar'],      // đợt 40 A
    cat: ['idle', 'meow', 'purr', 'lickPaw', 'stretch', 'hiss', 'tailSwish', 'tiltHead', 'pounce', 'unwell', 'walk', 'enter', 'exit', ...SYMPTOMS, 'express', 'rollOver', 'knead', 'lick', 'hide'],
    rabbit: ['idle', 'hop', 'thump', 'tiltHead', 'unwell', 'walk', 'enter', 'exit', ...SYMPTOMS.filter((name) => name !== 'fetch' && name !== 'greet'), 'express', 'hide', 'eatCarrot'],
  };
  static {
    // đợt 40 B: mèo — rửa mặt, nằm ổ bánh mì, chớp mắt chậm, vờn đồ chơi, cong lưng, chui hộp; thỏ — nhảy vui, nằm vật, đứng hai chân, giật mũi
    RigThu.DONG_TAC.cat.push('groomFace', 'loaf', 'slowBlink', 'batToy', 'archBack', 'sitInBox');
    RigThu.DONG_TAC.rabbit.push('binky', 'flop', 'periscope', 'noseTwitch');      // `flop` là thế giữ (như lieDown) nhưng chỉ của thỏ nên nằm trong danh sách thỏ, không trong STANCE chung
    // đợt 49 C: được dắt đi dạo (`walkOnLeash` — người dắt làm cùng lúc); không có người thì kiệu tại chỗ. Thỏ không được dắt (nhảy cóc).
    RigThu.DONG_TAC.dog.push('walkOnLeash'); RigThu.DONG_TAC.cat.push('walkOnLeash');
  }
  static gieo(hat) { gieoHat(hat); }
  static luuNgau() { return luuHat(); }
  static traNgau(state) { traHat(state); }
  static _dem = 0;
  /** Tên màu công khai → khoá màu nội bộ. `index.js` gán bảng này lúc nạp thư viện. */
  static COLOR_ALIASES = {};
  static _withAliases(palette) {
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
    this.mau = this.nv.mau = RigThu._withAliases(this.mauKhai);
    this.DONG_TAC = RigThu.DONG_TAC[nv.loai];
    this.NGHI = Object.freeze({ ...NGHI, ...(nv.nghi || {}) });
    this.id = `thu${++RigThu._dem}`;
    this.wearing = new Set();
    this.careBy = new Set();                      // rig người đang đeo băng / loa cho nó (đợt 35, xem careLevel)
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
  _legNear = null;
  _dongBo = false;                 // đợt 40 C: đang vẽ lại người bế (chặn đệ quy)
  _vungCu = 0;                     // đợt 40 C: `vung` ở lần vẽ trước
  _theoDoi(o) {
    return new Proxy(o, { set: (dich, k, v) => {
      dich[k] = v;
      if (!this._choVe && this.el) { this._choVe = true; queueMicrotask(() => { this._choVe = false; this.apDung(); }); }
      return true;
    } });
  }

  /* ------------------------------------------------------------------ SVG */

  _dungLai() {
    const khung = this.svg && this.svg.getAttribute('viewBox');
    this.host.innerHTML = this._dungSVG();
    this.svg = this.host.querySelector('svg');
    if (khung) this.svg.setAttribute('viewBox', khung);
    // Thuộc tính của SVG khi nó ở NHÀ (trong host của chính nó) — người bế (`carry`) trả con vật về đúng như thế.
    this.homeAttrs = ['x', 'y', 'width', 'height'].map((name) => [name, this.svg.getAttribute(name)]);
    // Nối chuỗi, KHÔNG dùng template literal trong querySelector: bộ lint của HyperFrames
    // (và bộ đóng gói HTML của nó) từ chối selector có biến nội suy.
    const q = (n) => this.svg.querySelector('#' + this.id + '-' + n);
    this.el = Object.fromEntries(['goc', 'bong', 'chanXa', 'chanGan', 'duoi', 'duoiDau', 'than', 'thanE', 'mong', 'nguc', 'gu', 'bung', 'ucSang', 'van', 'co', 'vong', 'the',
      'dau', 'taiL', 'taiR', 'matL', 'matR', 'nguoiL', 'nguoiR', 'dongTuL', 'dongTuR', 'ham', 'luoi', 'luoiNet', 'moi', 'nanh', 'lanhL', 'lanhR', 'nhanL', 'nhanR',
      'duiN', 'duiX', 'nuoc', 'ballM', 'cone', 'bang', 'bangP', 'bangNet', 'lan', 'carrot', 'carrotBody', 'carrotRidge', 'carrotLeaf', 'trail', 'sua', 'jaw', 'toyM', 'toyMRope', 'toyMBone', 'toyEnd', 'howlG', 'dirtG', 'toyFG', ...['tn', 'tx', 'sn', 'sx'].flatMap((k) => [k, k + 'Ban'])].map((n) => [n, q(n)]));
    // Dấu cảm xúc: góc trên, PHÍA SAU đầu (về phía gáy), trên chóp tai. Đợt 36: phía trước (về phía mõm) là phía người đối diện con vật —
    // trái tim nổi đè lên miệng bác sĩ đứng sát bàn khám (Gemini, a.mp4 00:35).
    // ĐỢT 40 B: phần tử của cuộn len, hộp, bàn chân vẽ đè lên mặt, mũi và ria thỏ
    Object.assign(this.el, Object.fromEntries(['toy', 'toyBall', 'boxB', 'boxF', 'gPaw', 'gArm', 'gBan', 'nose', 'riaL', 'riaR', 'phong'].map((n) => [n, q(n)])));
    Object.assign(this.el, Object.fromEntries(['fluff42f', 'wetG42f', 'foam42f', 'towel42f', 'tubClip42f'].map((n) => [n, q(n)])));      // đợt 42 F
    this.markEl = attachMark(this.el.dau, [this.nv.loai === 'rabbit' ? -30 : -26, this.nv.loai === 'rabbit' ? -78 : -66], 1.25);
    this.shadeEl = attachShade(this.svg, this.el.goc);      // đổ bóng trên thân theo hướng sáng (shading.js; bối cảnh 3D đặt)
    this.apDung();
  }

  _dungSVG() {
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
    <!-- ĐỢT 42 F: con vật đứng TRONG CHẬU TẮM (\`inTub42f\`) — cắt phần dưới vành chậu (chậu là đạo cụ vẽ sau lưng nó, vành trước che chân). -->
    <clipPath id="${p}-tub42f" clipPathUnits="userSpaceOnUse"><rect id="${p}-tubClip42f" x="-3000" y="-3000" width="6400" height="6000"/></clipPath>
  </defs>
  <g id="${p}-trail" style="display:none">${Array.from({ length: 16 }, (_, n) => `<ellipse rx="7" ry="3.2" fill="#ffffff" stroke="#b9ad9c" stroke-width="1"/>`).join('')}</g>
  <!-- ĐỢT 40 B: hộp các-tông (sitInBox) — mặt trong phía sau vẽ TRƯỚC con vật, mặt trước vẽ SAU (che thân, chỉ đầu và tai thò ra) -->
  <g id="${p}-boxB" style="display:none"><path d="M -58 -80 L 58 -80 L 62 -22 L -62 -22 Z" fill="#9a6c38" stroke="#6e4a22" stroke-width="2" stroke-linejoin="round"/></g>
  <g id="${p}-goc">
    <ellipse id="${p}-bong" cy="${DAT + 1}" ry="7" fill="#000" opacity=".26"/>
    <!-- NHÓM LẬT (lăn ngửa, kênh lan): thân, bốn chân, đuôi — lật dọc quanh sống lưng; đầu, vòng cổ ở ngoài, vẫn ngửa mặt lên. -->
    <!-- ĐỢT 40 A: hố đào và cục đất văng ra sau (dig) — vẽ SAU bóng, TRƯỚC thân: cục đất lọt giữa hai chân sau, dưới bụng. -->
    <g id="${p}-dirtG" style="display:none"><ellipse data-hole="1" rx="30" ry="6" fill="#5a3d22" stroke="#3e2914" stroke-width="1.400"/>${Array.from({ length: 8 }, (_, n) => `<g data-clod="${n}"><circle r="${(5.2 + (n % 3) * 1.6).toFixed(1)}" fill="${n % 2 ? '#8a5e34' : '#6f4a28'}" stroke="#3e2914" stroke-width="1.200"/></g>`).join('')}</g>
    <g id="${p}-lan">
    <g id="${p}-chanXa"${V}>
      <circle id="${p}-duiX" r="${nv.chanS.dui * 0.9}" fill="${m.longToi}"/>
      ${chan('sx', m.longToi, nv.chanS)}${chan('tx', m.longToi, nv.chanT)}
    </g>
    <g${V}><path id="${p}-duoi" stroke="${m.long}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path id="${p}-duoiDau" stroke="${nv.loai === 'cat' ? m.dom : m.longSang}" fill="none" stroke-linecap="round"/></g>
    <g id="${p}-than"${V}>
      <path id="${p}-phong" fill="${m.long}" stroke="${m.long}" stroke-width="1.500" stroke-linejoin="round" style="display:none"/>
      <path id="${p}-fluff42f" fill="${m.long}" stroke="${m.long}" stroke-width="1.500" stroke-linejoin="round" style="display:none"/>
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
      <!-- ĐỢT 42 F: lông ƯỚT bết thành từng túm (vệt tối dọc lưng, sườn) — \`apDung\` đặt theo thân -->
      <g id="${p}-wetG42f" style="display:none">${[0, 1, 2, 3, 4, 5, 6].map(() => `<path fill="none" stroke="${chinhSang(m.long, -0.42)}" stroke-width="2.600" stroke-linecap="round"/>`).join('')}</g>
    </g>
    <!-- ĐỢT 42 F: BỌT DẦU TẮM trên lưng (\`bathPet\` của người) — bọt trắng, không qua bộ lọc viền -->
    <g id="${p}-foam42f" style="display:none">${Array.from({ length: 18 }, () => `<circle fill="#ffffff" fill-opacity=".95" stroke="#a8cbe2" stroke-width="1.100"/>`).join('')}</g>
    <g id="${p}-chanGan"${V}>
      <circle id="${p}-duiN" r="${nv.chanS.dui}" fill="${m.long}"/>
      ${chan('sn', m.long, nv.chanS)}${chan('tn', m.long, nv.chanT)}
      <!-- BĂNG CHÂN (wear('bandage')): băng thú y màu XANH NHẠT quấn ống chân trước phía người xem, hai vạch quấn trắng —
           băng trắng thì lẫn vào bàn chân trắng của mèo (Gemini, đợt 5). -->
      <g id="${p}-bang" style="display:none"><path id="${p}-bangP" stroke="#7cc4e6" stroke-width="${(nv.chanT.rong + 3).toFixed(1)}" fill="none" stroke-linecap="round"/>
        <path id="${p}-bangNet" stroke="#ffffff" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>
    </g>
    </g>
    <!-- ĐỢT 40 B: cuộn len (batToy), nằm TRÊN sàn trước chân trước; vị trí do apDung đặt -->
    <g id="${p}-toy" style="display:none"><g id="${p}-toyBall"><path d="M -10 5 Q -24 14 -40 8" stroke="#d94a6c" stroke-width="2.200" fill="none" stroke-linecap="round"/>
      <circle r="11.500" fill="#ec6a8a" stroke="#a82a4c" stroke-width="1.600"/>
      <path d="M -9 -4 Q 0 -9 9 -2 M -10 2 Q 0 -4 10 4 M -6 8 Q 2 3 8 9" stroke="#a82a4c" stroke-width="1.400" fill="none" stroke-linecap="round"/>
      <ellipse cx="-3.500" cy="-5" rx="3" ry="2" fill="#fff" opacity=".55"/></g></g>
    <g${V}>
      <path id="${p}-vong" stroke="${m.vongCo}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <circle id="${p}-the" r="4.200" fill="${m.the}" stroke="${m.vienNet}" stroke-width="0.900"/>
    </g>
    <!-- ĐỢT 42 F: KHĂN TẮM quấn quanh thân (\`towelDry\` của người): sau vòng cổ, trước đầu -->
    <g id="${p}-towel42f" style="display:none"><path data-cloth fill="#bfe8e0" stroke="#2f9e8f" stroke-width="1.600" stroke-linejoin="round"/>
      <path data-folds fill="none" stroke="#8fcfc4" stroke-width="1.800" stroke-linecap="round"/><path data-stripes fill="none" stroke="#2f9e8f" stroke-width="3.400" stroke-linecap="round" opacity=".55"/></g>
    <g id="${p}-nuoc" style="display:none">${[0, 1, 2, 3, 4, 5, 6, 7].map((n) => `<path data-drop="${n}" d="M 0 -10 Q 6.5 0 0 6.5 Q -6.5 0 0 -10 Z" fill="#7cc8f0" stroke="#3a8cc4" stroke-width="1.2"/>`).join('')}</g>
    <g id="${p}-dau"${V}>
      <!-- LOA CHỐNG LIẾM (wear('cone')): nhìn thẳng vào mặt, cái loa là một vành trong mờ bao quanh đầu, vẽ SAU đầu. -->
      <g id="${p}-cone" style="display:none"><ellipse rx="70" ry="63" fill="#e6f3fa" fill-opacity=".78" stroke="#8fb8cf" stroke-width="3"/>
        <ellipse rx="50" ry="45" fill="none" stroke="#8fb8cf" stroke-width="1.6" opacity=".55"/>
        <path d="M -70 0 Q -66 -30 -40 -50 M 66 22 Q 58 44 36 56" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/></g>
      ${nv.veDau(p, m, nv)}
      <g id="${p}-ballM" style="display:none" transform="translate(0 ${(nv.mom.y + 7).toFixed(1)})"><circle r="10" fill="#d6e84a" stroke="#7d8a1c" stroke-width="1.4"/>
        <path d="M -9 -3 Q 0 4 9 -3 M -9 4 Q 0 -3 9 4" stroke="#ffffff" stroke-width="1.6" fill="none" opacity=".9"/></g>
      ${carrotSVG(p)}
      <g id="${p}-sua" style="display:none">${[12, 20, 28].map((r) => `<path d="M ${(16 + r * Math.cos(-0.7)).toFixed(1)} ${(nv.mom.y + r * Math.sin(-0.7)).toFixed(1)} A ${r} ${r} 0 0 1 ${(16 + r * Math.cos(0.7)).toFixed(1)} ${(nv.mom.y + r * Math.sin(0.7)).toFixed(1)}" stroke="#ffffff" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M ${(16 + r * Math.cos(-0.7)).toFixed(1)} ${(nv.mom.y + r * Math.sin(-0.7)).toFixed(1)} A ${r} ${r} 0 0 1 ${(16 + r * Math.cos(0.7)).toFixed(1)} ${(nv.mom.y + r * Math.sin(0.7)).toFixed(1)}" stroke="#e53935" stroke-width="3.400" fill="none" stroke-linecap="round"/>`).join('')}</g>
      ${toyMouthSVG(p, nv)}
      <g id="${p}-howlG" style="display:none">${[0, 1, 2].map(() => `<path fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path fill="none" stroke="#e53935" stroke-width="3.400" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</g></g>
    <!-- ĐỢT 40 A: đồ chơi đã nhả xuống sàn (carryToy) — ở hệ của cả con vật, sau đầu. -->
    <g id="${p}-toyFG" style="display:none">${toyShapeSVG(1, 'F')}${toyShapeSVG(2, 'F')}</g>
  </g>
    <g id="${p}-gPaw" style="display:none" filter="url(#${p}-vien)"><path id="${p}-gArm" stroke="${m.long}" stroke-width="${nv.chanT.rong}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <ellipse id="${p}-gBan" rx="${(nv.chanT.rong * 0.74).toFixed(1)}" ry="${(nv.chanT.rong * 0.52).toFixed(1)}" fill="${m.longSang}"/></g>
  </g>
  <g id="${p}-boxF" style="display:none"><path d="M -62 -66 L -90 -50 L -84 -38 L -62 -52 Z M 62 -66 L 90 -50 L 84 -38 L 62 -52 Z" fill="#d9ad6c" stroke="#8a6330" stroke-width="2" stroke-linejoin="round"/>
    <path d="M -62 -66 L 62 -66 L 66 6 L -66 6 Z" fill="#c99a5b" stroke="#8a6330" stroke-width="2.400" stroke-linejoin="round"/>
    <path d="M -62 -66 L 62 -66 L 62 -58 L -62 -58 Z" fill="#dcb274"/>
    <path d="M -9 -66 L 9 -66 L 9 -26 L -9 -26 Z" fill="#efdfc0" opacity=".85"/>
    <path d="M -46 -30 h 22 M -46 -22 h 14 M 28 -22 h 20" stroke="#8a6330" stroke-width="2" stroke-linecap="round" opacity=".55"/></g>
</svg>`;
  }

  /** viewBox cắt sát mặt — cho nút "Cận mặt" của studio. */
  khungMat(nua = 70) {
    const { S } = this._khung(), d = this.nv.dau, k = this.s.huong < 0 ? -1 : 1;
    const cx = 200 + (S.x + d.dx - 200) * k, cy = S.y + d.dy;
    return `${cx - nua} ${cy - nua + 2} ${nua * 2} ${nua * 2}`;
  }

  // Hông H và vai S theo trạng thái. Ngồi: mông hạ xuống chạm nền và dịch tới, vai lùi nhẹ.
  // Trạng thái để VẼ. Con vật đang được BẾ (SVG của nó nằm lồng trong SVG một người — xem `carry` của rig người) thì
  // vẽ ở dáng nằm cuộn trong tay, CỘNG THÊM vào trạng thái của chính nó: timeline riêng của con vật (gừ gừ, vẫy đuôi)
  // vẫn chạy, chỉ thân và chân được đặt nằm, không đứng / ngồi trên không trung.
  _view() {
    if (!(this.svg && this.svg.ownerSVGElement)) return this._careView(this.s);       // đợt 38 A: cộng phần người đang giữ nó làm
    const s = this.s;
    // Khoá nào có trong HELD thì lấy dáng bế; riêng đầu (dauY) CỘNG thêm để con vật vẫn gật / nghiêng đầu được.
    // `heldBlend` (đợt 35, lượt bốn): người bế đặt theo độ nhấc lên — dáng đứng chuyển DẦN sang dáng cuộn trong tay, không bật một khung.
    const k = typeof this.heldBlend === 'number' ? clamp(this.heldBlend, 0, 1) : 1;
    return new Proxy(s, { get: (o, key) => (key === 'ngoi' ? o.ngoi * (1 - k) : key === 'dauY' ? o[key] + HELD.dauY * k : key in HELD ? pha(o[key], HELD[key], k) : o[key]) });
  }

  _khung() {
    const s = this._view(), nv = this.nv, ng = mem(s.ngoi);
    const H = { x: nv.H0.x + 22 * ng + s.sauX, y: pha(nv.H0.y, DAT - nv.dayThan + 3, ng) + s.sauY };
    // Ngồi thì VAI NHẤC LÊN cho hai chân trước gần duỗi thẳng (96% chiều dài chân): để vai
    // ở cao độ lúc đứng thì chân trước khuỵu gập, nhìn ra con vật đang giơ tay chứ không ngồi.
    const T = nv.chanT, vaiNgoi = Math.min(nv.S0.y, DAT - T.rong * 0.36 - 4 - 0.96 * (T.a + T.b));
    const S = { x: nv.S0.x - 9 * ng + s.truocX, y: pha(nv.S0.y, vaiNgoi, ng) + s.truocY };
    return { H, S, ng };
  }

  /* ------------------------------------------------------ đổ trạng thái */

  apDung() {
    const s = this._view(), e = this.el, nv = this.nv, { H, S, ng } = this._khung();
    const held = !!(this.svg && this.svg.ownerSVGElement);       // (đợt 38 A: `#view` còn trả Proxy khi người giữ con vật làm — bế là khi SVG nằm trong SVG người)
    const fx = (v) => v.toFixed(2);
    // Cả con lật theo `huong` quanh trục giữa khung; co dãn quanh điểm chạm đất.
    // Giữa chừng cú lật KHÔNG ép con vật dẹt về 0: bề ngang chỉ co tới 30% rồi đổi bên. Co về 0 thì có một khung hình
    // con vật là một vạch dọc mảnh như sợi chỉ.
    const flip = (s.huong < 0 ? -1 : 1) * (RigThu.FLIP_MIN + (1 - RigThu.FLIP_MIN) * Math.min(1, Math.abs(s.huong)));
    // ĐANG ĐƯỢC BẾ (hình nằm trong tay người khác, không trong host của nó): bỏ phần dời của chính nó — người bế đặt cả khung
    // SVG vào tay. Để phần dời lại thì vị trí trong tay phụ thuộc thứ tự cập nhật: tua nhảy tới giữa cảnh, người bế đặt con mèo
    // theo `s.x` cũ của nó, rồi con mèo mới dời hình đi — nó lệch hẳn khỏi tay (đợt 29, b1 lúc 11,4 s).
    const away = this.isCarried();
    e.goc.setAttribute('transform', `translate(${fx(away ? 0 : s.x + this.dropX())} ${fx(away ? 0 : s.y - (s.rise || 0))}) translate(200 ${DAT}) scale(${fx(s.co * flip)} ${fx(s.co)})${s.nghieng ? ` rotate(${fx(-s.nghieng)})` : ''} translate(-200 ${-DAT})`);
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
    // LĂN NGỬA (`lan`, đợt 35): lật nhóm thân + chân + đuôi quanh sống lưng, nâng / hạ cho lưng chạm sàn.
    const roll = this._roll(s, H, S);
    if (e.lan) e.lan.setAttribute('transform', roll ? `translate(0 ${fx(roll.shift + roll.axis)}) scale(1 ${fx(roll.sy)}) translate(0 ${fx(-roll.axis)})` : '');
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
      if (k === 'tn') this._legNear = { J, ban };
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
    // Người ĐANG ĐEO cho nó (`bandage` / `putCone` của rig người, đợt 35): mức 0…1 đọc từ trạng thái của người ấy — băng dài dần
    // theo từng vòng quấn, loa nở ra quanh đầu. Đeo sẵn (`wear`) là 1.
    const coneOn = this.wearing.has('cone') ? 1 : this.careLevel('petCone'), wrapOn = this.wearing.has('bandage') ? 1 : this.careLevel('petWrap');
    if (e.cone) {
      e.cone.style.display = coneOn > 0.01 ? '' : 'none';
      if (coneOn < 1) { e.cone.setAttribute('transform', `scale(${fx(0.55 + 0.45 * coneOn)})`); e.cone.setAttribute('opacity', fx(clamp(coneOn * 1.6, 0, 1))); }
      else { e.cone.removeAttribute('transform'); e.cone.removeAttribute('opacity'); }
    }
    if (e.bang) {
      e.bang.style.display = wrapOn > 0.01 ? '' : 'none';
      if (wrapOn > 0.01 && this._legNear) {
        const { J, ban } = this._legNear, at = (k) => ({ x: pha(J.x, ban.x, k), y: pha(J.y, ban.y, k) }), a = at(0.22), b = at(0.22 + 0.58 * clamp(wrapOn, 0, 1));
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
    const dd = nv.dau;
    let tam = { x: S.x + dd.dx + s.dauX, y: S.y + dd.dy + s.dauY - ng * 2 };
    let goi = { x: S.x + 4, y: S.y - 8 }, coTam = tam;
    const goi0 = goi;
    if (roll) {
      // Lăn ngửa: đầu KHÔNG lật — nằm tựa trên sàn cạnh vai, mặt vẫn hướng ra người xem. Cổ (trong nhóm lật) nối tới đó.
      tam = { x: pha(tam.x, S.x + dd.dx * 1.1 + 10 + s.dauX, roll.k), y: pha(tam.y, DAT - dd.r * (nv.headScale || 1) * 0.92 + s.dauY, roll.k) };
      goi = { x: goi0.x, y: roll.axis + roll.sy * (goi0.y - roll.axis) + roll.shift };
      coTam = { x: tam.x, y: clamp(roll.axis + (tam.y - roll.shift - roll.axis) / roll.sy, goi0.y - 70, goi0.y + 70) };
    }
    e.co.setAttribute('d', `M ${fx(goi0.x)} ${fx(goi0.y)} L ${fx(pha(goi0.x, coTam.x, 0.75))} ${fx(pha(goi0.y, coTam.y, 0.75))}`);
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
    this._veMom();
    if (e.carrot) this._veCarrot();
    if (e.trail) this._veTrail();
    if (e.sua) { const v = clamp(s.sua || 0, 0, 1); e.sua.style.display = v > 0.03 ? '' : 'none'; if (v > 0.03) { e.sua.setAttribute('opacity', v.toFixed(2)); e.sua.setAttribute('transform', `translate(${(4 * v).toFixed(2)} 0) scale(${(0.8 + 0.3 * v).toFixed(3)})`); } }
    if (e.toyM) this._veDoChoi(H, S);
    this._veSpeciesProps(s, H, S, ng);       // đợt 40 B
    this._veBath(s, H, S);             // đợt 42 F: ướt / bọt / khăn / lông bông / chậu tắm
    this._veGroom49b(s, H, S);         // đợt 49 B: lông gợn trong gió máy sấy, túm lông dài / rụng khi tỉa, lông gọn sau khi tỉa
    this._veExam50a(s, H, S);          // đợt 50 A: bụng lộ ra khi nằm nghiêng, gel siêu âm trên bụng, thân lún khi bị ấn
    if (this.markEl && this.m) drawMark(this.markEl, this.m);
    // đợt 40 C: đang vùng vẫy trong tay người bế (`vung` đổi) thì người bế vẽ lại — hai tay lắc theo (rig-svg.js `squirm`). Chặn đệ quy: người vẽ lại có thể gọi `apDung` của con vật.
    if (held && this.carrier && !this._dongBo && (+s.vung || 0) !== this._vungCu) {
      this._vungCu = +s.vung || 0; this._dongBo = true;
      try { this.carrier.apDung(); } finally { this._dongBo = false; }
    } else if (!held) this._vungCu = 0;
    // Ai đó cần vẽ lại theo con vật (dây dắt của người dắt nó — `leash` của rig người) thì gọi họ sau mỗi lần vẽ.
    if (this.onDraw) this.onDraw();
  }

  // ĐỢT 40 A — vẽ đồ chơi trong mõm / trên sàn, sóng tru, hố đào và cục đất văng ra sau. `H`, `S`: hông và vai của khung vừa tính.
  _veDoChoi(H, S) {
    const s = this.s, e = this.el, nv = this.nv, f = (v) => v.toFixed(2), show = (el, on) => { el.style.display = on ? '' : 'none'; };
    // đồ chơi trong mõm: 1 = dây thừng, 2 = khúc xương
    const kind = s.toy >= 1.5 ? 2 : s.toy >= 0.5 ? 1 : 0;
    show(e.toyM, kind > 0); show(e.toyMRope, kind === 1); show(e.toyMBone, kind === 2);
    // đồ chơi đã nhả xuống sàn
    const fk = s.toyF >= 1.5 ? 2 : s.toyF >= 0.5 ? 1 : 0, fa = clamp(s.toyFA, 0, 1);
    show(e.toyFG, fk > 0 && fa > 0.02);
    if (fk > 0 && fa > 0.02) {
      [...e.toyFG.children].forEach((g, n) => show(g, n + 1 === fk));
      e.toyFG.setAttribute('opacity', f(fa));
      e.toyFG.setAttribute('transform', `translate(${f(s.toyFX)} ${f(DAT - 5)})`);
    }
    // sóng tru: ba đường lượn bay lên từ mõm, luôn đứng thẳng (xoay ngược với đầu), lan ra theo `howl`, trôi theo pha `howlT`
    const hw = clamp(s.howl, 0, 1);
    show(e.howlG, hw > 0.03);
    if (hw > 0.03) {
      e.howlG.setAttribute('opacity', f(Math.min(1, hw * 1.6)));
      e.howlG.setAttribute('transform', `translate(${f(nv.mom.co * 16 + 6)} ${f(nv.mom.y - 8)}) rotate(${f(-s.dau)})`);
      const waves = [...e.howlG.children];
      for (let k = 0; k < 3; k++) {
        const L = (34 + k * 16) * hw, A = 4.5 + k * 1.4, ox = 6 + k * 15, pts = [];
        for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(`${f(ox + u * L * 0.32 + A * Math.sin((u * 1.6 - s.howlT * (0.7 + k * 0.1) + k * 0.4) * Math.PI * 2))} ${f(-u * L)}`); }
        const d = 'M ' + pts.join(' L ');
        waves[k * 2].setAttribute('d', d); waves[k * 2 + 1].setAttribute('d', d);
      }
    }
    // hố đào + cục đất: bay từ chỗ bàn chân trước cào, vòng cung qua bụng, rơi sau hông; mờ dần ở cuối
    const da = clamp(s.dirtA, 0, 1);
    show(e.dirtG, da > 0.03);
    if (da > 0.03) {
      const x0 = S.x + 30, x1 = H.x - 78, hole = e.dirtG.firstElementChild;
      hole.setAttribute('cx', f(x0 - 2)); hole.setAttribute('cy', f(DAT - 1)); hole.setAttribute('opacity', f(da));
      const clods = [...e.dirtG.children].slice(1), n = clods.length;
      clods.forEach((c, i) => {
        const raw = s.dirt + i / n, p = raw - Math.floor(raw), arc = 40 + (i % 3) * 10;
        const x = x0 + (x1 - x0) * p + (i % 2 ? 5 : -5);
        c.setAttribute('transform', `translate(${f(x)} ${f(DAT - 8 - arc * Math.sin(Math.PI * Math.min(1, p * 1.05)))})`);
        c.setAttribute('opacity', f(da * (p > 0.82 ? (1 - p) / 0.18 : 1)));
      });
    }
  }

  /** ĐỢT 40 A: chỗ buộc dây kéo ở đầu đồ chơi trong mõm, theo dáng ĐANG VẼ — điểm trên màn hình (`{ x, y }`, px), hay null khi chưa có hình. `pose`: dáng giả định
   * (kênh → giá trị) để đo trước khi tween chạy: tính xong thì trả lại trạng thái cũ. Người kéo (`pullToy` của rig người) vẽ dây từ tay tới đây. */
  ropeEnd(pose = null) {
    if (!this.el || !this.el.dau || !this.svg || !this.svg.getScreenCTM) return null;
    const keep = pose ? Object.fromEntries(Object.keys(pose).map((k) => [k, this.s[k]])) : null;
    if (pose) { Object.assign(this.s, pose); this.apDung(); }
    const ctm = this.el.dau.getScreenCTM();
    const q = ctm ? new DOMPoint(30, this.nv.mom.y + 6).matrixTransform(ctm) : null;
    if (pose) { Object.assign(this.s, keep); this.apDung(); }
    return q ? { x: q.x, y: q.y } : null;
  }

  // Mõm: nét môi hình chữ "w" dưới mũi, hàm mở ra phía dưới, lưỡi nằm trong hàm rồi thè ra.
  _veMom() {
    const s = this._careView(this.s), e = this.el, k = this.nv.mom.co, y0 = this.nv.mom.y;
    const mo = clamp(s.mieng, 0, 1), cu = s.cuoi * 2.6 * k, w = 9.5 * k, f = (v) => v.toFixed(2);
    // Nét môi chữ "w": khi `cuoi` âm (buồn, hối lỗi, đau) hai vòng cung dẹt lại rồi úp xuống — giữ nguyên vòng cung thì
    // khoé môi có trễ xuống mõm vẫn như đang cười (Gemini soát cảnh thử đợt 13).
    const bow = 5 * k * (s.cuoi >= 0 ? 1 : Math.max(-0.6, 1 + s.cuoi * 1.6));
    e.moi.setAttribute('d', `M 0 ${f(y0 - 3.4 * k)} V ${f(y0)} M ${f(-w)} ${f(y0 - cu)} Q ${f(-w / 2)} ${f(y0 + bow)} 0 ${f(y0)} Q ${f(w / 2)} ${f(y0 + bow)} ${f(w)} ${f(y0 - cu)}`);
    // NANH (`nanh`): hai răng nanh nhọn chĩa xuống ở hai bên dưới môi trên — nhe răng gầm gừ. Môi trên kéo xệch lên theo.
    const fang = clamp(s.nanh, 0, 1);
    if (e.nanh) e.nanh.setAttribute('d', fang < 0.03 ? '' : [-1, 1].map((g) => { const x = g * w * 0.5, top = y0 + 1.2 * k, len = (2.2 + 4.2 * fang) * k;
      return `M ${f(x - 2 * k)} ${f(top)} L ${f(x + 2 * k)} ${f(top)} L ${f(x + g * 0.4 * k)} ${f(top + len)} Z`; }).join(' '));
    if (e.jaw) e.jaw.setAttribute('d', '');
    if (clamp(s.gape || 0, 0, 1) > 0.02 && e.jaw) { this._veGape(mo, fang); return; }
    const sau = mo * 21 * k;
    e.ham.setAttribute('d', mo < 0.02 ? '' : `M ${f(-w * 0.82)} ${f(y0 + 2.4 * k)} Q 0 ${f(y0 + 2.4 * k + sau * 1.5)} ${f(w * 0.82)} ${f(y0 + 2.4 * k)} Q 0 ${f(y0 + 5.5 * k)} ${f(-w * 0.82)} ${f(y0 + 2.4 * k)} Z`);
    // Lưỡi: dài theo `luoi` (thè ra ngoài), tối thiểu nằm lọt trong hàm khi miệng mở.
    const lk = clamp(s.liem || 0, 0, 1), dai = Math.max(clamp(s.luoi, 0, 1) * 17 * k * (1 + RigThu.LICK_REACH * lk), mo * 9 * k), r = 4.6 * k;
    if (dai < 1.2) { e.luoi.setAttribute('d', ''); e.luoiNet.setAttribute('d', ''); return; }
    const ty = y0 + 3.6 * k, day = ty + Math.max(dai - r, 0.1);
    // Lưỡi liếm (đợt 35, lượt hai): xoay quanh gốc lưỡi về phía trước — tới bàn tay chìa ra, hay hất lên tới má người bế.
    const turn = lk > 0.01 ? `rotate(${f(-(s.liemGoc || 0) * lk)} 0 ${f(ty)})` : '';
    e.luoi.setAttribute('transform', turn); e.luoiNet.setAttribute('transform', turn);
    e.luoi.setAttribute('d', `M ${f(-r)} ${f(ty)} L ${f(-r)} ${f(day)} A ${f(r)} ${f(r)} 0 0 0 ${f(r)} ${f(day)} L ${f(r)} ${f(ty)} Z`);
    e.luoiNet.setAttribute('d', dai > r * 1.6 ? `M 0 ${f(ty + 1.5)} V ${f(day + r * 0.3)}` : '');
  }

  // HÁ MIỆNG LỚN (`gape`, đợt 36): người chấm xem thưa (~1 khung / giây) ở góc trung không thấy cái miệng há 0,9 cũ (hàm sâu ~12–16 %
  // đầu) — "miệng khép, không nhai". Ở đây HÀM DƯỚI hạ hẳn: khoang miệng tối sâu tới GAPE_DEPTH chiều cao đầu (bầu đầu, không tính
  // tai), cằm lông sáng tụt xuống dưới đường cằm cũ (viền ngoài của nhóm đầu bao luôn nó), lưỡi hồng nằm dưới đáy khoang, hai răng
  // nanh trên nhỏ và hai răng nanh dưới (thỏ: hai răng cửa sẵn có). Độ há cũ (`mieng`) vẫn giữ làm sàn: há lớn không bao giờ nhỏ hơn.
  static GAPE_DEPTH = 0.32;     // khoang miệng sâu tối đa = 32 % chiều cao bầu đầu (yêu cầu đợt 36: ≥ 25 % ở lúc được hỏi)
  static GAPE_WIDTH = 0.17;     // nửa bề ngang khoang lúc há hết = 17 % chiều cao bầu đầu
  /** Chiều cao BẦU ĐẦU (đơn vị khung của đầu, chưa nhân `headScale`) — không tính tai. */
  skullHeight() { return this.nv.dau.r * 1.8; }
  _veGape(mo, fang) {
    const s = this._careView(this.s), e = this.el, k = this.nv.mom.co, y0 = this.nv.mom.y, f = (v) => v.toFixed(2);
    const g = clamp(s.gape || 0, 0, 1), hh = this.skullHeight(), w = 9.5 * k;
    const yt = y0 + 1.2 * k;
    const D = Math.max(g * RigThu.GAPE_DEPTH * hh, mo * 0.75 * 21 * k);
    const hw = w * 0.82 + (RigThu.GAPE_WIDTH * hh - w * 0.82) * Math.min(1, g * 1.6);
    // khoang miệng: mép trên theo nét môi, đáy tròn
    const cave = (x, top, d, lift) => `M ${f(-x)} ${f(top)} Q 0 ${f(top - lift)} ${f(x)} ${f(top)} C ${f(x * 1.05)} ${f(top + d * 0.55)} ${f(x * 0.72)} ${f(top + d)} 0 ${f(top + d)} C ${f(-x * 0.72)} ${f(top + d)} ${f(-x * 1.05)} ${f(top + d * 0.55)} ${f(-x)} ${f(top)} Z`;
    e.ham.setAttribute('d', cave(hw, yt, D, 1.5 * k));
    // cằm (hàm dưới phủ lông): rộng hơn khoang một chút, thấp hơn đáy khoang — tụt xuống dưới cằm khi há
    const rim = 3.2 + 0.04 * hh;
    e.jaw.setAttribute('d', cave(hw + rim * 0.8, yt + 1, D + rim, 0));
    // lưỡi nằm dưới đáy khoang; `luoi` lớn (thè ra) thì dài thêm ra khỏi miệng
    const lk = clamp(s.liem || 0, 0, 1), r = Math.max(4.6 * k, hw * 0.58), ty = yt + D * 0.42;
    const day = Math.max(yt + D - r * 0.85, ty + 0.1) + clamp(s.luoi, 0, 1) * 17 * k * (1 + RigThu.LICK_REACH * lk);
    const turn = lk > 0.01 ? `rotate(${f(-(s.liemGoc || 0) * lk)} 0 ${f(ty)})` : '';
    e.luoi.setAttribute('transform', turn); e.luoiNet.setAttribute('transform', turn);
    e.luoi.setAttribute('d', `M ${f(-r)} ${f(ty)} L ${f(-r)} ${f(day)} A ${f(r)} ${f(r)} 0 0 0 ${f(r)} ${f(day)} L ${f(r)} ${f(ty)} Z`);
    e.luoiNet.setAttribute('d', `M 0 ${f(ty + 1.5)} V ${f(day + r * 0.3)}`);
    // răng nanh: trên chĩa xuống ở hai góc khoang, dưới chĩa lên từ đáy (thỏ: răng cửa có sẵn, không vẽ nanh)
    if (!e.nanh) return;
    const big = Math.max(fang, 0), len = (0.035 + 0.025 * g) * hh + 4 * big * k, tw = Math.max(1.6, 0.022 * hh);
    if (this.nv.loai === 'rabbit' && big < 0.03) { e.nanh.setAttribute('d', ''); return; }
    const teeth = [-1, 1].map((side) => { const x = side * hw * 0.62, top = yt - 0.3, bottom = yt + D * 0.92;
      return `M ${f(x - tw)} ${f(top)} L ${f(x + tw)} ${f(top)} L ${f(x + side * 0.3)} ${f(top + len)} Z`
        + (g > 0.3 ? ` M ${f(x * 0.92 - tw * 0.8)} ${f(bottom)} L ${f(x * 0.92 + tw * 0.8)} ${f(bottom)} L ${f(x * 0.92)} ${f(bottom - len * 0.7)} Z` : ''); });
    e.nanh.setAttribute('d', teeth.join(' '));
  }

  // LĂN NGỬA (đợt 35): hệ số lật dọc `sy` (1 → −1, không dẹt hẳn về 0 — như cú lật hướng, xem FLIP_MIN), trục lật (giữa thân) và
  // phần nâng / hạ để khi đã ngửa thì LƯNG chạm sàn. null khi không lăn.
  _roll(s, H, S) {
    const lan = clamp(s.lan || 0, 0, 1);
    if (lan < 0.001 || s !== this.s) return null;               // đang được bế: không lăn
    const m = RigThu.FLIP_MIN, sy = lan < 0.5 ? 1 - (1 - m) * lan / 0.5 : -(m + (1 - m) * (lan - 0.5) / 0.5);
    const axis = (H.y + S.y) / 2, top = Math.min(H.y, S.y) - this.nv.dayThan - 1, k = mem(lan);
    return { sy, axis, k, shift: k * (DAT - 2 - (axis + (axis - top))) };
  }

  // VỆT CHẠY VÒNG (đợt 35, lượt ba): những cụm bụi nhỏ dọc nửa vòng tròn con chó vừa chạy qua trên sàn — vòng chạy thấy được cả
  // ở một khung hình tĩnh (người chấm xem video thưa, ~1 khung / giây, chỉ thấy con chó ở vài chỗ khác nhau). Vẽ ngoài nhóm `goc`:
  // không lật theo hướng, không dời theo bước.
  _veTrail() {
    const s = this.s, g = this.el.trail, a = clamp(s.spin || 0, 0, 1), f = (v) => v.toFixed(2);
    g.style.display = a > 0.02 && !this.isCarried() ? '' : 'none';
    if (g.style.display === 'none') return;
    const R = Math.abs(s.spinR || 0), dir = (s.spinR || 0) < 0 ? -1 : 1, depth = RigThu.SPIN_DEPTH, cx = 200 + (s.spinX || 0) + this.dropX(), co = 1;
    [...g.children].forEach((dot, n) => {
      const back = (n + 1) / g.children.length, phi = (s.spinA || 0) - back * Math.PI * 1.25, near = (1 + Math.cos(phi)) / 2;
      dot.setAttribute('transform', `translate(${f(cx + dir * R * Math.sin(phi) * co)} ${f(DAT + 4 - depth * (1 - near))}) scale(${f(0.75 + 0.5 * near)})`);
      dot.setAttribute('opacity', f(a * (1 - back) * 0.85));
    });
  }

  // CỦ CÀ RỐT trong miệng (`carrot` = độ dài còn lại): đầu nhọn ở miệng, chĩa xuống phía trước. Đợt 40 C: củ TO hơn (đọc được ở ~1 khung / giây)
  // và bị GẶM thật — phần mất là phần đầu nhọn nên đầu củ ở miệng thành mặt cắt phẳng (viền sáng) có các vết cắn lõm, củ vẫn dày như cũ mà
  // ngắn lại (không phải thu nhỏ đều); vụn cà rốt (`crumb`) rơi từ miệng sau mỗi miếng.
  static CARROT_LONG = 92;       // độ dài củ nguyên (đơn vị cỡ miệng `k`)
  static CARROT_WIDE = 13;       // nửa bề ngang đầu to
  _veCarrot() {
    const e = this.el, c = clamp(this.s.carrot || 0, 0, 1), f = (v) => v.toFixed(2);
    const k = this.nv.mom.co / 0.6, a = 62 * RAD, d = { x: Math.cos(a), y: Math.sin(a) }, n = { x: -d.y, y: d.x };
    const M = { x: 2 * k, y: this.nv.mom.y + 1.5 * k };
    // vụn rơi: năm mẩu bay ra khỏi miệng rồi rơi, mờ dần
    const crumbs = e.carrotCrumb || (e.carrotCrumb = this.svg.querySelector('#' + this.id + '-carrotCrumb')), u = clamp(this.s.crumb || 0, 0, 1);
    if (crumbs) {
      crumbs.style.display = u > 0.02 && u < 0.99 ? '' : 'none';
      if (u > 0.02) [...crumbs.children].forEach((bit, i) => {
        const vx = [-9, -3, 5, 11, 17][i] * k, vy = [-6, -11, -8, -5, -9][i] * k;
        bit.setAttribute('transform', `translate(${f(M.x + 6 * k + vx * u * 1.6)} ${f(M.y + 4 * k + vy * u * 1.6 + 46 * k * u * u)}) rotate(${f(i * 70 + u * 260)})`);
        bit.setAttribute('opacity', f(1 - u * u));
      });
    }
    e.carrot.style.display = c > 0.02 ? '' : 'none';
    if (c <= 0.02) return;
    const cut = e.carrotCut || (e.carrotCut = this.svg.querySelector('#' + this.id + '-carrotCut'));
    const Lfull = RigThu.CARROT_LONG * k, L = Lfull * (0.16 + 0.84 * c), wB = RigThu.CARROT_WIDE * k;
    const B = { x: M.x + d.x * L, y: M.y + d.y * L };
    const eaten = clamp(1 - L / Lfull, 0, 0.9), wM = 1.4 * k + (wB - 1.4 * k) * eaten;         // nửa bề ngang tại mặt cắt: củ thon dần về đầu nhọn nên cụt đoạn nào thì mặt cắt rộng chừng ấy
    const P = (o, along, side) => `${f(o.x + d.x * along + n.x * side)} ${f(o.y + d.y * along + n.y * side)}`;
    if (eaten < 0.02) e.carrotBody.setAttribute('d', `M ${P(M, -1.2 * k, 1.4 * k)} L ${P(B, 0, wB)} Q ${P(B, wB * 1.1, 0)} ${P(B, 0, -wB)} L ${P(M, -1.2 * k, -1.4 * k)} Z`);
    else {
      // mặt cắt: ba vết cắn lõm (đáy tròn vào trong củ), cái giữa sâu nhất
      const scallops = [0, 1, 2].map((i) => { const x1 = -wM + (2 * wM / 3) * (i + 1), mid = -wM + (2 * wM / 3) * (i + 0.5), dep = Math.min(wM * 0.55, 5 * k) * (i === 1 ? 1.25 : 0.85);
        return `Q ${P(M, dep * 2, mid)} ${P(M, 0, x1)}`; }).join(' ');
      e.carrotBody.setAttribute('d', `M ${P(M, 0, wM)} L ${P(B, 0, wB)} Q ${P(B, wB * 1.1, 0)} ${P(B, 0, -wB)} L ${P(M, 0, -wM)} ${scallops} Z`);
      // viền sáng của mặt cắt (thịt củ) chạy theo các vết cắn — chỉ có khi đã bị gặm
      if (cut) cut.setAttribute('d', `M ${P(M, 0, -wM)} ${scallops}`);
    }
    if (eaten < 0.02 && cut) cut.setAttribute('d', '');
    e.carrotRidge.setAttribute('d', [0.35, 0.62].map((t) => `M ${P(M, L * t, wB * t * 0.8)} L ${P(M, L * t + 2 * k, -wB * t * 0.5)}`).join(' '));
    e.carrotLeaf.setAttribute('d', [-28, 0, 26].map((g) => { const r = (62 + g) * RAD; return `M ${P(B, wB * 0.6, 0)} l ${f(Math.cos(r) * 20 * k)} ${f(Math.sin(r) * 20 * k)}`; }).join(' '));
  }

  /** Đổi MÀU — dựng lại SVG từ bảng màu mới. `long` đổi thì `longToi` (chân xa, tai) tự tối theo. */
  doiMau(kieu = {}) {
    kieu = Object.fromEntries(Object.entries(kieu).map(([name, v]) => [RigThu.COLOR_ALIASES[name] || name, v]));
    assertColors(kieu, 'doiMau');
    const k = { ...kieu };
    if (k.long && !k.longToi) k.longToi = chinhSang(k.long, -0.2);
    Object.assign(this.mauKhai, k);
    this.mau = this.nv.mau = RigThu._withAliases(this.mauKhai);
    this._dungLai();
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
    this._dungLai();
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
    playBow: 'Chổng mông rủ chơi', howl: 'Tru', dig: 'Đào đất', carryToy: 'Tha đồ chơi', leanOnLeg: 'Dựa chân', tugOfWar: 'Kéo co',   // đợt 40 A
    rollOver: 'Lăn ngửa', chaseTail: 'Đuổi đuôi', knead: 'Nhào', lick: 'Liếm', hide: 'Chạy nấp', eatCarrot: 'Gặm cà rốt',
    groomFace: 'Rửa mặt', loaf: 'Nằm ổ bánh mì', slowBlink: 'Chớp mắt chậm', batToy: 'Vờn đồ chơi', archBack: 'Cong lưng dựng lông', sitInBox: 'Chui hộp',   // đợt 40 B
    binky: 'Nhảy vui', flop: 'Nằm vật ra', periscope: 'Đứng hai chân', noseTwitch: 'Giật mũi',   // đợt 40 B
    walkOnLeash: 'Được dắt đi dạo',   // đợt 49 C
  };
  // đợt 40 C — bốn động tác thú ở phòng khám, cho cả ba loài; `pawAtCone` cần đang đeo loa nên không chạy trơn (như WITH_ITEM của rig người)
  static WITH_WEAR = ['pawAtCone'];
  static { for (const kind of Object.keys(this.DONG_TAC)) this.DONG_TAC[kind].push('shiverAtVet', 'struggle', 'groggy', 'pawAtCone'); Object.assign(this.TEN_DONG_TAC, { shiverAtVet: 'Sợ run ở phòng khám', struggle: 'Vùng vẫy', groggy: 'Lừ đừ sau thuốc mê', pawAtCone: 'Cào loa' }); }

  /* ------------------------------------------------------------ tiện ích */

  // `lazy: false`: xem chú thích ở `tl()` của rig-svg.js.
  tl() { return gsap.timeline({ paused: true, defaults: { lazy: false }, onUpdate: () => this.apDung(), onComplete: () => this.apDung() }); }

  _khep(t, d = 0.4, at = '>', giu = {}) {
    // `x` không thuộc tư thế nghỉ: con vật đi tới đâu thì đứng lại ở đó (xem rig-svg.js).
    // `ngoi` (đang ngồi) và `huong` (đang quay về bên nào) là THẾ ĐỨNG: động tác xong thì trả về
    // đúng giá trị lúc nó bắt đầu chứ không về tư thế nghỉ — chó đã `sitDown()` thì sủa, nghiêng
    // đầu xong vẫn ngồi; con vật đã `face('left')` thì vẫn quay trái. (Như rig người.)
    const { x, ...so } = this.NGHI;
    so.ngoi = this.s.ngoi; so.huong = this.s.huong; so.nam = this.s.nam;
    // Đang NẰM (hoặc động tác này đặt nằm xuống): khép về dáng nằm, không ngồi — trừ khoá nào động tác tự giữ.
    const lying = (giu.nam ?? so.nam) > 0.5;
    if (lying) Object.assign(so, LIE, { ngoi: 0 });
    so.flop = this.s.flop;
    if ((giu.flop ?? so.flop) > 0.5) Object.assign(so, RigThu.FLOP);       // đợt 40 B: thỏ nằm vật ra — khép về dáng ấy chứ không về dáng nằm thường
    if (this.s.side50a) so.side50a = this.s.side50a;
    if ((giu.side50a ?? so.side50a) > 0.5) Object.assign(so, RigThu.SIDE50A);       // đợt 50 A: nằm nghiêng (`lieOnSide`) — khép về dáng ấy
    t.to(this.s, { ...so, ...giu, duration: d, ease: 'power2.inOut' }, at);
    return t;
  }
  _chop(t, at) {
    // Mở lại tới độ mở của nét mặt nghỉ (đang `mood('sleepy')` thì mắt díp), không phải mở to — con mèo buồn ngủ chớp
    // mắt một cái là tỉnh hẳn dưới dấu "zzz" (cảnh thử đợt 13).
    t.to(this.s, { matY: 1, duration: 0.07, ease: 'power1.in' }, at).to(this.s, { matY: this.NGHI.matY, duration: 0.11, ease: 'power1.out' }, at + 0.07);
  }
  // Đứng dậy nếu đang ngồi (mèo nghỉ ở dáng ngồi; chó sau `sitDown`); trả về thời điểm đứng xong.
  _dung(t, at = 0) {
    if (!this.s.ngoi) return at;
    t.to(this.s, { ngoi: 0, duration: 0.32, ease: 'power2.inOut' }, at);
    return at + 0.32;
  }
  // Vẫy đuôi `n` nhịp quanh góc `tam`, biên độ `bien` độ, mỗi nhịp `h` giây.
  _vay(t, at, n, bien, h, tam = 0) {
    for (let i = 0; i < n; i++) t.to(this.s, { duoi: tam + (i % 2 ? -bien : bien), duration: h, ease: 'sine.inOut' }, at + i * h);
    return at + n * h;
  }

  /* ------------------------------------------------------------ bước đi
   * Bốn chân là HÀM CỦA PHA: chân trụ trượt lùi đều (60% chu kỳ), chân vung nhấc lên
   * đưa tới (40%). Hai cặp chéo lệch nhau nửa chu kỳ — kiểu đi nước kiệu.
   */
  _buoc(f, a, A, cao) {
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
  _di(t, at, chuKy, h, { vao = true, ra = true, quang = 0, x0 = 0, A = 13, cao = 9, bob = 1 } = {}) {
    const s = this.s;
    const bao = (c) => (vao ? mem(c / 0.5) : 1) * (ra ? mem((chuKy - c) / 0.5) : 1);
    // Chân trụ lùi 2A trong 0.6 chu kỳ ⇒ thân tiến (2A/0.6)·biên độ mỗi chu kỳ. Lập bảng quãng đường.
    const M = 60, n = Math.round(chuKy * M), X = [0];
    for (let i = 1; i <= n; i++) X.push(X[i - 1] + (2 * A / 0.6) * bao(i / M) / M);
    const tiLe = quang ? Math.abs(quang) / X[n] : 0, dau = quang < 0 ? -1 : 1;
    const dat = (c) => {
      const a = bao(c);
      const step = this._buoc(c, a, A * (tiLe ? Math.min(1.35, Math.max(0.5, tiLe)) : 1), cao);
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
    let at = this._dung(t, 0);
    // Đi về phía nào thì quay đầu về phía ấy; đi xong quay lại hướng ĐANG GIỮ (xem `face`).
    const held = s.huong < 0 ? -1 : 1, dir = quang < 0 ? -1 : quang > 0 ? 1 : held;
    if (dir !== held) { t.to(s, { huong: dir, duration: 0.22, ease: 'power1.inOut' }, at); at += 0.22; }
    t.to(s, { taiL: 0.5, taiR: 0.5, cuoi: 0.7, duration: 0.2 }, 0);
    // Quãng NGẮN thì đi thong thả (40 đơn vị mỗi nhịp, nửa giây một nhịp). Quãng dài mà giữ nhịp ấy thì
    // con vật mất gần chục giây để băng qua khung hình — nên đổi sang chạy lúp xúp: sải dài hơn, nhịp nhanh hơn.
    const far = Math.abs(quang) > 160;
    const chuKy = quang ? Math.max(2, Math.round(Math.abs(quang) / (far ? 62 : 40))) : buoc / 2;
    at = this._di(t, at, chuKy, far ? 0.4 : 0.5, far ? { quang, x0, A: 16, cao: 11 } : { quang, x0 });
    this._khep(t, 0.4, at, quang ? { x: x0 + quang, huong: dir } : {});
    if (dir !== held) t.to(s, { huong: held, duration: 0.22, ease: 'power1.inOut' }, '>');
    return t;
  }

  // Nhịp chạy cho một quãng `far`: quãng ngắn thì lúp xúp như trước (52 đơn vị mỗi chu kỳ 0,36 s); quãng DÀI (cảnh
  // rộng) thì phi — sải dài hơn, nhịp nhanh hơn — để băng qua nửa khung hình trong khoảng ba giây chứ không phải năm.
  _pace(far) {
    if (far <= 380) return { cycles: Math.max(6, Math.round(far / 52)), beat: 0.36, A: 16, lift: 11 };
    return { cycles: Math.max(6, Math.round(far / 86)), beat: 0.3, A: 22, lift: 15 };
  }

  // Quãng từ chỗ đứng gốc ra hẳn ngoài khung hình về phía `dir` — xem `_offstage` trong rig-svg.js.
  _offstage(dir) {
    const frame = this.svg.getBoundingClientRect();
    const scale = Math.min(frame.width / KHUNG.w, frame.height / KHUNG.h);
    if (!(scale > 0)) return 300;
    const stage = (this.svg.closest('[data-composition-id]') || this.svg.ownerDocument.documentElement).getBoundingClientRect();
    const centre = frame.left + frame.width / 2;
    return clamp((dir > 0 ? stage.right - centre : centre - stage.left) / scale + 110, 300, 700);
  }

  /** Chạy VÀO từ ngoài khung hình rồi dừng ở chỗ của mình. `from`: 'left' (mặc định) hoặc 'right'; `distance`: quãng chạy, bỏ trống thì tự tính. */
  enter(from = 'left', distance = null) {
    const t = this.tl(), s = this.s, dir = from === 'right' ? -1 : 1, far = distance > 0 ? distance : this._offstage(-dir);
    t.set(s, { x: -far * dir, mo: 1, ngoi: 0, huong: dir, cuoi: 0.8, taiL: 0.6, taiR: 0.6 }, 0);
    const run = this._pace(far), at = this._di(t, 0, run.cycles, run.beat, { vao: false, quang: far * dir, x0: -far * dir, A: run.A, cao: run.lift });
    const shown = { get v() { return 0; }, set v(v) { s.mo = Math.min(1, v * at / 0.2); s.ngoi = 0; s.huong = dir; } };       // hiện, ĐỨNG và quay đúng hướng suốt quãng chạy — `set` ở trên không được ghi khi chạy trong `sequence()` (xem `enter` trong rig-svg.js): mèo từng trượt vào trong dáng ngồi
    t.to(shown, { v: 1, duration: at, ease: 'none' }, 0);
    this._khep(t, 0.4, at, { x: 0, ngoi: this.NGHI.ngoi, huong: dir });    // vào xong: về dáng nghỉ của giống, đầu vẫn quay về hướng vừa chạy
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
    return frame.left + frame.width / 2 + (this.s.x + this.dropX()) * scale;
  }

  /**
   * KHUNG NGẮM cho máy quay (`shot` trong index.js), đơn vị khung 400 × 330, ở trạng thái hiện tại.
   *   'face'  cận mặt        'chest' / 'full'  cả con vật
   */
  /**
   * CHỖ NGƯỜI NHẬN ĐẶT NÓ XUỐNG (đợt 30): phần dời thêm theo x (đơn vị khung) — người nhận con vật từ tay người khác
   * (`takePet`) đặt nó cạnh chân mình, không phải về chỗ nó được bế lần đầu. Lượng dời ghi ở `drops` (người nhận → số đơn vị),
   * bật bằng kênh `petDrop` của CHÍNH người nhận (0 → 1 lúc nhận): trạng thái người được dựng / trả về khung 0 cùng
   * timeline của họ — một kênh trên con vật thì tween của người nhận ghi nhầm giá trị đầu (con chó nhảy tới đó từ khung 0).
   */
  dropX() {
    let x = 0;
    if (this.drops) for (const [rig, amount] of this.drops) x += (rig.s.petDrop || 0) * amount;
    // đợt 49 A: người đưa nó vào / bế nó ra khỏi chuồng — mỗi lần dời là một ô của người ấy, bật theo kênh `cageMove49a` của chính họ.
    if (this.cagers49a) for (const rig of this.cagers49a) { const n = Math.round(rig.s.cageMove49a || 0); (rig.cageMoves49a || []).slice(0, n).forEach((move) => { if (move && move.pet === this) x += move.dx; }); }
    return x;
  }

  /** DÁNG ĐẦU lúc này (đợt 32): tâm đầu trong hệ của thân và góc nghiêng — mốc cho `follow`. */
  headPose() {
    const s = this._view(), { S, ng } = this._khung(), d = this.nv.dau;
    return { x: S.x + d.dx + (s.dauX || 0), y: S.y + d.dy + (s.dauY || 0) - ng * 2, turn: s.dau || 0 };
  }

  /**
   * ĐIỂM TRÊN ĐẦU, THEO ĐẦU (đợt 32): (x, y) trong khung của con vật, gắn vào đầu lúc nó ở dáng `from` (`headPose()`). Trả về
   * chỗ điểm ấy đang ở bây giờ — đầu đã dụi / gật / nghiêng, con vật đã ngồi xuống — để bàn tay vuốt bám theo từng khung.
   */
  follow(x, y, from = null) {
    const s = this._view(), k = s.huong < 0 ? -1 : 1, away = this.isCarried(), ref = from || this.headPose(), now = this.headPose();
    const ox = away ? 0 : s.x + this.dropX(), oy = away ? 0 : s.y;
    // về hệ của thân (bỏ phần dời, lật lại theo hướng), bỏ dáng cũ, đặt dáng mới, rồi trả về khung
    const turn = (now.turn - ref.turn) * Math.PI / 180, vx = 200 + (x - ox - 200) * k - ref.x, vy = y - oy - ref.y;
    const nx = now.x + vx * Math.cos(turn) - vy * Math.sin(turn), ny = now.y + vx * Math.sin(turn) + vy * Math.cos(turn);
    return { x: 200 + (nx - 200) * k + ox, y: ny + oy };
  }

  /**
   * ĐƯỜNG VIỀN CỦA ĐẦU (cả tai) trên HÌNH ĐANG VẼ, trong khung con vật (đợt 32): các điểm cách nhau ~1 đơn vị trên viền các hình
   * tô trong đầu (không tính dấu cảm xúc, hình đang ẩn, nét không tô). Bàn tay vuốt đặt mép dưới lên mép trên của chúng.
   */
  crownPoints() {
    const head = this.el && this.el.dau;
    if (!head) return [];
    // NÉT VIỀN tô ra ngoài hình nửa bề dày: mép trên thấy được cao hơn đường hình chừng ấy.
    return outlinePoints(this.svg, head, (el) => !!(this.markEl && this.markEl.contains(el))).map((q) => ({ x: q.x, y: q.y - q.edge }));
  }


  /**
   * MỨC ĐEO do người khác đang đeo cho con vật này (đợt 35): lớn nhất của `rig.s[key]` qua các rig người đã `bandage` /
   * `putCone` nó (`careBy`). Trạng thái ấy nằm ở NGƯỜI (chuỗi của người được lấy mẫu sẵn — `sequence`), con vật chỉ đọc lại.
   */
  careLevel(key) {
    let level = 0;
    for (const rig of this.careBy || []) level = Math.max(level, clamp(+(rig.s && rig.s[key]) || 0, 0, 1));
    return level;
  }

  /* ------------------------------------------------ ĐỢT 38 A — cắt móng, nhỏ mắt, vệ sinh tai, quét chip
   * Người làm GIỮ con vật bằng tay: chân trước được nhấc lên (`petPaw`), cằm được nâng (`petChin`), mắt nhắm lại sau giọt thuốc
   * (`petBlink`), lắc đầu sau khi lau tai (`petShake`, −1…1) là trạng thái của NGƯỜI (như `petWrap`) — con vật đọc lại mỗi lần vẽ
   * (`_careView`) từ những người trong `heldBy38` (rig người ghi vào). Nhờ thế chân / đầu nó chỉ động đúng lúc bàn tay người ở đó, gọi
   * thẳng hay qua `sequence()` đều như nhau. Tập riêng, không dùng `careBy`: người đã băng chân con khác thì `petWrap` của họ vẫn là 1.
   */
  static PAW_LIFT = 100;       // góc treo chân trước lúc được nhấc lên (độ; chìa ra trước, cao ngang vai — thấy rõ trên mép bàn)
  static CHIN_UP = 17;         // đầu ngửa lên bấy nhiêu độ khi được nâng cằm (nhỏ mắt)
  static SHAKE_TURN = 22;      // lắc đầu: biên độ xoay đầu (độ)

  // Trạng thái để VẼ cộng thêm phần người đang giữ con vật làm (đợt 38 A) — không có ai thì chính `s`.
  _careView(s) {
    if (!this.heldBy38 || !this.heldBy38.size) return s;
    let paw = 0, chin = 0, blink = 0, shake = 0;
    for (const rig of this.heldBy38) {
      const q = rig && rig.s;
      if (!q) continue;
      paw = Math.max(paw, clamp(+q.petPaw || 0, 0, 1)); chin = Math.max(chin, clamp(+q.petChin || 0, 0, 1)); blink = Math.max(blink, clamp(+q.petBlink || 0, 0, 1));
      if (Math.abs(+q.petShake || 0) > Math.abs(shake)) shake = clamp(+q.petShake || 0, -1, 1);
    }
    const f = this._bathFace();        // đợt 42 F: mặt / miệng theo việc tắm, đánh răng, lau khô
    const g = this._groomFace49b();    // đợt 49 B: tai rạp, mắt nheo trong gió máy sấy
    const x50a = this._exam50aView();  // đợt 50 A: nằm nghiêng cho siêu âm, giật mình khẽ khi bị sờ bụng
    if (!paw && !chin && !blink && !shake && !f && !g && !x50a) return s;
    const add = { dau: -RigThu.CHIN_UP * chin + RigThu.SHAKE_TURN * shake, dauY: -3 * chin, dauX: 4 * shake, taiL: 1.3 * shake, taiR: -1.3 * shake };
    return new Proxy(s, { get: (o, key) => {
      if (key === 'tnNhac') return pha(o.tnNhac, 1, paw);
      if (key === 'tnGoc') return pha(o.tnGoc, RigThu.PAW_LIFT, paw);
      const v = key === 'matY' ? Math.max(o.matY, blink) : key in add ? o[key] + add[key] : o[key];
      const w = f && key in f ? f[key](v) : v;          // đợt 42 F
      const w2 = g && key in g ? g[key](w) : w;             // đợt 49 B
      return x50a && key in x50a ? x50a[key](w2) : w2;      // đợt 50 A
    } });
  }

  // Điểm (x, y) trong hệ của phần tử `el` → khung 400 × 330 của con vật: nhân các phép biến đổi từ `el` lên SVG gốc (không qua màn
  // hình — bối cảnh 3D chiếu nghiêng) và KHÔNG gộp danh sách biến đổi (`consolidate` ghi đè thuộc tính; `apDung` còn đọc `translate` của mắt).
  _framePoint(el, x, y) {
    let m = new DOMMatrix();
    for (let node = el; node && node !== this.svg; node = node.parentNode) {
      const list = node.transform && node.transform.baseVal;
      if (!list) continue;
      let own = new DOMMatrix();
      for (let i = 0; i < list.numberOfItems; i++) { const q = list.getItem(i).matrix; own = own.multiply(new DOMMatrix([q.a, q.b, q.c, q.d, q.e, q.f])); }
      m = own.multiply(m);
    }
    const q = new DOMPoint(x, y).matrixTransform(m);
    return { x: q.x, y: q.y };
  }

  /**
   * CHỖ NGƯỜI CHĂM SÓC ĐẶT TAY / DỤNG CỤ (đợt 38 A), trong khung 400 × 330 của con vật, theo dáng ĐANG VẼ: 'paw' (giữa bàn chân trước
   * phía người xem), 'eye' (con mắt phía `side`: −1 trái, 1 phải màn hình), 'ear' (trong gốc tai phía `side`), 'chin' (dưới cằm),
   * 'crown' (đỉnh đầu), 'scruff' (gáy — sau cổ, trên vai), 'back' (giữa lưng).
   */
  carePoint(which, side = 1) {
    if (!this.el || !this.el.dau) return null;
    this.apDung();
    const e = this.el, nv = this.nv, r = nv.dau.r, pick = (a, b) => ((a.x - b.x) * side >= 0 ? a : b);
    if (which === 'paw') return this._framePoint(e.tnBan, 0, 0);
    if (which === 'eye') return pick(this._framePoint(e.matL, 0, 0), this._framePoint(e.matR, 0, 0));
    if (which === 'ear') { const [tx, ty] = nv.taiTam; return pick(this._framePoint(e.dau, -tx * 0.95, ty - 3), this._framePoint(e.dau, tx * 0.95, ty - 3)); }
    if (which === 'chin') return this._framePoint(e.dau, 0, r * 0.84);
    if (which === 'crown') return this._framePoint(e.dau, 0, -r * 0.8);
    if (which === 'scruff') return this._framePoint(e.nguc, -nv.dayThan * 0.35, -nv.dayThan * 0.92);
    if (which === 'back') { const ry = +e.thanE.getAttribute('ry') || nv.dayThan; return this._framePoint(e.thanE, 0, -ry * 0.95); }
    if (which === 'mouth42f') return this._framePoint(e.dau, side * 9.5 * nv.mom.co * 0.45, nv.mom.y + 2);      // đợt 42 F: miệng, lệch về phía `side` (đánh răng)
    if (which === 'belly50a' || which === 'flank50a') return this._examPoint50a(which);      // đợt 50 A: bụng / sườn (sờ nắn, đầu dò siêu âm)
    if (which === 'rump49b') return this._framePoint(e.mong, nv.dayThan * 0.15, -(nv.dayThan + 1) * 0.9);      // đợt 49 B: mông (cuối đường tỉa lông)
    throw new Error(`[character] carePoint: unknown spot ${JSON.stringify(which)} (paw, eye, ear, chin, crown, scruff, back)`);
  }

  /** Số đo cho tools/acting_check.py (đợt 38 A, `set.careProbe`): các phần tử và mức đang vẽ. */
  care38Probe() {
    const e = this.el, v = this._careView(this.s), level = (key) => Math.max(0, ...[...(this.heldBy38 || [])].map((rig) => clamp(+(rig.s && rig.s[key]) || 0, 0, 1)));
    return { eyes: [e.matL, e.matR], paw: e.tnBan, head: e.dau, blink: +clamp(v.matY, 0, 1).toFixed(3), lift: +level('petPaw').toFixed(3), chin: +level('petChin').toFixed(3),
             shake: +(v.dau - this.s.dau + RigThu.CHIN_UP * level('petChin')).toFixed(2) };
  }

  /* ------------------------------------------------ ĐỢT 42 F — tắm, đánh răng, lau khô (người làm — rig-svg.js `bathPet`, `brushTeeth`, `towelDry`)
   * Như đợt 38 A: những gì bàn tay người làm lên con vật là kênh của NGƯỜI (`petWet42f` lông ướt, `petFoam42f` bọt trên lưng, `petDry42f`
   * lông khô bông lên, `petTowel42f` / `petRub42f` khăn quấn và chà, `petMood42f` −1 khó chịu … 1 vui, `petGape42f` miệng hé ra cho đánh răng,
   * `petLick42f` liếm mép) — con vật đọc lại khi vẽ từ những người trong `heldBy38`. Ướt và khô GIỮ sau động tác (người giữ kênh ấy).
   * CHẬU TẮM là đạo cụ (`createProp(host, 'tub')`, vẽ sau con vật): `inTub42f(rim)` cắt hình con vật dưới vành chậu — vành trước che chân.
   */
  static WET_DARK42F = 0.3;           // lông ướt tối đi chừng ấy (nhân màu)
  static FOAM_N42F = 18;              // số bong bóng bọt trên lưng
  static SHAKE_DUR42F = 1.0;          // giây một lần rũ nước (`petShake42f` của người đi 0 → 1 trong chừng ấy)

  // Mức của một kênh người qua những người đang làm (lớn nhất).
  _bathLevel(key) {
    let v = 0;
    for (const rig of this.heldBy38 || []) v = Math.max(v, clamp(+(rig && rig.s && rig.s[key]) || 0, 0, 1));
    return v;
  }

  // Mức tâm trạng (−1 khó chịu … 1 vui) và các mức khác, gộp từ người làm.
  _bathLevels() {
    if (!this.heldBy38 || !this.heldBy38.size) return null;
    let sad = 0, happy = 0, rub = 0, towelAt = 0;
    for (const rig of this.heldBy38) {
      const q = rig && rig.s;
      if (!q) continue;
      const m = clamp(+q.petMood42f || 0, -1, 1);
      sad = Math.max(sad, -m); happy = Math.max(happy, m);
      if ((+q.petTowel42f || 0) > towelAt) { towelAt = +q.petTowel42f; rub = clamp(+q.petRub42f || 0, -1, 1); }
    }
    const dry = this._bathLevel('petDry42f');
    return { sad, happy, rub, dry, wet: this._bathLevel('petWet42f') * (1 - dry), foam: this._bathLevel('petFoam42f'), towel: this._bathLevel('petTowel42f'),
             gape: this._bathLevel('petGape42f'), lick: this._bathLevel('petLick42f'), shake: this._bathLevel('petShake42f') };
  }

  // Phần cộng vào nét mặt (dùng trong `_careView`): tai cụp ra sau, miệng méo khi bị tắm; tai dựng, cười khi được lau khô; miệng hé khi
  // đánh răng; lưỡi thè liếm mép. Không có gì thì null.
  _bathFace() {
    const L = this._bathLevels();
    if (!L || !(L.sad || L.happy || L.gape || L.lick || L.shake)) return null;
    const { sad, happy, gape, lick, shake } = L;
    // RŨ NƯỚC (`petShake42f`: pha 0…1 trong RigThu.SHAKE_DUR42F giây, như `shakeOff`): cả người lắc từ đầu tới đuôi, nhỏ dần, mắt nhắm, giọt nước văng ra.
    const on = shake > 0.001 && shake < 0.999, tau = shake * RigThu.SHAKE_DUR42F, w = on ? Math.sin(Math.PI * tau / 0.07) * Math.max(0, 1 - tau / 1.0) : 0;
    const drops = on ? clamp((tau - 0.15) / 0.75, 0, 1) : 0;
    return { taiL: (v) => v - 1.7 * sad + 0.5 * happy + 1.6 * w, taiR: (v) => v - 1.7 * sad + 0.5 * happy - 1.6 * w, cuoi: (v) => v - 1.0 * sad + 0.55 * happy,
             matY: (v) => Math.max(v, 0.28 * sad, on ? 0.85 : 0), lanh: (v) => Math.max(v, 0.7 * sad), duoi: (v) => v - 22 * sad + 10 * happy + 35 * w,
             gape: (v) => Math.max(v, gape), mieng: (v) => Math.max(v, gape * 0.55, lick * 0.4), luoi: (v) => Math.max(v, lick * 0.75),
             dau: (v) => v + 18 * w, dauX: (v) => v + 5 * w, truocX: (v) => v + 4 * w, sauX: (v) => v - 3 * w, nuoc: (v) => (drops > 0.02 && drops < 0.98 ? Math.max(v, drops) : v) };
  }

  /** CHẬU TẮM VỪA CON VẬT NÀY (đợt 42 F): `{ rim, length }` đơn vị khung của nó — vành cao `rim` trên sàn (che chân và phần dưới bụng), dài `length`
   * (đủ chứa thân). Dựng chậu cùng ĐƠN VỊ với con vật: host chậu cao bằng host con vật × 470 / 330 (tools/scene.py tự làm). */
  tubFit42f() {
    const nv = this.nv, low = Math.max(nv.H0.y, nv.S0.y);
    return { rim: +clamp(DAT - (low + nv.dayThan * 0.25), 26, 70).toFixed(1), length: Math.round((nv.S0.x - nv.H0.x) + nv.dayThan * 2 + 70) };
  }

  /** ĐỨNG TRONG CHẬU TẮM (đợt 42 F): cắt hình con vật dưới đường `rim` đơn vị khung trên sàn của nó — đặt nó trước một đạo cụ `tub` cùng chỗ
   * (vành trước của chậu lộ ra, chân ở trong chậu). `null`: ra khỏi chậu. */
  inTub42f(rim = null) {
    if (rim !== null && !(Number.isFinite(rim) && rim > 0 && rim < DAT)) throw new Error(`[character] inTub42f: rim must be the height of the tub rim in frame units (> 0), or null — got ${JSON.stringify(rim)}`);
    this.tubRim42f = rim;
    if (rim !== null && this.s.ngoi) this.s.ngoi = 0;          // ĐỨNG trong chậu (mèo nghỉ ở dáng ngồi): lưng lộ trên vành cho người tắm
    this.apDung();
    return this;
  }

  // Vẽ phần đợt 42 F. `s`: trạng thái đang vẽ; `H`, `S`: hông, vai của khung vừa tính.
  _veBath(s, H, S) {
    const e = this.el, nv = this.nv, f = (v) => v.toFixed(2), L = this._bathLevels() || { wet: 0, dry: 0, foam: 0, towel: 0, rub: 0 };
    // Chậu tắm: cắt dưới vành (khung của `goc`).
    if (e.tubClip42f) {
      const on = Number.isFinite(this.tubRim42f) && this.tubRim42f > 0;
      if (on) { e.tubClip42f.setAttribute('height', f(3000 + DAT - this.tubRim42f)); if (e.goc.getAttribute('clip-path') !== `url(#${this.id}-tub42f)`) e.goc.setAttribute('clip-path', `url(#${this.id}-tub42f)`); }
      else if (e.goc.hasAttribute('clip-path')) e.goc.removeAttribute('clip-path');
    }
    const mx = (H.x + S.x) / 2, my = (H.y + S.y) / 2, goc = Math.atan2(S.y - H.y, S.x - H.x) / RAD, nua = Math.hypot(S.x - H.x, S.y - H.y) / 2, day = nv.dayThan * (1 + (s.tho || 0) * 0.035);
    const xoay = `translate(${f(mx)} ${f(my)}) rotate(${f(goc)})`;
    // ƯỚT: màu tối đi (ma trận màu trên bộ lọc viền — cả thân, chân, đầu), thân xẹp, đuôi mảnh, lông bết từng vệt.
    const wet = clamp(L.wet, 0, 1), dry = clamp(L.dry, 0, 1);
    const filter = this.svg.querySelector('#' + this.id + '-vien'), merge = filter && filter.querySelector('feMerge');
    if (merge) {
      let cm = filter.querySelector('feColorMatrix');
      if (wet > 0.01 && !cm) {
        cm = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
        cm.setAttribute('in', 'SourceGraphic'); cm.setAttribute('type', 'matrix'); cm.setAttribute('result', 'wet42f'); cm.setAttribute('color-interpolation-filters', 'sRGB');
        filter.insertBefore(cm, merge);
      }
      const src = merge.lastElementChild;
      if (cm && wet > 0.01) {
        const k = 1 - RigThu.WET_DARK42F * wet, b = 0.05 * wet;      // tối đi, ngả lạnh một chút
        cm.setAttribute('values', `${f(k)} 0 0 0 0 0 ${f(k)} 0 0 ${f(b * 0.2)} 0 0 ${f(k)} 0 ${f(b)} 0 0 0 1 0`);
        if (src.getAttribute('in') !== 'wet42f') src.setAttribute('in', 'wet42f');
      } else if (src.getAttribute('in') !== 'SourceGraphic') src.setAttribute('in', 'SourceGraphic');
    }
    if (wet > 0.01 || dry > 0.01) {
      e.thanE.setAttribute('ry', f(day * (1 - 0.12 * wet + 0.08 * dry)));
      e.duoi.setAttribute('stroke-width', f(+e.duoi.getAttribute('stroke-width') * (1 - 0.45 * wet + 0.4 * dry)));
    }
    if (e.wetG42f) {
      e.wetG42f.style.display = wet > 0.03 ? '' : 'none';
      if (wet > 0.03) {
        e.wetG42f.setAttribute('opacity', f(Math.min(1, wet * 1.2)));
        // vệt lông bết: những nét cong ngắn chúc xuống từ lưng, dọc thân (khung xoay theo thân)
        [...e.wetG42f.children].forEach((path, i) => {
          const x = -nua * 0.95 + (i + 0.5) * (nua * 1.9 / 7), top = -day * (0.82 - 0.12 * Math.abs(Math.sin(i * 1.9))), len = day * (0.55 + 0.25 * Math.abs(Math.sin(i * 2.7)));
          path.setAttribute('d', `M ${f(x)} ${f(top)} q ${f(2.5 + (i % 2) * 1.5)} ${f(len * 0.5)} ${f(-1)} ${f(len)}`);
          path.setAttribute('transform', xoay);
        });
      }
    }
    // LÔNG BÔNG (lau khô xong): một vòng viền gợn sóng quanh cả thân, to hơn thân — viền ngoài của con vật phồng ra.
    if (e.fluff42f) {
      e.fluff42f.style.display = dry > 0.03 ? '' : 'none';
      if (dry > 0.03) {
        const rx = nua + nv.dayThan * 0.55 + 2 + 5 * dry, ry = day + 2 + 6 * dry, N = 26, pts = [];
        for (let i = 0; i < N * 2; i++) {
          const a = (i / (N * 2)) * Math.PI * 2, k = i % 2 ? 1 + 0.07 * dry : 1;
          pts.push(`${f(Math.cos(a) * rx * k)} ${f(Math.sin(a) * ry * k)}`);
        }
        e.fluff42f.setAttribute('d', 'M ' + pts.join(' L ') + ' Z');
        e.fluff42f.setAttribute('transform', xoay);
      }
    }
    // BỌT trên lưng: bong bóng hiện dần (thứ tự xáo), dọc sống lưng, hai lớp.
    if (e.foam42f) {
      const v = clamp(L.foam, 0, 1);
      e.foam42f.style.display = v > 0.02 ? '' : 'none';
      if (v > 0.02) {
        const dx = S.x - H.x, dy = S.y - H.y, len = Math.hypot(dx, dy) || 1, tx = dx / len, ty = dy / len, nx = ty, ny = -tx, n = RigThu.FOAM_N42F;
        const A = { x: H.x - tx * day * 0.55, y: H.y - ty * day * 0.55 }, B = { x: S.x + tx * day * 0.2, y: S.y + ty * day * 0.2 };
        [...e.foam42f.children].forEach((c, i) => {
          const order = (i * 7) % n, shown = clamp((v * 1.15 - order / n) * 4, 0, 1);
          const row = i % 3 === 2 ? 1 : 0, u = row ? (i / n) * 0.8 + 0.1 : (i / n), h = day * (0.72 + 0.3 * row) + 2.5 * Math.sin(i * 2.1);
          const r = (5.6 + 3.6 * Math.abs(Math.sin(i * 1.7))) * (row ? 0.8 : 1) * shown;
          c.style.display = r > 0.3 ? '' : 'none';
          c.setAttribute('cx', f(pha(A.x, B.x, u) + nx * h)); c.setAttribute('cy', f(pha(A.y, B.y, u) + ny * h)); c.setAttribute('r', f(Math.max(0.01, r)));
        });
      }
    }
    // KHĂN quấn quanh thân: mép trên ôm lưng, mép dưới rủ dưới bụng thành nếp; chà (`rub`) thì khăn xô dọc thân, nếp dời theo.
    if (e.towel42f) {
      const v = clamp(L.towel, 0, 1.2);
      e.towel42f.style.display = v > 0.02 ? '' : 'none';
      if (v > 0.02) {
        const dx = S.x - H.x, dy = S.y - H.y, len = Math.hypot(dx, dy) || 1, tx = dx / len, ty = dy / len, nx = ty, ny = -tx, sh = (L.rub || 0) * 5;
        const at = (u, h) => ({ x: pha(H.x - tx * day * 0.85, S.x + tx * day * 0.55, u) + tx * sh + nx * h, y: pha(H.y - ty * day * 0.85, S.y + ty * day * 0.55, u) + ty * sh + ny * h });
        const top = [], bottom = [];
        for (let i = 0; i <= 8; i++) { const u = i / 8; top.push(at(u, day * (1.12 + 0.08 * Math.sin(u * Math.PI)))); bottom.push(at(u, -day * (1.25 + 0.12 * Math.sin(i * 1.9 + sh)))); }
        const p = (q) => `${f(q.x)} ${f(q.y)}`;
        e.towel42f.querySelector('[data-cloth]').setAttribute('d', `M ${p(top[0])} ` + top.slice(1).map((q) => `L ${p(q)}`).join(' ') + ` Q ${p(at(1.08, 0))} ${p(bottom[8])} ` + bottom.slice(0, 8).reverse().map((q) => `L ${p(q)}`).join(' ') + ` Q ${p(at(-0.08, 0))} ${p(top[0])} Z`);
        e.towel42f.querySelector('[data-folds]').setAttribute('d', [0.3, 0.55, 0.78].map((u) => `M ${p(at(u + sh * 0.012, day * 0.7))} Q ${p(at(u + 0.04, -day * 0.1))} ${p(at(u - 0.02 + sh * 0.01, -day * 1.1))}`).join(' '));
        e.towel42f.querySelector('[data-stripes]').setAttribute('d', [0.1, 0.9].map((u) => `M ${p(at(u, day * 1.05))} L ${p(at(u, -day * 1.2))}`).join(' '));
        // Đang mở ra / gấp lại: co về phía lưng.
        const c = at(0.5, day * 1.1), k = 0.45 + 0.55 * Math.min(1, v);
        e.towel42f.setAttribute('transform', k < 0.999 ? `translate(${f(c.x)} ${f(c.y)}) scale(${f(k)}) translate(${f(-c.x)} ${f(-c.y)})` : '');
        e.towel42f.setAttribute('opacity', f(Math.min(1, v * 2)));
      }
    }
  }

  /** Số đo cho tools/acting_check.py (đợt 42 F, `set.careProbe` → `c42`): bọt, khăn, lông bông (phần tử đang hiện), các mức, độ há, đường vành chậu (px màn hình). */
  care42fProbe() {
    const e = this.el, L = this._bathLevels() || { wet: 0, dry: 0, foam: 0, towel: 0, rub: 0, sad: 0, happy: 0, gape: 0, lick: 0 }, on = (el) => (el && el.style.display !== 'none' ? el : null);
    let rim = null;
    if (Number.isFinite(this.tubRim42f) && e.goc.getScreenCTM()) { const q = new DOMPoint(200, DAT - this.tubRim42f).matrixTransform(e.goc.getScreenCTM()); rim = { x: q.x, y: q.y, px: true }; }
    const r3 = (v) => +(+v || 0).toFixed(3), v = this._careView(this.s);
    return { foam: on(e.foam42f), towel: on(e.towel42f), fluff: on(e.fluff42f), body: e.thanE, head: e.dau, mouth: e.moi, rim,
             wet: r3(L.wet), dry: r3(L.dry), foamLevel: r3(L.foam), towelLevel: r3(L.towel), rub: r3(L.rub), mood: r3((L.happy || 0) - (L.sad || 0)),
             gape: r3(Math.max(+v.gape || 0, 0)), lick: r3(L.lick), nuoc: r3(v.nuoc), ears: r3(v.taiL) };
  }

  /**
   * GIỮA ỐNG CHÂN TRƯỚC phía người xem (chỗ quấn băng), trong khung 400 × 330 của con vật: { x, y } — ghép phép biến đổi
   * từ nhóm chân lên SVG gốc, không qua màn hình (bối cảnh 3D chiếu nghiêng). `k`: 0 = khuỷu, 1 = bàn chân.
   */
  legPoint(k = 0.5) {
    if (!this._legNear) this.apDung();
    const { J, ban } = this._legNear, x = pha(J.x, ban.x, k), y = pha(J.y, ban.y, k);
    let m = new DOMMatrix();
    for (let node = this.el.tn; node && node !== this.svg; node = node.parentNode) {
      const list = node.transform && node.transform.baseVal, one = list && list.numberOfItems ? list.consolidate() : null;
      if (one) m = new DOMMatrix([one.matrix.a, one.matrix.b, one.matrix.c, one.matrix.d, one.matrix.e, one.matrix.f]).multiply(m);
    }
    const q = new DOMPoint(x, y).matrixTransform(m);
    return { x: q.x, y: q.y };
  }

  /** Đang được bế: hình nằm trong tay một người khác (không trong host của nó). */
  isCarried() { return !!(this.host && this.svg && this.svg.parentNode && this.svg.parentNode !== this.host && this.svg.ownerSVGElement); }

  shotBox(kind = 'full') {
    const { S } = this._khung(), d = this.nv.dau, k = this.s.huong < 0 ? -1 : 1;
    const s = this.isCarried() ? { ...this.s, x: 0, y: 0 } : { ...this.s, x: this.s.x + this.dropX() };      // đang được bế: không có phần dời (xem apDung)
    const headX = 200 + (S.x + d.dx - 200) * k + s.x, headY = S.y + d.dy + s.y;
    if (kind === 'face') return { x: headX - 66, y: headY - 64, width: 132, height: 132 };
    if (kind !== 'chest' && kind !== 'full') throw new Error(`[character] no shot "${kind}" (available: face, chest, full)`);
    const top = headY - 72, bottom = DAT + 10;
    return { x: 200 + s.x - 125, y: top, width: 250, height: bottom - top };
  }

}
for (const install of [poses, play, basic, species, tricks, mood, grooming]) install(RigThu);
leash49c(RigThu);       // đợt 49 C
exam50a(RigThu);        // đợt 50 A
RigThu.STANCE.push('lieOnSide'); RigThu.TEN_DONG_TAC.lieOnSide = 'Nằm nghiêng';      // đợt 50 A: thế giữ của cả ba loài (`standUp` để dậy)
