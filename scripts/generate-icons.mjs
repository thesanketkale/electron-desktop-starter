import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const buildDir = path.resolve(__dirname, '..', 'build')

function createPngBuffer(size) {
  // size x size RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  let offset = 0

  const center = size / 2
  const radius = size * 0.42

  for (let y = 0; y < size; y++) {
    raw[offset++] = 0 // filter byte: None
    for (let x = 0; x < size; x++) {
      const dx = x - center
      const dy = y - center
      const dist = Math.sqrt(dx * dx + dy * dy)

      // Base: Indigo #4f46e5 = rgb(79, 70, 229)
      // Inner circle / icon: Slate-50 #f8fafc = rgb(248, 250, 252)
      if (dist <= radius) {
        // Check for inner circle or icon detail
        const innerDist = Math.sqrt(dx * dx + dy * dy)
        if (innerDist > radius * 0.75 && innerDist <= radius * 0.9) {
          // White accent ring
          raw[offset++] = 255
          raw[offset++] = 255
          raw[offset++] = 255
          raw[offset++] = 255
        } else if (Math.abs(dx) < radius * 0.25 && Math.abs(dy) < radius * 0.25) {
          // Center white square
          raw[offset++] = 255
          raw[offset++] = 255
          raw[offset++] = 255
          raw[offset++] = 255
        } else {
          // Indigo body
          raw[offset++] = 79
          raw[offset++] = 70
          raw[offset++] = 229
          raw[offset++] = 255
        }
      } else {
        // Transparent outside
        raw[offset++] = 0
        raw[offset++] = 0
        raw[offset++] = 0
        raw[offset++] = 0
      }
    }
  }

  const deflated = zlib.deflateSync(raw)

  // IHDR chunk
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr)
  const idatChunk = makeChunk('IDAT', deflated)
  const iendChunk = makeChunk('IEND', Buffer.alloc(0))

  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk])
}

function makeChunk(type, data) {
  const len = data.length
  const buf = Buffer.alloc(4 + 4 + len + 4)
  buf.writeUInt32BE(len, 0)
  buf.write(type, 4, 4, 'ascii')
  data.copy(buf, 8)
  const typeAndData = buf.subarray(4, 8 + len)
  const crc = zlib.crc32(typeAndData)
  buf.writeUInt32BE(crc >>> 0, 8 + len)
  return buf
}

function createIcoBuffer(png256Buffer) {
  // ICO header (6 bytes)
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // icon type
  header.writeUInt16LE(1, 4) // 1 image

  // Icon entry (16 bytes)
  const entry = Buffer.alloc(16)
  entry.writeUInt8(0, 0) // 0 means 256px width
  entry.writeUInt8(0, 1) // 0 means 256px height
  entry.writeUInt8(0, 2) // color count 0 = >8bpp
  entry.writeUInt8(0, 3) // reserved
  entry.writeUInt16LE(1, 4) // color planes
  entry.writeUInt16LE(32, 6) // bits per pixel
  entry.writeUInt32LE(png256Buffer.length, 8) // size of image data
  entry.writeUInt32LE(6 + 16, 12) // offset of image data

  return Buffer.concat([header, entry, png256Buffer])
}

const png512 = createPngBuffer(512)
const png256 = createPngBuffer(256)
const ico = createIcoBuffer(png256)

fs.writeFileSync(path.join(buildDir, 'icon.png'), png512)
fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico)

console.info('Icons generated successfully:')
console.info(' - build/icon.png: 512x512, size:', png512.length)
console.info(' - build/icon.ico: 256x256 embedded PNG, size:', ico.length)
