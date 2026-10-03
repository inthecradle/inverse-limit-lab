import { diagnostics, familyDistance } from "./diagnostics";
import { coherentFamily } from "./inverseLimitModel";
import { clamp, toNormalized } from "./inverseSystem";
import type { Family, Layer } from "./inverseSystem";

export const DEFAULT_TARGET = 0.2;

function validateFeedback(L: number, q: number): void {
  if (!Number.isFinite(L) || L < 0 || L > 1.2)
    throw new RangeError("L must lie in [0, 1.2].");
  if (!Number.isFinite(q) || q <= -1 || q >= 1)
    throw new RangeError("The target q must be interior to [−1, 1].");
}

/** Continuous interval self-map even for L > 1. Clipping is 1-Lipschitz. */
export function feedbackCoordinate(
  z: number,
  L: number,
  q = DEFAULT_TARGET,
): number {
  validateFeedback(L, q);
  if (!Number.isFinite(z) || z < -1 || z > 1)
    throw new RangeError("Feedback requires z in [−1, 1].");
  if (L === 1) return z;
  return clamp(q + L * (z - q));
}

/** F_SC is defined on coherent families only; it does not perform reconciliation. */
export function applyFeedback(
  layers: Layer[],
  family: Family,
  L: number,
  q = DEFAULT_TARGET,
): Family {
  if (!diagnostics(layers, family).coherent)
    throw new RangeError("Reconcile the family before applying F_SC.");
  const top = layers.length - 1;
  const z = clamp(toNormalized(layers[top], family[top]));
  return coherentFamily(layers, feedbackCoordinate(z, L, q));
}

export interface IterationSample {
  iteration: number;
  family: Family;
  z: number;
  /** Distance to the distinguished fixed point q, not to the nearest fixed point. */
  distance: number;
  /** Only shown under the contraction hypothesis. Includes n = 0 and L = 0. */
  upperBound: number | null;
}

export function iterateFeedback(
  layers: Layer[],
  initial: Family,
  L: number,
  steps: number,
  q = DEFAULT_TARGET,
): IterationSample[] {
  validateFeedback(L, q);
  if (!Number.isInteger(steps) || steps < 0)
    throw new RangeError("Iteration count must be a nonnegative integer.");
  if (!diagnostics(layers, initial).coherent)
    throw new RangeError("Iteration must start in SC.");
  const target = coherentFamily(layers, q);
  const initialDistance = familyDistance(layers, initial, target);
  let current = [...initial];
  return Array.from({ length: steps + 1 }, (_, iteration) => {
    if (iteration > 0) current = applyFeedback(layers, current, L, q);
    return {
      iteration,
      family: current,
      z: clamp(
        toNormalized(layers[layers.length - 1], current[current.length - 1]),
      ),
      distance: familyDistance(layers, current, target),
      upperBound: L < 1 ? L ** iteration * initialDistance : null,
    };
  });
}

/** These are guarantees for this explicit compact, convex interval model. */
export function feedbackConditions(L: number) {
  validateFeedback(L, DEFAULT_TARGET);
  return {
    selfMapValid: true,
    continuous: true,
    fixedPointExists: true,
    contraction: L < 1,
    unique: L < 1,
    // L = 1 is the identity; L > 1 has exactly −1, q, +1 as fixed points.
    fixedPointKind: (L < 1 ? "unique" : L === 1 ? "all" : "three") as
      "unique" | "all" | "three",
  };
}
