/** Finite educational inverse system. Layer indices increase with abstraction. */
export interface Layer {
  id: number;
  center: number;
  radius: number;
  min: number;
  max: number;
}

export type Family = number[];
export const COHERENCE_TOLERANCE = 1e-8;

export function clamp(value: number, min = -1, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function checkLayerCount(count: number): void {
  if (!Number.isInteger(count) || count < 2 || count > 12) {
    throw new RangeError("The finite model supports 2–12 layers.");
  }
}

export function createLayers(count = 6): Layer[] {
  checkLayerCount(count);
  return Array.from({ length: count }, (_, id) => {
    const center = 0.18 * Math.sin(id * 1.7);
    const radius = 1 - 0.045 * id;
    return { id, center, radius, min: center - radius, max: center + radius };
  });
}

export function toCoordinate(layer: Layer, z: number): number {
  return layer.center + layer.radius * z;
}

export function toNormalized(layer: Layer, value: number): number {
  return (value - layer.center) / layer.radius;
}

/** π_{to←from}: preserve the common coordinate z. No clipping is needed. */
export function project(
  layers: Layer[],
  from: number,
  to: number,
  value: number,
): number {
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    !layers[from] ||
    !layers[to] ||
    from < to
  ) {
    throw new RangeError(
      "A projection requires existing layers with to ≤ from.",
    );
  }
  return toCoordinate(layers[to], toNormalized(layers[from], value));
}

export function assertFamily(layers: Layer[], family: Family): void {
  if (family.length !== layers.length || layers.length < 2) {
    throw new RangeError("A family must contain one state for every layer.");
  }
  family.forEach((value, index) => {
    const z = toNormalized(layers[index], value);
    if (!Number.isFinite(z) || Math.abs(z) > 1 + COHERENCE_TOLERANCE) {
      throw new RangeError(
        "Layer states must belong to their compact intervals.",
      );
    }
  });
}

export function createInitialFamily(layers: Layer[]): Family {
  const coordinates = [
    -0.64, 0.48, -0.28, 0.7, -0.45, 0.58, -0.1, 0.32, -0.72, 0.8, -0.38, 0.18,
  ];
  return layers.map((layer, index) =>
    toCoordinate(layer, coordinates[index % coordinates.length]),
  );
}
