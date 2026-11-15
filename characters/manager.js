// Manager — a taller, less chibi adult in a suit.
//   · `kit.bodies.tall`      smaller head, longer legs
//   · `kit.outfits.suit`     jacket with lapels, shirt (`colors.innerShirt`) and tie (`colors.tie`)
//   · `kit.hair.sidePart()`  ready-made hair; the doctor's glasses are removed
export default {
  id: 'manager',
  base: 'doctor',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.suit,
    ...kit.bodies.tall,
    name: 'Manager',
    faceExtras: () => '',
    hair: kit.hair.sidePart(),
    colors: {
      ...base.colors,
      hair: '#2c2a33', hairHighlight: '#55505e',
      top: '#39445a', topShadow: '#2a3346', lineStroke: '#151b27',
      innerShirt: '#f4f6f8', tie: '#b23a3a', buttons: '#1d2331',
      trousers: '#39445a', shoes: '#1b2029',
    },
    restPose: { upperArmL: 10, upperArmR: 10, forearmL: -13, forearmR: -13, smile: 0.6 },
  }),
};
