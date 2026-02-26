# Fintech pipeline

Goal: Convert `resources/fintech/index.txt` resources (web + local docs) into Astro blog posts under `src/content/posts/fintech/`.

This is Phase 1 (script test). Phase 2 will wrap this script into an OpenClaw Skill + pipeline.

## Run

```bash
node scripts/fintech-pipeline/run.mjs --limit 3 --dry-run
node scripts/fintech-pipeline/run.mjs --limit 3
```

## Slug mapping

Optional overrides: `resources/fintech/slug-map.json`

## Cache

HTML cache: `resources/_cache/fintech/`
