"""
Web research primitives for Landscaper (chat VQ, 2026-10-16).

Pure functions — no Django imports — so they can be tested and exercised
outside the app. The Landscaper tool wrappers (tools/web_research_tools.py)
add the spend caps, the relay instructions and the registry wiring.

- brave_search(): Brave Search API, plain-text results (title, url, snippet,
  age). Plain text matters: the fabrication guard can only source a figure it
  can read, and server-side search results arrive encrypted.
- fetch_page(): fetch one public web page or PDF and return readable text.
  Refuses non-http(s) schemes and any host that resolves to a private,
  loopback, link-local or reserved address (the back end must not be usable
  to reach its own network).

Design: docs/assessments/VQ-WEB-RESEARCH-TOOL-DESIGN.md.
"""

from __future__ import annotations

import base64
import hashlib
import ipaddress
import json
import os
import re
import socket
import tempfile
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlparse

import requests

BRAVE_ENDPOINT = "https://api.search.brave.com/res/v1/web/search"
USER_AGENT = "Mozilla/5.0 (compatible; Landscape-Research/1.0; real-estate analysis)"
FETCH_TIMEOUT_S = 20
SEARCH_TIMEOUT_S = 12
MAX_FETCH_BYTES = 25 * 1024 * 1024
MAX_PDF_PAGES = 60
MAX_SAVE_BYTES = 500 * 1024 * 1024
SAVE_TIMEOUT_S = 60  # per network read, not total
UPLOADTHING_PREPARE = "https://api.uploadthing.com/v7/prepareUpload"
FRESHNESS = {"pd", "pw", "pm", "py"}


class WebResearchError(Exception):
    """A failure the caller should report to the user as such."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


# ── search ─────────────────────────────────────────────────────────────────

def build_query(query: str, site: Optional[str] = None) -> str:
    q = (query or "").strip()
    if not q:
        raise WebResearchError("empty_query", "No search query was given.")
    if site:
        site = re.sub(r"^https?://", "", site.strip()).strip("/").split("/")[0]
        if site and f"site:{site}" not in q:
            q = f"{q} site:{site}"
    return q[:400]


def brave_search(query: str, api_key: str, site: Optional[str] = None,
                 count: int = 6, freshness: Optional[str] = None,
                 session: Optional[requests.Session] = None) -> Dict[str, Any]:
    if not api_key:
        raise WebResearchError("not_configured", "Web search is not configured on this server (no search key).")
    q = build_query(query, site)
    params = {"q": q, "count": max(1, min(int(count or 6), 10)), "safesearch": "moderate",
              "text_decorations": "false"}
    if freshness in FRESHNESS:
        params["freshness"] = freshness
    http = session or requests
    try:
        r = http.get(BRAVE_ENDPOINT, params=params, timeout=SEARCH_TIMEOUT_S,
                     headers={"Accept": "application/json", "X-Subscription-Token": api_key})
    except requests.RequestException as e:
        raise WebResearchError("search_unreachable", f"The search service could not be reached ({type(e).__name__}).")
    if r.status_code == 429:
        raise WebResearchError("search_rate_limited", "The search service is rate-limiting requests; try again in a minute.")
    if r.status_code in (401, 403):
        raise WebResearchError("search_unauthorized", "The search service rejected the server's key.")
    if r.status_code != 200:
        raise WebResearchError("search_failed", f"The search service returned HTTP {r.status_code}.")
    data = r.json() or {}
    results = []
    for item in ((data.get("web") or {}).get("results") or [])[: params["count"]]:
        snippet = item.get("description") or ""
        extra = item.get("extra_snippets") or []
        if extra:
            snippet = (snippet + " … " + " … ".join(extra[:2])).strip()
        results.append({
            "title": _clean(item.get("title")),
            "url": item.get("url"),
            "site": (item.get("meta_url") or {}).get("hostname") or urlparse(item.get("url") or "").hostname,
            "age": item.get("age") or item.get("page_age"),
            "snippet": _clean(snippet)[:600],
        })
    return {"query_used": q, "results": results}


# ── fetch ──────────────────────────────────────────────────────────────────

def check_public_url(url: str) -> Tuple[bool, str]:
    """(ok, reason). Refuses anything but http(s) to a public address."""
    try:
        p = urlparse((url or "").strip())
    except ValueError:
        return False, "That is not a valid web address."
    if p.scheme not in ("http", "https"):
        return False, "Only http and https addresses can be read."
    host = p.hostname
    if not host:
        return False, "That address has no host name."
    if p.username or p.password:
        return False, "Addresses carrying a login are not read."
    try:
        infos = socket.getaddrinfo(host, p.port or (443 if p.scheme == "https" else 80))
    except socket.gaierror:
        return False, f"The host {host} could not be found."
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved
                or ip.is_multicast or ip.is_unspecified):
            return False, "That address points inside a private network and is not read."
    return True, ""


def fetch_page(url: str, max_chars: int = 20000, focus: Optional[str] = None,
               session: Optional[requests.Session] = None) -> Dict[str, Any]:
    ok, reason = check_public_url(url)
    if not ok:
        raise WebResearchError("url_refused", reason)
    max_chars = max(1000, min(int(max_chars or 20000), 40000))
    http = session or requests
    try:
        r = http.get(url, timeout=FETCH_TIMEOUT_S, stream=True, allow_redirects=True,
                     headers={"User-Agent": USER_AGENT,
                              "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.5"})
    except requests.RequestException as e:
        raise WebResearchError("fetch_unreachable", f"The page could not be reached ({type(e).__name__}).")
    final_url = getattr(r, "url", url) or url
    if final_url != url:
        ok, reason = check_public_url(final_url)
        if not ok:
            raise WebResearchError("url_refused", "The page redirected somewhere that is not read: " + reason)
    if r.status_code in (401, 403):
        raise WebResearchError("fetch_blocked", f"The site refused the request (HTTP {r.status_code}) — it may block automated readers.")
    if r.status_code == 404:
        raise WebResearchError("fetch_not_found", "The page was not found (HTTP 404).")
    if r.status_code >= 400:
        raise WebResearchError("fetch_failed", f"The site returned HTTP {r.status_code}.")

    body = bytearray()
    for chunk in r.iter_content(64 * 1024):
        body.extend(chunk)
        if len(body) > MAX_FETCH_BYTES:
            raise WebResearchError("fetch_too_large", "The file is larger than 25 MB and was not read.")
    ctype = (r.headers.get("Content-Type") or "").split(";")[0].strip().lower()
    is_pdf = ctype == "application/pdf" or bytes(body[:5]) == b"%PDF-"

    pages_note = None
    if is_pdf:
        text, total_pages, read_pages = pdf_to_text(bytes(body))
        title = None
        if read_pages < total_pages:
            pages_note = f"Read the first {read_pages} of {total_pages} pages."
        kind = "pdf"
    else:
        if ctype and not (ctype.startswith("text/") or "html" in ctype or "xml" in ctype):
            raise WebResearchError("fetch_unsupported", f"That file type ({ctype}) cannot be read as text.")
        enc = r.encoding or "utf-8"
        title, text = html_to_text(bytes(body).decode(enc, errors="replace"))
        kind = "html"

    text = text.strip()
    if not text:
        raise WebResearchError("fetch_empty", "The page loaded but contained no readable text (it may be a scanned PDF or built by a script).")
    text, truncated = window_text(text, max_chars, focus)
    return {"url": url, "final_url": final_url, "title": title, "content_type": kind,
            "text": text, "truncated": truncated, "pages_note": pages_note,
            "chars": len(text)}


# ── save (download a whole file, copy it to the app's file store) ─────────

def download_to_file(url: str, max_bytes: int = MAX_SAVE_BYTES,
                     session: Optional[requests.Session] = None) -> Dict[str, Any]:
    """Stream a public file to a temp file (never held in memory).
    Returns {path, size, sha256, content_type, final_url, file_name}."""
    ok, reason = check_public_url(url)
    if not ok:
        raise WebResearchError("url_refused", reason)
    http = session or requests
    try:
        r = http.get(url, timeout=SAVE_TIMEOUT_S, stream=True, allow_redirects=True,
                     headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    except requests.RequestException as e:
        raise WebResearchError("fetch_unreachable", f"The file could not be reached ({type(e).__name__}).")
    final_url = getattr(r, "url", url) or url
    if final_url != url:
        ok, reason = check_public_url(final_url)
        if not ok:
            raise WebResearchError("url_refused", "The file redirected somewhere that is not read: " + reason)
    if r.status_code in (401, 403):
        raise WebResearchError("fetch_blocked", f"The site refused the request (HTTP {r.status_code}).")
    if r.status_code == 404:
        raise WebResearchError("fetch_not_found", "The file was not found (HTTP 404).")
    if r.status_code >= 400:
        raise WebResearchError("fetch_failed", f"The site returned HTTP {r.status_code}.")
    declared = r.headers.get("Content-Length")
    if declared and declared.isdigit() and int(declared) > max_bytes:
        raise WebResearchError("save_too_large",
                               f"The file is {int(declared) // (1024 * 1024)} MB; the limit is {max_bytes // (1024 * 1024)} MB.")
    ctype = (r.headers.get("Content-Type") or "").split(";")[0].strip().lower() or "application/octet-stream"
    sha = hashlib.sha256()
    size = 0
    fd, path = tempfile.mkstemp(prefix="landscape_web_", suffix=".bin")
    try:
        with os.fdopen(fd, "wb") as out:
            for chunk in r.iter_content(256 * 1024):
                if not chunk:
                    continue
                size += len(chunk)
                if size > max_bytes:
                    raise WebResearchError("save_too_large",
                                           f"The file is larger than {max_bytes // (1024 * 1024)} MB and was not saved.")
                sha.update(chunk)
                out.write(chunk)
    except BaseException:
        try:
            os.unlink(path)
        except OSError:
            pass
        raise
    if size == 0:
        os.unlink(path)
        raise WebResearchError("fetch_empty", "The file was empty.")
    with open(path, "rb") as f:
        head = f.read(5)
    if head == b"%PDF-":
        ctype = "application/pdf"
    return {"path": path, "size": size, "sha256": sha.hexdigest(), "content_type": ctype,
            "final_url": final_url, "file_name": file_name_for(final_url, r.headers.get("Content-Disposition"), ctype)}


def file_name_for(url: str, content_disposition: Optional[str], ctype: str) -> str:
    name = None
    if content_disposition:
        m = re.search(r"filename\*?=(?:UTF-8'')?\"?([^\";]+)", content_disposition, re.I)
        if m:
            name = m.group(1)
    if not name:
        from urllib.parse import unquote
        name = unquote(urlparse(url).path.rstrip("/").split("/")[-1] or "")
    name = re.sub(r"[\\/:*?\"<>|\x00-\x1f]", "_", name).strip() or "web-document"
    if ctype == "application/pdf" and not name.lower().endswith(".pdf"):
        name += ".pdf"
    elif "html" in ctype and "." not in name:
        name += ".html"
    return name[:200]


class _MultipartFile:
    """A multipart/form-data body that streams one file from disk. Has a
    length, so requests sends Content-Length instead of chunking."""

    def __init__(self, path: str, field: str, file_name: str, ctype: str):
        self.boundary = "----landscape" + hashlib.md5(os.urandom(16)).hexdigest()
        safe = file_name.replace('"', "_")
        self._pre = (f"--{self.boundary}\r\nContent-Disposition: form-data; name=\"{field}\"; "
                     f"filename=\"{safe}\"\r\nContent-Type: {ctype}\r\n\r\n").encode()
        self._post = f"\r\n--{self.boundary}--\r\n".encode()
        self._file = open(path, "rb")
        self._size = os.path.getsize(path)
        self._stage = 0
        self.len = len(self._pre) + self._size + len(self._post)

    def __len__(self):
        return self.len

    def read(self, n: int = -1) -> bytes:
        out = b""
        while (n < 0 or len(out) < n) and self._stage < 3:
            want = -1 if n < 0 else n - len(out)
            if self._stage == 0:
                out += self._pre
                self._stage = 1
            elif self._stage == 1:
                chunk = self._file.read(want if want > 0 else 1024 * 1024)
                if chunk:
                    out += chunk
                else:
                    self._file.close()
                    self._stage = 2
            else:
                out += self._post
                self._stage = 3
        return out


def uploadthing_upload(path: str, file_name: str, ctype: str, token: str,
                       session: Optional[requests.Session] = None) -> str:
    """Copy a local file into the app's UploadThing store; returns its URL."""
    try:
        cfg = json.loads(base64.b64decode(token.strip().strip('"').strip("'") + "=="))
        api_key = cfg["apiKey"]
    except Exception:
        raise WebResearchError("store_not_configured", "The app's file store is not configured on this server.")
    http = session or requests
    size = os.path.getsize(path)
    r = http.post(UPLOADTHING_PREPARE, timeout=30,
                  headers={"x-uploadthing-api-key": api_key, "Content-Type": "application/json"},
                  json={"fileName": file_name, "fileSize": size, "fileType": ctype,
                        "contentDisposition": "inline", "acl": "public-read"})
    if r.status_code != 200:
        raise WebResearchError("store_failed", f"The file store refused the upload (HTTP {r.status_code}).")
    put_url = (r.json() or {}).get("url")
    body = _MultipartFile(path, "file", file_name, ctype)
    try:
        p = http.put(put_url, data=body, timeout=SAVE_TIMEOUT_S * 5,
                     headers={"Content-Type": f"multipart/form-data; boundary={body.boundary}"})
    finally:
        try:
            body._file.close()
        except Exception:
            pass
    if p.status_code != 200:
        raise WebResearchError("store_failed", f"The file store did not accept the file (HTTP {p.status_code}).")
    j = p.json() or {}
    url = j.get("ufsUrl") or j.get("url")
    if not url:
        raise WebResearchError("store_failed", "The file store returned no address for the file.")
    return url


def html_to_text(html: str) -> Tuple[Optional[str], str]:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "lxml")
    title = _clean(soup.title.get_text()) if soup.title else None
    for tag in soup(["script", "style", "noscript", "svg", "nav", "footer", "header", "form", "iframe"]):
        tag.decompose()
    main = soup.find("main") or soup.find("article") or soup.body or soup
    lines = []
    for el in main.find_all(["h1", "h2", "h3", "h4", "p", "li", "td", "th", "dt", "dd", "pre", "blockquote"]):
        t = _clean(el.get_text(" "))
        if t and (not lines or lines[-1] != t):
            lines.append(t)
    text = "\n".join(lines) if lines else _clean(main.get_text(" "))
    return title, text


def pdf_to_text(data: bytes) -> Tuple[str, int, int]:
    import fitz  # PyMuPDF
    with fitz.open(stream=data, filetype="pdf") as doc:
        total = doc.page_count
        n = min(total, MAX_PDF_PAGES)
        parts = []
        for i in range(n):
            t = doc.load_page(i).get_text("text").strip()
            if t:
                parts.append(f"[page {i + 1}]\n{t}")
    return "\n\n".join(parts), total, n


def window_text(text: str, max_chars: int, focus: Optional[str]) -> Tuple[str, bool]:
    if len(text) <= max_chars:
        return text, False
    if focus:
        i = text.lower().find(focus.strip().lower())
        if i >= 0:
            start = max(0, i - max_chars // 4)
            return text[start:start + max_chars], True
    return text[:max_chars], True


def _clean(s: Optional[str]) -> str:
    return re.sub(r"\s+", " ", s or "").strip()
