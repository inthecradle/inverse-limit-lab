import { useId, useRef, type KeyboardEvent, type PointerEvent } from "react";
import {
  COHERENCE_TOLERANCE,
  project,
  toCoordinate,
  toNormalized,
  type Layer,
} from "../model";
import "./visuals.css";

type Props = {
  layers: Layer[];
  family: number[];
  showProjections: boolean;
  showFixedPoint: boolean;
  highlight: string | null;
  onHighlight: (key: string | null) => void;
  onChange: (index: number, value: number) => void;
  target?: number;
  readOnly?: boolean;
  compact?: boolean;
  compareFamily?: number[];
  coordinateBounds?: [number, number];
};

export function LayerStack({
  layers,
  family,
  showProjections,
  showFixedPoint,
  highlight,
  onHighlight,
  onChange,
  target = 0.2,
  readOnly = false,
  compact = false,
  compareFamily,
  coordinateBounds,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<number | null>(null);
  const id = useId().replace(/:/g, "");
  const width = 640;
  const spacing = compact ? 60 : 78;
  const height = (compact ? 65 : 104) + layers.length * spacing;
  const plotLeft = 124;
  const plotRight = 560;
  const minimum =
    coordinateBounds?.[0] ?? Math.min(...layers.map((layer) => layer.min));
  const maximum =
    coordinateBounds?.[1] ?? Math.max(...layers.map((layer) => layer.max));
  const span = Math.max(maximum - minimum, 0.001);
  const x = (value: number) =>
    plotLeft + ((value - minimum) / span) * (plotRight - plotLeft);
  const y = (index: number) =>
    (compact ? 45 : 62) + (layers.length - 1 - index) * spacing;
  const active = (key: string) => (highlight === key ? " is-highlighted" : "");
  const select = (key: string) => ({
    onMouseEnter: () => onHighlight(key),
    onMouseLeave: () => onHighlight(null),
    onFocus: () => onHighlight(key),
    onBlur: () => onHighlight(null),
    onClick: () => onHighlight(key),
    onKeyDown: (event: KeyboardEvent<SVGGElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onHighlight(key);
      }
    },
  });
  const updateFromPointer = (
    event: PointerEvent<SVGElement>,
    index: number,
  ) => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const position = point.matrixTransform(matrix.inverse());
    const value =
      minimum + ((position.x - plotLeft) / (plotRight - plotLeft)) * span;
    onChange(
      index,
      Math.min(layers[index].max, Math.max(layers[index].min, value)),
    );
  };
  const startDrag = (event: PointerEvent<SVGElement>, index: number) => {
    if (readOnly || event.button !== 0) return;
    dragging.current = index;
    event.currentTarget.setPointerCapture(event.pointerId);
    onHighlight("layers");
    updateFromPointer(event, index);
  };
  const moveDrag = (event: PointerEvent<SVGElement>) => {
    if (dragging.current !== null) updateFromPointer(event, dragging.current);
  };
  const endDrag = () => {
    dragging.current = null;
  };
  const keyboard = (event: KeyboardEvent<SVGCircleElement>, index: number) => {
    if (readOnly) return;
    const layer = layers[index];
    const step = (layer.max - layer.min) * (event.shiftKey ? 0.05 : 0.01);
    let next: number;
    if (event.key === "Home") next = layer.min;
    else if (event.key === "End") next = layer.max;
    else if (event.key === "ArrowRight" || event.key === "ArrowUp")
      next = family[index] + step;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown")
      next = family[index] - step;
    else return;
    event.preventDefault();
    onChange(index, Math.min(layer.max, Math.max(layer.min, next)));
  };
  const fixedPoints = layers
    .map((layer, index) => `${x(toCoordinate(layer, target))},${y(index)}`)
    .join(" ");

  return (
    <div
      className={`il-layer-visual ${compact ? "compact" : ""} ${readOnly ? "readonly" : ""}`}
    >
      <svg
        ref={svgRef}
        className="il-layer-svg"
        viewBox={`0 0 ${width} ${height}`}
        aria-labelledby={`${id}-title ${id}-desc`}
      >
        <title id={`${id}-title`}>抽象度の層と射影の整合性</title>
        <desc id={`${id}-desc`}>
          上側が高い層です。各層の実点をドラッグ、または矢印キーで動かせます。塗りつぶしが実点、中空の丸が一つ上の層からの射影先です。
        </desc>
        <defs>
          <marker
            id={`${id}-arrow`}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path
              d="M 1 1 L 6 4 L 1 7"
              fill="none"
              stroke="#80b4df"
              strokeWidth="1.5"
            />
          </marker>
        </defs>
        <text className="il-svg-overline" x="24" y="21">
          ABSTRACTION
        </text>
        <text className="il-svg-small" x="560" y="21" textAnchor="end">
          共通の座標目盛
        </text>
        {layers.map((layer, index) => (
          <g
            key={`domain-${layer.id}`}
            className={`il-domain${active("layers")}`}
          >
            <text className="il-layer-label" x="24" y={y(index) + 5}>
              TCZ
              <tspan baselineShift="sub" fontSize="10">
                {layer.id}
              </tspan>
            </text>
            <rect
              className="il-domain-fill"
              x={x(layer.min)}
              y={y(index) - 13}
              width={x(layer.max) - x(layer.min)}
              height="26"
              rx="13"
            />
            <line
              className="il-domain-axis"
              x1={x(layer.min)}
              y1={y(index)}
              x2={x(layer.max)}
              y2={y(index)}
            />
            {[layer.min, layer.center, layer.max].map((tick, tickIndex) => (
              <g key={tickIndex}>
                <line
                  className="il-domain-tick"
                  x1={x(tick)}
                  x2={x(tick)}
                  y1={y(index) - 4}
                  y2={y(index) + 4}
                />
                <text
                  className="il-svg-tick"
                  x={x(tick)}
                  y={y(index) + 29}
                  textAnchor="middle"
                >
                  {tick.toFixed(2)}
                </text>
              </g>
            ))}
            <rect
              className="il-drag-track"
              x={x(layer.min)}
              y={y(index) - 18}
              width={x(layer.max) - x(layer.min)}
              height="36"
              rx="18"
              onPointerDown={(event) => startDrag(event, index)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onLostPointerCapture={endDrag}
            />
          </g>
        ))}
        {compareFamily && (
          <g aria-label="履歴Aの固定点の糸">
            <polyline
              className="comparison-thread"
              points={compareFamily.map((v, i) => `${x(v)},${y(i)}`).join(" ")}
            />
            {compareFamily.map((v, i) => (
              <polygon
                key={i}
                className="comparison-point"
                points={`${x(v)},${y(i) - 7} ${x(v) + 7},${y(i)} ${x(v)},${y(i) + 7} ${x(v) - 7},${y(i)}`}
              />
            ))}
          </g>
        )}
        {showFixedPoint && (
          <g
            className={`il-fixed-thread${active("fixed")}`}
            role="button"
            tabIndex={0}
            aria-label="固定点の糸の説明を表示"
            {...select("fixed")}
          >
            <polyline className="il-fixed-line" points={fixedPoints} />
            {layers.map((layer, index) => (
              <g key={layer.id}>
                <circle
                  className="il-fixed-outer"
                  cx={x(toCoordinate(layer, target))}
                  cy={y(index)}
                  r="10"
                />
                <circle
                  className="il-fixed-inner"
                  cx={x(toCoordinate(layer, target))}
                  cy={y(index)}
                  r="5"
                />
              </g>
            ))}
          </g>
        )}
        {layers.slice(1).map((_, offset) => {
          const from = offset + 1;
          const to = offset;
          const projected = project(layers, from, to, family[from]);
          const coherent =
            Math.abs(
              toNormalized(layers[to], projected) -
                toNormalized(layers[to], family[to]),
            ) <= COHERENCE_TOLERANCE;
          return (
            <g key={`connection-${from}`}>
              <g
                className={`il-family-connection ${coherent ? "is-coherent" : "is-incoherent"}${active("coherence")}${active("space")}`}
                role="button"
                tabIndex={0}
                aria-label={`層${layers[from].id}と層${layers[to].id}の${coherent ? "整合" : "不整合"}を確認`}
                {...select("coherence")}
              >
                <line
                  className="il-connection-hit"
                  x1={x(family[from])}
                  y1={y(from)}
                  x2={x(family[to])}
                  y2={y(to)}
                />
                <line
                  className="il-connection-line"
                  x1={x(family[from])}
                  y1={y(from)}
                  x2={x(family[to])}
                  y2={y(to)}
                />
              </g>
              {showProjections && (
                <g
                  className={`il-projection${active("projection")}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`層${layers[from].id}から層${layers[to].id}への射影の説明を表示`}
                  {...select("projection")}
                >
                  <path
                    className="il-projection-hit"
                    d={`M ${x(family[from])} ${y(from) + 9} Q ${x(projected) + 22} ${(y(from) + y(to)) / 2} ${x(projected)} ${y(to) - 9}`}
                  />
                  <path
                    className="il-projection-line"
                    markerEnd={`url(#${id}-arrow)`}
                    d={`M ${x(family[from])} ${y(from) + 9} Q ${x(projected) + 22} ${(y(from) + y(to)) / 2} ${x(projected)} ${y(to) - 9}`}
                  />
                  <circle
                    className="il-projection-point"
                    cx={x(projected)}
                    cy={y(to)}
                    r="8"
                  />
                </g>
              )}
            </g>
          );
        })}
        {layers.map((layer, index) => (
          <g key={`point-${layer.id}`}>
            <circle
              className={`il-state-point${active("layers")}${active("feedback")}`}
              cx={x(family[index])}
              cy={y(index)}
              r="5.5"
              role={readOnly ? undefined : "slider"}
              tabIndex={readOnly ? undefined : 0}
              aria-label={`層${layer.id}の実点`}
              aria-orientation={readOnly ? undefined : "horizontal"}
              aria-valuemin={readOnly ? undefined : layer.min}
              aria-valuemax={readOnly ? undefined : layer.max}
              aria-valuenow={readOnly ? undefined : family[index]}
              aria-valuetext={
                readOnly
                  ? undefined
                  : `座標 ${family[index].toFixed(3)}、正規化座標 ${toNormalized(layer, family[index]).toFixed(3)}`
              }
              onFocus={() => onHighlight("layers")}
              onBlur={() => onHighlight(null)}
              onPointerDown={(event) => startDrag(event, index)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onLostPointerCapture={endDrag}
              onKeyDown={(event) => keyboard(event, index)}
            />
            <text
              className="il-state-value"
              x="611"
              y={y(index) + 4}
              textAnchor="end"
            >
              z = {toNormalized(layer, family[index]).toFixed(2)}
            </text>
          </g>
        ))}
        <text className="il-svg-small" x="24" y={height - 19}>
          高い層から低い層へ射影
        </text>
        <text className="il-svg-small" x="611" y={height - 19} textAnchor="end">
          {readOnly ? "共通座標で比較" : "タップ / ドラッグ / ← →"}
        </text>
      </svg>
      <div className="il-visual-legend" aria-label="図の凡例">
        <span>
          <i className="il-legend-dot" />
          実点
        </span>
        {showProjections && (
          <span>
            <i className="il-legend-dot is-projection" />
            射影先
          </span>
        )}
        <span>
          <i className="il-legend-line is-coherent" />
          整合
        </span>
        <span>
          <i className="il-legend-line is-incoherent" />
          不整合
        </span>
        {showFixedPoint && (
          <span>
            <i className="il-legend-dot is-fixed" />
            固定点
          </span>
        )}
      </div>
    </div>
  );
}
