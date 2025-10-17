'use client';

import { useEffect, useRef, useState } from 'react';
import { FieldGroup as FieldGroupType, FieldDefinition, ComplexityTier } from '@/types/assumptions';
import { FieldRenderer } from './FieldRenderer';

interface FieldGroupProps {
  group: FieldGroupType;
  fields: FieldDefinition[];
  values: Record<string, any>;
  currentMode: ComplexityTier;
  onChange: (key: string, value: any) => void;
}

export function FieldGroup({
  group,
  fields,
  values,
  currentMode,
  onChange
}: FieldGroupProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');
  const [isCollapsed, setIsCollapsed] = useState(group.defaultCollapsed || false);

  const tierOrder = { napkin: 1, mid: 2, pro: 3 };
  const isVisible = tierOrder[group.tier] <= tierOrder[currentMode];

  // Get fields that belong to this group
  const groupFields = fields.filter(f => group.fields.includes(f.key));

  // Smooth height transition when mode changes or collapse toggles
  useEffect(() => {
    if (contentRef.current) {
      if (isVisible && !isCollapsed) {
        // Force a layout calculation to get accurate height
        contentRef.current.style.maxHeight = 'none';
        const scrollHeight = contentRef.current.scrollHeight;
        contentRef.current.style.maxHeight = '0px';
        // Trigger reflow
        void contentRef.current.offsetHeight;
        setHeight(scrollHeight);
        // After animation, set to auto for responsiveness
        setTimeout(() => setHeight('auto'), 350);
      } else {
        setHeight(0);
      }
    }
  }, [isVisible, isCollapsed, currentMode, groupFields.length]);

  // Don't render group if not visible in current mode
  if (!isVisible) return null;

  return (
    <div className={`field-group ${isVisible ? 'visible' : 'hidden'}`}>
      {/* Group header - only show for mid/pro tiers */}
      {group.tier !== 'napkin' && (
        <div className="field-group-header">
          <div>
            <h3 className="field-group-label">{group.label}</h3>
            {group.description && (
              <p className="field-group-description">{group.description}</p>
            )}
          </div>
          {group.collapsible && (
            <button
              type="button"
              className="collapse-toggle"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? '▼' : '▲'}
            </button>
          )}
        </div>
      )}

      {/* Animated container */}
      <div
        ref={contentRef}
        className="field-group-content"
        style={{
          maxHeight: height === 'auto' ? 'none' : `${height}px`,
          opacity: isVisible && !isCollapsed ? 1 : 0,
          overflow: height === 'auto' ? 'visible' : 'hidden',
          transition: 'max-height 300ms ease-in-out, opacity 300ms ease-in-out'
        }}
      >
        <div className="field-grid">
          {groupFields.map(field => (
            <FieldRenderer
              key={field.key}
              field={field}
              value={values[field.key]}
              currentMode={currentMode}
              onChange={(value) => onChange(field.key, value)}
              allValues={values}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
