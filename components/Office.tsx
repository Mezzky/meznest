"use client";
import {
  Suspense,
  useRef,
  useState,
  useEffect,
  useMemo,
  Component,
  type ReactNode,
  type RefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { team, type Role } from "@/lib/team";

type V3 = [number, number, number];
const deskPositions: V3[] = [
  [-2.65, 0, -1.65],
  [0, 0, -1.65],
  [2.65, 0, -1.65],
  [-1.4, 0, 1.15],
  [1.4, 0, 1.15],
];
function LabelPositions({
  elements,
}: {
  elements: RefObject<(HTMLButtonElement | null)[]>;
}) {
  const { camera, size } = useThree();
  const point = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    deskPositions.forEach(([x, , z], i) => {
      const el = elements.current[i];
      if (!el) return;
      point.set(x, 1.67, z + 0.35).project(camera);
      el.style.left = ((point.x + 1) * size.width) / 2 + "px";
      el.style.top = ((-point.y + 1) * size.height) / 2 + "px";
      el.style.visibility = point.z > 1 ? "hidden" : "visible";
    });
  });
  return null;
}
function FitCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const c = camera as THREE.OrthographicCamera;
    c.zoom = Math.min(size.width / 14, size.height / 10);
    c.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}
function WallSign() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f8f1e5";
    ctx.fillRect(0, 0, 512, 160);
    ctx.textAlign = "center";
    ctx.fillStyle = "#978064";
    ctx.font = "bold 64px sans-serif";
    ctx.fillText("meznest.", 256, 88);
    ctx.font = "17px sans-serif";
    ctx.fillText("LITTLE TEAM. BIG IDEAS.", 256, 124);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0.1, 1.93, -3.64]}>
      <planeGeometry args={[2.2, 0.69]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}
function Box({
  position = [0, 0, 0],
  size = [1, 1, 1],
  color = "#fff",
  radius = 0.04,
  rotation = [0, 0, 0],
}: {
  position?: V3;
  size?: V3;
  color?: string;
  radius?: number;
  rotation?: V3;
}) {
  return (
    <RoundedBox
      args={size}
      position={position}
      rotation={rotation}
      radius={Math.min(radius, ...size.map((n) => n / 2 - 0.0001))}
      smoothness={3}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={0.85} />
    </RoundedBox>
  );
}
function Plant({ position, scale = 1 }: { position: V3; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.24, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.18, 0.46, 10]} />
        <meshStandardMaterial color="#d69d7d" />
      </mesh>
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.035, 10]} />
        <meshStandardMaterial color="#594b3f" />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <group key={i} rotation={[0, i * 1.04, 0]}>
          <mesh position={[0.13, 0.76, 0]} rotation={[0, 0, -0.36]} castShadow>
            <capsuleGeometry args={[0.11, 0.43, 3, 6]} />
            <meshStandardMaterial color={i % 2 ? "#668b60" : "#8ba175"} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.025, 0.03, 0.7, 6]} />
        <meshStandardMaterial color="#6c8051" />
      </mesh>
    </group>
  );
}
function Avatar({
  color,
  variant = 0,
  active = false,
}: {
  color: string;
  variant?: number;
  active?: boolean;
}) {
  const head = useRef<THREE.Group>(null);
  const hand = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (head.current)
      head.current.rotation.z =
        Math.sin(clock.elapsedTime * 1.3 + variant) * 0.025;
    if (hand.current)
      hand.current.rotation.x = active
        ? Math.sin(clock.elapsedTime * 9) * 0.13
        : 0;
  });
  return (
    <group>
      <Box
        position={[0, 0.55, 0]}
        size={[0.48, 0.57, 0.34]}
        color={color}
        radius={0.15}
      />
      <group ref={head} position={[0, 1.04, 0]}>
        <Box
          size={[0.46, 0.46, 0.43]}
          color={variant === 3 ? "#bd8762" : "#ebbd95"}
          radius={0.17}
        />
        <Box
          position={[0, 0.18, -0.025]}
          size={[0.49, 0.19, 0.46]}
          color={
            ["#6f4c38", "#635044", "#aa734c", "#493d3a", "#5b493b"][variant]
          }
          radius={0.08}
        />
        {variant === 1 && (
          <Box
            position={[0, -0.07, -0.18]}
            size={[0.49, 0.48, 0.16]}
            color="#635044"
            radius={0.07}
          />
        )}
        {[-0.095, 0.095].map((x) => (
          <mesh key={x} position={[x, 0.01, 0.217]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#3c352e" />
          </mesh>
        ))}
        <Box
          position={[0, -0.08, 0.219]}
          size={[0.07, 0.02, 0.01]}
          radius={0.004}
          color="#a67159"
        />
        {variant === 2 && (
          <>
            <Box
              position={[0, 0.24, 0]}
              size={[0.51, 0.13, 0.46]}
              color="#759b86"
              radius={0.04}
            />
            <Box
              position={[0, 0.2, 0.23]}
              size={[0.48, 0.045, 0.19]}
              color="#759b86"
            />
          </>
        )}
        {variant === 3 &&
          [-0.1, 0.1].map((x) => (
            <mesh key={x} position={[x, 0.02, 0.24]}>
              <torusGeometry args={[0.076, 0.012, 6, 12]} />
              <meshStandardMaterial color="#413b3c" />
            </mesh>
          ))}
        {variant === 4 && (
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.13, 8, 6]} />
            <meshStandardMaterial color="#5b493b" />
          </mesh>
        )}
      </group>
      <group ref={hand}>
        {[-0.28, 0.28].map((x) => (
          <group key={x}>
            <Box
              position={[x, 0.61, 0.14]}
              size={[0.16, 0.3, 0.18]}
              color={color}
              radius={0.065}
              rotation={[-0.65, 0, 0]}
            />
            <Box
              position={[x, 0.49, 0.28]}
              size={[0.14, 0.14, 0.19]}
              color="#ebbd95"
              radius={0.06}
            />
          </group>
        ))}
      </group>
      {[-0.14, 0.14].map((x) => (
        <group key={x}>
          <Box
            position={[x, 0.16, 0.13]}
            size={[0.18, 0.32, 0.25]}
            color="#605d59"
          />
          <Box
            position={[x, 0.04, 0.22]}
            size={[0.2, 0.12, 0.35]}
            color="#f2e9db"
          />
        </group>
      ))}
    </group>
  );
}
function Desk({
  position,
  member,
  index,
  selected,
  active,
  onSelect,
  showLabels,
}: {
  position: V3;
  member: (typeof team)[number];
  index: number;
  selected: boolean;
  active: boolean;
  onSelect: () => void;
  showLabels: boolean;
}) {
  return (
    <group position={position}>
      <Box
        position={[0, 0.82, -0.2]}
        size={[1.65, 0.12, 0.83]}
        color="#d9b695"
        radius={0.065}
      />
      {[-0.66, 0.66].map((x) =>
        [-0.48, 0.1].map((z) => (
          <Box
            key={`${x}${z}`}
            position={[x, 0.39, z]}
            size={[0.075, 0.78, 0.075]}
            color="#eae1d2"
            radius={0.018}
          />
        )),
      )}
      <Box
        position={[0.1, 1.22, -0.43]}
        size={[0.72, 0.48, 0.065]}
        color="#e5e0d3"
        radius={0.04}
      />
      <Box
        position={[0.1, 1.22, -0.39]}
        size={[0.63, 0.38, 0.015]}
        color={active ? "#9bbca8" : "#b1bfc0"}
        radius={0.02}
      />
      <Box
        position={[0.1, 0.95, -0.43]}
        size={[0.06, 0.19, 0.06]}
        color="#ccc4b5"
      />
      <Box
        position={[0.1, 0.89, -0.38]}
        size={[0.31, 0.025, 0.2]}
        color="#e5e0d3"
        radius={0.01}
      />
      <Box
        position={[0.08, 0.903, -0.02]}
        size={[0.49, 0.035, 0.18]}
        color="#eee9df"
        radius={0.014}
      />
      <Box
        position={[-0.59, 0.92, -0.09]}
        size={[0.25, 0.035, 0.3]}
        color={member.color}
        radius={0.015}
      />
      <mesh position={[0.62, 0.98, -0.34]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.17, 12]} />
        <meshStandardMaterial color="#f7f0e5" />
      </mesh>
      <Box
        position={[0, 0.39, 0.63]}
        size={[0.62, 0.12, 0.58]}
        color={member.color}
        radius={0.09}
      />
      <Box
        position={[0, 0.72, 0.86]}
        size={[0.63, 0.58, 0.09]}
        color={member.color}
        radius={0.07}
      />
      <Box
        position={[0, 0.17, 0.62]}
        size={[0.08, 0.34, 0.08]}
        color="#b8b2a9"
      />
      <group
        position={[0, 0.42, 0.49]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <Avatar color={member.color} variant={index} active={active} />
        <mesh position={[0, 0.7, 0]} visible={false}>
          <boxGeometry args={[0.9, 1.5, 0.9]} />
        </mesh>
      </group>
      {selected && (
        <mesh position={[0, 0.025, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.48, 0.53, 40]} />
          <meshBasicMaterial color="#b87755" transparent opacity={0.65} />
        </mesh>
      )}
    </group>
  );
}
function Room({
  selected,
  onSelect,
  active,
  showLabels,
}: {
  selected: Role;
  onSelect: (id: Role) => void;
  active?: Role;
  showLabels: boolean;
}) {
  const positions: V3[] = [
    [-2.65, 0, -1.65],
    [0, 0, -1.65],
    [2.65, 0, -1.65],
    [-1.4, 0, 1.15],
    [1.4, 0, 1.15],
  ];
  return (
    <group position={[0, -0.45, 0]}>
      <Box
        position={[0, -0.16, 0]}
        size={[10, 0.32, 7.8]}
        color="#d3b89a"
        radius={0.15}
      />
      <Box
        position={[0, 0.015, 0]}
        size={[9.85, 0.04, 7.65]}
        color="#ede0cc"
        radius={0.02}
      />
      {Array.from({ length: 15 }, (_, i) => (
        <Box
          key={i}
          position={[-4.6 + i * 0.65, 0.04, 0]}
          size={[0.012, 0.005, 7.5]}
          color="#decbb3"
          radius={0.001}
        />
      ))}
      <Box
        position={[0, 1.35, -3.8]}
        size={[10, 2.7, 0.16]}
        color="#e9dcc6"
        radius={0.04}
      />
      <Box
        position={[-4.93, 1.35, 0]}
        size={[0.16, 2.7, 7.7]}
        color="#e5d5bb"
        radius={0.04}
      />
      <Box
        position={[0, 0.14, -3.67]}
        size={[9.8, 0.25, 0.1]}
        color="#dac9af"
        radius={0.01}
      />
      <Box
        position={[-4.82, 0.14, 0]}
        size={[0.1, 0.25, 7.6]}
        color="#dac9af"
        radius={0.01}
      />
      <Box
        position={[-4.82, 1.68, -1.65]}
        size={[0.08, 1.64, 2.55]}
        color="#f9f4e8"
      />
      <Box
        position={[-4.76, 1.68, -1.65]}
        size={[0.025, 1.42, 2.31]}
        color="#b5d0cb"
        radius={0.01}
      />
      <Box
        position={[-4.72, 1.68, -1.65]}
        size={[0.05, 1.48, 0.075]}
        color="#faf6ec"
      />
      <Box
        position={[-4.72, 1.68, -1.65]}
        size={[0.05, 0.07, 2.38]}
        color="#faf6ec"
      />
      <Box
        position={[-4.68, 0.92, -1.65]}
        size={[0.33, 0.09, 2.62]}
        color="#f9f4e8"
      />
      <Box
        position={[0.1, 1.93, -3.68]}
        size={[2.3, 0.76, 0.06]}
        color="#f8f1e5"
      />
      <WallSign />
      <Box
        position={[3.35, 1.8, -3.64]}
        size={[0.8, 1.05, 0.1]}
        color="#b27c5c"
      />
      <Box
        position={[3.35, 1.8, -3.57]}
        size={[0.68, 0.91, 0.035]}
        color="#e8b99a"
        radius={0.01}
      />
      <mesh position={[3.35, 1.94, -3.54]}>
        <circleGeometry args={[0.21, 24]} />
        <meshStandardMaterial color="#f9e4bd" />
      </mesh>
      <Box
        position={[-1.05, 0.06, 0.3]}
        size={[5.85, 0.045, 4.55]}
        color="#c5cbb5"
        radius={0.18}
      />
      {positions.map((position, i) => (
        <Desk
          key={team[i].id}
          position={position}
          member={team[i]}
          index={i}
          selected={selected === team[i].id}
          active={active === team[i].id}
          onSelect={() => onSelect(team[i].id)}
          showLabels={showLabels}
        />
      ))}
      <Plant position={[-4.1, 0, -2.95]} scale={1.2} />
      <Plant position={[4.17, 0, -3.03]} scale={1.3} />
      <Plant position={[4.28, 0, 3.12]} scale={1.15} />
      <Box
        position={[-4.15, 0.54, 1.8]}
        size={[1.02, 0.6, 2.1]}
        color="#c19b7a"
        radius={0.17}
      />
      <Box
        position={[-4.56, 0.87, 1.8]}
        size={[0.21, 0.79, 2.1]}
        color="#c19b7a"
        radius={0.1}
      />
      {[-0.64, 0.64].map((z) => (
        <Box
          key={z}
          position={[-4.05, 0.87, 1.8 + z]}
          size={[0.8, 0.14, 0.85]}
          color="#e5c9a3"
          radius={0.07}
        />
      ))}
      <Box
        position={[-4.06, 1.03, 1.4]}
        size={[0.31, 0.41, 0.43]}
        color="#8b9e87"
        radius={0.07}
        rotation={[0, 0, -0.3]}
      />
      <mesh position={[-2.8, 0.45, 3.03]} castShadow>
        <cylinderGeometry args={[0.53, 0.53, 0.09, 32]} />
        <meshStandardMaterial color="#c9a17b" />
      </mesh>
      <Box
        position={[-2.8, 0.23, 3.03]}
        size={[0.08, 0.42, 0.08]}
        color="#b79170"
      />
      <Box
        position={[-2.8, 0.52, 3.03]}
        size={[0.38, 0.045, 0.26]}
        color="#9aab96"
      />
      <Box
        position={[4.25, 0.58, 0.9]}
        size={[0.78, 1.12, 1.83]}
        color="#d8bd99"
      />
      {[0.3, 0.64, 0.98].map((y) => (
        <Box
          key={y}
          position={[3.84, y, 0.9]}
          size={[0.025, 0.015, 1.65]}
          color="#b39473"
          radius={0.002}
        />
      ))}
      <Plant position={[4.2, 1.15, 0.38]} scale={0.55} />
      <Box
        position={[4.2, 1.19, 1.32]}
        size={[0.43, 0.12, 0.32]}
        color="#9eacaf"
      />
      <Box
        position={[4.2, 1.27, 1.32]}
        size={[0.4, 0.05, 0.3]}
        color="#ebd5b6"
      />
    </group>
  );
}
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-fallback">
        <span>⌂</span>
        <h3>Your team is still here.</h3>
        <p>
          3D needs browser hardware acceleration.
          <br />
          You can use every workspace control below.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function Office({
  selected,
  onSelect,
  active,
  showLabels,
  resetKey,
}: {
  selected: Role;
  onSelect: (id: Role) => void;
  active?: Role;
  showLabels: boolean;
  resetKey: number;
}) {
  const labelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <div className="scene-fallback">Opening the studio…</div>;
  return (
    <SceneBoundary>
      <div style={{ height: "100%", position: "relative" }}>
        <Canvas
          key={resetKey}
          shadows
          dpr={[1, 1.75]}
          orthographic
          camera={{ position: [12, 11, 15], zoom: 48, near: 0.1, far: 100 }}
          onCreated={({ camera }) => camera.lookAt(0, 0.3, 0)}
          gl={{ antialias: true, alpha: true }}
        >
          <LabelPositions elements={labelRefs} />
          <FitCamera />
          <ambientLight intensity={1.4} />
          <hemisphereLight args={["#fff7df", "#d1c5b3", 1.2]} />
          <directionalLight
            position={[-3, 10, 6]}
            intensity={2}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
            shadow-bias={-0.0005}
          />
          <Suspense fallback={null}>
            <Room
              selected={selected}
              onSelect={onSelect}
              active={active}
              showLabels={showLabels}
            />
          </Suspense>
          <OrbitControls
            makeDefault
            target={[0, 0.3, 0]}
            enablePan={false}
            minZoom={18}
            maxZoom={85}
            minPolarAngle={0.35}
            maxPolarAngle={Math.PI / 2.4}
            minAzimuthAngle={-0.35}
            maxAzimuthAngle={Math.PI / 2.1}
          />
        </Canvas>
        {showLabels &&
          team.map((m, i) => (
            <button
              key={m.id}
              ref={(el) => {
                labelRefs.current[i] = el;
              }}
              className={`scene-label ${selected === m.id ? "selected" : ""}`}
              style={{
                position: "absolute",
                transform: "translate(-50%,-50%)",
                zIndex: 21,
              }}
              onClick={() => onSelect(m.id)}
            >
              <span
                style={{ background: active === m.id ? "#70a38a" : m.color }}
              />
              {m.name}
              {active === m.id && <i>working</i>}
            </button>
          ))}
      </div>
    </SceneBoundary>
  );
}
