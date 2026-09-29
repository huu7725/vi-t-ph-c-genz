import { useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  Columns2,
  Download,
  Trash2,
  X,
} from "lucide-react";
import type { Look } from "../types";
import { GarmentMockupSvg } from "./GarmentMockupSvg";

interface Props {
  savedLooks: Look[];
  onDeleteLook: (id: string) => void;
  onApplyToStudio: (look: Look) => void;
  onStudio: () => void;
  onExport: () => void;
}
export function LookbookSection({
  savedLooks,
  onDeleteLook,
  onApplyToStudio,
  onStudio,
  onExport,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const validIds = selected.filter((id) => savedLooks.some((l) => l.id === id));
  const compared = validIds.map((id) => savedLooks.find((l) => l.id === id)!);
  const toggle = (id: string) =>
    setSelected(
      validIds.includes(id)
        ? validIds.filter((x) => x !== id)
        : [...validIds.slice(-1), id],
    );
  return (
    <section className="enter">
      <div className="page-heading">
        <div>
          <span className="eyebrow">BỘ SƯU TẬP CÁ NHÂN</span>
          <h1>
            Những bản phối <em>muốn giữ.</em>
          </h1>
          <p>Góc cảm hứng của riêng bạn, được lưu trong tủ đồ hiện tại.</p>
        </div>
        {savedLooks.length > 0 && (
          <button className="button secondary" onClick={onExport}>
            <Download size={16} /> Xuất lookbook
          </button>
        )}
      </div>
      {savedLooks.length === 0 ? (
        <div className="empty-state">
          <Bookmark size={38} strokeWidth={1} />
          <h2>Chỗ này dành cho phong cách của bạn.</h2>
          <p>
            Lưu bản phối đầu tiên để trở lại, chỉnh sửa và so sánh bất cứ lúc
            nào.
          </p>
          <button className="button primary" onClick={onStudio}>
            Tạo bản phối đầu tiên <ArrowUpRight size={16} />
          </button>
        </div>
      ) : (
        <>
          <div className="lookbook-toolbar">
            <span>{savedLooks.length} bản phối đã lưu</span>
            <span>
              <Columns2 size={16} /> Chọn 2 bản để so sánh ({validIds.length}/2)
            </span>
          </div>
          {compared.length === 2 && (
            <section
              className="compare-panel"
              aria-label="So sánh hai bản phối"
            >
              <div className="compare-heading">
                <h2>Đặt cạnh nhau, chọn điều bạn thích.</h2>
                <button
                  className="icon-button"
                  aria-label="Đóng so sánh"
                  onClick={() => setSelected([])}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="compare-grid">
                {compared.map((look) => (
                  <article key={look.id}>
                    <div className="compare-image">
                      <GarmentMockupSvg
                        garmentId={look.garmentId}
                        gender={look.gender}
                        pattern={look.pattern}
                        primaryColor={look.palette[0]}
                        accentColor={look.palette[1]}
                        selectedAccessories={look.accessoryIds}
                      />
                    </div>
                    <h3>{look.title}</h3>
                    <dl>
                      <dt>Trang phục</dt>
                      <dd>{look.garmentName}</dd>
                      <dt>Mẫu thử</dt>
                      <dd>{look.gender === "nam" ? "Nam" : "Nữ"}</dd>
                      <dt>Sự kiện</dt>
                      <dd>{look.eventName}</dd>
                      <dt>Màu sắc</dt>
                      <dd className="look-palette">
                        {look.palette.map((c, i) => (
                          <span key={i}>
                            <i style={{ background: c }} />
                            {c}
                          </span>
                        ))}
                      </dd>
                      <dt>Phụ kiện</dt>
                      <dd>
                        {look.accessories.map((a) => a.name).join(", ") ||
                          "Không thêm phụ kiện"}
                      </dd>
                    </dl>
                    <button
                      className="text-link"
                      onClick={() => onApplyToStudio(look)}
                    >
                      Chỉnh bản phối này <ArrowUpRight size={15} />
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
          <div className="looks-grid">
            {savedLooks.map((look) => (
              <article
                className={`look-card saved-card ${validIds.includes(look.id) ? "comparing" : ""}`}
                key={look.id}
              >
                <div className="look-image">
                  <span className="look-index">
                    {look.source === "manual"
                      ? "BẠN TỰ PHỐI"
                      : look.isFallback
                        ? "TỪ GỢI Ý MẪU"
                        : "GỢI Ý GEMINI"}
                  </span>
                  <button
                    className="delete-look icon-button"
                    aria-label={`Xóa ${look.title}`}
                    onClick={() => {
                      setSelected((ids) => ids.filter((id) => id !== look.id));
                      onDeleteLook(look.id);
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                  <GarmentMockupSvg
                    garmentId={look.garmentId}
                    gender={look.gender}
                    pattern={look.pattern}
                    primaryColor={look.palette[0]}
                    accentColor={look.palette[1]}
                    selectedAccessories={look.accessoryIds}
                  />
                </div>
                <div className="look-content">
                  <span className="small-label">
                    {look.eventName} · Mẫu{" "}
                    {look.gender === "nam" ? "nam" : "nữ"}
                  </span>
                  <h2>{look.title}</h2>
                  <p className="saved-date">
                    {look.savedAt
                      ? `Đã lưu ${new Date(look.savedAt).toLocaleDateString("vi-VN")}`
                      : "Bản phối đã lưu"}
                  </p>
                  <div className="look-actions">
                    <button
                      className={`button ${validIds.includes(look.id) ? "primary" : "secondary"}`}
                      aria-pressed={validIds.includes(look.id)}
                      onClick={() => toggle(look.id)}
                    >
                      {validIds.includes(look.id) ? (
                        <Check size={15} />
                      ) : (
                        <Columns2 size={15} />
                      )}{" "}
                      So sánh
                    </button>
                    <button
                      className="text-link"
                      onClick={() => onApplyToStudio(look)}
                    >
                      Phối tiếp <ArrowUpRight size={16} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
