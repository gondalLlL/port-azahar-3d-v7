export const CONFIG = {
  WORLD_SIZE: 36, // 36x36 blocks grid
  BLOCK_SIZE: 40, // 40 units per block
  ROAD_WIDTH: 12,
  MAX_WANTED: 5,
};

export const DISTRICTS = [
  { name: 'Docks', xMin: 0, xMax: 18, zMin: 18, zMax: 36, tint: 0x4a5568 },
  { name: 'Neon Mile', xMin: 18, xMax: 36, zMin: 18, zMax: 36, tint: 0x2b6cb0 },
  { name: 'Old Town', xMin: 0, xMax: 18, zMin: 0, zMax: 18, tint: 0x7b341e },
  { name: 'Marina', xMin: 18, xMax: 36, zMin: 0, zMax: 18, tint: 0x2f855a },
  { name: 'The Hills', xMin: 12, xMax: 24, zMin: 12, zMax: 24, tint: 0x4a5568 },
];

export const MISSIONS = [
  {
    id: 1,
    title: "First Run",
    desc: "Pick up Marisol's package at the Docks and deliver it across town.",
    target: { x: 200, z: 1000 },
    reward: 1500,
    timeLimit: 120,
    dialogue: { speaker: "Marisol Kane", text: "Welcome to Port Azahar, Dario. Grab that package at the docks before the heat catches wind." }
  },
  {
    id: 2,
    title: "Borrowed Wheels",
    desc: "Steal the marked azure sports car in Neon Mile and deliver it to the garage.",
    target: { x: 1050, z: 900 },
    reward: 2500,
    timeLimit: 150,
    dialogue: { speaker: "Marisol Kane", text: "We need high-end wheels for the crew. Lift that azure sports car on Neon Mile." }
  },
  {
    id: 3,
    title: "Heat",
    desc: "Reach a 3-star wanted level and evade police to reach the safehouse.",
    target: { x: -400, z: -600 },
    reward: 3500,
    timeLimit: 180,
    dialogue: { speaker: "Marisol Kane", text: "Stir up some trouble on the strip, get the cops on your tail, then shake 'em at the safehouse." }
  },
  {
    id: 4,
    title: "Three Drops",
    desc: "Collect 3 cash drops across Old Town while police pressure rises.",
    target: { x: -800, z: 400 },
    reward: 5000,
    timeLimit: 200,
    dialogue: { speaker: "Marisol Kane", text: "Three courier drops are waiting in Old Town. Collect them all without getting wasted." }
  },
  {
    id: 5,
    title: "Last Boat",
    desc: "Escape to the Marina boat before time runs out to secure the city.",
    target: { x: 900, z: -1000 },
    reward: 10000,
    timeLimit: 160,
    dialogue: { speaker: "Marisol Kane", text: "This is the big one, Dario. Hit the marina boat and we own Port Azahar." }
  }
];
