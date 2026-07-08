const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

// Simple icon generator — requires 'canvas' npm package
// Fallback: we generate SVG-based PNGs using a simpler approach

function generateIcon(size) {
  // We'll write SVG and convert inline for simplicity
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#0ea5e9"/>
  <text x="50%" y="55%" font-family="Arial,sans-serif" font-size="${size * 0.45}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">N</text>
</svg>`
  return svg
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(iconsDir, { recursive: true })

fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), generateIcon(192))
fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), generateIcon(512))
console.log('SVG icons written')
