#!/usr/bin/env python3
"""SOÁT ÁNH SÁNG bằng ẢNH TĨNH và câu hỏi CÓ / KHÔNG — thay cho chấm điểm cả video.

    python3 tools/light_audit.py cảnh-1/ cảnh-2/ … -o audit/        → audit/scene-<n>.png (mỗi cảnh một bảng ảnh) và
                                                                     audit/prompt.txt (câu hỏi đánh số cho người / máy chấm)
    python3 tools/light_audit.py --score audit/answers.json -o audit/  → điểm (số câu "có" / tổng), câu nào hỏng, ghi thêm
                                                                     một dòng vào audit/history.json để so giữa các đợt

Mỗi thư mục cảnh là thư mục tools/scene.py vừa dựng (index.html + moments.json). moments.json liệt kê các khoảnh
khắc ánh sáng (mở cảnh, mất điện, trời chuyển, bật đèn, rọi đèn pin, soi đèn khám) và các câu hỏi mà câu đúng là
"có". Chấm cả video thì người chấm (Gemini, đợt 21) nói ngược với hình — "mèo không nheo mắt" trong khi mèo đang
nheo; hỏi đúng một điều trên đúng một ảnh thì câu trả lời kiểm được.

answers.json: [{ "q": 1, "a": "yes" }, …] — đúng như prompt.txt yêu cầu người chấm trả về.
"""
import argparse, datetime, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def make(scenes, out):
    os.makedirs(out, exist_ok=True)
    questions, lines = [], []
    for n, folder in enumerate(scenes, 1):
        moments_path = os.path.join(folder, 'moments.json')
        if not os.path.isfile(moments_path): sys.exit(f'light_audit: {folder} has no moments.json — build it with tools/scene.py (a 3D set)')
        moments = json.load(open(moments_path, encoding='utf-8'))
        if not moments: continue
        times = ','.join(f'{m["t"]:g}' for m in moments)
        sheet = os.path.join(out, f'scene-{n}.png')
        env = dict(os.environ, PEEK_WIDTH=os.environ.get('PEEK_WIDTH', '800'), PEEK_COLS=os.environ.get('PEEK_COLS', '2'))
        done = subprocess.run(['sh', os.path.join(HERE, 'peek.sh'), os.path.join(folder, 'index.html'), times, sheet], capture_output=True, text=True, env=env)
        if done.returncode != 0 or not os.path.isfile(sheet): sys.exit(f'light_audit: could not capture {folder}:\n{done.stderr.strip()[-600:]}')
        lines.append(f'IMAGE {n} (scene-{n}.png) — each frame is labelled with its time in seconds.')
        for m in moments:
            lines.append(f'  Frame at {m["t"]:g} s ({m["what"]}):')
            for ask in m['ask']:
                questions.append({'q': len(questions) + 1, 'scene': n, 't': m['t'], 'what': m['what'], 'ask': ask})
                lines.append(f'    Q{len(questions)}. {ask}')
    head = ('You are checking the lighting of a 2.5D animated film from still frames. For each question look ONLY at the named frame '
            'and answer strictly "yes" or "no" from what is visible in the picture (do not guess what the film intends). '
            'Answer "n/a" only when the thing the question is about (a lamp, a TV, furniture, a flashlight…) is not in that frame at all. '
            'Reply with a JSON array only, one item per question: [{"q": 1, "a": "yes", "why": "a few words"}, …].\n')
    open(os.path.join(out, 'prompt.txt'), 'w', encoding='utf-8').write(head + '\n' + '\n'.join(lines) + '\n')
    json.dump(questions, open(os.path.join(out, 'questions.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'light_audit: {len(questions)} questions on {len(scenes)} scene(s) → {out}/prompt.txt and scene-*.png')


def score(answers_path, out, label):
    questions = json.load(open(os.path.join(out, 'questions.json'), encoding='utf-8'))
    text = open(answers_path, encoding='utf-8').read()
    found = re.search(r'\[.*\]', text, re.S)                 # câu trả lời có thể bọc trong ```json … ```
    if not found: sys.exit('light_audit: no JSON array in the answers')
    answers = {int(item['q']): str(item.get('a', '')).strip().lower() for item in json.loads(found.group(0))}
    # "n/a": thứ được hỏi không có trong khung (đèn ngoài khung lúc ấy) — không tính vào điểm, nhưng liệt kê: câu hỏi chọn
    # sai lúc, sửa moments.json chứ không sửa hình.
    skipped = [q for q in questions if answers.get(q['q']) in ('n/a', 'na')]
    failed = [q for q in questions if answers.get(q['q']) not in ('yes', 'n/a', 'na')]
    counted = [q for q in questions if q not in skipped]
    passed = len(counted) - len(failed)
    per_scene = {}
    for q in counted: per_scene.setdefault(q['scene'], [0, 0]); per_scene[q['scene']][1] += 1; per_scene[q['scene']][0] += answers.get(q['q']) == 'yes'
    print(f'light_audit: {passed}/{len(counted)} yes ({100 * passed / max(1, len(counted)):.0f} %)' + (f', {len(skipped)} n/a' if skipped else '') + ' — ' + ' · '.join(f'scene {n}: {a}/{b}' for n, (a, b) in sorted(per_scene.items())))
    for q in skipped: print(f'  · Q{q["q"]} scene {q["scene"]} at {q["t"]:g} s: not in the frame — {q["ask"]}')
    for q in failed: print(f'  ✗ Q{q["q"]} scene {q["scene"]} at {q["t"]:g} s ({q["what"]}): {q["ask"]} — answered {answers.get(q["q"], "nothing")!r}')
    history_path = os.path.join(out, 'history.json')
    history = json.load(open(history_path, encoding='utf-8')) if os.path.isfile(history_path) else []
    history.append({'date': datetime.date.today().isoformat(), 'label': label, 'yes': passed, 'total': len(counted), 'na': [q['q'] for q in skipped],
                    'scenes': {str(n): f'{a}/{b}' for n, (a, b) in sorted(per_scene.items())}, 'failed': [q['q'] for q in failed]})
    json.dump(history, open(history_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Lighting check from still frames and yes / no questions.')
    parser.add_argument('scenes', nargs='*', help='scene folders built by tools/scene.py')
    parser.add_argument('-o', '--out', required=True, help='folder for the sheets, prompt.txt, questions.json, history.json')
    parser.add_argument('--score', help='answers.json from the reviewer: score it against questions.json')
    parser.add_argument('--label', default='', help='a name for this run in history.json (e.g. "0.62.0")')
    args = parser.parse_args()
    if args.score: score(args.score, args.out, args.label)
    elif args.scenes: make(args.scenes, args.out)
    else: parser.error('give scene folders, or --score answers.json')
