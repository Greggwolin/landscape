#!/usr/bin/env python3
"""
build-instructions.py — Generate flavor outputs from PROJECT_INSTRUCTIONS_SOURCE.md

Reads the tagged canonical source, splits into Cowork and Claude.ai flavor
markdown, then runs pandoc to produce .docx files saved into the user's
Google Drive _Landscape folder so both Cowork and Claude.ai pick them up
via Drive sync.

Source markup:
  <!-- TARGET: both -->         section-level marker, applies to one section
  <!-- TARGET: cowork -->       Cowork-only section
  <!-- TARGET: claudeai -->     Claude.ai-only section
  <!-- BEGIN: cowork -->        inline block, Cowork-only
  ...content...
  <!-- END: cowork -->
  <!-- BEGIN: claudeai -->      inline block, Claude.ai-only
  ...content...
  <!-- END: claudeai -->

Sections without a target marker are treated as 'both'.

Usage:
  python scripts/build-instructions.py
  python scripts/build-instructions.py --no-docx       # skip pandoc step
  python scripts/build-instructions.py --target cowork # generate one flavor
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_PATH = REPO_ROOT / "docs" / "PROJECT_INSTRUCTIONS_SOURCE.md"
INTERMEDIATE_DIR = REPO_ROOT / "docs"
DRIVE_DIR_DEFAULT = Path.home() / "Library" / "CloudStorage" / "GoogleDrive-gregg@wolinfamily.com" / "My Drive" / "_Landscape"

VALID_TARGETS = {"both", "cowork", "claudeai"}

SECTION_TARGET_RE = re.compile(r"^\s*<!--\s*TARGET:\s*(both|cowork|claudeai)\s*-->\s*$", re.IGNORECASE)
INLINE_BEGIN_RE = re.compile(r"^\s*<!--\s*BEGIN:\s*(cowork|claudeai)\s*-->\s*$", re.IGNORECASE)
INLINE_END_RE = re.compile(r"^\s*<!--\s*END:\s*(cowork|claudeai)\s*-->\s*$", re.IGNORECASE)
SECTION_HEADER_RE = re.compile(r"^##\s+\d", re.MULTILINE)


def split_into_sections(text: str) -> list[tuple[str, str]]:
    """
    Split source into (target, body) tuples by top-level section.
    Each section starts at a `## N.0 ...` line. Anything before the first
    section header (preamble) is returned with target 'preamble'.
    """
    lines = text.split("\n")
    sections: list[tuple[str, list[str]]] = []
    current_target = "preamble"
    current_lines: list[str] = []

    for line in lines:
        target_match = SECTION_TARGET_RE.search(line)
        is_section_header = bool(re.match(r"^##\s+\d", line))

        if target_match and not is_section_header:
            # Standalone target marker — flush current, set target for next section
            if current_lines:
                sections.append((current_target, current_lines))
            current_lines = []
            current_target = target_match.group(1).lower()
            continue

        if is_section_header and current_lines and current_target != "preamble":
            # Already had content under a target — close it before starting new section
            sections.append((current_target, current_lines))
            current_lines = [line]
            # If section header also has no preceding marker, default to 'both'
            # (overridable by a target marker before the next section's first non-header line)
            # But practically every section in the source has a preceding marker.
            continue

        if is_section_header and current_target == "preamble":
            # First section header — flush preamble, start first section
            sections.append((current_target, current_lines))
            current_lines = [line]
            current_target = "both"  # default if no marker found
            continue

        current_lines.append(line)

    if current_lines:
        sections.append((current_target, current_lines))

    return [(t, "\n".join(ls)) for t, ls in sections]


def filter_inline_blocks(body: str, target_flavor: str) -> str:
    """
    Walk the body line-by-line, keeping inline BEGIN/END blocks only if they
    match target_flavor. Lines outside any inline block are kept regardless.
    """
    out_lines: list[str] = []
    in_block: str | None = None  # 'cowork' or 'claudeai' or None
    keep_block: bool = True

    for line in body.split("\n"):
        begin_match = INLINE_BEGIN_RE.search(line)
        end_match = INLINE_END_RE.search(line)

        if begin_match:
            in_block = begin_match.group(1).lower()
            keep_block = (in_block == target_flavor)
            continue  # skip the marker line itself

        if end_match:
            in_block = None
            keep_block = True
            continue

        if in_block is not None and not keep_block:
            continue

        out_lines.append(line)

    return "\n".join(out_lines)


def renumber_sections(body: str) -> str:
    """
    After filtering, section numbers in headers may be non-contiguous (e.g.,
    Cowork output skips §9 and §10 since those are Claude.ai-only). Renumber
    `## N.0 TITLE` headers sequentially starting at 1.0.

    Sub-section numbers within section bodies (e.g., **1.4 Thread State**) are
    NOT renumbered — they're stable identifiers within their section, and
    cross-references are by title not number.
    """
    lines = body.split("\n")
    section_counter = 0
    out_lines: list[str] = []

    header_re = re.compile(r"^##\s+(\d+)\.0\s+(.+)$")

    for line in lines:
        m = header_re.match(line)
        if m:
            section_counter += 1
            title = m.group(2)
            out_lines.append(f"## {section_counter}.0 {title}")
        else:
            out_lines.append(line)

    return "\n".join(out_lines)


def generate_flavor(source_text: str, target_flavor: str) -> str:
    """
    Build the markdown output for one flavor.
    Steps:
      1. Split into sections by section-target marker
      2. Keep sections matching 'both' or target_flavor
      3. For each kept section, filter inline BEGIN/END blocks
      4. Renumber top-level section headers sequentially
      5. Prepend a flavor-specific title preamble
    """
    sections = split_into_sections(source_text)
    kept: list[str] = []

    for target, body in sections:
        if target == "preamble":
            continue  # drop the source preamble; flavors get their own
        if target == "both" or target == target_flavor:
            filtered = filter_inline_blocks(body, target_flavor)
            kept.append(filtered.rstrip())

    merged = "\n\n".join(kept)
    renumbered = renumber_sections(merged)

    if target_flavor == "cowork":
        title = (
            "# Landscape Project Instructions — Cowork Edition\n"
            "**Generated from:** `docs/PROJECT_INSTRUCTIONS_SOURCE.md`\n"
            "**Edit the source, then re-run `scripts/build-instructions.py` to regenerate.**\n\n"
            "---\n\n"
        )
    else:
        title = (
            "# Landscape Project Instructions\n"
            "**Generated from:** `docs/PROJECT_INSTRUCTIONS_SOURCE.md`\n"
            "**Edit the source, then re-run `scripts/build-instructions.py` to regenerate.**\n\n"
            "---\n\n"
        )

    return title + renumbered + "\n"


def write_md(content: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"  wrote {path}")


def run_pandoc(md_path: Path, docx_path: Path) -> None:
    docx_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["pandoc", str(md_path), "-o", str(docx_path)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  pandoc failed for {md_path.name}:", file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        sys.exit(1)
    print(f"  wrote {docx_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Cowork and Claude.ai instruction files from canonical source.")
    parser.add_argument("--no-docx", action="store_true", help="Skip pandoc .docx generation; only write intermediate .md files")
    parser.add_argument("--target", choices=["cowork", "claudeai", "both"], default="both", help="Generate only one flavor (default: both)")
    parser.add_argument("--drive-dir", type=Path, default=DRIVE_DIR_DEFAULT, help=f"Drive folder for .docx output (default: {DRIVE_DIR_DEFAULT})")
    args = parser.parse_args()

    if not SOURCE_PATH.exists():
        print(f"error: source file not found at {SOURCE_PATH}", file=sys.stderr)
        sys.exit(1)

    source_text = SOURCE_PATH.read_text(encoding="utf-8")
    print(f"reading source: {SOURCE_PATH}")

    targets = ["cowork", "claudeai"] if args.target == "both" else [args.target]

    for flavor in targets:
        print(f"\nbuilding {flavor}...")
        md_content = generate_flavor(source_text, flavor)

        intermediate_md = INTERMEDIATE_DIR / f"PROJECT_INSTRUCTIONS_{flavor.upper()}_GENERATED.md"
        write_md(md_content, intermediate_md)

        if not args.no_docx:
            docx_name = f"PROJECT_INSTRUCTIONS_{'COWORK' if flavor == 'cowork' else 'CLAUDEAI'}.docx"
            docx_path = args.drive_dir / docx_name
            run_pandoc(intermediate_md, docx_path)

    print("\ndone.")


if __name__ == "__main__":
    main()
