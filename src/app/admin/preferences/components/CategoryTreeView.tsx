'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FolderOpen, Folder } from 'lucide-react';
import { CategoryNode } from '@/lib/utils/categoryTree';

interface CategoryTreeViewProps {
  tree: CategoryNode[];
  selectedCategory: CategoryNode | null;
  onSelectCategory: (category: CategoryNode) => void;
  activityFilter: string;
}

interface TreeNodeProps {
  node: CategoryNode;
  isSelected: boolean;
  onSelect: (category: CategoryNode) => void;
  depth: number;
}

function TreeNode({ node, isSelected, onSelect, depth }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleClick = () => {
    onSelect(node);
  };

  return (
    <div className="tree-node">
      <div
        className={`tree-node-content ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
        style={{
          paddingLeft: `${depth * 24 + 8}px`,
        }}
      >
        {/* Expand/collapse button */}
        <button
          type="button"
          className="tree-node-toggle"
          onClick={handleToggle}
          style={{ opacity: hasChildren ? 1 : 0, pointerEvents: hasChildren ? 'auto' : 'none' }}
        >
          {hasChildren && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
        </button>

        {/* Folder icon */}
        <span className="tree-node-icon">
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen size={16} />
            ) : (
              <Folder size={16} />
            )
          ) : (
            <div style={{ width: 16, height: 16 }} />
          )}
        </span>

        {/* Category name */}
        <span className="tree-node-label">{node.category_name}</span>

        {/* Item count badge */}
        {node.item_count > 0 && (
          <span className="tree-node-badge">{node.item_count}</span>
        )}

        {/* Activity tags */}
        <div className="tree-node-activities">
          {node.activitys.slice(0, 2).map((activity) => (
            <span key={activity} className="activity-tag">
              {activity === 'Planning & Engineering' ? 'P&E' : activity.slice(0, 3)}
            </span>
          ))}
          {node.activitys.length > 2 && (
            <span className="activity-tag">+{node.activitys.length - 2}</span>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="tree-node-children">
          {node.children!.map((child) => (
            <TreeNode
              key={child.category_id}
              node={child}
              isSelected={child.category_id === node.category_id}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryTreeView({
  tree,
  selectedCategory,
  onSelectCategory,
  activityFilter,
}: CategoryTreeViewProps) {
  // Filter tree by activity if needed
  const filteredTree = activityFilter
    ? tree.filter((node) => node.activitys.includes(activityFilter))
    : tree;

  if (filteredTree.length === 0) {
    return (
      <div className="tree-view-empty">
        <p className="text-muted">No categories found for the selected filter</p>
      </div>
    );
  }

  return (
    <div className="category-tree-view">
      {filteredTree.map((node) => (
        <TreeNode
          key={node.category_id}
          node={node}
          isSelected={selectedCategory?.category_id === node.category_id}
          onSelect={onSelectCategory}
          depth={0}
        />
      ))}
    </div>
  );
}
