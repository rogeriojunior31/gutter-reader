import { basename } from './files.ts';

export interface ParsedBookName {
  /** Título curto para exibir dentro da série: "#12.1", "Vol. 3" ou o nome limpo. */
  title: string;
  number?: number;
  year?: number;
}

/** Marcadores de volume/capítulo, do mais específico ao mais genérico. */
const NUMBER_PATTERNS: [RegExp, (n: string) => string][] = [
  [/#\s*(\d+(?:\.\d+)?)/, (n) => `#${n}`],
  [/\b(?:vol(?:ume)?|v)\.?\s*(\d+(?:\.\d+)?)/i, (n) => `Vol. ${n}`],
  [/\b(?:cap(?:[íi]tulo)?|ch(?:apter)?|c)\.?\s*(\d+(?:\.\d+)?)/i, (n) => `Cap. ${n}`],
];

/** "001" → "1", "12.10" → "12.10" (decimais de edição são rótulos, não números). */
function trimZeros(n: string): string {
  const [int = '0', dec] = n.split('.');
  const clean = String(Number.parseInt(int, 10));
  return dec === undefined ? clean : `${clean}.${dec}`;
}

/**
 * Interpreta nomes de arquivo de HQ no mundo real, ex.:
 * "Demon Knights #01 (2011) (DarkseidClub).cbz" → { title: "#1", number: 1, year: 2011 }
 * "DK #20 (2013) (DarkseiDClub).cbr"           → { title: "#20", number: 20, year: 2013 }
 */
export function parseBookFilename(path: string): ParsedBookName {
  const file = basename(path).replace(/\.[^.]+$/, '');
  const yearMatch = file.match(/\((\d{4})\)/);
  // Tira (2011), (DarkseidClub), [Scan] etc. antes de procurar o número.
  const core = file
    .replace(/\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/g, ' ')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const out: ParsedBookName = { title: core || file };
  if (yearMatch?.[1]) out.year = Number(yearMatch[1]);

  for (const [re, label] of NUMBER_PATTERNS) {
    const m = core.match(re);
    if (m?.[1]) {
      const raw = trimZeros(m[1]);
      out.number = Number.parseFloat(raw);
      out.title = label(raw);
      return out;
    }
  }

  // Último recurso: número solto no fim ("Saga 054").
  const tail = core.match(/(\d+(?:\.\d+)?)$/);
  if (tail?.[1]) {
    const raw = trimZeros(tail[1]);
    out.number = Number.parseFloat(raw);
    out.title = `#${raw}`;
  }
  return out;
}
