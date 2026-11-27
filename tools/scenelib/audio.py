"""Voice lines (voice-tts), audio lengths and the per-action sound clips."""
import hashlib, os, re, shutil, subprocess
from .assets import copy_asset
from .util import fail, slug


def audio_length(path):
    """Độ dài (giây) của một tệp tiếng: WAV đọc thẳng, dạng khác hỏi ffprobe; không đo được thì 1 s."""
    try:
        import wave
        with wave.open(path) as clip: return clip.getnframes() / clip.getframerate()
    except Exception: pass
    try:
        done = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True)
        return float(done.stdout.strip())
    except Exception: return 1.0


def place_sounds(html, timings, sounds, base, out, copied):
    """Một clip <audio> cho mỗi lần một động tác có trong "sounds" diễn — đúng lúc nó bắt đầu. Khoá "who.action" thắng
    khoá "action". Mỗi clip một rãnh riêng (hai tiếng sủa gối nhau vẫn kêu đủ)."""
    if not sounds: return html, 0
    track = max([int(n) for n in re.findall(r'data-track-index="(\d+)"', html)] + [0]) + 1
    clips = []
    for number, action in enumerate(timings.get('actions', [])):
        spec = sounds.get(f"{action['who']}.{action['name']}") or sounds.get(action['name'])
        if not spec: continue
        name = copy_asset(base, out, spec['file'], copied)
        start, length = float(action['start']) + float(spec.get('at', 0)), audio_length(os.path.join(out, name))
        clips.append(f'  <audio id="sound-{len(clips) + 1}" class="clip" src="{name}" data-start="{start:.2f}" data-duration="{length:.2f}" data-track-index="{track + len(clips)}" data-volume="{float(spec.get("volume", 1)):g}"></audio>')
    if not clips: return html, 0
    marker = '\n\n  <script src="gsap.min.js'
    if marker not in html: marker = '\n\n  <script src="https://cdn.jsdelivr.net/npm/gsap'      # composition dựng trước đợt 27
    if marker not in html: fail('could not place the "sounds" clips (the composition has no gsap <script> after its clips)')
    return html.replace(marker, '\n  <!-- "sounds": one clip each time the action plays -->\n' + '\n'.join(clips) + marker, 1), len(clips)


def speak_line(base, who, voice, words, where):
    """Make (once) the voice file of one spoken line with the `voice-tts` command and return its path
    relative to the scene file. The file name carries a hash of the voice and the words, so a line is
    synthesised again only when either changes — TTS output differs from run to run, and a voice that
    changed under a finished scene would move every lip-sync cue and every start time."""
    digest = hashlib.sha256(f'{voice}\n{words}'.encode('utf-8')).hexdigest()[:8]
    relative = os.path.join('voice', f'{slug(who)}-{digest}.wav')
    target = os.path.join(base, relative)
    if os.path.isfile(target): return relative
    program = os.environ.get('VOICE_TTS') or shutil.which('voice-tts') or (os.path.expanduser('~/.local/bin/voice-tts') if os.path.isfile(os.path.expanduser('~/.local/bin/voice-tts')) else None)
    if not program:
        fail(f'{where}: "voice" needs the voice-tts command (Vietnamese text-to-speech), which is not installed.\n'
             '  Install:  uv tool install "git+https://github.com/tinhthanh/voice-process#subdirectory=tts"  &&  voice-tts download-models\n'
             '  Or give the line an "audio" file of your own, or drop "voice" to estimate the mouth from the text.')
    os.makedirs(os.path.dirname(target), exist_ok=True)
    done = subprocess.run([program, 'say', words, '-v', voice, '-o', target, '--sample-rate', '24000'], capture_output=True, text=True)
    if done.returncode != 0 or not os.path.isfile(target):
        fail(f'{where}: voice-tts could not speak this line with voice "{voice}":\n  ' + (done.stderr.strip() or done.stdout.strip() or 'no message').splitlines()[-1] + '\n  (voices: run `voice-tts voices`)')
    print(f'  voice: {relative}  ({voice})')
    return relative
