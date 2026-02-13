'use client'

import React from 'react'
import { useDrag } from 'react-dnd'

export type DragItemType = 'area' | 'phase' | 'parcel'

interface DragItem {
  type: DragItemType
  id?: string
}

interface DraggableTileProps {
  type: DragItemType
  title: string
  onClick?: () => void
}

const DraggableTile: React.FC<DraggableTileProps> = ({ type, title, onClick }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: type,
    item: { type } as DragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  const getBackgroundColor = () => {
    switch (type) {
      case 'area':
        return 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200'
      case 'phase':
        return 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200'
      case 'parcel':
        return 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200'
      default:
        return 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200'
    }
  }

  return (
    <div
      ref={drag}
      onClick={onClick}
      className={`
        ${getBackgroundColor()}
        border-2 border-dashed rounded-lg p-3 cursor-move text-center text-xs font-medium
        transition-colors duration-200
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        select-none
      `}
      style={{
        minHeight: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <span className="text-white">{title}</span>
    </div>
  )
}

export default DraggableTile