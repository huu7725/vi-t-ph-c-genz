import {
  ArrowUpRight,
  BookmarkPlus,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { Catalog, StylingRequest, LineMotif } from "../types";
import { GarmentMockupSvg } from "./GarmentMockupSvg";
import { ColorStudio } from "./ColorStudio";
import { PatternStudio } from "./PatternStudio";
import { toggleAccessorySelection } from "@domain";
import { useState } from "react";
import { DecorationEditor } from "./DecorationEditor";
import { FreehandDesigner, type HandDrawing } from "./FreehandDesigner";

interface Props {
  catalog: Catalog;
  draft: StylingRequest;
  onChange: (value: StylingRequest) => void;
  onGenerate: () => void;
  onSave: () => void;
  onReset: () => void;
  isLoading: boolean;
  onSample: () => void;
  isSaving: boolean;
  isPatternLoading: boolean;
  onGeneratePattern: (prompt: string) => Promise<LineMotif>;
  generatedMotif: LineMotif | null;
}
export function StudioSection({
  catalog,
  draft,
  onChange,
  onGenerate,
  onSave,
  onReset,
  isLoading,
  onSample,
  isSaving,
  isPatternLoading,
  onGeneratePattern,
  generatedMotif,
}: Props) {
  const [editor, setEditor] = useState<{
    brush?: LineMotif;
    style?: Pick<HandDrawing, "color" | "strokeWidth" | "opacity">;
  } | null>(null);
  const [drawing, setDrawing] = useState(false);
  const update = (patch: Partial<StylingRequest>) =>
    onChange({ ...draft, ...patch });
  const toggleAccessory = (id: string) =>
    update({
      selectedAccessories: toggleAccessorySelection(
        draft.selectedAccessories,
        id,
      ),
    });
  return (
    <section className="enter">
      <div className="page-heading">
        <div>
          <span className="eyebrow">STYLING STUDIO / PHÒNG PHỐI ĐỒ</span>
          <h1>
            Một bản phối, <em>rất bạn.</em>
          </h1>
          <p>
            Chọn dịp, thử sắc màu, thêm chút cá tính. Hình minh họa thay đổi
            ngay cùng bạn.
          </p>
        </div>
        <button className="text-link" onClick={onReset}>
          <RotateCcw size={15} /> Đặt lại
        </button>
      </div>
      <div className="studio-layout">
        <div className="studio-controls">
          <section className="control-panel">
            <div className="control-title">
              <span>01</span>
              <h2>Bắt đầu với điều bạn thích</h2>
            </div>
            <fieldset>
              <legend>Trang phục</legend>
              <div className="choice-row">
                {catalog.garments.map((g) => (
                  <button
                    key={g.id}
                    aria-pressed={draft.garmentId === g.id}
                    className={`choice ${draft.garmentId === g.id ? "selected" : ""}`}
                    onClick={() => update({ garmentId: g.id })}
                  >
                    {g.name}
                    {draft.garmentId === g.id && <Check size={15} />}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="field-label" htmlFor="event">
              Bạn sẽ mặc vào dịp nào?
            </label>
            <select
              id="event"
              value={draft.eventId}
              onChange={(e) => update({ eventId: e.target.value })}
            >
              {catalog.events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <fieldset>
              <legend>Phong cách của bạn</legend>
              <div className="style-grid">
                {catalog.styles.map((s) => (
                  <button
                    key={s.id}
                    className={`style-choice ${draft.styleId === s.id ? "selected" : ""}`}
                    aria-pressed={draft.styleId === s.id}
                    onClick={() => update({ styleId: s.id })}
                  >
                    <strong>{s.name}</strong>
                    <span>{s.desc}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </section>
          <ColorStudio catalog={catalog} draft={draft} onChange={onChange} />
          <PatternStudio
            pattern={draft.pattern}
            accentColor={draft.accentColor}
            onChange={(pattern) => update({ pattern })}
            isGenerating={isPatternLoading}
            onGenerate={onGeneratePattern}
            generated={generatedMotif}
            onDecorate={(brush) => setEditor({ brush })}
            onDraw={() => setDrawing(true)}
          />
          <section className="control-panel">
            <div className="control-title">
              <span>04</span>
              <h2>Thêm một chút chất riêng</h2>
            </div>
            <p className="muted">
              Thử thêm phụ kiện ngay trên hình. Mỗi lần chọn một đôi giày, một
              vòng cổ và một túi; các món khác có thể phối cùng nhau.
            </p>
            <div className="accessory-toolbar">
              <span>{draft.selectedAccessories.length} phụ kiện đã chọn</span>
              <button
                className="text-link"
                disabled={!draft.selectedAccessories.length}
                onClick={() => update({ selectedAccessories: [] })}
              >
                Bỏ chọn tất cả
              </button>
            </div>
            <div className="accessory-grid">
              {catalog.accessories.map((a) => (
                <button
                  className={`accessory-choice ${draft.selectedAccessories.includes(a.id) ? "selected" : ""}`}
                  key={a.id}
                  aria-pressed={draft.selectedAccessories.includes(a.id)}
                  onClick={() => toggleAccessory(a.id)}
                >
                  <span className="check-box">
                    {draft.selectedAccessories.includes(a.id) && (
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
          </section>
        </div>
        <aside className="studio-preview">
          <div className="preview-top">
            <span className="eyebrow">BẢN PHỐI CỦA BẠN</span>
            <span className="live-tag">
              <i /> Xem trực tiếp
            </span>
          </div>
          <button
            className="button secondary full decorate-open"
            onClick={() => setEditor({})}
          >
            Trang trí trực tiếp <Sparkles size={15} />
          </button>
          <button
            className="text-link draw-open"
            onClick={() => setDrawing(true)}
          >
            Tự vẽ họa tiết của bạn
          </button>
          <fieldset className="model-selector">
            <legend>Chọn mẫu thử</legend>
            <div className="model-options">
              {(["nu", "nam"] as const).map((gender) => (
                <button
                  key={gender}
                  aria-pressed={draft.gender === gender}
                  onClick={() => update({ gender })}
                >
                  <span
                    className={`model-avatar model-${gender}`}
                    aria-hidden="true"
                  >
                    {gender === "nam" ? "♂" : "♀"}
                  </span>
                  <span>
                    <strong>{gender === "nam" ? "Mẫu nam" : "Mẫu nữ"}</strong>
                    <small>
                      {gender === "nam"
                        ? "Vai rộng · dáng thẳng"
                        : "Vai mềm · dáng thanh"}
                    </small>
                  </span>
                  {draft.gender === gender && <Check size={15} />}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="preview-canvas">
            <div className="preview-circle" />
            <GarmentMockupSvg
              garmentId={draft.garmentId}
              gender={draft.gender}
              pattern={draft.pattern}
              primaryColor={draft.primaryColor}
              accentColor={draft.accentColor}
              selectedAccessories={draft.selectedAccessories}
            />
            <span className="preview-side-label">VIỆT PHỤC / YOUR WAY</span>
          </div>
          <div className="preview-meta">
            <div>
              <h3>
                {catalog.garments.find((g) => g.id === draft.garmentId)?.name}
                <span className="model-badge">
                  {draft.gender === "nam" ? "Mẫu nam" : "Mẫu nữ"}
                </span>
              </h3>
              <p>
                {catalog.events.find((e) => e.id === draft.eventId)?.name} ·{" "}
                {catalog.styles.find((s) => s.id === draft.styleId)?.name}
              </p>
            </div>
            <div className="mini-palette">
              <i style={{ background: draft.primaryColor }} />
              <i style={{ background: draft.accentColor }} />
            </div>
          </div>
          <p className="preview-disclaimer">
            Mockup minh họa màu và phụ kiện, không phải bản phục dựng hay thử đồ
            thực tế.
          </p>
          <button
            className="button primary full"
            onClick={onGenerate}
            disabled={isLoading}
          >
            <Sparkles size={17} />
            {isLoading ? "Đang tạo gợi ý…" : "Gợi ý cùng Gemini"}
            <ArrowUpRight size={17} />
          </button>
          <button
            className="button secondary full"
            onClick={onSave}
            disabled={isSaving}
          >
            <BookmarkPlus size={16} />{" "}
            {isSaving ? "Đang lưu…" : "Lưu bản phối này"}
          </button>
          <button className="sample-button" onClick={onSample}>
            Xem gợi ý mẫu · không tốn lượt AI
          </button>
          <p className="preview-helper">
            Tự phối luôn miễn phí. Tủ đồ được lưu khi kết nối với máy chủ.
          </p>
        </aside>
      </div>
      {editor && (
        <DecorationEditor
          draft={draft}
          initialBrush={editor.brush}
          initialStyle={editor.style}
          onApply={(pattern) => update({ pattern })}
          onClose={() => setEditor(null)}
        />
      )}
      {drawing && (
        <FreehandDesigner
          initialColor={
            draft.pattern.color === "auto"
              ? draft.accentColor
              : draft.pattern.color
          }
          initialWidth={draft.pattern.strokeWidth}
          onClose={() => setDrawing(false)}
          onUse={({ motif, ...style }) => {
            if (draft.pattern.placement === "free")
              setEditor({ brush: motif, style });
            else
              update({
                pattern: {
                  ...draft.pattern,
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
