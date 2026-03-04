---
name: mermaid-from-image
description: Recreate or approximate diagrams from screenshots, PNGs, or reference images using Mermaid. Use when Codex needs to convert an existing visual diagram into Mermaid, improve the visual fidelity of a Mermaid diagram to match an image, debug why Mermaid icons or layout differ from a reference, or decide when Mermaid should be replaced by SVG instead of forcing an exact replica.
---

# mermaid-from-image

## Workflow

### 1) Decide whether Mermaid is the right target

Use Mermaid when the source image is mostly:
- process flow
- sequence / authorization flow
- boxes, arrows, labels, numbered steps
- simple icons that can be approximated with local SVGs or inline HTML

Do not force Mermaid when the source image depends on:
- pixel-precise positioning
- many diagonal arrows with exact label placement
- dense decorative illustration
- brand logos or figures that must match exactly

If the image must be very close to the source, prefer SVG. Mermaid is a layout engine, not a freeform canvas.

### 2) Classify the source diagram before writing code

Pick the Mermaid family based on what matters most:
- `sequenceDiagram`: use when timing/order is the priority and styling is secondary
- `flowchart`: use when visual layout, icons, grouping, and styling matter most
- `flowchart TB`: use when the image has top-to-bottom structure or a triangle layout with a top anchor node
- `flowchart LR`: use when the image is a left-to-right pipeline

Rule of thumb:
- Start from `flowchart`, not `sequenceDiagram`, when the user wants the result to look like the original image.

### 3) Build the diagram in layers

Work in this order:
1. Reproduce topology only: nodes and directed edges
2. Lock coarse layout: `TB` vs `LR`, `subgraph`, invisible links `~~~`, spacer nodes
3. Replace generic nodes with richer HTML labels
4. Replace unstable icon fonts or emoji with local SVG files and `<img>` tags
5. Add classes, line width, colors, dashed borders, and numbered labels
6. Compare with the source image and simplify any part that is making Mermaid fight back

### 4) Prefer local images over icon fonts for stable rendering

If a node needs a distinctive person, bank, store, or logo-like visual:
- create or store a local SVG in `public/assets/...`
- reference it with `<img src='/assets/.../icon.svg' width='...' />`
- keep node text outside the image when only the icon must be fixed

Use Font Awesome only when all of these are true:
- the rendering environment loads the Font Awesome CSS
- visual accuracy is not critical
- fallback to empty icon glyphs is acceptable

In this repo, Mermaid is rendered client-side and allows inline HTML because `securityLevel: 'loose'` is set in `src/layouts/PostLayout.astro`. If HTML-based icons render blank, first verify that the supporting CSS is actually loaded.

### 5) Keep text from breaking the layout

Long text inside Mermaid nodes expands boxes aggressively. To control this:
- move verbose explanatory text into a dedicated SVG when the whole panel should stay fixed
- use short labels in Mermaid edge text and let the image carry the heavy visual detail
- split long labels with `<br/>`
- narrow node width explicitly in the HTML wrapper

If one node becomes a tall side panel, Mermaid is usually respecting the HTML size you gave it. Move that content out of Mermaid text and into a fixed image.

### 6) Use layout constraints deliberately

Useful techniques:
- `subgraph` to create a stable row or column
- `direction LR` or `direction TB` inside a subgraph to constrain a local area
- invisible links `~~~` to bias node placement
- transparent spacer nodes when a center anchor is needed
- `flowchart TB` plus a bottom-row subgraph for triangle layouts

Pattern that worked well today:
- top node for the card network
- bottom `subgraph` with left actor, spacer, right actor
- one invisible edge from the top node to the spacer node

### 7) Standardize styling after layout is stable

Do not start with styling. First make the structure stable.

After layout is acceptable:
- use `classDef` for node families
- use `linkStyle` for line color and thickness
- prefer plain-text edge labels such as `1 使用银行卡支付` or `3 确认或拒绝<br/>交易授权` so numbers reliably appear on the line
- use inline HTML edge labels only when the renderer has already proven stable with `foreignObject` content on links
- use dashed borders only on nodes that need to read as a conceptual system, not a real actor

For line text and step numbers:
- default to plain text for labels on lines
- keep the step number at the start of the label
- use `<br/>` only for line breaks, not complex layout
- treat HTML circles, flex rows, or badge-like link labels as high-risk enhancements
- if numbers disappear from lines, revert to plain-text labels first

### 8) Debug systematically when the result looks wrong

If the result diverges from the source image:
- check whether the wrong Mermaid diagram type was chosen
- inspect whether a long HTML node is forcing layout expansion
- replace icon fonts or emoji with local SVGs
- switch `LR` to `TB` or vice versa instead of adding more invisible edges blindly
- move explanatory text from Mermaid HTML into an asset image
- stop when Mermaid is the wrong tool and switch to SVG

## Repo Notes

For this repo:
- Mermaid blocks live in MDX content
- Rendering happens in `src/layouts/PostLayout.astro`
- Inline HTML works because `securityLevel: 'loose'` is enabled
- Local Mermaid image assets can live under `public/assets/mermaid-icons/`

Related example files from this session:
- `src/content/posts/fintech/bank-card-business-overview.mdx`
- `public/assets/mermaid-icons/cardholder.svg`
- `public/assets/mermaid-icons/merchant.svg`
- `public/assets/mermaid-icons/bank.svg`
- `public/assets/mermaid-icons/network.svg`
- `public/assets/mermaid-icons/network-three-party.svg`

## References

Read `references/patterns.md` when you need:
- a starting Mermaid skeleton for image-to-diagram work
- layout-control snippets
- a quick checklist for deciding between Mermaid and SVG
