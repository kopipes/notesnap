// Convert Indonesian Bible XML (christos-c/bible-corpus) to tb.json format
// XML structure: <div id="b.GEN" type="book"> / <div id="b.GEN.1" type="chapter"> / <seg id="b.GEN.1.1" type="verse">

const fs = require('fs')
const path = require('path')

// Map 3-letter book codes to Indonesian (Terjemahan Baru) names
const BOOK_MAP = {
  GEN: 'Kejadian', EXO: 'Keluaran', LEV: 'Imamat', NUM: 'Bilangan', DEU: 'Ulangan',
  JOS: 'Yosua', JDG: 'Hakim-hakim', RUT: 'Rut', '1SA': '1 Samuel', '2SA': '2 Samuel',
  '1KI': '1 Raja-raja', '2KI': '2 Raja-raja', '1CH': '1 Tawarikh', '2CH': '2 Tawarikh',
  EZR: 'Ezra', NEH: 'Nehemia', EST: 'Ester', JOB: 'Ayub', PSA: 'Mazmur', PRO: 'Amsal',
  ECC: 'Pengkhotbah', SON: 'Kidung Agung', ISA: 'Yesaya', JER: 'Yeremia', LAM: 'Ratapan',
  EZE: 'Yehezkiel', DAN: 'Daniel', HOS: 'Hosea', JOE: 'Yoel', AMO: 'Amos',
  OBA: 'Obaja', JON: 'Yunus', MIC: 'Mikha', NAH: 'Nahum', HAB: 'Habakuk',
  ZEP: 'Zefanya', HAG: 'Hagai', ZEC: 'Zakharia', MAL: 'Maleakhi',
  MAT: 'Matius', MAR: 'Markus', LUK: 'Lukas', JOH: 'Yohanes', ACT: 'Kisah Para Rasul',
  ROM: 'Roma', '1CO': '1 Korintus', '2CO': '2 Korintus', GAL: 'Galatia', EPH: 'Efesus',
  PHI: 'Filipi', COL: 'Kolose', '1TH': '1 Tesalonika', '2TH': '2 Tesalonika',
  '1TI': '1 Timotius', '2TI': '2 Timotius', TIT: 'Titus', PHM: 'Filemon',
  HEB: 'Ibrani', JAM: 'Yakobus', '1PE': '1 Petrus', '2PE': '2 Petrus',
  '1JO': '1 Yohanes', '2JO': '2 Yohanes', '3JO': '3 Yohanes', JUD: 'Yudas', REV: 'Wahyu',
}

const xmlPath = process.argv[2]
const outPath = process.argv[3]

if (!xmlPath || !outPath) {
  console.error('Usage: node convert-bible.js <input.xml> <output.json>')
  process.exit(1)
}

console.log('Reading XML...')
const xml = fs.readFileSync(xmlPath, 'utf8')
const bible = {}

// Parse each verse using its id attribute: b.GEN.1.1
// Format: id="b.BOOK.CHAPTER.VERSE"
const verseRegex = /<seg id="b\.([A-Z0-9]+)\.(\d+)\.(\d+)" type="verse">([\s\S]*?)<\/seg>/g
let match
let count = 0

while ((match = verseRegex.exec(xml)) !== null) {
  const bookCode = match[1]
  const chapter = match[2]
  const verse = match[3]
  const rawText = match[4]

  const bookName = BOOK_MAP[bookCode]
  if (!bookName) continue

  // Clean text: strip tags, decode entities, normalise whitespace
  const text = rawText
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) continue  // skip empty verses

  if (!bible[bookName]) bible[bookName] = {}
  if (!bible[bookName][chapter]) bible[bookName][chapter] = {}
  bible[bookName][chapter][verse] = text
  count++
}

// Stats
const bookCount = Object.keys(bible).length
let totalChapters = 0
for (const book of Object.values(bible)) {
  totalChapters += Object.keys(book).length
}

fs.writeFileSync(outPath, JSON.stringify(bible), 'utf8')
const fileSizeKB = Math.round(fs.statSync(outPath).size / 1024)

console.log(`✓ Wrote ${outPath} (${fileSizeKB} KB)`)
console.log(`  Books: ${bookCount}, Chapters: ${totalChapters}, Verses: ${count}`)

// Spot check
if (bible['Yohanes']?.['3']?.['16']) {
  console.log(`  Spot check Yoh 3:16: "${bible['Yohanes']['3']['16'].substring(0, 80)}…"`)
}
if (bible['Mazmur']?.['23']?.['1']) {
  console.log(`  Spot check Mzm 23:1: "${bible['Mazmur']['23']['1'].substring(0, 80)}…"`)
}
