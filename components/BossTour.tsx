"use client";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import {
  BOSS_SPAWN,
  moveBoss,
  movementVector,
} from "@/lib/office-navigation.mjs";

type V3 = [number, number, number];
function Block({
  at = [0, 0, 0],
  size,
  color,
  r = 0.04,
}: {
  at?: V3;
  size: V3;
  color: string;
  r?: number;
}) {
  return (
    <RoundedBox
      position={at}
      args={size}
      radius={Math.min(r, ...size.map((v) => v * 0.45))}
      smoothness={2}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={0.75} />
    </RoundedBox>
  );
}
function Sign({ text, at }: { text: string; at: V3 }) {
  const map = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 768;
    c.height = 160;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#34443d";
    ctx.fillRect(0, 0, 768, 160);
    ctx.fillStyle = "#ddc398";
    ctx.font = "500 55px serif";
    ctx.textAlign = "center";
    ctx.fillText(text, 384, 98);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text]);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <mesh position={at}>
      <planeGeometry args={[2.8, 0.58]} />
      <meshBasicMaterial map={map} />
    </mesh>
  );
}
function Glass({ at, size }: { at: V3; size: V3 }) {
  return <mesh position={at} renderOrder={2}>
    <boxGeometry args={size} />
    <meshStandardMaterial color="#bedbd3" transparent opacity={0.18} roughness={0.15} depthWrite={false} />
  </mesh>;
}

function AutomaticDoors({ position }: { position: RefObject<{ x: number; z: number }> }) {
  const panels = useRef<THREE.Group>(null);
  const openness = useRef(0);
  const hold = useRef(0);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const near = Math.abs(position.current.x) < 2.1 && Math.abs(position.current.z - 3.9) < 2.8;
    hold.current = near ? 1.2 : Math.max(0, hold.current - dt);
    openness.current = THREE.MathUtils.damp(openness.current, hold.current > 0 ? 1 : 0, 8, dt);
    panels.current?.children.forEach((panel, i) => {
      const side = i === 0 ? -1 : 1;
      panel.position.x = side * (0.63 + openness.current * 1.3);
    });
  });
  return <group ref={panels}>
    {[-1, 1].map(side => <group key={side} position={[side * 0.63, 0, 4.04]}>
      <Glass at={[0, 1.05, 0]} size={[1.24, 2, 0.045]} />
      {[-0.62, 0.62].map(x => <Block key={x} at={[x, 1.05, 0]} size={[0.045, 2, 0.065]} color="#a88e64" r={0.01} />)}
      {[0.05, 2.05].map(y => <Block key={y} at={[0, y, 0]} size={[1.28, 0.045, 0.065]} color="#a88e64" r={0.01} />)}
      <Block at={[-side * 0.48, 1.02, 0.06]} size={[0.035, 0.3, 0.045]} color="#a88e64" r={0.01} />
    </group>)}
  </group>;
}

export function ExecutiveSuite({ position, musicPlaying }: { position: RefObject<{ x: number; z: number }>; musicPlaying: boolean }) {
  return (
    <group position={[0, -0.45, 0]}>
      <Block
        at={[0, -0.16, 6.9]}
        size={[10, 0.32, 6.2]}
        color="#c6ac88"
        r={0.12}
      />
      <Block at={[0, 0.015, 6.95]} size={[9.85, 0.04, 6.05]} color="#e3d7c3" />
      {Array.from({ length: 15 }, (_, i) => (
        <Block
          key={i}
          at={[-4.6 + i * 0.65, 0.04, 6.95]}
          size={[0.012, 0.006, 6]}
          color="#d0bfa4"
          r={0.001}
        />
      ))}
      <Block at={[-4.93, 1.35, 6.9]} size={[0.16, 2.7, 6.2]} color="#d8d8c8" />
      {/* White lower walls with clear glazing above keep the team visible. */}
      {[-3.15, 3.15].map(x => <group key={x}>
        <Block at={[x, 0.525, 3.9]} size={[3.7, 1.05, 0.16]} color="#f5f3ed" r={0.025} />
        <Glass at={[x, 1.575, 3.9]} size={[3.7, 1.05, 0.06]} />
        {[1.05, 2.1].map(y => <Block key={y} at={[x, y, 3.9]} size={[3.7, 0.05, 0.08]} color="#a88e64" r={0.01} />)}
      </group>)}
      <AutomaticDoors position={position} />
      <group position={[-4.25, 0.05, 8.75]} rotation={[0, Math.PI / 2, 0]} name="ceo-jukebox">
        <Block at={[0, 0.12, 0]} size={[1.25, 0.24, 0.72]} color="#423a30" r={0.08} />
        <Block at={[0, 0.9, 0]} size={[1.15, 1.6, 0.62]} color="#76573f" r={0.15} />
        <mesh position={[0, 1.58, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.575, 0.575, 0.62, 40]} /><meshStandardMaterial color="#76573f" /></mesh>
        <Block at={[0, 0.88, 0.325]} size={[0.88, 1.35, 0.04]} color="#34463e" r={0.14} />
        <mesh position={[0, 1.53, 0.345]}><torusGeometry args={[0.46, 0.055, 8, 32, Math.PI]} /><meshStandardMaterial color="#c3a16a" emissive="#e4b978" emissiveIntensity={musicPlaying ? 0.6 : 0.08} /></mesh>
        {[-0.46, 0.46].map(x => <Block key={x} at={[x, 0.88, 0.35]} size={[0.08, 1.3, 0.08]} color={musicPlaying ? "#e1c58c" : "#b69b6d"} />)}
        <Block at={[0, 1.3, 0.36]} size={[0.64, 0.34, 0.035]} color="#e5dcc4" r={0.04} />
        {[-0.21, -0.07, 0.07, 0.21].map(x => <Block key={x} at={[x, 1.3, 0.39]} size={[0.09, 0.2, 0.025]} color="#879e8b" r={0.01} />)}
        <Block at={[0, 1.04, 0.38]} size={[0.53, 0.09, 0.06]} color="#c6aa76" />
        {Array.from({length:8},(_,i) => <Block key={i} at={[0, 0.35 + i * 0.065, 0.38]} size={[0.65, 0.025, 0.035]} color="#b79d72" r={0.008} />)}
        <mesh position={[0, 1.7, 0.36]}><circleGeometry args={[0.14, 24]} /><meshStandardMaterial color="#222e28" /></mesh>
        <mesh position={[0, 1.7, 0.37]}><circleGeometry args={[0.045, 16]} /><meshStandardMaterial color="#c6aa76" /></mesh>
      </group>
      {[-1.3, 1.3].map((x) => (
        <Block
          key={x}
          at={[x, 1.05, 3.9]}
          size={[0.13, 2.1, 0.2]}
          color="#a88e64"
        />
      ))}
      <Block at={[0, 2.1, 3.9]} size={[2.72, 0.13, 0.2]} color="#a88e64" />
      <Sign text="THE EXECUTIVE SUITE" at={[3.03, 1.45, 3.82]} />
      <Block
        at={[1.9, 0.06, 7.1]}
        size={[4.4, 0.04, 4.3]}
        color="#879184"
        r={0.12}
      />
      <Block
        at={[2.2, 0.91, 6.875]}
        size={[2.8, 0.16, 1.15]}
        color="#66503d"
        r={0.08}
      />
      {[1.05, 3.35].map((x) => (
        <Block
          key={x}
          at={[x, 0.45, 6.88]}
          size={[0.18, 0.9, 0.9]}
          color="#a28b65"
        />
      ))}
      <Block at={[2.2, 1.28, 6.55]} size={[0.88, 0.53, 0.08]} color="#333f39" />
      <Block at={[2.2, 1.28, 6.6]} size={[0.78, 0.43, 0.015]} color="#b3c5b7" />
      <Block at={[2.2, 1.03, 6.58]} size={[0.35, 0.05, 0.25]} color="#ad9871" />
      <Block
        at={[2.2, 1.015, 7.1]}
        size={[0.65, 0.035, 0.23]}
        color="#d6cfc0"
      />
      <Block
        at={[1.23, 1.02, 7.08]}
        size={[0.35, 0.06, 0.42]}
        color="#2f3e36"
      />
      <Block
        at={[2.22, 0.44, 8.05]}
        size={[0.85, 0.18, 0.8]}
        color="#39483e"
        r={0.12}
      />
      <Block
        at={[2.22, 0.99, 8.4]}
        size={[0.85, 0.95, 0.16]}
        color="#39483e"
        r={0.1}
      />
      <Block at={[2.22, 0.2, 8.05]} size={[0.14, 0.4, 0.14]} color="#a18b62" />
      <Block
        at={[-3.78, 0.44, 6.4]}
        size={[1.15, 0.65, 2.5]}
        color="#c9b69a"
        r={0.15}
      />
      <Block
        at={[-4.3, 0.9, 6.4]}
        size={[0.15, 0.9, 2.5]}
        color="#c9b69a"
        r={0.07}
      />
      <Block
        at={[-2.2, 0.43, 6.48]}
        size={[1.1, 0.1, 1.35]}
        color="#8b7454"
        r={0.1}
      />
      <Block at={[-2.2, 0.21, 6.48]} size={[0.18, 0.42, 0.6]} color="#8b7454" />
      <Block at={[-2.2, 0.52, 6.48]} size={[0.4, 0.05, 0.32]} color="#e7dfcc" />
      <mesh position={[4.15, 0.32, 9.15]} castShadow>
        <cylinderGeometry args={[0.3, 0.24, 0.6, 12]} />
        <meshStandardMaterial color="#a78c63" />
      </mesh>
      <mesh position={[4.15, 0.98, 9.15]} castShadow>
        <icosahedronGeometry args={[0.48, 1]} />
        <meshStandardMaterial color="#738468" />
      </mesh>
      <Block at={[-4.79, 1.65, 6.3]} size={[0.06, 1.3, 2.1]} color="#b7c8be" />
      <Block
        at={[-4.73, 1.65, 6.3]}
        size={[0.05, 1.35, 0.06]}
        color="#f1ecdf"
      />
      <Block
        at={[-4.73, 1.65, 6.3]}
        size={[0.05, 0.06, 2.15]}
        color="#f1ecdf"
      />
    </group>
  );
}

export function BossController({
  walking,
  keys,
  position,
  onRoom,
  onNear,
  onNearChair,
  onNearMusic,
  seated,
  reset,
  follow,
}: {
  walking: boolean;
  keys: RefObject<Set<string>>;
  position: RefObject<{ x: number; z: number }>;
  onRoom: (r: string) => void;
  onNear: (i: number | null) => void;
  onNearChair: (near: boolean) => void;
  onNearMusic: (near: boolean) => void;
  seated: boolean;
  reset: number;
  follow: boolean;
}) {
  const actor = useRef<THREE.Group>(null);
  const limbs = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  const phase = useRef(0);
  const lastMusic = useRef(false);
  const lastChair = useRef(false);
  const lastRoom = useRef("");
  const lastNear = useRef<number | null>(null);
  const world = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    position.current = { ...BOSS_SPAWN };
    if (actor.current)
      actor.current.position.set(BOSS_SPAWN.x, -0.4, BOSS_SPAWN.z);
  }, [reset, position]);
  useFrame((state, delta) => {
    if (!actor.current) return;
    const dt = Math.min(delta, 0.05);
    let moving = false;
    if (walking && !seated) {
      const input = movementVector(keys.current);
      camera.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();
      right.crossVectors(direction, camera.up).normalize();
      const dx = (right.x * input.x - direction.x * input.z) * 2.35 * dt,
        dz = (right.z * input.x - direction.z * input.z) * 2.35 * dt;
      const previous = position.current;
      const next = moveBoss(previous, dx, dz);
      moving = Math.hypot(next.x - previous.x, next.z - previous.z) > 0.001;
      position.current = next;
      if (moving) {
        const yaw = Math.atan2(next.x - previous.x, next.z - previous.z);
        actor.current.rotation.y +=
          Math.atan2(
            Math.sin(yaw - actor.current.rotation.y),
            Math.cos(yaw - actor.current.rotation.y),
          ) * Math.min(1, dt * 12);
      }
    }
    actor.current.position.set(position.current.x, -0.4, position.current.z);
    if (seated) actor.current.rotation.y = Math.PI;
    const musicNearby = Math.hypot(position.current.x + 4.25, position.current.z - 8.75) < 1.85;
    if (musicNearby !== lastMusic.current) { lastMusic.current = musicNearby; onNearMusic(musicNearby); }
    const chairNearby = Math.hypot(position.current.x - 2.22, position.current.z - 8.05) < 1.45;
    if (chairNearby !== lastChair.current) { lastChair.current = chairNearby; onNearChair(chairNearby); }
    if (moving) phase.current += dt * 8;
    limbs.current?.children.forEach((limb, i) => {
      limb.rotation.x = THREE.MathUtils.damp(
        limb.rotation.x,
        seated ? (i < 2 ? -Math.PI / 2 : -0.25) : moving
          ? Math.sin(phase.current + (i % 2) * Math.PI) * (i < 2 ? 0.38 : -0.3)
          : 0,
        12,
        dt,
      );
      const knee = limb.getObjectByName("boss-knee");
      if (knee) {
        // Counter-rotate the lower leg so seated shins stay vertical and boots flat.
        knee.rotation.x = THREE.MathUtils.damp(
          knee.rotation.x,
          seated ? Math.PI / 2 : 0,
          12,
          dt,
        );
      }
    });
    if (body.current)
      body.current.position.y = seated ? -0.25 : moving
        ? Math.abs(Math.sin(phase.current)) * 0.035
        : 0;
    const room = position.current.z > 3.9 ? "CEO suite" : "Team studio";
    if (room !== lastRoom.current) {
      lastRoom.current = room;
      onRoom(room);
    }
    let closest: number | null = null;
    let distance = 1.7;
    for (let i = 0; i < 5; i++) {
      const worker = state.scene.getObjectByName("worker-" + i);
      if (worker) {
        worker.getWorldPosition(world);
        const d = Math.hypot(
          world.x - position.current.x,
          world.z - position.current.z,
        );
        if (d < distance) {
          distance = d;
          closest = i;
        }
      }
    }
    if (closest !== lastNear.current) {
      lastNear.current = closest;
      onNear(closest);
    }
    const controls = state.controls as unknown as {
      target: THREE.Vector3;
      update: () => void;
    } | null;
    if (walking && follow && controls) {
      world.set(position.current.x, 0.35, position.current.z);
      world.sub(controls.target).multiplyScalar(1 - Math.exp(-5 * dt));
      camera.position.add(world);
      controls.target.add(world);
      controls.update();
    }
    // Keep an accessible DOM status in sync without re-rendering the scene each frame.
    const status = state.gl.domElement;
    status.dataset.bossX = position.current.x.toFixed(2);
    status.dataset.bossZ = position.current.z.toFixed(2);
  });
  useEffect(() => {
    const c = camera as THREE.OrthographicCamera;
    c.zoom = walking
      ? Math.min(size.width / 9, size.height / 8)
      : Math.min(size.width / 21, size.height / 19);
    c.updateProjectionMatrix();
  }, [camera, size, walking, reset]);
  return (
    <group
      ref={actor}
      name="ceo-boss"
      position={[BOSS_SPAWN.x, -0.4, BOSS_SPAWN.z]}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <ringGeometry args={[0.42, 0.48, 40]} />
        <meshBasicMaterial color="#c3a363" transparent opacity={0.8} />
      </mesh>
      <group ref={body}>
        <Block
          at={[0, 1.02, 0]}
          size={[0.84, 0.82, 0.46]}
          color="#303c38"
          r={0.14}
        />
        <Block
          at={[0, 0.8, 0]}
          size={[0.58, 0.5, 0.42]}
          color="#303c38"
          r={0.08}
        />
        <Block
          at={[0, 1.2, 0.238]}
          size={[0.25, 0.44, 0.025]}
          color="#f4eedf"
        />
        <Block
          at={[0, 1.17, 0.26]}
          size={[0.065, 0.3, 0.025]}
          color="#a38a55"
          r={0.01}
        />
        {[-1, 1].map((side) => (
          <Block
            key={side}
            at={[side * 0.2, 1.26, 0.25]}
            size={[0.15, 0.35, 0.04]}
            color="#4c5850"
          />
        ))}
        <Block
          at={[0, 1.58, 0]}
          size={[0.49, 0.5, 0.45]}
          color="#cc9c79"
          r={0.12}
        />
        <Block
          at={[0, 1.8, -0.025]}
          size={[0.51, 0.16, 0.46]}
          color="#343431"
          r={0.06}
        />
        <Block at={[0, 1.4, 0.19]} size={[0.4, 0.13, 0.09]} color="#51453b" />
        {[-0.11, 0.11].map((x) => (
          <Block
            key={x}
            at={[x, 1.6, 0.23]}
            size={[0.18, 0.09, 0.04]}
            color="#252c29"
            r={0.02}
          />
        ))}
        <Block at={[0, 1.6, 0.24]} size={[0.08, 0.025, 0.04]} color="#ad9462" />
        <group ref={limbs}>
          {[-0.19, 0.19].map((x) => (
            <group key={x} position={[x, 0.68, 0]}>
              <Block
                at={[0, -0.145, 0]}
                size={[0.26, 0.29, 0.3]}
                color="#35413b"
                r={0.05}
              />
              <group name="boss-knee" position={[0, -0.29, 0]}>
                <Block
                  at={[0, seated ? -0.175 : -0.145, 0]}
                  size={[0.25, seated ? 0.35 : 0.29, 0.29]}
                  color="#35413b"
                  r={0.05}
                />
                <Block
                  at={[0, seated ? -0.35 : -0.3, 0.065]}
                  size={[0.28, 0.15, 0.43]}
                  color="#252c29"
                />
              </group>
            </group>
          ))}
          {[-0.53, 0.53].map((x, i) => (
            <group key={x} position={[x, 1.3, 0]}>
              <Block
                at={[0, -0.16, 0]}
                size={[0.31, 0.42, 0.36]}
                color="#39453e"
                r={0.12}
              />
              <Block
                at={[0, -0.45, 0.04]}
                size={[0.24, 0.3, 0.27]}
                color="#cc9c79"
                r={0.08}
              />
              {i === 0 && (
                <Block
                  at={[0, -0.49, 0.04]}
                  size={[0.26, 0.065, 0.29]}
                  color="#b99b5e"
                  r={0.02}
                />
              )}
              <Block
                at={[0, -0.64, 0.04]}
                size={[0.23, 0.18, 0.25]}
                color="#cc9c79"
                r={0.07}
              />
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

export function TourCamera({
  walking,
  position,
  reset,
}: {
  walking: boolean;
  position: RefObject<{ x: number; z: number }>;
  reset: number;
}) {
  const { camera, controls } = useThree();
  useEffect(() => {
    const target = walking
      ? new THREE.Vector3(position.current.x, 0.35, position.current.z)
      : new THREE.Vector3(0, 0.35, 3);
    camera.position.copy(target).add(new THREE.Vector3(12, 13, 16));
    camera.lookAt(target);
    const orbit = controls as unknown as {
      target: THREE.Vector3;
      update: () => void;
    } | null;
    if (orbit) {
      orbit.target.copy(target);
      orbit.update();
    }
  }, [camera, controls, walking, reset, position]);
  return null;
}

