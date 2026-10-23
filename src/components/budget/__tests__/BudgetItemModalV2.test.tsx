/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BudgetItemModalV2 from '../BudgetItemModalV2';
import type { BudgetItem } from '../ColumnDefinitions';

jest.mock('@/lib/authHeaders', () => ({ getAuthHeaders: () => ({}) }));
jest.mock('@/components/common/UOMSelect', () => ({ UOMSelect: () => null }));
jest.mock('@/hooks/useUnitCostCategoriesForBudget', () => ({
  useUnitCostCategoriesForBudget: () => ({
    // Current taxonomy offers Improvements; an existing Development line must
    // still show its saved stage, without silently changing its meaning.
    stageOptions: [{ id: 'Improvements', name: 'Improvements' }],
    loading: false,
    error: null,
    getCategoriesByStage: () => [],
    getChildren: () => [],
    getCategoryById: () => ({ category_id: 8, category_name: 'Offsite Improvements' }),
  }),
}));

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ containers: [], config: {}, results: [] }),
  });
});

afterEach(() => { jest.restoreAllMocks(); });

it('shows the saved Stage and Category when opening Access Road', async () => {
  const onSave = jest.fn();
  render(<BudgetItemModalV2 open mode="edit" projectId={9} activeBudgetMode="detail"
    initialItem={{ fact_id: 42, division_id: 11, activity: 'Development',
      category_l1_id: 8, notes: 'Access Road' } as BudgetItem}
    onClose={jest.fn()} onSave={onSave} />);
  await waitFor(() => {
    expect(screen.getByLabelText('Stage *')).toHaveValue('Development');
    expect(screen.getByLabelText('Category *')).toHaveValue('8');
  });
  expect(screen.getByRole('option', { name: 'Offsite Improvements' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
    activity: 'Development', category_l1_id: 8, notes: 'Access Road',
  })));
});

it('initializes a new line from its supplied stage instead of retaining the previous line', async () => {
  const props = { open: true, projectId: 9, activeBudgetMode: 'detail' as const,
    onClose: jest.fn(), onSave: jest.fn() };
  const { rerender } = render(<BudgetItemModalV2 {...props} mode="edit"
    initialItem={{ fact_id: 42, activity: 'Development', category_l1_id: 8 } as BudgetItem} />);
  await waitFor(() => expect(screen.getByLabelText('Stage *')).toHaveValue('Development'));
  rerender(<BudgetItemModalV2 {...props} mode="create" initialFormValues={{ activity: 'Improvements' }} />);
  await waitFor(() => expect(screen.getByLabelText('Stage *')).toHaveValue('Improvements'));
});
