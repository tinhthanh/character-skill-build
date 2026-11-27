"""Placing content panels and toasts on the page once the timings are known."""
import re


def place_shows(html, timings, total):
    """Fill in data-start / data-duration of every content clip (title, bullet, image) from the turn timings."""
    turns = timings.get('turns')
    if not turns: return html
    def fix(match):
        tag = match.group(0)
        turn = int(re.search(r'data-show-turn="(\d+)"', tag).group(1))
        part = float(re.search(r'data-show-part="([\d.]+)"', tag).group(1))
        until = re.search(r'data-show-until="(\w+)"', tag).group(1)
        begin, finish = turns[turn]
        start = begin + part * max(0.0, finish - begin - 0.6) * 0.85               # các ý hiện dần trong lúc câu ấy được nói
        if turn == 0 and part == 0: start = 0.0                                    # nội dung đầu tiên có mặt từ khung 0 — khung ấy là ảnh bìa của video
        end = total if until == 'end' else turns[int(until)][0]
        tag = re.sub(r'data-start="[^"]*"', f'data-start="{start:.2f}"', tag, count=1)
        return re.sub(r'data-duration="[^"]*"', f'data-duration="{max(0.2, end - start):.2f}"', tag, count=1)
    return re.sub(r'<(?:div|img)\b[^>]*\bdata-show-turn="\d+"[^>]*>', fix, html)


def place_toasts(html, timings, total):
    """Fill in data-start / data-duration of every notification card (`"toast"`) from the turn timings: it slides in
    0.2 s into its turn and stays for the turn (2.5–4 s)."""
    turns = timings.get('turns')
    if not turns: return html
    def fix(match):
        tag = match.group(0)
        turn = int(re.search(r'data-toast-turn="(\d+)"', tag).group(1))
        begin, finish = turns[min(turn, len(turns) - 1)]
        start = begin + 0.2
        length = min(4.0, max(2.5, finish - begin), max(0.5, total - start))
        tag = re.sub(r'data-start="[^"]*"', f'data-start="{start:.2f}"', tag, count=1)
        return re.sub(r'data-duration="[^"]*"', f'data-duration="{length:.2f}"', tag, count=1)
    return re.sub(r'<div\b[^>]*\bdata-toast-turn="\d+"[^>]*>', fix, html)
