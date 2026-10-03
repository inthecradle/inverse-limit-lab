import { useId } from "react";
import { toNormalized, type Layer, type Family } from "../model";

export function RepresentationView({
  layers,
  family,
  represented,
  faithful,
  highlight,
}: {
  layers: Layer[];
  family: Family;
  represented: [number, number] | null;
  faithful: boolean;
  highlight: boolean;
}) {
  const id = useId();
  const z = toNormalized(layers[layers.length - 1], family[family.length - 1]);
  return (
    <div className={`representation-view ${highlight ? "linked" : ""}`}>
      <svg viewBox="0 0 420 180" role="img" aria-labelledby={id}>
        <title id={id}>
          {represented
            ? faithful
              ? "多層の状態族を忠実に表す内部表象"
              : "実際の状態と対応しない内部表象"
            : "多層の状態族のみ。自己表象は未追加"}
        </title>
        <text x="78" y="20" textAnchor="middle">
          状態族 S
        </text>
        {layers.map((_, i) => (
          <line
            key={i}
            x1="28"
            x2="130"
            y1={40 + (i * 80) / (layers.length - 1)}
            y2={40 + (i * 80) / (layers.length - 1)}
            className="rep-layer"
          />
        ))}
        <polyline
          points={family
            .map(
              (v, i) => `${78 + v * 30},${40 + (i * 80) / (layers.length - 1)}`,
            )
            .join(" ")}
          fill="none"
          stroke="#65e6d0"
          strokeWidth="3"
        />
        <text x="78" y="151" textAnchor="middle">
          最上層 z = {z.toFixed(2)}
        </text>
        <path
          d="M148 65H267l-8-5m8 5-8 5"
          className="rep-arrow"
          opacity={represented ? 1 : 0.25}
        />
        <text x="206" y="54" textAnchor="middle">
          M
        </text>
        <path
          d="M316 42l38 38-38 38-38-38z"
          className={
            represented
              ? faithful
                ? "rep-symbol faithful"
                : "rep-symbol mismatch"
              : "rep-symbol absent"
          }
        />
        <text x="316" y="20" textAnchor="middle">
          内部表象 M(S)
        </text>
        <text x="316" y="151" textAnchor="middle">
          {represented
            ? `(${represented[0].toFixed(2)}, ${represented[1].toFixed(2)})`
            : "未追加"}
        </text>
        {represented && (
          <>
            <path
              d="M267 106H148l8-5m-8 5 8 5"
              className={`rep-arrow ${faithful ? "" : "mismatch"}`}
            />
            <text x="206" y="133" textAnchor="middle">
              {faithful ? "この状態を指す" : "対応が不一致"}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
