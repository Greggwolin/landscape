#!/usr/bin/env python3
"""Generate CODEBASE_AUDIT markdown and JSON snapshot for daily context."""

from __future__ import annotations

import argparse
import hashlib
import inspect
import json
import os
import re
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any

from context_utils import (
    check_db_status,
    count_lines,
    db_connect,
    file_mtime_date,
    markdown_table,
    relpath,
    safe_run_command,
    write_json,
)

TEXT_SUFFIXES = {
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".py",
    ".sql",
    ".sh",
    ".md",
    ".json",
    ".yaml",
    ".yml",
    ".css",
    ".scss",
    ".toml",
}

EXCLUDED_PARTS = {
    ".git",
    "node_modules",
    ".next",
    "venv",
    "__pycache__",
    "staticfiles",
    ".pytest_cache",
}

KEY_LIBRARIES = [
    ("@coreui", "CoreUI"),
    ("@radix-ui", "Radix"),
    ("@tanstack", "TanStack"),
    ("maplibre", "MapLibre"),
    ("@mapbox", "Mapbox"),
    ("@mui", "MUI"),
    ("swr", "SWR"),
    ("recharts", "Recharts"),
    ("ag-grid", "AG Grid"),
    ("react-query", "React Query"),
    ("leaflet", "Leaflet"),
    ("lucide-react", "Lucide"),
    ("@heroicons", "Heroicons"),
    ("@dnd-kit", "DnD Kit"),
]

PURPOSE_FRONTEND = {
    "next": "Framework",
    "react": "UI library",
    "react-dom": "UI runtime",
    "@coreui/react": "Component library",
    "@tanstack/react-query": "Data fetching",
    "@radix-ui/react-dialog": "Primitive components",
    "maplibre-gl": "Map rendering",
    "@mui/material": "Component library",
    "swr": "Data fetching",
    "zod": "Validation",
}

PURPOSE_BACKEND = {
    "Django": "Framework",
    "djangorestframework": "API layer",
    "djangorestframework-simplejwt": "JWT auth",
    "psycopg2-binary": "PostgreSQL driver",
    "dj-database-url": "DB URL parsing",
    "numpy": "Numerics",
    "numpy-financial": "Financial calculations",
    "pandas": "Data processing",
    "scipy": "Scientific computing",
    "pydantic": "Validation",
    "drf-spectacular": "OpenAPI docs",
    "openai": "LLM API client",
    "anthropic": "LLM API client",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate daily codebase audit")
    parser.add_argument("--repo-root", default=None, help="Repository root path")
    parser.add_argument("--output", required=True, help="Output markdown file path")
    parser.add_argument("--json-out", required=False, help="Output JSON snapshot path")
    return parser.parse_args()


def list_files(base: Path, pattern: str) -> list[Path]:
    return sorted(base.rglob(pattern)) if base.exists() else []


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def is_excluded_path(path: Path) -> bool:
    return any(part in EXCLUDED_PARTS for part in path.parts)


def route_from_page(page_file: Path, app_dir: Path) -> str:
    rel = page_file.relative_to(app_dir)
    segments = list(rel.parts[:-1])
    route_parts: list[str] = []
    for part in segments:
        if part.startswith("(") and part.endswith(")"):
            continue
        if part.startswith("@"):
            continue
        if part.startswith("_"):
            continue
        route_parts.append(part)
    if not route_parts:
        return "/"
    return "/" + "/".join(route_parts)


def route_from_api_route(route_file: Path, api_dir: Path) -> str:
    rel = route_file.relative_to(api_dir)
    segments = list(rel.parts[:-1])
    route_parts: list[str] = []
    for part in segments:
        if part.startswith("(") and part.endswith(")"):
            continue
        if part.startswith("_"):
            continue
        route_parts.append(part)
    if not route_parts:
        return "/api"
    return "/api/" + "/".join(route_parts)


def parse_next_methods(content: str) -> list[str]:
    methods = sorted(set(re.findall(r"export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b", content)))
    return methods


def load_django_endpoints(repo_root: Path) -> tuple[list[dict[str, str]], str | None]:
    endpoints: list[dict[str, str]] = []
    backend_dir = repo_root / "backend"

    try:
        import sys

        if str(backend_dir) not in sys.path:
            sys.path.insert(0, str(backend_dir))

        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

        import django
        from django.urls import URLPattern, URLResolver, get_resolver

        django.setup()

        def normalize(pattern: str) -> str:
            route = pattern.replace("^", "").replace("$", "")
            route = route.replace("//", "/")
            if not route.startswith("/"):
                route = "/" + route
            return route

        def infer_methods(callback: Any) -> str:
            actions = getattr(callback, "actions", None)
            if isinstance(actions, dict) and actions:
                return ", ".join(sorted({str(k).upper() for k in actions.keys()}))
            return "UNKNOWN"

        def infer_view(callback: Any) -> tuple[str, str, str]:
            view_name = getattr(callback, "__name__", "UNKNOWN")
            module = getattr(callback, "__module__", "")
            file_path = "UNKNOWN"

            cls = getattr(callback, "cls", None)
            if cls is not None:
                view_name = cls.__name__
                module = getattr(cls, "__module__", module)
                source = inspect.getsourcefile(cls)
                if source:
                    file_path = relpath(Path(source), repo_root)
            else:
                source = inspect.getsourcefile(callback)
                if source:
                    file_path = relpath(Path(source), repo_root)

            app_match = re.search(r"apps\.([^.]+)\.", module)
            app_name = app_match.group(1) if app_match else "UNKNOWN"
            return view_name, app_name, file_path

        def walk(patterns: list[Any], prefix: str = "") -> None:
            for entry in patterns:
                if isinstance(entry, URLResolver):
                    walk(entry.url_patterns, prefix + str(entry.pattern))
                    continue
                if not isinstance(entry, URLPattern):
                    continue

                callback = entry.callback
                route = normalize(prefix + str(entry.pattern))
                if not route.startswith("/api/"):
                    continue

                view_name, app_name, file_path = infer_view(callback)
                endpoints.append(
                    {
                        "pattern": route,
                        "view": view_name,
                        "app": app_name,
                        "methods": infer_methods(callback),
                        "file": file_path,
                    }
                )

        resolver = get_resolver()
        walk(resolver.url_patterns)

        seen = set()
        deduped: list[dict[str, str]] = []
        for endpoint in sorted(endpoints, key=lambda x: (x["pattern"], x["view"], x["file"])):
            key = (endpoint["pattern"], endpoint["view"], endpoint["file"], endpoint["methods"])
            if key in seen:
                continue
            seen.add(key)
            deduped.append(endpoint)

        return deduped, None
    except Exception as exc:
        return [], str(exc)


def extract_component_names(content: str, fallback_stem: str) -> list[str]:
    names = set()

    for pattern in [
        r"export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)",
        r"export\s+function\s+([A-Z][A-Za-z0-9_]*)",
        r"export\s+const\s+([A-Z][A-Za-z0-9_]*)\s*(?::|=)",
        r"export\s+default\s+([A-Z][A-Za-z0-9_]*)",
    ]:
        names.update(re.findall(pattern, content))

    if not names and "export default" in content and fallback_stem[:1].isupper():
        names.add(fallback_stem)

    return sorted(names)


def key_imports(content: str) -> str:
    imports = re.findall(r"^\s*import\s+.+?\s+from\s+['\"]([^'\"]+)['\"]", content, re.MULTILINE)
    found: list[str] = []
    for source in imports:
        for marker, label in KEY_LIBRARIES:
            if marker in source and label not in found:
                found.append(label)
    return ", ".join(found) if found else "—"


def parse_provided_values(content: str) -> str:
    match = re.search(r"value\s*=\s*\{\{(.*?)\}\}", content, re.DOTALL)
    if not match:
        return "UNKNOWN"

    block = match.group(1)
    keys = re.findall(r"([A-Za-z_][A-Za-z0-9_]*)\s*(?::|,)", block)
    cleaned: list[str] = []
    for key in keys:
        if key in {"true", "false", "null"}:
            continue
        if key not in cleaned:
            cleaned.append(key)
    return ", ".join(cleaned[:10]) if cleaned else "UNKNOWN"


def extract_endpoints_called(content: str) -> str:
    endpoints = re.findall(r"['\"](/api[^'\"]+)['\"]", content)
    unique: list[str] = []
    for endpoint in endpoints:
        if endpoint not in unique:
            unique.append(endpoint)
    return ", ".join(unique[:5]) if unique else "—"


def scan_repo_files(repo_root: Path) -> list[dict[str, Any]]:
    tracked_roots = [
        repo_root / "src",
        repo_root / "backend",
        repo_root / "services",
        repo_root / "migrations",
        repo_root / "scripts",
    ]

    inventory: list[dict[str, Any]] = []
    for root in tracked_roots:
        if not root.exists():
            continue
        for path in sorted(root.rglob("*")):
            if not path.is_file():
                continue
            if is_excluded_path(path):
                continue
            if path.suffix not in TEXT_SUFFIXES:
                continue
            text = read_text(path)
            digest = hashlib.sha1(text.encode("utf-8", errors="ignore")).hexdigest()
            inventory.append(
                {
                    "path": relpath(path, repo_root),
                    "lines": text.count("\n") + (0 if text.endswith("\n") or text == "" else 1),
                    "hash": digest,
                    "size": path.stat().st_size,
                }
            )

    package_json = repo_root / "package.json"
    if package_json.exists():
        text = read_text(package_json)
        inventory.append(
            {
                "path": "package.json",
                "lines": text.count("\n") + (0 if text.endswith("\n") or text == "" else 1),
                "hash": hashlib.sha1(text.encode("utf-8", errors="ignore")).hexdigest(),
                "size": package_json.stat().st_size,
            }
        )

    return sorted(inventory, key=lambda x: x["path"])


def load_package_dependencies(repo_root: Path) -> tuple[list[list[str]], list[list[str]]]:
    package_path = repo_root / "package.json"
    backend_requirements_path = repo_root / "backend" / "requirements.txt"

    frontend_rows: list[list[str]] = []
    if package_path.exists():
        package_data = json.loads(package_path.read_text(encoding="utf-8"))
        dependencies = package_data.get("dependencies", {})
        for pkg in sorted(dependencies.keys()):
            if pkg in PURPOSE_FRONTEND or pkg in {"@coreui/react", "@tanstack/react-query", "next", "react", "react-dom"}:
                frontend_rows.append([pkg, dependencies[pkg], PURPOSE_FRONTEND.get(pkg, "Library")])

    backend_rows: list[list[str]] = []
    if backend_requirements_path.exists():
        for raw_line in backend_requirements_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            if "-e " in line:
                continue

            match = re.match(r"^([A-Za-z0-9_.-]+)\s*([<>=!~].+)?$", line)
            if not match:
                continue

            pkg = match.group(1)
            spec = (match.group(2) or "").strip() or "—"
            if pkg in PURPOSE_BACKEND:
                backend_rows.append([pkg, spec, PURPOSE_BACKEND[pkg]])

    return frontend_rows, backend_rows


def get_env_versions(repo_root: Path, db_server_version: str | None) -> dict[str, str]:
    node = safe_run_command(["node", "--version"], cwd=repo_root) or "UNAVAILABLE"
    python = safe_run_command(["python", "--version"], cwd=repo_root)
    if python is None:
        python = safe_run_command(["python3", "--version"], cwd=repo_root) or "UNAVAILABLE"
    npm = safe_run_command(["npm", "--version"], cwd=repo_root) or "UNAVAILABLE"
    pip = safe_run_command(["pip", "--version"], cwd=repo_root)
    if pip is None:
        pip = safe_run_command(["pip3", "--version"], cwd=repo_root) or "UNAVAILABLE"

    return {
        "node": node,
        "python": python,
        "npm": npm,
        "pip": pip,
        "postgres": db_server_version or "DATABASE UNAVAILABLE",
    }


def get_git_summary(repo_root: Path) -> tuple[str, str, str]:
    branch = safe_run_command(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=repo_root) or "UNKNOWN"

    commit_out = safe_run_command(["git", "log", "-1", "--pretty=format:%h|%s|%ci"], cwd=repo_root)
    if commit_out and "|" in commit_out:
        commit_hash, subject, commit_time = commit_out.split("|", 2)
        last_commit = f"{commit_hash} — \"{subject}\" ({commit_time})"
    else:
        last_commit = "UNKNOWN"

    return branch, last_commit, datetime.now().strftime("%Y-%m-%d %H:%M:%S %Z")


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve() if args.repo_root else Path(__file__).resolve().parent.parent
    output_path = Path(args.output).resolve()

    src_dir = repo_root / "src"
    backend_dir = repo_root / "backend"

    db_status = check_db_status(repo_root)
    db_tables_count: str = "DATABASE UNAVAILABLE"
    db_table_names: list[str] = []

    if db_status.available:
        try:
            conn = db_connect(repo_root)
            try:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT table_name
                        FROM information_schema.tables
                        WHERE table_schema = 'landscape' AND table_type = 'BASE TABLE'
                        ORDER BY table_name
                        """
                    )
                    db_table_names = [row[0] for row in cursor.fetchall()]
                    db_tables_count = str(len(db_table_names))
            finally:
                conn.close()
        except Exception as exc:
            db_status.available = False
            db_status.error = str(exc)

    branch, last_commit, generated_at = get_git_summary(repo_root)

    frontend_files = (
        [p for p in src_dir.rglob("*") if p.is_file() and not is_excluded_path(p)] if src_dir.exists() else []
    )
    backend_files = (
        [p for p in backend_dir.rglob("*") if p.is_file() and not is_excluded_path(p)] if backend_dir.exists() else []
    )

    frontend_ext = Counter(path.suffix for path in frontend_files)
    backend_ext = Counter(path.suffix for path in backend_files)

    # Frontend pages
    app_dir = src_dir / "app"
    frontend_pages: list[dict[str, str]] = []
    if app_dir.exists():
        for page in sorted(app_dir.rglob("page.tsx")):
            route = route_from_page(page, app_dir)
            frontend_pages.append(
                {
                    "route": route,
                    "file": relpath(page, repo_root),
                    "size": str(count_lines(page)),
                    "modified": file_mtime_date(page),
                }
            )

    # Next.js API routes
    api_dir = app_dir / "api"
    next_routes: list[dict[str, str]] = []
    if api_dir.exists():
        for route_file in sorted(api_dir.rglob("route.ts")):
            content = read_text(route_file)
            methods = parse_next_methods(content)
            next_routes.append(
                {
                    "route": route_from_api_route(route_file, api_dir),
                    "file": relpath(route_file, repo_root),
                    "methods": ", ".join(methods) if methods else "UNKNOWN",
                    "size": str(count_lines(route_file)),
                    "modified": file_mtime_date(route_file),
                }
            )

    django_endpoints, django_error = load_django_endpoints(repo_root)

    # React components
    component_files = set(list_files(src_dir / "components", "*.tsx"))
    for candidate in list_files(app_dir, "*.tsx"):
        if "/components/" in str(candidate).replace("\\", "/"):
            component_files.add(candidate)

    react_components: list[dict[str, str]] = []
    for component_file in sorted(component_files):
        content = read_text(component_file)
        names = extract_component_names(content, component_file.stem)
        if not names:
            continue
        imports_from = key_imports(content)
        for component_name in names:
            react_components.append(
                {
                    "component": component_name,
                    "file": relpath(component_file, repo_root),
                    "size": str(count_lines(component_file)),
                    "modified": file_mtime_date(component_file),
                    "imports": imports_from,
                }
            )

    # Custom hooks
    hooks_dir = src_dir / "hooks"
    custom_hooks: list[dict[str, str]] = []
    if hooks_dir.exists():
        for hook_file in sorted([*hooks_dir.rglob("*.ts"), *hooks_dir.rglob("*.tsx")]):
            if hook_file.name.startswith("."):
                continue
            content = read_text(hook_file)
            exported_hooks = re.findall(r"export\s+(?:const|function)\s+(use[A-Z][A-Za-z0-9_]*)", content)
            hook_names = exported_hooks or ([hook_file.stem] if hook_file.stem.startswith("use") else [])
            endpoint_called = extract_endpoints_called(content)
            for hook_name in sorted(set(hook_names)):
                custom_hooks.append(
                    {
                        "hook": hook_name,
                        "file": relpath(hook_file, repo_root),
                        "size": str(count_lines(hook_file)),
                        "modified": file_mtime_date(hook_file),
                        "endpoint": endpoint_called,
                    }
                )

    # Django apps detail
    apps_dir = backend_dir / "apps"
    app_details: list[dict[str, Any]] = []
    if apps_dir.exists():
        for app_dir_path in sorted(apps_dir.iterdir()):
            if not app_dir_path.is_dir():
                continue
            if app_dir_path.name.startswith(".") or app_dir_path.name.startswith("__"):
                continue

            py_files = sorted(app_dir_path.rglob("*.py"))
            total_lines = sum(count_lines(path) for path in py_files)
            last_modified = "unknown"
            if py_files:
                last_modified_ts = max(path.stat().st_mtime for path in py_files)
                last_modified = datetime.fromtimestamp(last_modified_ts).strftime("%Y-%m-%d")

            model_names: list[str] = []
            view_names: list[str] = []
            serializer_names: list[str] = []

            for path in py_files:
                path_str = str(path)
                content = read_text(path)

                if "/models" in path_str or path.name.startswith("models"):
                    for name, bases in re.findall(r"class\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)", content):
                        if "models.Model" in bases and name not in model_names:
                            model_names.append(name)

                if "/views" in path_str or path.name.startswith("views"):
                    for name, bases in re.findall(r"class\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)", content):
                        if any(token in bases for token in ["APIView", "ViewSet", "View"]):
                            if name not in view_names:
                                view_names.append(name)

                if "/serializer" in path_str or path.name.startswith("serializer"):
                    for name, bases in re.findall(r"class\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)", content):
                        if "Serializer" in bases and name not in serializer_names:
                            serializer_names.append(name)

            urls_file = app_dir_path / "urls.py"
            url_pattern_count = 0
            if urls_file.exists():
                url_content = read_text(urls_file)
                url_pattern_count += len(re.findall(r"\bpath\s*\(", url_content))
                url_pattern_count += len(re.findall(r"\bre_path\s*\(", url_content))
                url_pattern_count += len(re.findall(r"\bregister\s*\(", url_content))

            migrations_dir = app_dir_path / "migrations"
            migration_files: list[str] = []
            if migrations_dir.exists():
                migration_files = sorted(
                    path.name
                    for path in migrations_dir.glob("*.py")
                    if path.name != "__init__.py"
                )

            app_details.append(
                {
                    "name": app_dir_path.name,
                    "models": sorted(model_names),
                    "views": sorted(view_names),
                    "serializers": sorted(serializer_names),
                    "urls": url_pattern_count,
                    "migrations": len(migration_files),
                    "latest_migration": migration_files[-1] if migration_files else "—",
                    "total_lines": total_lines,
                    "last_modified": last_modified,
                }
            )

    # React contexts
    contexts_dir = src_dir / "contexts"
    code_files = sorted(
        [*src_dir.rglob("*.ts"), *src_dir.rglob("*.tsx"), *src_dir.rglob("*.js"), *src_dir.rglob("*.jsx")]
    )
    code_contents = {relpath(path, repo_root): read_text(path) for path in code_files}

    react_contexts: list[dict[str, str]] = []
    if contexts_dir.exists():
        for context_file in sorted([*contexts_dir.rglob("*.ts"), *contexts_dir.rglob("*.tsx")]):
            content = read_text(context_file)
            context_names = re.findall(r"(?:export\s+)?const\s+([A-Z][A-Za-z0-9_]*Context)\s*=\s*createContext", content)
            hook_names = re.findall(r"export\s+(?:const|function)\s+(use[A-Z][A-Za-z0-9_]*)", content)
            provided = parse_provided_values(content)

            for context_name in context_names:
                use_count = 0
                for path_str, text in code_contents.items():
                    if path_str == relpath(context_file, repo_root):
                        continue
                    if re.search(rf"useContext\s*\(\s*{re.escape(context_name)}\s*\)", text):
                        use_count += 1
                        continue
                    if any(re.search(rf"\b{re.escape(hook)}\s*\(", text) for hook in hook_names):
                        use_count += 1

                react_contexts.append(
                    {
                        "context": context_name,
                        "file": relpath(context_file, repo_root),
                        "provided": provided,
                        "used_by": f"{use_count} components",
                    }
                )

    # Styling audit
    style_files: list[Path] = []
    for suffix in ["*.ts", "*.tsx", "*.js", "*.jsx", "*.css", "*.scss"]:
        style_files.extend(src_dir.rglob(suffix))

    coreui_var_count = 0
    hex_violations: list[tuple[str, int, str]] = []
    tailwind_violations: list[tuple[str, int, str]] = []
    dark_violations: list[tuple[str, int, str]] = []

    tailwind_pattern = re.compile(
        r"\b(?:bg|text|border|from|to|via|ring|stroke|fill)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b"
    )
    hex_pattern = re.compile(r"#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b")

    for path in sorted(set(style_files)):
        rel = relpath(path, repo_root)
        for line_no, line in enumerate(read_text(path).splitlines(), start=1):
            coreui_var_count += len(re.findall(r"var\(--cui-[^)]+\)", line))

            if hex_pattern.search(line):
                hex_violations.append((rel, line_no, line.strip()))

            if tailwind_pattern.search(line):
                tailwind_violations.append((rel, line_no, line.strip()))

            if "dark:" in line:
                dark_violations.append((rel, line_no, line.strip()))

    frontend_dep_rows, backend_dep_rows = load_package_dependencies(repo_root)
    env_versions = get_env_versions(repo_root, db_status.server_version)

    django_apps_count = len(app_details)

    summary_lines = [
        "## Summary",
        f"- **Generated:** {generated_at}",
        f"- **Git Branch:** {branch}",
        f"- **Last Commit:** {last_commit}",
        (
            "- **Frontend Files:** "
            f"{len(frontend_files)} (.tsx: {frontend_ext.get('.tsx', 0)}, .ts: {frontend_ext.get('.ts', 0)}, "
            f".css: {frontend_ext.get('.css', 0)}, other: {len(frontend_files) - frontend_ext.get('.tsx', 0) - frontend_ext.get('.ts', 0) - frontend_ext.get('.css', 0)})"
        ),
        (
            "- **Backend Files:** "
            f"{len(backend_files)} (.py: {backend_ext.get('.py', 0)}, other: {len(backend_files) - backend_ext.get('.py', 0)})"
        ),
        f"- **Database Tables:** {db_tables_count}",
        f"- **Next.js API Routes:** {len(next_routes)}",
        f"- **Django API Endpoints:** {len(django_endpoints) if django_endpoints else ('UNAVAILABLE' if django_error else 0)}",
        f"- **React Components:** {len(react_components)}",
        f"- **Custom Hooks:** {len(custom_hooks)}",
        f"- **Django Apps:** {django_apps_count}",
    ]

    if not db_status.available and db_status.error:
        summary_lines.append(f"- **Database Status:** DATABASE UNAVAILABLE ({db_status.error})")

    sections: list[str] = []
    sections.extend(summary_lines)

    # Section 2: Frontend pages
    sections.append("\n## Frontend Pages")
    sections.append(
        markdown_table(
            ["Route", "File", "Size (lines)", "Last Modified"],
            [[row["route"], row["file"], row["size"], row["modified"]] for row in frontend_pages],
        )
    )

    # Section 3: Next.js API routes
    sections.append("\n## Next.js API Routes")
    sections.append(
        markdown_table(
            ["Route", "File", "Methods", "Size (lines)", "Last Modified"],
            [[row["route"], row["file"], row["methods"], row["size"], row["modified"]] for row in next_routes],
        )
    )

    # Section 4: Django endpoints
    sections.append("\n## Django API Endpoints")
    if django_error:
        sections.append(f"DATABASE/CONFIG UNAVAILABLE: {django_error}")
    else:
        sections.append(
            markdown_table(
                ["URL Pattern", "View", "App", "Methods", "File"],
                [[row["pattern"], row["view"], row["app"], row["methods"], row["file"]] for row in django_endpoints],
            )
        )

    # Section 5: React components
    sections.append("\n## React Components")
    sections.append(
        markdown_table(
            ["Component", "File", "Size (lines)", "Last Modified", "Imports From"],
            [
                [row["component"], row["file"], row["size"], row["modified"], row["imports"]]
                for row in react_components
            ],
        )
    )

    # Section 6: Custom hooks
    sections.append("\n## Custom Hooks")
    sections.append(
        markdown_table(
            ["Hook", "File", "Size (lines)", "Last Modified", "Endpoint Called"],
            [
                [row["hook"], row["file"], row["size"], row["modified"], row["endpoint"]]
                for row in custom_hooks
            ],
        )
    )

    # Section 7: Django apps
    sections.append("\n## Django Apps")
    for detail in app_details:
        sections.append(f"### {detail['name']}")
        models_text = ", ".join(detail["models"][:20]) if detail["models"] else "—"
        views_text = ", ".join(detail["views"][:20]) if detail["views"] else "—"
        serializers_text = ", ".join(detail["serializers"][:20]) if detail["serializers"] else "—"

        sections.append(
            "\n".join(
                [
                    f"- **Models:** {models_text} ({len(detail['models'])} models)",
                    f"- **Views:** {views_text} ({len(detail['views'])} views)",
                    f"- **Serializers:** {serializers_text} ({len(detail['serializers'])} serializers)",
                    f"- **URLs:** {detail['urls']} patterns",
                    f"- **Migrations:** {detail['migrations']} (latest: {detail['latest_migration']})",
                    f"- **Total Lines:** {detail['total_lines']:,}",
                    f"- **Last Modified:** {detail['last_modified']}",
                ]
            )
        )

    # Section 8: React contexts
    sections.append("\n## React Contexts")
    sections.append(
        markdown_table(
            ["Context", "File", "Provided Values", "Used By (count)"],
            [[row["context"], row["file"], row["provided"], row["used_by"]] for row in react_contexts],
        )
    )

    # Section 9: Styling
    sections.append("\n## Styling Audit")
    sections.append(f"- **CoreUI CSS Variable Usage:** {coreui_var_count} instances")
    sections.append(f"- **Hardcoded Hex Colors:** {len(hex_violations)} instances (VIOLATIONS)")
    for path, line_no, snippet in hex_violations[:100]:
        sections.append(f"  - [VIOLATION] `{path}:{line_no}` — `{snippet[:140]}`")

    sections.append(f"- **Tailwind Color Utility Usage:** {len(tailwind_violations)} instances (VIOLATIONS)")
    for path, line_no, snippet in tailwind_violations[:100]:
        sections.append(f"  - [VIOLATION] `{path}:{line_no}` — `{snippet[:140]}`")

    sections.append(f"- **dark: Variant Usage:** {len(dark_violations)} instances (VIOLATIONS)")
    for path, line_no, snippet in dark_violations[:100]:
        sections.append(f"  - [VIOLATION] `{path}:{line_no}` — `{snippet[:140]}`")

    # Section 10: Dependencies
    sections.append("\n## Dependencies")
    sections.append("### Frontend (package.json)")
    sections.append(markdown_table(["Package", "Version", "Purpose"], frontend_dep_rows))
    sections.append("\n### Backend (requirements.txt)")
    sections.append(markdown_table(["Package", "Version", "Purpose"], backend_dep_rows))

    # Section 11: Environment
    sections.append("\n## Environment")
    sections.append(f"- **Node.js:** {env_versions['node']}")
    sections.append(f"- **Python:** {env_versions['python']}")
    sections.append(f"- **npm:** {env_versions['npm']}")
    sections.append(f"- **pip:** {env_versions['pip']}")
    sections.append(f"- **PostgreSQL:** {env_versions['postgres']}")

    markdown = "\n".join(sections) + "\n"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(markdown, encoding="utf-8")

    if args.json_out:
        snapshot_path = Path(args.json_out).resolve()
        snapshot_data = {
            "generated_at": datetime.now().isoformat(),
            "branch": branch,
            "repo_files": scan_repo_files(repo_root),
            "next_routes": next_routes,
            "django_endpoints": django_endpoints,
            "react_components": react_components,
            "custom_hooks": custom_hooks,
            "styling": {
                "coreui_var_count": coreui_var_count,
                "hex_count": len(hex_violations),
                "tailwind_count": len(tailwind_violations),
                "dark_count": len(dark_violations),
            },
            "db_tables": db_table_names,
            "db_available": db_status.available,
            "db_error": db_status.error,
        }
        write_json(snapshot_path, snapshot_data)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
