import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import {
  Check,
  Copy,
  Hand,
  PenLine,
  Plus,
  Redo2,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import {
  MAX_DECORATIONS,
  motifCatalog,
  patternSchema,
  toFreePattern,
} from "@domain";
import type {
  Decoration,
  GarmentPattern,
  LineMotif,
  StylingRequest,
} from "../types";
import { GarmentMockupSvg } from "./GarmentMockupSvg";
import { MotifThumbnail } from "./GarmentPattern";
import { FreehandDesigner, type HandDrawing } from "./FreehandDesigner";

type Point = { x: number; y: number };
type Brush = {
  motifId: Decoration["motifId"];
  assetId?: string;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
};
type Gesture = {
  pointerId: number;
  action: "move" | "resize" | "rotate";
  before: GarmentPattern;
  item: Decoration;
  start: Point;
};
const bound = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
const round = (n: number) => Math.round(n * 100) / 100;
const angle = (point: Point, center: Point) =>
  (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI;
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const uid = () => crypto.randomUUID();

function seed(draft: StylingRequest, initialBrush?: LineMotif) {
  const pattern = toFreePattern(
    draft.pattern,
    draft.garmentId === "ao_ngu_than",
    draft.gender === "nam",
  );
  const incoming = initialBrush || draft.pattern.custom;
  let brush: Brush = {
    motifId:
      draft.pattern.motifId === "custom" || draft.pattern.motifId === "none"
        ? "lotus"
        : draft.pattern.motifId,
  };
  let error = "";
  if (incoming) {
    // Remove unplaced AI assets when bringing in a new one; placed artwork is retained.
    if (initialBrush)
      pattern.assets = pattern.assets?.filter(
        (a) =>
          pattern.decorations?.some((d) => d.assetId === a.id) ||
          JSON.stringify(a.motif) === JSON.stringify(incoming),
      );
    const existing = pattern.assets?.find(
      (a) => JSON.stringify(a.motif) === JSON.stringify(incoming),
    );
    const asset = existing || { id: uid(), motif: incoming };
    const checked = patternSchema.safeParse({
      ...pattern,
      assets: existing ? pattern.assets : [...(pattern.assets || []), asset],
    });
    if (checked.success) {
      Object.assign(pattern, checked.data);
      brush = { motifId: "custom", assetId: asset.id };
    } else
      error =
        "Mẫu riêng này chưa thể thêm vì bố cục đã nhiều chi tiết. Hãy dùng mẫu có sẵn hoặc bớt các mẫu riêng khác.";
  }
  return { pattern, brush, error };
}

export function DecorationEditor({
  draft,
  initialBrush,
  initialStyle,
  onApply,
  onClose,
}: {
  draft: StylingRequest;
  initialBrush?: LineMotif;
  initialStyle?: Pick<HandDrawing, "color" | "strokeWidth" | "opacity">;
  onApply: (pattern: GarmentPattern) => void;
  onClose: () => void;
}) {
  const [initial] = useState(() => seed(draft, initialBrush));
  const [working, setWorking] = useState(initial.pattern);
  const workingRef = useRef(working);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [brush, setBrush] = useState<Brush>({
    ...initial.brush,
    ...initialStyle,
  });
  const [drawing, setDrawing] = useState(false);
  const [mode, setMode] = useState<"move" | "place">(
    initialBrush ? "place" : "move",
  );
  const [error, setError] = useState(initial.error);
  const [history, setHistory] = useState<GarmentPattern[]>([]),
    [future, setFuture] = useState<GarmentPattern[]>([]);
  const dialog = useRef<HTMLDialogElement>(null),
    canvas = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const chooseBrush = (next: Brush) => {
    setBrush(next);
    setMode("place");
    setError("");
    if (window.innerWidth <= 760)
      canvas.current?.scrollIntoView({ block: "center", behavior: "auto" });
  };
  const selected = working.decorations?.find((d) => d.id === selectedId);
  useEffect(() => {
    if (brush.assetId && !working.assets?.some((a) => a.id === brush.assetId))
      setBrush({ motifId: "lotus" });
  }, [working.assets, brush.assetId]);
  const updateWorking = (next: GarmentPattern) => {
    workingRef.current = next;
    setWorking(next);
  };
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  const remember = (before: GarmentPattern) => {
    setHistory((h) => [...h.slice(-29), before]);
    setFuture([]);
  };
  const commit = (next: GarmentPattern) => {
    const parsed = patternSchema.safeParse(next);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return false;
    }
    if (JSON.stringify(parsed.data) === JSON.stringify(workingRef.current))
      return true;
    remember(workingRef.current);
    updateWorking(parsed.data);
    setError("");
    return true;
  };
  const patchSelected = (patch: Partial<Decoration>) => {
    if (!selectedId) return;
    commit({
      ...workingRef.current,
      decorations: workingRef.current.decorations?.map((d) =>
        d.id === selectedId ? { ...d, ...patch } : d,
      ),
    });
  };
  const undo = () => {
    if (!history.length) return;
    const current = workingRef.current;
    const next = history[history.length - 1];
    setFuture((f) => [current, ...f].slice(0, 30));
    setHistory((h) => h.slice(0, -1));
    updateWorking(next);
    setSelectedId(null);
    setError("");
  };
  const redo = () => {
    if (!future.length) return;
    const current = workingRef.current;
    setHistory((h) => [...h.slice(-29), current]);
    const next = future[0];
    setFuture((f) => f.slice(1));
    updateWorking(next);
    setSelectedId(null);
    setError("");
  };
  const svg = () =>
    canvas.current?.querySelector<SVGSVGElement>(".garment-svg");
  const pointAt = (event: {
    clientX: number;
    clientY: number;
  }): Point | null => {
    const el = svg(),
      matrix = el?.getScreenCTM();
    if (!el || !matrix) return null;
    const p = el.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    const local = p.matrixTransform(matrix.inverse());
    return { x: local.x, y: local.y };
  };
  const onCloth = (point: Point) => {
    const el = svg();
    if (!el) return false;
    const p = el.createSVGPoint();
    p.x = point.x;
    p.y = point.y;
    return [
      ...el.querySelectorAll<SVGGeometryElement>("[data-pattern-surface]"),
    ].some((path) => path.isPointInFill(p));
  };
  const duplicate = () => {
    if (!selected) return;
    if ((working.decorations?.length || 0) >= MAX_DECORATIONS) {
      setError(`Tối đa ${MAX_DECORATIONS} họa tiết trong một bản phối.`);
      return;
    }
    const point = [
      { x: selected.x + 12, y: selected.y + 14 },
      { x: selected.x - 12, y: selected.y + 14 },
      selected,
    ].find(onCloth)!;
    const next = { ...selected, ...point, id: uid() };
    if (
      commit({
        ...working,
        decorations: [...(working.decorations || []), next],
      })
    ) {
      setSelectedId(next.id);
      setMode("move");
    }
  };
  const remove = () => {
    if (
      selectedId &&
      commit({
        ...working,
        decorations: working.decorations?.filter((d) => d.id !== selectedId),
      })
    )
      setSelectedId(null);
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (gesture.current || !event.isPrimary || event.button !== 0) return;
    const point = pointAt(event);
    if (!point) return;
    const hit = (event.target as Element).closest<SVGElement>(
      "[data-decoration-id]",
    );
    const action = (event.target as Element).getAttribute(
      "data-decoration-action",
    ) as Gesture["action"] | null;
    let item = workingRef.current.decorations?.find(
      (d) => d.id === hit?.dataset.decorationId,
    );
    const before = workingRef.current;
    if (mode === "place" && (!action || action === "move")) {
      if (!onCloth(point)) {
        setError("Chạm vào phần vải áo để đặt hoa văn.");
        return;
      }
      if ((before.decorations?.length || 0) >= MAX_DECORATIONS) {
        setError(
          `Tối đa ${MAX_DECORATIONS} họa tiết. Xóa bớt một họa tiết để đặt thêm.`,
        );
        return;
      }
      item = {
        id: uid(),
        ...brush,
        x: round(point.x),
        y: round(point.y),
        scale: round(0.45 * draft.pattern.scale),
        rotation: 0,
        color: brush.color ?? draft.pattern.color,
        strokeWidth: brush.strokeWidth ?? draft.pattern.strokeWidth,
        opacity: brush.opacity ?? draft.pattern.opacity,
      };
      const parsed = patternSchema.safeParse({
        ...before,
        decorations: [...(before.decorations || []), item],
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        return;
      }
      updateWorking(parsed.data);
    } else if (!item) {
      setSelectedId(null);
      return;
    }
    if (!item) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(item.id);
    setError("");
    gesture.current = {
      pointerId: event.pointerId,
      action: action === "rotate" || action === "resize" ? action : "move",
      before,
      item,
      start: point,
    };
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    const point = pointAt(event);
    if (!point) return;
    event.preventDefault();
    let patch: Partial<Decoration>;
    if (g.action === "move") {
      const destination = {
        x: round(g.item.x + point.x - g.start.x),
        y: round(g.item.y + point.y - g.start.y),
      };
      if (!onCloth(destination)) return;
      patch = destination;
    } else if (g.action === "resize") {
      patch = {
        scale: round(
          bound(
            (g.item.scale * distance(point, g.item)) /
              Math.max(1, distance(g.start, g.item)),
            0.12,
            1.2,
          ),
        ),
      };
    } else {
      const degrees =
        g.item.rotation + angle(point, g.item) - angle(g.start, g.item);
      patch = { rotation: round(((degrees + 540) % 360) - 180) };
    }
    updateWorking({
      ...workingRef.current,
      decorations: workingRef.current.decorations?.map((d) =>
        d.id === g.item.id ? { ...d, ...patch } : d,
      ),
    });
  };
  const endPointer = (event: PointerEvent<HTMLDivElement>, cancel = false) => {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (cancel) updateWorking(g.before);
    else if (JSON.stringify(g.before) !== JSON.stringify(workingRef.current))
      remember(g.before);
  };
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      remove();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      event.shiftKey ? redo() : undo();
      return;
    }
    if (!selected) return;
    const step = event.shiftKey ? 10 : 2;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (delta[event.key]) {
      event.preventDefault();
      const [dx, dy] = delta[event.key];
      const point = { x: selected.x + dx, y: selected.y + dy };
      if (onCloth(point)) patchSelected(point);
    }
  };
  const assetName = (d: Decoration) =>
    d.motifId === "custom"
      ? working.assets?.find((a) => a.id === d.assetId)?.motif.name
      : motifCatalog.find((m) => m.id === d.motifId)?.name;
  return (
    <dialog
      ref={dialog}
      className="decoration-dialog"
      aria-labelledby="decoration-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header className="decoration-header">
        <div>
          <span className="eyebrow">STUDIO CỦA RIÊNG BẠN</span>
          <h2 id="decoration-title">Trang trí ngay trên áo</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Đóng trình trang trí"
          onClick={onClose}
        >
          <X size={21} />
        </button>
      </header>
      <div className="decoration-layout">
        <div className="decoration-stage">
          <div className="decoration-tools">
            <button
              aria-pressed={mode === "move"}
              onClick={() => {
                setMode("move");
                setError("");
              }}
            >
              <Hand size={15} />
              Chọn & kéo
            </button>
            <button
              aria-pressed={mode === "place"}
              onClick={() => {
                setMode("place");
                setError("");
              }}
            >
              <Plus size={15} />
              Đặt hoa văn
            </button>
            <button
              aria-label="Hoàn tác trang trí"
              disabled={!history.length}
              onClick={undo}
            >
              <Undo2 size={16} />
            </button>
            <button
              aria-label="Làm lại trang trí"
              disabled={!future.length}
              onClick={redo}
            >
              <Redo2 size={16} />
            </button>
          </div>
          <p id="decoration-help" className="decoration-help">
            {mode === "place"
              ? "Chọn hoa văn bên cạnh, rồi chạm lên áo để đặt."
              : "Kéo hoa văn để di chuyển; kéo nút vuông để đổi cỡ, nút tròn để xoay."}
          </p>
          <div
            ref={canvas}
            role="group"
            aria-label="Vùng trang trí áo"
            aria-describedby="decoration-help"
            tabIndex={0}
            className={`decoration-canvas tool-${mode}`}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={(e) => endPointer(e)}
            onPointerCancel={(e) => endPointer(e, true)}
            onLostPointerCapture={(e) => {
              if (gesture.current) endPointer(e, true);
            }}
            onKeyDown={keyDown}
          >
            <GarmentMockupSvg
              garmentId={draft.garmentId}
              gender={draft.gender}
              primaryColor={draft.primaryColor}
              accentColor={draft.accentColor}
              selectedAccessories={draft.selectedAccessories}
              pattern={working}
              editing={{ selectedId }}
            />
          </div>
          <p className="decoration-key-hint">
            Phím mũi tên: dịch chuyển · Delete: xóa · Ctrl/Cmd + Z: hoàn tác
          </p>
        </div>
        <aside className="decoration-settings">
          <button
            className="button secondary full editor-draw-launch"
            onClick={() => setDrawing(true)}
          >
            <PenLine size={15} />
            Tự vẽ họa tiết mới
          </button>
          <fieldset>
            <legend>Hoa văn để đặt</legend>
            <div className="motif-grid">
              {motifCatalog
                .filter((m) => m.id !== "none")
                .map((m) => (
                  <button
                    key={m.id}
                    aria-label={`Đặt ${m.name}`}
                    aria-pressed={brush.motifId === m.id}
                    onClick={() =>
                      chooseBrush({ motifId: m.id as Brush["motifId"] })
                    }
                  >
                    <MotifThumbnail motif={m} />
                    <span>{m.name}</span>
                  </button>
                ))}
              {working.assets?.map((asset) => (
                <button
                  key={asset.id}
                  aria-label={`Đặt ${asset.motif.name}`}
                  aria-pressed={brush.assetId === asset.id}
                  onClick={() =>
                    chooseBrush({ motifId: "custom", assetId: asset.id })
                  }
                >
                  <MotifThumbnail motif={asset.motif} />
                  <span>{asset.motif.name}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="decoration-selection">
            <h3>
              {selected ? assetName(selected) : "Chọn một họa tiết để chỉnh"}
            </h3>
            {selected ? (
              <>
                <div className="decoration-actions">
                  <button
                    onClick={duplicate}
                    disabled={
                      (working.decorations?.length || 0) >= MAX_DECORATIONS
                    }
                  >
                    <Copy size={14} />
                    Nhân bản
                  </button>
                  <button onClick={remove}>
                    <Trash2 size={14} />
                    Xóa họa tiết
                  </button>
                </div>
                <label className="pattern-slider">
                  Kích thước{" "}
                  <output>{Math.round(selected.scale * 100)}%</output>
                  <input
                    aria-label="Kích thước họa tiết đã chọn"
                    type="range"
                    min="0.12"
                    max="1.2"
                    step="0.01"
                    value={selected.scale}
                    onChange={(e) =>
                      patchSelected({ scale: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="pattern-slider">
                  Góc xoay <output>{Math.round(selected.rotation)}°</output>
                  <input
                    aria-label="Góc xoay họa tiết"
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={selected.rotation}
                    onChange={(e) =>
                      patchSelected({ rotation: Number(e.target.value) })
                    }
                  />
                </label>
                <div className="pattern-color-row">
                  <label className="color-picker-label">
                    <input
                      aria-label="Màu họa tiết đã chọn"
                      type="color"
                      value={
                        selected.color === "auto"
                          ? draft.accentColor
                          : selected.color
                      }
                      onChange={(e) =>
                        patchSelected({ color: e.target.value.toUpperCase() })
                      }
                    />
                    <span>Màu nét</span>
                  </label>
                  <button
                    className="auto-pattern-color"
                    onClick={() => patchSelected({ color: "auto" })}
                  >
                    Theo màu điểm nhấn
                  </button>
                </div>
                <label className="pattern-slider">
                  Độ đậm <output>{Math.round(selected.opacity * 100)}%</output>
                  <input
                    aria-label="Độ đậm họa tiết đã chọn"
                    type="range"
                    min="0.25"
                    max="1"
                    step="0.05"
                    value={selected.opacity}
                    onChange={(e) =>
                      patchSelected({ opacity: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="pattern-slider">
                  Độ dày nét <output>{selected.strokeWidth.toFixed(1)}</output>
                  <input
                    aria-label="Độ dày nét họa tiết đã chọn"
                    type="range"
                    min="0.6"
                    max="2.4"
                    step="0.2"
                    value={selected.strokeWidth}
                    onChange={(e) =>
                      patchSelected({ strokeWidth: Number(e.target.value) })
                    }
                  />
                </label>
              </>
            ) : (
              <p className="muted">
                Bạn có thể phối nhiều loại hoa văn trên cùng áo. Nét vẽ được cắt
                theo mép vải.
              </p>
            )}
          </div>
          <div className="decoration-list">
            <div className="accessory-toolbar">
              <span>
                {working.decorations?.length || 0}/{MAX_DECORATIONS} họa tiết
              </span>
              <button
                className="text-link"
                disabled={!working.decorations?.length}
                onClick={() => {
                  if (commit({ ...working, decorations: [] }))
                    setSelectedId(null);
                }}
              >
                Xóa bố cục
              </button>
            </div>
            <div className="decoration-chips">
              {working.decorations?.map((item, i) => (
                <button
                  key={item.id}
                  aria-pressed={selectedId === item.id}
                  onClick={() => {
                    setSelectedId(item.id);
                    setMode("move");
                  }}
                >
                  {i + 1}. {assetName(item)}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p role="alert" className="auth-error">
              {error}
            </p>
          )}
        </aside>
      </div>
      <footer className="decoration-footer">
        <p>
          Bấm “Áp dụng” để đưa bố cục về phòng phối đồ, sau đó lưu vào tủ đồ.
        </p>
        <button className="button secondary" onClick={onClose}>
          Hủy thay đổi
        </button>
        <button
          className="button primary"
          onClick={() => {
            const parsed = patternSchema.safeParse(working);
            if (parsed.success) {
              onApply(parsed.data);
              onClose();
            } else setError(parsed.error.issues[0].message);
          }}
        >
          <Check size={16} />
          Áp dụng bố cục
        </button>
      </footer>
      {drawing && (
        <FreehandDesigner
          initialColor={
            selected
              ? selected.color === "auto"
                ? draft.accentColor
                : selected.color
              : (brush.color ?? draft.accentColor)
          }
          initialWidth={
            selected?.strokeWidth ??
            brush.strokeWidth ??
            draft.pattern.strokeWidth
          }
          onClose={() => setDrawing(false)}
          onUse={({ motif, ...style }) => {
            const before = workingRef.current;
            const usedAssets =
              before.assets?.filter((a) =>
                before.decorations?.some((d) => d.assetId === a.id),
              ) || [];
            const existing = usedAssets.find(
              (a) => JSON.stringify(a.motif) === JSON.stringify(motif),
            );
            const asset = existing || { id: uid(), motif };
            const parsed = patternSchema.safeParse({
              ...before,
              assets: existing ? usedAssets : [...usedAssets, asset],
            });
            if (!parsed.success)
              throw new Error(
                "Bố cục đã nhiều mẫu riêng hoặc nét vẽ. Hãy bớt một mẫu đã đặt rồi thêm lại.",
              );
            if (commit(parsed.data)) {
              setSelectedId(null);
              chooseBrush({ motifId: "custom", assetId: asset.id, ...style });
            }
          }}
        />
      )}
    </dialog>
  );
}
