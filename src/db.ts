import PouchDB from 'pouchdb'
import {PocketGetResponse} from './types.js'
import {monotonicFactory} from 'ulid'
import {UnfluffData} from 'unfluff'
import {ensureFileDir} from './utils/ensureDir.js'
const ulid = monotonicFactory()

type BookMarkEntity = PocketGetResponse['list']['0'] & {
  _id?: string
  _rev?: string
}

interface ArticleEntityBase {
  _id?: string
  _rev?: string
  pocketId: string
  downloadedAt: number
}

interface ArticleEntityOk extends ArticleEntityBase, UnfluffData {
  ok: true
  raw: string
  summary: string
  difficulty: number
  minutes: number
  sentiment: number
  topics: string[]
  words: number
}
interface ArticleEntityError extends ArticleEntityBase {
  ok: false
  error: string
  status: number
}

export type ArticleEntity = ArticleEntityOk | ArticleEntityError

export class Db {
  bookmarks: PouchDB.Database<BookMarkEntity>
  articles: PouchDB.Database<ArticleEntity>

  constructor() {
    ensureFileDir('_data/bookmarks.db')
    this.bookmarks = new PouchDB('_data/bookmarks.db')
    this.articles = new PouchDB('_data/articles.db')
  }

  async saveBookmarks(bookmarks: PocketGetResponse) {
    const docs = Object.values(bookmarks.list).map(
      (bookmark: PocketGetResponse['list']['']) => ({
        ...bookmark,
        _id: ulid(),
      })
    )
    await this.bookmarks.bulkDocs(docs)
  }

  async getBookmarks(
    options?:
      | PouchDB.Core.AllDocsOptions
      | PouchDB.Core.AllDocsWithinRangeOptions
  ) {
    const docs = await this.bookmarks.allDocs<BookMarkEntity>({
      include_docs: true,
      ...options,
    })
    return docs.rows ?? []
  }

  async saveArticles(articles: ArticleEntity[]) {
    await this.articles.bulkDocs(articles)
  }
}

export const db = new Db()
