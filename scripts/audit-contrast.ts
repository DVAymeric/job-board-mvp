/**
 * Audit de contraste WCAG AA sur les tokens sémantiques de app/globals.css.
 * Parse les blocs :root et .dark, calcule le ratio de contraste relatif
 * pour chaque paire texte/fond connue, et signale celles sous le seuil AA
 * (4.5:1 pour texte normal, 3:1 pour texte large >=24px ou >=18.66px gras).
 *
 * Usage : npx tsx scripts/audit-contrast.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CSS_PATH = join(process.cwd(), "app/globals.css");

type TokenMap = Record<string, string>;

function extractBlock(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Selector not found: ${selector}`);
  const braceStart = css.indexOf("{", start);
  let depth = 0;
  let i = braceStart;
  for (; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  return css.slice(braceStart + 1, i);
}

function parseTokens(block: string): TokenMap {
  const tokens: TokenMap = {};
  const re = /--([a-z0-9-]+):\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) {
    tokens[m[1]] = m[2].trim();
  }
  return tokens;
}

function resolve(tokens: TokenMap, value: string, depth = 0): string | null {
  if (depth > 5) return null;
  const varMatch = value.match(/^var\(--([a-z0-9-]+)\)$/);
  if (varMatch) {
    const next = tokens[varMatch[1]];
    if (!next) return null;
    return resolve(tokens, next, depth + 1);
  }
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  return null; // oklch(...) or other non-hex values: skip, not used by pairs we audit
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const srgb = [r, g, b].map((c) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(hexA: string, hexB: string): number {
  const lA = relLuminance(hexToRgb(hexA));
  const lB = relLuminance(hexToRgb(hexB));
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

// [label, fg token, bg token, "normal" | "large"]
const PAIRS: [string, string, string, "normal" | "large"][] = [
  ["foreground/background", "foreground", "background", "normal"],
  ["card-foreground/card", "card-foreground", "card", "normal"],
  ["popover-foreground/popover", "popover-foreground", "popover", "normal"],
  ["primary-foreground/primary", "primary-foreground", "primary", "normal"],
  ["secondary-foreground/secondary", "secondary-foreground", "secondary", "normal"],
  ["muted-foreground/muted", "muted-foreground", "muted", "normal"],
  ["accent-foreground/accent", "accent-foreground", "accent", "normal"],
  ["destructive-foreground/destructive", "destructive-foreground", "destructive", "normal"],
  ["brand-positive-foreground/brand-positive", "brand-positive-foreground", "brand-positive", "normal"],
  ["status-todo-fg/status-todo-bg", "status-todo-fg", "status-todo-bg", "normal"],
  ["status-sent-fg/status-sent-bg", "status-sent-fg", "status-sent-bg", "normal"],
  ["status-interview-fg/status-interview-bg", "status-interview-fg", "status-interview-bg", "normal"],
  ["status-answer-fg/status-answer-bg", "status-answer-fg", "status-answer-bg", "normal"],
  ["status-rejected-fg/status-rejected-bg", "status-rejected-fg", "status-rejected-bg", "normal"],
  ["warn/background", "warn", "background", "normal"],
  ["warn/card", "warn", "card", "normal"],
  ["danger/background", "danger", "background", "normal"],
  ["danger/card", "danger", "card", "normal"],
  ["heading/background", "heading", "background", "normal"],
  ["heading/card", "heading", "card", "normal"],
  ["sidebar-foreground/sidebar", "sidebar-foreground", "sidebar", "normal"],
  ["sidebar-primary-foreground/sidebar-primary", "sidebar-primary-foreground", "sidebar-primary", "normal"],
  ["sidebar-accent-foreground/sidebar-accent", "sidebar-accent-foreground", "sidebar-accent", "normal"],
];

function audit(themeLabel: string, tokens: TokenMap) {
  console.log(`\n== ${themeLabel} ==`);
  let fails = 0;
  for (const [label, fgKey, bgKey, size] of PAIRS) {
    const fgRaw = tokens[fgKey];
    const bgRaw = tokens[bgKey];
    if (!fgRaw || !bgRaw) {
      console.log(`  SKIP  ${label} (token manquant)`);
      continue;
    }
    const fg = resolve(tokens, fgRaw);
    const bg = resolve(tokens, bgRaw);
    if (!fg || !bg) {
      console.log(`  SKIP  ${label} (valeur non-hex, ex. oklch)`);
      continue;
    }
    const ratio = contrastRatio(fg, bg);
    const threshold = size === "large" ? 3 : 4.5;
    const pass = ratio >= threshold;
    if (!pass) fails++;
    console.log(
      `  ${pass ? "PASS" : "FAIL"}  ${label.padEnd(45)} ${ratio.toFixed(2)}:1  (seuil ${threshold}:1)  fg=${fg} bg=${bg}`,
    );
  }
  return fails;
}

const css = readFileSync(CSS_PATH, "utf-8");
const lightTokens = parseTokens(extractBlock(css, ":root"));
const darkTokens = parseTokens(extractBlock(css, ".dark"));

const lightFails = audit("Clair (:root)", lightTokens);
const darkFails = audit("Sombre (.dark)", darkTokens);

console.log(`\nTotal échecs : ${lightFails + darkFails}`);
if (lightFails + darkFails > 0) process.exitCode = 1;
