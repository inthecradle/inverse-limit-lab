import {
  assertFamily,
  clamp,
  createLayers,
  toCoordinate,
  toNormalized,
} from "./inverseSystem";
import type { Family, Layer } from "./inverseSystem";

/** SC is the entire collection { (c_i + r_i z)_i : −1 ≤ z ≤ 1 }. */
export function coherentFamily(layers: Layer[], z: number): Family {
  if (!Number.isFinite(z) || z < -1 || z > 1)
    throw new RangeError("A thread coordinate must lie in [−1, 1].");
  return layers.map((layer) => toCoordinate(layer, z));
}

/** Demo reconciliation, distinct from F_SC. The highest layer is the anchor. */
export function reconcile(layers: Layer[], family: Family): Family {
  assertFamily(layers, family);
  const top = layers.length - 1;
  return coherentFamily(layers, clamp(toNormalized(layers[top], family[top])));
}

/** Preserve existing layer states. New layers extend the highest existing state. */
export function resizeSystem(
  layers: Layer[],
  family: Family,
  count: number,
): { layers: Layer[]; family: Family } {
  assertFamily(layers, family);
  const defaults = createLayers(count);
  const nextLayers = defaults.map((layer, index) => layers[index] ?? layer);
  const top = layers.length - 1;
  const z = clamp(toNormalized(layers[top], family[top]));
  const nextFamily = nextLayers.map(
    (layer, index) => family[index] ?? toCoordinate(layer, z),
  );
  return { layers: nextLayers, family: nextFamily };
}

/** A finite gallery samples SC; it does not enumerate this uncountable space. */
export function threadCandidates(
  layers: Layer[],
  count = 7,
): { z: number; family: Family }[] {
  if (!Number.isInteger(count) || count < 2)
    throw new RangeError("Use at least two gallery threads.");
  return Array.from({ length: count }, (_, index) => {
    const z = -1 + (2 * index) / (count - 1);
    return { z, family: coherentFamily(layers, z) };
  });
}
