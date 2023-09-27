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

async function extractSummary(title: string, content: string): Promise<string> {
  return new Promise<string>((resolve, reject) =>
    summary.summarize(title, content, (err: unknown, summary: string) => {
      if (err) reject(err)
      else resolve(summary)
    })
  )
}

type ArticlesConfig = {
  startPocketKey: string
}

const articleConfig = new Config<ArticlesConfig>(
  path.join(process.cwd(), '_data/articles.json'),
  {startPocketKey: ''}
)

export class Articles {
  startPocketKey = articleConfig.get('startPocketKey') ?? ''
  nhm = new NodeHtmlMarkdown({})

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
    for (const r of result) {
      if (r.doc?.resolved_url) {
        console.log(chalk.blue(`Downloading ${r.doc?.resolved_url}`))
        try {
          const {data} = await axios.get(r.doc?.resolved_url)
          const content = unfluff(data)
          const stats = _.omit(summarize(data), [
            'text',
            'title',
            'ok',
            'image',
          ])
          const summary = await extractSummary(content.title, content.text)
          const article: ArticleEntity = {
            ok: true,
            _id: r.id,
            ...content,
            ...stats,
            pocketId: r.id,
            raw: data,
            summary,
            downloadedAt: Date.now(),
            canonicalLink: content.canonicalLink ?? r.doc.resolved_url,
          }
          Promise.all([
            generateMarkdown(article),
            generatePDF('_data/articles', article.pocketId, r.doc.resolved_url),
          ])
          await db.articles.put(article)
          console.log(chalk.green(`++ Saved ${r.id} - ${r.doc?.resolved_url}`))
        } catch (error: unknown | AxiosError) {
          console.error(
            chalk.red(
              `-- Skipping ${r.doc?.resolved_url} due to error ${error}`
            )
          )
          const article: Extract<ArticleEntity, {ok: false}> = {
            ok: false,
            _id: r.id,
            pocketId: r.id,
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
          await db.articles.put(article)
        }
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
