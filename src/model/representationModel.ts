import { diagnostics } from "./diagnostics";
import { COHERENCE_TOLERANCE, clamp, toNormalized } from "./inverseSystem";
import type { Family, Layer } from "./inverseSystem";
import { feedbackCoordinate } from "./selfFeedback";

export type Representation = [number, number];
export type RepresentationMode = "faithful" | "absent" | "mismatch";

/** Rep = {(z,z²): z ∈ [−1,1]}; decoding the first coordinate recovers a thread. */
export function encodeRepresentation(z: number): Representation {
  if (!Number.isFinite(z) || Math.abs(z) > 1)
    throw new RangeError("Representation requires z in [−1, 1].");
  return [z, z * z];
}

export function decodeRepresentation(representation: Representation): number {
  const [z, square] = representation;
  encodeRepresentation(z);
  if (
    !Number.isFinite(square) ||
    Math.abs(square - z * z) > COHERENCE_TOLERANCE
  )
    throw new RangeError("The pair does not belong to Rep.");
  return z;
}

/** F_Rep(M(z)) = M(f(z)) is an identity for every z, not a sampled assertion. */
export function representationFeedback(
  representation: Representation,
  rate: number,
  q: number,
): Representation {
  return encodeRepresentation(
    feedbackCoordinate(decodeRepresentation(representation), rate, q),
  );
}

function represent(z: number, mode: RepresentationMode): Representation | null {
  if (mode === "absent") return null;
  // Deliberately describes another valid thread; the mismatch never vanishes at an endpoint.
  return encodeRepresentation(
    mode === "mismatch" ? z + (z <= 0 ? 0.25 : -0.25) : z,
  );
}

function distance(a: Representation, b: Representation) {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
}

/** Diagnostics at the current state. Only faithful mode has global equivariance by construction. */
export function representationReport(
  layers: Layer[],
  family: Family,
  rate: number,
  q: number,
  mode: RepresentationMode,
) {
  const coherent = diagnostics(layers, family).coherent;
  const top = layers.length - 1;
  const z = clamp(toNormalized(layers[top], family[top]));
  const next = feedbackCoordinate(z, rate, q);
  const expected = encodeRepresentation(z);
  const represented = represent(z, mode);
  const nextRepresentation = represented
    ? representationFeedback(represented, rate, q)
    : null;
  const representedNext = represent(next, mode);
  const fidelityError = represented ? distance(represented, expected) : null;
  const equivarianceError =
    nextRepresentation && representedNext
      ? distance(nextRepresentation, representedNext)
      : null;
  const faithful =
    coherent && fidelityError !== null && fidelityError <= COHERENCE_TOLERANCE;
  const equivariant =
    coherent &&
    equivarianceError !== null &&
    equivarianceError <= COHERENCE_TOLERANCE;
  const isFixed = coherent && Math.abs(next - z) <= COHERENCE_TOLERANCE;
  const representationFixed =
    !!represented &&
    !!nextRepresentation &&
    distance(represented, nextRepresentation) <= COHERENCE_TOLERANCE;
  const selfRepresenting =
    isFixed && faithful && equivariant && representationFixed;
  const status = !coherent
    ? "先に層を整合させてください。"
    : mode === "absent"
      ? "表象を外しています。固定点の有無は変わりません。"
      : !faithful
        ? "表象は別の糸を指しています。"
        : selfRepresenting
          ? "固定点と、それを指す表象がともに保たれています。"
          : "表象は現在の糸を指しています。固定点への移動を観察できます。";
  return {
    represented,
    expected,
    decoded: represented?.[0] ?? null,
    faithful,
    equivariant,
    isFixed,
    representationFixed,
    selfRepresenting,
    fidelityError,
    equivarianceError,
    status,
  };
}
