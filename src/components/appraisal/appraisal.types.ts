/**
 * Type definitions for the Appraisal Conversational UI
 *
 * @version 1.0
 * @created 2026-04-04
 */

export type ApproachId = 'property' | 'market' | 'sales' | 'income' | 'cost' | 'reconciliation';

export type ApproachStatus = 'green' | 'yellow' | 'gray';

export type DotColor = 'green' | 'blue' | 'yellow' | 'gray' | 'purple' | 'empty';

export type InputSource = 'user' | 'landscaper' | 'default' | 'calculated';

export type ValueType = 'normal' | 'negative' | 'positive' | 'waiting';

export type BottomView = 'reports' | 'docs' | 'maps' | 'notebook';

export type DetailId =
  | 'pgi'
  | 'vacancy'
  | 'credit'
  | 'opex'
  | 'caprate'
  | 'maint'
  | 'taxes'
  | 'insurance'
  | 'mgmt'
  | 'utilities'
  | 'reserves'
  | 'other-exp'
  | 'unitmix'
  | 'narrative'
  | 'generic';

export interface ApproachTab {
  id: ApproachId;
  label: string;
  status: ApproachStatus;
}

export interface PillConfig {
  id: string;
  label: string;
  isFlyout?: boolean;
}

export interface ApproachPillSet {
  approachId: ApproachId;
  pills: PillConfig[];
  defaultPill: string;
}

export interface ProformaRowData {
  dot: DotColor;
  label: string;
  input?: string;
  inputSource?: InputSource;
  value: string;
  valueType?: ValueType;
  detail?: string;
  isSubtotal?: boolean;
  isWaiting?: boolean;
  detailId?: DetailId | string;
  detailLabel?: string;
}

export interface Project {
  project_id: number;
  project_name: string;
  project_type_code?: string;
  project_type?: string;
  property_subtype?: string;
  analysis_type?: string;
  value_add_enabled?: boolean;
  [key: string]: unknown;
}
