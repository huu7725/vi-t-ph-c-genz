import React, { useState } from "react";
import {
  Sparkles,
  Copy,
  Check,
  X,
  Layers,
  Cpu,
  BookOpen,
  Sliders,
  ExternalLink,
} from "lucide-react";

interface AiPromptStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiPromptStudioModal({ isOpen, onClose }: AiPromptStudioModalProps) {
  const [activeTab, setActiveTab] = useState<"base_models" | "garments" | "generator" | "guidelines">("base_models");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // State cho bộ sinh Prompt tùy biến tham số hóa
  const [genModelType, setGenModelType] = useState<string>("3D clothing asset");
  const [genGarment, setGenGarment] = useState<string>("Áo dài Nữ");
  const [genGender, setGenGender] = useState<string>("Nữ");
  const [genStyle, setGenStyle] = useState<string>("Truyền thống");
  const [genFabric, setGenFabric] = useState<string>("Lụa Hà Đông cao cấp");
  const [genDetails, setGenDetails] = useState<string>("thêu hoa sen thanh tao, cúc ngọc bích, cổ áo viền chỉ vàng");
  const [genPose, setGenPose] = useState<string>("Standard A-pose");

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Tính toán prompt tham số hóa theo đúng công thức của người dùng
  const parameterizedTemplate = `[Loại model: ${genModelType}] of Vietnamese [Tên trang phục: ${genGarment}] for [${genGender}], Style: [${genStyle}], Fabric: [${genFabric}], Details: [Họa tiết: ${genDetails}], Pose: [${genPose}], Technical specs: [Quad topology, low-poly, UV unwrapped, PBR textures, clean mesh separation, WebGL/Three.js optimized, isolated on neutral background] --ar 9:16 --v 6.1`;

  const cleanAiPrompt = `${genModelType} of traditional Vietnamese ${genGarment} for ${genGender === "Nữ" ? "Vietnamese woman" : "Vietnamese man"}, Style: ${genStyle}, Fabric: ${genFabric}, Details: ${genDetails}, Pose: ${genPose}, Technical specs: quad topology, low-poly, clean UV unwrapped, PBR textures (Albedo, Normal, Roughness), clean mesh separation, WebGL Three.js optimized, isolated on solid studio gray background, 8k texture maps --ar 9:16 --v 6.1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                Studio Tạo Prompt 3D AI
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Tripo3D · Meshy · Rodin · Midjourney
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bộ prompt chuẩn hóa & Cẩm nang kỹ thuật 3D Web Virtual Try-on Việt Phục
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-4 sm:px-6 bg-slate-50/70 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("base_models")}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === "base_models"
                ? "border-amber-600 text-amber-900 bg-white/60 shadow-xs rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers size={15} className="text-amber-600" />
            1. Model Base Body (Nữ & Nam)
          </button>
          <button
            onClick={() => setActiveTab("garments")}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === "garments"
                ? "border-amber-600 text-amber-900 bg-white/60 shadow-xs rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles size={15} className="text-amber-600" />
            2. Mesh Áo Dài & Cổ Phục
          </button>
          <button
            onClick={() => setActiveTab("generator")}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === "generator"
                ? "border-amber-600 text-amber-900 bg-white/60 shadow-xs rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sliders size={15} className="text-amber-600" />
            3. Trình Sinh Prompt Tùy Biến
          </button>
          <button
            onClick={() => setActiveTab("guidelines")}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === "guidelines"
                ? "border-amber-600 text-amber-900 bg-white/60 shadow-xs rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen size={15} className="text-amber-600" />
            4. Tiêu Chuẩn Kỹ Thuật 3D Web
          </button>
        </div>

        {/* Nội dung các tab */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: MODEL BASE BODY */}
          {activeTab === "base_models" && (
            <div className="space-y-6">
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                <span className="font-bold">Mục đích:</span> Dùng cho các nền tảng AI 3D (Tripo3D, Meshy, Rodin hoặc Midjourney ra Turnaround Sheet).
                Tách riêng body giúp bạn dễ dàng thay đổi trang phục trên web thông qua việc ẩn/hiện hoặc swap mesh.
              </div>

              {/* Nhân vật nữ */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-xs font-bold">
                      Nhân vật Nữ
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">Female Base Model</h3>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        "Full-body 3D character model of a young Vietnamese woman, natural East Asian facial features, slender and graceful posture, standing in a relaxed A-pose. Neutral facial expression, hair tied in a sleek high bun to reveal neck and shoulders. Clean topology, modular mannequin mesh ready for cloth simulation and rigging, symmetrical geometry, studio lighting, isolated on solid gray background, photorealistic PBR material, low-poly optimized for WebGL, zero clipping, 8k texture map --ar 9:16 --v 6.1",
                        "female_base"
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    {copiedId === "female_base" ? <Check size={14} /> : <Copy size={14} />}
                    {copiedId === "female_base" ? "Đã sao chép!" : "Sao chép Prompt"}
                  </button>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-700 leading-relaxed select-all">
                  Full-body 3D character model of a young Vietnamese woman, natural East Asian facial features, slender and graceful posture, standing in a relaxed A-pose. Neutral facial expression, hair tied in a sleek high bun to reveal neck and shoulders. Clean topology, modular mannequin mesh ready for cloth simulation and rigging, symmetrical geometry, studio lighting, isolated on solid gray background, photorealistic PBR material, low-poly optimized for WebGL, zero clipping, 8k texture map --ar 9:16 --v 6.1
                </div>
              </div>

              {/* Nhân vật nam */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-bold">
                      Nhân vật Nam
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">Male Base Model</h3>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        "Full-body 3D character model of a young Vietnamese man, defined jawline, gentle East Asian features, well-proportioned athletic build with straight back and broad shoulders, standing in a standard A-pose with arms slightly outward. Short neat classic hairstyle, neutral facial expression. Clean quad-dominant topology, modular body mesh ready for 3D rigging and virtual try-on, symmetrical, isolated on plain white background, PBR workflow, low-to-mid poly game-ready asset --ar 9:16 --v 6.1",
                        "male_base"
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    {copiedId === "male_base" ? <Check size={14} /> : <Copy size={14} />}
                    {copiedId === "male_base" ? "Đã sao chép!" : "Sao chép Prompt"}
                  </button>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-700 leading-relaxed select-all">
                  Full-body 3D character model of a young Vietnamese man, defined jawline, gentle East Asian features, well-proportioned athletic build with straight back and broad shoulders, standing in a standard A-pose with arms slightly outward. Short neat classic hairstyle, neutral facial expression. Clean quad-dominant topology, modular body mesh ready for 3D rigging and virtual try-on, symmetrical, isolated on plain white background, PBR workflow, low-to-mid poly game-ready asset --ar 9:16 --v 6.1
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MESH ÁO DÀI & CỔ PHỤC */}
          {activeTab === "garments" && (
            <div className="space-y-6">
              {/* Áo dài Nữ truyền thống */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-xs font-bold">
                      Nữ
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      Áo dài Nữ truyền thống (Modern & Traditional Female Áo Dài)
                    </h3>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        "3D digital clothing asset of traditional Vietnamese female Áo Dài, consisting of two long flowing silk panels (tà áo) draping down to the ankles, high mandarin collar (cổ tàu), fitted waistline, elegant fabric folds, paired with loose-fitting white silk trousers (quần lụa). High-detail smooth mulberry silk texture, subtle floral embroidery along the chest, glossy satin sheen. Rendered on an invisible mannequin in A-pose, front and back view, clean UV unwrapped, PBR maps (Albedo, Normal, Roughness), cinematic studio lighting, glTF ready.",
                        "ao_dai_nu"
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    {copiedId === "ao_dai_nu" ? <Check size={14} /> : <Copy size={14} />}
                    {copiedId === "ao_dai_nu" ? "Đã sao chép!" : "Sao chép Prompt"}
                  </button>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-700 leading-relaxed select-all">
                  3D digital clothing asset of traditional Vietnamese female Áo Dài, consisting of two long flowing silk panels (tà áo) draping down to the ankles, high mandarin collar (cổ tàu), fitted waistline, elegant fabric folds, paired with loose-fitting white silk trousers (quần lụa). High-detail smooth mulberry silk texture, subtle floral embroidery along the chest, glossy satin sheen. Rendered on an invisible mannequin in A-pose, front and back view, clean UV unwrapped, PBR maps (Albedo, Normal, Roughness), cinematic studio lighting, glTF ready.
                </div>
              </div>

              {/* Áo ngũ thân / Áo dài Nam */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-bold">
                      Nam
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      Áo ngũ thân / Áo dài Nam truyền thống (Male Traditional Áo Dài)
                    </h3>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        "3D digital clothing model of traditional Vietnamese men's Áo Dài (Áo ngũ thân tay chẽn), tailored straight silhouette, five-button asymmetric flap closure on the right side, stiff standing mandarin collar, knee-length panels. Premium Vietnamese brocade fabric (vải gấm) with embossed subtle geometric and cloud patterns, paired with straight black/white trousers and an optional matching traditional headwrap (khăn đóng). Standing A-pose, separated clothing mesh, clean edge flow, low-drawcall friendly, PBR maps included.",
                        "ao_ngu_than_nam"
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    {copiedId === "ao_ngu_than_nam" ? <Check size={14} /> : <Copy size={14} />}
                    {copiedId === "ao_ngu_than_nam" ? "Đã sao chép!" : "Sao chép Prompt"}
                  </button>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-700 leading-relaxed select-all">
                  3D digital clothing model of traditional Vietnamese men's Áo Dài (Áo ngũ thân tay chẽn), tailored straight silhouette, five-button asymmetric flap closure on the right side, stiff standing mandarin collar, knee-length panels. Premium Vietnamese brocade fabric (vải gấm) with embossed subtle geometric and cloud patterns, paired with straight black/white trousers and an optional matching traditional headwrap (khăn đóng). Standing A-pose, separated clothing mesh, clean edge flow, low-drawcall friendly, PBR maps included.
                </div>
              </div>

              {/* Áo Nhật Bình */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-bold">
                      Triều Nguyễn
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      Áo Nhật Bình (Triều Nguyễn - Cổ phục Hoàng gia cao cấp)
                    </h3>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        "3D asset of Vietnamese royal costume Áo Nhật Bình, Nguyen Dynasty ceremonial garment. Rectangular embroidered collar panel with multi-colored five-element bands (ngũ sắc) at the cuffs, loose outer robe layered over white inner tunic, phoenix and lotus golden embroidery motifs. Rigid silk damask material, ornate patterns, symmetrical front view, modular 3D garment mesh, A-pose, hyper-detailed PBR textures with metallic embroidery highlights.",
                        "ao_nhat_binh"
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    {copiedId === "ao_nhat_binh" ? <Check size={14} /> : <Copy size={14} />}
                    {copiedId === "ao_nhat_binh" ? "Đã sao chép!" : "Sao chép Prompt"}
                  </button>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-700 leading-relaxed select-all">
                  3D asset of Vietnamese royal costume Áo Nhật Bình, Nguyen Dynasty ceremonial garment. Rectangular embroidered collar panel with multi-colored five-element bands (ngũ sắc) at the cuffs, loose outer robe layered over white inner tunic, phoenix and lotus golden embroidery motifs. Rigid silk damask material, ornate patterns, symmetrical front view, modular 3D garment mesh, A-pose, hyper-detailed PBR textures with metallic embroidery highlights.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRÌNH SINH PROMPT THAM SỐ HÓA */}
          {activeTab === "generator" && (
            <div className="space-y-6">
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                <span className="font-bold">Công thức tham số hóa:</span> Khi cần sinh nhanh nhiều biến thể màu sắc và chất liệu trên hệ thống, điều chỉnh các tùy chọn bên dưới để tự động tạo Prompt chuẩn cho Midjourney v6.1 hoặc Tripo3D/Meshy.
              </div>

              {/* Bộ điều khiển thông số */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* 1. Loại model */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Loại Model</label>
                  <select
                    value={genModelType}
                    onChange={(e) => setGenModelType(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="3D clothing asset">3D clothing asset (Mesh trang phục)</option>
                    <option value="Character">Character (Nhân vật hoàn chỉnh)</option>
                  </select>
                </div>

                {/* 2. Tên trang phục */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tên Trang Phục</label>
                  <select
                    value={genGarment}
                    onChange={(e) => setGenGarment(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Áo dài Nữ">Áo dài Nữ truyền thống</option>
                    <option value="Áo dài Nam">Áo dài Nam</option>
                    <option value="Áo ngũ thân tay chẽn">Áo ngũ thân tay chẽn</option>
                    <option value="Áo tấc Triều Nguyễn">Áo tấc Triều Nguyễn</option>
                    <option value="Áo Nhật Bình Cung Đình">Áo Nhật Bình</option>
                    <option value="Áo Giao Lĩnh cổ phục">Áo Giao Lĩnh</option>
                    <option value="Áo Đối Khâm">Áo Đối Khâm</option>
                    <option value="Áo dài Cách Tân Hiện Đại">Áo dài Cách Tân</option>
                  </select>
                </div>

                {/* 3. Giới tính */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Giới Tính</label>
                  <select
                    value={genGender}
                    onChange={(e) => setGenGender(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Nữ">Nữ (Female)</option>
                    <option value="Nam">Nam (Male)</option>
                  </select>
                </div>

                {/* 4. Style */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Phong Cách (Style)</label>
                  <select
                    value={genStyle}
                    onChange={(e) => setGenStyle(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Truyền thống thanh nhã">Truyền thống</option>
                    <option value="Cách tân thời thượng">Cách tân</option>
                    <option value="Hoàng gia Cung đình Triều Nguyễn">Hoàng gia Cung đình</option>
                    <option value="Cổ phục nghìn năm">Cổ phục</option>
                  </select>
                </div>

                {/* 5. Fabric */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Chất Liệu (Fabric)</label>
                  <select
                    value={genFabric}
                    onChange={(e) => setGenFabric(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Lụa Hà Đông tơ tằm óng ả">Lụa Hà Đông</option>
                    <option value="Gấm hoa văn chìm nổi cao cấp">Gấm hoa chìm</option>
                    <option value="Sa satin bóng mịn thướt tha">Sa satin</option>
                    <option value="Vải đũi tơ tằm mộc mạc">Vải đũi</option>
                    <option value="Nhung the thượng hạng quyền quý">Nhung the</option>
                  </select>
                </div>

                {/* 6. Pose */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tư Thế (Pose)</label>
                  <select
                    value={genPose}
                    onChange={(e) => setGenPose(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Standard A-pose">Standard A-pose (Khuyên dùng)</option>
                    <option value="Relaxed A-pose">Relaxed A-pose</option>
                    <option value="T-pose">T-pose</option>
                  </select>
                </div>
              </div>

              {/* Chi tiết họa tiết */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Họa Tiết & Chi Tiết Đặc Trưng (Details)
                </label>
                <input
                  type="text"
                  value={genDetails}
                  onChange={(e) => setGenDetails(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  placeholder="thêu hoa sen, mây sóng thủy ba, cúc áo ngọc bích, cổ áo viền chỉ vàng..."
                />
              </div>

              {/* Output 1: Template tham số hóa chuẩn */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">
                    Prompt Dạng Template Tham Số Hóa:
                  </h4>
                  <button
                    onClick={() => copyToClipboard(parameterizedTemplate, "param_template")}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    {copiedId === "param_template" ? <Check size={14} /> : <Copy size={14} />}
                    {copiedId === "param_template" ? "Đã sao chép!" : "Sao chép Template"}
                  </button>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-700 leading-relaxed select-all">
                  {parameterizedTemplate}
                </div>
              </div>

              {/* Output 2: Prompt Tiếng Anh chuẩn tạo 3D (Midjourney v6.1 / Tripo3D / Meshy) */}
              <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-600" />
                    <h4 className="text-xs font-bold text-slate-900">
                      Prompt Thực Thi AI (Sẵn sàng dán vào Midjourney v6.1 / Tripo3D):
                    </h4>
                  </div>
                  <button
                    onClick={() => copyToClipboard(cleanAiPrompt, "clean_ai")}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    {copiedId === "clean_ai" ? <Check size={14} /> : <Copy size={14} />}
                    {copiedId === "clean_ai" ? "Đã sao chép!" : "Sao chép Prompt AI"}
                  </button>
                </div>
                <div className="p-3 bg-white rounded-lg border border-amber-200 font-mono text-xs text-slate-800 leading-relaxed select-all">
                  {cleanAiPrompt}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TIÊU CHUẨN KỸ THUẬT 3D WEB */}
          {activeTab === "guidelines" && (
            <div className="space-y-4">
              {/* 1. Khung xương & Tư thế */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <span className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center text-xs">
                    1
                  </span>
                  Khung xương & Tư thế (A-pose)
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 pl-8 list-disc">
                  <li>
                    <strong>Luôn yêu cầu tư thế A-pose</strong> (tay nghiêng khoảng 30°–45° so với thân người) thay vì T-pose.
                  </li>
                  <li>
                    A-pose giúp phần vai và nách của áo dài không bị biến dạng texture và không bị méo lưới khi gắn khung xương (rigging).
                  </li>
                </ul>
              </div>

              {/* 2. Mesh Separation */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <span className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center text-xs">
                    2
                  </span>
                  Mesh Separation (Tách lưới)
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 pl-8 list-disc">
                  <li>
                    Tách riêng các node mesh độc lập: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">Body_Base</code>, <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">AoDai_Top</code>, <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">AoDai_Pants</code>, <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">Accessory_KhanDong</code>.
                  </li>
                  <li>
                    <strong>Chung một gốc tọa độ (Pivot Point / Origin: [0, 0, 0] tại tâm hai bàn chân)</strong>: Khi người dùng nhấn đổi áo, Three.js chỉ cần thay thế đúng node mesh trang phục mà không bao giờ bị lệch vị trí.
                  </li>
                </ul>
              </div>

              {/* 3. Tối ưu WebGL */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <span className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center text-xs">
                    3
                  </span>
                  Tối ưu WebGL (Performance Budget)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-8 pt-1">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[11px] font-bold text-amber-700 block">Polycount</span>
                    <p className="text-xs text-slate-600 mt-1">
                      15.000 – 35.000 triangles toàn bộ nhân vật + áo dài (Đảm bảo 60 FPS di động).
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[11px] font-bold text-amber-700 block">Textures</span>
                    <p className="text-xs text-slate-600 mt-1">
                      Nén sang định dạng .webp hoặc KTX2, tối đa 2048x2048 (1024x1024 cho phụ kiện).
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[11px] font-bold text-amber-700 block">Định dạng file</span>
                    <p className="text-xs text-slate-600 mt-1">
                      Xuất chuẩn .glb sử dụng nén Draco / Meshopt dưới 5MB để tải trang tức thì.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Hệ thống Thử Đồ 3D Áo Dài Truyền Thống Việt Nam</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-xs transition-colors"
          >
            Đóng Studio
          </button>
        </div>
      </div>
    </div>
  );
}
