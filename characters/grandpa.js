// Grandpa — bald on top, white hair at the sides, moustache, round glasses, mustard cardigan.
//   · `hat: () => ''`        the surgeon base wears a cap; remove it
//   · `backHair: 'low'`      hair only from the ears down when he turns (bald crown)
//   · `kit.outfits.plainCoat` used as a cardigan: buttons, ribbed hem and pockets in `accessories`
//   · `stoop`                a slight bend
export default {
  id: 'grandpa',
  base: 'surgeon',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.plainCoat,
    name: 'Grandpa',
    hat: () => '',
    backHair: 'low',
    stoop: 0.6,
    neckDrop: 14,
    restPose: { upperArmL: 10, upperArmR: 10, forearmL: -13, forearmR: -13, smile: 0.5 },
    colors: {
      ...base.colors,
      hair: '#f2f2ee', hairHighlight: '#ffffff', brows: '#d9d9d2',
      top: '#d9a521', topShadow: '#b5851a', lineStroke: '#7a5a10', innerShirt: '#fbfbf8',
      trousers: '#8a8f98', shoes: '#4a3a30', accent: '#5a4a3a',
    },
    // Two tufts above the ears; the crown stays bare.
    hair: (p, c) => `
      <g id="${p}-hair-front" fill="${c.hair}" stroke="#b9bcc0" stroke-width="0.8">
        <path d="M -50 -22 Q -60 -12 -58 6 Q -57 18 -50 22 Q -46 6 -47 -8 Q -46 -18 -50 -22 Z"/>
        <path d="M 50 -22 Q 60 -12 58 6 Q 57 18 50 22 Q 46 6 47 -8 Q 46 -18 50 -22 Z"/>
      </g>`,
    faceExtras: (p, c) => `${kit.parts.wrinkles(c)}${kit.parts.roundGlasses(c, { r: 13 })}`,
    beard: (p, c) => kit.parts.moustache(c, { width: 21 }),
    accessories: (p, c) => `
      <g id="${p}-accessories">
        <path d="M 0 -62 V 40" stroke="${c.lineStroke}" stroke-width="1.2"/>
        ${[-48, -30, -12, 6, 24].map((y) => `<circle cx="4" cy="${y}" r="2.4" fill="#6b4a1e" stroke="${c.lineStroke}" stroke-width="0.8"/>`).join('')}
        ${[-24, -18, -12, -6, 0, 6, 12, 18, 24].map((x) => `<path d="M ${x} 33 V 40" stroke="${c.lineStroke}" stroke-width="0.9" opacity=".6"/>`).join('')}
        <path d="M -27 33 H 27" stroke="${c.lineStroke}" stroke-width="1" opacity=".7"/>
        <path d="M -24 4 H -9 V 18 H -24 Z M 9 4 H 24 V 18 H 9 Z" fill="none" stroke="${c.lineStroke}" stroke-width="1.1" stroke-linejoin="round"/>
      </g>`,
    shoulderAccessories: () => '',
  }),
};
