// runtime/person/treatment.js — clinical procedures on a held pet: bandage, temperature, pill, nails, eye drops, ears, chip, cone, restrain, gloves, chart, x-ray.
// Methods of `RigSVG`, installed by runtime/rig-svg.js: `this` is the rig, `RigSVG` its class.

import { KHUNG, DOI_Y, HONG, DAI, LOOK_DOWN, BANDAGE_LOOP, CONE_GRIP, CHART_POSE, CHART_FRONT, CHART_NOD_PITCH, CHART_FLIP_ZOOM, CHART_TILT, CHART_DOWN, CHART_NOD, XRAY_TURN, XRAY_LISTEN, XRAY_FACE_HOLD, WASH_POSE, GLOVE_POSE, clamp, chuanHoaGoc, mix } from './shared.js';

export default (RigSVG) => mix(RigSVG, class {
  /**
   * BĂNG CHÂN: khuỵu gối cúi xuống ngang chân con vật (con vật dưới sàn thì quỳ — `kneel` trước), HAI tay tới ống chân trước
   * phía người xem của `target` — một tay giữ chân phía trên, tay kia cầm cuộn băng quấn `wraps` vòng quanh nó; băng dài dần từ
   * khuỷu xuống bàn chân theo từng vòng —, vỗ nhẹ lên chỗ băng, cười. Băng CÒN LẠI trên chân con vật (như `wear('bandage')`).
   * `target`: rig thú, hay `set.target(person, pet, 'leg')` trong bối cảnh 3D.
   */
  bandage(target = null, wraps = 3) {
    const pet = this._petOf(target);
    if (target && typeof target === 'object' && (target.el || target.rig) && !pet) throw new Error('[character] bandage(pet): the target must be a pet rig (createPet(...).rig)');
    if (!(Number.isFinite(wraps) && wraps >= 1)) throw new Error(`[character] bandage: wraps must be a number ≥ 1, got ${JSON.stringify(wraps)}`);
    this._careFor(pet, 'petWrap', 'bandage');
    const t = this.tl(), s = this.s, N = this.NGHI, { reach, keep } = this._careHand(t, target, 'leg'), { k, tx, ty } = reach;
    const o = k === 'L' ? 'R' : 'L', side = tx >= HONG.x ? 1 : -1, arm = this._stoopFor(t, reach, 0.4);
    // ĐỢT 36: QUAY GẦN NGHIÊNG HẲN về con vật (`BANDAGE_TURN`, như `givePill`) — hai vai dồn về một chỗ, HAI TAY cùng vươn ra trước tới
    // ống chân. Đứng 3/4 thì tay phía xa phải vắt ngang ngực mới tới chân (Gemini, đợt 35: "một tay tới, tay kia gập ngang ngực").
    // Góc tay tính ở hướng ấy (vai thật khi đã quay); trả hướng cũ trước khi `return`.
    const facing = s.huong, turn = clamp(facing + side * RigSVG.BANDAGE_TURN, -1, 1);
    t.to(s, { huong: turn, duration: 0.45, ease: 'sine.inOut' }, 0);
    s.huong = turn;
    // Tay kia GIỮ cổ chân ngay dưới chỗ quấn — trên mặt bàn, không thấp hơn (lượt ba: tay khuất sau mép bàn); tay cầm cuộn băng quấn vòng elip quanh ống chân, trượt dần xuống theo băng.
    const holdLeg = arm(o, tx - side * 2, ty + 7), R = BANDAGE_LOOP, loop = 0.55, start = 0.55, n = Math.round(wraps);
    const wrapAt = (w, q) => { const a = -Math.PI / 2 + q * Math.PI / 2; return arm(k, tx + Math.cos(a) * R, ty + 2 + ((w + q / 4) / n) * 9 - 3 + Math.sin(a) * R * 0.75); };
    const first = wrapAt(0, 0);
    t.set(s, { ['tay' + k]: 'nam', ['tay' + o]: 'nam' }, 0.02);
    t.to(s, { ['bat' + k]: first.bat, ['cang' + k]: first.cang, ['bat' + o]: holdLeg.bat, ['cang' + o]: holdLeg.cang, than: N.than - side * 3, dau: N.dau + side * 4,
              dauY: 11, nhinY: 3, nhinX: side * 1.4, matY: 0.25, cuoi: 0.5, chum: 0.25, mayL: 0.2, mayR: 0.2, duration: 0.5, ease: 'power2.out' }, 0);
    t.set(s, { ['gadget' + k]: 8 }, 0.15);
    this._lookTo(t, { x: tx, y: ty }, 0.05, { d: 0.45 });          // đợt 36: đầu cúi / quay về chỗ quấn
    // Lượt ba: người vẽ TRƯỚC con chó (như các động tác khám) — con chó lên trước người thì hai cánh tay "lồng ra sau con chó và mép
    // bàn" (Gemini, 00:16). Đứng ở phía đầu con vật (scene.py) để cánh tay không vắt qua thân nó.
    for (let w = 0; w < n; w++) for (let q = 1; q <= 4; q++) {
      const p = wrapAt(w, q);
      t.to(s, { ['bat' + k]: p.bat, ['cang' + k]: p.cang, duration: loop / 4, ease: 'sine.inOut' }, start + w * loop + (q - 1) * loop / 4);
    }
    // Tay giữ siết nhẹ theo nhịp quấn — vẫn ở trên chân.
    t.to(s, { ['cang' + o]: holdLeg.cang + side * 3, duration: loop / 2, ease: 'sine.inOut', yoyo: true, repeat: n * 2 - 1 }, start);
    t.to(s, { petWrap: 1, duration: n * loop, ease: 'none' }, start);
    // Xong: cất cuộn băng, vỗ nhẹ hai cái lên chỗ băng, ngẩng lên cười.
    const done = start + n * loop, pat = arm(k, tx, ty + 3), patUp = arm(k, tx, ty - 3);
    t.set(s, { ['gadget' + k]: 0, ['tay' + k]: 'mo' }, done);
    t.to(s, { ['bat' + k]: patUp.bat, ['cang' + k]: patUp.cang, duration: 0.14, ease: 'sine.out' }, done)
     .to(s, { ['bat' + k]: pat.bat, ['cang' + k]: pat.cang, duration: 0.14, ease: 'sine.in' }, done + 0.14)
     .to(s, { ['bat' + k]: patUp.bat, ['cang' + k]: patUp.cang, duration: 0.14, ease: 'sine.out' }, done + 0.28)
     .to(s, { ['bat' + k]: pat.bat, ['cang' + k]: pat.cang, duration: 0.14, ease: 'sine.in' }, done + 0.42);
    t.to(s, { cuoi: 1, chum: 0, mayL: 0.55, mayR: 0.55, matY: 0, dauY: 6, duration: 0.25 }, done + 0.1);
    s.huong = facing;
    this._khep(t, 0.5, done + 0.62, { ...keep, ...(pet ? { petWrap: 1 } : {}) });
    return t;
  }

  /**
   * ĐO NHIỆT ĐỘ: cúi xuống, đưa đầu nhiệt kế điện tử (hiện ra trong tay) tới THÂN SAU con vật `target`, giữ `hold` giây (mặt
   * tập trung, mắt nhìn xuống), rút ra, giơ nhiệt kế lên trước ngực cúi nhìn ô số — một màn hình số lớn bật lên trên nhiệt
   * kế với `reading` (mặc định '38.5°C') —, gật. Con vật trong tầm tay, như `listen`.
   */
  takeTemp(target = null, hold = 1.5, { reading = '38.5°C' } = {}) {
    if (typeof reading !== 'string') throw new Error(`[character] takeTemp: reading must be a string such as '38.5°C', got ${JSON.stringify(reading)}`);
    if (!(typeof hold === 'number' && hold > 0)) throw new Error(`[character] takeTemp: hold must be a number of seconds > 0, got ${JSON.stringify(hold)}`);
    const t = this.tl(), s = this.s, N = this.NGHI, reach = this._reachLow(target, null, 'rear'), m = reach.k === 'L' ? -1 : 1, k = reach.k;
    // ĐẦU ĐO (không phải cổ tay) chạm thân sau (lượt bốn): đầu nhiệt kế ở ~34 đơn vị khung theo hướng bàn tay — giải lặp cổ tay lùi về
    // theo hướng cẳng tay (`solve` trả `dir`). Đặt cổ tay ở đích thì đầu đo chọc quá, hay (tay duỗi hết) lơ lửng sau đuôi con mèo.
    let tipPose = reach.solve(reach.tx, reach.ty);
    for (let n = 0; n < 5; n++) { const a = tipPose.dir * Math.PI / 180; tipPose = reach.solve(reach.tx - Math.cos(a) * RigSVG.TEMP_TIP, reach.ty - Math.sin(a) * RigSVG.TEMP_TIP); }
    const upper = tipPose.upper, fore = tipPose.fore;
    this._leanTo(t, { ...reach, upper, fore }, 'nam');
    t.set(s, { ['gadget' + k]: 6 }, 0.1);
    // Ấn đầu đo vào (bàn tay áp vào thân — đo: ấn ±2° / 3° thì bàn tay chỉ 4 % sát con vật ở cảnh CI), rồi đứng yên chờ: đầu
    // nghiêng, mắt nhìn chỗ đo, môi mím.
    t.to(s, { ['bat' + k]: upper + 2, ['cang' + k]: fore - 3, duration: 0.2, ease: 'sine.out' }, 0.45);
    // Đợt 36: QUAY / CÚI ĐẦU về chỗ đo (`lookAt`), không chỉ liếc mắt.
    this._lookTo(t, { x: reach.tx, y: reach.ty }, 0.5);
    t.to(s, { dau: N.dau + m * 5 + reach.lean * 0.8, dauY: 9, nhinY: 2.6, mayL: 0.25, mayR: 0.25, cuoi: 0.35, chum: 0.25, duration: 0.35, ease: 'sine.inOut' }, 0.5);
    // Rút ra, đứng thẳng, giơ nhiệt kế lên đọc (kênh `ov`: góc cuối cùng trên màn hình, đè lên dáng cúi).
    const up = 0.6 + hold;
    // NHIỆT KẾ NGANG MẮT, LỆCH HẲN SANG BÊN (lượt bốn — lượt ba giơ sát cằm, nhìn như ngậm nhiệt kế): tâm nhiệt kế cao ngang mắt, cách tâm
    // mặt `TEMP_SIDE` bề ngang đầu về phía con vật. Đo mắt và đầu trên hình lúc dựng (hệ gốc SVG), tâm nhiệt kế ở ~17 đơn vị khung
    // trên cổ tay × `handZoom` (cẳng tay dựng) — giải hai đốt tay tới cổ tay ấy, khi người đã quay `TEMP_TURN`.
    const facingTo = clamp(s.huong + m * RigSVG.TEMP_TURN, -1, 1);
    const box = (el) => { const b = el.getBBox(), q = this.svg.getScreenCTM().inverse().multiply(el.getScreenCTM()); const a = new DOMPoint(b.x, b.y).matrixTransform(q), c = new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(q); return { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2, w: Math.abs(c.x - a.x), h: Math.abs(c.y - a.y) }; };
    let readPose = RigSVG.TEMP_POSE, toolAt = null;
    try {
      const head = box(this.el.dau), eyes = [box(this.el.matL), box(this.el.matR)], eyeY = (eyes[0].y + eyes[1].y) / 2;
      // Ngoài tầm tay (người thấp, tay ngắn: tay duỗi thẳng thì nhiệt kế tụt dưới tầm mắt) — thu độ lệch dần, không dưới 0,55 bề ngang đầu.
      for (let side = RigSVG.TEMP_SIDE; side >= 0.55 - 1e-6; side -= 0.05) {
        const tx = head.x + m * side * head.w, ty = eyeY - 0.06 * head.h + 17 * RigSVG.TEMP_ZOOM;      // cổ tay (hệ gốc); mô hình đặt nhiệt kế thấp hơn hình vẽ ~12 % đầu — bù 6 %
        const pose = this._armToTurned(k, tx - s.x, ty - (s.y || 0) - DOI_Y, facingTo, 0);
        if (Number.isFinite(pose.bat) && Number.isFinite(pose.cang)) { readPose = [pose.bat, pose.cang]; toolAt = { x: tx - s.x, y: ty - 17 * RigSVG.TEMP_ZOOM - (s.y || 0) - DOI_Y }; }
        if (!(pose.short > 0)) break;
      }
    } catch (error) { /* chưa vẽ: dáng mặc định */ }
    t.to(s, { ['ovBat' + k]: readPose[0], ['ovCang' + k]: readPose[1], duration: 0.02 }, up);
    // ĐỌC: QUAY người / mặt 3/4 về phía nhiệt kế (`TEMP_TURN`), CÚI và nghiêng đầu sang nó, con ngươi dồn hẳn sang bên và xuống;
    // nhiệt kế giơ sát mặt, phóng 1,7×; giữ `TEMP_READ` giây. Đợt 35 lượt hai chỉ liếc mắt — ở góc trung hai người mặt chỉ ~1/6 khung,
    // không đọc ra là đang nhìn nhiệt kế (Gemini, lượt ba).
    const R = RigSVG.TEMP_READ, facing = clamp(s.huong + m * RigSVG.TEMP_TURN, -1, 1);
    // Đợt 36: ĐẦU QUAY HẲN về nhiệt kế (`lookAt`: ~3/4 về phía nó) — đợt 35 chỉ quay người 0,3 và liếc mắt, Gemini vẫn thấy "nhìn ra
    // máy quay". Tween này trước tween đọc bên dưới: mắt, đầu nghiêng, hạ đầu của dáng đọc vẫn như cũ.
    const face = this._faceCentre(facing);
    this._lookTo(t, toolAt || { x: face.x + m * face.r * 1.3, y: face.y }, up, { d: 0.45, huong: facing });
    t.to(s, { ['ov' + k]: 1, ['handZoom' + k]: RigSVG.TEMP_ZOOM, huong: facing, seat: reach.crouch ? N.seat : s.seat, than: N.than - m * 4, dau: N.dau + m * 3, dauY: 4, nhinX: m * 4.2, nhinY: 0.4, matY: 0.15,
              cuoi: 0.5, chum: 0, mayL: 0.55, mayR: 0.55, duration: 0.45, ease: 'power2.inOut' }, up);
    t.to(s, { readoutN: this._reading({ text: reading, side: k }), duration: 0.02 }, up + 0.3);
    t.to(s, { readout: 1, duration: 0.35, ease: 'back.out(1.8)' }, up + 0.32);
    t.to(s, { dauY: 13, cuoi: 0.95, duration: 0.18, ease: 'sine.out', yoyo: true, repeat: 1 }, up + 0.45 + R * 0.75);
    t.to(s, { readout: 0, duration: 0.25, ease: 'power2.in' }, up + 0.45 + R);
    this._khep(t, 0.45, up + 0.65 + R);
    return t;
  }

  // Góc hai đốt tay `k` (góc TRÊN MÀN HÌNH, kênh `aim`) để cổ tay tới (x, y) — hệ của `_reachLow` —, vai ở chỗ của nó khi người
  // quay `huong` và hạ `drop`. Khuỷu chúc xuống; xa quá tầm thì duỗi thẳng về phía ấy. Như `_meetAngles`, không kẹp bắp tay về
  // phía trong: tay phía xa VẮT NGANG trước ngực (cho uống thuốc).
  _armToTurned(k, x, y, huong, drop = 0) {
    const was = this.s.huong;
    this.s.huong = huong;
    const sx = this._shoulderX(k), sy = this._shoulderY() + drop;
    this.s.huong = was;
    const upper = DAI.canhTay * this.nv.daiCanhTay, fore = DAI.cangTay * this.nv.daiCangTay;
    const dx = x - sx, dy = y - sy, d = Math.max(1, Math.hypot(dx, dy)), phi = Math.atan2(dy, dx) * 180 / Math.PI, toward = k === 'L' ? phi - 90 : 90 - phi;
    if (d >= (upper + fore) * 0.98) return { bat: chuanHoaGoc(toward), cang: 4, short: d - (upper + fore) };
    const alpha = Math.acos(clamp((upper * upper + d * d - fore * fore) / (2 * upper * d), -1, 1)) * 180 / Math.PI;
    const beta = Math.acos(clamp((upper * upper + fore * fore - d * d) / (2 * upper * fore), -1, 1)) * 180 / Math.PI;
    // Đích PHÍA TRONG (tay vắt ngang thân, `toward` < 0): khuỷu chúc xuống là bắp tay xoay VỀ phía thõng (+α) và cẳng tay gập
    // ngược chiều — dùng công thức của đích phía ngoài thì khuỷu hếch lên ngang ngực, bàn tay chĩa ngược ra ngoài (đợt 35).
    if (toward < 0) return { bat: chuanHoaGoc(toward + alpha), cang: -(180 - beta), short: 0 };
    return { bat: chuanHoaGoc(toward - alpha), cang: 180 - beta, short: 0 };
  }

  /**
   * CHO UỐNG THUỐC: quay 3/4, cúi tới con vật `target`; tay phía XA vắt ngang dưới thấp đỡ dưới CẰM nó (giữ đầu), tay phía GẦN
   * cầm một viên thuốc trắng to đưa tới MÔI nó — dừng trước môi, đẩy vào (con vật há miệng), viên thuốc biến mất, rụt tay ra; tay
   * đỡ vuốt cằm hai nhịp cho nó nuốt. Tay đỡ ở dưới cằm, tay thuốc ở môi — không tay nào vắt ngang mặt con vật. Cần cả hai tay rảnh. Con vật đứng sát
   * (đầu ngang bụng người — trên bàn khám): cho nó `openMouth` từ ~0,55 s rồi `chew` (`tools/scene.py` tự thêm, đúng nhịp).
   */
  static BANDAGE_TURN = 0.8;               // đợt 36: quấn băng — quay gần nghiêng hẳn về con vật, hai tay cùng ra trước tới ống chân
  static PILL_TURN = 0.85;                 // quay gần nghiêng hẳn về phía con vật lúc cho thuốc (lượt bốn; lượt ba 0,35)
  static PILL_CHIN = 0.31;                 // tay đỡ dưới môi bao nhiêu bề ngang đầu con vật LÚC NÓ HÁ LỚN (đích là một điểm — bối cảnh 3D; đợt 36)
  static PILL_CHIN_UP = 0.18;              // … và lúc miệng đã khép (cằm thật) — hai nhịp vuốt cằm ở đây
  static PILL_SHUT = 1.6;                  // giây (của bước này) con vật khép miệng (`openMouth` giữ 1,1 s — tools/scene.py); tay đỡ nâng theo cằm
  static PILL_IN = 1.0;                    // giây viên thuốc vào tới môi (biến mất ở PILL_IN + 0,15)
  givePill(target = null) {
    const t = this.tl(), s = this.s, N = this.NGHI;
    for (const side of ['L', 'R']) if (this.holds[side] && s['item' + side] > 0.5) throw new Error(`[character] givePill: needs both hands free (one holds the head, the other gives the pill) — the ${side === 'L' ? 'left' : 'right'} hand is holding something; put it away first (hideItem)`);
    // Cằm và môi. Đích là rig / phần tử: đo trên hình (`'chin'`, `'lips'`). Đích là một điểm (bối cảnh 3D: `set.target(…, 'lips')`
    // cho môi; cằm thấp hơn môi theo bề ngang đầu `span`).
    const lips = this._reachLow(target, null, 'lips'), k = lips.k, other = k === 'L' ? 'R' : 'L', dir = k === 'R' ? 1 : -1;
    const point = !(target && (target.el || target.getBoundingClientRect)) && !(target && target.live && target.live.el);
    // Đợt 36: con vật HÁ MIỆNG LỚN (`gape` của rig thú — hàm dưới hạ ~1/3 đầu) — tay đỡ đặt dưới cái cằm ĐÃ HẠ (0,34 bề ngang đầu dưới
    // môi; bản trước 0,18 — bàn tay vẽ đè lên đúng chỗ khoang miệng há, che mất nó).
    // Lượt hai (Gemini: "tay kia buông" — khi miệng đã khép, bàn tay còn ở chỗ cằm há, dưới ngực con vật): hai chỗ đỡ — dưới cằm HẠ
    // lúc há (`chinAt`), rồi nâng lên cằm THẬT (`chinUpAt`) khi miệng khép, vuốt cằm ở đó.
    const chinUpAt = point ? { tx: lips.tx - dir * lips.span * 0.05, ty: lips.ty + lips.span * RigSVG.PILL_CHIN_UP } : this._reachLow(target, k, 'chin');
    const chinAt = { tx: chinUpAt.tx, ty: chinUpAt.ty + lips.span * (RigSVG.PILL_CHIN - RigSVG.PILL_CHIN_UP) };
    const drop = DAI.dui * this.nv.daiDui * this.nv.coChan * 0.72 * lips.crouch;
    // QUAY GẦN NGHIÊNG HẲN về phía con vật (`PILL_TURN`, lượt bốn): hai vai gần như một chỗ, HAI TAY cùng vươn ra trước — tay xa đặt
    // dưới cằm, tay gần đưa viên thuốc tới mép miệng. (Lượt ba quay 0,35: tay xa vắt ngang không tới, buông ở eo.)
    const turn = clamp(s.huong + dir * RigSVG.PILL_TURN, -1, 1);
    // ĐẦU BÀN TAY (hay vật cầm ở đó) tới (x, y): giải lặp cổ tay lùi về theo hướng cẳng tay — vai thật khi đã quay, khuỷu chúc xuống.
    const tipAt = (side, x, y, reachIn) => {
      const was = s.huong; s.huong = turn;
      const shoulder = { x: this._shoulderX(side), y: this._shoulderY() + drop };
      s.huong = was;
      const upperLen = DAI.canhTay * this.nv.daiCanhTay, foreLen = DAI.cangTay * this.nv.daiCangTay;
      let wx = x, wy = y;
      for (let n = 0; n < 6; n++) {
        const dx = wx - shoulder.x, dy = wy - shoulder.y, d = Math.min(Math.hypot(dx, dy), (upperLen + foreLen) * 0.98) || 1, base = Math.atan2(dy, dx);
        const alpha = Math.acos(clamp((upperLen * upperLen + d * d - foreLen * foreLen) / (2 * upperLen * d), -1, 1));
        const e = [base + alpha, base - alpha].map((ang) => ({ x: shoulder.x + upperLen * Math.cos(ang), y: shoulder.y + upperLen * Math.sin(ang) })).sort((p, q) => q.y - p.y)[0];
        const ux = wx - e.x, uy = wy - e.y, ul = Math.hypot(ux, uy) || 1;
        wx = x - ux / ul * reachIn; wy = y - uy / ul * reachIn;
      }
      return this._armToTurned(side, wx, wy, turn, drop);
    };
    // Tay XA: lòng bàn tay (~16 đơn vị theo bàn tay) dưới cằm. Tay GẦN: viên thuốc (~24) ở mép miệng phía người.
    const chin = tipAt(other, chinAt.tx, chinAt.ty + 4, 16), chinUp = tipAt(other, chinUpAt.tx, chinUpAt.ty + 4, 16);
    const readyP = tipAt(k, lips.tx - dir * 18, lips.ty + 4, 24), insideP = tipAt(k, lips.tx - dir * 4, lips.ty, 24);
    const ready = { upper: readyP.bat, fore: readyP.cang }, inside = { upper: insideP.bat, fore: insideP.cang };
    this.pillReach = Math.max(readyP.short, insideP.short, chin.short, chinUp.short);
    this._leanTo(t, { ...lips, upper: ready.upper, fore: ready.fore }, 'nam');
    // Bối cảnh 3D: con vật đứng trước người thì đầu nó che tay ở môi — vẽ bàn tay cầm thuốc TRÊN nó lúc đưa thuốc.
    const pet = target && (target.pet || (target.el && target.svg ? target : null) || (target.live && target.live.el ? target.live : null));
    if (pet) {
      this.onTopPet = pet;
      t.to(s, { ['onTop' + k]: 1, ['onTop' + other]: 1, duration: 0.02 }, 0.45).to(s, { ['onTop' + k]: 0, duration: 0.02 }, RigSVG.PILL_IN + 0.4)
       .to(s, { ['onTop' + other]: 0, duration: 0.02 }, RigSVG.PILL_SHUT + 0.95);               // tay đỡ cằm: vẽ trên con vật tới hết hai nhịp vuốt cằm (vẽ sau đầu thì khuất hẳn)
    }
    // 0,45 s: dài hơn tween `_openUp` (trong `_leanTo`, 0,4 s về GESTURE_TURN) — ngắn hơn thì nó ghi đè hướng quay về 0,3.
    t.to(s, { ['aim' + other]: 1, ['carry' + other]: 0, huong: turn, than: N.than, dau: N.dau + dir * 4, duration: 0.45, ease: 'sine.inOut' }, 0);
    // Đợt 36: đầu cúi / quay về MÕM con vật suốt lúc đưa thuốc và vuốt cằm.
    this._lookTo(t, { x: lips.tx, y: lips.ty }, 0.1, { d: 0.45, huong: turn });
    t.set(s, { ['tay' + other]: 'xoe' }, 0.02);
    t.set(s, { ['gadget' + k]: 7 }, 0.05);
    // 1. Tay đỡ vắt qua đỡ dưới cằm; tay viên thuốc dừng trước môi (dáng `_leanTo`).
    t.to(s, { ['bat' + other]: chin.bat, ['cang' + other]: chin.cang, duration: 0.5, ease: 'power2.out' }, 0.05);
    // 2. Đẩy viên thuốc vào môi (con vật đã há miệng), viên thuốc biến mất, rụt tay ra.
    t.to(s, { ['bat' + k]: inside.upper, ['cang' + k]: inside.fore, mieng: 0.2, duration: 0.3, ease: 'sine.inOut' }, RigSVG.PILL_IN - 0.3);
    t.set(s, { ['gadget' + k]: 0 }, RigSVG.PILL_IN + 0.15);
    t.to(s, { ['bat' + k]: ready.upper - 4, ['cang' + k]: ready.fore + 6, mieng: 0, cuoi: 1, mayL: 0.6, mayR: 0.6, duration: 0.25, ease: 'power2.out' }, RigSVG.PILL_IN + 0.2);
    // 3. Con vật khép miệng: tay đỡ nâng theo lên cằm thật, rồi vuốt nhẹ cằm hai nhịp: "nuốt đi nào".
    const up = RigSVG.PILL_SHUT;
    t.to(s, { ['bat' + other]: chinUp.bat, ['cang' + other]: chinUp.cang, duration: 0.3, ease: 'sine.inOut' }, up);
    for (let i = 0; i < 2; i++) {
      t.to(s, { ['bat' + other]: chinUp.bat + 3, ['cang' + other]: chinUp.cang - 5, duration: 0.18, ease: 'sine.inOut' }, up + 0.3 + i * 0.36)
       .to(s, { ['bat' + other]: chinUp.bat, ['cang' + other]: chinUp.cang, duration: 0.18, ease: 'sine.inOut' }, up + 0.48 + i * 0.36);
    }
    this._khep(t, 0.5, up + 1.05);
    return t;
  }

  /* ------------------------------------------------------------ ĐỢT 38 A — cắt móng, nhỏ mắt, vệ sinh tai, quét chip
   * Bốn động tác HAI TAY trên con vật: quay gần nghiêng hẳn về nó (như `givePill`) cho hai tay cùng vươn ra trước — một tay GIỮ (chân
   * trước, cằm, lưng), tay kia cầm một dụng cụ nhỏ (gadget 10–13). Việc bàn tay làm lên con vật (nhấc chân, nâng cằm, nhắm mắt, lắc
   * đầu) là kênh của người (`petPaw`, `petChin`, `petBlink`, `petShake`) — con vật đọc lại khi vẽ (RigThu._careView, tập `heldBy38`),
   * nên nó chỉ động lúc bàn tay ở đó. Chỗ đặt tay đo trên hình con vật (`RigThu.carePoint`). Đầu người quay / cúi về chỗ tay làm.
   */
  static CARE38_TURN = 0.8;        // quay về phía con vật (như PILL_TURN 0,85): hai vai dồn một chỗ, hai tay cùng ra trước
  static CLIP_TIP = 39;            // đầu kìm cách cổ tay bấy nhiêu đơn vị khung theo bàn tay (gadget 10)
  static DROP_TIP = 30;            // đầu vòi lọ nhỏ mắt (gadget 11) …
  static PAD_AT = 25;              // tâm miếng bông (gadget 12) …
  static SCAN_AT = 30;             // tâm đầu đọc máy quét (gadget 13) …
  static DROP_GAP = 20;            // đầu vòi lọ thuốc ở trên mắt con vật bấy nhiêu đơn vị — giọt thuốc rơi thẳng xuống quãng ấy
  static SNIP_OPEN = 24;           // kìm mở: má trên xoay ra bấy nhiêu độ
  static CLIP_EVERY = 0.62;        // giây mỗi lần cắt (kìm tới móng, khép 0,22 s, mở) — người chấm xem thưa ~1 khung / giây
  static CHIP_ID = '900 123 456 789';

  // Vẽ theo trạng thái (gọi trong `apDung`): má kìm khép theo `snip`, giọt thuốc theo `drop`, vạch "bíp" khi thẻ số đọc chip hiện.
  _drawCareTools() {
    const e = this.el, s = this.s;
    for (const side of ['L', 'R']) {
      const box = e['gadget' + side], kind = Math.round(s['gadget' + side]);
      if (!box || kind < 10 || kind > 13) continue;
      if (kind === 10) { const jaw = box.querySelector('[data-snip]'); if (jaw) jaw.setAttribute('transform', `rotate(${(-(1 - clamp(s['snip' + side] || 0, 0, 1)) * RigSVG.SNIP_OPEN).toFixed(2)} 0 21)`); }
      if (kind === 11) {
        const drop = box.querySelector('[data-drop]'), f = s['drop' + side] || 0;
        if (drop) {
          drop.style.display = f > 0.001 && f < 0.995 ? '' : 'none';
          // 0…0,1: giọt đọng ở đầu vòi; 0,1…1: rơi thẳng (dụng cụ đã xoay cho vòi chúc thẳng xuống) tới mắt.
          const fall = clamp((f - 0.1) / 0.9, 0, 1);
          drop.setAttribute('transform', `translate(0 ${(RigSVG.DROP_TIP + 4 + fall * (RigSVG.DROP_GAP - 4)).toFixed(2)}) scale(${(0.75 + 0.5 * Math.min(1, f * 10)).toFixed(3)})`);
        }
      }
      if (kind === 13) { const beep = box.querySelector('[data-beep]'); if (beep) beep.style.display = s.readout > 0.3 ? '' : 'none'; }
    }
    // Con vật đang được giữ (kênh `pet…`): vẽ lại theo người — như `caring` (băng, loa).
    for (const pet of this.held38 || []) if (pet.el && !(this.caring && this.caring.has(pet))) pet.apDung();
  }

  /** Số đo cho tools/acting_check.py (đợt 38 A, `set.careProbe`): dụng cụ 10–13 đang cầm (phần tử), độ khép kìm, giọt thuốc, thẻ số. */
  care38Probe() {
    const e = this.el, s = this.s, side = ['L', 'R'].find((k) => Math.round(s['gadget' + k]) >= 10 && Math.round(s['gadget' + k]) <= 13) || null;
    const kind = side ? Math.round(s['gadget' + side]) : 0, tool = side ? [...e['gadget' + side].children].find((child) => +child.getAttribute('data-gadget') === kind) : null;
    const drop = tool && kind === 11 ? tool.querySelector('[data-drop]') : null, shown = e.readout && e.readout.style.display !== 'none';
    return { kind, side, tool, snip: side ? +clamp(s['snip' + side] || 0, 0, 1).toFixed(3) : 0, drop: drop && drop.style.display !== 'none' ? drop : null,
             card: shown ? e.readout.querySelector('rect') : null, text: shown ? e.readout.querySelector('[data-readout]').textContent : null, cardText: shown ? e.readout.querySelector('[data-readout]') : null };
  }

  // Rig con vật của đích, ghi hai chiều (người ↔ con vật) để nó đọc các kênh `pet…` của người này. Đích là rig / set.target mà không
  // phải con vật: báo lỗi rõ.
  _holdPet(target, name) {
    const pet = this._petOf(target);
    if (!pet && target && typeof target === 'object' && (target.el || target.rig)) throw new Error(`[character] ${name}(pet): the target must be a pet rig (createPet(...).rig) or set.target(person, pet)`);
    if (pet) { (this.held38 || (this.held38 = new Set())).add(pet); (pet.heldBy38 || (pet.heldBy38 = new Set())).add(this); }
    return pet;
  }

  // Chỗ `which` trên con vật (RigThu.carePoint) trong hệ của `_reachLow` (x, y). `base`: `_reachLow(target, …, 'head')` — giữa đầu
  // con vật. Đích là một ĐIỂM có `rig` (bối cảnh 3D: `set.target(người, con vật)`, giữa khung mặt nó): dời theo tỉ lệ khung con vật /
  // khung người quanh điểm ấy (`span` = bề ngang khung mặt nó trong khung người). Rig thú: qua màn hình như `_reachLow`. Không có con
  // vật (đích là một điểm, hay null): ước theo `base`. `key` / `level`: đo ở dáng con vật khi kênh ấy của người là `level` (chân đã
  // nhấc, cằm đã nâng) — đặt tạm rồi trả lại.
  _petSpot(target, pet, which, base, key = null, level = 1) {
    const s = this.s, side = base.tx >= HONG.x ? -1 : 1;
    if (!pet) {
      const w = base.span || 56, off = { paw: [0.05, 0.95], eye: [0.16 * side, -0.04], ear: [0.3 * side, -0.36], chin: [0, 0.42], crown: [0, -0.46], scruff: [-0.6 * side, 0.18], back: [-1.15 * side, 0.32] }[which] || [0, 0];
      return { x: base.tx + off[0] * w, y: base.ty + off[1] * w - (key === 'petChin' ? 3 * level : 0) - (key === 'petPaw' && which === 'paw' ? 22 * level : 0) };
    }
    const was = key ? s[key] : null;
    if (key) { s[key] = level; }
    try {
      const q = pet.carePoint(which, side);
      if (target && !target.el && typeof target.x === 'number' && typeof target.span === 'number' && typeof pet.shotBox === 'function') {
        const box = pet.shotBox('face'), r = target.span / (box.width || 1);
        return { x: base.tx + (q.x - (box.x + box.width / 2)) * r, y: base.ty + (q.y - (box.y + box.height * 0.5)) * r };
      }
      const p = new DOMPoint(q.x, q.y).matrixTransform(pet.svg.getScreenCTM()), sv = this.svg.getBoundingClientRect();
      const unit = Math.min(sv.width / KHUNG.w, sv.height / KHUNG.h) || 1, ox = sv.left + (sv.width - KHUNG.w * unit) / 2, oy = sv.top + (sv.height - KHUNG.h * unit) / 2;
      return { x: (p.x - ox) / unit - s.x, y: (p.y - oy) / unit - s.y - DOI_Y };
    } finally {
      if (key) { s[key] = was; pet.apDung(); }
    }
  }

  // Vào thế chung: cất đồ đang cầm, quay gần nghiêng về con vật, cúi theo nó. Trả về tay GẦN (`k`, phía con vật — cầm dụng cụ), tay XA
  // (`o` — giữ con vật), hướng quay, hàm `spot` (chỗ trên con vật) và hàm `arm` (góc hai đốt tay để ĐIỂM cách cổ tay `reachIn` đơn vị
  // theo bàn tay tới (x, y) — vai thật khi đã quay, khuỷu chúc xuống; như `givePill`).
  _care38(t, target, name, minCrouch = 0) {
    const s = this.s, N = this.NGHI, keep = {};
    for (const side of ['L', 'R']) if (this.holds[side] && s['item' + side] > 0.5) { t.to(s, { ['item' + side]: 0, ['carry' + side]: 0, duration: 0.15 }, 0); keep['item' + side] = 1; }
    const pet = this._holdPet(target, name), base = this._reachLow(target, null, 'head');
    const k = base.tx < HONG.x ? 'L' : 'R', o = k === 'L' ? 'R' : 'L', dir = k === 'R' ? 1 : -1;
    // Khuỵu gối ít nhất `minCrouch` (cắt móng: mặt xuống gần bàn chân) — đang ngồi / quỳ thì thôi.
    const crouch = s.seat > 0.5 || s.kneel > 0.5 ? 0 : Math.max(base.crouch || 0, minCrouch);
    const turn = dir * RigSVG.CARE38_TURN, drop = DAI.dui * this.nv.daiDui * this.nv.coChan * 0.72 * crouch;
    const upperLen = DAI.canhTay * this.nv.daiCanhTay, foreLen = DAI.cangTay * this.nv.daiCangTay;
    // Trả thêm `u`: hướng cẳng tay (vector đơn vị trên màn hình) — xoay dụng cụ cho thẳng đứng (`gadgetTurn`); `wx`, `wy`: cổ tay.
    const cB = this.nv.coBanTay || 1;
    const shoulderOf = (side) => { const was = s.huong; s.huong = turn; const q = { x: this._shoulderX(side), y: this._shoulderY() + drop }; s.huong = was; return q; };
    const solve = (side, x, y, reachIn) => {
      const shoulder = shoulderOf(side);
      let wx = x, wy = y, u = { x: 0, y: 1 };
      for (let n = 0; n < 6; n++) {
        const dx = wx - shoulder.x, dy = wy - shoulder.y, d = Math.min(Math.hypot(dx, dy), (upperLen + foreLen) * 0.98) || 1, angle = Math.atan2(dy, dx);
        const alpha = Math.acos(clamp((upperLen * upperLen + d * d - foreLen * foreLen) / (2 * upperLen * d), -1, 1));
        const e = [angle + alpha, angle - alpha].map((a) => ({ x: shoulder.x + upperLen * Math.cos(a), y: shoulder.y + upperLen * Math.sin(a) })).sort((p, q) => q.y - p.y)[0];
        const ux = wx - e.x, uy = wy - e.y, ul = Math.hypot(ux, uy) || 1;
        u = { x: ux / ul, y: uy / ul };
        wx = x - u.x * reachIn; wy = y - u.y * reachIn;
      }
      const pose = this._armToTurned(side, wx, wy, turn, drop);
      return { bat: pose.bat, cang: pose.cang, short: pose.short, u, wx, wy };
    };
    // ĐO LẠI TRÊN HÌNH (lượt hai): mô hình hai đốt tay không khớp hẳn hình vẽ (thân co, vai dời khi quay, bàn tay `coBanTay` — cậu bé:
    // kìm dừng cách bàn chân 2,5 % chiều cao). Đặt tạm dáng ấy, vẽ, đo ĐIỂM của bàn tay (`(hx, hy)` trong hệ cổ tay) rồi dời đích bù
    // chỗ lệch — hai lần. Chưa vẽ được (chưa gắn vào trang) thì giữ lời giải mô hình.
    const keys = ['bat' + 'L', 'bat' + 'R', 'cang' + 'L', 'cang' + 'R', 'aimL', 'aimR', 'huong', 'seat', 'than', 'vai', 'carryL', 'carryR'];
    const measure = (side, pose, hx, hy) => {
      const el = this.el && this.el['coTay' + side];
      if (!el || !el.getScreenCTM || !this.svg.getScreenCTM()) return null;
      const was = Object.fromEntries(keys.map((key) => [key, s[key]]));
      Object.assign(s, { ['bat' + side]: pose.bat, ['cang' + side]: pose.cang, ['aim' + side]: 1, ['carry' + side]: 0, huong: turn, than: N.than - dir * 2, vai: N.vai + 3 }, crouch ? { seat: crouch } : {});
      try {
        this.apDung();
        const m = this.svg.getScreenCTM().inverse().multiply(el.getScreenCTM()), q = new DOMPoint(hx, hy).matrixTransform(m);
        return Number.isFinite(q.x) && Number.isFinite(q.y) ? { x: q.x - s.x, y: q.y - (s.y || 0) - DOI_Y } : null;
      } catch (error) { return null; } finally { Object.assign(s, was); this.apDung(); }
    };
    const fit = (side, x, y, make, at) => {
      let tx = x, ty = y, p = make(tx, ty), best = null;
      for (let n = 0; n < 3; n++) {
        const q = measure(side, p, ...at(p));
        if (!q) return best ? best.p : p;
        const miss = Math.hypot(x - q.x, y - q.y);
        if (!best || miss < best.miss) best = { p, miss };
        if (miss < 0.5 || n === 2) break;
        tx += x - q.x; ty += y - q.y; p = make(tx, ty);
      }
      return best.p;                                     // lời giải trúng nhất (bù quá tay có thể đổi hướng khuỷu — giữ lần tốt nhất)
    };
    const arm = (side, x, y, reachIn) => fit(side, x, y, (a, b) => solve(side, a, b, reachIn * cB), () => [0, reachIn]);
    // Dụng cụ CHÚC THẲNG XUỐNG (lọ nhỏ mắt, máy quét): cổ tay đặt sao cho điểm `along` của dụng cụ (sau khi xoay quanh lòng bàn tay
    // (0, 10) cho trục nó thẳng đứng) tới (x, y); trả thêm `spin` — góc xoay (`gadgetTurn`, độ trên màn hình; tay trái vẽ soi gương).
    const down = (side, a, b, along) => { const p = solve(side, a, b - (along - 10) * cB, 10 * cB); return { ...p, spin: chuanHoaGoc(90 - Math.atan2(p.u.y, p.u.x) * 180 / Math.PI) }; };
    const armDown = (side, x, y, along) => fit(side, x, y, (a, b) => down(side, a, b, along), (p) => {
      const r = (side === 'L' ? -p.spin : p.spin) * Math.PI / 180;
      return [-Math.sin(r) * (along - 10), 10 + Math.cos(r) * (along - 10)];
    });
    const spot = (which, key = null, level = 1) => this._petSpot(target, pet, which, base, key, level);
    // Cúi theo con vật (như `_leanTo`: khuỵu gối nếu nó thấp), hai tay ở góc trên màn hình, quay về nó — 0,45 s: dài hơn tween `_openUp`.
    this._openUp(t);
    if (crouch) t.to(s, { seat: crouch, duration: 0.45, ease: 'power2.inOut' }, 0);
    t.to(s, { aimL: 1, aimR: 1, ['carry' + o]: 0, ['carry' + k]: 0, huong: turn, than: N.than - dir * 2, dau: N.dau + dir * 4, vai: N.vai + 3, duration: 0.45, ease: 'sine.inOut' }, 0);
    t.set(s, { ['tay' + k]: 'nam', ['tay' + o]: 'xoe' }, 0.02);
    // Nhìn tới một điểm, tính ở dáng đã khuỵu (mặt thấp hơn lúc dựng).
    // Đợt 44 A: đích dốc (con vật trong chậu dưới sàn) — quay mặt bớt về phía người xem cho hướng cúi chúc đúng xuống nó (`steep44a`).
    const look = (point, at, options = {}) => { const was = s.seat; if (crouch) s.seat = crouch; this._lookTo(t, point, at, { huong: turn, steep44a: true, ...options }); s.seat = was; };
    return { pet, base, k, o, dir, turn, keep, spot, arm, armDown, look, crouch, hand: cB };
  }

  /**
   * CẮT MÓNG: quay nghiêng về con vật `target`, cúi xuống; tay xa đỡ dưới BÀN CHÂN TRƯỚC (phía người xem) và NHẤC nó lên, tay gần đưa
   * cái kìm cắt móng (hiện trong tay) tới đầu bàn chân, cắt 2–3 lần (kìm khép lại thấy rõ) — rồi cất kìm, hạ chân xuống, vuốt gáy nó hai
   * cái, cười, gật. `hold`: giây cắt (≈ 0,6 s một lần). `paw`: 'front' (chân trước phía người xem — chân duy nhất nhấc được).
   */
  clipNails(target = null, { paw = 'front', hold = 1.8 } = {}) {
    if (paw !== 'front') throw new Error(`[character] clipNails: paw must be 'front' (the near front paw), got ${JSON.stringify(paw)}`);
    if (!(Number.isFinite(hold) && hold >= 0.6 && hold <= 6)) throw new Error(`[character] clipNails: hold must be 0.6…6 seconds of clipping, got ${JSON.stringify(hold)}`);
    const t = this.tl(), s = this.s, N = this.NGHI, c = this._care38(t, target, 'clipNails', 0.3), { k, o, dir, turn } = c;
    const P0 = c.spot('paw'), P1 = c.spot('paw', 'petPaw', 1), S = c.spot('back'), E = c.spot('eye');
    // Lòng bàn tay xa ĐỠ DƯỚI bàn chân; đầu kìm ở mép bàn chân phía người (móng), sẵn sàng thì lùi ra một chút.
    const hold0 = c.arm(o, P0.x + dir * 6, P0.y + 9, 15), hold1 = c.arm(o, P1.x + dir * 6, P1.y + 9, 15);      // lòng bàn tay dưới–sau bàn chân: bàn chân lộ ra giữa tay và kìm
    const ready0 = c.arm(k, P0.x - dir * 20, P0.y - 12, RigSVG.CLIP_TIP), ready1 = c.arm(k, P1.x - dir * 18, P1.y - 8, RigSVG.CLIP_TIP);
    const at = (i) => c.arm(k, P1.x - dir * 2, P1.y + (i % 2 ? 2.5 : -1.5), RigSVG.CLIP_TIP);
    // 1. Hai tay tới bàn chân (kìm hiện trong tay), đầu cúi nhìn nó.
    t.to(s, { ['bat' + k]: ready0.bat, ['cang' + k]: ready0.cang, ['bat' + o]: hold0.bat, ['cang' + o]: hold0.cang, dauY: 8, cuoi: 0.6, chum: 0.15, mayL: 0.3, mayR: 0.3, duration: 0.5, ease: 'power2.out' }, 0.05);
    t.set(s, { ['gadget' + k]: 10, ['snip' + k]: 0 }, 0.1);
    c.look(P0, 0.05, { d: 0.45 });
    // 2. NHẤC CHÂN: bàn tay đỡ nâng lên, chân con vật lên theo (cùng một tween).
    t.to(s, { petPaw: 1, ['bat' + o]: hold1.bat, ['cang' + o]: hold1.cang, ['bat' + k]: ready1.bat, ['cang' + k]: ready1.cang, duration: 0.45, ease: 'sine.inOut' }, 0.6);
    c.look(P1, 0.6, { d: 0.45 });
    // 3. CẮT: mỗi lần kìm tới móng, khép (giữ 0,22 s), mở — đổi móng giữa hai lần. Tay đỡ siết nhẹ theo nhịp.
    const c0 = 1.1, n = Math.max(2, Math.round(hold / RigSVG.CLIP_EVERY)), per = Math.max(RigSVG.CLIP_EVERY, hold / n);
    for (let i = 0; i < n; i++) {
      const a = c0 + i * per, p = at(i);
      t.to(s, { ['bat' + k]: p.bat, ['cang' + k]: p.cang, duration: 0.16, ease: 'sine.out' }, a);
      t.to(s, { ['snip' + k]: 1, mieng: 0.1, chum: 0.35, duration: 0.09, ease: 'power2.in' }, a + 0.2);
      t.to(s, { ['snip' + k]: 0, chum: 0.15, duration: 0.12, ease: 'power2.out' }, a + 0.2 + 0.09 + 0.22);
      t.to(s, { ['cang' + o]: hold1.cang + dir * 2, duration: 0.15, ease: 'sine.inOut', yoyo: true, repeat: 1 }, a + 0.18);
    }
    // 4. Xong: kìm lùi ra rồi cất (trong tay), hạ chân xuống cùng bàn tay đỡ, vuốt gáy hai cái, cười, gật.
    // Vuốt LƯNG (không vuốt gáy: bàn tay ở gáy che mất đầu con vật — lượt hai).
    const e = c0 + n * per, stroke0 = c.arm(k, S.x + dir * 8, S.y - 1, 15), stroke1 = c.arm(k, S.x - dir * 8, S.y + 1, 15);
    t.to(s, { ['bat' + k]: ready1.bat, ['cang' + k]: ready1.cang, mieng: 0, chum: 0, duration: 0.22, ease: 'power2.out' }, e);
    t.set(s, { ['gadget' + k]: 0, ['tay' + k]: 'xoe' }, e + 0.25);
    t.to(s, { petPaw: 0, ['bat' + o]: hold0.bat, ['cang' + o]: hold0.cang, duration: 0.45, ease: 'sine.inOut' }, e + 0.2);
    t.to(s, { ['bat' + k]: stroke0.bat, ['cang' + k]: stroke0.cang, duration: 0.3, ease: 'power2.out' }, e + 0.3);
    for (let i = 0; i < 2; i++) {
      t.to(s, { ['bat' + k]: stroke1.bat, ['cang' + k]: stroke1.cang, duration: 0.22, ease: 'sine.inOut' }, e + 0.62 + i * 0.44)
       .to(s, { ['bat' + k]: stroke0.bat, ['cang' + k]: stroke0.cang, duration: 0.22, ease: 'sine.inOut' }, e + 0.84 + i * 0.44);
    }
    c.look(E, e + 0.3, { d: 0.4 });
    t.to(s, { cuoi: 1, mayL: 0.6, mayR: 0.6, duration: 0.25 }, e + 0.35);
    t.to(s, { dauY: 13, duration: 0.2, ease: 'sine.out', yoyo: true, repeat: 1 }, e + 1.0);
    this._khep(t, 0.5, e + 1.55, c.keep);
    return t;
  }

  /**
   * NHỎ MẮT: quay nghiêng về con vật `target`; tay xa đỡ dưới CẰM và nâng nó ngửa đầu lên, tay gần giơ lọ thuốc nhỏ mắt (hiện trong
   * tay) chúc thẳng xuống ngay trên con mắt phía người, giữ `hold` giây — một giọt thuốc đọng ở đầu vòi rồi rơi xuống mắt, con vật nhắm
   * tịt mắt lại, chớp. Cất lọ, hạ cằm, vuốt cằm hai cái, cười.
   */
  eyeDrops(target = null, { hold = 1.2 } = {}) {
    if (!(Number.isFinite(hold) && hold >= 0.5 && hold <= 5)) throw new Error(`[character] eyeDrops: hold must be 0.5…5 seconds, got ${JSON.stringify(hold)}`);
    const t = this.tl(), s = this.s, c = this._care38(t, target, 'eyeDrops'), { k, o, dir, turn } = c;
    const C0 = c.spot('chin'), C1 = c.spot('chin', 'petChin', 1), E1 = c.spot('eye', 'petChin', 1);
    const hold0 = c.arm(o, C0.x, C0.y + 4, 16), hold1 = c.arm(o, C1.x, C1.y + 4, 16);
    // Lọ chúc thẳng xuống: đầu vòi ngay trên mắt `DROP_GAP` đơn vị (lúc sẵn sàng: cao hơn 14).
    const aim = c.armDown(k, E1.x, E1.y - RigSVG.DROP_GAP, RigSVG.DROP_TIP), ready = c.armDown(k, E1.x - dir * 3, E1.y - RigSVG.DROP_GAP - 7, RigSVG.DROP_TIP);
    // 1. Tay xa tới dưới cằm, lọ thuốc hiện trong tay gần, xoay chúc xuống.
    t.to(s, { ['bat' + k]: ready.bat, ['cang' + k]: ready.cang, ['gadgetTurn' + k]: ready.spin, ['bat' + o]: hold0.bat, ['cang' + o]: hold0.cang, dauY: 8, cuoi: 0.55, chum: 0.2, mayL: 0.3, mayR: 0.3, duration: 0.5, ease: 'power2.out' }, 0.05);
    t.set(s, { ['gadget' + k]: 11, ['drop' + k]: 0 }, 0.1);
    c.look(E1, 0.05, { d: 0.45 });
    // 2. NÂNG CẰM: con vật ngửa đầu theo bàn tay; lọ thuốc tới ngay trên mắt.
    t.to(s, { petChin: 1, ['bat' + o]: hold1.bat, ['cang' + o]: hold1.cang, ['bat' + k]: aim.bat, ['cang' + k]: aim.cang, ['gadgetTurn' + k]: aim.spin, duration: 0.45, ease: 'sine.inOut' }, 0.55);
    // 3. Giữ lọ trên mắt; giọt thuốc đọng ở đầu vòi (0,6 s — thấy được ở 1 khung / giây), rồi rơi xuống mắt.
    const d0 = 1.0 + hold * 0.5, hit = d0 + 0.6 + 0.3;
    t.to(s, { ['drop' + k]: 0.1, duration: 0.25, ease: 'sine.out' }, d0);
    t.to(s, { ['drop' + k]: 1, duration: 0.3, ease: 'power2.in' }, d0 + 0.6);
    t.set(s, { ['drop' + k]: 0 }, hit + 0.01);
    // 4. Con vật nhắm tịt mắt (giữ 0,7 s), hé ra, chớp lần nữa.
    t.to(s, { petBlink: 1, duration: 0.07, ease: 'power1.in' }, hit);
    t.to(s, { petBlink: 0.35, duration: 0.15 }, hit + 0.75).to(s, { petBlink: 1, duration: 0.07 }, hit + 1.15).to(s, { petBlink: 0, duration: 0.12 }, hit + 1.3);
    t.to(s, { cuoi: 0.9, mayL: 0.55, mayR: 0.55, chum: 0, duration: 0.25 }, hit + 0.1);
    // 5. Cất lọ, hạ cằm (tay đỡ hạ theo), vuốt cằm hai cái.
    // Lọ lên khỏi mắt một chút rồi cất; tay ấy hạ về bên người (lượt hai: về dáng "sẵn sàng" thì bàn tay không lướt qua mặt người).
    t.to(s, { ['bat' + k]: ready.bat, ['cang' + k]: ready.cang, duration: 0.2, ease: 'power2.out' }, hit + 0.35);
    t.set(s, { ['gadget' + k]: 0, ['gadgetTurn' + k]: 0, ['tay' + k]: 'mo' }, hit + 0.58);
    t.to(s, { ['bat' + k]: this.NGHI['bat' + k], ['cang' + k]: this.NGHI['cang' + k], ['aim' + k]: 0, duration: 0.4, ease: 'power2.inOut' }, hit + 0.6);
    t.to(s, { petChin: 0, ['bat' + o]: hold0.bat, ['cang' + o]: hold0.cang, duration: 0.4, ease: 'sine.inOut' }, hit + 0.5);
    for (let i = 0; i < 2; i++) {
      t.to(s, { ['bat' + o]: hold0.bat + 3, ['cang' + o]: hold0.cang - 5, duration: 0.18, ease: 'sine.inOut' }, hit + 0.95 + i * 0.36)
       .to(s, { ['bat' + o]: hold0.bat, ['cang' + o]: hold0.cang, duration: 0.18, ease: 'sine.inOut' }, hit + 1.13 + i * 0.36);
    }
    t.to(s, { dauY: 12, cuoi: 1, duration: 0.2, ease: 'sine.out', yoyo: true, repeat: 1 }, hit + 1.1);
    this._khep(t, 0.5, hit + 1.75, c.keep);
    return t;
  }

  /**
   * VỆ SINH TAI: quay nghiêng về con vật `target`; tay xa đỡ dưới cằm giữ đầu, tay gần cầm miếng bông (hiện trong tay) lau trong gốc
   * tai phía người thành những vòng nhỏ suốt `hold` giây. Rồi buông hai tay, con vật LẮC ĐẦU (tai vẫy) — người lùi đầu ra, cười.
   */
  cleanEars(target = null, { hold = 1.8 } = {}) {
    if (!(Number.isFinite(hold) && hold >= 0.8 && hold <= 6)) throw new Error(`[character] cleanEars: hold must be 0.8…6 seconds of wiping, got ${JSON.stringify(hold)}`);
    const t = this.tl(), s = this.s, N = this.NGHI, c = this._care38(t, target, 'cleanEars'), { k, o, dir, turn } = c;
    const A = c.spot('ear'), C = c.spot('chin'), E = c.spot('eye');
    const hold0 = c.arm(o, C.x, C.y + 10, 16);       // dưới cằm, thấp: không che miệng, mắt (mèo nhỏ: đầu thấy 59 % với +7)
    const wipe = (q) => { const a = q * Math.PI / 2; return c.arm(k, A.x + Math.cos(a) * 4, A.y + Math.sin(a) * 3.2, RigSVG.PAD_AT); };
    const ready = c.arm(k, A.x - dir * 14, A.y - 8, RigSVG.PAD_AT), first = wipe(0);
    // 1. Tay đỡ cằm, miếng bông tới gốc tai.
    t.to(s, { ['bat' + k]: ready.bat, ['cang' + k]: ready.cang, ['bat' + o]: hold0.bat, ['cang' + o]: hold0.cang, dauY: 8, cuoi: 0.55, chum: 0.2, mayL: 0.3, mayR: 0.3, duration: 0.45, ease: 'power2.out' }, 0.05);
    t.set(s, { ['gadget' + k]: 12 }, 0.1);
    t.to(s, { ['bat' + k]: first.bat, ['cang' + k]: first.cang, duration: 0.2, ease: 'sine.out' }, 0.45);
    c.look(A, 0.05, { d: 0.45 });
    // 2. LAU: những vòng nhỏ trong gốc tai (mỗi vòng 0,44 s).
    const loops = Math.max(2, Math.round(hold / 0.44)), step = hold / loops / 4;
    for (let w = 0, at = 0.65; w < loops; w++) for (let q = 1; q <= 4; q++, at += step) { const p = wipe(q); t.to(s, { ['bat' + k]: p.bat, ['cang' + k]: p.cang, duration: step, ease: 'sine.inOut' }, at); }
    // 3. Buông: bông cất, hai tay lùi ra; con vật LẮC ĐẦU (8 nhịp, nhỏ dần) — người ngả đầu ra, cười.
    const e = 0.65 + hold;
    // Hai tay về hẳn bên người (dáng nghỉ) — con vật tự lắc đầu, không bàn tay nào ở gần nó (lượt hai: tay còn sát đầu nó, 1 % chiều cao).
    t.to(s, { ['bat' + k]: N['bat' + k], ['cang' + k]: N['cang' + k], ['bat' + o]: N['bat' + o], ['cang' + o]: N['cang' + o], aimL: 0, aimR: 0, than: N.than + dir * 3, duration: 0.35, ease: 'power2.out' }, e);
    t.set(s, { ['gadget' + k]: 0, ['tay' + k]: 'mo', ['tay' + o]: 'mo' }, e + 0.25);
    const shake = e + 0.35;
    for (let i = 0; i < 8; i++) t.to(s, { petShake: (i % 2 ? -1 : 1) * (1 - i / 10), duration: 0.11, ease: 'sine.inOut' }, shake + i * 0.11);
    t.to(s, { petShake: 0, duration: 0.12, ease: 'sine.out' }, shake + 0.88);
    t.to(s, { than: N.than + dir * 2, dau: N.dau - dir * 4, dauY: 2, cuoi: 1, mieng: 0.35, mayL: 0.75, mayR: 0.75, chum: 0, duration: 0.3, ease: 'power2.out' }, shake);
    c.look(E, shake, { d: 0.35 });
    this._khep(t, 0.5, shake + 1.05, c.keep);
    return t;
  }

  /**
   * QUÉT CHIP: quay nghiêng về con vật `target`; tay xa đặt lên lưng nó giữ yên, tay gần cầm máy quét chip (hiện trong tay) chúc xuống,
   * rà CHẬM hai lượt trên gáy / vai — máy "bíp" và một thẻ số lớn bật lên trên lưng con vật với mã chip `id`, người nhìn thẻ `hold` giây,
   * gật. Thẻ dùng chung hệ thẻ số đo (`readout`, như `weigh` / `takeTemp`), rộng theo mã.
   */
  scanChip(target = null, { id = RigSVG.CHIP_ID, hold = 1.6 } = {}) {
    if (typeof id !== 'string' || !id.trim() || id.length > 24) throw new Error(`[character] scanChip: id must be the chip number as a string of up to 24 characters, such as '900 123 456 789', got ${JSON.stringify(id)}`);
    if (!(Number.isFinite(hold) && hold >= 0.8 && hold <= 6)) throw new Error(`[character] scanChip: hold must be 0.8…6 seconds, got ${JSON.stringify(hold)}`);
    const t = this.tl(), s = this.s, c = this._care38(t, target, 'scanChip'), { k, o, dir, turn } = c;
    const S = c.spot('scruff'), B = c.spot('back'), H = c.spot('crown'), fwd = H.x >= S.x ? 1 : -1;
    // Đầu đọc lơ lửng ngay trên lông (12 đơn vị trên gáy), rà từ sau đầu về vai; tay xa úp trên lưng.
    const lift = 13, pass = [c.armDown(k, S.x + fwd * 2, S.y - lift, RigSVG.SCAN_AT), c.armDown(k, S.x - fwd * 32, S.y - lift + 3, RigSVG.SCAN_AT)];
    const mid = c.armDown(k, S.x - fwd * 14, S.y - lift + 1, RigSVG.SCAN_AT), ready = c.armDown(k, S.x - fwd * 8, S.y - lift - 16, RigSVG.SCAN_AT);
    const rest = c.arm(o, B.x - fwd * 18, B.y + 24, 15);       // lòng bàn tay úp bên sườn — dưới đường máy quét đi (lượt ba: trên lưng thì máy che mất bàn tay)
    // 1. Tay xa úp lên lưng, máy quét hiện trong tay gần, chúc xuống trên gáy.
    t.to(s, { ['bat' + k]: ready.bat, ['cang' + k]: ready.cang, ['gadgetTurn' + k]: ready.spin, ['bat' + o]: rest.bat, ['cang' + o]: rest.cang, dauY: 8, cuoi: 0.5, chum: 0.15, mayL: 0.3, mayR: 0.3, duration: 0.5, ease: 'power2.out' }, 0.05);
    t.set(s, { ['gadget' + k]: 13, ['tay' + o]: 'xoe' }, 0.1);
    // Bối cảnh 3D: con vật vẽ TRƯỚC người lúc rà (như `putCone`) — cánh tay cầm máy vươn qua đầu nó nằm sau nó, chỉ hai bàn tay (bản chép,
    // `onTop`) vẽ trên nó. Người vẽ trước thì cánh tay che hơn nửa đầu con vật (lượt một: đầu thấy 42 %).
    if (c.pet) { (this.caring || (this.caring = new Set())).add(c.pet); t.to(s, { onTopL: 1, onTopR: 1, careFront: 1, duration: 0.02 }, 0.12); }
    // 2. Rà chậm: trước → sau → trước (0,8 s mỗi lượt), mắt theo máy.
    const go = (p, at, d) => t.to(s, { ['bat' + k]: p.bat, ['cang' + k]: p.cang, ['gadgetTurn' + k]: p.spin, duration: d, ease: 'sine.inOut' }, at);
    go(pass[0], 0.55, 0.35); go(pass[1], 0.9, 0.8); go(pass[0], 1.7, 0.8); go(mid, 2.5, 0.3);
    const tool = (p) => ({ x: p.wx + p.u.x * 10 * c.hand, y: p.wy + (p.u.y * 10 + RigSVG.SCAN_AT - 10) * c.hand });
    c.look(tool(pass[0]), 0.05, { d: 0.45 });
    c.look(tool(pass[1]), 0.95, { d: 0.75 });
    c.look(tool(pass[0]), 1.75, { d: 0.75 });
    // 3. BÍP: thẻ số với mã chip bật lên trên lưng con vật (lệch về phía đuôi — không che đầu nó), người nhìn thẻ, gật.
    const beep = 2.85, w = Math.max(116, Math.round(id.length * 12.6 + 26));
    // Thẻ trên LƯNG con vật, lệch về phía đuôi, thấp ngay trên lưng — không che đầu nó, không che mặt người cúi sát (lượt hai).
    const card = { x: B.x - fwd * 50, y: Math.min(B.y - 30, S.y - lift - RigSVG.SCAN_AT - 12) };
    t.to(s, { readoutN: this._reading({ text: id, x: card.x + s.x, y: card.y + (s.y || 0) + DOI_Y, w }), duration: 0.02 }, beep - 0.05);
    t.to(s, { readout: 1, duration: 0.35, ease: 'back.out(1.8)' }, beep);
    const look = { x: card.x, y: card.y - 26 }, angles = this._lookAngles(look, { huong: turn });
    c.look(look, beep + 0.1, { d: 0.4 });
    t.to(s, { cuoi: 1, mayL: 0.7, mayR: 0.7, chum: 0, duration: 0.3 }, beep + 0.2);
    t.to(s, { headPitch: angles.headPitch + 0.4, duration: 0.22, ease: 'sine.out', yoyo: true, repeat: 1 }, beep + 0.45 + hold * 0.55);
    t.to(s, { readout: 0, duration: 0.25, ease: 'power2.in' }, beep + 0.45 + hold);
    // 4. Cất máy, nhấc tay khỏi lưng.
    t.to(s, { ['bat' + k]: ready.bat, ['cang' + k]: ready.cang, duration: 0.25, ease: 'power2.out' }, beep + 0.55 + hold);
    t.set(s, { ['gadget' + k]: 0, ['gadgetTurn' + k]: 0, ['tay' + o]: 'mo' }, beep + 0.8 + hold);
    if (c.pet) t.to(s, { onTopL: 0, onTopR: 0, careFront: 0, duration: 0.02 }, beep + 0.8 + hold);
    this._khep(t, 0.5, beep + 0.8 + hold, c.keep);
    return t;
  }

  /**
   * ĐEO LOA CHỐNG LIẾM bằng HAI TAY: giơ cái loa trong mờ lên trước ngực (cầm ở mép, thấy rõ), cúi tới con vật `target`, đưa
   * vành loa vòng quanh đầu nó rồi tuột xuống cổ — loa chuyển sang con vật ĐÚNG chỗ ấy, cùng cỡ (không tự bay, không nở ra) —,
   * hai tay cài khoá ở cổ, rồi mới thả tay, gật. Loa CÒN LẠI trên con vật (như `wear('cone')`).
   */
  putCone(target = null) {
    const pet = this._petOf(target);
    if (target && typeof target === 'object' && (target.el || target.rig) && !pet) throw new Error('[character] putCone(pet): the target must be a pet rig (createPet(...).rig)');
    this._careFor(pet, 'petCone', 'putCone');
    if (pet) pet.coneAsked = true;                                  // đợt 40 C: con vật sẽ có loa (lúc dựng bước, mức `petCone` của người còn 0) — `pawAtCone` của nó cho phép
    const t = this.tl(), s = this.s, N = this.NGHI, { reach: head, keep } = this._careHand(t, target, 'eyes'), { k, tx, ty } = head;
    const o = k === 'L' ? 'R' : 'L', side = tx >= HONG.x ? 1 : -1, arm = this._stoopFor(t, head, 0.15), deg = Math.PI / 180;
    // Vành loa cùng cỡ loa của con vật: 70 / 132 bề ngang khung mặt nó. Vòng là một hình riêng của người (`ring`, tâm `ringX/Y`):
    // luôn ở đúng chỗ (trước ngực → quanh đầu con vật), hai bàn tay đặt lên MÉP nó — gắn vào bàn tay thì vòng lệch theo cổ tay
    // (đo: tâm vòng cách đầu mèo 18 px với tay phải, 60 px với tay trái).
    const R = Math.max(CONE_GRIP, (head.span || 0) * 70 / 132 + 4);
    // Lượt ba: hai tay cầm vành ở phía người đứng (hơi trên) và phía dưới–trước (dưới cằm) — không ở mép dưới–sau, chỗ ấy là thân /
    // đuôi con vật (Gemini 00:41: "tay chạm gần đuôi mèo").
    // (Phía bên kia vành tay chibi không với tới — bàn tay dừng trên mặt con vật; đo trên ảnh lượt ba.)
    // Tay GẦN (phía con vật, `k`) lo chỗ xa hơn — dưới–trước; tay XA (`o`) lo mép vành phía người đứng (lượt ba: ngược lại thì tay xa dừng
    // ngắn ở gốc đuôi mèo, đo 28 % trục đuôi → đầu).
    const rimK = side > 0 ? 150 : 30, rimO = side > 0 ? 205 : -25;
    const pose = (cx, cy, angK = rimK, angO = rimO, r = R) => {
      const a = arm(k, cx + Math.cos(angK * deg) * r, cy + Math.sin(angK * deg) * r), b = arm(o, cx + Math.cos(angO * deg) * r, cy + Math.sin(angO * deg) * r);
      return { ['bat' + k]: a.bat, ['cang' + k]: a.cang, ['bat' + o]: b.bat, ['cang' + o]: b.cang, ringX: cx, ringY: cy };
    };
    // 1. Giơ loa lên trước bụng, về phía con vật — "đây là cái loa".
    const chestX = HONG.x + side * 42, chestY = this._shoulderY() + 44;      // trước ngực, lệch về phía con vật: vành không che mặt
    t.set(s, { ringR: R, ringX: chestX, ringY: chestY }, 0);                 // chỗ của vòng đặt TRƯỚC tween dưới (không trượt vào từ toạ độ 0)
    t.set(s, { ['tay' + k]: 'nam', ['tay' + o]: 'nam', ring: 1, ringFront: 1 }, 0.02);
    t.to(s, { ...pose(chestX, chestY), cuoi: 0.8, mayL: 0.5, mayR: 0.5, nhinX: side * 1.2, nhinY: 1.5, duration: 0.5, ease: 'power2.out' }, 0);
    t.to(s, { dauY: 4, duration: 0.2, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.5);
    // 2. Cúi tới, đưa vành quanh đầu con vật, 3. tuột xuống quanh cổ.
    t.to(s, { ...pose(tx, ty), than: N.than - side * 3, dau: N.dau + side * 4, dauY: 9, nhinY: 2.6, cuoi: 0.5, chum: 0.25, duration: 0.55, ease: 'power2.inOut' }, 0.85);
    if (pet) t.to(s, { onTopL: 1, onTopR: 1, careFront: 1, duration: 0.02 }, 0.85);
    t.set(s, { ringFront: 0 }, 0.85);                                          // rời ngực: vòng về sau người (con vật vẽ trước, vòng quanh cổ nó)
    t.to(s, { ...pose(tx, ty + R * 0.12), duration: 0.25, ease: 'sine.inOut' }, 1.45);
    // 4. Loa chuyển sang con vật đúng chỗ ấy: loa của nó hiện đủ cỡ, vòng trong tay tắt — cùng một khung hình.
    t.set(s, { petCone: 1, ring: 0 }, 1.72);
    // 5. Hai tay cài khoá dưới cằm (mép dưới vành), ấn hai nhịp, 6. rồi mới thả tay, gật.
    // Cài khoá: hai tay ở BÊN CỔ phía người đứng, ngang cổ (một trên, một dưới) — mép dưới vòng nằm ngang ngực con vật, gần gốc đuôi
    // (đo: tay ở 28–32 % trục đuôi → đầu); bên kia vòng tay chibi không với tới.
    const lock = pose(tx, ty, side > 0 ? 158 : 22, side > 0 ? 196 : -16, R * 0.88);      // ngay trong mép vành: ấn khoá không nhấc tay khỏi loa
    t.to(s, { ['bat' + k]: lock['bat' + k], ['cang' + k]: lock['cang' + k], ['bat' + o]: lock['bat' + o], ['cang' + o]: lock['cang' + o], duration: 0.3, ease: 'sine.inOut' }, 1.75);
    t.to(s, { ['cang' + k]: lock['cang' + k] + 4, ['cang' + o]: lock['cang' + o] + 4, duration: 0.12, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 2.08);
    t.to(s, { cuoi: 1, chum: 0, mayL: 0.55, mayR: 0.55, duration: 0.25 }, 2.4);
    if (pet) t.to(s, { onTopL: 0, onTopR: 0, careFront: 0, duration: 0.02 }, 2.7);
    t.to(s, { dauY: 14, duration: 0.15, ease: 'sine.out', yoyo: true, repeat: 1 }, 2.3);          // gật: "xong rồi"
    this._khep(t, 0.5, 2.62, { ...keep, ...(pet ? { petCone: 1 } : {}) });
    return t;
  }

  // ĐỢT 38 B — PHỐI HỢP Ở PHÒNG KHÁM VÀ CHUẨN BỊ: giữ con vật cho người khác làm (`restrain`), rửa tay (`washHands`), đeo / tháo găng
  // (`putOnGloves` / `takeOffGloves`).
  static RESTRAIN_TURN = 0.8;              // giữ con vật: quay gần nghiêng hẳn về nó (như `bandage`) — hai tay cùng vươn ra trước, ôm lấy nó
  static RESTRAIN_STROKE = 0.85;
  static RESTRAIN_DOWN = 1.2;
  static RESTRAIN_CROUCH = 0.3;           // … khuỵu gối ít nhất bấy nhiêu (`seat`) khi cúi vào con vật trên bàn              // … bàn tay úp XUỐNG lưng / hông: dưới tâm khung thân (khung có cả tai) bấy nhiêu × `lift`           // … hai nhịp vuốt lưng dỗ dành sau lúc giữ (giây)

  /**
   * GIỮ CON VẬT cho người khác khám / tiêm (`together` với `inject`, `examine`, `listen`, `takeTemp` … của họ): quay gần nghiêng hẳn
   * về con vật, khuỵu gối cúi vào, HAI TAY ôm lấy nó — đứng phía ĐẦU nó: một tay ngang ngực / cổ (dưới đầu, không che mặt), tay kia
   * úp trên lưng; đứng phía ĐUÔI: một tay giữ hông, tay kia úp trên lưng — giữ yên `hold` giây, mặt hiền, mắt nhìn đầu nó; rồi tay
   * trên lưng vuốt dỗ hai nhịp, thả ra. Con vật không dời chỗ. Tay giữ ở nửa thân phía mình, chừa nửa kia cho người làm.
   * `head`: đầu con vật khi `target` là một điểm (bối cảnh 3D: `set.target(…, 'head')` — `tools/scene.py` tự thêm); `headSide` (−1 / 1):
   * đầu nó quay về bên trái / phải màn hình lúc giữ, khi hình nó lúc dựng còn ở hướng cũ (vừa quay đuôi cho người đo nhiệt độ).
   */
  restrain(target = null, hold = 3, { head = null, headSide = 0 } = {}) {
    if (!(Number.isFinite(hold) && hold > 0)) throw new Error(`[character] restrain: hold must be a number of seconds > 0, got ${JSON.stringify(hold)}`);
    const pet = this._petOf(target);
    if (target && typeof target === 'object' && (target.el || target.rig) && !pet) throw new Error('[character] restrain(pet): the target must be a pet rig (createPet(...).rig)');
    const t = this.tl(), s = this.s, N = this.NGHI, { reach: body, keep } = this._careHand(t, target, 'body');
    const C = { x: body.tx, y: body.ty }, side = C.x >= HONG.x ? 1 : -1;
    // ĐẦU con vật: rig → đo trên hình (giữa mặt); điểm có `head` → điểm ấy; không có gì → coi như đầu quay về phía người, ngang lưng.
    const headAt = head ? this._reachLow(head, body.k, 'head') : pet || (target && target.el) ? this._reachLow(target, body.k, 'eyes') : null;
    const H = headAt ? { x: headAt.tx, y: headAt.ty } : { x: C.x - side * 42, y: C.y - 22 };
    const dir = Math.sign(headSide) || Math.sign(H.x - C.x) || -side;      // phía ĐẦU con vật (theo chiều ngang; `headSide` của tools/scene.py)
    const headNear = dir === -side;                           // đầu con vật quay VỀ PHÍA người giữ
    // NỬA BỀ DÀI THÂN (khung của người): đích là rig → nửa khung thân (`thanE`); đích là điểm (bối cảnh 3D) → khung toàn thân của con
    // vật theo tỉ lệ khung mặt / bề ngang mặt (`span`) — tâm khung toàn thân lệch về phía đầu, nên không lấy (đầu − tâm).
    const full = pet && typeof pet.shotBox === 'function' ? pet.shotBox('full') : null, face = pet && typeof pet.shotBox === 'function' ? pet.shotBox('face') : null;
    const L = !head && body.span ? body.span / 2 : headAt && headAt.span && full && face && face.width ? headAt.span * full.width / face.width / 2 : 50;
    // Hai chỗ giữ, cả hai ở nửa thân phía mình: phía đầu — ngực dưới cằm và bên vai, cả hai THẤP HƠN đầu (người vẽ trước con vật: tay
    // với qua đầu là che mặt nó); phía đuôi — hông và lưng sau.
    const lift = Math.max(6, L * 0.12), down = RigSVG.RESTRAIN_DOWN;
    const hw = Math.max(12, (headAt && headAt.span) || L * 0.6);       // bề ngang đầu con vật
    const near = headNear ? { x: H.x - dir * hw * 0.2, y: Math.max(C.y + lift * (down + 2), H.y + hw * 1.2) } : { x: C.x - dir * L * 0.7, y: C.y + lift * (down + 2) };
    const over = headNear ? { x: H.x - dir * hw * 1.05, y: Math.max(C.y + lift * (down + 0.6), H.y + hw * 1.05) } : { x: C.x - dir * L * 0.2, y: C.y + lift * (down - 0.6) };
    const D = dir * L;
    this._stoopFor(t, body, RigSVG.RESTRAIN_CROUCH);
    const crouch = s.seat > 0.5 || s.kneel > 0.5 ? 0 : Math.max(body.crouch || 0, RigSVG.RESTRAIN_CROUCH);
    const drop = DAI.dui * this.nv.daiDui * this.nv.coChan * 0.72 * crouch;
    // Quay gần nghiêng hẳn về con vật (vai thật khi đã quay); tay có vai gần con vật hơn nhận chỗ XA hơn — hai tay không bắt chéo.
    const facing = s.huong, turn = clamp(facing + side * RigSVG.RESTRAIN_TURN, -1, 1);
    t.to(s, { huong: turn, duration: 0.45, ease: 'sine.inOut' }, 0);
    s.huong = turn;
    const fore = Math.abs(this._shoulderX('L') - C.x) < Math.abs(this._shoulderX('R') - C.x) ? 'L' : 'R', aft = fore === 'L' ? 'R' : 'L';
    const [farP, nearP] = Math.abs(near.x - HONG.x) > Math.abs(over.x - HONG.x) ? [near, over] : [over, near];
    const hand = { [fore]: farP, [aft]: nearP }, back = hand.L === over ? 'L' : 'R';
    // KHUỶU CAO (tay ấn từ trên xuống): cẳng tay chúc xuống lưng / hông con vật, bàn tay úp lên nó — khuỷu thấp (như `_armTo`) thì
    // cẳng tay hất lên, bàn tay dựng đứng trên lưng như đang vẫy.
    const pose = (k, p, dx = 0, dy = 0) => this._armTo(k, p.x + dx, p.y + dy, this._shoulderX(k), this._shoulderY() + drop);
    const a = { L: pose('L', hand.L), R: pose('R', hand.R) };
    // Tay trên lưng XOÈ úp xuống; tay kia NẮM giữ (ngực / hông) — đọc thành "giữ", không phải chìa tay.
    t.set(s, { ['tay' + back]: 'xoe', ['tay' + (back === 'L' ? 'R' : 'L')]: 'nam' }, 0.02);
    t.to(s, { batL: a.L.bat, cangL: a.L.cang, batR: a.R.bat, cangR: a.R.cang, carryL: 0, carryR: 0, than: N.than - side * 4, dau: N.dau + side * 3, dauY: 7,
              cuoi: 0.6, chum: 0, mayL: 0.45, mayR: 0.45, matY: 0.15, duration: 0.5, ease: 'power2.out' }, 0);
    // Đầu cúi / quay về ĐẦU con vật (giữ, dỗ nó) — không nhìn ra máy quay.
    this._lookTo(t, { x: H.x, y: H.y }, 0.1, { d: 0.45 });
    // GIỮ: hai tay ép nhẹ vào thân nó theo nhịp thở (bàn tay không rời con vật — xê dịch ≤ 2 đơn vị), mặt hiền, chớp mắt.
    const hug = 0.5, S = hug + hold;
    for (let at = hug + 0.35; at + 0.7 <= S; at += 1.1) {
      const inL = pose('L', hand.L, -side * 1.5, 1.5), inR = pose('R', hand.R, -side * 1.5, 1.5);
      t.to(s, { batL: inL.bat, cangL: inL.cang, batR: inR.bat, cangR: inR.cang, duration: 0.35, ease: 'sine.inOut' }, at)
       .to(s, { batL: a.L.bat, cangL: a.L.cang, batR: a.R.bat, cangR: a.R.cang, duration: 0.35, ease: 'sine.inOut' }, at + 0.35);
    }
    if (hold > 1.4) this._chop(t, hug + hold * 0.45);
    // DỖ: tay trên lưng vuốt về phía đuôi hai nhịp (trượt sát lưng, nhấc 2 đơn vị lúc quay lại); tay kia vẫn giữ; cười.
    const from = hand[back], to = { x: from.x - dir * L * 0.3, y: from.y + 1.5 };
    const p0 = pose(back, from), p1 = pose(back, to), pUp = pose(back, from, 0, -2);
    const half = RigSVG.RESTRAIN_STROKE / 4;
    for (let n = 0; n < 2; n++) {
      t.to(s, { ['bat' + back]: p1.bat, ['cang' + back]: p1.cang, duration: half, ease: 'sine.inOut' }, S + n * 2 * half)
       .to(s, { ['bat' + back]: pUp.bat, ['cang' + back]: pUp.cang, duration: half * 0.6, ease: 'sine.inOut' }, S + (2 * n + 1) * half)
       .to(s, { ['bat' + back]: p0.bat, ['cang' + back]: p0.cang, duration: half * 0.4, ease: 'sine.in' }, S + (2 * n + 1.6) * half);
    }
    t.to(s, { cuoi: 0.95, mayL: 0.6, mayR: 0.6, matY: 0.3, duration: 0.3 }, S);
    s.huong = facing;
    this._khep(t, 0.5, S + RigSVG.RESTRAIN_STROKE, keep);
    return t;
  }

  // Như `_armTo` nhưng chọn KHUỶU CAO (phía trên đường vai → đích): cẳng tay chúc xuống tới đích (đợt 38 B, `restrain`).
  _armToHigh(k, x, y, sx, sy) {
    const a = DAI.canhTay * this.nv.daiCanhTay, b = DAI.cangTay * this.nv.daiCangTay, deg = 180 / Math.PI;
    const d = clamp(Math.hypot(x - sx, y - sy), Math.abs(a - b) + 1, a + b - 0.5), phi = Math.atan2(y - sy, x - sx) * deg;
    const alpha = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1)) * deg;
    const [u1, u2] = [phi + alpha, phi - alpha], high = (u) => sy + a * Math.sin(u / deg);
    const phiU = high(u1) <= high(u2) ? u1 : u2, ex = sx + a * Math.cos(phiU / deg), ey = sy + a * Math.sin(phiU / deg);
    const phiF = Math.hypot(x - sx, y - sy) > a + b - 0.5 ? phiU : Math.atan2(y - ey, x - ex) * deg;
    const bat = k === 'R' ? 90 - phiU : phiU - 90, cang = k === 'R' ? phiU - phiF : phiF - phiU;
    return { bat: clamp(chuanHoaGoc(bat), -60, 172), cang: chuanHoaGoc(cang), dir: phiF };
  }

  // Đồ đang cầm ở hai tay: cất trong lúc làm động tác hai tay, lấy ra lại khi xong (như `_careHand`) — trả về phần `_khep` giữ lại.
  _stowBoth(t) {
    const s = this.s, keep = {};
    for (const side of ['L', 'R']) if (this.holds[side] && s['item' + side] > 0.5) { t.to(s, { ['item' + side]: 0, ['carry' + side]: 0, duration: 0.15 }, 0); keep['item' + side] = 1; }
    return keep;
  }

  // Chỗ HAI BÀN TAY trước ngực (hệ `_aimOf`) — đầu cúi nhìn xuống đó lúc rửa tay / đeo găng.
  _handsAt(dy = 1.9) {
    const face = this._faceCentre(0);
    return { x: face.x, y: face.y + face.r * dy };
  }

  /**
   * RỬA TAY (diễn không có vòi nước): quay về trước, hai bàn tay chụm trước ngực — xoa hai lòng bàn tay, đan các ngón vào nhau, xoa
   * mu bàn tay này rồi bàn tay kia; BỌT XÀ PHÒNG trắng nổi lên quanh hai bàn tay (lớn dần khi xoa); rồi buông tay xuống VẨY cho khô —
   * bọt rơi đi. Đầu cúi nhìn tay; xong ngẩng lên cười. `hold`: giây xoa (chia ba phần).
   */
  washHands(hold = 2) {
    if (!(Number.isFinite(hold) && hold > 0)) throw new Error(`[character] washHands: hold must be a number of seconds > 0, got ${JSON.stringify(hold)}`);
    const t = this.tl(), s = this.s, N = this.NGHI, keep = this._stowBoth(t), W = WASH_POSE;
    this._faceFront(t);
    t.set(s, { tayL: 'xoe', tayR: 'xoe' }, 0.02);
    t.to(s, { batL: W.rub[0], batR: W.rub[0], cangL: W.rub[1], cangR: W.rub[1], carryL: 0, carryR: 0, aimL: 0, aimR: 0, cuoi: 0.55, mayL: 0.3, mayR: 0.3,
              duration: 0.35, ease: 'power2.out' }, 0);
    this._lookTo(t, this._handsAt(), 0.05, { d: 0.35, huong: 0 });
    // Bọt nổi lên ngay khi hai bàn tay chạm nhau, lớn dần theo những lần xoa.
    const A = 0.35, rub = hold * 0.4, lace = hold * 0.3, backs = hold - rub - lace;
    t.set(s, { gadgetL: 14, gadgetR: 14, foam: 0.45 }, A);
    t.to(s, { foam: 1, duration: Math.min(0.5, rub), ease: 'sine.out' }, A);
    // 1. Xoa hai lòng bàn tay: hai tay trượt ngược chiều nhau lên / xuống.
    const beat = 0.3;
    for (let at = A; at + beat <= A + rub + 1e-6; at += beat) {
      const up = Math.round((at - A) / beat) % 2 === 0;
      t.to(s, { batL: (up ? W.high : W.low)[0], cangL: (up ? W.high : W.low)[1], batR: (up ? W.low : W.high)[0], cangR: (up ? W.low : W.high)[1], duration: beat, ease: 'sine.inOut' }, at);
    }
    // 2. Đan ngón: hai bàn tay lồng sâu vào nhau (cẳng tay gập thêm, chéo qua nhau), ngón xoè, đẩy tới lui.
    const B = A + rub;
    t.to(s, { batL: W.rub[0] + 4, batR: W.rub[0] + 4, cangL: W.rub[1] - 16, cangR: W.rub[1] - 16, duration: 0.22, ease: 'sine.inOut' }, B);
    for (let at = B + 0.22; at + 0.26 <= B + lace + 1e-6; at += 0.26) t.to(s, { cangL: W.rub[1] - (Math.round((at - B) / 0.26) % 2 ? 16 : 10), cangR: W.rub[1] - (Math.round((at - B) / 0.26) % 2 ? 10 : 16), duration: 0.26, ease: 'sine.inOut' }, at);
    // 3. Xoa mu bàn tay: một bàn tay úp lên mu bàn tay kia (cao hơn, vắt qua), xoa; rồi đổi.
    const Cc = B + lace, sw = backs / 2;
    for (const [n, top] of [[0, 'L'], [1, 'R']]) {
      const low = top === 'L' ? 'R' : 'L', at = Cc + n * sw;
      t.to(s, { ['bat' + top]: W.high[0] + 2, ['cang' + top]: W.high[1] - 8, ['bat' + low]: W.low[0], ['cang' + low]: W.low[1], duration: Math.min(0.25, sw / 3), ease: 'sine.inOut' }, at);
      t.to(s, { ['bat' + top]: W.high[0] + 7, duration: Math.max(0.12, sw / 4), ease: 'sine.inOut', yoyo: true, repeat: 1 }, at + Math.min(0.25, sw / 3));
    }
    // 4. VẨY KHÔ: buông hai cẳng tay xuống trước bụng, ngón chúc xuống, vẩy nhanh — bọt bay đi (co nhanh rồi mất).
    const D = A + hold;
    t.set(s, { tayL: 'mo', tayR: 'mo' }, D);
    t.to(s, { batL: 18, batR: 18, cangL: -58, cangR: -58, duration: 0.2, ease: 'power2.out' }, D);
    t.to(s, { foam: 0.05, duration: 0.3, ease: 'power2.in' }, D);
    t.set(s, { gadgetL: 0, gadgetR: 0, foam: 0 }, D + 0.3);
    for (let n = 0; n < 4; n++) t.to(s, { cangL: -58 + (n % 2 ? 14 : -14), cangR: -58 + (n % 2 ? -14 : 14), duration: 0.1, ease: 'sine.inOut' }, D + 0.2 + n * 0.1);
    t.to(s, { cangL: -58, cangR: -58, duration: 0.1, ease: 'sine.inOut' }, D + 0.6);
    this._lookTo(t, null, D + 0.45, { d: 0.35 });
    t.to(s, { cuoi: 1, mayL: 0.55, mayR: 0.55, duration: 0.3 }, D + 0.45);
    this._khep(t, 0.45, D + 0.75, keep);
    return t;
  }

  // ĐEO / THÁO MỘT CHIẾC GĂNG (đợt 38 B), từ giây `at`: tay `k` nhận / bỏ găng, tay `p` kéo. Trả về giây xong.
  //   Đeo: tay kéo xuống hông lấy chiếc găng (hiện trong tay, cầm ở cổ găng, miệng găng quay về phía tay kia), đưa lên trước ngực;
  //   tay kia chìa các ngón vào miệng găng — găng sang tay ấy (bàn tay xanh, mép găng ở giữa bàn tay) —, tay kéo nắm mép găng kéo
  //   lên tới cổ tay, búng một cái (mép găng bật quá cổ tay rồi về).
  //   Tháo: tay kéo nắm mép găng ở cổ tay, lột xuống qua bàn tay — găng rời tay ấy, lộn trái trong tay kéo —, bỏ vào thùng ở hông.
  _gloveOne(t, at, k, p, on) {
    const s = this.s, G = GLOVE_POSE;
    // Tay nhận chìa ra trước ngực (cẳng tay ngang, ngón về giữa), tay kéo ở phía kia: miệng găng / mép găng ngay đầu ngón tay nhận.
    const hold = { ['bat' + k]: G.hold[0], ['cang' + k]: G.hold[1] }, meet = { ['bat' + p]: G.hold[0] + 2, ['cang' + p]: G.hold[1] + 18 };
    const wrist = { ['bat' + p]: G.pull[0], ['cang' + p]: G.pull[1] };
    if (on) {
      t.set(s, { ['tay' + p]: 'nam' }, at);
      t.to(s, { ['bat' + p]: 8, ['cang' + p]: -14, duration: 0.3, ease: 'power2.inOut' }, at);                    // xuống hông lấy găng
      t.set(s, { ['gadget' + p]: 15, ['gadgetTurn' + p]: 180 }, at + 0.3);
      t.to(s, { ...meet, duration: 0.4, ease: 'power2.out' }, at + 0.32);                                             // đưa găng lên, miệng găng về phía tay kia
      t.set(s, { ['tay' + k]: 'xoe' }, at + 0.3);
      t.to(s, { ['bat' + k]: G.hold[0] - 4, ['cang' + k]: G.hold[1] + 14, duration: 0.4, ease: 'power2.out' }, at + 0.32);
      t.to(s, { ...hold, duration: 0.3, ease: 'sine.inOut' }, at + 0.75);                                               // chìa ngón vào miệng găng
      t.set(s, { ['gadget' + p]: 0, ['gadgetTurn' + p]: 0, ['glove' + k]: 0.3 }, at + 1.05);                          // găng sang tay ấy
      t.to(s, { ...wrist, ['glove' + k]: 1, duration: 0.55, ease: 'sine.inOut' }, at + 1.08);                         // kéo mép găng lên cổ tay
      t.to(s, { ['glove' + k]: 1.22, duration: 0.07, ease: 'power2.out' }, at + 1.66)                                 // búng
       .to(s, { ['glove' + k]: 1, duration: 0.1, ease: 'power2.in' }, at + 1.73);
      t.set(s, { ['tay' + p]: 'xoe' }, at + 1.66);
      t.to(s, { ['bat' + p]: G.hold[0] - 6, ['cang' + p]: G.hold[1] + 30, duration: 0.15, ease: 'power2.out' }, at + 1.66);
      t.to(s, { ['bat' + k]: G.hold[0] + 3, duration: 0.12, ease: 'sine.inOut', yoyo: true, repeat: 1 }, at + 1.7);           // bàn tay vừa đeo rung theo cái búng
      return at + 2.0;
    }
    // Tháo: tay kéo tới mép găng ở cổ tay tay kia, lột xuống, găng rời tay, bỏ đi.
    t.set(s, { ['tay' + p]: 'nam' }, at);
    t.to(s, { ...hold, ...wrist, duration: 0.4, ease: 'power2.out' }, at);
    t.to(s, { ...meet, ['glove' + k]: 0.32, duration: 0.55, ease: 'sine.inOut' }, at + 0.45);
    t.set(s, { ['glove' + k]: 0, ['gadget' + p]: 15, ['gadgetTurn' + p]: 0 }, at + 1.0);                               // găng rời tay, rũ xuống trong tay kéo
    t.to(s, { ['bat' + p]: G.hold[0] - 6, ['cang' + p]: G.hold[1] + 40, duration: 0.3, ease: 'power2.out' }, at + 1.02);
    t.to(s, { ['bat' + p]: 10, ['cang' + p]: -20, duration: 0.35, ease: 'power2.inOut' }, at + 1.35);                 // bỏ vào thùng ở hông
    t.set(s, { ['gadget' + p]: 0 }, at + 1.7);
    return at + 1.75;
  }

  /**
   * ĐEO GĂNG TAY Y TẾ: quay về trước, kéo từng chiếc găng vào từng bàn tay (tay kia cầm cổ găng, kéo lên cổ tay, búng), rồi giơ hai
   * bàn tay lên co duỗi ngón, nhìn tay, gật. Găng HIỆN ĐÚNG LÚC tay kéo nó vào và CÒN ĐEO sau đó (thế giữ, như `wear('gloves')`) —
   * `takeOffGloves()` tháo ra. Đồ đang cầm được cất trong lúc đeo, lấy ra lại khi xong. Đang đeo cả hai găng thì báo lỗi.
   */
  putOnGloves() {
    const s = this.s;
    if (s.gloveL >= 0.3 && s.gloveR >= 0.3) throw new Error('[character] putOnGloves: already wearing gloves — takeOffGloves() first');
    const t = this.tl(), keep = this._stowBoth(t), F = GLOVE_POSE.flex;
    this._faceFront(t);
    t.to(s, { aimL: 0, aimR: 0, carryL: 0, carryR: 0, cuoi: 0.5, mayL: 0.3, mayR: 0.3, duration: 0.3 }, 0);
    this._lookTo(t, this._handsAt(), 0.05, { d: 0.35, huong: 0 });
    let at = 0.05;
    for (const k of ['L', 'R']) if (!(s['glove' + k] >= 0.3)) at = this._gloveOne(t, at, k, k === 'L' ? 'R' : 'L', true) + 0.15;
    // Giơ hai bàn tay đeo găng lên trước vai, co duỗi ngón hai nhịp, nhìn tay, gật hài lòng.
    t.set(s, { tayL: 'xoe', tayR: 'xoe' }, at);
    t.to(s, { batL: F[0], batR: F[0], cangL: F[1], cangR: F[1], duration: 0.35, ease: 'power2.out' }, at);
    this._lookTo(t, this._handsAt(1.3), at, { d: 0.3, huong: 0 });
    for (let n = 0; n < 4; n++) t.set(s, { tayL: n % 2 ? 'xoe' : 'nam', tayR: n % 2 ? 'xoe' : 'nam' }, at + 0.45 + n * 0.25);
    t.set(s, { tayL: 'xoe', tayR: 'xoe' }, at + 1.45);
    t.to(s, { cuoi: 1, mayL: 0.55, mayR: 0.55, dauY: 6, duration: 0.18, ease: 'sine.out', yoyo: true, repeat: 1 }, at + 1.2);
    this._lookTo(t, null, at + 1.35, { d: 0.3 });
    this._khep(t, 0.45, at + 1.6, { ...keep, gloveL: 1, gloveR: 1 });
    return t;
  }

  /**
   * THÁO GĂNG: tay này nắm mép găng ở cổ tay kia lột xuống qua bàn tay (găng lộn trái, rời tay), bỏ vào thùng ở hông; rồi tay kia.
   * Bàn tay trần trở lại đúng lúc găng rời nó. Không đeo găng thì báo lỗi.
   */
  takeOffGloves() {
    const s = this.s;
    if (!(s.gloveL >= 0.3 || s.gloveR >= 0.3)) throw new Error("[character] takeOffGloves: not wearing gloves — putOnGloves() or wear('gloves') first");
    const t = this.tl(), keep = this._stowBoth(t);
    this._faceFront(t);
    t.to(s, { aimL: 0, aimR: 0, carryL: 0, carryR: 0, cuoi: 0.45, mayL: 0.3, mayR: 0.3, duration: 0.3 }, 0);
    this._lookTo(t, this._handsAt(), 0.05, { d: 0.35, huong: 0 });
    let at = 0.05;
    for (const k of ['R', 'L']) if (s['glove' + k] >= 0.3) { t.set(s, { ['tay' + k]: 'xoe' }, at); at = this._gloveOne(t, at, k, k === 'L' ? 'R' : 'L', false) + 0.1; }
    this._lookTo(t, null, at, { d: 0.3 });
    t.to(s, { cuoi: 0.9, mayL: 0.5, mayR: 0.5, duration: 0.25 }, at);
    this._khep(t, 0.45, at + 0.1, { ...keep, gloveL: 0, gloveR: 0 });
    return t;
  }

  /**
   * ĐỌC BỆNH ÁN: đưa bìa kẹp hồ sơ đang cầm (`items: { R: 'clipboard' }`) lên trước ngực (phóng to cho đọc được), cúi xuống
   * đọc — mắt dò theo dòng —, tay kia lật tờ trên cùng lên, đọc tiếp, ngẩng lên gật. Đang cất bìa (`itemsHidden`) thì lấy ra
   * rồi cất lại. Không cầm bìa hồ sơ thì báo lỗi.
   */
  readChart(hold = 2, { side = 'auto', to = null, gaze = to } = {}) {
    const s = this.s, N = this.NGHI, board = (k) => this.holds[k] && this.el['item' + k] && this.el['item' + k].querySelector('[data-clipboard]');
    const k = side === 'L' || side === 'R' ? side : ['R', 'L'].find(board);
    if (!k || !board(k)) throw new Error('[character] readChart: the character is not holding a clipboard' + (side === 'L' || side === 'R' ? ` in hand ${side}` : '') + ' — give it one: createCharacter(host, { id, items: { R: "clipboard" } })');
    if (!(Number.isFinite(hold) && hold > 0)) throw new Error(`[character] readChart: hold must be a number of seconds > 0, got ${JSON.stringify(hold)}`);
    const t = this.tl(), pen = k === 'L' ? 'R' : 'L', m = k === 'L' ? -1 : 1, stowed = s['item' + k] < 0.5;
    this._openUp(t);
    if (stowed) t.to(s, { ['item' + k]: 1, duration: 0.15 }, 0);
    t.to(s, { ['carry' + k]: 0, duration: 0.15 }, 0);
    // CÚI ĐẦU RÕ xuống tấm bảng (lượt ba — Gemini đọc ~1 khung / giây, chỉ thấy ĐẦU cúi / nghiêng, không thấy mắt liếc khi mặt
    // nhỏ): đầu nghiêng `CHART_TILT` độ về phía bảng và hạ xuống, mắt nhìn xuống, mí hạ.
    const read = { dauY: CHART_DOWN, dau: N.dau + m * CHART_TILT, nhinY: LOOK_DOWN.eyes, matY: LOOK_DOWN.lids };
    // Đợt 36: đầu CÚI hẳn về tấm bảng trước ngực (`lookAt`: nét mặt trượt xuống, mí hạ), thêm vào dáng nghiêng / hạ đầu ở trên.
    const face = this._faceCentre(), boardAt = { x: face.x + m * face.r * 0.35, y: face.y + face.r * 2 };
    this._lookTo(t, boardAt, 0, { d: 0.5 });
    // Đợt 37: người đang ĐỨNG NGHIÊNG (quay về con vật, `huong` 0,55) — tấm bìa trước ngực hiện ngay dưới mặt trên màn hình, mà
    // `_lookAngles` giữ đầu theo hướng thân (đích ở trước mặt): tia nhìn đi chéo sang con vật, lệch tấm bìa 59 % chiều cao mặt
    // (acting_check). Lúc đọc, đầu quay về phía trước, chỗ tấm bìa — rồi ngẩng lên quay sang người nghe như cũ.
    if (Math.abs(s.huong) > 0.15) t.to(s, { headTurn: clamp(-s.huong * CHART_FRONT, -RigSVG.LOOK_TURN_MAX, RigSVG.LOOK_TURN_MAX), duration: 0.5, ease: 'power2.inOut' }, 0);
    t.to(s, { ['bat' + k]: CHART_POSE.hold[0], ['cang' + k]: CHART_POSE.hold[1], ['itemZoom' + k]: CHART_POSE.zoom, ...read, cuoi: 0.25, mayL: 0.25, mayR: 0.25, duration: 0.5, ease: 'power2.out' }, 0);
    // Mắt dò từng dòng (trái → phải), đầu nhích theo dòng — vẫn cúi.
    const scan = (from, to) => { for (let a = from; a + 0.5 <= to; a += 0.5) t.to(s, { nhinX: -1.2, dau: read.dau - m * 1.5, duration: 0.08, ease: 'sine.out' }, a).to(s, { nhinX: 1.2, dau: read.dau + m * 1.5, duration: 0.38, ease: 'sine.inOut' }, a + 0.1); };
    const flip = 0.5 + Math.max(1.3, hold * 0.6);                 // đọc tờ đầu ≥ 1,3 s rồi mới lật
    scan(0.55, flip - 0.45);
    // LẬT TRANG MỀM: tay kia lên mép dưới tờ giấy, kéo nó cong lên, vòng qua mép kẹp ra SAU bảng (`page` 0 → 1: tờ giấy cong,
    // co dần về mép kẹp, vượt qua kẹp rồi khuất sau bảng) — không còn dựng cứng trên đầu tấm bảng (Gemini lượt hai, 00:06).
    t.set(s, { ['tay' + pen]: 'nam' }, flip - 0.45);
    t.to(s, { ['bat' + pen]: CHART_POSE.flip[0], ['cang' + pen]: CHART_POSE.flip[1], nhinX: 0, duration: 0.4, ease: 'power2.out' }, flip - 0.45);
    // Đợt 36: LẬT TO, RÕ — bìa phóng to thêm (`CHART_FLIP_ZOOM`) suốt lúc lật, tờ giấy DỪNG ở giữa vòng lật (dựng cong trên mép kẹp)
    // 0,35 s rồi mới lật nốt — ở 1 khung / giây (cách Gemini đọc phim) lượt trước lúc thấy lúc không.
    t.to(s, { ['itemZoom' + k]: CHART_FLIP_ZOOM, duration: 0.35, ease: 'power2.out' }, flip - 0.45);
    t.to(s, { ['page' + k]: 0.55, ['bat' + pen]: CHART_POSE.flip[0] + 9, ['cang' + pen]: CHART_POSE.flip[1] - 11, duration: 0.45, ease: 'sine.out' }, flip);
    t.to(s, { ['page' + k]: 1, ['bat' + pen]: CHART_POSE.flip[0] + 14, ['cang' + pen]: CHART_POSE.flip[1] - 18, duration: 0.3, ease: 'sine.in' }, flip + 0.8);
    t.to(s, { ['bat' + pen]: N['bat' + pen], ['cang' + pen]: N['cang' + pen], duration: 0.4, ease: 'power2.inOut' }, flip + 1.1);
    t.to(s, { ['itemZoom' + k]: CHART_POSE.zoom, duration: 0.35, ease: 'power2.inOut' }, flip + 1.15);
    t.set(s, { ['tay' + pen]: N['tay' + pen] }, flip + 1.5);
    // Đọc tờ sau ≥ 1,2 s, vẫn cúi.
    const up = flip + 0.85 + Math.max(1.2, hold * 0.4);
    scan(flip + 0.9, up - 0.05);
    // NGẨNG LÊN nhìn người đối diện (giữ 0,4 s), cười, rồi GẬT hai nhịp CHẬM, sâu (0,35 s xuống, 0,35 s lên) — ở 1 khung / giây
    // vẫn bắt được đầu cúi.
    t.to(s, { dauY: 0, dau: N.dau, nhinY: 0, matY: 0, nhinX: 0, cuoi: 0.85, mayL: 0.55, mayR: 0.55, duration: 0.35, ease: 'power2.out' }, up);
    // Đợt 36: NGẨNG lên nhìn NGƯỜI NGHE (`to` / `gaze`: rig, `set.target(…)`, điểm) — đầu quay hẳn về phía họ, giữ qua hai lần gật và sau
    // bước (thế `lookAt`); không có người nghe thì đầu về thẳng.
    const listen = this._lookAngles(this._lookPoint(gaze));
    t.to(s, { headTurn: listen.headTurn, headPitch: listen.headPitch, headTilt: listen.headTilt, duration: 0.4, ease: 'power2.inOut' }, up);
    // Mỗi lần gật: xuống 0,3 s, GIỮ ở đáy 0,35 s, lên 0,3 s — ở 1 khung / giây (cách Gemini đọc video) vẫn có khung rơi vào lúc đầu
    // đang cúi (lượt ba, tự xem phim ở 1 khung / giây: gật 0,35 + 0,35 s không khung nào bắt được).
    for (let i = 0; i < 2; i++) {
      const a = up + 0.75 + i * 1.25;       // đợt 36: mỗi lần gật 1,25 s, giữ ở đáy 0,55 s
      t.to(s, { dauY: CHART_NOD, nhinY: 2, vai: N.vai + 3, matY: 0.3, duration: 0.3, ease: 'sine.inOut' }, a)
       .to(s, { dauY: 0, nhinY: 0, vai: N.vai, matY: 0, duration: 0.3, ease: 'sine.inOut' }, a + 0.85);
      // Đợt 36: GẬT THẬT — đầu cúi hẳn (`headPitch` lên CHART_NOD_PITCH ≈ 22°: nét mặt trượt xuống, mí hạ) cùng lúc hạ đầu, giữ ở đáy;
      // Gemini (1 khung / giây) thấy ngẩng lên mà "không gật" khi chỉ có `dauY`.
      // Đợt 37: cúi THÊM CHART_NOD_PITCH tính từ chỗ đang nhìn người nghe — người nghe thấp (một đứa trẻ) thì đầu đã cúi sẵn
      // ~13°, gật tới 22° tuyệt đối chỉ còn nhích 9° (acting_check: "giữa hai lần gật vẫn cúi 12°").
      t.to(s, { headPitch: Math.min(1, Math.max(0, listen.headPitch) + CHART_NOD_PITCH), duration: 0.3, ease: 'sine.inOut' }, a)
       .to(s, { headPitch: listen.headPitch, duration: 0.3, ease: 'sine.inOut' }, a + 0.85);
    }
    // Tờ đã lật nằm sau bảng: đặt lại tờ trên cùng khi bìa đã hạ (khép xong) — không lật ngược lại trước mắt người xem.
    const end = up + 3.25;
    this._khep(t, 0.5, end, { ['page' + k]: 1, ...(stowed ? { ['item' + k]: 0 } : {}), headTurn: listen.headTurn, headPitch: listen.headPitch, headTilt: listen.headTilt });
    t.set(s, { ['page' + k]: 0 }, end + 0.5);
    return t;
  }

  /**
   * CHỈ PHIM X-QUANG: quay 3/4 về phía tấm phim / màn hình `target` (phần tử, `{ x, y }` trong khung 400 × 470, hay
   * `set.targetPoint(…)`), giơ ngón trỏ chỉ vào một điểm trên phim, nhấn hai nhịp "chỗ này" (`hold` giây), rồi quay lại
   * (hướng cũ) — tay hạ, mày nhướn, sẵn sàng nói. Đạo cụ `xray` có sẵn điểm chỉ (`createProp(host, 'xray').spot`).
   */
  showXray(target = null, hold = 1.6, { to = null, gaze = to } = {}) {
    if (!(Number.isFinite(hold) && hold > 0)) throw new Error(`[character] showXray: hold must be a number of seconds > 0, got ${JSON.stringify(hold)}`);
    const t = this.tl(), s = this.s;
    // `to` (đợt 35, lượt hai): NGƯỜI NGHE — xong thì quay hẳn về phía họ và giữ hướng ấy (như `face`), không quay ra máy quay.
    let before = s.huong;
    if (to && typeof to === 'object') {
      const box = to.getBoundingClientRect ? to.getBoundingClientRect() : null;
      const dx = (typeof to.centerX === 'function' ? to.centerX() : box ? box.left + box.width / 2 : this.centerX()) - this.centerX();
      if (Math.abs(dx) >= 1) before = (dx < 0 ? -1 : 1) * XRAY_LISTEN;
    } else if (to === 'left' || to === 'right') before = (to === 'left' ? -1 : 1) * XRAY_LISTEN;
    else if (to !== null && to !== 'front') throw new Error(`[character] showXray: { to } is the listener — a rig, an element, 'left', 'right' or 'front', got ${JSON.stringify(to)}`);
    else if (to === 'front') before = 0;
    // Góc tay tính ở hướng SẼ quay tới (vai dồn vào giữa khi quay 3/4): tính ở hướng đang đứng thì tay chỉ lệch đích.
    const side = this._aimOf(target).ben, turn = (side === 'L' ? -1 : 1) * XRAY_TURN;
    s.huong = turn; const { ben, bat, dau, nhinX, nhinY } = this._aimOf(target); s.huong = before;
    t.to(s, { huong: turn, nhinX, duration: 0.4, ease: 'sine.inOut' }, 0);
    t.set(s, { ['tay' + ben]: 'nam' }, 0.1);
    t.to(s, { ['aim' + ben]: 1, duration: 0.3, ease: 'sine.inOut' }, 0.1);
    // Đợt 36: ĐẦU quay / ngẩng về ĐIỂM CHỈ trên phim (`lookAt`), giữ suốt lúc chỉ.
    const film = this._lookPoint(target);
    if (film) this._lookTo(t, film, 0.1, { d: 0.45, huong: turn });
    t.to(s, { ['bat' + ben]: bat, ['cang' + ben]: 0, dau, nhinY, cuoi: 0.4, chum: 0.2, mayL: 0.45, mayR: 0.45, duration: 0.45, ease: 'back.out(1.2)' }, 0.15);
    t.set(s, { ['tay' + ben]: 'chi' }, 0.35);
    // Nhấn hai nhịp vào điểm trên phim.
    for (const at of [0.75, 0.75 + hold * 0.5]) t.to(s, { ['cang' + ben]: 5, ['bat' + ben]: bat + 1.5, dauY: 2.5, duration: 0.14, ease: 'power2.out', yoyo: true, repeat: 1 }, at);
    // Quay lại người nghe: tay hạ (khép), mày nhướn, miệng hé — sẵn sàng giải thích.
    const back = 0.6 + hold, look = Math.sign(before) * 1.6;
    t.to(s, { nhinX: look, nhinY: 0, dau: 0, chum: 0, mayL: 0.65, mayR: 0.65, cuoi: 0.8, mieng: 0.25, duration: 0.35, ease: 'sine.inOut' }, back);
    // Đợt 36: đầu quay về NGƯỜI NGHE (`gaze`, mặc định `to`) và GIỮ sau bước (thế `lookAt` — động tác sau thả ra).
    const was = s.huong; s.huong = before;
    const listen = gaze && gaze !== 'front' && typeof gaze === 'object' ? this._lookAngles(this._lookPoint(gaze), { huong: before }) : { headTurn: 0, headPitch: 0, headTilt: 0 };
    s.huong = was;
    this._khep(t, 0.55, back + 0.1, { huong: before, nhinX: look, headTurn: listen.headTurn, headPitch: listen.headPitch, headTilt: listen.headTilt });
    // Có người nghe: GIỮ hướng mới ≥ 1 s trong chính bước này (lượt ba — Gemini 1 khung / giây: thấy rõ đã quay về phía bà).
    if (to && to !== 'front') t.to(s, { cuoi: 0.9, duration: XRAY_FACE_HOLD, ease: 'none' }, back + 0.65);
    return t;
  }

});
