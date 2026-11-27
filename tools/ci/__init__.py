"""Registry of the scene self-test cases (run by tools/check_scene.py).

Each wave of work adds its OWN module `tools/ci/wNN.py` with functions decorated by `@case(...)`:

    from .common import *

    @case('pharm44a', tags=('smoke',))
    def pharm44a(work, problems):
        ...                       # `work`: a fresh temp dir for this case only; append messages to `problems`

A slow case that builds several independent scenes is split into PARTS, each run as its own case named
`group:part` (`--only group` still selects them all):

    @case('combo41', parts=('groom41', 'vacc41', 'words'))
    def combo41(work, problems, part):
        scenes = {'groom41': (...), 'vacc41': (...)}
        for name, spec in scenes.items():
            if name != part: continue
            ...                   # build + acting_check of that one scene
        if part == 'words':
            ...                   # the script-word check

A part's own code is the value of a dict entry keyed by its name, a tuple whose first item is a scene dict with its
name as `'id'`, or an `if part == '…':` block; everything else in the function is shared by all parts (for `uses`
and `--changed`) — so keep data that two parts use outside those.

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
    def __init__(self, name, fn, uses, tags, group=None, part=None, parts=()):
        self.name, self.declared, self.tags = name, tuple(uses), tuple(tags)
        self.group, self.part = group or name, part
        self.fn = fn if part is None else (lambda work, problems: fn(work, problems, part))
        self.module = fn.__module__.rsplit('.', 1)[-1]
        self.file = inspect.getsourcefile(fn)
        lines, start = inspect.getsourcelines(fn)
        self.lines = (start, start + len(lines) - 1)          # gồm cả dòng @case
        self.source = ''.join(lines)
        # Phần riêng của mỗi phần (theo dòng trong tệp) — phần của mình và của các phần khác.
        spans = part_nodes(self.source, parts, start)
        self.own = [r for r, _ in spans.get(part, ())]
        self.others = [r for p, rs in spans.items() if p != part for r, _ in rs]
        skip = {node_key(n) for p, rs in spans.items() if p != part for _, n in rs}
        self.parts = len(parts) or 1
        self.uses = set(self.declared) | static_uses(self.source, skip)

    def touched_by(self, a, b):
        """Is the case affected by an edit of lines a..b of its file? Its own lines or the shared code — not another part's."""
        if b < self.lines[0] or a > self.lines[1]: return False
        if any(a <= y and b >= x for x, y in self.own): return True
        return not any(x <= a and b <= y for x, y in self.others)

    def __repr__(self):
        return f'<case {self.name}>'


def case(name, uses=(), tags=(), parts=()):
    """Register a check case. `name` must be unique (it is what --only / --failed select). With `parts`, the function
    takes a third argument `part` and each part is registered as its own case `name:part` in the group `name`."""
    def register(fn):
        names = [f'{name}:{p}' for p in parts] or [name]
        for n in names:
            if any(c.name == n or c.group == n for c in CASES): raise ValueError(f'duplicate case name: {n}')
        if not parts: CASES.append(Case(name, fn, uses, tags))
        for p in parts: CASES.append(Case(f'{name}:{p}', fn, uses, tags, group=name, part=p, parts=parts))
        return fn
    return register


def node_key(node):
    """Same node in two parses of the same source → same key."""
    return (type(node).__name__, getattr(node, 'lineno', None), getattr(node, 'col_offset', None), getattr(node, 'end_lineno', None), getattr(node, 'end_col_offset', None))


def part_nodes(source, parts, start):
    """{part: [((first line, last line), ast node)]} — the code that belongs to one part only (see the module doc)."""
    if not parts: return {}
    tree = ast.parse(textwrap.dedent(source))
    found, taken = {}, set()

    def text(node): return node.value if isinstance(node, ast.Constant) and isinstance(node.value, str) else None

    def id_of(node):                                             # (cảnh {'id': …}, …) — một bộ tự chứa; dict trần thì không (có thể dùng chung)
        if not isinstance(node, ast.Tuple) or not node.elts: return None
        node = node.elts[0]
        if isinstance(node, ast.Dict):
            for k, v in zip(node.keys, node.values):
                if k is not None and text(k) == 'id' and text(v) in parts: return text(v)
        return None

    def mark(p, node):
        inner = [id(n) for n in ast.walk(node) if hasattr(n, 'lineno')]    # Load(), Eq(), Add()…: đối tượng dùng chung, không có vị trí
        if any(i in taken for i in inner): return
        taken.update(inner)
        found.setdefault(p, []).append(((start + node.lineno - 1, start + node.end_lineno - 1), node))

    for node in ast.walk(tree):                                  # theo chiều rộng: nút ngoài cùng được nhận trước
        if isinstance(node, ast.Dict):
            for k, v in zip(node.keys, node.values):
                if k is not None and text(k) in parts and text(k) != 'id': mark(text(k), v)
        if isinstance(node, ast.If) and isinstance(node.test, ast.Compare) and isinstance(node.test.left, ast.Name) and node.test.left.id == 'part' \
                and len(node.test.ops) == 1 and isinstance(node.test.ops[0], ast.Eq) and text(node.test.comparators[0]) in parts:
            mark(text(node.test.comparators[0]), node)
        if id_of(node): mark(id_of(node), node)
    return found


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
    rig = ''.join(open(os.path.join(ROOT, 'runtime', *f), encoding='utf-8').read() for f in (('rig-thu.js',), ('pet', 'shared.js')))     # bảng giống loài nằm ở pet/shared.js
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


def static_uses(source, skip=()):
    """Words of the case's string literals that are in the vocabulary, plus the tools it runs. `skip`: ids of the AST
    nodes of the other parts of a split case (see part_nodes)."""
    found = set()
    try: tree = ast.parse(textwrap.dedent(source))
    except SyntaxError: tree = None
    todo = [tree] if tree else []
    while todo:
        node = todo.pop()
        if node_key(node) in skip: continue
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            found |= words_of(node.value)
        todo.extend(ast.iter_child_nodes(node))
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
