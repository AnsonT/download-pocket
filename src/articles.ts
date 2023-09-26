import {Config} from './config.js'
import path from 'path'
import {db} from './db.js'

type ArticlesConfig = {
  startPocketKey: string
}

const articleConfig = new Config<ArticlesConfig>(
  path.join(process.cwd(), '_data/articles.json'),
  {startPocketKey: ''}
)

export class Articles {
  startPocketKey = articleConfig.get('startPocketKey') ?? ''

  setStartPocketKey(key: string) {
    this.startPocketKey = key
    articleConfig.set('startPocketKey', key)
  }

  async downloadNext(count = 10) {
    const result = await db.getBookmarks({
      startkey: this.startPocketKey,
      limit: count,
      skip: this.startPocketKey ? 1 : 0,
    })
    if (result.length === 0) return []
    for (const article of result) {
      this.setStartPocketKey(article.id)
    }
    return result
  }

  async downloadAll() {
    let total = 0
    let count = 1
    while (count) {
      const docs = await this.downloadNext(10)
      count = docs.length
      total += count
    }
    console.log(`Downloaded ${total} articles`)
  }
}

export const articles = new Articles()
