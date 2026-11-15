// Receptionist — the worked EXAMPLE of a custom character: the nurse's head with new hair,
// and a long-sleeved blazer.
//
// The three moves every custom character makes:
//   1. pick `base` — the built-in closest to what you need (here: the face, eyes and body
//      proportions of `nurse`);
//   2. spread a ready-made OUTFIT from `kit.outfits`, then override its details;
//   3. override hair, colours and rest pose.
export default {
  id: 'receptionist',
  base: 'nurse',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.coat,                       // long-sleeved top with lapels, used as a blazer
    name: 'Receptionist',
    // Hands clasped at the belly: a welcoming pose.
    restPose: { upperArmL: 17, upperArmR: 17, forearmL: -92, forearmR: -92, smile: 1, mouthOpen: 0.4, browL: 0.2, browR: 0.2 },
    colors: {
      ...base.colors,
      hair: '#2a2024', hairHighlight: '#55464c',
      top: '#2f4b7c', topShadow: '#223a63', lineStroke: '#16233d', innerShirt: '#f6f7f9',
      trousers: '#2f4b7c', shoes: '#22262e', accent: '#d6453d',
    },
    // Chin-length bob. Every hair shape visible from the front lives in the `hair-front` group.
    hair: (p, c) => `
              <g id="${p}-hair-front" fill="${c.hair}">
                <path d="M -53 31 Q -64 -34 -28 -61 Q 0 -75 28 -61 Q 64 -34 53 31 Q 45 36 40 27 Q 46 -8 31 -25 Q 12 -39 -4 -33 Q -29 -30 -40 -14 Q -45 6 -40 27 Q -45 36 -53 31 Z"/>
                <path d="M -28 -52 Q -4 -63 20 -54" stroke="${c.hairHighlight}" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".8"/>
                <path d="M -48 4 Q -50 -18 -38 -36" stroke="${c.hairHighlight}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".6"/>
              </g>`,
    // The coat's lapels, plus a bow tie.
    collar: (p, c) => `${kit.outfits.coat.collar(p, c)}
        <path d="M 0 -96.500 l -9.500 -4.500 v 9 z M 0 -96.500 l 9.500 -4.500 v 9 z" fill="${c.accent}" stroke="${c.lineStroke}" stroke-width="0.900" stroke-linejoin="round"/>
        <circle cx="0" cy="-96.500" r="2.300" fill="${c.accent}" stroke="${c.lineStroke}" stroke-width="0.900"/>`,
    // Blazer details: front seam, two gold buttons, name tag, pocket square. NO stethoscope.
    // Must be wrapped in <g id="${p}-accessories"> — the rig scales this group with the torso.
    accessories: (p, c) => `
      <g id="${p}-accessories">
        <path d="M 0 -67 V 40" stroke="${c.lineStroke}" stroke-width="1.200"/>
        ${[-44, -22].map((y) => `<circle cx="3.600" cy="${y}" r="2.200" fill="#e8c35a" stroke="${c.lineStroke}" stroke-width="0.800"/>`).join('')}
        <path d="M 9 -58 h 13 v 3 h -13 z" fill="${c.accent}"/>
        <path d="M 9 -55 h 13 v 11 h -13 z" fill="none" stroke="${c.lineStroke}" stroke-width="1.100" stroke-linejoin="round"/>
        ${kit.nameTag(-22.500, -58, c.accent, c.lineStroke)}
        ${['L', 'R'].map((side) => { const g = side === 'L' ? -1 : 1; return `
        <path d="M ${g * 10} 10 H ${g * 27.500}" stroke="${c.lineStroke}" stroke-width="1.200" stroke-linecap="round"/>`; }).join('')}
      </g>`,
    shoulderAccessories: () => '',
  }),
};
