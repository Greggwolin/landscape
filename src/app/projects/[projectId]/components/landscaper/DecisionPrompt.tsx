'use client';

import React, { useState } from 'react';

interface Decision {
  id: string;
  question: string;
  context: string;
  options: { label: string; value: string }[];
  agent: string;
}

interface DecisionPromptProps {
  decision: Decision;
}

export function DecisionPrompt({ decision }: DecisionPromptProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
      <div className="flex items-start gap-3">
        <span className="text-xl">?</span>
        <div className="flex-1">
          <p className="font-medium">{decision.question}</p>
          <p className="text-sm text-muted mt-1">{decision.context}</p>

          <div className="flex flex-wrap gap-2 mt-3">
            {decision.options.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelected(option.value)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm border transition-colors
                  ${selected === option.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>

          {selected && (
            <button className="mt-3 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors">
              Confirm
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
