#!/usr/bin/env python3
"""Build a ready-to-read TikTok script as a Word (.docx) document.

Usage:
    python3 scripts/make-tiktok-script-doc.py path/to/script.json

The JSON describes one day's script. Schema:
{
  "day":   "Friday 27 June 2026",
  "title": "Explain Your Job to a 5-Year-Old with ChatGPT",
  "url":   "https://opqai.solutions/workflows/<slug>",
  "slug":  "<slug>",
  "meta":  "~7 min  ·  Beginner  ·  Free (ChatGPT)  ·  Score 10/10",
  "why":   "One line on why this one today.",
  "beats": [
     {"label": "HOOK  (0-3s)",
      "direction": "On-screen text: ...",
      "say": "What you say to camera.",
      "prompt": "Optional copy-paste prompt shown as a code block."},
     ...
  ],
  "caption":  "TikTok caption line.",
  "hashtags": "#ai #chatgpt ..."
}

Output: docs/scripts/<date>-<slug>.docx  (path printed to stdout)
"""
import json
import os
import sys
from datetime import date

from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

PINK = (0x99, 0x00, 0x55)
GREY = (0x66, 0x66, 0x66)


def color(par, rgb):
    for run in par.runs:
        run.font.color.rgb = RGBColor(*rgb)


def build(s, repo_root):
    doc = Document()
    doc.styles["Normal"].font.name = "Calibri"
    doc.styles["Normal"].font.size = Pt(11)

    head = doc.add_paragraph()
    head.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = head.add_run("TIKTOK SCRIPT")
    r.bold = True
    r.font.size = Pt(14)
    color(head, PINK)

    day = doc.add_paragraph()
    day.alignment = WD_ALIGN_PARAGRAPH.CENTER
    day.add_run(s.get("day", "")).italic = True

    doc.add_paragraph()
    doc.add_heading(s["title"], level=1)
    doc.add_paragraph().add_run(s.get("meta", "")).bold = True

    lp = doc.add_paragraph()
    lp.add_run("Workflow: ").bold = True
    lp.add_run(s["url"])

    if s.get("why"):
        wp = doc.add_paragraph()
        wp.add_run("Why this one: ").bold = True
        wp.add_run(s["why"])

    doc.add_paragraph()
    doc.add_heading("Read this on camera (~75 sec)", level=2)

    for beat in s["beats"]:
        bp = doc.add_paragraph()
        br = bp.add_run(beat["label"])
        br.bold = True
        br.font.size = Pt(12)
        color(bp, PINK)

        if beat.get("direction"):
            dp = doc.add_paragraph()
            dp.add_run("[" + beat["direction"] + "]").italic = True
            color(dp, GREY)

        sp = doc.add_paragraph()
        sp.paragraph_format.left_indent = Inches(0.25)
        sp.add_run("“" + beat["say"] + "”")

        if beat.get("prompt"):
            pp = doc.add_paragraph()
            pp.paragraph_format.left_indent = Inches(0.25)
            pr = pp.add_run(beat["prompt"])
            pr.font.name = "Consolas"
            pr.bold = True
            color(pp, PINK)

        doc.add_paragraph()

    doc.add_heading("Caption", level=2)
    doc.add_paragraph(s.get("caption", ""))
    doc.add_paragraph(s.get("hashtags", ""))

    doc.add_paragraph()
    foot = doc.add_paragraph()
    foot.add_run(
        "After posting: paste the TikTok link into this workflow's tiktokUrl and "
        "add a row to docs/posting-log.md."
    ).italic = True
    color(foot, GREY)

    out_dir = os.path.join(repo_root, "docs", "scripts")
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, f"{date.today().isoformat()}-{s['slug']}.docx")
    doc.save(path)
    return path


def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if len(sys.argv) < 2:
        print("usage: make-tiktok-script-doc.py <script.json>", file=sys.stderr)
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as fh:
        s = json.load(fh)
    print(build(s, repo_root))


if __name__ == "__main__":
    main()
