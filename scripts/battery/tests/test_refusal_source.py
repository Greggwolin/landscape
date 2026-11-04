import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location(
    "run_battery", Path(__file__).resolve().parents[1] / "run_battery.py"
)
battery = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(battery)


class RefusalSourceTests(unittest.TestCase):
    def source(self, code):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "handler.py"
            source.write_text(code)
            with patch.object(battery, "AI_HANDLER_PATH", source):
                return battery.source_refusal_string()

    def test_current_handler_constant(self):
        self.assertIn("?", battery.source_refusal_string())

    def test_named_constant_without_importing_handler(self):
        self.assertEqual(self.source('''
raise RuntimeError("must never execute")
_GUARD_FALLBACK_QUESTION = ("Which " "figures?")
def reply():
    guard_envelope = {"suggested_user_question": _GUARD_FALLBACK_QUESTION}
'''), "Which figures?")

    def test_old_literal_still_supported(self):
        self.assertEqual(self.source('''
def reply():
    guard_envelope = {"suggested_user_question": "Which figures?"}
'''), "Which figures?")

    def test_unknown_or_nonliteral_value_is_reported(self):
        for value in ("missing", "make_question()", "42", '""'):
            with self.subTest(value=value), self.assertRaises(battery.BatteryError):
                self.source(f'guard_envelope = {{"suggested_user_question": {value}}}')

    def test_local_constant_is_not_taken_as_global(self):
        with self.assertRaises(battery.BatteryError):
            self.source('''
def unrelated():
    QUESTION = "Wrong question?"
guard_envelope = {"suggested_user_question": QUESTION}
''')


if __name__ == "__main__":
    unittest.main()
