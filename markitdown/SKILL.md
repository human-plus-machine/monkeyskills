---
name: markitdown
description: Convert PDF, Office, image, audio, HTML, and other documents into LLM-ready Markdown using Microsoft's markitdown CLI. Use when ingesting a document, extracting text or tables from a file, or feeding a non-text file into another skill (@monkeyplan, @scope, @document-codebase).
---

# MarkItDown — Document to Markdown Conversion

Convert files (PDF, Word, PowerPoint, Excel, images, audio, HTML, CSV/JSON/XML, ZIP, EPUB, YouTube URLs) into clean, LLM-ready Markdown that preserves headings, tables, lists, and links.

## When to Use

- A user provides a non-text document (`.pdf`, `.docx`, `.pptx`, `.xlsx`, etc.) that needs to be read or ingested.
- Another skill needs document content as Markdown (e.g. a `.docx` PRD for `@monkeyplan` / `@scope`, a spec `.pdf` for `@monkeythink`, a design doc for `@explore`).
- The user asks to extract text or tables from a file.

## Prerequisites & Setup

MarkItDown is a **Python** tool requiring **Python 3.10+**. The core conversion is fully offline — no API keys or LLM required. Before converting, ensure the toolchain exists. Run these checks and guide the user through whatever is missing — do not assume Python is present.

### Step 1 — Is Python 3.10+ available?

```bash
python3 --version
```

- **3.10 or higher** → proceed to Step 2.
- **Older than 3.10** → tell the user to upgrade, then follow the platform-specific path below.
- **Command not found / no Python** → Python is not installed. Guide setup per OS:

  - **macOS:** check for Homebrew first (`brew --version`). If present: `brew install python@3.12`. If not, point the user to [python.org/downloads](https://www.python.org/downloads/) or offer to install Homebrew first.
  - **Windows:** `winget install Python.Python.3.12` (or download from python.org). Ensure "Add Python to PATH" is selected.
  - **Linux (Debian/Ubuntu):** `sudo apt update && sudo apt install -y python3 python3-pip python3-venv`.
  - **Linux (Fedora/RHEL):** `sudo dnf install -y python3 python3-pip`.

  After install, re-run `python3 --version` to confirm before continuing.

### Step 2 — Is markitdown installed?

```bash
markitdown --version 2>/dev/null || echo "not installed"
```

If not installed, install it. **Prefer `pipx`** for a clean, isolated, globally-available CLI:

```bash
# Preferred: pipx (isolates the tool, puts `markitdown` on PATH)
pipx install 'markitdown[all]'        # install pipx first if needed: `pip install --user pipx && pipx ensurepath`
```

If `pipx` is unavailable or the user prefers, fall back to a **virtual environment** (avoids the "externally-managed-environment" error on modern macOS/Debian):

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install 'markitdown[all]'
```

`[all]` installs every optional format handler. For a smaller install, scope it: `pip install 'markitdown[pdf,docx,pptx,xlsx]'`.

### Step 3 — Confirm

```bash
markitdown --version
```

Only proceed to conversion once this succeeds. If any step fails, surface the exact error and help the user resolve it before retrying.

## Default Workflow (offline, no LLM)

1. Confirm the toolchain is ready (Prerequisites above).
2. Convert the file:

```bash
markitdown path/to/input.pdf -o path/to/output.md
```

3. Report the output path and show a short preview of the Markdown.

## Security

MarkItDown performs I/O with the current process's privileges.

- **Never pass untrusted or user-controlled input directly.** Sanitize/validate paths first.
- Prefer the **narrowest** conversion for the job. For local files only, the Python API's `convert_local()` is safer than the permissive `convert()`. For remote content, fetch it yourself and validate before converting.

## Optional Enhancements (require an LLM or Azure)

Only use these when the input is image/audio/video-heavy AND the user wants richer output:

- **Image descriptions** (`.jpg`, images in `.pptx`): pass an OpenAI-compatible `llm_client` + `llm_model` via the Python API to generate text descriptions of pictures. Without it, you get EXIF metadata only.
- **Embedded-image OCR** (`markitdown-ocr` plugin): extracts text from images inside PDF/DOCX/PPTX/XLSX via LLM vision. Silently skipped if no `llm_client` is provided.
- **Azure Document Intelligence** (`docintel_endpoint`): higher-quality cloud OCR/layout.
- **Azure Content Understanding** (`cu_endpoint`): the only path for **video**, plus higher-quality audio and structured field extraction. Billable Azure API calls.

Python API example with an LLM (image descriptions):

```python
from markitdown import MarkItDown
from openai import OpenAI

md = MarkItDown(llm_client=OpenAI(), llm_model="gpt-4o")
print(md.convert("example.jpg").text_content)
```

## Notes

- Output is optimized for LLM/text-analysis consumption, not high-fidelity human rendering.
- For multi-file archives, MarkItDown iterates ZIP contents automatically.
