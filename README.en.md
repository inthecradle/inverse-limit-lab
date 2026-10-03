# INVERSE LIMIT LAB

**Cognitive Dynamics Series · THEOREM 16**

[日本語](README.md) | English

[**Open the app**](https://inthecradle.github.io/inverse-limit-lab/) · [GitHub repository](https://github.com/inthecradle/inverse-limit-lab)

An educational web app for exploring fixed points, self-representation, and changes associated with history by moving points across layers and checking projection consistency. Built with React, TypeScript, SVG, and KaTeX, its four tabs let you run one experiment at a time, including on a smartphone.

The app's user interface is in Japanese. This README provides English explanations of its controls and mathematical model.

## Contents

- [Getting started](#getting-started)
- [Controls](#controls)
- [Mathematical model](#mathematical-model)
- [Verification](#verification)
- [File structure](#file-structure)
- [Published site and updates](#published-site-and-updates)
- [Series and deployment](#series-and-deployment)
- [Source and scope](#source-and-scope)

## Getting started

Use Node.js 22.12 or later. Run these commands from the repository root:

```bash
npm ci
npm run dev
```

Open [http://127.0.0.1:5176/](http://127.0.0.1:5176/). Once dependencies have been installed, the app does not need an external CDN connection at runtime.

```bash
npm run build
npm run preview
```

The production output is `dist/`. See [Series and deployment](#series-and-deployment) for hosting information.

## Controls

| Tab                                 | Main interactions                                                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **つなぐ — Connect**                | Move points, observe discrepancies from their projected positions, and restore consistency using the point in the highest layer as the reference.            |
| **落ち着く — Settle**               | Iterate a coherent family and explore the contraction factor `L ∈ [0,1.2]` and distance to a fixed point.                                                    |
| **自分を表す — Represent yourself** | View the current thread beside its representation and compare a faithful representation, no representation, and a representation pointing to another thread. |
| **履歴を変える — Change history**   | Adjust history B relative to history A and compare changes in layer intervals and fixed points on shared coordinates.                                        |

The main screen focuses on diagrams, brief results, and primary controls. Condition settings, a gallery of seven threads, the distance graph, all-pairs diagnostics, formulas and sources, and the proof guide open in dialogs when needed. Experiment state persists across tabs. Opening a dialog pauses iteration in the main experiment.

The initial configuration has six layers. Move points by tapping, dragging, or using the arrow keys. Home/End move to interval endpoints, and Shift + arrow keys use larger steps. Hollow points show projected positions; solid lines indicate consistency and dashed lines indicate inconsistency. Choose 2, 3, 4, 6, 8, or 12 layers. Adding layers preserves coordinates in existing layers. The history comparison diagram is read-only.

Iteration supports single steps and playback at 600 ms intervals. It cannot start from an inconsistent family. Changing the contraction factor returns to the starting point, allowing comparisons from the same initial state. `L=1` gives the identity map; `L>1` provides an example with multiple fixed points.

The Proof Engine is an 11-step learning guide with Previous/Next navigation, a diagram of dependencies among conditions, and five multiple-choice fill-in-the-blank questions. Returning to the relevant tab with 「図で確かめる」 (Check in the diagram) preserves the highlighting. It distinguishes nonemptiness, fixed-point existence, uniqueness and convergence of iteration, and the additional conditions for self-representation. It is a learning guide, not an automated proof system or formal verification tool.

「条件を変える」 (Change conditions) offers seven examples involving an empty set, noncompactness, a discontinuous projection, the projection composition law, finite consistency, the self-map property, and a discontinuous update. These are independent mathematical examples that do not modify the main model. Each distinguishes guarantees that are lost from conclusions that actually hold in that example.

## Mathematical model

For layer `α`, set `c_α = 0.18 sin(1.7α)` and `r_α = 1 − 0.045α`, and define the interval `TCZ_α = [c_α−r_α,c_α+r_α]`. A state is `x_α = c_α + r_α z_α`.

```text
π_{α←β}(x) = c_α + (r_α/r_β)(x − c_β)
SC_N = {(c_α + r_α z)_{α=0}^{N−1} : z ∈ [−1,1]}
e_{αβ} = |π_{α←β}(x_β) − x_α| / r_α
E_coh = Σ_{α<β} e_{αβ}²
d(S,T) = max_α |z_α(S) − z_α(T)|
```

The projections are continuous affine surjections that preserve normalized coordinates and satisfy the identity and composition laws. In this finite model, `SC_N` is a nonempty compact convex set isomorphic to a closed interval. Behavior observed in finite models is not treated as a numerical proof of existence for a general infinite inverse limit. `E_coh` is a diagnostic quantity for this educational model, not a central formula in the source paper.

Feedback acts on the shared coordinate, with `q=0.2`:

```text
f(z) = clip(q + L(z−q), −1, 1)
F_SC_N((c_α + r_α z)_α) = (c_α + r_α f(z))_α
```

| L           | Fixed points | Guarantees                                             |
| ----------- | ------------ | ------------------------------------------------------ |
| 0 ≤ L < 1   | Only z = q   | Uniqueness and convergence of iteration, d_n = L^n d_0 |
| L = 1       | Every z      | Existence, without uniqueness                          |
| 1 < L ≤ 1.2 | z = −1, q, 1 | Existence, without uniqueness                          |

Clipping preserves a continuous self-map of the interval for every L. The distance to `q` is shown even when the map is not a contraction, but no decay upper bound is shown in that case. When an iteration reaches a boundary fixed point, its distance to `q` does not become zero.

Consistency is determined by a maximum normalized error `≤ 1e−8`. Playback stops when the distance in the contraction case is `< 1e−6`, the change in one step is `< 1e−9`, or 200 iterations have been reached. Stopping at finite precision is not treated as a numerical proof of an exact fixed point.

### Self-representation

For this educational model, define the representation space as `Rep = {(z,z²) : z ∈ [−1,1]}` and the map as `M(z) = (z,z²)`. The representation is faithful because the original thread can be recovered from the first coordinate.

```text
decode(M(z)) = z
F_Rep(M(z)) = M(f(z))
F_Rep ∘ M = M ∘ F_SC_N
```

Compatibility with the update is an identity following from the definitions of the maps. The screen also displays the error at the current point. The self-representation status checks consistency of the family, the fixed-point property, faithfulness, compatibility with the update, and the fixed-point property on the representation side. Removing the representation does not change the fixed points of the main model. The setting that points to another thread represents a different thread with its normalized coordinate shifted by 0.25, dropping the faithfulness condition.

### History comparison

Using `h ∈ [−1,1]` as an educational history parameter, change each layer and the target coordinate as follows:

```text
c_α(h) = c_α + h(0.16 + 0.025α)
r_α(h) = r_α(1 + 0.18h)
q(h) = 0.2 + 0.45h
π^h_{α←β}(x) = c_α(h) + [r_α(h)/r_β(h)](x − c_β(h))
f_h(z) = clip(q(h) + 0.65(z−q(h)), −1, 1)
S*_h = (c_α(h) + r_α(h)q(h))_α
```

For each history, the intervals remain nonempty and compact, and projections preserve normalized coordinates. History comparison uses a separate model fixed at `L=0.65`, preserving the `L` selected in the main experiment. Layers and fixed points for A/B are overlaid on the same coordinate axis so that rescaling does not hide changes. Uniqueness of a fixed point within each history does not mean that different histories share the same fixed point. `h` is not a measurement of a person's real-life history.

## Verification

Run these commands from the repository root:

```bash
npm test
npm run build
npm run test:e2e
npm run format:check
```

Browser tests require Playwright's Chromium. If it is not installed, run `npx playwright install chromium`.

- The 25 model tests cover projections, consistency, and iteration, as well as representation recovery and equivariance, misrepresentation, history-dependent layers, projections and fixed points, and concrete examples where conditions fail.
- Five E2E scenarios run at two viewport widths, desktop and smartphone. They check state retention across four tabs, direct manipulation, dialog opening/closing and focus, iteration and stopping, self-representation, history comparison, condition experiments, the proof guide and fill-in questions, and horizontal layout.
- E2E tests serve the production build at `/inverse-limit-lab/` and also verify asset loading under a subpath.

## File structure

| File                                | Role                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/App.tsx`                       | Four tabs, experiment state, playback, detail dialogs, and explanations of conditions and sources |
| `src/components/LayerStack.tsx`     | SVG layers, projections, threads, and direct manipulation                                         |
| `src/components/DistanceGraph.tsx`  | Distance and theoretical upper bound                                                              |
| `src/components/ProofGuide.tsx`     | 11-step proof guide, dependency diagram, and five fill-in questions                               |
| `src/components/Math.tsx`           | KaTeX formulas                                                                                    |
| `src/components/SeriesChrome.tsx`   | Series header and footer                                                                          |
| `src/model/inverseSystem.ts`        | Intervals and projections                                                                         |
| `src/model/inverseLimitModel.ts`    | Coherent families, consistency restoration, layer-count changes, and candidates                   |
| `src/model/diagnostics.ts`          | All-pairs residuals and distance                                                                  |
| `src/model/selfFeedback.ts`         | Self-map, iteration, and distinctions among conditions                                            |
| `src/model/representationModel.ts`  | Representation, recovery, equivariance, and self-representation diagnostics                       |
| `src/model/historyModel.ts`         | History-dependent layers and target coordinates                                                   |
| `src/model/conditionExperiments.ts` | Seven condition experiments independent of the main model                                         |
| `src/model/model.test.ts`           | Tests for projections, consistency, and iteration                                                 |
| `src/model/v2.test.ts`              | Tests for self-representation, history comparison, and condition experiments                      |
| `tests/lab.spec.ts`                 | Browser integration tests                                                                         |

## Published site and updates

Live site: [INVERSE LIMIT LAB](https://inthecradle.github.io/inverse-limit-lab/)

Repository: [inthecradle/inverse-limit-lab](https://github.com/inthecradle/inverse-limit-lab)

The [GitHub Actions workflow](.github/workflows/pages.yml) runs formatting checks, model tests, the build, and desktop and smartphone browser tests on each push to `main`. After all checks pass, it deploys the generated `dist/` to GitHub Pages. Pull requests run the same validation.

In the publishing repository, set **Settings → Pages → Source** to **GitHub Actions**.

## Series and deployment

| Lab                                                                                | Topic                                                                                             |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [LYAPUNOV LAB](https://inthecradle.github.io/lyapunov-lab/) · THEOREM 01           | Convergence and stability                                                                         |
| [HJB LAB](https://inthecradle.github.io/hjb-lab/) · THEOREM 08                     | Computing the value function and policy backward from terminal conditions, then executing forward |
| [EVOLUTION LAB](https://inthecradle.github.io/evolution-lab/) · THEOREM 12         | Fitness and evolution                                                                             |
| [INVERSE LIMIT LAB](https://inthecradle.github.io/inverse-limit-lab/) · THEOREM 16 | Inverse limits and fixed points                                                                   |

To deploy on GitHub Pages or another static host, serve the contents of `dist/` generated by `npm run build`. Relative asset paths and in-page navigation allow deployment both at a domain root and under a repository subpath.

GitHub Actions builds set `VITE_INVERSE_LIMIT_LAB_URL=https://inthecradle.github.io/inverse-limit-lab/` and `VITE_HJB_LAB_URL=https://inthecradle.github.io/hjb-lab/` for the footer links. To deploy at another URL, change the build-time environment variables.

`node_modules`, `dist`, browser test output, and `.env.local` are excluded by `.gitignore`.

## Source and scope

- Hideto Tomabechi, _苫米地四法印定理――ミニマル13定理版_ (Tomabechi Four Dharma Seals: Minimal 13-Theorem Edition), §7: Theorem 16, its proof, types, and scope. [Public paper (Japanese)](https://tomabechi.jp/TomabechiFourDharmaSealsMini13JA.html)

The app includes self-representation `M`, history comparison, experiments that remove conditions, and a step-by-step proof guide. The concrete formulas for intervals, feedback, representation, and history are educational implementations intended to aid understanding. They are distinguished from the general theorem in the source paper. Constructing a fixed point or its representation is not treated as constructing real self-consciousness.

Created by [CognitiveMind](https://note.com/dawn_of_coaching).
