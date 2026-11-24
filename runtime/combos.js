// COMBO — CẢNH NHỎ DỰNG SẴN (đợt 37): một tên gọi cho cả một chuỗi động tác đã có.
//
//   sequence(vet, [['fullCheckup', dog]])          → listen, examine tai, examine răng, takeTemp, readChart
//   conversation(combo(vet, 'fullCheckup', dog))   → như trên, và con chó há miệng đúng lúc soi răng
//   scene.json: { "who": "vet", "do": [["fullCheckup", "@cho"]] }   → mỗi bước một lượt (máy quay, con vật đáp lại…)
//
// Mỗi combo: `params` (tên tham số theo thứ tự), `steps` (bước như trong `sequence()`, "$tên" là chỗ của tham số) và
// `vi` (cách nói trong kịch bản chữ, tools/script.py). Một bước có thể là { "step": [...], "with": { "$pet": [ bước… ] } }:
// nhân vật kia diễn CÙNG LÚC (con vật há miệng khi soi răng). `sequence()` chỉ dựng phần của chính nhân vật; `combo()`,
// tools/scene.py và tools/script.py dựng cả phần kia. Tham số không truyền: bước bỏ nó và các đối số sau nó.
//
// Khối giữa hai dòng BEGIN / END là JSON thuần — tools/scene.py và tools/script.py đọc thẳng nó (một bảng cho cả ba nơi).
// BEGIN COMBOS
export const COMBOS = {
  "greetCustomer": {
    "params": [],
    "about": "welcome someone: wave, bow, then a hand on the chest — \"welcome, I am…\"",
    "steps": ["wave", "bow", "introduce"],
    "vi": ["chào khách", "đón khách", "chào đón"]
  },
  "fullCheckup": {
    "params": ["pet"],
    "about": "a whole check-up: stethoscope, ears, teeth (the pet opens its mouth), temperature, then read the chart and nod",
    "steps": [
      ["listen", "$pet"],
      ["examine", "$pet", "ears"],
      { "step": ["examine", "$pet", "teeth"], "with": { "$pet": [["openMouth", 2.2]] } },
      ["takeTemp", "$pet"],
      "readChart"
    ],
    "vi": ["khám tổng quát", "khám tổng thể", "khám toàn diện", "khám sức khoẻ", "khám sức khỏe"]
  },
  "vaccinationVisit": {
    "params": ["pet", "scale"],
    "about": "a vaccination: weigh the pet, inject (held syringe), put the syringe away, give a treat, thumbs up",
    "steps": [
      ["weigh", "$pet", "$scale"],
      ["inject", "$pet"],
      "hideItem",
      ["giveTreat", "$pet"],
      "thumbsUp"
    ],
    "vi": ["tiêm phòng", "tiêm ngừa", "chích ngừa", "tiêm vắc-xin", "tiêm vaccine"]
  },
  "goodNews": {
    "params": [],
    "about": "hearing good news: a relieved breath, thumbs up, a cheer",
    "steps": ["relief", "thumbsUp", "cheer"],
    "vi": ["tin vui", "báo tin vui", "mừng rỡ", "mừng quá"]
  },
  "badNews": {
    "params": [],
    "about": "giving or hearing bad news: worried hands, a sad face, a slow nod",
    "steps": ["worry", ["express", "sad", 1.4], "nod"],
    "vi": ["tin buồn", "báo tin buồn", "buồn bã"]
  },
  "waitingImpatient": {
    "params": [],
    "about": "waiting too long: check the watch, look around, fold the arms",
    "steps": ["checkWatch", "lookAround", ["crossArms", 1.6]],
    "vi": ["sốt ruột", "sốt ruột chờ", "chờ lâu", "đợi lâu", "nóng ruột"]
  },
  "dischargePet": {
    "params": ["pet", "owner"],
    "about": "send a pet home: pick it up, hand it to the owner, count off three instructions, wave goodbye",
    "steps": [
      ["carry", "$pet"],
      ["handOverPet", "$owner"],
      ["countFingers", 3],
      "wave"
    ],
    "vi": ["trả thú", "trả về", "giao thú", "xuất viện", "trả bé về"]
  }
};
// END COMBOS

const isPlaceholder = (value) => typeof value === 'string' && /^\$[A-Za-z_]\w*$/.test(value);

/** Thay "$tên" trong một bước bằng giá trị thật; tham số không có → bỏ nó và mọi đối số sau nó. */
function fill(step, values) {
  const parts = Array.isArray(step) ? step : [step];
  const out = [];
  for (const part of parts) {
    if (isPlaceholder(part)) {
      const value = values[part.slice(1)];
      if (value === undefined || value === null) break;
      out.push(value);
    } else out.push(part);
  }
  return Array.isArray(step) ? out : out[0];
}

/** Các giá trị tham số của combo `name` theo tên. Ném lỗi nếu thiếu tham số bắt buộc (mọi tham số trừ cái cuối có thể bỏ). */
function bind(name, args) {
  const combo = COMBOS[name];
  const values = {};
  combo.params.forEach((param, n) => { values[param] = args[n]; });
  // Tham số dùng làm ĐÍCH đầu tiên của một bước (con vật, người nhận) là bắt buộc.
  for (const raw of combo.steps) {
    const step = raw && !Array.isArray(raw) && typeof raw === 'object' ? raw.step : raw;
    if (Array.isArray(step) && isPlaceholder(step[1]) && (values[step[1].slice(1)] === undefined || values[step[1].slice(1)] === null)) {
      throw new Error(`[character] combo "${name}" needs ${combo.params.map((p) => `"${p}"`).join(', ')} — missing "${step[1].slice(1)}"`);
    }
  }
  return values;
}

export const isCombo = (name) => typeof name === 'string' && Object.prototype.hasOwnProperty.call(COMBOS, name);

/** Các bước của CHÍNH nhân vật làm combo (phần "with" của nhân vật khác bị bỏ) — `sequence()` dùng. */
export function expandCombo(name, args = []) {
  if (!isCombo(name)) throw new Error(`[character] no combo "${name}" (available: ${Object.keys(COMBOS).join(', ')})`);
  const values = bind(name, args);
  return COMBOS[name].steps.map((raw) => fill(raw && !Array.isArray(raw) && typeof raw === 'object' ? raw.step : raw, values));
}

/**
 * Combo thành các LƯỢT của `conversation()`: mỗi bước một lượt `[rig, bước]`, bước có "with" thành
 * `{ together: [[rig, bước], [nhân vật kia, …bước của nó]] }`.
 *
 *   conversation([...combo(vet, 'fullCheckup', dog), [vet, ['explain', 'Bé khoẻ lắm!', 2]]])
 */
export function combo(rig, name, ...args) {
  if (!isCombo(name)) throw new Error(`[character] no combo "${name}" (available: ${Object.keys(COMBOS).join(', ')})`);
  const values = bind(name, args);
  return COMBOS[name].steps.map((raw) => {
    if (raw && !Array.isArray(raw) && typeof raw === 'object') {
      const together = [[rig, fill(raw.step, values)]];
      for (const [key, steps] of Object.entries(raw.with || {})) {
        const other = values[key.slice(1)];
        if (other) together.push([other, ...steps.map((step) => fill(step, values))]);
      }
      return together.length > 1 ? { together } : together[0];
    }
    return [rig, fill(raw, values)];
  });
}
