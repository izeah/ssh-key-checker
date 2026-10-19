// Dictionary strings mark code with backticks. Rendered as <code> elements, never as HTML.
export function Rich({ text }) {
  return text.split("`").map((part, i) =>
    i % 2 ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: a static split of one string, never reordered
      <code key={i}>{part}</code>
    ) : (
      part
    ),
  );
}
