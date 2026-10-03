import { useEffect, useState } from "react";
import { Math as Formula } from "./Math";
import "./proof-guide.css";

type Props = {
  rate: number;
  coherent: boolean;
  representation: "faithful" | "absent" | "mismatch";
  onHighlight: (key: string | null) => void;
  onClose: () => void;
};

const steps = [
  {
    title: "層ごとの空間を用意する",
    key: "layers",
    tex: String.raw`\mathcal C_\alpha\ne\varnothing`,
    text: "有向集合で層を並べ、各層を非空なコンパクト Hausdorff 空間とします。画面の有限個の層は、この構造を考えるための例です。",
  },
  {
    title: "層を結ぶ射影を定める",
    key: "projection",
    tex: String.raw`\pi_{\beta\alpha}:\mathcal C_\beta\to\mathcal C_\alpha`,
    text: "上の層から下の層への連続写像を定めます。全体の族が整合するには、射影した点と下の層の点が一致する必要があります。",
  },
  {
    title: "経路によらないことを確かめる",
    key: "projection",
    tex: String.raw`\pi_{\gamma\alpha}=\pi_{\beta\alpha}\circ\pi_{\gamma\beta}`,
    text: "途中の層を経由しても、直接射影しても同じ点に着きます。自分の層への射影は恒等写像です。",
  },
  {
    title: "有限個の条件を同時に満たす",
    key: "coherence",
    tex: String.raw`\bigcap_{j=1}^{m}E_j\ne\varnothing`,
    text: "積空間の中で、射影一致を要求する各閉集合を E とします。どの有限個の条件にも、それらを同時に満たす族があることを確認します。",
  },
  {
    title: "整合した族の空間ができる",
    key: "space",
    tex: String.raw`SC=\varprojlim\mathcal C_\alpha\ne\varnothing`,
    text: "コンパクトな積空間と、閉じた整合条件の有限交差性から、すべての条件を満たす族が存在します。その集まりが逆極限 SC です。",
  },
  {
    title: "空間の中で更新する",
    key: "feedback",
    tex: String.raw`F_{SC}:SC\to SC`,
    text: "更新を連続な自己写像とします。整合した族を更新した結果も SC に属することが必要です。各層の点を個別に更新するだけでは、この条件は保証されません。",
  },
  {
    title: "固定点の存在へ進む",
    key: "fixed",
    tex: String.raw`\exists S^*\in SC:\ F_{SC}(S^*)=S^*`,
    text: "さらに SC が局所凸 Hausdorff 位相ベクトル空間の非空コンパクト凸部分集合なら、連続自己写像の固定点が存在します。これは Schauder–Tychonoff の条件で、一意性や反復収束は別に調べます。",
  },
  {
    title: "縮小する条件を追加する",
    key: "contraction",
    tex: String.raw`d(F(S),F(T))\le Ld(S,T),\quad 0\le L<1`,
    text: "SC に完備距離を入れ、この距離で F が縮小写像なら、Banach の原理から固定点の存在と一意性が得られます。この経路には凸性やコンパクト性は不要です。",
  },
  {
    title: "反復で固定点に近づく",
    key: "contraction",
    tex: String.raw`S_{n+1}=F(S_n),\quad d(S_n,S^*)\le L^n d(S_0,S^*)`,
    text: "完備距離空間上の縮小写像なら、任意の初期点から同じ固定点へ収束します。距離グラフは有限回の数値実験であり、一般の場合の証明はこの仮定から得られます。",
  },
  {
    title: "忠実で同変な表象を追加する",
    key: "representation",
    tex: String.raw`M\circ F=F_M\circ M`,
    text: "対象状態を正しく指す忠実な表象 M と、表象側の更新 F_M を追加します。更新と表象がこの式のように両立すれば、M(S*) も表象側の固定点です。固定点の存在だけから、この追加構造は導けません。",
  },
  {
    title: "履歴ごとに条件を読む",
    key: "history",
    tex: String.raw`F_h:SC(h)\to SC(h),\quad F_h(S_h^*)=S_h^*`,
    text: "層や射影、更新則が履歴 h に依存する場合、条件は履歴ごとに確認します。各履歴で固定点が一意でも、異なる履歴で同じ固定点になるとは限りません。",
  },
] as const;

const questions = [
  {
    prompt: "射影条件をすべて満たす族の集まり SC を［　］と呼びます。",
    choices: ["逆極限", "一つの層", "反復回数"],
    answer: 0,
    explanation: "逆極限は、層をまたいで整合する族の空間です。",
  },
  {
    prompt: "族が整合するとき、射影した点と下の層の点は［　］。",
    choices: ["距離が一定になります", "一致します", "互いに離れます"],
    answer: 1,
    explanation: "射影した点が下の層の点と一致することが、整合条件です。",
  },
  {
    prompt: "F(S*) = S* を満たす S* を［　］と呼びます。",
    choices: ["射影", "履歴", "固定点"],
    answer: 2,
    explanation:
      "更新しても同じ状態に戻る点が固定点です。存在だけでは一意性はわかりません。",
  },
  {
    prompt:
      "完備距離空間上で、一意性と反復収束を保証する縮小率の条件は［　］です。",
    choices: ["L ≥ 1", "0 ≤ L < 1", "L = 1 だけ"],
    answer: 1,
    explanation:
      "0 ≤ L < 1 の縮小写像なら、Banach の原理を使えます。L ≥ 1 ではその保証が外れます。",
  },
  {
    prompt: "固定点を忠実に表象する構造には、追加で［　］を確認します。",
    choices: ["反復回数だけ", "層数だけ", "表象 M の忠実性と更新との両立"],
    answer: 2,
    explanation:
      "自己表象は追加構造です。固定点の存在から自動的に成立するわけではありません。",
  },
];

export function ProofGuide({
  rate,
  coherent,
  representation,
  onHighlight,
  onClose,
}: Props) {
  const [current, setCurrent] = useState(0);
  const [question, setQuestion] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    questions.map(() => null),
  );
  const step = steps[current];
  const quiz = questions[question];
  const answer = answers[question];

  useEffect(() => {
    onHighlight(step.key);
  }, [onHighlight, step.key]);

  function goTo(index: number) {
    setCurrent(index);
  }

  return (
    <section className="proof-guide" aria-label="証明の学習ガイド">
      <p className="proof-guide-intro">
        仮定から何が言えるかを、11段階でたどります。
      </p>
      <div className="proof-guide-progress">
        <span>
          STEP {current + 1} / {steps.length}
        </span>
        <progress
          aria-label="証明ガイドの進捗"
          value={current + 1}
          max={steps.length}
        />
      </div>
      <div className="proof-guide-step" aria-live="polite" aria-atomic="true">
        <h3>{step.title}</h3>
        <div className="proof-guide-formula">
          <Formula tex={step.tex} />
        </div>
        <p>{step.text}</p>
        {(current === 3 || current === 4) && !coherent && (
          <p className="proof-guide-note">
            現在選んだ族は不整合です。これは「整合する族が一つも存在しない」ことを意味しません。
          </p>
        )}
        {(current === 7 || current === 8) && rate >= 1 && (
          <p className="proof-guide-note">
            現在は L ≥ 1
            です。縮小写像による一意性・反復収束の保証は使えません。固定点の不存在を意味するものではありません。
          </p>
        )}
        {current === 9 && (
          <p
            className={`proof-guide-note ${representation === "faithful" ? "is-satisfied" : ""}`}
          >
            {representation === "faithful"
              ? "このデモでは、忠実で更新と両立する M を追加しています。"
              : representation === "absent"
                ? "現在は M を追加していません。自己表象の構造は未成立です。固定点の存在条件とは別です。"
                : "現在の M は状態を正しく表していません。忠実な自己表象の条件は満たされていません。"}
          </p>
        )}
      </div>
      <div className="proof-guide-controls proof-step-controls">
        <button
          type="button"
          disabled={current === 0}
          onClick={() => goTo(current - 1)}
        >
          前へ
        </button>
        <button
          type="button"
          disabled={current === steps.length - 1}
          onClick={() => goTo(current + 1)}
        >
          次へ
        </button>
      </div>
      <button
        type="button"
        className="proof-guide-return"
        onClick={() => {
          onHighlight(step.key);
          onClose();
        }}
      >
        図で確かめる
      </button>
      <details className="proof-guide-details">
        <summary>条件と結論のつながり</summary>
        <div className="proof-guide-dependencies">
          <p>コンパクトな層 ＋ 閉じた整合条件の有限交差性 → SC の非空性</p>
          <p>
            非空コンパクト凸な SC ＋ 連続自己写像 → 固定点の存在
            <span>局所凸 Hausdorff 位相ベクトル空間内で考えます。</span>
          </p>
          <p>非空完備距離空間 ＋ 縮小写像 → 固定点の存在・一意性・反復収束</p>
          <p>固定点 ＋ 忠実で同変な M → その固定点を表す表象</p>
        </div>
        <ol className="proof-guide-index">
          {steps.map((item, index) => (
            <li key={item.title}>
              <button
                type="button"
                aria-current={current === index ? "step" : undefined}
                onClick={() => goTo(index)}
              >
                {item.title}
              </button>
            </li>
          ))}
        </ol>
      </details>
      <details className="proof-guide-details">
        <summary>理解を確かめる · 5問</summary>
        <div className="proof-guide-quiz">
          <span className="proof-guide-counter">
            問 {question + 1} / {questions.length}
          </span>
          <p>{quiz.prompt}</p>
          <div className="proof-guide-choices">
            {quiz.choices.map((choice, index) => (
              <button
                type="button"
                key={choice}
                aria-pressed={answer === index}
                onClick={() =>
                  setAnswers((previous) =>
                    previous.map((value, i) =>
                      i === question ? index : value,
                    ),
                  )
                }
              >
                {choice}
              </button>
            ))}
          </div>
          <p role="status" className="proof-guide-answer">
            {answer !== null
              ? `${answer === quiz.answer ? "そのとおりです。" : "条件をもう一度見てみましょう。"}${quiz.explanation}`
              : "選択肢を選ぶと、解説を確認できます。"}
          </p>
          <div className="proof-guide-controls">
            <button
              type="button"
              disabled={question === 0}
              onClick={() => setQuestion(question - 1)}
            >
              前の問
            </button>
            <button
              type="button"
              onClick={() => {
                setQuestion(0);
                setAnswers(questions.map(() => null));
              }}
            >
              やり直し
            </button>
            <button
              type="button"
              disabled={question === questions.length - 1 || answer === null}
              onClick={() => setQuestion(question + 1)}
            >
              次の問
            </button>
          </div>
        </div>
      </details>
    </section>
  );
}
