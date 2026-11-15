// _template.js — a SKELETON to copy when creating a character. This file is NOT registered.
//
//   cp characters/_template.js characters/<id>.js      then edit it, then add it to characters/index.js
//
// Override only what changes; everything you leave out comes from the `base` character.
// Keys, coordinate systems and required element ids: references/slots.md.
// To see what a base currently carries: sh tools/describe.sh <base-id>
export default {
  id: 'my_character',            // lowercase letters, digits, underscores
  base: 'vet',                   // vet | surgeon | nurse | doctor | default | <another custom id>
  define: (base, kit) => ({
    ...base,
    // ...kit.outfits.scrubs,    // (optional) take a whole outfit: scrubs | pawTunic | coat | plainCoat
    name: 'Display name',

    // ── proportions (a line you delete falls back to the base) ──
    // headSize: 1.37, neckDrop: 9, torsoScale: 0.94, legScale: 0.68,
    // upperArmLength: 1.09, forearmLength: 0.7, armThickness: 0.68, handSize: 0.95,
    // thighLength: 1.4, shinLength: 1.25, legThickness: 1, legGap: 14, footSize: 1,

    // ── face ──
    // faceShape: { halfWidth: 50, crownHeight: 54, chinLength: 56, widestY: -6, foreheadSquareness: 0.1, jawSquareness: -0.05, foreheadWidth: 1.06, chinWidth: 1.1 },
    // brows: { halfLength: 10, thickness: 3.6, arch: 2, taper: 0.45, slant: 1 },

    // ── rest pose ──
    // restPose: { upperArmL: 10, upperArmR: 10, forearmL: -13, forearmR: -13, smile: 0.8, mouthOpen: 0.1 },

    // ── colours: ALWAYS spread `base.colors` first, then override ──
    colors: { ...base.colors /* , hair: '#2a2024', top: '#2f4b7c', topShadow: '#223a63', trousers: '#2f4b7c' */ },

    // ── borrow a part from another character / use a ready-made part ──
    // faceExtras: kit.partsOf('doctor').faceExtras,                 // the doctor's glasses
    // faceExtras: (p, c) => kit.parts.roundGlasses(c),              // round glasses
    // beard: (p, c) => kit.parts.shortBeard(c),                     // short beard
    // hat: () => '',                                                // drop an inherited hat

    // backHair: 'low',                                              // bald on top ('none' = fully bald)

    // ── your own drawings (SVG strings) — read references/slots.md before writing them ──
    // hair: (p, c) => `<g id="${p}-hair-front" fill="${c.hair}">…</g>`,
    // collar: (p, c) => `…`,
    // accessories: (p, c) => `<g id="${p}-accessories">…</g>`,
    // shoulderAccessories: () => '',
  }),
};
