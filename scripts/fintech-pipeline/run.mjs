#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import slugify from 'slugify';
import pLimit from 'p-limit';
import { chromium } from 'playwright';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const ROOT = path.resolve(process.env.HOME, 'magic/KB');
const INDEX_PATH = path.join(ROOT, 'resources/fintech/index.txt');
const SLUG_MAP_PATH = path.join(ROOT, 'resources/fintech/slug-map.json');
const META_MAP_PATH = path.join(ROOT, 'resources/fintech/meta-map.json');
const CACHE_DIR = path.join(ROOT, 'resources/_cache/fintech');

const OUT_DIR = path.join(ROOT, 'src/content/posts/fintech');
const ASSETS_DIR = path.join(OUT_DIR, 'assets');

function parseArgs(argv) {
  const out = { dryRun: false, limit: Infinity };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--limit') out.limit = Number(argv[++i]);
  }
  return out;
}

async function readJsonMap(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function readSlugMap() {
  return readJsonMap(SLUG_MAP_PATH);
}

async function readMetaMap() {
  // shape: { [title]: { slug?: string, description?: string } }
  return readJsonMap(META_MAP_PATH);
}

function stableIdFromString(input) {
  // lightweight non-crypto hash for stable filenames
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function autoSlugFromTitle(title) {
  // Best-effort fallback: keep it stable and filesystem-safe.
  const s = slugify(title, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@，。！？、“”《》：；（）【】]/g,
  });
  return s || `zh-${stableIdFromString(title)}`;
}

function ensureUniqueSlug(slug, used) {
  let s = slug;
  let n = 2;
  while (used.has(s)) {
    s = `${slug}-${n++}`;
  }
  used.add(s);
  return s;
}

async function parseIndex() {
  const raw = await fs.readFile(INDEX_PATH, 'utf8');
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  return lines.map(line => {
    const [title, url] = line.split(/\t+/);
    return { title: title?.trim(), url: (url ?? '').trim() || null };
  }).filter(x => x.title);
}

function turndownFromHtml(html, baseUrl) {
  const td = new TurndownService({ codeBlockStyle: 'fenced' });
  td.use(gfm);

  // Prefer real image sources (e.g., WeChat uses data-src with a 1x1 svg placeholder in src).
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

  // Preserve links as-is.
  td.addRule('absoluteLinks', {
    filter: ['a'],
    replacement: (content, node) => {
      const href = node.getAttribute('href') || '';
      // Resolve relative hrefs against baseUrl when possible.
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

function extractMainContent(html, url) {
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;
  const reader = new Readability(doc);
  const article = reader.parse();
  if (!article?.content) {
    // fallback: use body
    return { title: doc.title || '', contentHtml: doc.body?.innerHTML || '' };
  }
  return { title: article.title || doc.title || '', contentHtml: article.content };
}

function collectImageUrls(contentHtml, baseUrl) {
  const dom = new JSDOM(contentHtml, { url: baseUrl || 'https://example.com' });
  const doc = dom.window.document;
  const urls = [];
  for (const img of Array.from(doc.querySelectorAll('img'))) {
    // Prefer real image sources; WeChat often uses data-src and uses a data:image/svg+xml placeholder in src.
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
    } catch {
      // ignore
    }
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

async function generateSlugAndDescriptionWithLLM(title, markdown) {
  // Phase 1 placeholder: deterministic fallback.
  // Phase 2: replace with OpenClaw Skill (LLM) generation.
  const description = markdown
    .replace(/\s+/g, ' ')
    .replace(/[#>*_`\[\]]/g, '')
    .trim()
    .slice(0, 140);
  return { slug: autoSlugFromTitle(title), description: description || 'Fintech note.' };
}

function frontmatter({ title, description, pubDate, tags = ['fintech'], category = '金融', draft = false, sourceUrl }) {
  const safeDesc = description.replace(/\n/g, ' ').replace(/"/g, '\\"');
  const safeTitle = title.replace(/"/g, '\\"');
  const sourceLine = sourceUrl ? `source_url: "${sourceUrl}"\n` : '';
  return `---\ntitle: "${safeTitle}"\ndescription: "${safeDesc}"\npubDate: ${pubDate}\ncategory: "${category}"\ntags: [${tags.map(t => `"${t}"`).join(', ')}]\ndraft: ${draft}\n${sourceLine}---\n`;
}

async function fetchPageHtmlWithPlaywright(browser, url, cacheKey, contextOpts = {}) {
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.html`);
  try {
    const cached = await fs.readFile(cachePath, 'utf8');
    return { html: cached, fromCache: true };
  } catch {}

  // Use a persistent-ish context to reduce bot detection.
  const context = await browser.newContext({
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: {
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      Referer: 'https://www.google.com/',
    },
    ...contextOpts,
  });

  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });

  // Let dynamic content settle (some sites need longer).
  await page.waitForTimeout(2500);

  // Try to trigger lazy-loading.
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 1600);
    await page.waitForTimeout(700);
  }

  // Some sites (e.g., Zhihu) may return a JSON error body with HTTP 200.
  const contentType = String(await page.evaluate(() => document.contentType)).toLowerCase();
  if (contentType.includes('json')) {
    const raw = await page.evaluate(() => document.body?.innerText || '');
    await page.close();
    await context.close();
    throw new Error(`Fetched JSON instead of HTML for ${url}: ${raw.slice(0, 200)}`);
  }

  const html = await page.content();
  await page.close();
  await context.close();

  await fs.writeFile(cachePath, html, 'utf8');
  return { html, fromCache: false };
}

async function processWebTask(task, browser, slugMap, metaMap, usedSlugs, opts) {
  const { title, url } = task;
  // Cache key must avoid collisions when title slug is empty (Chinese titles etc.)
  const cacheKey = `${autoSlugFromTitle(title)}-${stableIdFromString(url)}`;
  // Prefer attached real-Chrome session (extension relay) when available.
  // In Phase 1, we only use it for Zhihu since headless scraping can be blocked.
  let html;
  try {
    if (url.includes('zhuanlan.zhihu.com')) {
      // Use browser tool via extension relay? (Not available inside this script)
      // We'll handle Zhihu separately in the orchestrating Skill.
      throw new Error('ZH_USE_RELAY');
    }
    ({ html } = await fetchPageHtmlWithPlaywright(browser, url, cacheKey));
  } catch (e) {
    if (e instanceof Error && e.message === 'ZH_USE_RELAY') throw e;
    throw e;
  }
  const { contentHtml } = extractMainContent(html, url);

  const mdBody = turndownFromHtml(contentHtml, url);

  // Guard: avoid generating invalid MDX from anti-bot/empty content.
  if (!mdBody || mdBody.trim().length < 200) {
    throw new Error(`Extracted content too small for: ${url}`);
  }

  // LLM slug/description (Phase 1: fallback or slug-map override)
  const llm = await generateSlugAndDescriptionWithLLM(title, mdBody);
  const meta = metaMap?.[title] || {};
  const baseSlug = meta.slug || slugMap[title] || llm.slug;
  const slug = ensureUniqueSlug(baseSlug, usedSlugs);

  const images = collectImageUrls(contentHtml, url);
  const postAssetsDir = path.join(ASSETS_DIR, slug);

  const replacements = new Map();
  if (!opts.dryRun) {
    await fs.mkdir(postAssetsDir, { recursive: true });
  }

  let idx = 1;
  for (const imgUrl of images) {
    const ext = guessExtFromUrl(imgUrl);
    const filename = `img-${String(idx++).padStart(2, '0')}.${ext}`;
    const outPath = path.join(postAssetsDir, filename);
    const rel = `./assets/${slug}/${filename}`;
    replacements.set(imgUrl, rel);
    if (!opts.dryRun) {
      try {
        await downloadFile(imgUrl, outPath);
      } catch (e) {
        // ignore failed images but keep original URL
        replacements.delete(imgUrl);
      }
    }
  }

  let finalMd = mdBody;
  // Replace image URLs in markdown
  for (const [abs, rel] of replacements.entries()) {
    finalMd = finalMd.split(abs).join(rel);
  }

  const pubDate = new Date().toISOString();
  const fm = frontmatter({
    title,
    description: meta.description || llm.description,
    pubDate,
    category: '金融',
    tags: ['fintech'],
    draft: false,
    sourceUrl: url,
  });

  const outPath = path.join(OUT_DIR, `${slug}.mdx`);
  const full = `${fm}\n${finalMd}\n\n---\n\n原文链接：${url}\n`;

  if (opts.dryRun) {
    return { slug, outPath, images: images.length };
  }
  await fs.writeFile(outPath, full, 'utf8');
  return { slug, outPath, images: images.length };
}

async function processLocalTask(task, usedSlugs, slugMap, metaMap, opts) {
  const { title } = task;
  const meta = metaMap?.[title] || {};
  const baseSlug = meta.slug || slugMap[title] || autoSlugFromTitle(title);
  const slug = ensureUniqueSlug(baseSlug, usedSlugs);

  const srcDir = path.join(ROOT, 'resources/fintech');
  // best-effort find file by prefix title
  const files = await fs.readdir(srcDir);
  const match = files.find(f => f.startsWith(title));
  if (!match) throw new Error(`No local file found for: ${title}`);

  const srcPath = path.join(srcDir, match);
  const ext = path.extname(match).toLowerCase();

  let body = '';
  if (ext === '.md' || ext === '.mdx') {
    body = await fs.readFile(srcPath, 'utf8');
  } else if (ext === '.pdf') {
    // Best-effort structured conversion via pdfjs-dist
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const pexec = promisify(execFile);
    const scriptPath = path.join(ROOT, 'scripts/fintech-pipeline/pdf_to_markdown.mjs');
    try {
      const { stdout } = await pexec('node', [scriptPath, srcPath], { maxBuffer: 20 * 1024 * 1024 });
      body = stdout.trim();
    } catch (e) {
      body = `> TODO(PDF): Convert PDF to markdown with structure.\n\nSource file: ${path.relative(ROOT, srcPath)}\n`;
    }
  } else {
    body = `> TODO: Convert ${ext} to markdown\n\nSource file: ${path.relative(ROOT, srcPath)}\n`;
  }

  const llm = await generateSlugAndDescriptionWithLLM(title, body);
  const pubDate = new Date().toISOString();
  const fm = frontmatter({
    title,
    description: meta.description || llm.description,
    pubDate,
    category: '金融',
    tags: ['fintech'],
    draft: false,
  });

  const outPath = path.join(OUT_DIR, `${slug}.mdx`);
  const full = `${fm}\n${body}\n\n---\n\n来源文件：${path.relative(ROOT, srcPath)}\n`;

  if (opts.dryRun) {
    return { slug, outPath, local: srcPath };
  }
  await fs.writeFile(outPath, full, 'utf8');
  return { slug, outPath, local: srcPath };
}

async function main() {
  const opts = parseArgs(process.argv);
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(ASSETS_DIR, { recursive: true });

  const slugMap = await readSlugMap();
  const metaMap = await readMetaMap();
  const tasks = (await parseIndex()).slice(0, opts.limit);

  const usedSlugs = new Set();
  const webTasks = tasks.filter(t => t.url);
  const localTasks = tasks.filter(t => !t.url);

  const limit = pLimit(2);

  const browser = await chromium.launch({ headless: true });
  try {
    const webResults = [];
    for (const t of webTasks) {
      try {
        webResults.push(await limit(() => processWebTask(t, browser, slugMap, metaMap, usedSlugs, opts)));
      } catch (e) {
        webResults.push({ title: t.title, url: t.url, error: e instanceof Error ? e.message : String(e) });
      }
    }

    const localResults = [];
    for (const t of localTasks) {
      try {
        localResults.push(await processLocalTask(t, usedSlugs, slugMap, metaMap, opts));
      } catch (e) {
        localResults.push({ title: t.title, error: e instanceof Error ? e.message : String(e) });
      }
    }

    console.log(JSON.stringify({
      dryRun: opts.dryRun,
      web: webResults,
      local: localResults,
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
