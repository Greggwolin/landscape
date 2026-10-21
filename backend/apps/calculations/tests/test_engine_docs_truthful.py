"""
The financial engine's own description matches what exists on disk
(ARGUS parity re-audit 2026-10-21, §2.9 — #LS-1021-08).

From 2025-10 to 2026-10-21 the package docstring, the settings, the data models
and the service README all described a Monte Carlo module (plus a sensitivity
module and a CLI) that were never written. Nothing imported them, so nothing
broke — which is exactly why the claims survived a year. These tests make the
description load-bearing: every module the docstring names must import, and the
removed Monte Carlo surface must stay gone.
"""

import importlib
import re
from pathlib import Path

import financial_engine
from financial_engine import config, models

ENGINE_DIR = Path(financial_engine.__file__).resolve().parent
README = ENGINE_DIR.parent.parent / 'services' / 'financial_engine_py' / 'README.md'


def _modules_named_in_docstring():
    doc = financial_engine.__doc__ or ''
    section = doc.split('Not here:')[0]
    return re.findall(r'^- ([\w.]+):', section, flags=re.MULTILINE)


class TestEngineDocsTruthful:

    def test_every_module_the_docstring_names_imports(self):
        names = _modules_named_in_docstring()
        assert names, 'docstring lists no modules — the test would be vacuous'
        for name in names:
            importlib.import_module(f'financial_engine.{name}')

    def test_docstring_no_longer_names_phantom_modules(self):
        names = _modules_named_in_docstring()
        assert 'core.monte_carlo' not in names
        assert 'core.sensitivity' not in names
        assert 'core.waterfall' not in names  # the real package is financial_engine.waterfall

    def test_monte_carlo_models_and_settings_are_gone(self):
        for attr in ('MonteCarloResult', 'VariableDistribution', 'DistributionType'):
            assert not hasattr(models, attr), attr
        fields = config.Settings.model_fields
        assert 'mc_default_simulations' not in fields
        assert 'mc_random_seed' not in fields

    def test_no_monte_carlo_module_exists_unannounced(self):
        # If someone writes it, they must also put it back in the docstring/README.
        assert not (ENGINE_DIR / 'core' / 'monte_carlo.py').exists()
        assert not (ENGINE_DIR / 'core' / 'sensitivity.py').exists()
        assert not (ENGINE_DIR / 'cli.py').exists()

    def test_readme_layout_tree_names_only_files_that_exist(self):
        if not README.exists():
            return  # the services folder is not part of the Railway build context
        text = README.read_text(encoding='utf-8')
        tree = text.split('```')[1]
        for line in tree.splitlines():
            m = re.search(r'([\w./-]+\.(?:py|toml|md))', line)
            if not m or '->' in line:
                continue
            name = m.group(1)
            found = list(ENGINE_DIR.rglob(name)) + list(README.parent.rglob(name))
            assert found, f'README layout names {name}, which is nowhere on disk'
