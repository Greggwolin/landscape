#!/usr/bin/env python3
"""
CLI runner for the Landscape test agent framework.

Usage:
    # Run S2 in calibration mode (first run — extracts actual values)
    AGENT_CALIBRATION=true python -m tests.agent_framework.run s2

    # Run S2 in test mode (compares against manifest)
    AGENT_CALIBRATION=false python -m tests.agent_framework.run s2

    # Run all scenarios
    python -m tests.agent_framework.run all
"""

import logging
import sys

from .report import TestReport

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
)

SCENARIOS = {
    's1': 'scenario_s1',
    's2': 'scenario_s2',
    's3': 'scenario_s3',
    's4': 'scenario_s4',
    's5': 'scenario_s5',
    's6': 'scenario_s6',
    's8': 'scenario_s8',
    's10': 'scenario_s10',
}


def run_scenario(name: str, report: TestReport):
    """Import and run a single scenario by name."""
    if name not in SCENARIOS:
        print(f'Unknown scenario: {name}. Available: {", ".join(SCENARIOS.keys())}')
        sys.exit(1)

    module_name = SCENARIOS[name]

    if name == 's1':
        from .scenario_s1 import ScenarioS1
        agent = ScenarioS1()
        result, validation = agent.get_results()
        report.add_scenario(result, validation)
    elif name == 's2':
        from .scenario_s2 import ScenarioS2
        agent = ScenarioS2()
        result, validation = agent.get_results()
        report.add_scenario(result, validation)
    elif name == 's3':
        from .scenario_s3 import ScenarioS3
        agent = ScenarioS3()
        result, validation = agent.get_results()
        report.add_scenario(result, validation)
    elif name == 's4':
        from .scenario_s4 import ScenarioS4
        agent = ScenarioS4()
        result, validation = agent.get_results()
        report.add_scenario(result, validation)
    elif name == 's5':
        from .scenario_s5 import ScenarioS5
        agent = ScenarioS5()
        result, validation = agent.get_results()
        report.add_scenario(result, validation)
    elif name == 's6':
        from .scenario_s6 import ScenarioS6
        agent = ScenarioS6()
        result, validation = agent.get_results()
        report.add_scenario(result, validation)
    elif name == 's8':
        from .scenario_s8 import ScenarioS8
        agent = ScenarioS8()
        result, validation = agent.get_results()
        report.add_scenario(result, validation)
    elif name == 's10':
        from .scenario_s10 import ScenarioS10
        agent = ScenarioS10()
        result, validation = agent.get_results()
        report.add_scenario(result, validation)
    # Future scenario imports go here


def main():
    args = sys.argv[1:] if len(sys.argv) > 1 else ['s2']
    report = TestReport(suite_name='landscape_agents')

    if 'all' in args:
        targets = list(SCENARIOS.keys())
    else:
        targets = args

    for name in targets:
        print(f'\n--- Running scenario: {name} ---\n')
        try:
            run_scenario(name, report)
        except Exception as e:
            print(f'ERROR running {name}: {e}')
            report.add_scenario({
                'scenario': name,
                'status': 'fail',
                'error': str(e),
                'steps': [],
                'elapsed_s': 0,
            })

    report.print_summary()
    path = report.save_json()
    print(f'Report saved to: {path}')

    # Exit with non-zero if any scenario failed
    final = report.finalize()
    sys.exit(0 if final['summary']['scenarios_failed'] == 0 else 1)


if __name__ == '__main__':
    main()
