// Pharmacist — the clinic's pharmacy counter: a white coat over a coloured top, a name badge, glasses.
//   · `kit.outfits.plainCoat`   white coat (the vet's `coat` has a stethoscope; this one is plain)
//   · `kit.nameTag`             the badge on the chest
//   · `kit.hair.ponytail()`     hair tied back, so she differs from the vet and the doctor
export default {
  id: 'pharmacist',
  base: 'nurse',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.plainCoat,
    name: 'Pharmacist',
    hair: kit.hair.ponytail({ side: 'right', tie: '#2f8f83' }),
    faceExtras: (p, c) => kit.parts.roundGlasses(c),
    colors: {
      ...base.colors,
      hair: '#3b2a22', hairHighlight: '#6a5043',
      top: '#f7f8fa', topShadow: '#dde1e7', lineStroke: '#7b8594',
      innerShirt: '#2f8f83', trousers: '#4a5568', shoes: '#f4f4f2', accent: '#2f8f83',
    },
    accessories: (p, c) => `
      <g id="${p}-accessories">
        ${kit.nameTag(-22.500, -58, c.accent, c.lineStroke)}
      </g>`,
    restPose: { ...base.restPose, smile: 0.9 },
  }),
};
