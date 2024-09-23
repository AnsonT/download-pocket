import _ from 'lodash'
import {ArticleEntity} from './db.js'
import {NodeHtmlMarkdown} from 'node-html-markdown'
import YAML from 'yamljs'
import {mkdir, writeFile, access, constants} from 'fs/promises'
import fs, {appendFileSync} from 'fs'
import path from 'path'
import axios from 'axios'
import {urlToFilename} from './utils/urlToFilename.js'
import chalk from 'chalk'
import {logProcessingError} from './utils/logError.js'
import {env} from './env.js'

const nhm = new NodeHtmlMarkdown({})

function isEmpty(v: unknown): boolean {
  return (
    v === null ||
    v === undefined ||
    v === '' ||
    (Array.isArray(v) && v.length === 0)
  )
}

async function downloadImage(url: string, dir: string, filename: string) {
  const imagePath = path.join(dir, filename)
  try {
    await access(dir, constants.F_OK)
  } catch {
    await mkdir(dir, {recursive: true})
  }
  // console.log(`  Downloading ${url}`)
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  })

  const writer = fs.createWriteStream(imagePath)

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

export async function replaceMarkdownImages(
  url: string,
  dir: string,
  id: string,
  md: string
): Promise<string> {
  const imgRegex = /!\[[^\]]*\]\(((([^)]*\.(png|jpg|gif))(\?[^)\s]*)?)[^)]*)\)/g
  const imgs = md.matchAll(imgRegex)
  let first = true
  const replacements = []
  for (const img of imgs) {
    const imgPath = img[1]
    const downloadPath = img[2]
    const imgName = img[3]
    // const imgExt = img[4]

    if (!imgPath) continue

    if (first) {
      first = false
      await mkdir(path.join(dir, id), {recursive: true})
    }
    const filename = urlToFilename(imgName)
    try {
      const imgUrl = new URL(downloadPath, url)
      // console.log(chalk.bgBlue(`  Image: Downloading ${imgPath} ${imgUrl}`))
      await downloadImage(imgUrl.toString(), path.join(dir, id), filename)
      replacements.push({imgPath, filename})
    } catch (e) {
      console.error(chalk.red(`  Image: Error downloading ${imgPath}`))
    }
  }
  for (const r of replacements) {
    md = md.replace(r.imgPath, path.join(id, r.filename))
  }
  return md
}

export async function generateMarkdown(article: ArticleEntity) {
  if (article.ok === false) return
  try {
    const frontmatter = _.omit(_.omitBy(article, isEmpty), [
      'ok',
      '_id',
      'raw',
      'text',
      'links',
    ])
    const dataDir = env.DATA_DIR
    const md = await replaceMarkdownImages(
      article.canonicalLink,
      path.join(dataDir, 'articles/'),
      article.pocketId,
      nhm.translate(article.raw)
    )
    const content = `${YAML.stringify(frontmatter)}\n---\n${md}`
    await writeFile(
      path.join(dataDir, 'articles', `${article.pocketId}.md`),
      content
    )
    console.log(
      chalk.green(
        `   - ${path.join(dataDir, 'articles', `${article.pocketId}.md`)}`
      )
    )
  } catch (e) {
    console.error(
      chalk.red(`  Markdown: Error generating markdown for ${article.pocketId}`)
    )
    logProcessingError('md', article.pocketId, article.canonicalLink)
  }
}
