#!/usr/bin/env python3
"""Convert a PDF to Markdown using pymupdf4llm (layout + tables + images).

Usage:
  pdf_to_markdown_pymupdf4llm.py <pdf_path> <assets_dir_abs> <assets_dir_rel>

- Writes extracted images into assets_dir_abs
- Returns markdown to stdout, with image links rewritten to assets_dir_rel/<file>
"""

import os
import re
import sys

import contextlib
import importlib
import io


def main():
    if len(sys.argv) != 4:
        print(
            "Usage: pdf_to_markdown_pymupdf4llm.py <pdf_path> <assets_dir_abs> <assets_dir_rel>",
            file=sys.stderr,
        )
        sys.exit(2)

    pdf_path = sys.argv[1]
    assets_abs = sys.argv[2]
    assets_rel = sys.argv[3].rstrip("/")

    os.makedirs(assets_abs, exist_ok=True)

    # pymupdf4llm prints suggestions to stdout at import-time and run-time; suppress them.
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        pymupdf4llm = importlib.import_module("pymupdf4llm")
        md = pymupdf4llm.to_markdown(
            pdf_path,
            write_images=True,
            image_path=assets_abs,
            image_format="png",
            dpi=180,
            table_strategy="lines_strict",
        )

    # pymupdf4llm outputs image links like: ![](image.png) or ![](images/image.png)
    # Rewrite to assets_rel/<filename> (only for local image filenames)
    def repl(m):
        url = m.group(1)
        # skip remote
        if url.startswith("http") or url.startswith("data:"):
            return m.group(0)
        fname = os.path.basename(url)
        return f"![]({assets_rel}/{fname})"

    md = re.sub(r"!\[[^\]]*\]\(([^)]+)\)", repl, md)

    # MDX safety:
    # - avoid lines with only '...' which MDX treats as JS spread
    md = re.sub(r"^\.\.\.$", "（省略）", md, flags=re.M)
    # - JSX requires self-closing <br />
    md = md.replace("<br>", "<br />")

    sys.stdout.write(md)


if __name__ == "__main__":
    main()
