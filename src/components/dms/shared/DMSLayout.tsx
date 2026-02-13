'use client';

import React from 'react';

interface DMSLayoutProps {
 sidebar?: React.ReactNode;
 main?: React.ReactNode;
 preview?: React.ReactNode;
 className?: string;
 sidebarClassName?: string;
}

export default function DMSLayout({
 sidebar,
 main,
 preview,
 className = '',
 sidebarClassName = ''
}: DMSLayoutProps) {
 return (
 <div className={`h-full flex flex-col ${className}`}>
 <div className="flex-1 min-h-0 flex overflow-hidden">
 {sidebar && (
 <aside
 className={`w-[250px] border-r border bg-body overflow-y-auto ${sidebarClassName}`}
 >
 {sidebar}
 </aside>
 )}
 <main className="flex-1 min-w-0 overflow-hidden bg-body">
 {main}
 </main>
 {preview && (
 <aside className="w-full max-w-[350px] h-full border-l border bg-body overflow-hidden">
 {preview}
 </aside>
 )}
 </div>
 </div>
 );
}
