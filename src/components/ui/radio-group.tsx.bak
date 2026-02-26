'use client';

import React, { createContext, useContext } from 'react';

type RadioGroupContextType = {
  name?: string;
  value?: string;
  onValueChange?: (value: string) => void;
};

const RadioGroupContext = createContext<RadioGroupContextType>({});

export function RadioGroup({
  className,
  name,
  value,
  onValueChange,
  children,
}: {
  className?: string;
  name?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <RadioGroupContext.Provider value={{ name, value, onValueChange }}>
      <div className={className}>{children}</div>
    </RadioGroupContext.Provider>
  );
}

export function RadioGroupItem({
  value,
  id,
  className,
}: {
  value: string;
  id?: string;
  className?: string;
}) {
  const ctx = useContext(RadioGroupContext);
  return (
    <input
      type="radio"
      id={id}
      className={className}
      name={ctx.name}
      value={value}
      checked={ctx.value === value}
      onChange={() => ctx.onValueChange?.(value)}
    />
  );
}

