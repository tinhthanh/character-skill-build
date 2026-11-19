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
    tên → tên khác: hành động          cho thuốc, cho bánh, vuốt ve, khám, bế, chải lông, tiêm, nghe tim, bắt tay, chỉ vào
    cùng lúc: tên: … | tên: …          các lượt diễn cùng một lúc
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
           'nhảy cóc': 'hop', 'giậm chân': 'thump', 'đứng yên': 'idle', 'chờ': 'idle'}
TARGETED = {'cho thuốc': ('giveTreat', {'kind': 'pill'}), 'uống thuốc': ('giveTreat', {'kind': 'pill'}), 'cho bánh': ('giveTreat', None), 'cho ăn': ('giveTreat', None),
            'vuốt ve': ('stroke', None), 'xoa đầu': ('stroke', None), 'khám': ('examine', None), 'soi đèn': ('examine', None), 'bế': ('carry', None),
            'chải lông': ('brush', None), 'tiêm': ('inject', None), 'nghe tim': ('listen', None), 'bắt tay': ('handshake', None), 'chỉ vào': ('point', None),
            'chỉ': ('point', None), 'đưa': ('handOver', None), 'trao': ('handOverPet', None), 'dắt': ('leash', None), 'nhìn': ('face', None)}
MARKS = {'!': '!', '?': '?', 'tim': 'heart', 'zzz': 'zzz', 'mồ hôi': 'sweat', 'giận': 'anger', 'nhạc': 'music'}
HEAD_KEYS = ('bối cảnh', 'máy', 'khung', 'mở đầu', 'kết thúc', 'logo', 'nhạc', 'âm lượng nhạc', 'ánh sáng')
LIGHTS = {'ngày': 'day', 'ban ngày': 'day', 'chiều': 'evening', 'chạng vạng': 'evening', 'tối': 'night', 'đêm': 'night', 'ban đêm': 'night'}
SWITCHES = {'bật đèn': 'on', 'tắt đèn': 'off'}


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
    boxes = BOXES[preset]
    for who in cast:
        name = slug(who['label'])
        while name in names: name += '_2'
        names.add(name); labels[who['label'].lower()] = name
        pet = who['id'] in PET_SPECIES
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

    def turn_of(body, where):
        """Một lượt: "tên (tâm trạng): lời" · "tên: [hành động…]" · "tên → tên khác: hành động"."""
        m = re.match(r'^(.+?)\s*→\s*(.+?)\s*:\s*(.+)$', body)
        if m:
            who, target, verb = who_of(m.group(1), where), who_of(m.group(2), where), m.group(3).strip().lower().strip('[]')
            if verb not in TARGETED: raise ScriptError(f'{where}: không biết "{verb}" — dùng: {", ".join(TARGETED)}')
            action, extra = TARGETED[verb]
            step = [action, f'@{target}'] + ([extra] if extra else [])
            return {'who': who, 'do': [step]}
        m = re.match(r'^(.+?)(?:\s*\(([^)]*)\))?\s*:\s*(.+)$', body)
        if not m: raise ScriptError(f'{where}: không hiểu dòng này — viết "tên: lời", "tên: [hành động]" hay "tên → tên khác: hành động"')
        who, mood_word, rest = who_of(m.group(1), where), (m.group(2) or '').strip().lower(), m.group(3).strip()
        pet, turn = is_pet(who), {'who': who}
        if mood_word:
            table = PET_MOODS if pet else PERSON_MOODS
            mood = table.get(mood_word) or (mood_word if mood_word in table.values() else None)
            if not mood: raise ScriptError(f'{where}: tâm trạng "{mood_word}" chưa có — dùng: {", ".join(table)}')
            turn['mood'] = mood
        if rest.startswith('['):
            if not rest.endswith(']'): raise ScriptError(f'{where}: thiếu "]"')
            for word in [part.strip().lower() for part in rest[1:-1].split(',') if part.strip()]:
                table = PET_MOODS if pet else PERSON_MOODS
                if word in table or word in table.values():
                    if 'mood' in turn: raise ScriptError(f'{where}: hai tâm trạng trong một lượt')
                    turn['mood'] = table.get(word, word)
                elif word in MARKS: turn['mark'] = MARKS[word]
                elif word in SWITCHES: turn['lamp'] = SWITCHES[word]
                elif word in ACTIONS or re.match(r'^[a-zA-Z]+$', word): turn.setdefault('do', []).append(ACTIONS.get(word, word))
                else: raise ScriptError(f'{where}: không biết hành động "{word}" — ví dụ: {", ".join(list(ACTIONS)[:14])}…')
        else:
            if pet: raise ScriptError(f'{where}: {m.group(1).strip()} là thú, không nói được — dùng [sủa], [kêu] hay một cảm xúc [vui]')
            turn['say'] = rest
        return turn

    script, pending = [], None
    for where, line in lines:
        if line.lower().startswith('thông báo:'):
            # THÔNG BÁO của ứng dụng ("thông báo: Nhắc lịch tái khám | Thứ Bảy 9:00"): thẻ trượt vào khung ở lượt KẾ TIẾP.
            parts = [part.strip() for part in line.split(':', 1)[1].split('|')]
            if not parts[0]: raise ScriptError(f'{where}: "thông báo:" cần một tiêu đề — "thông báo: Nhắc lịch tái khám | Thứ Bảy 9:00"')
            pending = {'title': parts[0], **({'text': parts[1]} if len(parts) > 1 and parts[1] else {})}
            continue
        if line.lower().startswith('cùng lúc:'):
            parts = [part.strip() for part in line.split(':', 1)[1].split('|') if part.strip()]
            if len(parts) < 2: raise ScriptError(f'{where}: "cùng lúc:" cần ít nhất hai lượt, cách nhau bằng "|"')
            script.append({'together': [turn_of(part, where) for part in parts]})
            if pending: script[-1]['together'][0]['toast'] = pending; pending = None
        else:
            script.append(turn_of(line, where))
            if pending: script[-1]['toast'] = pending; pending = None
    if pending and script: (script[-1]['together'][0] if 'together' in script[-1] else script[-1])['toast'] = pending
    if not script: raise ScriptError('kịch bản chưa có dòng thoại / hành động nào')

    # Chỉ giữ nhân vật CÓ MẶT trong kịch bản của cảnh này (phim nhiều cảnh: dàn nhân vật khai một lần cho cả phim).
    used = {name for pair in re.findall(r'"who": "([^"]+)"|"@([^"]+)"', json.dumps(script, ensure_ascii=False)) for name in pair if name}
    characters = [c for c in characters if c['name'] in used] or characters
    scene = {'id': slug(os.path.splitext(os.path.basename(base))[0]).replace('_', '-'), 'set': {'preset': preset}, 'characters': characters, 'script': script}
    if head.get('ánh sáng'):
        mood = LIGHTS.get(head['ánh sáng'].lower())
        if not mood: raise ScriptError(f'ánh sáng phải là {", ".join(LIGHTS)} — "{head["ánh sáng"]}"')
        scene['set']['light'] = mood
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
