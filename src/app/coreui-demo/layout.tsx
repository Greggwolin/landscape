import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CoreUI Demo | Landscape',
  description: 'CoreUI prototype components demonstration',
}

export default function CoreUIDemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
