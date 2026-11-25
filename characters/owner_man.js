// Owner man — a young man (around 30) bringing his pet in: casual shirt, short hair.
//   · `kit.outfits.tee`      plain T-shirt
//   · `kit.hair.crop()`      short hair
//   · `kit.bodies.tall`      less chibi than the built-ins, clearly taller than `boy`
export default {
  id: 'owner_man',
  base: 'doctor',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.tee,
    ...kit.bodies.tall,
    name: 'Owner (man)',
    hair: kit.hair.crop(),
    faceExtras: () => '',                     // bỏ kính của doctor
    colors: {
      ...base.colors,
      hair: '#1f1b1d', hairHighlight: '#4a4448',
      top: '#5f8f8a', topShadow: '#47726d', lineStroke: '#2c4a47',
      trousers: '#4b5666', shoes: '#e9e6df', accent: '#c8643c',
    },
    restPose: { upperArmL: 10, upperArmR: 10, forearmL: -13, forearmR: -13, smile: 0.8 },
  }),
};
