// Muted accents echo the dominant colours of the Hoyoung skill icons.
// Unrecognised skills keep a neutral accent until their icon is reviewed.
const accents = {
  Apotheosis: '#b8a27a', Ascent: '#bba3ce', Taotie: '#cf927f',
  Harmony: '#8ebfba', Basics: '#91b9d0', Talisman: '#b6a8d3', Scroll: '#9dbdb5',
  Rampage: '#c0a58b', Tiger: '#d0b379', 'Wrath of Gods': '#c59a91', Apparition: '#9badd0',
  Janus: '#bcb690', Hecate: '#aaa5c9', Lotus: '#d5a9bd',
  'HEXA Stat I': '#ac9dc7', 'HEXA Stat II': '#ac9dc7', 'HEXA Stat III': '#ac9dc7'
};

export function skillAccent(skill) {
  return accents[skill] || '#a8b0ad';
}
