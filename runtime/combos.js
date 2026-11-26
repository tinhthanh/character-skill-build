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
  },
  "bathTime": {
    "params": ["pet"],
    "about": "bath time: bath the pet standing in its tub (shower, lather, rinse — it shakes off), towel it dry, thumbs up (the tub needs to stand raised — on a table; a stroke at the end would hide the pet's head behind the person)",
    "steps": [
      ["bathPet", "$pet"],
      ["towelDry", "$pet"],
      "thumbsUp"
    ],
    "vi": ["tắm cho thú", "tắm cho bé cưng", "tắm rửa cho thú"]
  },
  "floorCuddle": {
    "params": ["pet"],
    "about": "a cuddle on the floor: sit down cross-legged, stroke the pet (it comes over), take it onto the lap",
    "steps": [
      "sitOnFloor",
      ["stroke", "$pet"],
      ["carry", "$pet"]
    ],
    "vi": ["ngồi bệt ôm thú", "ôm thú vào lòng", "ngồi ôm thú"]
  },
  "napWithPet": {
    "params": ["pet"],
    "about": "a nap with the pet: lie down on the sofa and fall asleep while the pet lies down and sleeps beside",
    "steps": [
      { "step": ["lieDown", "sofa", { "sleep": true }], "with": { "$pet": [["sleep", 3]] } }
    ],
    "vi": ["ngủ trưa cùng thú", "nằm nghỉ cùng thú", "ngủ cùng thú"]
  },
  "welcomeHome": {
    "params": ["pet"],
    "about": "coming home: wave, kneel while the pet rears up to greet, stroke it while it wags",
    "steps": [
      "wave",
      { "step": "kneel", "with": { "$pet": [["greet", 1.4]] } },
      { "step": ["stroke", "$pet"], "with": { "$pet": ["wagTail"] } }
    ],
    "vi": ["về nhà", "chào thú khi về nhà", "đi làm về"]
  },
  "playFetch": {
    "params": ["pet"],
    "about": "play fetch: throw a ball to the right while the dog (facing right) runs after it and brings it back, stroke it, thumbs up",
    "steps": [
      { "step": ["throwBall", "right"], "with": { "$pet": [["fetch", 260]] } },
      ["stroke", "$pet"],
      "thumbsUp"
    ],
    "vi": ["chơi ném bóng", "chơi đón bóng", "ném bóng cho chó"]
  },
  "danceWithKid": {
    "params": ["kid"],
    "about": "dance with a child: both turn to the viewer and dance at the same time, settle a moment, then a high five",
    "steps": [
      { "step": ["face", "front"], "with": { "$kid": [["face", "front"]] } },
      { "step": ["dance", "happy", 2], "with": { "$kid": [["dance", "happy", 2]] } },
      ["idle", 0.6],
      ["highFive", "$kid"]
    ],
    "vi": ["nhảy cùng bé", "quẩy cùng bé", "nhảy múa cùng bé"]
  },
  "tidyToys": {
    "params": [],
    "about": "tidy up the toys: pick a toy up from the floor, put it away (whichever hand took it), nod",
    "steps": ["pickUp", ["hideItem", "both"], "nod"],
    "vi": ["dọn đồ chơi", "cất đồ chơi", "dọn dẹp đồ chơi"]
  },
  "groomingSession": {
    "params": ["pet"],
    "about": "a grooming session: trim the nails, put eye drops in, clean the ear, then a thumbs up (a final stroke leaves the pet half hidden behind the person when it stands on the exam table)",
    "steps": [
      ["clipNails", "$pet"],
      ["eyeDrops", "$pet"],
      ["cleanEars", "$pet"],
      "thumbsUp"
    ],
    "vi": ["chăm sóc tổng hợp", "spa thú cưng", "làm đẹp cho thú"]
  },
  "prepForExam": {
    "params": [],
    "about": "get ready to examine: wash the hands, put on gloves (they stay on afterwards)",
    "steps": [["washHands", 2], "putOnGloves"],
    "vi": ["chuẩn bị khám", "rửa tay đeo găng", "rửa tay mang găng"]
  },
  "assistedVaccination": {
    "params": ["pet", "nurse"],
    "about": "a vaccination with a helper: wash hands, gloves on, inject while the nurse holds the pet (restrain at the same time), gloves off, a treat",
    "steps": [
      ["washHands", 2],
      "putOnGloves",
      { "step": ["inject", "$pet"], "with": { "$nurse": [["restrain", "$pet"]] } },
      "takeOffGloves",
      ["giveTreat", "$pet"]
    ],
    "vi": ["tiêm có người giữ", "tiêm có phụ tá giữ", "tiêm có y tá giữ"]
  },
  "checkoutCounter": {
    "params": ["customer"],
    "about": "the cashier's side of paying: the customer scans the QR code while the cashier waits, change is handed back, the loyalty card is stamped, a wave",
    "steps": [
      { "step": ["idle", 2.6], "with": { "$customer": [["payByQR"]] } },
      ["giveChange", "$customer"],
      "stampCard",
      "wave"
    ],
    "vi": ["thanh toán tại quầy", "tính tiền tại quầy", "thu ngân tính tiền"]
  },
  "farewellOwner": {
    "params": ["owner"],
    "about": "see an owner off: hand over the medicine bag, a pat on the shoulder, a wave",
    "steps": [
      ["handOverBag", "$owner"],
      ["patShoulder", "$owner"],
      "wave"
    ],
    "vi": ["tiễn khách", "dặn dò ra về", "tiễn chủ về"]
  },
  "celebrateWithKid": {
    "params": ["kid"],
    "about": "celebrate with a child: a high five, a cheer, a thumbs up",
    "steps": [
      ["highFive", "$kid"],
      "cheer",
      "thumbsUp"
    ],
    "vi": ["ăn mừng cùng bé", "ăn mừng với bé", "mừng với bé"]
  },
  "happyDog": {
    "params": [],
    "about": "a happy dog: a play bow, a wag, then trots off with a toy and drops it",
    "steps": [["playBow", 1.2], "wagTail", ["carryToy", 120]],
    "vi": ["chó vui", "chó vui vẻ", "chó rủ chơi"]
  },
  "cozyCat": {
    "params": [],
    "about": "a relaxed cat: washes its face, settles into a loaf, slow-blinks",
    "steps": [["groomFace", 3], ["loaf", 2], ["slowBlink", 1]],
    "vi": ["mèo thư giãn", "mèo thảnh thơi", "mèo lim dim"]
  },
  "happyBunny": {
    "params": [],
    "about": "a happy rabbit: a binky leap, stands up to look around, twitches its nose",
    "steps": [["binky", 2], ["periscope", 1.6], ["noseTwitch", 1.6]],
    "vi": ["thỏ vui", "thỏ vui vẻ", "thỏ tung tăng"]
  },
  "dispenseMedicine": {
    "params": ["customer"],
    "about": "the pharmacist hands out medicine: reads the prescription (held clipboard), counts off the doses, hands the medicine bag over, waves",
    "steps": [
      "readChart",
      ["countFingers", 3],
      ["handOverBag", "$customer"],
      "wave"
    ],
    "vi": ["phát thuốc", "giao thuốc", "bán thuốc"]
  },
  "newPatientCheckIn": {
    "params": ["pet", "owner"],
    "about": "check in a new patient: wave (the owner waves back at the same time), a bow, scan the pet's microchip, read the new record (held clipboard)",
    "steps": [
      { "step": "wave", "with": { "$owner": ["wave"] } },
      "bow",
      ["scanChip", "$pet"],
      "readChart"
    ],
    "vi": ["tiếp nhận thú mới", "đăng ký khám", "nhận bệnh mới"]
  },
  "dentalCare": {
    "params": ["pet"],
    "about": "dental care: look at the teeth (the pet opens its mouth at the same time), brush them, thumbs up (no treat: after brushing, and a treat walk back to the front would hide the pet)",
    "steps": [
      { "step": ["examine", "$pet", "teeth"], "with": { "$pet": [["openMouth", 2.2]] } },
      ["brushTeeth", "$pet"],
      "thumbsUp"
    ],
    "vi": ["chăm sóc răng", "vệ sinh răng", "chăm sóc răng miệng"]
  },
  "comfortOwner": {
    "params": ["owner"],
    "about": "comfort a worried owner: a sad, sympathetic face (the owner wipes tears at the same time), a pat on the shoulder, a hug",
    "steps": [
      { "step": ["express", "sad", 1.6], "with": { "$owner": ["wipeTears"] } },
      ["patShoulder", "$owner"],
      ["hug", "$owner"]
    ],
    "vi": ["an ủi chủ", "động viên chủ nuôi", "động viên chủ"]
  },
  "fullSpa": {
    "params": ["pet"],
    "about": "a full spa: bath (the pet stands in a tub — \"inTub\": true), towel-dry, brush the teeth, clean the ears, thumbs up (no nail trim: in the tub the lifted paw stays hidden behind the rim)",
    "steps": [
      ["bathPet", "$pet"],
      ["towelDry", "$pet"],
      ["brushTeeth", "$pet"],
      ["cleanEars", "$pet"],
      "thumbsUp"
    ],
    "vi": ["spa trọn gói", "tắm spa trọn gói", "tắm sấy trọn gói"]
  },
  "postSurgeryCheck": {
    "params": ["pet"],
    "about": "a check-up after surgery: listen to the drowsy pet (it looks unwell at the same time — ears down, sleepy eyes), take its temperature, read the chart",
    "steps": [
      { "step": ["listen", "$pet"], "with": { "$pet": [["unwell", 2]] } },
      ["takeTemp", "$pet"],
      "readChart"
    ],
    "vi": ["tái khám sau mổ", "kiểm tra sau mổ", "khám sau mổ"]
  },
  "zoomies": {
    "params": [],
    "about": "a dog with the zoomies: chases its tail, hops for joy, pants",
    "steps": [["chaseTail", 3], ["jump", 2], ["pant", 1.4]],
    "vi": ["chó tăng động", "chạy lung tung", "chó quậy"]
  },
  "sleepyPet": {
    "params": [],
    "about": "a sleepy pet (dog or cat): a yawn, a stretch, then lies down and sleeps",
    "steps": ["yawn", "stretch", ["sleep", 3]],
    "vi": ["ngáp rồi ngủ", "lăn ra ngủ", "díp mắt"]
  },
  "partyTime": {
    "params": [],
    "about": "celebrate big: jump for joy twice, a short dance, then a cheer",
    "steps": [
      [
        "jump",
        2
      ],
      [
        "dance",
        "happy",
        2
      ],
      "cheer"
    ],
    "vi": [
      "ăn mừng lớn",
      "quẩy mừng",
      "mở tiệc",
      "tiệc mừng"
    ]
  },
  "lazyAfternoon": {
    "params": [
      "pet"
    ],
    "about": "a lazy afternoon on the floor: sit down cross-legged, stroke the pet (it comes over), then lie down and doze off while the pet sleeps — they stay lying; \"standUp\" gets up",
    "steps": [
      "sitOnFloor",
      [
        "stroke",
        "$pet"
      ],
      {
        "step": [
          "lieDown",
          "floor",
          {
            "sleep": true
          }
        ],
        "with": {
          "$pet": [
            [
              "sleep",
              3
            ]
          ]
        }
      }
    ],
    "vi": [
      "nghỉ trưa với thú",
      "nằm nghỉ với thú",
      "chiều lười biếng"
    ]
  },
  "rushToPet": {
    "params": [
      "pet"
    ],
    "about": "a scare: startle, run to the pet, stroke it, then a relieved breath",
    "steps": [
      "startle",
      [
        "run",
        "$pet"
      ],
      [
        "stroke",
        "$pet"
      ],
      "relief"
    ],
    "vi": [
      "hốt hoảng chạy tới",
      "chạy tới xem thú",
      "lo lắng chạy tới"
    ]
  },
  "tidyUp": {
    "params": [
      "pet",
      "person"
    ],
    "about": "tidy up: pick up the toy by the pet, then hand it to someone",
    "steps": [
      [
        "pickUp",
        "$pet"
      ],
      [
        "handOver",
        "$person"
      ]
    ],
    "vi": [
      "nhặt đồ đưa",
      "nhặt đồ chơi đưa"
    ]
  },
  "scaredPet": {
    "params": [
      "person"
    ],
    "about": "a frightened pet: it trembles, then runs to hide behind the person and peeks out (it stays there) — in a 3D set stand it 60–120 further back (z) than the person",
    "steps": [
      [
        "tremble",
        1.5
      ],
      [
        "hide",
        "$person"
      ]
    ],
    "vi": [
      "thú sợ hãi",
      "sợ chạy trốn",
      "sợ nấp sau"
    ]
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
