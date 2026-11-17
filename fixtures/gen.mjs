#!/usr/bin/env node
// Gera os arquivos de teste em fixtures/out/. Rode com `pnpm fixtures`.
// Node puro + fflate: funciona em Windows/Linux/macOS sem ImageMagick.
// CBR (RAR4/RAR5) e CB7 só são gerados se `rar` / `7z` estiverem no PATH.

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { zipSync } from 'fflate';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out');
const encoder = new TextEncoder();

// ---------------------------------------------------------------------------
// PNG mínimo (RGB, 8 bits) com números desenhados em fonte bitmap 3x5.

const DIGITS = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** Página w×h com fundo `rgb`, faixas horizontais e o `label` centralizado. */
function png(w, h, rgb, label = '', stripe = 0) {
  const row = w * 3 + 1;
  const raw = Buffer.alloc(row * h);
  for (let y = 0; y < h; y++) {
    raw[y * row] = 0; // filtro None
    const shade = stripe && Math.floor(y / stripe) % 2 ? 0.8 : 1;
    for (let x = 0; x < w; x++) {
      const i = y * row + 1 + x * 3;
      raw[i] = rgb[0] * shade;
      raw[i + 1] = rgb[1] * shade;
      raw[i + 2] = rgb[2] * shade;
    }
  }
  // texto
  const scale = Math.max(2, Math.floor(Math.min(w, 1200) / (label.length * 4 + 2) / 1.5));
  const tw = label.length * 4 * scale - scale;
  const x0 = Math.floor((w - tw) / 2);
  const y0 = Math.floor(Math.min(h, 1500) / 2 - (5 * scale) / 2);
  [...label].forEach((ch, ci) => {
    const glyph = DIGITS[ch];
    if (!glyph) return;
    glyph.forEach((line, gy) => {
      [...line].forEach((bit, gx) => {
        if (bit !== '1') return;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const x = x0 + (ci * 4 + gx) * scale + dx;
            const y = y0 + gy * scale + dy;
            if (x < 0 || y < 0 || x >= w || y >= h) continue;
            raw.fill(255, y * row + 1 + x * 3, y * row + 4 + x * 3);
          }
        }
      });
    });
  });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hue = (i, n) => {
  const t = i / n;
  return [80 + 120 * t, 60 + 60 * Math.sin(t * 6), 160 - 100 * t].map(Math.round);
};

// ---------------------------------------------------------------------------
// Arquivos

function comicInfo(fields) {
  const body = Object.entries(fields)
    .map(([k, v]) => `  <${k}>${v}</${k}>`)
    .join('\n');
  return encoder.encode(
    `<?xml version="1.0" encoding="utf-8"?>\n<ComicInfo>\n${body}\n</ComicInfo>\n`,
  );
}

function write(path, data) {
  const full = join(OUT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, data);
  console.log(`  ✓ ${path} (${(data.length / 1024).toFixed(0)} KB)`);
  return full;
}

/** 120 páginas 1.png..120.png, gravadas fora de ordem, mais lixo de SO. */
function numbered() {
  const files = {};
  const order = Array.from({ length: 120 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
  for (const n of order) files[`${n}.png`] = png(200, 300, hue(n, 120), String(n));
  files['__MACOSX/._1.png'] = encoder.encode('lixo');
  files['Thumbs.db'] = encoder.encode('lixo');
  files['.DS_Store'] = encoder.encode('lixo');
  return files;
}

/** Mangá RTL com capa e spreads duplos nas páginas 6 e 13. */
function mangaRtl() {
  const files = {
    'ComicInfo.xml': comicInfo({
      Series: 'Manga RTL',
      Number: 1,
      Manga: 'YesAndRightToLeft',
      PageCount: 20,
    }),
  };
  for (let i = 1; i <= 20; i++) {
    const wide = i === 6 || i === 13;
    files[`p${String(i).padStart(3, '0')}.png`] = png(wide ? 400 : 200, 300, hue(i, 20), String(i));
  }
  return files;
}

/** Uma única imagem 800×30000 (limite de canvas do Safari ≈ 16,7 MP). */
function webtoon() {
  return { '001.png': png(800, 30000, [40, 90, 110], '1', 600) };
}

/** PDF mínimo escrito à mão, com N páginas de texto. */
function pdf(pages) {
  const objs = [];
  const add = (s) => objs.push(s) && objs.length;
  const catalog = add('');
  const pagesObj = add('');
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const kids = [];
  for (let i = 1; i <= pages; i++) {
    const text = `BT /F1 96 Tf 200 400 Td (${i}) Tj ET`;
    const content = add(`<< /Length ${text.length} >>\nstream\n${text}\nendstream`);
    kids.push(
      add(
        `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`,
      ),
    );
  }
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objs[pagesObj - 1] =
    `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${pages} >>`;

  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

function has(cmd) {
  return spawnSync(cmd, [], { stdio: 'ignore' }).error === undefined;
}

/** Cria um RAR/7z a partir de uma pasta temporária com os mesmos arquivos. */
function archiveWith(tool, args, outPath, files) {
  const tmp = join(OUT, '.tmp', outPath);
  for (const [name, data] of Object.entries(files)) {
    mkdirSync(dirname(join(tmp, name)), { recursive: true });
    writeFileSync(join(tmp, name), data);
  }
  const full = join(OUT, outPath);
  mkdirSync(dirname(full), { recursive: true });
  execFileSync(tool, [...args, full, '.'], { cwd: tmp, stdio: 'ignore' });
  console.log(`  ✓ ${outPath}`);
}

// ---------------------------------------------------------------------------

rmSync(OUT, { recursive: true, force: true });
console.log(`Gerando fixtures em ${OUT}`);

const numberedFiles = numbered();
const mangaFiles = mangaRtl();
write('Numeradas/Numeradas 120.cbz', zipSync(numberedFiles, { level: 0 }));
write('Manga RTL/Vol 01.cbz', zipSync(mangaFiles, { level: 0 }));
write('Webtoon/Cap 01.cbz', zipSync(webtoon(), { level: 0 }));
write('PDF/Documento.pdf', pdf(10));

if (has('rar')) {
  archiveWith('rar', ['a', '-r', '-ma4', '-ep1'], 'CBR/RAR4.cbr', mangaFiles);
  archiveWith('rar', ['a', '-r', '-ma5', '-ep1'], 'CBR/RAR5.cbr', mangaFiles);
  archiveWith('rar', ['a', '-r', '-ma5', '-s', '-ep1'], 'CBR/RAR5 solido.cbr', numberedFiles);
} else {
  console.warn('  ! `rar` não encontrado no PATH: CBR (RAR4/RAR5) pulados. Instale o WinRAR/rar.');
}
if (has('7z')) {
  archiveWith('7z', ['a'], 'CB7/Manga.cb7', mangaFiles);
} else {
  console.warn('  ! `7z` não encontrado no PATH: CB7 pulado.');
}
rmSync(join(OUT, '.tmp'), { recursive: true, force: true });
console.log('Pronto.');
