import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOSS_SPAWN,
  canStand,
  moveBoss,
  movementVector,
} from "../lib/office-navigation.mjs";
test("boss spawns on an accessible floor", () =>
  assert.equal(canStand(BOSS_SPAWN.x, BOSS_SPAWN.z), true));
test("doorway connects the suite and studio in both directions", () => {
  const studio = moveBoss({ x: 0, z: 5 }, 0, -2);
  assert.ok(studio.z < 3.9);
  const suite = moveBoss(studio, 0, 2);
  assert.ok(suite.z > 3.9);
});
test("walls and furniture stop movement without tunnelling", () => {
  assert.ok(moveBoss({ x: 0, z: 8.5 }, 100, 0).x < 4.6);
  assert.ok(moveBoss({ x: 2, z: 5 }, 0, -3).z > 4);
  assert.ok(moveBoss({ x: 2, z: 5 }, 0, 4).z < 6.1);
});
test("diagonal walking has the same speed and opposite keys cancel", () => {
  const d = movementVector(new Set(["KeyW", "KeyD"]));
  assert.ok(Math.abs(Math.hypot(d.x, d.z) - 1) < 0.0001);
  assert.deepEqual(movementVector(new Set(["KeyW", "KeyS"])), { x: 0, z: 0 });
});
test("a collision slides along the wall", () => {
  const p = moveBoss({ x: 4.5, z: 4.8 }, 1, 1);
  assert.ok(p.x < 4.6);
  assert.ok(p.z > 5.5);
});
