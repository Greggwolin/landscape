'use client';

import React from 'react';
import { CFormSelect } from '@coreui/react';

const ITEM_TAG = 'ui-select-item';
const VALUE_TAG = 'ui-select-value';

type SelectItemDef = { value: string; label: React.ReactNode };

function walkChildren(node: React.ReactNode, items: SelectItemDef[], meta: { placeholder?: string }) {
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return;
    const typeTag = (child.type as any)?._compatTag;
    const childElement = child as React.ReactElement<Record<string, unknown>>;
    if (typeTag === ITEM_TAG) {
      items.push({ value: childElement.props.value, label: childElement.props.children });
      return;
    }
    if (typeTag === VALUE_TAG) {
      meta.placeholder = childElement.props.placeholder as string | undefined;
      return;
    }
    if (childElement.props?.children) {
      walkChildren(childElement.props.children, items, meta);
    }
  });
}

export function Select({
  value,
  onValueChange,
  disabled,
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const items: SelectItemDef[] = [];
  const meta: { placeholder?: string } = {};
  walkChildren(children, items, meta);

  return (
    <CFormSelect
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => onValueChange?.(event.currentTarget.value)}
    >
      {meta.placeholder ? <option value="">{meta.placeholder}</option> : null}
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </CFormSelect>
  );
}

export function SelectTrigger({ children }: { id?: string; children?: React.ReactNode }) {
  return <>{children}</>;
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span style={{ display: 'none' }}>{placeholder}</span>;
}
(SelectValue as any)._compatTag = VALUE_TAG;

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <span data-value={value}>{children}</span>;
}
(SelectItem as any)._compatTag = ITEM_TAG;

