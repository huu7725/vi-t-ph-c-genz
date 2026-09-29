import { useEffect, useRef } from "react";
import { ArrowUpRight, BookOpen, X } from "lucide-react";
import type { CulturalFact } from "../types";

export function CultureDialog({
  title,
  facts,
  onClose,
}: {
  title: string;
  facts: CulturalFact[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="culture-dialog"
      aria-labelledby="culture-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-inner">
        <div className="dialog-top">
          <span className="eyebrow">
            <BookOpen size={15} /> CHUYỆN SAU NẾP ÁO
          </span>
          <button
            className="icon-button"
            aria-label="Đóng thông tin văn hóa"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <h2 id="culture-title">Tìm hiểu {title.toLowerCase()}</h2>
        <p className="muted">
          Bắt đầu từ một vài nét cơ bản, rồi đọc thêm từ nguồn.
        </p>
        {facts.length === 0 && (
          <p>Chưa có thông tin đã đối chiếu nguồn cho trang phục này.</p>
        )}
        {facts.map((fact) => (
          <article className="culture-article" key={fact.id}>
            <span className="source-badge">
              Đã đối chiếu nguồn · {fact.verifiedAt}
            </span>
            <h3>{fact.title}</h3>
            <p>{fact.description}</p>
            <p className="fact-detail">{fact.identifyingFeatures}</p>
            <a href={fact.reference.url} target="_blank" rel="noreferrer">
              {fact.reference.publisher}
              <ArrowUpRight size={15} />
            </a>
          </article>
        ))}
        <div className="soft-note">
          “Đã đối chiếu nguồn” nghĩa là nội dung khớp bài tham khảo được dẫn;
          chưa phải thẩm định của chuyên gia. Hình minh họa và cách phối đương
          đại không thay thế tư liệu phục dựng.
        </div>
      </div>
    </dialog>
  );
}
