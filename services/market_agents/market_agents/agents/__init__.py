"""Market intelligence agent implementations."""

# Time-series agents (write to public.market_data)
from .fred_agent import FredAgent
from .census_bps_agent import CensusBpsAgent
from .hud_agent import HudAgent

# Research agents (write to landscape.tbl_research_*)
from .base_research_agent import BaseResearchAgent
from .crefc_agent import CREFCAgent
from .uli_agent import ULIAgent
from .mba_agent import MBAAgent
from .kbra_agent import KBRAAgent
from .trepp_agent import TreppAgent
from .brokerage_research_agent import BrokerageResearchAgent
from .construction_cost_agent import ConstructionCostAgent
from .naiop_agent import NAIOPAgent

__all__ = [
    # Time-series
    "FredAgent",
    "CensusBpsAgent",
    "HudAgent",
    # Research
    "BaseResearchAgent",
    "CREFCAgent",
    "ULIAgent",
    "MBAAgent",
    "KBRAAgent",
    "TreppAgent",
    "BrokerageResearchAgent",
    "ConstructionCostAgent",
    "NAIOPAgent",
]
