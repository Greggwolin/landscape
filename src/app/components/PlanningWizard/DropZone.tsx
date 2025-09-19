'use client'

import React from 'react'
import { useDrop } from 'react-dnd'
import { DragItemType } from './DraggableTile'

interface DropZoneProps {
  accepts: DragItemType[]
  onDrop: (item: { type: DragItemType }) => void
  children: React.ReactNode
  className?: string
  isActive?: boolean
}

const DropZone: React.FC<DropZoneProps> = ({ 
  accepts, 
  onDrop, 
  children, 
  className = '',
  isActive: _isActive = false 
}) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: accepts,
    drop: (item: { type: DragItemType }) => onDrop(item),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }))

  const getDropZoneStyle = () => {
    if (isOver && canDrop) {
      return 'border-blue-400 bg-blue-50'
    }
    if (canDrop) {
      return 'border-blue-300 bg-blue-25'
    }
    return 'border-gray-300'
  }

  return (
    <div
      ref={drop}
      className={`
        border-2 border-solid rounded-lg transition-colors duration-200
        ${getDropZoneStyle()}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

export default DropZone
