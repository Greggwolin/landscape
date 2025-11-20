import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { formatRouteLabel, normalizeRoutePath, routesRoughlyMatch } from '@/lib/devStatus/pageUtils'

interface PageMetadata {
  path: string
  label: string
  lastUpdated: string
  filePath: string
}

const APP_DIR = path.join(process.cwd(), 'src', 'app')
const SKIP_DIRS = new Set(['api', 'components', 'hooks', 'styles', 'lib', 'icons'])

function shouldSkipDirectory(name: string) {
  if (SKIP_DIRS.has(name)) return true
  if (name.startsWith('_')) return true
  return false
}

function resolveDynamicSegment(segment: string) {
  if (!segment.includes('[')) return segment

  const key = segment.replace(/\[|\]/g, '').toLowerCase()

  if (key.includes('project')) return '7'
  if (key.includes('prototype')) return 'demo'
  if (key.includes('property')) return '1'
  if (key.includes('lease')) return '1'
  if (key.includes('analysis')) return 'analysis'
  if (key.includes('assumption')) return 'assumptions'
  if (key.includes('inventory')) return 'inventory'
  if (key.includes('settings')) return 'settings'
  if (key.includes('container')) return 'containers'
  if (key.includes('contact')) return 'contacts'
  if (key.includes('id')) return '1'

  return 'sample'
}

async function collectPages(currentDir: string, relativeSegments: string[] = []): Promise<PageMetadata[]> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true })
  const results: PageMetadata[] = []

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (shouldSkipDirectory(entry.name)) continue

      if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
        const nested = await collectPages(path.join(currentDir, entry.name), relativeSegments)
        results.push(...nested)
      } else {
        const nested = await collectPages(path.join(currentDir, entry.name), [...relativeSegments, entry.name])
        results.push(...nested)
      }
    } else if (entry.isFile() && entry.name === 'page.tsx') {
      const routeSegments = relativeSegments
        .filter(Boolean)
        .map(resolveDynamicSegment)

      const routePath = routeSegments.length ? `/${routeSegments.join('/')}` : '/'
      const label = formatRouteLabel(routePath)
      const filePath = path.join(currentDir, entry.name)
      const stats = await fs.stat(filePath)

      results.push({
        path: routePath,
        label,
        lastUpdated: stats.mtime.toISOString(),
        filePath: filePath.replace(`${process.cwd()}${path.sep}`, ''),
      })
    }
  }

  return results
}

export async function GET(request: NextRequest) {
  const pages = (await collectPages(APP_DIR)).sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  )

  const { searchParams } = request.nextUrl
  const requestedPath = searchParams.get('path')

  if (requestedPath) {
    const normalized = normalizeRoutePath(requestedPath)
    const directMatch = pages.find((page) => normalizeRoutePath(page.path) === normalized)

    if (directMatch) {
      return NextResponse.json({ page: directMatch })
    }

    const fuzzyMatch = pages.find((page) => routesRoughlyMatch(normalized, page.path))

    if (fuzzyMatch) {
      return NextResponse.json({ page: fuzzyMatch })
    }

    return NextResponse.json({ error: 'Page metadata not found' }, { status: 404 })
  }

  return NextResponse.json({
    count: pages.length,
    pages,
  })
}
