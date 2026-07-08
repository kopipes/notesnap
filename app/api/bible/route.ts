import { NextRequest, NextResponse } from 'next/server'
import { lookupVerse, lookupVerseRange, normalizeBookName } from '@/lib/bible'

// GET /api/bible?book=Yohanes&chapter=3&verse=16
// GET /api/bible?book=Yohanes&chapter=3&verse=16&verseEnd=18
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const book = searchParams.get('book')
  const chapterStr = searchParams.get('chapter')
  const verseStr = searchParams.get('verse')
  const verseEndStr = searchParams.get('verseEnd')

  if (!book || !chapterStr || !verseStr) {
    return NextResponse.json(
      { error: 'Required params: book, chapter, verse' },
      { status: 400 }
    )
  }

  const chapter = parseInt(chapterStr, 10)
  const verseStart = parseInt(verseStr, 10)

  if (isNaN(chapter) || isNaN(verseStart)) {
    return NextResponse.json(
      { error: 'chapter and verse must be integers' },
      { status: 400 }
    )
  }

  const canonical = normalizeBookName(book)
  if (!canonical) {
    return NextResponse.json(
      { error: `Book not found: "${book}"` },
      { status: 404 }
    )
  }

  if (verseEndStr) {
    const verseEnd = parseInt(verseEndStr, 10)
    if (isNaN(verseEnd) || verseEnd < verseStart) {
      return NextResponse.json(
        { error: 'verseEnd must be an integer >= verse' },
        { status: 400 }
      )
    }
    const verses = lookupVerseRange(canonical, chapter, verseStart, verseEnd)
    if (verses.length === 0) {
      return NextResponse.json(
        { error: 'No verses found for that range' },
        { status: 404 }
      )
    }
    return NextResponse.json({ verses })
  }

  const verse = lookupVerse(canonical, chapter, verseStart)
  if (!verse) {
    return NextResponse.json(
      { error: `Verse not found: ${canonical} ${chapter}:${verseStart}` },
      { status: 404 }
    )
  }

  return NextResponse.json({ verse })
}
