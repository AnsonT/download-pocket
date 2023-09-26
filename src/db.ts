import PouchDB from 'pouchdb'
import {PocketGetResponse} from './types'
import {monotonicFactory} from 'ulid'
const ulid = monotonicFactory()

type BookMarkEntity = PocketGetResponse['list']['0'] & {
  _id?: string
  _rev?: string
}

type ArticleEntity = {
  _id?: string
  _rev?: string
  pocketId: string
  url: string
  title: string
  summary: string
  content: string
  keywords: string[]
  downloadedAt: number
}

export class Db {
  bookmarks: PouchDB.Database<BookMarkEntity>
  articles: PouchDB.Database<ArticleEntity>

  constructor() {
    this.bookmarks = new PouchDB('_data/bookmarks.db')
    this.articles = new PouchDB('_data/articles.db')
  }

  async saveBookmarks(bookmarks: PocketGetResponse) {
    const docs = Object.values(bookmarks.list).map(bookmark => ({
      ...bookmark,
      _id: ulid(),
    }))
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
