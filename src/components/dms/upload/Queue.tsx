'use client';

import React from 'react';

interface QueueItem {
 id: string;
 filename: string;
 size: number;
 status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
 progress: number;
 error?: string;
 doc_id?: number;
}

interface QueueProps {
 items: QueueItem[];
 onRetry?: (id: string) => void;
 onRemove?: (id: string) => void;
}

export default function Queue({ items, onRetry, onRemove }: QueueProps) {
 const formatFileSize = (bytes: number) => {
 if (bytes === 0) return '0 Bytes';
 const k = 1024;
 const sizes = ['Bytes', 'KB', 'MB', 'GB'];
 const i = Math.floor(Math.log(bytes) / Math.log(k));
 return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
 };

 const getStatusIcon = (status: QueueItem['status']) => {
 switch (status) {
 case 'pending':
 return (
 <div className="w-5 h-5 rounded-full bg-body-tertiary flex items-center justify-center">
 <div className="w-3 h-3 rounded-full bg-body" />
 </div>
 );
 case 'uploading':
 case 'processing':
 return (
 <div className="w-5 h-5">
 <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
 </div>
 );
 case 'completed':
 return (
 <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
 <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
 </svg>
 </div>
 );
 case 'failed':
 return (
 <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
 <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </div>
 );
 }
 };

 const getStatusText = (status: QueueItem['status']) => {
 switch (status) {
 case 'pending': return 'Pending';
 case 'uploading': return 'Uploading';
 case 'processing': return 'Processing';
 case 'completed': return 'Completed';
 case 'failed': return 'Failed';
 }
 };

 const getStatusColor = (status: QueueItem['status']) => {
 switch (status) {
 case 'pending': return 'text-body-secondary ';
 case 'uploading': return 'text-blue-600 ';
 case 'processing': return 'text-yellow-600 ';
 case 'completed': return 'text-green-600 ';
 case 'failed': return 'text-red-600 ';
 }
 };

 if (items.length === 0) {
 return (
 <div className="text-center py-8 text-body-tertiary">
 No uploads in queue
 </div>
 );
 }

 return (
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <h3 className="text-lg font-semibold text-body">
 Upload Queue ({items.length})
 </h3>
 {items.some(item => item.status === 'failed') && (
 <button
 onClick={() => items.filter(item => item.status === 'failed').forEach(item => onRetry?.(item.id))}
 className="text-sm text-blue-600 hover:text-blue-700"
 >
 Retry All Failed
 </button>
 )}
 </div>

 <div className="space-y-2">
 {items.map((item) => (
 <div
 key={item.id}
 className="bg-body rounded-lg border border p-4"
 >
 <div className="flex items-start gap-3">
 {/* Status Icon */}
 <div className="flex-shrink-0 mt-0.5">
 {getStatusIcon(item.status)}
 </div>

 {/* File Info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between mb-1">
 <h4 className="text-sm font-medium text-body truncate">
 {item.filename}
 </h4>
 <div className="flex items-center gap-2 ml-4">
 <span className={`text-xs font-medium ${getStatusColor(item.status)}`}>
 {getStatusText(item.status)}
 </span>
 {item.doc_id && (
 <span className="text-xs text-body-tertiary">
 ID: {item.doc_id}
 </span>
 )}
 </div>
 </div>

 <div className="text-xs text-body-tertiary mb-2">
 {formatFileSize(item.size)}
 </div>

 {/* Progress Bar */}
 {(item.status === 'uploading' || item.status === 'processing') && (
 <div className="mb-2">
 <div className="flex justify-between text-xs text-body-tertiary mb-1">
 <span>
 {item.status === 'uploading' ? 'Uploading...' : 'Processing...'}
 </span>
 <span>{Math.round(item.progress)}%</span>
 </div>
 <div className="w-full bg-body-tertiary rounded-full h-1.5">
 <div
 className={`h-1.5 rounded-full transition-all duration-300 ${
 item.status === 'uploading' ? 'bg-blue-600' : 'bg-yellow-500'
 }`}
 style={{ width: `${item.progress}%` }}
 />
 </div>
 </div>
 )}

 {/* Error Message */}
 {item.status === 'failed' && item.error && (
 <div className="text-xs text-red-600 bg-red-50 rounded p-2 mb-2">
 {item.error}
 </div>
 )}

 {/* Action Buttons */}
 <div className="flex items-center gap-2">
 {item.status === 'failed' && (
 <button
 onClick={() => onRetry?.(item.id)}
 className="text-xs text-blue-600 hover:text-blue-700"
 >
 Retry
 </button>
 )}
 {item.status === 'completed' && item.doc_id && (
 <button
 onClick={() => {/* TODO: Open document details */}}
 className="text-xs text-green-600 hover:text-green-700"
 >
 View Document
 </button>
 )}
 {(item.status === 'pending' || item.status === 'failed' || item.status === 'completed') && (
 <button
 onClick={() => onRemove?.(item.id)}
 className="text-xs text-body-tertiary hover:text-red-600"
 >
 Remove
 </button>
 )}
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}