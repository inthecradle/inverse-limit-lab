import { describe, expect, it } from "vitest";
import {
  applyFeedback,
  coherentFamily,
  createInitialFamily,
  createLayers,
  diagnostics,
  familyDistance,
  feedbackConditions,
  feedbackCoordinate,
  iterateFeedback,
  project,
  reconcile,
  resizeSystem,
  threadCandidates,
  toCoordinate,
  toNormalized,
} from "./index";

describe("finite affine inverse system", () => {
  it("has nondegenerate compact intervals for every allowed layer count", () => {
    for (let count = 2; count <= 12; count += 1) {
      const layers = createLayers(count);
      expect(layers).toHaveLength(count);
      for (const layer of layers) {
        expect(layer.radius).toBeGreaterThan(0);
        expect(toCoordinate(layer, -1)).toBe(layer.min);
        expect(toCoordinate(layer, 1)).toBe(layer.max);
        expect(toNormalized(layer, layer.center)).toBe(0);
      }
    }
    for (const count of [1, 13, 2.5, NaN])
      expect(() => createLayers(count)).toThrow();
  });

  it("projects endpoints onto endpoints and preserves the affine coordinate", () => {
    // Hand-selected intervals make this independent of the default layer generator.
    const layers = [
      { id: 0, center: 2, radius: 3, min: -1, max: 5 },
      { id: 1, center: -4, radius: 2, min: -6, max: -2 },
    ];
    expect(project(layers, 1, 0, -6)).toBe(-1);
    expect(project(layers, 1, 0, -2)).toBe(5);
    expect(project(layers, 1, 0, -3)).toBe(3.5);
    expect(() => project(layers, 0, 1, 0)).toThrow();
  });

  it("satisfies identity and every ordered triple composition, including endpoints", () => {
    const layers = createLayers(12);
    for (let gamma = 0; gamma < layers.length; gamma += 1) {
      for (let beta = 0; beta <= gamma; beta += 1) {
        for (let alpha = 0; alpha <= beta; alpha += 1) {
          for (const z of [-1, -0.37, 0, 0.2, 1]) {
            const x = layers[gamma].center + layers[gamma].radius * z;
            const via = project(
              layers,
              beta,
              alpha,
              project(layers, gamma, beta, x),
            );
            const direct = project(layers, gamma, alpha, x);
            expect(via).toBeCloseTo(direct, 12);
            expect(project(layers, gamma, gamma, x)).toBeCloseTo(x, 12);
          }
        }
      }
    }
  });

  it("computes every pair with normalized distances and unweighted squared energy", () => {
    const layers = createLayers(3);
    const family = layers.map(
      (layer, i) => layer.center + layer.radius * [-1, 0, 1][i],
    );
    const result = diagnostics(layers, family);
    result.residuals.forEach(({ error }, index) =>
      expect(error).toBeCloseTo([1, 2, 1][index], 12),
    );
    expect(result.energy).toBeCloseTo(6, 12);
    expect(result.maxError).toBe(2);
    expect(result.coherent).toBe(false);
    expect(
      diagnostics(createLayers(12), createInitialFamily(createLayers(12)))
        .residuals,
    ).toHaveLength(66);
  });

  it("reconciles from the highest layer and does not mutate the original family", () => {
    const layers = createLayers();
    const original = createInitialFamily(layers);
    const saved = [...original];
    const repaired = reconcile(layers, original);
    expect(original).toEqual(saved);
    expect(repaired[5]).toBeCloseTo(original[5], 14);
    expect(diagnostics(layers, repaired).coherent).toBe(true);
    for (let i = 0; i < layers.length; i += 1) {
      expect(toNormalized(layers[i], repaired[i])).toBeCloseTo(0.58, 12);
    }
  });

  it("extends and truncates coherent threads while retaining old states", () => {
    const layers = createLayers(2);
    const family = coherentFamily(layers, -0.7);
    const expanded = resizeSystem(layers, family, 12);
    expect(expanded.family.slice(0, 2)).toEqual(family);
    expect(diagnostics(expanded.layers, expanded.family).coherent).toBe(true);
    const truncated = resizeSystem(expanded.layers, expanded.family, 3);
    expect(truncated.family).toEqual(expanded.family.slice(0, 3));
    expect(diagnostics(truncated.layers, truncated.family).coherent).toBe(true);
  });

  it("does not silently repair inconsistent states when adding layers", () => {
    const layers = createLayers(3);
    const family = createInitialFamily(layers);
    const expanded = resizeSystem(layers, family, 8);
    expect(expanded.family.slice(0, 3)).toEqual(family);
    expect(diagnostics(expanded.layers, expanded.family).coherent).toBe(false);
  });

  it("samples multiple coherent elements of SC and uses the normalized sup metric", () => {
    const layers = createLayers();
    const candidates = threadCandidates(layers);
    expect(candidates).toHaveLength(7);
    for (const { family } of candidates)
      expect(diagnostics(layers, family).coherent).toBe(true);
    expect(
      familyDistance(layers, candidates[0].family, candidates[6].family),
    ).toBeCloseTo(2, 12);
    expect(
      familyDistance(
        layers,
        coherentFamily(layers, -0.2),
        coherentFamily(layers, 0.6),
      ),
    ).toBeCloseTo(0.8, 12);
  });
});

describe("continuous self-feedback and contraction", () => {
  it("keeps the interval invariant and is L-Lipschitz even above one", () => {
    for (const L of [0, 0.2, 0.8, 0.99, 1, 1.1, 1.2]) {
      for (let i = 0; i <= 20; i += 1) {
        const z = -1 + i / 10;
        const image = feedbackCoordinate(z, L);
        expect(image).toBeGreaterThanOrEqual(-1);
        expect(image).toBeLessThanOrEqual(1);
        for (let j = 0; j <= 20; j += 1) {
          const w = -1 + j / 10;
          expect(
            Math.abs(image - feedbackCoordinate(w, L)),
          ).toBeLessThanOrEqual(L * Math.abs(z - w) + 1e-12);
        }
      }
    }
  });

  it("maps whole coherent families into SC and rejects families outside SC", () => {
    const layers = createLayers();
    for (const L of [0, 0.8, 1, 1.2]) {
      const next = applyFeedback(layers, coherentFamily(layers, -0.7), L);
      expect(diagnostics(layers, next).coherent).toBe(true);
    }
    expect(() =>
      applyFeedback(layers, createInitialFamily(layers), 0.5),
    ).toThrow(/Reconcile/);
  });

  it("matches the independent geometric solution and upper bound under contraction", () => {
    const layers = createLayers(12);
    for (const L of [0.2, 0.5, 0.8, 0.99]) {
      const samples = iterateFeedback(
        layers,
        coherentFamily(layers, -0.9),
        L,
        50,
      );
      for (const sample of samples) {
        const expectedDistance = 1.1 * L ** sample.iteration;
        expect(sample.z).toBeCloseTo(0.2 - expectedDistance, 12);
        expect(sample.distance).toBeCloseTo(expectedDistance, 12);
        expect(sample.upperBound).toBeCloseTo(expectedDistance, 12);
        expect(sample.distance).toBeLessThanOrEqual(sample.upperBound! + 1e-12);
      }
    }
  });

  it("L = 0 reaches q in one step with a valid zeroth upper bound", () => {
    const layers = createLayers();
    const samples = iterateFeedback(layers, coherentFamily(layers, -1), 0, 3);
    expect(samples[0].upperBound).toBeCloseTo(1.2, 12);
    for (const sample of samples.slice(1)) {
      expect(sample.z).toBeCloseTo(0.2, 12);
      expect(sample.distance).toBeCloseTo(0, 12);
      expect(sample.upperBound).toBe(0);
    }
    expect(feedbackConditions(0).unique).toBe(true);
  });

  it("L = 1 is the identity, so all threads are fixed and existence is retained", () => {
    for (const z of [-1, -0.7, 0, 0.2, 0.63, 1])
      expect(feedbackCoordinate(z, 1)).toBe(z);
    expect(feedbackConditions(1)).toMatchObject({
      fixedPointExists: true,
      selfMapValid: true,
      contraction: false,
      unique: false,
      fixedPointKind: "all",
    });
    const layers = createLayers();
    const samples = iterateFeedback(layers, coherentFamily(layers, -0.7), 1, 5);
    for (const sample of samples) {
      expect(sample.distance).toBeCloseTo(0.9, 12);
      expect(sample.upperBound).toBeNull();
    }
  });

  it("L = 1.2 has three fixed points and can move away from q toward endpoints", () => {
    for (const z of [-1, 0.2, 1]) expect(feedbackCoordinate(z, 1.2)).toBe(z);
    expect(feedbackCoordinate(0.5, 1.2)).toBeCloseTo(0.56, 12);
    expect(feedbackCoordinate(-0.5, 1.2)).toBeCloseTo(-0.64, 12);
    expect(feedbackConditions(1.2)).toMatchObject({
      fixedPointExists: true,
      selfMapValid: true,
      unique: false,
      fixedPointKind: "three",
    });
    const layers = createLayers();
    const samples = iterateFeedback(
      layers,
      coherentFamily(layers, 0.5),
      1.2,
      20,
    );
    expect(samples.at(-1)!.z).toBe(1);
    expect(samples.at(-1)!.distance).toBeCloseTo(0.8, 12);
    expect(samples.every(({ upperBound }) => upperBound === null)).toBe(true);
  });

  it("rejects invalid parameters instead of reporting false model guarantees", () => {
    for (const L of [-0.1, 1.3, NaN, Infinity])
      expect(() => feedbackConditions(L)).toThrow();
    expect(() => feedbackCoordinate(2, 0.5)).toThrow();
    expect(() => feedbackCoordinate(0, 0.5, 1)).toThrow();
    expect(() => coherentFamily(createLayers(), NaN)).toThrow();
  });
});
