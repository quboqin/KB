# Prompts (slug + description)

Use these prompts when generating per-post metadata with the model.

## Slug (short English)

Input: Chinese title + (optional) source URL.

Constraints:
- 2–6 words, lowercase, hyphen-separated
- ASCII letters/digits only
- Prefer fintech/payment/credit terminology
- Avoid generic `post`, avoid stopwords like `the`, `a`, `of` unless needed
- Must be stable: same title should produce same slug

Example output: `in-loan-management-silent-war`

## Description (one sentence)

Input: The article markdown body (or extracted text).

Constraints:
- Chinese is OK (recommended)
- 1 sentence, 20–60 Chinese characters (or <= 140 chars)
- Must describe what the reader will learn
- No marketing fluff

Example: `解释 MOB 与 Vintage 的口径，并用单笔/多笔示例说明如何构建 Vintage 曲线。`
