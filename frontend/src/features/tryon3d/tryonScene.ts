import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  createGltfFittingModel,
  type GltfFittingModel,
} from "../fitting3d/engine/modular/GltfFittingModel";
import { defaultFittingOutfit, type FittingOutfit } from "@domain";

export interface TryOnSceneOptions {
  container: HTMLDivElement;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onLoadProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

export class TryOnSceneManager {
  private container: HTMLDivElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;

  private currentModel: GltfFittingModel | null = null;
  public outfit: FittingOutfit;

  private podiumGroup: THREE.Group;
  private directionalKeyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;

  private isDisposed = false;
  private animationFrameId: number | null = null;
  private clock = new THREE.Clock();
  private isAutoRotating = false;

  private onLoadStart?: () => void;
  private onLoadComplete?: () => void;
  private onLoadProgress?: (progress: number) => void;
  private onError?: (error: Error) => void;

  constructor(options: TryOnSceneOptions, initialOutfit: FittingOutfit = defaultFittingOutfit) {
    this.container = options.container;
    this.onLoadStart = options.onLoadStart;
    this.onLoadComplete = options.onLoadComplete;
    this.onLoadProgress = options.onLoadProgress;
    this.onError = options.onError;

    // Đảm bảo ban đầu luôn bật Quần (base), Lớp lót (lining) và Áo chính (garment)
    this.outfit = {
      ...initialOutfit,
      layers: {
        ...initialOutfit.layers,
        base: true, // Luôn mặc Quần
        lining: true, // Áo lót trong
        garment: true, // Áo chính
        head: true,
        accessories: true,
      },
    };

    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;

    // 1. KHỞI TẠO SCENE VỚI BACKGROUND MÀU TRẮNG STUDIO SANG TRỌNG
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#F8FAFC"); // Trắng ngà studio
    this.scene.fog = new THREE.FogExp2("#F8FAFC", 0.035);

    // 2. KHỞI TẠO CAMERA
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    this.camera.position.set(0.25, 1.15, 3.2);

    // 3. KHỞI TẠO RENDERER CHUẨN SÁNG
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    // 4. ORBITCONTROLS XOAY 360 ĐỘ
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(0, 0.92, 0);
    this.controls.minDistance = 0.8;
    this.controls.maxDistance = 4.5;
    this.controls.maxPolarAngle = Math.PI * 0.52; // Không quay xuyên dưới sàn

    // 5. HỆ THỐNG ÁNH SÁNG STUDIO NỀN TRẮNG (TÔN DA VÀ MÀU VẢI TỰ NHIÊN)
    this.hemiLight = new THREE.HemisphereLight("#FFFFFF", "#E2E8F0", 1.55);
    this.scene.add(this.hemiLight);

    // Đèn chính góc chéo (Key Light) tạo bóng đổ mềm
    this.directionalKeyLight = new THREE.DirectionalLight("#FFF8F0", 1.95);
    this.directionalKeyLight.position.set(-2.2, 4.2, 3.0);
    this.directionalKeyLight.castShadow = true;
    this.directionalKeyLight.shadow.mapSize.set(1024, 1024);
    this.directionalKeyLight.shadow.bias = -0.00015;
    this.directionalKeyLight.shadow.camera.near = 0.5;
    this.directionalKeyLight.shadow.camera.far = 10;
    this.directionalKeyLight.shadow.camera.left = -1.4;
    this.directionalKeyLight.shadow.camera.right = 1.4;
    this.directionalKeyLight.shadow.camera.top = 2.2;
    this.directionalKeyLight.shadow.camera.bottom = -0.3;
    this.scene.add(this.directionalKeyLight);

    // Đèn chiếu bù (Fill Light) phía đối diện
    const fillLight = new THREE.DirectionalLight("#EEF2F6", 0.9);
    fillLight.position.set(2.5, 2.5, 1.8);
    this.scene.add(fillLight);

    // Đèn ven sau lưng (Rim Light) làm nổi bật đường nét tà áo
    const backRimLight = new THREE.DirectionalLight("#FFFBEB", 0.7);
    backRimLight.position.set(0, 3.0, -2.8);
    this.scene.add(backRimLight);

    // 6. BỤC TRƯNG BÀY SHOWROOM CAO CẤP NỀN TRẮNG
    this.podiumGroup = new THREE.Group();

    // Sàn lớn nhận bóng đổ mịn
    const floorGeo = new THREE.CircleGeometry(6, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: "#F8FAFC",
      roughness: 0.95,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    this.podiumGroup.add(floor);

    // Bục đĩa đá cẩm thạch trắng
    const podiumGeo = new THREE.CylinderGeometry(0.72, 0.75, 0.045, 64);
    const podiumMat = new THREE.MeshStandardMaterial({
      color: "#FFFFFF",
      roughness: 0.35,
      metalness: 0.15,
    });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.y = 0.022;
    podium.receiveShadow = true;
    this.podiumGroup.add(podium);

    // Viền vàng kim tinh tế quanh bục (Gold Ring)
    const goldRingGeo = new THREE.TorusGeometry(0.73, 0.006, 16, 64);
    const goldRingMat = new THREE.MeshStandardMaterial({
      color: "#D4AF37",
      metalness: 0.85,
      roughness: 0.2,
    });
    const goldRing = new THREE.Mesh(goldRingGeo, goldRingMat);
    goldRing.rotation.x = Math.PI / 2;
    goldRing.position.y = 0.045;
    this.podiumGroup.add(goldRing);

    this.scene.add(this.podiumGroup);

    window.addEventListener("resize", this.handleResize);
    this.startAnimationLoop();

    // Nạp người mẫu ban đầu
    this.loadOutfit(this.outfit);
  }

  /**
   * Tải mô hình Người Mẫu Thật (Base Avatar) kết hợp Quần và Áo Dài truyền thống
   */
  public async loadOutfit(outfit: FittingOutfit): Promise<void> {
    if (this.isDisposed) return;
    this.onLoadStart?.();
    this.onLoadProgress?.(30);

    const isGenderChanged = !this.currentModel || this.outfit.gender !== outfit.gender;
    this.outfit = {
      ...outfit,
      layers: {
        ...outfit.layers,
        base: true, // Đảm bảo luôn mặc Quần
        lining: true, // Lớp áo trong
        garment: true, // Áo chính
        head: true,
        accessories: true,
      },
    };

    try {
      if (isGenderChanged) {
        if (this.currentModel) {
          this.scene.remove(this.currentModel.root);
          this.currentModel.dispose();
          this.currentModel = null;
        }

        this.onLoadProgress?.(60);
        // Khởi tạo người mẫu đầy đủ (mannequin = false để hiển thị người thật)
        const nextModel = await createGltfFittingModel(this.outfit, false);

        if (this.isDisposed) {
          nextModel.dispose();
          return;
        }

        // Kích hoạt shadow cho tất cả các mesh của avatar và trang phục
        nextModel.root.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        this.currentModel = nextModel;
        this.scene.add(nextModel.root);
      }

      this.onLoadProgress?.(90);
      // Đồng bộ trang phục, quần, phụ kiện và màu sắc
      if (this.currentModel) {
        await this.currentModel.sync(this.outfit, false);
      }

      this.onLoadComplete?.();
    } catch (err: any) {
      console.error("[TryOnSceneManager] Lỗi nạp mô hình người thật:", err);
      this.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Cập nhật nhanh màu sắc, áo, quần hoặc phụ kiện mà không cần load lại toàn bộ avatar
   */
  public async updateOutfit(patch: Partial<FittingOutfit>): Promise<void> {
    const nextOutfit: FittingOutfit = {
      ...this.outfit,
      ...patch,
      layers: {
        ...this.outfit.layers,
        ...patch.layers,
        base: true, // Luôn giữ Quần
        lining: true,
        garment: true,
      },
      revision: this.outfit.revision + 1,
    };

    if (patch.gender && patch.gender !== this.outfit.gender) {
      await this.loadOutfit(nextOutfit);
      return;
    }

    this.outfit = nextOutfit;
    if (this.currentModel) {
      await this.currentModel.sync(this.outfit, false);
    }
  }

  /**
   * Bật / Tắt phụ kiện cụ thể trên mô hình 3D
   */
  public async toggleAccessory(accId: string): Promise<string[]> {
    const currentList = new Set(this.outfit.accessories);
    if (currentList.has(accId)) {
      currentList.delete(accId);
    } else {
      currentList.add(accId);
    }
    const nextAccessories = Array.from(currentList);
    await this.updateOutfit({ accessories: nextAccessories });
    return nextAccessories;
  }

  /**
   * Co giãn phom dáng theo số đo người dùng
   */
  public setModelScale(scale: { x: number; y: number; z: number }) {
    if (this.currentModel) {
      this.currentModel.root.scale.set(scale.x, scale.y, scale.z);
    }
  }

  /**
   * Bật / Tắt tự động xoay 360 độ quanh bục
   */
  public toggleAutoRotate(enabled?: boolean): boolean {
    this.isAutoRotating = enabled !== undefined ? enabled : !this.isAutoRotating;
    this.controls.autoRotate = this.isAutoRotating;
    this.controls.autoRotateSpeed = 2.2;
    return this.isAutoRotating;
  }

  /**
   * Đặt lại góc máy ảnh
   */
  public resetCamera(preset: "full" | "close" | "hem" = "full") {
    if (preset === "full") {
      this.camera.position.set(0.25, 1.15, 3.2);
      this.controls.target.set(0, 0.92, 0);
    } else if (preset === "close") {
      this.camera.position.set(0.08, 1.55, 1.35);
      this.controls.target.set(0, 1.48, 0);
    } else if (preset === "hem") {
      this.camera.position.set(0.18, 0.45, 1.7);
      this.controls.target.set(0, 0.38, 0);
    }
    this.controls.update();
  }

  /**
   * Chụp ảnh chất lượng cao
   */
  public captureScreenshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL("image/png");
  }

  private handleResize = () => {
    if (this.isDisposed || !this.container) return;
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private startAnimationLoop() {
    const animate = () => {
      if (this.isDisposed) return;
      this.animationFrameId = requestAnimationFrame(animate);

      const time = this.clock.getElapsedTime();
      this.controls.update();

      // Cập nhật hoạt ảnh nhịp thở tự nhiên của người mẫu
      if (this.currentModel) {
        this.currentModel.animate(time, false);
      }

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  public dispose() {
    this.isDisposed = true;
    window.removeEventListener("resize", this.handleResize);
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.controls.dispose();
    this.currentModel?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
