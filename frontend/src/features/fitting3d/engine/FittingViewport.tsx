import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { adultProfiles, modelReferenceHeight } from "./anatomy";
import type { FittingOutfit } from "@domain";
import { GarmentMockupSvg } from "../../../components/GarmentMockupSvg";
import {
  createFittingModel,
  type FittingModel,
  type SemanticPart,
} from "./model";
import { createGltfFittingModel, type GltfFittingModel } from "./modular/GltfFittingModel";

export interface FittingViewportHandle {
  capture(): Promise<string>;
  resetView(camera: FittingOutfit["camera"]): void;
}
export interface FittingViewportProps {
  outfit: FittingOutfit;
  onPartSelect: (part: SemanticPart) => void;
  onReady?: (ready: boolean) => void;
  /** `portfolio` preserves the detailed preview; `game` targets mobile GLB authoring. */
  quality?: "game" | "portfolio";
  /** Shows the rigging authoring pose: both arms opened 45 degrees. */
  authoringPose?: boolean;
  mannequin?: boolean;
}
type RenderState = "loading" | "ready" | "unsupported" | "error";
type Runtime = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  model: FittingModel | null;
  targetCamera: THREE.Vector3;
  targetLookAt: THREE.Vector3;
  cameraTransition: boolean;
  dirty: boolean;
  pose: FittingOutfit["pose"];
  gender?: FittingOutfit["gender"];
};
function frameModel(
  current: Runtime,
  preset: FittingOutfit["camera"],
  gender: FittingOutfit["gender"],
) {
  const scale = adultProfiles[gender].height / modelReferenceHeight;
  const presets = {
    full: {
      position: [0.34, 0.95 * scale, 3.42 * scale],
      target: [0, 0.88 * scale, 0],
    },
    head: {
      position: [0.04, 1.63 * scale, 0.91 * scale],
      target: [0, 1.56 * scale, 0],
    },
    hem: {
      position: [0.12, 0.43 * scale, 1.52 * scale],
      target: [0, 0.35 * scale, 0],
    },
  };
  const view = presets[preset];
  current.targetCamera.set(...(view.position as [number, number, number]));
  current.targetLookAt.set(...(view.target as [number, number, number]));
  current.cameraTransition = true;
  current.dirty = true;
}

/** A real local WebGL scene. All illustrative models are generated locally. */
export const FittingViewport = forwardRef<
  FittingViewportHandle,
  FittingViewportProps
>(function FittingViewport({ outfit, onPartSelect, onReady, quality="portfolio", authoringPose=false, mannequin=false }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<Runtime | null>(null);
  const callbacks = useRef({ onPartSelect, onReady });
  callbacks.current = { onPartSelect, onReady };
  const [state, setState] = useState<RenderState>("loading");
  const [retry, setRetry] = useState(0);
  const reducedMotion = useRef(false);
  const outfitRef = useRef(outfit);
  outfitRef.current = outfit;
  const previousCamera = useRef<string | null>(null);
  const builtShape = useRef("");
  const generation = useRef(0);
  const pending = useRef<Promise<void>>(Promise.resolve());
  const [engine,setEngine] = useState("loading");
  const shapeSignature = JSON.stringify({
    gender: outfit.gender,
    garment: outfit.garmentId,
    colors: outfit.colors,
    fabric: outfit.fabric,
    layers: outfit.layers,
    accessories: outfit.accessories,
    pattern: outfit.pattern,
    pose: outfit.pose,
    quality,
    authoringPose,
    mannequin,
  });

  useImperativeHandle(
    ref,
    () => ({
      resetView(camera) {
        if (runtime.current)
          frameModel(runtime.current, camera, outfitRef.current.gender);
      },
      async capture() {
        const current = runtime.current;
        if (!current || state !== "ready")
          throw new Error("Khung 3D chưa sẵn sàng để chụp ảnh.");
        current.renderer.render(current.scene, current.camera);
        return current.renderer.domElement.toDataURL("image/png");
      },
    }),
    [state],
  );

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    setState("loading");
    callbacks.current.onReady?.(false);
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      setState("unsupported");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor("#eeeee5");
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.cssText =
      "display:block;width:100%;height:100%;touch-action:none;outline:none";
    renderer.domElement.setAttribute(
      "aria-label",
      "Mẫu thử Việt phục 3D; kéo để xoay, cuộn hoặc chụm hai ngón để phóng to",
    );
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.tabIndex = 0;
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#eeeee5");
    const camera = new THREE.PerspectiveCamera(34, 1, 0.03, 30);
    camera.position.set(0.3, 1.02, 3.72);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.9, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.085;
    controls.minDistance = 0.4;
    controls.maxDistance = 5;
    controls.minPolarAngle = Math.PI * 0.16;
    controls.maxPolarAngle = Math.PI * 0.535;
    controls.maxTargetRadius = 0.65;
    controls.cursor.set(0, 0.96, 0);
    controls.panSpeed = 0.45;
    controls.rotateSpeed = 0.58;
    controls.enablePan = true;
    controls.update();
    scene.add(new THREE.HemisphereLight("#fff8ec", "#60766c", 1.65));
    const key = new THREE.DirectionalLight("#fff5e7", 2.5);
    key.position.set(-2.5, 4, 3.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -1.2;
    key.shadow.camera.right = 1.2;
    key.shadow.camera.top = 2.2;
    key.shadow.camera.bottom = -0.4;
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 10;
    key.shadow.normalBias = 0.016;
    key.shadow.bias = -0.0002;
    key.target.position.set(0, 0.9, 0);
    scene.add(key, key.target);
    const fill = new THREE.DirectionalLight("#dfe9f6", 1.25);
    fill.position.set(3, 2, 1);
    scene.add(fill);
    const rim = new THREE.DirectionalLight("#f5d9ae", 1.7);
    rim.position.set(1.6, 2.7, -2.5);
    scene.add(rim);
    const studioGeometries: THREE.BufferGeometry[] = [],
      studioMaterials: THREE.Material[] = [];
    function studioMesh(
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
    ) {
      studioGeometries.push(geometry);
      studioMaterials.push(material);
      const object = new THREE.Mesh(geometry, material);
      scene.add(object);
      object.receiveShadow = true;
      return object;
    }
    const podium = studioMesh(
      new THREE.CylinderGeometry(0.53, 0.55, 0.068, 80),
      new THREE.MeshStandardMaterial({ color: "#dddccf", roughness: 0.88 }),
    );
    podium.position.y = -0.048;
    const floor = studioMesh(
      new THREE.CircleGeometry(8, 64),
      new THREE.MeshStandardMaterial({ color: "#eeeee5", roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.084;
    const outerRing = studioMesh(
      new THREE.TorusGeometry(0.49, 0.0015, 5, 96),
      new THREE.MeshStandardMaterial({ color: "#bfa57b", roughness: 0.75 }),
    );
    outerRing.rotation.x = Math.PI / 2;
    outerRing.position.y = -0.012;

    const current: Runtime = {
      renderer,
      scene,
      camera,
      controls,
      model: null,
      targetCamera: camera.position.clone(),
      targetLookAt: controls.target.clone(),
      cameraTransition: false,
      dirty: true,
      pose: outfitRef.current.pose,
    };
    runtime.current = current;
    previousCamera.current = null;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = reduced.matches;
    const updateMotion = () => {
      reducedMotion.current = reduced.matches;
      current.dirty = true;
    };
    reduced.addEventListener("change", updateMotion);
    const observer = new ResizeObserver(() => {
      const width = Math.max(1, container.clientWidth),
        height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      current.dirty = true;
    });
    observer.observe(container);
    const onControl = () => {
      current.dirty = true;
    };
    const onControlStart = () => {
      current.cameraTransition = false;
    };
    controls.addEventListener("change", onControl);
    controls.addEventListener("start", onControlStart);
    const pointerStart = new THREE.Vector2();
    const ray = new THREE.Raycaster();
    const onPointerDown = (event: PointerEvent) =>
      pointerStart.set(event.clientX, event.clientY);
    const onPointerUp = (event: PointerEvent) => {
      if (
        pointerStart.distanceTo(
          new THREE.Vector2(event.clientX, event.clientY),
        ) > 6 ||
        !current.model
      )
        return;
      const rect = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(
        new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hit = ray.intersectObject(current.model.root, true)[0];
      if (hit?.object.userData.part)
        callbacks.current.onPartSelect(
          hit.object.userData.part as SemanticPart,
        );
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    const onLost = (event: Event) => {
      event.preventDefault();
      setState("error");
      callbacks.current.onReady?.(false);
    };
    renderer.domElement.addEventListener("webglcontextlost", onLost);
    let frame = 0,
      active = true,
      last = performance.now();
    const animate = (now: number) => {
      if (!active) return;
      frame = requestAnimationFrame(animate);
      if (document.hidden) return;
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      const walking = current.pose === "walk" && !reducedMotion.current;
      if (current.cameraTransition) {
        const factor = reducedMotion.current ? 1 : 1 - Math.exp(-delta * 9);
        camera.position.lerp(current.targetCamera, factor);
        controls.target.lerp(current.targetLookAt, factor);
        if (
          camera.position.distanceTo(current.targetCamera) < 0.002 &&
          controls.target.distanceTo(current.targetLookAt) < 0.002
        )
          current.cameraTransition = false;
        current.dirty = true;
      }
      controls.update(delta);
      if (current.dirty || walking) {
        current.model?.animate(now / 1000, walking);
        renderer.render(scene, camera);
        current.dirty = false;
      }
    };
    frame = requestAnimationFrame(animate);
    return () => {
      generation.current++;
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      reduced.removeEventListener("change", updateMotion);
      controls.removeEventListener("change", onControl);
      controls.removeEventListener("start", onControlStart);
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      current.model?.dispose();
      studioGeometries.forEach((g) => g.dispose());
      studioMaterials.forEach((m) => m.dispose());
      key.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      runtime.current = null;
      callbacks.current.onReady?.(false);
    };
  }, [retry]);

  useEffect(() => {
    const current = runtime.current;
    if (!current) return;
    const ticket=++generation.current;
    const cameraKey = `${outfit.camera}:${outfit.gender}`;
    if (previousCamera.current !== cameraKey) {
      frameModel(current, outfit.camera, outfit.gender);
      previousCamera.current = cameraKey;
    }
    if(current.model&&builtShape.current===shapeSignature){current.dirty=true;return;}
    setState("loading");callbacks.current.onReady?.(false);
    pending.current=pending.current.catch(()=>{}).then(async()=>{
      if(ticket!==generation.current||runtime.current!==current)return;
      try {
        if(!current.model||current.gender!==outfit.gender||!("sync" in current.model)){
          const next=await createGltfFittingModel(outfit,mannequin||authoringPose);
          if(ticket!==generation.current||runtime.current!==current){next.dispose();return;}
          if(current.model){current.scene.remove(current.model.root);current.model.dispose();}
          current.model=next;current.gender=outfit.gender;current.scene.add(next.root);
        }else await (current.model as GltfFittingModel).sync(outfit,mannequin||authoringPose);
        if(ticket!==generation.current||runtime.current!==current)return;
        current.pose=outfit.pose;current.model.animate(0,false);builtShape.current=shapeSignature;
        setEngine("gltf");current.dirty=true;current.renderer.render(current.scene,current.camera);
        setState("ready");callbacks.current.onReady?.(true);
      }catch(error){
        if(ticket!==generation.current||runtime.current!==current)return;
        console.error("Không thể tải mannequin GLB",error);setEngine("error");setState("error");callbacks.current.onReady?.(false);
      }
    });
  }, [outfit, retry, shapeSignature]);

  const fallback = state === "unsupported" || state === "error";
  return (
    <div
      className="fitting3d-viewport"
      data-testid="fitting3d-viewport"
      data-render-state={state}
      data-garment={outfit.garmentId}
      data-gender={outfit.gender}
      data-body-height={adultProfiles[outfit.gender].height}
      data-engine={engine}
      data-mannequin={mannequin?"true":"false"}
      data-wireframe="false"
      data-render-quality={quality}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 480,
        overflow: "hidden",
        background: "#eeeee5",
        borderRadius: 24,
      }}
    >
      <div
        ref={host}
        style={{
          position: "absolute",
          inset: 0,
          visibility: fallback ? "hidden" : "visible",
        }}
      />
      {state === "loading" && (
        <div
          role="status"
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: "#31554a",
          }}
        >
          Đang dựng phòng thử 3D…
        </div>
      )}
      {fallback && (
        <div style={{ position: "relative", padding: 24, textAlign: "center" }}>
          <p role="status" style={{ fontWeight: 600 }}>
            {state === "unsupported"
              ? "Thiết bị chưa hỗ trợ WebGL"
              : "Khung 3D tạm gián đoạn"}
          </p>
          <p style={{ fontSize: 13, margin: "8px 0 16px" }}>
            Bạn vẫn có thể xem bản minh họa 2D. Thử lại để khởi tạo phòng 3D.
          </p>
          <div style={{ maxWidth: 260, margin: "auto" }}>
            <GarmentMockupSvg
              garmentId={
                outfit.garmentId === "ao_dai" ||
                outfit.garmentId === "ao_dai_cach_tan"
                  ? "ao_dai"
                  : "ao_ngu_than"
              }
              gender={outfit.gender}
              primaryColor={outfit.colors.main}
              accentColor={outfit.colors.pants}
              selectedAccessories={outfit.accessories}
              pattern={outfit.pattern}
            />
          </div>
          <button
            type="button"
            onClick={() => setRetry((n) => n + 1)}
            style={{
              padding: "10px 20px",
              marginTop: 16,
              border: "1px solid #31554a",
              borderRadius: 12,
              background: "#fffdf6",
              color: "#31554a",
            }}
          >
            Thử lại 3D
          </button>
        </div>
      )}
    </div>
  );
});

export default FittingViewport;
