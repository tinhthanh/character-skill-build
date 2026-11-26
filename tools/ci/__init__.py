"""Registry of the scene self-test cases (run by tools/check_scene.py).

Each wave of work adds its OWN module `tools/ci/wNN.py` with functions decorated by `@case(...)`:

    from .common import *

    @case('pharm44a', tags=('smoke',))
    def pharm44a(work, problems):
        ...                       # `work`: a fresh temp dir for this case only; append messages to `problems`

`uses` (what a case exercises: action names, set presets, character ids, tools such as `script`,
`acting_check`, `page_eval`, `camera`) is derived automatically from the string literals of the case's source
(see `static_uses`) plus the scenes it actually built on its last passing run (`.cache/ci-uses.json`); pass
`uses=(...)` only to add words the source cannot show. `tools/check_scene.py --changed` matches them against
the words of the changed hunks.
"""
import ast, importlib, inspect, json, os, pkgutil, re, textwrap

CASES = []          # theo thứ tự nạp: basics trước, rồi các đợt theo số
TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(TOOLS)


class Case:
    def __init__(self, name, fn, uses, tags):
        self.name, self.fn, self.declared, self.tags = name, fn, tuple(uses), tuple(tags)
        self.module = fn.__module__.rsplit('.', 1)[-1]
        self.file = inspect.getsourcefile(fn)
        lines, start = inspect.getsourcelines(fn)
        self.lines = (start, start + len(lines) - 1)          # gồm cả dòng @case
        self.source = ''.join(lines)
        self.uses = set(self.declared) | static_uses(self.source)

    def __repr__(self):
        return f'<case {self.name}>'


def case(name, uses=(), tags=()):
    """Register a check case. `name` must be unique (it is what --only / --failed select)."""
    def register(fn):
        if any(c.name == name for c in CASES): raise ValueError(f'duplicate case name: {name}')
        CASES.append(Case(name, fn, uses, tags))
        return fn
    return register


def load():
    """Import every module of the package (basics first, then the waves in number order) and return the cases."""
    if CASES: return CASES
    names = [m.name for m in pkgutil.iter_modules([os.path.dirname(__file__)]) if m.name not in ('common',)]
    order = lambda n: (0, 0, n) if n == 'basics' else (1, int(re.sub(r'\D', '', n) or 0), n)
    for name in sorted(names, key=order):
        importlib.import_module(f'{__name__}.{name}')
    return CASES


# ── Từ vựng: những từ có nghĩa với --changed (động tác, combo, bối cảnh dựng sẵn, nhân vật, loài, công cụ) ──
_VOCAB = None


def vocab():
    global _VOCAB
    if _VOCAB is not None: return _VOCAB
    words = set()
    try:
        catalog = json.load(open(os.path.join(TOOLS, 'action-catalog.json'), encoding='utf-8'))
        for row in catalog['people'] + catalog['pets']:
            for step in row.get('steps', []):
                head = step[0] if isinstance(step, list) and step else step
                if isinstance(head, str): words.add(head)
            words.update(re.findall(r'combo (\w+)', row.get('label', '')))
    except (OSError, ValueError, KeyError): pass
    combos = open(os.path.join(ROOT, 'runtime', 'combos.js'), encoding='utf-8').read()
    block = re.search(r'BEGIN COMBOS(.*)END COMBOS', combos, re.S)
    words.update(re.findall(r'^  "?(\w+)"?: ', block.group(1) if block else '', re.M))
    scene = open(os.path.join(TOOLS, 'scene.py'), encoding='utf-8').read()
    for table in ('SET_PRESETS', 'PRESETS'):
        body = re.search(r'^' + table + r' = \{(.*?)^\}', scene, re.S | re.M)
        if body: words.update(re.findall(r"^    '([\w-]+)':", body.group(1), re.M))
    words.update(os.path.splitext(f)[0] for f in os.listdir(os.path.join(ROOT, 'characters')) if f.endswith('.js') and f not in ('index.js', '_template.js'))
    rig = open(os.path.join(ROOT, 'runtime', 'rig-thu.js'), encoding='utf-8').read()
    words.update(re.findall(r'^LOAI\.(\w+) = ', rig, re.M)); words.update(('dog', 'cat', 'vet'))
    # Từ quá thông dụng (xuất hiện trong mọi đoạn mã) — bỏ, kẻo --changed chọn gần hết.
    words -= {'idle', 'call', 'run', 'turn', 'mark', 'face', 'mood', 'play', 'take', 'home', 'sit', 'eat', 'hide', 'present', 'express', 'write', 'speak'}
    _VOCAB = words
    return words


# Công cụ mà một trường hợp chạy → tên dùng trong `uses` (khớp với từ trong diff, hoặc với tệp đổi ở FILE_USES).
TOOL_MARKS = (('acting_check', ('acting_check.py',)), ('script', ('script.py', 'script_tool')), ('page_eval', ('page_eval(',)),
              ('light_side', ('light_side.py',)), ('film', ('film.py',)), ('peek', ('peek.sh',)), ('retime', ("'--retime'",)),
              ('camera', ("'camera'", "'view'", 'camera=')))
# Tệp đổi → từ được coi như có trong diff (chỉnh động cơ dùng chung thì chọn mọi trường hợp dùng nó).
FILE_USES = {'tools/acting_check.py': ('acting_check',), 'tools/script.py': ('script',), 'tools/chrome_run.py': ('page_eval',),
             'tools/light_side.py': ('light_side',), 'tools/film.py': ('film',), 'tools/peek.sh': ('peek',), 'runtime/set3d.js': ('camera',)}


def words_of(text):
    return set(re.findall(r'[A-Za-z_][\w-]*', text))


def static_uses(source):
    """Words of the case's string literals that are in the vocabulary, plus the tools it runs."""
    found = set()
    try: tree = ast.parse(textwrap.dedent(source))
    except SyntaxError: tree = None
    for node in (ast.walk(tree) if tree else ()):
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            found |= words_of(node.value)
    found &= vocab()
    for tool, marks in TOOL_MARKS:
        if any(m in source for m in marks): found.add(tool)
    return found


def scan_uses(folder):
    """Words of the vocabulary found in what a case built: the scene files it wrote (`*.scene.json`, `*.film.json`) and the
    turns of every composition it built (`[who, ["action", …]]` in index.html — not the whole page, which lists every action)."""
    found, known = set(), vocab()
    for top, _, files in os.walk(folder):
        for f in files:
            if f == 'index.html' or f.endswith('.scene.json') or f.endswith('.film.json'):
                try: text = open(os.path.join(top, f), encoding='utf-8').read()
                except (OSError, UnicodeDecodeError): continue
                if f == 'index.html':
                    words = set(re.findall(r'\[\w+, \[?"([A-Za-z_]\w*)"', text)) | set(re.findall(r'"preset": "([\w-]+)"', text))
                    words |= set(re.findall(r'data-name="(\w+)"', text)) | set(re.findall(r'\bid: "(\w+)"', text))
                else:
                    words = set(re.findall(r'"([A-Za-z_][\w-]*)"', text))
                found |= words & known
    return found
