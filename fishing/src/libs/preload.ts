import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const thumbnail = fs.readFileSync(path.join(__dirname, '..', 'assets', 'thumbnail-001.png'))
export const thumbnailDataURI = 'data:image/png;base64,' + Buffer.from(thumbnail).toString('base64')
