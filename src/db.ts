import PouchDB from 'pouchdb'
import {PocketGetResponse} from './types.js'
import {monotonicFactory} from 'ulid'
import {UnfluffData} from 'unfluff'
import {ensureFileDir} from './utils/ensureDir.js'
import upsertPlugin from 'pouchdb-upsert'
import {env} from './env.js'
import path from 'node:path'
const ulid = monotonicFactory()

PouchDB.plugin(upsertPlugin)

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

interface ArticlePendingEntity {
  _id?: string
  _rev?: string
  bookmarkId: string
  url: string
  attemptedAt: number
  numAttempts: number
  lastError: string
}

export type ArticleEntity = ArticleEntityOk | ArticleEntityError

export class Db {
  bookmarks: PouchDB.Database<BookMarkEntity>
  articles: PouchDB.Database<ArticleEntity>
  pending: PouchDB.Database<ArticlePendingEntity>

  constructor() {
    const dataDir = env.DATA_DIR
    ensureFileDir(path.join(dataDir, 'bookmarks.db'))
    this.bookmarks = new PouchDB(path.join(dataDir, 'bookmarks.db'))
    this.articles = new PouchDB(path.join(dataDir, 'articles.db'))
    this.pending = new PouchDB(path.join(dataDir, 'pending.db'))
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
  async savePending(pending: ArticlePendingEntity) {
    await this.pending.put(
      {
        _id: pending._id ?? ulid(),
        ...pending,
      },
      {force: true}
    )
  }
  async removePending(id: string) {
    await this.pending.remove({
      _id: id,
      _rev: (await this.pending.get(id))._rev,
    })
  }
}

export const db = new Db()
