'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';

interface FlyoutState {
  isOpen: boolean;
  flyoutId: string | null;
  data?: Record<string, unknown>;
}

interface FlyoutContextValue {
  flyout: FlyoutState;
  openFlyout: (
    flyoutId: string,
    route?: string,
    tab?: string,
    data?: Record<string, unknown>
  ) => void;
  closeFlyout: () => void;
}

const FlyoutContext = createContext<FlyoutContextValue | null>(null);

export function FlyoutProvider({
  children,
  projectId,
}: {
  children: React.ReactNode;
  projectId: number;
}) {
  const router = useRouter();
  const [flyout, setFlyout] = useState<FlyoutState>({
    isOpen: false,
    flyoutId: null,
  });

  const openFlyout = useCallback(
    (
      flyoutId: string,
      route?: string,
      tab?: string,
      data?: Record<string, unknown>
    ) => {
      if (route) {
        const url = tab
          ? `/projects/${projectId}/studio/${route}?tab=${tab}`
          : `/projects/${projectId}/studio/${route}`;
        router.push(url);
      }

      setFlyout({ isOpen: true, flyoutId, data });
    },
    [projectId, router]
  );

  const closeFlyout = useCallback(() => {
    setFlyout({ isOpen: false, flyoutId: null });
  }, []);

  return (
    <FlyoutContext.Provider value={{ flyout, openFlyout, closeFlyout }}>
      {children}
    </FlyoutContext.Provider>
  );
}

export function useFlyout() {
  const context = useContext(FlyoutContext);
  if (!context) {
    throw new Error('useFlyout must be used within FlyoutProvider');
  }
  return context;
}
