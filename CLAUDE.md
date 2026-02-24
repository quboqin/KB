# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # dev server at http://localhost:4321
npm run build     # astro build + pagefind indexing (required for search)
npm run preview   # preview production build
```

## Architecture

**Framework:** Astro 4 (static output) + MDX + Tailwind CSS v3 + `@tailwindcss/typography`

### Content pipeline
- Posts live in `src/content/posts/*.mdx`
- Schema defined in `src/content/config.ts` (Zod) — required fields: `title`, `description`, `pubDate`; optional: `updatedDate`, `heroImage`, `tags[]`, `draft`
- `src/utils/posts.ts` exports `getAllPosts()`, `getRelatedPosts()`, `getAllTags()` — all filter out `draft: true`

### Layouts
- `BaseLayout.astro` — wraps every page; injects dark-mode init script (`is:inline`) before paint to avoid flash
- `PostLayout.astro` — extends BaseLayout; adds `ReadingProgress`, sidebar `TOC`, `RelatedPosts`, `GiscusComments`, and client-side Mermaid rendering

### Styling rules
- Syntax highlighting is **disabled** (`syntaxHighlight: false` in both `mdx()` and `markdown` config)
- Code blocks styled via plain CSS in `src/styles/global.css`: black background `#0d0d0d`, white text
- Mermaid diagrams in MDX (` ```mermaid `) are rendered client-side via `mermaid` npm package in PostLayout
- Dark mode uses Tailwind `darkMode: 'class'`; toggled by `ThemeToggle.astro` with `localStorage` persistence

### Known issue
`@astrojs/sitemap` is installed but **not** in `astro.config.mjs` — it throws at build time with astro 4.15 + sitemap 3.7. Re-add after upgrading either package.

### Deployment
- **Vercel:** `vercel.json` present; build command is `npm run build`
- **Cloudflare Pages:** `_headers` present; same build command, output dir `dist`
- Update `site` in `astro.config.mjs` before deploying

### Giscus comments
Configure via `.env` (copy `.env.example`): `GISCUS_REPO`, `GISCUS_REPO_ID`, `GISCUS_CATEGORY`, `GISCUS_CATEGORY_ID`

### Search
Pagefind runs as part of `npm run build`. Search is not available in `npm run dev` — the `/search` page requires the built `dist/pagefind/` assets.
