const compactNumberFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
});

export function formatCompactNumber(nubmer: number) {
  return compactNumberFormatter.format(nubmer);
}
