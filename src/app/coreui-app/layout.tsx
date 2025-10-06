import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Landscape (CoreUI) | Prototype',
  description: 'CoreUI-based prototype of Landscape application',
}

export default function CoreUIAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
