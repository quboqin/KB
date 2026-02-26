# 🧠 KB with AI (Knowledge Base) - Gemini Project Context

This project is a personal knowledge base and blog focused on exploring the boundaries of AI and knowledge management, specifically within the domains of fintech, credit, and digital finance.

## 🏗️ Project Overview

- **Purpose:** A personal knowledge repository for financial credit analysis, fintech operations, and AI research.
- **Framework:** [Astro 4](https://astro.build/) (Static Site Generator).
- **Content Format:** [MDX](https://mdxjs.com/) for rich, interactive content.
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with `@tailwindcss/typography`.
- **Search:** [Pagefind](https://pagefind.app/) for fast, static full-text search.
- **Comments:** [Giscus](https://giscus.app/) (GitHub Discussions-backed).
- **Diagrams:** [Mermaid.js](https://mermaid.js.org/) for rendering flowcharts and diagrams.

## 🚀 Key Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Start local development server at `http://localhost:4321` |
| `npm run build` | Build the site for production and generate Pagefind index |
| `npm run preview` | Preview the production build locally |
| `npx pagefind --site dist` | Manually generate search index (usually part of build) |

## 📂 Project Structure

- `src/content/posts/`: Primary directory for MDX articles.
- `src/components/`: Astro components organized by function (blog, layout, ui, widgets).
- `src/layouts/`: Base and post-specific layouts.
- `src/utils/`: Helper functions for post filtering, sorting, and metadata (tags/categories).
- `src/pages/`: Routing logic for categories, tags, and individual posts.

## 📝 Content Guidelines

### Content Schema (`src/content/config.ts`)
All posts in `src/content/posts/` must follow this frontmatter structure:

```yaml
title: string
description: string
pubDate: date
updatedDate: date (optional)
heroImage: string (optional)
tags: string[] (default: [])
category: '技术' | '金融' | 'AI' | '生活' | '其他' (default: '其他')
draft: boolean (default: false)
```

### Adding New Content
1. Create a `.mdx` file in `src/content/posts/` (or a subdirectory).
2. Ensure the frontmatter matches the schema.
3. Use Mermaid for diagrams if needed (check `PostLayout.astro` for integration).

## 🛠️ Development Conventions

- **Styling:** Use Tailwind utility classes. Global variables and base styles are in `src/styles/global.css`.
- **Types:** Use `zod` for content validation as defined in `src/content/config.ts`.
- **Search:** Pagefind is initialized on `DOMContentLoaded`. Search UI is in `src/components/ui/SearchButton.astro`.
- **Comments:** Configured via `.env` variables (refer to `.env.example`).

## 🌐 Deployment
- **Vercel:** Configuration in `vercel.json`.
- **Cloudflare Pages:** Configuration in `_headers`.
- **Base URL:** Defined as `site` in `astro.config.mjs`.
