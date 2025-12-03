'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Check, AlertTriangle, Clock, Wrench, Bug, Palette, FileText, RefreshCw, Edit3, FileQuestion, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface StatusData {
  pages: {
    name: string;
    design: 'complete' | 'in-progress' | 'not-started';
    functionality: 'complete' | 'in-progress' | 'not-started';
    priority: 'high' | 'medium' | 'low';
    completion: number;
  }[];
  issues: {
    critical: number;
    major: number;
    minor: number;
  };
  technicalDebt: {
    database: number;
    codeQuality: number;
    infrastructure: number;
  };
  lastUpdated: string;
}

type IssueType = 'bug' | 'feature' | 'feedback' | 'question' | 'other';

interface IssueLogEntry {
  issueId: number;
  issueType: IssueType;
  title: string | null;
  description: string;
  pagePath: string | null;
  componentPath: string | null;
  branch: string | null;
  commitSha: string | null;
  reporterName: string | null;
  reporterEmail: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  resolvedAt: string | null;
  isOpen?: boolean;
}

const OFFLINE_QUEUE_KEY = 'devIssueOfflineQueue';

function readOfflineIssues(): IssueLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((issue) => ({
      issueId: issue.issueId ?? Date.now(),
      issueType: (issue.issueType as IssueType) ?? 'bug',
      title: issue.title ?? null,
      description: issue.description ?? '',
      pagePath: issue.pagePath ?? null,
      componentPath: issue.componentPath ?? null,
      branch: issue.branch ?? null,
      commitSha: issue.commitSha ?? null,
      reporterName: issue.reporterName ?? null,
      reporterEmail: issue.reporterEmail ?? null,
      metadata: issue.metadata ?? { source: 'offline-cache' },
      createdAt: issue.createdAt ?? new Date().toISOString(),
      resolvedAt: issue.resolvedAt ?? null,
      isOpen: issue.isOpen !== false,
    }));
  } catch (error) {
    console.error('Failed to read offline issues', error);
    return [];
  }
}

const LOCAL_SAMPLE_ISSUES: IssueLogEntry[] = [
  {
    issueId: 9001,
    issueType: 'bug',
    title: 'Parcel map filters reset on save',
    description:
      "When saving edits on Planning Overview, the parcel map filter chips reset to default and remove the developer's selected scope. Preserve the filters after save.",
    pagePath: '/planning/overview',
    componentPath: 'PlanningOverviewFilters',
    branch: 'local-sample',
    commitSha: null,
    reporterName: 'Sample QA',
    reporterEmail: 'qa@landscape.dev',
    metadata: { source: 'local-sample' },
    createdAt: '2025-01-05T14:20:00.000Z',
    resolvedAt: null,
    isOpen: true,
  },
  {
    issueId: 9002,
    issueType: 'feedback',
    title: 'Inflation cards need clearer empty state',
    description:
      'Growth Rates > Inflation cards render an empty grid without guidance. Add helper text so users know they must select a family first.',
    pagePath: '/market/assumptions',
    componentPath: 'InflationCardGrid',
    branch: 'local-sample',
    commitSha: null,
    reporterName: 'Sample QA',
    reporterEmail: 'qa@landscape.dev',
    metadata: { source: 'local-sample' },
    createdAt: '2025-01-05T15:05:00.000Z',
    resolvedAt: null,
    isOpen: true,
  },
  {
    issueId: 9003,
    issueType: 'bug',
    title: 'Budget variance chart flickers on hover',
    description:
      'The Budget Variance chart re-renders on every tooltip hover causing noticeable flicker. Memoize the dataset or throttle tooltip events.',
    pagePath: '/budget/variance',
    componentPath: 'BudgetVarianceChart',
    branch: 'local-sample',
    commitSha: null,
    reporterName: 'Sample QA',
    reporterEmail: 'qa@landscape.dev',
    metadata: { source: 'local-sample' },
    createdAt: '2025-01-05T16:12:00.000Z',
    resolvedAt: null,
    isOpen: true,
  },
  {
    issueId: 9004,
    issueType: 'feature',
    title: 'Need quick link to Dev Status in nav',
    description:
      'Product wants a persistent bug icon in the global nav so testers can log issues without scrolling. Consider a bug icon near the user menu.',
    pagePath: '/dashboard',
    componentPath: 'TopNavigationBar',
    branch: 'local-sample',
    commitSha: null,
    reporterName: 'Sample QA',
    reporterEmail: 'qa@landscape.dev',
    metadata: { source: 'local-sample' },
    createdAt: '2025-01-05T17:00:00.000Z',
    resolvedAt: null,
    isOpen: true,
  },
  {
    issueId: 9010,
    issueType: 'bug',
    title: 'Reapply Planning density work',
    description:
      'The per-project planning efficiency + DUA column changes were reverted. Keep this as a pending dev-status issue so we know it still needs reapplying.',
    pagePath: '/planning/overview',
    componentPath: 'PlanningContent',
    branch: 'local-sample',
    commitSha: null,
    reporterName: 'Local Dev',
    reporterEmail: 'dev@landscape.dev',
    metadata: { source: 'pending-dev-status' },
    createdAt: '2025-01-06T00:00:00.000Z',
    resolvedAt: '2025-01-06T00:00:00.000Z',
    isOpen: false,
  },
];

const ISSUE_BADGE_CLASSES: Record<IssueType, string> = {
  bug: 'bg-red-500/10 text-red-300 border border-red-500/30',
  feature: 'bg-blue-500/10 text-blue-300 border border-blue-500/30',
  feedback: 'bg-purple-500/10 text-purple-300 border border-purple-500/30',
  question: 'bg-amber-500/10 text-amber-300 border border-amber-500/30',
  other: 'bg-gray-500/10 text-gray-300 border border-gray-500/30',
};

const DevStatus: React.FC = () => {
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [issueLogs, setIssueLogs] = useState<IssueLogEntry[]>([]);
  const [baselineIssueLogs, setBaselineIssueLogs] = useState<IssueLogEntry[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [issuesError, setIssuesError] = useState<string | null>(null);
  const [issuesHydrated, setIssuesHydrated] = useState(false);
  const [issueFilterInput, setIssueFilterInput] = useState('');
  const [activeIssueFilter, setActiveIssueFilter] = useState('');

  // Load data from localStorage if available, otherwise use mock data
  useEffect(() => {
    const savedData = localStorage.getItem('devStatusData');
    if (savedData) {
      try {
        setStatusData(JSON.parse(savedData));
        setLoading(false);
        return;
      } catch (error) {
        console.error('Error parsing saved status data:', error);
      }
    }
    
    // Simulate loading from our markdown file or API if no saved data
    setTimeout(() => {
      setStatusData({
        pages: [
          {
            name: 'Home Dashboard',
            design: 'complete',
            functionality: 'in-progress',
            priority: 'high',
            completion: 85
          },
          {
            name: 'Land Use Management',
            design: 'complete',
            functionality: 'complete',
            priority: 'high',
            completion: 100
          },
          {
            name: 'Planning Overview',
            design: 'complete',
            functionality: 'complete',
            priority: 'high',
            completion: 95
          },
          {
            name: 'Parcel Detail',
            design: 'complete',
            functionality: 'complete',
            priority: 'high',
            completion: 75
          },
          {
            name: 'Market Assumptions (Global)',
            design: 'complete',
            functionality: 'complete',
            priority: 'high',
            completion: 100
          },
          {
            name: 'Growth Rates',
            design: 'complete',
            functionality: 'complete',
            priority: 'high',
            completion: 95
          },
          {
            name: 'Financial Modeling',
            design: 'not-started',
            functionality: 'not-started',
            priority: 'low',
            completion: 0
          },
          {
            name: 'Property Analysis (CRE)',
            design: 'complete',
            functionality: 'in-progress',
            priority: 'high',
            completion: 75
          },
          {
            name: 'Sales & Marketing',
            design: 'complete',
            functionality: 'complete',
            priority: 'high',
            completion: 95
          }
        ],
        issues: {
          critical: 0,
          major: 0,
          minor: 4
        },
        technicalDebt: {
          database: 1,
          codeQuality: 3,
          infrastructure: 4
        },
        lastUpdated: new Date().toLocaleDateString()
      });
      setLoading(false);
    }, 500);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'not-started':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'complete': return '✅ Complete';
      case 'in-progress': return '🟡 In Progress';
      case 'not-started': return '❌ Not Started';
      default: return '❓ Unknown';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCompletionColor = (completion: number) => {
    if (completion >= 90) return 'bg-green-500';
    if (completion >= 70) return 'bg-yellow-500';
    if (completion >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getPageNotes = (pageName: string) => {
    const notes = {
      'Home Dashboard': {
        context: 'Contact card-style layout with proper field sizing (Project ID 40%, City 20%, County 20%, State 5%, Start Date 15%). Edit functionality moved to header.',
        outstanding: [
          'Mobile responsiveness - form layout breaks on screens < 768px',
          'Client-side form validation not implemented',
          'Loading states missing during save operations',
          'Error handling for failed API calls',
          'Accessibility support needed (focus indicators, screen readers)'
        ]
      },
      'Land Use Management': {
        context: 'Complete 4-level taxonomy system (Family → Density → Type → Product) with working cascading dropdowns. Database-driven with proper API endpoints and comprehensive field population.',
        outstanding: [
          'Mobile responsive grid needed (currently fixed 3 columns)',
          'Keyboard navigation support missing',
          'Search/filtering for large datasets',
          'API call optimization with caching'
        ]
      },
      'Planning Overview': {
        context: 'Comprehensive inline editing system with working taxonomy dropdowns. Full parcel editing capabilities with cascading Family → Type → Product selections. Database integration with real-time updates.',
        outstanding: [
          'Advanced filtering options in development',
          'Financial calculations integration pending',
          'Bulk edit capabilities for multiple parcels',
          'Performance optimization for large datasets (>500 parcels)',
          'Data export functionality needed'
        ]
      },
      'Parcel Detail': {
        context: 'Complete taxonomy system with working cascading dropdowns (Family → Type → Product). Fixed all DVL functionality, removed duplicates, proper field population, and matching styling. Full inline editing capabilities implemented.',
        outstanding: [
          'Mobile layout improvements needed',
          'Form validation implementation pending',
          'Loading states during API calls',
          'Better visual hierarchy for form sections'
        ]
      },
      'Market Assumptions (Global)': {
        context: 'Comprehensive integration with database-driven UOM options and complete UI reorganization. Market Factors card moved to right side, table restructured with logical groupings, and all dropdowns now use database UOM codes.',
        outstanding: [
          'UOM search/filter functionality for large option sets',
          'UOM preference saving for user-specific defaults',
          'Validation for UOM compatibility with calculation types',
          'UOM conversion capabilities between related units'
        ]
      },
      'Growth Rates': {
        context: 'Database-driven UOM integration completed. Table styling synchronized with Market Assumptions page for consistency.',
        outstanding: [
          'Advanced calculation engine integration',
          'Historical data visualization features',
          'Bulk update capabilities for multiple rates',
          'Export functionality for rate data'
        ]
      },
      'Financial Modeling': {
        context: 'Not yet implemented. Planned for future releases with advanced modeling capabilities.',
        outstanding: [
          'Complete feature design and implementation needed',
          'Integration with planning data',
          'Financial calculation engine',
          'Reporting and analytics features',
          'Multi-scenario modeling capabilities'
        ]
      },
      'Property Analysis (CRE)': {
        context: '7-tab ARGUS-level property analysis interface. Rent Roll tab complete with real data (41 spaces, 39 tenants, 6 leases). Market, Operating, and Financing assumption tabs have UI complete but use mock data. Computed tabs (Cash Flow, Investment Returns, Sensitivity) are locked until input tabs complete.',
        outstanding: [
          'Wire Market Assumptions tab to real API data',
          'Wire Operating Assumptions tab to real API data',
          'Wire Financing Assumptions tab to real API data',
          'Build cash flow calculation engine API',
          'Build investment returns calculation API',
          'Build sensitivity analysis engine',
          'Load remaining 32 leases (currently 6 of 38)',
          'Add PDF export functionality',
          'Add Excel export functionality'
        ]
      },
      'Sales & Marketing': {
        context: 'Complete pricing assumptions table with database-driven UOM and growth rate benchmarks. Parcel sales table with phase grouping and detail modal. Modal and table net proceeds calculations now match exactly. Monthly compounding for price inflation. Fixed Nov 26: Growth rate dropdown persistence and net proceeds divergence ($7.78M matches in both views).',
        outstanding: [
          'MUI to CoreUI migration for 3 modal components (SaleCalculationModal, CreateSalePhaseModal)',
          'Bulk parcel operations for phase assignment',
          'Export functionality for sales projections',
          'Historical sale tracking with closings'
        ]
      }
    };
    return notes[pageName as keyof typeof notes] || { context: 'No context available', outstanding: [] };
  };

  const handleEditClick = (index: number) => {
    if (editingRow === index) {
      setEditingRow(null);
      setEditFormData(null);
    } else {
      setEditingRow(index);
      // Initialize form data with current page data
      if (statusData) {
        setEditFormData({ ...statusData.pages[index] });
      }
      // Close notes accordion when opening edit form
      if (expandedNotes !== null) {
        setExpandedNotes(null);
      }
    }
  };

  const handleNotesClick = (index: number) => {
    setExpandedNotes(expandedNotes === index ? null : index);
    // Close edit form when opening notes
    if (editingRow !== null) {
      setEditingRow(null);
    }
  };

  const handleChatClick = (pageName: string) => {
    const notes = getPageNotes(pageName);
    const context = `I need help with ${pageName}. Current context: ${notes.context}. Outstanding items: ${notes.outstanding.join(', ')}`;
    // In a real implementation, this would open a chat interface or send to an AI assistant
    console.log('Opening chat with context:', context);
    alert(`Chat functionality would open here with context about ${pageName}`);
  };

  const calculateCompletion = (design: string, functionality: string) => {
    const statusWeights = {
      'complete': 50,
      'in-progress': 25,
      'not-started': 0
    };

    const designScore = statusWeights[design as keyof typeof statusWeights] || 0;
    const functionalityScore = statusWeights[functionality as keyof typeof statusWeights] || 0;

    return designScore + functionalityScore;
  };

  const handleFormFieldChange = (field: string, value: string) => {
    if (editFormData) {
      setEditFormData({ ...editFormData, [field]: value });
    }
  };

  const handleSaveChanges = () => {
    if (editingRow !== null && editFormData && statusData) {
      // Calculate new completion percentage
      const newCompletion = calculateCompletion(
        editFormData.design,
        editFormData.functionality
      );
      
      // Update the statusData with new values
      const updatedPages = [...statusData.pages];
      updatedPages[editingRow] = {
        ...editFormData,
        completion: newCompletion
      };
      
      const updatedStatusData = {
        ...statusData,
        pages: updatedPages,
        lastUpdated: new Date().toLocaleDateString()
      };
      
      setStatusData(updatedStatusData);
      setEditingRow(null);
      setEditFormData(null);
      
      // In a real app, this would also save to localStorage, API, or markdown file
      localStorage.setItem('devStatusData', JSON.stringify(updatedStatusData));
      console.log('Status data saved:', updatedStatusData);
    }
  };

  const fetchIssueLogs = useCallback(async (pagePath?: string, signal?: AbortSignal) => {
    setIssuesLoading(true);
    setIssuesError(null);

    try {
      const params = new URLSearchParams({ pageSize: '50' });
      if (pagePath) {
        params.set('pagePath', pagePath);
      }

      const response = await fetch(`/api/dev-status/issues?${params.toString()}`, {
        cache: 'no-store',
        signal,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof payload?.error === 'string'
            ? payload.error
            : 'Failed to load live issue log.';
        throw new Error(message);
      }

      const issues = Array.isArray(payload?.issues)
        ? (payload.issues as IssueLogEntry[]).map((issue) => ({
            ...issue,
            metadata: issue.metadata ?? {},
            isOpen: issue.isOpen !== false,
          }))
        : [];
      if (signal?.aborted) {
        return;
      }

      const offlineIssues = readOfflineIssues().filter((issue) =>
        pagePath ? issue.pagePath === pagePath : true
      );
      const combinedIssues =
        offlineIssues.length > 0 ? [...offlineIssues, ...issues] : issues;

      setIssueLogs(combinedIssues);
      if (!pagePath) {
        setBaselineIssueLogs(combinedIssues);
        setIssuesHydrated(true);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      const offlineFallback = readOfflineIssues().filter((issue) =>
        pagePath ? issue.pagePath === pagePath : true
      );
      const sampleFallback = pagePath
        ? LOCAL_SAMPLE_ISSUES.filter((issue) => issue.pagePath === pagePath)
        : LOCAL_SAMPLE_ISSUES;
      const fallbackIssues =
        offlineFallback.length > 0 ? offlineFallback : sampleFallback;

      setIssueLogs(fallbackIssues);
      if (!pagePath) {
        setBaselineIssueLogs(offlineFallback.length > 0 ? offlineFallback : LOCAL_SAMPLE_ISSUES);
        setIssuesHydrated(true);
      }

      setIssuesError(error instanceof Error ? error.message : 'Failed to load live issue log.');
    } finally {
      if (signal?.aborted) {
        return;
      }
      setIssuesLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchIssueLogs(activeIssueFilter ? activeIssueFilter : undefined, controller.signal);
    return () => controller.abort();
  }, [activeIssueFilter, fetchIssueLogs]);

  const handleIssueFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveIssueFilter(issueFilterInput.trim());
  };

  const handleIssueFilterReset = () => {
    setIssueFilterInput('');
    setActiveIssueFilter('');
  };

  const handleIssueRefresh = () => {
    fetchIssueLogs(activeIssueFilter ? activeIssueFilter : undefined);
  };

  const toggleIssueStatus = (issueId: number) => {
    setIssueLogs(prevLogs => {
      const updatedLogs = prevLogs.map(issue =>
        issue.issueId === issueId
          ? { ...issue, isOpen: issue.isOpen === false ? true : false }
          : issue
      );

      // Sort: open issues first, closed issues last
      return updatedLogs.sort((a, b) => {
        const aOpen = a.isOpen !== false;
        const bOpen = b.isOpen !== false;
        if (aOpen === bOpen) return 0;
        return aOpen ? -1 : 1;
      });
    });
  };

  const issuesForSummary = activeIssueFilter ? baselineIssueLogs : issueLogs;
  const hasActiveIssueFilter = Boolean(activeIssueFilter);
  const issueBreakdown = useMemo(() => {
    const base: Record<IssueType, number> = { bug: 0, feature: 0, feedback: 0, question: 0, other: 0 };
    issuesForSummary.forEach((issue) => {
      base[issue.issueType] = base[issue.issueType] + 1;
    });
    return base;
  }, [issuesForSummary]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <div>Loading development status...</div>
        </div>
      </div>
    );
  }

  if (!statusData) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center text-white">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <div className="text-lg">Failed to load status data</div>
        </div>
      </div>
    );
  }

  const fallbackIssuesTotal = statusData.issues.critical + statusData.issues.major + statusData.issues.minor;
  const overallCompletion = Math.round(
    statusData.pages.reduce((sum, page) => sum + page.completion, 0) / statusData.pages.length
  );

  const totalIssues = issuesHydrated ? issuesForSummary.length : fallbackIssuesTotal;
  const totalTechnicalDebt = statusData.technicalDebt.database + statusData.technicalDebt.codeQuality + statusData.technicalDebt.infrastructure;
  const issueSummaryText = (() => {
    if (issuesLoading && !issuesHydrated) {
      return 'Loading live issue log...';
    }
    if (issuesError && !issuesHydrated) {
      return 'Issue log unavailable.';
    }
    if (issuesLoading && issuesHydrated) {
      return 'Refreshing issue log...';
    }
    if (issuesHydrated) {
      const parts = [
        `Bug: ${issueBreakdown.bug}`,
        `Feature: ${issueBreakdown.feature}`,
        `Feedback: ${issueBreakdown.feedback}`,
      ];

      if (issueBreakdown.question > 0 || issueBreakdown.other > 0) {
        parts.push(`Other: ${issueBreakdown.question + issueBreakdown.other}`);
      }
      return parts.join(' • ');
    }
    return `${statusData.issues.critical} Critical • ${statusData.issues.major} Major • ${statusData.issues.minor} Minor`;
  })();

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">📊 Development Status Dashboard</h1>
              <p className="text-gray-400">Track progress, issues, and technical debt across the application</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Last Updated</div>
              <div className="text-white font-semibold">{statusData.lastUpdated}</div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{overallCompletion}%</div>
                <div className="text-gray-400 text-sm">Overall Progress</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div className="mt-4 w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getCompletionColor(overallCompletion)}`}
                style={{ width: `${overallCompletion}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{totalIssues}</div>
                <div className="text-gray-400 text-sm">Open Issues</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                <Bug className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {issueSummaryText}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{totalTechnicalDebt}</div>
                <div className="text-gray-400 text-sm">Technical Debt Items</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                <Wrench className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              DB: {statusData.technicalDebt.database} • Code: {statusData.technicalDebt.codeQuality} • Infra: {statusData.technicalDebt.infrastructure}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{statusData.pages.length}</div>
                <div className="text-gray-400 text-sm">Pages Tracked</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                <Palette className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {statusData.pages.filter(p => p.completion >= 90).length} Complete • {statusData.pages.filter(p => p.completion < 50).length} Needs Work
            </div>
          </div>
        </div>

        {/* Issue Log */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 mb-8">
          <div className="p-6 border-b border-gray-700">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Live Issue Log</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Pulls directly from <code className="bg-gray-900 px-2 py-1 rounded text-xs">/api/dev-status/issues</code>.
                </p>
              </div>
              <form onSubmit={handleIssueFilterSubmit} className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                <input
                  type="text"
                  value={issueFilterInput}
                  onChange={(event) => setIssueFilterInput(event.target.value)}
                  placeholder="Filter by page path (e.g. /planning/overview)"
                  className="flex-1 rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
                    disabled={issuesLoading && !!activeIssueFilter && issueFilterInput.trim() === activeIssueFilter}
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={handleIssueFilterReset}
                    className="rounded-md border border-gray-600 px-4 py-2 text-sm font-medium text-gray-100 transition hover:bg-gray-700 disabled:opacity-50"
                    disabled={!issueFilterInput && !activeIssueFilter}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleIssueRefresh}
                    className="inline-flex items-center justify-center rounded-md border border-gray-600 px-3 py-2 text-sm font-medium text-gray-100 transition hover:bg-gray-700"
                    aria-label="Refresh issue log"
                  >
                    <RefreshCw className={`w-4 h-4 ${issuesLoading ? 'animate-spin text-indigo-300' : 'text-gray-300'}`} />
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="p-6">
            {issuesLoading && !issuesHydrated ? (
              <div className="py-10 text-center text-gray-400">
                <RefreshCw className="w-5 h-5 mx-auto mb-3 animate-spin text-indigo-300" />
                <div>Loading issue log...</div>
              </div>
            ) : issuesError && !issuesHydrated ? (
              <div className="py-10 text-center text-red-400">
                <AlertTriangle className="w-6 h-6 mx-auto mb-3 text-red-500" />
                <div>{issuesError}</div>
              </div>
            ) : (
              <>
                {issuesError && issuesHydrated && (
                  <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {issuesError} Showing last known data.
                  </div>
                )}
                {issueLogs.length === 0 ? (
                  <div className="py-10 text-center text-gray-400">
                    {hasActiveIssueFilter
                      ? 'No issues match this page path yet.'
                      : issuesHydrated
                        ? 'No issues have been reported yet.'
                        : 'Issue log will appear here once loaded.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-900 text-xs uppercase tracking-wide text-gray-400">
                        <tr>
                          <th className="px-4 py-3 w-20">Status</th>
                          <th className="px-4 py-3">Details</th>
                          <th className="px-4 py-3">Page</th>
                          <th className="px-4 py-3">Component</th>
                          <th className="px-4 py-3">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {issueLogs.map((issue) => {
                          const isOpen = issue.isOpen !== false;
                          return (
                            <tr key={issue.issueId} className="hover:bg-gray-900/60">
                              <td className="px-4 py-3 align-top">
                                <button
                                  onClick={() => toggleIssueStatus(issue.issueId)}
                                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                                    isOpen
                                      ? 'bg-red-600 hover:bg-red-700 text-white'
                                      : 'bg-green-600 hover:bg-green-700 text-white'
                                  }`}
                                >
                                  {isOpen ? 'Open' : 'Closed'}
                                </button>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="flex items-start gap-2 mb-2">
                                  <span className="text-xs text-gray-500">#{issue.issueId}</span>
                                </div>
                                {issue.title?.trim() && (
                                  <div className="text-white font-medium mb-1">
                                    {issue.title}
                                  </div>
                                )}
                                <p className="text-xs text-gray-400">
                                  {issue.description.length > 160 ? `${issue.description.slice(0, 160)}…` : issue.description}
                                </p>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="text-sm text-gray-100">{issue.pagePath ?? '—'}</div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="text-sm text-gray-100">{issue.componentPath ?? '—'}</div>
                              </td>
                              <td className="px-4 py-3 align-top text-sm text-gray-300">
                                {new Date(issue.createdAt).toLocaleString(undefined, {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Page Status Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Page Development Status</h2>
            <p className="text-gray-400 text-sm mt-1">Track design, functionality, mobile, and accessibility progress</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Page</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Design</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Functionality</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {statusData.pages.map((page, index) => (
                  <React.Fragment key={index}>
                    <tr className="hover:bg-gray-750">
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{page.name}</div>
                      </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getCompletionColor(page.completion)}`}
                            style={{ width: `${page.completion}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-300 w-12">{page.completion}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(page.design)}
                        <span className="text-sm text-gray-300">{getStatusText(page.design)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(page.functionality)}
                        <span className="text-sm text-gray-300">{getStatusText(page.functionality)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(page.priority)}`}>
                        {page.priority.charAt(0).toUpperCase() + page.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditClick(index)}
                          className={`p-1.5 rounded-md transition-colors ${
                            editingRow === index 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                          title="Edit page details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleNotesClick(index)}
                          className={`p-1.5 rounded-md transition-colors ${
                            expandedNotes === index 
                              ? 'bg-yellow-600 text-white' 
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                          title="View context and notes"
                        >
                          <FileQuestion className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleChatClick(page.name)}
                          className="p-1.5 rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                          title="Chat about this page"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Notes Accordion Row */}
                  {expandedNotes === index && (
                    <tr className="bg-gray-850">
                      <td colSpan={6} className="px-6 py-4 border-t border-gray-700">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-white mb-2 flex items-center">
                              <FileQuestion className="w-4 h-4 mr-2" />
                              Current Context
                            </h4>
                            <p className="text-gray-300 text-sm leading-relaxed">
                              {getPageNotes(page.name).context}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-white mb-2 flex items-center">
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              Outstanding Items
                            </h4>
                            <ul className="space-y-1">
                              {getPageNotes(page.name).outstanding.map((item, idx) => (
                                <li key={idx} className="text-gray-300 text-sm flex items-start">
                                  <span className="text-red-400 mr-2">•</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  
                  {/* Edit Form Row */}
                  {editingRow === index && (
                    <tr className="bg-gray-850">
                      <td colSpan={6} className="px-6 py-4 border-t border-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Design</label>
                            <select
                              value={editFormData?.design || 'not-started'}
                              onChange={(e) => handleFormFieldChange('design', e.target.value)}
                              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
                            >
                              <option value="complete">✅ Complete</option>
                              <option value="in-progress">🟡 In Progress</option>
                              <option value="not-started">❌ Not Started</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Functionality</label>
                            <select
                              value={editFormData?.functionality || 'not-started'}
                              onChange={(e) => handleFormFieldChange('functionality', e.target.value)}
                              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
                            >
                              <option value="complete">✅ Complete</option>
                              <option value="in-progress">🟡 In Progress</option>
                              <option value="not-started">❌ Not Started</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
                            <select
                              value={editFormData?.priority || 'medium'}
                              onChange={(e) => handleFormFieldChange('priority', e.target.value)}
                              className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm"
                            >
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end space-x-2">
                          <button 
                            onClick={() => setEditingRow(null)}
                            className="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-500 transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleSaveChanges}
                            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-500 transition-colors"
                          >
                            Save Changes
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Little Bugs Section */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Bug className="w-5 h-5 mr-2 text-red-400" />
            🐛 Little Bugs
          </h3>
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
              <h4 className="text-md font-medium text-white mb-3 flex items-center">
                <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm mr-2">1</span>
                Inflation Cards
              </h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs mt-0.5">1</span>
                  <div className="flex-1">
                    <div className="text-gray-300 text-sm">
                      <strong>Custom tabs initialization:</strong> Rather than starting with 3 "custom" tabs, when user clicks custom chip, the table should only contain a blank Custom 1 input table and tab. Once the Custom 1 inflation set is saved, an "Add" chip should appear which if clicked, creates the second custom inflation rate set.
                    </div>
                    <div className="mt-2">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full border bg-yellow-100 text-yellow-800 border-yellow-200">
                        UX Improvement
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs mt-0.5">2</span>
                  <div className="flex-1">
                    <div className="text-gray-300 text-sm">
                      <strong>Name field persistence:</strong> After save, custom inflation set "Name" field doesn't repopulate with saved name (tab names are OK).
                    </div>
                    <div className="mt-2">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full border bg-red-100 text-red-800 border-red-200">
                        Data Persistence Bug
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
              <h4 className="text-md font-medium text-white mb-3 flex items-center">
                <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm mr-2">2</span>
                Market Factors Percentage-Based Costs
              </h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs mt-0.5">1</span>
                  <div className="flex-1">
                    <div className="text-gray-300 text-sm">
                      <strong>Percentage calculation mechanism:</strong> Need to design a mechanism for dealing with costs that are a % of something (e.g., commissions as % of sales price, management fees as % of revenue).
                    </div>
                    <div className="mt-2">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full border bg-blue-100 text-blue-800 border-blue-200">
                        Design Task
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
              <h4 className="text-md font-medium text-white mb-3 flex items-center">
                <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm mr-2">3</span>
                Market Factors & Inflation Input Formatting
              </h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs mt-0.5">1</span>
                  <div className="flex-1">
                    <div className="text-gray-300 text-sm">
                      <strong>Layout and formatting refinements:</strong> Refine the formatting, spacing, and visual presentation of the market factors and growth rate inflation input pages for better usability and professional appearance.
                    </div>
                    <div className="mt-2">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full border bg-purple-100 text-purple-800 border-purple-200">
                        Design Polish
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">📋 Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.location.href = '/documentation'}
              className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-left transition-colors"
            >
              <FileText className="w-5 h-5 mb-2" />
              <div className="font-medium">Full Documentation Center</div>
              <div className="text-sm text-blue-100">View all status reports and technical docs</div>
            </button>
            
            <button 
              onClick={() => {
                // This would trigger the status update script
                console.log('Update status triggered');
              }}
              className="p-4 bg-green-600 hover:bg-green-700 rounded-lg text-white text-left transition-colors"
            >
              <RefreshCw className="w-5 h-5 mb-2" />
              <div className="font-medium">Update Status</div>
              <div className="text-sm text-green-100">Mark items complete or add new issues</div>
            </button>
            
            <button 
              onClick={() => {
                // This would open a new issue form
                console.log('Add issue triggered');
              }}
              className="p-4 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white text-left transition-colors"
            >
              <AlertTriangle className="w-5 h-5 mb-2" />
              <div className="font-medium">Report Issue</div>
              <div className="text-sm text-yellow-100">Add new bug or outstanding item</div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>This dashboard reflects the current development status as tracked in Documentation/App-Development-Status.md</p>
          <p className="mt-1">Use the CLI tool: <code className="bg-gray-800 px-2 py-1 rounded">node Documentation/update-status.js</code></p>
        </div>
      </div>
    </div>
  );
};

export default DevStatus;
