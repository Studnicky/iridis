export function computeHighlightRanges(input) {
  const numbers = Array.isArray(input) ? input.map(Number) : input.split(",").map(Number);
  const ranges = [];
  let start = numbers[0];
  for (let i = 1; i <= numbers.length; i++) {
    if (numbers[i] !== numbers[i - 1] + 1) {
      if (start === numbers[i - 1]) {
        ranges.push(`${start}`);
      } else {
        ranges.push(`${start}-${numbers[i - 1]}`);
      }
      start = numbers[i];
    }
  }
  return ranges.join(",");
}
export function refineCodeLanguage(language) {
  return String(language || "").trim();
}
