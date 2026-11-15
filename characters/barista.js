// Barista — everyday clothes with an APRON and a HELD ITEM.
//   · `kit.outfits.tee`      a plain T-shirt instead of a medical outfit
//   · `skirt: { kind: 'apron' }` + `kit.parts.apronBib`   the apron: the rig draws the part below
//     the hips (it follows the legs and the turn), the bib is drawn on the torso
//   · `heldItemR`            a paper cup in the screen-right hand (L / R are screen sides); `hideItem('R')` puts it away
export default {
  id: 'barista',
  base: 'nurse',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.tee,
    name: 'Barista',
    colors: {
      ...base.colors,
      hair: '#4a2f22', hairHighlight: '#7a5038',
      top: '#f2ede4', topShadow: '#d9d2c4', lineStroke: '#8d8474',
      trousers: '#3b3f4a', shoes: '#f4f4f2', skirt: '#5b7a4a', accent: '#c8643c',
    },
    skirt: { kind: 'apron', length: 0.9, flare: 2 },
    accessories: (p, c) => `
      <g id="${p}-accessories">${kit.parts.apronBib(c)}
      </g>`,
    heldItemR: (p, c) => kit.parts.cup(c),
    // Right forearm raised to offer the cup; the hand holding something is a fist.
    restPose: { ...base.restPose, handR: 'fist', upperArmR: 20, forearmR: -80, smile: 0.9 },
  }),
};
