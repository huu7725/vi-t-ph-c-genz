import { useState } from "react";
import {
  ArrowUpRight,
  BookmarkPlus,
  Check,
  RefreshCw,
  Sparkles,
  BookOpen,
} from "lucide-react";
import type { Look } from "../types";
import { GarmentMockupSvg } from "./GarmentMockupSvg";
import { CultureDialog } from "./CultureDialog";

interface Props {
  looks: Look[];
  isLoading: boolean;
  note: string;
  isFallback: boolean;
  onApplyLook: (look: Look) => void;
  onSaveLook: (look: Look) => void;
  savedLookIds: string[];
  onRetry: () => void;
  onStudio: () => void;
}
export function RecommendationSection({
  looks,
  isLoading,
  note,
  isFallback,
  onApplyLook,
  onSaveLook,
  savedLookIds,
  onRetry,
  onStudio,
}: Props) {
  const [viewed, setViewed] = useState<Look | null>(null);
  return (
    <section className="enter">
      <div className="page-heading">
        <div>
          <span className="eyebrow">MỘT CHÚT CẢM HỨNG</span>
          <h1>
            Thêm cách phối, <em>thêm mình.</em>
          </h1>
          <p>Chọn một bản bạn thích, rồi chỉnh lại theo cách của riêng bạn.</p>
        </div>
        <button className="button secondary" onClick={onStudio}>
          Về phòng phối đồ <ArrowUpRight size={16} />
        </button>
      </div>
      {isLoading ? (
        <div role="status" className="loading-state">
          <Sparkles className="spin" size={28} />
          <h2>Đang tìm cảm hứng cho bạn…</h2>
          <p>Chọn những sắc màu, phụ kiện và câu chuyện phù hợp.</p>
          <div className="skeleton-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" />
            ))}
          </div>
        </div>
      ) : looks.length === 0 ? (
        <div className="empty-state">
          <Sparkles size={38} strokeWidth={1} />
          <h2>Bản phối tiếp theo đang chờ bạn.</h2>
          <p>Chọn trang phục và sở thích trong phòng phối đồ để bắt đầu.</p>
          <button className="button primary" onClick={onStudio}>
            Đi đến phòng phối đồ <ArrowUpRight size={16} />
          </button>
        </div>
      ) : (
        <>
          <div className="recommend-note" role="status">
            <span>
              <Sparkles size={17} />
              <strong>{isFallback ? "Gợi ý mẫu" : "Gợi ý từ Gemini"}</strong>
              <span>{note}</span>
            </span>
            <button className="text-link" onClick={onRetry}>
              <RefreshCw size={14} /> Tạo lại
            </button>
          </div>
          <div className="looks-grid">
            {looks.map((look, i) => (
              <article className="look-card" key={look.id}>
                <div className={`look-image look-bg-${i}`}>
                  <span className="look-index">BẢN PHỐI / 0{i + 1}</span>
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
                  <div className="look-palette">
                    {look.palette.map((c, i) => (
                      <span key={i}>
                        <i style={{ background: c }} />
                        {c}
                      </span>
                    ))}
                  </div>
                  <p>{look.stylingReason}</p>
                  <div className="accessory-tags">
                    {look.accessories.length ? (
                      look.accessories.map((a) => (
                        <span key={a.id}>{a.name}</span>
                      ))
                    ) : (
                      <span>Không thêm phụ kiện</span>
                    )}
                  </div>
                  <button
                    className="culture-link"
                    onClick={() => setViewed(look)}
                  >
                    <BookOpen size={14} /> Chuyện sau nếp áo
                  </button>
                  <details className="look-cautions">
                    <summary>Lưu ý cho bản phối</summary>
                    {look.cautionRules.map((rule) => (
                      <p key={rule.id}>
                        {rule.rule}
                        <small>
                          {rule.kind === "styling_tip"
                            ? "Gợi ý của ứng dụng"
                            : "Tham chiếu: " + rule.reference?.publisher}
                        </small>
                      </p>
                    ))}
                  </details>
                  <div className="look-actions">
                    <button
                      className="button primary"
                      onClick={() => onApplyLook(look)}
                    >
                      Thử bản phối <ArrowUpRight size={15} />
                    </button>
                    <button
                      className="button secondary"
                      disabled={savedLookIds.includes(look.id)}
                      onClick={() => onSaveLook(look)}
                      aria-label={`Lưu ${look.title}`}
                    >
                      {savedLookIds.includes(look.id) ? (
                        <>
                          <Check size={16} /> Đã lưu
                        </>
                      ) : (
                        <>
                          <BookmarkPlus size={16} /> Lưu
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="section-footnote">
            Hình ảnh là mockup. Gợi ý thẩm mỹ đương đại được trình bày riêng với
            thông tin văn hóa có nguồn.
          </p>
        </>
      )}
      {viewed && (
        <CultureDialog
          title={viewed.garmentName}
          facts={viewed.culturalFacts}
          onClose={() => setViewed(null)}
        />
      )}
    </section>
  );
}
