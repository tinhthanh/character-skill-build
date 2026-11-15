#!/usr/bin/env python3
"""Turn a voice-over file into MOUTH CUES for `rig.speakCues(cues)`.

    python3 tools/cues.py voice.wav                 → voice.cues.json (next to the audio)
    python3 tools/cues.py voice.wav --js            → voice.cues.js   (a plain <script> to include)
    python3 tools/cues.py voice.wav -o out.json --method amplitude

Two methods, same output format (Rhubarb's: {"metadata": …, "mouthCues": [{start, end, value}]}):

  rhubarb    Rhubarb Lip Sync reads the phonemes — mouth shapes follow the words. Used when
             the `rhubarb` program is installed (on PATH, or its path in $RHUBARB).
             https://github.com/DanielSWolf/rhubarb-lip-sync
  amplitude  No dependency: the mouth opens with the loudness of the voice and closes in the
             pauses. Timing is right, mouth SHAPES are approximate. The default when Rhubarb
             is not installed.

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
    # A short quiet gap inside a phrase is a closed mouth (A: m, b, p), not a pause.
    for cue in cues:
        if cue['value'] == 'X' and cue['end'] - cue['start'] < PAUSE and cue is not cues[0] and cue is not cues[-1]:
            cue['value'] = 'A'
    # Absorb shapes too short to see into their neighbour, then merge equal neighbours.
    merged = []
    for cue in cues:
        if merged and (cue['end'] - cue['start'] < MIN_CUE or merged[-1]['value'] == cue['value']):
            merged[-1]['end'] = cue['end']
        else:
            merged.append(dict(cue))
    for cue in merged:
        cue['start'], cue['end'] = round(cue['start'], 2), round(cue['end'], 2)
    return merged, duration


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
    parser.add_argument('--method', choices=['auto', 'rhubarb', 'amplitude'], default='auto')
    parser.add_argument('--js', action='store_true', help='write a plain script that sets window.VOICE_CUES["<name>"]')
    parser.add_argument('--name', help='key used with --js (default: the audio file name without extension)')
    parser.add_argument('--dialog', help='text file with the spoken words (improves Rhubarb)')
    args = parser.parse_args()
    if not os.path.isfile(args.audio):
        fail(f'no such file: {args.audio}')
    program = os.environ.get('RHUBARB') or shutil.which('rhubarb')
    method = args.method
    if method == 'auto':
        method = 'rhubarb' if program else 'amplitude'
    if method == 'rhubarb' and not program:
        fail('rhubarb is not installed (not on PATH and $RHUBARB is not set) — install it or use --method amplitude')

    with tempfile.TemporaryDirectory() as work:
        source = as_wav(args.audio, work)
        cues, duration = rhubarb_cues(source, program, args.dialog) if method == 'rhubarb' else amplitude_cues(source)

    name = args.name or os.path.splitext(os.path.basename(args.audio))[0]
    data = {'metadata': {'soundFile': os.path.basename(args.audio), 'duration': round(duration, 2), 'method': method}, 'mouthCues': cues}
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
