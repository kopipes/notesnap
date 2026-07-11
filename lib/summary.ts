// Parse ===SECTION=== formatted summary text into a keyed record
export const SECTION_ORDER = ['JUDUL', 'PESAN UTAMA', 'POIN PENTING', 'AYAT REFERENSI', 'LANGKAH PRAKTIS'] as const
export type SectionKey = typeof SECTION_ORDER[number]

export function parseSummarySections(raw: string): Partial<Record<SectionKey, string>> {
  const sectionRegex = /===([^=]+)===/g
  const sections: Partial<Record<SectionKey, string>> = {}
  let lastKey = ''
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = sectionRegex.exec(raw)) !== null) {
    if (lastKey) {
      sections[lastKey as SectionKey] = raw.slice(lastIndex, match.index).trim()
    }
    lastKey = match[1].trim().toUpperCase()
    lastIndex = match.index + match[0].length
  }
  if (lastKey) sections[lastKey as SectionKey] = raw.slice(lastIndex).trim()

  return sections
}

export const SECTION_LABELS: Record<SectionKey, string> = {
  'JUDUL': 'Judul',
  'PESAN UTAMA': 'Pesan Utama',
  'POIN PENTING': 'Poin Penting',
  'AYAT REFERENSI': 'Ayat Referensi',
  'LANGKAH PRAKTIS': 'Langkah Praktis',
}

/** Format parsed sections as plain shareable text */
export function formatSummaryForShare(title: string, raw: string): string {
  const SHARE_LABELS: Record<SectionKey, string> = {
    'JUDUL': '📖',
    'PESAN UTAMA': '💡 Pesan Utama',
    'POIN PENTING': '📝 Poin Penting',
    'AYAT REFERENSI': '📜 Ayat Referensi',
    'LANGKAH PRAKTIS': '✅ Langkah Praktis',
  }

  const sections = parseSummarySections(raw)
  if (Object.keys(sections).length === 0) return `${title}\n\n${raw}`

  const parts: string[] = []
  for (const key of SECTION_ORDER) {
    const content = sections[key]
    if (!content) continue
    const label = SHARE_LABELS[key]
    parts.push(key === 'JUDUL' ? `${label} ${content}` : `${label}\n${content}`)
  }
  return parts.join('\n\n')
}
