import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'

const IssueTypeEnum = z.enum(['bug', 'feature', 'feedback', 'question', 'other'])

const CreateIssueSchema = z.object({
  issueType: IssueTypeEnum,
  description: z.string().min(1, 'Description is required'),
  title: z.string().optional(),
  pagePath: z.string().optional(),
  componentPath: z.string().optional(),
  branch: z.string().optional(),
  commitSha: z.string().optional(),
  reporterName: z.string().optional(),
  reporterEmail: z.string().email().optional(),
  metadata: z.record(z.any()).optional(),
})

const DefaultMetadataSchema = z.object({
  userAgent: z.string().optional(),
  viewport: z.object({ width: z.number(), height: z.number() }).optional(),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CreateIssueSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const {
    issueType,
    description,
    title,
    pagePath,
    componentPath,
    branch,
    commitSha,
    reporterName,
    reporterEmail,
    metadata,
  } = parsed.data

  const normalizedMetadata = DefaultMetadataSchema.partial().safeParse(metadata ?? {})
  const metadataPayload: Record<string, unknown> = normalizedMetadata.success ? normalizedMetadata.data : {}

  const [result] = await sql<
    { issue_id: number; created_at: string }
  >`INSERT INTO public.dev_issue_log (
        issue_type,
        title,
        description,
        page_path,
        component_path,
        branch,
        commit_sha,
        reporter_name,
        reporter_email,
        metadata
      )
      VALUES (
        ${issueType},
        ${title ?? null},
        ${description},
        ${pagePath ?? null},
        ${componentPath ?? null},
        ${branch ?? null},
        ${commitSha ?? null},
        ${reporterName ?? null},
        ${reporterEmail ?? null},
        ${metadataPayload}
      )
      RETURNING issue_id, created_at`

  return NextResponse.json(
    {
      success: true,
      issueId: result.issue_id,
      createdAt: result.created_at,
    },
    { status: 201 }
  )
}

const ListIssuesParams = z.object({
  pagePath: z.string().optional(),
  pageSize: z.coerce.number().min(1).max(100).default(20),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const parsed = ListIssuesParams.safeParse({
    pagePath: searchParams.get('pagePath') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { pagePath, pageSize } = parsed.data

  const rows = await sql<
    {
      issue_id: number
      issue_type: string
      title: string | null
      description: string
      page_path: string | null
      component_path: string | null
      branch: string | null
      commit_sha: string | null
      reporter_name: string | null
      reporter_email: string | null
      metadata: Record<string, unknown> | null
      created_at: string
      resolved_at: string | null
    }[]
  >`
    SELECT issue_id, issue_type, title, description, page_path, component_path,
           branch, commit_sha, reporter_name, reporter_email, metadata,
           created_at, resolved_at
    FROM public.dev_issue_log
    WHERE (${pagePath ?? null} IS NULL OR page_path = ${pagePath ?? null})
    ORDER BY created_at DESC
    LIMIT ${pageSize}
  `

  return NextResponse.json({
    issues: rows.map((row) => ({
      issueId: row.issue_id,
      issueType: row.issue_type,
      title: row.title,
      description: row.description,
      pagePath: row.page_path,
      componentPath: row.component_path,
      branch: row.branch,
      commitSha: row.commit_sha,
      reporterName: row.reporter_name,
      reporterEmail: row.reporter_email,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
    })),
  })
}
