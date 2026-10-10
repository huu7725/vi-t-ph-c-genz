import React, { useEffect, useRef, useState } from "react";
import {
  RotateCw,
  Sparkles,
  Camera,
  Scissors,
  Sliders,
  Layers,
  Bot,
  Send,
  Check,
  RefreshCw,
  X,
  Ruler,
  User,
  Zap,
  Shirt,
  Palette,
  Crown,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { TryOnSceneManager } from "./tryonScene";
import { defaultFittingOutfit, type FittingOutfit } from "@domain";
import { AiPromptStudioModal } from "./AiPromptStudioModal";

// Danh mục Trang phục văn hóa Việt Nam
export const VIETNAMESE_GARMENTS = [
  {
    id: "ao_dai",
    name: "Áo Dài Truyền Thống",
    subtitle: "Hai tà mềm mại, phom thướt tha kinh điển",
    tag: "Kinh điển",
  },
  {
    id: "ao_ngu_than",
    name: "Áo Ngũ Thân Tay Chẽn",
    subtitle: "Cổ đứng, 5 thân, hàng khuy bên - di sản triều Nguyễn",
    tag: "Di sản",
  },
  {
    id: "ao_tac",
    name: "Áo Tấc (Tay Thụng)",
    subtitle: "Áo lễ trang trọng, tay rộng uy nghi quyền quý",
    tag: "Lễ phục",
  },
  {
    id: "nhat_binh",
    name: "Áo Nhật Bình",
    subtitle: "Cổ hình chữ nhật ngũ sắc cung đình vương giả",
    tag: "Cung đình",
  },
  {
    id: "giao_linh",
    name: "Áo Giao Lĩnh",
    subtitle: "Cổ chéo giao nhau thời Lê - Trần cổ kính",
    tag: "Cổ phong",
  },
  {
    id: "doi_kham",
    name: "Áo Đối Khâm",
    subtitle: "Hai mép áo xẻ mở buông song song đài các",
    tag: "Quý tộc",
  },
  {
    id: "ao_dai_cach_tan",
    name: "Áo Dài Cách Tân",
    subtitle: "Biến tấu trẻ trung, năng động phong cách Gen Z",
    tag: "Gen Z",
  },
];

// Danh mục Phụ kiện truyền thống đi kèm
export const ACCESSORY_CATALOG = [
  {
    id: "acc_khan_van",
    name: "Mấn Đội Đầu / Khăn Vấn",
    category: "head",
    icon: "👑",
    desc: "Khăn vấn gấm hoặc nhung tôn vinh vẻ đài các, trang nghiêm",
  },
  {
    id: "acc_non_la",
    name: "Nón Lá Truyền Thống",
    category: "head",
    icon: "👒",
    desc: "Nón lá bài thơ duyên dáng, mộc mạc hồn quê Việt",
  },
  {
    id: "acc_non_ba_tam",
    name: "Nón Ba Tầm Quai Thao",
    category: "head",
    icon: "👒",
    desc: "Nón quai thao Bắc Bộ, nét duyên trẩy hội mùa xuân",
  },
  {
    id: "acc_tram",
    name: "Trâm Cài Tóc Hoa Sen",
    category: "head",
    icon: "🌸",
    desc: "Trâm cài chạm khắc hoa sen tinh xảo cho mái tóc",
  },
  {
    id: "acc_kieng_bac",
    name: "Kiềng Vàng / Bạc Hoa Sen",
    category: "head",
    icon: "📿",
    desc: "Kiềng cổ chạm khắc hoa sen điểm nhấn thanh tao",
  },
  {
    id: "acc_chuoi_ngoc",
    name: "Chuỗi Ngọc Trai Đài Các",
    category: "head",
    icon: "📿",
    desc: "Chuỗi ngọc quý phái, thanh nhã",
  },
  {
    id: "acc_quat_tre",
    name: "Quạt Tre Thư Pháp",
    category: "hand",
    icon: "🪭",
    desc: "Quạt nan tre xếp cầm tay thanh lịch, tạo dáng 360°",
  },
  {
    id: "acc_vong_tay",
    name: "Vòng Tay Ngọc Bích",
    category: "hand",
    icon: "💍",
    desc: "Vòng ngọc phong thủy cổ truyền đeo cổ tay",
  },
  {
    id: "acc_ngoc_boi",
    name: "Ngọc Bội Thắt Lưng",
    category: "waist",
    icon: "💎",
    desc: "Ngọc bội thắt lưng chạm rồng phượng cổ phong",
  },
  {
    id: "acc_the_bai",
    name: "Thẻ Bài Hoàng Cung",
    category: "waist",
    icon: "🏷️",
    desc: "Thẻ bài cung đình dát vàng khắc chữ phong nhã",
  },
  {
    id: "acc_hai",
    name: "Hài Thêu Cung Đình",
    category: "feet",
    icon: "🥿",
    desc: "Hài mũi cong thêu chỉ ngũ sắc uyển chuyển",
  },
  {
    id: "acc_guoc_moc",
    name: "Guốc Mộc Quai Nhung",
    category: "feet",
    icon: "🩴",
    desc: "Guốc mộc tiếng gõ thanh bình, chất liệu truyền thống",
  },
  {
    id: "acc_sneaker_trang",
    name: "Sneaker Trắng Gen Z",
    category: "feet",
    icon: "👟",
    desc: "Phá cách hiện đại, năng động sải bước tự tin",
  },
  {
    id: "acc_kinh_ram",
    name: "Kính Râm Thời Thượng",
    category: "head",
    icon: "🕶️",
    desc: "Kính râm phong cách Retro & Cyberpunk Gen Z",
  },
];

// Bảng màu áo văn hóa Việt Nam
export const COLOR_PALETTES = [
  { name: "Đỏ Hoàng Triều", hex: "#B91C1C", desc: "Quyền quý, may mắn" },
  { name: "Vàng Hoàng Gia", hex: "#D97706", desc: "Vương giả, rực rỡ" },
  { name: "Xanh Ngọc Bích", hex: "#0D9488", desc: "Thanh tao, nhã nhặn" },
  { name: "Hồng Cánh Sen", hex: "#DB2777", desc: "Dịu dàng, đằm thắm" },
  { name: "Trắng Bạch Tuyết", hex: "#F8FAFC", desc: "Tinh khôi, thuần khiết" },
  { name: "Tím Xứ Huế", hex: "#7C3AED", desc: "Thơ mộng, trầm mặc" },
  { name: "Xanh Cổ Vịt", hex: "#1E3A8A", desc: "Cổ kính, thâm trầm" },
  { name: "Cam Gạch Nung", hex: "#C2410C", desc: "Ấm áp, hoài niệm" },
  { name: "Đen Tuyển Cổ Phong", hex: "#1E293B", desc: "Huyền bí, đĩnh đạc" },
  { name: "Xanh Rêu Di Sản", hex: "#3F6212", desc: "Thư thái, mộc mạc" },
];

// Bảng màu quần truyền thống
export const PANTS_COLORS = [
  { name: "Trắng Ngà Lụa", hex: "#FDFBF7" },
  { name: "Đen Tuyết", hex: "#18181B" },
  { name: "Vàng Kim Nhạt", hex: "#FEF08A" },
  { name: "Hồng Phấn", hex: "#FCE7F3" },
  { name: "Đồng Màu Áo", hex: "match" },
];

// Danh sách chất liệu vải
export const FABRIC_LIST = [
  { id: "silk", name: "Lụa tơ tằm", desc: "Mềm rủ, bay tà nhẹ nhàng, óng ả" },
  { id: "brocade", name: "Gấm hoa văn", desc: "Đứng phom, dệt vân hoa chìm nổi sang trọng" },
  { id: "gauze", name: "Sa / Voan mỏng", desc: "Thanh thoát, mỏng nhẹ, thoáng mát" },
  { id: "satin", name: "Nhung tuyết / Đoạn", desc: "Mịn màng, bắt sáng chiều sâu quý phái" },
];

export function TryOn3dView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<TryOnSceneManager | null>(null);

  // Modal Studio Tạo Prompt 3D AI
  const [isPromptStudioOpen, setIsPromptStudioOpen] = useState(false);

  // Outfit state đồng bộ
  const [outfit, setOutfit] = useState<FittingOutfit>(() => ({
    ...defaultFittingOutfit,
    gender: "nu",
    garmentId: "ao_dai",
    colors: {
      main: "#B91C1C", // Đỏ hoàng triều
      pants: "#FDFBF7", // Quần trắng ngà
      lining: "#FDFBF7",
      pattern: "#E9C46A",
    },
    fabric: "silk",
    accessories: ["acc_khan_van", "acc_kieng_bac", "acc_quat_tre"],
    layers: {
      base: true, // Luôn mặc Quần
      lining: true,
      garment: true,
      head: true,
      accessories: true,
    },
  }));

  // Bộ lọc phụ kiện bên trái
  const [accFilter, setAccFilter] = useState<string>("all");

  // Thông số cơ thể
  const [measurements, setMeasurements] = useState({
    height: 165,
    weight: 52,
    chest: 84,
    waist: 64,
    hip: 90,
  });

  // Trạng thái hiển thị Viewport
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>("");

  // Modal Trợ lý AI Gemini
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiColorPref, setAiColorPref] = useState("Đỏ hoàng triều & Quần trắng ngà");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  // Modal Đặt May
  const [isTailorModalOpen, setIsTailorModalOpen] = useState(false);
  const [tailorSuccess, setTailorSuccess] = useState(false);

  // 1. Khởi tạo Three.js Scene với Background Màu Trắng & Người Mẫu Thật
  useEffect(() => {
    if (!containerRef.current) return;

    const manager = new TryOnSceneManager(
      {
        container: containerRef.current,
        onLoadStart: () => {
          setIsLoading(true);
          setLoadProgress(20);
        },
        onLoadProgress: (p) => setLoadProgress(p),
        onLoadComplete: () => {
          setIsLoading(false);
          setLoadProgress(100);
        },
        onError: (err) => {
          setIsLoading(false);
          console.error("Lỗi Scene:", err);
        },
      },
      outfit,
    );

    sceneManagerRef.current = manager;

    return () => {
      manager.dispose();
      sceneManagerRef.current = null;
    };
  }, []);

  // 2. Chuyển đổi Giới tính người mẫu (Mẫu Nữ / Mẫu Nam)
  const handleToggleGender = async (gender: "nu" | "nam") => {
    if (outfit.gender === gender) return;
    const nextOutfit = { ...outfit, gender };
    setOutfit(nextOutfit);
    if (sceneManagerRef.current) {
      await sceneManagerRef.current.loadOutfit(nextOutfit);
    }
    showToast(gender === "nu" ? "Đã chuyển sang Mẫu Nữ di sản" : "Đã chuyển sang Mẫu Nam lịch lãm");
  };

  // 3. Đổi trang phục văn hóa Việt Nam
  const handleSelectGarment = async (garmentId: string) => {
    const nextOutfit = { ...outfit, garmentId: garmentId as any };
    setOutfit(nextOutfit);
    if (sceneManagerRef.current) {
      await sceneManagerRef.current.updateOutfit({ garmentId: garmentId as any });
    }
    const g = VIETNAMESE_GARMENTS.find((item) => item.id === garmentId);
    if (g) showToast(`Đã mặc thử: ${g.name}`);
  };

  // 4. Bật / Tắt Phụ Kiện Thử Đồ 3D (Left Sidebar)
  const handleToggleAccessory = async (accId: string) => {
    if (!sceneManagerRef.current) return;
    const nextList = await sceneManagerRef.current.toggleAccessory(accId);
    setOutfit((prev) => ({ ...prev, accessories: nextList }));
    const acc = ACCESSORY_CATALOG.find((item) => item.id === accId);
    if (acc) {
      const isEquipped = nextList.includes(accId);
      showToast(isEquipped ? `Đã thêm: ${acc.name}` : `Đã tháo: ${acc.name}`);
    }
  };

  // 5. Đổi màu áo chính
  const handleSelectMainColor = async (colorHex: string) => {
    const nextColors = { ...outfit.colors, main: colorHex };
    setOutfit((prev) => ({ ...prev, colors: nextColors }));
    if (sceneManagerRef.current) {
      await sceneManagerRef.current.updateOutfit({ colors: nextColors });
    }
  };

  // 6. Đổi màu quần
  const handleSelectPantsColor = async (colorHex: string) => {
    const target = colorHex === "match" ? outfit.colors.main : colorHex;
    const nextColors = { ...outfit.colors, pants: target };
    setOutfit((prev) => ({ ...prev, colors: nextColors }));
    if (sceneManagerRef.current) {
      await sceneManagerRef.current.updateOutfit({ colors: nextColors });
    }
  };

  // 7. Đổi chất liệu vải
  const handleSelectFabric = async (fabricId: any) => {
    setOutfit((prev) => ({ ...prev, fabric: fabricId }));
    if (sceneManagerRef.current) {
      await sceneManagerRef.current.updateOutfit({ fabric: fabricId });
    }
  };

  // 8. Bật/Tắt Xoay 360 độ
  const handleToggleAutoRotate = () => {
    if (sceneManagerRef.current) {
      const active = sceneManagerRef.current.toggleAutoRotate();
      setIsAutoRotating(active);
    }
  };

  // 9. Thử đồ (Gửi API POST /api/try-on)
  const handleTryOn = async () => {
    showToast("Đang tính toán tỷ lệ may đo phom áo...");
    try {
      const res = await fetch("/api/try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: outfit.gender === "nu" ? "nu_truyentong_gam" : "nam_robot_dong",
          fabric_id: outfit.fabric === "silk" ? "lua_bong" : "gam_hoa_van",
          measurements,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Thử đồ thành công! Gợi ý Size: ${data.try_on_configuration?.size || "M"}`);
        if (sceneManagerRef.current && data.try_on_configuration?.scale) {
          sceneManagerRef.current.setModelScale(data.try_on_configuration.scale);
        }
      }
    } catch {
      showToast("Đã cập nhật số đo trên người mẫu!");
    }
  };

  // 10. Trợ lý AI Gemini
  const handleAskGemini = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai-consultant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          height: measurements.height,
          weight: measurements.weight,
          chest: measurements.chest,
          waist: measurements.waist,
          hip: measurements.hip,
          color_preference: aiColorPref,
          model_type: outfit.gender === "nu" ? "female_traditional" : "male_traditional",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiResult(data.consultation);
      } else {
        showToast("Lỗi khi kết nối tới Trợ lý AI.");
      }
    } catch {
      showToast("Không thể kết nối dịch vụ Gemini AI.");
    } finally {
      setAiLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const filteredAccessories = ACCESSORY_CATALOG.filter((item) => {
    if (accFilter === "all") return true;
    return item.category === accFilter;
  });

  const equippedCount = outfit.accessories.length;
  const currentGarment = VIETNAMESE_GARMENTS.find((g) => g.id === outfit.garmentId);

  return (
    <div className="relative w-full h-[calc(100vh-64px)] min-h-[780px] bg-slate-100/70 text-slate-800 flex flex-col overflow-hidden font-sans select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white/95 border border-amber-500/80 text-amber-900 px-5 py-2.5 rounded-full shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-semibold animate-bounce">
          <Sparkles size={16} className="text-amber-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main 3-Column Layout: Background Trắng Sạch Sẽ */}
      <div className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* ========================================================= */}
        {/* CỘT TRÁI: DANH SÁCH PHỤ KIỆN TRUYỀN THỐNG ĐI KÈM */}
        {/* ========================================================= */}
        <aside className="col-span-12 lg:col-span-3 bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col gap-3.5 shadow-md overflow-y-auto">
          {/* Header Cột Phụ Kiện */}
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown size={18} className="text-amber-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-wide">
                  Phụ Kiện Đi Kèm
                </h2>
                <p className="text-[11px] text-slate-500">Bật/tắt thử trực tiếp trên mẫu 3D</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Đang mang: {equippedCount}
            </span>
          </div>

          {/* Bộ lọc loại phụ kiện */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/80 rounded-xl text-[11px]">
            <button
              onClick={() => setAccFilter("all")}
              className={`py-1 rounded-lg font-medium transition-all ${
                accFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setAccFilter("head")}
              className={`py-1 rounded-lg font-medium transition-all ${
                accFilter === "head" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Đầu & Cổ
            </button>
            <button
              onClick={() => setAccFilter("hand")}
              className={`py-1 rounded-lg font-medium transition-all ${
                accFilter === "hand" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Cầm Tay
            </button>
            <button
              onClick={() => setAccFilter("feet")}
              className={`py-1 rounded-lg font-medium transition-all ${
                accFilter === "feet" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Giày Dép
            </button>
          </div>

          {/* Danh sách thẻ phụ kiện có nút gạt thử đồ */}
          <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1">
            {filteredAccessories.map((acc) => {
              const isEquipped = outfit.accessories.includes(acc.id);

              return (
                <div
                  key={acc.id}
                  onClick={() => handleToggleAccessory(acc.id)}
                  className={`group relative p-2.5 rounded-xl cursor-pointer border transition-all duration-200 flex items-center justify-between gap-3 ${
                    isEquipped
                      ? "bg-amber-50/70 border-amber-400/90 shadow-sm"
                      : "bg-slate-50/60 border-slate-200/70 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="text-xl shrink-0 p-1 rounded-lg bg-white shadow-xs border border-slate-100">
                      {acc.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-slate-900 truncate">
                        {acc.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {acc.desc}
                      </p>
                    </div>
                  </div>

                  {/* Nút Toggle Switch */}
                  <div className="shrink-0 flex items-center">
                    <button
                      type="button"
                      className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                        isEquipped ? "bg-amber-600 justify-end" : "bg-slate-300 justify-start"
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Nút thao tác nhanh phụ kiện */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              onClick={() => {
                const def = ["acc_khan_van", "acc_kieng_bac", "acc_quat_tre"];
                setOutfit((prev) => ({ ...prev, accessories: def }));
                sceneManagerRef.current?.updateOutfit({ accessories: def });
                showToast("Đã đặt lại phụ kiện tiêu chuẩn");
              }}
              className="text-[11px] font-medium text-slate-600 hover:text-amber-700 transition-colors"
            >
              Mặc định (3 món)
            </button>
            <button
              onClick={() => {
                setOutfit((prev) => ({ ...prev, accessories: [] }));
                sceneManagerRef.current?.updateOutfit({ accessories: [] });
                showToast("Đã tháo toàn bộ phụ kiện");
              }}
              className="text-[11px] font-medium text-rose-600 hover:text-rose-800 transition-colors flex items-center gap-1"
            >
              <Trash2 size={12} />
              Tháo hết
            </button>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* KHU VỰC TRUNG TÂM: CANVAS 3D VIEWPORT NỀN TRẮNG STUDIO */}
        {/* ========================================================= */}
        <main className="col-span-12 lg:col-span-6 relative bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-lg flex flex-col">
          {/* Top Bar: Bộ điều khiển & Trạng thái */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
            {/* Chọn Giới Tính Nữ / Nam & Xoay 3D */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <div className="bg-white/95 border border-slate-200/90 shadow-sm p-1 rounded-xl flex items-center gap-1 backdrop-blur-md">
                <button
                  onClick={() => handleToggleGender("nu")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    outfit.gender === "nu"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Mẫu Nữ
                </button>
                <button
                  onClick={() => handleToggleGender("nam")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    outfit.gender === "nam"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Mẫu Nam
                </button>
              </div>

              <button
                onClick={handleToggleAutoRotate}
                title="Bật/Tắt xoay 360 độ"
                className={`p-2 rounded-xl border transition-all bg-white shadow-sm ${
                  isAutoRotating
                    ? "bg-amber-50 border-amber-500 text-amber-700 shadow-md"
                    : "border-slate-200 text-slate-600 hover:text-slate-900"
                }`}
              >
                <RotateCw size={15} className={isAutoRotating ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => {
                  if (sceneManagerRef.current) {
                    const dataUrl = sceneManagerRef.current.captureScreenshot();
                    const a = document.createElement("a");
                    a.href = dataUrl;
                    a.download = `viet-phuc-3d-${outfit.garmentId}.png`;
                    a.click();
                    showToast("Đã lưu ảnh chụp 3D chất lượng cao!");
                  }
                }}
                title="Chụp ảnh 3D"
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm transition-all"
              >
                <Camera size={15} />
              </button>
            </div>

            {/* Nút mở Studio Tạo Prompt 3D AI */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={() => setIsPromptStudioOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white text-xs font-bold shadow-md hover:shadow-lg hover:scale-102 transition-all flex items-center gap-1.5"
              >
                <Sparkles size={14} className="text-amber-200 animate-pulse" />
                <span>AI 3D Prompt Studio</span>
              </button>
            </div>
          </div>

          {/* Thước đo chiều cao ảo (Trái Canvas) */}
          <div className="absolute left-4 top-24 bottom-16 z-20 pointer-events-none flex items-center">
            <div className="h-full flex flex-col justify-between py-2 border-l border-slate-300 pl-2 font-mono text-[10px] text-slate-500">
              <div>190 cm</div>
              <div>175 cm</div>
              <div className="bg-amber-100 border border-amber-400 text-amber-900 font-bold px-1.5 py-0.5 rounded shadow-xs">
                {measurements.height} cm (Mục tiêu)
              </div>
              <div>155 cm</div>
              <div>140 cm</div>
            </div>
          </div>

          {/* Thẻ số đo ảo quanh mô hình */}
          <div className="absolute right-4 top-24 z-20 pointer-events-none flex flex-col gap-2">
            <div className="bg-white/95 border border-slate-200 shadow-md backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center justify-between gap-3 text-xs">
              <span className="text-[10px] text-slate-500 font-mono">NGỰC</span>
              <span className="font-mono font-bold text-slate-900">{measurements.chest} cm</span>
            </div>
            <div className="bg-white/95 border border-amber-300 shadow-md backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center justify-between gap-3 text-xs">
              <span className="text-[10px] text-amber-700 font-mono">EO</span>
              <span className="font-mono font-bold text-amber-700">{measurements.waist} cm</span>
            </div>
            <div className="bg-white/95 border border-slate-200 shadow-md backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center justify-between gap-3 text-xs">
              <span className="text-[10px] text-slate-500 font-mono">MÔNG</span>
              <span className="font-mono font-bold text-slate-900">{measurements.hip} cm</span>
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute inset-0 z-30 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full border-3 border-slate-200 border-t-amber-600 animate-spin" />
              <p className="text-xs font-medium text-slate-700">
                Đang nạp người mẫu Việt Nam & trang phục... {loadProgress}%
              </p>
            </div>
          )}

          {/* 3D WebGL Canvas Container: Nền Trắng Tinh Khôi */}
          <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Bottom Bar: Góc nhìn camera & Hướng dẫn */}
          <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
            <div className="bg-white/90 border border-slate-200 px-3 py-1 rounded-xl text-[11px] text-slate-500 shadow-xs">
              Kéo chuột xoay 360° · Cuộn chuột phóng to / thu nhỏ
            </div>

            <div className="flex items-center gap-1 pointer-events-auto bg-white/95 border border-slate-200 p-1 rounded-xl shadow-md">
              <button
                onClick={() => sceneManagerRef.current?.resetCamera("full")}
                className="px-2.5 py-1 text-xs rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
              >
                Toàn thân
              </button>
              <button
                onClick={() => sceneManagerRef.current?.resetCamera("close")}
                className="px-2.5 py-1 text-xs rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
              >
                Khuôn mặt & Cổ
              </button>
              <button
                onClick={() => sceneManagerRef.current?.resetCamera("hem")}
                className="px-2.5 py-1 text-xs rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
              >
                Tà áo & Quần
              </button>
            </div>
          </div>
        </main>

        {/* ========================================================= */}
        {/* CỘT PHẢI: TRANG PHỤC VĂN HÓA VIỆT NAM, MÀU SẮC & MAY ĐO */}
        {/* ========================================================= */}
        <aside className="col-span-12 lg:col-span-3 bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col gap-4 shadow-md overflow-y-auto">
          {/* Header Cột Phải */}
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders size={18} className="text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900 tracking-wide">
                Trang Phục & Tùy Chỉnh
              </h2>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold">
              Size M
            </span>
          </div>

          {/* 1. Danh sách Trang Phục Văn Hóa Việt Nam */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Shirt size={14} className="text-amber-600" />
              Trang phục văn hóa Việt Nam
            </h3>

            <div className="grid grid-cols-1 gap-1.5 max-h-[190px] overflow-y-auto pr-1">
              {VIETNAMESE_GARMENTS.map((item) => {
                const isSelected = outfit.garmentId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectGarment(item.id)}
                    className={`p-2 rounded-xl text-left border transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-amber-50/80 border-amber-500 text-slate-900 shadow-xs"
                        : "bg-slate-50/60 border-slate-200/70 hover:bg-white text-slate-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold truncate">{item.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.subtitle}</p>
                    </div>
                    {isSelected && <Check size={14} className="text-amber-700 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Bảng Màu Sắc Áo & Màu Quần */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Palette size={14} className="text-amber-600" />
                Màu sắc Áo chính
              </span>
              <span className="text-[10px] font-mono font-normal text-slate-500">
                {outfit.colors.main}
              </span>
            </h3>

            {/* Màu áo */}
            <div className="grid grid-cols-5 gap-2">
              {COLOR_PALETTES.map((color) => {
                const isSelected = outfit.colors.main.toLowerCase() === color.hex.toLowerCase();
                return (
                  <button
                    key={color.hex}
                    onClick={() => handleSelectMainColor(color.hex)}
                    title={`${color.name} (${color.desc})`}
                    className={`relative aspect-square rounded-xl transition-all shadow-xs flex items-center justify-center ${
                      isSelected ? "ring-2 ring-amber-600 ring-offset-2 scale-105" : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.hex }}
                  >
                    {isSelected && (
                      <Check
                        size={14}
                        className={color.hex === "#F8FAFC" ? "text-slate-900" : "text-white"}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Màu quần đi kèm (Đã sửa lỗi không bao giờ lộ ra ngoài) */}
            <div className="pt-2">
              <div className="flex justify-between items-center text-[11px] mb-1.5">
                <span className="font-semibold text-slate-700">Màu Quần Lụa Đi Kèm:</span>
                <span className="font-mono text-slate-500">{outfit.colors.pants}</span>
              </div>
              <div className="flex items-center gap-2">
                {PANTS_COLORS.map((p) => {
                  const isMatch = p.hex === "match";
                  const currentHex = isMatch ? outfit.colors.main : p.hex;
                  const isSelected = outfit.colors.pants.toLowerCase() === currentHex.toLowerCase();
                  return (
                    <button
                      key={p.name}
                      onClick={() => handleSelectPantsColor(p.hex)}
                      title={p.name}
                      className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] border font-medium transition-all ${
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white"
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Chọn chất liệu vải */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-amber-600" />
              Chất liệu vải
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {FABRIC_LIST.map((fab) => {
                const isSelected = outfit.fabric === fab.id;
                return (
                  <button
                    key={fab.id}
                    onClick={() => handleSelectFabric(fab.id)}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      isSelected
                        ? "bg-amber-50 border-amber-500 text-slate-900 font-semibold shadow-xs"
                        : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-white"
                    }`}
                  >
                    <div className="text-xs">{fab.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{fab.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Thanh trượt số đo cơ thể */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Ruler size={14} className="text-amber-600" />
              Số đo cơ thể người mặc
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-600">Chiều cao</span>
                  <span className="font-mono font-bold text-slate-900">{measurements.height} cm</span>
                </div>
                <input
                  type="range"
                  min={140}
                  max={195}
                  value={measurements.height}
                  onChange={(e) => setMeasurements({ ...measurements, height: Number(e.target.value) })}
                  className="w-full accent-amber-600 bg-slate-200 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-600">Cân nặng</span>
                  <span className="font-mono font-bold text-slate-900">{measurements.weight} kg</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={100}
                  value={measurements.weight}
                  onChange={(e) => setMeasurements({ ...measurements, weight: Number(e.target.value) })}
                  className="w-full accent-amber-600 bg-slate-200 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 5. Các nút bấm hành động lớn */}
          <div className="mt-auto flex flex-col gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={handleTryOn}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Zap size={15} />
              Thử Đồ (Try-on 3D)
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleToggleAutoRotate}
                className="py-2 px-3 rounded-xl font-semibold text-xs border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-all flex items-center justify-center gap-1.5"
              >
                <RotateCw size={13} className={isAutoRotating ? "animate-spin" : ""} />
                {isAutoRotating ? "Dừng xoay" : "Xoay 360°"}
              </button>

              <button
                onClick={() => setIsTailorModalOpen(true)}
                className="py-2 px-3 rounded-xl font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Scissors size={13} />
                Đặt May Đo
              </button>
            </div>

            <button
              onClick={() => setIsAiOpen(true)}
              className="w-full py-2 px-4 rounded-xl font-semibold text-xs border border-amber-300 bg-amber-50/70 hover:bg-amber-100 text-amber-900 transition-all flex items-center justify-center gap-2"
            >
              <Bot size={15} className="text-amber-700" />
              Trợ Lý AI Tư Vấn (Gemini)
            </button>
          </div>
        </aside>
      </div>

      {/* ========================================================= */}
      {/* MODAL TRỢ LÝ AI GEMINI TƯ VẤN THỜI TRANG */}
      {/* ========================================================= */}
      {isAiOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-sm">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Trợ Lý Thời Trang AI Gemini
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Google GenAI
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Phân tích dáng người & tư vấn phong cách Áo Dài Việt Nam
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAiOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <label className="block text-xs font-semibold text-slate-800">
                Sở thích màu sắc & dịp mặc:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiColorPref}
                  onChange={(e) => setAiColorPref(e.target.value)}
                  placeholder="Ví dụ: Đỏ hoàng triều, Vàng hoàng gia, Chụp ảnh kỷ yếu..."
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-600"
                />
                <button
                  onClick={handleAskGemini}
                  disabled={aiLoading}
                  className="px-4 py-2 rounded-xl font-bold text-xs bg-amber-600 text-white hover:bg-amber-700 transition-all flex items-center gap-1.5"
                >
                  {aiLoading ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                  {aiLoading ? "Đang phân tích..." : "Tư vấn"}
                </button>
              </div>
            </div>

            {aiResult && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-800 uppercase">Size Gợi Ý</span>
                    <div className="text-xl font-mono font-extrabold text-amber-900 mt-0.5">
                      {aiResult.size_recommendation?.size || "M"}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      {aiResult.size_recommendation?.fit_notes}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-700 uppercase">Dáng Người</span>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      {aiResult.body_analysis}
                    </p>
                  </div>
                </div>

                {aiResult.optimal_fabric && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="text-[10px] font-bold text-slate-700 uppercase">Chất Liệu Tối Ưu</span>
                    <h5 className="font-bold text-slate-900 mt-0.5">{aiResult.optimal_fabric?.name}</h5>
                    <p className="text-[11px] text-slate-600 mt-0.5">{aiResult.optimal_fabric?.reason}</p>
                  </div>
                )}

                {aiResult.stylist_message && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs italic text-amber-900">
                    "{aiResult.stylist_message}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL ĐẶT MAY ĐO */}
      {isTailorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Scissors size={18} className="text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Đặt May Đo Thủ Công</h3>
              </div>
              <button onClick={() => setIsTailorModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            {tailorSuccess ? (
              <div className="text-center py-4 space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check size={20} />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Đã Nhận Thông Tin!</h4>
                <p className="text-xs text-slate-600">
                  Nghệ nhân may đo Việt Phục sẽ liên hệ tư vấn trong 24h.
                </p>
                <button
                  onClick={() => {
                    setIsTailorModalOpen(false);
                    setTailorSuccess(false);
                  }}
                  className="mt-2 px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <div>Trang phục: <b className="text-slate-900">{currentGarment?.name}</b></div>
                  <div>Giới tính: <b className="text-slate-900">{outfit.gender === "nu" ? "Nữ" : "Nam"}</b></div>
                  <div>Phụ kiện kèm theo: <b className="text-amber-700">{outfit.accessories.length} món</b></div>
                  <div className="text-[11px] text-slate-500 font-mono pt-1">
                    Cao {measurements.height}cm · Nặng {measurements.weight}kg · Ngực {measurements.chest}cm · Eo {measurements.waist}cm
                  </div>
                </div>

                <button
                  onClick={() => setTailorSuccess(true)}
                  className="w-full py-2.5 rounded-xl font-bold text-xs uppercase bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-sm"
                >
                  Xác Nhận Đặt May
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Studio Tạo Prompt 3D AI */}
      <AiPromptStudioModal
        isOpen={isPromptStudioOpen}
        onClose={() => setIsPromptStudioOpen(false)}
      />
    </div>
  );
}
