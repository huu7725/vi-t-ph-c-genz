import { useEffect, useId, useState } from "react";
import { ArrowLeftRight, Check, Palette } from "lucide-react";
import type { Catalog, StylingRequest } from "../types";

const palettes = [
  { name: "Mây hồng", colors: ["#E7A8A5", "#FDFBF7"] },
  { name: "Sương ngọc", colors: ["#1E5E58", "#B7D7C4"] },
  { name: "Mơ tím", colors: ["#C6B5DD", "#FDFBF7"] },
  { name: "Nắng đào", colors: ["#F2B79F", "#A7C7E7"] },
  { name: "Chàm & kem", colors: ["#264653", "#FDFBF7"] },
  { name: "Trắng & đỏ", colors: ["#FDFBF7", "#BC4749"] },
];

function CustomColor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  const [hex, setHex] = useState(value);
  const [error, setError] = useState("");
  const id = useId();
  useEffect(() => {
    setHex(value);
    setError("");
  }, [value]);
  const commit = () => {
    const next = hex.trim().replace(/^#/, "");
    if (!/^[0-9a-f]{6}$/i.test(next)) {
      setError("Nhập 6 ký tự HEX, ví dụ #82B6A4.");
      return;
    }
    const normalized = `#${next.toUpperCase()}`;
    setHex(normalized);
    setError("");
    onChange(normalized);
  };
  return (
    <div className="custom-color">
      <div className="custom-color-row">
        <label className="color-picker-label">
          <input
            type="color"
            aria-label={`Chọn ${label} tùy ý`}
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
          />
          <span>Tùy chọn</span>
        </label>
        <input
          className="hex-input"
          type="text"
          aria-label={`Mã HEX ${label}`}
          value={hex}
          onChange={(e) => {
            setHex(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? id : undefined}
        />
        <button
          className="apply-color"
          aria-label={`Áp dụng ${label}`}
          onClick={commit}
        >
          Áp dụng
        </button>
      </div>
      {error && (
        <p id={id} className="color-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function ColorStudio({
  catalog,
  draft,
  onChange,
}: {
  catalog: Catalog;
  draft: StylingRequest;
  onChange: (draft: StylingRequest) => void;
}) {
  const update = (patch: Partial<StylingRequest>) =>
    onChange({ ...draft, ...patch });
  const colorName = (hex: string) =>
    catalog.colorPalette.find((c) => c.hex === hex)?.name || `Màu riêng ${hex}`;
  return (
    <section
      className="control-panel color-studio"
      aria-label="Phối màu linh hoạt"
    >
      <div className="control-title">
        <span>02</span>
        <h2>Chơi cùng sắc màu</h2>
        <Palette size={17} />
      </div>
      <p className="color-intro">
        Chọn màu có sẵn hoặc tạo sắc màu riêng cho bản phối.
      </p>
      {(["primaryColor", "accentColor"] as const).map((field, i) => (
        <fieldset className="color-field" key={field}>
          <legend>
            {i === 0 ? "Màu áo" : "Màu quần & điểm nhấn"}
            <span>{colorName(draft[field])}</span>
          </legend>
          <div className="swatches">
            {catalog.colorPalette.map((c) => (
              <button
                key={c.id}
                aria-label={`${i === 0 ? "Màu áo" : "Màu quần"}: ${c.name}`}
                title={c.name}
                aria-pressed={draft[field] === c.hex}
                className={`swatch ${draft[field] === c.hex ? "selected" : ""}`}
                style={{ backgroundColor: c.hex }}
                onClick={() => update({ [field]: c.hex })}
              >
                {draft[field] === c.hex && (
                  <Check
                    size={17}
                    color={
                      ["neutral", "pastel", "bright"].includes(c.type)
                        ? "#243B35"
                        : "#fff"
                    }
                  />
                )}
              </button>
            ))}
          </div>
          <CustomColor
            label={i === 0 ? "màu áo" : "màu quần"}
            value={draft[field]}
            onChange={(color) => update({ [field]: color })}
          />
        </fieldset>
      ))}
      <div className="color-actions">
        <button
          onClick={() =>
            update({
              primaryColor: draft.accentColor,
              accentColor: draft.primaryColor,
            })
          }
        >
          <ArrowLeftRight size={14} />
          Đổi màu áo ↔ quần
        </button>
        <button onClick={() => update({ accentColor: draft.primaryColor })}>
          Phối đồng màu
        </button>
      </div>
      <fieldset className="palette-presets">
        <legend>Thử nhanh một bảng màu</legend>
        <div className="palette-grid">
          {palettes.map((p) => (
            <button
              key={p.name}
              aria-label={`Bảng màu ${p.name}`}
              aria-pressed={
                draft.primaryColor === p.colors[0] &&
                draft.accentColor === p.colors[1]
              }
              onClick={() =>
                update({ primaryColor: p.colors[0], accentColor: p.colors[1] })
              }
            >
              <span className="palette-pair" aria-hidden="true">
                {p.colors.map((color, i) => (
                  <i key={i} style={{ backgroundColor: color }} />
                ))}
              </span>
              {p.name}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="control-hint">
        Màu áo và màu quần được lưu cùng bản phối, kể cả màu bạn tự chọn.
      </p>
    </section>
  );
}
