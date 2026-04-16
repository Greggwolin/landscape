import { registerModal } from '@/contexts/ModalRegistryContext';
import { OperationsModalWrapper } from './OperationsModalWrapper';
import { RentRollModalWrapper } from './RentRollModalWrapper';
import { PropertyDetailsModalWrapper } from './PropertyDetailsModalWrapper';
import { BudgetModalWrapper } from './BudgetModalWrapper';
import { SalesCompsModalWrapper } from './SalesCompsModalWrapper';
import { CostApproachModalWrapper } from './CostApproachModalWrapper';
import { IncomeApproachModalWrapper } from './IncomeApproachModalWrapper';
import { LoanInputsModalWrapper } from './LoanInputsModalWrapper';
import { EquityStructureModalWrapper } from './EquityStructureModalWrapper';
import { LandUseModalWrapper } from './LandUseModalWrapper';
import { ParcelsModalWrapper } from './ParcelsModalWrapper';
import { SalesAbsorptionModalWrapper } from './SalesAbsorptionModalWrapper';
import { RenovationModalWrapper } from './RenovationModalWrapper';
import { ContactsModalWrapper } from './ContactsModalWrapper';
import { ProjectDetailsModalWrapper } from './ProjectDetailsModalWrapper';
import { ReconciliationModalWrapper } from './ReconciliationModalWrapper';
import { AcquisitionModalWrapper } from './AcquisitionModalWrapper';

registerModal('operating_statement', {
  component: OperationsModalWrapper,
  defaultSize: 'full',
  label: 'Operating Statement',
});

registerModal('rent_roll', {
  component: RentRollModalWrapper,
  defaultSize: 'full',
  label: 'Rent Roll',
});

registerModal('property_details', {
  component: PropertyDetailsModalWrapper,
  defaultSize: 'wide',
  label: 'Property Details',
});

registerModal('budget', {
  component: BudgetModalWrapper,
  defaultSize: 'full',
  label: 'Budget',
});

registerModal('sales_comps', {
  component: SalesCompsModalWrapper,
  defaultSize: 'full',
  label: 'Sales Comparison',
});

registerModal('cost_approach', {
  component: CostApproachModalWrapper,
  defaultSize: 'wide',
  label: 'Cost Approach',
});

registerModal('income_approach', {
  component: IncomeApproachModalWrapper,
  defaultSize: 'wide',
  label: 'Income Approach',
});

registerModal('loan_inputs', {
  component: LoanInputsModalWrapper,
  defaultSize: 'wide',
  label: 'Loan Terms',
});

registerModal('equity_structure', {
  component: EquityStructureModalWrapper,
  defaultSize: 'wide',
  label: 'Equity Structure',
});

registerModal('land_use', {
  component: LandUseModalWrapper,
  defaultSize: 'full',
  label: 'Land Use',
});

registerModal('parcels', {
  component: ParcelsModalWrapper,
  defaultSize: 'full',
  label: 'Parcels',
});

registerModal('sales_absorption', {
  component: SalesAbsorptionModalWrapper,
  defaultSize: 'full',
  label: 'Sales & Absorption',
});

registerModal('renovation', {
  component: RenovationModalWrapper,
  defaultSize: 'wide',
  label: 'Renovation',
});

registerModal('contacts', {
  component: ContactsModalWrapper,
  defaultSize: 'standard',
  label: 'Contacts',
});

registerModal('project_details', {
  component: ProjectDetailsModalWrapper,
  defaultSize: 'wide',
  label: 'Project Details',
});

registerModal('reconciliation', {
  component: ReconciliationModalWrapper,
  defaultSize: 'wide',
  label: 'Reconciliation',
});

registerModal('acquisition', {
  component: AcquisitionModalWrapper,
  defaultSize: 'wide',
  label: 'Acquisition',
});
