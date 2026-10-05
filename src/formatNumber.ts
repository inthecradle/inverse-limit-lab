export const format = (value: number) =>
  Math.abs(value) < 1e-12
    ? "≈ 0"
    : Math.abs(value) < 1e-4
      ? value.toExponential(2)
      : value.toFixed(4);
