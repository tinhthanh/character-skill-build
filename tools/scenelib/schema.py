"""The keys and kinds a scene file may use (unknown keys are errors — see `known`)."""

TOP_KEYS = ('id', 'width', 'height', 'seed', 'gap', 'background', 'characters', 'props', 'script', 'camera', 'captions', 'layout', 'music', 'musicVolume', 'set', 'sides', 'intro', 'outro', 'marks', 'sounds', 'hook')
CARD_KEYS = ('title', 'text', 'cta', 'logo', 'dur', 'color')
CHARACTER_KEYS = ('narrator', 'name', 'id', 'species', 'x', 'height', 'enter', 'seated', 'faces', 'voice', 'holds', 'holdsHidden', 'z', 'on', 'wears', 'side', 'rides')
CHARACTER_KEYS = CHARACTER_KEYS + ('inTub',)               # đợt 42 F: con vật đứng trong chậu tắm (tự thêm, cỡ vừa nó)
NARRATOR_KEYS = ('narrator', 'name', 'voice')            # đợt 42 A: người dẫn không hiện hình chỉ có tên, giọng đọc
NARRATOR_TURN_KEYS = ('who', 'say', 'audio', 'dur', 'voice', 'view')
NARRATOR_RIG = 'vet'                                     # rig vô hình mượn để có miệng / cue / phụ đề; không bao giờ `set.place`


WEARABLES = ('cone', 'bandage')                          # phụ kiện thú đeo suốt cảnh (rig.wear)
PERSON_WEARABLES = ('mask', 'gloves', 'cap')              # phụ kiện người: khẩu trang, găng tay, mũ phẫu thuật
PROP_KEYS = ('kind', 'x', 'height', 'color', 'width', 'tabletop', 'back', 'front', 'fill', 'reading', 'door', 'facing')
CAT_SPECIES = ('cat', 'orange_cat', 'black_cat', 'white_cat', 'calico')
CAT_BREEDS = ('calico',)                                 # giống mèo mà tên không có chữ "cat" (runtime/rig-thu.js LOAI)
GSAP_FILE = 'gsap-3.15.1.min.js'                          # vendor/ — GSAP ghim phiên bản (đợt 27)
TURN_KEYS = ('who', 'say', 'audio', 'dur', 'do', 'shot', 'mood', 'show', 'voice', 'enter', 'exit', 'view', 'phone', 'toast', 'popup', 'mark', 'lamp', 'power', 'sky')
MARKS = ('!', '?', 'heart', 'zzz', 'sweat', 'anger', 'music', 'dizzy')         # runtime/marks.js
SHOW_KEYS = ('title', 'bullets', 'image')
PET_MOODS = ('happy', 'excited', 'sad', 'scared', 'angry', 'curious', 'guilty', 'pain', 'sleepy')      # RigThu.EXPRESSIONS
MOODS = ('happy', 'sad', 'surprised', 'angry', 'thinking', 'laughing', 'worried', 'confused', 'tired', 'crying', 'embarrassed', 'sleepy')
BACKGROUND_KEYS = ('wall', 'wallDark', 'floor', 'floorHeight', 'image', 'preset')
# BỐI CẢNH 3D ("set"): phòng dựng bằng mặt phẳng, máy quay đổi góc theo từng lượt ("view"). Xem runtime/set3d.js.
SET_KEYS = ('sky', 'room', 'boxes', 'panels', 'cutouts', 'camera', 'origin', 'preset', 'light', 'lamps', 'shading', 'lens', 'grain')
LIGHT_MOODS = ('day', 'evening', 'night')
LAMP_KEYS = ('name', 'x', 'y', 'z', 'color', 'power', 'range', 'on', 'kind')
ROOM_KEYS = ('width', 'depth', 'height', 'front', 'floor', 'floor2', 'tile', 'wall', 'sideWall', 'gloss', 'skyline')
BOX_KEYS = ('name', 'x', 'z', 'width', 'depth', 'height', 'y', 'color', 'top', 'side')
PANEL_KEYS = ('wall', 'at', 'y', 'width', 'height', 'color', 'border', 'image', 'window')
CUTOUT_KEYS = ('kind', 'image', 'x', 'z', 'y', 'height', 'color', 'shadow', 'screen', 'facing', 'fill', 'reading', 'door', 'name', 'on', 'drive', 'spot')
DRIVE_KEYS = ('from', 'dur', 'ease')               # một cutout CHẠY VÀO đầu cảnh: từ x `from` tới x của nó trong `dur` giây
CUTOUT_KINDS = ('plant', 'chair', 'stool', 'table', 'counter', 'laptop', 'monitor', 'bowl', 'scale', 'carrier', 'tree', 'lamp', 'floorlamp', 'tv', 'scooter', 'xray')
SCREEN_KINDS = ('laptop', 'monitor')                     # đạo cụ có màn hình: nhận `screen` (ảnh) — laptop thêm `facing`
FLOOR_KINDS = ('bowl', 'scale', 'carrier', 'tree', 'lamp', 'floorlamp', 'tv', 'scooter')                           # đồ thú y đặt trên sàn: bát (`fill`), cân (`reading`)
ITEM_KINDS = ('cup', 'clipboard', 'phone', 'syringe', 'pills', 'leash', 'bag')
# ĐỢT 39 A — QUẦY THU NGÂN & QUẦY CÀ PHÊ: quét QR / quẹt thẻ (cần một đế thanh toán `paystand` trên quầy — cảnh dựng sẵn tự thêm), thối tiền, đóng
# dấu thẻ (đưa cho người kia nếu có đích), rót đồ uống, lau quầy. `giveChange` / `stampCard` với đích là bước HAI NGƯỜI (như đưa túi thuốc): người
# kia nhận (`takeChange` / `takeCard`) cùng lúc, có sẵn món đồ đang cất.
ITEM_KINDS = ITEM_KINDS + ('card', 'stampcard', 'cash')
ITEM_KINDS = ITEM_KINDS + ('toy', 'bowl')            # đợt 42 E: quả bóng đồ chơi, bát ăn — `pickUp` nhặt lên, người kia `take` (holds + holdsHidden)
CUTOUT_KINDS = CUTOUT_KINDS + ('paystand',)
CUTOUT_KINDS = CUTOUT_KINDS + ('tub',)                     # đợt 42 F: chậu tắm (con vật trong chậu: "inTub" trên con vật — chậu tự thêm vừa cỡ nó)
CAMERA_KEYS = ('yaw', 'pitch', 'distance', 'lens', 'x', 'y', 'z', 'zoom', 'blur')
VIEW_KEYS = CAMERA_KEYS + ('dur', 'ease', 'cut', 'wide', 'on', 'size', 'back', 'alone', 'fill')
VIEW_SIZES = ('close', 'medium', 'full')
