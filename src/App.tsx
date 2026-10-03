import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { SeriesFooter, SeriesHeader } from "./components/SeriesChrome";
import { LayerStack } from "./components/LayerStack";
import { DistanceGraph } from "./components/DistanceGraph";
import { RepresentationView } from "./components/RepresentationView";
import { ProofGuide } from "./components/ProofGuide";
import { Sheet } from "./components/Sheet";
import { AboutContent } from "./components/AboutContent";
import { Math as Formula } from "./components/Math";
import {
  applyFeedback,
  coherentFamily,
  createInitialFamily,
  createLayers,
  diagnostics,
  familyDistance,
  reconcile,
  resizeSystem,
  threadCandidates,
  toNormalized,
  type Family,
  type Layer,
} from "./model";
import { historyModel } from "./model/historyModel";
import {
  representationReport,
  type RepresentationMode,
} from "./model/representationModel";
import { conditionCases } from "./model/conditionExperiments";

type Chapter = "connect" | "settle" | "represent" | "history";
type Overlay =
  "settings" | "gallery" | "math" | "proof" | "about" | "distance" | null;
type Experiment = {
  layers: Layer[];
  family: Family;
  initial: Family | null;
  distances: number[];
  n: number;
};
const chapters: {
  id: Chapter;
  name: string;
  en: string;
  title: string;
  text: string;
  equation: string;
  focus: string;
}[] = [
  {
    id: "connect",
    name: "つなぐ",
    en: "COHERENCE",
    title: "層を写しても、矛盾しない糸へ。",
    text: "点を動かして、塗り点と射影先の中空点を比べてみましょう。",
    equation: String.raw`\pi_{\alpha\leftarrow\beta}(x_\beta)=x_\alpha`,
    focus: "coherence",
  },
  {
    id: "settle",
    name: "落ち着く",
    en: "FIXED POINT",
    title: "更新しても変わらない糸を探す。",
    text: "反復は糸の全体を更新します。Lを変えると、近づく速さや保証が変わります。",
    equation: String.raw`S_{n+1}=F_{SC}(S_n)`,
    focus: "feedback",
  },
  {
    id: "represent",
    name: "自分を表す",
    en: "REPRESENTATION",
    title: "固定点に、自分を指す表象を加える。",
    text: "状態と、それを表す内部表象を分けて見ます。表象を外しても固定点は残ります。",
    equation: String.raw`M(S^*)\;\text{represents}\;S^*`,
    focus: "representation",
  },
  {
    id: "history",
    name: "履歴を変える",
    en: "HISTORY",
    title: "履歴が変わると、固定点も変わる。",
    text: "履歴Bを動かしてAと比べます。層の集合と、その上の固定点が変化します。",
    equation: String.raw`S^*_{h}\in SC_h`,
    focus: "history",
  },
];
function fresh(): Experiment {
  const layers = createLayers(6);
  return {
    layers,
    family: createInitialFamily(layers),
    initial: null,
    distances: [],
    n: 0,
  };
}
const format = (value: number) =>
  Math.abs(value) < 1e-12
    ? "≈ 0"
    : Math.abs(value) < 1e-4
      ? value.toExponential(2)
      : value.toFixed(4);

export default function App() {
  const [chapter, setChapter] = useState<Chapter>("connect");
  const [experiment, setExperiment] = useState<Experiment>(fresh);
  const [rate, setRate] = useState(0.65);
  const [playing, setPlaying] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [representation, setRepresentation] =
    useState<RepresentationMode>("absent");
  const [historyA, setHistoryA] = useState(-0.7);
  const [historyB, setHistoryB] = useState(0.7);
  const [caseId, setCaseId] = useState("composition");
  const [probe, setProbe] = useState(0);
  const [notice, setNotice] = useState(
    "点はタップ、ドラッグ、矢印キーで動かせます。",
  );
  const { layers, family, n, distances } = experiment;
  const current = chapters.find((item) => item.id === chapter)!;
  const result = diagnostics(layers, family);
  const target = coherentFamily(layers, 0.2);
  const distance = familyDistance(layers, family, target);
  const report = representationReport(
    layers,
    family,
    rate,
    0.2,
    representation,
  );
  const a = historyModel(historyA, layers.length),
    b = historyModel(historyB, layers.length);
  const fixedA = coherentFamily(a.layers, a.q),
    fixedB = coherentFamily(b.layers, b.q);
  const historyEnds = [
    historyModel(-1, layers.length),
    historyModel(1, layers.length),
  ];
  const bounds: [number, number] = [
    Math.min(
      ...historyEnds.flatMap((model) => model.layers.map((layer) => layer.min)),
    ),
    Math.max(
      ...historyEnds.flatMap((model) => model.layers.map((layer) => layer.max)),
    ),
  ];
  const historyDifference = Math.max(
    ...fixedA.map((value, index) => Math.abs(value - fixedB[index])),
  );
  const condition = conditionCases.find((item) => item.id === caseId)!;
  const witness = condition.evaluate(probe);
  const advanceRef = useRef<() => void>(() => {});
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function openSheet(next: Overlay) {
    setPlaying(false);
    setOverlay(next);
  }
  function closeSheet() {
    setOverlay(null);
    if (location.hash === "#about")
      history.replaceState(null, "", location.pathname + location.search);
  }
  function changeChapter(next: Chapter) {
    setPlaying(false);
    setChapter(next);
    setHighlight(null);
    setNotice("");
  }
  function selectFamily(next: Family, message: string) {
    setPlaying(false);
    setRepresentation("absent");
    setExperiment((prev) => ({
      ...prev,
      family: next,
      initial: null,
      distances: [],
      n: 0,
    }));
    setNotice(message);
  }
  function restart() {
    setPlaying(false);
    setRepresentation("absent");
    setExperiment((prev) => ({
      ...prev,
      family: prev.initial ?? prev.family,
      initial: null,
      distances: [],
      n: 0,
    }));
    setNotice("反復の開始点へ戻しました。");
  }
  function changeRate(value: number) {
    setRate(value);
    restart();
    setNotice("同じ開始点から、新しいLで比較できます。");
  }
  function advance() {
    if (!result.coherent || n >= 200) {
      setPlaying(false);
      return;
    }
    const next = applyFeedback(layers, family, rate);
    const movement = familyDistance(layers, next, family);
    const nextDistance = familyDistance(layers, next, target);
    setExperiment((prev) => ({
      ...prev,
      family: next,
      initial: prev.initial ?? [...prev.family],
      n: prev.n + 1,
      distances: [
        ...(prev.distances.length ? prev.distances : [distance]),
        nextDistance,
      ],
    }));
    if (movement < 1e-9 || (rate < 1 && nextDistance < 1e-6) || n + 1 >= 200) {
      setPlaying(false);
      setNotice(
        n + 1 >= 200
          ? "200回で停止しました。開始点へ戻して比較できます。"
          : "変化が数値許容誤差に達したため、停止しました。",
      );
    }
  }
  useEffect(() => {
    advanceRef.current = advance;
  });
  useEffect(() => {
    if (!playing) return;
    let frame = 0,
      last = performance.now();
    const tick = (time: number) => {
      if (time - last >= 600) {
        last = time;
        advanceRef.current();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);
  useEffect(() => {
    const reveal = () => {
      if (location.hash === "#about") {
        setPlaying(false);
        setOverlay("about");
      }
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % chapters.length;
    else if (event.key === "ArrowLeft")
      next = (index + chapters.length - 1) % chapters.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = chapters.length - 1;
    else return;
    event.preventDefault();
    changeChapter(chapters[next].id);
    tabRefs.current[next]?.focus();
  }
  const token = (key: string, tex: string) => (
    <button
      className={`formula-token ${highlight === key ? "active" : ""}`}
      onClick={() => setHighlight(key)}
      onFocus={() => setHighlight(key)}
      aria-pressed={highlight === key}
    >
      <Formula tex={tex} />
    </button>
  );
  const linkedEquations: Record<string, string> = {
    layers: String.raw`x_\alpha\in TCZ_\alpha`,
    projection: String.raw`\pi_{\alpha\leftarrow\beta}:TCZ_\beta\to TCZ_\alpha`,
    coherence: chapters[0].equation,
    space: String.raw`SC_N=\varprojlim_{\alpha<N} TCZ_\alpha`,
    fixed: String.raw`F(S^*)=S^*`,
    feedback: chapters[1].equation,
    contraction: String.raw`d(S_n,S^*)\le L^n d(S_0,S^*)\quad(L<1)`,
    representation: chapters[2].equation,
    history: chapters[3].equation,
  };
  const equationKey =
    highlight && linkedEquations[highlight] ? highlight : current.focus;
  const coherenceText = result.coherent
    ? "✓ 整合した糸"
    : "≠ 整合していない状態族";
  const changeLayerCount = (count: number) => {
    setPlaying(false);
    setRepresentation("absent");
    setExperiment({
      ...resizeSystem(layers, family, count),
      initial: null,
      distances: [],
      n: 0,
    });
    setNotice("既存の層を保って層数を変更しました。");
  };

  return (
    <div className="lab-shell">
      <a className="skip-link" href="#experiment">
        実験へ進む
      </a>
      <SeriesHeader lab="inverse" />
      <main>
        <div className="intro">
          <h1>層をつなぐ、自己を考える。</h1>
          <p>
            第4弾 · 定理16 <span>有限層の教育用モデル</span>
          </p>
        </div>
        <div className="chapter-tabs" role="tablist" aria-label="4つの実験">
          {chapters.map((item, index) => (
            <button
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              id={`tab-${item.id}`}
              key={item.id}
              role="tab"
              aria-selected={chapter === item.id}
              aria-controls="experiment"
              tabIndex={chapter === item.id ? 0 : -1}
              onClick={() => changeChapter(item.id)}
              onKeyDown={(event) => tabKey(event, index)}
            >
              <span>0{index + 1}</span>
              {item.name}
            </button>
          ))}
        </div>
        <section
          id="experiment"
          role="tabpanel"
          aria-labelledby={`tab-${chapter}`}
          tabIndex={0}
        >
          <div className="chapter-heading">
            <p className="eyebrow">{current.en}</p>
            <h2>{current.title}</h2>
            <p>{current.text}</p>
          </div>
          <div className="experiment-layout">
            <div
              className={`panel visual-panel ${highlight === current.focus ? "linked" : ""}`}
            >
              <div className="visual-heading">
                <span>
                  {chapter === "history"
                    ? `履歴B：h = ${historyB.toFixed(2)}`
                    : chapter === "represent"
                      ? "状態と内部表象"
                      : `${layers.length}層の状態族`}
                </span>
                <small>
                  {chapter === "settle" ? (
                    <b data-testid="iteration">n = {n}</b>
                  ) : chapter === "history" ? (
                    `A：h = ${historyA.toFixed(2)}`
                  ) : (
                    "FINITE MODEL"
                  )}
                </small>
              </div>
              {chapter === "represent" ? (
                <RepresentationView
                  layers={layers}
                  family={family}
                  represented={report.represented}
                  faithful={report.faithful}
                  highlight={highlight === "representation"}
                />
              ) : (
                <LayerStack
                  layers={chapter === "history" ? b.layers : layers}
                  family={chapter === "history" ? fixedB : family}
                  showProjections={chapter === "connect"}
                  showFixedPoint={chapter === "settle"}
                  target={chapter === "history" ? b.q : 0.2}
                  readOnly={chapter === "history"}
                  compact
                  compareFamily={chapter === "history" ? fixedA : undefined}
                  coordinateBounds={chapter === "history" ? bounds : undefined}
                  highlight={highlight}
                  onHighlight={setHighlight}
                  onChange={(index, value) => {
                    const next = [...family];
                    next[index] = value;
                    selectFamily(next, `第${index}層を変更しました。`);
                  }}
                />
              )}
              {chapter === "history" && (
                <div className="history-legend">
                  <span>● 実線：履歴Bの固定点</span>
                  <span>◇ 破線：履歴Aの固定点</span>
                  <small>層の区間はB。Aの糸は別の層集合に属します。</small>
                </div>
              )}
              <div className="main-equation">
                {token(equationKey, linkedEquations[equationKey])}
              </div>
            </div>
            <div className="interaction-panel">
              <div
                className={`result-strip ${(chapter === "connect" && !result.coherent) || (chapter === "settle" && rate >= 1) || (chapter === "represent" && representation === "mismatch") ? "caution" : ""}`}
              >
                {chapter === "connect" && (
                  <>
                    <strong data-testid="coherence-status">
                      {coherenceText}
                    </strong>
                    <span>
                      整合性残差 E<sub>coh</sub> ={" "}
                      <b data-testid="energy">{format(result.energy)}</b>
                    </span>
                  </>
                )}
                {chapter === "settle" && (
                  <>
                    <strong data-testid="contraction-status">
                      {rate < 1
                        ? "✓ 一意収束の条件を満たします"
                        : "△ 縮小による一意収束の保証なし"}
                    </strong>
                    <span>
                      {result.coherent
                        ? `基準固定点までの距離 ${format(distance)}`
                        : "反復する前に、層を整合させます。"}
                    </span>
                  </>
                )}
                {chapter === "represent" && (
                  <>
                    <strong data-testid="representation-status">
                      {report.selfRepresenting
                        ? "✓ 自己表象の条件が成立"
                        : representation === "mismatch"
                          ? "≠ 表象と状態が不一致"
                          : report.isFixed
                            ? "固定点あり・自己表象は未追加"
                            : "まず、固定点を確認します"}
                    </strong>
                    <span>{report.status}</span>
                  </>
                )}
                {chapter === "history" && (
                  <>
                    <strong data-testid="history-status">
                      {historyDifference < 1e-10
                        ? "同じ履歴では、同じ空間と固定点"
                        : "履歴に応じて、空間と固定点が変化"}
                    </strong>
                    <span>
                      共通座標での固定点の最大差：{format(historyDifference)}
                    </span>
                  </>
                )}
              </div>
              {chapter === "settle" && (
                <div className="rate-control">
                  <label htmlFor="rate">
                    縮小率のパラメータ <b>L = {rate.toFixed(2)}</b>
                  </label>
                  <input
                    id="rate"
                    type="range"
                    min="0"
                    max="1.2"
                    step="0.01"
                    value={rate}
                    onChange={(event) => changeRate(Number(event.target.value))}
                  />
                  <div className="scale">
                    <span>0：速い</span>
                    <span>1：恒等写像</span>
                    <span>1.2</span>
                  </div>
                  <p className="note">
                    {rate < 1
                      ? "Lが小さいほど、同じ固定点へ速く近づきます。"
                      : rate === 1
                        ? "全ての整合糸が固定点です。存在は保たれます。"
                        : "固定点は z = −1, 0.2, 1 の3本。距離は0.2の糸を基準に表示します。"}
                  </p>
                </div>
              )}
              {chapter === "history" && (
                <div className="history-control">
                  <label htmlFor="history-b">
                    履歴B <b>h = {historyB.toFixed(2)}</b>
                  </label>
                  <input
                    id="history-b"
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={historyB}
                    onChange={(event) =>
                      setHistoryB(Number(event.target.value))
                    }
                  />
                  <div className="history-presets">
                    <button onClick={() => setHistoryB(historyA)}>
                      Aと同じにする
                    </button>
                    <button
                      onClick={() => setHistoryB(historyA > 0 ? -0.7 : 0.7)}
                    >
                      別の履歴にする
                    </button>
                  </div>
                </div>
              )}
              <div className="primary-actions">
                {chapter === "connect" && (
                  <button
                    className="primary"
                    onClick={() =>
                      selectFamily(
                        reconcile(layers, family),
                        "最上位の点を基準に整合させました。この糸はSCの一要素です。",
                      )
                    }
                  >
                    上の層に整合させる
                  </button>
                )}
                {chapter === "settle" &&
                  (result.coherent ? (
                    <>
                      <button
                        className="primary"
                        disabled={n >= 200}
                        onClick={() => setPlaying(!playing)}
                      >
                        {playing ? "Ⅱ 一時停止" : "▶ 反復を再生"}
                      </button>
                      <button
                        disabled={n >= 200}
                        onClick={() => {
                          setPlaying(false);
                          advance();
                        }}
                      >
                        1回進める
                      </button>
                    </>
                  ) : (
                    <button
                      className="primary"
                      onClick={() =>
                        selectFamily(
                          reconcile(layers, family),
                          "整合しました。反復を始められます。",
                        )
                      }
                    >
                      整合して反復を準備
                    </button>
                  ))}
                {chapter === "represent" &&
                  (!report.isFixed ? (
                    <button
                      className="primary"
                      onClick={() =>
                        selectFamily(
                          target,
                          "式から構成した基準固定点 z = 0.2 を表示しています。",
                        )
                      }
                    >
                      基準固定点を表示
                    </button>
                  ) : (
                    <button
                      className="primary"
                      onClick={() => {
                        setRepresentation(
                          representation === "faithful" ? "absent" : "faithful",
                        );
                        setNotice(
                          "状態の糸を変えずに、自己表象の有無を切り替えました。",
                        );
                      }}
                    >
                      {representation === "faithful"
                        ? "自己表象を外す"
                        : "自己表象を加える"}
                    </button>
                  ))}
                {chapter === "history" && (
                  <button
                    className="primary"
                    onClick={() => {
                      setHistoryA(historyB);
                      setNotice("いまの履歴を比較基準Aに保存しました。");
                    }}
                  >
                    いまの履歴をAに保存
                  </button>
                )}
                <button onClick={() => openSheet("settings")}>
                  条件を変える
                </button>
              </div>
              <div className="secondary-actions">
                {(chapter === "connect" || chapter === "settle") && (
                  <button onClick={() => openSheet("gallery")}>
                    別の糸を選ぶ
                  </button>
                )}
                {chapter === "connect" && (
                  <button
                    onClick={() =>
                      selectFamily(
                        createInitialFamily(layers),
                        "各層を独立に選んだ状態族へ戻しました。",
                      )
                    }
                  >
                    点をばらす
                  </button>
                )}
                {chapter === "settle" && (
                  <>
                    <button disabled={!experiment.initial} onClick={restart}>
                      開始点へ戻す
                    </button>
                    <button onClick={() => openSheet("distance")}>
                      距離グラフ
                    </button>
                  </>
                )}
              </div>
              <p className="chapter-insight">
                {chapter === "connect"
                  ? "SCは、整合する糸を全て集めた空間です。一本の糸とは区別します。"
                  : chapter === "settle"
                    ? "紫の糸は基準固定点。固定点の存在と、一意に収束する保証は別の条件です。"
                    : chapter === "represent"
                      ? "菱形はこのモデルの内部表象。Mと表象側の更新を明示的に定義した例です。"
                      : "「固定」は現在の履歴と写像のもとでの性質です。ここでは各履歴の固定点を式から構成して比較します。"}
              </p>
              <div className="reading-actions">
                <button onClick={() => openSheet("math")}>
                  数式・いま何が言える？
                </button>
                <button onClick={() => openSheet("proof")}>
                  証明をたどる →
                </button>
              </div>
            </div>
          </div>
          <p className="live-notice" role="status">
            {notice || "実験を切り替えても、選んだ状態と設定は保持されます。"}
          </p>
        </section>
      </main>
      <details className="series-disclosure">
        <summary>シリーズ・この実験について</summary>
        <SeriesFooter lab="inverse" />
      </details>
      {overlay && (
        <Sheet
          title={
            overlay === "settings"
              ? "条件を変える"
              : overlay === "gallery"
                ? "整合した糸を選ぶ"
                : overlay === "math"
                  ? "数式と、いま言えること"
                  : overlay === "proof"
                    ? "証明をたどる"
                    : overlay === "distance"
                      ? "固定点までの距離"
                      : "この実験について・出典"
          }
          onClose={closeSheet}
        >
          {overlay === "gallery" && (
            <>
              <p>
                SCは整合族の空間です。ここに示す7本はその一部で、ほかにも無数の糸があります。
              </p>
              <div className="thread-gallery">
                {threadCandidates(layers, 7).map(
                  ({ z, family: candidate }, index) => (
                    <button
                      key={z}
                      aria-label={`整合した糸 ${index + 1} を選ぶ`}
                      aria-pressed={
                        result.coherent &&
                        Math.abs(toNormalized(layers[0], family[0]) - z) < 1e-7
                      }
                      onClick={() => {
                        selectFamily(
                          candidate,
                          `整合した糸 ${index + 1} を選びました。`,
                        );
                        closeSheet();
                      }}
                    >
                      <svg viewBox="0 0 100 90" aria-hidden="true">
                        {layers.map((_, j) => (
                          <line
                            key={j}
                            x1="10"
                            x2="90"
                            y1={10 + (j * 70) / (layers.length - 1)}
                            y2={10 + (j * 70) / (layers.length - 1)}
                            stroke="#253140"
                          />
                        ))}
                        <polyline
                          points={candidate
                            .map(
                              (x, j) =>
                                `${50 + x * 22},${10 + ((layers.length - 1 - j) * 70) / (layers.length - 1)}`,
                            )
                            .join(" ")}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                      <b>糸 {index + 1}</b>
                      <small>z = {z.toFixed(2)}</small>
                    </button>
                  ),
                )}
              </div>
              <p className="note">
                選ぶと、整合したまま反復の開始点を変更します。
              </p>
            </>
          )}
          {overlay === "distance" && (
            <>
              <p>
                正規化した各層の座標の最大差です。非縮小時も z = 0.2
                の糸までの距離を表示します。
              </p>
              <DistanceGraph
                distances={distances}
                rate={rate}
                highlight={highlight === "contraction"}
                onHighlight={setHighlight}
              />
              <div className="formula-box">
                <Formula
                  tex={String.raw`d(S_n,S^*)\le L^n d(S_0,S^*)\quad(0\le L<1)`}
                />
              </div>
              <p className="note">
                縮小時の実測線と上界は、この具体モデルでは重なります。再生・一時停止は実験画面から操作できます。
              </p>
            </>
          )}
          {overlay === "settings" && (
            <div className="settings-content">
              <div className="control-row">
                <label htmlFor="layer-count">層数</label>
                <select
                  id="layer-count"
                  value={layers.length}
                  onChange={(event) =>
                    changeLayerCount(Number(event.target.value))
                  }
                >
                  {[2, 3, 4, 6, 8, 12].map((count) => (
                    <option key={count} value={count}>
                      {count}層
                    </option>
                  ))}
                </select>
              </div>
              {chapter === "settle" && (
                <>
                  <h3>Lの比較</h3>
                  <div className="rate-presets">
                    {[0, 0.2, 0.8, 0.99, 1, 1.1].map((value) => (
                      <button
                        key={value}
                        aria-pressed={rate === value}
                        onClick={() => changeRate(value)}
                      >
                        L = {value}
                      </button>
                    ))}
                  </div>
                  <p className="note">
                    変更すると同じ開始点へ戻ります。L ≥
                    1でも、このモデルの固定点は存在します。
                  </p>
                </>
              )}
              {chapter === "represent" && (
                <>
                  <div className="control-row">
                    <label htmlFor="representation-mode">自己表象</label>
                    <select
                      id="representation-mode"
                      value={representation}
                      disabled={!report.isFixed}
                      onChange={(event) =>
                        setRepresentation(
                          event.target.value as RepresentationMode,
                        )
                      }
                    >
                      <option value="absent">外す</option>
                      <option value="faithful">忠実な表象</option>
                      <option value="mismatch">別の糸を指す</option>
                    </select>
                  </div>
                  <p className="note">
                    {report.isFixed
                      ? "表象の対応が崩れても、状態側の固定点は維持されます。"
                      : "先に実験画面で基準固定点を表示してください。"}
                  </p>
                </>
              )}
              {chapter === "history" && (
                <>
                  <div className="history-facts">
                    <span>
                      履歴A：h={historyA.toFixed(2)} / q={a.q.toFixed(3)}
                    </span>
                    <span>
                      履歴B：h={historyB.toFixed(2)} / q={b.q.toFixed(3)}
                    </span>
                    <span>
                      第0層の区間A：[{a.layers[0].min.toFixed(2)},{" "}
                      {a.layers[0].max.toFixed(2)}]
                    </span>
                    <span>
                      第0層の区間B：[{b.layers[0].min.toFixed(2)},{" "}
                      {b.layers[0].max.toFixed(2)}]
                    </span>
                  </div>
                  <p className="note">
                    hは教材用の入力パラメータです。人生の履歴を計測した値ではありません。比較にはL=0.65の写像を使い、他の実験のLは保持します。
                  </p>
                </>
              )}
              <details
                className="condition-experiments"
                open={chapter === "connect"}
              >
                <summary>条件を外す実験</summary>
                <p>
                  本編とは別の小さなモデルで、仮定を外したときに何が起こるか確かめます。
                </p>
                <label htmlFor="condition-case">試す条件</label>
                <select
                  id="condition-case"
                  value={caseId}
                  onChange={(event) => {
                    setCaseId(event.target.value);
                    setProbe(0);
                  }}
                >
                  {conditionCases.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
                <p>{condition.description}</p>
                <div className="formula-box">
                  <Formula tex={condition.formula} />
                </div>
                {![
                  "empty",
                  "finiteCompatibility",
                  "discontinuousProjection",
                ].includes(caseId) && (
                  <>
                    <label htmlFor="probe">
                      入力座標 z = {probe.toFixed(2)}
                    </label>
                    <input
                      id="probe"
                      type="range"
                      min="-1"
                      max="1"
                      step="0.05"
                      value={probe}
                      onChange={(event) => setProbe(Number(event.target.value))}
                    />
                  </>
                )}
                <div className="witness" data-testid="condition-witness">
                  <div>
                    <small>{condition.aLabel}</small>
                    <b>{witness.a.toFixed(3)}</b>
                  </div>
                  <span>→</span>
                  <div>
                    <small>{condition.bLabel}</small>
                    <b>{witness.b.toFixed(3)}</b>
                  </div>
                </div>
                <p className="guarantee" data-testid="condition-guarantee">
                  {condition.lostGuarantee}
                </p>
                <p className="note">{condition.knownOutcome}</p>
              </details>
              <button
                className="reset-button"
                onClick={() => {
                  setExperiment(fresh());
                  setRate(0.65);
                  setRepresentation("absent");
                  setHistoryA(-0.7);
                  setHistoryB(0.7);
                  setCaseId("composition");
                  setProbe(0);
                  changeChapter("connect");
                  setNotice("全ての実験を初期状態に戻しました。");
                  closeSheet();
                }}
              >
                全て初期状態に戻す
              </button>
            </div>
          )}
          {overlay === "math" && (
            <div className="math-content">
              <div className="formula-box">
                <Formula tex={current.equation} />
              </div>
              {chapter === "connect" && (
                <>
                  <h3>直積から、整合する族を選ぶ</h3>
                  <p>
                    直積では各層の点を独立に選びます。射影条件を全て満たす族を集めると、有限層の逆極限SC_Nになります。いま選んだ族が不整合でも、整合族の空間が空になったわけではありません。
                  </p>
                  <div className="formula-box">
                    <Formula
                      tex={String.raw`SC_N=\{(x_\alpha)_\alpha\mid\pi_{\alpha\leftarrow\beta}(x_\beta)=x_\alpha\}`}
                    />
                  </div>
                  <p>
                    本モデルの整合族は x_α=c_α+r_αz（−1≤z≤1）で構成できます。
                  </p>
                  <details>
                    <summary>全ペアの正規化射影誤差</summary>
                    <div className="formula-box">
                      <Formula
                        tex={String.raw`E_{\rm coh}=\sum_{\alpha<\beta}\left|\frac{\pi_{\alpha\leftarrow\beta}(x_\beta)-x_\alpha}{r_\alpha}\right|^2`}
                      />
                    </div>
                    <div className="residual-list">
                      {result.residuals.map((row) => (
                        <div key={`${row.from}-${row.to}`}>
                          <span>
                            π {row.to} ← {row.from}
                          </span>
                          <b>{format(row.error)}</b>
                        </div>
                      ))}
                    </div>
                  </details>
                </>
              )}
              {chapter === "settle" && (
                <>
                  <h3>存在と一意性を分ける</h3>
                  <p>
                    本モデルのSC_Nは非空コンパクト凸集合で、Fは連続自己写像です。固定点の存在条件は全てのLで保たれます。L&lt;1を加えると、完備距離についての縮小写像として、一意性と反復収束が保証されます。
                  </p>
                  <div className="formula-box">
                    <Formula
                      tex={String.raw`f(z)=\operatorname{clip}_{[-1,1]}(q+L(z-q)),\quad q=0.2`}
                    />
                  </div>
                  <p>
                    {rate < 1
                      ? "現在は縮小条件を満たします。"
                      : rate === 1
                        ? "現在は恒等写像です。全ての整合族が固定点になります。"
                        : "現在の固定点は−1、0.2、1の3つです。"}
                  </p>
                </>
              )}
              {chapter === "represent" && (
                <>
                  <h3>忠実さと同変性を、別に確認する</h3>
                  <p>
                    整合した糸の共通座標zを、組(z,z²)で表します。この組の第1座標から元の糸を復元できます。これが本モデルでの忠実な表象関係です。
                  </p>
                  <div className="formula-box">
                    <Formula
                      tex={String.raw`M(S(z))=(z,z^2),\quad F_{Rep}(z,z^2)=(f(z),f(z)^2)`}
                    />
                    <br />
                    <Formula tex={String.raw`M\circ F=F_{Rep}\circ M`} />
                  </div>
                  <p>
                    同変性は「状態を更新してから表す」と「表象側を更新する」が一致することです。忠実モードでは、この式の定義により全てのzで成立します。
                  </p>
                  <div className="report-grid">
                    <span>
                      固定点：{report.isFixed ? "数値条件内" : "未到達"}
                    </span>
                    <span>忠実さ：{report.faithful ? "成立" : "未成立"}</span>
                    <span>
                      現在点での同変性：{report.equivariant ? "一致" : "未成立"}
                    </span>
                    <span>
                      表象側の固定点：
                      {report.representationFixed ? "数値条件内" : "未成立"}
                    </span>
                  </div>
                  <p className="note">
                    不一致モードで、たまたま現在点の同変式が一致しても、忠実な自己表象の成立とは扱いません。図は機能的な数学モデルで、主観的体験の証明ではありません。
                  </p>
                </>
              )}
              {chapter === "history" && (
                <>
                  <h3>層の区間と固定点を、同じhから構成する</h3>
                  <div className="formula-box">
                    <Formula
                      tex={String.raw`c_\alpha(h)=c_\alpha+h(0.16+0.025\alpha)`}
                    />
                    <br />
                    <Formula
                      tex={String.raw`r_\alpha(h)=r_\alpha(1+0.18h),\quad q(h)=0.2+0.45h`}
                    />
                  </div>
                  <p>
                    各履歴の射影はその層の正規化座標を保存します。SC_hは変わりますが、−1≤h≤1で区間は非空コンパクトのままです。比較に使う写像のLは0.65で、一意固定点S*_h=(c_α(h)+r_α(h)q(h))_αを構成できます。
                  </p>
                  <p>
                    共通座標でAとBを重ね、座標軸の拡大縮小によって変化が消えないようにしています。任意の現実の履歴についての一般的な測定モデルではありません。
                  </p>
                </>
              )}
              <p className="note">
                画面は有限層モデルです。一般の無限逆極限の存在は、有限整合性などの仮定に基づく証明によって扱います。
              </p>
              <button onClick={() => setOverlay("proof")}>
                証明の段階をたどる →
              </button>
            </div>
          )}
          {overlay === "proof" && (
            <ProofGuide
              rate={rate}
              coherent={result.coherent}
              representation={representation}
              onHighlight={setHighlight}
              onClose={() => {
                const destination: Chapter =
                  highlight === "history"
                    ? "history"
                    : highlight === "representation"
                      ? "represent"
                      : ["fixed", "feedback", "contraction"].includes(
                            highlight ?? "",
                          )
                        ? "settle"
                        : "connect";
                setChapter(destination);
                closeSheet();
              }}
            />
          )}
          {overlay === "about" && <AboutContent />}
        </Sheet>
      )}
    </div>
  );
}
