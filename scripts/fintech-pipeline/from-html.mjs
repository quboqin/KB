#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const ROOT = path.resolve(process.env.HOME, 'magic/KB');
const OUT_DIR = path.join(ROOT, 'src/content/posts/fintech');
const ASSETS_DIR = path.join(OUT_DIR, 'assets');

function frontmatter({ title, description, pubDate, tags = ['fintech'], category = '金融', draft = false, sourceUrl }) {
  const safeDesc = description.replace(/\n/g, ' ').replace(/"/g, '\\"');
  const safeTitle = title.replace(/"/g, '\\"');
  const sourceLine = sourceUrl ? `source_url: "${sourceUrl}"\n` : '';
  return `---\ntitle: "${safeTitle}"\ndescription: "${safeDesc}"\npubDate: ${pubDate}\ncategory: "${category}"\ntags: [${tags.map(t => `"${t}"`).join(', ')}]\ndraft: ${draft}\n${sourceLine}---\n`;
}

function extractMainContent(html, url) {
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;
  const reader = new Readability(doc);
  const article = reader.parse();
  if (!article?.content) {
    return { title: doc.title || '', contentHtml: doc.body?.innerHTML || '' };
  }
  return { title: article.title || doc.title || '', contentHtml: article.content };
}

function turndownFromHtml(html, baseUrl) {
  const td = new TurndownService({ codeBlockStyle: 'fenced' });
  td.use(gfm);

  td.addRule('imgDataSrc', {
    filter: (node) => node.nodeName === 'IMG',
    replacement: (_content, node) => {
      const el = node;
      const cand =
        el.getAttribute('data-src') ||
        el.getAttribute('data-original') ||
        el.getAttribute('data-actualsrc') ||
        el.getAttribute('src') ||
        '';
      if (!cand) return '';
      if (cand.startsWith('data:image')) return '';
      let abs = cand;
      try {
        if (baseUrl && cand && !cand.startsWith('http') && !cand.startsWith('data:')) {
          abs = new URL(cand, baseUrl).toString();
        }
      } catch {}
      const alt = el.getAttribute('alt') || 'image';
      return `![${alt}](${abs})`;
    },
  });

  td.addRule('absoluteLinks', {
    filter: ['a'],
    replacement: (content, node) => {
      const href = node.getAttribute('href') || '';
      let abs = href;
      try {
        if (baseUrl && href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('#')) {
          abs = new URL(href, baseUrl).toString();
        }
      } catch {}
      return `[${content || abs}](${abs})`;
    },
  });

  return td.turndown(html);
}

function collectImageUrls(contentHtml, baseUrl) {
  const dom = new JSDOM(contentHtml, { url: baseUrl || 'https://example.com' });
  const doc = dom.window.document;
  const urls = [];
  for (const img of Array.from(doc.querySelectorAll('img'))) {
    const cand =
      img.getAttribute('data-src') ||
      img.getAttribute('data-original') ||
      img.getAttribute('data-actualsrc') ||
      img.getAttribute('src') ||
      '';
    if (!cand) continue;
    if (cand.startsWith('data:image')) continue;
    try {
      const u = new URL(cand, baseUrl).toString();
      urls.push(u);
    } catch {}
  }
  return Array.from(new Set(urls));
}

async function downloadFile(url, outPath) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`download failed ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outPath, buf);
}

function guessExtFromUrl(u) {
  try {
    const p = new URL(u).pathname;
    const ext = path.extname(p).slice(1).toLowerCase();
    if (ext && ext.length <= 5) return ext;
  } catch {}
  return 'jpg';
}

async function main() {
  const [url, slug, htmlPath] = process.argv.slice(2);
  if (!url || !slug || !htmlPath) {
    console.error('Usage: node from-html.mjs <url> <slug> <htmlPath>');
    process.exit(2);
  }
  const html = await fs.readFile(htmlPath, 'utf8');
  const { contentHtml } = extractMainContent(html, url);
  const mdBody = turndownFromHtml(contentHtml, url);
  const images = collectImageUrls(contentHtml, url);

  const postAssetsDir = path.join(ASSETS_DIR, slug);
  await fs.mkdir(postAssetsDir, { recursive: true });

  const replacements = new Map();
  let idx = 1;
  for (const imgUrl of images) {
    const ext = guessExtFromUrl(imgUrl);
    const filename = `img-${String(idx++).padStart(2, '0')}.${ext}`;
    const outPath = path.join(postAssetsDir, filename);
    const rel = `./assets/${slug}/${filename}`;
    try {
      await downloadFile(imgUrl, outPath);
      replacements.set(imgUrl, rel);
    } catch {
      // keep remote
    }
  }

  let finalMd = mdBody;
  for (const [abs, rel] of replacements.entries()) {
    finalMd = finalMd.split(abs).join(rel);
  }

  const title = '大数据风控的MOB、Vintage是什么？';
  // If meta-map has an entry for this title, prefer it.
  let description = (finalMd.replace(/\s+/g, ' ').replace(/[#>*_`\[\]]/g, '').trim().slice(0, 140)) || 'Fintech note.';
  try {
    const metaPath = path.join(ROOT, 'resources/fintech/meta-map.json');
    const metaRaw = await fs.readFile(metaPath, 'utf8');
    const meta = JSON.parse(metaRaw);
    if (meta?.[title]?.description) description = meta[title].description;
  } catch {}
  const pubDate = new Date().toISOString();

  const fm = frontmatter({ title, description, pubDate, category: '金融', tags: ['fintech'], draft: false, sourceUrl: url });
  const outPath = path.join(OUT_DIR, `${slug}.mdx`);
  const full = `${fm}\n${finalMd}\n\n---\n\n原文链接：${url}\n`;
  await fs.writeFile(outPath, full, 'utf8');

  console.log(JSON.stringify({ outPath, imagesDownloaded: replacements.size }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
