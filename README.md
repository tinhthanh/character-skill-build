# character-skill-build

An agent skill for **building custom 2D characters** and **reusing them in
[HyperFrames](https://github.com/heygen-com/hyperframes) videos**.

![Six people, a dog and a cat built with the rig](docs/characters.png)

Characters are 100% SVG, animated with GSAP. A character is a small JavaScript definition
on top of a shared skeleton, so every new character can already wave, talk, point, walk in,
walk out and a dozen other things. A dog and a cat come with their own actions (wag, bark,
beg; meow, stretch, hiss…).

- **`SKILL.md`** — instructions an AI agent follows to create a character from a brief,
  verify it, and place it in a composition.
- **`runtime/`** — the rig library (ES modules).
- **`dist/character.iife.js`** — the same library as one plain-script file for HyperFrames.
- **`studio/`** — a visual editor: presets, sliders, colour palettes, undo, per-character
  save.
- **`tools/`** — dev server, bundler, automated check, pose-sheet screenshots.

## Install as a skill

```bash
git clone https://github.com/tinhthanh/character-skill-build ~/.claude/skills/character-build
```

Any agent that reads `SKILL.md`-style skills can use it the same way; the skill is just this
folder.

## Try it

```bash
python3 tools/serve.py                 # http://127.0.0.1:8300/studio/
sh tools/check.sh                      # every character × every action, headless → PASS / FAIL
sh tools/shot.sh le_tan /tmp/le_tan.png   # pose sheet for one character
sh tools/peek.sh examples/hyperframes/index.html   # timings + contact sheet of a composition
```

Open `examples/hyperframes/index.html` through the dev server
(`http://127.0.0.1:8300/examples/hyperframes/`) to see a composition's markup; render it by
copying it and `dist/character.iife.js` into a HyperFrames project.

## A character in ten lines

```js
// characters/duoc_si.js — then add it to characters/index.js
export default {
  id: 'duoc_si',
  dua: 'bs_kinh',                                   // start from the doctor with glasses
  dinhNghia: (goc, kit) => ({
    ...goc,
    ten: 'Dược sĩ',
    mau: { ...goc.mau, aoTrong: '#2f9e8f', ongNghe: '#1f5f8f' },
    nghi: { batL: 10, batR: 10, cangL: -13, cangR: -13, cuoi: 0.9 },   // arms down, smiling
  }),
};
```

`references/slots.md` documents every slot, coordinate system and required element id.

## Requirements

Python 3 for the tools. Chrome or Chromium for `check.sh` / `shot.sh`. GSAP 3 is loaded from
a CDN by the pages here and by HyperFrames compositions. No Node, no bundler.

## Notes

- Code identifiers, code comments and the studio UI are in Vietnamese; `SKILL.md` and the
  references are in English and include a glossary.
- Verified with the HyperFrames CLI 0.9.52: `examples/hyperframes/index.html` passes
  `hyperframes lint` and `hyperframes check` with no errors and renders to a 15 s, 1920 × 1080,
  30 fps MP4 on six parallel workers with no discontinuity at worker boundaries. `check`
  reports one heuristic layout warning (`off_pivot_rotation`) that mistakes a forearm for a
  gauge needle; it can be ignored.

---

## Tiếng Việt

Skill hướng dẫn AI agent **tạo nhân vật 2D tuỳ chỉnh** (SVG thuần, GSAP điều khiển) và
**dùng lại nhân vật trong video HyperFrames**. Mỗi nhân vật là một tệp định nghĩa nhỏ trong
`characters/`, thừa hưởng bộ xương và 19 động tác có sẵn. Kèm chó và mèo với bộ động tác riêng.

```bash
python3 tools/serve.py        # mở studio: http://127.0.0.1:8300/studio/
sh tools/check.sh             # kiểm mọi nhân vật × mọi động tác
python3 tools/build.py        # dựng lại dist/character.iife.js cho HyperFrames
```

Quy trình tạo nhân vật nằm trong `SKILL.md`; bảng slot và toạ độ ở `references/slots.md`.
