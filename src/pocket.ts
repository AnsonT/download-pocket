import path from 'path'
import {Config} from './config.js'
import axios from 'axios'
import portfinder from 'portfinder'
import {env} from './env.js'
import express from 'express'
import {PocketGetResponse} from './types.js'
import {db} from './db.js'

type PocketConfig = {
  authorization: {
    access_token: string
    username: string
  }
  since: number
  offset: number
}

const pocketConfig = new Config<PocketConfig>(
  path.join(/*process.cwd(), */ env.DATA_DIR, 'pocket.json'),
  {since: 0}
)

class Pocket {
  authorization = {access_token: '', username: ''}

  async authorize() {
    this.authorization = pocketConfig.get('authorization') ?? {
      access_token: '',
      username: '',
    }
    if (this.authorization.access_token) return
    const port = await portfinder.getPortPromise()
    console.log('Authorization using port:', port)
    const {
      data: {code},
    } = await axios.post(
      'https://getpocket.com/v3/oauth/request',
      {
        consumer_key: env.POCKET_CONSUMER_KEY,
        redirect_uri: `http://localhost:${port}`,
      },
      {
        headers: {
          'X-Accept': 'application/json',
        },
      }
    )

    return await new Promise((resolve, reject) => {
      const app = express()
      app.use(express.json())
      app.use('/', (req, res) => {
        void axios
          .post(
            'https://getpocket.com/v3/oauth/authorize',
            {
              consumer_key: env.POCKET_CONSUMER_KEY,
              code,
            },
            {
              headers: {
                'X-Accept': 'application/json',
              },
            }
          )
          .then(authResponse => {
            this.authorization = authResponse.data
            pocketConfig.set('authorization', this.authorization)
            res.send('You can close this window now.')
            server.close()
            resolve(this.authorization)
          })
          .catch(error => {
            // pocketConfig.set('authorization', {access_token: '', username: ''})
            reject(error)
          })
      })
      const server = app.listen(port, () => {
        import('open').then(module => {
          void module.default(
            `https://getpocket.com/auth/authorize?request_token=${code}&redirect_uri=http://localhost:${port}`
          )
        })
      })
    })
  }
  async get(offset = 0, count = 10, since = 0) {
    const {data} = await axios.post<PocketGetResponse>(
      'https://getpocket.com/v3/get',
      {
        consumer_key: env.POCKET_CONSUMER_KEY,
        access_token: this.authorization.access_token,
        detailType: 'complete',
        sort: 'oldest',
        since: `${since}`,
        offset: `${offset}`,
        count: `${count}`,
      }
    )
    return data
  }

  private async getNext(count = 10) {
    const offset = pocketConfig.get('offset') ?? 0
    const since = pocketConfig.get('since') ?? 0
    const result = await this.get(offset, count, since)
    const total = offset + Object.keys(result.list).length
    pocketConfig.set('offset', total)
    console.log(`Saved ${total} bookmarks`)
    await db.saveBookmarks(result)
    return result
  }
  async saveAll() {
    let since = pocketConfig.get('since') ?? 0
    let count = 1
    while (count) {
      const resp = await this.getNext(100)
      since = resp.since
      count = Object.keys(resp.list).length
    }
    pocketConfig.set('since', since)
    pocketConfig.set('offset', 0)
  }
}

export const pocket = new Pocket()
