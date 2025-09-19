import { readdirSync, readFileSync, writeFileSync, renameSync } from 'fs'
import { join } from 'path'

const dir = 'docs/ai-chats'
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.md')) continue
  const p = join(dir, f)
  const raw = readFileSync(p, 'utf8')
  const date = new Date().toISOString()
  const title = (raw.match(/^#\s+(.+)$/m)?.[1] || 'AI Chat').trim()
  const fm = `---\ntitle: ${title}\ncreated: ${date}\nsource: codex/copilot\n---\n\n`
  if (!raw.startsWith('---')) writeFileSync(p, fm + raw, 'utf8')
  const safe = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const target = join(dir, `${date.slice(0,10)}-${safe || 'ai-chat'}.md`)
  try { renameSync(p, target) } catch { /* ok if exists */ }
}
