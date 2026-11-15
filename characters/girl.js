// Girl — a CHILD: body preset, a ready-made hairstyle and a one-piece dress.
//   · `kit.bodies.child`     big head, short torso and legs. Next to an adult, give her host
//                            about 0.75 × the adult's height (`kit.bodies.child.hostScale`)
//   · `kit.hair.pigtails()`  ready-made hair — no SVG to draw
//   · `kit.outfits.dress`    top + skirt in one colour; bare legs = `trousers` in the skin colour
export default {
  id: 'girl',
  base: 'nurse',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.dress,
    ...kit.bodies.child,
    name: 'Girl',
    hair: kit.hair.pigtails(),
    colors: {
      ...base.colors,
      hair: '#4a2f22', hairHighlight: '#7a5038',
      top: '#f2b53c', topShadow: '#d29722', lineStroke: '#8a6212',
      trousers: base.colors.skin, shoes: '#f4f4f2', accent: '#d6457a',
    },
    restPose: { ...base.restPose, smile: 1, mouthOpen: 0.3 },
  }),
};
