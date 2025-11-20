import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'

const IssueTypeEnum = z.enum(['bug', 'feature', 'feedback', 'question', 'other'])
type IssueType = z.infer<typeof IssueTypeEnum>

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

type PostgresError = Error & { code?: string }

const TABLE_NOT_FOUND = '42P01'

function serializeMetadataPayload(metadataPayload: Record<string, unknown>): string {
  try {
    return JSON.stringify(metadataPayload ?? {})
  } catch (error) {
    console.warn('Failed to serialize issue metadata payload; using empty object.', error)
    return '{}'
  }
}

function parseMetadataValue(metadata: unknown): Record<string, unknown> {
  if (!metadata) return {}
  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata)
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
    } catch (error) {
      console.warn('Failed to parse metadata payload from storage; returning empty object.', error)
      return {}
    }
  }
  if (typeof metadata === 'object') {
    return metadata as Record<string, unknown>
  }
  return {}
}

const ensureDevIssueLogTable = (() => {
  let ensurePromise: Promise<void> | null = null
  return () => {
    if (!ensurePromise) {
      ensurePromise = (async () => {
        await sql`
          CREATE TABLE IF NOT EXISTS public.dev_issue_log (
            issue_id BIGSERIAL PRIMARY KEY,
            issue_type TEXT NOT NULL CHECK (issue_type IN ('bug','feature','feedback','question','other')),
            title TEXT,
            description TEXT NOT NULL,
            page_path TEXT,
            component_path TEXT,
            branch TEXT,
            commit_sha TEXT,
            reporter_name TEXT,
            reporter_email TEXT,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            resolved_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )
        `

        await sql`CREATE INDEX IF NOT EXISTS idx_dev_issue_page_path ON public.dev_issue_log(page_path)`
        await sql`CREATE INDEX IF NOT EXISTS idx_dev_issue_issue_type ON public.dev_issue_log(issue_type)`
        await sql`CREATE INDEX IF NOT EXISTS idx_dev_issue_created_at ON public.dev_issue_log(created_at DESC)`
      })().catch((error) => {
        ensurePromise = null
        throw error
      })
    }
    return ensurePromise
  }
})()

function isPostgresError(error: unknown): error is PostgresError {
  return error instanceof Error && 'code' in (error as Record<string, unknown>)
}

async function insertIssueRow(params: {
  issueType: IssueType
  title?: string | undefined
  description: string
  pagePath?: string | undefined
  componentPath?: string | undefined
  branch?: string | undefined
  commitSha?: string | undefined
  reporterName?: string | undefined
  reporterEmail?: string | undefined
  metadataPayload: Record<string, unknown>
}) {
  const {
    issueType,
    title,
    description,
    pagePath,
    componentPath,
    branch,
    commitSha,
    reporterName,
    reporterEmail,
  metadataPayload,
} = params

  const metadataJson = serializeMetadataPayload(metadataPayload)

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
        ${metadataJson}
      )
      RETURNING issue_id, created_at`

  return result
}

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

  try {
    const result = await insertIssueRow({
      issueType,
      title,
      description,
      pagePath,
      componentPath,
      branch,
      commitSha,
      reporterName,
      reporterEmail,
      metadataPayload,
    })

    return NextResponse.json(
      {
        success: true,
        issueId: result.issue_id,
        createdAt: result.created_at,
      },
      { status: 201 }
    )
  } catch (error) {
    if (isPostgresError(error) && error.code === TABLE_NOT_FOUND) {
      try {
        await ensureDevIssueLogTable()
        const result = await insertIssueRow({
          issueType,
          title,
          description,
          pagePath,
          componentPath,
          branch,
          commitSha,
          reporterName,
          reporterEmail,
          metadataPayload,
        })

        return NextResponse.json(
          {
            success: true,
            issueId: result.issue_id,
            createdAt: result.created_at,
          },
          { status: 201 }
        )
      } catch (retryError) {
        console.error('Failed to initialize dev issue log table', retryError)
        return NextResponse.json(
          { error: 'Issue reporter storage is not available. Please retry in a moment.' },
          { status: 500 }
        )
      }
    }

    console.error('Failed to submit issue report', error)
    return NextResponse.json({ error: 'Failed to submit issue report.' }, { status: 500 })
  }
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

  const rows = pagePath
    ? await sql<
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
        WHERE page_path = ${pagePath}
        ORDER BY created_at DESC
        LIMIT ${pageSize}
      `
    : await sql<
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
      metadata: parseMetadataValue(row.metadata),
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
    })),
  })
}
