"""Expanding the script before the build: combos (runtime/combos.js), restrain timing, narrator turns."""
import json, os, re
from .actions import PARTNER_SECONDS, RESTRAIN, RESTRAIN_PAIRS, RESTRAIN_TAIL
from .schema import NARRATOR_TURN_KEYS
from .util import ROOT, fail, js, known


def narrator_split(script, narrators):
    """ĐỢT 42 A: tách lượt của NGƯỜI DẪN (giọng, không hiện hình) khỏi các lượt của nhân vật thật. Lượt riêng → mục `together` rỗng kèm
    `_narrator_turns`; lượt trong `together` → dời sang `_narrator_turns` của mục ấy. Nhờ vậy mọi bước đo / dựng góc máy chỉ thấy nhân vật thật."""
    if not narrators: return script
    out = []
    for index, entry in enumerate(script):
        where = f'script[{index}]'
        group = entry['together'] if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]
        voices = [turn for turn in group if isinstance(turn, dict) and turn.get('who') in narrators]
        if not voices:
            out.append(entry); continue
        for turn in voices:
            known(f'{where} (narrator "{turn["who"]}")', turn, NARRATOR_TURN_KEYS)
            if not isinstance(turn.get('say'), str) or not turn['say'].strip(): fail(f'{where}: the narrator "{turn["who"]}" has no body — a turn of theirs needs a "say" line (nothing else)')
        if group is not entry.get('together'):                        # lượt riêng của người dẫn: "view" (nếu có) thuộc về mục
            wrapper = {'together': [], '_narrator_turns': [{k: v for k, v in entry.items() if k != 'view'}]}
            if 'view' in entry: wrapper['view'] = entry['view']
            out.append(wrapper)
        else:
            if any('view' in turn for turn in voices): fail(f'{where}: put "view" on the "together" entry, not on the narrator\'s turn')
            out.append(dict(entry, together=[turn for turn in group if turn not in voices], _narrator_turns=[dict(turn) for turn in voices]))
    return out


def load_combos():
    """COMBO (đợt 37): bảng JSON giữa hai dòng BEGIN / END COMBOS của runtime/combos.js — một bảng cho runtime, scene.py, script.py."""
    source = open(os.path.join(ROOT, 'runtime', 'combos.js'), encoding='utf-8').read()
    block = re.search(r'// BEGIN COMBOS\nexport const COMBOS = (\{.*\});\n// END COMBOS', source, re.S)
    if not block: fail('runtime/combos.js: the COMBOS block between "// BEGIN COMBOS" and "// END COMBOS" is missing')
    return json.loads(block.group(1))


COMBOS = load_combos()


def combo_fill(step, values):
    """Thay "$tên" bằng giá trị; tham số không có → bỏ nó và mọi đối số sau nó (như fill() trong runtime/combos.js)."""
    parts = step if isinstance(step, list) else [step]
    out = []
    for part in parts:
        if isinstance(part, str) and re.match(r'^\$[A-Za-z_]\w*$', part):
            value = values.get(part[1:])
            if value is None: break
            out.append(value)
        else: out.append(part)
    return out if isinstance(step, list) else out[0]


def combo_turns(who, name, args, where):
    """Một combo của `who` → các lượt kịch bản: mỗi bước một lượt; bước có "with" → { together: […] } với nhân vật kia."""
    combo = COMBOS[name]
    if len(args) > len(combo['params']): fail(f'{where}: combo "{name}" takes {len(combo["params"])} argument(s) ({", ".join(combo["params"]) or "none"}), got {len(args)}')
    values = dict(zip(combo['params'], args))
    if 'self' not in combo['params'] and isinstance(who, str): values['self'] = '@' + who          # đợt 50 B: "$self" — chính người làm combo (phần "with" của người kia nhắm vào họ)
    turns = []
    for raw in combo['steps']:
        own = raw['step'] if isinstance(raw, dict) else raw
        if isinstance(own, list) and len(own) > 1 and isinstance(own[1], str) and own[1].startswith('$') and values.get(own[1][1:]) is None:
            fail(f'{where}: combo "{name}" needs {", ".join(combo["params"])} — e.g. ["{name}", ' + ', '.join(f'"@{p}"' for p in combo['params']) + ']')
        step = combo_fill(own, values)
        turn = {'who': who, 'do': [step]}
        partners = []
        for key, steps in (raw.get('with') or {}).items() if isinstance(raw, dict) else []:
            other = values.get(key[1:])
            if isinstance(other, str) and other.startswith('@'): partners.append({'who': other[1:], 'do': [combo_fill(s, values) for s in steps]})
        turns.append({'together': [turn] + partners} if partners else turn)
    return turns


def expand_combos(script):
    """Kịch bản có bước combo (`["fullCheckup", "@cho"]`) → mỗi bước của combo thành một lượt riêng, để mọi thứ tools/scene.py
    làm cho một lượt (máy quay, con vật đáp lại, quỳ xuống, bước lại gần…) áp dụng cho từng bước. Các khoá khác của lượt
    (say, mood, view, toast…) ở lượt đầu — có "say" thì chúng thành một lượt nói riêng trước combo; "exit" ở lượt cuối."""
    if not isinstance(script, list): return script
    out = []
    for index, entry in enumerate(script):
        where = f'script[{index}]'
        if isinstance(entry, dict) and isinstance(entry.get('together'), list):
            for turn in entry['together']:
                for step in (turn.get('do') or []) if isinstance(turn, dict) and isinstance(turn.get('do'), list) else []:
                    name = step[0] if isinstance(step, list) and step else step
                    if isinstance(name, str) and name in COMBOS: fail(f'{where}: combo "{name}" cannot be inside "together" — give it a turn of its own')
            out.append(entry); continue
        if not isinstance(entry, dict) or not isinstance(entry.get('do'), list): out.append(entry); continue
        if not any(isinstance(n, str) and n in COMBOS for n in ((s[0] if isinstance(s, list) and s else s) for s in entry['do'])):
            out.append(entry); continue
        rest = {k: v for k, v in entry.items() if k not in ('do', 'exit')}
        pieces, plain = [], []
        for step in entry['do']:
            name = step[0] if isinstance(step, list) and step else step
            if isinstance(name, str) and name in COMBOS:
                if plain: pieces.append({'who': entry.get('who'), 'do': plain}); plain = []
                pieces += combo_turns(entry.get('who'), name, list(step[1:]) if isinstance(step, list) else [], where)
            else: plain.append(step)
        if plain: pieces.append({'who': entry.get('who'), 'do': plain})
        if 'say' in rest:
            # Lời của lượt NÓI TRƯỚC, thành một lượt riêng: rồi mới tới từng bước. (Một lượt vừa "say" vừa "weigh" đo con vật
            # trên cân sai giờ — Known 0.78.0; và người xem nghe xong mới thấy làm.)
            out.append({'who': entry.get('who'), **rest})
        else:
            first = pieces[0]['together'][0] if 'together' in pieces[0] else pieces[0]
            first.update(rest)
        if 'exit' in entry:
            last = pieces[-1]['together'][0] if 'together' in pieces[-1] else pieces[-1]
            last['exit'] = entry['exit']
        out += pieces
    return out


def pair_restrain(script):
    """ĐỢT 38 B: `["restrain", "@pet"]` — kiểm tra đối số; trong `together` với người làm trên cùng con vật mà không cho `hold`, tính
    `hold` theo phần việc của người ấy (tới hết bước có "@pet", trừ 1 s khép tay) — người giữ buông ra sau khi người kia rút tay về."""
    if not isinstance(script, list): return script
    for index, entry in enumerate(script):
        group = entry['together'] if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]
        for turn in group:
            steps = turn.get('do') if isinstance(turn, dict) and isinstance(turn.get('do'), list) else []
            for step in steps:
                if not (step == RESTRAIN or (isinstance(step, list) and step and step[0] == RESTRAIN)): continue
                where = f'script[{index}]'
                if not (isinstance(step, list) and len(step) > 1 and isinstance(step[1], str) and step[1].startswith('@')):
                    fail(f'{where}: "restrain" needs the pet: ["restrain", "@<pet name>"] (with the other person\'s action in "together") — got {js(step)}')
                if len(step) > 3 or (len(step) > 2 and not (isinstance(step[2], (int, float)) and not isinstance(step[2], bool) and 0.5 <= step[2] <= 12)):
                    fail(f'{where}: "restrain" takes ["restrain", "@pet", hold (0.5…12 s)] — got {js(step)}')
                work = None
                for other in group:
                    if other is turn or not isinstance(other, dict) or not isinstance(other.get('do'), list): continue
                    total, found = 0.0, False
                    for item in other['do']:
                        name, args = (item, []) if isinstance(item, str) else (item[0], item[1:]) if isinstance(item, list) and item and isinstance(item[0], str) else (None, [])
                        if isinstance(item, (int, float)): total += float(item) + 0.1; continue
                        total += PARTNER_SECONDS.get(name, lambda a: 1.0)(args) + 0.1
                        if isinstance(item, list) and len(item) > 1 and item[1] == step[1] and name != RESTRAIN: found = True; break
                    if found: work = total - 0.1; RESTRAIN_PAIRS[id(step)] = (other.get('who'), name); break
                if len(step) < 3: step.append(round(max(1.2, work - (1.0 - RESTRAIN_TAIL) - 0.85), 2) if work else 3)
    return script
