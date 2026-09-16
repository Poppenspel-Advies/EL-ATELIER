import { Canvas } from "@react-three/fiber";
import AtelierScene, { AtelierSceneProps } from "../lib/three/AtelierScene";

/**
 * Lazy-loaded entry point for the 3D maison. Keeping the heavy WebGL
 * dependencies (three + react-three-fiber) in this module means they are
 * code-split out of the rest of the app.
 */
export default function MaisonCanvas(props: AtelierSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      camera={{ position: [5.9, 6.6, 12.1], fov: 50, near: 0.1, far: 120 }}
      aria-label="3D view of the EL ATELIER maison with glowing portals for each module"
    >
      <AtelierScene {...props} />
    </Canvas>
  );
}
