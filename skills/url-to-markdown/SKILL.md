---
name: url-to-markdown
description: "Fetch a URL and convert its content to clean Markdown. Preserves all hyperlinks and images. Detects diagram/chart images (flowcharts, architecture, sequence diagrams) and converts them to Mermaid blocks. Use when the user provides a URL and wants to save, archive, or summarise content as Markdown."
argument-hint: "<url> [-o output/path.md] [--wait]"
---

# url-to-markdown

## Purpose

Given a URL, produce a Markdown document that:

1. **Captures** the full text content, with title and key metadata in YAML front matter
2. **Preserves** every hyperlink in `[link text](https://...)` form
3. **Keeps** images as `![alt](original_url)` where the image is decorative, a photo, or a logo
4. **Converts** diagram/chart images to Mermaid code blocks where the image encodes
   structural information (flow, sequence, architecture, process, org chart, etc.)

---

## Workflow

### Step 1 — Choose a fetch strategy

Work down this priority list and stop at the first successful result:

| Priority | Method | When to use |
|----------|--------|-------------|
| 1 | **WebFetch** (built-in) | Static pages, docs, blog posts |
| 2 | **Jina Reader** `r.jina.ai/<url>` | When WebFetch returns empty/partial content or a JS-heavy SPA shell |
| 3 | **Playwright MCP** | When login is required, content needs interaction, or both methods above fail |

**Using Jina Reader:**
```
WebFetch("https://r.jina.ai/<original_url>", prompt="Return the full content")
```
Jina renders the page server-side and returns clean Markdown automatically.

**Using Playwright MCP (if installed):**
```
mcp__playwright__browser_navigate(url=...)
mcp__playwright__browser_snapshot()          # gets accessibility tree
```
Wait for network idle, then grab text content from the snapshot.

**Fallback note:** If the URL is behind a paywall or login wall and neither Jina nor Playwright can retrieve it, tell the user clearly and stop — do not fabricate content.

---

### Step 2 — Extract and clean the content

After fetching, clean the raw text:

- **Remove** navigation bars, cookie banners, sidebars, footers, subscription popups,
  "related posts" sections, and social share widgets
- **Keep** all body text, headings, blockquotes, lists, tables, and code blocks
- **Preserve** inline code and code blocks exactly (do not reformat)
- **Preserve** all hyperlinks: `[link text](https://...)` — never strip or shorten URLs
- **Preserve** all images as `![alt text](image_url)` in a first pass

If the page is a Twitter/X thread, reconstruct the thread order from tweet IDs or timestamps.

---

### Step 3 — Classify each image

For every `![…](image_url)` found in the content, decide:

**Convert to Mermaid when:**
- The image contains boxes, arrows, nodes, edges, flowcharts, sequence steps, org charts,
  state machines, data pipelines, or architecture diagrams
- The image encodes structured relationships that can be expressed textually
- The alt text or surrounding text refers to "diagram", "flow", "architecture", "process",
  "sequence", or "chart"
- The image filename contains keywords like `flow`, `arch`, `diagram`, `chart`, `sequence`

**Keep as image link when:**
- The image is a photo, illustration, logo, icon, or UI screenshot
- The image contains dense typography (slide decks, infographic text-walls)
- The image URL ends in `.gif`, `.ico`, `.svg` (for logos/icons)
- The alt text or surrounding context indicates it is decorative or a product screenshot

**For unclear cases:** Fetch the image URL via `WebFetch` or the `Read` tool (if local)
to visually inspect it, then apply the Mermaid-from-image decision rules below.

---

### Step 4 — Convert diagram images to Mermaid

When a diagram image should become Mermaid, follow the
`mermaid-from-image` skill workflow (available at `skills/mermaid-from-image/SKILL.md`).

**Quick rules:**

1. **Classify diagram type first:**
   - Process/pipeline → `flowchart LR`
   - Top-down hierarchy → `flowchart TB`
   - Temporal sequence / request-response → `sequenceDiagram`
   - States and transitions → `stateDiagram-v2`
   - Entity relationships → `erDiagram`

2. **Build in layers:**
   - Nodes and edges (topology) → coarse layout → labels → styling

3. **Keep a reference comment** above the block:
   ```markdown
   <!-- source image: https://original.url/image.png -->
   ```mermaid
   flowchart LR
       A[Source] --> B[Process] --> C[Result]
   ```
   ```

4. **If the image truly cannot be Mermaid** (too many diagonal arrows, pixel-precise layout,
   brand illustrations), keep `![alt](url)` and add a brief `<!-- could not convert to Mermaid: reason -->` comment.

---

### Step 5 — Assemble the output document

Produce a single Markdown file with this structure:

```markdown
---
title: "Exact page title"
url: "https://original.url"
captured_at: "YYYY-MM-DD"
author: "Author name (if found)"
description: "Meta description or first sentence (if found)"
tags: []
---

# Page Title

[body content here, with preserved links and Mermaid-converted diagrams]
```

**Output path convention** (if saving to disk):

```
url-to-markdown/<domain>/<slug>.md
```

Where `slug` is derived from the page title (lowercased, spaces → hyphens, max 60 chars).

If the user specified a path, use that instead.

---

## Examples

### Basic usage

```
/url-to-markdown https://blog.example.com/my-post
```

Claude will:
1. Try WebFetch → if thin, try Jina Reader
2. Strip nav/footer noise
3. Scan for images → convert architecture diagram PNGs to Mermaid
4. Write to `url-to-markdown/blog.example.com/my-post.md`

### Saving to a custom path

```
/url-to-markdown https://docs.anthropic.com/some-page -o resources/anthropic-docs.md
```

### Login-required page

```
/url-to-markdown https://x.com/user/status/123456 --wait
```

Claude will use Playwright MCP in wait mode: open the page, pause for the user to log in,
then capture once the user presses Enter.

---

## Quality Checklist

Before finalising the output, verify:

- [ ] Title and URL are in front matter
- [ ] All headings preserved with correct `#` levels
- [ ] All hyperlinks `[link text](https://...)` preserved — nothing stripped
- [ ] Diagram images replaced with working Mermaid blocks
- [ ] Decorative images kept as markdown image syntax
- [ ] Code blocks have correct language fences
- [ ] No navigation / footer noise in the body
- [ ] Output path matches the convention or user-specified path

---

## References

- `skills/mermaid-from-image/SKILL.md` — detailed Mermaid conversion rules and patterns
- `skills/mermaid-from-image/references/patterns.md` — Mermaid code skeletons
- `references/fetch-strategies.md` — extended notes on each fetch method
