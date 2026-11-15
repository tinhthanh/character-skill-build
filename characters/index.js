// The list of CUSTOM characters. To add one: create a file in this folder (copy `_template.js`)
// and add it to the array below. Order matters: a character whose `base` is another custom
// character must come AFTER it.
//
// The ones here are SAMPLES — each shows a different part of the vocabulary:
//   receptionist   new hair + an outfit reused as a blazer
//   barista        T-shirt, apron, a cup in the hand
//   granny         age cues: grey hair, wrinkles, stoop, long skirt
//   grandpa        bald crown, moustache, glasses, cardigan
//   clerk          shirt and a clipboard
//   girl, boy      children: body preset, ready-made hair, dress / hoodie
//   manager        tall body preset, suit
import receptionist from './receptionist.js';
import barista from './barista.js';
import granny from './granny.js';
import grandpa from './grandpa.js';
import clerk from './clerk.js';
import girl from './girl.js';
import boy from './boy.js';
import manager from './manager.js';

export default [receptionist, barista, granny, grandpa, clerk, girl, boy, manager];
