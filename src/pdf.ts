import path from 'node:path'
import {writeFile} from 'fs/promises'
import puppeteer from 'puppeteer'
import {PuppeteerBlocker} from '@cliqz/adblocker-puppeteer'
import fetch from 'cross-fetch'
import chalk from 'chalk'
import {appendFileSync, writeFileSync} from 'node:fs'
import {logProcessingError} from './utils/logError.js'

let blocker: PuppeteerBlocker

export async function generatePDF(dir: string, id: string, url: string) {
  if (!blocker) {
    blocker = await PuppeteerBlocker.fromLists(fetch, [
      'https://secure.fanboy.co.nz/fanboy-cookiemonster.txt',
    ])
  }
  const browser = await puppeteer.launch({headless: 'new'})
  let state = 'download'
  try {
    const page = await browser.newPage()
    await blocker.enableBlockingInPage(page)
    await page.goto(url, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
      timeout: 90000,
    })
    await page.emulateMediaType('screen')
    state = 'png'
    await page.screenshot({
      path: path.join(dir, `${id}.png`),
      fullPage: true,
    })
    console.log(chalk.green(`   - ${path.join(dir, `${id}.png`)}`))
    state = 'pdf'
    await page.pdf({
      path: path.join(dir, `${id}.pdf`),
      margin: {top: '100px', right: '50px', bottom: '100px', left: '50px'},
      printBackground: true,
      format: 'A4',
    })
    console.log(chalk.green(`   - ${path.join(dir, `${id}.pdf`)}`))

    // Close the browser instance
  } catch (e) {
    console.error(chalk.red(`  PDF: Error generating PDF for ${url}: ${e}`))
    logProcessingError(state, id, url)
  } finally {
    await browser.close()
  }
}
