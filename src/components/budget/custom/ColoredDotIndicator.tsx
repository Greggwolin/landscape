// Colored Dot Indicator for Budget Category Hierarchy
// v1.0 · 2025-11-03

'use client';

import React from 'react';

interface ColoredDotIndicatorProps {
 categoryL1Name?: string | null;
 categoryL2Name?: string | null;
 categoryL3Name?: string | null;
 categoryL4Name?: string | null;
 isGrouped: boolean;
 onClick?: () => void;
}

const LEVEL_COLORS = {
 1: 'var(--cui-primary)', // Blue
 2: 'var(--cui-success)', // Green
 3: 'var(--cui-warning)', // Yellow/Amber
 4: 'var(--cui-danger)', // Red
};

export default function ColoredDotIndicator({
 categoryL1Name,
 categoryL2Name,
 categoryL3Name,
 categoryL4Name,
 isGrouped,
 onClick,
}: ColoredDotIndicatorProps) {
 // Build breadcrumb for tooltip
 const breadcrumbParts: string[] = [];
 if (categoryL1Name) breadcrumbParts.push(categoryL1Name);
 if (categoryL2Name) breadcrumbParts.push(categoryL2Name);
 if (categoryL3Name) breadcrumbParts.push(categoryL3Name);
 if (categoryL4Name) breadcrumbParts.push(categoryL4Name);

 const breadcrumb = breadcrumbParts.join(' → ');

 // Determine most granular level
 const displayName = categoryL4Name || categoryL3Name || categoryL2Name || categoryL1Name || '-';

 // Determine which dots to show (starting at L2, not L1)
 const showDots = {
 l2: !!categoryL2Name,
 l3: !!categoryL3Name,
 l4: !!categoryL4Name,
 };

 // Calculate indentation to align first vertical line with parent's chevron (when grouped)
 // When isGrouped = true:
 // - Parent row: <td style={{paddingLeft: '20px'}}> → content starts at 20px
 // - Chevron is first element, 12px wide, so chevron LEFT EDGE is at 20px
 // - Item needs marginLeft to push to same position (20px from cell edge)
 // - But we're aligning with chevron right edge (after gap-2 which is 8px)
 // - Actually: chevron left edge at 20px, need to match that exactly
 // When isGrouped = false:
 // - No parent rows, so no alignment needed, use normal padding

 const parentIndent = isGrouped ? 0 : 8;

 if (!categoryL1Name) {
 // No categories assigned
 return (
 <div
 className="d-flex align-items-center"
 style={{
 cursor: onClick ? 'pointer' : 'default',
 paddingTop: '4px',
 paddingBottom: '4px',
 paddingRight: '8px',
 paddingLeft: `${parentIndent}px`,
 marginLeft: isGrouped ? '32px' : '0',
 minHeight: '32px',
 }}
 onClick={onClick}
 title="Click to assign category"
 >
 <span className="text-muted">-</span>
 </div>
 );
 }

 return (
 <div
 className="d-flex align-items-center"
 style={{
 cursor: onClick ? 'pointer' : 'default',
 paddingTop: '4px',
 paddingBottom: '4px',
 paddingRight: '8px',
 paddingLeft: `${parentIndent}px`,
 marginLeft: isGrouped ? '32px' : '0',
 minHeight: '32px',
 }}
 onClick={onClick}
 title={breadcrumb}
 >
 {/* Colored Vertical Lines - Only show L2+ - BEFORE text, aligned with parent chevron */}
 {(showDots.l2 || showDots.l3 || showDots.l4) && (
 <div className="d-flex align-items-center me-2" style={{ gap: '2px' }}>
 {showDots.l2 && (
 <span
 style={{
 width: '3px',
 height: '1em',
 backgroundColor: LEVEL_COLORS[2],
 display: 'inline-block',
 }}
 />
 )}
 {showDots.l3 && (
 <span
 style={{
 width: '3px',
 height: '1em',
 backgroundColor: LEVEL_COLORS[3],
 display: 'inline-block',
 }}
 />
 )}
 {showDots.l4 && (
 <span
 style={{
 width: '3px',
 height: '1em',
 backgroundColor: LEVEL_COLORS[4],
 display: 'inline-block',
 }}
 />
 )}
 </div>
 )}

 {/* Category Name */}
 <span
 className="d-inline-block text-truncate"
 style={{ maxWidth: '200px' }}
 >
 {displayName}
 </span>
 </div>
 );
}
