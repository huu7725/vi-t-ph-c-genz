import { useRef, useState } from "react";
import { Check, PenLine, Sparkles } from "lucide-react";
import { defaultPattern, motifCatalog } from "@domain";
import type { GarmentPattern, LineMotif } from "../types";
import { MotifThumbnail } from "./GarmentPattern";

interface Props {
  pattern: GarmentPattern;
  accentColor: string;
  onChange: (pattern: GarmentPattern) => void;
  onGenerate: (prompt: string) => Promise<LineMotif>;
  isGenerating: boolean;
  generated: LineMotif | null;
  onDecorate: (motif?: LineMotif) => void;
  onDraw: () => void;
}
export function PatternStudio({
  pattern,
  accentColor,
  onChange,
  onGenerate,
  isGenerating,
  generated,
  onDecorate,
  onDraw,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);
  const lastCustom = useRef(pattern.custom);
  if (pattern.custom) lastCustom.current = pattern.custom;
  const update = (patch: Partial<GarmentPattern>) =>
    onChange({ ...pattern, ...patch });
  const generate = async () => {
    if (isGenerating) return;
    if (prompt.trim().length < 5) {
      setError("Mô tả ít nhất 5 ký tự để AI hiểu họa tiết bạn muốn.");
      return;
    }
    setError("");
    setApplied(false);
    try {
      await onGenerate(prompt.trim());
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Chưa tạo được hoa văn. Vui lòng thử lại.",
      );
    }
  };
  return (
    <section
      className="control-panel pattern-studio"
      aria-label="Hoa văn trên áo"
    >
      <div className="control-title">
        <span>03</span>
        <h2>Vẽ chất riêng lên nếp áo</h2>
        <PenLine size={17} />
      </div>
      <button
        className="button secondary full hand-draw-launch"
        onClick={onDraw}
      >
        <PenLine size={16} />
        Tự vẽ họa tiết
      </button>
      <p className="muted">
        Hoa sen, rồng, phượng… chọn một nét bạn thích hoặc nhờ AI vẽ theo ý
        tưởng riêng.
      </p>
      <div className="direct-decoration-invite">
        <div>
          <strong>
            {pattern.placement === "free"
              ? "Bố cục do bạn tự trang trí"
              : "Muốn đặt hoa văn theo ý mình?"}
          </strong>
          <p>
            {pattern.placement === "free"
              ? `${pattern.decorations?.length || 0} họa tiết đã đặt. Chỉnh từng vị trí, màu và góc xoay trên mẫu.`
              : "Chạm để đặt, kéo để di chuyển. Phối nhiều hoa văn cùng lúc trên thân và tay áo."}
          </p>
        </div>
        <button className="button secondary" onClick={() => onDecorate()}>
          Mở trình trang trí
        </button>
      </div>
      {pattern.placement === "free" && (
        <button
          className="text-link"
          onClick={() => {
            const { decorations, assets, ...rest } = pattern;
            onChange({ ...rest, placement: "center" });
          }}
        >
          Dùng lại bố cục có sẵn
        </button>
      )}
      {pattern.placement !== "free" && (
        <>
          <fieldset className="motif-list">
            <legend>Chọn hoa văn</legend>
            <div className="motif-grid">
              {motifCatalog.map((motif) => (
                <button
                  key={motif.id}
                  aria-label={`Hoa văn ${motif.name}`}
                  aria-pressed={pattern.motifId === motif.id}
                  onClick={() => {
                    const { custom, ...rest } = pattern;
                    onChange({ ...rest, motifId: motif.id });
                    setApplied(false);
                  }}
                >
                  {motif.id === "none" ? (
                    <span className="no-motif" aria-hidden="true">
                      ∅
                    </span>
                  ) : (
                    <MotifThumbnail motif={motif} />
                  )}
                  <span>{motif.name}</span>
                  {pattern.motifId === motif.id && (
                    <Check className="motif-check" size={13} />
                  )}
                </button>
              ))}
              {lastCustom.current && (
                <button
                  aria-label="Hoa văn riêng đã tạo"
                  aria-pressed={pattern.motifId === "custom"}
                  onClick={() =>
                    update({ motifId: "custom", custom: lastCustom.current })
                  }
                >
                  <MotifThumbnail motif={lastCustom.current} />
                  <span>Mẫu riêng</span>
                  {pattern.motifId === "custom" && (
                    <Check className="motif-check" size={13} />
                  )}
                </button>
              )}
            </div>
          </fieldset>
          {pattern.motifId !== "none" && (
            <div className="pattern-controls">
              <fieldset>
                <legend>Bố cục trên áo</legend>
                <div className="placement-options">
                  {(
                    [
                      { id: "center", name: "Giữa thân" },
                      { id: "side", name: "Dọc tà" },
                      { id: "hem", name: "Viền gấu" },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      aria-pressed={pattern.placement === p.id}
                      onClick={() => update({ placement: p.id })}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="pattern-color-row">
                <label className="color-picker-label">
                  <input
                    type="color"
                    aria-label="Màu nét hoa văn"
                    value={
                      pattern.color === "auto" ? accentColor : pattern.color
                    }
                    onChange={(e) =>
                      update({ color: e.target.value.toUpperCase() })
                    }
                  />
                  <span>Màu nét</span>
                </label>
                <button
                  className={`auto-pattern-color ${pattern.color === "auto" ? "active" : ""}`}
                  aria-pressed={pattern.color === "auto"}
                  onClick={() => update({ color: "auto" })}
                >
                  Theo màu điểm nhấn
                </button>
              </div>
              <label className="pattern-slider">
                Kích thước <output>{Math.round(pattern.scale * 100)}%</output>
                <input
                  aria-label="Kích thước hoa văn"
                  type="range"
                  min="0.6"
                  max="1.4"
                  step="0.1"
                  value={pattern.scale}
                  onChange={(e) => update({ scale: Number(e.target.value) })}
                />
              </label>
              <label className="pattern-slider">
                Độ dày nét <output>{pattern.strokeWidth.toFixed(1)}</output>
                <input
                  aria-label="Độ dày nét hoa văn"
                  type="range"
                  min="0.6"
                  max="2.4"
                  step="0.2"
                  value={pattern.strokeWidth}
                  onChange={(e) =>
                    update({ strokeWidth: Number(e.target.value) })
                  }
                />
              </label>
              <label className="pattern-slider">
                Độ đậm <output>{Math.round(pattern.opacity * 100)}%</output>
                <input
                  aria-label="Độ đậm hoa văn"
                  type="range"
                  min="0.25"
                  max="1"
                  step="0.05"
                  value={pattern.opacity}
                  onChange={(e) => update({ opacity: Number(e.target.value) })}
                />
              </label>
              <button
                className="text-link pattern-reset"
                onClick={() => {
                  const { scale, strokeWidth, opacity, color, placement } =
                    defaultPattern;
                  update({ scale, strokeWidth, opacity, color, placement });
                }}
              >
                Đặt lại cách hiển thị
              </button>
            </div>
          )}
        </>
      )}
      <div className="pattern-ai">
        <label htmlFor="pattern-prompt">
          <Sparkles size={15} /> Nhờ Gemini vẽ hoa văn riêng
        </label>
        <textarea
          id="pattern-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={400}
          rows={3}
          placeholder="Ví dụ: hoa sen kết hợp mây cuộn, nét viền thanh mảnh, bố cục đối xứng để viền tà áo"
          disabled={isGenerating}
        />
        <p className="pattern-ai-hint">
          Vẽ bằng nét viền, không tô kín. Tạo thành công dùng 1 lượt AI, chung
          với gợi ý phối đồ.
        </p>
        <button
          className="button secondary full"
          disabled={isGenerating}
          onClick={() => void generate()}
        >
          <Sparkles size={15} />
          {isGenerating ? "Đang vẽ hoa văn…" : "Vẽ hoa văn bằng AI"}
        </button>
        {isGenerating && (
          <p role="status" className="muted">
            Gemini đang phác các nét vẽ. Bạn có thể tiếp tục xem mẫu có sẵn.
          </p>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {generated && (
          <div className="generated-motif">
            <div className="motif-result-preview">
              <MotifThumbnail motif={generated} />
            </div>
            <div>
              <span className="small-label">HOA VĂN GEMINI</span>
              <h3>{generated.name}</h3>
              <p>Mẫu nét viền vừa tạo theo mô tả của bạn.</p>
              <button
                className="button primary"
                onClick={() => {
                  if (pattern.placement === "free") {
                    onDecorate(generated);
                    return;
                  }
                  lastCustom.current = generated;
                  update({ motifId: "custom", custom: generated });
                  setApplied(true);
                }}
              >
                {pattern.placement === "free"
                  ? "Trang trí bằng mẫu này"
                  : applied && pattern.custom === generated
                    ? "Đã áp dụng"
                    : "Áp dụng hoa văn"}
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="pattern-cultural-note">
        Hoa văn minh họa đương đại, không phải mẫu phục dựng lịch sử.
      </p>
    </section>
  );
}
