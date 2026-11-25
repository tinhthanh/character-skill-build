// Mother — a middle-aged woman (40s), warm look: a mom who comes with a child.
//   · `kit.hair.bun()`      hair up in a bun
//   · `kit.outfits.shirt`   long-sleeved blouse, with a long-ish skirt
//   · `kit.parts.wrinkles`  faint smile lines for the age cue
//   · a slightly wider torso (`torsoWidth`)
export default {
  id: 'mother',
  base: 'nurse',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.shirt,
    name: 'Mother',
    torsoWidth: 1.1,
    hair: kit.hair.bun({ size: 0.9 }),
    faceExtras: (p, c) => kit.parts.wrinkles(c),
    colors: {
      ...base.colors,
      hair: '#3a2a25', hairHighlight: '#6b544a', brows: '#3a2a25',
      top: '#8fb4a0', topShadow: '#739a86', lineStroke: '#3f6552',
      skirt: '#5d4a63', trousers: base.colors.skin, shoes: '#3a3338', accent: '#c8643c',
    },
    skirt: { kind: 'skirt', length: 1.3, flare: 5 },
    restPose: { ...base.restPose, upperArmL: 14, upperArmR: 14, smile: 1, mouthOpen: 0.2 },
  }),
};
