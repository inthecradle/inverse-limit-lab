export type Chapter = "connect" | "settle" | "represent" | "history";

export const chapters: {
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

export const linkedEquations: Record<string, string> = {
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
