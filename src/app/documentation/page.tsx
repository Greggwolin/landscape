'use client';

import React, { useState } from 'react';
import { FileText, Book, Code, Database, Map, DollarSign, Folder, ExternalLink, Search } from 'lucide-react';
import MarkdownViewer from '../components/Documentation/MarkdownViewer';
import Header from '../components/Header';
import { ProjectProvider } from '../components/ProjectProvider';

interface DocItem {
  title: string;
  path: string;
  category: 'Status' | 'Architecture' | 'Migration' | 'Component' | 'Technical' | 'AI';
  description: string;
  icon: React.ReactNode;
  lastModified: string;
}

const DocumentationIndex: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<{ path: string; title: string } | null>(null);

  const documents: DocItem[] = [
    // Status Reports
    {
      title: 'Implementation Status',
      path: '/docs/11-implementation-status/IMPLEMENTATION_STATUS.md',
      category: 'Status',
      description: 'Current implementation status and progress tracking',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-10-17'
    },
    {
      title: 'CRE Implementation Summary',
      path: '/docs/CRE_IMPLEMENTATION_SUMMARY.md',
      category: 'Status',
      description: 'Commercial real estate calculation engine implementation summary',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-10-17'
    },
    {
      title: 'Assumptions UI Final Status',
      path: '/docs/ASSUMPTIONS_UI_FINAL_STATUS.md',
      category: 'Status',
      description: 'Final status of assumptions UI implementation',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-10-17'
    },
    {
      title: 'Scottsdale Promenade Data Summary',
      path: '/docs/SCOTTSDALE_DATA_SUMMARY.md',
      category: 'Status',
      description: 'Commercial property data loaded with rent roll, lease structures, and CRE calculation testing',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2025-10-17'
    },
    {
      title: 'App Development Status (Archive)',
      path: '/docs/archive/App-Development-Status.md',
      category: 'Status',
      description: 'Complete reference document with database tables, API routes, and architecture (archived)',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-10-03'
    },

    // Architecture & System Design
    {
      title: 'System Architecture',
      path: '/docs/09-technical-dd/02-architecture/system-architecture.md',
      category: 'Architecture',
      description: 'Complete system architecture documentation',
      icon: <Book className="w-5 h-5" />,
      lastModified: '2025-10-16'
    },
    {
      title: 'Land Use System',
      path: '/docs/02-features/land-use/land-use-system.md',
      category: 'Architecture',
      description: 'Complete land use taxonomy system (Family → Density → Type → Product)',
      icon: <Book className="w-5 h-5" />,
      lastModified: '2025-10-16'
    },
    {
      title: 'Database Schema',
      path: '/docs/05-database/schema-overview.md',
      category: 'Architecture',
      description: 'Complete database schema documentation',
      icon: <Database className="w-5 h-5" />,
      lastModified: '2025-10-16'
    },

    // Migration & Consolidation
    {
      title: 'Budget Consolidation Migration',
      path: '/docs/08-migration-history/Budget-Consolidation-Migration-Complete.md',
      category: 'Migration',
      description: 'Complete migration of budget system consolidation',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2025-10-02'
    },
    {
      title: 'Schema Naming Convention Analysis',
      path: '/docs/08-migration-history/Schema-Naming-Convention-Analysis.md',
      category: 'Migration',
      description: 'Analysis of database naming conventions',
      icon: <Database className="w-5 h-5" />,
      lastModified: '2025-10-02'
    },
    {
      title: 'Schema Coverage Analysis',
      path: '/docs/08-migration-history/Schema-Coverage-Analysis.md',
      category: 'Migration',
      description: 'Complete schema coverage and gap analysis',
      icon: <Database className="w-5 h-5" />,
      lastModified: '2025-10-02'
    },
    {
      title: 'Budget-Finance Schema Overlap',
      path: '/docs/08-migration-history/Budget-Finance-Schema-Overlap-Analysis.md',
      category: 'Migration',
      description: 'Analysis of budget and finance schema overlaps',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2025-10-02'
    },

    // Component Documentation
    {
      title: 'Property Analysis UI Implementation',
      path: '/docs/PROPERTY_ANALYSIS_UI_IMPLEMENTATION.md',
      category: 'Component',
      description: 'Property analysis and CRE calculation UI implementation',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-10-16'
    },
    {
      title: 'Assumptions UI Implementation',
      path: '/docs/ASSUMPTIONS_UI_IMPLEMENTATION_SUMMARY.md',
      category: 'Component',
      description: 'Progressive disclosure assumptions UI implementation summary',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-10-17'
    },
    {
      title: 'Planning Wizard',
      path: '/src/app/components/PlanningWizard/README.md',
      category: 'Component',
      description: 'Visual drag-and-drop land development planning interface',
      icon: <Map className="w-5 h-5" />,
      lastModified: '2025-10-02'
    },
    {
      title: 'Parcel Cleanup Documentation',
      path: '/docs/archive/parcel-cleanup-documentation.md',
      category: 'Component',
      description: 'Parcel data cleanup and migration procedures',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-09-23'
    },
    {
      title: 'Component Migration Plan',
      path: '/docs/archive/COMPONENT_MIGRATION_PLAN.md',
      category: 'Component',
      description: 'Strategy for component architecture migration',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-09-22'
    },
    {
      title: 'Cleanup Completed',
      path: '/docs/archive/CLEANUP_COMPLETED.md',
      category: 'Component',
      description: 'Record of completed cleanup tasks',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-09-22'
    },

    // Technical Implementation
    {
      title: 'CRE Calculation Engine',
      path: '/docs/CRE_CALCULATION_ENGINE_DOCUMENTATION.md',
      category: 'Technical',
      description: 'Commercial real estate calculation engine technical documentation',
      icon: <Code className="w-5 h-5" />,
      lastModified: '2025-10-16'
    },
    {
      title: 'Developer Guide',
      path: '/docs/00-getting-started/DEVELOPER_GUIDE.md',
      category: 'Technical',
      description: 'Complete developer onboarding and setup guide',
      icon: <Book className="w-5 h-5" />,
      lastModified: '2025-10-16'
    },
    {
      title: 'Financial Engine Quick Start',
      path: '/docs/00-getting-started/QUICK_START_FINANCIAL_ENGINE.md',
      category: 'Technical',
      description: 'Quick start guide for the financial calculation engine',
      icon: <DollarSign className="w-5 h-5" />,
      lastModified: '2025-10-16'
    },

    // AI & Machine Learning
    {
      title: 'Landscape AI Ingestion Brief',
      path: '/docs/14-specifications/LANDSCAPE_AI_INGESTION_BRIEF.md',
      category: 'AI',
      description: 'AI-powered document understanding model for extracting structured data from real estate offering memoranda, rent rolls, and appraisals',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-10-17'
    },
    {
      title: 'Assumptions UI Test Checklist',
      path: '/docs/ASSUMPTIONS_UI_TEST_CHECKLIST.md',
      category: 'AI',
      description: 'Comprehensive testing checklist for assumptions UI',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-10-17'
    },
    {
      title: 'Validation Summary',
      path: '/docs/07-testing/VALIDATION_SUMMARY.md',
      category: 'AI',
      description: 'Testing and validation summary',
      icon: <FileText className="w-5 h-5" />,
      lastModified: '2025-10-16'
    }
  ];

  // Sort documents by lastModified in descending order (newest first)
  const sortedDocuments = [...documents].sort((a, b) =>
    new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  );

  const categories = [
    { id: 'all', label: 'All Documents', count: sortedDocuments.length },
    { id: 'Status', label: 'Status Reports', count: sortedDocuments.filter(d => d.category === 'Status').length },
    { id: 'Architecture', label: 'Architecture', count: sortedDocuments.filter(d => d.category === 'Architecture').length },
    { id: 'Migration', label: 'Migration', count: sortedDocuments.filter(d => d.category === 'Migration').length },
    { id: 'Component', label: 'Components', count: sortedDocuments.filter(d => d.category === 'Component').length },
    { id: 'Technical', label: 'Technical', count: sortedDocuments.filter(d => d.category === 'Technical').length },
    { id: 'AI', label: 'AI & Processing', count: sortedDocuments.filter(d => d.category === 'AI').length }
  ];

  const filteredDocs = sortedDocuments.filter(doc => {
    const matchesSearch = searchQuery === '' ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    const colors = {
      'Status': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Architecture': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Migration': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'Component': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Technical': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'AI': 'bg-pink-500/20 text-pink-400 border-pink-500/30'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const handleDocClick = (path: string, title: string) => {
    setSelectedDoc({ path, title });
  };

  return (
    <ProjectProvider>
      <Header />
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Book className="w-8 h-8" />
            📚 Documentation Center
          </h1>
          <p className="text-gray-400">
            Comprehensive documentation, status reports, and technical specifications
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                }`}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>
        </div>

        {/* Document Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc, index) => (
            <button
              key={index}
              onClick={() => handleDocClick(doc.path, doc.title)}
              className="group bg-gray-800 border border-gray-700 rounded-lg p-5 text-left hover:border-gray-600 hover:bg-gray-750 transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center text-blue-400 group-hover:bg-gray-600 transition-colors">
                  {doc.icon}
                </div>
                <ExternalLink className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Title */}
              <h3 className="text-white font-semibold mb-2 group-hover:text-blue-400 transition-colors">
                {doc.title}
              </h3>

              {/* Description */}
              <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                {doc.description}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getCategoryColor(doc.category)}`}>
                  {doc.category}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(doc.lastModified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* No Results */}
        {filteredDocs.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No documents found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        )}

        {/* Footer Stats */}
        <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
            {categories.slice(1).map(cat => (
              <div key={cat.id}>
                <div className="text-2xl font-bold text-white">{cat.count}</div>
                <div className="text-sm text-gray-400">{cat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Markdown Viewer Modal */}
        {selectedDoc && (
          <MarkdownViewer
            filePath={selectedDoc.path}
            title={selectedDoc.title}
            onClose={() => setSelectedDoc(null)}
          />
        )}
        </div>
      </div>
    </ProjectProvider>
  );
};

export default DocumentationIndex;
