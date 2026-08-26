const PALETTES = [
  { name: 'Ivory', frosting: 0xfff3ea, hex: '#fff4eb', sponge: 0xf2d3b0, cream: 0xffe8ef, drip: 0xc45a78, ribbon: 0xe59aaa, pearl: 0xfff6ea, sheen: 0xffd8c8, wax: [0xf7efe4, 0xf4c4d0, 0xe8c97a] },
  { name: 'Chocolate', frosting: 0x4a2c22, hex: '#4a2c22', sponge: 0x2a1810, cream: 0xc4a07a, drip: 0x1a0e08, ribbon: 0xd4af70, pearl: 0xf0d48a, sheen: 0x8a5a40, wax: [0xf0d48a, 0x5c3a2a, 0xf7efe4] },
  { name: 'Strawberry', frosting: 0xf4c4d0, hex: '#f4c4d0', sponge: 0xe89aaa, cream: 0xffe8ef, drip: 0xc45a78, ribbon: 0xfff6ea, pearl: 0xffffff, sheen: 0xffd0dc, wax: [0xf4c4d0, 0xffffff, 0xe89aaa] },
  { name: 'Matcha', frosting: 0xc5d5b8, hex: '#c5d5b8', sponge: 0x8aaa70, cream: 0xf4f0e0, drip: 0x5a7a40, ribbon: 0xe8c97a, pearl: 0xf7efe4, sheen: 0xd8ead0, wax: [0xd8ead0, 0xe8c97a, 0xf7efe4] },
  { name: 'Blueberry', frosting: 0xc5d0e8, hex: '#c5d0e8', sponge: 0x6a7ab0, cream: 0xe8eef8, drip: 0x3a4a8a, ribbon: 0xb8a0d0, pearl: 0xffffff, sheen: 0xd0d8f0, wax: [0xc5d0e8, 0xffffff, 0xb8a0d0] },
  { name: 'Lemon', frosting: 0xf7e6a0, hex: '#f7e6a0', sponge: 0xf0d060, cream: 0xfff8d8, drip: 0xe8b84a, ribbon: 0xf4b8c5, pearl: 0xffffff, sheen: 0xfff3c0, wax: [0xf7e6a0, 0xf4b8c5, 0xffffff] },
  { name: 'Velvet', frosting: 0x8a2038, hex: '#8a2038', sponge: 0x5a1020, cream: 0xf4e0e4, drip: 0x4a0818, ribbon: 0xf0d48a, pearl: 0xf0d48a, sheen: 0xc45a78, wax: [0xf0d48a, 0xf4c4d0, 0x8a2038] },
  { name: 'Midnight', frosting: 0x2a2438, hex: '#2a2438', sponge: 0x161018, cream: 0xd8d0e0, drip: 0xe8c97a, ribbon: 0xe8c97a, pearl: 0xe8c97a, sheen: 0x4a4060, wax: [0xe8c97a, 0xb8a0d0, 0xf7efe4] },
  { name: 'Coconut', frosting: 0xf8f4ee, hex: '#f8f4ee', sponge: 0xe8d8c4, cream: 0xffffff, drip: 0xd4b896, ribbon: 0xb7cbb0, pearl: 0xffffff, sheen: 0xfffaf4, wax: [0xffffff, 0xb7cbb0, 0xe8c97a] },
  { name: 'Mango', frosting: 0xf5c07a, hex: '#f5c07a', sponge: 0xe09040, cream: 0xffe8c8, drip: 0xd06030, ribbon: 0xf4b8c5, pearl: 0xfff3ea, sheen: 0xffd8a0, wax: [0xf5c07a, 0xf4b8c5, 0xfff3ea] }
];

const LOOKS = [
  { key: 'Classic', shape: 'round', drip: true, ribbon: true, pearls: true, berries: true, flowers: true, goldLeaf: true, sprinkles: false, macarons: false, piped: true, cut: true, H: 0.46, R: 1.38 },
  { key: 'Garden', shape: 'round', drip: false, ribbon: false, pearls: false, berries: false, flowers: true, goldLeaf: true, sprinkles: false, macarons: false, piped: true, cut: true, H: 0.48, R: 1.32 },
  { key: 'Confetti', shape: 'round', drip: false, ribbon: false, pearls: false, berries: false, flowers: false, goldLeaf: false, sprinkles: true, macarons: false, piped: true, cut: true, H: 0.5, R: 1.34 },
  { key: 'Tower', shape: 'tall', drip: true, ribbon: true, pearls: true, berries: true, flowers: false, goldLeaf: false, sprinkles: false, macarons: false, piped: true, cut: true, H: 0.78, R: 1.12 },
  { key: 'Square', shape: 'square', drip: true, ribbon: true, pearls: true, berries: true, flowers: false, goldLeaf: true, sprinkles: false, macarons: false, piped: false, cut: false, H: 0.48, R: 1.2 },
  { key: 'Heart', shape: 'heart', drip: false, ribbon: false, pearls: false, berries: false, flowers: true, goldLeaf: true, sprinkles: false, macarons: false, piped: false, cut: false, H: 0.42, R: 1.15 },
  { key: 'Taper', shape: 'taper', drip: true, ribbon: false, pearls: true, berries: true, flowers: true, goldLeaf: false, sprinkles: false, macarons: false, piped: true, cut: true, H: 0.52, R: 1.28 },
  { key: 'Bundt', shape: 'bundt', drip: true, ribbon: false, pearls: false, berries: false, flowers: false, goldLeaf: true, sprinkles: false, macarons: false, piped: false, cut: false, H: 0.5, R: 1.25 },
  { key: 'Petit', shape: 'short', drip: false, ribbon: true, pearls: true, berries: true, flowers: true, goldLeaf: true, sprinkles: false, macarons: false, piped: true, cut: true, H: 0.3, R: 1.52 },
  { key: 'Macaron', shape: 'round', drip: false, ribbon: false, pearls: false, berries: false, flowers: false, goldLeaf: false, sprinkles: false, macarons: true, piped: true, cut: true, H: 0.44, R: 1.3 }
];

export const CAKE_STYLE_COUNT = PALETTES.length * LOOKS.length;

export function styleFromId(id) {
  const i = ((id % CAKE_STYLE_COUNT) + CAKE_STYLE_COUNT) % CAKE_STYLE_COUNT;
  const palette = PALETTES[i % PALETTES.length];
  const look = LOOKS[Math.floor(i / PALETTES.length) % LOOKS.length];
  return {
    id: i,
    ...palette,
    ...look,
    name: `${palette.name} ${look.key}`
  };
}

export function pickCakeStyle() {
  const forced = Number(new URLSearchParams(location.search).get('cake'));
  if (Number.isFinite(forced) && forced >= 0) {
    localStorage.setItem('hb-cake-style', String(forced % CAKE_STYLE_COUNT));
    return styleFromId(forced);
  }
  const last = Number(localStorage.getItem('hb-cake-style') ?? -1);
  let id = Math.floor(Math.random() * CAKE_STYLE_COUNT);
  if (id === last) id = (id + 7) % CAKE_STYLE_COUNT;
  localStorage.setItem('hb-cake-style', String(id));
  return styleFromId(id);
}
