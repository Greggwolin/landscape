"use client";

import React from "react";
import { useFlyout } from "./FlyoutContext";

import SalesComparisonFlyout from "./flyouts/SalesComparisonFlyout";
import CostApproachFlyout from "./flyouts/CostApproachFlyout";
import IncomeApproachFlyout from "./flyouts/IncomeApproachFlyout";
import ReconciliationFlyout from "./flyouts/ReconciliationFlyout";
import PropertyFlyout from "./flyouts/PropertyFlyout";
import MarketFlyout from "./flyouts/MarketFlyout";
import HBUFlyout from "./flyouts/HBUFlyout";
import ProjectSetupFlyout from "./flyouts/ProjectSetupFlyout";
import ReportsFlyout from "./flyouts/ReportsFlyout";
import DocumentsFlyout from "./flyouts/DocumentsFlyout";
import PlanningFlyout from "./flyouts/PlanningFlyout";
import BudgetFlyout from "./flyouts/BudgetFlyout";
import OperationsFlyout from "./flyouts/OperationsFlyout";
import SalesFlyout from "./flyouts/SalesFlyout";
import FeasibilityFlyout from "./flyouts/FeasibilityFlyout";

const FLYOUT_COMPONENTS: Record<
  string,
  React.ComponentType<{ data?: Record<string, unknown> }>
> = {
  "sales-comparison": SalesComparisonFlyout,
  "cost-approach": CostApproachFlyout,
  "income-approach": IncomeApproachFlyout,
  reconciliation: ReconciliationFlyout,
  property: PropertyFlyout,
  market: MarketFlyout,
  hbu: HBUFlyout,
  "project-setup": ProjectSetupFlyout,
  reports: ReportsFlyout,
  documents: DocumentsFlyout,
  planning: PlanningFlyout,
  budget: BudgetFlyout,
  operations: OperationsFlyout,
  sales: SalesFlyout,
  feasibility: FeasibilityFlyout,
};

const FLYOUT_LABELS: Record<string, string> = {
  "sales-comparison": "Sales Comparison",
  "cost-approach": "Cost Approach",
  "income-approach": "Income Approach",
  reconciliation: "Reconciliation",
  property: "Property Data",
  market: "Market Analysis",
  hbu: "Highest & Best Use",
  "project-setup": "Project Setup",
  reports: "Report Configuration",
  documents: "Document Review",
  planning: "Planning & Phasing",
  budget: "Budget Details",
  operations: "Operating Expenses",
  sales: "Sales & Absorption",
  feasibility: "Feasibility Analysis",
};

export default function FlyoutShell() {
  const { flyout, closeFlyout } = useFlyout();

  if (!flyout.isOpen || !flyout.flyoutId) {
    return null;
  }

  const FlyoutContent = FLYOUT_COMPONENTS[flyout.flyoutId];

  if (!FlyoutContent) {
    console.warn(`Unknown flyout: ${flyout.flyoutId}`);
    return null;
  }

  return (
    <div className="flyout-overlay">
      <div className="flyout-backdrop" onClick={closeFlyout} />
      <div className="flyout-panel">
        <div className="flyout-header d-flex align-items-center justify-content-between">
          <h3 className="flyout-title">
            {FLYOUT_LABELS[flyout.flyoutId] || "Flyout"}
          </h3>
          <button
            className="btn btn-ghost-secondary btn-sm"
            onClick={closeFlyout}
            aria-label="Close flyout"
            type="button"
          >
            ✕
          </button>
        </div>
        <div className="flyout-body">
          <FlyoutContent data={flyout.data} />
        </div>
      </div>
    </div>
  );
}
