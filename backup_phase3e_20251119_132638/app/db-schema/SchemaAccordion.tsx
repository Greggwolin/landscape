'use client'

import React, { useState } from 'react'

type Column = { name: string; type: string; nullable: boolean; position: number }
type FK = { column: string; references: { table: string; column: string } }
type TableInfo = { columns: Column[]; foreignKeys: FK[] }

type Props = {
  tableNames: string[]
  tables: Record<string, TableInfo>
}

const SchemaAccordion: React.FC<Props> = ({ tableNames, tables }) => {
  const [open, setOpen] = useState<string | null>(tableNames[0] ?? null)

  const onToggle = (name: string) => {
    setOpen(prev => (prev === name ? null : name))
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded border border-gray-700">
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="text-sm text-gray-300 mb-2">Tables</div>
          <div className="flex flex-wrap gap-2">
            {tableNames.map(name => (
              <button
                key={name}
                onClick={() => setOpen(name)}
                className={`px-2 py-1 rounded border text-xs transition-colors ${
                  open === name
                    ? 'bg-blue-700 border-blue-500 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tableNames.map(name => {
        const t = tables[name]
        const isOpen = open === name
        return (
          <div key={name} className="rounded border border-gray-800 overflow-hidden">
            <button
              onClick={() => onToggle(name)}
              className={`w-full px-4 py-2 flex items-center justify-between border-b transition-colors ${
                isOpen ? 'bg-gray-800 border-gray-700' : 'bg-gray-900 border-gray-800 hover:bg-gray-800'
              }`}
            >
              <span className="text-sm font-semibold text-white">{name}</span>
              <span className="text-gray-400 text-xs">{isOpen ? 'Hide' : 'Show'}</span>
            </button>
            {isOpen && (
              <div className="p-3 space-y-4 bg-gray-900">
                <div>
                  <div className="text-xs text-gray-300 mb-2">Columns</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-800 text-gray-200">
                          <th className="px-2 py-1 text-left border border-gray-700">#</th>
                          <th className="px-2 py-1 text-left border border-gray-700">Name</th>
                          <th className="px-2 py-1 text-left border border-gray-700">Type</th>
                          <th className="px-2 py-1 text-left border border-gray-700">Nullable</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.columns
                          .slice()
                          .sort((a, b) => a.position - b.position)
                          .map(col => (
                            <tr key={col.name} className="odd:bg-gray-850">
                              <td className="px-2 py-1 border border-gray-800 text-gray-300">{col.position}</td>
                              <td className="px-2 py-1 border border-gray-800 text-white">{col.name}</td>
                              <td className="px-2 py-1 border border-gray-800 text-gray-300">{col.type}</td>
                              <td className="px-2 py-1 border border-gray-800 text-gray-300">{col.nullable ? 'YES' : 'NO'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-300 mb-2">Foreign Keys</div>
                  {t.foreignKeys.length ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-800 text-gray-200">
                            <th className="px-2 py-1 text-left border border-gray-700">Column</th>
                            <th className="px-2 py-1 text-left border border-gray-700">References</th>
                          </tr>
                        </thead>
                        <tbody>
                          {t.foreignKeys.map((fk, idx) => (
                            <tr key={idx} className="odd:bg-gray-850">
                              <td className="px-2 py-1 border border-gray-800 text-white">{fk.column}</td>
                              <td className="px-2 py-1 border border-gray-800 text-blue-300">{fk.references.table}.{fk.references.column}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">No foreign keys</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default SchemaAccordion
