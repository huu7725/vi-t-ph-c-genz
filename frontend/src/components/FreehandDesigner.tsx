import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import { Check, Eraser, PenLine, Redo2, Trash2, Undo2, X } from "lucide-react";
import { lineMotifSchema } from "@domain";
import type { LineMotif } from "../types";
import { freehandPath, type DrawPoint } from "../lib/freehand";

export interface HandDrawing {
  motif: LineMotif;
  color: string;
  strokeWidth: number;
  opacity: number;
}
type Stroke = { id: string; d: string };
interface Props {
  initialColor: string;
  initialWidth: number;
  onUse: (drawing: HandDrawing) => void;
  onClose: () => void;
}

export function FreehandDesigner({
  initialColor,
  initialWidth,
  onUse,
  onClose,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null),
    board = useRef<SVGSVGElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const strokesRef = useRef(strokes);
  const [history, setHistory] = useState<Stroke[][]>([]),
    [future, setFuture] = useState<Stroke[][]>([]);
  const [activePath, setActivePath] = useState(""),
    [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [name, setName] = useState("Họa tiết tự vẽ"),
    [color, setColor] = useState(initialColor),
    [width, setWidth] = useState(Math.min(2.4, Math.max(0.6, initialWidth)));
  const [grid, setGrid] = useState(true),
    [error, setError] = useState("");
  const lightInk =
    [1, 3, 5].reduce((sum, i) => sum + parseInt(color.slice(i, i + 2), 16), 0) /
      3 >
    210;
  const active = useRef<{ id: number; points: DrawPoint[] } | null>(null);
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  const update = (value: Stroke[]) => {
    strokesRef.current = value;
    setStrokes(value);
  };
  const commit = (value: Stroke[]) => {
    const before = strokesRef.current;
    setHistory((h) => [...h.slice(-29), before]);
    setFuture([]);
    update(value);
    setError("");
  };
  const undo = () => {
    if (!history.length || active.current) return;
    const current = strokesRef.current;
    const previous = history[history.length - 1];
    setFuture((f) => [current, ...f].slice(0, 30));
    setHistory((h) => h.slice(0, -1));
    update(previous);
    setError("");
  };
  const redo = () => {
    if (!future.length || active.current) return;
    const current = strokesRef.current;
    setHistory((h) => [...h.slice(-29), current]);
    update(future[0]);
    setFuture((f) => f.slice(1));
    setError("");
  };
  const pointAt = (event: {
    clientX: number;
    clientY: number;
  }): DrawPoint | null => {
    const el = board.current,
      matrix = el?.getScreenCTM();
    if (!el || !matrix) return null;
    const p = el.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    const pos = p.matrixTransform(matrix.inverse());
    return {
      x: Math.max(1, Math.min(99, pos.x)),
      y: Math.max(1, Math.min(99, pos.y)),
    };
  };
  const down = (event: PointerEvent<SVGSVGElement>) => {
    if (!event.isPrimary || event.button !== 0 || active.current) return;
    if (tool === "eraser") {
      const id = (event.target as Element).getAttribute("data-stroke-hit");
      if (id) commit(strokesRef.current.filter((s) => s.id !== id));
      return;
    }
    if (strokesRef.current.length >= 16) {
      setError(
        "Mẫu có tối đa 16 nét. Bạn có thể xóa một nét hoặc hoàn tác để vẽ tiếp.",
      );
      return;
    }
    const point = pointAt(event);
    if (!point) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    active.current = { id: event.pointerId, points: [point] };
    setActivePath(freehandPath([point]));
    setError("");
  };
  const move = (event: PointerEvent<SVGSVGElement>) => {
    const state = active.current;
    if (!state || state.id !== event.pointerId) return;
    event.preventDefault();
    const samples = event.nativeEvent.getCoalescedEvents?.() || [];
    for (const sample of samples.length ? samples : [event]) {
      const point = pointAt(sample);
      if (!point) continue;
      const last = state.points[state.points.length - 1];
      if (Math.hypot(point.x - last.x, point.y - last.y) > 0.15) {
        if (state.points.length >= 1500)
          state.points = state.points.filter((_, i) => i % 2 === 0);
        state.points.push(point);
      }
    }
    setActivePath(freehandPath(state.points));
  };
  const finish = (event: PointerEvent<SVGSVGElement>, cancel = false) => {
    const state = active.current;
    if (!state || state.id !== event.pointerId) return;
    active.current = null;
    setActivePath("");
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (cancel) return;
    const last = pointAt(event);
    if (last) state.points.push(last);
    const d = freehandPath(state.points);
    if (!d) return;
    const next = [...strokesRef.current, { id: crypto.randomUUID(), d }];
    const check = lineMotifSchema.safeParse({
      name: "Bản vẽ",
      paths: next.map((s) => s.d),
    });
    if (!check.success) {
      setError(
        "Nét vẽ này quá nhiều chi tiết. Thử nét ngắn hơn hoặc xóa bớt một nét.",
      );
      return;
    }
    commit(next);
  };
  const keyboard = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      event.shiftKey ? redo() : undo();
    }
  };
  const useDrawing = () => {
    const motif = lineMotifSchema.safeParse({
      name: name.trim(),
      paths: strokesRef.current.map((s) => s.d),
    });
    if (!motif.success) {
      setError(
        !name.trim()
          ? "Đặt tên cho họa tiết của bạn."
          : "Hãy vẽ ít nhất một nét trước khi áp dụng.",
      );
      return;
    }
    try {
      onUse({ motif: motif.data, color, strokeWidth: width, opacity: 1 });
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Chưa thể dùng họa tiết. Vui lòng thử lại.",
      );
    }
  };
  return (
    <dialog
      ref={dialog}
      className="freehand-dialog"
      aria-labelledby="freehand-title"
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
    >
      <header className="decoration-header">
        <div>
          <span className="eyebrow">NÉT VẼ CỦA RIÊNG BẠN</span>
          <h2 id="freehand-title">Tự vẽ họa tiết</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Đóng bảng vẽ"
          onClick={onClose}
        >
          <X size={21} />
        </button>
      </header>
      <div className="freehand-layout">
        <div className="freehand-paper-area">
          <div className="decoration-tools">
            <button
              aria-pressed={tool === "pen"}
              onClick={() => {
                setTool("pen");
                setError("");
              }}
            >
              <PenLine size={15} />
              Bút vẽ
            </button>
            <button
              aria-pressed={tool === "eraser"}
              onClick={() => {
                setTool("eraser");
                setError("");
              }}
            >
              <Eraser size={15} />
              Xóa nét
            </button>
            <button
              aria-label="Hoàn tác nét vẽ"
              disabled={!history.length}
              onClick={undo}
            >
              <Undo2 size={16} />
            </button>
            <button
              aria-label="Làm lại nét vẽ"
              disabled={!future.length}
              onClick={redo}
            >
              <Redo2 size={16} />
            </button>
          </div>
          <p id="freehand-help" className="decoration-help">
            {tool === "pen"
              ? "Giữ chuột hoặc chạm rồi kéo để vẽ. Nhấc tay để kết thúc một nét."
              : "Chạm vào nét muốn xóa. Bạn có thể hoàn tác nếu xóa nhầm."}
          </p>
          <svg
            ref={board}
            className={`freehand-board tool-${tool}`}
            viewBox="0 0 100 100"
            role="group"
            aria-label="Bảng vẽ họa tiết"
            aria-describedby="freehand-help"
            tabIndex={0}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={(e) => finish(e)}
            onPointerCancel={(e) => finish(e, true)}
            onLostPointerCapture={(e) => {
              if (active.current) finish(e, true);
            }}
            onKeyDown={keyboard}
          >
            <rect
              width="100"
              height="100"
              fill={lightInk ? "#25443A" : "#FFFEF9"}
            />
            {grid && (
              <g
                pointerEvents="none"
                stroke={lightInk ? "#476359" : "#E8EBDD"}
                strokeWidth=".22"
              >
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((n) => (
                  <path key={n} d={`M${n} 0V100M0 ${n}H100`} />
                ))}
              </g>
            )}
            <g
              fill="none"
              stroke={color}
              strokeWidth={width}
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="none"
            >
              {strokes.map((s) => (
                <path key={s.id} data-drawn-stroke={s.id} d={s.d} />
              ))}
              {activePath && <path d={activePath} opacity=".75" />}
            </g>
            {tool === "eraser" && (
              <g
                fill="none"
                stroke="transparent"
                strokeWidth={Math.max(width + 3, 5)}
              >
                {strokes.map((s) => (
                  <path
                    key={s.id}
                    data-stroke-hit={s.id}
                    d={s.d}
                    strokeLinecap="round"
                    pointerEvents="stroke"
                  />
                ))}
              </g>
            )}
          </svg>
          <div className="freehand-paper-footer">
            <label>
              <input
                type="checkbox"
                checked={grid}
                onChange={(e) => setGrid(e.target.checked)}
              />
              Hiện lưới căn nét
            </label>
            <span>{strokes.length}/16 nét</span>
          </div>
        </div>
        <aside className="freehand-settings">
          <label className="drawing-name">
            Tên họa tiết
            <input
              aria-label="Tên họa tiết tự vẽ"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Ví dụ: Cánh hoa mùa hạ"
            />
          </label>
          <label className="color-picker-label freehand-color">
            <input
              type="color"
              aria-label="Màu nét tự vẽ"
              value={color}
              onChange={(e) => setColor(e.target.value.toUpperCase())}
            />
            <span>Màu nét</span>
            <output>{color}</output>
          </label>
          <div className="freehand-swatches">
            {[
              { name: "Xanh ngọc", hex: "#1E5E58" },
              { name: "Đỏ gạch", hex: "#BC4749" },
              { name: "Vàng ấm", hex: "#D8B56D" },
              { name: "Trắng ngà", hex: "#FDFBF7" },
              { name: "Đen than", hex: "#30343B" },
            ].map((c) => (
              <button
                key={c.hex}
                title={c.name}
                aria-label={`Nét vẽ ${c.name}`}
                aria-pressed={color === c.hex}
                onClick={() => setColor(c.hex)}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
          <label className="pattern-slider">
            Độ dày nét <output>{width.toFixed(1)}</output>
            <input
              type="range"
              aria-label="Độ dày nét tự vẽ"
              min="0.6"
              max="2.4"
              step="0.2"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            />
          </label>
          <button
            className="button secondary full"
            disabled={!strokes.length}
            onClick={() => commit([])}
          >
            <Trash2 size={15} />
            Xóa toàn bộ nét
          </button>
          <div className="freehand-tip">
            <PenLine size={21} />
            <h3>Vẽ một nét, kể một chuyện.</h3>
            <p>
              Thử cánh hoa, chiếc lá, trái tim hoặc chữ viết tay. Nét vẽ sẽ được
              làm mượt và giữ nền trong suốt khi đưa lên áo.
            </p>
            <p>
              Màu và độ dày áp dụng cho cả họa tiết. Bạn có thể đổi tiếp khi
              trang trí trên áo.
            </p>
          </div>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <p className="pattern-cultural-note">
            Vẽ tay miễn phí, không dùng lượt AI.
          </p>
        </aside>
      </div>
      <footer className="decoration-footer">
        <p>
          Hoàn thành bản vẽ rồi đặt, xoay và thay đổi kích thước trên mẫu áo.
        </p>
        <button className="button secondary" onClick={onClose}>
          Hủy bản vẽ
        </button>
        <button
          className="button primary"
          disabled={!strokes.length || Boolean(activePath)}
          onClick={useDrawing}
        >
          <Check size={16} />
          Dùng họa tiết này
        </button>
      </footer>
    </dialog>
  );
}
