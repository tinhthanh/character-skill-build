// Granny — an ELDERLY character: age comes from four cues together.
//   · grey hair (colours only — the ponytail drawing is the nurse's)
//   · `kit.parts.wrinkles`   lines on the face
//   · `stoop: 1`             bent back; shows most when she turns sideways
//   · `skirt`                a long skirt, with `colors.trousers` set to skin for bare shins
export default {
  id: 'granny',
  base: 'nurse',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.shirt,
    name: 'Granny',
    stoop: 1,
    colors: {
      ...base.colors,
      hair: '#cfd3d8', hairHighlight: '#eef0f2', brows: '#a9adb3',
      top: '#b9a3c9', topShadow: '#9c86ad', lineStroke: '#6a557a',
      skirt: '#6d5a7d', trousers: base.colors.skin, shoes: '#f4f4f2', accent: '#d6457a',
    },
    skirt: { kind: 'skirt', length: 1.45, flare: 6 },
    faceExtras: (p, c) => kit.parts.wrinkles(c),
    restPose: { ...base.restPose, upperArmL: 8, upperArmR: 8, smile: 0.7 },
  }),
};
