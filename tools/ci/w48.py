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
