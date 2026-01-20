'use client';

import React, { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

type ProjectOption = {
  project_id: number;
  project_name: string;
};

interface ProjectSelectorProps {
  value: number | null;
  onChange: (projectId: number | null) => void;
  className?: string;
}

export default function ProjectSelector({
  value,
  onChange,
  className = ''
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error('Failed to load projects');
        const data = await response.json();
        setProjects(
          Array.isArray(data)
            ? data.map((project: any) => ({
                project_id: project.project_id,
                project_name: project.project_name
              }))
            : []
        );
      } catch (error) {
        console.error('ProjectSelector load error:', error);
        setProjects([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchProjects();
  }, []);

  const currentValue = value ? value.toString() : 'all';

  return (
    <div className={className}>
      <Select
        value={currentValue}
        onValueChange={(nextValue) =>
          onChange(nextValue === 'all' ? null : parseInt(nextValue, 10))
        }
      >
        <SelectTrigger className="bg-white dark:bg-gray-900">
          <SelectValue placeholder="All Projects" />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-gray-900">
          <SelectItem value="all">All Projects</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.project_id} value={project.project_id.toString()}>
              {project.project_name}
            </SelectItem>
          ))}
          {projects.length === 0 && !isLoading && (
            <SelectItem value="none" disabled>
              No projects found
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
