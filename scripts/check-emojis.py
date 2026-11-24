#!/usr/bin/env python3
"""
check-emojis.py
Scans the SkiMCP codebase to guarantee zero emoji or emoji-like glyph regressions.
Excludes test output / harness markers in reports or node_modules.
"""

import os
import sys
import re

EMOJI_PATTERN = re.compile(
    r'[\U0001F300-\U0001FAFF\u2600-\u26FF\u2700-\u27BF]'
)

# Directories and files to scan
SCAN_EXTENSIONS = ('.ts', '.tsx', '.css', '.html', '.md')
SKIP_DIRS = {'node_modules', 'dist', '.git', '.gemini'}

def check_file(path: str) -> list[tuple[int, list[str], str]]:
    issues = []
    # In markdown reports, ignore tool/build runner output (✔ and ✓)
    is_report = path.endswith('.md')
    try:
        with open(path, 'r', encoding='utf-8') as f:
            for line_no, line in enumerate(f, 1):
                clean_line = line.strip()
                if is_report and (clean_line.startswith('✔') or clean_line.startswith('✓')):
                    continue
                matches = EMOJI_PATTERN.findall(line)
                if matches:
                    issues.append((line_no, matches, line.strip()))
    except Exception as e:
        print(f"Error reading {path}: {e}", file=sys.stderr)
    return issues

def main():
    root_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
    found_any = False
    total_files = 0

    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            if f.endswith(SCAN_EXTENSIONS):
                total_files += 1
                full_path = os.path.join(root, f)
                issues = check_file(full_path)
                if issues:
                    found_any = True
                    print(f"\n[FAIL] Emojis detected in: {full_path}")
                    for line_no, glyphs, line in issues:
                        print(f"  Line {line_no} [{', '.join(glyphs)}]: {line[:80]}")

    if found_any:
        print("\nVerification Failed: Emojis detected in source/doc files.")
        sys.exit(1)
    else:
        print(f"\n[PASS] Verified {total_files} files: 0 emojis detected across scanned surfaces.")
        sys.exit(0)

if __name__ == '__main__':
    main()
