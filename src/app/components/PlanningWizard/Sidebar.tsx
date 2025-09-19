'use client'

import React from 'react'
import DraggableTile from './DraggableTile'

interface SidebarProps {
  mode: 'project' | 'phase'
  onAddArea?: () => void
  onAddPhase?: (areaId: string) => void
  onAddParcel?: () => void
  currentAreaId?: string
}

const Sidebar: React.FC<SidebarProps> = ({ 
  mode, 
  onAddArea, 
  onAddPhase, 
  onAddParcel,
  currentAreaId 
}) => {
  return (
    <div className="w-24 bg-gray-800 border-r border-gray-700 flex flex-col p-2 gap-2">
      {mode === 'project' && (
        <>
          <DraggableTile
            type="area"
            title="Areas"
            onClick={onAddArea}
          />
          <DraggableTile
            type="phase"
            title="Phases"
          />
        </>
      )}
      
      {mode === 'phase' && (
        <>
          <DraggableTile
            type="area"
            title="Add Area"
            onClick={onAddArea}
          />
          <DraggableTile
            type="phase"
            title="Add Phase"
            onClick={() => currentAreaId && onAddPhase?.(currentAreaId)}
          />
          <DraggableTile
            type="parcel"
            title="Add Parcel"
            onClick={onAddParcel}
          />
        </>
      )}
    </div>
  )
}

export default Sidebar