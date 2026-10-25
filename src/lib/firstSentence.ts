/* Leading sentences of a write-up, for summaries. A full stop only ends a
   sentence when whitespace or the end of the text follows it, so "5.3%" and
   "0.809" survive. Derived, never hand-written. */
export function leadSentences(text: string, n: number): string {
  const re = /.*?[.!?](?=\s|$)/y;
  let end = 0;
  for (let i = 0; i < n; i++) {
    re.lastIndex = end;
    const m = re.exec(text);
    if (!m) break;
    end = re.lastIndex;
  }
  return end ? text.slice(0, end).trim() : text;
}

export function firstSentence(text: string): string {
  return leadSentences(text, 1);
}
