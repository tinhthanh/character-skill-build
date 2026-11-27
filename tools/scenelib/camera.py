"""Camera limits and speeds of a 3D set, the check of a view, the close-shot fill of a pet in a group view."""
from .actions import PET_CLOSE, PET_CLOSE_FILL, PET_CLOSE_FILLS
from .util import fail


def pet_group_fill(entry):
    """ĐỢT 42 A: `fill` cho góc cận một con thú trong nhóm `together` có "view": theo động tác của chính con thú ấy (cùng bảng như góc tự động của lượt riêng)."""
    who = (entry.get('view') or {}).get('on', [None])[0]
    acts = [step if isinstance(step, str) else step[0] for turn in entry.get('together', []) if isinstance(turn, dict) and turn.get('who') == who
            for step in turn.get('do') or [] if isinstance(step, (str, list)) and step]
    known_acts = [name for name in acts if name in PET_CLOSE]
    if not known_acts: return None
    fills = [PET_CLOSE_FILLS[name] if name in PET_CLOSE_FILLS else 0.9 if name in ('playBow', 'dig', 'carryToy') else 0.74 if name == 'rollOver' else 0.7 if name in ('chaseTail', 'bark') else 0.66 if name == 'lick' else PET_CLOSE_FILL for name in known_acts]
    return max(fills)


# Tốc độ lia dễ chịu (mỗi giây) — vượt quá thì hình dời quá xa mỗi khung, ở 30 khung/giây mắt thấy giật cục.
CAMERA_SPEED = {'x': 220, 'y': 160, 'z': 220, 'yaw': 18, 'pitch': 8, 'distance': 420, 'zoom': 0.4}
CAMERA_START = {'yaw': 0, 'pitch': 6, 'distance': 1700, 'x': 0, 'y': 300, 'z': -350, 'zoom': 1}   # máy mặc định của createSet (runtime/set3d.js, `base`)
# Giới hạn máy quay — giống LIMITS trong runtime/set3d.js: chúc cao hơn thì nhân vật lộ là tấm bìa dựng trên sàn,
# vòng xa hơn thì không có mặt sau để xoay tới.
PITCH_LIMITS, YAW_LIMIT, NORMAL_LENS = (-8, 15), 60, 1700


def check_camera(values, where):
    if 'pitch' in values and not PITCH_LIMITS[0] <= values['pitch'] <= PITCH_LIMITS[1]:
        fail(f'{where}: pitch {values["pitch"]} is outside {PITCH_LIMITS[0]}…{PITCH_LIMITS[1]}° — from higher up the characters read as cards standing on the floor. For a view of the whole room use "wide": true')
    if 'yaw' in values and abs(values['yaw']) > YAW_LIMIT:
        fail(f'{where}: yaw {values["yaw"]} is beyond ±{YAW_LIMIT}° — the characters have no back to show')
    if 'lens' in values and values['lens'] < 400: fail(f'{where}: lens {values["lens"]} is too short (at least 400)')
    if 'blur' in values and not 0 <= values['blur'] <= 30: fail(f'{where}: blur {values["blur"]} must be within 0…30')
