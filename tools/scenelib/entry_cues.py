"""Phase 4 steps: what an entry switches on screen and in the set besides the turn itself — the presenter panel ("show"), a screen
notification ("popup"), lamps, power, the sky, a notification card ("toast")."""
import os
from .schema import SCREEN_KINDS, SHOW_KEYS
from .util import fail, js, known


def collect_shows(base, entry, flat, layout, shows, where):
    """Bảng nội dung của người dẫn (`"show"`, layout presenter): tiêu đề, gạch đầu dòng, ảnh — hay false để xoá bảng."""
    for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
        if not isinstance(turn, dict) or 'show' not in turn: continue
        show = turn['show']
        if layout != 'presenter': fail(f'{where}: "show" needs "layout": "presenter" at the top of the scene file')
        if show is False or show is None: shows.append({'turn': flat, 'clear': True}); continue
        if not isinstance(show, dict) or not show: fail(f'{where}: "show" must be an object with "title", "bullets" and / or "image", or false to clear the panel')
        known(f'{where}.show', show, SHOW_KEYS)
        if 'bullets' in show and (not isinstance(show['bullets'], list) or not all(isinstance(item, str) for item in show['bullets'])): fail(f'{where}: "show.bullets" must be a list of strings')
        if 'image' in show and not os.path.isfile(os.path.join(base, show['image'])): fail(f'{where}: show.image not found: {show["image"]} (looked in {base})')
        shows.append(dict(show, turn=flat))


def collect_popup(emitted, entry, popups, stage_set, where):
    """Thông báo trên màn hình đạo cụ (`"popup"`): màn hình / laptop quay ra người xem trong bối cảnh 3D, gọi theo tên."""
    # THÔNG BÁO TRÊN MÀN HÌNH đạo cụ (`"popup"`): màn hình để bàn / laptop quay ra người xem trong bối cảnh 3D, gọi theo tên.
    for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
        if not isinstance(turn, dict) or 'popup' not in turn: continue
        pop = turn['popup']
        if stage_set is None: fail(f'{where}: "popup" shows a notification on a screen in a 3D set — add "set" with a named "monitor" or "laptop" cutout')
        if not isinstance(pop, dict) or set(pop) - {'on', 'title', 'text', 'hold'} or not pop.get('on') or not (pop.get('title') or pop.get('text')):
            fail(f'{where}: "popup" is {{ "on": "<cutout name>", "title": "…", "text": "…", "hold": 2.5 }} — got {js(pop)}')
        cutouts = stage_set.get('cutouts', [])
        index = next((i for i, item in enumerate(cutouts) if item.get('name') == pop['on']), None)
        if index is None: fail(f'{where}: "popup" names "{pop["on"]}", but no set.cutouts entry has "name": "{pop["on"]}"')
        screen_item = cutouts[index]
        if screen_item.get('kind') not in SCREEN_KINDS or (screen_item['kind'] == 'laptop' and screen_item.get('facing') != 'viewer'):
            fail(f'{where}: "popup" needs a screen the viewer sees — "{pop["on"]}" must be a "monitor", or a "laptop" with "facing": "viewer"')
        popups.append({'turn': emitted[0], 'cutout': index + 1, 'title': pop.get('title', ''), 'text': pop.get('text', ''), 'hold': float(pop.get('hold', 2.5))})


def collect_lamps(emitted, entry, lamp_ops, names, stage_set, where):
    """Bật / tắt đèn (`"lamp"`): đúng lúc lượt này bắt đầu (người bật bằng tay: lúc tay chạm công tắc)."""
    # BẬT / TẮT ĐÈN (`"lamp"`): "on" / "off" (đèn đầu tiên), hay { "name": "…", "on": true, "dur": 0.6 } — đúng lúc lượt này bắt đầu.
    for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
        if not isinstance(turn, dict) or 'lamp' not in turn: continue
        if stage_set is None: fail(f'{where}: "lamp" switches a lamp of a 3D set — add "set" with "lamps" (or a "lamp" cutout)')
        spec = turn['lamp'] if isinstance(turn['lamp'], dict) else {'on': turn['lamp']}
        if spec.get('on') in ('on', 'off'): spec = dict(spec, on=spec['on'] == 'on')
        if not isinstance(spec, dict) or set(spec) - {'name', 'on', 'dur'} or spec.get('on') not in (True, False): fail(f'{where}: "lamp" is "on", "off" or {{ "name": "…", "on": true, "dur": 0.6 }} — got {js(turn["lamp"])}')
        # Người bật đèn bằng tay (lượt không lời, không động tác): đèn đổi đúng lúc tay chạm tới công tắc (~0,75 s).
        reach = turn['who'] in names and not names[turn['who']]['_pet'] and not turn.get('say') and not turn.get('do')
        lamp_ops.append({'turn': emitted[0], 'name': spec.get('name'), 'on': spec['on'], 'dur': float(spec.get('dur', 0.35 if reach else 0.6)), 'where': where, 'delay': 0.85 if reach else 0})


def collect_power_and_sky(emitted, entry, power_ops, sky_ops, stage_set, where):
    """Mất điện / có điện (`"power"`) và trời chuyển (`"sky"`)."""
    # MẤT ĐIỆN / CÓ ĐIỆN (`"power": "off" | "on"`): mọi đèn và màn hình tắt phụt / bật lại (chớp) cùng lúc.
    # TRỜI CHUYỂN (`"sky": "night"` hay { "to": "night", "dur": 6 }): nắng tắt dần, phòng tối dần, tới giờ lên đèn thì đèn tự bật.
    for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
        if not isinstance(turn, dict): continue
        if 'power' in turn:
            if stage_set is None: fail(f'{where}: "power" switches every lamp of a 3D set — add "set"')
            if turn['power'] not in ('on', 'off'): fail(f'{where}: "power" is "on" or "off" — got {js(turn["power"])}')
            power_ops.append({'turn': emitted[0], 'on': turn['power'] == 'on', 'where': where})
        if 'sky' in turn:
            if stage_set is None: fail(f'{where}: "sky" changes the light of a 3D set — add "set"')
            spec = turn['sky'] if isinstance(turn['sky'], dict) else {'to': turn['sky']}
            if not isinstance(spec, dict) or set(spec) - {'to', 'dur'} or spec.get('to') not in ('day', 'evening', 'night'): fail(f'{where}: "sky" is "day", "evening", "night" or {{ "to": "night", "dur": 6 }} — got {js(turn["sky"])}')
            sky_ops.append({'turn': emitted[0], 'to': spec['to'], 'dur': float(spec.get('dur', 6))})


def collect_toasts(emitted, entry, toasts, where):
    """Thẻ thông báo trên khung (`"toast"`), gắn với lượt của chính mục này."""
    # THẺ THÔNG BÁO trên khung (`"toast"`): gắn với lượt của chính mục này (sau các bước lại gần vừa chèn).
    for turn in (entry.get('together', []) if isinstance(entry, dict) and isinstance(entry.get('together'), list) else [entry]):
        if not isinstance(turn, dict) or 'toast' not in turn: continue
        note = turn['toast'] if isinstance(turn['toast'], dict) else {'title': turn['toast']}
        if not isinstance(note, dict) or not isinstance(note.get('title', ''), str) or not isinstance(note.get('text', ''), str) or set(note) - {'title', 'text'} or not (note.get('title') or note.get('text')):
            fail(f'{where}: "toast" is a string, or {{ "title": "…", "text": "…" }} — got {js(turn["toast"])}')
        toasts.append({'turn': emitted[0], 'title': note.get('title', ''), 'text': note.get('text', '')})
