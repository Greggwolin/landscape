'use client';

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type {
  IncompleteCategoriesResponse,
  IncompleteCategoryStatus,
} from '@/types/budget-categories';

interface IncompleteCategoriesReminderProps {
  projectId: number;
  className?: string;
}

/**
 * Incomplete Categories Reminder Banner
 *
 * Shows banner for categories created via quick-add that need completion.
 *
 * Features:
 * - Shows count of incomplete categories
 * - Expandable list showing usage counts and missing fields
 * - "Complete Now" link to admin panel
 * - "Dismiss for 7 days" action
 * - Auto-refreshes when new categories added
 */
export function IncompleteCategoriesReminder({
  projectId,
  className = '',
}: IncompleteCategoriesReminderProps) {
  const { showToast } = useToast();

  const [data, setData] = useState<IncompleteCategoriesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  // Fetch incomplete categories
  const fetchIncomplete = async () => {
    try {
      const response = await fetch(
        `/api/financial/budget-categories/incomplete/?project_id=${projectId}`
      );

      if (!response.ok) {
        // Endpoint doesn't exist yet - fail silently
        setIsLoading(false);
        return;
      }

      const result: IncompleteCategoriesResponse = await response.json();
      setData(result);
    } catch (error) {
      // Fail silently - this is a non-critical feature
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomplete();
    // Refresh every 5 minutes
    const interval = setInterval(fetchIncomplete, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [projectId]);

  // Dismiss all reminders for 7 days
  const handleDismissAll = async () => {
    if (!data || data.categories.length === 0) return;

    setIsDismissing(true);

    try {
      // Dismiss each category
      const dismissPromises = data.categories.map((cat) =>
        fetch(`/api/financial/budget-categories/${cat.category_id}/dismiss-reminder/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ days: 7 }),
        })
      );

      await Promise.all(dismissPromises);

      showToast(`You won't see reminders for these categories for 7 days.`, 'success');

      // Clear banner
      setData(null);
    } catch (error) {
      console.error('Failed to dismiss reminders:', error);

      showToast('Failed to dismiss reminders. Please try again.', 'error');
    } finally {
      setIsDismissing(false);
    }
  };

  // Don't show anything if loading or no incomplete categories
  if (isLoading || !data || data.count === 0) {
    return null;
  }

  return (
    <Alert className={`border-amber-500 bg-amber-50 dark:bg-amber-950 ${className}`}>
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />

      <div className="flex-1 ml-2">
        <AlertTitle className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2">
            Incomplete Budget Categories
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
              {data.count}
            </Badge>
          </span>

          <div className="flex items-center gap-2">
            {/* Expand/Collapse */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 px-2 text-xs"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show Details
                </>
              )}
            </Button>

            {/* Dismiss */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissAll}
              disabled={isDismissing}
              className="h-6 px-2 text-xs"
            >
              <Clock className="h-3 w-3 mr-1" />
              Dismiss for 7 days
            </Button>

            {/* Complete Now */}
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                // Open admin panel in new tab
                window.open('/admin/preferences', '_blank');
              }}
              className="h-6 px-2 text-xs bg-amber-600 hover:bg-amber-700"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Complete Now
            </Button>
          </div>
        </AlertTitle>

        <AlertDescription>
          <p className="text-sm mb-2">
            You have {data.count} categor{data.count === 1 ? 'y' : 'ies'} that need completion
            (description, icon, color). Complete them in Admin → Preferences to improve budget
            organization.
          </p>

          {/* Expandable Details */}
          {isExpanded && (
            <div className="mt-3 space-y-2">
              {data.categories.map((cat) => (
                <IncompleteCategoryItem key={cat.category_id} category={cat} />
              ))}
            </div>
          )}
        </AlertDescription>
      </div>
    </Alert>
  );
}

/**
 * Individual Incomplete Category Item
 */
function IncompleteCategoryItem({ category }: { category: IncompleteCategoryStatus }) {
  return (
    <div className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 rounded border border-amber-200 dark:border-amber-800">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{category.category_name}</span>
          <Badge variant="outline" className="text-xs">
            L{category.category_level}
          </Badge>
          {category.usage_count > 0 && (
            <Badge variant="secondary" className="text-xs">
              Used {category.usage_count}x
            </Badge>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>Code: {category.category_code}</p>
          {category.parent_name !== 'No Parent' && (
            <p>Parent: {category.parent_name}</p>
          )}
          <p>Missing: {category.missing_fields.join(', ')}</p>
          <p className="text-amber-600 dark:text-amber-400">
            Created {category.days_since_created} day{category.days_since_created !== 1 ? 's' : ''} ago
          </p>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          // Open admin panel with this category selected
          window.open(category.admin_url, '_blank');
        }}
        className="h-8 px-2 text-xs"
      >
        <ExternalLink className="h-3 w-3 mr-1" />
        Edit
      </Button>
    </div>
  );
}

export default IncompleteCategoriesReminder;
