// Bible lookup against bundled Terjemahan Baru JSON
// The JSON is loaded once at module level (server-side only)

import bibleData from '../data/tb.json'

export interface Verse {
  book: string
  chapter: number
  verse: number
  text: string
}

interface BibleData {
  [bookName: string]: {
    [chapter: string]: {
      [verse: string]: string
    }
  }
}

function getBible(): BibleData {
  return bibleData as BibleData
}

// Common Indonesian/abbreviated book name aliases → canonical keys in tb.json
const BOOK_ALIASES: Record<string, string> = {
  // Old Testament
  Kej: 'Kejadian',
  Kel: 'Keluaran',
  Im: 'Imamat',
  Bil: 'Bilangan',
  Ul: 'Ulangan',
  Yos: 'Yosua',
  Hak: 'Hakim-hakim',
  Rut: 'Rut',
  '1Sam': '1 Samuel',
  '2Sam': '2 Samuel',
  '1Raj': '1 Raja-raja',
  '2Raj': '2 Raja-raja',
  '1Taw': '1 Tawarikh',
  '2Taw': '2 Tawarikh',
  Ezr: 'Ezra',
  Neh: 'Nehemia',
  Est: 'Ester',
  Ayb: 'Ayub',
  Mzm: 'Mazmur',
  Ams: 'Amsal',
  Pkh: 'Pengkhotbah',
  Kid: 'Kidung Agung',
  Yes: 'Yesaya',
  Yer: 'Yeremia',
  Rat: 'Ratapan',
  Yeh: 'Yehezkiel',
  Dan: 'Daniel',
  Hos: 'Hosea',
  Yl: 'Yoel',
  Am: 'Amos',
  Ob: 'Obaja',
  Yun: 'Yunus',
  Mi: 'Mikha',
  Nah: 'Nahum',
  Hab: 'Habakuk',
  Zef: 'Zefanya',
  Hag: 'Hagai',
  Za: 'Zakharia',
  Mal: 'Maleakhi',
  // New Testament
  Mat: 'Matius',
  Mrk: 'Markus',
  Luk: 'Lukas',
  Yoh: 'Yohanes',
  Kis: 'Kisah Para Rasul',
  Rm: 'Roma',
  '1Kor': '1 Korintus',
  '2Kor': '2 Korintus',
  Gal: 'Galatia',
  Ef: 'Efesus',
  Flp: 'Filipi',
  Kol: 'Kolose',
  '1Tes': '1 Tesalonika',
  '2Tes': '2 Tesalonika',
  '1Tim': '1 Timotius',
  '2Tim': '2 Timotius',
  Tit: 'Titus',
  Flm: 'Filemon',
  Ibr: 'Ibrani',
  Yak: 'Yakobus',
  '1Ptr': '1 Petrus',
  '2Ptr': '2 Petrus',
  '1Yoh': '1 Yohanes',
  '2Yoh': '2 Yohanes',
  '3Yoh': '3 Yohanes',
  Yud: 'Yudas',
  Why: 'Wahyu',
}

/**
 * Normalize a book name input to its canonical form in tb.json.
 * Accepts full names, abbreviations, and case-insensitive variants.
 */
export function normalizeBookName(input: string): string | null {
  const trimmed = input.trim()

  // Direct alias match (case-sensitive abbreviation)
  if (BOOK_ALIASES[trimmed]) return BOOK_ALIASES[trimmed]

  const bible = getBible()

  // Exact match against known keys
  if (bible[trimmed]) return trimmed

  // Case-insensitive match
  const lower = trimmed.toLowerCase()
  const found = Object.keys(bible).find((k) => k.toLowerCase() === lower)
  if (found) return found

  // Case-insensitive alias lookup
  const aliasFound = Object.entries(BOOK_ALIASES).find(
    ([k]) => k.toLowerCase() === lower
  )
  if (aliasFound) return aliasFound[1]

  return null
}

/**
 * Look up a single verse.
 * Returns null if book/chapter/verse not found.
 */
export function lookupVerse(
  book: string,
  chapter: number,
  verse: number
): Verse | null {
  const canonicalBook = normalizeBookName(book)
  if (!canonicalBook) return null

  const bible = getBible()
  const bookData = bible[canonicalBook]
  if (!bookData) return null

  const chapterData = bookData[String(chapter)]
  if (!chapterData) return null

  const text = chapterData[String(verse)]
  if (!text) return null

  return { book: canonicalBook, chapter, verse, text }
}

/**
 * Look up a range of verses in the same chapter.
 */
export function lookupVerseRange(
  book: string,
  chapter: number,
  verseStart: number,
  verseEnd: number
): Verse[] {
  const results: Verse[] = []
  for (let v = verseStart; v <= verseEnd; v++) {
    const verse = lookupVerse(book, chapter, v)
    if (verse) results.push(verse)
  }
  return results
}

/**
 * Return all book names available in the dataset.
 */
export function listBooks(): string[] {
  return Object.keys(getBible())
}
