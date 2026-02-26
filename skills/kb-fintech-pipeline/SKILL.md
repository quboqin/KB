---
name: kb-fintech-pipeline
description: Generate SEO-friendly fintech posts for this Astro blog from ~/magic/KB/resources/fintech/index.txt by (1) generating short English slugs + one-line descriptions with the model, then (2) scraping web sources via browser (Chrome relay for Zhihu; Playwright for others) and converting local PDFs/MDs to Markdown, downloading images into per-post assets folders, and writing posts to src/content/posts/fintech/. Use when running or maintaining the fintech ingestion pipeline, fixing scrape/conversion issues, or preparing a full run before git commit + Vercel deploy.
---

# kb-fintech-pipeline

## Workflow

### 0) Files + conventions

- Input index: `~/magic/KB/resources/fintech/index.txt`
- Optional overrides:
  - Slug only: `~/magic/KB/resources/fintech/slug-map.json`
  - Slug + description: `~/magic/KB/resources/fintech/meta-map.json` (preferred)
- Cache: `~/magic/KB/resources/_cache/fintech/`
- Output posts: `~/magic/KB/src/content/posts/fintech/<slug>.mdx`
- Output images: `~/magic/KB/src/content/posts/fintech/assets/<slug>/...`

Astro schema requirements (from `src/content/config.ts`): frontmatter must include:
- `title`, `description`, `pubDate`, `category` (use `"金融"`), plus `tags`.

### 1) Generate per-post metadata (model step)

Goal: fill `meta-map.json` with `{ title: { slug, description } }`.

- Use the model to generate a **short English slug** and a **1-sentence Chinese description**.
- Follow constraints in `references/prompts.md`.
- If a title already has a stable slug in `meta-map.json`, do not change it unless requested.

### 2) Scrape/convert + write posts (deterministic step)

Run the script (Playwright-based) for most sources:

```bash
cd ~/magic/KB
node scripts/fintech-pipeline/run.mjs --dry-run
node scripts/fintech-pipeline/run.mjs
```

Notes:
- This script currently skips Zhihu on purpose (expects a browser-attached session).

### 3) Zhihu special-case (Chrome relay)

When a Zhihu URL is blocked in headless scraping:

1) Ask user to attach the tab with OpenClaw Browser Relay (badge ON).
2) Use `browser(profile="chrome")` to read the DOM / print to PDF.
3) Convert the captured HTML/PDF to markdown and place it under the correct slug.

(Phase 1 implementation: exporting to PDF and extracting text is acceptable; prefer DOM HTML extraction when possible.)

### 4) Local test

```bash
cd ~/magic/KB
npm run build
```

Build must pass before committing.

### 5) After user approval

- Commit + push
- Deploy to Vercel

## References

- Prompts: `references/prompts.md`
