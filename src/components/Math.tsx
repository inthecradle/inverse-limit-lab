import katex from "katex";

export function Math({ tex }: { tex: string }) {
  return (
    <span
      className="math"
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(tex, {
          throwOnError: false,
          strict: "error",
          trust: false,
        }),
      }}
    />
  );
}
