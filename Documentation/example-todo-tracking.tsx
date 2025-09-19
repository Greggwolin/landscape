// Example: How to track TODOs in React components
// File: src/app/components/ExampleComponent.tsx

import React from 'react';

/**
 * DEVELOPMENT STATUS TRACKING
 * 
 * COMPLETED ✅:
 * - Basic component structure
 * - Props interface definition
 * - Initial styling
 * 
 * IN PROGRESS 🟡:
 * - [ ] Mobile responsive design (50% complete)
 * - [ ] Accessibility improvements (25% complete)
 * 
 * OUTSTANDING ISSUES ❌:
 * - [ ] Add error handling for failed API calls
 * - [ ] Implement loading states  
 * - [ ] Add confirmation dialogs for destructive actions
 * 
 * DESIGN IMPROVEMENTS 🎨:
 * - [ ] Better hover states
 * - [ ] Smooth animations between states
 * - [ ] Consistent spacing with design system
 * 
 * TECHNICAL DEBT 🔧:
 * - [ ] Replace any types with proper interfaces
 * - [ ] Add unit tests (currently 0% coverage)
 * - [ ] Optimize re-renders with React.memo
 * 
 * LAST UPDATED: 2025-09-13
 * PRIORITY: High
 */

interface ExampleProps {
  // TODO: Add proper TypeScript interfaces
  data: any; // FIXME: Replace with proper type
  onAction: (id: string) => void;
  
  // NOTE: These props will be added in next iteration
  // isLoading?: boolean;
  // error?: string;
}

const ExampleComponent: React.FC<ExampleProps> = ({ data, onAction }) => {
  
  // TODO: Add error handling
  // if (!data) return <ErrorState />;
  
  // TODO: Add loading state
  // if (isLoading) return <LoadingSpinner />;
  
  // HACK: Temporary inline styles - move to CSS modules
  const containerStyle = {
    padding: '16px', // TODO: Use design system spacing
    border: '1px solid #ccc' // FIXME: Use theme colors
  };

  return (
    <div style={containerStyle}>
      {/* TODO: Add proper semantic HTML */}
      <div>
        {/* FIXME: This breaks on mobile - needs responsive design */}
        <h2>Example Component</h2>
        
        {/* TODO: Add loading skeleton while data loads */}
        {data.map((item: any) => ( // TODO: Type this properly
          <div key={item.id}>
            {/* TODO: Add proper keyboard navigation */}
            <button 
              onClick={() => onAction(item.id)}
              // TODO: Add proper focus indicators
              // TODO: Add ARIA labels for screen readers
            >
              {item.name}
            </button>
          </div>
        ))}
        
        {/* TODO: Add empty state component */}
        {data.length === 0 && <p>No data available</p>}
      </div>
      
      {/* TODO: Add confirmation modal component */}
      {/* TODO: Add success/error toast notifications */}
    </div>
  );
};

export default ExampleComponent;

/**
 * TESTING TODO:
 * - [ ] Unit tests for component rendering
 * - [ ] Integration tests with mock data
 * - [ ] Accessibility testing with screen readers
 * - [ ] Visual regression tests
 * 
 * DOCUMENTATION TODO:
 * - [ ] Add JSDoc comments for props
 * - [ ] Create Storybook stories
 * - [ ] Add usage examples in README
 * 
 * PERFORMANCE TODO:
 * - [ ] Implement virtualization for large lists
 * - [ ] Add React.memo optimization
 * - [ ] Optimize bundle size
 */