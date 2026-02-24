# 🧠 KB with AI

个人知识库博客，探索 AI 与知识管理的边界。

**Tech Stack:** Astro 4 · MDX · Tailwind CSS · Pagefind · Giscus

## 快速开始

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # 构建 + 生成搜索索引
npm run preview   # 预览生产构建
```

## 添加文章

在 `src/content/posts/` 新建 `.mdx` 文件：

```mdx
---
title: "文章标题"
description: "摘要"
pubDate: 2024-01-01
tags: ["标签1", "标签2"]
# heroImage: "/images/cover.jpg"   # 可选封面
# draft: true                       # 草稿（不显示）
---

正文内容...
```

## 配置

**1. 修改站点地址**

`astro.config.mjs` 中的 `site` 字段改为你的域名。

**2. 配置 Giscus 评论**

```bash
cp .env.example .env
# 填写 GISCUS_REPO / GISCUS_REPO_ID / GISCUS_CATEGORY / GISCUS_CATEGORY_ID
# 在 https://giscus.app 获取这些值
```

## 部署

| 平台 | 配置文件 | 构建命令 | 输出目录 |
|------|---------|---------|---------|
| Vercel | `vercel.json` | `npm run build` | `dist` |
| Cloudflare Pages | `_headers` | `npm run build` | `dist` |

## 功能特性

- 深色 / 浅色模式（系统偏好 + 手动切换）
- 全文搜索（Pagefind，`⌘K` 触发）
- 文章目录（TOC，桌面端悬浮侧边栏）
- 阅读进度条
- 相关文章推荐（基于标签相似度）
- Mermaid 流程图渲染
- Giscus 评论（基于 GitHub Discussions）
- RSS Feed（`/rss.xml`）
- 标签聚合页
