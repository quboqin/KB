# AGENTS.md

## Local Skills

This repository includes the following local skills under `./skills/`.

### Available skills
- `kb-fintech-pipeline`: Generate and maintain SEO-friendly fintech posts for this Astro blog from local source indexes, scrape/convert source material, place assets under post folders, and write MDX posts under `src/content/posts/fintech/`. Use when running or fixing the fintech ingestion pipeline.
- `mermaid-from-image`: Recreate or approximate diagrams from screenshots, PNGs, or reference images using Mermaid. Use when converting an existing visual diagram into Mermaid, improving Mermaid visual fidelity to match an image, debugging missing icons or broken Mermaid layout, or deciding when Mermaid should be replaced by SVG.

## How To Use Local Skills

- Read the target skill's `SKILL.md` before using it.
- Load files under `references/` only when they are needed for the current task.
- Prefer local assets or scripts bundled with the skill over ad hoc recreation.
- Keep Mermaid work pragmatic: if exact visual fidelity matters more than code-editability, switch from Mermaid to SVG.
