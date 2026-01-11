import argparse
import json
import logging
from pathlib import Path
from typing import Any, Dict, List

from .config import ReconConfig, load_config
from .runner import run_recon


def setup_logging() -> None:
    logs_dir = Path("backend/tools/builder_recon/logs")
    logs_dir.mkdir(parents=True, exist_ok=True)
    log_file = logs_dir / "builder_recon.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[logging.FileHandler(log_file), logging.StreamHandler()],
    )


def build_markdown(report: Dict[str, Any]) -> str:
    lines = []
    lines.append("| Builder | Domain | Comm Sampled | Price? | Sqft? | Plan? | Listing? |")
    lines.append("| --- | --- | --- | --- | --- | --- | --- |")
    for b in report["builders"]:
        fc = b["field_coverage"]["community"]
        plan = b["field_coverage"]["plan"]
        listing = b["field_coverage"]["listing"]
        lines.append(
            f"| {b['builder_name']} | {b['canonical_domain']} | "
            f"{b['crawl_stats']['communities_sampled']} | "
            f"{'Y' if fc.get('has_price_range') else 'N'} | "
            f"{'Y' if fc.get('has_sqft_range') else 'N'} | "
            f"{'Y' if plan.get('accessible') else 'N'} | "
            f"{'Y' if listing.get('accessible') else 'N'} |"
        )
    lines.append("")
    lines.append("Common community fields: " + ", ".join(report["intersection_dataset"].get("community_fields_common", [])))
    return "\n".join(lines)


def main() -> None:
    parser_cli = argparse.ArgumentParser(description="Run multi-builder recon harness.")
    parser_cli.add_argument("--config-path", type=str, help="Path to recon config JSON.")
    args = parser_cli.parse_args()
    setup_logging()
    config: ReconConfig = load_config(args.config_path)
    report = run_recon(config)
    out_path = Path(config.output_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    print("\nMarkdown summary:\n")
    print(build_markdown(report))


if __name__ == "__main__":
    main()
