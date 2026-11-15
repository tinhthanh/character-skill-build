# character-skill-build

An agent skill for **building custom 2D characters** and **reusing them in
[HyperFrames](https://github.com/heygen-com/hyperframes) videos**.

![Thirteen people and five pets built with the rig](docs/characters.png)

Characters are 100% SVG, animated with GSAP. A character is a small JavaScript definition
on top of a shared skeleton, so every new character can already wave, talk, point, sit,
react, walk in, walk out and a dozen other things. Dogs and cats come with their own
actions (wag, bark, beg; meow, stretch, hiss…), five breeds and adjustable body shape.

What a definition can say, beyond face, hair and colours:

- **Clothes** — ready-made outfits (`scrubs`, `pawTunic`, `coat`, `plainCoat`, `tee`, `shirt`,
  `dress`, `hoodie`, `suit`), a `skirt` or apron that follows the legs, glasses, beards, wrinkles.
- **Hair and build without drawing** — eleven ready-made hairstyles (`kit.hair.bob()`,
  `ponytail`, `curly`, `spiky`…) and body presets (`kit.bodies.child`, `teen`, `tall`, `stocky`).
- **Things in the hand** — `heldItemL` / `heldItemR` (cup, clipboard, phone, or your own SVG);
  the hand keeps its grip and one-handed gestures switch to the free hand.
- **Posture** — `stoop` for a bent back, `backHair` for bald heads, one-armed rest poses.

And what a scene can do with them:

- **Hold a stance** — `sitDown`, `standUp`, `face(otherCharacter)`: a character speaks,
  nods and waves while seated or turned toward someone. Pets do the same.
- **Furniture** — `createProp(host, 'chair' | 'stool' | 'table' | 'counter', { for: rig })`
  draws props that line up with a seated character.
- **Conversations** — one sequence per character, lines taking turns;
  `examples/conversation/` is a complete two-person scene.
- **Voice and camera** — `tools/cues.py voice.wav` turns a voice file into mouth cues for
  `speakCues` (Rhubarb when installed, loudness otherwise); `shot(scene, rig, 'face')` pushes
  the camera in. `examples/voiceover/` shows both.

- **`SKILL.md`** — instructions an AI agent follows to create a character from a brief,
  verify it, and place it in a composition.
- **`runtime/`** — the library (ES modules) with an English API.
- **`dist/character.slim.js`** — the same library as one plain-script file for HyperFrames,
  with the tuned configs baked in.
- **`studio/`** — a visual editor: presets, sliders, colour palettes, undo, per-character save.
- **`tools/`** — dev server, bundler, automated check, pose-sheet and composition previews.

## Install as a skill

```bash
git clone https://github.com/tinhthanh/character-skill-build ~/.claude/skills/character-build
```

Any agent that reads `SKILL.md`-style skills can use it the same way; the skill is just this
folder.

## Try it

```bash
python3 tools/serve.py                          # http://127.0.0.1:8300/studio/
sh tools/check.sh                               # every character × every action, headless → PASS / FAIL
sh tools/shot.sh receptionist /tmp/sheet.png    # pose sheet for one character
sh tools/peek.sh examples/conversation/index.html  # timings + contact sheet of a composition
sh tools/gallery.sh /tmp/all.png                # every registered character in one picture
sh tools/lint-examples.sh                       # hyperframes lint on every example (needs Node)
```

## A character in a dozen lines

```js
// characters/pharmacist.js — then add it to characters/index.js
export default {
  id: 'pharmacist',
  base: 'surgeon',                                   // his head and proportions
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.plainCoat,                        // long-sleeved coat (no stethoscope) instead of scrubs
    name: 'Pharmacist',
    hat: () => '',                                   // drop the inherited surgical cap
    faceExtras: (p, c) => kit.parts.roundGlasses(c),
    beard: (p, c) => kit.parts.shortBeard(c),
    colors: { ...base.colors, hair: '#8d9199', top: '#f6f7f9', topShadow: '#c9d0d9', innerShirt: '#2f9e8f' },
    restPose: { upperArmL: 10, upperArmR: 10, forearmL: -13, forearmR: -13, smile: 0.9 },
  }),
};
```

`references/slots.md` documents every key, coordinate system and required element id.

## In a HyperFrames composition

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
<script src="character.slim.js"></script>
<script>
  VGCharacter.seed(7);
  const rig = VGCharacter.createCharacter(document.getElementById('presenter'), { id: 'pharmacist' }).rig;
  const act = VGCharacter.sequence(rig, ['enter', 'wave', ['explain', 'Xin chào!', 2.4], ['express', 'happy']]);
  const tl = gsap.timeline({ paused: true });
  tl.add(act.paused(false), 0);
  window.__timelines = { ...(window.__timelines || {}), 'my-composition': tl };
</script>
```

## Requirements

Python 3 for the tools. Chrome or Chromium for `check.sh` / `shot.sh` / `peek.sh`. GSAP 3 is
loaded from a CDN by the pages here and by HyperFrames compositions. No Node and no bundler
are needed to build or check characters; only `tools/lint-examples.sh` (and HyperFrames
itself) uses Node.

## Notes

- The public API, the definition and config schemas are English. The two rig files keep
  Vietnamese internal names and comments, and the studio UI is in Vietnamese;
  `runtime/schema.js` is the dictionary between the two.
- Verified with the HyperFrames CLI 0.9.52: both examples pass `hyperframes lint` (run in CI
  on every push) and render to 1920 × 1080 MP4s — `examples/hyperframes` 17 s,
  `examples/conversation` 19 s.
- See `CHANGELOG.md` for what changed between versions.
- Licensed under the MIT License (`LICENSE`). GSAP is loaded from a CDN and is not part of this
  repository; it has its own licence.

---

## Tiếng Việt

Skill hướng dẫn AI agent **tạo nhân vật 2D tuỳ chỉnh** (SVG thuần, GSAP điều khiển) và
**dùng lại nhân vật trong video HyperFrames**. Mỗi nhân vật là một tệp định nghĩa nhỏ trong
`characters/`, thừa hưởng bộ xương và 22 động tác có sẵn. Kèm chó, mèo (năm giống) với bộ
động tác riêng và hình dáng chỉnh được.

Nhân vật mặc được váy / tạp dề, cầm đồ vật (cốc, bìa hồ sơ, điện thoại), có dáng còng; trong
cảnh thì ngồi xuống, quay về phía nhau và nói chuyện luân phiên (`sitDown`, `face`), có sẵn
ghế, bàn, quầy (`createProp`). Ví dụ hai người nói chuyện: `examples/conversation/`.

```bash
python3 tools/serve.py        # mở studio: http://127.0.0.1:8300/studio/
sh tools/check.sh             # kiểm mọi nhân vật × mọi động tác
python3 tools/build.py        # dựng lại dist/ cho HyperFrames (nướng luôn configs/)
```

Quy trình tạo nhân vật nằm trong `SKILL.md`; bảng khoá và toạ độ ở `references/slots.md`.
