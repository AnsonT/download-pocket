/* eslint-disable no-process-exit */
import {loadEnv} from './env.js'
import {pocket} from './pocket.js'
import process from 'process'
import {articles} from './articles.js'
import {Command} from 'commander'
import pkg from '../package.json' assert {type: 'json'}

async function downloadById(id: string) {
  console.log(`Downloading ${id}`)
  await articles.downloadById(id)
  process.exit(0)
}

async function downloadAll() {
  try {
    await pocket.authorize()
    await pocket.saveAll()
    await articles.downloadAll()
    process.exit(0)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

async function main() {
  loadEnv()
  const program = new Command()

  program.version(pkg.version).description(pkg.description)
  program
    .command('download')
    .argument('id', 'bookmark id')
    .description('download a single bookmark by id')
    .action(downloadById)
  program
    .command('redownload')
    .description('redownload all bookmarks')
    .action(() => articles.downloadAll())

  program
    .command('all', {isDefault: true})
    .description('download all bookmarks')
    .action(downloadAll)

  program.parse(process.argv)
}
main()
