/* eslint-disable no-process-exit */
import {env, loadEnv} from './env.js'
import yargs from 'yargs'
import {hideBin} from 'yargs/helpers'
import {pocket} from './pocket.js'
import process from 'process'
import {db} from './db.js'
import {articles} from './articles.js'

async function main() {
  loadEnv()

  const argv = yargs(hideBin(process.argv)).parseSync()
  const args = argv._
  console.log(args)
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
main()
