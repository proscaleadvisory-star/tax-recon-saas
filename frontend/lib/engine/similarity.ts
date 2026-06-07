/**
 * ProScale Advisory: Similarity Utilities
 * Ported from Google Apps Script (GST Reconciliation Suite)
 */

import { firstTwoNameWords } from "./normalization";

export function levDistance(a: string, b: string): number {
  a = String(a || "");
  b = String(b || "");
  const m = a.length,
    n = b.length;
  if (!m) return n;
  if (!n) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function levRatio(a: string, b: string): number {
  a = String(a || "");
  b = String(b || "");
  if (!a && !b) return 1;
  const d = levDistance(a, b);
  return 1 - d / Math.max(1, Math.max(a.length, b.length));
}

/**
 * similarity of first 2 words using per-word best Levenshtein
 */
export function twoWordNameSimilarity(a: string, b: string): number {
  const ca = String(a || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const cb = String(b || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  
  if (ca && cb && ca === cb) return 1;

  const A = firstTwoNameWords(a);
  const B = firstTwoNameWords(b);
  if (!A.length || !B.length) return 0;

  let sum = 0;
  for (let i = 0; i < A.length; i++) {
    let best = 0;
    for (let j = 0; j < B.length; j++) {
      const r = levRatio(A[i], B[j]);
      if (r > best) best = r;
    }
    sum += best;
  }
  return sum / A.length;
}
