import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  Box,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Layers3,
  Loader2,
  Palette,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import {
  catalog,
  defaultFittingOutfit,
  fittingAccessories,
  fittingExclusiveGroups,
  fittingGarments,
  fittingOutfitSchema,
  fittingStylistResultSchema,
  savedFittingOutfitSchema,
  validateFittingCulture,
} from "@domain";
import type {
  FittingOutfit,
  FittingStylistResult,
  SavedFittingOutfit,
} from "@domain";
import type { LineMotif, StylingRequest } from "../../types";
import { api, ApiError, type AccountSession } from "../../lib/account";
import { PatternStudio } from "../../components/PatternStudio";
import { DecorationEditor } from "../../components/DecorationEditor";
import {
  FreehandDesigner,
  type HandDrawing,
} from "../../components/FreehandDesigner";
import {
  FittingViewport,
  type FittingViewportHandle,
} from "./engine/FittingViewport";
import "./fitting3d.css";
import { adultProfiles } from "./engine/anatomy";

interface Props {
  outfit: FittingOutfit;
  onChange: (next: FittingOutfit) => void;
  session: AccountSession | null;
  onSessionUpdate: (session: AccountSession) => void;
  onAuth: () => void;
  onRefreshSession: () => void;
  onGeneratePattern: (prompt: string) => Promise<LineMotif>;
  generatedMotif: LineMotif | null;
  isPatternLoading: boolean;
}
type Panel =
  | "outfit"
  | "colors"
  | "motifs"
  | "accessories"
  | "culture"
  | "saved"
  | "ai";
const fabrics = [
  { id: "silk", name: "Lụa", detail: "Ánh mờ, mềm nhẹ" },
  { id: "gauze", name: "Sa", detail: "Vân dệt thanh thoát" },
  { id: "brocade", name: "Gấm", detail: "Vân nổi, điểm ánh kim" },
  { id: "satin", name: "Đoạn", detail: "Mịn và óng" },
] as const;
const layers = [
  { id: "base", name: "Lớp nền", sub: "Quần & áo trong", n: "0" },
  { id: "lining", name: "Lớp lót", sub: "Áo trong", n: "1" },
  { id: "garment", name: "Áo chính", sub: "Phom trang phục", n: "2" },
  { id: "head", name: "Đầu & cổ", sub: "Khăn, trang sức", n: "3" },
  { id: "accessories", name: "Đi kèm", sub: "Tay, eo & chân", n: "4" },
] as const;

export function FittingRoom({
  outfit,
  onChange,
  session,
  onSessionUpdate,
  onAuth,
  onRefreshSession,
  onGeneratePattern,
  generatedMotif,
  isPatternLoading,
}: Props) {
  const [panel, setPanel] = useState<Panel>("outfit"),
    [message, setMessage] = useState("");
  const [looks, setLooks] = useState<SavedFittingOutfit[]>([]),
    [title, setTitle] = useState("Bản phối 3D của tôi");
  const [savedId, setSavedId] = useState<string | null>(null),
    [storageVersion, setStorageVersion] = useState<number | null>(null);
  const [saving, setSaving] = useState(false),
    [aiLoading, setAiLoading] = useState(false),
    [ready, setReady] = useState(false);
  const [prompt, setPrompt] = useState(""),
    [proposal, setProposal] = useState<FittingStylistResult | null>(null);
  const [part, setPart] = useState("garment");
  const [mannequin,setMannequin] = useState(false);
  const [history, setHistory] = useState<FittingOutfit[]>([]);
  const [editor, setEditor] = useState<{
      brush?: LineMotif;
      style?: Pick<HandDrawing, "color" | "strokeWidth" | "opacity">;
    } | null>(null),
    [drawing, setDrawing] = useState(false);
  const viewport = useRef<FittingViewportHandle>(null),
    current = useRef(outfit),
    account = useRef(session);
  const epoch = useRef(0),
    request = useRef<AbortController | null>(null),
    busy = useRef(false);
  const resourceVersion = useRef(0);
  const emptyLoadRetries = useRef(0);
  current.current = outfit;
  account.current = session;
  const culture = validateFittingCulture(outfit);
  const garment = fittingGarments.find((g) => g.id === outfit.garmentId)!;
  const stale = proposal !== null && proposal.baseRevision !== outfit.revision;
  const update = (patch: Partial<FittingOutfit>) => {
    const previous = current.current;
    const checked = fittingOutfitSchema.safeParse({
      ...previous,
      ...patch,
      revision: previous.revision + 1,
    });
    if (!checked.success) {
      setMessage(checked.error.issues[0].message);
      return;
    }
    setHistory((h) => [...h.slice(-19), previous]);
    onChange(checked.data);
    setMessage("");
  };
  const identityKey = session
    ? `${session.actorId}:${session.csrfToken}`
    : "offline";
  const loadLooks = useCallback(async () => {
    const s = account.current;
    if (!s) return;
    const token = epoch.current,
      version = resourceVersion.current;
    try {
      const result = await api<{ looks: unknown[]; session: AccountSession }>(
        "/fitting3d/outfits",
      );
      if (token !== epoch.current || version !== resourceVersion.current)
        return;
      setLooks(result.looks.map((l) => savedFittingOutfitSchema.parse(l)));
      onSessionUpdate(result.session);
      if (result.looks.length === 0 && s.role === "member" && emptyLoadRetries.current < 2) {
        emptyLoadRetries.current += 1;
        window.setTimeout(() => {
          if (token === epoch.current) void loadLooks();
        }, 350);
      }
    } catch (error) {
      if (token === epoch.current)
        setMessage(
          error instanceof Error ? error.message : "Chưa tải được tủ đồ 3D.",
        );
    }
  }, [onSessionUpdate]);
  useEffect(() => {
    epoch.current++;
    emptyLoadRetries.current = 0;
    request.current?.abort();
    setAiLoading(false);
    busy.current = false;
    setLooks([]);
    setSavedId(null);
    setStorageVersion(null);
    setProposal(null);
    setHistory([]);
    setMessage("");
    setTitle("Bản phối 3D của tôi");
    setPrompt("");
    setEditor(null);
    setDrawing(false);
    void loadLooks();
  }, [identityKey, loadLooks]);
  useEffect(() => {
    const refresh = () => {
      if (!busy.current) void loadLooks();
    };
    window.addEventListener("focus", refresh);
    let channel: BroadcastChannel | undefined;
    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel("viet-phuc-account");
      channel.onmessage = refresh;
    }
    return () => {
      window.removeEventListener("focus", refresh);
      channel?.close();
    };
  }, [loadLooks]);
  useEffect(
    () => () => {
      epoch.current++;
      request.current?.abort();
    },
    [],
  );
  const notifyAccount = () => {
    if ("BroadcastChannel" in window) {
      const ch = new BroadcastChannel("viet-phuc-account");
      ch.postMessage("changed");
      ch.close();
    }
  };
  const quotaError = (error: unknown) => {
    setMessage(
      error instanceof Error ? error.message : "Không thể thực hiện yêu cầu.",
    );
    if (
      error instanceof ApiError &&
      ["AUTH_REQUIRED", "SESSION_CHANGED"].includes(error.code)
    )
      onRefreshSession();
    if (
      error instanceof ApiError &&
      ["LOOKBOOK_LIMIT", "AI_LIMIT"].includes(error.code) &&
      account.current?.role === "guest"
    )
      onAuth();
  };
  const save = async () => {
    if (busy.current) return;
    if (!session) {
      onAuth();
      return;
    }
    busy.current = true;
    resourceVersion.current++;
    setSaving(true);
    const version = epoch.current;
    try {
      const result = await api<{
        looks: unknown[];
        session: AccountSession;
        id?: string;
      }>(
        savedId ? `/fitting3d/outfits/${savedId}` : "/fitting3d/outfits",
        {
          method: savedId ? "PUT" : "POST",
          body: JSON.stringify({
            title,
            outfit: current.current,
            ...(savedId ? { storageVersion } : {}),
          }),
        },
        session,
      );
      if (version !== epoch.current) return;
      resourceVersion.current++;
      const next = result.looks.map((l) => savedFittingOutfitSchema.parse(l));
      setLooks(next);
      onSessionUpdate(result.session);
      const stored = next.find((l) => l.id === (savedId || result.id));
      if (stored) {
        setSavedId(stored.id);
        setStorageVersion(stored.storageVersion);
      }
      setMessage("Đã lưu bản phối 3D vào tủ đồ.");
      notifyAccount();
    } catch (error) {
      if (version === epoch.current) {
        quotaError(error);
        if (error instanceof ApiError && error.code === "OUTFIT_CONFLICT")
          void loadLooks();
      }
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  const remove = async (id: string) => {
    if (busy.current || !session) return;
    busy.current = true;
    resourceVersion.current++;
    setSaving(true);
    const version = epoch.current;
    try {
      const result = await api<{ looks: unknown[]; session: AccountSession }>(
        `/fitting3d/outfits/${id}`,
        { method: "DELETE" },
        session,
      );
      if (version !== epoch.current) return;
      resourceVersion.current++;
      setLooks(result.looks.map((l) => savedFittingOutfitSchema.parse(l)));
      onSessionUpdate(result.session);
      notifyAccount();
      if (savedId === id) {
        setSavedId(null);
        setStorageVersion(null);
      }
      setMessage("Đã xóa bản phối 3D.");
    } catch (error) {
      if (version === epoch.current) quotaError(error);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  const openLook = (look: SavedFittingOutfit) => {
    update({ ...look.outfit, revision: current.current.revision + 1 });
    setTitle(look.title);
    setSavedId(look.id);
    setStorageVersion(look.storageVersion);
    setPanel("outfit");
  };
  const capture = async () => {
    try {
      const url = await viewport.current?.capture();
      if (!url) throw new Error("Chờ cảnh 3D tải xong trước khi chụp.");
      const a = document.createElement("a");
      a.href = url;
      a.download = "viet-phuc-3d.png";
      a.click();
      setMessage("Đã chụp ảnh bản phối 3D.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Chưa chụp được ảnh.",
      );
    }
  };
  const askAI = async () => {
    if (aiLoading || isPatternLoading) return;
    if (!session) {
      onAuth();
      return;
    }
    const before = current.current,
      version = epoch.current,
      requestId = crypto.randomUUID(),
      controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    const timer = setTimeout(() => controller.abort(), 29000);
    resourceVersion.current++;
    setAiLoading(true);
    setMessage("");
    try {
      const result = await api<{
        baseRevision: number;
        requestId: string;
        source: string;
        note: string;
        suggestions: unknown[];
        session: AccountSession;
      }>(
        "/fitting3d/stylist",
        {
          method: "POST",
          body: JSON.stringify({ outfit: before, prompt, requestId }),
          signal: controller.signal,
        },
        session,
      );
      if (version !== epoch.current) return;
      if (
        result.requestId !== requestId ||
        result.baseRevision !== before.revision
      )
        throw new ApiError(
          "Gợi ý không khớp với yêu cầu hiện tại. Hãy thử lại.",
          "INVALID_RESPONSE",
        );
      const { session: returned, ...data } = result;
      resourceVersion.current++;
      setProposal(fittingStylistResultSchema.parse(data));
      onSessionUpdate(returned);
      notifyAccount();
    } catch (error) {
      if (version === epoch.current) quotaError(error);
    } finally {
      clearTimeout(timer);
      if (version === epoch.current) setAiLoading(false);
    }
  };
  const toggleAccessory = (id: string) => {
    let next = outfit.accessories.includes(id)
      ? outfit.accessories.filter((a) => a !== id)
      : [
          ...outfit.accessories.filter(
            (a) =>
              !fittingExclusiveGroups.find((g) => g.includes(id))?.includes(a),
          ),
          id,
        ];
    update({ accessories: next });
  };
  const drawingDraft: StylingRequest = {
    garmentId: outfit.garmentId.startsWith("ao_dai") ? "ao_dai" : "ao_ngu_than",
    eventId: outfit.eventId,
    styleId: outfit.styleId,
    gender: outfit.gender,
    primaryColor: outfit.colors.main,
    accentColor: outfit.colors.pattern,
    selectedAccessories: outfit.accessories.filter((id) =>
      catalog.accessories.some((a) => a.id === id),
    ),
    pattern: outfit.pattern,
  };
  const panels = [
    { id: "outfit", label: "Trang phục", icon: Layers3 },
    { id: "colors", label: "Màu & vải", icon: Palette },
    { id: "motifs", label: "Hoa văn", icon: Sparkles },
    { id: "accessories", label: "Phụ kiện", icon: Box },
    { id: "culture", label: "Câu chuyện", icon: BookOpen },
    { id: "saved", label: "Tủ đồ 3D", icon: Save },
    { id: "ai", label: "AI Stylist", icon: Sparkles },
  ] as const;
  return (
    <section className="fitting-room enter" aria-label="Phòng thử đồ 3D">
      <div className="fitting-heading">
        <div>
          <span className="eyebrow">VIỆT PHỤC / INTERACTIVE STUDIO</span>
          <h1>
            Nét Việt trong <em>không gian 3D.</em>
          </h1>
          <p>Xoay một vòng, thử một dáng. Thêm chất riêng vào từng nếp áo.</p>
        </div>
        <div className="fitting-heading-actions">
          <button
            className="button secondary"
            disabled={!history.length}
            onClick={() => {
              const last = history[history.length - 1];
              setHistory((h) => h.slice(0, -1));
              onChange({ ...last, revision: current.current.revision + 1 });
            }}
          >
            <Undo2 size={15} />
            Hoàn tác
          </button>
          <button
            className="button secondary"
            onClick={capture}
            disabled={!ready}
          >
            <ArrowDownToLine size={15} />
            Chụp ảnh 3D
          </button>
          <button
            className="button primary"
            onClick={() => void save()}
            disabled={saving}
          >
            <Save size={15} />
            {saving
              ? "Đang lưu…"
              : savedId
                ? "Cập nhật bản phối"
                : "Lưu bản phối 3D"}
          </button>
        </div>
      </div>
      {message && (
        <div className="fitting-message" role="status">
          <Check size={15} />
          <span>{message}</span>
          <button aria-label="Đóng thông báo 3D" onClick={() => setMessage("")}>
            <X size={14} />
          </button>
        </div>
      )}
      <div className="fitting-workspace">
        <aside className="fitting-wardrobe">
          <div className="fitting-panel-heading">
            <span className="eyebrow">TỦ ĐỒ VĂN HÓA</span>
            <span>07 PHOM</span>
          </div>
          <div
            className="fitting-model-toggle"
            role="group"
            aria-label="Chọn mannequin 3D"
          >
            {(["nu", "nam"] as const).map((g) => (
              <button
                key={g}
                aria-pressed={outfit.gender === g}
                onClick={() => update({ gender: g })}
              >
                {g === "nu" ? "Mẫu nữ 3D" : "Mẫu nam 3D"}
              </button>
            ))}
          </div>
          <p
            className="fitting-body-preset"
            data-testid="body-proportion-label"
          >
            {adultProfiles[outfit.gender].label} · Tỷ lệ người trưởng thành
          </p>
          <label className="fitting-select-label">
            Dịp mặc
            <select
              aria-label="Dịp mặc 3D"
              value={outfit.eventId}
              onChange={(e) =>
                update({ eventId: e.target.value as FittingOutfit["eventId"] })
              }
            >
              {catalog.events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <div
            className="fitting-garments"
            role="group"
            aria-label="Chọn trang phục 3D"
          >
            {fittingGarments.map((g, i) => (
              <button
                key={g.id}
                className={outfit.garmentId === g.id ? "selected" : ""}
                aria-pressed={outfit.garmentId === g.id}
                aria-label={`Thử 3D ${g.name}`}
                onClick={() => update({ garmentId: g.id })}
              >
                <span
                  className={`garment-symbol variant-${g.id}`}
                  aria-hidden="true"
                >
                  <i />
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <strong>{g.name}</strong>
                  <small>{g.subtitle}</small>
                </span>
                {outfit.garmentId === g.id && <Check size={15} />}
              </button>
            ))}
          </div>
          <p className="fitting-reference-note">
            Mẫu hình khối được dựng để thử phối. Chi tiết phục dựng cần đối
            chiếu hồ sơ riêng.
          </p>
        </aside>
        <div className="fitting-center">
          <div className="fitting-canvas-top">
            <span className="eyebrow">{garment.name}</span>
            <span className="fitting-live">
              <i />
              {ready ? "3D TRỰC TIẾP" : "MẪU MINH HỌA"}
            </span>
          </div>
          <div className="fitting-avatar-display" role="group" aria-label="Hiển thị mannequin">
            <button aria-pressed={!mannequin} onClick={()=>setMannequin(false)}>Thử trang phục</button>
            <button aria-pressed={mannequin} onClick={()=>setMannequin(true)}>Mẫu trơn A-pose</button>
            <small>Bề mặt mịn · Không đường lưới</small>
          </div>
          <div className="fitting-canvas-wrap">
            <FittingViewport
              ref={viewport}
              outfit={outfit}
              mannequin={mannequin}
              onReady={setReady}
              onPartSelect={(selected) => {
                setPart(selected);
                setPanel("culture");
              }}
            />
            <div className="fitting-canvas-caption">
              <Box size={14} />
              Kéo để xoay · Cuộn hoặc chụm để zoom
            </div>
          </div>
          <div
            className="fitting-camera-controls"
            role="group"
            aria-label="Góc nhìn 3D"
          >
            {(
              [
                { id: "full", name: "Toàn thân" },
                { id: "head", name: "Cổ & khăn" },
                { id: "hem", name: "Chi tiết tà" },
              ] as const
            ).map((c) => (
              <button
                key={c.id}
                aria-pressed={outfit.camera === c.id}
                onClick={() => {
                  update({ camera: c.id });
                  viewport.current?.resetView(c.id);
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div
            className="fitting-pose-controls"
            role="group"
            aria-label="Tư thế 3D"
          >
            <span>TƯ THẾ</span>
            {(
              [
                { id: "stand", name: "Đứng trang nhã" },
                { id: "fan", name: "Nghiêng cầm quạt" },
                { id: "walk", name: "Đi nhẹ" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                aria-pressed={outfit.pose === p.id}
                onClick={() => update({ pose: p.id })}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div
            className="fitting-layer-dock"
            role="group"
            aria-label="Các lớp phục trang 3D"
          >
            {layers.map((l) => (
              <button
                key={l.id}
                aria-pressed={outfit.layers[l.id]}
                onClick={() =>
                  update({
                    layers: { ...outfit.layers, [l.id]: !outfit.layers[l.id] },
                  })
                }
              >
                <b>{l.n}</b>
                <span>
                  <strong>{l.name}</strong>
                  <small>{l.sub}</small>
                </span>
                {outfit.layers[l.id] ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
            ))}
          </div>
        </div>
        <aside className="fitting-inspector">
          <div
            className="fitting-inspector-tabs"
            role="tablist"
            aria-label="Chi tiết phòng 3D"
          >
            {panels.map((p) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={panel === p.id}
                aria-controls={`fitting-panel-${p.id}`}
                onClick={() => setPanel(p.id)}
              >
                <p.icon size={14} />
                {p.label}
              </button>
            ))}
          </div>
          <div
            className="fitting-inspector-body"
            role="tabpanel"
            id={`fitting-panel-${panel}`}
          >
            {panel === "outfit" && (
              <>
                <span className="eyebrow">BẢN PHỐI CỦA BẠN</span>
                <h2>{garment.name}</h2>
                <p className="fitting-description">{garment.subtitle}</p>
                <label className="fitting-select-label">
                  Tên bản phối
                  <input
                    aria-label="Tên bản phối 3D"
                    value={title}
                    maxLength={100}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <label className="fitting-select-label">
                  Phong cách
                  <select
                    aria-label="Phong cách 3D"
                    value={outfit.styleId}
                    onChange={(e) => update({ styleId: e.target.value })}
                  >
                    {catalog.styles.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div
                  className="fitting-mode-toggle"
                  role="group"
                  aria-label="Chế độ văn hóa 3D"
                >
                  <button
                    aria-pressed={outfit.mode === "creative"}
                    onClick={() => update({ mode: "creative" })}
                  >
                    Sáng tạo Gen Z
                  </button>
                  <button
                    aria-pressed={outfit.mode === "strict"}
                    onClick={() => update({ mode: "strict" })}
                  >
                    Kiểm tra phục chế
                  </button>
                </div>
                <div className={`fitting-cultural-status ${outfit.mode}`}>
                  <BookOpen size={17} />
                  <strong>{culture.title}</strong>
                  <p>{culture.message}</p>
                </div>
                <button className="text-link" onClick={() => setPanel("ai")}>
                  Tìm cảm hứng cùng AI <ArrowUpRight size={15} />
                </button>
                <button
                  className="fitting-reset text-link"
                  onClick={() => {
                    update({ ...defaultFittingOutfit });
                    setSavedId(null);
                    setStorageVersion(null);
                    setTitle("Bản phối 3D của tôi");
                  }}
                >
                  Đặt lại phòng 3D
                </button>
              </>
            )}
            {panel === "colors" && (
              <>
                <span className="eyebrow">CHẤT LIỆU & SẮC MÀU</span>
                <h2>Màu sắc của bạn</h2>
                {(
                  [
                    { id: "main", name: "Màu áo 3D" },
                    { id: "pants", name: "Màu quần 3D" },
                    { id: "lining", name: "Màu lớp lót 3D" },
                    { id: "pattern", name: "Màu hoa văn 3D" },
                  ] as const
                ).map((c) => (
                  <div className="fitting-color-field" key={c.id}>
                    <label>
                      <span>{c.name}</span>
                      <input
                        aria-label={c.name}
                        type="color"
                        value={outfit.colors[c.id]}
                        onChange={(e) =>
                          update({
                            colors: {
                              ...outfit.colors,
                              [c.id]: e.target.value.toUpperCase(),
                            },
                          })
                        }
                      />
                      <small>{outfit.colors[c.id]}</small>
                    </label>
                    <div className="fitting-swatches">
                      {catalog.colorPalette.map((color) => (
                        <button
                          key={color.id}
                          title={color.name}
                          aria-label={`${c.name}: ${color.name}`}
                          aria-pressed={outfit.colors[c.id] === color.hex}
                          style={{ background: color.hex }}
                          onClick={() =>
                            update({
                              colors: { ...outfit.colors, [c.id]: color.hex },
                            })
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <fieldset className="fitting-fabrics">
                  <legend>Chất liệu vải 3D</legend>
                  {fabrics.map((f) => (
                    <button
                      key={f.id}
                      aria-pressed={outfit.fabric === f.id}
                      onClick={() => update({ fabric: f.id })}
                    >
                      <strong>{f.name}</strong>
                      <span>{f.detail}</span>
                      {outfit.fabric === f.id && <Check size={13} />}
                    </button>
                  ))}
                </fieldset>
                <p className="fitting-reference-note">
                  Ánh vải là preset minh họa dưới ánh sáng studio.
                </p>
              </>
            )}
            {panel === "accessories" && (
              <>
                <span className="eyebrow">MỘT CHÚT ĐIỂM NHẤN</span>
                <h2>Phụ kiện đi cùng</h2>
                <p className="fitting-description">
                  Mỗi nhóm giày, túi, vòng cổ hoặc nón dùng một món. Các món
                  khác có thể phối cùng nhau.
                </p>
                <div className="fitting-accessories">
                  {fittingAccessories.map((a) => (
                    <button
                      key={a.id}
                      aria-pressed={outfit.accessories.includes(a.id)}
                      aria-label={`Phụ kiện 3D ${a.name}`}
                      onClick={() => toggleAccessory(a.id)}
                    >
                      <span className="check-box">
                        {outfit.accessories.includes(a.id) && (
                          <Check size={12} />
                        )}
                      </span>
                      <span>
                        {a.name}
                        <small>{a.category}</small>
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  className="text-link"
                  onClick={() => update({ accessories: [] })}
                >
                  Bỏ phụ kiện 3D
                </button>
              </>
            )}
            {panel === "motifs" && (
              <PatternStudio
                pattern={outfit.pattern}
                accentColor={outfit.colors.pattern}
                onChange={(pattern) => update({ pattern })}
                onGenerate={onGeneratePattern}
                isGenerating={isPatternLoading || aiLoading}
                generated={generatedMotif}
                onDecorate={(brush) => setEditor({ brush })}
                onDraw={() => setDrawing(true)}
              />
            )}
            {panel === "culture" && (
              <>
                <span className="eyebrow">CHUYỆN SAU NẾP ÁO</span>
                <h2>
                  {part === "collar"
                    ? "Nét cổ áo"
                    : part === "hem"
                      ? "Nếp tà & hoa văn"
                      : part === "head"
                        ? "Khăn & trang sức"
                        : garment.name}
                </h2>
                <div className="fitting-cultural-status">
                  <strong>{culture.title}</strong>
                  <p>{culture.message}</p>
                </div>
                {culture.facts.map((f) => (
                  <article key={f.id} className="fitting-story">
                    <h3>{f.title}</h3>
                    <p>{f.description}</p>
                    <a
                      className="text-link"
                      href={f.reference.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {f.reference.publisher}
                      <ArrowUpRight size={14} />
                    </a>
                  </article>
                ))}
                {culture.facts.length === 0 && (
                  <p className="fitting-description">
                    Tư liệu cho variant này đang được bổ sung. Mẫu hiện dùng để
                    khám phá dáng áo và phối sáng tạo.
                  </p>
                )}
                {culture.notices.map((n, i) => (
                  <p className="fitting-reference-note" key={i}>
                    {n}
                  </p>
                ))}
              </>
            )}
            {panel === "saved" && (
              <>
                <div className="fitting-saved-header">
                  <span className="eyebrow">TỦ ĐỒ 3D</span>
                  <button
                    className="icon-button"
                    aria-label="Tải lại tủ đồ 3D"
                    onClick={() => void loadLooks()}
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
                <h2>Những dáng áo muốn giữ.</h2>
                <p className="fitting-description">
                  Giới hạn tủ đồ dùng chung với bản phối 2D.
                </p>
                {looks.length === 0 ? (
                  <div className="fitting-empty">
                    <Save size={27} />
                    <p>Chưa có bản phối 3D. Lưu một bộ bạn thích để mở lại.</p>
                  </div>
                ) : (
                  <div className="fitting-saved-list">
                    {looks.map((look) => (
                      <article key={look.id} className="fitting-saved-card">
                        <div className="fitting-saved-colors">
                          {Object.values(look.outfit.colors)
                            .slice(0, 3)
                            .map((c, i) => (
                              <i key={i} style={{ background: c }} />
                            ))}
                        </div>
                        <span className="small-label">
                          {
                            fittingGarments.find(
                              (g) => g.id === look.outfit.garmentId,
                            )?.name
                          }{" "}
                          · {look.outfit.gender === "nam" ? "Nam" : "Nữ"}
                        </span>
                        <h3>{look.title}</h3>
                        <div>
                          <button
                            className="text-link"
                            onClick={() => openLook(look)}
                          >
                            Mở bản phối 3D <ChevronRight size={14} />
                          </button>
                          <button
                            className="icon-button"
                            disabled={saving}
                            aria-label={`Xóa 3D ${look.title}`}
                            onClick={() => void remove(look.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
            {panel === "ai" && (
              <>
                <span className="eyebrow">AI STYLIST</span>
                <h2>Cảm hứng từ những nếp áo.</h2>
                <label className="fitting-select-label">
                  Bạn muốn phối thế nào?
                  <textarea
                    aria-label="Yêu cầu AI 3D"
                    rows={3}
                    maxLength={400}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ví dụ: xanh ngọc thanh lịch, quạt tre, chụp ảnh kỷ yếu"
                  />
                </label>
                <button
                  className="button primary full"
                  disabled={aiLoading || isPatternLoading}
                  onClick={() => void askAI()}
                >
                  {aiLoading ? (
                    <Loader2 className="spin" size={16} />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  Gợi ý AI cho 3D
                </button>
                <p className="fitting-reference-note">
                  Tạo gợi ý thành công dùng 1 lượt AI. Bạn vẫn có thể chỉnh đồ
                  trong lúc chờ.
                </p>
                {proposal && (
                  <div className="fitting-ai-results">
                    <p className="fitting-ai-note">
                      {proposal.source === "gemini"
                        ? "Gợi ý Gemini"
                        : "Gợi ý mẫu"}{" "}
                      · {proposal.note}
                    </p>
                    {stale && (
                      <p className="fitting-stale" role="status">
                        Bạn đã thay đổi bản phối. Tạo lại gợi ý để áp dụng vào
                        trạng thái mới.
                      </p>
                    )}
                    {proposal.suggestions.map((s) => (
                      <article key={s.id}>
                        <div className="fitting-saved-colors">
                          <i style={{ background: s.outfit.colors.main }} />
                          <i style={{ background: s.outfit.colors.pants }} />
                        </div>
                        <h3>{s.title}</h3>
                        <p>{s.reason}</p>
                        <button
                          className="button secondary"
                          disabled={stale}
                          onClick={() => {
                            if (
                              proposal.baseRevision !== current.current.revision
                            )
                              return;
                            update(s.outfit);
                            setProposal(null);
                          }}
                        >
                          Áp dụng gợi ý 3D <ArrowUpRight size={14} />
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
      <p className="fitting-bottom-note">
        Mô hình minh họa 3D · Chưa thay thế thử kích cỡ thực tế hoặc bộ phục
        dựng lịch sử đã thẩm định.
      </p>
      {editor && (
        <DecorationEditor
          draft={drawingDraft}
          initialBrush={editor.brush}
          initialStyle={editor.style}
          onApply={(pattern) => update({ pattern })}
          onClose={() => setEditor(null)}
        />
      )}
      {drawing && (
        <FreehandDesigner
          initialColor={outfit.colors.pattern}
          initialWidth={outfit.pattern.strokeWidth}
          onClose={() => setDrawing(false)}
          onUse={({ motif, ...style }) => {
            if (outfit.pattern.placement === "free")
              setEditor({ brush: motif, style });
            else
              update({
                pattern: {
                  ...outfit.pattern,
                  motifId: "custom",
                  custom: motif,
                  ...style,
                },
              });
          }}
        />
      )}
    </section>
  );
}
