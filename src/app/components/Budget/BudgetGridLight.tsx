'use client';

import BudgetGrid from './BudgetGrid';
import Box from '@mui/material/Box';

interface BudgetGridLightProps {
  projectId: number;
}

export default function BudgetGridLight({ projectId }: BudgetGridLightProps) {
  return (
    <Box className="p-6" sx={{ backgroundColor: 'action.hover', minHeight: '100vh' }}>
      <BudgetGrid projectId={projectId} />
    </Box>
  );
}
