'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ComplexityTier = 'basic' | 'standard' | 'advanced';

interface ComplexityModeContextType {
  // Global mode (default for all tabs)
  globalMode: ComplexityTier;
  setGlobalMode: (mode: ComplexityTier) => void;

  // Per-tab overrides
  tabModes: Record<string, ComplexityTier>;
  setTabMode: (tab: string, mode: ComplexityTier) => void;
  getEffectiveMode: (tab: string) => ComplexityTier;

  // User capabilities (for pricing tiers)
  userCapabilities: UserCapabilities;

  // Persistence
  saveModePreferences: () => Promise<void>;
}

interface UserCapabilities {
  subscriptionTier: 'free' | 'freemium' | 'professional' | 'enterprise';
  modesAvailable: ComplexityTier[];
  fieldChooserUnrestricted: boolean;
  fieldChooserMaxColumns?: number;
  aiExtraction: boolean;
  marketIntelligence: boolean | 'basic' | 'full';
  templateExport: boolean;
}

const ComplexityModeContext = createContext<ComplexityModeContextType | undefined>(undefined);

export function ComplexityModeProvider({
  children,
  userId,
  projectId
}: {
  children: React.ReactNode;
  userId: string;
  projectId?: number;
}) {
  const [globalMode, setGlobalMode] = useState<ComplexityTier>('standard');
  const [tabModes, setTabModes] = useState<Record<string, ComplexityTier>>({});
  const [userCapabilities] = useState<UserCapabilities>({
    subscriptionTier: 'free',
    modesAvailable: ['basic', 'standard', 'advanced'], // Current strategy: all modes available
    fieldChooserUnrestricted: true,
    aiExtraction: false,
    marketIntelligence: false,
    templateExport: false
  });

  // Load user preferences from localStorage on mount
  useEffect(() => {
    loadUserPreferences();
  }, [userId, projectId]);

  const loadUserPreferences = async () => {
    try {
      // Use localStorage for MVP
      const storageKey = `complexity_mode_${projectId || 'global'}`;
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        const prefs = JSON.parse(stored);
        setGlobalMode(prefs.globalMode || 'standard');
        setTabModes(prefs.tabModes || {});
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  };

  const saveModePreferences = async () => {
    try {
      const storageKey = `complexity_mode_${projectId || 'global'}`;
      localStorage.setItem(storageKey, JSON.stringify({
        globalMode,
        tabModes
      }));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const setTabMode = (tab: string, mode: ComplexityTier) => {
    setTabModes(prev => ({ ...prev, [tab]: mode }));
  };

  const getEffectiveMode = (tab: string): ComplexityTier => {
    // Check if user has access to requested mode
    const requestedMode = tabModes[tab] || globalMode;

    if (!userCapabilities.modesAvailable.includes(requestedMode)) {
      // Downgrade to highest available mode
      const tierOrder: ComplexityTier[] = ['basic', 'standard', 'advanced'];
      const availableIndex = Math.max(
        ...userCapabilities.modesAvailable.map(m => tierOrder.indexOf(m))
      );
      return tierOrder[availableIndex];
    }

    return requestedMode;
  };

  // Auto-save when modes change
  useEffect(() => {
    const timer = setTimeout(() => {
      saveModePreferences();
    }, 1000);
    return () => clearTimeout(timer);
  }, [globalMode, tabModes]);

  return (
    <ComplexityModeContext.Provider
      value={{
        globalMode,
        setGlobalMode,
        tabModes,
        setTabMode,
        getEffectiveMode,
        userCapabilities,
        saveModePreferences
      }}
    >
      {children}
    </ComplexityModeContext.Provider>
  );
}

export function useComplexityMode() {
  const context = useContext(ComplexityModeContext);
  if (!context) {
    throw new Error('useComplexityMode must be used within ComplexityModeProvider');
  }
  return context;
}
