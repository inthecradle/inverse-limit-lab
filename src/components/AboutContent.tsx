import { Math as Formula } from "./Math";

export function AboutContent() {
  return (
    <div className="about-content">
      <h2>定理16の構造を観察する有限モデル</h2>
      <p>
        苫米地英人「苫米地四法印定理――ミニマル13定理版」§7
        の、苫米地自己意識存在・発生定理を参照しています。多層 TCZ
        の逆極限、連続自己写像の固定点、縮小による一意性と反復収束を、教材用の区間モデルで可視化します。
      </p>
      <p>
        <a
          href="https://tomabechi.jp/TomabechiFourDharmaSealsMini13JA.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          参照論文：定理16・証明・型と射程 ↗
        </a>
      </p>
      <h3>層と射影</h3>
      <p>
        層 α の区間を [c<sub>α</sub> − r<sub>α</sub>, c<sub>α</sub> + r
        <sub>α</sub>] とし、座標 x<sub>α</sub> = c<sub>α</sub> + r<sub>α</sub>z
        を使います。正規化座標 z
        を保存する射影なので、恒等則と合成則を満たします。区間の幅・中心は図を見分けるための人工的な設定であり、認知状態の測定値ではありません。
      </p>
      <div className="formula-box">
        <Formula
          tex={String.raw`\pi_{\alpha\leftarrow\beta}(x)=c_\alpha+\frac{r_\alpha}{r_\beta}(x-c_\beta)`}
        />
      </div>
      <h3>フィードバックと固定点</h3>
      <div className="formula-box">
        <Formula
          tex={String.raw`f(z)=\operatorname{clip}_{[-1,1]}\bigl(q+L(z-q)\bigr),\quad q=0.2`}
        />
      </div>
      <p>
        各層を同じ f(z) で更新するため、射影とフィードバックは可換です。0 ≤ L
        &lt; 1 では区間の切り詰めは作用せず、q が一意固定点です。L = 1
        では恒等写像、L &gt; 1 では −1、q、1
        が固定点です。切り詰めを含む写像も連続で、区間内に留まります。
      </p>
      <p>
        距離 d は各層の正規化座標の差の最大値です。整合族同士では |z − z′|
        に等しく、縮小時には d(S<sub>n</sub>, S*) = L<sup>n</sup>d(S
        <sub>0</sub>, S*)
        となります。図の上界と実測値が重なるのはこのモデルの性質です。
      </p>
      <h3>数値判定と版の範囲</h3>
      <p>
        整合判定は全射影の最大正規化誤差 10<sup>−8</sup>{" "}
        以下。反復は基準固定点までの距離 10<sup>−6</sup>{" "}
        未満（縮小時）、一回の変化 10<sup>−9</sup>{" "}
        未満、または200回で停止します。停止は有限精度の判定です。
      </p>
      <p>
        本版は4つの実験を切り替え、数式と証明を必要に応じて開く構成です。自己表象
        M、履歴比較、条件破壊の具体例、段階式の証明ガイドを追加しています。SC
        は整合族からなる空間、S* はその空間内の固定点、Ego
        は制御方策であり、異なる型として扱います。
      </p>
    </div>
  );
}
