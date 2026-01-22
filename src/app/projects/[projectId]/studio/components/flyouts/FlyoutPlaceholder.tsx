"use client";

import React from "react";

interface FlyoutPlaceholderProps {
  title: string;
  icon: string;
  description: string;
  note?: string;
}

export default function FlyoutPlaceholder({
  title,
  icon,
  description,
  note,
}: FlyoutPlaceholderProps) {
  return (
    <div className="flyout-placeholder">
      <div className="placeholder-icon">{icon}</div>
      <h4>{title}</h4>
      <p className="text-muted">{description}</p>
      {note ? (
        <p className="text-muted small">{note}</p>
      ) : null}
    </div>
  );
}
