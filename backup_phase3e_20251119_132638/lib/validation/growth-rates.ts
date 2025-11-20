// Growth Rate Validation Utilities

import type {
  GrowthRateStep,
  GrowthRateAssumption,
  GrowthRateValidationError,
  CreateGrowthRateRequest,
  UpdateGrowthRateRequest
} from '../../types/growth-rates';

export class GrowthRateValidator {
  private errors: GrowthRateValidationError[] = [];

  private addError(field: string, message: string): void {
    this.errors.push({ field, message });
  }

  private validateRate(rate: string, fieldName: string): boolean {
    if (!rate || rate.trim() === '') {
      this.addError(fieldName, 'Rate is required');
      return false;
    }

    // Check for percentage format (e.g., "2.5%", "3.8%")
    const percentagePattern = /^\d+(\.\d+)?%$/;
    // Check for unit format (e.g., "7.5/mo", "12/mo")
    const unitPattern = /^\d+(\.\d+)?\/\w+$/;
    // Check for simple number (e.g., "2.5", "3.8")
    const numberPattern = /^\d+(\.\d+)?$/;

    if (!percentagePattern.test(rate) && !unitPattern.test(rate) && !numberPattern.test(rate)) {
      this.addError(fieldName, 'Rate must be in format: "2.5%", "7.5/mo", or "2.5"');
      return false;
    }

    return true;
  }

  private validatePeriod(period: number | string, fieldName: string): boolean {
    if (period === null || period === undefined) {
      this.addError(fieldName, 'Period is required');
      return false;
    }

    if (typeof period === 'string' && period !== 'E') {
      this.addError(fieldName, 'Period must be a number or "E" for end');
      return false;
    }

    if (typeof period === 'number' && (period < 1 || period > 1000)) {
      this.addError(fieldName, 'Period must be between 1 and 1000');
      return false;
    }

    return true;
  }

  private validateStep(step: GrowthRateStep, stepIndex: number): boolean {
    let isValid = true;

    // Validate step number
    if (step.step !== stepIndex + 1) {
      this.addError(`steps[${stepIndex}].step`, `Step number must be ${stepIndex + 1}`);
      isValid = false;
    }

    // Validate rate
    if (!this.validateRate(step.rate, `steps[${stepIndex}].rate`)) {
      isValid = false;
    }

    // Validate periods
    if (!this.validatePeriod(step.period, `steps[${stepIndex}].period`)) {
      isValid = false;
    }

    if (!this.validatePeriod(step.periods, `steps[${stepIndex}].periods`)) {
      isValid = false;
    }

    // Validate thru period
    if (typeof step.thru !== 'number' || step.thru < 1) {
      this.addError(`steps[${stepIndex}].thru`, 'Thru period must be a positive number');
      isValid = false;
    }

    // Validate period sequence
    if (typeof step.period === 'number' && typeof step.thru === 'number' && step.period > step.thru) {
      this.addError(`steps[${stepIndex}].period`, 'Start period cannot be greater than end period');
      isValid = false;
    }

    return isValid;
  }

  private validateStepsSequence(steps: GrowthRateStep[]): boolean {
    let isValid = true;

    if (steps.length === 0) {
      this.addError('steps', 'At least one step is required');
      return false;
    }

    // Check for period gaps and overlaps
    for (let i = 1; i < steps.length; i++) {
      const prevStep = steps[i - 1];
      const currentStep = steps[i];

      if (typeof prevStep.thru === 'number' && typeof currentStep.period === 'number') {
        if (currentStep.period !== prevStep.thru + 1) {
          this.addError(`steps[${i}].period`, 'Period sequence must be continuous (no gaps or overlaps)');
          isValid = false;
        }
      }
    }

    // Check that only the last step can have "E" periods
    for (let i = 0; i < steps.length - 1; i++) {
      if (steps[i].periods === 'E') {
        this.addError(`steps[${i}].periods`, 'Only the last step can have "E" (end) periods');
        isValid = false;
      }
    }

    return isValid;
  }

  private validateImpact(impact: Record<string, unknown>): boolean {
    let isValid = true;

    if (!impact) {
      this.addError('impact', 'Impact data is required');
      return false;
    }

    // Validate dollar amount format (e.g., "$12.3M", "$1.5B")
    if (!impact.dollarAmount || !/^\$\d+(\.\d+)?[KMB]?$/.test(impact.dollarAmount)) {
      this.addError('impact.dollarAmount', 'Dollar amount must be in format: "$12.3M", "$1.5B", etc.');
      isValid = false;
    }

    // Validate percentage format (e.g., "24.1%")
    if (!impact.percentOfProject || !/^\d+(\.\d+)?%$/.test(impact.percentOfProject)) {
      this.addError('impact.percentOfProject', 'Percent of project must be in format: "24.1%"');
      isValid = false;
    }

    // Validate IRR impact format (e.g., "+380", "-210")
    if (!impact.irrImpact || !/^[+-]?\d+$/.test(impact.irrImpact)) {
      this.addError('impact.irrImpact', 'IRR impact must be in format: "+380", "-210", etc.');
      isValid = false;
    }

    return isValid;
  }

  public validateCreateRequest(request: CreateGrowthRateRequest): GrowthRateValidationError[] {
    this.errors = [];

    // Validate required fields
    if (!request.category || request.category.trim() === '') {
      this.addError('category', 'Category is required');
    }

    if (!request.name || request.name.trim() === '') {
      this.addError('name', 'Name is required');
    }

    // Validate global rate
    if (request.globalRate) {
      this.validateRate(request.globalRate, 'globalRate');
    }

    // Validate steps if provided
    if (request.steps && request.steps.length > 0) {
      request.steps.forEach((step, index) => {
        this.validateStep(step, index);
      });
      this.validateStepsSequence(request.steps);
    }

    // Validate impact if provided
    if (request.impact) {
      this.validateImpact(request.impact);
    }

    return this.errors;
  }

  public validateUpdateRequest(request: UpdateGrowthRateRequest): GrowthRateValidationError[] {
    this.errors = [];

    // Validate ID
    if (!request.id || typeof request.id !== 'number') {
      this.addError('id', 'Valid assumption ID is required');
    }

    // Validate global rate if provided
    if (request.globalRate !== undefined) {
      this.validateRate(request.globalRate, 'globalRate');
    }

    // Validate steps if provided
    if (request.steps && request.steps.length > 0) {
      request.steps.forEach((step, index) => {
        this.validateStep(step, index);
      });
      this.validateStepsSequence(request.steps);
    }

    // Validate impact if provided
    if (request.impact) {
      this.validateImpact(request.impact);
    }

    return this.errors;
  }

  public validateAssumption(assumption: GrowthRateAssumption): GrowthRateValidationError[] {
    this.errors = [];

    // Validate basic fields
    if (!assumption.name || assumption.name.trim() === '') {
      this.addError('name', 'Name is required');
    }

    if (!assumption.category || assumption.category.trim() === '') {
      this.addError('category', 'Category is required');
    }

    // Validate global rate
    this.validateRate(assumption.globalRate, 'globalRate');

    // Validate steps
    if (assumption.steps && assumption.steps.length > 0) {
      assumption.steps.forEach((step, index) => {
        this.validateStep(step, index);
      });
      this.validateStepsSequence(assumption.steps);
    }

    // Validate impact
    this.validateImpact(assumption.impact);

    return this.errors;
  }
}

// Utility functions
export function validateGrowthRateCreate(request: CreateGrowthRateRequest): GrowthRateValidationError[] {
  const validator = new GrowthRateValidator();
  return validator.validateCreateRequest(request);
}

export function validateGrowthRateUpdate(request: UpdateGrowthRateRequest): GrowthRateValidationError[] {
  const validator = new GrowthRateValidator();
  return validator.validateUpdateRequest(request);
}

export function validateGrowthRateAssumption(assumption: GrowthRateAssumption): GrowthRateValidationError[] {
  const validator = new GrowthRateValidator();
  return validator.validateAssumption(assumption);
}

// Helper to check if a validation result has errors
export function hasValidationErrors(errors: GrowthRateValidationError[]): boolean {
  return errors.length > 0;
}

// Helper to format validation errors for display
export function formatValidationErrors(errors: GrowthRateValidationError[]): string {
  if (errors.length === 0) return '';

  return errors
    .map(error => `${error.field}: ${error.message}`)
    .join('; ');
}