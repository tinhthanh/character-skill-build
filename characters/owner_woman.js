// Owner woman — a young woman (late 20s) bringing her pet in: an ADULT, everyday look.
//   · `kit.outfits.shirt`  casual blouse, with a skirt below instead of scrub trousers
//   · `kit.hair.long()`    long hair past the shoulders
//   · adult proportions come from the base (`nurse`); she is as tall as the vet
export default {
  id: 'owner_woman',
  base: 'nurse',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.shirt,
    name: 'Owner (woman)',
    hair: kit.hair.long({ length: 0.5 }),
    colors: {
      ...base.colors,
      hair: '#2b1d1a', hairHighlight: '#5a403a',
      top: '#f0a6a0', topShadow: '#d98a84', lineStroke: '#8a4a48',
      skirt: '#3f5a7a', trousers: base.colors.skin, shoes: '#f4efe6', accent: '#d6457a',
    },
    skirt: { kind: 'skirt', length: 1.15, flare: 4 },
    restPose: { ...base.restPose, upperArmL: 12, upperArmR: 12, smile: 0.9 },
  }),
};
