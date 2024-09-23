import {Config} from './config.js'
import path from 'path'
import {ArticleEntity, db} from './db.js'
import axios, {type AxiosError} from 'axios'
import unfluff from 'unfluff'
import summarize from 'summarize'
import summary from 'node-summary'
import _ from 'lodash'
import {NodeHtmlMarkdown} from 'node-html-markdown'
import {generateMarkdown} from './markdown.js'
import {generatePDF} from './pdf.js'
import chalk from 'chalk'
import {logProcessingError} from './utils/logError.js'
import {env} from './env.js'

axios.defaults.timeout = 30000

async function extractSummary(title: string, content: string): Promise<string> {
  return new Promise<string>((resolve, reject) =>
    summary.summarize(title, content, (err: unknown, summary: string) => {
      if (err) reject(err)
      else resolve(summary)
    })
  )
}

interface DownloadResult {
  data: string
  downloadUrl: string
}

const waybackTimeout = 30000
let lastWaybackTimestamp = 0

async function tryDownload(id: string, url: string): Promise<DownloadResult> {
  let data = ''
  let downloadUrl = url
  try {
    const resp = await axios.get(downloadUrl)
    data = resp.data
  } catch {
    if (Date.now() - lastWaybackTimestamp < waybackTimeout) {
      await new Promise(resolve => setTimeout(resolve, waybackTimeout))
    }
    lastWaybackTimestamp = Date.now()
    const urlWithoutProtocol = url.replace(/http?:\/\//, '').replace(/\?.*/, '')
    const waybackResp = await axios.get(
      `https://archive.org/wayback/available?url=${urlWithoutProtocol}`
    )
    if (
      waybackResp.data?.archived_snapshots?.closest &&
      waybackResp.data.archived_snapshots.closest.status === '200'
    ) {
      downloadUrl = waybackResp.data.archived_snapshots.closest.url
      console.log(chalk.yellow(`   - Found on WaybackMachine: ${downloadUrl}`))
      const resp = await axios.get(downloadUrl)
      data = resp.data
    }
  } finally {
    if (!data) {
      logProcessingError('download', id, url)
    }
  }
  return {data, downloadUrl}
}

type ArticlesConfig = {
  startPocketKey: string
}

const articleConfig = new Config<ArticlesConfig>(
  path.join(/*process.cwd(),*/ env.DATA_DIR, 'articles.json'),
  {startPocketKey: ''}
)

export class Articles {
  startPocketKey = articleConfig.get('startPocketKey') ?? ''
  nhm = new NodeHtmlMarkdown({})

  setStartPocketKey(key: string) {
    this.startPocketKey = key
    articleConfig.set('startPocketKey', key)
  }

  async downloadUrl(pocketId: string, url: string) {
    console.log(chalk.blue(`Downloading ${url}`))
    const resolvedUrl = url
    try {
      const {data, downloadUrl} = await tryDownload(pocketId, resolvedUrl)
      if (!data) throw new Error(`${resolvedUrl} returned no data`)
      const content = unfluff(data)
      const stats = _.omit(summarize(data), ['text', 'title', 'ok', 'image'])
      const summary = await extractSummary(content.title, content.text)
      const article: ArticleEntity = {
        ok: true,
        _id: pocketId,
        ...content,
        ...stats,
        pocketId: pocketId,
        raw: data,
        summary,
        downloadedAt: Date.now(),
        canonicalLink: content.canonicalLink ?? resolvedUrl,
      }
      await Promise.all([
        generateMarkdown(article),
        generatePDF(
          path.join(env.DATA_DIR, 'articles'),
          article.pocketId,
          downloadUrl
        ),
      ])
      await db.articles.upsert(pocketId, doc => {
        return {...doc, ...article}
      })
      console.log(chalk.green(`++ Saved ${pocketId} - ${resolvedUrl}`))
    } catch (error: unknown | AxiosError) {
      console.error(
        chalk.red(`-- Skipping ${resolvedUrl} due to error ${error}`)
      )
      const article: Extract<ArticleEntity, {ok: false}> = {
        ok: false,
        _id: pocketId,
        pocketId: pocketId,
        downloadedAt: Date.now(),
        error: '',
        status: 0,
      }
      if (axios.isAxiosError(error)) {
        article.error = error.message
        article.status = error.response?.status ?? 0
      } else {
        article.error = `${error}`
      }
      await db.articles.upsert(pocketId, doc => {
        return {...doc, ...article}
      })
    }
    // this.setStartPocketKey(id)
  }

  async downloadById(id: string) {
    const result = await db.bookmarks.get(id)
    if (result.resolved_url) {
      await this.downloadUrl(result._id, result.resolved_url)
    }
  }

  async downloadNext(count = 10) {
    const result = await db.getBookmarks({
      startkey: this.startPocketKey,
      limit: count,
      skip: this.startPocketKey ? 1 : 0,
    })
    if (result.length === 0) return []
    for (const r of result) {
      if (r.doc?.resolved_url) {
        await this.downloadUrl(r.id, r.doc.resolved_url)
        this.setStartPocketKey(r.id)
      }
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
    console.log(chalk.bgGreen(`Downloaded ${total} articles`))
  }
}

export const articles = new Articles()
