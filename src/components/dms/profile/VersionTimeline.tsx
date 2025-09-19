'use client';

import React from 'react';
import { ClockIcon, UserIcon, DocumentIcon, PencilSquareIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import type { CoreDoc, DMSProfileAudit } from '@/lib/dms/db';

interface VersionTimelineProps {
  doc: CoreDoc;
  versions?: CoreDoc[];
  auditTrail?: DMSProfileAudit[];
  onViewVersion?: (version: CoreDoc) => void;
  onRestoreVersion?: (version: CoreDoc) => void;
}

interface TimelineEvent {
  id: string;
  type: 'upload' | 'profile_update' | 'version_change' | 'status_change';
  timestamp: string;
  title: string;
  description: string;
  version?: number;
  changes?: string[];
  userId?: number;
  doc?: CoreDoc;
  audit?: DMSProfileAudit;
}

export default function VersionTimeline({
  doc,
  versions = [],
  auditTrail = [],
  onViewVersion,
  onRestoreVersion
}: VersionTimelineProps) {
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const generateTimeline = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Add document versions
    versions.forEach(version => {
      if (version.version_no === 1) {
        events.push({
          id: `upload-${version.doc_id}`,
          type: 'upload',
          timestamp: version.created_at,
          title: `Document Uploaded`,
          description: `Initial upload of ${version.doc_name}`,
          version: version.version_no,
          doc: version
        });
      } else {
        events.push({
          id: `version-${version.doc_id}`,
          type: 'version_change',
          timestamp: version.created_at,
          title: `Version ${version.version_no}`,
          description: `New version uploaded`,
          version: version.version_no,
          doc: version
        });
      }
    });

    // Add profile updates from audit trail
    auditTrail.forEach(audit => {
      events.push({
        id: `audit-${audit.audit_id}`,
        type: 'profile_update',
        timestamp: audit.created_at,
        title: 'Profile Updated',
        description: `Modified ${audit.changed_fields.length} field${audit.changed_fields.length !== 1 ? 's' : ''}`,
        changes: audit.changed_fields,
        userId: audit.changed_by || undefined,
        audit
      });
    });

    // Sort by timestamp (newest first)
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const timeline = generateTimeline();

  const getEventIcon = (event: TimelineEvent) => {
    switch (event.type) {
      case 'upload':
        return <ArrowUpTrayIcon className="w-5 h-5" />;
      case 'version_change':
        return <DocumentIcon className="w-5 h-5" />;
      case 'profile_update':
        return <PencilSquareIcon className="w-5 h-5" />;
      default:
        return <ClockIcon className="w-5 h-5" />;
    }
  };

  const getEventColor = (event: TimelineEvent) => {
    switch (event.type) {
      case 'upload':
        return 'bg-green-500 text-white';
      case 'version_change':
        return 'bg-blue-500 text-white';
      case 'profile_update':
        return 'bg-orange-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  if (timeline.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <ClockIcon className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <p>No version history available</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Version History
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Document versions and profile changes for {doc.doc_name}
        </p>
      </div>

      {/* Timeline */}
      <div className="p-4">
        <div className="flow-root">
          <ul className="-mb-8">
            {timeline.map((event, eventIdx) => {
              const { date, time } = formatDate(event.timestamp);
              
              return (
                <li key={event.id}>
                  <div className="relative pb-8">
                    {eventIdx !== timeline.length - 1 ? (
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-600"
                        aria-hidden="true"
                      />
                    ) : null}
                    
                    <div className="relative flex space-x-3">
                      {/* Icon */}
                      <div>
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-800 ${getEventColor(event)}`}>
                          {getEventIcon(event)}
                        </span>
                      </div>
                      
                      {/* Content */}
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {event.title}
                            </p>
                            {event.version && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                v{event.version}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {event.description}
                          </p>
                          
                          {/* Show changed fields for profile updates */}
                          {event.type === 'profile_update' && event.changes && event.changes.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Changed fields:</p>
                              <div className="flex flex-wrap gap-1">
                                {event.changes.map((field, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                                  >
                                    {field.replace(/_/g, ' ')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Actions for document versions */}
                          {event.doc && event.type !== 'upload' && (
                            <div className="mt-3 flex space-x-2">
                              {onViewVersion && (
                                <button
                                  onClick={() => onViewVersion(event.doc!)}
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                                >
                                  View Version
                                </button>
                              )}
                              {onRestoreVersion && event.doc.doc_id !== doc.doc_id && (
                                <button
                                  onClick={() => onRestoreVersion(event.doc!)}
                                  className="text-xs text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
                                >
                                  Restore
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Timestamp */}
                        <div className="text-right text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                          <time dateTime={event.timestamp}>
                            <div>{date}</div>
                            <div className="text-xs">{time}</div>
                          </time>
                          {event.userId && (
                            <div className="flex items-center justify-end mt-1 text-xs">
                              <UserIcon className="w-3 h-3 mr-1" />
                              User {event.userId}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      
      {/* Current version info */}
      <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-blue-800 dark:text-blue-200">
            <DocumentIcon className="w-4 h-4" />
            <span>Current Version: {doc.version_no}</span>
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400">
            Status: <span className="font-medium capitalize">{doc.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}