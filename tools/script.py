#!/usr/bin/env python3
"""KỊCH BẢN BẰNG CHỮ THƯỜNG → tệp cảnh (scene.json) → composition HyperFrames.

    python3 tools/script.py kich-ban.txt              → kich-ban.scene.json, rồi dựng bằng tools/scene.py
    python3 tools/script.py kich-ban.txt --no-build   → chỉ viết kich-ban.scene.json (sửa tay tiếp được)

Một tệp kịch bản:

    bối cảnh: phòng khám · máy: tự động · khung: dọc
    mở đầu: Đặt lịch khám trong 30 giây | Nhắc lịch tái khám tự động
    kết thúc: VetGo | Phòng khám thú y trong túi bạn | Tải app VetGo ngay
    logo: logo.png
    bác sĩ (vet) · bé trai (boy) · chó (corgi, trên bàn) · mèo (calico)

    chó: [sợ]
    bác sĩ: Đừng sợ, cô khám nhẹ thôi mà!
    bác sĩ → chó: cho thuốc
    bác sĩ (vui): Giỏi lắm!
    bé trai (lo lắng): Dạ... hôm qua bé ăn vụng sô-cô-la ạ.
    chó: [hối lỗi, vẫy đuôi]
    cùng lúc: bác sĩ: [gật đầu] | chó: [vẫy đuôi]

  Dòng đầu (khoá: giá trị, nối nhau bằng " · "):
    bối cảnh   phòng khám · lễ tân · nhà thuốc · công viên · đường phố · phòng khách
    ánh sáng   ngày (mặc định) · chiều (chạng vạng, nắng xiên, bóng dài) · tối (đèn là nguồn sáng)
               · "chiều → tối" (trời tối dần từ giữa cảnh, đèn tự bật)
    máy        tự động (mặc định: máy tự chọn mọi góc) · cố định (một góc toàn cảnh)
    khung      ngang (1920×1080, mặc định) · dọc (1080×1920: TikTok, Reels, Shorts)
    mở đầu / kết thúc   tiêu đề | dòng phụ | nút (thẻ đầu / cuối phim) · logo  tệp ảnh · nhạc  tệp nhạc nền
  Dòng nhân vật: tên (mã, tuỳ chọn, …) nối bằng " · ". Mã: vet, boy, granny… hoặc loài thú dog, cat, corgi, calico,
    rabbit… Tuỳ chọn: "trên bàn" / "trên ghế" / "trên quầy" (đứng / ngồi trên hộp của bối cảnh), "ngồi" (người ngồi
    trên ghế), "đeo loa", "băng chân", "giọng maichi" (tự tạo giọng đọc bằng voice-tts).
  Dòng kịch bản:
    tên: lời thoại                     tên (tâm trạng): lời thoại
    tên: [hành động, hành động]        thú: [sợ] — một cảm xúc; [sợ, run] — giữ nét mặt sợ trong lúc run
    tên: [bật đèn] / [tắt đèn]         bật / tắt cây đèn của bối cảnh (phòng khách, công viên…)
    tên: [mất điện] / [có điện]        mọi đèn và màn hình tắt phụt / bật lại
    tên: [trời tối dần] / [hoàng hôn] / [trời sáng]   trời chuyển giờ trong 6 giây
    tên: [giơ bảng: Giảm 20%]          người giơ tấm bảng chữ trước ngực (1–3 dòng ngắn, ngắt bằng |; chữ có dấu phẩy thì đặt trong "…")
    tên: [to cỡ này] [nhỏ cỡ này] [ra dấu kích thước]   hai bàn tay ra dấu kích thước · [selfie] [chụp ảnh tự sướng] [chụp hình] (tự có điện
                                       thoại) · [ngáp] [vươn vai] (người: ngáp + vươn hai tay qua đầu; thú vẫn ngáp / vươn vai kiểu thú)
    tên → tên khác: selfie             chụp ảnh tự sướng CÙNG người / con vật kia (họ nghiêng vào khung hình, bước lại gần)
    tên → tên khác: hành động          cho thuốc, cho bánh, vuốt ve, khám, bế, chải lông, tiêm, nghe tim, bắt tay, chỉ vào, rọi đèn (đèn pin),
                                       cân (tự có cái cân cạnh người cân), đo nhiệt độ, cho uống thuốc (giữ đầu, đưa viên thuốc vào mõm)
                                       băng chân, đeo loa (băng / loa còn lại trên con vật)
                                       cắt móng, nhỏ mắt, vệ sinh tai / lau tai, quét chip (hay "quét chip 900 123 456 789": mã hiện trên thẻ)
                                       giữ (giữ con vật cho người khác: "cùng lúc: y tá → chó: giữ | bác sĩ → chó: tiêm")
    tên: [rửa tay] [đeo găng] [tháo găng]   rửa tay (bọt xà phòng, vẩy khô), đeo / tháo găng tay y tế (găng còn đeo tới khi tháo)
    tên: [đọc bệnh án]                 cầm bìa hồ sơ (tự giao), đọc, lật trang, ngẩng lên gật
    tên: [chỉ phim]                    quay sang đèn đọc phim X-quang (tự đặt cạnh người ấy), chỉ vào chỗ rạn, quay lại
                                       con vật → người: liếm (tay; người bế nó thì liếm mặt), nấp (chạy nấp sau người ấy)
    con vật: [lăn ngửa] [đuổi đuôi] [nhào] [gặm cà rốt]   chó / mèo lăn ngửa, chó đuổi đuôi, mèo nhào, thỏ gặm cà rốt
    COMBO (cả một chuỗi):              bác sĩ → chó: khám tổng quát · bác sĩ → chó: tiêm phòng (cân, tiêm, cho bánh)
                                       bác sĩ → chó → bé trai: trả thú (bế, trao cho chủ, dặn ba điều, vẫy chào)
                                       lễ tân: [chào khách] · bé trai: [tin vui] / [tin buồn] / [sốt ruột]
    cùng lúc: tên: … | tên: …          các lượt diễn cùng một lúc
    LỒNG TIẾNG (lời dẫn đè lên hình):  máy quay vào ĐỘNG TÁC, không cắt sang người nói
      mẹ (lồng tiếng) → mèo: [chui hộp] | Mèo nhà mình thích chui hộp lắm.     người (hay người dẫn) nói câu sau dấu "|", con vật làm động tác
      cùng lúc (quay mèo): mẹ: Mèo nhà mình … | mèo: [chui hộp]                 dạng đầy đủ — "quay …" chọn ai vào khung; thêm cận / trung / toàn
                                                                                  (cùng lúc (quay mèo, cận): …). Không ghi "(quay …)" mà trong nhóm có người dẫn
                                                                                  không hiện hình thì máy tự vào những ai đang diễn (không nói).
      Cỡ cảnh tự chọn: một con thú → cận (một mình, scene.py chọn độ choán khung theo động tác: 0,62–0,95); thú + người, hay nhiều thú → trung.
    NGƯỜI DẪN KHÔNG HIỆN HÌNH (chỉ có giọng + phụ đề, không có thân trên màn hình, máy không bao giờ quay vào):
      khai ở dòng nhân vật với mã "lồng tiếng" (hay "không hiện"):   lời dẫn (lồng tiếng, giọng baotrang) · mèo (calico) · chó (corgi)
      rồi:  lời dẫn: Chào mừng các bạn tới nhà bé Mốc.       (lượt riêng: máy giữ góc đang có)
            cùng lúc (quay mèo): lời dẫn: Mèo thích chui hộp. | mèo: [chui hộp]       hay      lời dẫn (lồng tiếng) → mèo: [chui hộp] | Mèo thích chui hộp.
      Người dẫn chỉ nói (không [hành động], không tâm trạng); "giọng …" nếu muốn có tiếng đọc (voice-tts), không thì phụ đề ước lượng giờ.
    thông báo: Tiêu đề | nội dung      thẻ thông báo của ứng dụng trượt vào khung ở lượt kế tiếp
  Dòng bắt đầu bằng # là ghi chú. Hành động / tâm trạng viết tiếng Việt hay tên gốc (wave, happy…) đều được.

  "mở đầu: hook | Tiêu đề | dòng phụ" — chữ lớn bật lên trên cảnh đầu đang diễn, thay cho thẻ tĩnh (video ngắn).

  PHIM NHIỀU CẢNH: mỗi dòng "=== tên · bối cảnh: … · ánh sáng: … · máy: …" mở một cảnh. Phần trước dòng === đầu tiên
  là phần chung: khung, nhạc (nhạc nền cả phim), mở đầu (cảnh đầu), kết thúc (cảnh cuối), logo, dàn nhân vật (mỗi cảnh
  chỉ giữ ai có mặt; một dòng nhân vật trong cảnh thêm / đổi người cho cảnh ấy). Viết kich-ban-1.scene.json,
  kich-ban-2.scene.json…, kich-ban.film.json rồi dựng cả phim (tools/film.py → kich-ban.mp4, .srt, .jpg).
"""
import argparse, json, os, re, subprocess, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
PET_SPECIES = ('dog', 'cat', 'rabbit', 'shiba', 'orange_cat', 'black_cat', 'corgi', 'poodle', 'husky', 'black_dog', 'white_cat', 'calico')
PRESETS = {'phòng khám': 'exam', 'khám': 'exam', 'lễ tân': 'reception', 'quầy lễ tân': 'reception', 'nhà thuốc': 'pharmacy', 'quầy thuốc': 'pharmacy',
           'công viên': 'park', 'đường phố': 'street', 'phố': 'street', 'phòng khách': 'living-room', 'nhà': 'living-room'}
# Hộp của từng bối cảnh (theo tools/scene.py SET_PRESETS) mà một nhân vật có thể đứng / ngồi lên.
BOXES = {'exam': {'table': (100, -480, 200, 160)}, 'reception': {'counter': (-520, -430, 440, 140), 'bench': (330, -820, 360, 120)},
         'pharmacy': {'counter': (-260, -420, 520, 130)}, 'park': {'bench': (220, -880, 340, 110)},
         'living-room': {'sofa': (-560, -860, 520, 180), 'coffee-table': (80, -700, 220, 120)}, 'street': {}}       # x, z, rộng, sâu
ON_WORDS = {'bàn': ('table', 'coffee-table', 'counter'), 'quầy': ('counter',), 'ghế': ('bench', 'sofa'), 'sofa': ('sofa',), 'ghế đá': ('bench',)}
PERSON_MOODS = {'vui': 'happy', 'buồn': 'sad', 'ngạc nhiên': 'surprised', 'giận': 'angry', 'tức giận': 'angry', 'suy nghĩ': 'thinking', 'cười': 'laughing',
                'cười lớn': 'laughing', 'lo': 'worried', 'lo lắng': 'worried', 'bối rối': 'confused', 'mệt': 'tired', 'khóc': 'crying', 'ngượng': 'embarrassed',
                'buồn ngủ': 'sleepy'}
PET_MOODS = {'vui': 'happy', 'hào hứng': 'excited', 'phấn khích': 'excited', 'buồn': 'sad', 'sợ': 'scared', 'sợ hãi': 'scared', 'giận': 'angry', 'tò mò': 'curious',
             'hối lỗi': 'guilty', 'có lỗi': 'guilty', 'đau': 'pain', 'buồn ngủ': 'sleepy'}
# ĐỢT 40 A — sáu động tác của chó (gộp vào ACTIONS / TARGETED ngay sau khi hai bảng ấy được định nghĩa). "rủ chơi" giờ là `playBow` (chổng mông, một mình);
# "chó → bé: kéo co" / "dựa chân" / "tha đồ chơi" cần người làm đích.
ACTIONS_40A = {'rủ chơi': 'playBow', 'chổng mông': 'playBow', 'tru': 'howl', 'hú': 'howl', 'đào': 'dig', 'đào đất': 'dig', 'bới': 'dig',
               'ngậm đồ chơi': 'carryToy', 'tha đồ chơi': 'carryToy'}; TARGETED_40A = {'kéo co': ('tugOfWar', None), 'dựa chân': ('leanOnLeg', None), 'dựa vào chân': ('leanOnLeg', None),
               'tha đồ chơi': ('carryToy', None), 'ngậm đồ chơi': ('carryToy', None)}
ACTIONS = {'vẫy tay': 'wave', 'chào': 'wave', 'gật đầu': 'nod', 'lắc đầu': 'shake', 'vỗ tay': 'clap', 'giơ ngón cái': 'thumbsUp', 'like': 'thumbsUp',
           'suy nghĩ': 'ponder', 'khoanh tay': 'crossArms', 'chống nạnh': 'handsOnHips', 'nhún vai': 'shrug', 'reo': 'cheer', 'ăn mừng': 'cheer',
           'cúi chào': 'bow', 'gãi đầu': 'scratchHead', 'xem đồng hồ': 'checkWatch', 'giới thiệu': 'introduce', 'gọi': 'callOut', 'thở phào': 'relief',
           'giật mình': 'startle', 'nhìn quanh': 'lookAround', 'vội': 'hurry', 'chê': 'thumbsDown', 'ra hiệu dừng': 'stopSign', 'lắc ngón tay': 'fingerWag',
           'vẫy lại gần': 'beckon', 'bắn tim': 'fingerHeart', 'chữ v': 'vSign', 'ngồi xuống': 'sitDown', 'đứng dậy': 'standUp', 'quỳ': 'kneel',
           'vẫy đuôi': 'wagTail', 'sủa': 'bark', 'ngồi': 'sit', 'nhảy': 'jump', 'xin': 'beg', 'bắt tay': 'givePaw', 'đánh hơi': 'sniff', 'kêu': 'meow',
           'meo': 'meow', 'gừ gừ': 'purr', 'liếm chân': 'lickPaw', 'vươn vai': 'stretch', 'xù lông': 'hiss', 'quẫy đuôi': 'tailSwish', 'vồ': 'pounce',
           'nghiêng đầu': 'tiltHead', 'nằm': 'lieDown', 'ngủ': 'sleep', 'mệt': 'unwell', 'ốm': 'unwell', 'gãi': 'scratchItch', 'gãi ngứa': 'scratchItch',
           'đi khập khiễng': 'limp', 'khập khiễng': 'limp', 'run': 'tremble', 'ăn': 'eat', 'uống nước': 'drink', 'ho': 'cough', 'há miệng': 'openMouth',
           'rũ nước': 'shakeOff', 'hắt hơi': 'sneeze', 'thở hổn hển': 'pant', 'ngáp': 'yawn', 'dụi': 'rub', 'mừng': 'greet', 'rủ chơi': 'play', 'nhai': 'chew',
           'nhảy cóc': 'hop', 'giậm chân': 'thump', 'đứng yên': 'idle', 'chờ': 'idle', 'rọi đèn pin': 'shine', 'bật đèn pin': 'shine',
           'lăn ngửa': 'rollOver', 'lăn': 'rollOver', 'đuổi đuôi': 'chaseTail', 'nhào': 'knead', 'nhào bột': 'knead', 'nhồi': 'knead',
           'gặm cà rốt': 'eatCarrot', 'ăn cà rốt': 'eatCarrot',
           # đợt 35: hồ sơ & phim X-quang (người)
           'đọc bệnh án': 'readChart', 'xem bệnh án': 'readChart', 'đọc hồ sơ': 'readChart', 'xem hồ sơ': 'readChart',
           'chỉ phim': 'showXray', 'chỉ phim x-quang': 'showXray', 'xem phim x-quang': 'showXray', 'chỉ x-quang': 'showXray'}
ACTIONS.update(ACTIONS_40A)       # đợt 40 A
# ĐỢT 39 B — sáu cử chỉ thường ngày không đạo cụ. "cười" vẫn là TÂM TRẠNG ("tên (cười): lời"); "[cười lớn]" / "[cười ha hả]" trong ngoặc
# vuông là ĐỘNG TÁC cười cả người (`laugh`: ngửa đầu, vai rung, tay ôm bụng) — xem BRACKET_FIRST. "(cười lớn)" trong ngoặc tròn vẫn là nét mặt.
ACTIONS.update({'cười lớn': 'laugh', 'cười ha hả': 'laugh', 'lau nước mắt': 'wipeTears', 'chùi nước mắt': 'wipeTears', 'che mặt': 'facepalm',
                'ôm trán': 'facepalm', 'facepalm': 'facepalm', 'suỵt': 'shush', 'ra hiệu im lặng': 'shush', 'ok': 'okSign', 'ra dấu ok': 'okSign',
                'giơ tay chào': 'salute', 'chào kiểu quân đội': 'salute', 'salute': 'salute'})
BRACKET_FIRST = {'cười lớn'}              # trong "[…]": từ này vừa là tâm trạng vừa là động tác — ưu tiên ĐỘNG TÁC
TARGETED = {'cho thuốc': ('giveTreat', {'kind': 'pill'}), 'uống thuốc': ('giveTreat', {'kind': 'pill'}), 'cho bánh': ('giveTreat', None), 'cho ăn': ('giveTreat', None),
            'vuốt ve': ('stroke', None), 'xoa đầu': ('stroke', None), 'khám': ('examine', None), 'soi đèn': ('examine', None), 'rọi đèn': ('shine', None), 'rọi đèn pin': ('shine', None), 'soi đèn pin': ('shine', None), 'bế': ('carry', None),
            'chải lông': ('brush', None), 'tiêm': ('inject', None), 'nghe tim': ('listen', None), 'bắt tay': ('handshake', None), 'chỉ vào': ('point', None),
            'chỉ': ('point', None), 'đưa': ('handOver', None), 'trao': ('handOverPet', None), 'dắt': ('leash', None), 'nhìn': ('face', None),
            # đợt 35: băng chân, đeo loa chống liếm — còn lại trên con vật
            'băng chân': ('bandage', None), 'băng bó': ('bandage', None), 'quấn băng': ('bandage', None), 'băng': ('bandage', None),
            'đeo loa': ('putCone', None), 'đeo vòng chống liếm': ('putCone', None), 'đeo vòng cổ chống liếm': ('putCone', None),
            'liếm': ('lick', None), 'liếm tay': ('lick', None), 'liếm mặt': ('lick', None), 'nấp': ('hide', None), 'trốn': ('hide', None), 'nấp sau': ('hide', None)}
TARGETED.update(TARGETED_40A)      # đợt 40 A
# ĐỢT 39 A — quầy thu ngân & quầy cà phê: trả tiền (quét mã QR / quẹt thẻ), thối tiền, đóng dấu thẻ, rót nước, lau quầy. Người làm tự có đồ cần cầm
# (điện thoại, thẻ ngân hàng, xấp tiền, thẻ tích điểm, cốc) — xem `needs` bên dưới; người nhận có sẵn món đồ đang cất (tools/scene.py).
TARGETED.update({'thối tiền': ('giveChange', None), 'trả tiền thừa': ('giveChange', None), 'đóng dấu': ('stampCard', None), 'đóng dấu thẻ': ('stampCard', None)})
ACTIONS.update({'trả tiền': 'payByQR', 'quét mã': 'payByQR', 'quét qr': 'payByQR', 'quét mã qr': 'payByQR', 'thanh toán': 'payByQR', 'quẹt thẻ': 'payByCard',
                'đóng dấu': 'stampCard', 'đóng dấu thẻ': 'stampCard', 'rót nước': 'pourDrink', 'pha cà phê': 'pourDrink', 'rót': 'pourDrink', 'lau bàn': 'wipeCounter', 'lau quầy': 'wipeCounter'})
# ĐỢT 35 — phòng khám: cân (bế con vật đặt lên cân — cảnh tự có một cái cân "can" cạnh người cân), đo nhiệt độ, cho uống thuốc
# (một tay giữ đầu, một tay đưa viên thuốc vào mõm). "cho thuốc" vẫn là đưa viên thuốc như bánh thưởng (`giveTreat`).
TARGETED.update({'cân': ('weigh', 'can'), 'cân ký': ('weigh', 'can'), 'đo nhiệt độ': ('takeTemp', None), 'đo nhiệt': ('takeTemp', None), 'cặp nhiệt': ('takeTemp', None),
                 'cho uống thuốc': ('givePill', None), 'bón thuốc': ('givePill', None)})
# ĐỢT 38 A — cắt móng, nhỏ mắt, vệ sinh tai, quét chip (hai tay trên con vật). "quét chip 900 123 456 789": mã chip hiện trên thẻ.
TARGETED.update({'cắt móng': ('clipNails', None), 'cắt móng chân': ('clipNails', None), 'cắt móng tay': ('clipNails', None),
                 'nhỏ mắt': ('eyeDrops', None), 'nhỏ thuốc mắt': ('eyeDrops', None), 'nhỏ thuốc vào mắt': ('eyeDrops', None),
                 'vệ sinh tai': ('cleanEars', None), 'lau tai': ('cleanEars', None), 'làm sạch tai': ('cleanEars', None),
                 'quét chip': ('scanChip', None), 'kiểm tra chip': ('scanChip', None), 'đọc chip': ('scanChip', None)})
CHIP_VERB = re.compile(r'^(quét chip|kiểm tra chip|đọc chip)\s+(?:mã\s+|số\s+)?([0-9][0-9 .-]{2,22}[0-9])$')
# ĐỢT 38 C — HAI NGƯỜI VỚI NHAU (đích là một người): đập tay, ôm, vỗ vai / an ủi, thì thầm / nói nhỏ, đưa túi thuốc (người đưa tự có túi
# thuốc trong tay, người nhận tự có túi đang cất — tools/scene.py). Người kia làm phần của mình cùng lúc.
TARGETED.update({'đập tay': ('highFive', None), 'high five': ('highFive', None), 'ôm': ('hug', None), 'vỗ vai': ('patShoulder', None),
                 'an ủi': ('patShoulder', None), 'thì thầm': ('whisper', None), 'nói nhỏ': ('whisper', None),
                 'đưa túi thuốc': ('handOverBag', None), 'đưa thuốc': ('handOverBag', None)})
# ĐỢT 37 — COMBO: một câu cho cả một chuỗi động tác (bảng chung ở runtime/combos.js, khoá "vi"). Combo không đích viết trong
# ngoặc ("lễ tân: [chào khách]"); combo có đích viết "→" ("bác sĩ → chó: khám tổng quát", "bác sĩ → chó → bé trai: trả thú").
sys.path.insert(0, HERE)
from scene import COMBOS, expand_combos       # noqa: E402
# ĐỢT 38 B — phối hợp và chuẩn bị ở phòng khám: giữ con vật cho người khác làm ("cùng lúc: y tá → chó: giữ | bác sĩ → chó: tiêm"),
# rửa tay, đeo / tháo găng tay ("bác sĩ: [rửa tay, đeo găng]").
TARGETED.update({'giữ': ('restrain', None), 'giữ con vật': ('restrain', None), 'giữ chặt': ('restrain', None)})
ACTIONS.update({'rửa tay': 'washHands', 'đeo găng': 'putOnGloves', 'đeo găng tay': 'putOnGloves', 'tháo găng': 'takeOffGloves', 'tháo găng tay': 'takeOffGloves'})
COMBO_WORDS = {word: name for name, combo in COMBOS.items() for word in combo.get('vi', [])}
SCALE_NAME = 'can'                                       # tên cái cân tự thêm vào bối cảnh khi có lượt "cân"
MARKS = {'!': '!', '?': '?', 'tim': 'heart', 'zzz': 'zzz', 'mồ hôi': 'sweat', 'giận': 'anger', 'nhạc': 'music', 'chóng mặt': 'dizzy'}
ACTIONS.update({'rửa mặt': 'groomFace', 'liếm lông': 'groomFace', 'nằm ổ bánh mì': 'loaf', 'nằm cuộn': 'loaf', 'chớp mắt chậm': 'slowBlink', 'vờn': 'batToy', 'vờn đồ chơi': 'batToy',
                'cong lưng': 'archBack', 'dựng lông': 'archBack', 'chui hộp': 'sitInBox', 'ngồi trong hộp': 'sitInBox', 'nhảy vui': 'binky', 'binky': 'binky',
                'nằm vật ra': 'flop', 'nằm nghiêng': 'flop', 'đứng hai chân': 'periscope', 'ngóng': 'periscope', 'giật mũi': 'noseTwitch', 'hít hít': 'noseTwitch'})      # ĐỢT 40 B — mèo & thỏ
HEAD_KEYS = ('bối cảnh', 'máy', 'khung', 'mở đầu', 'kết thúc', 'logo', 'nhạc', 'âm lượng nhạc', 'ánh sáng')
LIGHTS = {'ngày': 'day', 'ban ngày': 'day', 'chiều': 'evening', 'chạng vạng': 'evening', 'tối': 'night', 'đêm': 'night', 'ban đêm': 'night'}
# ĐỢT 40 C — thú ở phòng khám: sợ run trên bàn khám, giãy trong tay người bế, lừ đừ sau thuốc mê, cào cái loa chống liếm.
ACTIONS.update({'run sợ': 'shiverAtVet', 'sợ run': 'shiverAtVet', 'giãy': 'struggle', 'giãy giụa': 'struggle', 'vùng vẫy': 'struggle', 'lừ đừ': 'groggy', 'chưa tỉnh thuốc': 'groggy', 'mơ màng': 'groggy', 'cào loa': 'pawAtCone', 'gỡ loa': 'pawAtCone'})
SWITCHES = {'bật đèn': 'on', 'tắt đèn': 'off'}
POWER = {'mất điện': 'off', 'cúp điện': 'off', 'có điện': 'on', 'có điện lại': 'on'}
SKIES = {'trời tối dần': 'night', 'trời tối': 'night', 'màn đêm': 'night', 'hoàng hôn': 'evening', 'chiều xuống': 'evening', 'trời sáng': 'day', 'bình minh': 'day'}
# ĐỢT 39 C — NGƯỜI DẪN (chỉ người): "bác sĩ: [giơ bảng: Giảm 20%]" (chữ trên bảng: 1–3 dòng ngắn, ngắt bằng "|"; có dấu phẩy thì đặt trong ngoặc kép —
# [giơ bảng: "Giảm 20%, hôm nay"]), "[to cỡ này]" / "[nhỏ cỡ này]" / "[ra dấu kích thước]", "[selfie]" / "[chụp ảnh tự sướng]" / "[chụp hình]" (tự có điện thoại
# cất sẵn trong tay), "[ngáp]" / "[vươn vai]" (người: ngáp + vươn hai tay qua đầu — thú vẫn ngáp / vươn vai kiểu thú), và "bác sĩ → bé trai: selfie" (chụp CÙNG).
SIGN_WORDS = ('giơ bảng', 'giơ biển', 'giơ tấm bảng')
PRESENT_39 = {'to cỡ này': ['showSize', 'big'], 'to thế này': ['showSize', 'big'], 'nhỏ cỡ này': ['showSize', 'small'], 'bé cỡ này': ['showSize', 'small'],
              'cỡ này': ['showSize', 'medium'], 'ra dấu kích thước': ['showSize', 'medium'], 'ra dấu to cỡ này': ['showSize', 'big'],
              'chụp ảnh tự sướng': ['takeSelfie'], 'chụp ảnh': ['takeSelfie'], 'selfie': ['takeSelfie'], 'chụp hình': ['takeSelfie'], 'tự sướng': ['takeSelfie'],
              'ngáp': ['yawnStretch'], 'vươn vai': ['yawnStretch'], 'ngáp vươn vai': ['yawnStretch']}
TARGETED_39 = {'selfie': 'takeSelfie', 'chụp ảnh tự sướng': 'takeSelfie', 'chụp hình': 'takeSelfie', 'chụp ảnh': 'takeSelfie', 'tự sướng': 'takeSelfie'}
SIGN_TEXT = re.compile(r'(' + '|'.join(SIGN_WORDS) + r')\s*:\s*("[^"]*"|[^,\]]*)', re.IGNORECASE)


NARRATOR_IDS_42A = ('lồng tiếng', 'không hiện', 'giọng dẫn')       # đợt 42 A: mã của người dẫn không hiện hình
VOICEOVER_42A = re.compile(r'^(.+?)\s*\(\s*lồng tiếng\s*\)\s*→\s*(.+?)\s*:\s*(\[.*\])\s*\|\s*(.+)$', re.IGNORECASE)      # "mẹ (lồng tiếng) → mèo: [chui hộp] | lời"
TOGETHER_42A = re.compile(r'^cùng lúc\s*(?:\(([^)]*)\))?\s*:\s*(.*)$', re.IGNORECASE)
SIZES_42A = {'cận': 'close', 'cận cảnh': 'close', 'trung': 'medium', 'trung cảnh': 'medium', 'toàn': 'full', 'toàn cảnh': 'full'}


class ScriptError(Exception):
    pass


def slug(text):
    """Tên nhân vật tiếng Việt → tên biến JavaScript: "bác sĩ" → "bac_si"."""
    plain = unicodedata.normalize('NFD', text.replace('đ', 'd').replace('Đ', 'D'))
    plain = ''.join(ch for ch in plain if unicodedata.category(ch) != 'Mn').lower()
    name = re.sub(r'[^a-z0-9]+', '_', plain).strip('_') or 'nv'
    return ('nv_' + name) if name[0].isdigit() or name in ('set', 'tl', 'talk', 'host', 'frameAt', 'CUTS', 'T0', 'T1') else name


def parse(text, first_line=1):
    """Trả về (tuỳ chọn đầu, danh sách nhân vật, danh sách mục kịch bản). Lỗi: ScriptError có số dòng."""
    head, cast, lines = {}, [], []
    for number, raw in enumerate(text.splitlines(), first_line):
        line = raw.strip()
        if not line or line.startswith('#'): continue
        where = f'dòng {number}'
        # Dòng nhân vật: "tên (mã, …) · tên (mã)" — có ngoặc trước dấu hai chấm đầu tiên, không có "→".
        if '(' in line and (':' not in line or line.index('(') < line.index(':')) and not lines and '→' not in line and re.search(r'\)\s*(·|$)', line):
            for item in re.split(r'\s*·\s*', line):
                m = re.match(r'^(.+?)\s*\(([^)]*)\)$', item.strip())
                if not m: raise ScriptError(f'{where}: nhân vật phải viết "tên (mã)" — "{item}"')
                options = [part.strip() for part in m.group(2).split(',') if part.strip()]
                cast.append({'label': m.group(1).strip(), 'id': options[0], 'options': options[1:], 'where': where})
            continue
        # Dòng đầu: "khoá: giá trị · khoá: giá trị" với khoá đã biết.
        pairs = [part for part in re.split(r'\s*·\s*', line)]
        keys = [part.split(':', 1)[0].strip().lower() for part in pairs if ':' in part]
        if not lines and keys and all(key in HEAD_KEYS for key in keys):
            for part in pairs:
                key, value = part.split(':', 1)
                head[key.strip().lower()] = value.strip()
            continue
        lines.append((where, line))
    return head, cast, lines


def build_scene(text, base):
    return build_parsed(*parse(text), base)


def build_parsed(head, cast, lines, base, soft_boxes=False):
    if not cast: raise ScriptError('chưa có dòng nhân vật, ví dụ: bác sĩ (vet) · chó (corgi, trên bàn)')
    preset = PRESETS.get(head.get('bối cảnh', 'phòng khám').lower())
    if not preset: raise ScriptError(f'bối cảnh "{head.get("bối cảnh")}" chưa có — dùng: {", ".join(sorted(set(PRESETS)))}')
    portrait = head.get('khung', 'ngang').lower() == 'dọc'
    if head.get('khung', 'ngang').lower() not in ('ngang', 'dọc'): raise ScriptError(f'khung phải là "ngang" hoặc "dọc" — "{head.get("khung")}"')
    camera = head.get('máy', 'tự động').lower()
    if camera not in ('tự động', 'cố định'): raise ScriptError(f'máy phải là "tự động" hoặc "cố định" — "{head.get("máy")}"')

    # NHÂN VẬT và CHỖ ĐỨNG. Ai "trên bàn / ghế / quầy" thì lên hộp ấy; người đầu tiên đứng cạnh hộp có thú trên đó; còn
    # lại dàn sang trái (hay ra hai bên khi không có hộp nào), cùng một độ sâu để tay với tới nhau.
    names, characters, labels = set(), [], {}
    narrators_42a, narrator_labels_42a = [], set()
    boxes = BOXES[preset]
    for who in cast:
        name = slug(who['label'])
        while name in names: name += '_2'
        names.add(name); labels[who['label'].lower()] = name
        pet = who['id'] in PET_SPECIES
        if who['id'].lower() in NARRATOR_IDS_42A:            # đợt 42 A: người dẫn không hiện hình — chỉ tên + giọng, không chỗ đứng
            voice = None
            for option in who['options']:
                if option.lower().startswith('giọng '): voice = option.split(' ', 1)[1].strip()
                else: raise ScriptError(f'{who["where"]}: an off-screen narrator takes only the option "giọng …" (a voice) — got "{option}"')
            narrators_42a.append({'name': name, 'narrator': True, **({'voice': voice} if voice else {})})
            narrator_labels_42a.add(name)
            continue
        entry = {'name': name, ('species' if pet else 'id'): who['id'], 'z': -560}
        for option in who['options']:
            low = option.lower()
            if low.startswith('trên ') or low == 'ngồi':
                word = low[4:].strip() if low.startswith('trên ') else 'ghế'
                choice = next((box for box in ON_WORDS.get(word, ()) if box in boxes), None)
                if not choice and soft_boxes: continue                   # phim nhiều cảnh: cảnh này không có cái bàn ấy — đứng dưới sàn
                if not choice: raise ScriptError(f'{who["where"]}: bối cảnh này không có "{word}" để {who["label"]} lên — có: {", ".join(boxes) or "không có hộp nào"}')
                entry['on'] = choice
                if low == 'ngồi' or (not pet and word in ('ghế', 'sofa', 'ghế đá')): entry['seated'] = True
            elif low == 'đeo loa': entry.setdefault('wears', []).append('cone')
            elif low in ('băng chân', 'băng'): entry.setdefault('wears', []).append('bandage')
            elif low.startswith('giọng '): entry['voice'] = option.split(' ', 1)[1].strip()
            else: raise ScriptError(f'{who["where"]}: không hiểu tuỳ chọn "{option}" của {who["label"]} (trên bàn, ngồi, đeo loa, băng chân, giọng …)')
        if 'on' in entry:
            x, z, width, depth = boxes[entry['on']]
            entry['x'], entry['z'] = x + width / 2, z - depth / 2
        characters.append(entry)
    anchor = next((boxes[c['on']] for c in characters if c.get('on') and 'species' in c), None)
    floor = [c for c in characters if 'on' not in c]
    if anchor:
        x = anchor[0] - 130                 # cách mép hộp một chút: góc cận con vật trên hộp không dính người; khám / cho thuốc thì tự bước lại
        # Ai có lượt "→ …" (khám, cho thuốc) đứng GẦN hộp nhất: đi tới con vật không phải băng ngang người khác — không thì
        # máy không loại được người đứng giữa ra khỏi góc hai nhân vật (Gemini soát phim đợt 18: bà chủ lẹm nửa người suốt lượt khám).
        doers = {re.split(r'\s*→', line, 1)[0].strip().lower() for _, line in lines if '→' in line}
        name_of = {v: k for k, v in labels.items()}
        floor.sort(key=lambda c: name_of.get(c['name']) not in doers)
        for c in floor:
            c['x'] = x
            x -= 400 if 'id' in c else 240        # đủ xa để góc trung cảnh của người bên cạnh không lẹm nửa người này (khung dọc)
    else:
        step = 300
        for n, c in enumerate(floor): c['x'] = round((n - (len(floor) - 1) / 2) * step)
    for c in characters: c['x'], c['z'] = round(c['x']), round(c['z'])

    def who_of(label, where):
        key = label.strip().lower()
        if key not in labels: raise ScriptError(f'{where}: "{label.strip()}" không có trong dòng nhân vật ({", ".join(c["label"] for c in cast)})')
        return labels[key]

    def is_pet(name): return any(c['name'] == name and 'species' in c for c in characters)

    def together_42a(turns, option, where):
        """Các lượt của một nhóm `cùng lúc` → mục `together`. Có "(quay …)" hay có người dẫn không hiện hình: thêm "view" — máy quay vào
        những ai đang DIỄN (không phải người nói): một con thú → cận, một mình (độ choán khung do scene.py chọn theo động tác); thú + người hay nhiều thú → trung."""
        entry = {'together': turns}
        if option is None and not any(turn['who'] in narrator_labels_42a for turn in turns): return entry
        subjects, size = [], None
        for word in [part.strip() for part in (option or '').split(',') if part.strip()]:
            if word.lower() in SIZES_42A: size = SIZES_42A[word.lower()]
            elif word.lower().startswith('quay '): subjects += [who_of(label, where) for label in re.split(r'\s+và\s+|\s*\+\s*', word[5:].strip()) if label]
            else: raise ScriptError(f'{where}: cannot read "{word}" in "cùng lúc (…)" — write "quay mèo" or "quay mèo và mẹ", then cận / trung / toàn: "cùng lúc (quay mèo, cận): …"')
        if option is not None and not subjects and size is None: raise ScriptError(f'{where}: "cùng lúc (…)" needs "quay <who>" — for example "cùng lúc (quay mèo): mẹ: Mèo nhà mình… | mèo: [chui hộp]"')
        actors = [turn['who'] for turn in turns if turn['who'] not in narrator_labels_42a]
        subjects = list(dict.fromkeys(subjects or [who for who in actors if not any(t['who'] == who and 'say' in t for t in turns)] or actors))
        if not subjects: raise ScriptError(f'{where}: nobody in this group is on screen for the camera to film — add a character who acts')
        if any(who in narrator_labels_42a for who in subjects): raise ScriptError(f'{where}: the narrator has no body on screen, the camera cannot film them — "quay …" must name a person or pet in the scene')
        size = size or ('close' if len(subjects) == 1 and is_pet(subjects[0]) else 'medium')
        entry['view'] = {'on': subjects, 'size': size, **({'alone': True} if len(subjects) == 1 else {})}
        return entry

    def turn_of(body, where):
        """Một lượt: "tên (tâm trạng): lời" · "tên: [hành động…]" · "tên → tên khác: hành động"."""
        m = re.match(r'^(.+?)\s*→\s*(.+?)\s*:\s*(.+)$', body)
        if m and m.group(3).strip().lower().strip('[]') in COMBO_WORDS:
            if who_of(m.group(1), where) in narrator_labels_42a: raise ScriptError(f'{where}: a narrator who is off screen can only speak — "{m.group(1).strip()}: <line>"')
            who, verb = who_of(m.group(1), where), m.group(3).strip().lower().strip('[]')
            name = COMBO_WORDS[verb]
            targets = [f'@{who_of(part, where)}' for part in re.split(r'\s*→\s*', m.group(2))]
            params = COMBOS[name]['params']
            if len(targets) > len(params) or not params:
                raise ScriptError(f'{where}: "{verb}" cần {len(params)} đích ({", ".join(params) or "không có"}) — ví dụ: "bác sĩ → chó → bé trai: trả thú"')
            if 'scale' in params and len(targets) == params.index('scale'): targets.append(SCALE_NAME)      # tiêm phòng: cân bằng cái cân tự thêm
            return {'who': who, 'do': [[name] + targets]}
        if m:
            who, target, verb = who_of(m.group(1), where), who_of(m.group(2), where), m.group(3).strip().lower().strip('[]')
            if who in narrator_labels_42a or target in narrator_labels_42a: raise ScriptError(f'{where}: a narrator who is off screen can only speak — "{m.group(1).strip()}: <line>"')
            chip = CHIP_VERB.match(verb)
            if chip: return {'who': who, 'do': [['scanChip', f'@{target}', {'id': chip.group(2)}]]}
            if verb in TARGETED_39:          # ĐỢT 39 C: "bác sĩ → bé trai: selfie" — chụp ảnh tự sướng CÙNG người / con vật kia
                if is_pet(who): raise ScriptError(f'{where}: "{verb}" là việc của người — thú không cầm điện thoại')
                if target == who: raise ScriptError(f'{where}: "{verb}" cùng một người khác — "bác sĩ → bé trai: {verb}"')
                return {'who': who, 'do': [[TARGETED_39[verb], 1.6, {'with': f'@{target}'}]]}
            if verb not in TARGETED: raise ScriptError(f'{where}: không biết "{verb}" — dùng: {", ".join(TARGETED)}')
            action, extra = TARGETED[verb]
            step = [action, f'@{target}'] + ([extra] if extra else [])
            return {'who': who, 'do': [step]}
        m = re.match(r'^(.+?)(?:\s*\(([^)]*)\))?\s*:\s*(.+)$', body)
        if not m: raise ScriptError(f'{where}: không hiểu dòng này — viết "tên: lời", "tên: [hành động]" hay "tên → tên khác: hành động"')
        who, mood_word, rest = who_of(m.group(1), where), (m.group(2) or '').strip().lower(), m.group(3).strip()
        pet, turn = is_pet(who), {'who': who}
        if who in narrator_labels_42a and (mood_word or rest.startswith('[')): raise ScriptError(f'{where}: "{m.group(1).strip()}" is an off-screen narrator — only a spoken line ("{m.group(1).strip()}: <line>"), no mood and no [action]')
        if mood_word:
            table = PET_MOODS if pet else PERSON_MOODS
            mood = table.get(mood_word) or (mood_word if mood_word in table.values() else None)
            if not mood: raise ScriptError(f'{where}: tâm trạng "{mood_word}" chưa có — dùng: {", ".join(table)}')
            turn['mood'] = mood
        if rest.startswith('['):
            if not rest.endswith(']'): raise ScriptError(f'{where}: thiếu "]"')
            # ĐỢT 39 C: chữ trên bảng ("giơ bảng: Giảm 20%") có thể chứa dấu cách và "|" — rút ra trước khi tách theo dấu phẩy.
            signs = []
            inner = SIGN_TEXT.sub(lambda m: (signs.append(m.group(2).strip().strip('"').strip()) or f'giơ bảng#{len(signs) - 1}'), rest[1:-1])
            for word in [part.strip().lower() for part in inner.split(',') if part.strip()]:
                table = PET_MOODS if pet else PERSON_MOODS
                if (word in table or word in table.values()) and not (word in BRACKET_FIRST and not pet):
                    if 'mood' in turn: raise ScriptError(f'{where}: hai tâm trạng trong một lượt')
                    turn['mood'] = table.get(word, word)
                elif word in MARKS: turn['mark'] = MARKS[word]
                elif word in SWITCHES: turn['lamp'] = SWITCHES[word]
                elif word in POWER: turn['power'] = POWER[word]
                elif word in SKIES: turn['sky'] = SKIES[word]
                elif word in COMBO_WORDS and not COMBOS[COMBO_WORDS[word]]['params']: turn.setdefault('do', []).append(COMBO_WORDS[word])
                elif word in COMBO_WORDS: raise ScriptError(f'{where}: "{word}" cần đích — viết "tên → con vật: {word}"')
                elif word.startswith('giơ bảng#') or word in SIGN_WORDS or (not pet and word in PRESENT_39):         # ĐỢT 39 C
                    if pet: raise ScriptError(f'{where}: {m.group(1).strip()} là thú — "{word}" chỉ dành cho người')
                    if word in SIGN_WORDS or (word.startswith('giơ bảng#') and not signs[int(word.split('#')[1])]):
                        raise ScriptError(f'{where}: "giơ bảng" cần chữ trên bảng — "{m.group(1).strip()}: [giơ bảng: Giảm 20%]" (1–3 dòng ngắn, ngắt bằng |)')
                    turn.setdefault('do', []).append(['holdSign', signs[int(word.split('#')[1])]] if word.startswith('giơ bảng#') else list(PRESENT_39[word]))
                elif word in ACTIONS or re.match(r'^[a-zA-Z]+$', word): turn.setdefault('do', []).append(ACTIONS.get(word, word))
                else: raise ScriptError(f'{where}: không biết hành động "{word}" — ví dụ: {", ".join(list(ACTIONS)[:14])}…')
        else:
            if pet: raise ScriptError(f'{where}: {m.group(1).strip()} là thú, không nói được — dùng [sủa], [kêu] hay một cảm xúc [vui]')
            turn['say'] = rest
        return turn

    def attach_toast_42a(entry, note):
        """Thẻ thông báo gắn vào lượt của một nhân vật thật (người dẫn không hiện hình không mang thẻ); không có thì giữ lại cho lượt sau."""
        group = entry['together'] if 'together' in entry else [entry]
        turn = next((t for t in group if t['who'] not in narrator_labels_42a), None)
        if turn is None: return False
        turn['toast'] = note
        return True

    script, pending = [], None
    for where, line in lines:
        if line.lower().startswith('thông báo:'):
            # THÔNG BÁO của ứng dụng ("thông báo: Nhắc lịch tái khám | Thứ Bảy 9:00"): thẻ trượt vào khung ở lượt KẾ TIẾP.
            parts = [part.strip() for part in line.split(':', 1)[1].split('|')]
            if not parts[0]: raise ScriptError(f'{where}: "thông báo:" cần một tiêu đề — "thông báo: Nhắc lịch tái khám | Thứ Bảy 9:00"')
            pending = {'title': parts[0], **({'text': parts[1]} if len(parts) > 1 and parts[1] else {})}
            continue
        # ĐỢT 42 A — "mẹ (lồng tiếng) → mèo: [chui hộp] | Mèo nhà mình thích chui hộp lắm." = "cùng lúc (quay mèo): mẹ: Mèo nhà mình… | mèo: [chui hộp]"
        voice_over = VOICEOVER_42A.match(line)
        together = TOGETHER_42A.match(line)
        if voice_over:
            speaker, actor, action, words = voice_over.groups()
            script.append(together_42a([turn_of(f'{speaker}: {words}', where), turn_of(f'{actor}: {action}', where)], f'quay {actor}', where))
        elif together:
            parts = [part.strip() for part in together.group(2).split('|') if part.strip()]
            if len(parts) < 2: raise ScriptError(f'{where}: "cùng lúc:" cần ít nhất hai lượt, cách nhau bằng "|"')
            script.append(together_42a([turn_of(part, where) for part in parts], together.group(1), where))
        else:
            script.append(turn_of(line, where))
        if pending and attach_toast_42a(script[-1], pending): pending = None
    if pending and script and not attach_toast_42a(script[-1], pending): raise ScriptError('thông báo: no on-screen character to attach the card to — put it before a turn of a person or pet')
    if not script: raise ScriptError('kịch bản chưa có dòng thoại / hành động nào')
    script = expand_combos(script)              # combo → từng lượt: đồ cầm (ống tiêm, bìa hồ sơ), cái cân… tính như viết tay

    # Chỉ giữ nhân vật CÓ MẶT trong kịch bản của cảnh này (phim nhiều cảnh: dàn nhân vật khai một lần cho cả phim).
    used = {name for pair in re.findall(r'"who": "([^"]+)"|"@([^"]+)"', json.dumps(script, ensure_ascii=False)) for name in pair if name}
    characters = [c for c in characters if c['name'] in used] or characters
    if narrators_42a and not characters: raise ScriptError('only an off-screen narrator — at least one character on screen is needed')
    # ĐỒ CẦN CẦM cho một động tác: "tiêm" cần ống tiêm, "dắt" cần dây dắt — người viết kịch bản không phải tự khai (đợt 28:
    # "bác sĩ → mèo: tiêm" dừng hẳn với lỗi "not holding a syringe").
    needs = {'inject': 'syringe', 'leash': 'leash', 'readChart': 'clipboard', 'handOverBag': 'bag',
             'takeSelfie': 'phone'}      # đợt 39 C — điện thoại cất sẵn, lấy ra lúc chụp
    needs.update({'payByQR': 'phone', 'payByCard': 'card', 'giveChange': 'cash', 'stampCard': 'stampcard', 'pourDrink': {'kind': 'cup', 'open': True}})       # đợt 39 A
    for turn in (t for entry in script for t in (entry.get('together', []) if isinstance(entry, dict) and 'together' in entry else [entry])):
        for step in turn.get('do', []) if isinstance(turn, dict) else []:
            item = needs.get(step[0] if isinstance(step, list) and step else step if isinstance(step, str) else None)
            who = next((c for c in characters if c['name'] == turn.get('who')), None)
            if item and who and not who.get('holds') and not who.get('species'):
                who['holds'] = item if isinstance(item, str) else {'L': item}
                if item in ('syringe', 'clipboard', 'cash', 'stampcard', 'phone'): who['holdsHidden'] = True      # cất sẵn: chỉ lấy ra lúc tiêm / đọc bệnh án / thối tiền / đóng dấu / chụp ảnh (đợt 39 A: cash, stampcard; đợt 39 C: phone)
            elif item and who and isinstance(who.get('holds'), str) and who['holds'] != item and not who.get('species') and who.get('holdsHidden'):
                # Món thứ hai (đợt 37: "tiêm phòng" rồi "khám tổng quát" — ống tiêm VÀ bìa hồ sơ): tay kia. Ống tiêm ở tay phải
                # (tay mặc định, như khi chỉ có nó).
                first = who['holds']
                who['holds'] = {'R': 'syringe', 'L': item if first == 'syringe' else first} if 'syringe' in (first, item) else {'R': first, 'L': item}
    scene = {'id': slug(os.path.splitext(os.path.basename(base))[0]).replace('_', '-'), 'set': {'preset': preset}, 'characters': characters + [n for n in narrators_42a if n['name'] in used], 'script': script}
    # CÂN (đợt 35): một cái cân trên sàn cạnh người cân đầu tiên, phía không có con vật, cùng độ sâu (con vật được đặt lên nó trong
    # mặt phẳng của người ấy).
    weighs = [(turn['who'], step[1][1:]) for turn in script if isinstance(turn, dict) for step in turn.get('do', []) if isinstance(step, list) and step and step[0] == 'weigh']
    if weighs:
        doer = next(c for c in characters if c['name'] == weighs[0][0])
        pet = next((c for c in characters if c['name'] == weighs[0][1]), None)
        side = -1 if not pet or float(pet.get('x', 0)) >= float(doer.get('x', 0)) else 1
        scene['set'].setdefault('cutouts', []).append({'kind': 'scale', 'name': SCALE_NAME, 'x': round(float(doer.get('x', 0)) + side * 160), 'z': doer.get('z', -560)})
    # CHỈ PHIM X-QUANG (đợt 35): đặt một đèn đọc phim ("xray") cạnh người chỉ — cùng chiều sâu, phía xa con vật / người khác.
    for turn in (t for entry in script for t in (entry.get('together', []) if isinstance(entry, dict) and 'together' in entry else [entry])):
        steps = turn.get('do', []) if isinstance(turn, dict) else []
        for n, step in enumerate(steps):
            if step != 'showXray' and step != ['showXray']: continue
            who = next((c for c in characters if c['name'] == turn.get('who')), None)
            if not who or who.get('species'): continue
            viewer = 'phim-' + slug(who['name'])
            if not any(item.get('name') == viewer for item in scene['set'].get('cutouts', [])):
                # Bên nào trống hơn (xa người / con vật gần nhất hơn), trong phòng (|x| ≤ 800).
                others = [float(c.get('x', 0)) for c in characters if c is not who]
                spots = [x for x in (float(who.get('x', 0)) - 200, float(who.get('x', 0)) + 200) if abs(x) <= 800] or [float(who.get('x', 0)) - 200]
                place = max(spots, key=lambda x: min((abs(x - o) for o in others), default=1e9))
                scene['set'].setdefault('cutouts', []).append({'kind': 'xray', 'name': viewer, 'x': round(place), 'z': who.get('z', -560)})
            steps[n] = ['showXray', viewer]
    if head.get('ánh sáng'):
        # "chiều → tối": cảnh bắt đầu lúc chiều, trời tối dần từ giữa cảnh (6 giây).
        parts = [part.strip().lower() for part in re.split(r'→|->', head['ánh sáng'])]
        moods = [LIGHTS.get(part) for part in parts]
        if len(parts) > 2 or not all(moods): raise ScriptError(f'ánh sáng phải là {", ".join(LIGHTS)}, hay "chiều → tối" — "{head["ánh sáng"]}"')
        scene['set']['light'] = moods[0]
        if len(moods) == 2 and script:
            middle = script[len(script) // 2]
            if isinstance(middle, dict) and 'sky' not in middle: middle['sky'] = {'to': moods[1], 'dur': 6}
    if portrait: scene['width'], scene['height'] = 1080, 1920
    if camera == 'tự động': scene['camera'] = 'auto'
    for key, card in (('mở đầu', 'intro'), ('kết thúc', 'outro')):
        if head.get(key) and key == 'mở đầu' and head[key].split('|')[0].strip().lower() == 'hook':
            # "mở đầu: hook | Tiêu đề | dòng phụ": chữ lớn bật lên trên cảnh đầu (không phải thẻ tĩnh).
            parts = [part.strip() for part in head[key].split('|')[1:]]
            if not parts or not parts[0]: raise ScriptError('"mở đầu: hook | Tiêu đề | dòng phụ" — thiếu tiêu đề')
            scene['hook'] = {'title': parts[0], **({'text': parts[1]} if len(parts) > 1 and parts[1] else {})}
            continue
        if head.get(key):
            parts = [part.strip() for part in head[key].split('|')]
            scene[card] = {k: v for k, v in zip(('title', 'text', 'cta'), parts) if v}
            if head.get('logo'): scene[card]['logo'] = head['logo']
    if head.get('nhạc'): scene['music'] = head['nhạc']
    return scene


def build_film(text, base):
    """Một kịch bản → danh sách tệp cảnh (+ tuỳ chọn film.json). Có dòng "=== …" thì mỗi dòng ấy mở một cảnh:
    "=== tên · bối cảnh: … · ánh sáng: … · máy: …". Phần trước dòng "===" đầu tiên là phần chung (khung, nhạc, mở đầu,
    kết thúc, logo, dàn nhân vật); mở đầu vào cảnh đầu, kết thúc vào cảnh cuối, nhạc thành nhạc nền của cả phim."""
    raw = text.splitlines()
    marks = [n for n, line in enumerate(raw) if line.strip().startswith('===')]
    if not marks: return [build_scene(text, base)], {}
    head, cast, loose = parse('\n'.join(raw[:marks[0]]))
    if loose: raise ScriptError(f'{loose[0][0]}: dòng kịch bản nằm trước cảnh đầu tiên — đặt nó sau một dòng "=== tên cảnh · bối cảnh: …"')
    scenes = []
    for index, start in enumerate(marks):
        end = marks[index + 1] if index + 1 < len(marks) else len(raw)
        marker = raw[start].strip().lstrip('=').strip()
        local = {}
        for part in re.split(r'\s*·\s*', marker):
            if ':' in part:
                key, value = part.split(':', 1)
                if key.strip().lower() not in HEAD_KEYS: raise ScriptError(f'dòng {start + 1}: không hiểu "{key.strip()}" — dùng: {", ".join(HEAD_KEYS)}')
                local[key.strip().lower()] = value.strip()
        section_head, section_cast, lines = parse('\n'.join(raw[start + 1:end]), start + 2)
        merged = dict({k: v for k, v in head.items() if k not in ('mở đầu', 'kết thúc', 'nhạc', 'âm lượng nhạc')}, **local, **section_head)
        if index == 0 and head.get('mở đầu'): merged['mở đầu'] = head['mở đầu']
        if index == len(marks) - 1 and head.get('kết thúc'): merged['kết thúc'] = head['kết thúc']
        roster = {who['label'].lower(): who for who in cast}
        roster.update({who['label'].lower(): who for who in section_cast})
        name = f'{os.path.splitext(base)[0]}-{index + 1}'
        scenes.append(build_parsed(merged, list(roster.values()), lines, name, soft_boxes=True))
    film = {'transition': 'fade'}
    if head.get('nhạc'): film['music'] = head['nhạc']
    if head.get('âm lượng nhạc'):
        try: film['musicVolume'] = float(head['âm lượng nhạc'])
        except ValueError: raise ScriptError(f'âm lượng nhạc phải là một số (0.2) — "{head["âm lượng nhạc"]}"')
    for scene in scenes: scene.pop('music', None)
    return scenes, film


def main():
    parser = argparse.ArgumentParser(description='Kịch bản chữ thường → scene.json → composition (tools/scene.py).')
    parser.add_argument('script', help='tệp kịch bản .txt')
    parser.add_argument('--no-build', action='store_true', help='chỉ viết .scene.json, không dựng')
    args = parser.parse_args()
    try: text = open(args.script, encoding='utf-8').read()
    except OSError as error: sys.exit(f'script: không đọc được {args.script}: {error}')
    stem = os.path.splitext(args.script)[0]
    try: scenes, film = build_film(text, args.script)
    except ScriptError as error: sys.exit(f'script: {args.script}: {error}')
    files = []
    for number, scene in enumerate(scenes, 1):
        out = stem + (f'-{number}' if len(scenes) > 1 else '') + '.scene.json'
        json.dump(scene, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        files.append(out); print(out)
    if len(scenes) > 1:
        # PHIM NHIỀU CẢNH: film.json cho tools/film.py (chuyển cảnh, nhạc nền hạ khi có lời, phụ đề .srt, ảnh bìa).
        film = dict(film, scenes=[os.path.basename(path) for path in files], output=os.path.basename(stem) + '.mp4')
        film_path = stem + '.film.json'
        json.dump(film, open(film_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(film_path)
        if args.no_build: return
        sys.exit(subprocess.run([sys.executable, os.path.join(HERE, 'film.py'), film_path]).returncode)
    if args.no_build: return
    done = subprocess.run([sys.executable, os.path.join(HERE, 'scene.py'), files[0], '--force'])
    sys.exit(done.returncode)


if __name__ == '__main__':
    main()
