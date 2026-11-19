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
    "output": "film.mp4",
    "music": "music.mp3",          optional: background music under the whole film — looped to length, faded in and
    "musicVolume": 0.25,              out, and lowered automatically while someone speaks (ducking)
    "subtitles": true,             write film.srt next to the film from every spoken line (default true)
    "poster": 1.0                  write film.jpg — the frame at this second (false: none; default 1.0)
  }

Every scene must have the same frame size ("width" / "height"). A scene without sound gets a silent
track, so the sound of the others stays in step. Only the FIRST scene's "intro" card and the LAST
scene's "outro" card are kept — they open and close the film; the cards of the scenes in between
are left out. Parts go to <output name>.parts/ next to the output.
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
    allowed = {'scenes', 'transition', 'duration', 'fps', 'output', 'music', 'musicVolume', 'subtitles', 'poster'}
    unknown = set(film) - allowed
    if unknown: fail(f'unknown key(s) {", ".join(sorted(unknown))} (allowed: {", ".join(sorted(allowed))})')
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

    # Thẻ của các cảnh giữa bị bỏ: nhắc nếu vì thế phim mất thẻ mở đầu / kết thúc mà một cảnh khác có.
    def cards_of(scene):
        try: return json.load(open(os.path.join(base, scene), encoding='utf-8'))
        except (OSError, ValueError): return {}
    loaded = [cards_of(scene) for scene in scenes]
    for key, keep, word in (('intro', 0, 'first'), ('outro', -1, 'last')):
        if len(scenes) > 1 and not loaded[keep].get(key) and any(data.get(key) for data in loaded):
            print(f'  ! the film has no "{key}" card: only the {word} scene\'s "{key}" is kept, and {scenes[keep]} has none — move the card there', file=sys.stderr)

    # 1. DỰNG mọi cảnh trước (nhanh, vài giây mỗi cảnh) — cảnh nào hỏng thì báo ngay, không đợi render xong các cảnh trước
    #    nó. Dựng cả khi --no-render: cần thư mục composition và timings.json (câu thoại cho phụ đề). Mỗi cảnh dựng vào thư
    #    mục riêng trong .parts/ (không đè bản dựng lẻ của nó). Thẻ mở đầu chỉ ở cảnh ĐẦU, thẻ kết thúc chỉ ở cảnh CUỐI —
    #    thẻ "Tải app" giữa phim cắt ngang mạch phim (Gemini soát phim thử đợt 11, giây 27).
    compositions, speech = [], []
    for number, scene in enumerate(scenes, 1):
        source = os.path.join(base, scene)
        if not os.path.isfile(source): fail(f'scene file not found: {scene}')
        cards = (['--no-intro'] if number > 1 else []) + (['--no-outro'] if number < len(scenes) else [])
        built = subprocess.run([sys.executable, os.path.join(HERE, 'scene.py'), source, '--force', '-o', os.path.join(parts_dir, f'scene{number}'), *cards], capture_output=True, text=True)
        if built.returncode != 0: fail(f'{scene} does not build:\n{built.stderr.strip()}')
        for line in built.stdout.splitlines():
            if line.startswith('  !'): print(f'  {scene}:{line[1:]}', file=sys.stderr)          # lời nhắc của scene.py (góc máy cắt người…)
        composition = built.stdout.strip().splitlines()[0]
        timing_file = os.path.join(os.path.dirname(composition), 'timings.json')
        compositions.append(composition)
        speech.append(json.load(open(timing_file, encoding='utf-8')).get('lines', []) if os.path.isfile(timing_file) else [])

    # 2. Render từng cảnh; thêm rãnh tiếng im lặng cho cảnh câm (nối tiếng cần mọi đoạn đều có tiếng).
    parts = []
    for number, (scene, composition) in enumerate(zip(scenes, compositions), 1):
        raw, part = os.path.join(parts_dir, f'part{number}.raw.mp4'), os.path.join(parts_dir, f'part{number}.mp4')
        if not args.no_render:
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

    # 3. Ghép: chuyển cảnh `xfade` (hình) + `acrossfade` (tiếng), mỗi chỗ nối chồng nhau `blend` giây; "cut" thì nối thẳng.
    music = film.get('music')
    if music and not os.path.isfile(os.path.join(base, music)): fail(f'music not found: {music}')
    joined = os.path.join(parts_dir, 'joined.mp4') if music else output
    inputs = sum((['-i', part] for _, part, *_ in parts), [])
    if len(parts) == 1:
        shutil.copy(parts[0][1], joined)
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
                   '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', str(fps), '-c:a', 'aac', '-b:a', '192k', joined]
        if subprocess.run(command).returncode != 0: fail('FFmpeg could not join the parts')

    # 4. Nhạc nền: lặp cho đủ độ dài, fade đầu / cuối, và HẠ XUỐNG khi có lời (sidechaincompress lấy chính tiếng của phim
    #    làm tín hiệu điều khiển), rồi trộn với tiếng của phim. Hình chép nguyên.
    if music:
        length = probe(joined)[2]
        volume = float(film.get('musicVolume', 0.25))
        mix = (f'[1:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={volume:g},afade=t=in:d=1.2,afade=t=out:st={max(0.0, length - 2):.2f}:d=2[bed];'
               f'[0:a]asplit=2[talk][key];[bed][key]sidechaincompress=threshold=0.01:ratio=10:attack=20:release=500[ducked];'
               f'[talk][ducked]amix=inputs=2:duration=first:normalize=0[a]')
        command = ['ffmpeg', '-y', '-loglevel', 'error', '-i', joined, '-stream_loop', '-1', '-i', os.path.join(base, music), '-filter_complex', mix,
                   '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', f'{length:.3f}', output]
        if subprocess.run(command).returncode != 0: fail('FFmpeg could not mix the music in')

    # 5. Phụ đề .srt của cả phim: câu thoại của từng cảnh dời theo chỗ cảnh ấy bắt đầu trong phim (trừ phần chồng nhau
    #    của các chuyển cảnh).
    if film.get('subtitles', True):
        stamp = lambda t: f'{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(round(t % 1 * 1000)) % 1000:03d}'
        entries, start = [], 0.0
        for index, (lines, part) in enumerate(zip(speech, parts)):
            for line in lines: entries.append((start + float(line['start']), start + float(line['end']), str(line['text'])))
            start += part[4] - blend
        srt = os.path.splitext(output)[0] + '.srt'
        with open(srt, 'w', encoding='utf-8') as handle:
            for number, (begin, end, text) in enumerate(entries, 1): handle.write(f'{number}\n{stamp(begin)} --> {stamp(end)}\n{text}\n\n')
        print(srt)
    poster = film.get('poster', 1.0)
    if poster is not False:
        cover = os.path.splitext(output)[0] + '.jpg'
        if subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{float(poster):g}', '-i', output, '-frames:v', '1', '-q:v', '2', cover]).returncode == 0: print(cover)
    total = probe(output)[2]
    print(output)
    print(f'  {len(parts)} scenes, {kind} transitions, {total:.1f} s')


if __name__ == '__main__':
    main()
