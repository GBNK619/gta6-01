// config.js — Palmera Heat: world constants, palette and name lists.
// Everything the other files need to agree on lives here: the size of
// Palmera City, where its avenues and streets run, and the sunset palette.

const VIEW_W = 1280;
const VIEW_H = 800;

const WORLD_W = 3584;          // 56 tiles of 64 px
const WORLD_H = 2560;          // 40 tiles of 64 px
const TILE = 64;

const WATER_X = 3200;          // the Solana Sea starts here
const SAND_X = 2944;           // Palmera Beach sand strip
const ROAD_W = 128;            // every avenue/street is 128 px wide

const AVENUES = [320, 832, 1344, 1856, 2368, 2880];   // vertical road centres (x)
const STREETS = [320, 832, 1344, 1856, 2368];         // horizontal road centres (y)

const PALETTE = {
  water: '#1d5f7a', waterDeep: '#174c66', waterFoam: '#bfeef2',
  sand: '#e8c98a', sandWet: '#dcb877',
  grass: '#5d8f4e', concrete: '#9a938c', sidewalk: '#b7b0a6',
  road: '#3c3a44', roadEdge: '#57545f', lane: '#e8d44d',
  plaza: '#c2a37e',
  roofA: '#c96f4a', roofB: '#a8563a', roofC: '#7a4a63', roofD: '#546a7a',
  roofE: '#8a6d4f', wallShade: 'rgba(40,16,32,0.35)',
  palmTrunk: '#7a5a38', palmLeaf: '#3e7d3a',
  sunsetTop: 'rgba(255,126,54,0.10)', sunsetBottom: 'rgba(38,12,66,0.20)',
};

const BUILDING_NAMES = [
  'Hotel Miramar', 'Solana Bank', 'Torre Alba', 'Hotel Brisa Sur',
  'Mercado Sol', 'Edificio Coral', 'Palma Mall', 'Radio Ola', 'Casa Azul',
  'Taller Bruno', 'Casa Limón', 'Hotel Brisa Norte', 'Oficinas Vega', 'Depósito Sur',
  'Galería Arte', 'Panadería Luz', 'Hotel Dunas', 'Torre Faro', 'Residencial Palma',
  'Bar El Ancla', 'Joyas Mar', 'Farmacia Sol', 'Librería Ola', 'Cine Rex',
  'Hotel Cielo', 'Almacén Puerto', 'Casa Verde', 'Torre Brisa', 'Mercado Norte',
];

const CAR_MODELS = [
  { name: 'Solana Compact', w: 34, l: 58, top: 300, accel: 260, colors: ['#c94f42', '#e0e4e8', '#3f6fb5', '#e8b93e', '#58a05c'] },
  { name: 'Brisa Sedan', w: 36, l: 66, top: 360, accel: 300, colors: ['#28418c', '#7a1f2b', '#20242c', '#c0c6cc', '#5b3a8c'] },
  { name: 'Duna Pickup', w: 38, l: 70, top: 320, accel: 270, colors: ['#d97c2e', '#4a6741', '#8c8c8c', '#703838'] },
  { name: 'Faro Coupe', w: 35, l: 62, top: 430, accel: 380, colors: ['#e83e6b', '#ffd23e', '#18a0b5', '#f2f2f2'] },
  { name: 'Cargo Van', w: 40, l: 76, top: 280, accel: 220, colors: ['#e8e8e8', '#b5bdc4', '#7a8894', '#c9a227'] },
  { name: 'Taxi Ola', w: 36, l: 66, top: 340, accel: 290, colors: ['#f5c518'] },
];

const PED_SHIRTS = ['#e8e4da', '#c94f42', '#3f6fb5', '#e8b93e', '#58a05c', '#e83e6b', '#7a4a9e', '#18a0b5', '#f2f2f2', '#28418c'];
const PED_PANTS = ['#2c3242', '#4a3a2c', '#5c6650', '#703838', '#20242c', '#8c7a5c'];

// Fixed places the story uses. Filled in by city.js once the city is built.
const PLACES = {
  hotel: { x: 430, y: 1420, name: 'Palmera Suites' },
  cafe: { x: 0, y: 0, name: 'Café Brisa' },
  garage: { x: 0, y: 0, name: 'Marina Garage' },
  hospital: { x: 0, y: 0, name: 'Clínica del Mar' },
  precinct: { x: 0, y: 0, name: 'Palmera Precinct' },
  docks: { x: 0, y: 0, name: 'Solana Docks' },
  hideout: { x: 0, y: 0, name: 'North Parking Deck' },
  pier: { x: 0, y: 0, name: 'Palmera Pier' },
};

// Shared game state. main.js owns the loop; everyone else reads/writes here.
const S = {
  mode: 'menu',           // menu | play | pause | wasted | busted
  time: 0,
  cash: 120,
  health: 100,
  heat: 0,                // wanted heat; stars = ceil(heat) capped 0..5
  unseenFor: 99,          // seconds since police last had eyes on the player
  bustMeter: 0,
  hurtAt: -99,
  camera: { x: 0, y: 0 },
  shake: 0,
  banner: null,           // {title, sub, until}
  prompt: '',             // contextual "Press E ..." line
  muted: false,
  started: false,
  menuPan: 0,
  stats: { crimes: 0, carsStolen: 0, missionsDone: 0 },
};
