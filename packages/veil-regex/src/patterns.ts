import type { VeilEntityType } from "@theaiinc/veil";

export interface RegexPattern {
  /** Logical name, e.g. "email". */
  name: string;
  /** VeilEntity type the matches map to. */
  type: VeilEntityType;
  pattern: RegExp;
  confidence: number;
  /** Optional validator; a match is discarded if this returns false. */
  validate?: (value: string) => boolean;
}

/** Luhn check — rejects sequences that aren't valid card numbers. */
export function luhnValid(value: string): boolean {
  const digits = value.replace(/[\s-]/g, "");
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * Built-in detection patterns. The `g` flag is required — the detector uses
 * `matchAll` to capture every occurrence with its character offsets.
 */
export const DEFAULT_PATTERNS: RegexPattern[] = [
  {
    name: "email",
    type: "email",
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    confidence: 0.95,
  },
  {
    name: "url",
    type: "url",
    pattern: /\bhttps?:\/\/[^\s<>"')]+/g,
    confidence: 0.9,
  },
  {
    name: "phone",
    type: "phone",
    pattern: /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{3}[\s.-]?\d{3,4}[\s.-]?\d{0,4}/g,
    confidence: 0.6,
    validate: (v) => v.replace(/\D/g, "").length >= 10,
  },
  {
    name: "credit-card",
    type: "custom",
    pattern: /\b(?:\d[ -]?){13,19}\b/g,
    confidence: 0.85,
    validate: luhnValid,
  },
  {
    name: "api-key",
    type: "api-key",
    pattern:
      /\b(?:sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{16,}|AIza[0-9A-Za-z_-]{20,})\b/g,
    confidence: 0.9,
  },
];
