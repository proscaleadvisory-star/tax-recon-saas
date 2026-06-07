/**
 * ProScale Advisory: Reconciliation Matcher Engine
 * Ported from Google Apps Script (GST Reconciliation Suite)
 */

import { 
  normalizeInvoice, 
  compactInvoice, 
  getInvoiceFYSig, 
  stripTrailingFYRaw, 
  lastNumericSuffixSmart, 
  normGst, 
  getPAN, 
  normNameFirst 
} from "./normalization";
import { levRatio, twoWordNameSimilarity } from "./similarity";

export interface MatchResult {
  matched: boolean;
  reason: string;
}

export function normNum(s: any): number {
  if (s === null || s === undefined) return NaN;
  let v = String(s).trim();
  v = v.replace(/[₹,\s\u00A0]/g, "").replace(/^\((.*)\)$/, "-$1");
  const n = parseFloat(v);
  return isNaN(n) ? NaN : n;
}

export function roundZero(n: number): number {
  return Math.round(Number(n || 0));
}

export function taxWithinTol(prTax: number, gTax: number, tol: number = 0.02): boolean | null {
  if (isNaN(prTax) || isNaN(gTax)) return null;
  const absEps = 0.5; // allow <= 50 paise near zero
  if (Math.abs(prTax) < 1) return Math.abs(prTax - gTax) <= absEps;
  return Math.abs(prTax - gTax) / Math.abs(prTax) <= tol;
}

/**
 * Suffix-first invoice matcher
 */
export function invoiceMatchesDetailed(
  a: string, 
  b: string, 
  opts: { invoiceSimThresh?: number } = {}
): MatchResult {
  const invoiceSimThresh = opts.invoiceSimThresh ?? 0.95;

  const Araw = normalizeInvoice(a);
  const Braw = normalizeInvoice(b);
  const Acompact = compactInvoice(Araw);
  const Bcompact = compactInvoice(Braw);

  // FY guard — if both invoices have FY and FY differs, never match
  const fyA = getInvoiceFYSig(Araw);
  const fyB = getInvoiceFYSig(Braw);
  if (fyA && fyB && fyA !== fyB) {
    return { matched: false, reason: `fy-mismatch(pr:${fyA},2b:${fyB})` };
  }

  if (!Araw && !Braw) return { matched: true, reason: "both-empty" };
  if (Acompact && Acompact === Bcompact) return { matched: true, reason: "exact-compact" };

  // Suffix matching logic
  const Asuf = lastNumericSuffixSmart(Araw);
  if (Asuf) {
    const Bsuf = lastNumericSuffixSmart(Braw);
    if (!Bsuf) return { matched: false, reason: `no-match(pr-has-suffix:${Asuf};2b-none)` };
    if (Asuf === Bsuf) return { matched: true, reason: `numeric-suffix(${Asuf})` };
    return { matched: false, reason: `suffix-mismatch(pr:${Asuf},2b:${Bsuf})` };
  }

  // Fallback to Levenshtein
  const Aclean = stripTrailingFYRaw(Araw);
  const Bclean = stripTrailingFYRaw(Braw);
  const levSim = levRatio(compactInvoice(Aclean), compactInvoice(Bclean));
  
  if (levSim >= invoiceSimThresh) {
    return { matched: true, reason: `lev(${levSim.toFixed(3)})` };
  }

  return { matched: false, reason: `no-match(lev=${levSim.toFixed(3)})` };
}

export class ReconEngine {
  // Logic for selecting the best 2B candidate for a PR row based on amount-first scoring
  static selectBestCandidate(
    prRow: any[],
    prCols: any,
    candidates: any[],
    gCols: any,
    opts: { taxTol?: number; invoiceSimThresh?: number } = {}
  ) {
    const taxTol = opts.taxTol ?? 0.02;
    const scored = [];

    const prInv = prCols.invoice >= 0 ? prRow[prCols.invoice] : "";
    const prTax = prCols.totalTax >= 0 ? normNum(prRow[prCols.totalTax]) : NaN;
    const prName = prCols.name >= 0 ? prRow[prCols.name] : "";
    const prGst = prCols.gst >= 0 ? prRow[prCols.gst] : "";
    const prFirst = normNameFirst(prName);

    for (const cand of candidates) {
      const gRow = cand.rec.values;

      const gInv = gCols.invoice >= 0 ? gRow[gCols.invoice] : "";
      const gTax = gCols.totalTax >= 0 ? normNum(gRow[gCols.totalTax]) : NaN;
      const gName = gCols.name >= 0 ? gRow[gCols.name] || "" : "";
      const gOther = gCols.otherName >= 0 ? gRow[gCols.otherName] || "" : "";
      const gFirst = normNameFirst(gName);
      const gOtherF = normNameFirst(gOther);

      const invRes = invoiceMatchesDetailed(prInv, gInv, { 
        invoiceSimThresh: opts.invoiceSimThresh 
      });
      
      const lev = levRatio(compactInvoice(prInv), compactInvoice(gInv));
      const taxWithin = taxWithinTol(prTax, gTax, taxTol);
      const roundEq = !isNaN(prTax) && !isNaN(gTax) && roundZero(prTax) === roundZero(gTax);

      const sPr = lastNumericSuffixSmart(prInv);
      const sG = lastNumericSuffixSmart(gInv);
      const suffixMatch = sPr && sG && sPr === sG ? 1 : 0;

      const nameMatch = prFirst && (prFirst === gFirst || prFirst === gOtherF) ? 1 : 0;
      const panMatch = getPAN(normGst(prGst)) === getPAN(normGst(gCols.gst >= 0 ? gRow[gCols.gst] : "")) ? 1 : 0;

      const score = 
        (taxWithin === true ? 2000 : (taxWithin === null ? -500 : 0)) +
        (roundEq ? 500 : 0) +
        (invRes.matched ? 450 : 0) +
        (suffixMatch ? 400 : 0) +
        (panMatch ? 300 : 0) +
        (nameMatch ? 200 : 0) +
        Math.round(lev * 1000);

      scored.push({
        rec: cand.rec,
        invRes,
        lev,
        taxWithin,
        roundEq,
        suffixMatch,
        nameMatch,
        panMatch,
        score
      });
    }

    scored.sort((a, b) => {
      const rank = (v: any) => (v === true ? 2 : v === false ? 1 : 0);
      if (rank(b.taxWithin) !== rank(a.taxWithin)) return rank(b.taxWithin) - rank(a.taxWithin);
      if ((b.roundEq ? 1 : 0) !== (a.roundEq ? 1 : 0)) return (b.roundEq ? 1 : 0) - (a.roundEq ? 1 : 0);
      if ((b.invRes.matched ? 1 : 0) !== (a.invRes.matched ? 1 : 0)) return (b.invRes.matched ? 1 : 0) - (a.invRes.matched ? 1 : 0);
      if (b.suffixMatch !== a.suffixMatch) return b.suffixMatch - a.suffixMatch;
      if (b.panMatch !== a.panMatch) return b.panMatch - a.panMatch;
      if (b.nameMatch !== a.nameMatch) return b.nameMatch - a.nameMatch;
      return b.score - a.score;
    });

    return { best: scored[0] || null, ranked: scored };
  }
}
