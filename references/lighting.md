# Lighting — a guide for writing scenes

Everything here works in a 3D set (`"set"` in a scene file, or `bối cảnh:` in a script). The light is computed every
frame: characters walking past a lamp brighten and their shadows turn, and when the sky changes the whole room
changes with it. The code is in `runtime/lighting.js`; the moments it is checked on are in
[`tools/light_audit.py`](#checking-the-light).

Ready-to-run scripts: `examples/lighting/` — `python3 tools/script.py examples/lighting/dem-mat-dien.txt`.

## Time of day

| Script | Scene file | What you get |
|---|---|---|
| `ánh sáng: ngày` (default) | `"light": "day"` | even daylight, sunlit patches under windows, passing clouds |
| `ánh sáng: chiều` | `"light": "evening"` | warm, low sun: long shadows all one way, warm side and cool side on characters |
| `ánh sáng: tối` | `"light": "night"` | dark blue room and sky; lamps are the main light |
| `ánh sáng: chiều → tối` | `"light": "evening"` + `"sky"` on the middle turn | the sky darkens halfway through the scene and the lamps switch themselves on |

Turns that change the light in the middle of a scene:

| Script line | Scene file turn | |
|---|---|---|
| `bé: [trời tối dần]`, `[hoàng hôn]`, `[trời sáng]` | `"sky": "night"` or `{ "to": "night", "dur": 6 }` | the camera holds a wide shot (and pulls back slowly) until the lamps are on |
| `bà: [bật đèn]` / `[tắt đèn]` | `"lamp": "on"` / `"off"` | the lamp flickers on; the person walks to the switch if they say nothing |
| `bà: [mất điện]` / `[có điện]` | `"power": "off"` / `"on"` | every lamp and screen goes out at once / comes back one after the other |

![Evening to night in the park](img/lighting-evening-night.jpg)

*`chieu-cong-vien.txt`: long evening shadows; after nightfall the sky is dark, the street lamp lights a pool on the
grass.*

## Lamps, screens, windows

- **Lamps** come with the places: the floor lamp in `phòng khách`, street lamps in `công viên` and `đường phố`, an
  examining lamp over the table in `phòng khám`. Extra lamps: `"lamps": [{ "name", "x", "y", "z", "color",
  "power", "kind": "point" | "ceiling", "on" }]` in `"set"`.
- **Street lamps** at night throw a round pool of light on the ground; a character near one is brighter, with a
  faint glow of the lamp's colour round them, and a shadow pointing away from the lamp.
- **A TV** (`"tv"` cutout, in `phòng khách`) glows on the wall behind it in the colour of the picture, flickering
  with it, in the evening and at night.
- **Windows** (`"window": true` on a back-wall panel) light the room in the day: a sunlit patch on the floor, a
  shaft with dust, backlight on people standing in front of them. At night the glass is dark blue.

![Street lamps](img/lighting-street-lamps.jpg)

*A walk past two street lamps: darker between them, brighter next to one; the shadow turns as he passes.*

![TV glow](img/lighting-tv.jpg)

## Light in the hand

| Script | Scene file | |
|---|---|---|
| `bà → mèo: rọi đèn` | `["shine", "@meo"]` | a flashlight: a soft beam aimed at the pet on every frame, the pet lit and squinting, its shadow thrown away from the hand, a pool of light on the floor or wall in the dark |
| `bác sĩ → mèo: khám` | `["examine", "@meo", "teeth"]` | the examining light: a small glint and a hotspot on the pet, which squints |

![Power cut and a flashlight](img/lighting-power-cut.jpg)

*`dem-mat-dien.txt`: the power goes out, granny shines a flashlight at the cat.*

![Examining light](img/lighting-examine.jpg)

## Shadows and the look of the frame

- Every character and every piece of furniture casts a soft shadow under it and a long one away from each light:
  dark and sharp at the feet, paler and blurred towards the tail; a long shadow that reaches a wall climbs it.
- The floor reflects its colour onto legs and bellies (strongest in a patch of sunlight).
- The **lens layer** grades the colour by time of day, darkens the corners and adds film grain.
  `"lens": false` in `"set"` turns all of it off; `"grain": false` drops only the grain.
- **A film** (`tools/film.py`) adds the grain itself when it joins the parts (`"grain": "post"`, the default): the
  scenes render without their grain layer — about 25 % faster — and the film is several times smaller, with the
  same amount of grain. `"grain": "page"` keeps each scene's own layer, `"none"` leaves grain out.
- `"shading": false` in `"set"` turns off the light and shade on the characters' bodies.

## Tips

- In a vertical frame (`khung: dọc`) half the frame is above the walls: the sky changes with the time of day, so
  night scenes stay dark.
- Characters standing at different depths (granny on the sofa, the cat on the floor in front) are framed by where
  they appear on screen: a close shot of the cat either leaves granny out completely or takes her whole head in.
- A turn where someone walks cuts to a new shot after 1 s, so they do not walk out of the old one.

## Checking the light

`tools/scene.py` writes `moments.json` next to a 3D scene: the moments that matter for the light, each with
questions whose right answer is "yes". `python3 tools/light_audit.py <scene dirs…> -o audit/` captures them as
sheets and writes `audit/prompt.txt`; answer the questions (or hand the sheets and the prompt to a reviewer), then
`python3 tools/light_audit.py --score answers.json -o audit/`. A question about something not in the frame may be
answered `n/a`. `python3 tools/light_audit.py --report -o audit/` writes `audit/report.html`: each sheet with every
reviewer's answers (all `answers*.json`), failures in red, and the score history.

The same `moments.json` also holds the **acting** moments: every turn where a hand must reach something (stroke,
examine, give a treat, brush, listen, inject: the pet; hand over, handshake: the other person's hand) and every
walk, with questions for the reviewer and a `check` for the machine. `python3 tools/acting_check.py <scene dirs…>`
opens each scene, seeks to 30 / 50 / 70 % of those turns and measures: the hand must come within 6 % of the
person's height of the pet's head or body (or of the other hand), and feet must stay within 3 % of the floor.
It exits 1 on a miss — `tools/check_scene.py` runs it on a small clinic scene.

What the scene tool now does for the acting, so the measurements pass without extra script lines:

- A person **kneels** to stroke, feed, examine or brush a pet on the floor (standing, the hand only reaches its back).
- Someone already standing where a newcomer needs to be next to a pet **steps aside** first.
- `bác sĩ → bé: bắt tay` makes the other person **shake hands back**; they stand close enough for the short arms to
  meet, and the shot is a full one, so the hands are in it.
- In a vertical frame the living room is laid out tighter (shorter sofa, TV nearer), so a full shot holds both.
- `bé → ông: đưa` (`handOver`) makes the other person **take** it at the same time (when they have the item put
  away), and `trao` (`handOverPet`) adds the other's `takePet`; both reach for the point between their shoulders, like a
  handshake, and the item sits in the hand on the receiver's side.
- A pet walks over to a **seated** person who strokes or picks it up; the hand aims at where the pet stands then.
  `acting_check` also measures that a carried pet is in the arms and that a seated person sits on the seat
  (within 3 % of their height of the top of the sofa / bench).

## One side brighter

The light on a character's body comes from one side: the half facing the main light (a lamp, the window, the sun) is
brighter — warmed by it in daylight — and the other half darker and cooler. `python3 tools/light_side.py <scene dirs…>`
measures it on the opening frame (where the reviewer is asked): it captures the frame, the frame without the
characters (to find their pixels) and the frame without the body shading, and compares the brightness of the two
halves of each person's head and upper body. The half facing the light must be at least 8 % brighter (or the shading
must add 8 %). Backlit people (a bright window or lamp behind at least 20 % of their head and upper body) and people at night with no lamp near are reported but not
judged. `--all` measures at the acting moments too.
