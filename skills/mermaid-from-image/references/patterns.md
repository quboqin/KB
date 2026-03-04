# Mermaid From Image Patterns

## Quick Decision Checklist

Use Mermaid when:
- the source is mainly nodes, edges, steps, and groups
- approximate visual fidelity is acceptable
- the diagram must stay editable as code

Use SVG instead when:
- exact spacing matters
- labels must sit at precise coordinates
- the image includes illustration-heavy composition
- Mermaid keeps fighting the layout after 2-3 structural attempts

## Pattern 1: Start from topology

```mermaid
flowchart LR
    A[Actor A] --> B[System]
    B --> C[Actor C]
```

Add styling only after the shape is correct.

## Pattern 2: Triangle layout

Use this when the source has one node above and two nodes below.

```mermaid
flowchart TB
    Top[Top Node]

    subgraph Bottom[ ]
      direction LR
      Left[Left Node]
      Gap[ ]
      Right[Right Node]
    end

    Top --- Gap
    Left --> Right
    Right --> Top
    Top --> Right
```

Notes:
- Make `Gap` transparent with `classDef`.
- Put detailed art inside `<img>` labels, not in plain text.

## Pattern 3: Local SVG node

```mermaid
flowchart LR
    User("<div style='text-align:center;width:160px;'>
      <img src='/assets/mermaid-icons/cardholder.svg' width='120' />
      <div style='margin-top:8px;font-size:22px;font-weight:700;'>持卡人</div>
    </div>")
```

Use this instead of emoji or icon fonts when visual stability matters.

## Pattern 4: Numbered edge label

```mermaid
flowchart LR
    A -- "<div style='display:flex;align-items:center;gap:10px;'>
      <span style='display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:999px;background:#ea7a2f;color:white;font-weight:700;'>1</span>
      <span style='font-size:18px;font-weight:600;'>发送请求</span>
    </div>" --> B
```

Keep the text short. Long edge labels distort spacing.

## Pattern 5: Concept node with fixed content baked into SVG

If a node contains logos, a title, and several lines of explanatory text, create one SVG that already contains the full composition and embed it as a single image.

Reason:
- Mermaid respects the HTML box size but does not give fine-grained control over internal composition.
- Baking the internal composition into SVG keeps the outer graph editable while fixing the inner artwork.

## Pattern 6: Transparent spacer node

```mermaid
flowchart TB
    A[Top]
    Gap[ ]
    B[Left]
    C[Right]

    classDef ghost fill:transparent,stroke:transparent,color:transparent;
    class Gap ghost;
    A --- Gap
```

Use this when Mermaid needs a central anchor for the row beneath or above another node.

## Common Failure Modes

### Icons disappear

Likely causes:
- Font Awesome CSS is not loaded
- the renderer strips HTML or `foreignObject`
- the environment blocks external assets

Safer fallback:
- use local SVG with `<img>`

### A node becomes a tall side panel

Likely causes:
- too much text inside the node HTML
- width is too narrow for the content
- Mermaid placed the node in a direction that magnifies its height

Fixes:
- switch graph direction
- shorten text
- bake the whole panel into SVG

### The graph becomes a horizontal line instead of a triangle

Likely causes:
- using `flowchart LR` for a `top + bottom row` composition
- relying only on invisible links

Fixes:
- switch to `flowchart TB`
- use a bottom `subgraph` with `direction LR`
- connect the top node to a spacer node, not directly to both bottom nodes
