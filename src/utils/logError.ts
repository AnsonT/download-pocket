import {appendFileSync, existsSync} from 'node:fs'
import path from 'node:path'
import {env} from '../env.js'

const errorLogPath = path.join(env.DATA_DIR, 'error.log')

export function logProcessingError(type: string, id: string, url: string) {
  if (existsSync(errorLogPath)) {
    appendFileSync(errorLogPath, ',\n')
  }
  appendFileSync(
    path.join(env.DATA_DIR, 'error.log'),
    JSON.stringify({
      type,
      pocketId: id,
      url,
    })
  )
}
