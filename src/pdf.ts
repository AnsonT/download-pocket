import path from 'node:path'
import { writeFile } from 'fs/promises'
import puppeteer from 'puppeteer'
import { PuppeteerBlocker } from '@cliqz/adblocker-puppeteer'
import fetch from 'cross-fetch'
import chalk from 'chalk'

let blocker: PuppeteerBlocker

export async function generatePDF(dir: string, id: string, url: string) {
  if (!blocker) {
    blocker = await PuppeteerBlocker.fromLists(fetch, [
      'https://secure.fanboy.co.nz/fanboy-cookiemonster.txt'
    ])
  }
  const browser = await puppeteer.launch({ headless: 'new'})
  try {
    const page = await browser.newPage()
    await blocker.enableBlockingInPage(page);
    await page.goto(url, { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] })
    await page.emulateMediaType('screen')
    const pdf = await page.pdf({
      path: 'result.pdf',
      margin: { top: '100px', right: '50px', bottom: '100px', left: '50px' },
      printBackground: true,
      format: 'A4',
    });
    await writeFile(path.join(dir, `${id}.pdf`), pdf)
    console.log(chalk.green(`   - ${path.join(dir, `${id}.pdf`)}`))

    // Close the browser instance
  } catch (e) {
    console.error(chalk.red(`  PDF: Error generating PDF for ${url}: ${e}`))
  } finally {
    await browser.close();
  }
}
