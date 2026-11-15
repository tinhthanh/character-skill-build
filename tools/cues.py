#!/usr/bin/env python3
"""Turn a voice-over file into MOUTH CUES for `rig.speakCues(cues)`.

    python3 tools/cues.py voice.wav                 → voice.cues.json (next to the audio)
    python3 tools/cues.py voice.wav --js            → voice.cues.js   (a plain <script> to include)
    python3 tools/cues.py voice.wav -o out.json --method amplitude

Three methods, same output format (Rhubarb's: {"metadata": …, "mouthCues": [{start, end, value}]}):

  rhubarb    Rhubarb Lip Sync reads the phonemes — mouth shapes follow the words. Used when
             the `rhubarb` program is installed (on PATH, or its path in $RHUBARB).
             https://github.com/DanielSWolf/rhubarb-lip-sync
  spectral   No dependency. Looks at WHERE the sound's energy is, 20 ms at a time: hissing
             sounds (s, t, ch) close the teeth, energy around 500–900 Hz opens the mouth (a, o),
             energy up at 2–3 kHz spreads it (e, i), energy only at the bottom rounds it
             (u, oo) or closes it (m, n). A guess from acoustics, not speech recognition — but
             the mouth changes shape with the vowels. The default when Rhubarb is not installed.
  amplitude  No dependency: the mouth just opens with the loudness of the voice. Timing is
             right, shapes are only open / wider / widest.

WAV (PCM) is read directly. Any other format (mp3, m4a, ogg…) is converted with `ffmpeg`,
which must then be installed. Nothing is uploaded anywhere.
"""
import argparse, json, math, os, shutil, struct, subprocess, sys, tempfile, wave

FRAME = 0.02            # 20 ms analysis frames
MIN_CUE = 0.06          # shortest mouth shape worth showing
PAUSE = 0.16            # a quieter stretch this long is a pause between phrases (shape X)


def fail(message):
    print(f"cues: {message}", file=sys.stderr)
    sys.exit(1)


def as_wav(path, work):
    """Return a path to a PCM WAV version of `path` (itself when it already is one)."""
    try:
        with wave.open(path, 'rb') as w:
            if w.getsampwidth() in (1, 2, 3, 4) and w.getcomptype() == 'NONE':
                return path
    except (wave.Error, EOFError):
        pass
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        fail(f"{os.path.basename(path)} is not a PCM WAV file and ffmpeg is not installed to convert it")
    out = os.path.join(work, 'voice.wav')
    done = subprocess.run([ffmpeg, '-y', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', out])
    if done.returncode != 0 or not os.path.exists(out):
        fail(f"ffmpeg could not read {path}")
    return out


def loudness(path):
    """RMS loudness of each 20 ms frame, and the duration in seconds."""
    with wave.open(path, 'rb') as w:
        channels, width, rate, count = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        raw = w.readframes(count)
    step = width * channels
    size = max(1, int(rate * FRAME))
    levels = []
    for start in range(0, count, size):
        total, n = 0.0, 0
        for i in range(start, min(count, start + size)):
            chunk = raw[i * step:i * step + width]          # first channel only
            if width == 1:
                value = chunk[0] - 128
            else:
                value = int.from_bytes(chunk, 'little', signed=True)
            total += value * value
            n += 1
        levels.append(math.sqrt(total / n) if n else 0.0)
    return levels, count / rate


def amplitude_cues(path):
    levels, duration = loudness(path)
    if not levels or max(levels) <= 0:
        return [{'start': 0.0, 'end': round(duration, 2), 'value': 'X'}], duration
    # Loud reference = 95th percentile (one click must not set the scale); floor = quietest tenth.
    ranked = sorted(levels)
    loud = ranked[min(len(ranked) - 1, int(len(ranked) * 0.95))] or max(levels)
    floor = ranked[int(len(ranked) * 0.1)]
    gate = floor + (loud - floor) * 0.12
    # Smooth over three frames so single-frame dips do not make the lips flutter.
    smooth = [(levels[max(0, i - 1)] + levels[i] + levels[min(len(levels) - 1, i + 1)]) / 3 for i in range(len(levels))]

    def shape(level):
        if level < gate:
            return 'X'
        ratio = (level - gate) / max(1e-9, loud - gate)
        return 'B' if ratio < 0.3 else 'C' if ratio < 0.68 else 'D'

    # Runs of equal shape → cues.
    cues = []
    for i, level in enumerate(smooth):
        value = shape(level)
        if cues and cues[-1]['value'] == value:
            cues[-1]['end'] = (i + 1) * FRAME
        else:
            cues.append({'start': i * FRAME, 'end': (i + 1) * FRAME, 'value': value})
    cues[-1]['end'] = duration
    return tidy(cues), duration


def samples_of(path, top_rate=11000):
    """First channel as floats, halved in rate until at most `top_rate` (speech needs no more)."""
    with wave.open(path, 'rb') as w:
        channels, width, rate, count = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        raw = w.readframes(count)
    step = width * channels
    if width == 1:
        data = [raw[i * step] - 128 for i in range(count)]
    else:
        data = [int.from_bytes(raw[i * step:i * step + width], 'little', signed=True) for i in range(count)]
    duration = count / rate
    while rate > top_rate:                                   # trung bình từng cặp mẫu = lọc thô + giảm nửa tần số
        data = [(data[i] + data[i + 1]) / 2 for i in range(0, len(data) - 1, 2)]
        rate //= 2
    return data, rate, duration


# Bốn dải tần của tiếng nói (Hz): đáy · vùng mở miệng · giữa · vùng âm trước / âm xát.
BANDS = ((200, 275, 350, 425), (500, 600, 700, 800, 900), (1050, 1250, 1450, 1650), (1900, 2150, 2400, 2650, 2900))


def band_power(frame, rate, frequency):
    """Power of one frequency in a frame (Goertzel)."""
    k = 2 * math.cos(2 * math.pi * frequency / rate)
    a = b = 0.0
    for value in frame:
        a, b = value + k * a - b, a
    return a * a + b * b - k * a * b


def spectral_shape(frame, emphasised, rate, level):
    """Mouth shape of one voiced frame. `level` is its loudness, 0…1+ against the loud parts."""
    size = len(frame)
    crossings = sum(1 for i in range(1, size) if (frame[i] >= 0) != (frame[i - 1] >= 0)) * rate / (2 * size)
    if crossings > 1800:                                     # tiếng xì (s, t, ch, sh): răng gần khít
        return 'B'
    usable = [[f for f in band if f < rate * 0.45] for band in BANDS]
    power = [sum(band_power(emphasised, rate, f) for f in band) for band in usable]
    total = sum(power) or 1.0
    low, open_, mid, front = (p / total for p in power)
    if front >= 0.35:                                        # e, i: miệng bè ngang
        return 'C' if level >= 0.38 else 'B'
    if open_ >= 0.45 or (open_ + mid >= 0.6 and mid >= 0.25):  # a, o: miệng mở
        return 'D' if level >= 0.6 else 'C' if level >= 0.22 else 'B'
    if low >= 0.6:                                           # chỉ có đáy: u / oo (to) hoặc m, n (nhỏ)
        if level < 0.14:                                     # gần như im: môi khép (m, b, p)
            return 'A'
        if level < 0.34:                                     # nhỏ: n, l, nguyên âm lướt — miệng hé chứ không mím
            return 'B'
        return 'F' if level >= 0.55 and open_ + mid < 0.12 else 'E'
    return 'D' if level >= 0.65 else 'C' if level >= 0.28 else 'B'


def spectral_cues(path):
    data, rate, duration = samples_of(path)
    size = max(1, int(rate * FRAME))
    count = len(data) // size
    if not count:
        return [{'start': 0.0, 'end': round(duration, 2), 'value': 'X'}], duration
    emphasised = [data[i] - 0.95 * data[i - 1] if i else data[0] for i in range(len(data))]   # nâng tần cao cho phổ bớt dốc
    levels = [math.sqrt(sum(v * v for v in data[n * size:(n + 1) * size]) / size) for n in range(count)]
    ranked = sorted(levels)
    loud = ranked[min(count - 1, int(count * 0.95))] or max(levels) or 1.0
    floor = ranked[int(count * 0.1)]
    gate = floor + (loud - floor) * 0.12
    # Độ to được so với CỤM LỜI của chính nó, không chỉ với chỗ to nhất của cả tệp: người nói nhỏ dần về
    # cuối câu, so với đỉnh toàn tệp thì nửa sau của câu chỉ còn là miệng hé — nhân vật thành ra nói lí nhí.
    # Một cụm = các khung có tiếng liền nhau, cách nhau bởi quãng im dài hơn PAUSE.
    phrase_peak = [loud] * count
    start, quiet, pause_frames = None, 0, int(PAUSE / FRAME)
    def close(first, last):
        voiced = sorted(levels[i] for i in range(first, last + 1) if levels[i] >= gate)
        if voiced:
            peak = max(voiced[min(len(voiced) - 1, int(len(voiced) * 0.9))], gate + (loud - gate) * 0.35)   # cụm rất nhỏ thì không thổi phồng quá
            for i in range(first, last + 1): phrase_peak[i] = peak
    for n in range(count + 1):
        voiced = n < count and levels[n] >= gate
        if voiced:
            if start is None: start = n
            quiet = 0
        elif start is not None:
            quiet += 1
            if quiet > pause_frames or n == count:
                close(start, n - quiet); start, quiet = None, 0
    shapes = []
    for n in range(count):
        if levels[n] < gate:
            shapes.append('X')
        else:
            level = max((levels[n] - gate) / max(1e-9, loud - gate), (levels[n] - gate) / max(1e-9, phrase_peak[n] - gate))
            shapes.append(spectral_shape(data[n * size:(n + 1) * size], emphasised[n * size:(n + 1) * size], rate, level))
    # Một khung lạc giữa hai khung giống nhau là nhiễu: theo hàng xóm.
    for n in range(1, count - 1):
        if shapes[n - 1] == shapes[n + 1] != shapes[n]:
            shapes[n] = shapes[n - 1]
    cues = []
    for n, value in enumerate(shapes):
        if cues and cues[-1]['value'] == value:
            cues[-1]['end'] = (n + 1) * FRAME
        else:
            cues.append({'start': n * FRAME, 'end': (n + 1) * FRAME, 'value': value})
    cues[-1]['end'] = duration
    return tidy(cues), duration


def tidy(cues):
    """Short quiet gaps become a closed mouth, blink-length shapes are absorbed, equal neighbours merge."""
    for cue in cues:
        if cue['value'] == 'X' and cue['end'] - cue['start'] < PAUSE and cue is not cues[0] and cue is not cues[-1]:
            cue['value'] = 'A'
    merged = []
    for cue in cues:
        if merged and (cue['end'] - cue['start'] < MIN_CUE or merged[-1]['value'] == cue['value']):
            merged[-1]['end'] = cue['end']
        else:
            merged.append(dict(cue))
    for cue in merged:
        cue['start'], cue['end'] = round(cue['start'], 2), round(cue['end'], 2)
    return merged


def rhubarb_cues(path, program, dialog):
    command = [program, '-f', 'json', '--machineReadable', path]
    if dialog:
        command[1:1] = ['--dialogFile', dialog]
    done = subprocess.run(command, capture_output=True, text=True)
    if done.returncode != 0:
        fail('rhubarb failed: ' + (done.stderr.strip().splitlines() or ['no message'])[-1])
    data = json.loads(done.stdout)
    return data['mouthCues'], float(data.get('metadata', {}).get('duration', data['mouthCues'][-1]['end']))


def main():
    parser = argparse.ArgumentParser(description='Mouth cues for rig.speakCues() from a voice-over file.')
    parser.add_argument('audio')
    parser.add_argument('-o', '--output', help='output file (default: <audio>.cues.json, or .cues.js with --js)')
    parser.add_argument('--method', choices=['auto', 'rhubarb', 'spectral', 'amplitude'], default='auto')
    parser.add_argument('--js', action='store_true', help='write a plain script that sets window.VOICE_CUES["<name>"]')
    parser.add_argument('--name', help='key used with --js (default: the audio file name without extension)')
    parser.add_argument('--dialog', help='text file with the spoken words (improves Rhubarb; also stored as the caption text)')
    parser.add_argument('--text', help='the spoken words, stored in the cues so captions() can show them')
    args = parser.parse_args()
    if not os.path.isfile(args.audio):
        fail(f'no such file: {args.audio}')
    program = os.environ.get('RHUBARB') or shutil.which('rhubarb')
    method = args.method
    if method == 'auto':
        method = 'rhubarb' if program else 'spectral'
    if method == 'rhubarb' and not program:
        fail('rhubarb is not installed (not on PATH and $RHUBARB is not set) — install it or use --method spectral')

    with tempfile.TemporaryDirectory() as work:
        source = as_wav(args.audio, work)
        cues, duration = (rhubarb_cues(source, program, args.dialog) if method == 'rhubarb' else spectral_cues(source) if method == 'spectral' else amplitude_cues(source))

    name = args.name or os.path.splitext(os.path.basename(args.audio))[0]
    data = {'metadata': {'soundFile': os.path.basename(args.audio), 'duration': round(duration, 2), 'method': method}, 'mouthCues': cues}
    words = args.text or (open(args.dialog, encoding='utf-8').read() if args.dialog else '')
    if words.strip():
        data['metadata']['text'] = ' '.join(words.split())
    base = os.path.splitext(args.audio)[0]
    output = args.output or (base + ('.cues.js' if args.js else '.cues.json'))
    with open(output, 'w', encoding='utf-8') as f:
        if args.js or output.endswith('.js'):
            f.write('// Generated by tools/cues.py — mouth cues for rig.speakCues(). Include with <script src>.\n')
            f.write('window.VOICE_CUES = window.VOICE_CUES || {};\n')
            f.write(f'window.VOICE_CUES[{json.dumps(name)}] = {json.dumps(data, separators=(",", ":"))};\n')
        else:
            json.dump(data, f, indent=1)
            f.write('\n')
    spoken = sum(c['end'] - c['start'] for c in cues if c['value'] != 'X')
    print(f"{output}  ({method}: {len(cues)} cues, {duration:.2f} s, speaking {spoken:.1f} s)")


if __name__ == '__main__':
    main()
