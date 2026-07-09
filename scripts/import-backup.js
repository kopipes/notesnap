// Import script: converts notesnap_backup.json (HTML content) → NoteSnap DB (Tiptap JSON)
// Usage: node scripts/import-backup.js [path/to/backup.json]
// Defaults to data/notesnap_backup.json

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

/**
 * Strip HTML tags and decode basic entities from a string.
 */
function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
}

/**
 * Convert HTML string → Tiptap JSON document.
 * Each non-empty line becomes a paragraph node.
 */
function htmlToTiptapJSON(html) {
  if (!html || !html.trim()) {
    return JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] })
  }

  const plain = stripHtml(html)
  const lines = plain.split('\n')

  const content = []
  for (const line of lines) {
    const trimmed = line.trimEnd()
    if (trimmed.length === 0) {
      // Empty paragraph (preserves spacing)
      content.push({ type: 'paragraph' })
    } else {
      content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: trimmed }],
      })
    }
  }

  // Remove leading/trailing empty paragraphs
  while (content.length > 0 && content[0].type === 'paragraph' && !content[0].content) {
    content.shift()
  }
  while (content.length > 0 && content[content.length - 1].type === 'paragraph' && !content[content.length - 1].content) {
    content.pop()
  }

  if (content.length === 0) {
    content.push({ type: 'paragraph' })
  }

  return JSON.stringify({ type: 'doc', content })
}

async function main() {
  const backupPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, '../data/notesnap_backup.json')

  if (!fs.existsSync(backupPath)) {
    console.error(`✗ File not found: ${backupPath}`)
    process.exit(1)
  }

  const raw = fs.readFileSync(backupPath, 'utf-8')
  const backup = JSON.parse(raw)

  if (!Array.isArray(backup.notes)) {
    console.error('✗ Invalid backup format: missing "notes" array')
    process.exit(1)
  }

  console.log(`→ Found ${backup.notes.length} notes in backup`)
  console.log(`→ Backup timestamp: ${backup.timestamp || 'unknown'}`)
  console.log()

  let imported = 0
  let skipped = 0

  for (const note of backup.notes) {
    const title = note.title || 'Catatan Baru'
    const tiptapContent = htmlToTiptapJSON(note.content || '')
    const createdAt = note.created_at ? new Date(note.created_at) : new Date()
    const updatedAt = note.updated_at ? new Date(note.updated_at) : new Date()

    // Check for duplicate by title + createdAt to avoid re-importing
    const existing = await prisma.note.findFirst({
      where: {
        title,
        createdAt,
      },
    })

    if (existing) {
      console.log(`  ~ Skipping (already exists): "${title}"`)
      skipped++
      continue
    }

    const created = await prisma.note.create({
      data: {
        title,
        content: tiptapContent,
        createdAt,
        updatedAt,
      },
    })

    console.log(`  ✓ Imported: "${title}" (${created.id})`)
    imported++
  }

  console.log()
  console.log(`→ Done. ${imported} imported, ${skipped} skipped.`)
}

main()
  .catch((e) => { console.error('✗ Error:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
