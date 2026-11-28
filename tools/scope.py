#!/usr/bin/env python3
"""What a change needs checked (wave 48): the whole check, or only the parts its files can reach.

    python3 tools/scope.py [BASE]            → human summary (default BASE: main)
    python3 tools/scope.py [BASE] --sh       → shell variables for tools/check.sh --scope
    python3 tools/scope.py [BASE] --json     → the same as JSON

A change to the CORE (the two rigs, runtime/index.js, the shared helpers, the 3D set, shading, the scene builder, the
check tools themselves, configs/, vendor/, the CI workflow — or a file this script does not know) needs everything.
Otherwise, folder by folder:

  runtime/person/<group>.js, runtime/pet/<group>.js   the actions whose methods the change touches (a private helper `_x`
                                                      or module code touched → every action of that file)
  runtime/combos.js                                    the combos whose entries the change touches
  characters/<id>.js                                   that character and the ones built on it (`base`)
  characters/index.js                                  the characters whose lines changed
  tools/action-catalog.json                            the actions of the rows that changed
  examples/<name>/                                     that example
  tools/ci/<wave>.py, other tools/                     the scene cases tools/check_scene.py --changed picks
  *.md, docs/, references/, studio/, LICENSE           nothing

The check page then runs only its units that test those actions / characters (the action sweeps limited to the
actions, the sequence-vs-direct rows of those catalog entries, and the blocks whose code names one of them); the
scene cases get the names as extra words for --changed; the examples are linted when they name one of them.
A push to main runs the whole check whatever this says (.github/workflows/check.yml)."""
import fnmatch, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

CORE = [
    'runtime/rig-svg.js', 'runtime/rig-thu.js', 'runtime/index.js', 'runtime/schema.js', 'runtime/set3d.js', 'runtime/shading.js',
    'runtime/lighting.js', 'runtime/marks.js', 'runtime/props.js', 'runtime/parts.js', 'runtime/hair.js', 'runtime/bodies.js',
    'runtime/characters.js', 'runtime/person/shared.js', 'runtime/pet/shared.js',
    'configs/*', 'vendor/*', '.github/*', 'characters/_template.js',
    'tools/scene.py', 'tools/scenelib/*', 'tools/acting_check.py', 'tools/chrome_run.py', 'tools/chrome.sh', 'tools/serve.py',
    'tools/build.py', 'tools/check.sh', 'tools/check_scene.py', 'tools/check_report.py', 'tools/check.html', 'tools/scope.py',
    'tools/ci/__init__.py', 'tools/ci/common.py', 'tools/sheet.html', 'tools/gallery.html', 'tools/lint-examples.sh',
]
NOTHING = ['*.md', 'docs/*', 'references/*', 'studio/*', 'LICENSE', '.gitignore']
# Tools whose own scene cases tools/check_scene.py --changed finds (their words / FILE_USES); the check page does not run them.
TOOLS_BY_CASES = ['tools/ci/*.py', 'tools/*.py', 'tools/*.sh', 'tools/*.html', 'tools/*.json']


def git(*args):
    done = subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True)
    if done.returncode != 0: sys.exit(f'scope: git {" ".join(args)} failed: {done.stderr.strip()}')
    return done.stdout


def changes(base):
    """{file: [(first, last) line ranges in the NEW file, or None for a deleted / binary file]}, with uncommitted and new files."""
    merge_base = git('merge-base', base, 'HEAD').strip()
    out, file = {}, None
    for line in git('diff', '-U0', '--no-color', '--no-renames', merge_base).split('\n'):
        if line.startswith('diff --git '):
            file = line.split(' b/', 1)[1]; out.setdefault(file, [])
        elif line.startswith('@@') and file:
            hunk = re.match(r'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@', line)
            start, count = int(hunk.group(3)), int(hunk.group(4) if hunk.group(4) is not None else 1)
            out[file].append((start, start + max(count, 1) - 1))          # a pure deletion marks the line after it
    for name in git('ls-files', '--others', '--exclude-standard').split('\n'):
        if name: out[name] = [(1, 10 ** 9)]
    return out


def matches(path, patterns):
    return any(fnmatch.fnmatchcase(path, p) for p in patterns)


def methods(path):
    """[(name, first line, last line)] of the class methods of a runtime action-group file (two-space indent)."""
    lines = open(os.path.join(ROOT, path), encoding='utf-8').read().split('\n')
    starts = [(n + 1, m.group(1)) for n, line in enumerate(lines) if (m := re.match(r'^  (?:static\s+)?([A-Za-z_$#][\w$]*)\s*\(', line))]
    out = []
    for i, (first, name) in enumerate(starts):
        last = (starts[i + 1][0] - 1) if i + 1 < len(starts) else len(lines)
        out.append((name, first, last))
    return out


def touched_actions(path, ranges):
    """Public actions of a group file that the change reaches: the methods its hunks fall in; all of them when a hunk
    falls in a private helper or outside every method (imports, module constants, the class head)."""
    if not os.path.isfile(os.path.join(ROOT, path)): return None
    table = methods(path)
    public = sorted({name for name, _, _ in table if not name.startswith(('_', '#')) and name != 'constructor'})
    hit = set()
    for a, b in ranges:
        inside = [name for name, first, last in table if first <= b and a <= last]
        if not inside or any(name.startswith(('_', '#')) or name == 'constructor' for name in inside): return public
        hit |= set(inside)
    return sorted(hit)


def combo_names(ranges):
    text = open(os.path.join(ROOT, 'runtime', 'combos.js'), encoding='utf-8').read().split('\n')
    begin = next((n for n, l in enumerate(text) if 'BEGIN COMBOS' in l), 0)
    end = next((n for n, l in enumerate(text) if 'END COMBOS' in l), len(text))
    keys = [(n + 1, m.group(1)) for n, l in enumerate(text) if begin < n < end and (m := re.match(r'^  "?(\w+)"?: \{', l))]
    out = set()
    for a, b in ranges:
        if b < keys[0][0] or a > end: return None                         # code outside the table (expandCombo, combo())
        for i, (first, name) in enumerate(keys):
            last = keys[i + 1][0] - 1 if i + 1 < len(keys) else end
            if first <= b and a <= last: out.add(name)
    return sorted(out)


def built_on(ids):
    """The characters whose `base` chain reaches one of `ids` (characters/*.js)."""
    bases = {}
    for f in os.listdir(os.path.join(ROOT, 'characters')):
        if f.endswith('.js') and f not in ('index.js', '_template.js'):
            text = open(os.path.join(ROOT, 'characters', f), encoding='utf-8').read()
            cid, base = re.search(r"\bid:\s*'(\w+)'", text), re.search(r"\bbase:\s*'(\w+)'", text)
            if cid: bases[cid.group(1)] = base.group(1) if base else None
    out = set(ids)
    grew = True
    while grew:
        grew = False
        for cid, base in bases.items():
            if base in out and cid not in out: out.add(cid); grew = True
    return sorted(out)


def catalog_rows(ranges):
    lines = open(os.path.join(HERE, 'action-catalog.json'), encoding='utf-8').read().split('\n')
    rows = []
    for a, b in ranges:
        for n in range(max(1, a), min(len(lines), b) + 1):
            line = lines[n - 1].strip().rstrip(',')
            if line.startswith('{ "label"'):
                try: rows.append(json.loads(line))
                except ValueError: return None
            elif line.startswith('"_about"') or line in ('{', '}', '[', ']', '],', '"people": [', '"pets": ['): continue
            elif line: return None
    return rows


def scope(base):
    found = {'full': False, 'reasons': [], 'actions': set(), 'kinds': set(), 'characters': set(), 'combos': set(),
             'labels': set(), 'examples': set(), 'files': []}
    files = changes(base)
    found['files'] = sorted(files)

    def full(why):
        found['full'] = True; found['reasons'].append(why)

    for path, ranges in sorted(files.items()):
        if path.startswith('dist/'): continue                              # built from runtime/ + characters/ — judged there
        if matches(path, NOTHING): continue
        if matches(path, CORE): full(f'{path} is core'); continue
        group = re.match(r'^runtime/(person|pet)/(\w+)\.js$', path)
        if group:
            acts = touched_actions(path, ranges)
            if acts is None: full(f'{path} was removed'); continue
            found['actions'] |= set(acts); found['kinds'].add(group.group(1))
            found['reasons'].append(f'{path}: actions {", ".join(acts) or "-"}'); continue
        if path == 'runtime/combos.js':
            names = combo_names(ranges)
            if names is None: full('runtime/combos.js: code outside the combo table changed'); continue
            found['combos'] |= set(names); found['reasons'].append(f'runtime/combos.js: combos {", ".join(names)}'); continue
        if path == 'characters/index.js':
            # The characters added, removed or moved: the import lines that changed, and the ids that differ in the list.
            merge_base = git('merge-base', base, 'HEAD').strip()
            diff = git('diff', '-U0', merge_base, '--', path)
            listed = lambda text: (re.search(r'export default \[(.*?)\]', text, re.S) or re.search('()', '')).group(1)
            old = subprocess.run(['git', 'show', f'{merge_base}:{path}'], cwd=ROOT, capture_output=True, text=True).stdout
            new = open(os.path.join(ROOT, path), encoding='utf-8').read()
            ids = set(re.findall(r"^[+-]import (\w+) from", diff, re.M))
            old_ids, new_ids = re.findall(r'\w+', listed(old)), re.findall(r'\w+', listed(new))
            ids |= set(old_ids) ^ set(new_ids)
            if old_ids != new_ids and set(old_ids) == set(new_ids): ids |= set(new_ids)      # only the order changed
            found['characters'] |= set(built_on(ids)); found['reasons'].append(f'characters/index.js: {", ".join(sorted(ids)) or "-"}'); continue
        person = re.match(r'^characters/(\w+)\.js$', path)
        if person:
            text = open(os.path.join(ROOT, path), encoding='utf-8').read() if os.path.isfile(os.path.join(ROOT, path)) else ''
            cid = re.search(r"\bid:\s*'(\w+)'", text)
            if not cid: full(f'{path}: no id found'); continue
            ids = built_on({cid.group(1)})
            found['characters'] |= set(ids); found['reasons'].append(f'{path}: characters {", ".join(ids)}'); continue
        if path == 'tools/action-catalog.json':
            rows = catalog_rows(ranges)
            if rows is None: full('tools/action-catalog.json: a change outside its rows'); continue
            for row in rows:
                found['labels'].add(row['label'])
                for step in row.get('steps', []):
                    head = step[0] if isinstance(step, list) and step else step
                    if isinstance(head, str): found['actions'].add(head)
            found['reasons'].append(f'tools/action-catalog.json: rows {", ".join(r["label"] for r in rows)}'); continue
        example = re.match(r'^examples/([\w-]+)/', path)
        if example: found['examples'].add(example.group(1)); found['reasons'].append(f'{path}: example {example.group(1)}'); continue
        if matches(path, TOOLS_BY_CASES): found['reasons'].append(f'{path}: scene cases that use it'); continue
        full(f'{path}: not a file this script knows — checking everything')
    found['actions'] |= found['combos']
    # Only docs (and the built dist/): nothing to run — not even the smoke set of scene cases.
    found['none'] = not found['full'] and all(f.startswith('dist/') or matches(f, NOTHING) for f in files)
    return found


def page_units(found):
    """Unit-name globs of tools/check.html to run, and the actions its sweeps should test."""
    words = found['actions'] | found['characters']
    if not words and not found['labels']: return [], []
    units = set()
    if 'person' in found['kinds']: units.add('person:*')            # the sweeps run the rigs' own actions, never a combo
    if 'pet' in found['kinds']: units.add('pet:*')
    units |= {f'person:{c}' for c in found['characters']} | {f'pet:{c}' for c in found['characters']}
    for label in found['labels']: units.add(f'seq-vs-direct:*.{label}')
    catalog = json.load(open(os.path.join(HERE, 'action-catalog.json'), encoding='utf-8'))
    for row in catalog['people'] + catalog['pets']:
        heads = {step[0] if isinstance(step, list) and step else step for step in row.get('steps', [])}
        if heads & found['actions']: units.add(f'seq-vs-direct:*.{row["label"]}')
    # Blocks of the page whose code names one of the words: from one `chay('name')` to the next.
    page = open(os.path.join(HERE, 'check.html'), encoding='utf-8').read()
    marks = [(m.start(), m.group(1)) for m in re.finditer(r"chay\('([^']+)'\)", page)]
    for i, (at, name) in enumerate(marks):
        block = page[at:marks[i + 1][0] if i + 1 < len(marks) else len(page)]
        if words & set(re.findall(r"[A-Za-z_]\w*", block)): units.add(name)
    actions = sorted(found['actions']) if found['kinds'] else []
    return sorted(units), actions


def examples(found):
    """Examples to lint: the ones changed, and the ones whose composition or scene names a touched action / character."""
    out = set(found['examples'])
    words = found['actions'] | found['characters']
    for name in sorted(os.listdir(os.path.join(ROOT, 'examples'))):
        folder = os.path.join(ROOT, 'examples', name)
        if not any(os.path.isfile(os.path.join(folder, f)) for f in ('index.html', 'scene.json')) or not words: continue
        text = ''
        for f in os.listdir(folder):
            if f.endswith(('.html', '.json')): text += open(os.path.join(folder, f), encoding='utf-8', errors='replace').read()
        if words & set(re.findall(r"[A-Za-z_]\w*", text)): out.add(name)
    return sorted(out)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    base = args[0] if args else 'main'
    found = scope(base)
    units, actions = page_units(found) if not found['full'] else (['*'], [])
    lint = examples(found) if not found['full'] else ['*']
    words = sorted(found['actions'] | found['characters'] | found['examples'])
    result = {'full': found['full'], 'none': found['none'], 'reasons': found['reasons'], 'files': found['files'], 'page_units': units,
              'page_actions': actions, 'page_characters': sorted(found['characters']), 'words': words, 'examples': lint}
    if '--json' in sys.argv: print(json.dumps(result, ensure_ascii=False, indent=1)); return
    if '--sh' in sys.argv:
        q = lambda s: "'" + s.replace("'", "'\\''") + "'"
        print(f'SCOPE_FULL={1 if found["full"] else 0}')
        print(f'SCOPE_NONE={1 if found["none"] else 0}')
        print(f'SCOPE_UNITS={q(",".join(units))}')
        print(f'SCOPE_ACTIONS={q(",".join(actions))}')
        print(f'SCOPE_CHARACTERS={q(",".join(sorted(found["characters"])))}')
        print(f'SCOPE_WORDS={q(",".join(words))}')
        print(f'SCOPE_EXAMPLES={q(" ".join(lint))}')
        return
    print(f'scope vs {base}: {"FULL — " if found["full"] else "NOTHING TO RUN (docs only) — " if found["none"] else ""}{len(found["files"])} files changed')
    for why in found['reasons']: print('  · ' + why)
    if not found['full']:
        print(f'  page units: {len(units)}' + (f' ({", ".join(units[:10])}{" …" if len(units) > 10 else ""})' if units else ' (skipped)'))
        if actions: print(f'  sweeps test only: {", ".join(actions)}')
        print(f'  examples to lint: {", ".join(lint) or "none"}')


if __name__ == '__main__':
    main()
