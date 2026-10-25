/**
 * Word-level diff for the change-mark tooltip: which words a rewrite dropped
 * and which it brought in. Computed in the browser from the two texts, so
 * the tooltip shows the change without claiming anything new.
 */

export type DiffPart = { kind: 'same' | 'del' | 'ins'; text: string };

/** Words with their trailing punctuation, so "app," and "app" differ. */
function tokens(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** Longest common subsequence over words; bullets are short, so O(n·m) is fine. */
export function wordDiff(before: string, after: string): DiffPart[] {
  const a = tokens(before);
  const b = tokens(after);
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const out: DiffPart[] = [];
  const push = (kind: DiffPart['kind'], word: string) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += ` ${word}`;
    else out.push({ kind, text: word });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { push('same', a[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) push('del', a[i++]);
    else push('ins', b[j++]);
  }
  while (i < a.length) push('del', a[i++]);
  while (j < b.length) push('ins', b[j++]);
  return out;
}
