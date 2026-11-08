export const BOSS_SPAWN = { x: 0, z: 8.5 };
export const BOSS_RADIUS = 0.3;
// Shared world-space footprints; every passage is wider than the avatar.
export const OFFICE_OBSTACLES = [
  ...[
    [-2.65, -1.65],
    [0, -1.65],
    [2.65, -1.65],
    [-1.4, 1.15],
    [1.4, 1.15],
  ].flatMap(([x, z]) => [
    { x: x - 0.84, z: z - 0.63, w: 1.68, d: 0.86 },
    { x: x - 0.34, z: z + 0.34, w: 0.68, d: 0.62 },
  ]),
  { x: -4.7, z: 0.72, w: 1.1, d: 2.15 }, // studio sofa
  { x: 3.83, z: -0.05, w: 0.85, d: 1.9 }, // cabinet
  { x: 3.8, z: 2.65, w: 1, d: 0.95 }, // coffee station
  { x: -4.45, z: -3.3, w: 0.7, d: 0.7 },
  { x: 3.8, z: -3.4, w: 0.75, d: 0.75 },
  { x: -5, z: 3.8, w: 3.7, d: 0.2 },
  { x: 1.3, z: 3.8, w: 3.7, d: 0.2 }, // doorway
  { x: 0.8, z: 6.3, w: 2.8, d: 1.15 }, // executive desk
  { x: 1.8, z: 7.65, w: 0.85, d: 0.8 }, // executive chair
  { x: -4.35, z: 5.15, w: 1.15, d: 2.5 }, // lounge sofa
  { x: -2.75, z: 5.8, w: 1.1, d: 1.35 }, // lounge table
  { x: -4.61, z: 8.125, w: 0.72, d: 1.25 }, // corner jukebox
  { x: 3.8, z: 8.8, w: 0.7, d: 0.7 },
];
export function canStand(x, z, radius = BOSS_RADIUS) {
  if (
    x < -4.77 + radius ||
    x > 4.85 - radius ||
    z < -3.65 + radius ||
    z > 9.85 - radius
  )
    return false;
  return !OFFICE_OBSTACLES.some(
    (o) =>
      x > o.x - radius &&
      x < o.x + o.w + radius &&
      z > o.z - radius &&
      z < o.z + o.d + radius,
  );
}
export function moveBoss(position, dx, dz) {
  let { x, z } = position;
  // Substeps prevent tunnelling after slow frames. Separate axes allow wall sliding.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.08));
  for (let i = 0; i < steps; i++) {
    if (canStand(x + dx / steps, z)) x += dx / steps;
    if (canStand(x, z + dz / steps)) z += dz / steps;
  }
  return { x, z };
}
export function movementVector(keys) {
  const x = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
  const z = Number(keys.has("KeyS")) - Number(keys.has("KeyW"));
  const length = Math.hypot(x, z) || 1;
  return { x: x / length, z: z / length };
}
