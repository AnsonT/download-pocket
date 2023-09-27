import fs from 'fs'
import {dirname} from 'path'

export function ensureFileDir(filePath: string) {
  const dir = dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true})
  }
}
