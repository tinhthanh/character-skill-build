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
    máy        tự động (mặc định: máy tự chọn mọi góc) · cố định (một góc toàn cảnh)
    khung      ngang (1920×1080, mặc định) · dọc (1080×1920: TikTok, Reels, Shorts)
    mở đầu / kết thúc   tiêu đề | dòng phụ | nút (thẻ đầu / cuối phim) · logo  tệp ảnh · nhạc  tệp nhạc nền
  Dòng nhân vật: tên (mã, tuỳ chọn, …) nối bằng " · ". Mã: vet, boy, granny… hoặc loài thú dog, cat, corgi, calico,
    rabbit… Tuỳ chọn: "trên bàn" / "trên ghế" / "trên quầy" (đứng / ngồi trên hộp của bối cảnh), "ngồi" (người ngồi
    trên ghế), "đeo loa", "băng chân", "giọng maichi" (tự tạo giọng đọc bằng voice-tts).
  Dòng kịch bản:
    tên: lời thoại                     tên (tâm trạng): lời thoại
    tên: [hành động, hành động]        thú: [sợ] — một cảm xúc; [sợ, run] — giữ nét mặt sợ trong lúc run
    tên → tên khác: hành động          cho thuốc, cho bánh, vuốt ve, khám, bế, chải lông, tiêm, nghe tim, bắt tay, chỉ vào
    cùng lúc: tên: … | tên: …          các lượt diễn cùng một lúc
  Dòng bắt đầu bằng # là ghi chú. Hành động / tâm trạng viết tiếng Việt hay tên gốc (wave, happy…) đều được.
"""
import argparse, json, os, re, subprocess, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
PET_SPECIES = ('dog', 'cat', 'rabbit', 'shiba', 'orange_cat', 'black_cat', 'corgi', 'poodle', 'husky', 'black_dog', 'white_cat', 'calico')
PRESETS = {'phòng khám': 'exam', 'khám': 'exam', 'lễ tân': 'reception', 'quầy lễ tân': 'reception', 'nhà thuốc': 'pharmacy', 'quầy thuốc': 'pharmacy',
           'công viên': 'park', 'đường phố': 'street', 'phố': 'street', 'phòng khách': 'living-room', 'nhà': 'living-room'}
# Hộp của từng bối cảnh (theo tools/scene.py SET_PRESETS) mà một nhân vật có thể đứng / ngồi lên.
BOXES = {'exam': {'table': (100, -480, 200, 160)}, 'reception': {'counter': (-520, -430, 440, 140), 'bench': (330, -820, 360, 120)},
         'pharmacy': {'counter': (-260, -420, 520, 130)}, 'park': {'bench': (220, -880, 340, 110)},
         'living-room': {'sofa': (-560, -860, 520, 180), 'coffee-table': (-420, -560, 240, 120)}, 'street': {}}
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


class ScriptError(Exception):
    pass


def slug(text):
    """Tên nhân vật tiếng Việt → tên biến JavaScript: "bác sĩ" → "bac_si"."""
    plain = unicodedata.normalize('NFD', text.replace('đ', 'd').replace('Đ', 'D'))
    plain = ''.join(ch for ch in plain if unicodedata.category(ch) != 'Mn').lower()
    name = re.sub(r'[^a-z0-9]+', '_', plain).strip('_') or 'nv'
    return ('nv_' + name) if name[0].isdigit() or name in ('set', 'tl', 'talk', 'host', 'frameAt', 'CUTS', 'T0', 'T1') else name


def parse(text):
    """Trả về (tuỳ chọn đầu, danh sách nhân vật, danh sách mục kịch bản). Lỗi: ScriptError có số dòng."""
    head, cast, lines = {}, [], []
    for number, raw in enumerate(text.splitlines(), 1):
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
        if not lines and keys and all(key in ('bối cảnh', 'máy', 'khung', 'mở đầu', 'kết thúc', 'logo', 'nhạc', 'âm lượng nhạc') for key in keys):
            for part in pairs:
                key, value = part.split(':', 1)
                head[key.strip().lower()] = value.strip()
            continue
        lines.append((where, line))
    return head, cast, lines


def build_scene(text, base):
    head, cast, lines = parse(text)
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
        for c in floor:
            c['x'] = x
            x -= 300 if 'id' in c else 220
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
                elif word in ACTIONS or re.match(r'^[a-zA-Z]+$', word): turn.setdefault('do', []).append(ACTIONS.get(word, word))
                else: raise ScriptError(f'{where}: không biết hành động "{word}" — ví dụ: {", ".join(list(ACTIONS)[:14])}…')
        else:
            if pet: raise ScriptError(f'{where}: {m.group(1).strip()} là thú, không nói được — dùng [sủa], [kêu] hay một cảm xúc [vui]')
            turn['say'] = rest
        return turn

    script = []
    for where, line in lines:
        if line.lower().startswith('cùng lúc:'):
            parts = [part.strip() for part in line.split(':', 1)[1].split('|') if part.strip()]
            if len(parts) < 2: raise ScriptError(f'{where}: "cùng lúc:" cần ít nhất hai lượt, cách nhau bằng "|"')
            script.append({'together': [turn_of(part, where) for part in parts]})
        else:
            script.append(turn_of(line, where))
    if not script: raise ScriptError('kịch bản chưa có dòng thoại / hành động nào')

    scene = {'id': slug(os.path.splitext(os.path.basename(base))[0]).replace('_', '-'), 'set': {'preset': preset}, 'characters': characters, 'script': script}
    if portrait: scene['width'], scene['height'] = 1080, 1920
    if camera == 'tự động': scene['camera'] = 'auto'
    for key, card in (('mở đầu', 'intro'), ('kết thúc', 'outro')):
        if head.get(key):
            parts = [part.strip() for part in head[key].split('|')]
            scene[card] = {k: v for k, v in zip(('title', 'text', 'cta'), parts) if v}
            if head.get('logo'): scene[card]['logo'] = head['logo']
    if head.get('nhạc'): scene['music'] = head['nhạc']
    return scene


def main():
    parser = argparse.ArgumentParser(description='Kịch bản chữ thường → scene.json → composition (tools/scene.py).')
    parser.add_argument('script', help='tệp kịch bản .txt')
    parser.add_argument('--no-build', action='store_true', help='chỉ viết .scene.json, không dựng')
    args = parser.parse_args()
    try: text = open(args.script, encoding='utf-8').read()
    except OSError as error: sys.exit(f'script: không đọc được {args.script}: {error}')
    try: scene = build_scene(text, args.script)
    except ScriptError as error: sys.exit(f'script: {args.script}: {error}')
    out = os.path.splitext(args.script)[0] + '.scene.json'
    json.dump(scene, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(out)
    if args.no_build: return
    done = subprocess.run([sys.executable, os.path.join(HERE, 'scene.py'), out, '--force'])
    sys.exit(done.returncode)


if __name__ == '__main__':
    main()
