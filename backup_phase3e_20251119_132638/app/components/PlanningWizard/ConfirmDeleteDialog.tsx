'use client'

import React from 'react'

interface ConfirmDeleteDialogProps {
  isOpen: boolean
  title: string
  message: string
  warningItems?: string[]
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  isOpen,
  title,
  message,
  warningItems,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-96 max-w-[90vw]">
        <div className="border-b border-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>

        <div className="p-6">
          <div className="text-gray-300 mb-4">
            {message}
          </div>

          {warningItems && warningItems.length > 0 && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
              <div className="text-red-400 font-medium mb-2">
                ⚠️ This will also delete:
              </div>
              <ul className="text-red-300 text-sm space-y-1">
                {warningItems.map((item, index) => (
                  <li key={index} className="ml-4">• {item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDeleteDialog