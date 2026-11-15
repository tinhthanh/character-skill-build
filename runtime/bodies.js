// bodies.js — DÁNG NGƯỜI dựng sẵn: bộ số tỉ lệ (khoá công khai) để trải vào định nghĩa.
//
//     define: (base, kit) => ({ ...base, ...kit.bodies.child, … })
//
// Dáng chỉ đổi TỈ LỆ giữa đầu, thân, tay, chân. Chiều cao trên màn hình do host quyết định:
// nhân vật luôn cao gần hết host của nó, nên một đứa trẻ đứng cạnh người lớn cần host THẤP hơn
// — `hostScale` dưới đây là tỉ lệ nên dùng so với host của người lớn (khoá này rig bỏ qua).

/** Trẻ nhỏ (5–8 tuổi): đầu rất to, thân và chân ngắn, tay chân mũm mĩm. */
export const child = {
  headSize: 1.62, neckDrop: 15, torsoScale: 0.8, legScale: 0.5,
  upperArmLength: 0.8, forearmLength: 0.62, armThickness: 0.9, handSize: 0.92,
  thighLength: 1.15, shinLength: 1.1, legThickness: 1.1, legGap: 12, footSize: 0.95,
  hostScale: 0.75,
};

/** Thiếu niên: giữa trẻ nhỏ và người lớn, tay chân mảnh. */
export const teen = {
  headSize: 1.46, neckDrop: 10, torsoScale: 0.88, legScale: 0.64,
  upperArmLength: 0.98, forearmLength: 0.7, armThickness: 0.7, handSize: 0.95,
  thighLength: 1.3, shinLength: 1.22, legThickness: 0.92, legGap: 13, footSize: 1,
  hostScale: 0.84,
};

/** Người lớn chuẩn của bộ nhân vật có sẵn (bác sĩ thú y). */
export const adult = {
  headSize: 1.37, neckDrop: 9, torsoScale: 0.94, legScale: 0.68,
  upperArmLength: 1.09, forearmLength: 0.7, armThickness: 0.68, handSize: 0.95,
  thighLength: 1.4, shinLength: 1.25, legThickness: 1, legGap: 14, footSize: 1,
  hostScale: 1,
};

/** Người cao, ít chibi hơn: đầu nhỏ lại, chân dài. */
export const tall = {
  headSize: 1.2, neckDrop: 5, torsoScale: 0.96, legScale: 0.86,
  upperArmLength: 1.08, forearmLength: 0.84, armThickness: 0.72, handSize: 0.95,
  thighLength: 1.3, shinLength: 1.25, legThickness: 0.95, legGap: 14, footSize: 1,
  hostScale: 1.08,
};

/** Người to con: thân lớn và RỘNG NGANG, cổ rụt, tay chân to. */
export const stocky = {
  headSize: 1.34, neckDrop: 15, torsoScale: 1.08, torsoWidth: 1.28, legScale: 0.64,
  upperArmLength: 1.0, forearmLength: 0.7, armThickness: 1.05, handSize: 1.08,
  thighLength: 1.3, shinLength: 1.2, legThickness: 1.4, legGap: 17, footSize: 1.1,
  hostScale: 1,
};
