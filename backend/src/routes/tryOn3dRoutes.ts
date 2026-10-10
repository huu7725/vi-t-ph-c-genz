import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  consultStylistWithGemini,
  type StylistConsultationInput,
} from "../services/geminiStylistService.js";

export interface ModelRow {
  id: string;
  name: string;
  gender: "male" | "female";
  sketchfab_url: string | null;
  file_path_glb: string;
}

export interface FabricRow {
  id: string;
  name: string;
  texture_image_url: string | null;
  bump_map_url: string | null;
}

export interface UserMeasurementRow {
  id: string;
  height: number;
  weight: number;
  chest: number;
  waist: number;
  hip: number;
  created_at: string;
}

const tryOnInputSchema = z.object({
  model_id: z.string().min(1),
  fabric_id: z.string().min(1),
  measurements: z.object({
    height: z.number().min(120).max(220),
    weight: z.number().min(30).max(180),
    chest: z.number().min(50).max(150),
    waist: z.number().min(40).max(140),
    hip: z.number().min(60).max(160),
  }),
});

const aiConsultantInputSchema = z.object({
  height: z.number().min(120).max(220),
  weight: z.number().min(30).max(180),
  color_preference: z.string().default("Đỏ đô & Vàng kim"),
  model_type: z.string().default("female_traditional"),
  chest: z.number().optional(),
  waist: z.number().optional(),
  hip: z.number().optional(),
});

export function initTryOn3dTables(db: any) {
  // 1. Tạo các bảng theo yêu cầu kỹ thuật
  db.exec(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gender TEXT CHECK(gender IN ('male', 'female')) NOT NULL,
      sketchfab_url TEXT,
      file_path_glb TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fabrics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      texture_image_url TEXT,
      bump_map_url TEXT
    );

    CREATE TABLE IF NOT EXISTS user_measurements (
      id TEXT PRIMARY KEY,
      height REAL NOT NULL,
      weight REAL NOT NULL,
      chest REAL NOT NULL,
      waist REAL NOT NULL,
      hip REAL NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // 2. Nạp dữ liệu mẫu cho models nếu chưa có
  const modelCount = db.prepare("SELECT COUNT(*) as count FROM models").get() as {
    count: number;
  };
  if (modelCount.count === 0) {
    const insertModel = db.prepare(`
      INSERT INTO models (id, name, gender, sketchfab_url, file_path_glb)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertModel.run(
      "nu_truyentong_gam",
      "Áo Dài Nữ Truyền Thống (Gấm Hoa Sen)",
      "female",
      "https://sketchfab.com/3d-models/ao-dai-a688cd1e486c422d8f00276c66a255c8",
      "/models/fitting/nu/ao_dai.glb",
    );
    insertModel.run(
      "nu_truyentong_lua",
      "Áo Dài Nữ Truyền Thống (Lụa Hà Đông)",
      "female",
      "https://sketchfab.com/3d-models/traditional-vietnamese-clothes-ao-dai-861b18ca3b954fad9b0b3d84f6a81fc0",
      "/models/fitting/nu/ao_dai.glb",
    );
    insertModel.run(
      "nu_dangsang_3d",
      "Áo Dài Nữ Ngũ Thân & Cách Tân",
      "female",
      "https://sketchfab.com/3d-models/vietnamese-ao-dai-woman-3d-model-9d75210513b944f8961a4d0a7a20731a",
      "/models/fitting/nu/ao_dai_cach_tan.glb",
    );
    insertModel.run(
      "nam_robot_xanh",
      "Mẫu Nam 'Robot-man' Áo Dài Cách Tân (Cyber Neon Blue)",
      "male",
      "https://sketchfab.com/3d-models/robot-man-in-ao-dai-a7df982eeade47598c64249981cda3a0",
      "/models/fitting/nam/ao_dai_cach_tan.glb",
    );
    insertModel.run(
      "nam_robot_dong",
      "Mẫu Nam 'Robot-man' Áo Dài Cách Tân (Cyber Gold / Bronze)",
      "male",
      "https://sketchfab.com/3d-models/robot-man-in-ao-dai-a7df982eeade47598c64249981cda3a0",
      "/models/fitting/nam/ao_dai.glb",
    );
  }

  // 3. Nạp dữ liệu chất liệu vải nếu chưa có
  const fabricCount = db.prepare("SELECT COUNT(*) as count FROM fabrics").get() as {
    count: number;
  };
  if (fabricCount.count === 0) {
    const insertFabric = db.prepare(`
      INSERT INTO fabrics (id, name, texture_image_url, bump_map_url)
      VALUES (?, ?, ?, ?)
    `);

    insertFabric.run(
      "gam_hoa_van",
      "Gấm hoa văn cao cấp",
      "/textures/fabrics/gam_hoa_van.png",
      "/textures/fabrics/gam_bump.png",
    );
    insertFabric.run(
      "lua_bong",
      "Lụa bóng tơ tằm",
      "/textures/fabrics/lua_bong.png",
      "/textures/fabrics/lua_bump.png",
    );
    insertFabric.run(
      "nhung_cao_cap",
      "Nhung tuyết cao cấp",
      "/textures/fabrics/nhung_cao_cap.png",
      "/textures/fabrics/nhung_bump.png",
    );
  }
}

export function tryOn3dRoutes(db: any) {
  const router = Router();
  initTryOn3dTables(db);

  /**
   * GET /api/models
   * Lấy danh sách các mẫu 3D có sẵn
   */
  router.get("/models", (_req, res) => {
    try {
      const models = db
        .prepare("SELECT id, name, gender, sketchfab_url, file_path_glb FROM models ORDER BY rowid ASC")
        .all() as ModelRow[];
      res.json({
        success: true,
        count: models.length,
        models,
      });
    } catch (error) {
      console.error("[GET /api/models error]", error);
      res.status(500).json({ error: "Lỗi truy vấn cơ sở dữ liệu mẫu 3D." });
    }
  });

  /**
   * GET /api/fabrics
   * Lấy danh sách các chất liệu vải
   */
  router.get("/fabrics", (_req, res) => {
    try {
      const fabrics = db
        .prepare("SELECT id, name, texture_image_url, bump_map_url FROM fabrics ORDER BY rowid ASC")
        .all() as FabricRow[];
      res.json({
        success: true,
        count: fabrics.length,
        fabrics,
      });
    } catch (error) {
      console.error("[GET /api/fabrics error]", error);
      res.status(500).json({ error: "Lỗi truy vấn cơ sở dữ liệu chất liệu vải." });
    }
  });

  /**
   * POST /api/try-on
   * Nhận thông số người dùng, lưu vào SQLite và trả về cấu hình dữ liệu 3D cho Frontend Three.js
   */
  router.post("/try-on", (req, res) => {
    try {
      const parsed = tryOnInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Dữ liệu thử đồ không hợp lệ.",
          issues: parsed.error.issues,
        });
        return;
      }

      const { model_id, fabric_id, measurements } = parsed.data;

      // 1. Kiểm tra model và fabric có tồn tại không
      const model = db
        .prepare("SELECT id, name, gender, sketchfab_url, file_path_glb FROM models WHERE id = ?")
        .get(model_id) as ModelRow | undefined;

      const fabric = db
        .prepare("SELECT id, name, texture_image_url, bump_map_url FROM fabrics WHERE id = ?")
        .get(fabric_id) as FabricRow | undefined;

      if (!model) {
        res.status(404).json({ error: `Không tìm thấy mẫu 3D với ID: ${model_id}` });
        return;
      }
      if (!fabric) {
        res.status(404).json({ error: `Không tìm thấy chất liệu vải với ID: ${fabric_id}` });
        return;
      }

      // 2. Lưu thông số vào bảng user_measurements
      const measurementId = randomUUID();
      const createdAt = new Date().toISOString();
      db.prepare(`
        INSERT INTO user_measurements (id, height, weight, chest, waist, hip, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        measurementId,
        measurements.height,
        measurements.weight,
        measurements.chest,
        measurements.waist,
        measurements.hip,
        createdAt,
      );

      // 3. Tính toán thông số biến dạng và tỷ lệ phom áo 3D cho Three.js
      // Chiều cao chuẩn cơ bản: 165cm cho Nữ, 175cm cho Nam
      const baseHeight = model.gender === "female" ? 165 : 175;
      const heightScale = +(measurements.height / baseHeight).toFixed(3);

      // Tỉ lệ ngang (vòng eo & ngực)
      const baseWaist = model.gender === "female" ? 64 : 76;
      const widthScale = +(Math.sqrt(measurements.waist / baseWaist)).toFixed(3);

      // Ước tính size chuẩn
      let sizeTag = "M";
      if (measurements.height < 155 || measurements.weight < 48) sizeTag = "S";
      else if (measurements.height <= 165 && measurements.weight <= 56) sizeTag = "M";
      else if (measurements.height <= 174 && measurements.weight <= 66) sizeTag = "L";
      else sizeTag = "XL";

      // Cấu hình vật liệu vải tương ứng
      const fabricMaterialConfig = {
        id: fabric.id,
        name: fabric.name,
        texture_image_url: fabric.texture_image_url,
        bump_map_url: fabric.bump_map_url,
        roughness: fabric.id === "lua_bong" ? 0.25 : fabric.id === "nhung_cao_cap" ? 0.78 : 0.45,
        metalness: fabric.id === "gam_hoa_van" ? 0.15 : 0.05,
        sheen: fabric.id === "nhung_cao_cap" ? 0.9 : fabric.id === "lua_bong" ? 0.65 : 0.35,
        sheenRoughness: 0.4,
        bumpScale: fabric.id === "gam_hoa_van" ? 0.06 : fabric.id === "nhung_cao_cap" ? 0.03 : 0.015,
      };

      // Trả về JSON cấu hình đầy đủ cho Frontend 3D
      res.json({
        success: true,
        measurement_id: measurementId,
        model: {
          id: model.id,
          name: model.name,
          gender: model.gender,
          sketchfab_url: model.sketchfab_url,
          file_path_glb: model.file_path_glb,
        },
        fabric: fabricMaterialConfig,
        measurements,
        try_on_configuration: {
          size: sizeTag,
          scale: {
            x: widthScale,
            y: heightScale,
            z: widthScale,
          },
          pedestal_glow_color: model.gender === "female" ? "#ffd700" : "#00f0ff",
          lighting: {
            preset: "cyberpunk_studio",
            ambient_intensity: 0.55,
            directional_intensity: 1.4,
            rim_light_color: model.gender === "female" ? "#ffd700" : "#00f0ff",
          },
          camera_target: [0, 0.9 * heightScale, 0],
          camera_position: [0.2, 1.05 * heightScale, 2.8 * heightScale],
        },
      });
    } catch (error) {
      console.error("[POST /api/try-on error]", error);
      res.status(500).json({ error: "Lỗi xử lý yêu cầu thử đồ 3D." });
    }
  });

  /**
   * POST /api/ai-consultant
   * Module tư vấn dáng người, size và phong cách áo dài qua Google Gemini API
   */
  router.post("/ai-consultant", async (req, res) => {
    try {
      const parsed = aiConsultantInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Dữ liệu tư vấn AI không hợp lệ.",
          issues: parsed.error.issues,
        });
        return;
      }

      const input: StylistConsultationInput = parsed.data;
      const result = await consultStylistWithGemini(input);

      res.json({
        success: true,
        consultation: result,
      });
    } catch (error) {
      console.error("[POST /api/ai-consultant error]", error);
      res.status(500).json({ error: "Lỗi kết nối Trợ lý AI Gemini." });
    }
  });

  /**
   * GET /api/prompts/3d-generators
   * Cung cấp danh mục prompt chuẩn AI 3D (Tripo3D, Meshy, Rodin, Midjourney)
   * và tiêu chuẩn kỹ thuật 3D Web Virtual Try-on
   */
  router.get("/prompts/3d-generators", (_req, res) => {
    res.json({
      success: true,
      base_body_prompts: {
        female: {
          title: "Nhân vật nữ (Female Base Model)",
          tools: ["Tripo3D", "Meshy", "Rodin", "Midjourney Turnaround"],
          prompt:
            "Full-body 3D character model of a young Vietnamese woman, natural East Asian facial features, slender and graceful posture, standing in a relaxed A-pose. Neutral facial expression, hair tied in a sleek high bun to reveal neck and shoulders. Clean topology, modular mannequin mesh ready for cloth simulation and rigging, symmetrical geometry, studio lighting, isolated on solid gray background, photorealistic PBR material, low-poly optimized for WebGL, zero clipping, 8k texture map --ar 9:16 --v 6.1",
        },
        male: {
          title: "Nhân vật nam (Male Base Model)",
          tools: ["Tripo3D", "Meshy", "Rodin", "Midjourney Turnaround"],
          prompt:
            "Full-body 3D character model of a young Vietnamese man, defined jawline, gentle East Asian features, well-proportioned athletic build with straight back and broad shoulders, standing in a standard A-pose with arms slightly outward. Short neat classic hairstyle, neutral facial expression. Clean quad-dominant topology, modular body mesh ready for 3D rigging and virtual try-on, symmetrical, isolated on plain white background, PBR workflow, low-to-mid poly game-ready asset --ar 9:16 --v 6.1",
        },
      },
      garment_prompts: {
        ao_dai_nu: {
          title: "Áo dài Nữ truyền thống (Modern & Traditional Female Áo Dài)",
          prompt:
            "3D digital clothing asset of traditional Vietnamese female Áo Dài, consisting of two long flowing silk panels (tà áo) draping down to the ankles, high mandarin collar (cổ tàu), fitted waistline, elegant fabric folds, paired with loose-fitting white silk trousers (quần lụa). High-detail smooth mulberry silk texture, subtle floral embroidery along the chest, glossy satin sheen. Rendered on an invisible mannequin in A-pose, front and back view, clean UV unwrapped, PBR maps (Albedo, Normal, Roughness), cinematic studio lighting, glTF ready.",
        },
        ao_ngu_than_nam: {
          title: "Áo ngũ thân / Áo dài Nam truyền thống (Male Traditional Áo Dài)",
          prompt:
            "3D digital clothing model of traditional Vietnamese men's Áo Dài (Áo ngũ thân tay chẽn), tailored straight silhouette, five-button asymmetric flap closure on the right side, stiff standing mandarin collar, knee-length panels. Premium Vietnamese brocade fabric (vải gấm) with embossed subtle geometric and cloud patterns, paired with straight black/white trousers and an optional matching traditional headwrap (khăn đóng). Standing A-pose, separated clothing mesh, clean edge flow, low-drawcall friendly, PBR maps included.",
        },
        ao_nhat_binh: {
          title: "Áo Nhật Bình (Triều Nguyễn - Cổ phục cao cấp)",
          prompt:
            "3D asset of Vietnamese royal costume Áo Nhật Bình, Nguyen Dynasty ceremonial garment. Rectangular embroidered collar panel with multi-colored five-element bands (ngũ sắc) at the cuffs, loose outer robe layered over white inner tunic, phoenix and lotus golden embroidery motifs. Rigid silk damask material, ornate patterns, symmetrical front view, modular 3D garment mesh, A-pose, hyper-detailed PBR textures with metallic embroidery highlights.",
        },
      },
      parametric_template:
        "[Loại model: 3D clothing asset / Character] of Vietnamese [Tên trang phục: Áo dài / Áo tấc / Áo ngũ thân] for [Nam/Nữ], Style: [Truyền thống / Cách tân / Hoàng gia], Fabric: [Lụa Hà Đông / Gấm hoa chìm / Sa satin / Vải đũi], Details: [Họa tiết: thêu hoa sen, mây sóng thủy ba, cúc áo ngọc bích, cổ áo viền chỉ vàng], Pose: [Standard A-pose / T-pose], Technical specs: [Quad topology, low-poly, UV unwrapped, PBR textures, clean mesh separation, WebGL/Three.js optimized, isolated on neutral background].",
      technical_guidelines: {
        rigging_and_pose: {
          pose: "A-pose (tay nghiêng 30°–45° so với thân người)",
          benefit: "Tránh biến dạng texture vùng nách và vai khi rigging.",
        },
        mesh_separation: {
          parts: ["Body_Base", "AoDai_Top", "AoDai_Pants", "Accessory_KhanDong"],
          origin: "Trọng tâm Pivot Point [0, 0, 0] tại tâm hai bàn chân tiếp xúc mặt đất.",
        },
        webgl_budget: {
          polycount: "15.000 – 35.000 triangles toàn bộ nhân vật và áo dài.",
          textures: "Định dạng .webp / KTX2, tối đa 2048x2048 (1024x1024 cho phụ kiện).",
          format: "File chuẩn .glb Draco / Meshopt dưới 5MB.",
        },
      },
    });
  });

  return router;
}
