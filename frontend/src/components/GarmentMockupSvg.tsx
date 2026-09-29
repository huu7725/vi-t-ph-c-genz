import { useId } from "react";
import { GarmentPattern as PatternLayer } from "./GarmentPattern";
import type { GarmentPattern, Gender } from "../types";

interface Props {
  garmentId: string;
  gender?: Gender;
  primaryColor: string;
  accentColor: string;
  selectedAccessories: string[];
  className?: string;
  pattern?: GarmentPattern;
  editing?: { selectedId: string | null };
}

/** Original vector fashion illustration. Both figures share the same accessory catalogue. */
export function GarmentMockupSvg({
  garmentId,
  gender = "nu",
  primaryColor,
  accentColor,
  selectedAccessories,
  className = "",
  pattern,
  editing,
}: Props) {
  const id = useId().replace(/:/g, "");
  const male = gender === "nam";
  const nguThan = garmentId === "ao_ngu_than";
  const has = (name: string) => selectedAccessories.includes(name);
  const paint = (name: string) => `url(#${id}-${name})`;
  const neckLeft = male ? 149 : 150;
  const neckRight = male ? 177 : 173;
  // The central front panel remains whole. Openings are at the sides, over long trousers.
  const body = male
    ? nguThan
      ? "M147 117 Q132 120 121 129 L125 201 Q120 289 110 413 Q160 430 212 413 L201 205 L202 132 Q187 122 176 117 Z"
      : "M147 117 Q132 121 122 130 L130 197 Q127 281 114 425 Q156 441 207 425 L196 200 L200 132 Q187 122 176 117 Z"
    : nguThan
      ? "M149 119 Q136 122 127 131 L132 190 Q128 271 118 423 Q161 439 208 422 L194 193 L193 132 Q183 124 174 119 Z"
      : "M149 119 Q137 123 129 132 Q125 155 136 183 Q145 204 137 227 Q129 309 121 449 Q154 465 189 446 Q187 333 185 230 Q175 207 187 182 Q198 155 191 134 Q181 124 174 119 Z";
  const leftSleeve = male
    ? "M123 129 Q111 132 106 151 L80 246 Q89 253 104 252 L132 167 Z"
    : "M130 131 Q118 134 114 151 L94 242 Q102 249 114 245 L140 165 Z";
  const rightSleeve = male
    ? "M199 131 Q213 134 218 152 L239 244 Q229 251 217 249 L189 166 Z"
    : "M191 133 C205 138 207 155 210 173 L223 213 Q226 231 227 245 Q217 251 208 247 L201 218 Q191 191 180 169Z";
  const cuffLeft = male ? 93 : 105;
  const cuffRight = male ? 228 : 217;
  const headPose = male ? undefined : "rotate(-4 161 103)";
  const face = male
    ? "M142 58 Q144 43 162 42 Q183 43 184 62 L181 84 Q177 100 163 104 Q149 100 143 85 Z"
    : "M140 62 C139 47 148 40 161 40 C175 40 184 50 182 65 L179 84 C177 96 169 104 161 105 C153 104 143 96 141 84Z";
  return (
    <svg
      className={`garment-svg ${className}`}
      viewBox="0 0 320 520"
      role="img"
      data-gender={gender}
      data-garment={garmentId}
      aria-label={`Minh họa ${nguThan ? "áo ngũ thân" : "áo dài"}, màu áo ${primaryColor}, màu quần ${accentColor}, mẫu ${male ? "nam" : "nữ"}, ${selectedAccessories.length} phụ kiện${has("acc_non_la") ? ", cầm nón lá" : ""}`}
    >
      <defs>
        <linearGradient id={`${id}-skin`} x1="0" y1="0" x2="1" y2=".25">
          <stop stopColor="#C89273" />
          <stop offset=".4" stopColor="#E6BA96" />
          <stop offset=".72" stopColor="#EDC6A6" />
          <stop offset="1" stopColor="#D3A080" />
        </linearGradient>
        <linearGradient id={`${id}-silk`} x1="0" y1="0" x2="1" y2=".12">
          <stop stopColor={primaryColor} />
          <stop offset=".43" stopColor={primaryColor} />
          <stop offset=".57" stopColor={primaryColor} />
          <stop offset=".74" stopColor={primaryColor} />
          <stop offset="1" stopColor={primaryColor} />
        </linearGradient>
        <linearGradient id={`${id}-fold`} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#081E1D" stopOpacity=".20" />
          <stop offset=".24" stopColor="#fff" stopOpacity=".03" />
          <stop offset=".42" stopColor="#fff" stopOpacity=".13" />
          <stop offset=".53" stopColor="#062623" stopOpacity=".12" />
          <stop offset=".69" stopColor="#fff" stopOpacity=".06" />
          <stop offset="1" stopColor="#0E2220" stopOpacity=".25" />
        </linearGradient>
        <linearGradient id={`${id}-pants`} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor={accentColor} />
          <stop offset=".52" stopColor={accentColor} />
          <stop offset="1" stopColor={accentColor} stopOpacity=".85" />
        </linearGradient>
        <linearGradient id={`${id}-hair`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={male ? "#242D2B" : "#302C2A"} />
          <stop offset=".5" stopColor={male ? "#39413A" : "#544038"} />
          <stop offset="1" stopColor={male ? "#182621" : "#2E2B28"} />
        </linearGradient>
        <radialGradient id={`${id}-blush`}>
          <stop stopColor="#CC786D" stopOpacity=".45" />
          <stop offset="1" stopColor="#CC786D" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-palm-leaf`} x1="0" y1="0" x2=".8" y2="1">
          <stop stopColor="#FAEAC2" />
          <stop offset=".55" stopColor="#E8CE91" />
          <stop offset="1" stopColor="#D7B67A" />
        </linearGradient>
        <linearGradient id={`${id}-silver`}>
          <stop stopColor="#8A9697" />
          <stop offset=".3" stopColor="#F8F5E8" />
          <stop offset=".6" stopColor="#A9B6B5" />
          <stop offset="1" stopColor="#ECF0E4" />
        </linearGradient>
        <pattern
          id={`${id}-cloth`}
          width="5"
          height="5"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 1H5M1 0V5"
            stroke="#fff"
            strokeWidth=".25"
            opacity=".06"
          />
        </pattern>
        <clipPath id={`${id}-body`}>
          <path d={body} />
        </clipPath>
        <clipPath id={`${id}-surface`}>
          <path d={body} />
          <path d={leftSleeve} />
          <path d={rightSleeve} />
        </clipPath>
        <radialGradient id={`${id}-shadow`}>
          <stop stopColor="#374838" stopOpacity=".19" />
          <stop offset="1" stopColor="#374838" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="161" cy="496" rx="95" ry="13" fill={paint("shadow")} />
      <path d="M50 497H270" stroke="#7E9274" strokeWidth=".6" opacity=".25" />
      {/* Hair behind the neck and shoulders, distinct from garment contours. */}
      {!male && (
        <g data-part="female-hair" transform={headPose}>
          <path
            d="M137 49 C137 28 159 22 174 31 C191 35 193 58 188 78 C185 92 191 103 191 119 C190 134 203 142 196 156 C194 163 183 173 173 169 C187 157 175 145 180 132 L146 125 C147 140 134 149 139 163 C120 157 120 143 126 132 C133 118 125 108 132 94 C136 85 132 65 137 49Z"
            fill={paint("hair")}
          />
          <path
            d="M139 56 C134 92 143 101 134 123 C128 137 128 147 132 152 M183 61 C179 93 188 101 185 121 C181 137 196 144 187 159"
            fill="none"
            stroke="#B18F74"
            strokeWidth="1.3"
            opacity=".27"
          />
        </g>
      )}
      <path
        d={`M${neckLeft} 91L${neckLeft} 115Q147 125 139 127L185 132Q183 121 ${neckRight} 115L${neckRight} 90Z`}
        fill={paint("skin")}
      />
      <path
        d={
          male
            ? "M150 99Q162 112 176 96L174 111Q161 119 149 108Z"
            : "M151 96Q162 108 172 97L172 110Q161 116 151 107Z"
        }
        fill="#A8755C"
        opacity=".23"
      />
      {/* The back flap gives the side opening depth without a central split. */}
      <path
        d={
          male
            ? "M128 195L194 195L225 405Q198 421 173 414L142 422L104 412Z"
            : "M138 207L183 209L215 432Q180 453 150 445L106 443Z"
        }
        fill={primaryColor}
      />
      <path
        d={
          male
            ? "M128 195L194 195L225 405Q198 421 173 414L142 422L104 412Z"
            : "M138 207L183 209L215 432Q180 453 150 445L106 443Z"
        }
        fill="#16332F"
        opacity=".16"
      />
      {/* Full-length trousers and separated trouser legs. */}
      <g
        data-part="trousers"
        fill={paint("pants")}
        stroke="#6F7464"
        strokeOpacity=".25"
        strokeWidth=".8"
      >
        <path
          d={
            male
              ? "M134 234L167 236L157 481Q139 486 115 480L122 354Z"
              : "M141 230L164 236L155 483Q137 490 112 484L127 338Z"
          }
        />
        <path
          d={
            male
              ? "M164 236L194 234L202 353L208 480Q190 488 167 481L161 325Z"
              : "M162 236L183 232L196 351L208 483Q185 490 162 482L159 331Z"
          }
        />
        <path
          d="M142 313Q141 405 132 477M177 315Q184 410 188 479"
          fill="none"
          stroke="#686E5D"
          strokeOpacity=".2"
        />
      </g>
      <g fill={paint("silk")} stroke={primaryColor} strokeWidth="1">
        <path data-pattern-surface="true" d={leftSleeve} />
        <path data-pattern-surface="true" d={rightSleeve} />
        <path d={leftSleeve} fill={paint("fold")} />
        <path d={rightSleeve} fill={paint("fold")} />
        <path data-testid="garment-body" data-pattern-surface="true" d={body} />
        <path d={body} fill={paint("fold")} />
        <path d={body} fill={paint("cloth")} stroke="none" />
      </g>
      <g clipPath={paint("body")} fill="none" strokeLinecap="round">
        <path
          d={
            male
              ? "M133 175Q140 223 128 399M181 182Q177 240 198 407M151 241Q147 330 145 419"
              : nguThan
                ? "M139 183Q142 286 129 412M178 188Q178 296 196 416M157 232Q151 337 151 427"
                : "M137 162Q158 170 181 163M140 218Q150 308 126 439M179 222Q176 316 193 440M160 273L151 451"
          }
          stroke="#fff"
          strokeWidth="1.2"
          opacity=".14"
        />
        <path
          d={
            male
              ? "M127 158Q137 217 132 247M191 173Q182 209 192 276"
              : "M131 158Q146 206 137 235M188 167Q172 210 186 246"
          }
          stroke="#102D27"
          strokeWidth="1.2"
          opacity=".2"
        />
        <path
          d={
            male
              ? "M114 412Q162 429 208 413"
              : nguThan
                ? "M121 422Q161 435 205 421"
                : "M124 447Q155 461 186 444"
          }
          stroke={accentColor}
          opacity=".42"
          strokeWidth="1.5"
        />
      </g>
      <g clipPath={paint(pattern?.placement === "free" ? "surface" : "body")}>
        <PatternLayer
          pattern={pattern}
          accentColor={accentColor}
          nguThan={nguThan}
          male={male}
        />
      </g>
      {/* Standing collar and side fastening: five knots for the ngũ thân illustration. */}
      <path
        d={`M${neckLeft - 2} 110Q161 119 ${neckRight + 2} 110L${neckRight + 3} 124Q164 135 ${neckLeft - 3} 122Z`}
        fill={primaryColor}
        stroke={accentColor}
        strokeOpacity=".65"
        strokeWidth=".8"
      />
      <path
        d={
          nguThan
            ? "M164 128Q181 138 193 142L193 236"
            : "M164 128Q181 140 188 151L184 207"
        }
        stroke={accentColor}
        strokeOpacity=".55"
        strokeWidth="1.2"
        fill="none"
      />
      {(nguThan
        ? [
            [166, 130],
            [184, 139],
            [193, 155],
            [193, 183],
            [193, 216],
          ]
        : [
            [166, 130],
            [183, 144],
            [188, 161],
          ]
      ).map(([x, y], i) => (
        <g key={i} data-part="fastener" transform={`translate(${x} ${y})`}>
          <path d="M-3 0H4" stroke={accentColor} strokeWidth="1.3" />
          <ellipse rx="1.5" ry="2.1" fill={accentColor} />
        </g>
      ))}
      <path
        d={`M${cuffLeft - 11} 244L${cuffLeft + 10} 248M${cuffRight - 10} 245L${cuffRight + 10} 241`}
        stroke={accentColor}
        opacity=".45"
        strokeWidth="1.2"
      />
      {/* Delicate hands, long sleeves reaching the wrist. */}
      <g fill={paint("skin")} stroke="#AE795E" strokeWidth=".5">
        <path
          d={`M${cuffLeft - 8} 248Q${cuffLeft - 10} 260 ${cuffLeft - 7} 269Q${cuffLeft - 5} 276 ${cuffLeft - 2} 272L${cuffLeft + 4} 266Q${cuffLeft + 8} 256 ${cuffLeft + 6} 249Z`}
        />
        <path
          d={`M${cuffRight - 7} 247Q${cuffRight - 8} 257 ${cuffRight - 5} 269Q${cuffRight} 277 ${cuffRight + 4} 270Q${cuffRight + 10} 259 ${cuffRight + 7} 245Z`}
        />
      </g>
      {has("acc_tui_deo_cheo") && (
        <g data-accessory="acc_tui_deo_cheo">
          <path
            d="M133 131Q176 187 228 284"
            stroke="#6F5146"
            strokeWidth="3.6"
            fill="none"
          />
          <path
            d="M134 132Q177 187 229 284"
            stroke="#C9A586"
            strokeWidth="1.3"
            fill="none"
          />
          <g transform="translate(210 278) rotate(-7 21 25)">
            <rect
              x="0"
              y="0"
              width="45"
              height="48"
              rx="9"
              fill="#916750"
              stroke="#654B3F"
              strokeWidth="1"
            />
            <path
              d="M0 9Q22 19 45 9V18Q22 30 0 18Z"
              fill="#B98C69"
              stroke="#654B3F"
              strokeWidth=".7"
            />
            <rect
              x="18"
              y="16"
              width="10"
              height="8"
              rx="2"
              fill="#E7C884"
              stroke="#AD8851"
              strokeWidth=".7"
            />
            <path
              d="M5 29V39Q5 43 10 43H36Q40 43 40 39V28"
              fill="none"
              stroke="#C39B7C"
              strokeWidth=".7"
            />
          </g>
        </g>
      )}
      {/* A relaxed head angle and soft, expressive features for the female figure. */}
      <g data-part="portrait" transform={headPose}>
        <ellipse cx="142" cy="76" rx="3.4" ry="6" fill="#CEA080" />
        <ellipse cx="181" cy="76" rx="3.4" ry="6" fill="#CEA080" />
        <path data-part="face" d={face} fill={paint("skin")} />
        {male ? (
          <g data-part="male-hair">
            <path
              d="M141 71Q133 51 142 40Q155 25 174 35Q190 35 187 60L181 72L178 54Q168 57 159 46Q151 59 143 60Z"
              fill={paint("hair")}
            />
            <path
              d="M141 50Q154 38 176 41M148 43Q158 35 170 36"
              fill="none"
              stroke="#A2A288"
              strokeWidth=".7"
              opacity=".3"
            />
          </g>
        ) : (
          <g data-part="curtain-bangs">
            <path
              d="M138 74 C129 60 134 41 144 34 C153 28 162 29 164 33 C176 30 185 38 188 48 C191 64 184 76 179 83 L179 67 C179 54 171 53 165 42 C161 51 154 57 144 61 C142 69 147 79 141 86 C136 83 136 79 138 74Z"
              fill={paint("hair")}
            />
            <path
              d="M137 60 Q138 40 158 35 M143 55Q153 48 160 39 M169 38Q184 49 183 64"
              fill="none"
              stroke="#C39C7D"
              strokeWidth="1.1"
              opacity=".3"
            />
          </g>
        )}
        {male ? (
          <>
            <g fill="none" strokeLinecap="round">
              <path
                d="M147 70Q151 67 155 69M166 69Q171 67 175 70"
                stroke="#584D3B"
                strokeWidth="1.6"
              />
              <path
                d="M148 75Q152 73 155 75M167 75Q171 73 174 75"
                stroke="#3C4035"
                strokeWidth="1"
              />
              <path
                d="M162 75L160 84L164 85"
                stroke="#B78467"
                strokeWidth=".85"
              />
              <path
                d="M155 92Q162 95 169 91"
                stroke="#A77360"
                strokeWidth="1.2"
              />
            </g>
            <ellipse cx="152" cy="76" rx="1.1" ry="1.3" fill="#343C33" />
            <ellipse cx="170" cy="76" rx="1.1" ry="1.3" fill="#343C33" />
          </>
        ) : (
          <g data-part="female-features">
            <ellipse cx="148" cy="84" rx="7" ry="4" fill={paint("blush")} />
            <ellipse cx="175" cy="84" rx="7" ry="4" fill={paint("blush")} />
            <path
              d="M147 68 Q151 66 155 68 M167 68 Q172 66 176 69"
              fill="none"
              stroke="#685047"
              strokeWidth="1.15"
              strokeLinecap="round"
            />
            <g data-part="female-eyes">
              <path
                d="M146 75 Q150 70 156 75 Q151 79 146 75 M166 75 Q172 70 177 75 Q172 80 166 75"
                fill="#FBF0E1"
              />
              <ellipse cx="151.5" cy="75" rx="2.1" ry="2.6" fill="#695343" />
              <ellipse cx="171.5" cy="75" rx="2.1" ry="2.6" fill="#695343" />
              <ellipse cx="151.7" cy="75" rx="1" ry="1.8" fill="#302E2C" />
              <ellipse cx="171.7" cy="75" rx="1" ry="1.8" fill="#302E2C" />
              <g fill="#FFF9EE">
                <circle cx="152.3" cy="73.8" r=".65" />
                <circle cx="172.3" cy="73.8" r=".65" />
              </g>
              <path
                d="M145 73.5 L147 74.5 Q151 71 156 75 M166 75 Q171 71 175.5 74 L178 72.5"
                fill="none"
                stroke="#463832"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </g>
            <path
              d="M162 77 Q159.5 83 161 84.5 L163.5 84"
              fill="none"
              stroke="#BC896C"
              strokeWidth=".8"
              strokeLinecap="round"
            />
            <path
              d="M155 91 Q159 89 162 90.5 Q165 89 169 91 Q163 97 157 93Z"
              fill="#B56D6A"
            />
            <path
              d="M155.5 91 Q162 93 168.5 91"
              fill="none"
              stroke="#935954"
              strokeWidth=".55"
            />
            <path
              d="M159 94Q162 95 164 94"
              fill="none"
              stroke="#E9A294"
              strokeWidth=".75"
              strokeLinecap="round"
            />
          </g>
        )}
      </g>
      {!male && (
        <g data-part="hair-locks" fill={paint("hair")}>
          <path d="M137 88 C138 100 132 112 133 126 C134 139 123 146 130 159 C133 151 143 147 140 134 C138 117 148 105 142 93Z" />
          <path d="M180 88 C179 103 186 110 183 125 C179 140 189 149 185 160 C183 166 178 169 174 170 C188 175 198 166 193 155 C188 145 189 135 190 123 C191 107 184 94 184 87Z" />
          <path
            d="M184 110Q189 123 185 135Q184 146 189 155M136 116Q134 130 135 137"
            stroke="#A77F63"
            strokeWidth="1"
            fill="none"
            opacity=".3"
          />
        </g>
      )}
      {has("acc_kieng_bac") && (
        <g data-accessory="acc_kieng_bac">
          <path
            d="M142 124Q144 147 162 148Q183 147 183 125"
            fill="none"
            stroke={paint("silver")}
            strokeWidth="4.5"
          />
          <path
            d="M144 126Q151 147 180 130"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth=".7"
            opacity=".6"
          />
        </g>
      )}
      {has("acc_khan_van") && (
        <g data-accessory="acc_khan_van" transform={headPose}>
          <path
            d={
              male
                ? "M134 52Q131 25 159 24Q189 22 189 53Q164 43 134 52Z"
                : "M135 55Q128 27 159 24Q189 25 186 56L180 51Q179 35 160 35Q141 35 142 53Z"
            }
            fill={primaryColor}
            stroke="#1E352E"
            strokeOpacity=".2"
          />
          <path
            d={
              male
                ? "M137 35Q160 25 186 35M135 42Q160 31 187 42M135 48Q160 38 187 48"
                : "M138 48Q132 30 158 29Q185 29 183 49"
            }
            fill="none"
            stroke={accentColor}
            strokeWidth="1.1"
            opacity=".65"
          />
        </g>
      )}
      {has("acc_kinh_ram") && (
        <g
          data-accessory="acc_kinh_ram"
          transform={headPose}
          stroke={male ? "#544837" : "#614941"}
          strokeWidth="1.5"
        >
          <path d="M143 74H147M156 74Q161 70 166 74M178 74H181" fill="none" />
          <ellipse
            cx="151"
            cy="75"
            rx="8"
            ry={male ? "5" : "4.8"}
            fill={male ? "#35463F" : "#52483F"}
          />
          <ellipse
            cx="172"
            cy="75"
            rx="8"
            ry={male ? "5" : "4.8"}
            fill={male ? "#35463F" : "#52483F"}
          />
          <path
            d="M148 73L153 77M169 73L174 77"
            stroke="#91AAA0"
            strokeWidth=".8"
            opacity=".6"
          />
        </g>
      )}
      {has("acc_bong_tai") && (
        <g data-accessory="acc_bong_tai" transform={headPose}>
          {[142, 181].map((x) => (
            <g key={x}>
              <circle
                cx={x}
                cy="86"
                r="1.7"
                fill="#E9DBB6"
                stroke="#B49B6A"
                strokeWidth=".5"
              />
              <path d={`M${x} 88V91`} stroke="#BDA273" strokeWidth="1" />
              <ellipse
                cx={x}
                cy="94"
                rx="3"
                ry="4"
                fill="#F8F2E3"
                stroke="#B7AE98"
                strokeWidth=".7"
              />
              <ellipse cx={x - 0.8} cy="93" rx=".8" ry="1.4" fill="#FFFFFF" />
            </g>
          ))}
        </g>
      )}
      {has("acc_vong_tay") && (
        <g data-accessory="acc_vong_tay">
          <path
            d={`M${cuffRight - 7} 253Q${cuffRight} 258 ${cuffRight + 7} 252`}
            fill="none"
            stroke={paint("silver")}
            strokeWidth="3.8"
          />
          <path
            d={`M${cuffRight - 6} 253Q${cuffRight} 256 ${cuffRight + 6} 252`}
            fill="none"
            stroke="#FAF9EE"
            strokeWidth=".75"
          />
          <circle
            cx={cuffRight + 2}
            cy="256"
            r="2"
            fill="#E9DAB3"
            stroke="#B6A581"
            strokeWidth=".6"
          />
        </g>
      )}
      {has("acc_kep_hoa") && (
        <g data-accessory="acc_kep_hoa" transform={headPose}>
          <path
            d="M180 59L187 65"
            stroke="#BD9A64"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <g transform="translate(181 57)">
            {[0, 72, 144, 216, 288].map((angle) => (
              <ellipse
                key={angle}
                cx="0"
                cy="-3.3"
                rx="2.6"
                ry="4"
                transform={`rotate(${angle})`}
                fill="#FAE7DD"
                stroke="#C99784"
                strokeWidth=".5"
              />
            ))}
            <circle r="2.3" fill="#D5AE6B" stroke="#A97E48" strokeWidth=".6" />
          </g>
        </g>
      )}
      {has("acc_chuoi_ngoc") && (
        <g data-accessory="acc_chuoi_ngoc">
          <path
            d="M141 124Q145 151 165 151Q183 145 186 124"
            fill="none"
            stroke="#B4A994"
            strokeWidth="1"
          />
          {[
            [141, 125],
            [143, 131],
            [146, 137],
            [150, 142],
            [156, 146],
            [162, 148],
            [169, 146],
            [175, 142],
            [180, 137],
            [183, 131],
            [185, 125],
          ].map(([x, y]) => (
            <g key={x}>
              <circle
                cx={x}
                cy={y}
                r="2.7"
                fill="#F1EBDD"
                stroke="#B0A994"
                strokeWidth=".6"
              />
              <circle cx={x - 0.6} cy={y - 0.8} r=".9" fill="#FFFFFF" />
            </g>
          ))}
        </g>
      )}
      {has("acc_tui_coi") && (
        <g
          data-accessory="acc_tui_coi"
          transform={`translate(${cuffRight} 286) rotate(-5)`}
        >
          <path
            d="M-12 7Q-15-25 0-26Q17-25 14 7"
            stroke="#97724A"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M-24 0Q0 7 24 0L21 52Q0 60-21 52Z"
            fill="#C9AE80"
            stroke="#95794F"
            strokeWidth="1"
          />
          {[9, 17, 25, 33, 41, 49].map((y) => (
            <path
              key={y}
              d={`M-21 ${y}Q0 ${y + 6} 21 ${y}`}
              fill="none"
              stroke="#F0DEB8"
              strokeWidth="1.4"
            />
          ))}
          {[-15, -7, 1, 9, 17].map((x) => (
            <path
              key={x}
              d={`M${x} 5L${x * 0.86} 52`}
              stroke="#A2875E"
              strokeWidth=".8"
            />
          ))}
        </g>
      )}
      {has("acc_quat_tre") && (
        <g
          data-accessory="acc_quat_tre"
          transform={`translate(${cuffLeft} 260) rotate(-25)`}
        >
          <path
            d="M0 5L-39-32Q0-72 39-32Z"
            fill="#E4CE9E"
            stroke="#AF8952"
            strokeWidth=".85"
          />
          <path
            d="M-34-28Q0-59 34-28"
            fill="none"
            stroke="#F6EAD0"
            strokeWidth="4"
          />
          {[-32, -21, -10, 0, 10, 21, 32].map((x) => (
            <path
              key={x}
              d={`M0 5L${x} ${-50 + Math.abs(x) * 0.48}`}
              stroke="#A4824E"
              strokeWidth=".8"
            />
          ))}
          <circle cy="5" r="2.5" fill="#997346" />
        </g>
      )}
      {has("acc_non_la") && (
        <g data-accessory="acc_non_la" data-placement="hand">
          <path
            d={`M${cuffLeft} 267 Q${cuffLeft - 15} 280 ${has("acc_quat_tre") ? 64 : cuffLeft - 12} ${has("acc_quat_tre") ? 320 : 290}`}
            stroke="#B19B77"
            strokeWidth="2.8"
            fill="none"
          />
          <g
            data-part="held-hat"
            transform={`translate(${has("acc_quat_tre") ? 70 : cuffLeft - 7} ${has("acc_quat_tre") ? 324 : 294}) rotate(-16)`}
          >
            <path
              d="M-21 14Q-10 48 11 43Q26 38 28 11"
              stroke="#B5A17D"
              strokeWidth="3.2"
              fill="none"
            />
            <path
              d="M-21 14Q-10 48 11 43Q26 38 28 11"
              stroke={accentColor}
              strokeWidth="2"
              fill="none"
            />
            <ellipse cx="0" cy="8" rx="49" ry="12" fill="#BCA06E" />
            <path
              d="M-49 7L0-38L49 7Q0 28-49 7Z"
              fill={paint("palm-leaf")}
              stroke="#BCA172"
              strokeWidth="1"
            />
            <path
              d="M-36-4Q0 10 36-4M-23-16Q0-7 23-16M-11-27Q0-24 11-27M-48 7Q0 24 48 7"
              fill="none"
              stroke="#C8AD79"
              strokeWidth=".8"
            />
            <path
              d="M0-36L-28 12M0-36L-10 16M0-36L12 16M0-36L32 12"
              stroke="#C8AD79"
              strokeWidth=".5"
              opacity=".5"
            />
            <path
              d="M-47 8Q0 26 47 8"
              stroke="#FBEDC5"
              strokeWidth="1.5"
              fill="none"
            />
          </g>
        </g>
      )}
      {has("acc_sneaker_trang") ? (
        <g
          data-accessory="acc_sneaker_trang"
          fill="#F9F8F2"
          stroke="#9FA89A"
          strokeWidth=".8"
        >
          <path d="M119 478L148 479L150 489Q129 494 108 490Q106 484 119 478Z" />
          <path d="M167 479L195 478Q209 480 215 488Q197 494 167 490Z" />
          <path
            d="M108 488Q127 491 150 487M167 488Q194 491 214 487M121 481L138 485M126 480L142 484M178 481L198 484M177 484L195 487"
            fill="none"
          />
        </g>
      ) : has("acc_guoc_moc") ? (
        <g data-accessory="acc_guoc_moc">
          <path
            d="M118 480L149 481L149 491L108 491Q105 485 118 480M168 481L196 479Q210 482 214 490L168 491Z"
            fill="#B88D62"
          />
          <path
            d="M114 484L145 486M172 486L202 483"
            stroke={primaryColor}
            strokeWidth="5"
          />
          <path
            d="M112 491V494M145 491V494M170 491V494M208 491V494"
            stroke="#8A6645"
            strokeWidth="3"
          />
        </g>
      ) : (
        <g fill="#35423B">
          <path d="M121 480L150 481V491Q130 494 109 490Q109 483 121 480M168 481L194 480Q206 481 214 488Q205 494 168 491Z" />
          <path
            d="M116 488L143 489M175 489L206 488"
            stroke="#B4AF96"
            strokeWidth=".6"
            opacity=".5"
          />
        </g>
      )}
      {editing && pattern?.placement === "free" && (
        <g className="decoration-handles">
          {pattern.decorations
            ?.filter((item) => item.id !== editing.selectedId)
            .map((item) => (
              <g
                key={item.id}
                transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`}
                data-decoration-id={item.id}
              >
                <rect
                  data-decoration-action="move"
                  x={-50 * item.scale}
                  y={-50 * item.scale}
                  width={100 * item.scale}
                  height={100 * item.scale}
                  fill="transparent"
                  stroke={
                    item.id === editing.selectedId ? "#D49B37" : "transparent"
                  }
                  strokeWidth="1.2"
                  strokeDasharray="4 2"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
          {pattern.decorations
            ?.filter((item) => item.id === editing.selectedId)
            .map((item) => (
              <g
                key={item.id}
                transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`}
                data-decoration-id={item.id}
              >
                <rect
                  data-decoration-action="move"
                  x={-50 * item.scale}
                  y={-50 * item.scale}
                  width={100 * item.scale}
                  height={100 * item.scale}
                  fill="transparent"
                  stroke="#D49B37"
                  strokeWidth="1.2"
                  strokeDasharray="4 2"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={`M0 ${-50 * item.scale} V${-50 * item.scale - 18}`}
                  stroke="#C78F30"
                  strokeWidth="1"
                  pointerEvents="none"
                />
                <circle
                  data-decoration-action="rotate"
                  cx="0"
                  cy={-50 * item.scale - 18}
                  r="7"
                  fill="#FFF7E8"
                  stroke="#B17D26"
                  strokeWidth="1"
                />
                <path
                  d={`M-3 ${-50 * item.scale - 18} Q0 ${-50 * item.scale - 23} 3 ${-50 * item.scale - 18}`}
                  fill="none"
                  stroke="#99681B"
                  pointerEvents="none"
                />
                <rect
                  data-decoration-action="resize"
                  x={50 * item.scale - 7}
                  y={50 * item.scale - 7}
                  width="14"
                  height="14"
                  rx="3"
                  fill="#FFF7E8"
                  stroke="#B17D26"
                  strokeWidth="1"
                />
              </g>
            ))}
        </g>
      )}
    </svg>
  );
}
