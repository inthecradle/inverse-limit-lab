import { useId } from "react";
import "./visuals.css";

type Props = {
  distances: number[];
  rate: number;
  highlight: boolean;
  onHighlight: (key: string | null) => void;
};

export function DistanceGraph({
  distances,
  rate,
  highlight,
  onHighlight,
}: Props) {
  const id = useId().replace(/:/g, "");
  const data = distances.length ? distances : [0];
  const width = 640;
  const height = 234;
  const left = 57;
  const right = 616;
  const top = 29;
  const bottom = 184;
  const last = Math.max(data.length - 1, 10);
  const upper = Math.max(...data, 0.1) * 1.12;
  const x = (n: number) => left + (n / last) * (right - left);
  const y = (value: number) => bottom - (value / upper) * (bottom - top);
  const path = data
    .map((value, n) => `${n === 0 ? "M" : "L"} ${x(n)} ${y(value)}`)
    .join(" ");
  const bound = data
    .map((_, n) => `${n === 0 ? "M" : "L"} ${x(n)} ${y(data[0] * rate ** n)}`)
    .join(" ");
  const ticks = [
    ...new Set([
      0,
      Math.round(last / 4),
      Math.round(last / 2),
      Math.round((last * 3) / 4),
      last,
    ]),
  ];
  const lastDistance = data[data.length - 1];

  return (
    <div className={`il-distance-visual${highlight ? " is-highlighted" : ""}`}>
      <svg
        className="il-distance-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
        onMouseEnter={() => onHighlight("contraction")}
        onMouseLeave={() => onHighlight(null)}
      >
        <title id={`${id}-title`}>固定点までの距離の推移</title>
        <desc id={`${id}-desc`}>
          {distances.length
            ? `${data.length - 1}回の反復後の距離は${lastDistance.toFixed(6)}です。`
            : "反復を開始すると距離を表示します。"}
          {rate < 1
            ? `青い破線は縮小率${rate}から計算した理論上界です。`
            : "縮小条件を満たさないため、理論上界は表示しません。"}
        </desc>
        <text className="il-svg-small" x={left} y="15">
          d(Sₙ, S*)
        </text>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <g key={ratio}>
            <line
              className="il-graph-grid"
              x1={left}
              x2={right}
              y1={y(upper * ratio)}
              y2={y(upper * ratio)}
            />
            <text
              className="il-svg-tick"
              x={left - 9}
              y={y(upper * ratio) + 4}
              textAnchor="end"
            >
              {(upper * ratio).toFixed(2)}
            </text>
          </g>
        ))}
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="il-graph-grid"
              x1={x(tick)}
              x2={x(tick)}
              y1={top}
              y2={bottom}
            />
            <text
              className="il-svg-tick"
              x={x(tick)}
              y={bottom + 18}
              textAnchor="middle"
            >
              {tick}
            </text>
          </g>
        ))}
        <path
          className="il-graph-axis"
          d={`M ${left} ${top} V ${bottom} H ${right}`}
        />
        {distances.length > 0 && <path className="il-distance-line" d={path} />}
        {distances.length > 0 && rate < 1 && (
          <path className="il-bound-line" d={bound} />
        )}
        {distances.length > 0 ? (
          <circle
            className="il-distance-end"
            cx={x(data.length - 1)}
            cy={y(lastDistance)}
            r="4"
          />
        ) : (
          <text
            className="il-svg-small"
            x={(left + right) / 2}
            y={(top + bottom) / 2}
            textAnchor="middle"
          >
            反復を始めると、距離の推移を表示します
          </text>
        )}
        <text
          className="il-svg-small"
          x={right}
          y={height - 8}
          textAnchor="end"
        >
          反復回数 n
        </text>
      </svg>
      <div className="il-visual-legend">
        <span>
          <i className="il-legend-line is-coherent" />
          固定点までの距離
        </span>
        {rate < 1 ? (
          <button
            className="il-legend-button"
            onClick={() => onHighlight("contraction")}
            onFocus={() => onHighlight("contraction")}
            onBlur={() => onHighlight(null)}
          >
            <i className="il-legend-line is-bound" />
            理論上界 Lⁿ d₀
          </button>
        ) : (
          <span className="il-graph-note">L ≥ 1：縮小の保証なし</span>
        )}
      </div>
    </div>
  );
}
