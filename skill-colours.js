// Muted accents echo the dominant colours of the Hoyoung skill icons.
// Unrecognised skills keep a neutral accent until their icon is reviewed.
const accents = {
  Apotheosis: '#b8a27a', Ascent: '#bba3ce', Taotie: '#cf927f',
  Harmony: '#8ebfba', Basics: '#91b9d0', Talisman: '#b6a8d3', Scroll: '#9dbdb5',
  Rampage: '#c0a58b', Tiger: '#d0b379', 'Wrath of Gods': '#c59a91', Apparition: '#9badd0',
  Janus: '#bcb690', Hecate: '#aaa5c9', Lotus: '#d5a9bd',
  'HEXA Stat I': '#ac9dc7', 'HEXA Stat II': '#ac9dc7', 'HEXA Stat III': '#ac9dc7'
};

// Alpha-weighted RGB means from Scouter's 14 Ren icons, fetched 1 October 2026.
// Len_1/10/12, Len_2/7/8/9, Len_3/4/5/6, General_1_0, General_2 and Len_11.
// Stable core IDs keep colour independent of owner names, tags and priorities.
const renIconAverages = {
  "ren_generalCore1": [
    144,
    143,
    159
  ],
  "ren_generalCore2": [
    139,
    151,
    174
  ],
  "ren_generalCore3": [
    139,
    181,
    219
  ],
  "ren_masteryCore1": [
    215,
    151,
    162
  ],
  "ren_masteryCore2": [
    112,
    115,
    139
  ],
  "ren_masteryCore3": [
    140,
    118,
    137
  ],
  "ren_masteryCore4": [
    180,
    99,
    114
  ],
  "ren_reinCore1": [
    162,
    113,
    117
  ],
  "ren_reinCore2": [
    144,
    127,
    140
  ],
  "ren_reinCore3": [
    180,
    139,
    151
  ],
  "ren_reinCore4": [
    115,
    114,
    138
  ],
  "ren_skillCore1": [
    132,
    119,
    177
  ],
  "ren_skillCore2": [
    184,
    124,
    117
  ],
  "ren_skillCore3": [
    118,
    144,
    154
  ]
};
const mutedIconAccent = rgb => '#' + rgb.map(value =>
  Math.round(value * .55 + 180 * .45).toString(16).padStart(2, '0')).join('');

export function skillAccent(skill) {
  return renIconAverages[skill] ? mutedIconAccent(renIconAverages[skill]) : accents[skill] || '#a8b0ad';
}
