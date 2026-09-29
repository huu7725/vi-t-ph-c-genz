import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Flower2,
  Sparkles,
} from "lucide-react";
import type { CulturalFact, Garment } from "../types";
import { GarmentMockupSvg } from "./GarmentMockupSvg";
import { CultureDialog } from "./CultureDialog";

interface Props {
  garments: Garment[];
  cultureFacts: CulturalFact[];
  onSelectGarment: (id: string) => void;
}
export function ExploreSection({
  garments,
  cultureFacts,
  onSelectGarment,
}: Props) {
  const [viewed, setViewed] = useState<Garment | null>(null);
  return (
    <div className="explore-page enter">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="tiny-star">✳</span> DI SẢN TRONG PHONG CÁCH CỦA
            BẠN
          </span>
          <h1>
            Nét Việt.
            <br />
            <em>Chất riêng.</em>
          </h1>
          <p>
            Áo quen, cách phối mới. Khám phá Việt phục,
            <br className="desktop-break" /> thử sắc màu bạn yêu và viết nên câu
            chuyện
            <br className="desktop-break" /> phong cách của riêng mình.
          </p>
          <div className="hero-actions">
            <button
              className="button primary"
              onClick={() => onSelectGarment("ao_ngu_than")}
            >
              Bắt đầu phối đồ <ArrowUpRight size={18} />
            </button>
            <a href="#collections" className="text-link">
              Khám phá trang phục <ArrowRight size={16} />
            </a>
          </div>
          <div className="hero-footnote">
            <span className="mini-stamp">
              <Flower2 size={20} />
            </span>
            <span>
              Sáng tạo hôm nay.
              <br />
              <strong>Hiểu thêm nét đẹp ngày xưa.</strong>
            </span>
          </div>
        </div>
        <div
          className="hero-art"
          aria-label="Hai bản phối áo dài và áo ngũ thân"
        >
          <span className="art-orbit orbit-one" />
          <span className="art-orbit orbit-two" />
          <span className="art-caption">THE VIỆT EDIT / 01</span>
          <span className="art-star">✳</span>
          <div className="hero-outfit outfit-left">
            <GarmentMockupSvg
              garmentId="ao_ngu_than"
              gender="nam"
              primaryColor="#1E5E58"
              accentColor="#FDFBF7"
              selectedAccessories={[
                "acc_khan_van",
                "acc_quat_tre",
                "acc_sneaker_trang",
              ]}
            />
            <div className="outfit-caption">
              <span>01 / MẪU NAM</span>
              <b>Ngọc & ngà</b>
            </div>
          </div>
          <div className="hero-outfit outfit-right">
            <GarmentMockupSvg
              garmentId="ao_dai"
              gender="nu"
              primaryColor="#BC4749"
              accentColor="#FDFBF7"
              selectedAccessories={[
                "acc_tui_coi",
                "acc_kieng_bac",
                "acc_guoc_moc",
              ]}
            />
            <div className="outfit-caption">
              <span>02 / MẪU NỮ</span>
              <b>Gạch & kem</b>
            </div>
          </div>
          <div className="art-label">
            <Sparkles size={17} />
            <span>
              Một chút truyền thống.
              <br />
              <strong>Một chút bạn.</strong>
            </span>
          </div>
          <span className="art-disclaimer">MINH HỌA PHỐI ĐỒ ĐƯƠNG ĐẠI</span>
        </div>
      </section>
      <div className="ribbon">
        <span>CHỌN MỘT NẾP ÁO</span>
        <span>✳</span>
        <span>THÊM MỘT SẮC MÀU</span>
        <span>✳</span>
        <span>KỂ CÂU CHUYỆN CỦA BẠN</span>
        <span>✳</span>
        <span>HIỂU THÊM NÉT VIỆT</span>
      </div>
      <section id="collections" className="collection-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">TỦ ĐỒ VĂN HÓA</span>
            <h2>Bạn muốn bắt đầu từ đâu?</h2>
          </div>
          <p>Hai dáng áo · Mẫu nam & nữ · Chất riêng của bạn.</p>
        </div>
        <div className="collection-grid">
          {garments.map((garment, index) => (
            <article
              className={`collection-card collection-${index}`}
              key={garment.id}
            >
              <div className="collection-visual">
                <span className="collection-number">0{index + 1}</span>
                <div className="collection-models">
                  <GarmentMockupSvg
                    gender="nam"
                    garmentId={garment.id}
                    primaryColor={index === 0 ? "#264653" : "#1E5E58"}
                    accentColor="#FDFBF7"
                    selectedAccessories={["acc_khan_van"]}
                  />
                  <GarmentMockupSvg
                    gender="nu"
                    garmentId={garment.id}
                    primaryColor={index === 0 ? "#BC4749" : "#1E5E58"}
                    accentColor="#FDFBF7"
                    selectedAccessories={
                      index === 0
                        ? ["acc_non_la", "acc_guoc_moc"]
                        : ["acc_quat_tre", "acc_sneaker_trang"]
                    }
                  />
                </div>
                <span className="collection-model-label">NAM & NỮ</span>
              </div>
              <div className="collection-copy">
                <span className="small-label">
                  {index === 0 ? "DỊU DÀNG & TỰ DO" : "CỔ ĐIỂN & ĐẦY CÁ TÍNH"}
                </span>
                <h3>{garment.name}</h3>
                <p>{garment.shortDesc}</p>
                <button
                  className="text-link"
                  onClick={() => onSelectGarment(garment.id)}
                >
                  Thử phối {garment.name.toLowerCase()}{" "}
                  <ArrowUpRight size={16} />
                </button>
                <button
                  className="culture-link"
                  onClick={() => setViewed(garment)}
                >
                  <BookOpen size={14} /> Câu chuyện trang phục
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="culture-banner">
        <Flower2 size={38} strokeWidth={1} />
        <div>
          <h3>Phối đồ vui hơn khi hiểu điều mình mặc.</h3>
          <p>
            Mỗi trang phục đi kèm thông tin ngắn và nguồn để bạn khám phá thêm.
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() => setViewed(garments[1])}
        >
          Đọc một câu chuyện <ArrowUpRight size={16} />
        </button>
      </section>
      {viewed && (
        <CultureDialog
          title={viewed.name}
          facts={cultureFacts.filter((f) => f.garmentId === viewed.id)}
          onClose={() => setViewed(null)}
        />
      )}
    </div>
  );
}
