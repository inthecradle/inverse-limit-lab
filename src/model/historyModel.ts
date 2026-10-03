import {
  assertFamily,
  clamp,
  createLayers,
  toCoordinate,
  toNormalized,
} from "./inverseSystem";
import type { Family, Layer } from "./inverseSystem";

/** An illustrative parameterized family, not an empirical model of personal history. */
export function historyModel(history: number, count = 6) {
  if (!Number.isFinite(history) || Math.abs(history) > 1)
    throw new RangeError("History must lie in [−1, 1].");
  const layers = createLayers(count).map((layer) => {
    const center = layer.center + history * (0.16 + 0.025 * layer.id);
    const radius = layer.radius * (1 + 0.18 * history);
    return {
      ...layer,
      center,
      radius,
      min: center - radius,
      max: center + radius,
    };
  });
  return { layers, q: 0.2 + 0.45 * history, history };
}

/** Carry the same normalized states into another history; never reconcile them. */
export function rebaseFamily(
  oldLayers: Layer[],
  family: Family,
  newLayers: Layer[],
): Family {
  assertFamily(oldLayers, family);
  if (newLayers.length !== oldLayers.length)
    throw new RangeError("Rebasing requires the same number of layers.");
  const result = newLayers.map((layer, index) =>
    toCoordinate(layer, clamp(toNormalized(oldLayers[index], family[index]))),
  );
  assertFamily(newLayers, result);
  return result;
}
