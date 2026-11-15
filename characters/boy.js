// Boy — a child in a hoodie with spiky hair.
//   · `hat: () => ''`        the surgeon base wears a cap; remove it
//   · `kit.hair.spiky()` · `kit.outfits.hoodie` · `kit.bodies.child`
export default {
  id: 'boy',
  base: 'surgeon',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.hoodie,
    ...kit.bodies.child,
    name: 'Boy',
    hat: () => '',
    hair: kit.hair.spiky(),
    colors: {
      ...base.colors,
      hair: '#3a2a22', hairHighlight: '#6a5040',
      top: '#58a66a', topShadow: '#3f8452', lineStroke: '#2a5a38',
      trousers: '#39445a', shoes: '#f4f4f2',
    },
    restPose: { upperArmL: 9, upperArmR: 9, forearmL: -10, forearmR: -10, smile: 0.9, mouthOpen: 0.2 },
  }),
};
