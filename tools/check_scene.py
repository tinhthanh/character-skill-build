#!/usr/bin/env python3
"""Self-test for tools/scene.py (run by tools/check.sh): build the example scenes, then make sure bad scene files are
rejected with a message that names the problem. The cases live in tools/ci/ (one module per wave of work); each runs
in its own temp dir, in parallel.

  python3 tools/check_scene.py                  every case (what check.sh and the release run)
  python3 tools/check_scene.py --changed [BASE] only the cases a change vs BASE (default: main) touches, plus a smoke set
  python3 tools/check_scene.py --only a,b,w44*  cases by name (globs allowed; a module name such as w44 selects its cases)
  python3 tools/check_scene.py --failed         the cases that failed on the last run
  python3 tools/check_scene.py --list           list the cases with their tags and uses
"""
import argparse, concurrent.futures, fnmatch, json, os, re, subprocess, sys, tempfile, threading, time, traceback

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import ci  # noqa: E402

CACHE = os.path.join(ROOT, '.cache')
FAILED = os.path.join(CACHE, 'ci-failed.txt')
USES = os.path.join(CACHE, 'ci-uses.json')
TIMES = os.path.join(CACHE, 'ci-times.json')
SMOKE_TAG = 'smoke'


def git(*args):
    done = subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True)
    if done.returncode != 0: sys.exit(f'check_scene: git {" ".join(args)} failed: {done.stderr.strip()}')
    return done.stdout


def changed_selection(cases, base):
    """Pick the cases a change vs `base` touches. Returns {case name: [reasons]}."""
    merge_base = git('merge-base', base, 'HEAD').strip()
    diff = git('diff', '-U0', '--no-color', merge_base)                # gồm cả thay đổi chưa commit
    untracked = [f for f in git('ls-files', '--others', '--exclude-standard').split('\n') if f]
    files, edited, words, file = set(), {}, set(), None
    for line in diff.split('\n'):
        if line.startswith('+++ ') or line.startswith('--- '):
            name = line[4:].strip()
            if name != '/dev/null': file = name[2:]; files.add(file)
            continue
        if file and file.startswith('dist/'): continue                 # bản dựng: sinh ra từ runtime/, characters/ — đã tính ở nguồn
        hunk = re.match(r'@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@', line)
        if hunk:
            start, count = int(hunk.group(1)), int(hunk.group(2) or 1)
            edited.setdefault(file, []).append((start, start + max(count, 1) - 1))
            continue
        if line[:1] in '+-' and file and not file.startswith('tools/ci/') and not file.endswith('.md'):
            words |= ci.words_of(line[1:])
    for name in untracked:
        files.add(name); edited.setdefault(name, []).append((1, 10 ** 9))
        if not name.startswith('tools/ci/') and not name.endswith('.md') and os.path.isfile(os.path.join(ROOT, name)):
            try: words |= ci.words_of(open(os.path.join(ROOT, name), encoding='utf-8').read())
            except (OSError, UnicodeDecodeError): pass
    files = {f for f in files if not f.startswith('dist/')}
    for name in files:
        words |= set(ci.FILE_USES.get(name, ()))
    picked = {}
    common_changed = 'tools/ci/common.py' in files or 'tools/ci/__init__.py' in files
    for c in cases:
        why = []
        rel = os.path.relpath(c.file, ROOT)
        if common_changed: why.append('tools/ci/common.py or the registry changed')
        for a, b in edited.get(rel, ()):
            if a <= c.lines[1] and b >= c.lines[0]: why.append(f'its code in {rel} changed'); break
        hits = sorted(c.uses & words)
        if hits: why.append('uses ' + ', '.join(hits[:8]) + (' …' if len(hits) > 8 else ''))
        if SMOKE_TAG in c.tags: why.append('smoke set')
        if why: picked[c.name] = why
    return picked, sorted(files)


def load_json(path):
    try: return json.load(open(path, encoding='utf-8'))
    except (OSError, ValueError): return {}


def estimate(c, times):
    """Seconds a case is expected to take: its last measured time, else a guess from what it runs (Chrome passes dominate)."""
    if c.name in times: return times[c.name]
    s = c.source
    return 150 * s.count('acting_check.py') + 40 * s.count('page_eval(') + 30 * s.count('peek.sh') + 3 * (s.count('build(') + s.count('script.py'))


def main():
    parser = argparse.ArgumentParser(description='Scene self-test: build example scenes, check generated compositions and refusals.')
    parser.add_argument('-j', '--jobs', type=int, default=max(1, (os.cpu_count() or 3) - 2), help='parallel cases (default: CPU count − 2)')
    parser.add_argument('--only', help='comma-separated case names, globs or module names (e.g. pharm44a,w43,set3d_*)')
    parser.add_argument('--changed', nargs='?', const='main', metavar='BASE', help='cases touched by the changes vs BASE (default main) + the smoke set')
    parser.add_argument('--failed', action='store_true', help='rerun the cases that failed last time (.cache/ci-failed.txt)')
    parser.add_argument('--list', action='store_true', help='list the cases (name, module, tags, uses) and exit')
    args = parser.parse_args()

    cases = ci.load()
    cached, times = load_json(USES), load_json(TIMES)
    for c in cases: c.uses |= set(cached.get(c.name, ()))
    selected, reasons = cases, {}
    if args.only:
        pats = [p.strip() for p in args.only.split(',') if p.strip()]
        selected = [c for c in cases if any(fnmatch.fnmatchcase(c.name, p) or c.module == p for p in pats)]
        if not selected: sys.exit(f'check_scene: --only {args.only}: no such case (see --list)')
    if args.failed:
        names = open(FAILED, encoding='utf-8').read().split() if os.path.isfile(FAILED) else []
        selected = [c for c in selected if c.name in names]
        if not selected: print('scene: no failed cases recorded — nothing to rerun'); return 0
    if args.changed:
        reasons, files = changed_selection(selected, args.changed)
        selected = [c for c in selected if c.name in reasons]
        print(f'scene: --changed vs {args.changed}: {len(files)} files changed, {len(selected)} / {len(cases)} cases selected')
        for c in selected: print(f'  · {c.name:22} ← ' + '; '.join(reasons[c.name]))
    if args.list:
        for c in selected:
            print(f'{c.name:22} {c.module:7} tags={",".join(c.tags) or "-"}  uses={" ".join(sorted(c.uses))}')
        print(f'{len(selected)} cases')
        return 0

    # Tệp cảnh tạm của một lượt chạy bị ngắt giữa chừng (tiến trình đã chết) — dọn đi.
    import glob
    for stale in glob.glob(os.path.join(ROOT, 'examples', '*', '_check_*')):
        pid = re.match(r'_check_\w+?-(\d+)_', os.path.basename(stale))
        if pid and int(pid.group(1)) != os.getpid():
            try: os.kill(int(pid.group(1)), 0)
            except ProcessLookupError: os.remove(stale)
            except OSError: pass
    # Các cảnh dựng từ dist/ — dựng lại trước (≈ 0,1 s) để chạy thẳng `--only …` cũng thử đúng mã runtime hiện tại.
    # check.sh vừa dựng rồi và trang check.html đang đọc dist/ song song → nó đặt CHECK_SCENE_NO_BUILD=1 (không ghi đè giữa chừng).
    if not os.environ.get('CHECK_SCENE_NO_BUILD'):
        built = subprocess.run([sys.executable, os.path.join(HERE, 'build.py')], cwd=ROOT, capture_output=True, text=True)
        if built.returncode != 0: print('  ✗ scene: tools/build.py failed: ' + (built.stderr or built.stdout).strip()[-400:]); print('scene: FAIL (1 problems)'); return 1
    # Không trường hợp nào được dùng cổng cố định: tools/peek.sh nhận PORT từ môi trường (PORT=… của check.sh hay của máy) —
    # bỏ đi để mỗi lần chạy lấy một cổng trống riêng.
    os.environ.pop('PORT', None)
    lock, results = threading.Lock(), {}
    started = time.time()

    def run(c):
        problems, t0 = [], time.time()
        with tempfile.TemporaryDirectory(prefix=f'ci-{c.name}-') as work:
            try: c.fn(work, problems)
            except Exception:                                     # một trường hợp vỡ không kéo đổ các trường hợp khác
                problems.append(f'{c.name}: the check itself crashed:\n' + traceback.format_exc()[-1500:])
            found = ci.scan_uses(work)
        took = time.time() - t0
        with lock:
            results[c.name] = (problems, took, found)
            mark = '✓' if not problems else f'✗ ({len(problems)})'
            print(f'  {mark} {c.name:22} {took:6.1f} s   [{len(results)}/{len(selected)}]', flush=True)

    # Trường hợp lâu nhất chạy trước (lần đo trước, hay ước lượng) — thời gian tổng không bị một ca dài bắt đầu muộn kéo dài.
    queue = sorted(selected, key=lambda c: -estimate(c, times))
    if args.jobs > 1: os.environ.setdefault('CHROME_RUN_TIMEOUT_SCALE', '3')      # nhiều Chrome cùng lúc → trang chậm hơn
    print(f'scene: {len(selected)} cases, {args.jobs} at a time', flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.jobs)) as pool:
        for future in [pool.submit(run, c) for c in queue]: future.result()
    wall = time.time() - started

    problems = [(name, p) for c in selected for name in (c.name,) for p in results[c.name][0]]
    slow = sorted(selected, key=lambda c: -results[c.name][1])[:8]
    print(f'scene: {len(selected)} cases in {wall:.0f} s wall ({sum(r[1] for r in results.values()):.0f} s of case time); slowest: '
          + ', '.join(f'{c.name} {results[c.name][1]:.0f} s' for c in slow))

    # Bộ nhớ đệm: tên các trường hợp hỏng (cho --failed) và những gì mỗi trường hợp đã dựng (cho --changed).
    os.makedirs(CACHE, exist_ok=True)
    failed = set(open(FAILED, encoding='utf-8').read().split()) if os.path.isfile(FAILED) else set()
    for c in selected:
        (failed.add if results[c.name][0] else failed.discard)(c.name)
        if not results[c.name][0]: cached[c.name] = sorted(results[c.name][2])
        times[c.name] = round(results[c.name][1], 1)
    known = {c.name for c in cases}
    open(FAILED, 'w', encoding='utf-8').write(''.join(f'{n}\n' for n in sorted(failed & known)))
    json.dump({k: v for k, v in sorted(cached.items()) if k in known}, open(USES, 'w', encoding='utf-8'), indent=0)
    json.dump({k: v for k, v in sorted(times.items()) if k in known}, open(TIMES, 'w', encoding='utf-8'), indent=0)

    for name, problem in problems: print(f'  ✗ scene: {problem}  [{name}]')
    print('scene: PASS' if not problems else f'scene: FAIL ({len(problems)} problems)')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
