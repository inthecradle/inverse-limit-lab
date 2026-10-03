import {
  assertFamily,
  COHERENCE_TOLERANCE,
  project,
  toNormalized,
} from "./inverseSystem";
import type { Family, Layer } from "./inverseSystem";

export interface ProjectionResidual {
  from: number;
  to: number;
  projected: number;
  actual: number;
  /** Normalized layer distance |π(x_from) − x_to| / radius_to. */
  error: number;
}

/** Diagnostic only: E_coh = Σ_{to<from} e², with all weights equal to one. */
export function diagnostics(layers: Layer[], family: Family) {
  assertFamily(layers, family);
  const residuals: ProjectionResidual[] = [];
  for (let from = 1; from < layers.length; from += 1) {
    for (let to = 0; to < from; to += 1) {
      const projected = project(layers, from, to, family[from]);
      const actual = family[to];
      residuals.push({
        from,
        to,
        projected,
        actual,
        error: Math.abs(projected - actual) / layers[to].radius,
      });
    }
  }
  const energy = residuals.reduce((sum, item) => sum + item.error ** 2, 0);
  const maxError = Math.max(0, ...residuals.map((item) => item.error));
  return {
    residuals,
    energy,
    maxError,
    coherent: maxError <= COHERENCE_TOLERANCE,
  };
}

/** Sup metric in normalized layer coordinates; on SC this equals |z − w|. */
export function familyDistance(layers: Layer[], a: Family, b: Family): number {
  assertFamily(layers, a);
  assertFamily(layers, b);
  return Math.max(
    ...layers.map((layer, index) =>
      Math.abs(toNormalized(layer, a[index]) - toNormalized(layer, b[index])),
    ),
  );
}
