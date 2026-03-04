---
title: "OpenClaw 上网生态全景扫描（摘要）"
date: 2026-03-02
category: lessons
priority: 🟡
status: active
last_verified: 2026-03-02
tags: [openclaw, browser, mcp, web, automation, infrastructure]
source_url: "https://x.com/lijiuer92/status/2028141123953442822"
---

## 一句话总结

把 Agent 上网能力拆成一条“**搜索发现 → 内容提取 → 浏览器交互 →（可选）链上交易**”的管道，并给出 OpenClaw 在浏览器控制层的架构、痛点与外部生态选型建议。

## 核心观点（按文章结构）

### 1) OpenClaw 端口/服务设计：一个 gateway.port 推导全系统

- 以 `gateway.port`（默认 18789）为基数，派生：Bridge(18790)、Control Service(18791)、CDP Relay(18792)、以及托管浏览器 CDP(18800-18899)。
- 优点：确定性强（知道一个端口能推出全套）。
- 缺点：若某些组件硬编码端口（文中提到 CLI 硬编码 18791），改端口会引发连锁失败。

### 2) 三种浏览器控制模式（覆盖面 vs 稳定性权衡）

1. **OpenClaw 托管浏览器**：干净隔离环境，适合自动化任务。
2. **Chrome 扩展 Relay**：价值在“真实登录态/cookies”，但也是最脆弱环节（MV3 SW 生命周期、WS 断连、标签页状态丢失、握手缺陷等）。
3. **远程 CDP**：面向分布式/云端沙箱。

### 3) 快照系统是关键创新：语义快照 > 截图

- 传统“截图喂视觉模型”成本高（图像 base64 可轻松数 MB，上下文爆炸）。
- OpenClaw 采用 **Semantic Snapshot**：把页面变成结构化文本 + 元素 ref（如 `button "Sign In" [ref=e1]`），再基于 ref 操作。
- 快照格式：
  - **AI 模式**：默认，e1/e12 引用（最大约 80k 字符）
  - **ARIA 模式**：可访问性树（ax1/ax2）

### 4) 行业路线判断：Hybrid（a11y tree + 选择性视觉）正在赢

- 纯视觉（截图+VLM）：通用但慢贵；
- 纯 DOM/a11y：快省但 Shadow DOM 是盲点；
- Hybrid：兼得成本与鲁棒性，成为主流资金/产品路线。

### 5) 成本分层：别用浏览器做搜索/提取能做的事

- 上游用便宜的搜索 API（Tavily/Exa/Brave/SearXNG 等）
- 已知 URL 用提取工具（Firecrawl/Jina Reader/Crawl4AI）
- **必须交互/登录**时才启动浏览器

### 6) 可靠性现实：基准好看 ≠ 生产可靠

- WebVoyager 等基准分数会在真实动态站点下降（文中举例 ~90% → 更接近基线）。
- 高频稳定任务：手写 Playwright 脚本仍接近最优（完成率高、成本近乎 0）。
- Agent 自动化价值更多在“减少任务特定脚本”，而不是在每个任务都比脚本更稳。

## 对我们当前配置的直接启示（可执行原则）

- **默认优先：搜索/提取 → 再浏览器交互**，把“浏览器”当作最贵的最后一步。
- 对需要登录态的站点（如 X、知乎），优先用 **Chrome Relay**，但要接受它更脆弱，需要重连/状态管理。
- 对高频确定性任务，优先写 Playwright 脚本/固定流程，而不是完全自治。

## 补充阅读

- Claude Code 网页抓取：5 种方案怎么选？（抓取稿+要点）
  - `memory/lessons/claude-code-web-scraping-5-options.md`
  - Source: https://x.com/yanhua1010/status/2029042247577288915
