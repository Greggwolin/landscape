'use client';

import { useEffect, useState } from 'react';
import { BasketConfig, ComplexityTier } from '@/types/assumptions';
import { FieldGroup } from './FieldGroup';
import { getFieldsForTier, getGroupsForTier } from '@/config/assumptions';
import type { ChangeOrigin } from '@/lib/assumptions/autoSave';

interface AssumptionBasketProps {
  basket: BasketConfig;
  values: Record<string, any>;
  currentMode: ComplexityTier;
  /**
   * `origin` says whether a person made this change or the form derived it
   * (autoCalc). Only 'user' may arm an auto-save — see
   * `src/lib/assumptions/autoSave.ts`.
   */
  onChange: (key: string, value: any, origin: ChangeOrigin) => void;
  onModeChange?: (mode: ComplexityTier) => void;
  showModeToggle?: boolean;
  /**
   * The project's type code. Fields and groups that declare a property-type
   * list are hidden when this is not on it — a land deal is not asked for an
   * exit cap rate. Undefined shows everything, which is the safe direction.
   */
  projectType?: string | null;
}

export function AssumptionBasket({
  basket,
  values,
  currentMode,
  onChange,
  onModeChange,
  showModeToggle = true,
  projectType
}: AssumptionBasketProps) {
  const [localMode, setLocalMode] = useState<ComplexityTier>(currentMode);

  useEffect(() => {
    setLocalMode(currentMode);
  }, [currentMode]);

  const handleModeChange = (newMode: ComplexityTier) => {
    setLocalMode(newMode);
    if (onModeChange) {
      onModeChange(newMode);
    }
  };

  const visibleFields = getFieldsForTier(basket.basketId, localMode, projectType);
  const visibleGroups = getGroupsForTier(basket.basketId, localMode, projectType);

  return (
    <div className="assumption-basket">
      {/* Basket header */}
      <div className="basket-header">
        <div>
          <h2 className="basket-title">{basket.basketName}</h2>
          <p className="basket-description">{basket.basketDescription}</p>
        </div>

        {/* Mode toggle - per basket */}
        {showModeToggle && (
          <div className="mode-toggle">
            <button
              className={`mode-btn ${localMode === 'napkin' ? 'active' : ''}`}
              onClick={() => handleModeChange('napkin')}
            >
              Napkin
            </button>
            <button
              className={`mode-btn ${localMode === 'mid' ? 'active' : ''}`}
              onClick={() => handleModeChange('mid')}
            >
              Mid
            </button>
            <button
              className={`mode-btn ${localMode === 'pro' ? 'active' : ''}`}
              onClick={() => handleModeChange('pro')}
            >
              Pro
            </button>
          </div>
        )}
      </div>

      {/* Basket content */}
      <div className="basket-content">
        {visibleGroups.map(group => (
          <FieldGroup
            key={group.id}
            group={group}
            fields={visibleFields}
            values={values}
            currentMode={localMode}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}
