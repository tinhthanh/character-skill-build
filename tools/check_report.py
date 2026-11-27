#!/usr/bin/env python3
"""Read the DOM of tools/check.html, print a summary, exit 0 on PASS.

    python3 tools/check_report.py < page.html                 # one unsharded run, DOM on stdin
    python3 tools/check_report.py shard1.html shard2.html …   # the ?shard=i/n runs of one check, merged
    … --times                                                 # also print the slowest units of work

With several shards the report also proves the split dropped nothing: every shard must have met
the same units of work in the same order (`tatCa`), and every unit must have run in exactly one
shard (`phan`).
"""
import html, json, re, sys

args = [a for a in sys.argv[1:] if not a.startswith('--')]
times = '--times' in sys.argv[1:]
sources = [(path, open(path, encoding='utf-8', errors='replace').read()) for path in args] if args else [('stdin', sys.stdin.read())]

results, problems = [], []
for path, text in sources:
    matches = re.findall(r'<pre id="kq">(.*?)</pre>', text, re.S)
    if not matches or not matches[-1].strip():
        where = f' ({path})' if args else ''
        problems.append(f'the check page returned nothing{where} (could GSAP not load? the CDN needs network access)')
        continue
    results.append(json.loads(html.unescape(matches[-1])))

if problems and not results:
    print('FAIL: ' + problems[0])
    sys.exit(1)

# Gộp các phần (đợt 47 B). Thứ tự in nhân vật giữ như một lượt chạy trọn: theo thứ tự gặp trong `tatCa`.
merged = {'ok': not problems, 'loi': [], 'nhanVat': {}, 'thoiGian': {}}
for result in results:
    merged['ok'] = merged['ok'] and result['ok']
    merged['loi'] += result['loi']
    merged['nhanVat'].update(result['nhanVat'])
    merged['thoiGian'].update(result.get('thoiGian', {}))
if len(sources) > 1 and results:
    first = results[0].get('tatCa')
    if first is None: problems.append('the check page does not list its units of work (tatCa) — is tools/check.html current?')
    else:
        for result in results[1:]:
            if result.get('tatCa') != first: problems.append(f"shard {result.get('shard')} met different units of work than shard {results[0].get('shard')}")
        ran = [unit for result in results for unit in result.get('phan', [])]
        missing = [unit for unit in first if unit not in ran]
        twice = sorted({unit for unit in ran if ran.count(unit) > 1})
        some = lambda units: ', '.join(units[:12]) + (f' … ({len(units)} in all)' if len(units) > 12 else '')
        if missing: problems.append('units of work no shard ran: ' + some(missing))
        if twice: problems.append('units of work run in more than one shard: ' + some(twice))
        if len(set(first)) != len(first): problems.append('two units of work share a name: ' + ', '.join(sorted({u for u in first if first.count(u) > 1})))
        shards = sorted(r.get('shard') for r in results)
        count = len(sources)
        if shards != sorted(f'{i}/{count}' for i in range(1, count + 1)): problems.append(f"the shards are {', '.join(shards)}, expected 1/{count} … {count}/{count}")
    order = {unit: i for i, unit in enumerate(first or [])}
    merged['nhanVat'] = dict(sorted(merged['nhanVat'].items(), key=lambda kv: min(order.get(f'person:{kv[0]}', 1e9), order.get(f'pet:{kv[0]}', 1e9))))
if problems: merged['ok'] = False

for name, info in merged['nhanVat'].items():
    print(f"  {name:14} {info['dongTac']} actions")
if times and merged['thoiGian']:
    slow = sorted(merged['thoiGian'].items(), key=lambda kv: -kv[1])
    print(f"  units of work: {len(slow)}, {sum(merged['thoiGian'].values()) / 1000:.0f} s in all; slowest: " + ', '.join(f'{u} {ms / 1000:.1f} s' for u, ms in slow[:8]))
for problem in merged['loi'] + problems:
    print('  ✗', problem)
print('PASS' if merged['ok'] else f"FAIL ({len(merged['loi']) + len(problems)} problems)")
sys.exit(0 if merged['ok'] else 1)
