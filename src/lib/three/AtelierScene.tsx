import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { getSoftSprite, makeLabelTexture } from "./canvasText";

export interface PortalDef {
  id: string;
  label: string;
  sub: string;
  path: string;
  color: string;
  angle: number;
  radius: number;
  height: number;
}

export interface AtelierSceneProps {
  portals: PortalDef[];
  reducedMotion: boolean;
  onHover: (id: string | null) => void;
  onEnter: (portal: PortalDef) => void;
  onEnterStudio: () => void;
}

const GOLD = "#C9A13B";
const GOLD_DEEP = "#A16207";
const IVORY = "#F8F4EA";
const BG = "#0f0c09";
const FOG = "#14100d";

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/* ------------------------------------------------------------------ */
/* Camera: damped orbit (drag to look, wheel to approach) + portal     */
/* glide. While gliding, user input is locked and the camera eases     */
/* toward the chosen portal, then fires onArrived.                     */
/* ------------------------------------------------------------------ */
function CameraRig({
  glide,
  onArrived,
}: {
  glide: MutableRefObject<{ id: string; pos: THREE.Vector3 } | null>;
  onArrived: (id: string) => void;
}) {
  const { camera, gl } = useThree();
  const s = useRef({
    theta: 0.45,
    phi: 1.18,
    radius: 14.5,
    tTheta: 0.45,
    tPhi: 1.18,
    tRadius: 14.5,
    dragging: false,
    px: 0,
    py: 0,
    arrived: false,
  });

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      if (glide.current || e.button !== 0) return;
      s.current.dragging = true;
      s.current.px = e.clientX;
      s.current.py = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!s.current.dragging || glide.current) return;
      const dx = e.clientX - s.current.px;
      const dy = e.clientY - s.current.py;
      s.current.px = e.clientX;
      s.current.py = e.clientY;
      s.current.tTheta -= dx * 0.0052;
      s.current.tPhi = clamp(s.current.tPhi - dy * 0.004, 0.85, 1.42);
    };
    const up = () => {
      s.current.dragging = false;
    };
    const wheel = (e: WheelEvent) => {
      if (glide.current) return;
      e.preventDefault();
      s.current.tRadius = clamp(s.current.tRadius + e.deltaY * 0.006, 6.5, 20);
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl, glide]);

  useFrame((_, dt) => {
    const st = s.current;
    const g = glide.current;
    if (g) {
      const k = Math.min(1, dt * 3.2);
      camera.position.lerp(g.pos, k);
      camera.lookAt(0, 1.0, 0);
      if (!st.arrived && camera.position.distanceTo(g.pos) < 0.55) {
        st.arrived = true;
        onArrived(g.id);
      }
      return;
    }
    st.arrived = false;
    const k = Math.min(1, dt * 5);
    st.theta += (st.tTheta - st.theta) * k;
    st.phi += (st.tPhi - st.phi) * k;
    st.radius += (st.tRadius - st.radius) * k;
    const sinPhi = Math.sin(st.phi);
    camera.position.set(
      st.radius * sinPhi * Math.sin(st.theta),
      1.0 + st.radius * Math.cos(st.phi),
      st.radius * sinPhi * Math.cos(st.theta),
    );
    camera.lookAt(0, 1.0, 0);
  });

  return null;
}

/* ------------------------------------------------------------------ */
/* Floor stage: a dark marble disc with gold hairlines + radial sheen  */
/* ------------------------------------------------------------------ */
function FloorStage() {
  const soft = useMemo(() => getSoftSprite(), []);
  return (
    <group>
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[11.5, 80]} />
        <meshStandardMaterial color="#171310" metalness={0.25} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[10.8, 10.87, 96]} />
        <meshBasicMaterial color={GOLD_DEEP} toneMapped={false} transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.3, 2.38, 72]} />
        <meshBasicMaterial color={GOLD_DEEP} toneMapped={false} transparent opacity={0.35} />
      </mesh>
      <sprite position={[0, 0.12, 0]} scale={[21, 21, 1]}>
        <spriteMaterial
          map={soft}
          color={GOLD_DEEP}
          transparent
          opacity={0.05}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* The maison core — a small pavilion of ivory columns under a gold    */
/* halo. Clicking its heart is the way into the Studio.                */
/* ------------------------------------------------------------------ */
function MaisonCore({
  reducedMotion,
  onHover,
  onEnter,
}: {
  reducedMotion: boolean;
  onHover: (id: string | null) => void;
  onEnter: () => void;
}) {
  const core = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const soft = useMemo(() => getSoftSprite(), []);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    if (core.current) core.current.scale.setScalar(1 + Math.sin(t * 1.8) * 0.05);
    if (halo.current) halo.current.rotation.z = t * 0.4;
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    onHover("__studio");
    document.body.style.cursor = "pointer";
  };
  const out = () => {
    setHovered(false);
    onHover(null);
    document.body.style.cursor = "auto";
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onEnter();
  };

  return (
    <group>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[1.75, 2.0, 0.2, 48]} />
        <meshStandardMaterial color="#201a15" roughness={0.7} metalness={0.3} />
      </mesh>
      {[
        [-0.95, -0.95],
        [0.95, -0.95],
        [-0.95, 0.95],
        [0.95, 0.95],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.45, z]}>
          <cylinderGeometry args={[0.11, 0.14, 2.9, 20]} />
          <meshStandardMaterial color={IVORY} roughness={0.55} metalness={0.05} />
        </mesh>
      ))}
      <mesh
        ref={core}
        position={[0, 1.55, 0]}
        onClick={click}
        onPointerOver={over}
        onPointerOut={out}
      >
        <sphereGeometry args={[0.5, 40, 40]} />
        <meshBasicMaterial color={hovered ? "#E9C767" : GOLD} toneMapped={false} />
      </mesh>
      <sprite position={[0, 1.55, 0]} scale={[3.6, 3.6, 1]}>
        <spriteMaterial
          map={soft}
          color={GOLD_DEEP}
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
      <mesh ref={halo} position={[0, 2.78, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.3, 0.045, 16, 96]} />
        <meshBasicMaterial color={GOLD} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* A portal: glowing ring + coloured gateway + soft halo + label.      */
/* Hover highlights; click glides the camera and asks to enter.        */
/* ------------------------------------------------------------------ */
function PortalRing({
  def,
  index,
  positions,
  gliding,
  reducedMotion,
  onHover,
  onSelect,
}: {
  def: PortalDef;
  index: number;
  positions: MutableRefObject<Map<string, THREE.Vector3>>;
  gliding: MutableRefObject<{ id: string; pos: THREE.Vector3 } | null>;
  reducedMotion: boolean;
  onHover: (id: string | null) => void;
  onSelect: (def: PortalDef) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const disc = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const soft = useMemo(() => getSoftSprite(), []);
  const label = useMemo(
    () => makeLabelTexture({ text: def.label, sub: def.sub }),
    [def],
  );
  const pos = useMemo(
    () =>
      new THREE.Vector3(
        Math.sin(def.angle) * def.radius,
        def.height,
        Math.cos(def.angle) * def.radius,
      ),
    [def],
  );

  useEffect(() => {
    positions.current.set(def.id, pos);
  }, [positions, def.id, pos]);

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    if (reducedMotion) {
      g.position.y = pos.y;
      return;
    }
    const t = clock.elapsedTime;
    g.position.y = pos.y + Math.sin(t * 1.4 + index * 2) * 0.07;
    if (halo.current) halo.current.rotation.z = t * 0.35;
    if (disc.current) {
      const mat = disc.current.material as THREE.MeshBasicMaterial;
      mat.opacity = hovered ? 1 : 0.72 + Math.sin(t * 2 + index) * 0.12;
    }
    const targetScale = hovered ? 1.07 : 1;
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, targetScale, Math.min(1, dt * 8)));
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    onHover(def.id);
    document.body.style.cursor = "pointer";
  };
  const out = () => {
    setHovered(false);
    onHover(null);
    document.body.style.cursor = "auto";
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!gliding.current) onSelect(def);
  };

  return (
    <group
      ref={group}
      position={[pos.x, pos.y, pos.z]}
      rotation={[0, def.angle, 0]}
      onClick={click}
      onPointerOver={over}
      onPointerOut={out}
    >
      <pointLight color={def.color} intensity={1.1} distance={8} decay={2} />
      <mesh ref={halo}>
        <torusGeometry args={[1.05, 0.075, 24, 72]} />
        <meshBasicMaterial color={hovered ? "#E9C767" : GOLD} toneMapped={false} />
      </mesh>
      <mesh ref={disc} position={[0, 0, 0]}>
        <circleGeometry args={[0.98, 64]} />
        <meshBasicMaterial
          color={def.color}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <sprite position={[0, 0, -0.25]} scale={[4.4, 4.4, 1]}>
        <spriteMaterial
          map={soft}
          color={def.color}
          transparent
          opacity={0.42}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
      <sprite position={[0, 2.1, 0]} scale={[label.aspect * 0.95, 0.95, 1]}>
        <spriteMaterial map={label.texture} transparent depthWrite={false} />
      </sprite>
      {/* ground glow under the portal */}
      <sprite position={[0, -def.height, 0]} scale={[3.6, 3.6, 1]}>
        <spriteMaterial
          map={soft}
          color={def.color}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Drifting dust motes — soft, additive, slow.                         */
/* ------------------------------------------------------------------ */
function DriftParticles({
  count = 420,
  reducedMotion,
}: {
  count?: number;
  reducedMotion: boolean;
}) {
  const ref = useRef<THREE.Points>(null);
  const { positions, speeds, phases } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const sp = new Float32Array(count);
    const ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 2 + Math.random() * 12;
      const a = Math.random() * Math.PI * 2;
      p[i * 3] = Math.sin(a) * r;
      p[i * 3 + 1] = Math.random() * 7;
      p[i * 3 + 2] = Math.cos(a) * r;
      sp[i] = 0.05 + Math.random() * 0.15;
      ph[i] = Math.random() * Math.PI * 2;
    }
    return { positions: p, speeds: sp, phases: ph };
  }, [count]);
  const soft = useMemo(() => getSoftSprite(), []);

  useFrame((_, dt) => {
    if (reducedMotion || !ref.current) return;
    const attr = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const now = performance.now();
    for (let i = 0; i < count; i++) {
      let y = arr[i * 3 + 1] + speeds[i] * dt;
      if (y > 7) y = 0.1;
      arr[i * 3 + 1] = y;
      arr[i * 3] += Math.sin(phases[i] + now * 0.0002) * 0.0008;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={soft}
        color="#F5E9D0"
        size={0.11}
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/* A slow ring of low clouds beneath the stage.                        */
/* ------------------------------------------------------------------ */
function CloudRing({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const clouds = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        a: (i / 9) * Math.PI * 2 + Math.random() * 0.5,
        r: 16 + Math.random() * 9,
        s: 8 + Math.random() * 9,
        y: -1.5 - Math.random() * 1.2,
      })),
    [],
  );
  const soft = useMemo(() => getSoftSprite(), []);

  useFrame(({ clock }) => {
    if (!reducedMotion && group.current) {
      group.current.rotation.y = clock.elapsedTime * 0.008;
    }
  });

  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <sprite
          key={i}
          position={[Math.sin(c.a) * c.r, c.y, Math.cos(c.a) * c.r]}
          scale={[c.s, c.s * 0.5, 1]}
        >
          <spriteMaterial
            map={soft}
            color={IVORY}
            transparent
            opacity={0.05}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* The scene.                                                          */
/* ------------------------------------------------------------------ */
export default function AtelierScene({
  portals,
  reducedMotion,
  onHover,
  onEnter,
  onEnterStudio,
}: AtelierSceneProps) {
  const positions = useRef(new Map<string, THREE.Vector3>());
  const glide = useRef<{ id: string; pos: THREE.Vector3 } | null>(null);

  const handleSelect = useCallback(
    (def: PortalDef) => {
      if (glide.current) return;
      const p = positions.current.get(def.id);
      if (!p) return;
      const target = new THREE.Vector3(
        Math.sin(def.angle) * (def.radius + 1.4),
        p.y + 0.9,
        Math.cos(def.angle) * (def.radius + 1.4),
      );
      glide.current = { id: def.id, pos: target };
      document.body.style.cursor = "auto";
    },
    [],
  );

  const handleArrived = useCallback(
    (id: string) => {
      const def = portals.find((p) => p.id === id);
      glide.current = null;
      if (def) onEnter(def);
    },
    [portals, onEnter],
  );

  const handleEnterStudio = useCallback(() => {
    if (glide.current) return;
    onEnterStudio();
  }, [onEnterStudio]);

  const handleMiss = useCallback(() => {
    onHover(null);
    document.body.style.cursor = "auto";
  }, [onHover]);

  return (
    <>
      <color attach="background" args={[BG]} />
      <fogExp2 attach="fog" args={[FOG, 0.03]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[6, 10, 4]} intensity={0.55} color={IVORY} />
      <pointLight position={[0, 4, 0]} intensity={1.4} distance={14} decay={2} color="#D6A94C" />
      <group onPointerMissed={handleMiss}>
        <FloorStage />
        <MaisonCore
          reducedMotion={reducedMotion}
          onHover={onHover}
          onEnter={handleEnterStudio}
        />
        {portals.map((def, i) => (
          <PortalRing
            key={def.id}
            def={def}
            index={i}
            positions={positions}
            gliding={glide}
            reducedMotion={reducedMotion}
            onHover={onHover}
            onSelect={handleSelect}
          />
        ))}
        <DriftParticles reducedMotion={reducedMotion} />
        <CloudRing reducedMotion={reducedMotion} />
      </group>
      <CameraRig glide={glide} onArrived={handleArrived} />
    </>
  );
}
