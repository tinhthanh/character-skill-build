#!/usr/bin/env python3
"""Join several scenes into ONE film: build each scene file with tools/scene.py, render each with the
HyperFrames CLI, then join the parts with transitions (FFmpeg), sound and picture kept together.

    python3 tools/film.py film.json                  → the film named in film.json ("output")
    python3 tools/film.py film.json --no-render      → reuse the parts rendered last time (only join)

film.json (paths are relative to it):

  {
    "scenes": ["intro.scene.json", "exam.scene.json", "call.scene.json"],
    "transition": "fade",          "fade" (cross-fade, default) | "slide" (the next scene slides in) | "cut"
    "duration": 0.6,               seconds each transition takes (ignored for "cut")
    "fps": 30,
    "output": "film.mp4"
  }

Every scene must have the same frame size ("width" / "height"). A scene without sound gets a silent
track, so the sound of the others stays in step. A scene file's "intro" / "outro" cards make the
opening and closing of the film. Parts go to <output name>.parts/ next to the output.
Needs Node (npx) and FFmpeg (ffmpeg, ffprobe). The HyperFrames CLI runs with telemetry off.
"""
import argparse, json, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
HYPERFRAMES = os.environ.get('HYPERFRAMES_VERSION', '0.9.52')
TRANSITIONS = {'fade': 'fade', 'slide': 'slideleft', 'cut': None}


def fail(message):
    print(f'film: {message}', file=sys.stderr)
    sys.exit(1)


def probe(path):
    """(width, height, duration, has_audio) of a video file."""
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height:format=duration', '-of', 'json', path], capture_output=True, text=True)
    if out.returncode != 0: fail(f'cannot read {path}: {out.stderr.strip()}')
    info = json.loads(out.stdout)
    video = next((s for s in info['streams'] if s['codec_type'] == 'video'), None)
    if not video: fail(f'{path} has no picture')
    return video['width'], video['height'], float(info['format']['duration']), any(s['codec_type'] == 'audio' for s in info['streams'])


def main():
    parser = argparse.ArgumentParser(description='Join several scene files into one film with transitions.')
    parser.add_argument('film', help='film.json')
    parser.add_argument('--no-render', action='store_true', help='reuse the parts rendered last time; only join them')
    args = parser.parse_args()
    for tool in ('ffmpeg', 'ffprobe'):
        if not shutil.which(tool): fail(f'{tool} not found — install FFmpeg')
    path = os.path.abspath(args.film)
    try: film = json.load(open(path, encoding='utf-8'))
    except (OSError, ValueError) as error: fail(f'cannot read {args.film}: {error}')
    unknown = set(film) - {'scenes', 'transition', 'duration', 'fps', 'output'}
    if unknown: fail(f'unknown key(s) {", ".join(sorted(unknown))} (allowed: scenes, transition, duration, fps, output)')
    base = os.path.dirname(path)
    scenes = film.get('scenes')
    if not isinstance(scenes, list) or not scenes: fail('"scenes" must be a non-empty list of scene files')
    kind = film.get('transition', 'fade')
    if kind not in TRANSITIONS: fail(f'"transition" must be one of {", ".join(TRANSITIONS)} — got {kind!r}')
    blend = float(film.get('duration', 0.6)) if kind != 'cut' else 0.0
    fps = int(film.get('fps', 30))
    output = os.path.join(base, film.get('output', os.path.splitext(os.path.basename(path))[0] + '.mp4'))
    parts_dir = os.path.splitext(output)[0] + '.parts'
    os.makedirs(parts_dir, exist_ok=True)
    env = dict(os.environ, HYPERFRAMES_NO_TELEMETRY='1', DO_NOT_TRACK='1')

    # 1. Dựng và render từng cảnh; thêm rãnh tiếng im lặng cho cảnh câm (nối tiếng cần mọi đoạn đều có tiếng).
    parts = []
    for number, scene in enumerate(scenes, 1):
        source = os.path.join(base, scene)
        if not os.path.isfile(source): fail(f'scene file not found: {scene}')
        raw, part = os.path.join(parts_dir, f'part{number}.raw.mp4'), os.path.join(parts_dir, f'part{number}.mp4')
        if not args.no_render:
            built = subprocess.run([sys.executable, os.path.join(HERE, 'scene.py'), source, '--force'], capture_output=True, text=True)
            if built.returncode != 0: fail(f'{scene} does not build:\n{built.stderr.strip()}')
            composition = built.stdout.strip().splitlines()[0]
            print(f'  {scene} → rendering …', flush=True)
            done = subprocess.run(['npx', '--yes', f'hyperframes@{HYPERFRAMES}', 'render', '--fps', str(fps), '-o', raw, '.'], cwd=os.path.dirname(composition), env=env, capture_output=True, text=True)
            if done.returncode != 0 or not os.path.isfile(raw): fail(f'{scene} did not render:\n{(done.stdout + done.stderr)[-800:]}')
            width, height, length, has_audio = probe(raw)
            # Đồng nhất mã hoá (cùng fps, cùng định dạng điểm ảnh, tiếng AAC 48 kHz stereo) cho xfade / acrossfade.
            command = ['ffmpeg', '-y', '-loglevel', 'error', '-i', raw]
            if not has_audio: command += ['-f', 'lavfi', '-t', f'{length:.3f}', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000']
            command += ['-map', '0:v', '-map', '0:a' if has_audio else '1:a', '-r', str(fps), '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '18',
                        '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-shortest', part]
            if subprocess.run(command).returncode != 0: fail(f'could not prepare {scene}')
        elif not os.path.isfile(part): fail(f'--no-render: {part} is missing — render once without it')
        parts.append((scene, part) + probe(part)[:3])
    sizes = {(w, h) for _, _, w, h, _ in parts}
    if len(sizes) > 1: fail('the scenes have different frame sizes: ' + ', '.join(f'{scene} {w}×{h}' for scene, _, w, h, _ in parts) + ' — give them the same "width" / "height"')
    shortest = min(length for *_, length in parts)
    if blend and blend * 2 >= shortest: fail(f'the transition ({blend:g} s) is too long for a {shortest:.1f} s scene')

    # 2. Ghép: chuyển cảnh `xfade` (hình) + `acrossfade` (tiếng), mỗi chỗ nối chồng nhau `blend` giây; "cut" thì nối thẳng.
    inputs = sum((['-i', part] for _, part, *_ in parts), [])
    if len(parts) == 1:
        shutil.copy(parts[0][1], output)
    else:
        chain, video, audio, offset = [], '[0:v]', '[0:a]', 0.0
        for index in range(1, len(parts)):
            offset += parts[index - 1][4] - blend
            v_out, a_out = f'[v{index}]', f'[a{index}]'
            if TRANSITIONS[kind]:
                chain.append(f'{video}[{index}:v]xfade=transition={TRANSITIONS[kind]}:duration={blend:g}:offset={offset:.3f}{v_out}')
                chain.append(f'{audio}[{index}:a]acrossfade=d={blend:g}{a_out}')
            video, audio = v_out, a_out
        if not TRANSITIONS[kind]:
            chain = [''.join(f'[{i}:v][{i}:a]' for i in range(len(parts))) + f'concat=n={len(parts)}:v=1:a=1[vout][aout]']
            video, audio = '[vout]', '[aout]'
        command = ['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', ';'.join(chain), '-map', video, '-map', audio,
                   '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', str(fps), '-c:a', 'aac', '-b:a', '192k', output]
        if subprocess.run(command).returncode != 0: fail('FFmpeg could not join the parts')
    total = probe(output)[2]
    print(output)
    print(f'  {len(parts)} scenes, {kind} transitions, {total:.1f} s')


if __name__ == '__main__':
    main()
