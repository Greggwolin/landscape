'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, ExternalLink, Download } from 'lucide-react';

interface MarkdownViewerProps {
  filePath: string;
  title: string;
  onClose: () => void;
}

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ filePath, title, onClose }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarkdown = async () => {
      setLoading(true);
      setError(null);

      try {
        // Use API route to read markdown files from file system
        const response = await fetch(`/api/markdown?path=${encodeURIComponent(filePath)}`);

        if (!response.ok) {
          throw new Error(`Failed to load document: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to load document');
        }

        setContent(data.content);
      } catch (err) {
        console.error('Error loading markdown:', err);
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    fetchMarkdown();
  }, [filePath]);

  // Simple markdown to HTML converter (basic formatting)
  const handleDownload = () => {
    // Create a blob from the content
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    // Extract filename from path
    const fileName = filePath.split('/').pop() || 'document.md';

    // Create download link and trigger
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderMarkdown = (markdown: string) => {
    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold text-white mt-6 mb-3">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-white mt-8 mb-4">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-white mt-10 mb-6">$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em class="text-blue-300">$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white font-semibold">$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em class="text-gray-300 italic">$1</em>');

    // Code blocks
    html = html.replace(/```([a-z]*)\n([\s\S]*?)```/gim, '<pre class="bg-gray-900 border border-gray-700 rounded-lg p-4 my-4 overflow-x-auto"><code class="text-sm text-green-400">$2</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/gim, '<code class="bg-gray-800 text-blue-400 px-1.5 py-0.5 rounded text-sm">$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/gim, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank">$1</a>');

    // Unordered lists
    html = html.replace(/^\- (.*$)/gim, '<li class="text-gray-300 ml-6 list-disc">$1</li>');
    html = html.replace(/(<li.*<\/li>)/gim, '<ul class="my-2">$1</ul>');

    // Ordered lists
    html = html.replace(/^\d+\. (.*$)/gim, '<li class="text-gray-300 ml-6 list-decimal">$1</li>');

    // Blockquotes
    html = html.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-blue-500 pl-4 italic text-gray-400 my-4">$1</blockquote>');

    // Horizontal rules
    html = html.replace(/^---$/gim, '<hr class="border-gray-700 my-8" />');

    // Line breaks
    html = html.replace(/\n\n/gim, '</p><p class="text-gray-300 leading-relaxed my-4">');
    html = '<p class="text-gray-300 leading-relaxed my-4">' + html + '</p>';

    return html;
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Close"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <h2 className="text-xl font-bold text-white">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Download document"
              disabled={loading || !!error}
            >
              <Download className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={() => window.open(filePath, '_blank')}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-400">Loading document...</div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <div className="text-red-400 font-semibold mb-2">Error loading document</div>
              <div className="text-red-300 text-sm">{error}</div>
            </div>
          )}

          {!loading && !error && (
            <div
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {filePath}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkdownViewer;
