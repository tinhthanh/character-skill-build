"""Wave 48: tools/reel.py builds a reel for every kind of character, from the whole action catalog.

Pet rows with a person beside the pet (`hide`, `lick`, combo `scaredPet`) need that person placed. A row the character
cannot do is left out and reported, not fatal: a barista's built-in cup leaves no free hand for `stampCard`."""
from .common import *


def reel48(work, rid):
    return subprocess.run([sys.executable, os.path.join(HERE, 'reel.py'), rid, '-o', work], capture_output=True, text=True)


@case('reel48', parts=('vet', 'barista', 'dog', 'rabbit'), uses=('reel', 'scaredPet', 'hide', 'lick', 'stampCard'))
def reel48_case(work, problems, part):
    catalog = json.load(open(os.path.join(HERE, 'action-catalog.json'), encoding='utf-8'))
    done = reel48(work, part)
    if done.returncode != 0:
        problems.append(f'reel48:{part}: tools/reel.py failed: ' + (done.stderr or done.stdout).strip()[-400:]); return
    found = re.search(r'(\d+) actions, ', done.stdout)
    built = int(found.group(1)) if found else 0
    skipped = done.stdout.count('skipped (this character cannot do it)')
    if part in ('vet', 'barista'):
        rows = len(catalog['people'])
    else:
        kind = 'rabbit' if part == 'rabbit' else 'dog'
        rows = len([row for row in catalog['pets'] if not row.get('species') or row['species'] == kind])
    if built + skipped != rows:
        problems.append(f'reel48:{part}: {built} actions built + {skipped} skipped, but the catalog has {rows} rows for it')
    # The vet and the pets can do every row; the barista holds a cup, so only the rows needing that hand may be skipped.
    if part != 'barista' and skipped:
        problems.append(f'reel48:{part}: rows skipped — ' + '; '.join(re.findall(r'skipped \(this character cannot do it\) — ([^\n]+)', done.stdout))[:400])
    if part == 'barista' and not 0 < skipped <= 6:
        problems.append(f'reel48:barista: expected a few rows skipped (stampCard needs a free hand), got {skipped}')
    html = open(os.path.join(work, f'reel-{part}', 'index.html'), encoding='utf-8').read()
    if part == 'dog' and 'scaredPet' not in html:
        problems.append('reel48:dog: the combo scaredPet row is missing from the reel')


@case('scope48', uses=('scope',))
def scope48(work, problems):
    """tools/scope.py splits a change by folder: one action's method → that action; a private helper → the whole file;
    a base character → the ones built on it; a combo entry → that combo; core files → everything."""
    sys.path.insert(0, HERE)
    import scope
    lines = open(os.path.join(ROOT, 'runtime', 'person', 'gestures.js'), encoding='utf-8').read().split('\n')
    at = lambda prefix: next(n + 1 for n, line in enumerate(lines) if line.startswith(prefix))
    one = scope.touched_actions('runtime/person/gestures.js', [(at('  thumbsDown(') + 1,) * 2])
    if one != ['thumbsDown']: problems.append(f'scope48: a line inside thumbsDown gives {one}')
    helper = scope.touched_actions('runtime/person/gestures.js', [(at('  _gestureAt(') + 1,) * 2])
    if not helper or 'thumbsDown' not in helper or 'laugh' not in helper: problems.append(f'scope48: a private helper does not give the whole file: {helper}')
    if 'nurse' not in scope.built_on({'nurse'}) or 'receptionist' not in scope.built_on({'nurse'}): problems.append('scope48: characters built on nurse are missing')
    combos = open(os.path.join(ROOT, 'runtime', 'combos.js'), encoding='utf-8').read().split('\n')
    line = next(n + 1 for n, text in enumerate(combos) if '"fullCheckup": {' in text) + 2
    if scope.combo_names([(line, line)]) != ['fullCheckup']: problems.append('scope48: a line of the fullCheckup entry does not give fullCheckup')
    if scope.combo_names([(len(combos) - 3,) * 2]) is not None: problems.append('scope48: code after the combo table does not ask for everything')
    for path in ('runtime/rig-svg.js', 'runtime/person/shared.js', 'tools/scene.py', 'tools/check.html', '.github/workflows/check.yml'):
        if not scope.matches(path, scope.CORE): problems.append(f'scope48: {path} is not core')
    units, actions = scope.page_units({'actions': {'thumbsDown'}, 'kinds': {'person'}, 'characters': set(), 'combos': set(), 'labels': set()})
    if 'person:*' not in units or 'pet:*' in units or actions != ['thumbsDown'] or 'seq-vs-direct:*.thumbsDown' not in units:
        problems.append(f'scope48: page units for thumbsDown: {units} / {actions}')
