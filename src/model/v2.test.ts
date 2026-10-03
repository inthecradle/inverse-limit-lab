import { describe, expect, it } from "vitest";
import { historyModel, rebaseFamily } from "./historyModel";
import { conditionCases } from "./conditionExperiments";
import {
  decodeRepresentation,
  encodeRepresentation,
  representationFeedback,
  representationReport,
} from "./representationModel";
import { diagnostics } from "./diagnostics";
import { coherentFamily } from "./inverseLimitModel";
import {
  createInitialFamily,
  createLayers,
  project,
  toCoordinate,
  toNormalized,
} from "./inverseSystem";
import { feedbackCoordinate, iterateFeedback } from "./selfFeedback";

describe("history-dependent finite systems", () => {
  it("recovers the original system at zero and keeps valid intervals and interior targets", () => {
    expect(historyModel(0).layers).toEqual(createLayers());
    expect(historyModel(0).q).toBe(0.2);
    for (const h of [-1, -0.7, 0, 0.7, 1]) {
      for (const count of [2, 6, 12]) {
        const { layers, q } = historyModel(h, count);
        expect(Math.abs(q)).toBeLessThan(1);
        for (const layer of layers) expect(layer.radius).toBeGreaterThan(0);
        for (const z of [-1, -0.42, 0, 1]) {
          expect(diagnostics(layers, coherentFamily(layers, z)).coherent).toBe(
            true,
          );
          for (let gamma = 1; gamma < count; gamma += 1) {
            const x = toCoordinate(layers[gamma], z);
            const direct = project(layers, gamma, 0, x);
            const via = project(
              layers,
              gamma - 1,
              0,
              project(layers, gamma, gamma - 1, x),
            );
            expect(direct).toBeCloseTo(via, 12);
          }
        }
      }
    }
    for (const h of [-2, 2, NaN, Infinity])
      expect(() => historyModel(h)).toThrow();
  });

  it("rebases normalized states without removing their inconsistency", () => {
    const a = historyModel(-0.7);
    const b = historyModel(0.7);
    const original = createInitialFamily(a.layers);
    const saved = [...original];
    const rebased = rebaseFamily(a.layers, original, b.layers);
    expect(original).toEqual(saved);
    expect(diagnostics(b.layers, rebased).coherent).toBe(false);
    for (let i = 0; i < original.length; i += 1)
      expect(toNormalized(b.layers[i], rebased[i])).toBeCloseTo(
        toNormalized(a.layers[i], original[i]),
        12,
      );
    const roundTrip = rebaseFamily(b.layers, rebased, a.layers);
    roundTrip.forEach((value, index) =>
      expect(value).toBeCloseTo(original[index], 12),
    );
    expect(() =>
      rebaseFamily(a.layers, original, historyModel(0, 3).layers),
    ).toThrow();
  });

  it("changes both the represented interval and the limiting fixed point", () => {
    const a = historyModel(-0.7);
    const b = historyModel(0.7);
    expect(a.layers[0].min).not.toBe(b.layers[0].min);
    expect(a.q).not.toBe(b.q);
    for (const system of [a, b]) {
      const last = iterateFeedback(
        system.layers,
        coherentFamily(system.layers, -1),
        0.5,
        40,
        system.q,
      ).at(-1)!;
      expect(last.z).toBeCloseTo(system.q, 10);
      last.family.forEach((value, i) =>
        expect(value).toBeCloseTo(
          system.layers[i].center + system.layers[i].radius * system.q,
          10,
        ),
      );
    }
  });
});

describe("explicit internal representation", () => {
  it("decodes faithful pairs and rejects pairs outside the representation space", () => {
    for (const z of [-1, -0.7, 0, 0.2, 1])
      expect(decodeRepresentation(encodeRepresentation(z))).toBe(z);
    for (const pair of [
      [0.2, 0.9],
      [2, 4],
      [0, NaN],
    ] as [number, number][])
      expect(() => decodeRepresentation(pair)).toThrow();
  });

  it("commutes with feedback across histories, contraction and expansion", () => {
    for (const h of [-1, 0, 1]) {
      const { layers, q } = historyModel(h);
      for (const rate of [0, 0.5, 0.99, 1, 1.2]) {
        for (const z of [-1, -0.25, 0, 0.2, q, 1]) {
          const firstUpdate = encodeRepresentation(
            feedbackCoordinate(z, rate, q),
          );
          const firstRepresent = representationFeedback(
            encodeRepresentation(z),
            rate,
            q,
          );
          expect(firstRepresent).toEqual(firstUpdate);
          const report = representationReport(
            layers,
            coherentFamily(layers, z),
            rate,
            q,
            "faithful",
          );
          expect(report.faithful).toBe(true);
          expect(report.equivariant).toBe(true);
          expect(report.selfRepresenting).toBe(report.isFixed);
        }
      }
    }
  });

  it("distinguishes a fixed point from the existence and fidelity of its representation", () => {
    const { layers, q } = historyModel(0);
    const fixed = coherentFamily(layers, q);
    expect(
      representationReport(layers, fixed, 0.5, q, "faithful"),
    ).toMatchObject({
      isFixed: true,
      faithful: true,
      selfRepresenting: true,
      representationFixed: true,
    });
    expect(representationReport(layers, fixed, 0.5, q, "absent")).toMatchObject(
      {
        represented: null,
        isFixed: true,
        faithful: false,
        selfRepresenting: false,
      },
    );
    expect(
      representationReport(layers, fixed, 0.5, q, "mismatch"),
    ).toMatchObject({
      isFixed: true,
      faithful: false,
      selfRepresenting: false,
    });
    for (const z of [-1, 0, 0.5, 1]) {
      const report = representationReport(
        layers,
        coherentFamily(layers, z),
        1,
        q,
        "mismatch",
      );
      expect(report.fidelityError).toBeGreaterThanOrEqual(0.25 - 1e-12);
      expect(report.isFixed).toBe(true);
      expect(report.representationFixed).toBe(true);
      expect(report.equivariant).toBe(true); // Identity commutes even with an unfaithful description.
      expect(report.selfRepresenting).toBe(false);
    }
  });

  it("does not describe an incoherent family as a self-representing fixed point", () => {
    const { layers, q } = historyModel(0);
    expect(
      representationReport(
        layers,
        createInitialFamily(layers),
        1,
        q,
        "faithful",
      ),
    ).toMatchObject({
      isFixed: false,
      faithful: false,
      selfRepresenting: false,
    });
  });
});

describe("condition countermodels", () => {
  const example = (id: string) =>
    conditionCases.find((item) => item.id === id)!;

  it("distinguishes a broken composition law from an empty coherent space", () => {
    expect(example("composition").evaluate(0).gap).toBeCloseTo(0.3, 12);
    expect(example("composition").evaluate(0.6).gap).toBeCloseTo(0, 12);
    expect(example("finiteCompatibility").evaluate(0).gap).toBeCloseTo(0.8, 12);
    expect(example("empty").evaluate(0)).toEqual({ a: 0, b: 1, gap: 1 });
  });

  it("exhibits fixed-point-free maps with exactly the documented missing hypotheses", () => {
    for (const z of [-1, -0.01, 0, 0.01, 1]) {
      expect(example("noncompact").evaluate(z).gap).toBeCloseTo(1, 12);
      const outside = example("outsideSelfMap").evaluate(z);
      expect(outside.b).toBeGreaterThan(1);
      expect(outside.gap).toBeCloseTo(3, 12);
      const discontinuous = example("discontinuousFeedback").evaluate(z);
      expect(Math.abs(discontinuous.b)).toBe(1);
      expect(discontinuous.gap).toBeGreaterThanOrEqual(1);
    }
    expect(example("discontinuousFeedback").evaluate(-1).b).toBe(1);
    expect(example("discontinuousFeedback").evaluate(1).b).toBe(-1);
    expect(example("discontinuousProjection").evaluate(0).gap).toBe(2);
  });

  it("provides finite witnesses and refuses invalid probes for every experiment", () => {
    expect(new Set(conditionCases.map(({ id }) => id)).size).toBe(7);
    for (const item of conditionCases) {
      for (const z of [-1, 0, 1]) {
        const result = item.evaluate(z);
        expect(result.gap).toBe(Math.abs(result.a - result.b));
      }
      for (const z of [-2, 2, NaN]) expect(() => item.evaluate(z)).toThrow();
    }
  });
});
