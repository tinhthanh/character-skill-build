"""Notes printed after a build (framing cut through people, shots, quiet stretches) and the file fingerprint."""
import hashlib, re


def fingerprint(html):
    """Short hash of a generated page, ignoring the line that stores the hash itself."""
    return hashlib.sha256(re.sub(r'<!-- scene\.py:[0-9a-f]{16} -->\n?', '', html).encode('utf-8')).hexdigest()[:16]


def framing_notes(samples, step=0.25, least=2.0):
    """Nhắc những đoạn (≥ `least` giây) mà mép khung cắt dở một nhân vật — còn 5…85 % hình trong khung (người ở mép dưới: 5…60 %). Ít hơn là chỉ
    lướt qua mép (đi vào / ra khỏi khung, máy đang lia qua), nhiều hơn là chỉ sượt chân tóc: không nhắc."""
    spans = {}
    for sample in samples:
        # Mép DƯỚI cắt ngang chân NGƯỜI là cỡ cảnh trung (cận ngực, cận gối) — cách quay bình thường; chỉ nhắc khi mất quá
        # nửa người (chỉ còn đầu lấp ló ở đáy khung). Con vật thấp, cả người nó là đầu và thân: mép dưới cắt nó cũng là lỗi.
        if not 0.05 <= sample['shown'] <= (0.6 if sample['edge'] == 'bottom' and not sample.get('pet') else 0.85): continue
        runs = spans.setdefault((sample['name'], sample['edge']), [])
        if runs and sample['t'] - runs[-1][1] <= step * 1.5: runs[-1][1] = sample['t']; runs[-1][2].append(sample['shown'])
        else: runs.append([sample['t'], sample['t'], [sample['shown']]])
    notes = []
    for (name, edge), runs in spans.items():
        for start, end, shown in runs:
            if end + step - start < least: continue
            notes.append((start, f'{start:.1f}–{end + step:.1f} s: the {edge} edge of the frame cuts through "{name}" (about {round(100 * sum(shown) / len(shown))} % shows) — '
                                 f'frame them in or leave them out: change that turn\'s "view" (x, zoom, distance), or move "{name}"'))
    return [note for _, note in sorted(notes)]


MEDIUM_WIDE = 0.85      # góc trung rộng ≥ 85 % góc toàn của cùng chủ thể: cắt sang gần như cùng một khung (đợt 31)


def shot_notes(shots):
    """Nhắc những góc TRUNG gần rộng bằng góc TOÀN của cùng các chủ thể (`set.shotLog`, ghi lúc `direct` đặt máy): cắt từ góc
    toàn sang đó người xem chỉ thấy khung giật nhẹ — hai chủ thể đứng xa nhau mà còn phải lấy trọn đồ đạc (đợt 30)."""
    return [f'{shot["t"]:.1f} s: the medium shot of {", ".join(shot["subjects"])} is {shot["ratio"] * 100:.0f} % as wide as their full shot — a cut to it barely changes the frame; '
            f'stand them closer, or give that turn a "view" on one of them' for shot in shots if shot.get('ratio') and shot['ratio'] >= MEDIUM_WIDE and shot.get('how') not in ('full', 'gesture')] \
        + [f'{shot["t"]:.1f} s: no medium shot of {", ".join(shot["subjects"])} could be framed (it was {shot["first"] * 100:.0f} % as wide as their full shot) — the full shot is kept; '
           f'stand them closer, or give that turn a "view"' for shot in shots if shot.get('how') == 'full']      # đợt 32: góc trung bị giữ thành góc toàn


def quiet_notes(timings, shown_turns, longest=8.0):
    """Nhắc những quãng DÀI không có lời nào (câu thoại, thẻ thông báo, thông báo trên màn hình) — hơn `longest` giây giữa
    lúc cảnh bắt đầu, các câu, và thẻ kết thúc. Người xem quảng cáo ngắn rời đi trong quãng ấy (cảnh thử đợt 11: 20 s đầu
    cảnh công viên chỉ có người đi và máy lia). Cảnh không có câu nào (một đoạn chỉ có động tác) thì không nhắc."""
    lines, turns = timings.get('lines', []), timings.get('turns', [])
    if not lines or not turns: return []
    said = sorted([(float(line['start']), float(line['end'])) for line in lines] + [(turns[n][0], turns[n][0] + 2.5) for n in shown_turns if n < len(turns)])
    start, end = turns[0][0], float(timings.get('outro') or timings['duration'])
    notes, at = [], start
    for begin, finish in said + [(end, end)]:
        if begin - at > longest: notes.append(f'{at:.1f}–{begin:.1f} s: nothing is said or shown for {begin - at:.0f} s — viewers drift off; add a line, a "toast", or shorten what happens there')
        at = max(at, finish)
    return notes
