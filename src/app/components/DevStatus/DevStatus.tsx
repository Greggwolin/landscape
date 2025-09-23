'use client';

import React, { useState, useEffect } from 'react';
import { Check, AlertTriangle, Clock, Wrench, Bug, Palette, FileText, RefreshCw, Edit3, FileQuestion, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface StatusData {
  pages: {
    name: string;
    design: 'complete' | 'in-progress' | 'not-started';
    functionality: 'complete' | 'in-progress' | 'not-started';
    mobile: 'complete' | 'in-progress' | 'not-started';
    accessibility: 'complete' | 'in-progress' | 'not-started';
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

const DevStatus: React.FC = () => {
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);

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
            mobile: 'not-started',
            accessibility: 'not-started',
            priority: 'high',
            completion: 85
          },
          {
            name: 'Land Use Management',
            design: 'complete',
            functionality: 'complete',
            mobile: 'not-started',
            accessibility: 'not-started',
            priority: 'high',
            completion: 100
          },
          {
            name: 'Planning Overview',
            design: 'complete',
            functionality: 'complete',
            mobile: 'not-started',
            accessibility: 'not-started',
            priority: 'high',
            completion: 95
          },
          {
            name: 'Parcel Detail',
            design: 'complete',
            functionality: 'complete',
            mobile: 'not-started',
            accessibility: 'not-started',
            priority: 'high',
            completion: 75
          },
          {
            name: 'Financial Modeling',
            design: 'not-started',
            functionality: 'not-started',
            mobile: 'not-started',
            accessibility: 'not-started',
            priority: 'low',
            completion: 0
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
      'Financial Modeling': {
        context: 'Not yet implemented. Planned for future releases with advanced modeling capabilities.',
        outstanding: [
          'Complete feature design and implementation needed',
          'Integration with planning data',
          'Financial calculation engine',
          'Reporting and analytics features',
          'Multi-scenario modeling capabilities'
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

  const calculateCompletion = (design: string, functionality: string, mobile: string, accessibility: string) => {
    const statusWeights = {
      'complete': 25,
      'in-progress': 12.5,
      'not-started': 0
    };
    
    const designScore = statusWeights[design as keyof typeof statusWeights] || 0;
    const functionalityScore = statusWeights[functionality as keyof typeof statusWeights] || 0;
    const mobileScore = statusWeights[mobile as keyof typeof statusWeights] || 0;
    const accessibilityScore = statusWeights[accessibility as keyof typeof statusWeights] || 0;
    
    return designScore + functionalityScore + mobileScore + accessibilityScore;
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
        editFormData.functionality, 
        editFormData.mobile, 
        editFormData.accessibility
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

  const overallCompletion = Math.round(
    statusData.pages.reduce((sum, page) => sum + page.completion, 0) / statusData.pages.length
  );

  const totalIssues = statusData.issues.critical + statusData.issues.major + statusData.issues.minor;
  const totalTechnicalDebt = statusData.technicalDebt.database + statusData.technicalDebt.codeQuality + statusData.technicalDebt.infrastructure;

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
              {statusData.issues.critical} Critical • {statusData.issues.major} Major • {statusData.issues.minor} Minor
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Mobile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Accessibility</th>
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
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(page.mobile)}
                        <span className="text-sm text-gray-300">{getStatusText(page.mobile)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(page.accessibility)}
                        <span className="text-sm text-gray-300">{getStatusText(page.accessibility)}</span>
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
                      <td colSpan={8} className="px-6 py-4 border-t border-gray-700">
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
                      <td colSpan={8} className="px-6 py-4 border-t border-gray-700">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                            <label className="block text-sm font-medium text-gray-300 mb-1">Mobile</label>
                            <select 
                              value={editFormData?.mobile || 'not-started'}
                              onChange={(e) => handleFormFieldChange('mobile', e.target.value)}
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

        {/* Quick Actions */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">📋 Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => window.open('/Documentation/App-Development-Status.md', '_blank')}
              className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-left transition-colors"
            >
              <FileText className="w-5 h-5 mb-2" />
              <div className="font-medium">View Full Documentation</div>
              <div className="text-sm text-blue-100">Open complete status markdown file</div>
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