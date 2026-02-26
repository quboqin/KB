#!/usr/bin/env node
/**
 * Convert a PDF to best-effort Markdown while preserving heading hierarchy.
 *
 * Strategy:
 * - Use pdfjs-dist to extract text items with font sizes.
 * - Infer headings by relative font size (largest -> H1/H2) + simple patterns.
 * - Keep paragraphs by line wrapping.
 *
 * Usage:
 *   node scripts/fintech-pipeline/pdf_to_markdown.mjs <pdfPath>
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('Usage: node pdf_to_markdown.mjs <pdfPath>');
  process.exit(2);
}

function norm(s) {
  return s.replace(/\s+/g, ' ').trim();
}

function isLikelyHeadingByPattern(line) {
  return (
    /^Part\s+\d+\./i.test(line) ||
    /^(目录|参考资料|版权声明|业务背景|总结)$/.test(line) ||
    /^\d+\.\s+/.test(line)
  );
}

function headingLevelForPattern(line) {
  if (/^\d+\.\s+/.test(line)) return 3;
  return 2;
}

const data = new Uint8Array(await fs.readFile(pdfPath));
const doc = await pdfjsLib.getDocument({ data }).promise;

// Collect font-size stats
const fontSizes = [];
const pages = [];
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const tc = await page.getTextContent();
  pages.push(tc);
  for (const item of tc.items) {
    if (!item.str || !item.transform) continue;
    const size = Math.abs(item.transform[0]) || Math.abs(item.transform[3]) || 0;
    if (size > 0) fontSizes.push(size);
  }
}

fontSizes.sort((a, b) => a - b);
const q = (p) => fontSizes[Math.floor((fontSizes.length - 1) * p)] ?? 0;
const p50 = q(0.5);
const p80 = q(0.8);
const p92 = q(0.92);

function levelBySize(size) {
  if (size >= p92 && size > p80) return 2;
  if (size >= p80 && size > p50) return 3;
  return 0;
}

// Convert per page: group items into lines by y coordinate
const outLines = [];
for (const tc of pages) {
  const items = tc.items
    .filter((it) => it.str && it.transform)
    .map((it) => ({
      str: String(it.str),
      x: it.transform[4],
      y: it.transform[5],
      size: Math.abs(it.transform[0]) || Math.abs(it.transform[3]) || 0,
    }))
    .filter((it) => norm(it.str));

  // group by approximate y
  items.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  for (const it of items) {
    const last = lines[lines.length - 1];
    if (!last || Math.abs(last.y - it.y) > 2) {
      lines.push({ y: it.y, parts: [it] });
    } else {
      last.parts.push(it);
    }
  }

  for (const line of lines) {
    line.parts.sort((a, b) => a.x - b.x);
    const text = norm(line.parts.map((p) => p.str).join(' '));
    if (!text) continue;

    // Skip obvious noise
    if (/^--\s*\d+\s*of\s*\d+\s*--$/i.test(text)) continue;
    if (/^(关注|推荐|热榜|专栏|圈子|付费咨询|知学堂|直答|消息)$/.test(text)) continue;

    const maxSize = Math.max(...line.parts.map((p) => p.size));
    let level = levelBySize(maxSize);
    if (isLikelyHeadingByPattern(text)) level = Math.max(level, headingLevelForPattern(text));

    if (level === 2) outLines.push(`## ${text}`);
    else if (level === 3) outLines.push(`### ${text}`);
    else outLines.push(text);
  }
  outLines.push('');
}

// Post-process: collapse too many blank lines
let md = outLines.join('\n');
md = md.replace(/\n{3,}/g, '\n\n');

// Remove duplicated TOC blocks like:
// ## Part 1...
// ## Part 2...
// ...
// ## Part 1...
md = md.replace(/## Part 1\.[\s\S]*?\n\n## Part 1\./g, '## Part 1.');

process.stdout.write(md);
