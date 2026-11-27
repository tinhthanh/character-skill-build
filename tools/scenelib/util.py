"""Small helpers shared by every part of the scene builder: paths, errors, key checks, JS literals."""
import difflib, json, os, re, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))          # tools/
ROOT = os.path.dirname(HERE)
PERSON, PET = (400, 470), (400, 330)          # khung của rig người / thú (đơn vị)


def fail(message):
    print(f'scene: {message}', file=sys.stderr)
    sys.exit(1)


def slug(text):
    value = re.sub(r'[^a-z0-9]+', '-', str(text).lower()).strip('-')
    return value or 'x'


def known(where, given, allowed):
    """Reject keys the tool does not know — a misspelt key would otherwise be ignored in silence."""
    for key in given:
        if key in allowed: continue
        close = difflib.get_close_matches(key, allowed, n=1, cutoff=0.6)
        hint = f' — did you mean "{close[0]}"?' if close else f' (allowed: {", ".join(sorted(allowed))})'
        fail(f'{where}: unknown key "{key}"{hint}')


def _num(args, n, default):
    return float(args[n]) if len(args) > n and isinstance(args[n], (int, float)) and not isinstance(args[n], bool) else default


def html_text(text):
    return str(text).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def js(value):
    return json.dumps(value, ensure_ascii=False)
