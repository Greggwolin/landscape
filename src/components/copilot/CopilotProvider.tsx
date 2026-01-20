'use client';

import { CopilotKit } from '@copilotkit/react-core';
import { ReactNode } from 'react';

interface CopilotProviderProps {
  children: ReactNode;
}

/**
 * CopilotKit Provider wrapper for the application.
 * This should wrap components that need access to CopilotKit features.
 */
export function CopilotProvider({ children }: CopilotProviderProps) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      {children}
    </CopilotKit>
  );
}

export default CopilotProvider;
