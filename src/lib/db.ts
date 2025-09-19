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

// Expose a stable tagged-template function that delegates to the singleton.
// Consumers can still use `sql<RowType>\`...\`` with generics at call sites.
export const sql: NeonQueryFunction<false, false> = ((strings: TemplateStringsArray, ...values: unknown[]) =>
  getSql()(strings, ...values)) as unknown as NeonQueryFunction<false, false>

export type Sql = NeonQueryFunction<false, false>
