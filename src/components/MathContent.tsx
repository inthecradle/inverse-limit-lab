import type { Chapter } from "../chapters";
import { format } from "../formatNumber";
import { diagnostics } from "../model";
import { representationReport } from "../model/representationModel";
import { Math as Formula } from "./Math";

type MathContentProps = {
  chapter: Chapter;
  equation: string;
  result: ReturnType<typeof diagnostics>;
  report: ReturnType<typeof representationReport>;
  rate: number;
  onProof: () => void;
};

export function MathContent({
  chapter,
  equation,
  result,
  report,
  rate,
  onProof,
}: MathContentProps) {
  return (
    <div className="math-content">
      <div className="formula-box">
        <Formula tex={equation} />
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
          <p>本モデルの整合族は x_α=c_α+r_αz（−1≤z≤1）で構成できます。</p>
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
            <span>固定点：{report.isFixed ? "数値条件内" : "未到達"}</span>
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
      <button onClick={onProof}>証明の段階をたどる →</button>
    </div>
  );
}
