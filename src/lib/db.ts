import 'server-only'
import { neon } from '@neondatabase/serverless'
import type { NeonQueryFunction } from '@neondatabase/serverless'

// Lazy-initialize a singleton Neon client for server-side usage.
let _sql: NeonQueryFunction<false, false> | null = null

function getSql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  _sql = neon(url)
  return _sql
}

// Create a proper proxy that exposes both tagged template and .query() method
export const sql: NeonQueryFunction<false, false> = Object.assign(
  (strings: TemplateStringsArray, ...values: unknown[]) => getSql()(strings, ...values),
  {
    query: (queryWithPlaceholders: string, params?: unknown[], queryOpts?: unknown) =>
      getSql().query(queryWithPlaceholders, params, queryOpts)
  }
) as NeonQueryFunction<false, false>

export type Sql = NeonQueryFunction<false, false>
