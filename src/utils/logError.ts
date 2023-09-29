import {appendFileSync, existsSync} from 'node:fs'

const errorLogPath = '_data/error.log'

export function logProcessingError(type: string, id: string, url: string) {
  if (existsSync(errorLogPath)) {
    appendFileSync(errorLogPath, ',\n')
  }
  appendFileSync(
    '_data/error.log',
    JSON.stringify({
      type,
      pocketId: id,
      url,
    })
  )
}
