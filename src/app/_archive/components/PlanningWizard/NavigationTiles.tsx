'use client'

import React from 'react'
import { Project, Area, Phase } from './PlanningWizard'

interface NavigationTilesProps {
  project: Project
  currentArea?: Area
  currentPhase?: Phase
  onNavigateToProject: () => void
  onNavigateToArea?: (areaId: string) => void
  onNavigateToPhase?: (areaId: string, phaseId: string) => void
  onAddPhase?: (areaId: string) => void
  onAddParcel?: () => void
  showProjectTile?: boolean
}

const NavigationTiles: React.FC<NavigationTilesProps> = ({
  project,
  currentArea,
  currentPhase,
  onNavigateToProject,
  onNavigateToArea,
  onNavigateToPhase,
  onAddPhase,
  onAddParcel,
  showProjectTile = true
}) => {
  return (
    <div className="flex gap-3 mb-4 h-16">
      {/* Project Tile */}
      {showProjectTile && (
        <button
          onClick={onNavigateToProject}
          className="flex items-center justify-center h-full aspect-square bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors duration-200"
        >
          <div className="text-center">
            <div className="w-4 h-4 bg-blue-500 rounded mx-auto mb-1"></div>
            <div className="text-xs font-medium text-white">{project.name}</div>
          </div>
        </button>
      )}

      {/* Area Tile */}
      {currentArea && (
        <button
          onClick={() => onNavigateToArea && onNavigateToArea(currentArea.id)}
          className="flex items-center justify-center h-full aspect-square bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 transition-colors duration-200"
        >
          <div className="text-center">
            <div className="w-4 h-4 bg-slate-400 rounded mx-auto mb-1"></div>
            <div className="text-xs font-medium text-white">{currentArea.name}</div>
            <div className="text-xs text-gray-400">
              {currentArea.phases.length} phase{currentArea.phases.length === 1 ? '' : 's'}
            </div>
          </div>
        </button>
      )}

      {/* Phase Tile */}
      {currentPhase && currentArea && (
        <button
          onClick={() => onNavigateToPhase && onNavigateToPhase(currentArea.id, currentPhase.id)}
          className="flex items-center justify-center h-full aspect-square bg-purple-700 border border-purple-600 rounded-lg hover:bg-purple-600 transition-colors duration-200"
        >
          <div className="text-center">
            <div className="w-4 h-4 bg-purple-400 rounded mx-auto mb-1"></div>
            <div className="text-xs font-medium text-white">{currentPhase.name}</div>
            <div className="text-xs text-gray-400">
              {currentPhase.parcels.length} parcel{currentPhase.parcels.length === 1 ? '' : 's'}
            </div>
          </div>
        </button>
      )}

      {/* Add Phase Tile */}
      {currentArea && onAddPhase && (
        <button
          onClick={() => onAddPhase(currentArea.id)}
          className="flex items-center justify-center h-full aspect-square bg-blue-600 border border-blue-500 rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">+</div>
            <div className="text-xs font-medium text-white">Add Phase</div>
          </div>
        </button>
      )}

      {/* Add Parcel Tile */}
      {currentPhase && onAddParcel && (
        <button
          onClick={onAddParcel}
          className="flex items-center justify-center h-full aspect-square bg-green-600 border border-green-500 rounded-lg hover:bg-green-700 transition-colors duration-200"
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">+</div>
            <div className="text-xs font-medium text-white">Add Parcel</div>
          </div>
        </button>
      )}
    </div>
  )
}

export default NavigationTiles