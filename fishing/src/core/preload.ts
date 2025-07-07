import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import font2base64 from 'node-font2base64'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const fontDir = path.join(__dirname, '..', 'assets', 'fonts')

const storeBackgroundDir = path.join(__dirname, '..', 'assets', 'png')
const storeBackground = fs.readFileSync(path.join(storeBackgroundDir, 'store-rod.png'))
export const storeBackgroundBase64 = `data:image/png;base64,${Buffer.from(storeBackground).toString('base64')}`

export const font = font2base64.encodeToDataUrlSync(path.join(fontDir, 'Rowdies-Bold.ttf'))
