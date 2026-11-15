#!/usr/bin/env python3
"""Self-test for tools/cues.py, and the generator of the placeholder voice used by
examples/voiceover/ (a synthetic, vowel-like hum — not a recording of anyone).

    python3 tools/check_cues.py                      → PASS / FAIL (run by tools/check.sh)
    python3 tools/check_cues.py --write voice.wav    → write the placeholder voice
"""
import json, math, os, struct, subprocess, sys, tempfile, wave

RATE = 8000
# Ba cụm "âm tiết" cách nhau bởi hai quãng nghỉ — như ba mệnh đề của một câu nói.
PHRASES = [(0.30, [0.9, 0.5, 1.0, 0.6, 0.8]), (2.10, [1.0, 0.6, 0.7, 0.95, 0.5, 0.8, 0.6]), (4.55, [0.8, 1.0, 0.55, 0.9])]
SYLLABLE, GAP, TOTAL = 0.19, 0.06, 6.0


def syllables():
    for start, loudness in PHRASES:
        for n, level in enumerate(loudness):
            yield start + n * (SYLLABLE + GAP), level


def write_voice(path):
    samples = [0.0] * int(TOTAL * RATE)
    for n, (start, level) in enumerate(syllables()):
        pitch = 150 + 25 * math.sin(n * 1.7)                       # cao độ đổi nhẹ theo âm tiết
        for i in range(int(SYLLABLE * RATE)):
            t = i / RATE
            envelope = math.sin(math.pi * t / SYLLABLE) ** 0.6     # vào êm, ra êm
            tone = sum(math.sin(2 * math.pi * pitch * h * t) / h for h in (1, 2, 3, 5))
            samples[int(start * RATE) + i] += 0.28 * level * envelope * tone
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', max(-32767, min(32767, int(v * 32767)))) for v in samples))


def write_sounds(path):
    """Bốn âm tổng hợp nối nhau, mỗi âm 0,4 s cách nhau 0,3 s: 'a' (năng lượng 600–900 Hz), 'i'
    (đáy + 2–3 kHz), 'u' (chỉ có đáy), 's' (tiếng xì). Trả về giờ giữa của từng âm."""
    rate, length, gap = 16000, 0.4, 0.3
    recipes = {'a': {150: 0.3, 300: 0.4, 600: 1.0, 750: 1.0, 900: 0.8, 1200: 0.3}, 'i': {150: 0.6, 300: 1.0, 2250: 0.9, 2400: 0.9, 2700: 0.6}, 'u': {150: 0.7, 300: 1.0, 450: 0.5}}
    samples, centres, seed = [0.0] * int(0.3 * rate), {}, 12345
    for name in ('a', 'i', 'u', 's'):
        centres[name] = len(samples) / rate + length / 2
        for i in range(int(length * rate)):
            t = i / rate
            envelope = min(1.0, t / 0.03, (length - t) / 0.03)
            if name == 's':
                seed = (seed * 1103515245 + 12345) % (1 << 31)
                value = (seed / (1 << 30) - 1.0) * 0.5
            else:
                value = sum(weight * math.sin(2 * math.pi * frequency * t) for frequency, weight in recipes[name].items()) / 3.5
            samples.append(0.6 * envelope * value)
        samples.extend([0.0] * int(gap * rate))
    # Tiếng xì là nhiễu trắng đã lấy hiệu để dồn năng lượng lên tần cao.
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
        w.writeframes(b''.join(struct.pack('<h', max(-32767, min(32767, int(v * 32767)))) for v in samples))
    return centres


def main():
    if len(sys.argv) == 3 and sys.argv[1] == '--write':
        write_voice(sys.argv[2]); print(sys.argv[2]); return
    here = os.path.dirname(os.path.abspath(__file__))
    problems = []
    with tempfile.TemporaryDirectory() as work:
        voice = os.path.join(work, 'voice.wav')
        write_voice(voice)
        for flags, output in ((['--method', 'amplitude'], 'voice.cues.json'), (['--method', 'amplitude', '--js', '--name', 'line1'], 'voice.cues.js')):
            done = subprocess.run([sys.executable, os.path.join(here, 'cues.py'), voice] + flags, capture_output=True, text=True)
            if done.returncode != 0 or not os.path.exists(os.path.join(work, output)):
                problems.append(f"cues.py {' '.join(flags)} failed: {done.stderr.strip() or done.stdout.strip()}")
        if not problems:
            data = json.load(open(os.path.join(work, 'voice.cues.json')))
            cues = data['mouthCues']
            at = lambda time: next((c['value'] for c in cues if c['start'] <= time < c['end']), None)
            if abs(data['metadata']['duration'] - TOTAL) > 0.05: problems.append(f"duration {data['metadata']['duration']} != {TOTAL}")
            if cues[0]['start'] != 0 or abs(cues[-1]['end'] - TOTAL) > 0.05: problems.append('cues do not cover the whole file')
            if any(abs(a['end'] - b['start']) > 0.011 for a, b in zip(cues, cues[1:])): problems.append('cues have gaps or overlaps')
            if any(a['value'] == b['value'] for a, b in zip(cues, cues[1:])): problems.append('neighbouring cues share a shape (not merged)')
            if any(c['value'] not in 'ABCDEFGHX' for c in cues): problems.append('unknown mouth shape')
            for time in (0.1, 1.8, 4.2, 5.8):                       # trước câu, hai quãng nghỉ, sau câu
                if at(time) != 'X': problems.append(f'expected a closed pause (X) at {time}s, got {at(time)}')
            for start, level in syllables():                        # giữa mỗi âm tiết miệng phải mở
                if at(start + SYLLABLE / 2) not in ('B', 'C', 'D'): problems.append(f'expected an open mouth at {start + SYLLABLE / 2:.2f}s, got {at(start + SYLLABLE / 2)}')
            loud = [at(start + SYLLABLE / 2) for start, level in syllables() if level >= 0.95]
            if 'D' not in loud: problems.append('the loudest syllables never reach the widest shape (D)')
            script = open(os.path.join(work, 'voice.cues.js')).read()
            if 'window.VOICE_CUES["line1"] = {' not in script: problems.append('--js --name does not write window.VOICE_CUES["line1"]')
        # Phương pháp PHỔ: mỗi loại âm ra đúng họ khẩu hình của nó.
        sounds = os.path.join(work, 'sounds.wav')
        centres = write_sounds(sounds)
        done = subprocess.run([sys.executable, os.path.join(here, 'cues.py'), sounds, '--method', 'spectral'], capture_output=True, text=True)
        if done.returncode != 0:
            problems.append(f'cues.py --method spectral failed: {done.stderr.strip()}')
        else:
            spectral = json.load(open(os.path.join(work, 'sounds.cues.json')))
            if spectral['metadata']['method'] != 'spectral': problems.append('metadata.method is not "spectral"')
            shape = lambda time: next((c['value'] for c in spectral['mouthCues'] if c['start'] <= time < c['end']), None)
            for name, wanted in (('a', 'CD'), ('i', 'BC'), ('u', 'EF'), ('s', 'B')):
                if shape(centres[name]) not in wanted: problems.append(f"spectral: the '{name}' sound gives shape {shape(centres[name])}, expected one of {wanted}")
            if shape(centres['a']) == shape(centres['u']): problems.append("spectral: 'a' and 'u' get the same mouth shape")
            if shape(0.1) != 'X': problems.append('spectral: the silence before the first sound is not X')
        default = subprocess.run([sys.executable, os.path.join(here, 'cues.py'), voice, '-o', os.path.join(work, 'auto.json')], capture_output=True, text=True)
        if default.returncode == 0:
            method = json.load(open(os.path.join(work, 'auto.json')))['metadata']['method']
            if method not in ('rhubarb', 'spectral'): problems.append(f'the default method is {method}, expected rhubarb (when installed) or spectral')
        else:
            problems.append(f'cues.py with the default method failed: {default.stderr.strip()}')
        missing = subprocess.run([sys.executable, os.path.join(here, 'cues.py'), os.path.join(work, 'nope.wav')], capture_output=True, text=True)
        if missing.returncode == 0: problems.append('a missing audio file does not fail')
    for problem in problems: print(f'  ✗ cues: {problem}')
    print('cues: PASS' if not problems else f'cues: FAIL ({len(problems)} problems)')
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
