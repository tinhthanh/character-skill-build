"""Per-action knowledge in ONE place: which actions reach a target, pair actions, care / desk actions, gestures,
pet actions, their timings, gaps, options and the questions moments.json asks about them."""
import os, re
from .util import ROOT, _num

# Động tác mà bàn tay phải TỚI được đích: tới đầu / thân con vật, hay tới tay người kia (đợt 28: soát diễn xuất).
# Vuốt ve: rig vuốt LƯNG con vật (như người thật) — đo tới thân, không tới mặt.
REACH_ACTIONS = {'stroke': 'body', 'examine': 'face', 'giveTreat': 'face', 'brush': 'body', 'listen': 'body', 'inject': 'body',
                 'handOver': 'hands', 'handOverPet': 'hands', 'handshake': 'hands', 'carry': 'body', 'bandage': 'body', 'putCone': 'face', 'offerHand': 'face'}
# ĐỢT 35: đo nhiệt độ (tay tới thân con vật), cho uống thuốc (tay tới đầu / mõm). Cân (`weigh`) đo riêng: con vật đứng trên bệ cân.
REACH_ACTIONS.update({'takeTemp': 'body', 'givePill': 'face'})
# ĐỢT 38 C — HAI NGƯỜI VỚI NHAU: đập tay, ôm, vỗ vai, thì thầm, đưa túi thuốc. `PAIR_PARTNER`: phần của người kia, thêm cùng lúc khi lượt
# chỉ có bước ấy (như bắt tay); `PAIR_GAP`: hai tâm cách nhau bấy nhiêu × chiều cao TRUNG BÌNH hai người (đập tay: người THẤP hơn) — đi lại
# gần / lùi ra trước lượt.
PAIR_PARTNER = {'highFive': 'highFive', 'hug': 'hug', 'patShoulder': 'lookAt', 'whisper': 'hearWhisper', 'handOverBag': 'takeBag'}
PAIR_PARTS = ('hearWhisper', 'takeBag')                 # phần của người kia — cũng nhận "@người"
PAIR_GAP = {'highFive': 0.44, 'hug': 0.34, 'patShoulder': 0.32, 'whisper': 0.34, 'handOverBag': 0.4}
REACH_ACTIONS.update({'highFive': 'hands', 'handOverBag': 'hands'})
# Lúc đo (giây trong bước) và câu hỏi cho người chấm — xem `light_moments` (kiểm `pair` của tools/acting_check.py).
PAIR_TIMES = {'highFive': (0.7, 1.0, 1.3, 1.55), 'hug': (1.0, 1.5, 2.0, 2.5), 'patShoulder': (0.9, 1.4, 1.9, 2.3, 2.8),
              'whisper': (0.8, 1.3, 1.8, 2.3), 'handOverBag': (0.95, 1.1, 1.2, 1.35, 1.5)}
PAIR_ASK = {'highFive': 'Are {who} and {target} slapping their raised hands together (a high five), hand against hand?',
            'hug': 'Are {who} and {target} hugging — arms around each other, heads side by side?',
            'patShoulder': 'Is {who}\'s hand resting on {target}\'s shoulder, comforting them, with {target} looking at {who}?',
            'whisper': 'Is {who} whispering into {target}\'s ear — leaning close, a hand cupped beside the mouth?',
            'handOverBag': 'Is {who} handing a small medicine bag to {target}, both of them holding it?'}
# Lúc đo (phần của bước) của từng động tác chạm: tay đang ở trên con vật — đo nhiệt độ chỉ chạm từ 0,45 s tới 0,6 + hold.
REACH_TIMES = {'takeTemp': (0.2, 0.28, 0.36), 'givePill': (0.3, 0.36, 0.42)}
REACH_ACTIONS.update({'restrain': 'body'})                # đợt 38 B: hai tay ôm thân con vật
CARE_REACH = ('weigh', 'takeTemp', 'givePill')              # động tác phòng khám đợt 35 — cùng các danh sách "với tới con vật" như khám, tiêm
# ĐỢT 35 — dụng cụ & hồ sơ: đeo đồ cho con vật (băng / loa, còn lại trên nó), đọc bệnh án, chỉ phim X-quang.
CARE_ACTIONS = ('bandage', 'putCone')                    # tay tới con vật + đồ đeo còn trên nó sau động tác (acting_check `worn`)
PREP_ACTIONS = ('washHands', 'putOnGloves', 'takeOffGloves')      # đợt 38 B: chuẩn bị ở phòng khám — hai bàn tay trước ngực, đo bọt / găng
RESTRAIN = 'restrain'                                    # đợt 38 B: giữ con vật cho người khác làm (`together`)
PILL_HEAD = 0.15                                         # đợt 36: givePill — giữa thân tới đầu con chó / thỏ, × chiều cao host của nó
# ĐỢT 38 A — cắt móng, nhỏ mắt, vệ sinh tai, quét chip: hai tay trên con vật (tay xa giữ chân / cằm / lưng, tay gần cầm dụng cụ nhỏ). Con vật
# tự động theo tay người (chân nhấc, cằm nâng, nhắm mắt, lắc đầu — kênh của người, RigThu.#careView): không cần ghép bước riêng cho nó.
HANDS_ON_CARE = ('clipNails', 'eyeDrops', 'cleanEars', 'scanChip')
CARE_REACH = CARE_REACH + HANDS_ON_CARE                              # cùng các danh sách "với tới con vật" (lại gần, chiều sâu, care_code)
REACH_ACTIONS.update({'clipNails': 'body', 'eyeDrops': 'face', 'cleanEars': 'face', 'scanChip': 'body'})
HANDS_ON_OPTIONS = {'clipNails': {'paw', 'hold'}, 'eyeDrops': {'hold'}, 'cleanEars': {'hold'}, 'scanChip': {'id', 'hold'}}
HANDS_ON_HOLD = {'clipNails': (0.6, 6, 1.8), 'eyeDrops': (0.5, 5, 1.2), 'cleanEars': (0.8, 6, 1.8), 'scanChip': (0.8, 6, 1.6)}     # (ít nhất, nhiều nhất, mặc định) — rig-svg.js
HANDS_ON_GAP = {'clipNails': 0.17, 'eyeDrops': 0.2, 'cleanEars': 0.18, 'scanChip': 0.11}    # đứng cách ĐẦU con vật bấy nhiêu chiều cao người (ở phía đầu nó, như băng chân)
HANDS_ON_HEAD = 0.2                                       # … đầu con vật cách giữa thân nó chừng ấy chiều cao host của nó (mèo ngồi: 0,08)
# ĐỢT 42 F — tắm (trong chậu tắm), đánh răng, lau khô: như đợt 38 A (đứng ở phía đầu con vật, góc cận, con vật đọc kênh tay người). Tắm xong con vật
# RŨ NƯỚC (như `shakeOff`, theo kênh `petShake42f` của người lúc đã lùi ra — `RigSVG.bathShakeAt42f`). Con vật `"inTub": true`: đứng trong chậu tắm tự thêm.
GROOMING = ('bathPet', 'brushTeeth', 'towelDry')
HANDS_ON_CARE = HANDS_ON_CARE + GROOMING
CARE_REACH = CARE_REACH + GROOMING
REACH_ACTIONS.update({'bathPet': 'body', 'brushTeeth': 'face', 'towelDry': 'body'})
HANDS_ON_OPTIONS.update({'bathPet': {'hold'}, 'brushTeeth': {'hold'}, 'towelDry': {'hold'}})
HANDS_ON_HOLD.update({'bathPet': (1, 6, 1.8), 'brushTeeth': (0.8, 6, 2), 'towelDry': (1, 6, 2.2)})
HANDS_ON_GAP.update({'bathPet': 0.12, 'brushTeeth': 0.19, 'towelDry': 0.12})
BATH_SPRAY, BATH_RINSE, BATH_BACK = 1.6, 1.5, 34       # rig-svg.js `BATH_SPRAY42F`, `BATH_RINSE42F`, `BATH_BACK42F` (đơn vị khung người)


# ĐỢT 49 B — SẤY LÔNG (`blowDry`: vòi máy sấy, gió vào lưng, lông gợn rồi khô bông) và TỈA LÔNG (`trimFur`: kéo / tông-đơ dọc lưng, túm lông rụng,
# lông gọn): như 42 F (đứng ở phía đầu con vật, góc cận, con vật đọc kênh tay người). Sấy theo sau `bathPet` / `towelDry` (lông ướt → khô).
GROOMING_49B = ('blowDry', 'trimFur')
HANDS_ON_CARE = HANDS_ON_CARE + GROOMING_49B
CARE_REACH = CARE_REACH + GROOMING_49B
REACH_ACTIONS.update({'blowDry': 'body', 'trimFur': 'body'})
HANDS_ON_OPTIONS.update({'blowDry': {'hold'}, 'trimFur': {'hold', 'tool'}})
HANDS_ON_HOLD.update({'blowDry': (1, 6, 2.4), 'trimFur': (1, 6, 2.4)})
HANDS_ON_GAP.update({'blowDry': 0.12, 'trimFur': 0.12})
TRIM_TOOLS = ('scissors', 'clipper')                     # rig-svg.js `trimFur({ tool })`
TRIM_FALL = 1.25                                         # rig-svg.js `TRIM_FALL49B`: giây sau nhát cuối, túm lông cuối cùng rơi hết


# ĐỢT 50 A — PHÒNG KHÁM: sờ nắn bụng / sườn (`palpate`), siêu âm (`useUltrasound`: con vật nằm nghiêng, gel, đầu dò; xe đẩy siêu âm "@tên" tuỳ chọn) — như
# đợt 49 B (đứng ở phía đầu con vật, con vật đọc kênh tay người); soi kính hiển vi (`lookMicroscope`) đi riêng — tools/scenelib/exam50a.py.
from .exam50a import EXAM_50A, HOLD as EXAM_HOLD_50A, OPTIONS as EXAM_OPTIONS_50A
HANDS_ON_CARE = HANDS_ON_CARE + EXAM_50A
CARE_REACH = CARE_REACH + EXAM_50A
REACH_ACTIONS.update({'palpate': 'body', 'useUltrasound': 'body'})
HANDS_ON_OPTIONS.update({name: EXAM_OPTIONS_50A[name] for name in EXAM_50A})
HANDS_ON_HOLD.update({name: EXAM_HOLD_50A[name] for name in EXAM_50A})
HANDS_ON_GAP.update({'palpate': 0.13, 'useUltrasound': 0.13})


def bath_shake_at(hold):
    """Giây (từ đầu bước `bathPet`) con vật bắt đầu rũ nước — như `RigSVG.bathShakeAt42f`."""
    return round(0.55 + BATH_SPRAY + 0.55 + 0.35 + hold + 0.75 + BATH_RINSE + 1.2, 2)


CONE_BACK = 0.12                                         # đợt 36: đeo loa xong lùi ra bấy nhiêu chiều cao người
CHART_ACTIONS = ('readChart', 'showXray')                # đo riêng: bìa hồ sơ trước ngực / tay chỉ trúng điểm trên phim
# ĐỘNG TÁC TAY (đợt 33): bàn tay vung ra xa thân — vẫy, chỉ, giơ ngón… moments.json hỏi bàn tay có nằm trong khung không.
GESTURES = ('wave', 'thumbsUp', 'point', 'present', 'cheer', 'callOut', 'thumbsDown', 'stopSign', 'fingerWag', 'beckon', 'fingerHeart', 'vSign',
            'introduce', 'shrug', 'throwBall',
            'holdSign', 'showSize', 'takeSelfie', 'yawnStretch')            # đợt 39 C
EVERYDAY_GESTURES = ('laugh', 'wipeTears', 'facepalm', 'shush', 'okSign', 'salute')          # đợt 39 B (acting_check đo riêng từng cái)
GESTURES += EVERYDAY_GESTURES
GESTURES += ('jump', 'dance')          # đợt 42 D — hai tay giơ cao lúc nhảy / múa: bàn tay trong khung
# ĐỢT 42 D — CHẠY, NHẢY LÊN, NHẢY MÚA (cả thân): nhịp của chúng là góc TOÀN (cả người, bàn chân trong khung; máy đo thêm ở đỉnh cú nhảy
# — đầu không chạm mép trên); chạy là nhịp có người đi (`move`). `["run", "@tên"]` chạy tới đứng cạnh người / con vật ấy (cách
# RUN_GAP × chiều cao người chạy, tính từ giữa người tới mép gần của nó). moments.json đo (acting_check `motion42d`): pha bay
# (hai bàn chân rời sàn), chân trụ không trượt, chân về sàn sau khi tiếp đất, đầu / tay / chân trong khung.
WHOLE_BODY = ('run', 'jump', 'dance')
RUN_GAP = 0.42
RUN_TO = {}               # id(bước ["run", "@tên"]) → tên người / con vật chạy tới (nhịp máy quay lấy cả hai)
# ĐỢT 42 E — SÁT SÀN: nhặt đồ dưới sàn (`pickUp`), ngồi bệt (`sitOnFloor`), nằm trên sàn / sofa (`lieDown`). acting_check đo mông chạm sàn, thân nằm
# ngang trên mặt sàn / mặt sofa, bàn tay tới món đồ lúc nắm, món đồ trong tay sau đó (`floor42e`).
FLOOR_ACTIONS = ('sitOnFloor', 'lieDown', 'pickUp')
# ĐỢT 43 C: con vật tới một ĐỨA TRẺ NGỒI BỆT dừng xa hơn (0,27 × chiều cao host, thay vì 0,22 như người ngồi ghế): trẻ vẽ nhỏ trong cùng
# một host, vai ngồi bệt thấp — đầu con vật sát vai thì khuỷu gập quá mức, bàn tay dựng đứng cạnh tai nó (bé ngồi bệt vuốt mèo: 7 / 13 mốc
# tay không chạm; vuốt chó: không mốc nào). Dò 0,22–0,30: bé × mèo / chó đạt ở 0,27–0,28. Người lớn giữ 0,22 — ở 0,27 con mèo xa quá,
# khung trung cảnh "mẹ + mèo" rộng gần bằng toàn cảnh (home43a). Trẻ: nhân vật dựng trên `kit.bodies.child` (characters/*.js).
FLOOR_GAP = 0.22
FLOOR_GAP_KID = 0.27


def _kid_ids():
    folder = os.path.join(ROOT, 'characters')
    ids = set()
    for file in os.listdir(folder) if os.path.isdir(folder) else []:
        if not file.endswith('.js') or file.startswith('_'): continue
        text = open(os.path.join(folder, file), encoding='utf-8').read()
        found = re.search(r"\bid:\s*'([^']+)'", text)
        if found and 'bodies.child' in text: ids.add(found.group(1))
    return ids


KID_IDS = _kid_ids()
PICK_GAP = 0.34          # nhặt đồ chơi cạnh con vật: giữa người cách giữa con vật chừng ấy × chiều cao người (món đồ vào tầm tay lúc ngồi xổm)
FLOOR_TIMES = {'sitOnFloor': (1.2, 1.5), 'lieDown': (1.9, 2.0), 'pickUp': (1.0, 2.6)}      # (đã vào thế, xong bước) giây từ đầu bước — runtime/rig-svg.js


# ĐỢT 39 C — NGƯỜI DẪN: giơ bảng chữ, ra dấu kích thước, chụp ảnh tự sướng, ngáp vươn vai. Tay / bảng / điện thoại phải nằm trong khung
# (cùng đường đo `GESTURES`); `acting_check` đo thêm tấm bảng (chữ đủ lớn, trước ngực), khe giữa hai tay, điện thoại + người chụp cùng, tay qua đầu.
PRESENTER_ACTIONS = ('holdSign', 'showSize', 'takeSelfie', 'yawnStretch')
SHOW_SIZE_GAP = {'small': 44, 'medium': 130, 'big': 250}      # runtime/rig-svg.js SIZE_GAP — khe giữa hai lòng bàn tay (đơn vị khung 400 × 470 của người lớn)
# ĐỘNG TÁC THÚ đợt 35: moments.json đo con vật trong khung, chân trên sàn (lăn ngửa: lưng trên sàn, chân chổng trời), nấp: đầu ló ra,
# thân khuất một phần; liếm: mõm tới tay / mặt người.
PET_ACTS = ('rollOver', 'chaseTail', 'knead', 'lick', 'hide', 'eatCarrot', 'bark')
CLINIC_PET_ACTS = ('shiverAtVet', 'struggle', 'groggy', 'pawAtCone')           # đợt 40 C — thú ở phòng khám
PET_ACTS += CLINIC_PET_ACTS
PET_ACT_ASK = {'rollOver': 'Is the animal lying on its back, belly up, with its paws in the air?',
               'chaseTail': 'Is the dog spinning round after its tail (or, at the end, dizzy)?',
               'knead': 'Is the cat pressing its front paws up and down (kneading), eyes half shut?',
               'lick': 'Is the animal licking the person (tongue out at their hand or face)?',
               'hide': 'Is the animal hiding behind someone, only its head peeking out, scared?',
               'eatCarrot': 'Is the rabbit holding a carrot to its mouth with its front paws, nibbling it?',
               'bark': 'Is the dog barking — mouth wide open, head tossed up, bark lines in front of its mouth?'}
DOG_ACTS = ('playBow', 'howl', 'dig', 'carryToy', 'leanOnLeg', 'tugOfWar')     # đợt 40 A — sáu động tác của chó
PET_ACTS += DOG_ACTS
PET_ACT_ASK.update({'playBow': 'Is the dog in a play bow — front legs stretched out, chest on the floor, rump up, tail wagging, mouth open?',
                    'howl': 'Is the dog sitting and howling — head thrown back, muzzle up, mouth in an O, eyes shut, wavy sound lines rising?',
                    'dig': 'Is the dog digging — nose down, front paws scraping the floor in turns, dirt flying back between its hind legs?',
                    'carryToy': 'Is the dog trotting with a toy (a rope or a bone) in its mouth, head high and proud — or dropping it on the floor?',
                    'leanOnLeg': 'Is the dog leaning its side against the person\'s leg, looking up at them with half-closed eyes?',
                    'tugOfWar': 'Is the dog in a tug of war — gripping a rope in its mouth, braced, pulling back and shaking its head, the rope taut to the person\'s hand?'})
# Đợt 40 B — mèo và thỏ (cùng bảng: góc cận gần hơn PET_CLOSE_FILLS, acting_check `check_cat_rabbit_act`).
CAT_RABBIT_ACTS = ('groomFace', 'loaf', 'slowBlink', 'batToy', 'archBack', 'sitInBox', 'binky', 'flop', 'periscope', 'noseTwitch')
PET_ACTS += CAT_RABBIT_ACTS
PET_ACT_ASK.update({'groomFace': 'Is the cat sitting and wiping a licked front paw over its ear and face?',      # đợt 40 B
                    'loaf': 'Is the cat lying like a loaf of bread — paws tucked under, a compact round shape, eyes half closed?',
                    'slowBlink': 'Does the cat look at the viewer and close its eyes slowly (eyes shut for a moment)?',
                    'batToy': 'Is the cat crouched, swiping a front paw at a small ball of yarn that rolls away?',
                    'archBack': 'Is the cat in a Halloween pose — back arched high, fur puffed up, tail up and bushy?',
                    'sitInBox': 'Is the cat sitting in a cardboard box with only its head and ears above the rim?',
                    'binky': 'Is the rabbit jumping with a happy twist in mid-air, hind legs kicking out?',
                    'flop': 'Is the rabbit flopped on its side, legs stretched out, relaxed?',
                    'periscope': 'Is the rabbit standing up on its hind legs, front paws tucked, ears high, looking around?',
                    'noseTwitch': 'Is the rabbit\'s nose twitching with whiskers moving, in a close shot?'})
PET_ACT_ASK.update({'shiverAtVet': 'Is the animal cowering low, ears flat back, tail tucked, eyes wide, trembling with fear?',   # đợt 40 C
                    'struggle': 'Is the animal struggling (squirming, legs kicking, head turned away) while the person holds it tight?',
                    'groggy': 'Is the animal groggy after anaesthesia — head drooping, eyes half shut, swaying, dizzy?',
                    'pawAtCone': 'Is the animal wearing a cone and pawing at its rim with a front paw, then sitting sadly?'})
PET_MOOD_MARKS = {'scared': '!', 'curious': '?', 'sleepy': 'zzz', 'happy': 'heart', 'excited': 'heart', 'angry': 'anger', 'guilty': 'sweat', 'pain': 'sweat'}
DESK_ACTIONS = ('payByQR', 'payByCard', 'giveChange', 'stampCard', 'pourDrink', 'wipeCounter')
DESK_PAY = ('payByQR', 'payByCard')
DESK_ITEM = {'payByQR': 'phone', 'payByCard': 'card', 'giveChange': 'cash', 'stampCard': 'stampcard', 'pourDrink': 'cup'}      # món đồ phải đang cầm
DESK_NOUN = {'phone': 'a phone', 'card': 'a bank card', 'cash': 'banknotes', 'stampcard': 'a stamp card', 'cup': 'a cup'}
DESK_OPTIONS = {'open', 'full', 'stamped'}                 # tuỳ chọn của món đồ cầm: cốc thuỷ tinh (đầy), thẻ tích điểm đã đóng dấu
PAY_REACH = 0.17                                           # người trả tiền đứng cách đế thanh toán chừng này × chiều cao (tay chibi ngắn)
PAIR_PARTNER.update({'giveChange': 'takeChange', 'stampCard': 'takeCard'})
PAIR_PARTS = PAIR_PARTS + ('takeChange', 'takeCard')
PAIR_GAP.update({'giveChange': 0.4, 'stampCard': 0.4})
REACH_ACTIONS.update({'payByQR': 'desk', 'payByCard': 'desk', 'pourDrink': 'desk', 'wipeCounter': 'desk'})        # chỉ để moments.json lấy giờ thật của bước
PAIR_ASK.update({'giveChange': 'Is {who} counting banknotes from one hand to the other and then handing them to {target}?',
                 'stampCard': 'Is {who} pressing a stamp onto a card (a red mark stays) and then handing the card to {target}?'})
DESK_ASK = {'payByQR': 'Is {who} holding a phone up to the QR code on the stand, with a green tick showing afterwards?',
            'payByCard': 'Is {who} tapping a bank card on the card reader, with a green tick showing afterwards?',
            'stampCard': 'Is {who} pressing a stamp onto a card held in the other hand, with a red mark left on the card?',
            'pourDrink': 'Is {who} pouring a drink from a pitcher into a cup, a stream visible and the cup filling up?',
            'wipeCounter': 'Is {who} wiping the counter top with a cloth, head bent towards it?',
            'giveChange': 'Is {who} counting banknotes from one hand to the other and then handing them over?'}
# GÓC CẬN TỰ ĐỘNG cho động tác riêng của thú (đợt 35, lượt ba): con vật ≥ 35 % chiều cao khung — ở góc toàn phòng khách nó chỉ cao ~1/12
# khung, lưỡi và chân trước chỉ vài điểm ảnh. `alone`: được lẹm người khác; `fill`: phần chiều cao khung con vật chiếm.
PET_CLOSE = ('rollOver', 'chaseTail', 'knead', 'eatCarrot', 'lick', 'bark')
PET_CLOSE_FILL = 0.62
PET_CLOSE += DOG_ACTS      # đợt 40 A — góc cận con vật (dựa chân / kéo co: chân và tay người, đầu dây vẫn lọt vào khung)
TUG_STAND = 0.29             # đợt 40 A: mõm con chó cách giữa người bấy nhiêu × chiều cao người lúc kéo co (runtime/rig-thu.js TUG_ROPE: along + reach)
TUG_SNOUT = 84               # … đầu dây ở mõm cách giữa khung con chó chừng ấy đơn vị khung của nó (thế giật ngược)
PET_CLOSE += CAT_RABBIT_ACTS      # đợt 40 B
PET_CLOSE_FILLS = {'noseTwitch': 0.95, 'slowBlink': 0.9, 'groomFace': 0.8, 'loaf': 0.95, 'flop': 0.7, 'batToy': 0.95, 'archBack': 0.9, 'binky': 0.9}      # đợt 40 B: cận hơn cho mặt (mũi, mắt) — phần chiều cao khung
PET_CLOSE += CLINIC_PET_ACTS                 # đợt 40 C
LICK_BEAT = 1.0          # đợt 40 C: giây mỗi cái liếm — runtime/rig-thu.js `LICK_BEAT` (bàn tay / má chìa ra đủ lâu)


# ĐỢT 38 B — GIỮ CON VẬT (`restrain`) cùng lúc người khác làm trên nó. Độ dài (giây) các bước của người kia — như runtime/rig-svg.js —
# để thời gian giữ vừa khít: giữ tới khi người kia rút tay về, rồi vuốt dỗ. Tham số thiếu thì lấy mặc định của rig.
PARTNER_SECONDS = {'inject': lambda a: 2.35, 'examine': lambda a: _num(a, 1, 1.4) + 1.4, 'listen': lambda a: _num(a, 0, 1.6) + 1.5,
                   'takeTemp': lambda a: _num(a, 0, 1.5) + 2.7, 'givePill': lambda a: 3.15, 'giveTreat': lambda a: 1.9,
                   'brush': lambda a: 1.0 + 0.42 * _num(a, 0, 4), 'stroke': lambda a: 2.2, 'bandage': lambda a: 0.55 * round(_num(a, 0, 3)) + 1.65,
                   'putCone': lambda a: 3.1, 'offerHand': lambda a: _num(a, 0, 1.6) + 1.1, 'kneel': lambda a: 0.65, 'showItem': lambda a: 0.74,
                   'hideItem': lambda a: 0.74, 'lookAt': lambda a: 0.35, 'look': lambda a: 0.35}
RESTRAIN_GAP = 0.27           # người giữ đứng cách giữa thân con vật bấy nhiêu × chiều cao host, phía bên kia người làm
RESTRAIN_TAIL = 0.85          # giây sau lúc giữ: vuốt dỗ + buông (rig: RESTRAIN_STROKE) — giữ = phần việc của người kia − (1 − …)


RESTRAIN_PAIRS = {}           # id(bước restrain) → (người làm cùng lúc, động tác của họ) — `step_code` biết đầu con vật quay về đâu
