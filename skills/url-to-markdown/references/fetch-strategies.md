# Fetch Strategy Reference

## Tier 1 — WebFetch (Built-in)

**Tool:** `WebFetch(url, prompt)`

**Best for:**
- Static HTML: blog posts, documentation, GitHub README files, news articles
- Any page that renders meaningful content without JavaScript execution
- Fast iterative testing

**Limitations:**
- No JavaScript execution → SPA shells will return near-empty content
- No cookies/session → login-protected content will redirect or show empty
- No scrolling → lazy-loaded content may not appear
- Built-in 15-minute cache (helpful for retries, annoying for live-updating pages)

**When to escalate to Jina:** If the fetched content is shorter than ~300 words and the
page title suggests substantive content, try Jina before Playwright.

---

## Tier 2 — Jina Reader (`r.jina.ai`)

**Usage:**
```
WebFetch("https://r.jina.ai/https://target.example.com/page", "Return full content")
```

**How it works:**
Jina Reader renders the page server-side (including JavaScript), then returns a
clean Markdown version. It's significantly better than raw WebFetch for:
- React/Vue/Next.js SPAs
- News sites with heavy ad frameworks
- Twitter/X (limited — API-gated content still blocked)

**Limitations:**
- External third-party service — avoid for confidential URLs
- Cannot handle login flows or cookie-based sessions
- Rate limits apply for high-frequency use
- Some large pages are truncated

**Jina-specific tips:**
- Append `?with_links_summary=true` to get all URLs at the bottom (useful for link extraction)
- Append `?target_selector=article` to focus on article content only

---

## Tier 3 — Playwright MCP

**Prerequisite:** Playwright MCP must be installed and configured.
Check with: `mcp__plugin_playwright_playwright__browser_navigate` availability.

**Usage pattern:**
```
1. mcp__playwright__browser_navigate(url=<target>)
2. mcp__playwright__browser_wait_for(event="networkidle")
3. mcp__playwright__browser_snapshot()   → returns accessibility tree
4. Extract text from snapshot, reconstruct markdown
```

**Wait mode (for login walls):**
```
1. mcp__playwright__browser_navigate(url=<target>)
2. Tell user: "Page opened. Please log in, then reply 'ready'."
3. Wait for user message
4. mcp__playwright__browser_snapshot()
```

**Best for:**
- Twitter/X threads, Weibo, WeChat articles (when authenticated)
- Paywalled content the user has access to
- Pages that require clicking "Accept cookies" or expanding "Read more"
- SPAs where Jina also fails

**Screenshot → Mermaid path:**
If a diagram is rendered as a canvas element (not an `<img>` tag), take a screenshot:
```
mcp__playwright__browser_take_screenshot()
```
Then apply the `mermaid-from-image` skill to the screenshot.

---

## Comparing Methods: Quick Reference

| Feature | WebFetch | Jina Reader | Playwright MCP |
|---------|----------|-------------|----------------|
| JS execution | ❌ | ✅ (server) | ✅ (real browser) |
| Login support | ❌ | ❌ | ✅ (manual) |
| Link preservation | ✅ | ✅ | Manual |
| Image URLs | ✅ | ✅ | Manual |
| Speed | Fast | Medium | Slow |
| Privacy | Local | External | Local |
| Cost | Free | Free/Rate-limited | Free |
| Setup required | None | None | Playwright MCP |

---

## Twitter/X Specific Strategy

X content is particularly hard to scrape due to API gating. Priority order:

1. Try Jina Reader — works for public tweets sometimes
2. Try `r.jina.ai` with the tweet URL
3. If both fail, use Playwright with user's existing Chrome session
4. As fallback: ask user to paste the tweet text directly

For threads: reconstruct order by tweet timestamp or thread reply chain visible in snapshot.

---

## Handling Paywalls

If content is behind a paywall:

1. Try Jina Reader — some sites have lenient metered access
2. Check if user has Playwright MCP available and is willing to log in
3. If the user has an alternative URL (archive.org, outline.com), try that
4. **Never fabricate** content that wasn't retrieved

Safe alternative URLs to try (user must provide or confirm):
- `https://archive.org/wayback/available?url=<target>`
- `https://12ft.io/<target>` (public posts only — not paywalled content)
