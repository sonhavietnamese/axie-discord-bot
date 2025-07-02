import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import font2base64 from 'node-font2base64'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const axiesDir = path.join(__dirname, '..', 'assets', 'axies')
const fontDir = path.join(__dirname, '..', 'assets', 'fonts')
const backgroundDir = path.join(__dirname, '..', 'assets', 'backgrounds')

const imageRegex = /\.(png|jpe?g|webp|gif|svg)$/i

export const axiesImages: Record<string, string> = Object.fromEntries(
  fs
    .readdirSync(axiesDir)
    .filter((fileName) => imageRegex.test(fileName))
    .map((fileName) => {
      const image = fs.readFileSync(path.join(axiesDir, fileName))
      const base64Image = Buffer.from(image).toString('base64')
      return [path.parse(fileName).name, 'data:image/png;base64,' + base64Image]
    }),
)

export const backgroundsImages: Record<string, string> = Object.fromEntries(
  fs
    .readdirSync(backgroundDir)
    .filter((fileName) => imageRegex.test(fileName))
    .map((fileName) => {
      const image = fs.readFileSync(path.join(backgroundDir, fileName))
      const base64Image = Buffer.from(image).toString('base64')
      return [path.parse(fileName).name, 'data:image/png;base64,' + base64Image]
    }),
)

export const font = font2base64.encodeToDataUrlSync(path.join(fontDir, 'Rowdies-Bold.ttf'))

export const axiesJsonPath = path.join(__dirname, '..', 'axies.json')
