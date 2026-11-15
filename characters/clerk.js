// Office clerk — a long-sleeved SHIRT and a clipboard.
//   · `kit.outfits.shirt`    collar, placket, buttons, chest pocket
//   · `heldItemL`            clipboard in the left hand (the drawing is mirrored for the left)
//   · keeps the doctor's glasses and hair; `shoulderAccessories` cleared so no stethoscope
export default {
  id: 'clerk',
  base: 'doctor',
  define: (base, kit) => ({
    ...base,
    ...kit.outfits.shirt,
    name: 'Office clerk',
    colors: {
      ...base.colors,
      top: '#dfe9f5', topShadow: '#c2d2e6', lineStroke: '#6f86a6', buttons: '#ffffff',
      trousers: '#39445a', shoes: '#22262e',
    },
    heldItemL: (p, c) => kit.parts.clipboard(c),
    // Left forearm across the body carrying the clipboard, right arm relaxed.
    restPose: { ...base.restPose, handL: 'fist', upperArmL: 14, forearmL: -70, upperArmR: 8, forearmR: -10 },
  }),
};
