/**
 * ProScale Advisory: Normalization Utilities
 * Ported from Google Apps Script (GST Reconciliation Suite)
 */

export function normalizeInvoice(s: any): string {
  return String(s || "").normalize("NFKC").toUpperCase().trim();
}

export function compactInvoice(s: string): string {
  return normalizeInvoice(s).replace(/[^A-Z0-9]/g, "");
}

export function invoiceTokens(s: string): string[] {
  return normalizeInvoice(s).split(/[^A-Z0-9]+/).filter(Boolean);
}

export function normalizeNumericSuffixNumber(s: any): string | null {
  if (!s) return null;
  const v = parseInt(String(s), 10);
  return isNaN(v) ? null : String(v);
}

/**
 * FY signature extractor
 * Returns normalized FY like "25-26" or "24-25" or "25"
 * Only detects FY if it appears at the END of invoice.
 */
export function getInvoiceFYSig(raw: string): string | null {
  const s = normalizeInvoice(raw);
  if (!s) return null;

  const tight = s.replace(/\s+/g, "");

  function yy(x: string | number) {
    return String(x).slice(-2);
  }

  // 1) /25-26 or -25-26 (YY-YY)
  let m = tight.match(/([\/-])(?:FY)?(\d{2})[\/-](\d{2})$/i);
  if (m) return m[2] + "-" + m[3];

  // 2) /2025-26 or -2025-26 (YYYY-YY)
  m = tight.match(/([\/-])(?:FY)?(\d{4})[\/-](\d{2})$/i);
  if (m) return yy(m[2]) + "-" + String(m[3]).padStart(2, "0");

  // 3) /2025-2026 or -2025-2026 (YYYY-YYYY)
  m = tight.match(/([\/-])(?:FY)?(\d{4})[\/-](\d{4})$/i);
  if (m) return yy(m[2]) + "-" + yy(m[3]);

  // 4) /2526 or -2526 (consecutive only)
  m = tight.match(/([\/-])(?:FY)?(\d{4})$/i);
  if (m) {
    const a = m[2].slice(0, 2),
      b = m[2].slice(2, 4);
    const A = parseInt(a, 10),
      B = parseInt(b, 10);
    if (!isNaN(A) && !isNaN(B) && (A + 1) % 100 === B) return a + "-" + b;
  }

  // 5) /202526 or -202526 (YYYYYY consecutive only)
  m = tight.match(/([\/-])(?:FY)?(\d{6})$/i);
  if (m) {
    const y1 = m[2].slice(0, 4),
      y2 = m[2].slice(4, 6);
    const A2 = parseInt(y1.slice(-2), 10),
      B2 = parseInt(y2, 10);
    if (!isNaN(A2) && !isNaN(B2) && (A2 + 1) % 100 === B2) return yy(y1) + "-" + y2;
  }

  // 6) single year at end: /25, -26, /2025, -2024 -> normalize to "25"
  m = tight.match(/([\/-])(?:FY)?((?:20)?\d{2})$/i);
  if (m) {
    const yr = String(m[2]);
    return yr.length === 4 ? yy(yr) : yr;
  }

  return null;
}

function allowedFYYears2DigitSet(): Set<string> {
  const y = new Date().getFullYear() % 100;
  const set = new Set<string>();
  for (let d = -3; d <= 1; d++) {
    const v = (y + d + 100) % 100;
    set.add(String(v).padStart(2, "0"));
  }
  return set;
}

/**
 * Strip trailing FY forms so suffix extraction targets the invoice serial (e.g., INV/5/25-26 -> INV/5)
 */
export function stripTrailingFYRaw(raw: string): string {
  let s = normalizeInvoice(raw);
  if (!s) return s;

  let tight = s.replace(/\s+/g, "");
  const allowedYY = allowedFYYears2DigitSet();

  // A) /YY-YY or -YY/YY or /YYYY-YY or /YYYY-YYYY (consecutive only)
  tight = tight.replace(
    /([\/-])(?:FY)?((?:20)?\d{2,4})([\/-])((?:20)?\d{2,4})$/i,
    (match, sep1, y1, sep2, y2) => {
      const a = parseInt(String(y1).slice(-2), 10);
      const b = parseInt(String(y2).slice(-2), 10);
      if (!isNaN(a) && !isNaN(b) && (a + 1) % 100 === b) return "";
      return match;
    }
  );

  // B) /2425 or -2526 (consecutive only)
  tight = tight.replace(/([\/-])(?:FY)?(\d{4})$/i, (match, sep, yyzz) => {
    const a = parseInt(String(yyzz).slice(0, 2), 10);
    const b = parseInt(String(yyzz).slice(2, 4), 10);
    if (!isNaN(a) && !isNaN(b) && (a + 1) % 100 === b) return "";
    return match;
  });

  // C) /202526 or -202425 (YYYY + YY consecutive only)
  tight = tight.replace(/([\/-])(?:FY)?(\d{6})$/i, (match, sep, yyyyyy) => {
    const y1 = String(yyyyyy).slice(0, 4);
    const y2 = String(yyyyyy).slice(4, 6);
    const a = parseInt(String(y1).slice(-2), 10);
    const b = parseInt(String(y2), 10);
    if (!isNaN(a) && !isNaN(b) && (a + 1) % 100 === b) return "";
    return match;
  });

  // D) single "/25" or "-26" OR "/2025" etc:
  tight = tight.replace(
    /([\/-])(\d{1,6})([\/-])((?:20)?\d{2})$/i,
    (match, sep1, serial, sep2, yyOrYYYY) => {
      const s2 = String(yyOrYYYY);
      const YY = s2.length === 4 ? s2.slice(-2) : s2; // 2025 -> "25"
      if (!allowedYY.has(YY)) return match;

      const prefix = tight.slice(0, tight.length - match.length);

      // must have some alphabet earlier (avoid pure numeric invoice ids)
      if (!/[A-Z]/.test(prefix)) return match;

      // if the serial itself looks like a year, don't strip
      if (allowedYY.has(String(serial).padStart(2, "0"))) return match;

      // Keep ".../<serial>" and strip the trailing "/YY" or "/YYYY"
      return sep1 + serial;
    }
  );

  return tight;
}

/**
 * Returns the last run of digits in the LAST token (after FY stripping)
 */
export function lastNumericSuffixSmart(s: string): string | null {
  if (!s) return null;
  const cleaned = stripTrailingFYRaw(s);
  const toks = invoiceTokens(cleaned);
  if (!toks.length) return null;
  const last = String(toks[toks.length - 1]);
  const m = last.match(/(\d+)(?!.*\d)/);
  return m ? normalizeNumericSuffixNumber(m[1]) : null;
}

export function normGst(s: any): string {
  const v = String(s || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .trim();
  if (
    !v ||
    v === "0" ||
    v === "NA" ||
    v === "N/A" ||
    v === "-" ||
    v === "--" ||
    v === "NULL"
  )
    return "";
  if (v.length !== 15) return ""; // invalid GSTIN treated as missing
  return v;
}

export function getPAN(gst: string | null): string {
  return (gst || "").toString().toUpperCase().substr(2, 10);
}

export function normNameFirst(s: any): string {
  s = String(s || "")
    .toUpperCase()
    .replace(
      /^(M\/S\.?|M\.S\.?|MS\.?|MESSRS\.?|MR\.?|MRS\.?|SMT\.?|SHRI|SHREE)\s+/,
      ""
    )
    .trim();
  return s.split(/\s+/)[0] || "";
}

export function firstTwoNameWords(s: any): string[] {
  if (!s) return [];
  const ignore = new Set([
    "M/S",
    "MS",
    "MESSRS",
    "MR",
    "MRS",
    "SMT",
    "SHRI",
    "SHREE",
    "PVT",
    "PRIVATE",
    "LTD",
    "LIMITED",
    "LLP",
    "CO",
    "COMPANY",
    "INDIA",
  ]);
  return String(s)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w && !ignore.has(w))
    .slice(0, 2);
}
