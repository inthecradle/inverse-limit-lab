export type ConditionCaseId =
  | "empty"
  | "noncompact"
  | "discontinuousProjection"
  | "composition"
  | "finiteCompatibility"
  | "outsideSelfMap"
  | "discontinuousFeedback";
export interface ConditionCase {
  id: ConditionCaseId;
  title: string;
  description: string;
  lostGuarantee: string;
  knownOutcome: string;
  formula: string;
  aLabel: string;
  bLabel: string;
  evaluate: (probe: number) => { a: number; b: number; gap: number };
}

function witness(probe: number, a: number, b: number) {
  if (!Number.isFinite(probe) || Math.abs(probe) > 1)
    throw new RangeError("Probe must lie in [−1, 1].");
  return { a, b, gap: Math.abs(a - b) };
}

/** Separate explicit mathematical examples, not mutations of the main affine model. */
export const conditionCases: ConditionCase[] = [
  {
    id: "empty",
    title: "層を空集合にする",
    description: "どこか一層を空集合にすると、その層から状態を選べません。",
    lostGuarantee: "整合族の非空性を保証する前提が外れます。",
    knownOutcome: "この例では積空間も整合族の空間も空です。",
    formula: "X_0=\\varnothing\\quad\\Longrightarrow\\quad S_C=\\varnothing",
    aLabel: "選べる状態の数",
    bLabel: "必要な状態の数",
    evaluate: (z) => witness(z, 0, 1),
  },
  {
    id: "noncompact",
    title: "コンパクト性を外す",
    description:
      "各層を実数全体、射影を恒等写像とし、糸を毎回1だけ移動します。",
    lostGuarantee: "コンパクトな凸空間に対する固定点存在の保証が使えません。",
    knownOutcome:
      "整合族は存在しますが、この連続な自己写像には固定点がありません。非コンパクトでも固定点を持つ別の写像はあります。",
    formula: "S_C\\cong\\mathbb R,\\qquad F(z)=z+1\\ne z",
    aLabel: "現在の座標",
    bLabel: "更新後の座標",
    evaluate: (z) => witness(z, z, z + 1),
  },
  {
    id: "discontinuousProjection",
    title: "射影を不連続にする",
    description:
      "2層の射影を、負の側で−1、0以上で1に切り替えます。負の側から0へ近づいても射影値がつながりません。",
    lostGuarantee: "整合条件が閉集合になるという標準の証明が使えません。",
    knownOutcome:
      "この2層の整合族は非空ですが、積空間の中で閉じておらず、コンパクトでもありません。",
    formula:
      "\\pi(z)=\\begin{cases}-1&z<0\\\\1&z\\ge0\\end{cases}\\quad \\lim_{z\\uparrow0}\\pi(z)\\ne\\pi(0)",
    aLabel: "負の側の射影値",
    bLabel: "0での射影値",
    evaluate: (z) => witness(z, -1, 1),
  },
  {
    id: "composition",
    title: "射影の経路をずらす",
    description:
      "3層で、途中の層を通る射影を恒等写像、直接の射影を0.5z＋0.3にします。",
    lostGuarantee: "射影の合成則が外れ、正しい逆系として扱えません。",
    knownOutcome:
      "この例でもz＝0.6の整合族は残ります。合成則の破れだけから空とは言えません。",
    formula: "\\pi_{01}\\circ\\pi_{12}(z)=z,\\qquad\\pi_{02}(z)=0.5z+0.3",
    aLabel: "途中を通る値",
    bLabel: "直接の値",
    evaluate: (z) => witness(z, z, 0.5 * z + 0.3),
  },
  {
    id: "finiteCompatibility",
    title: "有限個の条件を矛盾させる",
    description:
      "4層で、層2から層0への射影を定数−0.4、層3から層0への射影を定数0.4にします。層0に両方の値を要求します。",
    lostGuarantee:
      "有限整合性が外れます。この設定では合成則も外れるため、他の前提を保った逆系の反例ではありません。",
    knownOutcome:
      "この有限個の条件を同時に満たす族はなく、整合族の空間は空です。",
    formula: "x_0=\\pi_{02}(x_2)=-0.4,\\quad x_0=\\pi_{03}(x_3)=0.4",
    aLabel: "層2からの要求",
    bLabel: "層3からの要求",
    evaluate: (z) => witness(z, -0.4, 0.4),
  },
  {
    id: "outsideSelfMap",
    title: "空間の外へ更新する",
    description:
      "整合糸の座標範囲を[−1,1]に保ち、更新だけをz＋3に変更します。更新後は範囲の外です。",
    lostGuarantee: "自己写像の条件が外れるため、固定点定理を適用できません。",
    knownOutcome: "この更新式ではF(z)＝zを満たす点はありません。",
    formula: "S_C\\cong[-1,1],\\quad F(z)=z+3\\in[2,4]",
    aLabel: "現在の座標",
    bLabel: "範囲外の更新値",
    evaluate: (z) => witness(z, z, z + 3),
  },
  {
    id: "discontinuousFeedback",
    title: "更新を不連続にする",
    description: "[−1,1]の中で、負なら1へ、0以上なら−1へ更新します。",
    lostGuarantee:
      "連続性が外れるため、コンパクトで凸な空間でも固定点存在の保証が使えません。",
    knownOutcome:
      "この自己写像には固定点がありません。端点は−1と1の間を往復します。",
    formula:
      "F(z)=\\begin{cases}1&z<0\\\\-1&z\\ge0\\end{cases}\\quad F(z)\\ne z",
    aLabel: "現在の座標",
    bLabel: "更新後の座標",
    evaluate: (z) => witness(z, z, z < 0 ? 1 : -1),
  },
];
