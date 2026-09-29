import { defaultPattern, motifCatalog, presetPatternPositions } from "@domain";
import type { GarmentPattern as Pattern, LineMotif } from "../types";

export function MotifLines({ motif }: { motif: LineMotif }) {
  return (
    <>
      {motif.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </>
  );
}
export function MotifThumbnail({
  motif,
  color = "currentColor",
}: {
  motif: LineMotif;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={motif.name}
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <MotifLines motif={motif} />
    </svg>
  );
}
export function GarmentPattern({
  pattern = defaultPattern,
  accentColor,
  nguThan,
  male,
}: {
  pattern?: Pattern;
  accentColor: string;
  nguThan: boolean;
  male: boolean;
}) {
  if (pattern.placement === "free")
    return (
      <g
        data-part="garment-pattern"
        data-placement="free"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {pattern.decorations?.map((item) => {
          const motif =
            item.motifId === "custom"
              ? pattern.assets?.find((a) => a.id === item.assetId)?.motif
              : motifCatalog.find((m) => m.id === item.motifId);
          return motif ? (
            <g
              key={item.id}
              data-placed-motif={item.id}
              data-motif={item.motifId}
              transform={`translate(${item.x} ${item.y}) rotate(${item.rotation}) scale(${item.scale}) translate(-50 -50)`}
              stroke={item.color === "auto" ? accentColor : item.color}
              strokeWidth={item.strokeWidth / item.scale}
              opacity={item.opacity}
            >
              <MotifLines motif={motif} />
            </g>
          ) : null;
        })}
      </g>
    );
  if (pattern.motifId === "none") return null;
  const motif =
    pattern.motifId === "custom"
      ? pattern.custom
      : motifCatalog.find((m) => m.id === pattern.motifId);
  if (!motif) return null;
  const stroke = pattern.color === "auto" ? accentColor : pattern.color;
  const positions = presetPatternPositions(pattern, nguThan, male);
  return (
    <g
      data-part="garment-pattern"
      data-motif={pattern.motifId}
      data-placement={pattern.placement}
      aria-label={`Hoa văn ${motif.name}`}
      fill="none"
      stroke={stroke}
      opacity={pattern.opacity}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {positions.map(([x, y, scale], i) => (
        <g
          key={i}
          transform={`translate(${x} ${y}) scale(${scale})`}
          strokeWidth={pattern.strokeWidth / scale}
        >
          <MotifLines motif={motif} />
        </g>
      ))}
    </g>
  );
}
